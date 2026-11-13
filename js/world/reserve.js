/* Zonas reservadas (fazendas): a vegetação e as árvores sorteadas não nascem aqui (sem imports para evitar ciclos). */
export const CASTLE = { x: 0, z: 0, y: 0, th: 0, ok: false };   // castelo: posição/ângulo escolhidos pelo terreno (fachada voltada para a vila)
export const ZONES = [];   // { x, z, fx, fz, x0, x1, z0, z1 } em coordenadas locais da fazenda
/** true se (x,z) cai dentro de alguma zona (com folga `m`) */
export function reserved(x, z, m = 0) {
  for (const Z of ZONES) {
    const dx = x - Z.x, dz = z - Z.z, lx = dx * Z.fz - dz * Z.fx, lz = dx * Z.fx + dz * Z.fz;
    if (lx > Z.x0 - m && lx < Z.x1 + m && lz > Z.z0 - m && lz < Z.z1 + m) return true;
  }
  return false;
}

/** Vila do Porto (orgânica): um caminho sinuoso sai do portão da muralha (o que dá para o porto, se existir) e desce até o cais, com uma pracinha no meio,
    casas com recuos e giros diferentes dos dois lados e vielas curtas até as portas. terrain.js escolhe o portão, achata o chão e reserva a área;
    village.js constrói tudo com a mesma conta (districtLayout é determinística). Coordenadas: s = distância do centro da vila, l = lateral.
    V549: as casas são colocadas por REGRAS (pegada real + folga), não mais por números soltos: nunca se tocam, nem a muralha, nem a pracinha. */
export const DISTRICT = { ok: false, ang: 0, port: false };
export const DIST_S0 = 30, DIST_LAT = 9.5;
export let DIST_S1 = 96, PLAZA_S = 90;   // fim do caminho (cais) e pracinha do porto: terrain.js ajusta pela distância real vila↔cais
let _plan = null;
export function configureDistrict(dock) { DIST_S1 = Math.max(40, Math.min(104, Math.round(dock) - 4)); PLAZA_S = DIST_S1 - 6; _plan = null; }
/** Raio externo da muralha da vila (VILLAGE_R 26 + espessura) e folgas mínimas (m) */
export const WALL_OUT = 26.7, GAP_WALL = 2.2, GAP_HOUSE = 1.6, GAP_PLAZA = 1.5, PLAZA_R = 5.6, ROAD_CLEAR = 2.6;
/** Pegada de cada casa (m): meia-largura (corpo + beiral + extras laterais), profundidade para trás e para a frente (varanda/escada incluídas) */
export const FOOT = {
  healer: [6.2, 4.9, 7.9], bakery: [6.2, 4.9, 7.9], chalet: [6.2, 4.9, 7.9], sobrado: [6.2, 4.9, 7.9],
  carpenter: [6.2, 4.9, 7.9], fisher: [6.2, 4.9, 7.9], aframe: [5.9, 5.7, 8.1],
};
/** [tipo, lado (-1 esq., +1 dir.), folga extra de recuo (m), giro extra (rad), s mínimo] */
const ORDER = [['healer', -1, 0, .05, 0], ['bakery', 1, 1.2, -.07, 0], ['chalet', -1, 2.2, .08, 0], ['sobrado', 1, 0, .05, 0],
  ['carpenter', -1, 1.0, -.05, 0], ['aframe', 1, 1.6, -.08, 0], ['fisher', -1, 1.4, .1, -26]];   // s mínimo negativo = relativo ao fim do caminho (DIST_S1)
/** Eixo do caminho: deslocamento lateral em s (curva suave em S) */
export const pathLat = s => 2.6 * Math.sin((s - DIST_S0) * .12) + .01 * (s - DIST_S0);
const frame = () => { const a = DISTRICT.ang, dx = Math.cos(a), dz = Math.sin(a); return { dx, dz, tx: -dz, tz: dx }; };
/** Ponto do mundo para (s, l) */
export function distPoint(s, l) { const { dx, dz, tx, tz } = frame(); return [dx * s + tx * l, dz * s + tz * l]; }

