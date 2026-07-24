# Mejora A3 — Introducción narrativa y overlay de controles

Resuelve los hallazgos **H08** (sin introducción narrativa) y **H23** (sin
tutorial de controles) del `INFORME_PLAYTESTING.md`, secciones 5(a) y tabla de
hallazgos.

---

## 1. Archivos creados

| Archivo | Qué hace |
|---|---|
| `src/scenes/IntroScene.js` | Cutscene de apertura: 4 láminas de texto con fundido, contador de cuenta atrás, avance automático/manual y botón **Saltar** siempre visible. |
| `src/systems/LevelIntroOverlay.js` | Función `showLevelIntro(scene, info)`: panel semitransparente con nombre del nivel, héroe, contexto narrativo y esquema de teclas. Los objetos se crean **en la escena del nivel** que la llama. |

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/main.js` | `import IntroScene` y alta en `scene:[...]` **antes** de `MenuScene`. |
| `src/scenes/BootScene.js` | Última línea de `create()`: `this.scene.start('MenuScene')` → `this.scene.start('IntroScene')`. **Nada más de este archivo se tocó** (la generación de texturas de enemigos queda intacta). |
| `src/scenes/MenuScene.js` | Nueva entrada **"Historia"** que rejuega la intro. Rejilla recompactada (título 78, subtítulo 132, botones en y = 200/256/312/368/424, `fontSize` 28, `padding.y` 8) porque con cinco entradas y `GAME_HEIGHT = 480` la última ya no cabía — de hecho la antigua "Salir" en y=470 ya se salía del viewport. |
| `src/scenes/Nivel1Scene.js` | `import showLevelIntro` + llamada al final de `create()`. |
| `src/scenes/Nivel2Scene.js` | Ídem. |

No se tocó `UIScene.js`, ni `src/entities/`, ni los mapas JSON, ni el sistema de
audio, ni el mapeo de teclas.

---

## 3. Texto exacto de las láminas de la intro

Constantes: `SLIDE_MS = 5000` ms por lámina, `FADE_MS = 400` ms de fundido.
El contador **DETONACIÓN EN** arranca en `00:20` (4 láminas × 5 s) y llega a
`00:00` justo al entrar al menú; se pone magenta por debajo de 10 s y se
reancla en cada lámina para no descuadrarse si se avanza a mano.

### Lámina 1 — `HORA CERO`
```
Bajo la ciudad late una bomba programada.
Nadie sabe quién la puso. Todos ven su contador.
Cuando llegue a cero, no quedará ciudad que salvar.
```

### Lámina 2 — `EL CÓDIGO ROTO`
```
El código de desactivación fue partido en fragmentos
y escondido en dos zonas hostiles de la ciudad:
el Almacén Industrial y la Fortaleza Industrial.
```

### Lámina 3 — `DOS HÉROES`
```
MONJE CHI — túnica roja, maestro de las artes marciales.
Velocidad, precisión y la máxima agilidad en el aire.

THOR — capa carmesí, guerrero divino de la espada.
Poder puro, dominio del tiempo y del entorno.
```

### Lámina 4 — `ANTES DE LA HORA CERO`
```
Recupera cada fragmento. Ábrete paso a golpes.
El contador no se detiene por nadie.

La ciudad tiene hasta la Hora Cero. Ni un segundo más.
```

Elementos fijos en pantalla: `DETONACIÓN EN` + contador (arriba izquierda),
botón `Saltar ▸` y `[ESC]` (arriba derecha), cuatro puntos de progreso y
`ESPACIO o click para continuar` (abajo).

**Estética:** `assets/background/background.jpg` (clave `bg-real`) tintado de
azul, cubierto por un rectángulo `#05060f` al 78 % y líneas de barrido cada
4 px; filetes cian arriba y magenta abajo. Títulos en cian `#00ffff` con
contorno magenta.

---

## 4. Overlay de controles en los niveles (H23)

Constantes en `LevelIntroOverlay.js`: `VISIBLE_MS = 4000`, `FADE_IN_MS = 300`,
`FADE_OUT_MS = 500`, `ARM_MS = 700`.

- **Las teclas se leen de `KEYS` en `src/config/constants.js`**, nunca escritas
  a mano. Si el mapeo cambia, el overlay lo sigue solo. `KEY_LABELS` solo
  traduce el nombre visible (`SPACE` → `ESPACIO`); una tecla sin entrada se
  muestra tal cual, así que ninguna edición de `KEYS` puede romperlo.
