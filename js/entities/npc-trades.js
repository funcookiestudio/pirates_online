/* Ofícios diurnos dos inquilinos da taberna.
   · Mestre Breu corta lenha no quintal ao lado da casa do ferreiro e entrega a lenha rachada ao ferreiro (bigorna ao leste).
   · Pé-de-Pau Polly fica numa cadeira fora da taverna tecendo uma rede de pesca (de dia); ao anoitecer ambos guardam tudo e sobem para dormir.
   A rotina roda por estados (st); o movimento usa o andador comum do npc.js (n.tx/n.tz) e a pose é aplicada depois da marcha (tradePose). */
import { scene } from '../core/engine.js';
import { groundY } from '../world/terrain.js';
import { props } from '../core/registry.js';
import { houseAt } from '../world/floors.js';
import { hourNow } from '../core/clock.js';
import { M } from '../core/utils.js';
import { hideSword } from './character.js';
import { gaitReset } from './gait.js';

const ss = x => x * x * (3 - 2 * x), cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const turn = (a, b, k) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k); };
const WOOD = 0x7a5230, WOOD2 = 0x5a3a20, BARK = 0x4a3220, CUT = 0xd8b27a, IRON = 0x55585e, TWINE = 0xcbb88a;

const CTX = {};
/** Registrado pelo village.js: `at(a,b)` leva metros do referencial da casa ao mundo (a = +x local, b = +z local, frente da casa) */
export function regTrade(k, at, th) { CTX[k] = { at, th }; }

const box = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = true; if (p) p.add(m); return m; };
const cyl = (rt, rb, h, c, x, y, z, p, n = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), M(c)); m.position.set(x, y, z); m.castShadow = true; if (p) p.add(m); return m; };
const freeAt = (x, z, r) => !houseAt(x, z, r) && !props.some(p => Math.hypot(p.position.x - x, p.position.z - z) < (p.r || .3) + r);

/** Rede de pesca: malha de fios finos, boias de cortiça em cima e chumbos embaixo. A origem é a borda de cima; pende para -y */
function mkNet(w, h, nx, nz, floats = true) {
  const g = new THREE.Group();
  for (let i = 0; i <= nz; i++) box(w, .014, .014, TWINE, 0, -h * i / nz, 0, g);
  for (let i = 0; i <= nx; i++) box(.014, h, .014, TWINE, -w / 2 + w * i / nx, -h / 2, 0, g);
  for (let i = 0; i < nx * nz; i++) { const a = i % nx, b = (i / nx) | 0; if ((a + b) % 2) box(.03, .03, .02, TWINE, -w / 2 + w * (a + .5) / nx, -h * (b + .5) / nz, 0, g); }   // nós
  if (floats) for (let i = 0; i <= nx; i += 2) { box(.06, .05, .05, 0xc23b2b, -w / 2 + w * i / nx, .03, 0, g); box(.05, .05, .05, 0x777b82, -w / 2 + w * i / nx, -h - .02, 0, g); }
  return g;
}

/* ═══════════════════════ partículas (lascas de madeira) ═══════════════════════ */
const CHIPS = [];
function chips(x, y, z, n, pow = 1) {
  for (let i = 0; i < n; i++) {
    let c = CHIPS.find(q => !q.m.visible);
    if (!c) { c = { m: box(.06, .03, .04, CUT, 0, 0, 0, scene), v: new THREE.Vector3(), l: 0 }; c.m.userData.dyn = 1; CHIPS.push(c); }
    c.m.visible = true; c.l = rnd(.5, .9); c.m.position.set(x, y, z);
    c.v.set(rnd(-1, 1) * 1.6 * pow, rnd(1.2, 2.8) * pow, rnd(-1, 1) * 1.6 * pow);
  }
}
function updChips(dt) {
  CHIPS.forEach(c => {
    if (!c.m.visible) return;
    c.l -= dt; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 9; c.m.rotation.z += dt * 7;
    const gy = groundY(c.m.position.x, c.m.position.z) + .02;
    if (c.m.position.y < gy) { c.m.position.y = gy; c.v.set(0, 0, 0); }
    if (c.l <= 0) c.m.visible = false;
  });
}

