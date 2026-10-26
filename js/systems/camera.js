/* Câmera isométrica que segue o jogador suavemente, com tremor de impacto. */
import { cam, torch, scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { P } from '../entities/player.js';

const rig = { x: null, y: 0, z: null };   // y acompanha a altura do chão sob o jogador (relevo, cais, nado)
const ZMIN = .22, ZMAX = 1.9;   // 1 = distância padrão; menor = mais perto do personagem
let zoomT = 1, zoom = 1;
let yawT = 0, yaw = 0;          // giro da câmera em volta do jogador (rad)
const PMIN = .3, PMAX = 1.45, P0 = Math.atan2(20, 22.63);   // inclinação (rad acima do horizonte); P0 = padrão
let pitchT = P0, pitch = P0;
let fogK = 1;                   // névoa e alcance acompanham o zoom (quanto mais longe, mais se enxerga)

/** Gira a câmera em volta do jogador (rad; positivo gira no sentido horário visto de cima) */
/** painel de câmera aberto: os gestos na tela só mexem na câmera (sem cliques de movimento/ativação) */
export const CAMUI = { open: false };
export function rotateBy(a) { yawT += a; }

/** Aproxima (f<1) ou afasta (f>1) a câmera, limitado entre ZMIN e ZMAX */
/** Inclina a câmera (positivo = mais de cima) */
export function tiltBy(a) { pitchT = Math.min(PMAX, Math.max(PMIN, pitchT + a)); }

/** Volta a câmera ao ângulo, zoom e giro padrão */
export function resetCamera() { zoomT = 1; pitchT = P0; yawT = Math.round(yawT / (Math.PI * 2)) * Math.PI * 2; }

export function zoomBy(f) { zoomT = Math.min(ZMAX, Math.max(ZMIN, zoomT * f)); }

export function updateCamera(dt) {
  if (rig.x === null) { rig.x = P.x; rig.z = P.z; rig.y = P.g.position.y; }
  const k = 1 - Math.exp(-dt * 7);
  rig.x += (P.x - rig.x) * k;
  rig.z += (P.z - rig.z) * k;
  rig.y += (P.g.position.y - rig.y) * (1 - Math.exp(-dt * 5));   // sobe e desce suave em morros

  state.SHK = Math.max(0, state.SHK - dt * 1.4);
  zoom += (zoomT - zoom) * (1 - Math.exp(-dt * 10));
  yaw += (yawT - yaw) * (1 - Math.exp(-dt * 10));
  pitch += (pitchT - pitch) * (1 - Math.exp(-dt * 10));
  const c = Math.cos(yaw), n = Math.sin(yaw), R = 30.2 * zoom, hd = R * Math.cos(pitch) / Math.SQRT2, ox = (c + n) * hd, oz = (c - n) * hd;
  const fk = Math.max(1, zoom);
  if (Math.abs(fk - fogK) > .01) { fogK = fk; scene.fog.near = 30 * fk; scene.fog.far = 60 * fk; cam.far = 72 * fk; cam.updateProjectionMatrix(); }
  const sx = (Math.random() - .5) * state.SHK, sz = (Math.random() - .5) * state.SHK;
  cam.position.set(rig.x + ox + sx, rig.y + R * Math.sin(pitch), rig.z + oz + sz);
  cam.lookAt(rig.x + sx, rig.y + 1.2 * (1 - zoom), rig.z + sz);

  torch.position.set(P.x, rig.y + 4, P.z);
  torch.visible = !!(P.torchM && P.torchM.visible);   // o personagem não tem luz própria: só ilumina o caminho com a tocha na mão
}
