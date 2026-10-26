/* Auto refil: com o auto combate ligado, quando as poções ou as bombas acabam o jogador vai até o NPC
   (poções: Madame Rum · bombas: Capitã Sal), compra a quantidade configurada e volta a lutar. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { npcByShop } from '../entities/npc.js';
import { PRICE, beltRoom, beltAdd } from './inventory.js';
import { danger } from './stamina.js';
import { behindWall, npcStand } from './steer.js';
import { dwell } from './dwell.js';
import { lootText, log } from '../ui/notify.js';

/** Quantas unidades de `k` comprar? Conta slot + cinto; compra quando o total cai a `min` ou menos, até `target`; limitada por ouro, vagas e `beltMax` */
function toBuy(k, tot, min, target, price, gold) {
  const c = state.autoCfg;
  if (!(target > 0 && tot <= min && tot < target && gold >= price)) return 0;
  return Math.max(0, Math.min(target - tot, beltRoom(k, c.beltMax), Math.floor(gold / price)));
}

/** Qual compra falta fazer? { kind: 'tavern' | 'trader', pot, bomb } ou null */
function plan() {
  const c = state.autoCfg, gold = P.gold - c.reserve;
  const np = toBuy('pot', P.pot + P.potR, c.potMin, c.potTarget, PRICE.potTavern, gold);
  if (np > 0) return { kind: 'tavern', pot: np, bomb: 0 };
  const nb = toBuy('bmb', P.bmb + P.bmbR, c.bombMin, c.bombTarget, PRICE.bomb, gold);
  return nb > 0 ? { kind: 'trader', pot: 0, bomb: nb } : null;
}

/** Retorna true quando este frame foi usado para ir ao NPC / comprar (o resto do auto fica parado) */
export function refillStep() {
  if (!state.autoCfg.refill) { state.trip = null; return false; }
  const pl = plan();
  if (!pl || (pl.pot <= 0 && pl.bomb <= 0)) { state.trip = null; return false; }
  if (danger()) return false;                              // inimigo perto: luta primeiro
  const n = npcByShop(pl.kind);
  if (!n) return false;
  const nx = n.g.position.x, nz = n.g.position.z, d = Math.hypot(P.x - nx, P.z - nz);
  if (!state.trip) { state.trip = pl.kind; log('🛒 Sem ' + (pl.pot ? 'poções' : 'bombas') + ': indo até ' + n.info.name); }
  if (d < 3.2 && !behindWall(P.x, P.z, nx, nz)) {   // (NPC dentro de casa e o jogador fora: não negocia pela parede, entra pela porta)
    P.tgt = null; P.tx = P.x; P.tz = P.z; P.g.rotation.y = Math.atan2(nx - P.x, nz - P.z);
    if (!dwell('buy-' + pl.kind, 2.5)) return true;           // negocia alguns segundos
    dwell(null);
    if (pl.pot) { const n = beltAdd('pot', pl.pot); P.gold -= n * PRICE.potTavern; lootText('+' + n + ' poção(ões)'); }
    if (pl.bomb) { const n = beltAdd('bmb', pl.bomb); P.gold -= n * PRICE.bomb; lootText('+' + n + ' bomba(s)'); }
    state.trip = null;
    P.tx = P.x; P.tz = P.z;
    return false;
  }
  const f = npcStand(n, P.x, P.z);
  P.tgt = null; P.tx = f.x; P.tz = f.z;
  return true;
}
