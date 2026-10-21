/* Corpos sólidos: jogador e inimigos (e inimigos entre si) não ocupam o mesmo espaço. */
import { enemies } from '../core/registry.js';
import { pushOutOfVillage } from '../world/village.js';
import { P } from '../entities/player.js';

const rad = e => e.t.boss ? 1.1 : .6;

export function separate() {
  pushOutOfVillage(enemies);
  if (P.dead || P.roll > 0) return; // na rolada o jogador passa por cima (esquiva)
  const live = enemies.filter(e => !e.dead);
  for (let pass = 0; pass < 2; pass++) {
    live.forEach(e => {
      // jogador x inimigo: o inimigo cede mais que o jogador
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz), m = .45 + rad(e);
      if (d < m) {
        const k = (m - d) / (d || 1), nx = d ? dx : 1, nz = d ? dz : 0;
        e.x += nx * k * .65; e.z += nz * k * .65;
        P.x -= nx * k * .35; P.z -= nz * k * .35;
      }
    });
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = rad(a) + rad(b);
        if (d < m) {
          const k = (m - d) / (d || 1) / 2, nx = d ? dx : 1, nz = d ? dz : 0;
          a.x -= nx * k; a.z -= nz * k; b.x += nx * k; b.z += nz * k;
        }
      }
    }
  }
}
