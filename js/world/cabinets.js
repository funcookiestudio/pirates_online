/* Armários dos quartos alugados: clique → vai até a frente do armário e abre o armazenamento do jogador (o mesmo baú da vila). */
import { P } from '../entities/player.js';
import { openDialog } from '../ui/dialog.js';

export const CABINETS = [];
let pend = null;
export const addCabinet = c => { CABINETS.push(c); return c; };
const INFO = { name: 'Armário do quarto', title: 'Guarde seus pertences', ic: '🗄️', chest: true,
  lines: ['Um armário de madeira robusto. O que você guardar aqui fica à sua espera, marujo.', 'Deixe o excesso da mochila no armário — o quarto é só seu.'] };

const meshes = [];
export function cabinetClick(ray) {
  meshes.length = 0;
  CABINETS.forEach(c => { if ((!c.ok || c.ok()) && Math.hypot(P.x - c.x, P.z - c.z) < 7) { c.hit.userData.cab = c; meshes.push(c.hit); } });
  if (!meshes.length) return false;
  const h = ray.intersectObjects(meshes, false)[0];
  if (!h) return false;
  const c = h.object.userData.cab;
  if (Math.hypot(P.x - c.ax, P.z - c.az) < 1.3) { P.tgt = null; P.tx = P.x; P.tz = P.z; open(c); return true; }
  P.tgt = null; P.tx = c.ax; P.tz = c.az; pend = c;
  return true;
}
function open(c) { pend = null; P.tx = P.x; P.tz = P.z; openDialog(INFO); }
/** A cada quadro: abre o armário ao chegar (ou desiste se o jogador mandou ir para outro lugar) */
export function updateCabinetPending() {
  const c = pend; if (!c) return;
  if (Math.hypot(P.tx - c.ax, P.tz - c.az) > 1.6) { pend = null; return; }
  if (Math.hypot(P.x - c.ax, P.z - c.az) < 1.1) open(c);
}
