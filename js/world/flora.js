/* Vegetação rasteira temática (sem colisão): moitas, flores, cogumelos e troncos caídos.
   Ilha natal: tropical e florida · Ilha da Medusa: seca e pálida, de pedra · Ilha dos Dragões: carbonizada, com brasas. */
import { xray } from './xray.js';
import { texMat } from './textures.js';
import { rng } from './palm.js';
import { MEDUSA_ISLE, DRAGON_ISLE } from '../core/isle.js';

const THEME = DRAGON_ISLE ? 'dragon' : MEDUSA_ISLE ? 'medusa' : 'home';
const PAL = {
  home: { leaf: [0x4f9a3a, 0x68b445, 0x3f8a4a], flower: [0xf0709a, 0xf4d44a, 0xffffff, 0xe0602a], mush: 0xe0922f, log: 0xf0c8a8 },
  medusa: { leaf: [0x6a7a58, 0x7a8a6a, 0x5a6a4e], flower: [0x9a9a8a, 0xb0aa98], mush: 0xb8b0a0, log: 0xb0a898 },
  dragon: { leaf: [0x3a2e28, 0x4a3a30, 0x2e2622], flower: [0xff5a1a, 0xff8a2a], mush: 0x5a3a2a, log: 0x40342c },
}[THEME];
const lm = new Map();
const L = c => lm.get(c) || (lm.set(c, xray(new THREE.MeshLambertMaterial({ color: c, flatShading: true }))), lm.get(c));
const emi = c => xray(new THREE.MeshLambertMaterial({ color: c, emissive: THEME === 'dragon' ? c : 0 }));
const pick = (a, r) => a[Math.floor(r() * a.length)];

function bush(r) {
  const g = new THREE.Group(), c = pick(PAL.leaf, r);
  for (let i = 0; i < 4; i++) {
    const R = .35 + r() * .25, m = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 0), L(c + (i % 2 ? 0x080808 : 0)));
    m.position.set((r() - .5) * .7, R * .8, (r() - .5) * .7);
    m.scale.y = .8; m.rotation.y = r() * 6; m.castShadow = true;
    g.add(m);
  }
  if (THEME !== 'dragon' && r() < .55) for (let i = 0; i < 4; i++) {   // flores pontuais
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), L(pick(PAL.flower, r)));
    f.position.set((r() - .5) * .8, .5 + r() * .3, (r() - .5) * .8);
    g.add(f);
  }
  return g;
}
function flowers(r) {
  const g = new THREE.Group(), c = pick(PAL.flower, r);
  for (let i = 0; i < 5; i++) {
    const x = (r() - .5) * .8, z = (r() - .5) * .8, h = .25 + r() * .2;
    const st = new THREE.Mesh(new THREE.BoxGeometry(.04, h, .04), L(THEME === 'dragon' ? 0x2e2622 : 0x3f8a4a));
    st.position.set(x, h / 2, z); g.add(st);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), THEME === 'dragon' ? emi(c) : L(c));
    f.position.set(x, h + .05, z); f.scale.y = .6; g.add(f);
  }
  return g;
}
function mushrooms(r) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = .6 + r() * .6, x = (r() - .5) * .5, z = (r() - .5) * .5;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.05 * s, .07 * s, .22 * s, 5), L(0xe8dcc0));
    st.position.set(x, .11 * s, z); g.add(st);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.18 * s, .14 * s, 6), L(PAL.mush));
    cap.position.set(x, .27 * s, z); g.add(cap);
  }
  return g;
}
function log(r) {
  const g = new THREE.Group(), len = 1.6 + r() * 1.2, R = .18 + r() * .08;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.1, len, 7), xray(texMat('bark', PAL.log)));
  t.rotation.z = Math.PI / 2; t.position.y = R; t.castShadow = true; g.add(t);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(R, 7), L(0xc89a68));
  cut.rotation.y = Math.PI / 2; cut.position.set(len / 2 + .005, R, 0); g.add(cut);
  if (THEME === 'home' && r() < .6) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(R * .9, 0), L(0x6fa046)); m.scale.set(1.8, .35, 1); m.position.set(-len * .15, R * 1.8, 0); g.add(m); }
  return g;
}

/** Peça rasteira temática, base em y=0 */
export function makeFlora() {
  const r = rng(Math.floor(Math.random() * 1e6)), w = r();
  const g = w < .38 ? bush(r) : w < .62 ? flowers(r) : w < .78 ? mushrooms(r) : log(r);
  g.rotation.y = r() * 6.28;
  return g;
}
