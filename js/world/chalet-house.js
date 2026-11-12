/* Chalé do Caçador (Rufino Pelego): paredes de toras com pontas cruzadas nos cantos, telhado alto de tábuas, varanda de deck com guarda-corpo e alpendre,
   chaminé de pedra, lenha empilhada, couros no varal; por dentro: lareira de pedra, beliche, mesa com bancos, tapete de urso, troféus de chifres e rack de arcos. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const CHALET_SC = HOUSE_K;

export function buildChaletHouse(x, z, a) {
  return buildChaletAt(x, z, Math.atan2(-Math.cos(a), -Math.sin(a)));
}

export function buildChaletAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 4, HW: 4, HD: 3, H: 3, RISE: 2.8, PL: 0x8a6a44, SH: 0x2f4a2a, doorId: 'chalet-front' });
  const { B, C, Sp, S, front, wB, wL, wR } = k;
  const HW = 4, HD = 3, H = 3, LOG = [0x7a5230, 0x6a4626, 0x84593a, 0x70492a], FUR = 0x6a4a30;

  // ── estrutura: paredes de toras, vãos, telhado ──
  k.xr(true);
  k.logwall('x', HD, -HW, HW, [{ c: -1.8, w: 1.1, y0: 0, y1: 2.2 }, { c: 1.8, w: 1.5, y0: 1.05, y1: 2.15 }], front);
  k.door(-1.8, 1.1, 2.2, front, 'chalet-front'); k.win('x', HD, 1.8, 1.5, 1.05, 2.15, front);
  k.logwall('x', -HD, -HW, HW, [{ c: 1.0, w: 1.2, y0: 1.05, y1: 2.15 }], wB); k.win('x', -HD, 1.0, 1.2, 1.05, 2.15, wB);
  k.logwall('z', -HW, -HD, HD, [{ c: -.3, w: 1.2, y0: 1.05, y1: 2.15 }], wL); k.win('z', -HW, -.3, 1.2, 1.05, 2.15, wL);
  k.logwall('z', HW, -HD, HD, [], wR);
  k.gable([0x5a4630, 0x6a5238, 0x4e3c28, 0x735a3e, 0x62492f]);
  k.xr(false);
  // pés de pedra nos cantos e sob as paredes
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B(.9, .55, .9, sx * (HW + .05), .22, sz * (HD + .05), STONE2); B(1.0, .1, 1.0, sx * (HW + .05), .52, sz * (HD + .05), STONE); }
  // vigas da cumeeira que sobram na empena (pontas redondas de tora)
  for (const sx of [-1, 1]) for (const y of [3.4, 4.2, 5.0]) { const t = C(.1, .1, 1.3, 8, sx * (HW + .45), y, 0, 0x5a3a1e); t.rotation.z = Math.PI / 2; }
  // tábuas verticais na empena (frente e fundos) já vêm do triângulo de reboco; faixa de rodapé de pedra
  // ── chaminé de pedra grossa, na parede direita (fora), com lareira por dentro ──
  {
    const cx = HW + .85, h = H + 2.8 + 1.0;
    B(1.4, h, 1.8, cx, h / 2, -.5, 0x8a8478); for (let y = .45; y < h; y += .45) B(1.44, .06, 1.84, cx, y, -.5, 0x5e5c56);
    for (let y = .3; y < h; y += .9) for (let z = -1.2; z <= .2; z += .7) B(.5, .35, .08, cx + .72, y + ((z * 10) % 2) * .15, z - .5 + .35, 0x9a948a);   // pedras maiores na face
    B(1.9, .5, 2.3, cx, .25, -.5, STONE2); B(1.7, .14, 2.1, cx, h + .07, -.5, STONE); B(.9, .35, 1.1, cx, h + .3, -.5, STONE2);
  }

  // ── varanda de deck com alpendre (frente) ──
  {
    const dz = HD + 1.35;
    B(8.2, .16, 2.6, 0, .34, dz, 0x8a6a40); for (let i = 0; i < 9; i++) B(.04, .01, 2.6, -4 + i * 1.0, .43, dz, 0x4a3018);   // tábuas
    for (const px of [-3.9, -1.3, 1.3, 3.9]) B(.2, .3, .2, px, .15, HD + 2.5, STONE2);   // pés
    // degraus diante da porta (em x=-1.8)
    for (let i = 0; i < 3; i++) B(1.9, .15, .5, -1.8, .26 - i * .1, HD + 2.8 + i * .45, 0x7a5a34);
    // postes do alpendre e viga
    for (const px of [-3.9, 3.9]) { B(.2, 2.75, .2, px, 1.7, HD + 2.5, 0x5a3a1e); B(.3, .1, .3, px, .38, HD + 2.5, STONE2); }
    B(8.4, .22, .24, 0, 3.0, HD + 2.5, 0x4a3018, k.roof);
    for (let i = 0; i < 17; i++) { const m = B(.5, .06, 2.7, -4.1 + i * .51, 3.1, HD + 1.2, i % 2 ? 0x5a4630 : 0x6a5238, k.roof); m.rotation.x = .22; }
    B(8.4, .1, .1, 0, 3.15, HD + .2, 0x4a3018, k.roof);
    // guarda-corpo com vão nos degraus
    for (const [x0, x1] of [[-4, -2.9], [-.7, 4]]) { const L = x1 - x0, cx = (x0 + x1) / 2; B(L, .09, .09, cx, 1.35, HD + 2.55, 0x5a3a1e); B(L, .07, .07, cx, 1.0, HD + 2.55, 0x5a3a1e); for (let px = x0 + .2; px < x1; px += .55) B(.07, .9, .07, px, .85, HD + 2.55, 0x5a3a1e); }
    for (const sx of [-1, 1]) { B(.09, .09, 2.5, sx * 4.0, 1.35, dz, 0x5a3a1e); for (let pz = HD + .3; pz < HD + 2.5; pz += .6) B(.07, .9, .07, sx * 4.0, .85, pz, 0x5a3a1e); }
    // couros pendurados na viga, chifres sobre a porta, lampião e barril de água
    for (const [px, c, w] of [[2.2, 0xa07a50, .5], [2.9, 0x6a4a30, .6], [3.5, 0xb8a888, .45]]) { B(.02, .2, .02, px, 2.85, HD + 2.5, 0x999999); B(w, 1.0, .05, px, 2.2, HD + 2.5, c).rotation.y = (px * 3) % 1 * .3; }
    // chifres de cervo montados sobre a porta (tábua + dois ramos)
    B(.5, .5, .1, -1.8, 2.75, HD + .1, 0x6a4a30); for (const s of [-1, 1]) { const b = C(.03, .05, .7, 5, -1.8 + s * .35, 3.0, HD + .15, 0xd8d0b0); b.rotation.z = s * -.5; for (const t of [.15, .35]) { const p = C(.02, .03, .3, 5, -1.8 + s * (.5 + t * .6), 3.1 + t * .6, HD + .15, 0xd8d0b0); p.rotation.z = s * -.1; } }
    for (const x of [-3.2, 3.2]) { B(.02, .3, .02, x, 2.85, HD + 2.5, 0x999999); B(.12, .16, .12, x, 2.6, HD + 2.5, 0xffd891, S, 0xffb040); B(.18, .04, .18, x, 2.72, HD + 2.5, IRON); }
    k.barrel(3.3, HD + 1.2, .43, 0x6a5a3a);
    // cadeira de balanço de madeira
    { const g = new THREE.Group(); g.position.set(2.2, .43, HD + 1.6); g.rotation.y = -.3; S.add(g); B(.7, .08, .6, 0, .45, 0, 0x7a5a34, g); B(.7, .7, .08, 0, .85, -.28, 0x7a5a34, g).rotation.x = -.12; for (const sx of [-1, 1]) { B(.06, .45, .6, sx * .34, .22, 0, 0x6a4a28, g); const r = new THREE.Mesh(new THREE.TorusGeometry(.5, .03, 4, 12, Math.PI * .5), k.M(0x6a4a28)); r.rotation.set(0, Math.PI / 2, Math.PI * 1.25); r.position.set(sx * .34, .45, 0); g.add(r); } }
  }
  // ── lateral esquerda: pilha de lenha sob o beiral, cepo, machado, pele esticada no bastidor ──
  for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) { const l = C(.13, .13, 1.6, 8, -HW - .95, .18 + r * .22, -2.6 + i * .3 + (r % 2) * .15, i % 2 ? 0x8a6238 : 0x7a5228); l.rotation.z = Math.PI / 2; }
  for (const [ux, uz] of [[-HW - 1.75, -2.75], [-HW - 1.75, .15], [-HW - .15, -2.75], [-HW - .15, .15]]) B(.12, 1.2, .12, ux, .6, uz, WOOD2);
  C(.3, .3, .55, 10, -HW - 1.4, .28, 2.0, 0x8a6238); B(.06, .5, .06, -HW - 1.25, .75, 2.0, 0x5a3a1a).rotation.z = .9; B(.05, .15, .17, -HW - 1.5, .6, 2.0, 0x8a8a92);
  { const g = new THREE.Group(); g.position.set(-HW - 1.5, 0, .6); S.add(g); for (const sz of [-1, 1]) B(.08, 1.7, .08, 0, .85, sz * .6, WOOD2, g); B(.08, .08, 1.4, 0, 1.6, 0, WOOD2, g); B(.08, .08, 1.4, 0, .25, 0, WOOD2, g); B(.03, 1.2, 1.1, 0, .95, 0, 0xb8946a, g); }

  // ── interior ──
  // tapete de pele de urso diante da lareira e tapete do centro
  { Sp(.9, 1.3, .06, 1, 1.9, .15, .2, 0x4a3220); Sp(.35, 1, .5, 1, 1.9, .2, 1.1, 0x4a3220); for (const [sx, sz] of [[-.9, -.5], [.9, -.5], [-.9, .6], [.9, .6]]) Sp(.28, 1, .3, 1, 1.9 + sx * 1.05, .14, .2 + sz * .85, 0x4a3220); }
  B(2.2, .02, 1.5, -.8, .13, .3, 0x6a3a2a); B(1.9, .025, 1.2, -.8, .135, .3, 0x8a5a3a);
  // lareira de pedra rústica: soleira, ombreiras, manto de tora, fogo, caldeirão
  {
    const fx = HW - .5;
    B(1.2, .22, 2.3, fx, .2, -.5, STONE2); B(1.0, 2.0, .3, fx, 1.15, -1.55, 0x8a8478); B(1.0, 2.0, .3, fx, 1.15, .55, 0x8a8478); B(1.0, .5, 2.4, fx, 2.45, -.5, 0x8a8478);
    const m = C(.13, .13, 2.5, 8, fx - .45, 2.3, -.5, 0x5a3a1e); m.rotation.x = Math.PI / 2;   // manto de tora
    B(.2, 2.0, 1.8, fx + .45, 1.1, -.5, 0x2a2a2e); for (let i = 0; i < 3; i++) C(.09, .09, 1.2, 6, fx - .1, .3, -1.0 + i * .5, 0x5a3a1e).rotation.x = Math.PI / 2;
    B(.5, .35, .6, fx - .15, .5, -.5, 0xff7a20, S, 0xff5a10); B(.3, .3, .35, fx - .15, .78, -.5, 0xffc040, S, 0xffa020);
    B(.05, .8, .05, fx - .1, 1.6, -.5, IRON); C(.3, .26, .3, 12, fx - .1, 1.1, -.5, 0x2a2a30); B(.6, .03, .6, fx - .1, 1.26, -.5, IRON);
    for (let i = 0; i < 4; i++) { const l = C(.1, .1, .8, 7, fx - .1 - .2 * (i % 2), .15 + (i >> 1) * .2, 1.0 + (i % 2) * .25, 0x8a6238); l.rotation.z = Math.PI / 2; }   // lenha ao lado
    // troféu sobre o manto: cabeça de cervo com chifres
    { const g = new THREE.Group(); g.position.set(fx - .5, 3.0 - .1, -.5); g.rotation.y = -Math.PI / 2; S.add(g); Sp(.22, 1, 1.3, .9, 0, 0, 0, 0x8a6a4a, g); B(.12, .12, .3, 0, -.15, .2, 0x6a4a30, g); for (const s of [-1, 1]) { const b = C(.03, .04, .8, 5, s * .3, .35, 0, 0xd8d0b0, g); b.rotation.z = s * -.4; for (const t of [.15, .3, .45]) { const p = C(.02, .025, .3, 5, s * (.35 + t * .5), .4 + t * .5, 0, 0xd8d0b0, g); p.rotation.z = s * -.15; } } }
  }
  // mesa pesada com dois bancos, canecas, pão e faca
  {
    const top = k.table(-.9, 1.5, 2.2, .9, 0x8a6238, .85);
    for (const bz of [-.8, .8]) { B(2.0, .08, .35, -.9, .5, 1.5 + bz, WOOD); for (const sx of [-1, 1]) B(.08, .4, .3, -.9 + sx * .9, .28, 1.5 + bz, WOOD2); }
    C(.07, .06, .12, 8, -1.5, top + .06, 1.4, 0xb8b0a0); C(.07, .06, .12, 8, -.3, top + .06, 1.7, 0xb8b0a0); B(.4, .06, .26, -.9, top + .03, 1.45, 0xd8b068); B(.25, .02, .05, -.6, top, 1.7, 0xc0c0c8);
    k.candle(-1.9, top, 1.6);
  }
  // beliche de toras no canto de trás à esquerda (cama de baixo = a do morador) + escada
  {
    const bx = -2.75, bz = -2.1;
    k.bed(bx, bz, 0x5a3a2a, 0xb8a888);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.14, 2.3, .14, bx + sx * .95, 1.15, bz + sz * .5, 0x5a3a1e);
    B(2.0, .12, 1.05, bx, 1.75, bz, WOOD2); B(1.95, .18, 1.0, bx, 1.87, bz, 0xb8a888); B(1.4, .1, 1.0, bx + .2, 1.98, bz, 0x4a6a3a); B(.4, .12, .7, bx - .65, 2.05, bz, 0xf0ead8);
    for (let i = 0; i < 5; i++) B(.5, .05, .06, bx + 1.1, .35 + i * .35, bz + .6, WOOD2).rotation.z = .0;   // degraus na lateral
    B(.06, 1.9, .06, bx + .86, 1.0, bz + .6, WOOD2); B(.06, 1.9, .06, bx + 1.34, 1.0, bz + .6, WOOD2);
  }
  // rack de armas/arcos na parede de trás (à direita da janela), arcos, aljava, machadinha
  {
    B(2.0, .1, .22, 2.3, 1.9, -HD + .2, WOOD2); B(2.0, .1, .22, 2.3, 1.1, -HD + .2, WOOD2);
    for (const px of [1.6, 2.1, 2.6]) { const bw = new THREE.Mesh(new THREE.TorusGeometry(.8, .03, 4, 14, Math.PI * .6), k.M(0x6a4a28)); bw.position.set(px, 1.5, -HD + .3); bw.rotation.z = Math.PI / 2 - .3; bw.scale.y = .5; S.add(bw); B(.01, 1.4, .01, px - .35, 1.5, -HD + .3, 0xe8e0c8); }
    C(.12, .1, .7, 8, 3.4, 1.0, -HD + .45, 0x6a4a30); for (let i = 0; i < 4; i++) B(.02, .5, .02, 3.34 + i * .03, 1.5, -HD + .45, 0xd8d0b0);
    B(.1, .5, .06, 1.7, 2.35, -HD + .15, 0x5a3a1e); B(.25, .15, .06, 1.7, 2.55, -HD + .15, 0x8a8a92);
  }
  // baú, caldeirão de ferro no canto, botas e armadilha
  B(.9, .5, .6, .3, .3, -2.4, 0x4a3a28); B(.92, .08, .62, .3, .56, -2.4, IRON); B(.1, .12, .04, .3, .4, -2.08, 0xd4a830);
  for (const sx of [-1, 1]) { const bt = B(.14, .45, .22, -3.0 + sx * .15, .22, 1.4, 0x3a2418); bt.rotation.y = sx * .3; }
  { const tp = new THREE.Group(); tp.position.set(3.2, .13, 2.2); S.add(tp); for (let i = 0; i < 8; i++) B(.02, .02, .55, -.22 + i * .06, 0, 0, 0x8a8a92, tp); B(.5, .02, .02, 0, 0, -.25, 0x8a8a92, tp); B(.5, .02, .02, 0, 0, .25, 0x8a8a92, tp); }
  // carnes e ervas secando nas vigas, peles na parede, lampiões
  for (let i = 0; i < 5; i++) { B(.01, .5, .01, -.8 + i * .5, 2.7, 0, 0x999999); C(.06, .04, .35, 6, -.8 + i * .5, 2.3, 0, i % 2 ? 0x8a3a2a : 0xa0623a); }
  for (const [pz, c] of [[-1.5, 0xa07a50], [.2, 0x6a4a30]]) B(.05, 1.0, .6, -HW + .1, 1.6, pz, c);
  k.lamp(-1.2, .3); k.lamp(1.2, 1.6);

  return finishHouse(k, {
    furn: [[-.9, 1.5, .8], [-.9, .7, .35], [-.9, 2.3, .35], [-2.75, -2.1, .6], [-1.9, -2.1, .55], [.3, -2.4, .5], [3.0, -2.5, .5], [HW - .6, -.5, 1.1], [3.2, 2.2, .4], [3.2, -2.2, .4]],
    rects: [[-3.8, -2.7, -1.75, -1.5], [HW - 1.3, -1.7, HW, .7]],
    bed: { ox: -2.75, oz: -2.1 }, door: { c: -1.8, w: 1.1, h: 2.2 }, home: [1.0, .6], talk: [-1.0, 1.2],
  });
}
