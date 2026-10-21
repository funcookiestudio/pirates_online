/* Painel do personagem (tecla I): atributos, equipamento e mochila. */
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { $, isPanelOpen } from '../core/utils.js';
import { WEAPONS, RN } from '../data/weapons.js';
import { P } from '../entities/player.js';
import { dropItem } from '../entities/loot.js';
import { slotOf } from '../systems/inventory.js';
import { bag, eq, equip, BAG_MAX } from '../systems/inventory.js';
import { PST } from '../pets/stats.js';
import { renderPets, initPetPanel } from './pet-panel.js';
import { fitHotbar } from './hotbar.js';
import { showPlayer, initPreview } from './preview.js';
import { clearSave } from '../systems/save.js';
import { resetPlayer, armedButton } from '../systems/reset.js';

/** Uma casinha de item (arma ou armadura); `fn` é o clique (equipar). `label`/`ph` = rótulo e ícone do espaço vazio */
function slot(it, fn, label, ph) {
  const d = document.createElement('div');
  d.className = 'sl' + (it ? ' r' + it.q : ph ? ' ph' : '');
  if (it) {
    d.innerHTML = (it.ty === 'wpn' ? (WEAPONS[it.w].gun ? '🔫' : '⚔') : '🛡') + '<small>+' + it.v + '</small>';
    d.title = it.n + ' (' + RN[it.q] + ') +' + it.v + (it.ty === 'wpn' ? ' dano' : ' vida');
  } else if (ph) d.innerHTML = '<em>' + ph + '</em>';
  if (label) d.insertAdjacentHTML('beforeend', '<u>' + label + '</u>');
  if (fn) d.onclick = fn;
  return d;
}

/** Aba aberta: 'char' · 'skills' · 'tal'; e aba da mochila: 'eq' · 'cons' · 'quest' · 'mat' */
let tab = 'char', btab = 'eq', sel = -1;

/** Espaços de equipamento (como em telas de ARPG): [id, rótulo, ícone]. Só os que têm item no jogo funcionam por enquanto. */
const LEFT = [['helm', 'ELMO', '🪖'], ['amulet', 'AMULETO', '📿'], ['arm', 'PEITORAL', '🦺'], ['ring1', 'ANEL', '💍']];
const RIGHT = [['gloves', 'LUVAS', '🧤'], ['legs', 'CALÇAS', '👖'], ['boots', 'BOTAS', '🥾'], ['ring2', 'ANEL', '💍']];

