/* Habilidades de classe: 1 passiva + 3 ativas (teclas 1, 2, 3 e botões redondos), recargas, mana, estados nos inimigos
   (lentidão, queimadura, veneno, preso, provocado) e o visual de cada uma (skillvfx.js). Personagem sem classe (NEUTRA) não tem nada disto.
   Os ganchos no combate ficam em P.skh (hit/hurtP/dodge/levelUp chamam, sem importar este arquivo: nada de ciclo de módulos). */
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { P } from '../entities/player.js';
import { activeChar } from '../core/chars.js';
import { SKILLS, SKILL_LV, RANK, PTS, TSTAT, TALENTS, TUNE as U, TREES, STAFF_REQ, ROD_PTS, ROD_TREE } from '../data/skills.js';
import { unlockState, profState, activeCat } from './prof.js';
import { START } from '../data/classes.js';
import { WEAPONS } from '../data/weapons.js';
import { eq, bag, setWeapon } from './inventory.js';
import { inDungeon } from '../dungeon/dungeon-scene.js';
import { freePoint } from './steer.js';
import { houseAt } from '../world/floors.js';
import { hit } from './combat.js';
import { MOUNT } from './mount.js';
import { VEH } from './vehicle.js';
import { log, banner } from '../ui/notify.js';
import { groundY, walkable } from '../world/terrain.js';
import { $ } from '../core/utils.js';
import * as V from './skillvfx.js';

const { G } = V;
const S = {
  on: false, k: null, D: null, clock: 0,
  cds: [0, 0, 0], cdm: [1, 1, 1], rk: [0, 0, 0, 0], rod: { rk: [] }, tl: {}, tb: { hp: 0, mp: 0 }, dmx: 1, fx: [1, 1, 1], mig: 0, dun: false, keys: ['Digit1', 'Digit2', 'Digit3'], TT: { dmg: 0, crit: 0, dr: 0, hp: 0, mp: 0, spd: 0, cdr: 0, mpc: 0, mpr: 0 },
  hits: 0, hitT: -9, shield: 0, shT: 0, gt: 0, mur: 0, lev: 0, pose: 0,
  leap: null, tp: null, cast: null, balls: [], traps: [], rain: null, storm: null, dance: null, daggers: [],
  bub: null, shell: null, aura: null, orbs: null, ret: null, ghosted: null, dead: false, combat: false, ct: 0, hasteT: 0, fsT: 0,
};
export const SK = { S, useSkill, update: dt => updateSkills(dt), vfx: () => V.vfxCount(), migrate: () => migrateStart(), auto: () => autoSkill(), get on() { return S.on; } };

const dist = (e, x, z) => Math.hypot(e.x - (x === undefined ? P.x : x), e.z - (z === undefined ? P.z : z));
const by = () => groundY(P.x, P.z) + (P.fy || 0);              // chão sob o jogador (também no andar de cima)
const ey = e => groundY(e.x, e.z);
const rnd = (a, b) => a + Math.random() * (b - a);
const dm = (m, ty) => P.dmg * m * S.dmx * (P.cls[ty] || 1);
const dealt = (e, m, ty, o) => hit(e, dm(m, ty), Object.assign({ sk: 1 }, o));
const face = a => { P.g.rotation.y = a; P.ay = a; };
const alive = () => enemies.filter(e => !e.dead && !e.inv);
function pickTarget(range) {
  const t = P.tgt;
  if (t && !t.dead && dist(t) <= range) return t;
  let b = null, bd = range;
  for (const e of enemies) { if (e.dead || e.inv) continue; const d = dist(e); if (d < bd) { bd = d; b = e; } }
  if (b && !P.tgt) P.tgt = b;
  return b;
}
const stopMove = () => { P.vx = P.vz = 0; P.tx = P.x; P.tz = P.z; };
const lerp = (a, b, u) => a + (b - a) * u;

/* ====================================================== ganchos do combate ====================================================== */

/** Antes do dano: devolve o dano final; pode forçar crítico (o.cr) ou somar chance (o.cb) */
function pre(e, d, o) {
  if (o.pet || o.dot) return d;
  if (S.gt > 0) d *= 1 + U.guerreiro.grito.dmg;                                      // Grito de Guerra
  d *= 1 + S.TT.dmg; o.cb = (o.cb || 0) + S.TT.crit;             // talentos
  if (S.k === 'cacador' && dist(e) > U.cacador.aguia.dist) o.cb += U.cacador.aguia.crit + U.cacador.aguia.rank * S.rk[3]; // Olho de Águia
  if (S.k === 'ladino' && !e.fsd) {                              // Golpe Furtivo: o 1º golpe num inimigo que ainda não te atacou
    e.fsd = true;
    if (!e.atkd && o.cr === undefined) { o.cr = true; fsFx(e); }
  }
  return d;
}
/** Depois do dano: Pele de Ferro conta os golpes acertados */
function post(e, o) {
  if (S.k !== 'guerreiro' || o.pet || o.dot) return;
  if (S.clock - S.hitT < .12) return;                            // vários alvos do mesmo golpe contam uma vez
  S.hitT = S.clock;
  if (++S.hits >= U.guerreiro.pele.hits) {
    S.hits = 0; S.shield = P.max * (U.guerreiro.pele.pct + U.guerreiro.pele.rank * S.rk[3]); S.shT = U.guerreiro.pele.dur;
    const B = V.budget(); B.max = 10;
    V.sparks(B, P.x, by() + 1, P.z, [0xffd860, 0xfff0a0], 8, 3.5, .6, .09, 2, 4);
    V.ring(B, P.x, by() + .15, P.z, 0xffd860, .4, 1.8, .4, .7);
  }
}
/** Dano recebido: invulnerável, Muralha (30%), Grito (-20%) e o escudo da Pele de Ferro */
function hurt(d) {
  if (P.inv > 0) return 0;
  d *= 1 - S.TT.dr;
  if (S.mur > 0) d *= U.guerreiro.muralha.take;
  if (S.gt > 0) d *= 1 - U.guerreiro.grito.dr;
  if (S.shield > 0) { const a = Math.min(S.shield, d); S.shield -= a; d -= a; }
  return d;
}
function dodged() {
  if (S.k !== 'ladino') return;
  P.haste = 2; P.hasteK = 1.2 + .04 * S.rk[3]; S.hasteT = 0;
}
function lvl(lv) {
  const i = SKILL_LV.indexOf(lv);
  if (i > 0) {
    const n = S.D.act[i].n;
    log('Nova habilidade: ' + n + ' (tecla ' + (i + 1) + ')');
    setTimeout(() => banner('NOVA HABILIDADE'), 1700);
  }
}

/* ====================================================== uso ====================================================== */

let warnT = 0;
const warn = t => { const n = performance.now(); if (n - warnT > 900) { warnT = n; log(t); } };

export const hasSkills = () => S.on;
/** Classe com mais de uma árvore (Mago: ['staff','rod']); as demais: null (uma árvore, como sempre) */
export const treeList = () => (S.on && TREES[S.k]) || null;
/** Motivo legível do bloqueio da ativa i (null = liberada). Árvores múltiplas: nível geral E proficiência de Cajado (unlockState); demais classes: só o nível, como antes. */
export function skillLock(i) {
  if (i < 0 || i > 2) return null;
  if (!treeList()) return P.lv < SKILL_LV[i] ? 'Nv ' + SKILL_LV[i] : null;
  const r = unlockState(STAFF_REQ[i], 'staff');
  return r.ok ? null : [r.lv.ok ? '' : 'Nv geral ' + r.lv.need, r.prof.ok ? '' : 'Proficiência Cajado ' + r.prof.need].filter(Boolean).join(' · ');
}
/** O Rod está na mão? As habilidades do Cajado não podem ser usadas com ele (o uso depende da arma ativa; nada é desaprendido) */
export const rodBlocked = () => !!treeList() && activeCat() === 'rod';
/** Pontos livres da árvore do Rod: derivados da proficiência de Rod (não há nó aprendível ainda: nada é gasto) */
export const rodPoints = () => { const st = profState('rod'); return Math.max(0, ROD_PTS(st ? st.lv : 1) - sum(S.rod.rk)); };
export const rodTree = () => ROD_TREE;
export const classData = () => S.D;
export const classKey = () => S.k;
const costOf = i => Math.max(1, Math.ceil(S.D.act[i].mp * (1 - RANK.mp * S.rk[i] - S.TT.mpc)));
const cdOf = i => Math.max(.5, S.D.act[i].cd * (1 - RANK.cd * S.rk[i] - S.TT.cdr));
export function useSkill(i) {
  if (!S.on || P.dead || P.stone > 0 || P.roll > 0 || P.swap || P.sit > 0 || P.sitT || P.swimming || MOUNT.on || VEH.on || S.leap || S.tp || S.dance) return false;
  const def = S.D.act[i];
  if (!def) return false;
  const lock = skillLock(i);
  if (lock) { warn('Habilidade bloqueada: ' + lock); return false; }
  if (rodBlocked()) { warn('Troque para o Cajado'); return false; }   // com o Rod na mão: sem gastar mana nem recarga
  if (S.cds[i] > 0) return false;
  const cost = costOf(i);
  if (P.mp < cost) { warn('Mana insuficiente'); blinkMana(); return false; }
  S.dmx = S.fx[i] = 1 + RANK.dmg * S.rk[i];   // o rank da habilidade vale também para os efeitos que acontecem depois (S.fx)
  const ok = CAST[S.k][i](def);
  S.dmx = 1;
  if (ok === false) return false;
  P.mp -= cost;
  S.cds[i] = S.cdm[i] = cdOf(i);
  if (S.k === 'mago') for (let j = 0; j < 3; j++) if (j !== i) S.cds[j] = Math.max(0, S.cds[j] - U.mago.fluxo.cdr);   // Fluxo Arcano
  return true;
}

