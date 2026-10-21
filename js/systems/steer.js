/* Navegação simples: desvia de árvores, pedras, casas e muralha, e não fica preso em cantos.
   steer() gira a direção desejada para o ângulo livre mais próximo; collide() empurra para fora dos obstáculos. */
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';

const OFFS = [0, .35, .7, 1.05, 1.5, 2.0, 2.6];

/** O caminho reto de (x,z) na direção `a` por `len` metros está livre para um corpo de raio `r`? */
function clear(x, z, a, len, r) {
  const dx = Math.sin(a), dz = Math.cos(a);
  for (let i = 0; i < props.length; i++) {
    const p = props[i], px = p.position.x - x, pz = p.position.z - z;
    const t = Math.max(0, Math.min(len, px * dx + pz * dz));
    const cx = px - dx * t, cz = pz - dz * t;
    const m = p.r + r + .15;
    if (cx * cx + cz * cz < m * m) return false;
  }
  return true;
}

/**
 * Desvia a velocidade desejada (wx,wz). `mem` guarda o lado escolhido para não ficar oscilando.
 * `goal` = distância até o destino (obstáculos além dele são ignorados).
 */
export function steer(x, z, wx, wz, r, mem, goal = 99) {
  const sp = Math.hypot(wx, wz);
  if (sp < .01) return [wx, wz];
  const a0 = Math.atan2(wx, wz), len = Math.min(goal, 2.2 + r + sp * .25);
  if (clear(x, z, a0, len, r)) { if (mem) mem.side = 0; return [wx, wz]; }
  const first = mem && mem.side ? mem.side : (Math.random() < .5 ? 1 : -1);
  for (const o of OFFS) {
    for (const s of [first, -first]) {
      if (clear(x, z, a0 + o * s, len, r)) {
        if (mem) mem.side = s; // mantém o lado até o caminho ficar livre
        const a = a0 + o * s;
        return [Math.sin(a) * sp, Math.cos(a) * sp];
      }
    }
  }
  // tudo bloqueado: contorna de lado
  const a = a0 + 1.57 * first;
  return [Math.sin(a) * sp * .6, Math.cos(a) * sp * .6];
}

/** Empurra o ponto `q` ({x,z}) para fora dos obstáculos (deslizando pela borda) */
export function collide(q, r) {
  for (let i = 0; i < props.length; i++) {
    const p = props[i], ex = q.x - p.position.x, ez = q.z - p.position.z, dd = Math.hypot(ex, ez) || .01, m = p.r + r;
    if (dd < m) { q.x = p.position.x + ex / dd * m; q.z = p.position.z + ez / dd * m; }
  }
}

// ---------- caminho (A*) em grade, para contornar construções, muralha e aglomerados ----------
const N = 128, ORG = -64;
let grid = null, gridN = -1;
const cell = v => Math.floor(v - ORG);

function buildGrid() {
  grid = new Uint8Array(N * N);
  gridN = props.length;
  props.forEach(p => {
    const R = p.r + .65;
    for (let cx = cell(p.position.x - R); cx <= cell(p.position.x + R); cx++) {
      for (let cz = cell(p.position.z - R); cz <= cell(p.position.z + R); cz++) {
        if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
        if (Math.hypot(cx + ORG + .5 - p.position.x, cz + ORG + .5 - p.position.z) < R) grid[cz * N + cx] = 1;
      }
    }
  });
}

function nearestFree(cx, cz) {
  for (let r = 0; r < 6; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = cx + dx, z = cz + dz;
      if (x >= 0 && z >= 0 && x < N && z < N && !grid[z * N + x]) return z * N + x;
    }
  }
  return -1;
}

