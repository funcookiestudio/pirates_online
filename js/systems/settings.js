/* Ajustes gerais (painel ⚙, junto com os do auto): qualidade gráfica, contador de FPS e marcador do tile clicado.
   Guardados no navegador (localStorage), separados do save do jogo. */
import { VERSION } from '../core/version.js';
import { P, mark } from '../entities/player.js';
import { scene } from '../core/engine.js';
import { $ } from '../core/utils.js';
import { houseAt, HOUSES, floorLevelH, onStairMid, stairTiles, castleStairTiles, STAIR } from '../world/floors.js';
import { inCellN } from '../world/imap.js';
import { VIZ, STEER, AUTODBG } from './steer.js';
import { state } from '../core/state.js';
import { dungeonQuest } from '../dungeon/dungeon-scene.js';
import { applyFull } from '../ui/fullscreen.js';
import { doorTiles } from '../world/doors.js';
import { saveGame } from './save.js';
import { groundY, SEED } from '../world/terrain.js';
import { DG } from '../dungeon/dgrid.js';
import { ISLANDS } from '../data/npcs.js';
import { tierOf, tierBonus } from '../data/scaling.js';
import { debugGrid, navVersion, interiorRoute } from '../world/interior-nav.js';
import { setQualityMode, perfRatio, perfFps, DIAG } from './perf.js';

