/* Modelos 3D (blocos) dos companheiros: papagaio, corvo, cachorro e macaco. */
import { wb } from '../core/utils.js';

/** Bolinha de loot que a ave carrega no bico/garras (aparece quando carrega algo) */
function carryMarker(radius, y, z) {
  const cm = new THREE.Mesh(new THREE.SphereGeometry(radius, 5, 4), new THREE.MeshBasicMaterial({ color: 0xf0c030 }));
  cm.position.set(0, y, z);
  cm.visible = false;
  return cm;
}

/** Papagaio. Expõe: g.wl, g.wr (asas), g.cm (item carregado) */
export function mkParrot() {
  const g = new THREE.Group(), c = 0xd63a2a;
  g.rotation.order = 'YXZ';
  g.add(
    wb(.28, .34, .4, c, 0, 0, 0),
    wb(.22, .22, .22, c, 0, .28, .16),
    wb(.08, .1, .14, 0xf0b030, 0, .24, .32),
    wb(.07, .06, .1, 0x222222, 0, .17, .3),
    wb(.02, .06, .06, 0xffffff, .12, .31, .22),
    wb(.02, .06, .06, 0xffffff, -.12, .31, .22),
    wb(.02, .03, .03, 0x111111, .13, .31, .24),
    wb(.02, .03, .03, 0x111111, -.13, .31, .24),
    wb(.1, .04, .5, 0x2a6ad0, 0, -.1, -.42),
    wb(.05, .04, .4, 0xf0c030, .07, -.1, -.36),
    wb(.05, .04, .4, 0x2ab050, -.07, -.1, -.36),
    wb(.04, .1, .04, 0xf0a030, .07, -.22, .02),
    wb(.04, .1, .04, 0xf0a030, -.07, -.22, .02)
  );
  const wing = s => {
    const w = new THREE.Group();
    w.position.set(s * .15, .08, 0);
    w.add(
      wb(.5, .04, .3, 0x2a8ad0, s * .25, 0, -.04),
      wb(.3, .045, .14, 0xf0c030, s * .22, .01, -.04),
      wb(.2, .045, .12, 0xd63a2a, s * .1, .02, .06)
    );
    g.add(w);
    return w;
  };
  g.wl = wing(-1);
  g.wr = wing(1);
  g.cm = carryMarker(.12, -.34, .04);
  g.add(g.cm);
  g.scale.setScalar(1.1);
  return g;
}

/** Corvo. Expõe: g.head, g.wl, g.wr, g.cm */
export function mkRaven() {
  const g = new THREE.Group(), c = 0x1c1c28, c2 = 0x30304a, bk = 0x111111;
  g.rotation.order = 'YXZ';
  g.add(
    wb(.3, .32, .52, c, 0, 0, 0),
    wb(.26, .16, .26, c2, 0, .18, .12),
    wb(.18, .04, .12, c2, 0, .04, .28),
    wb(.16, .05, .46, c, 0, -.09, -.46),
    wb(.12, .04, .2, c2, .04, -.1, -.64),
    wb(.12, .04, .2, c2, -.04, -.1, -.64),
    wb(.04, .1, .04, 0x3a3a3a, .07, -.22, .02),
    wb(.04, .1, .04, 0x3a3a3a, -.07, -.22, .02),
    wb(.09, .03, .06, 0x3a3a3a, .07, -.28, .05),
    wb(.09, .03, .06, 0x3a3a3a, -.07, -.28, .05)
  );
  const h = new THREE.Group();
  h.position.set(0, .3, .2);
  h.add(
    wb(.22, .22, .24, c, 0, 0, 0),
    wb(.09, .09, .22, bk, 0, -.02, .22),
    wb(.07, .04, .1, bk, 0, -.07, .3),
    wb(.02, .05, .05, 0xe0c050, .12, .04, .07),
    wb(.02, .05, .05, 0xe0c050, -.12, .04, .07),
    wb(.02, .025, .025, bk, .13, .04, .08),
    wb(.02, .025, .025, bk, -.13, .04, .08)
  );
  g.add(h);
  g.head = h;
  const wing = k => {
    const w = new THREE.Group();
    w.position.set(k * .15, .08, 0);
    w.add(
      wb(.56, .04, .34, c, k * .28, 0, -.04),
      wb(.34, .045, .16, c2, k * .3, .01, -.22),
      wb(.2, .045, .12, c, k * .1, .02, .08)
    );
    g.add(w);
    return w;
  };
  g.wl = wing(-1);
  g.wr = wing(1);
  g.cm = carryMarker(.12, -.34, .04);
  g.add(g.cm);
  return g;
}

