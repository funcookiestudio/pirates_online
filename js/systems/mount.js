/* Montaria: o cavalo comprado na Fazenda do Gado.
   H = chamar o cavalo / montar / desmontar. Montado o jogador corre ~2× mais rápido; o cavalo acompanha o jogador e
   as pernas dele acompanham a velocidade (trote → galope). Desmonta sozinho na água, na vila, em dungeons e ao morrer. */
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { mkHorse } from '../entities/farm.js';
import { groundY, slideTo, walkable } from '../world/terrain.js';
import { freePoint } from './steer.js';
import { dIn } from '../dungeon/dgrid.js';
import { VILLAGE_R } from '../core/village-const.js';
import { puff } from './effects.js';
import { standUp } from './rest.js';
import { log } from '../ui/notify.js';
import { $ } from '../core/utils.js';

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
const SCALE = 1.15, MOUNT_TIME = .5;
const ss = x => x * x * (3 - 2 * x);

function ensureHorse() {
  if (MOUNT.root) return;
  const g = mkHorse(COATS[MOUNT.coat].c, COATS[MOUNT.coat].mz), root = new THREE.Group();
  g.scale.setScalar(SCALE);
  // sela
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(.56, .09, .5), new THREE.MeshLambertMaterial({ color: 0x5a2a18 }));
  saddle.position.set(0, 1.46, .02); g.add(saddle);
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
  b.style.display = MOUNT.owned ? '' : 'none';
  b.classList.toggle('on', MOUNT.on);
}

/** Montado em terra firme, fora da vila e das dungeons */
const canRide = () => !P.dead && !P.swimming && !dIn(P.x, P.z) && Math.hypot(P.x, P.z) > VILLAGE_R + 1 && !P.sit && !P.sitT && P.roll <= 0;

export function dismount(msg) {
  if (!MOUNT.on) return;
  MOUNT.on = false; MOUNT.t = 0;
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
  if (!canRide()) { log('🐴 Não dá para montar aqui'); return; }
  MOUNT.on = true; MOUNT.t = 0; MOUNT.st = 'park'; MOUNT.want = false;
  P.tgt = null; P.tx = P.x; P.tz = P.z;
  puff(P.x, 1, P.z, 0xd8c8a0, 3, 3);
  refreshMountButton();
}

/** Tecla H: desmonta · monta (se o cavalo está perto) · ou chama o cavalo */
export function toggleMount() {
  if (!MOUNT.owned || P.dead) return;
  if (!MOUNT.on && (P.sit > 0 || P.sitT)) { standUp(); MOUNT.pending = true; return; }   // levanta primeiro, depois chama/monta
  if (MOUNT.on) { if (Math.hypot(P.x, P.z) <= VILLAGE_R + 1) return; dismount(); return; }
  if (!canRide()) { log('🐴 Chame o cavalo fora da vila, em terra firme'); return; }
  MOUNT.root.visible = true;
  if (Math.hypot(MOUNT.x - P.x, MOUNT.z - P.z) < 3.4) { mountUp(); return; }
  MOUNT.st = 'come'; MOUNT.want = true; MOUNT.stuck = 0;
  log('🐴 Assobiou: o cavalo está a caminho');
}

/** Multiplicador de velocidade atual (cansado: só um trote um pouco mais rápido que a pé) */
export const mountMult = () => MOUNT.tired ? 1.3 : COATS[MOUNT.coat].mult;

function updateBreath(dt) {
  const sp = Math.hypot(P.vx, P.vz);
  if (MOUNT.on) MOUNT.en += (sp > 3.5 ? -.085 * COATS[MOUNT.coat].br : sp > .3 ? -.01 : .06) * dt;
  else MOUNT.en += .12 * dt;
  if (MOUNT.feed > 0) { MOUNT.feed -= dt; MOUNT.en += .15 * dt; }
  MOUNT.en = Math.max(0, Math.min(1, MOUNT.en));
  if (MOUNT.en <= 0 && !MOUNT.tired) { MOUNT.tired = true; if (MOUNT.on) log('🐴 O cavalo está cansado: ande um pouco para ele recuperar o fôlego'); }
  else if (MOUNT.tired && MOUNT.en > .35) MOUNT.tired = false;
  const b = $('sm') && $('sm').querySelector('b');
  if (b) { b.style.width = (MOUNT.en * 100) + '%'; b.style.background = MOUNT.tired ? '#d8503a' : MOUNT.en < .3 ? '#e0b030' : '#7ad84a'; }
}

