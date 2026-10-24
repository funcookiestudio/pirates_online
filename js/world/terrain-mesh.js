/* Malha 3D da ilha procedural: relevo com cor por vértice, mar, rios/lagos, pontes e vegetação instanciada.
   Tudo é marcado userData.dyn para o mergeStatics deixar quieto (a malha já é única e instanciada). */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { N, V, ss, rngf, hash, RD } from './islandgen.js';
import { isl, H, VX, VZ, HV, SEA, groundY, addObstacles } from './terrain.js';

const E = N / 2;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** cor do terreno: água rasa → areia → grama (por umidade) → rocha → neve; estrada em terra */
function col(h, ny, rw, v, mo, dep) {
  let c = [.08, .26, .43];
  c = mixc(c, [.14, .42, .55], ss(-3.6, -2.4, h)); c = mixc(c, [.60, .74, .62], ss(-1.6, -.8, h)); c = mixc(c, [.87, .79, .56], ss(-.2, .3, h));
  const t = Math.min(1, Math.max(0, (h - .8) / 5));
  let g = mixc([.66, .62, .32], [.42, .62, .27], ss(.28, .42, mo)); g = mixc(g, [.22, .46, .23], ss(.46, .6, mo)); g = mixc(g, [.30, .40, .27], ss(.62, .7, mo) * ss(1.8, 1.1, h));
  g = [g[0] * (1 - .25 * t), g[1] * (1 - .2 * t), g[2] * (1 - .1 * t)]; c = mixc(c, g, ss(.6, 1.1, h));
  c = mixc(c, [.46, .43, .41], Math.max(ss(6, 6.9, h), ss(.9, .72, ny))); c = mixc(c, [.88, .88, .92], ss(9, 9.7, h));
  c = mixc(c, [.56, .42, .27], rw * ss(.1, .45, h)); c = mixc(c, [.40, .46, .40], ss(0, .5, dep));
  return [c[0] * v, c[1] * v, c[2] * v];
}

const dyn = o => { o.userData.dyn = 1; return o; };
const mat = c => new THREE.MeshLambertMaterial({ color: c });

function terrain() {
  const { pm, mo, W } = isl, r = rngf(hash(isl.seed + 'm')), NV = V * V, pos = new Float32Array(NV * 3), cl = new Float32Array(NV * 3);
  const hh = (i, j) => H[Math.min(N, Math.max(0, j)) * V + Math.min(N, Math.max(0, i))];
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const k = j * V + i, inner = i > 0 && j > 0 && i < N && j < N && H[k] > SEA + .35 && !pm[k], jj = inner ? .12 : 0;
    pos[k * 3] = i - E - VX + (r() - .5) * jj; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = j - E - VZ + (r() - .5) * jj;
    const gx = (hh(i + 1, j) - hh(i - 1, j)) / 2, gz = (hh(i, j + 1) - hh(i, j - 1)) / 2, ny = 1 / Math.hypot(1, gx, gz);
    let rw = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x <= N && y <= N && pm[y * V + x] === 1) rw++; }
    const cc = col(H[k] + HV, ny, Math.min(1, rw / 9 * 1.6), .97 + r() * .06, mo[k], W[k] > -90 ? Math.max(0, W[k] - H[k]) : 0);
    cl[k * 3] = cc[0]; cl[k * 3 + 1] = cc[1]; cl[k * 3 + 2] = cc[2];
  }
  // blocos de 25×25 m com vértices compartilhados: cada bloco é cortado pela câmera/neblina separadamente
  const g0 = new THREE.BufferGeometry();
  const posA = new THREE.BufferAttribute(pos, 3), colA = new THREE.BufferAttribute(cl, 3);
  g0.setAttribute('position', posA);
  const full = new Uint32Array(N * N * 6); let q = 0;
  const quad = (i, j) => {
    const a = j * V + i, b = a + 1, c = a + V, d = c + 1;
    return (i + j) & 1 ? [a, c, b, b, c, d] : [a, c, d, a, d, b];
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) for (const v of quad(i, j)) full[q++] = v;
  g0.setIndex(new THREE.BufferAttribute(full, 1)); g0.computeVertexNormals();
  const norA = g0.getAttribute('normal'), mt = new THREE.MeshLambertMaterial({ vertexColors: true }), root = new THREE.Group(), CH = 25;
  for (let cj = 0; cj < N; cj += CH) for (let ci = 0; ci < N; ci += CH) {
    const ix = [];
    for (let j = cj; j < Math.min(N, cj + CH); j++) for (let i = ci; i < Math.min(N, ci + CH); i++) ix.push(...quad(i, j));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', posA); g.setAttribute('color', colA); g.setAttribute('normal', norA);
    g.setIndex(ix); g.computeBoundingSphere();
    root.add(new THREE.Mesh(g, mt));
  }
  return dyn(root);
}