/** Cachorro. Expõe: g.head, g.legs[4] (com .knee), g.tail, g.earL, g.earR */
export function mkDog() {
  const g = new THREE.Group(), fur = 0xb8803c, dk = 0x7a4a1e, wh = 0xf0e0c0;
  g.add(
    wb(.46, .42, .9, fur, 0, .64, 0),
    wb(.4, .2, .4, wh, 0, .52, .28),
    wb(.48, .22, .5, dk, 0, .82, -.1),
    wb(.5, .1, .14, 0xc02020, 0, .8, .34),
    wb(.07, .07, .02, 0xf0c030, 0, .7, .42)
  );
  const h = new THREE.Group();
  h.position.set(0, .95, .5);
  h.add(
    wb(.38, .34, .36, fur, 0, 0, 0),
    wb(.16, .1, .14, dk, 0, .17, -.02),
    wb(.2, .16, .24, wh, 0, -.07, .27),
    wb(.1, .08, .06, 0x111111, 0, -.02, .41),
    wb(.05, .05, .02, 0x111111, .1, .06, .19),
    wb(.05, .05, .02, 0x111111, -.1, .06, .19),
    wb(.07, .02, .12, 0xe07080, 0, -.14, .3) // língua (children[6])
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .2, .14, -.02);
    e.add(wb(.1, .26, .14, dk, k * .03, -.12, 0));
    e.rotation.z = k * .35;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;

  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .44, z);
    const k = new THREE.Group();
    k.position.y = -.2;
    k.add(wb(.13, .22, .13, fur, 0, -.11, 0), wb(.15, .06, .2, wh, 0, -.21, .03));
    l.add(wb(.14, .2, .14, fur, 0, -.1, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.15, .32), leg(.15, .32), leg(-.15, -.3), leg(.15, -.3)];

  const tl = new THREE.Group();
  tl.position.set(0, .8, -.46);
  tl.rotation.x = .8;
  tl.add(wb(.1, .1, .4, fur, 0, 0, -.18), wb(.1, .1, .12, wh, 0, 0, -.4));
  g.add(tl);
  g.tail = tl;
  return g;
}

/** Rato (patas na mesma ordem do cachorro). Expõe: g.head, g.legs[4] (.knee), g.tail (1º segmento), g.tailSegs[6], g.earL, g.earR */
export function mkRat() {
  const g = new THREE.Group(), fur = 0x8a8478, dk = 0x5c564c, belly = 0xc9c0ae, pk = 0xe8909e, wh = 0xf4f0dc;
  g.add(
    wb(.3, .26, .5, fur, 0, .28, 0),
    wb(.34, .3, .28, fur, 0, .28, -.2),
    wb(.22, .08, .4, belly, 0, .16, .04),
    wb(.1, .04, .6, dk, 0, .42, -.05)
  );
  const h = new THREE.Group();
  h.position.set(0, .34, .3);
  h.add(
    wb(.24, .22, .3, fur, 0, 0, 0),
    wb(.14, .12, .2, belly, 0, -.04, .2),
    wb(.07, .06, .04, pk, 0, -.02, .32),
    wb(.04, .05, .02, 0x111111, .1, .05, .15),
    wb(.04, .05, .02, 0x111111, -.1, .05, .15),
    wb(.04, .05, .02, wh, 0, -.11, .29), // dentes
    wb(.22, .01, .01, 0xe8e8e8, .14, -.03, .16), // bigodes
    wb(.22, .01, .01, 0xe8e8e8, -.14, -.03, .16)
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .11, .15, -.05);
    e.add(wb(.13, .15, .03, fur, 0, .05, 0), wb(.09, .11, .02, pk, 0, .05, .015));
    e.rotation.z = k * .25;
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;

  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .2, z);
    const k = new THREE.Group();
    k.position.y = -.1;
    k.add(wb(.07, .1, .07, fur, 0, -.05, 0), wb(.09, .04, .12, pk, 0, -.1, .02));
    l.add(wb(.08, .1, .08, fur, 0, -.05, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.1, .2), leg(.1, .2), leg(-.1, -.22), leg(.1, -.22)];

  // rabo longo e rosado em 6 segmentos encadeados
  g.tail = [];
  let tp = new THREE.Group();
  tp.position.set(0, .26, -.34);
  g.add(tp);
  for (let i = 0; i < 6; i++) {
    tp.add(wb(.04, .04, .2, i > 4 ? dk : pk, 0, 0, -.1));
    const n = new THREE.Group();
    n.position.z = -.2;
    tp.add(n);
    tp.rotation.x = i ? .05 : .25;
    g.tail.push(tp);
    tp = n;
  }
  g.tailSegs = g.tail;
  g.tail = g.tail[0];
  return g;
}

