# CAMBIOS A2 — Sistema de audio (SFX + transiciones de música)

**Rama:** `feat/ariel-sistema-audio`
**Fecha:** 2026-07-23
**Hallazgos que resuelve:** H04 (ausencia de SFX), H19 (cortes de música sin
fundido), H20 (música por nivel — parcial, ver §5)

---

## 1. Archivos tocados

| Archivo | Qué cambió |
|---|---|
| `src/systems/AudioManager.js` | **Nuevo.** Módulo central de audio (singleton). |
| `src/scenes/BootScene.js` | Solo `preload()`: carga de los 13 SFX nuevos. **`create()` no se tocó.** |
| `src/scenes/MenuScene.js` | Música con fade-in, SFX de hover/click, salida con fade-out. |
| `src/scenes/GameOverScene.js` | Se eliminan los `stopByKey` en seco; crossfade y fades. |
| `src/scenes/CreditosScene.js` | Música con fade-in, SFX de hover/click, salida con fade-out. |
| `src/scenes/Nivel1Scene.js` | SFX de gameplay, detección de aterrizaje, salida con fade. |
| `src/scenes/Nivel2Scene.js` | Ídem + alarma de tiempo bajo. |

No se modificaron `UIScene.js`, `src/entities/`, los mapas JSON ni el mapeo de
teclas de la fase A1. No se agregaron dependencias ni build tools.

### Assets añadidos

13 archivos nuevos en `assets/sounds/` (ver §4 para los que faltan).

---

## 2. El AudioManager

Las escenas ya no tocan `this.sound` directamente: todo pasa por
`src/systems/AudioManager.js`. Es un singleton porque el SoundManager de Phaser
es global al juego, y así la música puede sobrevivir al cambio de escena y
encadenar fundidos entre ellas.

### API

```js
Audio.attach(scene)                     // registrar la escena activa (en create)
Audio.play(key, config)                 // SFX
Audio.playMusic(key, options)           // música con fade-in
Audio.stopMusic(options)                // música con fade-out
Audio.crossfade(fromKey, toKey, ms)     // cruce entre pistas
Audio.fadeOutAndSwitch(scene, key, data, options)  // fade-out + cambio de escena
```

### Constantes (todas exportadas)

| Constante | Valor | Para qué |
|---|---|---|
| `MUSIC_VOLUME` | `0.45` | Volumen de música |
| `SFX_VOLUME` | `0.7` | Volumen de efectos |
| `MUSIC_FADE_MS` | `800` | Fundido normal de música |
| `SCENE_FADE_MS` | `400` | Fundido corto antes de cambiar de escena |
| `SFX_THROTTLE_MS` | `70` | Anti-solapamiento entre disparos de la misma clave |
| `LAND_MIN_FALL_SPEED` | `220` | Velocidad de caída mínima para que suene el aterrizaje |
| `TIMER_WARNING_SECONDS` | `10` | Segundos restantes que disparan la alarma (Nivel 2) |

### Los tres requisitos, verificados en el navegador

- **Tolerancia a assets faltantes.** Si la clave no está en la caché,
  `console.warn` **una sola vez** por clave y `return false`; nunca lanza.
  `play()` acepta además `fallback` para usar otra clave como sustituta.
- **Anti-solapamiento.** Throttle de 70 ms por clave (configurable por llamada
  con `{ throttle: ms }`). Comprobado: 5 disparos seguidos de `sfx-punch`
  → `[true, false, false, false, false]`, solo suena el primero.
- **Volúmenes por categoría.** Música y SFX independientes, como constantes.

Detalle de implementación que conviene no romper: las pistas de música se
**reutilizan por clave** (`sound.get(key) || sound.add(key)`) en vez de crearse
y destruirse. Destruir un `Sound` mientras Phaser todavía actualiza su tween de
volumen revienta con `Cannot read properties of null (reading 'gain')`, porque
el `volumeNode` ya no existe.

---

## 3. Tabla acción → SFX implementados

Los 13 están conectados en **ambos niveles** salvo donde se indica.

