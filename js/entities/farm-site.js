/* A fazenda de verdade: celeiro, silo, casa, pasto cercado com cocho, plantação, espantalho e fardos de feno.
   Montada ANTES da fusão de cenário (mergeStatics), então custa poucas draw calls. Os animais ficam no pasto (farm.js). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { groundY, walkable, nearObstacle, onRoad, SEA } from '../world/terrain.js';
import { VILLAGE_R } from '../core/village-const.js';
import { pois } from '../world/pois.js';
import { FZONE } from '../world/reserve.js';

export const FARMSITE = { ok: false, spot: null, x: 0, z: 0, pen: [], yard: [] };

// área ocupada (coordenadas locais: +z = lado da vila / portão)
const X0 = -15, X1 = 17, Z0 = -13, Z1 = 7;

function frame(x, z) {
  const d = Math.hypot(x, z) || 1, fx = -x / d, fz = -z / d;
  return { fx, fz, th: Math.atan2(fx, fz) };
}
const toWorld = (s, f, lx, lz) => ({ x: s.x + f.fz * lx + f.fx * lz, z: s.z - f.fx * lx + f.fz * lz });

/** Pontos ruins na área (água/estrada = proibido; árvore/pedra e declive contam). Menor é melhor; null = inviável */
const R = { road: 0, water: 0, slope: 0 };
function cost(s) {
  const f = frame(s.x, s.z), y0 = groundY(s.x, s.z);
  let bad = 0;
  for (let lx = X0; lx <= X1; lx += 3) for (let lz = Z0; lz <= Z1; lz += 3) {
    const w = toWorld(s, f, lx, lz);
    if (onRoad(w.x, w.z, 1.5)) { R.road++; return null; }
    const gy = groundY(w.x, w.z);
    if (gy < SEA + .9) { R.water++; return null; }
    if (!walkable(w.x, w.z)) bad += 3;
    if (Math.abs(gy - y0) > 3) { R.slope++; return null; }
    if (Math.abs(gy - y0) > 2) bad += 3;
    if (Math.abs(gy - y0) > 1.1) bad += 1;
  }
  return bad;
}

/** Escolhe o terreno (antes de nascer a vegetação) e reserva a área */
export function chooseFarmSite(avoid = []) {
  let spot = null, best = 1e9;
  for (let t = 0; t < 4500; t++) {
    const a = .4 + (t % 180) / 180 * 6.283, d = VILLAGE_R + 10 + Math.floor(t / 180) * 2;
    const s = { x: Math.cos(a) * d, z: Math.sin(a) * d };
    if (avoid.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 16)) continue;
    const c = cost(s);
    if (c !== null && c < best) { best = c; spot = s; if (c === 0) break; }
  }
  if (location.hash === '#dev') console.log('fazenda', spot, best);
  if (!spot) return;
  const f = frame(spot.x, spot.z);
  FARMSITE.spot = spot;
  Object.assign(FZONE, { on: true, x: spot.x, z: spot.z, fx: f.fx, fz: f.fz, x0: X0, x1: X1, z0: Z0, z1: Z1 + 6 });
}

