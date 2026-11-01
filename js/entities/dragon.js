/* Dragões e wivernos da Ilha dos Dragões (modelos em dragon-model.js; tipos DRAGAO / WIVERNO / ANCIAO em data/enemies.js).
   · Wiverno: ágil. Ao ver o jogador de longe ele paira batendo as asas e mergulha de lado a lado ("rasante"), depois golpeia de perto.
   · Dragão: mordida/pancada de perto e Sopro de Fogo à distância: o cone vermelho no chão avisa, trava a direção e queima quem ficar dentro (role com Espaço ou saia de lado).
   · Dragão Ancestral (chefe): sopro mais largo e longo, alterna golpe normal e pancada em área (IA comum) e fica mais furioso abaixo de 50% de vida.
   O resto (perseguir, golpe, patrulha) é a IA comum de enemies.js: dragonThink só cuida dos especiais e chama `base` para o resto. */
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { turnTo } from '../core/utils.js';
import { P, hurtP } from './player.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';
import { groundY } from '../world/terrain.js';
import { takenMult } from '../data/scaling.js';

const FIRE_PREP = .9;            // aviso do sopro (s)
const FIRE_T = 1.7;              // duração do sopro (s)
const SWOOP_PREP = .6, SWOOP_T = 1.05;   // rasante do wiverno: preparo + total (s)
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Setor de chão (frente = +z) para o aviso do sopro */
function sectorGeo(r, half, n = 16) {
  const pos = [0, 0, 0];
  for (let i = 0; i <= n; i++) { const a = -half + 2 * half * i / n; pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); }
  const idx = [];
  for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
const CONE_MAT = new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide });

/** Prepara a instância recém-criada (spawn): tipo próprio (o nome e a velocidade mudam no chefe furioso) e recargas */
export function initDragon(e) {
  e.t = Object.assign({}, e.t);
  e.DS = { fcd: 2.5 + Math.random() * 3, scd: 2 + Math.random() * 3, dir: 0, tick: 0, rage: false, did: false };
}

function dropCone(e) { if (e.DS && e.DS.cone) { scene.remove(e.DS.cone); e.DS.cone.geometry.dispose(); e.DS.cone = null; } }
function showCone(e) {
  const S = e.DS;
  if (!S.cone) { S.cone = new THREE.Mesh(sectorGeo(e.t.fire[0], e.t.fire[1]), CONE_MAT); scene.add(S.cone); }
  S.cone.position.set(e.x, groundY(e.x, e.z) + .15, e.z); S.cone.rotation.y = S.dir;
}

/** Fim da vida / do estado: tira o aviso do chão (chamado pelo animateDeath e quando o sopro termina) */
export function dragonClear(e) { dropCone(e); }

