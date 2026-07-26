# Tareas de Implementación — FERNANDO

**Proyecto:** ZERO HOUR (Phaser 3.80.1 + Tiled)
**Repositorio:** https://github.com/Aidmora/Zero-Hour
**Despliegue:** https://aidmora.github.io/Zero-Hour/
**Herramienta:** Claude Code (CLI) en la raíz del proyecto

---

## Antes de empezar — lee esto

Ariel ya mergeó a `main` todo su trabajo: controles unificados, ataque de Thor,
sistema de audio + SFX, IntroScene, overlay de controles, game feel (coyote
time / inercia), fragmentos de código finitos y feedback de daño. **Parte de
`main` actualizado siempre**, porque tus mejoras se construyen sobre las suyas.

### Reglas de coordinación

- Antes de crear cada rama: `git checkout main && git pull`.
- Antes de cada `git merge` a `main`: `git pull` primero.
- **Zona compartida en `BootScene.js`:** Ariel editó `preload()` (arriba). Tú
  vas a editar `create()` (abajo, donde se generan las texturas de enemigos).
  Mantente en tu zona y no habrá conflictos.
- **`UIScene.js` es tuyo por completo.** Nadie más lo toca.
- Prueba siempre en local (`python -m http.server 8000`, con Ctrl+Shift+R para
  evitar caché) antes de mergear.

### Dato que necesitas de Ariel (ya implementado)

Al recoger un fragmento, la escena emite por el registry:

    this.registry.events.emit('fragments-changed', { collected, total })

Tu HUD debe escuchar ese evento para mostrar "Fragmentos X/N". Lo usarás en F2.

---

## Tus 3 mejoras oficiales del examen

Cubren tres categorías de la rúbrica que Ariel no toca: **Diseño de Niveles**,
**UI/UX** y **Animaciones**. Con esto tu nota individual queda cubierta.

| # | Mejora oficial | Categoría rúbrica | Hallazgos |
|---|---|---|---|
| F1 | Cámara unificada + diferenciar visualmente el Nivel 2 | Diseño de Niveles | H03, H06, H18 |
| F2 | HUD legible: objetivo, progreso de fragmentos y feedback | UI/UX | H07, H22, H10 |
| F3 | Enemigos pixel-art + animaciones de frenado y aterrizaje | Animaciones | H05, H14, H15 |

---

# FASE F1 — Cámara unificada y diferenciación del Nivel 2

**Categoría:** Diseño de Niveles · **Hallazgos:** H03, H06, H18

Esta fase tiene una parte trivial (cámara, 1 línea) y una pesada (tileset del
Nivel 2, requiere Tiled). Divídela en dos ramas para no arriesgar todo junto.

## F1.a — Cámara unificada (rápido, hazlo primero)

### 1. Crear la rama

```bash
git checkout main
git pull
git checkout -b fix/fernando-camara-unificada
```

### 2. Prompt para Claude Code