function stat(ic, name, val, sub, tip) {
  return '<div class="st" title="' + (tip || '') + '"><i>' + ic + '</i><span>' + name + (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + val + '</b></div>';
}

/** Atualiza cartão do personagem e atributos */
function itemCard(it) {
  const isW = it.ty === 'wpn', W = isW ? WEAPONS[it.w] : null, old = eq[slotOf(it)];
  const diff = old ? it.v - old.v : it.v, df = diff ? ' <small>(' + (diff > 0 ? '+' : '') + diff + ' vs. equipado)</small>' : '';
  return '<div class="st icard r' + it.q + '"><i>' + (isW ? (W.gun ? '🔫' : '⚔') : '🛡') + '</i><span>' + it.n + '<small>' + RN[it.q] + (isW ? (W.gun ? ' · arma de fogo' : ' · corpo a corpo') : ' · armadura') + '</small></span></div>' +
    stat(isW ? '⚔' : '🛡', isW ? 'ATAQUE' : 'DEFESA / VIDA', '+' + it.v, df.replace(/<\/?small>/g, '')) +
    (isW ? stat('⏱', 'VELOCIDADE', (1 / (W.cd || 1)).toFixed(1) + '/s', 'Recarga ' + (W.cd || 1) + 's') : '') +
    '<div class="iact"><button id="ieq">EQUIPAR</button><button id="idr">DROPAR</button></div>';
}

export function renderStats() {
  if (sel >= 0 && bag[sel]) {
    $('stt').innerHTML = itemCard(bag[sel]);
    $('ieq').onclick = () => { const i = sel; sel = -1; equip(i); };
    $('idr').onclick = () => { const it = bag.splice(sel, 1)[0]; sel = -1; dropItem(it); renderPanel(); fitPanel(); };
    return;
  }
  const W = WEAPONS[P.wid], cd = P.cdMax || W.cd;
  $('pcl2').textContent = 'NÍVEL ' + P.lv;
  $('pxp2').style.width = Math.min(100, P.xp / P.nxt * 100) + '%';
  $('potn').textContent = P.pot;
  $('gld').textContent = P.gold;
  $('stt').innerHTML =
    stat('⚔', 'ATAQUE', P.dmg, 'DPS ' + (P.dmg * W.mul / (W.cd || 1)).toFixed(1) + ' · Vel. ' + (1 / (W.cd || 1)).toFixed(1) + '/s<br>Crítico 15% · x2', 'Dano, DPS, velocidade de ataque e crítico') +
    stat('🛡', 'DEFESA', (eq.arm ? eq.arm.v : 0), 'Redução de dano ' + Math.round((P.dr || 0) * 100) + '%', 'Defesa da armadura') +
    stat('❤', 'VIDA', P.max, 'Atual ' + Math.ceil(P.hp) + '<br>Mana ' + Math.floor(P.mp) + ' / ' + P.mmax, 'Vida máxima');
  $('attr').innerHTML = ['💪|FOR', '🏹|DES', '🧠|INT'].map(x => { const [i, n] = x.split('|'); return '<div title="Atributo — em breve"><span>' + i + ' ' + n + '</span><b>—</b></div>'; }).join('');
}

const grid = (el, n) => { el.innerHTML = ''; for (let i = 0; i < n; i++) el.append(slot(null, null, '', '🔒')); };

function renderPanel() {
  ['char', 'skills', 'tal'].forEach(t => {
    $('pg-' + t).hidden = tab !== t;
    $('tb-' + t).classList.toggle('on', tab === t);
  });
  if (tab === 'skills') { grid($('sgrid'), 12); return; }
  if (tab === 'tal') { grid($('tgrid'), 18); return; }

  const fill = (el, list) => {
    el.innerHTML = '';
    list.forEach(([id, lb, ic]) => el.append(slot(id === 'arm' ? eq.arm : null, null, lb, ic)));
  };
  showPlayer();
  fill($('eqL'), LEFT);
  fill($('eqR'), RIGHT);
  const w = slot(eq.wpn, null, 'CORPO A CORPO', '⚔'), g = slot(eq.gun, null, 'FOGO', '🔫');
  (P.act === 'wpn' ? w : g).classList.add('act'); // a que está na mão
  $('eqW').innerHTML = $('eqG').innerHTML = '';
  $('eqW').append(w);
  $('eqG').append(g);

  // mochila: abas Equipamento / Consumíveis / Missão / Materiais
  document.querySelectorAll('#btabs span').forEach(e => e.classList.toggle('on', e.dataset.b === btab));
  const b = $('bag');
  b.innerHTML = '';
  if (btab === 'eq') {
    for (let i = 0; i < BAG_MAX; i++) b.append(slot(bag[i], bag[i] ? () => { sel = sel === i ? -1 : i; renderPanel(); fitPanel(); } : null));
    if (sel >= 0) b.children[sel] && b.children[sel].classList.add('sel');
    $('bcnt').textContent = bag.length + ' / ' + BAG_MAX + (bag.length >= BAG_MAX ? ' · CHEIA' : '');
    $('bcnt').style.color = bag.length >= BAG_MAX ? '#ff8a6a' : '';
  } else {
    for (let i = 0; i < 24; i++) {
      const d = slot(null);
      if (btab === 'cons' && i === 0 && P.pot > 0) { d.className = 'sl r1'; d.innerHTML = '🧪<small>x' + P.pot + '</small>'; d.title = 'Poção de vida (E)'; }
      b.append(d);
    }
    $('bcnt').textContent = btab === 'cons' ? (P.pot ? 1 : 0) + ' / 24' : '0 / 24';
  }
  renderStats();
}

/** Abre/fecha o painel */
export function togglePanel() {
  if (isPanelOpen()) closePanel(); else openTab('char');
}

/** Encolhe o painel (escala) quando o conteúdo não cabe na altura da tela, para nunca precisar de barra de rolagem */
const PANEL_MIN = .55;
export function fitPanel() {
  fitHotbar();
  ['pnl', 'pnl2'].forEach(id => {
    const el = $(id);
    if (el.style.display !== 'block') return;
    el.style.maxHeight = 'none';
    el.style.overflowY = 'visible';
    el.style.transform = 'translateX(-50%)';
    // espaço livre: acima da hotbar (que também pode estar reduzida) e dentro da largura da tela
    const hb = $('hb').getBoundingClientRect();
    const avail = hb.top - 12 - 8;
    let k = Math.min(1, avail / el.offsetHeight, (innerWidth - 4) / el.offsetWidth);
    if (k < PANEL_MIN) {
      // tela muito baixa: tamanho mínimo e, só nesse caso, rolagem interna para nada ser cortado
      k = PANEL_MIN;
      el.style.maxHeight = (avail / k) + 'px';
      el.style.overflowY = 'auto';
    }
    el.style.transform = 'translateX(-50%) scale(' + k.toFixed(3) + ')';
  });
}

/** Abre o painel do personagem ('char') ou do companheiro ('pets'); clicar de novo no mesmo fecha */
export function openTab(t) {
  const mine = $(t === 'pets' ? 'pnl2' : 'pnl'), other = $(t === 'pets' ? 'pnl' : 'pnl2');
  const wasOpen = mine.style.display === 'block';
  closePanel();
  if (wasOpen) return;
  other.style.display = 'none';
  mine.style.display = 'block';
  if (t === 'pets') renderPets(); else { tab = 'char'; renderPanel(); }
  fitPanel();
}

/** Troca de aba (personagem / companheiros) */
function setTab(t) {
  tab = t;
  renderPanel();
  fitPanel();
}

export function closePanel() {
  $('pnl').style.display = 'none';
  $('pnl2').style.display = 'none';
}

/** Mantém o painel atualizado quando itens ou companheiros mudam */
export function initPanel() {
  initPreview();
  initPetPanel();
  addEventListener('resize', fitPanel);
  on('panel:fit', fitPanel);
  // apagar progresso: pede um segundo clique (sem confirm(), que alguns ambientes bloqueiam)
  let armed = null;
  $('rst').onclick = () => {
    if (armed) { clearSave(); return; }
    $('rst').textContent = 'Clique de novo para apagar tudo';
    armed = setTimeout(() => { armed = null; $('rst').textContent = 'Apagar progresso salvo'; }, 3000);
  };
  ['char', 'skills', 'tal'].forEach(t => { $('tb-' + t).onclick = () => setTab(t); });
  document.querySelectorAll('#btabs span').forEach(e => { e.onclick = () => { btab = e.dataset.b; renderPanel(); fitPanel(); }; });
  $('bsort').onclick = () => { bag.sort((a, c) => c.q - a.q || c.v - a.v); renderPanel(); };
  armedButton($('rpl'), 'Resetar personagem', resetPlayer);
  // ajustes do auto (botão ⚙)
  Object.keys(state.autoCfg).forEach(k => {
    const c = $('ac-' + k);
    c.onchange = () => { state.autoCfg[k] = c.type === 'checkbox' ? c.checked : +c.value; };
  });
  $('bg').onclick = () => {
    const a = $('acfg');
    Object.keys(state.autoCfg).forEach(k => { const c = $('ac-' + k); if (c.type === 'checkbox') c.checked = state.autoCfg[k]; else c.value = state.autoCfg[k]; });
    a.style.display = a.style.display === 'block' ? 'none' : 'block';
  };
  on('inventory:changed', () => { if ($('pnl').style.display === 'block') renderPanel(); });
  on('pets:changed', () => { if ($('pnl2').style.display === 'block') renderPets(); });
}
