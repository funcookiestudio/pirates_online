/* Navegação simples: desvia de árvores, pedras, casas e muralha, e não fica preso em cantos.
   steer() gira a direção desejada para o ângulo livre mais próximo; collide() empurra para fora dos obstáculos. */
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { dIn, dPath } from '../dungeon/dgrid.js';
import { houseNear, houseAt } from '../world/floors.js';
import { walkable, swimmable, nearObstacle, roadAt, heightAt } from '../world/terrain.js';

/** O jogador pode passar por água (nadar); inimigos e pets não */
let SW = false;
export const setSwim = v => { SW = v; };
/** Jogador dentro de casa com mapa de retângulos: o desvio ignora os círculos antigos da casa */
let MAPPED = false;
export const setMapped = v => { MAPPED = v; };

/** Raio do corpo do jogador dentro/junto de casas (a grade dos interiores usa o mesmo valor + folga) */
export const BODY_IN = .3;
/** Raio do corpo do jogador em (x,z): fino a menos de 0,3 m de uma casa, 0,5 fora. Fonte única: a colisão (clampToWorld) e o planejamento
    (navTarget/steer) usam o mesmo valor, senão o plano passa por vãos em que o corpo real não cabe e o personagem trava nas quinas */
export const bodyR = (x, z) => houseNear(x, z, .3) ? BODY_IN : .5;
/** Memória de navegação do jogador (lado escolhido, caminho, pontos onde travou) */
export const STEER = { side: 0, road: true };   // road: viagens longas seguem o caminho de menor custo (estradas)

/** Depuração do auto (mostrada junto do FPS): o que ele está tentando fazer agora */
export const AUTODBG = { why: '-', stuck: 0 };

const OFFS = [0, .35, .7, 1.05, 1.5, 2.0, 2.6];

