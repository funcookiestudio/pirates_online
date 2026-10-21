/* Golpe do companheiro: dano, crítico, marca, sangramento, atordoamento, área e cura. */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { PL } from '../data/pets.js';
import { P } from '../entities/player.js';
import { hit } from '../systems/combat.js';
import { PV, petXp } from './stats.js';

/**
 * O companheiro ativo acerta o inimigo `e`. `mul` = multiplicador de dano.
 * Retorna true quando o golpe deve ser repetido logo em seguida ("golpe duplo").
 */
export function petStrike(e, mul, o) {
  o = o || {};
  if (!e || e.dead) return false;

  const id = state.pet.id, cr = Math.random() < .08 + PV('crit');
  let d = P.dmg * PL[id] * mul * (1 + PV('dmg'));
  if (cr) d *= 1.8;

  const mk = PV('mark');
  if (mk > 0) { e.mk = 5; e.mkv = mk; }
  e.pa = id;

  hit(e, d, { cr, pet: 1, kn: (o.kn || .5) + PV('knock'), ang: o.ang });
  petXp(id, 1.2 + d * .08);

  const bl = PV('bleed');
  if (bl > 0 && !e.dead) { e.bl = 3; e.bd = Math.max(1, P.dmg * bl); e.bt = .5; }

  const st = PV('stun');
  if (st > 0 && !e.dead && Math.random() < st) e.sn = Math.max(e.sn, e.t.boss ? .35 : 1);

  const sp = PV('splash');
  if (sp > 0) {
    enemies.forEach(z => {
      if (z !== e && !z.dead && Math.hypot(z.x - e.x, z.z - e.z) < 2.6) {
        hit(z, d * sp, { pet: 1, kn: .4, ang: Math.atan2(z.x - e.x, z.z - e.z) });
      }
    });
  }

  P.hp = Math.min(P.max, P.hp + P.max * PV('heal'));
  P.mp = Math.min(P.mmax, P.mp + PV('mana'));
  return Math.random() < PV('multi');
}
