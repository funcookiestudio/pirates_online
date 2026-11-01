/* Modelo da Hidra (protótipo "Prévia da hidra" do Bison, portado para o jogo): corpo de quadrúpede de blocos chanfrados com várias cabeças
   em pescoços de 5 juntas e uma cauda de 8 segmentos. Cada junta vira um único Mesh com cores por vértice (fuse); os chifres, que não mexem,
   são "assados" na cabeça, então cada cabeça custa só 7 peças. A frente do modelo é +z.
   makeHydraFoe(t) devolve o Group; g.userData.HM = { update(dt, I), grow(n), heads } e o enemies.js guarda isso em e.HM.
   I = { mv 0..1 (andando), atk 0..1 (cabeças botando o bote, uma de cada vez), roar 0..1 (rugido / cuspe: cabeças erguidas, bocas abertas), look }.
   A Hidra chefe tem 2 cabeças extras escondidas, que brotam quando ela se enfurece (grow). */

const WHT = 0xf0ead8;
function bb(w, h, d, b, col) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col }));
}
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
  bg.parameters = {};
  grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true })));
}
const gr = (x, y, z, p) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
const bx = (w, h, d, c, x, y, z, p, b) => { const m = bb(w, h, d, b === undefined ? .05 : b, c); m.position.set(x, y, z); p.add(m); return m; };

// nome, escama, escura, barriga, barbatana, chifre, olho
export const HCOATS = [
  ['Pântano', 0x3f6a42, 0x1f3a26, 0xc9c27a, 0x7aa84a, 0xd8cdb0, 0xffe04a], ['Abissal', 0x2f5a7a, 0x16293d, 0xa8c8d8, 0x4a90b8, 0xe8f0f4, 0x7af0ff],
  ['Vulcânica', 0x2c2624, 0x120f0e, 0x7a3a22, 0xd8541a, 0x3a2a24, 0xff7a1a], ['Venenosa', 0x5a3a7a, 0x2a1a40, 0xb8e060, 0x8ae040, 0xe8dcc0, 0xb8ff30],
  ['Pálida', 0xc8c0a8, 0x7a7058, 0xf0ead8, 0xa8403a, 0xe8dcc0, 0xff3a3a],
];
const NBASE = [.9, -.45, .35, .45, -.35], SD = [.5, -.2, .3, .3, .3], RD = [-.3, .2, -.2, -.3, -.2];
const NW = [.5, .44, .38, .33, .28], NL = .62;
const OFF = [.25, .75, 0, .5];
/** Passo de quadrúpede: [rotação do quadril, elevação] */
function gait(u, duty, A, lift) {
  u = ((u % 1) + 1) % 1;
  if (u < duty) { const s = u / duty; return [-A + 2 * A * s, .04 + .2 * Math.max(0, (s - .7) / .3)]; }
  const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s);
  return [A - 2 * A * e, .04 + lift * Math.sin(Math.PI * s)];
}

