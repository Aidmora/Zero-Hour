# Mejora E1 — Game feel: coyote time, jump buffering y movimiento con inercia

Resuelve los hallazgos **H11** (sin coyote time ni jump buffering) y **H12**
(movimiento rígido, sin aceleración ni fricción) del `INFORME_PLAYTESTING.md`.

---

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/config/constants.js` | Se eliminó `PLAYER_SPEED` y se añadieron 8 constantes nuevas (§2). |
| `src/scenes/Nivel1Scene.js` | Nuevo `isOnGround()`; `updateHorizontal()` con aceleración/drag; `handleJump(time)` con coyote + buffer; `startDash()`/`endDash()` protegidos; reset de movimiento en `loseLife()`. |
| `src/scenes/Nivel2Scene.js` | **Exactamente los mismos cambios**, línea por línea. |

No se tocó `UIScene.js`, `src/entities/`, los mapas JSON, el sistema de audio,
la `IntroScene` ni el mapeo de teclas. No se añadió ninguna dependencia.

`PLAYER_SPEED` desaparece porque su único uso eran las dos líneas
`setVelocityX(dir * PLAYER_SPEED)` que este cambio sustituye; `MAX_VELOCITY_X`
hereda su valor (220) para no dejar dos constantes que signifiquen lo mismo.

---

## 2. Valores finales y por qué

| Constante | Valor | Por qué ese valor |
|---|---|---|
| `COYOTE_TIME_MS` | **110** | ≈ 6-7 frames a 60 fps. Con 80 ms el borde seguía sintiéndose tacaño en pruebas; a partir de ~150 ms el salto empieza a leerse como "salté desde el aire" y se nota falso. 110 perdona el error real de reacción sin regalar alcance. |
| `JUMP_BUFFER_MS` | **130** | Un jugador que anticipa el salto suele adelantarse 2-8 frames. 130 ms cubre esa franja. Se probó 200 y era demasiado: el personaje rebotaba solo tras aterrizajes que ya no querías encadenar. |
| `MAX_VELOCITY_X` | **220** | **Idéntico al antiguo `PLAYER_SPEED`.** Es deliberado: las distancias de salto y la anchura de los huecos de ambos mapas están medidas con esa velocidad punta. Lo que cambia es *cómo* se llega a ella, no cuánto se llega a saltar. |
| `MAX_VELOCITY_Y` | **1000** | Obligatorio declararlo: Arcade recorta **los dos ejes** contra `maxVelocity`, así que `setMaxVelocity(220)` habría capado también la caída y roto la gravedad. 1000 funciona como velocidad terminal y casi nunca entra en juego (la caída libre de una pantalla completa con `GRAVITY_Y = 900` llega a ~930 px/s). |
| `ACCELERATION` | **2000** | 0 → 220 px/s en ~110 ms (medido: 7 frames). Da peso al arranque sin retardo perceptible. Con 1200 el personaje se sentía pesado como un camión; con 3000 no se distinguía del `setVelocityX` de antes. |
| `ACCELERATION_AIR` | **1100** | 55 % de la de suelo → **menos control aéreo**, que es el estándar del género: corregir la trayectoria a media parábola cuesta pero es posible (medido: 0 → 220 en ~215 ms). |
| `DRAG_GROUND` | **2400** | Frena de 220 a 0 en ~90 ms (medido: 6 frames). **Por encima de `ACCELERATION` a propósito**: en las primeras pruebas lo puse en 1200 y el personaje patinaba al soltar la tecla; subirlo por encima de la aceleración hace que parar sea más rápido que arrancar, que es lo que se lee como "control firme". |
| `DRAG_AIR` | **380** | Bajo, para **conservar la inercia del salto**: soltar la tecla en el aire no corta el impulso de golpe (medido: 183 → 126 px/s en 167 ms). Es lo que hace que el salto se sienta con masa. |

### Relación entre los valores

Los tres números que importan y su porqué en una frase:

- `DRAG_GROUND (2400) > ACCELERATION (2000)` → **parar es más rápido que arrancar**;
  sin esa desigualdad el personaje se siente resbaladizo.
- `ACCELERATION_AIR (1100) < ACCELERATION (2000)` → menos autoridad en el aire.
- `DRAG_AIR (380) << DRAG_GROUND (2400)` → la inercia sobrevive al salto.

---

## 3. Decisiones de implementación

### 3.a — El coyote time *consume* el salto de suelo al expirar

Este es el cambio de comportamiento con más peso, y conviene dejarlo por escrito.

El código anterior nunca comprobaba si el jugador estaba en el suelo para saltar:
solo miraba `jumpsUsed < MAX_JUMPS`. Como `jumpsUsed` únicamente se reseteaba
tocando suelo, **caerse de una plataforma dejaba los dos saltos intactos**: podías
hacer salto normal + doble salto enteros desde el aire. Es decir, en la práctica
había un coyote time *infinito* y el doble salto no costaba nada.

Ahora, pasados los 110 ms fuera de la plataforma, el salto de suelo se marca como
gastado (`jumpsUsed = 1`) y solo queda el aéreo. Consecuencia real: al caer de un
borde tarde ya no se recuperan dos saltos, sino uno — y es el **doble salto**, que
es el más fuerte de los dos (`-412` frente a `-375`), de modo que la capacidad de
recuperación apenas baja mientras que el doble salto por fin significa algo.

### 3.b — Protección del dash (requisito crítico)

El dash lanza el cuerpo a `DASH_VELOCITY = 500`, muy por encima de
`MAX_VELOCITY_X = 220`, y **Arcade recorta la velocidad contra `maxVelocity` en
cada paso de física**. Sin tratarlo, el nuevo sistema habría reducido el dash a
velocidad de carrera de forma silenciosa. Por eso `startDash()`:

1. pone `setAccelerationX(0)` y `setDragX(0)` — nada frena el dash a mitad;
2. sube el techo con `setMaxVelocity(DASH_VELOCITY, MAX_VELOCITY_Y)`;
3. y solo entonces fija `setVelocityX(±500)`.

`endDash()` devuelve el techo a `MAX_VELOCITY_X`. La velocidad sobrante se recorta
sola en el siguiente paso, así que la salida del dash es una transición limpia a
velocidad de carrera, no un frenazo a cero.

Además `updateHorizontal()` sigue sin tocar el eje X mientras `isDashing`, y
`loseLife()` restaura techo, drag y aceleración por si se muere **en pleno dash**
(sin eso, el jugador reaparecía con `maxVelocity.x = 500`).

### 3.c — Un único criterio de "está en el suelo"

Antes `handleMovement()` miraba solo `blocked.down` y `handleJump()` miraba
`blocked.down || touching.down`: podían discrepar un frame. Ahora ambos usan el
mismo helper `isOnGround()`, del que dependen también la elección de drag y el
registro de `lastGroundedTime`.

### 3.d — Consumir el buffer antes de saltar

`jumpBufferedAt` se pone a `-Infinity` **antes** de aplicar el impulso. Sin eso,
la misma pulsación seguiría viva el frame siguiente y encadenaría el doble salto
ella sola: una sola pulsación gastaría los dos saltos.

---

## 4. Paridad entre escenas

Requisito de la fase A1: ambas escenas deben comportarse igual. Comprobado con
`diff src/scenes/Nivel1Scene.js src/scenes/Nivel2Scene.js`: en todo el código
nuevo (`isOnGround`, `updateHorizontal`, `handleJump`, `startDash`, `endDash`,
bloque de `loseLife`, `create`) **no hay ni una línea de diferencia** salvo las
claves de animación (`p1-jump` ↔ `p2-jump`), que ya divergían antes.

---

## 5. Verificación hecha

`python -m http.server 8000` + Chrome. Como la pestaña de pruebas quedaba oculta
(y con ella el `requestAnimationFrame` congelado), se pisó el bucle de Phaser a
mano desde consola (`game.step(t, dt)` con dt fijo de 16.7 ms) para poder medir
frame a frame. **Sin errores ni warnings de juego en consola** en todo el
recorrido.

### Medidas obtenidas (Nivel 1)

**Aceleración y frenado en suelo** — velocidad X por frame:

```
Pulsar D :  0 → 33 → 67 → 100 → 133 → 167 → 200 → 220 → 220 …   (tope a los 117 ms)
Soltar D : 180 → 140 → 100 → 60 → 20 → 0                        (parado a los 100 ms)
```

**Control aéreo vs. suelo** — mismo arranque desde parado:

```
suelo : 0, 33, 67, 100, 133, 167, 200, 220 …      → tope en 7 frames
aire  : 0, 18, 37,  55,  73,  92, 110, 128, 147, 165 …  → tope en ~13 frames
inercia al soltar en el aire: 183 → 177 → 171 → … → 126  (se conserva)
```

**Coyote time** — tiempo real transcurrido desde que se dejó la plataforma:

| Fuera de la plataforma | Resultado |
|---|---|
| 17 ms | salto de suelo (`-375`), `jumpsUsed = 1` |
| 57 ms | salto de suelo |
| 97 ms | salto de suelo |
| **110 ms** | salto de suelo ← último válido |
| **113 ms** | doble salto (`-412`), `jumpsUsed = 2` |
| 137 ms / 317 ms | doble salto |

La frontera cae exactamente en `COYOTE_TIME_MS = 110`.

**Jump buffering** — pulsar SPACE sin saltos disponibles, X ms antes de aterrizar:

| Anticipación | ¿Salta solo al tocar suelo? |
|---|---|
| 33 ms | sí — `-375`, `jumpsUsed = 1` |
| 84 ms | sí |
| 134 ms | sí ← límite |
| 200 ms | no (buffer caducado) |
| 334 ms | no |

El salto que sale del buffer es el **de suelo**, no gasta el doble salto, y
`jumpsUsed` queda en 1: la pulsación no se dispara dos veces.

**Dash (no roto):**

```
ms:    17    33    84   134   184 |  234   284   334
vx:   500   500   500   500   500 |  180    60     0
max:  500   500   500   500   500 |  220   220   220
drag:   0     0     0     0     0 | 2400  2400  2400
```

500 px/s sostenidos los 200 ms completos y ~104 px recorridos; al terminar,
vuelta al techo de 220 y frenado normal. Con la tecla de dirección **mantenida**:
`220 → 500 (dash) → 220`, sin frenazo ni cancelación.

**Respawn en pleno dash:** `loseLife()` durante el dash deja `vx = 0`,
`maxVelocity.x = 220`, `drag = 2400`, `acceleration = 0`, buffer limpio y gravedad
restaurada. El dash vuelve a funcionar después.

**Melee intacto:** tras todo lo anterior, `J` sigue disparando `p1-punch` con la
hitbox activa.

### Nivel 2 — mismas medidas

```
arranque : 0, 33, 67, 100, 133, 167, 200, 220 …     (idéntico a Nivel 1)
coyote   : 93 ms → salto de suelo | 96 ms → doble salto   (misma frontera)
buffer   : 33 y 84 ms → salta solo | 200 y 334 ms → no
dash     : 500 px/s con techo 500 → vuelta a 220 y drag 2400
```

### Cómo reproducirlo a mano

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000` y **forzar recarga sin caché (Ctrl+Shift+R)**: el
navegador cachea `src/config/constants.js` y sin eso Phaser aborta con
`does not provide an export named 'ACCELERATION'`.

1. **Inercia:** correr con `D` y soltar → el personaje se desliza un instante
   corto en vez de clavarse. Cambiar de dirección en carrera tarda un momento.
2. **Control aéreo:** saltar y soltar la dirección a media parábola → conserva el
   impulso. Intentar corregir en el aire → responde, pero más lento.
3. **Coyote time:** caminar hasta el borde de una plataforma, dejar que el
   personaje salga al vacío y pulsar salto **justo después** → sale el salto
   normal, no la caída.
4. **Jump buffering:** cayendo hacia una plataforma, pulsar salto un poco antes de
   tocarla → salta en el instante del contacto, sin tener que repetir la tecla.
5. **Dash:** `SHIFT` en carrera → debe seguir cruzando ~100 px de golpe. Es la
   comprobación de que el techo de velocidad no lo estrangula.
