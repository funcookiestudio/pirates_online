/* Modelos 3D (blocos) dos animais selvagens e domésticos: cervo, javali e gato (5 pelagens). Importados das prévias "Cervo", "Javali" e "Gato".
   Cada modelo expõe as juntas que as animações movem (ver wildlife-anim.js): g.head, g.legs[4] (com .knee), g.tail[], g.earL/earR
   (+ g.neck e chifres no cervo · g.eyes/g.lids no gato). Ordem das patas: [frente-esq, frente-dir, trás-esq, trás-dir]. */
import { wb } from '../core/utils.js';

/** Cervo. Expõe: g.head, g.neck, g.legs[4] (com .knee), g.tail[] (2 segmentos), g.earL, g.earR
 *  Ordem das patas: [frente-esq, frente-dir, trás-esq, trás-dir] (igual ao cachorro) */
export function mkDeer() {
  const g = new THREE.Group(), fur = 0xa8703a, dk = 0x7a4c24, belly = 0xf0e0c8, wh = 0xffffff, nose = 0x2a1c18, ant = 0xd8c8a0, hoof = 0x2a2018;
  g.add(
    wb(.36, .34, 1.0, fur, 0, .9, 0),
    wb(.38, .36, .3, fur, 0, .93, .3), // ombros
    wb(.38, .36, .34, fur, 0, .9, -.36), // quadril
    wb(.3, .08, .7, belly, 0, .74, 0), // barriga
    wb(.26, .2, .04, wh, 0, .92, -.53) // mancha branca da garupa
  );

  // pescoço longo, inclinado para a frente; a cabeça fica dentro dele
  const n = new THREE.Group();
  n.position.set(0, .98, .42);
  n.rotation.x = .5;
  n.add(wb(.2, .5, .22, fur, 0, .25, 0), wb(.12, .34, .03, belly, 0, .2, .115));
  const h = new THREE.Group();
  h.position.set(0, .55, .06);
  h.add(
    wb(.22, .24, .3, fur, 0, 0, 0),
    wb(.14, .14, .2, belly, 0, -.05, .22), // focinho
    wb(.08, .07, .04, nose, 0, -.03, .33),
    wb(.04, .05, .02, 0x111111, .11, .04, .12), // olhos
    wb(.04, .05, .02, 0x111111, -.11, .04, .12)
  );
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .13, .1, -.06);
    e.add(wb(.08, .17, .04, fur, 0, .08, 0), wb(.05, .11, .02, belly, 0, .07, .02));
    e.rotation.z = -k * .6; // inclinada para fora
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  // chifres ramificados, em blocos
  const antler = k => {
    const a = new THREE.Group();
    a.position.set(k * .07, .12, -.04);
    a.rotation.z = -k * .2;
    a.add(
      wb(.05, .2, .05, ant, 0, .1, 0),
      wb(.045, .2, .045, ant, k * .04, .28, -.03),
      wb(.04, .18, .04, ant, k * .08, .45, -.06),
      wb(.035, .035, .14, ant, 0, .18, .07), // ponta frontal
      wb(.035, .035, .12, ant, k * .04, .34, .06),
      wb(.035, .12, .035, ant, k * .13, .4, -.04)
    );
    h.add(a);
    return a;
  };
  g.antlerL = antler(-1);
  g.antlerR = antler(1);
  n.add(h);
  g.add(n);
  g.neck = n;
  g.head = h;

  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .78, z);
    const k = new THREE.Group();
    k.position.y = -.38;
    k.add(wb(.08, .38, .08, dk, 0, -.19, 0), wb(.1, .05, .13, hoof, 0, -.38, .02));
    l.add(wb(.1, .44, .1, fur, 0, -.13, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.12, .34), leg(.12, .34), leg(-.12, -.34), leg(.12, -.34)];

  // rabinho curto com ponta branca, erguido
  g.tail = [];
  let tp = new THREE.Group();
  tp.position.set(0, 1.02, -.5);
  g.add(tp);
  tp.add(wb(.08, .08, .1, fur, 0, 0, -.05));
  const t2 = new THREE.Group();
  t2.position.z = -.1;
  t2.add(wb(.1, .14, .08, wh, 0, .03, -.04));
  tp.add(t2);
  tp.rotation.x = .8;
  g.tail.push(tp, t2);
  return g;
}

/** Javali. Expõe: g.head, g.legs[4] (com .knee), g.tail[] (4 segmentos), g.earL, g.earR
 *  Ordem das patas: [frente-esq, frente-dir, trás-esq, trás-dir] (igual ao cachorro) */
