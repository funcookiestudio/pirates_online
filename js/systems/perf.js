/* Desempenho adaptativo: se o jogo fica lento, a resolução (pixel ratio) cai aos poucos; se sobra folga, sobe de novo.
   Também limita a resolução máxima em telas de celular de alta densidade. */
import { ren } from '../core/engine.js';

const touch = matchMedia('(pointer: coarse)').matches;
const MAX = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2), MIN = .6, STEP = .2;
let ratio = MAX, ema = 1 / 60, t = 0, cool = 3;

export function updatePerf(dt) {
  ema += (dt - ema) * .05;
  t += dt;
  if (t < 1) return;
  t = 0; cool -= 1;
  if (cool > 0) return;
  let r = ratio;
  if (ema > 1 / 38 && ratio > MIN) r = Math.max(MIN, ratio - STEP);        // abaixo de ~38 fps: baixa a resolução
  else if (ema < 1 / 56 && ratio < MAX) r = Math.min(MAX, ratio + STEP);   // folga (~56+ fps): sobe
  if (r !== ratio) { ratio = r; ren.setPixelRatio(r); ren.setSize(innerWidth, innerHeight); cool = 4; }
}
export const perfRatio = () => ratio;
