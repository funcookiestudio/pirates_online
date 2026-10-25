/* Portas: começam fechadas (bloqueiam a passagem); clique para abrir/fechar.
   As dos quartos (andar de cima da taberna) ficam trancadas até alugar um quarto com a Madame Rum. */
import { groundY } from './terrain.js';
import { props } from '../core/registry.js';
import { P } from '../entities/player.js';
import { CLOCK } from '../core/clock.js';
import { log } from '../ui/notify.js';
import { refreshProps } from './floors.js';

export const DOORS = [];
export const ROOM_PRICE = 40;
const RENT = { until: 0 };
export const roomRented = () => CLOCK.total < RENT.until;
/** Aluga um quarto por um dia (24 h de jogo): destranca as portas dos quartos */
export function rentRoom() { RENT.until = CLOCK.total + 24; }

const toW = (h, lx, lz) => [h.x + lx * h.K * Math.cos(h.th) + lz * h.K * Math.sin(h.th), h.z - lx * h.K * Math.sin(h.th) + lz * h.K * Math.cos(h.th)];
const toL = (h, x, z) => { const dx = x - h.x, dz = z - h.z; return [(dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K]; };

/** Registra uma porta. `d`: { p (folha), openRot, c (centro), f (plano z do vão), w, lvl, room, id } · `h`: casa · `cols`: colisores já criados com d */
export function addDoor(d, h) { d.openRot = Math.sign(d.openRot || 1) * 95 * Math.PI / 180; d.h = h; d.open = false; DOORS.push(d); return d; }

let pend = null;
/** Centro da porta (deslocado `off` m perpendicularmente ao plano dela) e lado em que o personagem está (portas em planos x ou z da casa) */
const cen = (d, off = 0) => d.ax === 'z' ? toW(d.h, d.f + off, d.c) : toW(d.h, d.c, d.f + off);
const sideOf = d => { const [lx, lz] = toL(d.h, P.x, P.z); return (d.ax === 'z' ? lx : lz) > d.f ? 1 : -1; };
const CLOSE_AFTER = 6;   // segundos abertas
const ANG_EPS = .02;
export function updateDoors(dt) {
  if (anim) {
    anim.t += dt;
    const [cx, cz] = cen(anim.d), yaw = Math.atan2(cx - P.x, cz - P.z), da = Math.atan2(Math.sin(yaw - P.g.rotation.y), Math.cos(yaw - P.g.rotation.y));
    P.g.rotation.y += da * Math.min(1, dt * 14);
    P.tx = P.x; P.tz = P.z;
    if (!anim.done && anim.t >= .35) { anim.done = true; toggleDoor(anim.d); }
    if (anim.t >= .85) {   // porta aberta: o personagem atravessa
      const a = anim; anim = null;
      if (a.d.open) { const sd = sideOf(a.d), [tx, tz] = a.final ? [a.final.x, a.final.z] : cen(a.d, -sd * 2.2); P.tgt = null; P.tx = tx; P.tz = tz; }
    }
  }
  DOORS.forEach(d => {   // fecham sozinhas depois de alguns segundos, se ninguém estiver no vão
    if (!d.open) { d.t = 0; return; }
    d.t = (d.t || 0) + dt;
    if (d.t > CLOSE_AFTER) { const [cx, cz] = cen(d); if (Math.hypot(P.x - cx, P.z - cz) > 1.6 * d.h.K) { d.open = false; refreshProps(); } }
  });
  DOORS.forEach(d => { const tg = (d.base || 0) + (d.open ? d.openRot : 0); d.p.rotation.y += (tg - d.p.rotation.y) * Math.min(1, dt * 8); if (Math.abs(tg - d.p.rotation.y) < ANG_EPS) d.p.rotation.y = tg; });
  if (!pend) return;
  const d = pend.d;
  const [cx, cz] = cen(d);
  if (Math.hypot(P.tx - cx, P.tz - cz) > 3) { pend = null; return; }   // clicou em outro lugar (o ponto de chegada pode ser ajustado pelo jogo)
  if (Math.hypot(P.x - cx, P.z - cz) < 1.9 || (Math.hypot(P.x - cx, P.z - cz) < 3.2 && Math.hypot(P.vx, P.vz) < .3)) { const fin = pend.final; pend = null; P.tx = P.x; P.tz = P.z; useDoor(d, fin); }
}

let anim = null;   // animação do braço esquerdo empurrando a porta
function useDoor(d, final) {
  if (anim) return;
  anim = { t: 0, d, done: false, final };
  P.tgt = null; P.tx = P.x; P.tz = P.z;
}
function toggleDoor(d) {
  if (d.room && !roomRented()) { log('🔒 Trancada. Alugue um quarto com a Madame Rum'); return; }
  d.open = !d.open; d.t = 0; if (d.pair) { d.pair.open = d.open; d.pair.t = 0; }
  refreshProps();
}
/** Chamar depois da animação normal: braço esquerdo estica, empurra a porta e volta */
export function applyDoorReach() {
  if (!anim) return;
  const e = Math.sin(Math.min(1, anim.t / .85) * Math.PI), g = P.g;
  g.armL.rotation.x = -1.3 * e; g.armL.fa.rotation.x = -.35 * e; g.up.rotation.x += .1 * e;
}

/** Abre (se estiver fechada e destrancada) a porta de id dado — ex.: para falar com a Madame Rum */
export function openDoorById(id) {
  const d = DOORS.find(q => q.id === id);
  if (d && !d.open && !(d.room && !roomRented())) { d.open = true; refreshProps(); }
}

const meshes = [];
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
/** Clique: o raio acertou uma porta? (só as do andar do personagem) */
export function doorClick(ray) {
  meshes.length = 0;
  DOORS.forEach(d => { if (d.lvl === (P.up ? 1 : 0) && visible(d.p)) d.p.children.forEach(m => { if (m.isMesh) { m.userData.door = d; meshes.push(m); } }); });
  const hit = ray.intersectObjects(meshes, false)[0];
  let d = hit && hit.object.userData.door;
  if (!d) {   // reserva: o raio passa perto do centro da porta (esfera de ~1,2 m)
    let best = 1.2;
    DOORS.forEach(q => { if (q.lvl !== (P.up ? 1 : 0) || !visible(q.p)) return; const [qx, qz] = cen(q); const c = new THREE.Vector3(qx, groundY(qx, qz) + (P.up ? P.fy : 0) + 1.1 * q.h.K, qz); const dd = ray.ray.distanceToPoint(c); if (dd < best) { best = dd; d = q; } });
  }
  if (!d) return false;
  const [cx, cz] = cen(d);
  if (Math.hypot(P.x - cx, P.z - cz) < 1.9) { P.tgt = null; useDoor(d); return true; }
  const side = sideOf(d), [ax, az] = cen(d, side * 1.5);
  P.tgt = null; P.tx = ax; P.tz = az; pend = { d, ax, az };
  return true;
}
/** Clique fora da casa estando dentro dela: vai até a porta de saída, abre e sai até o ponto clicado */
export function exitClick(x, z) {
  if (P.up || anim) return false;
  const inFoot = (h, px, pz) => { const [lx, lz] = toL(h, px, pz); return Math.abs(lx) < (h.fx || 5.3) && Math.abs(lz) < (h.fz || 4.2); };
  let best = null, bd = 1e9;
  DOORS.forEach(d => {
    if (d.room || d.lvl !== 0 || d.open || !inFoot(d.h, P.x, P.z) || inFoot(d.h, x, z)) return;
    const [cx, cz] = cen(d), dd = Math.hypot(cx - x, cz - z);
    if (dd < bd) { bd = dd; best = d; }
  });
  if (!best) return false;
  const d = best, [cx, cz] = cen(d);
  const side = sideOf(d), [ax, az] = cen(d, side * 1.5);
  if (Math.hypot(P.x - cx, P.z - cz) < 1.9) { P.tgt = null; useDoor(d, { x, z }); return true; }
  P.tgt = null; P.tx = ax; P.tz = az; pend = { d, ax, az, final: { x, z } };
  return true;
}
export const cancelDoor = () => { pend = null; };
