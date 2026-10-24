/* NPCs da vila (cidadãos e guardas): usam o mesmo modelo/esqueleto do personagem (person)
   e mudam só a roupa, o chapéu e o que carregam. */
import { scene, ren } from '../core/engine.js';
import { M } from '../core/utils.js';
import { P } from './player.js';
import { person } from './character.js';
import { gait, gaitSpeed } from './gait.js';
import { collide, steer, navTarget } from '../systems/steer.js';
import { initSmith, updateSmith, updateSparks } from './npc-work.js';
import { cam } from '../core/engine.js';
import { openDialog, closeDialog, dialogOpen } from '../ui/dialog.js';
import { $ } from '../core/utils.js';
import { groundY } from '../world/terrain.js';

const list = [];
export const npcList = list;
/** NPC (cidadão) que mantém a loja `kind` */
export const npcByShop = kind => list.find(n => n.info && n.info.shop === kind && n.g.visible !== false);
const turn = (a, b, k) => { let d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k); };

/** Peças do chapéu em g.head.children: 0 rosto (fundido) · 1-2 olhos · 3 aba · 4 copa · 5 caveira · 6 pena */
function hatStyle(g, kind, col) {
  const [, , , brim, top, skull, plume] = g.head.children;
  const set = (m, c) => m.material.color.set(c);
  if (kind === 'pirate') return; // mantém o chapéu do personagem
  skull.visible = plume.visible = false;
  if (kind === 'straw') { set(brim, 0xd8bc70); brim.scale.set(1.25, 1, 1.25); set(top, 0xc8a85a); }
  else if (kind === 'bandana') { brim.visible = false; top.scale.set(1.05, .45, 1.05); top.position.y -= .06; set(top, col); }
  else if (kind === 'cap') { set(brim, col); brim.scale.set(.7, 1, .7); set(top, col); top.scale.set(1, .6, 1); top.position.y -= .04; }
  else if (kind === 'hair') { brim.visible = false; set(top, col); top.scale.set(1.05, .55, 1.05); top.position.y -= .03; }
  else if (kind === 'helmet') {
    brim.visible = false;
    set(top, 0x9aa0a8); top.scale.set(1.18, 1.25, 1.18); top.position.y += .02;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .04), M(0x8a9098));
    nose.position.set(0, top.position.y - .22, .21);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(.08, .22, .4), M(0xb02020));
    crest.position.set(0, top.position.y + .26, 0);
    g.head.add(nose, crest);
  }
}

/** Roupa extra em cima do corpo base */
function dress(g, role, v) {
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y - .72, z); g.up.add(m); return m; };
  if (role === 'guard') {
    hatStyle(g, 'helmet');
    box(.7, .55, .46, 0x9aa0a8, 0, 1.22, 0);          // peitoral
    box(.3, .62, .04, 0xb02020, 0, 1.1, .25);          // tabardo
    box(.3, .22, .3, 0x8a9098, -.44, 1.55, 0);         // ombreiras
    box(.3, .22, .3, 0x8a9098, .44, 1.55, 0);
    // escudo no braço livre
    const sh = new THREE.Mesh(new THREE.BoxGeometry(.06, .6, .46), M(0x4a5a7a));
    sh.position.set(.14, -.3, .06);
    g.armL.fa.add(sh);
    const em = new THREE.Mesh(new THREE.BoxGeometry(.07, .2, .2), M(0xe0b030));
    em.position.set(.16, -.3, .06);
    g.armL.fa.add(em);
    // lança na mão da arma (a espada do modelo base some)
    g.arm.fa.children.forEach(c => { if (c.geometry.parameters.height === .95) c.visible = false; });
    const sp = new THREE.Group();
    sp.add(new THREE.Mesh(new THREE.BoxGeometry(.06, 2.5, .06), M(0x6a4a2a)));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 4), M(0xd8dce0));
    tip.position.y = 1.45;
    sp.add(tip);
    sp.position.set(0, .3, .02);
    g.arm.fa.add(sp);
  } else {
    g.arm.fa.children.forEach(c => { if (c.geometry.parameters.height === .95) c.visible = false; });
    const kinds = ['straw', 'bandana', 'cap', 'hair'];
    hatStyle(g, kinds[v % 4], [0xc84a3a, 0x3a6a9a, 0x6a4a2a, 0x2a2018][v % 4]);
    if (v % 2 === 0) box(.5, .55, .04, 0xe8e0c8, 0, 1.0, .21);   // avental
    if (v % 3 === 0) box(.64, .1, .4, 0x6a4a2a, 0, 1.52, 0);      // colete/alça
  }
}

