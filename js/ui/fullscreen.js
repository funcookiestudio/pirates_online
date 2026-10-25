/* Tela cheia forçada: navegadores só permitem após um toque/clique, então entra no primeiro toque
   e tenta de novo no próximo toque se o jogador sair (ex.: botão voltar). */
import { CFG } from '../systems/settings.js';
const el = document.documentElement;
/** Tela cheia: no celular/tablet (toque) liga sozinha; no computador é opcional (ajustes) */
export const wantFull = () => CFG.full !== undefined ? !!CFG.full : matchMedia('(pointer:coarse)').matches;
const req = el.requestFullscreen || el.webkitRequestFullscreen;

function enter() {
  if (!wantFull() || !req || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* iframe/preview sem permissão: ignora */ }
}

/** Liga/desliga na hora (chamado pelo botão dos ajustes, que é um gesto do usuário) */
export function applyFull(on) {
  try {
    if (on) enter();
    else { const ex = document.exitFullscreen || document.webkitExitFullscreen; if ((document.fullscreenElement || document.webkitFullscreenElement) && ex) { const p = ex.call(document); if (p && p.catch) p.catch(() => {}); } }
  } catch (e) { /* ignora */ }
}

export function initFullscreen() {
  ['pointerup', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, enter, { passive: true }));
}

/** PWA: registra o service worker (só em https/localhost; no preview de arquivo único é ignorado) */
export function initPwa() {
  if (!('serviceWorker' in navigator) || !/^https:|^http:\/\/localhost/.test(location.href)) return;
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
