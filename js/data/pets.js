/* Dados dos companheiros: lista, dano relativo, textos de efeitos e árvore de habilidades. */

export const PETLIST = [
  { id: 'parrot', n: 'Polly',    ic: '🦜',   d: 'Voa · coleta · ataca' },
  { id: 'raven',  n: 'Corvo',    ic: '⬛', d: 'Voa · coleta · ataca' },
  { id: 'monkey', n: 'Macaco',   ic: '🐒',   d: 'Pula · coleta · ataca' },
  { id: 'dog',    n: 'Cachorro', ic: '🐕',   d: 'Segue · senta · ataca' },
  { id: 'rat',    n: 'Rato',     ic: '🐀',   d: 'Veloz · fica em pé · ataca' },
];

/** Multiplicador do dano do jogador aplicado pelo companheiro */
export const PL = { parrot: .9, raven: 1, monkey: .85, dog: .85, rat: .8 };

/** XP necessário para o companheiro passar do nível `l` para `l + 1` */
export const pxn = l => Math.round(30 * Math.pow(1.18, l - 1));

/** Nome de cada efeito de habilidade (usado nas descrições) */
export const FXN = {
  dmg: 'dano', crit: 'chance crítica', spd: 'velocidade', rate: 'cadência de ataque',
  loot: 'velocidade de coleta', stun: 'chance de atordoar', bleed: 'sangramento',
  splash: 'dano em área', heal: 'vida ao acertar', guard: 'menos dano em você',
  mana: 'mana ao acertar', knock: 'repulsão', multi: 'chance de golpe duplo',
  mark: 'dano em marcados', exec: 'dano em feridos',
};

/** Habilidade: id, nome, ícone, camada (1-3), níveis máx., requisito [id, nível], efeitos */
const K = (id, n, ic, t, max, req, fx) => ({ id, n, ic, t, max, req, fx });

export const PSK = {
  parrot: [
    K('a', 'Bico Afiado', '🗡', 1, 5, 0, { dmg: .1 }),
    K('b', 'Asas Ligeiras', '🪽', 1, 3, 0, { spd: .06, rate: .06 }),
    K('c', 'Faro de Tesouro', '💰', 1, 3, 0, { loot: .3 }),
    K('d', 'Rasante Letal', '🎯', 2, 4, ['a', 2], { crit: .07 }),
    K('e', 'Grito Estridente', '📢', 2, 3, ['b', 2], { stun: .15 }),
    K('f', 'Tempestade de Penas', '🌪', 3, 3, ['d', 2], { splash: .35 }),
  ],
  raven: [
    K('a', 'Garras Sombrias', '🗡', 1, 5, 0, { dmg: .1 }),
    K('b', 'Voo Silencioso', '🌑', 1, 3, 0, { spd: .06, rate: .06 }),
    K('c', 'Olhar Agourento', '👁', 1, 3, 0, { mark: .08 }),
    K('d', 'Sangria Sombria', '🩸', 2, 4, ['a', 2], { bleed: .2 }),
    K('e', 'Pacto Sombrio', '🔮', 2, 3, ['b', 2], { heal: .015 }),
    K('f', 'Revoada Fantasma', '👻', 3, 3, ['d', 2], { multi: .15, exec: .2 }),
  ],
  monkey: [
    K('a', 'Unhas Afiadas', '🗡', 1, 5, 0, { dmg: .1 }),
    K('b', 'Agilidade', '🤸', 1, 3, 0, { spd: .06, rate: .06 }),
    K('c', 'Mãos Leves', '🍌', 1, 3, 0, { loot: .3 }),
    K('d', 'Pulo Esmagador', '💥', 2, 4, ['a', 2], { splash: .3, knock: .4 }),
    K('e', 'Caos Divertido', '🙈', 2, 3, ['b', 2], { stun: .15 }),
    K('f', 'Fúria Símia', '🔥', 3, 3, ['d', 2], { multi: .15, rate: .1 }),
  ],
  dog: [
    K('a', 'Presas Afiadas', '🦷', 1, 5, 0, { dmg: .1 }),
    K('b', 'Patas Ligeiras', '🐾', 1, 3, 0, { spd: .06, rate: .06 }),
    K('c', 'Pelo Grosso', '🛡', 1, 4, 0, { guard: .06 }),
    K('d', 'Mordida Dilacerante', '🩸', 2, 4, ['a', 2], { bleed: .2 }),
    K('e', 'Latido Ensurdecedor', '📢', 2, 3, ['b', 2], { stun: .12, knock: .5 }),
    K('f', 'Fúria Canina', '🐺', 3, 3, ['d', 2], { multi: .12, heal: .012 }),
  ],
  rat: [
    K('a', 'Dentes de Roedor', '🦷', 1, 5, 0, { dmg: .1 }),
    K('b', 'Patinhas Velozes', '🐾', 1, 3, 0, { spd: .08, rate: .08 }),
    K('c', 'Pelo Sujo', '🛡', 1, 4, 0, { guard: .05 }),
    K('d', 'Mordida Infectada', '🩸', 2, 4, ['a', 2], { bleed: .25 }),
    K('e', 'Guincho Agudo', '📢', 2, 3, ['b', 2], { stun: .13 }),
    K('f', 'Praga de Porão', '☣', 3, 3, ['d', 2], { multi: .15, mark: .08 }),
  ],
};
