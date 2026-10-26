/* Retrato 3D no painel (personagem e companheiro): modelo em animação de espera (idle) que o jogador gira arrastando.
   Usa um renderizador único fora da tela e copia o quadro para o canvas visível. */
import { person, hideSword, playerModel } from '../entities/character.js';
import { activeChar } from '../core/chars.js';
import { WEAPONS } from '../data/weapons.js';
import { P } from '../entities/player.js';
import { mkParrot, mkRaven, mkDog, mkMonkey, mkRat } from '../pets/models.js';
import { isPanelOpen } from '../core/utils.js';
import { state } from '../core/state.js';
import { HAPPY_TIME } from '../pets/manager.js';

let rr = null; // renderizador compartilhado (criado só quando o painel abre pela primeira vez)
const views = [];

function renderer() {
  if (!rr) {
    rr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    rr.setClearColor(0x000000, 0);
  }
  return rr;
}

/** Cria um visor num canvas. `idle(m, t)` anima o modelo (t = segundos). */
function makeView(id) {
  const canvas = document.getElementById(id);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a3a, .95));
  const sun = new THREE.DirectionalLight(0xfff0d8, .8);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 50);
  cam.position.set(0, 1.5, 7.2);
  cam.lookAt(0, 1.05, 0);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const v = { canvas, scene, cam, pivot, model: null, idle: null, yaw: .5, drag: null, key: '' };
  pivot.rotation.y = v.yaw;

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); v.drag = e.clientX; });
  canvas.addEventListener('pointermove', e => { if (v.drag !== null) { v.yaw += (e.clientX - v.drag) * .012; v.drag = e.clientX; } });
  const end = () => { v.drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  views.push(v);
  return v;
}

function dispose(o) {
  o.traverse(c => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  });
}

/** Troca o modelo exibido (`key` evita reconstruir o mesmo modelo a cada atualização do painel) */
function setModel(v, key, build, idle, height) {
  if (v.key === key) return;
  v.key = key;
  if (v.model) { v.pivot.remove(v.model); dispose(v.model); }
  const m = build();
  if (height) {
    // normaliza o tamanho (companheiros são pequenos) e apoia os pés no chão
    const b = new THREE.Box3().setFromObject(m), s = height / (b.max.y - b.min.y);
    m.scale.multiplyScalar(s);
    const b2 = new THREE.Box3().setFromObject(m);
    m.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
    const wrap = new THREE.Group();
    wrap.add(m);
    v.model = wrap;
    v.inner = m;
  } else { v.model = m; v.inner = m; }
  v.inner.userData.by = v.inner.position.y; // altura de apoio no chão
  v.idle = idle;
  v.pivot.add(v.model);
}

/* ---------- Jogador ---------- */

function idlePlayer(g, t) {
  const b = Math.sin(t * 1.9);                  // respiração
  g.up.scale.y = 1 + b * .012;
  g.up.rotation.x = b * .012;
  g.up.rotation.z = Math.sin(t * .6) * .02;     // balanço do peso
  g.arm.rotation.x = -.32 + b * .04;
  g.arm.rotation.z = -.06 + Math.sin(t * 1.2) * .015;
  g.armL.rotation.x = -.1 - b * .04;
  g.armL.rotation.z = .06 - Math.sin(t * 1.2) * .015;
  g.head.rotation.y = Math.sin(t * .55) * .28;  // olha em volta
  g.head.rotation.x = Math.sin(t * .8) * .04;
  g.legL.rotation.x = Math.sin(t * .6) * .02;
  g.legR.rotation.x = -Math.sin(t * .6) * .02;
}

function buildPlayer() {
  const g = playerModel(!!(activeChar() && activeChar().f), activeChar() && activeChar().a);
  const fa = g.arm.fa;
  hideSword(g); // tira a espada padrão
  const W = WEAPONS[P.wid];
  if (W) {
    const w = W.build();
    w.position.y = -.32;
    if (W.gun) w.rotation.x = Math.PI / 2; // arma de fogo na mão, cano para a frente e baixo
    fa.add(w);
  }
  return g;
}

/* ---------- Itens (prévia ao selecionar na mochila ou no equipamento) ---------- */

const QCOL = [0, 0x8a6a44, 0x3a6ab0, 0xd8a820];   // cor da armadura por qualidade
function buildItem(it) {
  if (it.ty === 'arm') {            // armadura: o personagem vestindo a peça
    const g = person(0xe0b48a, QCOL[it.q] || 0x8a6a44, 0x2e3a5a, 0x1a1a1a);
    hideSword(g);
    return g;
  }
  const W = WEAPONS[it.w], w = W.build(), box = new THREE.Box3().setFromObject(w);
  const sz = box.getSize(new THREE.Vector3()), k = 2.5 / Math.max(sz.x, sz.y, sz.z, .01);
  const wrap = new THREE.Group(), c = box.getCenter(new THREE.Vector3());
  w.position.sub(c);
  const pivot = new THREE.Group();
  pivot.add(w);
  pivot.rotation.z = W.gun ? 0 : .5;            // espada inclinada; arma de fogo deitada
  wrap.add(pivot);
  wrap.scale.setScalar(k);
  wrap.position.y = 1.05;
  const out = new THREE.Group();
  out.add(wrap);
  return out;
}
function idleItem(g, t) {
  if (g.children.length === 1 && g.children[0].isGroup && !g.arm) g.position.y = Math.sin(t * 1.6) * .06;
  else idlePlayer(g, t);
}

