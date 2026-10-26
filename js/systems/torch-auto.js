/* Tocha automática (auto combate). No escuro (noite, dungeon, tempestade) equipa a tocha da mochila e, se a arma da mão for de 2 mãos,
   passa para uma de 1 mão (a outra arma equipada, ou a melhor de 1 mão da mochila). Sem arma de 1 mão a tocha não é equipada.
   Ao clarear devolve a arma de 2 mãos. A tocha equipada só fica acesa no escuro (ver torchLit em inventory.js); de dia fica guardada. */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { WEAPONS } from '../data/weapons.js';
import { itemReq } from '../data/scaling.js';
import { bag, eq, equip, isTorch, isDark, slotOf } from './inventory.js';
import { switchWeapon } from './swap.js';
import { danger } from './stamina.js';

let T = 0;
let SAVED = null;   // o que voltar quando clarear: { act } (outra arma equipada estava na mão) ou { it } (a arma de 2 mãos foi para a mochila)
const big = it => !!it && !!WEAPONS[it.w].big;

/** Tira a arma de 2 mãos da mão: usa a outra arma equipada se for de 1 mão; senão a melhor de 1 mão da mochila. false = não há como */
function leaveBig(held) {
  const s = slotOf(held), other = s === 'wpn' ? 'gun' : 'wpn';
  if (eq[other] && !big(eq[other]) && P.models[other]) { SAVED = { act: P.act }; switchWeapon(); return true; }
  let bi = -1, bv = -1;
  bag.forEach((it, i) => { if (it.ty === 'wpn' && !isTorch(it) && slotOf(it) === s && !big(it) && it.v > bv && P.lv >= itemReq(it)) { bv = it.v; bi = i; } });
  if (bi < 0) return false;
  SAVED = { it: held };
  equip(bi, s);
  return true;
}

/** Clareou: devolve a arma de 2 mãos que foi guardada */
function restore() {
  const S = SAVED; SAVED = null;
  if (S.act) { if (P.act !== S.act && P.models[S.act]) switchWeapon(); }
  else if (S.it) { const i = bag.indexOf(S.it); if (i >= 0) equip(i, slotOf(S.it)); }
}

/** Chamar a cada frame do auto (se faz sozinho a cada ~1,2 s; só sem inimigo perigoso por perto) */
export function torchStep(dt) {
  T -= dt;
  if (T > 0) return;
  T = 1.2;
  const c = state.autoCfg;
  if (c.torch === 0 || P.dead || P.swap || P.mounted || P.sit || P.sitT || P.roll > 0 || danger()) return;
  if (c.torch === 2 || isDark()) {
    const ti = bag.findIndex(isTorch);
    if (!isTorch(eq.off) && ti < 0) return;                       // sem tocha
    const held = eq[P.act];
    if (big(held)) { if (c.torchSwap) leaveBig(held); return; }   // a tocha entra na próxima rodada, com a mão livre
    if (!isTorch(eq.off) && ti >= 0) equip(ti);
  } else if (SAVED) restore();
}
