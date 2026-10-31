/* Montaria: o cavalo comprado na Fazenda do Gado.
   H = chamar o cavalo / montar / desmontar. Montado o jogador corre ~2× mais rápido; o cavalo acompanha o jogador e
   as pernas dele acompanham a velocidade (trote → galope). Desmonta sozinho na água, na vila, em dungeons e ao morrer. */
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { mkHorse } from '../entities/horse.js';
import { groundY, slideTo, walkable } from '../world/terrain.js';
import { freePoint } from './steer.js';
import { dIn } from '../dungeon/dgrid.js';
import { VILLAGE_R } from '../core/village-const.js';
import { ik } from '../entities/player-weapon.js';
import { puff } from './effects.js';
import { standUp, sitDown } from './rest.js';
import { log } from '../ui/notify.js';
import { $ } from '../core/utils.js';
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';

export const COATS = [
  { n: 'Castanho', cost: 120, mult: 2.05, br: 1, c: 0x8a4a22, mz: 0xb87a4a },
  { n: 'Negro', cost: 240, mult: 2.2, br: .8, c: 0x2a2a30, mz: 0x4a4a52 },
  { n: 'Branco', cost: 380, mult: 2.35, br: .6, c: 0xe8e4dc, mz: 0xc8c0b0 },
];
export const MOUNT = {
  owned: false, coat: 0, on: false, t: 0,          // t = progresso de subir (0 no chão … 1 na sela)
  mult: 2.05, en: 1, tired: false,        // en = fôlego do cavalo (0‥1); cansado só trota
                              // velocidade montado ÷ a pé
  st: 'park',                             // park (parado) · come (vindo até o jogador)
  want: false,                            // chamou o cavalo para montar ao chegar
  x: 0, z: 0, yaw: 0, ph: 0, sp: 0, root: null, g: null, stuck: 0, idle: 0,
};
export const LIFT = .92;                  // altura do quadril do jogador acima do chão, na sela
const SCALE = .9, MOUNT_TIME = .95, DIS_TIME = .8, SIDE = 1.25;   // SIDE = distância lateral (lado esquerdo do cavalo) de onde se sobe/desce
const sat = x => Math.min(1, Math.max(0, x));
const ss = x => x * x * (3 - 2 * x);

function ensureHorse() {
  if (MOUNT.root) return;
  const g = mkHorse(MOUNT.coat, 0), root = new THREE.Group();
  g.scale.setScalar(SCALE);
  // sela
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(.6, .1, .62), new THREE.MeshLambertMaterial({ color: 0x5a2a18 }));
  saddle.position.set(0, .5, .02); g.HB.add(saddle);   // sela no dorso (acompanha o balanço do corpo)
  root.add(g);
  scene.add(root);
  MOUNT.root = root; MOUNT.g = g;
}

/** Posiciona o cavalo (parado) perto de (x,z) num ponto livre */
function park(x, z, yaw) {
  ensureHorse();
  const f = freePoint(x, z, .9);
  MOUNT.x = f.x; MOUNT.z = f.z; MOUNT.yaw = yaw || 0; MOUNT.st = 'park'; MOUNT.want = false;
  MOUNT.root.visible = true;
  place();
}
function place() {
  const r = MOUNT.root;
  r.position.set(MOUNT.x, groundY(MOUNT.x, MOUNT.z), MOUNT.z);
  r.rotation.y = MOUNT.yaw;
}

/** Cavalo recém-comprado: aparece ao lado do jogador */
export function giveHorse(coat = 0) {
  const had = MOUNT.owned;
  MOUNT.owned = true; MOUNT.coat = coat; MOUNT.en = 1; MOUNT.tired = false;
  if (MOUNT.root) { scene.remove(MOUNT.root); MOUNT.root = null; }
  if (MOUNT.on) dismount();
  if (had) { park(MOUNT.x, MOUNT.z, MOUNT.yaw); refreshMountButton(); return; }
  park(P.x + 2.2, P.z + 1.2, P.g.rotation.y);
  refreshMountButton();
}

