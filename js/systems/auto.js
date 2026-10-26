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
import { MOUNT, toggleMount } from './mount.js';
import { VILLAGE_R } from '../core/village-const.js';
import { setAuto, fleeStep } from './stamina.js';
import { STEER, markStuck } from './steer.js';
import { doorBusy, cancelDoor } from '../world/doors.js';
import { torchStep } from './torch-auto.js';
import { lootFilter } from './lootrule.js';
import { dungeonGimmicks } from '../dungeon/dungeon-scene.js';
import { gimmickGoal } from '../dungeon/dungeon-gimmicks.js';

const STUCK = { x: 0, z: 0, t: 0 };
let DB = 0;  // tempo seguido passando por uma porta
let MT = 0; // intervalo para tentar montar
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
  if (state.fleeing) { fleeStep(); return; }   // sem ouro: foge para a vila (o clique do jogador também pode assumir)
  if (state.autoHold > 0) return;
  // passando por uma porta (ir ao tile, abrir, atravessar): o auto não mexe no destino, senão a porta nunca abre (limite de 8 s por segurança)
  if (doorBusy()) { DB += dt; STUCK.t = 0; if (DB < 8) return; cancelDoor(); }
  DB = 0;

  // travado (querendo andar e sem sair do lugar): tenta um ponto livre ao redor
  STUCK.t += dt;
  if (Math.hypot(P.x - STUCK.x, P.z - STUCK.z) > .6 || Math.hypot(P.tx - P.x, P.tz - P.z) < 1.2 || P.sit || P.sitT) { STUCK.x = P.x; STUCK.z = P.z; STUCK.t = 0; }
  else if (STUCK.t > 3) {
    STUCK.t = 0; AT = 0;
    markStuck(STEER, P.x, P.z);   // o A* passa a evitar este ponto (senão refaz o mesmo caminho pela mesma quina)
    const a = Math.random() * 6.28;
    P.tgt = null; P.tx = P.x + Math.cos(a) * 5; P.tz = P.z + Math.sin(a) * 5;
    state.autoHold = .8;
  }
  // cavalo: fora da vila e sem combate, se o caminho é longo, monta sozinho
  MT -= dt;
  if (MT <= 0 && MOUNT.owned && !MOUNT.dismissed && !MOUNT.on && !MOUNT.dis && MOUNT.st !== 'come' && !P.dead && !P.swimming && !P.sit && !P.sitT && P.roll <= 0 &&
      Math.hypot(P.x, P.z) > VILLAGE_R + 2 && Math.hypot(P.tx - P.x, P.tz - P.z) > 32 &&
      !enemies.some(e => !e.dead && (e.ag || Math.hypot(e.x - P.x, e.z - P.z) < 10) && Math.hypot(e.x - P.x, e.z - P.z) < 14)) {
    MT = 6; toggleMount(true);
  } else if (MT <= 0) MT = .6;
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

  torchStep(dt);   // tocha no escuro (troca a arma de 2 mãos por uma de 1 mão) e guarda de dia

  // sem poções/bombas: vai até o NPC comprar (auto refil)
  if (refillStep()) return;
  // mochila cheia: vende no ferreiro e guarda no baú
  if (townStep()) return;

  // esquiva (rolamento para trás): golpe pesado/especial sendo preparado perto, ou vida abaixo de 20% com inimigo colado
  if (state.autoCfg.dodge && P.rcd <= 0 && P.roll <= 0 && !P.swap && !P.sit && !P.sitT) {
    const heavy = alive.find(e => e.st === 'wind' && dist(e) < (e.slam ? 5.6 : 3.6) &&
      (e.slam || e.t.boss || e.dmg >= P.max * .2));
    const near = P.hp < P.max * .2 ? alive.find(e => e.ag && dist(e) < 3.6) : null;
    const from = heavy || near;
    if (from) {
      // rola para longe do inimigo, usando a animação certa: ele pela frente → para trás, pelas costas → para a frente, pelo lado → para o outro lado
      const rel = Math.atan2(Math.sin(Math.atan2(from.x - P.x, from.z - P.z) - P.g.rotation.y), Math.cos(Math.atan2(from.x - P.x, from.z - P.z) - P.g.rotation.y));
      dodge(Math.abs(rel) < .8 ? 'b' : Math.abs(rel) > 2.34 ? 'f' : rel > 0 ? 'r' : 'l');
      return;
    }
  }

  // poção com vida baixa
  if (state.autoCfg.usePot && P.hp < P.max * state.autoCfg.potHp / 100 && P.pot > 0 && thr.length) potion();

  // sem poção e quase morrendo: foge
  if (P.hp < P.max * .25 && P.pot + P.potR <= 0 && thr.length) {
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
    // dungeon: a chave caída e a porta trancada vêm antes de procurar mais inimigos (sem ameaça por perto)
    const goal = gimmickGoal(dungeonGimmicks());
    if (goal && !alive.some(e => e.ag && dist(e) < 7)) {
      P.tgt = null; P.tx = goal.x; P.tz = goal.z;
      return;
    }
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
        if (x.dropped || lootBlocked(x) || !lootFilter(x)) return;
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
