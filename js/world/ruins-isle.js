/* Ilhas de ruínas e acampamentos: Vampiros ('vampiros'), Hidra ('hidra') e Múmia ('mumia'). Sem vila nem castelo: só o barqueiro no cais (pois.js),
   um acampamento de chegada no centro (a zona segura, no lugar da vila), ruínas e acampamentos temáticos em cada posto inimigo e peças soltas pela ilha.
   Tudo estático (o mergeStatics funde depois). buildRuinsCamp() é chamado por main.js no lugar de buildVillage()/buildCastle(); buildRuinsScenery() e
   themedTree() por world.js. A posição de cada posto (x,z) já existe quando elas rodam. */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { POST_DATA } from '../data/posts.js';
import { groundY, walkable, onRoad, SEA } from './terrain.js';
import { reserved } from './reserve.js';
import { campfire } from './campfire.js';
import { VAMPIRE_ISLE, HYDRA_ISLE, MUMMY_ISLE } from '../core/isle.js';

const THEME = VAMPIRE_ISLE ? 'vamp' : HYDRA_ISLE ? 'hydra' : 'mummy';
const mat = c => xray(M(c));
const box = (g, w, h, d, c, x, y, z, ry = 0, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const glowBox = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); g.add(m); return m; };
const solid = (x, z, r) => props.push({ position: { x, z, y: 0 }, r });
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
function place(g, x, z, ry = 0, sc = 1) { g.position.set(x, groundY(x, z), z); g.rotation.y = ry; g.scale.setScalar(sc); scene.add(g); return g; }
/** Põe `mk()` perto de (cx,cz): a `r` metros, no ângulo `a`; devolve o grupo (e deixa colisão se rc > 0) */
const around = (cx, cz, a, r, mk, rc = 0, sc = 1, ry) => { const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, o = place(mk(), x, z, ry === undefined ? rnd(0, 6.28) : ry, sc); if (rc) solid(x, z, rc * sc); return o; };

/* ---------------- paleta por tema ---------------- */
const PAL = {
  vamp: { stone: 0x6a6678, stone2: 0x56526a, moss: 0x3a4a3a, accent: 0x8a1030, wood: 0x2a2024, cloth: 0x4a1f5a, dark: 0x1a1620 },
  hydra: { stone: 0x7a8a6a, stone2: 0x5a6a4a, moss: 0x3f6a32, accent: 0x6aa83a, wood: 0x4a3a22, cloth: 0x5a6a3a, dark: 0x2a3322 },
  mummy: { stone: 0xd2b27a, stone2: 0xb89a62, moss: 0x8a7a4a, accent: 0xe0b84a, wood: 0x7a5a30, cloth: 0xb8402a, dark: 0x4a3a22 },
}[THEME];

