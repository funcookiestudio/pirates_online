/* Desempenho adaptativo: se o jogo fica lento, a resolução (pixel ratio) cai aos poucos; se sobra folga, sobe de novo.
   Também limita a resolução máxima em telas de celular de alta densidade. */
import { ren } from '../core/engine.js';

const touch = matchMedia('(pointer: coarse)').matches;
const MAX = Math.min(devicePixelRatio || 1, touch ? 1.25 : 2), MIN = touch ? .6 : .8, STEP = .1;   // nunca abaixo de 80%: abaixo disso a imagem fica serrilhada
let ratio = MAX, ema = 1 / 60, t = 0, cool = 3, mode = 'auto';
const NATIVE = devicePixelRatio || 1;
const FIXED = { max: () => Math.min(NATIVE, 2.5), high: () => MAX, mid: () => Math.min(MAX, 1), low: () => Math.min(MAX, .75) };
/** Qualidade escolhida nos ajustes: 'auto' (adaptativa) ou resolução fixa */
export function setQualityMode(m) {
  mode = FIXED[m] ? m : 'auto';
  if (mode !== 'auto') { ratio = FIXED[mode](); ren.setPixelRatio(ratio); ren.setSize(innerWidth, innerHeight); } else { ratio = MAX; ren.setPixelRatio(ratio); ren.setSize(innerWidth, innerHeight); cool = 3; }
}

export function updatePerf(dt) {
  if (mode !== 'auto') { if (dt < .5) ema += (dt - ema) * .05; return; }
  if (dt < .5) ema += (dt - ema) * .03;   // travadas isoladas (carregamento, troca de aba) não contam
  t += dt;
  if (t < 1) return;
  t = 0; cool -= 1;
  if (cool > 0) return;
  let r = ratio;
  if (ema > 1 / 30 && ratio > MIN) r = Math.max(MIN, ratio - STEP);        // abaixo de ~30 fps contínuos: baixa a resolução, só um pouco
  else if (ema < 1 / 48 && ratio < MAX) r = Math.min(MAX, ratio + STEP);   // folga (~56+ fps): sobe
  if (r !== ratio) { ratio = r; ren.setPixelRatio(r); ren.setSize(innerWidth, innerHeight); cool = 6; }
}
export const perfRatio = () => ratio;
export const perfFps = () => 1 / Math.max(ema, 1e-3);

/** Diagnóstico por quadro (ms): js = lógica, rend = envio do desenho, gpu = espera real da GPU (gl.finish, amostrado) */
export const DIAG = { js: 0, rend: 0, gpu: 0, calls: 0, tris: 0, n: 0 };