/* ═══════════════════════ cenário ═══════════════════════ */
/** Quintal da lenha: cepo, toras, pilha de lenha rachada, banquinho de descanso e a prateleira de lenha junto à forja */
function buildYard(n) {
  const S = CTX.smith, T = n.tr;
  const L = (a, b) => S.at(a, b), U = (a, b, dx, dz) => { const [x, z] = L(a, b); return [x + dx, z + dz]; };
  // quintal: oeste da casa do ferreiro (a forja fica a leste); procura o primeiro ponto livre
  let c = null;
  for (const [a, b] of [[-9.6, 1.6], [-9.6, -1.4], [-9.8, 3.4], [-10.4, 0], [-9.6, -3.4], [-11, 1.6]]) { const [x, z] = L(a, b); if (freeAt(x, z, 2.2) && freeAt(...L(a + 2.8, b), 1.2)) { c = [a, b]; break; } }
  if (!c) c = [-9.8, 1.6];
  const [ca, cb] = c, root = new THREE.Group(); root.userData.dyn = 1; scene.add(root);
  const pl = (a, b) => L(ca + a, cb + b);   // ponto do quintal → mundo
  const ang = S.th;                           // o quintal gira com a casa
  const mk = (a, b, y = 0) => { const g = new THREE.Group(), [x, z] = pl(a, b); g.position.set(x, groundY(x, z) + y, z); g.rotation.y = ang; g.userData.dyn = 1; scene.add(g); return g; };
  // cepo
  const stump = mk(0, 0); cyl(.36, .42, .5, BARK, 0, .25, 0, stump, 10); cyl(.34, .34, .02, CUT, 0, .51, 0, stump, 10);
  for (let i = 0; i < 3; i++) box(.05, .02, .2, 0xb8905a, Math.cos(i * 2.1) * .12, .525, Math.sin(i * 2.1) * .12, stump).rotation.y = i * 1.1;   // anéis do cepo
  const axeOnStump = mk(0, 0, .5); axeOnStump.add(...mkAxe()); axeOnStump.children[0].rotation.set(0, 0, 0);
  axeOnStump.rotation.set(0, ang + .5, 0); axeOnStump.position.y += .3;
  // tora em pé sobre o cepo (a que está sendo rachada)
  const logOn = new THREE.Group(); logOn.userData.dyn = 1; cyl(.16, .17, .44, WOOD, 0, .73, 0, logOn, 9); cyl(.15, .15, .02, CUT, 0, .95, 0, logOn, 9); logOn.visible = false;
  stump.add(logOn);
  // pilha de toras inteiras (deitadas), à esquerda
  const pile = mk(-2.7, .3), logs = [];
  [[0, .17, 0], [.36, .17, 0], [-.36, .17, 0], [.18, .46, 0], [-.18, .46, 0], [0, .75, 0], [.0, .17, .38], [.36, .17, .38], [.18, .46, .38], [-.36, .17, .4]].forEach(([x, y, z], i) => {
    const l = cyl(.16, .16, 1.5, i % 2 ? WOOD : WOOD2, x, y, z, pile, 8); l.rotation.z = Math.PI / 2; l.rotation.y = rnd(-.08, .08); l.userData.i = i; logs.push(l);
    cyl(.15, .15, .02, CUT, 0, 0, 0, null);
  });
  // pilha de lenha rachada junto à parede da casa: 4 fileiras x 12 colunas (até 48 peças)
  const stack = mk(2.9, -.2), sticks = [];
  for (let r = 0; r < 4; r++) for (let q = 0; q < 12; q++) { const s = box(.2, .17, .46, ((r + q) % 3) ? CUT : 0xc79a5a, 0, .1 + r * .18, -1.1 + q * .2, stack); s.rotation.y = rnd(-.04, .04); s.visible = false; sticks.push(s); }
  box(.08, .8, .08, WOOD2, 0, .4, -1.3, stack); box(.08, .8, .08, WOOD2, 0, .4, 1.3, stack); box(.08, .8, .08, WOOD2, .26, .4, -1.3, stack); box(.08, .8, .08, WOOD2, .26, .4, 1.3, stack);   // estacas laterais
  // peças soltas no chão (as metades da tora recém-rachada)
  const loose = [0, 1, 2, 3].map(() => { const s = box(.14, .4, .18, CUT, 0, 0, 0, scene); s.userData.dyn = 1; s.visible = false; return s; });
  // banquinho de descanso + balde e caneca
  const seat = mk(-1.6, 2.1); cyl(.26, .3, .36, WOOD2, 0, .18, 0, seat, 9); cyl(.24, .24, .02, CUT, 0, .37, 0, seat, 9);
  const bucket = mk(-2.6, 2.4); cyl(.17, .14, .3, 0x6a4a2a, 0, .15, 0, bucket, 9); cyl(.15, .15, .02, 0x2f5a7a, 0, .29, 0, bucket, 9);
  // prateleira de lenha junto à forja (entrega): ao fundo da forja, a leste
  let rk = null; for (const [a, b] of [[6.4, -3.1], [8.1, -2.6], [5.2, -3.6], [9.6, -1.2], [7.0, 4.0]]) { const [x, z] = L(a, b); if (freeAt(x, z, 1.1)) { rk = [a, b]; break; } }
  if (!rk) rk = [6.4, -3.1];
  const rack = new THREE.Group(), [rx, rz] = L(rk[0], rk[1]); rack.position.set(rx, groundY(rx, rz), rz); rack.rotation.y = ang; rack.userData.dyn = 1; scene.add(rack);
  [[-.7, -.3], [.7, -.3], [-.7, .3], [.7, .3]].forEach(([x, z]) => box(.08, .9, .08, WOOD2, x, .45, z, rack)); box(1.5, .06, .7, WOOD2, 0, .05, 0, rack); box(1.5, .06, .06, WOOD2, 0, .85, -.3, rack);
  const rsticks = [];
  for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) { const s = box(.18, .16, .5, ((r + q) % 3) ? CUT : 0xc79a5a, -.55 + q * .22, .17 + r * .17, 0, rack); s.visible = false; rsticks.push(s); }
  // pilhas de lascas no chão
  for (let i = 0; i < 14; i++) { const [x, z] = pl(rnd(-1.5, 1.5), rnd(-1.5, 1.5)); const s = box(.1, .02, .05, CUT, x, groundY(x, z) + .015, z, scene); s.rotation.y = rnd(0, 6.28); s.userData.dyn = 1; }
  T.y = { ca, cb, pl, stump, axeOnStump, logOn, pile, logs, stack, sticks, loose, seat, bucket, rack, rsticks, rk, rackW: L(rk[0], rk[1] + 1.1), ang, stN: 0, rkN: 0 };
}

