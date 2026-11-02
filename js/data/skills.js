/* Habilidades por classe (chave `k` do personagem). Cada classe tem 1 passiva (vale desde o nível 1) e 3 ativas
   liberadas nos níveis 1, 6 e 12 (teclas 1, 2, 3). Personagem sem classe (NEUTRA) não tem habilidades.
   mp = custo de mana · cd = recarga (s) · lv = nível que libera · ic = traçado SVG do ícone (24×24) · css = cor do botão */
export const SKILL_LV = [1, 6, 12];

export const SKILLS = {
  guerreiro: {
    css: '#ff5a3a', col: [0xff4a30, 0xc8d0d8],
    pas: { n: 'Pele de Ferro', d: 'A cada 3 golpes acertados, ganha um escudo de 10% da vida máxima por 4 s.', ic: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>' },
    act: [
      { n: 'Golpe Cataclísmico', mp: 15, cd: 6, d: 'Salta até o alvo e esmaga o chão: 2,5× de dano em área e atordoa por 1 s.', ic: '<path d="M12 3v9M8 8l4 4 4-4M4 21h16M6 17l3-3M18 17l-3-3"/>' },
      { n: 'Grito de Guerra', mp: 20, cd: 20, d: 'Por 8 s: +25% de dano, -20% de dano recebido, e os inimigos próximos passam a te mirar.', ic: '<path d="M4 9v6h4l5 4V5L8 9H4zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>' },
      { n: 'Muralha', mp: 30, cd: 45, d: 'Por 5 s: imune a empurrão e recebe só 30% do dano. Ao fim, onda de choque de 2× de dano.', ic: '<path d="M5 20V9l3-2 4 2 4-2 3 2v11zM9 20v-5h6v5"/>' },
    ],
  },
  cacador: {
    css: '#8fd04a', col: [0x6bd04a, 0xffd870],
    pas: { n: 'Olho de Águia', d: '+10% de crítico em alvos a mais de 6 de distância.', ic: '<circle cx="12" cy="12" r="4"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>' },
    act: [
      { n: 'Tiro Perfurante', mp: 12, cd: 5, d: 'Feixe que atravessa todos em linha: 2,2× de dano.', ic: '<path d="M3 21L21 3M15 3h6v6M5 15l4 4"/>' },
      { n: 'Armadilha de Espinhos', mp: 18, cd: 14, d: 'Coloca uma armadilha (20 s, máx. 2): quem pisa fica preso 2 s e sangra 3 s.', ic: '<path d="M3 18l3-9 3 9 3-9 3 9 3-9 3 9M3 21h18"/>' },
      { n: 'Chuva de Balas', mp: 35, cd: 40, d: 'Marca uma área de raio 5: 8 tiros em 3 s, 1,2× de dano cada.', ic: '<path d="M6 3l2 7M12 2l2 8M18 3l-2 7M5 14l1 6M12 14l1 6M19 14l-1 6"/>' },
    ],
  },
  mago: {
    css: '#8a7bff', col: [0x6ab8ff, 0xa070ff],
    pas: { n: 'Fluxo Arcano', d: 'Regenera 3% da mana/s fora de combate (1% em combate). Cada habilidade usada reduz 0,5 s a recarga das outras.', ic: '<circle cx="12" cy="12" r="3"/><path d="M12 3a9 9 0 019 9M12 21a9 9 0 01-9-9"/>' },
    act: [
      { n: 'Bola de Fogo', mp: 14, cd: 4, d: 'Projétil que explode (raio 3): 2,2× de dano e queima por 3 s.', ic: '<path d="M12 21c4 0 7-3 7-7 0-3-2-5-3-8-2 2-3 3-4 3 0-3-1-4-3-6-1 4-4 6-4 11 0 4 3 7 7 7z"/>' },
      { n: 'Nova de Gelo', mp: 22, cd: 16, d: 'Onda de raio 5: 1,5× de dano e lentidão de 50% por 4 s.', ic: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>' },
      { n: 'Tempestade Arcana', mp: 45, cd: 50, d: 'Por 6 s, raios caem em inimigos aleatórios num raio de 8: 1,4× de dano cada.', ic: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>' },
    ],
  },
  ladino: {
    css: '#b070ff', col: [0xa060ff, 0x2a1a3a],
    pas: { n: 'Golpe Furtivo', d: 'O 1º golpe num inimigo que ainda não te atacou é crítico garantido. Ao esquivar: +20% de velocidade por 2 s.', ic: '<path d="M5 5l14 14M19 5L5 19"/>' },
    act: [
      { n: 'Passo Sombrio', mp: 10, cd: 7, d: 'Some em fumaça e reaparece atrás do alvo com um golpe 2× crítico garantido.', ic: '<path d="M4 12h9M10 7l5 5-5 5M19 6v12"/>' },
      { n: 'Adagas Venenosas', mp: 16, cd: 12, d: 'Lança 3 adagas em leque (1× de dano cada) com veneno por 4 s, acumula até 3×.', ic: '<path d="M4 20L13 11M13 11l1-7 6 6-7 1zM8 20l7-7"/>' },
      { n: 'Dança das Lâminas', mp: 32, cd: 35, d: 'Por 4 s, invulnerável: 6 golpes de 1,3× de dano pulando entre inimigos próximos.', ic: '<path d="M4 4l16 16M20 4L4 20M12 7v10"/>' },
    ],
  },
};

/* ===================== Balanceamento: ajuste os números aqui =====================
   RANK: bônus por rank de habilidade ativa (máx. RANK.max): +dano, -recarga, -custo de mana.
   PTS: pontos ganhos (habilidades: 1 por nível a partir do 2 · talentos: 1 a cada 2 níveis a partir do 3). Ranks e talentos ficam no save (campo `skills`).
   TSTAT: efeito de 1 rank de cada tipo de talento (v = valor; hp e mp são fixos na vida/mana máxima, o resto é fração).
   TUNE: os números de cada habilidade (mult = multiplicador de dano, dur = duração em s, r = raio, range = alcance, kn = empurrão, etc.).
   Dano = P.dmg × mult × P.cls.(melee|ranged|area|magic) × (1 + RANK.dmg × rank). As armas das classes ficam em js/data/weapons-class.js
   (b, mul, cd, rng, mp, kb, crit, bleed). Custo de mana e recarga base de cada ativa estão em SKILLS.<classe>.act[i] (mp, cd). Mudou o número? Basta salvar:
   nada mais precisa ser editado (js/systems/skills.js só lê esta tabela). */
export const RANK = { max: 3, dmg: .12, cd: .06, mp: .04 };
export const PTS = { skill: lv => Math.max(0, lv - 1), talent: lv => Math.max(0, Math.floor((lv - 1) / 2)) };
export const TSTAT = {
  dmg: { v: .03, pct: 1, t: 'de dano' }, crit: { v: .02, pct: 1, t: 'de chance de crítico' }, dr: { v: .02, pct: 1, t: 'menos dano recebido' },
  hp: { v: 10, t: 'de vida máxima' }, mp: { v: 8, t: 'de mana máxima' }, spd: { v: .02, pct: 1, t: 'de velocidade' },
  cdr: { v: .03, pct: 1, t: 'menos recarga das habilidades' }, mpc: { v: .03, pct: 1, t: 'menos custo de mana' }, mpr: { v: .004, pct: 1, t: 'da mana máxima por segundo' },
};
const BR = (n, ic, col, names, keys) => ({ n, ic, col, nodes: names.map((nm, i) => ({ n: nm, k: keys[i] })) });
/** 3 ramos por classe, 6 nós por ramo (máx. 3 ranks cada); cada nó exige o anterior do ramo */
export const TALENTS = {
  guerreiro: [
    BR('Baluarte', 'sword', '#e8776b', ['Pele grossa', 'Couraça', 'Coração de ferro', 'Escudo vivo', 'Fôlego de aço', 'Inabalável'], ['hp', 'dr', 'hp', 'dr', 'mp', 'hp']),
    BR('Fúria', 'gun', '#f0b04a', ['Golpe pesado', 'Olho de sangue', 'Braço firme', 'Ímpeto', 'Fúria crescente', 'Destruidor'], ['dmg', 'crit', 'dmg', 'cdr', 'dmg', 'crit']),
    BR('Marcha', 'plank', '#5b9bf0', ['Passo firme', 'Respiração', 'Disciplina', 'Pés de ferro', 'Tática', 'Veterano'], ['spd', 'mpr', 'cdr', 'spd', 'mpc', 'mpr']),
  ],
  cacador: [
    BR('Precisão', 'gun', '#f0b04a', ['Mira firme', 'Olho de águia', 'Disparo certeiro', 'Ponta afiada', 'Caçador nato', 'Tiro mortal'], ['crit', 'dmg', 'crit', 'dmg', 'crit', 'dmg']),
    BR('Sobrevivência', 'sword', '#e8776b', ['Couro curtido', 'Pés leves', 'Resistência', 'Instinto', 'Camuflagem', 'Vigor'], ['hp', 'spd', 'dr', 'hp', 'dr', 'hp']),
    BR('Armadilhas', 'plank', '#5b9bf0', ['Ferragens', 'Gatilho rápido', 'Armadilheiro', 'Fôlego', 'Chuva forte', 'Mestre caçador'], ['cdr', 'mpc', 'cdr', 'mpr', 'mpc', 'cdr']),
  ],
  mago: [
    BR('Arcano', 'gun', '#c890ff', ['Mente aguçada', 'Reserva arcana', 'Poder bruto', 'Fluxo', 'Canalização', 'Arquimago'], ['dmg', 'mp', 'dmg', 'mpr', 'dmg', 'mp']),
    BR('Elementos', 'sword', '#f0b04a', ['Centelha', 'Foco', 'Fúria elemental', 'Precisão', 'Tempestade', 'Cataclismo'], ['dmg', 'crit', 'cdr', 'crit', 'dmg', 'cdr']),
    BR('Proteção', 'plank', '#5b9bf0', ['Véu', 'Vigor arcano', 'Barreira', 'Economia', 'Fluidez', 'Eterno'], ['dr', 'hp', 'dr', 'mpc', 'spd', 'hp']),
  ],
  ladino: [
    BR('Assassino', 'sword', '#e8776b', ['Golpe baixo', 'Ponto fraco', 'Lâmina afiada', 'Sangue frio', 'Execução', 'Sombra mortal'], ['dmg', 'crit', 'dmg', 'crit', 'dmg', 'crit']),
    BR('Sombra', 'plank', '#b070ff', ['Passos leves', 'Esquiva', 'Fôlego curto', 'Vulto', 'Reflexos', 'Fantasma'], ['spd', 'dr', 'cdr', 'spd', 'dr', 'cdr']),
    BR('Veneno', 'gun', '#8fd04a', ['Frasco extra', 'Toxina', 'Frio calculado', 'Concentração', 'Peçonha', 'Mestre dos venenos'], ['mp', 'dmg', 'mpc', 'mpr', 'dmg', 'hp']),
  ],
};

export const TUNE = {
  guerreiro: {
    pele: { hits: 3, pct: .1, rank: .02, dur: 4 },                                        // passiva: a cada `hits` golpes, escudo de pct da vida máx.
    cata: { range: 12, r: 3.2, mult: 2.5, kn: 1.3, stun: 1, stunBoss: .3 },               // Golpe Cataclísmico
    grito: { dur: 8, dmg: .25, dr: .2, radius: 14 },                                        // Grito de Guerra
    muralha: { dur: 5, take: .3, mult: 2, r: 4.6, kn: 1.6 },                                // Muralha (take = fração do dano recebido)
  },
  cacador: {
    aguia: { dist: 6, crit: .1, rank: .02 },                                                // passiva: crítico em alvos distantes
    tiro: { range: 20, len: 20, w: 1.1, wBoss: .7, mult: 2.2, kn: .5 },                     // Tiro Perfurante
    trap: { max: 2, life: 20, trigger: 1.2, root: 2, rootBoss: .6, bleed: 3, bleedMult: .3 }, // Armadilha de Espinhos
    chuva: { range: 16, r: 5, shots: 8, dur: 3, mult: 1.2, hit: 1.5 },                      // Chuva de Balas
  },
  mago: {
    fluxo: { regenOut: .03, regenIn: .01, rank: .15, cdr: .5 },                              // passiva: % da mana máx/s e redução de recarga por skill usada
    fogo: { range: 22, speed: 18, hit: 1.2, r: 3, mult: 2.2, burn: 3, burnMult: .3 },       // Bola de Fogo
    gelo: { r: 5.2, mult: 1.5, slow: 4 },                                                   // Nova de Gelo
    storm: { dur: 6, bolts: 12, every: .5, r: 8, mult: 1.4, chain: 1.5 },                   // Tempestade Arcana
  },
  ladino: {
    passo: { range: 12, mult: 2 },                                                          // Passo Sombrio
    adagas: { range: 16, mult: 1, poison: 4, pmult: .35, stacks: 3 },                       // Adagas Venenosas
    danca: { dur: 4, hits: 6, every: .62, r: 10, mult: 1.3 },                               // Dança das Lâminas
  },
};
