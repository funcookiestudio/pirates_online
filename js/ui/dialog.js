/* Diálogo com NPCs e loja (comprar / vender). */
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { WEAPONS, RN, AN } from '../data/weapons.js';
import { bag, chest, addItem, bagFull, BAG_MAX, CHEST_MAX, POT_MAX, BOMB_MAX, PRICE } from '../systems/inventory.js';
import { emit } from '../core/events.js';
import { lootText, log } from './notify.js';
import { tierBonus } from '../data/scaling.js';
import { ISLANDS } from '../data/npcs.js';
import { SEED } from '../world/terrain.js';
import { saveGame } from '../systems/save.js';

let cur = null, li = 0, tab = 'buy', stock = [];

const icon = it => it.bomb ? '💣' : it.pot ? '🧪' : it.ty === 'wpn' ? (WEAPONS[it.wi != null ? it.wi : it.w].gun ? '🔫' : '⚔') : '🛡';
const val = (ty, q, wi) => Math.round((ty === 'wpn' ? WEAPONS[wi].b : 8) * q * (1 + (P.lv - 1) * .25));
const BUY = 9, SELL = { smith: 4, tavern: 3, trader: 6 };

function makeStock(kind) {
  if (kind === 'smith') {
    const s = [];
    WEAPONS.forEach((w, wi) => [1, 2].forEach(q => s.push({ ty: 'wpn', q, wi, price: val('wpn', q, wi) * BUY })));
    [1, 2, 3].forEach(q => s.push({ ty: 'arm', q, wi: 0, price: val('arm', q, 0) * BUY }));
    return s;
  }
  const s = [{ pot: 1, n: 'Poção de vida', price: kind === 'tavern' ? PRICE.potTavern : PRICE.potTrader, desc: 'Recupera vida (tecla E) · leva até ' + POT_MAX }];
  if (kind === 'trader') s.push({ pot: 1, bomb: 1, n: 'Bomba', price: PRICE.bomb, desc: 'Explosão em área (tecla W) · leva até ' + BOMB_MAX });
  return s;
}

const itemName = it => it.pot ? it.n : it.ty === 'wpn' ? WEAPONS[it.wi].n : AN[it.q - 1];
const stat = it => it.pot ? it.desc : '+' + val(it.ty, it.q, it.wi) + (it.ty === 'wpn' ? ' dano' : ' vida');

function renderChest() {
  $('shgd').textContent = '🎒 ' + bag.length + '/' + BAG_MAX + ' · 📦 ' + chest.length + '/' + CHEST_MAX;
  $('shb').textContent = 'RETIRAR DO BAÚ';
  $('shs').textContent = 'GUARDAR NO BAÚ';
  $('shb').classList.toggle('on', tab === 'buy');
  $('shs').classList.toggle('on', tab === 'sell');
  const box = $('shl');
  box.innerHTML = '';
  const from = tab === 'buy' ? chest : bag, to = tab === 'buy' ? bag : chest, max = tab === 'buy' ? BAG_MAX : CHEST_MAX;
  if (!from.length) box.innerHTML = '<p class="shn">' + (tab === 'buy' ? 'O baú está vazio.' : 'Sua mochila de equipamentos está vazia.') + '</p>';
  from.forEach((it, i) => {
    const r = document.createElement('div');
    r.className = 'shr r' + it.q;
    r.innerHTML = '<i>' + icon(it) + '</i><span>' + it.n + '<small>' + RN[it.q] + ' · +' + it.v + '</small></span>';
    const b = document.createElement('button');
    b.textContent = tab === 'buy' ? 'Retirar' : 'Guardar';
    b.disabled = to.length >= max;
    b.title = b.disabled ? (tab === 'buy' ? 'Mochila cheia' : 'Baú cheio') : '';
    b.onclick = () => { if (to.length >= max) return; to.push(from.splice(i, 1)[0]); emit('inventory:changed'); renderChest(); };
    r.append(b);
    box.append(r);
  });
}

