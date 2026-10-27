/* Tracinhos vermelhos no chão, do personagem até o ponto de destino (um pouco acima do terreno). */
import { scene } from '../core/engine.js';
import { P } from '../entities/player.js';
import { groundY } from '../world/terrain.js';

const MAX = 48, STEP = 1.3, LIFT = .3;
const geo = new THREE.BoxGeometry(.18, .05, .6);
const mat = new THREE.MeshBasicMaterial({ color: 0xe0382a, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const dashes = [];
for (let i = 0; i < MAX; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; m.renderOrder = 999; scene.add(m); dashes.push(m); }

/** Chamado todo quadro: distribui os tracinhos entre o jogador e o destino atual */
export function updateTrail() {
  const dx = P.tx - P.x, dz = P.tz - P.z, d = Math.hypot(dx, dz);
  if (P.tgt || !(d > 2)) { if (dashes[0].visible) dashes.forEach(m => { m.visible = false; }); return; }
  const n = Math.min(MAX, Math.floor(d / STEP)), st = Math.max(STEP, d / MAX), yaw = Math.atan2(dx, dz);
  for (let i = 0; i < MAX; i++) {
    const m = dashes[i];
    if (i >= n || (i + .5) * st > d - .6) { m.visible = false; continue; }
    const t = (i + .5) * st / d, x = P.x + dx * t, z = P.z + dz * t;
    m.visible = true; m.position.set(x, groundY(x, z) + LIFT, z); m.rotation.y = yaw;
  }
}