/** Machado: [cabo, cabeça] para anexar ao antebraço (cabo para baixo a partir da mão; lâmina para a frente) */
function mkAxe() {
  const h = new THREE.Group();
  box(.07, 1.05, .07, WOOD, 0, -.62, 0, h);
  box(.09, .05, .09, WOOD2, 0, -.12, 0, h);
  const head = new THREE.Group(); head.position.set(0, -1.08, .02); h.add(head);
  box(.08, .3, .14, IRON, 0, 0, 0, head); box(.04, .34, .08, 0xcfd3d8, 0, 0, .13, head); box(.1, .08, .1, IRON, 0, .16, -.04, head);
  return [h];
}

/** Cadeira, cesto de cordas, caixote com caneca e secador de redes, fora da taverna */
function buildChair(n) {
  const S = CTX.tavern, T = n.tr, K = 1.28;
  let c = null;
  for (const [a, b] of [[3.2, 4.15], [3.1, 4.4], [2.9, 4.7], [3.3, 5.0], [-3.2, 4.1], [-3.4, 4.6]]) { const [x, z] = S.at(a * K, b * K); if (freeAt(x, z, 1.3)) { c = [a * K, b * K]; break; } }
  if (!c) c = [3.2 * K, 4.15 * K];
  const [wx, wz] = S.at(c[0], c[1]);
  const root = new THREE.Group(); root.position.set(wx, groundY(wx, wz), wz); root.rotation.y = S.th; root.userData.dyn = 1; scene.add(root);
  // cadeira de madeira com encosto (o sentado olha para +z local, a frente da taverna)
  [[-.24, -.22], [.24, -.22], [-.24, .22], [.24, .22]].forEach(([x, z]) => box(.06, .38, .06, WOOD2, x, .19, z, root));
  box(.56, .05, .52, WOOD, 0, .4, 0, root);
  [-.24, .24].forEach(x => box(.06, .6, .06, WOOD2, x, .72, -.24, root)); [.62, .8, .98].forEach(y => box(.5, .07, .04, WOOD, 0, y, -.25, root));
  // cesto com novelo de cordas, caixote com caneca e peixe
  const bk = new THREE.Group(); bk.position.set(-1.5, 0, .3); root.add(bk); cyl(.24, .2, .26, 0x9a7a4a, 0, .13, 0, bk, 10); cyl(.2, .2, .02, 0x6a4a2a, 0, .26, 0, bk, 10);
  cyl(.15, .15, .14, TWINE, 0, .34, 0, bk, 8); box(.3, .02, .02, 0xb8a070, .05, .38, .1, bk);
  const cr = new THREE.Group(); cr.position.set(-.85, 0, .1); root.add(cr); box(.46, .38, .46, WOOD, 0, .19, 0, cr); box(.5, .04, .5, WOOD2, 0, .4, 0, cr);
  cyl(.06, .05, .13, 0x8a6a3a, -.1, .47, .05, cr, 8); box(.1, .04, .24, 0x8aa0b0, .1, .43, -.06, cr).rotation.y = .4;
  // secador de redes: dois postes e uma travessa, com redes prontas penduradas
  const dr = new THREE.Group(); dr.position.set(1.4, 0, .95); dr.rotation.y = .8 + Math.PI * 1.5; dr.scale.setScalar(.91); root.add(dr);
  [-.9, .9].forEach(x => box(.08, 1.7, .08, WOOD2, x, .85, 0, dr)); box(2, .07, .07, WOOD, 0, 1.62, 0, dr);
  [[-.5, .8, 1.15], [.45, .7, 1.05]].forEach(([x, w, h]) => { const nt = mkNet(w, h, 7, 7); nt.position.set(x, 1.6, .05); dr.add(nt); });
  // rede em produção (no colo): cresce ao longo do dia
  const net = mkNet(.82, .46, 9, 5, true); net.visible = false; net.userData.dyn = 1; n.g.add(net);
  T.c = { x: wx, z: wz, yaw: S.th, root, net, mug: null, K };
  // caneca e pão para o almoço (na mão)
  const mug = cyl(.06, .05, .13, 0x8a6a3a, 0, -.36, .1, null, 8); n.g.arm.fa.add(mug); mug.visible = false; T.c.mug = mug;
  const bread = box(.2, .09, .12, 0xc9964a, 0, -.36, .1, n.g.arm.fa); bread.visible = false; T.c.bread = bread;
}

/* ═══════════════════════ inicialização ═══════════════════════ */
export function tradeInit(n, kind) {
  n.tr = { kind, st: 'go', t: 0, still: false, face: null, sit: 0, bend: 0, carry: 0, bundle: 0, pose: 0, chopT: 0, hits: 0, goal: 3, logsDone: 0, anim: 0, last: 0, stk: 0, lunch: false, lunchDay: -1, q: 0 };
  hideSword(n.g);
  n.g.userData.dyn = 1;
  if (kind === 'wood') {
    buildYard(n);
    // machado na mão direita e tora/feixe carregados nos braços
    const [ax] = mkAxe(); ax.position.set(0, -.18, .02); ax.visible = false; n.g.arm.fa.add(ax); n.tr.axe = ax;
    const carry = new THREE.Group(); carry.visible = false; n.g.up.add(carry); n.tr.carryG = carry;
    const lg = cyl(.14, .14, 1.0, WOOD, 0, 0, 0, carry, 8); lg.rotation.z = Math.PI / 2; n.tr.carryLog = lg;
    const bd = new THREE.Group(); bd.visible = false; carry.add(bd); n.tr.carryBundle = bd;
    for (let i = 0; i < 6; i++) { const s = box(.17, .14, .55, i % 2 ? CUT : 0xc79a5a, (i % 3 - 1) * .2, Math.floor(i / 3) * .15 - .05, 0, bd); s.rotation.y = rnd(-.1, .1); }
    carry.position.set(0, .5, .42);
  } else buildChair(n);
}

