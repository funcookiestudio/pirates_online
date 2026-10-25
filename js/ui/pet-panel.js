/* Painel dos companheiros: seleção do pet e árvore de habilidades. */
import { state } from '../core/state.js';
import { $ } from '../core/utils.js';
import { PETLIST, PSK, FXN, pxn } from '../data/pets.js';
import { PST, pmax } from '../pets/stats.js';
import { showPet } from './preview.js';
import { emit } from '../core/events.js';
import { setPet, unequipPet } from '../pets/manager.js';
import { resetPet, armedButton } from '../systems/reset.js';

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

const PL = [['hat', 'CHAPÉU', '🎩'], ['neck', 'COLAR', '📿'], ['vest', 'COLETE', '🦺'], ['ring1', 'ANEL', '💍']];
const PR = [['paws', 'PATAS', '🐾'], ['tail', 'CAUDA', '〰'], ['claw', 'GARRAS', '🦴'], ['ring2', 'ANEL', '💍']];

/** Espaço vazio (equipamento de companheiros ainda não existe: reservado para as próximas funções) */
function slot(lb, ic, cls) {
  const d = document.createElement('div');
  d.className = 'sl ph' + (cls ? ' ' + cls : '');
  d.innerHTML = (ic ? '<em>' + ic + '</em>' : '') + (lb ? '<u>' + lb + '</u>' : '');
  return d;
}

/** Ficha do companheiro: igual à do personagem (retrato, espaços, cartão, atributos e mochila) */
function renderSheet(id, s, pp) {
  const fill = (el, list) => { el.innerHTML = ''; list.forEach(([, lb, ic]) => el.append(slot(lb, ic))); };
  fill($('peL'), PL);
  fill($('peR'), PR);
  $('peW').innerHTML = $('peG').innerHTML = '';
  $('peW').append(slot('ATAQUE', '🗡'));
  $('peG').append(slot('ACESSÓRIO', '🎒'));
  $('pattr').innerHTML = ['💪|FOR', '🏹|DES', '🧠|INT'].map(x => { const [i, n] = x.split('|'); return '<div title="Atributo — em breve"><span>' + i + ' ' + n + '</span><b>—</b></div>'; }).join('');
  showPet(id);
  $('ppl').textContent = 'NÍVEL ' + s.lv;
  $('ppn').textContent = pp.n;
  $('pxb').style.width = (s.xp / pxn(s.lv) * 100) + '%';
  const st = (ic, n, v, sub) => '<div class="st"><i>' + ic + '</i><span>' + n + (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + v + '</b></div>';
  $('pstt').innerHTML =
    st('⚔', 'ATAQUE', '+' + (s.lv - 1) * 4 + '%', 'Pontos de habilidade: ' + s.pts) +
    st('🛡', 'DEFESA', 0, 'Equipamento em breve') +
    st('❤', 'VIDA', pmax(id), 'Atual ' + Math.ceil(s.hp) + (s.dn > 0 ? ' · 💤 ' + Math.ceil(s.dn) + 's' : ''));
  const bag = $('pbag');
  bag.innerHTML = '';
  for (let i = 0; i < 24; i++) bag.append(slot('', ''));
  const active = id === state.pet.id && !state.petOff, u = $('usep');
  u.textContent = active ? 'Desequipar' : 'Usar';
  u.className = 'use' + (active ? ' is' : '');
  u.onclick = active ? () => { unequipPet(); renderPets(); } : () => { treeTab = null; setPet(id); };
  armedButton($('rpp'), 'Resetar ' + pp.n, () => resetPet(id));
}

function renderTree() {
  const b = $('tree');
  const id = curId(), s = PST[id], pp = PETLIST.find(x => x.id === id), L = PSK[id];

  let h = '<div class="bhead" style="text-align:left;margin-top:14px;letter-spacing:2px;font-size:12px;color:#c9a050">HABILIDADES · ' + pp.n.toUpperCase() +
    ' · Pontos: <i style="color:#ffd040;font-style:normal">' + s.pts + '</i></div><small style="opacity:.7">O companheiro só ganha XP lutando.</small>';
  [1, 2, 3].forEach(t => {
    h += '<div class="tr">';
    L.filter(n => n.t === t).forEach(n => {
      const r = s.rk[n.id] || 0;
      const rq = n.req ? L.find(x => x.id === n.req[0]) : null;
      const lk = rq && (s.rk[rq.id] || 0) < n.req[1];       // bloqueada
      const ok = !lk && s.pts > 0 && r < n.max;              // pode evoluir
      h += '<div class="sn' + (ok ? ' ok' : '') + (lk ? ' lk' : '') + '" data-s="' + n.id + '">' +
        '<b>' + n.ic + ' ' + n.n + '</b><i>' + r + '/' + n.max + '</i><small>' + effectText(n) + '</small>' +
        (lk ? '<small>Requer ' + rq.n + ' ' + n.req[1] + '</small>' : '') + '</div>';
    });
    h += '</div>';
  });
  b.innerHTML = h;
  b.querySelectorAll('.sn.ok').forEach(e => {
    e.onclick = () => {
      const n = L.find(x => x.id === e.dataset.s);
      s.pts--;
      s.rk[n.id] = (s.rk[n.id] || 0) + 1;
      renderPets();
    };
  });
}

/** Seletor de companheiros (em linha) + ficha e habilidades do selecionado */
export function renderPets() {
  const id = curId();
  if (!id) {   // nenhum companheiro ainda: ganhe o primeiro numa missão
    $('ppn2').textContent = 'Nenhum companheiro'; $('pdots').innerHTML = '';
    ['main', 'skills', 'tal'].forEach(k => { $('pg-p' + k).hidden = k !== 'main'; $('pt-' + k).classList.toggle('on', k === 'main'); });
    ['peL', 'peR', 'peW', 'peG', 'pattr', 'pstt', 'pbag'].forEach(q => { $(q).innerHTML = ''; });
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
  $('ppn2').textContent = pe.ic + ' ' + pe.n;
  $('pdots').innerHTML = own().map(x => '<i class="' + (x.id === id ? 'on' : '') + '"></i>').join('');
  if (petTab === 'main') renderSheet(id, PST[id], PETLIST.find(x => x.id === id));
  else if (petTab === 'skills') renderTree();
  else {
    const g = $('ptgrid');
    g.innerHTML = '';
    for (let i = 0; i < 18; i++) g.append(slot('', '🔒'));
  }
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
  $('pprev').onclick = step(-1);
  $('pnext').onclick = step(1);
  ['main', 'skills', 'tal'].forEach(k => { $('pt-' + k).onclick = () => { petTab = k; renderPets(); }; });
}
