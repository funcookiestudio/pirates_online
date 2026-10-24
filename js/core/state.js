/* Estado global mutável do jogo (valores que vários módulos precisam alterar). */
import { PETLIST } from '../data/pets.js';

export const state = {
  HS: 0,            // "hit-stop": tempo restante de câmera lenta num golpe forte
  SHK: 0,           // intensidade do tremor de câmera
  autoOn: false,    // auto combate ligado?
  stam: 1,          // fôlego do auto combate (0..1): gasta ligado, recupera desligado ou descansando
  autoRest: false,  // auto ligado mas parado, sentado descansando
  trip: null,       // indo comprar poções/bombas
  seek: null,       // ponto de descanso (fogueira) para onde o auto está indo
  clearing: false,  // limpando inimigos da fogueira antes de descansar
  cp: -1,           // posto de renascimento atual (-1 = vila)
  deaths: {},       // mortes por posto
  autoHold: 0,      // segundos em que o jogador assume o controle do auto combate
  autoCfg: {
    loot: true, equip: true, swap: true,                       // geral
    usePot: true, potHp: 40, dodge: true, bomb: true, spin: true, // combate
    refill: true, potMin: 0, potTarget: 5, bombMin: 0, bombTarget: 3, reserve: 0, // compras
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
