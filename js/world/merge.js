/* Desempenho: funde a geometria ESTÁTICA do mundo (árvores, pedras, casas, muralha, fogueiras...) em poucas malhas.
   Agrupa por material e por "quadra" de 30 m: cada quadra continua sendo cortada pela câmera (fora da tela não é desenhada),
   e milhares de chamadas de desenho viram algumas centenas. NPCs, inimigos e peças animadas (userData.dyn) ficam de fora. */
import { scene } from '../core/engine.js';
import { xray } from './xray.js';

const CELL = 20;

/** Material único com cor por vértice (opaco, sem brilho próprio): permite fundir TODAS as cores numa só malha (poucas chamadas de desenho) */
const vcCache = new Map();
export const vcMat = (xr, side) => { const k = xr + '|' + side; let m = vcCache.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ vertexColors: true, side }); if (xr) xray(m); vcCache.set(k, m); } return m; };
/** A peça pode ir para a malha de cor por vértice? (não: vidros, brilhos e materiais que o jogo altera em tempo real) */
const mergeable = mat => mat.type === 'MeshLambertMaterial' && !mat.transparent && !mat.map && (!mat.emissive || mat.emissive.getHex() === 0) && !mat.vertexColors;
export const colorsOf = (geo, mat) => { const n = geo.attributes.position.count, a = new Float32Array(n * 3), c = mat.color; for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } return a; };

/** `before` = filhos da cena antes do mundo ser construído · `skip` = Set de objetos dinâmicos (NPCs, inimigos...) */
export function mergeStatics(before, skip) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  const dynAbove = o => { for (; o && o !== scene; o = o.parent) if (skip.has(o) || (o.userData && o.userData.dyn)) return true; return false; };

  const roots = scene.children.filter(o => !before.has(o) && !skip.has(o));
  roots.forEach(root => root.traverse(m => {
    if (!m.isMesh || dynAbove(m) || !m.geometry.attributes.position || Array.isArray(m.material) || m.isSkinnedMesh) return;
    const mat = m.material, vc = mergeable(mat);
    const key = vc ? 'vc|' + (mat.userData.xr ? 1 : 0) + '|' + mat.side : [mat.color.getHex(), mat.userData.xr ? 1 : 0, mat.transparent ? mat.opacity : 1, mat.side, mat.emissive ? mat.emissive.getHex() : 0, mat.type].join('|');
    const c = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
    const gk = key + '@' + Math.floor(c.x / CELL) + ',' + Math.floor(c.z / CELL);
    let g = groups.get(gk);
    if (!g) groups.set(gk, g = { mat: vc ? vcMat(mat.userData.xr ? 1 : 0, mat.side) : mat, vc, list: [] });
    g.list.push(m);
  }));

  let before3 = 0, after3 = 0;
  groups.forEach(g => {
    const pos = [], nor = [], col = [];
    g.list.forEach(m => {
      before3++;
      const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
      if (g.vc) col.push(colorsOf(geo, m.material));
      pos.push(geo.attributes.position.array);
      nor.push(geo.attributes.normal ? geo.attributes.normal.array : new Float32Array(geo.attributes.position.array.length));
      geo.dispose();
    });
    const cat = arrs => { const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; arrs.forEach(a => { out.set(a, o); o += a.length; }); return out; };
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3));
    bg.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3));
    if (g.vc) bg.setAttribute('color', new THREE.BufferAttribute(cat(col), 3));
    bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, g.mat);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    g.list.forEach(m => { if (m.parent) m.parent.remove(m); m.geometry.dispose(); });
    after3++;
  });
  // grupos que ficaram sem nada dentro saem da cena; os que sobraram (peças animadas) não precisam recalcular
  roots.forEach(r => { if (!r.isMesh && !r.children.length && r.parent) r.parent.remove(r); });
  return { from: before3, to: after3 };
}

/** Funde as peças de um grupo (que precisa ser ligado/desligado em jogo, como telhado e paredes) em poucas malhas por material.
    `skip` = grupos aninhados que continuam separados. O grupo fica fora da fusão geral (userData.dyn). */
export function bakeGroup(g, skip = []) {
  g.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const buckets = new Map(), olds = [];
  const walk = o => {
    if (skip.includes(o)) return;
    if (o.isMesh && o.geometry.attributes.position && !Array.isArray(o.material)) {
      const mat = o.material, vc = mergeable(mat), key = vc ? 'vc|' + (mat.userData.xr ? 1 : 0) + '|' + mat.side : [mat.color.getHex(), mat.userData.xr ? 1 : 0, mat.transparent ? mat.opacity : 1, mat.side, mat.emissive ? mat.emissive.getHex() : 0].join('|');
      let b = buckets.get(key); if (!b) buckets.set(key, b = { mat: vc ? vcMat(mat.userData.xr ? 1 : 0, mat.side) : mat, vc, pos: [], nor: [], col: [] });
      const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (vc) b.col.push(colorsOf(geo, mat));
      b.pos.push(geo.attributes.position.array); b.nor.push(geo.attributes.normal.array); geo.dispose();
      olds.push(o);
    }
    o.children.forEach(walk);
  };
  walk(g);
  const cat = arrs => { const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0)); let k = 0; arrs.forEach(a => { out.set(a, k); k += a.length; }); return out; };
  olds.forEach(o => { if (o.parent) o.parent.remove(o); o.geometry.dispose(); });
  buckets.forEach(b => {
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(cat(b.pos), 3));
    bg.setAttribute('normal', new THREE.BufferAttribute(cat(b.nor), 3));
    if (b.vc) bg.setAttribute('color', new THREE.BufferAttribute(cat(b.col), 3));
    bg.computeBoundingSphere();
    g.add(new THREE.Mesh(bg, b.mat));
  });
  g.userData.dyn = 1;
}
