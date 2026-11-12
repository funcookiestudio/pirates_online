/* Kit das casas do Bairro do Porto (pescador, padeira, curandeira, carpinteiro): paredes de reboco com enxaimel, janelas com venezianas,
   porta de tábuas, telhado de duas águas e mobília comum. É o mesmo método da casa da mercadora (trader-house.js), só que parametrizado,
   para as quatro casas novas terem a mesma qualidade e a mesma geometria (paredes, vãos e telhado sempre fecham certinho). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps, HOUSES } from './floors.js';
import { addDoor } from './doors.js';
import { addBed } from './beds.js';
import { addRect } from './imap.js';
import { regLight } from './house-lights.js';

export const HOUSE_K = 1.28;
export const STONE = 0x7b786f, STONE2 = 0x66635c, TM = 0x4a3320, DOOR = 0x6b4a2b, DOOR2 = 0x5c3f24, IRON = 0x2b2b30, WOOD = 0x8a6238, WOOD2 = 0x6e4d2c;
const GLASS = 0xbfe0f0;

/** Começa uma casa em (x,z) olhando para o ponto/ângulo `th` (giro y: a frente é +z local).
    o: { id (0-15, cor do vidro), HW, HD (meia-largura e meia-profundidade internas), H (altura da parede), RISE (altura do telhado),
         PL (reboco), SH (veneziana), roof: [4 cores de telha], doorId } */
