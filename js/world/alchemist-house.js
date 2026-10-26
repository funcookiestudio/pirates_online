/* Casa da Herbalista (Ysolde Folha-Prata), c. 1740: casa de pedra e enxaimel escuro com telhado de ardósia, venezianas roxas, óculos redondos nas empenas,
   chaminé alta, lareira com caldeirão, bancada de destilação, estante de livros, escrivaninha, cama no canto e torre de observatório com esfera armilar.
   Fica longe da vila (o povo da cidade não lida bem com ela). Mesmo molde da casa da Dona Marta: porta clicável, corte de telhado e paredes ao entrar. */
import { scene } from '../core/engine.js';
import { regLight } from './house-lights.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps, HOUSES } from './floors.js';
import { addDoor } from './doors.js';
import { shellRects } from './imap.js';

export const ALCH_HOUSE = { w: 8, d: 6 };      // dimensões externas (m), iguais às da casa da Dona Marta

const ARM = [];   // peças que giram (esfera armilar da torre) e bolhas do caldeirão
export function updateAlchemist(dt) {
  if (!ARM.length) return;
  const t = performance.now() / 1000;
  ARM.forEach(a => { if (a.spin) { a.o.rotation.y += dt * .5; a.o.rotation.x = Math.sin(t * .4) * .2; } else if (a.bub) { a.o.position.y = a.y0 + (Math.sin(t * 2.3 + a.ph) * .5 + .5) * .12; a.o.scale.setScalar(.7 + Math.sin(t * 3 + a.ph) * .3); } });
}

