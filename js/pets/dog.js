/* Cachorro: segue o jogador, senta quando ele para e ataca (corre, agacha, salta e morde).
   Estados de DOG.s: none · run · wind (agacha) · lunge (salto) · rec (recuo) */
import { steer, navTarget } from '../systems/steer.js';
import { enemies, props } from '../core/registry.js';
import { turnTo } from '../core/utils.js';
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { puff } from '../systems/effects.js';
import { mkDog } from './models.js';
import { PV, PCD } from './stats.js';
import { petStrike } from './strike.js';
import { petFighting } from './common.js';

export const DOG = {
  g: mkDog(), sit: 0, idle: 0, v: 0, ph: 0, s: 'none', at: null, ac: 0, tm: 0, ow: 0, ap: 'wind',
  hit: false, lv: { x: 0, z: 0 }, jy: 0, roll: 0, gt: 0, ge: null, mu: 0,
};
{
  const g = DOG.g;
  g.scale.setScalar(.75);
  g.rotation.order = 'YXZ';
  g.visible = false;
  scene.add(g);
}

/** Defasagens das patas no trote (DTO) e no galope (DGO) */
const DTO = [0, Math.PI, Math.PI, 0];
const DGO = [0, .5, Math.PI, Math.PI + .5];

/** Coloca o cachorro ao lado do jogador (usado ao trocar de companheiro) */
export function resetDog() {
  DOG.g.position.set(P.x - 1.6, 0, P.z - 1.6);
  DOG.sit = 0;
  DOG.v = 0;
  DOG.idle = 0;
  DOG.g.visible = true;
}