/* ---------------- peças comuns ---------------- */
function tent(c1 = PAL.cloth, c2 = PAL.wood) {
  const g = new THREE.Group();
  box(g, 3.2, .12, 3.2, c2, 0, .06, 0);
  [-1, 1].forEach(s => { box(g, 3.4, .1, 2.0, c1, 0, 1.15, s * .8, 0, s * .9, 0).rotation.x = s * .9; });
  const m = g.children; m[1].position.set(0, 1.15, -.8); m[2].position.set(0, 1.15, .8);
  box(g, .12, 2.4, .12, c2, -1.55, 1.2, 0); box(g, .12, 2.4, .12, c2, 1.55, 1.2, 0); box(g, 3.4, .1, .1, c2, 0, 2.3, 0);
  box(g, 1.1, 1.4, .1, PAL.dark, 0, .75, 1.35);
  return g;
}
function crates() { const g = new THREE.Group(); box(g, 1, 1, 1, PAL.wood, 0, .5, 0, .2); box(g, .9, .9, .9, PAL.wood, 1.1, .45, .3, -.3); box(g, .8, .8, .8, PAL.wood, .4, 1.3, .1, .6); return g; }
function barrel() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, 1, 8), mat(PAL.wood)); m.position.y = .5; g.add(m); box(g, 1, .08, 1, PAL.dark, 0, .55, 0); return g; }
function bedroll() { const g = new THREE.Group(); box(g, 1, .16, 2.1, PAL.cloth, 0, .08, 0); box(g, .8, .18, .5, 0xd8d0b8, 0, .2, -.75); return g; }
function logBench() { const g = new THREE.Group(); box(g, 3, .45, .5, PAL.wood, 0, .25, 0); return g; }
function banner(c = PAL.accent) { const g = new THREE.Group(); box(g, .18, 5, .18, PAL.wood, 0, 2.5, 0); box(g, 1.5, 2.2, .06, c, .8, 3.9, 0); box(g, 1.6, .1, .08, PAL.dark, .8, 5.0, 0); return g; }
function torchPost(h = 2.2) { const g = new THREE.Group(); box(g, .22, h, .22, PAL.wood, 0, h / 2, 0); glowBox(g, .34, .5, .34, 0xff8a1a, 0, h + .25, 0); glowBox(g, .2, .34, .2, 0xffd050, 0, h + .5, 0); return g; }
function bones() { const g = new THREE.Group(); for (let i = 0; i < 7; i++) box(g, .14, .14, rnd(.6, 1.5), 0xe2d8c0, rnd(-1.2, 1.2), .1, rnd(-1.2, 1.2), rnd(0, 6.28), rnd(-.2, .2)); box(g, .5, .42, .46, 0xe8e2cf, .2, .25, .3, 1); return g; }
function skullPile() { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = rnd(0, 6.28), r = rnd(0, 1.2); box(g, .5, .45, .48, pick([0xe8e2cf, 0xd8cfae, 0xcfc4a0]), Math.cos(a) * r, .22 + (r < .6 ? .38 : 0), Math.sin(a) * r, rnd(0, 6.28)); } return g; }
function column(h = 3.4, broken = Math.random() < .5, c = PAL.stone) {
  const g = new THREE.Group(), hh = broken ? h * rnd(.4, .8) : h;
  box(g, 1.1, .35, 1.1, PAL.stone2, 0, .18, 0); box(g, .8, hh, .8, c, 0, .35 + hh / 2, 0);
  if (!broken) box(g, 1.1, .3, 1.1, PAL.stone2, 0, .35 + hh + .15, 0); else box(g, .7, .6, .7, c, rnd(.6, 1.2), .3, rnd(-.8, .8), rnd(0, 3), 0, 1.4);
  return g;
}
/** Trecho de muro em ruínas: blocos de altura irregular */
function ruinWall(len = 7, h = 3.2, c = PAL.stone) {
  const g = new THREE.Group(), n = Math.round(len / 1.1);
  for (let i = 0; i < n; i++) { const hh = h * rnd(.35, 1) * (i === 0 || i === n - 1 ? 1 : 1), x = (i - (n - 1) / 2) * 1.1; box(g, 1.08, hh, .9, (i % 3 ? c : PAL.stone2), x, hh / 2, 0); if (Math.random() < .35) box(g, .6, .4, .8, c, x + rnd(-.5, .5), .2, rnd(.9, 1.5), rnd(0, 3)); }
  return g;
}
function arch(c = PAL.stone) {
  const g = new THREE.Group(); box(g, 1, 4.6, 1.1, c, -2, 2.3, 0); box(g, 1, 3.4, 1.1, PAL.stone2, 2, 1.7, 0);
  box(g, 5.2, .9, 1.1, c, 0, 4.7, 0, 0, 0, .04); box(g, 3, .6, 1, PAL.stone2, 0, 5.3, 0); return g;
}
function deadTree(c = PAL.dark) {
  const g = new THREE.Group(), h = rnd(3, 5.2);
  box(g, .55, h, .55, c, 0, h / 2, 0, rnd(0, 3), rnd(-.08, .08), rnd(-.08, .08));
  [-1, 1].forEach(s => { box(g, .22, rnd(1.4, 2.4), .22, c, s * .5, h * .72, 0, 0, 0, -s * rnd(.8, 1.1)); box(g, .16, rnd(.9, 1.4), .16, c, s * .9, h * .9, rnd(-.4, .4), 0, rnd(-.3, .3), -s * .5); });
  box(g, .16, rnd(1, 1.6), .16, c, 0, h + .4, 0, 0, .5, .2);
  return g;
}
function rock(c = PAL.stone2) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(.7, 1.4), 0), mat(c)); m.scale.y = rnd(.6, 1.2); const g = new THREE.Group(); m.position.y = .5; g.add(m); return g; }

