/* Kits temáticos da Ilha dos Dragões, montados em peças por cima do cenário que já existe (dragon-isle.js não perde nada).
   Receitas por posto (pelo índice em POST_DATA / DRAGON_CAMPS):
     0 Ninho dos Wivernos      -> Campo de Ovos
     3 Ossuário dos Caçadores  -> Ossuário (costelas em círculo, crânios, ossos)
     4 Fenda de Fogo           -> Círculo de Obsidiana
     5 Vale dos Dragões        -> Portal de Costelas
     6 Garganta Vulcânica      -> Círculo de Obsidiana
     7 Covil do Ancestral      -> Portal de Costelas (entrada) + Campo de Ovos
   Cada kit devolve false se não couber no terreno; nesse caso simplesmente não aparece (sem forçar o chão). */
import { POST_DATA } from '../data/posts.js';
import { box, oct, egg, cyl, kitRng, putKit, findSpot } from './kit-core.js';

const BONE = 0xdcd0b2, BONE2 = 0xcbbf9f, OBS = 0x1c1a26, EGGS = [0xc4492f, 0x5e9a45, 0x5a93c8, 0xe0bb4a, 0x6a5a7a];

/** Costela grande: arco de pé */
function bigRib(g, x, z, h, ry) {
  const a = new THREE.Group(); a.position.set(x, 0, z); a.rotation.y = ry; g.add(a);
  box(a, .3, h, .34, BONE, -1.2, h / 2, 0, 0, 0, -.18); box(a, .3, h, .34, BONE, 1.2, h / 2, 0, 0, 0, .18);
  box(a, 2.6, .3, .34, BONE, 0, h - .12, 0);
}

/** Portal de Costelas: dois arcos altos com crânio no topo, marca a entrada do covil */
function ribGate(rng) {
  const g = new THREE.Group();
  [-3.4, 3.4].forEach(x => bigRib(g, x, 0, rng.rnd(4.2, 5.2), 0));
  box(g, 1.3, 1, 1.7, BONE, 0, 5.2, 0); box(g, .9, .6, 1.3, BONE2, 0, 4.9, 1.3);
  [-1, 1].forEach(s => box(g, .22, .26, .1, 0x2a2218, s * .5, 5.4, .6));
  return { g, r: 6, solids: [[-3.4, 0, 1], [3.4, 0, 1]] };
}

/** Ossuário: costelas em círculo com ossos no meio */
function ossuary(rng) {
  const g = new THREE.Group(), n = 7;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283; bigRib(g, Math.cos(a) * 4.6, Math.sin(a) * 4.6, rng.rnd(2.2, 3.4), -a + 1.57); }
  for (let i = 0; i < 12; i++) box(g, .16, .16, rng.rnd(.7, 1.5), BONE, rng.rnd(-2.5, 2.5), .12, rng.rnd(-2.5, 2.5), rng.rnd(0, 6.28), rng.rnd(-.15, .15));
  box(g, .9, .7, 1.2, BONE, 0, .4, 0, rng.rnd(0, 6.28));
  return { g, r: 6.5, solids: [[0, 0, 1.2]] };
}

/** Círculo de obsidiana: cristais pretos em roda com pedra central */
function obsidianRing(rng) {
  const g = new THREE.Group(), n = 6;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283; oct(g, rng.rnd(.9, 1.5), OBS, Math.cos(a) * 4.2, 1, Math.sin(a) * 4.2, rng.rnd(1.6, 2.6)); }
  oct(g, 1.2, 0x2a2236, 0, 1.4, 0, 2.4); cyl(g, 3, 3.2, .1, 14, 0x2a1a12, 0, .05, 0);
  return { g, r: 6, solids: [[0, 0, 1.2], ...Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * 4.2, Math.sin(i / n * 6.283) * 4.2, 1])] };
}

/** Campo de Ovos: três a cinco ovos soltos em cima de uma camada de cinzas */
function eggField(rng) {
  const g = new THREE.Group(), n = 4 + (rng.r() * 2 | 0);
  cyl(g, 3.4, 3.6, .08, 14, 0x2a1d14, 0, .04, 0);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rng.rnd(-.3, .3), d = rng.rnd(.8, 2.6); egg(g, rng.rnd(.38, .55), rng.pick(EGGS), Math.cos(a) * d, .55, Math.sin(a) * d); }
  return { g, r: 4, solids: [[0, 0, 2.4]] };
}

const RECIPE = { 0: [eggField], 3: [ossuary], 4: [obsidianRing], 5: [ribGate], 6: [obsidianRing], 7: [ribGate, eggField] };

/** Chamado no fim de buildDragonScenery(). Sorteio determinístico por semente + posto + kit. */
export function buildDragonKits() {
  const placed = [];
  POST_DATA.forEach((p, i) => (RECIPE[i] || []).forEach((make, k) => {
    const rng = kitRng('dragon:' + i + ':' + k), kit = make(rng);
    const spot = findSpot(p.x, p.z, kit.r, rng, 12, 26);
    if (spot && putKit(kit.g, spot[0], spot[1], Math.atan2(p.x - spot[0], p.z - spot[1]) + rng.rnd(-.3, .3), kit.r, kit.solids)) placed.push(make.name + '@' + p.name);
  }));
  if (typeof window !== 'undefined') window.__dragonKits = placed;   // depuração: __dragonKits no console (#dev)
  return placed;
}
