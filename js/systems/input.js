/* Entrada: mouse/toque no mundo, atalhos de teclado e botões da interface. */
import { switchWeapon } from './swap.js';
import { cam, ren } from '../core/engine.js';
import { state, aim } from '../core/state.js';
import { enemies } from '../core/registry.js';
import { $ } from '../core/utils.js';
import { P, mark } from '../entities/player.js';
import { spin, bomb, potion } from './combat.js';
import { togAuto } from './auto.js';
import { dodge } from './dodge.js';
import { CAMUI, zoomBy, rotateBy, tiltBy, resetCamera } from './camera.js';
import { toggleSit, standUp } from './rest.js';
import { togglePet } from '../pets/manager.js';
import { freePoint } from './steer.js';
import { clickCave } from '../world/caves.js';
import { groundY } from '../world/terrain.js';
import { stairClick, cancelStair, floorLevelH, upperContains, descendThen } from '../world/floors.js';
import { doorClick, doorTileClick, cancelDoor, exitClick, roomClick } from '../world/doors.js';
import { bedClick } from '../world/beds.js';
import { cabinetClick } from '../world/cabinets.js';
import { snapInterior } from '../world/interior-nav.js';
import { PICKDBG, flashBlocked, CFG } from './settings.js';
import { wakeUp } from './bed.js';
import { catAt } from '../entities/wildlife.js';
import { petWalk, cancelPetWalk, endPet, petting } from './pet.js';
import { npcAt, talkTo, cancelTalk } from '../entities/npc.js';
import { closePanel, openTab } from '../ui/panel.js';
import { toggleMount, dismissHorse, MOUNT } from './mount.js';

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = false;
let stick = null;   // joystick flutuante (celular, modo Joystick): { id, x, y, t, moved }
const _v = new THREE.Vector3();
const joyOn = () => CFG.ctl === 'joy' && document.body.classList.contains('mob');
function endStick() { stick = null; document.body.classList.remove('joy-on'); }
/** Anda na direção do dedo, relativa à câmera: o destino é um ponto logo à frente do personagem */
function stickGo(jx, jy) {
  if (P.sit > 0 || P.sitT) standUp();
  if (P.bed) wakeUp();
  MOUNT.want = false; state.autoHold = 2.5; P.tgt = null;
  cancelStair(); cancelDoor(); cancelTalk(); cancelPetWalk();
  cam.getWorldDirection(_v);
  let fx = _v.x, fz = _v.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
  const dx = -fz * jx - fx * jy, dz = fx * jx - fz * jy;   // direita da câmera = (-fz, fx) · para cima na tela = frente
  let f = freePoint(P.x + dx * 4, P.z + dz * 4, .7);
  const sn = snapInterior(P.x, P.z, f.x, f.z);
  if (sn === null) return;
  if (sn) f = { x: sn[0], z: sn[1] };
  P.tx = f.x; P.tz = f.z;
}
function stickMove(e) {
  const dx = e.clientX - stick.x, dy = e.clientY - stick.y, m = Math.hypot(dx, dy);
  if (m > 10) stick.moved = true;
  if (!stick.moved) return;
  const R = 50, k = m > R ? R / m : 1, ux = dx * k, uy = dy * k;
  const b = $('joyb'), n = $('joyk');
  document.body.classList.add('joy-on');
  b.style.left = stick.x + 'px'; b.style.top = stick.y + 'px';
  n.style.left = stick.x + ux + 'px'; n.style.top = stick.y + uy + 'px';
  if (m > 14) stickGo(ux / R, uy / R);
}

