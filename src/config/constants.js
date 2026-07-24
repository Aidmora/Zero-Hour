// player-1.png mide 1106×180 → rejilla de 14 columnas × 3 filas = 42 frames de
// 79×60. Antes el ancho estaba en 82, que no divide 1106 (1106/82 = 13.49) y
// desplazaba el recorte ~3px por columna, mezclando dos poses por frame.
export const P1_FRAME_WIDTH       = 79;
export const P1_FRAME_HEIGHT      = 60;
export const COLLECTIBLE_COUNT     = 5;
export const JUMP_VELOCITY        = -500;
export const DOUBLE_JUMP_VELOCITY = -550;
export const MAX_JUMPS            = 2;
export const GRAVITY_Y            = 900;
export const GAME_WIDTH           = 1280;
export const GAME_HEIGHT          = 480;
export const INITIAL_LIVES        = 3;
export const SCORE_PER_COLLECTIBLE = 10;
// Alineado con el GDD (500 px/s). Antes estaba en 600.
export const DASH_VELOCITY        = 500;
export const DASH_DURATION_MS     = 200;
export const DASH_COOLDOWN_MS     = 600;
export const DASH_TINT            = 0x66ccff;

// Factor único de altura de salto (aplica a salto y doble salto).
// Nivel 1 aplicaba ×0.75 y Nivel 2 no (H13); se centraliza aquí para que
// ambas escenas se sientan idénticas. Se mantiene 0.75 porque es el valor
// con el que se tuneó y probó el plataformeo de Nivel 1.
export const JUMP_HEIGHT_FACTOR   = 0.75;

// ── Game feel: coyote time y jump buffering (E1 · H11) ──
// COYOTE_TIME_MS: ventana de gracia tras salir de una plataforma durante la
//   cual el salto de suelo sigue siendo válido. 110 ms ≈ 6-7 frames a 60 fps:
//   perdona el "me caí del borde" sin llegar a leerse como salto desde el aire.
// JUMP_BUFFER_MS: ventana de anticipación. Si se pulsa salto hasta 130 ms antes
//   de tocar suelo, el salto se guarda y se ejecuta solo al aterrizar.
export const COYOTE_TIME_MS       = 110;
export const JUMP_BUFFER_MS       = 130;

// ── Game feel: aceleración y fricción horizontal (E1 · H12) ──
// Sustituyen al antiguo PLAYER_SPEED (220) + setVelocityX directo.
// MAX_VELOCITY_X mantiene esos mismos 220 px/s de tope para no alterar las
// distancias de salto con las que están medidos los mapas; lo que cambia es
// cómo se llega a esa velocidad y cómo se abandona.
// MAX_VELOCITY_Y hay que declararlo aparte: Arcade recorta AMBOS ejes contra
// maxVelocity, y setMaxVelocity(220) capando también la caída rompería la
// gravedad. 1000 px/s funciona como velocidad terminal (la caída libre de una
// pantalla completa llega a ~930).
export const MAX_VELOCITY_X       = 220;
export const MAX_VELOCITY_Y       = 1000;
// Aceleración en suelo: 220 px/s en ~110 ms. Arranque con peso pero sin retardo.
export const ACCELERATION         = 2000;
// Aceleración en aire: ~55 % de la de suelo → menos control aéreo (estándar del
// género). Corregir la trayectoria a media parábola cuesta, pero es posible.
export const ACCELERATION_AIR     = 1100;
// Frenado en suelo: para en ~90 ms desde velocidad máxima. Por encima de la
// aceleración a propósito, para que soltar la tecla no se sienta resbaladizo.
export const DRAG_GROUND          = 2400;
// Frenado en aire: bajo, para conservar la inercia del salto. Soltar la tecla
// en el aire no corta el impulso de golpe.
export const DRAG_AIR             = 380;

// ── Esquema único de controles (H01) ──
// Los valores son claves válidas de Phaser.Input.Keyboard.KeyCodes.
// Ambas escenas leen de aquí para no divergir nunca más.
export const KEYS = {
    LEFT:   'A',
    RIGHT:  'D',
    UP:     'W',
    DOWN:   'S',
    JUMP:   'SPACE',
    DASH:   'SHIFT',
    ATTACK: 'J',
    MENU:   'M'
};

// Enemigos
export const PATROL_SPEED         = 60;
export const PATROL_HP            = 1;
export const PATROL_SCORE         = 25;

export const CHASER_SPEED         = 90;
export const CHASER_HP            = 3;
export const CHASER_SCORE         = 75;
export const CHASER_DETECT_RADIUS = 300;

export const ENEMY_RESPAWN_MS     = 5000;
export const PLAYER_INVULN_MS     = 1500;
export const PLAYER_KNOCKBACK_X   = 200;
export const PLAYER_KNOCKBACK_Y   = -250;

// Melee combo
export const MELEE_HITBOX_W        = 50;
export const MELEE_HITBOX_H        = 40;
export const MELEE_DAMAGE          = 1;
// Ventana real de encadenado, medida DESDE que termina el bloqueo del golpe
// anterior (ver doMeleeAttack). Antes se medía desde el inicio del golpe, lo
// que dejaba solo ~20 ms útiles y el combo nunca encadenaba.
export const MELEE_COMBO_WINDOW_MS = 350;
export const MELEE_COOLDOWN_MS     = 150;
export const MELEE_OFFSET_X        = 40;
