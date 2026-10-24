/* Companheiros voadores (papagaio e corvo): pousam no ombro, coletam loot e atacam em rasante.
   Estados de PAR.s: perch (no ombro) · orbit · return · goto/peck/carry (coleta) · attack (circle → wind → dash → recover) */
import { groundY } from '../world/terrain.js';
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { loot, enemies } from '../core/registry.js';
import { P } from '../entities/player.js';
import { applyLoot } from '../entities/loot.js';
import { puff, whirl } from '../systems/effects.js';
import { mkParrot, mkRaven } from './models.js';
import { PV, PCD } from './stats.js';
import { petStrike } from './strike.js';
import { petFighting, wantLoot } from './common.js';

const FLY = 3.4; // velocidade base de voo

/** Estado do voador ativo. g/wl/wr/cm apontam para o modelo em uso (papagaio ou corvo). */
export const PAR = {
  g: null, wl: null, wr: null, cm: null,
  s: 'perch', idle: 0, wt: null, pt: 0, aw: null, at: null, ac: 0, ap: 'circle', tm: 0,
  hd: false, dd: new THREE.Vector3(), tg: null, carry: null, v: new THREE.Vector3(), ph: 0,
};

/** Modelos disponíveis */
export const FLY_MODELS = {};
{
  const parrot = mkParrot();
  scene.add(parrot);
  FLY_MODELS.parrot = parrot;

  const raven = mkRaven();
  raven.scale.setScalar(1.1);
  raven.visible = false;
  scene.add(raven);
  FLY_MODELS.raven = raven;
}

function bindModel(g) {
  PAR.g = g;
  PAR.wl = g.wl;
  PAR.wr = g.wr;
  PAR.cm = g.cm;
}
bindModel(FLY_MODELS.parrot);
PAR.g.position.set(0, 2, 8);

/** Troca para o voador `id` ('parrot' ou 'raven'): reinicia o estado e pousa no ombro */
export function activateFlyer(id) {
  bindModel(FLY_MODELS[id]);
  Object.assign(PAR, { s: 'perch', tg: null, wt: null, aw: null, at: null, carry: null, idle: 0 });
  PAR.v.set(0, 0, 0);
  P.g.updateMatrixWorld(true);
  PAR.g.position.copy(P.g.up.localToWorld(new THREE.Vector3(.4, 1.12, 0)));
  PAR.g.visible = true;
}

/** Larga o que estiver carregando (usado ao trocar de companheiro) */
export function dropCarried() {
  if (PAR.carry) {
    applyLoot(PAR.carry, state.pet.ic);
    PAR.carry = null;
    PAR.cm.visible = false;
  }
}

export function hideFlyers() {
  Object.values(FLY_MODELS).forEach(g => { g.visible = false; });
}

const LOOT_COLORS = [0, 0xcccccc, 0x4a90ff, 0xff9a20];

