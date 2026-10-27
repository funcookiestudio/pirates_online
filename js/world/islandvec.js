/* Ilha em vetor para o mapa e o minimapa: contornos (marching squares) calculados a partir do relevo da seed atual.
   Camadas, de baixo para cima: mar raso, areia, grama, biomas (mata, seco, rocha), rios/lagos e estradas.
   Coordenadas dos caminhos = pixels da grade do gerador (1 px = 1 m). Vale para qualquer seed: refaz quando a ilha muda. */
import { isl, H, SEA } from './terrain.js';
import { V } from './islandgen.js';

const ST = 2;                         // amostragem: 1 célula = 2 m
let cache = null, cacheFor = null;

/** Campos amostrados (com 1 célula de folga em volta, valendo "fora") */
function fields() {
  const n = Math.floor((V - 1) / ST) + 3, { pm, W, bio } = isl;
  const mk = () => new Float32Array(n * n);
  const h = mk().fill(-9), land = mk(), forest = mk(), dry = mk(), rock = mk(), water = mk(), road = mk();
  for (let j = 0; j < n - 2; j++) for (let i = 0; i < n - 2; i++) {
    const x = Math.min(V - 1, i * ST), z = Math.min(V - 1, j * ST), k = z * V + x, q = (j + 1) * n + i + 1;
    const hh = H[k] - SEA; h[q] = hh;
    if (hh > .55) {
      land[q] = 1;
      const b = bio[k]; if (b === 2) forest[q] = 1; else if (b === 4) dry[q] = 1; else if (b === 5) rock[q] = 1;
    }
    if (hh > -.1 && W[k] > -90 && W[k] - H[k] > .2) water[q] = 1;
    if (hh > -.1 && pm[k] === 1) road[q] = 1;
  }
  return { n, h, forest, dry, rock, water, road };
}
/** Suaviza uma máscara 0/1 (caixa 3x3) para o contorno não ficar serrilhado */
function blur(a, n) {
  const o = new Float32Array(a.length);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    let s = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += a[(j + dj) * n + i + di];
    o[j * n + i] = s / 9;
  }
  return o;
}

/** Contorno de f em `t` como Path2D (marching squares com encadeamento dos segmentos e curvas suaves) */
function contour(f, n, t) {
  const nn = n * n, nb = new Int32Array(nn * 2 * 2).fill(-1);
  const link = (a, b) => { for (const [p, q] of [[a, b], [b, a]]) { if (nb[p * 2] < 0) nb[p * 2] = q; else nb[p * 2 + 1] = q; } };
  const eH = (i, j) => j * n + i, eV = (i, j) => nn + j * n + i;   // aresta horizontal (i,j)-(i+1,j) e vertical (i,j)-(i,j+1)
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = f[j * n + i] >= t, b = f[j * n + i + 1] >= t, c = f[(j + 1) * n + i + 1] >= t, d = f[(j + 1) * n + i] >= t;
    const m = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
    if (m === 0 || m === 15) continue;
    const T = eH(i, j), R = eV(i + 1, j), B = eH(i, j + 1), L = eV(i, j);
    switch (m) {
      case 1: case 14: link(L, T); break;
      case 2: case 13: link(T, R); break;
      case 3: case 12: link(L, R); break;
      case 4: case 11: link(R, B); break;
      case 5: link(L, T); link(R, B); break;
      case 6: case 9: link(T, B); break;
      case 7: case 8: link(L, B); break;
      case 10: link(T, R); link(L, B); break;
    }
  }
  const pt = e => {   // ponto da aresta, interpolado, em pixels da grade
    let i, j, i2, j2;
    if (e < nn) { j = (e / n) | 0; i = e - j * n; i2 = i + 1; j2 = j; } else { const r = e - nn; j = (r / n) | 0; i = r - j * n; i2 = i; j2 = j + 1; }
    const v1 = f[j * n + i], v2 = f[j2 * n + i2], u = v1 === v2 ? .5 : Math.max(0, Math.min(1, (t - v1) / (v2 - v1)));
    return [((i + (i2 - i) * u) - 1) * ST, ((j + (j2 - j) * u) - 1) * ST];
  };
  const path = new Path2D(), seen = new Uint8Array(nn * 2);
  for (let s = 0; s < nn * 2; s++) {
    if (seen[s] || nb[s * 2] < 0) continue;
    const loop = []; let prev = -1, cur = s;
    while (cur >= 0 && !seen[cur]) {
      seen[cur] = 1; loop.push(pt(cur));
      const x = nb[cur * 2], y = nb[cur * 2 + 1], nx = x !== prev && x >= 0 && !seen[x] ? x : (y >= 0 && y !== prev && !seen[y] ? y : -1);
      prev = cur; cur = nx;
    }
    if (loop.length < 4) continue;
    const L = loop.length, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], s0 = mid(loop[L - 1], loop[0]);
    path.moveTo(s0[0], s0[1]);
    for (let k = 0; k < L; k++) { const m2 = mid(loop[k], loop[(k + 1) % L]); path.quadraticCurveTo(loop[k][0], loop[k][1], m2[0], m2[1]); }
    path.closePath();
  }
  return path;
}

/** Camadas da ilha atual (calculadas uma vez por seed) */
export function islandVec() {
  if (cache && cacheFor === isl) return cache;
  const F = fields(), n = F.n;
  const L = (f, t, fill, extra) => ({ p: contour(f, n, t), fill, ...extra });
  cache = [
    L(F.h, -1.4, '#1d4a55'),
    L(F.h, -.1, '#c4a96a', { line: '#6b5a33' }),
    L(F.h, .55, '#4c7a3f'),
    L(blur(F.dry, n), .5, '#8a8a4e'),
    L(blur(F.forest, n), .5, '#34602f'),
    L(blur(F.rock, n), .5, '#77716a'),
    L(blur(F.water, n), .45, '#2f7fa8'),
    L(blur(F.road, n), .3, '#d8c79a')
  ];
  cacheFor = isl;
  return cache;
}

/** Desenha as camadas no contexto `g` (já transformado para pixels da grade); `lw` = espessura do contorno nessa escala */
export function drawIslandVec(g, lw = 1) {
  islandVec().forEach(l => {
    g.fillStyle = l.fill; g.fill(l.p);
    if (l.line) { g.strokeStyle = l.line; g.lineWidth = lw; g.stroke(l.p); }
  });
}

let bake = null, bakeFor = null;
/** Imagem pronta (2 px por metro) para o minimapa, que redesenha várias vezes por segundo */
export function islandBitmap() {
  if (bake && bakeFor === isl) return bake;
  const sz = 2 * (V - 1), cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const g = cv.getContext('2d'); g.fillStyle = '#10232b'; g.fillRect(0, 0, sz, sz);
  g.scale(2, 2); drawIslandVec(g, 1.2);
  bake = cv; bakeFor = isl;
  return bake;
}
