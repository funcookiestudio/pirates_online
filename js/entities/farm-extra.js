/* Bichos novos da fazenda: cabra e pintinho (moram nos cercados, animados por farm.js) + insetos que enfeitam o sítio:
   abelha, borboleta (monarca, azul, limão, rosa), joaninha, libélula e caracol. Só ambientação: sem colisão, não são alvo.
   Os insetos só pensam/animam quando o jogador está perto; abelhas, borboletas e libélulas dormem (somem) à noite. */
import { wb } from '../core/utils.js';
import { scene } from '../core/engine.js';
import { P } from './player.js';
import { FARMSITE } from './farm-site.js';
import { groundY, walkable, nearObstacle } from '../world/terrain.js';
import { isNight } from '../world/daynight.js';
import { quadLeg, birdLeg } from './farm.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rr2 = (a, b) => a + Math.random() * (b - a);

function mkBeeRaw() {
  const g = new THREE.Group(), Y = 0xf6c030, K = 0x1e1a14, fz = 0xf0b028, face = 0xffd860;
  // tórax gordinho e peludo
  g.add(
    wb(.34, .32, .3, fz, 0, .5, .06),
    wb(.3, .07, .26, 0x6a4a1c, 0, .68, .05),
    wb(.36, .22, .05, 0xffd860, 0, .49, .22)
  );
  // abdômen redondinho, listras grossas, ferrãozinho
  const tl = new THREE.Group();
  tl.position.set(0, .46, -.06);
  tl.add(
    wb(.4, .38, .2, Y, 0, 0, -.1),
    wb(.42, .4, .14, K, 0, 0, -.26),
    wb(.38, .36, .14, Y, 0, 0, -.4),
    wb(.28, .26, .1, K, 0, -.02, -.51),
    wb(.04, .04, .06, 0x2a2a2a, 0, -.04, -.6)
  );
  tl.rotation.x = -.3;
  g.add(tl);
  g.tail = tl;
  // cabeça grande (proporção chibi)
  const h = new THREE.Group();
  h.position.set(0, .6, .34);
  h.add(
    wb(.46, .4, .38, face, 0, 0, 0),
    wb(.47, .09, .39, K, 0, .16, 0),                 // franja escura
    wb(.06, .1, .06, K, 0, .24, .05),                // topetinho
    wb(.1, .15, .04, 0x1a1008, .12, 0, .19),         // olhos grandes
    wb(.1, .15, .04, 0x1a1008, -.12, 0, .19),
    wb(.04, .05, .02, 0xffffff, .14, .04, .215),     // brilhos
    wb(.04, .05, .02, 0xffffff, -.14, .04, .215),
    wb(.02, .02, .02, 0xffffff, .1, -.04, .215),
    wb(.02, .02, .02, 0xffffff, -.1, -.04, .215),
    wb(.08, .05, .02, 0xff9aa8, .18, -.08, .19),     // bochechas
    wb(.08, .05, .02, 0xff9aa8, -.18, -.08, .19),
    wb(.08, .02, .02, 0x7a4a20, 0, -.09, .19)        // sorrisinho
  );
  const ant = k => {
    const a = new THREE.Group();
    a.position.set(k * .1, .2, .06);
    a.add(wb(.02, .02, .14, K, 0, 0, .07), wb(.07, .07, .07, 0xffe070, 0, 0, .17));
    a.rotation.set(-.7, k * .3, 0);
    h.add(a);
    return a;
  };
  g.antL = ant(-1);
  g.antR = ant(1);
  g.add(h);
  g.head = h;
  // asas grandes e translúcidas
  const wmat = new THREE.MeshLambertMaterial({ color: 0xe8f8ff, transparent: true, opacity: .65, side: THREE.DoubleSide });
  const wing = k => {
    const a = new THREE.Group();
    a.position.set(k * .12, .68, .08);
    const part = (len, wid, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, .012, wid), wmat);
      m.position.set(k * len / 2, 0, z);
      a.add(m, wb(len, .018, .022, 0xb8d8e8, k * len / 2, 0, z + wid / 2 - .011));
    };
    part(.5, .26, 0);
    part(.3, .16, -.2);
    g.add(a);
    return a;
  };
  g.wl = wing(-1);
  g.wr = wing(1);
  // perninhas curtinhas com pezinhos laranja
  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .36, z);
    const k = new THREE.Group();
    k.position.y = -.08;
    k.add(wb(.035, .08, .035, K, 0, -.04, 0), wb(.06, .03, .07, 0xe89030, 0, -.09, .01));
    l.add(wb(.04, .08, .04, K, 0, -.04, 0), k);
    l.rotation.z = -Math.sign(x) * .3;
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [];
  [.2, .1, 0].forEach(z => g.legs.push(leg(-.12, z), leg(.12, z)));
  return g;
}