```
Estás en ZERO HOUR (Phaser 3.80.1, ES Modules). Vas a resolver H03: unificar
el zoom de cámara entre los dos niveles. Lee docs/ESTADO_ACTUAL.md §3.b①.

## Problema (verificado)

- Nivel1Scene.js NO llama setZoom → zoom por defecto 1.0. La cámara muestra
  todo el mapa sin scroll y el personaje se ve pequeño y lejano.
- Nivel2Scene.js hace this.cameras.main.setZoom(1.5) → cámara cercana que
  sigue al jugador, más inmersiva.
- Ambos mapas miden 40x15 tiles de 32px = 1280x480 (el viewport completo).

El equipo decidió que la cámara CERCANA del Nivel 2 es la correcta (más
inmersión). Hay que llevar el Nivel 1 a ese mismo zoom, NO bajar el Nivel 2.

## Qué implementar

1. Añade una constante CAMERA_ZOOM en src/config/constants.js con valor 1.5.
2. En AMBAS escenas, aplica this.cameras.main.setZoom(CAMERA_ZOOM) en el mismo
   punto donde hoy se configura la cámara. Ninguna escena debe quedar sin
   setZoom ni con un literal 1.5 suelto.
3. Al subir el Nivel 1 a 1.5, la cámara empezará a recortar y seguir al
   jugador (como el Nivel 2). Verifica que:
   - setBounds de la cámara cubra todo el mapa (this.cameras.main.setBounds
     con las dimensiones del tilemap) para que no se vea fuera del nivel.
   - startFollow siga activo y suave.
   - No queden zonas del nivel imposibles de alcanzar visualmente.
4. Revisa que el overlay de controles (LevelIntroOverlay) y el feedback de
   daño (que compensan zoom con 1/zoom y zoom²) sigan viéndose bien en Nivel 1
   ahora que su zoom cambió. NO modifiques esos sistemas; solo confirma que se
   ven correctos.

## Restricciones
- NO toques UIScene.js, src/entities/, los mapas JSON, ni la lógica de
  gameplay, audio, fragmentos o daño.
- Ambas escenas idénticas en este cambio. Estilo: 4 espacios, comillas simples.

## Al terminar
1. Prueba con python -m http.server 8000 (Ctrl+Shift+R). El personaje del
   Nivel 1 debe verse al mismo tamaño e inmersión que Thor en el Nivel 2. La
   cámara sigue al jugador en ambos. Sin zonas cortadas ni vacías.
2. Escribe docs/CAMBIOS_F1a.md.
3. NO hagas commit ni push.
```

### 3. Probar en local

- El personaje del Nivel 1 se ve al mismo tamaño que Thor en el Nivel 2
- La cámara sigue al jugador con scroll suave en ambos niveles
- No se ve "fuera del mapa" ni quedan zonas inalcanzables visualmente
- El overlay de controles y el flash de daño se ven bien en el Nivel 1
- Sin errores de consola

### 4. Commit, push y merge

```bash
git add -A
git commit -m "fix(camara): unificar zoom entre niveles (CAMERA_ZOOM=1.5)

- Nueva constante CAMERA_ZOOM leida por ambas escenas
- Nivel 1 pasa de zoom 1.0 a 1.5 con la camara siguiendo al jugador
- Verificados setBounds y startFollow en ambos niveles

Resuelve H03"
git push -u origin fix/fernando-camara-unificada
git checkout main
git pull
git merge fix/fernando-camara-unificada
git push
```

## F1.b — Diferenciar visualmente el Nivel 2 (pesado, requiere Tiled)

**Advertencia honesta:** esto NO es un cambio de código de una línea. Los dos
tilesets tienen dimensiones distintas (`background.png` 306×306,
`background-industrial.png` 632×258), así que los GIDs no coinciden. Cambiar el
`load` sin más pintaría tiles equivocados. Hay que **remapear el mapa en Tiled**.
Es media jornada real.

**Si el tiempo aprieta**, la versión mínima defendible es: dejar la cámara
unificada (F1.a) + cambiar solo el fondo de pantalla (`bg-real`) del Nivel 2 por
uno distinto, y documentar el remapeo del tileset como trabajo futuro. Sigue
cumpliendo "Diseño de Niveles".

### 1. Crear la rama

```bash
git checkout main
git pull
git checkout -b feat/fernando-tileset-nivel2
```

### 2. Trabajo manual en Tiled (antes del prompt)

1. Abre `assets/maps/nivel-2.json` en Tiled 1.12.
2. Añade `background-industrial.png` como nuevo tileset del mapa.
3. Repinta la capa `Tile Layer 1` con los tiles del tileset industrial,
   respetando la geometría de plataformas existente (para no romper colisiones).
4. Exporta como JSON, sobrescribiendo `nivel-2.json`.

### 3. Prompt para Claude Code

