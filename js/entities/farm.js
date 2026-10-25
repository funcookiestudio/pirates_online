/* Animais de fazenda (ambientação): galo, galinha, pato, peru, pavão, porco, ovelha, vaca, boi e cavalo.
   Só enfeite: não têm colisão, não são alvo e não entram em combate. Ficam em currais perto da vila e só animam quando o jogador está perto. */
import { FARMSITE } from './farm-site.js';
import { wb } from '../core/utils.js';
import { groundY, walkable, nearObstacle, onRoad } from '../world/terrain.js';
import { scene } from '../core/engine.js';
import { P } from './player.js';
import { VILLAGE_R } from '../core/village-const.js';

/* Modelos 3D (blocos) de animais de fazenda: galo, galinha, pato, porco, boi e vaca. */

/** Perna de quadrúpede com joelho. Expõe l.knee */
function quadLeg(g, x, y, z, w, h1, h2, col, hoof) {
  const l = new THREE.Group();
  l.position.set(x, y, z);
  const k = new THREE.Group();
  k.position.y = -h1;
  k.add(wb(w * .9, h2, w * .9, col, 0, -h2 / 2, 0), wb(w * 1.05, .07, w * 1.2, hoof, 0, -h2 + .03, .02));
  l.add(wb(w, h1, w, col, 0, -h1 / 2, 0), k);
  l.knee = k;
  g.add(l);
  return l;
}

/** Perna de ave (coxa + canela + 3 dedos). Expõe l.knee */
function birdLeg(g, x, y, z, col, th = .05, len = .2) {
  const l = new THREE.Group();
  l.position.set(x, y, z);
  const k = new THREE.Group();
  k.position.y = -len;
  k.add(
    wb(th, len, th, col, 0, -len / 2, 0),
    wb(th * .8, .03, th * 3, col, 0, -len + .015, th * 1.2),
    wb(th * .6, .03, th * 2, col, th, -len + .015, th * .8),
    wb(th * .6, .03, th * 2, col, -th, -len + .015, th * .8)
  );
  l.add(wb(th * 1.3, len, th * 1.3, col, 0, -len / 2, 0), k);
  l.knee = k;
  g.add(l);
  return l;
}

/** Asa dobrada de ave (grupo pivotado no ombro) */
function foldedWing(g, k, y, c1, c2, w = .08, h = .26, d = .4) {
  const a = new THREE.Group();
  a.position.set(k * .21, y, 0);
  a.add(wb(w, h, d, c1, k * .02, 0, 0), wb(w * .9, h * .4, d * .6, c2, k * .03, -h * .3, -d * .15));
  g.add(a);
  return a;
}

/** Galo. Expõe: g.head, g.wl, g.wr, g.legs[2] (com .knee), g.tail */
export function mkRooster() {
  const g = new THREE.Group(), c = 0xc0561e, dk = 0x3a2010, red = 0xd02020, yl = 0xf0b030, lg = 0xe0a828;
  g.add(
    wb(.4, .4, .62, c, 0, .62, 0),
    wb(.36, .3, .22, 0x8a3a14, 0, .56, .28),   // peito
    wb(.42, .14, .3, 0xf0b030, 0, .84, -.12)  // dorso dourado
  );
  const h = new THREE.Group();
  h.position.set(0, 1.0, .3);
  h.add(
    wb(.22, .24, .22, 0xf0e0c0, 0, 0, 0),
    wb(.05, .16, .22, red, 0, .2, 0),            // crista
    wb(.05, .1, .1, red, 0, .3, .02),
    wb(.07, .06, .14, yl, 0, -.02, .17),         // bico
    wb(.07, .04, .08, yl, 0, -.07, .15),
    wb(.05, .1, .04, red, 0, -.14, .12),         // barbela
    wb(.02, .05, .05, 0x111111, .12, .05, .06),
    wb(.02, .05, .05, 0x111111, -.12, .05, .06)
  );
  g.add(h);
  g.head = h;
  g.wl = foldedWing(g, -1, .66, 0x8a3a14, 0x2a6a40);
  g.wr = foldedWing(g, 1, .66, 0x8a3a14, 0x2a6a40);
  // cauda arqueada
  const tl = new THREE.Group();
  tl.position.set(0, .72, -.3);
  tl.add(
    wb(.06, .5, .12, 0x1a5a30, 0, .2, -.06),
    wb(.06, .44, .1, 0x2a8a50, .1, .16, -.08),
    wb(.06, .44, .1, 0x2a8a50, -.1, .16, -.08),
    wb(.06, .3, .1, red, .17, .1, -.06),
    wb(.06, .3, .1, 0x2a6ad0, -.17, .1, -.06)
  );
  tl.rotation.x = -.35;
  g.add(tl);
  g.tail = tl;
  g.legs = [birdLeg(g, -.1, .46, 0, lg), birdLeg(g, .1, .46, 0, lg)];
  return g;
}

