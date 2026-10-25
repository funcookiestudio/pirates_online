/* Atualização do jogador a cada frame: movimento, ataque, colisões, regeneração e animação. */
import { safeSpot } from './safe.js';
import { updateBedPending, animateBed, sleeping } from './bed.js';
import { refreshTorch } from './inventory.js';
import { snapInterior, interiorWaypoint } from '../world/interior-nav.js';
import { houseNear, houseAt, descendThen, upperContains } from '../world/floors.js';
import { VIZ, steer, navTarget, markStuck, freePoint, setSwim } from './steer.js';
import { groundY, slideTo } from '../world/terrain.js';
import { STAIR, floorOffset, stairTick, stairMove, updateCutaway } from '../world/floors.js';
import { dIn } from '../dungeon/dgrid.js';
import { updateDoors, applyDoorReach, exitClick } from '../world/doors.js';
import { VILLAGE_R } from '../core/village-const.js';
import { updateSwimState, swimPose } from './swim.js';
import { state } from '../core/state.js';
import { props } from '../core/registry.js';
import { mapAt, pushOut } from '../world/imap.js';
import { setMapped } from './steer.js';
import { turnTo } from '../core/utils.js';
import { WEAPONS } from '../data/weapons.js';
import { P } from '../entities/player.js';
import { gait, gaitSpeed, gaitReset } from '../entities/gait.js';
import { gunPose, aimOffset, reloadWeight, BIG, TORCH_ARM } from '../entities/player-weapon.js';
import { attack, impact } from './combat.js';
import { autoThink } from './auto.js';
import { updateSit, animateSit } from './rest.js';
import { updateStamina } from './stamina.js';
import { applySwap, placeWeapons } from '../entities/holster.js';
import { updateSwap } from './swap.js';
import { rollMove, updateDodgeTimers, animateRoll } from './dodge.js';
import { MOUNT, updateMount, mountPose, mountMult, startDismount } from './mount.js';

const AXIS_X = new THREE.Vector3(1, 0, 0);

export function updatePlayer(dt) {
  updateSwimState(dt);
  updateMount(dt);
  if (!P.dead) {
    updateStamina(dt);
    updateSwap(dt);
    updateAim(dt);
    updateBedPending();
    if (P.roll > 0) { rollMove(dt); clampToWorld(); }
    else if (sleeping()) { P.vx = P.vz = 0; }   // deitado/dormindo: a cama conduz o corpo (bed.js)
    else if (P.sit > 0 || P.sitT) updateSit(dt); // sentado/sentando/levantando: não anda nem ataca
    else if (MOUNT.on && (MOUNT.dis || MOUNT.t < 1)) { P.vx = P.vz = 0; }   // subindo/descendo: o jogador é conduzido pela animação (mount.js)
    else if (MOUNT.on) { const sp0 = P.sp; P.sp *= mountMult(); moveAndAct(dt); P.sp = sp0; }   // montado: ~2× mais rápido
    else { moveAndAct(dt); stuckWatch(dt); }
  }

  // recargas e temporizadores
  updateDodgeTimers(dt);
  P.cd -= dt;
  P.cbt -= dt;
  if (P.imp > 0) {
    P.imp -= dt;
    if (P.imp <= 0) impact();
  }
  P.cds[0] = Math.max(0, P.cds[0] - dt);
  P.cds[1] = Math.max(0, P.cds[1] - dt);
  P.sw = Math.max(0, P.sw - dt * 3);

  animate(dt);
  applyAim();
  swimPose(dt);
  applyDoorReach();
  placeWeapons();
}

/** Mira: sobe (rápido) quando há alvo ao alcance com arma de fogo e relaxa (devagar) quando não há */
const AIM_IN = .32, AIM_OUT = .9; // segundos para mirar / relaxar
function updateAim(dt) {
  const W = WEAPONS[P.wid], rl = reloading();
  const on = W.gun && !P.swap && P.tgt && !P.tgt.dead && P.roll <= 0 && !P.sit && !P.sitT && !rl
    && Math.hypot(P.tgt.x - P.x, P.tgt.z - P.z) <= W.rng + 1.5;
  P.aimv = Math.min(1, Math.max(0, P.aimv + (on ? dt / AIM_IN : -dt / (rl ? .35 : AIM_OUT))));
}

