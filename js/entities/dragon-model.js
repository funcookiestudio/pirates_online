/* Modelos do Dragão e do Wiverno (protótipos "Prévia do dragão" e "Prévia do wiverno" do Bison, portados para o jogo).
   Corpo de blocos chanfrados (bb) + membranas das asas (mem); cada junta vira um único Mesh com cores por vértice (fuse), então são poucas peças por grupo.
   makeDragonFoe(t) devolve { g, update(dt, I), kind } e o enemies.js guarda isso em e.DR. A frente do modelo é +z.
   I = { mv 0..1 (andando), fl 0..1 (voando/pairando), gd 0..1 (planando, só wiverno), fr 0..1 (cuspindo fogo, só dragão), look (olhar -1..1) }.
   Dragão: 4 patas + 2 asas, pescoço curto de 3 juntas, fogo. Wiverno: só 2 patas (as asas são os membros da frente), pescoço longo e fino de 4 juntas, cauda de 10 segmentos. */

export const COATS = [['Vermelho', 0xa3302a, 0x6e1d1a, 0xe0b46a, 0xc4492f, 0xe8dcc0, 0xffd23a], ['Verde', 0x3f7f3a, 0x23501f, 0xd6cf8a, 0x5e9a45, 0xe8dcc0, 0xffd23a], ['Gelo', 0x3a6fa8, 0x1f4570, 0xdce9f0, 0x5a93c8, 0xf0f4f8, 0xbff4ff], ['Noturno', 0x2c2a30, 0x16151a, 0x6a5a7a, 0x4a3a5a, 0xb8a890, 0xff4a2a], ['Ouro', 0xc9a032, 0x8a6a1a, 0xf3e6b0, 0xe0bb4a, 0xf0e6c8, 0xff5a2a]];
export const WCOATS = [['Brasa', 0x6a5648, 0x2c241f, 0x9a8470, 0xa83a3a, 0xd8cdb0, 0xffb02a], ['Verde', 0x3f6a3a, 0x23401f, 0xd6cf8a, 0x6a9a4a, 0xe8dcc0, 0xffd23a], ['Gelo', 0x8aa0b8, 0x4a5a70, 0xdce6ee, 0x6a90c0, 0xf0f4f8, 0xbff4ff], ['Noturno', 0x2c2a30, 0x16151a, 0x6a5a7a, 0x5a2a4a, 0xb8a890, 0xff4a2a], ['Ouro', 0xc9a032, 0x8a6a1a, 0xf3e6b0, 0xe0bb4a, 0xf0e6c8, 0xff5a2a]];
export const HORNS = [['Da espécie', -1], ['Osso', 0xe8dcc0], ['Negro', 0x1a1410], ['Dourado', 0xe0b030]];
const WHT = 0xf0ead8;
const lp = (a, b, u) => a + (b - a) * u;

function bb(w, h, d, b, col) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col }));
}
function mem(pts, s, col) {
  const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x * s, y) : sh.moveTo(x * s, y)); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }); g.translate(0, 0, -.015);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; return m;
}
/** Funde os Mesh filhos diretos de um grupo em um só (cor por vértice) */
function fuse(grp) {
  const ms = grp.children.filter(c => c.isMesh); if (ms.length < 2) return;
  const pos = [], nor = [], col = [];
  ms.forEach(m => {
    m.updateMatrix(); const g = m.geometry.clone().applyMatrix4(m.matrix), n = g.attributes.position.count, c = m.material.color;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b);
    grp.remove(m); g.dispose(); m.geometry.dispose(); m.material.dispose();
  });
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
}
const gr = (x, y, z, p) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
const bxIn = (HB) => (w, h, d, c, x, y, z, p, b) => { const m = bb(w, h, d, b === undefined ? .05 : b, c); m.position.set(x, y, z); p.add(m); return m; };

