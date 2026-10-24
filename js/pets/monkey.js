/* Macaco: senta no ombro, desce para pegar loot e pula nos inimigos.
   Estados de MON.s: perch · hop (pulo) · goto/grab/carry (coleta) · return · attack */
import { groundY } from '../world/terrain.js';
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { enemies, loot } from '../core/registry.js';
import { turnTo } from '../core/utils.js';
import { P } from '../entities/player.js';
import { applyLoot } from '../entities/loot.js';
import { puff } from '../systems/effects.js';
import { mkMonkey } from './models.js';
import { PV, PCD } from './stats.js';
import { petStrike } from './strike.js';
import { petFighting, wantLoot } from './common.js';

const MS = .6; // escala do modelo
const MSP = { walk: 4.2, atk: 4.9, ring: 3.8 };
const LOOT_COLORS = [0, 0xcccccc, 0x4a90ff, 0xff9a20];

export const MON = {
  g: mkMonkey(), s: 'perch', tg: null, carry: null, wt: null, aw: null, at: null,
  ac: 0, tm: 0, hop: null, sp: 0, rv: 0, ph: 0, cel: 0, lt: 0, sx: 1, sy: 1,
  c: { ll: -1.15, lr: -1.15, kl: 1, kr: 1, al: 0, ar: 0, ln: 0, hd: 0 }, // pose atual (suavizada)
};
{
  const g = MON.g;
  g.scale.setScalar(MS);
  g.rotation.order = 'YXZ';
  g.visible = false;
  g.cm = new THREE.Mesh(new THREE.SphereGeometry(.16, 5, 4), new THREE.MeshBasicMaterial({ color: 0xf0c030 }));
  g.cm.position.set(0, .62, .58);
  g.cm.visible = false;
  g.add(g.cm);
  scene.add(g);
}

/** Posição do ombro do jogador */
const shp = () => {
  P.g.updateMatrixWorld(true);
  return P.g.up.localToWorld(new THREE.Vector3(.42, .55, 0));
};

/** Inicia um pulo até `tf()` (função que devolve {x,y,z}); `next` = estado ao pousar; `done` = callback */
function monHop(tf, dur, h, next, done, wind) {
  const p = MON.g.position;
  MON.hop = {
    x0: p.x, y0: p.y, z0: p.z, tf, dur, h,
    t: -(wind === undefined ? .14 : wind), // tempo negativo = agachando antes de pular
    next, done, fp: MON.s === 'perch',
  };
  MON.s = 'hop';
}

/** Solta o macaco: sobe no ombro de novo (usado ao trocar de companheiro) */
export function resetMonkey() {
  Object.assign(MON, { s: 'perch', tg: null, carry: null, wt: null, aw: null, at: null, hop: null, ac: 0 });
  MON.g.visible = true;
}

export function dropMonkeyCarried() {
  if (MON.carry) {
    applyLoot(MON.carry, state.pet.ic);
    MON.carry = null;
    MON.g.cm.visible = false;
  }
}

