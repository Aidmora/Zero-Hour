# CAMBIOS A1 — Controles unificados + ataque de Thor reactivado

**Hallazgos resueltos:** H01, H02, H13, H26
**Fecha:** 2026-07-23

---

## 1. Archivos tocados

| Archivo | Qué cambió |
|---------|-----------|
| `src/config/constants.js` | Nuevo objeto `KEYS` (esquema único de controles); nueva constante `JUMP_HEIGHT_FACTOR`; `DASH_VELOCITY` alineado al GDD (600 → 500). |
| `src/scenes/Nivel1Scene.js` | Input leído desde `KEYS`; dash y ataque usan `keys.dash` / `keys.attack`; salto en `keys.jump`; factor de salto desde constante. |
| `src/scenes/Nivel2Scene.js` | Mismo bloque de input que Nivel 1; **dash movido de SPACE a SHIFT**; **ataque de Thor mapeado a `J` y `doMeleeAttack()` llamado en `update()`**; factor de salto aplicado (antes no lo aplicaba). |
| `docs/CAMBIOS_A1.md` | Este documento. |

**No se tocó:** `BootScene.js`, `UIScene.js`, `src/entities/*`, mapas JSON, sistema de vidas/score/IA.

---

## 2. Mapeo de teclas: antes vs. después

### Antes (incoherente entre niveles)

| Acción | Nivel 1 | Nivel 2 |
|--------|---------|---------|
| Mover izq/der | A / D | A / D |
| Salto / doble salto | **W** | **W** |
| Dash | **SHIFT** | **SPACE** |
| Ataque melee | **SPACE** | **— (sin mapear, Thor no atacaba)** |
| Volver al menú | M | M |

*Problemas:* SPACE hacía ataque en N1 pero dash en N2; el ataque de Thor era inalcanzable; el dash de N1 estaba en una tecla lejana.

### Después (idéntico en ambos niveles, definido en `constants.KEYS`)

| Acción | Tecla |
|--------|-------|
| Mover izquierda | **A** |
| Mover derecha | **D** |
| Arriba / abajo (reservadas) | **W / S** |
| Salto / doble salto | **SPACE** |
| Dash | **SHIFT** |
| Ataque melee | **J** |
| Volver al menú | **M** |

Ambas escenas construyen el input con el mismo bloque, leyendo de `KEYS`. No quedan literales de tecla del esquema de juego sueltos en las escenas (las teclas debug `L`/`K` de H24 quedan intactas por estar fuera del alcance de A1).

---

## 3. Decisiones de valores

### `JUMP_HEIGHT_FACTOR = 0.75` (H13)
El factor ×0.75 que Nivel 1 aplicaba en línea (y Nivel 2 no) se centralizó en
`constants.js` y ahora se aplica **idéntico al salto y al doble salto en ambas
escenas**. Se eligió **0.75** (no 1.0) porque es el valor con el que se tuneó y
probó el plataformeo de Nivel 1; unificar hacia arriba (1.0) habría hecho los
saltos más altos y con riesgo de sobrepasar plataformas. El doble salto sigue
dando sobrada altura vertical a 0.75.

### `DASH_VELOCITY = 500` (H26)
Bajado de 600 a **500 px/s** para coincidir con el GDD. Verificado jugando: el
dash sigue sintiéndose ágil (200 ms de duración, 600 ms de cooldown sin cambios),
así que se mantiene en 500.

---

## 4. Cómo probar manualmente cada cambio

Levantar el servidor y abrir `http://localhost:8000`:

```
python -m http.server 8000
```

1. **Esquema unificado (H01)** — Entrar a **Nivel 1** y luego a **Nivel 2**.
   En ambos: `A`/`D` mueven, **`SPACE` salta**, **`SPACE` en el aire hace doble
   salto** (con partículas), **`SHIFT` hace dash** (tinte azul + estelas), `M`
   vuelve al menú. La misma tecla hace lo mismo en los dos niveles.

2. **Ataque de Thor (H02)** — En **Nivel 2**, pulsar **`J`**: Thor debe
   reproducir la animación de puñetazo (`p2-punch`, de `p2-attack-side`) y, al
   tercer golpe del combo, la patada/espadazo (`p2-kick`, de `p2-sword-slash`).
   Acercarse a un enemigo y atacar con `J` debe dañarlo/eliminarlo. Antes de este
   cambio, ninguna tecla atacaba y estas animaciones nunca se veían.

3. **Combo melee en Nivel 1** — Pulsar `J` repetidamente: punch → punch → kick,
   encadenando el combo completo (ver §5). (Antes el ataque estaba en SPACE.)

