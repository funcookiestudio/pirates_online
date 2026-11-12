/* Casa do Pescador (Tião Anzol): reboco desbotado pelo sal, venezianas verde-mar, telhado de ripas azul-acinzentado, chaminé de pedra,
   varal de peixes, barco virado sobre cavaletes, covos, rede e âncora; por dentro: cama, lareira, mesa de peixe, barris de sal, redes e troféu na parede. */
import { startHouse, finishHouse, HOUSE_K, STONE, STONE2, TM, IRON, WOOD, WOOD2 } from './house-kit.js';

export const FISHER_SC = HOUSE_K;

export function buildFisherHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  return buildFisherAt(x, z, th);
}

export function buildFisherAt(x, z, th) {
  const k = startHouse(x, z, th, { id: 12, HW: 4, HD: 3, H: 3, RISE: 2.2, PL: 0xbdb7a0, SH: 0x2b6a68, doorId: 'fisher-front' });
  const { B, C, Sp, W, S, tr, front, wB, wL, wR, roof } = k;
  const HW = 4, HD = 3, H = 3;

  // ── estrutura ──
  k.xr(true);
  k.wall('x', HD, -HW, HW, [{ c: -2, w: 1.1, y0: 0, y1: 2.2 }, { c: 1.9, w: 1.4, y0: 1, y1: 2.1 }], front);
  k.door(-2, 1.1, 2.2, front, 'fisher-front'); k.win('x', HD, 1.9, 1.4, 1, 2.1, front);
  k.wall('x', -HD, -HW, HW, [{ c: 1.2, w: 1.2, y0: 1, y1: 2.1 }], wB); k.win('x', -HD, 1.2, 1.2, 1, 2.1, wB);
  k.wall('z', -HW, -HD, HD, [{ c: .3, w: 1.2, y0: 1, y1: 2.1 }], wL); k.win('z', -HW, .3, 1.2, 1, 2.1, wL);
  k.wall('z', HW, -HD, HD, [], wR);
  k.gable([0x3f5a6a, 0x4a6676, 0x35505f, 0x56707e, 0x3b5262]);
  k.xr(false);
  // soleira de pedra e degrau diante da porta, caminho de lajes
  B(1.9, .2, .9, -2, .12, HD + .55, STONE); B(1.4, .12, .5, -2, .06, HD + 1.2, STONE2);
  // beiral de proteção sobre a porta (pequena marquise de tábuas)
  for (let i = 0; i < 3; i++) B(.5, .06, .9, -2.55 + i * .55, 2.62, HD + .55, i % 2 ? 0x7a5c32 : 0x6e4d2c).rotation.x = .3;
  B(.08, .55, .08, -2.9, 2.35, HD + .95, TM); B(.08, .55, .08, -1.1, 2.35, HD + .95, TM);

  // ── chaminé de pedra na empena direita ──
  {
    const cx = HW + .75;
    B(1.2, H + 2.2 + .8, 1.4, cx, (H + 2.2 + .8) / 2, -.4, 0x8a8478);
    for (let y = .5; y < H + 2.8; y += .5) B(1.24, .05, 1.44, cx, y, -.4, 0x5e5c56);   // fiadas
    B(1.5, .14, 1.7, cx, H + 3.05, -.4, STONE);    // capa
    B(.7, .35, .9, cx, H + 3.25, -.4, STONE2);     // boca
    B(1.6, .5, 1.5, cx, .25, -.4, STONE2);          // base
  }

  // ── barco virado sobre cavaletes, no quintal dos fundos ──
  {
    const g = new THREE.Group(); g.position.set(0, 0, -HD - 2.4); S.add(g); g.rotation.y = Math.PI / 2;   // casco ao longo de x, no quintal dos fundos
    for (const zz of [-1.0, 1.0]) { for (const s of [-1, 1]) { const l = B(.09, .75, .09, s * .45, .38, zz, WOOD2, g); l.rotation.z = -s * .35; } B(1.1, .1, .12, 0, .72, zz, WOOD, g); }
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), k.M(0x3a6a8a)); hull.scale.set(.72, .55, 1.9); hull.position.set(0, .95, 0); hull.castShadow = true; g.add(hull);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(Math.PI / 2), k.M(0x2a1c10)); rim.scale.set(.72, 1, 1.9); rim.position.set(0, .95, 0); g.add(rim);   // fundo (visto de baixo)
    for (let i = -3; i <= 3; i++) {   // cavernas (costelas) e faixa branca
      const t = i / 3.5, f = Math.sqrt(1 - t * t); if (f < .2) continue;
      const rb = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 4, 16, Math.PI), k.M(0x5a4228)); rb.scale.set(.72 * f * 1.03, .55 * f * 1.03, 1); rb.position.set(0, .95, t * 1.9); g.add(rb);
    }
    B(.1, .08, 3.5, 0, 1.5, 0, 0x4a3018, g);   // quilha
    const st = new THREE.Mesh(new THREE.TorusGeometry(1, .03, 4, 16, Math.PI), k.M(0xe8e4d4)); st.scale.set(.74 * .85, .55 * .85, 1); st.position.set(0, .95, .5); g.add(st);
    for (const zz of [-1.5, 1.5]) B(.28, .22, .14, 0, .98, zz, 0x2a1c10, g);   // pontas do casco
    // remos encostados no beiral do barco
    for (const s of [-1, 1]) { const r = C(.035, .035, 2.4, 6, s * .85, 1.0, .2, 0x9a7a4a, g); r.rotation.z = s * .18; B(.2, .5, .03, s * (.85 + .2), .25, .2, 0x9a7a4a, g).rotation.z = s * .18; }
  }

  // ── varal de peixes diante da janela da direita ──
  {
    for (const s of [-1, 1]) B(.1, 1.9, .1, 1.9 + s * 1.5, .95, HD + 2.4, WOOD2);
    B(3.2, .1, .1, 1.9, 1.85, HD + 2.4, WOOD); B(3.2, .06, .06, 1.9, 1.35, HD + 2.4, WOOD2);
    const fish = (px, py, pz, c) => { Sp(.28, .4, 1, .35, px, py, pz, c).rotation.x = 0; B(.02, .22, .12, px, py - .22, pz, c); };   // corpo + cauda
    for (let i = 0; i < 6; i++) { const px = .7 + i * .5, c = i % 2 ? 0xb8c0c8 : 0xa8b4bc; B(.01, .22, .01, px, 1.74, HD + 2.4, 0x999999); Sp(.3, .28, 1, .22, px, 1.5, HD + 2.4, c); B(.025, .2, .14, px, 1.22, HD + 2.4, c); B(.01, .05, .01, px, 1.5, HD + 2.4, 0x222222); }
    for (let i = 0; i < 4; i++) { const px = 1.0 + i * .6; Sp(.26, .26, 1, .2, px, 1.1, HD + 2.4, 0xd0b898); }
    // balde de iscas e covos
    C(.22, .17, .32, 10, 3.7, .2, HD + 1.3, 0x5a4a38); C(.18, .18, .02, 10, 3.7, .36, HD + 1.3, 0x3a8ac8);
  }
  // covos (armadilhas de lagosta): armação de varetas
  const pot = (px, pz, r) => { const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = r; S.add(g); B(.9, .05, .6, 0, .08, 0, WOOD2, g); for (let i = 0; i < 6; i++) { B(.9, .05, .04, 0, .12 + i * .09, .3, 0x9a7a4a, g); B(.9, .05, .04, 0, .12 + i * .09, -.3, 0x9a7a4a, g); } for (const s of [-1, 1]) for (const t of [-1, 1]) B(.05, .6, .05, s * .43, .35, t * .27, WOOD, g); B(.9, .05, .6, 0, .6, 0, WOOD2, g); for (let i = 0; i < 5; i++) B(.04, .5, .62, -.4 + i * .2, .36, 0, 0x9a7a4a, g); return g; };
  pot(-.2, HD + 1.0, .1); pot(.55, HD + 1.1, -.2); pot(.3, HD + 1.1, .6).position.y = .6;   // o terceiro por cima
  // barris de sal e âncora encostada
  k.barrel(-3.5, HD + .9, 0, 0x7a5a34); k.barrel(-3.5, HD + 1.8, 0, 0x6a4a28);
  {   // âncora: haste, braços, cepo e argola
    const g = new THREE.Group(); g.position.set(3.4, 0, HD + .75); g.rotation.y = -.35; g.rotation.z = .12; S.add(g);
    B(.12, 1.7, .12, 0, .9, 0, 0x4a4a52, g); B(.9, .1, .1, 0, 1.55, 0, 0x4a4a52, g);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.14, .035, 5, 10), k.M(0x4a4a52)); r.position.set(0, 1.85, 0); g.add(r);
    for (const s of [-1, 1]) { B(.1, .1, .55, s * .18, .08, 0, 0x4a4a52, g).rotation.y = 0; const arm = B(.55, .1, .1, s * .3, .12, 0, 0x4a4a52, g); arm.rotation.z = s * -.45; B(.2, .2, .08, s * .56, .26, 0, 0x4a4a52, g).rotation.z = s * .8; }
  }
  // rede estendida no chão (cordas em grade) e rolo de corda
  {
    const g = new THREE.Group(); g.position.set(2.3, .13, HD + 2.6); g.rotation.y = .1; S.add(g);
    for (let i = -4; i <= 4; i++) { B(.02, .015, 1.4, i * .22, 0, 0, 0xbfae8a, g); }
    for (let i = -3; i <= 3; i++) { B(1.9, .015, .02, 0, 0, i * .2, 0xbfae8a, g); }
    for (let i = 0; i < 4; i++) Sp(.07, 1, .7, 1, -.8 + i * .5, .03, .5, 0x8a8a8a, g);
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.33 - i * .07, .06, 5, 12), k.M(0xb89a5a)); t.rotation.x = Math.PI / 2; t.position.set(-1.8, .15 + i * .1, .2); g.add(t); }
  }
  // placa: peixe de madeira pendurado numa haste ao lado da porta
  {
    B(.1, .1, .9, -3.55, 2.6, HD + .45, IRON);   // braço de ferro
    B(.04, .4, .04, -3.55, 2.35, HD + .85, 0x999999);
    const g = new THREE.Group(); g.position.set(-3.55, 2.0, HD + .85); g.rotation.y = Math.PI / 2; S.add(g);
    Sp(.5, 1, .42, .12, 0, 0, 0, 0x4a8aa8, g); B(.04, .3, .1, -.5, 0, 0, 0x4a8aa8, g).rotation.z = .5; B(.04, .3, .1, -.54, .1, 0, 0x4a8aa8, g).rotation.z = -.5; B(.05, .08, .06, .3, .08, .1, 0xffffff, g);
  }
  // lampião de navio ao lado da porta e vaso de flores sob a janela
  B(.01, .3, .01, 1.0, 2.5, HD + .4, 0x999999); B(.12, .16, .12, 1.0, 2.3, HD + .4, 0xffd891, S, 0xffb040); B(.18, .04, .18, 1.0, 2.42, HD + .4, IRON);
  B(1.2, .22, .3, 1.9, .95, HD + .33, WOOD2); for (let i = 0; i < 5; i++) { Sp(.12, 1, 1, 1, 1.45 + i * .22, 1.18, HD + .33, [0xd05060, 0xe8c040, 0xe8e0d0][i % 3]); }

  // ── interior ──
  // tapete trançado entre a cama e a mesa
  B(2.6, .02, 1.8, -.6, .13, -.1, 0x5a6a5a); B(2.3, .025, 1.5, -.6, .135, -.1, 0x7a8a7a);
  // lareira de pedra na parede direita: soleira, arco, fogo, caldeirão
  {
    B(1.0, .2, 2.0, HW - .7, .2, -.4, STONE2);    // soleira
    B(.9, 1.7, .22, HW - .3, 1.05, -1.25, 0x8a8478); B(.9, 1.7, .22, HW - .3, 1.05, .45, 0x8a8478);   // ombreiras
    B(.9, .3, 1.9, HW - .3, 2.0, -.4, 0x8a8478); B(.9, .1, 2.0, HW - .25, 2.2, -.4, STONE);    // verga e prateleira
    B(.2, 1.8, 1.7, HW - .1, 1.0, -.4, 0x2a2a2e);   // fundo enegrecido
    for (let i = 0; i < 3; i++) { const l = C(.08, .08, 1.0, 6, HW - .6, .3, -.9 + i * .5, 0x5a3a1a); l.rotation.z = Math.PI / 2; }
    B(.4, .35, .5, HW - .55, .48, -.4, 0xff7a20, S, 0xff5a10); B(.25, .3, .3, HW - .55, .75, -.4, 0xffc040, S, 0xffa020);   // brasas e chama (não apaga: cor própria)
    B(.04, .7, .04, HW - .45, 1.5, -.4, IRON); const cb = C(.3, .25, .3, 10, HW - .45, 1.0, -.4, 0x2a2a30); B(.54, .04, .54, HW - .45, 1.18, -.4, IRON);   // gancho e caldeirão
    B(.1, .1, .6, HW - .6, 1.5, -.4, IRON);
    // utensílios na prateleira da lareira
    C(.07, .07, .22, 8, HW - .3, 2.36, -1.0, 0xa0623a); C(.08, .08, .16, 8, HW - .3, 2.33, -.4, 0x6a2a2a); C(.06, .06, .26, 8, HW - .3, 2.38, .2, 0x2f6a3a);
  }
  // mesa de peixe no meio: tampo, peixes no prato, faca, vela; dois banquinhos
  {
    const top = k.table(.7, .6, 1.7, .95, WOOD, .8);
    B(.5, .03, .32, .3, top, .5, 0xe8e0d0); Sp(.2, 1, .45, .3, .3, top + .06, .5, 0xa8b4bc); B(.1, .08, .02, .08, top + .06, .5, 0x9aa4ac);
    B(.28, .02, .06, 1.0, top, .7, 0xc0c0c8); B(.08, .02, .06, 1.17, top, .7, 0x6a4a24);
    k.candle(1.05, top - .01, .35);
    k.stool(.2, 1.35); k.stool(1.2, 1.35, 0x8a6a40);
  }
  // cama no canto esquerdo de trás (cabeceira na parede), baú ao pé e lampião
  k.bed(-2.75, -2.1, 0x2b5a68, 0xd0c8a8);
  B(.9, .5, .6, -.9, .3, -2.35, 0x4a3a28); B(.92, .08, .62, -.9, .56, -2.35, IRON); B(.1, .12, .04, -.9, .4, -2.03, 0xd4a830);   // baú do mar
  // barris de peixe salgado e saco de sal
  k.barrel(.35, -2.4); k.barrel(1.2, -2.4, 0, 0x7a5a34); k.sack(2.1, -2.45, 0xe0d8c0); k.sack(2.6, -2.3, 0xcdb88a, .5);
  // prateleiras na parede de trás (à esquerda da janela) com potes e uma nau em garrafa
  k.shelf(-.9, 1.5, -2.8, 1.8); k.shelf(-.9, 2.15, -2.8, 1.8);
  for (let i = 0; i < 4; i++) C(.09, .1, .26, 8, -1.55 + i * .42, 1.66, -2.8, [0xa0623a, 0x8a5030, 0xc9b48a, 0x6a4a2a][i]);
  C(.12, .12, .34, 10, -.3, 2.35, -2.8, 0x8ac0a0); Sp(.08, 1, 1.6, 1, -.3, 2.3, -2.8, 0xe8e0d0);   // nau-em-garrafa
  B(.4, .3, .3, -1.6, 2.3, -2.8, 0x3a6a8a); B(.3, .3, .06, -1.0, 2.3, -2.8, 0xeadfb8);    // caixa e mapa
  // canto da esquerda da frente: varas de pesca encostadas e casaco de oleado no gancho
  for (let i = 0; i < 4; i++) { const r = C(.012, .02, 2.6, 5, -3.55 + i * .12, 1.35, 1.5 - i * .1, i % 2 ? 0x8a6a3a : 0x6a4a24); r.rotation.z = -.1 - i * .03; r.rotation.x = .08; }
  B(.6, 1.1, .08, -3.9 + .08, 1.5, 1.5 + .0, 0x4a4a30).rotation.y = Math.PI / 2; B(.08, .1, .3, -3.88, 2.1, 1.5, IRON);
  // redes e boias penduradas nas vigas; peixes secos e fieiras de cebola
  for (let i = 0; i < 3; i++) { B(.01, .5, .01, -2 + i * 1.4, 2.65, 1.3 - i * .3, 0x999999); const m = Sp(.2, 1, 1.4, 1, -2 + i * 1.4, 2.2, 1.3 - i * .3, [0xe05040, 0xe8e0d0, 0xe0a030][i]); }
  { const g = new THREE.Group(); g.position.set(-1.0, 2.55, -1.6); S.add(g); for (let i = -4; i <= 4; i++) B(.015, .015, 1.2, i * .13, 0, 0, 0xbfae8a, g); for (let i = -3; i <= 3; i++) B(1.1, .015, .015, 0, 0, i * .16, 0xbfae8a, g); g.rotation.x = .08; }
  for (let i = 0; i < 5; i++) { B(.01, .45, .01, 2.6 + i * .2, 2.65, 1.8, 0x999999); Sp(.17, .3, 1, .15, 2.6 + i * .2, 2.3, 1.8, 0xb8c0c8); }
  // troféu: grande peixe-espada montado na parede de trás sobre a janela? (entre prateleiras e janela) e bússola
  { const g = new THREE.Group(); g.position.set(-.3, 1.85, -2.82); S.add(g); Sp(.6, 1, .35, .1, 0, 0, 0, 0x5a7a9a, g); B(.04, .04, .9, 0, 0, 0, 0xd8d0b0, g).rotation.y = Math.PI / 2; g.children[1].position.x = .85; B(.05, .35, .06, -.55, 0, 0, 0x5a7a9a, g).rotation.z = .4; g.visible = true; }
  { const g = new THREE.Group(); g.position.set(HW - .12, 1.7, 1.8); S.add(g); const c = C(.28, .28, .05, 14, 0, 0, 0, 0xb08a30, g); c.rotation.z = Math.PI / 2; const c2 = C(.22, .22, .06, 14, -.02, 0, 0, 0xeadfb8, g); c2.rotation.z = Math.PI / 2; B(.02, .02, .36, -.05, 0, 0, 0xb02020, g); }  // bússola
  // dois lampiões de teto
  k.lamp(-1.5, 1.0); k.lamp(2.0, -1.2);

  return finishHouse(k, {
    furn: [[.7, .6, .85], [.2, 1.35, .3], [1.2, 1.35, .3], [-.9, -2.35, .5], [.35, -2.4, .45], [1.2, -2.4, .45], [2.1, -2.45, .45], [2.6, -2.3, .45], [-2.75 - .5, -2.1, .55], [-2.75 + .5, -2.1, .55], [HW - .6, -.4, 1.0]],
    rects: [[-3.8, -2.7, -1.7, -1.5], [HW - 1.2, -1.5, HW, .7]],
    bed: { ox: -2.75, oz: -2.1 }, door: { c: -2, w: 1.1, h: 2.2 }, home: [1.8, -.9], talk: [.2, 1.8],
  });
}
