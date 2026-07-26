import { ENEMY_RESPAWN_MS } from '../config/constants.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} textureKey textura inicial (hoja del estado en reposo)
     * @param {object} [animKeys]  claves de animación { move, idle, hurt, die }
     */
    constructor(scene, x, y, textureKey, animKeys = {}) {
        super(scene, x, y, textureKey);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.spawnX = x;
        this.spawnY = y;

        this.maxHp     = 1;
        this.hp        = 1;
        this.scoreValue = 0;
        this.isDead    = false;

        // ── Animaciones (F3 · H05) ──
        // Las declara cada subclase; la base solo las reproduce. Lo que no esté
        // definido no se reproduce, así que un enemigo sin hoja de daño o de
        // muerte sigue funcionando igual.
        this.animKeys  = animKeys;
        // Mientras dura la animación de daño, updateAI no pisa la de
        // movimiento: si no, el golpe se vería un único frame.
        this.isHurting = false;

        // ── Sentido del dibujo original ──
        // Las hojas de los dos enemigos están dibujadas MIRANDO A LA IZQUIERDA
        // (en el demonio se ve claro: la cola y el ala desplegada quedan
        // detrás, a la derecha). Las del jugador miran a la derecha, así que el
        // `setFlipX(dir < 0)` heredado de los cuadrados los dejaba caminando
        // de espaldas. Se declara aquí en vez de invertir el signo en cada
        // subclase: si algún día se cambia una hoja por otra que mire a la
        // derecha, basta con poner esto a true.
        this.spriteFacesRight = false;

        this.setCollideWorldBounds(true);
    }

    /**
     * Orienta el sprite hacia donde se mueve, teniendo en cuenta hacia dónde
     * mira el dibujo de la hoja. dir 0 no reorienta: mantiene la última pose.
     * @param {number} dir -1 izquierda, 1 derecha
     */
    faceDirection(dir) {
        if (dir === 0) return;
        this.setFlipX(this.spriteFacesRight ? dir < 0 : dir > 0);
    }

    // Animación de estado (caminar / volar / quieto), respetando la de daño en
    // curso. La llaman las subclases desde updateAI.
    playState(key) {
        if (!key || this.isDead || this.isHurting) return;
        this.play(key, true);
    }

    takeDamage(amount = 1) {
        if (this.isDead) return;
        this.hp -= amount;

        if (this.hp <= 0) {
            this.die();
            return;
        }

        this.playHurt();
    }

    // Antes era un tinte rojo de 100 ms sobre el cuadrado. Las hojas nuevas
    // traen su propio destello —el segundo frame del demonio es una silueta
    // blanca—, así que el tinte sobra.
    playHurt() {
        const key = this.animKeys.hurt;
        if (!key || !this.scene.anims.exists(key)) return;

        // Dos golpes seguidos no reinician la animación ni acumulan listeners
        // de fin: mientras haya una en curso, se ignora la siguiente.
        if (this.isHurting) return;
        this.isHurting = true;
        this.play(key, true);
        this.once(`animationcomplete-${key}`, () => { this.isHurting = false; });
    }

    die() {
        this.isDead    = true;
        this.isHurting = false;
        this.body.setVelocity(0, 0);
        this.body.enable = false;

        this.scene.registry.events.emit('enemy-killed', this.scoreValue);

        const key = this.animKeys.die;
        if (key && this.scene.anims.exists(key)) {
            // La animación termina en su último frame (el cadáver de la seta,
            // el humo del demonio) y solo entonces desaparece. El tween de
            // alpha + giro de 180° era un apaño para el cuadrado, que no tenía
            // animación de muerte.
            this.play(key, true);
            this.once(`animationcomplete-${key}`, () => this.finishDeath());
            return;
        }

        this.finishDeath();
    }

    finishDeath() {
        this.setVisible(false);
        this.scene.time.delayedCall(ENEMY_RESPAWN_MS, () => this.respawn());
    }

    respawn() {
        if (!this.scene || !this.active) return;
        this.setPosition(this.spawnX, this.spawnY);
        this.setAlpha(1);
        this.setAngle(0);
        this.clearTint();
        this.setVisible(true);
        this.body.enable = true;
        this.hp     = this.maxHp;
        this.isDead = false;
        this.isHurting = false;
        // OJO: aquí había un setScale(1) que deshacía el tween de muerte. Ya no
        // hay tween, y dejarlo rompería la escala propia del perseguidor
        // (CHASER_SCALE), que reaparecería al doble de su tamaño.

        // Sin esto el enemigo volvería congelado en el último frame de su
        // animación de muerte hasta que updateAI cambiara de estado.
        const idle = this.animKeys.idle || this.animKeys.move;
        if (idle) this.play(idle, true);
    }

    updateAI(player, time, delta) {}
}
