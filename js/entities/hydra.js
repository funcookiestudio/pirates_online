/* Hidra e Crias da Hidra da Ilha da Hidra (modelo em hydra-model.js; tipos HIDRA / HIDRINHA em data/enemies.js).
   · Cria da Hidra: 3 cabeças; morde rápido, as cabeças dão o bote uma de cada vez.
   · Hidra (chefe): 7 cabeças. Alterna golpe normal e pancada em área (IA comum de enemies.js) e, de longe, cospe o Jato Venenoso:
     o cone verde no chão avisa, trava a direção e queima quem ficar dentro (role com Espaço ou saia de lado); o veneno deixa o alvo lento.
     Abaixo de 50% de vida ela se enfurece: regenera 8% da vida, brotam mais 2 cabeças, anda mais rápido e cospe com mais frequência.
   hydraThink cuida só dos especiais e chama `base` (a IA comum) para o resto. */
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { turnTo } from '../core/utils.js';
import { P, hurtP } from './player.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';
import { groundY } from '../world/terrain.js';
import { takenMult } from '../data/scaling.js';

const SPIT_PREP = .95, SPIT_T = 1.9;
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
function sectorGeo(r, half, n = 16) {
  const pos = [0, 0, 0];
  for (let i = 0; i <= n; i++) { const a = -half + 2 * half * i / n; pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); }
  const idx = [];
  for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
const CONE_MAT = new THREE.MeshBasicMaterial({ color: 0x8aff30, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide });

/** Prepara a instância recém-criada (spawn) */
export function initHydra(e) {
  e.t = Object.assign({}, e.t);
  e.HM = e.g.userData.HM;
  e.HY = { scd: 3 + Math.random() * 3, dir: 0, tick: 0, rage: false, did: false };
}
function dropCone(e) { if (e.HY && e.HY.cone) { scene.remove(e.HY.cone); e.HY.cone.geometry.dispose(); e.HY.cone = null; } }
function showCone(e) {
  const S = e.HY;
  if (!S.cone) { S.cone = new THREE.Mesh(sectorGeo(e.t.fire[0], e.t.fire[1]), CONE_MAT); scene.add(S.cone); }
  S.cone.position.set(e.x, groundY(e.x, e.z) + .15, e.z); S.cone.rotation.y = S.dir;
}
export function hydraClear(e) { dropCone(e); }

export function hydraThink(e, dt, c, base) {
  const S = e.HY, T = e.t;
  c.reach = T.reach || c.reach; c.dur = T.dur || c.dur;
  S.scd -= dt;
  if (e.st !== 'spit' && S.cone) dropCone(e);

  if (T.boss && !S.rage && e.hp < e.max * .5) {   // enfurece: brotam 2 cabeças
    S.rage = true; T.s *= 1.15; e.dmg = Math.round(e.dmg * 1.12); T.n = 'Hidra Enfurecida';
    e.hp = Math.min(e.max, e.hp + e.max * .08); if (e.HM) e.HM.grow();
    log('🐍 A Hidra ruge e duas novas cabeças brotam!'); state.SHK = Math.max(state.SHK, .6);
    puff(e.x, 3, e.z, 0x8aff30, 12, 24);
  }
  if (e.st === 'spit') {
    const el = SPIT_PREP + SPIT_T - e.tm;
    const turn = el < SPIT_PREP ? 6 : (S.rage ? 1.4 : 1);
    const da = ang(c.aim - S.dir); S.dir += Math.sign(da) * Math.min(Math.abs(da), turn * dt);
    showCone(e);
    if (el >= SPIT_PREP) {
      S.tick -= dt;
      if (S.tick <= 0) {
        S.tick = .18;
        const hh = groundY(e.x, e.z) + 1.4;
        for (const r of [3, 6, T.fire[0] * .85]) puff(e.x + Math.sin(S.dir) * r, hh, e.z + Math.cos(S.dir) * r, Math.random() < .5 ? 0x8aff30 : 0x4a8a20, 2, 9);
        if (!P.dead) {
          const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
          if (d < T.fire[0] && d > .8 && Math.abs(ang(Math.atan2(dx, dz) - S.dir)) < T.fire[1]) {
            hurtP(e.dmg * .28 * takenMult(e.lv - P.lv), c.aim, 1); P.slow = Math.max(P.slow || 0, 2.5);
            if (P.roll <= 0 && !S.did) { S.did = true; log('☠ Jato venenoso!'); }
          }
        }
      }
    }
    if (e.tm <= 0) { dropCone(e); e.st = 'rec'; e.tm = .7; e.cd = 1; S.scd = (S.rage ? 4 : 6.5) + Math.random() * 3; S.did = false; }
    return [0, 0];
  }
  if (e.st === 'chase' && e.ag && !P.dead && T.fire && S.scd <= 0 && c.d > 4.5 && c.d < T.fire[0] * .9 && !e.sn) {
    e.st = 'spit'; e.tm = SPIT_PREP + SPIT_T; S.dir = c.aim; S.tick = 0; S.did = false;
    log('☠ A Hidra enche as cabeças de veneno... saia do cone ou role!');
    return [0, 0];
  }
  return base(e, dt, c);
}

/** Pose e animação por quadro */
export function animateHydra(e, c, dt) {
  const { aim, dur } = c, st = e.st, S = e.HY, T = e.t;
  if (st === 'spit') turnTo(e.g, S.dir, 8, dt);
  else if (st === 'wind' || (e.ag && !P.dead && st === 'chase')) turnTo(e.g, aim, st === 'wind' ? 5 : 7, dt);
  else if (st === 'chase' && Math.hypot(e.vx, e.vz) > .3) turnTo(e.g, Math.atan2(e.vx, e.vz), 5, dt);
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  const sp = Math.hypot(e.vx, e.vz), I = { mv: Math.min(1, sp / (T.s * .8)), look: 0 };
  if (st === 'wind') I.atk = .4 + .6 * (1 - Math.max(0, e.tm) / dur);
  else if (st === 'rec') I.atk = 1;
  else if (st === 'spit') { const el = SPIT_PREP + SPIT_T - e.tm; I.roar = el < SPIT_PREP ? el / SPIT_PREP * .6 : 1; I.mv = 0; }
  else if (st === 'stag') I.roar = .5;
  else if (e.ag && !P.dead && c.d < 8) I.atk = .25;
  if (e.HM) e.HM.update(dt, I);
}