/* ---------- Dragão ---------- */
const DFL = [1.7, 2.0, 1.8, 1.4], DFA = [-.15, .25, .65, 1.05];
function buildDragon(ci, hi) {
  const [, C, D, B, WM, H0, EY] = COATS[ci], HO = HORNS[hi][1] < 0 ? H0 : HORNS[hi][1];
  const g = new THREE.Group(), HB = new THREE.Group(); HB.position.y = 1.5; g.add(HB);
  const bx = bxIn();
  bx(1, 1, 1.5, C, 0, 0, 0, HB, .12); bx(.95, 1.05, .7, C, 0, .03, .95, HB, .12); bx(.95, .95, .8, C, 0, 0, -.95, HB, .12);
  bx(.7, .18, 2.9, B, 0, -.5, -.05, HB, .05);
  for (let i = 0; i < 6; i++) bx(.74, .05, .1, D, 0, -.6, .9 - i * .4, HB, .01);
  for (let i = 0; i < 8; i++) { const s = .32 - i * .02; bx(.1, s, .2, D, 0, .5 + s / 2, 1.1 - i * .33, HB, .02); }
  const legs = [];
  [[-.58, .95, 0], [.58, .95, 0], [-.58, -.95, 1], [.58, -.95, 1]].forEach(([x, z, hd]) => {
    const h = gr(x, -.3, z, HB), w = hd ? .42 : .34;
    if (hd) bx(.5, .6, .8, C, 0, .02, -.02, h, .1);
    bx(w, .6, w + .1, C, 0, -.3, 0, h, .07);
    const k = gr(0, -.6, 0, h); bx(w - .08, .5, w - .04, C, 0, -.25, 0, k, .05);
    const f = gr(0, -.5, 0, k); bx(w, .14, .5, D, 0, -.07, .1, f, .03);
    [-1, 0, 1].forEach(c => bx(.07, .07, .2, HO, c * .1, -.08, .4, f, .01));
    h.knee = k; h.foot = f; legs.push(h);
  });
  const n1 = gr(0, .3, 1.2, HB); bx(.55, .7, .55, C, 0, .3, 0, n1, .1); bx(.4, .7, .1, B, 0, .3, .25, n1, .03);
  const n2 = gr(0, .65, 0, n1); bx(.46, .66, .46, C, 0, .3, 0, n2, .09);
  const n3 = gr(0, .6, 0, n2); bx(.38, .52, .4, C, 0, .25, 0, n3, .08);
  [n1, n2, n3].forEach(n => bx(.08, .22, .18, D, 0, .3, -.28, n, .02));
  const head = gr(0, .5, 0, n3);
  bx(.46, .42, .6, C, 0, 0, .25, head, .1); bx(.34, .24, .55, C, 0, -.05, .75, head, .07); bx(.2, .08, .2, D, 0, .1, .92, head, .02);
  bx(.52, .08, .3, D, 0, .24, .28, head, .02); bx(.06, .4, .3, D, 0, .3, -.1, head, .02);
  [-1, 1].forEach(s => {
    bx(.07, .1, .12, EY, s * .25, .12, .35, head, .01); bx(.05, .05, .05, 0x111111, s * .08, 0, 1.03, head, .01);
    bx(.08, .08, .3, HO, s * .27, -.08, 0, head, .02);
    for (let i = 0; i < 3; i++) bx(.04, .1, .05, WHT, s * .16, -.2, .55 + i * .17, head, .01);
    const h1 = gr(s * .17, .2, -.02, head); h1.rotation.x = -1; h1.rotation.z = s * .35; bx(.13, .5, .13, HO, 0, .25, 0, h1, .03);
    const h2 = gr(0, .5, 0, h1); h2.rotation.x = -.5; bx(.09, .4, .09, HO, 0, .2, 0, h2, .02);
  });
  const jaw = gr(0, -.2, .05, head); bx(.34, .1, .7, B, 0, 0, .35, jaw, .04); bx(.24, .1, .35, B, 0, 0, .8, jaw, .04);
  [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) bx(.04, .1, .05, WHT, s * .14, .08, .45 + i * .17, jaw, .01); });
  const tail = []; let seg = gr(0, .1, -1.35, HB);
  for (let i = 0; i < 6; i++) {
    const w = .55 - i * .07; tail.push(seg);
    bx(w, w * .9, .66, C, 0, 0, -.33, seg, .06); bx(.08, .2, .2, D, 0, w * .45 + .05, -.33, seg, .02);
    if (i === 5) { bx(.06, .3, .34, D, 0, 0, -.7, seg, .02); bx(.06, .18, .3, D, 0, 0, -.95, seg, .02); }
    seg = gr(0, 0, -.64, seg);
  }
  const wings = [-1, 1].map(s => {
    bx(.5, .55, .65, C, s * .5, .35, .5, HB, .1);
    const w1 = gr(s * .5, .5, .5, HB);
    bx(1, .16, .16, D, s * .5, 0, 0, w1, .03);
    const bp = gr(0, 0, 0, w1); bp.add(mem([[0, 0], [1, 0], [1, .9], [.5, 1.25], [-.1, 1.2]], s, WM));
    const w2 = gr(s, 0, 0, w1);
    bx(1.4, .12, .12, D, s * .7, 0, 0, w2, .03);
    const bp2 = gr(0, 0, 0, w2); bp2.add(mem([[0, 0], [1.4, 0], [1.2, .7], [.6, 1], [0, .9]], s, WM));
    const w3 = gr(s * 1.4, 0, 0, w2); bx(.1, .1, .1, D, 0, 0, 0, w3, .02); bx(.08, .08, .35, HO, 0, 0, .2, w3, .02);
    const fs = DFL.map((L, j) => {
      const f = gr(0, 0, 0, w3); bx(L, .09, .09, D, s * L / 2, 0, 0, f, .02); bx(.07, .07, .2, HO, s * (L + .05), 0, 0, f, .01);
      let pts;
      if (j < 3) { const d = DFA[j + 1] - DFA[j], nx = DFL[j + 1] * Math.cos(d), ny = DFL[j + 1] * Math.sin(d); pts = [[0, 0], [L, 0], [(L + nx) * .39, ny * .39], [nx, ny]]; }
      else pts = [[0, 0], [L, 0], [L * .55, .5], [.51, .52]];
      f.add(mem(pts, s, WM)); f.rotation.y = s * DFA[j]; return f;
    });
    return { w1, w2, w3, s, fs, bp, bp2 };
  });
  g.traverse(n => { if (n.isGroup) fuse(n); });
  const fg = gr(0, -.12, 1.05, head), flames = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial({ color: 0xffaa22 })); fg.add(m); flames.push(m); }
  fg.visible = false;
  return { g, HB, legs, neck: [n1, n2, n3], head, jaw, tail, wings, fg, flames };
}

