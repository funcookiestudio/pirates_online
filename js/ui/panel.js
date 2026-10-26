/* Painel do personagem (tecla I): atributos, equipamento e mochila. */
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { $, isPanelOpen } from '../core/utils.js';
import { WEAPONS, RN } from '../data/weapons.js';
import { P } from '../entities/player.js';
import { dropItem } from '../entities/loot.js';
import { itemReq } from '../data/scaling.js';
import { slotOf, unequip, pickSlot, canEquipTo, POT_MAX, BOMB_MAX } from '../systems/inventory.js';
import { bag, eq, equip, BAG_MAX, bagUsed, bagFull, beltSlots, beltStacks } from '../systems/inventory.js';
import { PST } from '../pets/stats.js';
import { renderPets, initPetPanel } from './pet-panel.js';
import { fitHotbar } from './hotbar.js';
import { showPlayer, showItem, initPreview } from './preview.js';
import { renderQuestLog } from './questlog.js';
import { clearSave } from '../systems/save.js';
import { resetPlayer, armedButton } from '../systems/reset.js';

/** Uma casinha de item (arma ou armadura); `fn` é o clique (equipar). `label`/`ph` = rótulo e ícone do espaço vazio */
function slot(it, fn, label, ph) {
  const d = document.createElement('div');
  d.className = 'sl' + (it ? ' r' + it.q : ph ? ' ph' : '');
  if (it) {
    d.innerHTML = (it.ty === 'wpn' ? (WEAPONS[it.w].torch ? '🔥' : WEAPONS[it.w].gun ? '🔫' : '⚔') : '🛡') + '<small>+' + it.v + '</small>';
    d.title = it.n + ' (' + RN[it.q] + (it.il ? ', Nv ' + it.il : '') + ') +' + it.v + (it.ty === 'wpn' ? ' dano · ' + (WEAPONS[it.w].torch ? 'mão 2, com arma de 1 mão' : WEAPONS[it.w].big ? '2 mãos' : '1 mão') : ' vida');
    if (it.ty === 'wpn' && WEAPONS[it.w].big) d.insertAdjacentHTML('beforeend', '<b class="hand2">2M</b>');
  } else if (ph) d.innerHTML = '<em>' + ph + '</em>';
  if (label) d.insertAdjacentHTML('beforeend', '<u>' + label + '</u>');
  if (fn) d.onclick = fn;
  return d;
}

/** Aba aberta: 'char' · 'skills' · 'tal'; e aba da mochila: 'eq' · 'cons' · 'quest' · 'mat' */
let tab = 'char', btab = 'eq', sel = -1, selE = '';   // sel = item da mochila · selE = espaço equipado selecionado

/** Espaços de equipamento (como em telas de ARPG): [id, rótulo, ícone]. Só os que têm item no jogo funcionam por enquanto. */
const LEFT = [['helm', 'ELMO', '🪖'], ['amulet', 'AMULETO', '📿'], ['arm', 'PEITORAL', '🦺'], ['ring1', 'ANEL', '💍']];
const RIGHT = [['gloves', 'LUVAS', '🧤'], ['legs', 'CALÇAS', '👖'], ['boots', 'BOTAS', '🥾'], ['ring2', 'ANEL', '💍']];

