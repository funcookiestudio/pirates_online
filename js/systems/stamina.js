/* Auto combate pago: cobra ouro por minuto (só fora da vila). Sem ouro para a próxima moeda, ele para de atacar e foge para a vila.
   O custo sobe com o nível do personagem (acompanha o ouro que os inimigos dão) e é grátis até o nível FREE_LV. */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { standUp } from './rest.js';
import { log } from '../ui/notify.js';
import { goldAt } from '../data/scaling.js';
import { VILLAGE_R } from '../core/village-const.js';
import { MOUNT, toggleMount } from './mount.js';
import { potion } from './combat.js';

export const FREE_LV = 5;     // até este nível o auto combate é grátis
const SAFE = 14;              // sem inimigo a menos de SAFE m (nem perseguindo a menos de 25 m) = área segura

/** Ouro cobrado por minuto de auto combate (0 = grátis) para um personagem de nível L */
export const autoCost = L => L <= FREE_LV ? 0 : Math.round(.45 * goldAt(L)) + 1;
/** Minutos de auto que o ouro atual paga (Infinity se for grátis) */
export const autoMinutes = () => { const c = autoCost(P.lv); return c ? P.gold / c : Infinity; };

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
  const c = autoCost(P.lv);
  if (on && c && P.gold < c) { log('💰 Sem ouro para o auto combate — custa ' + c + ' por minuto (grátis até o nível ' + FREE_LV + ')'); return; }
  state.autoOn = on;
  state.autoHold = 0; state.fleeing = false; state.autoDebt = 0; state.autoWarn = false;
  if (on && P.sitT) standUp();   // estava sentado: levanta para lutar
  $('sa').classList.toggle('on', on);
  log(on ? '🤖 Auto combate ligado' + (c ? ' · -' + c + ' ouro por minuto fora da vila' : ' (grátis até o nível ' + FREE_LV + ')') + ' · clique para assumir por 2,5s' : '🤖 Auto combate desligado');
}

/** Cobra o auto combate (fora da vila) e, sem ouro, manda o jogador fugir para a vila */
export function updateStamina(dt) {
  if (P.dead || !state.autoOn) { state.fleeing = false; return; }
  if (state.fleeing) {
    if (Math.hypot(P.x, P.z) < VILLAGE_R - 4) { state.fleeing = false; setAuto(false); log('🏠 Cheguei na vila: ganhe ouro e volte quando quiser'); }
    return;
  }
  const c = autoCost(P.lv);
  if (!c || Math.hypot(P.x, P.z) < VILLAGE_R + 1) return;   // grátis, ou na vila (compras, vendas e baú não são cobrados)
  state.autoDebt = (state.autoDebt || 0) + c * dt / 60;
  if (state.autoDebt >= 1) {
    const pay = Math.floor(state.autoDebt);
    state.autoDebt -= pay;
    if (P.gold >= pay) P.gold -= pay;
    else { P.gold = 0; log('💰 Acabou o ouro do auto combate: fugindo para a vila!'); state.fleeing = true; P.tgt = null; return; }
  }
  if (!state.autoWarn && autoMinutes() < 1) { state.autoWarn = true; log('⚠ Ouro para menos de 1 minuto de auto combate'); }
  else if (state.autoWarn && autoMinutes() > 1.5) state.autoWarn = false;
}

/** Movimento de fuga (chamado pelo auto no lugar da luta): poção se precisar, monta se tiver cavalo e corre para a vila */
export function fleeStep() {
  const thr = enemies.some(e => !e.dead && e.ag && Math.hypot(e.x - P.x, e.z - P.z) < 12);
  if (P.hp < P.max * .4 && P.pot > 0 && thr) potion();
  if (MOUNT.owned && !MOUNT.dismissed && !MOUNT.on && !MOUNT.dis && !P.swimming && !P.sit && !P.sitT) toggleMount(true);
  P.tgt = null;
  if (Math.hypot(P.tx, P.tz) > 12) { P.tx = 0; P.tz = 0; }   // só (re)define o destino quando ele muda (o jogo ajusta o ponto para um lugar livre)
}
