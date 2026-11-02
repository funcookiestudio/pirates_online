/* Efeitos visuais das habilidades por classe (giro, bomba, esquiva, poção e golpe). Só visual: não mexe em dano.
   Usa o registro de partículas (effects.js): anéis, colunas e lâminas que crescem e somem; geometrias compartilhadas. */
import { scene } from '../core/engine.js';
import { particles } from '../core/registry.js';
import { puff } from './effects.js';

const sh = g => { g.userData.shared = true; return g; };
const RING = sh(new THREE.RingGeometry(.82, 1, 32).rotateX(-Math.PI / 2));
const DISC = sh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2));
const PILLAR = sh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true).translate(0, .5, 0));
const BLADE = sh(new THREE.BoxGeometry(.07, .05, 1.6).translate(0, 0, .8));
const ORB = sh(new THREE.SphereGeometry(1, 10, 8));
const LEAF = sh(new THREE.PlaneGeometry(.3, .18));

const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o === undefined ? 1 : o, side: THREE.DoubleSide, depthWrite: false });
function add(g, c, x, y, z, s, o) {
  const m = new THREE.Mesh(g, mat(c, o));
  m.position.set(x, y, z); m.scale.setScalar(s);
  scene.add(m);
  return m;
}
const par = (m, f) => { particles.push(Object.assign({ m, v: new THREE.Vector3(), t: 1 }, f)); return m; };

/** Anel de choque no chão que se expande */
function ring(x, z, c, r0, grow, t, rs) { par(add(RING, c, x, .12, z, r0), { gs: grow, gy: 0, t, rs: rs || 0 }); }
/** Coluna de luz que sobe e some */
function pillar(x, z, c, r, h, t) { const m = add(PILLAR, c, x, 0, z, r, .55); m.scale.y = h; par(m, { gs: 0, gy: 0, t, v: new THREE.Vector3(0, .5, 0) }); }

/** Giro (Q): onda de cada classe, com raio ~4 */
export function spinFx(P) {
  const [c1, c2] = P.cls.fx, x = P.x, z = P.z;
  ring(x, z, c1, .5, 9, .55);
  ring(x, z, c2, .3, 6, .45);
  switch (P.cls.n) {
    case 'Guerreiro':   // golpe sísmico: onda dupla e faíscas de brasa
      ring(x, z, 0xffffff, .2, 11, .35);
      puff(x, .3, z, c2, 9, 12);
      break;
    case 'Caçador':     // redemoinho de folhas
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.283, m = add(LEAF, i % 2 ? c1 : c2, x + Math.sin(a) * 1.4, .6 + (i % 3) * .3, z + Math.cos(a) * 1.4, 1);
        m.rotation.set(1.2, a, 0);
        par(m, { v: new THREE.Vector3(Math.sin(a) * 6, 1.2, Math.cos(a) * 6), t: .8, rs: 9 });
      }
      break;
    case 'Mago':        // círculo arcano com runas girando
      par(add(RING, c2, x, .14, z, 2.4), { gs: 2.2, gy: 0, t: .8, rs: 5 });
      par(add(RING, c1, x, .16, z, 1.5), { gs: 1.6, gy: 0, t: .8, rs: -7 });
      pillar(x, z, c1, 1.1, 3.2, .6);
      puff(x, 1, z, c2, 5, 10);
      break;
    case 'Ladino':      // lâminas radiais e fumaça
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.283, m = add(BLADE, i % 2 ? c1 : 0xffffff, x, .9, z, 1, .85);
        m.rotation.y = a;
        par(m, { v: new THREE.Vector3(Math.sin(a) * 7, 0, Math.cos(a) * 7), t: .45, gs: 1.5, gy: 0 });
      }
      puff(x, .4, z, c2, 4, 10);
      break;
  }
}

/** Bomba (W): cor do pavio/bola e explosão de cada classe */
export function bombTint(m, P) { m.material.color.setHex(P.cls.fx ? P.cls.fx[0] : 0x111111); m.material.color.multiplyScalar(.5); }
export function bombFx(x, z, P) {
  const [c1, c2] = P.cls.fx;
  par(add(ORB, 0xffffff, x, .7, z, .8, .8), { gs: 6, t: .3 });                 // clarão
  ring(x, z, c1, .5, 11, .6);
  switch (P.cls.n) {
    case 'Guerreiro': pillar(x, z, c1, 1.6, 3.5, .7); puff(x, .4, z, c2, 10, 14); break;       // fogaréu
    case 'Caçador':   ring(x, z, c2, .3, 8, .8); puff(x, .5, z, c1, 8, 16); break;             // chuva de estilhaços verdes
    case 'Mago':      par(add(ORB, c1, x, 1, z, .6, .55), { gs: 7, t: .5 }); pillar(x, z, c2, 1.2, 5, .6); break; // implosão arcana
    case 'Ladino':    puff(x, .4, z, 0x444c55, 4, 16); ring(x, z, c1, .3, 7, .7); break;       // nuvem de fumaça
  }
}

/** Esquiva: rastro e poeira na cor da classe */
export function dodgeFx(P) {
  const [c1, c2] = P.cls.fx;
  ring(P.x, P.z, c1, .4, 4, .35);
  par(add(DISC, c2, P.x, .1, P.z, .8, .5), { gs: 1.5, gy: 0, t: .4 });
  puff(P.x, .5, P.z, c1, 2.5, 6);
}

/** Poção: coluna de cura com brilhos subindo */
export function potionFx(P) {
  pillar(P.x, P.z, 0xff7a7a, .8, 2.6, .7);
  ring(P.x, P.z, 0xffb0b0, .3, 3, .6);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * 6.283, m = add(ORB, i % 2 ? 0xffffff : P.cls.fx[1], P.x + Math.sin(a) * .7, .3, P.z + Math.cos(a) * .7, .07);
    par(m, { v: new THREE.Vector3(0, 2.4 + (i % 3) * .5, 0), t: .9 });
  }
}

/** Cor do arco do golpe básico por classe */
export const swingColor = (P, fin) => (fin ? P.cls.fx[1] : P.cls.fx[0]);
