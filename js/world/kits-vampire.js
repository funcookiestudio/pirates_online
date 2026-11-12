/* Kits temáticos da Ilha dos Vampiros, montados em peças por cima do cenário de ruins-isle.js (que continua igual).
   Receitas por posto (índice em VAMPIRE_CAMPS):
     0 Cemitério Abandonado     -> Cemitério em Fileiras
     1 Capela em Ruínas         -> Forca com Gaiolas
     3 Mausoléu dos Esquecidos  -> Cemitério em Fileiras
     5 Catacumbas Sangrentas    -> Altar de Sangue
     6 Jardim dos Mortos        -> Cemitério em Fileiras
     7 Castelo do Conde         -> Altar de Sangue + Forca com Gaiolas
   Cada kit só aparece se couber no terreno (ver kit-core.js). */
import { POST_DATA } from '../data/posts.js';
import { box, cyl, oct, runRecipe } from './kit-core.js';

const ST = 0x6a6678, ST2 = 0x56526a, DK = 0x1a1620, WD = 0x2a2024, RED = 0x8a1030, IRON = 0x2b2b30;

/** Cemitério em Fileiras: 3 fileiras de lápides, cerca baixa de ferro e um portão na frente */
function rowGraves(rng) {
  const g = new THREE.Group(), W = 5.2, D = 4.6;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -W + 1.2 + c * 2.4 + rng.rnd(-.15, .15), z = -D + 1.3 + r * 2.5, h = rng.rnd(.9, 1.5), ry = rng.rnd(-.12, .12);
    box(g, .9, h, .22, ST, x, h / 2, z, ry, 0, rng.rnd(-.06, .06)); box(g, .5, .16, .5, ST2, x, .08, z + .6, ry);
    if (rng.r() < .35) box(g, 1.1, .12, 1.8, ST2, x, .06, z + .9, ry);   // laje
  }
  for (const [x0, z0, x1, z1] of [[-W, -D, W, -D], [-W, -D, -W, D], [W, -D, W, D]]) {   // cerca nos 3 lados; o da frente tem vão
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / .9);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; box(g, .1, 1.3, .1, IRON, x, .65, z); oct(g, .1, IRON, x, 1.4, z, 1.6); }
    box(g, Math.abs(x1 - x0) || .1, .08, Math.abs(z1 - z0) || .1, IRON, (x0 + x1) / 2, 1.05, (z0 + z1) / 2);
  }
  for (const s of [-1, 1]) { box(g, .1, 1.3, .1, IRON, s * 1.4, .65, D); box(g, .1, 1.3, .1, IRON, s * 5.2, .65, D); box(g, 3.8, .08, .1, IRON, s * 3.3, 1.05, D); }
  return { g, r: 7.5, solids: [[0, -2, 3.5]] };
}

/** Altar de Sangue: círculo de pedras, laje no centro com poça vermelha e cristais */
function bloodAltar(rng) {
  const g = new THREE.Group(), n = 8;
  cyl(g, 4.4, 4.6, .1, 16, 0x1a1218, 0, .05, 0);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, h = rng.rnd(1.6, 2.6); box(g, .9, h, .6, ST2, Math.cos(a) * 4, h / 2, Math.sin(a) * 4, -a + 1.57, 0, rng.rnd(-.08, .08)); }
  box(g, 2.6, .9, 1.5, ST, 0, .45, 0); box(g, 2.9, .2, 1.8, ST2, 0, .98, 0); box(g, 1.8, .06, .8, RED, 0, 1.1, 0);
  [-1, 1].forEach(s => oct(g, .45, 0xc0183a, s * 1.9, 1.2, 0, 1.8));
  return { g, r: 6, solids: [[0, 0, 1.8]] };
}

/** Forca com Gaiolas: viga alta sobre dois postes, com forca e duas gaiolas penduradas */
function gallows(rng) {
  const g = new THREE.Group();
  [-2.4, 2.4].forEach(x => box(g, .35, 5, .35, WD, x, 2.5, 0)); box(g, 5.6, .35, .35, WD, 0, 5, 0); box(g, .22, .22, 2, WD, -2.4, 4.4, -1.1, 0, .7);
  box(g, .06, 1.3, .06, DK, .4, 4.3, 0); box(g, .5, .08, .5, DK, .4, 3.6, 0, 0, 0, rng.rnd(-.1, .1));
  [-1.2, 1.6].forEach(x => { const h = rng.rnd(3, 3.6); box(g, .05, 5 - h, .05, DK, x, 5 - (5 - h) / 2, 0); cyl(g, .45, .45, 1, 8, IRON, x, h - .5, 0); box(g, .8, .1, .8, DK, x, h + .02, 0); });
  box(g, 5.8, .3, 2.4, ST2, 0, .12, 0);
  return { g, r: 4.5, solids: [[-2.4, 0, .5], [2.4, 0, .5]] };
}

const RECIPE = { 0: [rowGraves], 1: [gallows], 3: [rowGraves], 5: [bloodAltar], 6: [rowGraves], 7: [bloodAltar, gallows] };

/** Chamado no fim de buildRuinsScenery() quando a ilha é a dos Vampiros. Depuração: __kits_vampiros no console. */
export function buildVampireKits() { return runRecipe(POST_DATA, RECIPE, 'vampiros'); }
