/* Painéis do personagem (tecla I): Personagem · Habilidades · Talentos · Missões, no formato de folha do protótipo. */
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
import { CFG } from '../systems/settings.js';
import { svg } from './icons.js';
import { clearSave } from '../systems/save.js';
import { resetPlayer, armedButton } from '../systems/reset.js';

/** Ícone de um item: tocha, arma de fogo, espada ou armadura */
const iconOf = it => it.ty === 'wpn' ? (WEAPONS[it.w].torch ? 'torch' : WEAPONS[it.w].gun ? 'gun' : 'sword') : 'chest';
const RCOL = ['', 'var(--common)', 'var(--magic)', 'var(--legend)'];

/** Uma casinha de item (arma ou armadura); `fn` é o clique. `label`/`ph` = rótulo e ícone do espaço vazio */
function slot(it, fn, label, ph) {
  const d = document.createElement('div');
  d.className = 'sl' + (it ? ' r' + it.q : ph ? ' ph' : ' empty');
  if (it) {
    d.innerHTML = svg(iconOf(it)) + '<span class="v">+' + it.v + '</span>';
    d.title = it.n + ' (' + RN[it.q] + (it.il ? ', Nv ' + it.il : '') + ') +' + it.v + (it.ty === 'wpn' ? ' dano · ' + (WEAPONS[it.w].torch ? 'mão 2, com arma de 1 mão' : WEAPONS[it.w].big ? '2 mãos' : '1 mão') : ' vida');
    if (it.ty === 'wpn' && WEAPONS[it.w].big) d.insertAdjacentHTML('beforeend', '<b class="hand2">2M</b>');
  } else {
    d.innerHTML = (ph ? svg(ph) : '') + (label ? '<u>' + label + '</u>' : '');
  }
  if (fn) d.onclick = fn;
  return d;
}
/** Casinha de consumível (poção/bomba) com a quantidade */
function consSlot(k, n, label, title) {
  const d = document.createElement('div');
  d.className = 'sl cons' + (n > 0 ? '' : ' ph');
  d.innerHTML = svg(k === 'pot' ? 'potion' : 'bomb') + '<span class="ct">x' + n + '</span>' + (label ? '<u>' + label + '</u>' : '');
  d.title = title;
  return d;
}

/** Aba aberta: 'char' · 'skills' · 'tal' · 'qst'; e aba da mochila: 'eq' · 'cons' · 'quest' · 'mat' */
let tab = 'char', btab = 'eq', sel = -1, selE = '', selSk = 'q', selTn = '';   // sel = item da mochila · selE = espaço equipado selecionado

const TABS = [['char', 'person', 'Personagem'], ['skills', 'burst', 'Habilidades'], ['tal', 'star', 'Talentos'], ['qst', 'scroll', 'Missões']];
/** Espaços de equipamento: [id, rótulo, ícone]. Só os que têm item no jogo funcionam por enquanto. */
const LEFT = [['helm', 'ELMO', 'head'], ['amulet', 'AMULETO', 'amulet'], ['arm', 'PEITORAL', 'chest'], ['ring1', 'ANEL', 'ring']];
const RIGHT = [['gloves', 'LUVAS', 'glove'], ['legs', 'CALÇAS', 'legs'], ['boots', 'BOTAS', 'boots'], ['ring2', 'ANEL', 'ring']];

const tile = (name, val, sub, tip) => '<div class="stt-i" title="' + (tip || '') + '"><small>' + name + '</small><b>' + val + '</b><u>' + sub + '</u></div>';

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

