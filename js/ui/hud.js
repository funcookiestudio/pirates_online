/* HUD: barras de vida, status, vida do inimigo, missão, XP do companheiro e painel/minimapa. */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { $, isPanelOpen } from '../core/utils.js';
import { pxn } from '../data/pets.js';
import { P } from '../entities/player.js';
import { nearestPost } from '../data/posts.js';
import { updateLootTexts } from './notify.js';
import { ROLL_CD } from '../systems/dodge.js';
import { AUTO_TIME, REST_TIME, LOW, WAKE } from '../systems/stamina.js';
import { PST, pmax, PDN } from '../pets/stats.js';
import { renderStats } from './panel.js';
import { treeShowsActivePet } from './pet-panel.js';
import { drawMinimap } from './minimap.js';

/** Orbes de vida, cooldowns, status do topo e barra de XP */
export function updateStatusBars() {
  const pet = PST[state.pet.id];
  $('hp').style.height = Math.max(0, P.hp / P.max * 100) + '%';
  $('mp').style.height = Math.max(0, pet.hp / pmax(state.pet.id) * 100) + '%';
  $('hpt').textContent = Math.ceil(P.hp) + '/' + P.max;
  $('mpt').textContent = PDN() ? '💤' : Math.ceil(pet.hp);
  $('c2').style.height = P.cds[0] / 3 * 100 + '%';
  $('c3').style.height = P.cds[1] / 5 * 100 + '%';
  $('c6').style.height = P.rcd / ROLL_CD * 100 + '%';
  $('st').textContent = 'Nv ' + P.lv + ' · 💰' + P.gold + ' · 🧪' + P.pot + ' · Dano ' + P.dmg;
  $('lvp').textContent = 'Nv ' + P.lv;
  $('lva').textContent = 'Nv ' + pet.lv;
  $('xpb').style.width = P.xp / P.nxt * 100 + '%';
  updateStaminaRing();
}

let lastStatsRefresh = 0;

/** Barra do inimigo, missão, XP do companheiro, atributos do painel e minimapa */
export function updateOverlays(now) {
  updateLootTexts(P.x, P.z, performance.now());
  // barra de vida do último inimigo atingido (some após 4 s)
  const e = P.tgt && !P.tgt.dead ? P.tgt : (state.lastE && now - state.lastT < 4000 ? state.lastE : null), eh = $('ehud');
  if (e && !e.dead) {
    eh.classList.toggle('boss', !!e.t.boss);
    eh.style.display = 'block';
    const df = e.t.lv - P.lv, col = df >= 5 ? '#ff4040' : df >= 3 ? '#ff9030' : df >= -2 ? '#f0e050' : df >= -4 ? '#60d060' : '#a0a0a0';
    $('en').innerHTML = (df >= 5 ? '☠ ' : '') + e.t.n + ' <b style="color:' + col + '">Nv ' + e.t.lv + '</b>';
    $('ebi').style.width = Math.max(0, e.hp / e.max * 100) + '%';
  } else eh.style.display = 'none';

  $('pc').textContent = P.pot;
  const bossAlive = enemies.some(z => z.t.boss && !z.dead);
  const np = nearestPost(P.x, P.z, 26);
  $('qt').textContent = P.dead ? '' : np ? '⚔ ' + np.name + ' · inimigos Nv ' + np.lo + '–' + np.hi : '⚔ Explore a ilha · Seu Nv ' + P.lv + (bossAlive ? ' · ☠ Capitão Maldito à solta' : '');

  // XP do companheiro (botão R e árvore de habilidades)
  const s = PST[state.pet.id], w = (s.xp / pxn(s.lv) * 100) + '%';
  $('pxh').style.width = w;
  const y = $('pxb');
  if (y && treeShowsActivePet()) y.style.width = w;

  // atributos do painel (a cada 0,4 s enquanto aberto)
  if (isPanelOpen() && now - lastStatsRefresh > 400) {
    lastStatsRefresh = now;
    renderStats();
  }

  drawMinimap();
}

const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

/** Anel do botão de auto combate: tempo de auto restante (verde → amarelo → vermelho) ou recarga (azul) */
function updateStaminaRing() {
  const st = state.stam, recovering = !state.autoOn || state.autoRest;
  const v = $('sar');
  v.style.strokeDasharray = st * 100 + ' 100';
  v.setAttribute('class', 'val ' + (recovering ? 'rec' : st < LOW ? 'low' : st < .4 ? 'mid' : ''));
  $('ai').textContent = state.autoRest ? '💤' : '🤖';
  // número no canto: tempo de auto restante, ou quanto falta para recarregar
  const left = state.autoOn && !state.autoRest ? st * AUTO_TIME
    : state.autoRest ? Math.max(0, WAKE - st) * REST_TIME
    : (1 - st) * REST_TIME;
  $('at').textContent = left >= 1 ? mmss(left) : '';
}
