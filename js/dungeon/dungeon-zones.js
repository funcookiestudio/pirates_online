/* Zonas da dungeon (desempenho no celular).
   A dungeon é uma grade; o que o jogador enxerga é só o que está "ao alcance andando" (paredes bloqueiam). Então, em vez de manter
   tudo ligado por distância em linha reta, a cada 0,25 s medimos a distância ANDANDO (busca em largura, paredes e porta trancada
   bloqueiam) a partir do jogador e usamos isso para:
   · CENÁRIO: o decor (brasas, tochas, entulho, colunas, baús, armadilhas) fica em "pedaços" de 6×6 células; pedaço fora do alcance
     sai da cena (sem desenhar e sem recalcular matrizes);
   · INIMIGOS: nascem só quando o jogador chega perto (criação preguiçosa, no máximo 2 por varredura) e voltam a dormir
     (saem de `enemies` e da cena: sem IA, sem física, sem desenho, sem separação, sem alvo do auto/pets) quando o jogador se afasta,
     a não ser que estejam perseguindo. Há um teto de inimigos acordados ao mesmo tempo (menor no celular). */
import { scene } from '../core/engine.js';
import { enemies } from '../core/registry.js';
import { spawn } from '../entities/enemies.js';
import { P } from '../entities/player.js';
import { isMobile } from '../core/device.js';
import { groundY } from '../world/terrain.js';
import { DG } from './dgrid.js';

const CH = 6;                 // pedaço de cenário: 6×6 células (12 m)
const WAKE = 12, SLEEP = 16;  // passos (células) andando: acorda até 12, volta a dormir depois de 16 (histerese)
const SHOW = 14, HIDE = 18;   // idem para o cenário
const MAKE = 2;               // criações de inimigo por varredura (evita travada ao entrar numa sala cheia)
const EVERY = .25;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const awakeCap = () => isMobile() ? 12 : 20;

export function makeZones(parent, W, H) {
  const CW = Math.ceil(W / CH), n = CW * Math.ceil(H / CH), idx = new Uint16Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) idx[j * W + i] = ((j / CH) | 0) * CW + ((i / CH) | 0);
  return { parent, W, H, CW, idx, chunks: Array.from({ length: n }, () => ({ g: new THREE.Group(), on: false, d: 1e9 })), mobs: [], list: null, depth: new Int16Array(W * H).fill(-1), q: new Int32Array(W * H), t: 9 };
}

/** Grupo do pedaço que contém a célula (i,j): ponha aqui o decor para ele sumir junto com o pedaço */
export function chunkAt(Z, i, j) {
  i = Math.max(0, Math.min(Z.W - 1, i)); j = Math.max(0, Math.min(Z.H - 1, j));
  return Z.chunks[Z.idx[j * Z.W + i]].g;
}

const cellOf = (Z, x, z) => Math.floor((z - DG.oz) / DG.C) * Z.W + Math.floor((x - DG.ox) / DG.C);

/** Põe o inimigo para dormir: sai de `enemies` e da cena e volta para casa com a vida cheia */
export function sleepMob(e) {
  if (e.sleep) return;
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  scene.remove(e.g);
  if (e.ring) { scene.remove(e.ring); e.ring = null; }
  e.sleep = 1; e.ag = false; e.st = 'chase'; e.tm = 0; e.cd = 1; e.sn = 0; e.bl = 0;
  e.hp = e.max; e.x = e.hx; e.z = e.hz; e.vx = e.vz = e.kx = e.kz = 0;
  e.g.position.set(e.hx, groundY(e.hx, e.hz), e.hz);
}
function wakeMob(e) {
  if (!e.sleep) return;
  e.sleep = 0; scene.add(e.g); enemies.push(e);
}

/** Registra um inimigo já criado (chefe, guardião da chave) como zona dormente */
export function addAsleep(Z, e) {
  e.dun = 1;
  Z.mobs.push({ e, x: e.hx, z: e.hz, cell: cellOf(Z, e.hx, e.hz), vip: true });
  sleepMob(e);
}

