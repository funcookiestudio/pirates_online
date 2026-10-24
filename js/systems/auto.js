/* Auto combate (tecla T): escolhe alvos, usa habilidades e poções, foge quando necessário e equipa itens melhores.
   Se o jogador clicar, ele assume o controle por 2,5 s (state.autoHold). */
import { state, aim } from '../core/state.js';
import { enemies, loot, respawns, bombs } from '../core/registry.js';
import { P } from '../entities/player.js';
import { bag, equip, pickSlot, lootBlocked } from './inventory.js';
import { refillStep } from './refill.js';
import { townStep } from './town.js';
import { autoWeapon } from './swap.js';
import { spin, bomb, potion } from './combat.js';
import { dodge } from './dodge.js';
import { setAuto, danger } from './stamina.js';

let AT = 0; // intervalo para reavaliar o alvo
let AI = 0; // intervalo para checar equipamentos melhores

export function togAuto() {
  AT = 0;
  setAuto(!state.autoOn);
}

/** Decide o que o jogador faz neste frame (só roda com o auto combate ligado) */
export function autoThink(dt) {
  state.autoHold -= dt;
  AT -= dt;
  AI -= dt;
  if (state.autoHold > 0) return;

  const alive = enemies.filter(e => !e.dead);
  const dist = e => Math.hypot(e.x - P.x, e.z - P.z);
  const thr = alive.filter(e => (e.ag || dist(e) < 6) && dist(e) < 20); // ameaças

  // equipa itens melhores
  if (AI <= 0 && state.autoCfg.equip) {
    AI = 1.5;
    for (let i = 0; i < bag.length; i++) {
      if (pickSlot(bag[i], true)) { equip(i); break; }
    }
  }

  // sem poções/bombas: vai até o NPC comprar (auto refil)
  if (refillStep()) return;
  // mochila cheia: vende no ferreiro e guarda no baú
  if (townStep()) return;

  // indo para a fogueira com caminho livre: o movimento é decidido em updateStamina
  if (state.seek && !danger()) return;

  // esquiva (rolamento para trás): golpe pesado/especial sendo preparado perto, ou vida abaixo de 20% com inimigo colado
  if (state.autoCfg.dodge && P.rcd <= 0 && P.roll <= 0 && !P.swap && !P.sit && !P.sitT) {
    const heavy = alive.find(e => e.st === 'wind' && dist(e) < (e.slam ? 5.6 : 3.6) &&
      (e.slam || e.t.boss || e.dmg >= P.max * .2));
    const near = P.hp < P.max * .2 ? alive.find(e => e.ag && dist(e) < 3.6) : null;
    const from = heavy || near;
    if (from) {
      P.g.rotation.y = Math.atan2(from.x - P.x, from.z - P.z); // de frente para o inimigo: a rolada vai para longe dele
      dodge();
      return;
    }
  }

  // poção com vida baixa
  if (state.autoCfg.usePot && P.hp < P.max * state.autoCfg.potHp / 100 && P.pot > 0 && thr.length) potion();

  // sem poção e quase morrendo: foge
  if (P.hp < P.max * .25 && P.pot <= 0 && thr.length) {
    let fx = 0, fz = 0;
    thr.forEach(e => { fx += P.x - e.x; fz += P.z - e.z; });
    const l = Math.hypot(fx, fz) || 1;
    P.tgt = null;
    P.tx = P.x + fx / l * 10;
    P.tz = P.z + fz / l * 10;
    return;
  }

  // desvia da pancada em área do boss
  const sl = alive.find(e => e.slam && e.st === 'wind' && dist(e) < 5.6);
  if (sl) {
    const l = dist(sl) || 1;
    P.tgt = null;
    P.tx = P.x + (P.x - sl.x) / l * 6;
    P.tz = P.z + (P.z - sl.z) / l * 6;
    return;
  }

  // arma de fogo para alvos distantes, corpo a corpo para os próximos
  if (alive.length && state.autoCfg.swap) autoWeapon(Math.min(...alive.map(dist)));

  // bomba no ar: sai da área da explosão (raio 5) antes de ela estourar
  const bb = bombs.find(b => Math.hypot(b.m.position.x - P.x, b.m.position.z - P.z) < 6.5);
  if (bb) {
    const bx = P.x - bb.m.position.x, bz = P.z - bb.m.position.z, l = Math.hypot(bx, bz) || 1;
    P.tgt = null;
    P.tx = P.x + bx / l * 8;
    P.tz = P.z + bz / l * 8;
    return;
  }

  // giro quando cercado
  if (state.autoCfg.spin && alive.filter(e => dist(e) < 4).length >= 3 && P.cds[0] <= 0) spin();

  // bomba em boss ou grupos
  const t = P.tgt;
  if (state.autoCfg.bomb && t && !t.dead && P.cds[1] <= 0 && dist(t) > 7 && dist(t) < 11 &&
      (t.t.boss || alive.filter(e => Math.hypot(e.x - t.x, e.z - t.z) < 4).length >= 3)) {
    aim.set(t.x, 0, t.z);
    bomb();
  }

  // escolhe o melhor alvo; sem inimigos, pega loot; sem loot, procura inimigos
  if (AT <= 0 || !t || t.dead) {
    AT = .35;
    let best = null, bs = -1e9;
    alive.forEach(e => {
      const d = dist(e);
      if (d > 28) return;
      const sc = -d; // sempre o inimigo mais próximo
      if (sc > bs) { bs = sc; best = e; }
    });

    if (best) {
      P.tgt = best;
    } else {
      P.tgt = null;
      let bl = null, bd = 18;
      if (state.autoCfg.loot) loot.forEach(x => {
        if (x.dropped || lootBlocked(x)) return;
        const d = Math.hypot(x.m.position.x - P.x, x.m.position.z - P.z);
        if (d < bd) { bd = d; bl = x; }
      });
      if (bl) {
        P.tx = bl.m.position.x;
        P.tz = bl.m.position.z;
      } else {
        let g = null, gd = 1e9;
        alive.forEach(e => { const d = dist(e); if (d < gd) { gd = d; g = e; } });
        if (g) { P.tx = g.x; P.tz = g.z; }
        else if (respawns.length) { P.tx = respawns[0].x; P.tz = respawns[0].z; }
      }
    }
  }
}