export function startHouse(x, z, th, o) {
  const K = HOUSE_K, HW = o.HW ?? 4, HD = o.HD ?? 3, H = o.H ?? 3, RISE = o.RISE ?? 2.2, PL = o.PL ?? 0xe8cf9f, SH = o.SH ?? 0x7a2e22;
  regLight(o.id, x, z);
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); S.scale.setScalar(K); root.add(S);
  const DR = [], T = .3;
  const front = new THREE.Group(), roof = new THREE.Group(), walls = new THREE.Group();
  S.add(front, roof, walls);
  const wB = new THREE.Group(), wL = new THREE.Group(), wR = new THREE.Group(); walls.add(wB, wL, wR);
  const k = { x, z, th, K, HW, HD, H, RISE, PL, SH, S, root, front, roof, wB, wL, wR, DR, T, id: o.id, doorId: o.doorId };
  let XR = false, DEF = S;
  k.xr = v => { XR = v; };
  k.def = g => { DEF = g; };
  const mat = (c, e) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }); return XR ? xray(m) : m; };
  k.M = mat;
  /** caixa */
  const B = (w, h, d, px, py, pz, c, p, e) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, e)); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; };
  /** cilindro */
  const C = (rt, rb, h, n, px, py, pz, c, p, e) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), mat(c, e)); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; (p || DEF).add(m); return m; };
  /** esfera achatada */
  const Sp = (r, sx, sy, sz, px, py, pz, c, p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(c)); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.castShadow = true; (p || DEF).add(m); return m; };
  /** peça de parede: eixo 'x' (parede ao longo de x, no plano z=f) ou 'z' (ao longo de z, plano x=f); u = posição ao longo, l = comprimento, t = espessura */
  const W = (ax, f, u, y, l, h, t, c, g) => ax === 'x' ? B(l, h, t, u, y, f, c, g) : B(t, h, l, f, y, u, c, g);
  const tr = (m, op) => { m.material.transparent = true; m.material.opacity = op; return m; };
  Object.assign(k, { B, C, Sp, W, tr });

  // base de pedra e assoalho de tábuas (sempre 0,3 m maior que a casa)
  B(2 * HW + .6, .4, 2 * HD + .6, 0, -.1, 0, STONE2);
  B(2 * HW - .3, .1, 2 * HD - .3, 0, .06, 0, 0x5a4430);
  for (let i = 0; i < 2 * HW; i++) B(.94, .03, 2 * HD - .3, -HW + .5 + i, .115, 0, i % 2 ? 0x6b5238 : 0x7a5e40);

  /** parede com vãos (ops: [{c, w, y0, y1}]) em reboco, rodapé de pedra, enxaimel em X e batentes; `g` é o grupo (para ocultar em jogo) */
  k.wall = (ax, f, a0, a1, ops, g) => {
    ops.sort((a, b) => a.c - b.c); let cur = a0, n = 0;
    const seg = (u0, u1, y0, y1) => {
      const l = u1 - u0, h = y1 - y0; if (l < .02 || h < .02) return;
      const u = (u0 + u1) / 2, y = (y0 + y1) / 2;
      W(ax, f, u, y, l, h, T, PL, g);
      if (y0 < .6) { const t = Math.min(y1, .6); W(ax, f, u, (y0 + t) / 2, l, t - y0, T + .14, STONE, g); }
      if (y0 === 0 && y1 === H && l > 1.2) {   // painel cheio: diagonal de enxaimel
        const hh = H - .8, len = Math.hypot(l, hh), s = (n++ % 2) ? 1 : -1, m = W(ax, f, u, .7 + hh / 2, len, .12, T + .1, TM, g);
        if (ax === 'x') m.rotation.z = s * Math.atan2(hh, l); else m.rotation.x = -s * Math.atan2(hh, l);
      }
    };
    for (const o of ops) {
      const l0 = o.c - o.w / 2, l1 = o.c + o.w / 2;
      seg(cur, l0, 0, H); seg(l0, l1, 0, o.y0); seg(l0, l1, o.y1, H);
      W(ax, f, l0, H / 2, .16, H, T + .1, TM, g); W(ax, f, l1, H / 2, .16, H, T + .1, TM, g); cur = l1;
    }
    seg(cur, a1, 0, H);
    W(ax, f, (a0 + a1) / 2, H - .09, a1 - a0, .18, T + .12, TM, g);   // viga de respaldo
    W(ax, f, a0, H / 2, .24, H, T + .16, TM, g); W(ax, f, a1, H / 2, .24, H, T + .16, TM, g);   // pilares dos cantos
  };
  /** janela: moldura, peitoril de pedra, vidro (cor 0xbfe0f0|id: a luz da noite), caixilho e duas venezianas */
  k.win = (ax, f, c, w, y0, y1, g, shut = true) => {
    const h = y1 - y0, y = (y0 + y1) / 2, s = Math.sign(f);
    W(ax, f, c, y1 + .07, w + .3, .14, T + .14, TM, g); W(ax, f, c, y0 - .05, w + .4, .1, T + .28, STONE, g);
    W(ax, f, c, y, w, .06, T + .06, TM, g); W(ax, f, c, y, .06, h, T + .06, TM, g);
    tr(W(ax, f, c, y, w, h, .03, GLASS | o.id, g), .4);
    for (const q of [-1, 1]) {
      W(ax, f, c + q * (w / 2 + .04), y, .1, h, T + .1, TM, g);
      if (!shut) continue;
      const uc = c + q * (w / 2 + w / 4 + .16);
      W(ax, f + s * .2, uc, y, w / 2, h, .06, SH, g);
      W(ax, f + s * .24, uc, y + h * .3, w / 2, .07, .04, TM, g); W(ax, f + s * .24, uc, y - h * .3, w / 2, .07, .04, TM, g);
      for (let i = -2; i <= 2; i++) W(ax, f + s * .235, uc + i * w / 10, y, .02, h - .1, .02, 0x2c4234, g);
    }
  };
  /** porta de entrada na parede da frente (z = HD), centrada em c: batente, folha de tábuas, ferragens e argola */
  k.door = (c, w, h, g, id) => {
    W('x', HD, c - w / 2 - .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', HD, c + w / 2 + .09, h / 2, .18, h + .1, T + .14, TM, g); W('x', HD, c, h + .1, w + .5, .22, T + .14, TM, g);
    const p = new THREE.Group(); p.position.set(c - w / 2, 0, HD - .02); g.add(p);
    DR.push({ p, g, openRot: 1.05, c, f: HD, w, lvl: 0, id });
    for (let i = 0; i < 5; i++) B(w / 5 - .012, h - .06 + ((i * 7) % 5) * .008, .07, w / 5 * (i + .5), h / 2, 0, i % 2 ? DOOR : DOOR2, p);
    B(w, .12, .09, w / 2, .45, .01, IRON, p); B(w, .12, .09, w / 2, h - .45, .01, IRON, p); B(w, .06, .09, w / 2, h / 2, .01, TM, p);
    B(.2, .09, .1, .1, .45, .02, IRON, p); B(.2, .09, .1, .1, h - .45, .02, IRON, p);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 4, 8), mat(IRON)); r.position.set(w - .15, 1.0, .07); p.add(r);
  };
  /** telhado de duas águas com fileiras de telhas, cumeeira, caibros e empenas triangulares. cols: 4 cores de telha */
  k.gable = cols => {
    const run = HD + .6, A = Math.atan2(RISE, run), L = Math.hypot(run, RISE), RT = H + RISE, RW = 2 * HW + 1;
    const nx = Math.round(RW / .95), tw = RW / nx, ny = Math.max(5, Math.round(L / .48)), l = L / ny;
    for (const s of [1, -1]) {
      const g = new THREE.Group(); g.position.set(0, RT, 0); g.rotation.x = s * A; roof.add(g);
      B(RW, .12, L, 0, -.12, s * L / 2, 0x3a281a, g);   // forro de tábuas sob as telhas
      for (let i = 0; i <= 4; i++) B(.15, .15, L, -HW + i * (2 * HW) / 4, -.24, s * L / 2, TM, g);   // caibros
      for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) B(tw * 1.03, .09, l * 1.3, -RW / 2 + tw * (j + .5), .02 * ((i + j) % 2), s * (i + .5) * l, cols[(i * 5 + j * 3 + (i >> 1)) % cols.length], g);
    }
    B(RW + .2, .16, .55, 0, RT + .07, 0, 0x2e2118, roof); B(RW, .2, .2, 0, RT - .1, 0, TM, roof);   // cumeeira e viga mestra
    for (let i = 0; i <= 4; i++) B(.18, .18, 2 * HD + .3, -HW + i * (2 * HW) / 4, H - .1, 0, TM, roof);   // vigas do forro
    for (const x0 of [HW - .15, -HW - .15]) {   // empenas: triângulo de reboco com viga e escora de enxaimel
      const sh = new THREE.Shape(); sh.moveTo(-HD, 0); sh.lineTo(HD, 0); sh.lineTo(0, RISE);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), mat(PL)); m.rotation.y = Math.PI / 2; m.position.set(x0, H, 0); m.castShadow = true; roof.add(m);
      B(T + .1, RISE, .14, x0 + T / 2, H + RISE / 2, 0, TM, roof); B(T + .1, .14, 2 * HD, x0 + T / 2, H + .05, 0, TM, roof);
    }
  };

  // ── mobília e adereços comuns (coordenadas locais da casa, antes da escala K) ──
  k.barrel = (px, pz, y = 0, c = WOOD) => { C(.38, .45, .45, 10, px, y + .22, pz, c); C(.45, .38, .45, 10, px, y + .67, pz, c); for (const yy of [.12, .45, .78]) { const q = C(.46, .46, .05, 10, px, y + yy, pz, IRON); q.scale.set(1.02, 1, 1.02); } };
  k.crate = (px, py, pz, s, r = 0, c = 0x9a7444) => { const m = B(s, s, s, px, py, pz, c); m.rotation.y = r; B(s + .02, .05, s + .02, px, py + s * .3, pz, WOOD2).rotation.y = r; B(s + .02, .05, s + .02, px, py - s * .3, pz, WOOD2).rotation.y = r; return m; };
  k.sack = (px, pz, c = 0xcdb88a, r = 0, y = 0, s = 1) => { const m = Sp(.35 * s, 1, .8, .7, px, y + .3 * s, pz, c); m.rotation.y = r; return m; };
  k.stool = (px, pz, c = WOOD) => { C(.22, .22, .06, 10, px, .46, pz, c); for (const [a, b] of [[.12, .12], [-.12, .12], [.12, -.12], [-.12, -.12]]) B(.05, .44, .05, px + a, .22, pz + b, WOOD2); };
  /** mesa retangular com tampo e quatro pernas; devolve a altura do tampo */
  k.table = (px, pz, w, d, c = WOOD, h = .8) => { B(w, .08, d, px, h, pz, c); for (const a of [-1, 1]) for (const b of [-1, 1]) B(.09, h, .09, px + a * (w / 2 - .1), h / 2, pz + b * (d / 2 - .1), WOOD2); B(w - .2, .06, .06, px, .3, pz - d / 2 + .1, WOOD2); B(w - .2, .06, .06, px, .3, pz + d / 2 - .1, WOOD2); return h + .04; };
  /** lampião pendurado do teto (acende à noite, apaga às 22h: cor 0xffd891) */
  k.lamp = (px, pz, y = 2.55) => { B(.01, 3 - y - .1, .01, px, (y + 2.9) / 2, pz, 0x999999); B(.1, .14, .1, px, y, pz, 0xffd891, S, 0xffb040); B(.16, .04, .16, px, y + .1, pz, IRON); B(.12, .03, .12, px, y - .09, pz, IRON); };
  /** vela sobre um móvel (cor 0xffc041, apaga com as luzes) */
  k.candle = (px, py, pz) => { C(.05, .05, .05, 8, px, py + .02, pz, IRON); C(.025, .025, .14, 6, px, py + .1, pz, 0xeadfb8); B(.04, .06, .04, px, py + .2, pz, 0xffc041, S, 0xffa020); };
  /** prateleira de parede na parede de trás (z = -HD): tábua + suportes */
  k.shelf = (px, y, pz, w, d = .35, c = WOOD2) => { B(w, .06, d, px, y, pz, c); for (const a of [-1, 1]) B(.05, .22, d - .05, px + a * (w / 2 - .12), y - .13, pz, TM); };
  /** cama de madeira junto à parede da esquerda (cabeceira em -x): colchão, colcha, travesseiro; devolve o ponto dos pés do dorminhoco */
  k.bed = (ox, oz, quilt = 0x7a2e22, sheet = 0xd6c394) => {
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(.12, .5, .12, ox + a * .95, .35, oz + b * .5, TM);
    B(2.0, .12, 1.05, ox, .5, oz, WOOD2); B(1.95, .2, 1.0, ox, .62, oz, sheet); B(1.4, .1, 1.02, ox + .2, .75, oz, quilt);
    B(.4, .12, .7, ox - .65, .78, oz, 0xf0ead8); B(.1, 1.1, 1.1, ox - 1.0, .85, oz, WOOD2); B(.1, .5, 1.1, ox + 1.0, .6, oz, WOOD2);
  };
  return k;
}

