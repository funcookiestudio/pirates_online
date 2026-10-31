/* Cabeça da Medusa: item único (8% de chance ao derrotar a Medusa) que vira habilidade no lugar do Giro (Q / botão do giro).
   Olhar Petrificante: cone de 8 m à frente; inimigos comuns viram estátua por 4 s (elites 2 s, sofrem +50% de dano e não agem);
   chefes não petrificam: ficam atordoados 1 s e levam dano; a própria Medusa é imune.
   Gasta 1 de 5 cargas (recupera 1 a cada 4 abates), recarga de 25 s. Sem cargas, o Q volta a ser o Giro. */
import { scene } from '../core/engine.js';
import { enemies } from '../core/registry.js';
import { P } from '../entities/player.js';
import { puff } from './effects.js';
import { log, lootText } from '../ui/notify.js';

export const HEAD = { has: false, ch: 0, cd: 0 };
export const HEAD_MAX = 5, HEAD_CD = 25, HEAD_RANGE = 8, HEAD_HALF = .7;
export const headReady = () => HEAD.has && HEAD.ch >= 1;
const STONE_MAT = new THREE.MeshLambertMaterial({ color: 0x8c8a86 });
const fx = [];

/** Pegou a cabeça: começa com as 5 cargas */
export function giveHead() {
  HEAD.has = true; HEAD.ch = HEAD_MAX; HEAD.cd = 0;
  lootText('🗿 Cabeça da Medusa!');
  log('🗿 Você pegou a Cabeça da Medusa! Q agora petrifica quem estiver à sua frente (' + HEAD_MAX + ' cargas, recarregam matando inimigos)');
}
/** Abate de qualquer inimigo: recarrega 1/4 de carga */
export function headOnKill() { if (HEAD.has && HEAD.ch < HEAD_MAX) HEAD.ch = Math.min(HEAD_MAX, HEAD.ch + .25); }

/** Modelo da cabeça caída no chão (também usado para o brilho) */
export function headModel() {
  const g = new THREE.Group(), M = (c, e) => { const m = new THREE.MeshLambertMaterial({ color: c }); if (e) m.emissive.setHex(e); return m; };
  const skull = new THREE.Mesh(new THREE.BoxGeometry(.5, .56, .48), M(0xc9c6d4)); g.add(skull);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.BoxGeometry(.1, .12, .06), M(0xe0a820, 0x806010)); e.position.set(s * .13, .06, .25); g.add(e); });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.2, .05, .06), M(0x601828)); mouth.position.set(0, -.14, .25); g.add(mouth);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.283, s = new THREE.Mesh(new THREE.BoxGeometry(.09, .5, .09), M(i % 2 ? 0x4f7a45 : 0x8cae5a));
    s.position.set(Math.sin(a) * .3, .3, Math.cos(a) * .3 - .02); s.rotation.set(Math.cos(a) * .6, 0, -Math.sin(a) * .6); g.add(s);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.13, .1, .16), M(0x4f7a45)); h.position.set(Math.sin(a) * .5, .55, Math.cos(a) * .5); g.add(h);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .7, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7cff4a })); ring.position.y = -.34; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 5), new THREE.MeshBasicMaterial({ color: 0x7cff4a, transparent: true, opacity: .3 })); beam.position.y = 1; g.add(beam);
  return g;
}

/** Torna `e` estátua por `t` segundos */
export function petrify(e, t) {
  if (e.stone > 0) { e.stone = Math.max(e.stone, t); return; }
  e.stone = t; e.stoneMap = new Map();
  e.g.traverse(m => { if (m.isMesh && m.material && m.material.isMeshLambertMaterial !== undefined) { e.stoneMap.set(m, m.material); m.material = STONE_MAT; } });
  e.hb.visible = false;
  if (e.st === 'wind') { e.st = 'chase'; e.cd = Math.max(e.cd, 1); }
  if (e.ring) { scene.remove(e.ring); e.ring = null; }
  puff(e.x, 1.2, e.z, 0x9a9890, 4, 8);
}
function unpetrify(e) {
  e.stone = 0;
  if (e.stoneMap) { e.stoneMap.forEach((mt, m) => { m.material = mt; }); e.stoneMap = null; }
  puff(e.x, 1.2, e.z, 0xb0aca4, 3, 6);
}
/** Chamado pela IA de cada inimigo: true = ainda é estátua (não age) */
export function stoneTick(e, dt) {
  if (!(e.stone > 0)) return false;
  e.stone -= dt;
  if (e.stone <= 0) { unpetrify(e); return false; }
  return true;
}

/** Usa a cabeça (Q): cone à frente do jogador */
export function useHead() {
  if (P.dead) return;
  if (HEAD.cd > 0) { log('A cabeça ainda está fria (' + Math.ceil(HEAD.cd) + ' s)'); return; }
  HEAD.ch -= 1; HEAD.cd = HEAD_CD;
  const a = P.g.rotation.y; let n = 0, resist = false;
  enemies.forEach(e => {
    if (e.dead) return;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > HEAD_RANGE) return;
    let da = Math.atan2(dx, dz) - a; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
    if (d > 1.2 && da > HEAD_HALF) return;
    if (e.MD) { resist = true; return; }
    n++;
    if (e.t.boss) { e.sn = Math.max(e.sn || 0, 1); e.ag = true; return; }
    petrify(e, e.elite ? 2 : 4);
  });
  // visual: cone verde que some em 0,6 s
  const R = HEAD_RANGE, pts = [0, .15, 0];
  for (let i = 0; i <= 12; i++) { const t = -HEAD_HALF + i / 12 * HEAD_HALF * 2; pts.push(Math.sin(t) * R, .15, Math.cos(t) * R); }
  const idx = []; for (let i = 1; i <= 12; i++) idx.push(0, i, i + 1);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x7cff4a, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(P.x, 0, P.z); m.rotation.y = a; scene.add(m); fx.push({ m, t: .6 });
  puff(P.x + Math.sin(a) * 1.5, 1.4, P.z + Math.cos(a) * 1.5, 0x7cff4a, 6, 14);
  log(n ? '🗿 Olhar petrificante! ' + n + ' inimigo' + (n > 1 ? 's' : '') + ' virou pedra' : resist ? '🐍 A Medusa é imune ao próprio olhar!' : '🗿 O olhar não acertou ninguém');
}

/** Recarga e efeito visual (chamado a cada quadro por updateEnemies) */
export function updateHead(dt) {
  if (HEAD.cd > 0) HEAD.cd = Math.max(0, HEAD.cd - dt);
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t -= dt; f.m.material.opacity = Math.max(0, f.t / .6 * .55);
    if (f.t <= 0) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fx.splice(i, 1); }
  }
}

export const saveHead = () => ({ h: HEAD.has ? 1 : 0, c: +HEAD.ch.toFixed(2) });
export function loadHead(s) {
  HEAD.has = !!(s && s.h); HEAD.ch = s && Number.isFinite(s.c) ? Math.max(0, Math.min(HEAD_MAX, s.c)) : 0; HEAD.cd = 0;
}