/** Detalhe do item (cobre só a área do nível/atributos): nome pela raridade, atributo principal, comparação com o equipado e afixos */
function itemCard(it, worn) {
  const isW = it.ty === 'wpn', W = isW ? WEAPONS[it.w] : null, old = worn ? null : eq[pickSlot(it, false)];
  const diff = worn ? 0 : old ? it.v - old.v : it.v;
  const kind = isW ? (W.torch ? 'Tocha · segunda mão' : W.gun ? 'Arma de fogo' : W.big ? 'Arma de duas mãos' : 'Arma de uma mão') : 'Armadura';
  const li = [];
  if (it.il) li.push('<li>Nível do item ' + it.il + '</li>');
  if (isW) { li.push('<li>Velocidade ' + (1 / (W.cd || 1)).toFixed(1) + ' ataques/s</li>'); li.push('<li>Recarga ' + (W.cd || 1) + ' s</li>'); if (W.torch) li.push('<li>Ilumina o caminho</li>'); }
  else li.push('<li>Aumenta a vida máxima</li>');
  if (it.q === 3) li.push('<li class="lg">Item lendário</li>');
  if (!worn && P.lv < itemReq(it)) li.push('<li class="bad">Exige nível ' + itemReq(it) + ' (você: ' + P.lv + ')</li>');
  return '<div class="dtl"><div class="dh"><div class="sl r' + it.q + '">' + svg(iconOf(it)) + '</div><div style="min-width:0"><div class="nm" style="color:' + RCOL[it.q] + '">' + it.n + '</div><div class="ty">' + RN[it.q] + ' · ' + kind + '</div></div></div>' +
    '<div class="big" style="color:' + RCOL[it.q] + '">+' + it.v + '<small>' + (isW ? 'Ataque' : 'Vida') + '</small>' + (diff ? '<span class="dl ' + (diff > 0 ? 'up' : 'dn') + '">' + (diff > 0 ? '▲ +' : '▼ ') + diff + '</span>' : '') + '</div>' +
    '<ul>' + li.join('') + '</ul></div>' +
    '<div class="dbt">' + (worn ? '<button class="btn pri" id="ieq">Remover</button><button class="btn" id="idr">Fechar</button>' : '<button class="btn pri" id="ieq">Equipar</button><button class="btn" id="idr">Descartar</button>') + '</div>';
}

export function renderStats() {
  const W = WEAPONS[P.wid];
  $('pcl2').textContent = 'Nv ' + P.lv;
  const em = document.querySelector('#mid .lvc em'); if (em) em.textContent = Math.floor(P.xp) + ' / ' + P.nxt + ' XP';
  $('pxp2').style.width = Math.min(100, P.xp / P.nxt * 100) + '%';
  $('gld').textContent = P.gold;
  // só mexe no DOM quando algo mudou (renderStats roda a cada 0,4 s: recriar os botões a cada vez engolia toques e piscava)
  const put = (el, html, key = html) => { if (el._h === key) return false; el._h = key; el.innerHTML = html; return true; };
  put($('stt'),
    tile('Ataque', P.dmg, 'DPS ' + (P.dmg * W.mul / (W.cd || 1)).toFixed(1) + ' · Crít. 15%', 'Dano, DPS, velocidade de ataque e crítico') +
    tile('Defesa', (eq.arm ? eq.arm.v : 0), 'Redução ' + Math.round((P.dr || 0) * 100) + '%', 'Defesa da armadura') +
    tile('Vida', P.max, Math.ceil(P.hp) + ' atual · Mana ' + Math.floor(P.mp) + '/' + P.mmax, 'Vida máxima'));
  const itm = $('itm');
  if (selE && eq[selE]) {
    const h = itemCard(eq[selE], true);
    if (put(itm, h, 'e' + selE + h)) {
      $('ieq').onclick = () => { const k = selE; selE = ''; unequip(k); };
      $('idr').onclick = () => { selE = ''; renderPanel(); fitPanel(); };
    }
  } else if (sel >= 0 && bag[sel]) {
    const h = itemCard(bag[sel]);
    if (put(itm, h, 'b' + sel + h)) {
      $('ieq').onclick = () => { const i = sel; sel = -1; equip(i); };
      $('idr').onclick = () => { const it = bag.splice(sel, 1)[0]; sel = -1; dropItem(it); renderPanel(); fitPanel(); };
    }
  } else put(itm, '');
  itm.hidden = !itm.innerHTML;   // item aberto: o detalhe cobre o nível e os atributos, sem mudar o tamanho dos outros cards
}