/* ---------------- vampiros ---------------- */
function tombstone() { const g = new THREE.Group(), c = pick([0x6a6c68, 0x5a5c60, 0x7a7a78]); box(g, .9, 1.3, .22, c, 0, .65, 0, 0, 0, rnd(-.08, .08)); box(g, .9, .3, .24, c, 0, 1.4, 0); box(g, .14, .6, .06, PAL.dark, 0, 1.0, .13); box(g, .44, .12, .06, PAL.dark, 0, 1.18, .13); box(g, 1.1, .12, 1.8, PAL.moss, 0, .06, .9); return g; }
function crypt() {
  const g = new THREE.Group();
  box(g, 6, 3, 5, PAL.stone, 0, 1.5, 0); box(g, 6.6, .4, 5.6, PAL.stone2, 0, 3.2, 0); box(g, 5, 1.4, 4, PAL.stone, 0, 4.1, 0);
  box(g, 1.7, 2.4, .3, 0x0a080c, 0, 1.2, 2.55); [-1, 1].forEach(s => { box(g, .5, 2.8, .6, PAL.stone2, s * 1.3, 1.4, 2.6); glowBox(g, .3, .3, .3, 0xff3040, s * 2.4, 2.4, 2.7); });
  box(g, .3, 1.4, .3, PAL.stone2, 0, 5.6, 0); box(g, 1, .3, .3, PAL.stone2, 0, 5.8, 0);
  return g;
}
function coffin() { const g = new THREE.Group(); box(g, 1.1, .6, 2.4, PAL.wood, 0, .3, 0, 0, 0, 0); box(g, 1.2, .1, 2.5, PAL.accent, 0, .65, 0, 0, 0, .08); box(g, .3, .3, .06, 0xe0b84a, 0, .74, .6); return g; }
function ironFence(n = 6) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { box(g, .1, 1.6, .1, PAL.dark, i * .8, .8, 0); box(g, .16, .3, .16, PAL.dark, i * .8, 1.7, 0); } box(g, n * .8, .08, .08, PAL.dark, (n - 1) * .4, 1.3, 0); g.children.forEach(c => c.position.x -= (n - 1) * .4); return g; }
function tower(h = 12) {
  const g = new THREE.Group(); box(g, 5, h, 5, PAL.stone, 0, h / 2, 0);
  for (let i = 0; i < 4; i++) box(g, 1.1, 1.2, 1.1, PAL.stone2, (i % 2 ? 1 : -1) * 2, h + .6, (i < 2 ? 1 : -1) * 2); box(g, 3.6, 1.2, 3.6, PAL.stone2, 0, h + .6, 0);
  glowBox(g, .5, 1.1, .1, 0xff5a30, 0, h * .6, 2.55); glowBox(g, .5, 1.1, .1, 0xff5a30, 0, h * .3, 2.55);
  box(g, .16, 2.4, .16, PAL.dark, 0, h + 2.2, 0); box(g, 1.2, 1.6, .06, PAL.accent, .7, h + 2.4, 0);
  return g;
}
function fountain() { const g = new THREE.Group(), c = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, .7, 10), mat(PAL.stone)); c.position.y = .35; g.add(c); const w = new THREE.Mesh(new THREE.CircleGeometry(1.7, 10), new THREE.MeshBasicMaterial({ color: 0x5a1020 })); w.rotation.x = -Math.PI / 2; w.position.y = .72; g.add(w); box(g, .5, 2.4, .5, PAL.stone2, 0, 1.5, 0); return g; }

