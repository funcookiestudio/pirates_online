/* Aba MISSÕES do painel do personagem: resumo, quatro visões (Ativas · Por NPC · Por nível · Concluídas) e cartões interativos. */
import { boardData } from '../systems/quests.js';
import { questCard } from './questboard.js';
import { goFirst, firstLabel } from './questgo.js';
import { questHud, RAT_GOLD } from '../systems/quest.js';
import { state } from '../core/state.js';

const VIEWS = [['act', 'Ativas'], ['done', 'Concluídas']];
let view = 'act';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rank = q => ({ ready: 0, on: 1, open: 2, lock: 3, done: 4 }[q.state]);

export function renderQuestLog(host, rerender) {
  const all = boardData().filter(q => q.taken), n = s => all.filter(q => q.state === s).length;
  const fst = state.quest.st;   // missão inicial: 0..3 em andamento · 4 concluída
  host.innerHTML = '';
  const done = n('done') + (fst >= 4 ? 1 : 0), on = n('on') + (fst < 4 ? 1 : 0), ready = n('ready'), open = n('open');
  const sum = el('div', 'ql-sum', '<div class="ql-st"><b>' + on + '</b><span>em andamento</span></div><div class="ql-st"><b>' + ready + '</b><span>para entregar</span></div><div class="ql-st"><b>' + open + '</b><span>disponíveis</span></div><div class="ql-st"><b>' + done + '/' + (all.length + 1) + '</b><span>concluídas</span></div>');
  const bar = el('div', 'qb-bar ql-all', '<i style="width:' + Math.round(100 * done / Math.max(1, all.length + 1)) + '%"></i>');
  const vs = el('div', 'qb-tabs ql-views');
  VIEWS.forEach(([k, lb]) => { const b = el('button', 'qb-tab' + (view === k ? ' on' : ''), lb); b.onclick = () => { view = k; rerender(); }; vs.appendChild(b); });
  host.append(sum, bar, vs);

  const body = el('div', 'ql-body');
  const cards = (list, box) => list.forEach(q => box.appendChild(questCard(q, rerender)));
  const empty = t => body.appendChild(el('p', 'qb-empty', t));

  /** Missão inicial: sempre a primeira da lista até ser concluída, com o botão de ir sozinho até o próximo passo */
  const firstCard = () => {
    const c = el('div', 'qb-card qb-' + (fst >= 4 ? 'done' : 'on') + ' qb-first');
    c.style.setProperty('--tc', '#e0b84a');
    c.innerHTML = '<div class="qb-top"><div class="qb-ttl">O Rato da Taverna</div><span class="qb-lv">Nv 1</span></div>'
      + '<div class="qb-sub">Mural de Missões · Madame Rum<span class="qb-tier">Inicial</span></div>'
      + '<div class="qb-chips"><span>' + RAT_GOLD + ' ouro</span><span>Companheiro: Rato</span><span class="qb-st">' + (fst >= 4 ? 'Concluída' : 'Em andamento') + '</span></div>'
      + (fst < 4 ? '<div class="qb-bar"><i style="width:' + Math.round(100 * fst / 4) + '%"></i></div><div class="qb-det"><div class="qb-now"><b>Objetivo (etapa ' + (fst + 1) + '/4):</b> ' + (questHud() || '') + '</div></div>' : '');
    if (fst < 4) {
      const gb = el('button', 'qb-btn qb-go', firstLabel());
      gb.addEventListener('click', e => { e.stopPropagation(); goFirst(); });
      c.querySelector('.qb-det').appendChild(gb);
    }
    return c;
  };

  if (view === 'act') {
    const pins = all.filter(q => q.state === 'open' && q.cartaz).sort((a, b) => a.lv - b.lv);
    const list = all.filter(q => q.state === 'on' || q.state === 'ready').sort((a, b) => (b.tracked - a.tracked) || rank(a) - rank(b) || a.lv - b.lv);
    const box = el('div', 'ql-cards');
    if (fst < 4) box.appendChild(firstCard());
    cards(list, box);
    if (box.children.length) body.appendChild(box);
    if (pins.length) {
      body.appendChild(el('div', 'ql-gh', '<div class="ql-gt">Cartazes</div><small>missões que você pegou no Mural · ' + pins.length + '/6</small>'));
      const pb = el('div', 'ql-cards'); cards(pins, pb); body.appendChild(pb);
    }
    if (!box.children.length && !pins.length) empty('Nenhuma missão ativa. Pegue um cartaz no Mural de Missões!');
  } else {
    const list = all.filter(q => q.state === 'done').sort((a, b) => a.lv - b.lv);
    const box = el('div', 'ql-cards');
    if (fst >= 4) box.appendChild(firstCard());
    cards(list, box);
    if (!box.children.length) empty('Nenhuma missão concluída ainda.');
    else body.appendChild(box);
  }
  host.appendChild(body);
}