/** Abelha em escala real (bem menor que o pato). s = escala do modelo. */
export function mkBee(s = .18) {
  const raw = mkBeeRaw(), o = new THREE.Group();
  raw.scale.setScalar(s);
  o.add(raw);
  Object.assign(o, { head: raw.head, wl: raw.wl, wr: raw.wr, legs: raw.legs, tail: raw.tail, antL: raw.antL, antR: raw.antR });
  o.userData.s = s;
  return o;
}

/** Animação da abelha: voar em círculo, pairar, pousar. Uso: const a = createBeeAnimator(root, modelo); a.mode = 'fly'|'hover'|'perch'; a.update(dt) */
export function createBeeAnimator(root, g) {
  const R = .9, th0 = Math.random() * 6.28, center = root.position.clone();
  center.x -= R * Math.cos(th0); center.z -= R * Math.sin(th0);
  let th = th0, t = 0, air = 1, sp = 1, lookY = 0, lookT = 0;
  const api = { mode: 'fly', update(dt) {
    t += dt;
    air = damp(air, api.mode === 'perch' ? 0 : 1, 3, dt);
    sp = damp(sp, api.mode === 'fly' ? 1 : 0, 2, dt);
    th += dt * .55 * sp / R;
    root.position.set(center.x + R * Math.cos(th), 0, center.z + R * Math.sin(th));
    root.rotation.y = -th;
    // corpo: altura, inclinação e balanço lateral
    const bob = Math.sin(t * 1.7) * .08 + Math.sin(t * 5) * .015;
    g.position.y = -.175 * (g.userData.s || 1) + air * (.55 + bob);
    g.rotation.x = .18 * sp * air - Math.sin(t * 5) * .02 * air;
    g.rotation.z = -.12 * sp * air + Math.sin(t * 1.7) * .03 * air;
    // asas: batida rápida no ar, dobradas para trás no chão
    const f = 1 - air, ang = Math.sin(t * 60) * .55 * air + .12 * air;
    [[g.wl, -1], [g.wr, 1]].forEach(([w, k]) => { w.rotation.z = k * (ang + .05 * f); w.rotation.y = k * 1.2 * f; });
    // pernas: penduradas no ar, apoiadas no chão
    g.legs.forEach((l, i) => {
      l.rotation.x = (-.5 + Math.sin(t * 3 + i) * .1) * air;
      l.knee.rotation.x = .6 * air;
    });
    // abdômen balança; ferrão sobe e desce
    g.tail.rotation.x = -.25 + Math.sin(t * 5) * .05 * air + Math.sin(t * 1.5) * .03 * f;
    g.tail.rotation.y = Math.sin(t * 1.3) * .08 + Math.sin(t * 2) * .12 * sp;
    // cabeça olha em volta, antenas tremem
    lookT -= dt;
    if (lookT <= 0) { lookT = .6 + Math.random() * 1.6; api._ly = (Math.random() - .5) * 1.2 * (1 - sp * .6); }
    lookY = damp(lookY, api._ly || 0, 8, dt);
    g.head.rotation.y = lookY;
    g.antL.rotation.x = -.5 + Math.sin(t * 9) * .1; g.antR.rotation.x = -.5 + Math.sin(t * 9 + 1.3) * .1;
  } };
  return api;
}


