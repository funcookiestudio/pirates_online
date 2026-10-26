/* Vida selvagem e bichos de estimação do cenário:
   · Cervo  — manada pela floresta; pasta, fica em ALERTA quando o jogador se aproxima e FOGE (com saltos) se chegar perto. Não ataca nem é alvo.
   · Javali — HOSTIL: inimigo comum (enemies.js) que nasce em clareiras da floresta, longe da vila; investe ao ver o jogador.
   · Gato   — 1 na vila (laranja), 1 no Sítio das Aves (tuxedo) e 1 preto na casa da herbalista: passeiam, sentam, se lambem, espreguiçam e dormem à noite.
   Só os animais perto do jogador pensam e animam (os outros ficam ocultos e parados). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { P } from './player.js';
import { MOUNT } from '../systems/mount.js';
import { isl, VX, VZ, SEA, groundY, walkable, slideTo, onRoad } from '../world/terrain.js';
import { VILLAGE_R } from '../core/village-const.js';
import { reserved } from '../world/reserve.js';
import { POST_DATA } from '../data/posts.js';
import { CAVES } from '../world/terrain.js';
import { houseAt } from '../world/floors.js';
import { hourNow } from '../core/clock.js';
import { isNight } from '../world/daynight.js';
import { collide } from '../systems/steer.js';
import { spawn } from './enemies.js';
import { KIND } from '../data/enemies.js';
import { tierBonus, tierOf } from '../data/scaling.js';
import { SEED } from '../world/terrain.js';
import { makeAnimal, animate, hareAir } from './wildlife-anim.js';
import { N } from '../world/islandgen.js';
import { CAT_SPOTS } from './wild-spots.js';

const ACT = 70;                                   // m: só pensa/anima perto do jogador
const rnd = (a, b) => a + Math.random() * (b - a);
const turn = (a, b, k) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k); };
const DEER = [], CATS = [], HARES = [];
export const WILD = { deer: DEER, cats: CATS, hares: HARES };

/* ---------- onde ficam: clareiras dentro da floresta ---------- */
function forestSpots() {
  const CELL = 14, cnt = new Map(), { pines = [], palms = [] } = isl.veg || {};
  [...pines, ...palms].forEach(a => { const x = a[0] - VX, z = a[1] - VZ, k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); cnt.set(k, (cnt.get(k) || 0) + 1); });
  const out = [];
  cnt.forEach((n, k) => {
    if (n < 6) return;
    const [i, j] = k.split(',').map(Number);
    for (let tries = 0; tries < 6; tries++) {   // um ponto livre de árvores dentro da quadra
      const x = (i + Math.random()) * CELL, z = (j + Math.random()) * CELL;
      if (Math.hypot(x, z) < VILLAGE_R + 70 || reserved(x, z, 22) || onRoad(x, z, 7) || groundY(x, z) < SEA + 1.2) continue;
      if (POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 28) || CAVES.some(c => Math.hypot(c.x - x, c.z - z) < 28)) continue;
      if (![[2, 0], [-2, 0], [0, 2], [0, -2], [4, 0], [0, 4]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
      out.push({ x, z, n }); break;
    }
  });
  return out.sort(() => Math.random() - .5);
}
const far = (list, x, z, d) => list.every(q => Math.hypot(q.x - x, q.z - z) >= d);

