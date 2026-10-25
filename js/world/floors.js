/* Andares: altura extra do chão do personagem dentro de casas com escada (taberna).
   Colisões com `lvl` (0 = térreo, 1 = andar de cima) só valem no andar em que o personagem está. */
import { props } from '../core/registry.js';
import { P } from '../entities/player.js';
import { cam } from '../core/engine.js';
import { invalidateGrid } from '../systems/steer.js';
import { openDoorById } from './doors.js';
import { invalidateInterior } from './interior-nav.js';
import { bakeGroup } from './merge.js';
import { snapCell, inCell } from './imap.js';
import { DOORS } from './doors.js';

export const HOUSES = [];
export function registerFloors(h) { HOUSES.push(h); splitInterior(h); }

/** Separa o mobiliário/piso do térreo (peças estáticas dentro da planta) num grupo `h.inner`, fundido em poucas malhas.
    Fica oculto por fora: só aparece com o personagem dentro ou com uma porta externa aberta (menos desenho, e ninguém espia pela janela). */
function splitInterior(h) {
  const root = h.roof && h.roof.parent; if (!root || h.noInner) return;
  root.updateWorldMatrix(true, true);
  const base = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld).y, top = base + (h.Hf !== undefined ? h.Hf : 3.03 * h.K) - .1;
  const hx = (h.hx || 4.2) * h.K - .5, hz = (h.hz || 3.2) * h.K - .5, c = Math.cos(h.th), sn = Math.sin(h.th), v = new THREE.Vector3(), pick = [];
  const walk = o => {
    if (o.userData && o.userData.dyn) return;
    if (o.isMesh && o.geometry.attributes.position && !Array.isArray(o.material) && !o.isSkinnedMesh) {
      v.setFromMatrixPosition(o.matrixWorld);
      const dx = v.x - h.x, dz = v.z - h.z, u = dx * c - dz * sn, w = dx * sn + dz * c;
      if (Math.abs(u) < hx && Math.abs(w) < hz && v.y < top) pick.push(o);
    }
    o.children.slice().forEach(walk);
  };
  walk(root);
  if (!pick.length) return;
  const inner = new THREE.Group(); root.add(inner);
  pick.forEach(m => inner.attach(m));
  bakeGroup(inner);
  h.inner = inner;
}

