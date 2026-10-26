/* NPCs da vila (cidadãos e guardas): usam o mesmo modelo/esqueleto do personagem (person)
   e mudam só a roupa, o chapéu e o que carregam. */
import { houseAt } from '../world/floors.js';
import { enterClick, openDoorById, doorClosed, tickRent, setDoorLock, npcOpenDoor, doorFront } from '../world/doors.js';
import { VILLAGE_R } from '../core/village-const.js';
import { scene, ren } from '../core/engine.js';
import { M } from '../core/utils.js';
import { P } from './player.js';
import { person, hideSword } from './character.js';
import { gait, gaitSpeed } from './gait.js';
import { collide, steer, navTarget } from '../systems/steer.js';
import { tickClock, hourNow } from '../core/clock.js';
import { HL } from '../world/house-lights.js';
import { isEvening, isNight } from '../world/daynight.js';
import { lieDown, standFromBed, makeZzz } from './sleep.js';
import { SLEEP } from './sleep.js';
import { farmerThink, farmerPose, farmerSleep, refreshField } from './farmer.js';
import { initSmith, updateSmith, updateSparks } from './npc-work.js';
import { tradeThink, tradeWind, tradePose } from './npc-trades.js';
import { cam } from '../core/engine.js';
import { openDialog, closeDialog, dialogOpen } from '../ui/dialog.js';
import { $ } from '../core/utils.js';
import { log } from '../ui/notify.js';
import { groundY } from '../world/terrain.js';
import { planInterior } from '../world/interior-nav.js';
import { CFG } from '../systems/settings.js';

const list = [];
export const npcList = list;
/** NPC (cidadão) que mantém a loja `kind` */
export const npcByShop = kind => list.find(n => n.info && n.info.shop === kind && n.g.visible !== false);
/** Baú da vila */
export const npcChest = () => list.find(n => n.role === 'chest' && n.info && n.info.chest);
const turn = (a, b, k) => { let d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k); };

/** Skin do NPC: a da ficha (info.skin = [skin, feminino?, ajustes]) ou, na falta dela, uma pelo índice de variação */
const FALL = [['fazendeiro', 0], ['taberneiro', 1], ['ferreiro', 0], ['alquimista', 0], ['pirata', 1]];
function specFor(role, v, info, cols) {
  const s = (info && info.skin) || (role === 'guard' ? ['guarda', 0] : FALL[v % FALL.length]);
  return { sk: s[0], f: !!s[1], ov: Object.assign({ skin: cols[0] }, s[2] || {}) };
}

/** Armadura do guarda (corpo novo, maior): elmo, peitoral, ombreiras, tabardo, escudo e lança */
function dress(g, soldier) {
  if (!soldier) { hideSword(g); return; }
  const box = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); p.add(m); return m; };
  // escudo no braço livre
  box(.06, .6, .46, 0x4a5a7a, .22, -.3, .06, g.armL.fa);
  box(.07, .2, .2, 0xe0b030, .24, -.3, .06, g.armL.fa);
  // lança na mão da arma (a espada do modelo base some)
  hideSword(g);
  const sp = new THREE.Group();
  sp.add(new THREE.Mesh(new THREE.BoxGeometry(.06, 2.5, .06), M(0x6a4a2a)));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 4), M(0xd8dce0));
  tip.position.y = 1.45;
  sp.add(tip);
  sp.position.set(0, .3, .02);
  g.arm.fa.add(sp);
}

/** Cria um NPC: role 'guard' (fica no posto, olhando para fora) ou 'citizen' (passeia perto de casa) */
export function makeNpc(role, x, z, ry, cols, v = 0, info = null, work = null) {
  const sp = specFor(role, v, info, cols);
  const g = person(cols[0], cols[1], cols[2], cols[3], sp);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  dress(g, sp.sk === 'guarda');
  scene.add(g);
  let lab = null;
  if (role === 'citizen' && info) { lab = document.createElement('div'); lab.className = 'npcl'; lab.textContent = info.ic + ' ' + info.name; ren.domElement.after(lab); }
  const n = { info, lab, g, role, hx: x, hz: z, ry, ph: Math.random() * 6, t: 2 + Math.random() * 4, tx: x, tz: z, vx: 0, vz: 0, sm: { side: 0 } };
  if (work && work.talkAt) { n.talkAt = work.talkAt; n.doorId = work.doorId; n.sbed = work.bed || null; }
  if (work && work.kind === 'tenant') n.tn = work.room;
  if (work && work.kind === 'smith') initSmith(n, work.at, work.th, work.pts);
  list.push(n);
  return n;
}

