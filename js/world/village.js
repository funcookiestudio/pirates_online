/* Vila no centro da ilha: muralha com 4 portões (2 guardas em cada), casinhas e moradores. */
import { VILLAGE_R, GATE_HW } from '../core/village-const.js';
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { P } from '../entities/player.js';
import { CITIZENS, GUARD, CHEST, BOARD } from '../data/npcs.js';
import { buildHouse } from './houses.js';
import { makeChest, makeBoard } from '../entities/npc.js';
import { makeNpc } from '../entities/npc.js';
import { xray } from './xray.js';
import { campfire } from './campfire.js';

/** Raio da muralha e meia-largura dos portões */
export { VILLAGE_R, GATE_HW };
const N_SEG = Math.round(VILLAGE_R * 3.6);
const X = c => xray(M(c));

function box(w, h, d, c, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), X(c));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}

/** Colisão circular (mesma lista das árvores e pedras) */
function blocker(x, z, r) {
  const o = new THREE.Object3D();
  o.position.set(x, 0, z);
  o.r = r;
  props.push(o);
}

function buildWall() {
  for (let i = 0; i < N_SEG; i++) {
    const a = (i + .5) / N_SEG * Math.PI * 2;
    // deixa vão nos 4 portões (ângulos 0, 90, 180, 270)
    const nearGate = Math.min(...[0, 1, 2, 3].map(k => Math.abs(((a - k * Math.PI / 2 + 3 * Math.PI) % (Math.PI * 2)) - Math.PI)));
    const dist = nearGate; // distância angular ao portão mais próximo
    if (dist < (GATE_HW + .6) / VILLAGE_R) continue;
    const len = 2 * VILLAGE_R * Math.sin(Math.PI / N_SEG) + .12;
    const x = Math.cos(a) * VILLAGE_R, z = Math.sin(a) * VILLAGE_R;
    const w = box(len, 3, 1, i % 2 ? 0x8a8478 : 0x7e786c, x, 1.5, z);
    w.rotation.y = -a - Math.PI / 2;
    box(len, .35, 1.25, 0x5c564c, x, 3.1, z).rotation.y = w.rotation.y; // cobertura do muro
    blocker(x, z, 1);
  }
}

let gi = 0, ci = 0;
function citizen(x, z, ry, look, work) { makeNpc('citizen', x, z, ry, look, ci === 0 ? 2 : ci, CITIZENS[ci % CITIZENS.length], work); ci++; blocker(x, z, .55); }

function buildGate(a) {
  const d = [Math.cos(a), Math.sin(a)], t = [-Math.sin(a), Math.cos(a)];
  [-1, 1].forEach(s => {
    const x = d[0] * VILLAGE_R + t[0] * s * (GATE_HW + 1), z = d[1] * VILLAGE_R + t[1] * s * (GATE_HW + 1);
    const tw = box(2.2, 5, 2.2, 0x6e685c, x, 2.5, z);
    tw.rotation.y = -a - Math.PI / 2;
    const top = box(2.8, .5, 2.8, 0x4a4238, x, 5.2, z);
    top.rotation.y = tw.rotation.y;
    box(.2, 1, .2, 0x5a3a1a, x, 6.1, z); // mastro
    box(.9, .55, .06, 0xb02020, x, 6.35, z).rotation.y = tw.rotation.y; // bandeira
    blocker(x, z, 1.35);
  });
  // viga sobre o portão
  const b = box(2 * (GATE_HW + 1) + 1, .6, 1.1, 0x5a3a1a, d[0] * VILLAGE_R, 4.2, d[1] * VILLAGE_R);
  b.rotation.y = -a - Math.PI / 2;
  // guardas: dois por portão, do lado de dentro, olhando para fora
  [-1, 1].forEach(s => {
    const x = d[0] * (VILLAGE_R - 1.3) + t[0] * s * 1.9, z = d[1] * (VILLAGE_R - 1.3) + t[1] * s * 1.9;
    makeNpc('guard', x, z, Math.PI / 2 - a, [0xd8a880, 0x3a4a6a, 0x2a2a30, 0x707880], gi++, GUARD);
    blocker(x, z, .55);
  });
}

export function buildVillage() {
  // chão de terra batida
  const ground = new THREE.Mesh(new THREE.CircleGeometry(VILLAGE_R + 3, 24).rotateX(-Math.PI / 2), M(0x9a8a62));
  ground.position.y = .012;
  scene.add(ground);
  buildWall();
  for (let k = 0; k < 4; k++) buildGate(k * Math.PI / 2);

  // fogueira no centro da vila (substitui o antigo poço)
  campfire(0, 0, 1.3);

  // casas temáticas coladas na muralha (um slot por ofício), deixando o centro livre
  const looks = [[0xe0b48a, 0x5a4a3a, 0x3a3a3a, 0x2a2a2a], [0xc8946a, 0xb06a2a, 0x3a3a4a, 0x8a5a2a], [0xf0c8a0, 0x3a5a8a, 0x2a3a5a, 0xd8d0b0],
    [0xa87850, 0x7a5a2a, 0x4a3a2a, 0x6a4a3a], [0xe8bc94, 0x2a8a8a, 0x5a2a2a, 0x2a2a2a], [0xd0a07a, 0x2a7a4a, 0x3a4a3a, 0xa87850], [0xc8946a, 0x8a8a8a, 0x3a4a3a, 0xa87850]];
  const SLOTS = [['smith', 28], ['tavern', 62], ['cartog', 118], ['caulk', 152], ['sailor', 208], ['trader', 242], ['fisher', 298]];
  // à direita da casa do Zé Carrancudo, junto ao muro: mural de missões e baú
  const edge = VILLAGE_R - 2.1;
  [[324, 'board'], [341, 'chest']].forEach(([deg, what]) => {
    const a = deg * Math.PI / 180, x = Math.cos(a) * edge, z = Math.sin(a) * edge, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
    if (what === 'board') {
      makeBoard(x, z, ry, BOARD);
      [-.7, .7].forEach(lx => blocker(x + lx * Math.cos(ry), z - lx * Math.sin(ry), .8));
    } else { makeChest(x, z, ry, CHEST); blocker(x, z, 1.0); }
  });
  SLOTS.forEach(([kind, deg], i) => {
    const a = deg * Math.PI / 180, r = VILLAGE_R - 3.7;
    const [fx, fz, th, at] = buildHouse(kind, Math.cos(a) * r, Math.sin(a) * r, a);
    if (kind === 'smith') { const [sx, sz] = at(.9, 3.45); citizen(sx, sz, th + Math.PI, looks[i], { kind: 'smith', at, th }); }
    else citizen(fx, fz, th, looks[i]);
  });
}

/** Mantém os inimigos fora da vila (zona segura) */
export function pushOutOfVillage(list) {
  list.forEach(e => {
    const d = Math.hypot(e.x, e.z), lim = VILLAGE_R + 2.2;
    if (d < lim) { const k = lim / (d || 1); e.x = d ? e.x * k : lim; e.z = d ? e.z * k : 0; }
  });
}
