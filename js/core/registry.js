/* Listas compartilhadas do mundo. Ficam aqui para que qualquer módulo possa lê-las
   sem criar dependências circulares entre sistemas. */

export const enemies = [];    // inimigos vivos (e em animação de morte)
export const loot = [];       // itens no chão
export const particles = [];  // partículas e efeitos visuais temporários
export const bombs = [];      // bombas em voo
export const shots = [];      // balas em voo
export const props = [];      // árvores e pedras (colisão)
export const respawns = [];   // fila de reaparecimento de inimigos
