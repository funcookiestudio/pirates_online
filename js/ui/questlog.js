/* Aba MISSÕES do painel do personagem: resumo, quatro visões (Ativas · Por NPC · Por nível · Concluídas) e cartões interativos. */
import { boardData } from '../systems/quests.js';
import { questCard } from './questboard.js';
import * as NP from '../data/npcs.js';

const VIEWS = [['act', '▶ Ativas'], ['npc', '👤 Por NPC'], ['lv', '📊 Por nível'], ['done', '✔ Concluídas']];
const BANDS = [[1, 5, 'Nível 1 a 5 · Iniciante'], [6, 10, 'Nível 6 a 10 · Aventureiro'], [11, 15, 'Nível 11 a 15 · Veterano'], [16, 99, 'Nível 16+ · Lenda']];
let view = 'act';
const ICONS = (() => { const m = {}, add = o => { if (o && o.name && o.ic) m[o.name] = { ic: o.ic, title: o.title || '' }; }; Object.values(NP).forEach(v => Array.isArray(v) ? v.forEach(add) : add(v)); return m; })();
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rank = q => ({ ready: 0, on: 1, open: 2, lock: 3, done: 4 }[q.state]);

export function renderQuestLog(host, rerender) {
  const all = boardData(), n = s => all.filter(q => q.state === s).length;
  host.innerHTML = '';
  const done = n('done'), on = n('on'), ready = n('ready'), open = n('open');
  const sum = el('div', 'ql-sum', '<div class="ql-st"><b>' + on + '</b><span>em andamento</span></div><div class="ql-st"><b>' + ready + '</b><span>para entregar</span></div><div class="ql-st"><b>' + open + '</b><span>disponíveis</span></div><div class="ql-st"><b>' + done + '/' + all.length + '</b><span>concluídas</span></div>');
  const bar = el('div', 'qb-bar ql-all', '<i style="width:' + Math.round(100 * done / Math.max(1, all.length)) + '%"></i>');
  const vs = el('div', 'qb-tabs ql-views');
  VIEWS.forEach(([k, lb]) => { const b = el('button', 'qb-tab' + (view === k ? ' on' : ''), lb); b.onclick = () => { view = k; rerender(); }; vs.appendChild(b); });
  host.append(sum, bar, vs);

  const body = el('div', 'ql-body');
  const cards = (list, box) => list.forEach(q => box.appendChild(questCard(q, rerender)));
  const group = (head, sub, list, pin) => {
    const g = el('section', 'ql-grp'), d = list.filter(q => q.state === 'done').length;
    g.appendChild(el('div', 'ql-gh', '<div class="ql-gt">' + head + '</div><small>' + sub + '</small>' + (pin ? '' : '<span class="qb-lv">' + d + '/' + list.length + '</span>')));
    const box = el('div', 'ql-cards'); cards(list, box); g.appendChild(box); body.appendChild(g);
  };
  const empty = t => body.appendChild(el('p', 'qb-empty', t));

  if (view === 'act') {
    const pins = all.filter(q => q.state === 'open' && q.cartaz).sort((a, b) => a.lv - b.lv);
    if (pins.length) group('📌 Cartazes', 'missões que você pegou no Mural · ' + pins.length + '/6', pins, true);
    const list = all.filter(q => q.state === 'on' || q.state === 'ready').sort((a, b) => (b.tracked - a.tracked) || rank(a) - rank(b) || a.lv - b.lv);
    if (!list.length && !pins.length) empty('Nenhuma missão ativa. Fale com os NPCs ou olhe o Mural de Missões no porto!');
    else if (list.length) { if (pins.length) body.appendChild(el('div', 'ql-gh', '<div class="ql-gt">▶ Em andamento</div>')); const box = el('div', 'ql-cards'); cards(list, box); body.appendChild(box); }
  } else if (view === 'npc') {
    const by = new Map(); all.forEach(q => { if (!by.has(q.giver)) by.set(q.giver, []); by.get(q.giver).push(q); });
    [...by.entries()].sort((a, b) => Math.min(...a[1].map(q => q.lv)) - Math.min(...b[1].map(q => q.lv))).forEach(([name, list]) => {
      const i = ICONS[name] || { ic: '👤', title: '' };
      group(i.ic + ' ' + name, i.title || list.length + (list.length > 1 ? ' missões' : ' missão'), list.sort((a, b) => a.lv - b.lv));
    });
  } else if (view === 'lv') {
    BANDS.forEach(([lo, hi, lb]) => { const list = all.filter(q => q.lv >= lo && q.lv <= hi).sort((a, b) => a.lv - b.lv || rank(a) - rank(b)); if (list.length) group(lb, list.length + (list.length > 1 ? ' missões' : ' missão'), list); });
  } else {
    const list = all.filter(q => q.state === 'done').sort((a, b) => a.lv - b.lv);
    if (!list.length) empty('Nenhuma missão concluída ainda.');
    else { const box = el('div', 'ql-cards'); cards(list, box); body.appendChild(box); }
  }
  host.appendChild(body);
}
