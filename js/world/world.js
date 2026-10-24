/* Ilha: chão, árvores e pedras. */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { makeTree } from './trees.js';
import { POST_DATA } from '../data/posts.js';
import { CAVES, initTerrain, groundY, walkable, onRoad, SEA } from './terrain.js';
import { buildTerrainMesh } from './terrain-mesh.js';
import { chooseFarmSite } from '../entities/farm-site.js';
import { reserved } from './reserve.js';

export function buildWorld() {
  initTerrain(POST_DATA);        // relevo procedural: vila plana em y=0, postos em platôs
  chooseFarmSite([...POST_DATA, ...CAVES]);   // reserva o terreno da fazenda antes de nascer a vegetação
  buildTerrainMesh(POST_DATA);

  for (let i = 0, tries = 0; i < 40 && tries < 2000; tries++) {
    const x = (Math.random() * 2 - 1) * 100, z = (Math.random() * 2 - 1) * 100;
    if (reserved(x, z, 3)) continue;
    const y = groundY(x, z);
    if (Math.hypot(x, z) < VILLAGE_R + 6 || onRoad(x, z, 3) || y < SEA + 1.2 || POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 10) || CAVES.some(c => Math.hypot(c.x + c.dx * 3 - x, c.z + c.dz * 3 - z) < 8)) continue;
    if (![[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
    i++;
    let m;

    if (Math.random() < .5) {
      // árvore sorteada: palmeiras, bananeira, pinheiro, frondosa ou baobá
      m = makeTree();
    } else {
      // pedra
      m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), xray(M(0x6a6a62)));
      m.position.y = .4 + y;
      m.r = 1;
    }

    m.position.x = x;
    m.position.z = z;
    if (m.position.y === 0) m.position.y = y;
    scene.add(m);
    props.push(m);
  }
}
