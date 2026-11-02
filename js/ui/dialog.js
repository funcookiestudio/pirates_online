/* Diálogo com NPCs e loja (comprar / vender). */
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { WEAPONS, RN, AN } from '../data/weapons.js';
import { bag, chest, addItem, bagFull, bagUsed, beltRoom, beltAdd, BAG_MAX, CHEST_MAX, POT_MAX, BOMB_MAX, PRICE, ammoStack } from '../systems/inventory.js';
import { ammoInfo, QUIVER, QUIVER_MAX } from '../data/ammo.js';
import { emit } from '../core/events.js';
import { lootText, log } from './notify.js';
import { islandBonus } from '../data/scaling.js';
import { ISLANDS } from '../data/npcs.js';
import { medusaKilled } from '../core/isle.js';
import { SEED } from '../world/terrain.js';
import { saveGame } from '../systems/save.js';
import { ROOM_PRICE, roomRented, rentRoom, cancelRent, rentDue } from '../world/doors.js';
import { questSay, questButtons } from '../systems/quest.js';
import { questsSay, questsButtons } from '../systems/quests.js';
import './questboard.js';
import { MOUNT, giveHorse, feedHorse, COATS } from '../systems/mount.js';
import { VEH, VKIND, PAINTS, PAINT_COST, giveVehicle, setUse, activeVeh, repaintCoach } from '../systems/vehicle.js';

import { startPet } from '../systems/pet.js';
import { BOND, info, animalName, hearts, heartStr, STAGES, adopted, adopt, rec, petsLeft, canFeed, TREATS, PET_MAX } from '../systems/bond.js';
import { applyAdoptions, setPet, petPos } from '../pets/manager.js';
import { speak, stopSpeech, initNarrator } from '../systems/narrator.js';
let cur = null, li = 0, tab = 'buy', stock = [];

const plain = it => it.pot || it.food || it.mat || it.treat || it.ammo || it.quiver;
const icon = it => it.ic ? it.ic : it.bomb ? '💣' : it.pot ? '🧪' : it.ty === 'wpn' ? (WEAPONS[it.wi != null ? it.wi : it.w].gun ? '🔫' : '⚔') : '🛡';
const val = (ty, q, wi) => Math.round((ty === 'wpn' ? WEAPONS[wi].b : 8) * q * (1 + (P.lv - 1) * .25));
const BUY = 9, SELL = { smith: 4, tavern: 3, trader: 6 };
/* Produtos de cada fazenda: comida que o fazendeiro vende e que se come na hora (recupera vida/mana: frações do máximo) */
const FARM_GOODS = {
  'farm-aves': [{ n: 'Ovos cozidos', ic: '🥚', price: 12, hp: .25 }, { n: 'Caldo de galinha', ic: '🍲', price: 22, hp: .3, mp: .35 }, { n: 'Frango assado', ic: '🍗', price: 34, hp: .6 }, { n: 'Espiga de milho', ic: '🌽', price: 9, hp: .18 }, { n: 'Alface fresca', ic: '🥬', price: 7, hp: .12 }, { n: 'Pão de trigo', ic: '🍞', price: 13, hp: .3 }, { n: 'Couve refogada', ic: '🥗', price: 11, hp: .2, mp: .15 }, { n: 'Sementes de girassol', ic: '🌻', price: 8, hp: .08, mp: .25 }, { mat: 'penas', n: 'Penas (material)', ic: '🪶', price: 8 }],
  'farm-granja': [{ n: 'Batata cozida', ic: '🥔', price: 8, hp: .2 }, { n: 'Cenoura crocante', ic: '🥕', price: 7, hp: .15, mp: .1 }, { n: 'Repolho', ic: '🥬', price: 8, hp: .15 }, { n: 'Tomate maduro', ic: '🍅', price: 9, hp: .18, mp: .1 }, { n: 'Leite fresco', ic: '🥛', price: 14, hp: .2, mp: .3 }, { n: 'Bacon defumado', ic: '🥓', price: 28, hp: .5 }, { n: 'Carne de ovelha assada', ic: '🍖', price: 32, hp: .6 }, { n: 'Manta de lã (aquece e relaxa)', ic: '🧶', price: 26, hp: .15, mp: .6 }, { treat: 'osso', n: 'Osso com carne (petisco)', ic: '🐾', price: 6 }],
  'farm-gado': [{ n: 'Leite fresco', ic: '🥛', price: 15, hp: .2, mp: .3 }, { n: 'Queijo curado', ic: '🧀', price: 20, hp: .4 }, { n: 'Bife na brasa', ic: '🥩', price: 36, hp: .7 }, { n: 'Mingau de aveia', ic: '🥣', price: 12, hp: .25, mp: .15 }, { n: 'Pão de cevada', ic: '🍞', price: 11, hp: .25 }, { n: 'Beterraba assada', ic: '🍠', price: 10, hp: .2, mp: .1 }, { mat: 'couro', n: 'Couro curtido (material)', ic: '🐂', price: 18 }, { treat: 'osso', n: 'Osso com carne (petisco)', ic: '🐾', price: 6 }]
};

