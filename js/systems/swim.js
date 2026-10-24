/* Natação (poses da prévia "Anim_Pirata"): NADAR (peito) · BOIAR (parado) · NADAR RÁPIDO (crawl, viagens longas) · MERGULHAR (esquiva na água).
   Cada pose é calculada no esqueleto e misturada por peso: entrar e sair da água é suave. O corpo gira em torno do quadril (como na rolada). */
import { P } from '../entities/player.js';
import { state } from '../core/state.js';
import { waterDepth, waterLevel, floorY } from '../world/terrain.js';
import { puff } from './effects.js';

const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const kf = (a, p) => { for (let i = 1; i < p.length; i++) if (a <= p[i][0]) { const [t0, v0] = p[i - 1], [t1, v1] = p[i]; return v0 + (v1 - v0) * ease((a - t0) / (t1 - t0)); } return p[p.length - 1][1]; };

const WL = 1, K = ['th', 'py', 'ro', 'ux', 'uy', 'uz', 'hx', 'hy', 'ax', 'az', 'af', 'bx', 'bz', 'bf', 'lx', 'lz', 'lk', 'lf', 'rx', 'rz', 'rk', 'rf'];
const mk = o => Object.assign({ th: 1.3, py: WL - .14, ro: 0, ux: 0, uy: 0, uz: 0, hx: 0, hy: 0, ax: -2.95, az: 0, af: -.05, bx: -2.95, bz: 0, bf: -.05,
  lx: -.1, lz: .05, lk: .1, lf: .9, rx: -.1, rz: -.05, rk: .1, rf: .9 }, o);
let t = 0, ds = 0;