/** Clique/toque na tela: seleciona um inimigo próximo ou define o destino no chão */
function pick(cx, cy) {
  if (P.sit > 0 || P.sitT) standUp(); // clicar no mundo levanta o personagem
  if (P.bed) wakeUp();                // …e acorda quem dorme
  MOUNT.want = false;   // clicar em outro lugar cancela a ida até o cavalo
  state.autoHold = 2.5; // assume o controle do auto combate por 2,5 s
  pointer.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, cam);
  ray.ray.intersectPlane(ground, aim);
  const g0 = aim.clone();
  // relevo: avança pelo raio até o chão real (morros e cais), em vez do plano y=0
  { const o = ray.ray.origin, d = ray.ray.direction, LH = floorLevelH(); let hit = false;
    for (let t = 0; t < 400; t += 1) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y <= groundY(x, z) + LH) {
        let lo = t - 1, hi = t;
        for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; (o.y + d.y * m <= groundY(o.x + d.x * m, o.z + d.z * m) + LH) ? hi = m : lo = m; }
        aim.set(o.x + d.x * hi, 0, o.z + d.z * hi); hit = true; break;
      }
    }
    void hit; }
  // andar de cima: o clique mira o piso de cima; fora da casa vale o chão lá embaixo (desce a escada, abre a porta e sai)
  if (P.up && floorLevelH() > 0) {
    const o = ray.ray.origin, d = ray.ray.direction, t = (groundY(P.x, P.z) + floorLevelH() - o.y) / d.y;
    if (t > 0) {
      const ux = o.x + d.x * t, uz = o.z + d.z * t;
      if (upperContains(ux, uz)) aim.set(ux, 0, uz);
      else {
        // Como no Tibia: cada andar é uma camada. Do andar de cima só se clica no piso de cima; a abertura da escada leva ao andar de baixo
        // e o chão lá embaixo (dentro ou fora da casa) não recebe cliques até o personagem descer
        cancelStair(); cancelDoor();
        if (stairClick(ux, uz)) { P.tgt = null; mark.position.set(ux, groundY(ux, uz) + floorLevelH() + .12, uz); }
        return;
      }
    } else return;
  }

  { const up = P.up && floorLevelH() > 0; PICKDBG.x = aim.x; PICKDBG.z = aim.z; PICKDBG.y = up ? groundY(P.x, P.z) + floorLevelH() : groundY(aim.x, aim.z); PICKDBG.on = true; PICKDBG.up = up; }
  cancelStair(); cancelDoor();
  if (petting()) { endPet(); return; }   // qualquer clique encerra o afago
  if (doorClick(ray)) return;
  if (doorTileClick(aim.x, aim.z)) { mark.position.set(aim.x, markY(aim.x, aim.z), aim.z); return; }
  if (bedClick(ray)) return;
  if (cabinetClick(ray)) return;
  if (roomClick(aim.x, aim.z)) { mark.position.set(aim.x, markY(aim.x, aim.z), aim.z); return; }
  if (exitClick(aim.x, aim.z)) { mark.position.set(aim.x, markY(aim.x, aim.z), aim.z); return; }
  if (stairClick(aim.x, aim.z)) { mark.position.set(aim.x, markY(aim.x, aim.z), aim.z); return; }
  if (clickCave(aim.x, aim.z)) { mark.position.set(aim.x, markY(aim.x, aim.z), aim.z); return; }
  const n = npcAt(aim.x, aim.z);
  if (n) { P.tgt = null; talkTo(n); mark.position.set(n.g.position.x, markY(n.g.position.x, n.g.position.z), n.g.position.z); return; }
  const ct = P.up ? null : catAt(aim.x, aim.z);
  if (ct) { P.tgt = null; petWalk(ct); mark.position.set(ct.x, markY(ct.x, ct.z), ct.z); return; }
  cancelTalk(); cancelPetWalk();

  let best = null, bd = 2.2;
  enemies.forEach(e => {
    if (e.dead) return;
    const d = Math.hypot(e.x - aim.x, e.z - aim.z);
    if (d < bd) { bd = d; best = e; }
  });

  P.tgt = best;
  if (!best) {
    let f = freePoint(aim.x, aim.z, .7);
    const sn = snapInterior(P.x, P.z, f.x, f.z);   // dentro de casas: só células livres e alcançáveis do andar atual
    if (sn === null) { flashBlocked(f.x, PICKDBG.y, f.z); return; }
    if (sn) f = { x: sn[0], z: sn[1] };
    P.tx = f.x;
    P.tz = f.z;
    mark.position.set(f.x, markY(f.x, f.z), f.z);
  }
}

/** altura do marcador de clique: acompanha o piso (térreo elevado ou andar de cima) */
const markY = (x, z) => groundY(x, z) + (P.up && floorLevelH() > 0 && upperContains(x, z) ? floorLevelH() : 0) + .12;

