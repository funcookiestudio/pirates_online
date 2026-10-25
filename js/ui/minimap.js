/* Minimapa isométrico circular (canvas 2D), centrado no jogador. */
import { enemies, loot, props } from '../core/registry.js';
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { terrainImage } from '../world/terrain-mesh.js';
import { VX, VZ } from '../world/terrain.js';
import { N } from '../world/islandgen.js';
import { pois } from '../world/pois.js';
import { DG, dIn, dCell } from '../dungeon/dgrid.js';
import { dungeonMarks } from '../dungeon/dungeon-scene.js';

let IMG = null;
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

  const inD = dIn(P.x, P.z);
  const k = .7071 * S;
  if (inD) {
    // dungeon: só as células já exploradas (névoa), portais e baús conhecidos
    g.save();
    g.transform(k, k, -k, k, C - (P.x - P.z) * k, C - (P.x + P.z) * k);
    const R = 15, ci = Math.floor((P.x - DG.ox) / DG.C), cj = Math.floor((P.z - DG.oz) / DG.C);
    for (let j = Math.max(0, cj - R); j <= Math.min(DG.H - 1, cj + R); j++) for (let i = Math.max(0, ci - R); i <= Math.min(DG.W - 1, ci + R); i++) {
      const c = j * DG.W + i;
      if (DG.grid[c] && DG.seen[c]) { g.fillStyle = '#4a4658'; g.fillRect(DG.ox + i * DG.C, DG.oz + j * DG.C, DG.C + .05, DG.C + .05); }
    }
    g.restore();
    dungeonMarks().forEach(m => { const q = pt(m.x, m.z); g.fillStyle = m.c; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); });
  } else {
    // ilha: relevo do gerador (1 px = 1 m) girado para a visão isométrica do minimapa
    if (!IMG) IMG = terrainImage();
    const E = N / 2, ox = -E - VX - P.x, oz = -E - VZ - P.z;
    g.save();
    g.transform(k, k, -k, k, C + (ox - oz) * k, C + (ox + oz) * k);
    g.drawImage(IMG, 0, 0);
    g.restore();
  }

  // árvores e pedras
  if (!inD) props.forEach(p => {
    const q = pt(p.position.x, p.position.z);
    g.fillStyle = '#2e5a3a';
    g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
  });

  // porto, castelo, fazendas, dungeons
  if (!inD) pois.forEach(p => { const q = pt(p.x, p.z); g.fillStyle = p.c; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); });

  // loot
  g.fillStyle = '#ffd040';
  loot.forEach(l => {
    const q = pt(l.m.position.x, l.m.position.z);
    g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
  });

  // inimigos (boss em magenta)
  enemies.forEach(z => {
    if (z.dead) return;
    if (inD && !DG.seen[dCell(z.x, z.z)]) return;       // na dungeon só aparece o que você já viu
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
