/* Entrada do jogo: primeiro a tela de seleção de personagem (leve), depois o jogo de verdade (main.js, pesado). */
import { initFullscreen } from './ui/fullscreen.js';
import { initDeemoji } from './ui/deemoji.js';
import { runTitle } from './ui/title.js';
import { runCharSelect, hideCharSelect } from './ui/charselect.js';

initDeemoji();   // nada de emoji colorido: vira ícone em traço
initFullscreen();   // tela cheia no celular já na tela inicial (entra no primeiro toque)

/* Mapa novo (V388): zera personagens e saves antigos uma única vez; mantém só os ajustes */
try {
  const MAPVER = '800-2';
  if (localStorage.getItem('pirata-mapver') !== MAPVER) {
    const keep = localStorage.getItem('pirata-ajustes');
    Object.keys(localStorage).filter(k => k.startsWith('pirata')).forEach(k => localStorage.removeItem(k));
    if (keep != null) localStorage.setItem('pirata-ajustes', keep);
    localStorage.setItem('pirata-mapver', MAPVER);
  }
} catch (e) { /* sem armazenamento */ }

/* Atualização de estrutura/terreno: suba WORLDVER e, no próximo início do jogo, a ilha é gerada de novo sozinha
   (nova seed + chegada pelo porto; personagem e ajustes são mantidos), sem o jogador ir nos Ajustes > Mapa. */
try {
  const WORLDVER = 'W1';
  if (localStorage.getItem('pirata-worldver') !== WORLDVER) {
    if (!new URLSearchParams(location.search).get('seed')) {
      const w = ['mar', 'vento', 'ouro', 'coral', 'bruma', 'farol', 'recife', 'duna', 'lume', 'sal'];
      localStorage.setItem('pirata-ilha', w[Math.floor(Math.random() * w.length)] + '-' + Math.random().toString(36).slice(2, 7));
      localStorage.setItem('pirata-chegada', '1');
    }
    localStorage.setItem('pirata-worldver', WORLDVER);
  }
} catch (e) { /* sem armazenamento */ }

(async () => {
  if (location.hash !== '#dev') await runTitle();
  await runCharSelect();
  await import('./main.js');
  hideCharSelect();
  document.body.classList.remove('pre');   // agora sim mostra o HUD
})();