/** Ao carregar o jogo / chegar numa ilha: o cavalo espera do lado de fora do portão leste da vila */
export function initMount(owned, coat = 0) {
  MOUNT.owned = !!owned; MOUNT.coat = coat | 0;
  if (MOUNT.owned) park(VILLAGE_R + 5, 4, Math.PI / 2);
  refreshMountButton();
}

/** Ração: enche o fôlego e dá um ritmo de recuperação maior por alguns segundos */
export function feedHorse() { MOUNT.en = 1; MOUNT.tired = false; MOUNT.feed = 20; }

export function refreshMountButton() {
  const b = $('sm');
  if (!b) return;
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  if (!b.querySelector('i')) b.insertAdjacentHTML('beforeend', '<i style="position:absolute;left:3px;right:3px;bottom:3px;height:4px;border-radius:2px;background:rgba(0,0,0,.5);overflow:hidden"><b style="display:block;height:100%;width:100%;background:#7ad84a"></b></i>');
  b.style.display = '';   // o espaço do cavalo é fixo: sem cavalo o botão fica apagado
  b.classList.toggle('none', !MOUNT.owned);
  b.classList.toggle('on', MOUNT.on);
  // ícone de estado (como no companheiro): ● verde = cavalo ativo (montado, chamado ou parado fora da vila) · botão apagado = no estábulo
  if (!b.querySelector('u')) b.insertAdjacentHTML('beforeend', '<u style="position:absolute;right:3px;top:3px;width:9px;height:9px;border-radius:50%;border:1px solid #1c1208;text-decoration:none"></u>');
  const act = MOUNT.on || !!(MOUNT.root && MOUNT.root.visible);
  b.querySelector('u').style.background = MOUNT.on ? '#7ad84a' : act ? '#e0c050' : '#666';
  b.title = 'Montaria (H; segurar o botão ou Shift+H dispensa o cavalo): ' + (MOUNT.on ? 'montado — desmontar' : act ? 'cavalo ativo — ir montar' : 'chamar o cavalo');
  b.style.opacity = !MOUNT.owned ? '.3' : act ? '1' : '.6';
  b.style.filter = MOUNT.owned ? '' : 'grayscale(1)';
  b.style.pointerEvents = MOUNT.owned ? '' : 'none';
  if (!MOUNT.owned) b.title = 'Montaria: ainda sem cavalo';
}

/** Montado em terra firme, fora da vila e das dungeons */
const canRide = () => !P.dead && !P.swimming && !dIn(P.x, P.z) && Math.hypot(P.x, P.z) > VILLAGE_R + 1 && !P.sit && !P.sitT && P.roll <= 0;

/** Desmontar com animação: o cavalo para, o jogador passa a perna e desce pelo lado esquerdo */
export function startDismount() {
  MOUNT.dis = true; MOUNT.x = P.x; MOUNT.z = P.z; MOUNT.yaw = P.g.rotation.y;
  P.vx = P.vz = 0;
}
function finishDismount() {
  MOUNT.dis = false;
  const c = Math.cos(MOUNT.yaw), s = Math.sin(MOUNT.yaw);
  let px = MOUNT.x + c * SIDE, pz = MOUNT.z - s * SIDE;
  if (!walkable(px, pz)) { px = MOUNT.x - c * SIDE; pz = MOUNT.z + s * SIDE; }
  if (!walkable(px, pz)) { px = MOUNT.x; pz = MOUNT.z; }
  P.x = P.tx = px; P.z = P.tz = pz;
  MOUNT.on = false; P.mounted = false; MOUNT.t = 0; MOUNT.st = 'park';
  P.g.rotation.x = 0; P.g.rotation.y = MOUNT.yaw;
  [P.g.legL, P.g.legR].forEach(l => { l.rotation.set(0, 0, 0); l.knee.rotation.x = 0; });
  place(); refreshMountButton();
  if (MOUNT.sitAfter) { MOUNT.sitAfter = false; sitDown(); }
}
/** Posição/giro do jogador na animação: do lado do cavalo (u=0) até a sela (u=1) */
function lockPlayer(u) {
  const th = MOUNT.yaw, lat = SIDE * (1 - ss(sat((u - .42) / .45)));   // só se desloca depois de subir acima do dorso
  let px = MOUNT.x + Math.cos(th) * lat, pz = MOUNT.z - Math.sin(th) * lat;
  if (!MOUNT.dis && MOUNT.sx != null && u < .18) { const w = ss(u / .18); px = MOUNT.sx + (px - MOUNT.sx) * w; pz = MOUNT.sz + (pz - MOUNT.sz) * w; }   // aproxima-se do flanco
  P.x = P.tx = px; P.z = P.tz = pz;
  P.vx = P.vz = 0; P.walk = 0;
  P.g.rotation.y = th - Math.PI / 2 * (1 - ss(sat((u - .4) / .5)));
}

