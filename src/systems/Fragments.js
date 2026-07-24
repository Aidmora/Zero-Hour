// ── Fragmentos del código de desactivación (mejora H09) ──
// Sustituyen a las estrellas doradas: donde antes había un chorro infinito de
// coleccionables genéricos, ahora hay un set FINITO de piezas del código que
// desactiva la bomba. Reunirlas todas ES la condición de victoria del nivel.
//
// La lógica vive aquí y no en cada escena por dos motivos:
//   1. BootScene.create() es zona de otro integrante y no se puede tocar, así
//      que la textura del chip se genera desde este módulo.
//   2. Nivel1 y Nivel2 deben comportarse EXACTAMENTE igual; compartiendo el
//      módulo no pueden divergir aunque alguien edite solo una de las dos.

export const FRAGMENT_TEXTURE = 'fragment';

// ── Paleta cyberpunk del chip ──
const CHIP_BODY   = 0x0b2f3a; // relleno del hexágono (cian muy oscuro)
const CHIP_EDGE   = 0x00ffff; // borde y patillas
const CHIP_CORE   = 0x66ffe0; // núcleo del circuito
const CHIP_SHADOW = 0x061a20; // hueco central, para que el núcleo tenga relieve

const CHIP_SIZE = 24; // mismo tamaño que la estrella: el body de 20×20 sigue valiendo

// ── Presupuesto de salto, en tiles de 32 px ──
// Con los valores actuales de constants.js (salto -500 y doble -550, ambos
// ×0.75 por JUMP_HEIGHT_FACTOR, gravedad 900):
//   salto simple    → 375² / (2·900) ≈  78 px  (2.4 tiles)
//   doble salto     →                 ≈ 172 px (5.4 tiles)
//   alcance horiz.  →                 ≈ 328 px (10 tiles)
// Los márgenes de abajo son deliberadamente conservadores para que llegar a un
// fragmento nunca dependa de un salto al límite. Y la regla es SIMÉTRICA
// (se compara |dy|, no el desnivel con signo): todo sitio al que se puede
// llegar es también un sitio del que se puede salir, así ningún fragmento deja
// al jugador atrapado en una plataforma sin retorno.
const MAX_RISE_TILES = 3;
const MAX_GAP_TILES  = 5;

const LABEL_DEPTH = 900;

/**
 * Genera la textura del fragmento si aún no existe: un chip hexagonal cian con
 * patillas y núcleo de circuito. Se llama sola desde spawnFragments().
 * @param {Phaser.Scene} scene
 */
export function ensureFragmentTexture(scene) {
    if (scene.textures.exists(FRAGMENT_TEXTURE)) return;

    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = CHIP_SIZE / 2;

    // Patillas del encapsulado (arriba, abajo, izquierda, derecha).
    g.fillStyle(CHIP_EDGE, 1);
    g.fillRect(0, c - 1, 5, 2);
    g.fillRect(CHIP_SIZE - 5, c - 1, 5, 2);
    g.fillRect(c - 1, 0, 2, 5);
    g.fillRect(c - 1, CHIP_SIZE - 5, 2, 5);

    // Cuerpo hexagonal (plano arriba y abajo, puntas a los lados).
    const radius = 10;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = c + Math.cos(angle) * radius;
        const y = c + Math.sin(angle) * radius;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle(CHIP_BODY, 1);
    g.fillPath();
    g.lineStyle(2, CHIP_EDGE, 1);
    g.strokePath();

    // Trazas del circuito: dos pistas horizontales hacia el núcleo.
    g.fillStyle(CHIP_EDGE, 0.7);
    g.fillRect(4, c - 5, 5, 1);
    g.fillRect(CHIP_SIZE - 9, c + 4, 5, 1);

    // Núcleo: cuadrado brillante con hueco, se lee como el dato guardado.
    g.fillStyle(CHIP_CORE, 1);
    g.fillRect(c - 4, c - 4, 8, 8);
    g.fillStyle(CHIP_SHADOW, 1);
    g.fillRect(c - 2, c - 2, 4, 4);

    g.generateTexture(FRAGMENT_TEXTURE, CHIP_SIZE, CHIP_SIZE);
    g.destroy();
}

// Huecos donde el jugador puede plantarse: tile vacío, con suelo justo debajo
// y otro tile libre encima. Los dos tiles libres (64 px) son lo que necesita el
// cuerpo del jugador (46 px) para caber de pie; sin esa comprobación se podían
// colocar fragmentos en ranuras de un solo tile, imposibles de tocar.
function findLandingSpots(map, layer) {
    const spots = [];
    for (let ty = 1; ty < map.height - 1; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
            const here  = layer.getTileAt(tx, ty);
            const above = layer.getTileAt(tx, ty - 1);
            const below = layer.getTileAt(tx, ty + 1);
            if (!here && !above && below) spots.push({ tx, ty });
        }
    }
    return spots;
}

// Suelo del que arranca el jugador. Aparece en el aire, así que su punto de
// partida real es el primer hueco de su columna POR DEBAJO del spawn; si esa
// columna no tuviera ninguno, se coge el hueco más cercano.
function findStartSpot(spots, startTx, startTy) {
    let best      = null;
    let bestScore = Infinity;
    for (const spot of spots) {
        const dy    = spot.ty - startTy;
        const score = Math.abs(spot.tx - startTx) * 100 + (dy >= 0 ? dy : 1000 - dy);
        if (score < bestScore) {
            bestScore = score;
            best      = spot;
        }
    }
    return best;
}