function stat(ic, name, val, sub, tip) {
  return '<div class="st" title="' + (tip || '') + '"><i>' + ic + '</i><span>' + name + (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + val + '</b></div>';
}

/** Marca um espaço de equipamento: aceita soltar itens (data-drop) e, com item, pode ser arrastado de volta (data-drag) */
function mark(d, k, it) { d.dataset.drop = k; if (it) d.dataset.drag = 'eq:' + k; }

/* ---------- Arrastar e soltar (mouse e toque): mochila → espaço equipa · espaço → mochila desequipa ---------- */
function initDrag() {
  const root = $('pnl');
  let st = null, ghost = null, hover = null;
  const okFor = (src, tgt) => {
    if (!tgt) return false;
    const k = tgt.dataset.drop || (tgt.closest('#bag') ? 'bag' : '');
    if (src.t === 'bag') { const it = bag[src.i]; return !!it && !!k && k !== 'bag' && canEquipTo(it, k); }
    return k === 'bag' && !!eq[src.i];
  };
  const target = (x, y) => { const e = document.elementFromPoint(x, y); return e && (e.closest('[data-drop]') || e.closest('#bag')); };
  root.addEventListener('pointerdown', e => {
    const d = e.target.closest('[data-drag]');
    if (!d || e.button > 0) return;
    const [t, i] = d.dataset.drag.split(':');
    st = { t, i: t === 'bag' ? +i : i, el: d, x: e.clientX, y: e.clientY, on: false };
  });
  addEventListener('pointermove', e => {
    if (!st) return;
    if (!st.on) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 8) return;
      st.on = true;
      ghost = st.el.cloneNode(true);
      ghost.className += ' dragghost';
      ghost.style.width = st.el.offsetWidth + 'px'; ghost.style.height = st.el.offsetHeight + 'px';
      document.body.append(ghost);
      st.el.classList.add('dragsrc');
      root.classList.add('dragging');
    }
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    const t = target(e.clientX, e.clientY);
    if (hover && hover !== t) hover.classList.remove('dropok', 'dropno');
    hover = t;
    if (t) { const ok = okFor(st, t); t.classList.toggle('dropok', ok); t.classList.toggle('dropno', !ok); }
  });
  const end = e => {
    if (!st) return;
    const s = st; st = null;
    if (hover) hover.classList.remove('dropok', 'dropno');
    hover = null;
    if (!s.on) return;
    if (ghost) ghost.remove(); ghost = null;
    root.classList.remove('dragging');
    s.el.classList.remove('dragsrc');
    const eat = ev => ev.stopPropagation();
    s.el.addEventListener('click', eat, true);           // o soltar não conta como clique
    setTimeout(() => s.el.removeEventListener('click', eat, true), 60);
    const t = e.type === 'pointerup' ? target(e.clientX, e.clientY) : null;
    if (!okFor(s, t)) return;
    sel = -1; selE = '';
    if (s.t === 'bag') equip(s.i, t.dataset.drop); else unequip(s.i);
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
}

/** Seleciona (ou fecha) a prévia de um item equipado */
function pickE(k) { selE = selE === k ? '' : k; sel = -1; renderPanel(); fitPanel(); }

/** Atualiza cartão do personagem e atributos */
function itemCard(it, worn) {
  const isW = it.ty === 'wpn', W = isW ? WEAPONS[it.w] : null, old = worn ? null : eq[pickSlot(it, false)];
  const diff = worn ? 0 : old ? it.v - old.v : it.v, df = diff ? ' <small>(' + (diff > 0 ? '+' : '') + diff + ' vs. equipado)</small>' : '';
  return '<div class="st icard r' + it.q + '"><i>' + (isW ? (W.gun ? '🔫' : '⚔') : '🛡') + '</i><span>' + it.n + '<small>' + RN[it.q] + (it.il ? ' · Nv ' + it.il : '') + (isW ? (W.torch ? ' · segunda mão (ilumina)' : W.gun ? ' · arma de fogo' : ' · corpo a corpo') + (W.big ? ' · 2 MÃOS' : W.torch ? '' : ' · 1 mão') : ' · armadura') + '</small></span></div>' +
    stat(isW ? '⚔' : '🛡', isW ? 'ATAQUE' : 'DEFESA / VIDA', '+' + it.v, df.replace(/<\/?small>/g, '')) +
    (isW ? stat('⏱', 'VELOCIDADE', (1 / (W.cd || 1)).toFixed(1) + '/s', 'Recarga ' + (W.cd || 1) + 's') : '') +
    (worn ? '<div class="iact"><button id="ieq">DESEQUIPAR</button><button id="idr">FECHAR</button></div>' : (P.lv < itemReq(it) ? stat('🔒', 'EXIGE NÍVEL', itemReq(it), 'Você está no nível ' + P.lv) : '') + '<div class="iact"><button id="ieq">EQUIPAR</button><button id="idr">DROPAR</button></div>');
}

export function renderStats() {
  if (selE && eq[selE]) {
    $('stt').innerHTML = itemCard(eq[selE], true);
    $('ieq').onclick = () => { const k = selE; selE = ''; unequip(k); };
    $('idr').onclick = () => { selE = ''; renderPanel(); fitPanel(); };
    return;
  }
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
  renderQuick();
}

