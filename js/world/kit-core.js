/* Núcleo dos kits temáticos: peças simples (caixa, cilindro...), sorteio por semente e colocação segura no terreno.
   Os kits (kits-dragon.js etc.) só montam peças; aqui ficam as regras de "cabe ou não cabe" e o registro de colisão. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { rngf, hash } from './islandgen.js';
import { SEED, groundY, walkable, onRoad, nearObstacle, SEA } from './terrain.js';
import { reserved } from './reserve.js';

export const mat = c => xray(M(c));

/** Sorteio determinístico: mesma ilha (semente) + mesmo nome de kit = mesmo resultado */
export const kitRng = name => { const r = rngf(hash(SEED + '|kit|' + name)); return { r, rnd: (a, b) => a + r() * (b - a), pick: l => l[Math.floor(r() * l.length)] }; };

/** Peças: g = grupo, posição/rotação locais (origem no chão, +z para a frente) */
export const box = (g, w, h, d, c, x, y, z, ry = 0, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
export const cyl = (g, rt, rb, h, n, c, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), mat(c)); m.position.set(x, y, z); g.add(m); return m; };
export const oct = (g, r, c, x, y, z, sy = 1) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), mat(c)); m.position.set(x, y, z); m.scale.y = sy; g.add(m); return m; };
export const egg = (g, r, c, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(c)); m.scale.y = 1.3; m.position.set(x, y, z); g.add(m); return m; };

/** Cabe aqui? Terra firme, longe de estrada/reservas/obstáculos, sem ladeira forte num disco de raio r */
export function fits(x, z, r) {
  if (reserved(x, z, r * .5) || onRoad(x, z, 3) || nearObstacle(x, z, r * .4)) return false;
  const y0 = groundY(x, z);
  if (y0 < SEA + 1.2) return false;
  for (let a = 0; a < 6.283; a += .9) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!walkable(px, pz) || Math.abs(groundY(px, pz) - y0) > 1.6) return false;
  }
  return walkable(x, z);
}

/** Coloca um grupo no chão e registra colisões ([dx,dz,raio] locais, giradas junto com o grupo). Devolve false se não couber. */
export function putKit(g, x, z, yaw, r, solids = []) {
  if (!fits(x, z, r)) return false;
  g.position.set(x, groundY(x, z), z); g.rotation.y = yaw; scene.add(g);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  solids.forEach(([dx, dz, rr]) => props.push({ position: { x: x + dx * c + dz * s, z: z - dx * s + dz * c, y: 0 }, r: rr }));
  return true;
}

/** Tenta uma lista de pontos candidatos em volta de (cx,cz) (anel crescente) até caber; devolve [x,z] ou null */
export function findSpot(cx, cz, r, rng, minD = 8, maxD = 22) {
  for (let t = 0; t < 40; t++) {
    const a = rng.rnd(0, 6.283), d = minD + (maxD - minD) * (t / 40) + rng.rnd(0, 2);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (fits(x, z, r)) return [x, z];
  }
  return null;
}

/** Aplica uma receita { índiceDoPosto: [funçãoDoKit, ...] } aos postos da ilha. Cada função recebe o sorteio (kitRng) e devolve { g, r, solids }.
    Devolve a lista dos kits que entraram (para depuração). O kit que não couber simplesmente não aparece. */
export function runRecipe(posts, recipe, tag) {
  const placed = [];
  posts.forEach((p, i) => (recipe[i] || []).forEach((make, k) => {
    const rng = kitRng(tag + ':' + i + ':' + k), kit = make(rng), spot = findSpot(p.x, p.z, kit.r, rng, 12, 26);
    if (spot && putKit(kit.g, spot[0], spot[1], Math.atan2(p.x - spot[0], p.z - spot[1]) + rng.rnd(-.3, .3), kit.r, kit.solids)) placed.push(make.name + '@' + p.name);
  }));
  if (typeof window !== 'undefined') window['__kits_' + tag] = placed;
  return placed;
}
