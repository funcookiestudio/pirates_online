/* Diálogo com NPCs e loja (comprar / vender). */
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { WEAPONS, RN, AN } from '../data/weapons.js';
import { bag, chest, addItem, bagFull, bagUsed, beltRoom, beltAdd, BAG_MAX, CHEST_MAX, POT_MAX, BOMB_MAX, PRICE, ammoStack } from '../systems/inventory.js';
import { ammoInfo } from '../data/ammo.js';
import { emit } from '../core/events.js';
import { lootText, log } from './notify.js';
import { tierBonus } from '../data/scaling.js';
import { ISLANDS } from '../data/npcs.js';
import { SEED } from '../world/terrain.js';
import { saveGame } from '../systems/save.js';
import { ROOM_PRICE, roomRented, rentRoom, cancelRent, rentDue } from '../world/doors.js';
import { questSay, questButtons } from '../systems/quest.js';
import { questsSay, questsButtons } from '../systems/quests.js';
import { MOUNT, giveHorse, feedHorse, COATS } from '../systems/mount.js';

import { startPet } from '../systems/pet.js';
let cur = null, li = 0, tab = 'buy', stock = [];

const plain = it => it.pot || it.food || it.mat || it.ammo;
const icon = it => it.ic ? it.ic : it.bomb ? '💣' : it.pot ? '🧪' : it.ty === 'wpn' ? (WEAPONS[it.wi != null ? it.wi : it.w].gun ? '🔫' : '⚔') : '🛡';
const val = (ty, q, wi) => Math.round((ty === 'wpn' ? WEAPONS[wi].b : 8) * q * (1 + (P.lv - 1) * .25));
const BUY = 9, SELL = { smith: 4, tavern: 3, trader: 6 };
/* Produtos de cada fazenda: comida que o fazendeiro vende e que se come na hora (recupera vida/mana: frações do máximo) */
const FARM_GOODS = {
  'farm-aves': [{ n: 'Ovos cozidos', ic: '🥚', price: 12, hp: .25 }, { n: 'Caldo de galinha', ic: '🍲', price: 22, hp: .3, mp: .35 }, { n: 'Frango assado', ic: '🍗', price: 34, hp: .6 }, { n: 'Espiga de milho', ic: '🌽', price: 9, hp: .18 }, { n: 'Alface fresca', ic: '🥬', price: 7, hp: .12 }, { n: 'Pão de trigo', ic: '🍞', price: 13, hp: .3 }, { n: 'Couve refogada', ic: '🥗', price: 11, hp: .2, mp: .15 }, { n: 'Sementes de girassol', ic: '🌻', price: 8, hp: .08, mp: .25 }, { mat: 'penas', n: 'Penas (material)', ic: '🪶', price: 8 }],
  'farm-granja': [{ n: 'Batata cozida', ic: '🥔', price: 8, hp: .2 }, { n: 'Cenoura crocante', ic: '🥕', price: 7, hp: .15, mp: .1 }, { n: 'Repolho', ic: '🥬', price: 8, hp: .15 }, { n: 'Tomate maduro', ic: '🍅', price: 9, hp: .18, mp: .1 }, { n: 'Leite fresco', ic: '🥛', price: 14, hp: .2, mp: .3 }, { n: 'Bacon defumado', ic: '🥓', price: 28, hp: .5 }, { n: 'Carne de ovelha assada', ic: '🍖', price: 32, hp: .6 }, { n: 'Manta de lã (aquece e relaxa)', ic: '🧶', price: 26, hp: .15, mp: .6 }],
  'farm-gado': [{ n: 'Leite fresco', ic: '🥛', price: 15, hp: .2, mp: .3 }, { n: 'Queijo curado', ic: '🧀', price: 20, hp: .4 }, { n: 'Bife na brasa', ic: '🥩', price: 36, hp: .7 }, { n: 'Mingau de aveia', ic: '🥣', price: 12, hp: .25, mp: .15 }, { n: 'Pão de cevada', ic: '🍞', price: 11, hp: .25 }, { n: 'Beterraba assada', ic: '🍠', price: 10, hp: .2, mp: .1 }, { mat: 'couro', n: 'Couro curtido (material)', ic: '🐂', price: 18 }]
};

