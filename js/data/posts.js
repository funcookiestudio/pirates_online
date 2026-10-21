/* Postos inimigos: anéis de dificuldade ao redor da vila. [graus, raio, nome, equipe[[tipo, 'p'atrulha | 's'entinela, raio]]] */
import { KIND, ENEMY_KINDS } from './enemies.js';

const K = KIND;
const RAW = [
  // Anel 1 · Nv 1–3 · perto da vila
  [20,  30, 'Acampamento dos Náufragos', [[K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4.5], [K.SKELETON, 's', 2.6]]],
  [110, 30, 'Cais Abandonado',           [[K.SKELETON, 'p', 4], [K.SKELETON, 'p', 4.5], [K.GRUMETE, 's', 2.6], [K.GRUMETE, 's', 3]]],
  [200, 30, 'Posto dos Contrabandistas', [[K.GRUMETE, 'p', 4], [K.GRUMETE, 'p', 4], [K.CONTRA, 's', 2.6]]],
  [290, 30, 'Ruínas do Farol',           [[K.SKELETON, 'p', 4], [K.SKELETON, 'p', 4.5], [K.SKELETON, 'p', 5], [K.GRUMETE, 's', 2.6]]],
  // Anel 2 · Nv 3–5
  [65,  42, 'Bivaque Fantasma',          [[K.GHOST, 'p', 4.5], [K.GHOST, 'p', 4.5], [K.SKELETON, 'p', 5], [K.GUERREIRO, 's', 2.6]]],
  [155, 42, 'Esconderijo do Contrabando', [[K.CONTRA, 'p', 4], [K.CONTRA, 'p', 4.5], [K.GUERREIRO, 's', 2.6], [K.CONTRA, 's', 3]]],
  [245, 42, 'Cova dos Esqueletos',       [[K.GUERREIRO, 'p', 4], [K.GUERREIRO, 'p', 4.5], [K.SKELETON, 'p', 5], [K.SKELETON, 'p', 5]]],
  [335, 42, 'Vigia das Sombras',         [[K.SOMBRA, 'p', 4.5], [K.SOMBRA, 'p', 5], [K.GHOST, 's', 2.8], [K.CONTRA, 's', 3]]],
  // Anel 3 · Nv 5–8 · borda da ilha
  [40,  50, 'Fortim do Capitão Maldito', [[K.BOSS, 's', 2.2], [K.CORSARIO, 'p', 5], [K.CORSARIO, 'p', 5.5], [K.SOMBRA, 'p', 6]]],
  [130, 50, 'Enseada dos Corsários',     [[K.CORSARIO, 'p', 4.5], [K.CORSARIO, 'p', 5], [K.GHOST, 'p', 5.5], [K.GUERREIRO, 's', 3]]],
  [220, 50, 'Praia dos Naufragados',     [[K.BRUTO, 's', 2.4], [K.BRUTO, 'p', 5], [K.GUERREIRO, 'p', 5.5], [K.GHOST, 'p', 4.5]]],
  [310, 50, 'Penhasco Sombrio',          [[K.SOMBRA, 'p', 4.5], [K.SOMBRA, 'p', 5], [K.CORSARIO, 'p', 5.5], [K.BRUTO, 's', 2.6]]],
];

export const POST_DATA = RAW.map(([deg, r, name, crew], i) => {
  const a = deg * Math.PI / 180, lvs = crew.map(c => ENEMY_KINDS[c[0]].lv);
  return { id: i, deg, r, name, crew, x: Math.cos(a) * r, z: Math.sin(a) * r, lo: Math.min(...lvs), hi: Math.max(...lvs), prev: i < 4 ? -1 : i - 4 };
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