/* ═══════════════════════ rotina ═══════════════════════ */
const gnd = (x, z) => groundY(x, z);
const dist = (n, x, z) => Math.hypot(n.g.position.x - x, n.g.position.z - z);
function walk(n, x, z) { n.tx = x; n.tz = z; n.tr.still = false; n.tr.face = null; }
function arrived(n, x, z, r = .45) { const T = n.tr; const d = dist(n, x, z); if (d < r) { T.stk = 0; return true; } if ((T.stk += 1 / 30) > 14) { n.g.position.x = x; n.g.position.z = z; T.stk = 0; return true; } return false; }   // travou 14 s: assenta no ponto
const goSt = (n, st) => { n.tr.st = st; n.tr.t = 0; };

/** Decide o estado a cada quadro (chamado só de dia, fora das cenas internas da taverna) */
export function tradeThink(n, dt, now, talking) {
  const T = n.tr; T.t += dt; T.last = hourNow();
  updChips(dt);
  if (T.kind === 'wood') woodThink(n, dt, talking); else netThink(n, dt, talking);
}

/** Anoitece: guarda tudo e levanta; devolve true enquanto ainda está terminando (o roteiro da noite só roda depois) */
export function tradeWind(n, dt) {
  const T = n.tr;
  T.still = true; T.face = null;
  updChips(dt);
  if (T.carry > 0 || T.bundle > 0) { T.carry = 0; T.bundle = 0; if (T.y) { T.y.logOn.visible = false; } }
  if (T.kind === 'wood') { if (T.y) T.y.axeOnStump.visible = true; if (T.axe) T.axe.visible = false; }
  else { if (T.c) { T.c.net.visible = false; T.c.mug.visible = false; T.c.bread.visible = false; } }
  T.sit = Math.max(0, T.sit - dt / 1.2); T.bend = Math.max(0, T.bend - dt / .6); T.pose = Math.max(0, T.pose - dt / .6);
  const busy = T.sit > 0 || T.bend > 0 || T.pose > 0;
  if (!busy) { T.st = 'go'; T.t = 0; T.still = false; T.stk = 0; T.hits = 0; T.logsDone = 0; if (T.y) { T.y.stN = 0; T.y.rkN = 0; refreshStacks(T); } if (T.c) T.c.netProg = 0; }
  return busy;
}

/* ─────────── Polly: tece rede de pesca sentada diante da taverna ─────────── */
function netThink(n, dt, talking) {
  const T = n.tr, c = T.c, g = n.g, h = hourNow();
  const seatP = [c.x, c.z], appr = [c.x + Math.sin(c.yaw) * 1.4, c.z + Math.cos(c.yaw) * 1.4];
  c.netProg = c.netProg || 0;
  switch (T.st) {
    case 'go': walk(n, appr[0], appr[1]); if (arrived(n, appr[0], appr[1], .6)) goSt(n, 'sitdown'); break;
    case 'sitdown': {   // vira de costas para a cadeira, senta e pega a rede
      T.still = true; T.face = [g.position.x + Math.sin(c.yaw) * 5, g.position.z + Math.cos(c.yaw) * 5];
      const k = cl(T.t / 1.8); T.sit = ss(k);
      g.position.x = lerp(g.position.x, seatP[0] + Math.sin(c.yaw) * .02, .05); g.position.z = lerp(g.position.z, seatP[1] + Math.cos(c.yaw) * .02, .05);
      if (k >= 1) { c.net.visible = true; T.pose = 1; goSt(n, 'weave'); T.goal = rnd(32, 55); }
      break;
    }
    default: {
      T.still = true; T.sit = Math.min(1, T.sit + dt / 1.2);
      g.position.x = lerp(g.position.x, seatP[0], .08); g.position.z = lerp(g.position.z, seatP[1], .08);
      // conversa: para de tecer e olha para o jogador
      if (talking) { T.st = 'talk'; T.face = [dxP(), dzP()]; break; }
      if (T.st === 'talk') { goSt(n, 'weave'); T.goal = rnd(20, 40); }
      T.face = [g.position.x + Math.sin(c.yaw) * 5, g.position.z + Math.cos(c.yaw) * 5];
      if (T.st === 'weave') {
        c.netProg = Math.min(1, c.netProg + dt / 420);   // a rede cresce ao longo do dia
        if (h >= 12 && h < 13 && T.lunchDay !== Math.floor(hourTotal() / 24)) { T.lunchDay = Math.floor(hourTotal() / 24); goSt(n, 'lunch'); break; }
        if (T.t > T.goal) { goSt(n, ['inspect', 'stretch', 'drink', 'inspect', 'look'][(Math.random() * 5) | 0]); }
      } else {
        const len = { inspect: 6, stretch: 4.2, drink: 6.5, lunch: 70, look: 5 }[T.st] || 5;
        if (T.t > len) { goSt(n, 'weave'); T.goal = rnd(32, 55); }
      }
    }
  }
}
import { CLOCK } from '../core/clock.js';
import { P } from './player.js';
const hourTotal = () => CLOCK.total;
const dxP = () => P.x, dzP = () => P.z;