/** O ponto está dentro (ou junto) de uma casa? Lá dentro o corpo é mais fino e o caminho usa uma grade fina */
export function houseAt(x, z, pad = .6) {
  for (const h of HOUSES) {
    const dx = x - h.x, dz = z - h.z;
    if (dx * dx + dz * dz > 400) continue;
    const lx = (dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, lz = (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K;
    if (Math.abs(lx) <= (h.hx || 4.2) + pad && Math.abs(lz) <= (h.hz || 3.2) + pad) return h;
  }
  return null;
}
export const houseNear = (x, z, pad = .6) => !!houseAt(x, z, pad);

/** Liga as colisões do andar atual e desliga as do outro (as desligadas vão para longe) */
export function refreshProps() {
  props.forEach(p => {
    if (p.lvl === undefined && !p.dr) return;
    if (p.hx === undefined) { p.hx = p.position.x; p.hz = p.position.z; }
    const on = (p.lvl === undefined || p.lvl === (P.up ? 1 : 0)) && !(p.dr && p.dr.open);
    p.position.x = on ? p.hx : 1e5; p.position.z = on ? p.hz : 1e5;
  });
  invalidateGrid(); invalidateInterior();
}
export const setLevel = () => refreshProps();

/** Altura extra (m) do chão sob (x,z): 0 fora das casas; sobe pela escada e fica no andar de cima */
let MID = false;   // o personagem está nos degraus (entre os andares)
export const onStairMid = () => MID;
/** Tiles de acionamento da escada (pé e topo), em coordenadas do mundo. Castelo e casas sem escada: null */
export function stairTiles(h) {
  if (h.noStair || h.sc || h.hf) return null;
  const f = q => snapCell(h, ...toW(h, ...q));   /* alinhado à grade: o tile é uma célula só */
  return { down: f([-4.3, 2.5]), up: f([-4.3, -1.75]) };
}
/** Castelo: tiles de acionamento das duas escadas (s = -1 esquerda, 1 direita): pé (salão) e topo (patamar) */
export function castleStairTiles(h) {
  if (!h.sc) return null;
  const f = q => snapCell(h, ...toW(h, ...q));
  return [-1, 1].map(s => ({ s, down: f([s * 3.9, 9.7]), up: f([s * 5.9, -.5]) }));
}
export function floorOffset(x, z) {
  for (const h of HOUSES) {
    if (h.noStair) continue;
    const dx = x - h.x, dz = z - h.z;
    const lx = (dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, lz = (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K;
    if (Math.abs(lx) > (h.fx || 5.3) || Math.abs(lz) > (h.fz || 4.1)) continue;
    if (h.hf) return h.hf(lx, lz, b => { P.up = b; setLevel(b); });   // casas com piso próprio (castelo: palco e escadas)
    const H = h.Hf !== undefined ? h.Hf : 3.03 * h.K;
    const stair = lx >= -5.1 && lx <= -3.6 && lz >= -1.75 && lz <= 1.85;
    if (stair) {
      const pr = Math.max(0, Math.min(1, (1.85 - lz) / 3));
      const half = pr >= .5;   // até a metade da escada vale o andar de baixo; da metade para cima, o de cima
      if (half !== !!P.up) { P.up = half; setLevel(half); }
      MID = pr > .02 && pr < .98;
      return H * pr;
    }
    MID = false;
    return P.up ? H : 0;
  }
  MID = false;
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
      const hit = castleStairTiles(h).find(t => inCell(h, P.up ? t.up : t.down, x, z));   // só o tile de ativação (1 célula) sobe/desce
      if (!hit) continue;
      const r = h.sc(P.up ? hit.s * 5.9 : hit.s * 3.9, P.up ? -.5 : 9.7);
      if (!r) continue;
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, ...r.A), i: 0, pts: r.pts.map(q => toW(h, ...q)) });
      P.tgt = null; P.tx = STAIR.A[0]; P.tz = STAIR.A[1];
      return true;
    }
    if (lx < -5.6) continue;
    const stt = stairTiles(h);
    if (!P.up && stt && inCell(h, stt.down, x, z)) {
      Object.assign(STAIR, { on: true, run: false, h, A: toW(h, -4.3, 2.5), i: 0, pts: [[-4.3, 1.75], [-4.3, .05], [-4.3, -1.3], [-4.3, -1.75]].map(q => toW(h, ...q)) });
    } else if (P.up && stt && inCell(h, stt.up, x, z)) {   // só a abertura da escada (antes era um círculo de 2,8 m que engolia o piso do andar)
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
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), STUB = .42;
/** Cor dominante (por área) das peças do grupo: a "cor da parede" */
function wallColor(g) {
  const hist = new Map(), c = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  g.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position || Array.isArray(o.material)) return;
    const pos = o.geometry.attributes.position, col = o.geometry.attributes.color, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    const vi = i => idx ? idx.getX(i) : i;
    for (let i = 0; i + 2 < n; i += 3) {
      const i0 = vi(i), i1 = vi(i + 1), i2 = vi(i + 2);
      a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1).sub(a); d.fromBufferAttribute(pos, i2).sub(a);
      const area = b.cross(d).length() * .5;
      if (col) c.setRGB(col.getX(i0), col.getY(i0), col.getZ(i0)); else c.copy(o.material.color);
      const key = c.getHex(), lum = .3 * c.r + .59 * c.g + .11 * c.b; hist.set(key, (hist.get(key) || 0) + area * (lum > .3 ? 1 : .15));   // argamassa e vigas escuras pesam menos
    }
  });
  let best = 0xcdbf9e, bw = -1; hist.forEach((v, k) => { if (v > bw) { bw = v; best = k; } });
  return best;
}
/** Cria (uma vez) a "bordinha" da parede: faixa baixa de reboco com friso de madeira em cima, do tamanho da parede (no quadro do pai) */
function buildStub(w, h) {
  const g = w.g, par = g.parent, mn = new THREE.Vector3(1e9, 1e9, 1e9), mx = new THREE.Vector3(-1e9, -1e9, -1e9);
  par.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(par.matrixWorld).invert();
  g.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bx = o.geometry.boundingBox; _m.multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < 8; i++) { _v.set(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z).applyMatrix4(_m); mn.min(_v); mx.max(_v); }
  });
  if (mx.x < mn.x) { w.stub = null; return; }
  const st = new THREE.Group(), H = STUB, TH = .3;
  // plano da parede: pela normal e distância D (paredes externas) ou pelo plano da divisória; o comprimento vem da caixa das peças
  let alongX, plane;
  if (w.plane) { alongX = w.plane === 'v'; plane = w.c; }
  else if (w.nx) { alongX = false; plane = w.nx * w.D; } else { alongX = true; plane = w.nz * w.D; }
  const L = alongX ? Math.max(.2, mx.x - mn.x) : Math.max(.2, mx.z - mn.z), mid = alongX ? (mx.x + mn.x) / 2 : (mx.z + mn.z) / 2;
  const WC = new THREE.Color(wallColor(g)), WD = WC.clone().multiplyScalar(.82);
  const box = (c0, c1, bh, bt, y, c) => { const bl = c1 - c0, m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? bl : bt, bh, alongX ? bt : bl), new THREE.MeshLambertMaterial({ color: c })); m.position.set(alongX ? (c0 + c1) / 2 : plane, mn.y + y, alongX ? plane : (c0 + c1) / 2); st.add(m); };
  const lo = mid - L / 2, hi = mid + L / 2, full = Math.max(H, mx.y - mn.y), PW = .18;
  // vãos das portas dessa parede ficam livres (sem bordinha)
  const gaps = DOORS.filter(d => d.h && h && d.h.x === h.x && d.h.z === h.z && (alongX ? d.ax !== 'z' : d.ax === 'z') && Math.abs(d.f - plane) < .7 && d.lvl === (mn.y > 1.5 ? 1 : 0))
    .map(d => [d.c - d.w / 2 - .12, d.c + d.w / 2 + .12]).sort((a, b) => a[0] - b[0]);
  let cur = lo; const segs = [];
  gaps.forEach(([g0, g1]) => { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); });
  if (cur < hi) segs.push([cur, hi]);
  segs.forEach(([c0, c1]) => { if (c1 - c0 < .05) return; box(c0, c1, H * .8 + .03, TH, H * .4 - .015, WC); box(c0, c1, H * .2, TH + .04, H * .9, WD); });
  w.posts = [lo, hi - PW].map(c0 => { const n0 = st.children.length; box(c0, c0 + PW, full, TH + .04, full / 2, WC); return st.children[n0]; });   // quinas nas pontas: só aparecem junto de parede vizinha em pé
  w.geo = { alongX, plane, lo, hi, y: mn.y };
  st.visible = false; par.add(st); w.stub = st;
}
/** Parede "abaixada" (como no The Sims): em vez de sumir, vira só uma bordinha baixa rente ao piso dela */
function lower(w, h, on) {
  const g = w.g; if (!g.parent) return;
  if (w.stub === undefined) buildStub(w, h);
  g.visible = !on || !w.stub;
  if (w.stub) w.stub.visible = on;
}
export function updateCutaway() {
  INSIDE = false;
  for (const h of HOUSES) {
    const [px, pz] = toL(h, P.x, P.z);
    const inside = Math.abs(px) < h.hx && Math.abs(pz) < h.hz && (!h.inBox || h.sc || h.inBox(px, pz));   // taverna: encostar na parede por fora não conta como entrar (hx/hz passam das paredes)
    if (inside) INSIDE = true;
    h.roof.visible = !inside;
    h.shown = inside || DOORS.some(d => d.open && !d.room && d.h.x === h.x && d.h.z === h.z);   // interior à vista (jogador dentro ou porta externa aberta)
    if (h.inner) h.inner.visible = h.shown;
    if (h.up) h.up.visible = !inside || !!P.up;
    const [cx, cz] = toL(h, cam.position.x, cam.position.z);
    const inY = inside && !!h.ye && Math.abs(px) < h.yx && pz >= -h.hz && pz < h.ye;   // paredes só somem com o personagem dentro
    const cd = Math.hypot(cx - px, cz - pz) || 1;   // direção da câmera vista do personagem: esconde também as paredes na linha de visão em diagonal
    if (h.ch) { h.ch[0].visible = !inside || !P.up; h.ch[1].visible = !inside || !!P.up; }   // chaminé: por dentro, só a parte do andar do personagem
    const pr = h.roomAt ? h.roomAt(px, pz) : null;
    if (h.iw) h.iw.forEach(w => { const pc = w.plane === 'u' ? px : pz, cc = w.plane === 'u' ? cx : cz; lower(w, h, inside && P.up && !!pr && w.rooms.includes(pr) && (pc - w.c) * (cc - w.c) < 0); });   // paredes internas: só as do quarto do personagem, e só as que ficam entre a câmera e ele
    if (h.dk) h.dk.forEach(d => { d.m.visible = inside && !!P.up && pr !== d.id && !d.ok(); });   // quartos sem acesso: escuros
    h.walls.forEach(w => lower(w, h, (inside || (w.y && inY)) && ((cx * w.nx + cz * w.nz) * h.K > w.D * h.K || ((cx - px) * w.nx + (cz - pz) * w.nz) / cd > .45)));
    {   // quinas das pontas: só onde há parede vizinha em pé (união entre paredes visíveis)
      const all = [...h.walls, ...(h.iw || [])];
      if (!h._stubs) { h._stubs = 1; all.forEach(w => { if (w.g.parent && w.stub === undefined) buildStub(w, h); }); }
      all.forEach(w => {
        if (!w.posts || !w.geo) return;
        const lowered = !!(w.stub && w.stub.visible);
        [w.geo.lo, w.geo.hi].forEach((e, i) => {
          let nb = false;
          if (lowered) for (const v of all) {
            if (v === w || !v.geo || v.geo.alongX === w.geo.alongX || Math.abs(v.geo.y - w.geo.y) > 1.2) continue;
            if (Math.abs(v.geo.plane - e) < .45 && w.geo.plane > v.geo.lo - .45 && w.geo.plane < v.geo.hi + .45 && v.g.visible) { nb = true; break; }
          }
          w.posts[i].visible = nb;
        });
      });
    }
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
    if (Math.abs(lx) > (h.sc ? (h.fx || 5.3) - .3 : 5.1) || Math.abs(lz) > (h.fz || 4.1) - .1) return false;
    return h.upOK ? h.upOK(lx, lz) : true;
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
