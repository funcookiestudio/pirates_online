/* Armas no corpo: coldres, sacar e guardar.
   A arma corpo a corpo fica no cinto, do lado esquerdo, com a lâmina para baixo e para trás.
   A arma de fogo pequena (pistola) fica no cinto, do lado direito. As grandes (mosquete, bacamarte) ficam nas costas,
   na diagonal. Trocar de arma = guardar a atual e sacar a outra, com animação (sacar roda ao contrário para guardar).

   Os dois modelos de arma são filhos do antebraço; a cada frame `placeWeapons` calcula onde cada um está de verdade:
   no coldre, na mão esquerda (passagem da lâmina) ou na mão direita, misturando as poses pelos pesos do roteiro. */
import { P } from './player.js';
import { WEAPONS } from '../data/weapons.js';
import { ik } from './player-weapon.js';

const V = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const OFF = new V(0, .72, 0);                       // pivô do tronco (grupo `up`) em relação aos pés
const seg = (u, a, b) => { const x = Math.min(1, Math.max(0, (u - a) / (b - a))); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const bump = (u, a, b, f = .15) => seg(u, a, a + f) * (1 - seg(u, b - f, b));
const bez = (A, B, C, t) => new V().addScaledVector(A, (1 - t) * (1 - t)).addScaledVector(B, 2 * (1 - t) * t).addScaledVector(C, t * t);

/** Onde a arma fica guardada: lâmina no cinto esquerdo, pistola no cinto direito, armas grandes nas costas */
export const kindOf = W => W.big ? 'back' : W.gun ? 'hip' : 'blade';
/** Duração (s) de sacar; guardar leva o mesmo tempo */
export const DURATION = { blade: 1.5, hip: 1.2, back: 1.7 };

/* Pose guardada: p = posição da empunhadura (espaço do corpo), d = para onde aponta a ponta da arma (-y do modelo),
   ref = lado do modelo que fica para fora (eixo `ax`). */
const HOLSTER = {
  blade: { p: new V(.34, .9, .03),   d: new V(.12, -.72, -.68), ref: new V(1, 0, 0),  ax: 'x' },
  hip:   { p: new V(-.33, .9, .03),  d: new V(-.03, -.9, .4),   ref: new V(0, 0, 1),  ax: 'z' },
  back:  { p: new V(-.19, 1, -.27),  d: new V(.5, .86, 0),      ref: new V(0, 0, -1), ax: 'z' },
};

/** Rotação do modelo: -y aponta em d e o eixo `ax` (x ou z) fica o mais perto de ref */
function basisQ(d, ref, ax) {
  const y = d.clone().normalize().negate();
  let x, z;
  if (ax === 'z') { z = ref.clone().addScaledVector(y, -ref.dot(y)).normalize(); x = new V().crossVectors(y, z); }
  else { x = ref.clone().addScaledVector(y, -ref.dot(y)).normalize(); z = new V().crossVectors(x, y); }
  return new Q().setFromRotationMatrix(new M4().makeBasis(x, y, z));
}

const HM = {};   // pose guardada de cada tipo, como matriz no espaço do tronco
Object.keys(HOLSTER).forEach(k => {
  const h = HOLSTER[k];
  HM[k] = new M4().compose(h.p.clone().sub(OFF), basisQ(h.d, h.ref, h.ax), new V(1, 1, 1));
});
// lâmina na mão esquerda durante a passagem: apontando para a frente e um pouco para cima
const Q_LHAND = basisQ(new V(0, .45, .89), new V(1, 0, 0), 'x');

/* ---------- Roteiros: u = 0 (arma no coldre) … 1 (arma pronta na mão direita) ----------
   R/L = braço direito/esquerdo (w = quanto o roteiro manda no braço, t = alvo da mão no espaço do corpo, pole = cotovelo)
   lean/yaw = tronco · wh/wl/wr = peso da arma no coldre / na mão esquerda / na mão direita */
const IDLE_L = new V(.42, .95, .06);
const POLE_R = new V(-1, -.3, -.4), POLE_L = new V(.6, -1, -.1);

function script(kind, u, ctx) {
  const o = { R: { w: 0, t: ctx.Hr, pole: POLE_R }, L: { w: 0, t: ctx.Hl, pole: POLE_L }, lean: 0, yaw: 0, wh: 0, wl: 0, wr: 1 };
  if (kind === 'blade') {
    // mão esquerda saca no quadril esquerdo, leva ao centro do peito e passa para a direita
    const Hh = HOLSTER.blade.p, Cc = new V(.02, 1.12, .36), Wp = new V(.38, 1.02, .24);
    o.L.w = seg(u, 0, .2) * (1 - seg(u, .86, 1));
    o.L.t = u < .42 ? Hh : u < .72 ? bez(Hh, Wp, Cc, seg(u, .42, .72)) : Cc;
    o.R.w = seg(u, .5, .72) * (1 - seg(u, .86, 1));
    o.R.t = u < .84 ? Cc : new V().lerpVectors(Cc, ctx.Hr, seg(u, .84, 1));
    o.wh = 1 - seg(u, .42, .72);
    o.wr = seg(u, .76, .88) * (1 - o.wh);
    o.wl = 1 - o.wh - o.wr;
    o.lean = .14 * bump(u, .1, .9);
  } else {
    // arma de fogo: a mão direita vai ao coldre, saca por fora do corpo e leva à posição de guarda
    const back = kind === 'back';
    const Hh = HOLSTER[kind].p, Wp = back ? new V(-.62, 1.28, -.08) : new V(-.55, 1, .22);
    o.R.w = seg(u, 0, back ? .28 : .25) * (1 - seg(u, .82, 1));
    o.R.pole = back ? new V(-.8, 0, -.6) : POLE_R;
    const a = .35, b = back ? .75 : .72;
    o.R.t = u < a ? Hh : u < b ? bez(Hh, Wp, ctx.Hr, seg(u, a, b)) : ctx.Hr;
    o.wh = 1 - seg(u, a, b);
    o.wr = 1 - o.wh;
    o.wl = 0;
    // mão esquerda fica solta, ao lado do corpo, até o fim
    o.L.w = 1 - seg(u, .62, .95);
    o.L.t = IDLE_L;
    o.lean = back ? -.2 * bump(u, .05, .5) : .25 * bump(u, .05, .55);
    o.yaw = back ? -.5 * bump(u, .05, .5) : 0;
  }
  return o;
}

const ia = new THREE.Matrix4();

/** Sobrepõe os braços e o tronco ao pose normal enquanto a troca de arma acontece (chamado depois da pose normal) */
export function applySwap(sw) {
  const g = P.g, up = g.up;
  g.updateMatrixWorld(true);
  const Hr = g.worldToLocal(g.arm.fa.localToWorld(new V(0, -.32, 0)));
  const Hl = g.worldToLocal(g.armL.fa.localToWorld(new V(0, -.32, 0)));
  const nR = { q: g.arm.quaternion.clone(), f: g.arm.fa.rotation.x };
  const nL = { q: g.armL.quaternion.clone(), f: g.armL.fa.rotation.x };
  const s = sw.cur = script(sw.kind, sw.u, { Hr, Hl });

  up.rotation.x += s.lean;
  up.rotation.y += s.yaw;
  const uq = new Q().setFromEuler(up.rotation).invert();
  const toUp = T => T.clone().sub(OFF).applyQuaternion(uq);
  const over = (arm, n, o) => {
    if (o.w <= 0) return;
    ik(arm, toUp(o.t), o.pole);
    arm.quaternion.copy(n.q.clone().slerp(arm.quaternion, o.w));
    arm.fa.rotation.x = lerp(n.f, arm.fa.rotation.x, o.w);
  };
  over(g.arm, nR, s.R);
  over(g.armL, nL, s.L);
  g.updateMatrixWorld(true);
}

const wp = new V(), wq = new Q(), ws = new V(), hp = new V(), hq = new Q(), M = new M4();
const decomp = (m, p, q) => m.decompose(p, q, ws);

/** Põe cada modelo de arma no lugar certo: coldre, mão esquerda (passagem) ou mão direita */
export function placeWeapons() {
  const g = P.g, up = g.up, fa = g.arm.fa;
  g.updateMatrixWorld(true);
  ia.copy(fa.matrixWorld).invert();
  const upQ = new Q().setFromRotationMatrix(up.matrixWorld);
  ['wpn', 'gun'].forEach(k => {
    const m = P.models[k];
    if (!m) return;
    const active = k === P.act;
    if (active && (P.sit > 0 || P.roll > 0)) return;       // sentado/rolando: outras animações cuidam da arma da mão
    const kind = kindOf(WEAPONS[P.wids[k]]);
    decomp(M.multiplyMatrices(up.matrixWorld, HM[kind]), wp, wq);   // no coldre
    const cur = active && P.swap && P.swap.cur;
    const mk = active && !cur ? (P.mountK || 0) : 0;   // montado: a arma da mão vai para o coldre
    const w = cur ? cur : { wh: active ? mk : 1, wl: 0, wr: active ? 1 - mk : 0 };
    if (w.wh < 1) {
      // na mão direita (pose normal da arma) e, na passagem da lâmina, na esquerda
      decomp(M.compose(P.hl.p, P.hl.q, new V(1, 1, 1)).premultiply(fa.matrixWorld), hp, hq);
      if (w.wl > 0) {
        const lp = g.armL.fa.localToWorld(new V(0, -.32, 0));
        const lq = upQ.clone().multiply(Q_LHAND);
        const t = w.wr / (w.wl + w.wr || 1);
        hp.lerpVectors(lp, hp, t);
        hq.copy(lq.slerp(hq, t));
      }
      wp.lerp(hp, 1 - w.wh);
      wq.slerp(hq, 1 - w.wh);
    }
    M.compose(wp, wq, new V(1, 1, 1)).premultiply(ia);
    m.position.setFromMatrixPosition(M);
    m.quaternion.setFromRotationMatrix(M);
  });
}
