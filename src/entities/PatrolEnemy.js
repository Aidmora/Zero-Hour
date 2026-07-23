import Enemy from './Enemy.js';
import { PATROL_SPEED, PATROL_HP, PATROL_SCORE } from '../config/constants.js';

export default class PatrolEnemy extends Enemy {
    constructor(scene, x, y, leftBound, rightBound) {
        super(scene, x, y, 'enemy-patrol');

        this.maxHp      = PATROL_HP;
        this.hp         = PATROL_HP;
        this.scoreValue = PATROL_SCORE;

        this.leftBound  = leftBound;
        this.rightBound = rightBound;
        this.direction  = 1;

        this.body.setSize(40, 40);
        this.setOrigin(0.5, 0.5);
    }

    updateAI(player, time, delta) {
        if (this.isDead) return;

        if (this.x <= this.leftBound)  this.direction = 1;
        else if (this.x >= this.rightBound) this.direction = -1;

        if (this.body.blocked.left)  this.direction = 1;
        if (this.body.blocked.right) this.direction = -1;

        this.setVelocityX(PATROL_SPEED * this.direction);
        this.setFlipX(this.direction < 0);
    }

    respawn() {
        super.respawn();
        this.direction = 1;
    }
}
