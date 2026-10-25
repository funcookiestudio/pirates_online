/* Jogador deitando, dormindo e levantando da cama (clique na cama). Qualquer outro clique acorda. */
import { P } from '../entities/player.js';
import { eq } from './inventory.js';
import { groundY } from '../world/terrain.js';
import { BED } from '../world/beds.js';
import { lieDown, standFromBed, makeZzz, SLEEP } from '../entities/sleep.js';

const DUR = 2.2;            // s para deitar / levantar
let zz = null, t = 0, from = null;
const ss = x => x * x * (3 - 2 * x);

export const sleeping = () => !!P.bed || (P.bedK || 0) > 0;

/** Chamado a cada quadro antes do movimento: inicia o deitar ao chegar perto da cama */
export function updateBedPending() {
  const b = BED.pend;
  if (!b || P.bed) return;
  if (Math.hypot(P.x - b.ax, P.z - b.az) < .55) {
    BED.pend = null; P.bed = b; P.bedK = P.bedK || 0; P.tgt = null; P.vx = P.vz = 0;
    from = { x: P.x, z: P.z, y: groundY(P.x, P.z) + (P.fy || 0), ry: P.g.rotation.y };
    P.models && Object.values(P.models).forEach(m => { if (m) m.visible = false; });   // arma guardada enquanto dorme
    if (P.torchM) P.torchM.visible = false;
  }
}

export function wakeUp() { BED.pend = null; P.bed = null; }

/** Anima deitar → dormir → levantar. Retorna true enquanto o corpo está sob controle da cama */
export function animateBed(dt) {
  if (P.bed && P.bed.ok && !P.bed.ok()) P.bed = null;   // aluguel acabou/cancelado: acorda
  const b = P.bed;
  const target = b ? 1 : 0, k0 = P.bedK || 0;
  P.bedK = k0 + Math.sign(target - k0) * Math.min(Math.abs(target - k0), dt / DUR);
  const k = P.bedK; t += dt;
  const g = P.g;
  P.vx = P.vz = 0; P.walk = 0;
  const deep = !!b && k > .95;
  SLEEP.fast = deep ? 12 : 1;                                   // o tempo passa mais rápido
  if (deep) { P.hp = Math.min(P.max, P.hp + P.max * .12 * dt); P.mp = Math.min(P.mmax, P.mp + P.mmax * .12 * dt); }   // dormir recupera vida e mana
  if (!zz) zz = makeZzz();
  if (k <= 0 && !b) { standFromBed(g); zz.update(0, 0, 0, t, false); P.models && Object.keys(P.models).forEach(n => { if (P.models[n]) P.models[n].visible = !!eq[n]; }); return false; }
  const bd = b || P.lastBed;
  P.lastBed = bd;
  lieDown(g, k, t);
  // deslocamento: do ponto onde estava até os pés sobre o colchão; ao levantar, volta ao ponto de acesso
  const e = ss(k), sx = b ? from.x : bd.ax, sz = b ? from.z : bd.az;
  const px = sx + (bd.x - sx) * e, pz = sz + (bd.z - sz) * e;
  const gy = groundY(px, pz) + (P.fy || 0), y = gy + (bd.y - gy) * e + Math.sin(Math.PI * e) * .25;
  g.position.set(px, y, pz);
  P.x = P.tx = px; P.z = P.tz = pz;
  let dy = bd.ry - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 6);
  P.ay = g.rotation.y;
  zz.update(px - Math.sin(bd.ry) * 1.7, y + .55, pz - Math.cos(bd.ry) * 1.7, t, k > .95);
  if (!b && k <= 0.001) { P.x = P.tx = bd.ax; P.z = P.tz = bd.az; }
  return true;
}
