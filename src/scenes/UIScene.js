import { INITIAL_LIVES, DASH_COOLDOWN_MS, GAME_WIDTH } from '../config/constants.js';
import { TIMER_WARNING_SECONDS } from '../systems/AudioManager.js';
import { ensureFragmentTexture, FRAGMENT_TEXTURE } from '../systems/Fragments.js';

// ── HUD del nivel (mejora F2 · hallazgos H07, H22, H10) ──
// UIScene corre en paralelo a la escena del nivel y con su propia cámara SIN
// zoom, así que aquí se trabaja siempre en píxeles de pantalla: nada de
// compensar 1/zoom como hacen los overlays que viven dentro del nivel.
//
// Reparto de la pantalla (1280×480):
//   arriba-izquierda → vidas (corazones dibujados), score y carga del dash
//   arriba-centro    → HORA CERO, la cuenta atrás de la bomba
//   arriba-derecha   → FRAGMENTOS X / N, el objetivo real del nivel
//
// Todo lo que antes dependía de emojis (❤️ 🖤 ⏳) es ahora textura generada o
// geometría: el HUD se ve igual en cualquier navegador, tenga o no fuente de
// emoji instalada.

// ── Paleta ──
const PANEL_FILL    = 0x05060f;
const PANEL_ALPHA   = 0.78;
const PANEL_STROKE  = 0x00ffff;

const COLOR_ACCENT  = '#00ffff'; // cian: objetivo / sistemas
const COLOR_LABEL   = '#8899aa'; // etiquetas secundarias
const COLOR_SCORE   = '#ffff00';
const COLOR_TIMER   = '#ff9f43'; // ámbar: el reloj corre, pero hay margen
const COLOR_DANGER  = '#ff3b3b'; // por debajo del umbral de alarma
const COLOR_DONE    = '#66ffaa'; // código completo

const DASH_READY_FILL   = 0x66ccff;
const DASH_CHARGE_FILL  = 0x2f4658;
const PIP_FULL_FILL     = 0x00ffff;
const PIP_EMPTY_FILL    = 0x1b2b34;

const HEART_FULL_KEY  = 'ui-heart-full';
const HEART_EMPTY_KEY = 'ui-heart-empty';

// Permanencia del banner de objetivo antes de disolverse. Va por encima de los
// 4 s del overlay de controles: cuando ese desaparece, el objetivo sigue en
// pantalla un momento más y se lee sin competencia.
const OBJECTIVE_BANNER_MS = 5500;

// ── Corazón pixel-art generado por código (H22) ──
// Se dibuja como una matriz de píxeles y no con curvas para que encaje con el
// resto del arte del juego (pixelArt: true en main.js escala sin difuminar).
const HEART_ART = [
    '.XX..XX.',
    'XXXXXXXX',
    'XXXXXXXX',
    'XXXXXXXX',
    '.XXXXXX.',
    '..XXXX..',
    '...XX...'
];
const HEART_PIXEL = 3;
const HEART_W     = HEART_ART[0].length * HEART_PIXEL; // 24
const HEART_H     = HEART_ART.length    * HEART_PIXEL; // 21
const HEART_GAP   = 6;

