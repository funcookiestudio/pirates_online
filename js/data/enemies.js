/* Tipos de inimigos.
   lv = nível do papel (nível-base na ilha inicial) · hm/dm = multiplicadores de vida/dano do arquétipo (ver scaling.js)
   s = velocidade · xm = multiplicador de XP
   c = cores do corpo: [pele, camisa, calça, chapéu] */

/** Índices dos tipos no array ENEMY_KINDS */
export const KIND = { SKELETON: 0, GHOST: 1, BOSS: 2, GRUMETE: 3, CONTRA: 4, GUERREIRO: 5, SOMBRA: 6, CORSARIO: 7, BRUTO: 8, JAVALI: 9 };

export const ENEMY_KINDS = [
  { n: 'Esqueleto',              lv: 2,  hm: 1.1, dm: 1.55,  s: 2.6, c: [0xddd8c0, 0xbbb69a, 0x6a6a5a, 0x333333], xm: .47 },
  { n: 'Pirata Fantasma',        lv: 4,  hm: 1.55, dm: 1.9, s: 2.2, c: [0x8ab8c8, 0x4a7a8a, 0x2a4a5a, 0x113344], xm: .44 },
  { n: 'Capitão Maldito',        lv: 12, hm: 5.6, dm: 2.4, s: 2.4, c: [0xa8c8a0, 0x7a1a1a, 0x222222, 0x6a0a0a], xm: 2.2, boss: 1 },
  { n: 'Grumete Zumbi',          lv: 1,  hm: 1.0, dm: 1.45,  s: 2.2, c: [0x9ab87a, 0x6a7a5a, 0x4a4a3a, 0x3a2a1a], xm: .67 },
  { n: 'Contrabandista',         lv: 3,  hm: 1.5, dm: 1.9, s: 2.5, c: [0xd0a888, 0x3a5a7a, 0x2a2a3a, 0x1a1a2a], xm: .46 },
  { n: 'Esqueleto Guerreiro',    lv: 4,  hm: 1.8, dm: 2.0, s: 2.3, c: [0xe8e0c8, 0x8a8a8a, 0x4a4a4a, 0x2a2a2a], xm: .48, sc: 1.1 },
  { n: 'Sombra das Ondas',       lv: 5,  hm: 1.2, dm: 2.0, s: 3.5, c: [0x4a5a8a, 0x1a2244, 0x10162a, 0x0a0a18], xm: .45 },
  { n: 'Corsário Amaldiçoado',   lv: 7,  hm: 2.2, dm: 2.05, s: 2.4, c: [0xb8a090, 0x5a1a3a, 0x201020, 0x300a20], xm: .52, sc: 1.15 },
  { n: 'Brutamontes Naufragado', lv: 9,  hm: 3.0, dm: 2.3, s: 1.9, c: [0x9a7a60, 0x4a3a2a, 0x2a2a20, 0x5a4a2a], xm: .6, sc: 1.35 },
  { n: 'Javali',                lv: 3,  hm: 1.7, dm: 1.75, s: 3.4, c: [0x5a4634, 0x2e2218, 0x8a7258, 0x1c1410], xm: .5, sc: 1.2, animal: 'boar', hbY: 1.7, lblY: 2.0 },   // selvagem da floresta: hostil, investe
];
