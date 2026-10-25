/* Rotina dos fazendeiros: acordam, alimentam os animais, cuidam e colhem a lavoura, almoçam, voltam aos bichos,
   acendem os lampiões e dormem. Cada tarefa é uma lista de pontos (com ação e tempo de parada) percorrida em ciclo;
   a tarefa só muda quando o fazendeiro volta a um ponto seguro (pátio), para não atravessar cercas. */
import { M } from '../core/utils.js';
import { hourNow, CLOCK } from '../core/clock.js';

const lerp = (a, b, t) => a + (b - a) * t;
const box = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); p.add(m); return m; };

/** Ferramentas na mão: enxada (direita), cesto/balde (esquerda) */
export function initFarmer(n, rt) {
  const g = n.g;
  g.arm.fa.children.forEach(c => { if (c.geometry && c.geometry.parameters.height === .95) c.visible = false; });
  const hoe = new THREE.Group();
  box(.05, 1.3, .05, 0x7a5430, 0, -.1, .1, hoe); box(.3, .05, .14, 0x8a8a90, 0, -.74, .1, hoe);
  hoe.position.set(0, -.32, 0); hoe.rotation.x = -.6; hoe.visible = false; g.arm.fa.add(hoe);
  const bucket = new THREE.Group();
  box(.32, .3, .32, 0x6a6a70, 0, -.15, 0, bucket); box(.26, .04, .26, 0x4a90c8, 0, -.01, 0, bucket);
  bucket.position.set(0, -.46, .08); bucket.visible = false; g.armL.fa.add(bucket);
  const basket = new THREE.Group();
  box(.46, .24, .36, 0xb8864a, 0, -.12, 0, basket);
  [[0xe8862a, -.12], [0xd8b848, 0], [0x6ab04a, .12]].forEach(([c, x]) => box(.12, .12, .12, c, x, .04, 0, basket));
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
    if (want.kind !== 'home' && R.hide) { R.hide = false; n.g.position.set(R.door.x, 0, R.door.z); n.tx = R.door.x; n.tz = R.door.z; }
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

/** Pose do trabalho por cima da marcha (chamada depois de gait) */
export function farmerPose(n, t, dt) {
  const R = n.rt, g = n.g, working = R.act && (n.spd || 0) < .25;
  const a = working ? R.act : null;
  R.w += ((a ? 1 : 0) - R.w) * (1 - Math.exp(-dt * 7));
  const w = R.w, s = Math.sin(t);
  let lean = 0, ax = 0, afx = 0, lx = 0, lfx = 0, sit = 0;
  if (a === 'pour') { lean = .55; ax = -1; afx = -.4; lx = -1.05; lfx = -.5 - (Math.sin(t * .9) * .5 + .5) * .9; }
  else if (a === 'tend') { lean = .4; ax = -.95 + Math.sin(t * 4) * .55; afx = -.35; lx = -.45; lfx = -.3; }
  else if (a === 'pick') { lean = .85; ax = -1.25 + Math.sin(t * 7) * .35; afx = -.3; lx = -1.2 + Math.sin(t * 7 + 3) * .35; lfx = -.3; }
  else if (a === 'brush') { lean = .3; ax = -.85 + Math.sin(t * 6) * .5; afx = -.4; lx = -.35; lfx = -.25; }
  else if (a === 'store') { lean = .1; ax = -.5; afx = -.2; lx = -.7; lfx = -.5; }
  else if (a === 'light') { lean = -.05; ax = -2.5; afx = -.2; lx = .1; lfx = -.1; }
  else if (a === 'eat') { sit = 1; ax = -1.3 - Math.max(0, Math.sin(t * 1.3)) * .5; afx = -1.2; lx = -.3; lfx = -.2; }
  else if (a === 'sit') { sit = 1; ax = -.2; lx = -.2; }
  if (a) {
    R.lastP = { lean, ax, afx, lx, lfx, sit };
  }
  const P = R.lastP || { lean: 0, ax: 0, afx: 0, lx: 0, lfx: 0, sit: 0 };
  g.up.rotation.x = lerp(g.up.rotation.x, P.lean, w);
  g.arm.rotation.x = lerp(g.arm.rotation.x, P.ax, w);
  g.arm.fa.rotation.x = lerp(g.arm.fa.rotation.x, P.afx, w);
  g.armL.rotation.x = lerp(g.armL.rotation.x, P.lx, w);
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
  R.basket.visible = R.carry || ac === 'pick';
  R.lastAct = ac || R.lastAct;
}

/** Lavoura: cada fileira rebrota depois de colhida (growth 0..1 com o relógio do jogo) */
export function growth(fld, r) { return Math.max(.2, Math.min(1, (CLOCK.total - fld.cut[r]) / 10)); }
export function refreshField(fld) {
  fld.cells.forEach(c => {
    const gr = growth(fld, c.r);
    if (Math.abs(gr - c.gr) < .04 && c.gr != null) return;
    c.gr = gr;
    if (c.sph) c.mesh.scale.setScalar(.35 + .65 * gr);
    else { c.mesh.scale.y = gr; c.mesh.position.y = c.y0 - c.hh * (1 - gr); }
  });
}
