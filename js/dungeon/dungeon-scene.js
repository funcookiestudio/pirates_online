/* Cena da dungeon: constrói a grade gerada (célula = 2 m) longe da ilha, move o jogador para dentro,
   povoa com inimigos/chefe/baús e cuida da saída (portal). Mesmo mundo, outro lugar: terreno e A* consultam dgrid.js. */
import { scene, torch, cam } from '../core/engine.js';
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
import { addItem, refreshTorch } from '../systems/inventory.js';
import { levelUp } from '../entities/player.js';
import { WEAPONS } from '../data/weapons.js';
import { hash } from './dungeongen.js';
import { emit } from '../core/events.js';
import { buildGimmicks, updateGimmicks, gimmickMarks } from './dungeon-gimmicks.js';

const C = 2, WH = 3.6, OX = 3000, OZ = 3000;
const LOOK = {   // piso (xadrez de 2 tons), parede, topo da parede, detalhe e cor da névoa de cada tema
  cripta:  { floor: 0x4a4658, floor2: 0x3e3a4c, wall: 0x6e6882, cap: 0x8a84a0, deco: 0x8a8a96, glow: 0xff9030, bg: 0x0a0812 },
  ruinas:  { floor: 0x5c5440, floor2: 0x4c4636, wall: 0x7c7458, cap: 0xa09870, deco: 0x6a7a48, glow: 0xffb040, bg: 0x0c0c0a },
  caverna: { floor: 0x4a3e34, floor2: 0x3c322a, wall: 0x6a5846, cap: 0x8a7458, deco: 0x7a6a58, glow: 0x60c0ff, bg: 0x0a0806 },
};
const MOBS = { cripta: [KIND.SKELETON, KIND.GUERREIRO, KIND.GHOST, KIND.SOMBRA], ruinas: [KIND.GRUMETE, KIND.SKELETON, KIND.CORSARIO, KIND.GUERREIRO], caverna: [KIND.CONTRA, KIND.GRUMETE, KIND.BRUTO, KIND.CORSARIO] };
const M = c => xray(M0(c));

