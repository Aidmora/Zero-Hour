import { KEYS } from '../config/constants.js';

// ── Overlay de bienvenida del nivel (mejora A3 · hallazgo H23) ──
// Panel semitransparente con nombre del nivel, héroe, contexto narrativo y el
// esquema de teclas VIGENTE. Los objetos se crean en la escena del nivel que
// llama a showLevelIntro(), no en UIScene.
//
// Nunca captura input ni pausa el juego: solo escucha para auto-ocultarse.

const VISIBLE_MS  = 4000; // permanencia antes del auto-ocultado
const FADE_IN_MS  = 300;
const FADE_OUT_MS = 500;
// Margen antes de armar el cierre por tecla: si el jugador ya venía pulsando
// una dirección, el panel no se evapora en el primer frame.
const ARM_MS      = 700;
const DEPTH       = 1000;

const PANEL_W = 620;
const PANEL_H = 300;

// Nombres legibles de las teclas de Phaser. Cualquier clave que no esté aquí
// se muestra tal cual, así que cambiar KEYS en constants.js no rompe nada.
const KEY_LABELS = {
    SPACE: 'ESPACIO',
    SHIFT: 'SHIFT',
    CTRL:  'CTRL',
    ALT:   'ALT',
    ESC:   'ESC'
};

function label(keyCode) {
    return KEY_LABELS[keyCode] || keyCode;
}

// Se arma SIEMPRE desde KEYS: si el mapeo cambia, el overlay lo sigue solo.
function controlLines() {
    return [
        [`${label(KEYS.LEFT)} / ${label(KEYS.RIGHT)}`, 'Moverse'],
        [label(KEYS.JUMP),                             'Saltar  ·  pulsa dos veces = doble salto'],
        [label(KEYS.DASH),                             'Dash'],
        [label(KEYS.ATTACK),                           'Atacar  ·  encadena para el combo'],
        [label(KEYS.MENU),                             'Volver al menú']
    ];
}

/**
 * Muestra el overlay de inicio de nivel.
 * @param {Phaser.Scene} scene   escena del nivel (dueña de los objetos)
 * @param {object}       info    { title, hero, context }
 */
export default function showLevelIntro(scene, info) {
    const cam = scene.cameras.main;

    // Con scrollFactor 0 el objeto sigue a la cámara, pero el zoom lo escala
    // igual (Nivel 2 usa 1.5×). Anclando el contenedor en el centro exacto de
    // la cámara y escalándolo por 1/zoom, el panel se ve idéntico en ambos
    // niveles y a tamaño real de pantalla.
    const box = scene.add.container(cam.width / 2, cam.height / 2);
    box.setScrollFactor(0);
    box.setScale(1 / cam.zoom);
    box.setDepth(DEPTH);
    box.setAlpha(0);

    const panel = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x05060f, 0.82);
    panel.setStrokeStyle(2, 0x00ffff, 0.9);

    const top = -PANEL_H / 2;

    const title = scene.add.text(0, top + 34, info.title, {
        fontFamily: 'monospace',
        fontSize:   '24px',
        fontStyle:  'bold',
        color:      '#00ffff'
    }).setOrigin(0.5);

    const hero = scene.add.text(0, top + 64, `Héroe: ${info.hero}`, {
        fontFamily: 'monospace',
        fontSize:   '16px',
        color:      '#ff00aa'
    }).setOrigin(0.5);

    const context = scene.add.text(0, top + 92, info.context, {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#8899aa',
        align:      'center',
        wordWrap:   { width: PANEL_W - 60 }
    }).setOrigin(0.5);

    const rule = scene.add.rectangle(0, top + 118, PANEL_W - 60, 1, 0xff00aa, 0.6);

    const rows  = controlLines();
    const keys  = rows.map(([key]) => key).join('\n');
    const descs = rows.map(([, desc]) => desc).join('\n');

    const keysText = scene.add.text(-PANEL_W / 2 + 40, top + 136,keys, {
        fontFamily:  'monospace',
        fontSize:    '15px',
        fontStyle:   'bold',
        color:       '#ffff00',
        align:       'left',
        lineSpacing: 6
    }).setOrigin(0, 0);

    const descText = scene.add.text(-PANEL_W / 2 + 165, top + 136,descs, {
        fontFamily:  'monospace',
        fontSize:    '15px',
        color:       '#dfe7f5',
        align:       'left',
        lineSpacing: 6
    }).setOrigin(0, 0);

    const hint = scene.add.text(0, PANEL_H / 2 - 16, 'pulsa cualquier tecla para cerrar', {
        fontFamily: 'monospace',
        fontSize:   '12px',
        color:      '#66778a'
    }).setOrigin(0.5);

    box.add([panel, title, hero, context, rule, keysText, descText, hint]);

    scene.tweens.add({ targets: box, alpha: 1, duration: FADE_IN_MS });

    let closed    = false;
    let armed     = false;
    let armTimer  = null;
    let autoTimer = null;

    const dismiss = () => {
        if (closed) return;
        closed = true;
        detach();
        scene.tweens.add({
            targets:    box,
            alpha:      0,
            duration:   FADE_OUT_MS,
            onComplete: () => box.destroy()
        });
    };

    const onAnyKey = () => { if (armed) dismiss(); };

    const detach = () => {
        scene.input.keyboard.off('keydown', onAnyKey);
        if (armTimer)  armTimer.remove();
        if (autoTimer) autoTimer.remove();
    };

    // Listener pasivo: observa las pulsaciones, no las consume.
    scene.input.keyboard.on('keydown', onAnyKey);

    armTimer  = scene.time.delayedCall(ARM_MS, () => { armed = true; });
    autoTimer = scene.time.delayedCall(VISIBLE_MS, dismiss);

    // Si el nivel se cierra antes (game over, menú), no dejamos listeners vivos.
    scene.events.once('shutdown', () => {
        if (closed) return;
        closed = true;
        detach();
        box.destroy();
    });

    return box;
}
