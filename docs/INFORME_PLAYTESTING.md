# INFORME DE PLAYTESTING Y AUDITORÍA TÉCNICA — *ZERO HOUR*

**Proyecto:** ZERO HOUR — plataformero 2D (Phaser 3.80.1 + Tiled 1.12)
**Fase:** Auditoría / QA (solo análisis, sin implementación)
**Fecha:** 2026-07-23
**Rama auditada:** `docs/informe-playtesting`

---

## 1. Resumen del estado actual del proyecto

ZERO HOUR es un plataformero 2D funcional y arrancable. El servidor local
(`python -m http.server`) levanta sin errores y **todos los assets referenciados
por el código responden HTTP 200** (no hay 404). La arquitectura por escenas está
limpia (`BootScene → MenuScene → Nivel1/Nivel2 + UIScene → GameOver/Créditos`),
usa ES Modules y Arcade Physics, y la mayoría de los sistemas del GDD existen en
código: doble salto, dash, combo melee, IA de dos enemigos con respawn, HUD por
registry, coleccionables, vidas con invulnerabilidad/knockback y time-attack en
Nivel 2.

Sin embargo, la brecha entre lo que el GDD/narrativa promete y lo que el jugador
percibe es amplia. Los problemas de mayor peso no son bugs de crash sino de
**game feel, comunicación y coherencia audiovisual**:

- **Ausencia casi total de SFX** (solo 2 audios: música y game over). Ninguna
  acción de gameplay tiene retroalimentación sonora.
- **Los dos niveles se ven idénticos**: ambos cargan el mismo tileset
  (`background.png`) y el mismo fondo (`background.jpg`); el arte industrial
  (`background-industrial.png`) existe pero nunca se usa.
- **Enemigos = cuadrados de colores generados por código**, rompiendo la estética
  pixel-art del jugador.
- **La narrativa (bomba / Hora Cero / fragmentos de código) no llega al jugador**:
  no hay intro, no hay temporizador en Nivel 1, y los coleccionables son estrellas
  doradas genéricas, no "fragmentos de código".
- **Esquema de control inconsistente y mal distribuido**: la BARRA ESPACIADORA
  hace *ataque* en Nivel 1 pero *dash* en Nivel 2, el salto está en `W`, y el dash
  de Nivel 1 está en `SHIFT` (tecla lejana).
- **Bug funcional grave**: en Nivel 2, Thor **nunca puede atacar** — `doMeleeAttack()`
  jamás se invoca porque SPACE quedó reasignado al dash. Todas sus animaciones de
  combate quedan muertas.
- **Sin game feel moderno**: no hay coyote time, jump buffering, aceleración/fricción,
  animación de frenado ni de aterrizaje. Además la altura de salto **difiere entre
  niveles** (Nivel 1 aplica un factor ×0.75 que Nivel 2 no aplica).

### Inventario: qué existe realmente vs. qué dice el GDD

| Sistema (GDD) | Estado real en código | Nota |
|---|---|---|
| Doble salto | ✅ `handleJump()` (MAX_JUMPS=2) | Altura ×0.75 en N1, plena en N2 → inconsistente |
| Dash (500px/s, 200ms, cd 600ms) | ⚠️ Existe pero `DASH_VELOCITY=600` (no 500) | cd 600 y dur 200 sí coinciden |
| Combo melee punch-punch-kick | ⚠️ Existe en N1; **inalcanzable en N2** | N2 no llama `doMeleeAttack()` |
| Thor: disparo de rayos 8 dir + pool de balas | ❌ **No existe** | No hay proyectiles ni pool en el repo |
| Plataformas móviles (Nivel 2) | ❌ **No existen** | El mapa es estático |
| Time-attack 60–90s con bonus +5/s | ⚠️ Parcial: timer de 60s fijo, **sin bonus +5/s** | Solo N2; N1 sin timer |
| 3 vidas + invuln + knockback | ✅ Implementado | |
| Score (col +10, patrol +25, chaser +75) | ⚠️ Coleccionable = **+10** (SCORE_PER_COLLECTIBLE), enemigos +25/+75 ✅ | GDD dice +10 col; OK |
| IA patrullero (1HP) / perseguidor (3HP), respawn 5s | ✅ Implementado | Sprites = cuadrados generados |
| HUD por registry | ✅ UIScene | Sin objetivo ni tutorial |
| Dos héroes (Monje Chi / Thor) | ⚠️ Sprites presentes | Nunca nombrados ni presentados |
| Narrativa (bomba/cuenta atrás/código) | ❌ **No comunicada** | Sin intro; col = estrellas |

