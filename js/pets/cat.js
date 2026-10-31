/* Gato companheiro (adotado pelo vínculo, bond.js): usa o mesmo modelo e as mesmas animações dos gatos da ilha (wildlife-anim.js).
   Segue o jogador, senta quando ele para e luta dando o bote: corre até o inimigo, agacha, salta e dá a patada.
   Estados de CAT.s: none · run · wind (agacha) · pounce (salto + patada) · rec (recuo) */
import { groundY } from '../world/terrain.js';
import { steer, navTarget } from '../systems/steer.js';
import { enemies, props } from '../core/registry.js';
import { turnTo } from '../core/utils.js';
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { puff } from '../systems/effects.js';
import { makeAnimal, animate } from '../entities/wildlife-anim.js';
import { PV, PCD } from './stats.js';
import { petStrike } from './strike.js';
import { petFighting, compHeld, COMP } from './common.js';

export const CAT = { A: null, g: null, coat: null, v: 0, s: 'none', at: null, ac: 0, tm: 0, idle: 0, hit: false, lv: { x: 0, z: 0 }, gt: 0, ge: null, sm: null, jy: 0, gu: 1, rt: 0, mul: false, bell: false };

/** Cria (ou troca a pelagem) e coloca o gato ao lado do jogador */
export function resetCat(coat) {
  if (!CAT.A || CAT.coat !== coat) {
    if (CAT.A) scene.remove(CAT.A.g);
    CAT.A = makeAnimal('cat', coat || 'laranja');
    CAT.A.g.rotation.order = 'YXZ';
    CAT.coat = coat;
    scene.add(CAT.A.g);
  }
  CAT.g = CAT.A.g;
  CAT.g.position.set(P.x - 1.4, groundY(P.x - 1.4, P.z - 1.4), P.z - 1.4);
  CAT.v = 0; CAT.idle = 0; CAT.s = 'none'; CAT.at = null;
  CAT.g.visible = true;
}
export function hideCat() { if (CAT.A) CAT.A.g.visible = false; }
export const catPos = () => (CAT.g ? CAT.g.position : P.g.position);