/** Recarregando uma arma que recarrega no chão (a mira só volta nos instantes finais da recarga) */
function reloading() {
  const W = WEAPONS[P.wid];
  return !!W.reload && P.cd > .45;
}

/** Sacando/guardando arma: fica parado e sem atacar */
function swapping() {
  return !!P.swap;
}

/** Cabeça inclina para a direita do personagem e o olho esquerdo fecha conforme a mira */
function applyAim() {
  const a = WEAPONS[P.wid].thrown ? 0 : P.aimv, e = a * a * (3 - 2 * a);
  P.g.head.rotation.z = .16 * e;          // +z inclina o topo para -x = direita do personagem
  P.g.head.rotation.x = -.04 * e + (.3 * reloadWeight(WEAPONS[P.wid])); // na recarga olha para o cano
  P.g.head.rotation.y = WEAPONS[P.wid].big ? .6 * (BIG.beta + BIG.gamma) * e : 0; // olha para o alvo
  P.g.eyeL.scale.y = 1 - .88 * e;
}

/** Preso? Quer andar mas não sai do lugar: refaz o caminho pela porta/escada; se não der, para em vez de forçar a parede */
const SW = { x: 0, z: 0, t: 0, n: 0 };
function stuckWatch(dt) {
  const far = Math.hypot(P.tx - P.x, P.tz - P.z) > 1.3;
  if (!far || STAIR.on || P.tgt || P.roll > 0 || MOUNT.on) { SW.t = 0; SW.n = 0; SW.x = P.x; SW.z = P.z; return; }
  if (Math.hypot(P.x - SW.x, P.z - SW.z) > .3) { SW.x = P.x; SW.z = P.z; SW.t = 0; SW.n = 0; return; }
  SW.t += dt;
  if (SW.t < 2) return;
  SW.t = 0; SW.n++;
  const tx = P.tx, tz = P.tz, h = houseAt(P.x, P.z, .3), th = houseAt(tx, tz, .3);
  if (h && h !== th && SW.n === 1) { if (P.up ? (!upperContains(tx, tz) && descendThen(tx, tz)) : exitClick(tx, tz)) return; }   // dentro e o destino é fora: sai pelo caminho certo
  if (h && P.up && !STAIR.on && SW.n === 1 && !upperContains(tx, tz) && descendThen(tx, tz)) return;                            // no andar de cima, destino sem piso lá: desce pela escada
  if (SW.n >= 2) { P.tx = P.x; P.tz = P.z; SW.n = 0; }                                               // não há caminho: para
}

export const STEER = { side: 0, road: true };   // road: viagens longas seguem o caminho de menor custo (estradas)

