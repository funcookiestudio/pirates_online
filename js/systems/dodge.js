/* Esquiva (Espaço): rolamento com invulnerabilidade durante a rolada, em 4 direções (frente, trás, esquerda, direita).
   Manual: andando → para a frente; parado com inimigo por perto → de lado (alternando); senão → para trás. O auto sempre rola para trás. */
import { P } from '../entities/player.js';
import { puff } from './effects.js';
import { gaitReset } from '../entities/gait.js';
import { startDive } from './swim.js';
import { MOUNT } from './mount.js';
import { walkable } from '../world/terrain.js';

export const ROLL_TIME = .5; // duração da rolada (s)
export const ROLL_CD = 3.5;  // recarga (s)
const ROLL_SPEED = 14;       // velocidade inicial (m/s); desacelera até ~30% no fim

/** Inicia a rolada, se possível */
const ROLLS = { f: { ax: 'x', s: 1 }, b: { ax: 'x', s: -1 }, l: { ax: 'z', s: -1 }, r: { ax: 'z', s: 1 } };
let side = 1;
/** Escolhe a direção da rolada manual */
function pickDir() {
  const a = P.g.rotation.y, fx = Math.sin(a), fz = Math.cos(a), lx = Math.cos(a), lz = -Math.sin(a);
  if (Math.hypot(P.vx, P.vz) > .6 || Math.hypot(P.tx - P.x, P.tz - P.z) > 1.5) return 'f';
  if (P.tgt && !P.tgt.dead && Math.hypot(P.tgt.x - P.x, P.tgt.z - P.z) < 14) {
    for (let k = 0; k < 2; k++) {
      const sd = side * (k ? -1 : 1);
      if (walkable(P.x + lx * sd * 3, P.z + lz * sd * 3)) { side = -sd; return sd > 0 ? 'l' : 'r'; }
    }
  }
  return 'b';
}

export function dodge(dir) {
  if (P.swap || MOUNT.on) return;   // montado não rola
  if (P.swimming) { startDive(); return; }   // na água a esquiva é um mergulho
  if (P.dead || P.roll > 0 || P.rcd > 0 || P.sit > 0 || P.sitT) return;
  const a = P.g.rotation.y, d = typeof dir === 'string' ? dir : pickDir();
  const vx = { f: Math.sin(a), b: -Math.sin(a), l: Math.cos(a), r: -Math.cos(a) }[d], vz = { f: Math.cos(a), b: -Math.cos(a), l: -Math.sin(a), r: Math.sin(a) }[d];
  P.roll = ROLL_TIME;
  P.rcd = ROLL_CD;
  P.rdir = d;
  P.rdx = vx;
  P.rdz = vz;
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
  const R = ROLLS[P.rdir] || ROLLS.b, th = Math.PI * 2 * prog * R.s;   // eixo x: frente/trás · eixo z: esquerda/direita
  const ch = kf(r, [[0, .8], [.15, .66], [.25, .55], [.6, .55], [.82, .72], [1, .8]]);   // altura do centro de giro
  const yaw = g.rotation.y, fo = R.ax === 'x' ? -.8 * Math.sin(th) : 0, lo = R.ax === 'z' ? .8 * Math.sin(th) : 0;
  g.rotation.x = R.ax === 'x' ? th : 0; g.rotation.z = R.ax === 'z' ? th : 0;
  g.position.set(P.x + Math.sin(yaw) * fo + Math.cos(yaw) * lo, ch - .8 * Math.cos(th), P.z + Math.cos(yaw) * fo - Math.sin(yaw) * lo);

  // encolhe (tw: 0 em pé → 1 totalmente agachado)
  const tw = kf(r, [[0, 0], [.15, .6], [.25, 1], [.6, 1], [.82, .25], [1, 0]]), L = (a, b) => a + (b - a) * tw;
  g.legL.rotation.x = g.legR.rotation.x = L(0, -1.5);
  g.legL.knee.rotation.x = g.legR.knee.rotation.x = L(0, 2.2);
  g.arm.rotation.set(L(P.aa || 0, -1.1), 0, L(P.az || 0, 0));
  g.arm.fa.rotation.x = L(P.af || 0, -1.7);
  g.armL.rotation.set(L(0, -1.1), 0, 0);
  g.armL.fa.rotation.x = L(0, -1.9);
  const shoulder = R.ax === 'x' ? -R.s * kf(r, [[0, 0], [.14, .4], [.3, 0], [1, 0]]) : 0;   // ombro à frente/atrás antes do giro (só frente/trás)
  g.up.rotation.set(L(0, .9), shoulder, 0);
  g.head.rotation.set(tw * .5, 0, 0);
}
