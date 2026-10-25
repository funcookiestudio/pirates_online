/* Marcha e vida do corpo, usada pelo jogador, NPCs e inimigos (importada da prévia "Anim_Pirata"):
   pés que rolam (calcanhar → planta → ponta), joelhos, quadril que sobe/desce/balança/gira, braço livre em oposição,
   cabeça estabilizada contra o tronco que olha ao redor, piscar, pena do chapéu com mola e inércia da espada. */
import { bend } from './character.js';

const stepS = (s, tg, dt, k = 120, c = 9) => { s.v += ((tg - s.x) * k - s.v * c) * dt; s.x += s.v * dt; };
const spr = () => ({ x: 0, v: 0 });

function state(g) {
  return g.gs || (g.gs = { t: Math.random() * 10, ph: Math.random() * 6, sp: 0, fx: spr(), fz: spr(), sl: spr(), blink: 0, nextBlink: 2 + Math.random() * 3,
    gaze: 0, gazeCur: 0, gazeT: 0, nextGaze: 1 + Math.random() * 3, prevBob: 0, prevArm: 0 });
}

/** Velocidade (m/s) → intensidade da marcha (1 ≈ andar, 1,5 ≈ correr; acima disso só acelera a cadência) */
export const gaitSpeed = v => v / 2.1;

/**
 * Aplica a marcha ao modelo `g` (criado por person()). Chamar DEPOIS das outras poses do frame.
 * o.twist  = 0..1 quanto o tronco gira com o passo (0 ao mirar/golpear)
 * o.armL   = balança o braço livre · o.head = estabiliza/olha ao redor · o.sword = mola na espada (só parado/andando)
 * o.gun    = o modelo está mirando (o olho semicerrado da mira é respeitado)
 * Retorna { w, sw, amp, ph } para o chamador sincronizar o braço da arma.
 */
export function gait(g, dt, sp, o = {}) {
  const S = state(g);
  dt = Math.min(.05, Math.max(.001, dt));
  S.t += dt;
  const pv = S.sp;
  S.sp += (sp - S.sp) * (1 - Math.exp(-12 * dt));
  const acc = Math.max(-8, Math.min(8, (S.sp - pv) / dt));
  S.ph += 7.2 * S.sp * dt;
  const amp = Math.min(S.sp, 1.5), sw = (.5 + .06 * Math.min(amp, 1.5)) * amp, c = Math.cos(S.ph), w = Math.sin(S.ph);

  // pernas + pé rolando
  // coxa: a perna avança mais depressa do que recua (passada assimétrica) e fica levemente à frente do quadril
  const hip = (ph) => { const sn = Math.sin(ph); return sn + .22 * Math.sin(2 * ph + 1.2) * Math.min(1, amp) - .1 * amp; };
  g.legL.rotation.set(hip(S.ph) * sw, 0, 0);
  g.legR.rotation.set(hip(S.ph + Math.PI) * sw, 0, 0);   // (zera os ângulos laterais que a montaria deixa)
  bend(g, S.ph, amp * 1.1);
  [[g.legL, w], [g.legR, -w]].forEach(([l, s]) => {
    const toe = s > 0 ? s * .55 : s * .3;
    l.foot.rotation.x = -(l.rotation.x + l.knee.rotation.x) * .85 + toe * amp;
  });

  // quadril: sobe/desce, balança, torce
  const bob = (.5 + .5 * Math.cos(2 * S.ph)) * .04 * amp, breathe = Math.sin(S.t * 1.8) * .008 * (1 - Math.min(amp, 1));
  g.up.position.set(-w * .004 * amp, .72 + bob + breathe, 0);
  const tw = o.twist === undefined ? 1 : o.twist;
  g.up.rotation.y += w * .02 * amp * tw;
  g.up.rotation.z += w * .005 * amp * tw;
  g.up.rotation.x += Math.max(-.2, Math.min(.2, acc * .05)) * tw + amp * .06 * tw;
  g.position.y -= bob * .6;

  if (o.armL !== false) { g.armL.rotation.x = w * sw * .85; g.armL.rotation.z = Math.sin(S.ph) * .03 * amp; }

  // inércia da espada (mola)
  if (o.sword) {
    const av = (g.arm.rotation.x - S.prevArm) / dt;
    stepS(S.sl, Math.max(-.6, Math.min(.6, -av * .035)), dt);
    g.arm.fa.rotation.x += S.sl.x;
  } else S.sl.x = S.sl.v = 0;
  S.prevArm = g.arm.rotation.x;
  if (o.sword) { g.arm.rotation.x -= w * sw * .75; g.arm.fa.rotation.x -= amp * .12 + Math.max(0, -w) * amp * .25; }   // braço da arma balança em oposição à perna, com o cotovelo dobrado

  // pena do chapéu
  const vy = (bob - S.prevBob) / dt; S.prevBob = bob;
  stepS(S.fx, -amp * .3 - vy * .4 - acc * .08, dt, 90, 6);
  stepS(S.fz, -w * .15 * amp, dt, 90, 6);
  if (g.feather) g.feather.rotation.set(S.fx.x, 0, S.fz.x);

  // cabeça: olha ao redor (parado), estabiliza contra o tronco
  if (o.head !== false) {
    if (amp < .2) {
      S.gazeT += dt;
      if (S.gazeT > S.nextGaze) { S.gaze = (Math.random() - .5) * .9; S.gazeT = 0; S.nextGaze = 1.5 + Math.random() * 3.5; }
    } else S.gaze = 0;
    S.gazeCur += (S.gaze - S.gazeCur) * (1 - Math.exp(-7 * dt));
    g.head.rotation.y = S.gazeCur - g.up.rotation.y * .8;
    g.head.rotation.x = -g.up.rotation.x * .7 + Math.sin(S.t * 1.8) * .01;
  }

  // piscar
  if (S.t > S.nextBlink) { S.blink = .12; S.nextBlink = S.t + 2 + Math.random() * 3; }
  S.blink = Math.max(0, S.blink - dt);
  g.eyeL.scale.y = (o.gun ? g.eyeL.scale.y : 1) * (S.blink > 0 ? .1 : 1);
  if (g.eyeR) g.eyeR.scale.y = g.eyeL.scale.y;

  return { w, sw, amp, ph: S.ph };
}

/** Zera o que a marcha mexe (ao sentar, rolar etc.) */
export function gaitReset(g) {
  const S = g.gs;
  g.up.position.set(0, .72, 0);
  g.legL.foot.rotation.x = g.legR.foot.rotation.x = 0;
  g.head.rotation.set(0, 0, 0);
  if (g.eyeR) g.eyeR.scale.y = 1;
  g.eyeL.scale.y = 1;
  if (g.feather) g.feather.rotation.set(0, 0, 0);
  if (S) { S.sp = 0; S.sl.x = S.sl.v = 0; }
}
