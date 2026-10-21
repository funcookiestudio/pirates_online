/* Mochila e equipamento. */
import { P } from '../entities/player.js';
import { mountWeapons } from '../entities/player-weapon.js';
import { WEAPONS, RN, AN } from '../data/weapons.js';
import { emit } from '../core/events.js';
import { log, lootText } from '../ui/notify.js';

/** Itens guardados na mochila */
export const bag = [];

/** Limite da mochila (equipamentos) e do baú da vila */
export const BAG_MAX = 24, CHEST_MAX = 48;
export const chest = [];
export const bagFull = () => bag.length >= BAG_MAX;

/** Equipamento atual: arma corpo a corpo (wpn), arma de fogo (gun) e armadura (arm). Uma arma fica na mão, a outra no coldre. */
export const eq = { wpn: null, gun: null, arm: null };

/** Em qual espaço de equipamento o item entra */
export const slotOf = it => it.ty === 'arm' ? 'arm' : (WEAPONS[it.w].gun ? 'gun' : 'wpn');

/** Adiciona à mochila um item caído (`l` = { ty, q, wi }) */
export function addItem(l) {
  if (l.it) { bag.push(l.it); lootText('Item: ' + l.it.n); emit('inventory:changed'); return; }
  const v = Math.round((l.ty === 'wpn' ? WEAPONS[l.wi].b : 8) * l.q * (1 + ((l.il || 1) - 1) * .2));
  const it = { ty: l.ty, q: l.q, v, w: l.wi, n: l.ty === 'wpn' ? WEAPONS[l.wi].n : AN[l.q - 1] };
  bag.push(it);
  lootText('Item: ' + it.n + ' (' + RN[l.q] + ')');
  emit('inventory:changed');
}

/** Equipa o item `i` da mochila; o item antigo do mesmo espaço volta para a mochila */
export function equip(i) {
  const it = bag[i];
  if (!it) return;
  const slot = slotOf(it), old = eq[slot];
  if (old) {
    if (slot === 'arm') { P.max -= old.v; P.hp = Math.min(P.hp, P.max); }
    bag.push(old);
  }
  eq[slot] = it;
  bag.splice(i, 1);
  if (slot === 'arm') { P.max += it.v; P.hp += it.v; }
  else {
    P.swap = null;
    // a arma nova vai para a mão se for do espaço que já estava na mão; senão vai direto para o coldre
    setWeapon(P.models[P.act] && P.act !== slot ? P.act : slot);
  }
  emit('inventory:changed');
}

/** Soma ao dano o bônus da arma que está na mão (e tira o da anterior) */
export function applyWeaponBonus() {
  const nb = (eq[P.act] && eq[P.act].v) || 0;
  P.dmg += nb - P.wb;
  P.wb = nb;
}

/** Monta as armas equipadas; `prefer` = qual fica na mão ('wpn' ou 'gun') */
export function setWeapon(prefer) {
  const act = prefer || P.act;
  mountWeapons({ wpn: eq.wpn ? eq.wpn.w : 0, gun: eq.gun ? eq.gun.w : null }, act === 'gun' && !eq.gun ? 'wpn' : act);
  applyWeaponBonus();
}