/** O caminho reto de (x,z) na direção `a` por `len` metros está livre para um corpo de raio `r`? */
function clear(x, z, a, len, r) {
  const dx = Math.sin(a), dz = Math.cos(a);
  // relevo, mar e vegetação (com o raio do corpo) ao longo do caminho, de meio em meio metro
  const ds = dIn(x, z) ? .2 : .5;   // na dungeon amostra mais fino: com 0,5 m a reta raspava nas quinas das paredes sem ser vista
  for (let t = ds; t < len + ds; t += ds) {
    const px = x + dx * Math.min(t, len), pz = z + dz * Math.min(t, len);
    if (!(SW ? swimmable : walkable)(px, pz) || nearObstacle(px, pz, r)) return false;
  }
  const mg = houseNear(x, z) ? .03 : .15;   // dentro de casa a folga é menor (corredores e portas estreitos)
  for (let i = 0; i < props.length; i++) {
    const p = props[i]; if (MAPPED && p.map) continue;
    const px = p.position.x - x, pz = p.position.z - z;
    const t = Math.max(0, Math.min(len, px * dx + pz * dz));
    const cx = px - dx * t, cz = pz - dz * t;
    const m = p.r + r + mg;
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
  if (dIn(x, z)) return [wx, wz];   // dungeon: o caminho (dPath) já contorna as paredes; o leque lateral só empurrava para dentro delas nos corredores de 2 m
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
const N = 340, ORG = -170;   // cobre a ilha inteira (±150 m) com folga
let grid = null, gridN = -1, cost = null, hgt = null;
const cell = v => Math.floor(v - ORG);
/** Obriga a recalcular a grade (colisões de andar mudaram) */
export function invalidateGrid() { gridN = -1; }

function buildGrid() {
  grid = new Uint8Array(N * N);
  cost = new Uint8Array(N * N).fill(10);          // custo por célula (décimos): estrada barata, perto de obstáculo caro
  hgt = new Float32Array(N * N);
  gridN = props.length;
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const x = cx + ORG + .5, z = cz + ORG + .5, k = cz * N + cx;
    hgt[k] = heightAt(x, z);
    if (!walkable(x, z) || nearObstacle(x, z, .5)) grid[k] = 1;      // vegetação com folga para o corpo
    else if (roadAt(x, z)) cost[k] = 4;
    else if (nearObstacle(x, z, 1.6)) cost[k] = 16;
  }
  // folga em volta de paredes, encostas, água e árvores: caminho prefere ficar longe da borda (custo extra perto dela)
  const raw = grid.slice();
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  props.forEach(p => {
    if (p.ng) return;
    const R = p.r + .5;
    for (let cx = cell(p.position.x - R); cx <= cell(p.position.x + R); cx++) {
      for (let cz = cell(p.position.z - R); cz <= cell(p.position.z + R); cz++) {
        if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
        if (Math.hypot(cx + ORG + .5 - p.position.x, cz + ORG + .5 - p.position.z) < R) grid[cz * N + cx] = 1;
      }
    }
  });
  const near1 = new Uint8Array(N * N);
  for (let cz = 1; cz < N - 1; cz++) for (let cx = 1; cx < N - 1; cx++) {
    const k = cz * N + cx;
    if (grid[k]) continue;
    for (const [a, b] of nb) if (grid[k + b * N + a]) { near1[k] = 1; break; }
    if (near1[k]) cost[k] = Math.min(250, cost[k] + 22);
  }
  for (let cz = 2; cz < N - 2; cz++) for (let cx = 2; cx < N - 2; cx++) {
    const k = cz * N + cx;
    if (grid[k] || near1[k]) continue;
    for (const [a, b] of nb) if (near1[k + b * N + a]) { cost[k] = Math.min(250, cost[k] + 7); break; }
  }
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

/** (teste) caminho calculado */
export const pathTo = (sx, sz, gx, gz, r = .5) => findPath(sx, sz, gx, gz, r);

/** Caminho fino (células de 25 cm) para dentro e em volta de casas: enxerga paredes, móveis e portas de verdade */
function localPath(sx, sz, gx, gz, r, strict) {
  const x0 = Math.min(sx, gx) - 3, z0 = Math.min(sz, gz) - 3, x1 = Math.max(sx, gx) + 3, z1 = Math.max(sz, gz) + 3;
  if (x1 - x0 > 30 || z1 - z0 > 30) return null;
  const S = .25, W = Math.ceil((x1 - x0) / S), H = Math.ceil((z1 - z0) / S);
  const cand = props.filter(p => p.position.x > x0 - p.r - r && p.position.x < x1 + p.r + r && p.position.z > z0 - p.r - r && p.position.z < z1 + p.r + r);
  const blk = new Uint8Array(W * H);
  for (const p of cand) {
    const R = p.r + r;
    for (let cz = Math.max(0, Math.floor((p.position.z - R - z0) / S)); cz <= Math.min(H - 1, Math.floor((p.position.z + R - z0) / S)); cz++)
      for (let cx = Math.max(0, Math.floor((p.position.x - R - x0) / S)); cx <= Math.min(W - 1, Math.floor((p.position.x + R - x0) / S)); cx++)
        if (Math.hypot(x0 + (cx + .5) * S - p.position.x, z0 + (cz + .5) * S - p.position.z) < R) blk[cz * W + cx] = 1;
  }
  const ci = (x, z) => Math.max(0, Math.min(W - 1, Math.floor((x - x0) / S))) + Math.max(0, Math.min(H - 1, Math.floor((z - z0) / S))) * W;
  const near = c => {   // célula livre mais perto (o início/fim pode estar "dentro" de uma margem)
    if (!blk[c]) return c;
    const cx = c % W, cz = (c / W) | 0;
    for (let k = 1; k < 8; k++) for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== k) continue;
      const x = cx + a, z = cz + b; if (x >= 0 && z >= 0 && x < W && z < H && !blk[z * W + x]) return z * W + x;
    }
    return -1;
  };
  const s = near(ci(sx, sz)), g = near(ci(gx, gz));
  if (s < 0 || g < 0) return null;
  const gc = g % W, gr = (g / W) | 0, gS = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
  const heap = [[0, s]]; gS[s] = 0; let best = s, bh = 1e9, found = false;
  const push = it => { heap.push(it); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (l + 1 < heap.length && heap[l + 1][0] < heap[m][0]) m = l + 1; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [, c] = pop(); if (closed[c]) continue; closed[c] = 1;
    if (c === g) { found = true; break; }
    const cx = c % W, cz = (c / W) | 0, hh = Math.hypot(cx - gc, cz - gr); if (hh < bh) { bh = hh; best = c; }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= H) continue;
      const n = z * W + x; if (blk[n] || closed[n]) continue;
      if (dx && dz && (blk[cz * W + x] || blk[z * W + cx])) continue;   // não corta quinas
      const ng = gS[c] + (dx && dz ? 1.414 : 1);
      if (ng < gS[n]) { gS[n] = ng; from[n] = c; push([ng + Math.hypot(x - gc, z - gr), n]); }
    }
  }
  if (strict && !found) return null;   // com o corpo inteiro não há caminho completo: quem chamou tenta de novo com folga menor
  const end = found ? g : best; if (!found && best === s) return null;
  const pts = []; for (let c = end; c !== -1; c = from[c]) pts.push([x0 + ((c % W) + .5) * S, z0 + (((c / W) | 0) + .5) * S]);
  pts.reverse(); if (found) pts[pts.length - 1] = [gx, gz];
  const seg = (ax, az, bx, bz) => {   // linha reta livre? (distância de cada obstáculo ao segmento)
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
    for (const p of cand) { const t = Math.max(0, Math.min(1, ((p.position.x - ax) * dx + (p.position.z - az) * dz) / L2)); if (Math.hypot(ax + dx * t - p.position.x, az + dz * t - p.position.z) < p.r + r - .02) return false; }
    return true;
  };
  const out = []; let i = 0, cur = [sx, sz];
  while (i < pts.length) { let j = pts.length - 1; for (; j > i; j--) if (seg(cur[0], cur[1], pts[j][0], pts[j][1])) break; out.push(pts[j]); cur = pts[j]; i = j + 1; }
  return out;
}

