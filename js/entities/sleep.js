/* Dormir: pose deitada de costas (serve ao jogador e a qualquer NPC com o rig humano) e os "Zzz" que sobem da cabeça.
   O corpo gira em torno dos pés (origem do grupo): a cabeça fica para o lado -z do giro em Y do personagem. */
import { scene } from '../core/engine.js';
import { gaitReset } from './gait.js';

/** Dormindo de verdade: o relógio do jogo corre mais rápido (a noite passa) */
export const SLEEP = { fast: 1 };

const ss = x => x * x * (3 - 2 * x);

/** k = 0 em pé … 1 deitado e dormindo; t = tempo (respiração) */
export function lieDown(g, k, t) {
  const e = ss(Math.max(0, Math.min(1, k)));
  g.rotation.order = 'YXZ';
  gaitReset(g);
  g.rotation.x = -Math.PI / 2 * e;
  g.up.rotation.set(0, 0, 0);
  g.legL.rotation.set(0, 0, -.06 * e); g.legR.rotation.set(0, 0, .06 * e);
  g.legL.knee.rotation.x = g.legR.knee.rotation.x = .05 * e;
  g.arm.rotation.set(-.25 * e, 0, .12 * e); g.arm.fa.rotation.x = -.5 * e;               // mão sobre a barriga
  g.armL.rotation.set(-.25 * e, 0, -.12 * e); g.armL.fa.rotation.x = -.55 * e;
  g.head.rotation.set(-.08 * e, Math.sin(t * .35) * .04 * e, 0);
  const br = Math.sin(t * 1.5) * .012 * e;                                                 // respiração
  g.up.position.y = .72 + br;
  if (g.eyeL) g.eyeL.scale.y = g.eyeR.scale.y = 1 - .92 * e;                               // olhos fechados
}

/** Levantou: desfaz a rotação do deitar */
export function standFromBed(g) {
  g.rotation.x = 0;
  if (g.eyeL) g.eyeL.scale.y = g.eyeR.scale.y = 1;
}

/** Três "Z" que sobem e somem sobre a cabeça */
let ZTEX = null;
function zTex() {
  if (ZTEX) return ZTEX;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.font = 'bold 54px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = '#1c2a4a'; x.strokeText('Z', 32, 34); x.fillStyle = '#e8f0ff'; x.fillText('Z', 32, 34);
  return (ZTEX = new THREE.CanvasTexture(c));
}
export function makeZzz() {
  const grp = new THREE.Group(), sp = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex(), transparent: true, opacity: 0, depthWrite: false }));
    s.userData.dyn = 1; grp.add(s); sp.push(s);
  }
  grp.visible = false; scene.add(grp);
  return {
    g: grp,
    update(x, y, z, t, on) {
      grp.visible = on;
      if (!on) return;
      grp.position.set(x, y, z);
      sp.forEach((s, i) => {
        const u = ((t * .38 + i / 3) % 1);
        s.position.set(u * .45 + Math.sin(u * 6) * .06, u * .95, 0);
        const sc = .22 + u * .3; s.scale.set(sc, sc, 1);
        s.material.opacity = Math.sin(Math.PI * u) * .95;
      });
    }
  };
}
