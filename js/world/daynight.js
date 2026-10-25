/* Dia e noite: céu, névoa e luzes seguem a hora do relógio do jogo (core/clock.js). */
import { scene, hemi, torch, cam } from '../core/engine.js';
import { hourNow } from '../core/clock.js';

// hora, céu, luz do céu, luz do chão, intensidade ambiente, tocha
const K = [
  [0, 0x070b18, 0x4a5c90, 0x1a1a28, .26, 1.9],
  [5, 0x0b1020, 0x4a5c90, 0x1a1a28, .26, 1.9],
  [6.5, 0xd08a60, 0xe0a890, 0x4a3a30, .5, 1.4],
  [8, 0x7fb4d4, 0xaaccdd, 0x443322, .85, 1.0],
  [17, 0x7fb4d4, 0xaaccdd, 0x443322, .85, 1.0],
  [19, 0xd86a48, 0xe09a80, 0x4a3030, .55, 1.4],
  [20.5, 0x0b1020, 0x4a5c90, 0x1a1a28, .3, 1.8],
  [24, 0x070b18, 0x4a5c90, 0x1a1a28, .26, 1.9],
];
const A = new THREE.Color(), B = new THREE.Color();
const mix = (c, a, b, u) => { A.setHex(a); B.setHex(b); c.copy(A).lerp(B, u); };
let lastH = -1;

// estrelas: um domo de pontos que acompanha a câmera e aparece à noite
const stars = (() => {
  const n = 220, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.acos(1 - Math.random() * .92), r = 52;   // só no alto do céu
    pos[i * 3] = Math.sin(e) * Math.cos(a) * r; pos[i * 3 + 1] = Math.cos(e) * r; pos[i * 3 + 2] = Math.sin(e) * Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  pts.frustumCulled = false; pts.visible = false; pts.userData.dyn = 1; scene.add(pts);
  return pts;
})();

/** True entre 21h e 6h (todos dormem); a noite começa a cair às 19h */
export const isNight = h => h >= 21 || h < 6;
export const isEvening = h => h >= 20.5 || h < 6;

let glass = null, glassT = 0;
export function updateDayNight(inDungeon) {
  const h = hourNow();
  if (++glassT === 90) glass = null;   // recolhe os vidros depois que o mundo foi fundido
  stars.visible = !inDungeon && stars.material.opacity > .02;
  if (inDungeon) { lastH = -1; return; }
  stars.position.copy(cam.position);
  if (Math.abs(h - lastH) < .01) return;
  lastH = h;
  let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], u = (h - a[0]) / (b[0] - a[0]);
  if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
  mix(scene.background, a[1], b[1], u);
  scene.fog.color.copy(scene.background);
  mix(hemi.color, a[2], b[2], u); mix(hemi.groundColor, a[3], b[3], u);
  hemi.intensity = a[4] + (b[4] - a[4]) * u;
  torch.intensity = a[5] + (b[5] - a[5]) * u;
  stars.material.opacity = Math.max(0, Math.min(1, (.6 - hemi.intensity) / .3));   // as estrelas surgem quando escurece
  // janelas das casas acendem ao entardecer (vidros de cor 0xbfe0f0: materiais fundidos por quadra, coletados uma vez)
  if (!glass) { glass = new Set(); scene.traverse(o => { const m = o.isMesh && o.material; if (m && !Array.isArray(m) && m.transparent && m.emissive && m.color.getHex() === 0xbfe0f0) glass.add(m); }); }
  const gl = stars.material.opacity;
  glass.forEach(m => { m.emissive.setRGB(1, .72, .3).multiplyScalar(gl * .9); m.opacity = .4 + gl * .45; });
}