function buildHydra(ci, nh) {
  const [, C, D, B, WM, HO, EY] = HCOATS[ci];
  const g = new THREE.Group(), HB = new THREE.Group(); HB.position.y = 1.5; g.add(HB);
  // tronco
  bx(1.4, 1.2, 1.8, C, 0, 0, 0, HB, .15); bx(1.35, 1.25, .9, C, 0, .03, 1.25, HB, .15); bx(1.35, 1.15, 1, C, 0, -.02, -1.3, HB, .15);
  bx(1, .2, 3.6, B, 0, -.62, 0, HB, .06);
  for (let i = 0; i < 9; i++) bx(1.05, .05, .12, D, 0, -.73, 1.5 - i * .4, HB, .01);
  for (let i = 0; i < 9; i++) { const z = 1.6 - i * .4, s = .45 - i * .025; bx(.12, s, .3, D, 0, .6 + s / 2, z, HB, .03); }
  for (let i = 0; i < 8; i++)[-1, 1].forEach(x => bx(.2, .1, .22, D, x * .42, .62, 1.5 - i * .4, HB, .02));
  [-1, 1].forEach(s => { bx(.5, .7, .9, C, s * .8, .1, 1.2, HB, .12); bx(.55, .75, 1, C, s * .82, .05, -1.3, HB, .12); bx(.1, .3, .5, D, s * .95, .55, 1.2, HB, .03); });
  // pernas
  const legs = [];
  [[-.85, 1.25, 0], [.85, 1.25, 0], [-.85, -1.3, 1], [.85, -1.3, 1]].forEach(([x, z, hd]) => {
    const h = gr(x, -.35, z, HB), w = hd ? .6 : .5;
    bx(w, .55, w + .1, C, 0, -.27, 0, h, .08);
    const k = gr(0, -.55, 0, h); bx(w - .1, .45, w - .05, C, 0, -.22, 0, k, .06);
    const f = gr(0, -.45, 0, k); bx(w + .05, .15, .65, D, 0, -.07, .12, f, .03);
    [-1, 0, 1].forEach(c => bx(.09, .09, .25, HO, c * .16, -.08, .5, f, .01));
    h.knee = k; h.foot = f; legs.push(h);
  });
  // pescoços e cabeças
  const heads = [];
  for (let k = 0; k < nh; k++) {
    const u = nh > 1 ? k / (nh - 1) - .5 : 0, segs = [];
    const base = gr(u * 1.3, .55, 1.7, HB); base.rotation.y = u * 1.1;
    let par = base;
    for (let i = 0; i < 5; i++) {
      const sg = gr(0, i ? NL : 0, 0, par);
      bx(NW[i], NL + .03, NW[i] + .03, C, 0, NL / 2, 0, sg, .07);
      bx(NW[i] * .6, NL, .05, B, 0, NL / 2, NW[i] / 2 + .01, sg, .02);
      bx(.08, .22, .14, D, 0, NL / 2, -NW[i] / 2 - .04, sg, .02);
      segs.push(sg); par = sg;
    }
    const hd = gr(0, NL, 0, par); hd.scale.setScalar(.85 + (k % 3) * .12);
    bx(.5, .42, .62, C, 0, 0, .25, hd, .09); bx(.34, .28, .6, C, 0, -.06, .78, hd, .06); bx(.36, .08, .3, D, 0, .2, .3, hd, .02);
    bx(.22, .08, .2, D, 0, .1, 1.05, hd, .02); bx(.08, .3, .4, D, 0, .28, 0, hd, .02);
    [-1, 1].forEach(s => {
      bx(.08, .1, .14, EY, s * .27, .12, .38, hd, .01); bx(.06, .06, .06, 0x111111, s * .09, .02, 1.1, hd, .01);
      bx(.05, .2, .06, WHT, s * .14, -.28, .88, hd, .015);
      for (let i = 0; i < 3; i++) bx(.04, .08, .05, WHT, s * .13, -.2, .5 + i * .12, hd, .01);
      bx(.05, .32, .34, WM, s * .3, 0, -.05, hd, .02);
      // chifres: estáticos, então são "assados" direto na cabeça (sem grupos extras)
      const h1 = gr(s * .18, .2, -.02, hd); h1.rotation.x = -1; h1.rotation.z = s * .4; bx(.14, .55, .14, HO, 0, .27, 0, h1, .03);
      const h2 = gr(0, .55, 0, h1); h2.rotation.x = -.5; bx(.1, .4, .1, HO, 0, .2, 0, h2, .02);
    });
    const jw = gr(0, -.2, .05, hd); bx(.36, .1, .78, B, 0, 0, .4, jw, .04); bx(.24, .1, .3, B, 0, 0, .92, jw, .03);
    [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) bx(.04, .1, .05, WHT, s * .14, .08, .35 + i * .15, jw, .01); bx(.05, .16, .06, WHT, s * .1, .1, .95, jw, .01); });
    hd.updateMatrixWorld(true);
    const stat = []; hd.children.forEach(c => { if (c.isGroup && c !== jw) stat.push(c); });
    stat.forEach(sg => { const ms = []; sg.traverse(m => { if (m.isMesh) ms.push(m); }); ms.forEach(m => hd.attach(m)); hd.remove(sg); });
    heads.push({ segs, hd, jw, k, base, grow: 1 });
  }
  // cauda
  const tail = []; let seg = gr(0, .05, -1.75, HB);
  for (let i = 0; i < 8; i++) {
    const w = Math.max(.8 - i * .09, .16); tail.push(seg);
    bx(w, w * .9, .7, C, 0, 0, -.35, seg, .06); bx(w * .7, .05, .7, B, 0, -w * .42, -.35, seg, .01); bx(.1, .2 + w * .3, .2, D, 0, w * .45 + .05, -.35, seg, .02);
    if (i === 7) { bx(.08, .5, .5, D, 0, 0, -.8, seg, .03); bx(.5, .08, .5, D, 0, 0, -.8, seg, .03); }
    seg = gr(0, 0, -.68, seg);
  }
  g.traverse(n => { if (n.isGroup) fuse(n); });
  return { g, HB, legs, heads, tail };
}