let cur = null;          // { D, g(group), chests[], portals[], boss, saved }
export const inDungeon = () => !!cur;
/** Marcadores do minimapa: portais e baús que o jogador já viu */
export const dungeonMarks = () => !cur ? [] : [
  ...cur.portals.filter(p => p.g.visible && DG.seen[dCell(p.x, p.z)]).map(p => ({ x: p.x, z: p.z, c: p.on && p.armed && p.g === cur.portals[1].g ? '#40e0a0' : '#a070ff' })),
  ...(cur.gm ? gimmickMarks(cur.gm, DG.seen) : []),
  ...cur.chests.filter(c => !c.open && DG.seen[dCell(c.x, c.z)]).map(c => ({ x: c.x, z: c.z, c: '#ffd040' })),
];
export const currentDungeon = () => cur && cur.D;
export const dungeonGimmicks = () => cur && cur.gm;

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
  const { W, H } = gen, grid = gen.grid.slice(), look = LOOK[D.theme], R = rngSeed(D.seed);
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
  mkInst(new THREE.BoxGeometry(C * .97, .3, C * .97), M(look.floor), fl.filter(([i, j]) => (i + j) % 2 === 0), -.15, 1);
  mkInst(new THREE.BoxGeometry(C * .97, .3, C * .97), M(look.floor2), fl.filter(([i, j]) => (i + j) % 2 === 1), -.15, 1);
  mkInst(new THREE.BoxGeometry(C, .3, C), M(0x0a0a0c), fl, -.32, 0);   // junta escura entre as lajotas
  const wallIm = mkInst(new THREE.BoxGeometry(C, WH, C), M(look.wall), wl, WH / 2, 1.2);
  const capIm = mkInst(new THREE.BoxGeometry(C * 1.04, .22, C * 1.04), M(look.cap), wl, WH + .1, .6);
  const wallH = new Float32Array(wl.length).fill(WH), wallTorch = [];   // altura atual de cada parede (rebaixa as que ficam entre a câmera e o jogador)
  [wallIm, capIm].forEach(im => { im.frustumCulled = false; });   // beiral claro: dá volume às paredes

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

  // decoração: entulho, ossos/ervas e colunas em salões; estalagmites na caverna; tochas de parede com chama
  const decoMat = M(look.deco), flame = new THREE.MeshBasicMaterial({ color: look.glow });
  fl.forEach(([i, j]) => {
    const k = R();
    if (k > .055) return;
    const x = wx(i) + (R() - .5) * 1.1, z = wz(j) + (R() - .5) * 1.1;
    if (D.theme === 'caverna') {
      const h = .5 + R() * 1.1, m = new THREE.Mesh(new THREE.ConeGeometry(.2 + R() * .2, h, 5), decoMat);
      m.position.set(x, h / 2, z); g.add(m);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.2 + R() * .35, .12 + R() * .2, .2 + R() * .35), decoMat);
      m.position.set(x, .08, z); m.rotation.y = R() * 3; g.add(m);
    }
  });
  gen.rooms.forEach(r => {
    if (!r.big) return;
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const cx = r.cx + a, cy = r.cy + b; if (!grid[cy * W + cx]) continue;
      grid[cy * W + cx] = 0;   // a coluna é sólida
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, WH, 7), M(look.cap)); c.position.set(wx(cx), WH / 2, wz(cy)); g.add(c);
    }
  });
  let tn = 0;
  wl.forEach(([i, j], wn) => {   // tocha de parede em parede que dá para um piso, espaçadas
    if ((i * 7 + j * 13) % 11 !== 0 || tn > 60) return;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + dx, y = j + dz;
      if (x < 0 || y < 0 || x >= W || y >= H || !grid[y * W + x]) continue;
      const f = new THREE.Mesh(new THREE.ConeGeometry(.2, .55, 5), flame); f.position.set(wx(i) + dx * (C / 2 + .02), 2, wz(j) + dz * (C / 2 + .02)); g.add(f);
      const br = new THREE.Mesh(new THREE.BoxGeometry(.14, .5, .14), post); br.position.set(f.position.x, 1.55, f.position.z); g.add(br);
      wallTorch.push({ f, br, wn });
      tn++; break;
    }
  });

  // pontos de nascimento: centros de sala (ou células espaçadas, na caverna), longe do início
  const [sx, sz] = cellXZ(gen.s0), [ex, ez] = cellXZ(gen.e0);
  const spots = [];
  if (gen.rooms.length) gen.rooms.forEach(r => { if (!r.start && !r.end && grid[r.cy * W + r.cx]) spots.push({ x: wx(r.cx), z: wz(r.cy), big: r.big, w: r.w, h: r.h }); });
  else for (let k = 0; k < W * H; k += 37) if (grid[k]) { const [x, z] = cellXZ(k); if (Math.hypot(x - sx, z - sz) > 16 && Math.hypot(x - ex, z - ez) > 12) spots.push({ x, z, w: 5, h: 5 }); }
  const kinds = MOBS[D.theme], list = [];
  spots.forEach(s => {
    const n = (s.big ? 4 : 2) + (R() < .5 ? 1 : 0) + (D.lv >= 20 ? 1 : 0) + (D.lv >= 40 ? 1 : 0);   // mais inimigos em dungeons de nível alto
    for (let q = 0; q < n; q++) {
      const a = R() * 6.28, d = R() * Math.min(s.w, s.h) * .6 * C / 2 * 1.2;
      let x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      if (!grid[Math.floor((z - oz) / C) * W + Math.floor((x - ox) / C)]) { x = s.x; z = s.z; }
      const k = kinds[Math.floor(R() * kinds.length)], elite = R() < .12 + Math.min(.12, D.lv * .003);
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

  // porta trancada + chave (guardião elite) e armadilhas
  const gm = buildGimmicks({ gen, grid, g, W, H, ox, oz, C, WH, wx, wz, s0: gen.s0, e0: gen.e0, R, D, spots, kinds, list });

  // portal de entrada/saída no início
  const pIn = portal(sx, sz, 0xa070ff); g.add(pIn);
  const pOut = portal(ex, ez + 4, 0x40e0a0); pOut.visible = false; g.add(pOut);
  scene.add(g);

  cur = {
    D, g, chests, boss, list, gm, wl, wallIm, capIm, wallH, wallTorch,
    portals: [{ g: pIn, x: sx, z: sz, on: true, armed: false }, { g: pOut, x: ex, z: ez + 4, on: false, armed: true }],
    saved: { bg: scene.background, fog: scene.fog, hemi: null, torch: torch.intensity },
  };
  const hemi = scene.children.find(o => o.isHemisphereLight);
  if (hemi) { cur.saved.hemi = hemi.intensity; hemi.intensity = .5; }
  scene.background = new THREE.Color(look.bg);
  scene.fog = new THREE.Fog(look.bg, 16, 44);
  refreshTorch();

  setAuto(false);
  // jogador perto do portal, olhando para dentro
  let px = sx, pz = sz;
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) { if (grid[Math.floor((sz + dz - oz) / C) * W + Math.floor((sx + dx - ox) / C)]) { px = sx + dx; pz = sz + dz; break; } }
  P.x = P.tx = px; P.z = P.tz = pz; P.vx = P.vz = 0; P.tgt = null; P.sit = P.sitT = 0;
  state.dunRet = { x: D.fx, z: D.fz };
  state.dunNow = D; emit('dungeon:enter');
  log('🕳 ' + D.name + ' · Nv ' + D.lv + ' — ' + (cur.gm.door ? 'ache a chave, abra a porta e derrote o chefe' : 'derrote o chefe e saia pelo portal') + ' · cuidado com os espinhos');
}

export function leaveDungeon(msg) {
  if (!cur) return;
  state.dunNow = cur.D; emit('dungeon:leave');
  const { D, g, saved } = cur;
  scene.remove(g);
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dun) { scene.remove(enemies[i].g); enemies.splice(i, 1); }
  for (let i = loot.length - 1; i >= 0; i--) if (loot[i].m.position.x > 2000) { scene.remove(loot[i].m); loot.splice(i, 1); }
  scene.background = saved.bg; scene.fog = saved.fog;
  const hemi = scene.children.find(o => o.isHemisphereLight); if (hemi && saved.hemi != null) hemi.intensity = saved.hemi;
  setDun(null);
  cur = null;
  refreshTorch();
  P.x = P.tx = D.fx; P.z = P.tz = D.fz; P.vx = P.vz = 0; P.tgt = null;
  if (msg) log(msg);
}

