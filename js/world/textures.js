/* Texturas do Stylized Nature MegaKit (Quaternius, CC0), reduzidas a 256px. A cor do material tinge a textura. */
const loader = new THREE.TextureLoader();
const cache = {};
export function tex(name) {
  if (!cache[name]) {
    const t = loader.load(`icons/tex/${name}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 2;
    cache[name] = t;
  }
  return cache[name];
}
/** Material Lambert texturizado; `c` tinge a textura (0xffffff = cor original) */
export const texMat = (name, c = 0xffffff) => new THREE.MeshLambertMaterial({ color: c, map: tex(name) });
