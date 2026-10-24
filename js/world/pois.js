/* Pontos de interesse do gerador de ilhas: Porto (cais), Caverna (entrada) e Tesouro (X no chão, com recompensa única). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M as M0 } from '../core/utils.js';
import { xray } from './xray.js';
const M = c => xray(M0(c));
import { isl, VX, VZ, groundY } from './terrain.js';
import { P } from '../entities/player.js';
import { log } from '../ui/notify.js';
import { cullTerrain } from './terrain-mesh.js';

export const pois = [];   // { n, x, z, c } em coordenadas do jogo (c = cor no minimapa)
const KEY = 'pirata-tesouro-' + 'v1';
let treasure = null, got = false, near = '';
try { got = localStorage.getItem(KEY) === '1'; } catch (e) { /* sem armazenamento */ }

const bx = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
const solid = (x, z, r) => props.push({ position: { x, z, y: 0 }, r });

export function buildPois() {
  const [po, , ca, tr] = isl.pois;
  const at = p => ({ x: p.x - VX, z: p.z - VZ });
  const port = at(po), cave = at(ca), tre = at(tr);
  pois.push({ n: 'Porto', ...port, c: '#4ad0e8' }, { n: 'Caverna', ...cave, c: '#a070ff' }, { n: 'Tesouro', ...tre, c: '#ffd840' });

  // cais: tábuas em direção ao mar, estacas onde o chão cai
  const g = new THREE.Group(), yaw = Math.atan2(isl.port.dx, isl.port.dz);
  for (let t = 0; t < 10; t++) {
    const px = port.x + isl.port.dx * (.4 + t * .85), pz = port.z + isl.port.dz * (.4 + t * .85), gy = groundY(px, pz);
    const m = bx(g, 1.6, .14, .8, 0x8a6238, px, gy + .12, pz); m.rotation.y = yaw;
    if (t % 2 === 0) for (const s of [-1, 1]) bx(g, .14, 1.4, .14, 0x4a3220, px + isl.port.dz * .8 * s, gy - .4, pz - isl.port.dx * .8 * s);
  }
  // entrada da caverna
  const cy = groundY(cave.x, cave.z), cg = new THREE.Group();
  cg.position.set(cave.x, cy - .2, cave.z); cg.rotation.y = Math.atan2(isl.cave.dx, isl.cave.dz);
  bx(cg, .6, 2.4, .6, 0x5a5560, -.9, 1.1, 0); bx(cg, .6, 2.4, .6, 0x5a5560, .9, 1.1, 0);
  bx(cg, 2.4, .6, .8, 0x4a4650, 0, 2.3, 0); bx(cg, 1.3, 1.9, .2, 0x050408, 0, .95, -.1);
  const cr = Math.cos(cg.rotation.y), sr = Math.sin(cg.rotation.y);
  for (const s of [-.9, .9]) solid(cave.x + s * cr, cave.z - s * sr, .45);
  // tesouro: baú pequeno + X vermelho + feixe de luz (animado: não é fundido)
  const ty = groundY(tre.x, tre.z);
  bx(g, .7, .45, .5, 0x7a4a20, tre.x, ty + .22, tre.z); bx(g, .72, .15, .52, 0xe0b030, tre.x, ty + .5, tre.z);
  for (const s of [.785, -.785]) { const m = bx(g, 2, .04, .3, 0xc02020, tre.x, ty + .05, tre.z + 1.4); m.rotation.y = s; }
  solid(tre.x, tre.z, .5);
  scene.add(g, cg);
  treasure = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 9, 6), new THREE.MeshBasicMaterial({ color: 0xffd840, transparent: true, opacity: .35 }));
  treasure.position.set(tre.x, ty + 4.5, tre.z); treasure.userData.dyn = 1; treasure.visible = !got;
  scene.add(treasure);
  log('🗺 Porto, caverna e tesouro marcados no minimapa');
}

/** Avisos de proximidade e coleta do tesouro (uma vez) */
export function updatePois() {
  cullTerrain(P.x, P.z);
  let n = '';
  for (const p of pois) if (Math.hypot(p.x - P.x, p.z - P.z) < 3.2) n = p.n;
  if (n === near) return;
  near = n;
  if (n === 'Porto') log('⚓ Porto: de onde o barco parte (em breve)');
  else if (n === 'Caverna') log('🕳 Entrada da caverna (dungeon em breve)');
  else if (n === 'Tesouro' && !got) {
    got = true; treasure.visible = false;
    const g = 150 + 25 * P.lv; P.gold += g;
    log('💰 X marca o local! Tesouro: +' + g + ' ouro');
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* sem armazenamento */ }
  }
}
