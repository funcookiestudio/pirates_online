/* Service worker: o jogo funciona offline depois da primeira visita.
   Arquivos do jogo: rede primeiro, cache só offline. Three.js (CDN): cache primeiro e atualiza em segundo plano.
   Mude VERSION para forçar a limpeza do cache antigo. */
const VERSION = 'pirates-v2';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || !(u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com')) return;
  if (u.origin === location.origin && u.pathname.endsWith('/version.json')) return;   // a checagem de versão sempre vai à rede
  const own = u.origin === location.origin;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    if (own) {   // arquivos do jogo: REDE primeiro (versão nova assim que existir); o cache só cobre quando está sem rede
      try {
        const res = await fetch(r, { cache: 'no-cache' });
        if (res && res.ok) c.put(r, res.clone());
        return res;
      } catch (err) { return hit || (r.mode === 'navigate' ? c.match('index.html') : Response.error()); }
    }
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);   // Three.js (CDN): cache primeiro
    return hit || (await net) || Response.error();
  }));
});
