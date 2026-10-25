/* Grade de tiles dos interiores (como o Tibia): cada andar de cada estrutura é uma grade de células de ~0,45 m, gerada dos colisores
   que já existem (paredes, móveis, portas fechadas) + o vão do andar de cima. Cliques e caminhos dentro de casas passam por ela:
   só se anda por células livres do andar em que o personagem está, e o destino é ajustado para a célula livre mais próxima ALCANÇÁVEL. */
import { props } from '../core/registry.js';
import { P } from '../entities/player.js';
import { HOUSES } from './floors.js';
import { rectsOf } from './imap.js';

const CS = .45, R = .33, MAXSNAP = 1.0;   // R: raio do corpo dentro de casas (.3 de colisão + folga) — ver BODY_IN em player-update.js                       // célula (m) e raio do corpo do personagem
const cache = new Map();                       // `${casa}:${andar}` → grade
let ver = 0;
export const invalidateInterior = () => { ver++; };

const frame = h => ({ c: Math.cos(h.th), s: Math.sin(h.th) });
const toU = (h, x, z) => { const { c, s } = frame(h), dx = x - h.x, dz = z - h.z; return [dx * c - dz * s, dx * s + dz * c]; };   // metros no quadro da casa
const toW = (h, u, v) => { const { c, s } = frame(h); return [h.x + u * c + v * s, h.z - u * s + v * c]; };

