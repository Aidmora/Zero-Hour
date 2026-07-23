import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y } from './config/constants.js';
import BootScene     from './scenes/BootScene.js';
import MenuScene     from './scenes/MenuScene.js';
import Nivel1Scene   from './scenes/Nivel1Scene.js';
import Nivel2Scene   from './scenes/Nivel2Scene.js';
import CreditosScene from './scenes/CreditosScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import UIScene       from './scenes/UIScene.js';

const config = {
    type:            Phaser.AUTO,
    parent:          'game-container',
    width:           GAME_WIDTH,
    height:          GAME_HEIGHT,
    backgroundColor: '#1a1a2e',
    pixelArt:        true,
    scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY_Y },
            debug:   false
        }
    },
    scene: [BootScene, MenuScene, Nivel1Scene, Nivel2Scene, CreditosScene, GameOverScene, UIScene]
};

const game = new Phaser.Game(config); // eslint-disable-line no-unused-vars