/** NPC mais perto do ponto (x,z) do mundo (para o clique) */
export function npcAt(x, z) {
  let b = null, bd = 1.8;
  if (P.up) return null;   // no andar de cima da taberna não se clica em NPCs
  list.forEach(n => { if (!n.g.visible) return; const d = Math.hypot(n.g.position.x - x, n.g.position.z - z); if (d < bd) { bd = d; b = n; } });
  return b;
}


/* ── Inquilinos da taberna: caminho de verdade até o quarto (porta, escada, corredor, porta do quarto, cama) e de volta ── */
const loc = (tn, x, z) => { const dx = x - tn.o[0], dz = z - tn.o[1], c = Math.cos(tn.th), s = Math.sin(tn.th); return [(dx * c - dz * s) / tn.K, (dx * s + dz * c) / tn.K]; };
const stairY = (tn, x, z, up) => { const [lx, lz] = loc(tn, x, z); if (lx >= -5.1 && lx <= -3.6 && lz >= -1.85 && lz <= 2.8) return tn.H * Math.max(0, Math.min(1, (1.85 - lz) / 3)); return up ? tn.H : 0; };
const planTo = (cur, to, L) => { const p = planInterior(cur[0], cur[1], to[0], to[1], L); return p && p.pts.length ? [...p.pts, to] : [to]; };
const STAIR_UP = [[-4.3, 1.75], [-4.3, .05], [-4.3, -1.3], [-4.3, -1.75]];
function tnScript(n, dt, tn) {
  const g = n.g, q = n.q, K = tn.K, W = (a, b) => tn.at(a * K, b * K), cur = () => [g.position.x, g.position.z];
  const doorW = W(tn.rin[0], tn.rin[1] > 0 ? 1.45 : -1.7);
  const face = (px, pz) => { g.rotation.y = turn(g.rotation.y, Math.atan2(px - g.position.x, pz - g.position.z), dt * 8); n.vx = n.vz = 0; n.spd = 0; };
  const go = (pts, ph, lvl) => { q.ph = ph; q.pts = pts; q.i = 0; if (lvl !== undefined) n.lvl = lvl; };
  const walked = sp => {   // segue os pontos do plano (já livres de móveis e paredes)
    const p = q.pts[q.i]; if (!p) return true;
    const dx = p[0] - g.position.x, dz = p[1] - g.position.z, d = Math.hypot(dx, dz);
    if (d < .14) { q.i++; return q.i >= q.pts.length; }
    const st = Math.min(d, sp * dt); g.position.x += dx / d * st; g.position.z += dz / d * st;
    n.vx = dx / d * sp; n.vz = dz / d * sp; n.spd = sp; g.rotation.y = turn(g.rotation.y, Math.atan2(dx, dz), dt * 10);
    return false;
  };
  const wait = ph => { if (n.dro) { face(doorW[0], doorW[1]); return false; } return true; };
  const hold = id => npcOpenDoor(id, 6);
  switch (q.ph) {
    case 'in': npcOpenDoor('tavern-front', 4); if (walked(1.1)) go(STAIR_UP.map(a => W(a[0], a[1])), 'up'); break;
    case 'up': if (walked(.9)) go(planTo(cur(), W(tn.rin[2], tn.rin[3]), 1), 'cor', 1); break;
    case 'cor': if (walked(1.1)) { n.dro = { id: tn.rid, t: 0, done: false, force: true }; q.ph = 'open'; } break;
    case 'open': hold(tn.rid); if (wait()) go([...planTo(cur(), W(tn.rin[0], tn.rin[1]), 1), tn.bf], 'bed'); break;
    case 'bed': hold(tn.rid); if (walked(1.0)) { n.q = null; n.up = true; n.sl = 0; n.vx = n.vz = 0; n.spd = 0; } break;
    // de manhã: da cama até a rua
    case 'dbed': if (walked(1.0)) { n.dro = { id: tn.rid, t: 0, done: false, force: true }; q.ph = 'dopen'; } break;
    case 'dopen': hold(tn.rid); if (wait()) go(planTo(cur(), W(-4.3, -1.3), 1), 'dcor'); break;
    case 'dcor': hold(tn.rid); if (walked(1.1)) go([...STAIR_UP].reverse().slice(1).concat([[-4.3, 2.5]]).map(a => W(a[0], a[1])), 'ddown'); break;
    case 'ddown': if (walked(.9)) { if (tn.keeper) { go(planTo(cur(), [n.hx, n.hz], 0), 'dhome', 0); break; } const f = doorFront('tavern-front', -1.4); go(planTo(cur(), f.p, 0), 'dout', 0); } break;
    case 'dhome': if (walked(1.0)) { n.q = null; n.lvl = 0; n.fy = 0; n.t = 0; } break;
    case 'dout': if (walked(1.1)) { n.dro = { id: 'tavern-front', t: 0, done: false, force: true }; q.ph = 'dfopen'; } break;
    case 'dfopen': hold('tavern-front'); { const f = doorFront('tavern-front', 0); if (wait()) go([doorFront('tavern-front', 1.8).p], 'dexit'); else face(f.p[0], f.p[1]); } break;
    case 'dexit': hold('tavern-front'); if (walked(1.1)) { n.q = null; n.lvl = 0; n.fy = 0; n.t = 0; } break;
  }
  if (n.q) {   // altura (escada/andar) e visibilidade por andar
    n.fy = stairY(tn, g.position.x, g.position.z, n.lvl === 1);
    const [lx, lz] = loc(tn, g.position.x, g.position.z), inTav = Math.abs(lx) < 5.1 && Math.abs(lz) < 5.1, nUp = n.fy > tn.H * .5;
    g.visible = inTav ? (nUp ? !!P.up : !P.up) : true;
  }
}