/* ---------- movimento comum (desvia de árvores, pedras, casas e cercas) ---------- */
function stepTo(a, hd, sp, dt, avoid = true, snap = false) {
  // olha 1,6 m à frente e, se o caminho estiver fechado, tenta desviar para os lados
  let best = hd;
  if (avoid) for (const off of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4]) {
    const h2 = hd + off;
    if (walkable(a.x + Math.sin(h2) * 1.6, a.z + Math.cos(h2) * 1.6) && walkable(a.x + Math.sin(h2) * .8, a.z + Math.cos(h2) * .8)) { best = h2; break; }
    best = hd + 3;
  }
  a.hd = turn(a.hd, best, dt * a.tr * 12);
  a.v = snap ? sp * (a.gold ? 1.2 : 1) : a.v + (sp - a.v) * (1 - Math.exp(-dt * 6));   // snap: a velocidade segue o salto (lebre)
  const nx = a.x + Math.sin(a.hd) * a.v * dt, nz = a.z + Math.cos(a.hd) * a.v * dt;
  [a.x, a.z] = slideTo(a.x, a.z, nx, nz);
  const q = { x: a.x, z: a.z }; collide(q, a.rad); a.x = q.x; a.z = q.z;
  if (a.keepOut && houseAt(a.x, a.z, .6)) { a.x -= Math.sin(a.hd) * a.v * dt; a.z -= Math.cos(a.hd) * a.v * dt; a.v = 0; a.tm = 0; }
}
function place(a) {
  a.A.g.position.set(a.x, groundY(a.x, a.z), a.z);
  a.A.g.rotation.y = a.hd;
  // inclina o corpo conforme o declive sob o animal (frente x trás), suavizado
  const k = 1.2, dy = groundY(a.x + Math.sin(a.hd) * k, a.z + Math.cos(a.hd) * k) - groundY(a.x - Math.sin(a.hd) * k, a.z - Math.cos(a.hd) * k);
  a.sl = (a.sl || 0) + (-Math.atan2(dy, 2 * k) - (a.sl || 0)) * .15;
  a.A.g.rotation.x = a.sl;
}

/* ---------- cervo ---------- */
function makeDeer(x, z, herd) {
  const A = makeAnimal('deer'); scene.add(A.g);
  const a = { A, x, z, hx: x, hz: z, hd: rnd(0, 6.28), v: 0, st: 'graze', tm: rnd(2, 8), herd, tr: .5, rad: .5, fear: 0, tx: x, tz: z, bt: 0 };
  A.g.visible = false; place(a); DEER.push(a); return a;
}
const FLEE_R = 13, ALERT_R = 26, SAFE_R = 34;
function scare(a) { if (a.white && a.calm) return; if (a.st !== 'flee') { a.st = 'flee'; a.tm = rnd(5, 8); a.pron = 1.1; } }
function thinkDeer(a, dt, t) {
  const dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz), away = Math.atan2(-dx, -dz);
  const mounted = MOUNT.on ? 1.3 : 1;                         // a cavalo assustam de mais longe
  a.tm -= dt;
  if (a.white) a.calm = !MOUNT.on && Math.hypot(P.vx || 0, P.vz || 0) < 2.4;   // Cervo Branco: só tolera quem anda devagar
  if (d < (a.white ? (a.calm ? 2 : 11) : FLEE_R * mounted) && !P.dead) { DEER.forEach(o => { if (o.herd === a.herd && Math.hypot(o.x - a.x, o.z - a.z) < 30) scare(o); }); }
  let mode = 'idle', sp = 0;
  if (a.st === 'flee') {
    // foge para longe do jogador (com leve desvio para a mata), saltando no começo e correndo depois
    a.pron = Math.max(0, (a.pron || 0) - dt);
    stepTo(a, away + Math.sin(t * .7 + a.herd) * .35, a.pron > 0 ? 5.2 : 6.6, dt);
    mode = a.pron > 0 ? 'bound' : 'run'; sp = a.v;
    if ((a.tm <= 0 && d > SAFE_R) || d > SAFE_R + 20) { a.st = 'alert'; a.tm = rnd(3, 5); a.hx = a.x; a.hz = a.z; }
  } else if (a.st === 'alert') {
    a.v *= .9; a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 3);
    mode = 'alert'; if (a.tm <= 0 && d > ALERT_R) { a.st = 'graze'; a.tm = rnd(5, 10); }
  } else {
    if (d < ALERT_R && !P.dead && a.st !== 'walk') { a.st = 'alert'; a.tm = rnd(2.5, 4); mode = 'alert'; }
    else if (a.st === 'graze') { mode = 'graze'; a.v *= .9; if (a.tm <= 0) { a.st = Math.random() < .5 ? 'walk' : 'idle'; a.tm = a.st === 'walk' ? rnd(4, 9) : rnd(2, 4); const ang = rnd(0, 6.28), r = rnd(4, 16); a.tx = a.hx + Math.sin(ang) * r; a.tz = a.hz + Math.cos(ang) * r; } }
    else if (a.st === 'idle') { mode = 'idle'; a.v *= .9; if (a.tm <= 0) { a.st = 'graze'; a.tm = rnd(6, 14); } }
    else if (a.st === 'walk') {
      const wx = a.tx - a.x, wz = a.tz - a.z, wd = Math.hypot(wx, wz);
      if (wd < 1.2 || a.tm <= 0) { a.st = 'graze'; a.tm = rnd(6, 14); } else { stepTo(a, Math.atan2(wx, wz), 1.2, dt); mode = 'walk'; sp = a.v; }
    }
  }
  return [mode, sp];
}

