/* Chalé Alpino de Hilda Pinheira (A-frame): telhado de duas águas que desce quase até o chão, empenas de tábuas com grande janela triangular, deck coberto na frente,
   cano de fogão; por dentro: sala aberta sob o pé-direito alto, mezanino de dormir com escada, fogão a lenha, cozinha, sofá, mesa redonda e lampiões. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const AFRAME_SC = HOUSE_K;

export function buildAFrameHouse(x, z, a) {
  return buildAFrameAt(x, z, Math.atan2(-Math.cos(a), -Math.sin(a)));
}

export function buildAFrameAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 11, HW: 3.5, HD: 4, H: 3, RISE: 4.2, PL: 0xc8ad82, SH: 0x2f4a2a, doorId: 'aframe-front' });
  const { B, C, Sp, W, S, tr, front, wB, wL, wR, roof, M } = k;
  const HW = 3.5, HD = 4, KH = 1.1, RISE = 4.2, T = .3, RY = KH + RISE, GL = 0xbfe0f0 | 11;

  // ── paredes baixas (joelho) dos lados, com tábuas verticais ──
  k.xr(true);
  for (const [f, g] of [[-HW, wL], [HW, wR]]) {
    W('z', f, 0, KH / 2, 2 * HD, KH, T, 0xc8ad82, g);
    for (let u = -HD + .3; u < HD; u += .45) W('z', f + Math.sign(f) * .16, u, KH / 2, .05, KH, .03, 0x8a6a44, g);
    W('z', f, 0, KH - .04, 2 * HD + .3, .1, T + .12, TM, g); W('z', f, 0, .08, 2 * HD + .3, .16, T + .1, STONE, g);
    for (const u of [-HD, HD]) W('z', f, u, KH / 2, .22, KH, T + .1, TM, g);
  }
  // ── empenas: pentágono (base, joelho, cumeeira) com furos para a porta e para a janela triangular ──
  const gable = (zf, g, door, win) => {
    const sh = new THREE.Shape(); sh.moveTo(-HW, 0); sh.lineTo(HW, 0); sh.lineTo(HW, KH); sh.lineTo(0, RY); sh.lineTo(-HW, KH); sh.lineTo(-HW, 0);
    if (door) { const h = new THREE.Path(); h.moveTo(-.62, 0); h.lineTo(-.62, 2.3); h.lineTo(.62, 2.3); h.lineTo(.62, 0); h.lineTo(-.62, 0); sh.holes.push(h); }
    const tri = win;   // [[x,y]*3]
    const hp = new THREE.Path(); hp.moveTo(...tri[0]); hp.lineTo(...tri[2]); hp.lineTo(...tri[1]); hp.lineTo(...tri[0]); sh.holes.push(hp);   // sentido oposto ao externo
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), M(0xc8ad82)); m.position.set(0, 0, zf - T / 2); m.castShadow = m.receiveShadow = true; g.add(m);
    // tábuas verticais em relevo (sem cruzar os furos) e friso de madeira nas águas
    for (let u = -HW + .35; u < HW - .1; u += .42) {
      const top = Math.min(KH + RISE * (1 - Math.abs(u) / HW) - .12, RY);
      let y0 = .12, y1 = top; if (door && Math.abs(u) < .85) y0 = 2.55; const inWin = Math.abs(u) < (tri[1][0] + .15); if (inWin) { y0 = Math.max(y0, tri[0][1] - .1); y1 = Math.min(y1, tri[0][1] - .12); if (y1 - y0 < .05) continue; }
      B(.05, y1 - y0, .04, u, (y0 + y1) / 2, zf + Math.sign(zf) * (T / 2 + .01), 0x8a6a44, g);
    }
    for (const s of [-1, 1]) { const dx = HW, dy = RISE, len = Math.hypot(dx, dy), b = B(len, .16, T + .14, s * HW / 2, KH + RISE / 2, zf, TM, g); b.rotation.z = -s * Math.atan2(dy, dx); }   // beirais inclinados
    // moldura e vidro da janela triangular
    const edge = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), b = B(len + .08, .09, T + .08, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, zf, TM, g); b.rotation.z = Math.atan2(dy, dx); };
    edge(tri[0], tri[1]); edge(tri[0], tri[2]); edge(tri[1], tri[2]);
    const gs = new THREE.Shape(); gs.moveTo(...tri[0]); gs.lineTo(...tri[1]); gs.lineTo(...tri[2]); gs.lineTo(...tri[0]);
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gs), new THREE.MeshLambertMaterial({ color: GL, transparent: true, opacity: .4, side: THREE.DoubleSide })); gm.position.set(0, 0, zf + .01); g.add(gm);
    const my = (tri[0][1] + tri[2][1]) / 2; B(.07, tri[2][1] - tri[0][1], .08, 0, my, zf, TM, g);
    for (const yy of [tri[0][1] + (tri[2][1] - tri[0][1]) * .38, tri[0][1] + (tri[2][1] - tri[0][1]) * .7]) { const hw = (tri[1][0]) * (1 - (yy - tri[0][1]) / (tri[2][1] - tri[0][1])); B(hw * 2, .06, .08, 0, yy, zf, TM, g); }
  };
  gable(HD, front, true, [[-1.6, 2.8], [1.6, 2.8], [0, 4.75]]);
  gable(-HD, wB, false, [[-1.0, 2.7], [1.0, 2.7], [0, 4.2]]);
  k.door(0, 1.1, 2.2, front, 'aframe-front');
  // ── telhado: duas águas até o joelho, com fileiras de tábuas; avança 2 m sobre o deck da frente ──
  {
    const run = HW + .45, A = Math.atan2(RISE, run), L = Math.hypot(run, RISE), z0 = -HD - .45, z1 = HD + 2.3, len = z1 - z0, cz = (z0 + z1) / 2;
    const cols = [0x4a5a3a, 0x55663f, 0x3f4e30, 0x5f7046, 0x4c5c3c], nz = Math.round(len / .9), tw = len / nz, nl = Math.round(L / .5), l = L / nl;
    for (const s of [1, -1]) {
      const g = new THREE.Group(); g.position.set(0, RY, 0); g.rotation.z = -s * A; roof.add(g);
      B(L, .14, len, s * L / 2, -.14, cz, 0x3a281a, g);
      for (let i = 0; i < nl; i++) for (let j = 0; j < nz; j++) B(l * 1.3, .09, tw * 1.03, s * (i + .5) * l, .02 * ((i + j) % 2), z0 + (j + .5) * tw, cols[(i * 3 + j * 2) % cols.length], g);
      for (let i = 0; i <= 5; i++) B(.15, .15, len, s * (i * L / 5), -.26, cz, TM, g);   // vigas sob as telhas
      // claraboias: dois vidros sobre a água
      for (const zz of [-1.6, 1.4]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(1.0, .05, 1.1), new THREE.MeshLambertMaterial({ color: GL, transparent: true, opacity: .45 })); sk.position.set(s * L * .42, .1, zz); g.add(sk); }
    }
    B(.24, .26, len, 0, RY + .12, cz, 0x2e2118, roof);   // cumeeira
    // cano do fogão atravessando a água direita
    C(.12, .12, 6.4, 10, 1.6, 3.1, -1.1, 0x2a2a30); C(.18, .12, .22, 10, 1.6, 6.3, -1.1, 0x2a2a30); B(.5, .05, .5, 1.6, 6.45, -1.1, 0x2a2a30);
  }
  k.xr(false);
  // pés e fundação de pedra
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.8, .5, .8, sx * (HW + .05), .2, sz * (HD - .1), STONE2);

  // ── deck de tábuas na frente, coberto pelo telhado ──
  {
    const dz = HD + 1.25;
    B(2 * HW + 1.2, .16, 2.5, 0, .34, dz, 0x8a6a40); for (let i = 0; i < 8; i++) B(.04, .01, 2.5, -HW - .1 + i * 1.0, .43, dz, 0x4a3018);
    for (const px of [-3.9, 0, 3.9]) B(.2, .3, .2, px, .15, HD + 2.4, STONE2);
    for (const px of [-2.4, 2.4]) { B(.2, 2.85, .2, px, 1.75, HD + 2.1, 0x5a3a1e); B(.3, .1, .3, px, .38, HD + 2.1, STONE2); }
    B(5.2, .2, .22, 0, 2.86, HD + 2.1, 0x4a3018, roof);
    for (let i = 0; i < 3; i++) B(1.8, .15, .5, 0, .26 - i * .1, HD + 2.8 + i * .45, 0x7a5a34);   // degraus
    for (const [x0, x1] of [[-3.9, -1], [1, 3.9]]) { const L = x1 - x0, cx = (x0 + x1) / 2; B(L, .09, .09, cx, 1.35, HD + 2.4, 0x5a3a1e); B(L, .07, .07, cx, 1.0, HD + 2.4, 0x5a3a1e); for (let px = x0 + .15; px < x1; px += .5) B(.07, .9, .07, px, .85, HD + 2.4, 0x5a3a1e); }
    // cadeiras Adirondack, mesinha, lenha e lampiões
    for (const sx of [-1.6, 1.6]) { const g = new THREE.Group(); g.position.set(sx, .42, HD + 1.1); g.rotation.y = sx * .08; S.add(g); B(.7, .08, .7, 0, .35, 0, 0xc8a064, g); B(.7, .9, .07, 0, .75, -.32, 0xc8a064, g).rotation.x = -.25; for (const q of [-1, 1]) B(.08, .6, .7, q * .34, .3, 0, 0xb08850, g); }
    B(.55, .05, .55, 0, .85 + .0, HD + 1.2, 0x7a5a34).visible = true; C(.05, .05, .4, 6, 0, .62, HD + 1.2, 0x5a3a1e);
    C(.07, .06, .12, 8, 0, .93, HD + 1.2, 0xb8b0a0);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) { const l = C(.12, .12, 1.1, 8, 3.1 - 0, .5 + .16 + r * .22, HD + .35 + i * .26 + r * .13, 0x8a6238); l.rotation.z = Math.PI / 2; }
    for (const x of [-1.5, 1.5]) { B(.01, .4, .01, x, 2.7, HD + 2.1, 0x999999); B(.12, .16, .12, x, 2.45, HD + 2.1, 0xffd891, S, 0xffb040); B(.18, .04, .18, x, 2.57, HD + 2.1, IRON); }
    // esquis cruzados e raquetes de neve na parede do deck
    for (const s of [-1, 1]) { const sk = B(.1, 2.2, .05, 2.5 + s * .1, 1.6, HD + .1, s > 0 ? 0xc84a2a : 0x2a5a8a); sk.rotation.z = s * .12; }
    { const t = new THREE.Mesh(new THREE.TorusGeometry(.3, .035, 5, 14), M(0x6a4a28)); t.scale.set(.7, 1.3, 1); t.position.set(-2.6, 1.4, HD + .12); S.add(t); for (let i = 0; i < 4; i++) B(.5, .015, .015, -2.6, 1.15 + i * .12, HD + .12, 0xb89a62); }
  }
  // ── interior ──
  // tapete redondo de pelos e piso de tábuas largas
  { const r = new THREE.Mesh(new THREE.CircleGeometry(1.5, 22).rotateX(-Math.PI / 2), M(0x8a3a3a)); r.position.set(-.3, .14, 1.0); S.add(r); const r2 = new THREE.Mesh(new THREE.CircleGeometry(1.1, 22).rotateX(-Math.PI / 2), M(0xc8b090)); r2.position.set(-.3, .145, 1.0); S.add(r2); }
  // mezanino de dormir sobre a metade de trás: assoalho, vigas, guarda-corpo, colchão e escada
  {
    const ly = 2.4, lz0 = -HD + .15, lz1 = -.9;
    B(3.2, .2, lz1 - lz0, 0, ly, (lz0 + lz1) / 2, WOOD2); for (let i = 0; i < 7; i++) B(.04, .01, lz1 - lz0, -1.4 + i * .47, ly + .11, (lz0 + lz1) / 2, 0x4a3018);
    for (const sx of [-1.5, 1.5]) B(.18, ly, .18, sx, ly / 2, lz1, 0x5a3a1e);
    B(3.2, .2, .22, 0, ly - .15, lz1, 0x5a3a1e);
    B(3.2, .08, .08, 0, ly + 1.0, lz1, 0x5a3a1e); B(3.2, .06, .06, 0, ly + .55, lz1, 0x5a3a1e); for (let px = -1.5; px <= 1.51; px += .5) B(.06, 1.0, .06, px, ly + .5, lz1, 0x5a3a1e);
    B(2.2, .22, 1.7, -.2, ly + .22, -2.9, 0xd6c394); B(2.0, .12, 1.4, -.2, ly + .4, -2.8, 0x2f6a5a); B(.7, .14, .5, -.9, ly + .46, -3.4, 0xf0ead8); B(.9, .1, .5, .8, ly + .42, -3.3, 0xb8803a);
    // escada de mão à direita da cozinha: duas hastes e degraus
    for (const sx of [1.3, 1.9]) { const h = B(.07, 3.0, .07, sx, 1.35, lz1 + .05, 0x7a5a34); h.rotation.x = -.15; }
    for (let i = 0; i < 7; i++) B(.6, .05, .06, 1.6, .3 + i * .38, lz1 + .12 - i * .045, 0x7a5a34);
  }
  // cozinha embaixo do mezanino, na parede de trás: balcão, armários, pia com balde, prateleiras e panelas
  {
    B(3.0, 1.0, .6, -.3, .55, -HD + .5, WOOD2); B(3.2, .08, .7, -.3, 1.08, -HD + .5, 0xc8b088); for (let i = 0; i < 4; i++) { B(.7, .8, .04, -1.5 + i * .75, .55, -HD + .81, i % 2 ? 0x8a6238 : 0x7a5530); B(.06, .06, .05, -1.5 + i * .75, .65, -HD + .84, 0xb08a30); }
    C(.25, .2, .12, 12, .7, 1.14, -HD + .5, 0x8a8a90); B(.04, .3, .04, .7, 1.3, -HD + .4, 0x8a8a90).rotation.x = .3;
    k.shelf(-.8, 1.7, -HD + .3, 2.2, .3); for (let i = 0; i < 5; i++) C(.08, .09, .22 + (i % 2) * .08, 8, -1.7 + i * .45, 1.84, -HD + .3, [0xa0623a, 0x8a5030, 0xc9b48a, 0x6a4a2a, 0x7a8a4a][i]);
    for (let i = 0; i < 3; i++) { B(.01, .3, .01, -1.2 + i * .7, 2.2, -HD + .5, 0x999999); C(.14, .12, .1, 10, -1.2 + i * .7, 2.0, -HD + .5, 0x4a4a52); }
  }
  // fogão a lenha de ferro com o cano para o telhado, lenha ao lado e poltrona
  {
    B(.9, .8, .8, 1.6, .45, -1.1, 0x2a2a30); B(.95, .08, .85, 1.6, .88, -1.1, IRON); B(.4, .35, .04, 1.6, .55, -.68, 0xff7a20, S, 0xff5a10); B(.46, .46, .02, 1.6, .55, -.69, 0x3a3a40);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.07, .12, .07, 1.6 + sx * .38, .05, -1.1 + sz * .32, IRON);
    B(.06, .9, .06, 1.6, 1.4, -1.1, 0x2a2a30).visible = true;
    C(.18, .15, .2, 10, 1.4, 1.0, -1.1, 0x4a4a52); B(1.0, .02, 1.0, 1.6, .14, -.8, 0x5a5a62);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const l = C(.1, .1, .7, 8, 2.65, .15 + r * .2, -.6 + i * .22 + r * .11, 0x8a6238); l.rotation.z = Math.PI / 2; }
  }
  // sofá de tábuas com almofadas diante da parede esquerda, mesa redonda e dois bancos
  {
    B(1.9, .35, .8, -2.45, .35, 1.6, 0x7a5a34).rotation.y = Math.PI / 2; B(.2, .7, 1.9, -3.2, .75, 1.6, 0x7a5a34); B(.6, .2, 1.8, -2.75, .6, 1.6, 0x8a2a2a); B(.4, .35, .4, -2.8, .85, 2.2, 0x3a6a8a).rotation.y = .4; B(.4, .35, .4, -2.8, .85, 1.0, 0xd8b068).rotation.y = -.3;
    const g = new THREE.Group(); g.position.set(-.4, 0, 1.4); S.add(g); C(.65, .65, .08, 18, 0, .8, 0, 0x8a6238, g); C(.09, .09, .76, 8, 0, .4, 0, 0x6a4a28, g); C(.3, .3, .06, 10, 0, .06, 0, 0x6a4a28, g);
    C(.08, .07, .12, 8, -.2, .9, .1, 0xb8b0a0, g); B(.4, .03, .3, .2, .85, -.1, 0xeadfb8, g); k.candle(.05, .84, .25);
    for (const a of [.6, 2.7, 4.8]) { const sx = Math.cos(a) * .95, sz = Math.sin(a) * .95; C(.24, .2, .06, 10, -.4 + sx, .5, 1.4 + sz, 0x8a6238); C(.05, .05, .46, 6, -.4 + sx, .25, 1.4 + sz, 0x6a4a28); }
  }
  // cama do morador sob a lateral baixa (cabeceira na parede), baú e violão encostado
  k.bed(-2.35, -2.9, 0x2f6a5a, 0xd0c8a8); B(.9, .5, .6, -.1, .3, -2.1, 0x4a3a28); B(.92, .08, .62, -.1, .56, -2.1, IRON);
  { const g = new THREE.Group(); g.position.set(3.0, 0, 1.5); g.rotation.z = -.1; S.add(g); const b = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), M(0xc88a3a)); b.scale.set(1, 1.1, .4); b.position.set(0, .45, 0); g.add(b); B(.06, .9, .04, 0, 1.1, 0, 0x4a3018, g); C(.07, .07, .08, 10, 0, .5, .08, 0x1a1210, g).rotation.x = Math.PI / 2; }
  // lampiões pendurados da cumeeira, ervas penduradas, mapa da trilha
  for (const [lx, lz] of [[0, 2.6], [-.4, 1.2]]) { B(.01, 2.0, .01, lx, 4.1, lz, 0x999999); B(.14, .18, .14, lx, 3.05, lz, 0xffd891, S, 0xffb040); B(.2, .05, .2, lx, 3.2, lz, IRON); }
  for (let i = 0; i < 5; i++) { B(.01, .4, .01, 1.5 + i * .25, 2.2, -.1, 0x999999); C(.01, .1, .4, 6, 1.5 + i * .25, 1.85, -.1, [0x6a8a3a, 0x8a9a4a, 0x7a5a8a][i % 3]); }

  return finishHouse(k, {
    furn: [[-.4, 1.4, .8], [-2.45, 1.6, .6], [-2.45, 2.2, .4], [1.6, -1.1, .65], [2.65, -.4, .5], [-.3, -HD + .5, .8], [-2.35, -2.9, .6], [-1.5, -2.9, .5], [-.1, -2.1, .5], [3.0, 1.5, .3]],
    rects: [[-.9, -3.55, 1.2, -2.8], [-3.35, -3.75, -1.35, -2.1], [1.5, -.95, 2.05, -.75]],
    bed: { ox: -2.35, oz: -2.9 }, door: { c: 0, w: 1.1, h: 2.2 }, home: [.6, .4], talk: [.8, 1.7],
  });
}
