/* Auto refil: com o auto combate ligado, quando as poções ou as bombas acabam o jogador vai até o NPC
   (poções: Madame Rum · bombas: Capitã Sal), compra a quantidade configurada e volta a lutar. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { npcByShop } from '../entities/npc.js';
import { POT_MAX, BOMB_MAX, PRICE } from './inventory.js';
import { danger } from './stamina.js';
import { freePoint } from './steer.js';
import { lootText, log } from '../ui/notify.js';

/** Qual compra falta fazer? { kind: 'tavern' | 'trader', pot, bomb } ou null */
function plan() {
  const q = state.autoCfg.buyQty;
  const needPot = P.pot <= 0 && P.gold >= PRICE.potTavern, needBomb = P.bmb <= 0 && P.gold >= PRICE.bomb;
  if (needPot) return { kind: 'tavern', pot: Math.min(POT_MAX - P.pot, q, Math.floor(P.gold / PRICE.potTavern)), bomb: 0 };
  if (needBomb) return { kind: 'trader', pot: 0, bomb: Math.min(BOMB_MAX - P.bmb, q, Math.floor(P.gold / PRICE.bomb)) };
  return null;
}

/** Retorna true quando este frame foi usado para ir ao NPC / comprar (o resto do auto fica parado) */
export function refillStep() {
  if (!state.autoCfg.refill || state.seek || state.autoRest || state.clearing) { state.trip = null; return false; }
  const pl = plan();
  if (!pl) { state.trip = null; return false; }
  if (danger()) return false;                              // inimigo perto: luta primeiro
  const n = npcByShop(pl.kind);
  if (!n) return false;
  const nx = n.g.position.x, nz = n.g.position.z, d = Math.hypot(P.x - nx, P.z - nz);
  if (!state.trip) { state.trip = pl.kind; log('🛒 Sem ' + (pl.pot ? 'poções' : 'bombas') + ': indo até ' + n.info.name); }
  if (d < 3.2) {
    if (pl.pot) { P.pot += pl.pot; P.gold -= pl.pot * PRICE.potTavern; lootText('+' + pl.pot + ' poção(ões)'); }
    if (pl.bomb) { P.bmb += pl.bomb; P.gold -= pl.bomb * PRICE.bomb; lootText('+' + pl.bomb + ' bomba(s)'); }
    state.trip = null;
    P.tx = P.x; P.tz = P.z;
    return false;
  }
  const dx = P.x - nx, dz = P.z - nz, k = 2.2 / (d || 1), f = freePoint(nx + dx * k, nz + dz * k, .6);
  P.tgt = null; P.tx = f.x; P.tz = f.z;
  return true;
}
