/* Visão estilo Project Zomboid (fase 1: linha de visão 2D). Personagens (NPCs, inimigos, animais) que o jogador não consegue ver
   — atrás de paredes, em outro andar, dentro de casa fechada — ficam ocultos. O raio é 2D e usa o que o jogo já tem:
   o mapa de retângulos (paredes e portas fechadas) das casas mapeadas e a planta das demais casas. Perto do jogador sempre aparecem. */
import { P } from '../entities/player.js';
import { npcList } from '../entities/npc.js';
import { enemies } from '../core/registry.js';
import { FARM } from '../entities/farm.js';
import { HOUSES } from '../world/floors.js';
import { toU } from '../world/imap.js';
import { hemi, torch, scene } from '../core/engine.js';
import { groundY } from '../world/terrain.js';
import { CFG } from './settings.js';

export const VIS = { on: true, nearNpc: 4, nearEnemy: 6, every: .1 };
let acc = 0, RANGE = 72;
/** Alcance da visão: de dia vai até onde a névoa deixa ver; à noite cai para ~22 m (com tocha ~33 m) */
function sightRange() {
  const dark = Math.max(0, Math.min(1, (.85 - hemi.intensity) / .55));
  return (72 - 50 * dark) * (torch.distance > 30 ? 1.5 : 1);
}

/** O segmento (a→b) cruza o retângulo [u0,u1]×[v0,v1]? (método das "placas") */
function hits(au, av, bu, bv, u0, v0, u1, v1) {
  let t0 = 0, t1 = 1;
  const du = bu - au, dv = bv - av;
  for (const [p, q] of [[-du, au - u0], [du, u1 - au], [-dv, av - v0], [dv, v1 - av]]) {
    if (p === 0) { if (q < 0) return false; } else { const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
  }
  return true;
}

/** O jogador enxerga o ponto (tx,tz)? */
export function canSee(tx, tz, near) {
  const dx = tx - P.x, dz = tz - P.z, d2 = dx * dx + dz * dz;
  if (d2 < near * near) return true;                       // percepção: o que está colado sempre aparece
  if (d2 > RANGE * RANGE) return false;                    // além do alcance (noite)
  const L = P.up ? 1 : 0;
  for (let i = 0; i < HOUSES.length; i++) {
    const h = HOUSES[i];
    if (h.sc) continue;                                     // castelo: fora da regra por enquanto
    const hx = (h.hx || 4.2) * h.K, hz = (h.hz || 3.2) * h.K, R = Math.hypot(hx, hz) + 1;
    const cx = h.x - (P.x + tx) / 2, cz = h.z - (P.z + tz) / 2;
    if (cx * cx + cz * cz > (R + Math.sqrt(d2) / 2) ** 2) continue;   // casa longe do segmento
    const [pu, pv] = toU(h, P.x, P.z), [tu, tv] = toU(h, tx, tz);
    const pIn = Math.abs(pu) <= hx && Math.abs(pv) <= hz, tIn = Math.abs(tu) <= hx && Math.abs(tv) <= hz;
    if (!pIn && !tIn) { if (hits(pu, pv, tu, tv, -hx, -hz, hx, hz)) return false; continue; }   // atrás da casa
    if (pIn && tIn) {
      if (L === 1) return false;                           // jogador no andar de cima: o térreo não aparece
      if (h.rects && h.rects.some(q => q.l === 0 && q.tall && !(q.dr && q.dr.open) && hits(pu, pv, tu, tv, q.u0, q.v0, q.u1, q.v1))) return false;   // parede entre os dois
      continue;
    }
    if (!pIn && tIn && !h.shown) return false;             // alvo dentro de casa fechada, jogador fora
    // jogador dentro e alvo fora: as paredes estão recortadas, enxerga
  }
  return true;
}

const hide = (g, vis) => { if (g && !vis) g.visible = false; };

/** A cada quadro depois de tudo se mexer: atualiza (a cada 0,1 s) quem é visto e esconde o resto */
export function updateVision(dt, skip) {
  acc += dt;
  const re = acc >= VIS.every; if (re) { acc = 0; RANGE = sightRange(); VIS.on = CFG.vis !== false; }
  for (let i = 0; i < npcList.length; i++) {
    const n = npcList[i];
    if (re) n.inHid = VIS.on && !skip && !canSee(n.g.position.x, n.g.position.z, VIS.nearNpc);
    if (n.inHid) n.g.visible = false;
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (re) e.vHid = VIS.on && !skip && !!e.g && !canSee(e.g.position.x, e.g.position.z, VIS.nearEnemy);
    if (e.vHid) hide(e.g, false);
  }
  for (let i = 0; i < FARM.length; i++) {
    const f = FARM[i];
    if (re) f.vHid = VIS.on && !skip && !canSee(f.root.position.x, f.root.position.z, VIS.nearNpc);
    if (f.vHid) hide(f.root, false);
  }
}

// ───────── Fase 3: escurecer o chão que o jogador não enxerga (e lembrar o que já viu) ─────────
// Grade de células de 2 m ao redor do jogador (raio 24 m). Cada célula é testada com a mesma linha de visão dos personagens, aos poucos
// (uma fatia por quadro). Célula fora de visão fica escura: mais escura se nunca foi vista, mais clara se já foi ("lembrada").
const CS = 2, RR = 12, W = RR * 2 + 1, NC = W * W, SLICE = 6;
const seenEver = new Set(), vis = new Uint8Array(NC), kEv = new Uint8Array(NC);
let ovNever = null, ovMem = null, ocx = 1e9, ocz = 1e9, slice = 0, dirty = true;
const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(CS, CS, 1);

function mkOverlay(op) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x03060a, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false }), NC);
  m.count = 0; m.frustumCulled = false; m.renderOrder = 5; m.userData.dyn = 1; m.visible = false;
  scene.add(m); return m;
}