export function dogUpd(dt, now) {
  const g = DOG.g, pos = g.position, t = now / 1000, spd = Math.hypot(P.vx, P.vz);
  const cb = petFighting(), yaw0 = g.rotation.y;

  DOG.idle = (spd < .25 && !cb) ? DOG.idle + dt : 0;
  DOG.ac -= dt;
  const dxp = P.x - pos.x, dzp = P.z - pos.z, dp = Math.hypot(dxp, dzp);
  if (dp > 40) { pos.x = P.x - 2; pos.z = P.z - 2; } // ficou muito longe: teleporta

  /** Inimigo mais próximo do jogador (até 22 m) */
  const pick = () => {
    let b = null, bd = 1e9;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d < bd && d < 22) { bd = d; b = e; }
    });
    return b;
  };

  if (!cb && DOG.s !== 'none' && DOG.s !== 'rec') { DOG.s = 'none'; DOG.at = null; }
  if (cb && DOG.s === 'none' && DOG.ac <= 0) {
    DOG.at = pick();
    if (DOG.at) { DOG.s = 'run'; DOG.rt = 0; }
  }
  let e = DOG.at;
  if ((DOG.s === 'run' || DOG.s === 'wind' || DOG.s === 'lunge') && (!e || e.dead)) {
    DOG.s = 'none';
    DOG.at = e = null;
  }

  // ----- para onde ir -----
  const wait = DOG.idle > .5 && DOG.s === 'none';
  let tx = P.x, tz = P.z, stop = 2, sp = P.sp * .92 * (1 + PV('spd'));
  if (wait) { tx = P.x + 1.1; tz = P.z - 1.1; stop = .15; sp = 3.2; }
  else if (DOG.s === 'run') { tx = e.x; tz = e.z; stop = 2.1; sp = 5.2 * (1 + PV('spd')); }
  else if (cb && DOG.s === 'none') stop = 5;

  const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), near = d <= stop + .2;
  let want = 0;
  if ((DOG.s === 'none' || DOG.s === 'run') && d > stop && DOG.sit < .3) {
    want = Math.min(sp + (dp > 12 ? 2 : 0), Math.max(1.2, (d - stop) * 3.5));
  }
  DOG.v += (want - DOG.v) * (1 - Math.exp(-dt * (DOG.s === 'run' ? 6 : 4.5)));
  if (want === 0 && DOG.v < .2) DOG.v = 0;
  if (DOG.v > 0 && d > 1e-4) {
    const [nx, nz] = navTarget(DOG.sm || (DOG.sm = { side: 0 }), pos.x, pos.z, tx, tz, .45), nd = Math.hypot(nx - pos.x, nz - pos.z) || 1;
    const [sx, sz] = steer(pos.x, pos.z, (nx - pos.x) / nd, (nz - pos.z) / nd, .45, DOG.sm || (DOG.sm = { side: 0 }), d - stop);
    pos.x += sx * DOG.v * dt;
    pos.z += sz * DOG.v * dt;
    turnTo(g, Math.atan2(dx, dz), DOG.s === 'run' ? 9 : 6, dt);
  }

  // ----- ataque -----
  let ju = 0;
  const bite = () => {
    if (DOG.hit || !e || e.dead) return;
    DOG.hit = true;
    DOG.mul = petStrike(e, 1, { kn: .6, ang: Math.atan2(DOG.lv.x, DOG.lv.z) });
    puff(e.x, 1.2, e.z, 0xffe060, 4, 6);
    DOG.mu = .25;
  };

  if (DOG.s === 'run') {
    DOG.rt += dt;
    if (DOG.rt > 3.5) { DOG.s = 'none'; DOG.at = null; DOG.ac = .4; }
    else if (Math.hypot(e.x - pos.x, e.z - pos.z) <= 2.3) { DOG.s = 'wind'; DOG.tm = .3; DOG.ap = 'wind'; }
  } else if (DOG.s === 'wind') {
    turnTo(g, Math.atan2(e.x - pos.x, e.z - pos.z), 18, dt);
    DOG.tm -= dt;
    if (DOG.tm <= 0) {
      DOG.s = 'lunge';
      DOG.ap = 'lunge';
      DOG.tm = .28;
      DOG.hit = false;
      const lx = e.x - pos.x, lz = e.z - pos.z, l = Math.hypot(lx, lz) || 1;
      DOG.lv = { x: lx / l, z: lz / l };
    }
  } else if (DOG.s === 'lunge') {
    DOG.v = 0;
    pos.x += DOG.lv.x * 8 * dt;
    pos.z += DOG.lv.z * 8 * dt;
    DOG.tm -= dt;
    ju = Math.sin(Math.PI * Math.min(1, 1 - DOG.tm / .28)) * .55;
    if (e && !e.dead && Math.hypot(e.x - pos.x, e.z - pos.z) <= 2) bite();
    if (DOG.tm <= 0) {
      if (e && Math.hypot(e.x - pos.x, e.z - pos.z) <= 3) bite();
      DOG.s = 'rec';
      DOG.tm = .4;
      DOG.ac = (DOG.mul ? .25 : 1) * PCD();
      DOG.mul = false;
    }
  } else if (DOG.s === 'rec') {
    const f = Math.max(0, DOG.tm / .4);
    pos.x -= DOG.lv.x * 2.5 * f * dt;
    pos.z -= DOG.lv.z * 2.5 * f * dt;
    DOG.tm -= dt;
    if (DOG.tm <= 0) { DOG.s = 'none'; DOG.at = null; }
  }

  // colisão com árvores e pedras
  props.forEach(p => {
    const ex = pos.x - p.position.x, ez = pos.z - p.position.z, dd = Math.hypot(ex, ez) || .01, r = p.r + .45;
    if (dd < r) {
      pos.x = p.position.x + ex / dd * r;
      pos.z = p.position.z + ez / dd * r;
    }
  });

  // ----- para onde olha -----
  if (cb && DOG.s === 'none') {
    DOG.gt -= dt;
    if (DOG.gt <= 0) { DOG.gt = .4; DOG.ge = pick(); }
  }
  if (DOG.v < .3 && DOG.s !== 'wind' && DOG.s !== 'lunge') {
    if (wait && near) turnTo(g, P.g.rotation.y, 4, dt);
    else if (cb && DOG.ge && !DOG.ge.dead && DOG.s === 'none') turnTo(g, Math.atan2(DOG.ge.x - pos.x, DOG.ge.z - pos.z), 6, dt);
    else if (dp > .5 && DOG.s === 'none') turnTo(g, Math.atan2(dxp, dzp), 6, dt);
  }

  animateDog(dt, t, g, pos, { yaw0, wait, near, ju });
}

