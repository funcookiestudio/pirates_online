/* Ilha: chão, árvores e pedras. */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { makeTree } from './trees.js';
import { makeRock, makeDecor } from './nature-kit.js';
import { POST_DATA } from '../data/posts.js';
import { CAVES, initTerrain, groundY, walkable, onRoad, SEA } from './terrain.js';
import { buildTerrainMesh } from './terrain-mesh.js';
import { chooseFarmSite } from '../entities/farm-site.js';
import { reserved } from './reserve.js';
import { DRAGON_ISLE, RUINS_ISLE } from '../core/isle.js';
import { buildRuinsScenery, themedTree } from './ruins-isle.js';
import { buildDragonScenery } from './dragon-isle.js';

export function buildWorld() {
  initTerrain(POST_DATA);        // relevo procedural: vila plana em y=0, postos em platôs
  if (!RUINS_ISLE) chooseFarmSite([...POST_DATA, ...CAVES]);   // (ilhas de ruínas não têm fazenda) reserva o terreno da fazenda antes de nascer a vegetação
  buildTerrainMesh(POST_DATA);

  for (let i = 0, tries = 0; i < 70 && tries < 3000; tries++) {
    const x = (Math.random() * 2 - 1) * 150, z = (Math.random() * 2 - 1) * 150;
    if (reserved(x, z, 3)) continue;
    const y = groundY(x, z);
    if (Math.hypot(x, z) < VILLAGE_R + 6 || onRoad(x, z, 3) || y < SEA + 1.2 || POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 10) || CAVES.some(c => Math.hypot(c.x + c.dx * 3 - x, c.z + c.dz * 3 - z) < 8)) continue;
    if (![[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
    i++;
    let m;

    if (Math.random() < .5) {
      // árvore sorteada: palmeiras, bananeira, pinheiro, frondosa ou baobá
      m = RUINS_ISLE ? themedTree() : makeTree();
    } else {
      // pedra
      m = makeRock();
      m.position.y += y;
    }

    m.position.x = x;
    m.position.z = z;
    if (m.position.y === 0) m.position.y = y;
    scene.add(m);
    props.push(m);
  }

  // enfeites do Nature MegaKit (sem colisão): seixos, cogumelos e flores
  for (let i = 0, tries = 0; i < 160 && tries < 4000; tries++) {
    const x = (Math.random() * 2 - 1) * 150, z = (Math.random() * 2 - 1) * 150, y = groundY(x, z);
    if (reserved(x, z, 1) || Math.hypot(x, z) < VILLAGE_R + 4 || onRoad(x, z, 1) || y < SEA + 1 || !walkable(x, z)) continue;
    i++;
    const d = makeDecor();
    d.position.set(x, y, z);
    scene.add(d);
  }

  if (RUINS_ISLE) buildRuinsScenery();   // acampamentos e ruínas temáticos (vampiros, hidra ou múmia)
  if (DRAGON_ISLE) buildDragonScenery();   // ninhos, covil do Ancestral, ossos e árvores queimadas
}
