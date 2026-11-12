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
    village.js constrói tudo com a mesma conta (districtLayout é determinística). Coordenadas: s = distância do centro da vila, l = lateral. */
export const DISTRICT = { ok: false, ang: 0, port: false };
export const DIST_S0 = 29, DIST_S1 = 68, DIST_LAT = 9.5;
/** [tipo, lado (-1 esq., +1 dir.), s, recuo (m do eixo do caminho até o centro da casa), giro extra (rad)] */
const RECIPE = [['healer', -1, 31, 9.2, .05], ['bakery', 1, 37, 9.6, -.07], ['chalet', -1, 44.5, 14.5, .1], ['sobrado', 1, 50.5, 10.8, .06],
  ['carpenter', -1, 57, 9.4, -.06], ['aframe', 1, 65, 13.2, -.14], ['fisher', -1, 70.5, 13.5, .16]];
/** Eixo do caminho: deslocamento lateral em s (curva suave em S) */
export const pathLat = s => 2.6 * Math.sin((s - DIST_S0) * .12) + .01 * (s - DIST_S0);
export const PLAZA_S = 48;
const frame = () => { const a = DISTRICT.ang, dx = Math.cos(a), dz = Math.sin(a); return { dx, dz, tx: -dz, tz: dx }; };
/** Ponto do mundo para (s, l) */
export function distPoint(s, l) { const { dx, dz, tx, tz } = frame(); return [dx * s + tx * l, dz * s + tz * l]; }
/** Tangente do caminho em s, no mundo, e a normal (esq. = -1 → -normal) */
/** Casas: [{ kind, x, z, fx, fz }] (fx, fz = para onde a frente olha) */
export function districtHouses() {
  if (!DISTRICT.ok) return [];
  const { dx, dz, tx, tz } = frame(), out = [];
  for (const [kind, sd, s, d, yaw] of RECIPE) {
    const l0 = pathLat(s), sl = (pathLat(s + .5) - pathLat(s - .5)), n = Math.hypot(1, sl);
    // normal ao caminho (no plano s,l): (-sl, 1)/n ; lado sd
    const ns = -sl / n, nl = 1 / n, cs = s, cl = l0 + sd * d;   // posição pelo eixo s (alinha as casas ao longo do caminho), só o giro segue a normal
    const [x, z] = distPoint(cs, cl);
    const fs = -ns * sd, fl = -nl * sd, c = Math.cos(yaw), sn = Math.sin(yaw), gs = fs * c - fl * sn, gl = fs * sn + fl * c;
    out.push({ kind, x, z, fx: dx * gs + tx * gl, fz: dz * gs + tz * gl });
  }
  return out;
}
/** Linha do caminho principal (mundo): pontos de 2 em 2 m, do portão até o cais */
export function districtPath() {
  if (!DISTRICT.ok) return [];
  const out = []; for (let s = DIST_S0 - 3; s <= DIST_S1 + .01; s += 2) out.push(distPoint(s, pathLat(s)));
  return out;
}
