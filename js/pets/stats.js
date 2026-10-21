/* Progressão dos companheiros: nível, XP, pontos e bônus das habilidades. */
import { PETLIST, PSK, pxn } from '../data/pets.js';
import { state } from '../core/state.js';
import { emit } from '../core/events.js';
import { P } from '../entities/player.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';

/** Estado de cada companheiro: lv, xp, pts (pontos livres), rk (níveis das habilidades), hp, dn (tempo desmaiado) */
export const PST = {};
Object.keys(PSK).forEach(k => { PST[k] = { lv: 1, xp: 0, pts: 0, rk: {}, hp: 62, dn: 0 }; });

/** Soma o bônus do efeito `k` (dano, velocidade…) do companheiro ativo */
export const PV = k => {
  const s = PST[state.pet.id];
  let v = k === 'dmg' ? (s.lv - 1) * .04 : 0;
  PSK[state.pet.id].forEach(n => { v += (n.fx[k] || 0) * (s.rk[n.id] || 0); });
  return v;
};

/** Multiplicador do intervalo entre ataques do companheiro (menor = mais rápido) */
export const PCD = () => 1 / (1 + PV('rate'));

/** Vida máxima do companheiro */
export const pmax = id => 50 + 12 * PST[id].lv;

/** O companheiro ativo está desmaiado? */
export const PDN = () => PST[state.pet.id].dn > 0;

/** Dá `n` de XP ao companheiro `id`; sobe de nível e concede pontos de habilidade */
export function petXp(id, n) {
  const s = PST[id];
  s.xp += n;
  while (s.xp >= pxn(s.lv)) {
    s.xp -= pxn(s.lv);
    s.lv++;
    s.pts++;
    s.hp = pmax(id);
    const p = PETLIST.find(x => x.id === id);
    log('⭐ ' + p.ic + ' ' + p.n + ' chegou ao nível ' + s.lv + '! (+1 ponto de habilidade)');
    puff(P.x, 2, P.z, 0x7ac0ff, 5, 12);
    emit('pets:changed');
  }
}
