/* Mapa completo da ilha: abre ao clicar no minimapa (ou tecla M). Clicar num ponto (ou num ícone) leva o jogador até lá.
   Zoom: roda do mouse, pinça ou botões ＋ －; arraste para mover. Círculos amarelos marcam a região das missões ativas. */
import { inDungeon } from '../dungeon/dungeon-scene.js';
import { $ } from '../core/utils.js';
import { state } from '../core/state.js';
import { P, mark } from '../entities/player.js';
import { drawIslandVec } from '../world/islandvec.js';
import { VX, VZ, groundY } from '../world/terrain.js';
import { N, V } from '../world/islandgen.js';
import { pois } from '../world/pois.js';
import { POST_DATA } from '../data/posts.js';
import { freePoint } from '../systems/steer.js';
import { standUp } from '../systems/rest.js';
import { ISLANDS } from '../data/npcs.js';
import { SEED } from '../world/terrain.js';
import { ISLAND_LV } from '../world/outposts.js';
import { questMarks } from '../systems/quests.js';
import { iconKey, iconImg } from './deemoji.js';
import { MOB } from '../core/device.js';
import { svg } from './icons.js';

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

let MK = [], hov = null, sel = null, off = {};
/** Categorias dos filtros: cor do aro e rótulo */
const CAT = { loc: ['Locais', '#e4d8bd'], ene: ['Inimigos', '#c0392b'], qst: ['Missões', '#f0d28a'], dun: ['Dungeon', '#9b6bd1'], faz: ['Fazendas', '#5f9a4a'] };
const catOf = (n, ic) => /dungeon|caverna|cripta/i.test(n) || ['skull', 'cave'].includes(iconKey(ic)) ? 'dun' : /s[ií]tio|granja|fazenda|herbalista/i.test(n) ? 'faz' : 'loc';
/** Lista dos marcadores (vila, acampamentos, pontos de interesse) em coordenadas do mundo */
function buildMarkers() {
  MK = [{ x: 0, z: 0, k: 'loc', n: 'Vila', ic: 'home', t: 'Local' }];
  POST_DATA.forEach(p => MK.push({ x: p.x, z: p.z, k: 'ene', n: p.name, ic: 'tent', t: 'Inimigos · Nv ' + p.lo + '–' + p.hi }));
  pois.forEach(p => { const k = catOf(p.n, p.ic || ''); MK.push({ x: p.x, z: p.z, k, n: p.n, ic: iconKey(p.ic || '') || (k === 'faz' ? 'leaf' : k === 'dun' ? 'skull' : 'pin'), t: CAT[k][0] }); });
  sel = null;   // nada marcado: "Ir até" fica desativado
}
const distOf = m => Math.round(Math.hypot(m.x - P.x, m.z - P.z));

/** Marcador sob o ponto (px,py) da tela (raio de toque generoso), o mais próximo */
function markerAt(px, py) {
  const d = devicePixelRatio || 1;
  let best = null, bd = 16 * d;
  MK.forEach(m => { if (off[m.k]) return; const [mx, my] = toMap(m.x, m.z), q = Math.hypot(mx - px, my - py); if (q < bd) { bd = q; best = m; } });
  return best;
}

