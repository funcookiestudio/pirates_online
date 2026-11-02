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
