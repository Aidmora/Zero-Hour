# Mejora H21 — Feedback visual al recibir daño (shake de cámara + destello rojo)

Resuelve el hallazgo **H21** del `INFORME_PLAYTESTING.md`: *"sin feedback de daño
en pantalla: solo parpadeo de alpha del sprite; sin flash rojo/vignette ni shake
de cámara"*.

---

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/config/constants.js` | 7 constantes nuevas (§2). |
| `src/scenes/Nivel1Scene.js` | Nuevos `createDamageFlash()` y `damageFeedback(intensity)`; llamada a `createDamageFlash()` en `create()` tras configurar la cámara; llamada a `damageFeedback()` en `takeDamageFromEnemy()` y en `loseLife()`. |
| `src/scenes/Nivel2Scene.js` | **Exactamente los mismos cambios**. |

No se tocó `UIScene.js` (el feedback de daño en el HUD —vignette, corazones— es
de otro integrante), ni `src/entities/`, ni los mapas, ni `BootScene`, ni el
mapeo de teclas, ni la lógica de movimiento/dash/combo/fragmentos. **Sin
dependencias nuevas**: el destello es un `Phaser.GameObjects.Rectangle`.

El SFX de daño (`sfx-player-hurt`) **ya estaba conectado** en ambos caminos por
la mejora A2; no se ha duplicado ni tocado.

---

## 2. Valores finales y por qué

| Constante | Valor | Por qué ese valor |
|---|---|---|
| `DAMAGE_SHAKE_MS` | **180** | ≈ 11 frames a 60 fps. Por debajo de ~120 ms el golpe apenas se lee como impacto; por encima de ~250 ms la pantalla sigue temblando cuando ya estás intentando recolocarte tras el knockback, y estorba. 180 cabe de sobra dentro de los 1500 ms de invulnerabilidad, así que dos sacudidas nunca se solapan. |
| `DAMAGE_SHAKE_INTENSITY` | **0.010** | Fracción del ancho de pantalla: 0.010 × 1280 = **±13 px** de desplazamiento (medido: ±12 px en X, ±5 px en Y). Se lee como impacto seco sin romper la lectura de plataformas ni marear. Con 0.005 el golpe pasaba desapercibido; con 0.020 (±26 px) el suelo deja de ser una referencia estable durante el knockback, que es justo cuando hace falta. |
| `DAMAGE_SHAKE_INTENSITY_FALL` | **0.015** | ×1.5 la anterior → **±19 px**. Caer al vacío cuesta una vida *y* todo el avance hasta el punto de reaparición: el golpe más fuerte subraya que fue el error más caro. Sigue por debajo del umbral de "mareo". |
| `DAMAGE_FLASH_ALPHA` | **0.30** | Pico del destello. Tiñe la escena entera de rojo dejándola perfectamente legible (ver captura de §5): a 0.5 los enemigos se pierden dentro del rojo justo en el frame en el que hay que reaccionar. Es un acento, no una pantalla roja. |
| `DAMAGE_FLASH_IN_MS` | **60** | Subida. Cuatro frames: entra prácticamente de golpe, en sincronía con el arranque del shake. |
| `DAMAGE_FLASH_OUT_MS` | **140** | Bajada, más larga que la subida a propósito (60 + 140 = **200 ms** en total): el golpe entra seco y se disuelve, en vez de parpadear simétrico. Termina ~20 ms después del shake, así que los dos efectos se apagan casi a la vez. |
| `DAMAGE_FLASH_COLOR` | **0xff0000** | Rojo puro. La paleta del juego es violeta/cian, así que el rojo no se confunde con nada del fondo. |

---

## 3. Decisiones de implementación

### 3.a — Un solo método para los dos caminos de daño

`damageFeedback(intensity)` agrupa shake + destello y se llama desde los dos
sitios que quitan vida:

- `takeDamageFromEnemy()` → `damageFeedback()` (0.010), **antes** de activar la
  invulnerabilidad y el tween de parpadeo, para que el efecto arranque en el
  mismo frame del golpe.
- `loseLife()` → `damageFeedback(DAMAGE_SHAKE_INTENSITY_FALL)` (0.015), dentro
  de la rama "aún queda vida", antes de la reposición.

Ninguno de los dos toca la lógica previa: invulnerabilidad, knockback,
reposición y el reset de dash/combo/velocidad/buffer de E1 quedan exactamente
como estaban (verificado en §5).

### 3.b — Rectángulo con tween, no `cameras.main.flash()`

Se descartó `flash(duration, r, g, b)` porque arranca en **alpha 1**: el primer
frame es rojo opaco a pantalla completa, que es demasiado agresivo para un
acento y tapa la acción justo en el peor momento. El rectángulo permite fijar el
pico en 0.30 y darle una curva asimétrica (subida rápida, bajada más lenta).

El rectángulo se crea **una sola vez** en `create()` y se reutiliza en cada
golpe; `damageFeedback()` mata el tween anterior antes de lanzar el nuevo, de
modo que dos daños seguidos no acumulan alpha.

Está anclado al centro de la cámara con `setScrollFactor(0)` y escalado por
`1 / zoom` — el mismo truco que ya usaba `LevelIntroOverlay` — de modo que cubre
exactamente 1280×480 tanto en Nivel 1 (zoom 1) como en Nivel 2 (zoom 1.5).
Profundidad **900**: por encima del mundo y por debajo del overlay de controles
(1000), que así no se tiñe.

**El HUD no se ve afectado en absoluto**: `UIScene` corre en paralelo con su
propia cámara, así que ni el rectángulo ni el shake la alcanzan. Se ve en la
captura de §5: la escena está roja y `Vidas / Score / DASH / Tiempo` conservan
sus colores y su posición.

### 3.c — El shake se compensa por `zoom²` (medido, no supuesto)

Nivel 2 usa `setZoom(1.5)`. Con la misma intensidad, su sacudida resultaba
**mucho más fuerte** que la de Nivel 1, porque Phaser aplica el zoom **dos
veces**: una al generar el desplazamiento del efecto y otra al trasladar la
matriz de la cámara, que ya está escalada. Medido en el navegador:

| `intensity` | Nivel 1 (zoom 1) | Nivel 2 (zoom 1.5) sin compensar |
|---|---|---|
| 0.00667 | ±9 px de pantalla | ±19 px |
| 0.010 | ±13 px | ±29 px |
| 0.015 | ±19 px | ±43 px |

(La relación `desplazamiento_pantalla = intensity × 1280 × zoom²` se confirmó
comparando `camera.matrix.tx` frame a frame: el ratio entre traslación de la
matriz y offset del efecto es exactamente el zoom.)

Por eso ambas escenas llaman:

```js
cam.shake(DAMAGE_SHAKE_MS, intensity / (cam.zoom * cam.zoom));
```

Así la constante significa siempre lo mismo —**fracción del ancho de pantalla**—
y los dos niveles tiemblan igual (§5). Si mañana se cambia el zoom de cualquiera
de los dos niveles, el shake no hay que retocarlo.

### 3.d — El shake no interfiere con `startFollow`

`Camera.shake()` **no toca** `scrollX/scrollY`, los `bounds` ni el objetivo del
`startFollow`: solo desplaza la matriz de render mientras dura, y al terminar
deja el offset en 0. Verificado en §5.

### 3.e — Muerte (vida ≤ 0): sin feedback, a propósito

`takeDamageFromEnemy()` y `loseLife()` llaman a `gameOver()` cuando la vida
llega a 0, y `gameOver()` hace `scene.start('GameOverScene')` **de inmediato**:
la escena del nivel —y con ella su cámara y su rectángulo— desaparece en ese
mismo frame, así que un shake o un destello ahí no llegaría a verse ni un frame.
Retrasar el `gameOver()` para que diera tiempo sí se vería, pero eso es cambiar
la lógica de fin de partida, que queda fuera de esta mejora. La transición ya la
cubre `GameOverScene` con su propio fondo rojo (`#3d0000`).