/** Borboleta fofinha (chibi). P = paleta {w1,w2,edge,spot,body,club}. Expõe: g.head, g.wl, g.wr, g.legs[4] (com .knee), g.antL, g.antR */
export const BF = {
  monarca: { w1: 0xf07a18, w2: 0xe8690f, edge: 0x1e1a14, spot: 0xffffff, body: 0x2a1e14, club: 0xf07a18 },
  azul: { w1: 0x4aa8f4, w2: 0x2f78d8, edge: 0x14203a, spot: 0xcfeaff, body: 0x1a2a4a, club: 0x4aa8f4 },
  limao: { w1: 0xf8e24a, w2: 0xf2d238, edge: 0x6a5a1c, spot: 0xffffff, body: 0x4a3a1c, club: 0xf8e24a },
  rosa: { w1: 0xf59ac0, w2: 0xe878a8, edge: 0x6a2a4a, spot: 0xffffff, body: 0x4a2a3a, club: 0xf59ac0 }
};
function mkButterflyRaw(P) {
  const g = new THREE.Group(), K = 0x1e1a14;
  g.add(
    wb(.14, .14, .3, P.body, 0, .55, .04),          // tórax
    wb(.16, .12, .1, 0xf3e6c8, 0, .55, .14),        // peitinho felpudo
    wb(.1, .1, .4, P.body, 0, .53, -.3),            // abdômen
    wb(.07, .07, .12, P.body, 0, .5, -.56)
  );
  const h = new THREE.Group();
  h.position.set(0, .58, .27);
  h.add(
    wb(.22, .2, .18, 0xf3e6c8, 0, 0, 0),
    wb(.07, .1, .03, 0x1a1008, .06, 0, .1),         // olhos grandes
    wb(.07, .1, .03, 0x1a1008, -.06, 0, .1),
    wb(.03, .035, .02, 0xffffff, .075, .03, .12),   // brilhos
    wb(.03, .035, .02, 0xffffff, -.075, .03, .12),
    wb(.045, .03, .02, 0xff9aa8, .1, -.05, .1),     // bochechas
    wb(.045, .03, .02, 0xff9aa8, -.1, -.05, .1),
    wb(.015, .015, .1, K, 0, -.07, .12)             // probóscide
  );
  const ant = k => {
    const a = new THREE.Group();
    a.position.set(k * .05, .1, .04);
    a.add(wb(.012, .012, .2, K, 0, 0, .1), wb(.045, .045, .05, P.club, 0, 0, .22));
    a.rotation.set(-.9, k * .35, 0);
    h.add(a);
    return a;
  };
  g.antL = ant(-1);
  g.antR = ant(1);
  g.add(h);
  g.head = h;
  const wing = k => {
    const a = new THREE.Group();
    a.position.set(k * .07, .62, .06);
    a.add(
      wb(.34, .014, .24, P.w1, k * .19, 0, .1),             // asa da frente
      wb(.14, .014, .3, P.w1, k * .38, 0, .1),
      wb(.04, .016, .32, P.edge, k * .46, 0, .1),           // borda
      wb(.34, .016, .03, P.edge, k * .19, 0, .23),
      wb(.06, .018, .06, P.spot, k * .34, .002, .2),        // pintinhas
      wb(.05, .018, .05, P.spot, k * .4, .002, .04),
      wb(.3, .014, .2, P.w2, k * .17, 0, -.17),             // asa de trás
      wb(.16, .014, .18, P.w2, k * .25, 0, -.3),
      wb(.04, .016, .2, P.edge, k * .34, 0, -.22),
      wb(.05, .018, .05, P.spot, k * .22, .002, -.28)
    );
    g.add(a);
    return a;
  };
  g.wl = wing(-1);
  g.wr = wing(1);
  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .48, z);
    const kn = new THREE.Group();
    kn.position.y = -.1;
    kn.add(wb(.015, .08, .015, K, 0, -.04, 0));
    l.add(wb(.015, .1, .015, K, 0, -.05, 0), kn);
    l.knee = kn;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.04, .08), leg(.04, .08), leg(-.04, 0), leg(.04, 0)];
  return g;
}

/** Borboleta em escala real (mesmo tamanho da abelha). s = escala do modelo. */
export function mkButterfly(P, s = .18) {
  const raw = mkButterflyRaw(P), o = new THREE.Group();
  raw.scale.setScalar(s);
  o.add(raw);
  Object.assign(o, { head: raw.head, wl: raw.wl, wr: raw.wr, legs: raw.legs, antL: raw.antL, antR: raw.antR });
  o.userData.s = s;
  return o;
}

/** Animação da borboleta: voo ondulado em círculo, pairar e pousar com asas fechadas abrindo devagar. a.mode = 'fly'|'hover'|'perch' */
export function createButterflyAnimator(root, g) {
  const R = 1.1, th0 = Math.random() * 6.28, dir = Math.random() < .5 ? 1 : -1, ph = Math.random() * 10;
  const c = root.position.clone();
  c.x -= R * Math.cos(th0); c.z -= R * Math.sin(th0);
  let th = th0, t = Math.random() * 10, air = 1, sp = 1, lookY = 0, lookT = 0;
  const s = g.userData.s || 1;
  const api = { mode: 'fly', update(dt) {
    t += dt;
    air = damp(air, api.mode === 'perch' ? 0 : 1, 3, dt);
    sp = damp(sp, api.mode === 'fly' ? 1 : 0, 2, dt);
    th += dir * dt * .4 * sp * (1 + .35 * Math.sin(t * .9 + ph)) / R;
    const r = R * (1 + .25 * Math.sin(t * .7 + ph));
    root.position.set(c.x + r * Math.cos(th), 0, c.z + r * Math.sin(th));
    root.rotation.y = Math.atan2(-dir * Math.sin(th), dir * Math.cos(th));
    // voo ondulado
    const beat = Math.sin(t * 13 + ph);
    g.position.y = -.3 * s + air * (.6 + Math.sin(t * 1.3 + ph) * .15 + Math.sin(t * 2.7) * .05 + beat * .025);
    g.rotation.x = .12 * sp * air + beat * .06 * air;
    g.rotation.z = -.15 * dir * sp * air + Math.sin(t * 1.9 + ph) * .08 * air;
    // asas: batida larga no ar; paradas e abrindo devagar no chão
    const flap = .3 + beat * .7 + Math.sin(t * 3.1) * .08, rest = 1.25 + Math.sin(t * 1.1 + ph) * .25;
    const ang = rest + (flap - rest) * air;
    g.wl.rotation.z = -ang;
    g.wr.rotation.z = ang;
    g.legs.forEach(l => { l.rotation.x = -.3 * air; l.knee.rotation.x = .3 * air; });
    g.antL.rotation.x = -.9 + Math.sin(t * 5) * .12;
    g.antR.rotation.x = -.9 + Math.sin(t * 5 + 1.2) * .12;
    lookT -= dt;
    if (lookT <= 0) { lookT = .8 + Math.random() * 2; api._ly = (Math.random() - .5) * .9; }
    lookY = damp(lookY, api._ly || 0, 6, dt);
    g.head.rotation.y = lookY;
  } };
  return api;
}

