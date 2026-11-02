/* Ajudantes dos testes headless: navegador (Edge/Chromium), three r128 local e servidor estático.
   Variáveis de ambiente: BROWSER (caminho do executável; padrão: Edge no Windows, senão o Chromium do Playwright), THREE_JS (caminho do three.min.js r128). */
const fs = require('fs');
const path = require('path');
const http = require('http');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
exports.three = () => {
  const p = process.env.THREE_JS || path.join(__dirname, 'three', 'package', 'build', 'three.min.js');
  if (!fs.existsSync(p)) throw new Error('three.min.js não encontrado: defina THREE_JS ou rode "npm pack three@0.128.0" em tools/tests/three e extraia (veja o README)');
  return fs.readFileSync(p, 'utf8');
};
exports.launch = () => {
  const { chromium } = require('playwright-core');
  const exe = process.env.BROWSER || (fs.existsSync(EDGE) ? EDGE : undefined);
  return chromium.launch({ executablePath: exe, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
};
/** Servidor estático da pasta do jogo (a CDN do three fica bloqueada: o teste roteia **\/three.min.js para o arquivo local) */
exports.serve = (root, port) => {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
  return http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(root, p);
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
  }).listen(port);
};
/** Abre uma página com o personagem de classe `k` ('none' = sem classe) já criado, no tamanho w×h (w < 900 = celular) */
exports.open = async (browser, port, k, w, h) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 });
  await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: exports.three() }));
  await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
  await ctx.addInitScript(([k]) => {
    if (localStorage.getItem('pirata-mapver') !== '800-2') {
      localStorage.setItem('pirata-mapver', '800-2');
      const c = { id: 't1', name: 'Teste', f: false, t: Date.now() }; if (k !== 'none') c.k = k;
      localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [c], active: 't1' }));
    }
  }, [k]);
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await page.goto('http://localhost:' + port + '/index.html#dev');
  await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  return { ctx, page, errs };
};