| Acción | Clave | Dónde se dispara |
|---|---|---|
| Salto desde el suelo | `sfx-jump` | `handleJump()` (`jumpsUsed === 0`) |
| Doble salto en el aire | `sfx-double-jump` | `handleJump()` — **falta el archivo**, cae en `sfx-jump` |
| Inicio del dash | `sfx-dash` | `startDash()` |
| Golpes 1 y 2 del combo | `sfx-punch` | `doMeleeAttack()` (`!isKick`) |
| Golpe final del combo | `sfx-kick` | `doMeleeAttack()` (`isKick`) |
| El ataque conecta con un enemigo | `sfx-hit-enemy` | `onMeleeHitEnemy()`; en N2 también al arrollar con dash |
| Muerte de un enemigo | `sfx-enemy-death` | Listener `enemy-killed` del registry |
| Recoger coleccionable | `sfx-collect` | `onCollectStar()` |
| El jugador recibe daño | `sfx-player-hurt` | `takeDamageFromEnemy()` y `loseLife()` |
| Aterrizar tras una caída | `sfx-land` | `checkLanding()` |
| Timer bajo umbral | `sfx-timer-warning` | Callback del timer — **solo Nivel 2** |
| Ganar el nivel | `sfx-victory` | `winGame()` |
| Click en botón | `sfx-ui-click` | Menú, Game Over y Créditos |
| Hover sobre botón | `sfx-ui-hover` | Menú, Game Over y Créditos |

### Los dos casos que pedían cuidado

**Aterrizaje.** No suena en cada frame en que el cuerpo toca el suelo. Se
detecta la transición aire→suelo guardando el estado del frame anterior, y
además se exige que la caída traiga velocidad real:

```js
checkLanding(onGround) {
    if (onGround && !this.wasOnGround && this.prevFallSpeed > LAND_MIN_FALL_SPEED) {
        Audio.play('sfx-land');
    }
    this.wasOnGround   = onGround;
    this.prevFallSpeed = this.player.body.velocity.y;
}
```

El umbral de 220 px/s evita el SFX en microbotes o al apoyarse sin haber caído.

**Alarma de tiempo.** Suena una sola vez al cruzar el umbral, no en bucle. La
guarda el flag `timerWarned`. Verificado simulando ticks: 12 → 11 → **10 (suena)**
→ 9 → 8, con una única reproducción.

---

## 4. Audios que faltan

Se cargan **solo los archivos que existen hoy** en `assets/sounds/`, para no
provocar 404 al publicar en GitHub Pages.

| Archivo ausente | Consecuencia | Estado |
|---|---|---|
| `sfx-double-jump.mp3` | El doble salto usa `sfx-jump` como fallback | **Pendiente** |
| `bgm-nivel1.mp3` | Nivel 1 usa `bgm` | **Pendiente** (H20) |
| `bgm-nivel2.mp3` | Nivel 2 usa `bgm` | **Pendiente** (H20) |

Cuando aparezcan los archivos basta con:

- `sfx-double-jump` → añadir la clave al array `sfxKeys` de `BootScene.preload()`.
  El fallback deja de usarse solo, sin tocar los niveles.
- `bgm-nivel1` / `bgm-nivel2` → cargarlos en `preload()` y cambiar
  `Audio.playMusic('bgm')` por la clave del nivel en el `create()` de cada
  escena. El crossfade entre niveles ya funciona: `playMusic()` detecta que hay
  otra pista sonando y cruza sola.

Presentes y en uso (15 en total): `bgm-loop.mp3`, `game-over.mp3`, `sfx-jump`,
`sfx-dash`, `sfx-punch`, `sfx-kick`, `sfx-hit-enemy`, `sfx-enemy-death`,
`sfx-collect`, `sfx-player-hurt`, `sfx-land`, `sfx-timer-warning`,
`sfx-victory`, `sfx-ui-click`, `sfx-ui-hover`.

---

## 5. Fades de música (H19)

Antes, `GameOverScene` hacía `stopByKey('bgm')` + `play('gameover')` de golpe, y
al reintentar la música arrancaba de forma brusca. Ahora:

- **Fade-in** al iniciar la música en Menú, Créditos y ambos niveles.
- **Fade-out** antes de cualquier cambio de escena (`fadeOutAndSwitch`).
- **Game Over**: la pista de derrota entra por **crossfade** sobre la música del
  nivel. Por eso `gameOver()` ya no corta la música: solo cierra el HUD y deja
  que `GameOverScene` cruce.
- **Reintentar**: se funde la pista de derrota y el nivel arranca la suya con
  fade-in en su `create()`.

Todos los fundidos son tweens sobre la propiedad `volume` del objeto `Sound`.

Dos detalles de robustez que ya están resueltos y conviene no deshacer:

1. **Bandera `isEnding`** en ambos niveles. El cambio de escena ocurre en el
   `onComplete` del fundido, así que durante esos 400 ms la escena sigue viva.
   Sin la bandera, una caída al vacío dispararía `loseLife()` en cada frame del
   fundido. `update()` y las transiciones se cortan mientras `isEnding` es true.
