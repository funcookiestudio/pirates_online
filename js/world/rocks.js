/* Pedras do cenário: aglomerado de blocos facetados (dodecaedros deformados) com textura do kit, tufo de musgo e pedrinhas ao redor. */
import { xray } from './xray.js';
import { texMat } from './textures.js';
import { rng } from './palm.js';
import { MEDUSA_ISLE, DRAGON_ISLE } from '../core/isle.js';

const mats = (DRAGON_ISLE ? [0x7a6a62, 0x655650, 0x8a7a70] : MEDUSA_ISLE ? [0xe8e6dc, 0xd4d2c8, 0xf0eee4] : [0xd8d8d0, 0xc4c6c0, 0xe2ded2]).map(c => xray(texMat('rock', c)));
const moss = xray(new THREE.MeshLambertMaterial({ color: DRAGON_ISLE ? 0x2e2622 : MEDUSA_ISLE ? 0x8a9a78 : 0x6fa046 }));

function chunk(rad, sd, r) {
  const geo = new THREE.DodecahedronGeometry(rad, 0), p = geo.attributes.position, k = [];
  for (let i = 0; i < p.count; i++) {   // vértices iguais recebem o mesmo deslocamento (sem rachaduras)
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(3)).join();
    const s = k[key] || (k[key] = .82 + r() * .36);
    p.setXYZ(i, p.getX(i) * s * 1.1, p.getY(i) * s * .8, p.getZ(i) * s);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Pedra: bloco grande + 2–3 menores e musgo no topo; base em y=0, raio de colisão ~1 */
export function makeRock() {
  const g = new THREE.Group(), r = rng(Math.floor(Math.random() * 1e6));
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const big = i === 0, rad = big ? .8 + r() * .25 : .3 + r() * .25, a = r() * 6.28;
    const m = new THREE.Mesh(chunk(rad, i, r), mats[Math.floor(r() * mats.length)]);
    m.position.set(big ? 0 : Math.cos(a) * (.7 + r() * .3), rad * .55, big ? 0 : Math.sin(a) * (.7 + r() * .3));
    m.rotation.set(r() * .5, r() * 6.28, r() * .5);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    if (big && r() < .7) {
      const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(rad * .5, 0), moss);
      cap.scale.set(1.2, .35, 1);
      cap.position.set((r() - .5) * .3, rad * 1.1, (r() - .5) * .3);
      g.add(cap);
    }
  }
  g.r = 1;
  return g;
}
