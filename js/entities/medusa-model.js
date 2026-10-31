/* Medusa (chefe de 2 fases): modelo de blocos chanfrados e animação, portado do protótipo medusa_v2.
   Fase 1 = humana encapuzada (pernas, saia e capuz que esconde as cobras).
   Fase 2 = meia serpente (cauda de serpente no lugar das pernas, cabelo de cobras que se soltam no alerta, cobras nos braços).
   makeMedusa() devolve { g, st, phase(n), update(dt, I) }; a frente do modelo é +z, como os outros personagens. */
import { K } from './human.js';

const GOLD = 0xe0b84a;
const mx = Math.max, mn = Math.min, lp = (a, b, u) => a + (b - a) * u;
const sm = (a, b, x) => { const k = mn(1, mx(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/* escamas (pares de cores) e olhos: verde com olhos âmbar, como o padrão do protótipo */
const PAL = [[0x4f7a45, 0x8cae5a], [0x3a5e38, 0x6f9a50], [0x8aa85a, 0xb8c57a], [0x2f4a30, 0x4f7a45]];
const EYE = 0xe0a820, EYE_GLOW = 0xb8ff40;
const SKIN_C = 0xd8d5e0, DARK = 0x15111a, PLUM = 0x39304a;

/* cauda: spline em metros (sem K); y = 0 é o chão */
const LIFT = 1.20, FLOOR_Y = .06, TSEG = 56, LAM = 1.5, WA = .85;
const TCURVE = new THREE.CatmullRomCurve3([
  [0, 2.2, 0], [0, 1.2, .32], [.3, .45, .9], [1.15, .3, .45], [1.0, .3, -.7],
  [.1, .3, -1.25], [-1.05, .3, -.75], [-1.15, .32, .35], [-.55, .4, 1.0], [-.3, .6, 1.05],
].map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
const tw = u => lp(.62, .06, Math.pow(u, .85));   // largura do bloco da cauda
const HUM_Y = .05, HUM_SC = 1.3;

/* vetores de trabalho (compartilhados: a atualização é síncrona) */
const _aw = new THREE.Vector3(), _ctr = new THREE.Vector3(), _Z = new THREE.Vector3(0, 0, 1), _d = new THREE.Vector3();
const _T1 = new THREE.Vector3(), _N1 = new THREE.Vector3(), _B1 = new THREE.Vector3(), _L1 = new THREE.Vector3(), _W1 = new THREE.Vector3();
const _M1 = new THREE.Matrix4();

/** Corpo de uma fase. `hum` = humana encapuzada; senão, meia serpente */
function buildBody(hum) {
  const root = new THREE.Group();
  const mats = new Map();
  const mat = c => { let m = mats.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); } return m; };
  const bb = (w, h, d, b, col, own) => {
    const sh = new THREE.Shape(), xh = w / 2 - b, yh = h / 2 - b;
    sh.moveTo(-xh, -yh); sh.lineTo(xh, -yh); sh.lineTo(xh, yh); sh.lineTo(-xh, yh); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: mx(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    return new THREE.Mesh(geo, own ? new THREE.MeshLambertMaterial({ color: col }) : mat(col));
  };
  /* funde os blocos parados de um grupo numa malha só (cores por vértice) */
  const fuse = (grp, keep) => {
    const meshes = grp.children.filter(c => c.isMesh && !keep.has(c));
    if (meshes.length < 2) return;
    const pos = [], nor = [], col = [];
    meshes.forEach(m => {
      m.updateMatrix();
      const g = m.geometry.clone().applyMatrix4(m.matrix), n = g.attributes.position.count, c = m.material.color;
      for (const v of g.attributes.position.array) pos.push(v);
      for (const v of g.attributes.normal.array) nor.push(v);
      for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b);
      grp.remove(m); m.geometry.dispose(); g.dispose();
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true })));
  };
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const B = { root, hum, SN: [], AG: 0, HIPX: 0, WPH: 0, tail: null };

  /* ── torso humano (sem pernas) ── */
  function buildUpper(d) {
    const SKIN = d.skin;
    const P = new THREE.Group();
    const Bx = (w, h, dd, b, c) => bb(w * K, h * K, dd * K, b * K, c);
    const put = (m, x, y, z, p) => { m.position.set(x * K, y * K, z * K); (p || P).add(m); return m; };
    const at = (o, x, y, z) => { o.position.set(x * K, y * K, z * K); return o; };
    const keep = new Set();
    put(Bx(1.1, .55, .78, .13, d.b), 0, 1.95, 0);
    put(Bx(.86, .5, .66, .11, d.b), 0, 1.50, 0);
    put(Bx(.9, .16, .7, .05, d.fi), 0, 2.20, 0);
    put(Bx(.9, .14, .7, .04, d.belt), 0, 1.30, 0);
    put(Bx(.22, .18, .06, .03, GOLD), 0, 1.30, .38);
    function arm(x) {
      const sh = at(new THREE.Group(), x, 2.1, 0); P.add(sh);
      const elb = at(new THREE.Group(), 0, -.42, 0); sh.add(elb);
      put(Bx(.42, .50, .46, .09, d.u), 0, -.20, 0, sh);
      put(Bx(.34, .32, .38, .07, d.f), 0, -.18, 0, elb);
      put(Bx(.34, .30, .38, .07, SKIN), 0, -.46, 0, elb);
      sh.fa = elb; return sh;
    }
    const armR = arm(-.74), armL = arm(.74);
    const head = at(new THREE.Group(), 0, 2.2, 0); P.add(head);
    put(Bx(1.12, 1.02, 1.02, .2, SKIN), 0, .55, 0, head);
    const LK = d.look, ez = .53, ey = .56;
    const lids = [-.28, .28].map(x => put(Bx(.27, .27, .05, .02, SKIN), x, ey, ez + .065, head));
    put(Bx(.24, .08, .05, .02, LK.brow), -.28, ey + .2, ez, head);
    put(Bx(.24, .08, .05, .02, LK.brow), .28, ey + .2, ez, head);
    put(Bx(.24, .24, .05, .02, 0xf4f4f0), -.28, ey, ez - .01, head);
    put(Bx(.24, .24, .05, .02, 0xf4f4f0), .28, ey, ez - .01, head);
    const eyeMat = new THREE.MeshLambertMaterial({ color: LK.eye });   // própria: brilha no olhar petrificante
    const eyeR = put(Bx(.14, .22, .06, .03, LK.eye), -.28, ey, ez + .02, head); eyeR.material = eyeMat;
    const eyeL = put(Bx(.14, .22, .06, .03, LK.eye), .28, ey, ez + .02, head); eyeL.material = eyeMat;
    put(Bx(.05, .07, .04, .02, 0xffffff), -.25, ey + .05, ez + .06, head);
    put(Bx(.05, .07, .04, .02, 0xffffff), .31, ey + .05, ez + .06, head);
    put(Bx(.18, .07, .04, .02, 0xf08a9c), -.4, .36, .53, head);
    put(Bx(.18, .07, .04, .02, 0xf08a9c), .4, .36, .53, head);
    put(Bx(.28, .07, .06, .03, LK.lip), 0, .26, .53, head);
    put(Bx(.14, .12, .10, .04, SKIN), 0, .42, .54, head);
    const up = new THREE.Group(); up.position.set(0, 1.1 * K, 0); P.add(up);
    P.updateMatrixWorld(true);
    P.children.slice().forEach(o => { if (o !== up) up.attach(o); });
    Object.assign(P, { arm: armR, armL, up, head, eyeL, eyeR, lids, eyeMat });
    [eyeL, eyeR, ...lids].forEach(m => keep.add(m));
    P.traverse(n => { if (n.isGroup && n !== P) fuse(n, keep); });
    return P;
  }

  const look = { eye: EYE, lip: hum ? 0xa01c3c : 0x2a1626, brow: 0x2a2430 };   // fase humana: batom vermelho
  const P = buildUpper({ b: 0x211a2b, fi: PLUM, u: SKIN_C, f: SKIN_C, skin: SKIN_C, belt: 0x3a2860, look });
  P.rotation.order = 'YXZ';
  P.position.set(0, hum ? HUM_Y : LIFT, 0);
  P.scale.setScalar(hum ? HUM_SC : 1);
  root.add(P);
  B.P = P;

  /* blocos decorativos parados vão para grupos que depois viram uma malha só */
  const upDeco = new THREE.Group(), headDeco = new THREE.Group();
  P.up.add(upDeco); P.head.add(headDeco);
  const ubk = (w, h, d, b, col, x, y, z, rx, ry, rz) => { const m = bb(w * K, h * K, d * K, b * K, col); m.position.set(x * K, (y - 1.1) * K, z * K); m.rotation.set(rx || 0, ry || 0, rz || 0); upDeco.add(m); return m; };
  const hbk = (w, h, d, col, x, y, z, rx, ry, rz, live) => { const m = bb(w * K, h * K, d * K, mn(w, h, d) * .18 * K, col); m.position.set(x * K, y * K, z * K); m.rotation.set(rx || 0, ry || 0, rz || 0); (live ? P.head : headDeco).add(m); return m; };

  /* torso */
  const GOWN = 0x1f4d3a, GOWN2 = 0x163829;   // vestido longo verde-esmeralda com detalhes dourados (fase humana)
  if (hum) {
    ubk(1.14, .52, .82, .12, GOWN, 0, 1.92, 0);                                    // corpete
    ubk(.94, .4, .74, .08, GOWN2, 0, 1.5, 0);                                      // cintura marcada (espartilho)
    for (let i = 0; i < 4; i++) ubk(.2, .03, .04, .01, GOLD, 0, 1.38 + i * .08, .385, 0, 0, i % 2 ? .6 : -.6);   // amarração dourada
    [-1, 1].forEach(sx => {
      ubk(.28, .4, .05, .02, SKIN_C, sx * .12, 2.02, .42, 0, 0, sx * .38);         // decote em V
      ubk(.08, .34, .06, .02, GOLD, sx * .4, 2.2, .3, 0, 0, sx * .15);              // alcinhas douradas
    });
    ubk(.16, .2, .05, .02, SKIN_C, 0, 2.12, .42);
    ubk(.12, .12, .06, .02, 0x58c070, 0, 1.86, .43, 0, 0, .78);                    // broche de esmeralda no decote
  } else {
  ubk(.52, .34, .05, .02, SKIN_C, 0, 2.02, .405);
  ubk(.90, .34, .70, .05, SKIN_C, 0, 1.50, 0);
  for (let i = 0; i < 5; i++) ubk(.045, .30, .04, .01, DARK, (i - 2) * .16, 1.50, .37, 0, 0, (rnd() - .5) * .3);
  for (let i = 0; i < 16; i++) {
    const x = (rnd() - .5) * 1.0, y = 1.75 + rnd() * .55, hh = .14 + rnd() * .2;
    ubk(.06 + rnd() * .04, hh, .07, .02, rnd() < .5 ? DARK : PLUM, x, y, .42, 0, 0, (rnd() - .5) * 1.4);
  }
  ubk(.5, .1, .5, .03, DARK, -.58, 2.27, 0);
  ubk(.5, .1, .5, .03, DARK, .58, 2.27, 0);
  }
  if (!hum) for (let i = 0; i < 12; i++) {      // trapos na transição cintura → cauda
    const a = i / 12 * 6.283, hh = .20 + rnd() * .20;
    ubk(.13, hh, .10, .03, i % 2 ? 0x2a2236 : DARK, Math.sin(a) * .52, .88 - hh / 2 + .05, Math.cos(a) * .42, 0, 0, (rnd() - .5) * .3);
  }
  /* rosto */
  hbk(.36, .20, .06, 0x4a3560, -.28, .7, .5);
  hbk(.36, .20, .06, 0x4a3560, .28, .7, .5);
  hbk(.04, .22, .04, 0x2a2236, -.5, .42, .52, 0, 0, .3);
  hbk(.04, .22, .04, 0x2a2236, .5, .42, .52, 0, 0, -.3);
  hbk(.04, .18, .04, 0x2a2236, .45, .20, .52, 0, 0, .2);
  if (!hum) {
    for (let i = 0; i < 9; i++) {
      const x = -.5 + i * .125, hh = .18 + rnd() * .18;
      hbk(.07, hh, .07, rnd() < .5 ? 0x4a3a2e : 0x2e2420, x, .9 + rnd() * .1, .46 + rnd() * .06, .3, 0, (rnd() - .5) * .8);
    }
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283 + rnd() * .3, r = .12 + rnd() * .38, hh = .28 + rnd() * .3;
      hbk(.08, hh, .08, rnd() < .5 ? 0x5c4a3a : 0x2e2420, Math.sin(a) * r, 1.06 + hh * .35, Math.cos(a) * r, Math.cos(a) * .5, 0, -Math.sin(a) * .5);
    }
  }
  /* veias no braço (só na serpente) */
  if (!hum) for (let i = 0; i < 14; i++) {
    const m = bb(.05 * K, (.12 + rnd() * .14) * K, .04 * K, .01 * K, 0x1c1624), side = rnd() < .5;
    m.position.set((side ? .235 : (rnd() - .5) * .35) * K, -(.06 + rnd() * .34) * K, (side ? (rnd() - .5) * .38 : .25) * K);
    m.rotation.set(0, 0, (rnd() - .5) * 1.6); P.armL.add(m);
  }

  if (hum) {
    /* pernas (quadril > joelho > pé), saia e capuz com "caroços" das cobras escondidas */
    const PL = 0x39304a, LT = 0x4a3560, ST = 0x211a2b;
    const pt = (m, x, y, z, p) => { m.position.set(x * K, y * K, z * K); p.add(m); return m; };
    const Bk = (w, h, d, bv, c) => bb(w * K, h * K, d * K, bv * K, c);
    B.legs = [-.26, .26].map(x => {
      const hip = new THREE.Group(); hip.position.set(x * K, 1.1 * K, 0); P.add(hip);
      pt(Bk(.4, .5, .44, .09, SKIN_C), 0, -.2, 0, hip);                              // pernas à mostra pela fenda do vestido
      const knee = new THREE.Group(); knee.position.set(0, -.45 * K, 0); hip.add(knee);
      pt(Bk(.34, .42, .38, .08, SKIN_C), 0, -.2, 0, knee);
      const foot = new THREE.Group(); foot.position.set(0, -.42 * K, 0); knee.add(foot);
      pt(Bk(.36, .2, .66, .06, DARK), 0, -.02, .16, foot);                            // sandália de salto
      pt(Bk(.1, .22, .1, .03, GOLD), 0, -.14, -.12, foot);
      pt(Bk(.38, .05, .4, .02, GOLD), 0, .1, .1, foot);
      return { hip, knee, foot };
    });
    /* saia longa até o chão, em camadas que abrem embaixo, fenda na frente da perna direita e cauda arrastando atrás */
    const skirt = new THREE.Group(); P.add(skirt); B.skirt = skirt;
    const sk = (w, h, d, c, x, y, z, rx, rz) => { const m = Bk(w, h, d, mn(w, h, d) * .16, c); m.position.set(x * K, y * K, z * K); m.rotation.set(rx || 0, 0, rz || 0); skirt.add(m); };
    const tier = (w, h, d, y, c, slit) => {
      if (!slit) { sk(w, h, d, c, 0, y, 0); return; }
      sk(w, h, d * .55, c, 0, y, -d * .225);                                          // metade de trás
      sk(w / 2, h, d * .5, c, -w / 4, y, d * .25);                                     // frente esquerda
      sk(.18, h, d * .5, c, .09, y, d * .25);                                          // frente direita, antes da fenda
      const ow = w / 2 - .38; sk(ow, h, d * .5, c, .38 + ow / 2, y, d * .25, 0, -.06); // depois da fenda, abrindo
    };
    tier(1.04, .36, .78, 1.2, GOWN);                                                  // quadril
    ubk(1.0, .1, .76, .03, GOLD, 0, 1.31, 0);                                         // cinto dourado
    ubk(.16, .16, .06, .03, 0x58c070, 0, 1.31, .4);
    tier(1.12, .4, .84, .88, GOWN2, true);
    tier(1.24, .4, .92, .5, GOWN, true);
    tier(1.44, .32, 1.06, .17, GOWN2, true);
    sk(1.5, .06, 1.1, GOLD, 0, .03, -.05);                                             // barra dourada
    sk(1.2, .12, .8, GOWN2, 0, .06, -.8);                                              // cauda do vestido
    sk(.86, .08, .6, GOWN, 0, .04, -1.35);
    [-1, 1].forEach(sx => { sk(.06, 1.0, .06, GOWN2, sx * .3, .55, -.47); sk(.06, .9, .06, GOWN2, sx * .58, .45, .1, 0, sx * .05); });   // pregas
    fuse(skirt, new Set());
    /* braceletes dourados e delineado */
    [P.arm, P.armL].forEach(a => { const m = Bk(.46, .08, .5, .03, GOLD); m.position.set(0, -.12 * K, 0); a.add(m); const c = Bk(.38, .07, .42, .03, GOLD); c.position.set(0, -.32 * K, 0); a.fa.add(c); });
    [-1, 1].forEach(sx => { hbk(.16, .04, .04, DARK, sx * .44, .66, .54, 0, 0, sx * .45); hbk(.24, .03, .04, DARK, sx * .28, .69, .55); });
    /* capuz de pano: folgado em volta da cabeça, copa arredondada com a ponta caindo para trás, borda verde emoldurando o rosto */
    const FD = 0x2a2236, TR = 0x4f7a45;
    hbk(1.42, 1.3, .3, PL, 0, .6, -.7, -.1, 0, 0);                                   // costas
    [-1, 1].forEach(sx => {
      hbk(.26, 1.28, 1.25, PL, sx * .74, .56, -.06, 0, 0, -sx * .1);                // laterais, abrindo embaixo
      hbk(.1, 1.0, .9, FD, sx * .62, .58, .05, 0, 0, -sx * .1);                    // forro escuro (sombra ao lado do rosto)
      hbk(.17, 1.0, .18, TR, sx * .68, .55, .6, 0, 0, -sx * .12);                  // borda lateral
      hbk(.5, .24, .22, PL, sx * .45, -.12, .58, 0, 0, sx * .3);                   // dobra do pescoço na frente
    });
    hbk(1.42, .3, 1.3, PL, 0, 1.18, -.08);                                         // copa
    hbk(1.12, .26, 1.08, PL, 0, 1.36, -.2);
    hbk(.74, .22, .72, PL, 0, 1.5, -.34);
    hbk(1.24, .17, .2, TR, 0, 1.12, .62, -.25, 0, 0);                             // borda sobre a testa, caída
    hbk(.46, .4, .44, PL, 0, 1.44, -.74, .6, 0, 0);                               // ponta do capuz caindo para trás
    hbk(.3, .34, .32, PL, 0, 1.2, -1.02, 1.0, 0, 0);
    hbk(.18, .26, .2, FD, 0, .96, -1.18, 1.3, 0, 0);
    hbk(1.6, .32, 1.2, FD, 0, -.12, -.05);                                         // pano juntando no pescoço
    /* capa curta sobre os ombros, com a barra em tiras */
    ubk(2.05, .28, 1.12, .1, PL, 0, 2.3, -.04);
    ubk(1.95, .9, .14, .05, PL, 0, 1.92, -.52);
    [-1, 1].forEach(sx => { ubk(.62, .62, .14, .05, PL, sx * .5, 2.02, .46, 0, 0, sx * .22); ubk(.2, .62, .9, .05, PL, sx * 1.0, 2.0, -.04, 0, 0, sx * .12); });
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * .55 + i / 10 * Math.PI * .9, hh = .22 + rnd() * .18;
      ubk(.2, hh, .1, .03, i % 2 ? PL : FD, Math.cos(a) * .98, 1.5 - hh / 2, -Math.abs(Math.sin(a)) * .55, 0, 0, (rnd() - .5) * .25);
    }
    B.lumps = [[.35, 1.3, -.25], [-.4, 1.28, .05], [0, 1.44, -.45], [.55, 1.05, -.45], [-.58, 1.0, -.35]].map(p => hbk(.3, .3, .3, LT, p[0], p[1], p[2], 0, 0, 0, true));
  }
  fuse(upDeco, new Set()); fuse(headDeco, new Set());

  if (!hum) {
    /* ── cobras (cabelo e braços) ── */
    const makeSnake = (parent, N, w0, w1, pal, fn, axis) => {
      const segs = [];
      for (let i = 0; i < N; i++) {
        const w = lp(w0, w1, i / (N - 1)) * K;
        const m = bb(w, w * .88, 1, mn(.03 * K, w * .2), pal[i % 2]);
        parent.add(m); segs.push(m);
      }
      const hd = new THREE.Group(); parent.add(hd);
      const hw = mx(w1 * 1.8, .26) * K;
      const hb = bb(hw, hw * .7, hw * 1.5, hw * .14, pal[0]); hb.position.z = hw * .5; hd.add(hb);
      [-1, 1].forEach(s => { const e = bb(hw * .2, hw * .2, hw * .2, .004, 0xf2c230); e.position.set(s * hw * .37, hw * .2, hw * .6); hd.add(e); });
      const tg = bb(hw * .1, hw * .04, hw * .55, .002, 0xb02838); tg.position.set(0, -hw * .12, hw * 1.25); hd.add(tg);
      const pts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
      const o = { segs, hd, N, fn, pts };
      o.update = t => {
        for (let i = 0; i <= N; i++) fn(i / N, t, pts[i]);
        for (let i = 0; i < N; i++) {
          _d.subVectors(pts[i + 1], pts[i]);
          const len = _d.length() || 1e-4; _d.divideScalar(len);
          segs[i].position.copy(pts[i]).add(pts[i + 1]).multiplyScalar(.5);
          segs[i].quaternion.setFromUnitVectors(_Z, _d);
          segs[i].scale.z = len * 1.15;
        }
        const e = pts[N];
        if (axis) _aw.set(e.x, e.y, e.z).sub(_ctr.set(0, e.y, 0));
        else _aw.copy(e).sub(_ctr.set(0, .55 * K, 0));
        if (_aw.lengthSq() < 1e-6) _aw.copy(_d);
        if (fn.st && fn.st.dir) _aw.normalize().lerp(fn.st.dir, fn.st.w).normalize();
        const cc = fn.st ? fn.st.c : 0;
        _aw.normalize().multiplyScalar(.85 * (1 - cc)).addScaledVector(_d, .15 + .85 * cc).normalize();
        hd.position.copy(e); hd.quaternion.setFromUnitVectors(_Z, _aw);
        tg.scale.z = .3 + 1.3 * mx(0, Math.sin(t * 6 + e.x * 30));
      };
      o.update(0); B.SN.push(o); return o;
    };
    const crownFn = (a, r0, y0, rho, pm, sig, amp, sd) => (s, t, o) => {
      const ph = s * pm, dd = r0 + sig * rho * (1 - Math.cos(ph)), h = y0 + rho * Math.sin(ph);
      const am = amp * (1 + B.AG * .9);
      const sw = Math.sin(s * 7 + t * 1.6 + sd) * am * s, rd = Math.sin(s * 5 + t * 1.2 + sd * 2) * am * .4 * s;
      o.set((dd + rd) * Math.sin(a) + sw * Math.cos(a), h + Math.sin(s * 4 + t * 1.1 + sd) * am * .25 * s, (dd + rd) * Math.cos(a) - sw * Math.sin(a)).multiplyScalar(K);
    };
    const drapeFn = (a, r0, y0, D, drop, amp, sd) => (s, t, o) => {
      const am = amp * (1 + B.AG * .9);
      const dd = r0 + D * (1 - Math.exp(-3.5 * s)), h = y0 + .5 * Math.sin(s * 2.5) * (1 - s) - drop * s * s;
      const sw = Math.sin(s * 6 + t * 1.4 + sd) * am * s, rd = Math.sin(s * 4 + t + sd) * am * .5 * s;
      o.set((dd + rd) * Math.sin(a) + sw * Math.cos(a), h, (dd + rd) * Math.cos(a) - sw * Math.sin(a)).multiplyScalar(K);
    };
    /* cabelo: enrolado sobre a cabeça; solta no alerta (AG) com atraso por cobra */
    const hairSnake = (parent, N, w0, w1, pal, free, a0, p0, p1, th, dl, pk) => {
      if (typeof pk === 'number') th = mx(.9, mn(3.6, ((pk - a0) % 6.2832 + 6.2832) % 6.2832));
      const st = { c: 1, w: 1, dir: pk ? new THREE.Vector3(0, 0, 1) : null }, cp = new THREE.Vector3();
      const fn = (s, t, o) => {
        free(s, t, o);
        const k = sm(dl, dl + .55, B.AG); st.c = (1 - k) * (pk ? .05 : 1); st.w = 1 - k;
        if (k < 1) {
          const a = a0 + th * s + .05 * s * Math.sin(t * .9 + a0 * 3), fr = mx(0, 1 - Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / .9);
          const ph = mx(.12, lp(p0, p1, s) - .3 * fr), R = .85 * Math.sin(ph);
          if (pk && s > .99) st.dir.set(Math.sin(a), .3, Math.cos(a)).normalize();
          const pe = pk ? sm(.68, 1, s) : 0, R2 = R + .16 * pe, sw = .07 * pe * Math.sin(t * 1.1 + a0 * 4);
          cp.set(R2 * Math.sin(a) + sw * Math.cos(a), .5 + .85 * Math.cos(ph) + .03 * s * Math.sin(t * 1.3 + a0 * 5) + .6 * pe * pe, R2 * Math.cos(a) - sw * Math.sin(a)).multiplyScalar(K);
          o.lerp(cp, 1 - k);
        }
      };
      fn.st = st;
      return makeSnake(parent, N, w0, w1, pal, fn);
    };
    const holdFn = (y0, y1, T, ph0, dx) => {
      const fn = (s, t, o) => {
        const ang = T * 6.283 * s + ph0, r = lp(.33, .15, s), w = sm(.78, 1, s);
        o.set(lp(r * Math.cos(ang), 0, w), lp(y0, y1, s) + .02 * Math.sin(t * 1.5 + s * 6) * (1 - w), lp(r * Math.sin(ang), .06, w)).multiplyScalar(K);
      };
      fn.st = { c: 0, w: 1, dir: new THREE.Vector3(dx, .25, 1).normalize() };
      return fn;
    };
    for (let i = 0; i < 13; i++) {
      const a = i / 13 * 6.283 + (rnd() - .5) * .3;
      const front = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < .9, big = i % 3 === 0;
      const rho = front ? .28 + rnd() * .12 : (big ? .6 + rnd() * .25 : .35 + rnd() * .25);
      const pm = front ? 3.1 + rnd() * .5 : (big ? 4.4 + rnd() * .7 : 3.4 + rnd() * 1.0);
      const sig = front ? -1 : (rnd() < .8 ? 1 : -1);
      const r0 = front ? .5 : .28 + rnd() * .25, y0 = front ? .88 : .95 + rnd() * .1, p0 = 1.12 - (front ? .22 : 0);
      hairSnake(P.head, 14, big ? .3 : .24, .1, PAL[i % PAL.length], crownFn(a, r0, y0, rho, pm, sig, .12 + rnd() * .1, rnd() * 6), a, p0, p0 - .45, 2.6, (i % 5) * .09, i % 3 === 2 ? [2.6, 3.68, 5.18, 1.1][(i - 2) / 3] : false);
    }
    for (let i = 0; i < 3; i++) hairSnake(P.head, 15, .26, .1, PAL[(i + 1) % PAL.length], crownFn(i * 2.1 + .7, .08, 1.0, .8 + rnd() * .3, 4.0 + rnd() * .8, rnd() < .5 ? 1 : -1, .1, rnd() * 6), i * 2.1 + .7, .62, .2, 3.0, i * .08, false);
    for (let i = 0; i < 6; i++) hairSnake(P.head, 17, .26, .1, PAL[i % PAL.length], drapeFn(3.14 + (i - 2.5) * .36, .5, .55 + rnd() * .15, .55 + rnd() * .35, 1.4 + rnd() * .9, .14 + rnd() * .08, rnd() * 6), 3.14 + (i - 2.5) * .36, 1.45, 1.15, 2.2, .12 + i * .04, false);
    makeSnake(P.armL, 12, .28, .14, PAL[0], holdFn(-.04, -.88, 1.5, .5, -.2), true);
    makeSnake(P.arm, 10, .24, .12, PAL[2], holdFn(-.3, -.88, 1.1, 0, .2), true);

    /* ── cauda: blocos alternando as 2 cores, seguindo a spline ── */
    const tg = new THREE.Group(), tm = [];
    for (let i = 0; i < TSEG; i++) { const w = tw((i + .5) / TSEG), m = bb(w, w * .88, 1, mn(.05, w * .18), PAL[0][i % 2]); tg.add(m); tm.push(m); }
    root.add(tg);
    const tp = Array.from({ length: TSEG + 1 }, () => new THREE.Vector3());
    B.tail = (t, wv, rv) => {
      const spd = 1.8 + rv * .9;
      for (let i = 0; i <= TSEG; i++) {
        const u = i / TSEG, p = tp[i], hx = B.HIPX * Math.pow(1 - u, 3);
        TCURVE.getPoint(u, p); TCURVE.getTangent(u, _T1);
        _L1.set(-_T1.z, 0, _T1.x); if (_L1.lengthSq() > 1e-6) _L1.normalize();
        const a = (.05 + rv * .10) * mn(1, mx(0, (u - .2) / .4)) * (.3 + .7 * u) * (1 - wv);
        p.addScaledVector(_L1, Math.sin(u * 13 - t * spd) * a);
        p.x += hx; p.y += rv * .55 * Math.pow(u, 3);
        if (wv > .001) {   // rastro atrás do corpo: cada ponto segue a mesma trilha do chão
          const e = mn(1, u / .22), zz = 3.0 * Math.pow(u, 1.3);
          const wx = WA * sm(.1, .45, u) * (1 - .3 * u) * Math.sin(6.2832 * (zz - B.WPH) / LAM);
          p.lerp(_W1.set(wx + hx, .3 + 1.9 * (1 - e) * (1 - e), -zz), wv);
        }
        p.y = mx(p.y, tw(u) * .5 + FLOOR_Y);
      }
      _N1.set(1, 0, 0);
      for (let i = 0; i < TSEG; i++) {
        _d.subVectors(tp[i + 1], tp[i]);
        const len = _d.length() || 1e-4; _d.divideScalar(len);
        _N1.addScaledVector(_d, -_N1.dot(_d)).normalize();
        _B1.crossVectors(_d, _N1);
        const m = tm[i];
        m.position.copy(tp[i]).add(tp[i + 1]).multiplyScalar(.5);
        _M1.makeBasis(_N1, _B1, _d); m.quaternion.setFromRotationMatrix(_M1);
        m.scale.z = len * 1.2;
      }
    };
    B.tail(0, 0, 0);
  }
  return B;
}