/* ====================================================== habilidades ====================================================== */

const CAST = {
  guerreiro: [
    /* Golpe Cataclísmico: agacha, salta em arco até o alvo e esmaga o chão */
    () => {
      const t = pickTarget(U.guerreiro.cata.range);
      if (!t) { warn('Sem alvo por perto'); return false; }
      const ang = Math.atan2(t.x - P.x, t.z - P.z), land = Math.max(0, dist(t) - 1.3);
      const lp = landing(P.x + Math.sin(ang) * land, P.z + Math.cos(ang) * land) || { x: P.x, z: P.z }, x1 = lp.x, z1 = lp.z;
      S.leap = { x0: P.x, z0: P.z, x1, z1, t: 0, crouch: .16, dur: .56, ang };
      face(ang); P.tgt = t; stopMove();
    },
    /* Grito de Guerra: onda vermelha, aura e provoca os inimigos próximos */
    () => {
      S.gt = U.guerreiro.grito.dur; S.pose = .55;
      const B = V.budget(), y = by();
      V.ring(B, P.x, y + .15, P.z, 0xff3a20, .5, 6, .6, .85);
      V.ring(B, P.x, y + .15, P.z, 0xffb090, .3, 6, .85, .5);
      V.disc(B, P.x, y + .1, P.z, 0xff2010, 1, 6, .5, .3);
      V.sparks(B, P.x, y + 1, P.z, [0xff4a30, 0xffd0a0], 12, 4, .7, .09, 3, 3);
      state.SHK = Math.max(state.SHK, .3);
      for (const e of enemies) if (!e.dead && dist(e) < U.guerreiro.grito.radius) { e.ag = true; e.tn = U.guerreiro.grito.dur; }
    },
    /* Muralha: casco de pedra translúcido; ao fim quebra e solta a onda de choque */
    () => {
      S.mur = U.guerreiro.muralha.dur; S.pose = .4;
      const B = V.budget(), y = by();
      V.ring(B, P.x, y + .15, P.z, 0xb0a890, .4, 2.6, .45, .7);
      V.sparks(B, P.x, y + .3, P.z, 0x8a8070, 8, 3, .6, .12, 2.5, 8);
      state.SHK = Math.max(state.SHK, .25);
    },
  ],
  cacador: [
    /* Tiro Perfurante: feixe que atravessa todos na linha */
    () => {
      const t = pickTarget(U.cacador.tiro.range), ang = t ? Math.atan2(t.x - P.x, t.z - P.z) : P.g.rotation.y;
      face(ang); S.pose = .35;
      const dx = Math.sin(ang), dz = Math.cos(ang), B = V.budget(), y = by() + 1.3;
      const x0 = P.x + dx * .8, z0 = P.z + dz * .8, R = U.cacador.tiro.len;
      for (const e of enemies) {
        if (e.dead || e.inv) continue;
        const rx = e.x - P.x, rz = e.z - P.z, al = rx * dx + rz * dz, pp = Math.abs(rx * dz - rz * dx);
        if (al > 0 && al < R && pp < U.cacador.tiro.w + (e.t.boss ? U.cacador.tiro.wBoss : 0)) {
          dealt(e, U.cacador.tiro.mult, 'ranged', { kn: U.cacador.tiro.kn, ang });
          V.ring(B, e.x, ey(e) + .2, e.z, 0xffffff, .3, 1.7, .4, .9);
          V.flash(B, e.x, ey(e) + 1.2, e.z, 0xe8ffb0, .2, .9, .25, .8);
        }
      }
      V.bolt(B, x0, y, z0, x0 + dx * R, y, z0 + dz * R, 0xffffff, .14, .28, 1);
      V.bolt(B, x0, y, z0, x0 + dx * R, y, z0 + dz * R, 0x9be85a, .45, .4, .4);
      V.sparks(B, x0, y, z0, [0xffe070, 0xffffff], 6, 4, .3, .07, 0, 0);
      for (let k = 1; k <= 5; k++) V.sparks(B, x0 + dx * k * 3.4, y, z0 + dz * k * 3.4, 0xc8ff80, 1, 1.2, .4, .06, .6, 0);   // rastro
      state.SHK = Math.max(state.SHK, .12);
    },
    /* Armadilha de Espinhos: dentes de metal no chão (máx. 2) */
    () => {
      const a = P.g.rotation.y, x = P.x + Math.sin(a) * 1.8, z = P.z + Math.cos(a) * 1.8;
      if (!walkable(x, z)) { warn('Sem espaço aqui'); return false; }
      S.pose = .3;
      if (S.traps.length >= U.cacador.trap.max) dropTrap(S.traps.shift());
      S.traps.push(makeTrap(x, z));
      const B = V.budget(); B.max = 8;
      V.sparks(B, x, groundY(x, z) + .1, z, 0xa8b0b8, 6, 2, .4, .08, 1.5, 6);
    },
    /* Chuva de Balas: marca a área (círculo verde girando) e dispara 8 tiros em 3 s */
    () => {
      const t = pickTarget(U.cacador.chuva.range);
      let x, z;
      if (t) { x = t.x; z = t.z; } else { const a = P.g.rotation.y; x = P.x + Math.sin(a) * 7; z = P.z + Math.cos(a) * 7; }
      S.pose = .5;
      const y = groundY(x, z);
      S.rain = { x, z, y, t: 0, n: 0, dur: U.cacador.chuva.dur,
        r1: V.solid(G.RING, 0x6bff5a, .85, x, y + .12, z, [5, 1, 5]), r2: V.solid(G.RING, 0xffe070, .6, x, y + .13, z, [3, 1, 3]),
        r3: V.solid(G.DISC, 0x40c030, .12, x, y + .1, z, [5, 1, 5]) };
    },
  ],
  mago: [
    /* Bola de Fogo: a esfera cresce na mão e sai voando */
    () => {
      const t = pickTarget(U.mago.fogo.range), ang = t ? Math.atan2(t.x - P.x, t.z - P.z) : P.g.rotation.y;
      face(ang); S.pose = .4;
      S.cast = { k: 'fire', t: 0, dur: .24, ang, orb: V.solid(G.ORB, 0xffb040, .95, P.x, by() + 1.5, P.z, .1) };
    },
    /* Nova de Gelo: onda de raio 5, placa de gelo e cristais */
    () => {
      S.pose = .4;
      const B = V.budget(), x = P.x, z = P.z, y = by();
      for (const e of enemies) {
        if (e.dead || e.inv || dist(e) > U.mago.gelo.r) continue;
        dealt(e, U.mago.gelo.mult, 'area', { kn: .9 });
        if (!e.dead) e.slow = U.mago.gelo.slow;
      }
      V.ring(B, x, y + .15, z, 0xa8ecff, .5, 5.4, .55, .9);
      V.ring(B, x, y + .17, z, 0xffffff, .3, 4.2, .4, .8);
      V.disc(B, x, y + .06, z, 0xbfeaff, 5, 5, 1.7, .5);
      V.disc(B, x, y + .07, z, 0xe8fbff, 2.4, 3.4, 1.4, .45);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.283 + rnd(0, .3), r = rnd(2.6, 4.8), h = rnd(.9, 1.7);
        V.add(B, G.CONE, i % 2 ? 0x9fe0ff : 0xe0f6ff, x + Math.sin(a) * r, y, z + Math.cos(a) * r, [.3, h, .3], { life: 1.5, o: .75, rot: [rnd(-.2, .2), 0, rnd(-.2, .2)] });
      }
      for (let i = 0; i < 4; i++) V.add(B, G.DISC, 0xdff6ff, x + rnd(-3.5, 3.5), y + .3, z + rnd(-3.5, 3.5), 1.4, { life: 1.3, o: .28, v: [0, .5, 0], grow: [1.2, 0, 1.2] });
      V.sparks(B, x, y + .5, z, [0xffffff, 0xa8ecff], 6, 5, .8, .08, 2, 4);
      state.SHK = Math.max(state.SHK, .2);
    },
    /* Tempestade Arcana: levita e chama raios por 6 s */
    () => {
      S.storm = { t: 0, n: 0, dur: U.mago.storm.dur };
      const B = V.budget(), y = by();
      V.ring(B, P.x, y + .15, P.z, 0xa070ff, .5, 4, .6, .8);
      V.pillar(B, P.x, y, P.z, 0xc8a0ff, .9, 3.5, .7, .4);
      V.sparks(B, P.x, y + 1, P.z, [0xa070ff, 0xffffff], 10, 4, .8, .08, 3, 3);
    },
  ],
  ladino: [
    /* Passo Sombrio: some em fumaça e reaparece atrás do alvo */
    () => {
      const t = pickTarget(U.ladino.passo.range);
      if (!t) { warn('Sem alvo por perto'); return false; }
      S.tp = { t: 0, tg: t, ox: P.x, oz: P.z, ph: 0 };
      P.inv = 1; stopMove();
      smoke(P.x, by(), P.z);
      ghost(P.x, by(), P.z, 0x8a50e0, .7);
      P.g.visible = false;
    },
    /* Adagas Venenosas: 3 adagas em leque */
    () => {
      const t = pickTarget(U.ladino.adagas.range), ang = t ? Math.atan2(t.x - P.x, t.z - P.z) : P.g.rotation.y;
      face(ang); S.pose = .3;
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * .3, m = V.solid(G.BEAM, 0xb0f060, 1, P.x + Math.sin(a) * .8, by() + 1.3, P.z + Math.cos(a) * .8, [.07, .07, .6]);
        m.rotation.y = a;
        S.daggers.push({ m, a, x: m.position.x, z: m.position.z, y: m.position.y, d: 0, B: V.budget(), tt: 0 });
      }
    },
    /* Dança das Lâminas: 4 s invulnerável, 6 golpes pulando entre os inimigos */
    () => {
      S.dance = { t: 0, n: 0, dur: U.ladino.danca.dur, last: null };
      P.inv = U.ladino.danca.dur; fadePlayer(true);
      smoke(P.x, by(), P.z);
    },
  ],
};

