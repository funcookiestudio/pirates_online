/* Reset do personagem e de cada companheiro (botões do inventário). */
import { P } from '../entities/player.js';
import { PST, pmax } from '../pets/stats.js';
import { emit } from '../core/events.js';
import { bag, chest, eq, setWeapon } from './inventory.js';
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
  state.cp = -1; state.deaths = {}; state.stam = 1; state.autoRest = false; state.seek = null; state.clearing = false;
  P.dr = 0; P.x = P.tx = VILLAGE_SEAT.x; P.z = P.tz = VILLAGE_SEAT.z; P.vx = P.vz = 0; P.sit = P.sitT = 1; P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw; // volta para a vila, sentado
  eq.wpn = eq.gun = eq.arm = null;
  Object.assign(P, { lv: 1, xp: 0, nxt: 60, max: 100, mmax: 60, dmg: 12, gold: 0, pot: 3, bmb: 3, wb: 0, tgt: null, swap: null });
  P.hp = P.max;
  P.mp = P.mmax;
  P.act = 'wpn';
  setWeapon('wpn');
  emit('inventory:changed');
  saveGame();
  log('♻ Personagem resetado');
}

/** Companheiro `id` volta ao nível 1, sem pontos nem habilidades */
export function resetPet(id) {
  Object.assign(PST[id], { lv: 1, xp: 0, pts: 0, rk: {}, dn: 0 });
  PST[id].hp = pmax(id);
  emit('pets:changed');
  emit('inventory:changed');
  saveGame();
  log('♻ Companheiro resetado');
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
