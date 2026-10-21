/* Fôlego do auto combate. Ligado, o fôlego (state.stam, 0..1) gasta; desligado ou descansando, recupera.
   Fôlego baixo e nenhum inimigo por perto → o jogador para, senta e descansa até WAKE ou até um inimigo chegar.
   Fôlego zero → o auto combate desliga sozinho. (Tempos curtos de propósito, para testar.) */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { $, turnTo } from '../core/utils.js';
import { P } from '../entities/player.js';
import { sitDown, standUp } from './rest.js';
import { log } from '../ui/notify.js';
import { POST_DATA } from '../data/posts.js';

export const AUTO_TIME = 120; // s de auto combate com o fôlego cheio
export const REST_TIME = 60;  // s para recuperar do zero ao cheio
export const LOW = .3;        // abaixo disso, sem inimigos por perto, ele para e descansa
export const WAKE = .999;      // descansando: volta ao combate ao chegar aqui
export const MIN_START = .1;  // fôlego mínimo para ligar o auto combate
const SAFE = 14;              // sem inimigo a menos de SAFE m (nem perseguindo a menos de 25 m) = seguro descansar

/** Há algum inimigo perigoso por perto? */
export function danger() {
  return enemies.some(e => {
    if (e.dead) return false;
    const d = Math.hypot(e.x - P.x, e.z - P.z);
    return d < SAFE || (e.ag && d < 25);
  });
}

/** Liga/desliga o auto combate (botão e tecla T) */
export function setAuto(on) {
  if (on && state.stam < MIN_START) { log('😮‍💨 Sem fôlego para o auto combate — descanse um pouco'); return; }
  state.autoOn = on;
  state.autoHold = 0;
  if (on && P.sitT && !state.autoRest) standUp(); // estava sentado: levanta para lutar
  if (!on && state.autoRest) { state.autoRest = false; standUp(); }
  $('sa').classList.toggle('on', on);
  log(on ? '🤖 Auto combate ligado (clique para assumir por 2,5s)' : '🤖 Auto combate desligado');
}

/** Fogueira mais próxima do jogador (os postos e a praça da vila) */
function nearestFire() {
  let best = { id: -1, x: 0, z: 0, d: Math.hypot(P.x, P.z) }; // fogueira da vila
  POST_DATA.forEach(p => { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < best.d) best = { id: p.id, x: p.x, z: p.z, d }; });
  return best;
}

/** Gasta/recupera o fôlego. Com fôlego baixo o jogador procura a fogueira mais próxima:
 *  se a área estiver segura, vai até lá e descansa até encher; se não, limpa a área antes (continua lutando). */
export function updateStamina(dt) {
  if (P.dead) return;
  const resting = !state.autoOn || state.autoRest;
  state.stam = Math.min(1, Math.max(0, state.stam + (resting ? dt / REST_TIME : -dt / AUTO_TIME)));
  if (state.autoRest) {
    P.hp = Math.min(P.max, P.hp + P.max * .05 * dt);
    if (state.restFire) { const y = Math.atan2(state.restFire.x - P.x, state.restFire.z - P.z); turnTo(P.g, y, 7, dt); P.ay = P.g.rotation.y; } // de frente para a fogueira
  }
  if (!state.autoOn) { state.seek = null; state.clearing = false; return; }

  if (state.stam <= 0 && !state.clearing) {
    log('😮‍💨 Fôlego acabou: auto combate desligado');
    setAuto(false);
    return;
  }

  if (state.autoRest) {
    if (!P.sitT) state.autoRest = false;                 // o jogador levantou por conta própria
    else if (state.stam >= WAKE) { state.autoRest = false; standUp(); log('🤖 Descansado: voltando ao combate'); }
    else if (danger()) { state.autoRest = false; standUp(true); log('⚠ Inimigo por perto: levantando!'); }
    return;
  }

  if (state.stam >= LOW || state.autoHold > 0 || P.roll || P.sit) { if (state.stam >= LOW) { state.seek = null; state.clearing = false; } return; }

  // fôlego baixo: escolhe a fogueira
  const f = nearestFire();
  const campSafe = !enemies.some(e => !e.dead && Math.hypot(e.x - f.x, e.z - f.z) < 13);
  if (!campSafe) {
    if (!state.clearing) log('⚔ Fogueira ocupada: limpando a área antes de descansar');
    state.clearing = true; state.seek = null;
    state.stam = Math.max(state.stam, .03);               // continua lutando mesmo cansado
    return;
  }
  state.clearing = false;
  const d = Math.hypot(P.x - f.x, P.z - f.z), k = 2.3 / (d || 1);
  if (!state.seek) { log('🔥 Indo descansar na fogueira'); state.seek = { x: f.x + (P.x - f.x) * k, z: f.z + (P.z - f.z) * k }; } // ponto fixo, no lado de quem chega
  const sx = state.seek.x, sz = state.seek.z;
  if (danger()) return;                                   // inimigo no caminho: o auto cuida dele primeiro
  if (Math.hypot(P.x - sx, P.z - sz) < .6) {
    state.autoRest = true; state.seek = null; state.restFire = { x: f.x, z: f.z };
    P.tgt = null; P.tx = P.x; P.tz = P.z;
    sitDown();
    log('💤 Descansando na fogueira até recuperar tudo…');
  } else { P.tgt = null; P.tx = sx; P.tz = sz; }
}