---

## 2. Verificación de arranque

- `python -m http.server 8000` → sirve el proyecto sin error.
- HTTP 200 confirmado para: `index.html`, `src/main.js`, `bgm-loop.mp3`,
  `game-over.mp3`, `nivel-1-new.json`, `nivel-2.json`, `background.png`,
  `background-industrial.png`, `background.jpg`, `player-1.png` y los 13
  spritesheets de `player-2/`.
- **Sin 404.** El único asset "huérfano" es `background-industrial.png`: existe y
  se sirve, pero **ningún `this.load` lo referencia** (ver §4.a).
- Phaser 3.80.1 se carga por CDN (`cdn.jsdelivr.net`) → requiere conexión a
  internet para arrancar (riesgo si se demuestra offline).

---

## 3. Tabla de hallazgos

Severidad: **Alta** (rompe experiencia/objetivo) · **Media** (degrada notablemente) ·
**Baja** (pulido). Esfuerzo: **S** (<1h) · **M** (media jornada) · **L** (≥1 jornada).

| ID | Categoría | Problema | Archivo:línea | Sev | Esf | Solución técnica |
|----|-----------|----------|---------------|-----|-----|------------------|
| H01 | Jugabilidad | **SPACE = ataque en N1 pero dash en N2**; dash de N1 en `SHIFT` (lejano); salto en `W`. Distribución incoherente entre niveles. | `Nivel1Scene.js:174,175,192,196`; `Nivel2Scene.js:176,177,194` | Alta | S | Unificar mapeo en constantes: salto→`SPACE`, ataque→`J`/click izq, dash→`SHIFT`/`K`. Mismo esquema en ambas escenas. |
| H02 | Jugabilidad/Animación | **Thor no puede atacar**: `doMeleeAttack()` nunca se llama en N2 (SPACE ocupado por dash). Animaciones `p2-punch`/`p2-kick` quedan muertas. | `Nivel2Scene.js:194,255` | Alta | S | Asignar el ataque a una tecla propia y llamar `doMeleeAttack(time)` en `update()`, igual que N1. |
| H03 | Diseño niveles/UX | **Zoom distinto entre niveles**: N1 sin `setZoom` (=1.0), N2 con `setZoom(1.5)`. Cambio brusco de perspectiva y de tamaño de personaje. | `Nivel1Scene.js:164`; `Nivel2Scene.js:167` | Alta | S | Fijar el mismo zoom en ambos (o `1.0` en ambos). Considerar mapas más grandes si se quiere scroll. |
| H04 | SFX | **Casi ningún SFX.** Solo `bgm` y `gameover`. Salto, dash, melee, recoger, golpe/muerte enemigo, daño, victoria, botones: sin sonido. | `BootScene.js:12,13` (solo 2 audios) | Alta | M | Cargar y disparar SFX en cada acción (ver §4.d para la lista). Kenney/JSFXR sirven. |
| H05 | Animación/Arte | **Enemigos = cuadrados de colores** generados con `graphics`, chocan con el pixel-art del jugador. | `BootScene.js:52-77` | Alta | M | Sustituir por spritesheets pixel-art con anim. de caminar/morir; cargar como los de player. |
| H06 | Arte/Niveles | **Ambos niveles usan el mismo tileset** (`background.png`) y el mismo fondo → se ven idénticos. `background-industrial.png` nunca se carga. | `BootScene.js:17,18,19` | Alta | M | Cargar `background-industrial.png` como `tiles-nivel2` y **remapear** `nivel-2.json` a ese atlas (los GIDs no calzan por dimensiones distintas). |
| H07 | UI/UX | **Objetivo del nivel nunca se comunica**: se gana con `score>=300` (`targetScore`) pero no se muestra ni progreso ni meta. | `Nivel1Scene.js:37,458`; `Nivel2Scene.js:37,463` | Alta | S | Banner inicial con objetivo + contador de progreso en el HUD ("Fragmentos: X/…" o "Meta: 300"). |
| H08 | Narrativa/UX | **Sin introducción**: `BootScene` arranca directo en `MenuScene`. La bomba/Hora Cero nunca se cuenta. | `BootScene.js:113` | Alta | M | Insertar `IntroScene` (cutscene de texto) entre Boot y Menu, o botón "Historia". |
| H09 | Narrativa/UX | **Coleccionables genéricos**: estrellas doradas, no "fragmentos del código de desactivación". Respawnean infinitamente → no hay sensación de "juntar el código". | `BootScene.js:94-111`; `Nivel1Scene.js:296-322` | Media | M | Cambiar sprite a "chip/fragmento", set finito de N piezas, HUD "Fragmentos X/N", ganar al reunir todos. |
| H10 | Narrativa/UI | **N1 sin temporizador pese a la bomba**; N2 lo llama "Tiempo", no "Hora Cero"/bomba. | `Nivel1Scene.js` (sin timer); `Nivel2Scene.js:38-56` | Media | S | Añadir cuenta regresiva coherente en ambos niveles con estética de bomba; renombrar HUD. |
| H11 | Jugabilidad | **Sin coyote time ni jump buffering**: salto solo si `JustDown(up)` y `onGround` exacto. Salidas de plataforma se sienten injustas. | `Nivel1Scene.js:239-255`; `Nivel2Scene.js:237-253` | Media | M | Guardar `lastGroundedTime`/`jumpBufferedAt` (~100ms) y permitir salto dentro de esas ventanas. |
| H12 | Jugabilidad | **Movimiento rígido**: `setVelocityX(dir*SPEED)` sin aceleración ni fricción; parada instantánea. Sin sensación de peso. | `Nivel1Scene.js:223`; `Nivel2Scene.js:221` | Media | M | Interpolar velocidad (aceleración/drag) o usar `body.setDragX` + `setAccelerationX`. |
| H13 | Jugabilidad | **Altura de salto distinta entre niveles**: N1 aplica `×0.75`, N2 no. Feel inconsistente. | `Nivel1Scene.js:247,249` vs `Nivel2Scene.js:245,247` | Media | S | Unificar: mover el factor a constante única y aplicarlo (o no) en ambos. |
| H14 | Animación | **Sin animación de frenado (skid) ni de aterrizaje.** Transición aire→suelo brusca. | `Nivel1Scene.js:233-237`; `Nivel2Scene.js:231-235` | Media | M | Detectar cambio de dirección/toque de suelo y reproducir frames de skid/land. |
| H15 | Animación | **`p2-fall` es un solo frame estático** (frame 3 de jump). Caída congelada. | `Nivel2Scene.js:152` | Baja | S | Definir 2-3 frames de caída o usar `AirSwordSlash`/frames de descenso. |
| H16 | Animación/Arte | **7 spritesheets de Thor cargados y nunca mostrados** (crouch, climb, attack-up, attack-crouch, crouch-slash, air-slash, jump-attack). Peso muerto. | `BootScene.js:34-41` | Baja | S | Eliminar cargas no usadas o darles animación/estado real (ver §4.b). |
| H17 | Diseño niveles | **Caídas al vacío sin aviso visual**: los huecos del suelo matan al caer (`y>height-40`) sin señalización (spikes, borde, marca). | `Nivel1Scene.js:204-206`; `Nivel2Scene.js:202-204` | Media | M | Señalizar bordes/pozos con tiles de peligro; o límites que empujen; feedback de muerte por caída. |
| H18 | Diseño niveles | **Enemigos aparecen en el aire**: p.ej. patrullero en `(800,35)` con bounds `800–1020` cae desde arriba del mapa. Spawns sin relación clara con plataformas. | `Nivel1Scene.js:109`; `Nivel2Scene.js:123,124` | Baja | S | Ajustar coords de spawn a la superficie real de cada plataforma. |
| H19 | Música | **Cortes abruptos sin fade**: `stopByKey('bgm')` y `play('gameover')` sin fade-in/out; retry reinicia música de golpe. | `GameOverScene.js:16,17,43-46`; `MenuScene.js:11-14` | Media | S | Usar `this.sound … fade` / tween de `volume` (Phaser `Sound.fadeIn/fadeOut`) en transiciones. |
| H20 | Música | **Misma pista en ambos niveles**; ninguna música diferencia Almacén vs. Fortaleza ni crea tensión de "cuenta atrás". | `MenuScene.js:12-14` (bgm global) | Baja | M | Pista por nivel + capa de tensión que suba al bajar el timer. |
| H21 | UI/UX | **Sin feedback de daño en pantalla**: solo parpadeo de alpha del sprite; sin flash rojo/vignette ni shake de cámara. | `Nivel1Scene.js:409-421`; `Nivel2Scene.js:414-426` | Media | S | `cameras.main.shake()` + flash rojo al recibir golpe. |
| H22 | UI/UX | **HUD poco legible/prominente**: contador pequeño arriba-izq, sin cambio de color al agotarse; emojis `⏳`/`❤️` dependen de fuente del navegador. | `UIScene.js:24-37,77-79` | Baja | S | Timer central grande, rojo parpadeante bajo umbral; reemplazar emojis por sprites de corazón. |
| H23 | UI/UX | **Sin tutorial de controles.** El jugador no sabe teclas ni objetivo al entrar. | `Nivel1Scene.js` / `Nivel2Scene.js` (create) | Media | S | Overlay de controles al inicio del nivel (auto-oculta a los pocos seg.). |
| H24 | Jugabilidad | **Teclas debug activas en build**: `L` (perder vida), `K` (matar enemigo), `M` (menú) sin flag. Riesgo de trampa/accidente en demo. | `Nivel1Scene.js:180-185`; `Nivel2Scene.js:182-187` | Baja | S | Envolver en `if (DEBUG)` o quitar antes de entregar. |
| H25 | UX | **"Salir" llama `window.close()`** (bloqueado en navegador) y luego `scene.restart()` → comportamiento confuso. | `MenuScene.js:70-73` | Baja | S | Reemplazar por pantalla de despedida o quitar el botón en web. |
| H26 | Jugabilidad | **Constante de dash divergente del GDD**: `DASH_VELOCITY=600` vs. 500px/s documentado. | `constants.js:13` | Baja | S | Alinear valor a diseño (500) o actualizar el GDD. |