export function flyerUpd(dt, now) {
  const FL = FLY * (1 + PV('spd')), t = now / 1000, g = PAR.g, pos = g.position;
  P.g.updateMatrixWorld(true);
  const sh = P.g.up.localToWorld(new THREE.Vector3(.4, 1.12, 0)); // ombro do jogador
  let flying = true;

  /** Voa em direção a (x,y,z) com um leve balanço; retorna a distância restante */
  const mv = (x, y, z, sp) => {
    const dx = x - pos.x, dy = y - pos.y, dz = z - pos.z;
    const d = Math.hypot(dx, dy, dz) || .001, hx = Math.hypot(dx, dz) || 1, V = PAR.v;
    const want = Math.min(sp, d * 1.4 + .8);
    const wob = Math.min(1, d / 6) * Math.sin(t * 2.6) * 1.6;
    const k = Math.min(1, dt * 1.8);
    V.x += (dx / d * want - dz / hx * wob - V.x) * k;
    V.y += (dy / d * want + Math.sin(t * 5) * .4 - V.y) * k;
    V.z += (dz / d * want + dx / hx * wob - V.z) * k;
    pos.addScaledVector(V, dt);
    return d;
  };

  // ----- entrar / sair do combate -----
  const cb = petFighting();
  if (cb) {
    if (['perch', 'orbit', 'return', 'goto', 'peck'].includes(PAR.s)) {
      PAR.aw = (PAR.aw === null ? .5 : PAR.aw) - dt;
      if (PAR.aw <= 0) {
        PAR.aw = null;
        if (PAR.s === 'perch') PAR.v.set(0, 2, 0);
        PAR.s = 'attack';
        PAR.at = null;
        PAR.ac = .3;
        PAR.ap = 'circle';
        PAR.tm = 0;
      }
    }
  } else {
    PAR.aw = null;
    if (PAR.s === 'attack') { PAR.s = 'orbit'; PAR.idle = 0; PAR.at = null; }
  }

  // ----- decide ir buscar loot -----
  if (['perch', 'orbit', 'return'].includes(PAR.s) && !P.dead && !cb) {
    const l = wantLoot(pos);
    if (l) {
      if (PAR.wt === null) PAR.wt = (.9 + Math.random() * .9) / (1 + PV('loot'));
      PAR.wt -= dt;
      if (PAR.wt <= 0) {
        PAR.wt = null;
        if (PAR.s === 'perch') PAR.v.set(0, 2, 0);
        PAR.s = 'goto';
        PAR.tg = l;
      }
    } else PAR.wt = null;
  }

  // ----- máquina de estados -----
  if (PAR.s === 'goto') {
    if (!loot.includes(PAR.tg)) {
      PAR.tg = wantLoot(pos);
      if (!PAR.tg) { PAR.s = 'orbit'; PAR.idle = 0; }
    }
    if (PAR.tg) {
      const p = PAR.tg.m.position, dh = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (mv(p.x, .8 + Math.min(3, dh * .3), p.z, FL) < .7) {
        PAR.s = 'peck';
        PAR.pt = .45 / (1 + PV('loot'));
      }
    }
  } else if (PAR.s === 'peck') {
    const l = PAR.tg;
    if (!l || !loot.includes(l)) { PAR.s = 'orbit'; PAR.idle = 0; PAR.tg = null; }
    else {
      const p = l.m.position;
      mv(p.x, .55, p.z, 1.6);
      PAR.pt -= dt;
      if (PAR.pt <= 0) {
        loot.splice(loot.indexOf(l), 1);
        scene.remove(l.m);
        PAR.carry = l;
        PAR.cm.material.color.set(l.ty === 'gold' ? 0xf0c030 : l.ty === 'pot' ? 0xe03030 : LOOT_COLORS[l.q]);
        PAR.cm.visible = true;
        PAR.s = 'carry';
      }
    }
  } else if (PAR.s === 'attack') {
    updateAttack(dt, t, pos, FL, mv);
  } else if (PAR.s === 'carry') {
    if (mv(P.x, 2.4, P.z, FL) < 1.2) {
      applyLoot(PAR.carry, state.pet.ic);
      puff(P.x, 2.2, P.z, 0xffe060, 4, 8);
      PAR.carry = null;
      PAR.cm.visible = false;
      PAR.s = 'orbit';
      PAR.idle = 0;
    }
  } else if (PAR.s === 'orbit') {
    const a = t * 1.2;
    const tx = P.x + Math.cos(a) * 2.6, ty = 3 + Math.sin(t * 1.7) * .4, tz = P.z + Math.sin(a) * 2.6;
    const k = 1 - Math.exp(-dt * 2), ox = pos.x, oy = pos.y, oz = pos.z, id = 1 / Math.max(dt, .001);
    pos.x += (tx - pos.x) * k;
    pos.y += (ty - pos.y) * k;
    pos.z += (tz - pos.z) * k;
    PAR.v.set((pos.x - ox) * id, (pos.y - oy) * id, (pos.z - oz) * id);
    PAR.idle += dt;
    if (PAR.idle > 5) PAR.s = 'return';
  } else if (PAR.s === 'return') {
    if (mv(sh.x, sh.y, sh.z, FL) < .35) PAR.s = 'perch';
  } else {
    // perch: parado no ombro
    flying = false;
    PAR.v.set(0, 0, 0);
    pos.copy(sh);
    g.rotation.y = P.g.rotation.y;
  }

  animateBird(dt, t, g, pos, flying);
}

