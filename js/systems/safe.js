/* Áreas seguras: vila, fazendas e porto. Nelas o personagem guarda as armas no coldre e não ataca; a posição é salva só nelas. */
import { VILLAGE_R } from '../core/village-const.js';
import { pois } from '../world/pois.js';
import { FARMSITE } from '../entities/farm-site.js';

export function safeSpot(x, z, village = VILLAGE_R + 1) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (Math.hypot(x, z) < village) return true;
  if ((FARMSITE.sites || []).some(f => Math.hypot(x - f.x, z - f.z) < 17)) return true;
  const po = pois[0]; return !!po && Math.hypot(x - po.x, z - po.z) < 18;
}
