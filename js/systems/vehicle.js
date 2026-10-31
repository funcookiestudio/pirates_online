/* Veículos: carroça e carruagem, comprados com o Seu Tobias (estábulo da Fazenda do Gado).
   O botão/tecla H usa a montaria escolhida no estábulo (cavalo, carroça ou carruagem): chama o veículo, sobe na boleia
   e desce. Conduzindo, o jogador clica no chão como a pé: a posição do jogador (P.x/P.z) é a dos cavalos, que vão na
   frente; o veículo vem arrastado atrás (reboque, com o eixo dianteiro da carruagem esterçando), as rodas giram com a
   distância percorrida e a caixa inclina com o relevo. Não fazem curva fechada (raio mínimo), não entram na vila,
   na água nem em dungeons, e o jogador desce sozinho para lutar. */
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { buildCart, buildCoach, PAINTS } from '../entities/vehicles.js';
import { animHorse } from '../entities/horse.js';
import { K } from '../entities/human.js';
import { groundY, slideTo, walkable } from '../world/terrain.js';
import { isDark, refreshTorch } from './inventory.js';
import { freePoint } from './steer.js';
import { dIn } from '../dungeon/dgrid.js';
import { VILLAGE_R, rideOk, streetSpot } from '../core/village-const.js';
import { houseAt } from '../world/floors.js';
import { puff } from './effects.js';
import { log } from '../ui/notify.js';
import { state } from '../core/state.js';
import { standUp, sitDown } from './rest.js';
import { MOUNT, dismount, refreshMountButton } from './mount.js';

//  n = nome · cost = preço · mult = velocidade ÷ a pé · turn = giro máximo (rad/s) · lead = cavalos → eixo (dianteiro) · rear = eixo dianteiro → traseiro
export const VKIND = {
  cart: { n: 'carroça', cost: 300, mult: 1.8, turn: 2.3, lead: 3.9 },
  coach: { n: 'carruagem', cost: 800, mult: 2.0, turn: 1.7, lead: 3.35, rear: 3.1 },
};
export const PAINT_COST = 40;
export { PAINTS };
/** own = veículos comprados · use = montaria da tecla H (null = cavalo) · on = na boleia · t = subir (0 no chão … 1 sentado) */
export const VEH = { own: { cart: false, coach: false }, use: null, paint: 0, on: false, t: 0, dis: false, want: false, walkT: 0, hd: 0, k: 0 };
const M = {};   // modelos e estado no mundo, por tipo: { m, x, z (cavalos), ax, az (eixo / eixo dianteiro), rx, rz (eixo traseiro), st, hs[], dist, fdist, stuck }
const BOARD_T = .7, LEAVE_T = .6;
const sat = x => Math.min(1, Math.max(0, x)), ss = x => x * x * (3 - 2 * x);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const V3 = THREE.Vector3, _a = new V3(), _b = new V3(), _c = new V3(), _s = new V3();

export const vehOwned = () => VEH.own.cart || VEH.own.coach;
/** Tipo de veículo da tecla H (null = cavalo ou nenhum) */
export const activeVeh = () => (VEH.use && VEH.own[VEH.use] ? VEH.use : null);
export const vehVisible = () => { const k = activeVeh(); return !!(k && M[k] && M[k].m.root.visible); };
export const vehMult = () => VKIND[VEH.on ? VEH.on : 'cart'].mult;
const kd = () => VEH.on || activeVeh();

function ensure(k) {
  if (M[k]) return M[k];
  const m = k === 'cart' ? buildCart(0) : buildCoach(VEH.paint, [1, 1]);
  scene.add(m.root);
  M[k] = { m, x: 0, z: 0, ax: 0, az: 0, rx: 0, rz: 0, st: 'park', hs: m.horses.map(() => ({})), dist: 0, fdist: 0, stuck: 0, sp: 0 };
  return M[k];
}

