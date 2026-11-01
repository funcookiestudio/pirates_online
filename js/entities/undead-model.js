/* Modelos dos mortos-vivos e bandidos das ilhas de ruínas (protótipos "zumbis", "Vampiros" e "Múmia" do Bison, portados para o jogo).
   Todos partem do corpo de blocos de human.js (buildHuman / buildSkeleton) e ganham peças extras por cima:
     · Zumbi: pele podre (3 tons), olho leitoso e olho brilhante, costelas à mostra, mão decepada, garras, farrapos e moscas
     · Vampiro: 3 casas (carmesim, roxo real, azul-noite), presas, olhos vermelhos, gola alta, jabot/vestido, capa articulada; o Conde também tem coroa e morcegos
     · Múmia: 3 tipos de bandagem, 4 cores de olho, tiras soltas; o Faraó tem máscara e nemes de ouro, colar usekh e cajado
     · Bandido do Deserto: turbante, véu, colete, faixa e cimitarra · Caveira: esqueleto do deserto com faixa de ouro e olhos verdes
   Cada modelo sai de makeUndead(t) e traz g.userData.fx(e, dt, mv): anima farrapos, capa, moscas e morcegos (depois da marcha, em enemies.js).
   Depois de adicionar as peças as juntas são fundidas de novo (refuse), mantendo as poucas chamadas de desenho por inimigo. */
import { buildHuman, buildSkeleton, hideSword, K } from './human.js';

const GOLD = 0xe0b84a, WHITE = 0xf4f0e6;
const mx = Math.max, mn = Math.min, pick = a => a[(Math.random() * a.length) | 0];

function bb(w, h, d, b, col) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col }));
}

/** Funde (de novo) as malhas diretas de cada grupo; entende malhas já fundidas (cor por vértice) e as de `keep` ficam soltas */
function refuse(root, keep) {
  root.traverse(grp => {
    if (!grp.isGroup) return;
    const ms = grp.children.filter(c => c.isMesh && !keep.has(c) && !c.userData.sword);
    if (ms.length < 2) return;
    const pos = [], nor = [], col = [];
    ms.forEach(m => {
      m.updateMatrix();
      const geo = m.geometry.clone().applyMatrix4(m.matrix), n = geo.attributes.position.count, c = m.material.color, ca = geo.attributes.color;
      pos.push(...geo.attributes.position.array); nor.push(...geo.attributes.normal.array);
      for (let i = 0; i < n; i++) { if (ca) col.push(ca.getX(i), ca.getY(i), ca.getZ(i)); else col.push(c.r, c.g, c.b); }
      geo.dispose(); grp.remove(m); m.geometry.dispose(); m.material.dispose();
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    bg.parameters = {};
    grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true })));
  });
}

/** Contexto de construção: peças (wr), tiras soltas (strip) e brilhos */
function ctx() {
  const C = { loose: [], flies: [], capes: [], bats: [], keep: new Set() };
  C.wr = (g, w, h, d, x, y, z, c, rz, rx) => { const m = bb(w * K, h * K, d * K, mn(.03, w * .3, h * .3, d * .3) * K, c); m.position.set(x * K, y * K, z * K); if (rz) m.rotation.z = rz; if (rx) m.rotation.x = rx; g.add(m); return m; };
  C.strip = (g, x, y, z, len, c, bx, w) => {
    const p = new THREE.Group(); p.position.set(x * K, y * K, z * K); g.add(p);
    const m = bb((w || .09) * K, len * K, .03 * K, .01 * K, c); m.position.y = -len * K / 2; p.add(m);
    C.loose.push({ g: p, bx: bx || 0, ph: Math.random() * 6 }); return p;
  };
  C.glow = (m, col) => { m.material = new THREE.MeshBasicMaterial({ color: col }); C.keep.add(m); return m; };
  return C;
}