/** Todo frame (antes do movimento do jogador) */
export function updateMount(dt) {
  if (!MOUNT.owned || !MOUNT.root) return;
  updateBreath(dt);
  if (MOUNT.pending && P.sit === 0 && !P.sitT) { MOUNT.pending = false; toggleMount(); }
  if (MOUNT.on) {
    if (P.dead) { dismount(); return; }
    if (P.swimming) { dismount('🐴 O cavalo não nada: você desmontou'); return; }
    if (dIn(P.x, P.z)) { dismount(); return; }
    if (Math.hypot(P.x, P.z) <= VILLAGE_R + .5) { dismount('🐴 Cavalos ficam do lado de fora da vila'); return; }
    MOUNT.t = Math.min(1, MOUNT.t + dt / MOUNT_TIME);
    // o cavalo vai por baixo do jogador
    const sp = Math.hypot(P.vx, P.vz), r = MOUNT.root;
    r.position.set(P.x, groundY(P.x, P.z), P.z);
    r.rotation.y = P.g.rotation.y;
    r.visible = true;
    animateHorseLegs(dt, sp);
    return;
  }
  // fora da sela: vindo até o jogador, ou parado
  if (MOUNT.st === 'come') {
    const dx = P.x - MOUNT.x, dz = P.z - MOUNT.z, d = Math.hypot(dx, dz);
    if (d < 2.4) {
      MOUNT.st = 'park';
      if (MOUNT.want && canRide()) mountUp();
      MOUNT.want = false;
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
  place();
  animateHorseLegs(dt, 0);
}

/** Pernas, pescoço e cauda do cavalo conforme a velocidade (v em m/s) */
function animateHorseLegs(dt, v) {
  const g = MOUNT.g;
  if (!g) return;
  MOUNT.sp += (Math.min(v, 12) - MOUNT.sp) * (1 - Math.exp(-dt * 10));
  const s = MOUNT.sp;
  MOUNT.ph += dt * (s > .2 ? 4 + s * 1.15 : 0);
  MOUNT.idle += dt;
  const run = Math.min(1, s / 6), amp = Math.min(1, s / 2.2) * (.55 + .35 * run);
  const base = [0, Math.PI * (.5 + .4 * run), Math.PI, Math.PI * (1.5 - .4 * run)];   // trote → galope (as quatro pernas se aproximam)
  g.legs.forEach((l, i) => {
    const w = Math.sin(MOUNT.ph + base[i]);
    l.rotation.x = w * amp;
    l.knee.rotation.x = Math.max(0, Math.cos(MOUNT.ph + base[i])) * amp * 1.1;
  });
  const bob = Math.abs(Math.sin(MOUNT.ph)) * .05 * amp;
  g.position.y = bob;
  g.neck.rotation.x = .55 - run * .15 + Math.sin(MOUNT.ph * 2) * .05 * amp + Math.sin(MOUNT.idle * 1.4) * .04 * (1 - amp);
  g.tail.rotation.x = .35 + amp * .25 + Math.sin(MOUNT.idle * 2.2) * .12;
  g.earL.rotation.z = Math.sin(MOUNT.idle * 3) * .05 * (1 - amp) - run * .2;
  g.earR.rotation.z = -Math.sin(MOUNT.idle * 3.4) * .05 * (1 - amp) + run * .2;
}

/** Pose do jogador montado (chamada no fim de animate(), depois da marcha): sobe na sela e abre as pernas */
export function mountPose(dt) {
  if (!MOUNT.on) return;
  const g = P.g, k = ss(MOUNT.t), run = Math.min(1, MOUNT.sp / 6);
  const bob = Math.abs(Math.sin(MOUNT.ph)) * .05 * Math.min(1, MOUNT.sp / 2.2);
  g.position.y += LIFT * k + bob;
  const tl = -1.1 - .15 * run, kl = .75;
  [[g.legL, -1], [g.legR, 1]].forEach(([l, s]) => {
    l.rotation.x += (tl - l.rotation.x) * k;
    l.rotation.z += (s * .42 - l.rotation.z) * k;
    l.knee.rotation.x += (kl - l.knee.rotation.x) * k;
    if (l.foot) l.foot.rotation.x += (-.2 - l.foot.rotation.x) * k;
  });
  g.up.position.y += Math.sin(MOUNT.ph * 2) * .02 * run;
  g.rotation.x += .06 * run * k;                      // inclina para a frente no galope
}