/** Cria um NPC: role 'guard' (fica no posto, olhando para fora) ou 'citizen' (passeia perto de casa) */
export function makeNpc(role, x, z, ry, cols, v = 0, info = null, work = null) {
  const g = person(...cols);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  dress(g, role, v);
  scene.add(g);
  let lab = null;
  if (role === 'citizen' && info) { lab = document.createElement('div'); lab.className = 'npcl'; lab.textContent = info.ic + ' ' + info.name; ren.domElement.after(lab); }
  const n = { info, lab, g, role, hx: x, hz: z, ry, ph: Math.random() * 6, t: 2 + Math.random() * 4, tx: x, tz: z, vx: 0, vz: 0, sm: { side: 0 } };
  if (work && work.kind === 'smith') initSmith(n, work.at, work.th);
  list.push(n);
  return n;
}

/** NPC mais perto do ponto (x,z) do mundo (para o clique) */
export function npcAt(x, z) {
  let b = null, bd = 1.8;
  list.forEach(n => { if (!n.g.visible) return; const d = Math.hypot(n.g.position.x - x, n.g.position.z - z); if (d < bd) { bd = d; b = n; } });
  return b;
}

let want = null, talking = null;
export const cancelTalk = () => { want = null; };

/** Clique em um NPC: vai até ele e abre a conversa ao chegar */
export function talkTo(n) {
  want = n;
  P.tgt = null;
  const dx = P.x - n.g.position.x, dz = P.z - n.g.position.z, d = Math.hypot(dx, dz) || 1;
  P.tx = n.g.position.x + dx / d * 2.3;
  P.tz = n.g.position.z + dz / d * 2.3;
  if (d < 3.4) arrive(n);
}

function arrive(n) {
  want = null;
  talking = n;
  P.tx = P.x; P.tz = P.z;
  openDialog(n.info);
}

const v3 = new THREE.Vector3();

/** Baú de armazenamento: clicável como um NPC (usa o mesmo diálogo) */
export function makeChest(x, z, ry, info) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const bx = (w, h, d, c, px, py, pz, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(px, py, pz); (par || g).add(m); return m; };
  const WOOD = 0x6a4020, DARK = 0x3a2412, IRON = 0x2c2c32, GOLD = 0xf0c040;
  // corpo: tábuas horizontais com frestas escuras, pés e cantoneiras de ferro
  bx(1.5, .62, .9, DARK, 0, .38, 0);
  for (let i = 0; i < 4; i++) [.452, -.452].forEach(pz => bx(1.52, .14, .02, i % 2 ? 0x5e3818 : WOOD, 0, .12 + i * .15 + .08, pz));
  [-.76, .76].forEach(px => bx(.02, .6, .92, WOOD, px, .39, 0));
  [[-.7, -.4], [.7, -.4], [-.7, .4], [.7, .4]].forEach(([px, pz]) => {
    bx(.16, .1, .16, DARK, px, .05, pz);
    bx(.12, .66, .12, IRON, px, .39, pz);
  });
  bx(1.54, .07, .94, IRON, 0, .05 + .1, 0).scale.set(1, .6, 1);
  [-.5, .5].forEach(px => { bx(.1, .66, .96, 0x8a6a20, px, .39, 0); });   // cintas de latão
  // interior escuro e tesouro (só aparece com a tampa aberta)
  bx(1.3, .02, .72, 0x120a05, 0, .705, 0);
  const treasure = new THREE.Group(); g.add(treasure);
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .02, 8), M(i % 5 === 0 ? 0xe8e8f0 : GOLD));
    c.position.set((Math.random() - .5) * 1.1, .72 + Math.random() * .1, (Math.random() - .5) * .55);
    c.rotation.set((Math.random() - .5) * .9, 0, (Math.random() - .5) * .9); treasure.add(c);
  }
  [[-.35, .1, 0xd02040], [.3, -.12, 0x20b070], [.0, .2, 0x3060e0]].forEach(([px, pz, c]) => {
    const gm = new THREE.Mesh(new THREE.OctahedronGeometry(.07), M(c)); gm.position.set(px, .8, pz); treasure.add(gm);
  });
  bx(.5, .06, .18, 0xb02020, .45, .74, .1).rotation.y = .5;     // colar/tecido
  // tampa articulada: pivô na borda de trás, abre para cima
  const lidP = new THREE.Group(); lidP.position.set(0, .7, -.45); g.add(lidP);
  const sh = new THREE.Shape(); sh.moveTo(-.45, 0);
  for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI; sh.lineTo(Math.cos(a) * .45, Math.sin(a) * .3); }
  const lg = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false });
  lg.translate(0, 0, -.75); lg.rotateY(Math.PI / 2); lg.translate(0, 0, .45);
  const lid = new THREE.Mesh(lg, M(0x7a4a26)); lidP.add(lid);
  [-.5, .5].forEach(px => { const b = new THREE.Mesh(lg.clone().scale(.07 / 1.5, 1.03, 1.03), M(0x8a6a20)); b.position.x = px; lidP.add(b); });
  bx(1.52, .05, .05, IRON, 0, .02, .9, lidP);                 // borda de ferro à frente
  bx(.22, .28, .06, GOLD, 0, -.1, .92, lidP);                 // fechadura
  bx(.06, .1, .05, DARK, 0, -.14, .96, lidP);
  [[-.6, .2], [.6, .2], [-.6, .7], [.6, .7]].forEach(([px, pz]) => { const st = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), M(GOLD)); st.position.set(px, .2 * Math.cos((pz - .45) * 2.6) + .08, pz); lidP.add(st); });
  scene.add(g);
  const lab = document.createElement('div');
  lab.className = 'npcl';
  lab.textContent = info.ic + ' ' + info.name;
  ren.domElement.after(lab);
  list.push({ info, lab, g, role: 'chest', ly: 1.7, lid: lidP, open: 0 });
}