/* ====================================================== visuais auxiliares ====================================================== */

function smoke(x, y, z) {
  const B = V.budget(); B.max = 14;
  V.flash(B, x, y + 1, z, 0x5a2a8a, .4, 1.4, .45, .55);
  V.ring(B, x, y + .15, z, 0xa060ff, .3, 2, .45, .7);
  for (let i = 0; i < 5; i++) V.add(B, G.ORB, i % 2 ? 0x3a1a5a : 0x7a40c0, x + rnd(-.4, .4), y + rnd(.4, 1.4), z + rnd(-.4, .4), rnd(.3, .6), { life: .7, o: .5, v: [rnd(-.5, .5), rnd(.4, 1), rnd(-.5, .5)], grow: .8 });
  V.sparks(B, x, y + 1, z, [0xc090ff, 0x2a1a3a], 4, 3, .5, .08, 1.5, 3);
}
function ghost(x, y, z, col, life) {
  const B = V.budget(); B.max = 2;
  V.add(B, G.ORB, col, x, y + .95, z, [.32, .85, .32], { life, o: .5 });
  V.add(B, G.ORB, col, x, y + 1.85, z, .22, { life, o: .5 });
}
/** X branco do crítico garantido do Ladino */
function fsFx(e) {
  const B = V.budget(), y = ey(e) + 1.2; B.max = 4;
  V.add(B, G.BOX, 0xffffff, e.x, y, e.z, [1.5, .07, .07], { life: .28, o: .95, face: true, rz: .8, grow: [2, 0, 0] });
  V.add(B, G.BOX, 0xffffff, e.x, y, e.z, [1.5, .07, .07], { life: .28, o: .95, face: true, rz: -.8, grow: [2, 0, 0] });
}
function arcCut(B, e) {
  V.add(B, G.ARC, 0xffffff, e.x, ey(e) + 1.2, e.z, rnd(.9, 1.4), { life: .22, o: .95, face: true, rz: rnd(0, 6.28), grow: 2.5 });
}

/** Deixa o personagem semitransparente (clona o material de cada malha e depois devolve o original) */
function fadePlayer(on) {
  if (on && !S.ghosted) {
    S.ghosted = [];
    P.g.traverse(m => {
      if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
      const c = m.material.clone(); c.transparent = true; c.opacity = .4; c.depthWrite = false;
      S.ghosted.push([m, m.material, c]); m.material = c;
    });
  } else if (!on && S.ghosted) {
    S.ghosted.forEach(([m, o, c]) => { m.material = o; c.dispose(); });
    S.ghosted = null;
  }
}

/* armadilha: placa escura + 7 dentes de metal */
function makeTrap(x, z) {
  const y = groundY(x, z) + .06, g = new THREE.Group();
  const plate = new THREE.MeshBasicMaterial({ color: 0x2a2620 }), metal = new THREE.MeshBasicMaterial({ color: 0xb8c0c8 });
  const d = new THREE.Mesh(G.DISC, plate); d.scale.set(.85, 1, .85); g.add(d);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.283, c = new THREE.Mesh(G.CONE, metal);
    c.position.set(Math.sin(a) * .6, 0, Math.cos(a) * .6); c.scale.set(.1, .38, .1); c.rotation.set(Math.cos(a) * .35, 0, -Math.sin(a) * .35);
    g.add(c);
  }
  g.position.set(x, y, z); g.scale.setScalar(.01);
  scene.add(g);
  return { x, z, t: U.cacador.trap.life, g, mats: [plate, metal], age: 0 };
}
function dropTrap(t) {
  if (!t) return;
  scene.remove(t.g);
  t.mats.forEach(m => m.dispose());
}
function trapFire(t, e) {
  S.dmx = S.fx[1];
  const B = V.budget(), y = ey(e);
  e.root = e.t.boss ? U.cacador.trap.rootBoss : U.cacador.trap.root;
  e.bl = U.cacador.trap.bleed; e.bd = Math.max(1, dm(U.cacador.trap.bleedMult, 'ranged')); e.bt = .5;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.283;
    V.add(B, G.CONE, 0xe8eef2, e.x + Math.sin(a) * .5, y, e.z + Math.cos(a) * .5, [.12, 1.1, .12], { life: .6, o: .95, rot: [Math.cos(a) * .3, 0, -Math.sin(a) * .3] });
  }
  V.ring(B, e.x, y + .15, e.z, 0xc8d0d8, .3, 1.8, .4, .8);
  V.sparks(B, e.x, y + .5, e.z, [0xffffff, 0xc03030], 8, 3, .5, .08, 3, 8);
  state.SHK = Math.max(state.SHK, .15);
  dropTrap(t);
}

/* ====================================================== atualização por frame ====================================================== */

const bubbleOf = (geo, col, o, s) => { const m = V.solid(geo, col, o, 0, 0, 0, s); m.visible = false; return m; };

