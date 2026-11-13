/* Proficiências Cajado/Rod: XP, níveis, requisitos híbridos e persistência (Etapa 4). Configuração em data/prof.js.
   API: profState · addXp · profRodSupport · unlockState/canUse · resetProf · profData/loadProf/validProf/defaultProf.
   O gancho de dano é P.profh (como P.skh: combat.js não importa este arquivo). */
import { P } from '../entities/player.js';
import { WEAPONS } from '../data/weapons.js';
import { PROF, PROF_CATS, profClass } from '../data/prof.js';
import { xpMult } from '../data/scaling.js';
import { activeChar } from '../core/chars.js';
import { log } from '../ui/notify.js';

const NAME = { staff: 'Cajado', rod: 'Rod' };
const fresh = lv => ({ staff: { xp: 0, lv: PROF.migrate.staff(lv) }, rod: { xp: 0, lv: PROF.migrate.rod() } });
/** Proficiência inicial para um personagem de nível geral `lv` (regra de migração em data/prof.js) */
export const defaultProf = lv => fresh(lv);

/** Estado da categoria: { lv, xp, need (XP para o próximo; 0 no máximo), max } — null se o personagem não tem proficiência */
export function profState(cat) {
  const p = P.prof && P.prof[cat];
  if (!p) return null;
  return { lv: p.lv, xp: p.xp, need: p.lv >= PROF.max ? 0 : PROF.xpNext(p.lv), max: p.lv >= PROF.max };
}

/** Dá XP de proficiência da categoria `cat`; sobe de nível quantas vezes couber. Devolve o XP creditado. */
export function addXp(cat, xp) {
  const p = P.prof && P.prof[cat];
  if (!p || !(xp > 0) || !Number.isFinite(xp) || p.lv >= PROF.max) return 0;
  p.xp += xp;
  while (p.lv < PROF.max && p.xp >= PROF.xpNext(p.lv)) {
    p.xp -= PROF.xpNext(p.lv); p.lv++;
    log('Proficiência de ' + NAME[cat] + ': nível ' + p.lv);
  }
  if (p.lv >= PROF.max) p.xp = 0;
  return xp;
}

/* ---- anti-abuso: janela deslizante de XP creditado ---- */
const tl = { staff: [], rod: [] };
const nowS = () => performance.now() / 1000;
function room(cat, now, win, cap, target) {   // quanto ainda cabe agora (total e já dado a este alvo)
  const keep = tl[cat].filter(x => now - x.t < win);
  tl[cat] = keep;
  return { tot: cap - keep.reduce((a, x) => a + x.xp, 0), tg: target == null ? 0 : keep.reduce((a, x) => a + (x.g === target ? x.xp : 0), 0) };
}
function grant(cat, xp, now, g) { const got = addXp(cat, xp); if (got > 0) tl[cat].push({ t: now, xp: got, g }); return got; }

/** Categoria da arma ativa ('staff' | 'rod' | null) */
export const activeCat = () => { const W = WEAPONS[P.wid]; return W && W.magic && W.mt ? W.mt : null; };

/** Gancho de dano (chamado por hit() com o dano EFETIVO `eff`): XP de Cajado só com o Cajado ativo; XP de Rod só se ROD_XP_basico > 0 e for tiro do Rod */
function onDamage(e, eff, o) {
  if (!P.prof || o.pet) return;
  const cat = activeCat();
  if (!cat) return;
  const now = nowS();
  if (cat === 'staff') {
    const C = PROF.staff, df = e.lv - P.lv;
    if (df <= C.trivialDiff) return;
    const f = xpMult(df);
    let xp = eff * C.perDmg * f;
    if (e.hp <= 0) xp += (C.killBase + C.killPerLv * e.lv) * f;   // abate (golpe ou dano periódico que mata)
    xp = Math.min(xp, Math.max(0, room('staff', now, C.win, C.capWin).tot));
    if (xp > 0) grant('staff', xp, now);
  } else if (PROF.ROD_XP_basico > 0 && o.el) {   // Rod: só o tiro dele (leva o elemento), nunca habilidades
    const C = PROF.rod, xp = Math.min(eff * PROF.ROD_XP_basico, Math.max(0, room('rod', now, C.win, C.capWin).tot));
    if (xp > 0) grant('rod', xp, now);
  }
}

