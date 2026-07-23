import { ENEMY_RESPAWN_MS } from '../config/constants.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey) {
        super(scene, x, y, textureKey);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.spawnX = x;
        this.spawnY = y;

        this.maxHp     = 1;
        this.hp        = 1;
        this.scoreValue = 0;
        this.isDead    = false;

        this.setCollideWorldBounds(true);
    }

    takeDamage(amount = 1) {
        if (this.isDead) return;
        this.hp -= amount;

        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.body.setVelocity(0, 0);
        this.body.enable = false;

        this.scene.registry.events.emit('enemy-killed', this.scoreValue);

        this.scene.tweens.add({
            targets:  this,
            alpha:    0,
            scale:    0.1,
            angle:    180,
            duration: 300,
            onComplete: () => {
                this.setVisible(false);
                this.scene.time.delayedCall(ENEMY_RESPAWN_MS, () => this.respawn());
            }
        });
    }

    respawn() {
        if (!this.scene || !this.active) return;
        this.setPosition(this.spawnX, this.spawnY);
        this.setAlpha(1);
        this.setScale(1);
        this.setAngle(0);
        this.clearTint();
        this.setVisible(true);
        this.body.enable = true;
        this.hp    = this.maxHp;
        this.isDead = false;
    }

    updateAI(player, time, delta) {}
}
