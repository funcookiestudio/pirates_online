/* Animações dos animais de blocos (cervo, javali, gato): poses mescladas por peso, como nas prévias, mais algumas novas.
   · Cervo   — parado, andar, correr, pastar, ALERTA (cabeça erguida, orelhas à frente, bate a pata, rabo de bandeira), salto de fuga (bound)
   · Javali  — parado, andar, correr, fuçar, investida, PANCADA (cabeça baixa, raspa a pata e levanta o focinho), recuo, cambaleio
   · Gato    — parado, andar, correr, sentar, LAMBER A PATA, ESPREGUIÇAR, arranhar e dormir (com Zzz); pisca e mexe as orelhas
   makeAnimal(kind, variant) devolve o animal; animate(A, dt, t, mode, o) pose o corpo. Quem comanda (IA) escolhe o modo. */
import { mkDeer, mkBoar, mkCat } from './wildlife-models.js';

const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, env = (u, a, b) => sm((u - a) / (b - a));
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const limb = (ph, o) => ({ s: Math.sin(ph + o), l: Math.max(0, Math.cos(ph + o)) });
const K = ['tilt', 'y', 'pz', 'fl', 'fr', 'hl', 'hr', 'kfl', 'kfr', 'khl', 'khr', 'hx', 'hy', 'ta', 'nk', 'hdy', 'rz', 'tc', 'br', 'ez', 'tf', 'tcy', 'tu', 'ex'];

/** Passada de quadrúpede: A = amplitude, e = dobra do joelho */
function gaitP(ph, run, k) {
  const A = (run ? k.Ar : k.Aw), e = run ? k.er : k.ew;
  const fl = limb(ph, 0), fr = limb(ph, run ? .3 : Math.PI), hl = limb(ph, run ? Math.PI * .9 : Math.PI + .6), hr = limb(ph, run ? Math.PI * .9 + .3 : .6);
  return { tilt: run ? Math.sin(ph + .5) * k.tr : 0, y: run ? k.yr * Math.abs(Math.sin(ph + .8)) : .02 * Math.abs(Math.cos(ph)),
    fl: -fl.s * A, fr: -fr.s * A, hl: -hl.s * A, hr: -hr.s * A, kfl: fl.l * e, kfr: fr.l * e, khl: hl.l * e, khr: hr.l * e };
}

/* ---------------- CERVO ---------------- */
const DEER = {
  k: { Aw: .38, Ar: .55, ew: 1.1, er: 1.3, tr: .05, yr: .08 }, piv: [.78, -.34], sc: 1.35,
  modes: ['idle', 'walk', 'run', 'graze', 'alert', 'bound'],
  pose: {
    idle: (t) => ({ hx: Math.sin(t * 1.3) * .04, hy: Math.sin(t * .6) * .5, nk: Math.sin(t * 1.1) * .03, ta: .25, y: Math.sin(t * 1.8) * .004 }),
    walk: (t, A) => Object.assign(gaitP(A.ph, false, DEER.k), { nk: Math.sin(A.ph * 2) * .05, hx: Math.sin(A.ph * 2) * .04, ta: .25 }),
    run: (t, A) => Object.assign(gaitP(A.ph, true, DEER.k), { nk: -.18 + Math.sin(A.ph + .5) * .05, hx: .12, ta: .1, tu: .5 }),   // corre com o rabo branco erguido
    graze: (t) => { const lift = Math.pow(Math.max(0, Math.sin(t * .4)), 4);   // abaixa para pastar e de vez em quando levanta a cabeça mastigando
      return { tilt: .12, nk: 1.83 - 1.0 * lift + Math.sin(t * .8) * .04, hx: -.6 + .45 * lift + Math.sin(t * 7) * .03 * (1 - lift), hy: Math.sin(t * .9) * .12 * lift, fl: -.55, fr: -.45, hl: -.12, hr: -.12, kfl: .1, kfr: .1, ta: .4 + .3 * Math.max(0, Math.sin(t * 5)) }; },
    alert: (t) => { const st = Math.pow(Math.max(0, Math.sin(t * 2.2)), 6);   // imóvel, pescoço alto, orelhas girando; de vez em quando bate a pata
      return { tilt: -.05, nk: -.32, hx: .3, hy: Math.sin(t * .9) * .45, ex: .35, ta: .1, tu: .9, fl: -.5 * st, kfl: 1.2 * st, y: .004 * Math.sin(t * 6) }; },
    bound: (t, A) => { const q = A.bt % 1, s = Math.sin(q * Math.PI);   // pulo das quatro patas (fuga)
      return { tilt: -.12 + .2 * s, y: .5 * s, fl: -.6 * s, fr: -.6 * s, kfl: 1.3 * s, kfr: 1.3 * s, hl: .6 * s, hr: .6 * s, khl: 1.1 * s, khr: 1.1 * s, nk: -.15, hx: .1, ta: .3, tu: .7 }; },
  },
  apply(A, p, t) {
    const m = A.m, fl = Math.sin(t * 9) * .08 * Math.max(0, Math.sin(t * .8));
    m.head.rotation.x = -.2 + p.hx; m.neck.rotation.x = .5 + p.nk; m.head.rotation.y = p.hy;
    m.earL.rotation.z = .6 + fl; m.earR.rotation.z = -.6 - fl; m.earL.rotation.x = m.earR.rotation.x = -p.ex;
    m.tail.forEach((s, i) => { s.rotation.x = (i ? 0 : .8 + p.tu) + p.ta * .2; s.rotation.y = Math.sin(t * 3 - i * .6) * p.ta * .8; });
  },
};

