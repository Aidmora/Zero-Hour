# CAMBIOS F2 — HUD legible: objetivo, progreso de fragmentos y Hora Cero

**Categoría de rúbrica:** UI/UX
**Hallazgos resueltos:** H07, H22, H10
**Rama:** `feat/fernando-hud-objetivo`

---

## 1. Qué estaba mal

- **H07 — el objetivo nunca se comunicaba.** Desde H09 el nivel se gana al
  reunir todos los fragmentos, pero el HUD no mostraba ni cuántos había ni
  cuántos llevabas. Las escenas ya emitían `fragments-changed`
  (`{ collected, total }`) y **nadie escuchaba ese evento**.
- **H10 — solo el Nivel 2 tenía cuenta atrás.** Toda la narrativa es una bomba
  con Hora Cero, pero el Nivel 1 no tenía reloj, y el del Nivel 2 se llamaba
  "Tiempo" y vivía a pelo dentro de la escena (`this.timeLeft = 60`).
- **H22 — HUD poco legible.** Cuatro textos pequeños apilados en la esquina
  superior izquierda, el timer sin cambio de color al agotarse, y vidas/dash
  dependiendo de emojis (`❤️`, `🖤`, `⏳`) que no todos los navegadores
  renderizan igual (o no renderizan).

## 2. Qué se implementó

### 2.a — `src/scenes/UIScene.js` (reescrito)

El HUD pasa de una columna de textos a tres bloques con panel propio. UIScene
corre en paralelo al nivel **con su propia cámara sin zoom**, así que todo se
posiciona en píxeles de pantalla; no hace falta compensar `1/zoom` como sí hacen
los overlays que viven dentro de la escena del nivel.

| Zona | Contenido |
|---|---|
| Arriba-izquierda | Corazones de vida, `SCORE`, barra de carga del dash |
| Arriba-centro | `H O R A   C E R O` + cuenta atrás en `m:ss`, grande |
| Arriba-derecha | `FRAGMENTOS DE CÓDIGO` + `X / N` + una marca por fragmento |
| Abajo-centro | Banner de objetivo, se disuelve a los 5,5 s |

**Progreso de fragmentos (H07).** UIScene escucha `fragments-changed` y pinta el
contador `X / N`, una fila de *pips* (una marca por pieza, que se enciende al
recogerla) y el chip como icono. El icono es **la misma textura** que el objeto
que se recoge en el nivel (`ensureFragmentTexture` / `FRAGMENT_TEXTURE` de
`systems/Fragments.js`): el HUD y el suelo tienen que leerse como la misma cosa.
Cada recogida da un golpe de escala al bloque; al completar (`X === N`) el
bloque cambia a verde, el rótulo pasa a `CÓDIGO COMPLETO` y el pop es mayor.

**Banner de objetivo (H07).** La primera vez que llega un total > 0, aparece
abajo `OBJETIVO: reúne los N fragmentos del código antes de la HORA CERO` y se
disuelve solo. Va abajo a propósito: el overlay de controles (A3) ocupa el
centro los primeros 4 s.

**Timer (H10 + H22).** Grande y centrado, formato `m:ss`, ámbar mientras hay
margen. Por debajo de `TIMER_WARNING_SECONDS` (10 s, ya existía en
`AudioManager.js`) el panel entero se pone rojo y parpadea, acompañando al
`sfx-timer-warning` que las escenas ya disparaban. `stopTimerAlarm()` se llama
en cada tick por encima del umbral: sin eso, al pasar de Nivel 1 a Nivel 2 el
panel heredaría el rojo parpadeante del nivel anterior.

**Sin emojis (H22).** Los corazones son una textura generada por código desde
una matriz de píxeles (`HEART_ART`, 8×7 escalada ×3 = 24×21 px) en dos
variantes, llena y vacía. Encajan con el pixel-art del juego —`pixelArt: true`
en `main.js` escala sin difuminar— y no dependen de la fuente del navegador.
El `⏳` del dash se sustituye por una **barra de recarga** que se rellena
durante `DASH_COOLDOWN_MS`: además de quitar el emoji, ahora se ve *cuánto*
falta, no solo que no está listo.

### 2.b — `src/config/constants.js`

```js
export const LEVEL1_TIME_SECONDS   = 90;
export const LEVEL2_TIME_SECONDS   = 60;
```

Nivel 1 es el primer contacto con controles y mapa: 90 s dan margen para
explorar sin que el reloj sea el enemigo principal. Nivel 2 mantiene los 60 s
con los que ya estaba tuneado — menos tiempo en la segunda mitad refuerza que la
Hora Cero está encima.

### 2.c — `src/scenes/Nivel1Scene.js`

- **Temporizador nuevo**, copia exacta del bloque del Nivel 2: `timeLeft`,
  `timerWarned`, `time.addEvent` de 1 s que decrementa, emite `time-changed`,
  dispara `sfx-timer-warning` una sola vez al cruzar el umbral y llama a
  `gameOver()` al llegar a 0. Verificado con `diff`: los dos bloques son
  idénticos carácter a carácter.
