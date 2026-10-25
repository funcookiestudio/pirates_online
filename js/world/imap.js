/* Mapa de retângulos dos interiores: paredes finas, móveis e portas são retângulos (em metros, no quadro da casa) por andar.
   É a fonte única da colisão do jogador dentro da casa e da grade de cliques/caminhos (interior-nav). Círculos antigos (props com .map)
   continuam existindo só para NPCs e inimigos. */
import { HOUSES } from './floors.js';

const frame = h => ({ c: Math.cos(h.th), s: Math.sin(h.th) });
export const toU = (h, x, z) => { const { c, s } = frame(h), dx = x - h.x, dz = z - h.z; return [dx * c - dz * s, dx * s + dz * c]; };
export const toW = (h, u, v) => { const { c, s } = frame(h); return [h.x + u * c + v * s, h.z - u * s + v * c]; };

/** Registra um retângulo (coordenadas locais da casa × K). `dr` = porta: só bloqueia fechada. */
/** `tall`: bloqueia também a visão (paredes e portas); móveis só bloqueiam o passo */
export function addRect(h, l, u0, v0, u1, v1, dr, tall) {
  (h.rects ||= []).push({ l, u0: Math.min(u0, u1) * h.K, u1: Math.max(u0, u1) * h.K, v0: Math.min(v0, v1) * h.K, v1: Math.max(v0, v1) * h.K, dr, tall: !!tall });
}
export const rectsOf = (h, L) => (h.rects || []).filter(r => r.l === L && !(r.dr && r.dr.open));

/** Casa com mapa que contém o ponto (com folga) */
export function mapAt(x, z, pad = .6) {
  for (const h of HOUSES) {
    if (!h.rects) continue;
    const dx = x - h.x, dz = z - h.z;
    if (dx * dx + dz * dz > 400) continue;
    const [u, v] = toU(h, x, z);
    if (Math.abs(u) <= (h.hx || 4.2) * h.K + pad && Math.abs(v) <= (h.hz || 3.2) * h.K + pad) return h;
  }
  return null;
}

/** Empurra (x,z) para fora dos retângulos do andar L, com corpo de raio r (desliza pela borda). Devolve [x,z] */
export function pushOut(h, L, x, z, r) {
  let [u, v] = toU(h, x, z);
  const rs = rectsOf(h, L);
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const q of rs) {
      const cx = Math.max(q.u0, Math.min(u, q.u1)), cz = Math.max(q.v0, Math.min(v, q.v1));
      const dx = u - cx, dz = v - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      moved = true;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); u = cx + dx / d * r; v = cz + dz / d * r; }
      else {   // centro dentro do retângulo: sai pela borda mais próxima
        const e = [[u - q.u0, -1, 0], [q.u1 - u, 1, 0], [v - q.v0, 0, -1], [q.v1 - v, 0, 1]].sort((a, b) => a[0] - b[0])[0];
        u += e[1] * (e[0] + r); v += e[2] * (e[0] + r);
      }
    }
    if (!moved) break;
  }
  return toW(h, u, v);
}

/** Casca padrão das casas de um cômodo (u ±4, v ±3, parede de .3 m): paredes, vão da porta de entrada (fechada bloqueia) e móveis.
 *  `furn` = [u, v, raio]: o retângulo do móvel é um quadrado de lado 1,4×raio (o círculo antigo era folgado demais). */
export function shellRects(h, door, dd, furn, extra = []) {
  const T = .15, [c, w] = door, g0 = c - w / 2, g1 = c + w / 2;
  addRect(h, 0, -4 - T, 3 - T, g0, 3 + T, undefined, true);
  addRect(h, 0, g1, 3 - T, 4 + T, 3 + T, undefined, true);
  addRect(h, 0, g0, 3 - T, g1, 3 + T, dd, true);
  addRect(h, 0, -4 - T, -3 - T, 4 + T, -3 + T, undefined, true);
  addRect(h, 0, -4 - T, -3, -4 + T, 3, undefined, true);
  addRect(h, 0, 4 - T, -3, 4 + T, 3, undefined, true);
  furn.forEach(([u, v, r]) => addRect(h, 0, u - r * .7, v - r * .7, u + r * .7, v + r * .7));
  extra.forEach(e => addRect(h, 0, ...e));
}