/** IA especial; devolve a direção desejada [wx, wz], como think() */
export function dragonThink(e, dt, c, base) {
  const S = e.DS, T = e.t;
  c.reach = T.reach || c.reach; c.dur = T.dur || c.dur;
  S.fcd -= dt; S.scd -= dt;
  if (e.st !== 'fire' && S.cone) dropCone(e);   // cambaleou/atordoou no meio do sopro: some o aviso

  // boss furioso abaixo de 50%
  if (T.boss && !S.rage && e.hp < e.max * .5) {
    S.rage = true; T.s *= 1.18; e.dmg = Math.round(e.dmg * 1.12); T.n = 'Dragão Ancestral Enfurecido';
    log('🔥 O Dragão Ancestral ruge, enfurecido!'); state.SHK = Math.max(state.SHK, .6);
    puff(e.x, 2.5, e.z, 0xff7a22, 12, 24);
  }

  if (e.st === 'fire') {
    const el = FIRE_PREP + FIRE_T - e.tm;                       // tempo desde o começo do estado
    const turn = el < FIRE_PREP ? 6 : (S.rage ? 1.3 : .9);       // gira rápido enquanto mira; depois só acompanha devagar
    const da = ang(c.aim - S.dir); S.dir += Math.sign(da) * Math.min(Math.abs(da), turn * dt);
    showCone(e);
    if (el >= FIRE_PREP) {
      S.tick -= dt;
      if (S.tick <= 0) {
        S.tick = .18;
        const hh = groundY(e.x, e.z) + .9;
        for (const r of [3, 5.5, T.fire[0] * .85]) puff(e.x + Math.sin(S.dir) * r, hh, e.z + Math.cos(S.dir) * r, Math.random() < .5 ? 0xff6a1a : 0xffc040, 2, 9);
        if (!P.dead) {
          const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
          if (d < T.fire[0] && d > .8 && Math.abs(ang(Math.atan2(dx, dz) - S.dir)) < T.fire[1]) {
            hurtP(e.dmg * .3 * takenMult(e.lv - P.lv), c.aim, 1);
            if (P.roll <= 0 && !S.did) { S.did = true; log('🔥 Sopro de fogo!'); }
          }
        }
      }
    }
    if (e.tm <= 0) { dropCone(e); e.st = 'rec'; e.tm = .7; e.cd = 1; S.fcd = (T.boss ? 4 : 6.5) + Math.random() * 3 - (S.rage ? 1.5 : 0); S.did = false; }
    return [0, 0];
  }
  if (e.st === 'swoop') {
    const el = SWOOP_T - e.tm;
    if (el < SWOOP_PREP) {   // paira batendo asas e encara o jogador
      S.dir = c.aim;
    } else {
      if (!S.dashed) {        // mergulha
        S.dashed = true; S.hit = false;
        e.kx += Math.sin(S.dir) * 36; e.kz += Math.cos(S.dir) * 36;
        puff(e.x, 1, e.z, 0xcfc8b0, 5, 10);
      }
      if (!S.hit && !P.dead && Math.hypot(P.x - e.x, P.z - e.z) < 2.3) { S.hit = true; hurtP(e.dmg * 1.05 * takenMult(e.lv - P.lv), c.aim, 5); }
    }
    if (e.tm <= 0) { e.st = 'rec'; e.tm = .6; e.cd = 1.1; S.dashed = false; S.scd = 4.5 + Math.random() * 2.5; }
    return [0, 0];
  }
  if (e.st === 'chase' && e.ag && !P.dead) {
    if (T.fire && S.fcd <= 0 && c.d > 4 && c.d < T.fire[0] * .9 && !e.sn) {
      e.st = 'fire'; e.tm = FIRE_PREP + FIRE_T; S.dir = c.aim; S.tick = 0; S.did = false;
      log(T.boss ? '🔥 O Dragão Ancestral inspira fundo... saia do cone ou role!' : '🔥 O dragão inspira fundo... saia do cone!');
      return [0, 0];
    }
    if (T.dragon === 'wyvern' && S.scd <= 0 && c.d > 4.5 && c.d < 13 && !e.sn) {
      e.st = 'swoop'; e.tm = SWOOP_T; S.dir = c.aim; S.dashed = false;
      return [0, 0];
    }
  }
  return base(e, dt, c);
}

/** Pose e animação por quadro (substitui a de humanoide) */
export function animateDragon(e, c, dt) {
  const { aim, dur } = c, st = e.st, S = e.DS, T = e.t, wy = T.dragon === 'wyvern';
  if (st === 'fire' || st === 'swoop') turnTo(e.g, S.dir, st === 'fire' ? 8 : 12, dt);
  else if (st === 'wind' || (e.ag && !P.dead && st === 'chase')) turnTo(e.g, aim, st === 'wind' ? 5 : 8, dt);
  else if (st === 'chase' && Math.hypot(e.vx, e.vz) > .3) turnTo(e.g, Math.atan2(e.vx, e.vz), 5, dt);
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  const sp = Math.hypot(e.vx, e.vz), I = { mv: Math.min(1, sp / (T.s * .8)), look: 0 };
  if (st === 'wind') {
    const u = 1 - Math.max(0, e.tm) / dur;
    I.rear = u; I.lean = -.12 * u; if (wy) I.fl = .35 * u;       // empina e ergue a cabeça: vai bater
  } else if (st === 'rec') { I.bite = 1; I.lean = .12; I.rear = -.3; }
  else if (st === 'stag') { I.lean = -.12; I.rear = .4; }
  else if (st === 'fire') {
    const el = FIRE_PREP + FIRE_T - e.tm;
    I.fr = el < FIRE_PREP ? .4 * (el / FIRE_PREP) : 1; I.rear = el < FIRE_PREP ? el / FIRE_PREP * .5 : .3; I.mv = 0;
  } else if (st === 'swoop') {
    const el = SWOOP_T - e.tm;
    if (el < SWOOP_PREP) { I.fl = 1; I.mv = 0; I.lean = -.1; } else { I.gd = 1; I.fl = 0; I.mv = 0; I.bite = 1; I.lean = .15; }
  }
  if (e.ag && !P.dead && st === 'chase' && wy && c.d > 6 && c.d < 14) I.fl = .5;   // paira ao se aproximar
  if (e.DR) e.DR.update(dt, I);
}
