/* Fazendas de verdade, espalhadas pela ilha (cada uma com sua função e seus cercados dedicados):
   · Sítio das Aves — casa, galinheiro, horta e espantalho
   · Granja — celeiro, chiqueiro e curral de ovelhas
   · Fazenda do Gado — celeiro, silo, curral de vacas/boi e cocheira do cavalo
   Construções ficam na frente (lado da estrada) e os cercados atrás, para não esconderem nada.
   Montadas ANTES da fusão de cenário (mergeStatics); os animais vêm de farm.js. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { groundY, walkable, onRoad, SEA, isl, VX, VZ, flatten } from '../world/terrain.js';
import { N, V } from '../world/islandgen.js';
import { VILLAGE_R } from '../core/village-const.js';
import { pois } from '../world/pois.js';
import { makeNpc } from './npc.js';
import { initFarmer } from './farmer.js';
import { CLOCK } from '../core/clock.js';
import { HORSEMAN, FARMER_AVES, FARMER_GRANJA } from '../data/npcs.js';
import { ZONES } from '../world/reserve.js';
import { H } from '../world/terrain.js';
const E = N / 2;

export const FARMSITE = { ok: false, sites: [] };

// área de cada fazenda (coordenadas locais: +z = lado da estrada / portão)
const X0 = -15, X1 = 15, Z0 = -16, Z1 = 11;
const VARIANTS = [
  { id: 'aves', n: 'Sítio das Aves', ic: '🐔', npc: FARMER_AVES, v: 1, cols: [0xe0b090, 0xb04a6a, 0x6a4a30, 0xe8d8a0] },
  { id: 'granja', n: 'Granja', ic: '🐖', npc: FARMER_GRANJA, v: 2, cols: [0xd89c78, 0x4a6aa8, 0x3a3a50, 0x9a7a3a] },
  { id: 'gado', n: 'Fazenda do Gado', ic: '🐄', npc: HORSEMAN, v: 4, cols: [0xd8a880, 0x5a7a3a, 0x5a4020, 0xc8a050] },
];

/** Orientação: o portão (+z local) olha para o ponto `t` (estrada mais próxima) */
function frame(s) {
  const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz) || 1, fx = dx / d, fz = dz / d;
  return { fx, fz, th: Math.atan2(fx, fz) };
}
const toWorld = (s, f, lx, lz) => ({ x: s.x + f.fz * lx + f.fx * lz, z: s.z - f.fx * lx + f.fz * lz });

/** Pontos das estradas do gerador em coordenadas do jogo (a vila é a origem) */
function roadPts() {
  const out = [];
  for (const r of isl.roads) r.pts.forEach((p, i) => out.push({ x: p[0] - VX, z: p[1] - VZ, y: p[2], i, r }));
  return out;
}

/** Pontos ruins na área (água/estrada no meio = proibido; declive e terreno intransitável pesam). Menor é melhor; null = inviável */
function cost(s) {
  const f = frame(s);
  let bad = 0, sum = 0, n = 0, lo = 1e9, hi = -1e9;
  for (let lx = X0; lx <= X1; lx += 3) for (let lz = Z0; lz <= Z1 + 3; lz += 3) {
    const w = toWorld(s, f, lx, lz);
    if (lz < Z1 - 1 && onRoad(w.x, w.z, 1)) return null;
    const gy = groundY(w.x, w.z);
    if (gy < SEA + 1) return null;
    if (!walkable(w.x, w.z)) bad += 2;
    sum += gy; n++; lo = Math.min(lo, gy); hi = Math.max(hi, gy);
  }
  if (hi - lo > 4.5) return null;
  const mean = sum / n;
  for (let lx = X0; lx <= X1; lx += 3) for (let lz = Z0; lz <= Z1; lz += 3) {
    const w = toWorld(s, f, lx, lz);
    bad += Math.abs(groundY(w.x, w.z) - mean) * .7;     // quanto de terra será movida
  }
  return bad;
}

/** Escolhe os terrenos (antes de nascer a vegetação): junto às estradas, longe da vila, dos postos, da caverna, do porto, do tesouro e uns dos outros.
    Aplaina cada área e liga o portão à estrada com um ramal de terra. */
