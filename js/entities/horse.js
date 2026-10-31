/* Cavalo (modelo novo, blocos arredondados fundidos por parte). Usado na montaria (mount.js) e nos currais (farm.js).
   Expõe: g.HB (corpo), g.legs[4] (quadril, com .knee e .foot), g.neck, g.head, g.tail, g.tail2, g.earL, g.earR.
   Pelagens: 0 Castanho · 1 Preto · 2 Branco · 3 Palomino · 4 Pampa. Crinas: 0 da pelagem · 1 preta · 2 clara · 3 ruiva. */

function bb(w, h, d, b, col) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col }));
}
/** Funde os blocos de um grupo numa malha só (cores por vértice): poucas draw calls */
function fuse(grp) {
  const ms = grp.children.filter(c => c.isMesh); if (ms.length < 2) return;
  const pos = [], nor = [], col = [];
  ms.forEach(m => {
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
}

//            nome        corpo    sombra   crina(pelagem) meias
export const HORSE_COATS = [['Castanho', 0x8a4a2a, 0x74401f, 0x24160e, 1], ['Preto', 0x2b2724, 0x201d1b, 0x0e0d0c, 0], ['Branco', 0xe8e3d6, 0xd4cfc0, 0xb8b2a2, 0], ['Palomino', 0xc99a4e, 0xb5863e, 0xf0e6c8, 0], ['Pampa', 0xf0ead8, 0x6a3a20, 0x2a1a10, 0]];
const MANES = [-1, 0x1a1410, 0xf0e6c8, 0x8a3b1e];
const HF = 0x2a2018, WH = 0xf0ead8;

export function mkHorse(ci = Math.floor(Math.random() * 3), mi = 0) {
  const [, C, D, M0, sock] = HORSE_COATS[ci], MA = MANES[mi] < 0 ? M0 : MANES[mi];
  const g = new THREE.Group(), HB = new THREE.Group(); HB.position.y = 1.4; g.add(HB);
  const bx = (w, h, d, c, x, y, z, p, b) => { const m = bb(w, h, d, b === undefined ? .05 : b, c); m.position.set(x, y, z); p.add(m); return m; };
  const gr = (x, y, z, p) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
  bx(.8, .95, 1.1, C, 0, 0, 0, HB, .12); bx(.8, 1.0, .55, C, 0, .03, .82, HB, .12);
  bx(.86, .95, .6, ci === 4 ? C : D, 0, 0, -.85, HB, .12); bx(.4, .14, .4, D, 0, .52, .55, HB, .05); bx(.5, .5, .5, C, 0, .25, .78, HB, .1);
  if (ci === 4) { bx(.5, .5, .7, D, .2, .1, .1, HB, .1); bx(.3, .4, .3, D, -.22, .35, .65, HB, .08); }
  const legs = [];
  [[-.28, .78, 0], [.28, .78, 0], [-.3, -.8, 1], [.3, -.8, 1]].forEach(([x, z, hd], i) => {
    const h = gr(x, -.4, z, HB), w = hd ? .3 : .26;
    bx(w, .5, w + .06, hd ? D : C, 0, -.25, 0, h, .06);
    const k = gr(0, -.5, 0, h); bx(w - .06, .42, w - .04, (sock && (i === 1 || i === 2)) ? WH : C, 0, -.2, 0, k, .04);
    const f = gr(0, -.4, 0, k); bx(w, .16, w + .04, HF, 0, -.03, .01, f, .03);
    h.knee = k; h.foot = f; legs.push(h);
  });
  const neck = gr(0, .32, .82, HB); neck.rotation.x = .75;
  bx(.4, .86, .44, C, 0, .4, 0, neck, .08);
  for (let i = 0; i < 5; i++) bx(.1, .2, .12, MA, 0, .1 + i * .17, -.27, neck, .03);
  const head = gr(0, .86, 0, neck); head.rotation.x = .1;
  bx(.36, .42, .74, C, 0, -.04, .22, head, .08); bx(.29, .3, .34, 0xa8704a, 0, -.1, .66, head, .06);
  if (sock) bx(.08, .03, .5, WH, 0, .18, .22, head, .01);
  bx(.3, .05, .3, 0x3a2a1c, 0, -.1, .52, head, .015); bx(.3, .25, .1, MA, 0, .2, .06, head, .03);
  [-1, 1].forEach(s => { bx(.04, .07, .07, 0x111111, s * .19, .06, .3, head, .01); bx(.05, .05, .04, 0x24160e, s * .08, -.1, .84, head, .01); });
  const ears = [-1, 1].map(s => { const e = gr(s * .12, .18, -.08, head); bx(.08, .22, .08, C, 0, .11, 0, e, .02); return e; });
  const tail = gr(0, .32, -1.14, HB); bx(.18, .2, .2, MA, 0, -.05, -.05, tail, .04); bx(.15, .5, .15, MA, 0, -.3, -.05, tail, .04);
  const tail2 = gr(0, -.55, -.05, tail); bx(.13, .5, .13, MA, 0, -.25, 0, tail2, .03);
  g.traverse(n => { if (n.isGroup) fuse(n); });
  Object.assign(g, { HB, legs, neck, head, tail, tail2, earL: ears[0], earR: ears[1] });
  return g;
}
