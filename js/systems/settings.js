/* Ajustes gerais (painel ⚙, junto com os do auto): qualidade gráfica, contador de FPS e marcador do tile clicado.
   Guardados no navegador (localStorage), separados do save do jogo. */
import { VERSION } from '../core/version.js';
import { P, mark } from '../entities/player.js';
import { scene } from '../core/engine.js';
import { $ } from '../core/utils.js';
import { houseAt, HOUSES, onStairMid, stairTiles, STAIR } from '../world/floors.js';
import { doorTiles } from '../world/doors.js';
import { groundY } from '../world/terrain.js';
import { debugGrid, navVersion } from '../world/interior-nav.js';
import { setQualityMode, perfRatio, perfFps, DIAG } from './perf.js';

const KEY = 'pirata-ajustes';
export const CFG = { diag: '', q: 'auto', fps: false, hl: 'tile', hlhide: true, tiles: false, dbg: false, vis: true };
try { Object.assign(CFG, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem armazenamento: usa o padrão */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(CFG)); } catch (e) { /* ignora */ } };

// tile: quadrado de 1 m alinhado à grade do mundo, com contorno
const tile = new THREE.Group();
{
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(.94, .94).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe0a458, transparent: true, opacity: .3, depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  const s = .47, pts = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, z]) => new THREE.Vector3(x, .01, z));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffe0a0, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  fill.renderOrder = 998; line.renderOrder = 999; tile.add(fill, line); tile.visible = false;
  mark.material.depthTest = true; mark.material.polygonOffset = true; mark.material.polygonOffsetFactor = -4; mark.material.polygonOffsetUnits = -4; mark.renderOrder = 999;   // marcadores sempre visíveis (o piso de madeira das casas ficava por cima)
  scene.add(tile);
}
let fpsEl = null, ft = 0;

/** Ponto bruto do clique (onde o raio da câmera acertou) — guardado por input.js a cada clique */
export const PICKDBG = { x: 0, y: 0, z: 0, on: false, up: false };
const ringG = new THREE.RingGeometry(.22, .34, 20).rotateX(-Math.PI / 2);
const mkRing = col => { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: col, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, transparent: true })); m.renderOrder = 1000; m.visible = false; scene.add(m); return m; };
const dRaw = mkRing(0x20e0ff), dFin = mkRing(0xff30e0);
const dLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
dLine.renderOrder = 1000; dLine.visible = false; dLine.frustumCulled = false; scene.add(dLine);
function updateDbg() {
  const on = CFG.dbg && PICKDBG.on;
  dRaw.visible = dFin.visible = dLine.visible = on;
  if (!on) return;
  const y = PICKDBG.y + .1;
  dRaw.position.set(PICKDBG.x, y, PICKDBG.z); dFin.position.set(P.tx, y, P.tz);
  const a = dLine.geometry.attributes.position; a.setXYZ(0, PICKDBG.x, y, PICKDBG.z); a.setXYZ(1, P.tx, y, P.tz); a.needsUpdate = true;
}
// aviso de clique em lugar bloqueado: tile vermelho que some
const flash = { t: 0 };
let flashTile = null;
export function flashBlocked(x, y, z) { flash.t = .7; flash.x = x; flash.y = y; flash.z = z; }

// mapa de tiles da casa (depuração/visualização): verde = livre, vermelho = bloqueado
const MAXC = 7000, cg = new THREE.PlaneGeometry(.41, .41).rotateX(-Math.PI / 2);
const mkInst = col => { const m = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .38, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false }), MAXC); m.count = 0; m.frustumCulled = false; m.renderOrder = 990; m.visible = false; scene.add(m); return m; };
const imFree = mkInst(0x40e070), imBlk = mkInst(0xf03838), imTrig = mkInst(0x3a7bff);
imTrig.material.opacity = .6; imTrig.renderOrder = 3;
let tkey = '';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _u = new THREE.Vector3(0, 1, 0);
/** Tiles azuis de acionamento: portas (dentro e fora) e escadas (pé e topo). Só no andar em que o personagem está */
function updateTrig() {
  const on = CFG.tiles && !onStairMid() && !STAIR.run;
  imTrig.visible = on;
  if (!on) return;
  let n = 0;
  const put = (x, z, th, y) => { if (n >= 64) return; _q.setFromAxisAngle(_u, th); _p.set(x, y, z); _m.compose(_p, _q, _s); imTrig.setMatrixAt(n++, _m); };
  doorTiles().forEach(t => {
    if (Math.hypot(t.x - P.x, t.z - P.z) > 30) return;
    const h = t.d.h, inside = houseAt(t.x, t.z, 0) === h, g = groundY(t.x, t.z);
    put(t.x, t.z, h.th, g + (t.d.lvl === 1 ? (h.Hf !== undefined ? h.Hf : 3.03 * h.K) + .06 : inside ? FLOOR_LIFT + .06 : .08));
  });
  const ph = houseAt(P.x, P.z, 0);
  if (ph) { const st = stairTiles(ph); if (st) { const q = P.up ? st.up : st.down; put(q[0], q[1], ph.th, groundY(q[0], q[1]) + (P.up ? (ph.Hf !== undefined ? ph.Hf : 3.03 * ph.K) + .06 : FLOOR_LIFT + .06)); } }
  imTrig.count = n; imTrig.instanceMatrix.needsUpdate = true;
}
function updateTiles() {
  updateTrig();
  const on = CFG.tiles && !onStairMid() && !STAIR.run, d = on ? debugGrid() : null;   // subindo/descendo a escada: a grade some (não acompanha a câmera) e volta ao chegar no andar
  imFree.visible = imBlk.visible = !!d;
  if (!d) { tkey = ''; return; }
  const key = HOUSES.indexOf(d.h) + ':' + d.L + ':' + navVersion();
  const y = P.g.position.y + .06 + (!P.up && d.h ? FLOOR_LIFT : 0);
  if (key !== tkey) {
    tkey = key; _q.setFromAxisAngle(_u, d.h.th);
    let a = 0, b = 0;
    d.cells.forEach(c => { if (a >= MAXC || b >= MAXC) return; _p.set(c.x, 0, c.z); _m.compose(_p, _q, _s); (c.free ? imFree.setMatrixAt(a++, _m) : imBlk.setMatrixAt(b++, _m)); });
    imFree.count = a; imBlk.count = b; imFree.instanceMatrix.needsUpdate = imBlk.instanceMatrix.needsUpdate = true;
  }
  imFree.position.y = imBlk.position.y = y;
}

