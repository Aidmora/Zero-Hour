import Enemy from './Enemy.js';
import {
    PATROL_SPEED,
    PATROL_HP,
    PATROL_SCORE,
    PATROL_BODY_W,
    PATROL_BODY_H,
    PATROL_BODY_OFF_X,
    PATROL_BODY_OFF_Y
} from '../config/constants.js';

// Patrullero: la seta de assets/sprites/enemies/enemy-patrol/ (F3 · H05).
// Con 1 HP muere del primer golpe, así que no llega a tener estado de daño:
// sus únicas animaciones posibles son caminar y morir.
export default class PatrolEnemy extends Enemy {
    constructor(scene, x, y, leftBound, rightBound) {
        super(scene, x, y, 'enemy-patrol-walk', {
            move: 'enemy-patrol-walk',
            die:  'enemy-patrol-die'
        });

        this.maxHp      = PATROL_HP;
        this.hp         = PATROL_HP;
        this.scoreValue = PATROL_SCORE;

        this.leftBound  = leftBound;
        this.rightBound = rightBound;
        this.direction  = 1;

        this.setOrigin(0.5, 0.5);
        // setSize(w, h, false) = no recentrar. El offset va a mano porque la
        // seta está apoyada en el borde inferior de su frame de 80×64: un
        // cuerpo centrado la dejaría hundida media altura en el suelo.
        this.body.setSize(PATROL_BODY_W, PATROL_BODY_H, false);
        this.body.setOffset(PATROL_BODY_OFF_X, PATROL_BODY_OFF_Y);

        this.play('enemy-patrol-walk', true);
    }

    updateAI(player, time, delta) {
        if (this.isDead) return;

        if (this.x <= this.leftBound)  this.direction = 1;
        else if (this.x >= this.rightBound) this.direction = -1;

        if (this.body.blocked.left)  this.direction = 1;
        if (this.body.blocked.right) this.direction = -1;

        this.setVelocityX(PATROL_SPEED * this.direction);
        this.faceDirection(this.direction);
        this.playState(this.animKeys.move);
    }

    respawn() {
        super.respawn();
        this.direction = 1;
    }
}
