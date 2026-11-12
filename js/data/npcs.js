/* Personagens da vila: nome, ofício, falas piratas e (opcional) loja. */

export const CITIZENS = [
  { name: 'Barba-de-Ferro', title: 'Ferreiro', ic: '⚒', shop: 'smith', skin: ['ferreiro', 0],
    lines: ['Ahoy, marujo! Meu martelo já forjou lâmina que partiu mastro de fragata.', 'Aço bom não se acha em baú de náufrago. Aqui se forja de verdade!', 'Traga ouro e levará um sabre capaz de fazer um esqueleto pedir perdão.'] },
  { name: 'Madame Rum', title: 'Taverneira', ic: '🍺', shop: 'tavern', skin: ['taberneiro', 1],
    lines: ['Entre, entre! O rum é forte e a fofoca é grátis, meu bem.', 'Dizem que o Capitão Maldito guarda um tesouro nas ruínas... mas ninguém volta pra contar.', 'Precisa de poção? Tenho de sobra, e curo até ressaca de três dias!'] },
  { name: 'Velho Astrolábio', title: 'Cartógrafo', ic: '🧭', skin: ['cartografo', 0],
    lines: ['Já tracei todos os mares... menos o que tem o seu nome, jovem lobo-do-mar.', 'Esta ilha tem alma. Os mortos rondam a mata à noite — fique perto da muralha se estiver ferido.', 'O Capitão Maldito vaga pela costa leste. Leve pólvora e coragem em dobro.'] },
  { name: 'Mestre Breu', title: 'Calafate', ic: '🔨', skin: ['calafate', 0],
    lines: ['Casco furado é morte certa! Eu calafeto até navio fantasma.', 'Se um dia tiver navio, me procure. Breu e alcatrão nunca faltam.', 'Os guardas do portão? Bons rapazes. Nunca deixaram um esqueleto passar da muralha.'] },
  { name: 'Pé-de-Pau Polly', title: 'Marujo aposentado', ic: '🦜', skin: ['marujo', 0],
    lines: ['Perdi a perna pro Kraken, mas ganhei histórias! Quer ouvir?', 'Um bom papagaio vale mais que um mapa. Cuide bem do seu companheiro!', 'Yo-ho-ho! Já enfrentei tempestade que arrancou a barba do Poseidon.'] },
  { name: 'Capitã Sal', title: 'Mercadora', ic: '💰', shop: 'trader', skin: ['mercadora', 1],
    lines: ['Compro de tudo que brilha e vendo o que ninguém precisa — e todo mundo compra!', 'Saque de naufrágio? Pago melhor que o ferreiro, e sem perguntas.', 'Negócio é negócio, marujo. Até pirata paga o que deve.'] },
  { name: 'Zé Carrancudo', title: 'Marujo', ic: '🍻', skin: ['taberneiro', 0],
    lines: ['Hmpf. Se não vai pagar uma caneca, não atrapalhe meu descanso.', 'Esses esqueletos... já foram marujos como eu. Não tenha pena.', 'Um grogue e um sono de baixo do poço... a vida é boa.'] },
  { name: 'Dona Broa', title: 'Padeira', ic: '🥖', skin: ['taberneiro', 1],
    lines: ['Pão quentinho saindo do forno! Cheiro bom, né? Dizem que dá até para sentir do cais.', 'Marujo de barriga vazia não empunha espada direito. Coma um pãozinho antes de ir caçar esqueleto!', 'Acordo antes do sol para acender o forno. Quem dorme demais perde o melhor pão.'] },
  { name: 'Irmã Camomila', title: 'Curandeira', ic: '🌿', skin: ['herbalista', 1],
    lines: ['Machucado fundo, marujo? Chegue perto da maca. Ervas boas curam até corte de sabre enferrujado.', 'Colho as ervas na beira do mato, mas nunca vou além da muralha depois do pôr do sol.', 'Mel das minhas abelhas, camomila e um pouco de paciência: o melhor remédio que existe.'] },
  { name: 'Tião Anzol', title: 'Pescador', ic: '🎣', skin: ['barqueiro', 0],
    lines: ['Hoje o mar tava manso e a rede voltou pesada. Quer ouvir a história do peixe-espada que me puxou até a barra?', 'Peixe seco dura meses e pirata esfomeado não tem frescura. Pode levar.', 'Estou consertando o barco velho. Um dia ainda zarpo até a ilha da Medusa... de longe, claro.'] },
  { name: 'Mestre Pinho', title: 'Carpinteiro', ic: '🪚', skin: ['calafate', 0],
    lines: ['Tábua boa tem cheiro de mato e é feita para durar mais que o dono. Veja aquele casco: será um veleiro daqueles!', 'Esse barulho de serra? Música para os meus ouvidos. Só não chegue perto da plaina, marujo.', 'Preciso de mais madeira, mas as árvores perto da mata são guardadas pelos mortos. Que azar.'] },
];

