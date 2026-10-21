/* Tela cheia forçada: navegadores só permitem após um toque/clique, então entra no primeiro toque
   e tenta de novo no próximo toque se o jogador sair (ex.: botão voltar). */
const el = document.documentElement;
const req = el.requestFullscreen || el.webkitRequestFullscreen;

function enter() {
  if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* iframe/preview sem permissão: ignora */ }
}

export function initFullscreen() {
  ['pointerup', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, enter, { passive: true }));
}
