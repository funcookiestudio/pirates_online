/* Sentar e levantar: animação orgânica em etapas, reversível a qualquer momento.
   Descer: dobra os joelhos → agacha e apoia a arma no chão, ao lado → apoia as mãos atrás e desliza até sentar.
   Subir: faz o caminho inverso (empurra com as mãos, pega a arma do chão, levanta). A arma fica sempre visível.
   P.sit vai de 0 (em pé) a 1 (sentado) em direção a P.sitT; trocar P.sitT no meio inverte suavemente. */
import { P } from '../entities/player.js';
import { groundY, slideTo } from '../world/terrain.js';
import { gaitReset } from '../entities/gait.js';
import { MOUNT } from './mount.js';

export const SIT_DOWN = 3;   // duração (s) de em pé → sentado
export const SIT_UP = 2.6;   // duração (s) de sentado → em pé
const FAST = 1.8;            // levantar às pressas (ex.: levou dano)

/* Poses-chave nos pontos S do progresso. lean = inclinação do tronco · tl/kl, tr/kr = coxa/joelho
   · zl/zr = abertura das pernas · aa/af/az = braço (ombro/cotovelo/abertura) */
const S = [0, .22, .5, 1];
const K = [
  /* 0 em pé      */ { lean: 0,    tl: 0,     kl: .05, tr: 0,     kr: .05, zl: 0,    zr: 0,   aaR: -.4,  afR: -.3,  azR: -.05, aaL: 0,    afL: -.15, azL: 0 },
  /* 1 dobra joelhos */ { lean: .25, tl: -.7, kl: 1.0, tr: -.65, kr: .95, zl: -.03, zr: .03, aaR: -.55, afR: -.45, azR: -.1,  aaL: -.3, afL: -.3,  azL: .05 },
  /* 2 agachado, arma no chão */ { lean: 1.0, tl: -1.5, kl: 2.3, tr: -1.45, kr: 2.25, zl: -.08, zr: .08, aaR: -1.2, afR: -.05, azR: -.35, aaL: -.75, afL: -.55, azL: .15 },
  /* 3 sentado    */ { lean: -.72, tl: -1.56, kl: -.12, tr: -1.52, kr: -.04, zl: -.1,  zr: .12, aaR: .87,  afR: -.1,  azR: -.28, aaL: .83, afL: -.1,  azL: .28 },
];
const ss = x => x * x * (3 - 2 * x);

/** Pose interpolada para o progresso s (suavizada em cada trecho) */
export function sitPose(s) {
  let i = 0;
  while (i < S.length - 2 && s > S[i + 1]) i++;
  const x = ss(Math.min(1, Math.max(0, (s - S[i]) / (S[i + 1] - S[i]))));
  const a = K[i], b = K[i + 1], o = {};
  for (const k in a) o[k] = a[k] + (b[k] - a[k]) * x;
  return o;
}

export function sitDown() { if (!P.dead && P.roll <= 0 && !MOUNT.on) { P.sitT = 1; P.sitF = false; } }
export function standUp(fast) { P.sitT = 0; P.sitF = !!fast; }
export function toggleSit() { if (P.swap) return; P.sitT ? standUp() : sitDown(); }

/** Avança o progresso; chamado todo frame */
export function updateSit(dt) {
  if (P.sit === P.sitT) return;
  const rate = (P.sitT ? 1 / SIT_DOWN : 1 / SIT_UP) * (P.sitF ? FAST : 1);
  P.sit += Math.sign(P.sitT - P.sit) * rate * dt;
  if (Math.abs(P.sit - P.sitT) < rate * dt) P.sit = P.sitT;
  P.vx = P.vz = 0;
  if (P.sit === 0) endSit();
}

const box = new THREE.Box3(), tmp = new THREE.Box3();

/* A arma sai da mão e pousa no chão, ao lado do corpo, entre os pontos PLACE do progresso */
const PLACE = [.4, .54];
const GROUND = new THREE.Vector3(-.62, .06, .5);   // onde a empunhadura fica (espaço do corpo; y = chão)
const Q_LAY = new THREE.Quaternion()               // deitada, apontando para a frente, lado chato para baixo
  .setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
const ONE = new THREE.Vector3(1, 1, 1);
const M = new THREE.Matrix4(), wp = new THREE.Vector3(), gp = new THREE.Vector3();
const wq = new THREE.Quaternion(), gq = new THREE.Quaternion(), ws = new THREE.Vector3();

/** Mistura a arma da mão entre a mão (b=0) e o chão (b=1); a arma continua sendo filha do antebraço */
function placeWeapon() {
  const h = P.hand;
  if (!h) return;
  const x = Math.min(1, Math.max(0, (P.sit - PLACE[0]) / (PLACE[1] - PLACE[0])));
  const b = ss(x);
  const fa = P.g.arm.fa;
  fa.updateMatrixWorld(true);
  M.compose(P.hl.p, P.hl.q, ONE).premultiply(fa.matrixWorld).decompose(wp, wq, ws); // pose se estivesse na mão
  gp.copy(GROUND).applyMatrix4(P.g.matrixWorld);
  gp.y = GROUND.y + groundY(P.x, P.z);
  gq.copy(P.g.quaternion).multiply(Q_LAY);
  wp.lerp(gp, b);
  wq.slerp(gq, b);
  M.compose(wp, wq, ONE).premultiply(ia.copy(fa.matrixWorld).invert()).decompose(h.position, h.quaternion, ws);
}
const ia = new THREE.Matrix4();

/** Aplica a pose ao modelo; o corpo desce sozinho até as pernas tocarem o chão */
export function animateSit(dt) {
  const g = P.g, p = sitPose(P.sit);
  gaitReset(g);
  P.walk = 0;
  P.lean = 0;
  g.rotation.x = 0;
  g.up.rotation.set(p.lean, 0, 0);
  g.legL.rotation.set(p.tl, 0, p.zl);
  g.legR.rotation.set(p.tr, 0, p.zr);
  g.legL.knee.rotation.x = p.kl;
  g.legR.knee.rotation.x = p.kr;

  // respira de leve quando sentado
  P.br = (P.br || 0) + dt;
  const rest = ss(Math.max(0, (P.sit - .85) / .15));
  g.up.rotation.x += Math.sin(P.br * 1.7) * .018 * rest;

  P.aa = p.aaR; P.af = p.afR; P.az = p.azR;
  g.arm.rotation.set(P.aa, 0, P.az);
  g.arm.fa.rotation.x = P.af;
  g.armL.rotation.set(p.aaL, 0, p.azL);
  g.armL.fa.rotation.x = p.afL;

  // altura: apoia o ponto mais baixo das pernas no chão (em pé o pé fica em -0,02)
  g.position.set(P.x, 0, P.z);
  g.updateMatrixWorld(true);
  box.setFromObject(g.legL);
  box.union(tmp.setFromObject(g.legR));
  g.position.y = groundY(P.x, P.z) - box.min.y - .02;
  g.updateMatrixWorld(true);
  placeWeapon();

}

/** De volta em pé: limpa tudo que a pose mexeu */
function endSit() {
  const g = P.g;
  g.up.rotation.x = 0;
  g.legL.rotation.z = g.legR.rotation.z = 0;
  g.armL.rotation.set(0, 0, 0);
  g.position.y = groundY(P.x, P.z);
}