export function dismount(msg) {
  MOUNT.dis = false;
  if (!MOUNT.on) return;
  MOUNT.on = false; P.mounted = false; MOUNT.t = 0;
  const a = P.g.rotation.y + 1.2;
  MOUNT.x = P.x + Math.sin(a) * 1.7; MOUNT.z = P.z + Math.cos(a) * 1.7;
  if (!walkable(MOUNT.x, MOUNT.z)) { MOUNT.x = P.x; MOUNT.z = P.z; }
  MOUNT.yaw = P.g.rotation.y; MOUNT.st = 'park';
  P.g.rotation.x = 0;
  place();
  refreshMountButton();
  if (msg) log(msg);
}

function mountUp() {
  if (!canRide()) { log('Não dá para montar aqui'); return; }
  MOUNT.on = true; P.mounted = true; MOUNT.t = 0; MOUNT.st = 'park'; MOUNT.want = false; MOUNT.dis = false; MOUNT.sx = P.x; MOUNT.sz = P.z;
  if (Math.hypot(MOUNT.x - P.x, MOUNT.z - P.z) > 6) { MOUNT.x = P.x; MOUNT.z = P.z; }   // (cavalo muito longe: sobe no lugar)
  P.tgt = null; P.tx = P.x; P.tz = P.z;
  puff(P.x, 1, P.z, 0xd8c8a0, 3, 3);
  refreshMountButton();
}

/** Dispensa o cavalo: desmonta (se montado) e ele volta ao estábulo; para chamá-lo de novo, é só usar o botão/H */
export function dismissHorse() {
  if (!MOUNT.owned || !MOUNT.root) return;
  if (MOUNT.on) { if (Math.hypot(P.x, P.z) <= VILLAGE_R + 1) return; dismount(); }
  MOUNT.want = false; MOUNT.pending = false; MOUNT.st = 'park'; MOUNT.dismissed = true;   // o auto play não chama o cavalo até o jogador chamar
  if (!MOUNT.root.visible) return;
  puff(MOUNT.x, 1, MOUNT.z, 0xd8c8a0, 3, 3);
  MOUNT.root.visible = false; refreshMountButton();
  log('Você dispensou o cavalo: ele voltou ao estábulo');
}

/** Tecla H: desmonta · monta (se o cavalo está perto) · ou chama o cavalo */
export function toggleMount(auto) {
  if (!MOUNT.owned || P.dead) return;
  if (auto !== true) MOUNT.dismissed = false;   // o jogador chamou o cavalo de novo: o auto volta a poder usá-lo
  if (!MOUNT.on && (P.sit > 0 || P.sitT)) { standUp(); MOUNT.pending = true; return; }   // levanta primeiro, depois chama/monta
  if (MOUNT.on) { if (Math.hypot(P.x, P.z) <= VILLAGE_R + 1 || MOUNT.dis || MOUNT.t < 1) return; P.tgt = null; startDismount(); return; }
  if (!canRide()) { log('Chame o cavalo fora da vila, em terra firme'); return; }
  MOUNT.root.visible = true; refreshMountButton();
  const d = Math.hypot(MOUNT.x - P.x, MOUNT.z - P.z);
  if (d < 3.4) { mountUp(); return; }
  MOUNT.want = true; MOUNT.walkT = 25; MOUNT.stuck = 0;
  if (d > 14) { MOUNT.st = 'come'; log('Assobiou: o cavalo está a caminho'); }   // longe: ele vem até perto; o jogador anda o resto
  else log('Indo até o cavalo');
}

/** Multiplicador de velocidade atual (cansado: só um trote um pouco mais rápido que a pé) */
export const mountMult = () => MOUNT.tired ? 1.3 : COATS[MOUNT.coat].mult;

