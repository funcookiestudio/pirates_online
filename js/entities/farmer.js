/* Rotina dos fazendeiros: acordam, alimentam os animais, cuidam e colhem a lavoura, almoçam, voltam aos bichos,
   acendem os lampiões e dormem. Cada tarefa é uma lista de pontos (com ação e tempo de parada) percorrida em ciclo;
   a tarefa só muda quando o fazendeiro volta a um ponto seguro (pátio), para não atravessar cercas. */
import { M } from '../core/utils.js';
import { hideSword } from './character.js';
import { cropGeo, stageOf } from './crops.js';
import { hourNow, CLOCK } from '../core/clock.js';
import { lieDown, standFromBed, makeZzz } from './sleep.js';

const lerp = (a, b, t) => a + (b - a) * t;
const box = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); p.add(m); return m; };

/** Ferramentas na mão: enxada (direita), cesto/balde (esquerda) */
export function initFarmer(n, rt) {
  const g = n.g;
  hideSword(g);
  const hoe = new THREE.Group();
  box(.05, 1.3, .05, 0x7a5430, 0, -.1, .1, hoe); box(.3, .05, .14, 0x8a8a90, 0, -.74, .1, hoe);
  hoe.position.set(0, -.32, 0); hoe.rotation.x = -.6; hoe.visible = false; g.arm.fa.add(hoe);
  const bucket = new THREE.Group();
  box(.32, .3, .32, 0x6a6a70, 0, -.15, 0, bucket); box(.26, .04, .26, 0x4a90c8, 0, -.01, 0, bucket);
  bucket.position.set(0, -.46, .08); bucket.visible = false; g.armL.fa.add(bucket);
  const basket = new THREE.Group();
  box(.46, .24, .36, 0xb8864a, 0, -.12, 0, basket);
  [[0xe8862a, -.12], [0xd8b848, 0], [0x6ab04a, .12]].forEach(([c, x]) => box(.12, .12, .12, c, x, .04, 0, basket));
  box(.34, .06, .26, 0xe8c040, 0, .02, 0, basket); box(.1, .08, .1, 0xf4d860, .1, .08, .04, basket);
  basket.position.set(0, -.5, .2); basket.visible = false; g.armL.fa.add(basket);
  n.rt = Object.assign(rt, { hoe, bucket, basket, i: 0, dw: 0, ent: null, hide: false, carry: false, w: 0, act: null, p: { lean: 0, sit: 0 } });
}

const inEntry = (e, h) => e.h0 <= e.h1 ? h >= e.h0 && h < e.h1 : h >= e.h0 || h < e.h1;

/** Decide para onde ir / o que fazer. `near` = jogador por perto (para e conversa). Retorna true se está parado trabalhando */
export function farmerThink(n, dt, near) {
  const R = n.rt, h = hourNow();
  let want = R.sched.find(e => inEntry(e, h)) || R.sched[0];
  if (R.ent !== want && (!R.ent || R.safe)) {   // troca de tarefa só em ponto seguro
    R.ent = want; R.i = 0; R.dw = 0; R.safe = false;
    if (want.kind !== 'home' && R.hide) { R.hide = false; if (R.bed) { R.sk = 0; standFromBed(n.g); R.zz && R.zz.update(0, 0, 0, 0, false); } n.g.position.set(R.door.x, 0, R.door.z); n.tx = R.door.x; n.tz = R.door.z; }
  }
  const e = R.ent;
  if (R.hide) { n.g.visible = false; R.act = null; return true; }
  const pt = e.pts[R.i % e.pts.length];
  n.tx = pt.x; n.tz = pt.z;
  const d = Math.hypot(pt.x - n.g.position.x, pt.z - n.g.position.z);
  if (d < (pt.act ? .45 : .7)) {
    R.act = pt.act || null; R.face = pt.face;
    R.safe = !pt.ns;
    if (near && !R.act) return false;
    R.dw += dt;
    if (R.dw >= (pt.dw || 0)) {
      R.dw = 0; R.i++;
      if (pt.cut != null) R.cutRow(pt.cut);
      if (pt.take) R.carry = true;
      if (pt.drop) R.carry = false;
      if (pt.hide) { R.hide = true; }
      R.safe = !pt.ns;   // pontos dentro dos cercados não são seguros para trocar de tarefa
      if (R.i >= e.pts.length) R.i = 0;
    }
    return !!R.act;
  }
  R.act = null; R.dw = 0;
  R.safe = false;
  return false;
}