/* ---------------- hidra ---------------- */
function reeds() { const g = new THREE.Group(); for (let i = 0; i < 14; i++) box(g, .08, rnd(1.2, 2.6), .08, pick([0x5a7a3a, 0x6a8a44, 0x4a6a30]), rnd(-1.2, 1.2), 0, rnd(-1.2, 1.2), 0, rnd(-.25, .25), rnd(-.25, .25)).position.y = 0.9; return g; }
function puddle(c = 0x3a5a2a, r = 2.4) { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CircleGeometry(rnd(r * .7, r), 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .8 })); m.rotation.x = -Math.PI / 2; m.position.y = .08; g.add(m); return g; }
function hydraStatue(big = 1) {   // cabeça de hidra esculpida em pedra, num pescoço curvo
  const g = new THREE.Group(), c = PAL.stone;
  box(g, 1.6, .6, 1.6, PAL.stone2, 0, .3, 0); box(g, .8, 1.4, .8, c, 0, 1.2, 0); box(g, .7, 1.2, .7, c, .3, 2.4, 0, 0, 0, -.3);
  box(g, .8, .7, 1.4, c, .7, 3.2, .3, 0, 0, 0); box(g, .5, .35, 1, c, .7, 3.0, 1.3); box(g, .5, .12, 1, 0xe8e2cf, .7, 2.8, 1.3); glowBox(g, .12, .12, .12, 0x7aff3a, 1.02, 3.4, .5); glowBox(g, .12, .12, .12, 0x7aff3a, .38, 3.4, .5);
  g.scale.setScalar(big); return g;
}
function mossColumn() { const g = column(rnd(2.6, 4), Math.random() < .6, PAL.stone); box(g, 1, .4, 1, PAL.moss, 0, .5, 0); return g; }
function mudMound() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 5), mat(0x4a3a22)); m.scale.set(1.4, .5, 1.2); m.position.y = .1; g.add(m); return g; }
function spear() { const g = new THREE.Group(); box(g, .1, 2.6, .1, PAL.wood, 0, 1.3, 0, 0, 0, rnd(-.3, .3)); box(g, .22, .5, .08, 0xb8b8c0, 0, 2.7, 0); return g; }
function swampTree() {
  const g = new THREE.Group(), h = rnd(3, 4.4); box(g, .8, h, .8, 0x3a2e1c, 0, h / 2, 0, rnd(0, 3), rnd(-.06, .06), rnd(-.06, .06));
  for (let i = 0; i < 4; i++) { const a = i * 1.57; box(g, 3.2, .5, 3.2, pick([0x3a5a2a, 0x2e4a24, 0x486a30]), Math.cos(a) * .6, h + .1 + i * .15, Math.sin(a) * .6, a); }
  for (let i = 0; i < 5; i++) box(g, .08, rnd(1.4, 2.4), .08, 0x5a7a3a, Math.cos(i * 1.3) * 1.6, h - .6, Math.sin(i * 1.3) * 1.6);   // cipós
  return g;
}