function water() {
  const { W } = isl, pos = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = W[j * V + i], b = W[j * V + i + 1], c = W[(j + 1) * V + i], d = W[(j + 1) * V + i + 1];
    if (a < -90 && b < -90 && c < -90 && d < -90) continue;
    let t = 0, n = 0; for (const q of [a, b, c, d]) if (q > -90) { t += q; n++; }
    const m = t / n, A = a > -90 ? a : m, B = b > -90 ? b : m, C = c > -90 ? c : m, D = d > -90 ? d : m, x0 = i - E - VX, z0 = j - E - VZ;
    pos.push(x0, A, z0, x0, C, z0 + 1, x0 + 1, B, z0, x0 + 1, B, z0, x0, C, z0 + 1, x0 + 1, D, z0 + 1);
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.computeVertexNormals();
  return dyn(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x3d9fc4, transparent: true, opacity: .74, depthWrite: false })));
}

function bridges() {
  const g = new THREE.Group(), bm = mat(0x8a6238), rm = mat(0x5a3e22);
  for (const [x, z, y, yaw, L] of isl.bridges) {
    const w = RD.half * 2, u = new THREE.Group(); u.position.set(x - VX, y, z - VZ); u.rotation.y = yaw;
    const dk = new THREE.Mesh(new THREE.BoxGeometry(L + .15, .2, w), bm); dk.position.y = -.1; u.add(dk);
    for (const s of [-1, 1]) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(L + .15, .12, .12), rm); rl.position.set(0, .55, s * (w / 2 - .1)); u.add(rl);
      const po = new THREE.Mesh(new THREE.BoxGeometry(.14, .6, .14), rm); po.position.set(0, .25, s * (w / 2 - .1)); u.add(po);
    }
    g.add(u);
  }
  return dyn(g);
}

function inst(geo, list, fn, base, vr, rr) {
  const m = new THREE.InstancedMesh(geo, mat(0xffffff), Math.max(1, list.length)), o = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  list.forEach(a => {
    if (fn(o, a) === false) return;
    o.updateMatrix(); m.setMatrixAt(n, o.matrix);
    c.setHex(a[5] !== undefined && base === null ? a[5] : base); c.offsetHSL(0, 0, (rr() - .5) * vr); m.setColorAt(n, c); n++;
  });
  m.count = n; m.frustumCulled = false;
  return dyn(m);
}

