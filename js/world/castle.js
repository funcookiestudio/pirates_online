/* Castelo (c. 1720–1750): fortaleza pequena de pedra com quatro torres, portal duplo, grande salão com tapete vermelho,
   palco de 3 degraus com os tronos do rei e da rainha, alas laterais (armaria e cozinha) e, no andar de cima, seis quartos
   ao longo de galerias que dão para o salão. Duas escadas largas sobem pelas paredes do salão.
   Coordenadas locais em metros: +z aponta para a vila (fachada), x cresce para a direita de quem entra. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps } from './floors.js';
import { addDoor } from './doors.js';
import { P } from '../entities/player.js';
import { CASTLE } from './reserve.js';
import { VILLAGE_R } from '../core/village-const.js';
import { pois } from './pois.js';

const HX = 14, HZ = 11.5, HF = 4.4, HU = 8.8, SL = .3;   // meia-largura, meia-profundidade, piso de cima, topo das paredes
const DAIS_Z = -6.95;                                    // borda do palco (3 degraus de 0,2 m, 0,45 m de profundidade)
const RAMP = { z0: 8.5, z1: .5, zl: -1.5 };              // escada: pé em z=8,5, topo em z=0,5, patamar até -1,5

export { CASTLE };

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Altura do chão em (lx,lz) locais: palco, rampas das escadas e andar de cima */
function hf(lx, lz, setUp) {
  const ax = Math.abs(lx);
  if (ax >= 4.8 && ax <= 7 && lz >= RAMP.zl && lz <= RAMP.z0 + .4) {
    if (lz < .9 && !P.up) setUp(true);
    else if (lz > 7.9 && P.up) setUp(false);
    return HF * Math.min(1, Math.max(0, (RAMP.z0 - lz) / (RAMP.z0 - RAMP.z1)));
  }
  if (P.up) return HF;
  if (lz < DAIS_Z && ax < 6.6) {
    const t = (DAIS_Z - lz) / .45;
    return .2 * Math.min(3, Math.floor(t) + smooth(.75, 1, t - Math.floor(t)));
  }
  return 0;
}

/** Clique perto das escadas: sobe/desce com o percurso roteirizado (as escadas atravessam as colisões) */
function sc(lx, lz) {
  const s = lx < 0 ? -1 : 1, ax = Math.abs(lx);
  if (!P.up && ax >= 3.6 && ax <= 7.4 && lz > 4.6 && lz < 10.6)
    return { A: [s * 3.9, 9.7], pts: [[s * 5.9, 9.7], [s * 5.9, 8.4], [s * 5.9, .6], [s * 5.9, -.5], [s * 7.7, -.5], [s * 8.3, -.5]] };
  if (P.up && ax >= 4.4 && ax <= 9.2 && lz > -2.4 && lz < 9)
    return { A: [s * 8.3, -.5], pts: [[s * 7.7, -.5], [s * 5.9, -.5], [s * 5.9, .6], [s * 5.9, 8.4], [s * 5.9, 9.7], [s * 3.9, 9.7]] };
  return null;
}