function makeStock(kind) {
  if (kind === 'smith') {
    const s = [];
    WEAPONS.forEach((w, wi) => (!w.lv || w.shop) && !w.thrown && [1, 2].forEach(q => s.push({ ty: 'wpn', q, wi, price: val('wpn', q, wi) * BUY })));
    [1, 2, 3].forEach(q => s.push({ ty: 'arm', q, wi: 0, price: val('arm', q, 0) * BUY }));
    s.push({ quiver: 'arrows', pack: QUIVER.arrows.pack, ic: '🏹', n: 'Flechas ×' + QUIVER.arrows.pack, price: QUIVER.arrows.price, desc: 'Munição de arco · você tem ' + P.arrows }, { quiver: 'bolts', pack: QUIVER.bolts.pack, ic: '🏹', n: 'Virotes ×' + QUIVER.bolts.pack, price: QUIVER.bolts.price, desc: 'Munição de besta · você tem ' + P.bolts });
    return s;
  }
  if (FARM_GOODS[kind]) return FARM_GOODS[kind].map(g => ({ food: g.mat || g.treat ? 0 : 1, ...g, desc: g.treat ? 'Petisco para cães e gatos (vínculo) · você tem ' + P[g.treat] : g.mat ? 'Material de artesanato · você tem ' + P[g.mat] : '+' + Math.round(g.hp * 100) + '% vida' + (g.mp ? ' · +' + Math.round(g.mp * 100) + '% mana' : '') + ' · consumo imediato' }));
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
  if (kind === 'tavern') s.push({ treat: 'peixe', ic: '🐾', n: 'Peixe seco (petisco)', price: 6, desc: 'Petisco para gatos e cães (vínculo) · você tem ' + P.peixe });
  if (kind === 'trader') s.push({ pot: 1, bomb: 1, n: 'Bomba', price: PRICE.bomb, desc: 'Explosão em área (tecla W) · pilhas de ' + BOMB_MAX + ' (o resto vai para o cinto)' });
  return s;
}

const itemName = it => plain(it) ? it.n : it.ty === 'wpn' ? WEAPONS[it.wi].n : AN[it.q - 1];
const stat = it => plain(it) ? it.desc : '+' + val(it.ty, it.q, it.wi) + (it.ty === 'wpn' ? ' dano' : ' vida');