---

## 4. Puntos de revisión estática (verificados en código)

### 4.a — Tilesets: ambos niveles cargan `background.png`; `background-industrial.png` nunca se usa

**Confirmado.** En `BootScene.js:17-18`:

```js
this.load.image('tiles-nivel1', 'assets/tilesets/background.png');
this.load.image('tiles-nivel2', 'assets/tilesets/background.png');  // ← mismo archivo
```

`assets/tilesets/background-industrial.png` existe (632×258 px) y se sirve por
HTTP, pero **ningún `this.load` lo referencia**. Además, ambas escenas hacen
`this.mapa.addTilesetImage('background', 'tiles-nivelX')` y **ambos mapas
(`nivel-1-new.json`, `nivel-2.json`) declaran internamente el mismo tileset
`background` apuntando a `background.png`**. A esto se suma que ambos niveles
pintan el mismo fondo `bg-real` (`background.jpg`).

**Conclusión:** sí, esto explica que ambos niveles se vean visualmente idénticos.
El Nivel 2 (Fortaleza Industrial) **debería** usar `background-industrial.png`.
**No es un fix de una línea**: `background.png` es 306×306 y el industrial 632×258,
por lo que la rejilla de tiles y los GIDs no coinciden; cargar el industrial en
`tiles-nivel2` sin más pintaría tiles equivocados. Solución correcta:
1) cargar `background-industrial.png` como `tiles-nivel2`, y
2) **remapear `nivel-2.json` en Tiled** contra ese atlas (recolocar tiles con los
   GIDs del nuevo tileset), o regenerar el mapa. Solo entonces el Nivel 2 se verá
   distinto.