/* ─────────── Breu: corta lenha para o ferreiro ─────────── */
function refreshStacks(T) {
  const Y = T.y; if (!Y) return;
  Y.sticks.forEach((s, i) => s.visible = i < Y.stN); Y.rsticks.forEach((s, i) => s.visible = i < Y.rkN);
  Y.logs.forEach((l, i) => l.visible = i < Y.logsLeft);
}
function woodThink(n, dt, talking) {
  const T = n.tr, Y = T.y, g = n.g, h = hourNow();
  if (Y.logsLeft === undefined) { Y.logsLeft = 10; refreshStacks(T); }
  Y.rkT = (Y.rkT || 0) + dt; if (Y.rkT > 40) { Y.rkT = 0; if (Y.rkN > 0 && !isNight()) { Y.rkN--; refreshStacks(T); } }   // o ferreiro queima a lenha
  const stand = Y.pl(0, 1.0), look = Y.pl(0, 0), pile = Y.pl(-2.7, 1.1), stk = Y.pl(2.0, .6), seatP = Y.pl(-1.6, 2.1), rkW = Y.rackW;
  const faceTo = (p) => { T.face = [p[0], p[1]]; };
  if (talking && ['chop', 'wipe', 'rest', 'lunch'].includes(T.st)) { T.talkPrev = T.st; T.st = 'talkw'; T.still = true; T.face = [P.x, P.z]; return; }
  if (T.st === 'talkw') { if (talking) { T.face = [P.x, P.z]; T.still = true; return; } T.st = T.talkPrev === 'chop' ? 'chop' : T.talkPrev; T.t = 0; }
  switch (T.st) {
    case 'go': walk(n, stand[0], stand[1]); if (arrived(n, stand[0], stand[1], .7)) { T.axe.visible = false; goSt(n, Y.logsLeft > 0 ? 'fetch' : 'restock'); } break;
    case 'fetch': walk(n, pile[0], pile[1]); if (arrived(n, pile[0], pile[1], .55)) { T.still = true; faceTo(Y.pl(-2.7, .3)); T.bend = Math.min(1, T.bend + dt / .5); if (T.bend >= 1 && T.t > .9) { Y.logsLeft--; refreshStacks(T); T.carry = 1; goSt(n, 'carry'); } } else T.t = 0; break;
    case 'carry': T.bend = Math.max(0, T.bend - dt / .6); walk(n, stand[0], stand[1]); if (arrived(n, stand[0], stand[1], .5)) { T.still = true; faceTo(look); goSt(n, 'place'); } break;
    case 'place': T.still = true; faceTo(look); T.bend = Math.min(1, T.bend + dt / .55); if (T.t > .85) { T.carry = 0; Y.logOn.visible = true; Y.axeOnStump.visible = false; T.axe.visible = true; T.hits = 0; T.goal = 3 + ((Math.random() * 2) | 0); T.chopT = 0; goSt(n, 'chop'); } break;
    case 'chop': {
      T.still = true; faceTo(look); T.bend = Math.max(0, T.bend - dt / .4);
      const prev = T.chopT; T.chopT += dt / 1.7;
      if (prev < .7 && T.chopT >= .7) {   // impacto
        T.hits++; const p = Y.pl(0, .1); chips(p[0], gnd(p[0], p[1]) + .62, p[1], 7, 1);
        Y.logOn.rotation.z = rnd(-.05, .05);
        if (T.hits >= T.goal) {   // a tora racha: duas metades voam para os lados
          Y.logOn.visible = false; chips(p[0], gnd(p[0], p[1]) + .6, p[1], 14, 1.5);
          [[-.55, .2], [.5, .35]].forEach(([a, b], i) => { const q = Y.pl(a, b - .1), s = Y.loose[i]; s.position.set(q[0], gnd(q[0], q[1]) + .2, q[1]); s.rotation.set(rnd(-1.2, 1.2), rnd(0, 6), rnd(-1.4, 1.4)); s.visible = true; });
          Y.looseN = 2; T.logsDone++; goSt(n, 'afterchop');
        }
      }
      if (T.chopT >= 1) T.chopT -= 1;
      break;
    }
    case 'afterchop': T.still = true; faceTo(look); T.chopT = 0; T.axe.visible = false; Y.axeOnStump.visible = true; if (T.t > .5) goSt(n, 'gather'); break;
    case 'gather': {   // junta as metades no chão
      const q = Y.pl(0, .9); walk(n, q[0], q[1]);
      if (arrived(n, q[0], q[1], .6)) { T.still = true; faceTo(Y.pl(0, -.3)); T.bend = Math.min(1, T.bend + dt / .5); if (T.t > 1.3) { Y.loose.forEach(s => s.visible = false); T.bundle = 1; goSt(n, 'stack'); } } else T.t = 0;
      break;
    }
    case 'stack': T.bend = Math.max(0, T.bend - dt / .6); walk(n, stk[0], stk[1]); if (arrived(n, stk[0], stk[1], .55)) { T.still = true; faceTo(Y.pl(3.2, .6)); T.bend = Math.min(1, T.bend + dt / .5); if (T.t > 1.6) { T.bundle = 0; Y.stN = Math.min(48, Y.stN + 2); refreshStacks(T); goSt(n, 'next'); } } break;
    case 'next': T.bend = Math.max(0, T.bend - dt / .5); T.still = true;
      if (T.t > .6) {
        if (h >= 12 && h < 13 && T.lunchDay !== Math.floor(CLOCK.total / 24)) { T.lunchDay = Math.floor(CLOCK.total / 24); goSt(n, 'lunchgo'); }
        else if (Y.stN >= 8 && Y.rkN < 20) goSt(n, 'pickup');
        else if (Y.logsLeft <= 0) goSt(n, 'restock');
        else if (T.logsDone % 3 === 0) goSt(n, 'wipe');
        else goSt(n, 'fetch');
      } break;
    case 'wipe': T.still = true; faceTo(look); if (T.t > 5.5) goSt(n, Y.logsLeft > 0 ? 'fetch' : 'restock'); break;
    case 'restock': {   // acabaram as toras: busca mais na floresta (some um tempo atrás da casa e volta com um carregamento)
      T.still = true; faceTo(pile); if (T.t > 3) { Y.logsLeft = 10; refreshStacks(T); goSt(n, 'fetch'); } break;
    }
    case 'pickup': {   // pega um braçado de lenha rachada na pilha
      walk(n, stk[0], stk[1]);
      if (arrived(n, stk[0], stk[1], .55)) { T.still = true; faceTo(Y.pl(3.2, .6)); T.bend = Math.min(1, T.bend + dt / .5); if (T.t > 1.3) { Y.stN = Math.max(0, Y.stN - 8); refreshStacks(T); T.bundle = 1; goSt(n, 'deliver'); } } else T.t = 0;
      break;
    }
    case 'deliver': T.bend = Math.max(0, T.bend - dt / .6); walk(n, rkW[0], rkW[1]); if (arrived(n, rkW[0], rkW[1], .7)) { T.still = true; faceTo(Y.rk && CTX.smith.at(Y.rk[0], Y.rk[1])); goSt(n, 'drop'); } break;
    case 'drop': T.still = true; T.bend = Math.min(1, T.bend + dt / .5); if (T.t > 1.6) { T.bundle = 0; Y.rkN = Math.min(24, Y.rkN + 8); refreshStacks(T); goSt(n, 'back'); } break;
    case 'back': T.bend = Math.max(0, T.bend - dt / .5); walk(n, stand[0], stand[1]); if (arrived(n, stand[0], stand[1], .8)) goSt(n, Y.logsLeft > 0 ? 'fetch' : 'restock'); break;
    case 'lunchgo': walk(n, seatP[0], seatP[1] - 0.0); if (arrived(n, seatP[0], seatP[1], .55)) { goSt(n, 'lunchsit'); } break;
    case 'lunchsit': { T.still = true; faceTo(Y.pl(-1.6, -3)); const k = cl(T.t / 1.4); T.sit = ss(k); n.g.position.x = lerp(n.g.position.x, seatP[0], .06); n.g.position.z = lerp(n.g.position.z, seatP[1], .06); if (k >= 1) goSt(n, 'lunch'); break; }
    case 'lunch': T.still = true; faceTo(Y.pl(-1.6, -3)); T.sit = Math.min(1, T.sit + dt / 1.2); n.g.position.x = lerp(n.g.position.x, seatP[0], .08); n.g.position.z = lerp(n.g.position.z, seatP[1], .08); if (T.t > 65) goSt(n, 'lunchup'); break;
    case 'lunchup': T.still = true; T.sit = Math.max(0, T.sit - dt / 1.3); if (T.sit <= 0) goSt(n, 'go'); break;
    case 'rest': goSt(n, 'go'); break;
  }
}
const isNight = () => { const h = hourNow(); return h >= 21 || h < 6; };