/* ---------------- Zumbi ---------------- */
const SKS = [[0x86a06a, 0x5a7048], [0x9ea39a, 0x6a6e66], [0x7c9aa8, 0x546c78]];
const BONE = 0xe6e0cc, BLOOD = 0x5a1818, TEETH = 0xd8d0b0;
function zombie() {
  const C = ctx(), { wr, strip } = C, [SK, SH] = pick(SKS), F = Math.random() < .5;
  const CL = F ? 0xb8b09a : 0x6a6a58, CL2 = F ? 0x8a826c : 0x4a4a3e, HAIR = F ? 0x2e2a24 : 0x3a3228;
  const d = F ? { b: CL, fi: 0x9a9280, belt: 0x6a4a3a, sk: CL, hem: 0x7a725a, bare: 1, sh: 0x3a2e28, skin: SK, hair: HAIR }
    : { t: CL, belt: 0x4a3322, pa: CL2, st: CL2, bare: 0, sh: 0x2a2420, skin: SK, hair: HAIR };
  const m = buildHuman(F, d), hd = m.head, ez = F ? .53 : .55, ey = F ? .56 : .58, ex = F ? .27 : .28, zf = F ? .54 : .56;
  m.eyeR.material = new THREE.MeshBasicMaterial({ color: 0xc8ff70 }); m.eyeL.material = new THREE.MeshBasicMaterial({ color: 0xe8e8d8 });
  [-1, 1].forEach(s => wr(hd, .3, .34, .05, s * ex, ey, ez - .015, 0x20281c));
  wr(hd, .4, .18, .06, 0, .25, zf + .01, 0x2a1010);
  [-.14, -.07, 0, .07, .14].forEach((x, i) => { wr(hd, .05, .07, .04, x, .3, zf + .04, TEETH); if (i !== 2) wr(hd, .05, .06, .04, x, .2, zf + .04, TEETH); });
  wr(hd, .14, .14, .06, 0, .42, zf + .06, 0x1a1410);
  wr(hd, .24, .26, .06, .36, .2, .53, BLOOD); wr(hd, .14, .14, .05, .36, .2, .565, TEETH);
  [[-.3, .9], [.34, .78]].forEach(p => wr(hd, .22, .16, .05, p[0], p[1], .53, SH));
  wr(hd, .26, .16, .1, .3, 0, .3, BLOOD); strip(hd, .3, -.05, .36, .45, BLOOD, 0, .05);
  if (F) {   // cabelo falhado, com couro cabeludo à mostra
    wr(hd, 1.24, .4, .66, 0, .98, -.3, HAIR); [[-.35, 1.08, .25], [.25, 1.1, .3]].forEach(p => wr(hd, .24, .12, .3, p[0], p[1], p[2], HAIR));
    [-.5, -.25, 0, .25, .5].forEach((x, i) => strip(hd, x, .85, -.66, [1.1, 1.5, 1.7, 1.4, 1.0][i], HAIR, .08, .22));
    [-1, 1].forEach(s => strip(hd, s * .64, .55, .42, .7, HAIR, 0, .14));
  } else {
    [[-.4, 1.08, .2], [.3, 1.1, -.2], [0, 1.1, -.45]].forEach(p => wr(hd, .24, .12, .26, p[0], p[1], p[2], HAIR));
    wr(hd, .4, .04, .4, .1, 1.07, .1, BLOOD); wr(hd, .24, .04, .24, .1, 1.09, .1, BONE);
  }
  if (F) {   // costelas à mostra e roupa rasgada
    wr(m.up, .5, .5, .05, .18, .55, .4, BLOOD); [.4, .5, .6, .7].forEach(y => wr(m.up, .42, .045, .07, .18, y, .43, BONE));
    wr(m, 1.46, .4, 1.08, 0, .66, 0, CL);
    [-.6, -.3, 0, .3, .6].forEach((x, i) => { strip(m, x, .47, .56, .3 + .12 * (i % 2), CL, .05, .22); strip(m, x, .47, -.56, .34, CL2, -.05, .22); });
  } else {
    wr(m.up, .7, .62, .05, .12, .6, .45, BLOOD); [.4, .52, .64, .76].forEach(y => wr(m.up, .6, .05, .08, .12, y, .48, BONE));
    [-.45, -.15, .15, .45].forEach((x, i) => strip(m.up, x, .05, .47, .4 + .15 * (i % 2), CL, .05, .2));
  }
  [m.arm, m.armL].forEach(a => {   // mangas rasgadas
    wr(a, F ? .46 : .5, .2, F ? .5 : .54, 0, -.02, 0, CL); wr(a, F ? .46 : .5, .14, F ? .5 : .54, 0, -.3, 0, SH);
    strip(a, .2, -.1, .1, .35, CL, .05, .14); strip(a, -.2, -.1, -.1, .28, CL, .05, .12);
  });
  const hb = F ? -.46 : -.52;   // mão decepada num braço, garras quebradas no outro
  wr(m.arm.fa, F ? .38 : .42, F ? .3 : .34, F ? .42 : .46, 0, hb, 0, BLOOD); wr(m.arm.fa, .12, .22, .12, 0, hb - .18, 0, BONE);
  wr(m.armL.fa, .12, .34, .12, F ? .18 : .22, -.14, 0, BONE); wr(m.armL.fa, .16, .18, .2, F ? .16 : .2, -.14, 0, BLOOD);
  [-.12, -.04, .04, .12].forEach(x => wr(m.armL.fa, .05, .14, .05, x, (F ? -.61 : -.67) - .05, .12, 0xb8aa70));
  wr(m.legL.knee, F ? .44 : .48, .38, F ? .5 : .52, 0, -.2, 0, SK); wr(m.legL.knee, .3, .16, .06, 0, -.1, F ? .25 : .27, BLOOD); wr(m.legL.knee, .1, .3, .1, 0, -.2, F ? .28 : .3, BONE);
  wr(m.legR.knee, F ? .44 : .5, .12, F ? .5 : .54, 0, -.3, 0, SH); if (!F) strip(m.legR.knee, .15, -.38, .2, .3, CL2, .05, .18);
  C.keep.add(m.eyeL); C.keep.add(m.eyeR); refuse(m, C.keep);
  for (let i = 0; i < 3; i++) {   // moscas ao redor da cabeça (soltas, para poderem girar)
    const f = new THREE.Mesh(new THREE.BoxGeometry(.05 * K * 1.4, .05 * K * 1.4, .05 * K * 1.4), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); hd.add(f); C.flies.push({ m: f, ph: i * 2.1 });
  }
  m.userData.fx = (e, dt, mv, t) => {
    const ag = e.ag && e.st !== 'stag' ? 1 : 0, ph = e.ph;
    // anda arrastando a perna esquerda, braços esticados à frente quando vê o jogador
    m.legL.rotation.x *= .5; m.legL.knee.rotation.x *= .4; m.legL.foot.rotation.x += .5 * mv;
    m.armL.rotation.x = lp(m.armL.rotation.x, -1.25, ag * .85); m.arm.rotation.x = lp(m.arm.rotation.x, e.st === 'wind' || e.st === 'rec' ? m.arm.rotation.x : -.9, ag * .6);
    m.armL.fa.rotation.x = lp(m.armL.fa.rotation.x, -.55, ag);
    m.up.rotation.x += .14 + .1 * mv; m.head.rotation.z = .3 + Math.sin(t * .6 + ph) * .06; m.head.rotation.x += .15;
    loosen(C, t, mv);
    C.flies.forEach((f, i) => { const a = t * (3 + i * .4) + f.ph, b = t * 2.1 + f.ph * 2; f.m.position.set(Math.cos(a) * .95 * K, (.6 + .45 * Math.sin(b)) * K, Math.sin(a) * .9 * K); });
  };
  return m;
}
const lp = (a, b, u) => a + (b - a) * u;
function loosen(C, t, mv, pw = 0) { C.loose.forEach(o => { o.g.rotation.x = o.bx + Math.sin(t * 1.5 + o.ph) * .09 * (1 + mv) + mv * .22 + pw * .35; o.g.rotation.z = Math.sin(t * 1.15 + o.ph) * .05; }); }