HL.asleep = (x, z, r) => list.some(n => n.sl > .5 && Math.hypot(n.g.position.x - x, n.g.position.z - z) < r);   // janela da casa apaga quando o morador dorme
const LABEL_R = 9;   // nome do NPC só aparece com o jogador a menos de 9 m
let want = null, talking = null;
export const cancelTalk = () => { want = null; };

/** Clique em um NPC: vai até ele e abre a conversa ao chegar */
export function talkTo(n) {
  want = n;
  P.tgt = null;
  const dx = P.x - n.g.position.x, dz = P.z - n.g.position.z, d = Math.hypot(dx, dz) || 1;
  if (n.doorId) openDoorById(n.doorId);   // abre a porta da casa dele (se não estiver trancada)
  if (n.talkAt) { P.tx = n.talkAt[0]; P.tz = n.talkAt[1]; }   // NPC dentro de casa: vai ao ponto livre diante dele (pela porta)
  else { P.tx = n.g.position.x + dx / d * 2.3; P.tz = n.g.position.z + dz / d * 2.3; }
  if (behindWall(n)) enterClick(P.tx, P.tz);   // NPC dentro da casa: entra pela porta, alinhado ao tile
  else if (d < 3.4) arrive(n);
}
/** O NPC está dentro de uma casa e o personagem fora dela? (não dá para conversar através da parede) */
const behindWall = n => { const h = houseAt(n.g.position.x, n.g.position.z, .2); return !!h && !P.up && houseAt(P.x, P.z, .2) !== h; };

function arrive(n) {
  want = null;
  talking = n;
  P.tx = P.x; P.tz = P.z;
  if (n.info && n.info.shop && n.info.shop !== 'tavern' && (n.sl > .3 || n.up || isNight(hourNow()))) { talking = null; log('😴 ' + n.info.name + ' está dormindo — a loja abre de manhã'); return; }   // lojas fecham à noite
  openDialog(n.info);
}

