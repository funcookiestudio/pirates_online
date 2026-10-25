/* Portas: começam fechadas (bloqueiam a passagem); clique para abrir/fechar.
   As dos quartos (andar de cima da taberna) ficam trancadas até alugar um quarto com a Madame Rum. */
import { groundY } from './terrain.js';
import { props } from '../core/registry.js';
import { P } from '../entities/player.js';
import { CLOCK } from '../core/clock.js';
import { log } from '../ui/notify.js';
import { refreshProps, houseAt } from './floors.js';
import { bakeGroup } from './merge.js';
import { snapCell, inCell } from './imap.js';

export const DOORS = [];
export const ROOM_PRICE = 40;
const RENT = { on: false, next: 0 };
/** Quartos que já têm dono: nunca abrem para o jogador */
export const ROOM_OWNERS = { 'room-0': 'Madame Rum', 'room-f3': 'Mestre Breu', 'room-3.4': 'Pé-de-Pau Polly' };
export const roomRented = () => RENT.on;
/** Persistência do aluguel: horas restantes (ou null) */
export const getRent = () => RENT.on ? { left: +Math.max(0, RENT.next - CLOCK.total).toFixed(2) } : null;
export const setRent = r => { if (r && Number.isFinite(r.left)) { RENT.on = true; RENT.next = CLOCK.total + r.left; } };
/** Horas de jogo até a próxima cobrança da diária */
export const rentDue = () => Math.max(0, RENT.next - CLOCK.total);
const rentable = d => !d.room || (RENT.on && !ROOM_OWNERS[d.id]);
/** Aluga um quarto: cobra a primeira diária (feita por quem chama) e destranca; as próximas saem sozinhas a cada 24 h */
export function rentRoom() { RENT.on = true; RENT.next = CLOCK.total + 24; }
/** Devolve a chave: tranca de novo os quartos e fecha as portas abertas */
export function cancelRent() {
  RENT.on = false;
  DOORS.forEach(d => { if (d.room && d.open) { d.open = false; d.t = 0; } });
  refreshProps();
}
/** A cada quadro: passada cada diária, cobra de novo; sem ouro, a chave volta para a Madame Rum */
export function tickRent() {
  if (!RENT.on || CLOCK.total < RENT.next) return;
  if (P.gold >= ROOM_PRICE) { P.gold -= ROOM_PRICE; RENT.next += 24; log('🛏 Diária do quarto cobrada: -' + ROOM_PRICE + ' ouro'); }
  else { cancelRent(); log('🔑 Sem ouro para a diária: a Madame Rum retomou a chave do quarto'); }
}

const toW = (h, lx, lz) => [h.x + lx * h.K * Math.cos(h.th) + lz * h.K * Math.sin(h.th), h.z - lx * h.K * Math.sin(h.th) + lz * h.K * Math.cos(h.th)];
const toL = (h, x, z) => { const dx = x - h.x, dz = z - h.z; return [(dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K]; };

/** Registra uma porta. `d`: { p (folha), openRot, c (centro), f (plano z do vão), w, lvl, room, id } · `h`: casa · `cols`: colisores já criados com d */
export function addDoor(d, h) { if (d.p && !d.p.userData.dyn) bakeGroup(d.p);   // a folha da porta vira poucas malhas (menos chamadas de desenho); o pivô continua girando
  d.openRot = Math.sign(d.openRot || 1) * 95 * Math.PI / 180; d.h = h; d.open = false; DOORS.push(d); return d; }

let pend = null;
/** Centro da porta (deslocado `off` m perpendicularmente ao plano dela) e lado em que o personagem está (portas em planos x ou z da casa) */
const cen = (d, off = 0) => d.ax === 'z' ? toW(d.h, d.f + off, d.c) : toW(d.h, d.c, d.f + off);
/** Centro do tile de acionamento (azul) de um lado da porta: ponto de alinhamento para passar pelo vão sem raspar em parede/batente */
const tileAt = (d, side) => snapCell(d.h, ...cen(d, side * 1.1));
let thru = null;   // passagem em andamento: depois do tile do outro lado segue ao ponto final
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
      if (a.d.open) startPass(a.d, a.final);
    }
  }
  DOORS.forEach(d => {   // fecham sozinhas depois de alguns segundos, se ninguém estiver no vão
    if (!d.open) { d.t = 0; return; }
    d.t = (d.t || 0) + dt;
    if (d.hold > 0) { d.hold -= dt; d.t = 0; }
    if (d.t > CLOSE_AFTER) { const [cx, cz] = cen(d); if (Math.hypot(P.x - cx, P.z - cz) > 1.6 * d.h.K) { d.open = false; refreshProps(); } }
  });
  DOORS.forEach(d => { const tg = (d.base || 0) + (d.open ? d.openRot : 0); d.p.rotation.y += (tg - d.p.rotation.y) * Math.min(1, dt * 8); if (Math.abs(tg - d.p.rotation.y) < ANG_EPS) d.p.rotation.y = tg; });
  if (thru) {
    if (Math.hypot(P.tx - thru.x, P.tz - thru.z) > 1.5) thru = null;           // clicou em outro lugar
    else if (Math.hypot(P.x - thru.x, P.z - thru.z) < .45 || Math.hypot(P.vx, P.vz) < .05 && Math.hypot(P.x - thru.x, P.z - thru.z) < 1.2) { P.tx = thru.fx; P.tz = thru.fz; thru = null; }
  }
  if (!pend) return;
  const d = pend.d;
  const [cx, cz] = cen(d);
  if (Math.hypot(P.tx - cx, P.tz - cz) > 3) { pend = null; return; }   // clicou em outro lugar (o ponto de chegada pode ser ajustado pelo jogo)
  const at = Math.hypot(P.x - pend.ax, P.z - pend.az);
  if (at < .5 || (at < 1.6 && Math.hypot(P.vx, P.vz) < .3) || (Math.hypot(P.x - cx, P.z - cz) < 3.2 && Math.hypot(P.vx, P.vz) < .05)) { const fin = pend.final; pend = null; if (d.open && !d.room) startPass(d, fin); else { P.tx = P.x; P.tz = P.z; useDoor(d, fin); } }
}