### 4.b — Spritesheets de Thor: cuáles se animan/usan y cuáles son peso muerto

`BootScene.js:28-42` carga **13 spritesheets** de player-2. En `Nivel2Scene.js:142-162`
se registran 7 animaciones. Cruce real:

| Spritesheet cargado (key) | ¿Animación registrada? | ¿Se muestra en juego? |
|---|---|---|
| `p2-idle` | ✅ `p2-idle` | ✅ (idle) |
| `p2-run` | ✅ `p2-walk` | ✅ (caminar) |
| `p2-jump` | ✅ `p2-jump` y `p2-fall` | ✅ (salto/caída) |
| `p2-hurt` | ✅ `p2-hurt` | ✅ (daño) |
| `p2-attack-side` | ✅ `p2-punch` | ❌ **nunca** (ataque no se dispara, H02) |
| `p2-sword-slash` | ✅ `p2-kick` | ❌ **nunca** (H02) |
| `p2-air-slash` | ❌ | ❌ |
| `p2-jump-attack` | ❌ | ❌ |
| `p2-attack-up` | ❌ | ❌ |
| `p2-attack-crouch` | ❌ | ❌ |
| `p2-crouch-slash` | ❌ | ❌ |
| `p2-crouch` | ❌ | ❌ |
| `p2-climb` | ❌ | ❌ |

