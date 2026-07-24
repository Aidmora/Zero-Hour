import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import Audio from '../systems/AudioManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Si venimos de GameOver, la pista de derrota se funde con el tema del
        // menú en vez de cortarse en seco (H19).
        Audio.attach(this);
        Audio.playMusic('bgm');

        this.add.text(GAME_WIDTH / 2, 78, 'Zero Hour', {
            fontSize: '58px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 132, 'Juegos Interactivos - EPN', {
            fontSize: '18px',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Cinco entradas en 480 px de alto: la rejilla se compacta (antes había
        // cuatro y la última, en y=470, ya se salía del viewport).
        this.createButton(GAME_WIDTH / 2, 200, 'Nivel 1', () => {
            Audio.fadeOutAndSwitch(this, 'Nivel1Scene');
        });

        this.createButton(GAME_WIDTH / 2, 256, 'Nivel 2', () => {
            Audio.fadeOutAndSwitch(this, 'Nivel2Scene');
        });

        // Rejugar la intro (H08): no fundimos la música porque IntroScene usa
        // la misma pista y reiniciarla la haría saltar al segundo 0.
        this.createButton(GAME_WIDTH / 2, 312, 'Historia', () => {
            this.scene.start('IntroScene');
        });

        this.createButton(GAME_WIDTH / 2, 368, 'Créditos', () => {
            Audio.fadeOutAndSwitch(this, 'CreditosScene');
        });

        this.createButton(GAME_WIDTH / 2, 424, 'Salir', () => {
            this.showExitMessage();
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '28px',
            color: '#ffff00',
            backgroundColor: '#00000099',
            padding: { x: 24, y: 8 }
        }).setOrigin(0.5);

        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => {
            btn.setStyle({ color: '#ffffff' });
            Audio.play('sfx-ui-hover');
        });
        btn.on('pointerout',  () => btn.setStyle({ color: '#ffff00' }));
        btn.on('pointerdown', () => {
            Audio.play('sfx-ui-click');
            callback();
        });

        return btn;
    }

    showExitMessage() {
        this.children.removeAll();
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '¡Gracias por jugar!', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            window.close();
            this.scene.restart();
        });
    }
}