function renderChest() {
  $('shgd').textContent = '🎒 ' + bagUsed() + '/' + BAG_MAX + ' · ' + chest.length + '/' + CHEST_MAX;
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
  $('shgd').textContent = '💰 ' + P.gold + (FARM_GOODS[cur.shop] ? ' · ' + P.penas + ' · ' + P.couro : '');
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
      const full = it.quiver ? P[it.quiver] >= QUIVER_MAX : it.mat || it.treat ? false : it.food ? (P.hp >= P.max && (!it.mp || P.mp >= P.mmax)) : it.bomb ? beltRoom('bmb') <= 0 : it.pot ? beltRoom('pot') <= 0 : it.ammo ? (!ammoStack(it.wi) && bagFull()) : bagFull();
      b.disabled = P.gold < it.price || full;
      if (full) b.title = it.food ? 'Você já está satisfeito' : it.pot ? 'Cinto cheio: sem vagas na mochila' : 'Mochila cheia';
      b.onclick = () => {
        if (P.gold < it.price || full) return;
        P.gold -= it.price;
        if (it.quiver) { P[it.quiver] = Math.min(QUIVER_MAX, P[it.quiver] + it.pack); lootText('+ ' + it.pack + ' ' + (it.quiver === 'arrows' ? 'flechas' : 'virotes')); stock = makeStock(cur.shop); }
        else if (it.mat) { P[it.mat]++; lootText('+1 ' + it.n); }
        else if (it.treat) { P[it.treat]++; lootText(it.ic + ' +1 ' + TREATS[it.treat].n); stock = makeStock(cur.shop); }
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
    if (!g) { box.innerHTML = '<p class="shn">Não compro nada — aqui tudo é produzido na granja.</p>'; return; }   // (a granja não tem material para recomprar)
    box.innerHTML = '<p class="shn">Só compro ' + g.n.replace(' (material)', '').toLowerCase() + ' — o resto eu mesmo produzo.</p>';
    const r = document.createElement('div');
    r.className = 'shr';
    r.innerHTML = '<i>' + g.ic + '</i><span>' + g.n + '<small>Você tem ' + P[g.mat] + '</small></span>';
    const bt = document.createElement('button');
    bt.textContent = '+ ' + Math.floor(g.price / 2);
    bt.disabled = P[g.mat] <= 0;
    bt.onclick = () => { if (P[g.mat] <= 0) return; P[g.mat]--; P.gold += Math.floor(g.price / 2); renderShop(); };
    r.append(bt);
    box.append(r);
  } else if (k !== 'smith') {
    // taverna e mercadora só compram o que vendem: poções
    const price = k === 'tavern' ? 12 : k === 'herbs' ? 14 : 16;
    const r = document.createElement('div');
    r.className = 'shr r1';
    r.innerHTML = '<i></i><span>Poção de vida<small>Você tem ' + (P.pot + P.potR) + ' · só compro poções</small></span>';
    const b = document.createElement('button');
    b.textContent = '+ ' + price;
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
      b.textContent = '+ ' + price;
      b.onclick = () => { bag.splice(i, 1); P.gold += price; emit('inventory:changed'); renderShop(); };
      r.append(b);
      box.append(r);
    });
  }
}

const HORSE_COST = 120;
function say(txt) { $('dtx').textContent = txt; speak(txt, cur && cur.name); }

/** Caixa do bicho (gatos e cachorros da ilha, ou o seu cachorro/gato adotado): carinho, petisco e adoção (bond.js) */
export function openPetBox(cat) {
  const id = cat.bid, inf = info(id), dog = inf.kind === 'dog', mine = adopted(id), h = hearts(id), r = rec(id);
  const SAY = dog
    ? ['Grrr... (ele te observa de longe, desconfiado)', 'Au? (ele cheira sua mão, curioso)', 'Au! Au! (ele abana o rabo, feliz com a visita)', 'Au! (ele pula em volta de você, todo animado)', 'Auuu! (ele encosta a cabeça na sua perna)', 'Au! (ele te olha como quem diz: me leva com você?)']
    : ['Miau... (ele te olha de olhos semicerrados, sem se aproximar)', 'Miau? (ele se aproxima devagar e cheira sua mão)', 'Mrrr... (ele ronrona e se esfrega no seu pé)', 'Miau! (ele vem te seguindo, de rabo erguido)', 'Prrr... (ele se joga no chão e mostra a barriga)', 'Miau! (ele te olha como quem diz: me leva com você?)'];
  let line = mine ? (r.b < 20 ? (dog ? 'Hmpf... (ele vira a cara: está emburrado e quer atenção)' : 'Hss... (ele vira as costas: está emburrado e quer atenção)') : SAY[Math.max(2, h)]) : SAY[h];
  if (!BOND.hint) {   // primeira vez: explica o sistema
    BOND.hint = true;
    line = 'Dica: acaricie (conta até ' + PET_MAX + 'x por dia) e dê um petisco (1x por dia: peixe seco na Taverna, osso nas fazendas) para ganhar a confiança dele. Com 5 corações você pode adotá-lo como companheiro: um cachorro e um gato.';
  }
  const title = (mine ? 'Seu companheiro · humor ' + Math.round(r.b) + '%' : STAGES[h]) + ' · ' + heartStr(id);
  openDialog({ name: animalName(id), title, ic: dog ? '🐶' : '🐱', petCat: cat, lines: [line] });
}

