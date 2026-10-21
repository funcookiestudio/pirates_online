/* Outras árvores (bananeira, pinheiro, frondosa, baobá), de modelos em Árvores_de_tronco_em_cubos.html.
   Troncos de cubos e folhagem em cor única. Cada tipo: [função, escala, raio de colisão]. */
import { xray } from './xray.js';
import { makePalm, leafGeo, rng } from './palm.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const box = new THREE.BoxGeometry(1, 1, 1);
const cache = {};
const M = c => cache[c] || (cache[c] = xray(new THREE.MeshLambertMaterial({ color: c })));
const leafMat = xray(new THREE.MeshLambertMaterial({ color: 0x8ec850, side: THREE.DoubleSide }));
const rad_ = d => d * Math.PI / 180;

/** Pilha de cubos (mesma cor) que acompanha uma curva: tronco ou galho */
function stack(g, a, b, c, n, w0, w1, col, r, bulge = 0) {
  const P0 = new V3(...a), P1 = new V3(...b), P2 = new V3(...c), up = new V3(0, 1, 0);
  const bez = t => P0.clone().multiplyScalar((1 - t) ** 2).add(P1.clone().multiplyScalar(2 * (1 - t) * t)).add(P2.clone().multiplyScalar(t * t));
  const tan = t => P1.clone().sub(P0).multiplyScalar(2 * (1 - t)).add(P2.clone().sub(P1).multiplyScalar(2 * t)).normalize();
  const len = (P0.distanceTo(P1) + P1.distanceTo(P2) + P0.distanceTo(P2)) / 2;
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, w = (w0 + (w1 - w0) * t + bulge * Math.sin(Math.PI * t)) * (i % 2 ? .93 : 1);
    const m = new THREE.Mesh(box, M(col));
    m.scale.set(w, len / n * 1.15, w);
    m.position.copy(bez(t));
    const q = new Q().setFromUnitVectors(up, tan(t));
    q.multiply(new Q().setFromAxisAngle(up, (r() - .5) * .45 + (i % 2 ? .2 : -.2)));
    m.quaternion.copy(q);
    g.add(m);
  }
  return { end: bez(1), dir: tan(1) };
}

/** Moita de folhagem facetada */
function blob(rad, col, sd) {
  const geo = new THREE.IcosahedronGeometry(rad, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), s = 1 + .14 * Math.sin(x * 4.1 + y * 3.3 + z * 5.7 + sd);
    p.setXYZ(i, x * s, y * s * .9, z * s);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, M(col));
}

function banana(s) {
  const g = new THREE.Group(), r = rng(s);
  const t = stack(g, [0, 0, 0], [.1, 1.5, 0], [.4, 3.1, 0], 8, .8, .62, 0xa9a24f, r);
  const top = new THREE.Group();
  top.position.copy(t.end);
  g.add(top);
  for (let k = 0; k < 8; k++) {
    const leaf = new THREE.Mesh(leafGeo(3.1 * (.8 + r() * .4), 1.05 * (.85 + r() * .3), rad_(15 + r() * 45), rad_(100 + r() * 30)), leafMat);
    leaf.rotation.order = 'YZX';
    leaf.rotation.y = k * 2.4 + r() * .4;
    leaf.rotation.z = (r() - .5) * .3;
    top.add(leaf);
  }
  // cacho de bananas pendurado
  const bn = new THREE.Group();
  bn.position.set(.5, -.2, .35);
  top.add(bn);
  const st = new THREE.Mesh(box, M(0x7b7a35));
  st.scale.set(.1, .7, .1);
  st.position.y = .05;
  bn.add(st);
  for (let h = 0; h < 3; h++) for (let b = 0; b < 5; b++) {
    const m = new THREE.Mesh(box, M(0xf1d445));
    m.scale.set(.13, .5, .13);
    m.position.set((b - 2) * .15, -.35 - h * .5, (h % 2) * .06);
    m.rotation.z = (b - 2) * .07;
    bn.add(m);
  }
  const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), M(0x8b3b6b));
  bud.scale.set(1, 1.8, 1);
  bud.position.y = -2;
  bn.add(bud);
  return g;
}

