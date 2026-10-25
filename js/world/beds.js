/* Camas onde o personagem pode deitar e dormir. Cada casa registra a sua (posição dos pés do dorminhoco, altura do colchão,
   giro, ponto de acesso ao lado da cama e uma caixa invisível para o clique). */
import { P } from '../entities/player.js';

export const BEDS = [];
export const BED = { pend: null };   // cama para onde o jogador caminha após o clique

export function addBed(b) { BEDS.push(b); return b; }

const meshes = [];
/** Clique numa cama: o jogador caminha até o ponto de acesso e depois deita */
export function bedClick(ray) {
  meshes.length = 0;
  BEDS.forEach(b => { if ((!b.ok || b.ok()) && Math.hypot(P.x - b.x, P.z - b.z) < 7) { b.hit.userData.bed = b; meshes.push(b.hit); } });   // só camas por perto (o raio não enxerga paredes)
  if (!meshes.length) return false;
  const h = ray.intersectObjects(meshes, false)[0];
  if (!h) return false;
  const b = h.object.userData.bed;
  P.tgt = null; P.tx = b.ax; P.tz = b.az; BED.pend = b;
  return true;
}
