/* Painel dos companheiros: seleção do pet e árvore de habilidades. */
import { state } from '../core/state.js';
import { $ } from '../core/utils.js';
import { PETLIST, PSK, FXN, pxn } from '../data/pets.js';
import { PST, pmax } from '../pets/stats.js';
import { showPet } from './preview.js';
import { emit } from '../core/events.js';
import { setPet, unequipPet } from '../pets/manager.js';
import { resetPet, armedButton } from '../systems/reset.js';
import { svg } from './icons.js';

/** Aba da árvore de habilidades em exibição (null = a do companheiro ativo) */
let treeTab = null;
const own = () => PETLIST.filter(x => state.owned[x.id]);   // só aparecem os companheiros que o jogador tem
const curId = () => { const o = own(); return treeTab && o.some(x => x.id === treeTab) ? treeTab : o.some(x => x.id === state.pet.id) ? state.pet.id : o.length ? o[0].id : null; };
let petTab = 'main'; // 'main' (ficha) · 'skills' · 'tal'

/** A árvore exibida é a do companheiro ativo? (para atualizar a barra de XP) */
export const treeShowsActivePet = () => curId() === state.pet.id;

/** Texto dos efeitos de uma habilidade, ex.: "+10% dano por nível" */
function effectText(n) {
  return Object.keys(n.fx).map(k => {
    const v = n.fx[k];
    return '+' + (k === 'mana' ? v + ' mana' : Math.round(v * 100) + '%') + ' ' + FXN[k];
  }).join(', ') + ' por nível';
}

const PL = [['hat', 'CHAPÉU', 'head'], ['neck', 'COLAR', 'amulet'], ['vest', 'COLETE', 'chest'], ['ring1', 'ANEL', 'ring']];
const PR = [['paws', 'PATAS', 'paw'], ['tail', 'CAUDA', 'dash'], ['claw', 'GARRAS', 'hand'], ['ring2', 'ANEL', 'ring']];
const PTABS = [['main', 'paw', 'Ficha'], ['skills', 'burst', 'Habilidades'], ['tal', 'star', 'Talentos']];
let selPs = '';   // nó selecionado na árvore de habilidades

/** Espaço vazio (equipamento de companheiros ainda não existe: reservado para as próximas funções) */
function slot(lb, ic, cls) {
  const d = document.createElement('div');
  d.className = 'sl ' + (ic || lb ? 'ph' : 'empty') + (cls ? ' ' + cls : '');
  d.innerHTML = (ic ? svg(ic) : '') + (lb ? '<u>' + lb + '</u>' : '');
  return d;
}

/** Ficha do companheiro: igual à do personagem (retrato, espaços, cartão, atributos e mochila desligada) */
function renderSheet(id, s, pp) {
  const fill = (el, list) => { el.innerHTML = ''; list.forEach(([, lb, ic]) => el.append(slot(lb, ic))); };
  fill($('peL'), PL);
  fill($('peR'), PR);
  $('peW').innerHTML = $('peG').innerHTML = '';
  $('peW').append(slot('ATAQUE', 'sword'));
  $('peG').append(slot('ACESSÓRIO', 'bag'));
  showPet(id);
  $('ppl').textContent = 'Nv ' + s.lv;
  $('ppn').textContent = pp.n;
  $('pxb').style.width = (s.xp / pxn(s.lv) * 100) + '%';
  const tile = (n, v, sub) => '<div class="stt-i"><small>' + n + '</small><b>' + v + '</b><u>' + sub + '</u></div>';
  $('pstt').innerHTML =
    tile('Ataque', '+' + (s.lv - 1) * 4 + '%', 'Pontos: ' + s.pts) +
    tile('Defesa', 0, 'Equipamento em breve') +
    tile('Vida', pmax(id), Math.ceil(s.hp) + ' atual' + (s.dn > 0 ? ' · ' + Math.ceil(s.dn) + 's' : ''));
  const bag = $('pbag');
  bag.innerHTML = '';
  for (let i = 0; i < 24; i++) bag.append(slot('', ''));
  const active = id === state.pet.id && !state.petOff, u = $('usep');
  u.textContent = active ? 'Desequipar' : 'Usar';
  u.className = 'btn big' + (active ? '' : ' pri');
  u.onclick = active ? () => { unequipPet(); renderPets(); } : () => { treeTab = null; setPet(id); };
  const r = $('rpp');
  r.innerHTML = '<button class="btn big"></button>';
  armedButton(r.firstChild, 'Resetar ' + pp.n, () => resetPet(id));
}