/** Anda até o destino/alvo, ataca ao chegar no alcance, colide com árvores/pedras e regenera */
function moveAndAct(dt) {
  const px = P.x, pz = P.z;
  if (state.autoOn) autoThink(dt);
  if (P.tgt && P.tgt.dead) P.tgt = null;
  stairTick();

  if (!P.tgt && (P.tx !== STEER.gx || P.tz !== STEER.gz)) {
    // destino novo: tira de dentro de obstáculos e zera o controle de progresso
    if (!STAIR.on) { const sn = snapInterior(P.x, P.z, P.tx, P.tz); if (sn === null) { P.tx = P.x; P.tz = P.z; } else if (sn) { P.tx = sn[0]; P.tz = sn[1]; } else { const f = freePoint(P.tx, P.tz, .7); P.tx = f.x; P.tz = f.z; } }   // (o ponto da escada não é movido)
    STEER.gx = P.tx; STEER.gz = P.tz; STEER.bd = 1e9; STEER.bt = 0;
  }
  const tx = P.tgt ? P.tgt.x : P.tx, tz = P.tgt ? P.tgt.z : P.tz;
  const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
  const rng = P.tgt ? WEAPONS[P.wid].rng : .15;

  // aceleração suave em direção ao destino
  // recarregando (mosquete): fica parado até terminar, mesmo que o alvo se afaste
  const want = d > rng && !reloading() && !swapping() ? Math.min(P.sp * P.swimK, Math.max((d - rng) * 4, .7)) : 0;
  if (!(d > rng)) VIZ.wp = null;
  let wx = d > 1e-4 ? dx / d * want : 0, wz = d > 1e-4 ? dz / d * want : 0;
  if (want > 0) {
    setSwim(true);
    setMapped(!!mapAt(P.x, P.z));
    const [nx, nz] = (!STAIR.on && interiorWaypoint(P.x, P.z, tx, tz)) || navTarget(STEER, P.x, P.z, tx, tz, houseNear(P.x, P.z) ? BODY_IN : .5);
    VIZ.wp = [nx, nz];
    const nd = Math.hypot(nx - P.x, nz - P.z) || 1;
    [wx, wz] = steer(P.x, P.z, (nx - P.x) / nd * want, (nz - P.z) / nd * want, houseNear(P.x, P.z) ? BODY_IN : .5, STEER, Math.min(nd, d - rng));
    setSwim(false); setMapped(false);
  }
  const k = 1 - Math.exp(-dt * (want > Math.hypot(P.vx, P.vz) ? 6 : 9));
  P.vx += (wx - P.vx) * k;
  P.vz += (wz - P.vz) * k;
  if (want === 0 && Math.hypot(P.vx, P.vz) < .15) P.vx = P.vz = 0;
  P.x += P.vx * dt;
  P.z += P.vz * dt;
  // preso/perdido perto do destino: se quase não saiu do lugar por ~0,5 s, para (ou refaz o caminho se estiver longe)
  const mvd = Math.hypot(P.x - STEER.lx, P.z - STEER.lz); STEER.lx = P.x; STEER.lz = P.z;
  STEER.st = want > .5 && mvd < want * dt * .25 ? (STEER.st || 0) + dt : 0;
  if (STEER.st > .5) {
    STEER.st = 0;
    if (!P.tgt && d < 3) { P.tx = P.x; P.tz = P.z; P.vx = P.vz = 0; } else { markStuck(STEER, P.x, P.z); STEER.side = -(STEER.side || 1); }
  }
  // sem chegar mais perto do destino por ~1,5 s (e já perto): desiste em vez de rodar em volta
  if (!P.tgt && want > 0) {
    if (d < STEER.bd - .4) { STEER.bd = d; STEER.bt = 0; } else if ((STEER.bt += dt) > 1.5) {
      if (d < 5) { P.tx = P.x; P.tz = P.z; STEER.gx = P.tx; STEER.gz = P.tz; } else { STEER.bt = 0; STEER.bd = d; markStuck(STEER, P.x, P.z); STEER.side = -(STEER.side || 1); }
    }
  }
  // chegou perto o bastante (destino no chão): para em vez de ficar corrigindo
  if (!P.tgt && d < .5) { P.vx *= .5; P.vz *= .5; }

  // direção do corpo (não gira sozinho durante o giro de espada)
  const spd = Math.hypot(P.vx, P.vz), spinning = P.cds[0] > 2.5;
  if (!spinning) {
    if (spd > .5) turnTo(P.g, Math.atan2(P.vx, P.vz), 12, dt);
    else if (d <= rng && P.tgt) turnTo(P.g, Math.atan2(dx, dz) + aimOffset(d), 14, dt);
  }

  // arma de fogo só dispara depois de mirar
  if (MOUNT.on && !MOUNT.dis && MOUNT.t >= 1 && P.tgt && d <= rng + 4.5) startDismount();   // montado não ataca: desmonta um pouco antes do alvo
  if (d <= rng && P.tgt && P.cd <= 0 && !P.safe && !P.swap && !MOUNT.on && !P.swimming && (!WEAPONS[P.wid].gun || P.aimv > .85)) attack(dx, dz);

  clampToWorld();
  stairMove(dt);
  P.fy = floorOffset(P.x, P.z);
  updateCutaway();
  updateDoors(dt);
  // dentro da vila (zona segura) o personagem guarda a arma no coldre; ela volta à mão ao sair
  P.safe = safeSpot(P.x, P.z, VILLAGE_R - .3) && !dIn(P.x, P.z);
  if (P.safe && !P.dead) state.safeAt = { x: P.x, z: P.z, up: !!P.up };   // último ponto seguro (renascimento)   // vila, fazendas e porto: armas no coldre
  P.safeK = (P.safeK || 0) + ((P.safe ? 1 : 0) - (P.safeK || 0)) * Math.min(1, dt * 6);

  // intensidade da caminhada (0 parado … 1 correndo) e regeneração
  P.walk += ((dt > 0 ? Math.min(1, Math.hypot(P.x - px, P.z - pz) / (P.sp * dt)) : 0) - P.walk) * (1 - Math.exp(-dt * 12));
  P.mp = Math.min(P.mmax, P.mp + dt * 3);
  P.hp = Math.min(P.max, P.hp + dt * .5);
}

