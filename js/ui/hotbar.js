/* Botão do companheiro (R) na barra de habilidades. */
import { state } from '../core/state.js';
import { $ } from '../core/utils.js';

/** Hotbar responsiva: o barco mantém suas proporções e só encolhe (até um mínimo) quando a tela é estreita */
const HB_MIN = .5;
export function fitHotbar() {
  const hb = $('hb');
  hb.style.transform = 'translateX(-50%)';
  // retrato no celular: o barco ocupa toda a largura da tela, com 4 px de folga em cada ponta
  const portrait = innerHeight > innerWidth && innerWidth <= 700;
  const k = portrait ? Math.min(2.6, (innerWidth - 8) / hb.offsetWidth) : Math.max(HB_MIN, Math.min(1, (innerWidth - 8) / hb.offsetWidth));
  hb.style.transform = 'translateX(-50%) scale(' + k.toFixed(3) + ')';
}

export function initHotbarFit() {
  fitHotbar();
  addEventListener('resize', fitHotbar);
  addEventListener('orientationchange', fitHotbar);
}

/** Sincroniza ícone, modo (ataca / coleta) e destaque do botão com o companheiro ativo */
export function refreshPetButton() {
  const pet = state.pet;
  $('pi').textContent = pet.ic;
  $('pm').textContent = state.petAttack ? '⚔' : (pet.id === 'dog' ? '🐾' : '📦');
  $('s5').classList.toggle('on', state.petAttack);
}
