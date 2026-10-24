/* Salvamento local (localStorage): nível, itens, equipamento e companheiros.
   Salva sozinho a cada 10 s, ao esconder a aba e ao fechar a página. Não salva com o jogador morto. */
import { xpToNext } from '../data/scaling.js';
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { bag, chest, eq, setWeapon } from './inventory.js';
import { WEAPONS } from '../data/weapons.js';
import { PST } from '../pets/stats.js';
import { setPet } from '../pets/manager.js';
import { refreshPetButton } from '../ui/hotbar.js';

const KEY = 'pirata-arpg:save:v1';
const PLAYER_FIELDS = ['lv', 'xp', 'nxt', 'max', 'mmax', 'dmg', 'gold', 'pot', 'bmb', 'x', 'z'];
const PET_FIELDS = ['lv', 'xp', 'pts', 'hp', 'dn'];

let disabled = false; // true após apagar o progresso (evita salvar de novo antes de recarregar)

const validItem = it => it && ['wpn', 'arm'].includes(it.ty) && [it.q, it.v, it.w].every(Number.isFinite) && typeof it.n === 'string';

export function saveGame() {
  if (disabled || P.dead) return;
  try {
    const pets = {};
    Object.keys(PST).forEach(id => {
      pets[id] = { ...Object.fromEntries(PET_FIELDS.map(f => [f, PST[id][f]])), rk: { ...PST[id].rk } };
    });
    localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      t: Date.now(),
      player: Object.fromEntries(PLAYER_FIELDS.map(f => [f, P[f]])),
      bag, chest, eq, act: P.act, pets,
      pet: state.pet.id,
      petAttack: state.petAttack,
      autoCfg: state.autoCfg,
      dunDone: state.dunDone,
    }));
  } catch (e) { /* armazenamento indisponível: o jogo segue sem salvar */ }
}

/** Restaura o progresso salvo. Retorna true se carregou. */
export function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || s.v !== 1) return false;

    PLAYER_FIELDS.forEach(f => { if (Number.isFinite(s.player[f])) P[f] = s.player[f]; });
    P.nxt = xpToNext(P.lv);               // curva de XP nova: recalcula a partir do nível salvo
    P.xp = Math.min(P.xp, P.nxt - 1);
    P.hp = P.max;
    P.mp = P.mmax;
    P.tx = P.x;
    P.tz = P.z;

    chest.length = 0;
    (s.chest || []).filter(validItem).forEach(it => chest.push(it));
    bag.length = 0;
    (s.bag || []).filter(validItem).forEach(it => bag.push(it));
    eq.wpn = validItem(s.eq && s.eq.wpn) ? s.eq.wpn : null;
    eq.gun = validItem(s.eq && s.eq.gun) ? s.eq.gun : null;
    eq.off = validItem(s.eq && s.eq.off) && s.eq.off.w != null && !WEAPONS[s.eq.off.w].big ? s.eq.off : null;
    eq.arm = validItem(s.eq && s.eq.arm) ? s.eq.arm : null;
    // saves antigos guardavam a arma de fogo no espaço da arma corpo a corpo
    let act = s.act === 'gun' ? 'gun' : 'wpn';
    if (eq.wpn && WEAPONS[eq.wpn.w] && WEAPONS[eq.wpn.w].gun) { eq.gun = eq.gun || eq.wpn; eq.wpn = null; act = 'gun'; }
    if (!eq.gun) act = 'wpn';
    P.wb = (eq[act] && eq[act].v) || 0; // o dano salvo já inclui o bônus da arma que estava na mão
    P.act = act;
    setWeapon(act);

    Object.keys(PST).forEach(id => {
      const p = s.pets && s.pets[id];
      if (!p) return;
      PET_FIELDS.forEach(f => { if (Number.isFinite(p[f])) PST[id][f] = p[f]; });
      if (p.rk && typeof p.rk === 'object') PST[id].rk = { ...p.rk };
    });

    state.dunDone = s.dunDone && typeof s.dunDone === 'object' ? s.dunDone : {};
    state.petAttack = s.petAttack !== false;
    Object.keys(state.autoCfg).forEach(k => { if (s.autoCfg && typeof s.autoCfg[k] === typeof state.autoCfg[k]) state.autoCfg[k] = s.autoCfg[k]; });
    if (PST[s.pet]) setPet(s.pet);
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
