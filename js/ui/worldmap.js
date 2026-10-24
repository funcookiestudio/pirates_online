/* Mapa completo da ilha: abre ao clicar no minimapa (ou tecla M). Clicar num ponto leva o jogador até lá. */
import { inDungeon } from '../dungeon/dungeon-scene.js';
import { $ } from '../core/utils.js';
import { state } from '../core/state.js';
import { P, mark } from '../entities/player.js';
import { terrainImage } from '../world/terrain-mesh.js';
import { VX, VZ } from '../world/terrain.js';
import { N } from '../world/islandgen.js';
import { pois } from '../world/pois.js';
import { POST_DATA } from '../data/posts.js';
import { freePoint } from '../systems/steer.js';
import { standUp } from '../systems/rest.js';
import { ISLANDS } from '../data/npcs.js';
import { SEED } from '../world/terrain.js';
import { ISLAND_LV } from '../world/outposts.js';

let wrap, cv, IMG, open = false, raf = 0, S = 1, OX = 0, OY = 0;
const E = N / 2;
const toMap = (x, z) => [OX + (x + VX + E) * S, OY + (z + VZ + E) * S];
const toWorld = (px, py) => [(px - OX) / S - VX - E, (py - OY) / S - VZ - E];

function layout() {
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  S = Math.min(cv.width, cv.height) / (N + 1) * .96;
  OX = (cv.width - N * S) / 2; OY = (cv.height - N * S) / 2;
}

function draw() {
  if (!open) return;
  const g = cv.getContext('2d'), d = devicePixelRatio || 1, fs = 12 * d;
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(IMG, OX, OY, N * S, N * S);
  g.strokeStyle = '#a07a3a'; g.lineWidth = 3 * d; g.strokeRect(OX, OY, N * S, N * S);
  g.font = `bold ${fs}px sans-serif`; g.textAlign = 'center';
  // marcadores com ícone: disco colorido + emoji + nome
  const tag = (x, z, col, txt, ic) => {
    const [px, py] = toMap(x, z), r = 11 * d;
    g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 2 * d;
    g.beginPath(); g.arc(px, py, r, 0, 6.28); g.fill(); g.stroke();
    g.font = `${15 * d}px sans-serif`; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillText(ic, px, py + d);
    g.font = `bold ${fs}px sans-serif`; g.textBaseline = 'alphabetic';
    if (txt) { g.lineWidth = 3 * d; g.strokeStyle = '#000'; g.strokeText(txt, px, py + r + 13 * d); g.fillStyle = '#fff'; g.fillText(txt, px, py + r + 13 * d); }
  };
  tag(0, 0, '#c8962e', 'Vila', '🏘');
  POST_DATA.forEach(p => tag(p.x, p.z, '#b02828', p.name, '⛺'));
  pois.forEach(p => tag(p.x, p.z, p.c, p.n, p.ic || '📍'));
  // legenda
  const leg = [['🏘', 'Vila'], ['⛺', 'Acampamento inimigo'], ['🕳', 'Dungeon'], ['⚓', 'Porto'], ['💰', 'Tesouro']];
  g.font = `${13 * d}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
  leg.forEach(([ic, t], i) => { const y = 16 * d + i * 20 * d; g.fillStyle = '#000a'; g.fillRect(8 * d, y - 10 * d, 150 * d, 19 * d); g.fillStyle = '#fff'; g.fillText(ic + ' ' + t, 14 * d, y); });
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // jogador (seta pulsante)
  const [qx, qy] = toMap(P.x, P.z), pulse = 1 + .25 * Math.sin(performance.now() / 250);
  g.fillStyle = '#fff'; g.strokeStyle = '#1a6bff'; g.lineWidth = 3 * d;
  g.beginPath(); g.arc(qx, qy, 6 * d * pulse, 0, 6.28); g.fill(); g.stroke();
  // destino atual
  if (!P.tgt && Math.hypot(P.tx - P.x, P.tz - P.z) > 2) {
    const [dx, dy] = toMap(P.tx, P.tz);
    g.strokeStyle = '#ffd040'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(dx - 6 * d, dy - 6 * d); g.lineTo(dx + 6 * d, dy + 6 * d); g.moveTo(dx + 6 * d, dy - 6 * d); g.lineTo(dx - 6 * d, dy + 6 * d); g.stroke();
  }
  raf = requestAnimationFrame(draw);
}

export function toggleWorldMap(on = !open) {
  if (on === open || (on && inDungeon())) return;
  open = on;
  wrap.style.display = on ? 'flex' : 'none';
  if (on) wrap.querySelector('#wmhead b').textContent = (ISLANDS.find(i => i.seed === SEED) || { name: 'Ilha ' + SEED }).name + ' · Nv ' + ISLAND_LV().join('–');
  if (on) { if (!IMG) IMG = terrainImage(); layout(); draw(); } else cancelAnimationFrame(raf);
}
export const worldMapOpen = () => open;

export function initWorldMap() {
  wrap = document.createElement('div');
  wrap.id = 'wmap';
  wrap.innerHTML = '<div id="wmhead"><b>' + ((ISLANDS.find(i => i.seed === SEED) || { name: 'Ilha ' + SEED }).name) + ' · Nv ' + ISLAND_LV().join('–') + '</b><span>Toque num ponto para ir até lá · M ou ✕ fecha</span><button id="wmx">✕</button></div><canvas id="wmc"></canvas>';
  document.body.appendChild(wrap);
  cv = wrap.querySelector('#wmc');
  $('wmx').onclick = () => toggleWorldMap(false);
  const mini = $('mini');
  mini.style.pointerEvents = 'auto'; mini.style.cursor = 'pointer';
  mini.addEventListener('click', () => toggleWorldMap(true));
  addEventListener('keydown', e => {
    if (e.code === 'KeyM') toggleWorldMap();
    else if (e.code === 'Escape' && open) toggleWorldMap(false);
  });
  addEventListener('resize', () => { if (open) layout(); });
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), d = cv.width / r.width;
    const [wx, wz] = toWorld((e.clientX - r.left) * d, (e.clientY - r.top) * d);
    if (Math.abs(wx + VX) > E || Math.abs(wz + VZ) > E) return;
    if (P.sit > 0 || P.sitT) standUp();
    state.autoHold = 6; P.tgt = null;
    const f = freePoint(wx, wz, .7);
    P.tx = f.x; P.tz = f.z;
    mark.position.set(f.x, .05, f.z);
    toggleWorldMap(false);
  });
}