/* ====================== NOVOS BICHOS ====================== */

/** Cabra. Expõe: g.head, g.legs[4] (com .knee), g.tail, g.earL, g.earR */
export function mkGoat() {
  const g = new THREE.Group(), coat = 0xece0cb, lt = 0xf6efe2, patch = 0x8a6a48, horn = 0xd2c29a, hoof = 0x2a2420;
  g.add(
    wb(.5, .46, .86, coat, 0, .86, 0),
    wb(.46, .4, .2, lt, 0, .84, .4),
    wb(.52, .18, .34, patch, 0, .98, -.12),       // mancha marrom no dorso
    wb(.46, .36, .2, lt, 0, .82, -.4)
  );
  const h = new THREE.Group();
  h.position.set(0, 1.06, .52);
  h.add(
    wb(.24, .26, .26, lt, 0, 0, 0),
    wb(.16, .14, .18, 0xf3ebe0, 0, -.08, .2),
    wb(.1, .06, .04, 0x4a3a3a, 0, -.08, .3),     // focinho
    wb(.04, .04, .02, 0xe8d070, .125, .05, .12), // olhos amarelos
    wb(.04, .04, .02, 0xe8d070, -.125, .05, .12),
    wb(.02, .04, .02, 0x1a1008, .125, .05, .135),
    wb(.02, .04, .02, 0x1a1008, -.125, .05, .135),
    wb(.06, .14, .05, 0xf3ebe0, 0, -.2, .2),     // barbicha
    wb(.05, .16, .05, horn, .08, .2, -.02), wb(.05, .05, .14, horn, .08, .28, -.1),   // chifres
    wb(.05, .16, .05, horn, -.08, .2, -.02), wb(.05, .05, .14, horn, -.08, .28, -.1)
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .13, .1, -.02);
    e.add(wb(.16, .05, .1, coat, k * .08, 0, 0));
    e.rotation.z = k * -.25;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;
  g.legs = [
    quadLeg(g, -.16, .6, .32, .1, .3, .3, coat, hoof),
    quadLeg(g, .16, .6, .32, .1, .3, .3, coat, hoof),
    quadLeg(g, -.16, .6, -.32, .1, .3, .3, coat, hoof),
    quadLeg(g, .16, .6, -.32, .1, .3, .3, coat, hoof)
  ];
  const tl = new THREE.Group();
  tl.position.set(0, 1.0, -.5);
  tl.add(wb(.08, .16, .06, coat, 0, .06, -.02));
  tl.rotation.x = -.3;
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Pintinho (pequeno). Expõe: g.head, g.wl, g.wr, g.legs[2], g.tail */
export function mkChick() {
  const g = new THREE.Group(), Y = 0xffe45a, Y2 = 0xf5d040, or = 0xf08a20;
  g.add(wb(.2, .19, .22, Y, 0, .24, 0), wb(.16, .12, .08, 0xfff0a0, 0, .2, .1));
  const h = new THREE.Group();
  h.position.set(0, .4, .09);
  h.add(
    wb(.17, .16, .16, Y, 0, 0, 0),
    wb(.03, .05, .03, Y2, 0, .1, 0),              // topetinho
    wb(.05, .03, .05, or, 0, -.02, .1),           // biquinho
    wb(.025, .04, .02, 0x1a1008, .09, .02, .05),  // olhos
    wb(.025, .04, .02, 0x1a1008, -.09, .02, .05),
    wb(.012, .015, .02, 0xffffff, .095, .035, .06),
    wb(.012, .015, .02, 0xffffff, -.095, .035, .06),
    wb(.035, .02, .02, 0xff9aa8, .085, -.03, .05),
    wb(.035, .02, .02, 0xff9aa8, -.085, -.03, .05)
  );
  g.add(h);
  g.head = h;
  const wing = k => {
    const a = new THREE.Group();
    a.position.set(k * .11, .28, 0);
    a.add(wb(.035, .1, .14, Y2, k * .01, -.03, 0));
    g.add(a);
    return a;
  };
  g.wl = wing(-1);
  g.wr = wing(1);
  const tl = new THREE.Group();
  tl.position.set(0, .3, -.12);
  tl.add(wb(.07, .07, .05, Y, 0, .03, -.02));
  tl.rotation.x = -.4;
  g.add(tl);
  g.tail = tl;
  g.legs = [birdLeg(g, -.05, .15, 0, or, .025, .11), birdLeg(g, .05, .15, 0, or, .025, .11)];
  return g;
}

/** Coelho. Expõe: g.head, g.earL, g.earR, g.tail, g.fl, g.fr, g.hl, g.hr */
function wrapInsect(raw, s, props) {
  const o = new THREE.Group();
  raw.scale.setScalar(s);
  o.add(raw);
  props.forEach(p => { o[p] = raw[p]; });
  o.userData.s = s;
  return o;
}
const wingMat = () => new THREE.MeshLambertMaterial({ color: 0xe8f8ff, transparent: true, opacity: .6, side: THREE.DoubleSide });

/** Joaninha. Expõe: g.head, g.wl, g.wr, g.elL, g.elR, g.legs[6], g.antL, g.antR */
function mkLadybugRaw() {
  const g = new THREE.Group(), K = 0x1e1a14, red = 0xe02828;
  g.add(
    wb(.5, .18, .56, 0x2a1a14, 0, .18, -.02),
    wb(.36, .2, .14, K, 0, .28, .24),
    wb(.07, .02, .07, 0xffffff, .1, .385, .26), wb(.07, .02, .07, 0xffffff, -.1, .385, .26),
    wb(.015, .2, .56, K, 0, .32, -.04)
  );
  const h = new THREE.Group();
  h.position.set(0, .2, .4);
  h.add(
    wb(.3, .22, .2, K, 0, 0, 0),
    wb(.1, .1, .02, 0xffffff, .08, .03, .11), wb(.1, .1, .02, 0xffffff, -.08, .03, .11),
    wb(.04, .06, .02, K, .08, .03, .125), wb(.04, .06, .02, K, -.08, .03, .125),
    wb(.05, .03, .02, 0xff9aa8, .12, -.05, .11), wb(.05, .03, .02, 0xff9aa8, -.12, -.05, .11),
    wb(.08, .02, .02, 0x7a4a40, 0, -.07, .11)
  );
  const ant = k => {
    const a = new THREE.Group();
    a.position.set(k * .07, .1, .06);
    a.add(wb(.02, .02, .14, K, 0, 0, .07), wb(.04, .04, .04, K, 0, 0, .15));
    a.rotation.set(-.6, k * .3, 0);
    h.add(a);
    return a;
  };
  g.antL = ant(-1); g.antR = ant(1);
  g.add(h);
  g.head = h;
  const el = k => {
    const e = new THREE.Group();
    e.position.set(0, .36, -.04);
    e.add(
      wb(.26, .2, .56, red, k * .13, -.04, 0),
      wb(.08, .02, .08, K, k * .14, .07, .12), wb(.07, .02, .07, K, k * .18, .07, -.12), wb(.06, .02, .06, K, k * .08, .07, -.2)
    );
    g.add(e);
    return e;
  };
  g.elL = el(-1); g.elR = el(1);
  const wing = k => {
    const a = new THREE.Group();
    a.position.set(k * .12, .3, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(.46, .012, .2), wingMat());
    m.position.set(k * .23, 0, -.1);
    a.add(m);
    a.rotation.y = k * 1.5;
    g.add(a);
    return a;
  };
  g.wl = wing(-1); g.wr = wing(1);
  g.legs = [];
  [.2, .02, -.18].forEach(z => [-1, 1].forEach(k => {
    const l = new THREE.Group();
    l.position.set(k * .2, .17, z);
    l.add(wb(.04, .16, .04, K, 0, -.08, 0));
    l.rotation.z = k * .6;
    g.add(l);
    g.legs.push(l);
  }));
  return g;
}
export function mkLadybug(s = .15) { return wrapInsect(mkLadybugRaw(), s, ['head', 'wl', 'wr', 'elL', 'elR', 'legs', 'antL', 'antR']); }

/** Joaninha: anda em trote de tripé, para, e de vez em quando abre as asas e voa. */
export function createLadybugAnimator(root, g) {
  const R = .5, th0 = Math.random() * 6.28, c = root.position.clone();
  c.x -= R * Math.cos(th0); c.z -= R * Math.sin(th0);
  let th = th0, t = Math.random() * 5, ph = 0, air = 0, open = 0, sp = 0, mode = 'walk', tm = rr2(3, 6), lookY = 0, lookT = 0;
  return { get mode() { return mode; }, update(dt) {
    t += dt; tm -= dt;
    if (tm <= 0) {
      if (mode === 'walk') { mode = Math.random() < .45 ? 'fly' : 'idle'; tm = mode === 'fly' ? rr2(4, 6) : rr2(1.5, 3); }
      else { mode = 'walk'; tm = rr2(4, 8); }
    }
    air = damp(air, mode === 'fly' ? 1 : 0, 2, dt);
    open = damp(open, mode === 'fly' ? 1 : 0, 5, dt);
    sp = damp(sp, mode === 'walk' ? 1 : 0, 3, dt);
    th += dt * (.14 * sp + .45 * air) / R;
    root.position.set(c.x + R * Math.cos(th), 0, c.z + R * Math.sin(th));
    root.rotation.y = -th;
    g.position.y = air * (.45 + Math.sin(t * 3) * .06);
    g.rotation.x = .15 * air;
    ph += dt * 14 * sp;
    g.legs.forEach((l, i) => {
      const off = (i % 2) === ((i >> 1) % 2) ? 0 : Math.PI;
      l.rotation.x = Math.sin(ph + off) * .6 * sp * (1 - air) - .4 * air;
    });
    g.elL.rotation.z = -.95 * open; g.elR.rotation.z = .95 * open;
    const fl = Math.sin(t * 55) * .7 * open + .2 * open;
    g.wl.rotation.y = -1.5 * (1 - open); g.wr.rotation.y = 1.5 * (1 - open);
    g.wl.rotation.z = -fl; g.wr.rotation.z = fl;
    lookT -= dt;
    if (lookT <= 0) { lookT = rr2(.8, 2.2); g._ly = rr2(-1, 1) * .5; }
    lookY = damp(lookY, g._ly || 0, 8, dt);
    g.head.rotation.y = lookY;
    g.antL.rotation.x = -.6 + Math.sin(t * 6) * .12; g.antR.rotation.x = -.6 + Math.sin(t * 6 + 1) * .12;
  } };
}

/** Libélula. Expõe: g.head, g.wl, g.wr, g.tail */
function mkDragonflyRaw() {
  const g = new THREE.Group(), T = 0x23b5c8, D = 0x1a6a8a, K = 0x1e1a14;
  g.add(wb(.18, .18, .28, T, 0, .5, .1), wb(.19, .04, .28, D, 0, .56, .1));
  const tl = new THREE.Group();
  tl.position.set(0, .5, -.04);
  for (let i = 0; i < 6; i++) tl.add(wb(.09, .09, .17, i % 2 ? D : T, 0, 0, -.1 - .16 * i));
  tl.add(wb(.06, .06, .1, K, 0, 0, -1.05));
  g.add(tl);
  g.tail = tl;
  const h = new THREE.Group();
  h.position.set(0, .5, .3);
  h.add(
    wb(.2, .17, .14, T, 0, 0, 0),
    wb(.1, .14, .13, 0x2a70d8, .12, .02, 0), wb(.1, .14, .13, 0x2a70d8, -.12, .02, 0),
    wb(.06, .08, .02, 0x0a1a3a, .12, 0, .07), wb(.06, .08, .02, 0x0a1a3a, -.12, 0, .07),
    wb(.025, .03, .02, 0xffffff, .13, .04, .085), wb(.025, .03, .02, 0xffffff, -.13, .04, .085),
    wb(.04, .025, .02, 0xff9aa8, .1, -.06, .07), wb(.04, .025, .02, 0xff9aa8, -.1, -.06, .07),
    wb(.06, .02, .02, 0x0a3a4a, 0, -.05, .07)
  );
  g.add(h);
  g.head = h;
  const wing = k => {
    const a = new THREE.Group();
    a.position.set(k * .08, .6, .1);
    const part = (len, wid, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, .01, wid), wingMat());
      m.position.set(k * len / 2, 0, z);
      a.add(m, wb(len, .014, .02, 0x8ab8c8, k * len / 2, 0, z + wid / 2 - .01), wb(.06, .016, .04, D, k * (len - .04), 0, z + wid / 2 - .03));
    };
    part(.62, .15, .06);
    part(.58, .17, -.1);
    g.add(a);
    return a;
  };
  g.wl = wing(-1); g.wr = wing(1);
  return g;
}
export function mkDragonfly(s = .2) { return wrapInsect(mkDragonflyRaw(), s, ['head', 'wl', 'wr', 'tail']); }