function flood(Z, s) {
  const { W, H, depth: d, q } = Z, grid = DG.grid;
  d.fill(-1); d[s] = 0;
  let h = 0, t = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cx = c % W, cy = (c / W) | 0, nd = d[c] + 1;
    for (let n = 0; n < 8; n++) {
      const dx = NB[n][0], dy = NB[n][1], x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const k = y * W + x;
      if (!grid[k] || d[k] >= 0) continue;
      if (dx && dy && (!grid[cy * W + x] || !grid[y * W + cx])) continue;   // sem cortar quina
      d[k] = nd; q[t++] = k;
    }
  }
}

/** Por frame (varre a cada 0,25 s): atualiza alcance, cenário e inimigos */
export function tickZones(Z, dt) {
  Z.t += dt;
  if (Z.t < EVERY) return;
  Z.t = 0;
  const i = Math.floor((P.x - DG.ox) / DG.C), j = Math.floor((P.z - DG.oz) / DG.C);
  if (i < 0 || j < 0 || i >= Z.W || j >= Z.H || !DG.grid[j * Z.W + i]) return;   // fora do piso: mantém o último alcance
  flood(Z, j * Z.W + i);
  const { depth, chunks } = Z;

  // cenário
  chunks.forEach(c => { c.d = 1e9; });
  for (let k = 0; k < depth.length; k++) if (depth[k] >= 0) { const c = chunks[Z.idx[k]]; if (depth[k] < c.d) c.d = depth[k]; }
  chunks.forEach(c => {
    const want = c.on ? c.d <= HIDE : c.d <= SHOW;
    if (want !== c.on) { c.on = want; if (want) Z.parent.add(c.g); else Z.parent.remove(c.g); }
  });

  // inimigos
  let awake = 0;
  const wake = [];
  for (const m of Z.mobs) {
    const e = m.e;
    if (e && e.dead) continue;
    const d = depth[m.cell];
    if (e && !e.sleep) {
      if (!e.ag && e.st === 'chase' && (d < 0 || d > SLEEP)) sleepMob(e); else awake++;
    } else if (d >= 0 && d <= WAKE) wake.push([d, m]);
  }
  wake.sort((a, b) => a[0] - b[0]);
  const cap = awakeCap();
  let made = 0;
  for (const [, m] of wake) {
    if (awake >= cap && !m.vip) continue;
    if (m.e) { wakeMob(m.e); awake++; }
    else if (made < MAKE) {
      spawn(m.k, m.x, m.z, null, { lv: m.lv, elite: m.elite });
      const e = enemies[enemies.length - 1];
      e.dun = 1; m.e = e; if (Z.list) Z.list.push(e);
      made++; awake++;
    }
  }
}

/** Ponto do inimigo adormecido (ou ainda não criado) mais perto andando — o auto vai até lá quando não há ninguém acordado */
export function nextMob(Z) {
  let best = null, bd = 1e9;
  for (const m of Z.mobs) {
    if (m.e && (m.e.dead || !m.e.sleep)) continue;
    const d = Z.depth[m.cell];
    if (d >= 0 && d < bd) { bd = d; best = m; }
  }
  return best && { x: best.x, z: best.z };
}

/** Quantos inimigos ainda não foram criados (entram na contagem "restantes" da missão) */
export const unspawned = Z => Z.mobs.reduce((n, m) => n + (m.e ? 0 : 1), 0);

/** Diagnóstico (#dev): window.__game.dungeonStats() */
export function zoneStats(Z) {
  let awake = 0, asleep = 0, fresh = 0;
  for (const m of Z.mobs) { if (!m.e) fresh++; else if (m.e.dead) continue; else if (m.e.sleep) asleep++; else awake++; }
  return { awake, asleep, naoCriados: fresh, pedacosLigados: Z.chunks.filter(c => c.on).length, pedacos: Z.chunks.length };
}