export function buildAlchemistHouse(x, z, th, y0 = 0) {
  regLight(5, x, z);
  const root = new THREE.Group();
  root.position.set(x, y0, z); root.rotation.y = th;
  const KS = 1.28, S = new THREE.Group(); S.scale.setScalar(KS); root.add(S);
  const DR = [];
  const PL = 0xb7ae9a, PL2 = 0x9a917e, STONE = 0x7b786f, STONE2 = 0x66635c, TM = 0x3f2a1c, DOOR = 0x5e4026, DOOR2 = 0x4e341f, IRON = 0x2b2b30,
    WOOD = 0x8a6238, WOOD2 = 0x6e4d2c, SH = 0x4a2e6b, PUR = 0xb060ff, SLATE = [0x44505a, 0x4f5c68, 0x3a4650, 0x56636f];
  let DEF = S, XR = false;
  function M(c, e) { const m = new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }); return XR ? xray(m) : m; }
  function B(w, h, d, x, y, z, c, p, e) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; }
  function C(rt, rb, h, n, x, y, z, c, p, e) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; }
  function G(geo, x, y, z, c, e, p) { const m = new THREE.Mesh(geo, M(c, e)); m.position.set(x, y, z); m.castShadow = true; (p || DEF).add(m); return m; }
  function W(ax, f, u, y, l, h, t, c, g) { return ax == 'x' ? B(l, h, t, u, y, f, c, g) : B(t, h, l, f, y, u, c, g); }
  function tr(m, o) { m.material.transparent = true; m.material.opacity = o; return m; }

  // ── estrutura ──
  const H = 3, T = .3, front = new THREE.Group(), roof = new THREE.Group(), walls = new THREE.Group();
  S.add(front, roof, walls);
  const wB = new THREE.Group(), wL = new THREE.Group(), wR = new THREE.Group(); walls.add(wB, wL, wR);
  B(8.6, .4, 6.6, 0, -.1, 0, STONE2); B(7.7, .1, 5.7, 0, .06, 0, 0x5a4430);
  for (let i = 0; i < 8; i++) B(.94, .03, 5.7, -3.5 + i, .115, 0, i % 2 ? 0x6b5238 : 0x7a5e40);                 // assoalho de tábuas

  /** Parede de pedra aparelhada com baldrame, vigas escuras e vãos (ops = [{c, w, y0, y1}]) */
  function wall(ax, f, a0, a1, ops, g) {
    ops.sort((a, b) => a.c - b.c); let cur = a0, k = 0;
    const seg = (u0, u1, y0, y1) => {
      const l = u1 - u0, h = y1 - y0; if (l < .02 || h < .02) return; const u = (u0 + u1) / 2, y = (y0 + y1) / 2;
      W(ax, f, u, y, l, h, T, PL, g);
      if (y0 < .6) { const t = Math.min(y1, .6); W(ax, f, u, (y0 + t) / 2, l, t - y0, T + .14, STONE, g); }
      for (let yy = .7; yy < y1 - .2; yy += .5) if (yy > y0 - .05) { const o = (k++ % 3) * .3; for (let uu = u0 + .25 + o; uu < u1 - .1; uu += .9) W(ax, f, uu, yy, .5, .05, T + .04, PL2, g); }   // fiadas de pedra
    };
    for (const o of ops) {
      const l0 = o.c - o.w / 2, l1 = o.c + o.w / 2; seg(cur, l0, 0, H); seg(l0, l1, 0, o.y0); seg(l0, l1, o.y1, H);
      W(ax, f, l0, H / 2, .16, H, T + .1, TM, g); W(ax, f, l1, H / 2, .16, H, T + .1, TM, g); cur = l1;
    }
    seg(cur, a1, 0, H);
    W(ax, f, (a0 + a1) / 2, H - .09, a1 - a0, .18, T + .12, TM, g); W(ax, f, a0, H / 2, .24, H, T + .16, TM, g); W(ax, f, a1, H / 2, .24, H, T + .16, TM, g);
  }
  function win(ax, f, c, w, y0, y1, g) {
    const h = y1 - y0, y = (y0 + y1) / 2, s = Math.sign(f);
    W(ax, f, c, y1 + .07, w + .3, .14, T + .14, TM, g); W(ax, f, c, y0 - .05, w + .4, .1, T + .28, STONE, g);
    W(ax, f, c, y, w, .06, T + .06, TM, g); W(ax, f, c, y, .06, h, T + .06, TM, g);
    tr(W(ax, f, c, y, w, h, .03, 0xc9b8f0, g), .45);
    for (const k of [-1, 1]) {
      W(ax, f, c + k * (w / 2 + .04), y, .1, h, T + .1, TM, g);
      const uc = c + k * (w / 2 + w / 4 + .16); W(ax, f + s * .2, uc, y, w / 2, h, .06, SH, g);
      W(ax, f + s * .24, uc, y + h * .3, w / 2, .07, .04, TM, g); W(ax, f + s * .24, uc, y - h * .3, w / 2, .07, .04, TM, g);
    }
  }
  function door(c, w, h, g) {
    W('x', 3, c - w / 2 - .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', 3, c + w / 2 + .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', 3, c, h + .1, w + .5, .22, T + .14, TM, g);
    const p = new THREE.Group(); p.position.set(c - w / 2, 0, 2.98); p.rotation.y = 0; g.add(p); DR.push({ p, g, openRot: 1.05, c, f: 3, w, lvl: 0, id: 'herb-front' });
    for (let i = 0; i < 5; i++) B(w / 5 - .012, h - .06 + Math.random() * .04, .07, w / 5 * (i + .5), h / 2, 0, i % 2 ? DOOR : DOOR2, p);
    B(w, .12, .09, w / 2, .45, .01, IRON, p); B(w, .12, .09, w / 2, h - .45, .01, IRON, p); B(w, .06, .09, w / 2, h / 2, .01, TM, p);
    B(.2, .09, .1, .1, .45, .02, IRON, p); B(.2, .09, .1, .1, h - .45, .02, IRON, p);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 4, 8), M(IRON)); r.position.set(w - .15, 1.0, .07); p.add(r);
    B(.2, .2, .04, w / 2, h - .3, .06, 0xc9a85a, p);                                                                // placa de latão
  }
  XR = true;
  const DC = -1;                                                                                                  // porta em x=-1 (um pouco à esquerda do centro)
  wall('x', 3, -4, 4, [{ c: DC, w: 1.2, y0: 0, y1: 2.3 }, { c: -3, w: 1, y0: 1, y1: 2.1 }, { c: 1.8, w: 1.2, y0: 1, y1: 2.1 }], front);
  door(DC, 1.2, 2.3, front); win('x', 3, -3, 1, 1, 2.1, front); win('x', 3, 1.8, 1.2, 1, 2.1, front);
  B(2.0, .2, .9, DC, .12, 3.55, STONE); B(1.5, .12, .5, DC, .06, 4.2, STONE2);                                      // degraus da porta
  wall('x', -3, -4, 4, [], wB);
  wall('z', -4, -3, 3, [{ c: 0, w: 1.3, y0: 1, y1: 2.1 }], wL); win('z', -4, 0, 1.3, 1, 2.1, wL);
  wall('z', 4, -3, 3, [{ c: 1.5, w: 1.2, y0: 1, y1: 2.1 }], wR); win('z', 4, 1.5, 1.2, 1, 2.1, wR);
  // telhado de ardósia
  const L = Math.hypot(3.5, 2.6), A = Math.atan2(2.6, 3.5), RT = H + 2.6;
  for (const s of [1, -1]) {
    const g = new THREE.Group(); g.position.set(0, RT, 0); g.rotation.x = s * A; roof.add(g);
    B(9.4, .12, L, 0, -.12, s * L / 2, 0x2a2f36, g);
    for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) B(.15, .15, L, x, -.24, s * L / 2, TM, g);
    const l = L / 9; for (let i = 0; i < 9; i++) for (let j = 0; j < 10; j++) B(.98, .09, l * 1.3, -4.5 + j, .02 * ((i + j) % 2), s * (i + .5) * l, SLATE[(Math.random() * 4) | 0], g);
  }
  B(9.6, .16, .55, 0, RT + .07, 0, 0x252a30, roof); B(9.2, .2, .2, 0, RT - .1, 0, TM, roof);
  for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) B(.18, .18, 6.2, x, H - .1, 0, TM, roof);
  for (const x0 of [3.85, -4.15]) {                                                                                // empenas com óculo roxo
    const sh = new THREE.Shape(); sh.moveTo(-3, 0); sh.lineTo(3, 0); sh.lineTo(0, 2.6);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), M(PL)); m.rotation.y = Math.PI / 2; m.position.set(x0, H, 0); m.castShadow = true; roof.add(m);
    const q = Math.sign(x0), rw = C(.42, .42, .1, 10, x0 + T / 2 + q * .12, 4.5, 0, 0x9a88d8, roof, 0x3a2a70); rw.rotation.z = Math.PI / 2;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(.45, .06, 4, 10), M(TM)); rg.rotation.y = Math.PI / 2; rg.position.set(x0 + T / 2 + q * .14, 4.5, 0); roof.add(rg);
    B(.08, .9, .06, x0 + T / 2 + q * .16, 4.5, 0, TM, roof); B(.08, .06, .9, x0 + T / 2 + q * .16, 4.5, 0, TM, roof);
  }
  B(1, 6.1, .9, -2.6, 3.15, -3.5, STONE, roof); B(1.2, .15, 1.1, -2.6, 6.25, -3.5, STONE2, roof);                  // chaminé
  XR = false;

  // ── lareira interna e caldeirão fumegante ──
  B(.4, 2.1, .55, -3.55, 1.15, -2.55, STONE); B(.4, 2.1, .55, -1.65, 1.15, -2.55, STONE); B(2.3, .45, .55, -2.6, 2.35, -2.55, STONE); B(2.5, .1, .7, -2.6, 2.65, -2.55, TM);
  B(1.4, 1.9, .04, -2.6, 1.05, -2.83, 0x1b1512); B(1.6, .12, .8, -2.6, .17, -2.45, STONE2);
  B(1.6, .08, .08, -2.6, 1.95, -2.45, IRON); B(.03, .5, .03, -2.6, 1.7, -2.45, IRON);
  G(new THREE.SphereGeometry(.5, 9, 6, 0, 6.283, 1.5708, 1.5708), -2.6, 1.3, -2.45, IRON); C(.46, .46, .04, 9, -2.6, 1.3, -2.45, 0x4aff6a, undefined, 0x22cc44);
  for (let i = 0; i < 5; i++) B(.2, .1, .2, -3.0 + i * .2, .3, -2.45 + ((i * 7) % 3 - 1) * .1, 0x8a2a08, undefined, 0xff4a10);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.11, .45 + i * .08, 4), M(0xff8a1a, 0xff6a00)); f.position.set(-2.8 + i * .2, .55, -2.45); S.add(f); }
  { const bg = new THREE.Group(); bg.userData.dyn = 1; S.add(bg); for (let i = 0; i < 4; i++) { const b = G(new THREE.IcosahedronGeometry(.07, 0), -2.75 + i * .1, 1.4, -2.45 + ((i * 5) % 3 - 1) * .1, 0x7aff8a, 0x33cc55, bg); ARM.push({ o: b, bub: 1, y0: 1.4, ph: i * 1.7 }); } }
  B(.22, .2, .2, -3.3, 2.78, -2.55, 0xe8e0c8); B(.16, .1, .16, -3.3, 2.66, -2.55, 0xe8e0c8); for (const x of [-2.5, -2]) C(.04, .04, .2, 6, x, 2.8, -2.55, 0xe8dcb0);
  // ── estante de livros e poções, coruja ──
  B(2.6, 2.5, .1, 0, 1.35, -2.8, WOOD2); for (const x of [-1.3, 1.3]) B(.08, 2.5, .5, x, 1.35, -2.6, WOOD2);
  for (const y of [.1, .7, 1.3, 1.9, 2.55]) B(2.6, .06, .45, 0, y + .1, -2.6, WOOD);
  const bkc = [0x6b2a2a, 0x2a4a6b, 0x3a5a3a, 0x8a6a2e, 0x4a2e6b, 0x5a3a2a];
  for (const y of [.7, 1.3, 1.9]) for (let i = 0; i < 14; i++) if (((i * 5 + y * 7) | 0) % 10 > 2) B(.12, .36 + ((i * 3) % 4) * .03, .28, -1.1 + i * .17, y + .3, -2.6, bkc[(i + (y * 3 | 0)) % 6]);
  for (let i = 0; i < 4; i++) C(.1, .1, .22, 6, -.75 + i * .5, .3 + .14, -2.6, [0x55e0ff, 0xff66cc, 0x77ff77, 0xffdd55][i], undefined, [0x2299bb, 0xbb3388, 0x33bb33, 0xbb9922][i]);
  G(new THREE.IcosahedronGeometry(.13, 0), .6, 2.8, -2.6, 0xd9d4c8);
  { const ow = new THREE.Group(); ow.position.set(-.5, 2.55, -2.6); S.add(ow); C(.14, .12, .34, 6, 0, .17, 0, 0x8a7456, ow); G(new THREE.IcosahedronGeometry(.13, 0), 0, .42, 0, 0x9a8466, 0, ow);
    for (const s of [-1, 1]) { G(new THREE.ConeGeometry(.04, .1, 4), s * .08, .55, 0, 0x6a5a40, 0, ow); G(new THREE.IcosahedronGeometry(.035, 0), s * .06, .43, .1, 0xffd040, 0xaa8800, ow); } G(new THREE.ConeGeometry(.03, .08, 4), 0, .4, .13, 0xd09030, 0, ow).rotation.x = Math.PI / 2; }
  // ── bancada de destilação ──
  B(1.65, .1, .8, -2.575, .95, 2.45, WOOD); for (const zz of [2.15, 2.75]) for (const xx of [-3.3, -1.85]) B(.1, .9, .1, xx, .5, zz, WOOD2);
  G(new THREE.SphereGeometry(.17, 8, 6), -2.9, 1.25, 2.45, 0xc8e8ff, 0x5599cc); C(.04, .04, .35, 6, -2.9, 1.5, 2.45, 0xc8e8ff);
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.1, .02, 4, 8), M(0xc8e8ff)); t.position.set(-2.55, 1.1 + i * .07, 2.45); t.rotation.x = Math.PI / 2; S.add(t); }
  G(new THREE.SphereGeometry(.15, 8, 6), -2.2, 1.2, 2.45, 0xff9ad0, 0xbb3377); C(.12, .08, .1, 6, -2.0, 1.05, 2.6, 0xb8b0a0); B(.03, .2, .03, -1.98, 1.18, 2.6, WOOD);
  for (let i = 0; i < 3; i++) C(.06, .07, .2, 6, -3.25, 1.1, 2.2 + i * .25, [0x55e0ff, 0xffdd55, 0xaa77ff][i], undefined, [0x2299bb, 0xbb9922, 0x7744cc][i]);
  // ── prateleira de frascos na parede oeste ──
  for (const y of [1.2, 1.9]) B(.3, .06, 1.8, -3.7, y, 1.8, WOOD2);
  for (let i = 0; i < 6; i++) { const y = i < 3 ? 1.33 : 2.03, zz = 1.2 + (i % 3) * .6; C(.1, .1, .22, 6, -3.7, y, zz, [0x77ff77, 0xff6677, 0x66ccff, 0xffdd55, 0xaa77ff, 0x77ffdd][i], undefined, [0x33bb33, 0xbb3344, 0x2288bb, 0xbb9922, 0x7744cc, 0x33bb99][i]); C(.06, .06, .05, 6, -3.7, y + .13, zz, WOOD); }
  // ── escrivaninha, cadeira, pergaminhos e mapa de ervas ──
  B(1.4, .08, .8, 1.8, .9, 2.45, WOOD); for (const a of [-1, 1]) for (const b of [-1, 1]) B(.1, .85, .1, 1.8 + a * .6, .48, 2.45 + b * .3, WOOD2);
  B(.5, .06, .5, 1.8, .5, 1.65, WOOD); B(.5, .5, .05, 1.8, .8, 1.42, WOOD2); for (const a of [-1, 1]) for (const b of [-1, 1]) B(.05, .4, .05, 1.8 + a * .2, .3, 1.65 + b * .2, WOOD2);
  B(.4, .06, .3, 1.4, .96, 2.45, 0x6b2a2a); B(.4, .04, .3, 1.4, 1.0, 2.45, 0xe8d9a8); B(.5, .02, .3, 2.1, .95, 2.35, 0xe8d9a8); C(.03, .03, .14, 6, 2.1, 1.02, 2.75, 0xe8dcb0);
  G(new THREE.SphereGeometry(.18, 8, 6), 2.4, 1.2, 2.65, 0x4a8aaa, 0x113344); C(.03, .05, .15, 6, 2.4, 1.0, 2.65, IRON);
  B(.8, 1.1, .04, .4, 1.7, 2.82, 0xe8d9a8); for (let i = 0; i < 7; i++) B(.04, .04, .02, .4 + Math.cos(i * 1.3) * .3, 1.7 + Math.sin(i * 2.1) * .35, 2.79, 0xffd040, undefined, 0xaa8800);
  // ── lampião e ervas penduradas ──
  B(.02, .5, .02, .4, 2.65, .5, IRON); B(.2, .28, .2, .4, 2.3, .5, 0xffd890, undefined, 0xffb040);
  for (const zz of [-2, 0, 2]) B(8, .16, .2, 0, 2.95, zz, TM);
  for (let i = 0; i < 7; i++) { B(.04, .55, .04, -3.2 + i * .35, 2.65, -.3, 0x7a5a30); C(0, .13, .4, 5, -3.2 + i * .35, 2.3, -.3, [0x3f8a3a, 0x5aa04a, 0x8a6aa0][i % 3]); }
  // ── cama no canto dos fundos ──
  for (const xx of [1.65, 3.65]) for (const zz of [-2.75, -1.85]) B(.08, .4, .08, xx, .33, zz, WOOD2);
  B(2.2, .15, 1.1, 2.65, .5, -2.28, WOOD2); B(2.1, .2, 1, 2.65, .67, -2.28, 0xd6c394); B(1.4, .1, 1.02, 2.3, .8, -2.28, 0x4a2e6b); B(.4, .12, .7, 3.4, .83, -2.28, 0xf0ead8);
  B(.1, 1.1, 1.2, 3.78, .9, -2.28, WOOD2); B(.08, .55, 1.1, 1.58, .6, -2.28, WOOD2);
  // ── livros empilhados e espalhados ──
  const stk = (xx, zz, n) => { for (let i = 0; i < n; i++) { const m = B(.42 + ((i * 3) % 4) * .04, .09 + (i % 3) * .013, .3 + (i % 2) * .05, xx + ((i * 7) % 5 - 2) * .015, .17 + i * .11, zz + ((i * 5) % 5 - 2) * .015, bkc[(i + n) % 6]); m.rotation.y = ((i * 3) % 5 - 2) * .18; } };
  const flt = (xx, zz, r) => { const m = B(.4, .06, .3, xx, .16, zz, bkc[((xx * 3) | 0) & 3]); m.rotation.y = r; };
  const opn = (xx, zz, r) => { const g = new THREE.Group(); g.position.set(xx, .16, zz); g.rotation.y = r; S.add(g); for (const s of [-1, 1]) { const p = B(.22, .03, .3, s * .11, .02, 0, 0xe8d9a8, g); p.rotation.z = s * .12; } B(.46, .03, .32, 0, -.01, 0, 0x6b2a2a, g); };
  stk(3.55, 2.55, 6); stk(3.5, 1.9, 3); stk(3.55, -1.0, 5); stk(3.55, -.2, 2); stk(-3.5, -1.5, 4); stk(-3.5, .6, 5);
  flt(-.4, .5, .4); flt(.2, 1.1, -.6); opn(-1.1, -.3, .5); opn(.9, .1, -.3); flt(1.0, 1.9, .9); flt(-2.6, -1.6, .2);

  // ── exterior: torre do observatório no canto dos fundos ──
  const tx = 5.2, tz = -3.9;
  C(1.55, 1.7, 7, 10, tx, 3.5, tz, STONE); for (const y of [2.5, 5]) C(1.78, 1.78, .15, 10, tx, y, tz, STONE2);
  C(1.7, 1.7, .2, 10, tx, 7.1, tz, STONE2);
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; B(.4, .4, .3, tx + Math.cos(a) * 1.55, 7.4, tz + Math.sin(a) * 1.55, STONE).rotation.y = Math.PI / 2 - a; }
  for (const [y, n] of [[1.4, 3], [3.6, 4], [5.8, 4]]) for (let i = 0; i < n; i++) { const a = i * Math.PI / 2 + .2 + y * .3, r = 1.7 - .15 * y / 7 + .03; B(.25, .7, .12, tx + Math.cos(a) * r, y, tz + Math.sin(a) * r, 0xffe8a0, undefined, 0xcc9930).rotation.y = Math.PI / 2 - a; }
  B(1, 1.9, .2, tx, .95, tz + 1.62, DOOR); B(1.2, .2, .3, tx, 2, tz + 1.6, TM); B(.15, 1.9, .3, tx - .6, .95, tz + 1.6, TM); B(.15, 1.9, .3, tx + .6, .95, tz + 1.6, TM);
  {
    const ar = new THREE.Group(); ar.position.set(tx, 8.1, tz); ar.userData.dyn = 1; S.add(ar); C(.12, .18, .9, 6, 0, -.5, 0, TM, ar);
    for (const [rx, ry] of [[0, 0], [1.57, 0], [0, 1.57], [.8, .6]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.5, .025, 4, 16), M(0xd4a840, 0x664410)); t.rotation.set(rx, ry, 0); ar.add(t); }
    G(new THREE.SphereGeometry(.15, 8, 6), 0, 0, 0, 0x4a8aaa, 0x113344, ar); ARM.push({ o: ar, spin: 1 });
  }
  for (let i = 0; i < 3; i++) { const a = i * 2.09, l = C(.03, .03, 1.1, 5, tx - 1.0 + Math.cos(a) * .3, 7.7, tz + .3 + Math.sin(a) * .3, TM); l.rotation.z = Math.cos(a) * .3; l.rotation.x = Math.sin(a) * .3; }
  { const tb = C(.08, .12, 1.5, 8, tx - 1.0, 8.55, tz + .3, 0x6b4a2e); tb.rotation.z = -.9; tb.rotation.y = .4; C(.1, .1, .08, 8, tx - 1.0, 8.55, tz + .3, 0xd4a840).rotation.z = -.9; }


  // ── exterior: canteiros de ervas, estufa de vidro, barril de água, lampião de ametista e pedras do caminho ──
  const bed = (bx, bz) => {
    B(1.4, .3, 1.2, bx, .15, bz, WOOD2); B(1.25, .1, 1.05, bx, .3, bz, 0x4a3322);
    for (let i = 0; i < 7; i++) { const px = bx + (((i * 37) % 11) / 11 - .5) * 1.1, pz = bz + (((i * 53) % 13) / 13 - .5) * .9; C(0, .18, .4, 5, px, .55, pz, [0x3f8a3a, 0x5aa04a, 0x2f7a4a][i % 3]); if (i % 3 == 0) G(new THREE.IcosahedronGeometry(.08, 0), px, .8, pz, [0xff77cc, 0xffdd55, 0xaa77ff][(i / 3) | 0]); }
  };
  bed(5.6, .4); bed(5.6, 1.9); bed(5.6, 3.4);
  for (const [px, pz] of [[-7, -2], [-7, 2], [-4.2, -2], [-4.2, 2]]) B(.1, px < -5 ? 2.4 : 2.8, .1, px, px < -5 ? 1.3 : 1.5, pz, TM);
  for (const zz of [-2, 2]) tr(B(2.8, 2.2, .04, -5.6, 1.2, zz, 0xbfe0f5), .35);
  tr(B(.04, 2.2, 4, -7, 1.2, 0, 0xbfe0f5), .35);
  { const r = tr(B(3.1, .06, 4.3, -5.6, 2.7, 0, 0xbfe0f5), .35); r.rotation.z = .12; } B(3.1, .1, .1, -5.6, 2.55, -2, TM); B(3.1, .1, .1, -5.6, 2.55, 2, TM);
  for (const zz of [-1.3, 1.3]) { B(2.4, .35, .8, -5.6, .2, zz, WOOD2); B(2.3, .1, .7, -5.6, .38, zz, 0x4a3322); for (let i = 0; i < 5; i++) C(0, .2, .5, 5, -6.5 + i * .45, .7, zz, [0x3f8a3a, 0x5aa04a][i % 2]); }
  G(new THREE.IcosahedronGeometry(.25, 0), -5.6, .4, 0, 0xff77cc, 0x882255);
  C(.4, .5, .42, 10, 1.8, .21, 4.4, WOOD); C(.5, .4, .42, 10, 1.8, .6, 4.4, WOOD); for (const hh of [.1, .4, .72]) { const q = C(.5, .5, .06, 10, 1.8, hh, 4.4, IRON); q.scale.set(1.02, 1, 1.02); } tr(C(.37, .37, .03, 10, 1.8, .81, 4.4, 0x3a8fc0), .85);
  B(.12, 2.2, .12, -3, 1.1, 4.4, TM); B(.7, .1, .1, -2.65, 2.1, 4.4, TM); B(.2, .28, .2, -2.4, 1.85, 4.4, 0xe0c8ff, undefined, 0x8a50d0);
  for (let i = 0; i < 6; i++) B(.8, .1, .55, -1 + ((i * .7) % 1.4) - .5, .03, 4.2 + i * .9, STONE2).rotation.y = i;
  for (let i = 0; i < 7; i++) { const a = i * .9, mx = 1 + Math.cos(a) * .5, mz = -4.4 + Math.sin(a) * .4; C(.03, .04, .18, 5, mx, .09, mz, 0xe8e0c8); C(0, .14, .1, 6, mx, .2, mz, 0xd03a3a); }

  scene.add(root);

  // ── colisões (mesmo esquema das casas da vila) ──
  const K = KS;
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; o.map = true; if (dr) o.dr = dr; props.push(o); };
  for (let u = -4; u <= 4.01; u += .9) { if (u < -1.9 || u > -.1) block(u * K, 3.1 * K, .55); block(u * K, -3.1 * K, .55); }
  for (let v = -2.2; v <= 2.21; v += .9) { block(-4 * K, v * K, .55); block(4 * K, v * K, .55); }
  block(tx * K, tz * K, 1.9 * K); block((tx - 1.1) * K, (tz + 1.1) * K, 1.1 * K);                    // torre
  for (const zz of [.4, 1.9, 3.4]) block(5.6 * K, zz * K, .8 * K);                                    // canteiros
  for (const [bx, bz] of [[-7, -2], [-7, 0], [-7, 2], [-5.6, -2], [-5.6, 2], [-4.2, -2], [-4.2, 2]]) block(bx * K, bz * K, .6 * K);   // estufa
  block(1.8 * K, 4.4 * K, .6 * K); block(-3 * K, 4.4 * K, .3 * K);                                    // barril e lampião
  const FURN = [[-3.3, -2.5, .5], [-2.6, -2.5, .5], [-1.9, -2.5, .5], [-1.0, -2.6, .5], [0, -2.6, .5], [1.0, -2.6, .5], [2.2, -2.3, .6], [3.2, -2.3, .6],
    [-2.9, 2.45, .5], [-2.2, 2.45, .5], [-3.7, 1.3, .35], [-3.7, 1.9, .35], [-3.7, 2.5, .35], [1.4, 2.45, .45], [2.2, 2.45, .45], [1.8, 1.65, .32],
    [3.55, 2.55, .35], [3.5, 1.9, .3], [3.55, -1.0, .35], [-3.5, -1.5, .3], [-3.5, .6, .35]];
  FURN.forEach(([fx, fz, r]) => block(fx * K, fz * K, r * K));
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(d => d.p)); bakeGroup(roof);
  let FD; DR.forEach(d => { const dd = addDoor(d, { x, z, th, K }); FD = dd; [DC - .85, DC - .25, DC + .35].forEach(lx => block(lx * K, 3.1 * K, .55, dd)); });
  refreshProps();
  registerFloors({ x, z, th, K, hx: 4.2, hz: 3.2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: 3 }, { g: wB, nx: 0, nz: -1, D: 3 }, { g: wL, nx: -1, nz: 0, D: 4 }, { g: wR, nx: 1, nz: 0, D: 4 }], noStair: true });
  shellRects(HOUSES[HOUSES.length - 1], [DC, 1.2], FD, FURN, []);
  return { g: root, at, K };
}
