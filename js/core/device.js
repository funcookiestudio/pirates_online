/* Desktop ou celular: uma regra só. O mesmo teste roda no <head> do index.html (antes da primeira pintura) e marca <html class="mob|desk land|port">.
   Celular = tela estreita (até 900 px) OU toque como ponteiro principal em retrato OU toque com pouca altura (celular deitado).
   Computador com mouse e janela larga fica desk, mesmo com tela touch. Se mudar a regra, mude também o script do index.html e os @media dos CSS (mesma string). */
export const MOB_QUERY = '(max-width: 900px), (pointer: coarse) and (orientation: portrait), (pointer: coarse) and (max-height: 520px)';
export const MOB = matchMedia(MOB_QUERY);
export const isMobile = () => MOB.matches;
export const isLandscape = () => innerWidth > innerHeight;