/** Libélula: arrancadas rápidas e pairadas, asas zumbindo. */
export function createDragonflyAnimator(root, g) {
  const R = 1.3, th0 = Math.random() * 6.28, dir = Math.random() < .5 ? 1 : -1, c = root.position.clone();
  c.x -= R * Math.cos(th0); c.z -= R * Math.sin(th0);
  let th = th0, t = Math.random() * 10, sp = 0, mode = 'hover', tm = rr2(.5, 1.2), lookY = 0, lookT = 0;
  return { get mode() { return mode; }, update(dt) {
    t += dt; tm -= dt;
    if (tm <= 0) { if (mode === 'hover') { mode = 'dart'; tm = rr2(.9, 1.6); } else { mode = 'hover'; tm = rr2(.6, 1.5); } }
    sp = damp(sp, mode === 'dart' ? 1 : 0, 5, dt);
    th += dir * dt * (1.3 * sp + .04) / R;
    root.position.set(c.x + R * Math.cos(th), 0, c.z + R * Math.sin(th));
    root.rotation.y = Math.atan2(-dir * Math.sin(th), dir * Math.cos(th));
    g.position.y = .85 + Math.sin(t * 1.1) * .1 + Math.sin(t * 4) * .015;
    g.rotation.x = .12 * sp - .06 * (1 - sp) + Math.sin(t * 2.3) * .03;
    g.rotation.z = -.2 * dir * sp;
    const a = Math.sin(t * 80) * .16 + .06;
    g.wl.rotation.z = -a; g.wr.rotation.z = a;
    g.tail.rotation.x = Math.sin(t * 2) * .05 + (1 - sp) * .1;
    g.tail.rotation.y = Math.sin(t * 3) * .06;
    lookT -= dt;
    if (lookT <= 0) { lookT = rr2(.5, 1.6); g._ly = rr2(-1, 1) * .6; }
    lookY = damp(lookY, g._ly || 0, 10, dt);
    g.head.rotation.y = lookY;
  } };
}

