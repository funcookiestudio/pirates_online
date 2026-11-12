/* Padaria da Dona Broa: reboco pêssego, venezianas oliva, telhado de telhas de barro, forno de tijolos que sai pela empena (boca por dentro, cúpula por fora),
   toldo recortado sobre a janela-balcão, placa de pretzel; por dentro: balcão com pães, mesa de sova, prateleiras, sacos de farinha, forno aceso, cama e lampiões. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const BAKERY_SC = HOUSE_K;

export function buildBakeryHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  return buildBakeryAt(x, z, th);
}

export function buildBakeryAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 13, HW: 4, HD: 3, H: 3, RISE: 2.1, PL: 0xe6c8a2, SH: 0x6a7a3a, doorId: 'bakery-front' });
  const { B, C, Sp, S, front, wB, wL, wR } = k;
  const HW = 4, HD = 3, H = 3, BR = 0xa8482c;

  // ── estrutura ──
  k.xr(true);
  k.wall('x', HD, -HW, HW, [{ c: -2.3, w: 1.1, y0: 0, y1: 2.2 }, { c: 1.7, w: 2.0, y0: .95, y1: 2.1 }], front);
  k.door(-2.3, 1.1, 2.2, front, 'bakery-front'); k.win('x', HD, 1.7, 2.0, .95, 2.1, front);
  k.wall('x', -HD, -HW, HW, [{ c: -1.0, w: 1.2, y0: 1, y1: 2.1 }], wB); k.win('x', -HD, -1.0, 1.2, 1, 2.1, wB);
  k.wall('z', -HW, -HD, HD, [{ c: .8, w: 1.2, y0: 1, y1: 2.1 }], wL); k.win('z', -HW, .8, 1.2, 1, 2.1, wL);
  k.wall('z', HW, -HD, HD, [], wR);
  k.gable([0xb4573a, 0xc2643f, 0xa44a30, 0xbb5a38, 0xcc7048]);
  k.xr(false);
  B(1.9, .2, .9, -2.3, .12, HD + .55, STONE); B(1.4, .12, .5, -2.3, .06, HD + 1.2, STONE2);

  // ── toldo recortado (festão) sobre a janela-balcão e escoras ──
  for (let i = 0; i < 8; i++) { const c = i % 2 ? 0xf0e6cc : 0xb8402a, m = B(.5, .06, 1.2, .0 + i * .5 - 0.05, 2.62, HD + .65, c); m.rotation.x = .38; B(.5, .06, .16, i * .5 - .05, 2.36, HD + 1.2, c).rotation.x = 0; }
  for (const px of [-.25, 3.45]) B(.08, 1.25, .08, px, 1.7, HD + 1.2, TM);
  // balcão externo sob a janela: tampo de tábua, cesto de pães, bandeja de roscas
  B(2.4, .08, .5, 1.7, .95, HD + .4, WOOD); for (const s of [-1, 1]) B(.08, .9, .4, 1.7 + s * 1.1, .5, HD + .38, WOOD2);
  { const c = C(.3, .24, .22, 10, 1.1, 1.08, HD + .4, 0xb89a5a); for (let i = 0; i < 5; i++) Sp(.1, 1.6, .8, .8, 1.0 + (i % 3) * .16, 1.22 + (i >> 2) * .08, HD + .4 + ((i * 7) % 3 - 1) * .06, 0xc8903a).rotation.y = i; }
  { C(.3, .3, .03, 12, 2.1, 1.0, HD + .4, 0xcfc8b0); for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.07, .03, 5, 8), k.M(0xc8903a)); t.rotation.x = Math.PI / 2; t.position.set(1.95 + (i % 3) * .15, 1.05, HD + .33 + (i >> 2) * .15 + .0); S.add(t); } }

  // ── placa de pretzel num braço de ferro, ao lado da porta ──
  {
    B(.1, .1, 1.0, -3.55, 2.62, HD + .5, IRON);
    B(.04, .3, .04, -3.55, 2.4, HD + .9, 0x999999);
    const g = new THREE.Group(); g.position.set(-3.55, 2.0, HD + .9); g.rotation.y = Math.PI / 2; S.add(g);
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(.22, .06, 6, 16), k.M(0xc8903a)); t1.scale.set(1.3, 1, 1); t1.position.set(-.2, .1, 0); g.add(t1);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(.22, .06, 6, 16), k.M(0xc8903a)); t2.scale.set(1.3, 1, 1); t2.position.set(.2, .1, 0); g.add(t2);
    B(.45, .1, .1, 0, -.05, 0, 0xc8903a, g).rotation.z = .5; B(.45, .1, .1, 0, -.05, 0, 0xc8903a, g).rotation.z = -.5;
    for (let i = 0; i < 6; i++) B(.03, .03, .13, -.35 + i * .14, .3 + ((i % 2) * -.05), 0, 0xf5ecd0, g);   // sal grosso
  }

  // ── forno de tijolos: cúpula pela empena direita, chaminé e lenha ──
  {
    const ox = HW + 1.15, oz = -1.2;
    B(2.5, .5, 2.5, ox, .25, oz, STONE2);    // base
    B(2.3, .7, 2.3, ox, .85, oz, 0x8a3a24);
    for (let y = .6; y < 1.2; y += .22) B(2.34, .035, 2.34, ox, y, oz, 0x6a3220);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), k.M(BR)); dome.scale.set(1, .9, 1); dome.position.set(ox, 1.2, oz); dome.castShadow = true; S.add(dome);
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 * Math.cos(i * .28 + .1), .025, 4, 24), k.M(0x6a3220)); r.rotation.x = Math.PI / 2; r.position.set(ox, 1.2 + 1.1 * .9 * Math.sin(i * .28 + .1), oz); S.add(r); }   // fiadas
    B(.7, 3.0, .7, ox + .3, 2.5, oz - .5, 0x8a3a24); B(.9, .12, .9, ox + .3, 4.05, oz - .5, STONE); B(.5, .3, .5, ox + .3, 4.25, oz - .5, 0x5a2a1c);   // chaminé
    // pilha de lenha ao lado da base (em frente ao forno, voltada para a frente da casa)
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) { const l = C(.12, .12, .9, 8, ox + 1.5 - 1.0 * 0 + 0, .15 + r * .22, 1.2 + i * .26 + r * .13 + oz + 1.0, 0x8a6238); l.rotation.z = Math.PI / 2; l.position.x = ox - .2; }
  }

  // ── adereços da frente: sacos de farinha, barril de água, vaso de flores e banco ──
  k.sack(-3.5, HD + .8, 0xefe8d8, .3); k.sack(-3.0, HD + 1.1, 0xefe8d8, -.4); k.sack(-3.35, HD + .95, 0xefe8d8, .6, .45, .9);
  k.barrel(3.4, HD + 1.5, 0, 0x7a5a34);
  B(1.1, .1, .4, .8, .5, HD + 2.3, WOOD); B(.08, .5, .35, .35, .25, HD + 2.3, WOOD2); B(.08, .5, .35, 1.25, .25, HD + 2.3, WOOD2);   // banco
  B(.9, .22, .3, -.9, .95, HD + .35, WOOD2); for (let i = 0; i < 4; i++) Sp(.13, 1, 1, 1, -1.25 + i * .24, 1.18, HD + .35, [0xe8c040, 0xd05060, 0xe8e0d0, 0xe0a030][i]);

  // ── interior ──
  // piso: tapete de retalhos diante do balcão
  B(2.4, .02, 1.6, -1.2, .13, .8, 0x7a4a2a); B(2.1, .025, 1.3, -1.2, .135, .8, 0xb58a58);
  // balcão de loja (em L junto da janela): corpo, tampo, balança, caixa-registradora e pães
  B(3.0, 1.0, .7, 1.9, .55, 1.5, WOOD2); B(3.2, .1, .9, 1.9, 1.08, 1.5, WOOD); B(3.0, .06, .1, 1.9, .6, 1.88, TM);
  B(.7, 1.0, 1.6, 3.5, .55, .5, WOOD2); B(.9, .1, 1.8, 3.5, 1.08, .5, WOOD);
  for (let i = 0; i < 6; i++) { const m = Sp(.12, 1.8, .8, .8, 1.0 + i * .28, 1.2, 1.5, 0xc8903a); m.rotation.y = (i % 2) * .4; }   // pães
  { const b = B(.7, .45, .5, 3.5, 1.38, .9, 0xe8d8b0); B(.4, .02, .3, 3.5, 1.62, .9, 0xb8a888); }   // cesta/estante de pão
  { const g = new THREE.Group(); g.position.set(2.7, 1.13, 1.5); S.add(g); B(.1, .05, .3, 0, 0, 0, IRON, g); B(.04, .45, .04, 0, .22, 0, IRON, g); B(.6, .03, .04, 0, .45, 0, IRON, g); for (const x of [-.28, .28]) { B(.01, .18, .01, x, .35, 0, 0x999999, g); C(.11, .08, .03, 8, x, .24, 0, 0xb08a30, g); } }
  B(.4, .3, .3, .4, 1.28, 1.5, 0x4a3018); B(.32, .06, .22, .4, 1.46, 1.5, IRON);   // caixa de dinheiro
  // mesa de sova: bancada pesada, massa, rolo, tigela e farinha
  {
    const top = k.table(-1.3, -.6, 2.2, 1.0, 0xc8b088, .95);
    B(2.0, .02, .8, -1.3, top, -.6, 0xf4efe4);
    Sp(.3, 1.3, .55, 1, -1.8, top + .1, -.6, 0xe8d8b0); Sp(.22, 1, .5, 1, -1.0, top + .07, -.45, 0xe8d8b0);
    C(.04, .04, .6, 8, -1.3, top + .04, -.9, 0x9a7a4a).rotation.z = Math.PI / 2;
    C(.22, .15, .16, 10, -.6, top + .08, -.7, 0xa0623a); Sp(.18, 1, .4, 1, -.6, top + .14, -.7, 0xf4efe4);
    k.stool(-2.2, .15);
  }
  // forno de tijolos: boca com arco, brasa e pá de madeira encostada
  {
    const fx = HW - 1.0;
    B(1.0, 1.6, 2.2, HW - .5, .8, -1.2, BR); B(1.12, .12, 2.34, HW - .5, 1.62, -1.2, STONE); B(.9, .9, 1.9, HW - .5, 2.1, -1.2, 0x8a3a24);   // corpo e coifa
    B(.96, .55, 1.5, HW - .5, 2.85, -1.2, 0x6a3220);   // coifa estreitando
    for (let y = .3; y < 1.6; y += .26) B(1.04, .035, 2.24, HW - .5, y, -1.2, 0x6a3220);
    B(.14, .6, 1.0, fx - .02, .8, -1.2, 0x1a1210); B(.14, .22, 1.2, fx - .02, 1.2, -1.2, BR);   // boca e verga
    B(.1, .32, .75, fx - .02, .6, -1.2, 0xff7a20, S, 0xff5a10); B(.08, .18, .5, fx - .04, .72, -1.2, 0xffc040, S, 0xffa020);   // brasas e chama
    B(.12, .12, .5, fx - .06, .48, -1.2, 0x5a3a1a);
    // pá de forno e atiçador encostados na parede ao lado
    const peel = B(.04, 2.2, .05, fx - .2, 1.2, .0, 0x9a7a4a); peel.rotation.z = -.05; B(.04, .4, .4, fx - .2, .25, .0, 0xb89a62);
    B(.04, 1.8, .04, fx - .15, 1.0, .3, 0x4a4a52);
    // lenha empilhada ao lado do forno
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) { const l = C(.1, .1, .7, 8, HW - .6, .12 + r * .2, .95 + i * .22 + r * .1, 0x8a6238); l.rotation.z = Math.PI / 2; }
  }
  // sacos de farinha no canto de trás à esquerda e prateleira-armário de pães
  k.sack(-3.5, -2.4, 0xefe8d8); k.sack(-2.9, -2.45, 0xefe8d8, .4); k.sack(-3.3, -2.4, 0xefe8d8, .2, .55, .9); k.sack(-2.5, -2.3, 0xe0d8c0, .8);
  k.shelf(.2, 1.5, -2.8, 2.6); k.shelf(.2, 2.15, -2.8, 2.6);
  for (let i = 0; i < 5; i++) { Sp(.13, 1.7, .8, .9, -.8 + i * .5, 1.63, -2.8, 0xc8903a); Sp(.12, 1.6, .8, .8, -.7 + i * .5, 2.28, -2.8, 0xd8a050).rotation.y = (i % 2) * .6; }
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.1, .035, 5, 10), k.M(0xc8903a)); t.rotation.x = Math.PI / 2; t.position.set(1.4 + i * .4, 1.55, -2.8); S.add(t); }
  // cama (cabeceira na parede esquerda), baú e pãozinho pendurado
  k.bed(-2.75, -1.2, 0xb8803a, 0xe0d6b8);
  B(.9, .5, .6, -1.0, .3, -2.35, 0x6a4a28); B(.92, .08, .62, -1.0, .56, -2.35, IRON);
  // baguetes e ervas penduradas nas vigas, peneiras na parede
  for (let i = 0; i < 6; i++) { B(.01, .4, .01, .8 + i * .25, 2.7, 1.0, 0x999999); const b = B(.1, .08, .55, .8 + i * .25, 2.35, 1.0, 0xc8903a); b.rotation.y = ((i * 37) % 7 - 3) * .03; }
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.25 + i * .02, .025, 5, 14), k.M(0x9a7a4a)); t.rotation.y = Math.PI / 2; t.position.set(-HW + .15, 1.9 - (i % 2) * .5, 1.7 + i * .35 - .5); S.add(t); }
  k.barrel(-3.5, 1.9);
  k.lamp(-1.3, 1.2); k.lamp(1.6, -.2);

  return finishHouse(k, {
    furn: [[1.0, 1.5, .55], [1.9, 1.5, .55], [2.7, 1.5, .55], [3.5, .6, .6], [3.5, -.2, .5], [-1.3, -.6, 1.0], [-3.5, -2.4, .5], [-2.7, -2.4, .5], [-2.75 - .5, -1.2, .55], [-2.75 + .5, -1.2, .55], [-1.0, -2.35, .5], [-3.5, 1.9, .5], [HW - .6, -1.2, 1.2]],
    rects: [[.4, 1.15, 3.4, 1.85], [3.15, -.35, 3.85, 1.35], [-3.8, -1.75, -1.7, -.65], [HW - 1.2, -2.35, HW, -.05]],
    bed: { ox: -2.75, oz: -1.2 }, door: { c: -2.3, w: 1.1, h: 2.2 }, home: [2.1, .8], talk: [.6, .9],
  });
}
