/* Palmeiras: tronco de cubos (cor única) que acompanha uma curva + copa de folhas largas.
   Modelo vindo de Palmeiras_de_tronco_em_cubos.html, adaptado ao jogo (materiais Lambert, escala menor). */
import { xray } from './xray.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;

export function rng(s) {
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const trunkMat = xray(new THREE.MeshLambertMaterial({ color: 0xb9693b }));
const leafMat = xray(new THREE.MeshLambertMaterial({ color: 0x8ec850, side: THREE.DoubleSide }));
const budMat = xray(new THREE.MeshLambertMaterial({ color: 0xecc96b }));
const box = new THREE.BoxGeometry(1, 1, 1);

/** Folha larga com borda recortada, dobrada no meio e caindo para baixo */
export function leafGeo(L, W, th0, bend) {
  const S = 8, U = [-1, -.5, 0, .5, 1], pos = [], idx = [];
  let r = 0, y = 0;
  for (let i = 0; i <= S; i++) {
    const t = i / S;
    if (i) { const th = th0 - bend * (t - .5 / S); r += L / S * Math.cos(th); y += L / S * Math.sin(th); }
    let w = W * Math.sin(Math.PI * Math.pow(t, .7));
    if (i % 2 && i < S) w *= .78;
    for (const u of U) {
      pos.push(u * w, y - Math.abs(u) * w * .28, r);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j; idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function palm(o) {
  const g = new THREE.Group(), r = rng(o.seed), up = new V3(0, 1, 0);
  const P0 = new V3(0, 0, 0), P1 = new V3(...o.mid), P2 = new V3(...o.top);
  const bez = t => P0.clone().multiplyScalar((1 - t) ** 2).add(P1.clone().multiplyScalar(2 * (1 - t) * t)).add(P2.clone().multiplyScalar(t * t));
  const tan = t => P1.clone().sub(P0).multiplyScalar(2 * (1 - t)).add(P2.clone().sub(P1).multiplyScalar(2 * t)).normalize();
  const len = (P0.distanceTo(P1) + P1.distanceTo(P2) + P0.distanceTo(P2)) / 2;
  // tronco: pilha de cubos, todos da mesma cor
  for (let i = 0; i < o.n; i++) {
    const t = (i + .5) / o.n;
    const w = (o.w0 + (o.w1 - o.w0) * t) * (i % 2 ? .93 : 1);
    const m = new THREE.Mesh(box, trunkMat);
    m.scale.set(w, len / o.n * 1.15, w);
    m.position.copy(bez(t));
    const q = new Q().setFromUnitVectors(up, tan(t));
    q.multiply(new Q().setFromAxisAngle(up, (r() - .5) * .45 + (i % 2 ? .2 : -.2)));
    m.quaternion.copy(q);
    g.add(m);
  }
  // copa
  const top = new THREE.Group();
  top.position.copy(bez(1).add(tan(1).multiplyScalar(.15)));
  g.add(top);
  for (let k = 0; k < 5; k++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.16 + r() * .07, 0), budMat);
    b.position.set((r() - .5) * .35, .08 + r() * .18, (r() - .5) * .35);
    top.add(b);
  }
  for (let k = 0; k < o.leaves; k++) {
    const L = o.L * (.8 + r() * .4), W = o.W * (.85 + r() * .3);
    const th0 = (o.pitch[0] + r() * (o.pitch[1] - o.pitch[0])) * Math.PI / 180;
    const bend = (o.bend + r() * 30) * Math.PI / 180;
    const leaf = new THREE.Mesh(leafGeo(L, W, th0, bend), leafMat);
    leaf.rotation.order = 'YZX';
    leaf.rotation.y = k * 2.4 + r() * .4;
    leaf.rotation.z = (r() - .5) * .3;
    top.add(leaf);
  }
  return g;
}

/** Cria uma palmeira (tipo 0: alta e curvada · tipo 1: menor e mais reta); `seed` varia as folhas */
export function makePalm(type, seed) {
  const p = type
    ? palm({ seed, n: 11, w0: .8, w1: .46, mid: [.1, 1.8, 0], top: [-.9, 3.7, -.2], leaves: 7, L: 2.5, W: .8, pitch: [30, 68], bend: 85 })
    : palm({ seed, n: 15, w0: 1, w1: .55, mid: [-.35, 2.8, .1], top: [1.4, 5.2, .3], leaves: 9, L: 3.3, W: 1, pitch: [18, 50], bend: 95 });
  p.scale.setScalar(type ? .8 : .66); // o jogador mede ~1,9: palmeiras de 3 a 4 m
  p.rotation.y = Math.random() * 6.28;
  p.r = .5; // raio de colisão
  return p;
}