/* ---------------- Vampiro ---------------- */
const HOUSES = [0x7a1226, 0x4a1f6a, 0x1c3a6a];
const BLK = 0x15101a, BLK2 = 0x241a2c, SKN = 0xe6dfec, RUBY = 0xc01030;
function cape(C, g, H, wide = 1) {   // duas metades de 4 faixas articuladas, forro colorido
  return [-1, 1].map(s => {
    const root = new THREE.Group(); root.position.set(s * .25 * K, 1.0 * K, -.5 * K); g.add(root);
    let par = root; const segs = [];
    [.7, .85, 1.0, 1.15].forEach((w0, i) => {
      const w = w0 * wide, p = new THREE.Group(); p.position.y = i ? -.5 * K : 0; par.add(p);
      C.wr(p, w, .52, .05, s * (w / 2 - .25), -.26, 0, BLK); C.wr(p, w - .06, .5, .03, s * (w / 2 - .25), -.26, .035, H);
      segs.push(p); par = p;
    });
    return { root, segs, s };
  });
}
function bat(C, parent) {
  const g = new THREE.Group(); C.wr(g, .14, .1, .24, 0, 0, 0, BLK2); C.wr(g, .05, .06, .06, 0, .06, .1, BLK2);
  g.userData.w = [-1, 1].map(s => { const p = new THREE.Group(); p.position.x = s * .07 * K; g.add(p); C.wr(p, .4, .02, .22, s * .2, 0, 0, 0x3a2450); C.wr(p, .22, .02, .16, s * .5, 0, .03, 0x3a2450); return p; });
  g.scale.setScalar(1.8); parent.add(g); return g;
}
function vampire(lord) {
  const C = ctx(), { wr, strip } = C, H = pick(HOUSES), F = !lord && Math.random() < .5;
  const d = F ? { b: H, lace: 1, fi: BLK2, belt: BLK, sk: BLK2, hem: H, u: BLK2, f: BLK2, ruf: BLK2, cuff: H, st: BLK, bare: 0, sh: BLK, buck: 1, skin: SKN, hair: 0x1f1728 }
    : { t: BLK2, fl: BLK2, vest: H, belt: 0x2a1a14, u: BLK2, f: BLK2, cuff: 0xe9e2d0, pa: BLK, st: BLK, bare: 0, sh: BLK, buck: 1, skin: SKN, hair: BLK, ex: ['jabot'] };
  const m = buildHuman(F, d), hd = m.head, ez = F ? .53 : .55, ey = F ? .56 : .58, ex = F ? .27 : .28;
  [m.eyeL, m.eyeR].forEach(e => C.glow(e, 0xff2a2a));
  [-1, 1].forEach(s => {   // olhos em fenda, sobrancelhas severas, presas
    wr(hd, .045, .2, .04, s * ex, ey, ez + .045, 0x1a0008); wr(hd, .28, .07, .05, s * .3, ey + .2, ez, BLK, s * .28);
    wr(hd, .06, .14, .05, s * .1, .2, F ? .57 : .59, 0xf8f4ee);
    if (F) wr(hd, .2, .09, .06, s * .4, .36, .545, SKN);
  });
  wr(hd, .16, .14, .12, 0, .42, F ? .55 : .57, SKN); wr(hd, .36, .08, .06, 0, .26, F ? .54 : .56, 0x4a0c1a); wr(hd, .04, .1, .04, .1, .09, F ? .57 : .59, RUBY);
  if (F) {   // cabelo, diadema e gola alta
    [-.5, -.25, 0, .25, .5].forEach((x, i) => strip(hd, x, .85, -.66, [1.4, 1.7, 1.9, 1.7, 1.4][i], 0x1f1728, .08, .24));
    [-1, 1].forEach(s => strip(hd, s * .64, .55, .42, .95, 0x1f1728, 0, .16));
    wr(hd, 1.24, .42, 1.12, 0, 1.0, -.02, 0x1f1728); wr(hd, .5, .05, .7, .15, 1.22, -.05, 0x3a2c4c); wr(hd, .7, .2, .3, 0, .98, .5, 0x1f1728); wr(hd, 1.3, .08, 1.18, 0, .99, 0, GOLD);
    [[-.3, 1.12], [0, 1.22], [.3, 1.12]].forEach(p => wr(hd, .1, .22, .1, p[0], p[1], .58, GOLD)); wr(hd, .1, .1, .06, 0, 1.0, .6, RUBY);
  } else {
    wr(hd, 1.2, .2, 1.08, 0, 1.06, -.02, BLK); wr(hd, .5, .14, .1, 0, .96, .54, BLK); strip(hd, 0, .95, -.64, .9, BLK, .06, .3);
  }
  [-1, 1].forEach(s => wr(hd, .12, .62, .78, s * .68, 0, -.12, BLK, -s * .42));
  [-1, 1].forEach(s => wr(hd, .04, .56, .7, s * .62, 0, -.12, H, -s * .42));
  wr(hd, 1.3, .7, .12, 0, .14, -.62, BLK, 0, -.22); wr(hd, 1.2, .62, .04, 0, .14, -.55, H, 0, -.22);   // gola alta
  [m.arm, m.armL].forEach(a => {   // ombreiras, garras
    wr(a, F ? .5 : .54, .14, F ? .54 : .58, 0, .06, 0, BLK); wr(a, (F ? .5 : .54) + .02, .04, (F ? .54 : .58) + .02, 0, .12, 0, GOLD);
    if (F) wr(a.fa, .38, .3, .42, 0, -.46, 0, BLK);
    [-.12, -.04, .04, .12].forEach(x => wr(a.fa, .05, .14, .05, x, (F ? -.61 : -.67) - .05, .12, 0x0c0810));
  });
  if (F) {
    wr(m.up, .12, .12, .05, 0, .65, .42, RUBY); wr(m.up, .5, .04, .05, 0, .78, .41, GOLD);
    wr(m, 1.5, .42, 1.12, 0, .64, 0, BLK2); wr(m, 1.72, .3, 1.22, 0, .36, 0, BLK2); wr(m, 1.8, .08, 1.28, 0, .2, 0, H);   // vestido longo em camadas
  } else {
    wr(m.up, .2, .2, .05, 0, .8, .5, GOLD); wr(m.up, .1, .1, .06, 0, .8, .53, RUBY);
    [-1, 1].forEach(s => wr(m.up, .26, .9, .06, s * .4, .6, .47, BLK, -s * .1));
    [-.45, -.15, .15, .45].forEach(x => strip(m, x, .78, -.46, .7, BLK2, .05, .3));
  }
  if (lord) {   // Conde: coroa de ouro com rubis, ombreiras de espinhos, broche grande e pele dourada nas mangas
    wr(hd, 1.28, .12, 1.14, 0, 1.03, 0, GOLD); [-.45, -.22, 0, .22, .45].forEach((x, i) => wr(hd, .12, .26 + (i === 2 ? .12 : 0), .12, x, 1.18 + (i === 2 ? .06 : 0), .5, GOLD));
    wr(hd, .12, .12, .08, 0, 1.06, .6, RUBY);
    [-1, 1].forEach(s => { wr(m.up, .34, .5, .34, s * .98, .96, 0, BLK2, 0, 0); [0, 1, 2].forEach(i => wr(m.up, .1, .34 + i * .04, .1, s * (.98 + (i - 1) * .12), 1.28 + (i === 1 ? .08 : 0), 0, GOLD)); });
    wr(m.up, .3, .3, .06, 0, .66, .5, GOLD); wr(m.up, .16, .16, .08, 0, .66, .54, RUBY);
  }
  C.capes = cape(C, m.up, H, lord ? 1.35 : 1);
  C.keep.add(m.eyeL); C.keep.add(m.eyeR); refuse(m, C.keep);
  if (lord) for (let i = 0; i < 5; i++) C.bats.push(bat(C, m));
  m.userData.fx = (e, dt, mv, t) => {
    const pw = e.UD ? e.UD.power : 0, br = Math.sin(t * 1.5);
    C.capes.forEach(h => {
      h.root.rotation.z = h.s * (.04 + pw * 1.1 + mv * .04);
      h.segs.forEach((g, i) => g.rotation.x = .03 + mv * (.1 + .07 * i) + pw * (.08 + .05 * i) + Math.sin(t * 1.4 - i * .8 + h.s) * (.04 + .04 * mv + .03 * pw) * (i + 1) * .6);
    });
    if (pw > .01) { m.arm.rotation.z = -(.12 + 1.15 * pw); m.armL.rotation.z = .12 + 1.15 * pw; m.arm.rotation.x = lp(m.arm.rotation.x, -.3, pw); m.armL.rotation.x = lp(m.armL.rotation.x, -.3, pw); m.position.y = pw * (.4 + .06 * Math.sin(t * 2)); m.up.rotation.x -= .08 * pw; }
    else { m.position.y *= .9; m.arm.rotation.z = 0; }
    loosen(C, t, mv, pw);
    const pu = .95 + .1 * Math.sin(t * 4) + .25 * pw; m.eyeL.scale.setScalar(pu); m.eyeR.scale.setScalar(pu);
    C.bats.forEach((b, i) => { const a = t * (1 + .8 * mv + 2.2 * pw) * (.6 + .15 * (i % 3)) + i * 6.2832 / 5, r = (2.6 - .9 * pw + (i % 3) * .3) * K * 1.6, w = Math.sin(t * (12 + 4 * pw) + i) * .8;
      b.position.set(Math.cos(a) * r, (3.6 + (i % 4) * .6 + Math.sin(t * 1.7 + i) * .3) * K * 1.0, Math.sin(a) * r); b.rotation.y = -a; b.rotation.z = Math.sin(t * 1.7 + i) * .2; b.userData.w[0].rotation.z = -w; b.userData.w[1].rotation.z = w; });
  };
  return m;
}