const poseSw = () => {
  const u = (t / 2.2) % 1, k = p => kf(u, p);
  const x = k([[0, -2.95], [.16, -2.55], [.3, -1.9], [.42, -1.25], [.54, -2.2], [.64, -2.95], [1, -2.95]]),
    m = k([[0, -.1], [.16, 1.15], [.3, .75], [.42, .2], [.54, .05], [.64, -.1], [1, -.1]]),
    f = k([[0, -.05], [.16, -.25], [.3, -.9], [.42, -1.95], [.54, -.6], [.64, -.05], [1, -.05]]),
    lx = k([[0, -.08], [.3, -.08], [.44, -.6], [.54, -.6], [.62, .05], [.74, -.08], [1, -.08]]),
    lk = k([[0, .12], [.3, .12], [.44, 1.7], [.54, 1.7], [.62, .05], [.74, .12], [1, .12]]),
    lm = k([[0, .05], [.3, .05], [.44, .35], [.54, .6], [.62, .2], [.7, .04], [1, .05]]),
    lf = k([[0, .9], [.3, .9], [.44, -.4], [.54, -.4], [.62, .6], [.7, 1], [1, .9]]),
    th = k([[0, 1.38], [.2, 1.32], [.36, 1.24], [.52, 1.3], [.66, 1.4], [1, 1.38]]), ux = .03;
  return mk({ th, ux, py: WL + k([[0, -.2], [.2, -.16], [.36, -.1], [.52, -.14], [.66, -.2], [1, -.2]]),
    hx: -(th + ux) * .75 - k([[0, 0], [.36, .12], [.6, 0], [1, 0]]), hy: .04 * Math.sin(t * 1.1),
    ax: x, bx: x, az: -m, bz: m, af: f, bf: f, lx, rx: lx, lk, rk: lk, lz: lm, rz: -lm, lf, rf: lf });
};
const poseFl = () => {
  const s = Math.sin, c = Math.cos, q = t * 4, g = q * .9;
  return mk({ th: .04 * s(t * .8), py: WL - .68 + .05 * s(t * 1.3) + .015 * s(t * 3.1), ro: .3 * s(t * .35),
    ux: .05 + .02 * s(t * 1.3), uz: .04 * s(t * .9), hx: .05 * s(t * .7), hy: .35 * s(t * .5),
    ax: -.5 + .35 * c(q), bx: -.5 + .35 * c(q), az: -(.85 + .25 * s(q)), bz: .85 + .25 * s(q),
    af: -1.1 + .3 * s(q + 1), bf: -1.1 + .3 * s(q + 1),
    lx: -.9 + .28 * s(g), rx: -.9 - .28 * s(g), lk: 1.5 + .5 * s(g + 1.3), rk: 1.5 - .5 * s(g + 1.3),
    lz: .3 + .15 * c(g), rz: -(.3 - .15 * c(g)), lf: .2 + .4 * s(g), rf: .2 - .4 * s(g) });
};
const poseCr = () => {
  const T = .85, p = t * 6.2832 / T, u = p / 6.2832, s = Math.sin;
  const A = q => { q %= 1; return [-3.1416 + 6.2832 * q - .35 * s(6.2832 * q), kf(q, [[0, .1], [.25, .15], [.5, .2], [.75, .55], [1, .1]]), kf(q, [[0, -.1], [.12, -.35], [.35, -1.1], [.5, -.4], [.62, -1.7], [.82, -1.5], [1, -.1]])]; };
  const R = A(u), Lb = A(u + .5), ro = .62 * s(p);
  let d = ((p - 1.5708) % 12.566 + 12.566) % 12.566; if (d > 6.283) d -= 12.566;
  const w = ease(1 - Math.abs(d) / 2.83), c = p * 3, k = .35 * s(c);
  return mk({ th: 1.42 + .03 * s(2 * p), py: WL - .16 + .03 * s(2 * p), ro: ro * .5, uy: ro * .5, ux: -.08, uz: -ro * .06, hx: -.35, hy: -ro * .75 + 1.3 * w,
    ax: R[0], az: -R[1], af: R[2], bx: Lb[0], bz: Lb[1], bf: Lb[2],
    lx: -.1 + k, rx: -.1 - k, lk: .15 + .5 * Math.max(0, -s(c)), rk: .15 + .5 * Math.max(0, s(c)), lz: .03, rz: -.03, lf: 1.1, rf: 1.1 });
};
const DIVE = 7.8, DIVE_RATE = 1.6;   // ciclo do mergulho e velocidade de reprodução
const poseDv = () => {
  const u = ds % DIVE, k = p => kf(u, p), s = Math.sin, w = s(9 * u);
  const a = k([[0, 0], [1.7, 0], [2.3, .35], [6.6, .35], [7.3, 0], [7.8, 0]]),
    x = k([[0, -2.95], [.6, -2.95], [1, -2], [1.5, -.4], [1.9, -.3], [2.5, -3], [6.7, -3], [7.1, -2.4], [7.4, -1.4], [7.65, -2.6], [7.8, -2.95]]),
    m = k([[0, -.1], [.6, -.1], [1, .7], [1.5, .25], [2.4, -.14], [6.7, -.14], [7.1, .9], [7.4, .35], [7.8, -.1]]),
    f = k([[0, -.05], [.6, -.05], [1, -.8], [1.5, -.2], [2.2, -.1], [6.7, -.1], [7.1, -.3], [7.4, -1.6], [7.8, -.05]]);
  return mk({
    th: k([[0, 1.3], [.7, 1.3], [1.3, 2.4], [2, 2.8], [3.4, 2.6], [5.4, 2.55], [6.1, 1.6], [6.9, .95], [7.8, 1.3]]),
    py: WL + k([[0, -.14], [.7, -.14], [1.1, -.35], [1.5, -1], [2, -1.7], [2.7, -2.4], [3.4, -2.9], [5.4, -2.9], [6.2, -2.6], [6.9, -1.3], [7.5, -.2], [7.8, -.14]]),
    ux: k([[0, .05], [.7, .05], [1.2, .9], [1.7, .9], [2.3, .1], [5.4, .1], [7.8, .05]]) + a * .4 * s(9 * u - .8),
    hx: k([[0, -1.1], [.7, -1], [1.2, .3], [2, 0], [6.2, 0], [7.8, -1.1]]),
    ax: x, bx: x, az: -m, bz: m, af: f, bf: f,
    lx: -.1 + a * w, rx: -.1 - a * w, lk: .1 + 1.6 * a * Math.max(0, -w), rk: .1 + 1.6 * a * Math.max(0, w), lf: 1, rf: 1 });
};
const POSES = { sw: poseSw, fl: poseFl, cr: poseCr, dv: poseDv };
const wt = { sw: 0, fl: 0, cr: 0, dv: 0 };
const SPEED_K = { fl: 1, sw: .55, cr: .8, dv: .6 };

P.swimming = false; P.dive = 0; P.swimK = 1; P.diveUnder = false;
let mode = null, splashT = 0, wasSwim = false;

/** Mergulho (esquiva na água). Devolve true se tratou o comando. */
export function startDive() {
  if (!P.swimming || P.dive > 0 || P.rcd > 0) return false;
  P.dive = DIVE / DIVE_RATE; ds = 0; P.rcd = 3.5;
  puff(P.x, waterLevel(P.x, P.z), P.z, 0x8ad0e8, 3, 7);
  return true;
}