export function initInput() {
  // ponteiro: toque/clique mira e move · roda do mouse e pinça = zoom · botão direito (arrastar) e giro com dois dedos = girar a câmera
  const cv = ren.domElement, pts = new Map();
  let gest = null;   // gesto de dois dedos em andamento: { d: distância, a: ângulo }
  let orbit = null;  // arrasto com botão direito/do meio: { x }
  let wait = 0;      // toque aguardando para ver se vira gesto de dois dedos
  const pair = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), a: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) };
  };

  for (const id of ['joyb', 'joyk']) { const d = document.createElement('div'); d.id = id; document.body.append(d); }
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) tiltBy(-e.deltaY * .002); else zoomBy(Math.exp(e.deltaY * .0015)); }, { passive: false });

  let cg = null, cd = 0;   // modo câmera: arrasto de um dedo (faixa de baixo = girar · lateral direita = inclinar) e pinça = zoom
  const camZone = e => e.clientX > innerWidth * .78 ? 'tilt' : e.clientY > innerHeight * .62 ? 'rot' : null;
  cv.addEventListener('pointerdown', e => {
    if (CAMUI.open) {
      pts.set(e.pointerId, e); down = false;
      if (pts.size === 2) { cg = null; cd = pair().d; } else cg = { m: camZone(e), x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button === 1 || e.button === 2) { orbit = { x: e.clientX, y: e.clientY }; return; }
    pts.set(e.pointerId, e);
    if (pts.size === 2) { endStick(); clearTimeout(wait); down = false; P.tgt = null; P.tx = P.x; P.tz = P.z; cancelStair(); cancelDoor(); gest = { ...pair(), sd: pair().d, ca: 0, mode: null }; return; } // segundo dedo: vira gesto, cancela o toque
    if (e.pointerType === 'touch' && joyOn()) { stick = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; return; }
    if (e.pointerType === 'touch') {
      // espera um instante: se um segundo dedo chegar, era o início de um gesto e o personagem não anda
      down = true; pick(e.clientX, e.clientY);   // sem espera: anda no mesmo instante (se virar gesto de dois dedos, o passo é desfeito)
    } else { down = true; pick(e.clientX, e.clientY); }
  });

  cv.addEventListener('pointermove', e => {
    if (CAMUI.open) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) { const n = pair().d; if (cd > 0 && n > 0) zoomBy(cd / n); cd = n; }
      else if (cg && cg.m) { if (cg.m === 'rot') rotateBy(-(e.clientX - cg.x) * .008); else tiltBy((e.clientY - cg.y) * .006); cg.x = e.clientX; cg.y = e.clientY; }
      return;
    }
    if (stick && e.pointerId === stick.id) { stickMove(e); return; }
    if (orbit) { if (e.buttons & 6) { rotateBy(-(e.clientX - orbit.x) * .008); tiltBy((e.clientY - orbit.y) * .006); orbit.x = e.clientX; orbit.y = e.clientY; } return; }
    if (pts.has(e.pointerId)) pts.set(e.pointerId, e);
    if (pts.size === 2 && gest) {
      const n = pair(), da = Math.atan2(Math.sin(n.a - gest.a), Math.cos(n.a - gest.a));
      gest.ca += da;
      // dois dedos: ou é pinça (zoom) ou é giro; escolhe pelo movimento dominante e trava até soltar
      if (!gest.mode) {
        const pinchPx = Math.abs(n.d - gest.sd), arcPx = Math.abs(gest.ca) * n.d / 2;
        if (Math.max(pinchPx, arcPx) > 14) gest.mode = pinchPx > arcPx ? 'zoom' : 'rot';
      } else if (gest.mode === 'zoom') { if (gest.d > 0 && n.d > 0) zoomBy(gest.d / n.d); }
      else rotateBy(da);
      gest.d = n.d; gest.a = n.a;
      return;
    }
    if (down && !P.tgt && pts.size === 1) pick(e.clientX, e.clientY);
  });

  const end = e => {
    if (CAMUI.open) { pts.delete(e.pointerId); cg = null; down = false; return; }
    if (stick && e.pointerId === stick.id) {
      const s = stick, tap = e.type === 'pointerup' && !s.moved && performance.now() - s.t < 450;
      endStick();
      if (tap) pick(s.x, s.y); else { P.tx = P.x; P.tz = P.z; }
    }
    if (e.button === 1 || e.button === 2) orbit = null;
    pts.delete(e.pointerId);
    if (pts.size < 2) gest = null;
    if (!pts.size) down = false;
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);

  // teclado
  addEventListener('keydown', e => {
    if (e.code === 'KeyT') togAuto();
    if (e.code === 'KeyQ') spin();
    if (e.code === 'KeyW') bomb();
    if (e.code === 'KeyE') potion();
    if (e.code === 'Space') { e.preventDefault(); dodge(); }
    if (e.code === 'KeyR') togglePet();
    if (e.code === 'KeyG') toggleSit();
    if (e.code === 'KeyH') { if (e.shiftKey) dismissHorse(); else toggleMount(); }
    if (e.code === 'KeyX') switchWeapon();
    if (e.code === 'KeyI' || e.code === 'KeyC') openTab('char');
    if (e.code === 'KeyP') openTab('pets');
    if (e.code === 'Escape') closePanel();
    if (e.code === 'ArrowLeft') rotateBy(-.12);
    if (e.code === 'ArrowRight') rotateBy(.12);
    if (e.code === 'ArrowUp') { e.preventDefault(); tiltBy(.08); }
    if (e.code === 'ArrowDown') { e.preventDefault(); tiltBy(-.08); }
    if (e.code === 'Home' || e.code === 'Digit0') resetCamera();
    if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomBy(.8);
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomBy(1.25);
  });

  // botões
  $('s1').onclick = switchWeapon;
  $('s2').onclick = spin;
  $('s3').onclick = bomb;
  $('s4').onclick = potion;
  $('sr').onclick = dodge;
  $('s5').onclick = togglePet;
  { /* toque curto: monta/desmonta/chama · segurar ~0,6 s: dispensa o cavalo */
    const b = $('sm'); let tm = 0, held = false;
    b.onpointerdown = () => { held = false; clearTimeout(tm); tm = setTimeout(() => { held = true; dismissHorse(); }, 600); };
    ['onpointerup', 'onpointerleave', 'onpointercancel'].forEach(k => { b[k] = () => clearTimeout(tm); });
    b.onclick = () => { if (held) { held = false; return; } toggleMount(); };
  }
  $('sa').onclick = togAuto;
  $('pcl').onclick = closePanel;
  camButtons();
  $('pcl2x').onclick = closePanel;
}

