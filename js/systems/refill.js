/* Auto refil: com o auto combate ligado, quando as poções ou as bombas acabam o jogador vai até o NPC
   (poções: Madame Rum · bombas: Capitã Sal), compra a quantidade configurada e volta a lutar. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { npcByShop } from '../entities/npc.js';
import { POT_MAX, BOMB_MAX, PRICE } from './inventory.js';
import { danger } from './stamina.js';
import { behindWall, npcStand } from './steer.js';
import { dwell } from './dwell.js';
import { lootText, log } from '../ui/notify.js';

/** Qual compra falta fazer? { kind: 'tavern' | 'trader', pot, bomb } ou null */
function plan() {
  const c = state.autoCfg, gold = P.gold - c.reserve;
  const needPot = c.potTarget > 0 && P.pot <= c.potMin && P.pot < c.potTarget && gold >= PRICE.potTavern;
  const needBomb = c.bombTarget > 0 && P.bmb <= c.bombMin && P.bmb < c.bombTarget && gold >= PRICE.bomb;
  if (needPot) return { kind: 'tavern', pot: Math.min(POT_MAX, c.potTarget) - P.pot > 0 ? Math.min(Math.min(POT_MAX, c.potTarget) - P.pot, Math.floor(gold / PRICE.potTavern)) : 0, bomb: 0 };
  if (needBomb) return { kind: 'trader', pot: 0, bomb: Math.min(Math.min(BOMB_MAX, c.bombTarget) - P.bmb, Math.floor(gold / PRICE.bomb)) };
  return null;
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
    if (pl.pot) { P.pot += pl.pot; P.gold -= pl.pot * PRICE.potTavern; lootText('+' + pl.pot + ' poção(ões)'); }
    if (pl.bomb) { P.bmb += pl.bomb; P.gold -= pl.bomb * PRICE.bomb; lootText('+' + pl.bomb + ' bomba(s)'); }
    state.trip = null;
    P.tx = P.x; P.tz = P.z;
    return false;
  }
  const f = npcStand(n, P.x, P.z);
  P.tgt = null; P.tx = f.x; P.tz = f.z;
  return true;
}
