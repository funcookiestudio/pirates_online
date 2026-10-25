/* Andares: altura extra do chão do personagem dentro de casas com escada (taberna).
   Colisões com `lvl` (0 = térreo, 1 = andar de cima) só valem no andar em que o personagem está. */
import { props } from '../core/registry.js';
import { P } from '../entities/player.js';
import { cam } from '../core/engine.js';
import { invalidateGrid } from '../systems/steer.js';
import { openDoorById } from './doors.js';

export const HOUSES = [];
export function registerFloors(h) { HOUSES.push(h); }

/** O ponto está dentro (ou junto) de uma casa? Lá dentro o corpo é mais fino e o caminho usa uma grade fina */
export function houseNear(x, z, pad = .6) {
  for (const h of HOUSES) {
    const dx = x - h.x, dz = z - h.z;
    if (dx * dx + dz * dz > 400) continue;
    const lx = (dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, lz = (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K;
    if (Math.abs(lx) <= (h.hx || 4.2) + pad && Math.abs(lz) <= (h.hz || 3.2) + pad) return true;
  }
  return false;
}

/** Liga as colisões do andar atual e desliga as do outro (as desligadas vão para longe) */
export function refreshProps() {
  props.forEach(p => {
    if (p.lvl === undefined && !p.dr) return;
    if (p.hx === undefined) { p.hx = p.position.x; p.hz = p.position.z; }
    const on = (p.lvl === undefined || p.lvl === (P.up ? 1 : 0)) && !(p.dr && p.dr.open);
    p.position.x = on ? p.hx : 1e5; p.position.z = on ? p.hz : 1e5;
  });
  invalidateGrid();
}
export const setLevel = () => refreshProps();

/** Altura extra (m) do chão sob (x,z): 0 fora das casas; sobe pela escada e fica no andar de cima */
export function floorOffset(x, z) {
  for (const h of HOUSES) {
    if (h.noStair) continue;
    const dx = x - h.x, dz = z - h.z;
    const lx = (dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, lz = (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K;
    if (Math.abs(lx) > (h.fx || 5.3) || Math.abs(lz) > (h.fz || 4.1)) continue;
    if (h.hf) return h.hf(lx, lz, b => { P.up = b; setLevel(b); });   // casas com piso próprio (castelo: palco e escadas)
    const H = 3.03 * h.K;
    const stair = lx >= -5.1 && lx <= -3.6 && lz >= -1.75 && lz <= 1.85;
    if (stair) {
      if (lz < -1.15 && !P.up) { P.up = true; setLevel(true); }
      else if (lz > 1.55 && P.up) { P.up = false; setLevel(false); }
      return H * Math.max(0, Math.min(1, (1.85 - lz) / 3));
    }
    return P.up ? H : 0;
  }
  if (P.up) { P.up = false; setLevel(false); }
  return 0;
}

// ── subir/descer a escada com um clique nos primeiros degraus ──
export const STAIR = { on: false, run: false, h: null, A: null, pts: [], i: 0 };
const toW = (h, lx, lz) => [h.x + lx * h.K * Math.cos(h.th) + lz * h.K * Math.sin(h.th), h.z - lx * h.K * Math.sin(h.th) + lz * h.K * Math.cos(h.th)];
const toL = (h, x, z) => { const dx = x - h.x, dz = z - h.z; return [(dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K]; };
export const cancelStair = () => { STAIR.on = false; STAIR.run = false; STAIR.then = null; };

/** Clique em (x,z): se for nos primeiros degraus (embaixo, para subir) ou na escada vista de cima (para descer), liga a viagem */
export function stairClick(x, z) {
  for (const h of HOUSES) {
    if (h.noStair) continue;
    const [px, pz] = toL(h, P.x, P.z);
    if (Math.abs(px) > (h.fx || 5.3) || Math.abs(pz) > (h.fz || 4.1)) continue;      // só quem já está dentro da casa
    const [lx, lz] = toL(h, x, z);
    if (h.sc) {
      const r = h.sc(lx, lz);
      if (!r) continue;
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, ...r.A), i: 0, pts: r.pts.map(q => toW(h, ...q)) });
      P.tgt = null; P.tx = STAIR.A[0]; P.tz = STAIR.A[1];
      return true;
    }
    if (lx < -5.6) continue;
    if (!P.up && (Math.hypot(lx + 4.2, lz - 1.8) < 2.8 || (lx <= -2.9 && lz >= .15 && lz <= 2.8))) {
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, -4.3, 2.5), i: 0, pts: [[-4.3, 1.75], [-4.3, .05], [-4.3, -1.3], [-4.3, -1.75]].map(q => toW(h, ...q)) });
    } else if (P.up && (Math.hypot(lx + 4.2, lz + .2) < 2.8 || (lx <= -3 && lz >= -2.45 && lz <= 1.95))) {
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, -4.3, -1.75), i: 0, pts: [[-4.3, -1.3], [-4.3, .05], [-4.3, 1.75], [-4.3, 2.5]].map(q => toW(h, ...q)) });
    } else continue;
    P.tgt = null; P.tx = STAIR.A[0]; P.tz = STAIR.A[1];
    return true;
  }
  return false;
}

