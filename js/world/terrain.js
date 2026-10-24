/* Terreno do jogo: usa o gerador procedural de ilhas e o ajusta ao mundo (vila plana na origem, postos inimigos em platôs).
   Coordenadas do jogo: a praça da vila é (0,0) e y=0 é o chão da vila. Módulo puro (sem THREE) para poder ser testado em Node. */
import { build, N, V, ss } from './islandgen.js';
import { VILLAGE_R } from '../core/village-const.js';

/** Semente da ilha: padrão 'pirata'; abra a página com ?seed=outra para ver outra ilha (postos e vila se ajustam sozinhos) */
export const SEED = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('seed')) || 'pirata';
export let isl = null;     // dados crus do gerador
export let H = null;       // alturas (já relativas à vila: vila = 0)
export let VX = 0, VZ = 0; // posição da vila na grade do gerador (m, centro = 0)
export let SEA = -3;       // nível do mar (relativo à vila)
export let HV = 0;         // altura original da vila no gerador (para cores por altitude)
const E = N / 2;

/** Gera a ilha e molda: vila plana em y=0 e um platô sob cada posto. `posts` é alterado (x,z passam para um ponto em terra firme). */
export function initTerrain(posts = [], seed = SEED) {
  isl = build(seed, 'redonda');
  const vil = isl.pois[1];
  VX = vil.x; VZ = vil.z;
  const c = Math.round(VZ + E) * V + Math.round(VX + E);
  const hv = isl.H[c]; HV = hv;
  H = isl.H;                                   // alterações abaixo valem para o gerador também (colisão/minimapa)
  for (let k = 0; k < H.length; k++) H[k] -= hv;
  for (let k = 0; k < isl.W.length; k++) if (isl.W[k] > -90) isl.W[k] -= hv;
  for (let k = 0; k < isl.deck.length; k++) if (isl.deck[k] > -90) isl.deck[k] -= hv;
  isl.bridges.forEach(b => { b[2] -= hv; });
  SEA = -hv - .05;

  flatten(0, 0, VILLAGE_R + 5, VILLAGE_R + 17, 0);

  // postos: entre todos os pontos de terra firme, o que melhor combina com o anel (distância da vila) e a direção desejados
  const cands = [];
  for (let z = -95; z <= 95; z += 3) for (let x = -95; x <= 95; x += 3) {
    const d = Math.hypot(x, z);
    if (d > VILLAGE_R + 10 && d < 92 && roomy(x, z, 9)) cands.push([x, z, d, Math.atan2(z, x)]);
  }
  // espalha os postos por pontos bem distantes entre si (e da vila), depois ordena pela distância: quanto mais longe, mais perigoso
  const chosen = [];
  for (let n = 0; n < posts.length && cands.length; n++) {
    let best = null, bs = -1;
    for (const c of cands) {
      let m = (c[2] - VILLAGE_R) * 1.1 - (c[2] > 70 ? (c[2] - 70) * 2 : 0);
      for (const q of chosen) m = Math.min(m, Math.hypot(q[0] - c[0], q[1] - c[1]));
      if (m > bs) { bs = m; best = c; }
    }
    chosen.push(best);
  }
  chosen.sort((a, b) => a[2] - b[2]);
  const order = posts.map((p, i) => i).sort((a, b) => Math.hypot(posts[a].x, posts[a].z) - Math.hypot(posts[b].x, posts[b].z) || a - b);
  order.forEach((pi, k) => {
    const p = posts[pi], c = chosen[Math.min(k, chosen.length - 1)];
    p.x = c[0]; p.z = c[1];
    flatten(p.x, p.z, 7, 15, heightAt(p.x, p.z));
  });
  return isl;
}

/** Ponto em terra firme, sem água, ladeira nem rio num raio r */
function roomy(x, z, r) {
  for (let a = 0; a < 6.283; a += .6) for (const d of [r * .5, r]) {
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (!walkable(px, pz) || heightAt(px, pz) < SEA + 1.1 || Math.abs(heightAt(px, pz) - heightAt(x, z)) > 2.6) return false;
  }
  return walkable(x, z);
}

/** Achata um círculo (centro em coordenadas do jogo) para a altura h, com borda suave até r1 */
function flatten(x, z, r0, r1, h) {
  const cx = x + VX + E, cz = z + VZ + E;
  for (let j = Math.max(1, Math.floor(cz - r1)); j <= Math.min(N - 1, Math.ceil(cz + r1)); j++)
    for (let i = Math.max(1, Math.floor(cx - r1)); i <= Math.min(N - 1, Math.ceil(cx + r1)); i++) {
      const d = Math.hypot(i - cx, j - cz); if (d > r1) continue;
      const k = j * V + i;
      if (H[k] < SEA + .8 && d > r0) continue;           // não aterra o mar
      const w = 1 - ss(r0, r1, d);
      H[k] = H[k] * (1 - w) + h * w;
      if (w > .5) { isl.nav[k] = 0; isl.W[k] = -99; }
    }
}

/** Altura do relevo (bilinear) */
export function heightAt(x, z) {
  const gx = x + VX + E, gz = z + VZ + E;
  if (gx < 0 || gz < 0 || gx >= N || gz >= N) return -9;
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
  const a = H[j * V + i], b = H[j * V + i + 1], c = H[(j + 1) * V + i], d = H[(j + 1) * V + i + 1];
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** Chão onde se pisa: relevo ou convés de ponte (nunca abaixo do mar) */
export function groundY(x, z) {
  if (!H) return 0;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  let y = heightAt(x, z);
  if (gx >= 0 && gz >= 0 && gx <= N && gz <= N) { const d = isl.deck[gz * V + gx]; if (d > -90 && d > y) y = d; }
  return Math.max(y, SEA + .05);
}

/** Pode andar aqui? (terra firme, sem água funda nem paredão) */
export function walkable(x, z) {
  if (!H) return true;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  if (gx < 1 || gz < 1 || gx >= N || gz >= N) return false;
  const k = gz * V + gx;
  if (isl.deck[k] > -90) return true;
  return H[k] > SEA + .45 && isl.nav[k] === 0 && !blockedByObstacle(x, z);
}

/** Corrige uma posição que entrou no mar/paredão: tenta deslizar em um eixo, senão volta para a anterior. Devolve [x,z]. */
export function slideTo(px, pz, x, z) {
  if (!walkable(px, pz)) return [x, z];            // já está preso num obstáculo: deixa sair
  if (walkable(x, z)) return [x, z];
  if (walkable(x, pz)) return [x, pz];
  if (walkable(px, z)) return [px, z];
  return [px, pz];
}

// ---------- obstáculos de vegetação (círculos em grade de 4 m) ----------
const OB = new Map();
const okey = (x, z) => Math.floor(x / 4) * 4096 + Math.floor(z / 4);
/** Registra troncos/pedras [x,z,raio] (coordenadas do jogo) que bloqueiam o passo */
export function addObstacles(list) {
  list.forEach(c => { const k = okey(c[0], c[1]); (OB.get(k) || OB.set(k, []).get(k)).push(c); });
}
function blockedByObstacle(x, z) {
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const l = OB.get(okey(x + a * 4, z + b * 4));
    if (l) for (const c of l) if ((c[0] - x) ** 2 + (c[1] - z) ** 2 < (c[2] + .3) ** 2) return true;
  }
  return false;
}
