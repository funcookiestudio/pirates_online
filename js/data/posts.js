/* Postos inimigos: anéis de dificuldade ao redor da vila. [graus, raio, nome, equipe[[tipo, 'p'atrulha | 's'entinela, raio]]] */
import { KIND, ENEMY_KINDS } from './enemies.js';

const K = KIND;
/* 8 acampamentos, do mais fácil (perto da vila, Nv ~1) ao mais difícil (ponto mais distante, chefe, Nv ~20).
   A posição vem do gerador do mapa (js/world/layout.js) por custo de caminho desde a vila; `add` soma níveis aos arquétipos (data/enemies.js).
   [nome, equipe[[tipo, 'p'atrulha | 's'entinela, raio]], níveis extras] */
const CAMPS = [
  ['Acampamento dos Náufragos',    [[K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4.5], [K.SKELETON, 's', 2.6]], 0],
  ['Posto dos Contrabandistas',    [[K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4], [K.CONTRA, 's', 2.6]], 1],
  ['Cova dos Esqueletos',          [[K.GUERREIRO, 'p', 4], [K.GUERREIRO, 'p', 4.5], [K.SKELETON, 'p', 5], [K.SKELETON, 'p', 5]], 2],
  ['Bivaque Fantasma',             [[K.GHOST, 'p', 4.5], [K.GHOST, 'p', 4.5], [K.SKELETON, 'p', 5], [K.GUERREIRO, 's', 2.6]], 4],
  ['Vigia das Sombras',            [[K.SOMBRA, 'p', 4.5], [K.SOMBRA, 'p', 5], [K.GHOST, 's', 2.8], [K.CONTRA, 's', 3]], 6],
  ['Enseada dos Corsários',        [[K.CORSARIO, 'p', 4.5], [K.CORSARIO, 'p', 5], [K.GHOST, 'p', 5.5], [K.GUERREIRO, 's', 3]], 8],
  ['Praia dos Naufragados',        [[K.BRUTO, 's', 2.4], [K.BRUTO, 'p', 5], [K.GUERREIRO, 'p', 5.5], [K.GHOST, 'p', 4.5]], 10],
  ['Fortim do Capitão Maldito',    [[K.BOSS, 's', 2.2], [K.CORSARIO, 'p', 5], [K.CORSARIO, 'p', 5.5], [K.SOMBRA, 'p', 6]], 8],
];
export const POST_DATA = CAMPS.map(([name, crew, add], i) => {
  const lvs = crew.map(c => ENEMY_KINDS[c[0]].lv + add);
  return { id: i, ring: Math.min(3, i >> 1), name, crew, add, x: 0, z: 0, lo: Math.min(...lvs), hi: Math.max(...lvs), prev: -1 };   // x,z: definidos pelo relevo (terrain.js)
});
// ao morrer 2x num posto, volta para um posto do anel anterior (ou a vila, no anel 1)
POST_DATA.forEach((p, i) => {
  const before = POST_DATA.filter(q => q.ring === p.ring - 1);
  p.prev = before.length ? before[i % before.length].id : -1;
});

/** Posto mais próximo de (x,z) dentro de `max` metros (ou null) */
export function nearestPost(x, z, max = 24) {
  let best = null, bd = max;
  POST_DATA.forEach(p => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } });
  return best;
}

/** Ponto de descanso/renascimento de um posto: a 9 m da fogueira, no lado da vila (-1 = praça da vila) */
export function postSpot(id) {
  if (id < 0) return [VILLAGE_SEAT.x, VILLAGE_SEAT.z];
  const p = POST_DATA[id], d = Math.hypot(p.x, p.z) || 1;
  return [p.x - p.x / d * 9, p.z - p.z / d * 9];
}

/** Lugar onde o jogador começa/renasce na vila: sentado perto da fogueira central, de frente para ela */
export const VILLAGE_SEAT = { x: 0, z: 3.4, yaw: Math.PI };
