/* Laboratório de mapas: gera ilhas por semente SEM abrir o jogo, mede a qualidade do layout e desenha o mapa de cima (PNG).
   Uso: node tools/map-lab.mjs [--png pasta] semente1 semente2 ...       (sem sementes: testa 'pirata' e mais 11 candidatas)
   Métricas (falha = ✗): porto/vila/castelo/fazendas/8 acampamentos/5 dungeons existem · vila perto do porto · castelo mais alto que a vila ·
   tudo alcançável por estrada · perigo (custo de caminho) cresce com o nível · distâncias mínimas · declive máximo nas estradas. */
import { build as esbuild } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await esbuild({ entryPoints: [path.join(root, 'js/world/islandgen.js')], bundle: true, format: 'esm', write: false });
const code = out.outputFiles[0].text;
const { build, N, V } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

const args = process.argv.slice(2);
let pngDir = null;
const pi = args.indexOf('--png'); if (pi >= 0) { pngDir = args[pi + 1]; args.splice(pi, 2); mkdirSync(pngDir, { recursive: true }); }
const seeds = args.length ? args : ['pirata', 'corvo', 'tormenta', 'caveira', 'ilha5', 'ilha6', 'ilha7', 'ilha8', 'ilha9', 'ilha10', 'ilha11', 'ilha12'];

function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function draw(r, file) {
  const S = 1, W = V * S, img = Buffer.alloc(W * W * 3);
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= W) return; const o = (y * W + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
  for (let k = 0; k < V * V; k++) {
    const h = r.H[k], o = k * 3; let c;
    if (r.W[k] > -90 && r.W[k] - h > .2) c = [70, 140, 190];
    else if (h < .3) c = h < -1 ? [20, 60, 110] : [40, 100, 160];
    else { const t = Math.min(1, h / 9); c = [90 + t * 120, 150 + t * 40 - t * 60, 70 + t * 110]; if (r.pm[k] === 1) c = [190, 150, 90]; else if (r.pm[k] === 2) c = [150, 130, 80]; }
    img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
  }
  const dot = (gx, gz, rad, c) => { const x = gx + N / 2, z = gz + N / 2; for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (i * i + j * j <= rad * rad) put(x + i, z + j, c); };
  const L = r.layout, vil = r.pois[1], por = r.pois[0];
  dot(vil.x, vil.z, 12, [255, 140, 0]); dot(por.x, por.z, 7, [0, 230, 255]); dot(L.castle.x, L.castle.z, 11, [200, 40, 200]);
  L.farms.forEach(f => dot(f.x, f.z, 8, [255, 255, 0]));
  L.camps.forEach((c, i) => dot(c.x, c.z, 6 + (i >> 1), [255, 40 + i * 10, 40]));
  L.dungeons.forEach(d => dot(d.x, d.z, 6, [90, 40, 120]));
  writeFileSync(file, png(W, W, img));
}

