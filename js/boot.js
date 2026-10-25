/* Entrada do jogo: primeiro a tela de seleção de personagem (leve), depois o jogo de verdade (main.js, pesado). */
import { runTitle } from './ui/title.js';
import { runCharSelect, hideCharSelect } from './ui/charselect.js';

(async () => {
  if (location.hash !== '#dev') await runTitle();
  await runCharSelect();
  await import('./main.js');
  hideCharSelect();
})();