export function updateSkills(dt) {
  if (!S.on) return;
  S.clock += dt;
  V.updateVfx(dt);
  if (P.dead) { if (!S.dead) { S.dead = true; cancelAll(); } return; }
  S.dead = false;
  const y = by();

  /* entrar/sair de dungeon: armadilhas, bolas, adagas, chuva e tempestade não atravessam o portal */
  const dn = inDungeon();
  if (dn !== S.dun) { S.dun = dn; clearWorld(); }

  /* recargas e tempos */
  for (let i = 0; i < 3; i++) if (S.cds[i] > 0) S.cds[i] = Math.max(0, S.cds[i] - dt);
  if (S.shT > 0) { S.shT -= dt; if (S.shT <= 0) S.shield = 0; }
  if (P.inv > 0 && !S.dance && !S.tp) P.inv = Math.max(0, P.inv - dt);
  if (P.haste > 0) { P.haste -= dt; S.hasteT += dt; if (S.hasteT > .07) { S.hasteT = 0; hasteTrail(); } }
  if (S.pose > 0) S.pose -= dt;
  P.noKb = S.mur > 0;

  /* regeneração de mana do Mago (Fluxo Arcano: 3%/s fora de combate, 1%/s em combate; já inclui os +3/s base) */
  if (S.k === 'mago') {
    S.ct -= dt;
    if (S.ct <= 0) { S.ct = .3; S.combat = enemies.some(e => !e.dead && e.ag && dist(e) < 26); }
    P.mp = Math.min(P.mmax, P.mp + Math.max(0, (S.combat ? U.mago.fluxo.regenIn : U.mago.fluxo.regenOut) * (1 + U.mago.fluxo.rank * S.rk[3]) * P.mmax - 3) * dt);
  }
  if (S.TT.mpr) P.mp = Math.min(P.mmax, P.mp + S.TT.mpr * P.mmax * dt);
  P.tspd = S.TT.spd;

  /* estados nos inimigos */
  for (const e of enemies) {
    if (e.dead) continue;
    let tint = 0;
    if (e.st === 'wind') e.atkd = true;   // já está te atacando (chefes com IA própria também): o Golpe Furtivo só vale antes
    if (e.slow > 0) { e.slow -= dt; tint = 0x2a6cc0; }
    if (e.root > 0) e.root -= dt;
    if (e.tn > 0) e.tn -= dt;
    if (e.bn > 0) {
      e.bn -= dt; e.bnt -= dt; tint = tint || 0xa04010;
      if (e.bnt <= 0) { e.bnt = .5; hit(e, e.bnd * .5, { dot: 1 }); if (e.dead) continue; const B = { n: 0, max: 1 }; V.sparks(B, e.x, ey(e) + 1.6, e.z, 0xff8a20, 1, .8, .5, .08, 1.5, -1); }
    }
    if (e.ps > 0) {
      e.ps -= dt; e.pst -= dt; tint = tint || 0x2a9a2a;
      if (e.pst <= 0) { e.pst = .5; hit(e, e.psd * e.pn * .5, { dot: 1 }); if (e.dead) continue; const B = { n: 0, max: 1 }; V.sparks(B, e.x, ey(e) + 1.5, e.z, 0x6aff40, 1, .6, .5, .07, 0, 6); }
      if (e.ps <= 0) e.pn = 0;
    }
    e.tint = tint;
  }

  /* --- Guerreiro --- */
  if (S.leap) updLeap(dt, y);
  if (S.gt > 0) {
    S.gt -= dt;
    S.aura = S.aura || bubbleOf(G.PILLAR, 0xff3020, .2, 1);
    S.aura.visible = true;
    S.aura.position.set(P.x, y, P.z);
    const p = 1 + Math.sin(S.clock * 8) * .06;
    S.aura.scale.set(1.05 * p, 2.5, 1.05 * p);
    S.aura.material.opacity = S.gt < 1 ? .2 * S.gt : .22;
    if (S.gt <= 0) S.aura.visible = false;
  }
  if (S.mur > 0) {
    S.mur -= dt;
    S.shell = S.shell || bubbleOf(G.ROCK, 0x9a9484, .34, 1);
    S.shell.visible = true;
    S.shell.position.set(P.x, y + 1.05, P.z);
    S.shell.scale.set(1.35, 1.65, 1.35);
    S.shell.rotation.y += dt * .6;
    if (S.mur <= 0) { S.shell.visible = false; shellBreak(y); }
  }
  if (S.shield > 0) {
    S.bub = S.bub || bubbleOf(G.ORB, 0xffd860, .26, 1);
    S.bub.visible = true;
    S.bub.position.set(P.x, y + 1, P.z);
    const p = 1 + Math.sin(S.clock * 6) * .04;
    S.bub.scale.set(1.15 * p, 1.5 * p, 1.15 * p);
    S.bub.material.opacity = S.shT < .8 ? .26 * S.shT / .8 : .26;
  } else if (S.bub) S.bub.visible = false;

  /* --- Caçador --- */
  if (S.rain) updRain(dt);
  if (S.k === 'cacador') {
    for (let i = S.traps.length - 1; i >= 0; i--) {
      const t = S.traps[i];
      t.age += dt; t.t -= dt;
      t.g.scale.setScalar(Math.min(1, t.age * 5));
      let fired = false;
      if (t.age > .35) for (const e of enemies) if (!e.dead && !e.inv && Math.hypot(e.x - t.x, e.z - t.z) < U.cacador.trap.trigger) { trapFire(t, e); fired = true; break; }
      if (fired || t.t <= 0) { if (!fired) dropTrap(t); S.traps.splice(i, 1); }
    }
    const tg = P.tgt;
    if (tg && !tg.dead && dist(tg) > 6 && dist(tg) < 40) {   // retículo de Olho de Águia
      if (!S.ret) S.ret = [V.solid(G.RING, 0xffd24a, .9, 0, 0, 0, 1), V.solid(G.RING, 0xfff2a0, .7, 0, 0, 0, .55)];
      S.ret[0].visible = S.ret[1].visible = true;
      const ry = ey(tg) + .14;
      S.ret[0].position.set(tg.x, ry, tg.z); S.ret[1].position.set(tg.x, ry, tg.z);
      S.ret[0].rotation.y += dt * 1.5; S.ret[1].rotation.y -= dt * 2.4;
      const p = 1 + Math.sin(S.clock * 5) * .08, sc = tg.t.boss ? 1.9 : 1;
      S.ret[0].scale.set(sc * p, 1, sc * p); S.ret[1].scale.set(sc * .55, 1, sc * .55);
    } else if (S.ret) S.ret[0].visible = S.ret[1].visible = false;
  }

  /* --- Mago --- */
  if (S.cast) updCast(dt, y);
  if (S.balls.length) updBalls(dt);
  if (S.storm) updStorm(dt, y);
  S.lev += ((S.storm ? .3 : 0) - S.lev) * Math.min(1, dt * 6);
  if (S.k === 'mago') {
    if (!S.orbs) S.orbs = [0, 1, 2].map(i => V.solid(G.ORB, i % 2 ? 0xa070ff : 0x7fd8ff, .85, 0, 0, 0, .13));
    S.orbA = (S.orbA || 0) + dt * (1.4 + (1 - P.mp / P.mmax) * 4.5);
    S.orbs.forEach((m, i) => {
      const a = S.orbA + i * 2.094;
      m.position.set(P.x + Math.sin(a) * 1.1, y + 1.25 + Math.sin(a * 1.7 + i) * .22 + S.lev, P.z + Math.cos(a) * 1.1);
    });
  }

  /* --- Ladino --- */
  if (S.tp) updTp(dt, y);
  if (S.dance) updDance(dt);
  if (S.daggers.length) updDaggers(dt);

  /* aura discreta em repouso (anel no chão na cor da classe) */
  if (S.auraR) {
    const vis = !P.sit && !P.swimming && P.g.visible !== false;
    S.auraR[0].visible = S.auraR[1].visible = vis;
    if (vis) {
      S.auraR[0].position.set(P.x, y + .07, P.z); S.auraR[1].position.set(P.x, y + .08, P.z);
      S.auraR[0].rotation.y += dt * .5; S.auraR[1].rotation.y -= dt * .9;
      const p = 1 + Math.sin(S.clock * 2) * .05;
      S.auraR[0].scale.set(.95 * p, 1, .95 * p); S.auraR[1].scale.set(.62 * p, 1, .62 * p);
    }
  }

  /* pose dos braços (por cima da animação normal; só enquanto conjura) e levitação */
  if (S.pose > 0 || S.storm || S.gt > 7.45) {
    const k = S.storm ? 1 : Math.min(1, S.pose * 5);
    if (S.k === 'cacador' || (S.k === 'ladino') ) { P.g.arm.rotation.x = -1.5 * k; }
    else { P.g.arm.rotation.x = -2.7 * k; P.g.armL.rotation.x = -2.7 * k; }
  }
  if (S.lev > .005) P.g.position.y += S.lev;
  updateUI();
}

function hasteTrail() {
  const B = { n: 0, max: 2 };
  V.add(B, G.ORB, 0x5a2a8a, P.x, by() + .9, P.z, [.3, .8, .3], { life: .45, o: .4 });
  V.add(B, G.DISC, 0x2a1a3a, P.x, by() + .08, P.z, .6, { life: .5, o: .35 });
}