4. **Altura de salto unificada (H13)** — Saltar en Nivel 1 y en Nivel 2: la
   altura de salto simple y de doble salto debe sentirse igual en ambos.

5. **Dash 500 px/s (H26)** — Con `SHIFT`, comprobar que el dash sigue siendo
   útil para cruzar huecos; el indicador `DASH: LISTO` del HUD se apaga y vuelve
   tras el cooldown.

6. **Sin errores** — Consola del navegador (F12) sin errores al entrar y jugar
   ambos niveles.

**Verificado en esta sesión:** ambos niveles cargan sin errores de consola; el
ataque de Thor con `J` reproduce su animación; salto en SPACE, dash en SHIFT y
retorno al menú con `M` funcionan en ambas escenas.

---

## 5. Fix del combo melee punch-punch-kick

### El bug
El combo nunca encadenaba: solo salía el primer punch y el `comboStep` se
reiniciaba a 0 en cada golpe.

### Causa raíz
En `doMeleeAttack(time)` la ventana de combo se evaluaba como
`time - lastAttackTime > MELEE_COMBO_WINDOW_MS`, donde `lastAttackTime` era el
instante de **inicio** del golpe anterior. Pero `isAttacking` bloquea toda
entrada durante `duration + MELEE_COOLDOWN_MS` (antes 180 + 200 = 380 ms para el
punch). Con `MELEE_COMBO_WINDOW_MS = 400`, al desbloquearse el ataque quedaban
solo ~20 ms útiles para encadenar el segundo golpe (y ventana negativa para el
tercero). En la práctica el segundo input casi siempre llegaba fuera de plazo y
el combo se reseteaba.

### El arreglo
La ventana de combo ahora se mide **desde que termina el bloqueo del golpe
anterior**, no desde su inicio:

- Se guarda `this.attackEndsAt = time + duration + MELEE_COOLDOWN_MS`.
- El combo solo se reinicia cuando `time > this.attackEndsAt + MELEE_COMBO_WINDOW_MS`.
- Se eliminó `this.lastAttackTime` (reemplazado por `this.attackEndsAt`, inicializado
  en `create()` y reseteado en `loseLife()` junto con `comboStep`, para que tras
  recibir daño el combo empiece limpio).
- `this.player.anims.play(animKey, false)` — se cambió `ignoreIfPlaying` de `true`
  a `false` para que un segundo punch consecutivo (misma clave de animación)
  reinicie visualmente y se vea el impacto de cada golpe.

Aplicado **idéntico** en `Nivel1Scene.js` y `Nivel2Scene.js` (se mantiene la
paridad lograda en A1).

### Valores finales (`constants.js`)
| Constante | Antes | Ahora |
|-----------|-------|-------|
| `MELEE_COMBO_WINDOW_MS` | 400 | **350** |
| `MELEE_COOLDOWN_MS` | 200 | **150** |

Con la nueva lógica la ventana efectiva de encadenado es de **350 ms reales**
(desde que se libera el bloqueo), dentro del rango 300-400 ms buscado. Bajar el
cooldown a 150 ms hace la recuperación entre golpes más ágil sin permitir spam
(el bloqueo por golpe sigue siendo `duration + 150`).

### Verificación
Simulación determinista de la función pulsando `J` cada 360 ms:

- **Lógica vieja:** `PUNCH(step0) → BLOCKED → PUNCH(step0 de nuevo) → BLOCKED`
  (el combo se reinicia, nunca llega al kick).
- **Lógica nueva:** `PUNCH(step0) → PUNCH(step1) → KICK(step2)` — combo completo.

En juego (Nivel 1 y Nivel 2): pulsar `J` tres veces a ritmo natural encadena
punch → punch → kick sin errores de consola.

**Prueba manual:** en cualquier nivel, pulsar `J` tres veces seguidas a ritmo
cómodo (~3 golpes/segundo). Debe verse puñetazo, puñetazo y una patada/espadazo
distinto en el tercero. Esperar ~1 s sin atacar reinicia el combo al primer punch.

---

## 6. Fix del recorte del spritesheet del Monje Chi (Nivel 1)

### El bug
Las animaciones del héroe de Nivel 1 mostraban poses incorrectas: punch y kick se
veían iguales y el salto terminaba mostrando una patada.

### Causa raíz
`assets/sprites/player-1.png` mide **1106×180** → rejilla de **14 columnas × 3
filas = 42 frames de 79×60**. La constante estaba en `P1_FRAME_WIDTH = 82`, que
**no divide 1106** (`1106 / 82 = 13.49`): el recorte se desplazaba ~3 px por
columna y acumulaba desfase, mezclando dos poses en un mismo frame. Además, los
rangos de animación (`p1-punch` 24-29 y `p1-kick` 23-28) se solapaban en 5 de 6
frames, así que ambos golpes se veían iguales.