export function monkeyUpd(dt, now) {
  const g = MON.g, pos = g.position, t = now / 1000;
  P.g.updateMatrixWorld(true);
  const cb = petFighting();
  MON.sp = 0;
  MON.lt = Math.max(0, MON.lt - dt);
  MON.cel = Math.max(0, MON.cel - dt);

  /** Corre em direção a (x,z) até ficar a `stop` de distância; retorna a distância */
  const run = (x, z, sp, stop) => {
    sp *= 1 + PV('spd');
    const dx = x - pos.x, dz = z - pos.z, d = Math.hypot(dx, dz);
    MON.rv += (sp - MON.rv) * Math.min(1, dt * 4.5);
    if (d > stop) {
      const k = Math.min(MON.rv * dt, d - stop);
      pos.x += dx / d * k;
      pos.z += dz / d * k;
      turnTo(g, Math.atan2(dx, dz), 8, dt);
      MON.sp = Math.max(.01, MON.rv);
    }
    return d;
  };
  const cs = () => MSP.walk + Math.min(2.5, Math.max(0, Math.hypot(P.x - pos.x, P.z - pos.z) - 8) * .4);

  /** Desce do ombro (com um pulinho) e vai para o estado `next` */
  const leave = next => {
    if (MON.s !== 'perch') { MON.s = next; return; }
    const a = P.g.rotation.y, gx = P.x + Math.sin(a) * 1.2, gz = P.z + Math.cos(a) * 1.2;
    monHop(() => ({ x: gx, y: 0, z: gz }), .34, .5, next, null, .12);
  };
  const home = () => { MON.tg = null; MON.at = null; MON.s = 'return'; };

  // ----- entrar / sair do combate -----
  if (cb) {
    if (['perch', 'return', 'goto', 'grab'].includes(MON.s)) {
      MON.aw = (MON.aw === null ? .5 : MON.aw) - dt;
      if (MON.aw <= 0) { MON.aw = null; MON.at = null; MON.ac = .2; leave('attack'); }
    }
  } else {
    MON.aw = null;
    if (MON.s === 'attack') home();
  }

  // ----- decide ir buscar loot -----
  if (['perch', 'return'].includes(MON.s) && !P.dead && !cb) {
    const l = wantLoot(pos);
    if (l) {
      if (MON.wt === null) MON.wt = (.7 + Math.random() * .8) / (1 + PV('loot'));
      MON.wt -= dt;
      if (MON.wt <= 0) { MON.wt = null; MON.tg = l; leave('goto'); }
    } else MON.wt = null;
  }

  // ----- máquina de estados -----
  const S = MON.s;
  if (S === 'hop') {
    const h = MON.hop, e = h.tf();
    if (h.t < 0) {
      // agachando antes do pulo
      h.t = Math.min(0, h.t + dt);
      if (h.fp) { pos.copy(shp()); turnTo(g, P.g.rotation.y, 18, dt); }
      else {
        const fx = e.x - pos.x, fz = e.z - pos.z;
        if (Math.hypot(fx, fz) > .1) turnTo(g, Math.atan2(fx, fz), 16, dt);
      }
      h.x0 = pos.x; h.y0 = pos.y; h.z0 = pos.z;
    } else {
      // no ar (parábola)
      h.t += dt;
      const u = Math.min(1, h.t / h.dur), fx = e.x - pos.x, fz = e.z - pos.z;
      pos.x = h.x0 + (e.x - h.x0) * u;
      pos.z = h.z0 + (e.z - h.z0) * u;
      pos.y = h.y0 + (e.y - h.y0) * u + h.h * 4 * u * (1 - u);
      if (Math.hypot(fx, fz) > .1) turnTo(g, Math.atan2(fx, fz), 16, dt);
      if (u >= 1) {
        pos.set(e.x, e.y, e.z);
        MON.hop = null;
        MON.s = h.next;
        MON.lt = .14;
        if (h.done) h.done();
      }
    }
  } else if (S === 'perch') {
    pos.copy(shp());
    turnTo(g, P.g.rotation.y, 18, dt);
  } else if (S === 'goto') {
    if (!MON.tg || !loot.includes(MON.tg)) { MON.tg = wantLoot(pos); if (!MON.tg) home(); }
    if (MON.tg) {
      const p = MON.tg.m.position;
      if (run(p.x, p.z, MSP.walk, .5) < .8) { MON.s = 'grab'; MON.tm = .5 / (1 + PV('loot')); }
    }
  } else if (S === 'grab') {
    const l = MON.tg;
    if (!l || !loot.includes(l)) home();
    else {
      const p = l.m.position;
      turnTo(g, Math.atan2(p.x - pos.x, p.z - pos.z), 14, dt);
      MON.tm -= dt;
      if (MON.tm <= 0) {
        loot.splice(loot.indexOf(l), 1);
        scene.remove(l.m);
        MON.carry = l;
        g.cm.material.color.set(l.ty === 'gold' ? 0xf0c030 : l.ty === 'pot' ? 0xe03030 : LOOT_COLORS[l.q]);
        g.cm.visible = true;
        MON.tg = null;
        MON.s = 'carry';
      }
    }
  } else if (S === 'carry') {
    if (run(P.x, P.z, cs(), 1.6) <= 1.9) {
      monHop(shp, .55, .9, 'perch', () => {
        if (MON.carry) {
          applyLoot(MON.carry, state.pet.ic);
          puff(P.x, 2, P.z, 0xffe060, 4, 8);
          MON.carry = null;
          g.cm.visible = false;
          MON.cel = .8; // comemora
        }
      }, .12);
    }
  } else if (S === 'return') {
    if (run(P.x, P.z, cs(), 1.6) <= 1.9) monHop(shp, .55, .9, 'perch', null, .12);
  } else if (S === 'attack') {
    updateAttack(dt, g, pos, run, home);
  }

  animateMonkey(dt, t, g, pos);
}

/** Orbita o inimigo e pula nele para morder */
function updateAttack(dt, g, pos, run, home) {
  if (!MON.at || MON.at.dead || Math.hypot(MON.at.x - P.x, MON.at.z - P.z) > 22) {
    let b = null, bd = 1e9;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d < bd && d < 22) { bd = d; b = e; }
    });
    MON.at = b;
  }
  const e = MON.at;
  if (!e) { home(); return; }

  MON.ac -= dt;
  let dx = pos.x - e.x, dz = pos.z - e.z, d = Math.hypot(dx, dz);
  if (d < .1) { dx = P.x - e.x; dz = P.z - e.z; d = Math.hypot(dx, dz) || 1; }

  if (MON.ac > 0) {
    if (d < 3.4) run(e.x + dx / d * 3.6, e.z + dz / d * 3.6, MSP.ring, .2);
    else turnTo(g, Math.atan2(-dx, -dz), 12, dt);
  } else if (d <= 4) {
    monHop(() => ({ x: e.x, y: 1, z: e.z }), .36, .7, 'attack', () => {
      let mu = 0;
      if (!e.dead) {
        mu = petStrike(e, 1, { kn: .7 });
        puff(e.x, 1.6, e.z, 0xffe060, 4, 6);
      }
      MON.ac = (mu ? .35 : 1.6) * PCD();
    }, .16);
  } else run(e.x, e.z, MSP.atk, 3);
}