/** Raio do corpo dentro de casas (a grade dos interiores usa o mesmo valor + folga) */
const BODY_IN = .3;

/** Colisão com árvores e pedras e limite da ilha */
let lastX = 0, lastZ = 3.4;
function clampToWorld() {
  const inH = houseNear(P.x, P.z, .3), mh = !MOUNT.on && mapAt(P.x, P.z);
  props.forEach(p => {
    if (mh && p.map) return;   // dentro de casa com mapa: colisão por retângulos (abaixo)
    const ex = P.x - p.position.x, ez = P.z - p.position.z, dd = Math.hypot(ex, ez) || .01;
    const rr = p.r + (MOUNT.on ? .9 : inH ? BODY_IN : .5);   // montado ocupa mais espaço; dentro de casa o corpo é mais fino
    if (dd < rr) {
      P.x = p.position.x + ex / dd * rr;
      P.z = p.position.z + ez / dd * rr;
    }
  });
  if (mh) [P.x, P.z] = pushOut(mh, P.up ? 1 : 0, P.x, P.z, BODY_IN);
  // mar e paredões: desliza pela margem ou volta ao último ponto firme
  [P.x, P.z] = slideTo(lastX, lastZ, P.x, P.z, true);
  lastX = P.x; lastZ = P.z;
}

/** Pernas, balanço, inclinação do corpo e pose dos braços (golpe ou mira) */
function animate(dt) {
  if (sleeping() && animateBed(dt)) return;
  if (P.roll > 0) { animateRoll(); return; }
  if (P.sit > 0) { animateSit(dt); return; }
  P.rum = P.rum || 0;
  P.rum += ((P.rumOn ? 1 : 0) - P.rum) * (1 - Math.exp(-dt * 6));
  if (P.rum < .01) { if (P.rum) { P.rum = 0; P.g.head.rotation.x = 0; P.g.armL.rotation.set(0, 0, 0); } }
  else if (P.rumOn || P.rum > .02) { animateRummage(dt); return; }
  const W = WEAPONS[P.wid], gn = W.gun && !W.thrown;   // arma de arremesso usa o braço de golpe (arremessa por cima), não a pose de mira

  // passos
  P.ph = P.g.gs ? P.g.gs.ph : P.ph;   // fase do passo (a marcha nova mantém a própria)
  P.g.position.set(P.x, groundY(P.x, P.z) + (P.fy || 0), P.z);

  // inclinação do corpo
  const leanTarget = P.walk * .09
    + (P.sw > 0 && !gn ? Math.sin((1 - P.sw) * Math.PI) * .22 : 0)
    + (gn ? -.05 - .1 * P.sw * P.sw : 0);
  P.lean += (leanTarget - P.lean) * (1 - Math.exp(-dt * 14));
  P.g.rotation.x = P.lean; P.g.rotation.z = 0;

  // braço da arma
  const u = 1 - P.sw, ss = x => x * x * (3 - 2 * x);
  P.br = (P.br || 0) + dt;
  const breath = Math.sin(P.br * 2.1);              // respiração (vale parado e andando)
  const swing = Math.sin(P.ph) * P.walk;            // fase do passo (-1..1)
  let ta, tf = -.3, tz = 0, phi = Math.PI;
  if (gn) { ta = -1.35 - .4 * P.sw; tf = -.2; }
  else if (P.sw > 0 && W.chop) {
    // machado: braço natural; o cabo (ângulo `phi` no mundo: π = para cima) tomba para trás, corta para baixo e volta
    const lerp = (a, b, x) => a + (b - a) * x;
    if (u < .35) { const x = ss(u / .35); ta = lerp(-.4, -1.9, x); tf = lerp(-.3, -.5, x); phi = lerp(Math.PI, Math.PI - .7, x); }
    else if (u < .65) { const x = ss((u - .35) / .3); ta = lerp(-1.9, -.5, x); tf = lerp(-.5, -.2, x); phi = lerp(Math.PI - .7, .5, x); }
    else { const x = ss((u - .65) / .35); ta = lerp(-.5, -.4, x); tf = lerp(-.2, -.3, x); phi = lerp(.5, Math.PI, x); }
  } else if (P.sw > 0) {
    ta = u < .3 ? -.4 + .9 * ss(u / .3) : u < .55 ? .5 - 2.8 * ss((u - .3) / .25) : -2.3 + 1.9 * ss((u - .55) / .45);
    tf = u > .3 && u < .7 ? .1 : -.3;
  } else {
    // repouso: braço balança contra o braço livre, cotovelo dobra no passo e a arma "pesa" na mão
    ta = -.4 + swing * .5 + breath * .035 + P.walk * .12;
    tf = -.3 - P.walk * (.18 + .22 * Math.max(0, Math.sin(P.ph + 1.2))) + breath * .03;
    tz = -.05 - swing * .07 + Math.sin(P.br * 1.3) * .015;
  }

  const k = 1 - Math.exp(-dt * (P.sw > 0 && !gn ? 32 : 20));
  P.aa += (ta - P.aa) * k;
  P.af += (tf - P.af) * k;
  P.az = (P.az || 0) + (tz - (P.az || 0)) * k;
  P.g.arm.rotation.set(P.aa, 0, P.az);
  P.g.arm.fa.rotation.x = P.af;
  if (!gn) P.hl.q.setFromAxisAngle(AXIS_X, W.chop ? phi - (P.aa + P.af) : 0); // machado: mantém o cabo na direção `phi`
  if (!gn) P.hl.p.set(0, -.32, 0);
  if (gn) gunPose();
  else { P.g.armL.rotation.y = P.g.armL.rotation.z = 0; P.g.up.rotation.set(0, 0, 0); }

  if (P.swap) applySwap(P.swap);

  // giro de espada (Q)
  if (P.cds[0] > 2.5) P.g.rotation.y += dt * 30;

  // marcha: pés rolando, quadril, braço livre, cabeça, pena do chapéu (golpe/mira têm as próprias poses)
  const busy = gn || P.sw > 0 || P.swap;
  gait(P.g, dt, gaitSpeed(P.walk * P.sp), { twist: busy ? 0 : 1, armL: !gn && !P.swap && !(P.torchM && P.torchM.visible), head: !W.big, gun: gn, sword: !busy });
  if (P.torchM) {   // com arma de 2 mãos na mão a tocha some (o braço livre ajuda a mirar)
    const on = !W.big && !P.safe;   // tocha apagada e guardada em locais iluminados (vila e casas)
    if (P.torchM.visible !== on) { P.torchM.visible = on; refreshTorch(); }
  }
  if (P.torchM && P.torchM.visible && !P.swap) {   // braço da tocha: erguido, balança pouco
    const sw = Math.sin(performance.now() / 170) * Math.min(1, P.walk || 0) * .05;
    P.g.armL.rotation.set(TORCH_ARM.x + sw, 0, TORCH_ARM.z);
    P.g.armL.fa.rotation.x = TORCH_ARM.fa;
  }
  mountPose(dt);   // montado: sobe na sela e abre as pernas
}

