/* Testes numéricos dos interiores (sem imagens): vazamento de paredes, alcance dos cômodos e precisão do clique por andar.
   Uso: PLAYWRIGHT=/caminho/playwright/index.mjs THREE_JS=/caminho/three.min.js node tools/test-interiors.mjs [preview/preview.html] */
import fs from 'fs';
import path from 'path';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const file = path.resolve(process.argv[2] || 'preview/preview.html');
const three = fs.readFileSync(process.env.THREE_JS || 'node_modules/three/build/three.min.js', 'utf8');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 800 } });
let errs = 0; p.on('pageerror', e => { errs++; console.log('ERRO na página:', e.message); });
await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: three }));
await p.route('https://fonts.**', r => r.abort());
await p.goto('file://' + file + '#dev'); await p.waitForTimeout(3500);
const res = await p.evaluate(() => {
  const G = __game, P = G.P, out = [], H = G.FLOORS.HOUSES;
  const frame = h => ({ c: Math.cos(h.th), n: Math.sin(h.th) });
  const W = (h, a, b2) => { const { c, n } = frame(h); return [h.x + a * c + b2 * n, h.z - a * n + b2 * c]; };
  P.sit = 0; P.sitT = 0;
  // 1) vazamento: do centro de cada andar não se pode chegar fora das paredes (corpo .3)
  const leak = (name, h, up, start) => {
    P.up = up; G.FLOORS.refreshProps();
    const { c, n } = frame(h), L = (x, z) => [(x - h.x) * c - (z - h.z) * n, (x - h.x) * n + (z - h.z) * c];
    const pr = G.props.filter(o => (o.lvl === undefined || o.lvl === (up ? 1 : 0)) && !(o.dr && o.dr.open)).map(o => [o.hx ?? o.position.x, o.hz ?? o.position.z, o.r]).filter(q => Math.abs(q[0]) < 9e4 && Math.hypot(q[0] - h.x, q[1] - h.z) < 30);
    const free = (x, z) => !pr.some(q => Math.hypot(x - q[0], z - q[1]) < q[2] + .3);
    const st = .12, hx = h.hx * h.K + 2.5, hz = h.hz * h.K + 2.5, w = Math.ceil(hx * 2 / st), d = Math.ceil(hz * 2 / st), seen = new Uint8Array(w * d);
    const s = L(...W(h, ...start)), q = [[Math.floor((s[0] + hx) / st), Math.floor((s[1] + hz) / st)]]; seen[q[0][1] * w + q[0][0]] = 1;
    let cells = 0, lk = 0;
    while (q.length) {
      const [i, j] = q.pop(); cells++;
      const u = -hx + (i + .5) * st, v = -hz + (j + .5) * st;
      if (Math.abs(u) > h.hx * h.K + .9 || Math.abs(v) > h.hz * h.K + .9) { lk++; continue; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, bb = j + dj; if (a < 0 || bb < 0 || a >= w || bb >= d || seen[bb * w + a]) continue; const ww = W(h, -hx + (a + .5) * st, -hz + (bb + .5) * st); if (!free(ww[0], ww[1])) continue; seen[bb * w + a] = 1; q.push([a, bb]); }
    }
    out.push({ t: 'vazamento ' + name, ok: cells > 200 && lk === 0, info: cells + ' células, ' + lk + ' vazando' });
  };
  const tav = H.find(h => h.door === 'tavern-front'), cas = H.find(h => h.sc);
  leak('taberna térreo', tav, false, [0, 1.2]); leak('taberna andar de cima', tav, true, [0, 0]);
  leak('castelo térreo', cas, false, [0, 6]); leak('castelo andar de cima', cas, true, [10, 0]);
  // 2) alcance: pontos que devem ser alcançáveis (distância do destino ao ponto ajustado < .6)
  const reach = (name, h, up, from, pts) => {
    P.up = up; G.FLOORS.refreshProps(); const s = W(h, ...from);
    pts.forEach(q => { const t = W(h, q[0] * h.K, q[1] * h.K), r = G.nav.snapInterior(s[0], s[1], t[0], t[1]); const ok = Array.isArray(r) && Math.hypot(r[0] - t[0], r[1] - t[1]) < .6; out.push({ t: 'alcance ' + name + ' (' + q + ')', ok, info: r === null ? 'ignorado' : r === undefined ? 'fora' : 'ok' }); });
  };
  reach('taberna cima', tav, true, [-3.5 * 1.22, 3.2 * 1.22], [[-3, 3.5], [-2.5, 4], [-3.2, 4.4], [-4.3, -3], [0, -.2], [3, -.2]]);
  reach('taberna térreo', tav, false, [0, 1.2], [[-4.3, 2.5], [0, 0], [3, -.5], [-1, 1]]);
  reach('castelo cima', cas, true, [10, 0], [[10, 5], [8, -8], [5.9, 9.7]]);
  // 2b) casas de um cômodo (mapa de retângulos): alcança o interior e NÃO sai pelas paredes (porta fechada)
  [['trader-front', [-1.4, 1.8], [[-1.4, 0.5], [-2.5, 1], [0, 2], [-3, -1]], [[-1.4, 4], [5, 0], [0, -4.5], [-5, 0]]],
   ['cartog-front', [-1.4, 1.8], [[-1.4, 0.5], [-2.5, 1], [0, 2]], [[-1.4, 4], [5, 0], [0, -4.5], [-5, 0]]],
   ['smith-front', [-1.4, 1.8], [[-1.4, 0.5], [-2.5, 1]], [[-1.4, 4], [-5, 0], [0, -4.5]]],
   ['aves-front', [0.8, 1.8], [[0.8, 0.6], [-0.5, 1.8], [0.2, 0]], [[0.8, 4], [-5, 0], [0, -4.5]]]].forEach(([id, from, ins, outs]) => {
    const h = H.find(q => (q.rects || []).some(r => r.dr && r.dr.id === id));
    if (!h) { out.push({ t: 'casa ' + id, ok: false, info: 'não encontrada' }); return; }
    P.up = false; G.FLOORS.refreshProps(); const s = W(h, from[0] * h.K, from[1] * h.K);
    ins.forEach(q => { const t = W(h, q[0] * h.K, q[1] * h.K), r = G.nav.snapInterior(s[0], s[1], t[0], t[1]); out.push({ t: 'alcance ' + id + ' (' + q + ')', ok: Array.isArray(r) && Math.hypot(r[0] - t[0], r[1] - t[1]) < .6, info: 'ok' }); });
    outs.forEach(q => { const t = W(h, q[0] * h.K, q[1] * h.K), r = G.nav.snapInterior(s[0], s[1], t[0], t[1]); out.push({ t: 'parede ' + id + ' (' + q + ')', ok: !Array.isArray(r) || Math.hypot(r[0] - t[0], r[1] - t[1]) > .6, info: 'fechado' }); });
  });
  // 3) precisão do clique no andar de cima (câmera padrão): ponto livre projetado na tela deve cair a < .5 do esperado
  P.up = true; G.FLOORS.refreshProps();
  const s = W(tav, -3.66, 3.9); P.x = s[0]; P.z = s[1]; P.tx = P.x; P.tz = P.z; window.__tav = tav;
  return out;
});
// clique real na tela
await p.waitForTimeout(2000);
const pts = await p.evaluate(() => { const G = __game, P = G.P, h = __tav, c = Math.cos(h.th), n = Math.sin(h.th); return [[-3, 3.5], [-4.2, 2.6]].map(([a, b2]) => { const w = [h.x + (a * c + b2 * n) * h.K, h.z + (-a * n + b2 * c) * h.K], v = new THREE.Vector3(w[0], P.g.position.y, w[1]).project(G.cam); return [a, b2, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }); });
for (const [a, b2, x, y] of pts) {
  await p.evaluate(() => { const P = __game.P; P.tx = P.x; P.tz = P.z; });
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(80);
  const e = await p.evaluate(([a, b2]) => { const h = __tav, P = __game.P, c = Math.cos(h.th), n = Math.sin(h.th), dx = P.tx - h.x, dz = P.tz - h.z; return Math.hypot((dx * c - dz * n) / h.K - a, (dx * n + dz * c) / h.K - b2); }, [a, b2]);
  res.push({ t: 'clique tela (' + a + ',' + b2 + ')', ok: e < .6, info: 'erro ' + e.toFixed(2) });
}
await b.close();
let bad = 0; res.forEach(r => { console.log((r.ok ? 'OK   ' : 'FALHA') + ' ' + r.t + ' — ' + r.info); if (!r.ok) bad++; });
console.log(bad || errs ? `\n${bad} falha(s), ${errs} erro(s) de página` : '\nTudo certo'); process.exit(bad || errs ? 1 : 0);
