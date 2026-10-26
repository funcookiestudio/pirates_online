/* Vendas e baú automáticos: com a mochila cheia (limite configurável), o auto vai ao Ferreiro vender o que não presta
   e ao baú guardar o que vale a pena, e volta a lutar. Regras: qualidade ≥ storeMin → guarda no baú · qualidade ≤ sellMax → vende. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { bag, chest, CHEST_MAX, bagUsed } from './inventory.js';
import { npcByShop, npcChest } from '../entities/npc.js';
import { danger } from './stamina.js';
import { behindWall, npcStand } from './steer.js';
import { emit } from '../core/events.js';
import { dwell } from './dwell.js';
import { lootText, log } from '../ui/notify.js';

const SELL_MUL = 4; // preço de venda no ferreiro = valor × 4 (igual ao diálogo)
let active = false;

const toStore = () => { const c = state.autoCfg; return c.storeMin ? bag.filter(it => it.q >= c.storeMin) : []; };
const toSell = () => { const c = state.autoCfg; return c.sellMax ? bag.filter(it => it.q <= c.sellMax && !(c.storeMin && it.q >= c.storeMin)) : []; };

function goTo(n, kind) {
  const nx = n.g.position.x, nz = n.g.position.z, d = Math.hypot(P.x - nx, P.z - nz);
  if (d < 3.2 && !behindWall(P.x, P.z, nx, nz)) return true;   // (NPC dentro de casa e o jogador fora: entra pela porta)
  const f = npcStand(n, P.x, P.z);
  const now = performance.now();
  if (!state.trip && now - (goTo.last || -1e9) > 45000) { goTo.last = now; log(kind === 'sell' ? '💰 Mochila cheia: indo vender ao ferreiro' : '📦 Indo guardar itens no baú'); }
  state.trip = kind; P.tgt = null; P.tx = f.x; P.tz = f.z;
  return false;
}

/** true = este frame foi usado para ir ao ferreiro/baú */
export function townStep() {
  const c = state.autoCfg;
  if ((!c.sellMax && !c.storeMin)) { active = false; return false; }
  const sell = toSell(), store = toStore().slice(0, Math.max(0, CHEST_MAX - chest.length));
  if (!sell.length && !store.length) { active = false; if (state.trip === 'sell' || state.trip === 'chest') state.trip = null; return false; }
  if (!active && bagUsed() < c.bagAt) return false;
  active = true;
  if (danger()) return false;                       // inimigo perto: luta primeiro
  if (sell.length) {
    const n = npcByShop('smith');
    if (!n) { active = false; return false; }
    if (!goTo(n, 'sell')) return true;
    P.g.rotation.y = Math.atan2(n.g.position.x - P.x, n.g.position.z - P.z);
    if (!dwell('sell', 3)) { P.tx = P.x; P.tz = P.z; return true; }
    dwell(null);
    let gold = 0;
    sell.forEach(it => { gold += Math.max(1, Math.round(it.v * SELL_MUL)); bag.splice(bag.indexOf(it), 1); });
    P.gold += gold; emit('inventory:changed');
    lootText('+' + gold + ' ouro (' + sell.length + ' itens vendidos)'); log('💰 Vendeu ' + sell.length + ' item(ns) por ' + gold + ' ouro');
    state.trip = null; P.tx = P.x; P.tz = P.z;
    return false;
  }
  const n = npcChest();
  if (!n) { active = false; return false; }
  if (!goTo(n, 'chest')) return true;
  n.forceOpen = true;                              // abre o baú (animação da tampa), sem painel
  P.g.rotation.y = Math.atan2(n.g.position.x - P.x, n.g.position.z - P.z);
  if (!dwell('chest', 3.5)) { P.tx = P.x; P.tz = P.z; return true; }
  dwell(null);
  setTimeout(() => { n.forceOpen = false; }, 900);  // fecha logo depois de guardar
  store.forEach(it => { bag.splice(bag.indexOf(it), 1); chest.push(it); });
  emit('inventory:changed');
  lootText(store.length + ' itens no baú'); log('📦 Guardou ' + store.length + ' item(ns) no baú');
  state.trip = null; P.tx = P.x; P.tz = P.z; active = false;
  return false;
}