export function chooseFarmSite(avoid = []) {
  const rp = roadPts(), far = [...avoid, ...isl.pois.map(p => ({ x: p.x - VX, z: p.z - VZ }))];
  const chosen = [];
  VARIANTS.forEach((vr, vi) => {
    let spot = null, best = 1e9;
    for (let i = 0; i < rp.length; i += 3) {
      const q = rp[i], q2 = rp[Math.min(rp.length - 1, i + 1)], q0 = rp[Math.max(0, i - 1)];
      if (Math.hypot(q.x, q.z) < VILLAGE_R + 20) continue;
      const tx = q2.x - q0.x, tz = q2.z - q0.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      for (const side of [-1, 1]) for (const off of [14, 18, 23]) {
        const s = { x: q.x + nx * side * off, z: q.z + nz * side * off, tx: q.x, tz: q.z, ty: groundY(q.x, q.z) };
        if (Math.hypot(s.x, s.z) < VILLAGE_R + 38) continue;
        if (isl.bridges.some(b => Math.hypot(b[0] - VX - s.x, b[1] - VZ - s.z) < 30)) continue;   // ponte antiga ficaria solta no ar
        if (far.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 30)) continue;
        if (chosen.some(c => Math.hypot(c.x - s.x, c.z - s.z) < 50)) continue;                  // fazendas bem espaçadas
        const c = cost(s) + off * .25;
        if (c < best) { best = c; spot = s; }
      }
    }
    if (location.hash === '#dev') console.log('fazenda', vr.id, spot && [Math.round(spot.x), Math.round(spot.z)], best);
    if (!spot || best > 400) return;
    const f = frame(spot);
    let sum = 0, n = 0;
    for (let lx = X0; lx <= X1; lx += 3) for (let lz = Z0; lz <= Z1; lz += 3) { const w = toWorld(spot, f, lx, lz); sum += groundY(w.x, w.z); n++; }
    const y0 = sum / n, cen = toWorld(spot, f, (X0 + X1) / 2, (Z0 + Z1) / 2 + 1);
    flatten(cen.x, cen.z, 19, 36, y0);
    // ramal de terra do portão até a estrada (só pinta o caminho: não mexe na altura)
    const G = toWorld(spot, f, 0, Z1 + 1), len = Math.hypot(spot.tx - G.x, spot.tz - G.z);
    for (let t = 0; t <= len; t += .5) {
      const u = t / len, x = G.x + (spot.tx - G.x) * u, z = G.z + (spot.tz - G.z) * u;
      const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
        const k = (gz + j) * V + gx + i, d = Math.hypot(i, j);
        if (d > 3 || gx + i < 1 || gz + j < 1 || gx + i >= N || gz + j >= N || H[k] < SEA + .8) continue;
        if (d <= 1.6) { isl.pm[k] = 1; isl.nav[k] = 0; } else if (!isl.pm[k]) isl.pm[k] = 2;
      }
    }
    // pátio e corredor central: textura de estrada do terreno (nada de objetos por cima)
    const paint = (lx, lz) => {
      const w = toWorld(spot, f, lx, lz), gx = Math.round(w.x + VX + E), gz = Math.round(w.z + VZ + E);
      if (gx < 1 || gz < 1 || gx >= N || gz >= N) return;
      const k = gz * V + gx;
      if (H[k] < SEA + .8) return;
      isl.pm[k] = 1; isl.nav[k] = 0;
    };
    for (let lx = -14; lx <= 14; lx += .5) for (let lz = -8.6; lz <= -3.2; lz += .5) paint(lx, lz);
    for (let lx = -2; lx <= 2; lx += .5) for (let lz = -8.6; lz <= Z1 + 1; lz += .5) paint(lx, lz);
    spot.y0 = y0; spot.v = vr; spot.f = f;
    chosen.push(spot);
    ZONES.push({ x: spot.x, z: spot.z, fx: f.fx, fz: f.fz, x0: X0 - 1, x1: X1 + 1, z0: Z0 - 1, z1: Z1 + 3 });
  });
  FARMSITE.pending = chosen;
}