/** A* de (sx,sz) até (gx,gz); devolve lista de pontos [x,z] suavizada, ou null */
function findPath(sx, sz, gx, gz, r, bad) {
  if (dIn(sx, sz)) return dPath(sx, sz, gx, gz, bad);      // dentro da dungeon: caminho pela grade (destino em parede/inalcançável vai ao piso mais perto)
  if (houseNear(sx, sz) || houseNear(gx, gz)) {   // casas: grade fina de 25 cm
    // 1º com o raio real do corpo (o mesmo da colisão): vãos estreitos nas quinas ficam fechados; 2º, se não houver caminho completo, com folga menor
    const lp = localPath(sx, sz, gx, gz, r, true) || localPath(sx, sz, gx, gz, Math.min(r, .42));
    if (lp) return lp;
  }
  if (!grid || gridN !== props.length) buildGrid();
  const s = nearestFree(cell(sx), cell(sz)), g = nearestFree(Math.max(0, Math.min(N - 1, cell(gx))), Math.max(0, Math.min(N - 1, cell(gz))));
  if (s < 0 || g < 0) return null;
  const gxc = g % N, gzc = (g / N) | 0;
  const gS = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
  const heap = [[0, s]];
  gS[s] = 0;
  const pen = new Map();   // pontos onde o personagem já travou: custo extra em volta
  if (bad) bad.forEach(([bx, bz]) => { const bc = cell(bx), bz2 = cell(bz); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) pen.set((bz2 + b) * N + bc + a, 60); });
  let best = s, bh = 1e9;
  const push = it => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (l + 1 < heap.length && heap[l + 1][0] < heap[m][0]) m = l + 1; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let it = 0, found = false;
  while (heap.length && it++ < 120000) {
    const [, c] = pop();
    if (closed[c]) continue;
    closed[c] = 1;
    if (c === g) { found = true; break; }
    const cx = c % N, cz = (c / N) | 0;
    { const hh = Math.hypot(cx - gxc, cz - gzc); if (hh < bh) { bh = hh; best = c; } }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= N || z >= N || grid[z * N + x]) continue;
      // diagonais livres: o corpo cabe em quinas de 1 célula
      const n = z * N + x, ng = gS[c] + (dx && dz ? 1.414 : 1) * cost[n] / 10 + Math.abs(hgt[n] - hgt[c]) * 3 + (pen.get(n) || 0) / 10;
      if (ng < gS[n]) { gS[n] = ng; from[n] = c; const h = Math.max(Math.abs(x - gxc), Math.abs(z - gzc)) + .414 * Math.min(Math.abs(x - gxc), Math.abs(z - gzc)); push([ng + h * .45, n]); }
    }
  }
  // destino inalcançável (cercado por muros, água, encosta): vai até o ponto alcançável mais próximo dele
  let end = g;
  if (!found) { if (best === s) return null; end = best; }
  const pts = [];
  for (let c = end; c !== -1; c = from[c]) pts.push([c % N + ORG + .5, ((c / N) | 0) + ORG + .5]);
  pts.reverse();
  if (found) pts[pts.length - 1] = [gx, gz];
  // suaviza: pula pontos intermediários quando a linha reta está livre
  const out = [];
  let i = 0, cur = [sx, sz];
  while (i < pts.length) {
    let j = pts.length - 1;
    for (; j > i; j--) {
      const dx = pts[j][0] - cur[0], dz = pts[j][1] - cur[1];
      if (Math.hypot(dx, dz) > 7 && j > i + 1) continue;    // atalhos curtos: não corta o traçado das estradas
      if (clear(cur[0], cur[1], Math.atan2(dx, dz), Math.hypot(dx, dz), r + .3)) break;
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
export const VIZ = { wp: null };   // próximo ponto de passagem (para a linha de rota dos ajustes)
export function navTarget(mem, x, z, gx, gz, r, now) {
  const d = Math.hypot(gx - x, gz - z);
  if (d < .5 || (!(mem.road && d > 14) && clear(x, z, Math.atan2(gx - x, gz - z), d, r))) { mem.path = null; return [gx, gz]; }
  const t = now || performance.now();
  if (!mem.path || Math.hypot(mem.gx - gx, mem.gz - gz) > 2.5 || (!mem.road && t - mem.pt > 1200)) {
    if (mem.bad) mem.bad = mem.bad.filter(b => t - b[2] < 25000);   // pontos de travamento expiram com o tempo (a quina continua ruim mesmo se o destino mudar)
    mem.path = findPath(x, z, gx, gz, r, mem.bad);
    mem.gx = gx; mem.gz = gz; mem.pt = t;
  }
  if (!mem.path) return [gx, gz];
  while (mem.path.length > 1 && Math.hypot(mem.path[0][0] - x, mem.path[0][1] - z) < .8) mem.path.shift();
  return mem.path[0];
}

/** Leva um ponto clicado para o ponto livre mais próximo (fora de paredes, casas e árvores), para o destino ser alcançável */
export function freePoint(x, z, r = .6) {
  const inside = Math.hypot(x, z) < VILLAGE_R; // clicou dentro da vila: o ponto livre também fica dentro da muralha
  const free = (px, pz) => swimmable(px, pz) && (!inside || Math.hypot(px, pz) < VILLAGE_R - 1.7) && props.every(p => Math.hypot(px - p.position.x, pz - p.position.z) >= p.r + r);
  if (free(x, z)) return { x, z };
  for (let rad = .5; rad <= 8; rad += .5) {
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad;
      if (free(px, pz)) return { x: px, z: pz };
    }
  }
  return { x, z };
}

/** O ponto (x,z) está dentro de uma casa e quem está em (px,pz) está fora dela? Não dá para negociar através da parede: tem que entrar pela porta */
export const behindWall = (px, pz, x, z) => { const h = houseAt(x, z, .2); return !!h && houseAt(px, pz, .2) !== h; };

/** Onde ficar para negociar com o NPC `n`: o `talkAt` se ele mora dentro de uma casa (o caminho abre a porta), senão 2,2 m dele na direção de (px,pz) */
export function npcStand(n, px, pz) {
  if (n.talkAt) return { x: n.talkAt[0], z: n.talkAt[1] };
  const nx = n.g.position.x, nz = n.g.position.z, dx = px - nx, dz = pz - nz, k = 2.2 / (Math.hypot(dx, dz) || 1);
  return freePoint(nx + dx * k, nz + dz * k, .6);
}

/** O dono ficou preso neste ponto: o próximo caminho passa longe dele */
export function markStuck(mem, x, z) {
  mem.bad = [...(mem.bad || []).slice(-3), [x, z, performance.now()]];
  mem.path = null; mem.pt = 0;
}