/* ---------------- JAVALI ---------------- */
const BOAR = {
  k: { Aw: .45, Ar: .7, ew: .9, er: 1.1, tr: .07, yr: .07 }, piv: [.43, -.32], sc: 1.2,
  modes: ['idle', 'walk', 'run', 'root', 'charge', 'gore', 'stag'],
  pose: {
    idle: (t) => ({ hx: Math.sin(t * 1.3) * .05 + Math.sin(t * 9) * .015, hy: Math.sin(t * .7) * .4, ta: .2, y: Math.sin(t * 1.8) * .006 }),
    walk: (t, A) => Object.assign(gaitP(A.ph, false, BOAR.k), { hx: Math.sin(A.ph * 2) * .05, ta: .2 }),
    run: (t, A) => Object.assign(gaitP(A.ph, true, BOAR.k), { hx: .15, ta: .3 }),
    root: (t) => ({ tilt: .08, hdy: -.2, hx: 1 + Math.sin(t * 5) * .12, hy: Math.sin(t * 2.5) * .25, fl: -.15, fr: -.15, kfl: .15, kfr: .15, ta: .35 }),
    charge: (t, A) => { const g = gaitP(A.ph * 1.05, true, BOAR.k); return Object.assign(g, { hx: .5, hdy: -.1, tilt: g.tilt + .05, ta: .5, y: g.y * 1.15 }); },
    gore: (t, A) => { const u = A.gu;   // 0..1: abaixa a cabeça e raspa a pata (0–.6), depois investe e levanta o focinho (.6–1)
      const w = env(u, 0, .55), s = env(u, .55, .8) * (1 - env(u, .85, 1));
      return { tilt: .12 * w - .1 * s, hdy: -.22 * w + .05 * s, hx: .95 * w - 1.45 * s, hy: Math.sin(t * 18) * .1 * w, fl: -.5 * w * Math.sin(t * 22) * .6 - .4 * s, fr: -.2 * w, kfl: .5 * w, hl: .3 * w, khl: .5 * w, pz: .4 * s, ta: .5 }; },
    stag: (t) => ({ tilt: -.18, hx: -.5, hy: Math.sin(t * 14) * .25, hdy: .06, fl: -.2, fr: -.2, ta: .6 }),
  },
  apply(A, p, t) {
    const m = A.m;
    m.head.rotation.x = p.hx; m.head.position.y = .72 + p.hdy; m.head.rotation.y = p.hy;
    m.earL.rotation.z = .3 + Math.sin(t * 9) * .05; m.earR.rotation.z = -.3 - Math.sin(t * 9) * .05;
    m.tail.forEach((s, i) => { s.rotation.x = (i ? .25 : .6) + p.ta * .2; s.rotation.y = Math.sin(t * 3 - i * .6) * p.ta * .8; });
  },
};