/** Porta aberta: atravessa pelo eixo do vão — 1º o tile do outro lado (alinhado), depois o destino */
function startPass(d, final) {
  const sd = sideOf(d), [tx, tz] = final ? [final.x, final.z] : cen(d, -sd * (d.room ? 1.1 : 2.2)), [wx, wz] = tileAt(d, -sd);
  P.tgt = null; P.tx = wx; P.tz = wz; thru = { x: wx, z: wz, fx: tx, fz: tz };
}
let anim = null;   // animação do braço esquerdo empurrando a porta
function useDoor(d, final) {
  if (anim) return;
  anim = { t: 0, d, done: false, final };
  P.tgt = null; P.tx = P.x; P.tz = P.z;
}
/** Regra de tranca de portas externas (definida por npc.js): devolve o nome de quem dorme lá dentro, ou null */
let lockRule = null;
export const setDoorLock = fn => { lockRule = fn; };
function toggleDoor(d) {
  if (!d.open && !d.room && lockRule) { const who = lockRule(d); if (who) { log('🔒 ' + who + ' está dormindo — a porta está trancada até de manhã'); return; } }
  if (d.room && ROOM_OWNERS[d.id]) { log('🔒 Quarto de ' + ROOM_OWNERS[d.id] + ': trancado'); return; }
  if (d.room && !roomRented() && sideOf(d) !== (d.f < 0 ? -1 : 1)) { log('🔒 Trancada. Alugue um quarto com a Madame Rum'); return; }
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
/** Ponto do mundo diante da porta (id), `out` unidades locais para fora, e a direção para fora [fx, fz] */
export function doorFront(id, out = 1.2) {
  const d = DOORS.find(q => q.id === id); if (!d) return null;
  const h = d.h, f = [Math.sin(h.th), Math.cos(h.th)];
  return { p: toW(h, d.c, d.f + out), f };
}
/** A porta existe, está fechada e pode ser aberta? */
export function doorClosed(id) { const d = DOORS.find(q => q.id === id); return !!d && !d.open && rentable(d); }
/** NPC abre uma porta (também as de quartos com dono) e a mantém aberta enquanto passa */
export function npcOpenDoor(id, hold = 9) {
  const d = DOORS.find(q => q.id === id); if (!d) return false;
  d.hold = hold; if (!d.open) { d.open = true; d.t = 0; refreshProps(); }
  return true;
}
export const doorIsOpen = id => { const d = DOORS.find(q => q.id === id); return !!d && d.open; };
export function openDoorById(id) {
  const d = DOORS.find(q => q.id === id);
  if (d && !d.open && rentable(d)) { d.open = true; refreshProps(); }
}

const meshes = [];
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
/** Clique: o raio acertou uma porta? (só as do andar do personagem) */
export function doorClick(ray) {
  meshes.length = 0;
  DOORS.forEach(d => { if (d.lvl === (P.up ? 1 : 0) && !(d.room && d.open) && visible(d.p)) d.p.children.forEach(m => { if (m.isMesh) { m.userData.door = d; meshes.push(m); } }); });
  const hit = ray.intersectObjects(meshes, false)[0];
  let d = hit && hit.object.userData.door;
  if (!d) {   // reserva: o raio passa perto do centro da porta (esfera de ~1,2 m)
    let best = 1.2;
    DOORS.forEach(q => { if (q.lvl !== (P.up ? 1 : 0) || (q.room && q.open) || !visible(q.p)) return; const [qx, qz] = cen(q); const c = new THREE.Vector3(qx, groundY(qx, qz) + (P.up ? P.fy : 0) + 1.1 * q.h.K, qz); const dd = ray.ray.distanceToPoint(c); if (dd < best) { best = dd; d = q; } });
  }
  if (!d) return false;
  return approach(d);
}
/** Vai até a porta (ou usa direto, se já estiver perto) */
function approach(d) {
  const [cx, cz] = cen(d);
  const side = sideOf(d), [ax, az] = tileAt(d, side);
  if (Math.hypot(P.x - ax, P.z - az) < .5) { P.tgt = null; useDoor(d); return true; }
  P.tgt = null; P.tx = ax; P.tz = az; pend = { d, ax, az };
  return true;
}
const doorOK = d => d.lvl === (P.up ? 1 : 0) && !(d.room && d.open) && visible(d.p);
/** Tiles de acionamento (azuis): um de cada lado do vão, a 1,1 m dele. Devolve [{ d, x, z }] das portas do andar do personagem */
export function doorTiles() {
  const out = [];
  DOORS.forEach(d => { if (!doorOK(d)) return; [1.1, -1.1].forEach(o => { const [x, z] = snapCell(d.h, ...cen(d, o)); out.push({ d, x, z }); }); });
  return out;
}
/** Clique num tile de acionamento: abre/fecha a porta (indo até ela se preciso) */
export function doorTileClick(x, z) {
  if (anim) return false;
  const t = doorTiles().find(q => inCell(q.d.h, [q.x, q.z], x, z));
  return t ? approach(t.d) : false;
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
  const side = sideOf(d), [ax, az] = tileAt(d, side);
  if (Math.hypot(P.x - ax, P.z - az) < .5) { P.tgt = null; useDoor(d, { x, z }); return true; }
  P.tgt = null; P.tx = ax; P.tz = az; pend = { d, ax, az, final: { x, z } };
  return true;
}
/** Clique em ponto do outro lado de uma porta de quarto fechada (entrar ou sair do quarto): vai à porta, abre e segue até o ponto */
export function roomClick(x, z) {
  if (anim) return false;
  let best = null, bd = 1e9;
  DOORS.forEach(d => {
    if (!d.room || d.lvl !== (P.up ? 1 : 0) || d.open || ROOM_OWNERS[d.id]) return;
    const [tl, tu] = (q => d.ax === 'z' ? [q[0], q[1]] : [q[1], q[0]])(toL(d.h, x, z)), [pl, pu] = (q => d.ax === 'z' ? [q[0], q[1]] : [q[1], q[0]])(toL(d.h, P.x, P.z));
    const ts = tl > d.f ? 1 : -1, ps = pl > d.f ? 1 : -1;
    if (ts === ps || Math.abs(tl - d.f) > 5 || Math.abs(pl - d.f) > 5) return;
    const rs = d.f < 0 ? -1 : 1, ru = ts === rs ? tu : pu;   // o ponto que está do lado do quarto precisa estar na largura do quarto (não vale o resto do andar)
    if (Math.abs(ru - d.c) > 1.9) return;
    if (!roomRented() && ps !== (d.f < 0 ? -1 : 1)) return;
    const dd = Math.abs(tu - d.c) + Math.abs(pu - d.c);
    if (dd < bd) { bd = dd; best = d; }
  });
  if (!best) return false;
  const d = best, [cx, cz] = cen(d), side = sideOf(d), [ax, az] = tileAt(d, side);
  if (Math.hypot(P.x - ax, P.z - az) < .5) { P.tgt = null; useDoor(d, { x, z }); return true; }
  P.tgt = null; P.tx = ax; P.tz = az; pend = { d, ax, az, final: { x, z } };
  return true;
}
/** Destino dentro de uma casa e o personagem fora dela: vai ao tile de fora da porta, abre, passa alinhado e segue até o ponto (em vez de tentar o caminho reto pela parede) */
export function enterClick(x, z) {
  if (P.up || anim) return false;
  const h = houseAt(x, z, .2); if (!h || houseAt(P.x, P.z, .2) === h) return false;
  let best = null, bd = 1e9;
  DOORS.forEach(d => { if (d.h.x !== h.x || d.h.z !== h.z || d.room || d.lvl !== 0) return; const [cx, cz] = cen(d), dd = Math.hypot(cx - P.x, cz - P.z) + (String(d.id).includes('front') ? 0 : 60);   // porta da frente de preferência (a dos fundos pode dar num quintal sem caminho)
    if (dd < bd) { bd = dd; best = d; } });
  if (!best) return false;
  const d = best, out = (q => q && q.x === h.x && q.z === h.z)(houseAt(...tileAt(d, 1), .2)) ? -1 : 1, [ax, az] = tileAt(d, out);
  P.tgt = null; pend = { d, ax, az, final: { x, z } };
  if (Math.hypot(P.x - ax, P.z - az) < .5) { pend = null; if (d.open) startPass(d, { x, z }); else useDoor(d, { x, z }); return true; }
  P.tx = ax; P.tz = az;
  return true;
}
export const cancelDoor = () => { pend = null; thru = null; };
export const doorDbg = () => ({ pend: pend && { id: pend.d.id, ax: pend.ax, az: pend.az }, thru, anim: !!anim });
