/* Combate do jogador: golpes, balas, giro, bomba, poção e o cálculo de dano (hit). */
import { markMedusaKilled } from '../core/isle.js';
import { xpMult, dealtMult } from '../data/scaling.js';
import { scene } from '../core/engine.js';
import { state, aim } from '../core/state.js';
import { enemies, particles, bombs, shots } from '../core/registry.js';
import { M } from '../core/utils.js';
import { WEAPONS } from '../data/weapons.js';
import { P, levelUp } from '../entities/player.js';
import { aimOffset } from '../entities/player-weapon.js';
import { dropLoot, dropAmmo } from '../entities/loot.js';
import { emit } from '../core/events.js';
import { spendAmmo } from './inventory.js';
import { PV, petXp } from '../pets/stats.js';
import { puff } from './effects.js';
import { spinFx, bombFx, bombTint, potionFx, swingColor } from './skillfx.js';
import { log, dmgNum } from '../ui/notify.js';
import { medusaFloor } from '../entities/medusa.js';
import { HEAD, headReady, useHead, headOnKill } from './medusa-head.js';

/* ---------- Dano ---------- */

/**
 * Aplica `d` de dano ao inimigo `e`.
 * Opções: cr (crítico forçado) · kn (empurrão) · ang (direção do empurrão)
 *         fin (golpe final do combo) · pet (veio do companheiro) · dot (dano contínuo)
 */
export function hit(e, d, o) {
  o = o || {};
  if (e.dead) return;
  if (e.inv) { if (!o.dot) puff(e.x, 2, e.z, 0x9a9890, 2, 3); return; }   // invulnerável (Medusa se transformando)
  e.ag = true;
  if (e.mk > 0) d *= 1 + e.mkv;
  if (e.stone > 0) d *= 1.5;   // estátua (cabeça da Medusa): leva +50%
  if (o.pet && e.hp < e.max * .35) d *= 1 + PV('exec');
  d *= dealtMult(e.lv - P.lv);                      // inimigo muito acima do seu nível: seus golpes quase não fazem cócegas
  if (P.skh) d = P.skh.pre(e, d, o);                 // habilidades de classe: bônus de dano, crítico garantido (skills.js)

  const cr = o.cr !== undefined ? o.cr : Math.random() < (o.pet ? .15 : P.crit + (o.cb || 0));
  d = Math.round(d * (.85 + Math.random() * .3) * (cr ? 2 : 1));
  e.hp -= d;
  if (P.skh) P.skh.post(e, o);

  if (!o.dot) {
    dmgNum(e, d, cr);
    puff(e.x, 1.3, e.z, 0xc02020, 3, 4);
    e.fl = .14;
    const k = o.kn || 0;
    if (k) {
      const a = o.ang !== undefined ? o.ang : Math.atan2(e.x - P.x, e.z - P.z);
      const m = e.t.boss ? .3 : 1;
      e.kx += Math.sin(a) * k * 6 * m;
      e.kz += Math.cos(a) * k * 6 * m;
      if (!e.t.boss && !e.sn && (e.st !== 'wind' || o.fin)) {
        e.st = 'stag';
        e.tm = .18 + k * .08;
      }
    }
    if (cr || o.fin) {
      state.HS = Math.max(state.HS, o.fin ? .07 : .05);
      state.SHK = Math.max(state.SHK, .2);
    }
  }

  if (e.MD) medusaFloor(e);   // na fase humana a Medusa não morre: transforma-se aos 50%
  if (e.hp <= 0) onKill(e);
}

/** Inimigo morreu: XP, XP do pet, loot e possível subida de nível */
function onKill(e) {
  e.dead = .01;
  // XP depende da diferença de nível: inimigos muito fracos quase não dão XP, mais fortes dão bônus
  const xp = Math.max(1, Math.round(e.xpv * xpMult(e.lv - P.lv)));
  P.xp += xp;
  if (e.pa) petXp(e.pa, xp * .6);
  dropLoot(e);
  headOnKill();   // recarrega a cabeça da Medusa
  levelUp();
  state.lastKill = e; emit('enemy:killed');
  if (e.MD) { log('🗿 A Medusa foi derrotada!'); markMedusaKilled(); }
  else if (e.t.boss && e.t.msg) log(e.dun ? 'Chefe derrotado!' : e.t.msg);
  else if (e.DR && e.t.boss) log('🐉 O Dragão Ancestral caiu! Ele voltará em 45s.');
  else if (e.t.boss) log(e.dun ? 'Chefe derrotado!' : 'O Capitão Maldito caiu! Ele voltará em 45s.');
  else if (e.elite) log('Elite derrotado! +' + xp + ' XP');
}

