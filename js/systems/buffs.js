/* Efeitos temporizados de jogador e companheiro (Etapa 6): cura contínua, escudo, +dano, -dano recebido, +velocidade.
   UM lugar para criar, acumular/renovar, tickar e expirar (updateBuffs, chamado uma vez por quadro em main.js). Independe da arma na mão:
   trocar Cajado↔Rod não remove nem duplica nada; as recargas das habilidades ficam em skills.js. Os efeitos não vão para o save (são transitórios).
   Todo benefício real (vida curada, dano absorvido, buff que de fato ajudou) vira XP de Rod por profRodSupport (prof.js), que já tem 0 sem benefício e tetos. */
import { P } from '../entities/player.js';
import { PST, pmax } from '../pets/stats.js';
import { state } from '../core/state.js';
import { puff } from './effects.js';
import { BUFF_CFG } from '../data/skills.js';
import { profRodSupport } from './prof.js';

/** Efeitos ativos por alvo: 'p' = jogador, 'pet' = companheiro ativo. Cada um: { id, t, dur, pow, amt, acc } */
export const BUFFS = { p: [], pet: [] };
let petId = null;

/** Posição do companheiro (registrada por main.js: evita ciclo de imports com pets/manager.js) */
let petPosFn = () => null;
export const setPetPos = f => { petPosFn = f; };
export const petPosOf = () => petPosFn();
export const petDist = () => { const p = petPosFn(); return p ? Math.hypot(p.x - P.x, p.z - P.z) : 1e9; };
/** O companheiro ativo está presente e acordado? */
export const petAvail = () => !!PST[state.pet.id] && !state.petOff && PST[state.pet.id].dn <= 0;
const room = who => who === 'p' ? P.max - P.hp : petAvail() ? pmax(state.pet.id) - PST[state.pet.id].hp : 0;
export const maxOf = who => who === 'p' ? P.max : pmax(state.pet.id);
export const hpOf = who => who === 'p' ? P.hp : PST[state.pet.id].hp;

/** Função única de cura: devolve a quantidade EFETIVAMENTE curada (limitada à vida que faltava; 0 com vida cheia, morto ou companheiro desmaiado) */
export function heal(who, amt) {
  if (!(amt > 0) || (who === 'p' && P.dead)) return 0;
  const eff = Math.max(0, Math.min(amt, room(who)));
  if (eff <= 0) return 0;
  if (who === 'p') P.hp += eff; else PST[state.pet.id].hp += eff;
  return eff;
}

const find = (who, id) => BUFFS[who].find(b => b.id === id);
export const hasBuff = (who, id) => !!find(who, id);
export const buffPow = (who, id) => { const b = find(who, id); return b ? b.pow : 0; };
export const buffList = who => BUFFS[who].map(b => ({ id: b.id, t: b.t, pow: b.pow, amt: b.amt }));

/** Cria/renova um efeito. Mesmo id = renova (duração e intensidade ficam com o maior valor). Limite de efeitos diferentes por alvo. Devolve true se aplicou. */
export function addBuff(who, id, o) {
  if (who === 'pet' && !petAvail()) return false;
  if (who === 'p' && P.dead) return false;
  const cap = { atk: BUFF_CFG.capAtk, dr: BUFF_CFG.capDr, spd: BUFF_CFG.capSpd }[id], pow = Math.min(cap === undefined ? 99 : cap, o.pow || 0), b = find(who, id);
  if (b) { b.t = b.dur = Math.max(b.t, o.dur); b.pow = Math.max(b.pow, pow); b.amt = Math.max(b.amt || 0, o.amt || 0); return true; }
  if (BUFFS[who].length >= BUFF_CFG.max) return false;
  BUFFS[who].push({ id, t: o.dur, dur: o.dur, pow, amt: o.amt || 0, acc: 0 });
  return true;
}
export function clearBuffs(who) { (who ? [who] : ['p', 'pet']).forEach(w => { BUFFS[w].length = 0; }); }

/* XP de "buff realmente útil": no máximo 1 por segundo e meio por tipo (o teto por janela é do profRodSupport) */
const last = {};
function useful(id) { const n = performance.now(); if (!last[id] || n - last[id] > 1500) { last[id] = n; profRodSupport('buff', 1, id); } }

/** Escudo: absorve `d` do dano que ia entrar; devolve o que sobrou. XP só pelo que foi realmente absorvido. */
function absorb(who, d) {
  const b = find(who, 'shield');
  if (!b || !(b.amt > 0) || !(d > 0)) return d;
  const a = Math.min(b.amt, d);
  b.amt -= a; if (b.amt <= .01) BUFFS[who].splice(BUFFS[who].indexOf(b), 1);   // escudo esgotado some na hora
  profRodSupport('shield', a, who);
  return d - a;
}
export const absorbP = d => absorb('p', d);
/** Redução de dano recebido (Véu/Santuário) */
export function drMult(who, d) { const p = buffPow(who, 'dr'); if (p > 0 && d > 0) useful('dr'); return p > 0 ? 1 - p : 1; }
/** Aumento de dano causado (Fúria): chamado em cada golpe do jogador */
export function atkMult() { const p = buffPow('p', 'atk'); if (p > 0) useful('atk'); return 1 + p; }
/** Companheiro recebe dano: escudo e redução do Rod (usado por pets/manager.js hurtPet). Devolve o dano que sobra. */
export function petHurt(d) { d *= drMult('pet', d); return absorb('pet', d); }

/** Tick único de todos os efeitos (uma vez por quadro) */
export function updateBuffs(dt) {
  if (petId !== state.pet.id) { petId = state.pet.id; BUFFS.pet.length = 0; }   // trocou de companheiro: os efeitos dele não passam para outro
  if (P.dead) { clearBuffs(); return; }
  for (const who of ['p', 'pet']) {
    const L = BUFFS[who];
    if (who === 'pet' && !petAvail() && L.length) { L.length = 0; continue; }
    for (let i = L.length - 1; i >= 0; i--) {
      const b = L[i];
      b.t -= dt;
      if (b.id === 'regen') {
        b.acc += dt;
        while (b.acc >= BUFF_CFG.tick) {
          b.acc -= BUFF_CFG.tick;
          const eff = heal(who, b.pow * maxOf(who) * BUFF_CFG.tick);
          if (eff > 0) profRodSupport('heal', eff, who);
        }
      }
      if (b.id === 'ward' && who === 'p' && P.slow > 0) { P.slow = 0; useful('ward'); }   // Égide: lentidão não pega (o empurrão é cortado por P.noKb em skills.js)
      if (b.id === 'spd' && who === 'p') {   // velocidade: reaproveita P.haste/P.hasteK (player-update.js); só o Mago usa o Rod, então não conflita com a esquiva do Ladino
        P.haste = Math.max(P.haste || 0, b.t); P.hasteK = 1 + b.pow;
        if (Math.hypot(P.vx || 0, P.vz || 0) > .5) useful('spd');
      }
      if (b.t <= 0) L.splice(i, 1);
    }
  }
}

/** Pequeno brilho sobre o alvo (barato) */
export function sparkle(x, y, z, color) { puff(x, y, z, color, 2, 4); }