export function buildFarmSite() {
  const spot = FARMSITE.spot;
  if (!spot) return FARMSITE;
  const f = frame(spot.x, spot.z), by = groundY(spot.x, spot.z);
  const g = new THREE.Group();
  g.position.set(spot.x, by, spot.z);
  g.rotation.y = f.th;
  scene.add(g);
  const bx = (w, h, d, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  const cyl = (rt, rb, h, c, x, y, z, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  const solid = (lx, lz, r) => { const w = toWorld(spot, f, lx, lz); props.push({ position: { x: w.x, z: w.z, y: 0 }, r }); };
  const found = (w, d, x, z, c) => bx(w, 1.6, d, c, x, -.5, z);   // alicerce enterrado (esconde o desnível do terreno)

  // ---- celeiro (fundo) ----
  const BX = 0, BZ = -9.5;
  found(8.4, 6.4, BX, BZ, 0x6a6a68);
  bx(8, 4, 6, 0xa8321f, BX, 2.2, BZ);
  for (let i = -3; i <= 3; i++) bx(.12, 4, .1, 0x8a2616, BX + i * 1.1, 2.2, BZ + 3.02);   // tábuas
  bx(3, 3, .12, 0x4a2a18, BX, 1.6, BZ + 3.05);                                              // portão
  bx(.18, 3.2, .16, 0xf2e8d0, BX - 1.5, 1.6, BZ + 3.1); bx(.18, 3.2, .16, 0xf2e8d0, BX + 1.5, 1.6, BZ + 3.1); bx(.18, 3.2, .16, 0xf2e8d0, BX, 1.6, BZ + 3.1);
  const dg = Math.hypot(3, 3);
  for (const s of [-1, 1]) { const m = bx(.14, dg, .16, 0xf2e8d0, BX + s * .75, 1.6, BZ + 3.12); m.rotation.z = s * Math.atan2(1.5, 3) * 1; }
  for (const s of [-1, 1]) { const r = bx(5.6, .25, 7, 0x4a3426, BX + s * 2.45, 5.35, BZ); r.rotation.z = -s * .62; }
  bx(7.9, 2.2, .2, 0xa8321f, BX, 4.6, BZ + 3).scale.set(1, .35, 1);
  bx(1.2, 1, .12, 0x2a1a10, BX, 4.4, BZ + 3.1);                                              // janela do sótão
  solid(BX - 3, BZ, 2.3); solid(BX, BZ, 2.6); solid(BX + 3, BZ, 2.3);

  // ---- silo ----
  const SX = 7.2, SZ = -9;
  cyl(1.7, 1.8, .6, 0x6a6a68, SX, -.1, SZ, 14);
  cyl(1.6, 1.6, 7, 0x9aa8b4, SX, 3.6, SZ, 14);
  for (const y of [1.5, 3.2, 4.9, 6.4]) cyl(1.68, 1.68, .12, 0x6a7884, SX, y, SZ, 14);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.7, 14), M(0x7a3a2a)); cone.position.set(SX, 8.2, SZ); g.add(cone);
  solid(SX, SZ, 2);

  // ---- casa do fazendeiro (esquerda) ----
  const HX = -11.5, HZ = -7;
  found(5.4, 4.4, HX, HZ, 0x6a6a68);
  bx(5, 2.8, 4, 0xe8dcc0, HX, 1.9, HZ);
  for (const s of [-1, 1]) { const r = bx(3.2, .2, 4.8, 0x6a3a28, HX + s * 1.3, 3.75, HZ); r.rotation.z = -s * .6; }
  bx(.9, 1.7, .1, 0x5a3a22, HX + .8, 1.15, HZ + 2.03);                                       // porta
  bx(.8, .8, .1, 0x8ec8e8, HX - 1.1, 2, HZ + 2.03); bx(.9, .1, .12, 0x5a3a22, HX - 1.1, 1.55, HZ + 2.06);
  bx(.7, 1.6, .7, 0x7a5a48, HX - 1.6, 4.1, HZ - .7);                                          // chaminé
  solid(HX - 1.3, HZ, 1.5); solid(HX + 1.3, HZ, 1.5);

  // ---- pasto cercado (portão no lado +z) ----
  const PX0 = -7, PX1 = 7, PZ0 = -4, PZ1 = 6;
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
  side(PX0, PZ0, PX1, PZ0); side(PX0, PZ0, PX0, PZ1); side(PX1, PZ0, PX1, PZ1);
  side(PX0, PZ1, -1.6, PZ1); side(1.6, PZ1, PX1, PZ1);
  post(-1.6, PZ1, true); post(1.6, PZ1, true);
  bx(3.4, .12, .12, 0xd8c8a0, 0, 2.05, PZ1).position.y = 1.7;                                   // viga do portão
  bx(.3, 1.9, .3, 0x6a4a2a, -1.6, 1, PZ1); bx(.3, 1.9, .3, 0x6a4a2a, 1.6, 1, PZ1);
  bx(2.6, .5, .08, 0x5a3a22, 0, 1.7, PZ1 + .1);                                                 // placa
  // cocho com água e feno
  bx(2.6, .5, .9, 0x7a5430, -4.2, .3, -2.6); bx(2.3, .1, .6, 0x4a90c8, -4.2, .52, -2.6);
  bx(1.4, .5, 1, 0xd8b848, 4.6, .3, -2.8);
  // ---- fardos de feno (ao lado do celeiro e na entrada) ----
  const hay = (x, z, y = 0, ry = 0) => bx(1.1, .8, .8, 0xd8b848, x, .4 + y, z, ry);
  hay(-6.5, -9.2); hay(-6.5, -8.2); hay(-6.4, -9, .8, .3); hay(-5.3, -7.2, 0, .2);
  solid(-6.5, -8.7, 1.1);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.1, 12), M(0xd8b848)); roll.rotation.z = Math.PI / 2; roll.position.set(10.5, .7, -3); g.add(roll);
  solid(10.5, -3, .9);
  // ---- plantação (direita) ----
  const FX0 = 9, FX1 = 16, FZ0 = -6, FZ1 = 6;
  bx(FX1 - FX0 + 1, .12, FZ1 - FZ0 + 1, 0x5a3a24, (FX0 + FX1) / 2, .02, (FZ0 + FZ1) / 2);
  const CROPS = [[0xd8b848, 1, .22], [0x4a9a3a, 1.4, .3], [0xd8b848, 1, .22], [0x6ab04a, .5, .28], [0x4a9a3a, 1.4, .3]];
  CROPS.forEach(([c, h, w], r) => {
    const x = FX0 + 1 + r * 1.5;
    for (let z = FZ0 + .5; z <= FZ1 - .5; z += .7) {
      if (r === 3) { const p = new THREE.Mesh(new THREE.SphereGeometry(.28, 7, 5), M(0xe8862a)); p.position.set(x, .3, z); g.add(p); }
      else bx(w, h * (.85 + ((z * 7 + r * 3) % 3) * .08), w, c, x, .12 + h / 2 * .9, z);
    }
  });
  // espantalho
  bx(.1, 2.1, .1, 0x6a4a2a, 12.5, 1.1, 6.9);
  bx(1.5, .1, .1, 0x6a4a2a, 12.5, 1.75, 6.9);
  bx(.5, .8, .3, 0xb85a3a, 12.5, 1.5, 6.9);
  bx(.36, .36, .36, 0xe8c898, 12.5, 2.2, 6.9);
  bx(.7, .08, .7, 0x6a3a28, 12.5, 2.42, 6.9); bx(.38, .3, .38, 0x6a3a28, 12.5, 2.58, 6.9);
  // cercadinho baixo da plantação
  for (let z = FZ0 - .5; z <= FZ1 + .5; z += 2) { bx(.14, .7, .14, 0x6a4a2a, FX0 - .6, .35, z); bx(.14, .7, .14, 0x6a4a2a, FX1 + .6, .35, z); }
  // poço
  cyl(.9, .9, .9, 0x8a8a86, -10, .45, 3, 12); cyl(.65, .65, .05, 0x2a6aa0, -10, .85, 3, 12);
  bx(.14, 1.8, .14, 0x6a4a2a, -10.8, 1.5, 3); bx(.14, 1.8, .14, 0x6a4a2a, -9.2, 1.5, 3); bx(1.9, .14, 1.1, 0x6a3a28, -10, 2.45, 3);
  solid(-10, 3, 1.1);
  // caminho de terra do portão até a vila
  for (let lz = PZ1 + .5; lz < Z1 + 6; lz += 1.6) bx(2.6, .05, 1.7, 0x9a7a52, (lz % 3.2 < 1.6 ? .1 : -.1), .03, lz);

  // dados para os animais
  const pen = [];
  for (let i = 0; i < 16; i++) { const lx = -5.6 + (i % 4) * 3.7 + (i % 2) * .5, lz = -2.2 + Math.floor(i / 4) * 2.4; pen.push(toWorld(spot, f, lx, lz)); }
  Object.assign(FARMSITE, { ok: true, x: spot.x, z: spot.z, pen, f });
  pois.push({ n: 'Fazenda', x: spot.x, z: spot.z, c: '#9ad060', ic: '🌾' });
  return FARMSITE;
}