/* --- Golpe Cataclísmico --- */
function updLeap(dt, y) {
  const L = S.leap;
  S.dmx = S.fx[0];
  L.t += dt; stopMove();
  P.cd = Math.max(P.cd, .2);
  if (L.t < L.crouch) {
    const u = L.t / L.crouch;
    P.g.position.y -= .22 * Math.sin(u * Math.PI / 2);
    P.g.up.rotation.x = .55 * u; P.g.legL.rotation.x = P.g.legR.rotation.x = -.9 * u;
    return;
  }
  const u = Math.min(1, (L.t - L.crouch) / (L.dur - L.crouch));
  P.x = lerp(L.x0, L.x1, u); P.z = lerp(L.z0, L.z1, u);
  P.g.position.set(P.x, y + 2.3 * 4 * u * (1 - u), P.z);
  P.g.arm.rotation.x = -2.6 * (1 - u); P.g.armL.rotation.x = -2.6 * (1 - u);
  P.g.up.rotation.x = -.25 * (1 - u) + .5 * u;
  if (u >= 1) {
    const x = L.x1, z = L.z1, gy = groundY(x, z);
    S.leap = null; stopMove();
    for (const e of enemies) {
      if (e.dead || e.inv || Math.hypot(e.x - x, e.z - z) > U.guerreiro.cata.r) continue;
      dealt(e, U.guerreiro.cata.mult, 'melee', { kn: U.guerreiro.cata.kn, ang: Math.atan2(e.x - x, e.z - z) });
      if (!e.dead) e.sn = Math.max(e.sn || 0, e.t.boss ? U.guerreiro.cata.stunBoss : U.guerreiro.cata.stun);
    }
    quake(x, gy, z);
    state.SHK = Math.max(state.SHK, .7); state.HS = Math.max(state.HS, .09);
  }
}
function quake(x, y, z) {
  const B = V.budget();
  for (let i = 0; i < 8; i++) {   // rachaduras em estrela
    const a = i / 8 * 6.283 + rnd(-.15, .15), l = rnd(2.2, 3.4);
    V.add(B, G.BEAM, 0x2a1c12, x, y + .06, z, [.16, .04, l], { life: 1.6, o: .95, rot: [0, a, 0] });
  }
  V.ring(B, x, y + .1, z, 0xb8a888, .5, 4.8, .65, .75);
  V.ring(B, x, y + .12, z, 0xff6a30, .3, 3.2, .4, .8);
  V.disc(B, x, y + .08, z, 0xffa050, 1, 3.4, .35, .45);
  for (let i = 0; i < 4; i++) V.add(B, G.DISC, 0xb0a48c, x + rnd(-1.5, 1.5), y + .3, z + rnd(-1.5, 1.5), 1, { life: .9, o: .4, v: [0, .8, 0], grow: [1.6, 0, 1.6] });
  for (let i = 0; i < 9; i++) {   // pedras voando
    const a = rnd(0, 6.283), r = rnd(1.5, 4);
    V.add(B, G.ROCK, i % 3 ? 0x6b5a48 : 0x8a7a66, x + Math.sin(a) * .8, y + .3, z + Math.cos(a) * .8, rnd(.12, .3), { life: 1, o: 1, v: [Math.sin(a) * r, rnd(5, 9), Math.cos(a) * r], g: 16, spin: [rnd(2, 9), rnd(2, 9), 0], mode: 'hold' });
  }
}
function shellBreak(y) {
  S.dmx = S.fx[2];
  const B = V.budget(), x = P.x, z = P.z;
  for (const e of enemies) {
    if (e.dead || e.inv || dist(e) > U.guerreiro.muralha.r) continue;
    dealt(e, U.guerreiro.muralha.mult, 'melee', { kn: U.guerreiro.muralha.kn, ang: Math.atan2(e.x - x, e.z - z) });
  }
  V.ring(B, x, y + .15, z, 0xd8d0c0, .5, 4.8, .55, .85);
  V.ring(B, x, y + .17, z, 0xffffff, .3, 3.5, .35, .7);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.283 + rnd(-.2, .2), r = rnd(3, 6);
    V.add(B, G.SHARD, i % 2 ? 0x9a9484 : 0x6e6858, x, y + rnd(.5, 1.6), z, rnd(.15, .32), { life: .9, o: .9, v: [Math.sin(a) * r, rnd(1, 5), Math.cos(a) * r], g: 12, spin: [rnd(3, 9), rnd(3, 9), 0], mode: 'hold' });
  }
  V.sparks(B, x, y + .4, z, 0xb8b0a0, 6, 4, .6, .1, 2, 6);
  state.SHK = Math.max(state.SHK, .5); state.HS = Math.max(state.HS, .06);
}

/* --- Chuva de Balas --- */
function updRain(dt) {
  const R = S.rain;
  S.dmx = S.fx[2];
  R.t += dt;
  R.r1.rotation.y += dt * 1.8; R.r2.rotation.y -= dt * 2.6;
  const fade = R.t > R.dur ? Math.max(0, 1 - (R.t - R.dur) / .35) : 1;
  R.r1.material.opacity = .85 * fade; R.r2.material.opacity = .6 * fade; R.r3.material.opacity = .12 * fade;
  while (R.n < U.cacador.chuva.shots && R.t >= R.n * (R.dur / U.cacador.chuva.shots)) {
    R.n++;
    const cand = enemies.filter(e => !e.dead && !e.inv && Math.hypot(e.x - R.x, e.z - R.z) < U.cacador.chuva.r);
    let px, pz;
    if (cand.length && Math.random() < .75) { const e = cand[(Math.random() * cand.length) | 0]; px = e.x; pz = e.z; }
    else { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * 4.6; px = R.x + Math.sin(a) * r; pz = R.z + Math.cos(a) * r; }
    const gy = groundY(px, pz), B = { n: 0, max: 5 };
    for (const e of cand) if (!e.dead && Math.hypot(e.x - px, e.z - pz) < U.cacador.chuva.hit) dealt(e, U.cacador.chuva.mult, 'ranged', { kn: .3, ang: Math.atan2(e.x - px, e.z - pz) });
    V.bolt(B, px + rnd(-.5, .5), gy + 13, pz, px, gy + .2, pz, 0xe8ff90, .1, .2, 1);
    V.disc(B, px, gy + .1, pz, 0xe8ff90, .4, 1.4, .3, .6);
    V.add(B, G.DISC, 0xb8a888, px, gy + .25, pz, .6, { life: .6, o: .4, v: [0, .7, 0], grow: [1.8, 0, 1.8] });
    V.sparks(B, px, gy + .3, pz, [0xfff0a0, 0xa0ff70], 2, 3, .4, .07, 3, 8);
    state.SHK = Math.max(state.SHK, .08);
  }
  if (R.t >= R.dur + .35) { [R.r1, R.r2, R.r3].forEach(V.drop); S.rain = null; }
}

/* --- Bola de Fogo --- */
function updCast(dt, y) {
  const C = S.cast;
  C.t += dt;
  const u = Math.min(1, C.t / C.dur), a = C.ang;
  C.orb.position.set(P.x + Math.sin(a) * .75, y + 1.5, P.z + Math.cos(a) * .75);
  C.orb.scale.setScalar(.1 + .38 * u);
  if (Math.random() < .5) V.sparks({ n: 0, max: 1 }, C.orb.position.x, C.orb.position.y, C.orb.position.z, 0xffd060, 1, 1.2, .3, .06, .4, 0);
  if (C.t >= C.dur) {
    const glow = V.solid(G.ORB, 0xff5a10, .35, C.orb.position.x, C.orb.position.y, C.orb.position.z, .8);
    S.balls.push({ m: C.orb, glow, x: C.orb.position.x, y: C.orb.position.y, z: C.orb.position.z, dx: Math.sin(a), dz: Math.cos(a), d: 0, tr: 0, B: { n: 0, max: 14 }, gy: C.orb.position.y });
    S.cast = null;
  }
}
function updBalls(dt) {
  S.dmx = S.fx[0];
  for (let i = S.balls.length - 1; i >= 0; i--) {
    const b = S.balls[i], st = U.mago.fogo.speed * dt;
    b.x += b.dx * st; b.z += b.dz * st; b.d += st;
    b.m.position.set(b.x, b.y, b.z); b.glow.position.set(b.x, b.y, b.z);
    b.glow.scale.setScalar(.75 + Math.sin(S.clock * 30) * .08);
    b.tr -= dt;
    if (b.tr <= 0) { b.tr = .05; V.sparks(b.B, b.x, b.y, b.z, [0xff8a20, 0xffd060], 1, 1, .4, .09, .5, 2); }
    let boom = b.d >= U.mago.fogo.range;
    if (!boom) for (const e of enemies) if (!e.dead && !e.inv && Math.hypot(e.x - b.x, e.z - b.z) < U.mago.fogo.hit) { boom = true; break; }
    if (boom) { fireBoom(b.x, b.y, b.z); V.drop(b.m); V.drop(b.glow); S.balls.splice(i, 1); }
  }
}
function fireBoom(x, y, z) {
  const B = V.budget(), gy = groundY(x, z);
  for (const e of enemies) {
    if (e.dead || e.inv || Math.hypot(e.x - x, e.z - z) > U.mago.fogo.r) continue;
    dealt(e, U.mago.fogo.mult, 'area', { kn: 1, ang: Math.atan2(e.x - x, e.z - z) });
    if (!e.dead) { e.bn = U.mago.fogo.burn; e.bnt = .5; e.bnd = dm(U.mago.fogo.burnMult, 'area'); }
  }
  V.flash(B, x, y, z, 0xfff0b0, .4, 2.6, .25, .9);
  V.flash(B, x, y, z, 0xff7a20, .3, 3.4, .45, .55);
  V.ring(B, x, gy + .15, z, 0xff6a20, .4, 3.8, .5, .9);
  V.ring(B, x, gy + .17, z, 0xffd060, .3, 2.6, .35, .8);
  V.disc(B, x, gy + .1, z, 0xff9a40, 2, 3.4, .6, .5);     // "luz" laranja no chão (sem luz real: trocar a quantidade de luzes recompila todos os materiais)
  V.sparks(B, x, y, z, [0xff8a20, 0xffd060, 0xff4a10], 14, 6, .8, .1, 4, 8);
  V.add(B, G.ORB, 0x3a3028, x, y + .6, z, .8, { life: .9, o: .45, v: [0, 1.2, 0], grow: 1.6 });
  state.SHK = Math.max(state.SHK, .3);
}