const FLOOR_LIFT = .26;   // o piso de madeira do térreo fica ~.13–.18 m acima do terreno
function placeTile(o, x, y, z) {
  const h = houseAt(x, z, 0);
  if (h) {   // dentro de uma casa o tile segue a orientação e a escala dela (grade da própria casa), não a do terreno
    const c = Math.cos(h.th), sn = Math.sin(h.th), dx = x - h.x, dz = z - h.z;
    const lx = Math.floor((dx * c - dz * sn) / h.K) + .5, lz = Math.floor((dx * sn + dz * c) / h.K) + .5;
    o.position.set(h.x + (lx * c + lz * sn) * h.K, y + (P.up ? 0 : FLOOR_LIFT), h.z + (-lx * sn + lz * c) * h.K);
    o.rotation.y = h.th; o.scale.setScalar(h.K);
  } else { o.position.set(Math.floor(x) + .5, y, Math.floor(z) + .5); o.rotation.y = 0; o.scale.setScalar(1); }
}
/** A cada quadro: posiciona o tile no destino clicado e atualiza o contador de FPS */
export function updateSettings(dt) {
  updateTiles(); updateDbg();
  if (!flashTile) {
    flashTile = new THREE.Group();
    flashTile.add(new THREE.Mesh(new THREE.PlaneGeometry(.94, .94).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: .55, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false })));
    flashTile.children[0].renderOrder = 1001; flashTile.visible = false; scene.add(flashTile);
  }
  if (flash.t > 0) { flash.t -= dt; flashTile.visible = flash.t > 0 && (Math.floor(flash.t * 10) % 2 === 0); placeTile(flashTile, flash.x, flash.y + .05, flash.z); } else flashTile.visible = false;
  const away = Math.hypot(mark.position.x - P.x, mark.position.z - P.z) > .7 || !CFG.hlhide;
  if (CFG.hl === 'tile') {
    mark.visible = false;
    tile.visible = away;
    placeTile(tile, mark.position.x, mark.position.y + .05, mark.position.z);
  } else { tile.visible = false; mark.visible = CFG.hl === 'ring' && away; }
  if (CFG.fps && fpsEl && (ft += dt) > .5) { ft = 0; fpsEl.textContent = VERSION + ' · ' + Math.round(perfFps()) + ' FPS · ' + Math.round(perfRatio() * 100) + '% res · js ' + DIAG.js.toFixed(1) + ' rend ' + DIAG.rend.toFixed(1) + ' gpu ' + DIAG.gpu.toFixed(1) + 'ms · ' + DIAG.calls + ' calls ' + Math.round(DIAG.tris / 1000) + 'k tri\n' + Object.entries(DIAG.sec).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k.replace('update', '') + ' ' + v.toFixed(1)).join(' · '); }
}

export function initSettings() {
  fpsEl = document.createElement('div');
  fpsEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(4px + env(safe-area-inset-top,0px));z-index:9;font:11px monospace;white-space:pre;text-align:center;color:#cfe;background:#0008;padding:1px 5px;border-radius:3px;pointer-events:none;display:none';
  document.body.appendChild(fpsEl);
  const show = () => { fpsEl.style.display = CFG.fps ? 'block' : 'none'; };
  const q = $('gx-q'), f = $('gx-fps'), hl = $('gx-hl'), hh = $('gx-hlhide'), tl = $('gx-tiles'), dg = $('gx-dbg');
  q.value = CFG.q; f.checked = CFG.fps; hl.value = CFG.hl; hh.checked = CFG.hlhide;
  q.onchange = () => { CFG.q = q.value; setQualityMode(CFG.q); save(); };
  f.onchange = () => { CFG.fps = f.checked; show(); save(); };
  hl.onchange = () => { CFG.hl = hl.value; save(); };
  dg.checked = CFG.dbg; dg.onchange = () => { CFG.dbg = dg.checked; save(); };
  tl.checked = CFG.tiles; tl.onchange = () => { CFG.tiles = tl.checked; save(); };
  hh.onchange = () => { CFG.hlhide = hh.checked; save(); };
  const dg2 = $('gx-diag'); dg2.onchange = () => { CFG.diag = dg2.value; };   /* não é salvo: volta ao normal ao recarregar */
  const vs = $('gx-vis'); vs.checked = CFG.vis !== false; vs.onchange = () => { CFG.vis = vs.checked; save(); };
  const tabs = document.querySelectorAll('#acfg .atabs span'), setTab = t => { tabs.forEach(e => e.classList.toggle('on', e.dataset.t === t)); ['gx', 'jg', 'au'].forEach(k => { $('at-' + k).hidden = k !== t; }); try { localStorage.setItem(KEY + '-aba', t); } catch (e) { /* ignora */ } };
  tabs.forEach(e => { e.onclick = () => setTab(e.dataset.t); });
  try { setTab(localStorage.getItem(KEY + '-aba') || 'gx'); } catch (e) { setTab('gx'); }
  setQualityMode(CFG.q); show();
}
