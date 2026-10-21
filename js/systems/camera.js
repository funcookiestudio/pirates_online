/* Câmera isométrica que segue o jogador suavemente, com tremor de impacto. */
import { cam, torch } from '../core/engine.js';
import { state } from '../core/state.js';
import { P } from '../entities/player.js';

const rig = { x: null, z: null };
const ZMIN = .22, ZMAX = 1.3;   // 1 = distância padrão; menor = mais perto do personagem
let zoomT = 1, zoom = 1;
let yawT = 0, yaw = 0;          // giro da câmera em volta do jogador (rad)

/** Gira a câmera em volta do jogador (rad; positivo gira no sentido horário visto de cima) */
export function rotateBy(a) { yawT += a; }

/** Aproxima (f<1) ou afasta (f>1) a câmera, limitado entre ZMIN e ZMAX */
export function zoomBy(f) { zoomT = Math.min(ZMAX, Math.max(ZMIN, zoomT * f)); }

export function updateCamera(dt) {
  if (rig.x === null) { rig.x = P.x; rig.z = P.z; }
  const k = 1 - Math.exp(-dt * 7);
  rig.x += (P.x - rig.x) * k;
  rig.z += (P.z - rig.z) * k;

  state.SHK = Math.max(0, state.SHK - dt * 1.4);
  zoom += (zoomT - zoom) * (1 - Math.exp(-dt * 10));
  yaw += (yawT - yaw) * (1 - Math.exp(-dt * 10));
  const c = Math.cos(yaw), n = Math.sin(yaw), ox = (16 * c + 16 * n) * zoom, oz = (16 * c - 16 * n) * zoom;
  const sx = (Math.random() - .5) * state.SHK, sz = (Math.random() - .5) * state.SHK;
  cam.position.set(rig.x + ox + sx, 20 * zoom, rig.z + oz + sz);
  cam.lookAt(rig.x + sx, 1.2 * (1 - zoom), rig.z + sz);

  torch.position.set(P.x, 4, P.z);
}
