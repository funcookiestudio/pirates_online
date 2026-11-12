/* Melhorias do cais: dois piers laterais (um de cada lado), barco a remo e veleiro atracados, bancas de peixe com toldo no começo do cais, redes, caixas, barris,
   cordas, cabeços de amarração e postes de lanterna. Chamado por pois.js logo depois do pier principal; usa o mesmo sistema de convés pisável (isl.deck / isl.nav). */
import { props } from '../core/registry.js';
import { M as M0 } from '../core/utils.js';
import { xray } from './xray.js';
import { isl, VX, VZ, SEA, groundY, floorY } from './terrain.js';
import { N, V } from './islandgen.js';

const M = c => xray(M0(c));
const E = N / 2;

export function buildPortExtras(g, port, pdx, pdz, deckY, LEN) {
  const bx = (w, h, d, c, x, y, z, yaw = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.rotation.y = yaw; g.add(m); return m; };
  const cy = (rt, rb, h, c, x, y, z, n = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  const solid = (x, z, r) => props.push({ position: { x, z, y: 0 }, r });
  const yaw = Math.atan2(pdx, pdz), bdx = pdz, bdz = -pdx;                                 // a = ao longo do cais (para o mar), b = lateral
  const P = (t, l) => [port.x + pdx * t + bdx * l, port.z + pdz * t + bdz * l];
  const stamp = (x, z, r = 1.2) => {   // torna o convés pisável nas células em volta de (x,z)
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const gx = Math.round(x + VX + E) + a, gz = Math.round(z + VZ + E) + b;
      if (gx < 1 || gz < 1 || gx >= N || gz >= N || Math.hypot(gx - (x + VX + E), gz - (z + VZ + E)) > r) continue;
      const k = gz * V + gx; if (isl.deck[k] < deckY) isl.deck[k] = deckY; isl.nav[k] = 0;
    }
  };
  const post = (x, z, c = 0x4a3220) => { const fy = floorY(x, z) - .4, h = deckY + .9 - fy; bx(.22, h, .22, c, x, fy + h / 2, z); };

  // ── piers laterais: um para a direita (t=8, 7 m) e um para a esquerda (t=12, 5 m) ──
  const side = (t0, sg, len) => {
    for (let l = 1.2; l <= len; l += .45) { const [x, z] = P(t0, sg * l); stamp(x, z, 1.15); }
    for (let l = 1.2; l <= len; l += .8) { const [x, z] = P(t0, sg * l); bx(.78, .16, 2.6, l % 1.6 < .8 ? 0x8a6238 : 0x7a5530, x, deckY - .08, z, yaw + Math.PI / 2 * 0); }
    for (let l = 2; l <= len + .1; l += 2.4) for (const s2 of [-1, 1]) {
      const [x, z] = P(t0 + s2 * 1.25, sg * l); post(x, z);
      if (l + 2.4 <= len + .1 || l >= len - .1) bx(2.4 * 0 + .14, .1, 2.4, 0x6a4a28, ...[x, deckY + .75, z], yaw + Math.PI / 2);
    }
    const [ex, ez] = P(t0, sg * len); bx(2.7, .12, .14, 0x6a4a28, ex, deckY + .75, ez, yaw);   // guarda-corpo da ponta
    // cabeços de amarração
    for (const s2 of [-1, 1]) { const [x, z] = P(t0 + s2 * 1.1, sg * (len - .5)); cy(.14, .18, .4, 0x2b2b30, x, deckY + .2, z, 8); }
    return P(t0, sg * len);
  };
  side(8, 1, 7); side(12, -1, 5);

  // ── barcos atracados ──
  const hull = (x, z, ang, L, W, c1, c2) => {   // casco de caixas: fundo, laterais inclinadas, proa e popa, bancos
    const gr = new THREE.Group(); gr.position.set(x, SEA + .12, z); gr.rotation.y = ang; g.add(gr);
    const add = (w, h, d, c, px, py, pz, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(px, py, pz); m.rotation.x = rx; m.rotation.z = rz; gr.add(m); return m; };
    add(W * .7, .12, L * .85, c1, 0, .05, 0);
    for (const s2 of [-1, 1]) { add(.12, .62, L * .9, c1, s2 * W * .43, .38, 0, 0, -s2 * .28); add(.08, .06, L * .9, c2, s2 * W * .5, .7, 0); }
    add(W * .8, .62, .12, c1, 0, .38, L * .43, .28, 0); add(W * .8, .62, .12, c1, 0, .38, -L * .43, -.28, 0);
    const bow = add(.1, .62, L * .26, c1, 0, .4, L * .5 + .04); bow.rotation.x = -.5; bow.scale.x = W * 2.6; bow.visible = true;
    for (const z2 of [-.25, .05, .3]) add(W * .78, .07, .26, c2, 0, .44, z2 * L);
    add(.04, .04, 1.5, 0x5a3a1a, W * .45, .9, .1).rotation.y = .3;   // remo
    return gr;
  };
  const [rx, rz] = P(11.5, 3.2);   hull(rx, rz, yaw, 3.3, 1.35, 0x8a5a3a, 0x5a3a1a);                  // barco a remo ao lado do pier da direita
  const [rx2, rz2] = P(8, 9.4); hull(rx2, rz2, yaw + 1.57, 3.0, 1.2, 0x2b5a7a, 0xd6c394);             // outro, de proa para o pier
  const [sx, sz] = P(13.5, -7.2);
  const sail = hull(sx, sz, yaw, 6.2, 2.2, 0x7a5a3a, 0x3a2a1a);                                       // veleiro pequeno
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 5.6, 8), M(0x4a3220)); mast.position.set(0, 2.9, .5); sail.add(mast);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 4.2); sh.lineTo(-2.5, .3); sh.lineTo(0, 0);
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: 0xeee6cc, side: THREE.DoubleSide })); cloth.rotation.y = Math.PI / 2; cloth.position.set(0, 1.0, .5); sail.add(cloth);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 6), M(0x4a3220)); boom.rotation.x = Math.PI / 2; boom.position.set(0, 1.05, -.8); sail.add(boom);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(.02, .3, .55), M(0xb02020)); flag.position.set(0, 5.6, .8); sail.add(flag);

  // ── em terra, no começo do cais: bancas de peixe com toldo listrado, redes secando, caixas, barris e cordas ──
  const land = (t, l, f) => { const [x, z] = P(t, l); const y = groundY(x, z); f(x, z, y); return [x, z, y]; };
  land(-4.2, 4.6, (x, z, y) => {   // banca (toldo de listras vermelhas e creme)
    for (const [dx, dz] of [[-1.3, -.8], [1.3, -.8], [-1.3, .8], [1.3, .8]]) bx(.12, 2.2, .12, 0x5a3a1a, x + dx * Math.cos(yaw) + dz * Math.sin(yaw), y + 1.1, z - dx * Math.sin(yaw) + dz * Math.cos(yaw), yaw);
    for (let i = 0; i < 6; i++) { const u = -1.25 + i * .5, m = bx(.5, .07, 2.0, i % 2 ? 0xe6d9b6 : 0xb02a2a, x + u * Math.cos(yaw), y + 2.3 + (i - 2.5) * 0 , z - u * Math.sin(yaw), yaw); m.rotation.x = 0; m.position.y = y + 2.3; }
    bx(2.6, .08, 1.0, 0x8a6238, x, y + .85, z, yaw); for (const s2 of [-1, 1]) bx(.1, .85, .8, 0x6e4d2c, x + s2 * 1.1 * Math.cos(yaw), y + .42, z - s2 * 1.1 * Math.sin(yaw), yaw);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 6, 4), M(i % 2 ? 0x8aa8b8 : 0xc0c8d0)); m.scale.set(1.8, .5, .8); m.position.set(x + (-.8 + i * .5) * Math.cos(yaw), y + .95, z - (-.8 + i * .5) * Math.sin(yaw)); m.rotation.y = yaw + i; g.add(m); }
    solid(x, z, 1.5);
  });
  land(-3.0, -4.4, (x, z, y) => {   // rede secando entre dois mastros
    for (const s2 of [-1, 1]) bx(.12, 2.4, .12, 0x5a3a1a, x + s2 * 1.4 * Math.cos(yaw), y + 1.2, z - s2 * 1.4 * Math.sin(yaw));
    for (let i = 0; i < 4; i++) bx(2.8, .03, .03, 0x7a6a3a, x, y + 2.1 - i * .35, z, yaw + Math.PI / 2 * 0).rotation.y = yaw + Math.PI / 2;
    const net = bx(2.7, 1.2, .02, 0x6a5a38, x, y + 1.5, z, yaw + Math.PI / 2); net.material.transparent = true; net.material.opacity = .45; net.material.alphaTest = .1;
    solid(x, z, 1.5);
  });
  land(-2.0, 1.4, (x, z, y) => { for (let i = 0; i < 3; i++) bx(.7, .5, .5, 0x9a7444, x + i * .1, y + .25 + i * 0, z + i * .7 - .7, yaw + i * .15); bx(.6, .45, .5, 0xa88050, x, y + .74, z, yaw + .3); solid(x, z, 1.1); });   // caixas de peixe
  land(-1.2, -1.8, (x, z, y) => { cy(.38, .45, .45, 0x7a4a24, x, y + .22, z); cy(.45, .38, .45, 0x7a4a24, x + .0, y + .67, z); cy(.38, .45, .45, 0x7a4a24, x + .9, y + .22, z + .1); solid(x + .4, z, 1.0); });   // barris
  land(-.3, 2.6, (x, z, y) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.4, .09, 6, 12), M(0xb8a070)); t.rotation.x = Math.PI / 2; t.position.set(x, y + .1, z); g.add(t); const t2 = t.clone(); t2.position.y += .15; t2.scale.setScalar(.8); g.add(t2); });   // rolo de corda
  // postes de lanterna no começo e na ponta do pier principal
  for (const [t, l] of [[0, 1.55], [0, -1.55], [LEN - .5, 1.55], [LEN - .5, -1.55]]) { const [x, z] = P(t, l); bx(.14, 1.7, .14, 0x3a2a1a, x, deckY + .85, z); bx(.3, .34, .3, 0xe8c070, x, deckY + 1.9, z); bx(.42, .08, .42, 0x2b2b30, x, deckY + 2.12, z); }
  // cabeços de amarração ao longo do pier principal
  for (let t = 2; t <= LEN - 1; t += 4) for (const s2 of [-1, 1]) { const [x, z] = P(t, s2 * 1.1); cy(.13, .17, .38, 0x2b2b30, x, deckY + .19, z, 8); }
}
