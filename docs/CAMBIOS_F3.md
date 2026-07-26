# CAMBIOS F3 (parcial) — Enemigos pixel-art

**Categoría de rúbrica:** Animaciones
**Hallazgo resuelto:** H05
**Alcance:** solo la sustitución de los enemigos cuadrados. H14 (frenado /
aterrizaje del jugador) y H15 (caída de Thor) quedan fuera de esta entrega.

---

## 1. Qué había

`BootScene.create()` generaba las dos texturas con `make.graphics`:

- `enemy-patrol`: cuadrado rojo de 32×32 con dos ojos.
- `enemy-chaser`: cuadrado morado de 40×40 con cara enojada.

Sin animación de ninguna clase. Todo el "feedback" era código:
`setTint(0xff0000)` 100 ms al recibir daño, `setTint(0xaa44ff)` mientras
perseguía, y un tween de `alpha` + `scale 0.1` + `angle 180` al morir. Junto a
un jugador pixel-art, parecían *placeholders* de prototipo.

## 2. Assets: qué se usa y qué no

Medidas verificadas sobre los propios PNG (cada hoja divide exacto por su ancho
de frame; ninguna quedó a medio píxel).

### Patrullero — `assets/sprites/enemies/enemy-patrol/` (seta), frame **80×64**

| Hoja | Frames | ¿Se usa? |
|---|---|---|
| `Mushroom-Run.png` | 8 | ✅ `enemy-patrol-walk` |
| `Mushroom-Die.png` | 15 | ✅ `enemy-patrol-die` |
| `Mushroom-Idle.png` | 7 | ❌ el patrullero **nunca se detiene** (`updateAI` fija velocidad en todos los frames) |
| `Mushroom-Hit.png` | 5 | ❌ tiene 1 HP y el melee hace 1 de daño: **muere del primer golpe**, nunca llega a estar herido |
| `Mushroom-Attack.png` | 10 | ❌ la IA no ataca, hace daño por contacto |
| `Mushroom-Stun.png` / `Mushroom-AttackWithStun.png` | 18 / 24 | ❌ no hay sistema de aturdimiento |

### Perseguidor — `assets/sprites/enemies/enemy-chaser/` (demonio), frame **81×71**

| Hoja | Frames | ¿Se usa? |
|---|---|---|
| `FLYING.png` | 4 | ✅ `enemy-chaser-fly` — persiguiendo |
| `IDLE.png` | 4 | ✅ `enemy-chaser-idle` — fuera del radio de detección |
| `HURT.png` | 4 | ✅ `enemy-chaser-hurt` — tiene 3 HP, sí se ve |
| `DEATH.png` | 7 | ✅ `enemy-chaser-die` — se deshace en humo |
| `ATTACK.png` | 8 | ❌ la IA no ataca, hace daño por contacto |

**Las hojas descartadas no se cargan.** Es deliberado: H16 del informe señala
justo eso —7 spritesheets de Thor que se descargan y no se muestran nunca— y no
tenía sentido repetirlo con los enemigos.

## 3. Tamaños y cuerpos de colisión

El dibujo no llena el frame, así que el cuerpo físico se ajusta al dibujo y no
al frame. Medido con el bounding box opaco de cada hoja:

| | Frame | Dibujo dentro del frame | Escala | Cuerpo (`setSize` + `setOffset`) |
|---|---|---|---|---|
| Patrullero | 80×64 | x 24-55, y 29-64 (apoyado abajo) | 1 | 30×34, offset (24, 30) |
| Perseguidor | 81×71 | 78×66 visibles | **0.65** | 44×56, offset (18, 10) → ~29×36 reales |

- **Por qué el patrullero lleva offset explícito:** su dibujo está pegado al
  borde inferior del frame. Un `setSize` centrado (lo que hacía el cuadrado)
  dejaría a la seta hundida media altura en el suelo.
- **Por qué el perseguidor se escala a 0.65:** a escala 1 mide 78 px de ancho,
  2,6 veces el jugador (17-29 px medidos en `player-1.png`). A 0.65 queda en
  ~51×43: más grande que el héroe, como corresponde al enemigo de 3 HP, sin
  parecer un jefe final.
- **El cuerpo del perseguidor cubre el torso, no las alas.** Recibir daño por
  la punta de un ala desplegada sería injusto, y las alas se mueven entre
  frames.

## 4. Cambios en código

### `BootScene`
- `preload()`: carga las 6 hojas con sus tamaños de frame reales.
- `create()`: **eliminada** la generación por `graphics` de `enemy-patrol` y
  `enemy-chaser`; en su lugar llama a `createEnemyAnimations()`.
- `createEnemyAnimations()`: registra las 6 animaciones. Van aquí y no en cada
  nivel porque el `AnimationManager` es global al juego: definidas una vez, las
  usan Nivel 1 y Nivel 2 sin poder divergir.

| Animación | Frames | fps | repeat |
|---|---|---|---|
| `enemy-patrol-walk` | 8 | 10 | ∞ |
| `enemy-patrol-die` | 15 | 14 | 0 |
| `enemy-chaser-idle` | 4 | 6 | ∞ |
| `enemy-chaser-fly` | 4 | 10 | ∞ |
| `enemy-chaser-hurt` | 4 | 12 | 0 |
| `enemy-chaser-die` | 7 | 10 | 0 |