export function catUpd(dt, now) {
  if (!CAT.A) resetCat('laranja');
  const A = CAT.A, g = CAT.g, pos = g.position, t = now / 1000, spd = Math.hypot(P.vx, P.vz);
  const dxp = P.x - pos.x, dzp = P.z - pos.z, dp = Math.hypot(dxp, dzp);
  if (dp > 40) { pos.x = P.x - 2; pos.z = P.z - 2; }   // ficou muito longe: aparece ao lado

  if (compHeld()) {   // o jogador vem fazer carinho / dar petisco: senta e espera
    CAT.s = 'none'; CAT.at = null; CAT.v = 0;
    turnTo(g, Math.atan2(dxp, dzp), 5, dt);
    pos.y = groundY(pos.x, pos.z);
    animate(A, dt, t + A.t0, COMP.eat ? 'eat' : COMP.pet ? (COMP.roll ? 'roll' : 'pet') : 'sit', {});
    return;
  }

  const cb = petFighting();
  CAT.idle = (spd < .25 && !cb) ? CAT.idle + dt : 0;
  CAT.ac -= dt;
  const pick = () => {
    let b = null, bd = 1e9;
    enemies.forEach(e => { if (e.dead) return; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd && d < 22) { bd = d; b = e; } });
    return b;
  };
  if (!cb && CAT.s !== 'none' && CAT.s !== 'rec') { CAT.s = 'none'; CAT.at = null; }
  if (cb && CAT.s === 'none' && CAT.ac <= 0) { CAT.at = pick(); if (CAT.at) { CAT.s = 'run'; CAT.rt = 0; } }
  let e = CAT.at;
  if ((CAT.s === 'run' || CAT.s === 'wind' || CAT.s === 'pounce') && (!e || e.dead)) { CAT.s = 'none'; CAT.at = e = null; }

  // ----- para onde ir -----
  const wait = CAT.idle > .6 && CAT.s === 'none';
  let tx = P.x, tz = P.z, stop = 1.8, sp = P.sp * .95 * (1 + PV('spd'));
  if (wait) { tx = P.x - 1.0; tz = P.z - 1.0; stop = .2; sp = 2.6; }
  else if (CAT.s === 'run') { tx = e.x; tz = e.z; stop = 2.2; sp = 5.6 * (1 + PV('spd')); }
  else if (cb && CAT.s === 'none') stop = 4.5;
  const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), near = d <= stop + .2;
  let want = 0;
  if ((CAT.s === 'none' || CAT.s === 'run') && d > stop) want = Math.min(sp + (dp > 12 ? 2 : 0), Math.max(1, (d - stop) * 3.5));
  CAT.v += (want - CAT.v) * (1 - Math.exp(-dt * (CAT.s === 'run' ? 7 : 5)));
  if (want === 0 && CAT.v < .2) CAT.v = 0;
  if (CAT.v > 0 && d > 1e-4) {
    const m = CAT.sm || (CAT.sm = { side: 0 });
    const [nx, nz] = navTarget(m, pos.x, pos.z, tx, tz, .35), nd = Math.hypot(nx - pos.x, nz - pos.z) || 1;
    const [sx, sz] = steer(pos.x, pos.z, (nx - pos.x) / nd, (nz - pos.z) / nd, .35, m, d - stop);
    pos.x += sx * CAT.v * dt; pos.z += sz * CAT.v * dt;
    turnTo(g, Math.atan2(dx, dz), CAT.s === 'run' ? 10 : 7, dt);
  }

  // ----- ataque: agacha, salta e dá a patada -----
  let ju = 0;
  const swipe = () => {
    if (CAT.hit || !e || e.dead) return;
    CAT.hit = true;
    CAT.mul = petStrike(e, 1, { kn: .35, ang: Math.atan2(CAT.lv.x, CAT.lv.z) });
    puff(e.x, 1.1, e.z, 0xfff0a0, 3, 5);
  };
  if (CAT.s === 'run') {
    CAT.rt += dt;
    if (CAT.rt > 3.5) { CAT.s = 'none'; CAT.at = null; CAT.ac = .4; }
    else if (Math.hypot(e.x - pos.x, e.z - pos.z) <= 2.6) { CAT.s = 'wind'; CAT.tm = .35; }
  } else if (CAT.s === 'wind') {
    turnTo(g, Math.atan2(e.x - pos.x, e.z - pos.z), 18, dt);
    CAT.tm -= dt;
    if (CAT.tm <= 0) {
      CAT.s = 'pounce'; CAT.tm = .42; CAT.hit = false;
      const lx = e.x - pos.x, lz = e.z - pos.z, l = Math.hypot(lx, lz) || 1;
      CAT.lv = { x: lx / l, z: lz / l };
    }
  } else if (CAT.s === 'pounce') {
    const u = 1 - CAT.tm / .42;
    if (u < .55) { pos.x += CAT.lv.x * 7 * dt; pos.z += CAT.lv.z * 7 * dt; ju = Math.sin(Math.PI * u / .55) * .6; }
    CAT.gu = Math.min(1, u * 1.15);
    CAT.tm -= dt;
    if (u > .45 && e && !e.dead && Math.hypot(e.x - pos.x, e.z - pos.z) <= 2.1) swipe();
    if (CAT.tm <= 0) {
      if (e && Math.hypot(e.x - pos.x, e.z - pos.z) <= 2.8) swipe();
      CAT.s = 'rec'; CAT.tm = .35; CAT.gu = 1;
      CAT.ac = (CAT.mul ? .25 : 1.1) * PCD();
      CAT.mul = false;
    }
  } else if (CAT.s === 'rec') {
    const f = Math.max(0, CAT.tm / .35);
    pos.x -= CAT.lv.x * 2.2 * f * dt; pos.z -= CAT.lv.z * 2.2 * f * dt;
    CAT.tm -= dt;
    if (CAT.tm <= 0) { CAT.s = 'none'; CAT.at = null; }
  }

  // colisão com árvores e pedras
  props.forEach(p => {
    const ex = pos.x - p.position.x, ez = pos.z - p.position.z, dd = Math.hypot(ex, ez) || .01, r = p.r + .35;
    if (dd < r) { pos.x = p.position.x + ex / dd * r; pos.z = p.position.z + ez / dd * r; }
  });

  // ----- para onde olha -----
  if (cb && CAT.s === 'none') { CAT.gt -= dt; if (CAT.gt <= 0) { CAT.gt = .4; CAT.ge = pick(); } }
  if (CAT.v < .3 && CAT.s !== 'wind' && CAT.s !== 'pounce') {
    if (wait && near) turnTo(g, P.g.rotation.y, 3, dt);
    else if (cb && CAT.ge && !CAT.ge.dead && CAT.s === 'none') turnTo(g, Math.atan2(CAT.ge.x - pos.x, CAT.ge.z - pos.z), 6, dt);
    else if (dp > .5 && CAT.s === 'none') turnTo(g, Math.atan2(dxp, dzp), 5, dt);
  }

  // ----- animação -----
  CAT.jy += (ju - CAT.jy) * Math.min(1, dt * 20);
  pos.y = groundY(pos.x, pos.z) + CAT.jy;
  let mode, o = { spd: CAT.v };
  if (CAT.s === 'wind') mode = 'stretch';                                  // agachado, pronto para o bote
  else if (CAT.s === 'pounce') { mode = 'swipe'; o.gu = CAT.gu; o.fast = 1; }
  else if (CAT.v > 3.2) mode = 'run';
  else if (CAT.v > .25) mode = 'walk';
  else if (wait && near) mode = CAT.idle > 14 ? 'groom' : 'sit';            // esperando muito tempo: se lambe
  else mode = 'idle';
  animate(A, dt, t + A.t0, mode, o);
}
