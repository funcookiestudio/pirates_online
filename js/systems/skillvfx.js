/* Caixa de ferramentas visual das habilidades de classe: malhas simples (geometrias e materiais reaproveitados/limpos ao fim),
   com orçamento de peças por habilidade (40 no celular, 80 no computador). Nada de luz real: o "brilho" é disco/anel translúcido. */
import { scene, cam } from '../core/engine.js';
import { isMobile } from '../core/device.js';

const sh = g => { g.userData.shared = true; return g; };
export const G = {
  RING: sh(new THREE.RingGeometry(.82, 1, 32).rotateX(-Math.PI / 2)),
  DISC: sh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)),
  ORB: sh(new THREE.SphereGeometry(1, 10, 8)),
  ROCK: sh(new THREE.IcosahedronGeometry(1, 0)),
  CONE: sh(new THREE.ConeGeometry(1, 1, 6).translate(0, .5, 0)),
  BOX: sh(new THREE.BoxGeometry(1, 1, 1)),
  SHARD: sh(new THREE.OctahedronGeometry(1, 0)),
  BEAM: sh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, .5)),
  PILLAR: sh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, .5, 0)),
  ARC: sh(new THREE.RingGeometry(.85, 1, 16, 1, 0, 2.4)),
};

const live = [];
export const cap = () => (isMobile() ? 40 : 80);
/** Orçamento de peças de uma habilidade */
export const budget = () => ({ n: 0, max: cap() });
export const left = B => (B ? B.max - B.n : 99);

/**
 * Cria uma peça temporária. s = escala (número ou [x,y,z]).
 * p: o = opacidade · life = duração (s) · v = velocidade [x,y,z] · g = gravidade · grow = escala/s (número ou [x,y,z])
 *    spin = giro/s [x,y,z] · rot = rotação inicial [x,y,z] · face = vira para a câmera · mode = 'out' (some) | 'inout' (aparece e some) | 'hold'
 * Devolve a malha, ou null se o orçamento acabou.
 */
export function add(B, geo, color, x, y, z, s, p) {
  p = p || {};
  if (B) { if (B.n >= B.max) return null; B.n++; }
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: p.o === undefined ? 1 : p.o, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(x, y, z);
  if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s);
  if (p.face) m.quaternion.copy(cam.quaternion);
  if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
  if (p.face && p.rz) m.rotateZ(p.rz);
  scene.add(m);
  live.push({ m, t: 0, life: p.life || .6, o: p.o === undefined ? 1 : p.o, v: p.v, g: p.g || 0, grow: p.grow, spin: p.spin, mode: p.mode || 'out', min: p.min || 0, vy: p.v ? p.v[1] : 0 });
  return m;
}

/** Anel no chão que cresce de r0 a r1 */
export function ring(B, x, y, z, color, r0, r1, life, o, spin) {
  const k = (r1 - r0) / life;
  return add(B, G.RING, color, x, y, z, [r0, 1, r0], { life, o: o === undefined ? .8 : o, grow: [k, 0, k], spin: spin ? [0, spin, 0] : undefined });
}
/** Disco que cresce (poça, brilho) */
export function disc(B, x, y, z, color, r0, r1, life, o) {
  const k = (r1 - r0) / life;
  return add(B, G.DISC, color, x, y, z, [r0, 1, r0], { life, o: o === undefined ? .5 : o, grow: [k, 0, k] });
}
/** Coluna de luz que sobe e some */
export function pillar(B, x, y, z, color, r, h, life, o) {
  return add(B, G.PILLAR, color, x, y, z, [r, h, r], { life, o: o === undefined ? .5 : o, v: [0, .6, 0], grow: [r * .4, 0, r * .4] });
}
/** Esfera/clarão que cresce */
export function flash(B, x, y, z, color, r0, r1, life, o) {
  const k = (r1 - r0) / life;
  return add(B, G.ORB, color, x, y, z, r0, { life, o: o === undefined ? .8 : o, grow: k });
}
/** n fagulhas/estilhaços; spd = velocidade, up = impulso para cima */
export function sparks(B, x, y, z, color, n, spd, life, size, up, g) {
  const q = Math.min(n, left(B));
  for (let i = 0; i < q; i++) {
    const a = Math.random() * 6.283, r = Math.random() * spd;
    add(B, G.SHARD, Array.isArray(color) ? color[i % color.length] : color, x, y, z, size * (.6 + Math.random() * .8), {
      life: life * (.7 + Math.random() * .6), v: [Math.sin(a) * r, (up === undefined ? spd * .6 : up) * (.4 + Math.random() * .8), Math.cos(a) * r], g: g === undefined ? 9 : g,
      spin: [Math.random() * 8, Math.random() * 8, 0],
    });
  }
}
/** Segmento de reta entre dois pontos (raio, feixe) */
export function bolt(B, x0, y0, z0, x1, y1, z1, color, w, life, o) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, l = Math.hypot(dx, dy, dz) || .01;
  const m = add(B, G.BEAM, color, x0, y0, z0, [w, w, l], { life, o: o === undefined ? .9 : o, grow: [-w / life * .8, -w / life * .8, 0] });
  if (m) m.lookAt(x1, y1, z1);
  return m;
}

export function updateVfx(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const f = live[i], m = f.m;
    f.t += dt;
    const u = Math.min(1, f.t / f.life);
    if (f.v) {
      f.vy -= f.g * dt;
      m.position.x += f.v[0] * dt; m.position.z += f.v[2] * dt; m.position.y += f.vy * dt;
    }
    if (f.grow) {
      const g = f.grow;
      if (Array.isArray(g)) m.scale.set(Math.max(.001, m.scale.x + g[0] * dt), Math.max(.001, m.scale.y + g[1] * dt), Math.max(.001, m.scale.z + g[2] * dt));
      else m.scale.setScalar(Math.max(.001, m.scale.x + g * dt));
    }
    if (f.spin) { m.rotation.x += f.spin[0] * dt; m.rotation.y += f.spin[1] * dt; m.rotation.z += f.spin[2] * dt; }
    m.material.opacity = f.mode === 'hold' ? f.o : f.mode === 'inout' ? f.o * Math.sin(Math.PI * u) : f.o * (1 - u);
    if (u >= 1) kill(i);
  }
}
function kill(i) {
  const f = live[i];
  scene.remove(f.m);
  f.m.material.dispose();
  if (!f.m.geometry.userData.shared) f.m.geometry.dispose();
  live.splice(i, 1);
}
/** Remove tudo (morte do jogador, troca de personagem) */
export function clearVfx() { for (let i = live.length - 1; i >= 0; i--) kill(i); }
export const vfxCount = () => live.length;

/** Malha persistente (aura, bolha, armadilha): o chamador a atualiza e chama drop() */
export function solid(geo, color, o, x, y, z, s) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(x || 0, y || 0, z || 0);
  if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else if (s) m.scale.setScalar(s);
  scene.add(m);
  return m;
}
export function drop(m) {
  if (!m) return;
  scene.remove(m);
  m.material.dispose();
  if (!m.geometry.userData.shared) m.geometry.dispose();
}
