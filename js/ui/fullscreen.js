/* Tela cheia forçada: navegadores só permitem após um toque/clique, então entra no primeiro toque
   e tenta de novo no próximo toque se o jogador sair (ex.: botão voltar). */
const el = document.documentElement;
/** Tela cheia: no celular/tablet (toque) liga sozinha; no computador é opcional (ajustes) */
const saved = () => { try { return JSON.parse(localStorage.getItem('pirata-ajustes') || '{}').full; } catch (e) { return undefined; } };   // lê direto do armazenamento: assim funciona já na tela inicial, antes do jogo (e dos ajustes) carregar
export const wantFull = () => { const f = saved(); return f !== undefined ? !!f : matchMedia('(pointer:coarse)').matches; };
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

let started = false;
export function initFullscreen() {
  if (started) return; started = true;
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, enter, { passive: true }));
}

/** PWA: registra o service worker (só em https/localhost; no preview de arquivo único é ignorado) */
export function initPwa() {
  if (!('serviceWorker' in navigator) || !/^https:|^http:\/\/localhost/.test(location.href)) return;
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