---

## 4. Paridad entre escenas

`createDamageFlash()` y `damageFeedback()` son **idénticos carácter a carácter**
en las dos escenas; las únicas diferencias en el diff son los comentarios que
citan el zoom propio de cada nivel. Los puntos de llamada también son los
mismos (`create()` tras la cámara, `takeDamageFromEnemy()`, `loseLife()`).

---

## 5. Verificación hecha

`python -m http.server 8000` + Chrome con recarga forzada (Ctrl+Shift+R).
**Sin errores ni warnings en consola** en todo el recorrido (solo el banner de
Phaser 3.80.1). Como la pestaña de pruebas quedaba oculta —y con ella el
`requestAnimationFrame` congelado—, se avanzó el bucle de Phaser a mano desde
consola (`game.loop.step(t)` con dt fijo de 16.7 ms) para poder medir frame a
frame, igual que en E1.

### Shake: los dos niveles, los dos caminos de daño

Desplazamiento máximo **en píxeles de pantalla** (medido sobre
`camera.matrix.tx/ty`) y duración del efecto:

| | Nivel 1 (zoom 1) | Nivel 2 (zoom 1.5) |
|---|---|---|
| Golpe de enemigo (0.010) | ±12 px X · ±5 px Y · 180 ms | ±12 px X · ±4.5 px Y · 180 ms |
| Caída al vacío (0.015) | ±19 px X · ±7 px Y · 180 ms | ±19.5 px X · ±7.5 px Y · 180 ms |

