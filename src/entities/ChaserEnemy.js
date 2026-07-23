import Enemy from './Enemy.js';
import { CHASER_SPEED, CHASER_HP, CHASER_SCORE, CHASER_DETECT_RADIUS } from '../config/constants.js';

export default class ChaserEnemy extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy-chaser');

        this.maxHp      = CHASER_HP;
        this.hp         = CHASER_HP;
        this.scoreValue = CHASER_SCORE;

        this.body.setSize(48, 48);
        this.setOrigin(0.5, 0.5);
    }

    updateAI(player, time, delta) {
        if (this.isDead) return;

        const dx   = player.x - this.x;
        const dy   = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CHASER_DETECT_RADIUS) {
            const dir = Math.sign(dx);
            this.setVelocityX(CHASER_SPEED * dir);
            this.setFlipX(dir < 0);
            this.setTint(0xaa44ff);
        } else {
            this.setVelocityX(0);
            this.clearTint();
        }
    }
}
