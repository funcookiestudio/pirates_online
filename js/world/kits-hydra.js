/* Kits temáticos da Ilha da Hidra, montados em peças por cima do cenário de ruins-isle.js (que continua igual).
   Receitas por posto (índice em HYDRA_CAMPS):
     0, 3, 6 -> Palafitas do Brejo
     5, 7    -> Altar de Cabeças
     2, 4    -> Ninho de Ovos Viscosos
   Cada kit só aparece se couber no terreno (ver kit-core.js). */
import { POST_DATA } from '../data/posts.js';
import { box, cyl, oct, egg, runRecipe } from './kit-core.js';

const ST = 0x7a8a6a, MOSS = 0x3f6a32, WD = 0x4a3a22, SLIME = 0x6fd04a, REED = 0x5a7a30;

/** Palafitas do Brejo: plataforma de tábuas sobre estacas, cabana pequena e corda */
function stilts(rng) {
  const g = new THREE.Group();
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2.2, 2.2]) cyl(g, .18, .22, 2.2, 6, WD, x, 1.1, z);
  for (let i = 0; i < 6; i++) box(g, 1, .14, 5.2, WD, -2.5 + i * 1, 2.25, 0, 0, 0, rng.rnd(-.01, .01));   // tábuas
  box(g, 2.6, 1.8, 2.4, WD, -1.1, 3.2, -.4); box(g, 3.2, .18, 3, MOSS, -1.1, 4.2, -.4, 0, 0, .06); box(g, .6, 1.1, .1, 0x1a1208, -1.1, 2.95, .85);
  box(g, .05, .05, 3, 0x9a8a5a, 2, 2.9, 1.4, 0, .5); box(g, 1.4, .06, 1.4, MOSS, 2.6, 2.35, -1.6);   // corda e musgo
  return { g, r: 5, solids: [[-1.1, -.4, 1.6]] };
}

/** Altar de Cabeças: círculo de pilares com cabeças de serpente de pedra e poça verde no centro */
function headAltar(rng) {
  const g = new THREE.Group(), n = 6;
  cyl(g, 3, 3.2, .12, 14, 0x2a3a22, 0, .06, 0); cyl(g, 1.6, 1.6, .08, 12, SLIME, 0, .14, 0);
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283, x = Math.cos(a) * 3.6, z = Math.sin(a) * 3.6, h = rng.rnd(2.4, 3.4);
    cyl(g, .4, .5, h, 7, ST, x, h / 2, z); oct(g, .5, ST, x, h + .3, z, 1.2);   // cabeça de serpente
    box(g, .3, .22, .7, ST, x - Math.cos(a) * .4, h + .2, z - Math.sin(a) * .4, -a + 1.57);   // focinho voltado ao centro
    oct(g, .12, SLIME, x - Math.cos(a) * .2, h + .45, z - Math.sin(a) * .2);
  }
  return { g, r: 5.2, solids: [[0, 0, 1.2]] };
}

/** Ninho de Ovos Viscosos: ovos verdes em ninho de juncos */
function eggNest(rng) {
  const g = new THREE.Group();
  cyl(g, 2.4, 2.8, .35, 10, 0x3a3a1a, 0, .17, 0);
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; box(g, .12, rng.rnd(1, 1.7), .12, REED, Math.cos(a) * 2.5, .8, Math.sin(a) * 2.5, 0, rng.rnd(-.3, .3), rng.rnd(-.3, .3)); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, d = i ? 1.1 : 0, r = i ? rng.rnd(.35, .5) : .7; egg(g, r, i % 2 ? SLIME : 0x4aa83a, Math.cos(a) * d, .35 + r * 1.3, Math.sin(a) * d); }
  box(g, .9, .05, .9, SLIME, 1.7, .36, 1.2, rng.rnd(0, 3));   // gosma
  return { g, r: 3.6, solids: [[0, 0, 2]] };
}

const RECIPE = { 0: [stilts], 3: [stilts], 6: [stilts], 5: [headAltar], 7: [headAltar], 2: [eggNest], 4: [eggNest] };

/** Chamado no fim de buildRuinsScenery() quando a ilha é a da Hidra. Depuração: __kits_hidra no console. */
export function buildHydraKits() { return runRecipe(POST_DATA, RECIPE, 'hidra'); }
