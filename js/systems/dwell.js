/* Espera do auto em frente a um NPC/baú: devolve true quando os `secs` segundos passaram. dwell(null) zera. */
let key = null, t0 = 0;
export function dwell(k, secs) {
  if (k == null) { key = null; return false; }
  const now = performance.now() / 1000;
  if (key !== k) { key = k; t0 = now; }
  return now - t0 >= secs;
}