/* ---------------- GATO ---------------- */
const YAW = [.8, 1.1, .7, .4, .1, 0];
const CAT = {
  k: { Aw: .5, Ar: .75, ew: .9, er: 1.1, tr: .1, yr: .09 }, piv: [.43, -.28], sc: 1.15,
  modes: ['idle', 'walk', 'run', 'sit', 'groom', 'stretch', 'swipe', 'sleep'],
  pose: {
    idle: (t) => ({ hx: Math.sin(t * 1.3) * .05, hy: Math.sin(t * .7) * .6, ta: .25, y: Math.sin(t * 1.8) * .006 }),
    walk: (t, A) => Object.assign(gaitP(A.ph, false, CAT.k), { hx: Math.sin(A.ph * 2) * .03, ta: .3 }),
    run: (t, A) => Object.assign(gaitP(A.ph, true, CAT.k), { hx: -.1, ta: .12 }),
    sit: (t) => ({ tilt: -1, y: -.2, hl: -.4, hr: -.4, khl: 1.4, khr: 1.4, fl: 1, fr: 1, hx: 1 + Math.sin(t * 1.3) * .04, hy: Math.sin(t * .7) * .5, ta: .3 }),
    groom: (t) => { const l = Math.sin(t * 9) * .5 + .5;   // sentado, levanta a pata dianteira e lambe
      return { tilt: -1, y: -.2, hl: -.4, hr: -.4, khl: 1.4, khr: 1.4, fl: 1, fr: -.75 + l * .12, kfr: 1.7, hx: 1.38 - l * .1, hy: -.25, ta: .2, ez: -.05 }; },
    stretch: (t) => { const u = .5 + .5 * Math.sin(t * .9);   // reverência: peito no chão, traseiro erguido, rabo para cima
      return { tilt: .42 * u, y: -.05 * u, fl: -1.05 * u, fr: -1.05 * u, kfl: .3 * u, kfr: .3 * u, hl: .15 * u, hr: .15 * u, hx: -.5 * u, ta: .6, tc: .25 * u }; },
    swipe: (t, A) => { const u = A.gu; if (u >= 1) return CAT.pose.idle(t);
      const wu = env(u, 0, .3) * (1 - env(u, .3, .4)), st = env(u, .3, .4) * (1 - env(u, .65, 1));
      return { tilt: -.3 * wu + .1 * st, pz: .1 * st, fr: .5 * wu - 1.6 * st, kfr: .2 * wu, hx: -.15 * wu + .2 * st, ta: .35 }; },
    sleep: (t) => { const dr = Math.pow(Math.max(0, Math.sin(t * .5)), 8), b = Math.sin(t * 2.2);   // deitado de lado, respirando; sonha mexendo a pata
      return { rz: Math.PI / 2, y: -.26 + b * .004, fl: -.55 + Math.sin(t * 26) * .15 * dr, fr: -.6, kfl: 1.7, kfr: 1.7, hl: -1, hr: -.9, khl: 1.9, khr: 1.9, hx: .75, tc: -.55, tf: -.55, ta: .03 + dr * .1, br: b * .018, ez: Math.sin(t * 34) * .18 * dr }; },
  },
  apply(A, p, t) {
    const m = A.m, sl = A.W.sleep, blink = ((t * .9 + A.t0) % 4.3) < .13;
    m.scale.setScalar(1 + p.br);
    m.eyes.visible = sl < .5 && !blink; m.lids.visible = !m.eyes.visible;
    m.head.rotation.x = p.hx; m.head.rotation.y = p.hy; m.head.position.y = .72 + p.hdy;
    const flick = Math.max(0, Math.sin(t * .7 + A.t0 * 3)) > .97 ? Math.sin(t * 40) * .25 : 0;   // orelha estremece de vez em quando
    m.earL.rotation.z = .3 + Math.sin(t * 9) * .05 * (1 - sl) + p.ez + flick; m.earR.rotation.z = -.3 - Math.sin(t * 9) * .05 * (1 - sl) - p.ez;
    m.tail.forEach((s, i) => { s.rotation.x = (i ? .05 + p.tc : .7 + p.tf) + p.ta * .2; s.rotation.y = Math.sin(t * 2 - i * .5) * p.ta * .8 + p.tcy * YAW[i]; });
  },
};

const DEFS = { deer: DEER, boar: BOAR, cat: CAT };

