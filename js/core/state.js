/* Estado global mutável do jogo (valores que vários módulos precisam alterar). */
import { PETLIST } from '../data/pets.js';

export const state = {
  HS: 0,            // "hit-stop": tempo restante de câmera lenta num golpe forte
  SHK: 0,           // intensidade do tremor de câmera
  autoOn: false,    // auto combate ligado?
  contract: null,   // contrato de dungeon ativo { c, run } (quests.js)
  cartazes: [],     // ids de missões "pegas" no Mural (quests.js): lista de cartazes do inventário
  qtrack: null,     // missão acompanhada (aparece primeiro no HUD)
  quests: {},       // missões de NPCs (quests.js): id → { s, i, n, t, a }
  lastKill: null,   // último inimigo morto (lido pelos eventos de missão)
  quest: { st: 0 }, // primeira missão (O Rato da Taverna): estágio
  owned: {},        // companheiros que o jogador tem (id → true)
  fleeing: false,   // auto combate sem ouro: fugindo para a vila
  autoDebt: 0,      // ouro devido do auto combate (fração)
  trip: null,       // indo comprar poções/bombas
  seek: null,       // ponto de descanso (fogueira) para onde o auto está indo
  clearing: false,  // limpando inimigos da fogueira antes de descansar
  cp: -1,           // posto de renascimento atual (-1 = vila)
  deaths: {},       // mortes por posto
  dunDone: {},      // dungeons já concluídas (semente → 1)
  autoHold: 0,      // segundos em que o jogador assume o controle do auto combate
  autoCfg: {
    loot: true, lootGold: true, lootPot: true, lootWpn: true, lootWpnQ: 1, lootArm: true, lootArmQ: 1, lootUpgrade: false,   // loot: o que coletar (raridade mínima 1 comum · 2 mágico · 3 lendário)
    equip: true, swap: true, torch: 1, torchSwap: true, // geral (torch: 0 nunca · 1 automática no escuro · 2 sempre acesa)
    usePot: true, potHp: 40, dodge: true, bomb: true, spin: true, // combate
    refill: true, potMin: 0, potTarget: 5, bombMin: 0, bombTarget: 3, ammoMin: 2, ammoTarget: 10, beltMax: 6, reserve: 0, // compras (totais = slot + cinto; beltMax = vagas da mochila para o cinto)
    sellMax: 0, storeMin: 0, bagAt: 20,                         // vendas e baú
  }, // ajustes do auto combate
  pet: PETLIST[0],  // companheiro ativo
  petHappy: 0,      // tempo restante (s) da animação feliz ao equipar um companheiro
  petAttack: true,  // companheiro ataca? (tecla R)
  lastE: null,      // último inimigo atingido (para a barra de vida)
  lastT: 0,         // quando foi atingido
};

/** Ponto do chão apontado pelo mouse/toque (alvo das bombas) */
export const aim = new THREE.Vector3();
