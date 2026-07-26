// player-1.png mide 1106×180 → rejilla de 14 columnas × 3 filas = 42 frames de
// 79×60. Antes el ancho estaba en 82, que no divide 1106 (1106/82 = 13.49) y
// desplazaba el recorte ~3px por columna, mezclando dos poses por frame.
export const P1_FRAME_WIDTH       = 79;
export const P1_FRAME_HEIGHT      = 60;
// Sustituida por FRAGMENTS_PER_LEVEL (H09); ya no la usa ninguna escena. Se
// deja declarada para no romper nada que la importe mientras se cierra la rama.
export const COLLECTIBLE_COUNT     = 5;
// ── Fragmentos del código de desactivación (H09) ──
// Piezas FINITAS por nivel: reunirlas todas es la condición de victoria (antes
// era score >= 300, desconectado de lo que el jugador recogía). Seis obliga a
// recorrer el mapa entero de los 40 tiles de ancho —las piezas se reparten por
// las plataformas alcanzables, no se amontonan— sin volverse una tarea de
// farmeo. Si un mapa no diera para seis huecos alcanzables, la escena usa el
// número realmente colocado como total (ver systems/Fragments.js).
export const FRAGMENTS_PER_LEVEL   = 6;
// ── Cuenta atrás de la bomba / Hora Cero (F2 · H10) ──
// La narrativa es una bomba con cuenta regresiva, pero solo Nivel 2 tenía
// temporizador (60 s a pelo dentro de la escena). Ahora los dos niveles corren
// contra el reloj y los segundos viven aquí, no incrustados en cada escena.
// Nivel 1 es el primer contacto con los controles y el mapa: 90 s dan margen
// para explorar las plataformas sin que el reloj sea el enemigo principal.
// Nivel 2 mantiene los 60 s con los que ya estaba tuneado — menos tiempo en la
// segunda mitad refuerza que la Hora Cero está encima.
export const LEVEL1_TIME_SECONDS   = 90;
export const LEVEL2_TIME_SECONDS   = 60;
export const JUMP_VELOCITY        = -500;
export const DOUBLE_JUMP_VELOCITY = -550;
export const MAX_JUMPS            = 2;
export const GRAVITY_Y            = 900;
export const GAME_WIDTH           = 1280;
export const GAME_HEIGHT          = 480;
// ── Zoom de cámara (F1.a · H03) ──
// Nivel 1 no llamaba a setZoom (quedaba en 1.0, mapa entero a la vista y el
// personaje diminuto) y Nivel 2 usaba un 1.5 suelto: al cambiar de nivel la
// perspectiva y el tamaño del héroe daban un salto. El equipo eligió la cámara
// CERCANA del Nivel 2, así que 1.5 pasa a ser el valor único de los dos.
// Los mapas miden 40×15 tiles = 1280×480, justo el viewport: a 1.5 la cámara
// recorta y sigue al jugador, que es el efecto buscado.
export const CAMERA_ZOOM          = 1.5;
export const INITIAL_LIVES        = 3;
// ── Umbral de muerte por caída ──
// Se mide sobre player.y (centro del sprite) contra mapa.heightInPixels. Los dos
// niveles usaban valores distintos (N1: > alto-40, N2: >= alto-51) y no eran
// intercambiables: los héroes tienen geometrías muy distintas y, apoyados en el
// fondo del mundo, N1 queda en y=452 pero N2 solo en y=432. Con el umbral de N1
// (440) las caídas de Nivel 2 NO mataban. Se unifica en 51, el único de los dos
// que dispara en ambos sin falsos positivos sobre el suelo más bajo del mapa
// (medido de pie ahí: N1 y=388, N2 y=400; ambos muy por encima de 429).
export const FALL_DEATH_MARGIN_Y  = 51;
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

// ── Modo depuración (H24) ──
// Activa las teclas de desarrollo dentro de los niveles:
//   L → quitar una vida al jugador (loseLife)
//   K → matar al enemigo más cercano (killNearestEnemy)
// Solo condiciona el REGISTRO de esos atajos de teclado; los métodos que
// invocan siguen usándose fuera del debug (p. ej. la caída al vacío llama a
// loseLife desde update). La tecla M (volver al menú) es del GDD y no depende
// de este flag.
// DEBE QUEDAR EN false PARA LA ENTREGA: con true, cualquiera puede hacer
// trampa o perder vidas por accidente durante la demo.
export const DEBUG_MODE           = false;

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

// ── Feedback visual de daño (H21) ──
// Sacudida de cámara + destello rojo. Ambos efectos son un acento: duran menos
// que el parpadeo de invulnerabilidad (1500 ms) para no solaparse con el
// siguiente golpe posible ni tapar la acción.
// DAMAGE_SHAKE_MS: 180 ms ≈ 11 frames. Por debajo de 120 ms el golpe apenas se
//   lee; por encima de ~250 ms la pantalla queda temblando después del impacto
//   y estorba para recolocarse tras el knockback.
// DAMAGE_SHAKE_INTENSITY: fracción del ancho de pantalla → 0.010 × 1280 px
//   = ±13 px de desplazamiento (las escenas compensan el zoom, así que el
//   temblor mide lo mismo en los dos niveles). Se nota como un impacto sin
//   marear ni romper la lectura de las plataformas.
// DAMAGE_SHAKE_INTENSITY_FALL: la caída al vacío cuesta una vida Y reposiciona
//   al jugador al inicio; el golpe más seco (×1.5) subraya que fue peor.
export const DAMAGE_SHAKE_MS              = 180;
export const DAMAGE_SHAKE_INTENSITY       = 0.010;
export const DAMAGE_SHAKE_INTENSITY_FALL  = 0.015;
// Destello rojo: sube rápido y baja algo más lento (60 + 140 = 200 ms).
// El pico de 0.30 tiñe la escena sin ocultarla — a 0.5 ya no se ven los
// enemigos durante el flash, que es justo cuando hay que reaccionar.
export const DAMAGE_FLASH_COLOR    = 0xff0000;
export const DAMAGE_FLASH_ALPHA    = 0.30;
export const DAMAGE_FLASH_IN_MS    = 60;
export const DAMAGE_FLASH_OUT_MS   = 140;
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