/** Pegada (4 cantos, no plano s,l) da casa de centro (cs,cl) com a frente voltada para (fs,fl) */
function cornersSL(kind, cs, cl, fs, fl) {
  const [hw, hb, hf] = FOOT[kind], ps = -fl, pl = fs, out = [];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const w = a * hw, d = b > 0 ? b * hf : b * hb; out.push([cs + ps * w + fs * d, cl + pl * w + fl * d]); }
  return out;
}
function segDist(px, pz, ax, az, bx, bz) { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - ax - vx * t, pz - az - vz * t); }
function overlapOBB(A, B) {
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const ax = -(P[i + 1][1] - P[i][1]), az = P[i + 1][0] - P[i][0];
    const pr = C => { const v = C.map(p => p[0] * ax + p[1] * az); return [Math.min(...v), Math.max(...v)]; };
    const a = pr(A), b = pr(B); if (a[1] <= b[0] || b[1] <= a[0]) return false;
  }
  return true;
}
/** Menor distância entre duas pegadas (0 se se sobrepõem) */
export function footGap(A, B) {
  if (overlapOBB(A, B)) return 0;
  let m = 1e9;
  for (const [P, Q] of [[A, B], [B, A]]) for (const p of P) for (let i = 0; i < 4; i++) { const q = Q[i], r = Q[(i + 1) % 4]; m = Math.min(m, segDist(p[0], p[1], q[0], q[1], r[0], r[1])); }
  return m;
}
const dotPlaza = c => { const pc = [PLAZA_S, pathLat(PLAZA_S)]; let m = 1e9; for (let i = 0; i < 4; i++) m = Math.min(m, segDist(pc[0], pc[1], c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1])); return m; };

function placeAt(kind, s, sd, extra, yaw) {
  const l0 = pathLat(s), sl = (pathLat(s + .5) - pathLat(s - .5)), n = Math.hypot(1, sl);
  const ns = -sl / n, nl = 1 / n, cl = l0 + sd * (ROAD_CLEAR + FOOT[kind][2] + extra), cs = s;   // frente (com varanda) a ROAD_CLEAR m do eixo do caminho
  const fs0 = -ns * sd, fl0 = -nl * sd, c = Math.cos(yaw), sn = Math.sin(yaw), fs = fs0 * c - fl0 * sn, fl = fs0 * sn + fl0 * c;
  return { kind, sd, s: cs, l: cl, fs, fl };
}
/** Plano de casas em (s,l): colocadas em ordem, cada uma o mais perto do começo da rua que as regras permitem */
export function districtPlan() {
  if (_plan) return _plan;
  const placed = [], cursor = { '-1': DIST_S0 + 2, '1': DIST_S0 + 10 };
  for (const [kind, sd, extra, yaw, smin] of ORDER) {
    let h = null, s = Math.max(cursor[sd], smin < 0 ? DIST_S1 + smin : smin);
    for (; s < DIST_S1 - 6; s += .5) {
      const q = placeAt(kind, s, sd, extra, yaw), C = cornersSL(kind, q.s, q.l, q.fs, q.fl);
      if (C.some(p => Math.hypot(p[0], p[1]) < WALL_OUT + GAP_WALL)) continue;
      if (dotPlaza(C) < PLAZA_R + GAP_PLAZA) continue;
      if (placed.some(o => footGap(C, o.C) < GAP_HOUSE)) continue;
      h = { ...q, C }; break;
    }
    if (!h) continue;   // não coube nesta ilha: a casa simplesmente não é construída
    placed.push(h); cursor[sd] = h.s + 6;   // o teste de folga acha o primeiro lugar livre
  }
  _plan = placed; return placed;
}
/** Casas: [{ kind, x, z, fx, fz }] (fx, fz = para onde a frente olha) */
export function districtHouses() {
  if (!DISTRICT.ok) return [];
  const { dx, dz, tx, tz } = frame();
  return districtPlan().map(h => { const [x, z] = distPoint(h.s, h.l); return { kind: h.kind, x, z, fx: dx * h.fs + tx * h.fl, fz: dz * h.fs + tz * h.fl }; });
}
/** Pegadas das casas no mundo (para o medidor): [{ kind, C: [[x,z]×4] }] */
export function districtFootprints() {
  if (!DISTRICT.ok) return [];
  return districtPlan().map(h => ({ kind: h.kind, C: h.C.map(p => distPoint(p[0], p[1])) }));
}
/** Linha do caminho principal (mundo): pontos de 2 em 2 m, do portão até o cais */
export function districtPath() {
  if (!DISTRICT.ok) return [];
  const out = []; for (let s = DIST_S0 - 3; s <= DIST_S1 + .01; s += 2) out.push(distPoint(s, pathLat(s)));
  return out;
}