/** Linha central sob o retrato: poção, bomba e arma de fogo (a mão 2 fica no canto) */
function renderQuick() {
  const el = $('attr');
  el.innerHTML = '';
  const cons = (ic, n, lb, tip, r = 0) => { const d = slot(null, null, lb, ic); d.className = 'sl ' + (n > 0 ? 'r1' : 'ph'); d.innerHTML = '<em>' + ic + '</em><small>x' + n + (r ? ' +' + r : '') + '</small><u>' + lb + '</u>'; d.title = tip + (r ? ' · no cinto: +' + r : ''); return d; };
  el.append(cons('🧪', P.pot, 'POÇÃO', 'Poção de vida (tecla E) · pilha de ' + POT_MAX + ' no slot; o resto fica no cinto', P.potR));
  el.append(cons('💣', P.bmb, 'BOMBA', 'Bomba (tecla W) · pilha de ' + BOMB_MAX + ' no slot; o resto fica no cinto', P.bmbR));
  const g = slot(eq.gun, eq.gun ? () => pickE('gun') : null, 'FOGO', '🔫'); mark(g, 'gun', eq.gun);
  if (P.act === 'gun') g.classList.add('act');
  if (selE === 'gun') g.classList.add('sel');
  el.append(g);
}

const grid = (el, n) => { el.innerHTML = ''; for (let i = 0; i < n; i++) el.append(slot(null, null, '', '🔒')); };

