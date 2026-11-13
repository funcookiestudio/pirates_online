/* Reset do personagem e de cada companheiro (botões do inventário). */
import { wipeSkills } from './skills.js';
import { P } from '../entities/player.js';
import { PST, pmax } from '../pets/stats.js';
import { emit } from '../core/events.js';
import { bag, chest, eq, setWeapon } from './inventory.js';
import { START } from '../data/classes.js';
import { resetProf } from './prof.js';
import { WEAPONS } from '../data/weapons.js';
import { activeChar } from '../core/chars.js';
import { VILLAGE_SEAT } from '../data/posts.js';
import { state } from '../core/state.js';
import { loot } from '../core/registry.js';
import { scene } from '../core/engine.js';
import { saveGame } from './save.js';
import { log } from '../ui/notify.js';

/** Personagem volta ao nível 1: sem itens, ouro e equipamento (os companheiros não mudam) */
export function resetPlayer() {
  bag.length = 0;
  chest.length = 0;                       // baú da vila também
  loot.splice(0).forEach(l => scene.remove(l.m)); // itens largados no chão
  state.cp = -1; state.deaths = {}; state.dunDone = {}; state.quests = {}; state.cartazes = []; state.qtrack = null; state.contract = null; state.fleeing = false; state.autoDebt = 0;
  P.dr = 0; P.x = P.tx = VILLAGE_SEAT.x; P.z = P.tz = VILLAGE_SEAT.z; P.vx = P.vz = 0; P.sit = P.sitT = 1; P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw; // volta para a vila, sentado
  eq.wpn = eq.gun = eq.arm = eq.off = null;
  const C = P.cls, st = START[(activeChar() || {}).k], mk = n => { const w = WEAPONS.findIndex(x => x.n === n); return w < 0 ? null : { ty: 'wpn', q: 1, v: WEAPONS[w].b, il: 1, w, n }; };
  eq.wpn = st ? (st.wpn ? mk(st.wpn) : null) : { ty: 'wpn', q: 1, v: WEAPONS[0].b, il: 1, w: 0, n: WEAPONS[0].n };   // arma inicial como no personagem novo (main.js)
  eq.gun = st && st.gun ? mk(st.gun) : null; eq.off = st && st.off ? mk(st.off) : null;
  Object.assign(P, { lv: 1, xp: 0, nxt: 60, max: C.hp, mmax: C.mp, dmg: C.dmg, gold: 0, pot: 3, bmb: 3, potR: 0, bmbR: 0, arrows: (st && st.arrows) || 0, bolts: (st && st.bolts) || 0, wb: 0, tgt: null, swap: null });
  P.hp = P.max;
  P.mp = P.mmax;
  P.act = (st && st.act) || 'wpn';
  setWeapon(P.act);
  emit('inventory:changed');
  wipeSkills();   // ranks e talentos voltam a zero
  resetProf();    // proficiências de arma mágica (só quem as tem)
  saveGame();
  log('Personagem resetado');
}

/** Companheiro `id` volta ao nível 1, sem pontos nem habilidades */
export function resetPet(id) {
  Object.assign(PST[id], { lv: 1, xp: 0, pts: 0, rk: {}, dn: 0 });
  PST[id].hp = pmax(id);
  emit('pets:changed');
  emit('inventory:changed');
  saveGame();
  log('Companheiro resetado');
}

/** Botão de dois cliques (sem confirm(), que alguns ambientes bloqueiam): 1º arma, 2º executa */
export function armedButton(el, label, action) {
  let t = null;
  el.textContent = label;
  el.onclick = () => {
    if (t) { clearTimeout(t); t = null; el.textContent = label; action(); return; }
    el.textContent = 'Clique de novo para confirmar';
    t = setTimeout(() => { t = null; el.textContent = label; }, 3000);
  };
}
