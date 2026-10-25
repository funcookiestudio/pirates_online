/* Casa da Dona Marta, Sítio das Aves (c. 1720–1750): quinta de reboco rosado com enxaimel, venezianas azul-petróleo, telhado de telha cerâmica com mansarda,
   chaminé e cata-vento de galo. Por dentro: lareira com panela, mesa de refeições, aparador de louça, estante de potes, cama com colcha, berço, guarda-roupa,
   roca de fiar, relógio de cuco, gaiola de canário e cestas de ovos. Mesmo molde das casas da vila: porta clicável, corte do telhado e das paredes quando se entra. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps } from './floors.js';
import { addDoor } from './doors.js';
import { addBed } from './beds.js';

export const AVES_HOUSE = { w: 8, d: 6 };      // dimensões externas (m): o resto do sítio se organiza em volta

/** style (opcional): { PL, PL2, SH, QUILT, QUILT2, roof:[4 cores] } troca a paleta para as outras fazendas */
export function buildAvesHouse(x, z, th, y0 = 0, style = {}) {
  const root = new THREE.Group();
  root.position.set(x, y0, z); root.rotation.y = th;
  const KS = 1.28, S = new THREE.Group(); S.scale.setScalar(KS); root.add(S);
  const DR = [];
  const PL = style.PL ?? 0xeccabd, PL2 = style.PL2 ?? 0xdcb4a6, STONE = 0x8c8880, STONE2 = 0x6e6a62, TM = 0x5a3a2a, DOOR = 0x6b4a2b, DOOR2 = 0x5c3f24, IRON = 0x2b2b30,
    WOOD = 0x9a7040, WOOD2 = 0x6e4d2c, SH = style.SH ?? 0x4d8088, TRIM = 0xf4efe2, QUILT = style.QUILT ?? 0xc85a78, QUILT2 = style.QUILT2 ?? 0xf0d8dc;
  let DEF = S, XR = false;
  function M(c, e) { const m = new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }); return XR ? xray(m) : m; }
  function B(w, h, d, x, y, z, c, p, e) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; }
  function C(rt, rb, h, n, x, y, z, c, p, e) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), M(c, e)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; }
  function SP(r, x, y, z, c, p, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), M(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); (p || DEF).add(m); return m; }
  function W(ax, f, u, y, l, h, t, c, g) { return ax == 'x' ? B(l, h, t, u, y, f, c, g) : B(t, h, l, f, y, u, c, g); }
  function tr(m, o) { m.material.transparent = true; m.material.opacity = o; return m; }

  // ── estrutura ──
  const H = 3, T = .3, front = new THREE.Group(), roof = new THREE.Group(), walls = new THREE.Group();
  S.add(front, roof, walls);
  const wB = new THREE.Group(), wL = new THREE.Group(), wR = new THREE.Group(); walls.add(wB, wL, wR);
  B(8.6, .4, 6.6, 0, -.1, 0, STONE2); B(7.7, .1, 5.7, 0, .06, 0, 0x5a4430);
  for (let i = 0; i < 8; i++) B(.94, .03, 5.7, -3.5 + i, .115, 0, i % 2 ? 0x6b5238 : 0x7a5e40);                 // assoalho de tábuas

  function wall(ax, f, a0, a1, ops, g) {
    ops.sort((a, b) => a.c - b.c); let cur = a0, k = 0;
    const seg = (u0, u1, y0, y1) => {
      const l = u1 - u0, h = y1 - y0; if (l < .02 || h < .02) return; const u = (u0 + u1) / 2, y = (y0 + y1) / 2;
      W(ax, f, u, y, l, h, T, PL, g);
      if (y0 < .6) { const t = Math.min(y1, .6); W(ax, f, u, (y0 + t) / 2, l, t - y0, T + .14, STONE, g); }
      if (y0 === 0 && y1 === H && l > 1.2) {
        const hh = H - .8, len = Math.hypot(l, hh), s = (k++ % 2) ? 1 : -1, m = W(ax, f, u, .7 + hh / 2, len, .12, T + .1, TM, g);
        if (ax == 'x') m.rotation.z = s * Math.atan2(hh, l); else m.rotation.x = -s * Math.atan2(hh, l);
      }
    };
    for (const o of ops) {
      const l0 = o.c - o.w / 2, l1 = o.c + o.w / 2; seg(cur, l0, 0, H); seg(l0, l1, 0, o.y0); seg(l0, l1, o.y1, H);
      W(ax, f, l0, H / 2, .16, H, T + .1, TM, g); W(ax, f, l1, H / 2, .16, H, T + .1, TM, g); cur = l1;
    }
    seg(cur, a1, 0, H);
    W(ax, f, (a0 + a1) / 2, H - .09, a1 - a0, .18, T + .12, TM, g); W(ax, f, a0, H / 2, .24, H, T + .16, TM, g); W(ax, f, a1, H / 2, .24, H, T + .16, TM, g);
    W(ax, f, (a0 + a1) / 2, 1.9, a1 - a0, .12, T + .08, TM, g);                                                  // travessa do meio do enxaimel
  }
  function win(ax, f, c, w, y0, y1, g, box) {
    const h = y1 - y0, y = (y0 + y1) / 2, s = Math.sign(f);
    W(ax, f, c, y1 + .07, w + .3, .14, T + .14, TM, g); W(ax, f, c, y0 - .05, w + .4, .1, T + .28, STONE, g);
    W(ax, f, c, y, w, .06, T + .06, TM, g); W(ax, f, c, y, .06, h, T + .06, TM, g);
    tr(W(ax, f, c, y, w, h, .03, 0xbfe0f0, g), .4);
    for (const k of [-1, 1]) {
      W(ax, f, c + k * (w / 2 + .04), y, .1, h, T + .1, TM, g);
      const uc = c + k * (w / 2 + w / 4 + .16); W(ax, f + s * .2, uc, y, w / 2, h, .06, SH, g);
      W(ax, f + s * .24, uc, y + h * .3, w / 2, .07, .04, TM, g); W(ax, f + s * .24, uc, y - h * .3, w / 2, .07, .04, TM, g);
      for (let i = -2; i <= 2; i++) W(ax, f + s * .235, uc + i * w / 10, y, .02, h - .1, .02, 0x2c4a4e, g);
    }
    if (box) {                                                                                                     // jardineira com flores
      W(ax, f + s * .3, c, y0 - .22, w + .1, .22, .26, WOOD2, g);
      for (let i = -2; i <= 2; i++) { const m = SP(.11, 0, 0, 0, [0xe05a7a, 0xf6e0e8, 0xe8c040, 0xe05a7a, 0xf6e0e8][i + 2], g); if (ax == 'x') m.position.set(c + i * w / 5, y0 - .06, f + s * .3); else m.position.set(f + s * .3, y0 - .06, c + i * w / 5); }
    }
  }
  function door(c, w, h, g) {
    W('x', 3, c - w / 2 - .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', 3, c + w / 2 + .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', 3, c, h + .1, w + .5, .22, T + .14, TM, g);
    const p = new THREE.Group(); p.position.set(c - w / 2, 0, 2.98); p.rotation.y = 0; g.add(p); DR.push({ p, g, openRot: 1.05, c, f: 3, w, lvl: 0, id: 'aves-front' });
    for (let i = 0; i < 5; i++) B(w / 5 - .012, h - .06 + Math.random() * .04, .07, w / 5 * (i + .5), h / 2, 0, i % 2 ? DOOR : DOOR2, p);
    B(w, .12, .09, w / 2, .45, .01, IRON, p); B(w, .12, .09, w / 2, h - .45, .01, IRON, p); B(w, .06, .09, w / 2, h / 2, .01, TM, p);
    B(.2, .09, .1, .1, .45, .02, IRON, p); B(.2, .09, .1, .1, h - .45, .02, IRON, p);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 4, 8), M(IRON)); r.position.set(w - .15, 1.0, .07); p.add(r);
  }
  XR = true;
  const DC = .8;                                                                                                   // porta em x=+0,8 (mundo -7,6 / pátio)
  wall('x', 3, -4, 4, [{ c: DC, w: 1.1, y0: 0, y1: 2.2 }, { c: -1.9, w: 1.3, y0: 1, y1: 2.1 }, { c: 2.9, w: 1.3, y0: 1, y1: 2.1 }], front);
  door(DC, 1.1, 2.2, front); win('x', 3, -1.9, 1.3, 1, 2.1, front, true); win('x', 3, 2.9, 1.3, 1, 2.1, front, true);
  B(1.5, .4, .1, DC, 2.65, 3.17, front.children.length ? TRIM : TRIM, front); B(1.3, .26, .06, DC, 2.65, 3.22, TM, front);      // verga com a data
  wall('x', -3, -4, 4, [{ c: -1.8, w: 1.2, y0: 1, y1: 2.1 }, { c: 1.8, w: 1.2, y0: 1, y1: 2.1 }], wB); win('x', -3, -1.8, 1.2, 1, 2.1, wB); win('x', -3, 1.8, 1.2, 1, 2.1, wB);
  wall('z', -4, -3, 3, [{ c: -.4, w: 1.3, y0: 1, y1: 2.1 }], wL); win('z', -4, -.4, 1.3, 1, 2.1, wL, true);
  wall('z', 4, -3, 3, [{ c: 1.7, w: 1.2, y0: 1, y1: 2.1 }], wR); win('z', 4, 1.7, 1.2, 1, 2.1, wR);
  B(2.0, .2, .9, DC, .12, 3.55, STONE); B(1.5, .12, .5, DC, .06, 4.2, STONE2);                                      // degraus da porta
  // telhado de telha cerâmica
  const L = Math.hypot(3.6, 2.2), A = Math.atan2(2.2, 3.6), RT = H + 2.2, sc = style.roof || [0xb4502e, 0xa84828, 0xbc5834, 0xa04226];
  for (const s of [1, -1]) {
    const g = new THREE.Group(); g.position.set(0, RT, 0); g.rotation.x = s * A; roof.add(g);
    B(9, .12, L, 0, -.12, s * L / 2, 0x3a281a, g);
    for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) B(.15, .15, L, x, -.24, s * L / 2, TM, g);
    const l = L / 9; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) B(.98, .09, l * 1.3, -4 + j, .02 * ((i + j) % 2), s * (i + .5) * l, sc[(Math.random() * 4) | 0], g);
  }
  B(9.2, .16, .55, 0, RT + .07, 0, 0x8c3a22, roof); B(9, .2, .2, 0, RT - .1, 0, TM, roof);
  for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) B(.18, .18, 6.3, x, H - .1, 0, TM, roof);
  for (const x0 of [3.85, -4.15]) {
    const sh = new THREE.Shape(); sh.moveTo(-3, 0); sh.lineTo(3, 0); sh.lineTo(0, 2.2);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), M(PL2)); m.rotation.y = Math.PI / 2; m.position.set(x0, H, 0); m.castShadow = true; roof.add(m);
    B(T + .1, 2.2, .14, x0 + T / 2, H + 1.1, 0, TM, roof); B(T + .1, .14, 6, x0 + T / 2, H + .05, 0, TM, roof);
    C(.32, .32, .06, 12, x0 + T / 2 + (x0 > 0 ? .06 : -.06), H + .75, 0, TM, roof).rotation.z = Math.PI / 2;           // óculo do sótão
  }
  {                                                                                                                // mansarda na água da frente
    const dx = -2.4, zf = 1.9, yf = RT - 2.2 * zf / 3.6;
    B(1.5, 1.6, 1.7, dx, yf + .32, zf - .85, PL, roof); B(1.56, .14, 1.76, dx, yf + 1.12, zf - .85, TM, roof); B(1.56, .14, 1.76, dx, yf - .48, zf - .85, TM, roof);
    for (const sx of [-.7, .7]) B(.12, 1.6, .14, dx + sx, yf + .32, zf, TM, roof);
    tr(B(.8, .9, .04, dx, yf + .32, zf + .02, 0xbfe0f0, roof), .45); B(.9, .1, .1, dx, yf - .18, zf + .08, WOOD2, roof);
    for (const s of [-1, 1]) { const q = B(1.1, .1, 1.95, dx + s * .55, yf + 1.4, zf - .85, 0xa84828, roof); q.rotation.z = -s * .75; }
    B(.18, .18, 2.0, dx, yf + 1.88, zf - .85, 0x8c3a22, roof);
  }
  B(1.1, RT + 1.0, 1.7, 4.4, (RT + 1.0) / 2, -.8, 0x7a5a48, roof); B(1.3, .22, 1.9, 4.4, RT + 1.1, -.8, 0x5a4636, roof); B(1.3, .5, 1.9, 4.4, .25, -.8, STONE, roof);        // chaminé
  for (const pz of [-.4, .4]) C(.14, .16, .5, 8, 4.4, RT + 1.5, -.8 + pz, 0xa04a2a, roof);
  B(.06, 1.1, .06, -3.3, RT + .62, 0, IRON, roof); B(.8, .12, .05, -3.3, RT + 1.05, 0, IRON, roof); SP(.17, -2.95, RT + 1.15, 0, 0xc82a1a, roof, 1.2, 1, .5);   // galo
  XR = false;
  // soleira em volta e detalhes fora da casa (peças pequenas e jardim ficam em farm-aves.js)
  // ── interior ──
  B(3.2, .02, 2.2, -.9, .13, .8, 0xc85a78); B(2.8, .025, 1.8, -.9, .135, .8, 0xf0d8dc); B(2.4, .03, 1.4, -.9, .14, .8, 0xc85a78);       // tapete rosa
  // lareira de pedra na parede leste, com coifa, panela, lenha e atiçador
  B(.9, H, 2.8, 3.4, H / 2, -.8, 0x9a6a52); B(.5, .9, 1.3, 3.65, .55, -.8, 0x1a1210); B(.4, .08, 1.5, 3.2, 1.12, -.8, WOOD2); 
  for (let i = 0; i < 5; i++) B(.3, .14, .3, 3.55, .22 + (i % 2) * .08, -1.15 + i * .18, [0xff7a20, 0xffb030, 0xff5a10][i % 3], undefined, [0xcc5a10, 0xff8a20, 0xcc3a08][i % 3]);
  B(.1, .1, 1.1, 3.3, 1.0, -.8, IRON); C(.3, .22, .3, 10, 3.3, .85, -.8, IRON); for (const sz of [-1.3, -.3]) B(.04, 1.0, .04, 3.3, 1.3, sz, IRON);
  for (let i = 0; i < 3; i++) C(.07, .07, .8, 6, 3.05, .28 + i * .16, .55, 0x7a5430).rotation.z = Math.PI / 2;
  // mesa de refeições com bancos e tigelas; fruteira, pão e jarra
  B(1.5, .08, .8, -1.0, .8, .8, WOOD); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.09, .76, .09, -1.0 + sx * .64, .4, .8 + sz * .3, WOOD2);
  B(1.3, .06, .06, -1.0, .3, .8, WOOD2);
  for (const sz of [-1, 1]) { B(1.3, .07, .3, -1.0, .45, .8 + sz * .6, WOOD); for (const sx of [-1, 1]) B(.08, .42, .24, -1.0 + sx * .55, .22, .8 + sz * .6, WOOD2); }
  for (const sx of [-1, 1]) { B(.32, .07, .32, -1.0 + sx * 1.0, .42, .8, WOOD); for (const q of [[-1, -1], [1, 1]]) B(.06, .42, .06, -1.0 + sx * 1.0 + q[0] * .11, .21, .8 + q[1] * .11, WOOD2); }
  for (const sx of [-.45, .45]) for (const sz of [-.18, .18]) C(.1, .07, .05, 8, -1.0 + sx, .86, .8 + sz, 0xf4efe2);
  C(.07, .09, .18, 8, -.85, .93, .8, 0x8a5a3a); B(.3, .09, .18, -1.2, .88, .8, 0xd8a860); for (let i = 0; i < 4; i++) SP(.06, -.65 + i * .07, .92 + (i & 1) * .02, .88, [0xc83a2a, 0xe8c040, 0xc83a2a, 0x6ab04a][i]);
  // aparador de louça na parede do fundo (portas, prateleiras e pratos)
  B(1.9, 1.0, .55, -1.0, .6, -2.7, WOOD2); B(2.0, .1, .62, -1.0, 1.12, -2.7, WOOD); B(1.8, 1.0, .35, -1.0, 1.7, -2.82, WOOD2); B(1.8, .06, .4, -1.0, 2.15, -2.8, WOOD); B(1.8, .06, .4, -1.0, 1.65, -2.8, WOOD);
  for (const s of [-1, 1]) { B(.82, .85, .05, -1.0 + s * .47, .6, -2.4, WOOD, undefined); B(.06, .12, .06, -1.0 + s * .1, .65, -2.36, 0xc8a040); }
  for (let i = 0; i < 6; i++) { const p = C(.2, .2, .03, 12, -1.7 + i * .28, 1.95, -2.9, i % 2 ? 0xf4efe2 : 0x5a8aa8); p.rotation.x = Math.PI / 2 - .2; }
  for (let i = 0; i < 4; i++) C(.09, .08, .18, 8, -1.55 + i * .35, 1.73, -2.82, [0xf4efe2, 0x5a8aa8, 0xc83a2a, 0xf4efe2][i]);
  // estante de potes e especiarias
  for (const y of [.9, 1.5, 2.1]) B(1.9, .06, .35, 1.4, y, -2.8, WOOD2); for (const sx of [-.9, .9]) B(.08, 2.1, .35, 1.4 + sx, 1.1, -2.8, WOOD2);
  for (let i = 0; i < 6; i++) { const x = .6 + i * .31; C(.1, .12, .3, 7, x, 1.08, -2.8, [0xa0623a, 0x8a5030, 0xc9b48a][i % 3]); C(.06, .08, .3, 6, x + .08, 1.68, -2.8, [0xc83a2a, 0xe8c040, 0x6a8a3a][i % 3]); C(.1, .1, .3, 8, x, 2.28, -2.8, [0xf4efe2, 0xd8b848, 0xa04a2a][i % 3]); }
  // relógio de cuco acima do aparador
  B(.5, .7, .3, -1.0, 2.55, -2.82, WOOD2); { const rf = new THREE.Mesh(new THREE.ConeGeometry(.42, .3, 4), M(0x8c3a22)); rf.rotation.y = Math.PI / 4; rf.position.set(-1.0, 3.0, -2.82); S.add(rf); }
  C(.14, .14, .04, 10, -1.0, 2.6, -2.66, 0xf4efe2).rotation.x = Math.PI / 2; B(.03, .1, .02, -1.0, 2.64, -2.63, IRON); B(.02, .05, .02, -.96, 2.6, -2.63, IRON);
  for (const sx of [-.12, .12]) { B(.03, .3, .03, -1.0 + sx, 2.05, -2.66, 0x999999); C(.06, .05, .12, 6, -1.0 + sx, 1.9, -2.66, 0x7a5a2a); }
  // guarda-roupa de duas portas
  B(1.1, 2.3, .6, 3.15, 1.15, -2.6, WOOD2); for (const s of [-1, 1]) { B(.5, 2.0, .05, 3.15 + s * .26, 1.15, -2.28, WOOD); B(.04, .16, .05, 3.15 + s * .05, 1.15, -2.24, 0xc8a040); } B(1.2, .14, .7, 3.15, 2.35, -2.6, WOOD);
  // cama de casal com dossel simples, colcha, travesseiros e arca no pé; berço ao lado
  B(1.8, .35, 2.4, -3.0, .35, -1.75, WOOD2); B(1.7, .22, 2.3, -3.0, .6, -1.75, 0xf4efe2); B(1.76, .2, 1.5, -3.0, .74, -1.35, QUILT); B(1.78, .06, 1.52, -3.0, .86, -1.35, QUILT2);
  B(1.8, 1.4, .12, -3.0, 1.1, -2.92, WOOD2); B(1.8, .8, .12, -3.0, .8, -.55, WOOD2); for (const sx of [-.85, .85]) B(.1, 1.8, .1, -3.0 + sx, 1.0, -.55, WOOD2);
  for (const sx of [-.42, .42]) B(.7, .16, .4, -3.0 + sx, .78, -2.5, 0xf4efe2);
  B(1.6, .5, .6, -3.0, .35, -.05, WOOD); B(1.7, .08, .66, -3.0, .62, -.05, WOOD2);
  { const cr = new THREE.Group(); cr.position.set(-1.75, 0, -2.0); S.add(cr); B(.8, .12, .5, 0, .35, 0, WOOD2, cr); for (const sz of [-1, 1]) B(.8, .32, .06, 0, .55, sz * .25, WOOD, cr); for (const sx of [-1, 1]) { B(.06, .5, .5, sx * .4, .5, 0, WOOD, cr); } B(.7, .14, .4, 0, .48, 0, QUILT2, cr); }
  // roca de fiar com cesto de lã (canto da frente, à direita)
  { const wh = new THREE.Group(); wh.position.set(3.0, 0, 2.0); wh.rotation.y = -.5; S.add(wh); B(.9, .08, .5, 0, .3, 0, WOOD2, wh); for (const sx of [-.3, .3]) B(.06, .3, .06, sx, .15, 0, WOOD2, wh);
    const w1 = C(.45, .45, .06, 14, -.1, .75, 0, WOOD, wh); w1.rotation.x = Math.PI / 2; for (let i = 0; i < 6; i++) { const sp = B(.05, .85, .03, -.1, .75, 0, WOOD2, wh); sp.rotation.z = i * Math.PI / 6; }
    B(.06, .8, .06, .3, .7, 0, WOOD2, wh); B(.4, .06, .06, .3, 1.1, 0, WOOD2, wh); SP(.18, .45, 1.1, 0, 0xf4efe2, wh); B(.5, .3, .5, 1.05, .15, 0, 0xb8864a, wh); SP(.2, 1.05, .35, 0, 0xe8d8b8, wh); }
  // cestas de ovos, sacos de ração e caixote de legumes (canto da frente, à esquerda)
  for (const [bx, bz, bc] of [[-3.3, 2.2, 0xb8864a], [-2.7, 2.35, 0xb8864a]]) { B(.7, .3, .5, bx, .3, bz, bc); for (let i = 0; i < 5; i++) SP(.1, bx - .25 + i * .12, .5, bz + (i % 2) * .1, i % 2 ? TRIM : 0xe8d8b8, undefined, 1, 1.2, 1); }
  SP(.4, -3.4, .4, 1.3, 0xcdb88a, undefined, 1, 1, .8); SP(.38, -3.45, .85, 1.35, 0xcdb88a, undefined, .9, .8, .7); B(.7, .5, .6, -3.35, .35, .4, WOOD2); for (let i = 0; i < 4; i++) SP(.12, -3.5 + i * .14, .66, .4, [0xe8862a, 0x6ab04a, 0xb83a2a, 0xe8862a][i]);
  // barril de água e bacia de lavar junto à janela dos fundos
  C(.32, .38, .75, 10, 0.4, .4, -2.4, WOOD2); for (const y of [.2, .55]) { const q = C(.4, .4, .05, 10, .4, y, -2.4, IRON); q.scale.set(1.02, 1, 1.02); }
  // vigas, cordas de cebolas e pimentas, ervas e lampiões
  for (const z of [-2, 0, 2]) B(8, .16, .2, 0, 2.95, z, TM);
  for (let i = 0; i < 7; i++) B(.06, .5 + (i % 3) * .1, .06, -3 + i * .45, 2.65, 0, [0xb83a2a, 0xd4a830, 0x4a7a3a, 0xe8d8b8][i % 4]);
  for (let i = 0; i < 5; i++) { SP(.11, 1.4 + i * .1, 2.35 - i * .12, 2.0, 0xe8d8b8); } B(.02, .7, .02, 1.8, 2.7, 2.0, 0xb89a5a);
  for (const q of [[-2.6, 1.0], [1.6, 1.2], [-1.0, -1.5]]) { B(.01, .3, .01, q[0], 2.8, q[1], 0x999999); B(.12, .16, .12, q[0], 2.55, q[1], 0xffd890, undefined, 0xffb040); }
  // gaiola de canário pendurada junto à janela da frente
  { const gc = new THREE.Group(); gc.position.set(-1.9, 2.15, 2.4); S.add(gc); B(.01, .5, .01, 0, .4, 0, 0x999999, gc); C(.2, .2, .04, 10, 0, 0, 0, 0xc8a040, gc); C(.2, .2, .04, 10, 0, .4, 0, 0xc8a040, gc); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B(.015, .4, .015, Math.cos(a) * .19, .2, Math.sin(a) * .19, 0xc8a040, gc); } SP(.07, 0, .08, 0, 0xf2d230, gc, 1.2, 1, 1); }
  // quadro bordado na parede oeste e armação com chapéus
  B(.05, .6, .9, -3.95, 1.9, 1.5, WOOD2); B(.06, .5, .8, -3.93, 1.9, 1.5, 0xe8d8b8); B(.07, .3, .5, -3.91, 1.9, 1.5, 0xc85a78);
  for (let i = 0; i < 3; i++) B(.08, .08, .2, -3.9, 1.6, 2.3 + i * .0 - .4 * i, WOOD2);

  scene.add(root);

  // ── colisões (mesmo esquema das casas da vila) ──
  const K = KS;
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; if (dr) o.dr = dr; props.push(o); };
  for (let u = -4; u <= 4.01; u += .9) { if (u < -.4 || u > 2.0) block(u * K, 3.1 * K, .55); block(u * K, -3.1 * K, .55); }
  for (let v = -2.2; v <= 2.21; v += .9) { block(-4 * K, v * K, .55); block(4 * K, v * K, .55); }
  [[3.5, -.8, .8], [3.5, -1.6, .7], [3.5, 0, .7], [4.5, -.8, .9], [-1.4, .8, .5], [-.6, .8, .5], [-1.5, -2.6, .55], [-.5, -2.6, .55], [1.0, -2.7, .5], [1.8, -2.7, .5],
   [3.1, -2.6, .65], [-3.0, -2.5, .8], [-3.0, -1.5, .8], [-3.0, -.5, .55], [-1.75, -2.0, .5], [3.0, 2.0, .6], [-3.3, 2.25, .5], [-2.7, 2.35, .45], [-3.4, 1.3, .5], [0.4, -2.4, .4]]
    .forEach(([fx, fz, r]) => block(fx * K, fz * K, r * K));
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(d => d.p)); bakeGroup(roof);
  DR.forEach(d => { const dd = addDoor(d, { x, z, th, K }); [0, .6, 1.2, 1.8].forEach(lx => block(lx * K, 3.1 * K, .55, dd)); });
  refreshProps();
  registerFloors({ x, z, th, K, hx: 4.2, hz: 3.2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: 3 }, { g: wB, nx: 0, nz: -1, D: 3 }, { g: wL, nx: -1, nz: 0, D: 4 }, { g: wR, nx: 1, nz: 0, D: 4 }], noStair: true });
  // cama de casal: o dorminhoco deita de costas, cabeça no travesseiro (fundo), pés para a frente
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.8, .7, 2.4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(-3.0, .8, -1.75); hit.userData.dyn = 1; S.add(hit);
  const bf = at(-3.0 * K, -.75 * K), ba = at(-2.3 * K, -.1 * K);
  const bed = addBed({ x: bf[0], z: bf[1], y: y0 + .88 * K + .18, ry: th, ax: ba[0], az: ba[1], hit });
  return { g: root, at, bed };
}
