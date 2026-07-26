import Enemy from './Enemy.js';
import {
    CHASER_SPEED,
    CHASER_HP,
    CHASER_SCORE,
    CHASER_DETECT_RADIUS,
    CHASER_SCALE,
    CHASER_BODY_W,
    CHASER_BODY_H,
    CHASER_BODY_OFF_X,
    CHASER_BODY_OFF_Y
} from '../config/constants.js';

// Perseguidor: el demonio alado de assets/sprites/enemies/enemy-chaser/
// (F3 · H05). Con 3 HP sí alterna estados, así que usa las cuatro
// animaciones: quieto, persiguiendo, dañado y muerte.
export default class ChaserEnemy extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy-chaser-idle', {
            idle: 'enemy-chaser-idle',
            move: 'enemy-chaser-fly',
            hurt: 'enemy-chaser-hurt',
            die:  'enemy-chaser-die'
        });

        this.maxHp      = CHASER_HP;
        this.hp         = CHASER_HP;
        this.scoreValue = CHASER_SCORE;

        this.setOrigin(0.5, 0.5);
        // La escala va ANTES del cuerpo: Arcade multiplica el tamaño del body
        // por la escala del sprite, y así setSize ya se mide contra la escala
        // definitiva.
        this.setScale(CHASER_SCALE);
        this.body.setSize(CHASER_BODY_W, CHASER_BODY_H, false);
        this.body.setOffset(CHASER_BODY_OFF_X, CHASER_BODY_OFF_Y);

        this.play('enemy-chaser-idle', true);
    }

    updateAI(player, time, delta) {
        if (this.isDead) return;

        const dx   = player.x - this.x;
        const dy   = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CHASER_DETECT_RADIUS) {
            const dir = Math.sign(dx);
            this.setVelocityX(CHASER_SPEED * dir);
            this.faceDirection(dir);
            // Antes esto era setTint(0xaa44ff) sobre el cuadrado morado, el
            // único aviso de "te ha visto". Ahora el aviso es que despliega las
            // alas y arranca a volar, que se lee sin depender del color.
            this.playState(this.animKeys.move);
        } else {
            this.setVelocityX(0);
            this.playState(this.animKeys.idle);
        }
    }
}
