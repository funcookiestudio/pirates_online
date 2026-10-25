/* Terreno do jogo: usa o gerador procedural de ilhas e o ajusta ao mundo (vila plana na origem, postos inimigos em platôs).
   Coordenadas do jogo: a praça da vila é (0,0) e y=0 é o chão da vila. Módulo puro (sem THREE) para poder ser testado em Node. */
import { dIn, dWalk } from '../dungeon/dgrid.js';
import { build, N, V, ss } from './islandgen.js';
import { VILLAGE_R } from '../core/village-const.js';
import { CASTLE, ZONES } from './reserve.js';

/** Semente da ilha: padrão 'bussola'; abra a página com ?seed=outra para ver outra ilha (postos e vila se ajustam sozinhos) */
const savedSeed = () => { try { return localStorage.getItem('pirata-ilha'); } catch (e) { return null; } };
export const SEED = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('seed')) || savedSeed() || 'bussola';
export let isl = null;     // dados crus do gerador
export let H = null;       // alturas (já relativas à vila: vila = 0)
export let VX = 0, VZ = 0; // posição da vila na grade do gerador (m, centro = 0)
export let SEA = -3;       // nível do mar (relativo à vila)
export const VS = 2;       // esticamento vertical do relevo
export let REACH = null;   // células alcançáveis a pé desde a vila
export let CAVES = [];     // entradas de caverna nas encostas { x, z, y, dx, dz (para onde a encosta desce), d }
export let HV = 0;         // altura original da vila no gerador (para cores por altitude)
const E = N / 2;

/** Gera a ilha e molda: vila plana em y=0 e um platô sob cada posto. `posts` é alterado (x,z passam para um ponto em terra firme). */
const KSC = N / 200;   // a ilha cresce com N: distâncias de postos/cavernas acompanham
export function initTerrain(posts = [], seed = SEED) {
  isl = build(seed, 'redonda');
  const vil = isl.pois[1];
  VX = vil.x; VZ = vil.z;
  const c = Math.round(VZ + E) * V + Math.round(VX + E);
  const hv = isl.H[c]; HV = hv;
  H = isl.H;                                   // alterações abaixo valem para o gerador também (colisão/minimapa)
  // relevo vertical esticado (VS×) em torno da vila: montanhas altas de verdade, com o mesmo formato; tudo no mesmo fator (mar, rios, pontes)
  for (let k = 0; k < H.length; k++) H[k] = (H[k] - hv) * VS;
  for (let k = 0; k < isl.W.length; k++) if (isl.W[k] > -90) isl.W[k] = (isl.W[k] - hv) * VS;
  for (let k = 0; k < isl.deck.length; k++) if (isl.deck[k] > -90) isl.deck[k] = (isl.deck[k] - hv) * VS;
  isl.bridges.forEach(b => { b[2] = (b[2] - hv) * VS; });
  SEA = (-.05 - hv) * VS;

  flatten(0, 0, VILLAGE_R + 5, VILLAGE_R + 17, 0);

  // castelo: no alto, num planalto escolhido pelo gerador (layout), de frente para a vila; o platô é nivelado na altura dele
  {
    const cs = isl.layout.castle, cx = cs.x - VX, cz = cs.z - VZ, cy = heightAt(cx, cz);
    CASTLE.x = cx; CASTLE.z = cz; CASTLE.y = cy; CASTLE.th = cs.th; CASTLE.ok = true;
    ZONES.push({ x: cx, z: cz, fx: Math.sin(CASTLE.th), fz: Math.cos(CASTLE.th), x0: -20, x1: 20, z0: -15, z1: 36 });   // pegada do castelo (pátio incluído), no giro dele
  }

  // área alcançável a pé a partir da vila (platôs isolados por paredões ficam de fora): postos só nascem nela
  REACH = new Uint8Array(V * V);
  {
    const start = Math.round(VZ + E) * V + Math.round(VX + E);   // célula da vila no gerador
    const st = [start]; REACH[start] = 1;
    while (st.length) {
      const c = st.pop(), cx = c % V, cz = (c / V) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = cx + a, j = cz + b;
        if (i < 1 || j < 1 || i >= N || j >= N) continue;
        const k = j * V + i;
        if (!REACH[k] && H[k] > SEA + .45 && isl.nav[k] === 0) { REACH[k] = 1; st.push(k); }
      }
    }
  }

  // postos (acampamentos) e dungeons: posições vindas do gerador (por faixa de perigo = custo de caminho desde a vila); ordem = do mais fácil ao mais difícil
  const camps = isl.layout.camps;
  posts.forEach((p, i) => {
    const c = camps[Math.min(i, camps.length - 1)];
    p.x = c.x - VX; p.z = c.z - VZ;
    flatten(p.x, p.z, 7, 15, heightAt(p.x, p.z));
  });
  CAVES = isl.layout.dungeons.map(d => {
    const x = d.x - VX, z = d.z - VZ;
    return { x, z, y: heightAt(x, z), dx: d.dx, dz: d.dz, d: Math.hypot(x, z), t: d.t };
  });
  return isl;
}