/** Decide se está nadando e qual pose; ajusta a velocidade. Chamar antes do movimento. */
export function updateSwimState(dt) {
  t += dt;
  const d = waterDepth(P.x, P.z);
  P.swimming = !P.dead && !P.sit && !P.sitT && d > (P.swimming ? .8 : 1);
  if (P.swimming !== wasSwim) { wasSwim = P.swimming; puff(P.x, waterLevel(P.x, P.z), P.z, 0x8ad0e8, 3, 7); }
  if (P.dive > 0) { P.dive -= dt; ds += dt * DIVE_RATE; if (P.dive <= 0) P.dive = 0; }
  P.diveUnder = P.dive > 0 && ds > 1.5 && ds < 6.8;
  if (!P.swimming) { P.dive = 0; P.diveUnder = false; mode = null; P.swimK = 1; return; }
  const spd = Math.hypot(P.vx, P.vz), far = !P.tgt && Math.hypot(P.tx - P.x, P.tz - P.z) > 10;
  mode = P.dive > 0 ? 'dv' : spd < .4 ? 'fl' : (far || state.autoOn) ? 'cr' : 'sw';
  P.swimK = SPEED_K[mode] === 1 ? .55 : SPEED_K[mode];
  splashT -= dt;
  if (spd > 1 && splashT <= 0) { splashT = .45; puff(P.x, waterLevel(P.x, P.z), P.z, 0xbfe8f4, 2, 2); }
}

/** Mistura as poses de natação por cima da animação normal do frame (chamar depois de animate/applyAim) */
export function swimPose(dt) {
  let W = 0; const wp = {}; K.forEach(k => wp[k] = 0);
  const wr = mode === 'dv' || wt.dv > .3 ? 2.2 : 5;
  for (const m in POSES) {
    wt[m] += ((m === mode ? 1 : 0) - wt[m]) * (1 - Math.exp(-wr * dt));
    if (wt[m] > .002) { const q = POSES[m](); W += wt[m]; K.forEach(k => wp[k] += q[k] * wt[m]); }
  }
  if (W <= .002) return;
  const Wc = Math.min(1, W), L = (a, b) => a + (b - a) * Wc, g = P.g;
  K.forEach(k => wp[k] /= W);
  P.swimW = Wc;
  const yaw = g.rotation.y, lvl = waterLevel(P.x, P.z), fl = floorY(P.x, P.z);
  // altura do quadril: segue a superfície, sem entrar no chão
  const hip = Math.max(lvl + wp.py - WL, fl + .8 * Math.abs(Math.cos(wp.th)) + .2);
  const f = -.8 * Math.sin(wp.th);
  g.rotation.x = L(g.rotation.x, wp.th);
  g.position.set(L(g.position.x, P.x + Math.sin(yaw) * f), L(g.position.y, hip - .8 * Math.cos(wp.th)), L(g.position.z, P.z + Math.cos(yaw) * f));
  const ur = g.up.rotation;
  ur.x = L(ur.x, wp.ux); ur.y = L(ur.y, wp.uy + wp.ro * .6); ur.z = L(ur.z, wp.uz);
  g.up.position.y = L(g.up.position.y, .72);
  g.arm.rotation.x = L(g.arm.rotation.x, wp.ax); g.arm.rotation.z = L(g.arm.rotation.z, wp.az); g.arm.fa.rotation.x = L(g.arm.fa.rotation.x, wp.af);
  g.armL.rotation.x = L(g.armL.rotation.x, wp.bx); g.armL.rotation.z = L(g.armL.rotation.z, wp.bz); g.armL.fa.rotation.x = L(g.armL.fa.rotation.x, wp.bf);
  [[g.legL, 'l'], [g.legR, 'r']].forEach(([l, s]) => {
    l.rotation.x = L(l.rotation.x, wp[s + 'x']); l.rotation.z = L(l.rotation.z, wp[s + 'z']);
    l.knee.rotation.x = L(l.knee.rotation.x, wp[s + 'k']); l.foot.rotation.x = L(l.foot.rotation.x, wp[s + 'f']);
  });
  g.head.rotation.x = L(g.head.rotation.x, wp.hx); g.head.rotation.y = L(g.head.rotation.y, wp.hy);
  g.head.rotation.z = L(g.head.rotation.z, 0);
}
