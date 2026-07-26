# CAMBIOS F1 — Cámara unificada y diferenciación del Nivel 2

**Categoría de rúbrica:** Diseño de Niveles
**Hallazgos resueltos:** H03, H06, H18
**Rama:** trabajo hecho sobre `feat/fernando-hud-objetivo` (ver §5)

---

## F1.a — Cámara unificada (H03)

### Problema

`Nivel1Scene` nunca llamaba a `setZoom`, así que se quedaba en el 1.0 por
defecto: los mapas miden 40×15 tiles = 1280×480, exactamente el viewport, de
modo que la cámara mostraba el nivel entero sin scroll y el personaje se veía
pequeño y lejano. `Nivel2Scene` hacía `setZoom(1.5)` con el literal suelto. Al
cambiar de nivel, la perspectiva y el tamaño del héroe daban un salto.

### Solución

Nueva constante en `constants.js`:

```js
export const CAMERA_ZOOM = 1.5;
```

Las dos escenas la aplican en el mismo punto, después de `setBounds` y
`startFollow`. Ninguna queda sin `setZoom` ni con un 1.5 a pelo.

- **`setBounds`** ya estaba en ambas con `mapa.widthInPixels/heightInPixels`, y
  ahora es lo que impide ver fuera del nivel: con zoom 1.5 la cámara del Nivel 1
  empieza a recortar y a hacer scroll, cosa que antes no pasaba.
- **`startFollow`** sigue con el mismo lerp suave (0.08) en las dos.
- **Orden importante:** `setZoom` va **antes** de `createDamageFlash()`, porque
  el rectángulo del destello se escala por `1/zoom` en su creación. En el Nivel 1
  hubo que moverlo a ese punto; el Nivel 2 ya lo tenía así.
- El overlay de controles (`LevelIntroOverlay`) y el `damageFeedback` (que
  divide entre `zoom²`) **no se han modificado**: ambos leen `cam.zoom` en
  tiempo de ejecución, así que se adaptan solos. Solo se actualizaron sus
  comentarios, que decían "Nivel 1 (zoom 1)" y ya no era cierto.

---

## F1.b — Tileset propio para el Nivel 2 (H06)

### Problema

`BootScene` cargaba `tiles-nivel1` y `tiles-nivel2` **desde el mismo archivo**
(`background.png`), y los dos mapas declaraban internamente el mismo tileset
`background`. `background-industrial.png` existía sin que nadie lo cargara. Por
eso los dos niveles se veían idénticos.

### Por qué no bastaba cambiar el `load`

Los dos atlas no tienen la misma rejilla, así que los GIDs no se corresponden:

| Atlas | Tamaño | Rejilla |
|---|---|---|
| `background.png` | 306×306 | 9×9 = 81 tiles, margen 1, spacing 2 |
| `background-industrial.png` | 632×258 | **no es rejilla uniforme** |

Analizando los *gutters* transparentes de la hoja industrial: hay separaciones
limpias cada 34 px (margen 1 + tile 32 + spacing 2) **solo hasta x=374**. A
partir de ahí el tercio derecho de la hoja es arte compuesto (muros grandes y
maquinaria) sin separaciones, no indexable por tiles. Y las filas se acaban en
y=203. Es decir: el bloque con rejilla válida es de **12 columnas × 6 filas**.

Además, 632 y 258 no son múltiplos enteros de 34, así que Phaser habría
avisado por consola (`Image tile area not tile size multiple`) y habría
truncado la rejilla.

### Lo que se hizo

**1. Atlas recortado.** Se generó `assets/tilesets/industrial-tiles.png`
(408×204 = 12×6 tiles, margen 1, spacing 2) recortando el bloque válido de
`background-industrial.png`. El original **no se ha tocado**. Con esas medidas
la división de Phaser da exactamente 12.0 × 6.0, sin avisos.

**2. Remapeo de `nivel-2.json` por autotileado.** No se hizo una tabla
GID→GID: las gramáticas de los dos tilesets no se corresponden (uno son paneles
metálicos con franjas de peligro, el otro sillería de piedra). En su lugar, cada
celda sólida elige su tile **según qué vecinos tiene sólidos**:

| Situación de la celda | Tile industrial |
|---|---|
| Sin sólido arriba **ni** abajo (plataforma de un tile) | 26 / 27 / 28 (banda arriba + viga abajo) |
| Sin sólido arriba (cara pisable) | 0 / 1 / 2 (banda de piedra clara) |
| Sin sólido abajo (cara inferior) | 17 / 18 / 19 (banda abajo) |
| Columna estrecha (sin sólido a los lados) | 12 |
| Solo un costado expuesto | 23 / 24 |
| Interior | 37-40, con panel de maquinaria (55) disperso como acento |