/** Mural de missões: clicável como um NPC (mostra cartazes no diálogo) */
export function makeBoard(x, z, ry, info) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const bx = (w, h, d, c, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(px, py, pz); g.add(m); return m; };
  bx(.14, 2.6, .14, 0x4a2c14, -1.1, 1.3, 0); bx(.14, 2.6, .14, 0x4a2c14, 1.1, 1.3, 0);   // postes
  bx(2.4, 1.5, .1, 0x6a4a2a, 0, 1.55, 0);                                                 // painel
  bx(2.6, .12, .3, 0x4a2c14, 0, 2.62, 0);                                                 // cobertura
  [[-.7, 1.9, .5, .65, 0xe8dcb8], [.05, 1.95, .55, .7, 0xe0d2a8], [.75, 1.85, .5, .6, 0xeadfc0], [-.35, 1.2, .5, .5, 0xe0d2a8], [.4, 1.2, .6, .45, 0xe8dcb8]].forEach(([px, py, w, h, c]) => {
    bx(w, h, .03, c, px, py, .07);
    bx(.08, .08, .035, 0xb02020, px, py + h / 2 - .08, .09);                               // lacre
  });
  bx(.3, .3, .035, 0x2a2a2a, .05, 1.95, .1);                                              // caveira do cartaz de procurado
  scene.add(g);
  const lab = document.createElement('div');
  lab.className = 'npcl';
  lab.textContent = info.ic + ' ' + info.name;
  ren.domElement.after(lab);
  list.push({ info, lab, g, role: 'chest', ly: 3.1 });
}