- **No bloquea ni pausa nada:** el listener de teclado es pasivo (solo escucha
  para cerrarse). Verificado: con el panel abierto, `D` cierra el overlay y a la
  vez la lee el jugador (`keys.right.isDown === true`).
- **Auto-oculta a los 4 s** con fundido, o antes con cualquier tecla. El cierre
  por tecla se arma a los 700 ms para que un jugador que ya venía pulsando una
  dirección no lo haga desaparecer en el primer frame.
- **Zoom:** Nivel 2 usa `setZoom(1.5)`. El contenedor se ancla al centro exacto
  de la cámara con `setScrollFactor(0)` y se escala por `1/zoom`, así el panel
  se ve al mismo tamaño y en la misma posición en ambos niveles.
- Se destruye en el `shutdown` de la escena (game over, salida al menú) sin
  dejar listeners ni timers vivos.

Contenido por nivel (incluye el texto de contexto narrativo opcional del punto 4
del encargo):

| | Nivel 1 | Nivel 2 |
|---|---|---|
| Título | `Nivel 1: Almacén Industrial` | `Nivel 2: Fortaleza Industrial` |
| Héroe | `Monje Chi` | `Thor` |
| Contexto | `Fragmentos del código de desactivación detectados en el Almacén Industrial.` | `Últimos fragmentos dentro de la Fortaleza. El contador de la bomba ya corre.` |

Filas de controles (renderizadas desde `KEYS`, valores actuales):

```
A / D      Moverse
ESPACIO    Saltar  ·  pulsa dos veces = doble salto
SHIFT      Dash
J          Atacar  ·  encadena para el combo
M          Volver al menú
```

---

## 5. Cómo probarlo a mano

```bash
python -m http.server 8000
```
Abrir `http://localhost:8000`. Si ya se había abierto antes, forzar recarga sin
caché (**Ctrl+Shift+R**): el navegador cachea `src/main.js` y sin eso Phaser
avisa `Scene not found for key: IntroScene`.

1. **La intro arranca sola** tras la carga: se ve `HORA CERO` con el contador en
   `00:20` bajando.
2. **Avance automático:** esperar sin tocar nada; cada 5 s cambia de lámina con
   fundido y se enciende el siguiente punto de progreso. Tras la cuarta lámina
   entra a `MenuScene`.
3. **Avance manual:** pulsar `ESPACIO` (o `ENTER`, o hacer click en cualquier
   sitio que no sea el botón) → salta a la lámina siguiente y el contador se
   reancla (`00:15`, `00:10`, `00:05`).
4. **Botón Saltar (lo importante para la revisión):** está arriba a la derecha y
   se ve en todo momento, en todas las láminas. Al pasar el ratón se pone blanco
   y suena el hover. Al hacer click, fundido a negro e ir directo al menú.
   `ESC` hace exactamente lo mismo desde el teclado.
5. **Rejugar la historia:** en el menú, botón **Historia** → vuelve a la intro
   con la música sin cortarse. Comprobar de paso que las cinco entradas del menú
   (Nivel 1 / Nivel 2 / Historia / Créditos / Salir) caben en pantalla.
6. **Overlay del Nivel 1:** entrar a Nivel 1 → aparece el panel con
   `Nivel 1: Almacén Industrial`, `Héroe: Monje Chi`, el texto de contexto y las
   cinco filas de teclas. Dejarlo estar ~4 s: se funde solo. Volver a entrar y
   pulsar cualquier tecla pasado el primer segundo: se cierra al momento.
   Mientras está visible, mover al personaje con `A`/`D` para comprobar que el
   juego responde igual (no pausa ni traga input).
7. **Overlay del Nivel 2:** igual, con `Nivel 2: Fortaleza Industrial` y
   `Héroe: Thor`. El panel debe verse **del mismo tamaño** que en Nivel 1 pese
   al zoom 1.5 de la cámara.
8. **Que el mapeo manda:** cambiar por ejemplo `ATTACK: 'J'` por `ATTACK: 'K'`
   en `src/config/constants.js`, recargar y entrar a un nivel: el overlay debe
   decir `K` sin haber tocado ningún otro archivo. (Deshacer el cambio después.)

### Verificación hecha

Recorrido completo Boot → Intro (4 láminas, avance manual y automático) → Saltar
con `ESC` → Menú → Nivel 1 → Nivel 2, **sin un solo error ni warning en
consola** (solo el banner de versión de Phaser). Comprobado además que el panel
se destruye por temporizador y por tecla, y que la tecla que lo cierra sigue
llegando al jugador.