/* ---------- Habilidades ---------- */

/** Giro: acerta todos em volta (tecla Q) */
export function spin() {
  if (headReady()) { useHead(); return; }   // com a cabeça da Medusa e cargas, o Q petrifica em vez de girar
  if (P.cds[0] > 0 || P.dead) return;
  P.cds[0] = 3 * (P.cls.cd || 1);
  P.sw = 1;
  puff(P.x, 1, P.z, P.cls.fx[0], 8, 14);
  spinFx(P);
  enemies.forEach(e => {
    const d = Math.hypot(e.x - P.x, e.z - P.z);
    if (d < 4) hit(e, P.dmg * 2 * P.cls.area, { kn: 1.2 });
  });
}

/** Lança uma bomba até o ponto apontado (tecla W) */
export function bomb() {
  if (P.cds[1] > 0 || P.dead || P.bmb <= 0) return;
  P.bmb--;
  P.cds[1] = 5 * (P.cls.cd || 1);
  const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 6, 5), M(0x111111));
  bombTint(m, P);
  m.position.set(P.x, 1.4, P.z);
  scene.add(m);
  const dx = aim.x - P.x, dz = aim.z - P.z;
  const d = Math.min(12, Math.hypot(dx, dz)) || 1, l = Math.hypot(dx, dz) || 1;
  bombs.push({ m, vx: dx / l * d * .9, vz: dz / l * d * .9, vy: 7, t: 1.1 });
}

/** Bebe uma poção de vida (tecla E) */
export function potion() {
  if (P.pot > 0 && !P.dead) {
    P.pot--; emit('potion:used');
    P.hp = Math.min(P.max, P.hp + 60);
    puff(P.x, 1, P.z, 0xff6060, 4, 8);
    potionFx(P);
  }
}

/** Voo e explosão das bombas */
export function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.vy -= 20 * dt;
    b.m.position.x += b.vx * dt;
    b.m.position.z += b.vz * dt;
    b.m.position.y += b.vy * dt;
    b.t -= dt;
    if (b.m.position.y < .25) {
      b.m.position.y = .25;
      b.vy *= -.3;
      b.vx *= .6;
      b.vz *= .6;
    }
    if (b.t <= 0) {
      const x = b.m.position.x, z = b.m.position.z;
      bombFx(x, z, P);
      puff(x, .5, z, 0xff9a2a, 8, 16);
      puff(x, .5, z, 0x333333, 5, 8);
      enemies.forEach(e => {
        const d = Math.hypot(e.x - x, e.z - z);
        if (d < 5) hit(e, P.dmg * 3 * P.cls.area * (1 - d / 7), { kn: 1.6, ang: Math.atan2(e.x - x, e.z - z) });
      });
      scene.remove(b.m);
      bombs.splice(i, 1);
    }
  }
}

/* ---------- Ataque básico ---------- */

