/* HUD: barras de vida, status, vida do inimigo, missão, XP do companheiro e painel/minimapa. */
import { state } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { $, isPanelOpen } from '../core/utils.js';
import { pxn } from '../data/pets.js';
import { P } from '../entities/player.js';
import { dialogOpen } from './dialog.js';
import { nearestPost } from '../data/posts.js';
import { updateLootTexts } from './notify.js';
import { ROLL_CD } from '../systems/dodge.js';
import { AUTO_TIME, REST_TIME, LOW, WAKE } from '../systems/stamina.js';
import { PST, pmax, PDN } from '../pets/stats.js';
import { renderStats } from './panel.js';
import { treeShowsActivePet } from './pet-panel.js';
import { drawMinimap } from './minimap.js';
import { drawDayClock } from './dayclock.js';

/** Orbes de vida, cooldowns, status do topo e barra de XP */
export function updateStatusBars() {
  const pet = PST[state.pet.id];
  sty('hp', 'height', Math.max(0, P.hp / P.max * 100) + '%');
  sty('mp', 'height', state.petOff ? '0%' : Math.max(0, pet.hp / pmax(state.pet.id) * 100) + '%');
  txt('hpt', Math.ceil(P.hp) + '/' + P.max);
  txt('mpt', state.petOff ? '—' : PDN() ? '💤' : Math.ceil(pet.hp));
  sty('c2', 'height', P.cds[0] / 3 * 100 + '%');
  sty('c3', 'height', P.cds[1] / 5 * 100 + '%');
  sty('c6', 'height', P.rcd / ROLL_CD * 100 + '%');
  txt('st', 'Nv ' + P.lv + ' · 💰' + P.gold + ' · 🧪' + P.pot + ' · Dano ' + P.dmg);
  txt('lvp', 'Nv ' + P.lv);
  txt('lva', 'Nv ' + pet.lv);
  sty('xpb', 'width', P.xp / P.nxt * 100 + '%');
  updateStaminaRing();
}


/* escrita no DOM só quando o valor muda: reescrever o mesmo texto/estilo todo quadro invalida o estilo da página e o celular refaz layout/pintura depois do JS */
const memo = new Map();
const put = (k, v, fn) => { if (memo.get(k) === v) return; memo.set(k, v); fn(); };
const sty = (id, prop, v) => put(id + '.' + prop, v, () => { $(id).style[prop] = v; });
const txt = (id, v) => put(id + '#t', String(v), () => { $(id).textContent = v; });
const htm = (id, v) => put(id + '#h', v, () => { $(id).innerHTML = v; });
let lastStatsRefresh = 0, mmTick = 0;

/** Barra do inimigo, missão, XP do companheiro, atributos do painel e minimapa */
export function updateOverlays(now) {
  updateLootTexts(P.x, P.z, performance.now());
  document.body.classList.toggle('ui-open', isPanelOpen() || dialogOpen()); // painel/diálogo aberto: esconde minimapa e avisos que ficariam por baixo
  // barra de vida do último inimigo atingido (só depois de causar dano; some após 4 s)
  const e = state.lastE && now - state.lastT < 4000 ? state.lastE : null, eh = $('ehud');
  if (e && !e.dead) {
    eh.classList.toggle('boss', !!e.t.boss);
    eh.style.display = 'block';
    const df = e.lv - P.lv, col = df >= 5 ? '#ff4040' : df >= 3 ? '#ff9030' : df >= -2 ? '#f0e050' : df >= -4 ? '#60d060' : '#a0a0a0';
    htm('en', (df >= 5 ? '☠ ' : '') + (e.elite ? '⭐ Elite ' : '') + e.t.n + ' <b style="color:' + col + '">Nv ' + e.lv + '</b>');
    sty('ebi', 'width', Math.max(0, e.hp / e.max * 100) + '%');
  } else eh.style.display = 'none';

  txt('pc', P.pot);
  txt('bc', P.bmb);
  const bossAlive = enemies.some(z => z.t.boss && !z.dead);
  const np = nearestPost(P.x, P.z, 26);
  txt('qt', P.dead ? '' : np ? '⚔ ' + np.name + ' · inimigos Nv ' + np.lo + '–' + np.hi : '⚔ Explore a ilha · Seu Nv ' + P.lv + (bossAlive ? ' · ☠ Capitão Maldito à solta' : ''));

  // XP do companheiro (botão R e árvore de habilidades)
  const s = PST[state.pet.id], w = (s.xp / pxn(s.lv) * 100) + '%';
  sty('pxh', 'width', w);
  const y = $('pxb');
  if (y && treeShowsActivePet()) y.style.width = w;

  // atributos do painel (a cada 0,4 s enquanto aberto)
  if (isPanelOpen() && now - lastStatsRefresh > 400) {
    lastStatsRefresh = now;
    renderStats();
  }

  drawDayClock();
  if ((mmTick = (mmTick + 1) % 3) === 0) drawMinimap(); // minimapa a ~20 fps
}

const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

/** Anel do botão de auto combate: tempo de auto restante (verde → amarelo → vermelho) ou recarga (azul) */
function updateStaminaRing() {
  const st = state.stam, recovering = !state.autoOn || state.autoRest;
  const v = $('sar');
  put('sar.d', (st * 100).toFixed(1), () => { v.style.strokeDasharray = st * 100 + ' 100'; });   /* só quando muda (repintar o SVG todo quadro pesa no celular) */
  const cls = 'val ' + (recovering ? 'rec' : st < LOW ? 'low' : st < .4 ? 'mid' : '');
  put('sar.c', cls, () => v.setAttribute('class', cls));
  txt('ai', state.autoRest ? '💤' : '🤖');
  // número no canto: tempo de auto restante, ou quanto falta para recarregar
  const left = state.autoOn && !state.autoRest ? st * AUTO_TIME
    : state.autoRest ? Math.max(0, WAKE - st) * REST_TIME
    : (1 - st) * REST_TIME;
  txt('at', left >= 1 ? mmss(left) : '');
}
