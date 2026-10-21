/* Minimapa isométrico circular (canvas 2D), centrado no jogador. */
import { enemies, loot, props } from '../core/registry.js';
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';

const SIZE = 140, C = SIZE / 2, S = 2.6; // tamanho do canvas, centro e escala (px por metro)

/** Converte posição do mundo (x,z) em ponto do minimapa */
const pt = (wx, wz) => {
  const dx = wx - P.x, dz = wz - P.z;
  return [C + (dx - dz) * .7071 * S, C + (dx + dz) * .7071 * S];
};

export function drawMinimap() {
  const g = $('mm').getContext('2d');
  g.clearRect(0, 0, SIZE, SIZE);
  g.save();
  g.beginPath();
  g.arc(C, C, C, 0, 6.28);
  g.clip();
  g.fillStyle = '#0a1014';
  g.fillRect(0, 0, SIZE, SIZE);

  // ilha
  const o = pt(0, 0);
  g.fillStyle = '#1c3a26';
  g.beginPath();
  g.arc(o[0], o[1], 60 * S, 0, 6.28);
  g.fill();

  // árvores e pedras
  props.forEach(p => {
    const q = pt(p.position.x, p.position.z);
    g.fillStyle = '#2e5a3a';
    g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
  });

  // loot
  g.fillStyle = '#ffd040';
  loot.forEach(l => {
    const q = pt(l.m.position.x, l.m.position.z);
    g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
  });

  // inimigos (boss em magenta)
  enemies.forEach(z => {
    if (z.dead) return;
    const q = pt(z.x, z.z);
    g.fillStyle = z.t.boss ? '#ff40ff' : '#e03030';
    g.beginPath();
    g.arc(q[0], q[1], z.t.boss ? 4 : 2.5, 0, 6.28);
    g.fill();
  });

  // jogador
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(C, C, 3.5, 0, 6.28);
  g.fill();
  g.restore();
}