/** Cervo Branco (missão): cria uma vez, numa manada distante, e devolve o bicho */
export function whiteDeer() {
  let w = DEER.find(a => a.white); if (w) return w;
  const hs = new Map(); DEER.forEach(a => { if (!hs.has(a.herd)) hs.set(a.herd, a); });
  const far = [...hs.values()].sort((a, b) => Math.hypot(b.hx, b.hz) - Math.hypot(a.hx, a.hz))[0];
  if (!far) return null;
  w = makeDeer(far.hx + 4, far.hz + 3, 99); w.white = true;
  w.A.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0xffffff), .85); } });
  return w;
}

/** Lebre Dourada (missão): cria uma vez, longe da vila, e devolve o bicho */
export function goldenHare() {
  let g = HARES.find(a => a.gold); if (g) return g;
  const far = [...HARES].sort((a, b) => Math.hypot(b.hx, b.hz) - Math.hypot(a.hx, a.hz))[0];
  if (!far) return null;
  g = makeHare(far.hx + 3, far.hz + 2); g.gold = true;
  g.A.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0xffd040), .8); } });
  return g;
}

/* ---------- gato ---------- */
function makeCat(x, z, variant, r) {
  const A = makeAnimal('cat', variant); scene.add(A.g);
  const a = { A, x, z, hx: x, hz: z, hd: rnd(0, 6.28), v: 0, st: 'sit', tm: rnd(2, 6), tr: .6, rad: .35, r: r || 5, keepOut: 1, tx: x, tz: z };
  A.g.visible = false; place(a); CATS.push(a); return a;
}
function thinkCat(a, dt, t) {
  const dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz), night = isNight(hourNow());
  a.tm -= dt;
  let mode = 'idle', sp = 0;
  // gato se esquiva de quem chega muito perto: trota para longe e depois volta a sentar
  if (a.pet) { a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 3); a.v *= .8; return ['pet', 0]; }   // sendo acariciado: fica sentado, olhos fechados
  const mv = Math.hypot(P.vx || 0, P.vz || 0) > .6 && !a.want;   // só foge de quem se aproxima correndo; parado ou clicando nele, o gato fica
  if (d < 1.6 && mv && !a.A.dog && !P.dead && a.st !== 'avoid' && (a.st !== 'sleep' || d < 1.1)) { a.st = 'avoid'; a.tm = rnd(1.2, 2); }
  if (a.st === 'avoid') {
    stepTo(a, Math.atan2(-dx, -dz) + Math.sin(t * 3) * .3, 3.6, dt); mode = 'run'; sp = a.v;
    if (a.tm <= 0) { a.st = 'sit'; a.tm = rnd(3, 6); }
  } else if (night) {
    // à noite volta para o canto de casa e dorme enrolado
    const wx = a.hx - a.x, wz = a.hz - a.z, wd = Math.hypot(wx, wz);
    if (wd > .6 && a.st !== 'sleep') { stepTo(a, Math.atan2(wx, wz), 1.3, dt); mode = 'walk'; sp = a.v; a.st = 'home'; } else { a.st = 'sleep'; a.v *= .8; mode = 'sleep'; }
  } else {
    if (a.st === 'sleep' || a.st === 'home') { a.st = 'stretch'; a.tm = 3.5; }   // acorda espreguiçando
    if (a.st === 'sit') { mode = 'sit'; a.v *= .8; if (a.tm <= 0) pickCat(a); }
    else if (a.st === 'groom') { mode = 'groom'; a.v *= .8; if (a.tm <= 0) pickCat(a); }
    else if (a.st === 'stretch') { mode = 'stretch'; a.v *= .8; if (a.tm <= 0) pickCat(a); }
    else if (a.st === 'idle') { mode = 'idle'; a.v *= .8; if (a.tm <= 0) pickCat(a); }
    else if (a.st === 'walk') {
      const wx = a.tx - a.x, wz = a.tz - a.z, wd = Math.hypot(wx, wz);
      if (wd < .5 || a.tm <= 0) { a.st = 'sit'; a.tm = rnd(4, 10); } else { stepTo(a, Math.atan2(wx, wz), 1.0, dt); mode = 'walk'; sp = a.v; }
    } else pickCat(a);
    // curioso: sentado, vira a cabeça (o corpo) para o jogador que passa a 3–8 m
    if (a.want) { if (a.st === 'walk' || a.st === 'groom' || a.st === 'stretch') { a.st = 'sit'; a.tm = 6; } a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 2); }
    if ((a.st === 'sit' || a.st === 'idle') && d < 8 && d > 2) a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 1.5);
  }
  return [mode, sp];
}
function pickCat(a) {
  const r = Math.random();
  if (r < .34) { a.st = 'walk'; a.tm = rnd(5, 9); const ang = rnd(0, 6.28), rr = rnd(1.5, a.r); a.tx = a.hx + Math.sin(ang) * rr; a.tz = a.hz + Math.cos(ang) * rr; if (houseAt(a.tx, a.tz, .6)) { a.tx = a.hx; a.tz = a.hz; } }
  else if (r < .62) { a.st = 'sit'; a.tm = rnd(5, 12); }
  else if (r < .84) { a.st = 'groom'; a.tm = rnd(4, 8); }
  else if (r < .94) { a.st = 'idle'; a.tm = rnd(3, 6); }
  else { a.st = 'stretch'; a.tm = rnd(3, 5); }
}


