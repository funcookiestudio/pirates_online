/* Construção do corpo "de blocos" usado pelo jogador e pelos inimigos. */
import { M } from '../core/utils.js';

/**
 * Cria um humanoide pirata.
 * Retorna um Group com: legL, legR (pernas com .knee), arm (braço da espada, com .fa),
 * armL (braço livre, com .fa), up (grupo do tronco, pivô no quadril).
 */
export function person(skin, shirt, pants, hat) {
  const g = new THREE.Group();
  const box = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z);
    return m;
  };
  const bc = new THREE.Color(skin).multiplyScalar(.35);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .05, 3), M(hat));
  brim.position.y = 2.04;
  brim.rotation.y = Math.PI / 2;

  // tronco, cinto e lenço
  g.add(
    box(.62, .78, .38, shirt, 0, 1.15, 0),
    box(.66, .1, .42, 0x3a2412, 0, .8, 0),
    box(.14, .12, .05, 0xe0b030, 0, .8, .21),
    box(.5, .1, .42, 0xb02020, 0, 1.55, 0)
  );

  // cabeça (grupo com pivô no pescoço: inclina para mirar). eyeL/eyeR = olhos (o esquerdo é o de +x)
  const hd = new THREE.Group();
  hd.position.y = 1.6;
  const eyeR = box(.07, .07, .02, 0x111111, -.1, 1.85, .215);
  const eyeL = box(.07, .07, .02, 0x111111, .1, 1.85, .215);
  [
    box(.42, .42, .42, skin, 0, 1.8, 0), eyeR, eyeL,
    box(.3, .16, .08, bc, 0, 1.63, .2),
    box(.12, .05, .02, bc, 0, 1.74, .215),
    brim,
    box(.38, .2, .38, hat, 0, 2.15, 0),
    box(.1, .1, .02, 0xf0f0f0, 0, 2.15, .2),
    box(.06, .3, .06, 0xc02020, .22, 2.25, 0)
  ].forEach(m => { m.position.y -= 1.6; hd.add(m); });
  g.add(hd);
  g.head = hd;
  g.eyeL = eyeL;

  // pernas (coxa + joelho/canela)
  const leg = x => {
    const l = new THREE.Group();
    l.position.set(x, .72, 0);
    const k = new THREE.Group();
    k.position.y = -.25;
    k.add(box(.21, .25, .23, pants, 0, -.125, 0), box(.25, .22, .32, 0x2a1a10, 0, -.37, .03));
    l.add(box(.21, .25, .23, pants, 0, -.125, 0), k);
    l.knee = k;
    g.add(l);
    return l;
  };
  g.legL = leg(-.16);
  g.legR = leg(.16);

  // braço da arma (com espada padrão no antebraço)
  const a = new THREE.Group();
  a.position.set(-.4, 1.45, 0);
  const fa = new THREE.Group();
  fa.position.y = -.25;
  fa.add(
    box(.16, .25, .16, shirt, 0, -.125, 0),
    box(.15, .15, .15, skin, 0, -.32, 0),
    box(.07, .95, .05, 0xd8dce0, 0, -.85, 0),
    box(.32, .06, .09, 0xb08a30, 0, -.41, 0)
  );
  a.add(box(.16, .25, .16, shirt, 0, -.125, 0), fa);
  a.fa = fa;
  g.add(a);
  g.arm = a;

  // braço livre
  const al = new THREE.Group();
  al.position.set(.4, 1.45, 0);
  const fl = new THREE.Group();
  fl.position.y = -.25;
  fl.add(box(.16, .25, .16, shirt, 0, -.125, 0), box(.15, .15, .15, skin, 0, -.32, 0));
  al.add(box(.16, .25, .16, shirt, 0, -.125, 0), fl);
  al.fa = fl;
  g.add(al);
  g.armL = al;

  // Parte de cima (tronco, cabeça, braços) agrupada no quadril: permite inclinar o tronco ao sentar/levantar.
  // Com rotação 0 tudo continua nas mesmas coordenadas de antes (a origem do grupo é `userData.off`).
  const up = new THREE.Group();
  up.position.y = .72;
  up.userData.off = new THREE.Vector3(0, .72, 0);
  [...g.children].filter(c => c !== g.legL && c !== g.legR).forEach(c => { c.position.y -= .72; up.add(c); });
  g.add(up);
  g.up = up;

  return g;
}

/** Dobra os joelhos e o braço livre conforme a fase do passo (ph) e a intensidade (m) */
export function bend(g, ph, m) {
  const c = Math.cos(ph), w = Math.sin(ph);
  g.legL.knee.rotation.x = (Math.max(0, -c) * .85 + .05) * m;
  g.legR.knee.rotation.x = (Math.max(0, c) * .85 + .05) * m;
  g.armL.fa.rotation.x = -.15 - m * (.2 + .5 * Math.max(0, w));
}
