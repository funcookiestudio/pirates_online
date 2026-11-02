/* Postos inimigos: anéis de dificuldade ao redor da vila. [graus, raio, nome, equipe[[tipo, 'p'atrulha | 's'entinela, raio]]] */
import { KIND, ENEMY_KINDS } from './enemies.js';
import { MEDUSA_ISLE, DRAGON_ISLE, VAMPIRE_ISLE, HYDRA_ISLE, MUMMY_ISLE } from '../core/isle.js';

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
/* Ilha da Medusa: só serpentes, esqueletos e mortos-vivos; o último posto é o Templo da Medusa */
const S = K.SERPENTE, SK = K.SKELETON, GW = K.GUERREIRO, GH = K.GHOST, SM = K.SOMBRA;
const MEDUSA_CAMPS = [
  ['Ninho das Serpentes',        [[S, 'p', 4], [S, 'p', 4], [SK, 'p', 4.5], [SK, 's', 2.6]], 0],
  ['Cripta Rastejante',          [[SK, 'p', 4], [SK, 'p', 4.5], [S, 'p', 4], [S, 'p', 5]], 2],
  ['Cova dos Mortos',            [[GW, 'p', 4], [GW, 'p', 4.5], [SK, 'p', 5], [SK, 'p', 5], [GH, 's', 2.8]], 3],
  ['Bivaque dos Mortos-Vivos',   [[GH, 'p', 4.5], [GH, 'p', 4.5], [SK, 'p', 5], [GW, 's', 2.6]], 4],
  ['Poço das Víboras',           [[S, 'p', 4], [S, 'p', 4.5], [S, 'p', 5], [GH, 's', 2.8]], 5],
  ['Vigia das Sombras',          [[SM, 'p', 4.5], [SM, 'p', 5], [GH, 's', 2.8], [S, 'p', 5]], 6],
  ['Ossuário Maldito',           [[GW, 'p', 5], [GW, 'p', 5.5], [GH, 'p', 5], [SM, 'p', 4.5], [K.MUMIA, 'p', 5]], 8],
  ['Templo da Medusa',           [[K.MEDUSA, 's', 2.2], [S, 'p', 5], [S, 'p', 5.5], [SK, 'p', 6], [K.MUMIA, 'p', 6]], 6],
];
/* Ilha dos Dragões: ninhos de wivernos, restos de caçadores caídos, o Vale dos Dragões e, no ponto mais distante, o Covil do Dragão Ancestral */
const WY = K.WIVERNO, DR = K.DRAGAO;
const DRAGON_CAMPS = [
  ['Ninho dos Wivernos',          [[WY, 'p', 4], [WY, 'p', 4], [WY, 'p', 4.5], [SK, 's', 2.6]], 0],
  ['Acampamento Queimado',        [[WY, 'p', 4], [WY, 'p', 4.5], [GW, 's', 2.6], [SK, 'p', 5]], 1],
  ['Penhasco dos Wivernos',       [[WY, 'p', 4.5], [WY, 'p', 5], [WY, 'p', 5], [WY, 'p', 5.5]], 2],
  ['Ossuário dos Caçadores',      [[GW, 'p', 4.5], [GW, 'p', 5], [GH, 's', 2.8], [WY, 'p', 5]], 3],
  ['Fenda de Fogo',               [[DR, 's', 2.8], [WY, 'p', 5], [WY, 'p', 5.5]], 3],
  ['Vale dos Dragões',            [[DR, 'p', 5], [DR, 'p', 5.5], [WY, 'p', 5], [WY, 'p', 6]], 4],
  ['Garganta Vulcânica',          [[DR, 's', 2.8], [DR, 'p', 5], [WY, 'p', 5.5], [WY, 'p', 6]], 5],
  ['Covil do Dragão Ancestral',   [[K.ANCIAO, 's', 2.6], [DR, 'p', 6], [DR, 'p', 6.5], [WY, 'p', 6], [WY, 'p', 6.5]], 4],
];
/* Ilha dos Vampiros: cemitérios, capelas e abadias em ruínas, acampamentos de caçadores caídos; zumbis, esqueletos, vampiros e múmias; o Conde Vampiro no castelo em ruínas */
const ZB = K.ZUMBI, VP = K.VAMPIRO, MU = K.MUMIA, BD = K.BANDIDO, CV = K.CAVEIRA, HI = K.HIDRINHA;
const VAMPIRE_CAMPS = [
  ['Cemitério Abandonado',          [[ZB, 'p', 4], [ZB, 'p', 4], [ZB, 'p', 4.5], [SK, 's', 2.6]], 0],
  ['Capela em Ruínas',              [[ZB, 'p', 4], [ZB, 'p', 4.5], [SK, 'p', 5], [GW, 's', 2.6]], 1],
  ['Acampamento dos Caçadores',     [[GW, 'p', 4.5], [GW, 'p', 5], [ZB, 'p', 5], [SK, 'p', 5]], 2],
  ['Mausoléu dos Esquecidos',       [[ZB, 'p', 4.5], [ZB, 'p', 5], [MU, 's', 2.8], [GH, 'p', 5]], 3],
  ['Ruínas da Abadia',              [[VP, 's', 2.8], [ZB, 'p', 5], [ZB, 'p', 5], [SK, 'p', 5.5]], 3],
  ['Catacumbas Sangrentas',         [[VP, 'p', 5], [VP, 'p', 5.5], [ZB, 'p', 5], [MU, 'p', 5.5]], 4],
  ['Jardim dos Mortos',             [[VP, 's', 2.8], [VP, 'p', 5.5], [MU, 'p', 5.5], [ZB, 'p', 6]], 5],
  ['Castelo do Conde Vampiro',      [[K.CONDE, 's', 2.6], [VP, 'p', 6], [VP, 'p', 6.5], [ZB, 'p', 6], [MU, 'p', 6.5]], 4],
];
/* Ilha da Hidra: brejo de esqueletos e serpentes, acampamentos de caçadores, altares em ruínas; a Hidra no covil do fundo do pântano */
const HYDRA_CAMPS = [
  ['Brejo dos Esqueletos',          [[SK, 'p', 4], [SK, 'p', 4.5], [S, 'p', 4], [S, 's', 2.6]], 0],
  ['Acampamento dos Caçadores',     [[GW, 'p', 4.5], [SK, 'p', 5], [S, 'p', 4.5], [S, 's', 2.6]], 1],
  ['Ninho das Víboras',             [[S, 'p', 4], [S, 'p', 4.5], [S, 'p', 5], [SK, 's', 2.6]], 2],
  ['Ruínas Alagadas',               [[GW, 'p', 4.5], [GW, 'p', 5], [S, 'p', 5], [SK, 'p', 5]], 2],
  ['Pântano Venenoso',              [[HI, 's', 2.8], [S, 'p', 5], [S, 'p', 5.5], [SK, 'p', 5.5]], 3],
  ['Altar das Cabeças',             [[HI, 'p', 5], [HI, 'p', 5.5], [GW, 'p', 5], [S, 'p', 5]], 4],
  ['Fosso dos Ossos',               [[HI, 's', 2.8], [HI, 'p', 5.5], [GW, 'p', 5.5], [S, 'p', 5.5]], 5],
  ['Covil da Hidra',                [[K.HIDRA, 's', 2.8], [HI, 'p', 6], [HI, 'p', 6.5], [S, 'p', 6], [S, 'p', 6.5], [SK, 'p', 6]], 3],
];
/* Ilha da Múmia: acampamentos de bandidos, cavas de caveiras, mercado saqueado e tumbas; o Faraó Múmia na pirâmide */
const MUMMY_CAMPS = [
  ['Acampamento dos Bandidos',      [[BD, 'p', 4], [BD, 'p', 4], [BD, 'p', 4.5], [CV, 's', 2.6]], 0],
  ['Ruínas do Oásis',               [[BD, 'p', 4], [BD, 'p', 4.5], [CV, 'p', 5], [CV, 'p', 5]], 1],
  ['Cova das Caveiras',             [[CV, 'p', 4], [CV, 'p', 4.5], [CV, 'p', 5], [CV, 's', 2.6]], 2],
  ['Mercado Saqueado',              [[BD, 'p', 4.5], [BD, 'p', 5], [MU, 's', 2.8], [CV, 'p', 5]], 3],
  ['Tumba Esquecida',               [[MU, 'p', 4.5], [MU, 'p', 5], [CV, 'p', 5], [CV, 'p', 5.5]], 3],
  ['Fortim dos Saqueadores',        [[BD, 'p', 5], [BD, 'p', 5], [BD, 'p', 5.5], [MU, 's', 2.8], [CV, 's', 3]], 4],
  ['Avenida das Esfinges',          [[MU, 'p', 5], [MU, 'p', 5.5], [MU, 'p', 5.5], [CV, 'p', 6]], 5],
  ['Pirâmide do Faraó',             [[K.FARAO, 's', 2.8], [MU, 'p', 6], [MU, 'p', 6.5], [CV, 'p', 6], [CV, 'p', 6.5], [BD, 'p', 6.5]], 4],
];
export const POST_DATA = (MEDUSA_ISLE ? MEDUSA_CAMPS : DRAGON_ISLE ? DRAGON_CAMPS : VAMPIRE_ISLE ? VAMPIRE_CAMPS : HYDRA_ISLE ? HYDRA_CAMPS : MUMMY_ISLE ? MUMMY_CAMPS : CAMPS).map(([name, crew, add], i) => {
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