export function mkBoar() {
  const g = new THREE.Group(), fur = 0x5a4634, dk = 0x2e2218, belly = 0x8a7258, snout = 0x7a6048, nose = 0x2a1c18, wh = 0xf0e8d0, hoof = 0x1c1410;
  g.add(
    wb(.55, .5, .95, fur, 0, .66, 0),
    wb(.5, .3, .45, fur, 0, .9, .18), // cupim (ombros altos)
    wb(.52, .46, .4, fur, 0, .64, -.38), // quadril
    wb(.38, .36, .2, fur, 0, .76, .42), // pescoço
    wb(.4, .08, .7, belly, 0, .42, 0), // barriga
    wb(.14, .1, 1.0, dk, 0, .98, -.05), // crina do dorso
    wb(.04, .1, .04, dk, 0, 1.08, .3),
    wb(.04, .1, .04, dk, 0, 1.08, .1),
    wb(.04, .1, .04, dk, 0, 1.08, -.1),
    wb(.04, .1, .04, dk, 0, 1.08, -.3)
  );
  const h = new THREE.Group();
  h.position.set(0, .72, .62);
  h.add(
    wb(.42, .4, .45, fur, 0, 0, 0),
    wb(.12, .1, .3, dk, 0, .24, -.05), // topete
    wb(.24, .2, .3, snout, 0, -.1, .35), // focinho
    wb(.2, .16, .04, nose, 0, -.1, .52), // focinho/nariz
    wb(.04, .04, .02, 0x000000, .05, -.1, .54), // narinas
    wb(.04, .04, .02, 0x000000, -.05, -.1, .54),
    wb(.04, .05, .02, 0x111111, .13, .08, .23), // olhos
    wb(.04, .05, .02, 0x111111, -.13, .08, .23)
  );
  for (const k of [-1, 1]) { // presas
    h.add(wb(.05, .05, .14, wh, k * .13, -.17, .42), wb(.045, .12, .045, wh, k * .13, -.12, .5));
  }
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .17, .22, -.08);
    e.add(wb(.1, .14, .05, fur, 0, .07, 0), wb(.06, .09, .02, dk, 0, .06, .03));
    e.rotation.z = -k * .3; // inclinada para fora
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;

  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .43, z);
    const k = new THREE.Group();
    k.position.y = -.2;
    k.add(wb(.13, .2, .13, dk, 0, -.1, 0), wb(.15, .05, .18, hoof, 0, -.2, .02));
    l.add(wb(.16, .26, .16, fur, 0, -.07, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.18, .3), leg(.18, .3), leg(-.18, -.32), leg(.18, -.32)];

  // rabinho curto, curvado, com tufo na ponta
  g.tail = [];
  let tp = new THREE.Group();
  tp.position.set(0, .8, -.55);
  g.add(tp);
  for (let i = 0; i < 4; i++) {
    tp.add(wb(.06, .06, .1, i > 2 ? dk : fur, 0, 0, -.05));
    const n = new THREE.Group();
    n.position.z = -.1;
    tp.add(n);
    tp.rotation.x = i ? .25 : .6;
    g.tail.push(tp);
    tp = n;
  }
  return g;
}

/** Paletas das variantes: pelagem, listras, partes claras (peito/barriga/patas), rosa (nariz/orelhas), olhos */
export const CAT_VARIANTS = {
  laranja: { fur: 0xd8892c, dk: 0xa85a14, wh: 0xf4ead8, pk: 0xe8909e, eye: 0x6ac040 },
  preto:   { fur: 0x1c1c22, dk: 0x1c1c22, wh: 0x1c1c22, pk: 0x5a3a44, eye: 0xe8c030, stripes: false, whisker: 0x1c1c22 },
  branco:  { fur: 0xf4f2ec, dk: 0xf4f2ec, wh: 0xf4f2ec, pk: 0xf0a8b4, eye: 0x4a9ad8, stripes: false },
  cinza:   { fur: 0x8c929c, dk: 0x5e646e, wh: 0xdcdde0, pk: 0xe8a0aa, eye: 0xd8a020 },
  caramelo: { fur: 0xc89a5a, dk: 0x9a6a30, wh: 0xe8d4a8, pk: 0x111111, eye: 0x3a2410, dog: true, stripes: false, snout: 0xe8d4a8, ear: 0x8a5a28 },
  pastor:  { fur: 0x1c1c22, dk: 0x1c1c22, wh: 0xf4f0e8, pk: 0x111111, eye: 0x5a3a14, dog: true, stripes: false, snout: 0xf4f0e8, ear: 0x1c1c22, tip: 0xf4f0e8 },
  tuxedo:  { fur: 0x1c1c22, dk: 0x1c1c22, wh: 0xf4f0e8, pk: 0xe8909e, eye: 0x6ac040 }
};

