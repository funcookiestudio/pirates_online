/* Acariciar o gato: clique no gato → anda até ele → caixa "Acariciar / Sair" → o jogador se ajoelha diante do gato
   e afaga a cabeça dele com a mão esquerda (a direita segura a arma apoiada na coxa). O gato fica sentado, de olhos fechados. */
import { P } from '../entities/player.js';
import { groundY } from '../world/terrain.js';
import { gaitReset } from '../entities/gait.js';

export const PET = { want: null, cat: null, k: 0, kT: 0, t: 0, hold: 0, hp: 0 };
const DOWN = 2.4, UP = 1.9, HOLD = 16;   // descer (s) · levantar (s) · tempo máximo acariciando (s)
const NEAR = .6;   // distância final ao centro do gato
const S = [0, .38, .72, 1];
const KEY = [
  /* 0 em pé       */ { lean: 0,   tl: 0,    kl: .05, tr: 0,    kr: .05, zl: 0,   zr: 0,    aaR: -.4,  afR: -.3,  aaL: 0,    afL: -.15, azL: 0,   hd: 0 },
  /* 1 abaixa      */ { lean: .3,  tl: -.55, kl: .95, tr: -.35, kr: .9,  zl: -.02, zr: .02, aaR: -.5,  afR: -.45, aaL: -.4,  afL: -.4,  azL: .05, hd: .15 },
  /* 2 um joelho   */ { lean: .38, tl: -1.3, kl: 1.45, tr: -.15, kr: 2.2, zl: -.04, zr: .08, aaR: -.7,  afR: -.8,  aaL: -1.0, afL: -.5,  azL: .06, hd: .3 },
  /* 3 estende a mão */ { lean: .3,  tl: -1.3, kl: 1.45, tr: -.15, kr: 2.2, zl: -.04, zr: .08, aaR: -.75, afR: -.85, aaL: -1.72, afL: -.12, azL: .02, hd: .42 },
];
PET.KEY = KEY;
const ss = x => x * x * (3 - 2 * x);
function pose(k) {
  let i = 0;
  while (i < S.length - 2 && k > S[i + 1]) i++;
  const x = ss(Math.min(1, Math.max(0, (k - S[i]) / (S[i + 1] - S[i])))), a = KEY[i], b = KEY[i + 1], o = {};
  for (const n in a) o[n] = a[n] + (b[n] - a[n]) * x;
  return o;
}

export const petting = () => PET.k > 0 || PET.kT > 0;
export function cancelPetWalk() { if (PET.want) { PET.want.want = false; PET.want = null; } }

/** Clique no gato: anda até ficar a ~1 m dele */
export function petWalk(cat) {
  cancelPetWalk(); endPet();
  PET.want = cat; cat.want = true;
  P.tgt = null;
}
/** Chamado todo frame: segue o gato e abre a caixa ao chegar */
export function updatePetWalk(openBox) {
  const c = PET.want;
  if (!c || P.dead) return;
  const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz) || 1;
  if (d < 1.25) { PET.want = null; P.tx = P.x; P.tz = P.z; openBox(c); return; }
  P.tx = c.x + dx / d * 1.0; P.tz = c.z + dz / d * 1.0;
}
export function startPet(cat) {
  PET.cat = cat; PET.kT = 1; PET.t = 0; PET.hold = 0; PET.hp = P.hp;
  cat.pet = true; cat.want = false;
  P.tgt = null; P.tx = P.x; P.tz = P.z;
}
export function endPet() { if (PET.kT) { PET.kT = 0; if (PET.cat) PET.cat.pet = false; } }

export function updatePet(dt) {
  P.vx = P.vz = 0;
  const c = PET.cat;
  if (PET.kT && (P.hp < PET.hp - .5 || P.dead || !c || Math.hypot(P.x - c.x, P.z - c.z) > 2.4 || (PET.hold += dt) > HOLD)) endPet();
  PET.hp = P.hp;
  if (c && PET.kT && PET.k > .25) {   // chega mais perto, de joelhos, até a mão alcançar a cabeça
    const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz) || 1, m = Math.min(dt * .45, d - NEAR);
    if (m > 0) { P.x -= dx / d * m; P.z -= dz / d * m; }
  }
  const rate = PET.kT ? 1 / DOWN : 1 / UP;
  PET.k += Math.sign(PET.kT - PET.k) * rate * dt;
  if (Math.abs(PET.k - PET.kT) < rate * dt) PET.k = PET.kT;
  if (PET.k === 0) endAnim();
}

const box = new THREE.Box3(), tmp = new THREE.Box3();
export function animatePet(dt) {
  const g = P.g, p = pose(PET.k), c = PET.cat;
  gaitReset(g);
  P.walk = 0; P.lean = 0; g.rotation.x = 0;
  if (c) {   // encara o gato
    let dy = Math.atan2(c.x - P.x, c.z - P.z) - g.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.rotation.y += dy * (1 - Math.exp(-dt * 6));
  }
  PET.t += dt;
  const r = Math.min(1, Math.max(0, (PET.k - .72) / .28)), t = PET.t;
  // afago: vai e vem lento da mão sobre a cabeça, com leve ondulação do punho; respira junto
  const st = Math.sin(t * 3.6) * r, st2 = Math.sin(t * 3.6 - 1.2) * r;
  g.up.rotation.set(p.lean + Math.sin(t * 1.6) * .015 * r + st * .02, st * .04, 0);
  g.legL.rotation.set(p.tl, 0, p.zl);
  g.legR.rotation.set(p.tr, 0, p.zr);
  g.legL.knee.rotation.x = p.kl;
  g.legR.knee.rotation.x = p.kr;
  g.head.rotation.x = p.hd + st2 * .03;
  g.head.rotation.y = 0;
  P.aa = p.aaR; P.af = p.afR; P.az = -.05;
  g.arm.rotation.set(P.aa, 0, P.az);
  g.arm.fa.rotation.x = P.af;
  g.armL.rotation.set(p.aaL + st * .07, st2 * .05, p.azL);
  g.armL.fa.rotation.x = p.afL - st * .18 * (r > 0 ? 1 : 0);
  g.position.set(P.x, 0, P.z);
  g.updateMatrixWorld(true);
  box.setFromObject(g.legL);
  box.union(tmp.setFromObject(g.legR));
  g.position.y = (groundY(P.x, P.z) + (P.fy || 0)) - box.min.y - .02;
  g.updateMatrixWorld(true);
}
function endAnim() {
  const g = P.g;
  g.up.rotation.set(0, 0, 0);
  g.legL.rotation.z = g.legR.rotation.z = 0;
  g.armL.rotation.set(0, 0, 0);
  g.head.rotation.x = 0;
  g.position.y = groundY(P.x, P.z) + (P.fy || 0);
  PET.cat = null;
}