function updateBreath(dt) {
  const sp = Math.hypot(P.vx, P.vz);
  if (MOUNT.on) MOUNT.en += (sp > 3.5 ? -.085 * COATS[MOUNT.coat].br : sp > .3 ? -.01 : .06) * dt;
  else MOUNT.en += .12 * dt;
  if (MOUNT.feed > 0) { MOUNT.feed -= dt; MOUNT.en += .15 * dt; }
  MOUNT.en = Math.max(0, Math.min(1, MOUNT.en));
  if (MOUNT.en <= 0 && !MOUNT.tired) { MOUNT.tired = true; if (MOUNT.on) log('O cavalo está cansado: ande um pouco para ele recuperar o fôlego'); }
  else if (MOUNT.tired && MOUNT.en > .35) MOUNT.tired = false;
  const b = $('sm') && $('sm').querySelector('b');
  if (b) {   // só escreve quando muda (1%): reescrever todo quadro força o navegador a repintar a barra
    const w = Math.round(MOUNT.en * 100) + '%', bg = MOUNT.tired ? '#d8503a' : MOUNT.en < .3 ? '#e0b030' : '#7ad84a';
    if (MOUNT.bw !== w) { MOUNT.bw = w; b.style.width = w; }
    if (MOUNT.bc !== bg) { MOUNT.bc = bg; b.style.background = bg; }
  }
}

