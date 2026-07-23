import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.sound.stopByKey('gameover');
        if (!this.sound.get('bgm') || !this.sound.get('bgm').isPlaying) {
            this.sound.play('bgm', { loop: true });
        }

        this.add.text(GAME_WIDTH / 2, 120, 'Zero Hour', {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 190, 'Juegos Interactivos - EPN', {
            fontSize: '18px',
            color: '#cccccc'
        }).setOrigin(0.5);

        this.createButton(GAME_WIDTH / 2, 290, 'Nivel 1', () => {
            this.scene.start('Nivel1Scene');
        });

        this.createButton(GAME_WIDTH / 2, 350, 'Nivel 2', () => {
            this.scene.start('Nivel2Scene');
        });

        this.createButton(GAME_WIDTH / 2, 410, 'Créditos', () => {
            this.scene.start('CreditosScene');
        });

        this.createButton(GAME_WIDTH / 2, 470, 'Salir', () => {
            this.showExitMessage();
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '32px',
            color: '#ffff00',
            backgroundColor: '#00000099',
            padding: { x: 24, y: 10 }
        }).setOrigin(0.5);

        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ color: '#ffffff' }));
        btn.on('pointerout',  () => btn.setStyle({ color: '#ffff00' }));
        btn.on('pointerdown', callback);

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
