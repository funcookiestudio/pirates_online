/* Progressão: fórmulas de nível para inimigos, XP, itens e dificuldade das ilhas.
   Tudo que depende de nível passa por aqui, para ajustar o equilíbrio em um só lugar. */

/** Dificuldade das ilhas: cada tier soma ISLAND_STEP níveis a todos os inimigos da ilha */
export const ISLAND_STEP = 7;
const NAMED = { tortuga: 0, pirata: 0, corvo: 1, tormenta: 2, caveira: 3 };
/** Tier (0..3) da ilha pela semente; sementes desconhecidas (?seed=) caem num tier estável pelo hash */
export function tierOf(seed) {
  if (seed in NAMED) return NAMED[seed];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 4;
}
export const tierBonus = tier => tier * ISLAND_STEP;

/** Vida e dano "de referência" de um inimigo no nível L (multiplicados pelo arquétipo: hm, dm) */
export const hpAt = L => 28 + 11 * L;
export const dmgAt = L => 3 + 1.1 * L;

/** Elite: raro, mais forte, dá mais XP e loot */
export const ELITE = { hp: 1.8, d: 1.3, xp: 2.5, scale: 1.12, lv: 2 };
export const eliteChance = (tier, ring) => ring < 1 ? 0 : .05 + tier * .02 + (ring - 1) * .02;

/** Estatísticas finais do inimigo `t` (arquétipo) no nível `L` */
export function enemyStats(t, L, elite) {
  return {
    hp: Math.round(t.hm * hpAt(L) * (elite ? ELITE.hp : 1)),
    d: Math.round(t.dm * dmgAt(L) * (elite ? ELITE.d : 1)),
    xp: Math.max(1, Math.round(t.xm * 9 * Math.pow(L, 1.1) * (elite ? ELITE.xp : 1))),
  };
}

/** XP para sair do nível L (L1 = 60) */
export const xpToNext = L => Math.round(32 * Math.pow(L, 1.6) + 28);

/** Multiplicador de XP pela diferença de nível entre inimigo e jogador (muito fraco quase não dá XP) */
export function xpMult(df) {
  return df <= -8 ? .05 : df <= -4 ? .25 : df < 0 ? 1 + df * .15 : 1 + Math.min(df, 5) * .12;
}

/** Ouro solto por um inimigo de nível L */
export const goldAt = L => Math.round((2 + L * 2) * (1 + L * .03));

/** Chances de qualidade do item (3 = lendário, 2 = mágico): sobem com o nível; elite e boss têm bônus */
export function rollQuality(L, bonus = 0) {
  const r = Math.random();
  if (r < .004 + L * .0006 + bonus * .03) return 3;
  return Math.random() < .03 + L * .004 + bonus * .12 ? 2 : 1;
}

/* ---- Diferença de nível (df = nível do inimigo − nível do jogador) ---- */

/** Dano que o jogador causa: até +2 níveis acima não muda; depois cai 9% por nível (mínimo 15%) */
export const dealtMult = df => df <= 2 ? 1 : Math.max(.15, 1 - (df - 2) * .09);

/** Dano que o jogador recebe: inimigo mais forte bate mais (até +6% por nível, até +16 níveis); mais fraco bate menos (até −50%) */
export const takenMult = df => df > 0 ? 1 + Math.min(df, 16) * .06 : Math.max(.5, 1 + df * .04);

/** Nível mínimo para usar um item: o nível dele menos 2 de folga (itens sem nível, de saves antigos, não têm requisito) */
export const itemReq = it => it && it.il && it.n !== 'Tocha' ? Math.max(1, it.il - 2) : 1;