/** A cada quadro: vai até o pé/topo da escada andando normalmente e então percorre os degraus */
export function stairTick() {
  if (!STAIR.on) return;
  if (!STAIR.run) {
    if (Math.abs(P.tx - STAIR.A[0]) > .2 || Math.abs(P.tz - STAIR.A[1]) > .2) { cancelStair(); return; }   // outro destino: cancela
    if (Math.hypot(P.x - STAIR.A[0], P.z - STAIR.A[1]) < 1.1) STAIR.run = true;
    return;
  }
  P.tgt = null; P.tx = P.x; P.tz = P.z;
}

/** Depois das colisões: avança pelos degraus ignorando-as (a escada é estreita) */
export function stairMove(dt) {
  if (!STAIR.on || !STAIR.run) return;
  const q = STAIR.pts[STAIR.i], dx = q[0] - P.x, dz = q[1] - P.z, d = Math.hypot(dx, dz), st = P.sp * .75 * dt;
  if (d <= st) { P.x = q[0]; P.z = q[1]; if (++STAIR.i >= STAIR.pts.length) { const th = STAIR.then; cancelStair(); P.tx = th ? th[0] : P.x; P.tz = th ? th[1] : P.z; } }
  else { P.x += dx / d * st; P.z += dz / d * st; }
  const yaw = Math.atan2(dx, dz), da = Math.atan2(Math.sin(yaw - P.g.rotation.y), Math.cos(yaw - P.g.rotation.y));
  P.g.rotation.y += da * Math.min(1, dt * 12);
}

/** Visão interna: com o personagem dentro da casa, some o telhado, o andar que não é o dele e as paredes entre a câmera e ele */
let INSIDE = false;
/** O personagem está dentro de uma casa? (o raio-x das árvores/pedras fica desligado lá dentro) */
export const insideHouse = () => INSIDE;
export function updateCutaway() {
  INSIDE = false;
  for (const h of HOUSES) {
    const [px, pz] = toL(h, P.x, P.z);
    const inside = Math.abs(px) < h.hx && Math.abs(pz) < h.hz;
    if (inside) INSIDE = true;
    h.roof.visible = !inside;
    if (h.up) h.up.visible = !inside || !!P.up;
    const [cx, cz] = toL(h, cam.position.x, cam.position.z);
    const inY = !!h.ye && Math.abs(px) < h.yx && pz >= -h.hz && pz < h.ye;
    const cd = Math.hypot(cx - px, cz - pz) || 1;   // direção da câmera vista do personagem: esconde também as paredes na linha de visão em diagonal
    h.walls.forEach(w => { w.g.visible = !((inside || (w.y && inY)) && ((cx * w.nx + cz * w.nz) * h.K > w.D * h.K * .35 || ((cx - px) * w.nx + (cz - pz) * w.nz) / cd > .45)); });
  }
}

/** Altura (m) do piso em que o personagem está, para o clique mirar no chão que ele vê (andar de cima) e não no terreno lá embaixo */
export function floorLevelH() {
  if (!P.up) return 0;
  for (const h of HOUSES) {
    if (h.noStair) continue;
    const [lx, lz] = toL(h, P.x, P.z);
    if (Math.abs(lx) < (h.fx || 5.3) + 1 && Math.abs(lz) < (h.fz || 4.1) + 1) return h.Hf !== undefined ? h.Hf : 3.03 * h.K;
  }
  return 0;
}

/** (x,z) está sobre o piso do andar de cima da casa onde o personagem está? */
export function upperContains(x, z) {
  if (!P.up) return false;
  for (const h of HOUSES) {
    if (h.noStair) continue;
    const [px, pz] = toL(h, P.x, P.z);
    if (Math.abs(px) > (h.fx || 5.3) || Math.abs(pz) > (h.fz || 4.1)) continue;
    const [lx, lz] = toL(h, x, z);
    return Math.abs(lx) <= (h.sc ? (h.fx || 5.3) - .3 : 5.1) && Math.abs(lz) <= (h.fz || 4.1) - .1;
  }
  return false;
}

/** Clicou fora da casa estando no andar de cima: vai à escada, desce, abre a porta e segue para (x,z) */
export function descendThen(x, z) {
  for (const h of HOUSES) {
    if (h.noStair || !P.up) continue;
    const [px, pz] = toL(h, P.x, P.z);
    if (Math.abs(px) > (h.fx || 5.3) || Math.abs(pz) > (h.fz || 4.1)) continue;
    if (h.sc) {   // casas com escadas roteirizadas (castelo): desce pela escada do lado em que está
      const r = h.sc((px < 0 ? -1 : 1) * 5.9, 3); if (!r) continue;
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, ...r.A), i: 0, then: [x, z], pts: r.pts.map(q => toW(h, ...q)) });
      P.tgt = null; P.tx = STAIR.A[0]; P.tz = STAIR.A[1];
      return true;
    }
    Object.assign(STAIR, { on: true, run: false, h, A: toW(h, -4.3, -1.75), i: 0, then: [x, z], pts: [[-4.3, -1.3], [-4.3, .05], [-4.3, 1.75], [-4.3, 2.5]].map(q => toW(h, ...q)) });
    if (h.door) openDoorById(h.door);
    P.tgt = null; P.tx = STAIR.A[0]; P.tz = STAIR.A[1];
    return true;
  }
  return false;
}