/** Coloca o veículo parado com os cavalos em (x,z) olhando para `yaw` */
function park(k, x, z, yaw, exact) {
  const o = ensure(k), L = VKIND[k];
  const f = exact ? { x, z } : freePoint(x, z, 1.4);
  o.x = f.x; o.z = f.z; o.st = 'park';
  const sx = Math.sin(yaw), cz = Math.cos(yaw);
  o.ax = o.x - sx * L.lead; o.az = o.z - cz * L.lead;
  o.rx = o.ax - sx * (L.rear || 0); o.rz = o.az - cz * (L.rear || 0);
  o.m.root.visible = true;
  place(k, 0, 0);
}

/** Reboque: o eixo segue o ponto da frente mantendo a distância (vale para a carroça e para os dois eixos da carruagem) */
function trail(px, pz, qx, qz, L) {
  const dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz) || 1e-6;
  return [px - dx / d * L, pz - dz / d * L];
}

/** Atualiza eixos, rodas, inclinação no relevo e cavalos de um veículo (cavalos em o.x/o.z) */
function place(k, dt, vel) {
  const o = M[k], m = o.m, L = VKIND[k];
  const [ax, az] = trail(o.x, o.z, o.ax, o.az, L.lead);
  const fwdA = (ax - o.ax) * Math.sin(Math.atan2(o.x - ax, o.z - az)) + (az - o.az) * Math.cos(Math.atan2(o.x - ax, o.z - az));
  o.ax = ax; o.az = az;
  const yawF = Math.atan2(o.x - ax, o.z - az);
  let bx = ax, bz = az, yawB = yawF;
  if (L.rear) {   // carruagem: o jogo dianteiro esterça; a caixa vem atrás, presa no eixo dianteiro
    const [rx, rz] = trail(ax, az, o.rx, o.rz, L.rear);
    yawB = Math.atan2(ax - rx, az - rz);
    o.dist += (rx - o.rx) * Math.sin(yawB) + (rz - o.rz) * Math.cos(yawB);
    o.rx = rx; o.rz = rz; bx = rx; bz = rz;
    o.fdist += fwdA;
  } else o.dist += fwdA;
  const tilt = (grp, x, z, yaw, len, half) => {   // inclina pelo chão: frente/trás e esquerda/direita
    const s = Math.sin(yaw), c = Math.cos(yaw), y0 = groundY(x, z);
    const yf = groundY(x + s * len, z + c * len), yl = groundY(x + c * half, z - s * half), yr = groundY(x - c * half, z + s * half);
    grp.position.set(x, y0, z); grp.rotation.set(-Math.atan2(yf - y0, len), yaw, Math.atan2(yl - yr, 2 * half) * .7);
  };
  tilt(m.body, bx, bz, yawB, L.rear ? L.rear : L.lead * .6, 1.1);
  if (m.fore) tilt(m.fore, ax, az, yawF, L.lead, 1);
  m.wheels.forEach(W => { W.w.rotation.x = (W.fore ? o.fdist : o.dist) / W.R; });
  o.yaw = yawB; o.yawF = yawF;
  // cavalos, lanternas e chacoalhar da caixa
  o.sp += ((vel || 0) - o.sp) * (1 - Math.exp(-(dt || 0) * 8));
  m.horses.forEach((H, i) => animHorse(H, o.hs[i], dt || 0, vel || 0, .6));
  const hs = o.hs[0], mv = hs.mv || 0, gl = hs.gl || 0, ph = hs.ph || 0, t = hs.idle || 0;
  m.body.position.y += Math.sin(ph * 2) * .012 * mv * (1 + gl * 2);
  m.body.rotation.x += Math.sin(ph) * .007 * mv * (1 + gl);
  m.lamps.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.3 + i) * .05 + Math.sin(ph * 2) * .06 * mv; l.rotation.x = -Math.sin(ph * 2 + 1 + i) * .05 * mv * (1 + gl); });
}