function renderShop() {
  if (cur.chest) { renderChest(); return; }
  $('shb').textContent = 'COMPRAR';
  $('shs').textContent = 'VENDER';
  $('shgd').textContent = '💰 ' + P.gold;
  $('shb').classList.toggle('on', tab === 'buy');
  $('shs').classList.toggle('on', tab === 'sell');
  const box = $('shl');
  box.innerHTML = '';
  const k = cur.shop;
  if (tab === 'buy') {
    stock.forEach(it => {
      const r = document.createElement('div');
      r.className = 'shr' + (it.pot ? '' : ' r' + it.q);
      r.innerHTML = '<i>' + icon(it) + '</i><span>' + itemName(it) + '<small>' + (it.pot ? stat(it) : RN[it.q] + ' · ' + stat(it)) + '</small></span>';
      const b = document.createElement('button');
      b.textContent = '💰 ' + it.price;
      const full = it.bomb ? P.bmb >= BOMB_MAX : it.pot ? P.pot >= POT_MAX : bagFull();
      b.disabled = P.gold < it.price || full;
      if (full) b.title = it.pot ? 'Você já leva o máximo' : 'Mochila cheia';
      b.onclick = () => {
        if (P.gold < it.price || full) return;
        P.gold -= it.price;
        if (it.bomb) { P.bmb++; lootText('+ bomba'); }
        else if (it.pot) { P.pot++; lootText('+ poção'); } else addItem({ ty: it.ty, q: it.q, wi: it.wi });
        renderShop();
      };
      r.append(b);
      box.append(r);
    });
  } else if (k !== 'smith') {
    // taverna e mercadora só compram o que vendem: poções
    const price = k === 'tavern' ? 12 : 16;
    const r = document.createElement('div');
    r.className = 'shr r1';
    r.innerHTML = '<i>🧪</i><span>Poção de vida<small>Você tem ' + P.pot + ' · só compro poções</small></span>';
    const b = document.createElement('button');
    b.textContent = '+ 💰 ' + price;
    b.disabled = P.pot <= 0;
    b.onclick = () => { if (P.pot <= 0) return; P.pot--; P.gold += price; renderShop(); };
    r.append(b);
    box.append(r);
  } else {
    if (!bag.length) box.innerHTML = '<p class="shn">Só compro armas e armaduras — sua mochila está vazia.</p>';
    bag.forEach((it, i) => {
      const price = Math.max(1, Math.round(it.v * SELL[k]));
      const r = document.createElement('div');
      r.className = 'shr r' + it.q;
      r.innerHTML = '<i>' + icon(it) + '</i><span>' + it.n + '<small>' + RN[it.q] + ' · +' + it.v + '</small></span>';
      const b = document.createElement('button');
      b.textContent = '+ 💰 ' + price;
      b.onclick = () => { bag.splice(i, 1); P.gold += price; emit('inventory:changed'); renderShop(); };
      r.append(b);
      box.append(r);
    });
  }
}

function say(txt) { $('dtx').textContent = txt; }

function buttons() {
  const b = $('dbt');
  b.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.onclick = f; b.append(x); };
  if (cur.chest) add('📦 Abrir baú', openShop);
  if (cur.shop) add(cur.shop === 'smith' ? '⚒ Ver mercadoria' : '🛒 Ver mercadoria', openShop);
  if (cur.shop === 'tavern') add('🍺 Descansar (grátis)', () => { P.hp = P.max; P.mp = P.mmax; log('🍺 Você descansa na taverna: vida e mana restauradas'); say('Pronto, marujo! Novinho em folha. Volte sempre!'); });
  if (cur.ferry) ISLANDS.forEach(i => {
    if (i.seed === SEED) return;
    add('⛵ ' + i.name + ' · Nv ' + (1 + tierBonus(i.tier)) + '+' + (i.cost ? ' · ' + i.cost + ' ouro' : ''), () => {
      if (P.gold < i.cost) { say('Sem ouro, sem viagem, marujo! Volte com ' + i.cost + ' moedas.'); return; }
      P.gold -= i.cost;
      try { localStorage.setItem('pirata-ilha', i.seed); localStorage.setItem('pirata-chegada', '1'); } catch (e) { /* sem armazenamento */ }
      saveGame();
      say('Icem a vela! Rumo à ' + i.name + '...');
      setTimeout(() => location.reload(), 900);
    });
  });
  add(cur.board ? '📜 Próximo cartaz' : '💬 Conversar', () => { li = (li + 1) % cur.lines.length; say(cur.lines[li]); });
  add('Até logo', closeDialog);
}

export function openDialog(info) {
  cur = info;
  li = Math.floor(Math.random() * info.lines.length);
  $('dic').textContent = info.ic;
  $('dnm').textContent = info.name;
  $('dtt').textContent = info.title;
  say(info.lines[li]);
  buttons();
  closeShop();
  $('dlg').style.display = 'block';
}

function openShop() {
  tab = 'buy';
  stock = cur.chest ? [] : makeStock(cur.shop);
  $('shic').textContent = cur.ic + ' ' + cur.name;
  $('shop').style.display = 'block';
  renderShop();
}

function closeShop() { $('shop').style.display = 'none'; }

export function closeDialog() {
  cur = null;
  $('dlg').style.display = 'none';
  closeShop();
}

export const dialogOpen = () => !!cur;

export function initDialog() {
  $('dx').onclick = closeDialog;
  $('shx').onclick = closeShop;
  $('shb').onclick = () => { tab = 'buy'; renderShop(); };
  $('shs').onclick = () => { tab = 'sell'; renderShop(); };
}
