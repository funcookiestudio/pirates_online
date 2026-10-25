/* Pontos de interesse do gerador de ilhas: Porto (cais), Caverna (entrada) e Tesouro (X no chão, com recompensa única). */
import { scene } from '../core/engine.js';
import { charKey } from '../core/chars.js';
import { props } from '../core/registry.js';
import { M as M0 } from '../core/utils.js';
import { xray } from './xray.js';
const M = c => xray(M0(c));
import { isl, VX, VZ, SEA, groundY, floorY } from './terrain.js';
import { N, V } from './islandgen.js';
import { makeNpc } from '../entities/npc.js';
import { FERRYMAN } from '../data/npcs.js';
import { SEED } from './terrain.js';
const E = N / 2;
import { P } from '../entities/player.js';
import { log } from '../ui/notify.js';
import { buildCaves, updateCaves, DUNGEONS } from './caves.js';
import { cullTerrain } from './terrain-mesh.js';

export const pois = [];   // { n, x, z, c } em coordenadas do jogo (c = cor no minimapa)
const KEY = charKey('pirata-tesouro-v1' + (SEED === 'pirata' ? '' : '-' + SEED));   // o tesouro achado é por personagem
let arrive = false; try { arrive = localStorage.getItem('pirata-chegada') === '1'; } catch (e) { /* ok */ }
let treasure = null, got = false, near = '';
try { got = localStorage.getItem(KEY) === '1'; } catch (e) { /* sem armazenamento */ }

const bx = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
const solid = (x, z, r) => props.push({ position: { x, z, y: 0 }, r });

export function buildPois() {
  const [po, , , tr] = isl.pois;
  const at = p => ({ x: p.x - VX, z: p.z - VZ });
  const port = at(po), tre = at(tr);
  pois.push({ n: 'Porto', ...port, c: '#4ad0e8', ic: '⚓' }, { n: 'Tesouro', ...tre, c: '#ffd840', ic: '💰' });

  // cais: convés acima da água, estacas até o fundo, barqueiro na ponta (o convés vira chão pisável)
  const g = new THREE.Group(), yaw = Math.atan2(isl.port.dx, isl.port.dz), pdx = isl.port.dx, pdz = isl.port.dz;
  const deckY = SEA + 1.15, LEN = 15;
  for (let t = -1.5; t <= LEN; t += .5) {
    const cx = port.x + pdx * t, cz = port.z + pdz * t;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const gx = Math.round(cx + VX + E) + a, gz = Math.round(cz + VZ + E) + b;
      if (gx < 1 || gz < 1 || gx >= N || gz >= N) continue;
      if (Math.hypot(gx - (cx + VX + E), gz - (cz + VZ + E)) > 1.45) continue;
      const k = gz * V + gx;
      if (isl.deck[k] < deckY) isl.deck[k] = deckY;
      isl.nav[k] = 0;
    }
  }
  for (let t = -1; t <= LEN; t += .8) {
    const px = port.x + pdx * t, pz = port.z + pdz * t;
    const m = bx(g, 2.8, .16, .78, t % 1.6 < .8 ? 0x8a6238 : 0x7a5530, px, deckY - .08, pz); m.rotation.y = yaw;
  }
  for (let t = 0; t <= LEN; t += 3) {
    const px = port.x + pdx * t, pz = port.z + pdz * t, fy = floorY(px, pz) - .4, h = deckY + .9 - fy;
    for (const s of [-1, 1]) {
      const sx = px + pdz * 1.35 * s, sz = pz - pdx * 1.35 * s;
      bx(g, .22, h, .22, 0x4a3220, sx, fy + h / 2, sz);
      bx(g, .14, .1, 3.0, 0x6a4a28, sx, deckY + .75, sz).rotation.y = yaw;   // corrimão entre as estacas
    }
  }
  const fer = makeNpc('guard', port.x + pdx * 12, port.z + pdz * 12, Math.atan2(-pdx, -pdz), [0xd8a880, 0x2a5a7a, 0x2a2a30, 0xc8b070], 5, FERRYMAN);
  fer.g.position.y = deckY;
  solid(port.x + pdx * 12, port.z + pdz * 12, .55);
  // tesouro: baú pequeno + X vermelho + feixe de luz (animado: não é fundido)
  const ty = groundY(tre.x, tre.z);
  bx(g, .7, .45, .5, 0x7a4a20, tre.x, ty + .22, tre.z); bx(g, .72, .15, .52, 0xe0b030, tre.x, ty + .5, tre.z);
  for (const s of [.785, -.785]) { const m = bx(g, 2, .04, .3, 0xc02020, tre.x, ty + .05, tre.z + 1.4); m.rotation.y = s; }
  solid(tre.x, tre.z, .5);
  scene.add(g);
  treasure = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 9, 6), new THREE.MeshBasicMaterial({ color: 0xffd840, transparent: true, opacity: .35 }));
  treasure.position.set(tre.x, ty + 4.5, tre.z); treasure.userData.dyn = 1; treasure.visible = !got;
  scene.add(treasure);
  buildCaves();
  log('🗺 Porto, ' + DUNGEONS.length + ' cavernas e tesouro marcados no minimapa');
}

/** Avisos de proximidade e coleta do tesouro (uma vez) */
export function updatePois() {
  updateCaves();
  if (arrive && pois[0]) { arrive = false; try { localStorage.removeItem('pirata-chegada'); } catch (e) { /* ok */ } P.x = P.tx = pois[0].x - isl.port.dx * 3; P.z = P.tz = pois[0].z - isl.port.dz * 3; P.vx = P.vz = 0; }
  cullTerrain(P.x, P.z);
  let n = '';
  for (const p of pois) if (Math.hypot(p.x - P.x, p.z - P.z) < 3.2) n = p.n;
  if (n === near) return;
  near = n;
  if (n === 'Porto') log('⚓ Porto: de onde o barco parte (em breve)');
  else if (n === 'Tesouro' && !got) {
    got = true; treasure.visible = false;
    const g = 150 + 25 * P.lv; P.gold += g;
    log('💰 X marca o local! Tesouro: +' + g + ' ouro');
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* sem armazenamento */ }
  }
}
