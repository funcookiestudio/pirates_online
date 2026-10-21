/* Avisos na tela: log, banner de nível, números de dano e fim de jogo. */
import { cam } from '../core/engine.js';
import { state } from '../core/state.js';
import { $ } from '../core/utils.js';

/** Mensagem no canto da tela (some em 3,5 s) */
export function log(t) {
  const d = document.createElement('div');
  d.textContent = t;
  $('log').appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

/* Texto de loot coletado: fica à direita da cabeça do jogador, empilhado, subindo e sumindo (não cobre o personagem) */
const lootTexts = [];
const LOOT_LIFE = 2200;

export function lootText(t) {
  const el = document.createElement('div');
  el.className = 'lt';
  el.textContent = t;
  document.body.append(el);
  lootTexts.push({ el, t0: performance.now() });
  if (lootTexts.length > 5) lootTexts.shift().el.remove();
}

/** Posiciona os textos de loot ao lado da cabeça do jogador em (x, z) */
export function updateLootTexts(x, z, now) {
  if (!lootTexts.length) return;
  const v = new THREE.Vector3(x, 1.9, z).project(cam);
  const sx = (v.x * .5 + .5) * innerWidth, sy = (-v.y * .5 + .5) * innerHeight;
  for (let i = lootTexts.length - 1; i >= 0; i--) {
    const l = lootTexts[i], age = (now - l.t0) / LOOT_LIFE;
    if (age >= 1) { l.el.remove(); lootTexts.splice(i, 1); continue; }
    const slot = lootTexts.length - 1 - i; // o mais novo fica embaixo, na altura da cabeça
    l.el.style.left = (sx + 38) + 'px';
    l.el.style.top = (sy - slot * 18 - age * 26) + 'px';
    l.el.style.opacity = age < .7 ? 1 : (1 - age) / .3;
  }
}

/** Aviso grande no centro (ex.: NÍVEL 5) */
export function banner(t) {
  const b = $('banner');
  b.textContent = t;
  b.classList.remove('on');
  void b.offsetWidth; // reinicia a animação CSS
  b.classList.add('on');
}

/** Número de dano flutuando sobre o inimigo `e` */
export function dmgNum(e, d, cr) {
  const v = new THREE.Vector3(e.x, 2.6, e.z).project(cam);
  const x = document.createElement('div');
  x.className = 'dn' + (cr ? ' c' : '');
  x.textContent = d;
  x.style.left = ((v.x * .5 + .5) * innerWidth + Math.random() * 20 - 10) + 'px';
  x.style.top = ((-v.y * .5 + .5) * innerHeight) + 'px';
  document.body.append(x);
  setTimeout(() => x.remove(), 1000);
  state.lastE = e;
  state.lastT = performance.now();
}

/** Tela de fim de jogo com botão de reiniciar */
export function showGameOver(text, lv, gold) {
  const m = $('msg');
  m.style.display = 'flex';
  m.innerHTML = text + '<br><small>Nível ' + lv + ' · ' + gold + ' ouro</small><br>' +
    '<button onclick="location.reload()" style="font-size:20px;margin-top:14px;padding:8px 18px">Jogar de novo</button>';
}
