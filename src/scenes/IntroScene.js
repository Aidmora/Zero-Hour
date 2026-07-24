import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import Audio from '../systems/AudioManager.js';

// ── Cutscene de apertura (mejora A3 · hallazgo H08) ──
// Se intercala entre BootScene y MenuScene para que el jugador conozca la
// premisa (la bomba, los fragmentos del código, los dos héroes) antes de
// tocar el menú. Siempre se puede saltar: nadie quiere verla en cada partida.

const SLIDE_MS = 5000; // permanencia de cada lámina antes de avanzar sola
const FADE_MS  = 400;  // fundido de entrada/salida entre láminas

const CYAN    = '#00ffff';
const MAGENTA = '#ff00aa';
const TEXT    = '#dfe7f5';

const SLIDES = [
    {
        title: 'HORA CERO',
        lines: [
            'Bajo la ciudad late una bomba programada.',
            'Nadie sabe quién la puso. Todos ven su contador.',
            'Cuando llegue a cero, no quedará ciudad que salvar.'
        ]
    },
    {
        title: 'EL CÓDIGO ROTO',
        lines: [
            'El código de desactivación fue partido en fragmentos',
            'y escondido en dos zonas hostiles de la ciudad:',
            'el Almacén Industrial y la Fortaleza Industrial.'
        ]
    },
    {
        title: 'DOS HÉROES',
        lines: [
            'MONJE CHI — túnica roja, maestro de las artes marciales.',
            'Velocidad, precisión y la máxima agilidad en el aire.',
            '',
            'THOR — capa carmesí, guerrero divino de la espada.',
            'Poder puro, dominio del tiempo y del entorno.'
        ]
    },
    {
        title: 'ANTES DE LA HORA CERO',
        lines: [
            'Recupera cada fragmento. Ábrete paso a golpes.',
            'El contador no se detiene por nadie.',
            '',
            'La ciudad tiene hasta la Hora Cero. Ni un segundo más.'
        ]
    }
];

