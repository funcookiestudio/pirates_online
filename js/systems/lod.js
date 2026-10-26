/* LOD de personagens: NPCs e inimigos distantes viram UMA malha (pose congelada, cor por vértice) em vez de ~15 peças articuladas.
   Cada peça é uma chamada de desenho, e no celular (limitado pelo processador) isso era ~40% do custo da cena. Perto, tudo volta ao normal. */
import { P } from '../entities/player.js';
import { npcList } from '../entities/npc.js';
import { enemies } from '../core/registry.js';
import { FARM } from '../entities/farm.js';
import { houseAt, houseShell } from '../world/floors.js';
import { vcMat, colorsOf } from '../world/merge.js';

const FAR = 15.5 * 15.5, NEAR = 14 * 14, EVERY = .2;
let acc = 0;
const inv = new THREE.Matrix4(), mm = new THREE.Matrix4();

/** Funde as peças sólidas do personagem na pose atual (o que fica de fora — barras, rótulos, sombra — continua visível) */
function build(g) {
  g.updateWorldMatrix(true, true);
  inv.copy(g.matrixWorld).invert();
  const parts = [], pos = [], nor = [], col = [];
  const walk = o => {
    if (o.userData.lodProxy) return;
    if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && o.geometry.attributes.position && !Array.isArray(o.material)
      && (o.material.type === 'MeshLambertMaterial' || o.material.type === 'MeshStandardMaterial') && o.material.color && !o.material.transparent) {
      const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld));
      col.push(colorsOf(geo, o.material)); pos.push(geo.attributes.position.array); nor.push(geo.attributes.normal ? geo.attributes.normal.array : new Float32Array(geo.attributes.position.array.length));
      geo.dispose(); parts.push(o);
    }
    o.children.forEach(walk);
  };
  walk(g);
  if (parts.length < 4) return null;
  const cat = arrs => { const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0)); let k = 0; arrs.forEach(a => { out.set(a, k); k += a.length; }); return out; };
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3)); bg.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3)); bg.setAttribute('color', new THREE.BufferAttribute(cat(col), 3));
  bg.computeBoundingSphere();
  const m = new THREE.Mesh(bg, vcMat(0, THREE.FrontSide));
  m.userData.lodProxy = true; m.matrixAutoUpdate = true;
  return { m, parts };
}

function setFar(g, st) {
  const b = build(g);
  if (!b) { st.fail = true; return; }
  if (st.proxy) { g.remove(st.proxy); st.proxy.geometry.dispose(); }
  st.proxy = b.m; g.add(b.m);
  st.hidden = b.parts.map(o => [o, o.visible]);
  st.hidden.forEach(([o]) => { o.visible = false; });
  st.far = true;
}
function setNear(g, st) {
  (st.hidden || []).forEach(([o, v]) => { o.visible = v; });
  st.hidden = null; if (st.proxy) st.proxy.visible = false;
  st.far = false;
}

/* Muito longe: sai da cena (o three.js recalcula a matriz de TODO objeto da cena a cada quadro, visível ou não). A posição segue sendo atualizada pela IA. */
const SLEEP = 90 * 90, WAKE = 80 * 80;
function dormant(g) {
  const u = g.userData, dx = g.position.x - P.x, dz = g.position.z - P.z, d = dx * dx + dz * dz;
  if (u.lodOff) {
    if (d < WAKE) { u.lodOff.add(g); u.lodOff = null; } else return true;
  } else if (d > SLEEP && g.parent && g.parent.isScene) { u.lodOff = g.parent; g.parent.remove(g); return true; }
  return false;
}

function one(g, dead) {
  if (!g) return;
  if (dormant(g)) return;
  if (!g.visible || !g.parent) return;
  const st = g.userData.lod || (g.userData.lod = { far: false });
  if (st.fail) return;
  const dx = g.position.x - P.x, dz = g.position.z - P.z, d = dx * dx + dz * dz;
  if (!st.far && d > FAR && !dead) { setFar(g, st); if (st.far && st.proxy) st.proxy.visible = true; }
  else if (st.far && (d < NEAR || dead)) setNear(g, st);
}

/** NPCs e baús dentro de uma casa fechada (jogador fora) ficam ocultos; só o nome continua aparecendo (ver updateNpcs) */
export function hideInside() {
  for (let i = 0; i < npcList.length; i++) {
    const n = npcList[i], g = n.g, h = houseShell(g.position.x, g.position.z, n.fy > 1);
    n.inHid = !!h && !h.sc && h.shown === false;   // o castelo fica de fora da regra
    if (n.inHid) g.visible = false;
  }
}

export function updateLod(dt) {
  acc += dt; if (acc < EVERY) return; acc = 0;
  for (let i = 0; i < npcList.length; i++) one(npcList[i].g, false);
  for (let i = 0; i < enemies.length; i++) one(enemies[i].g, enemies[i].hp <= 0);
  for (let i = 0; i < FARM.length; i++) one(FARM[i].root, false);   // animais da fazenda (cada um tem ~35 peças)
}
