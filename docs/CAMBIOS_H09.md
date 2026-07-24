# Mejora H09 — Fragmentos del código de desactivación

Resuelve el hallazgo **H09** del `INFORME_PLAYTESTING.md`: *"Coleccionables
genéricos: estrellas doradas, no fragmentos del código de desactivación.
Respawnean infinitamente → no hay sensación de juntar el código."*

Las estrellas doradas infinitas pasan a ser un set **finito** de piezas del
código, repartidas por el nivel, con contador de progreso y victoria al
reunirlas todas.

---

## 1. Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/systems/Fragments.js` | **NUEVO.** Textura del chip, colocación de los fragmentos (reparto + filtro de alcanzabilidad) y feedback de recogida. |
| `src/config/constants.js` | Nueva constante `FRAGMENTS_PER_LEVEL = 6`. `COLLECTIBLE_COUNT` queda declarada pero ya no la usa nadie. |
| `src/scenes/Nivel1Scene.js` | Fragmentos en vez de estrellas; sin respawn; contador; victoria por fragmentos. |
| `src/scenes/Nivel2Scene.js` | Exactamente los mismos cambios (verificado con `diff` de ambos parches: idénticos línea a línea). |

**No se tocó** `UIScene.js`, `src/entities/`, los mapas JSON, `BootScene.js`
(ni `preload()` ni `create()`), el mapeo de teclas, ni la lógica de
movimiento / dash / combo de E1 y A1.

La textura `'star'` que genera `BootScene.create()` sigue ahí intacta;
simplemente ya no la usa ninguna escena.

---

## 2. `FRAGMENTS_PER_LEVEL = 6`

Seis piezas por nivel. Los dos mapas miden 40×15 tiles (1280×480 px) y con seis
fragmentos el reparto obliga a recorrer el mapa de punta a punta sin convertirse
en farmeo. Posiciones que salen hoy (deterministas, ver §4):

| Nivel | Tiles (x, y) | Píxeles |
|---|---|---|
| 1 | (39,3) (0,12) (19,4) (29,9) (11,12) (27,1) | (1264,112) (16,400) (624,144) (944,304) (368,400) (880,48) |
| 2 | (33,2) (0,2) (16,10) (26,13) (10,3) (23,5) | (1072,80) (16,80) (528,336) (848,432) (336,112) (752,176) |

> ⚠️ **Aviso para quien lleve H10 (temporizador):** Nivel 2 mantiene sus 60 s.
> Reunir los 6 fragmentos en ese tiempo es exigente, porque la ruta obliga a
> bajar a la plataforma del fondo y volver a subir. Antes esto no se notaba
> porque la meta (`score >= 300`) era directamente inalcanzable en 60 s y nadie
> ganaba el nivel de todos modos. Si al probar resulta injusto, la palanca es el
> timer de `Nivel2Scene` (o bajar la constante a 5), no volver al respawn.

---

## 3. Evento para el HUD — **para Fernando**

El nivel **solo emite la señal**; conectarla al HUD es trabajo de `UIScene.js`,
que no se tocó.

**Nombre exacto del evento:**

```
'fragments-changed'
```

**Payload exacto** (un único argumento, objeto plano):

```js
{ collected: number, total: number }
```

**Emisor** (en `Nivel1Scene.js` y `Nivel2Scene.js`, método `emitFragmentProgress()`):

```js
this.registry.events.emit('fragments-changed', {
    collected: this.fragmentsCollected,
    total:     this.fragmentsTotal
});
```

**Cómo consumirlo** desde `UIScene.create()`, igual que los eventos ya existentes:

```js
this.fragmentsHandler = ({ collected, total }) => {
    this.fragmentsText.setText(`Fragmentos: ${collected}/${total}`);
};
reg.on('fragments-changed', this.fragmentsHandler);
// y en el shutdown:
reg.off('fragments-changed', this.fragmentsHandler);
```

**Cuándo se emite:**

