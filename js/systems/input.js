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
import { zoomBy, rotateBy, tiltBy, resetCamera } from './camera.js';
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
import { PICKDBG, flashBlocked } from './settings.js';
import { wakeUp } from './bed.js';
import { npcAt, talkTo, cancelTalk } from '../entities/npc.js';
import { closePanel, openTab } from '../ui/panel.js';
import { toggleMount, MOUNT } from './mount.js';

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = false;

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
        if (stairClick(ux, uz)) { P.tgt = null; mark.position.set(ux, markY(ux, uz), uz); }
        return;
      }
    } else return;
  }

  { const up = P.up && floorLevelH() > 0; PICKDBG.x = aim.x; PICKDBG.z = aim.z; PICKDBG.y = up ? groundY(P.x, P.z) + floorLevelH() : groundY(aim.x, aim.z); PICKDBG.on = true; PICKDBG.up = up; }
  cancelStair(); cancelDoor();
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
  cancelTalk();

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

  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) tiltBy(-e.deltaY * .002); else zoomBy(Math.exp(e.deltaY * .0015)); }, { passive: false });

  cv.addEventListener('pointerdown', e => {
    if (e.button === 1 || e.button === 2) { orbit = { x: e.clientX, y: e.clientY }; return; }
    pts.set(e.pointerId, e);
    if (pts.size === 2) { clearTimeout(wait); down = false; P.tgt = null; P.tx = P.x; P.tz = P.z; cancelStair(); cancelDoor(); gest = { ...pair(), sd: pair().d, ca: 0, mode: null }; return; } // segundo dedo: vira gesto, cancela o toque
    if (e.pointerType === 'touch') {
      // espera um instante: se um segundo dedo chegar, era o início de um gesto e o personagem não anda
      down = true; pick(e.clientX, e.clientY);   // sem espera: anda no mesmo instante (se virar gesto de dois dedos, o passo é desfeito)
    } else { down = true; pick(e.clientX, e.clientY); }
  });

  cv.addEventListener('pointermove', e => {
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
    if (e.code === 'KeyH') toggleMount();
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
  $('sm').onclick = toggleMount;
  $('sa').onclick = togAuto;
  $('gwl').onclick = () => openTab('char');
  $('gwr').onclick = () => openTab('pets');
  $('pcl').onclick = closePanel;
  camButtons();
  $('pcl2x').onclick = closePanel;
}

/** Botões de câmera na tela (toque/mouse): girar, inclinar, aproximar/afastar e restaurar. O ícone 📷 mostra/oculta o painel. */
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
    open = !open; grid.style.display = open ? 'grid' : 'none'; tog.style.opacity = open ? '1' : '.65';
  }, false, wrap);
  tog.style.cssText = 'width:40px;height:40px;font-size:18px;color:#fff;background:#1c1208e0;border:2px solid #a07a3a;border-radius:4px;cursor:pointer;padding:0';
  B('⟲', 'Girar câmera (←)', () => rotateBy(-.1), true); B('▲', 'Inclinar para cima (↑)', () => tiltBy(.06), true); B('⟳', 'Girar câmera (→)', () => rotateBy(.1), true);
  B('＋', 'Aproximar (+)', () => zoomBy(.92), true); B('▼', 'Inclinar para baixo (↓)', () => tiltBy(-.06), true); B('－', 'Afastar (−)', () => zoomBy(1.08), true);
  B('', '', () => {}).style.visibility = 'hidden'; B('⌂', 'Restaurar câmera (Home / 0)', resetCamera); B('', '', () => {}).style.visibility = 'hidden';
  grid.style.display = open ? 'grid' : 'none'; tog.style.opacity = open ? '1' : '.65';
  wrap.append(grid);
  document.body.append(wrap);
}