function build(h, L) {
  const key = HOUSES.indexOf(h) + ':' + L, old = cache.get(key);
  if (old && old.ver === ver) return old;
  const hx = (h.hx || 4.2) * h.K + .9, hz = (h.hz || 3.2) * h.K + .9;
  const w = Math.ceil(hx * 2 / CS), d = Math.ceil(hz * 2 / CS), blk = new Uint8Array(w * d);
  const cx = i => -hx + (i + .5) * CS, cz = j => -hz + (j + .5) * CS;
  const rad = hx * hx + hz * hz;
  for (const p of props) {
    if (p.map && h.rects) continue;   // a casa tem mapa de retângulos: os círculos são só para NPCs
    if (p.lvl !== undefined && p.lvl !== L) continue;
    if (p.dr && p.dr.open) continue;
    const px = p.hx !== undefined ? p.hx : p.position.x, pz = p.hz !== undefined ? p.hz : p.position.z;
    if (Math.abs(px) > 9e4) continue;
    const [u, v] = toU(h, px, pz);
    if (u * u + v * v > rad + 9) continue;
    const m = p.r + R, i0 = Math.max(0, Math.floor((u - m + hx) / CS)), i1 = Math.min(w - 1, Math.floor((u + m + hx) / CS));
    const j0 = Math.max(0, Math.floor((v - m + hz) / CS)), j1 = Math.min(d - 1, Math.floor((v + m + hz) / CS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const a = cx(i) - u, b = cz(j) - v; if (a * a + b * b < m * m) blk[j * w + i] = 1; }
  }
  const occ = blk.slice();   // ocupação real (sem a folga do corpo), só para exibir
  if (h.rects) for (const q of rectsOf(h, L)) {
    for (let j = 0; j < d; j++) { const z = cz(j); if (z < q.v0 - .22 || z > q.v1 + .22) continue; for (let i = 0; i < w; i++) { const x = cx(i); if (x >= q.u0 - .22 && x <= q.u1 + .22) occ[j * w + i] = 1; } }
    const i0 = Math.max(0, Math.floor((q.u0 - R + hx) / CS)), i1 = Math.min(w - 1, Math.floor((q.u1 + R + hx) / CS));
    const j0 = Math.max(0, Math.floor((q.v0 - R + hz) / CS)), j1 = Math.min(d - 1, Math.floor((q.v1 + R + hz) / CS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const a = cx(i) - Math.max(q.u0, Math.min(cx(i), q.u1)), b = cz(j) - Math.max(q.v0, Math.min(cz(j), q.v1));
      if (a * a + b * b < R * R) blk[j * w + i] = 1;
    }
  }
  if (L === 1 && h.upOK) for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {   // andar de cima: onde não há piso (vão da escada, salão do castelo) não se pisa
    const lx = cx(i) / h.K, lz = cz(j) / h.K;
    if (Math.abs(lx) < (h.fx || 5.3) - .3 && Math.abs(lz) < (h.fz || 4.1) - .1 && !h.upOK(lx, lz)) {
      // a borda do vão também é barrada (o corpo tem raio)
      blk[j * w + i] = 1; occ[j * w + i] = 1;
    }
  }
  (h.links || []).forEach(k => {   // pé/topo das escadas: sempre alcançáveis
    if (k.l !== L) return;
    const [u, v] = [k.x * h.K, k.z * h.K];
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const a = cx(i) - u, b = cz(j) - v; if (a * a + b * b < .8 * .8) blk[j * w + i] = 0; }
  });
  const g = { h, L, w, d, hx, hz, blk, occ, ver };
  cache.set(key, g);
  return g;
}
const cellOf = (g, u, v) => [Math.floor((u + g.hx) / CS), Math.floor((v + g.hz) / CS)];
const free = (g, i, j) => i >= 0 && j >= 0 && i < g.w && j < g.d && !g.blk[j * g.w + i];
const center = (g, i, j) => [-g.hx + (i + .5) * CS, -g.hz + (j + .5) * CS];

/** Grade do andar atual da casa que contém o ponto (dentro das paredes + 1 m), ou null */
function gridAt(x, z) {
  for (const h of HOUSES) {
    const dx = x - h.x, dz = z - h.z;
    if (dx * dx + dz * dz > 900) continue;
    const [u, v] = toU(h, x, z);
    if (Math.abs(u) <= (h.hx || 4.2) * h.K + .3 && Math.abs(v) <= (h.hz || 3.2) * h.K + .3) return build(h, P.up && !h.noStair ? 1 : 0);
  }
  return null;
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
/** A* entre células (8 vizinhos, sem cortar quinas). `goal` null → devolve o conjunto alcançável (Map de custo) */
function search(g, si, sj, ti, tj) {
  const N = g.w * g.d, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const push = (f, n) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let k = 0; for (;;) { let a = k * 2 + 1, b = a + 1, m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return t; };
  const s = sj * g.w + si; gs[s] = 0; push(0, s);
  let best = s, bh = 1e9;
  while (heap.length) {
    const [, n] = pop(); if (closed[n]) continue; closed[n] = 1;
    const ci = n % g.w, cj = (n / g.w) | 0;
    const hh = Math.hypot(ci - ti, cj - tj); if (hh < bh) { bh = hh; best = n; }
    if (ci === ti && cj === tj) break;
    for (const [di, dj, c] of DIRS) {
      const ni = ci + di, nj = cj + dj; if (!free(g, ni, nj)) continue;
      if (di && dj && (!free(g, ci + di, cj) || !free(g, ci, cj + dj))) continue;
      const m = nj * g.w + ni, ng = gs[n] + c; if (ng >= gs[m]) continue;
      gs[m] = ng; from[m] = n; push(ng + Math.hypot(ni - ti, nj - tj), m);
    }
  }
  const out = []; for (let n = best; n >= 0; n = from[n]) out.push([n % g.w, (n / g.w) | 0]);
  return { path: out.reverse(), exact: best === tj * g.w + ti };
}
const los = (g, a, b) => {   // linha livre entre duas células
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1;
  for (let k = 0; k <= n; k++) { const t = k / n, i = Math.round(a[0] + (b[0] - a[0]) * t), j = Math.round(a[1] + (b[1] - a[1]) * t); if (!free(g, i, j)) return false; if (k && !free(g, Math.floor(a[0] + (b[0] - a[0]) * t + .5), Math.floor(a[1] + (b[1] - a[1]) * t + .5))) return false; }
  return true;
};
const nearestFree = (g, i, j) => {
  if (free(g, i, j)) return [i, j];
  for (let r = 1; r < 8; r++) { let best = null, bd = 1e9; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; if (free(g, i + di, j + dj) && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = [i + di, j + dj]; } } if (best) return best; }
  return null;
};

/** Plano para (tx,tz) a partir de (x,z). Devolve { pts:[[x,z]...], goal:[x,z], exact } ou null se um dos pontos não está num interior */
export function planInterior(x, z, tx, tz) {
  const g = gridAt(x, z); if (!g || gridAt(tx, tz) !== g && (!gridAt(tx, tz) || gridAt(tx, tz).h !== g.h)) return null;
  const [su, sv] = toU(g.h, x, z), [tu, tv] = toU(g.h, tx, tz);
  const s = nearestFree(g, ...cellOf(g, su, sv)), t0 = cellOf(g, tu, tv); if (!s) return { pts: [], goal: null, exact: false };
  const t = nearestFree(g, ...t0); if (!t) return { pts: [], goal: null, exact: false };
  const r = search(g, s[0], s[1], t[0], t[1]);
  let cells = r.path; if (!cells.length) return { pts: [], goal: null, exact: false };
  const sm = [cells[0]]; let a = 0;                    // suaviza: pula para a célula mais longe com linha livre
  while (a < cells.length - 1) { let b = cells.length - 1; while (b > a + 1 && !los(g, cells[a], cells[b])) b--; sm.push(cells[b]); a = b; }
  const pts = sm.slice(1).map(c => toW(g.h, ...center(g, c[0], c[1])));
  const last = cells[cells.length - 1], goal = toW(g.h, ...center(g, last[0], last[1]));
  return { pts, goal, exact: r.exact };
}

/** Clique: ajusta o destino para a célula livre alcançável mais próxima (null = destino impossível, ignora o clique); undefined = não é interior */
export function snapInterior(x, z, tx, tz) {
  const g = gridAt(tx, tz); if (!g) return undefined;
  if (!gridAt(x, z) || gridAt(x, z).h !== g.h) return undefined;
  const [tu, tv] = toU(g.h, tx, tz);
  if (g.h.inBox && !g.h.inBox(tu / g.h.K, tv / g.h.K)) return undefined;   // fora das paredes: não é do interior (saída pela porta é tratada à parte)
  const p = planInterior(x, z, tx, tz);
  if (!p || !p.goal) return null;
  const [gu, gv] = toU(g.h, ...p.goal);
  if (Math.hypot(gu - tu, gv - tv) > MAXSNAP) return null;      // clicou numa parede/vão/móvel longe de qualquer lugar alcançável: ignora (e avisa)
  return p.exact && free(g, ...cellOf(g, tu, tv)) ? [tx, tz] : p.goal;
}

// ---- seguir o caminho (um passo de cada vez) ----
const FOLLOW = { key: '', pts: [], i: 0, ver: -1, gx: 0, gz: 0 };
/** Próximo ponto do caminho de (x,z) até (tx,tz) dentro de um interior; null → usar o caminho normal (ao ar livre) */
export function interiorWaypoint(x, z, tx, tz) {
  const g = gridAt(x, z); if (!g) return null;
  const g2 = gridAt(tx, tz); if (!g2 || g2.h !== g.h) return null;
  const key = tx.toFixed(1) + ',' + tz.toFixed(1) + ',' + HOUSES.indexOf(g.h) + ',' + (P.up ? 1 : 0);
  if (FOLLOW.key !== key || FOLLOW.ver !== ver) {
    const p = planInterior(x, z, tx, tz);
    FOLLOW.key = key; FOLLOW.ver = ver; FOLLOW.i = 0; FOLLOW.pts = p ? p.pts : [];
    if (!p || !p.goal) return [x, z];
  }
  while (FOLLOW.i < FOLLOW.pts.length - 1 && Math.hypot(FOLLOW.pts[FOLLOW.i][0] - x, FOLLOW.pts[FOLLOW.i][1] - z) < .45) FOLLOW.i++;
  const q = FOLLOW.pts[FOLLOW.i];
  return q || [tx, tz];
}

/** Resto do caminho que o personagem está seguindo dentro da casa até (tx,tz) (para o diagnóstico); null se não há plano ativo */
export function interiorRoute(tx, tz) {
  const g = gridAt(P.x, P.z); if (!g) return null;
  const key = tx.toFixed(1) + ',' + tz.toFixed(1) + ',' + HOUSES.indexOf(g.h) + ',' + (P.up ? 1 : 0);
  return FOLLOW.key === key && FOLLOW.ver === ver ? FOLLOW.pts.slice(FOLLOW.i) : null;
}
export const navVersion = () => ver;
/** Para o modo de depuração: células do andar atual da casa onde o personagem está { h, cells:[{x,z,free}], size } ou null */
export function debugGrid() {
  const g = gridAt(P.x, P.z); if (!g) return null;
  const cells = [];
  for (let j = 0; j < g.d; j++) for (let i = 0; i < g.w; i++) { const c = center(g, i, j), hh = g.h; if (hh.inBox ? !hh.inBox(c[0], c[1]) : (hh.hx && (Math.abs(c[0]) > hh.hx || Math.abs(c[1]) > hh.hz))) continue; const [x, z] = toW(g.h, ...c); cells.push({ x, z, free: !(g.h.rects ? g.occ : g.blk)[j * g.w + i] }); }
  return { h: g.h, L: g.L, cells, size: CS };
}
