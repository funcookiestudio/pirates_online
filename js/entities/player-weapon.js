/* Arma na mão do jogador: monta o modelo e posiciona os braços (IK) para armas de fogo. */
import { P } from './player.js';
import { WEAPONS } from '../data/weapons.js';

const MX = new THREE.Matrix4();

const V = THREE.Vector3;
const OFF = new V(0, .72, 0);                  // pivô do tronco (grupo `up`) em relação aos pés
const L = (x, y, z) => new V(x, y, z).sub(OFF); // ponto no espaço do corpo → espaço do tronco

/** Armas grandes (mosquete…): o corpo gira ~26° para a direita e o tronco mais ~20°, como numa mira real */
export const BIG = { beta: .45, gamma: .35 };
const smooth = x => x * x * (3 - 2 * x);

/** Giro extra do corpo ao mirar: arma pequena fica à direita (gira um pouco p/ a esquerda); arma grande gira p/ a direita */
export function aimOffset(d) {
  const W = WEAPONS[P.wid];
  if (!W.gun || W.thrown) return 0;
  return W.big ? -BIG.beta * smooth(P.aimv) : Math.atan(.2 / Math.max(d, 3));
}

/** Cinemática inversa simples para um braço de dois segmentos. `T` = alvo da mão e `pole` = direção do cotovelo,
    ambos no espaço do tronco (o pai do braço) */
export function ik(arm, T, pole) {
  const S = arm.position, l1 = .25, l2 = .32;
  const dv = new V().subVectors(T, S);
  const d = Math.min(Math.max(dv.length(), .15), l1 + l2 - .01);
  const dh = dv.normalize();
  const ca = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const sa = Math.sqrt(1 - ca * ca);
  const n = new V().copy(pole).addScaledVector(dh, -pole.dot(dh)).normalize();
  const E = new V().copy(S).addScaledVector(dh, l1 * ca).addScaledVector(n, l1 * sa);
  const u = new V().subVectors(E, S).normalize();
  const w = new V().copy(S).addScaledVector(dh, d).sub(E).normalize();
  const zl = w.clone().addScaledVector(u, -w.dot(u)).normalize();
  const yl = u.clone().negate();
  const xl = new V().crossVectors(yl, zl);
  arm.quaternion.setFromRotationMatrix(MX.makeBasis(xl, yl, zl));
  arm.fa.rotation.x = -Math.acos(Math.max(-1, Math.min(1, u.dot(w))));
}

/** Pose das armas de fogo (chamada todo frame enquanto uma está equipada) */
export function gunPose() {
  const W = WEAPONS[P.wid];
  if (W.big) bigGunPose(W); else smallGunPose(W);
}

/** Pistola: a arma fica à direita do corpo, as duas mãos a seguram; ao mirar (P.aimv) os braços sobem um pouco
    e os cotovelos abrem; o recuo do tiro (P.sw) empurra tudo para trás */
function smallGunPose(W) {
  const r = P.sw * P.sw, h = W.hp || [0, .31];
  const A = P.aimv, e = smooth(A);
  P.g.up.rotation.set(0, 0, 0);
  // a arma acompanha o corpo: sobe/desce no passo e respira parado
  const bob = Math.sin(P.ph * 2) * .014 * P.walk + Math.sin((P.br || 0) * 2.1) * .006;
  const sway = Math.sin(P.ph) * .012 * P.walk;
  const y = 1.16 + .14 * e + .04 * r + bob;     // baixa na guarda, sobe ao mirar
  const rz = .24 - .12 * r + .03 * e;
  const lz = Math.min(h[1], .32) - .12 * r + .03 * e;
  // cotovelos levantados e abertos: os braços "abraçam" o corpo em vez de ficarem retos
  const ey = -.55 + .4 * e;
  ik(P.g.arm,  L(-.17 + sway, y, rz), new V(-1, ey, -.15));
  if (!(P.torchM && P.torchM.visible)) ik(P.g.armL, L(-.07 + sway, y - .03, lz), new V(1, ey, -.15));
  {
    const q = P.g.arm.quaternion.clone().multiply(P.g.arm.fa.quaternion).conjugate();
    P.hl.p.set(0, -.32 - h[0], 0);
    // guarda: cano levemente para baixo · mirando: reto para o alvo (+ leve guinada p/ a esquerda)
    const dir = new V(.03 * e, -.2 * (1 - e), 1).normalize();
    P.hl.q.setFromUnitVectors(new V(0, -1, 0), dir.applyQuaternion(q));
  }
}

const RELOAD_IN = .45, RELOAD_OUT = .45; // s para abaixar a arma / levantá-la de volta
const ss01 = x => smooth(Math.min(1, Math.max(0, x)));

/** Quanto a pose de recarga vale agora (0..1): sobe logo após o tiro e desce nos últimos instantes da recarga.
    O jogador fica parado durante toda a recarga (ver moveAndAct). */
export function reloadWeight(W) {
  if (!W.reload || P.cd <= 0) return 0;
  return ss01((P.cdMax - P.cd) / RELOAD_IN) * ss01(P.cd / RELOAD_OUT);
}

/** Mão esquerda na recarga (t = 0..1 da fase de carregar): pega a pólvora no cinto → leva ao cano e despeja
    → soca a carga com a vareta (3 vezes, devagar) → descansa na boca do cano */
