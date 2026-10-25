/* Camas onde o personagem pode deitar e dormir. Cada casa registra a sua (posição dos pés do dorminhoco, altura do colchão,
   giro, ponto de acesso ao lado da cama e uma caixa invisível para o clique). */
import { P } from '../entities/player.js';
import { props } from '../core/registry.js';

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
  askSleep(h.object.userData.bed);
  return true;
}

let card = null;
const closeCard = () => { if (card) card.style.display = 'none'; };
/** Card "Quer dormir?": só vai até a cama e deita se o jogador confirmar */
function askSleep(b) {
  if (!card) {
    card = document.createElement('div'); card.id = 'bedcard';
    card.innerHTML = '<div class="dh"><div><b>🛏️ Cama</b></div><button id="bcx">✕</button></div><p id="bct"></p><div id="bcb"></div>';
    (document.getElementById('dlg')?.parentNode || document.body).appendChild(card);
    card.querySelector('#bcx').onclick = closeCard;
  }
  card.querySelector('#bct').textContent = 'Quer deitar e dormir um pouco?';
  const bb = card.querySelector('#bcb'); bb.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.onclick = () => { closeCard(); f(); }; bb.appendChild(x); };
  add('😴 Dormir', () => { const [ax, az] = accessFor(b); P.tgt = null; P.tx = ax; P.tz = az; b.cx = ax; b.cz = az; BED.pend = b; });
  add('Agora não', () => {});
  card.style.display = 'block';
}

const freeSpot = (x, z) => !props.some(p => Math.hypot(x - p.position.x, z - p.position.z) < p.r + .4);
/** Lado de acesso: esquerdo ou direito da cama (espelho do ponto de acesso pelo eixo da cama), o mais perto do jogador que esteja livre */
function accessFor(b) {
  const dx = Math.sin(b.ry), dz = Math.cos(b.ry), rx = b.ax - b.x, rz = b.az - b.z, k = rx * dx + rz * dz;
  const m = [2 * (b.x + dx * k) - b.ax, 2 * (b.z + dz * k) - b.az];
  const c = [[b.ax, b.az], m].filter(p => freeSpot(p[0], p[1]) && (!b.inRoom || b.inRoom(p[0], p[1])));
  if (!c.length) return [b.ax, b.az];
  c.sort((p, q) => Math.hypot(P.x - p[0], P.z - p[1]) - Math.hypot(P.x - q[0], P.z - q[1]));
  return c[0];
}
