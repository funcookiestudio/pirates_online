/* HUD de uma mão (celular): diamantes encostados no canto oposto à mão, habilidades em arco em volta do polegar
   e um botão de menu no centro da base, que abre um leque com mochila, poderes, missões, pet, mapa e ajustes. */
import { MOB } from '../core/device.js';
import { $ } from '../core/utils.js';
import { CFG } from '../systems/settings.js';
import { fitHotbar } from './hotbar.js';
import { openTab } from './panel.js';
import { toggleWorldMap } from './worldmap.js';
import { applyLayout, initLayout } from './layout.js';

/** abre o painel do personagem já na aba pedida (o toque do botão nunca fecha o painel que já está aberto) */
function chr(t) { if ($('pnl').style.display !== 'block') openTab('char'); const b = $('tb-' + t); if (b) b.click(); }
const ITEMS = [
  ['bag', 'Mochila', () => chr('char')], ['burst', 'Poderes', () => chr('skills')], ['star', 'Talentos', () => chr('tal')],
  ['scroll', 'Missões', () => chr('qst')], ['paw', 'Companheiro', () => openTab('pets')], ['map', 'Mapa', () => toggleWorldMap()], ['gear', 'Ajustes', () => $('bg').click()],
];
const IC = {
  bag: '<path d="M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 016 0v2"/>',
  burst: '<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  scroll: '<path d="M7 3h11v15a3 3 0 01-3 3H6a3 3 0 003-3V6a3 3 0 00-2-3zM10 8h5M10 12h5"/>',
  paw: '<circle cx="7" cy="10" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="17" cy="10" r="2"/><path d="M7 17c0-3 2.5-5 5-5s5 2 5 5c0 2-2 3-5 3s-5-1-5-3z"/>',
  map: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  sigil: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M12 8l4 4-4 4-4-4z"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const body = document.body;
const setMenu = on => body.classList.toggle('menu-open', on);

function apply() {
  body.classList.toggle('mob', MOB.matches);
  body.classList.toggle('arc', MOB.matches && innerWidth <= innerHeight);   // retrato: arco em volta do polegar (posições do editor); deitado usa a barra do computador
  body.classList.toggle('land', innerWidth > innerHeight); body.classList.toggle('port', innerWidth <= innerHeight);
  body.classList.toggle('hand-l', CFG.hand === 'l');
  placeFan();
  fitHotbar();
  applyLayout();
}
/** distribui os ícones num leque acima do botão de menu (onde quer que ele esteja: base da tela, dentro da hotbar ou onde o jogador pôs) */
function placeFan() {
  const ln = $('lnch'), fan = $('fan'), rc = ln.getBoundingClientRect();
  fan.style.left = (rc.left + rc.width / 2) + 'px';
  fan.style.top = (rc.top + rc.height / 2 - 23) + 'px';
  const n = ITEMS.length, r = !MOB.matches ? 150 : innerWidth > innerHeight ? 104 : 120;
  document.querySelectorAll('#fan button').forEach((b, i) => {
    const a = (16 + (148 / (n - 1)) * i) * Math.PI / 180;
    b.style.setProperty('--fx', Math.round(-Math.cos(a) * r) + 'px');
    b.style.setProperty('--fy', Math.round(-Math.sin(a) * r) + 'px');
  });
}

export function initMobileHud() {
  const bk = document.createElement('div'); bk.id = 'fanbk';
  const ln = document.createElement('button'); ln.id = 'lnch'; ln.title = 'Menu'; ln.innerHTML = svg('sigil');
  const fan = document.createElement('div'); fan.id = 'fan';
  ITEMS.forEach(([ic, tt, fn]) => {
    const b = document.createElement('button'); b.innerHTML = svg(ic); b.title = tt; b.setAttribute('aria-label', tt);
    b.onclick = e => { e.stopPropagation(); setMenu(false); fn(); };
    fan.append(b);
  });
  body.append(bk, fan);
  $('sk').append($('sawrap'), $('s5'), ln);   // auto combate, companheiro e menu entram na barra de botões (no computador ficam 4 | menu | 4)
  ln.onclick = () => { placeFan(); setMenu(!body.classList.contains('menu-open')); };
  bk.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); setMenu(false); };
  addEventListener('keydown', e => { if (e.code === 'Escape') setMenu(false); });
  initLayout();
  addEventListener('hudcfg', apply);
  addEventListener('resize', apply);
  addEventListener('orientationchange', () => setTimeout(apply, 250));
  if (MOB.addEventListener) MOB.addEventListener('change', apply);
  apply();
  [60, 300, 900, 2000].forEach(ms => setTimeout(apply, ms));   // a janela ainda está assentando quando o jogo abre (app instalado, giro): refaz a disposição
}
