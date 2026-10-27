/* Mochila e equipamento. */
import { P } from '../entities/player.js';
import { mountWeapons, mountTorch } from '../entities/player-weapon.js';
import { WEAPONS, RN, AN } from '../data/weapons.js';
import { emit } from '../core/events.js';
import { itemReq } from '../data/scaling.js';
import { DG } from '../dungeon/dgrid.js';
import { torch as torchLight, hemi } from '../core/engine.js';
import { state } from '../core/state.js';
import { log, lootText } from '../ui/notify.js';
import { hourNow } from '../core/clock.js';
import { isThrown, ammoInfo, ammoCt, setCt } from '../data/ammo.js';

/** Itens guardados na mochila */
export const bag = [];

/** Limite da mochila (equipamentos) e do baú da vila */
export const BAG_MAX = 24, CHEST_MAX = 48;
export const chest = [];

/** Itens de consumo empilham: 5 poções e 3 bombas por pilha. O slot equipado (P.pot/P.bmb) leva uma pilha; o resto fica no CINTO
    (P.potR/P.bmbR, em pilhas cheias). Cada pilha do cinto ocupa UMA vaga da mochila: o cinto não cria vagas. */
export const POT_MAX = 5, BOMB_MAX = 3;
const KINDS = { pot: { slot: 'pot', res: 'potR', max: POT_MAX }, bmb: { slot: 'bmb', res: 'bmbR', max: BOMB_MAX } };
/** Vagas da mochila ocupadas pelo cinto */
export const beltSlots = () => Math.ceil(P.potR / POT_MAX) + Math.ceil(P.bmbR / BOMB_MAX);
/** Vagas usadas na mochila: equipamentos + pilhas do cinto */
export const bagUsed = () => bag.length + beltSlots();
export const bagFull = () => bagUsed() >= BAG_MAX;
/** Pilhas do cinto, na ordem de exibição: [{ k: 'pot' | 'bmb', n }] */
export function beltStacks() {
  const out = [];
  for (const k in KINDS) { const { res, max } = KINDS[k]; for (let r = P[res]; r > 0; r -= max) out.push({ k, n: Math.min(max, r) }); }
  return out;
}
/** Quantas unidades de `k` ('pot' | 'bmb') ainda cabem: o slot equipado + a pilha parcial do cinto + vagas livres da mochila
    (`cap` = limite de vagas do cinto, usado pelo auto) */
export function beltRoom(k, cap = BAG_MAX) {
  const { slot, res, max } = KINDS[k], part = P[res] % max ? max - P[res] % max : 0;
  const free = Math.max(0, Math.min(BAG_MAX - bagUsed(), cap - beltSlots()));
  return (max - P[slot]) + part + free * max;
}
/** Guarda `n` unidades: primeiro no slot equipado, o resto no cinto. Devolve quantas entraram */
export function beltAdd(k, n = 1) {
  const { slot, res, max } = KINDS[k], add = Math.min(n, beltRoom(k));
  const s = Math.min(add, max - P[slot]);
  P[slot] += s; P[res] += add - s;
  if (add) emit('inventory:changed');
  return add;
}
let BT = 0;
/** Slot equipado vazio e há reserva no cinto: saca uma pilha (~0,5 s depois). Chamar a cada frame. */
export function beltTick(dt) {
  if (!Object.values(KINDS).some(({ slot, res }) => P[slot] <= 0 && P[res] > 0)) { BT = 0; return; }
  if ((BT += dt) < .5) return;
  BT = 0;
  for (const k in KINDS) {
    const { slot, res, max } = KINDS[k];
    if (P[slot] > 0 || P[res] <= 0) continue;
    const n = Math.min(max, P[res]); P[slot] = n; P[res] -= n;
    lootText('Cinto: ' + (k === 'pot' ? '+' : '+') + n);
  }
  emit('inventory:changed');
}
/** Preços fixos: poção na taverna / com a mercadora, bomba com a mercadora */
export const PRICE = { potTavern: 25, potTrader: 32, bomb: 45 };
/** O item caído `l` não pode ser coletado agora (mochila cheia ou poções no limite)? */
export const lootBlocked = l => ((l.ty === 'wpn' || l.ty === 'arm') && bagFull() && !(isThrown({ ty: l.ty, w: l.wi }) && ammoStack(l.wi))) || (l.ty === 'pot' && beltRoom('pot') <= 0);

/** Equipamento atual: arma corpo a corpo (wpn), arma de fogo (gun) e armadura (arm). Uma arma fica na mão, a outra no coldre. */
export const eq = { wpn: null, gun: null, arm: null, off: null };   // off = segunda mão (livre): outra arma do mesmo tipo

/** Em qual espaço de equipamento o item entra */
export const isTorch = it => !!it && it.ty === 'wpn' && !!WEAPONS[it.w].torch;
export const slotOf = it => it.ty === 'arm' ? 'arm' : isTorch(it) ? 'off' : (WEAPONS[it.w].gun ? 'gun' : 'wpn');