/** Todo frame (antes do movimento do jogador) */
export function updateMount(dt) {
  if (!MOUNT.owned || !MOUNT.root) return;
  updateBreath(dt);
  { const k = (MOUNT.on ? 2 : MOUNT.root.visible ? 1 : 0); if (k !== MOUNT.iconK) { MOUNT.iconK = k; refreshMountButton(); } }
  if (MOUNT.pending && P.sit === 0 && !P.sitT) { MOUNT.pending = false; toggleMount(); }
  if (MOUNT.on) {
    if (P.dead) { dismount(); return; }
    if (P.swimming) { dismount('O cavalo não nada: você desmontou'); return; }
    if (dIn(P.x, P.z)) { dismount(); return; }
    if (Math.hypot(P.x, P.z) <= VILLAGE_R + .5) { dismount('Cavalos ficam do lado de fora da vila'); return; }
    const r = MOUNT.root;
    if (MOUNT.dis || MOUNT.t < 1) {   // animação de subir / descer: o cavalo fica parado, o jogador é conduzido
      if (MOUNT.dis) MOUNT.t = Math.max(0, MOUNT.t - dt / DIS_TIME); else MOUNT.t = Math.min(1, MOUNT.t + dt / MOUNT_TIME);
      if (!MOUNT.dis && MOUNT.t === 1) { MOUNT.x = P.x; MOUNT.z = P.z; }
      if (MOUNT.dis && MOUNT.t === 0) { finishDismount(); return; }
      lockPlayer(MOUNT.t);
      r.position.set(MOUNT.x, groundY(MOUNT.x, MOUNT.z), MOUNT.z); r.rotation.y = MOUNT.yaw; r.visible = true;
      animateHorseLegs(dt, 0);
      return;
    }
    // o cavalo vai por baixo do jogador
    const sp = Math.hypot(P.vx, P.vz);
    r.position.set(P.x, groundY(P.x, P.z), P.z);
    r.rotation.y = P.g.rotation.y;
    r.visible = true;
    animateHorseLegs(dt, sp);
    return;
  }
  // dungeon: o cavalo some e volta ao lado do jogador quando ele sai
  if (dIn(P.x, P.z)) { if (!MOUNT.inDg) { MOUNT.inDg = true; MOUNT.hid = MOUNT.root.visible; MOUNT.want = false; MOUNT.st = 'park'; } MOUNT.root.visible = false; return; }
  if (MOUNT.inDg) {
    MOUNT.inDg = false;
    if (MOUNT.hid) {
      const f = freePoint(P.x + Math.sin(P.g.rotation.y + 2.4) * 3.5, P.z + Math.cos(P.g.rotation.y + 2.4) * 3.5, .9);
      MOUNT.x = f.x; MOUNT.z = f.z; MOUNT.yaw = P.g.rotation.y; MOUNT.root.visible = true; MOUNT.st = 'park';
      puff(f.x, 1, f.z, 0xd8c8a0, 3, 3); place();
    }
  }
  // combate: o cavalo parado se afasta do jogador (não fica no meio da luta)
  if (MOUNT.root.visible && !MOUNT.want && MOUNT.st !== 'come') {
    const fight = enemies.some(e => !e.dead && (e.ag || Math.hypot(e.x - P.x, e.z - P.z) < 10) && Math.hypot(e.x - P.x, e.z - P.z) < 14);
    const dp = Math.hypot(MOUNT.x - P.x, MOUNT.z - P.z);
    if (fight && dp < 20) MOUNT.st = 'flee'; else if (MOUNT.st === 'flee' && (!fight || dp >= 20)) MOUNT.st = 'park';
    if (MOUNT.st === 'flee') {
      const ax = (MOUNT.x - P.x) / (dp || 1), az = (MOUNT.z - P.z) / (dp || 1), v = 6.5 * dt;
      const [rx, rz] = slideTo(MOUNT.x, MOUNT.z, MOUNT.x + ax * v, MOUNT.z + az * v, false);
      const moved = Math.hypot(rx - MOUNT.x, rz - MOUNT.z);
      MOUNT.x = rx; MOUNT.z = rz; MOUNT.yaw = Math.atan2(ax, az);
      place(); animateHorseLegs(dt, moved / Math.max(dt, 1e-3));
      return;
    }
  }
  // fora da sela: vindo até o jogador, ou parado
  if (MOUNT.st === 'come') {
    const dx = P.x - MOUNT.x, dz = P.z - MOUNT.z, d = Math.hypot(dx, dz);
    if (d < (MOUNT.want ? 5 : 2.4)) {
      MOUNT.st = 'park';
    } else {
      const v = Math.min(9.5, 3 + d * .8) * dt, nx = MOUNT.x + dx / d * v, nz = MOUNT.z + dz / d * v;
      const [rx, rz] = slideTo(MOUNT.x, MOUNT.z, nx, nz, false);
      const moved = Math.hypot(rx - MOUNT.x, rz - MOUNT.z);
      MOUNT.stuck = moved < v * .3 ? MOUNT.stuck + dt : 0;
      MOUNT.x = rx; MOUNT.z = rz;
      MOUNT.yaw = Math.atan2(dx, dz);
      if (MOUNT.stuck > 1.2 || d > 70) {   // preso ou longe demais: aparece de repente atrás do jogador
        const a = P.g.rotation.y + Math.PI, f = freePoint(P.x + Math.sin(a) * 4, P.z + Math.cos(a) * 4, .9);
        puff(f.x, 1, f.z, 0xd8c8a0, 3, 3);
        MOUNT.x = f.x; MOUNT.z = f.z; MOUNT.stuck = 0;
      }
      place();
      animateHorseLegs(dt, moved / Math.max(dt, 1e-3));
      return;
    }
  }
  if (MOUNT.want) walkToHorse(dt);
  place();
  animateHorseLegs(dt, 0);
}

/** O jogador caminha até o flanco esquerdo do cavalo parado e só então sobe (nada de teleporte) */
function walkToHorse(dt) {
  MOUNT.walkT -= dt;
  if (!canRide() || MOUNT.walkT <= 0) { MOUNT.want = false; return; }
  if (MOUNT.st === 'come') return;                                   // ainda vindo
  const c = Math.cos(MOUNT.yaw), s = Math.sin(MOUNT.yaw);
  const f = freePoint(MOUNT.x + c * SIDE, MOUNT.z - s * SIDE, .5);
  if (Math.hypot(P.x - f.x, P.z - f.z) < 1.1) { MOUNT.want = false; mountUp(); return; }
  P.tgt = null; P.tx = f.x; P.tz = f.z; state.autoHold = Math.max(state.autoHold, .35);
}

/** Pernas, pescoço e cauda do cavalo conforme a velocidade (v em m/s): passo → trote → galope de quatro tempos
    (posteriores esquerdo e direito, depois anteriores esquerdo e direito, com um instante no ar). */
