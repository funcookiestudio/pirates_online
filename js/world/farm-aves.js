/* Sítio das Aves (Dona Marta), c. 1720–1750: quinta de reboco rosado com enxaimel, telhado de telha cerâmica, pombal, galinheiro sobre pernas,
   lagoa dos patos com cais, cerejeiras em flor, portão de pedra com placa e muretas. Só enfeites e construções: a rotina da fazendeira,
   os cercados e a lavoura continuam vindo de farm-site.js (mesmas coordenadas locais: +z = lado da estrada).
   Tudo é montado antes da fusão de cenário, então vira poucas malhas. */

const PLASTER = 0xeccabd, PLASTER2 = 0xdcb4a6, TIMBER = 0x5a3a2a, PLINTH = 0x8c8880, PLINTH2 = 0x77736b, ROOF = 0xb4502e, ROOF2 = 0x8c3a22,
  SHUT = 0x4d8088, TRIM = 0xf4efe2, DOOR = 0x6b4a2b, IRON = 0x2b2b30, WOODL = 0x9a7040, WOODD = 0x6a4a2a, GREEN = 0x4f8a3c, GREEN2 = 0x3f7a30,
  PINK = 0xf2a8c0, PINK2 = 0xf8c8d8, STRAW = 0xd8b848;

export function buildAvesDecor(c) {
  const { g, solid, M } = c;
  const B = (w, h, d, col, x, y, z, p = g, em) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), em ? new THREE.MeshLambertMaterial({ color: col, emissive: em }) : M(col));
    m.position.set(x, y, z); p.add(m); return m;
  };
  const C = (rt, rb, h, col, x, y, z, p = g, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(col)); m.position.set(x, y, z); p.add(m); return m; };
  const S = (r, col, x, y, z, p = g, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M(col)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); p.add(m); return m; };
  const G = (x, y, z, ry = 0, p = g) => { const q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = ry; p.add(q); return q; };

  /** Telhado de duas águas com cumeeira ao longo de x, beirais e fileiras de telha. Origem em (centro, base da parede) */
  function gable(p, w, d, y0, rise, oh, col, col2, gcol) {
    const half = d / 2 + oh, sl = rise / (d / 2), ang = Math.atan(sl), L = half / Math.cos(ang);
    for (const s of [-1, 1]) {
      const q = G(0, y0 + rise - sl * half / 2 + .02, s * half / 2, 0, p); q.rotation.x = s * ang;
      B(w + 2 * oh, .16, L + .04, col, 0, 0, 0, q);
      for (let k = -3; k <= 3; k++) B(w + 2 * oh + .04, .05, .08, col2, 0, .1, k * L / 7, q);
      B(w + 2 * oh + .06, .09, .1, col2, 0, .02, s * -L / 2, q);                    // testeira do beiral
    }
    B(w + 2 * oh + .1, .2, .34, col2, 0, y0 + rise + .02, 0, p);                   // cumeeira
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, rise); sh.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: false }), M(gcol)); m.rotation.y = Math.PI / 2;
      m.position.set(s * w / 2 - (s > 0 ? .2 : 0), y0, 0); p.add(m);
    }
  }

  /** Janela voltada para +z do grupo: moldura, vidro, travessas, venezianas abertas, peitoril e jardineira com flores */
  function win(p, x, y, w = .9, h = 1.15, box = true) {
    B(w + .24, h + .24, .12, TRIM, x, y, .16, p);
    B(w, h, .08, 0x8ec8e8, x, y, .22, p);
    B(.05, h, .06, TRIM, x, y, .26, p); B(w, .05, .06, TRIM, x, y, .26, p);
    B(w + .4, .1, .3, PLINTH, x, y - h / 2 - .17, .26, p);
    for (const s of [-1, 1]) { const sh = B(w / 2 - .02, h, .06, SHUT, x + s * (w / 2 + w / 4 + .14), y, .28, p); sh.rotation.y = -s * .35; B(w / 2 - .12, .05, .07, 0x3a6a72, x + s * (w / 2 + w / 4 + .14), y + h * .12, .3, p).rotation.y = -s * .35; }
    if (box) {
      B(w + .1, .2, .26, WOODD, x, y - h / 2 - .36, .32, p);
      for (let i = -2; i <= 2; i++) S(.11, [0xe05a7a, 0xf6e0e8, 0xe8c040, 0xe05a7a, 0xf6e0e8][i + 2], x + i * w / 5, y - h / 2 - .2, .32, p);
    }
  }

  /** Parede de enxaimel voltada para +z do grupo (largura W, altura H): reboco, embasamento de pedra, madeiramento e escoras */
  function wall(p, W, H, braces = true) {
    B(W, H, .3, PLASTER, 0, H / 2, 0, p);
    B(W + .1, .55, .38, PLINTH, 0, .275, 0, p);
    for (let i = 0; i < 8; i++) B(W / 8 - .04, .5, .4, i & 1 ? PLINTH2 : PLINTH, -W / 2 + W / 16 + i * W / 8, .27, 0, p);
    B(W + .1, .22, .36, TIMBER, 0, H - .1, 0, p);
    B(W, .14, .34, TIMBER, 0, H * .58, 0, p);
    const n = Math.max(2, Math.round(W / 1.6));
    for (let i = 0; i <= n; i++) B(.18, H - .5, .34, TIMBER, -W / 2 + i * W / n, .55 + (H - .5) / 2, 0, p);
    if (braces) for (const s of [-1, 1]) {
      const q = B(.12, 1.0, .33, TIMBER, s * (W / 2 - .55), H * .58 + .5, 0, p); q.rotation.z = -s * .6;
    }
  }

  /** Porta de tábuas com arco, ferragens, soleira e lampião */
  function door(p, x, w = 1.0, h = 2.0) {
    B(w + .4, h + .3, .16, TRIM, x, h / 2 + .15, .16, p);
    B(w, h, .1, DOOR, x, h / 2, .22, p);
    for (let i = -2; i <= 2; i++) B(.03, h - .1, .12, 0x553a20, x + i * w / 5, h / 2, .24, p);
    B(w, .09, .13, IRON, x, h * .78, .26, p); B(w, .09, .13, IRON, x, h * .22, .26, p);
    C(.06, .06, .08, 0xc8a040, x + w * .32, h * .5, .3, p).rotation.x = Math.PI / 2;
    B(w + .7, .22, .8, PLINTH, x, .11, .6, p); B(w + .3, .2, .5, PLINTH2, x, .31, .45, p);          // degraus
    B(.06, .5, .06, IRON, x - w / 2 - .35, h + .05, .3, p); B(.28, .34, .28, 0xf0c040, x - w / 2 - .35, h - .3, .4, p, 0x7a5a10);
  }

  // ═════════════ CASA (centro em -8,-12; 6,4 × 5,0 m; porta voltada para o pátio em x=-7,2) ═════════════
  {
    const HX = -8, HZ = -12, W = 6.4, D = 6.0, h = G(HX, 0, HZ);   // casa: farm-aves-house.js (interior mobiliado)
    // pérgula contínua de rosas cobrindo toda a estrada (cerca dos cercados -> lavoura), do portão até o fim dos cercados; vãos de pilar nos portões dos cercados
    const AX = .6, AH = 3.1, Z0 = -2.2, Z1 = 11.4, ZM = (Z0 + Z1) / 2, ZL = Z1 - Z0 + .6;
    const inGate = z => (z > -1.2 && z < 2.2) || (z > 5.6 && z < 9);
    for (const sx of [-1, 1]) {
      B(.16, .16, ZL, TRIM, AX + sx * AH, 2.7, ZM, g); B(.12, .12, ZL, TRIM, AX + sx * (AH - 1.2), 2.82, ZM, g);
      for (let z = Z0; z <= Z1 + .01; z += 1.4) if (!inGate(z)) { B(.16, 2.7, .16, TRIM, AX + sx * AH, 1.35, z, g); S(.34, GREEN2, AX + sx * AH, 1.3, z, g, 1, 2.2, 1); }   // sebe da cerca: atravessável
    }
    B(.14, .14, ZL, TRIM, AX, 2.95, ZM, g);
    for (let z = Z0 - .2; z <= Z1 + .3; z += .7) {
      B(AH * 2 + .4, .1, .1, TRIM, AX, 2.7, z, g);
      for (let k = 0; k < 7; k++) { const q = S(.17 + (k % 2) * .05, k % 3 ? GREEN2 : 0x4a8a3a, AX - AH + .4 + k * (AH * 2 - .8) / 6, 2.78 + (k % 2) * .08, z + (k % 2) * .15, g, 1.1, .6, 1.1); }
      for (let k = 0; k < 3; k++) S(.12, [0xe05a7a, 0xf4a0b8, 0xf6e0e8][(k + Math.round(z * 3)) % 3], AX - 1.8 + ((((Math.round(z * 10) + k * 7) % 5) + 5) % 5) * .9, 2.9, z + (k - 1) * .2, g);
    }
    // canteiros de rosas nos cantos da frente e barris de chuva
    for (const sx of [-1, 1]) { const bx0 = HX + sx * (W / 2 + .6); B(1.2, .3, .7, 0x5a3a24, bx0, .15, HZ + D / 2 + 1.2); for (let i = -2; i <= 2; i++) S(.18, [0xe05a7a, 0xf6e0e8, 0xe8c040][(i + 2) % 3], bx0 + i * .22, .45, HZ + D / 2 + 1.2); }
    C(.45, .4, .9, 0x7a5430, HX + 6, .45, HZ - .6); C(.47, .47, .07, 0x3a3a3a, HX + 6, .3, HZ - .6); C(.47, .47, .07, 0x3a3a3a, HX + 6, .7, HZ - .6); solid(HX + 6, HZ - .6, .55);
  }

  // ═════════════ POMBAL (torre de pombos, 10,6 / -12,6) ═════════════
  {
    const dv = G(11.6, 0, -12.6); dv.scale.setScalar(1.3);   // torre no porte da casa
    B(3, .5, 3, PLINTH2, 0, -.25, 0, dv);
    for (let i = 0; i < 4; i++) { const f = G(0, 0, 0, i * Math.PI / 2, dv); const q = G(0, 0, 1.2, 0, f); B(2.4, 2.4, .3, PLASTER, 0, 1.2, 0, q); B(2.5, .5, .36, PLINTH, 0, .25, 0, q); B(.16, 2.1, .34, TIMBER, -1.2, 1.55, 0, q); B(.16, 2.1, .34, TIMBER, 1.2, 1.55, 0, q); B(2.5, .18, .36, TIMBER, 0, 2.4, 0, q); }
    B(2.9, 2.0, 2.9, PLASTER, 0, 3.4, 0, dv); B(3.1, .16, 3.1, TIMBER, 0, 2.5, 0, dv); B(3.1, .16, 3.1, TIMBER, 0, 4.4, 0, dv);
    for (let i = 0; i < 4; i++) { const f = G(0, 0, 0, i * Math.PI / 2, dv); const q = G(0, 0, 1.46, 0, f); for (const [hx, hy] of [[-.8, 3.1], [0, 3.1], [.8, 3.1], [-.4, 3.8], [.4, 3.8]]) { B(.34, .36, .06, 0x2a1a10, hx, hy, 0, q); B(.5, .07, .2, TRIM, hx, hy - .22, .08, q); } }
    const rf = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.9, 4), M(ROOF)); rf.rotation.y = Math.PI / 4; rf.position.set(0, 5.4, 0); dv.add(rf);
    const rf2 = new THREE.Mesh(new THREE.ConeGeometry(.7, .8, 4), M(ROOF2)); rf2.rotation.y = Math.PI / 4; rf2.position.set(0, 6.6, 0); dv.add(rf2);
    B(.06, 1.1, .06, IRON, 0, 7.3, 0, dv); B(.6, .1, .05, IRON, 0, 7.6, 0, dv); S(.11, 0xc82a1a, .3, 7.7, 0, dv, 1.2, 1, .5);
    solid(11.6, -12.6, 2.8);
    for (const [px, pz] of [[9.2, -9.8], [9.9, -9.5]]) { S(.14, 0xe8e4dc, px, .2, pz, g, 1.2, 1, 1); }       // dois pombos no chão
  }

  // ═════════════ BARRACA DE COLHEITA (7,-12): aberta na frente, onde a fazendeira deixa os cestos (ponto 8,-8,4) ═════════════
  {
    const sh = G(5.0, 0, -12.2); sh.scale.setScalar(1.5);   // mesmo porte da casa
    B(4.6, .2, 3.0, PLINTH2, 0, .08, 0, sh);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.2, 2.6, .2, WOODD, sx * 2.1, 1.4, sz * 1.3, sh);
    B(4.6, .3, .2, TIMBER, 0, 2.7, 1.3, sh); B(4.6, .3, .2, TIMBER, 0, 2.7, -1.3, sh);
    B(4.4, 2.4, .12, PLASTER, 0, 1.4, -1.4, sh);
    gable(sh, 4.6, 3.0, 2.8, 1.1, .5, ROOF, ROOF2, PLASTER2);
    for (const [bx0, col] of [[-1.5, 0xe8862a], [-.5, 0x6ab04a], [.5, 0xb83a3a], [1.5, 0xd8b848]]) {      // caixotes e cestos de colheita
      B(.8, .5, .7, WOODL, bx0, .55, -.6, sh); B(.84, .06, .74, WOODD, bx0, .82, -.6, sh);
      for (let i = -1; i <= 1; i++) S(.15, col, bx0 + i * .22, .92, -.6 + (i & 1) * .1, sh);
    }
    B(4.0, .1, .3, WOODD, 0, 2.15, -1.2, sh);
    for (let i = 0; i < 9; i++) B(.1, .5 + (i % 3) * .12, .06, [0x6a8a3a, 0xc83a2a, 0xd8b848][i % 3], -1.7 + i * .42, 1.85, -1.2, sh);   // ervas e pimentas penduradas
    B(1.4, .5, .7, WOODL, 1.2, .3, .4, sh); for (let i = 0; i < 4; i++) S(.18, STRAW, .8 + i * .25, .65, .4, sh, 1, .8, 1);
    solid(5.0, -12.2, 3.3);
  }

  // ═════════════ POÇO ornamentado (0,-11) ═════════════
  {
    const w = G(0, 0, -11);
    C(1.05, 1.15, .9, PLINTH, 0, .45, 0, w, 14); C(.8, .8, .06, 0x2a6aa0, 0, .88, 0, w, 14);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B(.5, .22, .3, i & 1 ? PLINTH2 : PLINTH, Math.cos(a) * 1.08, .98, Math.sin(a) * 1.08, w).rotation.y = -a; }
    for (const sx of [-1, 1]) B(.16, 2.2, .16, WOODD, sx * .95, 1.6, 0, w);
    B(.1, .1, 1.9, WOODD, 0, 2.3, 0, w); C(.07, .07, .5, 0x4a3a2a, 0, 2.3, .85, w).rotation.z = Math.PI / 2;
    B(.03, .5, .03, 0xc8b898, 0, 1.9, 0, w); C(.2, .17, .26, WOODD, 0, 1.55, 0, w);
    gable(w, 2.3, 1.7, 2.45, .65, .25, ROOF, ROOF2, PLASTER2);
    solid(0, -11, 1.25);
  }

  // ═════════════ GALINHEIRO sobre palafitas (cercado das galinhas, encostado na cerca dos fundos: mundo x -12,4) ═════════════
  {
    const hx = -12.4, hz = -1.1, hc = G(hx, 0, hz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B(.26, .3, .26, PLINTH, sx * 1.0, .15, sz * .62, hc); B(.16, .6, .16, WOODD, sx * 1.0, .6, sz * .62, hc); }
    B(2.6, .14, 1.8, TIMBER, 0, .95, 0, hc); B(2.4, .06, 1.6, WOODL, 0, 1.03, 0, hc);                  // piso
    B(2.4, 1.15, 1.6, 0xd8a890, 0, 1.65, 0, hc);                                                        // corpo de reboco rosado
    for (const sx of [-1.2, 1.2]) B(.12, 1.2, 1.7, TIMBER, sx, 1.65, 0, hc);                           // enxaimel
    for (const sz of [-.8, .8]) { B(2.5, .1, .12, TIMBER, 0, 2.2, sz, hc); B(2.5, .1, .12, TIMBER, 0, 1.1, sz, hc); }
    for (let i = -2; i <= 2; i++) B(.08, 1.1, .1, TIMBER, i * .5, 1.65, .83, hc);
    B(.5, .62, .08, 0x2a1a10, -.55, 1.55, .83, hc); B(.66, .1, .12, TRIM, -.55, 1.92, .86, hc); B(.06, .62, .12, TRIM, -.84, 1.55, .86, hc); B(.06, .62, .12, TRIM, -.26, 1.55, .86, hc);   // porta
    B(.4, .36, .08, 0x9ac4d0, .5, 1.8, .83, hc); B(.5, .06, .12, TRIM, .5, 2.0, .86, hc); B(.5, .06, .14, WOODD, .5, 1.6, .88, hc);   // janelinha
    for (const sx of [.2, .8]) B(.16, .36, .06, 0x4d8088, sx, 1.8, .88, hc);
    gable(hc, 2.4, 1.6, 2.22, .62, .3, ROOF, ROOF2, 0xd8a890);
    // rampa reta, com tábuas, guias laterais e degraus
    const rp = G(-.55, .5, 1.55, 0, hc); rp.rotation.x = .5;
    B(.55, .06, 1.9, WOODL, 0, 0, 0, rp); for (const sx of [-1, 1]) B(.06, .12, 1.9, WOODD, sx * .3, .06, 0, rp);
    for (let k = -4; k <= 4; k++) B(.5, .05, .06, WOODD, 0, .05, k * .21, rp);
    B(.5, .06, .3, WOODL, -.55, .98, .98, hc);                                                           // soleira da porta
    // caixa de ovos na lateral leste (do lado oposto à rampa), com tampa e lastro de palha
    B(.8, .6, .64, WOODL, 1.6, 1.25, 0, hc); B(.86, .08, .7, WOODD, 1.6, 1.0, 0, hc); B(.9, .07, .76, ROOF2, 1.6, 1.62, 0, hc).rotation.z = -.22;
    B(.5, .34, .06, 0x2a1a10, 1.6, 1.22, .35, hc); for (const px of [-.1, .1]) S(.08, TRIM, 1.6 + px, 1.1, .34, hc, 1, 1.2, .8);
    B(.4, .12, .24, STRAW, 1.6, .95, .5, hc);                                                            // cesto de coleta de ovos
    B(1.3, .07, .1, WOODD, 0, 1.38, -.4, hc);                                                            // poleiro
    B(.06, .5, .06, IRON, -1.15, 2.1, .9, hc); B(.2, .22, .2, 0xf0c040, -1.15, 1.9, .9, hc, 0x7a5a10);     // lampião
    solid(hx, hz, 1.45);
  }

  // ═════════════ LAGOA DOS PATOS com cais, juncos, casinha e poleiro do pavão (cercado B: x -14…-3,4, z 4,4…10,2; a fazendeira passa por z≈7,3) ═════════════
  {
    const pd = G(-10.2, 0, 5.7);
    for (const [rx, rz, px, pz] of [[2.2, 1.0, 0, 0], [1.2, .8, 1.6, .3], [1.0, .7, -1.8, .1]]) { const w = C(1, 1, .06, 0x3f86bc, px, .045, pz, pd, 20); w.scale.set(rx, 1, rz); const e = C(1, 1, .1, 0x7a6a48, px, .02, pz, pd, 20); e.scale.set(rx + .22, 1, rz + .22); }
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; B(.34, .2, .26, i % 3 ? PLINTH : PLINTH2, Math.cos(a) * 2.6, .1, Math.sin(a) * 1.2, pd).rotation.y = -a; }
    for (const [px, pz] of [[-1.2, .3], [.7, -.4], [1.5, .5]]) { C(.3, .3, .02, 0x4a9a3a, px, .1, pz, pd, 8); S(.08, 0xf4b0c8, px + .05, .14, pz, pd); }
    for (let i = 0; i < 7; i++) { const a = 3.3 + i * .22, rx = Math.cos(a) * 2.5, rz = Math.sin(a) * 1.1, hh = 1.0 + (i % 3) * .2; B(.05, hh, .05, 0x6a8a3a, rx, hh / 2, rz, pd); B(.09, .3, .09, 0x6a4a2a, rx, hh + .1, rz, pd); }
    // casa dos patos: palafita baixa de reboco com enxaimel, porta redonda e rampa reta para a água (mundo -12,2 / 8,6, de frente para a lagoa)
    const dh = G(-12.2, 0, 8.7, Math.atan2(2.0, -3.0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B(.22, .26, .22, PLINTH, sx * .85, .13, sz * .6, dh); B(.14, .3, .14, WOODD, sx * .85, .4, sz * .6, dh); }
    B(2.1, .12, 1.5, TIMBER, 0, .62, 0, dh); B(1.96, .05, 1.36, WOODL, 0, .68, 0, dh);
    B(1.9, 1.0, 1.3, 0xd8a890, 0, 1.2, 0, dh);
    for (const sx of [-.95, .95]) B(.1, 1.05, 1.36, TIMBER, sx, 1.2, 0, dh);
    for (const sz of [-.66, .66]) { B(1.95, .08, .1, TIMBER, 0, 1.68, sz, dh); B(1.95, .08, .1, TIMBER, 0, .76, sz, dh); }
    B(.5, .62, .08, 0x2a1a10, -.35, 1.1, .67, dh); C(.25, .25, .08, 0x2a1a10, -.35, 1.4, .67, dh, 12).rotation.x = Math.PI / 2;   // porta redonda
    B(.7, .08, .12, TRIM, -.35, .78, .7, dh); B(.06, .62, .12, TRIM, -.7, 1.1, .7, dh); B(.06, .62, .12, TRIM, 0, 1.1, .7, dh);
    B(.36, .3, .06, 0x9ac4d0, .5, 1.3, .67, dh); B(.46, .06, .1, TRIM, .5, 1.47, .7, dh); B(.46, .06, .12, WOODD, .5, 1.12, .72, dh);
    gable(dh, 1.9, 1.3, 1.7, .55, .25, ROOF, ROOF2, 0xd8a890);
    const dr = G(-.35, .36, 1.38, 0, dh); dr.rotation.x = .38;                                      // rampa reta (desce para a frente)
    B(.48, .05, 1.25, WOODL, 0, 0, 0, dr); for (let k = -2; k <= 2; k++) B(.42, .04, .05, WOODD, 0, .04, k * .24, dr);
    B(.5, .05, .22, 0x3f86bc, .5, .72, .78, dh);                                                      // faixa azul sob a janela (tema da água)
    B(.5, .14, .36, STRAW, .7, .76, 1.0, dh);                                                         // palha na entrada
    solid(-12.2, 8.7, 1.1);
    const pc = G(-5.2, 0, 9.3);                                                                 // poleiro do pavão
    B(.12, 2.0, .12, WOODD, 0, 1.0, 0, pc); B(1.2, .1, .12, WOODD, 0, 1.8, 0, pc); B(.8, .08, .1, WOODD, 0, 1.3, 0, pc); B(.5, .12, .5, PLINTH, 0, .06, 0, pc); B(.1, .1, .5, WOODD, .28, 1.5, 0, pc);
  }

  // ═════════════ CEREJEIRAS EM FLOR ═════════════
  for (const [tx, tz, sc] of [[-14.2, -7.4, 1], [14.2, -8.6, .9], [14, -3.2, .8]]) {
    const t = G(tx, 0, tz); B(.45 * sc, 2.4 * sc, .45 * sc, 0x6a4a34, 0, 1.2 * sc, 0, t); B(.14 * sc, 1.1 * sc, .14 * sc, 0x6a4a34, .4 * sc, 2.2 * sc, 0, t).rotation.z = -.6; B(.14 * sc, 1.0 * sc, .14 * sc, 0x6a4a34, -.35 * sc, 2.3 * sc, .1, t).rotation.z = .5;
    S(1.5 * sc, PINK, 0, 3.2 * sc, 0, t, 1, .85, 1); S(1.05 * sc, PINK2, .9 * sc, 3.0 * sc, .4 * sc, t); S(1.0 * sc, PINK, -.9 * sc, 3.3 * sc, -.3 * sc, t); S(.8 * sc, PINK2, .1, 3.9 * sc, .1, t);
    for (let i = 0; i < 6; i++) S(.07, PINK2, Math.cos(i * 1.7) * (.6 + i * .12) * sc + 0, .04, Math.sin(i * 1.7) * (.6 + i * .12) * sc, t);      // pétalas no chão
    solid(tx, tz, .55);
  }

  // ═════════════ PORTÃO DE PEDRA com placa pendurada, lampiões e mourões (z=12,5) ═════════════
  {
    const GX = .6, gt = G(GX, 0, 12.5);     // portão no eixo do corredor (cerca dos cercados ↔ lavoura), sob a pérgula
    for (const sx of [-1, 1]) {
      B(.9, 3.0, .9, PLINTH, sx * 3.1, 1.5, 0, gt); B(1.1, .24, 1.1, PLINTH2, sx * 3.1, 3.1, 0, gt); B(.7, .2, .7, PLINTH, sx * 3.1, 3.3, 0, gt); S(.28, PLINTH2, sx * 3.1, 3.65, 0, gt);
      B(1.0, .3, 1.0, PLINTH2, sx * 3.1, .15, 0, gt);
      B(.06, .5, .06, IRON, sx * 3.1 - sx * .62, 2.5, .3, gt); B(.26, .32, .26, 0xf0c040, sx * 3.1 - sx * .62, 2.15, .3, gt, 0x7a5a10);
      // folha do portão: gonzo no pilar, aberta para dentro da propriedade (~63°)
      const lp = G(sx * 2.65, 0, 0, -sx * 1.1, gt);
      B(2.4, 1.9, .08, DOOR, -sx * 1.25, 1.15, 0, lp); B(2.5, .12, .12, IRON, -sx * 1.25, 1.85, 0, lp); B(2.5, .12, .12, IRON, -sx * 1.25, .55, 0, lp);
      const br = B(2.9, .1, .1, WOODD, -sx * 1.25, 1.15, .06, lp); br.rotation.z = sx * .62;
      for (let k = 0; k < 5; k++) B(.05, 1.9, .1, 0x553a20, -sx * (.25 + k * .5), 1.15, .02, lp);
      B(.14, .3, .14, IRON, -sx * .06, 1.85, 0, lp); B(.14, .3, .14, IRON, -sx * .06, .55, 0, lp);
      solid(GX + sx * 3.1, 12.5, .6);
    }
    B(6.0, .24, .3, TIMBER, 0, 3.2, 0, gt);
    B(.04, .8, .04, IRON, -1.2, 2.8, .1, gt); B(.04, .8, .04, IRON, 1.2, 2.8, .1, gt);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const cx = cv.getContext('2d'); cx.fillStyle = '#f0e2c4'; cx.fillRect(0, 0, 512, 128); cx.strokeStyle = '#8c3a22'; cx.lineWidth = 8; cx.strokeRect(6, 6, 500, 116);
    cx.fillStyle = '#8c3a22'; cx.font = 'bold 54px Georgia, serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('SÍTIO DAS AVES', 256, 54); cx.font = '30px Georgia, serif'; cx.fillText('Fundado em 1724', 256, 100);
    const tex = new THREE.CanvasTexture(cv);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(2.7, .7, .08), [M(TIMBER), M(TIMBER), M(TIMBER), M(TIMBER), new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
    sn.position.set(0, 2.65, .05); sn.userData.dyn = 1; gt.add(sn);
  }

  // ═════════════ MURO DE PEDRA DA FRENTE: do portão até as sebes das laterais ═════════════
  for (const [xa, xb] of [[-3.1, -14.9], [4.3, 14.9]]) {
    const n = Math.max(1, Math.round(Math.abs(xb - xa) / 1.8)), st = (xb - xa) / n;
    for (let i = 0; i <= n; i++) {
      const x = xa + st * i;
      B(Math.abs(st) + .06, .9, .5, (i & 1) ? PLINTH : PLINTH2, x, .45, 12.5); B(Math.abs(st) + .1, .12, .62, PLINTH2, x, .96, 12.5);
      if (i % 2 === 0) solid(x, 12.5, 1.0);
    }
  }

  // ═════════════ MURETAS, SEBES, CARRINHO, VARAL, FEIXES ═════════════
  for (let x = -14.4; x <= 14.5; x += 1.8) {                                                    // muro baixo de pedra ao fundo
    B(1.7, .8, .5, (Math.round(x * 3) & 1) ? PLINTH : PLINTH2, x, .4, -16.7); B(1.74, .12, .6, PLINTH2, x, .86, -16.7); if ((Math.round(x / 1.8)) % 2 === 0) solid(x, -16.7, 1.0);
  }
  for (const sx of [-1, 1]) for (let z = -14; z <= 12.2; z += 1.5) { S(.62, (Math.round(z * 2) & 1) ? GREEN : GREEN2, sx * 14.9, .55, z, g, 1.1, .9, 1.4); }   // sebes laterais: atravessáveis
  {
    const ct = G(-2.6, 0, -13.2, .5);                                                           // carrinho de ovos
    B(1.7, .12, 1, WOODL, 0, .7, 0, ct); for (const sz of [-1, 1]) B(1.7, .4, .08, WOODD, 0, .9, sz * .5, ct); B(.08, .4, 1, WOODD, .85, .9, 0, ct);
    for (const sz of [-1, 1]) { const wl = C(.42, .42, .08, WOODD, 0, .42, sz * .58, ct, 12); wl.rotation.x = Math.PI / 2; C(.08, .08, .12, IRON, 0, .42, sz * .58, ct).rotation.x = Math.PI / 2; }
    B(1.2, .06, .08, WOODD, -1.4, .55, 0, ct).rotation.z = .2;
    for (let i = 0; i < 6; i++) S(.13, i % 2 ? TRIM : 0xe8d8b8, -.5 + (i % 3) * .35, .88, -.2 + Math.floor(i / 3) * .4, ct, 1, 1.2, 1);
    solid(-2.6, -13.2, 1.0);
    const vr = G(.4, 0, -14.6);                                                                 // varal com lençóis
    for (const sx of [-1, 1]) B(.12, 2.2, .12, WOODD, sx * 3, 1.1, 0, vr);
    B(6.0, .03, .03, 0xc8b898, 0, 2.05, 0, vr);
    for (const [x0, col] of [[-2, TRIM], [-.6, 0xe8d8b8], [.9, 0xd8e4f0], [2.2, TRIM]]) { const sh = B(1.0, 1.3, .03, col, x0, 1.4, 0, vr); sh.rotation.z = Math.sin(x0 * 3) * .05; }
    solid(-2.6, -14.6, .3); solid(3.4, -14.6, .3);
  }
  for (const [x, z, ry] of [[13.4, -5.6, .2], [12.3, -4.5, -.3]]) {                              // fardos de feno no canto leste do pátio
    B(1.1, .8, .8, STRAW, x, .4, z).rotation.y = ry; B(1.12, .06, .82, 0xa88830, x, .3, z).rotation.y = ry; B(1.12, .06, .82, 0xa88830, x, .6, z).rotation.y = ry; solid(x, z, .7);
  }
  // banco do almoço (3,2 / -10,1) com almofada
  B(1.9, .12, .5, WOODL, -3.2, .5, -10.1); for (const sx of [-1, 1]) B(.12, .5, .4, WOODD, -3.2 + sx * .7, .25, -10.1); B(1.9, .5, .1, WOODL, -3.2, .85, -10.4); B(.8, .1, .4, 0xc84a5a, -3.4, .6, -10.1); solid(-3.2, -10.1, 1);
  // lampiões do pátio
  for (const sx of [-1, 1]) { const lx = sx * 13.8; B(.14, 2.6, .14, 0x3a2a1a, lx, 1.3, -8.9); B(.5, .12, .5, 0x3a2a1a, lx, 2.65, -8.9); B(.34, .4, .34, 0xf0c040, lx, 2.9, -8.9, g, 0x7a5a10); B(.5, .1, .5, 0x3a2a1a, lx, 3.14, -8.9); solid(lx, -8.9, .3); }
  // lenha e ferramentas encostadas ao muro
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) { const m = C(.16, .16, 1.6, 0x8a5a30, -13.2, .18 + i * .3, -14.6 + (k - (2 - i) / 2) * .3, g, 7); m.rotation.z = Math.PI / 2; }
  solid(-13.2, -14.6, 1);
}
