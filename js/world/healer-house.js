/* Casa da Curandeira (Irmã Camomila): reboco verde-sálvia, venezianas cor de vinho, telhado musgoso, alpendre de tábuas, canteiros de ervas, colmeias de palha,
   placa com cruz verde; por dentro: armário de gavetinhas de boticário, prateleiras de frascos, mesa de pilão e balança, alambique, caldeirão na lareira, maca, cama e ervas secando. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const HEALER_SC = HOUSE_K;

export function buildHealerHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  return buildHealerAt(x, z, th);
}

export function buildHealerAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 14, HW: 4, HD: 3, H: 3, RISE: 2.2, PL: 0xb4c09c, SH: 0x6a2a4a, doorId: 'healer-front' });
  const { B, C, Sp, S, front, wB, wL, wR } = k;
  const HW = 4, HD = 3, H = 3;
  const GRN = 0x3f7a3a;

  // ── estrutura ──
  k.xr(true);
  k.wall('x', HD, -HW, HW, [{ c: -2.4, w: 1.1, y0: 0, y1: 2.2 }, { c: 1.6, w: 1.3, y0: 1, y1: 2.1 }], front);
  k.door(-2.4, 1.1, 2.2, front, 'healer-front'); k.win('x', HD, 1.6, 1.3, 1, 2.1, front);
  k.wall('x', -HD, -HW, HW, [{ c: 3.0, w: 1.0, y0: 1, y1: 2.1 }], wB); k.win('x', -HD, 3.0, 1.0, 1, 2.1, wB);
  k.wall('z', -HW, -HD, HD, [{ c: .8, w: 1.2, y0: 1, y1: 2.1 }], wL); k.win('z', -HW, .8, 1.2, 1, 2.1, wL);
  k.wall('z', HW, -HD, HD, [], wR);
  k.gable([0x5a6e4a, 0x667a52, 0x4e6240, 0x728458, 0x60744a]);
  k.xr(false);
  B(1.9, .2, .9, -2.4, .12, HD + .55, STONE); B(1.4, .12, .5, -2.4, .06, HD + 1.2, STONE2);

  // ── alpendre de tábuas sobre a porta: dois postes, viga e águas inclinadas ──
  for (const px of [-3.45, -1.35]) { B(.14, 2.6, .14, px, 1.3, HD + 1.5, TM); B(.3, .1, .3, px, .05, HD + 1.5, STONE2); }
  B(2.4, .14, .16, -2.4, 2.62, HD + 1.5, TM); B(2.4, .14, .16, -2.4, 2.65, HD + .25, TM);
  for (let i = 0; i < 6; i++) { const m = B(.42, .05, 1.6, -3.5 + i * .42 + .21, 2.84, HD + .87, i % 2 ? 0x5a6e4a : 0x667a52); m.rotation.x = .14; }
  { const g = new THREE.Group(); g.position.set(-2.4, 2.68, HD + 1.5); S.add(g); }
  for (const s of [-1, 1]) B(.07, .5, .07, -2.4 + s * 1.0, 2.35, HD + .9, TM).rotation.z = 0;   // escoras
  B(2.4, .06, .06, -2.4, 2.32, HD + .87, TM);
  // feixes de ervas secando sob o alpendre
  for (let i = 0; i < 6; i++) { const px = -3.2 + i * .35; B(.01, .3, .01, px, 2.5, HD + 1.2, 0x999999); const c = [0x6a8a3a, 0x8a9a4a, 0x7a5a8a, 0x5a7a3a, 0xa0a050, 0x6a8a3a][i]; C(.01, .1, .35, 6, px, 2.18, HD + 1.2, c); }

  // ── placa: cruz verde sobre tábua branca, braço de ferro ──
  B(.1, .1, .9, 3.55, 2.62, HD + .45, IRON); B(.04, .3, .04, 3.55, 2.4, HD + .85, 0x999999);
  { const g = new THREE.Group(); g.position.set(3.55, 2.0, HD + .85); g.rotation.y = Math.PI / 2; S.add(g); B(.7, .7, .06, 0, 0, 0, 0xe8e4d4, g); B(.45, .14, .08, 0, 0, 0, GRN, g); B(.14, .45, .08, 0, 0, 0, GRN, g); B(.76, .76, .03, 0, 0, -.03, TM, g); }

  // ── chaminé de pedra na empena direita (lareira do caldeirão) ──
  { const cx = HW + .75; B(1.1, H + 2.2 + .7, 1.3, cx, (H + 2.2 + .7) / 2, -1.5, 0x8a8478); for (let y = .5; y < H + 2.8; y += .5) B(1.14, .05, 1.34, cx, y, -1.5, 0x5e5c56); B(1.4, .14, 1.6, cx, H + 2.95, -1.5, STONE); B(.6, .3, .8, cx, H + 3.15, -1.5, STONE2); B(1.5, .5, 1.4, cx, .25, -1.5, STONE2); }

  // ── canteiros de ervas na frente: molduras de tábua, terra e plantas ──
  const bed = (cx, cz, w, d) => {
    B(w, .32, d, cx, .16, cz, WOOD2); B(w - .16, .06, d - .16, cx, .33, cz, 0x4a3420);
    const n = Math.round(w / .4);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const px = cx - w / 2 + .25 + i * (w - .5) / (n - 1), pz = cz + (j ? .15 : -.15), t = (i + j) % 4;
      if (t === 0) { Sp(.17, 1, .9, 1, px, .5, pz, 0x4f8a3a); Sp(.1, 1, .8, 1, px + .06, .58, pz, 0x6aa04a); }
      else if (t === 1) { C(.012, .02, .32, 5, px, .5, pz, 0x6a8a3a); Sp(.06, 1, 1.8, 1, px, .72, pz, 0x7a5aa8); }
      else if (t === 2) { C(.012, .02, .3, 5, px, .5, pz, 0x4f8a3a); Sp(.08, 1, .5, 1, px, .67, pz, 0xe8d060); }
      else { for (let m = 0; m < 3; m++) C(.012, .012, .3, 5, px + (m - 1) * .05, .5, pz, 0x5a9a3a).rotation.z = (m - 1) * .3; Sp(.07, 1, 1, 1, px, .68, pz, 0xf4f0e0); }
    }
  };
  bed(1.6, HD + 1.0, 2.2, .7); bed(3.1, HD + 2.5, 1.9, .7); bed(-1.4, HD + 2.6, 2.0, .7);
  // barril d'água da chuva com tampa e concha, junto ao canto
  k.barrel(3.7, HD + .4, 0, 0x6a5a3a); C(.4, .4, .04, 12, 3.7, 1.17, HD + .4, 0x3a8ac8); B(.04, .5, .04, 3.35, 1.3, HD + .4, WOOD2).rotation.z = .5;
  // colmeias de palha sobre um suporte, na lateral esquerda
  { B(1.4, .08, .7, -HW - 1.3, .62, -1.0, WOOD); for (const s of [-1, 1]) for (const t of [-1, 1]) B(.08, .6, .08, -HW - 1.3 + s * .6, .3, -1.0 + t * .28, WOOD2);
    for (const dx of [-.4, .4]) { const sk = new THREE.Mesh(new THREE.SphereGeometry(.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), k.M(0xd8b860)); sk.scale.set(1, 1.1, 1); sk.position.set(-HW - 1.3 + dx, .66, -1.0); sk.castShadow = true; S.add(sk);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.3 - i * .06, .012, 4, 14), k.M(0xa8883a)); r.rotation.x = Math.PI / 2; r.position.set(-HW - 1.3 + dx, .8 + i * .1, -1.0); S.add(r); }
      B(.1, .06, .02, -HW - 1.3 + dx, .7, -.65, 0x1a1210); } }
  // varal de ervas na lateral esquerda: dois postes e corda com maços
  for (const t of [-1, 1]) B(.08, 1.7, .08, -HW - .9, .85, 1.5 + t * 1.2, WOOD2); B(.05, .05, 2.5, -HW - .9, 1.65, 1.5, 0x9a8a6a);
  for (let i = 0; i < 6; i++) C(.015, .09, .4, 6, -HW - .9, 1.4, .5 + i * .4, [0x6a8a3a, 0x8a9a4a, 0x7a5a8a][i % 3]);

  // ── interior ──
  // tapete redondo e piso de tábuas
  { const r = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20).rotateX(-Math.PI / 2), k.M(0x6a3a4a)); r.position.set(-.5, .14, .4); S.add(r); const r2 = new THREE.Mesh(new THREE.CircleGeometry(.85, 20).rotateX(-Math.PI / 2), k.M(0x8a5a62)); r2.position.set(-.5, .145, .4); S.add(r2); }
  // armário de boticário na parede de trás: corpo, gavetas com puxadores e etiquetas, cornija e frascos em cima
  {
    B(4.6, 2.3, .5, -.2, 1.3, -HD + .5, 0x6a4a2a); B(4.8, .12, .7, -.2, 2.5, -HD + .55, 0x4a3320);
    for (let c = 0; c < 8; c++) for (let r = 0; r < 4; r++) {
      const px = -2.2 + c * .58, py = .5 + r * .5, col = (c + r) % 2 ? 0x8a6238 : 0x7a5530;
      B(.52, .44, .04, px, py, -HD + .78, col); B(.07, .07, .05, px, py + .02, -HD + .82, 0xb08a30); B(.24, .09, .01, px, py + .15, -HD + .8, 0xe6dcb4);
    }
    for (let i = 0; i < 6; i++) { C(.1, .12, .34, 8, -2.0 + i * .8, 2.76, -HD + .55, [0x2f6a3a, 0x6a2a2a, 0x3a4a7a, 0x8a6a2a, 0x2f6a3a, 0x6a2a2a][i]); C(.04, .05, .1, 6, -2.0 + i * .8, 3.0, -HD + .55, 0x5a3a1a); }
  }
  // prateleira de frascos na parede esquerda sobre a cama
  B(.3, .06, 1.6, -HW + .3, 1.9, -1.4, WOOD2); for (const dz of [-.65, .65]) B(.22, .22, .05, -HW + .3, 1.77, -1.4 + dz, TM);
  for (let i = 0; i < 4; i++) C(.08, .09, .26, 8, -HW + .3, 2.06, -2.0 + i * .4, [0x2f6a3a, 0x8a3a6a, 0x3a4a7a, 0xb08a30][i]);
  // mesa de preparo no centro: pilão, balança, ervas, frascos
  {
    const top = k.table(-.5, .2, 2.4, 1.0, 0xa88a58, .9);
    { const m = C(.2, .13, .2, 12, -1.3, top + .1, .1, 0x8a8a90); C(.04, .04, .4, 8, -1.2, top + .3, .1, 0xd8d0b0).rotation.z = .5; }   // pilão
    { const g = new THREE.Group(); g.position.set(-.2, top, .1); S.add(g); B(.1, .04, .3, 0, 0, 0, IRON, g); B(.04, .5, .04, 0, .25, 0, IRON, g); B(.7, .03, .04, 0, .5, 0, IRON, g); for (const x of [-.33, .33]) { B(.01, .22, .01, x, .4, 0, 0x999999, g); C(.12, .08, .03, 8, x, .28, 0, 0xb08a30, g); } }
    for (let i = 0; i < 4; i++) { const m = C(.012, .012, .35, 5, .4 + i * .05, top + .02, .3 - i * .06, [0x5a9a3a, 0x7a5aa8, 0x9aaa4a, 0x5a9a3a][i]); m.rotation.z = Math.PI / 2; m.rotation.y = i * .3; }
    C(.07, .08, .22, 8, .7, top + .13, -.15, 0x8a3a6a); C(.07, .08, .22, 8, .9, top + .13, -.2, 0x3a8a6a); C(.1, .1, .08, 8, .2, top + .06, .45, 0xb89a62);
    B(.35, .05, .25, -1.5, top + .01, .5, 0xe6dcb4); k.candle(.0, top, -.3);
    k.stool(-1.0, 1.2); k.stool(.3, 1.2);
  }
  // alambique numa bancada à direita (frente): caldeira, cano e frasco coletor
  {
    const bx = 2.9, bz = .9; k.table(bx, bz, 1.4, .8, WOOD2, .85);
    const bo = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 9), k.M(0xb87a3a)); bo.position.set(bx - .4, .85 + .3, bz); S.add(bo);
    C(.1, .2, .26, 10, bx - .4, 1.4, bz, 0xb87a3a); const pipe = C(.03, .03, .8, 6, bx + .0, 1.55, bz, 0xb87a3a); pipe.rotation.z = Math.PI / 2 + .3;
    C(.1, .13, .26, 10, bx + .45, 1.0, bz + .1, 0x8ac0a0); C(.05, .05, .1, 6, bx + .45, 1.16, bz + .1, 0x5a3a1a);
    B(.35, .1, .35, bx - .4, .9, bz, IRON);
  }
  // lareira com caldeirão borbulhando (brilho verde) e lenha
  {
    B(1.0, .2, 1.9, HW - .7, .2, -1.5, STONE2);
    B(.9, 1.7, .22, HW - .3, 1.05, -2.35, 0x8a8478); B(.9, 1.7, .22, HW - .3, 1.05, -.65, 0x8a8478); B(.9, .3, 1.8, HW - .3, 2.0, -1.5, 0x8a8478); B(.9, .1, 1.9, HW - .25, 2.2, -1.5, STONE);
    B(.2, 1.8, 1.6, HW - .1, 1.0, -1.5, 0x2a2a2e);
    for (let i = 0; i < 3; i++) C(.08, .08, 1.0, 6, HW - .6, .3, -2.0 + i * .5, 0x5a3a1a).rotation.z = Math.PI / 2;
    B(.4, .3, .5, HW - .55, .45, -1.5, 0xff7a20, S, 0xff5a10); B(.25, .25, .3, HW - .55, .68, -1.5, 0xffc040, S, 0xffa020);
    B(.04, .7, .04, HW - .45, 1.55, -1.5, IRON); C(.3, .26, .32, 12, HW - .45, 1.05, -1.5, 0x2a2a30); B(.54, .03, .54, HW - .45, 1.22, -1.5, IRON);
    const br = new THREE.Mesh(new THREE.CircleGeometry(.27, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x60e070 })); br.position.set(HW - .45, 1.2, -1.5); S.add(br);
    for (let i = 0; i < 3; i++) Sp(.05, 1, 1, 1, HW - .55 + i * .08, 1.3 + i * .08, -1.55 + i * .06, 0x60e070);
    C(.07, .07, .22, 8, HW - .3, 2.36, -2.1, 0xa0623a); C(.06, .06, .2, 8, HW - .3, 2.34, -1.5, 0x8a3a6a); C(.06, .06, .26, 8, HW - .3, 2.38, -.9, 0x2f6a3a);
  }
  // cama da curandeira, no canto esquerdo de trás; baú e cesta de ervas
  k.bed(-2.75, -2.1, 0x4a7a4a, 0xd8d0b0); B(.9, .5, .6, -1.0, .3, -2.35, 0x4a3a28); B(.92, .08, .62, -1.0, .56, -2.35, IRON);
  // maca para pacientes junto à parede direita: estrado, colchão, lençol dobrado e banco
  {
    const mx = HW - 1.15, mz = 1.15;
    for (const s of [-1, 1]) for (const t of [-1, 1]) B(.1, .55, .1, mx + t * .45, .3, mz + s * .9, TM);
    B(1.0, .1, 2.0, mx, .6, mz, WOOD2); B(.95, .16, 1.9, mx, .72, mz, 0xe8e0c8); B(.9, .05, .9, mx, .82, mz + .4, 0xd8d0b0); B(.5, .12, .4, mx, .85, mz - .75, 0xf0ead8);
    B(.8, .02, 1.0, mx, .8, mz - .1, 0x6a8a5a);   // manta
  }
  // vigas: feixes de ervas, redomas e a cesta pendurada
  for (let i = 0; i < 9; i++) { const px = -1.5 + (i % 5) * .6 + (i > 4 ? .3 : 0), pz = -.4 + (i > 4 ? -.8 : .5); B(.01, .35, .01, px, 2.7, pz, 0x999999); C(.02, .12, .4, 6, px, 2.35, pz, [0x6a8a3a, 0x8a9a4a, 0x7a5a8a, 0xa0a050, 0x5a7a3a][i % 5]); }
  { const cb = C(.3, .22, .22, 10, 1.4, 2.35, -.3, 0xb89a5a); B(.01, .4, .01, 1.4, 2.7, -.3, 0x999999); for (let i = 0; i < 4; i++) Sp(.1, 1, .8, 1, 1.3 + (i % 2) * .15, 2.5, -.3 + (i >> 1) * .1, 0x6aa04a); }
  // cadeira de leitura e estante com livro aberto
  { B(.5, .08, .5, -3.0, .55, 1.9, WOOD2); B(.5, .6, .08, -3.0, .85, 2.1, WOOD2); for (const a of [-1, 1]) for (const b of [-1, 1]) B(.06, .5, .06, -3.0 + a * .2, .27, 1.9 + b * .2, WOOD2); }
  { B(.7, .05, .5, -3.3, 1.05, 1.4, WOOD); B(.06, 1.0, .06, -3.3, .5, 1.4, WOOD2); B(.4, .02, .3, -3.3, 1.1, 1.4, 0xeadfb8); B(.02, .06, .3, -3.3, 1.12, 1.4, 0x4a2a1a); }
  k.lamp(-1.5, 1.2); k.lamp(2.1, -.8);

  return finishHouse(k, {
    furn: [[-.5, .2, 1.0], [-1.0, 1.2, .3], [.3, 1.2, .3], [2.9, .9, .6], [-1.0, -2.35, .5], [-2.75 - .5, -2.1, .55], [-2.75 + .5, -2.1, .55], [HW - 1.15, 1.15, .7], [HW - 1.15, 1.75, .6], [HW - .6, -1.5, 1.0], [-3.0, 1.9, .35], [-3.3, 1.4, .4], [-2, -2.55, .5], [0, -2.55, .5], [1.5, -2.55, .5]],
    rects: [[-2.5, -3.0, 2.2, -2.0], [-3.8, -2.7, -1.7, -1.5], [HW - 1.7, .15, HW - .55, 2.15], [HW - 1.2, -2.4, HW, -.6]],
    bed: { ox: -2.75, oz: -2.1 }, door: { c: -2.4, w: 1.1, h: 2.2 }, home: [.6, 1.5], talk: [-.5, 1.6],
  });
}