/* ═══════════════════════ pose ═══════════════════════ */
const setLegs = (g, tl, tr, kl, kr) => { g.legL.rotation.x = tl; g.legR.rotation.x = tr; g.legL.knee.rotation.x = kl; g.legR.knee.rotation.x = kr; };
let hipH0 = 0;

/** Aplica a pose do ofício por cima da marcha (chamado depois de gait()) */
export function tradePose(n, t, dt) {
  const T = n.tr, g = n.g, st = T.st, sit = ss(T.sit), bend = ss(T.bend);
  const walking = Math.hypot(n.vx || 0, n.vz || 0) > .25 && !T.still;
  
  // peças carregadas
  if (T.kind === 'wood') {
    T.carryG.visible = T.carry > 0 || T.bundle > 0; T.carryLog.visible = T.carry > 0; T.carryBundle.visible = T.bundle > 0;
    T.carryG.position.set(0, .5 + bend * -.08, .42);
  }
  if (!hipH0) { g.position.y = groundY(g.position.x, g.position.z); g.updateMatrixWorld(true); hipH0 = g.legL.getWorldPosition(new THREE.Vector3()).y - g.position.y; }
  const carrying = T.carry > 0 || T.bundle > 0;
  if (!T.still && !carrying) return;   // andando sem carga: a marcha comum cuida de tudo
  const base = groundY(g.position.x, g.position.z);
  if (!T.still) {   // andando com tora/feixe nos braços: só os braços e o tronco mudam, as pernas continuam andando
    g.arm.rotation.set(-1.15, 0, .25); g.arm.fa.rotation.x = -.85; g.armL.rotation.set(-1.15, 0, -.25); g.armL.fa.rotation.x = -.85; g.up.rotation.x = -.1;
    T.carryG.position.y = .5;
    return;
  }
  gaitReset(g);
  const arms = (ra, rf, la, lf) => { g.arm.rotation.set(ra, 0, 0); g.arm.fa.rotation.x = rf; g.armL.rotation.set(la, 0, 0); g.armL.fa.rotation.x = lf; };
  // ── agachado/curvado para pegar ou largar ──
  if (bend > .01 && !sit) {
    g.up.rotation.x = .95 * bend; setLegs(g, -.55 * bend, -.5 * bend, .95 * bend, .85 * bend);
    g.position.y = base - .26 * bend;
    if (T.carry > 0 || T.bundle > 0 || st === 'fetch' || st === 'gather' || st === 'pickup' || st === 'drop' || st === 'stack' || st === 'place') {
      arms(-1.25 * bend - .1, -.4 * bend, -1.25 * bend - .1, -.4 * bend);
      g.head.rotation.x = .1 * bend;
    }
    if (T.carryG) T.carryG.position.y = .5 - bend * .22;
  }
  // ── cortando lenha ──
  if (T.kind === 'wood' && st === 'chop') {
    const u = T.chopT, r = ss(cl(u / .45)), hold = ss(cl((u - .45) / .13)), s = ss(cl((u - .58) / .12)), rec = ss(cl((u - .72) / .28));
    const up = r * (1 - s) + hold * 0, lean = -.18 * r * (1 - s) + .62 * s * (1 - rec) + .08 * rec;
    const ra = -.7 - 2.25 * (r * (1 - s) + s * 0) + 1.95 * s * (1 - rec) * 0 - 0;   // levantar o machado
    const swing = lerp(lerp(-.7, -2.95, r), -.55, s), rest = lerp(swing, -.75, rec);
    g.arm.rotation.set(rest, 0, .06); g.arm.fa.rotation.x = lerp(-.35, -.75, r * (1 - s)) - .1 * s;
    g.armL.rotation.set(lerp(rest, rest * .9, .5) , 0, -.12); g.armL.fa.rotation.x = lerp(-.55, -.95, r * (1 - s));
    g.up.rotation.x = lean; g.head.rotation.x = .12 + .3 * s;
    setLegs(g, -.2 - .25 * s, .12, .35 + .3 * s, .3);
    g.position.y = base - .08 * s * (1 - rec);
    void up; void ra;
  }
  // ── passando a mão na testa / bebendo água ──
  if (st === 'wipe') {
    const k = (T.t % 5.5) / 5.5, w = ss(cl(k / .25)) * (1 - ss(cl((k - .85) / .15)));
    g.up.rotation.x = .1 * w; g.head.rotation.x = -.15 * w;
    g.armL.rotation.set(-2.25 * w, 0, -.2 * w); g.armL.fa.rotation.x = -1.9 * w + Math.sin(t * 6) * .12 * w;
    g.arm.rotation.set(-.3 - .3 * w, 0, 0); g.arm.fa.rotation.x = -.5;
    if (T.axe) T.axe.visible = false;
  }
  if (st === 'restock') { g.up.rotation.x = -.12 + Math.sin(t * 1.4) * .02; g.arm.rotation.set(-.2, 0, .1); g.armL.rotation.set(-.2, 0, -.1); g.head.rotation.y = Math.sin(t * .8) * .4; }
  // ── sentado ──
  if (sit > .01) {
    gaitReset(g);
    const peg = T.kind === 'net';
    setLegs(g, -1.5 * sit, (peg ? -1.28 : -1.45) * sit, 1.45 * sit, (peg ? .25 : 1.35) * sit);
    g.legL.rotation.z = -.05 * sit; g.legR.rotation.z = (peg ? .22 : .05) * sit;
    const seatH = .38;
    g.position.y = base + seatH + .06 - hipH0 * 1 + (hipH0 - hipH0 * (1 - sit)) * 0 - (1 - sit) * (seatH + .06 - hipH0) * 1;
    g.position.y = lerp(base, base + seatH + .06 - hipH0, sit);
    if (T.kind === 'net') netPose(n, t, sit);
    else lunchPose(n, t, sit);
  }
}