```
Estás en ZERO HOUR (Phaser 3.80.1). Vas a resolver H06: que el Nivel 2 use su
propio tileset industrial y deje de verse idéntico al Nivel 1. Lee
docs/INFORME_PLAYTESTING.md §4.a.

## Estado

- BootScene.js carga 'tiles-nivel1' y 'tiles-nivel2' ambos desde
  'assets/tilesets/background.png' (mismo archivo).
- 'assets/tilesets/background-industrial.png' existe pero nunca se carga.
- Ya remapeé nivel-2.json en Tiled contra el tileset industrial (hecho
  manualmente antes de este prompt).

## Qué implementar

1. En BootScene.preload() cambia la carga de 'tiles-nivel2' para que apunte a
   'assets/tilesets/background-industrial.png'. NO toques 'tiles-nivel1'.
   (preload es zona compartida; trabaja solo en la línea de tiles-nivel2, no
   toques create()).
2. En Nivel2Scene.js, ajusta addTilesetImage() para que el nombre del tileset
   coincida con el que declara ahora nivel-2.json (verifícalo abriendo el JSON:
   el campo "name" dentro de "tilesets"). Si el remapeo cambió el nombre
   interno del tileset, actualízalo aquí.
3. Opcional pero recomendado (diferenciación de fondo): en Nivel2Scene.js, el
   fondo 'bg-real' (background.jpg) es el mismo que en Nivel 1. Si hay un fondo
   alternativo apropiado, úsalo en Nivel 2; si no, déjalo anotado.
4. Verifica que las colisiones del Nivel 2 sigan funcionando: las plataformas
   deben seguir siendo sólidas tras el remapeo. Si el remapeo alteró qué tiles
   colisionan, ajusta setCollisionByExclusion / setCollisionByProperty según
   como esté configurado hoy.

## Restricciones
- NO toques UIScene.js, src/entities/, la lógica de gameplay/audio/fragmentos.
- NO toques BootScene.create() ni el Nivel 1.
- Estilo: 4 espacios, comillas simples.

## Al terminar
1. Prueba con python -m http.server 8000 (Ctrl+Shift+R). El Nivel 2 debe verse
   claramente distinto del Nivel 1, con las plataformas sólidas y el jugador
   sin caer a través del suelo ni atascarse.
2. Escribe docs/CAMBIOS_F1b.md con el nombre interno del tileset y lo ajustado.
3. NO hagas commit ni push.
```

### 4. Probar en local

- El Nivel 2 se ve claramente distinto del Nivel 1 (estética industrial)
- Las plataformas del Nivel 2 siguen siendo sólidas (no se cae a través)
- El jugador no se atasca en tiles ni queda flotando
- Sin errores de consola ni 404 del tileset

### 5. Commit, push y merge

```bash
git add -A
git commit -m "feat(niveles): tileset industrial propio para el Nivel 2

- Cargar background-industrial.png como tiles-nivel2
- Remapear nivel-2.json en Tiled contra el nuevo atlas
- Ajustar addTilesetImage y colisiones al nuevo tileset

Resuelve H06"
git push -u origin feat/fernando-tileset-nivel2
git checkout main
git pull
git merge feat/fernando-tileset-nivel2
git push
```

---

# FASE F2 — HUD legible: objetivo, progreso y contador de bomba

**Categoría:** UI/UX · **Hallazgos:** H07, H22, H10

Aquí está el cierre narrativo del que habló el equipo: el HUD debe comunicar el
objetivo (reunir fragmentos) y la Hora Cero (cuenta atrás) en ambos niveles.

## 1. Crear la rama

```bash
git checkout main
git pull
git checkout -b feat/fernando-hud-objetivo
```

## 2. Prompt para Claude Code

