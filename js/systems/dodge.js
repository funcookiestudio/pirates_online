/* Esquiva (Espaço): rolamento para trás com invulnerabilidade durante a rolada.
   A direção é sempre oposta à que o personagem está olhando. */
import { P } from '../entities/player.js';
import { puff } from './effects.js';

export const ROLL_TIME = .5; // duração da rolada (s)
export const ROLL_CD = 3.5;  // recarga (s)
const ROLL_SPEED = 14;       // velocidade inicial (m/s); desacelera até ~30% no fim

/** Inicia a rolada, se possível */
export function dodge() {
  if (P.swap) return;
  if (P.dead || P.roll > 0 || P.rcd > 0 || P.sit > 0 || P.sitT) return;
  const a = P.g.rotation.y;
  P.roll = ROLL_TIME;
  P.rcd = ROLL_CD;
  P.rdx = -Math.sin(a);
  P.rdz = -Math.cos(a);
  P.imp = 0;  // cancela golpe corpo a corpo em andamento
  P.sw = 0;
  P.vx = P.vz = 0;
  puff(P.x, .2, P.z, 0xc9b48a, 3, 6);
}

/** Desloca o jogador durante a rolada (substitui o movimento normal) */
export function rollMove(dt) {
  const u = 1 - P.roll / ROLL_TIME;
  const sp = ROLL_SPEED * (1 - u * .7);
  P.x += P.rdx * sp * dt;
  P.z += P.rdz * sp * dt;
  if (!P.tgt) { P.tx = P.x; P.tz = P.z; } // não volta para o ponto clicado depois
}

/** Contagem regressiva da rolada e da recarga; poeira ao aterrissar */
export function updateDodgeTimers(dt) {
  if (P.roll > 0) {
    P.roll -= dt;
    if (P.roll <= 0) {
      P.roll = 0;
      puff(P.x, .2, P.z, 0xc9b48a, 3, 6);
    }
  }
  P.rcd = Math.max(0, P.rcd - dt);
}

/**
 * Pose da rolada: o corpo gira 360° para trás em volta do centro (não dos pés),
 * pula um pouco e encolhe pernas e braços.
 */
export function animateRoll() {
  const u = 1 - P.roll / ROLL_TIME;
  const e = .5 * u + .5 * u * u * (3 - 2 * u);   // leve aceleração no meio
  const th = -Math.PI * 2 * e;                    // negativo = cabeça vai para trás
  const h = 1.2;                                  // altura do centro de giro (tronco)
  const f = -h * Math.sin(th), yaw = P.g.rotation.y;

  P.g.rotation.x = th;
  P.g.position.set(
    P.x + Math.sin(yaw) * f,
    h * (1 - Math.cos(th)) + .55 * Math.sin(Math.PI * u),
    P.z + Math.cos(yaw) * f
  );

  // encolhe (tk: 0 em pé → 1 totalmente agachado)
  const tk = Math.min(1, Math.sin(Math.PI * u) * 1.8);
  P.g.legL.rotation.x = P.g.legR.rotation.x = -1.5 * tk;
  P.g.legL.knee.rotation.x = P.g.legR.knee.rotation.x = 1.7 * tk;
  P.g.arm.rotation.set(P.aa * (1 - tk) - 1.3 * tk, 0, (P.az || 0) * (1 - tk));
  P.g.arm.fa.rotation.x = P.af * (1 - tk) - 1.7 * tk;
  P.g.armL.rotation.set(-1.3 * tk, 0, 0);
  P.g.armL.fa.rotation.x = -1.7 * tk;
}
