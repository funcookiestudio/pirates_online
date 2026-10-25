/* Vila no centro da ilha: muralha com 4 portões (2 guardas em cada), casinhas e moradores. */
import { TAVERN_SC } from './tavern-house.js';
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
import { CASTLE } from './reserve.js';
import { doorFront } from './doors.js';

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
    // muralha da união: entre os muros de ligação do castelo (16,4 m para cada lado) a muralha da vila some, até o portão
    if (CASTLE.ok) { const cd = Math.hypot(CASTLE.x, CASTLE.z) || 1, ux = CASTLE.x / cd, uz = CASTLE.z / cd, px = Math.cos(a) * VILLAGE_R, pz = Math.sin(a) * VILLAGE_R; if (px * ux + pz * uz > 0 && Math.abs(-px * uz + pz * ux) < 16.4 - .3) continue; }
    const len = 2 * VILLAGE_R * Math.sin(Math.PI / N_SEG) + .12;
    const x = Math.cos(a) * VILLAGE_R, z = Math.sin(a) * VILLAGE_R;
    // mesma construção da muralha do castelo: pedra com fiadas, 6,2 m, 1,2 m de espessura e ameias
    const ry = -a - Math.PI / 2, CH = 6.2;
    box(len, CH, 1.2, 0x8c8a82, x, CH / 2, z).rotation.y = ry;
    for (let y = .55; y < CH - .05; y += .55) box(len, .06, 1.24, 0x5e5c56, x, y, z).rotation.y = ry;
    if (i % 2 === 0) box(len * .56, .95, 1.35, 0xa09e94, x, CH + .48, z).rotation.y = ry;
    blocker(x, z, 1);
  }
}

let gi = 0, ci = 0;
function citizen(x, z, ry, look, work, idx = ci) { makeNpc('citizen', x, z, ry, look, idx === 0 ? 2 : idx, CITIZENS[idx % CITIZENS.length], work); ci++; if (!(work && work.kind === 'tenant')) blocker(x, z, .55); }   // inquilinos andam pela vila: sem obstáculo fixo no ponto inicial