export function buildCastle() {
  if (!CASTLE.ok) return;
  const { x, z, th } = CASTLE;
  pois.push({ n: 'Castelo', x, z, c: '#e0586a', ic: '🏰' });
  const root = new THREE.Group();
  root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); root.add(S);
  const DR = [];

  // paleta
  const STONE = 0x8c8a82, STONE2 = 0x77756e, STONE3 = 0xa09e94, DSTONE = 0x5e5c56, PL = 0xd9ceb2, TM = 0x4a3320, WOOD = 0x8a6238, WOOD2 = 0x6e4d2c, DARK = 0x3f2a1a,
    IRON = 0x2b2b30, GOLD = 0xd4a830, RED = 0x9a1f24, RED2 = 0x6e1318, BLUE = 0x1f3a6a, ROOFC = [0x4a5260, 0x555d6b, 0x424a58, 0x5e6675];
  let XR = false;
  const M = (c, e) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }); return XR ? xray(m) : m; };
  const B = (w, h, d, x, y, z, c, p, e) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || S).add(m); return m; };
  const C = (rt, rb, h, n, x, y, z, c, p, e) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || S).add(m); return m; };
  const W = (ax, f, u, y, l, h, t, c, g) => ax === 'x' ? B(l, h, t, u, y, f, c, g) : B(t, h, l, f, y, u, c, g);
  const tr = (m, o) => { m.material.transparent = true; m.material.opacity = o; return m; };

  // ── parede de pedra com aberturas (ops: {c, w, y0, y1}); fiadas de pedra a cada 0,55 m ──
  function wall(ax, f, a0, a1, ops, g, y0, y1, T, c1 = STONE, c2 = DSTONE) {
    ops = ops.slice().sort((a, b) => a.c - b.c);
    const seg = (u0, u1, ya, yb) => {
      const l = u1 - u0, h = yb - ya; if (l < .02 || h < .02) return;
      const u = (u0 + u1) / 2;
      W(ax, f, u, (ya + yb) / 2, l, h, T, c1, g);
      for (let yy = ya + .55; yy < yb - .05; yy += .55) W(ax, f, u, yy, l, .06, T + .04, c2, g);
    };
    let cur = a0;
    for (const o of ops) { const l0 = o.c - o.w / 2, l1 = o.c + o.w / 2; seg(cur, l0, y0, y1); seg(l0, l1, y0, o.y0); seg(l0, l1, o.y1, y1); cur = l1; }
    seg(cur, a1, y0, y1);
  }
  function win(ax, f, c, w, ya, yb, g, T, glass) {
    const h = yb - ya, y = (ya + yb) / 2;
    W(ax, f, c - w / 2 - .1, y, .2, h + .2, T + .16, STONE3, g); W(ax, f, c + w / 2 + .1, y, .2, h + .2, T + .16, STONE3, g);
    W(ax, f, c, yb + .1, w + .4, .2, T + .16, STONE3, g); W(ax, f, c, ya - .07, w + .4, .14, T + .3, STONE3, g);
    W(ax, f, c, yb + .27, .3, .16, T + .2, STONE3, g);
    tr(W(ax, f, c, y, w, h, .04, glass || 0xbfe0f0, g), .5);
    W(ax, f, c, y, .06, h, .1, IRON, g); W(ax, f, c, y, w, .06, .1, IRON, g);
  }
  function portal(ax, f, c, w, h, g, T) {
    W(ax, f, c - w / 2 - .15, h / 2, .3, h + .1, T + .2, STONE3, g); W(ax, f, c + w / 2 + .15, h / 2, .3, h + .1, T + .2, STONE3, g);
    W(ax, f, c, h + .15, w + .8, .3, T + .24, STONE3, g);
  }
  // folha de porta de tábuas com ferragens; hinge 'l' = dobradiça à esquerda
  function leaf(o) {
    const { ax, f, c, w, h, yb = 0, g, id, lvl, openRot, hinge = 'l' } = o;
    const p = new THREE.Group();
    const base = ax === 'z' ? -Math.PI / 2 : hinge === 'l' ? 0 : Math.PI;
    const hc = hinge === 'l' ? c - w / 2 : c + w / 2;
    if (ax === 'z') p.position.set(f, yb, hc); else p.position.set(hc, yb, f);
    p.rotation.y = base; g.add(p);
    for (let i = 0; i < 5; i++) B(w / 5 - .012, h - .06, .09, w / 5 * (i + .5), h / 2, 0, i % 2 ? 0x6b4a2b : 0x5c3f24, p);
    B(w, .14, .11, w / 2, .5, .01, IRON, p); B(w, .14, .11, w / 2, h - .5, .01, IRON, p); B(w, .08, .11, w / 2, h / 2, .01, TM, p);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.08, .018, 4, 8), M(IRON)); r.position.set(w - .2, 1.1, .1); p.add(r);
    const d = { p, g, openRot, c, f, w, lvl, id, ax, base };
    DR.push(d); return d;
  }

  // ───────────────────────── estrutura ─────────────────────────
  const front = new THREE.Group(), roof = new THREE.Group(), up = new THREE.Group();
  const gF = new THREE.Group(), gB = new THREE.Group(), gL = new THREE.Group(), gR = new THREE.Group(), dGL = new THREE.Group(), dGR = new THREE.Group();
  const uF = new THREE.Group(), uB = new THREE.Group(), uL = new THREE.Group(), uR = new THREE.Group(), dUL = new THREE.Group(), dUR = new THREE.Group();
  S.add(front, roof, up); front.add(gF, gB, gL, gR, dGL, dGR); up.add(uF, uB, uL, uR, dUL, dUR);

  XR = true;
  // fundação e piso de pedra do salão (xadrez de lajes), alas com tábuas
  B(2 * HX + 2.4, .5, 2 * HZ + 2.4, 0, -.22, 0, DSTONE);
  for (let i = -6; i <= 6; i++) for (let j = -10; j <= 10; j++) if (Math.abs(i * 1.1) < 7.2) B(1.08, .06, 1.08, i * 1.1, .03, j * 1.1 + .55, (i + j) & 1 ? 0x8a877e : 0x79766d);
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) B(.68, .05, 2 * HZ - .4, s * (7.4 + i * .68), .04, 0, i & 1 ? 0x6a5038 : 0x78593d);

  // muros externos do térreo (T = 0,8)
  const T = .8, TD = .6;
  wall('x', HZ, -HX, HX, [{ c: 0, w: 3.4, y0: 0, y1: 3.7 }, { c: -10.5, w: .8, y0: 1.4, y1: 3.4 }, { c: 10.5, w: .8, y0: 1.4, y1: 3.4 }, { c: -4.6, w: .8, y0: 1.4, y1: 3.4 }, { c: 4.6, w: .8, y0: 1.4, y1: 3.4 }], gF, 0, HF, T);
  wall('x', -HZ, -HX, HX, [{ c: -5.2, w: 1.2, y0: 1, y1: HF }, { c: 5.2, w: 1.2, y0: 1, y1: HF }, { c: -10.5, w: .8, y0: 1.4, y1: 3.4 }, { c: 10.5, w: .8, y0: 1.4, y1: 3.4 }], gB, 0, HF, T);
  wall('z', -HX, -HZ, HZ, [-7.35, 0, 7.35].map(c => ({ c, w: .9, y0: 1.4, y1: 3.4 })), gL, 0, HF, T);
  wall('z', HX, -HZ, HZ, [-7.35, 0, 7.35].map(c => ({ c, w: .9, y0: 1.4, y1: 3.4 })), gR, 0, HF, T);
  portal('x', HZ, 0, 3.4, 3.7, gF, T);
  for (const o of [-10.5, 10.5, -4.6, 4.6]) win('x', HZ, o, .8, 1.4, 3.4, gF, T);
  for (const o of [-10.5, 10.5]) win('x', -HZ, o, .8, 1.4, 3.4, gB, T);
  win('x', -HZ, -5.2, 1.2, 1, HF, gB, T, 0x6a8fd0); win('x', -HZ, 5.2, 1.2, 1, HF, gB, T, 0xd0a860);
  for (const o of [-7.35, 0, 7.35]) { win('z', -HX, o, .9, 1.4, 3.4, gL, T); win('z', HX, o, .9, 1.4, 3.4, gR, T); }
  // divisórias salão/alas no térreo, com arco para a armaria (oeste) e para a cozinha (leste)
  wall('z', -7, -HZ, HZ, [{ c: -5.5, w: 2.6, y0: 0, y1: 3.4 }], dGL, 0, HF, TD);
  wall('z', 7, -HZ, HZ, [{ c: -5.5, w: 2.6, y0: 0, y1: 3.4 }], dGR, 0, HF, TD);
  for (const s of [-1, 1]) { const g = s < 0 ? dGL : dGR; W('z', s * 7, -5.5, 3.5, 3.1, .3, TD + .3, STONE3, g); W('z', s * 7, -7, 1.7, .3, 3.5, TD + .3, STONE3, g); W('z', s * 7, -4, 1.7, .3, 3.5, TD + .3, STONE3, g); }

  // paredes de cima (T = 0,8): fachada com rosácea, fundos com vitrais, laterais com janelas dos quartos
  wall('x', HZ, -HX, HX, [{ c: 0, w: 2.6, y0: 5.4, y1: 7.8 }, { c: -8.2, w: 1, y0: HF + 1, y1: HF + 3.2 }, { c: 8.2, w: 1, y0: HF + 1, y1: HF + 3.2 }, { c: -11.6, w: 1, y0: HF + 1, y1: HF + 3.2 }, { c: 11.6, w: 1, y0: HF + 1, y1: HF + 3.2 }], uF, HF, HU, T);
  wall('x', -HZ, -HX, HX, [{ c: -5.2, w: 1.2, y0: HF, y1: 7.6 }, { c: 5.2, w: 1.2, y0: HF, y1: 7.6 }, { c: -8.2, w: 1, y0: HF + 1, y1: HF + 3.2 }, { c: 8.2, w: 1, y0: HF + 1, y1: HF + 3.2 }], uB, HF, HU, T);
  wall('z', -HX, -HZ, HZ, [-7.35, 0, 7.35].map(c => ({ c, w: 1.2, y0: HF + 1, y1: HF + 3.2 })), uL, HF, HU, T);
  wall('z', HX, -HZ, HZ, [-7.35, 0, 7.35].map(c => ({ c, w: 1.2, y0: HF + 1, y1: HF + 3.2 })), uR, HF, HU, T);
  win('x', HZ, 0, 2.6, 5.4, 7.8, uF, T, 0xe0b860);
  for (const o of [-8.2, 8.2, -11.6, 11.6]) win('x', HZ, o, 1, HF + 1, HF + 3.2, uF, T);
  win('x', -HZ, -5.2, 1.2, HF, 7.6, uB, T, 0x6a8fd0); win('x', -HZ, 5.2, 1.2, HF, 7.6, uB, T, 0xd0a860);
  for (const o of [-8.2, 8.2]) win('x', -HZ, o, 1, HF + 1, HF + 3.2, uB, T);
  for (const o of [-7.35, 0, 7.35]) { win('z', -HX, o, 1.2, HF + 1, HF + 3.2, uL, T); win('z', HX, o, 1.2, HF + 1, HF + 3.2, uR, T); }
  // divisórias de cima: janelas para o salão (galeria) e abertura do patamar da escada em z = -0,5
  const galO = [{ c: -0.5, w: 2.2, y0: HF, y1: HF + 2.8 }, { c: -8.5, w: 1.6, y0: HF + .9, y1: HF + 3.5 }, { c: -4.5, w: 1.6, y0: HF + .9, y1: HF + 3.5 }, { c: 4, w: 1.6, y0: HF + .9, y1: HF + 3.5 }, { c: 8, w: 1.6, y0: HF + .9, y1: HF + 3.5 }];
  wall('z', -7, -HZ, HZ, galO, dUL, HF, HU, TD); wall('z', 7, -HZ, HZ, galO, dUR, HF, HU, TD);
  for (const s of [-1, 1]) { const g = s < 0 ? dUL : dUR; for (const o of galO.slice(1)) W('z', s * 7, o.c, (o.y0 + o.y1) / 2, o.w + .4, .16, TD + .3, STONE3, g); }

  // laje do andar de cima (alas) com vigas à vista por baixo; patamares das escadas
  for (const s of [-1, 1]) {
    B(6.8, SL, 2 * HZ - .8, s * 10.4, HF - SL / 2, 0, WOOD2, up);
    for (let i = 0; i < 10; i++) B(.66, .05, 2 * HZ - .8, s * (7.2 + i * .68), HF + .025, 0, i & 1 ? 0x7a5a3a : 0x6a4c30, up);
    for (let zz = -10.5; zz <= 10.6; zz += 2.1) B(6.8, .24, .26, s * 10.4, HF - SL - .12, zz, TM, up);
    B(2.2, SL, 2.2, s * 5.9, HF - SL / 2, -.4, WOOD2, up);                                   // patamar
    for (let i = 0; i < 16; i++) { const h = (i + 1) * HF / 16; B(2.2, h, .5, s * 5.9, h / 2, RAMP.z0 - .25 - i * .5, i & 1 ? STONE2 : STONE, front); }
    // corrimão da escada (lado do salão)
    const L = Math.hypot(8, HF), ang = Math.atan2(HF, 8);
    const rl = B(.1, .1, L, s * 4.7, HF / 2 + 1, 4.5, DARK, front); rl.rotation.x = ang;
    for (let i = 0; i <= 16; i++) { const zz = RAMP.z0 - i * .5; B(.07, 1, .07, s * 4.7, (i * HF / 16) + .5, zz, WOOD2, front); }
    B(.1, .1, 2.2, s * 4.7, HF + 1, -.4, DARK, up);
    for (const zz of [-1.4, -.8, -.2]) B(.07, 1, .07, s * 4.7, HF + .5, zz, WOOD2, up);
  }

  // ───── telhado mansarda de ardósia com cúpula central e frontão (estilo barroco, c. 1720–1750) ─────
  XR = true;
  const slate = (a, c, f) => c;
  void slate;
  const face = (b0, b1, t1, t0, rows, cols, g) => {
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const pt = (r, c) => lerp(lerp(b0, b1, c / cols), lerp(t0, t1, c / cols), r / rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const A = pt(r, c), Bp = pt(r, c + 1), Cp = pt(r + 1, c + 1), D = pt(r + 1, c);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...A, ...Bp, ...Cp, ...A, ...Cp, ...D]), 3));
      geo.computeVertexNormals();
      const m = M(ROOFC[(r * 3 + c * 5) % 4]); m.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
    }
  };
  const Y0 = HU + .35, Y1 = HU + 3.9, X0 = HX + .55, Z0 = HZ + .55, X1 = X0 - 1.5, Z1 = Z0 - 1.5;
  face([-X0, Y0, Z0], [X0, Y0, Z0], [X1, Y1, Z1], [-X1, Y1, Z1], 8, 24, roof);
  face([X0, Y0, -Z0], [-X0, Y0, -Z0], [-X1, Y1, -Z1], [X1, Y1, -Z1], 8, 24, roof);
  face([-X0, Y0, -Z0], [-X0, Y0, Z0], [-X1, Y1, Z1], [-X1, Y1, -Z1], 8, 20, roof);
  face([X0, Y0, Z0], [X0, Y0, -Z0], [X1, Y1, -Z1], [X1, Y1, Z1], 8, 20, roof);
  B(2 * X1, .2, 2 * Z1, 0, Y1 + .05, 0, 0x5a6068, roof);                                              // terraço de chumbo
  // cornija com dentículos e friso, em volta de todo o beiral
  B(2 * X0 + .6, .45, 1.0, 0, HU + .05, Z0 - .2, STONE3, roof); B(2 * X0 + .6, .45, 1.0, 0, HU + .05, -Z0 + .2, STONE3, roof);
  B(1.0, .45, 2 * Z0 + .6, X0 - .2, HU + .05, 0, STONE3, roof); B(1.0, .45, 2 * Z0 + .6, -X0 + .2, HU + .05, 0, STONE3, roof);
  for (let u = -X0; u <= X0 + .01; u += .55) { B(.28, .25, .3, u, HU - .3, Z0 + .22, STONE2, roof); B(.28, .25, .3, u, HU - .3, -Z0 - .22, STONE2, roof); }
  for (let u = -Z0; u <= Z0 + .01; u += .55) { B(.3, .25, .28, X0 + .22, HU - .3, u, STONE2, roof); B(.3, .25, .28, -X0 - .22, HU - .3, u, STONE2, roof); }
  // águas-furtadas nas quatro faces
  const dormer = (dx, dz, ry, h0) => {
    const g = new THREE.Group(); g.position.set(dx, h0, dz); g.rotation.y = ry; roof.add(g);
    B(1.5, 1.6, 1.1, 0, .6, 0, STONE, g); B(1.1, 1.2, .1, 0, .6, .56, 0x2a3040, g).material.transparent = false;
    tr(B(.9, 1.1, .06, 0, .62, .6, 0xbfe0f0, g), .55); B(.06, 1.1, .1, 0, .62, .62, TM, g); B(.9, .06, .1, 0, .62, .62, TM, g);
    B(1.3, .16, .3, 0, -.05, .6, STONE3, g);
    const sh = new THREE.Shape(); sh.moveTo(-.95, 0); sh.lineTo(.95, 0); sh.lineTo(0, .85);
    const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }), M(0x3a4250)); pm.position.set(0, 1.45, -.75); g.add(pm);
  };
  const tH = .45, hh = Y0 + (Y1 - Y0) * tH, ins = 1.5 * tH;
  for (const xx of [-10.5, -5.2, 0, 5.2, 10.5]) { dormer(xx, Z0 - ins - .05, 0, hh - .4); dormer(xx, -Z0 + ins + .05, Math.PI, hh - .4); }
  for (const zz of [-7.5, -2.5, 2.5, 7.5]) { dormer(X0 - ins - .05, zz, Math.PI / 2, hh - .4); dormer(-X0 + ins + .05, zz, -Math.PI / 2, hh - .4); }
  // cúpula central: tambor octogonal com janelas, domo de cobre esverdeado, lanterna, agulha e catavento
  C(3.4, 3.6, 2, 8, 0, Y1 + 1.1, 0, STONE3, roof);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; tr(B(.9, 1.1, .08, Math.cos(a) * 3.3, Y1 + 1.2, Math.sin(a) * 3.3, 0xbfe0f0, roof), .6).rotation.y = -a + Math.PI / 2; B(1.1, .18, .14, Math.cos(a) * 3.35, Y1 + 1.9, Math.sin(a) * 3.35, STONE2, roof).rotation.y = -a + Math.PI / 2; }
  C(3.7, 3.5, .4, 8, 0, Y1 + 2.3, 0, STONE2, roof);
  const domeMat = M(0x5aa08c); const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), domeMat); dome.scale.set(1, 1.15, 1); dome.position.set(0, Y1 + 2.45, 0); dome.castShadow = true; roof.add(dome);
  C(.7, .85, 1.4, 8, 0, Y1 + 6.45, 0, STONE3, roof); const d2 = new THREE.Mesh(new THREE.SphereGeometry(.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0x5aa08c)); d2.position.set(0, Y1 + 7.1, 0); roof.add(d2);
  C(.05, .08, 2, 6, 0, Y1 + 8.2, 0, GOLD, roof); const ball = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), M(GOLD)); ball.position.set(0, Y1 + 9.2, 0); roof.add(ball);
  B(.9, .4, .04, .35, Y1 + 8.6, 0, GOLD, roof);
  // chaminés do telhado
  for (const [cx2, cz2] of [[-11, 0], [11, 0], [-11, 7], [11, -7]]) { B(1.1, 2.2, 1.1, cx2, Y1 + .9, cz2, STONE, roof); B(1.3, .25, 1.3, cx2, Y1 + 2.1, cz2, STONE3, roof); }
  XR = false;

  // ───── torres de canto redondas com cúpula de cobre (castelo de 1720–1750) ─────
  XR = true;
  const tower = (tx, tz, R, H, flagCol = RED) => {
    const g = new THREE.Group(); g.position.set(tx, 0, tz); S.add(g);
    C(R + .35, R + .55, 1, 16, 0, .3, 0, DSTONE, g);
    C(R, R + .08, H, 16, 0, H / 2 + .5, 0, STONE, g);
    for (let y = 1.3; y < H; y += .75) { const r = C(R + .03, R + .03, .07, 16, 0, y, 0, DSTONE, g); r.scale.set(1.002, 1, 1.002); }
    C(R + .45, R + .3, .55, 16, 0, H + .45, 0, STONE3, g);                        // cornija
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; B(.3, .28, .36, Math.cos(a) * (R + .52), H + .1, Math.sin(a) * (R + .52), STONE2, g).rotation.y = -a + Math.PI / 2; }
    for (const [y, wide] of [[3.2, false], [H * .55, true], [H - 1.6, true]]) for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + Math.PI / 6, px = Math.cos(a) * (R + .03), pz = Math.sin(a) * (R + .03);
      B(wide ? .75 : .2, wide ? 1.5 : 1.1, .14, px, y, pz, 0x15191f, g).rotation.y = -a + Math.PI / 2;
      if (wide) { B(1.0, .18, .2, Math.cos(a) * (R + .08), y + .85, Math.sin(a) * (R + .08), STONE3, g).rotation.y = -a + Math.PI / 2; }
    }
    // coroamento clássico: piso, ameias altas e baixas alternadas (merlões e vãos) e mastro com bandeira
    C(R + .45, R + .45, .2, 16, 0, H + .82, 0, STONE2, g);
    const NM = 16;
    for (let i = 0; i < NM; i++) {
      const a = i / NM * Math.PI * 2, tall = i % 2 === 0, rr = R + .22, w = 2 * Math.PI * rr / NM;
      const blk = B(w * .96, tall ? 1.3 : .55, .7, Math.cos(a) * rr, H + .92 + (tall ? .65 : .275), Math.sin(a) * rr, tall ? STONE3 : STONE, g);
      blk.rotation.y = -a + Math.PI / 2;
      if (tall) B(w * .7, .12, .85, Math.cos(a) * rr, H + .92 + 1.35, Math.sin(a) * rr, STONE2, g).rotation.y = -a + Math.PI / 2;
    }
    B(.1, 3, .1, 0, H + 2.4, 0, DARK, g); B(1.4, .85, .05, .75, H + 3.4, 0, flagCol, g); B(.4, .4, .06, .75, H + 3.4, 0, GOLD, g);
  };
  [[-HX - 2.2, -HZ - 2.2], [HX + 2.2, -HZ - 2.2], [-HX - 2.2, HZ + 2.2], [HX + 2.2, HZ + 2.2]].forEach(([a, b]) => tower(a, b, 3.4, 11.8));
  XR = false;

  // ───── pórtico de colunas jônicas, terraço com balaustrada e frontão com brasão ─────
  XR = true;
  const PZ = HZ + 3.2;
  B(11.4, .2, 3.9, 0, .1, HZ + 1.95, STONE2); B(10.2, .2, 3.1, 0, .3, HZ + 2.2, STONE); B(9.2, .2, 2.4, 0, .5, HZ + 2.6, STONE3);   // degraus
  for (const cx of [-4.4, -2.3, 2.3, 4.4]) {
    B(1.1, .4, 1.1, cx, .7, PZ - .5, STONE3); C(.4, .46, 4.4, 14, cx, 3.1, PZ - .5, STONE); B(1.1, .3, 1.1, cx, 5.4, PZ - .5, STONE3);
    for (const s of [-1, 1]) { const v = C(.2, .2, .5, 8, cx + s * .45, 5.2, PZ - .5, STONE3); v.rotation.z = Math.PI / 2; }
    for (let y = 1.4; y < 5; y += .9) C(.41, .41, .05, 14, cx, y, PZ - .5, DSTONE);
  }
  B(11.2, .55, 1.0, 0, 5.75, PZ - .5, STONE3); B(11.2, .5, 3.9, 0, 6.15, HZ + 1.85, STONE2); B(11.4, .12, 4.1, 0, 6.45, HZ + 1.85, STONE3);
  for (let u = -5.3; u <= 5.31; u += .42) C(.09, .12, .8, 6, u, 6.9, PZ - .35, STONE3);
  B(11.2, .14, .2, 0, 7.35, PZ - .35, STONE3); B(11.2, .14, .2, 0, 6.5, PZ - .35, STONE3);
  for (const s of [-1, 1]) for (let q = 0; q < 8; q++) C(.09, .12, .8, 6, s * 5.55, 6.9, HZ + .6 + q * .42, STONE3);
  { const sh = new THREE.Shape(); sh.moveTo(-5.6, 0); sh.lineTo(5.6, 0); sh.lineTo(0, 2.2);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: false }), M(STONE3)); m.position.set(0, 7.55, HZ + .1); m.castShadow = true; S.add(m);
    const sh2 = new THREE.Shape(); sh2.moveTo(-4.8, 0); sh2.lineTo(4.8, 0); sh2.lineTo(0, 1.85);
    const m2 = new THREE.Mesh(new THREE.ExtrudeGeometry(sh2, { depth: .1, bevelEnabled: false }), M(STONE)); m2.position.set(0, 7.7, HZ + .72); S.add(m2);
    B(1.5, 1.3, .12, 0, 8.7, HZ + .85, RED2); const cr3 = B(.9, .9, .14, 0, 8.7, HZ + .9, GOLD); cr3.rotation.z = Math.PI / 4; B(.5, .5, .16, 0, 8.7, HZ + .94, RED);
    const clk = C(.9, .9, .12, 20, 0, 6.65, HZ + .55, 0xeadfb8); clk.rotation.x = Math.PI / 2; B(.05, .6, .06, 0, 6.8, HZ + .65, IRON); B(.4, .05, .06, .2, 6.65, HZ + .65, IRON); }
  XR = false;
  for (const s of [-1, 1]) {
    B(.12, .12, .5, s * 2.9, 3.4, HZ + .6, IRON); C(.08, .05, .3, 6, s * 2.9, 3.6, HZ + .8, DARK);
    const f = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 5), M(0xffa020, 0xff8a10)); f.position.set(s * 2.9, 3.9, HZ + .8); S.add(f);
    B(1.4, .5, 1.4, s * 6.6, .25, HZ + 2.6, STONE2); B(1, 1, 1.1, s * 6.6, 1, HZ + 2.6, STONE);
    B(.6, .5, .8, s * 6.6, 1.7, HZ + 2.6, STONE3); const hd = B(.7, .6, .4, s * 6.6, 1.9, HZ + 3.0, STONE3);
    B(.12, .12, .1, s * 6.45, 2.0, HZ + 3.22, 0x15191f); B(.12, .12, .1, s * 6.75, 2.0, HZ + 3.22, 0x15191f); hd.rotation.x = .1;
    B(1.1, 3.2, .06, s * 9.6, 5.9, HZ + .48, RED); B(1.1, .08, .08, s * 9.6, 7.55, HZ + .5, GOLD); B(.5, .5, .08, s * 9.6, 6.3, HZ + .52, GOLD).rotation.z = Math.PI / 4;
    C(.3, .3, .9, 8, s * 3.6, .75, HZ + 4.1, IRON); C(.5, .3, .25, 8, s * 3.6, 1.3, HZ + 4.1, 0x3a3a40);
    const fb = new THREE.Mesh(new THREE.ConeGeometry(.3, .7, 6), M(0xff8a1a, 0xff6a00)); fb.position.set(s * 3.6, 1.7, HZ + 4.1); S.add(fb);
  }

  // chaminé externa da cozinha
  B(2, 11.2, 3, HX + 1.1, 5.6, -8, STONE); B(2.3, .5, 3.3, HX + 1.1, 11.4, -8, STONE3); B(1.2, .8, 1.8, HX + 1.1, 12, -8, DSTONE);

  // ═════════════ PÁTIO DE ARMAS (muralha de cortina com guarita, bastiões e canhões) ═════════════
  XR = true;
  const FZ = 24, FX = 16.4, CH = 6.2;
  B(2 * FX + 2.4, .3, FZ - HZ + 1, 0, -.1, (FZ + HZ) / 2 + .6, DSTONE);
  for (let i = -14; i <= 14; i++) for (let j = 0; j < 9; j++) B(1.1, .05, 1.1, i * 1.1, .03, HZ + 3.3 + j * 1.1 + ((i & 1) ? .3 : 0), (i + j) & 1 ? 0x8a877e : 0x79766d);
  wall('x', FZ, -FX, FX, [{ c: 0, w: 4.8, y0: 0, y1: 5.2 }], S, 0, CH, 1.2);
  wall('z', -FX, HZ + 2.2, FZ, [], S, 0, CH, 1.2); wall('z', FX, HZ + 2.2, FZ, [], S, 0, CH, 1.2);
  // muros de ligação: da cortina do pátio até a muralha da vila (o castelo e a vila formam uma só praça-forte)
  const VD = Math.hypot(CASTLE.x, CASTLE.z), LK = Math.max(0, VD - Math.sqrt(VILLAGE_R * VILLAGE_R - FX * FX) - FZ);
  if (LK > 1) {
    wall('z', -FX, FZ, FZ + LK, [], S, 0, CH, 1.2); wall('z', FX, FZ, FZ + LK, [], S, 0, CH, 1.2);
    for (let v = FZ + 1.5; v <= FZ + LK; v += 1.5) { B(1.35, .95, .95, -FX, CH + .48, v, STONE3); B(1.35, .95, .95, FX, CH + .48, v, STONE3); }
    B(6.4, .06, VD - VILLAGE_R - FZ + 1, 0, .03, FZ + (VD - VILLAGE_R - FZ) / 2 + .5, 0x8a877e);   // calçada do portão da vila ao portão do pátio
  }
  // arco da guarita: ombreiras, fecho, grade levantada e lampiões
  for (const sd of [-1, 1]) { B(.7, 5.4, 1.6, sd * 2.75, 2.7, FZ, STONE3); }
  B(6.2, .7, 1.6, 0, 5.55, FZ, STONE3); B(.7, .9, 1.7, 0, 5.1, FZ, STONE2);
  for (let i = -4; i <= 4; i++) B(.08, 1.3, .1, i * .5, 4.4, FZ + .3, IRON); B(4.8, .1, .12, 0, 4.9, FZ + .3, IRON); B(4.8, .1, .12, 0, 4.1, FZ + .3, IRON);
  for (const sd of [-1, 1]) { B(.14, .14, .5, sd * 3.1, 3.4, FZ + .9, IRON); B(.28, .38, .28, sd * 3.1, 3.2, FZ + 1.1, 0xffd890, S, 0xffb040); }
  // ameias na cortina
  for (let u = -FX; u <= FX + .01; u += 1.5) { if (Math.abs(u) < 3.4) continue; B(.95, .95, 1.35, u, CH + .48, FZ, STONE3); }
  for (let v = HZ + 3; v <= FZ + .01; v += 1.5) { B(1.35, .95, .95, -FX, CH + .48, v, STONE3); B(1.35, .95, .95, FX, CH + .48, v, STONE3); }
  B(7.2, .35, 1.6, 0, CH + .1, FZ, STONE2);
  for (let u = -3.4; u <= 3.41; u += 1.5) B(.95, .95, 1.35, u, CH + 1.0, FZ, STONE3);
  // bastiões: guarita (dois) e cantos
  [[-4.7, FZ, 2.2, 9.2], [4.7, FZ, 2.2, 9.2], [-FX, FZ, 2.9, 8.2], [FX, FZ, 2.9, 8.2]].forEach(([a, b, R, H]) => tower(a, b, R, H, a < 0 ? BLUE : RED));
  XR = false;
  // fonte central, canteiros, lampiões e canhões
  C(1.9, 2.1, .6, 18, 0, .5, 19.6, STONE); C(1.7, 1.7, .1, 18, 0, .82, 19.6, 0x3a7fa8); tr(C(1.7, 1.7, .05, 18, 0, .85, 19.6, 0x3a7fa8), .7);
  C(.35, .5, 1.6, 10, 0, 1.4, 19.6, STONE3); C(.7, .45, .2, 12, 0, 2.3, 19.6, STONE); C(.25, .1, .6, 8, 0, 2.7, 19.6, 0x9ad0f0).material.transparent = true;
  const gb = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), M(GOLD)); gb.position.set(0, 3.1, 19.6); S.add(gb);
  for (const sd of [-1, 1]) {
    B(5.2, .4, 2.4, sd * 9.2, .2, 19.6, 0x5a7a3a); B(5.4, .1, 2.6, sd * 9.2, .42, 19.6, STONE3);
    for (let i = 0; i < 14; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(.12, 5, 4), M([0xd84a5a, 0xf0c040, 0xd8d0f0, 0xe07040][i % 4])); fl.position.set(sd * 9.2 + (i % 7 - 3) * .65, .6, 19.6 + (i < 7 ? -.5 : .5)); S.add(fl); }
    C(.07, .07, 2.6, 6, sd * 6, 1.3, 16.5, IRON); B(.3, .4, .3, sd * 6, 2.8, 16.5, 0xffd890, S, 0xffb040); B(.4, .08, .4, sd * 6, 3.05, 16.5, IRON);
    C(.07, .07, 2.6, 6, sd * 6, 1.3, 22.4, IRON); B(.3, .4, .3, sd * 6, 2.8, 22.4, 0xffd890, S, 0xffb040); B(.4, .08, .4, sd * 6, 3.05, 22.4, IRON);
    // canhão sobre reparo, voltado para o portão, com pilha de balas
    const cg = new THREE.Group(); cg.position.set(sd * 10.8, 0, 22.3); cg.rotation.y = sd * .25; S.add(cg);
    B(1.1, .35, 2.2, 0, .7, 0, WOOD2, cg); for (const w2 of [-.6, .6]) { const wh = C(.5, .5, .14, 12, w2, .5, .1, WOOD, cg); wh.rotation.z = Math.PI / 2; }
    const bar = C(.26, .34, 2.6, 10, 0, 1.12, .2, 0x2b2b30, cg); bar.rotation.x = Math.PI / 2 - .08; C(.3, .3, .2, 10, 0, 1.12, -1.15, 0x2b2b30, cg);
    for (let i = 0; i < 6; i++) { const bl = new THREE.Mesh(new THREE.SphereGeometry(.17, 6, 5), M(0x2b2b30)); bl.position.set(sd * 8.2 + (i % 3 - 1) * .34 + (i > 2 ? .17 : 0), .17 + (i > 2 ? .26 : 0), 22.3 + (i > 2 ? .15 : 0)); S.add(bl); }
    B(.9, .3, .6, sd * 12.4, .25, 20.4, WOOD2); B(.8, .5, .5, sd * 12.4, .65, 20.4, 0x5a3a22);   // caixa de pólvora
  }
  for (let k = 0; k < 4; k++) { const sd = k < 2 ? -1 : 1; B(.9, 2.9, .05, sd * (k & 1 ? 2.2 : 7.2), 4.2, FZ + .65, k & 1 ? RED : BLUE); B(.9, .07, .08, sd * (k & 1 ? 2.2 : 7.2), 5.65, FZ + .65, GOLD); }

  // ═════════════ GRANDE SALÃO ═════════════
  // palco de 3 degraus
  const stepZ = [DAIS_Z, DAIS_Z - .45, DAIS_Z - .9];
  stepZ.forEach((zf, k) => B(13.2, .2 * (k + 1), (-HZ + .8) * -1 + zf, 0, .1 * (k + 1), (zf + (-HZ + .8)) / 2, [0x9a988e, 0x8c8a82, 0x7e7c74][k]));
  // tapete vermelho com galões dourados: do portal até o trono, subindo os degraus
  const CL = 10.9 - DAIS_Z, CZ = (10.9 + DAIS_Z) / 2;
  B(2.4, .035, CL, 0, .075, CZ, RED); B(.12, .04, CL, -1.1, .08, CZ, GOLD); B(.12, .04, CL, 1.1, .08, CZ, GOLD);
  for (let k = 0; k < 3; k++) {
    const z0 = DAIS_Z - .45 * k;
    B(2.4, .22, .04, 0, .1 * (2 * k + 1) + .0, z0 + .02, RED2);                         // espelho do degrau
    const zEnd = k < 2 ? z0 - .45 : -9.4;
    B(2.4, .035, z0 - zEnd, 0, .2 * (k + 1) + .02, (z0 + zEnd) / 2, RED);
    B(.12, .04, z0 - zEnd, -1.1, .2 * (k + 1) + .03, (z0 + zEnd) / 2, GOLD); B(.12, .04, z0 - zEnd, 1.1, .2 * (k + 1) + .03, (z0 + zEnd) / 2, GOLD);
  }
  // colunas do salão
  for (const zz of [8.2, 3.2, -1.8]) for (const s of [-1, 1]) {
    B(1.1, .4, 1.1, s * 3.6, .2, zz, STONE3); C(.46, .5, HU - .8, 10, s * 3.6, HU / 2 + .1, zz, STONE); C(.62, .5, .5, 10, s * 3.6, HU - .3, zz, STONE3);
    for (let y = 1.2; y < HU - 1; y += 1.3) C(.5, .5, .06, 10, s * 3.6, y, zz, DSTONE);
  }
  // tapeçaria do trono, brasão e vitrais já nas janelas
  B(7.4, 5.2, .08, 0, 3.9, -HZ + .55, RED2); B(7.6, .14, .12, 0, 6.55, -HZ + .55, GOLD); B(7.6, .1, .1, 0, 1.3, -HZ + .55, GOLD);
  B(1.6, 1.9, .1, 0, 4.2, -HZ + .62, BLUE); const cr = B(1.1, 1.1, .12, 0, 4.2, -HZ + .66, GOLD); cr.rotation.z = Math.PI / 4; B(.6, .6, .14, 0, 4.2, -HZ + .7, RED);
  for (const i of [-.5, 0, .5]) { B(.18, .5, .14, i, 5.35, -HZ + .7, GOLD); }
  // tronos
  const throne = (tx, big) => {
    const g = new THREE.Group(); g.position.set(tx, .6, -10.1); S.add(g);
    const k = big ? 1 : .88;
    B(1.5 * k, .3, 1.2 * k, 0, .15, 0, WOOD2, g); B(1.4 * k, .28, 1.1 * k, 0, .45, .02, big ? RED : 0xa02848, g);
    B(1.3 * k, 2.7 * k, .24, 0, 1.55 * k + .1, -.5 * k, WOOD, g); B(1.1 * k, 2.3 * k, .1, 0, 1.5 * k + .1, -.38 * k, big ? RED2 : 0x7a1c38, g);
    for (const s of [-1, 1]) {
      B(.22, .7, 1.0 * k, s * .65 * k, .65, .02, WOOD, g); B(.28, .08, 1.1 * k, s * .65 * k, 1.03, .02, GOLD, g);
      B(.2, 3.2 * k, .22, s * .62 * k, 1.5 * k + .35, -.5 * k, GOLD, g);
      const f = new THREE.Mesh(new THREE.ConeGeometry(.14, .4, 4), M(GOLD)); f.position.set(s * .62 * k, 3.2 * k + .75, -.5 * k); g.add(f);
    }
    if (big) { for (let i = -2; i <= 2; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.14, .5 + (2 - Math.abs(i)) * .15, 4), M(GOLD)); t.position.set(i * .26, 3.1 + (2 - Math.abs(i)) * .08, -.5); g.add(t); } B(1.1, .12, .2, 0, 2.8, -.5, GOLD, g); }
    else { const dsk = C(.55, .55, .12, 12, 0, 2.55, -.5, GOLD, g); dsk.rotation.x = Math.PI / 2; B(.3, .3, .2, 0, 2.55, -.42, 0xa02848, g); }
    B(.3, .18, .3, -.4 * k, .66, .1, 0xf0e8d0, g); B(.3, .18, .3, .4 * k, .66, .1, 0xf0e8d0, g);
    return g;
  };
  throne(-2.1, true); throne(2.1, false);
  // candelabros e braseiros no palco, bandeiras nas colunas, tochas nas divisórias
  for (const s of [-1, 1]) {
    C(.07, .07, 1.6, 6, s * 4.6, 1.4, -9, IRON); for (let i = -1; i <= 1; i++) { C(.04, .04, .18, 6, s * 4.6 + i * .24, 2.3, -9, 0xe8dcb0); const f = new THREE.Mesh(new THREE.ConeGeometry(.04, .1, 4), M(0xffc040, 0xffa020)); f.position.set(s * 4.6 + i * .24, 2.45, -9); S.add(f); }
    B(.6, .08, .12, s * 4.6, 2.2, -9, IRON);
    const br = C(.45, .25, .35, 8, s * 5.6, .95, -8.2, IRON); const fb = new THREE.Mesh(new THREE.ConeGeometry(.3, .8, 6), M(0xff8a1a, 0xff6a00)); fb.position.set(s * 5.6, 1.6, -8.2); S.add(fb);
    C(.08, .08, .8, 6, s * 5.6, .4, -8.2, IRON);
  }
  for (const zz of [8.2, 3.2, -1.8]) for (const s of [-1, 1]) { B(.9, 2.8, .05, s * 3.6, 5.4, zz + .56, s < 0 ? BLUE : RED); B(.9, .07, .09, s * 3.6, 6.8, zz + .56, GOLD); }
  for (const zz of [-9, -4, 4.5, 10]) for (const s of [-1, 1]) {
    B(.12, .12, .4, s * 6.55, 2.6, zz, IRON); C(.07, .05, .26, 6, s * 6.4, 2.75, zz, DARK);
    const f = new THREE.Mesh(new THREE.ConeGeometry(.09, .26, 5), M(0xffa020, 0xff8a10)); f.position.set(s * 6.4, 3.0, zz); S.add(f);
  }
  // mesas compridas com bancos junto às paredes do salão (entre a escada e o palco)
  for (const s of [-1, 1]) { B(1.1, .1, 4, s * 5.7, .95, -3.8, WOOD); for (const dz of [-1.7, 1.7]) for (const dx of [-.45, .45]) B(.12, .9, .12, s * 5.7 + dx, .5, -3.8 + dz, WOOD2);
    for (const dx of [-.95, .95]) { B(.4, .08, 4, s * 5.7 + dx, .55, -3.8, WOOD2); B(.35, .5, .1, s * 5.7 + dx, .3, -5.6, WOOD2); B(.35, .5, .1, s * 5.7 + dx, .3, -2, WOOD2); }
    for (let i = 0; i < 4; i++) { C(.12, .1, .06, 8, s * 5.7 + ((i % 2) - .5) * .6, 1.03, -4.9 + i * .9, 0xcfcfd4); C(.06, .05, .22, 6, s * 5.7, 1.1, -4.6 + i * .8, 0x8a5030); }
  }
  // lustres de roda de carroça (velas acesas)
  for (const zz of [7, 1.5, -3.5]) {
    const ch = new THREE.Mesh(new THREE.TorusGeometry(1.1, .07, 5, 16), M(IRON)); ch.rotation.x = Math.PI / 2; ch.position.set(0, 6.6, zz); up.add(ch);
    for (let a = 0; a < 8; a++) { const cx = Math.cos(a * Math.PI / 4) * 1.1, cz = Math.sin(a * Math.PI / 4) * 1.1; C(.04, .04, .22, 6, cx, 6.8, zz + cz, 0xe8dcb0, up); const f = new THREE.Mesh(new THREE.ConeGeometry(.045, .12, 4), M(0xffc040, 0xffa020)); f.position.set(cx, 7.0, zz + cz); up.add(f); }
    for (const sx of [-1, 1]) B(.05, 2.2, .05, sx * .5, 7.7, zz, IRON, up);
  }

  // ═════════════ ALAS DO TÉRREO ═════════════
  // armaria (oeste)
  for (let i = 0; i < 3; i++) { const zz = [-9, -2.5, 3][i]; B(.35, 1.9, 2.4, -13.3, 1.2, zz, WOOD2); B(.4, .08, 2.4, -13.3, .6, zz, WOOD); B(.4, .08, 2.4, -13.3, 1.3, zz, WOOD);
    for (let k = 0; k < 4; k++) { const sw = B(.05, 1.4, .09, -13.0, 1.35, zz - .9 + k * .6, 0xbfc4cc); sw.rotation.z = .06; B(.1, .08, .3, -13.0, .78, zz - .9 + k * .6, GOLD); }
    const sh = C(.45, .45, .06, 10, -13.05, 2.5, zz, i & 1 ? RED : BLUE); sh.rotation.z = Math.PI / 2; }
  for (const [ax2, az2] of [[-11.2, -9.6], [-9.2, 8], [-12.4, 8.8]]) {   // manequins de armadura
    B(.7, .3, .7, ax2, .15, az2, WOOD2); B(.4, .85, .3, ax2, .95, az2, 0x9aa0a8); B(.5, .15, .35, ax2, 1.45, az2, 0x8a9098); const h = C(.17, .2, .34, 8, ax2, 1.72, az2, 0xaab0b8); B(.07, .05, .22, ax2, 1.75, az2 + .12, 0x15151a);
    B(.12, .6, .12, ax2 - .3, 1.0, az2, 0x8a9098); B(.12, .6, .12, ax2 + .3, 1.0, az2, 0x8a9098); B(.05, 1.9, .05, ax2 + .45, 1.0, az2, WOOD2); }
  B(1.8, .1, 1.1, -10.6, .95, -6.4, WOOD); for (const dx of [-.8, .8]) for (const dz of [-.45, .45]) B(.1, .9, .1, -10.6 + dx, .5, -6.4 + dz, WOOD2);
  B(.9, .03, .6, -10.6, 1.02, -6.4, 0xeadfb8); C(.04, .04, .14, 6, -10.2, 1.08, -6.3, 0xe8dcb0);
  for (const [bx, bz] of [[-12.8, 9.6], [-11.9, 10.2], [-12.9, 8.5]]) { C(.36, .43, .42, 10, bx, .3, bz, WOOD); C(.43, .36, .42, 10, bx, .7, bz, WOOD); for (const y of [.2, .5, .82]) { const q = C(.44, .44, .05, 10, bx, y, bz, IRON); q.scale.set(1.02, 1, 1.02); } }
  // cozinha (leste): lareira grande, caldeirão, mesa de trabalho, prateleiras, presuntos pendurados
  B(2.2, 3.4, 3.2, 12.5, 1.7, -8, STONE); B(2.4, .25, 3.4, 12.5, 3.5, -8, STONE3); B(1.6, 1.8, 2.4, 12.1, 1, -8, 0x1a1512);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.14, .5, 4), M(0xff8a1a, 0xff6a00)); f.position.set(11.9, .55, -8.7 + i * .5); S.add(f); }
  B(.08, 1.6, .08, 11.5, 1.8, -8, IRON); B(1.2, .06, .06, 11.5, 2.45, -8, IRON); C(.4, .3, .45, 10, 11.6, 1.6, -8, 0x2b2b30);
  B(3.2, .1, 1.1, 9.6, .95, -2.2, WOOD); for (const dx of [-1.4, 1.4]) for (const dz of [-.45, .45]) B(.1, .9, .1, 9.6 + dx, .5, -2.2 + dz, WOOD2);
  for (let i = 0; i < 5; i++) C(.1, .1, .05, 8, 8.7 + i * .45, 1.03, -2.2 + (i % 2) * .2, 0xcfcfd4); B(.5, .12, .35, 10.5, 1.06, -2.3, 0xd2a45a);
  for (const y of [1.2, 1.9, 2.6]) B(.4, .06, 6, 7.6, y, 5, WOOD2);
  for (let i = 0; i < 13; i++) for (const y of [1.3, 2.0, 2.7]) C(.09, .11, .22, 6, 7.55, y + .11, 2.3 + i * .45, [0xa0623a, 0x8a5030, 0xc9b48a][(i + (y * 3 | 0)) % 3]);
  for (let i = 0; i < 5; i++) { B(.02, .5, .02, 9.2 + i * .6, 3.5, 3.8, 0x999999); const hm = C(.12, .09, .45, 6, 9.2 + i * .6, 3.0, 3.8, [0xb86a4a, 0xc07a5a][i & 1]); hm.rotation.z = .05; }
  for (const [bx, bz] of [[13, 4], [13, 5.1], [12.2, 9.8]]) { C(.38, .45, .45, 10, bx, .33, bz, WOOD); C(.45, .38, .45, 10, bx, .75, bz, WOOD); }
  for (const [sx2, sz2] of [[12.4, 7], [12.8, 6.4]]) { const sk = new THREE.Mesh(new THREE.SphereGeometry(.4, 7, 5), M(0xcdb88a)); sk.scale.set(1, .85, .75); sk.position.set(sx2, .33, sz2); S.add(sk); }
  B(1.8, 1.0, 1.0, 11, .5, 9.6, WOOD2); B(1.9, .1, 1.1, 11, 1.05, 9.6, WOOD);

  // ═════════════ ANDAR DE CIMA: GALERIAS E SEIS QUARTOS ═════════════
  const rz = [-7.35, 0, 7.35];
  const roomNames = [['Quarto de Hóspedes', 'Aposentos do Rei', 'Quarto de Hóspedes'], ['Quarto de Hóspedes', 'Aposentos da Rainha', 'Quarto de Hóspedes']];
  void roomNames;
  for (const s of [-1, 1]) {
    // parede da galeria e partições dos quartos (baixas, para a câmera enxergar por cima)
    const cg = s < 0 ? uL : uR;
    wall('z', s * 9.4, -HZ + .4, HZ - .4, rz.map(c => ({ c, w: 1.3, y0: HF, y1: HF + 2.6 })), up, HF, HF + 3.4, .3, PL, 0xc9bda0);
    for (const c of rz) { const w = 1.3; W('z', s * 9.4, c - w / 2 - .09, HF + 1.35, .16, 2.8, .4, TM, up); W('z', s * 9.4, c + w / 2 + .09, HF + 1.35, .16, 2.8, .4, TM, up); W('z', s * 9.4, c, HF + 2.75, w + .5, .22, .4, TM, up); }
    for (const zz of [-3.7, 3.7]) {
      wall('x', zz, s < 0 ? -13.6 : 9.4, s < 0 ? -9.4 : 13.6, [], up, HF, HF + 3.2, .3, PL, 0xc9bda0);
      for (let xx = 9.5; xx <= 13.6; xx += 1.4) B(.14, 3.2, .34, s * xx, HF + 1.6, zz, TM, up);
    }
    // tapete corrido e apliques de parede na galeria
    B(1.1, .03, 2 * HZ - 1.6, s * 8.2, HF + .06, 0, RED, up); B(.08, .035, 2 * HZ - 1.6, s * 7.7, HF + .07, 0, GOLD, up); B(.08, .035, 2 * HZ - 1.6, s * 8.7, HF + .07, 0, GOLD, up);
    for (const zz of [-9.5, -4.8, 4.8, 9.5]) { B(.3, .1, .1, s * 9.2, HF + 2.2, zz, IRON, up); const f = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), M(0xffa020, 0xff8a10)); f.position.set(s * 9.1, HF + 2.4, zz); up.add(f); }
    B(.5, .5, 1.6, s * 7.7, HF + .25, 9.6, WOOD2, up); B(.5, .5, 1.6, s * 7.7, HF + .25, -9.6, WOOD2, up);
  }
  const mkRoom = (s, zc, master) => {
    const g = new THREE.Group(); g.position.set(s * 11.55, HF, zc); g.rotation.y = s < 0 ? Math.PI : 0; up.add(g);
    const royal = master ? (s < 0 ? 0x8a1c24 : 0x6a2a6a) : 0x2f4a6a;     // roupa de cama: rei vermelho, rainha púrpura, hóspedes azul
    B(3.6, .03, 6.4, 0, .06, 0, royal === 0x2f4a6a ? 0x6a3a2a : royal); B(3.2, .035, 5.8, 0, .08, 0, 0xcdb67a);
    // cama de dossel
    const bx = 1.0 + (master ? .0 : 0), bz = -1.8, bw = master ? 1.9 : 1.4, bl = 2.3;
    B(bw, .35, bl, bx, .35, bz, WOOD2, g); B(bw - .1, .22, bl - .1, bx, .62, bz, 0xd6c394, g); B(bw - .1, .1, bl * .6, bx, .78, bz + .4, royal, g);
    B(bw - .3, .14, .5, bx, .8, bz - .8, 0xf0ead8, g); B(bw + .1, 1.5, .14, bx, 1.2, bz - bl / 2, WOOD2, g);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(.12, 2.4, .12, bx + a * (bw / 2), 1.4, bz + b * (bl / 2 - .05), DARK, g);
    B(bw + .2, .08, bl + .1, bx, 2.62, bz, royal, g); for (const a of [-1, 1]) B(.04, 1.5, bl, bx + a * (bw / 2), 1.85, bz, royal, g).material.transparent = false;
    if (master) { B(bw + .3, .12, .1, bx, 2.7, bz + bl / 2, GOLD, g); }
    // baú no pé da cama, guarda-roupa, escrivaninha com cadeira, mesa de cabeceira
    B(.9, .5, .55, bx, .25, .5, WOOD2, g); B(.92, .1, .57, bx, .55, .5, WOOD, g); B(.1, .14, .04, bx, .45, .78, IRON, g);
    B(.9, 2.1, .6, 1.5, 1.05, 2.75, WOOD2, g); B(1.0, .1, .7, 1.5, 2.15, 2.75, TM, g); B(.02, 1.7, .5, 1.04, 1.05, 2.75, DARK, g);
    B(1.2, .08, .65, -.1, .85, 2.8, WOOD, g); for (const a of [-.5, .5]) for (const b of [-.25, .25]) B(.07, .8, .07, -.1 + a, .45, 2.8 + b, WOOD2, g);
    B(.5, .03, .35, -.1, .9, 2.8, 0xeadfb8, g); C(.04, .04, .1, 6, .25, .96, 2.7, 0x1a1a1f, g); C(.03, .03, .14, 6, -.45, .97, 2.9, 0xe8dcb0, g);
    B(.5, .06, .5, -.15, .5, 2.2, WOOD, g); B(.5, .55, .06, -.15, .8, 1.97, WOOD2, g);
    B(.45, .6, .45, .1, .3, -2.9, WOOD2, g); C(.03, .03, .14, 6, .1, .66, -2.9, 0xe8dcb0, g);
    const cf = new THREE.Mesh(new THREE.ConeGeometry(.03, .08, 4), M(0xffc040, 0xffa020)); cf.position.set(.1, .78, -2.9); g.add(cf);
    // cortinas na janela e brasão/quadro
    B(.1, 2.2, .3, 1.88, 1.9, -.9, royal, g); B(.1, 2.2, .3, 1.88, 1.9, .9, royal, g);
    if (master) {
      B(1.5, 1.0, .06, -2.2 + .0, 2.0, -2.9, TM, g); B(1.3, .84, .07, -2.2, 2.0, -2.9, royal, g); const cr2 = B(.5, .5, .08, -2.2, 2.0, -2.9, GOLD, g); cr2.rotation.z = Math.PI / 4;
      // lareira de canto
      B(.7, 1.5, 1.6, 1.65, .75, 1.0, STONE, g); B(.8, .12, 1.7, 1.65, 1.56, 1.0, STONE3, g); B(.3, .9, 1.1, 1.5, .55, 1.0, 0x1a1512, g);
      const f = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 4), M(0xff8a1a, 0xff6a00)); f.position.set(1.5, .5, 1.0); g.add(f);
      if (s > 0) { B(.5, 1.5, .5, -1.5, .75, -2.7, 0xcdb88a, g); const hd = C(.16, .2, .3, 8, -1.5, 1.7, -2.7, 0xe0b48a, g); B(.9, .6, .9, -1.5, .3, -2.7, 0xa02848, g); }   // manequim com vestido
      else { const cs = B(.5, .12, .5, -1.5, .06, -2.6, GOLD, g); C(.18, .22, .3, 8, -1.5, .3, -2.6, GOLD, g); C(.22, .15, .18, 8, -1.5, .5, -2.6, GOLD, g); }     // coroa de reserva
    } else { B(1.2, .9, .06, -2.2, 2.0, -2.9, TM, g); B(1.0, .7, .07, -2.2, 2.0, -2.9, 0xcfc4a0, g); B(.5, .35, .08, -2.2, 2.0, -2.9, 0x7aa0b8, g); }
    B(.35, .02, .5, -2.4, .07, 1.2, 0xcdb67a, g);
  };
  rz.forEach((c, i) => { mkRoom(-1, c, i === 1); mkRoom(1, c, i === 1); });
  // lampiões de teto nas galerias e no patamar
  for (const s of [-1, 1]) for (const zz of [-6, 6]) { B(.02, .6, .02, s * 8.2, HF + 3.4, zz, 0x999999, up); B(.22, .3, .22, s * 8.2, HF + 3.0, zz, 0xffd890, up, 0xffb040); }

  // ═════════════ COLISÕES, PORTAS, REGISTRO ═════════════
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, lvl, ng, dr) => {
    const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; if (ng) o.ng = true; if (dr) o.dr = dr;
    if (lvl !== undefined) { o.lvl = lvl; o.hx = wx; o.hz = wz; if (lvl === 1) { o.position.x = 1e5; o.position.z = 1e5; } }
    props.push(o);
  };
  // torres
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => block(a * (HX + 2.2), b * (HZ + 2.2), 3.5));
  // pórtico, pedestais dos leões, pátio de armas (muralha de cortina, bastiões, fonte, canhões)
  for (const cx of [-4.4, -2.3, 2.3, 4.4]) block(cx, HZ + 2.7, .5);
  for (const sd of [-1, 1]) { block(sd * 6.6, HZ + 2.6, .75); block(sd * 3.6, HZ + 4.1, .5); block(sd * 6, 16.5, .3); block(sd * 6, 22.4, .3); block(sd * 10.8, 22.3, .8); block(sd * 9.2, 19.6, 1.4); block(sd * 8.2, 22.3, .5); block(sd * 12.4, 20.4, .6); }
  block(0, 19.6, 2.1);
  for (let v = HZ + 3.1; v <= FZ + LK; v += .9) { block(-FX, v, .7); block(FX, v, .7); }
  for (let u = -FX; u <= FX + .01; u += .9) { if (Math.abs(u) > 2.9) block(u, FZ, .7); }
  [[-4.7, 2.3], [4.7, 2.3], [-FX, 3], [FX, 3]].forEach(([a2, r2]) => block(a2, FZ, r2));
  // muros externos (o portal fica livre; cada porta ganha seus círculos fechados)
  for (let u = -HX; u <= HX + .01; u += .9) { if (Math.abs(u) > 2.3) block(u, HZ, .5); block(u, -HZ, .5); }
  for (let v = -HZ; v <= HZ + .01; v += .9) { block(-HX, v, .5); block(HX, v, .5); }
  // divisórias do térreo (arco em z = -5,5)
  for (const s of [-1, 1]) for (let v = -HZ; v <= HZ + .01; v += .8) { if (Math.abs(v + 5.5) < 1.9) continue; block(s * 7, v, .35, 0); }
  // escadas: bordas laterais (ng: a viagem roteirizada atravessa)
  for (const s of [-1, 1]) for (let v = RAMP.zl; v <= 8; v += .8) { block(s * 4.5, v, .2, 0, true); block(s * 4.5, v, .2, 1, true); }
  // divisórias de cima (abertura do patamar em z = -0,5)
  for (const s of [-1, 1]) for (let v = -HZ; v <= HZ + .01; v += .8) { if (Math.abs(v + .5) < 1.5) continue; block(s * 7, v, .35, 1); }
  // galerias: parede dos quartos (ng) e partições
  for (const s of [-1, 1]) {
    for (let v = -HZ + .4; v <= HZ - .39; v += .5) { if (rz.some(c => Math.abs(v - c) < .95)) continue; block(s * 9.4, v, .3, 1, true); }
    for (const zz of [-3.7, 3.7]) for (let xx = 9.6; xx <= 13.6; xx += .6) block(s * xx, zz, .25, 1);
  }
  // móveis do salão
  for (const zz of [8.2, 3.2, -1.8]) for (const s of [-1, 1]) block(s * 3.6, zz, .6, 0);
  block(-2.1, -10.1, .75, 0); block(2.1, -10.1, .7, 0);
  for (const s of [-1, 1]) { block(s * 5.6, -8.2, .45, 0); for (const zz of [-5.6, -4.6, -3.6, -2.6, -1.9]) block(s * 5.7, zz, .75, 0); }
  // armaria e cozinha
  [[-13.3, -9], [-13.3, -7.8], [-13.3, -2.5], [-13.3, -1.3], [-13.3, 3], [-13.3, 4.2], [-11.2, -9.6], [-9.2, 8], [-12.4, 8.8], [-10.6, -6.4], [-9.7, -6.4], [-11.5, -6.4], [-12.8, 9.6], [-11.9, 10.2]]
    .forEach(([a, b]) => block(a, b, .5, 0));
  [[12.5, -9], [12.5, -8], [12.5, -7], [9.6, -2.2], [8.4, -2.2], [10.8, -2.2], [13, 4], [13, 5.1], [12.2, 9.8], [11, 9.6], [11.9, 9.6], [12.6, 6.7]].forEach(([a, b]) => block(a, b, .5, 0));
  // quartos: camas, baús, guarda-roupas e mesas
  const rb = (s, zc, lx, lz, r) => block(s * (11.55 + (s < 0 ? -lx : lx)) * 1, zc + (s < 0 ? -lz : lz), r, 1);
  for (const s of [-1, 1]) for (const zc of rz) {
    const base = s * 11.55, sx = (lx) => base + (s < 0 ? -lx : lx), sz = (lz) => zc + (s < 0 ? -lz : lz);
    block(sx(1.0), sz(-1.8), .95, 1); block(sx(1.0), sz(.5), .5, 1); block(sx(1.5), sz(2.75), .55, 1); block(sx(-.1), sz(2.8), .6, 1); block(sx(.1), sz(-2.9), .4, 1);
  }
  void rb;

  // portas: portal duplo (térreo) e as seis portas dos quartos (abrem para dentro dos quartos)
  const dFL = leaf({ ax: 'x', f: HZ, c: -.85, w: 1.7, h: 3.7, g: gF, id: 'castle-front-L', lvl: 0, openRot: 1, hinge: 'l' });
  const dFR = leaf({ ax: 'x', f: HZ, c: .85, w: 1.7, h: 3.7, g: gF, id: 'castle-front-R', lvl: 0, openRot: -1, hinge: 'r' });
  dFL.pair = dFR; dFR.pair = dFL;
  for (const s of [-1, 1]) rz.forEach((c, i) => leaf({ ax: 'z', f: s * 9.4, c, w: 1.3, h: 2.6, yb: HF, g: up, id: 'castle-room-' + (s < 0 ? 'w' : 'e') + i, lvl: 1, openRot: s < 0 ? -1 : 1 }));

  const lv = g => DR.filter(d => d.g === g).map(d => d.p);
  [gB, gL, gR, dGL, dGR, uF, uB, uL, uR, dUL, dUR].forEach(q => bakeGroup(q));
  bakeGroup(gF, lv(gF)); bakeGroup(front, [gF, gB, gL, gR, dGL, dGR]); bakeGroup(up, [uF, uB, uL, uR, dUL, dUR, ...lv(up)]); bakeGroup(roof);
  const H = { x, z, th, K: 1, fx: HX + 1, fz: HZ + 1 };
  DR.forEach(d => {
    const dd = addDoor(d, H);
    if (d.ax === 'z') [d.c - .5, d.c, d.c + .5].forEach(u => block(d.f, u, .3, 1, false, dd));
    else (d.c < 0 ? [-1.45, -.9, -.35] : [.35, .9, 1.45]).forEach(u => block(u, d.f, .4, 0, false, dd));
  });
  refreshProps();
  registerFloors({
    x, z, th, K: 1, hx: HX + .6, hz: HZ + .6, fx: HX + 1, fz: HZ + 1, Hf: HF, roof, up, hf, sc,
    walls: [{ g: gF, nx: 0, nz: 1, D: HZ }, { g: gB, nx: 0, nz: -1, D: HZ }, { g: gL, nx: -1, nz: 0, D: HX }, { g: gR, nx: 1, nz: 0, D: HX },
      { g: uF, nx: 0, nz: 1, D: HZ }, { g: uB, nx: 0, nz: -1, D: HZ }, { g: uL, nx: -1, nz: 0, D: HX }, { g: uR, nx: 1, nz: 0, D: HX },
      { g: dGL, nx: -1, nz: 0, D: 7 }, { g: dGR, nx: 1, nz: 0, D: 7 }, { g: dUL, nx: -1, nz: 0, D: 7 }, { g: dUR, nx: 1, nz: 0, D: 7 }],
  });
  return { g: root, th, at };
}
