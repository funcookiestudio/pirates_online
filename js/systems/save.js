/* Salvamento local (localStorage): nível, itens, equipamento e companheiros.
   Salva sozinho a cada 10 s, ao esconder a aba e ao fechar a página. Não salva com o jogador morto. */
import { xpToNext } from '../data/scaling.js';
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { bag, chest, eq, setWeapon, weaponBonus, reserveClass, canUseItem, bagFull } from './inventory.js';
import { WEAPONS } from '../data/weapons.js';
import { PST } from '../pets/stats.js';
import { setPet, unequipPet } from '../pets/manager.js';
import { refreshPetButton } from '../ui/hotbar.js';
import { MOUNT } from './mount.js';
import { saveVeh, loadVeh } from './vehicle.js';
import { SEED } from '../world/terrain.js';
import { safeSpot } from './safe.js';
import { getRent, setRent } from '../world/doors.js';
import { inDungeon } from '../dungeon/dungeon-scene.js';
import { saveBond, loadBond } from './bond.js';
import { saveHead, loadHead } from './medusa-head.js';
import { applyAdoptions } from '../pets/manager.js';

import { activeChar, saveKey } from '../core/chars.js';
import { skillData, loadSkillData } from './skills.js';
import { profData, loadProf, validProf, defaultProf } from './prof.js';
import { profClass } from '../data/prof.js';
import { STAFF_REQ } from '../data/skills.js';
const KEY = saveKey(activeChar() && activeChar().id);   // um save por personagem
const PLAYER_FIELDS = ['lv', 'xp', 'nxt', 'max', 'mmax', 'dmg', 'gold', 'couro', 'penas', 'peixe', 'osso', 'pot', 'bmb', 'potR', 'bmbR', 'arrows', 'bolts'];
const PET_FIELDS = ['lv', 'xp', 'pts', 'hp', 'dn'];

/** Versão do esquema do save (campo `sv`; `v:1` continua). 2 = bloco `prof` e blocos `skills`/`prof` com `sv` próprio. Saves sem `sv` são os antigos. */
export const SAVE_SV = 2;
/** Migra um save lido (objeto) para o esquema atual SEM perder nada: acrescenta sv e, para classes com proficiência, um bloco prof válido
    (derivado do nível geral se faltar ou estiver inválido). Repetível: migrateSave(migrateSave(s)) == migrateSave(s). Não altera o objeto recebido. */
export function migrateSave(s, k) {
  const m = { ...s };
  if (!(m.sv >= SAVE_SV)) m.sv = SAVE_SV;
  let raise = false;
  if (k === 'mago' && m.skills && typeof m.skills === 'object' && !(m.skills.sv >= 2)) {   // habilidades v1 (rk = Cajado) → v2: acrescenta a árvore do Rod vazia; o resto do bloco fica igual
    const rr = m.skills.rod && Array.isArray(m.skills.rod.rk) ? m.skills.rod.rk : [];
    m.skills = { ...m.skills, sv: 2, rod: { rk: rr.length <= 10 && rr.every(n => Number.isInteger(n) && n >= 0 && n <= 3) ? rr.slice() : [] } };
    raise = true;
  }
  if (profClass(k) && !validProf(m.prof && { staff: m.prof.staff, rod: m.prof.rod })) m.prof = { sv: 1, ...defaultProf(m.player && Number.isFinite(m.player.lv) ? m.player.lv : 1) };
  if (raise && profClass(k) && m.prof && m.prof.staff) {   // 1ª migração das habilidades: o Mago nunca perde acesso ao que o nível dele já liberava (proficiência de Cajado no mínimo igual à exigida)
    const lv = m.player && Number.isFinite(m.player.lv) ? m.player.lv : 1, floor = Math.max(0, ...STAFF_REQ.filter(r => r.lv <= lv).map(r => r.prof));
    if (m.prof.staff.lv < floor) m.prof = { ...m.prof, staff: { xp: 0, lv: floor } };
  }
  return m;
}