/* Arcos, bestas, cajados e rods (weapons-class.js). Flecha/virote e orbe são malhas leves: geometrias e materiais ficam compartilhados. */
const BASH = { rng: 2.2, arc: 1.6, mul: .4, cd: .6, imp: .15 };   // cajado/rod sem mana: pancada fraca corpo a corpo
const noMana = W => !!W.magic && P.mp < W.mp;
/** A arma como está valendo agora (cajado sem mana vira uma pancada curta) */
export const curW = () => { const W = WEAPONS[P.wid]; return noMana(W) ? { ...W, ...BASH, gun: 0, magic: 0 } : W; };
/** Alcance de ataque agora (a pancada sem mana só alcança de perto) */
export const effRng = () => curW().rng;
const ammoKey = W => (W.xbow ? 'bolts' : 'arrows');
/** A arma de longa distância tem o que gastar? (flecha/virote ou mana) */
export const hasAmmo = W => (W.bow || W.xbow ? P[ammoKey(W)] > 0 : true);
let ammoWarn = 0;
function warnAmmo(W) { const n = performance.now(); if (n - ammoWarn > 2500) { ammoWarn = n; log(W.xbow ? 'Sem virotes! Compre mais no ferreiro.' : 'Sem flechas! Compre mais no ferreiro.'); } }
const AG = { sh: new THREE.BoxGeometry(.03, .8, .03), tip: new THREE.ConeGeometry(.05, .14, 4).rotateX(Math.PI).translate(0, -.47, 0), fe: new THREE.BoxGeometry(.12, .14, .01).translate(0, .36, 0), orb: new THREE.SphereGeometry(.15, 8, 6) };
const AM = { wood: new THREE.MeshBasicMaterial({ color: 0xcaa66a }), bolt: new THREE.MeshBasicMaterial({ color: 0x7a7a80 }), steel: new THREE.MeshBasicMaterial({ color: 0xdde3e8 }), fea: new THREE.MeshBasicMaterial({ color: 0xe8e0d0 }) };
const OM = {};   // materiais dos orbes, um por cor
function arrowMesh(bolt) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(AG.sh, bolt ? AM.bolt : AM.wood), new THREE.Mesh(AG.tip, AM.steel), new THREE.Mesh(AG.fe, AM.fea));
  if (bolt) g.scale.setScalar(.75);
  return g;
}
function orbMesh(c) {
  const o = OM[c] || (OM[c] = { core: new THREE.MeshBasicMaterial({ color: c }), glow: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .35, depthWrite: false }) });
  const m = new THREE.Mesh(AG.orb, o.core), h = new THREE.Mesh(AG.orb, o.glow);
  h.scale.setScalar(1.9); m.add(h);
  return m;
}

/** Inicia um ataque em direção (dx,dz): corpo a corpo agenda o impacto; arma de fogo dispara a bala */
export function attack(dx, dz) {
  const W0 = WEAPONS[P.wid], t = P.tgt, qk = ammoKey(W0);
  if ((W0.bow || W0.xbow) && !(P[qk] > 0)) { P.cd = P.cdMax = .6; warnAmmo(W0); return; }   // sem flechas/virotes: não atira
  const W = curW();
  P.cdMax = W.reload ? W.cd / (P.rls || 1) : W.cd; // armas com recarga animada respeitam a velocidade de recarga
  P.cd = P.cdMax;
  P.sw = 1;
  P.cb = P.cbt > 0 ? (P.cb + 1) % 3 : 0;
  P.cbt = 1.2;
  P.ay = Math.atan2(dx, dz);

  if (!W.gun) {
    P.imp = W.imp || .15; // o impacto acontece no meio da animação (0,15 s por padrão)
    P.vx += Math.sin(P.ay) * 2.2;
    P.vz += Math.cos(P.ay) * 2.2;
    return;
  }

  const d = Math.hypot(dx, dz);
  P.g.rotation.y = P.ay + aimOffset(d); // o corpo já está na posição de mira
  P.g.updateMatrixWorld(true);
  const mp = P.hand.localToWorld(new THREE.Vector3(0, -(W.ml || 1), 0)); // boca do cano
  const mx = mp.x, mz = mp.z, my = mp.y;
  let m, dmg = P.dmg * W.mul * P.cls.ranged, ex = {};
  if (W.bow || W.xbow) { P[qk]--; m = arrowMesh(!!W.xbow); ex = { or: 1, ar: qk }; }   // flecha/virote: haste fina (geometria e materiais compartilhados)
  else if (W.magic) {                                                                    // cajado/rod: orbe mágico, gasta mana
    P.mp -= W.mp; m = orbMesh(W.col); dmg = P.dmg * W.mul * (P.cls.magic || 1); ex = { mg: W.col };
    puff(mx, my, mz, W.col, 3, 6);
  } else if (W.thrown) m = W.build();   // arma de arremesso: voa o próprio modelo da arma
  else {
    puff(mx, my, mz, 0xffd070, 4, 6);
    puff(mx, my, mz, 0x999999, 2, 4);
    m = new THREE.Mesh(new THREE.SphereGeometry(.12, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffe070 }));
  }
  m.position.set(mx, my, mz);
  scene.add(m);
  const sp = W.thrown ? spendAmmo() : null;   // arremesso é finito: gasta 1 (pode quebrar ou cair no chão)
  shots.push({ m, t, rec: sp && sp.keep ? sp : null, d: dmg, sp: W.sp, sl: W.splash, fx: W.fx, th: W.thrown ? (W.tumble ? 1 : W.spin ? 2 : 3) : 0, ...ex });
}