/** Adiciona à mochila um item caído (`l` = { ty, q, wi }) */
/** Pilha existente do arremesso `w` (a equipada ou a da mochila) */
export const ammoStack = w => (isThrown(eq.gun) && eq.gun.w === w ? eq.gun : bag.find(b => isThrown(b) && b.w === w)) || null;
/** Total de unidades do arremesso `w` (equipada + mochila) */
export const ammoTotal = w => (isThrown(eq.gun) && eq.gun.w === w ? ammoCt(eq.gun) : 0) + bag.reduce((a, b) => a + (isThrown(b) && b.w === w ? ammoCt(b) : 0), 0);
export const LAST = { w: null };   // último arremesso usado (o auto repõe esse)

export function addItem(l) {
  const tw = l.it ? (isThrown(l.it) ? l.it.w : null) : (isThrown({ ty: l.ty, w: l.wi }) ? l.wi : null);
  if (tw != null) {   // arremesso: soma na pilha que já existe
    const n = l.it ? ammoCt(l.it) : (l.ct || Math.ceil(ammoInfo(tw).max / 2)), st = ammoStack(tw);
    if (st) { setCt(st, Math.min(ammoInfo(tw).max, ammoCt(st) + n)); lootText('🎯 ' + st.n); emit('inventory:changed'); return; }
    if (!l.it) {
      const it = { ty: 'wpn', q: l.q, v: Math.round(WEAPONS[tw].b * l.q * (1 + ((l.il || 1) - 1) * .2)), il: l.il || 1, w: tw, n: '' };
      setCt(it, Math.min(ammoInfo(tw).max, n)); bag.push(it); lootText('Item: ' + it.n); emit('inventory:changed'); return;
    }
  }
  if (l.it) { bag.push(l.it); lootText('Item: ' + l.it.n); emit('inventory:changed'); return; }
  const v = Math.round((l.ty === 'wpn' ? WEAPONS[l.wi].b : 8) * l.q * (1 + ((l.il || 1) - 1) * .2));
  const it = { ty: l.ty, q: l.q, v, il: l.il || 1, w: l.wi, n: l.ty === 'wpn' ? WEAPONS[l.wi].n : AN[l.q - 1] };
  bag.push(it);
  lootText('Item: ' + it.n + ' (' + RN[l.q] + ')');
  emit('inventory:changed');
}

/** Em que espaço o item entra? 'wpn' | 'gun' | 'arm' | 'off' (segunda mão). Com `better`, devolve null se não melhora nada.
    Mão 2: aceita outra arma do mesmo tipo (dois machadinhos, duas pistolas); armas grandes (mosquete) ocupam as duas mãos. */
export function pickSlot(it, better) {
  if (better && P.lv < itemReq(it)) return null;      // auto-equipar só itens que o nível permite
  if (isTorch(it)) return !better && canEquipTo(it, 'off') ? 'off' : null;   // o auto-equipar não mexe na tocha: torch-auto.js cuida dela (só no escuro)
  if (better && it.ty === 'wpn' && WEAPONS[it.w].big && isTorch(eq.off) && (state.autoCfg.torch === 2 || (state.autoCfg.torch === 1 && isDark()))) return null;   // tocha em uso: o auto-equipar não volta à arma de 2 mãos (o torch-auto a guarda e devolve quando clarear)
  const s = slotOf(it);
  if (s === 'arm') return !eq.arm || !better || it.v > eq.arm.v ? 'arm' : null;
  const main = eq[s];
  if (!main) return s;
  const big = WEAPONS[it.w].big || WEAPONS[main.w].big, off = eq.off, offSame = off && slotOf(off) === s;
  if (!off && !big) return 'off';
  const low = offSame && !isTorch(off) && off.v < main.v ? 'off' : s;   // a tocha não é arma fraca: senão o auto-equipar a trocava por uma arma da mochila e o torch-auto devolvia (vai-e-vem)
  return !better || it.v > eq[low].v ? low : null;
}

/** Equipa o item `i` da mochila; o item antigo do mesmo espaço volta para a mochila */
/** O item `it` pode ir para o espaço `slot` (arrastar e soltar)? A mão 2 aceita o mesmo tipo da principal, exceto armas grandes. */
export function canEquipTo(it, slot) {
  // tocha: só na mão 2 (com arma de 2 mãos na mão ela some até voltar a uma de 1 mão)
  if (isTorch(it)) return slot === 'off';
  const s = slotOf(it);
  if (slot === s) return true;
  if (slot === 'off') return s !== 'arm' && !WEAPONS[it.w].big && !!eq[s] && !WEAPONS[eq[s].w].big;
  return false;
}