/* ---------------- Múmia ---------------- */
const BANDS = [[[0xd8caa2, 0xc7b78c, 0xb5a47a], 0x4a3b28], [[0xece6d6, 0xdcd4be, 0xcfc6ac], 0x6a5a44], [[0x9a8a62, 0x857550, 0x6f6140], 0x2e2418]];
const EYC = [0x7dffb0, 0xffb040, 0x70c8ff, 0xff5040];
function mummy(pharaoh) {
  const C = ctx(), { wr, strip } = C, [B3, SK] = pick(BANDS), F = !pharaoh && Math.random() < .5, c = k => B3[k % 3];
  const d = F ? { b: B3[0], sk: B3[1], hem: B3[2], fi: B3[0], u: B3[1], f: B3[0], st: B3[0], bare: 0, sh: 0x6a5a3c, belt: 0x6a5030, skin: SK, hair: B3[1] }
    : { t: B3[0], u: B3[1], f: B3[0], pa: B3[1], st: B3[0], bare: 0, sh: 0x6a5a3c, belt: 0x6a5030, skin: SK, hair: B3[1] };
  const m = buildHuman(F, d), sw = (a, b) => 0;
  if (F) {   // corpete estreito, saia e barra
    for (let k = 0; k < 8; k++) { const y = 1.28 + k * .12, lo = y < 1.7; wr(m.up, lo ? .9 : 1.14, .1, lo ? .7 : .82, 0, y - 1.1, 0, c(k), k % 2 ? .06 : -.06); }
    wr(m.up, .2, 1.0, .82, 0, .75, 0, c(1), .55); wr(m.up, .2, 1.0, .82, 0, .75, 0, c(2), -.55);
    [.92, 1.05, 1.18].forEach((y, i) => wr(m.up, 1.26 + .04 * i, .1, .92, 0, y - 1.1, 0, c(i + 1), i % 2 ? .05 : -.05));
    [-.5, -.17, .17, .5].forEach((x, i) => { strip(m.up, x, -.24, .47, .4 + .15 * (i % 2), c(i), .08); strip(m.up, x, -.24, -.47, .45, c(i + 1), -.08); });
    [-.3, 0, .3].forEach((x, i) => strip(m.up, x, .8, -.42, .8 + .25 * i, c(i), .1));
  } else {
    for (let k = 0; k < 9; k++) wr(m.up, 1.3 + .05 * (k % 2), .1, .9, 0, 1.15 + k * .12 - 1.1, 0, c(k), k % 2 ? .06 : -.06);
    wr(m.up, .2, 1.25, .9, 0, .55, 0, c(1), .55); wr(m.up, .2, 1.25, .9, 0, .55, 0, c(2), -.55);
    wr(m.up, 1.2, .42, .88, 0, -.15, 0, c(1));
    [-.3, 0, .3].forEach((x, i) => strip(m.up, x, .75, -.46, .9 + .3 * i, c(i), .1));
  }
  [m.arm, m.armL].forEach((a, j) => {
    const wu = F ? .46 : .5, du = F ? .5 : .54, wf = F ? .38 : .46, df = F ? .42 : .5, wh = F ? .38 : .44, dh = F ? .42 : .48;
    [-.04, -.15, -.26, -.37].forEach((y, i) => wr(a, wu, .09, du, 0, y, 0, c(i + j), i % 2 ? .05 : -.05));
    (F ? [-.02, -.12, -.22, -.32] : [0, -.1, -.2, -.28]).forEach((y, i) => wr(a.fa, wf, .08, df, 0, y, 0, c(i + 1)));
    (F ? [-.4, -.52] : [-.45, -.58]).forEach((y, i) => wr(a.fa, wh, .1, dh, 0, y, 0, c(i)));
    strip(a.fa, 0, -.3, F ? .22 : .27, .6, c(j), .15);
  });
  [m.legL, m.legR].forEach((l, j) => {
    const wt = F ? .5 : .56, dt = F ? .54 : .6, ws = F ? .44 : .5, ds = F ? .5 : .54, wf = F ? .56 : .6, df = F ? .84 : .86;
    [-.02, -.14, -.26, -.38].forEach((y, i) => wr(l, wt, .09, dt, 0, y, 0, c(i + j), i % 2 ? .04 : -.04));
    [0, -.1, -.2, -.3].forEach((y, i) => wr(l.knee, ws, .08, ds, 0, y, 0, c(i)));
    [-.02, -.12].forEach((y, i) => wr(l.foot, wf, .08, df, 0, y, .1, c(i + 1)));
  });
  strip(m.legR.knee, .1, -.2, F ? .24 : .27, .7, c(0), .12);
  const hd = m.head;
  wr(hd, 1.2, .16, 1.1, 0, .93, 0, c(0)); wr(hd, 1.18, .16, 1.08, 0, .12, 0, c(1)); wr(hd, 1.14, .1, 1.04, 0, 1.06, 0, c(2));
  wr(hd, 1.3, .14, 1.1, 0, 1.0, 0, c(1), .1); wr(hd, 1.12, .4, .12, 0, .27, F ? .62 : .6, c(0));
  if (F) [-.35, 0, .35].forEach((x, i) => strip(hd, x, .7, -.72, [.9, 1.2, 1.0][i], c(i), .1)); else strip(hd, .3, .75, -.6, .7, c(2), .1);
  strip(hd, -.4, .6, .58, .45, c(1), -.1);
  const ec = pharaoh ? 0x7dffb0 : pick(EYC);
  [m.eyeL, m.eyeR].forEach(e => C.glow(e, ec));
  if (pharaoh) {   // máscara de ouro, nemes listrado, barba postiça, colar usekh e cajado
    wr(hd, 1.04, 1.0, .1, 0, .55, .56, GOLD);
    [-1, 1].forEach(s => { wr(hd, .3, .06, .06, s * .28, .7, .62, 0x1a1a22); wr(hd, .28, .1, .06, s * .28, .58, .6, 0x1a1a22); });
    wr(hd, .16, .18, .1, 0, .38, .62, 0xc8962a); wr(hd, .46, .06, .06, 0, .22, .62, 0x1a1a22);
    wr(hd, 1.36, .5, 1.24, 0, .98, -.02, 0x1d3f8a); [0, 1, 2, 3, 4].forEach(i => wr(hd, 1.38, .06, 1.26, 0, .8 + i * .1, -.02, GOLD));
    wr(hd, .42, .5, .46, 0, .55, -.7, 0x1d3f8a, 0, .1); [-1, 1].forEach(s => { wr(hd, .3, .7, .9, s * .72, .22, -.1, 0x1d3f8a); [0, 1, 2].forEach(i => wr(hd, .32, .06, .92, s * .72, .05 + i * .22, -.1, GOLD)); });
    wr(hd, .14, .5, .14, 0, .02, .62, 0xc8962a, 0, -.2); wr(hd, .16, .18, .16, 0, 1.2, .5, 0xd84030); wr(hd, .1, .3, .1, 0, 1.4, .52, 0x2a8a4a);
    wr(m.up, 1.6, .16, 1.1, 0, 1.0, 0, GOLD); wr(m.up, 1.8, .14, 1.2, 0, .86, 0, 0x1d3f8a); wr(m.up, 1.96, .12, 1.3, 0, .74, 0, GOLD);
    [-.7, -.35, 0, .35, .7].forEach((x, i) => wr(m.up, .22, .2, .12, x, .62, .62, i % 2 ? 0xd84030 : 0x2a8a4a));
    [m.arm, m.armL].forEach(a => { wr(a, .6, .1, .64, 0, .08, 0, GOLD); wr(a.fa, .5, .08, .56, 0, -.06, 0, GOLD); });
    const st = m.armL.fa; wr(st, .08, 3.0, .08, .08, -1.0, .2, 0x6b4528); wr(st, .5, .1, .1, .22, .46, .2, GOLD); wr(st, .12, .5, .12, .46, .22, .2, GOLD, 0, 0);
  }
  C.keep.add(m.eyeL); C.keep.add(m.eyeR); refuse(m, C.keep);
  m.userData.fx = (e, dt, mv, t) => {
    const reach = mn(1, mv * .9 + (e.ag ? .7 : 0)), at = e.st === 'wind' ? 1 : 0;
    m.legR.rotation.x *= .6; m.legR.knee.rotation.x *= .45;   // perna direita mais dura: arrasta o pé
    m.armL.rotation.x = lp(m.armL.rotation.x, -1.2, reach * .8); if (e.st !== 'wind' && e.st !== 'rec') m.arm.rotation.x = lp(m.arm.rotation.x, -1.2, reach * .8);
    m.up.rotation.x += .1 * mv + .06; m.head.rotation.z = .12 + Math.sin(t * .7) * .04; m.head.rotation.x -= m.up.rotation.x * .5;
    loosen(C, t, mv);
    const ey = .9 + .1 * Math.sin(t * 5) * at + .1 * at; m.eyeL.scale.setScalar(ey); m.eyeR.scale.setScalar(ey);
  };
  return m;
}

