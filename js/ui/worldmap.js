/* Mapa completo da ilha: abre ao clicar no minimapa (ou tecla M). Clicar num ponto (ou num ícone) leva o jogador até lá.
   Zoom: roda do mouse, pinça ou botões ＋ －; arraste para mover. Círculos amarelos marcam a região das missões ativas. */
import { inDungeon } from '../dungeon/dungeon-scene.js';
import { $ } from '../core/utils.js';
import { state } from '../core/state.js';
import { P, mark } from '../entities/player.js';
import { terrainImage } from '../world/terrain-mesh.js';
import { VX, VZ, groundY } from '../world/terrain.js';
import { N } from '../world/islandgen.js';
import { pois } from '../world/pois.js';
import { POST_DATA } from '../data/posts.js';
import { freePoint } from '../systems/steer.js';
import { standUp } from '../systems/rest.js';
import { ISLANDS } from '../data/npcs.js';
import { SEED } from '../world/terrain.js';
import { ISLAND_LV } from '../world/outposts.js';
import { questMarks } from '../systems/quests.js';

let wrap, cv, IMG, open = false, raf = 0, S = 1, OX = 0, OY = 0, Z = 1, PX = 0, PY = 0;
const E = N / 2, ZMAX = 10;
/** mundo → coordenada base do mapa (sem zoom) e de volta */
const base = (x, z) => [OX + (x + VX + E) * S, OY + (z + VZ + E) * S];
/** mundo → tela (com zoom e deslocamento) */
const toMap = (x, z) => { const [a, b] = base(x, z); return [a * Z + PX, b * Z + PY]; };
const toWorld = (px, py) => { const a = (px - PX) / Z, b = (py - PY) / Z; return [(a - OX) / S - VX - E, (b - OY) / S - VZ - E]; };

function layout() {
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  S = Math.min(cv.width, cv.height) / (N + 1) * .96;
  OX = (cv.width - N * S) / 2; OY = (cv.height - N * S) / 2;
}
/** Mantém o mapa dentro da tela (com folga) */
function clampView() {
  if (Z <= 1.001) { Z = 1; PX = PY = 0; return; }
  const m = 60 * (devicePixelRatio || 1);
  PX = Math.min(m - OX * Z, Math.max(cv.width - m - (OX + N * S) * Z, PX));
  PY = Math.min(m - OY * Z, Math.max(cv.height - m - (OY + N * S) * Z, PY));
}
/** Zoom por fator `f` mantendo o ponto (cx,cy) da tela parado */
function zoomAt(f, cx = cv.width / 2, cy = cv.height / 2) {
  const nz = Math.max(1, Math.min(ZMAX, Z * f));
  PX = cx - (cx - PX) * nz / Z; PY = cy - (cy - PY) * nz / Z; Z = nz;
  clampView();
}