/** Modelo da Hidra para o jogo. t.hydra = nº de cabeças visíveis; o chefe (t.boss) tem mais 2 escondidas */
export function makeHydraFoe(t) {
  const coats = t.coats || [0], ci = coats[(Math.random() * coats.length) | 0], nVis = t.hydra, nAll = nVis + (t.boss ? 2 : 0);
  const H = buildHydra(ci, nAll), { g, HB, legs, heads, tail } = H;
  g.rotation.order = 'YXZ';
  const root = new THREE.Group(); root.add(g);
  let tt = Math.random() * 10, ph = Math.random() * 6, wk = 0, at = 0, rr = 0;
  heads.forEach((h, i) => { h.base.visible = i < nVis; h.grow = i < nVis ? 1 : 0; });
  const M = {
    heads, n: nVis,
    /** Faz brotar as cabeças escondidas (chefe enfurecido) */
    grow() { heads.forEach((h, i) => { if (i >= nVis) { h.base.visible = true; h.growing = true; } }); },
    update(dt, I) {
      dt = Math.min(dt, .05); tt += dt;
      const k = Math.min(1, dt * 4);
      wk += ((I.mv || 0) - wk) * k; at += ((I.atk || 0) - at) * k; rr += ((I.roar || 0) - rr) * k;
      ph += dt * (2 + wk * 2.5);
      legs.forEach((l, i) => {
        const [hip, kn] = gait(ph / 6.283 - OFF[i], .65, .35, .7), hx = hip * wk, kx = .03 + (kn - .03) * wk;
        l.rotation.x = hx; l.knee.rotation.x = kx; l.foot.rotation.x = -(hx + kx) * .5;
      });
      HB.position.y = 1.5 + Math.cos(ph * 2) * .03 * wk + Math.sin(tt * 1.5) * .01;
      HB.rotation.z = Math.sin(ph) * .025 * wk; HB.rotation.x = Math.sin(ph * 2) * .012 * wk;
      heads.forEach(({ segs, hd, jw, k: hk, base }, idx) => {
        const h = heads[idx];
        if (h.growing) { h.grow = Math.min(1, h.grow + dt * .8); if (h.grow >= 1) h.growing = false; }
        if (!base.visible) return;
        const gs = h.grow, p0 = hk * 1.3, st = Math.pow(Math.max(0, Math.sin(tt * 2.2 - hk * 1.1)), 3) * at;
        base.scale.setScalar(.15 + .85 * gs * gs * (3 - 2 * gs));
        segs.forEach((sg, i) => {
          sg.rotation.x = NBASE[i] + Math.sin(tt * .8 + p0 + i * .6) * .08 + st * SD[i] + rr * RD[i];
          sg.rotation.y = Math.sin(tt * .5 + p0 + i * .5) * .12 * (1 - st) + Math.sin(ph - i * .5 + hk) * .05 * wk + (I.look || 0) * .05 * (i + 1) * .4;
        });
        hd.rotation.x = -.6 + Math.sin(tt * .7 + p0) * .05 + st * .3 - rr * .2;
        jw.rotation.x = .05 + Math.max(0, Math.sin(tt * .7 + p0) - .9) * 3 + st * .6 + rr * (.55 + Math.sin(tt * 18 + hk) * .05);
      });
      tail.forEach((q, i) => { q.rotation.y = Math.sin(tt * 1.1 - i * .6) * (.1 + .1 * wk) * (1 + i * .1); q.rotation.x = -.02; });
    },
  };
  root.userData.HM = M;
  return root;
}