function makeHeartTexture(scene, key, bodyColor, shineColor) {
    if (scene.textures.exists(key)) return;

    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    for (let y = 0; y < HEART_ART.length; y++) {
        for (let x = 0; x < HEART_ART[y].length; x++) {
            if (HEART_ART[y][x] !== 'X') continue;
            // Brillo en el lóbulo izquierdo: da volumen y distingue de un
            // bloque plano de color a simple vista.
            const isShine = (y === 1 && (x === 1 || x === 2)) || (y === 2 && x === 1);
            g.fillStyle(isShine ? shineColor : bodyColor, 1);
            g.fillRect(x * HEART_PIXEL, y * HEART_PIXEL, HEART_PIXEL, HEART_PIXEL);
        }
    }
    g.generateTexture(key, HEART_W, HEART_H);
    g.destroy();
}

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        makeHeartTexture(this, HEART_FULL_KEY,  0xff3b5c, 0xffa8ba);
        makeHeartTexture(this, HEART_EMPTY_KEY, 0x3a2230, 0x4d2e3d);
        // El chip del HUD es el MISMO que se recoge en el nivel: el icono del
        // contador y el objeto del suelo tienen que leerse como la misma cosa.
        // La función es idempotente y el TextureManager es global al juego, así
        // que da igual quién la haya llamado antes.
        ensureFragmentTexture(this);

        this.fragmentsTotal     = 0;
        this.fragmentsCollected = 0;
        this.timerAlarmTween    = null;
        this.dashTween          = null;
        this.objectiveBanner    = null;
        this.fragmentPips       = [];

        this.buildStatusPanel();
        this.buildTimer();
        this.buildFragments();

        this.updateLives(INITIAL_LIVES);
        this.registerRegistryEvents();
    }

    // ── Construcción del HUD ─────────────────────────────────────────────

    // Bloque izquierdo: vidas, score y estado del dash.
    buildStatusPanel() {
        const panel = this.add.rectangle(12, 10, 216, 112, PANEL_FILL, PANEL_ALPHA).setOrigin(0, 0);
        panel.setStrokeStyle(1, PANEL_STROKE, 0.35);

        this.hearts = [];
        for (let i = 0; i < INITIAL_LIVES; i++) {
            const heart = this.add.image(26 + i * (HEART_W + HEART_GAP), 24, HEART_FULL_KEY);
            heart.setOrigin(0, 0);
            this.hearts.push(heart);
        }

        this.scoreText = this.add.text(26, 56, 'SCORE  0', {
            fontFamily: 'monospace',
            fontSize:   '20px',
            fontStyle:  'bold',
            color:      COLOR_SCORE
        }).setOrigin(0, 0);

        this.dashLabel = this.add.text(26, 88, 'DASH', {
            fontFamily: 'monospace',
            fontSize:   '13px',
            fontStyle:  'bold',
            color:      COLOR_ACCENT
        }).setOrigin(0, 0);

        // Barra de recarga en vez del emoji ⏳: el ancho se rellena durante
        // DASH_COOLDOWN_MS, así el jugador ve CUÁNTO falta y no solo que no
        // está listo. Origen a la izquierda para que crezca hacia la derecha.
        this.add.rectangle(74, 95, 140, 12, 0x0d1620, 1).setOrigin(0, 0.5)
            .setStrokeStyle(1, PANEL_STROKE, 0.3);
        this.dashBar = this.add.rectangle(76, 95, 136, 8, DASH_READY_FILL, 1).setOrigin(0, 0.5);
    }

    // Bloque central: la cuenta atrás de la bomba. Es el dato más grande del
    // HUD a propósito — es lo que puede terminar la partida sin previo aviso.
    buildTimer() {
        this.timerBox = this.add.container(GAME_WIDTH / 2, 10);

        const panel = this.add.rectangle(0, 0, 260, 88, PANEL_FILL, PANEL_ALPHA).setOrigin(0.5, 0);
        panel.setStrokeStyle(2, PANEL_STROKE, 0.55);

        this.timerLabel = this.add.text(0, 10, 'H O R A   C E R O', {
            fontFamily: 'monospace',
            fontSize:   '14px',
            fontStyle:  'bold',
            color:      COLOR_LABEL
        }).setOrigin(0.5, 0);

        this.timerValue = this.add.text(0, 30, '--:--', {
            fontFamily: 'monospace',
            fontSize:   '40px',
            fontStyle:  'bold',
            color:      COLOR_TIMER
        }).setOrigin(0.5, 0);

        this.timerBox.add([panel, this.timerLabel, this.timerValue]);
        // Oculto hasta el primer 'time-changed': si alguna escena futura no
        // tuviera reloj, el HUD no muestra un panel muerto.
        this.timerBox.setVisible(false);
    }

    // Bloque derecho: el objetivo del nivel (H07). Antes no se comunicaba en
    // ninguna parte —se ganaba con score>=300 sin decirlo—, y ahora ganar es
    // exactamente lo que muestra este contador.
    buildFragments() {
        this.fragmentsBox = this.add.container(GAME_WIDTH - 12, 10);

        const panel = this.add.rectangle(0, 0, 268, 84, PANEL_FILL, PANEL_ALPHA).setOrigin(1, 0);
        panel.setStrokeStyle(2, PANEL_STROKE, 0.55);

        this.fragmentIcon = this.add.image(-244, 34, FRAGMENT_TEXTURE).setOrigin(0, 0.5);

        // Jerarquía a propósito: "FRAGMENTOS" es la etiqueta pequeña y el X / N
        // va grande. Lo que el jugador consulta de un vistazo es cuánto le
        // falta, no la palabra.
        this.fragmentsLabel = this.add.text(-208, 10, 'FRAGMENTOS DE CÓDIGO', {
            fontFamily: 'monospace',
            fontSize:   '12px',
            fontStyle:  'bold',
            color:      COLOR_LABEL
        }).setOrigin(0, 0);

        this.fragmentsValue = this.add.text(-208, 26, '0 / 0', {
            fontFamily: 'monospace',
            fontSize:   '30px',
            fontStyle:  'bold',
            color:      COLOR_ACCENT
        }).setOrigin(0, 0);

        this.fragmentsBox.add([panel, this.fragmentIcon, this.fragmentsLabel, this.fragmentsValue]);

        // Latido suave del chip: enlaza visualmente el icono con los fragmentos
        // que flotan y pulsan en el nivel.
        this.tweens.add({
            targets:  this.fragmentIcon,
            alpha:    0.6,
            duration: 900,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });
    }

    // Una marca por fragmento del nivel. Se reconstruyen cuando llega el total
    // real, que lo decide spawnFragments() según los huecos alcanzables del
    // mapa y no siempre coincide con FRAGMENTS_PER_LEVEL.
    buildFragmentPips(total) {
        this.fragmentPips.forEach((pip) => pip.destroy());
        this.fragmentPips = [];
        if (!total) return;

        const PIP_W = 16;
        const PIP_GAP = 5;
        for (let i = 0; i < total; i++) {
            const pip = this.add.rectangle(-208 + i * (PIP_W + PIP_GAP), 70, PIP_W, 6, PIP_EMPTY_FILL, 1)
                .setOrigin(0, 0.5);
            this.fragmentsBox.add(pip);
            this.fragmentPips.push(pip);
        }
    }

    // ── Señales del registry ─────────────────────────────────────────────

    registerRegistryEvents() {
        const reg = this.registry.events;

        this.scoreHandler = (score) => {
            this.scoreText.setText('SCORE  ' + score);
        };

        this.livesHandler = (lives) => {
            this.updateLives(lives);
        };

        this.dashReadyHandler = (ready) => {
            this.updateDash(ready);
        };

        this.timeHandler = (time) => {
            this.updateTimer(time);
        };

        // Señal nueva (F2): la emiten las escenas al montar el nivel y en cada
        // recogida, con { collected, total }.
        this.fragmentsHandler = (progress) => {
            this.updateFragments(progress);
        };

        reg.on('score-changed',     this.scoreHandler);
        reg.on('lives-changed',     this.livesHandler);
        reg.on('dash-ready',        this.dashReadyHandler);
        reg.on('time-changed',      this.timeHandler);
        reg.on('fragments-changed', this.fragmentsHandler);

        this.events.once('shutdown', () => {
            reg.off('score-changed',     this.scoreHandler);
            reg.off('lives-changed',     this.livesHandler);
            reg.off('dash-ready',        this.dashReadyHandler);
            reg.off('time-changed',      this.timeHandler);
            reg.off('fragments-changed', this.fragmentsHandler);
        });
    }

    // ── Actualizaciones ──────────────────────────────────────────────────

    updateLives(lives) {
        const alive = Math.max(0, lives);
        this.hearts.forEach((heart, i) => {
            heart.setTexture(i < alive ? HEART_FULL_KEY : HEART_EMPTY_KEY);
        });
    }

    updateDash(ready) {
        // Un dash nuevo puede empezar antes de que termine el tween anterior
        // (respawn, reinicio de estado): matarlo evita dos tweens peleando por
        // el mismo scaleX.
        if (this.dashTween) {
            this.dashTween.stop();
            this.dashTween = null;
        }

        if (ready) {
            this.dashBar.scaleX = 1;
            this.dashBar.setFillStyle(DASH_READY_FILL, 1);
            this.dashLabel.setColor(COLOR_ACCENT);
            return;
        }

        this.dashBar.scaleX = 0;
        this.dashBar.setFillStyle(DASH_CHARGE_FILL, 1);
        this.dashLabel.setColor(COLOR_LABEL);
        this.dashTween = this.tweens.add({
            targets:  this.dashBar,
            scaleX:   1,
            duration: DASH_COOLDOWN_MS,
            ease:     'Linear'
        });
    }

    updateTimer(seconds) {
        this.timerBox.setVisible(true);
        this.timerValue.setText(this.formatTime(seconds));

        if (seconds <= TIMER_WARNING_SECONDS) {
            this.startTimerAlarm();
        } else {
            this.stopTimerAlarm();
        }
    }

    formatTime(seconds) {
        const total = Math.max(0, seconds);
        const mins  = Math.floor(total / 60);
        const secs  = total % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    // Alarma visual del último tramo (H22): rojo + parpadeo del panel entero.
    // Acompaña al sfx-timer-warning que ya disparan las escenas al cruzar el
    // umbral; aquí no se toca audio.
    startTimerAlarm() {
        if (this.timerAlarmTween) return;

        this.timerValue.setColor(COLOR_DANGER);
        this.timerLabel.setColor(COLOR_DANGER);
        this.timerAlarmTween = this.tweens.add({
            targets:  this.timerBox,
            alpha:    0.35,
            duration: 320,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });
    }

    // Se llama en cada tick por encima del umbral: sin esto, un nivel nuevo
    // (Nivel 1 → Nivel 2) heredaría el panel rojo y parpadeando del anterior.
    stopTimerAlarm() {
        if (!this.timerAlarmTween) return;

        this.timerAlarmTween.stop();
        this.timerAlarmTween = null;
        this.timerBox.setAlpha(1);
        this.timerValue.setColor(COLOR_TIMER);
        this.timerLabel.setColor(COLOR_LABEL);
    }

    updateFragments({ collected, total }) {
        if (total !== this.fragmentsTotal) {
            this.fragmentsTotal = total;
            this.buildFragmentPips(total);
            // Primer aviso del nivel: hasta ahora el objetivo (score >= 300)
            // no se decía en ninguna parte. Va abajo para no pisar el overlay
            // de controles, que ocupa el centro los primeros segundos.
            if (total > 0) this.showObjectiveBanner(total);
        }

        const isNewPickup = collected > this.fragmentsCollected;
        this.fragmentsCollected = collected;

        this.fragmentsValue.setText(`${collected} / ${total}`);
        this.fragmentPips.forEach((pip, i) => {
            pip.setFillStyle(i < collected ? PIP_FULL_FILL : PIP_EMPTY_FILL, 1);
        });

        if (total > 0 && collected >= total) {
            this.highlightFragmentsComplete();
        } else if (isNewPickup) {
            this.popFragments(1.08);
        }
    }

    // Banner de objetivo (H07): una sola vez por nivel, se disuelve solo.
    showObjectiveBanner(total) {
        if (this.objectiveBanner) this.objectiveBanner.destroy();

        const banner = this.add.container(GAME_WIDTH / 2, 442);
        const text = this.add.text(0, 0, `OBJETIVO: reúne los ${total} fragmentos del código antes de la HORA CERO`, {
            fontFamily: 'monospace',
            fontSize:   '16px',
            fontStyle:  'bold',
            color:      COLOR_ACCENT
        }).setOrigin(0.5);

        const panel = this.add.rectangle(0, 0, text.width + 40, 34, PANEL_FILL, PANEL_ALPHA).setOrigin(0.5);
        panel.setStrokeStyle(2, PANEL_STROKE, 0.55);

        banner.add([panel, text]);
        this.objectiveBanner = banner;

        this.tweens.add({
            targets:  banner,
            alpha:    0,
            delay:    OBJECTIVE_BANNER_MS,
            duration: 600,
            onComplete: () => {
                banner.destroy();
                if (this.objectiveBanner === banner) this.objectiveBanner = null;
            }
        });
    }

    // Golpe de escala del bloque de fragmentos. El contenedor está anclado por
    // su esquina derecha, así que crece hacia dentro de la pantalla y nunca se
    // sale del borde.
    popFragments(scale) {
        this.tweens.killTweensOf(this.fragmentsBox);
        this.fragmentsBox.setScale(1);
        this.tweens.add({
            targets:  this.fragmentsBox,
            scaleX:   scale,
            scaleY:   scale,
            duration: 110,
            yoyo:     true,
            ease:     'Quad.easeOut'
        });
    }

    highlightFragmentsComplete() {
        this.fragmentsLabel.setText('CÓDIGO COMPLETO');
        this.fragmentsLabel.setColor(COLOR_DONE);
        this.fragmentsValue.setColor(COLOR_DONE);
        this.fragmentPips.forEach((pip) => pip.setFillStyle(0x66ffaa, 1));
        this.popFragments(1.18);
    }
}
