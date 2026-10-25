/* Mecânicas da dungeon (fase 4): porta trancada antes do chefe + chave com um guardião, e armadilhas de espinhos.
   Tudo opera sobre a grade ativa (DG.grid é a mesma matriz usada na colisão e no A*): porta fechada = parede; aberta = piso. */
import { enemies } from '../core/registry.js';
import { M as M0 } from '../core/utils.js';
import { xray } from '../world/xray.js';
import { P, hurtP } from '../entities/player.js';
import { spawn } from '../entities/enemies.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';
import { DG, dCell } from './dgrid.js';

const M = c => xray(M0(c));

/** Distâncias (passos, 4 direções) a partir da célula `s`; `block` = Set de células proibidas */
function bfs(grid, W, H, s, block) {
  const d = new Int32Array(W * H).fill(-1), q = [s];
  d[s] = 0;
  for (let n = 0; n < q.length; n++) {
    const c = q[n], x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !grid[k] || d[k] >= 0 || (block && block.has(k))) continue;
      d[k] = d[c] + 1; q.push(k);
    }
  }
  return d;
}

/**
 * ctx: { gen, g (grupo), W, H, ox, oz, C, WH, wx, wz, s0, e0, R (aleatório), D, spots, kinds, list }
 * Devolve o estado das mecânicas (ou com door = null quando o mapa não tem um gargalo adequado).
 */