export default class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#05060f');
        this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);

        // La intro comparte pista con el menú: al terminar arrancamos MenuScene
        // sin fundir el audio, así la música sigue sonando sin corte (H19).
        Audio.attach(this);
        Audio.playMusic('bgm');

        this.slideIndex    = 0;
        this.currentSlide  = null;
        this.autoTimer     = null;
        this.isLeaving     = false;
        this.isFadingSlide = false;

        this.buildBackdrop();
        this.buildCountdown();
        this.buildSkipButton();
        this.buildProgressDots();
        this.buildHint();
        this.bindInput();

        this.events.once('shutdown', () => this.cleanup());

        this.showSlide(0);
    }

    // ── Escenografía fija ────────────────────────────────────────────────

    // Fondo del juego oscurecido: mantiene la paleta cyberpunk sin pedir un
    // asset nuevo. Si la textura no estuviera cargada, el color de cámara ya
    // deja un fondo válido y la escena sigue funcionando.
    buildBackdrop() {
        if (this.textures.exists('bg-real')) {
            this.add.image(0, 0, 'bg-real')
                .setOrigin(0, 0)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setTint(0x4455aa);
        }

        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05060f, 0.78).setOrigin(0, 0);

        // Rejilla de líneas de barrido: textura cero, mucho ambiente.
        const scanlines = this.add.graphics();
        scanlines.fillStyle(0x000000, 0.22);
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            scanlines.fillRect(0, y, GAME_WIDTH, 2);
        }

        this.add.rectangle(0, 0, GAME_WIDTH, 3, 0x00ffff, 0.55).setOrigin(0, 0);
        this.add.rectangle(0, GAME_HEIGHT - 3, GAME_WIDTH, 3, 0xff00aa, 0.55).setOrigin(0, 0);
    }

    // Contador visible que refuerza la cuenta atrás: marca lo que le queda a
    // la propia intro, así que llega a 00:00 justo cuando el jugador entra al
    // menú. Se recalcula en cada lámina para no desincronizarse si se avanza
    // a mano.
    buildCountdown() {
        this.add.text(40, 34, 'DETONACIÓN EN', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: MAGENTA
        }).setOrigin(0, 0.5);

        this.countdownText = this.add.text(40, 62, '00:00', {
            fontFamily: 'monospace',
            fontSize: '34px',
            fontStyle: 'bold',
            color: CYAN
        }).setOrigin(0, 0.5);

        this.tweens.add({
            targets:  this.countdownText,
            alpha:    0.35,
            duration: 700,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });

        this.remainingMs = SLIDES.length * SLIDE_MS;
        this.renderCountdown();

        this.countdownTimer = this.time.addEvent({
            delay:    100,
            loop:     true,
            callback: () => {
                this.remainingMs = Math.max(0, this.remainingMs - 100);
                this.renderCountdown();
            }
        });
    }

    renderCountdown() {
        const totalSeconds = Math.ceil(this.remainingMs / 1000);
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const ss = String(totalSeconds % 60).padStart(2, '0');
        this.countdownText.setText(`${mm}:${ss}`);
        this.countdownText.setColor(totalSeconds <= 10 ? MAGENTA : CYAN);
    }

    // Obligatorio y siempre visible: la intro no puede ser un peaje.
    buildSkipButton() {
        this.skipButton = this.add.text(GAME_WIDTH - 40, 48, 'Saltar  ▸', {
            fontFamily:      'monospace',
            fontSize:        '22px',
            color:           '#ffff00',
            backgroundColor: '#00000099',
            padding:         { x: 16, y: 8 }
        }).setOrigin(1, 0.5);

        this.skipButton.setInteractive({ useHandCursor: true });
        this.skipButton.on('pointerover', () => {
            this.skipButton.setStyle({ color: '#ffffff' });
            Audio.play('sfx-ui-hover');
        });
        this.skipButton.on('pointerout', () => this.skipButton.setStyle({ color: '#ffff00' }));
        this.skipButton.on('pointerdown', () => {
            Audio.play('sfx-ui-click');
            this.finish();
        });

        this.add.text(GAME_WIDTH - 40, 78, '[ESC]', {
            fontFamily: 'monospace',
            fontSize:   '13px',
            color:      '#8899aa'
        }).setOrigin(1, 0.5);
    }

    buildProgressDots() {
        this.dots = [];
        const gap   = 22;
        const baseX = GAME_WIDTH / 2 - ((SLIDES.length - 1) * gap) / 2;
        for (let i = 0; i < SLIDES.length; i++) {
            this.dots.push(this.add.circle(baseX + i * gap, GAME_HEIGHT - 46, 5, 0x00ffff, 0.25));
        }
    }

    buildHint() {
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, 'ESPACIO o click para continuar', {
            fontFamily: 'monospace',
            fontSize:   '14px',
            color:      '#8899aa'
        }).setOrigin(0.5);
    }

    bindInput() {
        this.input.keyboard.on('keydown-SPACE', () => this.advance());
        this.input.keyboard.on('keydown-ENTER', () => this.advance());
        this.input.keyboard.on('keydown-ESC',   () => this.finish());

        // currentlyOver evita que un click sobre "Saltar" cuente además como
        // avance de lámina.
        this.input.on('pointerdown', (_pointer, currentlyOver) => {
            if (currentlyOver.length > 0) return;
            this.advance();
        });
    }

    // ── Láminas ──────────────────────────────────────────────────────────

    showSlide(index) {
        if (this.isLeaving) return;

        if (index >= SLIDES.length) {
            this.finish();
            return;
        }

        this.slideIndex = index;
        this.currentSlide = this.buildSlide(SLIDES[index]);

        // El contador se reancla a lo que queda de intro para que avanzar a
        // mano no lo deje descuadrado.
        this.remainingMs = (SLIDES.length - index) * SLIDE_MS;
        this.renderCountdown();

        this.dots.forEach((dot, i) => dot.setFillStyle(0x00ffff, i <= index ? 1 : 0.25));

        this.isFadingSlide = false;
        this.tweens.add({
            targets:  this.currentSlide,
            alpha:    1,
            duration: FADE_MS,
            ease:     'Sine.easeOut'
        });

        this.autoTimer = this.time.delayedCall(SLIDE_MS, () => this.advance());
    }

    buildSlide(slide) {
        const container = this.add.container(0, 0).setAlpha(0);

        const title = this.add.text(GAME_WIDTH / 2, 150, slide.title, {
            fontFamily:      'monospace',
            fontSize:        '46px',
            fontStyle:       'bold',
            color:           CYAN,
            stroke:          '#ff00aa',
            strokeThickness: 2
        }).setOrigin(0.5);

        const rule = this.add.rectangle(GAME_WIDTH / 2, 186, 420, 2, 0xff00aa, 0.8);

        const body = this.add.text(GAME_WIDTH / 2, 280, slide.lines.join('\n'), {
            fontFamily:  'monospace',
            fontSize:    '21px',
            color:       TEXT,
            align:       'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        container.add([title, rule, body]);
        return container;
    }

    advance() {
        if (this.isLeaving || this.isFadingSlide) return;
        this.isFadingSlide = true;

        if (this.autoTimer) {
            this.autoTimer.remove();
            this.autoTimer = null;
        }

        const leaving = this.currentSlide;
        this.currentSlide = null;

        this.tweens.add({
            targets:    leaving,
            alpha:      0,
            duration:   FADE_MS,
            ease:       'Sine.easeIn',
            onComplete: () => {
                leaving.destroy();
                this.showSlide(this.slideIndex + 1);
            }
        });
    }

    // Sin fundido de audio: MenuScene reengancha la misma pista y la música
    // continúa donde estaba.
    finish() {
        if (this.isLeaving) return;
        this.isLeaving = true;

        this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }

    cleanup() {
        if (this.autoTimer) {
            this.autoTimer.remove();
            this.autoTimer = null;
        }
        if (this.countdownTimer) {
            this.countdownTimer.remove();
            this.countdownTimer = null;
        }
        this.input.keyboard.off('keydown-SPACE');
        this.input.keyboard.off('keydown-ENTER');
        this.input.keyboard.off('keydown-ESC');
        this.input.off('pointerdown');
    }
}