/** Botões de câmera na tela (toque/mouse): girar, inclinar, aproximar/afastar e restaurar. O ícone mostra/oculta o painel. */
function camButtons() {
  const wrap = document.createElement('div');
  wrap.id = 'camc';
  wrap.style.cssText = 'position:fixed;left:10px;top:calc(env(safe-area-inset-top, 0px) + 58px);display:flex;flex-direction:column;align-items:flex-start;gap:6px;z-index:6;user-select:none;touch-action:manipulation';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,34px);gap:4px';
  const style = 'width:34px;height:34px;font-size:16px;line-height:1;color:#f0d890;background:#2a1a10cc;border:1px solid #a07838;border-radius:6px;cursor:pointer;padding:0';
  const B = (t, tip, f, rep, into = grid) => {
    const b = document.createElement('button');
    b.textContent = t; b.title = tip; b.style.cssText = style;
    let iv = null; const stop = () => { clearInterval(iv); iv = null; };
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); f(); if (rep) iv = setInterval(f, 90); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    into.append(b); return b;
  };
  let open = false;   // os comandos sempre começam ocultos
  const tog = B('📷', 'Mostrar / ocultar os comandos de câmera', () => {
    open = !open; CAMUI.open = open; if (open) { P.tgt = null; P.tx = P.x; P.tz = P.z; cancelStair(); cancelDoor(); } grid.style.display = open ? 'grid' : 'none'; tog.style.opacity = open ? '1' : '.65';
  }, false, wrap);
  tog.style.cssText = 'width:40px;height:40px;font-size:18px;color:#fff;background:#1c1208e0;border:2px solid #a07a3a;border-radius:4px;cursor:pointer;padding:0';
  B('⟲', 'Girar câmera (←)', () => rotateBy(-.1), true); B('▲', 'Inclinar para cima (↑)', () => tiltBy(.06), true); B('⟳', 'Girar câmera (→)', () => rotateBy(.1), true);
  B('＋', 'Aproximar (+)', () => zoomBy(.92), true); B('▼', 'Inclinar para baixo (↓)', () => tiltBy(-.06), true); B('－', 'Afastar (−)', () => zoomBy(1.08), true);
  B('', '', () => {}).style.visibility = 'hidden'; B('⌂', 'Restaurar câmera (Home / 0)', resetCamera); B('', '', () => {}).style.visibility = 'hidden';
  grid.style.display = open ? 'grid' : 'none'; tog.style.opacity = open ? '1' : '.65';
  wrap.append(grid);
  document.body.append(wrap);
}