/** Comprado: aparece ao lado do jogador e vira a montaria da tecla H */
export function giveVehicle(k) {
  VEH.own[k] = true;
  setUse(k);
  const a = P.g.rotation.y;
  park(k, P.x + Math.sin(a + 1.6) * 4, P.z + Math.cos(a + 1.6) * 4, a);
  puff(M[k].x, 1, M[k].z, 0xd8c8a0, 4, 3);
  refreshMountButton();
}
/** Escolhe a montaria da tecla H (null = cavalo); desce do que estiver usando */
export function setUse(k) {
  if (VEH.on) leaveNow();
  if (MOUNT.on) dismount();
  VEH.use = k || null; VEH.want = false;
  refreshMountButton();
}
/** Pinta a carruagem (troca o modelo mantendo a posição) */
export function repaintCoach() {
  VEH.paint = (VEH.paint + 1) % PAINTS.length;
  const o = M.coach;
  if (!o) return;
  const keep = { x: o.x, z: o.z, ax: o.ax, az: o.az, rx: o.rx, rz: o.rz, vis: o.m.root.visible };
  if (VEH.on === 'coach') leaveNow();
  scene.remove(o.m.root); delete M.coach;
  const n = ensure('coach'); Object.assign(n, keep); n.m.root.visible = keep.vis; place('coach', 0, 0);
}

/** Ao carregar o jogo / chegar numa ilha: os veículos esperam do lado de fora do portão leste */
export function initVehicles() {
  if (VEH.own.cart) park('cart', VILLAGE_R + 11, -5, Math.PI / 2);
  if (VEH.own.coach) park('coach', VILLAGE_R + 12, -12, Math.PI / 2);
  refreshMountButton();
}
export const saveVeh = () => ({ c: VEH.own.cart ? 1 : 0, k: VEH.own.coach ? 1 : 0, u: VEH.use, p: VEH.paint });
export function loadVeh(s) {
  s = s && typeof s === 'object' ? s : {};
  VEH.own.cart = !!s.c; VEH.own.coach = !!s.k;
  VEH.use = s.u === 'cart' || s.u === 'coach' ? s.u : null;
  VEH.paint = Math.max(0, Math.min(PAINTS.length - 1, s.p | 0));
}

const canDrive = () => !P.dead && !P.swimming && !dIn(P.x, P.z) && !houseAt(P.x, P.z, .3) && !P.sit && !P.sitT && P.roll <= 0 && !MOUNT.on;   // na vila pode subir (o veículo fica na rua); dentro de casa não
const inVillage = (x = P.x, z = P.z) => Math.hypot(x, z) <= VILLAGE_R + 1;

/** Ponto do chão, ao lado da boleia, de onde se sobe/desce (o outro lado, se este estiver bloqueado) */
function sidePoint(k) {
  const m = M[k].m;
  m.root.updateMatrixWorld(true);
  m.body.localToWorld(_s.copy(m.exit));
  if (!walkable(_s.x, _s.z)) { m.body.localToWorld(_s.set(-m.exit.x, 0, m.exit.z)); if (!walkable(_s.x, _s.z)) _s.set(M[k].x, 0, M[k].z); }
  _s.y = groundY(_s.x, _s.z);
  return _s;
}

function board(k) {
  const o = M[k];
  VEH.on = k; VEH.t = 0; VEH.dis = false; VEH.want = false; P.mounted = true; state.inVeh = true; refreshTorch();   // a tocha vai para a cintura
  VEH.sx = P.g.position.x; VEH.sy = P.g.position.y; VEH.sz = P.g.position.z; VEH.syaw = P.g.rotation.y;
  P.x = P.tx = o.x; P.z = P.tz = o.z; P.tgt = null; P.vx = P.vz = 0;
  VEH.hd = Math.atan2(o.x - o.ax, o.z - o.az);
  o.st = 'park';
  refreshMountButton();
}
/** Desce com animação (H, ir lutar, sentar) */
export function startLeave() {
  if (!VEH.on || VEH.dis) return;
  const p = sidePoint(VEH.on);
  VEH.dis = true; VEH.sx = p.x; VEH.sy = p.y; VEH.sz = p.z; VEH.syaw = outYaw(VEH.on);
  P.vx = P.vz = 0; P.tx = P.x; P.tz = P.z;
}
/** Direção de quem desce: de costas para a boleia, olhando para fora */
const outYaw = k => M[k].yaw + (M[k].m.exit.x > 0 ? 1 : -1) * Math.PI / 2;
function finishLeave() {
  const k = VEH.on;
  VEH.on = false; VEH.dis = false; VEH.t = 0; P.mounted = false; P.mountK = 0; state.inVeh = false; state.vehLamp = null; refreshTorch();
  P.x = P.tx = VEH.sx; P.z = P.tz = VEH.sz;
  P.g.rotation.x = 0; P.g.rotation.y = outYaw(k);
  resetPose();
  M[k].m.pass.forEach(p => { p.visible = false; });
  M[k].m.reins.forEach(r => { r.visible = false; });
  refreshMountButton();
  if (VEH.sitAfter) { VEH.sitAfter = false; sitDown(); }
}
/** Desce na hora (morreu, água, vila, dungeon, troca de montaria) */
export function leaveNow(msg) {
  if (!VEH.on) return;
  const p = sidePoint(VEH.on);
  VEH.sx = p.x; VEH.sy = p.y; VEH.sz = p.z;
  finishLeave();
  if (msg) log(msg);
}
function resetPose() {
  const g = P.g;
  [g.legL, g.legR].forEach(l => { l.rotation.set(0, 0, 0); l.knee.rotation.x = 0; if (l.foot) l.foot.rotation.x = 0; });
  g.up.rotation.set(0, 0, 0);
}