export { safeSpot };
export let savedPos = null;      // última posição segura salva (null = começa sentado na vila)
let lastSafe = null;

let disabled = false; // true após apagar o progresso (evita salvar de novo antes de recarregar)

const validItem = it => it && ['wpn', 'arm'].includes(it.ty) && [it.q, it.v, it.w].every(Number.isFinite) && typeof it.n === 'string' && (it.ty !== 'wpn' || !!WEAPONS[it.w]);   // arma com índice fora do catálogo é descartada

export function saveGame() {
  if (disabled || P.dead) return;
  if (!inDungeon() && safeSpot(P.x, P.z)) lastSafe = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), up: !!P.up };
  try {
    const pets = {};
    Object.keys(PST).forEach(id => {
      pets[id] = { ...Object.fromEntries(PET_FIELDS.map(f => [f, PST[id][f]])), rk: { ...PST[id].rk } };
    });
    localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      sv: SAVE_SV,
      t: Date.now(),
      seed: SEED, pos: lastSafe, rent: getRent(),
      player: Object.fromEntries(PLAYER_FIELDS.map(f => [f, P[f]])),
      bag, chest, eq, act: P.act, pets, skills: skillData(), prof: profData(),
      pet: state.pet.id,
      quest: state.quest, quests: state.quests, cartazes: state.cartazes, qtrack: state.qtrack, contract: state.contract, owned: state.owned,
      petOff: !!state.petOff,
      petAttack: state.petAttack,
      autoCfg: state.autoCfg,
      dunDone: state.dunDone,
      horse: MOUNT.owned ? 1 + MOUNT.coat : 0,
      head: saveHead(),   // cabeça da Medusa (medusa-head.js)
      veh: saveVeh(),   // carroça/carruagem compradas, montaria da tecla H e pintura
      bond: saveBond(),
    }));
  } catch (e) { /* armazenamento indisponível: o jogo segue sem salvar */ }
}