/** Ataque em rasante: circula, recua, mergulha e se recupera */
function updateAttack(dt, t, pos, FL, mv) {
  if (!PAR.at || PAR.at.dead || Math.hypot(PAR.at.x - P.x, PAR.at.z - P.z) > 22) {
    let b = null, bd = 1e9;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d < bd && d < 22) { bd = d; b = e; }
    });
    PAR.at = b;
  }

  const e = PAR.at;
  if (!e) { PAR.s = 'orbit'; PAR.idle = 0; return; }

  PAR.ac -= dt;
  PAR.tm += dt;
  const aimAtTarget = () => {
    const dx = e.x - pos.x, dy = 1.5 - pos.y, dz = e.z - pos.z, dl = Math.hypot(dx, dy, dz) || 1;
    PAR.dd.set(dx / dl, dy / dl, dz / dl);
  };

  if (PAR.ap === 'circle') {
    const a = t * 2.6;
    mv(e.x + Math.cos(a) * 2.2, 3, e.z + Math.sin(a) * 2.2, FL * 1.2);
    if (PAR.ac <= 0) { PAR.ap = 'wind'; PAR.tm = 0; }
  } else if (PAR.ap === 'wind') {
    const dx = pos.x - e.x, dz = pos.z - e.z, dl = Math.hypot(dx, dz) || 1;
    mv(e.x + dx / dl * 4.5, 3.8, e.z + dz / dl * 4.5, FL * .8);
    if (PAR.tm > .45) { PAR.ap = 'dash'; PAR.tm = 0; PAR.hd = false; aimAtTarget(); }
  } else if (PAR.ap === 'dash') {
    if (PAR.tm < .3) aimAtTarget();
    const V = PAR.v, D = PAR.dd, k = Math.min(1, dt * 6), DS = 7.5 * (1 + PV('spd'));
    V.x += (D.x * DS - V.x) * k;
    V.y += (D.y * DS - V.y) * k;
    V.z += (D.z * DS - V.z) * k;
    pos.addScaledVector(V, dt);
    if (pos.y < groundY(pos.x, pos.z) + .8) { pos.y = groundY(pos.x, pos.z) + .8; V.y = Math.max(0, V.y); }
    if (!PAR.hd && Math.hypot(e.x - pos.x, e.z - pos.z) < 1.3 && pos.y < 2.6) {
      PAR.hd = true;
      if (petStrike(e, 1, { ang: Math.atan2(PAR.dd.x, PAR.dd.z) })) PAR.mu = 1;
      puff(e.x, 1.8, e.z, 0xffe060, 4, 6);
      if (state.pet.id === 'parrot') whirl(e.x, .2, e.z);   // ciclone de vento e areia do papagaio
    }
    if (PAR.tm > .7 || (PAR.hd && PAR.tm > .3)) { PAR.ap = 'recover'; PAR.tm = 0; }
  } else {
    // recover
    PAR.v.y += (4 - PAR.v.y) * Math.min(1, dt * 6);
    mv(pos.x + PAR.dd.x * 3, 3.6, pos.z + PAR.dd.z * 3, FL * 1.1);
    if (PAR.tm > .6) {
      PAR.ap = 'circle';
      PAR.ac = PAR.mu ? .15 : .9 * PCD();
      PAR.mu = 0;
    }
  }
}

/** Inclinação, direção, bater de asas e cabeça */
function animateBird(dt, t, g, pos, flying) {
  if (flying && pos.y < groundY(pos.x, pos.z) + .6) { pos.y = groundY(pos.x, pos.z) + .6; if (PAR.v.y < 0) PAR.v.y = 0; }

  let roll = 0, pitch = 0;
  const V = PAR.v, hs = Math.hypot(V.x, V.z), spd = Math.hypot(V.x, V.y, V.z);
  if (flying && hs > .3) {
    let da = Math.atan2(V.x, V.z) - g.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    g.rotation.y += da * Math.min(1, dt * (PAR.s === 'attack' && PAR.ap !== 'circle' ? 10 : 4));
    roll = Math.max(-.6, Math.min(.6, -da * .7));
    pitch = Math.max(-.5, Math.min(.5, -V.y / Math.max(spd, 1) * .6));
  }

  const fr = flying ? 12 + spd * 1.6 : 0, glide = flying && V.y < -.8 && spd > 3.5;
  PAR.ph += dt * fr;
  const f = glide ? .15 : Math.sin(PAR.ph) * (.5 + Math.min(.5, spd * .08));

  if (g.rich) richParrot(dt, t, g, flying, glide, spd);
  else {
    const wt = flying ? -f : 1.25; // asas fechadas quando pousado
    PAR.wa = PAR.wa === undefined ? wt : PAR.wa;
    PAR.wa += (wt - PAR.wa) * Math.min(1, dt * (flying ? 30 : 10));
    PAR.wl.rotation.z = PAR.wa;
    PAR.wr.rotation.z = -PAR.wa;
  }

  const rx = flying ? pitch + .1 : Math.sin(t * 3) * .05, rz = flying ? roll : 0;
  PAR.rx = (PAR.rx || 0) + (rx - (PAR.rx || 0)) * Math.min(1, dt * 8);
  PAR.rz = (PAR.rz || 0) + (rz - (PAR.rz || 0)) * Math.min(1, dt * 6);
  g.rotation.x = PAR.rx;
  g.rotation.z = PAR.rz;

  // cabeça do corvo (o papagaio não tem)
  if (g.head) {
    const lk = Math.max(0, Math.sin(t * .8));
    g.head.rotation.y = flying ? g.head.rotation.y * .9 : Math.sin(t * .8) * lk * .9;
    g.head.rotation.x = flying ? 0 : Math.sin(t * 5) * .08 * lk;
  }

  if (flying && !glide) pos.y += Math.sin(PAR.ph) * .008;
}

