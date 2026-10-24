/* Armas extras (45): lâminas de uma mão, lâminas de duas mãos, contundentes/improvisadas e armas de arremesso.
   Modelos portados das prévias "Armas low poly". Convenção do jogo: empunhadura na origem, a ponta/cabeça aponta para -y
   e o fio fica em -z (para onde o golpe corta). `wrap` converte o modelo da prévia (ponta em +y, fio em +x) para essa convenção.

   Campos de balanceamento (além de b/rng/cd/mul/arc de weapons.js):
   lv = nível mínimo de item para cair/ser vendida · shop = vendida na vila · rare = só cai lendária (qualidade 3)
   two = duas mãos (ocupa a mão 2) · chop = golpe de cima para baixo · bleed/stun = chance de efeito · crit = crítico extra
   thrown = arremesso (vai no espaço de arma de longa distância); fx = efeito do projétil */

const T = THREE;
const mk = (c, r, m, e, o) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m, flatShading: true, emissive: e || 0, emissiveIntensity: e ? 1 : 0, transparent: !!o, opacity: o || 1 });
const M = {
  steel: mk(0xcbd4dc, .4, .7), dark: mk(0x8a949e, .5, .6), brass: mk(0xc9a24a, .4, .7), wood: mk(0x7a4a26, .8, 0), dwood: mk(0x4a2c18, .85, 0),
  leather: mk(0x2e1d12, .9, 0), red: mk(0x7a1f1f, .8, 0), iron: mk(0x59636d, .55, .6), blk: mk(0x4a525c, .45, .7), myth: mk(0x3a4660, .3, .8),
  rune: mk(0x66ccff, .3, 0, 0x2299dd), gem: mk(0xff4466, .3, 0, 0xaa1133), stone: mk(0x7d7f84, .9, .05), lead: mk(0x6a707a, .6, .4),
  cord: mk(0xb59a6a, .95, 0), ceramic: mk(0x3a2a52, .4, .1), smoke: mk(0xa77be0, .9, 0, 0x5a2aa0, .7), runeP: mk(0xd6a8ff, .3, 0, 0x9b4dff),
  spark: mk(0xffa030, .3, 0, 0xff7a10), paper: mk(0xe8dcc0, .9, 0), cork: mk(0xb08a58, .9, 0), rust: mk(0x8a4a2a, .7, .3),
};
M.glass = new T.MeshStandardMaterial({ color: 0x2f8a55, roughness: .15, metalness: .1, flatShading: true, transparent: true, opacity: .7 });

const mesh = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; };
const bx = (w, h, d, m, x, y, z) => mesh(new T.BoxGeometry(w, h, d), m, x, y, z);
const cy = (r, h, m, x, y, z, s) => mesh(new T.CylinderGeometry(r, r, h, s || 7), m, x, y, z);
const cone = (r, h, m, x, y, z, s) => mesh(new T.ConeGeometry(r, h, s || 5), m, x, y, z);
const lathe = (p, seg) => new T.LatheGeometry(p.map(a => new T.Vector2(a[0], a[1])), seg || 7);
const K = v => () => v;

/** Lâmina extrudada: perfil por t (0..1) — wb = largura do dorso, we = largura do fio; c = curvatura; ts = onde começa a ponta */
function blade(o) {
  const n = o.n || 10, L = o.L, ts = o.ts || .82, c = o.c || 0, wb = o.wb, we = o.we, B = [], E = [];
  const tip = t => t > ts ? Math.max(0, (1 - t) / (1 - ts)) : 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = tip(t), sp = c * t * t, y = L * t;
    B.push([sp - wb(t, i) * k, y]);
    const e = we(t, i) * k;
    if (!(i == n && e + wb(t, i) * k < 1e-6)) E.push([sp + e, y]);
  }
  const pts = B.concat(E.reverse()), s = new T.Shape();
  pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const th = o.th || .008;
  const g = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * .5, bevelSize: th * .4, bevelSegments: 1 });
  g.translate(0, 0, -th / 2);
  return mesh(g, o.bm || M.steel);
}

