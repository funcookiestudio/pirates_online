/* Indicador mínimo dos efeitos ativos do jogador e do companheiro (Etapa 6): uma linha de texto pequena com o tempo restante.
   Só aparece quando há algo ativo; não mexe no resto da HUD (a interface final é a Etapa 8). */
import { P } from '../entities/player.js';
import { buffList } from '../systems/buffs.js';

const NAME = { regen: 'Cura contínua', shield: 'Escudo', atk: '+Dano', dr: '-Dano recebido', spd: '+Velocidade', ward: 'Égide' };
let el = null, acc = 0, last = '';

export function updateBuffHud(dt) {
  acc += dt;
  if (acc < .25) return;
  acc = 0;
  const t = x => (x >= 10 ? Math.ceil(x) : x.toFixed(1)) + 's';
  const part = (who, tag) => buffList(who).map(b => tag + NAME[b.id] + (b.id === 'shield' ? ' ' + Math.ceil(b.amt) : '') + ' ' + t(b.t));
  const bad = [];
  if (P.slow > 0) bad.push('Lento ' + t(P.slow));
  if (P.stone > 0) bad.push('Petrificado ' + t(P.stone));
  const lines = part('p', '').concat(part('pet', '🐾 ')).concat(bad.map(x => '⚠ ' + x)).join(' · ');
  if (lines === last) return;
  last = lines;
  if (!el) {
    el = document.createElement('div'); el.id = 'rodfx';
    el.style.cssText = 'position:fixed;left:8px;top:84px;max-width:60vw;font:600 11px/1.3 system-ui,sans-serif;color:#e8f0ff;background:rgba(10,14,30,.55);padding:2px 6px;border-radius:6px;pointer-events:none;z-index:6;display:none';
    document.body.append(el);
  }
  el.textContent = lines;
  el.style.display = lines ? 'block' : 'none';
}
