/* Disposição dos botões do celular: posições padrão + editor nativo (Ajustes ▸ Jogo ▸ "Editar disposição").
   O jogador arrasta cada botão (habilidades, auto combate, companheiro, menu e os dois diamantes de vida),
   muda o tamanho e gira os diamantes. Tudo é guardado no navegador, separado por orientação (retrato / paisagem).
   Coordenadas: centro do elemento · x = distância da borda do lado da mão · y = distância da borda de baixo (px).
   Os diamantes e o menu, enquanto não forem editados, seguem o CSS (mobile.css). */
import { $ } from '../core/utils.js';
import { CFG } from '../systems/settings.js';
import { closePanel } from './panel.js';
import { log } from './notify.js';

const KEY = 'pirata-layout';
const body = document.body;

/** Botões de ação: id do botão → [elemento que recebe a posição, elemento que recebe o tamanho (ou null = variável --sz), nome] */
const BTN = {
  sa: ['sawrap', 'sa', 'Auto combate'], sr: ['sr', null, 'Esquiva'], s2: ['s2', null, 'Giro (Q)'], s3: ['s3', null, 'Bomba (W)'],
  s4: ['s4', null, 'Poção (E)'], s1: ['s1', null, 'Trocar arma (X)'], s5: ['s5', null, 'Companheiro (R)'],
};
/** Posição padrão [x, y, tamanho] por orientação (p = retrato · l = paisagem) */
const DEF = {
  p: { sa: [56, 72, 80], sr: [134, 37, 44], s2: [134, 97, 44], s3: [94, 144, 44], s4: [33, 155, 44], s1: [156, 157, 42], s5: [77, 205, 46] },
  l: { sa: [58, 66, 80], sr: [152, 66, 44], s2: [138, 116, 44], s3: [102, 149, 44], s4: [58, 160, 44], s1: [214, 129, 42], s5: [161, 198, 42] },
};
/** Itens soltos (seguem o CSS até serem editados): menu e diamantes */
const XT = { lnch: ['lnch', 'Menu (ajustes)', false], gwl: ['gwl', 'Diamante vermelho (vida)', true], gwr: ['gwr', 'Diamante azul (companheiro)', true] };
/** Menu e diamantes com posição padrão própria (retrato); onde não houver, seguem o CSS */
const DEFX = { p: { lnch: { x: 200, y: 34, sz: 44 }, gwl: { x: 327, y: 53, sz: 88, rot: -37 }, gwr: { x: 366, y: 105, sz: 48, rot: 18 } }, l: {} };
const DEF_ROT = -37;   // inclinação padrão dos diamantes (para a mão direita; na esquerda espelha)

let L = { p: {}, l: {} };
try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.p && o.l) L = o; } catch (e) { /* sem armazenamento: usa o padrão */ }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { /* ignora */ } };

const ok = () => (innerWidth > innerHeight ? 'l' : 'p');
const isMob = () => body.classList.contains('mob');
const handR = () => CFG.hand !== 'l';
const rm = (el, ks) => ks.forEach(k => el.style.removeProperty(k));

/** Posição atual de um item: a editada, a padrão (botões) ou a medida no CSS (menu e diamantes) */
function cur(id) {
  const o = ok();
  if (L[o][id]) return L[o][id];
  if (DEFX[o][id]) return DEFX[o][id];
  if (BTN[id]) { const d = DEF[o][id]; return { x: d[0], y: d[1], sz: d[2] }; }
  const el = $(XT[id][0]), r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const g = parseFloat(getComputedStyle(body).getPropertyValue(id === 'gwl' ? '--g1' : '--g2')) || 60;
  return { x: Math.round(handR() ? innerWidth - cx : cx), y: Math.round(innerHeight - cy), sz: id === 'lnch' ? Math.round(r.width) : Math.round(g), rot: DEF_ROT };
}

/** Aplica as posições (no celular) ou limpa tudo (no computador, que usa o CSS da hotbar) */
export function applyLayout() {
  const mob = isMob(), o = ok(), R = handR(), side = R ? 'right' : 'left', other = R ? 'left' : 'right';
  Object.keys(BTN).forEach(id => {
    const [wid, inner] = BTN[id], el = $(wid), sz = inner ? $(inner) : null;
    if (!mob) { rm(el, ['left', 'right', 'bottom', '--sz']); if (sz) rm(sz, ['width', 'height']); return; }
    const q = cur(id);
    el.style.setProperty(other, 'auto'); el.style.setProperty(side, (q.x - q.sz / 2) + 'px'); el.style.setProperty('bottom', (q.y - q.sz / 2) + 'px');
    if (sz) { sz.style.width = sz.style.height = q.sz + 'px'; } else el.style.setProperty('--sz', q.sz + 'px');
  });
  Object.keys(XT).forEach(id => {
    const el = $(XT[id][0]), q = mob ? (L[o][id] || DEFX[o][id]) : null;
    if (!q) {
      rm(el, ['left', 'right', 'bottom', 'width', 'height', 'margin', '--tilt']);
      if (id !== 'lnch') body.style.removeProperty(id === 'gwl' ? '--g1' : '--g2');
      return;
    }
    el.style.setProperty(other, 'auto'); el.style.setProperty(side, (q.x - q.sz / 2) + 'px');
    if (id === 'lnch') { el.style.bottom = (q.y - q.sz / 2) + 'px'; el.style.width = el.style.height = q.sz + 'px'; el.style.margin = '0'; return; }
    body.style.setProperty(id === 'gwl' ? '--g1' : '--g2', q.sz + 'px');
    el.style.bottom = (q.y - q.sz * .55) + 'px';
    el.style.setProperty('--tilt', ((q.rot == null ? DEF_ROT : q.rot) * (R ? 1 : -1)) + 'deg');
  });
}

