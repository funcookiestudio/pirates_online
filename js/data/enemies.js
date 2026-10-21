/* Tipos de inimigos.
   lv = nível · hp = vida · d = dano · s = velocidade · xp = experiência ao morrer
   c = cores do corpo: [pele, camisa, calça, chapéu] */

/** Índices dos tipos no array ENEMY_KINDS */
export const KIND = { SKELETON: 0, GHOST: 1, BOSS: 2, GRUMETE: 3, CONTRA: 4, GUERREIRO: 5, SOMBRA: 6, CORSARIO: 7, BRUTO: 8 };

export const ENEMY_KINDS = [
  { n: 'Esqueleto',              lv: 2,  hp: 55,  d: 8,  s: 2.6, c: [0xddd8c0, 0xbbb69a, 0x6a6a5a, 0x333333], xp: 9 },
  { n: 'Pirata Fantasma',        lv: 4,  hp: 110, d: 14, s: 2.2, c: [0x8ab8c8, 0x4a7a8a, 0x2a4a5a, 0x113344], xp: 18 },
  { n: 'Capitão Maldito',        lv: 12, hp: 900, d: 38, s: 2.4, c: [0xa8c8a0, 0x7a1a1a, 0x222222, 0x6a0a0a], xp: 300, boss: 1 },
  { n: 'Grumete Zumbi',          lv: 1,  hp: 40,  d: 6,  s: 2.2, c: [0x9ab87a, 0x6a7a5a, 0x4a4a3a, 0x3a2a1a], xp: 6 },
  { n: 'Contrabandista',         lv: 3,  hp: 90,  d: 12, s: 2.5, c: [0xd0a888, 0x3a5a7a, 0x2a2a3a, 0x1a1a2a], xp: 14 },
  { n: 'Esqueleto Guerreiro',    lv: 4,  hp: 130, d: 15, s: 2.3, c: [0xe8e0c8, 0x8a8a8a, 0x4a4a4a, 0x2a2a2a], xp: 20, sc: 1.1 },
  { n: 'Sombra das Ondas',       lv: 5,  hp: 100, d: 17, s: 3.5, c: [0x4a5a8a, 0x1a2244, 0x10162a, 0x0a0a18], xp: 24 },
  { n: 'Corsário Amaldiçoado',   lv: 7,  hp: 230, d: 22, s: 2.4, c: [0xb8a090, 0x5a1a3a, 0x201020, 0x300a20], xp: 40, sc: 1.15 },
  { n: 'Brutamontes Naufragado', lv: 9,  hp: 380, d: 30, s: 1.9, c: [0x9a7a60, 0x4a3a2a, 0x2a2a20, 0x5a4a2a], xp: 60, sc: 1.35 },
];
