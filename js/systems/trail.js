/* Tracinhos vermelhos no chão, do personagem até o destino, seguindo o caminho real (estradas); um pouco acima do terreno. */
import { scene } from '../core/engine.js';
import { groundY } from '../world/terrain.js';

const MAX = 90, STEP = 1.3, LIFT = .3;
const geo = new THREE.BoxGeometry(.18, .05, .6);
const mat = new THREE.MeshBasicMaterial({ color: 0xe0382a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const dashes = [];
for (let i = 0; i < MAX; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; m.renderOrder = 999; scene.add(m); dashes.push(m); }

/** Chamado todo quadro com os pontos [x,z] do caminho (ou null para esconder) */
export function updateTrail(pts, lift = 0) {
  if (!pts || pts.length < 2) { if (dashes[0].visible) dashes.forEach(m => { m.visible = false; }); return; }
  let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const st = Math.max(STEP, tot / MAX);
  let n = 0, seg = 1, run = 0, next = st * .5;   // `run` = distância já percorrida até o início do trecho atual
  while (n < MAX && seg < pts.length && next < tot - .6) {
    const a = pts[seg - 1], b = pts[seg], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (next > run + L) { run += L; seg++; continue; }
    const t = L ? (next - run) / L : 0, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, m = dashes[n++];
    m.visible = true; m.position.set(x, groundY(x, z) + lift + LIFT, z); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    next += st;
  }
  for (; n < MAX; n++) dashes[n].visible = false;
}