```
Estás en ZERO HOUR (Phaser 3.80.1, ES Modules). Vas a mejorar el HUD (UIScene)
para que comunique el objetivo, el progreso de fragmentos y la cuenta atrás de
la bomba. Resuelve H07, H22 y H10. Lee docs/ESTADO_ACTUAL.md §4 y §6.

## Estado actual del HUD (UIScene.js)

- Muestra Score, Vidas (con emojis ❤️/🖤), Dash (con emoji ⏳) y, solo en
  Nivel 2, Tiempo. Textos pequeños arriba a la izquierda.
- Escucha del registry: 'score-changed', 'lives-changed', 'dash-ready',
  'time-changed'.
- NO escucha 'fragments-changed' (evento nuevo que ya emiten las escenas al
  recoger fragmentos, con payload { collected, total }).
- El timer no cambia de color al agotarse. Los emojis dependen de la fuente del
  navegador (pueden no renderizar bien).

## Qué implementar

### 1. Progreso de fragmentos (H07)
- UIScene debe escuchar 'fragments-changed' y mostrar "FRAGMENTOS: X / N" de
  forma prominente. Es el objetivo real del nivel (ganar = reunir todos).
- Al completar (X === N), un breve destaque visual (color, escala o parpadeo).

### 2. Contador de bomba / Hora Cero en AMBOS niveles (H10)
- Hoy solo el Nivel 2 tiene temporizador (timeLeft=60, evento 'time-changed').
  El Nivel 1 no tiene ninguno pese a que la narrativa es una bomba con cuenta
  atrás.
- Añade un temporizador también al Nivel 1 (mismo patrón que Nivel 2:
  propiedad timeLeft, un timer que decrementa, emisión de 'time-changed', y
  Game Over si llega a 0). Usa una constante para los segundos por nivel.
  IMPORTANTE: esto toca Nivel1Scene.js. Aplica el MISMO patrón que ya existe en
  Nivel2Scene.js (líneas del timer) para no divergir. NO alteres la lógica de
  fragmentos, dash, salto ni daño.
- En el HUD, renombra "Tiempo" a algo temático ("HORA CERO" o "DETONACIÓN") y
  hazlo grande y central. Que se ponga rojo y parpadee bajo un umbral (ej. 10s;
  ya existe TIMER_WARNING_SECONDS y el sfx-timer-warning que suena en N2).

### 3. Legibilidad general (H22)
- Timer grande y visible (no un texto pequeño en la esquina).
- Reemplaza los emojis ❤️/🖤 por sprites de corazón o por gráficos dibujados
  (Phaser graphics), para no depender de la fuente del navegador. Igual con el
  ícono de dash si usa emoji.
- Mantén Score y el resto legibles y bien contrastados sobre el fondo.

## Restricciones
- UIScene.js es tuyo, puedes reestructurarlo.
- Para el timer del Nivel 1 SÍ tocas Nivel1Scene.js, pero SOLO para añadir el
  temporizador replicando el patrón de Nivel2Scene.js. No toques su lógica de
  movimiento, dash, combo, fragmentos ni daño.
- NO toques src/entities/, el sistema de audio (solo disparas eventos/SFX ya
  existentes), ni la IntroScene.
- Estilo: 4 espacios, comillas simples.

## Al terminar
1. Prueba con python -m http.server 8000 (Ctrl+Shift+R). Verifica: el HUD
   muestra FRAGMENTOS X/N y sube al recoger; hay cuenta atrás en AMBOS niveles;
   el timer se pone rojo y parpadea bajo el umbral; los corazones se ven sin
   depender de emojis; llegar a 0 en el timer da Game Over en ambos niveles.
2. Escribe docs/CAMBIOS_F2.md.
3. NO hagas commit ni push.
```

## 3. Probar en local

- El HUD muestra "FRAGMENTOS: X / N" y sube al recoger cada fragmento
- Hay cuenta atrás visible en **ambos** niveles (antes solo en el 2)
- El timer se pone rojo y parpadea bajo el umbral, con su sonido de alerta
- Los corazones de vida se ven bien (no dependen de emoji del navegador)
- Llegar a 0 en el timer produce Game Over en ambos niveles
- Sin errores de consola