/** Espada: cabo, guarda (c = reta, cup = concha, disc = disco, bow = arco, hook = ganchos, gem), pomo e lâmina */
function sword(o) {
  const g = new T.Group(), big = !!o.big, gl = o.grip || (big ? .25 : .12), gr = o.gr || (big ? .02 : .016), gw = o.gw || (big ? .25 : .13);
  g.add(mesh(new T.CylinderGeometry(gr, gr * .88, gl, 6), o.gm || (big ? M.leather : M.wood), 0, gl / 2, 0));
  const wr = big ? 6 : 4;
  for (let i = 1; i < wr; i++) g.add(mesh(new T.CylinderGeometry(gr * 1.12, gr * 1.12, big ? .01 : .008, 6), big ? M.dwood : M.leather, 0, gl * i / wr, 0));
  const pm = o.pm || M.brass;
  if (o.pom == 's') g.add(mesh(new T.SphereGeometry(o.pr || (big ? .035 : .026), 6, 4), pm, 0, big ? -.015 : -.012, 0));
  if (o.pom == 'd') g.add(mesh(new T.CylinderGeometry(o.pr || (big ? .04 : .03), o.pr || (big ? .04 : .03), big ? .025 : .02, 8), pm, 0, big ? -.012 : -.01, 0));
  if (o.pom == 'b') g.add(mesh(new T.BoxGeometry(.04, .03, .03), pm, 0, -.015, 0));
  const gm = o.gmat || (big ? M.dark : M.brass);
  (o.guard || []).forEach(q => {
    if (q == 'c') g.add(mesh(new T.BoxGeometry(o.gw || gw, big ? .026 : .022, big ? .035 : .03), gm, 0, gl + (big ? .013 : .011), 0));
    if (q == 'cup') { const h = mesh(new T.SphereGeometry(o.cr || .055, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), gm, 0, gl, 0); h.material = gm.clone(); h.material.side = T.DoubleSide; g.add(h); }
    if (q == 'disc') g.add(mesh(new T.CylinderGeometry(o.dr || .05, o.dr || .05, .012, 8), gm, 0, gl + .006, 0));
    if (q == 'bow') { const r = gl / 2, t = mesh(new T.TorusGeometry(r, .007, 4, 7, Math.PI), gm, 0, r, 0); t.rotation.z = -Math.PI / 2; g.add(t); }
    if (q == 'hook') { const h = o.hk || .09; [-1, 1].forEach(s => g.add(mesh(new T.BoxGeometry(.02, h, .03), gm, s * gw / 2, gl + .026 + h / 2, 0))); }
    if (q == 'gem') g.add(mesh(new T.OctahedronGeometry(.03), M.gem, 0, gl + .04, 0));
  });
  const b = blade(o.b); b.position.y = gl + (big ? .03 : .012); g.add(b);
  if (o.glow) g.add(mesh(new T.BoxGeometry(.012, o.b.L * .65, o.b.th * 1.9), M.rune, 0, gl + .03 + o.b.L * .4, 0));
  g.userData.hold = gl * .5;
  return g;
}

/** Machado de mão (prévia 1) */
function handAxe() {
  const g = new T.Group();
  g.add(cy(.018, .38, M.wood, 0, .19, 0, 6));
  for (let i = 1; i < 5; i++) g.add(cy(.02, .008, M.leather, 0, .04 + i * .04, 0, 6));
  g.add(mesh(new T.SphereGeometry(.026, 6, 4), M.dwood, 0, -.01, 0));
  g.add(cy(.024, .07, M.dark, 0, .34, 0, 6));
  const s = new T.Shape();
  [[.02, .30], [.02, .40], [.05, .405], [.11, .44], [.125, .35], [.11, .26], [.05, .295]].forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const th = .026, ge = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: .006, bevelSize: .005, bevelSegments: 1 });
  ge.translate(0, 0, -th / 2); g.add(mesh(ge, M.steel));
  g.add(bx(.03, .05, .03, M.dark, -.03, .35, 0));
  g.userData.hold = .1;
  return g;
}

/** Machado de duas mãos / duplo (prévia 2) */
function bigAxe(o) {
  const g = new T.Group(), len = o.len || 1.1;
  g.add(cy(.022, len, M.wood, 0, len / 2, 0, 6).translateY(0));
  g.children[0].geometry = new T.CylinderGeometry(.022, .018, len, 6);
  for (let i = 1; i < 7; i++) g.add(cy(.026, .012, M.leather, 0, .05 + i * .07, 0, 6));
  g.add(mesh(new T.SphereGeometry(.032, 6, 4), M.dwood, 0, -.01, 0));
  g.add(cy(.03, .1, M.blk, 0, len - .06, 0, 6));
  const s = new T.Shape();
  [[.02, -.14], [.02, .14], [.06, .16], [.17, .23], [.23, .1], [.23, -.1], [.17, -.23], [.06, -.16]].forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const th = .03, ge = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: .007, bevelSize: .006, bevelSegments: 1 });
  ge.translate(0, 0, -th / 2);
  const hy = len - .16;
  g.add(mesh(ge, M.steel, 0, hy, 0));
  if (o.dbl) { const b = mesh(ge, M.steel, 0, hy, 0); b.scale.x = -1; g.add(b); }
  else g.add(mesh(new T.ConeGeometry(.03, .2, 5), M.dark, -.11, hy, 0).rotateZ(Math.PI / 2));
  g.userData.hold = len * .3;
  return g;
}