/** API da Etapa 6: ação de suporte do Rod. `tipo` = 'heal' | 'shield' | 'buff' | 'support'; `qtd` = quantidade EFETIVA (0 = sem benefício = 0 XP);
    `alvo` = id do alvo (teto por alvo); `now` em segundos (opcional, para testes). Só XP de Rod. Devolve o XP creditado. */
export function profRodSupport(tipo, qtd, alvo = null, now = nowS()) {
  const rate = PROF.rod.rates[tipo];
  if (!P.prof || !rate || !(qtd > 0) || !Number.isFinite(qtd)) return 0;
  const C = PROF.rod, r = room('rod', now, C.win, C.capWin, alvo);
  let xp = Math.min(qtd * rate, r.tot);
  if (alvo != null) xp = Math.min(xp, C.capTarget - r.tg);
  return xp > 0 ? grant('rod', xp, now, alvo) : 0;
}

/** Requisitos híbridos: `req` = { lv, prof } — exige o nível geral E o nível de proficiência da categoria `cat`, ao mesmo tempo */
export function unlockState(req, cat) {
  const need = { lv: (req && req.lv) || 0, prof: (req && req.prof) || 0 }, st = profState(cat), have = { lv: P.lv, prof: st ? st.lv : 0 };
  const lvOk = have.lv >= need.lv, pOk = need.prof <= 0 || have.prof >= need.prof;
  return { ok: lvOk && pOk, lv: { need: need.lv, have: have.lv, ok: lvOk }, prof: { need: need.prof, have: have.prof, ok: pOk } };
}
export const canUse = (req, cat) => unlockState(req, cat).ok;

/** (#dev/testes) fixa o nível de proficiência da categoria */
export function devSet(cat, lv) { if (P.prof && P.prof[cat]) { P.prof[cat].lv = Math.max(1, Math.min(PROF.max, lv | 0)); P.prof[cat].xp = 0; } }
/** Volta ao inicial (nível geral 1) — usado pelo reset do personagem */
export function resetProf() { if (P.prof) { P.prof = fresh(1); tl.staff = []; tl.rod = []; } }

/** Para o save: bloco versionado (só quem tem proficiência; undefined = nenhum campo no save) */
export const profData = () => P.prof ? { sv: 1, staff: { ...P.prof.staff }, rod: { ...P.prof.rod } } : undefined;
/** Bloco prof válido? (tipos, inteiros e limites) */
export function validProf(o) {
  const ok = c => !!c && typeof c === 'object' && Number.isInteger(c.lv) && c.lv >= 1 && c.lv <= PROF.max && typeof c.xp === 'number' && Number.isFinite(c.xp) && c.xp >= 0 && (c.lv >= PROF.max ? c.xp === 0 : c.xp < PROF.xpNext(c.lv));
  return !!o && typeof o === 'object' && ok(o.staff) && ok(o.rod);
}
/** Carrega do save: bloco válido é usado; ausente/corrompido → inicial derivado do nível geral `lv` (o resto do save não é tocado) */
export function loadProf(o, lv) {
  if (!profClass((activeChar() || {}).k)) return;
  try { P.prof = validProf(o) ? { staff: { xp: o.staff.xp, lv: o.staff.lv }, rod: { xp: o.rod.xp, lv: o.rod.lv } } : fresh(lv); }
  catch (e) { P.prof = fresh(lv); }
}

/* Personagem que usa arma mágica: começa com a proficiência inicial e liga o gancho de dano */
if (profClass((activeChar() || {}).k)) { P.prof = fresh(1); P.profh = onDamage; }
export { PROF, PROF_CATS };