/* ---------------- múmia ---------------- */
function obelisk(h = 6) { const g = new THREE.Group(); box(g, 1.7, .5, 1.7, PAL.stone2, 0, .25, 0); box(g, 1.1, h, 1.1, PAL.stone, 0, .5 + h / 2, 0); box(g, .8, .9, .8, PAL.accent, 0, .5 + h + .45, 0); box(g, .12, h * .6, .06, PAL.dark, 0, h * .5, .58); return g; }
function sphinx() {
  const g = new THREE.Group(), c = PAL.stone;
  box(g, 2.4, 1.6, 5, c, 0, .8, 0); box(g, 2.2, 1.8, 1.8, c, 0, 2.2, 1.6); box(g, 1.6, 1.6, 1.4, c, 0, 3.6, 2.2); box(g, 2.2, .5, 1.6, PAL.accent, 0, 4.1, 2.1); box(g, 2.2, 2.2, .5, PAL.stone2, 0, 3.2, 1.3);
  [-1, 1].forEach(s => { box(g, .7, .7, 2.6, c, s * .9, .35, 3.0); glowBox(g, .14, .14, .06, 0x40d0b0, s * .38, 3.8, 3.0); });
  return g;
}
function pyramid(base = 10, steps = 7) { const g = new THREE.Group(); const sh = 1.15; for (let i = 0; i < steps; i++) { const s = base * (1 - i / steps); box(g, s, sh, s, i % 2 ? PAL.stone : PAL.stone2, 0, sh / 2 + i * sh, 0); } glowBox(g, .9, .9, .9, 0xffe070, 0, steps * sh + .45, 0); return g; }
function sarcophagus() { const g = new THREE.Group(); box(g, 1.5, .7, 3, PAL.stone, 0, .35, 0); box(g, 1.6, .25, 3.1, PAL.accent, 0, .8, 0, 0, 0, .04); box(g, .9, .1, 1.1, 0x1d3f8a, 0, .98, -.3); box(g, .5, .14, .5, PAL.accent, 0, 1.0, .9); return g; }
function deadPalm() { const g = new THREE.Group(), h = rnd(3.5, 5.5); box(g, .5, h, .5, 0x6a5030, 0, h / 2, 0, 0, rnd(-.12, .12), rnd(-.12, .12)); for (let i = 0; i < 6; i++) { const a = i * 1.05; box(g, 2.6, .08, .5, pick([0x6a7a38, 0x8a8a44, 0x58602e]), Math.cos(a) * 1.0, h + .1 - Math.abs(Math.sin(a * 2)) * .25, Math.sin(a) * 1.0, -a, 0, .35); } return g; }
function cactus() { const g = new THREE.Group(), h = rnd(2, 3.2); box(g, .55, h, .55, 0x4a7a3a, 0, h / 2, 0); box(g, .4, 1.2, .4, 0x4a7a3a, .65, h * .6, 0); box(g, .8, .4, .4, 0x4a7a3a, .35, h * .45, 0); return g; }
function dune() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 5), mat(0xd8bc7a)); m.scale.set(1.6, .22, 1.1); m.position.y = -.1; g.add(m); return g; }
function stall() { const g = new THREE.Group(); box(g, 3, .9, 1.4, PAL.wood, 0, .45, 0); [-1, 1].forEach(s => box(g, .12, 2.6, .12, PAL.wood, s * 1.4, 1.3, -.5)); box(g, 3.4, .1, 1.8, pick([0xb8402a, 0x2a6a8a, 0xd8b030]), 0, 2.6, -.3, 0, -.2, 0); box(g, .5, .4, .5, 0xd8a030, .5, 1.1, .1); return g; }
function palisade(n = 7) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const h = rnd(2.6, 3.4); box(g, .45, h, .45, PAL.wood, (i - (n - 1) / 2) * .55, h / 2, 0); box(g, .3, .5, .3, PAL.wood, (i - (n - 1) / 2) * .55, h + .2, 0, .78); } return g; }

/* ---------------- tema → peças ---------------- */
const SCATTER = {
  vamp: [tombstone, tombstone, tombstone, deadTree, deadTree, () => column(), () => ruinWall(rnd(4, 7)), coffin, rock, crypt],
  hydra: [reeds, reeds, () => puddle(), () => puddle(0x2a4a22, 3), swampTree, swampTree, mossColumn, () => ruinWall(rnd(4, 7), 3, PAL.stone), bones, mudMound, hydraStatue],
  mummy: [dune, dune, deadPalm, deadPalm, cactus, () => obelisk(rnd(3.5, 6)), () => column(), () => ruinWall(rnd(4, 7)), skullPile, sarcophagus, rock],
}[THEME];
const SOLIDR = new Map([[tombstone, .8], [deadTree, .5], [crypt, 3.2], [coffin, .9], [rock, 1], [swampTree, .6], [mossColumn, .6], [hydraStatue, 1], [obelisk, .8], [sarcophagus, 1.2], [deadPalm, .4], [cactus, .5], [skullPile, 1], [ruinWall, 0]]);