let MK = [], LG = null, hov = null;
/** Lista dos marcadores (vila, acampamentos, pontos de interesse) em coordenadas do mundo */
function buildMarkers() {
  MK = [{ x: 0, z: 0, c: '#c8962e', n: 'Vila', ic: '🏘' }];
  POST_DATA.forEach(p => MK.push({ x: p.x, z: p.z, c: '#b02828', n: p.name, ic: '⛺' }));
  pois.forEach(p => MK.push({ x: p.x, z: p.z, c: p.c, n: p.n, ic: p.ic || '📍' }));
}
/** Legenda (tela): desenhada uma vez por tamanho */
function bakeLegend() {
  const d = devicePixelRatio || 1;
  LG = document.createElement('canvas'); LG.width = 170 * d; LG.height = (16 + 11 * 20 + 6) * d;
  const g = LG.getContext('2d');
  const leg = [['🏘', 'Vila'], ['⚓', 'Porto'], ['🏰', 'Castelo'], ['⛺', 'Acampamento inimigo'], ['🕳', 'Dungeon'], ['🐔', 'Sítio das Aves'], ['🐖', 'Granja'], ['🐄', 'Fazenda do Gado'], ['🌿', 'Casa da Herbalista'], ['🔵', 'Você'], ['🟡', 'Região da missão']];
  g.font = `${13 * d}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
  leg.forEach(([ic, t], i) => { const y = 8 * d + i * 20 * d; g.fillStyle = '#000a'; g.fillRect(0, y - 10 * d, 160 * d, 19 * d); g.fillStyle = '#fff'; g.fillText(ic + ' ' + t, 6 * d, y); });
}

/** Marcador sob o ponto (px,py) da tela (raio de toque generoso), o mais próximo */
function markerAt(px, py) {
  const d = devicePixelRatio || 1;
  let best = null, bd = 16 * d;
  MK.forEach(m => { const [mx, my] = toMap(m.x, m.z), q = Math.hypot(mx - px, my - py); if (q < bd) { bd = q; best = m; } });
  return best;
}

function draw() {
  if (!open) return;
  const g = cv.getContext('2d'), d = devicePixelRatio || 1, fs = 12 * d;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  g.setTransform(Z, 0, 0, Z, PX, PY);   // relevo e moldura: um único drawImage com zoom
  g.drawImage(IMG, OX, OY, N * S, N * S);
  g.strokeStyle = '#a07a3a'; g.lineWidth = 3 * d / Z; g.strokeRect(OX, OY, N * S, N * S);
  g.setTransform(1, 0, 0, 1, 0, 0);     // o resto em pixels de tela (ícones sempre do mesmo tamanho)
  g.textAlign = 'center';
  // regiões das missões ativas: círculo amarelo pulsante
  const pul = .5 + .5 * Math.sin(performance.now() / 350);
  questMarks().forEach(m => {
    const [qx, qy] = toMap(m.x, m.z), r = Math.max(16 * d, m.r * S * Z);
    g.fillStyle = 'rgba(255,208,64,.14)'; g.beginPath(); g.arc(qx, qy, r, 0, 6.28); g.fill();
    g.strokeStyle = `rgba(255,208,64,${.65 + .35 * pul})`; g.lineWidth = (3 + pul) * d; g.beginPath(); g.arc(qx, qy, r, 0, 6.28); g.stroke();
    g.font = `bold ${fs}px sans-serif`; g.textBaseline = 'alphabetic'; g.lineWidth = 3 * d; g.strokeStyle = '#000'; g.strokeText('📜 ' + m.t, qx, qy - r - 5 * d); g.fillStyle = '#ffd040'; g.fillText('📜 ' + m.t, qx, qy - r - 5 * d);
  });
  // marcadores com ícone
  const R = 11 * d;
  MK.forEach(m => {
    const [px, py] = toMap(m.x, m.z);
    if (px < -R || py < -R || px > cv.width + R || py > cv.height + R) return;
    g.fillStyle = m.c; g.strokeStyle = '#000'; g.lineWidth = 2 * d;
    g.beginPath(); g.arc(px, py, R, 0, 6.28); g.fill(); g.stroke();
    g.font = `${15 * d}px sans-serif`; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(m.ic, px, py + d);
  });
  g.drawImage(LG, 8 * d, 6 * d);
  if (hov) {   // marcador sob o mouse: anel + nome
    const [hx, hy] = toMap(hov.x, hov.z);
    g.strokeStyle = '#ffd040'; g.lineWidth = 3 * d; g.beginPath(); g.arc(hx, hy, 14 * d, 0, 6.28); g.stroke();
    g.font = `bold ${fs + d}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const w = g.measureText(hov.n).width + 12 * d, ty = hy - 20 * d;
    g.fillStyle = '#000c'; g.fillRect(hx - w / 2, ty - 13 * d, w, 18 * d);
    g.fillStyle = '#fff'; g.fillText(hov.n, hx, ty);
  }
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
  if (on) { if (!IMG) IMG = terrainImage(); layout(); Z = 1; PX = PY = 0; buildMarkers(); bakeLegend(); hov = null; draw(); } else cancelAnimationFrame(raf);
}
export const worldMapOpen = () => open;

