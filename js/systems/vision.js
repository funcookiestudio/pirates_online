/* Visão estilo Project Zomboid (fase 1: linha de visão 2D). Personagens (NPCs, inimigos, animais) que o jogador não consegue ver
   — atrás de paredes, em outro andar, dentro de casa fechada — ficam ocultos. O raio é 2D e usa o que o jogo já tem:
   o mapa de retângulos (paredes e portas fechadas) das casas mapeadas e a planta das demais casas. Perto do jogador sempre aparecem. */
import { P } from '../entities/player.js';
import { npcList } from '../entities/npc.js';
import { enemies } from '../core/registry.js';
import { FARM } from '../entities/farm.js';
import { HOUSES } from '../world/floors.js';
import { toU } from '../world/imap.js';
import { hemi, torch } from '../core/engine.js';
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
    const hx = (h.hx || 4.2) * h.K, hz = (h.hz || 3.2) * h.K, R = Math.hypot(hx, hz) + 1;
    const cx = h.x - (P.x + tx) / 2, cz = h.z - (P.z + tz) / 2;
    if (cx * cx + cz * cz > (R + Math.sqrt(d2) / 2) ** 2) continue;   // casa longe do segmento
    const [pu, pv] = toU(h, P.x, P.z), [tu, tv] = toU(h, tx, tz);
    const pIn = Math.abs(pu) <= hx && Math.abs(pv) <= hz && (!h.gBox || L === 1 || h.gBox(pu / h.K, pv / h.K)), tIn = Math.abs(tu) <= hx && Math.abs(tv) <= hz && (!h.gBox || h.gBox(tu / h.K, tv / h.K));   // taverna: o beiral da frente fica fora das paredes (gBox)
    if (!pIn && !tIn) { if (hits(pu, pv, tu, tv, -hx, -hz, hx, hz)) return false; continue; }   // atrás da casa
    if (pIn && tIn) {
      if (L === 1) return !!h.sc && Math.abs(tu) < 4.6;     // jogador no andar de cima: o térreo não aparece (castelo: o salão é aberto, vê-se pelo vão)
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