/** Árvore sorteada do tema (usada por world.js no lugar de makeTree): mortas, de pântano, palmeiras secas; ou pedra */
export function themedTree() {
  const mk = THEME === 'vamp' ? deadTree : THEME === 'hydra' ? swampTree : Math.random() < .7 ? deadPalm : cactus, m = mk();
  m.r = .6; return m;
}

/* ---------------- acampamento de chegada (no lugar da vila) ---------------- */
export function buildRuinsCamp() {
  campfire(0, 0, 1.4);
  // anel de colunas com tocha em volta do acampamento marca a zona segura (VILLAGE_R), com vãos entre elas
  const R = VILLAGE_R - 2.2;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * 6.283;
    if (i % 4 === 1) { const x = Math.cos(a) * R, z = Math.sin(a) * R, o = place(torchPost(2.6), x, z, 0); solid(x, z, .35); continue; }
    if (i % 2) continue;
    const x = Math.cos(a) * R, z = Math.sin(a) * R, c = place(column(rnd(2.6, 3.6), i % 4 === 0 && Math.random() < .5), x, z, a); solid(x, z, .7);
    if (i % 4 === 2) { const t = place(torchPost(2.2), Math.cos(a) * (R - 1.2), Math.sin(a) * (R - 1.2), 0); solid(t.position.x, t.position.z, .3); }
  }
  [[-9, -6, .5], [9, -7, 2.5], [-1, -12, 1.5]].forEach(([x, z, ry], i) => { const t = place(tent(i === 1 ? PAL.accent : PAL.cloth), x, z, ry); solid(x, z, 2); });
  [[6, 5, 0], [-6, 6, 1]].forEach(([x, z, ry]) => { place(logBench(), x, z, ry); });
  [[-4, 7], [4, 8], [-7, 2]].forEach(([x, z], i) => { place(bedroll(), x, z, rnd(0, 6.28)); });
  [[8, 3], [-10, 9]].forEach(([x, z]) => { place(crates(), x, z, rnd(0, 6.28)); solid(x, z, 1.2); place(barrel(), x + 1.6, z + .6, 0); solid(x + 1.6, z + .6, .5); });
  const b = place(banner(), 0, -5.5, 0); solid(0, -5.5, .3);
}