1. **Al montar el nivel**, con `{ collected: 0, total: 6 }`.
   Ojo al detalle de orden: los fragmentos se colocan antes de
   `this.scene.launch('UIScene')`, y el `create()` de UIScene no corre hasta el
   frame siguiente. Si se emitiera en el momento de colocarlos, **nadie
   escucharía el valor inicial**. Por eso la escena espera a que el HUD esté
   montado:

   ```js
   this.scene.launch('UIScene');
   if (this.scene.isActive('UIScene')) {
       this.emitFragmentProgress();
   } else {
       this.scene.get('UIScene').events.once('create', () => this.emitFragmentProgress());
   }
   ```

   Es decir: el HUD **sí** recibe el `0/6` inicial, no hace falta inicializar el
   texto a mano (aunque un valor por defecto tampoco estorba).
2. **En cada recogida**, con el valor ya incrementado: `1/6`, `2/6`… `6/6`.

`total` es el número de fragmentos **realmente colocados**, no la constante:
si un mapa no diera para seis huecos alcanzables, `spawnFragments()` avisa por
consola y el nivel se gana con los que haya, en vez de quedar bloqueado.

Los eventos `'score-changed'`, `'lives-changed'`, `'dash-ready'` y
`'time-changed'` siguen exactamente igual. Recoger un fragmento **sigue sumando**
`SCORE_PER_COLLECTIBLE` (10) y emitiendo `'score-changed'`.

---

## 4. Qué cambió por dentro

### a) Sprite propio (`FRAGMENT_TEXTURE = 'fragment'`)

No hay ningún asset de chip en `assets/sprites/`, así que la textura se genera
por código — pero **dentro de `src/systems/Fragments.js`**, no en
`BootScene.create()`, que es zona de otro integrante. `ensureFragmentTexture()`
es idempotente (comprueba `textures.exists`) y la llama sola `spawnFragments()`.

Es un chip hexagonal de 24×24 con la paleta cyberpunk del juego: cuerpo cian
muy oscuro, borde y patillas en `0x00ffff`, dos trazas de circuito y un núcleo
hueco en `0x66ffe0`. No se confunde con la estrella dorada ni de lejos.

### b) Finitos y sin respawn

- Desaparecen `spawnInitialCollectibles()` y `spawnCollectibleAtRandomSpot()`.
- **Se elimina el `this.time.delayedCall(500, () => this.spawnCollectibleAtRandomSpot())`**
  del final del método de recogida. Ese era el respawn infinito.
- El grupo pasa a llamarse `this.fragments` y el handler `onCollectFragment()`.

### c) Reparto que invita a explorar, y alcanzable

La regla vieja ("tile vacío con suelo debajo") se conserva pero se le añaden
tres cosas:

1. **Hueco de dos tiles.** También se exige que el tile de encima esté vacío:
   64 px es lo que necesita el cuerpo del jugador (46 px) para caber de pie. Sin
   esto se podían colocar piezas en ranuras de un solo tile, imposibles de tocar
   (en `nivel-2.json` hay una entre la plataforma de la fila 3 y el pilar de la 5).
2. **Filtro de alcanzabilidad.** Recorrido en anchura desde el suelo bajo el
   punto de aparición del jugador; dos huecos se consideran unidos si
   `|Δx| ≤ 5` tiles y `|Δy| ≤ 3` tiles. Los márgenes son conservadores a
   propósito: con las constantes actuales el salto simple sube ~78 px (2.4
   tiles), el doble ~172 px (5.4 tiles) y el alcance horizontal ~328 px (10
   tiles), así que llegar a un fragmento nunca depende de un salto al límite.
   La regla es **simétrica** (`|Δy|`, no el desnivel con signo): todo sitio al
   que se llega es también un sitio del que se sale, así ninguna pieza deja al
   jugador atrapado en una plataforma sin retorno. Esto descarta, por ejemplo,
   la repisa aislada de `x = 35..39` en `nivel-2.json`.
3. **Reparto por muestreo del punto más lejano.** Se siembra con el hueco más
   alejado del spawn y cada pieza siguiente va al hueco más lejano de todas las
   ya colocadas. Resultado: las seis quedan repartidas por el ancho y por las
   alturas del mapa, no amontonadas. Al ser **determinista**, la ruta es la
   misma en cada partida y se puede diseñar y probar (con el azar anterior no
   se podía).

Limitación conocida: el grafo de alcanzabilidad no mira si hay una pared entre
dos huecos, solo la distancia. Las 12 posiciones que salen hoy se comprobaron a
mano contra la geometría de ambos mapas y todas son alcanzables; si alguien
edita un mapa, conviene volver a mirarlas.

### d) Victoria por reunir el código