function reloadLeftHand(t) {
  const muzzle = L(0, 1.4, .25), belt = L(.28, .85, .14);
  if (t < 0) return muzzle;
  if (t < .16) return muzzle.lerp(belt, ss01(t / .16));        // vai ao cinto
  if (t < .24) return belt;                                    // pega a pólvora
  if (t < .42) return belt.lerp(muzzle, ss01((t - .24) / .18)); // leva ao cano
  if (t < .52) return muzzle.add(new V(0, .02 * Math.sin((t - .42) * 60), 0)); // despeja
  if (t < .93) {
    const k = (t - .52) / .41;                                  // 3 socadas
    return muzzle.add(new V(0, -.24 * (.5 - .5 * Math.cos(k * Math.PI * 6)) * Math.min(1, k * 6), .02));
  }
  return muzzle;
}

/** Mosquete/bacamarte. Guarda: arma em diagonal à frente do peito. Mirando: coronha no ombro direito, cotovelo
    direito baixo, mão direita no gatilho e esquerda no apoio do cano. Recarregando (mosquete): coronha no chão,
    a mão direita segura o cano e a esquerda recarrega. */
function bigGunPose(W) {
  const A = P.aimv, e = smooth(A), r = P.sw * P.sw, rw = reloadWeight(W);
  const phi = (BIG.beta + BIG.gamma) * e;       // direção do tiro vista do tronco
  P.g.up.rotation.set(.14 * rw, -BIG.gamma * e, 0);
  const dA = new V(Math.sin(phi), 0, Math.cos(phi));
  const sway = Math.sin(P.ph) * .012 * P.walk + Math.sin((P.br || 0) * 2.1) * .005;

  // mirando: a coronha encosta no ombro (recua e sobe um pouco no tiro)
  const B = L(-.44, 1.4 + .03 * r, .1).addScaledVector(dA, -.09 * r);
  const Ra = B.clone().addScaledVector(dA, W.sb);
  const La = Ra.clone().addScaledVector(dA, W.fs);
  // guarda: arma em diagonal, cano para cima e para a frente
  const Rg = L(-.24, 1.0 + sway, .3), Lg = L(.12, 1.27 + sway, .5);
  const dG = new V().subVectors(Lg, Rg).normalize();

  const R = Rg.lerp(Ra, e), Lh = Lg.lerp(La, e), d = dG.lerp(dA, e).normalize();
  const pr = new V(-.15, -1, -.35), pl = new V(.5, -1, -.1);
  if (rw > 0) {
    // recarga: arma em pé, coronha no chão à frente do peito; mão direita segura o cano
    const dR = new V(0, 1, -.1).normalize();
    const t = (P.cdMax - P.cd - RELOAD_IN) / Math.max(.2, P.cdMax - RELOAD_IN - RELOAD_OUT);
    R.lerp(L(0, 1.15, .25), rw);
    Lh.lerp(reloadLeftHand(t), rw);
    d.lerp(dR, rw).normalize();
    pr.lerp(new V(-.3, -1, -.15), rw);
  }
  ik(P.g.arm,  R,  pr);                         // cotovelo direito baixo
  ik(P.g.armL, Lh, pl);

  {
    // cano (-y da arma) aponta em d; o alto da arma (+z) fica para cima (na recarga, para a frente)
    const q = P.g.arm.quaternion.clone().multiply(P.g.arm.fa.quaternion).conjugate();
    const yL = d.clone().negate(), ref = new V(0, 1 - rw, rw);
    const zL = ref.addScaledVector(d, -ref.dot(d)).normalize();
    const xL = new V().crossVectors(yL, zL);
    [xL, yL, zL].forEach(v => v.applyQuaternion(q));
    P.hl.q.setFromRotationMatrix(MX.makeBasis(xL, yL, zL));
    // ponto da arma que fica na mão: o gatilho; na recarga, o cano (a mão desliza pela arma)
    P.hl.p.set(0, -.32, 0).sub(new V(0, -.85 * rw, 0).applyQuaternion(P.hl.q));
  }
}

/** (Re)monta os modelos das armas equipadas: ids = { wpn: índice, gun: índice | null }; act = a que fica na mão.
    Os dois modelos são filhos do antebraço da arma e posicionados por holster.js (mão ou coldre). */
export function mountWeapons(ids, act) {
  const arm = P.g.arm.fa;
  ['wpn', 'gun'].forEach(k => {
    if (P.models[k]) arm.remove(P.models[k]);
    P.models[k] = null;
    if (ids[k] === null || ids[k] === undefined) return;
    const m = WEAPONS[ids[k]].build();
    arm.add(m);
    P.models[k] = m;
  });
  P.wids = { wpn: ids.wpn, gun: ids.gun };
  P.act = P.models[act] ? act : (P.models.wpn ? 'wpn' : 'gun');
  P.hand = P.models[P.act];
  P.wid = ids[P.act];
  P.hl.p.set(0, -.32, 0);
  P.hl.q.identity();
  // esconde a espada padrão do modelo
  [2, 3].forEach(i => {
    const c = arm.children[i];
    if (c && !Object.values(P.models).includes(c)) c.visible = false;
  });
}

/** Pose do braço da tocha: erguido à frente (ilumina adiante), balança pouco; a tocha fica em pé, levemente inclinada */
export const TORCH_ARM = { x: -.78, fa: -.62, z: .1 };

/** Tocha na mão livre (braço esquerdo): monta/remove o modelo */
export function mountTorch(wi) {
  const fa = P.g.armL.fa;
  if (P.torchM) { fa.remove(P.torchM); P.torchM = null; }
  if (wi == null) return;
  const m = WEAPONS[wi].build();
  m.position.y = .12;                                   // o cabo fica na palma
  const w = new THREE.Group();
  w.position.set(0, -.32, 0);
  w.rotation.set(-(TORCH_ARM.x + TORCH_ARM.fa), 0, 0);    // desfaz a inclinação do braço: fica em pé
  w.rotation.z = .13;                                   // leve inclinação para a direita do personagem
  w.add(m);
  fa.add(w); P.torchM = w;
}