let fails = 0;
for (const seed of seeds) {
  const t0 = Date.now(); let r;
  try { r = build(seed, 'redonda'); } catch (e) { console.log(seed, '✗ erro', e.message); fails++; continue; }
  const L = r.layout, vil = r.pois[1], por = r.pois[0], bad = [];
  const dd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const hAt = p => r.H[Math.round(p.z + N / 2) * V + Math.round(p.x + N / 2)];
  if (dd(vil, por) < 45 || dd(vil, por) > 110) bad.push('vila↔porto ' + Math.round(dd(vil, por)) + ' m');
  if (hAt(L.castle) - hAt(vil) < 1) bad.push('castelo não está no alto');
  if (L.farms.length < 3) bad.push('fazendas ' + L.farms.length);
  if (L.camps.length < 8) bad.push('acampamentos ' + L.camps.length);
  if (L.dungeons.length < 5) bad.push('dungeons ' + L.dungeons.length);
  for (const c of L.camps) if (hAt(c) < .8) bad.push('acampamento na água');
  // crescimento do perigo: t (custo de caminho normalizado) deve subir com a ordem
  for (let i = 1; i < L.camps.length; i++) if (L.camps[i].t < L.camps[i - 1].t) bad.push('perigo fora de ordem');
  // castelo: pico da ilha, alcançável a pé pela rampa, e nenhuma estrada além da dele entra na mesa
  { let mx = -9; for (let k = 0; k < V * V; k++) if (r.H[k] > mx) mx = r.H[k];
    const ch = hAt(L.castle); if (mx - ch > 3) bad.push('castelo ' + (mx - ch).toFixed(1) + ' m abaixo do pico');
    const near = q => q.pts.some(p => Math.hypot(p[0] - L.castle.x, p[1] - L.castle.z) < 38);
    const ro = r.roads.filter(near); if (ro.length !== 1 || ro[0].n !== 'Castelo') bad.push('estradas na mesa: ' + ro.map(q => q.n).join(','));
    const seen = new Uint8Array(V * V), st = [Math.round(vil.z + N / 2) * V + Math.round(vil.x + N / 2)]; seen[st[0]] = 1;
    while (st.length) { const c = st.pop(); for (const o of [1, -1, V, -V]) { const t = c + o; if (t > 0 && t < V * V && !seen[t] && !r.nav[t]) { seen[t] = 1; st.push(t); } } }
    if (!seen[Math.round(L.castle.z + N / 2) * V + Math.round(L.castle.x + N / 2)]) bad.push('castelo inalcançável');
    // sem a rampa (corredor +-0.3 rad voltado à vila) a mesa precisa ficar isolada
    const ra = Math.atan2(Math.cos(L.castle.th), Math.sin(L.castle.th)), seen2 = new Uint8Array(V * V); st.push(Math.round(vil.z + N / 2) * V + Math.round(vil.x + N / 2)); seen2[st[0]] = 1;
    const cx0 = L.castle.x + N / 2, cz0 = L.castle.z + N / 2;
    const cut = t => { const i = t % V, j = (t / V) | 0, d = Math.hypot(i - cx0, j - cz0); if (d < 36 || d > 100) return false; let a = Math.abs(Math.atan2(j - cz0, i - cx0) - ra); a = Math.min(a, 6.2832 - a); return a < .3; };
    while (st.length) { const c = st.pop(); for (const o of [1, -1, V, -V]) { const t = c + o; if (t > 0 && t < V * V && !seen2[t] && !r.nav[t] && !cut(t)) { seen2[t] = 1; st.push(t); } } }
    if (seen2[Math.round(cz0) * V + Math.round(cx0)]) bad.push('mesa alcançável fora da rampa'); }
  // declive das estradas
  let maxS = 0; for (const road of r.roads) for (let i = 1; i < road.pts.length; i++) { const a = road.pts[i - 1], b = road.pts[i], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; maxS = Math.max(maxS, Math.abs(a[2] - b[2]) / d); }
  if (maxS > .45) bad.push('declive de estrada ' + maxS.toFixed(2));
  const tot = r.roads.reduce((s, q) => s + q.pts.length, 0);
  console.log((bad.length ? '✗' : '✓'), seed.padEnd(9), (Date.now() - t0) + ' ms', 'terra', (r.land * 100 | 0) + '%', 'vila↔porto', Math.round(dd(vil, por)) + 'm', 'castelo', '+' + (hAt(L.castle) - hAt(vil)).toFixed(1) + 'm', 'camps', L.camps.length, 'dung', L.dungeons.length, 'estradas', r.roads.length, tot + ' pts', 'rios', r.rivers.length, bad.length ? '← ' + bad.join(' · ') : '');
  if (bad.length) fails++;
  if (pngDir) draw(r, path.join(pngDir, seed + '.png'));
}
process.exit(fails ? 1 : 0);
