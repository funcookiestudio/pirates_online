/* Esquiva (Espaço): rolamento para trás com invulnerabilidade durante a rolada.
   A direção é sempre oposta à que o personagem está olhando. */
import { P } from '../entities/player.js';
import { puff } from './effects.js';
import { gaitReset } from '../entities/gait.js';

export const ROLL_TIME = .5; // duração da rolada (s)
export const ROLL_CD = 3.5;  // recarga (s)
const ROLL_SPEED = 14;       // velocidade inicial (m/s); desacelera até ~30% no fim

/** Inicia a rolada, se possível */
export function dodge() {
  if (P.swap) return;
  if (P.dead || P.roll > 0 || P.rcd > 0 || P.sit > 0 || P.sitT) return;
  const a = P.g.rotation.y;
  P.roll = ROLL_TIME;
  P.rcd = ROLL_CD;
  P.rdx = -Math.sin(a);
  P.rdz = -Math.cos(a);
  P.imp = 0;  // cancela golpe corpo a corpo em andamento
  P.sw = 0;
  P.vx = P.vz = 0;
  puff(P.x, .2, P.z, 0xc9b48a, 3, 6);
}

/** Desloca o jogador durante a rolada (substitui o movimento normal) */
export function rollMove(dt) {
  const u = 1 - P.roll / ROLL_TIME;
  const sp = ROLL_SPEED * (1 - u * .7);
  P.x += P.rdx * sp * dt;
  P.z += P.rdz * sp * dt;
  if (!P.tgt) { P.tx = P.x; P.tz = P.z; } // não volta para o ponto clicado depois
}

/** Contagem regressiva da rolada e da recarga; poeira ao aterrissar */
export function updateDodgeTimers(dt) {
  if (P.roll > 0) {
    P.roll -= dt;
    if (P.roll <= 0) {
      P.roll = 0;
      puff(P.x, .2, P.z, 0xc9b48a, 3, 6);
    }
  }
  P.rcd = Math.max(0, P.rcd - dt);
}

/* Cambalhota (da prévia "Anim_Pirata"): agacha → gira o corpo todo em volta do centro do tronco → levanta.
   Como a rolada do jogo é sempre para trás, usa a versão "rolar trás": o ombro vai para trás antes do giro. */
const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const kf = (a, p) => { for (let i = 1; i < p.length; i++) if (a <= p[i][0]) { const [t0, v0] = p[i - 1], [t1, v1] = p[i]; return v0 + (v1 - v0) * ease((a - t0) / (t1 - t0)); } return p[p.length - 1][1]; };

export function animateRoll() {
  const g = P.g, r = Math.min(1, 1 - P.roll / ROLL_TIME);
  gaitReset(g);
  const prog = kf(r, [[0, 0], [.15, 0], [.65, 1], [1, 1]]);
  const th = -Math.PI * 2 * prog;                                     // negativo = cabeça vai para trás
  const ch = kf(r, [[0, .8], [.15, .66], [.25, .55], [.6, .55], [.82, .72], [1, .8]]);   // altura do centro de giro
  const f = -.8 * Math.sin(th), yaw = g.rotation.y;
  g.rotation.x = th;
  g.position.set(P.x + Math.sin(yaw) * f, ch - .8 * Math.cos(th), P.z + Math.cos(yaw) * f);

  // encolhe (tw: 0 em pé → 1 totalmente agachado)
  const tw = kf(r, [[0, 0], [.15, .6], [.25, 1], [.6, 1], [.82, .25], [1, 0]]), L = (a, b) => a + (b - a) * tw;
  g.legL.rotation.x = g.legR.rotation.x = L(0, -1.5);
  g.legL.knee.rotation.x = g.legR.knee.rotation.x = L(0, 2.2);
  g.arm.rotation.set(L(P.aa || 0, -1.1), 0, L(P.az || 0, 0));
  g.arm.fa.rotation.x = L(P.af || 0, -1.7);
  g.armL.rotation.set(L(0, -1.1), 0, 0);
  g.armL.fa.rotation.x = L(0, -1.9);
  const shoulder = kf(r, [[0, 0], [.14, .4], [.3, 0], [1, 0]]);        // ombro esquerdo para trás antes do giro
  g.up.rotation.set(L(0, .9), shoulder, 0);
  g.head.rotation.set(tw * .5, 0, 0);
}