// ---- contundentes ----
function handle(g, len, r, m) {
  g.add(mesh(new T.CylinderGeometry(r, r * .88, len, 6), m || M.wood, 0, len / 2, 0));
  for (let i = 1; i < 5; i++) g.add(cy(r * 1.12, .008, M.leather, 0, len * i / 5, 0, 6));
}
function radial(g, n, fn) { for (let i = 0; i < n; i++) { const r = new T.Group(); r.rotation.y = i * Math.PI * 2 / n; r.add(fn(i)); g.add(r); } }

// ---- arremesso ----
function poly(pts, th, m) {
  const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const g = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * .3, bevelSize: th * .25, bevelSegments: 1 }); g.translate(0, 0, -th / 2);
  return mesh(g, m || M.steel);
}
function link(a, b, r, m) {
  const d = new T.Vector3().subVectors(b, a), len = d.length();
  const c = new T.Mesh(new T.CylinderGeometry(r, r, len, 4), m || M.cord);
  c.position.copy(a).addScaledVector(d, .5);
  c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return c;
}
function wraps(g, r, y0, y1, n, m) { for (let i = 0; i < n; i++) g.add(cy(r * 1.15, .007, m || M.leather, 0, y0 + (y1 - y0) * i / (n - 1), 0, 7)); }
const H = (g, h) => { g.userData.hold = h; return g; };