function makeStock(kind) {
  if (kind === 'smith') {
    const s = [];
    WEAPONS.forEach((w, wi) => (!w.lv || w.shop) && !w.thrown && [1, 2].forEach(q => s.push({ ty: 'wpn', q, wi, price: val('wpn', q, wi) * BUY })));
    [1, 2, 3].forEach(q => s.push({ ty: 'arm', q, wi: 0, price: val('arm', q, 0) * BUY }));
    return s;
  }
  if (FARM_GOODS[kind]) return FARM_GOODS[kind].map(g => ({ food: g.mat ? 0 : 1, ...g, desc: g.mat ? 'Material de artesanato · você tem ' + P[g.mat] : '+' + Math.round(g.hp * 100) + '% vida' + (g.mp ? ' · +' + Math.round(g.mp * 100) + '% mana' : '') + ' · consumo imediato' }));
  if (kind === 'herbs') return [
    { pot: 1, n: 'Poção de vida (da Ysolde)', price: Math.max(1, Math.round(PRICE.potTavern * .8)), desc: 'Recupera vida (tecla E) · pilhas de ' + POT_MAX + ' (o resto vai para o cinto)' },
    { food: 1, ic: '🍵', n: 'Chá de camomila', price: 14, hp: .3, mp: .2, desc: '+30% vida · +20% mana · bebe na hora' },
    { food: 1, ic: '🌿', n: 'Tônico de hortelã', price: 18, hp: .1, mp: .6, desc: '+10% vida · +60% mana · bebe na hora' },
    { food: 1, ic: '🧴', n: 'Unguento de arnica', price: 30, hp: .55, desc: '+55% vida · bebe na hora' },
    { food: 1, ic: '🧪', n: 'Elixir de sangue-de-dragão', price: 52, hp: 1, mp: .5, desc: '+100% vida · +50% mana · bebe na hora' },
  ];
  const s = [{ pot: 1, n: 'Poção de vida', price: kind === 'tavern' ? PRICE.potTavern : PRICE.potTrader, desc: 'Recupera vida (tecla E) · pilhas de ' + POT_MAX + ' (o resto vai para o cinto)' }];
  if (kind === 'trader') WEAPONS.forEach((w, wi) => {   // armas de arremesso: vendidas em pacotes de projéteis (finitos)
    if (!w.thrown || w.lv > P.lv + 4) return;
    const a = ammoInfo(wi);
    s.push({ ammo: 1, ic: '🎯', wi, q: 1, n: w.n + ' ×' + a.pack, price: a.price * a.pack, desc: 'Arremesso · ' + a.pack + ' unid. (pilha de até ' + a.max + ') · ' + Math.round(a.brk * 100) + '% de quebra' + (a.consume ? ' · uso único' : ' · o que não quebra cai no chão') });
  });
  if (kind === 'trader') s.push({ pot: 1, bomb: 1, n: 'Bomba', price: PRICE.bomb, desc: 'Explosão em área (tecla W) · pilhas de ' + BOMB_MAX + ' (o resto vai para o cinto)' });
  return s;
}

const itemName = it => plain(it) ? it.n : it.ty === 'wpn' ? WEAPONS[it.wi].n : AN[it.q - 1];
const stat = it => plain(it) ? it.desc : '+' + val(it.ty, it.q, it.wi) + (it.ty === 'wpn' ? ' dano' : ' vida');

