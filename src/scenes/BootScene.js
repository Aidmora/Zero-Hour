import {
    P1_FRAME_WIDTH,
    P1_FRAME_HEIGHT,
    PATROL_FRAME_W,
    PATROL_FRAME_H,
    CHASER_FRAME_W,
    CHASER_FRAME_H
} from '../config/constants.js';

const P2_FRAME_W = 128;
const P2_FRAME_H = 96;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.audio('bgm', 'assets/sounds/bgm-loop.mp3');
        this.load.audio('gameover', 'assets/sounds/game-over.mp3');

        // ── SFX de gameplay y UI (A2 · H04) ──
        // Solo se listan los archivos que existen HOY en assets/sounds/, para
        // no provocar 404 al publicar en GitHub Pages. Los que faltan
        // (sfx-double-jump, bgm-nivel1, bgm-nivel2) están anotados en
        // docs/CAMBIOS_A2.md: AudioManager avisa por consola y sigue sin romper.
        const sfxKeys = [
            'sfx-jump',
            'sfx-dash',
            'sfx-punch',
            'sfx-kick',
            'sfx-hit-enemy',
            'sfx-enemy-death',
            'sfx-collect',
            'sfx-player-hurt',
            'sfx-land',
            'sfx-timer-warning',
            'sfx-victory',
            'sfx-ui-click',
            'sfx-ui-hover'
        ];
        for (const key of sfxKeys) {
            this.load.audio(key, `assets/sounds/${key}.mp3`);
        }

        this.load.tilemapTiledJSON('map-nivel1', 'assets/maps/nivel-1-new.json');
        this.load.tilemapTiledJSON('map-nivel2', 'assets/maps/nivel-2.json');
        this.load.image('tiles-nivel1', 'assets/tilesets/background.png');
        // Nivel 2 con atlas propio (F1.b · H06): antes cargaba el mismo
        // background.png que el Nivel 1 y por eso los dos niveles se veían
        // idénticos. industrial-tiles.png es el bloque de rejilla válida de
        // background-industrial.png (ver docs/CAMBIOS_F1.md).
        this.load.image('tiles-nivel2', 'assets/tilesets/industrial-tiles.png');
        this.load.image('bg-real', 'assets/background/background.jpg');

        this.load.spritesheet('player1', 'assets/sprites/player-1.png', {
            frameWidth:  P1_FRAME_WIDTH,
            frameHeight: P1_FRAME_HEIGHT
        });

        // Player 2 (Thor) – cargados para Nivel 2
        const base = 'assets/sprites/player-2/';
        const sheets = [
            ['p2-idle',          'player-Idle.png'],
            ['p2-run',           'player-Run.png'],
            ['p2-jump',          'player-Jump.png'],
            ['p2-hurt',          'player-Hurt.png'],
            ['p2-attack-side',   'player-AttackSide.png'],
            ['p2-air-slash',     'player-AirSwordSlash.png'],
            ['p2-sword-slash',   'player-SwordSlash.png'],
            ['p2-jump-attack',   'player-JumpAttack.png'],
            ['p2-attack-up',     'player-AttackUp.png'],
            ['p2-attack-crouch', 'player-AttackCrouch.png'],
            ['p2-crouch-slash',  'player-CrouchSwordSlash.png'],
            ['p2-crouch',        'player-Crouch.png'],
            ['p2-climb',         'player-ClimbLedge.png']
        ];
        for (const [key, file] of sheets) {
            this.load.spritesheet(key, base + file, {
                frameWidth:  P2_FRAME_W,
                frameHeight: P2_FRAME_H
            });
        }

        // ── Enemigos pixel-art (F3 · H05) ──
        // Solo se cargan las hojas que el juego REPRODUCE de verdad, para no
        // repetir el problema de H16 (7 spritesheets de Thor descargados y
        // nunca mostrados):
        //   · El patrullero tiene 1 HP y nunca se detiene → no hay estado idle
        //     ni de daño posibles; muere del primer golpe. Solo Run y Die.
        //   · El perseguidor tiene 3 HP y sí alterna quieto/persiguiendo, así
        //     que usa las cuatro. Su hoja ATTACK queda fuera: la IA no ataca,
        //     hace daño por contacto.
        const enemyBase = 'assets/sprites/enemies/';
        const enemySheets = [
            ['enemy-patrol-walk', 'enemy-patrol/Mushroom-Run.png', PATROL_FRAME_W, PATROL_FRAME_H],
            ['enemy-patrol-die',  'enemy-patrol/Mushroom-Die.png', PATROL_FRAME_W, PATROL_FRAME_H],
            ['enemy-chaser-idle', 'enemy-chaser/IDLE.png',         CHASER_FRAME_W, CHASER_FRAME_H],
            ['enemy-chaser-fly',  'enemy-chaser/FLYING.png',       CHASER_FRAME_W, CHASER_FRAME_H],
            ['enemy-chaser-hurt', 'enemy-chaser/HURT.png',         CHASER_FRAME_W, CHASER_FRAME_H],
            ['enemy-chaser-die',  'enemy-chaser/DEATH.png',        CHASER_FRAME_W, CHASER_FRAME_H]
        ];
        for (const [key, file, frameWidth, frameHeight] of enemySheets) {
            this.load.spritesheet(key, enemyBase + file, { frameWidth, frameHeight });
        }
    }

    create() {
        this.createEnemyAnimations();

        // Textura de partícula de doble salto
        const g3 = this.make.graphics({ x: 0, y: 0 }, false);
        g3.fillStyle(0xffffff, 1);
        g3.fillCircle(4, 4, 4);
        g3.generateTexture('jumpParticle', 8, 8);
        g3.destroy();

        // Textura debug del hitbox melee (borde rojo semitransparente)
        const g4 = this.make.graphics({ x: 0, y: 0 }, false);
        g4.lineStyle(2, 0xff0000, 0.5);
        g4.strokeRect(0, 0, 50, 40);
        g4.generateTexture('hitbox-debug', 50, 40);
        g4.destroy();

        // Textura de estrella dorada (coleccionable)
        const gs = this.make.graphics({ x: 0, y: 0 }, false);
        gs.fillStyle(0xffd700, 1);
        const cx = 12, cy = 12, outerR = 11, innerR = 5;
        const points = [];
        for (let i = 0; i < 10; i++) {
            const r     = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        gs.beginPath();
        gs.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) gs.lineTo(points[i].x, points[i].y);
        gs.closePath();
        gs.fillPath();
        gs.fillStyle(0xffffff, 0.6);
        gs.fillCircle(cx - 2, cy - 2, 2);
        gs.generateTexture('star', 24, 24);
        gs.destroy();

        this.scene.start('IntroScene');
    }

    // ── Animaciones de los enemigos (F3 · H05) ──
    // Se registran aquí y no en cada nivel porque el AnimationManager es global
    // al juego: definidas una vez, las usan Nivel 1 y Nivel 2 sin poder
    // divergir. Las entidades de src/entities/ solo las reproducen.
    createEnemyAnimations() {
        const anims = [
            // clave, hoja, fps, repeat
            ['enemy-patrol-walk', 'enemy-patrol-walk',  10, -1],
            // 15 frames: la seta se derrumba y se queda tendida. A 14 fps dura
            // ~1,1 s, lo justo para leerse antes de que empiece el respawn.
            ['enemy-patrol-die',  'enemy-patrol-die',   14,  0],
            ['enemy-chaser-idle', 'enemy-chaser-idle',   6, -1],
            ['enemy-chaser-fly',  'enemy-chaser-fly',   10, -1],
            ['enemy-chaser-hurt', 'enemy-chaser-hurt',  12,  0],
            // 7 frames: el demonio se deshace en humo.
            ['enemy-chaser-die',  'enemy-chaser-die',   10,  0]
        ];

        for (const [key, sheet, frameRate, repeat] of anims) {
            if (this.anims.exists(key)) continue;
            this.anims.create({
                key,
                frames: this.anims.generateFrameNumbers(sheet),
                frameRate,
                repeat
            });
        }
    }
}
