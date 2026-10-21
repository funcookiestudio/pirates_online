/* Partículas e efeitos visuais temporários. */
import { scene } from '../core/engine.js';
import { particles } from '../core/registry.js';

/** Solta `n` fragmentos coloridos em (x,y,z); `s` = força da explosão */
export function puff(x, y, z, c, s, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(.15 + Math.random() * .2, 0),
      new THREE.MeshBasicMaterial({ color: c, transparent: true })
    );
    m.position.set(x, y, z);
    scene.add(m);
    particles.push({
      m,
      v: new THREE.Vector3((Math.random() - .5) * s, Math.random() * s, (Math.random() - .5) * s),
      t: 1,
    });
  }
}

/** Move e apaga gradualmente as partículas */
export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const f = particles[i];
    f.t -= dt * 1.4;
    f.m.position.addScaledVector(f.v, dt);
    f.m.material.opacity = Math.max(0, f.t);
    if (f.t <= 0) {
      scene.remove(f.m);
      particles.splice(i, 1);
    }
  }
}