**Resultado:** solo 4 estados de Thor son realmente visibles (idle, run, jump/fall,
hurt). `attack-side` y `sword-slash` tienen animación pero **jamás se ven** por el
bug H02. Los **7 restantes** (`air-slash`, `jump-attack`, `attack-up`,
`attack-crouch`, `crouch-slash`, `crouch`, `climb`) se descargan de red pero no
tienen animación ni uso → peso muerto (recomendación H16).

### 4.c — Enemigos generados como cuadrados de colores (coherencia artística)

**Confirmado.** `BootScene.js:52-77` genera `enemy-patrol` (cuadrado rojo 32×32 con
"ojos") y `enemy-chaser` (cuadrado morado 40×40) con `this.make.graphics`. El jugador
es pixel-art (`player-1.png`, sprites Kenney). El choque estético es evidente: los
enemigos parecen *placeholders* de prototipo dentro de un juego con arte real, y
además carecen de animación de caminar/morir (solo tinte + tween de escala). Impacto
alto en percepción de acabado. **Recomendación (H05):** spritesheets pixel-art
coherentes con el jugador.

### 4.d — Solo 2 audios: acciones sin SFX

Audios cargados (`BootScene.js:12-13`): `bgm` (`bgm-loop.mp3`) y `gameover`
(`game-over.mp3`). **Todo lo demás es silencioso.** Acciones de juego sin SFX:

- Salto y **doble salto** (solo partículas, sin sonido).
- **Dash** (solo tinte + afterimages).
- **Combo melee** punch/punch/kick (impacto y whoosh).
- **Recoger coleccionable** (estrella).
- **Golpear enemigo** / **muerte de enemigo** (tween sin sonido).
- **Recibir daño / knockback** del jugador.
- **Aterrizaje** y pasos (footsteps).
- **Tic del temporizador** y **alerta de tiempo bajo** (Nivel 2).
- **Victoria de nivel** / cambio de escena.
- **Hover/click de botones** (menú, game over, créditos).
- **Aparición/respawn** de enemigos.

Es la carencia de feedback más transversal del proyecto (H04).

---

## 5. Los 4 hallazgos confirmados por el equipo (playtesting)

### (a) No hay introducción narrativa — arranca directo en el menú
**Confirmado.** `BootScene.create()` termina con `this.scene.start('MenuScene')`
(`BootScene.js:113`). No existe ninguna `IntroScene`/`StoryScene` en `src/scenes/`
ni en el arreglo `scene:[…]` de `main.js:28`. El jugador nunca conoce la premisa de
la bomba/Hora Cero.
**Solución técnica:** crear `IntroScene extends Phaser.Scene`, añadirla a `main.js`
antes de `MenuScene`, y cambiar `BootScene` para `this.scene.start('IntroScene')`.
La escena muestra 2-3 láminas de texto (bomba, Hora Cero, dos héroes, fragmentos del
código) con fade y opción "Saltar". Alternativa mínima: bloque de texto animado antes
de los botones del menú.

### (b) La cámara del Nivel 2 está más cerca que la del Nivel 1
**Confirmado.** Nivel 1 nunca llama `setZoom` → zoom por defecto **1.0**
(`Nivel1Scene.js:164-165`). Nivel 2 hace `this.cameras.main.setZoom(1.5)`
(`Nivel2Scene.js:167`). Como ambos mapas miden 40×15 tiles = 1280×480 (exactamente
el viewport), en N1 la cámara no hace scroll y muestra todo; en N2 el 1.5× recorta y
sigue al jugador → salto de perspectiva y de escala del personaje al cambiar de nivel.
**Solución técnica:** unificar el zoom (lo más simple: quitar el `setZoom(1.5)` de N2,
o aplicar el mismo valor en ambos, idealmente centralizado en una constante
`CAMERA_ZOOM`). Si se desea un zoom mayor con scroll, agrandar los mapas para que
excedan el viewport.

