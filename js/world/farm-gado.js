/* Fazenda do Gado (Seu Tobias), c. 1720–1750: grande estábulo de pedra e enxaimel com baias de meia-porta, palheiro com talha,
   dois silos de pedra com cúpula, cocheira aberta (selas, carroça e manjedoura), bebedouros longos, latões de leite e fardos de feno.
   A casa vem de farm-aves-house.js (paleta de pedra e telha escura). */
import { farmKit } from './farm-kit.js';

const STONE = 0x8a8782, STONE2 = 0x6e6a62, PLAS = 0xe4d8b8, TIMB = 0x4a3020, ROOF = 0x4a4f5c, ROOF2 = 0x363a46, WOOD = 0x8a6238, WOODD = 0x5a3a22,
  STRAW = 0xd8b848, IRON = 0x2b2b30, TIN = 0xb8bcc4;

export function buildGadoDecor(c) {
  const { B, C, G, CONE, gable, tri, found, solid, g } = farmKit(c);

  // ── estábulo grande (10,4 × 6,4): base de pedra, enxaimel, quatro baias de meia-porta, palheiro com talha ──
  const stable = (SX, SZ) => {
    const W = 10.4, D = 6.4;
    found(W + .4, D + .4, SX, SZ, STONE2);
    B(W, 1.0, D, STONE, SX, .5, SZ);                                                                              // embasamento de pedra
    for (let i = 0; i < 9; i++) B(1.0, .12, D + .06, STONE2, SX - W / 2 + .6 + i * 1.15, 1.0, SZ);
    B(W, 3.2, D, PLAS, SX, 2.6, SZ);                                                                              // reboco
    for (let i = 0; i <= 8; i++) B(.16, 3.2, .12, TIMB, SX - W / 2 + .1 + i * (W - .2) / 8, 2.6, SZ + D / 2 + .02);
    B(W + .1, .18, .14, TIMB, SX, 4.2, SZ + D / 2 + .03); B(W + .1, .18, .14, TIMB, SX, 1.1, SZ + D / 2 + .03);
    for (let i = 0; i < 4; i++) {                                                                                  // baias
      const bx = SX - W / 2 + 1.3 + i * 2.6;
      B(1.5, 2.2, .14, WOODD, bx, 1.1 + .0, SZ + D / 2 + .08);                                                   // porta de baixo
      B(1.5, .12, .16, TIMB, bx, 2.2, SZ + D / 2 + .1);
      B(1.5, 1.0, .1, 0x2a1a10, bx, 2.75, SZ + D / 2 + .05);                                                     // meia-porta aberta
      B(.12, 1.0, .2, TIMB, bx - .75, 2.75, SZ + D / 2 + .1); B(.12, 1.0, .2, TIMB, bx + .75, 2.75, SZ + D / 2 + .1);
      const flap = B(1.5, 1.0, .08, WOODD, bx + .95, 2.75, SZ + D / 2 + .5); flap.rotation.y = 1.25;
      if (i % 2 === 0) { const hd = G(bx, 2.7, SZ + D / 2 - .1); B(.5, .55, .7, 0x7a5030, 0, 0, .1, hd); B(.34, .4, .5, 0x8a6040, 0, -.15, .55, hd); B(.1, .3, .1, 0x5a3a22, -.12, .4, .0, hd); B(.1, .3, .1, 0x5a3a22, .12, .4, .0, hd); }   // cabeça de cavalo na baia
      B(1.0, .1, .1, 0xc8a85a, bx, .9, SZ + D / 2 + .22);                                                        // barra de ferrolho
    }
    B(1.6, 1.4, .1, WOODD, SX, 5.0, SZ + D / 2 + .04); B(1.8, .12, .14, TIMB, SX, 5.75, SZ + D / 2 + .08);          // porta do palheiro
    B(.14, .14, 1.4, TIMB, SX, 6.6, SZ + D / 2 + .6); B(.1, .1, .1, IRON, SX, 6.4, SZ + D / 2 + 1.3); C(.12, .12, .06, IRON, SX, 6.5, SZ + D / 2 + 1.25, g, 8).rotation.x = Math.PI / 2;
    gable(SX, 4.2, SZ, W, D, 2.8, .8, ROOF, ROOF2);
    tri(SX - W / 2, 4.2, SZ, D, 2.8, PLAS); tri(SX + W / 2, 4.2, SZ, D, 2.8, PLAS);
    B(.08, 1.3, .08, IRON, SX + 4.3, 8.0, SZ); B(.9, .1, .06, IRON, SX + 4.3, 8.5, SZ); { const hs = B(.5, .3, .06, IRON, SX + 4.6, 8.55, SZ); }     // cata-vento
    solid(SX - 4, SZ, 2.3); solid(SX - 1.3, SZ, 2.5); solid(SX + 1.3, SZ, 2.5); solid(SX + 4, SZ, 2.3);
  };
  stable(9.2, -12.4);

  // ── silos de pedra com anéis e cúpula, ligados por um galpão de ração ──
  const silo = (SX, SZ, H) => {
    C(1.75, 1.9, .7, STONE2, SX, -.1, SZ, g, 16); C(1.55, 1.55, H, STONE, SX, H / 2 + .25, SZ, g, 16);
    for (let y = 1.2; y < H; y += 1.1) C(1.6, 1.6, .1, STONE2, SX, y, SZ, g, 16);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.65, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c.M(0x5a6a7a)); dome.position.set(SX, H + .25, SZ); dome.castShadow = true; g.add(dome);
    C(.12, .12, .8, IRON, SX, H + 2.1, SZ, g, 6);
    B(.14, H - 1, .5, IRON, SX + 1.6, H / 2, SZ); for (let y = 1; y < H - .5; y += .45) B(.5, .06, .06, IRON, SX + 1.6, y, SZ + .0);   // escada de ferro
    B(.9, 1.5, .1, WOODD, SX - .3, .95, SZ + 1.5);
    solid(SX, SZ, 2.1);
  };
  silo(-.6, -14.4, 8.2); silo(2.6, -14.8, 7.0);
  B(2.2, 1.6, 1.6, WOOD, 1.0, .8, -11.2); gable(1.0, 1.6, -11.2, 2.2, 1.6, .7, .2, ROOF2, ROOF); solid(1.0, -11.2, 1.3);   // galpão de ração

  // ── cocheira aberta (cercado dos cavalos): telhado de duas águas sobre postes, manjedoura, rack de selas e carroça ──
  { const x0 = -13.6, x1 = -8.2, z0 = 4.4, z1 = 8.6, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [cx, z0], [cx, z1]]) B(.26, 2.6, .26, WOODD, px, 1.3, pz);
    B(x1 - x0 + .3, .22, .22, TIMB, cx, 2.6, z0); B(x1 - x0 + .3, .22, .22, TIMB, cx, 2.6, z1);
    gable(cx, 2.6, cz, x1 - x0, z1 - z0, 1.3, .6, ROOF, ROOF2);
    B(x1 - x0 - .3, .9, .12, WOOD, cx, .45, z0 + .06);                                                              // parede dos fundos
    B(3.0, .5, .6, WOOD, cx + 1, .3, z0 + .7); B(2.7, .1, .4, 0x7aa84a, cx + 1, .55, z0 + .7);                     // manjedoura com feno
    B(.1, 1.2, .1, WOODD, x0 + .6, .6, z0 + .5); B(.1, 1.2, .1, WOODD, x0 + 1.8, .6, z0 + .5); B(1.4, .1, .1, WOODD, x0 + 1.2, 1.2, z0 + .5);
    B(.5, .2, .8, 0x8a3a2a, x0 + 1.0, 1.35, z0 + .5); B(.5, .2, .8, 0x7a3020, x0 + 1.7, 1.35, z0 + .5);             // selas
    solid(cx, z0 + .5, 1.2);
  }

  // ── bebedouros longos de madeira, latões de leite, fardos e rolos de feno ──
  const trough = (x, z, rot = 0) => { const t = G(x, 0, z, rot); B(3.6, .5, .8, WOOD, 0, .3, 0, t); B(3.3, .08, .5, 0x4a90c8, 0, .52, 0, t); B(.14, .5, .9, WOODD, -1.6, .3, 0, t); B(.14, .5, .9, WOODD, 1.6, .3, 0, t); };
  trough(-9.6, -1.5); trough(-9.6, 9.4);
  for (const [px, pz] of [[1.8, -9.5], [2.4, -9.2], [1.4, -8.8]]) { C(.24, .26, .75, TIN, px, .4, pz, g, 10); C(.2, .2, .1, TIN, px, .83, pz, g, 10); solid(px, pz, .35); }
  for (const [px, pz] of [[14.2, -8.6], [14.2, -7.6]]) { B(1.1, .8, .8, STRAW, px, .4, pz); solid(px, pz, .6); }
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 1.2, 14), c.M(STRAW)); m.rotation.z = Math.PI / 2; m.position.set(13.4, .75, -6.2); g.add(m); solid(13.4, -6.2, .9); }
}
