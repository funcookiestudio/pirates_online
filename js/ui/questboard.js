/* Painel do Mural de Missões: cartões por missão, abas com contagem, progresso e recompensa estimada, contratos de dungeon.
   Adaptativo: tela cheia no celular (rolável, com margens seguras), duas colunas em telas largas. */
import { BOARDUI, boardData, boardAct, contractList, setContract, setTrack, pegarCartaz, soltarCartaz } from '../systems/quests.js';

const TIERS = { curta: ['Curta', '#6cc070'], media: ['Média', '#5aa0e0'], longa: ['Longa', '#b07ae0'], epica: ['Épica', '#e0b84a'] };
const TABS = [['open', '📜 Disponíveis'], ['on', '▶ Em andamento'], ['lock', '🔒 Trancadas'], ['done', '✔ Concluídas'], ['ctr', '⚔ Contratos']];
let root = null, tab = 'open', openId = null, after = null;

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inTab = (q, t) => t === 'on' ? q.state === 'on' || q.state === 'ready' : q.state === t;

function build() {
  root = el('div', 'qb-ov');
  root.id = 'qboard';
  root.addEventListener('pointerdown', e => e.stopPropagation());
  root.addEventListener('click', e => { if (e.target === root) close(); });
  document.body.appendChild(root);
  addEventListener('keydown', e => { if (e.key === 'Escape' && root && root.style.display === 'flex') close(); });
}

export function questCard(q, rr = render) {
  const [tn, tc] = TIERS[q.tier], c = el('div', 'qb-card qb-' + q.state + (openId === q.id ? ' open' : ''));
  c.style.setProperty('--tc', tc);
  const pct = q.state === 'done' || q.state === 'ready' ? 100 : q.need > 0 ? Math.min(100, Math.round(100 * q.n / q.need)) : 0;
  const stat = { open: 'Disponível', on: 'Em andamento', ready: 'Pronta para entregar', done: 'Concluída', lock: 'Requer Nv ' + q.lv }[q.state];
  c.innerHTML = '<div class="qb-top"><div class="qb-ttl">' + esc(q.title) + '</div><span class="qb-lv' + (q.state === 'lock' ? ' bad' : '') + '">Nv ' + q.lv + '</span></div>'
    + '<div class="qb-sub">👤 ' + esc(q.giver) + '<span class="qb-tier">' + tn + '</span></div>'
    + '<div class="qb-chips"><span>⭐ ' + q.xp + ' XP</span><span>💰 ' + q.gold + '</span><span class="qb-st">' + stat + '</span></div>'
    + (q.state === 'on' || q.state === 'ready' ? '<div class="qb-bar"><i style="width:' + pct + '%"></i></div>' : '');
  c.addEventListener('click', () => { openId = openId === q.id ? null : q.id; rr(); });
  if (openId === q.id) {
    const d = el('div', 'qb-det');
    d.innerHTML = '<p class="qb-ask">“' + esc(q.ask) + '”</p>'
      + (q.state === 'on' ? '<div class="qb-now"><b>Objetivo' + (q.steps > 1 ? ' (etapa ' + q.step + '/' + q.steps + ')' : '') + ':</b> ' + esc(q.hud) + (q.away ? '<br>⛵ Fica na ' + esc(q.isl) + ': fale com o Capitão Remo, no porto.' : '') + '</div>' : '')
      + (q.state === 'ready' ? '<div class="qb-now"><b>Concluída!</b> ' + (q.mural ? 'Receba a recompensa abaixo.' : 'Volte a ' + esc(q.giver) + ' para receber a recompensa.') + '</div>' : '')
      + (q.reward ? '<div class="qb-rw">🎁 ' + esc(q.reward) + '</div>' : '')
      + '<div class="qb-note">Fazer no manual rende +25% e chance de item extra. Com o auto ligado, a recompensa cai até 40%.</div>';
    if (q.mural && (q.state === 'open' || q.state === 'ready')) {
      const b = el('button', 'qb-btn', q.state === 'ready' ? '🎁 Receber recompensa' : '📜 Aceitar missão');
      b.addEventListener('click', e => { e.stopPropagation(); if (boardAct(q.id)) rr(); });
      d.appendChild(b);
    } else if (q.state === 'open') d.appendChild(el('div', 'qb-hint', 'Fale com ' + esc(q.giver) + ' para aceitar.'));
    if (q.state === 'open') {
      const pb = el('button', 'qb-btn qb-pin' + (q.cartaz ? ' off' : ''), q.cartaz ? '🗑 Soltar cartaz' : '📌 Pegar cartaz');
      pb.addEventListener('click', e => { e.stopPropagation(); if (q.cartaz) soltarCartaz(q.id); else pegarCartaz(q.id); rr(); });
      d.appendChild(pb);
    }
    if (q.state === 'on') {
      const t = el('button', 'qb-btn qb-trk' + (q.tracked ? ' off' : ''), q.tracked ? '📍 Parar de acompanhar' : '📍 Acompanhar no painel');
      t.addEventListener('click', e => { e.stopPropagation(); setTrack(q.tracked ? null : q.id); rr(); });
      d.appendChild(t);
    }
    c.appendChild(d);
  }
  if (q.tracked) c.querySelector('.qb-ttl').insertAdjacentHTML('afterbegin', '📍 ');
  if (q.cartaz && q.state === 'open') c.querySelector('.qb-ttl').insertAdjacentHTML('afterbegin', '📌 ');
  return c;
}

