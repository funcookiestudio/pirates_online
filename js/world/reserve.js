/* Zona reservada da fazenda: a vegetação e as árvores sorteadas não nascem aqui (sem imports para evitar ciclos). */
export const FZONE = { on: false, x: 0, z: 0, fx: 0, fz: 1, x0: 0, x1: 0, z0: 0, z1: 0 };
/** true se (x,z) cai dentro da área da fazenda (com folga `m`) */
export function reserved(x, z, m = 0) {
  if (!FZONE.on) return false;
  const dx = x - FZONE.x, dz = z - FZONE.z, lx = dx * FZONE.fz - dz * FZONE.fx, lz = dx * FZONE.fx + dz * FZONE.fz;
  return lx > FZONE.x0 - m && lx < FZONE.x1 + m && lz > FZONE.z0 - m && lz < FZONE.z1 + m;
}
