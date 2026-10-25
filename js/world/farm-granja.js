/* Granja (Seu Zé), c. 1720–1750: celeiro caiado com telhado azul-ardósia e portão em X, moinho de vento com velas giratórias,
   chiqueiro coberto, abrigo das ovelhas, bomba d'água, carroça de feno e abóboras. A casa vem de farm-aves-house.js (paleta própria). */
import { farmKit } from './farm-kit.js';

export const FARM_FX = [];          // peças que giram (velas do moinho)
const WHITE = 0xf1ece0, BLUE = 0x3f5a78, BLUE2 = 0x2e4660, TIMB = 0x5a3a2a, WOOD = 0x8a6238, WOODD = 0x6a4a2a, STRAW = 0xd8b848, STONE = 0x8a8a86, RED = 0xa8321f;

export function buildGranjaDecor(c) {
  const { B, C, G, CONE, gable, tri, found, solid, g } = farmKit(c);

  // ── celeiro caiado: paredes brancas, vigas escuras, telhado azul, portão em X e janela do palheiro ──
  const barn = (BX, BZ) => {
    found(9.2, 6.8, BX, BZ, STONE);
    B(9, 4.2, 6.4, WHITE, BX, 2.1, BZ);
    for (let i = -4; i <= 4; i++) B(.14, 4.2, .12, TIMB, BX + i * 1.0, 2.1, BZ + 3.22);
    for (const s of [-1, 1]) B(.14, 4.2, .12, TIMB, BX + s * 4.5, 2.1, BZ + 3.2);
    B(9.1, .16, .14, TIMB, BX, 4.2, BZ + 3.22); B(9.1, .16, .14, TIMB, BX, .1, BZ + 3.22);
    B(3.4, 3.2, .14, WOOD, BX, 1.6, BZ + 3.25);                                                              // portão duplo
    for (const dx of [-.85, .85]) { B(.14, 3.2, .1, TIMB, BX + dx * 1.65, 1.6, BZ + 3.33); }
    B(3.5, .14, .12, TIMB, BX, 3.25, BZ + 3.34);
    const dg = Math.hypot(1.7, 3.1);
    for (const s of [-1, 1]) for (const k of [-1, 1]) { const m = B(.14, dg, .1, TIMB, BX + s * .85, 1.6, BZ + 3.36); m.rotation.z = k * Math.atan2(1.7, 3.1); }
    B(1.3, 1.1, .14, WOODD, BX, 4.6, BZ + 3.25); B(1.5, .14, .2, TIMB, BX, 5.2, BZ + 3.3); B(.14, 1.3, .2, TIMB, BX, 4.6, BZ + 3.3);    // porta do palheiro
    gable(BX, 4.2, BZ, 9, 6.4, 2.6, .7, BLUE, BLUE2);
    tri(BX - 4.5, 4.2, BZ, 6.4, 2.6, WHITE); tri(BX + 4.5, 4.2, BZ, 6.4, 2.6, WHITE);
    B(.1, 1.0, .1, 0x2a2a2a, BX, 7.6, BZ); B(.8, .12, .05, 0x2a2a2a, BX, 8.0, BZ);                           // cata-vento
    for (const sx of [-3.4, 3.4]) { B(1.0, .9, .1, 0x8ec8e8, BX + sx, 2.4, BZ + 3.22); B(1.2, .1, .16, TIMB, BX + sx, 2.9, BZ + 3.25); B(1.2, .1, .16, TIMB, BX + sx, 1.9, BZ + 3.25); }
    for (let i = 0; i < 4; i++) B(1.1, .8, .8, STRAW, BX - 5.6, .4 + (i > 1 ? .8 : 0), BZ + 2.4 - (i % 2) * 1);   // fardos junto à parede
    solid(BX - 3, BZ, 2.4); solid(BX, BZ, 2.7); solid(BX + 3, BZ, 2.4);
  };
  barn(8, -12);

  // ── moinho de vento: torre cônica de tijolo caiado, capuz de madeira e quatro velas treliçadas ──
  const mill = (MX, MZ) => {
    C(1.9, 2.3, .6, STONE, MX, -.1, MZ, g, 14); C(1.35, 2.0, 7.4, WHITE, MX, 3.7, MZ, g, 14);
    for (const y of [1.6, 3.4, 5.2]) C(1.5 - y * .06, 1.5 - y * .06, .1, TIMB, MX, y, MZ, g, 14);
    CONE(1.75, 1.7, WOODD, MX, 8.35, MZ, g, 14); C(.12, .12, .8, 0x2a2a2a, MX, 9.4, MZ, g, 6);
    B(.9, 1.7, .12, WOOD, MX, .95, MZ + 1.95); B(.6, .6, .1, 0x8ec8e8, MX, 4.6, MZ + 1.45).rotation.x = -.3;
    const hub = G(MX, 6.9, MZ + 1.9);
    B(.5, .5, .9, WOODD, 0, 0, -.3, hub);
    const sails = G(0, 0, .35, 0, hub);
    for (let k = 0; k < 4; k++) {
      const a = G(0, 0, 0, 0, sails); a.rotation.z = k * Math.PI / 2;
      B(.2, 3.2, .12, WOODD, 0, 1.6, 0, a);
      for (let j = 0; j < 4; j++) B(.8, .1, .08, 0xe8dcc0, .42, .8 + j * .6, .02, a);
      B(.07, 2.6, .06, 0xe8dcc0, .82, 1.9, .02, a); B(.8, .06, .06, 0xe8dcc0, .42, 3.15, .02, a);
    }
    sails.userData.dyn = true; FARM_FX.push({ o: sails, v: .6 });
    solid(MX, MZ, 2.2);
  };
  mill(0.2, -14.6);

  // ── chiqueiro coberto sobre o cercado A (x −14…−3,4 · z −2,4…3,4): cobertura de duas águas, comedouro e lamaçal ──
  { const x0 = -13.6, x1 = -8.4, z0 = -1.8, z1 = 2.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [cx, z0], [cx, z1]]) B(.24, 2.4, .24, WOODD, px, 1.2, pz);
    B(x1 - x0 + .3, .2, .2, TIMB, cx, 2.4, z0); B(x1 - x0 + .3, .2, .2, TIMB, cx, 2.4, z1);
    gable(cx, 2.4, cz, x1 - x0, z1 - z0, 1.2, .5, 0x8a5a3a, 0x6a3a28);
    B(x1 - x0 - .2, .5, .1, WOOD, cx, .25, z0 + .1); B(.1, .5, 3, WOOD, x0 + .1, .25, cz + .8);        // paredinha dos fundos
    B(2.0, .35, .6, WOOD, cx + 1.2, .22, z1 - .7); B(1.7, .08, .4, 0x7aa84a, cx + 1.2, .42, z1 - .7);
    B(.9, .5, .7, STRAW, x0 + .8, .25, z0 + 1.0);
  }

  // ── abrigo das ovelhas (cercado B): telheiro aberto + cocho de feno + banquinho de tosquia ──
  { const x0 = -13.6, x1 = -10.4, z0 = 4.2, z1 = 7.4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) B(.2, 1.9, .2, WOODD, px, .95, pz);
    gable(cx, 1.9, cz, x1 - x0, z1 - z0, .9, .4, 0x8a5a3a, 0x6a3a28);
    B(2.4, .5, .5, WOOD, cx, .3, z1 + 1.1); B(2.1, .3, .3, STRAW, cx, .55, z1 + 1.1);
    B(.7, .4, .5, WOOD, x1 + 2.0, .2, z0 + .3);
  }

  // ── bomba d'água, carroça de feno, abóboras ──
  { const wx = -2.2, wz = -10.8; C(.5, .5, .8, STONE, wx, .4, wz, g, 10); C(.14, .14, 1.6, 0x4a4a4a, wx, 1.4, wz, g, 8); B(.7, .12, .12, 0x4a4a4a, wx + .3, 2.1, wz); B(.9, .08, .5, 0x4a90c8, wx + .5, .7, wz); solid(wx, wz, .9); }
  { const cx = 3.2, cz = -9.6, cart = G(cx, 0, cz, .25);
    B(2.4, .18, 1.3, WOOD, 0, .75, 0, cart); B(2.4, .6, .1, WOODD, 0, 1.1, .6, cart); B(2.4, .6, .1, WOODD, 0, 1.1, -.6, cart); B(.1, .6, 1.3, WOODD, -1.2, 1.1, 0, cart);
    B(2.2, .7, 1.1, STRAW, 0, 1.2, 0, cart);
    for (const s of [-1, 1]) { const w = C(.55, .55, .12, WOODD, s * .8, .55, .7, cart, 14); w.rotation.x = Math.PI / 2; const w2 = C(.55, .55, .12, WOODD, s * .8, .55, -.7, cart, 14); w2.rotation.x = Math.PI / 2; }
    B(1.8, .08, .08, WOODD, 2.0, .7, 0, cart);
    solid(cx, cz, 1.5); }
  for (const [px, pz, r] of [[12.4, -7.3, .32], [13.0, -7.0, .26], [12.7, -6.5, .3]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), c.M(0xe8832a)); m.scale.y = .8; m.position.set(px, r * .8, pz); g.add(m); }
}

/** Gira as velas do moinho */
export function updateFarmFx(dt) { for (const f of FARM_FX) f.o.rotation.z += f.v * dt; }