/** Árvore de habilidades do companheiro: três níveis de nós + barra de detalhe com "Aprender" */
function renderTree() {
  const b = $('tree');
  const id = curId(), s = PST[id], pp = PETLIST.find(x => x.id === id), L = PSK[id];
  const state_ = n => {
    const r = s.rk[n.id] || 0, rq = n.req ? L.find(x => x.id === n.req[0]) : null;
    const lk = !!rq && (s.rk[rq.id] || 0) < n.req[1];
    return { r, rq, lk, ok: !lk && s.pts > 0 && r < n.max, max: r >= n.max };
  };
  if (!L.some(n => n.id === selPs)) selPs = L[0].id;
  const cur = L.find(n => n.id === selPs), cs = state_(cur);
  let h = '<div class="tlh"><h2 class="pt">' + pp.n + '</h2><span class="pts">Pontos: <b>' + s.pts + '</b></span></div><div class="ptree" style="--bc:#5b9bf0">';
  [1, 2, 3].forEach(t => {
    h += '<div class="ptier">';
    L.filter(n => n.t === t).forEach(n => {
      const q = state_(n), cls = q.max ? 'max' : q.lk ? '' : q.r > 0 ? 'on' : q.ok ? 'open' : 'wait';
      h += '<button class="tn ' + cls + (n.id === selPs ? ' sel' : '') + '" data-s="' + n.id + '" title="' + n.n + '"><span style="font-size:22px;line-height:1">' + (q.lk ? '🔒' : n.ic) + '</span><i>' + q.r + '/' + n.max + '</i></button>';
    });
    h += '</div>';
  });
  h += '</div><div class="sdet tdet"><div style="display:flex;gap:10px;align-items:center"><div class="tn ' + (cs.lk ? '' : 'on') + '" style="--bc:#5b9bf0"><span style="font-size:22px;line-height:1">' + cur.ic + '</span></div><div style="min-width:0"><div class="nm" style="color:var(--gold-hi)">' + cur.n + '</div><div class="ty">Nível ' + cs.r + ' / ' + cur.max + '</div></div></div>' +
    '<p class="ds">' + effectText(cur) + '</p>' + (cs.lk ? '<p class="ds dim">Requer ' + cs.rq.n + ' ' + cur.req[1] + '</p>' : '') +
    '<p class="hint">O companheiro só ganha XP lutando.</p>' +
    '<button class="btn pri big" id="plearn"' + (cs.ok ? '' : ' disabled') + '>' + (cs.max ? 'Nível máximo' : cs.lk ? 'Bloqueada' : s.pts === 0 ? 'Sem pontos' : 'Aprender') + '</button></div>';
  b.innerHTML = h;
  b.querySelectorAll('[data-s]').forEach(e => { e.onclick = () => { selPs = e.dataset.s; renderTree(); emit('panel:fit'); }; });
  const lb = $('plearn');
  if (lb) lb.onclick = () => {
    if (!cs.ok) return;
    s.pts--;
    s.rk[cur.id] = (s.rk[cur.id] || 0) + 1;
    renderPets();
  };
}

/** Talentos do companheiro: 18 espaços bloqueados, reservados para uma próxima versão */
function renderPetTal() {
  let h = '<div class="tlh"><h2 class="pt">Talentos</h2><span class="pts">Pontos: <b>0</b></span></div><div class="ptal">';
  for (let i = 0; i < 18; i++) h += '<div class="sl ph" title="Em breve">' + svg('lock') + '</div>';
  h += '</div><div class="sdet tdet"><div class="nm" style="color:var(--gold-hi)">Talentos do companheiro</div><p class="ds dim">Chegam numa próxima versão.</p><button class="btn pri big" disabled>Aprender · em breve</button></div>';
  $('ptgrid').innerHTML = h;
}

/** Seletor de companheiros (em linha) + ficha e habilidades do selecionado */
export function renderPets() {
  const id = curId();
  if (!id) {   // nenhum companheiro ainda: ganhe o primeiro numa missão
    $('ppn2').textContent = 'Nenhum companheiro'; $('pdots').innerHTML = '';
    ['main', 'skills', 'tal'].forEach(k => { $('pg-p' + k).hidden = k !== 'main'; $('pt-' + k).classList.toggle('on', k === 'main'); });
    ['peL', 'peR', 'peW', 'peG', 'pstt', 'pbag'].forEach(q => { $(q).innerHTML = ''; });
    $('ppl').textContent = ''; $('ppn').textContent = 'Sem companheiro'; $('pxb').style.width = '0%';
    $('usep').textContent = ''; $('usep').onclick = null; $('rpp').innerHTML = '';
    emit('panel:fit'); return;
  }
  ['main', 'skills', 'tal'].forEach(k => {
    $('pg-p' + k).hidden = petTab !== k;
    $('pt-' + k).classList.toggle('on', petTab === k);
  });
  // frame do modelo: nome em cima, setas e pontos embaixo
  const pe = PETLIST.find(x => x.id === id);
  $('ppn2').textContent = pe.n;
  $('pdots').innerHTML = own().map(x => '<i class="' + (x.id === id ? 'on' : '') + '"></i>').join('');
  if (petTab === 'main') renderSheet(id, PST[id], PETLIST.find(x => x.id === id));
  else if (petTab === 'skills') renderTree();
  else renderPetTal();
  emit('panel:fit');
}

/** Abas do painel do companheiro */
export function initPetPanel() {
  const step = d => () => {
    const o = own(); if (!o.length) return;
    const i = o.findIndex(x => x.id === curId());
    treeTab = o[(i + d + o.length) % o.length].id;
    renderPets();
  };
  PTABS.forEach(([k, ic, lb]) => { $('pt-' + k).innerHTML = svg(ic) + '<span>' + lb + '</span>'; });
  $('pprev').onclick = step(-1);
  $('pnext').onclick = step(1);
  ['main', 'skills', 'tal'].forEach(k => { $('pt-' + k).onclick = () => { petTab = k; renderPets(); }; });
}