function renderPanel() {
  ['char', 'skills', 'tal', 'qst'].forEach(t => {
    $('pg-' + t).hidden = tab !== t;
    $('tb-' + t).classList.toggle('on', tab === t);
  });
  if (tab === 'skills') { grid($('sgrid'), 12); return; }
  if (tab === 'tal') { grid($('tgrid'), 18); return; }
  if (tab === 'qst') { renderQuestLog($('qlog'), () => renderPanel()); return; }

  const fill = (el, list) => {
    el.innerHTML = '';
    list.forEach(([id, lb, ic]) => { const d = slot(id === 'arm' ? eq.arm : null, id === 'arm' && eq.arm ? () => pickE('arm') : null, lb, ic); if (selE === id) d.classList.add('sel'); if (id === 'arm') mark(d, 'arm', eq.arm); el.append(d); });
  };
  if (selE && !eq[selE]) selE = '';
  const shown = sel >= 0 && bag[sel] ? bag[sel] : selE ? eq[selE] : null;
  if (shown) showItem(shown); else showPlayer();
  fill($('eqL'), LEFT);
  fill($('eqR'), RIGHT);
  const w = slot(eq.wpn, eq.wpn ? () => pickE('wpn') : null, 'MÃO 1', '⚔');
  const o = slot(eq.off, eq.off ? () => pickE('off') : null, 'MÃO 2', '✋'); mark(o, 'off', eq.off); mark(w, 'wpn', eq.wpn);
  o.title = eq.off ? o.title : 'Mão 2 livre: aceita outra arma do mesmo tipo (dois machadinhos, duas pistolas)';
  if (P.act === 'wpn') w.classList.add('act');
  if (selE === 'wpn') w.classList.add('sel'); if (selE === 'off') o.classList.add('sel');
  $('eqW').innerHTML = $('eqG').innerHTML = '';
  $('eqW').append(w);
  $('eqG').append(o);

  // mochila: abas Equipamento / Consumíveis / Missão / Materiais
  document.querySelectorAll('#btabs span').forEach(e => e.classList.toggle('on', e.dataset.b === btab));
  const b = $('bag');
  b.innerHTML = '';
  if (btab === 'eq') {
    const st = beltStacks();   // pilhas do cinto ocupam vagas da mochila (depois dos equipamentos)
    for (let i = 0; i < BAG_MAX; i++) {
      const d = slot(bag[i], bag[i] ? () => { sel = sel === i ? -1 : i; selE = ''; renderPanel(); fitPanel(); } : null);
      if (bag[i]) d.dataset.drag = 'bag:' + i;
      else if (st[i - bag.length]) { const s = st[i - bag.length]; d.className = 'sl r1'; d.innerHTML = (s.k === 'pot' ? '🧪' : '💣') + '<small>x' + s.n + '</small>'; d.title = 'Cinto: ' + (s.k === 'pot' ? 'poções' : 'bombas') + ' · ocupa 1 vaga da mochila'; }
      b.append(d);
    }
    if (sel >= 0) b.children[sel] && b.children[sel].classList.add('sel');
    $('bcnt').textContent = bagUsed() + ' / ' + BAG_MAX + (beltSlots() ? ' (cinto: ' + beltSlots() + ')' : '') + (bagFull() ? ' · CHEIA' : '');
    $('bcnt').style.color = bagFull() ? '#ff8a6a' : '';
  } else {
    const st = btab === 'cons' ? beltStacks() : [];   // aba Consumíveis = o cinto (as pilhas de reserva)
    for (let i = 0; i < 24; i++) {
      const d = slot(null), s = st[i];
      if (s) { d.className = 'sl r1'; d.innerHTML = (s.k === 'pot' ? '🧪' : '💣') + '<small>x' + s.n + '</small>'; d.title = (s.k === 'pot' ? 'Poções' : 'Bombas') + ' no cinto · ocupa 1 vaga da mochila'; }
      b.append(d);
    }
    $('bcnt').textContent = btab === 'cons' ? 'Cinto: ' + st.length + ' vaga(s) da mochila · slot 🧪' + P.pot + ' 💣' + P.bmb : '0 / 24';
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
    // o painel nasce do topo do convés da hotbar, centralizado entre os diamantes, e cresce para cima
    const hb = $('hb').getBoundingClientRect();
    const avail = hb.top - 2 - 8 - 6;
    el.style.top = 'auto';
    el.style.bottom = (innerHeight - hb.top + 2) + 'px';
    el.style.transformOrigin = '50% 100%';
    el.style.left = (hb.left + hb.width / 2) + 'px';
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
  ['char', 'skills', 'tal', 'qst'].forEach(t => { $('tb-' + t).onclick = () => setTab(t); });
  document.querySelectorAll('#btabs span').forEach(e => { e.onclick = () => { btab = e.dataset.b; renderPanel(); fitPanel(); }; });
  $('bsort').onclick = () => { bag.sort((a, c) => c.q - a.q || c.v - a.v); renderPanel(); };
  armedButton($('rpl'), 'Resetar personagem', resetPlayer);
  // ajustes do auto (botão ⚙)
  Object.keys(state.autoCfg).forEach(k => {
    const c = $('ac-' + k);
    c.onchange = () => { state.autoCfg[k] = c.type === 'checkbox' ? c.checked : +c.value; sync(); };
    if (c.type === 'range') c.oninput = c.onchange;
  });
  // texto de resumo das sliders/linhas dependentes
  const sync = () => {
    const c = state.autoCfg;
    $('acv-potHp').textContent = c.potHp + '%';
    $('acv-reserve').textContent = c.reserve + ' ouro';
    $('acv-bagAt').textContent = c.bagAt + '/24';
    const RQ = ['nada', 'Comum', 'Comum e Mágico', 'tudo (inclui Lendário)'];
    $('acs-sell').textContent = c.sellMax ? 'Vende ' + RQ[c.sellMax] + ' que não seja melhor que o equipado' : 'Não vende sozinho';
    $('acs-store').textContent = c.storeMin ? 'Guarda no baú itens ' + ['', 'Comuns ou melhores', 'Mágicos ou melhores', 'Lendários'][c.storeMin] : 'Não guarda sozinho';
  };
  $('bg').onclick = () => {
    const a = $('acfg');
    Object.keys(state.autoCfg).forEach(k => { const c = $('ac-' + k); if (c.type === 'checkbox') c.checked = state.autoCfg[k]; else c.value = state.autoCfg[k]; });
    sync();
    a.style.display = a.style.display === 'block' ? 'none' : 'block';
  };
  initDrag();
  on('inventory:changed', () => { if ($('pnl').style.display === 'block') renderPanel(); });
  on('pets:changed', () => { if ($('pnl2').style.display === 'block') renderPets(); });
}