export function buildFarmSite() {
  const list = FARMSITE.pending || [];
  list.forEach(spot => buildOne(spot));
  FARMSITE.ok = FARMSITE.sites.length > 0;
  return FARMSITE;
}

function buildOne(spot) {
  const f = spot.f, by = spot.y0, vr = spot.v;
  const g = new THREE.Group();
  g.position.set(spot.x, by, spot.z);
  g.rotation.y = f.th;
  scene.add(g);
  const bx = (w, h, d, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  const cyl = (rt, rb, h, c, x, y, z, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  const solid = (lx, lz, r) => { const w = toWorld(spot, f, lx, lz); props.push({ position: { x: w.x, z: w.z, y: 0 }, r }); };
  const found = (w, d, x, z, c) => bx(w, 1.6, d, c, x, -.5, z);   // alicerce enterrado (esconde o desnível do terreno)

  const barn = (BX, BZ) => {
    found(8.4, 6.4, BX, BZ, 0x6a6a68);
    bx(8, 4, 6, 0xa8321f, BX, 2.2, BZ);
    for (let i = -3; i <= 3; i++) bx(.12, 4, .1, 0x8a2616, BX + i * 1.1, 2.2, BZ + 3.02);
    bx(3, 3, .12, 0x4a2a18, BX, 1.6, BZ + 3.05);
    for (const dx of [-1.5, 0, 1.5]) bx(.18, 3.2, .16, 0xf2e8d0, BX + dx, 1.6, BZ + 3.1);
    const dg = Math.hypot(3, 3);
    for (const s of [-1, 1]) { const m = bx(.14, dg, .16, 0xf2e8d0, BX + s * .75, 1.6, BZ + 3.12); m.rotation.z = s * Math.atan2(1.5, 3); }
    for (const s of [-1, 1]) { const r = bx(5.6, .25, 7, 0x4a3426, BX + s * 2.45, 5.35, BZ); r.rotation.z = -s * .62; }
    bx(7.9, 2.2, .2, 0xa8321f, BX, 4.6, BZ + 3).scale.set(1, .35, 1);
    bx(1.2, 1, .12, 0x2a1a10, BX, 4.4, BZ + 3.1);
    weather(BX, 6.6, BZ);
    solid(BX - 3, BZ, 2.3); solid(BX, BZ, 2.6); solid(BX + 3, BZ, 2.3);
  };
  const silo = (SX, SZ) => {
    cyl(1.7, 1.8, .6, 0x6a6a68, SX, -.1, SZ, 14);
    cyl(1.6, 1.6, 7, 0x9aa8b4, SX, 3.6, SZ, 14);
    for (const y of [1.5, 3.2, 4.9, 6.4]) cyl(1.68, 1.68, .12, 0x6a7884, SX, y, SZ, 14);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.7, 14), M(0x7a3a2a)); cone.position.set(SX, 8.2, SZ); g.add(cone);
    solid(SX, SZ, 2);
  };
  const house = (HX, HZ) => {
    found(5.4, 4.4, HX, HZ, 0x6a6a68);
    bx(5, 2.8, 4, 0xe8dcc0, HX, 1.9, HZ);
    for (const s of [-1, 1]) { const r = bx(3.2, .2, 4.8, 0x6a3a28, HX + s * 1.3, 3.75, HZ); r.rotation.z = -s * .6; }
    bx(.9, 1.7, .1, 0x5a3a22, HX + .8, 1.15, HZ + 2.03);
    bx(.8, .8, .1, 0x8ec8e8, HX - 1.1, 2, HZ + 2.03); bx(.9, .1, .12, 0x5a3a22, HX - 1.1, 1.55, HZ + 2.06);
    bx(.7, 1.6, .7, 0x7a5a48, HX - 1.6, 4.1, HZ - .7);
    bx(2.2, .18, .9, 0x8a8a86, HX + .8, .09, HZ + 2.55);                                             // degrau da porta
    bx(.14, .9, .5, 0x4a7a4a, HX - 1.9, 2, HZ + 2.1); bx(.14, .9, .5, 0x4a7a4a, HX - .3, 2, HZ + 2.1);   // venezianas
    bx(1, .22, .3, 0x6a4a2a, HX - 1.1, 1.45, HZ + 2.25); bx(.9, .14, .22, 0xd85a8a, HX - 1.1, 1.62, HZ + 2.25);   // jardineira com flores
    bx(5.2, .2, .22, 0x6a3a28, HX, 3.3, HZ + 2.1);                                                      // beiral
    solid(HX - 1.3, HZ, 1.5); solid(HX + 1.3, HZ, 1.5);
  };
  const barrel = (x, z) => { cyl(.42, .42, .8, 0x7a5430, x, .4, z, 10); cyl(.44, .44, .08, 0x3a3a3a, x, .22, z, 10); cyl(.44, .44, .08, 0x3a3a3a, x, .6, z, 10); solid(x, z, .5); };
  const crate = (x, z, h = .8) => { bx(.8, h, .8, 0xb8864a, x, h / 2, z, .2); bx(.84, .08, .84, 0x6a4a2a, x, h, z, .2); solid(x, z, .55); };
  const wood = (x, z) => { for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 1.6, 7), M(0x8a5a30)); m.rotation.z = Math.PI / 2; m.position.set(x, .18 + i * .3, z + (k - (2 - i) / 2) * .34); g.add(m); } solid(x, z, 1); };
  const lamp = (x, z) => { bx(.14, 2.6, .14, 0x4a3a2a, x, 1.3, z); bx(.34, .4, .34, 0xf0c040, x, 2.75, z); bx(.5, .1, .5, 0x3a2a1a, x, 3.02, z); solid(x, z, .3); };
  const arch = (z, name, c) => {      // portal de entrada com a placa da fazenda
    for (const sx of [-1, 1]) { bx(.34, 3.4, .34, 0x6a4a2a, sx * 2.9, 1.7, z); bx(.5, .2, .5, 0x8a8a86, sx * 2.9, .1, z); solid(sx * 2.9, z, .4); }
    bx(6.2, .3, .3, 0x6a4a2a, 0, 3.5, z); bx(3.4, .8, .12, c, 0, 3.0, z + .05);
    bx(3.0, .5, .14, 0xf2e8d0, 0, 3.0, z + .08);
  };
  const weather = (x, y, z) => { bx(.06, 1.2, .06, 0x2a2a2a, x, y + .6, z); bx(.9, .14, .05, 0x2a2a2a, x, y + 1.1, z); bx(.2, .3, .05, 0x2a2a2a, x + .45, y + 1.1, z); };
  const well = (x, z) => {
    cyl(.9, .9, .9, 0x8a8a86, x, .45, z, 12); cyl(.65, .65, .05, 0x2a6aa0, x, .85, z, 12);
    bx(.14, 1.8, .14, 0x6a4a2a, x - .8, 1.5, z); bx(.14, 1.8, .14, 0x6a4a2a, x + .8, 1.5, z); bx(1.9, .14, 1.1, 0x6a3a28, x, 2.45, z);
    solid(x, z, 1.1);
  };
  const hay = (x, z, y = 0, ry = 0) => bx(1.1, .8, .8, 0xd8b848, x, .4 + y, z, ry);
  const hayPile = (x, z) => { hay(x, z); hay(x, z + 1); hay(x + .1, z + .1, .8, .3); solid(x, z + .5, 1.1); };
  const roll = (x, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.1, 12), M(0xd8b848)); m.rotation.z = Math.PI / 2; m.position.set(x, .7, z); g.add(m); solid(x, z, .9); };
  let FLD = null;
  const field = (FX0, FX1, FZ0, FZ1, rows) => {
    FLD = { rows, cut: Array(rows).fill(-99), cells: [], FX0, FZ0, FZ1 };
    bx(FX1 - FX0 + 1, .12, FZ1 - FZ0 + 1, 0x5a3a24, (FX0 + FX1) / 2, .02, (FZ0 + FZ1) / 2);
    const CROPS = [[0xd8b848, 1, .22], [0x4a9a3a, 1.4, .3], [0xd8b848, 1, .22], [0x6ab04a, .5, .28], [0x4a9a3a, 1.4, .3]].slice(0, rows);
    CROPS.forEach(([c, h, w], r) => {
      const x = FX0 + 1 + r * 1.5;
      for (let z = FZ0 + .5; z <= FZ1 - .5; z += .7) {
        if (c === 0x6ab04a) { const p = new THREE.Mesh(new THREE.SphereGeometry(.28, 7, 5), M(0xe8862a)); p.position.set(x, .3, z); g.add(p); FLD.cells.push({ mesh: p, r, sph: true }); }
        else { const m = bx(w, h * (.85 + ((z * 7 + r * 3) % 3) * .08), w, c, x, .12 + h / 2 * .9, z); FLD.cells.push({ mesh: m, r, y0: m.position.y, hh: m.geometry.parameters.height / 2 }); }
      }
    });
    const sx = (FX0 + FX1) / 2, sz = FZ1 + .9;
    bx(.1, 2.1, .1, 0x6a4a2a, sx, 1.1, sz); bx(1.5, .1, .1, 0x6a4a2a, sx, 1.75, sz); bx(.5, .8, .3, 0xb85a3a, sx, 1.5, sz);
    bx(.36, .36, .36, 0xe8c898, sx, 2.2, sz); bx(.7, .08, .7, 0x6a3a28, sx, 2.42, sz); bx(.38, .3, .38, 0x6a3a28, sx, 2.58, sz);
    for (let z = FZ0 - .5; z <= FZ1 + .5; z += 2) { bx(.14, .7, .14, 0x6a4a2a, FX0 - .6, .35, z); bx(.14, .7, .14, 0x6a4a2a, FX1 + .6, .35, z); }
  };

  // ---- layout em "T": casa e celeiro ao fundo, pátio de terra, corredor central até o portão; cercados à esquerda, lavoura à direita ----
  const post = (x, z, big) => { bx(big ? .3 : .2, big ? 1.5 : 1.2, big ? .3 : .2, 0x6a4a2a, x, .6, z); solid(x, z, .3); };
  const rail = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    for (const y of [.5, .95]) bx(.1, .1, L, 0x8a6238, (x0 + x1) / 2, y, (z0 + z1) / 2, ang);
  };
  const side = (x0, z0, x1, z1) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2));
    for (let i = 0; i <= n; i++) post(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, false);
    rail(x0, z0, x1, z1);
  };
  const trough = (x, z) => { bx(2.2, .42, .8, 0x7a5430, x, .25, z); bx(1.9, .08, .5, 0x4a90c8, x, .46, z); };
  const GW = 1.35;
  /** Cercado retangular com portão no lado leste (voltado para o corredor central) */
  const pen = (x0, x1, z0, z1, sign) => {
    const cz = (z0 + z1) / 2;
    side(x0, z0, x1, z0); side(x0, z1, x1, z1); side(x0, z0, x0, z1);
    side(x1, z0, x1, cz - GW); side(x1, cz + GW, x1, z1);
    post(x1, cz - GW, true); post(x1, cz + GW, true);
    bx(.14, .14, 2 * GW + .5, 0xd8c8a0, x1, 1.65, cz);
    bx(.08, .42, 1.5, sign, x1 + .05, 2.0, cz);
    bx(x1 - x0 - .2, .03, z1 - z0 - .2, 0x6aa24a, (x0 + x1) / 2, .02, cz);
    return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz };
  };
  const spotsIn = (r, n) => Array.from({ length: n }, (_, i) => {
    const c = i % 3, rw = Math.floor(i / 3), rows = Math.ceil(n / 3);
    return [r.x0 + 2.4 + (c + .5 * (rw % 2)) * ((r.x1 - r.x0 - 4.8) / 2.5), r.z0 + 1.8 + (rw + .5) * ((r.z1 - r.z0 - 3.6) / rows) + ((i * 7) % 3) * .25];
  });
  const A = [-14, -3.4, -2.4, 3.4], B = [-14, -3.4, 4.4, 10.2];   // cercados da esquerda [x0,x1,z0,z1]
  const pens = [];
  let PA, PB;

  if (vr.id === 'aves') {
    house(-8, -12); well(0, -10.5); hayPile(8, -12.5); roll(12, -10);
    const a = pen(...A, 0xe8c040), b = pen(...B, 0xd8a050); PA = a; PB = b;
    bx(2.2, 1.3, 1.5, 0xb8864a, a.x0 + 2.2, .65, a.z0 + 1.5);                       // galinheiro
    bx(2.5, .12, 1.8, 0x7a3a28, a.x0 + 2.2, 1.4, a.z0 + 1.5).rotation.z = .12;
    bx(.5, .5, .06, 0x2a1a10, a.x0 + 2.2, .5, a.z0 + 2.3); solid(a.x0 + 2.2, a.z0 + 1.5, 1.2);
    bx(1.2, .22, .5, 0x7a5430, a.x1 - 1.8, .2, a.z1 - 1.2); bx(1, .06, .36, 0xd8c070, a.x1 - 1.8, .34, a.z1 - 1.2);
    bx(3.4, .05, 2.2, 0x4a90c8, b.cx - 1, .05, b.cz + .6);                           // lagoa dos patos
    field(4.5, 4.5 + 6 * 1.5 - 1, -2, 9, 5);
    pens.push({ kinds: ['hen', 'hen', 'hen', 'hen', 'rooster'], at: spotsIn(a, 5) });
    pens.push({ kinds: ['duck', 'duck', 'turkey', 'peacock'], at: spotsIn(b, 4) });
  } else if (vr.id === 'granja') {
    house(-8, -12); barn(8, -12); well(0, -10); hayPile(-13, -8.5);
    const a = pen(...A, 0xe88aa0), b = pen(...B, 0xf0f0f0); PA = a; PB = b;
    bx(3.8, .04, 2.8, 0x5a4030, a.cx + 1, .04, a.cz); trough(a.x0 + 2.2, a.z0 + 1.2);   // lamaçal e cocho
    trough(b.x0 + 2.2, b.z1 - 1.2); bx(1.2, .6, 1, 0xd8b848, b.x1 - 1.8, .3, b.z0 + 1.2);
    field(4.5, 4.5 + 4 * 1.5 - 1, -2, 9, 4);
    pens.push({ kinds: ['pig', 'pig', 'pig'], at: spotsIn(a, 3) });
    pens.push({ kinds: ['sheep', 'sheep', 'sheep', 'sheep'], at: spotsIn(b, 4) });
  } else {
    house(-8, -12); barn(8, -12); silo(-0.5, -13.5); roll(13, -6.4);
    const a = pen(...A, 0x4a90d8), b = pen(...B, 0x8a5a3a); PA = a; PB = b;
    trough(a.x0 + 2.2, a.z0 + 1.2); bx(1.6, .9, 1.2, 0xd8b848, a.x1 - 1.6, .45, a.z1 - 1.2);
    bx(2.6, 1.8, 2, 0x8a6238, b.x0 + 2, .9, b.z0 + 1.5);                              // cocheira
    bx(2.9, .12, 2.3, 0x4a3426, b.x0 + 2, 1.85, b.z0 + 1.5); solid(b.x0 + 2, b.z0 + 1.5, 1.4);
    trough(b.x0 + 2.2, b.z1 - 1.2);
    field(4.5, 4.5 + 3 * 1.5 - 1, -2, 9, 3);
    pens.push({ kinds: ['cow', 'cow', 'cow', 'ox'], at: spotsIn(a, 4) });
    pens.push({ kinds: ['horse', 'horse'], at: spotsIn(b, 2) });
  }
  // ---- detalhes comuns (fora do pátio e do corredor de estrada) ----
  arch(Z1 + 1.5, vr.n, vr.id === 'aves' ? 0xe8c040 : vr.id === 'granja' ? 0xe88aa0 : 0x4a90d8);
  lamp(-13.8, -8.9); lamp(13.8, -8.9);
  barrel(-12.4, -9.6); crate(-13.4, -9.4); wood(-13.2, -15);
  if (vr.id !== 'aves') { crate(14, -9.2); barrel(14.1, -7.4); }
  // banco do almoço
  bx(1.9, .12, .5, 0x8a6238, -3.2, .5, -10.1); bx(.12, .5, .4, 0x6a4a2a, -3.9, .25, -10.1); bx(.12, .5, .4, 0x6a4a2a, -2.5, .25, -10.1); bx(1.9, .5, .1, 0x8a6238, -3.2, .85, -10.4); solid(-3.2, -10.1, 1);
  // fazendeiro próprio de cada fazenda, com rotina diária
  const farmer = vr.npc, fp = toWorld(spot, f, vr.id === 'gado' ? 0 : -1, -4.6);
  const fn = makeNpc('citizen', fp.x, fp.z, Math.atan2(f.fx, f.fz), vr.cols, vr.v, farmer);
  const W = (lx, lz, o = {}) => Object.assign(toWorld(spot, f, lx, lz), o);
  const yard = W(-1, -5, { safe: true, dw: 1 }), doorP = W(-7.2, -9.2);
  const gate = p => [W(-1.2, p.cz), W(-3.4, p.cz, { ns: true })], inside = p => W(p.cx + 2.5, p.cz, { ns: true });
  const visit = (p, act, dw, offs) => [...gate(p), inside(p), ...offs.map(o => W(p.cx + o[0], p.cz + o[1], { act, dw, ns: true })), ...gate(p).reverse()];
  const faceW = -Math.PI / 2 + f.th, barnP = W(8, -8.4, { act: 'store', dw: 5, drop: true, face: f.th + Math.PI });
  const fieldSpots = (act, extra) => { const o = []; for (let k = 0; k < 2; k++) for (let r = 0; r < FLD.rows; r++) { const lz = [0, 3.5, 7][(r + k * 2) % 3] + (k ? 1 : 0); o.push(W(FLD.FX0 + 1.75 + r * 1.5, lz, Object.assign({ act, dw: 6, face: faceW }, extra ? extra(r) : {}))); } return o; };
  const sched = [
    { h0: 6, h1: 6.5, kind: 'wake', pts: [yard] },
    { h0: 6.5, h1: 8.5, kind: 'feed', pts: [yard, ...visit(PA, 'pour', 8, [[-2, 1]]), ...visit(PB, 'pour', 8, [[-2, 1]]), yard] },
    { h0: 8.5, h1: 11, kind: 'tend', pts: [yard, ...fieldSpots('tend'), yard] },
    { h0: 11, h1: 12.5, kind: 'harvest', pts: [yard, ...fieldSpots('pick', r => ({ cut: r, take: true })), barnP, yard] },
    { h0: 12.5, h1: 14, kind: 'lunch', pts: [yard, W(-3.2, -9.4, { act: 'eat', dw: 40, face: f.th }), yard] },
    { h0: 14, h1: 17, kind: 'care', pts: [yard, ...visit(PA, 'brush', 8, [[-3, -1.2], [0, 1.2]]), ...visit(PB, 'brush', 8, [[-3, 1.2], [0, -1]]), yard] },
    { h0: 17, h1: 18, kind: 'chores', pts: [yard, barnP, yard] },
    { h0: 18, h1: 19, kind: 'lamps', pts: [yard, W(-12.6, -7.8, { act: 'light', dw: 4, face: f.th - Math.PI / 2 }), yard, W(12.6, -7.8, { act: 'light', dw: 4, face: f.th + Math.PI / 2 }), yard] },
    { h0: 19, h1: 6, kind: 'home', pts: [yard, Object.assign({}, doorP, { hide: true, safe: true })] },
  ];
  initFarmer(fn, { sched, door: doorP, fld: FLD, cutRow: r => { FLD.cut[r] = CLOCK.total; fn.rfT = 0; } });
  FARMSITE.sites.push({ x: spot.x, z: spot.z, pens: pens.map(pn => ({ kinds: pn.kinds, pts: pn.at.map(([lx, lz]) => toWorld(spot, f, lx, lz)) })) });
  pois.push({ n: vr.n, x: spot.x, z: spot.z, c: '#9ad060', ic: vr.ic });
}