export const GUARD = { name: 'Guarda do Porto', title: 'Sentinela', ic: '💂', skin: ['guarda', 0],
  lines: ['Alto lá! Aqui é zona segura. Os mortos não passam deste portão.', 'Fique tranquilo, marujo. Enquanto eu empunhar esta lança, a vila está protegida.', 'Vá caçar esqueletos. Quando voltar ferido, o poço e a taverna esperam por você.'] };

export const CHEST = { name: 'Baú do Porto', title: 'Guarde seus tesouros', ic: '📦', chest: true,
  lines: ['Um velho baú reforçado com ferro. O que entra aqui fica a salvo até você voltar, marujo.', 'A mochila está pesada? Deixe o excesso no baú e vá caçar mais esqueletos!'] };

export const BOARD = { name: 'Mural de Missões', title: 'Cartazes de procurados e serviços', ic: '📜', board: true,
  lines: ['PROCURADO: Capitão Maldito — vivo ou morto. Recompensa generosa em ouro. Visto pela última vez na costa leste.',
    'SERVIÇO: A taverna paga bem por quem limpar a mata de esqueletos. Falar com Madame Rum.',
    'AVISO: Mortos-vivos rondam a ilha. Não saia da vila sem arma e poções, marujos!',
    'PROCURA-SE: Tripulantes corajosos para expedições. Falar com o Velho Astrolábio.'] };

export const FERRYMAN = { name: 'Capitão Remo', title: 'Barqueiro do Porto', ic: '⛵', ferry: true, skin: ['barqueiro', 0],
  lines: ['Ahoy! Meu barco leva marujo a qualquer ilha do arquipélago... por uma moedinha.', 'O mar está calmo. Diga o destino e eu iço a vela!', 'Cada ilha tem seus perigos e seus tesouros. Boa viagem, marujo!'] };

export const HORSEMAN = { name: 'Seu Tobias', title: 'Criador de cavalos', ic: '🐴', stable: true, skin: ['cavalarico', 0], shop: 'farm-gado',
  lines: ['Cavalo bom não se acha em qualquer curral, marujo. O meu corre mais que vento de tempestade!', 'Com ele você cruza a ilha na metade do tempo — mas cavalo não nada, hein.', 'Trate bem do bicho e ele nunca te deixa a pé. Assobie (tecla H) e ele vem.', 'Também vendo carroça e carruagem, já com os cavalos atrelados. Só não passam do portão da vila!'] };

export const FARMER_AVES = { name: 'Dona Marta', title: 'Criadora de aves', ic: '🐔', skin: ['avicultora', 1], shop: 'farm-aves',
  lines: ['Bom dia, marujo! As galinhas botaram bem hoje — ovo fresquinho não falta aqui.', 'Cuidado com o galo, ele é brigão! Já bicou até capitão.', 'Aqui a gente vive em paz. Só peço que não assustem as aves.'] };
export const FARMER_GRANJA = { name: 'Seu Zé', title: 'Granjeiro', ic: '🐖', skin: ['granjeiro', 0], shop: 'farm-granja',
  lines: ['Eita, visita! Chegue, que o porco tá gordo e a lã das ovelhas tá no ponto.', 'Roça é trabalho de sol a sol, mas não troco por mar nenhum.', 'Se ouvir barulho de ovelha à noite, é só o vento. Eu acho...'] };

export const HERBALIST = { name: 'Ysolde Folha-Prata', title: 'Herbalista', ic: '🌿', shop: 'herbs', skin: ['herbalista', 1],
  lines: ['Shh... não pise nas mandrágoras, elas gritam. Ah, uma visita! Raro por aqui.', 'O povo da vila diz que eu faço bruxaria. Faço é remédio — e remédio bom fica longe de gente fofoqueira.', 'Colho de madrugada, com a lua ainda alta: é quando as ervas guardam mais força. Minhas poções curam o que o rum só esquece.', 'Se um dia o Capitão Maldito te rasgar o peito, traga-me uma folha de sangue-de-dragão e eu costuro o resto com chá.'] };

export const ISLANDS = [
  { seed: 'brisa', name: 'Ilha Natal', cost: 0, tier: 0 },
  { seed: 'corvo', name: 'Ilha do Corvo', cost: 25, tier: 1 },
  { seed: 'tormenta', name: 'Ilha da Tormenta', cost: 25, tier: 2 },
  { seed: 'caveira', name: 'Ilha da Caveira', cost: 25, tier: 3 },
  { seed: 'medusa', name: 'Ilha da Medusa', cost: 50, tier: 3, needsMedusa: true },
  { seed: 'dragoes', name: 'Ilha dos Dragões', cost: 75, tier: 3 },
  { seed: 'vampiros', name: 'Ilha dos Vampiros', cost: 90, tier: 3 },
  { seed: 'hidra', name: 'Ilha da Hidra', cost: 110, tier: 3 },
  { seed: 'mumia', name: 'Ilha da Múmia', cost: 130, tier: 3 },
];