/** Galinha. Expõe: g.head, g.wl, g.wr, g.legs[2], g.tail */
export function mkHen() {
  const g = new THREE.Group(), c = 0xf0e8d8, c2 = 0xc89a60, red = 0xd02020, yl = 0xe8a830;
  g.add(
    wb(.42, .38, .54, c, 0, .5, 0),
    wb(.38, .26, .2, 0xf8f4ea, 0, .44, .24),
    wb(.4, .12, .36, c2, 0, .7, -.06)
  );
  const h = new THREE.Group();
  h.position.set(0, .82, .26);
  h.add(
    wb(.2, .22, .2, c, 0, 0, 0),
    wb(.04, .08, .12, red, 0, .15, 0),
    wb(.06, .05, .12, yl, 0, -.02, .15),
    wb(.06, .04, .06, yl, 0, -.06, .13),
    wb(.04, .06, .04, red, 0, -.12, .1),
    wb(.02, .045, .045, 0x111111, .11, .04, .05),
    wb(.02, .045, .045, 0x111111, -.11, .04, .05)
  );
  g.add(h);
  g.head = h;
  g.wl = foldedWing(g, -1, .54, c2, 0xf8f4ea, .08, .22, .34);
  g.wr = foldedWing(g, 1, .54, c2, 0xf8f4ea, .08, .22, .34);
  const tl = new THREE.Group();
  tl.position.set(0, .6, -.26);
  tl.add(wb(.2, .22, .08, c, 0, .08, -.04), wb(.14, .2, .08, c2, 0, .1, -.1));
  tl.rotation.x = -.3;
  g.add(tl);
  g.tail = tl;
  g.legs = [birdLeg(g, -.1, .34, 0, yl, .045, .16), birdLeg(g, .1, .34, 0, yl, .045, .16)];
  return g;
}