/* ---------------- editor ---------------- */
let editing = false, selId = null, drag = null, bar = null;
const SEL = '#sk > div:not(#sawrap), #s5, #sawrap, #lnch, #gwl, #gwr';
const idOf = el => el.id === 'sawrap' ? 'sa' : el.id;
const nameOf = id => (BTN[id] ? BTN[id][2] : XT[id][1]);

function buildBar() {
  bar = document.createElement('div');
  bar.id = 'ledit';
  bar.innerHTML = '<div class="lh"><b>Editar disposição</b><span id="led-sel">Arraste qualquer botão</span></div>' +
    '<label>Tamanho <input type="range" id="led-sz" min="30" max="130" step="2" disabled></label>' +
    '<label id="led-rw" hidden>Rotação <input type="range" id="led-rt" min="-180" max="180" step="1"></label>' +
    '<div class="la"><button id="led-reset">Restaurar</button><button id="led-done" class="pri">Pronto</button></div>';
  body.append(bar);
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  $('led-sz').oninput = e => change({ sz: +e.target.value });
  $('led-rt').oninput = e => change({ rot: +e.target.value });
  $('led-reset').onclick = () => { L[ok()] = {}; store(); applyLayout(); refresh(); log('Disposição restaurada'); };
  $('led-done').onclick = stopEdit;
}
function change(p) {
  if (!selId) return;
  const o = ok(), q = Object.assign({}, cur(selId), p);
  L[o][selId] = q; store(); applyLayout(); refresh();
}
function refresh() {
  document.querySelectorAll('.led-on').forEach(e => e.classList.remove('led-on'));
  const sz = $('led-sz'), rw = $('led-rw');
  if (!selId) { $('led-sel').textContent = 'Arraste qualquer botão'; sz.disabled = true; rw.hidden = true; return; }
  const q = cur(selId), el = BTN[selId] ? $(BTN[selId][0]) : $(XT[selId][0]), gem = selId === 'gwl' || selId === 'gwr';
  el.classList.add('led-on');
  $('led-sel').textContent = nameOf(selId);
  sz.disabled = false; sz.value = q.sz; sz.min = gem ? 30 : 30; sz.max = gem ? 140 : 110;
  rw.hidden = !gem;
  if (gem) $('led-rt').value = q.rot == null ? DEF_ROT : q.rot;
}
function begin(e) {
  if (!editing) return;
  if (e.target.closest('#ledit')) return;                 // a barra do editor funciona normalmente
  e.stopImmediatePropagation(); e.preventDefault();       // nada do jogo reage enquanto edita
  const el = e.target.closest(SEL);
  if (!el) return;
  selId = idOf(el); drag = e.pointerId; refresh();
}
function move(e) {
  if (!editing || drag !== e.pointerId || !selId) return;
  e.preventDefault();
  const q = cur(selId), h = q.sz * (XT[selId] && selId !== 'lnch' ? .3 : .5);
  const gx = handR() ? innerWidth - e.clientX : e.clientX, gy = innerHeight - e.clientY;
  L[ok()][selId] = Object.assign({}, q, { x: Math.round(Math.min(innerWidth - h, Math.max(h, gx))), y: Math.round(Math.min(innerHeight - h, Math.max(h, gy))) });
  applyLayout(); refresh();
}
function end(e) { if (drag === e.pointerId) { drag = null; store(); } }
function swallow(e) { if (editing && !e.target.closest('#ledit')) { e.stopImmediatePropagation(); e.preventDefault(); } }

export function startEdit() {
  if (!isMob()) { log('A barra do computador é fixa. Use o celular (ou uma janela estreita) para editar.'); return; }
  closePanel();
  body.classList.remove('menu-open');
  editing = true; selId = null;
  if (!bar) buildBar();
  body.classList.add('lay-edit');
  bar.style.display = 'block';
  refresh();
}
export function stopEdit() {
  editing = false; drag = null; selId = null;
  body.classList.remove('lay-edit');
  if (bar) bar.style.display = 'none';
  document.querySelectorAll('.led-on').forEach(e => e.classList.remove('led-on'));
  store();
}

export function initLayout() {
  document.addEventListener('pointerdown', begin, true);
  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  ['click', 'mousedown', 'mouseup'].forEach(t => document.addEventListener(t, swallow, true));
  addEventListener('keydown', e => { if (editing && e.code === 'Escape') stopEdit(); });
  const b = $('gx-lay');
  if (b) b.onclick = startEdit;
  addEventListener('resize', () => { if (isMob()) applyLayout(); });
}
