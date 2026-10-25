/* Funções compartilhadas pelos companheiros. */
import { state } from '../core/state.js';
import { enemies, loot } from '../core/registry.js';
import { P } from '../entities/player.js';
import { lootBlocked } from '../systems/inventory.js';
import { PDN } from './stats.js';

/** Há inimigos perto do jogador? (agressivos em até 20 m, ou qualquer um em até 10 m) */
export function inCombat() {
  return enemies.some(e => !e.dead && Math.hypot(e.x - P.x, e.z - P.z) < (e.ag ? 20 : 10));
}

/** O companheiro deve lutar agora? (ataque ligado, jogador vivo, pet acordado e em combate) */
export function petFighting() {
  return state.petAttack && !state.petOff && !P.dead && !PDN() && inCombat();
}

/** Loot mais próximo da posição `p` (somente a menos de 35 m do jogador) */
export function wantLoot(p) {
  let b = null, bd = 1e9;
  loot.forEach(l => {
    if (l.dropped || lootBlocked(l)) return;
    const d = Math.hypot(l.m.position.x - p.x, l.m.position.z - p.z);
    const dp = Math.hypot(l.m.position.x - P.x, l.m.position.z - P.z);
    if (dp < 35 && d < bd) { bd = d; b = l; }
  });
  return b;
}