### (c) Los niveles no comunican su objetivo; solo se recolectan piezas
**Confirmado.** El objetivo real es `score >= this.targetScore` (=300), definido en
`Nivel1Scene.js:37` / `Nivel2Scene.js:37` y evaluado en `checkWinCondition()`
(`:458` / `:463`), pero **nunca se muestra** al jugador: no hay texto de meta ni de
progreso hacia 300, y los coleccionables reaparecen infinitamente. El HUD solo muestra
Score, Vidas, Dash y (en N2) Tiempo.
**Solución técnica:** (1) banner de objetivo al iniciar el nivel; (2) indicador de
progreso en `UIScene` (nueva señal `objective-changed` por registry, p.ej.
"Fragmentos: X / N" o "Meta: 300"); (3) idealmente cambiar la condición de victoria a
"reunir N fragmentos finitos" para alinear objetivo y narrativa.

### (d) Controles mal distribuidos (dash lejano; doble salto debería estar en SPACE)
**Confirmado y además inconsistente entre niveles.**
- Nivel 1: salto en `W` (`keys.up`, `Nivel1Scene.js:171`), **ataque en `SPACE`**
  (`attackKey`, `:174`, disparado en `:196`), **dash en `SHIFT`** (`:175`, `:192`).
- Nivel 2: salto en `W` (`:173`), **dash en `SPACE`** (`attackKey` reutilizado, `:176`
  disparado en `:194`), y el ataque **no está mapeado a nada** → Thor no ataca (H02).

Es decir, la misma tecla (SPACE) hace cosas distintas en cada nivel, el dash de N1
está en una tecla lejana (`SHIFT`) y el salto no está en la barra espaciadora como
pide el diseño.
**Solución técnica:** definir un esquema único en `constants.js` y aplicarlo idéntico
en ambas escenas, por ejemplo:
- **Salto / doble salto → `SPACE`**
- **Dash → `SHIFT`** (o `K`, cerca de la mano derecha)
- **Ataque → `J`** (o clic izquierdo)

y en Nivel 2 volver a llamar `doMeleeAttack(time)` en `update()`. Centralizar el mapeo
evita que ambos niveles diverjan de nuevo.

---

## 6. Ranking final — Top mejoras por impacto/esfuerzo

Ordenadas para que el equipo elija. Prioriza **impacto alto con esfuerzo bajo (quick
wins)** arriba.

| # | Mejora | IDs | Impacto | Esfuerzo | Por qué primero |
|---|--------|-----|---------|----------|-----------------|
| 1 | **Unificar y arreglar controles** (SPACE=salto, dash=SHIFT, ataque=J) en ambos niveles | H01, H13 | Alta | S | Corrige la incoherencia central; base para todo lo demás. |
| 2 | **Reactivar el ataque de Thor** (llamar `doMeleeAttack` en N2) | H02 | Alta | S | Desbloquea un sistema entero ya construido pero invisible. |
| 3 | **Igualar el zoom de cámara** entre N1 y N2 | H03 | Alta | S | Elimina el salto de perspectiva; una línea. |
| 4 | **Mostrar objetivo + progreso** en el HUD | H07 | Alta | S | El jugador por fin sabe qué hacer y cuándo gana. |
| 5 | **Añadir SFX a las acciones clave** (salto, dash, golpe, recoger, daño, victoria) | H04 | Alta | M | El mayor salto de "game feel" percibido por el jugador. |
| 6 | **IntroScene narrativa** (bomba / Hora Cero / héroes) | H08 | Alta | M | Conecta el juego con su historia desde el arranque. |
| 7 | **Reemplazar cuadrados de enemigos por pixel-art** | H05 | Alta | M | Cierra la mayor brecha de coherencia visual. |
| 8 | **Diferenciar el Nivel 2** (cargar y remapear `background-industrial.png`) | H06 | Alta | M | Que los dos niveles dejen de verse iguales. |
| 9 | **Coyote time + jump buffering** | H11 | Media | M | Hace el plataformeo justo y moderno. |
| 10 | **Fades de música + feedback de daño (shake/flash)** | H19, H21 | Media | S | Pulido de bajo costo y alta percepción. |

**Quick wins inmediatos (1 sesión):** #1, #2, #3, #4, #10.
**Pilares de calidad (planificar):** #5, #6, #7, #8.
**Narrativa/temáticos secundarios:** coleccionables como fragmentos (H09), timer de
bomba coherente en N1 (H10), limpieza de sheets/teclas debug (H16, H24).

---

*Fin del informe. Auditoría de solo análisis — no se modificó ningún archivo del
juego.*
