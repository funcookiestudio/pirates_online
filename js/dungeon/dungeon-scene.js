/* Cena da dungeon: constrói a grade gerada (célula = 2 m) longe da ilha, move o jogador para dentro,
   povoa com inimigos/chefe/baús e cuida da saída (portal). Mesmo mundo, outro lugar: terreno e A* consultam dgrid.js. */
import { scene, torch } from '../core/engine.js';
import { enemies, loot } from '../core/registry.js';
import { M as M0 } from '../core/utils.js';
import { xray } from '../world/xray.js';
import { P } from '../entities/player.js';
import { state } from '../core/state.js';
import { spawn } from '../entities/enemies.js';
import { KIND } from '../data/enemies.js';
import { dropLoot } from '../entities/loot.js';
import { setAuto } from '../systems/stamina.js';
import { log } from '../ui/notify.js';
import { setDun, dSee, DG, dCell } from './dgrid.js';
import { goldAt, xpToNext } from '../data/scaling.js';
import { addItem } from '../systems/inventory.js';
import { levelUp } from '../entities/player.js';

const C = 2, WH = 3.6, OX = 3000, OZ = 3000;
const LOOK = {
  cripta:  { floor: 0x3c3844, wall: 0x5e5868, bg: 0x07060a },
  ruinas:  { floor: 0x484436, wall: 0x6c6652, bg: 0x08080a },
  caverna: { floor: 0x38322c, wall: 0x56493c, bg: 0x070605 },
};
const MOBS = { cripta: [KIND.SKELETON, KIND.GUERREIRO, KIND.GHOST, KIND.SOMBRA], ruinas: [KIND.GRUMETE, KIND.SKELETON, KIND.CORSARIO, KIND.GUERREIRO], caverna: [KIND.CONTRA, KIND.GRUMETE, KIND.BRUTO, KIND.CORSARIO] };
const M = c => xray(M0(c));

let cur = null;          // { D, g(group), chests[], portals[], boss, saved }
export const inDungeon = () => !!cur;
/** Marcadores do minimapa: portais e baús que o jogador já viu */
export const dungeonMarks = () => !cur ? [] : [
  ...cur.portals.filter(p => p.g.visible && DG.seen[dCell(p.x, p.z)]).map(p => ({ x: p.x, z: p.z, c: p.on && p.armed && p.g === cur.portals[1].g ? '#40e0a0' : '#a070ff' })),
  ...cur.chests.filter(c => !c.open && DG.seen[dCell(c.x, c.z)]).map(c => ({ x: c.x, z: c.z, c: '#ffd040' })),
];
export const currentDungeon = () => cur && cur.D;

const rngSeed = s => { let a = 0; for (const c of s) a = (a * 31 + c.charCodeAt(0)) | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

function portal(x, z, col) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .14, 6, 16), new THREE.MeshBasicMaterial({ color: col }));
  ring.position.y = 1.4; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .35, side: THREE.DoubleSide }));
  disc.position.y = 1.4; g.add(disc);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, .15, 10), M(0x2a2630)); base.position.y = .07; g.add(base);
  g.position.set(x, 0, z);
  return g;
}

function chestMesh(x, z, gold) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, .6, .7), M(gold ? 0x8a6a20 : 0x5a3a1a)); b.position.y = .3; g.add(b);
  const l = new THREE.Mesh(new THREE.BoxGeometry(1.15, .25, .75), M(gold ? 0xb08a28 : 0x6a4422)); l.position.y = .72; g.add(l);
  const k = new THREE.Mesh(new THREE.BoxGeometry(.15, .2, .08), new THREE.MeshBasicMaterial({ color: 0xffd040 })); k.position.set(0, .55, .38); g.add(k);
  g.position.set(x, 0, z);
  g.userData.lid = l;
  return g;
}