```js
checkWinCondition() {
    if (this.fragmentsTotal > 0 && this.fragmentsCollected >= this.fragmentsTotal) {
        this.winGame();
    }
}
```

- Desaparece `this.targetScore = 300` de ambas escenas (no lo usaba nadie más).
- El flujo de victoria es el de siempre: `winGame()` reproduce `'sfx-victory'`
  vía `AudioManager` (que tolera el audio ausente sin romper) y llama a
  `leaveTo('Nivel2Scene')` en Nivel 1 y `leaveTo('CreditosScene')` en Nivel 2.
- El listener de `'enemy-killed'` **ya no llama** a `checkWinCondition()`: matar
  enemigos sigue puntuando, pero no puede ganar el nivel. La llamada habría
  quedado muerta.

### e) Feedback de recogida

Se conserva el "ghost" que crece a `scale: 2` y se desvanece en 300 ms, ahora
con el sprite del chip, y se le añade un texto flotante `+1 FRAGMENTO  X/6` que
sube y se desvanece en 750 ms. El texto se escala por `1 / cam.zoom` para que se
vea igual en Nivel 1 (zoom 1.0) y Nivel 2 (zoom 1.5).

Los fragmentos flotan (bob de 4 px) y pulsan en alpha/escala. **Ya no giran**
360° como la estrella: un chip rotando sobre su propio plano se leía como una
pieza cayendo, no como un dato suspendido.

---

## 5. Pasos de prueba

```bash
cd Zero-Hour
python -m http.server 8000
```

Abrir `http://localhost:8000` y **Ctrl+Shift+R** (recarga dura: `constants.js`
cachea con mucha alegría).

1. **Se ven como circuitos.** Saltar la intro (ESC) → *Jugar* → Nivel 1. Los
   coleccionables son hexágonos cian con patillas y núcleo, no estrellas
   doradas. Hay uno a la izquierda del punto de partida, casi a los pies.
2. **Son finitos y están repartidos.** Contar seis en el nivel, en alturas
   distintas: suelo izquierdo, suelo central, plataforma grande, plataforma
   alta, repisa pequeña y repisa de la derecha del todo.
3. **No respawnean.** Recoger uno y esperar 2-3 segundos mirando el sitio: no
   reaparece nada, ahí ni en otro punto del mapa.
4. **El contador sube.** Cada recogida saca el texto flotante `+1 FRAGMENTO
   X/6` y el *Score* sube de 10 en 10. En consola (F12) se puede seguir el
   evento con:
   ```js
   // pegar en la consola del navegador
   Phaser.Display.Canvas.CanvasPool.pool[0].parent.game
     .registry.events.on('fragments-changed', p => console.log('HUD:', p));
   ```
   (con el HUD ya conectado esto sobra: se verá en pantalla).
5. **Se gana al reunirlos todos.** Al recoger el sexto suena `sfx-victory` y se
   pasa a Nivel 2 — **sin** llegar a 300 puntos; se llega con 60 + lo que se
   haya sacado de enemigos.
6. **Nivel 2 igual.** Otros seis fragmentos, contador desde `0/6`, y al sexto se
   pasa a los créditos.

### Qué se comprobó ya

Recorrido completo Nivel 1 → Nivel 2 → Créditos ejecutado en el navegador
(Phaser 3.80.1, WebGL, sin errores en consola):

- `fragmentsTotal = 6` en ambos niveles, en las posiciones de la tabla de §2.
- Eventos recibidos, en orden: `0/6, 1/6, 2/6, 3/6, 4/6, 5/6, 6/6` en cada nivel
  — incluido el `0/6` inicial, ya con `UIScene` escuchando.
- `score` +10 por pieza (60 al completar el nivel).
- Fragmentos activos 6 → 0 sin que el grupo crezca: **cero respawns**.
- Al sexto: `isEnding = true`, `Nivel1Scene` → `Nivel2Scene` → `CreditosScene`,
  con `UIScene` cerrándose limpiamente.

Lo que **no** se probó tecla a tecla es cada salto de la ruta: la
alcanzabilidad de las 12 posiciones se validó con el modelo de §4(c) y a mano
contra la geometría de los mapas, no jugando cada salto. Conviene hacer una
pasada a mando antes de la entrega.

---

*No se hizo commit ni push.*
