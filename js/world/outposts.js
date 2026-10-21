/* Postos avançados inimigos: a ilha é dividida em anéis de dificuldade (perto da vila = fácil, borda = perigoso).
   Cada posto tem uma fogueira no centro; os inimigos patrulham em volta (ou ficam de sentinela). */
import { campfire } from './campfire.js';
import { POST_DATA } from '../data/posts.js';
import { spawn } from '../entities/enemies.js';
import { log } from '../ui/notify.js';

const POSTS = POST_DATA.map(p => [p.deg, p.r, p.name, p.crew]);

export function buildOutposts() {
  POSTS.forEach(([deg, r, , crew]) => {
    const a = deg * Math.PI / 180, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    campfire(cx, cz);
    crew.forEach(([k, mode, rr], i) => {
      const ang = (i / crew.length) * Math.PI * 2 + Math.random() * .6;
      const x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
      spawn(k, x, z, mode === 'p' ? { cx, cz, r: rr, dir: i % 2 ? 1 : -1 } : undefined);
    });
  });
  log('A ilha tem ' + POSTS.length + ' postos inimigos: quanto mais longe da vila, mais perigosos');
}

export { updateFires as updateOutposts } from './campfire.js';
