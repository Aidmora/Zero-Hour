import {
    COLLECTIBLE_COUNT,
    PLAYER_SPEED,
    JUMP_VELOCITY,
    DOUBLE_JUMP_VELOCITY,
    MAX_JUMPS,
    DASH_VELOCITY,
    DASH_DURATION_MS,
    DASH_COOLDOWN_MS,
    DASH_TINT,
    INITIAL_LIVES,
    SCORE_PER_COLLECTIBLE,
    PLAYER_INVULN_MS,
    PLAYER_KNOCKBACK_X,
    PLAYER_KNOCKBACK_Y,
    GAME_HEIGHT,
    MELEE_HITBOX_W,
    MELEE_HITBOX_H,
    MELEE_DAMAGE,
    MELEE_COMBO_WINDOW_MS,
    MELEE_COOLDOWN_MS,
    MELEE_OFFSET_X
} from '../config/constants.js';
import PatrolEnemy from '../entities/PatrolEnemy.js';
import ChaserEnemy from '../entities/ChaserEnemy.js';

export default class Nivel2Scene extends Phaser.Scene {
    constructor() {
        super('Nivel2Scene');
    }

    create() {
        // ── Estado inicial ──
        this.score          = 0;
        this.lives          = INITIAL_LIVES;
        this.isInvulnerable = false;
        this.targetScore    = 300; // Objetivo de puntos
        this.timeLeft       = 60;  // Tiempo límite (segundos)

        this.registry.events.emit('score-changed', this.score);
        this.registry.events.emit('lives-changed', this.lives);
        this.registry.events.emit('dash-ready',    true);
        this.registry.events.emit('time-changed',  this.timeLeft);

        this.timeTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.registry.events.emit('time-changed', this.timeLeft);
                if (this.timeLeft <= 0) {
                    this.gameOver();
                }
            },
            callbackScope: this,
            loop: true
        });

        this.registry.events.on('enemy-killed', (points) => {
            this.score += points;
            this.registry.events.emit('score-changed', this.score);
            this.checkWinCondition();
        });
        this.events.once('shutdown', () => {
            this.registry.events.off('enemy-killed');
        });

        // ── Tilemap ──
        this.mapa = this.make.tilemap({ key: 'map-nivel2' });
        const tileset = this.mapa.addTilesetImage('background', 'tiles-nivel2');

        // ── Fondo ──
        // Añadimos la imagen de fondo antes de la capa de suelo para que se dibuje por detrás
        this.bg = this.add.image(0, 0, 'bg-real').setOrigin(0, 0);
        this.bg.setDisplaySize(this.mapa.widthInPixels, this.mapa.heightInPixels);

        this.capaSuelo = this.mapa.createLayer('Tile Layer 1', tileset, 0, 0);
        this.capaSuelo.setCollisionByExclusion([-1, 0]);

        // ── Jugador 2 ──
        this.player = this.physics.add.sprite(450, 50, 'p2-idle', 0);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.05);
        this.player.body.setSize(22, 46).setOffset(53, 50);
        this.facingRight = true;

        this.physics.add.collider(this.player, this.capaSuelo);

        // ── Doble salto ──
        this.jumpsUsed = 0;

        this.doubleJumpFx = this.add.particles(0, 0, 'jumpParticle', {
            speed:    { min: 80, max: 160 },
            angle:    { min: 250, max: 290 },
            scale:    { start: 1, end: 0 },
            alpha:    { start: 1, end: 0 },
            lifespan: 400,
            quantity: 12,
            tint:     0x00ffff,
            emitting: false
        });

        // ── Dash ──
        this.isDashing = false;
        this.canDash   = true;

        // ── Melee combo ──
        this.isAttacking    = false;
        this.comboStep      = 0;
        this.lastAttackTime = 0;

        this.meleeHitbox = this.add.rectangle(0, 0, MELEE_HITBOX_W, MELEE_HITBOX_H);
        this.physics.add.existing(this.meleeHitbox);
        this.meleeHitbox.body.setAllowGravity(false);
        this.meleeHitbox.setActive(false);
        this.meleeHitbox.body.enable = false;

        // ── Enemigos ──
        this.enemies = this.physics.add.group({
            classType:      Phaser.Physics.Arcade.Sprite,
            runChildUpdate: false
        });

        this.enemies.add(new PatrolEnemy(this, 30, 40, 20, 110));
        this.enemies.add(new PatrolEnemy(this, 800, 40, 820, 1070));
        this.enemies.add(new ChaserEnemy(this, 800, 295));

        this.physics.add.collider(this.enemies, this.capaSuelo);
        this.physics.add.overlap(this.player,      this.enemies,   this.onPlayerHitEnemy, null, this);
        this.physics.add.overlap(this.meleeHitbox, this.enemies,   this.onMeleeHitEnemy,  null, this);

        // ── Coleccionables ──
        this.collectibles = this.physics.add.group({
            allowGravity: false,
            immovable:    true
        });

        this.spawnInitialCollectibles();

        this.physics.add.overlap(this.player, this.collectibles, this.onCollectStar, null, this);

        // ── Animaciones ──
        if (!this.anims.exists('p2-idle')) {
            this.anims.create({ key: 'p2-idle',  frames: this.anims.generateFrameNumbers('p2-idle'), frameRate: 8,  repeat: -1 });
        }
        if (!this.anims.exists('p2-walk')) {
            this.anims.create({ key: 'p2-walk',  frames: this.anims.generateFrameNumbers('p2-run'), frameRate: 12, repeat: -1 });
        }
        if (!this.anims.exists('p2-jump')) {
            this.anims.create({ key: 'p2-jump',  frames: this.anims.generateFrameNumbers('p2-jump'), frameRate: 8,  repeat: 0  });
        }
        if (!this.anims.exists('p2-fall')) {
            this.anims.create({ key: 'p2-fall',  frames: [{ key: 'p2-jump', frame: 3 }],             frameRate: 1,  repeat: -1 });
        }
        if (!this.anims.exists('p2-hurt')) {
            this.anims.create({ key: 'p2-hurt',  frames: this.anims.generateFrameNumbers('p2-hurt'), frameRate: 10, repeat: 0  });
        }
        if (!this.anims.exists('p2-punch')) {
            this.anims.create({ key: 'p2-punch', frames: this.anims.generateFrameNumbers('p2-attack-side'), frameRate: 14, repeat: 0  });
        }
        if (!this.anims.exists('p2-kick')) {
            this.anims.create({ key: 'p2-kick',  frames: this.anims.generateFrameNumbers('p2-sword-slash'), frameRate: 14, repeat: 0  });
        }

        // ── Cámara ──
        this.cameras.main.setBounds(0, 0, this.mapa.widthInPixels, this.mapa.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.5);

        // ── Controles ──
        this.keys = this.input.keyboard.addKeys({
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S
        });
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // ── UIScene en paralelo ──
        this.scene.launch('UIScene');

        this.input.keyboard.on('keydown-M', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });
        this.input.keyboard.on('keydown-L', () => { this.loseLife(); });
        this.input.keyboard.on('keydown-K', () => { this.killNearestEnemy(); });
    }

    update(time, _delta) {
        this.handleMovement();
        this.handleJump();

        if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.canDash && !this.isDashing) {
            this.startDash();
        }

        this.enemies.children.iterate((enemy) => {
            if (enemy) enemy.updateAI(this.player, time, _delta);
        });

        if (this.player.y >= this.mapa.heightInPixels - 51) {
            this.loseLife();
        }
    }

    handleMovement() {
        const onGround = this.player.body.blocked.down;
        this.updateHorizontal(onGround);
        this.updateAirAnim(onGround);
    }

    resolveHorizDir() {
        if (this.keys.left.isDown)  return -1;
        if (this.keys.right.isDown) return  1;
        return 0;
    }

    updateHorizontal(onGround) {
        const dir = this.resolveHorizDir();
        if (!this.isDashing) this.player.setVelocityX(dir * PLAYER_SPEED);
        if (dir !== 0) {
            this.facingRight = dir > 0;
            this.player.setFlipX(!this.facingRight);
        }
        if (onGround && !this.isAttacking) {
            this.player.anims.play(dir === 0 ? 'p2-idle' : 'p2-walk', true);
        }
    }

    updateAirAnim(onGround) {
        if (!onGround && !this.isAttacking) {
            this.player.anims.play(this.player.body.velocity.y < 0 ? 'p2-jump' : 'p2-fall', true);
        }
    }

    handleJump() {
        const body     = this.player.body;
        const onGround = body.blocked.down || body.touching.down;

        if (onGround) this.jumpsUsed = 0;

        if (Phaser.Input.Keyboard.JustDown(this.keys.up) && this.jumpsUsed < MAX_JUMPS) {
            if (this.jumpsUsed === 0) {
                this.player.setVelocityY(JUMP_VELOCITY);
            } else {
                this.player.setVelocityY(DOUBLE_JUMP_VELOCITY);
                this.doubleJumpFx.emitParticleAt(this.player.x, this.player.y + 30);
            }
            this.jumpsUsed += 1;
            this.player.anims.play('p2-jump', true);
        }
    }

    doMeleeAttack(time) {
        if (this.isAttacking) return;

        if (time - this.lastAttackTime > MELEE_COMBO_WINDOW_MS) {
            this.comboStep = 0;
        }

        this.isAttacking    = true;
        this.lastAttackTime = time;

        const isKick   = this.comboStep === 2;
        const animKey  = isKick ? 'p2-kick' : 'p2-punch';
        const duration = isKick ? 250 : 180;

        this.player.anims.play(animKey, true);

        const offsetX = this.facingRight ? MELEE_OFFSET_X : -MELEE_OFFSET_X;
        this.meleeHitbox.setPosition(this.player.x + offsetX, this.player.y);
        this.meleeHitbox.body.enable = true;
        this.meleeHitbox.setActive(true);

        this.time.delayedCall(duration, () => {
            this.meleeHitbox.setActive(false);
            this.meleeHitbox.body.enable = false;
        });

        this.comboStep = (this.comboStep + 1) % 3;

        this.time.delayedCall(duration + MELEE_COOLDOWN_MS, () => {
            this.isAttacking = false;
        });
    }

    onMeleeHitEnemy(_hitbox, enemy) {
        if (!enemy.isDead) {
            enemy.takeDamage(MELEE_DAMAGE);
        }
    }

    spawnInitialCollectibles() {
        for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
            this.spawnCollectibleAtRandomSpot();
        }
    }

    spawnCollectibleAtRandomSpot() {
        const maxTries = 100;
        for (let i = 0; i < maxTries; i++) {
            const tx = Phaser.Math.Between(1, this.mapa.width  - 2);
            const ty = Phaser.Math.Between(1, this.mapa.height - 2);
            const tileAt    = this.capaSuelo.getTileAt(tx, ty);
            const tileBelow = this.capaSuelo.getTileAt(tx, ty + 1);

            if (!tileAt && tileBelow) {
                const wx = tx * this.mapa.tileWidth  + this.mapa.tileWidth  / 2;
                const wy = ty * this.mapa.tileHeight + this.mapa.tileHeight / 2;
                const star = this.collectibles.create(wx, wy, 'star');
                star.setOrigin(0.5, 0.5);
                star.body.setSize(20, 20).setOffset(2, 2);

                this.tweens.add({ targets: star, angle: 360,    duration: 3000, repeat: -1 });
                this.tweens.add({ targets: star, y: wy - 4,     duration: 800,  yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                return;
            }
        }
    }

    onCollectStar(_player, star) {
        if (!star.active) return;
        star.disableBody(true, true);

        const ghost = this.add.sprite(star.x, star.y, 'star');
        this.tweens.add({
            targets:    ghost,
            scale:      2,
            alpha:      0,
            duration:   300,
            onComplete: () => ghost.destroy()
        });

        this.score += SCORE_PER_COLLECTIBLE;
        this.registry.events.emit('score-changed', this.score);
        this.checkWinCondition();

        this.time.delayedCall(500, () => this.spawnCollectibleAtRandomSpot());
    }

    startDash() {
        this.isDashing = true;
        this.canDash   = false;
        this.registry.events.emit('dash-ready', false);

        const dir = this.facingRight ? 1 : -1;
        this.player.setVelocityX(DASH_VELOCITY * dir);
        this.player.setVelocityY(0);
        this.player.body.setAllowGravity(false);
        this.player.setTint(DASH_TINT);

        this.spawnAfterimages();

        this.time.delayedCall(DASH_DURATION_MS, () => this.endDash());

        this.time.delayedCall(DASH_COOLDOWN_MS, () => {
            this.canDash = true;
            this.registry.events.emit('dash-ready', true);
        });
    }

    endDash() {
        this.isDashing = false;
        this.player.body.setAllowGravity(true);
        this.player.clearTint();
    }

    spawnAfterimages() {
        const interval = DASH_DURATION_MS / 4;
        for (let i = 0; i < 4; i++) {
            this.time.delayedCall(i * interval, () => {
                if (!this.isDashing) return;
                const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name);
                ghost.setFlipX(this.player.flipX);
                ghost.setScale(this.player.scaleX, this.player.scaleY);
                ghost.setTint(DASH_TINT);
                ghost.setAlpha(0.5);
                this.tweens.add({
                    targets:    ghost,
                    alpha:      0,
                    duration:   250,
                    onComplete: () => ghost.destroy()
                });
            });
        }
    }

    onPlayerHitEnemy(player, enemy) {
        if (enemy.isDead) return;

        if (this.isDashing) {
            enemy.takeDamage(MELEE_DAMAGE);
            return;
        }

        if (this.isInvulnerable) return;

        const dir = player.x < enemy.x ? -1 : 1;
        player.setVelocity(PLAYER_KNOCKBACK_X * dir, PLAYER_KNOCKBACK_Y);

        this.takeDamageFromEnemy();
    }

    takeDamageFromEnemy() {
        this.lives -= 1;
        this.registry.events.emit('lives-changed', this.lives);

        if (this.lives <= 0) {
            this.gameOver();
            return;
        }

        this.isInvulnerable = true;
        this.player.anims.play('p2-hurt', true);
        this.tweens.add({
            targets:  this.player,
            alpha:    0.3,
            duration: 100,
            yoyo:     true,
            repeat:   Math.floor(PLAYER_INVULN_MS / 200) - 1,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvulnerable = false;
            }
        });
    }

    killNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;
        this.enemies.children.iterate((enemy) => {
            if (!enemy || enemy.isDead) return;
            const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
            if (d < minDist) {
                minDist = d;
                nearest = enemy;
            }
        });
        if (nearest) nearest.takeDamage(99);
    }

    loseLife() {
        this.lives -= 1;
        this.registry.events.emit('lives-changed', this.lives);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.player.setVelocity(0, 0);
            this.player.setPosition(450, 50);
            this.jumpsUsed   = 0;
            this.isDashing   = false;
            this.canDash     = true;
            this.isAttacking = false;
            this.comboStep   = 0;
            this.player.body.setAllowGravity(true);
            this.player.clearTint();
            this.registry.events.emit('dash-ready', true);
        }
    }

    checkWinCondition() {
        if (this.score >= this.targetScore) {
            this.winGame();
        }
    }

    winGame() {
        this.scene.stop('UIScene');
        this.scene.start('CreditosScene');
    }

    gameOver() {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { score: this.score, from: 'Nivel2Scene' });
    }
}
