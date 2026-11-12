/* Carpintaria do Mestre Pinho: reboco cor de madeira, venezianas escuras, telhado de tábuas, oficina aberta (galpão com bancada e serra grande) na lateral esquerda,
   esqueleto de um barco sobre calços na direita, pedra de afiar, lenha e tábuas; por dentro: bancada com torno, torno mecânico de pedal, painel de ferramentas,
   cavaletes com tábua, fogão de ferro, maquete de navio, cama, lampiões e cavacos pelo chão. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const CARPENTER_SC = HOUSE_K;

export function buildCarpenterHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  return buildCarpenterAt(x, z, th);
}

export function buildCarpenterAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 15, HW: 4, HD: 3, H: 3, RISE: 2.2, PL: 0xb89268, SH: 0x3a3a3a, doorId: 'carpenter-front' });
  const { B, C, Sp, S, front, wB, wL, wR } = k;
  const HW = 4, HD = 3, H = 3, PINE = 0xc8a064, PINE2 = 0xb08850;

  // ── estrutura ──
  k.xr(true);
  k.wall('x', HD, -HW, HW, [{ c: -2.2, w: 1.1, y0: 0, y1: 2.2 }, { c: 1.9, w: 1.5, y0: 1, y1: 2.1 }], front);
  k.door(-2.2, 1.1, 2.2, front, 'carpenter-front'); k.win('x', HD, 1.9, 1.5, 1, 2.1, front);
  k.wall('x', -HD, -HW, HW, [{ c: -.2, w: 1.2, y0: 1, y1: 2.1 }], wB); k.win('x', -HD, -.2, 1.2, 1, 2.1, wB);
  k.wall('z', -HW, -HD, HD, [{ c: .6, w: 1.2, y0: 1, y1: 2.1 }], wL); k.win('z', -HW, .6, 1.2, 1, 2.1, wL);
  k.wall('z', HW, -HD, HD, [], wR);
  k.gable([0x6a4a2a, 0x7a5634, 0x5a3e22, 0x86603a, 0x70502e]);
  k.xr(false);
  B(1.9, .2, .9, -2.2, .12, HD + .55, STONE); B(1.4, .12, .5, -2.2, .06, HD + 1.2, STONE2);

  // ── chaminé do fogão (empena direita, junto à frente) ──
  { const cx = HW + .6; B(.9, H + 2.2 + .6, 1.0, cx, (H + 2.2 + .6) / 2, 1.5, 0x8a8478); for (let y = .5; y < H + 2.7; y += .5) B(.94, .05, 1.04, cx, y, 1.5, 0x5e5c56); B(1.2, .14, 1.3, cx, H + 2.85, 1.5, STONE); B(.5, .3, .6, cx, H + 3.05, 1.5, STONE2); B(1.3, .5, 1.2, cx, .25, 1.5, STONE2); }

  // ── oficina aberta na lateral esquerda: galpão de uma água sobre postes, apoiado na parede ──
  {
    const x0 = -HW - 3.3, zA = -2.9, zB = 2.4;   // da parede (x=-HW-.15) até x0; ao longo de z
    for (const zz of [zA, 0, zB]) { B(.16, 2.5, .16, x0, 1.25, zz, TM); B(.3, .1, .3, x0, .05, zz, STONE2); }
    B(.16, .16, zB - zA + .3, x0, 2.5, (zA + zB) / 2, TM); B(.14, .14, zB - zA + .3, -HW - .2, 2.62, (zA + zB) / 2, TM);
    const wdt = x0 + HW + .2, run = Math.hypot(3.3 + .2, .12);
    for (let i = 0; i < 12; i++) { const zz = zA - .1 + i * (zB - zA + .4) / 12 + .22; const b = B(3.7, .06, (zB - zA + .4) / 12 - .01, (x0 - HW - .15) / 2 - .1, 2.56, zz, i % 2 ? 0x6a4a2a : 0x7a5634); b.rotation.z = -.04; }   // águas de tábuas
    B(3.4, .08, zB - zA + .2, (x0 - HW) / 2 - .1, .13, (zA + zB) / 2, 0x6a5a40);   // piso de tábuas do galpão
    for (let i = 0; i < 6; i++) B(3.4, .02, .45, (x0 - HW) / 2 - .1, .18, zA + .3 + i * .9, i % 2 ? 0x7a6244 : 0x866c4a);
    // bancada de trabalho junto à parede com torno de bancada, tábua, plaina e serrote
    B(2.0, .12, .9, -HW - 1.2, .98, -.4, PINE); for (const s of [-1, 1]) for (const t of [-1, 1]) B(.12, .98, .12, -HW - 1.2 + s * .85, .5, -.4 + t * .35, WOOD2);
    B(1.8, .06, .8, -HW - 1.2, .45, -.4, WOOD2);
    B(.15, .3, .18, -HW - 1.9, 1.2, -.75, IRON); B(.08, .5, .08, -HW - 1.9, 1.15, -.88, 0x5a3a1a); B(.35, .08, .2, -HW - 1.9, 1.28, -.75, IRON);   // torno de bancada
    B(1.0, .05, .26, -HW - 1.0, 1.06, -.4, PINE2); B(.34, .12, .1, -HW - .6, 1.12, -.2, 0x8a5a2a); B(.5, .02, .1, -HW - 1.3, 1.09, -.1, 0xb8b8c0);
    // serra de dois cabos pendurada na parede, martelo, machado e esquadro
    { const g = new THREE.Group(); g.position.set(-HW - .02, 1.9, 1.3); S.add(g); B(.02, .16, 1.4, 0, 0, 0, 0xb8b8c0, g); B(.05, .4, .06, 0, .0, -.75, 0x6a4a2a, g); B(.05, .4, .06, 0, 0, .75, 0x6a4a2a, g); for (let i = 0; i < 9; i++) B(.025, .04, .05, 0, -.1, -.6 + i * .15, 0x909098, g); }
    B(.06, .35, .06, -HW - .05, 1.65, 2.0, 0x5a3a1a); B(.06, .08, .22, -HW - .05, 1.85, 2.0, 0x5a5a62);   // martelo
    B(.06, .6, .06, -HW - .05, 1.5, -2.0, 0x5a3a1a); B(.06, .24, .24, -HW - .05, 1.8, -1.9, 0x8a8a92);       // machado
    // pilha de tábuas cruzadas e toras empilhadas no fundo do galpão
    for (let i = 0; i < 6; i++) B(2.2, .09, .35 + (i % 2) * .05, x0 + .9, .22 + i * .12, 1.6 + (i % 2) * .05, i % 2 ? PINE : PINE2).rotation.y = (i % 3 - 1) * .03;
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const l = C(.18, .18, 1.6, 10, x0 + 1.0, .24 + r * .32, -2.0 + i * .38 + r * .19, 0x8a6238); l.rotation.z = Math.PI / 2; const e = C(.16, .16, .02, 10, x0 + 1.81, .24 + r * .32, -2.0 + i * .38 + r * .19, 0xd8b078); e.rotation.z = Math.PI / 2; }
    // cepo de cortar lenha com machadinha
    C(.3, .3, .5, 10, x0 + 1.0, .25, 0.5, 0x8a6238); B(.06, .4, .06, x0 + 1.15, .72, .5, 0x5a3a1a).rotation.z = .8; B(.05, .15, .16, x0 + 1.0, .58, .5, 0x8a8a92);
    // pedra de afiar com manivela e bacia d'água
    { const g = new THREE.Group(); g.position.set(x0 + 1.9, 0, -1.1); S.add(g); for (const s of [-1, 1]) B(.08, .8, .08, s * .22, .4, 0, WOOD2, g); B(.6, .08, .12, 0, .8, 0, WOOD, g); const w = C(.32, .32, .12, 18, 0, .62, 0, 0x9a9a9a, g); w.rotation.x = Math.PI / 2; B(.04, .04, .45, 0, .62, 0, IRON, g).rotation.x = 0; }
  }

  // ── esqueleto de um barco em construção, sobre calços (quintal dos fundos) ──
  {
    const g = new THREE.Group(); g.position.set(0, 0, -HD - 2.9); S.add(g); g.rotation.y = Math.PI / 2;   // casco ao longo de x, no quintal dos fundos
    for (const zz of [-1.6, 0, 1.6]) { B(.7, .3, .3, 0, .15, zz, WOOD2, g); B(.5, .12, .5, 0, .06, zz, STONE2, g); }
    B(.2, .22, 4.6, 0, .55, 0, 0x8a6238, g);   // quilha
    const stem = B(.18, 1.4, .18, 0, 1.2, 2.5, 0x8a6238, g); stem.rotation.x = .5;    // roda de proa
    const post = B(.18, 1.1, .18, 0, 1.05, -2.35, 0x8a6238, g); post.rotation.x = -.3;  // cadaste
    for (let i = -5; i <= 5; i++) {
      const t = i / 5.8, f = Math.sqrt(Math.max(0, 1 - t * t * .85)); if (f < .25) continue;
      const rb = new THREE.Mesh(new THREE.TorusGeometry(1, .05, 5, 16, Math.PI), k.M(0xb08850)); rb.rotation.z = Math.PI; rb.scale.set(.85 * f, .75 * f, 1); rb.position.set(0, 1.35, i * .4); g.add(rb);
    }
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const rl = B(.06, .06, 4.2, s * (.5 + j * .08), .85 + j * .27, 0, 0xc8a064, g); rl.scale.z = 1 - j * .12; }   // tábuas do costado já pregadas
    // prancha de trabalho e andaime
    B(.5, .05, 3.0, 1.3, .8, 0, PINE, g); for (const zz of [-1.2, 1.2]) B(.07, .8, .07, 1.3, .4, zz, WOOD2, g);
    for (let i = 0; i < 4; i++) B(.1, .02, .5, 1.3, .84, -1.0 + i * .7, PINE2, g).visible = true;
  }

  // ── frente: sinal de serra e martelo cruzados, tábuas de apoio, barris e baldes ──
  B(.1, .1, .9, -3.55, 2.62, HD + .45, IRON); B(.04, .3, .04, -3.55, 2.4, HD + .85, 0x999999);
  { const g = new THREE.Group(); g.position.set(-3.55, 2.0, HD + .85); g.rotation.y = Math.PI / 2; S.add(g); B(.9, .7, .06, 0, 0, 0, 0x4a3018, g); const sw = B(.78, .1, .04, 0, 0, .05, 0xb8b8c0, g); sw.rotation.z = .5; for (let i = 0; i < 7; i++) B(.04, .05, .04, -.32 + i * .1, -.06 + 0, .05, 0x909098, g).rotation.z = .5; B(.07, .6, .05, 0, 0, .05, 0x5a3a1a, g).rotation.z = -.55; B(.24, .1, .06, -.17, .15, .05, 0x5a5a62, g).rotation.z = -.55; }
  for (let i = 0; i < 5; i++) B(2.0, .08, .3, 3.0, .12 + i * .1, HD + .5 + (i % 2) * .05, i % 2 ? PINE : PINE2).rotation.y = ((i * 11) % 5 - 2) * .03;   // tábuas encostadas
  for (let i = 0; i < 3; i++) B(.1, 1.7, .08, 2.4 + i * .5, .95, HD + .3, PINE2).rotation.x = -.1;
  k.barrel(3.5, HD + 1.9, 0, 0x6a4a28); { C(.2, .16, .3, 10, 2.8, .15, HD + 1.8, 0x5a4a38); for (let i = 0; i < 5; i++) B(.03, .03, .45, 2.8 + (i - 2) * .04, .5, HD + 1.8, 0xc0c0c8).rotation.x = .1 * i; }
  // lajes dos degraus e vaso de ferramentas encostadas na parede ao lado da porta
  for (let i = 0; i < 4; i++) B(.05, 1.4, .05, -3.7 + i * .1, .75, HD + .2, 0x8a6238).rotation.z = .1 * (i - 1.5);

  // ── interior ──
  // cavacos de madeira espalhados pelo piso
  for (let i = 0; i < 40; i++) { const px = -3 + ((i * 53) % 71) / 71 * 6, pz = -2 + ((i * 37) % 61) / 61 * 4; Sp(.05, 1.4, .3, .8, px, .15, pz, i % 2 ? 0xd8b078 : 0xc8a064).rotation.y = i; }
  // bancada sob a janela da frente: tampo grosso, torno, plaina, tábua em trabalho, caixa de pregos
  {
    const bx = 1.9, bz = 2.25;
    B(2.8, .14, .8, bx, .98, bz, PINE); for (const s of [-1, 1]) { B(.12, .98, .5, bx + s * 1.25, .5, bz, WOOD2); } B(2.4, .08, .5, bx, .4, bz, WOOD2);
    B(.2, .3, .2, bx - 1.2, 1.2, bz + .3, IRON); B(.1, .5, .1, bx - 1.2, 1.25, bz + .45, 0x5a3a1a); B(.4, .08, .2, bx - 1.2, 1.4, bz + .3, IRON);
    B(1.2, .05, .26, bx + .2, 1.08, bz, PINE2); B(.36, .13, .1, bx + .8, 1.15, bz + .15, 0x8a5a2a); B(.1, .1, .1, bx + .8, 1.24, bz + .15, 0x8a5a2a);
    B(.35, .15, .25, bx - .5, 1.13, bz - .1, 0x5a4a38); for (let i = 0; i < 4; i++) B(.02, .02, .12, bx - .5 + (i - 1.5) * .06, 1.23, bz - .1, 0xc0c0c8);
    B(.5, .02, .12, bx + 1.0, 1.06, bz - .15, 0xb8b8c0);
  }
  // cavaletes e tábua comprida sendo serrada no meio da oficina
  for (const dz of [-.6, .6]) { B(.1, .7, .1, -.2, .35, .3 + dz, WOOD2).rotation.z = .3; B(.1, .7, .1, -.2, .35, .3 + dz, WOOD2).rotation.z = -.3; B(1.0, .08, .1, -.2, .72, .3 + dz, WOOD); }
  B(.3, .06, 2.4, -.2, .8, .3, PINE); B(.02, .1, .5, -.2, .86, .6, 0xb8b8c0);
  // painel de ferramentas na parede de trás: tábua de fundo e silhuetas
  {
    B(2.6, 1.3, .06, 1.2, 1.55, -HD + .1, 0x4a3018);
    const tx = (i, h, w, c, dy = 0) => B(w, h, .05, .1 + i * .42, 1.55 + dy, -HD + .16, c);
    tx(0, .9, .05, 0x5a3a1a); tx(0, .12, .3, 0xb8b8c0, .45);   // serrote
    tx(1, .55, .06, 0x5a3a1a, -.05); tx(1, .12, .3, 0x5a5a62, .3);   // martelo
    tx(2, .8, .04, 0xb8b8c0); tx(2, .2, .06, 0x6a4a2a, -.5);   // formão
    B(.4, .4, .05, 1.8 + .0, 1.45, -HD + .16, 0x8a6238); B(.28, .28, .06, 1.8, 1.45, -HD + .17, 0x4a3018);   // esquadro
    tx(4, .7, .05, 0x6a4a2a); tx(4, .14, .12, 0x909098, .38);
    tx(5, .6, .04, 0xb8b8c0, .0);
  }
  // prateleira com maquete de navio e potes de cola/verniz
  k.shelf(-1.9, 1.7, -2.8, 1.8, .4);
  { const g = new THREE.Group(); g.position.set(-1.9, 1.76, -2.8); S.add(g); const h = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), k.M(0x6a4020)); h.scale.set(1.5, 1, .6); g.add(h); C(.012, .012, .5, 5, 0, .25, 0, 0x4a3018, g); B(.3, .28, .02, .0, .28, 0, 0xe8e0d0, g); B(.22, .2, .02, .08, .5, 0, 0xe8e0d0, g); }
  for (let i = 0; i < 3; i++) C(.07, .08, .2, 8, -2.7 + i * .16, 1.83, -2.8, [0x7a4a24, 0x5a3a1a, 0xb08a30][i]);
  // torno mecânico de pedal no canto direito de trás
  {
    const lx = 3.0, lz = -2.2;
    B(1.8, .12, .5, lx, 1.0, lz, 0x5a4a38); for (const s of [-1, 1]) { B(.1, 1.0, .5, lx + s * .8, .5, lz, WOOD2); }
    B(.14, .3, .14, lx - .6, 1.2, lz, IRON); B(.14, .3, .14, lx + .6, 1.2, lz, IRON);   // cabeçotes
    const blk = C(.13, .13, 1.0, 8, lx, 1.2, lz, 0xc8a064); blk.rotation.z = Math.PI / 2;
    const wh = C(.4, .4, .06, 14, lx - .9, .55, lz + .35, 0x4a3320); wh.rotation.x = Math.PI / 2; B(.04, .04, .4, lx - .9, .55, lz + .15, IRON).rotation.x = Math.PI / 2;
    B(.8, .05, .22, lx + .2, .18, lz + .35, WOOD).rotation.z = -.06;   // pedal
  }
  // rack de tábuas na parede direita (da frente) e fogão de ferro ao lado
  for (let i = 0; i < 6; i++) B(.45, .08, 2.4, HW - .5, .3 + i * .22, .5, i % 2 ? PINE : PINE2).rotation.y = Math.PI / 2 * 0 + ((i * 7) % 3 - 1) * .02;
  for (const t of [-.7, 1.7]) { B(.1, 1.7, .1, HW - .3, .9, t + .5, WOOD2); }
  { const sx = HW - .8, sz = -1.3; B(.8, .8, .8, sx, .45, sz, 0x2a2a30); B(.82, .06, .82, sx, .88, sz, IRON); B(.5, .35, .04, sx - .42, .5, sz, 0xff7a20, S, 0xff5a10); C(.07, .07, 1.9, 8, sx, 1.9, sz, 0x2a2a30); B(.05, .5, .05, sx - .4, .85, sz - .3, 0x5a3a1a); const pt = C(.14, .12, .15, 8, sx - .1, .98, sz + .1, 0x4a4a52); }
  // cama no canto esquerdo de trás, baú ao pé
  k.bed(-2.75, -2.1, 0x5a4a30, 0xcfc4a0); B(.9, .5, .6, -1.0, .3, -2.35, 0x4a3a28); B(.92, .08, .62, -1.0, .56, -2.35, IRON);
  // tábuas de reserva sobre as vigas, rolo de corda e lampiões
  for (let i = 0; i < 5; i++) B(.22, .05, 3.2 - (i % 2) * .4, -2.4 + i * .5, 2.6, .2, i % 2 ? PINE : PINE2);
  k.lamp(-1.4, 1.2); k.lamp(2.0, -.9);

  return finishHouse(k, {
    furn: [[1.9, 2.25, .8], [3.0, 2.25, .5], [-.2, .3, .65], [3.0, -2.2, .7], [HW - .8, -1.3, .6], [HW - .5, .5, .5], [HW - .5, 1.3, .5], [-1.0, -2.35, .5], [-2.75 - .5, -2.1, .55], [-2.75 + .5, -2.1, .55], [-1.9, -2.8, .4]],
    rects: [[.5, 1.85, 3.3, 2.65], [2.1, -2.5, 3.9, -1.9], [-.8, -.4, .4, 1.0], [-3.8, -2.7, -1.7, -1.5], [HW - 1.2, -1.75, HW - .4, -.85], [HW - .7, -.7, HW, 1.7]],
    bed: { ox: -2.75, oz: -2.1 }, door: { c: -2.2, w: 1.1, h: 2.2 }, home: [.7, 1.4], talk: [-.2, 1.7],
  });
}
