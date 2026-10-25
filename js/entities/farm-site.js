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
import { HORSEMAN } from '../data/npcs.js';
import { ZONES } from '../world/reserve.js';
import { H } from '../world/terrain.js';
const E = N / 2;

export const FARMSITE = { ok: false, sites: [] };

// área de cada fazenda (coordenadas locais: +z = lado da estrada / portão)
const X0 = -14, X1 = 14, Z0 = -14, Z1 = 7;
const VARIANTS = [
  { id: 'aves', n: 'Sítio das Aves', ic: '🐔' },
  { id: 'granja', n: 'Granja', ic: '🐖' },
  { id: 'gado', n: 'Fazenda do Gado', ic: '🐄' },
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
    solid(HX - 1.3, HZ, 1.5); solid(HX + 1.3, HZ, 1.5);
  };
  const well = (x, z) => {
    cyl(.9, .9, .9, 0x8a8a86, x, .45, z, 12); cyl(.65, .65, .05, 0x2a6aa0, x, .85, z, 12);
    bx(.14, 1.8, .14, 0x6a4a2a, x - .8, 1.5, z); bx(.14, 1.8, .14, 0x6a4a2a, x + .8, 1.5, z); bx(1.9, .14, 1.1, 0x6a3a28, x, 2.45, z);
    solid(x, z, 1.1);
  };
  const hay = (x, z, y = 0, ry = 0) => bx(1.1, .8, .8, 0xd8b848, x, .4 + y, z, ry);
  const hayPile = (x, z) => { hay(x, z); hay(x, z + 1); hay(x + .1, z + .1, .8, .3); solid(x, z + .5, 1.1); };
  const roll = (x, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.1, 12), M(0xd8b848)); m.rotation.z = Math.PI / 2; m.position.set(x, .7, z); g.add(m); solid(x, z, .9); };
  const field = (FX0, FX1, FZ0, FZ1, rows) => {
    bx(FX1 - FX0 + 1, .12, FZ1 - FZ0 + 1, 0x5a3a24, (FX0 + FX1) / 2, .02, (FZ0 + FZ1) / 2);
    const CROPS = [[0xd8b848, 1, .22], [0x4a9a3a, 1.4, .3], [0xd8b848, 1, .22], [0x6ab04a, .5, .28], [0x4a9a3a, 1.4, .3]].slice(0, rows);
    CROPS.forEach(([c, h, w], r) => {
      const x = FX0 + 1 + r * 1.5;
      for (let z = FZ0 + .5; z <= FZ1 - .5; z += .7) {
        if (c === 0x6ab04a) { const p = new THREE.Mesh(new THREE.SphereGeometry(.28, 7, 5), M(0xe8862a)); p.position.set(x, .3, z); g.add(p); }
        else bx(w, h * (.85 + ((z * 7 + r * 3) % 3) * .08), w, c, x, .12 + h / 2 * .9, z);
      }
    });
    const sx = (FX0 + FX1) / 2, sz = FZ1 + .9;
    bx(.1, 2.1, .1, 0x6a4a2a, sx, 1.1, sz); bx(1.5, .1, .1, 0x6a4a2a, sx, 1.75, sz); bx(.5, .8, .3, 0xb85a3a, sx, 1.5, sz);
    bx(.36, .36, .36, 0xe8c898, sx, 2.2, sz); bx(.7, .08, .7, 0x6a3a28, sx, 2.42, sz); bx(.38, .3, .38, 0x6a3a28, sx, 2.58, sz);
    for (let z = FZ0 - .5; z <= FZ1 + .5; z += 2) { bx(.14, .7, .14, 0x6a4a2a, FX0 - .6, .35, z); bx(.14, .7, .14, 0x6a4a2a, FX1 + .6, .35, z); }
  };

  // ---- cercados: ficam ATRÁS das construções, com portão voltado para o pátio (+z) ----
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
  const PZ0 = -13, PZ1 = -5;     // fundo e frente dos cercados
  const penBox = (x0, x1, sign) => {
    const cx = (x0 + x1) / 2, gw = .95;
    side(x0, PZ0, x1, PZ0); side(x0, PZ0, x0, PZ1); side(x1, PZ0, x1, PZ1);
    side(x0, PZ1, cx - gw, PZ1); side(cx + gw, PZ1, x1, PZ1);
    post(cx - gw, PZ1, true); post(cx + gw, PZ1, true);
    bx(2 * gw + .5, .14, .14, 0xd8c8a0, cx, 1.65, PZ1);
    bx(1.5, .42, .08, sign, cx, 2.0, PZ1 + .05);
    bx(x1 - x0 - .2, .03, PZ1 - PZ0 - .2, 0x6aa24a, cx, .02, (PZ0 + PZ1) / 2);
    return cx;
  };
  const trough = (x, z) => { bx(2.2, .42, .8, 0x7a5430, x, .25, z); bx(1.9, .08, .5, 0x4a90c8, x, .46, z); };
  const spots = (cx, n, w = 4.2) => Array.from({ length: n }, (_, i) => [cx + ((i % 3) - 1) * w / 3 + (i > 2 ? .6 : 0), PZ0 + 2.6 + Math.floor(i / 3) * 2.2 + ((i * 7) % 3) * .2]);
  const pens = [];

  if (vr.id === 'aves') {
    house(-6, 0); well(-10.5, 4.5); hayPile(-1.5, -2);
    const c1 = penBox(-11, -1, 0xe8c040);
    bx(2.2, 1.3, 1.5, 0xb8864a, c1 - 2.2, .65, PZ0 + 1.3);
    bx(2.5, .12, 1.8, 0x7a3a28, c1 - 2.2, 1.4, PZ0 + 1.3).rotation.z = .12;
    bx(.5, .5, .06, 0x2a1a10, c1 - 2.2, .5, PZ0 + 2.1);
    bx(1.2, .22, .5, 0x7a5430, c1 + 2.2, .2, PZ0 + 1.5); bx(1, .06, .36, 0xd8c070, c1 + 2.2, .34, PZ0 + 1.5);
    solid(c1 - 2.2, PZ0 + 1.3, 1.2);
    field(4, 11, -10, 0, 5);
    pens.push({ kinds: ['hen', 'hen', 'hen', 'hen', 'rooster', 'duck', 'duck', 'turkey', 'peacock'], at: spots(c1, 9, 6.5) });
  } else if (vr.id === 'granja') {
    barn(-3, 0); hayPile(-9, 1); roll(9, 1);
    const c1 = penBox(-12, -2.5, 0xe88aa0), c2 = penBox(-1.5, 8, 0xf0f0f0);
    bx(3.6, .04, 2.6, 0x5a4030, c1 + 1, .04, PZ0 + 3);
    trough(c1 - 2.5, PZ0 + 1.2); trough(c2 + 2.5, PZ0 + 1.2);
    bx(1.2, .6, 1, 0xd8b848, c2 - 3, .3, PZ0 + 1.2);
    pens.push({ kinds: ['pig', 'pig', 'pig'], at: spots(c1, 3, 6) });
    pens.push({ kinds: ['sheep', 'sheep', 'sheep', 'sheep'], at: spots(c2, 4, 6) });
  } else {
    barn(-4, 0); silo(4.2, -1); roll(10, 2); well(-10, 4.5);
    const c1 = penBox(-12, -2.5, 0x4a90d8), c2 = penBox(-1.5, 8.5, 0x8a5a3a);
    trough(c1 - 2.5, PZ0 + 1.2); trough(c2 + 2.5, PZ0 + 1.2);
    bx(1.6, .9, 1.2, 0xd8b848, c1 + 2.5, .45, PZ0 + 1.3);
    bx(2.6, 1.8, 2, 0x8a6238, c2 - 3, .9, PZ0 + 1.5);                                       // cocheira
    bx(2.9, .12, 2.3, 0x4a3426, c2 - 3, 1.85, PZ0 + 1.5);
    solid(c2 - 3, PZ0 + 1.5, 1.4);
    const fm = toWorld(spot, f, 3.5, 5);   // criador de cavalos (vende a montaria), de frente para a estrada
    makeNpc('citizen', fm.x, fm.z, Math.atan2(f.fx, f.fz), [0xd8a880, 0x5a7a3a, 0x5a4020, 0xc8a050], 4, HORSEMAN);
    pens.push({ kinds: ['cow', 'cow', 'cow', 'ox'], at: spots(c1, 4, 6.5) });
    pens.push({ kinds: ['horse', 'horse'], at: spots(c2, 2, 6) });
  }
  FARMSITE.sites.push({ x: spot.x, z: spot.z, pens: pens.map(pn => ({ kinds: pn.kinds, pts: pn.at.map(([lx, lz]) => toWorld(spot, f, lx, lz)) })) });
  pois.push({ n: vr.n, x: spot.x, z: spot.z, c: '#9ad060', ic: vr.ic });
}