function overlay(skip) {
  if (!ovNever) { ovNever = mkOverlay(.5); ovMem = mkOverlay(.24); }
  const on = VIS.on && !skip && !P.up;
  ovNever.visible = ovMem.visible = on;
  if (!on) return;
  const pcx = Math.floor(P.x / CS), pcz = Math.floor(P.z / CS);
  if (pcx !== ocx || pcz !== ocz) { ocx = pcx; ocz = pcz; slice = 0; vis.fill(1); kEv.fill(0); dirty = true; }   // recentra: recomeça a varredura
  // uma fatia da grade por quadro
  const per = Math.ceil(NC / SLICE), k0 = slice * per, k1 = Math.min(NC, k0 + per);
  for (let k = k0; k < k1; k++) {
    const i = ocx - RR + (k % W), j = ocz - RR + ((k / W) | 0), x = (i + .5) * CS, z = (j + .5) * CS;
    const v = canSee(x, z, 3) ? 1 : 0, key = i * 100003 + j;
    if (v) seenEver.add(key);
    const e = seenEver.has(key) ? 1 : 0;
    if (v !== vis[k] || e !== kEv[k]) { vis[k] = v; kEv[k] = e; dirty = true; }
  }
  slice = (slice + 1) % SLICE;
  if (!dirty) return;
  dirty = false;
  let a = 0, b = 0;
  for (let k = 0; k < NC; k++) {
    if (vis[k]) continue;
    const i = ocx - RR + (k % W), j = ocz - RR + ((k / W) | 0), x = (i + .5) * CS, z = (j + .5) * CS;
    if (Math.hypot(x - P.x, z - P.z) > RR * CS) continue;
    M4.compose(V3.set(x, groundY(x, z) + .08, z), Q0, S3);
    if (kEv[k]) ovMem.setMatrixAt(b++, M4); else ovNever.setMatrixAt(a++, M4);
  }
  ovNever.count = a; ovMem.count = b; ovNever.instanceMatrix.needsUpdate = ovMem.instanceMatrix.needsUpdate = true;
}
export function updateVisionOverlay(skip) { overlay(skip); }
