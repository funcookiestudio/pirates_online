/* Fogueira: pedras, toras, chama animada e brilho no chão. Usada nos postos e no centro da vila. */
import { scene } from '../core/engine.js';
import { M } from '../core/utils.js';
import { props } from '../core/registry.js';
import { groundY } from './terrain.js';

const fires = [];

export function campfire(x, z, sc = 1) {
  const g = new THREE.Group();
  g.position.set(x, groundY(x, z), z); g.scale.setScalar(sc);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(.45, .28, .38), M(i % 2 ? 0x6a6a6a : 0x808080));
    s.position.set(Math.cos(a) * .95, .14, Math.sin(a) * .95); s.rotation.y = -a; g.add(s);
  }
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .09, 1.1, 6), M(0x4a2c14));
    l.rotation.z = Math.PI / 2; l.rotation.y = i * Math.PI / 4 + .2; l.position.y = .12; g.add(l);
  }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(.75, 10), M(0x1a1410)); ash.rotation.x = -Math.PI / 2; ash.position.y = .03; g.add(ash);
  const fl = [];
  [[.34, 1.1, 0xff6a1a], [.24, .9, 0xffa020], [.14, .65, 0xffe060]].forEach(([r, h, c], i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .92 }));
    m.position.set(i ? (i - 1.5) * .12 : 0, h / 2 + .1, 0); g.add(m); fl.push([m, h, i]); m.userData.dyn = 1;
  });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16), new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: .16, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = .05; g.add(glow);
  glow.userData.dyn = 1;
  scene.add(g);
  props.push({ position: { x, z, y: 0 }, r: .95 * sc });
  fires.push({ fl, glow, ph: Math.random() * 6 });
}

export function updateFires(t) {
  fires.forEach(f => {
    f.fl.forEach(([m, h, i]) => {
      const w = Math.sin(t * (9 + i * 3) + f.ph + i * 2) * .5 + .5;
      m.scale.set(.85 + w * .3, .8 + w * .45, .85 + w * .3);
      m.position.y = h * m.scale.y / 2 + .1;
      m.rotation.y = t * 2 + i;
    });
    f.glow.material.opacity = .13 + Math.sin(t * 7 + f.ph) * .04;
  });
}
