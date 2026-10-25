/* Morte e renascimento: o jogador renasce no último posto (checkpoint). Morrendo 2x no mesmo posto, volta ao posto anterior. */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { on } from '../core/events.js';
import { $ } from '../core/utils.js';
import { P } from '../entities/player.js';
import { POST_DATA, nearestPost, postSpot, VILLAGE_SEAT } from '../data/posts.js';
import { freePoint } from './steer.js';
import { setAuto } from './stamina.js';
import { standUp } from './rest.js';
import { log } from '../ui/notify.js';
import { leaveDungeon } from '../dungeon/dungeon-scene.js';

const nameOf = id => id < 0 ? 'a Vila' : POST_DATA[id].name;

on('player:died', () => {
  if (state.safeAt) {
    const loss0 = Math.floor(P.gold * .1); P.gold -= loss0; setAuto(false);
    const m0 = $('msg'); m0.style.display = 'flex';
    m0.innerHTML = '☠ Você morreu…<br><small>Você volta ao último ponto seguro' + (loss0 ? ' · −' + loss0 + ' ouro' : '') + '</small>';
    setTimeout(reviveSafe, 3500); return;
  }
  const near = nearestPost(P.x, P.z, 24), id = near ? near.id : state.cp;
  let note;
  if (id >= 0) {
    state.deaths[id] = (state.deaths[id] || 0) + 1;
    if (state.deaths[id] >= 2) {
      state.deaths[id] = 0;
      state.cp = POST_DATA[id].prev;
      note = 'Derrotado 2x em "' + POST_DATA[id].name + '": você recua para ' + nameOf(state.cp) + '.';
    } else {
      state.cp = id;
      note = 'Derrotado em "' + POST_DATA[id].name + '". Mais uma derrota aqui e você recua.';
    }
  } else { state.cp = -1; note = 'Derrotado. Você volta para a Vila.'; }
  const loss = Math.floor(P.gold * .1);
  P.gold -= loss;
  setAuto(false);
  const m = $('msg');
  m.style.display = 'flex';
  m.innerHTML = '☠ Você morreu…<br><small>' + note + (loss ? ' · −' + loss + ' ouro' : '') + '</small>';
  setTimeout(revive, 3500);
});

function revive() {
  leaveDungeon();
  const [sx, sz] = postSpot(state.cp);
  const { x, z } = freePoint(sx, sz, .8);
  if (state.cp < 0) { P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw; P.sit = P.sitT = 1; }
  P.x = x; P.z = z; P.tx = x; P.tz = z; P.vx = P.vz = 0;
  P.hp = P.max; P.mp = P.mmax; P.tgt = null; P.dead = false;
  if (state.cp >= 0) { P.sit = 0; P.sitT = 0; standUp(true); }
  state.stam = Math.max(state.stam, .5);
  enemies.forEach(e => { if (!e.dead) { e.ag = false; e.hp = e.max; e.st = 'chase'; } });
  $('msg').style.display = 'none';
  log('Renasceu em ' + nameOf(state.cp));
}

function reviveSafe() {
  leaveDungeon();
  const { x, z } = freePoint(state.safeAt.x, state.safeAt.z, .8);
  P.x = x; P.z = z; P.tx = x; P.tz = z; P.vx = P.vz = 0; P.up = !!state.safeAt.up;
  P.hp = P.max; P.mp = P.mmax; P.tgt = null; P.dead = false; P.sit = 0; P.sitT = 0; standUp(true);
  state.stam = Math.max(state.stam, .5);
  enemies.forEach(e => { if (!e.dead) { e.ag = false; e.hp = e.max; e.st = 'chase'; } });
  $('msg').style.display = 'none';
  log('Renasceu no último ponto seguro');
}
