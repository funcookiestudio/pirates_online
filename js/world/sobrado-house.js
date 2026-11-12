/* Sobrado do Capitão (Dona Ruth): dois andares de enxaimel com sacada de madeira sobre a porta, telhado alto, chaminé de pedra;
   por dentro (térreo): lareira, mesa, cama, estante e escada de madeira. O andar de cima é visto por fora (sacada, janelas) e por dentro pelo corte da parede,
   mas é fechado (a escada leva a um alçapão trancado): só o térreo é andável, para não arriscar o jogador a ficar preso em dois pisos. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const SOBRADO_SC = HOUSE_K;

export function buildSobradoHouse(x, z, a) {
  return buildSobradoAt(x, z, Math.atan2(-Math.cos(a), -Math.sin(a)));
}

export function buildSobradoAt(x, z, th) {
  const HW = 4, HD = 3, G = 3, U = 2.8, TOP = G + U;
  const k = startHouse(x, z, th, { id: 4, HW, HD, H: TOP, RISE: 2.5, PL: 0xe6c9a0, SH: 0x2d5a6a, doorId: 'sobrado-front' });
  const { B, C, S, front, wB, wL, wR, roof } = k;

  // ── estrutura: térreo (0–3) e andar de cima (3–5,8), o de cima com vigas visíveis ──
  k.xr(true);
  k.wall('x', HD, -HW, HW, [{ c: 1.6, w: 1.1, y0: 0, y1: 2.2 }, { c: -1.8, w: 1.4, y0: 1.0, y1: 2.2 }], front, 0, G);
  k.wall('x', HD, -HW, HW, [{ c: -2.7, w: 1.1, y0: 3.7, y1: 5.0 }, { c: .3, w: 1.2, y0: 3.15, y1: 5.1 }, { c: 2.8, w: 1.1, y0: 3.7, y1: 5.0 }], front, G, U);
  k.wall('x', -HD, -HW, HW, [{ c: 1.4, w: 1.3, y0: 1.0, y1: 2.2 }], wB, 0, G);
  k.wall('x', -HD, -HW, HW, [{ c: -1.5, w: 1.1, y0: 3.7, y1: 5.0 }, { c: 1.4, w: 1.1, y0: 3.7, y1: 5.0 }], wB, G, U);
  k.wall('z', -HW, -HD, HD, [], wL, 0, G);
  k.wall('z', -HW, -HD, HD, [{ c: 0, w: 1.2, y0: 3.7, y1: 5.0 }], wL, G, U);
  k.wall('z', HW, -HD, HD, [], wR, 0, G);
  k.wall('z', HW, -HD, HD, [{ c: 1.8, w: 1.1, y0: 3.7, y1: 5.0 }], wR, G, U);
  k.win('x', HD, -1.8, 1.4, 1.0, 2.2, front);
  k.win('x', HD, -2.7, 1.1, 3.7, 5.0, front); k.win('x', HD, 2.8, 1.1, 3.7, 5.0, front);
  k.win('x', HD, .3, 1.2, 3.15, 5.1, front, false);
  k.win('x', -HD, 1.4, 1.3, 1.0, 2.2, wB); k.win('x', -HD, -1.5, 1.1, 3.7, 5.0, wB); k.win('x', -HD, 1.4, 1.1, 3.7, 5.0, wB);
  k.win('z', -HW, 0, 1.2, 3.7, 5.0, wL); k.win('z', HW, 1.8, 1.1, 3.7, 5.0, wR);
  k.door(1.6, 1.1, 2.2, front, 'sobrado-front');
  k.gable([0x8a3a2a, 0x7a3024, 0x9a4630, 0x6e2c20, 0x84382a]);
  k.xr(false);

  // laje entre os andares (some junto com o telhado quando o jogador entra: a câmera enxerga o térreo)
  B(2 * HW - .1, .22, 2 * HD - .1, 0, G + .02, 0, 0x6a4a2c, roof);
  for (let i = 0; i < 6; i++) B(.2, .24, 2 * HD - .1, -HW + 1 + i * 1.4, G - .1, 0, TM, roof);
  // cinta de viga que separa os andares, por fora
  B(2 * HW + .5, .22, .22, 0, G, HD + .02, TM, front); B(2 * HW + .5, .22, .22, 0, G, -HD - .02, TM, wB);
  B(.22, .22, 2 * HD + .3, -HW - .02, G, 0, TM, wL); B(.22, .22, 2 * HD + .3, HW + .02, G, 0, TM, wR);
  // pés de pedra nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.8, .5, .8, sx * (HW + .05), .2, sz * (HD + .05), STONE2);

  // ── sacada de madeira sobre a porta: piso, guarda-corpo, 2 postes e mãos-francesas ──
  const BZ = HD + 1.5;
  B(2 * HW - 1.4, .14, 1.6, 0, G + .05, HD + .8, WOOD);
  for (let i = 0; i < 7; i++) B(.04, .02, 1.6, -3.0 + i * 1.0, G + .13, HD + .8, WOOD2);
  for (const sx of [-1, 1]) {
    B(.2, G, .2, sx * 3.1, G / 2, BZ - .05, WOOD2);
    const br = B(.1, .1, 1.0, sx * 3.1, G - .4, BZ - .45, WOOD2); br.rotation.x = .8;
    for (const zz of [0, 1]) B(.07, .9, .07, sx * 3.1, G + .6, BZ - zz * 1.5 + .02, TM);
  }
  B(6.4, .08, .08, 0, G + 1.0, BZ, TM); B(6.2, .05, .06, 0, G + .55, BZ, WOOD2);
  for (let i = 0; i <= 12; i++) B(.05, .8, .05, -3.1 + i * .517, G + .55, BZ, TM);
  for (const sx of [-1, 1]) { B(.08, .08, 1.5, sx * 3.1, G + 1.0, HD + .8, TM); B(.06, .05, 1.5, sx * 3.1, G + .55, HD + .8, WOOD2); }
  B(.5, .38, .35, -2.2, G + .3, HD + .8, 0x8a5a3a); B(.46, .12, .32, -2.2, G + .56, HD + .8, 0x4a8a3a);   // vaso de flor
  k.barrel(2.3, HD + .8, G);
  k.lamp(1.4, HD + .5, G - .5);

  // ── chaminé de pedra na empena direita, até acima da cumeeira ──
  const CH = 9.4;
  B(1.5, CH, 1.6, HW + .75, CH / 2 - .1, -.5, STONE); B(1.7, .22, 1.8, HW + .75, CH - .05, -.5, STONE2); B(1.0, .45, 1.0, HW + .75, CH + .25, -.5, STONE2);
  for (let y = .4; y < CH; y += .6) B(1.54, .04, 1.64, HW + .75, y, -.5, 0x55524a);
  C(.16, .16, .5, 8, HW + .75, CH + .7, -.5, IRON);

  // ── térreo: lareira, mesa, cama, estante, escada ──
  B(.8, 2.6, 2.4, HW - .45, 1.3, -.5, STONE); B(1.0, .2, 2.7, HW - .45, 2.65, -.5, STONE2); B(.1, 1.0, 1.1, HW - .9, .75, -.5, 0x1a1410);
  B(.06, .35, .6, HW - .93, .4, -.5, 0xffc041, S, 0xff8a20); for (const dz of [-.4, .4]) B(.3, .12, .12, HW - 1.0, .2, -.5 + dz, 0x4a3a2a);
  B(.5, .08, 1.4, HW - 1.25, .14, -.5, STONE2); B(.12, .12, 1.0, HW - 1.0, 1.95, -.5, TM);
  for (const [dz, c] of [[-.6, 0xc9a85a], [-.1, 0x8a8a90], [.5, 0xa05a30]]) B(.1, .22, .12, HW - 1.0, 2.8 - 0, -.5 + dz, c);
  B(.45, .55, .45, HW - 1.3, .35, 1.2, 0x7a5230); B(.45, .55, .45, HW - 1.3, .35, 1.8, 0x6a4626);   // lenha
  const tb = k.table(.2, .5, 1.9, 1.05, WOOD); k.stool(-.9, 1.1); k.stool(1.2, 1.1); k.stool(.2, -.4); k.candle(.2, tb, .5);
  B(.28, .06, .2, -.3, tb, .7, 0xe8e0c8); B(.2, .14, .2, .7, tb + .05, .4, 0x8a8a90);
  k.bed(-2.75, -2.1, 0x2d5a6a, 0xdcc9a0);
  B(1.4, .5, .6, -3.1, .3, -.2 - 0, 0x5a3e24); B(1.5, .06, .7, -3.1, .58, -.2, WOOD);
  k.shelf(1.2, 1.65, -HD + .2, 1.7); k.shelf(1.2, 2.1, -HD + .2, 1.7);
  for (const [px, y, c] of [[.6, 1.65, 0xc9a85a], [.95, 1.65, 0x8a3a2a], [1.35, 1.65, 0x4a7a4a], [1.7, 1.65, 0xd6c394], [.7, 2.1, 0x8a8a90], [1.5, 2.1, 0xa05a30]]) B(.22, .3, .22, px, y + .18, -HD + .2, c);
  k.barrel(3.1, -2.4); k.barrel(3.1 - .8, -2.5); k.sack(2.2, -2.5); k.crate(-.8, .12 + .25, -2.5, .6);
  B(1.6, .02, 1.3, .2, .125, .5, 0x2d5a6a); B(1.4, .021, 1.1, .2, .126, .5, 0xd6c394);   // tapete
  k.lamp(.2, .4, 2.5); k.lamp(-2.7, -1.2, 2.5);
  // escada de madeira na parede esquerda, até o alçapão trancado (decorativa: bloqueada por baixo)
  for (let i = 0; i < 10; i++) B(.95, .3 * (i + 1), .3, -HW + .55, .12 + .15 * (i + 1), 2.4 - .3 * i, i % 2 ? WOOD : WOOD2);
  B(.08, 1.1, 3.2, -HW + 1.1, 1.9, .9, TM).rotation.x = -.84;
  B(1.1, .08, 1.2, -HW + .6, G + .04, -.9 - .35, 0x3a2a1a, roof);   // alçapão
  // ── andar de cima (visto pelo corte): cama de casal, guarda-roupa, mesa junto à janela, baú, tapete ──
  const Y = G + .12;
  B(2.1, .35, 1.7, -2.4, Y + .2, -1.9, WOOD2, roof); B(2.0, .2, 1.6, -2.4, Y + .45, -1.9, 0xdcc9a0, roof); B(1.5, .1, 1.62, -2.0, Y + .58, -1.9, 0x2d5a6a, roof); B(.45, .12, 1.2, -3.1, Y + .65, -1.9, 0xf0ead8, roof);
  B(.1, 1.2, 1.8, -3.5, Y + .7, -1.9, WOOD2, roof);
  B(1.3, 2.1, .6, 3.0, Y + 1.05, -2.5, WOOD2, roof); for (const a of [-.3, .3]) B(.55, 1.8, .04, 3.0 + a, Y + 1.05, -2.2, WOOD, roof);
  B(1.5, .08, .8, -.2, Y + .8, 2.0, WOOD, roof); for (const a of [-1, 1]) B(.08, .8, .08, -.2 + a * .6, Y + .4, 2.0, WOOD2, roof);
  B(.28, .05, .2, -.4, Y + .86, 2.0, 0xe8e0c8, roof); k.stool(.8, 1.5); B(.5, .05, .5, .8, Y + .5, 1.5, WOOD, roof);
  B(.9, .5, .55, 2.2, Y + .25, 1.0, 0x6a4a2c, roof); B(.92, .08, .57, 2.2, Y + .52, 1.0, IRON, roof);
  B(2.0, .02, 1.5, .5, Y + .01, -.4, 0x8a2a2a, roof); B(1.8, .021, 1.3, .5, Y + .02, -.4, 0xd6c394, roof);
  k.lamp(0, 0, G + 2.3);

  return finishHouse(k, {
    furn: [[-.9, 1.1, .35], [1.2, 1.1, .35], [.2, .5, .75], [.2, -.4, .3], [-2.75, -2.1, .8], [-1.9, -2.1, .55], [-3.2, -.2, .6], [3.1, -2.4, .4], [2.3, -2.4, .4], [2.2, -2.5, .35], [-3.5, 2.0, .5], [-3.5, 1.0, .5], [-3.5, 0, .5], [HW - 1.0, -.5, 1.2], [-3.1, HD + 1.5, .2], [3.1, HD + 1.5, .2]],
    rects: [[-3.95, -.6, -2.95, 2.55]],
    bed: { ox: -2.75, oz: -2.1 }, door: { c: 1.6, w: 1.1, h: 2.2 }, home: [1.6, 1.0], talk: [.9, 1.5],
    reg: { Hf: 3.0 * HOUSE_K },
  });
}