/** Onde o milho cai (as aves do cercado correm até lá e bicam): atualizado enquanto a fazendeira joga */
export const FEED = { on: false, x: 0, z: 0, t: 0 };

/** Grãos de milho jogados às aves: arcos curtos saindo da mão (pool de 10 cubinhos amarelos) */
function tossGrain(n, t, dt, on) {
  const R = n.rt, g = n.g, par = g.parent;
  if (!par) return;
  if (!R.gr) { R.gr = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .07), M(i % 3 ? 0xe8c040 : 0xf4d860)); m.visible = false; par.add(m); R.gr.push({ m, v: new THREE.Vector3(), on: false }); } R.gph = 0; }
  const ph = Math.sin(t * 4.5);
  if (on) { const ry = g.rotation.y; FEED.x = g.position.x + Math.sin(ry) * 2.4; FEED.z = g.position.z + Math.cos(ry) * 2.4; FEED.t = performance.now(); }
  if (on && ph > .6 && !R.gUp) { R.gUp = true; for (let k = 0; k < 3; k++) { const q = R.gr.find(o => !o.on); if (!q) break; g.arm.fa.localToWorld(q.m.position.set((Math.random() - .5) * .1, -.5, 0)); par.worldToLocal(q.m.position);
    const ry = g.rotation.y + (Math.random() - .5) * .9, sp = 1.6 + Math.random() * 1.5; q.v.set(Math.sin(ry) * sp, 2.3 + Math.random() * .8, Math.cos(ry) * sp); q.on = true; q.m.visible = true; } }
  if (ph < .1) R.gUp = false;
  const y0 = g.position.y;
  R.gr.forEach(q => { if (!q.on) return; q.v.y -= 9 * dt; q.m.position.addScaledVector(q.v, dt); q.m.rotation.x += dt * 9; if (q.v.y < 0 && q.m.position.y < y0 + .06) { q.on = false; q.m.visible = false; } });
}

/** À noite a fazendeira dorme na cama da casa: deita de costas, olhos fechados, "Zzz" sobem da cabeça */
export function farmerSleep(n, t, dt) {
  const R = n.rt, b = R.bed, g = n.g;
  R.sk = Math.min(1, (R.sk || 0) + dt / 1.6);
  g.visible = true; g.position.set(b.x, b.y, b.z); g.rotation.y = b.ry;
  lieDown(g, R.sk, t);
  const zz = R.zz || (R.zz = makeZzz());
  zz.update(b.x - Math.sin(b.ry) * 1.7, b.y + .55, b.z - Math.cos(b.ry) * 1.7, t, R.sk > .95);
}