/* ---------------- Bandido do Deserto ---------------- */
const CLOTH = [0xb8a060, 0xa04a30, 0x3a5a7a, 0x5a6a3a];
function bandit() {
  const C = ctx(), { wr, strip } = C, F = Math.random() < .3, cl = pick(CLOTH), SKIN = pick([0xc8946a, 0xb08058, 0xd8a880]);
  const d = F ? { b: 0x7a5a30, fi: 0xe0d0a8, belt: cl, sk: 0x5a4a30, hem: 0x3a2e20, u: 0xe0d0a8, f: 0, cuff: 0x3a2e20, st: 0x4a3a28, bare: 0, sh: 0x3a2e20, hair: 0x2a1a10, skin: SKIN, ex: ['earring'] }
    : { t: 0xe0d0a8, vest: 0x7a5a30, belt: cl, u: 0xe0d0a8, f: 0xe0d0a8, cuff: 0x4a3a28, pa: 0x5a4a30, st: 0x4a3a28, sh: 0x3a2e20, hair: 0x2a1a10, skin: SKIN, ex: [] };
  const m = buildHuman(F, d), hd = m.head;
  wr(hd, 1.3, .5, 1.22, 0, 1.0, -.02, cl); wr(hd, 1.34, .1, 1.26, 0, .86, -.02, 0x2a1d14); wr(hd, .9, .34, .8, 0, 1.3, -.02, cl);   // turbante
  wr(hd, .5, .14, .2, 0, 1.0, .52, cl); wr(hd, .12, .12, .06, 0, 1.0, .64, GOLD);
  strip(hd, .45, .95, -.5, 1.0, cl, .1, .26);
  wr(hd, 1.1, .38, .12, 0, .22, F ? .55 : .57, 0x2a1d14); wr(hd, 1.12, .34, .06, 0, .22, F ? .6 : .62, cl);   // véu cobrindo o nariz e a boca
  wr(m.up, 1.4, .16, .96, 0, .12, 0, cl); strip(m.up, .45, .08, .5, .9, cl, .05, .22);   // faixa na cintura
  wr(m.up, 1.3, .14, .1, 0, 1.0, .44, 0x2a1d14, .6);   // bandoleira
  const a = m.arm.fa;   // cimitarra (arco de blocos)
  wr(a, .1, .4, .14, 0, -.68, .05, 0x5a3a1a); wr(a, .36, .08, .1, 0, -.84, .05, GOLD);
  [[-1.0, .06, 0], [-1.3, .06, .04], [-1.58, .08, .12], [-1.8, .08, .22]].forEach(([y, z, rz], i) => wr(a, .09, .3, .05, 0, y, z + i * .06 - .02, 0xd8dce0, rz, -.15 * i));
  C.keep.add(m.eyeL); C.keep.add(m.eyeR); refuse(m, C.keep);
  m.userData.fx = (e, dt, mv, t) => loosen(C, t, mv);
  return m;
}

