/* Armas mágicas (Etapa 3): Cajado (staff) e Rod. TODO o balanceamento delas fica aqui; weapons-class.js só pede `mw('nome')`.
   Cada arma tem uma categoria (mt), um elemento (el, ids de data/elements.js) e um TIER (patamar de nível). O tier dá os números do CAJADO equivalente;
   a categoria multiplica por cima. Regra: no mesmo tier o Cajado causa mais dano básico e tem mais DPS que o Rod; o Rod é mais barato e acerta o efeito com mais frequência.

   Antes (Etapa 2)                  mul   cd   mp   DPS*   mana/s     Depois: ver tabela no relatório da Etapa 3 (E3-relatorio.md)
   Cajado do Aprendiz               1.1   .80  4    1.38   5.0        (idêntico: tier 1 · Cajado)
   Cajado de Carvalho               1.6   .85  6    1.88   7.1        (idêntico: tier 8 · Cajado)
   Rod de Cristal                   1.2   .55  4    2.18   7.3        (tier 10 · Rod)
   Rod das Chamas                   1.9   .60  7    3.17   11.7       (tier 16 · Rod)
   * DPS = mul ÷ cd (por unidade de dano do personagem). */
import { ELEMENTS } from './elements.js';

/** Patamares do Cajado: dano (mul), recarga (cd), mana por tiro (mp), alcance (rng) */
export const TIERS = {
  1: { mul: 1.1, cd: .80, mp: 4, rng: 11 },
  8: { mul: 1.6, cd: .85, mp: 6, rng: 12 },
  10: { mul: 1.8, cd: .85, mp: 6.5, rng: 12 },
  12: { mul: 2.0, cd: .85, mp: 7.5, rng: 12 },
  14: { mul: 2.3, cd: .90, mp: 8.5, rng: 12 },
  16: { mul: 2.6, cd: .90, mp: 9.5, rng: 12 },
};

/** Categorias: multiplicadores sobre o tier + efeito elemental (chance, intensidade e duração são multiplicadores do padrão do elemento em data/elements.js) */
export const CATS = {
  staff: { n: 'Cajado', mul: 1, cd: 1, mp: 1, rng: 0, chance: .25, pow: 1, dur: 1 },
  rod: { n: 'Rod', mul: .7, cd: .9, mp: .75, rng: -1, chance: .40, pow: 1, dur: 1 },
};

/** Armas: categoria, elemento, tier; `col` só se quiser outra cor que a do elemento; os demais campos sobrescrevem a categoria (ex.: chance) */
export const MAGIC = {
  'Cajado do Aprendiz': { mt: 'staff', el: 'ice', tier: 1, col: 0x6ab8ff },        // gelo: azul
  'Cajado de Carvalho': { mt: 'staff', el: 'earth', tier: 8, col: 0x9be85a },      // terra: madeira/natureza (verde mantido)
  'Rod de Cristal': { mt: 'rod', el: 'lightning', tier: 10, col: 0xc890ff },       // relâmpago: cristal vivo, ataque rápido (violeta mantido)
  'Rod das Chamas': { mt: 'rod', el: 'fire', tier: 16, col: 0xff7a20 },
  'Cajado de Fogo': { mt: 'staff', el: 'fire', tier: 12 },
  'Cajado Venenoso': { mt: 'staff', el: 'poison', tier: 14 },
  'Rod de Gelo': { mt: 'rod', el: 'ice', tier: 12 },
};

const r1 = x => Math.round(x * 100) / 100;
/** Campos de WEAPONS (mt, el, mul, cd, mp, rng, col, elc, elp, eld) da arma mágica `nome` */
export function mw(nome) {
  const m = MAGIC[nome], T = TIERS[m.tier], C = CATS[m.mt];
  return {
    mt: m.mt, el: m.el, mul: r1(T.mul * C.mul), cd: r1(T.cd * C.cd), mp: r1(T.mp * C.mp), rng: T.rng + C.rng,
    col: m.col !== undefined ? m.col : ELEMENTS[m.el].col,
    elc: m.chance !== undefined ? m.chance : C.chance, elp: m.pow !== undefined ? m.pow : C.pow, eld: m.dur !== undefined ? m.dur : C.dur,
  };
}
