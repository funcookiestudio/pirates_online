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

/** Redemoinho de vento e areia (Tempestade de Penas do papagaio): anéis que crescem e sobem mais poeira girando */
export function whirl(x, y, z) {
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, .03, 4, 20), new THREE.MeshBasicMaterial({ color: 0xf2e8cc, transparent: true }));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y + i * .35, z);
    m.scale.setScalar(.3 + i * .25);
    scene.add(m);
    particles.push({ m, v: new THREE.Vector3(0, 1.1, 0), t: .8 + i * .1, gs: 1.6 });
  }
  puff(x, y + .3, z, 0xd8b872, 3, 6);
}

/** Move e apaga gradualmente as partículas */
export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const f = particles[i];
    f.t -= dt * 1.4;
    f.m.position.addScaledVector(f.v, dt);
    if (f.gs) f.m.scale.addScalar(f.gs * dt);
    f.m.material.opacity = Math.max(0, f.t);
    if (f.t <= 0) {
      scene.remove(f.m);
      particles.splice(i, 1);
    }
  }
}