/* ---------------- Caveira do deserto ---------------- */
function skull() {
  const C = ctx(), { wr, strip } = C, tone = pick([0xd8c89a, 0xe2d8bc, 0xcdbd8a]);
  const m = buildSkeleton({ bone: tone, eye: 0x7dffb0 }), hd = m.head;
  [m.eyeL, m.eyeR].forEach(e => C.keep.add(e));
  wr(hd, 1.06, .16, 1.0, 0, 1.0, 0, GOLD); wr(hd, .14, .2, .06, 0, 1.0, .52, 0x2a8a4a);
  strip(hd, .52, .98, -.2, .8, 0xa04a30, .1, .24);   // tira de pano da testa
  wr(m.up, 1.1, .1, .6, 0, .3, 0, 0x8a6a3a); strip(m.up, -.3, .24, .32, .7, 0xa04a30, .06, .3); strip(m.up, .3, .24, .32, .55, 0xe0d0a8, .06, .26);   // tanga esfarrapada
  wr(m.arm, .46, .1, .46, 0, .02, 0, GOLD);
  refuse(m, C.keep);
  m.userData.fx = (e, dt, mv, t) => { loosen(C, t, mv); const p = .9 + .15 * Math.sin(t * 5 + e.ph); m.eyeL.scale.setScalar(p); m.eyeR.scale.setScalar(p); };
  return m;
}

/** Cria o modelo do tipo `t` (t.undead = zombie | vampire | mummy | bandit | skull; t.lord = chefe) */
export function makeUndead(t) {
  const g = { zombie, vampire: () => vampire(!!t.lord), mummy: () => mummy(!!t.lord), bandit, skull }[t.undead]();
  if (t.undead !== 'skull') hideSword(g);   // zumbis, vampiros, múmias e bandidos atacam com as mãos/garras (o bandido tem a cimitarra própria)
  g.rotation.order = 'YXZ';
  return g;
}