Las variantes izquierda/derecha se eligen según el costado expuesto, así que las
esquinas quedan rematadas.

**3. Colisiones garantizadas, no "comprobadas a ojo".** `Nivel2Scene` usa
`setCollisionByExclusion([-1, 0])`: es sólido *todo* tile distinto de 0. Por eso
el remapeo lleva un `assert` que exige que la máscara de celdas ocupadas sea
idéntica antes y después. Salió idéntica: **194 tiles sólidos**, los mismos y en
las mismas posiciones. La geometría jugable del Nivel 2 no ha cambiado ni un
píxel — solo su aspecto.

**4. Código.**
- `BootScene.preload()`: `tiles-nivel2` apunta a `industrial-tiles.png`.
  `tiles-nivel1` sin tocar, y `create()` sin tocar.
- `Nivel2Scene`: `addTilesetImage('industrial', 'tiles-nivel2')` — el nombre
  interno del tileset tras el remapeo es **`industrial`** (antes `background`).

**5. Fondo.** No hay una segunda imagen de fondo en el proyecto, así que el
Nivel 2 tiñe el mismo `bg-real` con `setTint(0xd8a878)`. Se probó antes un azul
frío (`0x7f9fd8`), pero la piedra del tileset nuevo ya es azul y las plataformas
se perdían contra el cielo; el ámbar de humo las recorta y aleja la Fortaleza
del malva del Almacén.

---

## H18 — Enemigos que aparecían en el aire

Se calculó la superficie real de cada plataforma leyendo los mapas, y la `y` de
spawn como `superficie − media altura del cuerpo` (patrullero 40/2 = 20,
perseguidor 48/2 = 24).

**Nivel 1** — los comentarios describían plataformas que no eran las de sus
coordenadas:

| Enemigo | Antes | Ahora | Plataforma real |
|---|---|---|---|
| Patrullero A | `(800, 35)` | `(800, 44)` | filas 2-3, cols 24-32 → superficie y=64 |
| Patrullero B | `(350, 390)` | `(350, 396)` | filas 13-14, cols 9-13 → y=416 |
| Perseguidor | `(800, 295)` | `(800, 296)` | filas 10-14, cols 20-32 → y=320 |

**Nivel 2** — aquí había dos fallos de verdad:

| Enemigo | Antes | Ahora | Motivo |
|---|---|---|---|
| Patrullero A | `(30, 40)` | `(60, 76)` | caía 36 px hasta la torre izquierda (y=96) |
| Patrullero B | `(800, 40)` | `(900, 76)` | **aparecía fuera de sus propios límites** (820-1070) y en el aire |
| Perseguidor | `(800, 295)` | `(700, 424)` | estaba **incrustado dentro** del tile de la repisa de la fila 9; la física lo expulsaba al empezar. Pasa a la planta baja (fila 14, cols 7-26, y=448), donde además tiene recorrido para perseguir |

---

## Verificación

Comprobado aquí:

- `node --check` en las cuatro fuentes modificadas.
- `assert` de máscara de colisión idéntica en el remapeo (194 tiles sólidos).
- Ningún GID del mapa se sale del rango del tileset nuevo (máx. 72).
- `industrial-tiles.png` responde HTTP 200.
- Render offline del Nivel 2 con el atlas y el mapa nuevos, para elegir el tinte.

**Pendiente de probar en navegador** (aquí no hay ninguno):

```bash
python -m http.server 8000   # Ctrl+Shift+R
```

- [ ] El personaje del Nivel 1 se ve del mismo tamaño que Thor en el Nivel 2
- [ ] La cámara sigue al jugador con scroll suave en **ambos** niveles
- [ ] No se ve fuera del mapa en los bordes ni quedan zonas inalcanzables
- [ ] El overlay de controles y el flash de daño se ven bien en el Nivel 1 con
      su zoom nuevo
- [ ] El Nivel 2 se ve claramente distinto (piedra de fortaleza, cielo ámbar)
- [ ] Las plataformas del Nivel 2 siguen sólidas: no se cae a través ni se
      atasca
- [ ] Los enemigos aparecen de pie sobre su plataforma, sin caer del cielo
- [ ] Sin errores de consola ni 404

## Notas

- El único asset nuevo es `assets/tilesets/industrial-tiles.png`, derivado por
  recorte de `background-industrial.png`, que sigue en el repositorio intacto.
- El remapeo se hizo por script y no en Tiled. El mapa resultante es un JSON de
  Tiled válido (mismo formato, versión y estructura), así que se puede seguir
  abriendo y editando en Tiled 1.12 contra el atlas nuevo.
- Al subir el Nivel 1 a zoom 1.5, los paneles del HUD (F2) tapan bastante menos
  mundo que en las capturas anteriores, porque la cámara ya recorta.