/* --- Tempestade Arcana --- */
function updStorm(dt, y) {
  const T = S.storm;
  S.dmx = S.fx[2];
  T.t += dt;
  const ov = $('skov');
  if (ov) ov.classList.toggle('on', T.t < T.dur);
  while (T.n < U.mago.storm.bolts && T.t >= T.n * U.mago.storm.every) {
    T.n++;
    const cand = enemies.filter(e => !e.dead && !e.inv && dist(e) < U.mago.storm.r);
    let px, pz, tg = null;
    if (cand.length) { tg = cand[(Math.random() * cand.length) | 0]; px = tg.x; pz = tg.z; }
    else { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * U.mago.storm.r; px = P.x + Math.sin(a) * r; pz = P.z + Math.cos(a) * r; }
    const gy = groundY(px, pz);
    if (tg) { dealt(tg, U.mago.storm.mult, 'area', { kn: .2 }); for (const e of cand) if (e !== tg && !e.dead && Math.hypot(e.x - px, e.z - pz) < U.mago.storm.chain) dealt(e, U.mago.storm.mult, 'area', { kn: .2 }); }
    lightning(px, gy, pz);
  }
  if (T.t >= T.dur) { S.storm = null; if (ov) ov.classList.remove('on'); }
}
function lightning(x, gy, z) {
  const B = { n: 0, max: 14 };
  let cx = x + rnd(-.8, .8), cy = gy + 14, cz = z + rnd(-.8, .8);
  for (let k = 1; k <= 4; k++) {
    const nx = k === 4 ? x : x + rnd(-1.2, 1.2), ny = gy + 14 - k * 3.5, nz = k === 4 ? z : z + rnd(-1.2, 1.2);
    V.bolt(B, cx, cy, cz, nx, ny, nz, 0xf0e8ff, .16, .22, 1);
    V.bolt(B, cx, cy, cz, nx, ny, nz, 0x9a6bff, .5, .3, .35);
    cx = nx; cy = ny; cz = nz;
  }
  V.flash(B, x, gy + .5, z, 0xffffff, .3, 1.5, .2, .95);
  V.ring(B, x, gy + .15, z, 0x9ad8ff, .3, 2.4, .35, .85);
  V.sparks(B, x, gy + .4, z, [0xffffff, 0xa070ff], 4, 4, .4, .07, 2, 6);
  state.SHK = Math.max(state.SHK, .12);
}

/* --- Passo Sombrio --- */
function updTp(dt, y) {
  const T = S.tp;
  S.dmx = S.fx[0];
  T.t += dt; stopMove(); P.inv = Math.max(P.inv, .3);
  if (T.ph === 0) {
    P.g.visible = false;
    if (T.t >= .22) {
      T.ph = 1;
      const e = T.tg;
      const ex = e.dead ? T.ox : e.x, ez = e.dead ? T.oz : e.z;
      let dx = ex - T.ox, dz = ez - T.oz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const dest = landing(ex + dx * 1.4, ez + dz * 1.4) || landing(ex - dx * 1.4, ez - dz * 1.4) || { x: T.ox, z: T.oz }, nx = dest.x, nz = dest.z;
      P.x = nx; P.z = nz; stopMove();
      face(Math.atan2(ex - nx, ez - nz));
      P.g.visible = true;
      smoke(nx, groundY(nx, nz), nz);
      if (!e.dead) {
        dealt(e, U.ladino.passo.mult, 'melee', { cr: true, kn: .6, ang: Math.atan2(ex - nx, ez - nz) });
        const B = V.budget(); B.max = 6; fsFx(e); arcCut(B, e);
        state.SHK = Math.max(state.SHK, .25); state.HS = Math.max(state.HS, .05);
      }
    }
  } else if (T.t >= .5) { S.tp = null; P.inv = 0; P.g.visible = true; }
}

/* --- Adagas Venenosas --- */
function updDaggers(dt) {
  S.dmx = S.fx[1];
  for (let i = S.daggers.length - 1; i >= 0; i--) {
    const g = S.daggers[i], st = 24 * dt;
    g.x += Math.sin(g.a) * st; g.z += Math.cos(g.a) * st; g.d += st;
    g.m.position.set(g.x, g.y, g.z);
    g.tt -= dt;
    if (g.tt <= 0) { g.tt = .045; V.sparks(g.B, g.x, g.y, g.z, [0x7aff40, 0xd0ff90], 1, .6, .4, .07, 0, 4); }
    let hitE = null;
    for (const e of enemies) if (!e.dead && !e.inv && Math.hypot(e.x - g.x, e.z - g.z) < 1) { hitE = e; break; }
    if (hitE || g.d > U.ladino.adagas.range) {
      if (hitE) {
        dealt(hitE, U.ladino.adagas.mult, 'ranged', { kn: .3, ang: g.a });
        if (!hitE.dead) { hitE.pn = Math.min(U.ladino.adagas.stacks, (hitE.pn || 0) + 1); hitE.ps = U.ladino.adagas.poison; hitE.pst = hitE.pst > 0 ? hitE.pst : .5; hitE.psd = dm(U.ladino.adagas.pmult, 'ranged'); }
        const B = { n: 0, max: 7 };
        V.flash(B, g.x, g.y, g.z, 0x7aff40, .2, .9, .3, .7);
        V.sparks(B, g.x, g.y, g.z, [0x6aff40, 0x2a8a20], 6, 3, .6, .08, 1, 8);   // gotas verdes
      }
      V.drop(g.m); S.daggers.splice(i, 1);
    }
  }
}

/* --- Dança das Lâminas --- */
function updDance(dt) {
  const D = S.dance;
  S.dmx = S.fx[2];
  D.t += dt; P.inv = Math.max(P.inv, .25); stopMove();
  P.g.arm.rotation.x = -1.2 + Math.sin(D.t * 28) * .9;
  while (D.n < U.ladino.danca.hits && D.t >= D.n * U.ladino.danca.every + .12) {
    D.n++;
    const cand = enemies.filter(e => !e.dead && !e.inv && dist(e) < U.ladino.danca.r);
    if (!cand.length) continue;
    let e = cand[(Math.random() * cand.length) | 0];
    if (cand.length > 1 && e === D.last) e = cand[(cand.indexOf(e) + 1) % cand.length];
    D.last = e;
    ghost(P.x, by(), P.z, 0x9a60ff, .55);
    let dx = P.x - e.x, dz = P.z - e.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const a0 = rnd(-1.2, 1.2), c = Math.cos(a0), s = Math.sin(a0), rx = dx * c - dz * s, rz = dx * s + dz * c;
    const ld = landing(e.x + rx * 1.2, e.z + rz * 1.2);
    if (ld) { P.x = ld.x; P.z = ld.z; }
    stopMove(); face(Math.atan2(e.x - P.x, e.z - P.z));
    dealt(e, U.ladino.danca.mult, 'melee', { kn: .3, ang: Math.atan2(e.x - P.x, e.z - P.z) });
    const B = V.budget(); B.max = 8;
    arcCut(B, e); arcCut(B, e);
    V.sparks(B, e.x, ey(e) + 1.2, e.z, [0xffffff, 0xb080ff], 4, 4, .35, .07, 1, 3);
    state.SHK = Math.max(state.SHK, .1);
  }
  if (D.t >= D.dur) { S.dance = null; P.inv = 0; fadePlayer(false); smoke(P.x, by(), P.z); }
}