/** Macaco. Expõe: g.head, g.arm, g.armL (com .fa), g.legL, g.legR (com .knee), g.tail[] */
export function mkMonkey() {
  const g = new THREE.Group(), br = 0x7a4a26, dk = 0x4a2a14, tn = 0xd8b088;
  g.add(
    wb(.4, .5, .3, br, 0, .62, 0),
    wb(.3, .34, .04, tn, 0, .6, .17),
    wb(.44, .22, .34, 0xb02a2a, 0, .74, 0),
    wb(.12, .1, .12, dk, 0, .4, -.02)
  );
  const h = new THREE.Group();
  h.position.set(0, 1.05, .04);
  h.add(
    wb(.38, .34, .34, br, 0, 0, 0),
    wb(.3, .24, .04, tn, 0, -.02, .19),
    wb(.2, .12, .07, tn, 0, -.08, .23),
    wb(.05, .05, .02, 0x111111, .08, .04, .215),
    wb(.05, .05, .02, 0x111111, -.08, .04, .215),
    wb(.04, .03, .02, dk, .03, -.06, .265),
    wb(.04, .03, .02, dk, -.03, -.06, .265),
    wb(.1, .12, .06, tn, .23, 0, 0),
    wb(.1, .12, .06, tn, -.23, 0, 0),
    wb(.34, .08, .3, dk, 0, .2, -.02)
  );
  g.add(h);
  g.head = h;

  const arm = k => {
    const a = new THREE.Group();
    a.position.set(k * .27, .82, 0);
    const f = new THREE.Group();
    f.position.y = -.3;
    f.add(wb(.09, .3, .09, br, 0, -.15, 0), wb(.12, .1, .13, tn, 0, -.34, .01));
    a.add(wb(.1, .3, .1, br, 0, -.15, 0), f);
    a.fa = f;
    g.add(a);
    return a;
  };
  g.armL = arm(-1);
  g.arm = arm(1);

  const leg = k => {
    const l = new THREE.Group();
    l.position.set(k * .12, .42, 0);
    const n = new THREE.Group();
    n.position.y = -.2;
    n.add(wb(.12, .2, .12, br, 0, -.1, 0), wb(.14, .06, .2, tn, 0, -.2, .04));
    l.add(wb(.13, .2, .13, br, 0, -.1, 0), n);
    l.knee = n;
    g.add(l);
    return l;
  };
  g.legL = leg(-1);
  g.legR = leg(1);

  // rabo em 5 segmentos encadeados
  g.tail = [];
  let tp = new THREE.Group();
  tp.position.set(0, .45, -.18);
  g.add(tp);
  for (let i = 0; i < 5; i++) {
    tp.add(wb(.06, .06, .22, i > 3 ? dk : br, 0, 0, -.11));
    const n = new THREE.Group();
    n.position.z = -.22;
    tp.add(n);
    tp.rotation.x = i ? .5 : .2;
    g.tail.push(tp);
    tp = n;
  }
  return g;
}