// Recorrido en anchura por los huecos: dos son contiguos si el salto los une
// (ver MAX_RISE_TILES / MAX_GAP_TILES). Es una aproximación —no mira paredes
// intermedias— pero con márgenes conservadores basta para descartar las
// plataformas decorativas a las que no se llega nunca.
function reachableFrom(spots, start) {
    const seen  = new Set([start]);
    const queue = [start];

    while (queue.length) {
        const current = queue.shift();
        for (const spot of spots) {
            if (seen.has(spot)) continue;
            if (Math.abs(spot.tx - current.tx) > MAX_GAP_TILES)  continue;
            if (Math.abs(spot.ty - current.ty) > MAX_RISE_TILES) continue;
            seen.add(spot);
            queue.push(spot);
        }
    }

    return spots.filter((spot) => seen.has(spot));
}

// Hueco más lejano de un conjunto de referencias (distancia al más próximo).
function farthestFrom(spots, refs) {
    let best     = spots[0];
    let bestDist = -Infinity;
    for (const spot of spots) {
        let dist = Infinity;
        for (const ref of refs) {
            dist = Math.min(dist, Math.hypot(spot.tx - ref.tx, spot.ty - ref.ty));
        }
        if (dist > bestDist) {
            bestDist = dist;
            best     = spot;
        }
    }
    return best;
}

// Muestreo del punto más lejano: se siembra con el hueco más alejado del punto
// de aparición y cada fragmento siguiente se coloca en el hueco más lejano de
// todos los ya colocados. Reparte las piezas por el nivel en vez de
// amontonarlas, y al ser determinista el recorrido es el mismo en cada partida
// (se puede diseñar y probar la ruta, cosa que el azar impedía).
function pickSpreadSpots(spots, count, start) {
    if (spots.length <= count) return spots.slice();

    const chosen = [farthestFrom(spots, [start])];
    while (chosen.length < count) {
        const rest = spots.filter((spot) => !chosen.includes(spot));
        if (!rest.length) break;
        chosen.push(farthestFrom(rest, chosen));
    }
    return chosen;
}

function createFragment(scene, group, map, spot) {
    const wx = spot.tx * map.tileWidth  + map.tileWidth  / 2;
    const wy = spot.ty * map.tileHeight + map.tileHeight / 2;

    const fragment = group.create(wx, wy, FRAGMENT_TEXTURE);
    fragment.setOrigin(0.5, 0.5);
    fragment.body.setSize(20, 20).setOffset(2, 2);

    // Flotación + pulso de holograma. El chip NO gira como giraba la estrella:
    // rotando sobre su propio plano se leía como una pieza suelta cayendo, no
    // como un dato suspendido esperando a ser recuperado.
    scene.tweens.add({
        targets:  fragment,
        y:        wy - 4,
        duration: 800,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut'
    });
    scene.tweens.add({
        targets:  fragment,
        alpha:    0.7,
        scale:    1.1,
        duration: 600,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut'
    });

    return fragment;
}

/**
 * Coloca los fragmentos del nivel y devuelve CUÁNTOS se colocaron de verdad.
 * Ese número es el que debe usarse como total: si un mapa no diera para tantos
 * huecos alcanzables, la victoria sigue siendo posible en vez de quedar
 * bloqueada pidiendo una pieza que no existe.
 *
 * @param {Phaser.Scene} scene
 * @param {object} options
 * @param {Phaser.Physics.Arcade.Group} options.group grupo donde se crean
 * @param {Phaser.Tilemaps.TilemapLayer} options.layer capa de colisión
 * @param {Phaser.Tilemaps.Tilemap}      options.map   mapa del nivel
 * @param {number} options.count  fragmentos deseados (FRAGMENTS_PER_LEVEL)
 * @param {number} options.startX x del punto de aparición del jugador (px)
 * @param {number} options.startY y del punto de aparición del jugador (px)
 * @returns {number} fragmentos realmente creados
 */
export function spawnFragments(scene, options) {
    const { group, layer, map, count, startX, startY } = options;

    ensureFragmentTexture(scene);

    const spots = findLandingSpots(map, layer);
    if (!spots.length) {
        console.warn('[Fragments] El mapa no tiene ninguna superficie válida; nivel sin fragmentos.');
        return 0;
    }

    const start     = findStartSpot(spots, Math.floor(startX / map.tileWidth), Math.floor(startY / map.tileHeight));
    const reachable = reachableFrom(spots, start);
    const picked    = pickSpreadSpots(reachable, count, start);

    for (const spot of picked) createFragment(scene, group, map, spot);

    if (picked.length < count) {
        console.warn(`[Fragments] Solo ${picked.length} de ${count} posiciones alcanzables; el nivel se gana con ${picked.length}.`);
    }

    return picked.length;
}

/**
 * Feedback de recogida: el "ghost" que crece y se desvanece (heredado de las
 * estrellas, ahora con el chip) más un contador flotante.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} collected
 * @param {number} total
 */
export function playFragmentPickupFx(scene, x, y, collected, total) {
    const ghost = scene.add.sprite(x, y, FRAGMENT_TEXTURE);
    scene.tweens.add({
        targets:    ghost,
        scale:      2,
        alpha:      0,
        duration:   300,
        onComplete: () => ghost.destroy()
    });

    // Nivel 2 tiene la cámara a 1.5×: sin compensar el zoom el texto saldría
    // un 50 % más grande que en Nivel 1.
    const label = scene.add.text(x, y - 14, `+1 FRAGMENTO  ${collected}/${total}`, {
        fontFamily: 'monospace',
        fontSize:   '14px',
        fontStyle:  'bold',
        color:      '#00ffff'
    }).setOrigin(0.5).setDepth(LABEL_DEPTH).setScale(1 / scene.cameras.main.zoom);

    scene.tweens.add({
        targets:    label,
        y:          y - 46,
        alpha:      0,
        duration:   750,
        ease:       'Sine.easeOut',
        onComplete: () => label.destroy()
    });
}