const v3 = new THREE.Vector3();

/** Portas das casas de quem mora lá (ferreiro, cartógrafo, mercadora...) ficam trancadas à noite, vistas de fora; a taberna e o castelo ficam de fora da regra */
const inFoot = (h, x, z) => { const dx = x - h.x, dz = z - h.z, lx = (dx * Math.cos(h.th) - dz * Math.sin(h.th)) / h.K, lz = (dx * Math.sin(h.th) + dz * Math.cos(h.th)) / h.K; return Math.abs(lx) <= 4.4 && Math.abs(lz) <= 3.4; };
setDoorLock(d => {
  if (d.room || !isNight(hourNow()) || (d.id && String(d.id).startsWith('tavern')) || d.h.K === 1) return null;   // K=1: castelo
  if (inFoot(d.h, P.x, P.z)) return null;   // quem está dentro sempre pode sair
  const n = list.find(q => q.info && q.role !== 'chest' && !q.tn && (q.job ? inFoot(d.h, q.g.position.x, q.g.position.z) || inFoot(d.h, q.job.bed[0], q.job.bed[1]) : inFoot(d.h, q.hx, q.hz)));
  return n ? n.info.name : null;
});

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

let frameNo = 0;
export function updateNpcs(dt, now) {
  const t0 = now / 1000;
  tickClock(dt * SLEEP.fast);
  tickRent();
  updateSparks(dt);
  if (want && Math.hypot(P.x - want.g.position.x, P.z - want.g.position.z) < 3.4 && !behindWall(want)) arrive(want);
  if (talking && (P.dead || Math.hypot(P.x - talking.g.position.x, P.z - talking.g.position.z) > 7.5 || !dialogOpen())) { talking = null; closeDialog(); }
  const ct = talking && talking.lid ? talking : null;
  P.rumOn = !!ct;
  if (ct) {
    const cx = ct.g.position.x, cz = ct.g.position.z, dx = P.x - cx, dz = P.z - cz, d = Math.hypot(dx, dz) || 1;
    if (Math.hypot(P.tx - P.x, P.tz - P.z) > .8) { talking = null; closeDialog(); P.rumOn = false; }   // clicou para andar: sai
    else if (d > 1.5) { const k = Math.min(1, dt * 2.5 / (d - 1.5)); P.x -= dx / d * (d - 1.5) * k; P.z -= dz / d * (d - 1.5) * k; P.tx = P.x; P.tz = P.z; }
    P.rumYaw = Math.atan2(cx - P.x, cz - P.z);
  }
  frameNo++;
  list.forEach((n, ix) => {   // longe do jogador (e sem script): atualiza 1 quadro a cada 3, com o tempo acumulado
    const far = !n.q && Math.hypot(P.x - n.g.position.x, P.z - n.g.position.z) > 26 && talking !== n;
    if (far) { n.acc = (n.acc || 0) + dt; if ((frameNo + ix) % 3) return; npcStep(n, n.acc); n.acc = 0; }
    else { n.acc = 0; npcStep(n, dt); }
  });
  function npcStep(n, dt) {
    const g = n.g, t = t0 + n.ph;
    if (n.lab) {
      v3.set(g.position.x, n.ly || 2.7, g.position.z).project(cam);
      const vis = CFG.names !== false && n.g.visible && !P.up && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 && Math.hypot(P.x - g.position.x, P.z - g.position.z) < LABEL_R;
      /* só escreve no DOM quando muda (cada escrita invalida o estilo e o celular refaz layout/pintura depois do JS), e move por transform, que não força layout */
      if (n.labOn !== vis) { n.labOn = vis; n.lab.style.display = vis ? 'block' : 'none'; if (vis && n.labX === undefined) { n.lab.style.left = '0'; n.lab.style.top = '0'; } }
      if (vis) {
        const lx = Math.round((v3.x * .5 + .5) * innerWidth), ly = Math.round((-v3.y * .5 + .5) * innerHeight);
        if (lx !== n.labX || ly !== n.labY) { n.labX = lx; n.labY = ly; n.lab.style.transform = 'translate(' + lx + 'px,' + ly + 'px) translate(-50%,-100%)'; }
      }
    }
    if (n.lid) {
      const on = talking === n || n.forceOpen ? 1 : 0;
      n.open += (on - n.open) * (1 - Math.exp(-dt * (on ? 5 : 7)));
      const o = n.open, back = o > .5 ? 1 + Math.sin((o - .5) * 9) * .0 : 1;
      n.lid.rotation.x = -(o * 1.95 + Math.sin(o * Math.PI) * .12 * 0) * back;
    }
    // longe do jogador: não desenha nem processa (o ferreiro controla a própria visibilidade)
    if (Math.hypot(P.x - g.position.x, P.z - g.position.z) > 66) { if (!n.job) g.visible = false; return; }
    if (!n.job && !(n.rt && n.rt.hide) && !n.inHid) g.visible = true;
    if (n.role === 'chest') return;
    if (n.job) {
      const J = n.job, sleepy = isNight(hourNow()) && talking !== n && (!J.away || n.smHid);   // das 21h às 6h o ferreiro dorme na cama (se estiver visível na rua, termina a entrega antes)
      if (sleepy || n.sl > 0) {
        [J.hm, J.tongs, J.mug, J.anvilSword, J.handSword].forEach(o => { if (o) o.visible = false; });
        if (J.glowL) J.glowL.intensity = 0;
        const zz = n.zz || (n.zz = makeZzz());
        if (sleepy) {
          n.sl = Math.min(1, (n.sl || 0) + dt / 1.6); n.vx = n.vz = 0; g.visible = true;
          g.position.set(J.bed[0], J.bedY, J.bed[1]); g.rotation.y = J.bedRy;
          lieDown(g, n.sl, t);
          zz.update(J.bed[0] - Math.sin(J.bedRy) * 1.7, J.bedY + .55, J.bed[1] - Math.cos(J.bedRy) * 1.7, t, n.sl > .95);
        } else {   // amanheceu: levanta e volta para o ponto de trabalho
          n.sl = Math.max(0, n.sl - dt / 1.2); lieDown(g, n.sl, t); zz.update(0, 0, 0, t, false);
          if (n.sl === 0) { standFromBed(g); g.position.set(J.home[0], groundY(J.home[0], J.home[1]), J.home[1]); }
        }
        return;
      }
      updateSmith(n, dt, now, [P.x, P.z], talking === n);
      n.smHid = !g.visible;   // updateSmith esconde o ferreiro quando ele entra na casa/loja
      return;
    }
    if (n.role === 'citizen') {
      n.t -= dt;
      const near = talking === n || Math.hypot(P.x - g.position.x, P.z - g.position.z) < 5;
      if (n.rt) {   // fazendeiro: segue a rotina do dia
        n.rt.fld && ((n.rfT = (n.rfT || 0) - dt) <= 0) && (n.rfT = 1, refreshField(n.rt.fld));
        farmerThink(n, dt, talking === n || Math.hypot(P.x - g.position.x, P.z - g.position.z) < 2.5);
        if (n.rt.hide) { if (n.rt.bed) farmerSleep(n, t, dt); else g.visible = false; return; }
      } else if (n.tn) {   // inquilino da taberna: passeia pela vila de dia; à noite sobe para o seu quarto e dorme
        const h = hourNow(), tn = n.tn, night = isEvening(h);
        if (n.q) { tnScript(n, dt, tn); } else {
        if (n.up) {
          g.visible = !!P.up && Math.hypot(P.x - tn.x, P.z - tn.z) < 14;
          if (night && !talking) {
            n.sl = Math.min(1, (n.sl || 0) + dt / 1.6); g.position.set(tn.x, tn.y, tn.z); g.rotation.y = tn.ry; lieDown(g, n.sl, t);
            const zz = n.zz || (n.zz = makeZzz()); zz.update(tn.x - Math.sin(tn.ry) * 1.7, tn.y + .55, tn.z - Math.cos(tn.ry) * 1.7, t, n.sl > .95);
          } else {   // amanheceu: levanta e desce
            n.sl = Math.max(0, (n.sl || 0) - dt / 1.2); lieDown(g, n.sl, t); if (n.zz) n.zz.update(0, 0, 0, t, false);
            if (n.sl === 0) { standFromBed(g); n.up = false; n.lvl = 1; n.fy = tn.H; n.q = { ph: 'dbed', pts: planTo([tn.x, tn.z], tn.at(tn.rin[0] * tn.K, tn.rin[1] * tn.K), 1), i: 0 }; }
          }
          return;
        }
        if (night && n.tr && tradeWind(n, dt)) { n.tx = g.position.x; n.tz = g.position.z; }   // guardando o ofício do dia
        else if (night) {
          const dd = Math.hypot(g.position.x - tn.door[0], g.position.z - tn.door[1]);
          if (dd < 2.4 && !n.dro && doorClosed(tn.dr)) n.dro = { id: tn.dr, t: 0, done: false };   // estende a mão direita e abre
          const [lx, lz] = loc(tn, g.position.x, g.position.z), inTav = Math.abs(lx) < 4.9 && lz > -4.9 && lz < 4.6;
          const F0 = doorFront('tavern-front', 1.7).p, F1 = doorFront('tavern-front', -1.5).p;
          if (inTav || tn.keeper) { n.lvl = 0; n.vx = n.vz = 0; npcOpenDoor('tavern-front', 4); n.q = { ph: 'in', pts: planTo([g.position.x, g.position.z], tn.sb, 0), i: 0 }; return; }
          // de fora: vai até o ponto diante da porta, abre e atravessa (nunca em linha reta contra a parede)
          const nearF0 = Math.hypot(g.position.x - F0[0], g.position.z - F0[1]) < 1.2;
          const tg = nearF0 && !doorClosed(tn.dr) ? F1 : F0;
          n.tx = tg[0]; n.tz = tg[1];
        } else if (n.tr) { tradeThink(n, dt, now, talking === n); }   // ofício do dia (Breu: lenha · Polly: rede)
        else if (n.t <= 0 || ((n.st = (n.st || 0) + dt) > 12)) {   // novo ponto de passeio: praça, ruas da vila
          n.t = 6 + Math.random() * 8; n.st = 0;
          const a = Math.random() * 6.28, r = tn.keeper ? Math.random() * 3.2 : 3 + Math.random() * (VILLAGE_R - 17);
          if (tn.keeper) { n.t = 3 + Math.random() * 5; n.tx = n.hx + Math.cos(a) * r; n.tz = n.hz + Math.sin(a) * r; } else { n.tx = Math.cos(a) * r; n.tz = Math.sin(a) * r; }
        }
        }
      } else if (isEvening(hourNow()) && !n.job) {   // anoitece: volta para casa; das 21h às 6h dorme
        const h = hourNow(), awake = talking === n, sleepy = isNight(h) && !awake;
        const sb = n.sbed;   // quem tem cama em casa deita nela
        n.tx = sb && sleepy ? sb.ax : n.hx; n.tz = sb && sleepy ? sb.az : n.hz;
        if (sleepy && Math.hypot(g.position.x - n.tx, g.position.z - n.tz) < .7) {
          const bx = sb ? sb.x : n.hx, bz = sb ? sb.z : n.hz, by = sb ? sb.y : groundY(n.hx, n.hz), bry = sb ? sb.ry : n.ry;
          n.sl = Math.min(1, (n.sl || 0) + dt / 1.6); n.vx = n.vz = 0;
          g.position.set(bx, by, bz); g.rotation.y = bry;
          lieDown(g, n.sl, t); const zz = n.zz || (n.zz = makeZzz());
          zz.update(bx - Math.sin(bry) * 1.7, by + .55, bz - Math.cos(bry) * 1.7, t, n.sl > .95);
          return;
        }
      } else if (n.sl > 0) {   // amanheceu: levanta
        n.sl = Math.max(0, n.sl - dt / 1.2); lieDown(g, n.sl, t);
        if (n.zz) n.zz.update(0, 0, 0, t, false);
        if (n.sl === 0) standFromBed(g);
        return;
      } else if (n.t <= 0) { n.t = 3 + Math.random() * 5; const a = Math.random() * 6.28, r = Math.random() * 3.2; n.tx = n.hx + Math.cos(a) * r; n.tz = n.hz + Math.sin(a) * r; }
      if (!n.q) {
      const dx = n.tx - g.position.x, dz = n.tz - g.position.z, d = Math.hypot(dx, dz), want = d > .4 && !n.dro && !(n.tr && n.tr.still) && !(n.rt ? talking === n : near) ? (n.rt ? 1.25 : 1.1) : 0;
      let wx = 0, wz = 0;
      if (want) {
        const [gx, gz] = navTarget(n.sm, g.position.x, g.position.z, n.tx, n.tz, .5, now);
        const gd = Math.hypot(gx - g.position.x, gz - g.position.z) || 1;
        [wx, wz] = steer(g.position.x, g.position.z, (gx - g.position.x) / gd * want, (gz - g.position.z) / gd * want, .5, n.sm, Math.min(gd, d));
      }
      const k = 1 - Math.exp(-dt * 6);
      n.vx += (wx - n.vx) * k; n.vz += (wz - n.vz) * k;
      g.position.x += n.vx * dt; g.position.z += n.vz * dt;
      // sem colisão rígida com o jogador: só afasta suavemente quem ficou no mesmo espaço
      if (talking !== n && !P.dead) {
        const sx = g.position.x - P.x, sz = g.position.z - P.z, sd = Math.hypot(sx, sz) || .01;
        if (sd < .8) { const push = (.8 - sd) * Math.min(1, dt * 5) * .5; g.position.x += sx / sd * push; g.position.z += sz / sd * push; P.x -= sx / sd * push; P.z -= sz / sd * push; }
      }
      collide(g.position, .5);
      }
      const sp = Math.hypot(n.vx, n.vz), mv = Math.min(1, sp / 1.1);
      if (sp > .2) g.rotation.y = turn(g.rotation.y, Math.atan2(n.vx, n.vz), dt * 8);
      else if (n.tr && n.tr.face) g.rotation.y = turn(g.rotation.y, Math.atan2(n.tr.face[0] - g.position.x, n.tr.face[1] - g.position.z), dt * 6);
      else if (near) g.rotation.y = turn(g.rotation.y, Math.atan2(P.x - g.position.x, P.z - g.position.z), dt * 3);
      n.spd = sp;
    }
    // marcha, respiração, olhar e piscar (a mesma do personagem)
    g.up.rotation.set(0, 0, 0);
    g.position.y = groundY(g.position.x, g.position.z) + (n.q ? n.fy || 0 : 0);   // a marcha desce o corpo a cada passo: parte sempre do chão (senão acumula e afunda)
    const gr = gait(g, dt, gaitSpeed(n.spd || 0), { sword: false });
    if (n.role === 'citizen') g.arm.rotation.x = -gr.w * gr.sw * .8;
    if (n.rt) farmerPose(n, t, dt);
    if (n.tr && !n.q && !n.up) tradePose(n, t, dt);
    if (n.dro) {   // abrindo uma porta: a mão direita (a do braço da arma) alcança e empurra
      const D = n.dro; D.t += dt; const e = Math.sin(Math.min(1, D.t / .9) * Math.PI);
      g.arm.rotation.x = -1.45 * e; g.arm.fa.rotation.x = -.35 * e; g.up.rotation.x = .08 * e;
      if (!D.done && D.t > .35) { D.done = true; D.force ? npcOpenDoor(D.id) : openDoorById(D.id); }
      if (D.t > .9) n.dro = null;
    }
    if (n.role === 'guard') g.head.rotation.y += Math.sin(t * .4) * .5;   // sentinela varre o olhar
  }
}