function petButtons(add) {
  const c = cur.petCat, id = c.bid, inf = info(id), left = petsLeft(id);
  add('Acariciar' + (left ? '' : ' (hoje já basta)'), () => { closeDialog(); startPet(c); });
  [inf.fav, inf.fav === 'peixe' ? 'osso' : 'peixe'].forEach(t => {
    const why = canFeed(id, t, P), T = TREATS[t];
    const b = add('Dar ' + T.n.toLowerCase() + ' (' + (P[t] || 0) + ')' + (why ? ' · ' + why : ''), () => { if (canFeed(id, t, P)) return; closeDialog(); startPet(c, t); });
    b.disabled = !!why;
  });
  if (!adopted(id) && hearts(id) >= 5) {
    const k = inf.kind, prev = BOND.adopt[k];
    add('Adotar' + (prev ? ' (' + animalName(prev) + ' volta para casa)' : ''), () => {
      const back = adopt(id);
      applyAdoptions();
      setPet(k);
      const p = petPos(); p.x = c.x; p.z = c.z;   // o companheiro sai de onde o bicho estava
      closeDialog();
      log('🏠 ' + animalName(id) + ' agora é seu companheiro! (painel P)' + (back ? ' · ' + animalName(back) + ' voltou para casa' : ''));
      saveGame();
    });
  }
  add('Sair', closeDialog);
}