export function initWorldMap() {
  wrap = document.createElement('div');
  wrap.id = 'wmap';
  wrap.innerHTML = '<div id="wmhead"><b>' + ((ISLANDS.find(i => i.seed === SEED) || { name: 'Ilha ' + SEED }).name) + ' · Nv ' + ISLAND_LV().join('–') + '</b><span>Toque num ponto para ir até lá · roda/pinça: zoom · arraste: mover · M ou ✕ fecha</span><button id="wmz1" title="Aproximar">＋</button><button id="wmz0" title="Afastar">－</button><button id="wmz2" title="Ver tudo">⤢</button><button id="wmx">✕</button></div><canvas id="wmc"></canvas>';
  document.body.appendChild(wrap);
  cv = wrap.querySelector('#wmc');
  $('wmx').onclick = () => toggleWorldMap(false);
  $('wmz1').onclick = () => zoomAt(1.6);
  $('wmz0').onclick = () => zoomAt(1 / 1.6);
  $('wmz2').onclick = () => { Z = 1; PX = PY = 0; };
  const mini = $('mini');
  mini.style.pointerEvents = 'auto'; mini.style.cursor = 'pointer';
  mini.addEventListener('click', () => toggleWorldMap(true));
  addEventListener('keydown', e => {
    if (e.code === 'KeyM') toggleWorldMap();
    else if (e.code === 'Escape' && open) toggleWorldMap(false);
    else if (open && (e.key === '+' || e.key === '=')) zoomAt(1.4);
    else if (open && (e.key === '-' || e.key === '_')) zoomAt(1 / 1.4);
  });
  addEventListener('resize', () => { if (open) { layout(); bakeLegend(); clampView(); } });
  const pos = e => { const r = cv.getBoundingClientRect(), d = cv.width / r.width; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); zoomAt(e.deltaY < 0 ? 1.25 : 1 / 1.25, x, y); }, { passive: false });
  // arrastar (mover) e pinça (zoom): ponteiros; um toque curto sem arrastar continua sendo "ir até lá"
  const ptr = new Map(); let moved = 0, pinch = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, pos(e)); if (ptr.size === 1) moved = 0; pinch = 0; });
  cv.addEventListener('pointermove', e => {
    const [x, y] = pos(e), old = ptr.get(e.pointerId);
    if (!old) { hov = markerAt(x, y); cv.style.cursor = hov ? 'pointer' : 'crosshair'; return; }   // só passando o mouse: realça o ícone
    if (ptr.size === 1) {
      const dx = x - old[0], dy = y - old[1]; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 8 * (devicePixelRatio || 1) && Z > 1) { PX += dx; PY += dy; clampView(); }
    } else if (ptr.size === 2) {
      ptr.set(e.pointerId, [x, y]);
      const [a, b] = [...ptr.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      moved = 1e9;
      if (pinch) zoomAt(dd / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      pinch = dd; return;
    }
    ptr.set(e.pointerId, [x, y]);
  });
  const up = e => { ptr.delete(e.pointerId); pinch = 0; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('click', e => {
    if (moved > 8 * (devicePixelRatio || 1)) { moved = 0; return; }   // foi arrasto/pinça, não clique
    const [px, py] = pos(e), m = markerAt(px, py);
    const [cx, cz] = toWorld(px, py), wx = m ? m.x : cx, wz = m ? m.z : cz;   // clicou num ícone: vai EXATAMENTE para a coordenada dele
    if (Math.abs(wx + VX) > E || Math.abs(wz + VZ) > E) return;
    if (P.sit > 0 || P.sitT) standUp();
    state.autoHold = 6; P.tgt = null;
    const f = m ? { x: m.x, z: m.z } : freePoint(wx, wz, .7);   // ponto livre só para cliques no terreno
    P.tx = f.x; P.tz = f.z;
    mark.position.set(f.x, groundY(f.x, f.z) + .12, f.z);
  });
}