const OFF = { w: [.25, .75, 0, .5], t: [0, .5, .5, 0], g: [.5, .38, .12, 0] };   // fase de [AE, AD, PE, PD] em passo, trote e galope
const lp = (a, b, u) => a + (b - a) * u;
function gait(u, duty, A, lift) {
  u = ((u % 1) + 1) % 1;
  if (u < duty) { const s = u / duty; return [-A + 2 * A * s, .04 + .22 * Math.max(0, (s - .7) / .3)]; }
  const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s);
  return [A - 2 * A * e, .04 + lift * Math.sin(Math.PI * s)];
}
/** Pernas, pescoço e cauda do cavalo conforme a velocidade (v em m/s): parado → passo → trote → galope */
function animateHorseLegs(dt, v) {
  const g = MOUNT.g;
  if (!g) return;
  MOUNT.sp += (Math.min(v, 12) - MOUNT.sp) * (1 - Math.exp(-dt * 10));
  const s = MOUNT.sp, t = MOUNT.idle += dt;
  const gl = sat((s - 4.5) / 2.5), tr = sat((s - 1.6) / 1.2) * (1 - gl), wk = sat((s - .1) / .3) * (1 - sat((s - 1.6) / 1.2));
  const sum = wk + tr + gl, mv = Math.min(1, sum), nn = sum || 1, br = Math.sin(t * 1.5);
  const W = (a, b, c) => (wk * a + tr * b + gl * c) / nn;
  MOUNT.ph += dt * (sum > .01 ? W(5, 8, 12.5) : 5);
  const ph = MOUNT.ph, duty = W(.62, .45, .3), A = W(.45, .58, .85), lift = W(.9, 1.15, 1.45);
  const toss = Math.max(0, Math.sin(t * .23) - .9) / .1, paw = Math.max(0, Math.sin(t * .37) - .88) / .12;
  g.legs.forEach((l, i) => {
    const o = W(OFF.w[i], OFF.t[i], OFF.g[i]), [hip, kn] = gait(ph / 6.283 - o, duty, A, lift);
    let hx = hip * mv, kx = lp(.03, kn, mv);
    if (i === 0) { const p = paw * (1 - mv); hx += -p * .7 + Math.sin(t * 14) * .12 * p; kx += p * 1.1; }   // bate a pata parado
    l.rotation.x = hx; l.knee.rotation.x = kx; l.foot.rotation.x = hx * .25 + kx * .3;
  });
  const HB = g.HB;
  MOUNT.bob = W(Math.cos(ph * 2) * .012, Math.cos(ph * 2) * .028, Math.sin(ph * 2 + .5) * .07) * mv + br * .004;   // a sela sobe e desce; o cavaleiro acompanha
  HB.position.y = 1.4 + MOUNT.bob;
  HB.rotation.x = W(Math.sin(ph) * .015, Math.sin(ph * 2) * .02, Math.sin(ph + 1) * .06) * mv;
  HB.rotation.z = W(Math.sin(ph) * .02, Math.sin(ph) * .012, Math.sin(ph) * .015) * mv + Math.sin(t * .5) * .008 * (1 - mv);
  g.neck.rotation.x = lp(.75 + Math.sin(t * .6) * .04 - toss * .12, W(.75 + Math.sin(ph) * .08, .82 + Math.sin(ph * 2) * .03, .98 + Math.sin(ph) * .08), mv);
  g.head.rotation.x = .1 + Math.sin(t * .5) * .05 * (1 - mv) - gl * .15 - toss * .3;
  g.head.rotation.y = Math.sin(t * .3) * .18 * (1 - mv) * (MOUNT.on ? .3 : 1);
  g.tail.rotation.x = lp(.12 + Math.sin(t * 1.1) * .08, W(.2 + Math.sin(ph * .5) * .12, .35 + Math.sin(ph) * .1, .9 + Math.sin(ph * 2) * .12), mv);
  g.tail.rotation.z = Math.sin(t * .9) * .1 * (1 - mv) + Math.sin(ph) * .08 * mv;
  g.tail2.rotation.x = Math.sin(t * 1.7 + 1) * .15 + gl * .4 + Math.sin(ph * 1.5) * .1 * mv;
  const fk = Math.sin(t * .9) > .96 ? Math.sin(t * 40) * .25 : 0;
  g.earL.rotation.z = fk + Math.sin(t * .7) * .04; g.earR.rotation.z = -Math.sin(t * .8) * .04;
  g.earL.rotation.x = g.earR.rotation.x = -gl * .5;
}