function buttons() {
  const b = $('dbt');
  b.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.onclick = f; b.append(x); return x; };
  if (cur.petCat) { petButtons(add); return; }
  [...questButtons(cur), ...questsButtons(cur)].forEach(([t, f]) => add(t, () => f(say, buttons)));   // botões da missão em andamento
  if (cur.stable) {
    COATS.forEach((k, i) => {
      if (MOUNT.owned && i <= MOUNT.coat) return;
      const price = MOUNT.owned ? k.cost - COATS[MOUNT.coat].cost / 2 : k.cost;
      add('🐴 ' + (MOUNT.owned ? 'Trocar por cavalo ' : 'Comprar cavalo ') + k.n + ' · ' + price + ' ouro', () => {
        if (P.gold < price) { say('Faltam moedas, marujo! O ' + k.n + ' custa ' + price + ' de ouro.'); return; }
        P.gold -= price; giveHorse(i); setUse(null); saveGame();
        say('Negócio fechado! Ele é seu (' + k.n + ': mais rápido e com mais fôlego). Assobie com a tecla H.'); buttons();
      });
    });
    if (MOUNT.owned) add('Dar ração ao cavalo · 15 ouro', () => {
      if (P.gold < 15) { say('Ração custa 15 de ouro, marujo.'); return; }
      P.gold -= 15; feedHorse(); say('Bem alimentado! Fôlego cheio e recupera rápido por um tempo.');
    });
    // carroça e carruagem (vehicle.js): já vêm com os cavalos; a tecla H passa a chamar o veículo comprado
    Object.keys(VKIND).forEach(k => {
      const v = VKIND[k];
      if (VEH.own[k]) return;
      add('🛞 Comprar ' + v.n + ' · ' + v.cost + ' ouro', () => {
        if (P.gold < v.cost) { say('Faltam moedas, marujo! A ' + v.n + ' custa ' + v.cost + ' de ouro.'); return; }
        P.gold -= v.cost; giveVehicle(k); saveGame();
        say(k === 'cart' ? 'Negócio fechado! A carroça é sua, com um cavalo manso nos varais. Chame com a tecla H; sobe na boleia e conduz clicando no chão.'
          : 'Negócio fechado! A carruagem é sua, com a parelha de cavalos e lugar para passageiros. Chame com a tecla H; faz curvas mais abertas, cuidado!'); buttons();
      });
    });
    const rides = [MOUNT.owned && [null, 'o cavalo'], VEH.own.cart && ['cart', 'a carroça'], VEH.own.coach && ['coach', 'a carruagem']].filter(Boolean);
    if (rides.length > 1) rides.forEach(([k, n]) => {
      if (k === activeVeh() || (!k && !activeVeh())) return;
      add('Usar ' + n + ' (tecla H)', () => { setUse(k); saveGame(); say('Certo! A tecla H agora chama ' + n + '.'); buttons(); });
    });
    if (VEH.own.coach) {
      const nx = PAINTS[(VEH.paint + 1) % PAINTS.length][0];
      add('🎨 Pintar a carruagem de ' + nx + ' · ' + PAINT_COST + ' ouro', () => {
        if (P.gold < PAINT_COST) { say('A pintura custa ' + PAINT_COST + ' de ouro, marujo.'); return; }
        P.gold -= PAINT_COST; repaintCoach(); saveGame(); say('Pintura nova, cor de ' + nx + '! Ficou um brinco.'); buttons();
      });
    }
  }
  if (cur.chest) add('Abrir baú', openShop);
  if (cur.shop) add(cur.shop === 'smith' ? 'Ver mercadoria' : FARM_GOODS[cur.shop] ? 'Produtos da fazenda' : 'Ver mercadoria', openShop);
  if (cur.shop === 'tavern' && !roomRented()) add('Alugar quarto (' + ROOM_PRICE + ' ouro por dia)', () => {
    if (P.gold < ROOM_PRICE) { say('Faltam moedas, marujo! A diária do quarto é ' + ROOM_PRICE + ' de ouro.'); return; }
    P.gold -= ROOM_PRICE; rentRoom(); log('Quarto alugado: diária de ' + ROOM_PRICE + ' ouro, cobrada a cada dia'); say('Aqui está a chave! Dois quartos do andar de cima são seus (os outros são do Mestre Breu e da Polly). Cobro ' + ROOM_PRICE + ' de ouro por dia, e se quiser sair é só devolver a chave.'); buttons();
  });
  if (cur.shop === 'tavern' && roomRented()) add('Devolver a chave (cancelar aluguel)', () => {
    cancelRent(); log('Chave devolvida: aluguel cancelado'); say('Certo, marujo! Quarto liberado, sem mais cobranças. Volte quando precisar!'); buttons();
  });
  if (cur.shop === 'tavern') add('Descansar (grátis)', () => { P.hp = P.max; P.mp = P.mmax; log('Você descansa na taverna: vida e mana restauradas'); say('Pronto, marujo! Novinho em folha. Volte sempre!'); });
  if (cur.ferry) ISLANDS.forEach(i => {
    if (i.seed === SEED || (i.needsMedusa && !medusaKilled())) return;
    add('⛵ ' + i.name + ' · Nv ' + (1 + islandBonus(i.seed)) + '+' + (i.cost ? ' · ' + i.cost + ' ouro' : ''), () => {
      if (P.gold < i.cost) { say('Sem ouro, sem viagem, marujo! Volte com ' + i.cost + ' moedas.'); return; }
      P.gold -= i.cost;
      try { localStorage.setItem('pirata-ilha', i.seed); localStorage.setItem('pirata-chegada', '1'); } catch (e) { /* sem armazenamento */ }
      saveGame();
      say('Icem a vela! Rumo à ' + i.name + '...');
      setTimeout(() => { const u = new URL(location.href); u.searchParams.delete('seed'); location.assign(u.toString()); }, 900);   // (tira o ?seed= da aba Mapa, senão ele venceria a ilha escolhida)
    });
  });
  add(cur.board ? 'Próximo cartaz' : 'Conversar', () => { li = (li + 1) % cur.lines.length; say(cur.lines[li]); });
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
  if (cur && cur.petCat) cur.petCat.want = false;   // saiu da caixa do bicho: ele volta a passear (o cachorro/gato adotado volta a seguir)
  cur = null; stopSpeech();
  $('dlg').style.display = 'none';
  closeShop();
}

export const dialogOpen = () => !!cur;

export function initDialog() {
  initNarrator();
  const sp = document.createElement('button'); sp.id = 'dsp'; sp.title = 'Ouvir a fala de novo'; sp.textContent = '🔊';
  $('dx').before(sp); sp.onclick = () => speak($('dtx').textContent, cur && cur.name, true);
  $('dx').onclick = closeDialog;
  $('shx').onclick = closeShop;
  $('shb').onclick = () => { tab = 'buy'; renderShop(); };
  $('shs').onclick = () => { tab = 'sell'; renderShop(); };
}