/** Vasculhar o baú: encara o baú, inclina o tronco e revira com os dois braços, alternando */
function animateRummage(dt) {
  gaitReset(P.g);
  const g = P.g, r = P.rum, t = (P.rt = (P.rt || 0) + dt);
  let dy = (P.rumYaw ?? g.rotation.y) - g.rotation.y;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  g.rotation.y += dy * (1 - Math.exp(-dt * 10));
  P.walk = 0; P.lean = 0;
  g.rotation.x = 0;
  g.position.set(P.x, groundY(P.x, P.z) + (P.fy || 0), P.z);
  g.legL.rotation.x = g.legR.rotation.x = 0;
  const a = Math.sin(t * 4.2), b = Math.sin(t * 4.2 + Math.PI), dig = .5 + .5 * Math.sin(t * 1.3);
  g.up.rotation.set(r * (.55 + dig * .12 + Math.sin(t * 2.1) * .04), r * Math.sin(t * 1.3) * .12, 0);
  g.head.rotation.x = r * (.25 + Math.sin(t * 2.6) * .08);
  P.aa = -r * (1.15 + a * .3); P.af = -r * (.55 + Math.max(0, a) * .5); P.az = 0;
  g.arm.rotation.set(P.aa, 0, -r * .08);
  g.arm.fa.rotation.x = P.af;
  g.armL.rotation.set(-r * (1.15 + b * .3), 0, r * .08);
  g.armL.fa.rotation.x = -r * (.55 + Math.max(0, b) * .5);
}
