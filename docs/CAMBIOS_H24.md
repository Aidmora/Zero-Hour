# H24 — Teclas de depuración desactivadas en la build de entrega

**Hallazgo:** `INFORME_PLAYTESTING.md`, fila H24 — *"Teclas debug activas en build:
`L` (perder vida), `K` (matar enemigo) … sin flag. Riesgo de trampa/accidente en
demo."*

**Solución aplicada:** un único flag `DEBUG_MODE` que condiciona **solo el
registro** de esos dos atajos de teclado. No se ha borrado ni una línea de la
lógica del juego.

---

## 1. Qué se ha desactivado

| Tecla | Acción | Estado en la entrega |
|-------|--------|----------------------|
| `L` | Quitar una vida (`loseLife()`) | **Desactivada** — el atajo no se registra |
| `K` | Matar al enemigo más cercano (`killNearestEnemy()`) | **Desactivada** — el atajo no se registra |
| `M` | Volver al menú | **Activa** — es del GDD, no depende del flag |

Con `DEBUG_MODE = false` los listeners de `L` y `K` **ni siquiera se crean**: no
es que se ignore la pulsación, es que Phaser no tiene nada suscrito a esas
teclas. Coste cero en tiempo de ejecución.

## 2. Qué NO se ha tocado (y por qué)

- **`loseLife()` no es solo debug.** Se sigue llamando desde `update()` cuando el
  jugador cae al vacío:
  `Nivel1Scene.js:309-311` y `Nivel2Scene.js:310-312`
  ```js
  if (this.player.y >= this.mapa.heightInPixels - FALL_DEATH_MARGIN_Y) {
      this.loseLife();
  }
  ```
  También lo usa el daño por contacto con enemigos. Borrar el método habría
  roto la muerte por caída y el sistema de vidas entero.
- **`killNearestEnemy()`** se conserva intacto como método de la escena; solo
  pierde su atajo de teclado.
- **`KEYS`** (`constants.js`) no se ha modificado: el debug nunca estuvo mapeado
  ahí, `L` y `K` iban con literales sueltos.
- `UIScene.js`, `src/entities/`, los mapas y `BootScene.create()` quedan igual.

## 3. Archivos modificados

### `src/config/constants.js`
Nueva constante, justo antes del bloque de *Enemigos*:

```js
// ── Modo depuración (H24) ──
// Activa las teclas de desarrollo dentro de los niveles:
//   L → quitar una vida al jugador (loseLife)
//   K → matar al enemigo más cercano (killNearestEnemy)
// ...
// DEBE QUEDAR EN false PARA LA ENTREGA
export const DEBUG_MODE           = false;
```

### `src/scenes/Nivel1Scene.js` y `src/scenes/Nivel2Scene.js`
Cambio **idéntico** en las dos escenas.

1. `DEBUG_MODE` añadido a la lista de imports desde `../config/constants.js`.
2. En `create()`, justo después del listener de la tecla `M`
   (`Nivel1Scene.js:273-280`, `Nivel2Scene.js:274-281`):

```js
// ── Teclas de desarrollo (H24) ──
// Solo se registran con DEBUG_MODE activo; en la build de entrega L y K
// no existen como atajo. loseLife/killNearestEnemy siguen intactos: la
// caída al vacío llama a loseLife desde update().
if (DEBUG_MODE) {
    this.input.keyboard.on('keydown-L', () => { this.loseLife(); });
    this.input.keyboard.on('keydown-K', () => { this.killNearestEnemy(); });
}
```

El cuerpo de los atajos es byte a byte el mismo de antes; lo único nuevo es el
`if` que lo envuelve.

## 4. Otros restos de desarrollo (revisados)

| Resto buscado | Resultado | Acción |
|---------------|-----------|--------|
| `console.log` de depuración en `src/` | 0 coincidencias | Nada que hacer |
| `debug: true` de Arcade Physics | Ya estaba en `false` (`src/main.js:26`) | Se deja como está |

El único mensaje que sale por consola al arrancar es el banner de la propia
librería Phaser v3.80.1, que no es del proyecto.

## 5. Cómo reactivar el modo debug

Abrir `src/config/constants.js`, buscar `DEBUG_MODE` y ponerlo en `true`:

```js
export const DEBUG_MODE           = true;
```

Guardar y recargar el navegador con **Ctrl+Shift+R** (recarga forzada: son
módulos ES servidos estáticamente y el navegador cachea `constants.js`). No hay
build ni proceso que reiniciar, más allá del `python -m http.server 8000`.

A partir de ahí, dentro de cualquiera de los dos niveles:
- `L` quita una vida.
- `K` mata al enemigo más cercano.

**Antes de entregar, volver a dejarlo en `false`.**

## 6. Verificación

Estático (hecho):
- `node --check` sobre los tres archivos modificados: sin errores de sintaxis.
- La llamada a `loseLife()` de la caída al vacío en `update()` sigue en su sitio
  en ambas escenas y está fuera del `if (DEBUG_MODE)`.
- Consola del navegador limpia al cargar el juego (solo el banner de Phaser).

En ejecución, con `DEBUG_MODE = false`, comprobar que:
- Pulsar `L` no quita vida.
- Pulsar `K` no mata enemigos.
- `M` sigue devolviendo al menú.
- Caer al vacío **sí** sigue quitando vida (se dispara desde `update()`, no
  desde la tecla).

Y con `DEBUG_MODE = true`, que `L` y `K` vuelven a funcionar.