/** Poses do papagaio articulado (da prévia): asa em duas partes que bate com atraso, pernas recolhidas no voo,
    rasante com asas coladas ao corpo, preparo (cabeça baixa, pernas à frente), bicar o loot e aparar o pouso. */
function richParrot(dt, t, g, flying, glide, spd) {
  const lp = (a, b, k) => a + (b - a) * k;
  let T;
  const att = PAR.s === 'attack' ? PAR.ap : null;
  if (!flying) {
    // pousado no ombro: asas dobradas junto ao corpo, olha em volta, bate as asas de vez em quando
    const c = t % 5, fl = c > 3.6 && c < 4.4;
    T = { fold: fl ? .85 : 1.3, sh: fl ? .5 + Math.sin(t * 34) * .1 : .45, tip: fl ? .3 : .2, legL: 0, legR: 0, tail: fl ? .2 : 0, tailY: Math.sin(t * 1.2) * .1,
      hp: Math.sin(t * 1.3) * .15, hy: Math.sin(t * .8) * .5, hr: Math.sin(t * .7) * .12 };
  } else if (att === 'dash') {
    // mergulho: asas coladas ao corpo, pernas esticadas para trás, bico para o alvo
    T = { fold: 1.25, sh: .15, tip: 0, legL: -.9, legR: -.9, tail: .1, tailY: 0, hp: .2, hy: 0, hr: 0 };
  } else if (att === 'wind') {
    // preparo: bate devagar, cabeça baixa e pernas à frente
    const w = PAR.ph * .55;
    T = { fold: .12, sh: Math.sin(w) * .45, tip: Math.sin(w - .8) * .55, legL: .2, legR: .2, tail: -.1, tailY: 0, hp: .45, hy: 0, hr: 0 };
  } else if (att === 'recover') {
    // aparar: asas abertas e abaixadas, depois volta a bater
    const k = Math.min(1, PAR.tm / .3);
    T = { fold: lp(.1, .12, k), sh: lp(-.6, Math.sin(PAR.ph) * .6, k), tip: lp(-.4, Math.sin(PAR.ph - 1) * .7, k), legL: lp(-.2, 1.25, k), legR: lp(-.2, 1.25, k), tail: .25, tailY: 0, hp: -.1, hy: 0, hr: 0 };
  } else if (PAR.s === 'peck') {
    // bica o loot: cabeça mergulha, pernas à frente, asas semiabertas
    T = { fold: .9, sh: .5 - Math.abs(Math.sin(t * 12)) * .4, tip: .2, legL: -.35, legR: -.35, tail: .2, tailY: 0, hp: .5 + Math.abs(Math.sin(t * 12)) * .5, hy: 0, hr: 0 };
  } else if (glide) {
    T = { fold: .12, sh: -.1, tip: -.05, legL: 1.25, legR: 1.25, tail: -.1, tailY: 0, hp: -.05, hy: 0, hr: 0 };
  } else {
    const amp = .5 + Math.min(.5, spd * .08) * .5 + .25, w = PAR.ph;
    T = { fold: .12, sh: Math.sin(w) * amp, tip: Math.sin(w - 1) * amp * 1.2, legL: 1.25, legR: 1.25, tail: -.1, tailY: Math.sin(t * 1.5) * .06, hp: -.05, hy: 0, hr: 0 };
  }
  const q = PAR.pose || (PAR.pose = Object.assign({}, T)), k = Math.min(1, dt * (flying && !att ? 30 : 14));
  for (const n in T) q[n] += (T[n] - q[n]) * k;
  g.pw.forEach(w => { w.sh.rotation.set(0, w.s * q.fold, -w.s * q.sh); w.tip.rotation.set(0, w.s * q.fold * .5, -w.s * q.tip); });
  g.pl[0].rotation.x = q.legL; g.pl[1].rotation.x = q.legR;
  g.pt.rotation.set(q.tail, q.tailY, 0);
  g.ph.rotation.set(q.hp, q.hy, q.hr);
}