const V3 = THREE.Vector3, OFFY = new V3(0, .72, 0);
const reins = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.BoxGeometry(.018, .018, 1), new THREE.MeshLambertMaterial({ color: 0x4a2a14 })); r.visible = false; scene.add(r); return r; });
const _a = new V3(), _b = new V3();
function placeRein(r, A, B) {
  r.position.copy(A).add(B).multiplyScalar(.5);
  r.scale.z = Math.max(.05, A.distanceTo(B));
  r.lookAt(B);
}

/** Pose do jogador montado (chamada no fim de animate(), depois da marcha): sobe na sela, abre as pernas,
    guarda a arma e segura as rédeas: duas mãos — ou só a direita, se a tocha ocupa a esquerda */
export function mountPose(dt) {
  if (!MOUNT.on) { P.mountK = 0; reins[0].visible = reins[1].visible = false; return; }
  const g = P.g, k = ss(MOUNT.t), run = Math.min(1, MOUNT.sp / 6);
  P.mountK = k;
  const bob = (MOUNT.bob || 0) * SCALE;
  const u = MOUNT.t, rise = ss(sat((u - .06) / .44)), hop = u < 1 ? Math.sin(Math.PI * sat((u - .2) / .7)) * .38 : 0, over = Math.sin(Math.PI * sat((u - .38) / .5));   // pulo + perna passando por cima
  g.position.y += LIFT * rise + bob + hop;
  const tl = -1.1 - .15 * run, kl = .75;
  [[g.legL, -1], [g.legR, 1]].forEach(([l, s]) => {
    l.rotation.x += (tl - l.rotation.x) * k;
    l.rotation.z += (s * .42 - l.rotation.z) * k;
    if (s > 0) { l.rotation.x -= .5 * over; l.rotation.z += .55 * over; }
    else l.rotation.x -= .25 * Math.sin(Math.PI * sat(u / .5));
    l.knee.rotation.x += (kl - l.knee.rotation.x) * k;
    if (l.foot) l.foot.rotation.x += (-.2 - l.foot.rotation.x) * k;
  });
  g.up.position.y += Math.sin(MOUNT.ph + 2.4) * .025 * run;
  g.rotation.x += .06 * run * k;                      // inclina para a frente no galope
  // braços nas rédeas (cinemática inversa; as mãos acompanham o balanço do corpo)
  const torch = !!(P.torchM && P.torchM.visible);
  g.up.rotation.set(.3 * over, 0, 0);
  const w = ss(sat((u - .1) / .5));
  const sway = Math.sin(MOUNT.ph + 2.4) * .025 * run, hy = 1.02 + LIFT * 0 + sway;
  const hold = (arm, side) => {
    const q0 = arm.quaternion.clone(), f0 = arm.fa.rotation.x;
    ik(arm, new V3(side * .15, hy + .1 - .72 + LIFT * 0, .36), new V3(side * 1, -.7, -.35));
    arm.quaternion.copy(q0.slerp(arm.quaternion, w));
    arm.fa.rotation.x = f0 + (arm.fa.rotation.x - f0) * w;
  };
  hold(g.arm, -1);
  if (!torch) hold(g.armL, 1);
  g.updateMatrixWorld(true);
  // rédeas: da(s) mão(s) até o bridão do cavalo
  const hd = MOUNT.g.head;
  hd.updateWorldMatrix(true, false);
  const hands = torch ? [g.arm] : [g.arm, g.armL];
  [0, 1].forEach(i => {
    const sd = i ? 1 : -1, arm = torch ? hands[0] : hands[i];
    if (!arm || k < .6) { reins[i].visible = false; return; }
    arm.fa.localToWorld(_a.set(0, -.32, 0));
    hd.localToWorld(_b.set(sd * .15, -.08, .64));
    placeRein(reins[i], _a, _b);
    reins[i].visible = true;
  });
}
