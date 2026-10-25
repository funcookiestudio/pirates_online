/* Zonas reservadas (fazendas): a vegetação e as árvores sorteadas não nascem aqui (sem imports para evitar ciclos). */
export const CASTLE = { x: 0, z: 0, th: 0, ok: false };   // castelo: posição/ângulo escolhidos pelo terreno (fachada voltada para a vila)
export const ZONES = [];   // { x, z, fx, fz, x0, x1, z0, z1 } em coordenadas locais da fazenda
/** true se (x,z) cai dentro de alguma zona (com folga `m`) */
export function reserved(x, z, m = 0) {
  for (const Z of ZONES) {
    const dx = x - Z.x, dz = z - Z.z, lx = dx * Z.fz - dz * Z.fx, lz = dx * Z.fx + dz * Z.fz;
    if (lx > Z.x0 - m && lx < Z.x1 + m && lz > Z.z0 - m && lz < Z.z1 + m) return true;
  }
  return false;
}
