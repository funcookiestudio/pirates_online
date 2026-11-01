/* Modelos do Stylized Nature MegaKit (Quaternius, CC0): pedras, seixos, cogumelos e flores, com cor sólida por face (sem texturas). */
import { KIT } from './nature-kit-data.js';
import { xray } from './xray.js';

const geos = {};
const mat = xray(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));

function geo(name) {
  if (geos[name]) return geos[name];
  const { p, c } = KIT[name], col = new Float32Array(p.length), tc = new THREE.Color();
  c.forEach((hex, f) => { tc.setHex(hex); for (let k = 0; k < 3; k++) col.set([tc.r, tc.g, tc.b], (f * 3 + k) * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return geos[name] = g;
}

/** Malha de um modelo do kit; `s` = escala, a base fica em y=0 */
export function kitMesh(name, s = 1) {
  const m = new THREE.Mesh(geo(name), mat);
  m.scale.setScalar(s);
  m.rotation.y = Math.random() * 6.28;
  return m;
}

export const ROCKS = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'];
export const PEBBLES = ['Pebble_Round_1', 'Pebble_Round_3', 'Pebble_Square_2', 'Pebble_Square_5'];
export const PLANTS = ['Mushroom_Common', 'Mushroom_Laetiporus', 'Flower_3_Single', 'Flower_3_Group', 'Flower_4_Single'];
const pick = a => a[Math.floor(Math.random() * a.length)];

/** Pedra grande (colide, r≈1) */
export function makeRock() {
  const m = kitMesh(pick(ROCKS), .45 + Math.random() * .2);
  m.position.y = -.05;
  m.r = 1;
  return m;
}
/** Enfeite pequeno sem colisão: seixo, cogumelo ou flor */
export function makeDecor() {
  const w = Math.random();
  return w < .4 ? kitMesh(pick(PEBBLES), 1.4) : w < .7 ? kitMesh(pick(PLANTS.slice(0, 2)), .8) : kitMesh(pick(PLANTS.slice(2)), .5);
}