/** Gato (variantes: laranja, preto, branco, cinza, tuxedo). Expõe: g.head, g.legs[4] (com .knee), g.tail[] (6 segmentos), g.earL, g.earR, g.eyes, g.lids
 *  Ordem das patas: [frente-esq, frente-dir, trás-esq, trás-dir] (igual ao cachorro) */
export function mkCat(variant = 'laranja') {
  const P = CAT_VARIANTS[variant] || CAT_VARIANTS.laranja;
  const g = new THREE.Group(), fur = P.fur, dk = P.dk, wh = P.wh, pk = P.pk, gr = P.eye, bk = 0x111111;
  g.add(
    wb(.3, .3, .7, fur, 0, .5, 0),
    wb(.34, .3, .26, fur, 0, .48, -.2), // quadril
    wb(.22, .26, .2, fur, 0, .6, .3), // pescoço
    wb(.2, .16, .2, wh, 0, .4, .3), // peito
    wb(.24, .06, .4, wh, 0, .36, 0) // barriga
  );
  if (P.stripes !== false) { // listras do dorso (preto e branco não têm)
    g.add(
      wb(.32, .305, .07, dk, 0, .5, -.2),
      wb(.32, .305, .07, dk, 0, .5, -.02),
      wb(.32, .305, .07, dk, 0, .5, .18)
    );
  }
  const h = new THREE.Group();
  h.position.set(0, .72, .42);
  h.add(
    wb(.3, .26, .28, fur, 0, 0, 0),
    ...(P.dog ? [wb(.15, .12, .2, P.snout, 0, -.07, .2), wb(.07, .05, .04, pk, 0, -.03, .31)] : [   // cachorro: focinho longo e nariz preto
      wb(.14, .1, .1, wh, 0, -.06, .17), // focinho
      wb(.05, .04, .03, pk, 0, -.02, .23),
      wb(.04, .03, .02, dk, 0, .14, .14)]) // marca na testa
  );
  // olhos abertos (g.eyes) e pálpebras fechadas (g.lids), para a animação de dormir
  const eyes = new THREE.Group();
  eyes.add(
    wb(.06, .06, .02, gr, .08, .04, .15),
    wb(.06, .06, .02, gr, -.08, .04, .15),
    wb(.02, .05, .02, bk, .08, .04, .16), // pupilas
    wb(.02, .05, .02, bk, -.08, .04, .16)
  );
  const lids = new THREE.Group();
  lids.add(wb(.07, .015, .02, bk, .08, .03, .155), wb(.07, .015, .02, bk, -.08, .03, .155));
  lids.visible = false;
  h.add(eyes, lids);
  g.eyes = eyes;
  g.lids = lids;
  // bigodes: 3 fios de cada lado, abertos em leque, curtos e levemente caídos
  if (!P.dog) for (const k of [-1, 1]) {
    [[-.02, .06], [-.055, -.12], [-.09, -.3]].forEach(([y, a]) => {
      const w = wb(.19, .012, .012, P.whisker || 0xf0f0f0, k * .155, y, .18);
      w.rotation.z = k * a;
      w.rotation.y = -k * .22;
      h.add(w);
    });
  }
  const ear = k => {
    const e = new THREE.Group();
    e.position.set(k * .1, .13, -.02);
    if (P.dog) { e.add(wb(.1, .22, .05, P.ear, 0, -.07, 0)); e.position.y = .1; e.rotation.z = -k * .55; }   // orelha caída
    else { e.add(wb(.1, .12, .05, fur, 0, .06, 0), wb(.06, .08, .02, pk, 0, .05, .03));
    e.rotation.z = -k * .3; } // inclinada para fora
    h.add(e);
    return e;
  };
  g.earL = ear(-1);
  g.earR = ear(1);
  g.add(h);
  g.head = h;

  const leg = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, .43, z);
    const k = new THREE.Group();
    k.position.y = -.2;
    k.add(wb(.08, .2, .08, fur, 0, -.1, 0), wb(.1, .05, .14, wh, 0, -.2, .025));
    l.add(wb(.1, .26, .1, fur, 0, -.07, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legs = [leg(-.1, .28), leg(.1, .28), leg(-.1, -.28), leg(.1, -.28)];

  // rabo longo e erguido em 6 segmentos encadeados
  g.tail = [];
  let tp = new THREE.Group();
  tp.position.set(0, .56, -.3);
  g.add(tp);
  for (let i = 0; i < 6; i++) {
    tp.add(wb(.06, .06, .13, P.tip && i > 3 ? P.tip : i % 2 || i > 4 ? dk : fur, 0, 0, -.065));
    const n = new THREE.Group();
    n.position.z = -.13;
    tp.add(n);
    tp.rotation.x = i ? .05 : .7;
    g.tail.push(tp);
    tp = n;
  }
  return g;
}