/** Arma fixa da recompensa de 1ª vitória desta dungeon (sempre a mesma para a mesma semente; só entre as que o nível permite) */
export function rewardOf(D) {
  const pool = [];
  WEAPONS.forEach((w, i) => { if (w.lv && !w.torch && w.lv >= D.lv * .5 && w.lv <= D.lv + 4 && (!w.rare || D.lv >= 22)) pool.push(i); });
  if (!pool.length) return null;
  return { wi: pool[hash(D.seed + ':r') % pool.length], q: D.lv >= 10 ? 3 : 2 };
}

/** Primeira vez que derrota o chefe desta dungeon: ouro, XP e uma tocha mágica */
function firstClear(D) {
  if (state.dunDone[D.seed]) return;
  state.dunDone[D.seed] = 1;
  const gold = goldAt(D.lv) * 10, xp = Math.round(xpToNext(P.lv) * .35);
  P.gold += gold; P.xp += xp; levelUp();
  addItem({ ty: 'wpn', q: 2, wi: 7, il: D.lv });
  const r = rewardOf(D);
  if (r) addItem({ ty: 'wpn', q: r.q, wi: r.wi, il: D.lv });
  log('🏆 Dungeon concluída! +' + gold + ' ouro · +' + xp + ' XP · Tocha mágica' + (r ? ' · ' + WEAPONS[r.wi].n : ''));
}