/** Caracol. Expõe: g.head, g.antL, g.antR (olhos nas hastes), g.shell, g.foot */
function mkSnailRaw() {
  const g = new THREE.Group(), sk = 0xe2cfa0, sk2 = 0xe9d8ae;
  g.foot = wb(.3, .12, .78, sk, 0, .07, -.05);
  g.add(g.foot, wb(.32, .04, .8, 0xc8b078, 0, .02, -.05), wb(.2, .26, .2, sk, 0, .2, .36));
  const h = new THREE.Group();
  h.position.set(0, .4, .44);
  h.add(
    wb(.24, .2, .2, sk2, 0, 0, 0),
    wb(.05, .04, .02, 0xffa8b0, .1, -.04, .11), wb(.05, .04, .02, 0xffa8b0, -.1, -.04, .11),
    wb(.08, .02, .02, 0x8a5a40, 0, -.05, .11)
  );
  const stalk = k => {
    const a = new THREE.Group();
    a.position.set(k * .07, .1, .02);
    a.add(wb(.04, .26, .04, sk, 0, .13, 0), wb(.09, .09, .09, 0x1a1008, 0, .28, .02), wb(.03, .03, .02, 0xffffff, k * .015, .31, .07));
    a.rotation.set(-.35, 0, k * -.25);
    h.add(a);
    return a;
  };
  g.antL = stalk(-1); g.antR = stalk(1);
  g.add(h);
  g.head = h;
  const sh = new THREE.Group();
  sh.position.set(0, .36, -.12);
  sh.add(
    wb(.22, .5, .5, 0xc27a3c, 0, 0, 0),
    wb(.24, .38, .38, 0xe8a860, 0, 0, 0),
    wb(.26, .26, .26, 0xc27a3c, 0, 0, 0),
    wb(.28, .14, .14, 0xe8a860, 0, 0, 0)
  );
  g.add(sh);
  g.shell = sh;
  return g;
}
export function mkSnail(s = .2) { return wrapInsect(mkSnailRaw(), s, ['head', 'antL', 'antR', 'shell', 'foot']); }

