/* Botão do companheiro (R) na barra de habilidades. */
import { state } from '../core/state.js';
import { $ } from '../core/utils.js';

/** Hotbar responsiva: o barco mantém suas proporções e só encolhe (até um mínimo) quando a tela é estreita */
const HB_MIN = .5;
export function fitHotbar() {
  const hb = $('hb');
  const cl = document.body.classList;
  if (cl.contains('mob') && innerWidth > innerHeight) {   // celular deitado: a mesma barra do computador, ajustada à tela com folga nas laterais (diamantes e barras de XP não encostam na borda)
    hb.style.transform = 'translateX(-50%)';
    const rs = ['gwl', 'gwr', 'deck'].map(i => $(i).getBoundingClientRect());
    const w1 = Math.max(...rs.map(r => r.right)) - Math.min(...rs.map(r => r.left));
    const side = Math.max(24, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sai')) || 0);
    const k = Math.max(.5, Math.min(1.1, (innerWidth - side * 2) / w1));
    hb.style.transform = 'translateX(-50%) scale(' + k.toFixed(3) + ')';
    const top = Math.min($('deck').getBoundingClientRect().top, $('gwl').getBoundingClientRect().top);
    document.documentElement.style.setProperty('--hbh', Math.ceil(innerHeight - top) + 'px');
    return;
  }
  if (cl.contains('mob')) {   // celular em retrato: barra do desktop em tamanho real (sem escalar), botões em duas fileiras
    hb.style.transform = '';
    const top = Math.min($('sk').getBoundingClientRect().top, $('gwl').getBoundingClientRect().top);
    document.documentElement.style.setProperty('--hbh', Math.ceil(innerHeight - top) + 'px');
    return;
  }   // HUD de uma mão: sem barco, só diamantes e arco
  hb.style.transform = 'translateX(-50%)';
  // retrato no celular: o barco ocupa toda a largura da tela, com 4 px de folga em cada ponta
  const portrait = innerHeight > innerWidth && innerWidth <= 700;
  const landscapePhone = innerWidth > innerHeight && innerHeight <= 500; // celular deitado: barco menor, sobra mais tela
  const k = landscapePhone ? Math.min(.62, (innerWidth - 8) / hb.offsetWidth) : portrait ? Math.min(2.6, (innerWidth - 8) / hb.offsetWidth) : Math.max(HB_MIN, Math.min(1, (innerWidth - 8) / hb.offsetWidth));
  hb.style.transform = 'translateX(-50%) scale(' + k.toFixed(3) + ')';
  // altura ocupada pela hotbar (do topo dos diamantes/convés até a borda): diálogos e lojas ficam acima disso
  const top = Math.min($('deck').getBoundingClientRect().top, $('gwl').getBoundingClientRect().top);
  document.documentElement.style.setProperty('--hbh', Math.ceil(innerHeight - top) + 'px');
}

export function initHotbarFit() {
  fitHotbar();
  addEventListener('resize', fitHotbar);
  addEventListener('orientationchange', fitHotbar);
  addEventListener('orientationchange', () => setTimeout(fitHotbar, 250));
}

/** Sincroniza ícone, modo (ataca / coleta) e destaque do botão com o companheiro ativo */
export function refreshPetButton() {
  const pet = state.pet;
  $('pi').textContent = state.petOff ? '🚫' : pet.ic;
  $('pm').textContent = state.petOff ? '' : state.petAttack ? '⚔' : ((pet.id === 'dog' || pet.id === 'rat') ? '🐾' : '📦');
  $('s5').classList.toggle('on', state.petAttack);
}