export function buildGimmicks(ctx) {
  const { grid, g, W, H, C, WH, wx, wz, s0, e0, R, D, spots, kinds, list } = ctx;
  const gm = { door: null, key: null, hasKey: false, traps: [], warn: 0 };

  // ----- porta: gargalo no caminho até o chefe -----
  const d0 = bfs(grid, W, H, s0), path = [];
  for (let c = e0; c !== s0 && d0[c] > 0;) {
    path.push(c);
    const x = c % W, y = (c / W) | 0;
    c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (y + dy) * W + x + dx).find(k => grid[k] && d0[k] === d0[c] - 1);
    if (c === undefined) break;
  }
  path.reverse();   // do início ao chefe
  let found = null;
  for (let i = Math.floor(path.length * .85); i >= Math.floor(path.length * .35) && !found; i--) {
    const c = path[i], cx = c % W, cy = (c / W) | 0;
    for (const r of [0, 1, 2]) {
      const blk = new Set();
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x]) blk.add(y * W + x);
      if (blk.has(s0) || blk.has(e0)) break;
      const d = bfs(grid, W, H, s0, blk);
      if (d[e0] >= 0) continue;                       // dá a volta: não serve
      // lugar da chave: ponto de nascimento alcançável, o mais distante do início
      let best = null, bd = 12;
      spots.forEach(sp => { const k = dCellOf(sp.x, sp.z, ctx); if (d[k] > bd) { bd = d[k]; best = sp; } });
      if (best) { found = { blk, c, best }; }
      break;
    }
  }
  if (found) {
    const cells = [...found.blk].map(k => ({ k, x: wx(k % W), z: wz((k / W) | 0) }));
    const dg = new THREE.Group(), mat = M(0x6a4426), plate = new THREE.MeshBasicMaterial({ color: 0xffc040 });
    cells.forEach(c => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(C * .98, WH, C * .98), mat);
      m.position.set(c.x, WH / 2, c.z); dg.add(m); c.m = m;
      grid[c.k] = 0;                                   // fechada = parede
    });
    if (mat.emissive) mat.emissive.setHex(0x3a2210);   // visível mesmo no escuro
    const mid = cells.reduce((a, c) => ({ x: a.x + c.x / cells.length, z: a.z + c.z / cells.length }), { x: 0, z: 0 });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(.5, .6, .5), plate);
    lock.position.set(mid.x, 1.5, mid.z); dg.add(lock);
    g.add(dg);
    gm.door = { cells, mid, g: dg, lock, open: 0 };
    // guardião da chave: elite mais forte no ponto escolhido
    const sp = found.best, k = kinds[Math.floor(R() * kinds.length)];
    spawn(k, sp.x, sp.z, null, { lv: D.lv + 2, elite: true });
    const e = enemies[enemies.length - 1];
    e.dun = 1; e.keyGuard = 1; list.push(e);
    gm.guard = e;
    gm.keyAt = { x: sp.x, z: sp.z };
  }

  // ----- armadilhas de espinhos -----
  const n = Math.min(14, 5 + Math.round(D.lv / 6)), cand = [];
  for (let k = 0; k < W * H; k++) {
    if (!grid[k]) continue;
    const x = wx(k % W), z = wz((k / W) | 0);
    if (Math.hypot(x - wx(s0 % W), z - wz((s0 / W) | 0)) < 12 || Math.hypot(x - wx(e0 % W), z - wz((e0 / W) | 0)) < 8) continue;
    if (gm.door && Math.hypot(x - gm.door.mid.x, z - gm.door.mid.z) < 4) continue;
    cand.push({ x, z });
  }
  const ms = new THREE.MeshBasicMaterial({ color: 0xc0c8d0 }), mh = new THREE.MeshBasicMaterial({ color: 0x0a0606 }), mr = new THREE.MeshBasicMaterial({ color: 0x4a4650 });
  const cg = new THREE.ConeGeometry(.09, .7, 4), hg = new THREE.BoxGeometry(.2, .03, .2), rg = new THREE.BoxGeometry(.27, .02, .27);
  for (let i = 0; i < n && cand.length; i++) {
    const c = cand.splice(Math.floor(R() * cand.length), 1)[0];
    if (traps(gm).some(t => Math.hypot(t.x - c.x, t.z - c.z) < 5)) { i--; if (cand.length < 5) break; continue; }
    // armadilha escondida: igual ao piso. Só ao ser pisada mostra os furos e sobem os espinhos
    const t = new THREE.Group(), holes = new THREE.Group(), sp = new THREE.Group();
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const rim = new THREE.Mesh(rg, mr); rim.position.set(a * .42, .006, b * .42); holes.add(rim);
      const h = new THREE.Mesh(hg, mh); h.position.set(a * .42, .012, b * .42); holes.add(h);
      const q = new THREE.Mesh(cg, ms); q.position.set(a * .42, .35, b * .42); sp.add(q);
    }
    holes.visible = false; sp.scale.y = .01; sp.visible = false; t.add(holes, sp);
    t.position.set(c.x, 0, c.z); g.add(t);
    gm.traps.push({ x: c.x, z: c.z, t, sp, holes, st: 0, tm: 0, cool: 0, hit: false });
  }
  return gm;
}
const traps = gm => gm.traps;
const dCellOf = (x, z, ctx) => Math.floor((z - ctx.oz) / ctx.C) * ctx.W + Math.floor((x - ctx.ox) / ctx.C);

/** Armadilha: escondida → (pisou) furos aparecem → espinhos sobem (dano) → recolhem; os furos ficam à mostra */
const ARM = .45, UP = .9, DOWN = .35;