/** Tecla/botão H com um veículo escolhido: desce · sobe (se perto) · ou chama o veículo */
export function vehToggle(auto) {
  const k = activeVeh();
  if (auto === true || !k || P.dead) return;   // o auto play e o fôlego só chamam o cavalo
  const N = VKIND[k].n;
  if (!VEH.on && (P.sit > 0 || P.sitT)) { standUp(); VEH.pending = true; return; }
  if (VEH.on) { if (VEH.dis || VEH.t < 1) return; P.tgt = null; startLeave(); return; }
  if (!canDrive()) { log('Aqui não dá: suba em terra firme (na vila, só pelas ruas)'); return; }
  const o = ensure(k);
  if (inVillage() && (!o.m.root.visible || !rideOk(o.x, o.z) || Math.hypot(o.x - P.x, o.z - P.z) > 16)) {   // chamada de dentro da vila: aparece na rua do portão mais perto
    const s = streetSpot(P.x, P.z); park(k, s.x, s.z, s.yaw, true); puff(o.x, 1, o.z, 0xd8c8a0, 4, 3);
  }
  if (o.m.root.visible && inVillage(o.x, o.z) && !inVillage() && Math.hypot(o.x - P.x, o.z - P.z) > 16) o.m.root.visible = false;   // ficou parada na vila: aparece perto do jogador (não atravessa as casas)
  if (!o.m.root.visible) {   // estava no estábulo: chega perto do jogador
    const a = P.g.rotation.y + Math.PI;
    park(k, P.x + Math.sin(a) * 9, P.z + Math.cos(a) * 9, P.g.rotation.y);
    puff(o.x, 1, o.z, 0xd8c8a0, 4, 3);
  }
  o.m.root.visible = true; refreshMountButton();
  const p = sidePoint(k), d = Math.hypot(p.x - P.x, p.z - P.z);
  if (d < 2.2) { board(k); return; }
  VEH.want = true; VEH.walkT = 25; o.stuck = 0;
  if (!inVillage() && Math.hypot(o.x - P.x, o.z - P.z) > 16) { o.st = 'come'; log('Assobiou: a ' + N + ' está a caminho'); }
  else log('Indo até a ' + N);
}
/** Dispensa o veículo (Shift+H ou segurar o botão): volta ao estábulo */
export function vehDismiss() {
  const k = activeVeh();
  if (!k || !M[k]) return;
  if (VEH.on) leaveNow();
  VEH.want = false; M[k].st = 'park';
  if (!M[k].m.root.visible) return;
  puff(M[k].x, 1, M[k].z, 0xd8c8a0, 4, 3);
  M[k].m.root.visible = false; refreshMountButton();
  log('Você dispensou a ' + VKIND[k].n + ': ela voltou ao estábulo');
}