/* ---------- Habilidades: o que o jogo tem de verdade. Pontos, níveis de habilidade e passivas novas ainda não existem. ---------- */
const SKILLS = [
  { id: 'q', n: 'Giro', ic: 'whirl', k: 'Q', t: 'Recarga 3 s', d: 'Gira a lâmina causando 2× de dano num raio de 4 m e empurra os inimigos.' },
  { id: 'w', n: 'Bomba', ic: 'bomb', k: 'W', t: 'Recarga 5 s · gasta 1 bomba', d: 'Lança uma bomba até 12 m de distância. Gasta uma bomba do estoque.' },
  { id: 'e', n: 'Poção', ic: 'potion', k: 'E', t: 'Gasta 1 poção', d: 'Bebe uma poção e recupera 60 de vida. Gasta uma poção do estoque.' },
  { id: 'sp', n: 'Esquiva', ic: 'dash', k: 'ESP', t: 'Recarga 3,5 s', d: 'Rola para o lado e foge do perigo. Na água vira um mergulho; montado não rola.' },
  { id: 'x', n: 'Trocar arma', ic: 'swap', k: 'X', t: 'Sem recarga', d: 'Alterna entre a arma de corpo a corpo e a de fogo.' },
  { id: 'r', n: 'Companheiro', ic: 'paw', k: 'R', t: 'Alterna o modo', d: 'Alterna o companheiro entre só coletar e atacar e coletar.' },
  { id: 't', n: 'Auto combate', ic: 'target', k: 'T', t: 'Liga e desliga', d: 'O personagem luta, coleta e vende sozinho. Ajuste as regras no ⚙ de Ajustes.' },
  { id: 'h', n: 'Montaria', ic: 'boots', k: 'H', t: 'Liga e desliga', d: 'Monta e desmonta. Montado você corre mais, mas não consegue rolar.' },
];
const PASSIVES = [
  { id: 'crit', n: 'Golpe crítico', ic: 'burst', k: '', t: 'Passiva', d: () => '15% de chance de acerto crítico, causando o dobro de dano.' },
  { id: 'dr', n: 'Armadura', ic: 'chest', k: '', t: 'Passiva', d: () => 'A armadura equipada reduz o dano recebido em ' + Math.round((P.dr || 0) * 100) + '%.' },
];

function renderSkills() {
  const all = SKILLS.concat(PASSIVES);
  if (!all.some(x => x.id === selSk)) selSk = 'q';
  const cur = all.find(x => x.id === selSk), ds = typeof cur.d === 'function' ? cur.d() : cur.d;
  const sc = x => '<button class="sc' + (x.id === selSk ? ' sel' : '') + '" data-sk="' + x.id + '" title="' + x.n + '">' + svg(x.ic) + (x.k ? '<kbd>' + x.k + '</kbd>' : '') + '</button>';
  const lk = n => Array.from({ length: n }, () => '<div class="sc lock" title="Em breve">' + svg('lock') + '</div>').join('');
  $('skp').innerHTML = '<h2 class="pt">Habilidades</h2><p class="pts">Pontos de atributo e níveis de habilidade: <b>em breve</b></p>' +
    '<div class="sgrid"><p class="sgh">Ativas</p>' + SKILLS.map(sc).join('') +
    '<p class="sgh">Passivas</p>' + PASSIVES.map(sc).join('') + lk(2) +
    '<p class="sgh">Bloqueadas</p>' + lk(4) + '</div>' +
    '<div class="sdet"><div style="display:flex;gap:10px;align-items:center"><div class="sc">' + svg(cur.ic) + '</div><div style="min-width:0"><div class="nm" style="color:var(--gold-hi)">' + cur.n + '</div><div class="ty">' + (cur.k ? 'Tecla ' + (cur.k === 'ESP' ? 'Espaço' : cur.k) + ' · ' : '') + cur.t + '</div></div></div>' +
    '<p class="ds">' + ds + '</p><button class="btn pri big" disabled>Melhorar · em breve</button></div>' +
    '<div class="pact rst"></div>';
  $('skp').querySelector('.rst').append(rplEl);
  $('skp').querySelectorAll('[data-sk]').forEach(b => { b.onclick = () => { selSk = b.dataset.sk; renderSkills(); }; });
}

/* ---------- Talentos: três ramos de seis nós. Ainda sem regras no jogo, tudo bloqueado. ---------- */
const BRANCH = [['Lâmina', 'sword', '#e8776b'], ['Pólvora', 'gun', '#f0b04a'], ['Mar', 'plank', '#5b9bf0']];
function renderTal() {
  const cur = selTn ? selTn.split(':') : null;
  let h = '<div class="tlh"><h2 class="pt">Talentos</h2><span class="pts">Pontos: <b>0</b></span><button class="btn sm" disabled>Redefinir</button></div><div class="ttree">';
  BRANCH.forEach(([n, ic, col], b) => {
    h += '<div class="tcol" style="--bc:' + col + '"><h3>' + n + '</h3>';
    for (let i = 0; i < 6; i++) h += '<button class="tn' + (selTn === b + ':' + i ? ' sel' : '') + '" data-tn="' + b + ':' + i + '" title="Em breve">' + svg(i % 3 === 2 ? 'lock' : ic) + '<i>0/3</i></button>';
    h += '</div>';
  });
  h += '</div><div class="sdet tdet"><div style="display:flex;gap:10px;align-items:center"><div class="tn" style="' + (cur ? '--bc:' + BRANCH[+cur[0]][2] : '') + '">' + svg(cur ? BRANCH[+cur[0]][1] : 'lock') + '</div><div style="min-width:0"><div class="nm" style="color:var(--gold-hi)">' +
    (cur ? 'Talento de ' + BRANCH[+cur[0]][0] + ' · ' + (+cur[1] + 1) : 'Talentos') + '</div><div class="ty">Bloqueado</div></div></div>' +
    '<p class="ds dim">Os talentos chegam numa próxima versão: cada ramo terá seis nós para evoluir com pontos de personagem.</p><button class="btn pri big" disabled>Aprender · em breve</button></div>';
  $('tlp').innerHTML = h;
  $('tlp').querySelectorAll('[data-tn]').forEach(b => { b.onclick = () => { selTn = b.dataset.tn; renderTal(); }; });
}