- **`syncHud()`**: reenvía score, vidas, dash, reloj y fragmentos cuando UIScene
  ya está montada. Sustituye a la llamada suelta a `emitFragmentProgress()` en
  el mismo punto. Hacía falta porque los emits del principio de `create()` se
  pierden: UIScene se lanza después y su `create()` no corre hasta el frame
  siguiente. Antes eso solo afectaba a datos con valor por defecto; con el
  reloj se habría notado (el timer aparecía en blanco hasta el primer tick).

No se tocó movimiento, dash, combo, fragmentos ni daño del Nivel 1.

### 2.d — `src/scenes/Nivel2Scene.js`

Solo lo necesario para que los dos niveles no diverjan:

- `this.timeLeft = LEVEL2_TIME_SECONDS` en lugar del `60` incrustado.
- El mismo `syncHud()` que el Nivel 1.
- Guarda `if (this.isEnding) return;` al principio del callback del timer, en
  ambos niveles: durante el fundido de salida (victoria o vuelta al menú) el
  reloj deja de contar. Sin él, un nivel ya ganado podía sonar la alarma o
  llamar a `gameOver()` a mitad de la transición.

### 2.e — Ajuste de tamaño tras probarlo en pantalla

La primera versión del HUD ocupaba una franja de 122 px (el 25 % del alto de la
pantalla) y tapaba demasiado juego, sobre todo con la cámara cercana de F1.a.
Se redujo todo el bloque a ~70 %: la franja pasa a **74 px (15 %)**.

| Elemento | Antes | Ahora |
|---|---|---|
| Panel de estado | 216×112 | 168×74 |
| Panel del timer | 260×88 | 190×64 |
| Panel de fragmentos | 268×84 | 200×64 |
| Corazones | 24×21 (píxel ×3) | 16×14 (píxel ×2) |
| Cifra del timer | 40 px | 28 px |
| Contador de fragmentos | 30 px | 22 px |

La jerarquía se mantiene intacta: el timer sigue siendo el dato más grande y el
contador de fragmentos el segundo. Comprobado que ningún texto desborda su panel
con los valores máximos previsibles (`SCORE 1250`, `FRAGMENTOS DE CÓDIGO`).

## 3. Contrato de eventos del HUD

`UIScene` escucha del registry, y ya no se pierde ninguno al arrancar:

| Evento | Payload | Emisor |
|---|---|---|
| `score-changed` | `number` | ambos niveles |
| `lives-changed` | `number` | ambos niveles |
| `dash-ready` | `boolean` | ambos niveles |
| `time-changed` | `number` (segundos) | **ambos niveles** (antes solo N2) |
| `fragments-changed` | `{ collected, total }` | ambos niveles (**nuevo oyente**) |

El `total` de fragmentos lo decide `spawnFragments()` con los huecos realmente
alcanzables del mapa, así que **no** se asume `FRAGMENTS_PER_LEVEL`: los pips se
construyen cuando llega el total real y se reconstruyen si cambia.

## 4. Verificación

Comprobado estáticamente (`node --check` en los cuatro archivos, `diff` de los
bloques de timer). **Pendiente de probar en navegador** — el entorno donde se
implementó no tiene navegador, y Phaser se carga por CDN:

```bash
python -m http.server 8000   # y Ctrl+Shift+R en el navegador
```

Lista de comprobación:

- [ ] El HUD muestra `FRAGMENTOS 0 / N` al entrar y sube al recoger cada pieza
- [ ] Al recoger la última: rótulo `CÓDIGO COMPLETO` en verde antes de la
      transición de nivel
- [ ] Hay cuenta atrás visible en **ambos** niveles (1:30 en N1, 1:00 en N2)
- [ ] Bajo 10 s el panel del timer se pone rojo y parpadea, con su SFX
- [ ] Llegar a 0 da Game Over en ambos niveles
- [ ] Los corazones se ven (no son emojis) y se vacían al recibir daño
- [ ] La barra de dash se rellena durante el cooldown
- [ ] El banner de objetivo aparece abajo y se disuelve solo
- [ ] Sin errores de consola

## 5. Notas

- El prompt de la tarea remite a `docs/ESTADO_ACTUAL.md`, que **no existe** en el
  repositorio. Se trabajó sobre el código real y `docs/INFORME_PLAYTESTING.md`.
- `TIMER_WARNING_SECONDS` sigue viviendo en `systems/AudioManager.js`; UIScene lo
  importa de ahí en vez de duplicar el número. No se modificó el sistema de
  audio.
- F1.a (unificar el zoom de cámara) todavía no está aplicado: el Nivel 1 sigue a
  zoom 1.0. El HUD es indiferente a eso — UIScene tiene su propia cámara — así
  que ambas fases se pueden mergear en cualquier orden.