/** A* de (sx,sz) até (gx,gz); devolve lista de pontos [x,z] suavizada, ou null */
function findPath(sx, sz, gx, gz, r) {
  if (!grid || gridN !== props.length) buildGrid();
  const s = nearestFree(cell(sx), cell(sz)), g = nearestFree(Math.max(0, Math.min(N - 1, cell(gx))), Math.max(0, Math.min(N - 1, cell(gz))));
  if (s < 0 || g < 0) return null;
  const gxc = g % N, gzc = (g / N) | 0;
  const gS = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
  const heap = [[0, s]];
  gS[s] = 0;
  const push = it => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (l + 1 < heap.length && heap[l + 1][0] < heap[m][0]) m = l + 1; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let it = 0, found = false;
  while (heap.length && it++ < 9000) {
    const [, c] = pop();
    if (closed[c]) continue;
    closed[c] = 1;
    if (c === g) { found = true; break; }
    const cx = c % N, cz = (c / N) | 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= N || z >= N || grid[z * N + x]) continue;
      if (dx && dz && (grid[cz * N + x] || grid[z * N + cx])) continue; // não corta quina
      const n = z * N + x, ng = gS[c] + (dx && dz ? 1.414 : 1);
      if (ng < gS[n]) { gS[n] = ng; from[n] = c; const h = Math.max(Math.abs(x - gxc), Math.abs(z - gzc)) + .414 * Math.min(Math.abs(x - gxc), Math.abs(z - gzc)); push([ng + h, n]); }
    }
  }
  if (!found) return null;
  const pts = [];
  for (let c = g; c !== -1; c = from[c]) pts.push([c % N + ORG + .5, ((c / N) | 0) + ORG + .5]);
  pts.reverse();
  pts[pts.length - 1] = [gx, gz];
  // suaviza: pula pontos intermediários quando a linha reta está livre
  const out = [];
  let i = 0, cur = [sx, sz];
  while (i < pts.length) {
    let j = pts.length - 1;
    for (; j > i; j--) {
      const dx = pts[j][0] - cur[0], dz = pts[j][1] - cur[1];
      if (clear(cur[0], cur[1], Math.atan2(dx, dz), Math.hypot(dx, dz), r)) break;
    }
    out.push(pts[j]);
    cur = pts[j];
    i = j + 1;
  }
  return out;
}

/**
 * Para onde ir agora para chegar a (gx,gz): o próprio destino se o caminho reto está livre;
 * senão o próximo ponto de um caminho calculado (recalculado quando o destino muda ou a cada ~1 s).
 * `mem` é do dono (guarda o caminho).
 */
export function navTarget(mem, x, z, gx, gz, r, now) {
  const d = Math.hypot(gx - x, gz - z);
  if (d < .5 || clear(x, z, Math.atan2(gx - x, gz - z), d, r)) { mem.path = null; return [gx, gz]; }
  const t = now || performance.now();
  if (!mem.path || Math.hypot(mem.gx - gx, mem.gz - gz) > 2.5 || t - mem.pt > 1200) {
    mem.path = findPath(x, z, gx, gz, r);
    mem.gx = gx; mem.gz = gz; mem.pt = t;
  }
  if (!mem.path) return [gx, gz];
  while (mem.path.length > 1 && Math.hypot(mem.path[0][0] - x, mem.path[0][1] - z) < .8) mem.path.shift();
  return mem.path[0];
}

/** Leva um ponto clicado para o ponto livre mais próximo (fora de paredes, casas e árvores), para o destino ser alcançável */
export function freePoint(x, z, r = .6) {
  const inside = Math.hypot(x, z) < VILLAGE_R; // clicou dentro da vila: o ponto livre também fica dentro da muralha
  const free = (px, pz) => (!inside || Math.hypot(px, pz) < VILLAGE_R - 1.7) && props.every(p => Math.hypot(px - p.position.x, pz - p.position.z) >= p.r + r);
  if (free(x, z)) return { x, z };
  for (let rad = .5; rad <= 8; rad += .5) {
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad;
      if (free(px, pz)) return { x: px, z: pz };
    }
  }
  return { x, z };
}