function renderPanel() {
  $('pnl').dataset.tab = tab;
  TABS.forEach(([t]) => {
    $('pg-' + t).hidden = tab !== t;
    $('tb-' + t).classList.toggle('on', tab === t);
  });
  if (tab === 'skills') renderSkills();
  if (tab === 'tal') renderTal();
  if (tab === 'qst') renderQuestLog($('qlog'), () => renderPanel());
  if (tab !== 'char') return;

  if (selE && !eq[selE]) selE = '';
  const shown = sel >= 0 && bag[sel] ? bag[sel] : selE ? eq[selE] : null;
  if (shown) showItem(shown); else showPlayer();
  const fill = (el, list) => {
    el.innerHTML = '';
    list.forEach(([id, lb, ic]) => {
      const it = eq[id] || null, d = slot(it, it ? () => pickE(id) : null, lb, ic);
      if (selE === id) d.classList.add('sel');
      if (id === 'arm') mark(d, 'arm', it);
      el.append(d);
    });
  };
  fill($('eqL'), LEFT);
  fill($('eqR'), RIGHT);
  const w = slot(eq.wpn, eq.wpn ? () => pickE('wpn') : null, 'MÃO 1', 'sword');
  const o = slot(eq.off, eq.off ? () => pickE('off') : null, 'MÃO 2', 'hand');
  const g = slot(eq.gun, eq.gun ? () => pickE('gun') : null, 'FOGO', 'gun');
  mark(o, 'off', eq.off); mark(w, 'wpn', eq.wpn); mark(g, 'gun', eq.gun);
  if (!eq.off) o.title = 'Mão 2 livre: aceita outra arma do mesmo tipo (dois machadinhos, duas pistolas)';
  if (P.act === 'wpn') w.classList.add('act');
  if (P.act === 'gun') g.classList.add('act');
  if (selE === 'wpn') w.classList.add('sel'); if (selE === 'off') o.classList.add('sel'); if (selE === 'gun') g.classList.add('sel');
  $('eqW').innerHTML = $('eqG').innerHTML = $('eqF').innerHTML = '';
  $('eqW').append(w); $('eqG').append(o); $('eqF').append(g);

  // mochila: abas Equipamento / Consumíveis / Missão / Materiais
  document.querySelectorAll('#btabs span').forEach(e => e.classList.toggle('on', e.dataset.b === btab));
  const b = $('bag');
  b.innerHTML = '';
  if (btab === 'eq') {
    const st = beltStacks();   // pilhas do cinto ocupam vagas da mochila (depois dos equipamentos)
    for (let i = 0; i < BAG_MAX; i++) {
      const d = slot(bag[i], bag[i] ? () => { sel = sel === i ? -1 : i; selE = ''; renderPanel(); fitPanel(); } : null);
      if (bag[i]) d.dataset.drag = 'bag:' + i;
      else if (st[i - bag.length]) { const s = st[i - bag.length]; const c = consSlot(s.k, s.n, '', 'Cinto: ' + (s.k === 'pot' ? 'poções' : 'bombas') + ' · ocupa 1 vaga da mochila'); b.append(c); continue; }
      b.append(d);
    }
    if (sel >= 0) b.children[sel] && b.children[sel].classList.add('sel');
    $('bcnt').textContent = bagUsed() + '/' + BAG_MAX + (bagFull() ? ' · CHEIA' : '');
    $('bcnt').title = beltSlots() ? 'Cinto ocupa ' + beltSlots() + ' vaga(s)' : '';
    $('bcnt').style.color = bagFull() ? '#ff8a6a' : '';
  } else {
    let n = 0;
    if (btab === 'cons') {   // o que está equipado nos atalhos (poção E, bomba W) e as pilhas de reserva do cinto
      b.append(consSlot('pot', P.pot, 'POÇÃO', 'Poção de vida (tecla E) · pilha de ' + POT_MAX + ' no slot; o resto fica no cinto'));
      b.append(consSlot('bomb', P.bmb, 'BOMBA', 'Bomba (tecla W) · pilha de ' + BOMB_MAX + ' no slot; o resto fica no cinto'));
      beltStacks().forEach(s => b.append(consSlot(s.k, s.n, '', (s.k === 'pot' ? 'Poções' : 'Bombas') + ' no cinto · ocupa 1 vaga da mochila')));
      n = b.children.length;
    }
    for (let i = n; i < BAG_MAX; i++) b.append(slot(null));
    $('bcnt').textContent = btab === 'cons' ? 'Cinto: ' + beltStacks().length : '0/' + BAG_MAX;
    $('bcnt').title = ''; $('bcnt').style.color = '';
  }
  renderStats();
}