/** Inclinação do relevo em (x,z): [gx, gz, módulo] (m de altura por m de distância) */
function slopeAt(x, z) {
  const gx = (heightAt(x + 1.5, z) - heightAt(x - 1.5, z)) / 3, gz = (heightAt(x, z + 1.5) - heightAt(x, z - 1.5)) / 3;
  return [gx, gz, Math.hypot(gx, gz)];
}

/** Disco de raio r todo andável e conectado (corpo cabe com folga) */
function openAt(x, z, r) {
  if (!walkable(x, z) || !reach(x, z)) return false;
  for (let a = 0; a < 6.283; a += .52) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (!walkable(px, pz) || !reach(px, pz)) return false; }
  return true;
}

function reach(x, z) {
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  return gx > 0 && gz > 0 && gx < N && gz < N && REACH[gz * V + gx] === 1;
}

/** Ponto em terra firme, sem água, ladeira nem rio num raio r */
function roomy(x, z, r) {
  if (onRoad(x, z, 3)) return false;                       // posto nunca em cima de estrada
  for (let a = 0; a < 6.283; a += .6) for (const d of [r * .5, r]) {
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (!walkable(px, pz) || heightAt(px, pz) < SEA + 1.1 || Math.abs(heightAt(px, pz) - heightAt(x, z)) > 2.6) return false;
  }
  return walkable(x, z);
}