/* ---------- lebre ---------- */
/* Pasta e saltita em campo aberto; em pé (alerta) quando o jogador se aproxima; foge em ZIGUE-ZAGUE a grandes saltos se ele chegar perto. Não ataca nem é alvo.
   A velocidade acompanha a curva do salto (rápida no ar, quase parada no chão), sincronizada com a animação. */
function makeHare(x, z) {
  const A = makeAnimal('hare'); scene.add(A.g);
  const a = { A, x, z, hx: x, hz: z, hd: rnd(0, 6.28), v: 0, st: 'graze', tm: rnd(2, 8), tr: .9, rad: .25, tx: x, tz: z, zz: 1 };
  A.g.visible = false; place(a); HARES.push(a); return a;
}
const H_ALERT = 17, H_FLEE = 8.5, H_SAFE = 30;
const grounded = A => { const q = A.hp % 1; return q < .1 || q > .86; };   // só troca de estado com as patas no chão (sem "congelar" no ar)
function thinkHare(a, dt, t) {
  const A = a.A, dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz), away = Math.atan2(-dx, -dz), gr = grounded(A);
  const m = MOUNT.on ? 1.35 : 1;
  a.tm -= dt;
  const air = .12 + 1.75 * hareAir(A.hp);   // 0,12 no chão … ~1,9 no pico do salto
  if (a.gold && a.st === 'tired') {   // Lebre Dourada cansada: para, ofegante, e dá chance de alcançá-la
    a.v = 0; a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 2);
    if (a.tm <= 0) { a.st = 'flee'; a.tm = rnd(4, 6); a.zt = 0; a.run = 0; }
    return ['sit', 0];
  }
  if (a.st !== 'flee' && d < (a.gold ? 11 : H_FLEE) * m && !P.dead) { a.st = 'flee'; a.tm = rnd(4, 7); a.zz = Math.random() < .5 ? 1 : -1; a.zt = 0; a.stand = 0; }
  if (a.st === 'flee') {
    if (a.gold && gr && (a.run = (a.run || 0) + dt) > 4.5) { a.st = 'tired'; a.tm = 3.5; a.run = 0; return ['sit', 0]; }
    a.zt -= dt; if (a.zt <= 0) { a.zt = rnd(.35, .8); a.zz = -a.zz; }   // troca de lado a cada poucos saltos: zigue-zague
    stepTo(a, away + a.zz * .7, 7.2 * air, dt, true, true);
    if ((a.tm <= 0 && d > H_SAFE) || d > H_SAFE + 20) { if (gr) { a.st = 'alert'; a.tm = rnd(3, 5); a.hx = a.x; a.hz = a.z; } }
    return ['run', a.v];
  }
  if (a.st === 'alert') {
    a.v = 0; a.hd = turn(a.hd, Math.atan2(dx, dz), dt * 2.5);
    if (a.tm <= 0 && d > H_ALERT) { a.st = 'graze'; a.tm = rnd(5, 10); }
    return ['alert', 0];
  }
  if (d < H_ALERT * m && !P.dead && a.st !== 'hop') { a.st = 'alert'; a.tm = rnd(2.5, 4); return ['alert', 0]; }
  if (a.st === 'graze') { a.v *= .85; if (a.tm <= 0) pickHare(a); return ['graze', 0]; }
  if (a.st === 'idle') { a.v *= .85; if (a.tm <= 0) pickHare(a); return ['idle', 0]; }
  if (a.st === 'sit') { a.v *= .85; if (a.tm <= 0) pickHare(a); return ['sit', 0]; }
  // hop: saltita até o ponto escolhido (2–6 m), parando ao chegar
  const wx = a.tx - a.x, wz = a.tz - a.z, wd = Math.hypot(wx, wz);
  if ((wd < .5 || a.tm <= 0) && gr) { pickHare(a, true); return ['idle', 0]; }
  stepTo(a, Math.atan2(wx, wz) + Math.sin(t * 1.3 + A.t0) * .15, 2.3 * air, dt, true, true);
  return ['hop', a.v];
}
function pickHare(a, afterHop) {
  const r = Math.random();
  if (afterHop ? r < .45 : r < .38) { a.st = 'hop'; a.tm = rnd(3, 6); const ang = rnd(0, 6.28), rr = rnd(2.5, 7); a.tx = a.hx + Math.sin(ang) * rr; a.tz = a.hz + Math.cos(ang) * rr; if (!walkable(a.tx, a.tz)) { a.tx = a.hx; a.tz = a.hz; } }
  else if (r < .75) { a.st = 'graze'; a.tm = rnd(6, 14); }
  else if (r < .9) { a.st = 'sit'; a.tm = rnd(5, 10); }
  else { a.st = 'idle'; a.tm = rnd(2, 5); }
  if (a.st === 'hop' && Math.hypot(a.x - a.hx, a.z - a.hz) > 14) { a.tx = a.hx; a.tz = a.hz; }   // volta para perto do território
}
/** Pontos de campo aberto espalhados pela ilha para as lebres */
function meadowSpots(count) {
  const out = [], E = N / 2, cx = -VX, cz = -VZ;
  for (let tries = 0; tries < 6000 && out.length < count; tries++) {
    const x = cx + rnd(-E + 25, E - 25), z = cz + rnd(-E + 25, E - 25);
    if (Math.hypot(x, z) < VILLAGE_R + 20 || groundY(x, z) < SEA + 1.5 || reserved(x, z, 14) || onRoad(x, z, 5)) continue;
    if (POST_DATA.some(p => Math.hypot(p.x - x, p.z - z) < 26) || CAVES.some(c => Math.hypot(c.x - x, c.z - z) < 26)) continue;
    if (![[2, 0], [-2, 0], [0, 2], [0, -2], [4, 4], [-4, -4]].every(([dx, dz]) => walkable(x + dx, z + dz))) continue;
    if (!far(out, x, z, 40)) continue;
    out.push({ x, z });
  }
  return out;
}