/** Ponto de chegada de salto/teleporte: chão firme, sem props e sem entrar numa casa (ou sair dela) */
function landing(x, z) {
  if (!walkable(x, z)) return null;
  const h = houseAt(x, z, .3);
  if (h && h !== houseAt(P.x, P.z, .3)) return null;   // não atravessa parede de casa
  const f = freePoint(x, z, .7);
  if (!f || !walkable(f.x, f.z) || Math.hypot(f.x - x, f.z - z) > 1.2) return null;
  return { x: f.x, z: f.z };
}
/** Remove o que fica no mundo (armadilhas, bolas, adagas, chuva, tempestade); usado ao entrar/sair de dungeon */
function clearWorld() {
  S.traps.forEach(dropTrap); S.traps.length = 0;
  S.balls.forEach(b => { V.drop(b.m); V.drop(b.glow); }); S.balls.length = 0;
  S.daggers.forEach(g => V.drop(g.m)); S.daggers.length = 0;
  if (S.rain) { [S.rain.r1, S.rain.r2, S.rain.r3].forEach(V.drop); S.rain = null; }
  if (S.cast) { V.drop(S.cast.orb); S.cast = null; }
  S.storm = null;
  const ov = $('skov'); if (ov) ov.classList.remove('on');
  V.clearVfx();
}

function cancelAll() {
  S.leap = S.tp = S.cast = S.dance = null;
  if (S.rain) { [S.rain.r1, S.rain.r2, S.rain.r3].forEach(V.drop); S.rain = null; }
  S.balls.forEach(b => { V.drop(b.m); V.drop(b.glow); }); S.balls.length = 0;
  S.daggers.forEach(g => V.drop(g.m)); S.daggers.length = 0;
  S.storm = null; S.gt = S.mur = S.shield = S.shT = 0; S.lev = 0;
  [S.aura, S.shell, S.bub].forEach(m => { if (m) m.visible = false; });
  const ov = $('skov'); if (ov) ov.classList.remove('on');
  P.inv = 0; P.haste = 0; P.noKb = false; P.g.visible = true; fadePlayer(false);
  V.clearVfx();
}

/* ====================================================== interface ====================================================== */

const LOCK = '<path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/>';
let UI = null;
const svgOf = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
/** Os três botões entram na própria barra de habilidades (#sk), ao lado do Q, com o mesmo estilo dos outros */
function buildUI() {
  const D = S.D, sk = $('sk');
  document.body.classList.add('has-sk');
  D.act.forEach((a, i) => {
    const el = document.createElement('div');
    el.id = 'k' + (i + 1); el.className = 'skb'; el.dataset.i = i; el.style.setProperty('--c', D.css);
    el.title = tipOf(i);
    el.innerHTML = svgOf(a.ic) + (i === 0 ? '<i class="skpas" title="Passiva: ' + D.pas.n + ' — ' + D.pas.d + '">' + svgOf(D.pas.ic) + '</i>' : '') +
      `<span class="skc"></span><b class="skt"></b><em>${a.mp}</em><small>${i + 1}</small><u>${svgOf(LOCK)}<s>Nv ${SKILL_LV[i]}</s></u>`;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useSkill(i); });
    sk.append(el);
  });
  const ov = document.createElement('div'); ov.id = 'skov'; document.body.append(ov);
  const gw = $('gwr'); gw.classList.add('mana'); gw.title = 'Mana'; $('omp').title = 'Mana';
  UI = { b: [...sk.querySelectorAll('.skb')], m: [], c: [], t: [] };
  UI.b.forEach(() => { UI.m.push(''); UI.c.push(''); UI.t.push(''); });
}
let blinkT = 0;
/** Pisca o diamante de mana (faltou mana para a habilidade) */
function blinkMana() {
  const g = $('gwr'); if (!g) return;
  g.classList.remove('lowmp'); void g.offsetWidth; g.classList.add('lowmp');
  clearTimeout(blinkT); blinkT = setTimeout(() => g.classList.remove('lowmp'), 1000);
}
function updateUI() {
  if (!UI) return;
  UI.b.forEach((el, i) => {
    const why = skillLock(i), lk = !!why, cd = S.cds[i], p = lk ? 0 : Math.round(cd / S.cdm[i] * 100), wo = rodBlocked();
    const cls = (lk ? 'lk' : '') + (!lk && P.mp < S.D.act[i].mp ? ' nm' : '') + (isActive(i) ? ' on' : '') + (wo ? ' wo' : '');
    if (UI.c[i] !== cls) {
      UI.c[i] = cls; el.className = 'skb ' + cls;
      el.style.opacity = wo ? '.4' : ''; el.style.filter = wo ? 'grayscale(.85)' : '';   // Rod na mão: botão esmaecido
      const s = el.querySelector('u s'); if (s && why) s.textContent = /^Nv/.test(why) ? why.split(' · ')[0].replace('Nv geral', 'Nv') : 'Prof. ' + why.replace(/[^0-9]+/g, '');
    }
    if (UI.m[i] !== p) { UI.m[i] = p; el.style.setProperty('--p', p + '%'); }
    const tx = !lk && cd > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
    if (UI.t[i] !== tx) { UI.t[i] = tx; el.querySelector('.skt').textContent = tx; }
  });
}
function isActive(i) {
  return (S.k === 'guerreiro' && ((i === 1 && S.gt > 0) || (i === 2 && S.mur > 0))) || (S.k === 'mago' && i === 2 && !!S.storm) || (S.k === 'ladino' && i === 2 && !!S.dance) || (S.k === 'cacador' && i === 2 && !!S.rain);
}

