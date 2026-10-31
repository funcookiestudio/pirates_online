/* Auto refil: com o auto combate ligado, quando as poções ou as bombas acabam o jogador vai até o NPC
   (poções: Madame Rum · bombas: Capitã Sal), compra a quantidade configurada e volta a lutar. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { npcByShop } from '../entities/npc.js';
import { PRICE, beltRoom, beltAdd, addItem, bagFull, ammoStack, ammoTotal, LAST, eq } from './inventory.js';
import { ammoInfo, isThrown } from '../data/ammo.js';
import { danger } from './stamina.js';
import { behindWall, npcStand } from './steer.js';
import { TIDY, NEAR } from './town.js';
import { dwell } from './dwell.js';
import { lootText, log } from '../ui/notify.js';
import { inDungeon, dungeonLeavePortal } from '../dungeon/dungeon-scene.js';

/** Quantas unidades de `k` comprar? Conta slot + cinto; compra quando o total cai a `min` ou menos, até `target`; limitada por ouro, vagas e `beltMax` */
function toBuy(k, tot, min, target, price, gold) {
  const c = state.autoCfg;
  if (TIDY.on) min = target;   // arrumação na vila: completa até a meta, mesmo sem ter acabado
  if (!(target > 0 && tot <= min && tot < target && gold >= price)) return 0;
  return Math.max(0, Math.min(target - tot, beltRoom(k, c.beltMax), Math.floor(gold / price)));
}

/** Qual compra falta fazer? { kind: 'tavern' | 'trader', pot, bomb } ou null */
function plan() {
  const c = state.autoCfg, gold = P.gold - c.reserve;
  const np = toBuy('pot', P.pot + P.potR, c.potMin, c.potTarget, PRICE.potTavern, gold);
  if (np > 0) return { kind: 'tavern', pot: np, bomb: 0 };
  const nb = toBuy('bmb', P.bmb + P.bmbR, c.bombMin, c.bombTarget, PRICE.bomb, gold);
  if (nb > 0) return { kind: 'trader', pot: 0, bomb: nb, ammo: 0 };
  // armas de arremesso (finitas): repõe a que o jogador usa
  const w = isThrown(eq.gun) ? eq.gun.w : LAST.w;
  if (w != null && c.ammoTarget > 0) {
    const a = ammoInfo(w), tot = ammoTotal(w), tg = Math.min(c.ammoTarget, a.max);
    const n = Math.min(tg - tot, Math.floor(gold / a.price));
    if ((TIDY.on ? tot < tg : tot <= c.ammoMin) && n > 0 && (ammoStack(w) || !bagFull())) return { kind: 'trader', pot: 0, bomb: 0, ammo: n, aw: w };
  }
  return null;
}

/** Retorna true quando este frame foi usado para ir ao NPC / comprar (o resto do auto fica parado) */
export function refillStep() {
  if (!state.autoCfg.refill) { state.trip = null; TIDY.rb = true; return false; }
  const pl = plan();
  if (!pl || (pl.pot <= 0 && pl.bomb <= 0 && !pl.ammo)) { state.trip = null; state.tripUrgent = false; TIDY.rb = true; return false; }
  // vida baixa e sem nenhuma poção: voltar para comprar é PRIORIDADE, mesmo com inimigo perto (não fica indeciso entre atacar e voltar)
  const urgent = !!pl.pot && P.pot + P.potR <= 0 && (P.hp < P.max * .6 || state.tripUrgent);
  state.tripUrgent = urgent;
  if (!urgent && danger()) return false;                   // inimigo perto: luta primeiro
  // dentro da dungeon o NPC está do outro lado das paredes: primeiro sai pelo portal (o jogo o leva de volta à vila)
  if (inDungeon()) {
    const q = dungeonLeavePortal();
    if (!state.trip) { state.trip = pl.kind; log((urgent ? 'Vida baixa! ' : '') + 'Sem ' + (pl.pot ? 'poções' : pl.bomb ? 'bombas' : 'projéteis') + ': saindo da dungeon pelo portal'); }
    P.tgt = null; P.tx = q.x; P.tz = q.z;
    return true;
  }
  const n = npcByShop(pl.kind);
  if (!n) return false;
  const nx = n.g.position.x, nz = n.g.position.z, d = Math.hypot(P.x - nx, P.z - nz);
  if (!state.trip) { state.trip = pl.kind; log((urgent ? 'Vida baixa! ' : '') + 'Sem ' + (pl.pot ? 'poções' : pl.bomb ? 'bombas' : 'projéteis') + ': indo até ' + n.info.name); }
  if (d < NEAR && !behindWall(P.x, P.z, nx, nz)) {   // (NPC dentro de casa e o jogador fora: não negocia pela parede, entra pela porta)
    P.tgt = null; P.tx = P.x; P.tz = P.z; P.g.rotation.y = Math.atan2(nx - P.x, nz - P.z);
    if (!dwell('buy-' + pl.kind, 2.5)) return true;           // negocia alguns segundos
    dwell(null);
    if (pl.pot) { const n = beltAdd('pot', pl.pot); P.gold -= n * PRICE.potTavern; lootText('+' + n + ' poção(ões)'); }
    if (pl.bomb) { const n = beltAdd('bmb', pl.bomb); P.gold -= n * PRICE.bomb; lootText('+' + n + ' bomba(s)'); }
    if (pl.ammo) { const a = ammoInfo(pl.aw); addItem({ ty: 'wpn', q: 1, wi: pl.aw, ct: pl.ammo, il: P.lv }); P.gold -= pl.ammo * a.price; }
    state.trip = null; state.tripUrgent = false;
    P.tx = P.x; P.tz = P.z;
    return false;
  }
  const f = npcStand(n, P.x, P.z);
  P.tgt = null; P.tx = f.x; P.tz = f.z;
  return true;
}