### `entities/Enemy.js` (clase base)
- El constructor acepta un objeto `animKeys` (`{ idle, move, hurt, die }`). Lo
  que una subclase no declare, no se reproduce: un enemigo sin hoja de daño
  sigue funcionando.
- `playState(key)`: reproduce la animación de movimiento **respetando la de
  daño en curso**. Sin eso, el golpe se vería un solo frame antes de que
  `updateAI` volviera a poner la de caminar.
- `takeDamage()`: fuera el tinte rojo. El destello ya está dibujado en la hoja
  (el segundo frame del demonio es una silueta blanca).
- `die()`: fuera el tween de alpha + giro de 180°. Ahora reproduce la animación
  de muerte y solo cuando termina (`animationcomplete-<clave>`) oculta el
  sprite y programa el respawn de `ENEMY_RESPAWN_MS`.
- `respawn()`: se quitó el `setScale(1)` que deshacía el tween de muerte. Ya no
  hay tween, y dejarlo **habría roto la escala del perseguidor**, que
  reaparecería a tamaño 1 en vez de 0.65. Además ahora reinicia la animación,
  para que no vuelva congelado en el último frame de su muerte.

- `faceDirection(dir)` y `spriteFacesRight`: ver §4.b.

### `entities/PatrolEnemy.js`
Textura `enemy-patrol-walk`, cuerpo y offset propios, y `playState` en
`updateAI`.

### `entities/ChaserEnemy.js`
Textura `enemy-chaser-idle`, escala + cuerpo, y en `updateAI` el tinte morado se
sustituye por el cambio de animación: **el aviso de "te ha visto" pasa de ser un
cambio de color a que despliega las alas y arranca a volar**, que se lee sin
depender del color.

### 4.b — Orientación del sprite (corregido tras probarlo)

En la primera versión los dos enemigos caminaban **de espaldas**: mirando a la
izquierda al ir a la derecha y al revés.

La causa: las hojas de los enemigos están dibujadas **mirando a la izquierda**
—en el demonio se ve claro, la cola y el ala desplegada quedan detrás, a la
derecha—, mientras que las del jugador miran a la derecha. El
`setFlipX(direction < 0)` que venía de los cuadrados asume lo segundo.

En vez de invertir el signo en cada subclase, la clase base declara hacia dónde
mira el dibujo y centraliza el volteo:

```js
this.spriteFacesRight = false;   // las dos hojas miran a la izquierda

faceDirection(dir) {
    if (dir === 0) return;
    this.setFlipX(this.spriteFacesRight ? dir < 0 : dir > 0);
}
```

Así, si algún día se cambia una hoja por otra que mire a la derecha, basta con
poner esa propiedad a `true` en su subclase.

### Coordenadas de aparición (`Nivel1Scene` / `Nivel2Scene`)
Los sprites nuevos no tienen el cuerpo centrado como los cuadrados, así que hubo
que recalcular la `y` de aparición corregida en F1 (H18):

| | Distancia del centro al pie | `y` de aparición |
|---|---|---|
| Patrullero | +32 px | superficie − 34 |
| Perseguidor | +20 px | superficie − 24 |

Los 2-4 px de más son holgura deliberada: el enemigo se posa cayendo un instante
en lugar de arriesgarse a nacer dentro del tile (que es justo el fallo que tenía
el perseguidor del Nivel 2).

| Escena | Enemigo | Antes (F1) | Ahora |
|---|---|---|---|
| Nivel 1 | Patrullero A | `(800, 44)` | `(800, 30)` |
| Nivel 1 | Patrullero B | `(350, 396)` | `(350, 382)` |
| Nivel 1 | Perseguidor | `(800, 296)` | `(800, 296)` (sin cambio) |
| Nivel 2 | Patrullero A | `(60, 76)` | `(60, 62)` |
| Nivel 2 | Patrullero B | `(900, 76)` | `(900, 62)` |
| Nivel 2 | Perseguidor | `(700, 424)` | `(700, 424)` (sin cambio) |

## 5. Verificación

Comprobado aquí:

- `node --check` en las siete fuentes modificadas.
- Ninguna referencia viva a las texturas `'enemy-patrol'` / `'enemy-chaser'`
  eliminadas.
- Las 6 hojas responden HTTP 200.
- Cada hoja divide exacto por su ancho de frame (80 y 81).
- Render offline de los dos niveles con los enemigos compuestos en sus
  coordenadas y escalas reales: apoyan sobre la superficie y su tamaño encaja
  con el de los héroes.

**Pendiente de probar en navegador** (aquí no hay ninguno):

- [ ] Los enemigos se ven como pixel-art coherente, no como cuadrados
- [ ] La seta camina animada y se derrumba al morir
- [ ] El demonio está quieto hasta que te acercas y entonces vuela hacia ti
- [ ] El demonio parpadea en blanco al recibir cada uno de sus 3 golpes
- [ ] Tras morir reaparecen a los 5 s, con su animación y su escala correctas
      (el perseguidor **no** debe volver al doble de tamaño)
- [ ] Las colisiones siguen funcionando: te dañan al tocarte y el melee los mata
- [ ] Sin errores de consola en ambos niveles

## 6. Fuera de alcance

- **H14** — animación de frenado (skid) y de aterrizaje del jugador.
- **H15** — `p2-fall` sigue siendo un frame estático.