/* ---------- Wiverno ---------- */
const WFL = [2.4, 2.7, 2.3, 1.7], WFA = [-.1, .3, .7, 1.05];
function buildWyvern(ci, hi) {
  const [, C, D, B, WM, H0, EY] = WCOATS[ci], HO = HORNS[hi][1] < 0 ? H0 : HORNS[hi][1];
  const g = new THREE.Group(), HB = new THREE.Group(); HB.position.y = 1.52; g.add(HB);
  const bx = bxIn();
  bx(.8, .8, 1.5, C, 0, 0, 0, HB, .12); bx(.85, .9, .7, C, 0, .03, .9, HB, .12); bx(.8, .8, .8, C, 0, -.02, -.9, HB, .12);
  bx(.55, .14, 2.9, B, 0, -.4, 0, HB, .05);
  for (let i = 0; i < 7; i++) bx(.58, .04, .1, D, 0, -.47, 1.0 - i * .4, HB, .01);
  for (let i = 0; i < 9; i++) { const s = .26 - i * .015; bx(.08, s, .18, D, 0, .4 + s / 2, 1.1 - i * .3, HB, .02); }
  const legs = [];
  [-1, 1].forEach(s => {
    const h = gr(s * .45, -.2, -.35, HB);
    bx(.42, .7, .5, C, 0, -.35, 0, h, .09); bx(.5, .5, .6, C, 0, 0, -.02, h, .1);
    const k = gr(0, -.7, 0, h); bx(.28, .65, .32, C, 0, -.32, 0, k, .06);
    const a = gr(0, -.65, 0, k); bx(.3, .13, .5, D, 0, -.07, .15, a, .03);
    [-1, 0, 1].forEach(c => bx(.07, .07, .28, HO, c * .1, -.07, .5, a, .01)); bx(.07, .07, .2, HO, 0, -.05, -.15, a, .01);
    h.knee = k; h.foot = a; legs.push(h);
  });
  const NL = [.55, .55, .5, .5], NW = [.34, .3, .26, .24], ns = []; let par = HB;
  for (let i = 0; i < 4; i++) {
    const n = gr(0, i ? NL[i - 1] : .25, i ? 0 : 1, par);
    bx(NW[i], NL[i] + .02, NW[i] + .02, C, 0, NL[i] / 2, 0, n, .06); bx(.06, .14, .14, D, 0, NL[i] / 2, -NW[i] / 2 - .04, n, .02);
    ns.push(n); par = n;
  }
  const head = gr(0, NL[3], 0, ns[3]);
  bx(.34, .32, .5, C, 0, 0, .2, head, .07); bx(.22, .2, .55, C, 0, -.04, .65, head, .05); bx(.3, .06, .26, D, 0, .15, .25, head, .02);
  [-1, 1].forEach(s => {
    bx(.06, .08, .1, EY, s * .19, .1, .3, head, .01); bx(.04, .04, .04, 0x111111, s * .06, 0, .93, head, .01);
    bx(.06, .06, .25, HO, s * .2, -.05, -.05, head, .015);
    for (let i = 0; i < 3; i++) bx(.03, .08, .04, WHT, s * .1, -.14, .5 + i * .12, head, .01);
    const h1 = gr(s * .12, .15, -.05, head); h1.rotation.x = -1.1; h1.rotation.z = s * .3; bx(.1, .45, .1, HO, 0, .22, 0, h1, .025);
    const h2 = gr(s * .14, .1, .05, head); h2.rotation.x = -1.2; h2.rotation.z = s * .6; bx(.07, .28, .07, HO, 0, .14, 0, h2, .02);
  });
  const jaw = gr(0, -.15, .05, head); bx(.2, .07, .6, B, 0, 0, .3, jaw, .025); bx(.16, .06, .3, B, 0, 0, .7, jaw, .02);
  [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) bx(.03, .08, .04, WHT, s * .08, .06, .4 + i * .12, jaw, .01); });
  const tail = []; let seg = gr(0, .05, -1.25, HB);
  for (let i = 0; i < 10; i++) {
    const w = Math.max(.5 - i * .045, .12); tail.push(seg);
    bx(w, w * .9, .66, C, 0, 0, -.33, seg, .04); if (i < 8) bx(.06, .14, .16, D, 0, w * .45 + .03, -.33, seg, .015);
    if (i === 9) bx(.05, .4, .4, D, 0, 0, -.75, seg, .02);
    seg = gr(0, 0, -.64, seg);
  }
  const wings = [-1, 1].map(s => {
    bx(.5, .6, .7, C, s * .45, .2, .75, HB, .1);
    const w1 = gr(s * .45, .4, .7, HB); w1.scale.setScalar(1.1);
    bx(1, .18, .18, D, s * .5, 0, 0, w1, .04);
    const bp = gr(0, 0, 0, w1); bp.add(mem([[0, 0], [1, 0], [1, 1], [.5, 1.7], [-.1, 1.9]], s, WM));
    const w2 = gr(s, 0, 0, w1); bx(1.4, .13, .13, D, s * .7, 0, 0, w2, .03);
    const bp2 = gr(0, 0, 0, w2); bp2.add(mem([[0, 0], [1.4, 0], [1.3, .8], [.7, 1.2], [0, 1]], s, WM));
    const w3 = gr(s * 1.4, 0, 0, w2); bx(.2, .2, .2, D, 0, 0, 0, w3, .03); bx(.08, .08, .35, HO, 0, 0, .2, w3, .02);
    const fs = WFL.map((Lf, j) => {
      const f = gr(0, 0, 0, w3); bx(Lf, .09, .09, D, s * Lf / 2, 0, 0, f, .02); bx(.07, .07, .2, HO, s * (Lf + .05), 0, 0, f, .01);
      let pts;
      if (j < 3) { const d = WFA[j + 1] - WFA[j], nx = WFL[j + 1] * Math.cos(d), ny = WFL[j + 1] * Math.sin(d); pts = [[0, 0], [Lf, 0], [(Lf + nx) * .34, ny * .34], [nx, ny]]; }
      else pts = [[0, 0], [Lf, 0], [Lf * .5, .55], [.65, .48]];
      f.add(mem(pts, s, WM)); f.rotation.y = s * WFA[j]; return f;
    });
    return { w1, w2, w3, s, fs, bp, bp2 };
  });
  g.traverse(n => { if (n.isGroup) fuse(n); });
  return { g, HB, legs, neck: ns, head, jaw, tail, wings };
}