/* ---------------- ruínas e acampamentos nos postos ---------------- */
function decoCamp(p, i, last) {
  const a0 = Math.random() * 6.283, at = (k, r, mk, rc, sc, ry) => around(p.x, p.z, a0 + k, r, mk, rc, sc, ry);
  const T = THEME;
  if (T === 'vamp') {
    ({
      0: () => { for (let k = 0; k < 9; k++) at(k * .7, rnd(9, 15), tombstone, .7); at(4, 12, () => ironFence(6), 0); at(2, 13, deadTree, .5); at(5.5, 11, deadTree, .5); },
      1: () => { at(0, 11, () => ruinWall(9, 4.2), 0, 1, a0 + 1.57); at(2.2, 11, () => ruinWall(8, 3.2), 0); at(4, 11, arch, 1.6); at(5.5, 10, () => column(), .7); at(1, 8, coffin, .8); },
      2: () => { at(0, 10, tent, 2); at(2, 10, () => tent(PAL.accent), 2); at(4, 9, crates, 1.2); at(3, 6, banner, .3); at(5, 8, spear, .2); at(5.4, 8.6, spear, .2); at(1, 13, bones, 0); },
      3: () => { at(0, 13, crypt, 3.4, 1.15); at(2, 11, coffin, .9); at(3, 12, coffin, .9); [1, 4, 5].forEach(k => at(k, 14, tombstone, .7)); at(5, 10, deadTree, .5); },
      4: () => { at(0, 12, () => ruinWall(10, 5), 0, 1, a0 + 1.57); [0, 1, 2, 3].forEach(k => at(1 + k * .9, 12, () => column(4.4, k === 1), .8)); at(5, 10, arch, 1.6); at(2.6, 8, fountain, 2.2); },
      5: () => { at(0, 12, crypt, 3.4); at(2.4, 12, crypt, 3.4, .85); [3, 4, 5].forEach(k => at(k, 9, coffin, .9)); at(1, 8, () => ironFence(5), 0); },
      6: () => { at(0, 9, fountain, 2.2); for (let k = 0; k < 7; k++) at(k * .9, rnd(13, 16), k % 2 ? deadTree : tombstone, .6); at(3, 13, () => ruinWall(7, 3), 0); at(5.5, 12, arch, 1.6); },
      7: () => { [0, 1.57, 3.14, 4.71].forEach(k => at(k + .4, 17, () => tower(rnd(9, 14)), 3, 1, 0)); at(0.1, 17, () => ruinWall(9, 6), 0); at(1.6, 12, arch, 1.6, 1.4); [-.5, .5].forEach(k => at(k + 1.8, 9, () => banner(PAL.accent), .3)); [0, 1, 2, 3, 4, 5].forEach(k => at(k * 1.05 + .3, 8, coffin, .9)); at(3, 6.5, () => column(4.4, false), .8); },
    })[i % 8]();
  } else if (T === 'hydra') {
    ({
      0: () => { at(0, 9, bones, 0); at(2, 11, reeds, 0); at(3.5, 9, () => puddle(), 0); at(5, 12, swampTree, .6); at(1, 14, swampTree, .6); at(4.2, 13, skullPile, 1); },
      1: () => { at(0, 10, tent, 2); at(2, 10, () => tent(0x5a6a3a), 2); at(4, 9, crates, 1.2); at(3, 6, banner, .3); at(5, 8, spear, .2); at(5.4, 8.8, spear, .2); at(1.4, 13, () => puddle(), 0); },
      2: () => { for (let k = 0; k < 5; k++) at(k * 1.2, rnd(8, 12), mudMound, 0); at(2, 13, () => puddle(0x2a4a22, 3), 0); at(4, 12, reeds, 0); at(5.6, 9, bones, 0); },
      3: () => { at(0, 12, () => ruinWall(9, 4), 0, 1, a0 + 1.57); at(2, 10, mossColumn, .6); at(3, 11, mossColumn, .6); at(4.2, 12, arch, 1.6); at(5, 8, () => puddle(), 0); at(1, 8, hydraStatue, 1); },
      4: () => { for (let k = 0; k < 5; k++) at(k * 1.25, rnd(7, 11), () => puddle(pick([0x6aa83a, 0x4a8a2a]), 2.8), 0); at(.5, 13, swampTree, .6); at(4, 14, swampTree, .6); at(2.5, 15, reeds, 0); },
      5: () => { for (let k = 0; k < 5; k++) at(k * 1.25, 12, () => hydraStatue(1.2), 1.2, 1, a0 + k * 1.25 + 3.14); at(3.1, 5, () => bones(), 0); },
      6: () => { for (let k = 0; k < 6; k++) at(k, rnd(8, 12), pick([bones, skullPile]), k % 2 ? 1 : 0); at(2, 13, () => ruinWall(7, 3), 0); at(4.5, 12, mossColumn, .6); at(5.5, 8, () => puddle(0x2a4a22, 3), 0); },
      7: () => { for (let k = 0; k < 7; k++) at(k * .9, 14.5, () => hydraStatue(1.5), 1.5, 1, a0 + k * .9 + 3.14); [0, 2.1, 4.2].forEach(k => at(k + .3, 18, () => mossColumn(), .7, 1.4)); at(1, 8, () => puddle(0x2a4a22, 4), 0); at(4, 8, skullPile, 1, 1.4); [0.7, 3.5, 5.5].forEach(k => at(k, 11, bones, 0)); },
    })[i % 8]();
  } else {
    ({
      0: () => { at(0, 10, () => tent(0xb8402a), 2); at(2, 10, () => tent(0x2a6a8a), 2); at(4, 9, crates, 1.2); at(5, 11, barrel, .5); at(3, 6.5, banner, .3); at(1, 8, bedroll, 0); at(1.6, 8.3, bedroll, 0); },
      1: () => { at(0, 9, () => puddle(0x3a8aa8, 3), 0); [0, 1.5, 3, 4.5].forEach(k => at(k, 12, deadPalm, .4)); at(5.5, 9, () => column(3.6, true), .8); at(2, 14, () => ruinWall(7, 3), 0); },
      2: () => { for (let k = 0; k < 6; k++) at(k, rnd(8, 12), skullPile, 1); at(1, 14, () => ruinWall(8, 3.4), 0, 1, a0 + 1.57); at(4, 14, arch, 1.6); },
      3: () => { [0, 1.2, 2.4, 3.6].forEach(k => at(k, 11, stall, 1.4)); at(5, 9, crates, 1.2); at(5.8, 11, barrel, .5); at(2, 6, () => column(3, true), .8); at(1, 15, () => ruinWall(8, 3.4), 0); },
      4: () => { [0, 1.2, 2.4].forEach(k => at(k, 11, sarcophagus, 1.3)); [3.6, 4.8].forEach(k => at(k, 12, () => obelisk(5), .8)); at(5.6, 9, skullPile, 1); at(1.4, 15, () => ruinWall(9, 4), 0); },
      5: () => { at(0, 14, () => palisade(9), 0, 1.4, a0 + 1.57); at(1.2, 14, () => palisade(9), 0, 1.4, a0 + 1.57); at(.6, 10, tent, 2); at(2.6, 9, () => tent(0xb8402a), 2); at(4, 9, crates, 1.2); at(5, 11, barrel, .5); at(3.6, 14, () => tower(7), 3); },
      6: () => { [0, 1].forEach(s => [-3, -1.5, 0, 1.5, 3].forEach(k => at(k * .28 + (s ? .35 : 0), 7.5 + s * 5, k % 2 ? sphinx : () => obelisk(5.5), k % 2 ? 2.4 : .8, 1, a0 + (s ? 1.57 : 4.71)))); },
      7: () => { at(0, 16, () => pyramid(22, 10), 11, 1); at(2, 10, () => obelisk(7), .9); at(4.2, 10, () => obelisk(7), .9); [1, 3.1, 5.2].forEach(k => at(k, 9, torchPost, .3)); at(5.4, 11, sarcophagus, 1.3); at(3, 8, () => sphinx(), 2.4); at(1, 7, skullPile, 1); },
    })[i % 8]();
  }
  void last;
}

export function buildRuinsScenery() {
  POST_DATA.forEach((p, i) => decoCamp(p, i, i === POST_DATA.length - 1));
  // peças soltas pelo resto da ilha
  for (let i = 0, tries = 0; i < 70 && tries < 4000; tries++) {
    const x = rnd(-150, 150), z = rnd(-150, 150), y = groundY(x, z);
    if (reserved(x, z, 3) || Math.hypot(x, z) < VILLAGE_R + 6 || onRoad(x, z, 3) || y < SEA + 1.2 || POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 12)) continue;
    if (![[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
    i++;
    const mk = pick(SCATTER), o = place(mk(), x, z, rnd(0, 6.28)), r = SOLIDR.get(mk);
    if (r) solid(x, z, r);
  }
}
