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

/** Bairro do Porto: rua que sai de um dos portões da muralha (o que não dá para o castelo), com 4 casas dos dois lados.
    terrain.js escolhe o portão (ang), achata o chão e reserva a área; village.js constrói as casas (a mesma conta, sempre). */
export const DISTRICT = { ok: false, ang: 0 };
export const DIST_S = [37.5, 50], DIST_LAT = 9.5, DIST_END = 58;
/** Centro e direção da frente (para a rua) de cada casa do bairro: [{ x, z, fx, fz }], na ordem curandeira, padaria (perto do portão), pescador, carpinteiro (no fundo) */
export function districtHouses() {
  if (!DISTRICT.ok) return [];
  const dx = Math.cos(DISTRICT.ang), dz = Math.sin(DISTRICT.ang), tx = -dz, tz = dx, out = [];
  for (const s of DIST_S) for (const sd of [-1, 1]) out.push({ x: dx * s + tx * sd * DIST_LAT, z: dz * s + tz * sd * DIST_LAT, fx: -tx * sd, fz: -tz * sd });
  return out;
}
