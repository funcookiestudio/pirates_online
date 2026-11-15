/* Kits temáticos da Ilha das Múmias, montados em peças por cima do cenário de ruins-isle.js (que continua igual).
   Receitas por posto (índice em MUMMY_CAMPS):
     4, 7 -> Templo de Colunas
     0, 3 -> Tendas do Mercado
     2, 4 -> Cova de Sarcófagos
   Cada kit só aparece se couber no terreno (ver kit-core.js). */
import { POST_DATA } from '../data/posts.js';
import { box, cyl, oct, runRecipe } from './kit-core.js';

const SAND = 0xd2b27a, SAND2 = 0xb89a62, GOLD = 0xe0b84a, CLOTH = 0xb8402a, DK = 0x3a2a18;

/** Templo de Colunas: 4 colunas, lintel por cima e 2 obeliscos na entrada */
function columnTemple(rng) {
  const g = new THREE.Group();
  box(g, 7, .4, 6, SAND2, 0, .2, 0);
  for (const x of [-2.6, 2.6]) for (const z of [-2, 2]) { cyl(g, .5, .6, 4, 8, SAND, x, 2.4, z); box(g, 1.3, .3, 1.3, GOLD, x, 4.55, z); }
  box(g, 6.6, .6, 1.2, SAND, 0, 5.0, 2); box(g, 6.6, .6, 1.2, SAND, 0, 5.0, -2);
  for (const s of [-1, 1]) { box(g, .8, 4.2, .8, SAND, s * 4.4, 2.1, 3.6); oct(g, .55, GOLD, s * 4.4, 4.5, 3.6, 1.1); }
  return { g, r: 6.5, solids: [[-2.6, -2, .7], [2.6, -2, .7], [-2.6, 2, .7], [2.6, 2, .7]] };
}

/** Tendas do Mercado: 3 barracas de toldo com caixas e jarros */
function bazaar(rng) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 3.4, c = i === 1 ? GOLD : CLOTH;
    for (const dx of [-1.2, 1.2]) for (const dz of [-.9, .9]) box(g, .12, 2.2, .12, DK, x + dx, 1.1, dz);
    box(g, 2.8, .12, 2.2, c, x, 2.3, 0, 0, .18); box(g, 2.2, .7, .9, DK, x, .35, .5);   // toldo inclinado e balcão
    box(g, .6, .5, .6, SAND2, x - .7, .95, .5, rng.rnd(0, 1)); cyl(g, .22, .28, .6, 8, 0x8a5a32, x + .6, 1, .5);   // caixa e jarro
    cyl(g, .3, .36, .7, 8, 0x8a5a32, x + rng.rnd(-1, 1), .35, -1.6);
  }
  return { g, r: 6, solids: [[-3.4, 0, 1.4], [0, 0, 1.4], [3.4, 0, 1.4]] };
}

/** Cova de Sarcófagos: 3 sarcófagos inclinados e uma cova com caveiras */
function sarcophagi(rng) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 2.2, tilt = rng.rnd(.2, .45) * (i === 1 ? -1 : 1);
    box(g, 1.1, 2.4, .9, GOLD, x, 1.2, -1.2, rng.rnd(-.2, .2), tilt, 0); box(g, .8, .5, .8, SAND, x, 2.6, -1.2, 0, tilt);
    box(g, 1, .08, 1.8, CLOTH, x, .1, -.2);   // faixas de tecido no chão
  }
  cyl(g, 1.7, 1.9, .12, 10, 0x2a1e12, 0, .06, 2.4);
  for (let i = 0; i < 5; i++) { const a = rng.rnd(0, 6.283), d = rng.rnd(0, 1.2); oct(g, .22, 0xe8e0c8, Math.cos(a) * d, .3, 2.4 + Math.sin(a) * d); }
  return { g, r: 5, solids: [[-2.2, -1.2, .8], [0, -1.2, .8], [2.2, -1.2, .8]] };
}

const RECIPE = { 4: [columnTemple, sarcophagi], 7: [columnTemple], 0: [bazaar], 3: [bazaar], 2: [sarcophagi] };

/** Chamado no fim de buildRuinsScenery() quando a ilha é a das Múmias. Depuração: __kits_mumia no console. */
export function buildMummyKits() { return runRecipe(POST_DATA, RECIPE, 'mumia'); }