function renderChest() {
  $('shgd').textContent = '🎒 ' + bagUsed() + '/' + BAG_MAX + ' · 📦 ' + chest.length + '/' + CHEST_MAX;
  $('shb').textContent = 'RETIRAR DO BAÚ';
  $('shs').textContent = 'GUARDAR NO BAÚ';
  $('shb').classList.toggle('on', tab === 'buy');
  $('shs').classList.toggle('on', tab === 'sell');
  const box = $('shl');
  box.innerHTML = '';
  const from = tab === 'buy' ? chest : bag, to = tab === 'buy' ? bag : chest, max = tab === 'buy' ? BAG_MAX : CHEST_MAX, cnt = tab === 'buy' ? bagUsed() : chest.length;   // (o cinto ocupa vagas da mochila)
  if (!from.length) box.innerHTML = '<p class="shn">' + (tab === 'buy' ? 'O baú está vazio.' : 'Sua mochila de equipamentos está vazia.') + '</p>';
  from.forEach((it, i) => {
    const r = document.createElement('div');
    r.className = 'shr r' + it.q;
    r.innerHTML = '<i>' + icon(it) + '</i><span>' + it.n + '<small>' + RN[it.q] + ' · +' + it.v + '</small></span>';
    const b = document.createElement('button');
    b.textContent = tab === 'buy' ? 'Retirar' : 'Guardar';
    b.disabled = cnt >= max;
    b.title = b.disabled ? (tab === 'buy' ? 'Mochila cheia' : 'Baú cheio') : '';
    b.onclick = () => { if (cnt >= max) return; to.push(from.splice(i, 1)[0]); emit('inventory:changed'); renderChest(); };
    r.append(b);
    box.append(r);
  });
}