const KEY = 'pirata-ajustes';
export const CFG = { diag: '', q: 'auto', fps: false, hl: 'tile', hlhide: true, names: true, tiles: false, dbg: false, vis: true, ctl: 'tap', hand: 'r' };
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
  dRaw.visible = dFin.visible = on; dLine.visible = false;
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
imTrig.material.opacity = .75; imTrig.renderOrder = 995; imTrig.material.polygonOffsetFactor = -8; imTrig.material.polygonOffsetUnits = -8;
imTrig.geometry = new THREE.PlaneGeometry(.45, .45).rotateX(-Math.PI / 2);   // célula inteira = a área que ativa ao clicar
let tkey = '';
let TRIGS = [];   // células de ativação (porta/escada): a grade verde/vermelha não é desenhada nelas, só o azul
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _u = new THREE.Vector3(0, 1, 0);
/** Tiles azuis de acionamento: portas (dentro e fora) e escadas (pé e topo). Só no andar em que o personagem está */
function updateTrig() {
  const on = CFG.tiles && !onStairMid() && !STAIR.run;
  imTrig.visible = on;
  TRIGS = [];
  if (!on) { tkey = ''; return; }
  let n = 0;
  const put = (x, z, th, y, k = 1, h0) => { if (n >= 64) return; if (h0) TRIGS.push([h0, [x, z], k]); _q.setFromAxisAngle(_u, th); _p.set(x, y, z); _s.set(k, 1, k); _m.compose(_p, _q, _s); imTrig.setMatrixAt(n++, _m); };
  doorTiles().forEach(t => {
    if (Math.hypot(t.x - P.x, t.z - P.z) > 30) return;
    const h = t.d.h, inside = houseAt(t.x, t.z, 0) === h, g = groundY(t.x, t.z);
    put(t.x, t.z, h.th, g + (t.d.lvl === 1 ? (h.Hf !== undefined ? h.Hf : 3.03 * h.K) + .06 : inside ? FLOOR_LIFT + .06 : .08), 1, t.d.lvl === (P.up ? 1 : 0) ? h : null);
  });
  const ph = houseAt(P.x, P.z, 0);
  if (ph) { const st = stairTiles(ph); if (st) { const q = P.up ? st.up : st.down; put(q[0], q[1], ph.th, groundY(q[0], q[1]) + (P.up ? (ph.Hf !== undefined ? ph.Hf : 3.03 * ph.K) + .06 : FLOOR_LIFT + .06), 3, ph); } }
  if (ph && ph.sc) castleStairTiles(ph).forEach(t => { const q = P.up ? t.up : t.down; put(q[0], q[1], ph.th, groundY(q[0], q[1]) + (P.up ? ph.Hf + .06 : FLOOR_LIFT + .06), 3, ph); });
  imTrig.count = n; imTrig.instanceMatrix.needsUpdate = true;
}
function updateTiles() {
  updateTrig();
  const on = CFG.tiles && !onStairMid() && !STAIR.run, d = on ? debugGrid() : null;   // subindo/descendo a escada: a grade some (não acompanha a câmera) e volta ao chegar no andar
  imFree.visible = imBlk.visible = !!d;
  if (!d) { tkey = ''; return; }
  const key = HOUSES.indexOf(d.h) + ':' + d.L + ':' + navVersion() + ':' + TRIGS.map(t => t[1][0].toFixed(1) + t[1][1].toFixed(1)).join();
  const y = P.g.position.y + .06 + (!P.up && d.h ? FLOOR_LIFT : 0);
  if (key !== tkey) {
    tkey = key; _q.setFromAxisAngle(_u, d.h.th);
    let a = 0, b = 0;
    d.cells.forEach(c => { if (a >= MAXC || b >= MAXC) return; if (TRIGS.some(t => t[0] === d.h && inCellN(d.h, t[1], c.x, c.z, t[2] - .1))) return; _p.set(c.x, 0, c.z); _m.compose(_p, _q, _s); (c.free ? imFree.setMatrixAt(a++, _m) : imBlk.setMatrixAt(b++, _m)); });
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
let pathLine = null;
/** Caminho que o personagem vai fazer agora: escada em curso, plano da casa ou caminho ao ar livre, até o destino; muda junto com ele */
function routePts() {
  const pts = [[P.x, P.z]];
  if (STAIR.on) { if (!STAIR.run) pts.push(STAIR.A); STAIR.pts.slice(STAIR.run ? STAIR.i : 0).forEach(q => pts.push(q)); return pts; }
  const tg = P.tgt ? [P.tgt.x, P.tgt.z] : [P.tx, P.tz];
  if (Math.hypot(tg[0] - P.x, tg[1] - P.z) < .3) return null;
  const ir = interiorRoute(tg[0], tg[1]);
  if (ir) ir.forEach(q => pts.push(q));
  else if (VIZ.path && VIZ.path.length) VIZ.path.forEach(q => pts.push(q));
  else if (VIZ.wp && Math.hypot(VIZ.wp[0] - tg[0], VIZ.wp[1] - tg[1]) > .3) pts.push(VIZ.wp);
  pts.push(tg);
  return pts;
}
function drawRoute(line, pts) {
  const lift = P.up ? floorLevelH() : (houseAt(P.x, P.z, 0) ? FLOOR_LIFT : 0), a = [];
  pts.slice(0, 60).forEach(q => a.push(q[0], groundY(q[0], q[1]) + lift + .2, q[1]));
  line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  line.geometry.computeBoundingSphere();
}
function updatePath() {
  if (!pathLine) {
    pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe040, depthTest: false, transparent: true }));
    pathLine.renderOrder = 9; pathLine.frustumCulled = false; scene.add(pathLine);
  }
  const pts = (CFG.path || CFG.dbg) ? routePts() : null;
  pathLine.visible = !!pts;
  if (pts) drawRoute(pathLine, pts);
}
export function updateSettings(dt) {
  updateTiles(); updateDbg(); updatePath();
  if (!flashTile) {
    flashTile = new THREE.Group();
    flashTile.add(new THREE.Mesh(new THREE.PlaneGeometry(.94, .94).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: .55, depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false })));
    flashTile.children[0].renderOrder = 1001; flashTile.visible = false; scene.add(flashTile);
  }
  if (flash.t > 0) { flash.t -= dt; flashTile.visible = flash.t > 0 && (Math.floor(flash.t * 10) % 2 === 0); placeTile(flashTile, flash.x, flash.y + .05, flash.z); } else flashTile.visible = false;
  const away = !STAIR.on && Math.hypot(mark.position.x - P.x, mark.position.z - P.z) > .7 || !CFG.hlhide;
  if (CFG.hl === 'tile') {
    mark.visible = false;
    tile.visible = away;
    placeTile(tile, mark.position.x, mark.position.y + .05, mark.position.z);
  } else { tile.visible = false; mark.visible = CFG.hl === 'ring' && away; }
  if (CFG.fps && fpsEl && (ft += dt) > .5) { ft = 0; fpsEl.textContent = VERSION + ' · ' + Math.round(perfFps()) + ' FPS · ' + Math.round(perfRatio() * 100) + '% res\n'
    + 'js ' + DIAG.js.toFixed(1) + ' · rend ' + DIAG.rend.toFixed(1) + ' · gpu ' + DIAG.gpu.toFixed(1) + ' ms\n'
    + DIAG.calls + ' calls · ' + Math.round(DIAG.tris / 1000) + 'k tri\n'
    + autoLine()
    + Object.entries(DIAG.sec).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k.replace('update', '') + ' ' + v.toFixed(1)).join(' · '); }
}