export function equip(i, forced) {
  const it = bag[i];
  if (!it) return;
  if (P.lv < itemReq(it)) { log('🔒 ' + it.n + ' exige nível ' + itemReq(it)); return; }
  const slot = forced && canEquipTo(it, forced) ? forced : pickSlot(it, false), old = eq[slot];
  bag.splice(i, 1);
  if (old) {
    if (slot === 'arm') { P.max -= old.v; P.hp = Math.min(P.hp, P.max); }
    bag.push(old);
  }
  eq[slot] = it;
  if (slot === 'arm') { P.max += it.v; P.hp += it.v; }
  else if (slot === 'off') {
    // grande na mão principal ocupa as duas mãos; mão 2 e principal de tipos diferentes não se misturam
    applyWeaponBonus(); refreshTorch();
  } else {
    if (WEAPONS[it.w].big && eq.off && slotOf(eq.off) === slot && !isTorch(eq.off) && bagUsed() < BAG_MAX) { bag.push(eq.off); eq.off = null; }
    P.swap = null;
    // a arma nova vai para a mão se for do espaço que já estava na mão; senão vai direto para o coldre
    setWeapon(P.models[P.act] && P.act !== slot ? P.act : slot);
  }
  emit('inventory:changed');
}

/** Tira o item do espaço `slot` e devolve à mochila (se couber). Sem a principal, a mão 2 do mesmo tipo assume. */
export function unequip(slot) {
  const it = eq[slot];
  if (!it) return false;
  if (bagFull()) { log('Mochila cheia: libere espaço para desequipar ' + it.n); return false; }
  if (slot === 'arm') { P.max -= it.v; P.hp = Math.min(P.hp, P.max); eq.arm = null; }
  else {
    eq[slot] = null;
    if (slot !== 'off' && eq.off && slotOf(eq.off) === slot) { eq[slot] = eq.off; eq.off = null; }
    if (slot !== 'off') { P.swap = null; setWeapon(P.act); } else { applyWeaponBonus(); refreshTorch(); }
  }
  bag.push(it);
  emit('inventory:changed');
  return true;
}

/** Soma ao dano o bônus da arma que está na mão (e tira o da anterior) */
export function applyWeaponBonus() {
  // segunda mão do mesmo tipo da que está na mão soma 60% do ataque
  const nb = ((eq[P.act] && eq[P.act].v) || 0) + (eq.off && slotOf(eq.off) === P.act ? Math.round(eq.off.v * .6) : 0) + (isTorch(eq.off) ? Math.round(eq.off.v * .5) : 0);
  P.dmg += nb - P.wb;
  P.wb = nb;
}

/** Monta as armas equipadas; `prefer` = qual fica na mão ('wpn' ou 'gun') */
/** Modelo da tocha na mão livre e alcance da luz */
/** Está escuro? Pela luz ambiente do mundo (dia .85 · dungeon .5 · noite .26), com histerese para não piscar no entardecer */
let DARK = false;
export function isDark() { if (DG.on) return true; const d = (.85 - hemi.intensity) / .55; DARK = DARK ? d > .25 : d > .5; return DARK; }
/** Tocha acesa na mão: não com arma de 2 mãos; só no escuro (noite, dungeon, tempestade) — de dia fica guardada.
    Ajuste do auto: Automática (1) · Sempre acesa (2) · Nunca (0) */
export const torchLit = () => { const m = state.autoCfg.torch; return m !== 0 && !WEAPONS[P.wid].big && (m === 2 || isDark()); };
export function refreshTorch() {
  const has = isTorch(eq.off);
  mountTorch(has ? eq.off.w : null);
  const on = has && torchLit();
  if (P.torchM) P.torchM.visible = on;
  torchLight.distance = on ? 44 : 22;
  torchLight.intensity = (DG.on ? 1.8 : 1.2) * (on ? 1.5 : 1);     // com tocha: luz mais forte e que alcança mais longe
}

export function setWeapon(prefer) {
  const act = prefer || P.act;
  mountWeapons({ wpn: eq.wpn ? eq.wpn.w : 0, gun: eq.gun ? eq.gun.w : null }, act === 'gun' && !eq.gun ? 'wpn' : act);
  if (P.models.wpn) P.models.wpn.visible = !!eq.wpn;      // sem arma equipada: mãos vazias (o modelo padrão só serve de base para os cálculos)
  if (P.models.gun) P.models.gun.visible = !!eq.gun;
  applyWeaponBonus();
  refreshTorch();
}

/** Gasta 1 unidade do arremesso equipado. Devolve { w, q, keep } (keep = o projétil cai inteiro no chão) ou null se não é arremesso.
    Acabando a pilha: repõe com outra pilha da mochila ou volta para a arma corpo a corpo. */
export function spendAmmo() {
  const it = eq.gun;
  if (!isThrown(it)) return null;
  const info = ammoInfo(it.w), c = ammoCt(it) - 1, out = { w: it.w, q: it.q, keep: !info.consume && Math.random() > info.brk };
  LAST.w = it.w;
  setCt(it, c);
  if (c <= 0) {
    eq.gun = null;
    log('Acabaram: ' + WEAPONS[it.w].n);
    const j = bag.findIndex(b => isThrown(b) && b.w === it.w), j2 = j >= 0 ? j : bag.findIndex(isThrown);
    P.swap = null;
    if (j2 >= 0) equip(j2, 'gun'); else setWeapon('wpn');
  }
  emit('inventory:changed');
  return out;
}
