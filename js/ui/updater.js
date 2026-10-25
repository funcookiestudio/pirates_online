/* Atualização automática: o aparelho confere `version.json` (sempre da rede, nunca do cache). Se a versão publicada for diferente da
   que está rodando, avisa e faz um "hard refresh": remove o service worker e os caches e recarrega a página. */
import { VERSION } from '../core/version.js';

const EVERY = 3 * 60 * 1000, COUNT = 15;
let shown = false, snooze = 0;

async function latest() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j.v === 'string' ? j.v : null;
  } catch (e) { return null; }   // sem rede, ou fora do site (prévia): ignora
}

/** Limpa service worker e caches e recarrega da rede */
export async function hardRefresh() {
  try { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); } catch (e) { /* sem SW */ }
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { /* sem Cache Storage */ }
  try { await Promise.all(['index.html', 'js/boot.js', 'js/main.js'].map(u => fetch(u, { cache: 'reload' }))); } catch (e) { /* offline: recarrega mesmo assim */ }
  location.reload();
}

function banner(v) {
  shown = true;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(30px + env(safe-area-inset-top,0px));z-index:60;background:#1b2a30f2;color:#fff;border:1px solid #e0a458;border-radius:10px;padding:8px 12px;font:13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 4px 18px #0008;max-width:92vw';
  const txt = document.createElement('span'), go = document.createElement('button'), later = document.createElement('button');
  [go, later].forEach(b => { b.style.cssText = 'font:inherit;border-radius:7px;border:0;padding:5px 10px;cursor:pointer'; });
  go.style.background = '#e0a458'; go.textContent = 'Atualizar agora'; later.textContent = 'Depois';
  el.append(txt, go, later); document.body.appendChild(el);
  let left = COUNT;
  const tick = () => { txt.textContent = '🔄 Nova versão ' + v + ' — atualizando em ' + left + 's'; };
  tick();
  const t = setInterval(() => { if (--left <= 0) { clearInterval(t); hardRefresh(); } else tick(); }, 1000);
  go.onclick = () => { clearInterval(t); txt.textContent = 'Atualizando…'; hardRefresh(); };
  later.onclick = () => { clearInterval(t); el.remove(); shown = false; snooze = Date.now() + 5 * 60 * 1000; };
}

async function check() {
  if (shown || Date.now() < snooze) return;
  const v = await latest();
  if (v && v !== VERSION) banner(v);
}

export function initUpdater() {
  if (!/^https?:/.test(location.protocol)) return;   // arquivo local/prévia: não há o que conferir
  setTimeout(check, 4000);
  setInterval(check, EVERY);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
