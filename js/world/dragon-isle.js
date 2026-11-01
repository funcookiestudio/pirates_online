/* Cenário da Ilha dos Dragões (semente 'dragoes'): ninhos com ovos nos postos, o covil do Dragão Ancestral com seu tesouro,
   e restos espalhados pela ilha (crânios e costelas de dragão, ossos, árvores carbonizadas, rochas de obsidiana).
   Tudo estático: o mergeStatics funde depois. Chamado por world.js logo após o relevo existir (os postos já têm x,z). */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { POST_DATA } from '../data/posts.js';
import { groundY, walkable, onRoad, SEA } from './terrain.js';
import { reserved } from './reserve.js';

const mat = c => xray(M(c));
const box = (g, w, h, d, c, x, y, z, ry = 0, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const solid = (x, z, r) => props.push({ position: { x, z, y: 0 }, r });
const rnd = (a, b) => a + Math.random() * (b - a);

function place(g, x, z, ry = 0, sc = 1) { g.position.set(x, groundY(x, z), z); g.rotation.y = ry; g.scale.setScalar(sc); scene.add(g); return g; }

/** Crânio de dragão: crânio alongado, mandíbula, chifres e órbitas escuras */
function skull() {
  const g = new THREE.Group(), B = 0xe3d8bd, D = 0x2a2218;
  box(g, 1.1, .9, 1.6, B, 0, .55, 0); box(g, .8, .55, 1.3, B, 0, .4, 1.3); box(g, .7, .2, 1.1, 0xcfc4a6, 0, .12, 1.1);
  [-1, 1].forEach(s => {
    box(g, .22, .24, .1, D, s * .5, .8, .5, 0, 0, 0);
    box(g, .2, 1.3, .2, 0xd2c6a4, s * .5, 1.1, -.6, 0, -.9, s * .25);
    for (let i = 0; i < 3; i++) box(g, .08, .22, .08, 0xfff4dc, s * .3, .02, .9 + i * .35);
  });
  g.rotation.x = -.06;
  return g;
}
/** Arco de costelas de um dragão caído */
function ribs() {
  const g = new THREE.Group(), B = 0xdcd0b2;
  for (let i = 0; i < 5; i++) {
    const z = (i - 2) * .85, h = 2.3 - Math.abs(i - 2) * .3;
    box(g, .16, h, .2, B, -1.05, h / 2, z, 0, 0, -.2); box(g, .16, h, .2, B, 1.05, h / 2, z, 0, 0, .2);
    box(g, 2.1, .16, .2, B, 0, h - .1, z);
  }
  box(g, .22, .22, 4.4, 0xcbbf9f, 0, .1, 0);
  return g;
}
function bones() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) box(g, .14, .14, rnd(.6, 1.4), 0xe2d8c0, rnd(-1, 1), .1, rnd(-1, 1), rnd(0, 6.28), rnd(-.2, .2));
  return g;
}
/** Árvore morta e carbonizada */
function charred() {
  const g = new THREE.Group(), h = rnd(2.4, 4);
  box(g, .5, h, .5, 0x1e1a18, 0, h / 2, 0, rnd(0, 3), rnd(-.08, .08), rnd(-.08, .08));
  [-1, 1].forEach(s => box(g, .2, rnd(1, 1.8), .2, 0x26201c, s * .4, h * .75, 0, 0, 0, -s * .9));
  box(g, .8, .08, .8, 0x4a1a0a, 0, .05, 0);
  return g;
}
function obsidian() {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(rnd(.8, 1.6), 0), mat(0x1c1a26)); m.scale.y = rnd(1.4, 2.2);
  const g = new THREE.Group(); m.position.y = .8; g.add(m); return g;
}
/** Ninho: anel de gravetos e ossos com ovos de dragão coloridos */
function nest(sc = 1, eggs = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.283; box(g, rnd(.9, 1.3), .22, .22, i % 3 ? 0x4a3220 : 0xcfc4a6, Math.cos(a) * 1.7, .2 + (i % 2) * .15, Math.sin(a) * 1.7, -a + rnd(-.3, .3));
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, .18, 12), mat(0x2e2218)); disc.position.y = .1; g.add(disc);
  const EC = [0xc4492f, 0x5e9a45, 0x5a93c8, 0xe0bb4a, 0x6a5a7a];
  for (let i = 0; i < eggs; i++) {
    const a = i / eggs * 6.283 + .5, e = new THREE.Mesh(new THREE.SphereGeometry(.42, 8, 6), mat(EC[(Math.random() * EC.length) | 0]));
    e.scale.y = 1.3; e.position.set(Math.cos(a) * .65, .55, Math.sin(a) * .65); g.add(e);
  }
  g.scale.setScalar(sc);
  return g;
}
/** Tesouro do Ancestral: montes de moedas e joias */
function hoard() {
  const g = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const a = rnd(0, 6.283), r = Math.pow(Math.random(), .7) * 4.2, h = Math.max(.15, 1.4 - r * .28);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rnd(.5, 1), rnd(.9, 1.5), h, 7), mat(i % 5 ? 0xd9a82a : 0xf0cc50));
    c.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); g.add(c);
  }
  [0xc4302a, 0x2a8ac4, 0x3ac46a].forEach((c, i) => { const j = new THREE.Mesh(new THREE.OctahedronGeometry(.28, 0), mat(c)); j.position.set(Math.cos(i * 2.1) * 1.5, 1.5, Math.sin(i * 2.1) * 1.5); g.add(j); });
  return g;
}

export function buildDragonScenery() {
  // ninhos e restos nos postos; o último posto é o covil do Dragão Ancestral
  POST_DATA.forEach((p, i) => {
    const last = i === POST_DATA.length - 1, a0 = Math.random() * 6.283;
    const n = place(nest(last ? 1.4 : 1, last ? 5 : 2 + (i & 1)), p.x + Math.cos(a0) * 9, p.z + Math.sin(a0) * 9, rnd(0, 6.28)); solid(n.position.x, n.position.z, 1.7 * (last ? 1.4 : 1));
    const s = place(skull(), p.x + Math.cos(a0 + 2.4) * 8.5, p.z + Math.sin(a0 + 2.4) * 8.5, a0 + 2.4 + 3.14, last ? 1.8 : 1.1); solid(s.position.x, s.position.z, 1);
    if (last) {
      const h = place(hoard(), p.x + Math.cos(a0 + 1.2) * 11, p.z + Math.sin(a0 + 1.2) * 11, 0); solid(h.position.x, h.position.z, 3);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, o = place(obsidian(), p.x + Math.cos(a) * 15, p.z + Math.sin(a) * 15, a, 1.5); solid(o.position.x, o.position.z, 1.1); }
    }
  });
  // restos espalhados
  const T = [skull, ribs, bones, charred, charred, obsidian, bones];
  for (let i = 0, tries = 0; i < 60 && tries < 4000; tries++) {
    const x = rnd(-150, 150), z = rnd(-150, 150), y = groundY(x, z);
    if (reserved(x, z, 3) || Math.hypot(x, z) < VILLAGE_R + 6 || onRoad(x, z, 3) || y < SEA + 1.2 || POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 11)) continue;
    if (![[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
    i++;
    const k = (Math.random() * T.length) | 0, o = place(T[k](), x, z, rnd(0, 6.28), k === 0 ? rnd(.9, 1.5) : 1);
    if (T[k] === skull || T[k] === ribs || T[k] === obsidian || T[k] === charred) solid(o.position.x, o.position.z, T[k] === ribs ? 1.2 : .9);
  }
}