export function enterDungeon(D, gen) {
  if (cur) return;
  const { W, H, grid } = gen, look = LOOK[D.theme], R = rngSeed(D.seed);
  const ox = OX - W * C / 2, oz = OZ - H * C / 2;
  setDun({ ox, oz, C, W, H, grid });
  const wx = i => ox + (i + .5) * C, wz = j => oz + (j + .5) * C;
  const cellXZ = k => [wx(k % W), wz((k / W) | 0)];
  const g = new THREE.Group();

  // piso e paredes em instâncias (parede só onde encosta no piso)
  const fl = [], wl = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (grid[j * W + i]) { fl.push([i, j]); continue; }
    let near = false;
    for (let b = -1; b <= 1 && !near; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x]) { near = true; break; } }
    if (near) wl.push([i, j]);
  }
  const mkInst = (geo, mat, list, y, tint) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), c = new THREE.Color();
    list.forEach(([i, j], n) => {
      m.makeTranslation(wx(i), y, wz(j)); im.setMatrixAt(n, m);
      c.setScalar(.82 + R() * .3 * tint); im.setColorAt(n, c);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    g.add(im); return im;
  };
  mkInst(new THREE.BoxGeometry(C, .3, C), M(look.floor), fl, -.15, 1);
  mkInst(new THREE.BoxGeometry(C, WH, C), M(look.wall), wl, WH / 2, 1.2);

  // salas: brasas nos cantos para dar vida à penumbra
  const ember = new THREE.MeshBasicMaterial({ color: 0xff9030 }), post = M(0x2a2420);
  gen.rooms.forEach(r => {
    if (r.w < 4 || r.h < 4) return;
    for (const [cx, cy] of [[r.x, r.y], [r.x + r.w - 1, r.y + r.h - 1]]) {
      if (!grid[cy * W + cx]) continue;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, 1.1, 6), post); p.position.set(wx(cx), .55, wz(cy)); g.add(p);
      const f = new THREE.Mesh(new THREE.ConeGeometry(.22, .5, 5), ember); f.position.set(wx(cx), 1.4, wz(cy)); g.add(f);
    }
  });

  // pontos de nascimento: centros de sala (ou células espaçadas, na caverna), longe do início
  const [sx, sz] = cellXZ(gen.s0), [ex, ez] = cellXZ(gen.e0);
  const spots = [];
  if (gen.rooms.length) gen.rooms.forEach(r => { if (!r.start && !r.end && grid[r.cy * W + r.cx]) spots.push({ x: wx(r.cx), z: wz(r.cy), big: r.big, w: r.w, h: r.h }); });
  else for (let k = 0; k < W * H; k += 37) if (grid[k]) { const [x, z] = cellXZ(k); if (Math.hypot(x - sx, z - sz) > 16 && Math.hypot(x - ex, z - ez) > 12) spots.push({ x, z, w: 5, h: 5 }); }
  const kinds = MOBS[D.theme], list = [];
  spots.forEach(s => {
    const n = (s.big ? 4 : 2) + (R() < .5 ? 1 : 0);
    for (let q = 0; q < n; q++) {
      const a = R() * 6.28, d = R() * Math.min(s.w, s.h) * .6 * C / 2 * 1.2;
      let x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      if (!grid[Math.floor((z - oz) / C) * W + Math.floor((x - ox) / C)]) { x = s.x; z = s.z; }
      const k = kinds[Math.floor(R() * kinds.length)], elite = R() < .12;
      spawn(k, x, z, null, { lv: D.lv + (R() < .35 ? 1 : 0), elite });
      enemies[enemies.length - 1].dun = 1; list.push(enemies[enemies.length - 1]);
    }
  });
  // chefe no fim do caminho
  spawn(KIND.BOSS, ex, ez, null, { lv: D.lv + 4 });
  const boss = enemies[enemies.length - 1]; boss.dun = 1;
  boss.ag = true;

  // baús: um por beco com tesouro e o do chefe
  const chests = [];
  const addChest = (x, z, boss) => { const c = chestMesh(x, z, boss); g.add(c); chests.push({ g: c, x, z, boss, open: 0 }); };
  gen.nooks.forEach(n => addChest(wx(n.x), wz(n.y), false));
  addChest(ex + 3 * (R() < .5 ? 1 : -1), ez, true);

  // portal de entrada/saída no início
  const pIn = portal(sx, sz, 0xa070ff); g.add(pIn);
  const pOut = portal(ex, ez + 4, 0x40e0a0); pOut.visible = false; g.add(pOut);
  scene.add(g);

  cur = {
    D, g, chests, boss, list,
    portals: [{ g: pIn, x: sx, z: sz, on: true, armed: false }, { g: pOut, x: ex, z: ez + 4, on: false, armed: true }],
    saved: { bg: scene.background, fog: scene.fog, hemi: null, torch: torch.intensity },
  };
  const hemi = scene.children.find(o => o.isHemisphereLight);
  if (hemi) { cur.saved.hemi = hemi.intensity; hemi.intensity = .32; }
  scene.background = new THREE.Color(look.bg);
  scene.fog = new THREE.Fog(look.bg, 12, 34);
  torch.intensity = 1.8;

  setAuto(false);
  // jogador perto do portal, olhando para dentro
  let px = sx, pz = sz;
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) { if (grid[Math.floor((sz + dz - oz) / C) * W + Math.floor((sx + dx - ox) / C)]) { px = sx + dx; pz = sz + dz; break; } }
  P.x = P.tx = px; P.z = P.tz = pz; P.vx = P.vz = 0; P.tgt = null; P.sit = P.sitT = 0;
  state.dunRet = { x: D.fx, z: D.fz };
  log('🕳 ' + D.name + ' · Nv ' + D.lv + ' — derrote o chefe e saia pelo portal');
}

