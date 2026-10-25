/* Troca de arma: guarda a que está na mão e saca a outra (animação em duas fases, ver holster.js).
   Tecla X, botão da hotbar e auto combate (arma de fogo de longe, corpo a corpo de perto). */
import { P } from '../entities/player.js';
import { WEAPONS } from '../data/weapons.js';
import { kindOf, DURATION } from '../entities/holster.js';
import { applyWeaponBonus } from './inventory.js';
import { log } from '../ui/notify.js';

const kindOfSlot = k => kindOf(WEAPONS[P.wids[k]]);

/** Inicia a troca para a outra arma equipada (se houver) */
export function switchWeapon() {
  if (P.mounted || P.swap || P.dead || P.sit || P.sitT || P.roll > 0) return;
  const to = P.act === 'wpn' ? 'gun' : 'wpn';
  if (!P.models[to]) { log(to === 'gun' ? '🔫 Sem arma de fogo equipada' : '⚔ Sem arma corpo a corpo equipada'); return; }
  P.swap = { to, phase: 0, t: 0, u: 1, kind: kindOfSlot(P.act), cur: null, last: performance.now() };
}

/** Avança a troca: fase 0 guarda a arma da mão (roteiro de trás para a frente), fase 1 saca a nova */
let icon = '';

export function updateSwap(dt) {
  const ic = P.act === 'gun' ? '🔫' : '⚔';
  if (ic !== icon) { icon = ic; const el = document.getElementById('s1i'); if (el) el.textContent = ic; }
  const s = P.swap;
  if (!s) return;
  s.t += dt;
  if (s.phase === 0) {
    const d = DURATION[s.kind];
    s.u = 1 - Math.min(1, s.t / d);
    if (s.t >= d) {
      P.act = s.to;
      P.hand = P.models[s.to];
      P.wid = P.wids[s.to];
      P.hl.p.set(0, -.32, 0);
      P.hl.q.identity();
      applyWeaponBonus();
      s.phase = 1;
      s.t = 0;
      s.u = 0;
      s.kind = kindOfSlot(s.to);
    }
  } else {
    const d = DURATION[s.kind];
    s.u = Math.min(1, s.t / d);
    if (s.t >= d) { P.swap = null; }
  }
}

let lastAuto = -1e9;

/** Auto combate: respeita a arma escolhida; só com a arma de fogo na mão e inimigo perto (< 4,5) ele guarda a de fogo e saca a corpo a corpo.
    `dist` = distância do inimigo mais próximo. Intervalo mínimo de 2,5 s entre trocas. */
export function autoWeapon(dist) {
  if (P.swap || P.dead || !P.models.gun || !P.models.wpn) return;
  const now = performance.now();
  if (now - lastAuto < 2500) return;
  if (dist < 4.5 && P.act === 'gun') {
    lastAuto = now;
    switchWeapon();
  }
}