/** Pose do trabalho por cima da marcha (chamada depois de gait) */
export function farmerPose(n, t, dt) {
  const R = n.rt, g = n.g, working = R.act && (n.spd || 0) < .25;
  const a = working ? R.act : null;
  R.w += ((a ? 1 : 0) - R.w) * (1 - Math.exp(-dt * 7));
  const w = R.w, s = Math.sin(t);
  let lz = 0, az = 0, lean = 0, ax = 0, afx = 0, lx = 0, lfx = 0, sit = 0;
  if (a === 'pour') { lean = .55; ax = -1; afx = -.4; lx = -1.05; lfx = -.5 - (Math.sin(t * .9) * .5 + .5) * .9; }
  else if (a === 'tend') { lean = .4; ax = -.95 + Math.sin(t * 4) * .55; afx = -.35; lx = -.45; lfx = -.3; }
  else if (a === 'pick') { lean = .85; ax = -1.25 + Math.sin(t * 7) * .35; afx = -.3; lx = -1.2 + Math.sin(t * 7 + 3) * .35; lfx = -.3; }
  else if (a === 'brush') { lean = .3; ax = -.85 + Math.sin(t * 6) * .5; afx = -.4; lx = -.35; lfx = -.25; }
  else if (a === 'throw') {            // mão esquerda segura o cesto; a direita pega o milho nele e joga
    const u = (Math.sin(t * 4.5) + 1) / 2;
    lean = .2; ax = -.6 - 1.2 * u; afx = -1.3 + 1.1 * u; az = 1.9 * (1 - u); lz = -.55; lx = -.8; lfx = -1.0;
  }
  else if (a === 'store') { lean = .1; ax = -.5; afx = -.2; lx = -.7; lfx = -.5; }
  else if (a === 'light') { lean = -.05; ax = -2.5; afx = -.2; lx = .1; lfx = -.1; }
  else if (a === 'eat') { sit = 1; ax = -1.3 - Math.max(0, Math.sin(t * 1.3)) * .5; afx = -1.2; lx = -.3; lfx = -.2; }
  else if (a === 'sit') { sit = 1; ax = -.2; lx = -.2; }
  if (a) {
    R.lastP = { lz, az, lean, ax, afx, lx, lfx, sit };
  }
  const P = R.lastP || { lz: 0, az: 0, lean: 0, ax: 0, afx: 0, lx: 0, lfx: 0, sit: 0 };
  g.up.rotation.x = lerp(g.up.rotation.x, P.lean, w);
  g.arm.rotation.x = lerp(g.arm.rotation.x, P.ax, w);
  g.arm.rotation.z = lerp(g.arm.rotation.z, P.az || 0, w);
  g.arm.fa.rotation.x = lerp(g.arm.fa.rotation.x, P.afx, w);
  g.armL.rotation.x = lerp(g.armL.rotation.x, P.lx, w);
  g.armL.rotation.z = lerp(g.armL.rotation.z, P.lz || 0, w);
  g.armL.fa.rotation.x = lerp(g.armL.fa.rotation.x, P.lfx, w);
  g.head.rotation.x = Math.min(0, -P.lean * .6) * w;
  if (P.sit) {
    g.legL.rotation.x = lerp(g.legL.rotation.x, -1.45, w); g.legR.rotation.x = lerp(g.legR.rotation.x, -1.45, w);
    g.legL.knee.rotation.x = lerp(g.legL.knee.rotation.x, 1.45, w); g.legR.knee.rotation.x = lerp(g.legR.knee.rotation.x, 1.45, w);
    g.position.y -= .42 * w;
  }
  if (R.face != null && a && (n.spd || 0) < .25) g.rotation.y += Math.atan2(Math.sin(R.face - g.rotation.y), Math.cos(R.face - g.rotation.y)) * (1 - Math.exp(-dt * 6));
  const ac = R.act;
  R.hoe.visible = ac === 'tend';
  R.bucket.visible = ac === 'pour' || (w > .1 && R.lastAct === 'pour' && !ac);
  R.basket.visible = R.carry || ac === 'pick' || (ac === 'store' && R.ent && R.ent.kind === 'feed');
  tossGrain(n, t, dt, ac === 'throw' && w > .6);
  R.lastAct = ac || R.lastAct;
}

/** Lavoura: cada fileira rebrota depois de colhida (growth 0..1 com o relógio do jogo) */
export function growth(fld, r) { return Math.max(.2, Math.min(1, (CLOCK.total - fld.cut[r]) / 10)); }
export function refreshField(fld) {
  fld.cells.forEach(c => {
    const gr = growth(fld, c.r);
    if (Math.abs(gr - c.gr) < .04 && c.gr != null) return;
    c.gr = gr;
    const st = stageOf(gr);
    if (st !== c.st) { c.st = st; c.mesh.geometry = cropGeo(c.crop, st, .8 * c.sc); }
  });
}