/** Caracol: desliza devagar, alonga o pé, e às vezes se encolhe tímido (olhos recolhem). */
export function createSnailAnimator(root, g) {
  const R = .55, th0 = Math.random() * 6.28, c = root.position.clone();
  c.x -= R * Math.cos(th0); c.z -= R * Math.sin(th0);
  let th = th0, t = Math.random() * 5, sp = 0, shy = 0, mode = 'crawl', tm = rr2(5, 9), lookY = 0, lookT = 0;
  const hy = g.head.position.y, hz = g.head.position.z;
  return { get mode() { return mode; }, update(dt) {
    t += dt; tm -= dt;
    if (tm <= 0) { if (mode === 'crawl') { mode = 'shy'; tm = rr2(2, 3.5); } else { mode = 'crawl'; tm = rr2(5, 10); } }
    sp = damp(sp, mode === 'crawl' ? 1 : 0, 2, dt);
    shy = damp(shy, mode === 'shy' ? 1 : 0, 4, dt);
    th += dt * .08 * sp / R;
    root.position.set(c.x + R * Math.cos(th), 0, c.z + R * Math.sin(th));
    root.rotation.y = -th;
    g.foot.scale.z = 1 + Math.sin(t * 4) * .05 * sp;
    g.shell.rotation.z = Math.sin(t * 4) * .02 * sp;
    g.shell.position.y = .36 - shy * .03;
    g.head.position.y = hy - shy * .08 + Math.sin(t * 2) * .01 * sp;
    g.head.position.z = hz - shy * .08;
    lookT -= dt;
    if (lookT <= 0) { lookT = rr2(1, 3); g._ly = rr2(-1, 1) * .5; }
    lookY = damp(lookY, (g._ly || 0) * (1 - shy), 4, dt);
    g.head.rotation.y = lookY;
    const sc = 1 - shy * .65;
    g.antL.scale.y = g.antR.scale.y = sc;
    g.antL.rotation.z = -(-.25 + Math.sin(t * 2) * .08); g.antR.rotation.z = -.25 + Math.sin(t * 2 + 1.3) * .08;
    g.antL.rotation.z = .25 + Math.sin(t * 2) * .08;
  } };
}