export function leaveDungeon(msg) {
  if (!cur) return;
  const { D, g, saved } = cur;
  scene.remove(g);
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dun) { scene.remove(enemies[i].g); enemies.splice(i, 1); }
  for (let i = loot.length - 1; i >= 0; i--) if (loot[i].m.position.x > 2000) { scene.remove(loot[i].m); loot.splice(i, 1); }
  scene.background = saved.bg; scene.fog = saved.fog; torch.intensity = saved.torch;
  const hemi = scene.children.find(o => o.isHemisphereLight); if (hemi && saved.hemi != null) hemi.intensity = saved.hemi;
  setDun(null);
  cur = null;
  P.x = P.tx = D.fx; P.z = P.tz = D.fz; P.vx = P.vz = 0; P.tgt = null;
  if (msg) log(msg);
}

/** Primeira vez que derrota o chefe desta dungeon: ouro, XP e uma tocha mágica */
function firstClear(D) {
  if (state.dunDone[D.seed]) return;
  state.dunDone[D.seed] = 1;
  const gold = goldAt(D.lv) * 10, xp = Math.round(xpToNext(P.lv) * .35);
  P.gold += gold; P.xp += xp; levelUp();
  addItem({ ty: 'wpn', q: 2, wi: 7, il: D.lv });
  log('🏆 Dungeon concluída! +' + gold + ' ouro · +' + xp + ' XP · Tocha mágica');
}

/** Por frame: abre baús, acende o portal do chefe, sai pelos portais */
export function updateDungeon(dt, now) {
  if (!cur || P.dead) return;
  const t = now / 1000;
  dSee(P.x, P.z, 7);
  cur.portals.forEach(p => { if (p.g.visible) { p.g.children[0].rotation.z = t; p.g.children[0].scale.setScalar(1 + Math.sin(t * 3) * .04); } });
  if (!cur.portals[1].g.visible && cur.boss.dead) { cur.portals[1].g.visible = true; cur.portals[1].on = true; log('✨ Chefe derrotado! O portal de saída se abriu'); firstClear(cur.D); }
  cur.portals.forEach(p => {
    if (!p.on) return;
    const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d > 3.2) p.armed = true;
    else if (d < 1.2 && p.armed) leaveDungeon(cur.boss.dead ? '🏴 Você saiu da dungeon com o saque' : 'Você saiu da dungeon');
  });
  if (!cur) return;
  cur.chests.forEach(c => {
    if (c.open) { c.open = Math.min(1, c.open + dt * 2); c.g.userData.lid.rotation.x = -c.open * 1.1; return; }
    if (Math.hypot(P.x - c.x, P.z - c.z) < 1.8) {
      c.open = .01;
      const D = cur.D, f = { x: c.x, z: c.z + 1.2, lv: D.lv + (c.boss ? 2 : 0), t: { boss: c.boss ? 1 : 0 }, elite: true };
      dropLoot(f);
      if (c.boss) dropLoot(f);
      log(c.boss ? '👑 Baú do chefe aberto!' : '💰 Baú aberto!');
    }
  });
}