/** Pose do corpo conforme o estado: sentado, pulando, pegando, correndo ou parado */
function animateMonkey(dt, t, g, pos) {
  if (MON.sp === 0) MON.rv = 0;
  const hh = MON.s === 'hop' ? MON.hop : null;
  const hw = !!hh && hh.t <= 0;                  // agachado (antes do pulo)
  const hu = hh && !hw ? Math.min(1, hh.t / hh.dur) : 0; // progresso no ar
  const sit = MON.s === 'perch', gr = MON.s === 'grab', mv = MON.sp > 0;

  MON.ph += dt * (mv ? MON.sp * 1.3 : 0);
  const ph = MON.ph, w = Math.sin(ph), k = Math.min(1, dt * 14);
  if (!sit && !hh) pos.y += (groundY(pos.x, pos.z) + (mv ? Math.abs(w) * .1 : 0) - pos.y) * Math.min(1, dt * 14);

  const s = Math.sin(t * 1.8);
  let T;
  if (sit) {
    T = MON.cel > 0
      ? { ll: -1.15, lr: -1.15, kl: 1, kr: 1, al: -2.5 + Math.sin(t * 16) * .5, ar: -2.5 - Math.sin(t * 16) * .5, ln: 0, hd: -.15 }
      : { ll: -1.15, lr: -1.15, kl: 1, kr: 1, al: -.25 + s * .25, ar: -.25 - s * .25, ln: 0, hd: 0 };
  } else if (hh) {
    if (hw) T = { ll: -.5, lr: -.5, kl: 1.3, kr: 1.3, al: .5, ar: .5, ln: .35, hd: .2 };
    else if (hu > .78) T = { ll: -1.2, lr: -1.2, kl: .5, kr: .5, al: -2.4, ar: -2.4, ln: -.1, hd: -.1 };
    else T = { ll: .5, lr: .5, kl: .15, kr: .15, al: -2.6, ar: -2.6, ln: .2, hd: -.2 };
  } else if (gr) {
    T = { ll: -.6, lr: -.6, kl: 1.1, kr: 1.1, al: -.8 + Math.sin(t * 10) * .15, ar: -.8 - Math.sin(t * 10) * .15, ln: .5, hd: .2 };
  } else if (mv) {
    T = {
      ll: w * .9, lr: -w * .9,
      kl: Math.max(0, -Math.cos(ph)) * .9 + .1, kr: Math.max(0, Math.cos(ph)) * .9 + .1,
      al: MON.carry ? -1.2 : -w * .8, ar: MON.carry ? -1.2 : w * .8,
      ln: .3, hd: -.12 + Math.sin(ph * 2) * .08,
    };
  } else {
    T = { ll: 0, lr: 0, kl: .1, kr: .1, al: MON.carry ? -1.2 : -.2, ar: MON.carry ? -1.2 : -.2, ln: 0, hd: 0 };
  }

  const c = MON.c;
  for (const q in T) c[q] += (T[q] - c[q]) * k;
  g.legL.rotation.x = c.ll;
  g.legR.rotation.x = c.lr;
  g.legL.knee.rotation.x = c.kl;
  g.legR.knee.rotation.x = c.kr;
  g.armL.rotation.x = c.al;
  g.arm.rotation.x = c.ar;
  g.rotation.x = c.ln + (mv ? Math.sin(ph * 2) * .07 : 0);
  g.armL.fa.rotation.x = g.arm.fa.rotation.x = sit ? -.5 - Math.max(0, s) * .4 : -.35;
  g.head.rotation.x = c.hd;
  g.head.rotation.y = sit && !MON.cel ? Math.sin(t * .9) * .45 : 0;
  g.head.rotation.z = sit ? Math.sin(t * 1.4) * .08 : 0;

  // achatar/esticar ao pular e pousar
  let sx = 1, sy = 1;
  if (hw) { sx = 1.12; sy = .78; }
  else if (hh && hu < .78) { sx = .92; sy = 1.12; }
  else if (MON.lt > 0) { sx = 1.1; sy = .86; }
  else if (gr) { sx = 1.06; sy = .9; }
  MON.sx += (sx - MON.sx) * k;
  MON.sy += (sy - MON.sy) * k;
  g.scale.set(MS * MON.sx, MS * MON.sy, MS * MON.sx);

  const ta = mv ? .4 : .22;
  g.tail.forEach((p, j) => { p.rotation.y = Math.sin(t * (mv ? 6 : 2) + j * .7) * ta; });
}