/* ---------- insetos pelo sítio ---------- */
export const BUGS = [];
const SHOW = 42;
const rnd = (a, b) => a + Math.random() * (b - a);

/** Ponto livre (andável, sem obstáculo) num anel em volta de (cx, cz) */
function freeSpot(cx, cz, r0, r1, water) {
  for (let t = 0; t < 40; t++) {
    const a = Math.random() * 6.283, d = rnd(r0, r1), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (water ? true : (walkable(x, z) && !nearObstacle(x, z, .8) && groundY(x, z) > .3)) return { x, z };
  }
  return null;
}

/** kind: bee | butterfly | ladybug | dragonfly | snail. sc = escala do bicho (os modelos são do tamanho real, então crescem p/ aparecer) */
function addBug(kind, mk, create, p, sc, flyer) {
  if (!p) return;
  const g = mk(), root = new THREE.Group();
  root.add(g); root.scale.setScalar(sc);
  root.position.set(p.x, groundY(p.x, p.z), p.z); root.visible = false; scene.add(root);
  BUGS.push({ kind, root, a: create(root, g), ox: p.x, oz: p.z, flyer, mt: rnd(2, 6) });
}

/** Espalha os insetos em volta de cada sítio (e libélulas junto da lagoa dos patos) */
export function buildBugs() {
  if (!FARMSITE.ok) return;
  const cols = [BF.monarca, BF.azul, BF.limao, BF.rosa];
  FARMSITE.sites.forEach(st => {
    cols.forEach(c => { addBug('butterfly', () => mkButterfly(c), createButterflyAnimator, freeSpot(st.x, st.z, 6, 20), 2.2, 1); addBug('butterfly', () => mkButterfly(c), createButterflyAnimator, freeSpot(st.x, st.z, 6, 20), 2.2, 1); });
    for (let i = 0; i < 4; i++) addBug('bee', () => mkBee(), createBeeAnimator, freeSpot(st.x, st.z, 5, 18), 2.2, 1);
    for (let i = 0; i < 5; i++) addBug('ladybug', () => mkLadybug(), createLadybugAnimator, freeSpot(st.x, st.z, 4, 16), 2.4, 0);
    for (let i = 0; i < 3; i++) addBug('snail', () => mkSnail(), createSnailAnimator, freeSpot(st.x, st.z, 4, 16), 2.4, 0);
    const pc = (st.pens.find(pn => pn.pond) || {}).pond;   // lagoa dos patos: { cx, cz }
    for (let i = 0; i < 2; i++) addBug('dragonfly', () => mkDragonfly(), createDragonflyAnimator, pc ? freeSpot(pc.cx, pc.cz, 0, 4, true) : freeSpot(st.x, st.z, 5, 14), 1.7, 1);
  });
}

/** Anima só os insetos próximos; os distantes ficam escondidos */
export function updateBugs(dt) {
  const night = isNight();
  for (const b of BUGS) {
    const near = Math.hypot(b.ox - P.x, b.oz - P.z) < SHOW && !(b.flyer && night);
    if (b.root.visible !== near) b.root.visible = near;
    if (!near) continue;
    if (b.kind === 'bee' || b.kind === 'butterfly') {   // alterna voar / pairar / pousar
      b.mt -= dt;
      if (b.mt <= 0) { const r = Math.random(); b.a.mode = r < .6 ? 'fly' : r < .8 ? 'hover' : 'perch'; b.mt = b.a.mode === 'fly' ? rnd(5, 10) : rnd(2, 5); }
    }
    b.a.update(dt);
    b.root.position.y = groundY(b.root.position.x, b.root.position.z);
  }
}