/** Trote/galope, sentar, pose de ataque, cabeça, rabo e orelhas */
function animateDog(dt, t, g, pos, c) {
  // inclinação lateral nas curvas
  let dy = g.rotation.y - c.yaw0;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy)) / Math.max(dt, .001);
  DOG.roll += (-Math.max(-.22, Math.min(.22, dy * .035)) * Math.min(1, DOG.v / 3) - DOG.roll) * Math.min(1, dt * 8);

  // sentar
  const sitT = c.wait && c.near && DOG.v < .5 ? 1 : 0;
  DOG.sit = Math.max(0, Math.min(1, DOG.sit + (sitT ? dt * 2.5 : -dt * 4)));
  const s = DOG.sit, sm = s * s * (3 - 2 * s);
  const amp = Math.min(1, DOG.v / 4) * (1 - sm);
  const gp = Math.max(0, Math.min(1, (DOG.v - 4.5) / 2.5)); // 0 = trote, 1 = galope
  DOG.ph += dt * (DOG.v * 2.2 + (DOG.v > 0 ? 2 : 0));
  const ph = DOG.ph;

  // pose de ataque (ow = quanto estamos na pose)
  DOG.ow += (((DOG.s === 'wind' || DOG.s === 'lunge') ? 1 : 0) - DOG.ow) * Math.min(1, dt * (DOG.s === 'lunge' ? 25 : 12));
  const ow = DOG.ow;
  const OV = DOG.ap === 'lunge'
    ? { bx: -.3, fl: -1, hl: .9, hd: .55, kn: .1 }
    : { bx: .25, fl: .4, hl: -.15, hd: .2, kn: .2 };

  g.legs.forEach((l, i) => {
    const fr = i < 2, q = ph + DTO[i] * (1 - gp) + DGO[i] * gp;
    let r = Math.sin(q) * (.75 + .2 * gp) * amp * (1 - sm) + (fr ? .55 : -.95) * sm;
    r = r * (1 - ow) + (fr ? OV.fl : OV.hl) * ow;
    l.rotation.x = r;
    const kn = (.05 + Math.max(0, Math.cos(q)) * .6 * amp) * (1 - sm) + (fr ? .05 : .3) * sm;
    l.knee.rotation.x = kn * (1 - ow) + OV.kn * ow;
  });

  DOG.jy += (c.ju - DOG.jy) * Math.min(1, dt * 20);
  g.rotation.x = -.55 * sm + OV.bx * ow + DOG.v * .008 + Math.sin(ph * 2) * .05 * gp;
  g.rotation.z = DOG.roll;
  pos.y = Math.abs(Math.sin(ph)) * .04 * amp - .105 * sm - .03 * ow + DOG.jy + (DOG.v === 0 && !sm ? Math.sin(t * 2) * .008 : 0);

  DOG.mu = Math.max(0, DOG.mu - dt);
  g.head.rotation.x = .5 * sm + OV.hd * ow + Math.sin(t * 1.3) * .06 + Math.sin(ph * 2) * .05 * amp + (DOG.mu > 0 ? .5 * DOG.mu / .25 : 0);
  g.head.rotation.y = Math.sin(t * .7) * (.3 + .25 * sm) * (1 - ow);
  g.tail.rotation.x = .8 - .9 * sm + .5 * ow;
  g.tail.rotation.y = Math.sin(t * (7 + DOG.v)) * .6 * (1 - ow * .8);
  g.earL.rotation.z = -.35 - Math.max(0, Math.sin(t * 2.1)) * .15 - DOG.v * .04 - ow * .35;
  g.earR.rotation.z = .35 + Math.max(0, Math.sin(t * 2.1 + 1)) * .15 + DOG.v * .04 + ow * .35;

  // língua para fora quando corre/ofega
  const tg = g.head.children[6], pn = Math.max(sm * .5, Math.min(1, DOG.v / 6)) * (1 - ow);
  tg.scale.z = 1 + pn * .8 + Math.sin(t * 16) * .2 * pn;
  tg.rotation.x = pn * .5;
}