/** Catálogo: [chave, nome, modelo, escala, fio em -z?, estatísticas] */
const S1 = o => () => sword(o);
const CAT = [
  // ---------- lâminas de uma mão ----------
  ['Sabre de abordagem', S1({ grip: .13, guard: ['c', 'bow'], gw: .12, pom: 's', b: { L: .72, c: .09, wb: K(.008), we: t => .026 - .008 * t, th: .008 } }), 1.25, { b: 3, rng: 2.4, cd: .45, mul: 1.05, arc: 2, lv: 3 }],
  ['Cutelo naval', S1({ grip: .11, guard: ['disc'], dr: .055, pom: 'd', gm: M.dwood, b: { L: .45, c: .04, ts: .75, wb: K(.012), we: t => .04 + .008 * Math.sin(t * 3), th: .012 } }), 1.25, { b: 3, rng: 2.1, cd: .55, mul: 1.25, arc: 2, lv: 3 }],
  ['Espada curta', S1({ grip: .1, guard: ['c'], gw: .1, pom: 's', b: { L: .46, ts: .6, wb: t => .02 * (1 + .5 * Math.sin(Math.PI * t)), we: t => .02 * (1 + .5 * Math.sin(Math.PI * t)), th: .008 } }), 1.3, { b: 2, rng: 2.1, cd: .38, mul: .8, arc: 1.9, lv: 1, shop: 1 }],
  ['Espada de marinheiro', S1({ grip: .12, guard: ['c'], gw: .13, gmat: M.dark, pm: M.dark, pom: 's', b: { L: .7, ts: .9, wb: K(.014), we: K(.014), th: .008 } }), 1.25, { b: 3, rng: 2.3, cd: .5, mul: 1.1, arc: 1.9, lv: 2, shop: 1 }],
  ['Rapieira', S1({ grip: .11, guard: ['cup', 'c'], cr: .06, gw: .17, pom: 's', gm: M.leather, b: { L: .98, ts: .96, wb: K(.008), we: K(.008), th: .006 } }), 1.2, { b: 3, rng: 2.9, cd: .34, mul: .85, arc: .8, lv: 6 }],
  ['Florete fino', S1({ grip: .1, guard: ['cup'], cr: .04, pom: 's', pr: .02, gm: M.red, b: { L: .9, ts: .97, wb: K(.006), we: K(.006), th: .005 } }), 1.2, { b: 2, rng: 2.8, cd: .32, mul: .78, arc: .7, lv: 4 }],
  ['Adaga de oficial', S1({ grip: .09, gr: .013, guard: ['c'], gw: .08, pom: 's', pr: .02, b: { L: .27, ts: .5, wb: t => .008 + .014 * Math.sin(Math.PI * Math.pow(t, .7)), we: t => .008 + .014 * Math.sin(Math.PI * Math.pow(t, .7)), th: .007 } }), 1.5, { b: 2, rng: 1.7, cd: .26, mul: .5, arc: 1.6, lv: 2, shop: 1, crit: .08 }],
  ['Dirk escocês', S1({ grip: .1, guard: ['disc'], dr: .045, pom: 'd', pr: .034, gm: M.dwood, b: { L: .33, ts: .8, wb: K(.012), we: K(.012), th: .01 } }), 1.45, { b: 3, rng: 1.8, cd: .3, mul: .62, arc: 1.5, lv: 5, crit: .08 }],
  ['Adaga curva', S1({ grip: .09, gr: .013, guard: ['c'], gw: .055, pom: 's', pr: .02, b: { L: .25, c: .07, ts: .6, wb: K(.006), we: t => .026 * (1 - .2 * t), th: .008 } }), 1.5, { b: 3, rng: 1.7, cd: .25, mul: .55, arc: 1.7, lv: 6, bleed: .15 }],
  ['Faca de caça', S1({ grip: .11, gr: .015, guard: ['c'], gw: .05, pom: 's', pr: .02, b: { L: .22, ts: .85, wb: t => t < .65 ? .012 : .012 * Math.max(0, 1 - (t - .65) / .35), we: K(.02), th: .006 } }), 1.5, { b: 2, rng: 1.6, cd: .28, mul: .5, arc: 1.5, lv: 1, shop: 1 }],
  ['Faca de marinheiro', S1({ grip: .1, gr: .02, guard: [], gm: M.dwood, b: { L: .17, ts: .85, wb: K(0), we: K(.022), th: .006 } }), 1.6, { b: 1, rng: 1.5, cd: .3, mul: .5, arc: 1.5, lv: 1, shop: 1 }],
  ['Faca de açougueiro', S1({ grip: .11, guard: [], gm: M.dwood, b: { L: .27, ts: .88, wb: K(0), we: K(.04), th: .005 } }), 1.5, { b: 3, rng: 1.7, cd: .4, mul: .85, arc: 1.6, lv: 3 }],
  ['Faca kukri', S1({ grip: .11, guard: ['disc'], dr: .03, pom: 'd', pr: .026, b: { L: .34, c: .06, ts: .85, wb: K(.012), we: t => .012 + .04 * Math.sin(Math.PI * Math.min(1, t * .9 + .05)), th: .012 } }), 1.4, { b: 4, rng: 1.9, cd: .5, mul: 1.2, arc: 2, lv: 8, bleed: .1 }],
  ['Machado de mão', handAxe, 1.3, { b: 4, rng: 2.1, cd: .8, mul: 1.6, arc: 2.4, lv: 4, chop: 1, imp: .2 }],
  ['Sabre serrilhado', S1({ grip: .13, guard: ['c', 'bow'], gw: .12, pom: 's', gmat: M.dark, pm: M.dark, b: { L: .64, c: .08, n: 26, ts: .9, wb: K(.008), we: (t, i) => .02 + (i % 2 ? .011 : 0), th: .008 } }), 1.25, { b: 4, rng: 2.4, cd: .5, mul: 1.15, arc: 2, lv: 10, bleed: .25 }],
  // ---------- lâminas de duas mãos ----------
  ['Espadão', S1({ big: 1, grip: .3, gw: .3, guard: ['c'], pom: 'd', b: { L: 1.1, ts: .85, wb: K(.04), we: K(.04), th: .012 } }), 1.1, { b: 6, rng: 2.7, cd: 1, mul: 2.6, arc: 2.6, lv: 10, two: 1 }],
  ['Montante', S1({ big: 1, grip: .36, gw: .52, guard: ['c', 'hook'], hk: .1, pom: 's', b: { L: 1.3, ts: .9, wb: K(.035), we: K(.035), th: .012 } }), 1.05, { b: 7, rng: 3, cd: 1.15, mul: 3, arc: 3, lv: 14, two: 1 }],
  ['Espada bastarda', S1({ big: 1, grip: .2, gw: .2, guard: ['c'], pom: 'd', pr: .032, gm: M.dwood, b: { L: .9, ts: .75, wb: t => .03 - .01 * t, we: t => .03 - .01 * t, th: .01 } }), 1.15, { b: 5, rng: 2.5, cd: .8, mul: 2, arc: 2.4, lv: 8, two: 1 }],
  ['Espada longa', S1({ big: 1, grip: .22, gw: .22, guard: ['c'], pom: 's', b: { L: 1.02, ts: .85, wb: t => .028 - .008 * t, we: t => .028 - .008 * t, th: .01 } }), 1.15, { b: 5, rng: 2.6, cd: .75, mul: 1.9, arc: 2.3, lv: 7, two: 1 }],
  ['Nodachi', S1({ big: 1, grip: .46, gr: .017, guard: ['disc'], dr: .05, pom: null, b: { L: 1.45, c: .1, n: 14, ts: .95, wb: K(.007), we: K(.018), th: .009 } }), 1.0, { b: 7, rng: 3.1, cd: .95, mul: 2.7, arc: 2.8, lv: 14, two: 1, bleed: .15 }],
  ['Alfanje pesado', S1({ big: 1, grip: .22, gw: .2, guard: ['c', 'hook'], hk: .05, pom: 'd', b: { L: .95, c: .12, ts: .85, wb: K(.014), we: t => .035 + .03 * t, th: .014 } }), 1.1, { b: 6, rng: 2.4, cd: .9, mul: 2.4, arc: 2.8, lv: 12, two: 1 }],
  ['Machado de duas mãos', () => bigAxe({ len: 1.15 }), 1.1, { b: 7, rng: 2.4, cd: 1.2, mul: 3.4, arc: 2.8, lv: 12, two: 1, chop: 1, imp: .28 }],
  ['Machado duplo', () => bigAxe({ len: 1.05, dbl: true }), 1.1, { b: 8, rng: 2.5, cd: 1.3, mul: 3.9, arc: 3.4, lv: 18, two: 1, chop: 1, imp: .3 }],
  ['Lâmina de execução', S1({ big: 1, grip: .32, gw: .2, guard: ['c'], gm: M.red, pom: 'd', pr: .045, b: { L: 1.05, ts: 1, bm: M.blk, wb: K(.045), we: K(.045), th: .015 } }), 1.05, { b: 9, rng: 2.7, cd: 1.6, mul: 5.4, arc: 2.4, lv: 22, two: 1, crit: .12 }],
  ['Espada colossal lendária', S1({ big: 1, grip: .5, gr: .024, gw: .55, guard: ['c', 'hook', 'gem'], hk: .16, pom: 'd', pr: .05, glow: true, b: { L: 1.9, n: 16, ts: .92, bm: M.myth, wb: K(.065), we: (t, i) => .07 * (1 - .25 * t) + (i % 2 ? .012 : 0), th: .02 } }), .9, { b: 12, rng: 3.3, cd: 1.5, mul: 6, arc: 3.4, lv: 30, two: 1, rare: 1, crit: .1 }],
  // ---------- contundentes e improvisadas ----------
  ['Porrete de madeira', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.017, 0], [.018, .15], [.028, .28], [.045, .42], [.05, .53], [.038, .58], [0, .59]]), M.wood)); for (let i = 1; i < 4; i++) g.add(cy(.021, .01, M.leather, 0, .03 + i * .035, 0, 7)); g.add(bx(.03, .03, .02, M.dwood, .04, .38, .035)); g.add(bx(.025, .025, .02, M.dwood, -.03, .2, -.03)); return H(g, .09); }, 1.25, { b: 1, rng: 2, cd: .55, mul: 1.1, arc: 2, lv: 1, shop: 1 }],
  ['Cavilha naval', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.012, 0], [.02, .02], [.014, .07], [.011, .15], [.02, .23], [.032, .29], [.034, .33], [.022, .37], [0, .385]], 8), M.dwood)); g.add(cy(.0215, .012, M.brass, 0, .22, 0, 8)); return H(g, .09); }, 1.5, { b: 2, rng: 1.9, cd: .5, mul: 1.1, arc: 1.9, lv: 2, shop: 1 }],
  ['Cassetete de marinheiro', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.016, 0], [.02, .03], [.02, .2], [.032, .27], [.036, .31], [0, .325]], 7), M.leather)); for (let i = 1; i < 7; i++) g.add(cy(.022, .008, M.dwood, 0, i * .035, 0, 7)); g.add(mesh(new T.SphereGeometry(.03, 6, 4), M.dwood, 0, -.01, 0)); g.add(mesh(new T.TorusGeometry(.04, .005, 4, 8), M.leather, 0, -.045, 0)); return H(g, .08); }, 1.5, { b: 2, rng: 1.7, cd: .3, mul: .6, arc: 1.7, lv: 2, stun: .1 }],
  ['Maça de ferro', () => { const g = new T.Group(); handle(g, .42, .018); g.add(mesh(new T.SphereGeometry(.03, 6, 4), M.dwood, 0, -.01, 0)); g.add(cy(.04, .14, M.iron, 0, .5, 0, 8)); radial(g, 6, () => bx(.045, .14, .012, M.iron, .052, .5, 0)); g.add(mesh(new T.ConeGeometry(.03, .07, 6), M.iron, 0, .605, 0)); g.add(cy(.028, .03, M.iron, 0, .44, 0, 8)); return H(g, .12); }, 1.25, { b: 4, rng: 2, cd: .8, mul: 1.8, arc: 2.2, lv: 6, chop: 1, imp: .2, stun: .12 }],
  ['Martelo de ferreiro', () => { const g = new T.Group(); handle(g, .46, .017); g.add(bx(.14, .075, .075, M.iron, 0, .5, 0)); g.add(bx(.04, .075, .075, M.iron, .09, .5, 0)); const p = mesh(new T.ConeGeometry(.036, .1, 4), M.iron, -.115, .5, 0); p.rotation.z = Math.PI / 2; p.rotation.x = Math.PI / 4; g.add(p); g.add(bx(.06, .01, .085, M.dwood, 0, .46, 0)); return H(g, .12); }, 1.25, { b: 4, rng: 1.9, cd: .9, mul: 2, arc: 2.2, lv: 6, chop: 1, imp: .22 }],
  ['Martelo de convés', () => { const g = new T.Group(); handle(g, .52, .02); g.add(mesh(new T.SphereGeometry(.03, 6, 4), M.dwood, 0, -.01, 0)); const h = cy(.065, .26, M.dwood, 0, .58, 0, 8); h.rotation.z = Math.PI / 2; g.add(h); [-.1, .1].forEach(x => { const r = cy(.07, .025, M.iron, x, .58, 0, 8); r.rotation.z = Math.PI / 2; g.add(r); }); return H(g, .14); }, 1.2, { b: 5, rng: 2.1, cd: 1.1, mul: 2.7, arc: 2.6, lv: 10, chop: 1, imp: .26 }],
  ['Clava com pregos', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.018, 0], [.02, .14], [.04, .3], [.055, .42], [.058, .5], [.04, .55], [0, .56]]), M.wood)); [.34, .41, .48].forEach((y, k) => radial(g, 6, () => { const c = mesh(new T.ConeGeometry(.01, .05, 4), M.rust, .058 + (k == 0 ? -.012 : 0), y, 0); c.rotation.z = -Math.PI / 2; const q = new T.Group(); q.add(c); q.rotation.y = k * .5; return q; })); g.add(mesh(new T.ConeGeometry(.01, .05, 4), M.rust, 0, .58, 0)); for (let i = 1; i < 4; i++) g.add(cy(.022, .008, M.leather, 0, i * .03, 0, 7)); return H(g, .09); }, 1.25, { b: 4, rng: 2.1, cd: .7, mul: 1.5, arc: 2.2, lv: 5, bleed: .2 }],
  ['Chave inglesa pesada', () => { const g = new T.Group(); g.add(bx(.034, .4, .016, M.iron, 0, .2, 0)); g.add(bx(.1, .035, .02, M.iron, 0, .41, 0)); g.add(bx(.032, .1, .02, M.iron, -.034, .46, 0)); g.add(bx(.032, .075, .02, M.iron, .034, .4, 0)); g.add(bx(.032, .05, .02, M.iron, .034, .5, 0)); const s = cy(.012, .1, M.steel, 0, .37, 0, 6); s.rotation.z = Math.PI / 2; g.add(s); g.add(cy(.022, .03, M.iron, 0, 0, 0, 6)); return H(g, .1); }, 1.3, { b: 3, rng: 1.9, cd: .6, mul: 1.3, arc: 2, lv: 4 }],
  ['Garrafa de vidro', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.04, 0], [.046, .02], [.046, .2], [.032, .27], [.016, .33], [.018, .345], [.022, .355], [.018, .36]], 8), M.glass)); g.add(cy(.0475, .08, M.paper, 0, .1, 0, 8)); g.add(cy(.014, .03, M.cork, 0, .345, 0, 6)); g.add(mesh(new T.ConeGeometry(.012, .06, 4), M.glass, .03, .02, .02)); g.rotation.x = Math.PI; g.position.y = .36; const w = new T.Group(); w.add(g); return H(w, .03); }, 1.6, { b: 1, rng: 1.6, cd: .4, mul: 1.4, arc: 1.6, lv: 1, crit: .15 }],
  ['Soco-inglês', () => { const g = new T.Group(); for (let i = 0; i < 4; i++) { const x = -.054 + i * .036; g.add(mesh(new T.TorusGeometry(.016, .006, 4, 8), M.brass, x, 0, 0)); g.add(mesh(new T.SphereGeometry(.014, 5, 4), M.brass, x, .026, 0)); } g.add(bx(.14, .012, .03, M.brass, 0, .018, 0)); g.add(bx(.14, .012, .03, M.brass, 0, -.018, 0)); g.add(bx(.012, .075, .03, M.brass, -.07, 0, 0)); const pb = mesh(new T.TorusGeometry(.03, .008, 4, 8, Math.PI), M.brass, 0, -.03, 0); pb.rotation.z = Math.PI; g.add(pb); g.rotation.z = Math.PI / 2; const w = new T.Group(); w.add(g); return H(w, 0); }, 2.4, { b: 3, rng: 1.3, cd: .24, mul: .5, arc: 1.5, lv: 3, crit: .15, fist: 1 }],
  // ---------- armas de arremesso (espaço de arma de longa distância) ----------
  ['Faca de arremesso', () => { const g = new T.Group(); g.add(cy(.011, .09, M.leather, 0, .045, 0, 6)); wraps(g, .011, .015, .08, 4); g.add(mesh(new T.TorusGeometry(.012, .003, 4, 8), M.iron, 0, -.012, 0)); g.add(poly([[-.014, .09], [-.017, .15], [0, .28], [.017, .15], [.014, .09]], .006)); g.add(bx(.03, .007, .012, M.iron, 0, .092, 0)); return H(g, .05); }, 1.6, { b: 2, rng: 8, cd: .45, mul: .7, sp: 28, lv: 1, shop: 1, thrown: 1, hp: [0, .06], ml: .3 }],
  ['Adaga de arremesso', () => { const g = new T.Group(); g.add(cy(.012, .1, M.dwood, 0, .05, 0, 6)); wraps(g, .012, .015, .09, 5, M.brass); g.add(mesh(new T.SphereGeometry(.017, 5, 4), M.brass, 0, -.012, 0)); g.add(bx(.06, .01, .016, M.brass, 0, .104, 0)); g.add(poly([[-.012, .11], [-.016, .2], [0, .34], [.016, .2], [.012, .11]], .011)); g.add(bx(.003, .2, .014, M.iron, 0, .22, 0)); return H(g, .05); }, 1.5, { b: 3, rng: 9, cd: .55, mul: .9, sp: 30, lv: 4, thrown: 1, hp: [0, .06], ml: .35 }],
  ['Machado de arremesso', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.017, 0], [.014, .1], [.012, .28], [.014, .36], [0, .37]], 6), M.wood)); wraps(g, .015, .02, .12, 4); g.add(poly([[.012, .27], [.012, .36], [.04, .365], [.08, .395], [.09, .325], [.08, .255], [.04, .28]], .016)); g.add(bx(.03, .04, .026, M.iron, -.02, .32, 0)); return H(g, .08); }, 1.5, { b: 4, rng: 7, cd: .8, mul: 1.5, sp: 24, lv: 6, thrown: 1, tumble: 1, hp: [0, .06], ml: .35 }],
  ['Tomahawk', () => { const g = new T.Group(); g.add(mesh(lathe([[0, 0], [.018, 0], [.019, .06], [.013, .2], [.012, .35], [.015, .45], [0, .46]], 6), M.wood)); g.add(poly([[.012, .33], [.012, .44], [.05, .45], [.12, .475], [.135, .385], [.12, .295], [.05, .325]], .014)); g.add(cy(.02, .05, M.iron, 0, .39, 0, 6)); g.add(cone(.014, .1, M.iron, -.07, .395, 0, 4).rotateZ(Math.PI / 2)); g.add(mesh(new T.TorusGeometry(.012, .003, 4, 6), M.cord, 0, .02, 0)); g.add(bx(.008, .06, .01, M.brass, 0, .12, 0)); return H(g, .09); }, 1.4, { b: 4, rng: 8, cd: .7, mul: 1.3, sp: 26, lv: 8, thrown: 1, tumble: 1, hp: [0, .06], ml: .4 }],
  ['Dardo metálico', () => { const g = new T.Group(); g.add(cy(.0055, .14, M.iron, 0, .07, 0, 6)); g.add(cone(.009, .09, M.steel, 0, .185, 0, 6)); for (let k = 0; k < 3; k++) { const q = new T.Group(); q.rotation.y = k * Math.PI * 2 / 3; q.add(poly([[0, 0], [.03, -.02], [.03, .03], [0, .07]], .003, M.iron)); g.add(q); } g.add(cy(.0085, .02, M.brass, 0, .12, 0, 6)); return H(g, .06); }, 2.6, { b: 2, rng: 10, cd: .3, mul: .5, sp: 36, lv: 2, shop: 1, thrown: 1, hp: [0, .05], ml: .3 }],
  ['Azagaia', () => { const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(.012, .011, 1.2, 6), M.wood, 0, .6, 0)); g.add(cy(.017, .1, M.iron, 0, 1.2, 0, 6)); g.add(poly([[-.02, 1.2], [-.028, 1.29], [0, 1.42], [.028, 1.29], [.02, 1.2]], .009)); g.add(bx(.003, .2, .012, M.iron, 0, 1.3, 0)); g.add(cone(.012, .05, M.iron, 0, -.02, 0, 5).rotateX(Math.PI)); wraps(g, .012, .5, .66, 4, M.cord); const t = mesh(new T.TorusGeometry(.03, .003, 4, 8), M.cord, 0, .58, 0); t.rotation.x = Math.PI / 2; g.add(t); return H(g, .58); }, 1.1, { b: 5, rng: 11, cd: 1, mul: 1.9, sp: 34, lv: 9, thrown: 1, hp: [0, .1], ml: 1.1 }],
  ['Lança curta', () => { const g = new T.Group(); g.add(mesh(new T.CylinderGeometry(.017, .016, 1, 7), M.wood, 0, .5, 0)); g.add(cy(.024, .14, M.iron, 0, 1, 0, 7)); g.add(poly([[-.035, 1], [-.05, 1.12], [0, 1.32], [.05, 1.12], [.035, 1]], .012)); g.add(bx(.004, .26, .02, M.iron, 0, 1.14, 0)); wraps(g, .017, .4, .6, 6); g.add(cone(.02, .08, M.iron, 0, -.04, 0, 6).rotateX(Math.PI)); g.add(cy(.02, .02, M.iron, 0, .02, 0, 7)); return H(g, .5); }, 1.1, { b: 6, rng: 9, cd: 1.1, mul: 2.3, sp: 30, lv: 12, thrown: 1, hp: [0, .1], ml: 1 }],
  ['Boleadeiras', () => { const g = new T.Group(); g.add(mesh(new T.SphereGeometry(.018, 5, 4), M.leather, 0, 0, 0)); for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + .4, e = new T.Vector3(Math.cos(a) * .42, -.12 + k * .03, Math.sin(a) * .42); const mid = e.clone().multiplyScalar(.5).add(new T.Vector3(0, .035, 0)); g.add(link(new T.Vector3(), mid, .004)); g.add(link(mid, e, .004)); g.add(mesh(new T.SphereGeometry(.04, 7, 5), k == 1 ? M.leather : M.stone, e.x, e.y, e.z)); const t = mesh(new T.TorusGeometry(.04, .004, 4, 8), M.cord, e.x, e.y, e.z); t.rotation.y = a; g.add(t); } return H(g, 0); }, 1.0, { b: 3, rng: 8, cd: 1.2, mul: .8, sp: 22, lv: 7, thrown: 1, spin: 1, fx: { stun: 1.5 }, hp: [0, .06], ml: .3 }],
  ['Rede de captura', () => { const g = new T.Group(), N = 7, P = []; for (let i = 0; i < N; i++) { P[i] = []; for (let j = 0; j < N; j++) { const x = (i / (N - 1) - .5), y = (j / (N - 1) - .5); P[i][j] = new T.Vector3(x, y, (x * x + y * y) * .5 - .06); } } for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (i < N - 1) g.add(link(P[i][j], P[i + 1][j], .004)); if (j < N - 1) g.add(link(P[i][j], P[i][j + 1], .004)); if (i == 0 || j == 0 || i == N - 1 || j == N - 1) { const p = P[i][j]; g.add(mesh(new T.SphereGeometry(.022, 5, 4), M.lead, p.x, p.y, p.z)); } } g.rotation.x = Math.PI / 2; const w = new T.Group(); w.add(g); return H(w, 0); }, 1.0, { b: 1, rng: 7, cd: 3, mul: .2, sp: 20, lv: 5, thrown: 1, spin: 1, fx: { stun: 3 }, hp: [0, .06], ml: .3 }],
  ['Bomba de fumaça fantástica', () => { const g = new T.Group(); g.add(mesh(new T.SphereGeometry(.07, 8, 6), M.ceramic, 0, 0, 0)); const b = mesh(new T.TorusGeometry(.07, .006, 4, 10), M.brass, 0, 0, 0); b.rotation.x = Math.PI / 2; g.add(b); g.add(mesh(new T.CylinderGeometry(.02, .026, .03, 7), M.brass, 0, .075, 0)); g.add(cy(.004, .06, M.cord, 0, .12, 0, 4)); g.add(mesh(new T.SphereGeometry(.008, 4, 3), M.spark, 0, .155, 0)); const t = mesh(new T.TorusGeometry(.073, .004, 4, 12), M.runeP, 0, 0, 0); t.rotation.set(.9, 0, .4); g.add(t); [[0, .25, 0, .07], [.07, .33, .02, .055], [-.06, .37, -.03, .05]].forEach(p => g.add(mesh(new T.IcosahedronGeometry(p[3], 0), M.smoke, p[0], p[1], p[2]))); return H(g, .03); }, 1.8, { b: 2, rng: 8, cd: 2.5, mul: .6, sp: 20, lv: 9, thrown: 1, spin: 1, sl: 1, fx: { stun: 1.5 }, hp: [0, .06], ml: .3 }],
];

/** Converte o modelo da prévia para a convenção do jogo: ponta em -y, fio em -z, empunhadura na origem, escala S */
function wrap(model, S) {
  const inner = new T.Group();
  inner.rotation.order = 'YXZ';
  inner.rotation.set(Math.PI, Math.PI / 2, 0);        // vira a ponta para -y e leva o fio (+x) para -z
  inner.position.y = (model.userData.hold || 0);       // a mão fica nesta altura do cabo (contada a partir da base)
  inner.add(model);
  const g = new T.Group();
  g.add(inner);
  g.scale.setScalar(S);
  return g;
}

/** Armas extras prontas para anexar a WEAPONS */
export const EXTRA = CAT.map(([n, mkModel, S, st]) => ({
  n, rng: 2.2, cd: .5, mul: 1, arc: 1.8, ...st,
  gun: st.thrown ? 1 : undefined,
  build: () => wrap(mkModel(), S),
}));