/**
 * Cria a Medusa (começa na fase 1). update(dt, I) com I = {
 *   mv: 0..1 (vontade de andar), dist: distância andada no quadro (em unidades do modelo), rage: 0..1 (alerta: solta as cobras / agita o capuz),
 *   arm: alvo do ângulo dos braços (ou null), lean: inclinação extra do tronco, glow: 0..1 (olhos acesos), rise: 0..1 (a serpente surgindo) }
 */
export function makeMedusa() {
  const g = new THREE.Group();
  const st = { phase: 1, walk: 0, rage: 0, slide: 0, animT: 0, gT: Math.random() * 10, blinkT: 2.5, blinkD: 0, ar: 0, ln: 0 };
  const bodies = [buildBody(true), null];
  g.add(bodies[0].root);
  const M = { g, st, bodies };
  const glowCol = new THREE.Color(), baseCol = new THREE.Color(EYE), hot = new THREE.Color(EYE_GLOW);

  /** Troca de fase (2 = meia serpente; o corpo da serpente só é montado na hora) */
  M.phase = n => {
    if (n === 2 && !bodies[1]) { bodies[1] = buildBody(false); g.add(bodies[1].root); }
    st.phase = n;
    bodies.forEach((b, i) => { if (b) b.root.visible = i === n - 1; });
  };

  M.update = (dt, I) => {
    const B = bodies[st.phase - 1], P = B.P, HUM = B.hum;
    const k = mn(1, dt * 5);
    st.walk += ((I.mv || 0) - st.walk) * k;
    st.rage += ((I.rage || 0) - st.rage) * k;
    const walk_v = st.walk, rage_v = st.rage;
    B.AG = rage_v;
    st.gT += dt;
    st.slide += I.dist || 0; B.WPH = st.slide;
    st.animT += dt * (1.0 + rage_v * 1.8 + walk_v * .5);
    const gT = st.gT, slide = st.slide, br = Math.sin(gT * 1.6);
    const legph = 6.2832 * slide / 1.45;
    const swing = HUM ? Math.sin(legph) : Math.sin(6.2832 * (.3 - slide) / LAM);
    const armSwing = swing * (HUM ? .45 : .12) * walk_v, latLean = swing * .12 * walk_v;

    /* braços: balanço do passo, ou o golpe (garras) quando I.arm vem definido */
    const ak = 1 - Math.exp(-dt * (I.fast ? 26 : 11));
    st.ar += ((I.arm != null ? 1 : 0) - st.ar) * ak;
    st.atk = I.arm != null ? I.arm : (st.atk || 0);
    const wa = st.ar, ax = st.atk;
    P.arm.rotation.set(lp(armSwing + (HUM ? 0 : .25) * walk_v + br * .01, ax, wa), 0, -.10 - rage_v * .12 - wa * .15);
    P.armL.rotation.set(lp(-armSwing + (HUM ? 0 : .25) * walk_v - br * .01, ax, wa), 0, .10 + rage_v * .12 + wa * .15);
    P.arm.fa.rotation.set(-.5 * wa, 0, 0);
    P.armL.fa.rotation.set(-.5 * wa, 0, 0);

    /* tronco */
    st.ln += ((I.lean || 0) - st.ln) * (1 - Math.exp(-dt * 12));
    P.up.rotation.set(br * .012 + rage_v * .06 + walk_v * (HUM ? .07 : .2) + st.ln, latLean, swing * .05 * walk_v + Math.sin(gT * .5) * .015);
    const sway = Math.sin(st.animT * (1.8 + rage_v * .9)) * (.02 + .03 * rage_v) * (1 - walk_v) + swing * .07 * walk_v;
    B.HIPX = latLean * .04 + sway;
    P.up.position.set(B.HIPX, 1.1 * K + br * .005, 0);

    /* cabeça (no olhar petrificante, encara de frente) */
    const gl = I.glow || 0;
    P.head.rotation.y = (Math.sin(gT * .4) * .22 * (1 - rage_v) * (1 - .6 * walk_v) - latLean * .6) * (1 - gl);
    P.head.rotation.x = Math.sin(gT * .6) * .03 + rage_v * .18 - walk_v * (HUM ? .05 : .16) - gl * .1;
    P.head.rotation.z = Math.sin(gT * .35) * .04;

    /* piscar (não pisca enquanto encara) e olhos acesos */
    st.blinkT -= dt;
    if (st.blinkT <= 0) { st.blinkD = .13; st.blinkT = 2 + Math.random() * 3.5; }
    let by = 1; if (st.blinkD > 0 && gl < .05) { st.blinkD -= dt; by = .1; }
    P.lids.forEach(l => l.scale.y = mx(.001, 1 - by));
    glowCol.copy(baseCol).lerp(hot, gl);
    P.eyeMat.color.copy(glowCol);
    P.eyeMat.emissive.setRGB(hot.r * gl * .9, hot.g * gl * .9, hot.b * gl * .9);
    const sc = (HUM ? HUM_SC : 1);
    P.eyeL.scale.setScalar(1 + gl * .35); P.eyeR.scale.setScalar(1 + gl * .35);

    /* altura do corpo; a serpente "surge" do chão na transformação */
    const rise = I.rise == null ? 1 : I.rise;
    P.position.y = HUM ? HUM_Y + .035 * Math.abs(Math.cos(legph)) * walk_v : LIFT * rise;
    B.root.scale.set(1, HUM ? 1 : .35 + .65 * rise, 1);
    P.scale.setScalar(sc);
    if (HUM) {
      B.legs.forEach((l, i) => {
        const ph = legph + i * Math.PI;
        const hx = -.4 * Math.sin(ph) * walk_v, kx = .9 * mx(0, Math.cos(ph)) * walk_v + .06 * rage_v;
        l.hip.rotation.x = hx; l.knee.rotation.x = kx; l.foot.rotation.x = -(hx + kx) * .7;
      });
      B.skirt.rotation.z = swing * .035 * walk_v;                                      // a saia balança com o quadril
      B.skirt.rotation.x = -.03 * walk_v;
      B.lumps.forEach((l, i) => l.scale.setScalar(1 + B.AG * (.25 + .2 * Math.sin(gT * 6 + i * 2.1)) + .03 * Math.sin(gT * 1.5 + i)));
    }
    B.SN.forEach(o => o.update(st.animT));
    if (B.tail) B.tail(st.animT, walk_v, rage_v);
  };
  M.update(0, {});
  return M;
}