/** Polly sentada: tece a rede (mãos alternadas), de vez em quando confere a malha, se espreguiça, bebe ou olha a rua */
function netPose(n, t, sit) {
  const T = n.tr, g = n.g, c = T.c, st = T.st, pose = ss(T.pose);
  const arms = (ra, rf, la, lf, rz = 0, lz = 0) => { g.arm.rotation.set(ra, 0, rz); g.arm.fa.rotation.x = rf; g.armL.rotation.set(la, 0, lz); g.armL.fa.rotation.x = lf; };
  c.net.visible = !['lunch'].includes(st) && T.pose > .02;
  const prog = c.netProg || 0;
  c.net.scale.set(1, .42 + prog * .95, 1);
  c.net.position.set(0, .72 * 1, .5);   // borda de cima, entre as mãos (espaço do corpo, que desce com o sentar)
  c.mug.visible = c.bread.visible = false;
  let lean = .24, headX = .52, headY = Math.sin(t * .35) * .12;
  if (st === 'weave' || st === 'talk' || st === 'sitdown') {
    const f = st === 'talk' ? .15 : 1, ph = t * 2.3, push = Math.max(0, Math.sin(t * 4.6)), pull = ss(cl(Math.sin(t * .9 + .5) * 1.8 - .8, 0, 1));
    arms(lerp(-.55, -1.02, sit) + Math.sin(ph) * .06 * f - pull * .3 * f, lerp(-.5, -1.25, sit) + push * .3 * f + pull * .5 * f, lerp(-.5, -.98, sit) + Math.sin(ph + 1.4) * .05 * f, lerp(-.5, -1.3, sit) + Math.sin(t * 4.6 + 2) * .16 * f, .04 - pull * .25 * f, -.04);
    headX = .5 + Math.sin(t * .8) * .05 * f; if (st === 'talk') { headX = .1; headY = Math.atan2(P.x - n.g.position.x, P.z - n.g.position.z) * 0 + Math.sin(t * 1.7) * .08; lean = .08; }
  } else if (st === 'inspect') {   // levanta a rede com as duas mãos e confere a malha contra a luz
    const k = cl(T.t / 6), a = ss(cl(k / .2)) * (1 - ss(cl((k - .8) / .2)));
    arms(-1.02 - 1.0 * a, -1.25 - .15 * a, -.98 - 1.05 * a, -1.3 - .1 * a, .04, -.04);
    headX = .5 - .75 * a; headY = Math.sin(t * 1.3) * .22 * a; lean = .24 - .3 * a;
    c.net.position.y = .72 + .35 * a; c.net.position.z = .5 + .05 * a;
  } else if (st === 'stretch') {   // espreguiça: braços para o alto, costas arqueadas, bocejo
    const k = cl(T.t / 4.2), a = ss(cl(k / .3)) * (1 - ss(cl((k - .75) / .25)));
    arms(-1.02 - 2.0 * a, -1.25 + .9 * a, -.98 - 2.0 * a, -1.3 + .95 * a, .05 + .35 * a, -.05 - .35 * a);
    lean = .24 - .5 * a; headX = .5 - .9 * a; headY = 0; c.net.position.y = .55 - .1 * a;
  } else if (st === 'drink') {   // pega a caneca no caixote ao lado, bebe e devolve
    const k = cl(T.t / 6.5), a = ss(cl(k / .22)), b = ss(cl((k - .3) / .15)) * (1 - ss(cl((k - .6) / .14))), r = 1 - ss(cl((k - .78) / .2));
    c.mug.visible = k > .12 && k < .88;
    arms(-1.02 + .5 * a * 0 - 1.3 * b * 0, -1.25, -.98, -1.3, .04, -.04);
    g.arm.rotation.set(lerp(-1.02, -.75, a) - .5 * b, 0, lerp(.04, -.45, a) * (1 - b) + .1 * b); g.arm.fa.rotation.x = lerp(-1.25, -.5, a) - 1.1 * b;
    headX = .5 - .5 * b; lean = .24 - .1 * b; void r;
  } else if (st === 'look') {   // levanta os olhos da rede e observa a praça
    const k = cl(T.t / 5), a = ss(cl(k / .2)) * (1 - ss(cl((k - .8) / .2)));
    headX = .5 - .5 * a; headY = Math.sin(t * .9) * .55 * a; lean = .24 - .14 * a;
    arms(-1.02 + .1 * a, -1.25, -.98, -1.3, .04, -.04);
  } else if (st === 'lunch') {   // almoço: pão numa mão, caneca na outra
    c.mug.visible = false; c.bread.visible = true;
    const k = (T.t % 9) / 9, b = ss(cl(k / .2)) * (1 - ss(cl((k - .35) / .15)));
    g.arm.rotation.set(-.6 - 1.0 * b, 0, -.15 * b); g.arm.fa.rotation.x = -.9 - 1.0 * b;
    g.armL.rotation.set(-.4, 0, -.1); g.armL.fa.rotation.x = -.9;
    headX = .12 - .12 * b; lean = .08 + .04 * Math.sin(t * 5) * b; headY = Math.sin(t * .3) * .25;
  }
  g.up.rotation.set(lean * sit, Math.sin(t * .4) * .03, 0);
  g.head.rotation.set(headX * sit, headY * sit, 0);
}

/** Breu sentado no banquinho: bebe água da caneca e come pão enquanto descansa */
function lunchPose(n, t, sit) {
  const T = n.tr, g = n.g, st = T.st;
  g.up.rotation.set(.12 * sit, 0, 0);
  const k = (T.t % 10) / 10, b = ss(cl(k / .2)) * (1 - ss(cl((k - .4) / .18))), d = ss(cl((k - .6) / .12)) * (1 - ss(cl((k - .85) / .12)));
  g.arm.rotation.set(-.6 - .9 * b - .5 * d, 0, -.1 * (b + d)); g.arm.fa.rotation.x = -1 - 1.0 * (b + d);
  g.armL.rotation.set(-.55, 0, -.12); g.armL.fa.rotation.x = -.8;
  g.head.rotation.set(.15 - .15 * (b + d), Math.sin(t * .35) * .3, 0);
  if (T.carryG) T.carryG.visible = false;
  const m = n.tr.axe; if (m) m.visible = false;
  void st;
}