> El bug era **solo la constante de ancho** (más el remapeo de índices). El
> spritesheet no se modificó. Ancho correcto: **79** (`1106 / 79 = 14` exacto);
> alto sigue en **60** (`180 / 60 = 3`).

### Corrección
| Constante | Antes | Ahora |
|-----------|-------|-------|
| `P1_FRAME_WIDTH`  | 82 | **79** |
| `P1_FRAME_HEIGHT` | 60 | 60 (sin cambio) |

Sin `margin`/`spacing` ni escala: la imagen no tiene rejilla de guía y el frame
79×60 mantiene el tamaño original en pantalla. La creación del jugador conserva su
cuerpo físico `setSize(22, 46).setOffset(30, 12)`; solo el frame inicial pasó de
`20` a **32** (idle), para mostrar una pose de reposo al aparecer.

`BootScene` solo cambió en `preload()` (usa `P1_FRAME_WIDTH`/`P1_FRAME_HEIGHT`, sin
literales `82`). Los spritesheets de Thor (`player-2/`, archivos separados) se
verificaron: **todos dividen exacto por 128×96** (una fila cada uno) → correctos,
no se modificaron.

### Mapa índice → pose (rejilla 14×3, frames 0-41; 38-41 vacíos)
Verificado extrayendo los 42 frames a 79×60 (a un directorio temporal fuera del
repo) y examinándolos uno a uno:

| Frames | Pose | Uso |
|--------|------|-----|
| 0-1   | locomoción (zancada, capa al vuelo) | **walk** / jump / fall |
| 2-3   | agacharse / cargar (windup) | — |
| 4-8   | ataques bajos y de deslizamiento con chi | — |
| 9-11  | lanzamiento de disco de energía | — |
| 12-13 | giro de energía / golpe extendido bajo | — |
| 14    | windup de puñetazo | — |
| 15-16 | **PATADAS altas (arco azul)** | **kick** |
| 17    | puñetazo agachado | — |
| 18    | descenso con estela (air slash) | — |
| 19    | retroceso / guardia (brazos arriba) | **hurt** |
| 20    | golpe con brazo cargado | — |
| 21-24 | jabs / empuje frontal | — |
| 25-27 | carga y disparo de bola de energía | — |
| 28-31 | **PUÑETAZOS de energía frontales** | **punch** |
| 32-37 | idle (de pie, respirando) | **idle** |

### Rangos finales de animación (`Nivel1Scene.js`)
| Animación | Antes (grilla rota) | Ahora | frameRate |
|-----------|---------------------|-------|-----------|
| `p1-idle`  | 0-3   | **32-37** | 8 |
| `p1-walk`  | 30-35 | **0-1**   | 10 |
| `p1-jump`  | 0-6   | **1**     | — |
| `p1-fall`  | 6,5,4,3 | **0**   | — |
| `p1-hurt`  | 16-18 | **19**    | — |
| `p1-punch` | 24-29 | **28-31** | 16 |
| `p1-kick`  | 23-28 | **15-16** | 8 |

- **Requisito crítico cumplido:** `p1-punch` (28-31) y `p1-kick` (15-16) usan
  rangos completamente distintos, sin solaparse (antes se solapaban en 5 de 6
  frames). El spritesheet contiene múltiples ataques, así que no hizo falta
  diferenciar por velocidad/escala.
- **`p1-jump` sin frames de ataque:** usa el frame de locomoción 1 (antes 0-6
  arrastraba frames de ataque → la patada al doble saltar). El sheet no tiene una
  pose de salto/caída dedicada, así que jump/fall reutilizan la locomoción (0-1),
  igual criterio que el `p2-fall` de Nivel 2.

### Verificación
- En juego (archivo restaurado 1106×180): el Monje Chi se ve nítido, con tamaño y
  apoyo en el suelo correctos, **sin recorte ni bordes**. Idle (32) al aparecer y
  el punch muestra los puñetazos de energía (28-31); el salto ya **no** muestra
  una patada. Sin errores de consola propios del juego.
- Los índices confirmados: punch = 28-31 y kick = 15-16 son poses visiblemente
  distintas (puñetazo frontal vs. patada alta con arco azul).
- `git status` confirma que **`assets/` no tiene ningún cambio** (el spritesheet
  permanece intacto).

**Prueba manual:** entrar a Nivel 1 y observar cada estado — quieto (idle),
`A`/`D` (walk), `SPACE` (jump/fall, sin patada), recibir daño (hurt), `J` (punch)
y combo `J J J` (el tercero es la patada). Ninguna pose debe verse cortada.