/** Todo frame, antes do movimento do jogador */
export function updateVehicle(dt) {
  if (VEH.pending && P.sit === 0 && !P.sitT) { VEH.pending = false; vehToggle(); }
  if (VEH.on) {
    const k = VEH.on, N = VKIND[k].n;
    if (P.dead) { leaveNow(); return; }
    if (P.swimming) { leaveNow('A ' + N + ' não anda na água: você desceu'); return; }
    if (dIn(P.x, P.z)) { leaveNow(); return; }
    if (VEH.dis) { VEH.t = Math.max(0, VEH.t - dt / LEAVE_T); if (VEH.t === 0) finishLeave(); }
    else if (VEH.t < 1) VEH.t = Math.min(1, VEH.t + dt / BOARD_T);
  }
  for (const k in M) {   // parados ou vindo até o jogador (o que está sendo conduzido anda em vehiclePose)
    const o = M[k];
    if (!o.m.root.visible || k === VEH.on) continue;
    let vel = 0;
    if (o.st === 'come') {
      const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz);
      if (d < 7 || dIn(P.x, P.z)) o.st = 'park';
      else {
        const v = Math.min(8, 2.5 + d * .6) * dt;
        const [rx, rz] = slideTo(o.x, o.z, o.x + dx / d * v, o.z + dz / d * v, false);
        const moved = Math.hypot(rx - o.x, rz - o.z);
        o.stuck = moved < v * .3 ? o.stuck + dt : 0;
        o.x = rx; o.z = rz; vel = moved / Math.max(dt, 1e-3);
        if (o.stuck > 1.2 || d > 80) {   // preso ou longe demais: aparece atrás do jogador
          const a = P.g.rotation.y + Math.PI;
          park(k, P.x + Math.sin(a) * 8, P.z + Math.cos(a) * 8, P.g.rotation.y);
          puff(o.x, 1, o.z, 0xd8c8a0, 4, 3); o.st = 'park';
        }
      }
    }
    place(k, dt, vel);
  }
  if (VEH.want) walkToVehicle(dt);
}

/** O jogador caminha até o lado da boleia e só então sobe */
function walkToVehicle(dt) {
  const k = activeVeh();
  VEH.walkT -= dt;
  if (!k || !M[k] || !canDrive() || VEH.walkT <= 0) { VEH.want = false; return; }
  if (M[k].st === 'come') return;
  const p = sidePoint(k);
  if (Math.hypot(P.x - p.x, P.z - p.z) < 1.1) { board(k); return; }
  P.tgt = null; P.tx = p.x; P.tz = p.z; state.autoHold = Math.max(state.autoHold || 0, .35);
}

/** Depois do movimento do jogador (conduzindo): limita o giro — o veículo faz curva aberta em vez de girar no lugar */
export function vehTurn(dt, px, pz) {
  if (!VEH.on || VEH.dis || VEH.t < 1) return;
  const dx = P.x - px, dz = P.z - pz, d = Math.hypot(dx, dz);
  if (d < 1e-4) return;
  let a = Math.atan2(dx, dz);
  const diff = wrap(a - VEH.hd), mx = VKIND[VEH.on].turn * dt * (1 + 1.5 / (1 + d / Math.max(dt, 1e-3)));
  if (Math.abs(diff) > mx) {
    a = VEH.hd + Math.sign(diff) * mx;
    const nx = px + Math.sin(a) * d, nz = pz + Math.cos(a) * d;
    if (walkable(nx, nz) && rideOk(nx, nz)) {   // curva aberta só se couber (beira de rio, cabeceira de ponte: segue o caminho mesmo fechando mais)
      P.x = nx; P.z = nz;
      const sp = Math.hypot(P.vx, P.vz); P.vx = Math.sin(a) * sp; P.vz = Math.cos(a) * sp;
    } else a = Math.atan2(dx, dz);
  }
  VEH.hd = a;
}

