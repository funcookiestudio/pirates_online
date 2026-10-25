/* Nomes dos inimigos na tela: poucos rótulos reaproveitados (os mais próximos, à vista, a menos de 12 m). Liga/desliga em Ajustes (CFG.names).
   Escreve no DOM só quando algo muda e move por transform (não força layout). */
import { P } from '../entities/player.js';
import { enemies } from '../core/registry.js';
import { cam, ren } from '../core/engine.js';
import { CFG } from '../systems/settings.js';

const N = 6, R2 = 12 * 12, els = [], v3 = new THREE.Vector3();
function mk() {
  const d = document.createElement('div'); d.className = 'npcl enl'; d.style.cssText = 'left:0;top:0;display:none'; ren.domElement.after(d);
  return { d, on: false, x: -1, y: -1, t: '' };
}
export function updateEnemyLabels() {
  if (!els.length) for (let i = 0; i < N; i++) els.push(mk());
  let k = 0;
  if (CFG.names !== false && !P.up) {
    const c = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]; if (e.dead || !e.g.visible || e.vHid) continue;
      const d2 = (e.x - P.x) ** 2 + (e.z - P.z) ** 2; if (d2 < R2) c.push([d2, e]);
    }
    c.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < c.length && k < N; i++) {
      const e = c[i][1];
      v3.set(e.g.position.x, (e.t.boss ? 3.6 : 2.4), e.g.position.z).project(cam);
      if (v3.z >= 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05) continue;
      const L = els[k++], x = Math.round((v3.x * .5 + .5) * innerWidth), y = Math.round((-v3.y * .5 + .5) * innerHeight);
      const df = e.lv - P.lv, col = df >= 5 ? '#ff6060' : df >= 3 ? '#ffa050' : df >= -2 ? '#f0e060' : df >= -4 ? '#80e080' : '#b0b0b0';
      const t = (e.elite ? '⭐ ' : '') + e.t.n + ' Nv ' + e.lv;
      if (t !== L.t) { L.t = t; L.d.textContent = t; }
      if (L.col !== col) { L.col = col; L.d.style.color = col; }
      if (!L.on) { L.on = true; L.d.style.display = 'block'; }
      if (x !== L.x || y !== L.y) { L.x = x; L.y = y; L.d.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)'; }
    }
  }
  for (let i = k; i < els.length; i++) if (els[i].on) { els[i].on = false; els[i].d.style.display = 'none'; }
}
