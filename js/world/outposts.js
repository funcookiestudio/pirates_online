/* Postos avançados inimigos: a ilha é dividida em anéis de dificuldade (perto da vila = fácil, borda = perigoso).
   Cada posto tem uma fogueira no centro; os inimigos patrulham em volta (ou ficam de sentinela).
   Nível do inimigo = nível do papel (data/enemies.js) + bônus da ilha (tier) + 0–1 de variação; elites são raros. */
import { campfire } from './campfire.js';
import { POST_DATA } from '../data/posts.js';
import { ENEMY_KINDS, KIND } from '../data/enemies.js';
import { spawn } from '../entities/enemies.js';
import { SEED } from './terrain.js';
import { tierOf, tierBonus, eliteChance, ELITE } from '../data/scaling.js';
import { log } from '../ui/notify.js';

export const TIER = tierOf(SEED);
/** Nível mínimo e máximo recomendados na ilha (para mapa, barqueiro e HUD) */
export const ISLAND_LV = () => [Math.min(...POST_DATA.map(p => p.lo)), Math.max(...POST_DATA.map(p => p.hi))];

export function buildOutposts() {
  const bonus = tierBonus(TIER);
  POST_DATA.forEach(post => {
    const { x: cx, z: cz, crew, ring } = post;   // x,z já foram ajustados ao relevo (terrain.js)
    campfire(cx, cz);
    // ilhas mais difíceis têm postos mais cheios (+1 inimigo a cada 2 tiers, até 6)
    const team = crew.slice();
    for (let n = 0; n < Math.floor(TIER / 2) && team.length < 6; n++) { const c = crew[(n + 1) % crew.length]; team.push([c[0], 'p', c[2] + 1]); }
    let lo = 99, hi = 0;
    team.forEach(([k, mode, rr], i) => {
      const t = ENEMY_KINDS[k], elite = !t.boss && Math.random() < eliteChance(TIER, ring);
      const lv = t.lv + bonus + (t.boss ? 0 : Math.round(Math.random())) + (elite ? ELITE.lv : 0);
      lo = Math.min(lo, lv); hi = Math.max(hi, lv);
      const ang = (i / team.length) * Math.PI * 2 + Math.random() * .6;
      const x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
      spawn(k, x, z, mode === 'p' ? { cx, cz, r: rr, dir: i % 2 ? 1 : -1 } : undefined, { lv, elite });
    });
    post.lo = lo; post.hi = hi;
  });
  const [a, b] = ISLAND_LV();
  log('A ilha tem ' + POST_DATA.length + ' postos inimigos · Nv ' + a + '–' + b + ': quanto mais longe da vila, mais perigosos');
}

export { updateFires as updateOutposts } from './campfire.js';
