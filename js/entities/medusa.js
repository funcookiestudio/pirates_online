/* Medusa, chefe de 2 fases (modelo em medusa-model.js).
   Fase 1 · Medusa Encapuzada (humana): garras + Olhar Petrificante (olhos acendem; quem estiver olhando para ela ao fim vira pedra por um instante).
   Aos 50% de vida se transforma (invulnerável por ~2,4 s) na Fase 2 · Medusa Serpente: mais rápida e forte, garras alternando com o
   golpe de cauda em área (anel vermelho), cuspe de veneno em leque à distância e o olhar com recarga menor.
   Como escapar do olhar: ficar de costas para ela (andar para longe) ou rolar (Espaço) no momento em que os olhos brilham mais. */
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { turnTo } from '../core/utils.js';
import { P, hurtP } from './player.js';
import { puff } from '../systems/effects.js';
import { log, banner } from '../ui/notify.js';
import { groundY, walkable } from '../world/terrain.js';
import { takenMult } from '../data/scaling.js';

const GAZE_T = 1.6;            // aviso do olhar (s)
const XFORM_T = 2.4;           // duração da transformação (s)
const SPIT_T = .7;             // preparo do cuspe (s)
const STONE = [1.4, 1.8];      // tempo petrificado por fase (s)
const VENOM = [];              // projéteis de veneno ativos
const VGEO = new THREE.IcosahedronGeometry(.32, 0);
const VMAT = new THREE.MeshBasicMaterial({ color: 0x8cff3a });
const STONE_MAT = new THREE.MeshLambertMaterial({ color: 0x8c8a86 });
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Prepara a instância recém-criada (spawn): tipo próprio (o nome e a velocidade mudam na fase 2) e recargas */
export function initMedusa(e) {
  e.t = Object.assign({}, e.t);
  e.MS = { gcd: 4 + Math.random() * 2, scd: 3, xf: 0 };
  e.hb.position.y = 4.4 / e.g.scale.y;
  e.t.lblY = 4.7;
}

/** Fase 1 não morre: a vida para em 50% e ela se transforma (chamado pelo hit) */
export function medusaFloor(e) {
  if (e.MD.st.phase === 1 && e.hp < e.max * .5) e.hp = e.max * .5;
}

function startXform(e) {
  e.st = 'xform'; e.tm = XFORM_T; e.inv = 1; e.slam = false; e.MS.swapped = false;
  if (e.ring) { scene.remove(e.ring); e.ring = null; }
  log('🐍 A Medusa arranca o capuz... a maldição desperta!');
  banner('A Medusa revela sua forma de serpente!');
}

function endXform(e) {
  e.st = 'chase'; e.inv = 0; e.cd = .6; e.MS.gcd = 3.5; e.MS.scd = 1.5;
  e.t.n = 'Medusa Serpente'; e.t.s = 3.0; e.dmg = Math.round(e.dmg * 1.15);
  e.hb.position.y = 5.8 / e.g.scale.y; e.t.lblY = 6.1;
}

/** Recarrega a lista de materiais que piscam ao levar dano (o corpo da serpente é novo) */
function refreshMats(e) {
  const ms = new Set();
  e.g.traverse(m => { if (m.material && m.material.emissive && m.visible !== false) ms.add(m.material); });
  e.ms = [...ms].filter(m => m !== e.MD.bodies[0].P.eyeMat && (!e.MD.bodies[1] || m !== e.MD.bodies[1].P.eyeMat));
}

/** Vira pedra: troca os materiais do jogador por pedra até o tempo acabar */
let stoned = null;
function petrify(t) {
  P.stone = Math.max(P.stone || 0, t);
  P.tgt = null; P.tx = P.x; P.tz = P.z; P.vx = P.vz = 0;
  if (!stoned) {
    stoned = new Map();
    P.g.traverse(m => { if (m.isMesh && m.material) { stoned.set(m, m.material); m.material = STONE_MAT; } });
  }
  puff(P.x, 1.2, P.z, 0x9a9890, 6, 14);
  state.SHK = Math.max(state.SHK, .4);
}
function unpetrify() {
  if (!stoned) return;
  stoned.forEach((mt, m) => { m.material = mt; });
  stoned = null;
  puff(P.x, 1.2, P.z, 0xb0aca4, 5, 10);
}

/** Fim do olhar: olhando para ela (e sem rolar) → petrificado e ferido */
function resolveGaze(e, c) {
  const MD = e.MD, ph = MD.st.phase;
  e.st = 'rec'; e.tm = .4; e.cd = .5; e.slam = false;
  e.MS.gcd = ph === 1 ? 8 + Math.random() * 2 : 6.5 + Math.random() * 2;
  if (P.dead || c.d > 20) return;
  const to = Math.atan2(e.x - P.x, e.z - P.z), facing = Math.abs(ang(to - P.g.rotation.y)) < 1.25;
  if (P.roll > 0 || P.diveUnder) { log('Você rolou e escapou do olhar da Medusa!'); return; }
  if (!facing) { log('Você desviou o olhar a tempo!'); return; }
  petrify(STONE[ph - 1]);
  hurtP(e.dmg * .7 * takenMult(e.lv - P.lv), c.aim, 0);
  log('🗿 Você encarou a Medusa e virou pedra!');
}

/** Cospe 3 bolas de veneno em leque na direção do jogador */
function spit(e, c) {
  const h = groundY(e.x, e.z) + 4.4, dm = e.dmg * .55 * takenMult(e.lv - P.lv);
  for (const s of [-.22, 0, .22]) {
    const a = c.aim + s, m = new THREE.Mesh(VGEO, VMAT);
    m.position.set(e.x + Math.sin(a) * 1.2, h, e.z + Math.cos(a) * 1.2);
    scene.add(m);
    VENOM.push({ m, vx: Math.sin(a) * 12, vz: Math.cos(a) * 12, y0: h, t: 0, dm });
  }
  puff(e.x, h, e.z, 0x8cff3a, 4, 8);
}

