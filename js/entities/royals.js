/* Rei e rainha: o mesmo modelo de personagem (human.js, skins `rei`/`rainha`), sentados nos tronos do salão
   com idle próprio: respiração, olhar que passeia pela corte, piscar, mão que acaricia o braço do trono, cetro, aceno da rainha. */
import { scene } from '../core/engine.js';
import { person, hideSword } from './character.js';
import { K } from './human.js';

const list = [];
const M = c => new THREE.MeshLambertMaterial({ color: c });
const bx = (w, h, d, x, y, z, c, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
const GOLD = 0xe0b84a;

/** Cria o monarca sentado em (x,y,z) do mundo (y = topo da almofada do trono), olhando para `ry` */
export function makeRoyal(kind, x, y, z, ry) {
  const queen = kind === 'queen';
  const g = person(0xf2c29b, 0, 0, 0, { sk: queen ? 'rainha' : 'rei', f: queen, ov: { skin: queen ? 0xf5cfb0 : 0xf0c096 } });
  hideSword(g);
  const o = new THREE.Group(); o.position.set(x, y - .72 + .02, z); o.rotation.y = ry; o.userData.dyn = true; o.add(g); scene.add(o);
  g.position.set(0, 0, .06);
  bx(.7, .22, .4, 0, .24 - .02, .47, 0x7a1c2c, o); bx(.74, .04, .44, 0, .35, .47, GOLD, o);   // banquinho de veludo para os pés
  if (queen) {      // saia sobre as coxas e caindo à frente dos joelhos
    bx(.8, .12, .62, 0, .7, .42, 0x5a2a7a, g); bx(.78, .5, .1, 0, .44, .73, 0x5a2a7a, g); bx(.8, .07, .12, 0, .2, .73, GOLD, g);
    bx(.3, .3, .3, 0, .72, .1, 0x5a2a7a, g);
  } else {          // cetro na mão do braço da arma (o grupo gira para ficar em pé com o antebraço na horizontal)
    const sc = new THREE.Group(); sc.position.set(0, -.34, 0); sc.rotation.x = Math.PI / 2; g.arm.fa.add(sc);
    const cyl = (r, h, yy, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), M(c)); m.position.y = yy; sc.add(m); return m; };
    cyl(.022, 1.0, 0, 0xc9a23c); cyl(.034, .06, .3, GOLD); cyl(.034, .06, -.3, GOLD);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), M(GOLD)); orb.position.y = .56; sc.add(orb);
    const ruby = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), M(0xc0203a)); ruby.position.y = .64; sc.add(ruby);
  }
  const r = { g, o, queen, t: Math.random() * 10, blink: 0, nextBlink: 2, wave: 0, nextWave: 4 + Math.random() * 3, gaze: 0, gazeT: 0, nextGaze: 2 };
  list.push(r);
  return r;
}

const ss = (a, b, k) => a + (b - a) * Math.min(1, k);

/** Idle sentado: chamada todo quadro */
export function updateRoyals(dt) {
  for (const r of list) {
    const { g, queen } = r;
    r.t += dt;
    const t = r.t, br = Math.sin(t * 1.5);
    // postura: coxas na horizontal, canelas para baixo, tronco ereto com a respiração
    g.legL.rotation.set(-1.52, 0, -.08); g.legR.rotation.set(-1.52, 0, .08);
    g.legL.knee.rotation.x = 1.5; g.legR.knee.rotation.x = 1.5;
    g.legL.foot.rotation.x = g.legR.foot.rotation.x = -.05;
    g.up.position.set(0, .72 + br * .004, 0);
    g.up.rotation.set(-.06 + br * .012, Math.sin(t * .22) * .03, 0);
    // olhar: passeia pelo salão e volta ao centro
    r.nextGaze -= dt;
    if (r.nextGaze <= 0) { r.gaze = (Math.random() - .5) * (queen ? .9 : .7); r.gazeP = (Math.random() - .3) * .12; r.nextGaze = 2.5 + Math.random() * 4; if (Math.random() < .35) { r.gaze = 0; r.gazeP = 0; } }
    g.head.rotation.y = ss(g.head.rotation.y, r.gaze || 0, dt * 1.6);
    g.head.rotation.x = ss(g.head.rotation.x, (r.gazeP || 0) + br * .01, dt * 1.6);
    g.head.rotation.z = Math.sin(t * .4) * .015;
    // piscar
    r.nextBlink -= dt;
    if (r.nextBlink <= 0) { r.blink = .14; r.nextBlink = 2 + Math.random() * 3.5; }
    r.blink = Math.max(0, r.blink - dt);
    const ey = r.blink > 0 ? .1 : 1; g.eyeL.scale.y = ey; g.eyeR.scale.y = ey;
    // braços
    const ar = g.arm, al = g.armL;       // ar = lado do cetro / mão que acena · al = mão que repousa no braço do trono
    if (queen) {
      r.nextWave -= dt;
      if (r.nextWave <= 0 && !r.wave) { r.wave = .001; r.nextWave = 7 + Math.random() * 5; }
      let up = 0;
      if (r.wave) { r.wave += dt; const w = r.wave / 3.2; if (w >= 1) r.wave = 0; else up = Math.sin(w * Math.PI) ** .6; }
      ar.rotation.set(-up * 1.0, 0, -.1 - up * .15); ar.fa.rotation.x = -1.9 + up * .65 + Math.sin(t * 8) * .14 * up;   // aceno gracioso
      al.rotation.set(br * .01, 0, .1); al.fa.rotation.x = -1.9;
    } else {
      ar.rotation.set(Math.sin(t * .5) * .015, 0, -.1); ar.fa.rotation.x = -1.9;           // segura o cetro sobre o braço do trono
      const st = Math.max(0, Math.sin(t * .3 - 1)) ** 2;                                    // de tempos em tempos, acaricia a barba
      al.rotation.set(-st * 1.1, 0, .1 - st * .1); al.fa.rotation.x = -1.9 + st * .75 + Math.sin(t * 2.2) * .04 * st;
    }
  }
}