## 4. Commit, push y merge

```bash
git add -A
git commit -m "feat(hud): objetivo de fragmentos, cuenta atras en ambos niveles y legibilidad

- UIScene escucha fragments-changed y muestra FRAGMENTOS X/N
- Temporizador de bomba anadido al Nivel 1 (patron de Nivel 2)
- Timer grande, rojo y parpadeante bajo umbral (HORA CERO)
- Corazones como graficos, sin depender de emojis

Resuelve H07, H22, H10"
git push -u origin feat/fernando-hud-objetivo
git checkout main
git pull
git merge feat/fernando-hud-objetivo
git push
```

---

# FASE F3 — Enemigos pixel-art y animaciones de frenado/aterrizaje

**Categoría:** Animaciones · **Hallazgos:** H05, H14, H15

## Antes de empezar — consigue los assets

Claude Code no puede descargar imágenes. Consigue spritesheets de enemigos
pixel-art (coherentes con el estilo del jugador) antes de correr el prompt:

- **Kenney** (https://kenney.nl/assets) — packs libres, dominio público.
- **itch.io** (https://itch.io/game-assets/free) — busca "enemy pixel art".
- Necesitas al menos: un enemigo para el Patrullero y otro para el Perseguidor,
  idealmente con animación de caminar (y opcionalmente morir).

Guárdalos en `assets/sprites/enemies/` con nombres claros (ej.
`enemy-patrol.png`, `enemy-chaser.png`). Anota el tamaño de frame de cada uno.

## 1. Crear la rama

```bash
git checkout main
git pull
git checkout -b feat/fernando-animaciones
```

## 2. Prompt para Claude Code

```
Estás en ZERO HOUR (Phaser 3.80.1, ES Modules). Vas a resolver H05 (enemigos
pixel-art), H14 (animación de frenado y aterrizaje) y H15 (p2-fall es un frame
estático). Lee docs/INFORME_PLAYTESTING.md §4.b y §4.c.

## Estado actual

- H05: BootScene.js create() genera 'enemy-patrol' (cuadrado rojo) y
  'enemy-chaser' (cuadrado morado) con make.graphics. Chocan con el pixel-art
  del jugador. Los spritesheets pixel-art ya están en assets/sprites/enemies/
  (los conseguí antes de este prompt; verifica el directorio y sus tamaños de
  frame).
- H14: el jugador no tiene animación de frenado (skid) ni de aterrizaje. Al
  cambiar de dirección o tocar suelo, la transición es brusca. La lógica de
  aterrizaje ya existe (checkLanding dispara sfx-land), pero sin animación.
- H15: en Nivel2Scene.js, p2-fall es un único frame estático (frame 3 de
  p2-jump), la caída de Thor se ve congelada.

## Qué implementar

### 1. Enemigos pixel-art (H05)
- Carga los spritesheets de assets/sprites/enemies/ en BootScene.preload()
  (esa parte es editable). Lista el directorio y usa los tamaños de frame
  reales.
- En BootScene.create(), ELIMINA la generación por graphics de 'enemy-patrol'
  y 'enemy-chaser' y usa las nuevas texturas. (create() de BootScene es tu
  zona.)
- Registra animaciones de caminar (y morir si el asset lo permite) para cada
  tipo de enemigo. Conéctalas en las entidades de src/entities/ (PatrolEnemy,
  ChaserEnemy o como se llamen) para que se reproduzcan al moverse y al morir.
- Ajusta el tamaño del cuerpo de colisión (body.setSize/setOffset) al nuevo
  sprite si difiere del cuadrado anterior.

### 2. Animación de frenado y aterrizaje del jugador (H14)
- Frenado (skid): al cambiar bruscamente de dirección en el suelo a velocidad
  alta, reproduce un frame/animación de derrape antes de la animación normal.
  Si el spritesheet del jugador (player-1.png, 14x3=42 frames, 79x60) tiene un
  frame apropiado, úsalo; identifica cuál examinando el spritesheet.
- Aterrizaje: al detectar la transición aire→suelo (ya está checkLanding),
  reproduce una animación/frame breve de aterrizaje antes de volver a idle/run.
- Aplica ambos en Nivel1Scene y Nivel2Scene, idéntico, con las claves p1-/p2-.

### 3. Caída de Thor (H15)
- p2-fall debe ser una animación de 2-3 frames, no un frame estático. Usa
  frames de descenso del spritesheet p2-jump o de AirSwordSlash si aplica.
  Examina el spritesheet para elegir los frames correctos.

## Restricciones
- NO toques UIScene.js, la lógica de fragmentos/dash/combo/daño, ni el sistema
  de audio (salvo disparar SFX ya existentes).
- BootScene.create() es tu zona para las texturas de enemigos; no toques la
  parte de preload de audio de Ariel más allá de añadir tus cargas de enemigos.
- Ambas escenas idénticas en los cambios del jugador. Estilo: 4 espacios,
  comillas simples.

## Al terminar
1. Prueba con python -m http.server 8000 (Ctrl+Shift+R). Los enemigos se ven
   como pixel-art coherente y animados; el jugador frena con animación al
   cambiar de dirección y tiene animación de aterrizaje; la caída de Thor ya no
   está congelada. En ambos niveles.
2. Escribe docs/CAMBIOS_F3.md con los frames elegidos para cada animación.
3. NO hagas commit ni push.
```

## 3. Probar en local

- Los enemigos se ven como pixel-art coherente con el jugador (no cuadrados)
- Los enemigos caminan y mueren con animación
- El jugador frena con animación al cambiar de dirección a velocidad alta
- El jugador tiene animación de aterrizaje al caer
- La caída de Thor ya no es un frame congelado
- Las colisiones con enemigos siguen funcionando
- Sin errores de consola en ambos niveles

## 4. Commit, push y merge

```bash
git add -A
git commit -m "feat(animaciones): enemigos pixel-art y anim de frenado/aterrizaje

- Enemigos con spritesheets pixel-art y animacion de caminar/morir
- Animacion de frenado (skid) y aterrizaje del jugador en ambos niveles
- p2-fall pasa de frame estatico a animacion de caida

Resuelve H05, H14, H15"
git push -u origin feat/fernando-animaciones
git checkout main
git pull
git merge feat/fernando-animaciones
git push
```

---

# Extras opcionales (si sobra tiempo)

No son de tu nota, pero elevan el proyecto final:

- **H16** — limpiar los 7 spritesheets de Thor cargados y nunca usados (reduce
  tiempo de carga). Combínalo con F3 si tocas BootScene.
- **H17** — señalizar visualmente las caídas al vacío (tiles de peligro en los
  bordes de los pozos), para que el jugador no caiga sin aviso.
- **H18** — corregir los enemigos que aparecen en el aire (ajustar coords de
  spawn a la superficie de las plataformas). En Nivel2Scene un patrullero
  arranca fuera de sus propios límites.
- **H25** — reemplazar el botón "Salir" del menú (que llama window.close(),
  bloqueado por el navegador) por una pantalla de despedida limpia.

---

# Checklist final del equipo (antes de grabar el video)

Cuando todas las ramas estén en `main`:

```bash
git checkout main
git pull
python -m http.server 8000
```

- Juego completo de principio a fin sin errores de consola
- Verificado también en https://aidmora.github.io/Zero-Hour/ (no solo local)
- Probado en un navegador distinto al de desarrollo
- El HUD muestra fragmentos y cuenta atrás en ambos niveles
- Los dos niveles se ven visualmente distintos
- Enemigos pixel-art, cámara unificada

La rúbrica pide un video "antes/después" por cada mejora. Con una rama por
mejora es trivial: `git log --oneline` da los commits, y `git checkout <commit>`
lleva a cualquier estado previo para grabar el "antes".
