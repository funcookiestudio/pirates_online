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
import { zoomBy, rotateBy } from './camera.js';
import { toggleSit, standUp } from './rest.js';
import { togglePet } from '../pets/manager.js';
import { freePoint } from './steer.js';
import { clickCave } from '../world/caves.js';
import { groundY } from '../world/terrain.js';
import { npcAt, talkTo, cancelTalk } from '../entities/npc.js';
import { closePanel, openTab } from '../ui/panel.js';
import { toggleMount } from './mount.js';

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = false;

/** Clique/toque na tela: seleciona um inimigo próximo ou define o destino no chão */
function pick(cx, cy) {
  if (P.sit > 0 || P.sitT) standUp(); // clicar no mundo levanta o personagem
  state.autoHold = 2.5; // assume o controle do auto combate por 2,5 s
  pointer.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, cam);
  ray.ray.intersectPlane(ground, aim);
  // relevo: avança pelo raio até o chão real (morros e cais), em vez do plano y=0
  { const o = ray.ray.origin, d = ray.ray.direction; let hit = false;
    for (let t = 0; t < 400; t += 1) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y <= groundY(x, z)) {
        let lo = t - 1, hi = t;
        for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; (o.y + d.y * m <= groundY(o.x + d.x * m, o.z + d.z * m)) ? hi = m : lo = m; }
        aim.set(o.x + d.x * hi, 0, o.z + d.z * hi); hit = true; break;
      }
    }
    void hit; }

  if (clickCave(aim.x, aim.z)) { mark.position.set(aim.x, .05, aim.z); return; }
  const n = npcAt(aim.x, aim.z);
  if (n) { P.tgt = null; talkTo(n); mark.position.set(n.g.position.x, .05, n.g.position.z); return; }
  cancelTalk();

  let best = null, bd = 2.2;
  enemies.forEach(e => {
    if (e.dead) return;
    const d = Math.hypot(e.x - aim.x, e.z - aim.z);
    if (d < bd) { bd = d; best = e; }
  });

  P.tgt = best;
  if (!best) {
    const f = freePoint(aim.x, aim.z, .7);
    P.tx = f.x;
    P.tz = f.z;
    mark.position.set(f.x, .05, f.z);
  }
}

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
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * .0015)); }, { passive: false });

  cv.addEventListener('pointerdown', e => {
    if (e.button === 1 || e.button === 2) { orbit = { x: e.clientX }; return; }
    pts.set(e.pointerId, e);
    if (pts.size === 2) { clearTimeout(wait); down = false; gest = { ...pair(), sd: pair().d, ca: 0, mode: null }; return; } // segundo dedo: vira gesto, cancela o toque
    if (e.pointerType === 'touch') {
      // espera um instante: se um segundo dedo chegar, era o início de um gesto e o personagem não anda
      wait = setTimeout(() => { if (pts.size === 1) { down = true; pick(e.clientX, e.clientY); } }, 70);
    } else { down = true; pick(e.clientX, e.clientY); }
  });

  cv.addEventListener('pointermove', e => {
    if (orbit) { if (e.buttons & 6) { rotateBy(-(e.clientX - orbit.x) * .008); orbit.x = e.clientX; } return; }
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
  $('pcl2x').onclick = closePanel;
}