function draw() {
  if (!open) return;
  const g = cv.getContext('2d'), d = devicePixelRatio || 1, fs = 12 * d;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#10232b'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(Z, 0, 0, Z, PX, PY);   // moldura (com zoom)
  const sc = N * S / V;
  g.setTransform(Z * sc, 0, 0, Z * sc, PX + OX * Z, PY + OY * Z);   // ilha em vetor: nítida em qualquer zoom
  drawIslandVec(g, 2 * d / (Z * sc));
  g.setTransform(Z, 0, 0, Z, PX, PY);
  g.strokeStyle = '#6f5629'; g.lineWidth = 3 * d / Z; g.strokeRect(OX, OY, N * S, N * S);
  g.setTransform(1, 0, 0, 1, 0, 0);     // o resto em pixels de tela (ícones sempre do mesmo tamanho)
  g.textAlign = 'center';
  // regiões das missões ativas: círculo amarelo pulsante
  const pul = .5 + .5 * Math.sin(performance.now() / 350);
  questMarks().forEach(m => {
    const [qx, qy] = toMap(m.x, m.z), r = Math.max(16 * d, m.r * S * Z);
    g.fillStyle = 'rgba(255,208,64,.14)'; g.beginPath(); g.arc(qx, qy, r, 0, 6.28); g.fill();
    g.strokeStyle = `rgba(255,208,64,${.65 + .35 * pul})`; g.lineWidth = (3 + pul) * d; g.beginPath(); g.arc(qx, qy, r, 0, 6.28); g.stroke();
    g.font = `bold ${fs}px sans-serif`; g.textBaseline = 'alphabetic'; g.lineWidth = 3 * d; g.strokeStyle = '#000'; g.strokeText(m.t, qx, qy - r - 5 * d); g.fillStyle = '#ffd040'; g.fillText(m.t, qx, qy - r - 5 * d);
  });
  // marcadores: disco escuro, aro na cor da categoria, ícone da mesma cor
  const R = 12 * d;
  MK.forEach(m => {
    if (off[m.k]) return;
    const [px, py] = toMap(m.x, m.z);
    if (px < -R || py < -R || px > cv.width + R || py > cv.height + R) return;
    const col = CAT[m.k][1], r = m === sel ? R * 1.3 : R;
    g.fillStyle = '#14100a'; g.strokeStyle = col; g.lineWidth = 2 * d;
    g.beginPath(); g.arc(px, py, r, 0, 6.28); g.fill(); g.stroke();
    const im = iconImg(m.ic, col), q = r * 1.15; if (im.complete) g.drawImage(im, px - q / 2, py - q / 2, q, q);
    if (m === sel) { g.strokeStyle = '#f0d28a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(px, py, r + 5 * d, 0, 6.28); g.stroke(); }
  });
  if (hov) {   // marcador sob o mouse: nome
    const [hx, hy] = toMap(hov.x, hov.z);
    g.font = `bold ${fs + d}px Spectral, serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const w = g.measureText(hov.n).width + 14 * d, ty = hy - 24 * d;
    g.fillStyle = '#0d0b08ee'; g.fillRect(hx - w / 2, ty - 13 * d, w, 19 * d);
    g.strokeStyle = '#c9a45a'; g.lineWidth = d; g.strokeRect(hx - w / 2, ty - 13 * d, w, 19 * d);
    g.fillStyle = '#e4d8bd'; g.fillText(hov.n, hx, ty);
  }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // jogador (seta pulsante)
  const [qx, qy] = toMap(P.x, P.z), pulse = 1 + .25 * Math.sin(performance.now() / 250);
  g.fillStyle = '#f0d28a'; g.strokeStyle = '#000'; g.lineWidth = 2.5 * d;
  g.beginPath(); g.arc(qx, qy, 6 * d * pulse, 0, 6.28); g.fill(); g.stroke();
  // marcação do jogador e destino em andamento: X de mapa do tesouro, vermelho
  const tx = (x, y, big) => {
    const u = (big ? 10 : 8) * d;
    g.save(); g.translate(x, y); g.lineCap = 'round';
    [['#000', 7 * d], ['#c0392b', 4.5 * d], ['#e8604f', 1.6 * d]].forEach(([c, w]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(-u, -u); g.lineTo(u, u); g.moveTo(u, -u); g.lineTo(-u, u); g.stroke(); });
    g.restore();
  };
  if (sel && sel.fl) { const [fx, fy] = toMap(sel.x, sel.z); tx(fx, fy, true); }
  if (!P.tgt && Math.hypot(P.tx - P.x, P.tz - P.z) > 2) { const [dx, dy] = toMap(P.tx, P.tz); tx(dx, dy, false); }
  raf = requestAnimationFrame(draw);
}

/** Orientação da folha: p retrato (inferior), l paisagem (lateral), d desktop (janela central) */
const orient = () => !MOB.matches ? 'd' : innerHeight > innerWidth ? 'p' : 'l';
const setO = () => { if (wrap) wrap.dataset.o = orient(); };
const title = () => (ISLANDS.find(i => i.seed === SEED) || { name: 'Ilha ' + SEED }).name;
function renderDet() {
  const m = sel, el = $('wmdet');
  const walking = !P.tgt && Math.hypot(P.tx - P.x, P.tz - P.z) > 2;
  if (!m) el.innerHTML = '<div class="dic" style="--c:#c0392b">' + svg('pin') + '</div><div class="dtx"><b>Nada marcado</b><span>Toque num ponto do mapa para marcar o destino</span></div><div class="dbs"><button class="btn pri" id="wmgo" disabled>Ir até</button><button class="btn" id="wmclr"' + (walking ? '' : ' disabled') + '>Parar</button></div>';
  else el.innerHTML = '<div class="dic" style="--c:' + (m.fl ? '#c0392b' : CAT[m.k][1]) + '">' + svg(m.ic) + '</div><div class="dtx"><b>' + m.n + '</b><span>' + m.t + ' · ' + distOf(m) + ' m</span></div><div class="dbs"><button class="btn pri" id="wmgo">Ir até</button><button class="btn" id="wmclr">' + (walking ? 'Parar' : 'Limpar') + '</button></div>';
  $('wmgo').onclick = () => { if (sel) walkTo(sel.x, sel.z, !sel.fl); };
  $('wmclr').onclick = () => { if (walking) { P.tx = P.x; P.tz = P.z; state.autoHold = 0; } else sel = null; renderDet(); };
}
function walkTo(wx, wz, exact) {
  if (Math.abs(wx + VX) > E || Math.abs(wz + VZ) > E) return;
  if (P.sit > 0 || P.sitT) standUp();
  state.autoHold = 6; P.tgt = null;
  const f = exact ? { x: wx, z: wz } : freePoint(wx, wz, .7);
  P.tx = f.x; P.tz = f.z;
  mark.position.set(f.x, groundY(f.x, f.z) + .12, f.z);
  renderDet();
}

export function toggleWorldMap(on = !open) {
  if (on === open || (on && inDungeon())) return;
  open = on;
  wrap.style.display = on ? 'flex' : 'none';
  document.body.classList.toggle('wm-open', on);
  if (on) {
    setO();
    wrap.querySelector('#wmt').textContent = title();
    wrap.querySelector('#wmlv').innerHTML = 'Nível <em>' + ISLAND_LV().join('–') + '</em>';
    buildMarkers(); renderDet();
    requestAnimationFrame(() => { layout(); Z = 1; PX = PY = 0; hov = null; draw(); });
  } else cancelAnimationFrame(raf);
}
export const worldMapOpen = () => open;

export function initWorldMap() {
  wrap = document.createElement('div');
  wrap.id = 'wmap';
  wrap.innerHTML = '<div id="wmbk"></div><div id="wmsheet"><div class="grab"></div><div id="wmhead"><div class="wt"><b id="wmt"></b><span id="wmlv"></span></div><button id="wmx" class="btn x" aria-label="Fechar">' + svg('close') + '</button></div>' +
    '<div id="wmbody"><div id="wmcv"><canvas id="wmc"></canvas><div id="wmchips"></div><div id="wmzb"><button id="wmz1" class="btn" aria-label="Aproximar">＋</button><button id="wmz0" class="btn" aria-label="Afastar">－</button><button id="wmz2" class="btn" aria-label="Ver tudo">' + svg('target') + '</button></div></div><div id="wmdet"></div></div></div>';
  document.body.appendChild(wrap);
  cv = wrap.querySelector('#wmc');
  const ch = $('wmchips');
  Object.keys(CAT).forEach(k => {
    const b = document.createElement('button'); b.className = 'chip'; b.style.setProperty('--c', CAT[k][1]);
    b.innerHTML = '<i></i>' + CAT[k][0];
    b.onclick = () => { off[k] = !off[k]; b.classList.toggle('off', !!off[k]); if (sel && off[sel.k]) { sel = MK.find(m => !off[m.k]) || null; renderDet(); } };
    ch.appendChild(b);
  });
  $('wmbk').onclick = () => toggleWorldMap(false);
  $('wmx').onclick = () => toggleWorldMap(false);
  $('wmz1').onclick = () => zoomAt(1.6);
  $('wmz0').onclick = () => zoomAt(1 / 1.6);
  $('wmz2').onclick = () => { Z = 1; PX = PY = 0; };
  MOB.addEventListener('change', setO);
  const zn = $('mzn'); if (zn) { zn.textContent = title(); zn.onclick = () => toggleWorldMap(true); dispatchEvent(new Event('hudcfg')); }
  const mini = $('mini');
  mini.style.pointerEvents = 'auto'; mini.style.cursor = 'pointer';
  mini.addEventListener('click', () => toggleWorldMap(true));
  addEventListener('keydown', e => {
    if (e.code === 'KeyM') toggleWorldMap();
    else if (e.code === 'Escape' && open) toggleWorldMap(false);
    else if (open && (e.key === '+' || e.key === '=')) zoomAt(1.4);
    else if (open && (e.key === '-' || e.key === '_')) zoomAt(1 / 1.4);
  });
  addEventListener('resize', () => { if (open) { setO(); requestAnimationFrame(() => { layout(); clampView(); }); } });
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
    if (m) { sel = m; renderDet(); return; }      // tocou num ícone: seleciona; só "Ir até" leva o personagem
    const [cx, cz] = toWorld(px, py);               // tocou no terreno: só marca o ponto (X vermelho); o personagem só anda ao tocar em "Ir até"
    if (Math.abs(cx + VX) > E || Math.abs(cz + VZ) > E) return;
    sel = { x: cx, z: cz, fl: true, n: 'Marcação', t: 'Ponto no mapa', ic: 'pin', k: 'loc' }; renderDet();
  });
}
