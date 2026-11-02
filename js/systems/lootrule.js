/* Regras do que o auto coleta: tipo (ouro, poção, arma, armadura), raridade mínima, "só se for melhor que o equipado"
   e, com a mochila quase cheia (a partir do limite de ir à vila), só o que vale mais que o pior item guardado. */
import { state } from '../core/state.js';
import { WEAPONS } from '../data/weapons.js';
import { bag, eq, pickSlot, bagUsed } from './inventory.js';
import { P } from '../entities/player.js';
import { activeChar } from '../core/chars.js';

/** O item caído `l` como item de mochila (valor e nível calculados como em addItem) */
export function lootAsItem(l) {
  if (l.it) return l.it;
  const v = Math.round((l.ty === 'wpn' ? WEAPONS[l.wi].b : 8) * l.q * (1 + ((l.il || 1) - 1) * .2));
  return { ty: l.ty, q: l.q, v, il: l.il || 1, w: l.wi, n: l.ty === 'wpn' ? WEAPONS[l.wi].n : '' };
}

/** O auto quer este item caído? (o liga/desliga geral "Coletar loot" é conferido por quem procura; aqui só o filtro) */
export function lootFilter(l) {
  const c = state.autoCfg;
  if (l.ty === 'gold') return c.lootGold;
  if (l.ty === 'pot') return c.lootPot;
  if (l.ty === 'head') return true;
  if (l.ty === 'quiver') return !!(WEAPONS[eq.gun && eq.gun.w] && (l.qk === 'bolts' ? WEAPONS[eq.gun.w].xbow : WEAPONS[eq.gun.w].bow)) || P[l.qk] < 20;   // só junta se usa a arma (ou a aljava está quase vazia)
  if (l.ammo) return true;   // projétil que caiu: sempre recolhe
  const w = l.ty === 'wpn';
  if (!(w ? c.lootWpn : c.lootArm) || l.q < (w ? c.lootWpnQ : c.lootArmQ)) return false;
  if (w && WEAPONS[l.wi].cls && WEAPONS[l.wi].cls !== (activeChar() || {}).k) return false;   // arma de outra classe (arco, cajado…): o auto não recolhe
  const it = lootAsItem(l);
  if (c.lootUpgrade && !pickSlot(it, true)) return false;
  if (bag.length && bagUsed() >= c.bagAt && it.v <= Math.min(...bag.map(b => b.v))) return false;
  return true;
}