/* ---------- criação ---------- */
/** Ponto livre mais próximo de (cx,cz): fora de casas, de móveis e de árvores */
function openNear(cx, cz) {
  for (let r = 0; r < 14; r += 1.2) for (let k = 0; k < 10; k++) {
    const ang = k / 10 * 6.28 + r, x = cx + Math.sin(ang) * r, z = cz + Math.cos(ang) * r;
    if (!walkable(x, z) || houseAt(x, z, 1.2) || props.some(p => Math.hypot(p.position.x - x, p.position.z - z) < p.r + .9)) continue;
    return [x, z];
  }
  return [cx, cz];
}

/** Gato mais perto do ponto (clique) */
export function catAt(x, z) {
  let b = null, bd = 1.3;
  CATS.forEach(a => { if (!a.A.g.visible) return; const d = Math.hypot(a.x - x, a.z - z); if (d < bd) { bd = d; b = a; } });
  return b;
}

export function buildWildlife() {
  // gatos: 1 na vila (laranja), os registrados pelos sítios/casas (aves: tuxedo · herbalista: preto)
  const [vx, vz] = openNear(5, 7);
  makeCat(vx, vz, 'laranja', 6);
  CAT_SPOTS.forEach(s => { const [x, z] = openNear(s.x, s.z); makeCat(x, z, s.v, s.r); });
  // cervos e javalis na floresta
  const spots = forestSpots(), used = [];
  const take = (min, test) => { for (let i = 0; i < spots.length; i++) { const s = spots[i]; if (far(used, s.x, s.z, min) && (!test || test(s))) { spots.splice(i, 1); used.push(s); return s; } } return null; };
  const bonus = tierBonus(tierOf(SEED));
  for (let h = 0; h < 9; h++) { const s = take(55); if (!s) break; const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) makeDeer(s.x + rnd(-3, 3), s.z + rnd(-3, 3), h); }
  meadowSpots(16).forEach(sp => { const n = Math.random() < .4 ? 2 : 1; for (let i = 0; i < n; i++) makeHare(sp.x + rnd(-2, 2), sp.z + rnd(-2, 2)); });   // lebres em campo aberto
  for (let b = 0; b < 10; b++) {
    const s = take(48); if (!s) break;
    const lv = Math.max(2, Math.min(8, 2 + Math.floor(Math.hypot(s.x, s.z) / 85))) + bonus, n = Math.random() < .4 ? 2 : 1;
    for (let i = 0; i < n; i++) spawn(KIND.JAVALI, s.x + i * 2.5, s.z + i * 1.5, undefined, { lv });
  }
}

let T0 = 0;
export function updateWildlife(dt) {
  T0 += dt;
  const run = (list, think) => list.forEach(a => {
    const d = Math.hypot(P.x - a.x, P.z - a.z), g = a.A.g;
    if (d > ACT) { g.visible = false; return; }
    g.visible = true;
    const d2 = Math.min(dt, .05), [mode, sp] = think(a, d2, T0 + a.A.t0);
    place(a);
    animate(a.A, d2, T0 + a.A.t0, mode, { spd: sp });
  });
  run(DEER, thinkDeer); run(CATS, thinkCat); run(HARES, thinkHare);
}
