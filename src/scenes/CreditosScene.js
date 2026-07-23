import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

export default class CreditosScene extends Phaser.Scene {
    constructor() {
        super('CreditosScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.add.text(GAME_WIDTH / 2, 80, 'CRÉDITOS', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        const credits = [
            '',
            '',
            'Materia: Juegos Interactivos',
            'Facultad de Ingeniería de Sistemas - EPN',
            '',
            'Estudiante A (Nivel 1): Ariel Mora',
            'Estudiante B (Nivel 2): Fernando Nagua',
            '',
            'Motor: Phaser 3',
            'Editor de mapas: Tiled',
            'Sprites: Kenney.nl'
        ];

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, credits.join('\n'), {
            fontSize: '20px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        const back = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '← Volver al Menú', {
            fontSize: '24px',
            color: '#ffff00',
            backgroundColor: '#00000099',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5);

        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setStyle({ color: '#ffffff' }));
        back.on('pointerout',  () => back.setStyle({ color: '#ffff00' }));
        back.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}