Los dos niveles tiemblan lo mismo, y la caída se distingue claramente del golpe.

Traza frame a frame de un golpe de enemigo (Nivel 1), con el offset del efecto:

```
ms:     17    33    50    67    83   100   117   133   150   167  | 183   200
shake:   1     1     1     1     1     1     1     1     1     1  |   0     0
offset: 10     0    -3     5    -5    -1   -11    -6   -11     5  |   0     0
```

El efecto se apaga a los 180 ms y **el offset vuelve a 0**, sin residuo.

### La cámara sigue al jugador después del shake

Tras cada sacudida: `camera._follow === player` → **true**, `_offsetX` → **0**,
`zoom` intacto. Comprobación de que el seguimiento sigue vivo (Nivel 2, que sí
tiene scroll horizontal):

```
scrollX antes del daño : 27
scrollX durante shake  : 27 → 26   (el shake no lo mueve)
scrollX tras mover al jugador a x=1400 : 213   (la cámara le sigue con normalidad)
```

### Destello rojo

Con `requestAnimationFrame` real, muestreando el color medio del canvas:

```
sin destello        rgb(71, 55, 89)   ← paleta violeta del nivel (azul > rojo)
alpha ≈ 0.20        rgb(98, 50, 81)   ← rojo por delante, escena aún legible
alpha → 0           vuelta a rgb(71, 55, 89)
```

Congelando el destello en su pico (alpha 0.30) en Nivel 2, con el zoom 1.5
activo, se comprueba en pantalla que el tinte cubre el canvas de borde a borde,
que la acción (plataformas, enemigos, jugador) se sigue leyendo sin esfuerzo, y
que el HUD de `UIScene` y el overlay de controles quedan **sin teñir**.

### Colisión real con enemigo (end-to-end)

Colocando al jugador sobre un `PatrolEnemy` vivo y dejando correr la física
—sin llamar a nada a mano— el overlap dispara todo el encadenado:

```
f0  lives 3 → 2   shake=1   knockback vx=200 vy=-250   invulnerable=true
f3  alpha=0.010   (destello subiendo)
f4  alpha=0.035
...
```

El tween de parpadeo del sprite sigue ahí (1 tween activo sobre el jugador) y el
knockback conserva sus valores de `constants.js`.

### `loseLife()` (caída al vacío): la lógica de E1 sigue intacta

Estado del jugador tras `loseLife()` con el feedback ya integrado:

| Campo | Valor tras el respawn |
|---|---|
| `lives` | 3 → 2 |
| posición | (80, 330) — el punto de reaparición de Nivel 1 |
| `maxVelocity.x` | 220 |
| `drag.x` | 380 (aire, correcto: reaparece cayendo) |
| `allowGravity` | true |
| tinte del dash | limpio |
| `canDash` / `isDashing` | true / false |
| `comboStep` | 0 |

Es decir: el arreglo de E1 (reset de dash, combo, techo de velocidad y buffer de
salto al morir) no se ha visto afectado.

### Cómo reproducirlo a mano

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000` y **forzar recarga sin caché (Ctrl+Shift+R)**: el
navegador cachea `src/config/constants.js` y sin eso Phaser aborta con
`does not provide an export named 'DAMAGE_SHAKE_MS'`.

1. **Golpe de enemigo:** caminar contra cualquier enemigo → sacudida corta +
   destello rojo, además del parpadeo del sprite que ya existía.
2. **Caída al vacío:** dejarse caer por un hueco (o pulsar `L`, la tecla debug de
   perder vida) → mismo efecto, notablemente más fuerte.
3. **Cámara:** justo después del golpe, correr con `D` → la cámara debe seguir al
   jugador con la misma suavidad de siempre, sin quedarse descentrada.
4. **HUD:** mirar la esquina superior izquierda durante el golpe → ni se sacude
   ni se tiñe de rojo.
5. **Los dos niveles:** repetir en Nivel 2; la sacudida debe sentirse igual que
   en Nivel 1 pese al zoom 1.5.
