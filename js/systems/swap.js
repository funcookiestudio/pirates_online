/* Troca de arma: guarda a que está na mão e saca a outra (animação em duas fases, ver holster.js).
   Tecla X, botão da hotbar e auto combate (arma de fogo de longe, corpo a corpo de perto). */
import { P } from '../entities/player.js';
import { WEAPONS } from '../data/weapons.js';
import { kindOf, DURATION } from '../entities/holster.js';
import { applyWeaponBonus, eq, setWeapon, reserveClass } from './inventory.js';
import { emit } from '../core/events.js';
import { hasAmmo } from './combat.js';
import { log } from '../ui/notify.js';

const kindOfSlot = k => kindOf(WEAPONS[P.wids[k]]);

/** Inicia a troca para a outra arma equipada (se houver) */
/** Mago: troca a arma mágica em uso pela reserva (Cajado ↔ Rod), na hora, sem custo de mana nem recarga (o Cutelo fica fora desta troca). Devolve true se trocou. */
export function swapMagic() {
  const a = eq.gun, b = eq.res;
  if (!b || !reserveClass()) return false;
  eq.gun = b;
  if (a) eq.res = a; else delete eq.res;
  P.swap = null;
  setWeapon('gun');   // remonta o modelo e recalcula o bônus de ataque (applyWeaponBonus)
  log('Arma mágica: ' + eq.gun.n);
  emit('inventory:changed');
  return true;
}

/** Tecla X / botão da hotbar. Mago com arma mágica reserva: alterna Cajado ↔ Rod. `melee` (Shift+X e o auto-combate) = a troca de sempre com a arma corpo a corpo. */
export function switchWeapon(melee) {
  if (P.mounted || P.swap || P.dead || P.sit || P.sitT || P.roll > 0) return;
  if (!melee && eq.res && reserveClass() && (P.act === 'gun' || !eq.gun)) { swapMagic(); return; }
  const to = P.act === 'wpn' ? 'gun' : 'wpn';
  if (!P.models[to]) { log(to === 'gun' ? 'Sem arma de fogo equipada' : 'Sem arma corpo a corpo equipada'); return; }
  P.swap = { to, phase: 0, t: 0, u: 1, kind: kindOfSlot(P.act), cur: null, last: performance.now() };
}

/** Avança a troca: fase 0 guarda a arma da mão (roteiro de trás para a frente), fase 1 saca a nova */
let icon = '';

export function updateSwap(dt) {
  const mw = P.act === 'gun' && reserveClass() && WEAPONS[P.wid] && WEAPONS[P.wid].mt;
  const ic = P.act === 'gun' ? (mw ? (WEAPONS[P.wid].mt === 'rod' ? '✨' : '🔮') : '🔫') : '⚔';
  if (ic !== icon) { icon = ic; const el = document.getElementById('s1i'); if (el) el.textContent = ic; const b = document.getElementById('s1'); if (b) b.title = reserveClass() ? 'Alternar Cajado ↔ Rod (X) · Shift+X: arma corpo a corpo' : 'Trocar arma (X)'; }
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
let autoOut = false;   // o auto guardou o arco/cajado por falta de flechas/virotes (volta quando houver de novo)

/** Auto combate: respeita a arma escolhida; só com a arma de fogo na mão e inimigo perto (< 4,5) ele guarda a de fogo e saca a corpo a corpo.
    `dist` = distância do inimigo mais próximo. Intervalo mínimo de 2,5 s entre trocas. */
export function autoWeapon(dist) {
  if (P.swap || P.dead || !P.models.gun || !P.models.wpn) return;
  const now = performance.now();
  if (now - lastAuto < 2500) return;
  if (P.act === 'gun' && !hasAmmo(WEAPONS[P.wid])) { lastAuto = now; autoOut = true; switchWeapon(true); return; }
  if (autoOut && P.act === 'wpn' && hasAmmo(WEAPONS[P.wids.gun]) && dist >= 6) { autoOut = false; lastAuto = now; switchWeapon(true); return; }   // flechas de volta: saca o arco de novo   // sem flechas/virotes: saca a arma corpo a corpo
  if (dist < 4.5 && P.act === 'gun') {
    lastAuto = now;
    switchWeapon(true);   // o auto troca de/para a arma corpo a corpo, nunca Cajado↔Rod
  }
}