/** Mostra o item `it` (arma 3D girável ou armadura vestida) no canvas do personagem */
export function showItem(it) {
  if (!vp) vp = makeView('cvPl');
  setModel(vp, 'i' + it.ty + it.w + '_' + it.q + '_' + it.v, () => buildItem(it), idleItem);
}

/* ---------- Companheiros ---------- */

/* Animações de espera dos companheiros: todos "no chão" (as aves ficam em pé, com as asas recolhidas) */
const base = g => g.userData.by || 0;
const peck = t => Math.max(0, Math.sin(t * 1.3)) ** 8;     // bicadas ocasionais (0..1)
const PETS = {
  parrot: [mkParrot, (g, t) => {
    g.userData.by = g.userData.by ?? g.position.y;
    g.position.y = base(g) + Math.abs(Math.sin(t * 1.1)) * .015;
    g.pw.forEach(w => { w.sh.rotation.set(0, w.s * 1.3, -w.s * (.45 + Math.sin(t * 1.8) * .03)); w.tip.rotation.set(0, w.s * .65, -w.s * .2); });   // asas dobradas junto ao corpo
    g.ph.rotation.set(Math.sin(t * 1.3) * .15, Math.sin(t * .8) * .5, 0); g.pt.rotation.y = Math.sin(t * 1.2) * .1;
    g.rotation.x = peck(t) * .45 - .1;                       // bica o chão
    g.rotation.z = Math.sin(t * .7) * .06;
    g.rotation.y = Math.sin(t * .5) * .25;                   // olha em volta
  }],
  raven: [mkRaven, (g, t) => {
    g.position.y = base(g) + Math.abs(Math.sin(t * 1.4)) * .015;
    g.wl.rotation.z = 1.25 + Math.sin(t * 1.5) * .03;
    g.wr.rotation.z = -1.25 - Math.sin(t * 1.5) * .03;
    g.head.rotation.y = Math.sin(t * .8) * .5;
    g.head.rotation.x = peck(t) * .6;
    g.rotation.x = peck(t) * .25;
    g.rotation.y = Math.sin(t * .45) * .25;
  }],
  monkey: [mkMonkey, (g, t) => {
    g.head.rotation.y = Math.sin(t * .7) * .4;
    g.head.rotation.x = Math.sin(t * 1.3) * .06;
    g.arm.rotation.x = Math.sin(t * 1.5) * .08; g.armL.rotation.x = -Math.sin(t * 1.5) * .08;
    g.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 2 - i * .7) * .22; });
    g.position.y = base(g) + Math.sin(t * 1.9) * .01;
  }],
  dog: [mkDog, (g, t) => {
    g.tail.rotation.y = Math.sin(t * 9) * .5;                               // abana o rabo
    g.head.rotation.y = Math.sin(t * .8) * .3;
    g.head.rotation.x = Math.sin(t * 1.7) * .05;
    g.position.y = base(g) + Math.abs(Math.sin(t * 1.9)) * .008;
  }],
  rat: [mkRat, (g, t) => {
    g.tailSegs.forEach((q, i) => { q.rotation.y = Math.sin(t * 3 - i * .6) * .2; });
    g.head.rotation.y = Math.sin(t * .8) * .5;
    g.head.rotation.x = Math.sin(t * 14) * .05;
    g.position.y = base(g) + Math.sin(t * 2) * .005;
  }],
};

let vp = null, va = null;

/** Mostra o personagem (com a arma que está na mão) no canvas `cvP` */
export function showPlayer() {
  if (!vp) vp = makeView('cvPl');
  setModel(vp, 'p' + P.wid, buildPlayer, idlePlayer);
}

/** Mostra o companheiro `id` no canvas `cvA` */
export function showPet(id) {
  if (!va) va = makeView('cvA');
  const [mk, idle] = PETS[id];
  setModel(va, id, mk, idle, id === 'rat' ? 3 : 2.1);
}

const t0 = performance.now();
let last = 0;

function draw(v) {
  const c = v.canvas, w = c.clientWidth, h = c.clientHeight;
  if (!w || !h || !v.model) return;
  const r = renderer(), d = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
  r.setPixelRatio(1);
  r.setSize(c.width, c.height, false);
  v.cam.aspect = w / h;
  // enquadra: em telas estreitas afasta a câmera
  v.cam.position.z = 6.4 * Math.max(1, 1.1 / v.cam.aspect * .9);
  v.cam.updateProjectionMatrix();
  v.pivot.rotation.y += (v.yaw - v.pivot.rotation.y) * .3;
  const t = (performance.now() - t0) / 1000;
  if (v.idle) v.idle(v.inner, t);
  if (v === va && state.petHappy > 0 && v.key === state.pet.id) { // equipado agora: pula de alegria
    const k = state.petHappy / HAPPY_TIME, env = Math.min(1, k * 2.5), tt = (1 - k) * HAPPY_TIME;
    v.inner.position.y += Math.abs(Math.sin(tt * 7)) * .5 * env;
    v.inner.rotation.z = Math.sin(tt * 16) * .22 * env;
  } else if (v === va && (v.key === 'dog' || v.key === 'rat' || v.key === 'monkey')) v.inner.rotation.z = 0;
  r.render(v.scene, v.cam);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(r.domElement, 0, 0);
}

/** Laço de animação dos retratos: só desenha o que está visível */
export function initPreview() {
  const loop = now => {
    requestAnimationFrame(loop);
    if (now - last < 33 || !isPanelOpen()) return; // ~30 quadros/s
    last = now;
    views.forEach(draw);
  };
  requestAnimationFrame(loop);
}