function pine(s) {
  const g = new THREE.Group(), r = rng(s);
  stack(g, [0, 0, 0], [0, 1.4, 0], [0, 2.9, 0], 8, .62, .42, 0x8a5530, r);
  for (let k = 0; k < 5; k++) {
    const R = 2 - k * .36, H = 1.9 - k * .15;
    const c = new THREE.Mesh(new THREE.ConeGeometry(R, H, 6), M(0x2d7a49));
    c.position.y = 1.3 + k * .95 + H / 2;
    c.rotation.y = r();
    g.add(c);
  }
  return g;
}

function frondosa(s) {
  const g = new THREE.Group(), r = rng(s), tc = 0x9a6338;
  const t = stack(g, [0, 0, 0], [.15, 1.3, 0], [-.25, 2.7, .15], 8, 1, .72, tc, r), T = t.end, tp = [T.x, T.y, T.z];
  const b1 = stack(g, tp, [tp[0] + .5, tp[1] + .7, tp[2]], [tp[0] + 1.5, tp[1] + 1.3, tp[2] + .3], 4, .42, .26, tc, r);
  const b2 = stack(g, tp, [tp[0] - .5, tp[1] + .6, tp[2] - .1], [tp[0] - 1.4, tp[1] + 1.1, tp[2] - .4], 4, .42, .26, tc, r);
  [[T.x, T.y + 1.5, T.z, 1.8], [b1.end.x + .2, b1.end.y + .6, b1.end.z, 1.35], [b2.end.x - .2, b2.end.y + .5, b2.end.z, 1.35], [T.x + .1, T.y + 2.6, T.z - .2, 1.2]]
    .forEach((p, i) => { const b = blob(p[3], 0x6dbb4a, i * 2); b.position.set(p[0], p[1], p[2]); g.add(b); });
  return g;
}

function baoba(s) {
  const g = new THREE.Group(), r = rng(s), tc = 0xa88a68;
  const T = stack(g, [0, 0, 0], [0, 1.7, 0], [.1, 3.5, 0], 9, 1.9, 1.35, tc, r, .3).end;
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26 + .3, dx = Math.cos(a), dz = Math.sin(a);
    const e = stack(g, [T.x, T.y - .1, T.z], [T.x + dx * .6, T.y + .8, T.z + dz * .6], [T.x + dx * 1.7, T.y + 1.5 + r() * .5, T.z + dz * 1.7], 4, .4, .22, tc, r);
    const b = blob(.8 + r() * .2, 0x7fb94d, k);
    b.position.copy(e.end).add(new V3(dx * .2, .45, dz * .2));
    g.add(b);
  }
  return g;
}

/** Tipos sorteados na ilha: [construtor, escala, raio de colisão, peso] */
const KINDS = [
  [s => makePalm(0, s), 1, .5, 2],
  [s => makePalm(1, s), 1, .5, 2],
  [banana, .8, .45, 1.5],
  [pine, .6, .5, 2],
  [frondosa, .6, .65, 1.5],
  [baoba, .55, .8, 1],
];

/** Sorteia e cria uma árvore (já com escala, rotação aleatória e raio de colisão `r`) */
export function makeTree() {
  let w = Math.random() * KINDS.reduce((a, k) => a + k[3], 0), k = KINDS[0];
  for (const c of KINDS) { if ((w -= c[3]) < 0) { k = c; break; } }
  const g = k[0](Math.floor(Math.random() * 1e6));
  if (k[1] !== 1) g.scale.setScalar(k[1] * (.9 + Math.random() * .2));
  g.rotation.y = Math.random() * 6.28;
  g.r = k[2];
  return g;
}