/** Fecha a casa: colisões, porta, cama, andares/raio-x e dados do morador. Mesmo contrato das outras casas: devolve { g, th, at, pts, front }.
    f: { furn: [[u,v,r]] móveis (círculos para NPCs e retângulos p/ o jogador), rects: [[u0,v0,u1,v1]] retângulos extras,
         bed: { ox, oz } (cama; cabeceira em -x), door: { c, w, h }, home: [u,v] (onde o morador fica), talk: [u,v] }
    As posições f.* são locais, antes de K. */
export function finishHouse(k, f) {
  const { x, z, th, K, HW, HD, S, root, front, roof, wB, wL, wR, DR } = k;
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; o.map = true; if (dr) o.dr = dr; props.push(o); };
  const d = f.door, dl = d.c - d.w / 2 - .25, dh = d.c + d.w / 2 + .25;
  // paredes: círculos de .45 m a cada .9 m (menos no vão da porta); atrás e dos lados inteiras
  for (let u = -HW; u <= HW + .01; u += .9) { if (u < dl || u > dh) block(u * K, (HD + .1) * K, .45); block(u * K, -(HD + .1) * K, .45); }
  for (let v = -HD + .8; v <= HD - .79; v += .9) { block(-HW * K, v * K, .45); block(HW * K, v * K, .45); }
  f.furn.forEach(([fx, fz, r]) => block(fx * K, fz * K, r));
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(q => q.p)); bakeGroup(roof);
  let FD;
  DR.forEach(q => { const dd = addDoor(q, { x, z, th, K }); FD = dd; for (let lx = d.c - d.w / 2 + .1; lx <= d.c + d.w / 2; lx += .6) block(lx * K, (HD + .1) * K, .45, dd); });
  // mapa de retângulos do interior (jogador): paredes, vão da porta, móveis
  registerFloors({ x, z, th, K, hx: HW + .2, hz: HD + .2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: HD }, { g: wB, nx: 0, nz: -1, D: HD }, { g: wL, nx: -1, nz: 0, D: HW }, { g: wR, nx: 1, nz: 0, D: HW }], noStair: true });
  const h = HOUSES[HOUSES.length - 1], T = .15, g0 = d.c - d.w / 2, g1 = d.c + d.w / 2;
  addRect(h, 0, -HW - T, HD - T, g0, HD + T, undefined, true); addRect(h, 0, g1, HD - T, HW + T, HD + T, undefined, true); addRect(h, 0, g0, HD - T, g1, HD + T, FD, true);
  addRect(h, 0, -HW - T, -HD - T, HW + T, -HD + T, undefined, true); addRect(h, 0, -HW - T, -HD, -HW + T, HD, undefined, true); addRect(h, 0, HW - T, -HD, HW + T, HD, undefined, true);
  f.furn.forEach(([u, v, r]) => addRect(h, 0, u - r * .7, v - r * .7, u + r * .7, v + r * .7));
  (f.rects || []).forEach(e => addRect(h, 0, ...e));
  // cama
  const { ox, oz } = f.bed, bf = at((ox + .8) * K, oz * K), ba = at(ox * K, (oz + 1.1) * K);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, .7, 2.0), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(ox, .8, oz); hit.rotation.y = Math.PI / 2; hit.userData.dyn = 1; S.add(hit);
  addBed({ x: bf[0], z: bf[1], y: .8 * K + .18, ry: th + Math.PI / 2, ax: ba[0], az: ba[1], hit });
  refreshProps();
  const pts = { bed: { x: bf[0], z: bf[1], y: .8 * K + .18, ry: th + Math.PI / 2, ax: ba[0], az: ba[1] }, ay: 0, door: [d.c * K, (HD + .4) * K], talkAt: at(f.talk[0] * K, f.talk[1] * K), doorId: k.doorId };
  return { g: root, th, at, pts, front: at(f.home[0] * K, f.home[1] * K) };
}