export function updateGimmicks(gm, dt, t, D) {
  gm.traps.forEach(tr => {
    const d = Math.hypot(P.x - tr.x, P.z - tr.z);
    tr.cool = Math.max(0, tr.cool - dt);
    if (tr.st === 0) {
      if (d < .8 && tr.cool <= 0 && !P.dead) { tr.st = 1; tr.tm = 0; tr.holes.visible = true; puff(tr.x, .1, tr.z, 0x8a8478, 2, 3); }
    } else {
      tr.tm += dt;
      if (tr.st === 1) { if (tr.tm >= ARM) { tr.st = 2; tr.tm = 0; tr.sp.visible = true; tr.hit = false; } }
      else if (tr.st === 2) {
        tr.sp.scale.y = Math.min(1, .15 + tr.tm / .12);
        if (!tr.hit && Math.hypot(P.x - tr.x, P.z - tr.z) < 1.05) {
          tr.hit = true;
          hurtP(Math.round(P.max * .06 + D.lv * 2), 0, 0);
          puff(P.x, .4, P.z, 0xc0c8d0, 3, 5);
        }
        if (tr.tm >= UP) { tr.st = 3; tr.tm = 0; }
      } else if (tr.st === 3) {
        tr.sp.scale.y = Math.max(.01, 1 - tr.tm / DOWN);
        if (tr.tm >= DOWN) { tr.st = 0; tr.sp.visible = false; tr.cool = 1.2; }
      }
    }
  });

  // chave: aparece onde o guardião morreu
  if (gm.guard && gm.guard.dead && !gm.keyObj && !gm.hasKey) {
    const k = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.18, .06, 5, 8), new THREE.MeshBasicMaterial({ color: 0xffd040 }));
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(.08, .5, .08), new THREE.MeshBasicMaterial({ color: 0xffd040 }));
    shaft.position.y = -.35; ring.position.y = .02; k.add(ring, shaft);
    k.position.set(gm.guard.x, 1, gm.guard.z);
    gm.door.g.parent.add(k);
    gm.keyObj = k;
    log('🗝 O guardião caiu e deixou uma chave!');
  }
  if (gm.keyObj) {
    gm.keyObj.rotation.y = t * 2; gm.keyObj.position.y = 1 + Math.sin(t * 3) * .12;
    if (Math.hypot(P.x - gm.keyObj.position.x, P.z - gm.keyObj.position.z) < 1.6) {
      gm.hasKey = true;
      gm.keyObj.parent.remove(gm.keyObj); gm.keyObj = null;
      log('🗝 Chave pega! Leve-a até a porta trancada');
    }
  }

  // porta
  const d = gm.door;
  if (!d) return;
  gm.warn = Math.max(0, gm.warn - dt);
  if (!d.open) {
    if (d.cells.some(c => Math.hypot(P.x - c.x, P.z - c.z) < 3.2)) {   // perto de qualquer lajota da porta
      if (gm.hasKey) {
        d.open = .01;
        d.cells.forEach(c => { DG.grid[c.k] = 1; });
        puff(d.mid.x, 1.4, d.mid.z, 0xffd040, 3, 8);
        log('🔓 A porta se abriu! O chefe está além');
      } else if (gm.warn <= 0) {
        gm.warn = 4;
        log(gm.guard && !gm.guard.dead ? '🔒 Porta trancada — derrote o guardião elite para pegar a chave' : '🔒 Porta trancada — pegue a chave');
      }
    }
  } else if (d.open < 1) {
    d.open = Math.min(1, d.open + dt * 1.2);
    d.cells.forEach(c => { c.m.scale.y = Math.max(.01, 1 - d.open); c.m.position.y = (1 - d.open) * c.m.geometry.parameters.height / 2; });
    d.lock.visible = false;
    if (d.open >= 1) d.g.visible = false;
  }
}

/** Marcadores do minimapa: porta (vermelho), chave caída (amarelo); só onde o jogador já esteve */
export function gimmickMarks(gm, seen) {
  const out = [];
  if (gm.door && !gm.door.open && seen[dCell(gm.door.mid.x, gm.door.mid.z)]) out.push({ x: gm.door.mid.x, z: gm.door.mid.z, c: '#ff5040' });
  if (gm.keyObj && seen[dCell(gm.keyObj.position.x, gm.keyObj.position.z)]) out.push({ x: gm.keyObj.position.x, z: gm.keyObj.position.z, c: '#ffe060' });
  return out;
}

/** Objetivo das mecânicas para o auto combate: a chave caída ou, com a chave na mão, a porta ainda fechada */
export function gimmickGoal(gm) {
  if (!gm) return null;
  if (gm.keyObj) return { x: gm.keyObj.position.x, z: gm.keyObj.position.z };
  if (gm.hasKey && gm.door && !gm.door.open) {
    // célula da porta mais próxima do centro, de onde o jogador consegue chegar
    return { x: gm.door.mid.x, z: gm.door.mid.z, door: true };
  }
  return null;
}
