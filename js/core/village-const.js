/* Medidas da vila (raio da muralha e meia-largura dos portões). Ficam aqui para steer, mundo e inimigos usarem o mesmo valor. */
export const VILLAGE_R = 26, GATE_HW = 2.6;
/** Ruas de pedra da vila (village.js): praça em anel de raio RING_R (3 m de largura) e uma rua de 3,4 m da praça até cada portão */
export const RING_R = 7, RING_HW = 1.5, STREET_HW = 1.7;
/** Ponto de rua (rua de um portão, a 16 m do centro, já com a caixa do veículo atrás dentro da rua) mais perto de (x,z), com o giro (yaw)
    para fora da vila: onde o cavalo/veículo aparece quando chamado de dentro da vila */
export function streetSpot(x, z) {
  let best = null;
  for (let k = 0; k < 4; k++) {
    const dx = Math.round(Math.cos(k * Math.PI / 2)), dz = Math.round(Math.sin(k * Math.PI / 2)), sx = dx * 16, sz = dz * 16, d = Math.hypot(sx - x, sz - z);
    if (!best || d < best.d) best = { x: sx, z: sz, yaw: Math.atan2(dx, dz), d };
  }
  return best;
}
/** Montado (cavalo, carroça, carruagem) pode estar em (x,z)? Fora da vila sempre; dentro, só nas ruas (nunca no gramado, nas casas
    nem nos caminhos das portas). m = folga (negativa = mais para o meio da rua) */
export function rideOk(x, z, m = 0) {
  const r = Math.hypot(x, z);
  if (r > VILLAGE_R + 1) return true;
  if (Math.abs(r - RING_R) <= RING_HW + m) return true;
  if (Math.abs(x) <= STREET_HW + m && Math.abs(z) >= RING_R) return true;
  if (Math.abs(z) <= STREET_HW + m && Math.abs(x) >= RING_R) return true;
  return false;
}

/** Largura padrão (centro a centro das paredes) do corredor em frente aos quartos, em todas as construções: o da taverna (3,15 × 1,22) */
export const CORRIDOR_W = 3.84;