function gait(u, duty, A, lift) {
  u = ((u % 1) + 1) % 1;
  if (u < duty) { const s = u / duty; return [-A + 2 * A * s, .04 + .2 * Math.max(0, (s - .7) / .3)]; }
  const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s);
  return [A - 2 * A * e, .04 + lift * Math.sin(Math.PI * s)];
}
const OFF = [.25, .75, 0, .5], NB = [1.2, -.5, .3, -.1];

/** Cria o modelo do inimigo `t` (ENEMY_KINDS: dragon 'dragon' | 'wyvern', coats [..], horns [..]) com escamas sorteadas entre as opções do tipo */
export function makeDragonFoe(t) {
  const wy = t.dragon === 'wyvern', coats = t.coats || [0], ci = coats[(Math.random() * coats.length) | 0], hi = (t.horns || [0])[(Math.random() * (t.horns || [0]).length) | 0] || 0;
  const H = wy ? buildWyvern(ci, hi) : buildDragon(ci, hi);
  const S = { t: Math.random() * 20, ph: Math.random() * 6, wk: 0, fl: 0, fr: 0, gd: 0 };

  const update = (dt, I = {}) => {
    S.t += dt; const t = S.t, k = Math.min(1, dt * 3);
    S.wk += ((I.mv || 0) - S.wk) * k; S.fl += ((I.fl || 0) - S.fl) * k; S.fr += ((I.fr || 0) - S.fr) * k; S.gd += ((I.gd || 0) - S.gd) * k;
    const wk = S.wk, fl = S.fl, fr = S.fr, gd = S.gd;
    S.ph += dt * (wy ? 2 + wk * 2.8 + fl * 4.5 : 2 + wk * 2.5 + fl * 5.5);
    const ph = S.ph, HB = H.HB, look = I.look || 0;
    if (wy) {
      const fy = Math.min(1, fl + gd);
      H.legs.forEach((l, i) => {
        const [hip, kn] = gait(ph / 6.283 - i * .5, .6, .45, .9);
        let hx = -.5 + hip * .9 * wk, kx = 1 + (kn - .04) * 1.2 * wk;
        hx = lp(hx, -.3, fy); kx = lp(kx, .8, fy);
        l.rotation.x = hx; l.knee.rotation.x = kx; l.foot.rotation.x = -(hx + kx);
      });
      HB.position.y = 1.52 - .07 * wk + Math.cos(ph * 2) * .03 * wk + fl * (1 + Math.sin(ph) * .2) + gd * (1.2 + Math.sin(t * .8) * .1) + Math.sin(t * 1.5) * .005;
      HB.rotation.x = fl * (-.1 + Math.sin(ph) * .04) - gd * .05 + Math.sin(ph * 2) * .015 * wk + (I.lean || 0);
      HB.rotation.z = Math.sin(ph) * .06 * wk + Math.sin(t * .6) * .1 * gd + fl * Math.sin(ph + 1) * .04;
      H.neck.forEach((q, i) => { q.rotation.x = NB[i] + Math.sin(t * .6 + i) * .04 + (i === 0 ? -.25 * fy : 0) + (I.rear || 0) * (i === 0 ? -.5 : .35); q.rotation.y = Math.sin(ph - i * .5) * .07 * wk + Math.sin(t * .4 + i) * .04 + look * .18; });
      H.head.rotation.x = -.6 + Math.sin(t * .5) * .04; H.head.rotation.y = Math.sin(t * .3) * .25 * (1 - fy) * (1 - Math.abs(look));
      H.jaw.rotation.x = .05 + gd * (.3 + Math.sin(t * 3) * .1) + fl * .1 * Math.max(0, Math.sin(t * .9)) + (I.bite || 0) * .7;
      H.tail.forEach((q, i) => { q.rotation.y = Math.sin(t * 1.3 - i * .6) * (.08 + .1 * wk + .06 * fy) * (1 + i * .1); q.rotation.x = -.03 - fy * .06 + Math.sin(t * 1.8 - i * .5) * .03 * fy; });
      H.wings.forEach(({ w1, w2, w3, s, fs, bp, bp2 }) => {
        const fold = 1 - fy, fa = WFA, [hw, lw] = gait(ph / 6.283 - (s < 0 ? .5 : 0), .6, .45, .9);
        w1.rotation.y = s * (fold * (-.35 + hw * .6 * wk) - fy * .25);
        w1.rotation.z = s * (fold * (-.9 + lw * .6 * wk) + fl * (.1 + Math.sin(ph) * .75) + gd * (.1 + Math.sin(t * .8) * .04) + Math.sin(t * 1.5) * .02 * fold);
        w2.rotation.y = 0;
        w2.rotation.z = s * (fold * (.19 - lw * .5 * wk) + fl * Math.sin(ph - .8) * .35 + gd * Math.sin(t * .8 - .6) * .06);
        w3.rotation.z = s * (fl * Math.sin(ph - 1.5) * .3 + gd * Math.sin(t * .8 - 1) * .1);
        fs.forEach((f, j) => { f.rotation.y = s * lp(fa[j], 1.5 + j * .1, fold); f.rotation.z = s * fold * .35; });
        bp.scale.z = bp2.scale.z = lp(1, .25, fold);
      });
    } else {
      H.legs.forEach((l, i) => {
        const [hip, kn] = gait(ph / 6.283 - OFF[i], .65, .4, .8);
        let hx = hip * wk, kx = .03 + (kn - .03) * wk;
        hx = lp(hx, i < 2 ? -.6 : .8, fl); kx = lp(kx, i < 2 ? 1.3 : 1.2, fl);
        l.rotation.x = hx; l.knee.rotation.x = kx; l.foot.rotation.x = -(hx + kx) * .5;
      });
      HB.position.y = 1.5 + Math.cos(ph * 2) * .03 * wk + fl * (.9 + Math.sin(ph) * .18) + Math.sin(t * 1.5) * .005;
      HB.rotation.x = fl * (-.08 + Math.sin(ph) * .04) + Math.sin(ph * 2) * .015 * wk + (I.lean || 0);
      HB.rotation.z = Math.sin(ph) * .03 * wk + fl * Math.sin(ph + 1) * .04;
      const [n1, n2, n3] = H.neck;
      n1.rotation.x = .6 + Math.sin(t * .6) * .03 + fr * .15 - fl * .1 + (I.rear || 0) * -.35;
      n2.rotation.x = -.5 + Math.sin(t * .5 + 1) * .04 - fr * .2;
      n3.rotation.x = .45 + Math.sin(t * .7) * .04 + fr * .1;
      H.neck.forEach((q, i) => { q.rotation.y = Math.sin(ph - i * .5) * .06 * wk + look * .12; });
      H.head.rotation.x = -.3 + Math.sin(t * .5) * .04 * (1 - fr) - fr * .4;
      H.head.rotation.y = Math.sin(t * .3) * .3 * (1 - fr) * (1 - Math.abs(look));
      H.jaw.rotation.x = .05 + fr * .6 + Math.sin(t * 20) * .04 * fr + (I.bite || 0) * .7;
      H.tail.forEach((q, i) => { q.rotation.y = Math.sin(t * 1.3 - i * .7) * (.1 + .12 * wk + .08 * fl) * (1 + i * .15); q.rotation.x = -.04 + fl * .06 * Math.sin(t * 2 - i * .5); });
      H.wings.forEach(({ w1, w2, w3, s, fs, bp, bp2 }) => {
        const fold = 1 - fl, fa = DFA;
        w1.rotation.y = s * (fold * 1.35 - fl * .3);
        w1.rotation.z = s * (fold * .7 + fl * (.1 + Math.sin(ph) * .7) + Math.sin(t * 1.5) * .02 * fold);
        w2.rotation.y = -s * fold * 2.6;
        w2.rotation.z = s * fl * Math.sin(ph - .8) * .35;
        w3.rotation.z = s * fl * Math.sin(ph - 1.5) * .3;
        fs.forEach((f, j) => { f.rotation.y = s * lp(fa[j], 2.75 + j * .12, fold); });
        bp.scale.z = bp2.scale.z = lp(1, .2, fold);
      });
      H.fg.visible = fr > .6;
      if (H.fg.visible) H.flames.forEach((m, i) => {
        const u = (t * 1.8 + i / 10) % 1;
        m.position.set(Math.sin(i * 7 + t * 9) * .05 * u * 4, u * .1 + Math.cos(i * 5 + t * 8) * .04, u * 2.8);
        m.scale.setScalar((.3 + u * 1.6) * fr); m.material.color.setHSL(.14 - .12 * u, 1, .55);
        m.rotation.set(t * 3 + i, t * 2 + i, 0);
      });
    }
  };
  update(0, {});
  H.g.userData.DR = { update, kind: wy ? 'wyvern' : 'dragon', H };
  return H.g;
}