/** Linhas de depuração do auto (junto do FPS): o que ele quer fazer, para onde vai e se está travado */
function autoLine() {
  if (!state.autoOn) return '';
  const d = Math.hypot(P.tx - P.x, P.tz - P.z), pth = STEER.path ? STEER.path.length : 0, f = v => v.toFixed(1);
  return '🤖 ' + AUTODBG.why + '\n'
    + 'pos ' + f(P.x) + ',' + f(P.z) + ' → ' + f(P.tx) + ',' + f(P.tz) + ' · d ' + f(d) + ' · rota ' + pth + ' pts' + (P.tgt ? ' · alvo ' + P.tgt.t.n : '') + '\n'
    + 'travado ' + f(STEER.st || 0) + 's · evita ' + ((STEER.bad || []).length) + ' · destravadas ' + (AUTODBG.stuckN || 0) + (dungeonQuest() ? '\n' + dungeonQuest() : '') + '\n';
}

export function initSettings() {
  fpsEl = document.createElement('div');
  fpsEl.style.cssText = 'position:fixed;left:max(56px,calc(50% - 170px));top:calc(4px + env(safe-area-inset-top,0px));z-index:9;font:10px/1.25 monospace;white-space:pre-wrap;word-break:break-word;text-align:center;width:min(340px,calc(100% - 168px));box-sizing:border-box;color:#cfe;background:#0008;padding:1px 5px;border-radius:3px;pointer-events:none;display:none';
  document.body.appendChild(fpsEl);
  const show = () => { fpsEl.style.display = CFG.fps ? 'block' : 'none'; };
  const q = $('gx-q'), f = $('gx-fps'), hl = $('gx-hl'), hh = $('gx-hlhide'), tl = $('gx-tiles'), dg = $('gx-dbg');
  q.value = CFG.q; f.checked = CFG.fps; hl.value = CFG.hl; hh.checked = CFG.hlhide;
  q.onchange = () => { CFG.q = q.value; setQualityMode(CFG.q); save(); };
  f.onchange = () => { CFG.fps = f.checked; show(); save(); };
  hl.onchange = () => { CFG.hl = hl.value; save(); };
  dg.checked = CFG.dbg; dg.onchange = () => { CFG.dbg = dg.checked; save(); };
  tl.checked = CFG.tiles; tl.onchange = () => { CFG.tiles = tl.checked; save(); };
  const pt = $('gx-path'); pt.checked = !!CFG.path; pt.onchange = () => { CFG.path = pt.checked; save(); };
  hh.onchange = () => { CFG.hlhide = hh.checked; save(); };
  $('gx-switch').onclick = () => { saveGame(); location.reload(); };   // a tela de seleção abre a cada início
  const fu = $('gx-full'); fu.checked = CFG.full !== undefined ? !!CFG.full : matchMedia('(pointer:coarse)').matches; fu.onchange = () => { CFG.full = fu.checked; save(); applyFull(fu.checked); };
  const nm = $('gx-names'); nm.checked = CFG.names !== false; nm.onchange = () => { CFG.names = nm.checked; save(); };
  const dg2 = $('gx-diag'); dg2.onchange = () => { CFG.diag = dg2.value; };   /* não é salvo: volta ao normal ao recarregar */
  { const ctl = $('gx-ctl'), hd = $('gx-hand'); ctl.value = CFG.ctl; hd.value = CFG.hand;
    ctl.onchange = () => { CFG.ctl = ctl.value; save(); window.dispatchEvent(new Event('hudcfg')); };
    hd.onchange = () => { CFG.hand = hd.value; save(); window.dispatchEvent(new Event('hudcfg')); }; }
  const vs = $('gx-vis'); vs.checked = CFG.vis !== false; vs.onchange = () => { CFG.vis = vs.checked; save(); };
  // aba Mapa: gerar/escolher a seed da ilha (recarrega com a nova semente; o personagem é salvo antes)
  {
    const isl0 = ISLANDS.find(i => i.seed === SEED), msg = $('mp-msg'), base = msg.textContent;
    $('mp-cur').textContent = '🏝 ' + (isl0 ? isl0.name : 'Ilha aleatória') + ' · seed "' + SEED + '" · inimigos Nv ' + (1 + tierBonus(tierOf(SEED))) + '+';
    $('mp-seed').value = isl0 ? '' : SEED;
    let armed = null;
    const go = seed => {
      seed = String(seed || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
      if (!seed) { msg.textContent = 'Digite uma seed (letras, números, - ou _).'; return; }
      if (seed === SEED) { msg.textContent = 'Você já está nesta ilha.'; return; }
      if (DG.on) { msg.textContent = '🕳 Saia da dungeon antes de trocar de ilha.'; return; }
      if (armed !== seed) { armed = seed; msg.textContent = '⚠ Trocar para "' + seed + '"? Clique de novo para confirmar.'; setTimeout(() => { if (armed === seed) { armed = null; msg.textContent = base; } }, 5000); return; }
      try { localStorage.setItem('pirata-ilha', seed); localStorage.setItem('pirata-chegada', '1'); } catch (e) { /* sem armazenamento: vale o ?seed= abaixo */ }
      saveGame();
      msg.textContent = '⛵ Rumo à ilha "' + seed + '"...';
      const u = new URL(location.href); u.searchParams.set('seed', seed);   // o ?seed= vale mesmo se o navegador bloquear o armazenamento (e substitui um ?seed= antigo)
      setTimeout(() => location.assign(u.toString()), 600);
    };
    const rnd = () => { const w = ['mar', 'vento', 'ouro', 'coral', 'bruma', 'farol', 'recife', 'duna', 'lume', 'sal']; return w[Math.floor(Math.random() * w.length)] + '-' + Math.random().toString(36).slice(2, 7); };
    let pend = null;
    $('mp-new').onclick = () => { if (!pend || armed !== pend) pend = rnd(); $('mp-seed').value = pend; go(pend); };
    $('mp-go').onclick = () => go($('mp-seed').value);
    $('mp-home').onclick = () => go('brisa');
  }
  const tabs = document.querySelectorAll('#acfg .atabs span'), setTab = t => { tabs.forEach(e => e.classList.toggle('on', e.dataset.t === t)); ['gx', 'jg', 'mp', 'au'].forEach(k => { $('at-' + k).hidden = k !== t; }); try { localStorage.setItem(KEY + '-aba', t); } catch (e) { /* ignora */ } };
  tabs.forEach(e => { e.onclick = () => setTab(e.dataset.t); });
  try { setTab(localStorage.getItem(KEY + '-aba') || 'gx'); } catch (e) { setTab('gx'); }
  setQualityMode(CFG.q); show();
}