export function updateNpcs(dt, now) {
  const t0 = now / 1000;
  updateSparks(dt);
  if (want && Math.hypot(P.x - want.g.position.x, P.z - want.g.position.z) < 3.4) arrive(want);
  if (talking && (P.dead || Math.hypot(P.x - talking.g.position.x, P.z - talking.g.position.z) > 7.5 || !dialogOpen())) { talking = null; closeDialog(); }
  const ct = talking && talking.lid ? talking : null;
  P.rumOn = !!ct;
  if (ct) {
    const cx = ct.g.position.x, cz = ct.g.position.z, dx = P.x - cx, dz = P.z - cz, d = Math.hypot(dx, dz) || 1;
    if (Math.hypot(P.tx - P.x, P.tz - P.z) > .8) { talking = null; closeDialog(); P.rumOn = false; }   // clicou para andar: sai
    else if (d > 1.5) { const k = Math.min(1, dt * 2.5 / (d - 1.5)); P.x -= dx / d * (d - 1.5) * k; P.z -= dz / d * (d - 1.5) * k; P.tx = P.x; P.tz = P.z; }
    P.rumYaw = Math.atan2(cx - P.x, cz - P.z);
  }
  list.forEach(n => {
    const g = n.g, t = t0 + n.ph;
    if (n.lab) {
      v3.set(g.position.x, n.ly || 2.7, g.position.z).project(cam);
      const vis = n.g.visible && v3.z < 1 && Math.hypot(P.x - g.position.x, P.z - g.position.z) < 20;
      n.lab.style.display = vis ? 'block' : 'none';
      if (vis) { n.lab.style.left = (v3.x * .5 + .5) * innerWidth + 'px'; n.lab.style.top = (-v3.y * .5 + .5) * innerHeight + 'px'; }
    }
    if (n.lid) {
      const on = talking === n ? 1 : 0;
      n.open += (on - n.open) * (1 - Math.exp(-dt * (on ? 5 : 7)));
      const o = n.open, back = o > .5 ? 1 + Math.sin((o - .5) * 9) * .0 : 1;
      n.lid.rotation.x = -(o * 1.95 + Math.sin(o * Math.PI) * .12 * 0) * back;
    }
    // longe do jogador: não desenha nem processa (o ferreiro controla a própria visibilidade)
    if (Math.hypot(P.x - g.position.x, P.z - g.position.z) > 66) { if (!n.job) g.visible = false; return; }
    if (!n.job) g.visible = true;
    if (n.role === 'chest') return;
    if (n.job) {
      updateSmith(n, dt, now, [P.x, P.z], talking === n);
      return;
    }
    if (n.role === 'citizen') {
      n.t -= dt;
      const near = talking === n || Math.hypot(P.x - g.position.x, P.z - g.position.z) < 5;
      if (n.t <= 0) { n.t = 3 + Math.random() * 5; const a = Math.random() * 6.28, r = Math.random() * 3.2; n.tx = n.hx + Math.cos(a) * r; n.tz = n.hz + Math.sin(a) * r; }
      const dx = n.tx - g.position.x, dz = n.tz - g.position.z, d = Math.hypot(dx, dz), want = d > .4 && !near ? 1.1 : 0;
      let wx = 0, wz = 0;
      if (want) {
        const [gx, gz] = navTarget(n.sm, g.position.x, g.position.z, n.tx, n.tz, .5, now);
        const gd = Math.hypot(gx - g.position.x, gz - g.position.z) || 1;
        [wx, wz] = steer(g.position.x, g.position.z, (gx - g.position.x) / gd * want, (gz - g.position.z) / gd * want, .5, n.sm, Math.min(gd, d));
      }
      const k = 1 - Math.exp(-dt * 6);
      n.vx += (wx - n.vx) * k; n.vz += (wz - n.vz) * k;
      g.position.x += n.vx * dt; g.position.z += n.vz * dt;
      collide(g.position, .5);
      const sp = Math.hypot(n.vx, n.vz), mv = Math.min(1, sp / 1.1);
      if (sp > .2) g.rotation.y = turn(g.rotation.y, Math.atan2(n.vx, n.vz), dt * 8);
      else if (near) g.rotation.y = turn(g.rotation.y, Math.atan2(P.x - g.position.x, P.z - g.position.z), dt * 3);
      n.spd = sp;
    }
    // marcha, respiração, olhar e piscar (a mesma do personagem)
    g.up.rotation.set(0, 0, 0);
    g.position.y = groundY(g.position.x, g.position.z);   // a marcha desce o corpo a cada passo: parte sempre do chão (senão acumula e afunda)
    const gr = gait(g, dt, gaitSpeed(n.spd || 0), { sword: false });
    if (n.role === 'citizen') g.arm.rotation.x = -gr.w * gr.sw * .8;
    if (n.role === 'guard') g.head.rotation.y += Math.sin(t * .4) * .5;   // sentinela varre o olhar
  });
}