/**
 * IA da Medusa: cuida da transformação e dos especiais; o resto (perseguir, garra, golpe de cauda) é a IA comum `base`.
 * Devolve a direção desejada [wx, wz], como think().
 */
export function medusaThink(e, dt, c, base) {
  const S = e.MS, MD = e.MD;
  S.gcd -= dt; S.scd -= dt;
  if (MD.st.phase === 1 && e.hp <= e.max * .5 && e.st !== 'xform') startXform(e);
  if (e.st === 'xform') {
    if (!S.swapped && e.tm <= XFORM_T * .5) {   // no meio da transformação: o corpo vira serpente
      S.swapped = true; MD.phase(2); refreshMats(e);
      puff(e.x, 1.5, e.z, 0x6fae4a, 12, 26); puff(e.x, 2.5, e.z, 0x39304a, 10, 18);
      state.SHK = Math.max(state.SHK, .8);
    }
    if (e.tm <= 0) endXform(e);
    return [0, 0];
  }
  if (e.st === 'gaze') { if (e.tm <= 0) resolveGaze(e, c); return [0, 0]; }
  if (e.st === 'spit') { if (e.tm <= 0) { spit(e, c); e.slam = false; e.st = 'rec'; e.tm = .5; e.cd = .4; S.scd = 3.5 + Math.random() * 1.5; } return [0, 0]; }
  if (e.st === 'chase' && e.ag && !P.dead) {
    if (S.gcd <= 0 && c.d < 15 && !(P.stone > 0)) {
      e.st = 'gaze'; e.tm = GAZE_T;
      log('👁 Os olhos da Medusa brilham: vire de costas ou role!');
      return [0, 0];
    }
    if (MD.st.phase === 2 && S.scd <= 0 && c.d > 5.5 && c.d < 18) { e.st = 'spit'; e.tm = SPIT_T; return [0, 0]; }
  }
  return base(e, dt, c);
}

/** Pose e animação por quadro (substitui a animação de humanoide) */
export function animateMedusa(e, c, dt) {
  const { aim, dur } = c, MD = e.MD, st = e.st;
  if (st === 'wind' || st === 'gaze' || st === 'spit' || (e.ag && !P.dead && st === 'chase')) turnTo(e.g, aim, st === 'wind' ? 5 : 9, dt);
  else if (st === 'chase' && Math.hypot(e.vx, e.vz) > .3) turnTo(e.g, Math.atan2(e.vx, e.vz), 6, dt);
  e.g.rotation.x = 0;
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  const sp = Math.hypot(e.vx, e.vz), sc = e.g.scale.x;
  const I = { mv: Math.min(1, sp / (MD.st.phase === 1 ? 1.7 : 1.5)), dist: sp * dt / sc, rage: e.ag ? .3 : 0, arm: null, lean: 0, glow: 0 };
  if (st === 'wind') {
    const u = 1 - Math.max(0, e.tm) / dur;
    if (e.slam) { I.rage = 1; I.lean = -.12 * u; }            // golpe de cauda: se ergue e agita as cobras
    else { I.arm = -.4 - u * 2.2; I.lean = -.15 * u; }         // garras erguidas
  } else if (st === 'rec') { I.arm = e.slam ? null : .2; I.lean = e.slam ? .1 : .25; I.fast = true; if (!e.slam) I.strike = 1; }   // cobras dos punhos dão o bote
  else if (st === 'stag') { I.arm = .5; I.lean = -.2; }
  else if (st === 'gaze') { I.glow = Math.min(1, (1 - e.tm / GAZE_T) * 1.3); I.rage = 1; I.lean = -.1; }
  else if (st === 'spit') { I.rage = 1; I.lean = -.18 * (1 - e.tm / SPIT_T); }
  else if (st === 'xform') {
    const u = 1 - e.tm / XFORM_T;
    I.rage = 1;
    if (MD.st.phase === 2) I.rise = Math.min(1, (u - .5) * 2.4);
    else { I.lean = .25 * u; e.g.rotation.x = Math.sin(u * 60) * .02; }   // tremendo antes de rasgar o capuz
  }
  MD.update(dt, I);
}

/** Projéteis de veneno e fim da pedra (chamado a cada quadro, haja Medusa ou não) */
export function updateMedusaFx(dt) {
  if (P.stone > 0) {
    P.stone -= dt;
    if (P.stone <= 0 || P.dead) { P.stone = 0; unpetrify(); }
  } else if (stoned) unpetrify();
  for (let i = VENOM.length - 1; i >= 0; i--) {
    const v = VENOM[i], m = v.m;
    v.t += dt;
    m.position.x += v.vx * dt; m.position.z += v.vz * dt;
    const gy = groundY(m.position.x, m.position.z);
    m.position.y = Math.max(gy + .9, v.y0 - (v.y0 - gy - 1.1) * Math.min(1, v.t * 2.2));   // desce até a altura do peito
    m.rotation.x += dt * 8; m.rotation.y += dt * 6;
    let gone = v.t > 2.2 || !walkable(m.position.x, m.position.z);
    if (!gone && !P.dead && Math.hypot(m.position.x - P.x, m.position.z - P.z) < .95) {
      hurtP(v.dm, Math.atan2(v.vx, v.vz), 3);
      if (P.roll <= 0) log('🟢 Veneno da Medusa!');
      gone = true;
    }
    if (gone) { puff(m.position.x, m.position.y, m.position.z, 0x8cff3a, 3, 5); scene.remove(m); VENOM.splice(i, 1); }
  }
}