/** Cria o animal: A.g = raiz (posicione e gire), A.m = modelo, A.W = pesos dos modos */
export function makeAnimal(kind, variant) {
  const D = DEFS[kind], m = kind === 'deer' ? mkDeer() : kind === 'boar' ? mkBoar() : mkCat(variant);
  const root = new THREE.Group(), rig = new THREE.Group(), [py, pz] = D.piv;
  rig.position.set(0, py, pz); rig.rotation.order = 'YXZ'; m.position.set(0, -py, -pz);
  rig.add(m); root.add(rig); root.scale.setScalar(D.sc);
  const A = { kind, D, g: root, rig, m, W: {}, ph: Math.random() * 6, bt: 0, gu: 0, t0: Math.random() * 20, mode: 'idle', spd: 0 };
  D.modes.forEach(n => A.W[n] = n === 'idle' ? 1 : 0);
  if (kind === 'cat') A.zs = zzz(root);
  return A;
}

function zzz(root) {   // três "Z" que sobem da cabeça do gato dormindo
  const out = [];
  for (let i = 0; i < 3; i++) {
    if (!zzz.tex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = 'bold 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 5; x.strokeStyle = '#5a6a8a'; x.strokeText('Z', 32, 34); x.fillStyle = '#fff'; x.fillText('Z', 32, 34); zzz.tex = new THREE.CanvasTexture(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzz.tex, transparent: true, depthWrite: false })); s.visible = false; root.add(s); out.push(s);
  }
  return out;
}

/** Um quadro de animação. `mode` = modo desejado · `o.spd` = velocidade real (m/s) · `o.gu` = progresso 0..1 do golpe (gore/swipe) */
export function animate(A, dt, t, mode, o = {}) {
  const D = A.D, W = A.W, kk = 1 - Math.exp(-dt * (o.fast ? 12 : 7));
  A.mode = mode; A.spd = o.spd || 0;
  if (o.gu !== undefined) A.gu = o.gu;
  for (const n in W) W[n] += ((n === mode ? 1 : 0) - W[n]) * kk;
  const kw = lim(A.spd / 1.2, .6, 1.5), kr = lim(A.spd / 4, .8, 1.7);
  A.ph += dt * (7 * W.walk * kw + 13 * W.run * kr + (W.charge ? 14 * W.charge * kr : 0));
  if (W.bound) A.bt += dt * (1.1 + A.spd * .12);
  const p = {}; K.forEach(n => p[n] = 0);
  for (const n in W) if (W[n] > .002) { const q = D.pose[n](t, A); K.forEach(k => p[k] += (q[k] || 0) * W[n]); }
  const [py, pz] = D.piv, L = A.m.legs;
  A.rig.rotation.x = p.tilt; A.rig.rotation.z = p.rz; A.rig.position.y = py + p.y; A.rig.position.z = pz + p.pz;
  [p.fl, p.fr, p.hl, p.hr].forEach((v, i) => L[i].rotation.x = v);
  [p.kfl, p.kfr, p.khl, p.khr].forEach((v, i) => L[i].knee.rotation.x = v);
  D.apply(A, p, t);
  if (A.zs) {   // Zzz
    const a = W.sleep;
    A.zs.forEach((s, i) => { const k = (t * .3 + i / 3) % 1; s.visible = a > .3; s.position.set(.1 + k * .35 + Math.sin(t * 2 + i) * .04, .95 + k * .7, .35); s.scale.setScalar(.2 + k * .3); s.material.opacity = Math.sin(k * Math.PI) * a; });
  }
}

/** Javali INIMIGO (enemies.js): mesma cabeça de IA dos outros inimigos, corpo e passos de quadrúpede. `c` = contexto do frame da IA */
export function animateEnemyBoar(e, c, dt, groundY) {
  const A = e.A, sp = Math.hypot(e.vx, e.vz), dur = c.dur;
  let mode, o = { spd: sp };
  if (e.st === 'wind') { mode = 'gore'; o.gu = 1 - Math.max(0, e.tm) / dur; o.fast = 1; }
  else if (e.st === 'rec') { mode = 'run'; o.fast = 1; }
  else if (e.st === 'stag') mode = 'stag';
  else if (e.ag) mode = sp > 1.2 ? 'charge' : 'idle';
  else if (sp > 1.0) mode = 'run';
  else if (sp > .25) mode = 'walk';
  else { e.fz = (e.fz || 0) + dt; mode = (Math.floor(e.fz / 5) % 2) ? 'root' : 'idle'; }   // parado: alterna fuçar e ficar de olho
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  animate(A, dt, performance.now() / 1000 + A.t0, mode, o);
}
