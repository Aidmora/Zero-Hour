import { P1_FRAME_WIDTH, P1_FRAME_HEIGHT } from '../config/constants.js';

const P2_FRAME_W = 128;
const P2_FRAME_H = 96;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.audio('bgm', 'assets/sounds/bgm-loop.mp3');
        this.load.audio('gameover', 'assets/sounds/game-over.mp3');

        this.load.tilemapTiledJSON('map-nivel1', 'assets/maps/nivel-1-new.json');
        this.load.tilemapTiledJSON('map-nivel2', 'assets/maps/nivel-2.json');
        this.load.image('tiles-nivel1', 'assets/tilesets/background.png');
        this.load.image('tiles-nivel2', 'assets/tilesets/background.png');
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
            ['p2-sword-slash',   'player-Sword Slash.png'],
            ['p2-jump-attack',   'player-JumpAttack.png'],
            ['p2-attack-up',     'player-Attack Up.png'],
            ['p2-attack-crouch', 'player-Attack Crouch.png'],
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
    }

    create() {
        // Textura del patrullero (32×32, cuadrado rojo con ojos)
        const g1 = this.make.graphics({ x: 0, y: 0 }, false);
        g1.fillStyle(0xcc2222, 1);
        g1.fillRect(0, 0, 32, 32);
        g1.fillStyle(0xffffff, 1);
        g1.fillRect(6, 7, 6, 6);
        g1.fillRect(20, 7, 6, 6);
        g1.fillStyle(0x000000, 1);
        g1.fillRect(8, 9, 3, 3);
        g1.fillRect(22, 9, 3, 3);
        g1.generateTexture('enemy-patrol', 32, 32);
        g1.destroy();

        // Textura del perseguidor (40×40, cuadrado morado con cara enojada)
        const g2 = this.make.graphics({ x: 0, y: 0 }, false);
        g2.fillStyle(0x7722cc, 1);
        g2.fillRect(0, 0, 40, 40);
        g2.fillStyle(0xffffff, 1);
        g2.fillRect(8, 10, 8, 7);
        g2.fillRect(24, 10, 8, 7);
        g2.fillStyle(0x000000, 1);
        g2.fillRect(10, 12, 4, 4);
        g2.fillRect(26, 12, 4, 4);
        g2.fillRect(10, 26, 20, 3);
        g2.generateTexture('enemy-chaser', 40, 40);
        g2.destroy();

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

        this.scene.start('MenuScene');
    }
}