export function initSkills() {
  const c = activeChar(), D = c && SKILLS[c.k];
  if (!D) return;   // personagem sem classe: nenhuma habilidade, nada muda
  S.on = true; S.k = c.k; S.D = D;
  P.skh = { pre, post, hurt, dodged, lvl };
  P.inv = 0;
  S.auraR = [V.solid(G.RING, D.col[0], .22, 0, 0, 0, 1), V.solid(G.RING, D.col[1], .16, 0, 0, 0, .6)];
  S.auraR[0].visible = S.auraR[1].visible = false;
  try { const kk = JSON.parse(localStorage.getItem('pirata-skillkeys')); if (Array.isArray(kk) && kk.length === 3 && kk.every(x => typeof x === 'string')) S.keys = kk; } catch (e) { /* padrão */ }
  buildUI();
  recalc();
  buildKeyRow();
  refreshKeys();
  document.addEventListener('keydown', e => {
    if (e.repeat || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    if (S.capture !== undefined) return;   // escolhendo a tecla de uma habilidade (painel)
    let k = S.keys.indexOf(e.code);
    if (k < 0 && /^(Digit|Numpad)[123]$/.test(e.code) && S.keys.every((c, j) => /^Digit\d$/.test(c))) k = +e.code.slice(-1) - 1;   // teclado numérico também vale enquanto as teclas são as padrão
    if (k >= 0 && k < 3) useSkill(k);
  });
}

/* ====================================================== pontos, ranks e talentos ====================================================== */

const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
/** Pontos livres (derivados do nível: ninguém perde nada por save antigo) */
export const skillPoints = () => Math.max(0, PTS.skill(P.lv) - sum(S.rk));
export const talentPoints = () => Math.max(0, PTS.talent(P.lv) - sum(S.tl));
export const rankOf = i => S.rk[i] || 0;
export const talentRank = (b, i) => S.tl[b + ':' + i] || 0;
export const keyLabel = c => (c || '').replace(/^Digit/, '').replace(/^Key/, '').replace(/^Numpad/, 'N');
export const skillKeys = () => S.keys.slice();
export const effCost = i => costOf(i);
export const effCd = i => cdOf(i);
/** Soma dos talentos aprendidos */
function recalc() {
  const T = { dmg: 0, crit: 0, dr: 0, hp: 0, mp: 0, spd: 0, cdr: 0, mpc: 0, mpr: 0 };
  const tr = TALENTS[S.k] || [];
  tr.forEach((br, b) => br.nodes.forEach((n, i) => { T[n.k] += TSTAT[n.k].v * talentRank(b, i); }));
  Object.assign(S.TT, T);
  refreshCosts();
}
/** Dica completa do botão: nome, descrição, tecla, custo e recarga efetivos e rank */
export const tipOf = i => { const a = S.D.act[i]; return a.n + ' — ' + a.d + '\nTecla ' + keyLabel(S.keys[i]) + ' · ' + costOf(i) + ' de mana · recarga ' + cdOf(i).toFixed(1) + ' s · rank ' + S.rk[i] + '/' + RANK.max + (skillLock(i) ? '\n🔒 Requer: ' + skillLock(i) : '') + (rodBlocked() ? '\n⛔ Com o Rod ativo: troque para o Cajado' : ''); };
function refreshCosts() {
  if (!UI) return;
  UI.b.forEach((el, i) => { const em = el.querySelector('em'); if (em) em.textContent = costOf(i); el.title = tipOf(i); });
}
/** Vida e mana máximas dadas pelos talentos (fixas: entram em P.max/P.mmax ao aprender e saem ao redefinir) */
const flat = () => ({ hp: S.TT.hp, mp: S.TT.mp });   // total dos talentos agora; o que já entrou em max/mmax fica em S.tb (salvo à parte)
export function learnSkill(i) {
  if (!S.on || i < 0 || i > 3) return false;
  if (i < 3 && skillLock(i)) return false;
  if (S.rk[i] >= RANK.max || skillPoints() <= 0) return false;
  S.rk[i]++;
  refreshCosts();
  return true;
}
export function talentReq(b, i) { return i === 0 || talentRank(b, i - 1) > 0; }
export function learnTalent(b, i) {
  const br = (TALENTS[S.k] || [])[b], n = br && br.nodes[i];
  if (!n || talentRank(b, i) >= RANK.max || talentPoints() <= 0 || !talentReq(b, i)) return false;
  const k = b + ':' + i; S.tl[k] = (S.tl[k] || 0) + 1;
  const before = flat(); recalc(); const after = flat();
  const dh = after.hp - before.hp, dmn = after.mp - before.mp;
  P.max += dh; P.hp += dh; P.mmax += dmn; P.mp += dmn;   // +vida/+mana máximas entram direto…
  S.tb.hp += dh; S.tb.mp += dmn; P.tmaxBonus = S.tb;      // …e o quanto entrou fica guardado (P.tmaxBonus) para o reset não depender de max/mmax salvos
  return true;
}
/** Redefinir: devolve todos os pontos (grátis); a vida/mana máximas dos talentos saem de volta */
export function respec(tree) {
  if (!S.on) return;
  if (tree === 'rod') { S.rod.rk = []; return; }   // sem nó aprendível ainda: nada gasto
  if (tree === 'staff') { S.rk = [0, 0, 0, 0]; refreshCosts(); return; }   // só os ranks do Cajado: talentos (compartilhados), vida e mana máximas intocados
  S.rk = [0, 0, 0, 0]; S.tl = {};
  recalc();
  P.max = Math.max(1, P.max - S.tb.hp); P.mmax = Math.max(1, P.mmax - S.tb.mp);   // tira só o que os talentos puseram
  S.tb.hp = S.tb.mp = 0;
  P.hp = Math.min(P.hp, P.max); P.mp = Math.min(P.mp, P.mmax);
  refreshCosts();
}
/** Chance de crítico atual: base da classe + talentos (o mesmo que o hit() usa; habilidades pontuais como Olho de Águia não entram) */
export const critChance = () => Math.min(1, P.crit + (S.on ? S.TT.crit : 0));
export function wipeSkills() { S.rk = [0, 0, 0, 0]; S.rod.rk = []; S.tl = {}; S.tb.hp = S.tb.mp = 0; if (S.on) { recalc(); } }
/** Dados salvos (campo `skills` do save): ranks, talentos, migração feita e teclas ficam no navegador */
/** Save: classes de uma árvore = bloco de sempre (sv 1). Mago (sv 2): `rk` = ranks do Cajado (mesmo campo do sv 1, para saves antigos), `rod.rk` = ranks do Rod (vazio por enquanto); talentos e tb iguais. */
export const skillData = () => (S.on ? (treeList() ? { sv: 2, rk: S.rk.slice(), rod: { rk: S.rod.rk.slice() }, tl: { ...S.tl }, mig: S.mig, tb: { ...S.tb } } : { sv: 1, rk: S.rk.slice(), tl: { ...S.tl }, mig: S.mig, tb: { ...S.tb } }) : null);
export function loadSkillData(o) {
  if (!S.on || !o) return;
  if (Array.isArray(o.rk)) S.rk = [0, 1, 2, 3].map(i => Math.max(0, Math.min(RANK.max, o.rk[i] | 0)));
  if (o.tl && typeof o.tl === 'object') { S.tl = {}; Object.keys(o.tl).forEach(k => { const n = o.tl[k] | 0; if (n > 0 && /^\d:\d$/.test(k)) S.tl[k] = Math.min(RANK.max, n); }); }
  S.mig = o.mig ? 1 : 0;
  { const rr = o.rod && Array.isArray(o.rod.rk) ? o.rod.rk : []; S.rod.rk = rr.length <= ROD_TREE.length && rr.every(n => Number.isInteger(n) && n >= 0 && n <= RANK.max) ? rr.slice() : []; }   // Rod: bloco ausente/inválido = vazio
  S.tb = { hp: Math.max(0, +(o.tb && o.tb.hp) || 0), mp: Math.max(0, +(o.tb && o.tb.mp) || 0) };
  recalc();
  if (!o.tb) { S.tb = { hp: S.TT.hp, mp: S.TT.mp }; }   // save da versão anterior (sem tb): o bônus era o dos ranks aprendidos
  P.tmaxBonus = S.tb;
}
/** Escolher a tecla de uma habilidade: o próximo toque de tecla vira o atalho */
export function captureKey(i, done) {
  S.capture = i;
  const h = e => {
    e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', h, true);
    S.capture = undefined;
    if (e.code !== 'Escape' && !/^(Space|Tab|Enter|Backspace)$/.test(e.code)) {
      S.keys[i] = e.code;
      try { localStorage.setItem('pirata-skillkeys', JSON.stringify(S.keys)); } catch (er) { /* sem armazenamento */ }
      refreshKeys();
    }
    if (done) done();
  };
  document.addEventListener('keydown', h, true);
}
function refreshKeys() {
  if (UI) UI.b.forEach((el, i) => { const sm = el.querySelector('small'); if (sm) sm.textContent = keyLabel(S.keys[i]); el.title = tipOf(i); });
  document.querySelectorAll('#sk-keys button').forEach((b, i) => { b.textContent = keyLabel(S.keys[i]); });
}
/** Ajustes ▸ Jogo: uma linha com os 3 atalhos das habilidades (toque num botão e aperte a nova tecla) */
function buildKeyRow() {
  const hand = $('gx-hand');
  if (!hand || $('sk-keys')) return;
  const row = document.createElement('div');
  row.className = 'acr';
  row.innerHTML = '<span>Teclas das habilidades</span><span id="sk-keys" style="display:flex;gap:6px"></span>';
  hand.parentElement.after(row);
  [0, 1, 2].forEach(i => {
    const b = document.createElement('button');
    b.className = 'ahb'; b.type = 'button'; b.title = 'Escolher a tecla da habilidade ' + (i + 1);
    b.onclick = () => { b.textContent = '…'; captureKey(i, refreshKeys); };
    $('sk-keys').append(b);
  });
}

/** Personagem novo: a arma inicial já foi dada; personagem com classe e save antigo (Cutelo nv1, mochila vazia): recebe a da classe, uma vez */
export function markStart() { S.mig = 1; }
export function migrateStart() {
  if (!S.on || S.mig) return;
  S.mig = 1;
  const st = START[S.k], w0 = eq.wpn;
  if (!st || !w0 || w0.w !== 0 || w0.q !== 1 || bag.length || eq.gun || eq.off) return;
  const mk = n => { const w = WEAPONS.findIndex(x => x.n === n); return w < 0 ? null : { ty: 'wpn', q: 1, v: WEAPONS[w].b, il: 1, w, n }; };
  if (st.wpn) eq.wpn = mk(st.wpn);
  if (st.gun) eq.gun = mk(st.gun);
  if (st.off) eq.off = mk(st.off);
  if (st.arrows) P.arrows = Math.max(P.arrows, st.arrows);
  setWeapon(st.act || 'wpn');
  log('Você recebeu a arma da sua classe');
}

/** Auto-combate: usa as habilidades da classe, da mais forte para a mais fraca, quando a situação pede e há mana de sobra */
const AUTO = {   // [habilidade, distância mínima, máxima, inimigos próximos mínimos (chefe vale por 3)]
  guerreiro: [[0, 3, 10, 1], [2, 0, 6, 3], [1, 0, 7, 2]],
  cacador: [[2, 0, 14, 3], [0, 3, 16, 1], [1, 3, 9, 1]],
  mago: [[2, 0, 9, 3], [1, 0, 5, 2], [0, 3, 16, 1]],
  ladino: [[2, 0, 9, 2], [1, 3, 14, 1], [0, 2.5, 11, 1]],
};
export function autoSkill() {
  if (!S.on || P.dead || S.leap || S.tp || S.dance || rodBlocked()) return;   // com o Rod na mão não tenta habilidades do Cajado
  const t = P.tgt;
  if (!t || t.dead) return;
  const d = dist(t);
  const near = enemies.filter(e => !e.dead && !e.inv && dist(e) < 7).length + (t.t.boss ? 3 : 0);
  for (const [i, lo, hi, n] of AUTO[S.k]) {
    if (skillLock(i) || S.cds[i] > 0 || P.mp < costOf(i) + P.mmax * .1) continue;
    if (d < lo || d > hi || near < n) continue;
    if (useSkill(i)) return;
  }
}
