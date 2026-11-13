/* Elementos: dano elemental, resistências e status (Etapa 2). OPT-IN: só age quando hit() recebe { el }.
   Reaproveita os campos de status que já existem nos inimigos (nada de sistema paralelo):
     burn → e.bn/bnt/bnd · slow → e.slow · root → e.root · shock → e.sn · poison → e.ps/pst/psd/pn · mark → e.mk/mkv
   Campos novos só para o que não existia: weaken → e.wk (tempo) / e.wkd (dano retirado de e.dmg) · push → empurrão instantâneo (e.kx/e.kz).
   (e.st é o estado de IA dos inimigos: não usar.)
   Tick: a queimadura/veneno/lentidão/preso/provocar dos inimigos já são contados em updateSkills (só personagem com classe); para personagem
   SEM classe (P.skh ausente) updateElements() faz o mesmo tick, sem duplicar (com classe ele só cuida do enfraquecimento e da cor). */
import { P } from '../entities/player.js';
import { eq } from './inventory.js';
import { enemies } from '../core/registry.js';
import { ELEMENTS, MAX_FX, RES } from '../data/elements.js';
import { puff } from './effects.js';
import { hit } from './combat.js';

/** Campo do inimigo que diz se cada tipo de status está ativo agora */
const ACTIVE = { burn: e => e.bn > 0, slow: e => e.slow > 0, root: e => e.root > 0, shock: e => e.sn > 0, poison: e => e.ps > 0, mark: e => e.mk > 0, weaken: e => e.wk > 0 };
const TINT = { burn: 0xa04010, slow: 0x2a6cc0, poison: 0x2a9a2a, root: 0x7fd8ff, shock: 0xf2e45a, mark: 0xfff2a0, weaken: 0x6a3a9a };

/** Resistência de `t` (inimigo, chefe ou P) ao elemento `el`: soma das fontes (base do alvo ou do arquétipo, equipamento, efeito temporário), com limites. Padrão 0. */
export function resistOf(t, el) {
  let r = 0;
  for (const s of RES.sources) {
    r += (t[s] && t[s][el]) || 0;
    if (s === 'res' && t.t && t.t.res) r += t.t.res[el] || 0;            // arquétipo do inimigo
  }
  if (t === P) for (const k in eq) if (eq[k] && eq[k].res) r += eq[k].res[el] || 0;   // equipamento do jogador (campo `res` do item)
  return Math.max(RES.min, Math.min(RES.max, r));
}

/** Dano elemental: aplica a resistência (0 = igual ao base; 1 = zero) */
export const elDamage = (t, d, el) => d * (1 - resistOf(t, el));

/** Tipos de status ativos no alvo (ex.: ['burn','slow']) */
export const statusList = e => Object.keys(ACTIVE).filter(k => ACTIVE[k](e));
export const hasStatus = (e, k) => !!ACTIVE[k] && ACTIVE[k](e);

/** Remove o status `k` (ou todos, sem `k`) */
export function clearStatus(e, k) {
  const all = !k;
  if (all || k === 'burn') e.bn = 0;
  if (all || k === 'slow') e.slow = 0;
  if (all || k === 'root') e.root = 0;
  if (all || k === 'shock') e.sn = 0;
  if (all || k === 'poison') { e.ps = 0; e.pn = 0; }
  if (all || k === 'mark') e.mk = 0;
  if (all || k === 'weaken') { if (e.wk > 0) e.dmg += e.wkd || 0; e.wk = 0; e.wkd = 0; }
}

