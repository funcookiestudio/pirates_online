/* Personagens da vila: nome, ofício, falas piratas e (opcional) loja. */

export const CITIZENS = [
  { name: 'Barba-de-Ferro', title: 'Ferreiro', ic: '⚒', shop: 'smith',
    lines: ['Ahoy, marujo! Meu martelo já forjou lâmina que partiu mastro de fragata.', 'Aço bom não se acha em baú de náufrago. Aqui se forja de verdade!', 'Traga ouro e levará um sabre capaz de fazer um esqueleto pedir perdão.'] },
  { name: 'Madame Rum', title: 'Taverneira', ic: '🍺', shop: 'tavern',
    lines: ['Entre, entre! O rum é forte e a fofoca é grátis, meu bem.', 'Dizem que o Capitão Maldito guarda um tesouro nas ruínas... mas ninguém volta pra contar.', 'Precisa de poção? Tenho de sobra, e curo até ressaca de três dias!'] },
  { name: 'Velho Astrolábio', title: 'Cartógrafo', ic: '🧭',
    lines: ['Já tracei todos os mares... menos o que tem o seu nome, jovem lobo-do-mar.', 'Esta ilha tem alma. Os mortos rondam a mata à noite — fique perto da muralha se estiver ferido.', 'O Capitão Maldito vaga pela costa leste. Leve pólvora e coragem em dobro.'] },
  { name: 'Mestre Breu', title: 'Calafate', ic: '🔨',
    lines: ['Casco furado é morte certa! Eu calafeto até navio fantasma.', 'Se um dia tiver navio, me procure. Breu e alcatrão nunca faltam.', 'Os guardas do portão? Bons rapazes. Nunca deixaram um esqueleto passar da muralha.'] },
  { name: 'Pé-de-Pau Polly', title: 'Marujo aposentado', ic: '🦜',
    lines: ['Perdi a perna pro Kraken, mas ganhei histórias! Quer ouvir?', 'Um bom papagaio vale mais que um mapa. Cuide bem do seu companheiro!', 'Yo-ho-ho! Já enfrentei tempestade que arrancou a barba do Poseidon.'] },
  { name: 'Capitã Sal', title: 'Mercadora', ic: '💰', shop: 'trader',
    lines: ['Compro de tudo que brilha e vendo o que ninguém precisa — e todo mundo compra!', 'Saque de naufrágio? Pago melhor que o ferreiro, e sem perguntas.', 'Negócio é negócio, marujo. Até pirata paga o que deve.'] },
  { name: 'Zé Carrancudo', title: 'Marujo', ic: '🍻',
    lines: ['Hmpf. Se não vai pagar uma caneca, não atrapalhe meu descanso.', 'Esses esqueletos... já foram marujos como eu. Não tenha pena.', 'Um grogue e um sono de baixo do poço... a vida é boa.'] },
];

export const GUARD = { name: 'Guarda do Porto', title: 'Sentinela', ic: '💂',
  lines: ['Alto lá! Aqui é zona segura. Os mortos não passam deste portão.', 'Fique tranquilo, marujo. Enquanto eu empunhar esta lança, a vila está protegida.', 'Vá caçar esqueletos. Quando voltar ferido, o poço e a taverna esperam por você.'] };

export const CHEST = { name: 'Baú do Porto', title: 'Guarde seus tesouros', ic: '📦', chest: true,
  lines: ['Um velho baú reforçado com ferro. O que entra aqui fica a salvo até você voltar, marujo.', 'A mochila está pesada? Deixe o excesso no baú e vá caçar mais esqueletos!'] };

export const BOARD = { name: 'Mural de Missões', title: 'Cartazes de procurados e serviços', ic: '📜', board: true,
  lines: ['PROCURADO: Capitão Maldito — vivo ou morto. Recompensa generosa em ouro. Visto pela última vez na costa leste.',
    'SERVIÇO: A taverna paga bem por quem limpar a mata de esqueletos. Falar com Madame Rum.',
    'AVISO: Mortos-vivos rondam a ilha. Não saia da vila sem arma e poções, marujos!',
    'PROCURA-SE: Tripulantes corajosos para expedições. Falar com o Velho Astrolábio.'] };

export const FERRYMAN = { name: 'Capitão Remo', title: 'Barqueiro do Porto', ic: '⛵', ferry: true,
  lines: ['Ahoy! Meu barco leva marujo a qualquer ilha do arquipélago... por uma moedinha.', 'O mar está calmo. Diga o destino e eu iço a vela!', 'Cada ilha tem seus perigos e seus tesouros. Boa viagem, marujo!'] };

export const ISLANDS = [
  { seed: 'pirata', name: 'Ilha Natal', cost: 0, tier: 0 },
  { seed: 'corvo', name: 'Ilha do Corvo', cost: 25, tier: 1 },
  { seed: 'tormenta', name: 'Ilha da Tormenta', cost: 25, tier: 2 },
  { seed: 'caveira', name: 'Ilha da Caveira', cost: 25, tier: 3 },
];