/** Pato. Expõe: g.head, g.wl, g.wr, g.legs[2], g.tail */
export function mkDuck() {
  const g = new THREE.Group(), wh = 0xf4f0e4, gr = 0x1f7a4a, or = 0xf08a20, br = 0x8a6a40;
  g.add(
    wb(.44, .34, .66, wh, 0, .4, 0),
    wb(.4, .24, .3, 0xe8e0d0, 0, .34, .26),
    wb(.4, .1, .36, br, 0, .58, -.08)
  );
  const h = new THREE.Group();
  h.position.set(0, .8, .28);
  h.add(
    wb(.22, .3, .22, gr, 0, 0, 0),
    wb(.23, .04, .23, wh, 0, -.14, 0),            // colar branco
    wb(.14, .05, .22, or, 0, -.05, .2),           // bico largo e achatado
    wb(.12, .03, .06, 0xd07010, 0, -.08, .3),
    wb(.02, .05, .05, 0x111111, .12, .06, .06),
    wb(.02, .05, .05, 0x111111, -.12, .06, .06)
  );
  g.add(h);
  g.head = h;
  g.wl = foldedWing(g, -1, .46, br, 0x2a6ad0, .07, .2, .4);
  g.wr = foldedWing(g, 1, .46, br, 0x2a6ad0, .07, .2, .4);
  const tl = new THREE.Group();
  tl.position.set(0, .48, -.34);
  tl.add(wb(.14, .08, .16, 0x1a1a1a, 0, .06, -.04), wb(.1, .06, .1, wh, 0, .1, -.12));
  tl.rotation.x = -.25;
  g.add(tl);
  g.tail = tl;
  // pernas curtas com pés palmados
  const foot = x => {
    const l = new THREE.Group();
    l.position.set(x, .24, .02);
    const k = new THREE.Group();
    k.position.y = -.1;
    k.add(wb(.04, .1, .04, or, 0, -.05, 0), wb(.16, .02, .2, or, 0, -.1, .05));
    l.add(wb(.05, .1, .05, or, 0, -.05, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [foot(-.1), foot(.1)];
  return g;
}

/** Porco. Expõe: g.head, g.legs[4] (com .knee), g.tail, g.earL, g.earR */
export function mkPig() {
  const g = new THREE.Group(), pk = 0xf0a0a8, dk = 0xd4808a, sn = 0xe88a98;
  g.add(
    wb(.62, .56, .96, pk, 0, .6, 0),
    wb(.56, .22, .5, dk, 0, .46, .1)               // barriga
  );
  const h = new THREE.Group();
  h.position.set(0, .66, .54);
  h.add(
    wb(.46, .42, .4, pk, 0, 0, 0),
    wb(.26, .2, .14, sn, 0, -.06, .26),            // focinho
    wb(.04, .06, .02, 0x6a2a38, .06, -.06, .34),   // narinas
    wb(.04, .06, .02, 0x6a2a38, -.06, -.06, .34),
    wb(.05, .05, .02, 0x111111, .13, .08, .2),
    wb(.05, .05, .02, 0x111111, -.13, .08, .2)
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .2, .2, .0);
    e.add(wb(.14, .06, .2, dk, k * .04, 0, .04));
    e.rotation.z = k * .5;
    e.rotation.x = .5;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;
  g.legs = [
    quadLeg(g, -.2, .36, .32, .15, .18, .18, pk, 0x4a2a30),
    quadLeg(g, .2, .36, .32, .15, .18, .18, pk, 0x4a2a30),
    quadLeg(g, -.2, .36, -.32, .15, .18, .18, pk, 0x4a2a30),
    quadLeg(g, .2, .36, -.32, .15, .18, .18, pk, 0x4a2a30)
  ];
  // rabinho enrolado
  const tl = new THREE.Group();
  tl.position.set(0, .78, -.5);
  tl.add(wb(.05, .05, .1, dk, 0, 0, -.04), wb(.05, .1, .05, dk, 0, .06, -.1), wb(.05, .05, .1, dk, 0, .12, -.06));
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Cabeça de bovino: usada por vaca e boi */
function bovineHead(g, body, snout, horn, hornLen, hornY) {
  const h = new THREE.Group();
  h.position.set(0, 1.05, .78);
  h.add(
    wb(.42, .46, .44, body, 0, 0, 0),
    wb(.3, .24, .22, snout, 0, -.16, .3),
    wb(.05, .06, .02, 0x6a2a38, .07, -.14, .42),
    wb(.05, .06, .02, 0x6a2a38, -.07, -.14, .42),
    wb(.05, .05, .02, 0x111111, .15, .08, .22),
    wb(.05, .05, .02, 0x111111, -.15, .08, .22)
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .25, .12, -.02);
    e.add(wb(.2, .06, .12, body, k * .08, 0, 0));
    e.rotation.z = k * -.2;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  const hornB = k => {
    h.add(
      wb(.07, .07, .1, horn, k * .24, hornY, -.02),
      wb(.06, hornLen, .06, horn, k * (.24 + hornLen * .4), hornY + .02, -.02)
    );
    h.children[h.children.length - 1].rotation.z = k * -.9;
  };
  hornB(-1);
  hornB(1);
  g.add(h);
  g.head = h;
}

/** Vaca. Expõe: g.head, g.legs[4], g.tail, g.earL, g.earR, g.bell */
export function mkCow() {
  const g = new THREE.Group(), wh = 0xf4f0e8, bk = 0x1c1c1c, pk = 0xf0a8a8;
  g.add(
    wb(.8, .72, 1.3, wh, 0, .98, 0),
    wb(.4, .3, .5, bk, .24, 1.06, .1),            // manchas
    wb(.3, .3, .4, bk, -.26, 1.04, -.28),
    wb(.82, .24, .4, bk, 0, 1.2, -.46),
    wb(.4, .26, .3, wh, 0, .56, -.4),
    wb(.22, .12, .24, pk, 0, .52, -.46),           // úbere
    wb(.06, .08, .06, pk, .06, .44, -.46),
    wb(.06, .08, .06, pk, -.06, .44, -.46)
  );
  bovineHead(g, wh, pk, 0xe8dcc0, .2, .26);
  g.head.add(wb(.2, .22, .04, bk, .1, .1, .23)); // mancha no olho
  // sino
  g.bell = wb(.1, .12, .08, 0xf0c030, 0, .74, .86);
  g.add(wb(.5, .05, .08, 0xc02020, 0, .84, .8), g.bell);
  g.legs = [
    quadLeg(g, -.28, .64, .5, .17, .32, .32, wh, bk),
    quadLeg(g, .28, .64, .5, .17, .32, .32, wh, bk),
    quadLeg(g, -.28, .64, -.5, .17, .32, .32, wh, bk),
    quadLeg(g, .28, .64, -.5, .17, .32, .32, wh, bk)
  ];
  const tl = new THREE.Group();
  tl.position.set(0, 1.3, -.66);
  tl.rotation.x = .25;
  tl.add(wb(.06, .06, .6, wh, 0, -.02, -.3), wb(.12, .12, .16, bk, 0, -.02, -.66));
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Boi (touro de tração, com úbere). Expõe: g.head, g.legs[4], g.tail, g.earL, g.earR */
export function mkOx() {
  const g = new THREE.Group(), br = 0x5a3a24, dk = 0x3a2416, snout = 0x2e1c12, tn = 0xc8a878, horn = 0xe8dcc0;
  g.add(
    wb(.92, .82, 1.4, br, 0, 1.04, 0),
    wb(.8, .4, .5, dk, 0, 1.52, .36),             // cupim / ombros fortes
    wb(.7, .3, .4, tn, 0, .62, .1),
    wb(.86, .3, .3, dk, 0, 1.0, -.62),
    // úbere e tetas
    wb(.4, .26, .3, tn, 0, .56, -.42),
    wb(.22, .12, .24, 0xf0a8a8, 0, .52, -.48),
    wb(.06, .08, .06, 0xf0a8a8, .06, .44, -.48),
    wb(.06, .08, .06, 0xf0a8a8, -.06, .44, -.48)
  );
  bovineHead(g, br, snout, horn, .34, .28);
  g.head.position.set(0, 1.2, .9);
  g.head.add(wb(.46, .12, .3, dk, 0, .26, -.04)); // topete
  g.legs = [
    quadLeg(g, -.32, .72, .52, .2, .36, .36, br, 0x1a1a1a),
    quadLeg(g, .32, .72, .52, .2, .36, .36, br, 0x1a1a1a),
    quadLeg(g, -.32, .72, -.54, .2, .36, .36, br, 0x1a1a1a),
    quadLeg(g, .32, .72, -.54, .2, .36, .36, br, 0x1a1a1a)
  ];
  const tl = new THREE.Group();
  tl.position.set(0, 1.4, -.7);
  tl.rotation.x = .25;
  tl.add(wb(.07, .07, .7, br, 0, -.02, -.35), wb(.14, .14, .2, 0x1a1008, 0, -.02, -.78));
  g.add(tl);
  g.tail = tl;
  g.scale.setScalar(1.05);
  return g;
}

/** Cavalo. Expõe: g.head, g.neck, g.legs[4] (com .knee), g.tail, g.earL, g.earR */
export function mkHorse() {
  const g = new THREE.Group(), c = 0x8a4a22, dk = 0x2a1a10, mz = 0xb87a4a;
  g.add(
    wb(.52, .6, 1.2, c, 0, 1.12, 0),
    wb(.46, .22, .5, mz, 0, .86, .1),
    wb(.5, .1, .3, 0xa02020, 0, 1.4, .1),          // manta
    wb(.54, .3, .3, c, 0, 1.2, -.5)
  );
  const nk = new THREE.Group();
  nk.position.set(0, 1.2, .5);
  nk.rotation.x = .55;
  nk.add(wb(.28, .7, .3, c, 0, .32, 0), wb(.08, .7, .1, dk, 0, .32, -.19)); // pescoço + crina
  g.add(nk);
  const h = new THREE.Group();
  h.position.set(0, .72, .04);
  h.rotation.x = -.05;
  h.add(
    wb(.26, .3, .32, c, 0, 0, 0),
    wb(.2, .2, .34, mz, 0, -.06, .3),
    wb(.04, .05, .02, dk, .06, -.08, .48),
    wb(.04, .05, .02, dk, -.06, -.08, .48),
    wb(.04, .04, .04, 0x111111, .14, .06, .08),
    wb(.04, .04, .04, 0x111111, -.14, .06, .08),
    wb(.08, .12, .1, dk, 0, .2, -.1)               // topete
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .09, .18, -.04);
    e.add(wb(.06, .16, .06, c, 0, .06, 0));
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  nk.add(h);
  g.neck = nk;
  g.head = h;
  g.legs = [
    quadLeg(g, -.18, .86, .46, .14, .43, .43, c, dk),
    quadLeg(g, .18, .86, .46, .14, .43, .43, c, dk),
    quadLeg(g, -.18, .86, -.46, .14, .43, .43, c, dk),
    quadLeg(g, .18, .86, -.46, .14, .43, .43, c, dk)
  ];
  const tl = new THREE.Group();
  tl.position.set(0, 1.35, -.62);
  tl.rotation.x = .35;
  tl.add(wb(.1, .7, .12, dk, 0, -.35, -.04));
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Ovelha. Expõe: g.head, g.legs[4] (com .knee), g.tail, g.earL, g.earR */
export function mkSheep() {
  const g = new THREE.Group(), wl = 0xf2efe6, wl2 = 0xe2ddd0, dk = 0x3a3030;
  g.add(
    wb(.66, .56, .9, wl, 0, .84, 0),
    wb(.72, .4, .5, wl2, 0, .9, .12),
    wb(.6, .22, .7, wl, 0, 1.14, -.04),
    wb(.7, .3, .4, wl2, 0, .82, -.3),
    wb(.16, .16, .14, wl, 0, .95, -.52)
  );
  const h = new THREE.Group();
  h.position.set(0, .98, .56);
  h.add(
    wb(.3, .34, .34, dk, 0, 0, 0),
    wb(.2, .18, .16, 0x4a4040, 0, -.08, .2),
    wb(.04, .04, .02, 0xe8d8a0, .1, .06, .18),
    wb(.04, .04, .02, 0xe8d8a0, -.1, .06, .18),
    wb(.34, .12, .3, wl, 0, .2, -.04)               // topete de lã
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .17, .08, -.02);
    e.add(wb(.18, .06, .1, dk, k * .09, 0, 0));
    e.rotation.z = k * -.3;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;
  g.legs = [
    quadLeg(g, -.2, .56, .3, .12, .28, .28, dk, 0x1a1414),
    quadLeg(g, .2, .56, .3, .12, .28, .28, dk, 0x1a1414),
    quadLeg(g, -.2, .56, -.3, .12, .28, .28, dk, 0x1a1414),
    quadLeg(g, .2, .56, -.3, .12, .28, .28, dk, 0x1a1414)
  ];
  const tl = new THREE.Group();
  tl.position.set(0, .9, -.5);
  tl.add(wb(.12, .12, .12, wl, 0, 0, -.04));
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Peru. Expõe: g.head, g.wl, g.wr, g.legs[2], g.tail (leque) */
export function mkTurkey() {
  const g = new THREE.Group(), c = 0x5a3a22, c2 = 0x8a5a30, red = 0xd02020, lg = 0xc08a6a;
  g.add(
    wb(.5, .46, .7, c, 0, .66, 0),
    wb(.44, .32, .24, c2, 0, .6, .3),
    wb(.46, .12, .4, 0x3a2414, 0, .92, -.06)
  );
  g.add(wb(.12, .34, .14, 0x9a6a5a, 0, .95, .34));  // pescoço
  const h = new THREE.Group();
  h.position.set(0, 1.2, .36);
  h.add(
    wb(.17, .17, .2, 0x6a8ab0, 0, 0, 0),
    wb(.05, .05, .1, 0xe8a830, 0, -.02, .15),
    wb(.04, .16, .04, red, 0, -.1, .1),             // pêndulo do bico
    wb(.07, .14, .06, red, 0, -.16, .02),           // barbela
    wb(.02, .04, .04, 0x111111, .09, .04, .05),
    wb(.02, .04, .04, 0x111111, -.09, .04, .05)
  );
  g.add(h);
  g.head = h;
  g.wl = foldedWing(g, -1, .68, c2, 0x3a2414, .08, .3, .46);
  g.wr = foldedWing(g, 1, .68, c2, 0x3a2414, .08, .3, .46);
  // leque
  const tl = new THREE.Group();
  tl.position.set(0, .78, -.36);
  tl.rotation.x = -.25;
  for (let i = -3; i <= 3; i++) {
    const f = new THREE.Group();
    f.rotation.z = -i * .3;
    f.add(wb(.12, .6, .05, i % 2 ? 0x8a5a30 : 0x5a3a22, 0, .34, 0), wb(.12, .1, .052, 0xe0c890, 0, .66, 0));
    tl.add(f);
  }
  g.add(tl);
  g.tail = tl;
  g.legs = [birdLeg(g, -.12, .44, 0, lg, .06, .22), birdLeg(g, .12, .44, 0, lg, .06, .22)];
  return g;
}

/** Pavão. Expõe: g.head, g.legs[2], g.tail (cauda longa com "olhos"), g.wl, g.wr */
export function mkPeacock() {
  const g = new THREE.Group(), bl = 0x1f5fb0, bl2 = 0x2a8ad0, gr = 0x1a8a5a;
  g.add(
    wb(.3, .34, .6, bl, 0, .64, 0),
    wb(.26, .24, .2, bl2, 0, .6, .26),
    wb(.26, .08, .34, gr, 0, .84, -.1)
  );
  g.add(wb(.12, .4, .14, bl2, 0, .98, .28));        // pescoço
  const h = new THREE.Group();
  h.position.set(0, 1.26, .3);
  h.add(
    wb(.14, .14, .18, bl2, 0, 0, 0),
    wb(.04, .04, .1, 0xd0c0a0, 0, -.02, .13),
    wb(.1, .03, .04, 0xffffff, 0, .04, .08),
    wb(.02, .04, .03, 0x111111, .08, .03, .06),
    wb(.02, .04, .03, 0x111111, -.08, .03, .06),
    wb(.015, .14, .015, 0x222244, 0, .14, -.02),     // crista
    wb(.015, .12, .015, 0x222244, .04, .13, -.02),
    wb(.015, .12, .015, 0x222244, -.04, .13, -.02),
    wb(.05, .03, .03, bl2, 0, .22, -.02)
  );
  g.add(h);
  g.head = h;
  g.wl = foldedWing(g, -1, .66, gr, bl, .06, .24, .4);
  g.wr = foldedWing(g, 1, .66, gr, bl, .06, .24, .4);
  // cauda longa em leque horizontal
  const tl = new THREE.Group();
  tl.position.set(0, .58, -.3);
  tl.rotation.x = .15;
  for (let i = -4; i <= 4; i++) {
    const f = new THREE.Group();
    f.rotation.y = i * .13;
    f.add(
      wb(.07, .03, 1.3, i % 2 ? gr : 0x2a9a6a, 0, 0, -.65),
      wb(.14, .04, .14, 0xd0a020, 0, .01, -1.3),
      wb(.09, .045, .09, bl, 0, .015, -1.3)
    );
    tl.add(f);
  }
  g.add(tl);
  g.tail = tl;
  g.legs = [birdLeg(g, -.08, .46, 0, 0x888070, .05, .23), birdLeg(g, .08, .46, 0, 0x888070, .05, .23)];
  return g;
}

/* Animação dos animais de fazenda: caminhar em círculo, parar, olhar em volta, pastar/bicar, mexer orelhas/cauda e bater asas.
 * Uso:  const a = createAnimator(root, modelo, 'cow');  // root = grupo que contém o modelo, já na posição "casa"
 *       a.update(dt);                                    // a cada frame (dt em segundos)
 * Tipos: rooster, hen, duck, turkey, peacock, pig, sheep, cow, ox, horse (modelos de farm.js). */

const TAU = Math.PI * 2;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rr = (a, b) => a + Math.random() * (b - a);

const CFG = {
  rooster: { bird: 1, freq: 11, amp: .65, v: .5, bobZ: .06, dipY: .3, dipZ: .15, dipR: 1, tail: .1 },
  hen: { bird: 1, freq: 12, amp: .65, v: .45, bobZ: .055, dipY: .22, dipZ: .13, dipR: 1, tail: .1 },
  duck: { bird: 1, freq: 8, amp: .5, v: .38, waddle: .14, bobZ: .02, dipY: .2, dipZ: .12, dipR: .8, tail: .25 },
  turkey: { bird: 1, freq: 9, amp: .55, v: .42, bobZ: .07, dipY: .2, dipZ: .12, dipR: .9, tail: .06 },
  peacock: { bird: 1, freq: 8, amp: .55, v: .4, bobZ: .035, dipY: .18, dipZ: .1, dipR: .7, tail: .06 },
  pig: { amp: .5, freq: 10, v: .5, bob: .025, dipY: .2, dipZ: .1, dipR: .5, tailAxis: 'z', tailAmp: .45, tailF: 9 },
  sheep: { amp: .5, freq: 10, v: .45, bob: .025, dipY: .4, dipZ: .12, dipR: .8, tailAxis: 'y', tailAmp: .4, tailF: 7 },
  cow: { amp: .42, freq: 7, v: .38, bob: .02, dipY: .45, dipZ: .15, dipR: .7, tailAxis: 'y', tailAmp: .35, tailF: 2.2 },
  ox: { amp: .38, freq: 6.5, v: .33, bob: .02, dipY: .5, dipZ: .15, dipR: .7, tailAxis: 'y', tailAmp: .3, tailF: 2 },
  horse: { amp: .5, freq: 8, v: .7, bob: .03, neckDip: 1.5, tailAxis: 'y', tailAmp: .3, tailF: 2.6 }
};

export function createAnimator(root, g, kind) {
  const c = CFG[kind];
  if (!c) throw new Error('animal desconhecido: ' + kind);
  const R = .65, th0 = Math.random() * TAU;
  const center = root.position.clone();
  center.x -= R * Math.cos(th0);
  center.z -= R * Math.sin(th0);

  // guarda a pose original de cada parte (as animações são sempre "base + movimento", sem acumular erro)
  const base = o => {
    if (o && !o.userData.b) o.userData.b = { x: o.position.x, y: o.position.y, z: o.position.z, rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z };
    return o && o.userData.b;
  };
  const legs = g.legs || [];
  [g, g.head, g.neck, g.tail, g.earL, g.earR, g.wl, g.wr, ...legs, ...legs.map(l => l.knee), ...(g.tail ? g.tail.children : [])].forEach(base);

  let th = th0, ph = Math.random() * TAU, sp = 0, act = 0, mode = 'idle', tm = rr(.5, 3), t = 0;
  let lookT = 0, lookY = 0, lookTo = 0, flick = 0, flickT = rr(2, 5), flickSide = 1, flapT = rr(5, 10), flap = 0;

  function update(dt) {
    t += dt;
    tm -= dt;
    // máquina de estados: andar -> (pastar/bicar | parar) -> andar
    if (tm <= 0) {
      if (mode === 'walk') { mode = Math.random() < .55 ? 'act' : 'idle'; tm = mode === 'act' ? rr(2.5, 4.5) : rr(1.5, 3.5); }
      else { mode = 'walk'; tm = rr(4, 8); }
    }
    sp = damp(sp, mode === 'walk' ? 1 : 0, 2.5, dt);
    act = damp(act, mode === 'act' ? 1 : 0, 3, dt);
    ph += dt * c.freq * sp;
    th += dt * c.v * sp / R;
    root.position.set(center.x + R * Math.cos(th), center.y, center.z + R * Math.sin(th));
    root.rotation.y = -th;

    const A = c.amp * sp, s = Math.sin(ph), gb = g.userData.b;
    g.position.y = gb.y + Math.abs(s) * (c.bob || .03) * sp + Math.sin(t * 2.2) * .004 * (1 - sp);

    // pernas
    if (c.bird) {
      legs.forEach((l, i) => {
        const p = ph + i * Math.PI;
        l.rotation.x = Math.sin(p) * A;
        l.knee.rotation.x = Math.max(0, -Math.cos(p)) * A * 1.3;
      });
      g.rotation.z = gb.rz + s * (c.waddle || .03) * sp;
    } else {
      const off = [0, Math.PI, Math.PI, 0]; // diagonais juntas (trote)
      legs.forEach((l, i) => {
        const p = ph + off[i];
        l.rotation.x = Math.sin(p) * A;
        l.knee.rotation.x = Math.max(0, -Math.cos(p)) * A * 1.4;
      });
      g.rotation.z = gb.rz + s * .02 * sp;
      g.rotation.x = gb.rx + Math.sin(2 * ph + 1) * .015 * sp;
    }

    // olhar em volta (aves: giros rápidos; mamíferos: lentos)
    lookT -= dt;
    if (lookT <= 0) { lookT = c.bird ? rr(.6, 2) : rr(2, 4.5); lookTo = rr(-1, 1) * (c.bird ? .7 : .45); }
    lookY = damp(lookY, lookTo * (1 - sp * (c.bird ? .5 : 1)) * (1 - act), c.bird ? 12 : 3, dt);

    const h = g.head, hb = h.userData.b;
    h.rotation.y = hb.ry + lookY;
    if (c.bird) {
      const dip = act * Math.pow(Math.max(0, Math.sin(t * 9)), 2);           // bicadas
      const f = ((ph / Math.PI) % 1 + 1) % 1;
      const th2 = f < .8 ? .5 - f / .8 : -.5 + (f - .8) / .2;                 // cabeça parada e depois "empurra" pra frente
      h.position.y = hb.y - dip * c.dipY;
      h.position.z = hb.z + th2 * 2 * c.bobZ * sp + dip * c.dipZ;
      h.rotation.x = hb.rx + dip * c.dipR;
      g.rotation.x = gb.rx + dip * .12 + Math.sin(2 * ph) * .03 * sp;
    } else {
      const nd = c.neckDip;
      h.rotation.x = hb.rx + Math.sin(2 * ph + .6) * .05 * sp + (nd ? 0 : act * c.dipR) + Math.sin(t * 1.4) * .015 * (1 - sp);
      h.position.y = hb.y - (nd ? 0 : act * c.dipY);
      h.position.z = hb.z + (nd ? 0 : act * c.dipZ);
      h.rotation.z = hb.rz + Math.sin(t * 7) * .03 * act;                     // mastigando
      if (g.neck) g.neck.rotation.x = g.neck.userData.b.rx + act * nd + Math.sin(2 * ph + .3) * .05 * sp;
    }

    // orelhas
    flickT -= dt;
    if (flickT <= 0) { flickT = rr(2.5, 6); flick = 1; flickSide = Math.random() < .5 ? -1 : 1; }
    flick = Math.max(0, flick - dt * 2.5);
    const tw = Math.sin(flick * 22) * flick * .4;
    [g.earL, g.earR].forEach((e, i) => { if (e) e.rotation.z = e.userData.b.rz + ((i ? 1 : -1) === flickSide ? tw : 0); });

    // cauda
    if (g.tail) {
      const tb = g.tail.userData.b;
      if (c.bird) {
        g.tail.rotation.y = tb.ry + Math.sin(t * 1.6 + th0) * c.tail + Math.sin(ph) * c.tail * 1.2 * sp;
        g.tail.rotation.x = tb.rx + Math.sin(2 * ph) * .04 * sp;
        if (kind === 'peacock' || kind === 'turkey') {
          const shiver = Math.pow(Math.max(0, Math.sin(t * .45 + th0)), 12);
          g.tail.children.forEach((fe, i) => {
            const fb = fe.userData.b;
            if (kind === 'peacock') fe.rotation.y = fb.ry + Math.sin(t * 1.6 + i * .7) * .035;
            else fe.rotation.z = fb.rz + Math.sin(t * 16 + i) * .02 * shiver;
          });
        }
      } else {
        const w = Math.sin(t * c.tailF + th0) * c.tailAmp * (.5 + .5 * sp);
        if (c.tailAxis === 'z') g.tail.rotation.z = tb.rz + w; else g.tail.rotation.y = tb.ry + w;
        g.tail.rotation.x = tb.rx + Math.sin(2 * ph) * .05 * sp;
      }
    }

    // asas: balançam ao andar e batem de vez em quando quando está parado
    if (g.wl) {
      flapT -= dt;
      if (flapT <= 0 && mode !== 'walk') { flapT = rr(6, 12); flap = 1; }
      flap = Math.max(0, flap - dt / 1.2);
      const fl = flap > 0 ? Math.sin((1 - flap) * Math.PI) * (.5 + .5 * Math.sin(t * 28)) * .9 : 0;
      const sway = Math.sin(ph) * .03 * sp;
      g.wl.rotation.z = g.wl.userData.b.rz - fl - sway;
      g.wr.rotation.z = g.wr.userData.b.rz + fl + sway;
    }
  }

  return { update, get mode() { return mode; } };
}

export const FARM = [];
const SHOW = 55;   // só mostra/anima animais a menos de 55 m do jogador

/** Procura uma clareira ampla (sem estrada, obstáculos ou água) perto da vila e espalha ali os animais */
function openSpot(x, z, r) {
  const y0 = groundY(x, z);
  if (!walkable(x, z) || onRoad(x, z, 3) || y0 < .3) return false;
  for (let a = 0; a < 6.283; a += .6) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!walkable(px, pz) || nearObstacle(px, pz, .8) || onRoad(px, pz, 2) || groundY(px, pz) < .3 || Math.abs(groundY(px, pz) - y0) > 1.2) return false;
  }
  return !nearObstacle(x, z, 1);
}

const HERDS = [
  ['hen', 'hen', 'hen', 'rooster', 'duck', 'turkey'],
  ['pig', 'pig', 'sheep', 'sheep', 'cow'],
  ['horse', 'ox', 'cow', 'sheep', 'peacock'],
];

/** Cria os currais (até um por grupo) em torno da vila, em direções diferentes */
export function buildFarm() {
  const MK = { rooster: mkRooster, hen: mkHen, duck: mkDuck, turkey: mkTurkey, peacock: mkPeacock, pig: mkPig, sheep: mkSheep, cow: mkCow, ox: mkOx, horse: mkHorse };
  const SCALE = { rooster: .9, hen: .9, duck: .9, turkey: 1, peacock: 1, pig: 1, sheep: 1, cow: 1, ox: 1, horse: 1 };
  if (FARMSITE.ok) {
    FARMSITE.sites.forEach(st => st.pens.forEach(pn => pn.kinds.forEach((kind, i) => {
      const w = pn.pts[i % pn.pts.length], g = MK[kind](), root = new THREE.Group();
      g.scale.setScalar(SCALE[kind]); root.add(g);
      root.position.set(w.x, groundY(w.x, w.z), w.z); root.visible = false; scene.add(root);
      FARM.push({ root, a: createAnimator(root, g, kind), ox: w.x, oz: w.z });
    })));
    return;
  }
  const used = [];
  HERDS.forEach((herd, h) => {
    let spot = null;
    for (let t = 0; t < 720 && !spot; t++) {
      const a = h * 2.1 + .5 + (t % 36) / 36 * 6.283, d = VILLAGE_R + 8 + Math.floor(t / 36) * 3;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (used.every(u => Math.hypot(u.x - x, u.z - z) > 16) && openSpot(x, z, 3.6)) spot = { x, z };
    }
    if (!spot) return;
    used.push(spot);
    herd.forEach((kind, i) => {
      const a = i / herd.length * 6.283 + h, r = 1.2 + (i % 3) * 1.1;
      const x = spot.x + Math.cos(a) * r, z = spot.z + Math.sin(a) * r;
      const g = MK[kind](), root = new THREE.Group();
      g.scale.setScalar(SCALE[kind]);
      root.add(g);
      root.position.set(x, groundY(x, z), z);
      root.visible = false;
      scene.add(root);
      FARM.push({ root, a: createAnimator(root, g, kind), ox: x, oz: z });
    });
  });
}

/** Anima os bichos próximos; os distantes ficam escondidos (não custam nada) */
export function updateFarm(dt) {
  for (const f of FARM) {
    const near = Math.hypot(f.ox - P.x, f.oz - P.z) < SHOW;
    if (f.root.visible !== near) f.root.visible = near;
    if (!near) continue;
    f.a.update(dt);
    f.root.position.y = groundY(f.root.position.x, f.root.position.z);
  }
}