/** Aplica um status de config `c` (de ELEMENTS[..].fx) sem rolar chance. `d` = dano do golpe, `s` = fator de intensidade (1 - resistência), `o` = opções de hit. Devolve true se aplicou. */
export function applyStatus(e, c, d, s = 1, o = {}) {
  const k = c.k, boss = !!(e.t && e.t.boss), act = ACTIVE[k] ? ACTIVE[k](e) : false;
  if (act && c.stack === 'ignora') return false;
  if (!act && ACTIVE[k] && statusList(e).length >= MAX_FX) return false;   // limite de efeitos simultâneos
  const dur = ((boss && c.durBoss != null ? c.durBoss : c.dur) || 0) * (o.eld !== undefined ? o.eld : 1), pw = (c.pow || 0) * s * (o.elp !== undefined ? o.elp : 1);   // eld/elp: multiplicadores da arma (data/magic-weapons.js)
  if (k === 'burn') { e.bn = Math.max(e.bn || 0, dur); e.bnt = e.bnt > 0 ? e.bnt : .5; e.bnd = Math.max(e.bnd || 0, Math.max(1, d * pw)); }
  else if (k === 'poison') {
    e.pn = c.stack === 'acumula' ? Math.min(c.max || 1, (act ? e.pn || 0 : 0) + 1) : 1;
    e.ps = Math.max(e.ps || 0, dur); e.pst = e.pst > 0 ? e.pst : .5; e.psd = Math.max(act ? e.psd || 0 : 0, Math.max(1, d * pw));
  }
  else if (k === 'slow') e.slow = Math.max(e.slow || 0, dur);
  else if (k === 'root') e.root = Math.max(e.root || 0, dur);
  else if (k === 'shock') e.sn = Math.max(e.sn || 0, dur);
  else if (k === 'mark') { e.mk = Math.max(e.mk || 0, dur); e.mkv = Math.max(act ? e.mkv || 0 : 0, pw); }
  else if (k === 'weaken') {
    if (!act) { e.wkd = Math.round(e.dmg * Math.min(1, pw)); e.dmg -= e.wkd; }   // tira dano de e.dmg (vale para todo ataque do inimigo); devolvido na expiração
    e.wk = Math.max(e.wk || 0, dur);
  }
  else if (k === 'push') {
    const a = o.ang !== undefined ? o.ang : Math.atan2(e.x - P.x, e.z - P.z), m = boss ? (c.bossMult != null ? c.bossMult : 1) : 1;
    e.kx += Math.sin(a) * pw * 6 * m; e.kz += Math.cos(a) * pw * 6 * m;
  }
  else return false;
  return true;
}

/** Depois de um golpe elemental: tenta cada status do elemento (chance × (1 − resistência)). `o.elc` = chance do efeito PRINCIPAL (1º da lista do elemento);
    os efeitos secundários (ex.: congelar, do gelo) mantêm a mesma proporção em relação ao principal. Devolve os tipos aplicados. */
export function tryStatus(e, el, d, o = {}) {
  const E = ELEMENTS[el], out = [];
  if (!E) return out;
  const r = resistOf(e, el);
  if (r >= 1) return out;
  const s = 1 - r;
  for (const c of E.fx) {
    const ch = Math.max(0, Math.min(1, (o.elc !== undefined ? o.elc * c.chance / E.fx[0].chance : c.chance) * s));
    if (ch > 0 && Math.random() < ch && applyStatus(e, c, d, s, o)) out.push(c.k);
  }
  if (out.length) puff(e.x, 1.3, e.z, E.col, 3, 5);   // feedback barato na cor do elemento
  return out;
}

/** Tick central dos novos efeitos (chamar uma vez por quadro, depois de updateSkills) */
export function updateElements(dt) {
  const own = !P.skh;   // sem classe: ninguém mais faz o tick de burn/veneno/lentidão/preso/provocar
  for (const e of enemies) {
    if (e.wk > 0) { e.wk -= dt; if (e.wk <= 0) { e.dmg += e.wkd || 0; e.wkd = 0; } }   // enfraquecer (também em morto: devolve o dano antes de reaproveitar o corpo)
    if (e.dead) continue;
    let tint = own ? 0 : e.tint || 0;
    if (own) {
      if (e.slow > 0) { e.slow -= dt; tint = TINT.slow; }
      if (e.root > 0) e.root -= dt;
      if (e.tn > 0) e.tn -= dt;
      if (e.bn > 0) { e.bn -= dt; e.bnt -= dt; tint = tint || TINT.burn; if (e.bnt <= 0) { e.bnt = .5; hit(e, e.bnd * .5, { dot: 1 }); if (e.dead) continue; } }
      if (e.ps > 0) { e.ps -= dt; e.pst -= dt; tint = tint || TINT.poison; if (e.pst <= 0) { e.pst = .5; hit(e, e.psd * e.pn * .5, { dot: 1 }); if (e.dead) continue; } if (e.ps <= 0) e.pn = 0; }
    }
    if (!tint) for (const k of ['root', 'shock', 'mark', 'weaken']) if (ACTIVE[k](e)) { tint = TINT[k]; break; }
    if (own || tint) e.tint = tint;
  }
}