/** Restaura o progresso salvo. Retorna true se carregou. */
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    let s = JSON.parse(raw);
    if (!s || s.v !== 1) return false;
    if (!(s.sv >= SAVE_SV)) {   // save do esquema antigo: guarda a cópia original uma única vez (nunca sobrescreve uma cópia anterior)
      try { const bk = KEY + ':pre-sv2'; if (localStorage.getItem(bk) === null) localStorage.setItem(bk, raw); } catch (e) { /* sem espaço: segue sem a cópia */ }
    }
    if (s.sv >= SAVE_SV && (activeChar() || {}).k === 'mago' && s.skills && typeof s.skills === 'object' && !(s.skills.sv >= 2)) {   // save já sv 2 mas com habilidades v1 (formato da V553): cópia própria, uma vez
      try { const bk = KEY + ':pre-sk2'; if (localStorage.getItem(bk) === null) localStorage.setItem(bk, raw); } catch (e) { /* sem espaço */ }
    }
    try { s = migrateSave(s, (activeChar() || {}).k); } catch (e) { /* mantém o save como veio */ }

    PLAYER_FIELDS.forEach(f => { if (Number.isFinite(s.player[f])) P[f] = s.player[f]; });
    setRent(s.rent);
    loadSkillData(s.skills);   // ranks e talentos (a vida/mana máximas dos talentos já estão em max/mmax)
    P.nxt = xpToNext(P.lv);               // curva de XP nova: recalcula a partir do nível salvo
    P.xp = Math.min(P.xp, P.nxt - 1);
    loadProf(s.prof, P.lv);   // proficiências (só classes com arma mágica); bloco inválido é reinicializado sem afetar o resto
    P.hp = P.max;
    P.mp = P.mmax;
    if (s.seed === SEED && s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.z)) { savedPos = s.pos; lastSafe = s.pos; }

    chest.length = 0;
    (s.chest || []).filter(validItem).forEach(it => chest.push(it));
    bag.length = 0;
    (s.bag || []).filter(validItem).forEach(it => bag.push(it));
    eq.wpn = validItem(s.eq && s.eq.wpn) ? s.eq.wpn : null;
    eq.gun = validItem(s.eq && s.eq.gun) ? s.eq.gun : null;
    eq.off = validItem(s.eq && s.eq.off) && s.eq.off.w != null && !WEAPONS[s.eq.off.w].big ? s.eq.off : null;
    eq.arm = validItem(s.eq && s.eq.arm) ? s.eq.arm : null;
    delete eq.res;   // arma mágica reserva (Etapa 7, só Mago): válida e permitida volta ao lugar; qualquer outra coisa vai para a mochila (nada é apagado)
    { const rs = s.eq && s.eq.res; if (validItem(rs)) { if (WEAPONS[rs.w].magic && reserveClass() && canUseItem(rs)) eq.res = rs; else if (!bagFull()) bag.push(rs); } }
    // saves antigos guardavam a arma de fogo no espaço da arma corpo a corpo
    let act = s.act === 'gun' ? 'gun' : 'wpn';
    if (eq.wpn && WEAPONS[eq.wpn.w] && WEAPONS[eq.wpn.w].gun) { eq.gun = eq.gun || eq.wpn; eq.wpn = null; act = 'gun'; }
    if (!eq.gun) act = 'wpn';
    P.act = act;
    P.wb = weaponBonus(); // o dano salvo já inclui TODO o bônus das armas na mão (principal, 2ª mão e tocha); antes só o da principal entrava e o resto era somado de novo a cada carregamento (Ladino: +1 por recarga)
    setWeapon(act);

    Object.keys(PST).forEach(id => {
      const p = s.pets && s.pets[id];
      if (!p) return;
      PET_FIELDS.forEach(f => { if (Number.isFinite(p[f])) PST[id][f] = p[f]; });
      if (p.rk && typeof p.rk === 'object') PST[id].rk = { ...p.rk };
    });

    MOUNT.owned = !!s.horse; MOUNT.coat = Math.max(0, Math.min(2, (s.horse | 0) - 1));
    loadVeh(s.veh);
    loadHead(s.head);
    state.dunDone = s.dunDone && typeof s.dunDone === 'object' ? s.dunDone : {};
    state.petAttack = s.petAttack !== false;
    Object.keys(state.autoCfg).forEach(k => { if (s.autoCfg && typeof s.autoCfg[k] === typeof state.autoCfg[k]) state.autoCfg[k] = s.autoCfg[k]; });
    state.contract = s.contract && typeof s.contract === 'object' && typeof s.contract.c === 'string' ? { c: s.contract.c, run: null } : null;
    state.cartazes = Array.isArray(s.cartazes) ? s.cartazes.filter(x => typeof x === 'string').slice(0, 6) : [];
    state.quests = s.quests && typeof s.quests === 'object' ? s.quests : {};
    state.qtrack = typeof s.qtrack === 'string' ? s.qtrack : null;
    state.quest = s.quest && Number.isFinite(s.quest.st) ? { st: s.quest.st | 0 } : { st: 0 };
    state.owned = s.owned && typeof s.owned === 'object' ? s.owned : {};   // saves antigos não tinham companheiros próprios: começam sem nenhum
    loadBond(s.bond); applyAdoptions();   // vínculos com os bichos; nome e pelagem do cachorro/gato adotados
    if (PST[s.pet] && state.owned[s.pet]) setPet(s.pet);
    if (s.petOff || !state.owned[s.pet]) unequipPet(true);
    refreshPetButton();
    return true;
  } catch (e) {
    return false;
  }
}

/** Apaga o progresso e recomeça do zero */
export function clearSave() {
  disabled = true;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  location.reload();
}

export function initSave() {
  setInterval(saveGame, 10000);
  addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
}
