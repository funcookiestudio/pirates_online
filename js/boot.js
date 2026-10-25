/* Entrada do jogo: primeiro a tela de seleção de personagem (leve), depois o jogo de verdade (main.js, pesado). */
import { runCharSelect, hideCharSelect } from './ui/charselect.js';

(async () => {
  await runCharSelect();
  await import('./main.js');
  hideCharSelect();
})();
