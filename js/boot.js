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

(async () => {
  if (location.hash !== '#dev') await runTitle();
  await runCharSelect();
  await import('./main.js');
  hideCharSelect();
  document.body.classList.remove('pre');   // agora sim mostra o HUD
})();