/** Por frame: abre baús, acende o portal do chefe, sai pelos portais */
export function updateDungeon(dt, now) {
  if (!cur || P.dead) return;
  const t = now / 1000;
  dSee(P.x, P.z, 7);
  cur.portals.forEach(p => { if (p.g.visible) { p.g.children[0].rotation.z = t; p.g.children[0].scale.setScalar(1 + Math.sin(t * 3) * .04); } });
  if (!cur.portals[1].g.visible && cur.boss.dead) { cur.portals[1].g.visible = true; cur.portals[1].on = true; log('✨ Chefe derrotado! O portal de saída se abriu'); state.dunNow = cur.D; emit('dungeon:clear'); firstClear(cur.D); }
  cur.portals.forEach(p => {
    if (!p.on) return;
    const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d > 3.2) p.armed = true;
    else if (d < 1.2 && p.armed) leaveDungeon(cur.boss.dead ? '🏴 Você saiu da dungeon com o saque' : 'Você saiu da dungeon');
  });
  if (!cur) return;
  updateGimmicks(cur.gm, dt, t, cur.D);
  lowerWalls(dt);
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

/** Rebaixa as paredes que ficam entre a câmera e o jogador (como nas casas), para ver o personagem nos corredores */
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
const STUB = .5;
function lowerWalls(dt) {
  const { wl, wallIm, capIm, wallH, wallTorch } = cur;
  let cx = cam.position.x - P.x, cz = cam.position.z - P.z;
  const cl = Math.hypot(cx, cz) || 1; cx /= cl; cz /= cl;
  const k = Math.min(1, dt * 10);
  let ch = false;
  for (let n = 0; n < wl.length; n++) {
    const x = DG.ox + (wl[n][0] + .5) * C, z = DG.oz + (wl[n][1] + .5) * C, rx = x - P.x, rz = z - P.z, d = Math.hypot(rx, rz);
    if (d > 16) continue;
    const dot = rx * cx + rz * cz;
    const goal = d < 11 && dot > 1.2 && dot / d > .3 ? STUB : WH;
    const h = wallH[n];
    if (Math.abs(h - goal) < .01) continue;
    const nh = Math.abs(goal - h) < .05 ? goal : h + (goal - h) * k;
    wallH[n] = nh; ch = true;
    _s.set(1, nh / WH, 1); _p.set(x, nh / 2, z); _m.compose(_p, _q.identity(), _s); wallIm.setMatrixAt(n, _m);
    _s.set(1, 1, 1); _p.set(x, nh + .1, z); _m.compose(_p, _q, _s); capIm.setMatrixAt(n, _m);
  }
  if (ch) { wallIm.instanceMatrix.needsUpdate = true; capIm.instanceMatrix.needsUpdate = true; wallTorch.forEach(w => { w.f.visible = w.br.visible = wallH[w.wn] > WH - .3; }); }
}

/** Objetivo da dungeon como missão (painel "Missão"): null fora da dungeon */
export function dungeonQuest() {
  if (!cur) return null;
  const { D, boss, gm, list } = cur, left = list.filter(e => !e.dead).length;
  const head = '🕳 ' + D.name + ' — ';
  if (boss.dead) return head + '🌀 Missão cumprida! Use o portal de saída para voltar à vila';
  if (gm && gm.keyObj) return head + '🗝 Pegue a chave que o guardião deixou';
  if (gm && gm.door && !gm.door.open) return head + (gm.hasKey ? '🚪 Abra a porta trancada' : '🗝 Derrote o guardião e pegue a chave') + ' · ☠ depois, o chefe';
  return head + '☠ Derrote o chefe (' + left + ' inimigos restantes)';
}

/** Chefe morto: ponto do portal de saída (o auto vai até ele) */
export function dungeonExit() {
  if (!cur || !cur.boss.dead) return null;
  const p = cur.portals[1];
  return { x: p.x, z: p.z };
}