2. **`detach()` remata los fundidos pendientes.** Los tweens mueren con la
   escena; si uno quedaba a medias se fuerza su final, para que la música no se
   quede a medio volumen ni sonando para siempre.

### Música por nivel (H20) — pendiente

Como `bgm-nivel1.mp3` y `bgm-nivel2.mp3` no existen, ambos niveles siguen con
`bgm`. No se inventaron archivos. La infraestructura de crossfade ya está lista
(ver §4).

---

## 6. Cómo probar cada sonido a mano

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

> El navegador bloquea el audio hasta la primera interacción. El primer clic del
> menú lo desbloquea; el AudioManager ya espera al evento `unlocked`, así que no
> se pierde la música de arranque.

Controles (fase A1): mover `A`/`D`, saltar `SPACE`, dash `SHIFT`, atacar `J`,
menú `M`. Teclas debug: `L` pierde una vida, `K` mata al enemigo más cercano.

| Sonido | Cómo dispararlo |
|---|---|
| `sfx-ui-hover` | Pasar el ratón por encima de cualquier botón del menú |
| `sfx-ui-click` | Hacer clic en cualquier botón |
| Fade-in de música | Al entrar al menú: la música sube desde silencio |
| Fade-out de música | Pulsar "Nivel 1": la música baja antes de cambiar |
| `sfx-jump` | `SPACE` estando en el suelo |
| `sfx-double-jump` | `SPACE` otra vez en el aire (hoy suena `sfx-jump`; en consola aparece el aviso del asset faltante) |
| `sfx-dash` | `SHIFT` |
| `sfx-punch` | `J` (primer y segundo golpe del combo) |
| `sfx-kick` | `J` tres veces seguidas: el tercero es la patada |
| `sfx-hit-enemy` | Atacar con `J` pegado a un enemigo |
| `sfx-enemy-death` | Rematar a un enemigo, o pulsar `K` |
| `sfx-collect` | Tocar una estrella |
| `sfx-player-hurt` | Chocar con un enemigo, o pulsar `L` |
| `sfx-land` | Saltar desde una plataforma alta y caer. No debe sonar en saltitos pequeños ni estando quieto en el suelo |
| `sfx-timer-warning` | Nivel 2: esperar a que el timer baje de 10 s. Debe sonar **una sola vez** |
| `sfx-victory` | Llegar a 300 puntos en un nivel |
| Crossfade a Game Over | Pulsar `L` tres veces: la música del nivel se cruza con la de derrota |
| Fade al reintentar | En Game Over, "Reintentar": la derrota se funde y el nivel entra con fade-in |

---

## 7. Verificación realizada

Servidor local (`python -m http.server 8000`), Chrome:

- **94 peticiones de red, todas HTTP 200. Ningún 404.** Los 15 audios cargan
  correctamente.
- **Sin errores ni excepciones del juego en consola** recorriendo Menú → Nivel 1
  → Game Over → Reintentar → Nivel 1 → Menú → Nivel 2, con saltos, dash, combo,
  golpes y muertes de enemigos. (Los 3 errores que aparecen en consola son ruido
  de extensiones de Chrome —Adobe, axe, QuillBot—, ajenos al juego.)
- **Fade-in comprobado**: tras entrar a un nivel, la música queda exactamente en
  `0.45` = `MUSIC_VOLUME`.
- **Fade-out + cambio de escena comprobado** de extremo a extremo con un tween
  real de 400 ms.
- **Tolerancia a assets faltantes comprobada en vivo**: `play('sfx-double-jump')`
  y `play('clave-inexistente')` no lanzan, avisan una única vez y devuelven el
  control con normalidad.
- **Throttle comprobado**: 5 disparos seguidos de la misma clave → solo suena 1.
- **Alarma de tiempo comprobada**: una única reproducción al cruzar los 10 s.

Nota de entorno: si la pestaña está en segundo plano, Phaser congela el bucle
(`requestAnimationFrame` se detiene) y los fundidos se pausan con él, así que un
cambio de escena puede quedar en espera hasta volver a la pestaña. Es el
comportamiento normal de Phaser —la física y los timers también se pausan— y se
resuelve solo al recuperar el foco.

---

## 8. Pendientes para la siguiente fase

1. Añadir `sfx-double-jump.mp3`.
2. Añadir `bgm-nivel1.mp3` y `bgm-nivel2.mp3` y cerrar H20.
3. SFX que el informe menciona y aún no tienen archivo: pasos (footsteps), tic
   del temporizador y aparición/respawn de enemigos.
4. Capa de tensión que suba al bajar el timer (segunda mitad de H20).
