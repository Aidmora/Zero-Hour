import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalScore = data.score ?? 0;
        this.fromScene  = data.from  ?? 'Nivel1Scene';
    }

    create() {
        this.cameras.main.setBackgroundColor('#3d0000');

        this.sound.stopByKey('bgm');
        this.sound.play('gameover');

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'GAME OVER', {
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#ff3333',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Puntaje final: ${this.finalScore}`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const retry = this.add.text(GAME_WIDTH / 2 - 130, GAME_HEIGHT / 2 + 100, 'Reintentar', {
            fontSize: '28px',
            color: '#ffff00',
            backgroundColor: '#00000099',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        retry.on('pointerover', () => retry.setStyle({ color: '#ffffff' }));
        retry.on('pointerout',  () => retry.setStyle({ color: '#ffff00' }));
        retry.on('pointerdown', () => {
            this.sound.stopByKey('gameover');
            if (!this.sound.get('bgm') || !this.sound.get('bgm').isPlaying) {
                this.sound.play('bgm', { loop: true });
            }
            this.scene.start(this.fromScene);
        });

        const menu = this.add.text(GAME_WIDTH / 2 + 130, GAME_HEIGHT / 2 + 100, 'Menú', {
            fontSize: '28px',
            color: '#ffff00',
            backgroundColor: '#00000099',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menu.on('pointerover', () => menu.setStyle({ color: '#ffffff' }));
        menu.on('pointerout',  () => menu.setStyle({ color: '#ffff00' }));
        menu.on('pointerdown', () => {
            this.sound.stopByKey('gameover');
            this.scene.start('MenuScene');
        });
    }
}