/** vegetação do gerador (decorativa): fora da vila e dos postos */
function vegetation(posts) {
  const { palms, pines, rocks, bushes } = isl.veg, rr = rngf(hash(isl.seed + 'v')), g = new THREE.Group();
  const trunk = new THREE.CylinderGeometry(.07, .11, 1, 5); trunk.translate(0, .5, 0);
  const ok = (x, z) => Math.hypot(x, z) > VILLAGE_R + 8 && posts.every(p => Math.hypot(p.x - x, p.z - z) > 10);
  const f = (a, k) => { const x = a[0] - VX, z = a[1] - VZ; return ok(x, z) ? [x, z, groundY(x, z), a] : false; };
  const L = list => list.map(a => ({ x: a[0] - VX, z: a[1] - VZ, a })).filter(q => ok(q.x, q.z)).map(q => { const w = q.a.slice(); w[0] = q.x; w[1] = q.z; return w; });
  const pl = L(palms), pi = L(pines), ro = L(rocks), bu = L(bushes), Y = a => groundY(a[0], a[1]);
  addObstacles([...pl.map(a => [a[0], a[1], .2 * a[2]]), ...pi.map(a => [a[0], a[1], .25 * a[2]]), ...ro.map(a => [a[0], a[1], .5 * a[2]])]);
  g.add(
    inst(trunk, pl, (o, a) => { o.position.set(a[0], Y(a), a[1]); o.rotation.set(0, a[4], a[3]); o.scale.set(a[2], 1.5 * a[2], a[2]); }, 0x7a5a34, .1, rr),
    inst(new THREE.ConeGeometry(.8, .4, 6), pl, (o, a) => { o.position.set(a[0] - Math.sin(a[3]) * 1.5 * a[2], Y(a) + 1.5 * a[2] * Math.cos(a[3]) + .1, a[1]); o.rotation.set(0, a[4], 0); o.scale.setScalar(a[2]); }, 0x3d9a3a, .12, rr),
    inst(trunk, pi, (o, a) => { o.position.set(a[0], Y(a), a[1]); o.rotation.set(0, a[4], 0); o.scale.set(a[2], .8 * a[2], a[2]); }, 0x5a3e22, .08, rr),
    inst(new THREE.ConeGeometry(.62, 1.3, 6), pi, (o, a) => { o.position.set(a[0], Y(a) + 1.35 * a[2], a[1]); o.rotation.set(0, a[4], 0); o.scale.setScalar(a[2]); }, 0x2a6a34, .14, rr),
    inst(new THREE.ConeGeometry(.42, .9, 6), pi, (o, a) => { o.position.set(a[0], Y(a) + 2.05 * a[2], a[1]); o.rotation.set(0, a[4], 0); o.scale.setScalar(a[2]); }, 0x2f7438, .14, rr),
    inst(new THREE.IcosahedronGeometry(.5, 0), ro, (o, a) => { o.position.set(a[0], Y(a) + .1, a[1]); o.rotation.set(a[4], a[4] * 2, 0); o.scale.set(a[2], a[2] * .7, a[2] * 1.1); }, 0x7a7672, .14, rr),
    inst(new THREE.IcosahedronGeometry(.5, 0), bu, (o, a) => { o.position.set(a[0], Y(a) + .12 * a[2], a[1]); o.rotation.set(0, a[4], 0); o.scale.set(a[2] * 1.1, a[2] * .7, a[2] * 1.1); }, null, .12, rr),
  );
  return dyn(g);
}

/** Cria chão, mar, água doce, pontes e vegetação */
export function buildTerrainMesh(posts) {
  scene.add(terrain());
  const w = water(); if (w) scene.add(w);
  scene.add(bridges(), vegetation(posts));
  const sea = dyn(new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2f93bd, transparent: true, opacity: .58, depthWrite: false })));
  sea.position.set(0, SEA, 0);
  const deep = dyn(new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), mat(0x0e3a56)));
  deep.position.set(0, SEA - 3.4, 0);
  scene.add(sea, deep);
}

/** Imagem do relevo (1 px = 1 m) para o minimapa */
export function terrainImage() {
  const cv = document.createElement('canvas'); cv.width = cv.height = V;
  const x = cv.getContext('2d'), im = x.createImageData(V, V), { pm, W, bio } = isl;
  const B = [[222, 200, 142], [120, 170, 80], [50, 110, 60], [80, 100, 70], [170, 160, 90], [116, 110, 104]];
  for (let k = 0; k < V * V; k++) {
    const h = H[k] - SEA; let c;
    if (h < -.1) c = [20, 64, 110]; else if (h < .35) c = [90, 170, 170];
    else if (W[k] > -90 && W[k] - H[k] > .2) c = [60, 150, 210]; else if (pm[k] === 1) c = [140, 105, 68];
    else { const b = B[bio[k]], f = .55 + Math.min(.3, h * .03); c = [b[0] * f, b[1] * f, b[2] * f]; }
    im.data.set([c[0], c[1], c[2], 255], k * 4);
  }
  x.putImageData(im, 0, 0);
  return cv;
}