/** Abre/fecha o painel */
export function togglePanel() {
  if (isPanelOpen()) closePanel(); else openTab('char');
}

/** Celular: folha que sobe da base (retrato) ou entra pela lateral (paisagem); computador: janela central */
export const MOB = matchMedia('(max-width: 900px), (orientation: portrait), (pointer: coarse) and (max-height: 520px)');
export function fitPanel() {
  fitHotbar();
  const o = !MOB.matches ? 'd' : innerWidth > innerHeight ? 'l' : 'p', h = CFG.hand === 'l' ? 'l' : 'r';
  let any = false;
  ['pnl', 'pnl2'].forEach(id => {
    const el = $(id);
    if (el.style.display !== 'block') return;
    any = true;
    if (el.dataset.o !== o) el.dataset.o = o;
    if (el.dataset.h !== h) el.dataset.h = h;
  });
  $('pbk').style.display = any ? 'block' : 'none';
}

/** Abre o painel do personagem ('char') ou do companheiro ('pets'); clicar de novo no mesmo fecha */
export function openTab(t) {
  const mine = $(t === 'pets' ? 'pnl2' : 'pnl'), other = $(t === 'pets' ? 'pnl' : 'pnl2');
  const wasOpen = mine.style.display === 'block';
  closePanel();
  if (wasOpen) return;
  other.style.display = 'none';
  mine.style.display = 'block';
  fitPanel();
  if (t === 'pets') renderPets(); else { tab = 'char'; renderPanel(); }
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
  $('pbk').style.display = 'none';
  $('acfg').style.display = 'none';   // Esc também fecha os ajustes
}

/** Arrastar a alça fecha a folha (para baixo no retrato, para a borda na paisagem) */
function initSheets() {
  $('pbk').onclick = closePanel;
  document.querySelectorAll('.sheet .grab').forEach(g => {
    const el = g.closest('.sheet');
    let s = null;
    g.addEventListener('pointerdown', e => { s = { x: e.clientX, y: e.clientY, id: e.pointerId, d: 0 }; g.setPointerCapture(e.pointerId); el.classList.add('drag'); });
    g.addEventListener('pointermove', e => {
      if (!s || e.pointerId !== s.id) return;
      const p = el.dataset.o === 'p', dx = e.clientX - s.x;
      s.d = p ? Math.max(0, e.clientY - s.y) : el.dataset.h === 'l' ? Math.min(0, dx) : Math.max(0, dx);
      el.style.transform = p ? 'translateY(' + s.d + 'px)' : 'translateX(' + s.d + 'px)';
    });
    const up = () => {
      if (!s) return;
      const far = Math.abs(s.d) > 90;
      s = null; el.classList.remove('drag'); el.style.transform = '';
      if (far) closePanel();
    };
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  });
}

let rplEl = null;
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
  TABS.forEach(([t, ic, lb]) => { const b = $('tb-' + t); b.innerHTML = svg(ic) + '<span>' + lb + '</span>'; b.onclick = () => setTab(t); });
  rplEl = document.createElement('button'); rplEl.className = 'btn';
  armedButton(rplEl, 'Resetar personagem', resetPlayer);
  initSheets();
  document.querySelectorAll('#btabs span').forEach(e => { e.onclick = () => { btab = e.dataset.b; renderPanel(); fitPanel(); }; });
  $('bsort').onclick = () => { bag.sort((a, c) => c.q - a.q || c.v - a.v); renderPanel(); };
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
  $('acx').onclick = () => { $('acfg').style.display = 'none'; };
  initDrag();
  on('inventory:changed', () => { if ($('pnl').style.display === 'block') renderPanel(); });
  on('pets:changed', () => { if ($('pnl2').style.display === 'block') renderPets(); });
}
