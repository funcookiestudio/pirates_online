/* Ilha: chão, árvores e pedras. */
import { scene } from '../core/engine.js';
import { VILLAGE_R } from '../core/village-const.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { makeTree } from './trees.js';

export function buildWorld() {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 12).rotateX(-Math.PI / 2), M(0x5a6a3a));
  scene.add(ground);

  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.28, r = VILLAGE_R + 6 + Math.random() * (54 - VILLAGE_R - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    let m;

    if (Math.random() < .5) {
      // árvore sorteada: palmeiras, bananeira, pinheiro, frondosa ou baobá
      m = makeTree();
    } else {
      // pedra
      m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), xray(M(0x6a6a62)));
      m.position.y = .4;
      m.r = 1;
    }

    m.position.x = x;
    m.position.z = z;
    scene.add(m);
    props.push(m);
  }
}