function contracts(list) {
  list.innerHTML = '';
  list.appendChild(el('p', 'qb-intro', 'Um contrato vale para a PRÓXIMA dungeon em que você entrar e se repete quantas vezes quiser. Paga 30% do XP do nível da dungeon e 12× o ouro dos inimigos. Sair da dungeon sem concluir cancela o contrato.'));
  contractList().forEach(c => {
    const e = el('div', 'qb-card qb-open' + (c.on ? ' qb-on' : ''));
    e.style.setProperty('--tc', '#e0b84a');
    e.innerHTML = '<div class="qb-top"><div class="qb-ttl">' + c.ic + ' ' + esc(c.n) + '</div>' + (c.on ? '<span class="qb-lv">Ativo</span>' : '') + '</div><div class="qb-sub">' + esc(c.hint) + '</div>';
    const b = el('button', 'qb-btn' + (c.on ? ' off' : ''), c.on ? '❌ Cancelar contrato' : '✔ Aceitar contrato');
    b.addEventListener('click', ev => { ev.stopPropagation(); setContract(c.on ? null : c.k); render(); });
    e.appendChild(b); list.appendChild(e);
  });
}

function render() {
  if (!root) build();
  const all = boardData(), n = t => all.filter(q => inTab(q, t)).length;
  root.innerHTML = '';
  const pn = el('div', 'qb-panel');
  const hd = el('div', 'qb-hd', '<div><b>📜 Mural de Missões</b><small>' + all.filter(q => q.state === 'done').length + ' de ' + all.length + ' concluídas</small></div>');
  const x = el('button', 'qb-x', '✕'); x.addEventListener('click', close); hd.appendChild(x);
  const tabs = el('div', 'qb-tabs');
  TABS.forEach(([k, lb]) => {
    const b = el('button', 'qb-tab' + (tab === k ? ' on' : ''), lb + (k === 'ctr' ? '' : ' <i>' + n(k) + '</i>'));
    b.addEventListener('click', () => { tab = k; openId = null; render(); }); tabs.appendChild(b);
  });
  const list = el('div', 'qb-list');
  if (tab === 'ctr') contracts(list);
  else {
    const rows = all.filter(q => inTab(q, tab)).sort((a, b) => a.lv - b.lv);
    if (!rows.length) list.appendChild(el('p', 'qb-empty', { open: 'Nenhuma missão nova agora. Suba de nível ou veja as trancadas.', on: 'Você não tem missões em andamento. Fale com um NPC para pegar uma!', lock: 'Nada trancado: você já tem nível para todas.', done: 'Nenhuma concluída ainda.' }[tab]));
    rows.forEach(q => list.appendChild(questCard(q)));
  }
  pn.append(hd, tabs, list); root.appendChild(pn);
}

function close() { if (root) root.style.display = 'none'; if (after) { const f = after; after = null; f(); } }
BOARDUI.open = cb => { after = cb || null; tab = boardData().some(q => q.state === 'open') ? 'open' : 'on'; openId = null; render(); root.style.display = 'flex'; };