function renderShop() {
  if (cur.chest) { renderChest(); return; }
  $('shb').textContent = 'COMPRAR';
  $('shs').textContent = 'VENDER';
  $('shgd').textContent = '💰 ' + P.gold + (FARM_GOODS[cur.shop] ? ' · 🪶 ' + P.penas + ' · 🐂 ' + P.couro : '');
  $('shb').classList.toggle('on', tab === 'buy');
  $('shs').classList.toggle('on', tab === 'sell');
  const box = $('shl');
  box.innerHTML = '';
  const k = cur.shop;
  if (tab === 'buy') {
    stock.forEach(it => {
      const r = document.createElement('div');
      r.className = 'shr' + (plain(it) ? '' : ' r' + it.q);
      r.innerHTML = '<i>' + icon(it) + '</i><span>' + itemName(it) + '<small>' + (plain(it) ? stat(it) : RN[it.q] + ' · ' + stat(it)) + '</small></span>';
      const b = document.createElement('button');
      b.textContent = '💰 ' + it.price;
      const full = it.mat ? false : it.food ? (P.hp >= P.max && (!it.mp || P.mp >= P.mmax)) : it.bomb ? beltRoom('bmb') <= 0 : it.pot ? beltRoom('pot') <= 0 : it.ammo ? (!ammoStack(it.wi) && bagFull()) : bagFull();
      b.disabled = P.gold < it.price || full;
      if (full) b.title = it.food ? 'Você já está satisfeito' : it.pot ? 'Cinto cheio: sem vagas na mochila' : 'Mochila cheia';
      b.onclick = () => {
        if (P.gold < it.price || full) return;
        P.gold -= it.price;
        if (it.mat) { P[it.mat]++; lootText('+1 ' + it.n); }
        else if (it.food) { P.hp = Math.min(P.max, P.hp + P.max * it.hp); if (it.mp) P.mp = Math.min(P.mmax, P.mp + P.mmax * it.mp); lootText(it.ic + ' ' + it.n); log(it.ic + ' Comeu: ' + it.n); }
        else if (it.ammo) { addItem({ ty: 'wpn', q: 1, wi: it.wi, ct: ammoInfo(it.wi).pack, il: P.lv }); }
        else if (it.bomb) { beltAdd('bmb', 1); lootText('+ bomba'); }
        else if (it.pot) { beltAdd('pot', 1); lootText('+ poção'); } else addItem({ ty: it.ty, q: it.q, wi: it.wi });
        renderShop();
      };
      r.append(b);
      box.append(r);
    });
  } else if (FARM_GOODS[k]) {
    // o fazendeiro só recompra o material da própria fazenda (metade do preço)
    const g = FARM_GOODS[k].find(x => x.mat);
    box.innerHTML = '<p class="shn">Só compro ' + g.n.replace(' (material)', '').toLowerCase() + ' — o resto eu mesmo produzo.</p>';
    const r = document.createElement('div');
    r.className = 'shr';
    r.innerHTML = '<i>' + g.ic + '</i><span>' + g.n + '<small>Você tem ' + P[g.mat] + '</small></span>';
    const bt = document.createElement('button');
    bt.textContent = '+ 💰 ' + Math.floor(g.price / 2);
    bt.disabled = P[g.mat] <= 0;
    bt.onclick = () => { if (P[g.mat] <= 0) return; P[g.mat]--; P.gold += Math.floor(g.price / 2); renderShop(); };
    r.append(bt);
    box.append(r);
  } else if (k !== 'smith') {
    // taverna e mercadora só compram o que vendem: poções
    const price = k === 'tavern' ? 12 : k === 'herbs' ? 14 : 16;
    const r = document.createElement('div');
    r.className = 'shr r1';
    r.innerHTML = '<i>🧪</i><span>Poção de vida<small>Você tem ' + (P.pot + P.potR) + ' · só compro poções</small></span>';
    const b = document.createElement('button');
    b.textContent = '+ 💰 ' + price;
    b.disabled = P.pot + P.potR <= 0;
    b.onclick = () => { if (P.pot + P.potR <= 0) return; if (P.potR > 0) P.potR--; else P.pot--; P.gold += price; renderShop(); };
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

const HORSE_COST = 120;
function say(txt) { $('dtx').textContent = txt; }

/** Caixa do gato: acariciar ou sair */
export function openPetBox(cat) {
  openDialog({ name: cat.A.dog ? 'Cachorro' : 'Gato', title: cat.A.dog ? 'Cachorro da fazenda' : cat.A.variant === 'preto' ? 'Gato preto' : 'Gatinho', ic: cat.A.dog ? '🐶' : '🐱', petCat: cat, lines: [cat.A.dog ? 'Au! (ele abana o rabo, todo feliz com a visita)' : 'Miau... (ele te olha de olhos semicerrados e se aproxima devagar)'] });
}

function buttons() {
  const b = $('dbt');
  b.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.onclick = f; b.append(x); };
  if (cur.petCat) {
    add('🤚 Acariciar', () => { const c = cur.petCat; closeDialog(); startPet(c); });
    add('Sair', closeDialog);
    return;
  }
  [...questButtons(cur), ...questsButtons(cur)].forEach(([t, f]) => add(t, () => f(say, buttons)));   // botões da missão em andamento
  if (cur.stable) {
    COATS.forEach((k, i) => {
      if (MOUNT.owned && i <= MOUNT.coat) return;
      const price = MOUNT.owned ? k.cost - COATS[MOUNT.coat].cost / 2 : k.cost;
      add('🐴 ' + (MOUNT.owned ? 'Trocar por cavalo ' : 'Comprar cavalo ') + k.n + ' · ' + price + ' ouro', () => {
        if (P.gold < price) { say('Faltam moedas, marujo! O ' + k.n + ' custa ' + price + ' de ouro.'); return; }
        P.gold -= price; giveHorse(i); saveGame();
        say('Negócio fechado! Ele é seu (' + k.n + ': mais rápido e com mais fôlego). Assobie com a tecla H.'); buttons();
      });
    });
    if (MOUNT.owned) add('🥕 Dar ração ao cavalo · 15 ouro', () => {
      if (P.gold < 15) { say('Ração custa 15 de ouro, marujo.'); return; }
      P.gold -= 15; feedHorse(); say('Bem alimentado! Fôlego cheio e recupera rápido por um tempo.');
    });
  }
  if (cur.chest) add('📦 Abrir baú', openShop);
  if (cur.shop) add(cur.shop === 'smith' ? '⚒ Ver mercadoria' : FARM_GOODS[cur.shop] ? '🧺 Produtos da fazenda' : '🛒 Ver mercadoria', openShop);
  if (cur.shop === 'tavern' && !roomRented()) add('🛏 Alugar quarto (' + ROOM_PRICE + ' ouro por dia)', () => {
    if (P.gold < ROOM_PRICE) { say('Faltam moedas, marujo! A diária do quarto é ' + ROOM_PRICE + ' de ouro.'); return; }
    P.gold -= ROOM_PRICE; rentRoom(); log('🛏 Quarto alugado: diária de ' + ROOM_PRICE + ' ouro, cobrada a cada dia'); say('Aqui está a chave! Dois quartos do andar de cima são seus (os outros são do Mestre Breu e da Polly). Cobro ' + ROOM_PRICE + ' de ouro por dia, e se quiser sair é só devolver a chave.'); buttons();
  });
  if (cur.shop === 'tavern' && roomRented()) add('🔑 Devolver a chave (cancelar aluguel)', () => {
    cancelRent(); log('🔑 Chave devolvida: aluguel cancelado'); say('Certo, marujo! Quarto liberado, sem mais cobranças. Volte quando precisar!'); buttons();
  });
  if (cur.shop === 'tavern') add('🍺 Descansar (grátis)', () => { P.hp = P.max; P.mp = P.mmax; log('🍺 Você descansa na taverna: vida e mana restauradas'); say('Pronto, marujo! Novinho em folha. Volte sempre!'); });
  if (cur.ferry) ISLANDS.forEach(i => {
    if (i.seed === SEED) return;
    add('⛵ ' + i.name + ' · Nv ' + (1 + tierBonus(i.tier)) + '+' + (i.cost ? ' · ' + i.cost + ' ouro' : ''), () => {
      if (P.gold < i.cost) { say('Sem ouro, sem viagem, marujo! Volte com ' + i.cost + ' moedas.'); return; }
      P.gold -= i.cost;
      try { localStorage.setItem('pirata-ilha', i.seed); localStorage.setItem('pirata-chegada', '1'); } catch (e) { /* sem armazenamento */ }
      saveGame();
      say('Icem a vela! Rumo à ' + i.name + '...');
      setTimeout(() => { const u = new URL(location.href); u.searchParams.delete('seed'); location.assign(u.toString()); }, 900);   // (tira o ?seed= da aba Mapa, senão ele venceria a ilha escolhida)
    });
  });
  add(cur.board ? '📜 Próximo cartaz' : '💬 Conversar', () => { li = (li + 1) % cur.lines.length; say(cur.lines[li]); });
  add('Até logo', closeDialog);
}

export function openDialog(info) {
  cur = info;
  li = Math.floor(Math.random() * info.lines.length);
  const qs = questSay(info) || questsSay(info);
  $('dic').textContent = info.ic;
  $('dnm').textContent = info.name;
  $('dtt').textContent = info.title;
  say(qs || info.lines[li]);
  buttons();
  closeShop();
  $('dlg').style.display = 'block';
}

function openShop() {
  tab = 'buy';
  stock = cur.chest ? [] : makeStock(cur.shop);
  $('shic').textContent = cur.ic + ' ' + cur.name;
  $('shop').style.display = 'block';
  $('dlg').style.display = 'none';   // com a loja aberta, o painel de diálogo some
  renderShop();
}

function closeShop() { $('shop').style.display = 'none'; if (cur) $('dlg').style.display = 'block'; }

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