/** Momento do golpe corpo a corpo: acerta quem está no arco à frente */
export function impact() {
  const W = curW(), a = P.ay, fin = P.cb === 2, arc = W.arc || 1.6, rg = W.rng + .7;
  enemies.forEach(e => {
    if (e.dead) return;
    const dx = e.x - P.x, dz = e.z - P.z;
    if (Math.hypot(dx, dz) > rg) return;
    let da = Math.atan2(dx, dz) - a;
    da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
    if (e !== P.tgt && da > arc / 2) return;
    hit(e, P.dmg * W.mul * P.cls.melee * (fin ? 1.4 : 1) * (e === P.tgt ? 1 : .7), { kn: (fin ? 1.6 : .8) * (W.kb || 1), fin, ang: a, cr: W.crit && Math.random() < .15 + W.crit ? true : undefined });
    if (!e.dead) {   // efeitos das armas: sangramento e atordoamento
      if (W.bleed && Math.random() < W.bleed) { e.bl = 3; e.bd = Math.max(1, P.dmg * .25); e.bt = .5; }
      if (W.stun && Math.random() < W.stun) e.sn = Math.max(e.sn || 0, e.t.boss ? .35 : 1);
    }
  });

  // arco visual do golpe
  const m = new THREE.Mesh(
    new THREE.RingGeometry(rg * .55, rg, 16, 1, Math.PI / 2 - arc / 2, arc).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: P.cls.fx ? swingColor(P, fin) : fin ? 0xffd070 : 0xddeeff, transparent: true, opacity: .5, side: THREE.DoubleSide })
  );
  m.position.set(P.x, .15, P.z);
  m.rotation.y = a + Math.PI;
  scene.add(m);
  particles.push({ m, v: new THREE.Vector3(), t: .4 });
}

/** Voo das balas em direção ao alvo */
export function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i], p = s.m.position;
    let done = s.t.dead > 0;
    if (!done) {
      const dx = s.t.x - p.x, dy = 1.3 - p.y, dz = s.t.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d < .8) {
        hit(s.t, s.d, { kn: .6 });
        if (s.ar && Math.random() < .35) P[s.ar]++;   // às vezes a flecha/virote se aproveita
        if (s.mg) puff(s.t.x, 1.2, s.t.z, s.mg, 4, 8);
        if (s.th) emit('shot:thrown-hit');   // (missão "Mão Firme")
        if (s.th && s.fx) puff(s.t.x, 1, s.t.z, 0xa77be0, 6, 10);
        if (s.fx && s.fx.stun && !s.t.dead) s.t.sn = Math.max(s.t.sn || 0, s.t.t.boss ? .4 : s.fx.stun);
        if (s.sl) {
          enemies.forEach(o => {
            if (o !== s.t && !o.dead && Math.hypot(o.x - s.t.x, o.z - s.t.z) < 2.2) hit(o, s.d * .6);
          });
        }
        done = true;
      } else {
        const k = Math.min(d, s.sp * dt) / d;
        p.x += dx * k;
        p.y += dy * k;
        p.z += dz * k;
        if (s.th === 1) { s.m.rotation.y = Math.atan2(dx, dz); s.m.rotation.x += 16 * dt; }          // machados: giram no ar
        else if (s.th === 2) s.m.rotation.y += 14 * dt;                                             // boleadeiras/rede/bomba: rodopiam
        else if (s.th || s.or) s.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dx / d, dy / d, dz / d)); // facas/lanças: ponta na direção do voo
      }
    }
    if (done) {
      if (s.rec) dropAmmo(p.x + (Math.random() - .5), p.z + (Math.random() - .5), s.rec.w, s.rec.q);
      scene.remove(s.m);
      shots.splice(i, 1);
    }
  }
}