function buildGate(a) {
  const d = [Math.cos(a), Math.sin(a)], t = [-Math.sin(a), Math.cos(a)];
  [-1, 1].forEach(s => {
    const x = d[0] * VILLAGE_R + t[0] * s * (GATE_HW + 1), z = d[1] * VILLAGE_R + t[1] * s * (GATE_HW + 1);
    const tw = box(2.4, 8.4, 2.4, 0x8c8a82, x, 4.2, z);
    tw.rotation.y = -a - Math.PI / 2;
    const top = box(3.0, .5, 3.0, 0x5e5c56, x, 8.6, z);
    top.rotation.y = tw.rotation.y;
    box(.2, 1, .2, 0x5a3a1a, x, 9.5, z); // mastro
    box(.9, .55, .06, 0xb02020, x, 9.75, z).rotation.y = tw.rotation.y; // bandeira
    blocker(x, z, 1.35);
  });
  // viga sobre o portão
  const b = box(2 * (GATE_HW + 1) + 1, .6, 1.1, 0x5a3a1a, d[0] * VILLAGE_R, 4.2, d[1] * VILLAGE_R);
  b.rotation.y = -a - Math.PI / 2;
  // guardas: dois por portão, do lado de fora, um de cada lado, olhando para fora
  [-1, 1].forEach(s => {
    const x = d[0] * (VILLAGE_R + 2.2) + t[0] * s * (GATE_HW + .6), z = d[1] * (VILLAGE_R + 2.2) + t[1] * s * (GATE_HW + .6);   // do lado de fora, um de cada lado do portão
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
  // o portão que fica de frente para o castelo é removido (a muralha da vila se une à do castelo)
  const castleAng = CASTLE.ok ? Math.atan2(CASTLE.z, CASTLE.x) : null;
  for (let k = 0; k < 4; k++) {
    const ga = k * Math.PI / 2;
    if (castleAng !== null && Math.abs(Math.atan2(Math.sin(ga - castleAng), Math.cos(ga - castleAng))) < Math.PI / 4) continue;
    buildGate(ga);
  }

  // fogueira no centro da vila (substitui o antigo poço)
  campfire(0, 0, 1.3);

  // casas temáticas coladas na muralha (um slot por ofício), deixando o centro livre
  const looks = [[0xe0b48a, 0x5a4a3a, 0x3a3a3a, 0x2a2a2a], [0xc8946a, 0xb06a2a, 0x3a3a4a, 0x8a5a2a], [0xf0c8a0, 0x3a5a8a, 0x2a3a5a, 0xd8d0b0],
    [0xa87850, 0x7a5a2a, 0x4a3a2a, 0x6a4a3a], [0xe8bc94, 0x2a8a8a, 0x5a2a2a, 0x2a2a2a], [0xd0a07a, 0x2a7a4a, 0x3a4a3a, 0xa87850], [0xc8946a, 0x8a8a8a, 0x3a4a3a, 0xa87850]];
  const SLOTS = [['smith', 45], ['tavern', 135], ['cartog', 225], ['trader', 315]];   // nas diagonais, entre as ruas dos portões (portas voltadas para a praça)   // Zé Carrancudo e sua casa foram removidos; a Capitã Sal ocupa o lugar   // Mestre Breu e Pé-de-Pau moram na taberna
  const IDX = { smith: 0, tavern: 1, cartog: 2, trader: 5, fisher: 6 };
  // à direita da casa do Zé Carrancudo, junto ao muro: mural de missões e baú
  const edge = VILLAGE_R - 2.1;
  [[336, 'board'], [348, 'chest']].forEach(([deg, what]) => {
    const a = deg * Math.PI / 180, x = Math.cos(a) * edge, z = Math.sin(a) * edge, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
    if (what === 'board') {
      makeBoard(x, z, ry, BOARD);
      [-.7, .7].forEach(lx => blocker(x + lx * Math.cos(ry), z - lx * Math.sin(ry), .8));
    } else { makeChest(x, z, ry, CHEST); blocker(x, z, 1.0); }
  });
  const DOORS_PT = [];   // ponto diante da porta de cada casa (para os caminhos de pedra)
  SLOTS.forEach(([kind, deg]) => {
    const a = deg * Math.PI / 180, r = VILLAGE_R - ({ tavern: 9 }[kind] || 5.9), k = IDX[kind];
    const [fx, fz, th, at, pts] = buildHouse(kind, Math.cos(a) * r, Math.sin(a) * r, a);
    DOORS_PT.push(doorFront(kind + '-front', 1.2) || { p: at(0, 3.9 * 1.28), f: [-Math.cos(a), -Math.sin(a)] });
    if (kind === 'smith') { citizen(...at(...pts.home), th + pts.ay, looks[k], { kind: 'smith', at, th, pts }, k); }
    else citizen(fx, fz, th + (kind === 'cartog' ? pts.ay : 0), looks[k], pts && pts.talkAt ? { kind: 'keeper', talkAt: pts.talkAt, doorId: pts.doorId } : undefined, k);
    if (kind === 'tavern') {   // moradores da taberna (cada um com seu quarto no andar de cima)
      const K = TAVERN_SC;
      // cada um tem o seu quarto no andar de cima: Breu na frente (cama da direita), Polly nos fundos
      const room = (bx, bz, front, rd, rc) => { const [wx, wz] = at(bx * K, (bz + (front ? -.85 : .85)) * K); return { at, K, th, H: 3.15 * K, o: at(0, 0), rid: rd, rin: rc, bf: at(bx * K, (bz + (front ? -1.55 : 1.55)) * K), x: wx, z: wz, y: 3.98 * K + .12, ry: th + (front ? Math.PI : 0), sb: at(-4.35 * K, 2.5 * K), door: at(0, 5.2 * K), dr: 'tavern-front' }; };
      citizen(...at(1.4 * K, 6.0 * K), th, looks[3], { kind: 'tenant', room: room(4.3, 3.65, true, 'room-f3', [3, 2.4, 3, .6]) }, 3);     // Mestre Breu
      citizen(...at(-1.4 * K, 6.6 * K), th, looks[4], { kind: 'tenant', room: room(2.5, -3.75, false, 'room-3.4', [3.4, -2.4, 3.4, -.6]) }, 4);        // Pé-de-Pau Polly
    }
  });

  // ═════════ estradas de lajotas: leito escuro, meio-fio de pedra e lajotas retangulares em fiadas alternadas ═════════
  const tones = [0x908c82, 0x7f7b71, 0x8a867b, 0x9a968a, 0x75716a];
  let tk = 0;
  /** Trecho reto de estrada com largura w, de (x0,z0) a (x1,z1) */
  const road = (x0, z0, x1, z1, w, curb = true) => {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); if (L < .3) return;
    const ang = Math.atan2(dx, dz), sx = Math.sin(ang), sz = Math.cos(ang), ax = Math.cos(ang), az = -Math.sin(ang), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box(w + .1, .04, L + .1, 0x5e5a52, cx, .035, cz).rotation.y = ang;                                  // leito (as frestas ficam escuras)
    if (curb) for (const sd of [-1, 1]) { const o = sd * (w / 2 + .09); box(.22, .1, L + .22, 0xa4a094, cx + ax * o, .06, cz + az * o).rotation.y = ang; }
    const n = Math.max(2, Math.round(w / .62)), tw = w / n, rows = Math.max(1, Math.round(L / .55));
    for (let r = 0; r < rows; r++) {
      const t = (r + .5) / rows * L - L / 2, half = (r & 1) ? .5 : 0;
      for (let c = 0; c < n + (half ? 1 : 0); c++) {
        let u = (c - (n - 1) / 2) * tw - half * tw * (half && c === n ? -1 : 1) * 0 - (half ? tw / 2 : 0), ww = tw - .05;
        if (half && (c === 0 || c === n)) { ww = tw / 2 - .05; u = c === 0 ? -w / 2 + tw / 4 : w / 2 - tw / 4; }
        const px = (x0 + x1) / 2 + sx * t + ax * u, pz = (z0 + z1) / 2 + sz * t + az * u;
        if (Math.hypot(px, pz) < 2.2 || Math.hypot(px, pz) > VILLAGE_R + 3.6) continue;
        const m = box(ww, .05 + (tk % 3) * .008, L / rows - .05, tones[(tk * 7 + (tk >> 2)) % 5], px, .07, pz); m.rotation.y = ang + ((tk * 37) % 11 - 5) * .004; tk++;
      }
    }
  };
  const RING = 7;
  for (let i = 0; i < 28; i++) { const a0 = i / 28 * Math.PI * 2, a1 = (i + 1.08) / 28 * Math.PI * 2; road(Math.cos(a0) * RING, Math.sin(a0) * RING, Math.cos(a1) * RING, Math.sin(a1) * RING, 3, false); }   // praça circular
  for (const rr of [RING - 2.0, RING + 2.0]) for (let i = 0; i < 40; i++) { const a0 = i / 40 * Math.PI * 2; box(.3, .09, .6, 0xa4a094, Math.cos(a0) * rr, .06, Math.sin(a0) * rr).rotation.y = -a0; }   // meio-fio da praça
  for (let k = 0; k < 4; k++) {   // do anel ao portão e um pouco além dele
    const a0 = k * Math.PI / 2, c = Math.cos(a0), sn = Math.sin(a0);
    road(c * (RING + 1.4), sn * (RING + 1.4), c * (VILLAGE_R + 3.4), sn * (VILLAGE_R + 3.4), 3.4);
  }
  DOORS_PT.forEach(({ p: [dx, dz], f: [fx, fz] }) => {   // porta → praça, saindo reto da porta (alinhado com ela)
    const R2 = RING + 1.4, bq = dx * fx + dz * fz, cq = dx * dx + dz * dz - R2 * R2, disc = bq * bq - cq;
    const t = disc > 0 ? -bq - Math.sqrt(disc) : Math.hypot(dx, dz) - R2;
    road(dx, dz, dx + fx * t, dz + fz * t, 2.2);
  });
}

/** Mantém os inimigos fora da vila (zona segura) */
export function pushOutOfVillage(list) {
  list.forEach(e => {
    const d = Math.hypot(e.x, e.z), lim = VILLAGE_R + 2.2;
    if (d < lim) { const k = lim / (d || 1); e.x = d ? e.x * k : lim; e.z = d ? e.z * k : 0; }
  });
}