/** Pose do jogador na boleia (fim de animate()): o veículo segue os cavalos, o jogador senta e segura as rédeas */
export function vehiclePose(dt) {
  if (!VEH.on) return;
  const k = VEH.on, o = M[k], m = o.m;
  if (!VEH.dis && VEH.t >= 1) {   // conduzindo: os cavalos estão na posição do jogador
    const vel = Math.hypot(P.x - o.x, P.z - o.z) / Math.max(dt, 1e-3);
    o.x = P.x; o.z = P.z;
    place(k, dt, Math.min(vel, 12));
  } else place(k, dt, 0);
  m.root.visible = true;
  m.root.updateMatrixWorld(true);
  const seat = m.body.localToWorld(_c.copy(m.seat));
  const u = VEH.t, k2 = ss(u), mv = ss(sat((u - .15) / .7));
  const g = P.g, hop = Math.sin(Math.PI * sat((u - .1) / .8)) * .45;
  g.position.set(VEH.sx + (seat.x - VEH.sx) * mv, VEH.sy + (seat.y - VEH.sy) * mv + hop, VEH.sz + (seat.z - VEH.sz) * mv);
  g.rotation.y = VEH.syaw + wrap(o.yaw - VEH.syaw) * ss(sat((u - .3) / .6));
  g.rotation.x = 0;
  P.mountK = k2;   // a arma vai para o coldre
  const hs = o.hs[0], ph = hs.ph || 0, gl = hs.gl || 0, mvh = hs.mv || 0, br = Math.sin(performance.now() / 560);
  const pull = Math.sin(ph) * .05 * mvh, torch = !!(P.torchM && P.torchM.visible);
  const L = (cur, tg) => cur + (tg - cur) * k2;
  [g.legL, g.legR].forEach(l => {
    l.rotation.x = L(l.rotation.x, -1.5); l.rotation.z = L(l.rotation.z, 0);
    l.knee.rotation.x = L(l.knee.rotation.x, 1.5); if (l.foot) l.foot.rotation.x = L(l.foot.rotation.x, .1);
  });
  g.up.rotation.set(L(g.up.rotation.x, .08 + gl * .12 + br * .012), L(g.up.rotation.y, 0), L(g.up.rotation.z, Math.sin(ph) * .02 * mvh));
  const ar = (arm, s, p) => {
    arm.rotation.set(L(arm.rotation.x, -.85 - gl * .12 + p), L(arm.rotation.y, 0), L(arm.rotation.z, s * .05));
    arm.fa.rotation.x = L(arm.fa.rotation.x, -.8 - gl * .1);
  };
  ar(g.arm, 1, pull);
  if (!torch) ar(g.armL, -1, -pull);
  // lanternas acesas no escuro: a luz do jogador vai para elas
  if (isDark() && k2 > .5) { m.lamps[0].updateWorldMatrix(true, false); const q = m.lamps.length > 1 ? m.lamps[0].position.clone().add(m.lamps[1].position).multiplyScalar(.5) : m.lamps[0].position.clone(); state.vehLamp = (state.vehLamp || new V3()).copy(m.lamps[0].parent.localToWorld(q)); state.vehLamp.y += 1.2; }
  else state.vehLamp = null;
  // passageiros da carruagem
  m.pass.forEach((p, i) => {
    p.visible = u > .5;
    p.up.rotation.set(.03 + br * .01, 0, Math.sin(ph * .5 + i) * .03 * mvh);
    p.head.rotation.y = Math.sin(performance.now() / 2500 + i * 1.7) * .35;
  });
  // rédeas: mão(s) → coalheira → bridão de cada cavalo
  g.updateMatrixWorld(true);
  const hands = torch ? [g.arm, g.arm] : [g.arm, g.armL];
  hands.forEach((arm, i) => m.horses.forEach((H, j) => {
    const n = (i * m.horses.length + j) * 2, r1 = m.reins[n], r2 = m.reins[n + 1], s = i ? 1 : -1;
    if (!r1) return;
    if (k2 < .8) { r1.visible = r2.visible = false; return; }
    arm.fa.localToWorld(_a.set(0, -.5 * K, 0));
    H.HB.localToWorld(_c.set(s * .12, .76, -.12));
    H.head.localToWorld(_b.set(s * .19, -.14, .62));
    seg(r1, _a, _c); seg(r2, _c, _b);
  }));
}
function seg(m, a, b) {
  m.parent.worldToLocal(_s.copy(a));
  const ax = _s.x, ay = _s.y, az = _s.z;
  m.parent.worldToLocal(_s.copy(b));
  m.position.set((ax + _s.x) / 2, (ay + _s.y) / 2, (az + _s.z) / 2);
  m.scale.z = Math.max(.05, Math.hypot(_s.x - ax, _s.y - ay, _s.z - az));
  m.lookAt(b);
  m.visible = true;
}