/** Achata um círculo (centro em coordenadas do jogo) para a altura h, com borda suave até r1 */
export function flatten(x, z, r0, r1, h) {
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

/** Há estrada (ou seu acostamento) a até `m` metros de (x,z)? Vegetação, pedras e postos ficam longe delas. */
export function onRoad(x, z, m = 2) {   // estrada ou convés de ponte
  if (!isl) return false;
  const cx = Math.round(x + VX + E), cz = Math.round(z + VZ + E), r = Math.ceil(m);
  for (let j = cz - r; j <= cz + r; j++) for (let i = cx - r; i <= cx + r; i++) {
    if (i < 0 || j < 0 || i > N || j > N) continue;
    if ((isl.pm[j * V + i] || isl.deck[j * V + i] > -90) && (i - cx) ** 2 + (j - cz) ** 2 <= m * m) return true;
  }
  return false;
}

/** Altura do relevo (bilinear) */
export function heightAt(x, z) {
  if (dIn(x, z)) return 0;
  const gx = x + VX + E, gz = z + VZ + E;
  if (gx < 0 || gz < 0 || gx >= N || gz >= N) return -9;
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
  const a = H[j * V + i], b = H[j * V + i + 1], c = H[(j + 1) * V + i], d = H[(j + 1) * V + i + 1];
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** Chão onde se pisa: relevo ou convés de ponte (nunca abaixo do mar) */
export function groundY(x, z) {
  if (!H || dIn(x, z)) return 0;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  let y = heightAt(x, z);
  if (gx >= 0 && gz >= 0 && gx <= N && gz <= N) { const d = isl.deck[gz * V + gx]; if (d > -90 && d > y) y = d; }
  return Math.max(y, SEA + .05);
}

/** Pode andar aqui? (terra firme, sem água funda nem paredão) */
export function walkable(x, z) {
  if (dIn(x, z)) return dWalk(x, z);
  if (!H) return true;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  if (gx < 1 || gz < 1 || gx >= N || gz >= N) return false;
  const k = gz * V + gx;
  if (isl.deck[k] > -90) return true;
  return H[k] > SEA + .45 && isl.nav[k] === 0 && !blockedByObstacle(x, z);
}

/** Chão real sob (x,z): relevo ou convés de ponte, sem o "piso" do mar */
export function floorY(x, z) {
  if (!H || dIn(x, z)) return 0;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  let y = heightAt(x, z);
  if (gx >= 0 && gz >= 0 && gx <= N && gz <= N) { const d = isl.deck[gz * V + gx]; if (d > -90 && d > y) y = d; }
  return y;
}

/** Altura da superfície da água em (x,z): rio/lago (nível próprio) ou mar */
export function waterLevel(x, z) {
  if (dIn(x, z)) return -99;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  if (gx >= 0 && gz >= 0 && gx <= N && gz <= N) { const w = isl.W[gz * V + gx]; if (w > -90) return w; }
  return SEA;
}

/** Profundidade da água sobre o chão em (x,z) (≤ 0 = seco). Em cima de ponte conta como seco. */
export function waterDepth(x, z) {
  if (dIn(x, z)) return -99;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  if (gx >= 0 && gz >= 0 && gx <= N && gz <= N && isl.deck[gz * V + gx] > -90) return 0;
  return waterLevel(x, z) - heightAt(x, z);
}

/** Dá para nadar aqui? (terra firme ou água de até 3,6 m de fundura, sem obstáculos) */
export function swimmable(x, z) {
  if (dIn(x, z)) return dWalk(x, z);
  if (!H) return true;
  if (walkable(x, z)) return true;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  if (gx < 1 || gz < 1 || gx >= N || gz >= N || blockedByObstacle(x, z)) return false;
  const d = waterDepth(x, z);
  return d > -.9 * VS && d < 3.6 * VS;   // -0,6: faixa de praia entre a terra firme e a água
}

/** Corrige uma posição que entrou no mar/paredão: tenta deslizar em um eixo, senão volta para a anterior. Devolve [x,z]. */
export function slideTo(px, pz, x, z, swim = false) {
  const ok = swim ? swimmable : walkable;
  if (!ok(px, pz)) return [x, z];                  // já está preso num obstáculo: deixa sair
  if (ok(x, z)) return [x, z];
  if (ok(x, pz)) return [x, pz];
  if (ok(px, z)) return [px, z];
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

/** Algum obstáculo de vegetação a menos de `r` m (além do raio dele) de (x,z)? */
export function nearObstacle(x, z, r) {
  if (dIn(x, z)) return false;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const l = OB.get(okey(x + a * 4, z + b * 4));
    if (l) for (const c of l) if ((c[0] - x) ** 2 + (c[1] - z) ** 2 < (c[2] + r) ** 2) return true;
  }
  return false;
}

/** Tem estrada (centro ou acostamento) exatamente na célula de (x,z)? */
export function roadAt(x, z) {
  if (!isl) return false;
  const gx = Math.round(x + VX + E), gz = Math.round(z + VZ + E);
  return gx >= 0 && gz >= 0 && gx <= N && gz <= N && isl.pm[gz * V + gx] > 0;
}
