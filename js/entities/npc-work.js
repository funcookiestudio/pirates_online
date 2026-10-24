/* Animações de trabalho dos NPCs. Cada ofício controla os braços, o tronco e a cabeça do mesmo esqueleto do personagem. */
import { scene } from '../core/engine.js';
import { M } from '../core/utils.js';

const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// ---------- faíscas (pequenas, com gravidade) ----------
const sparks = [];
const sparkGeo = new THREE.BoxGeometry(.05, .05, .05);
function spark(x, y, z, n, power) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: Math.random() < .5 ? 0xffd040 : 0xff8a20, transparent: true }));
    m.position.set(x, y, z);
    scene.add(m);
    const a = Math.random() * 6.28, s = (.6 + Math.random()) * power;
    sparks.push({ m, vx: Math.cos(a) * s, vy: 1.2 + Math.random() * 2.2, vz: Math.sin(a) * s, t: .5 + Math.random() * .4 });
  }
}
/** Vapor da água (sobe devagar, cresce e some) */
export function steam(x, y, z, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xe8f0f4, transparent: true }));
    m.position.set(x + (Math.random() - .5) * .4, y, z + (Math.random() - .5) * .4);
    m.scale.setScalar(1.5 + Math.random() * 2);
    scene.add(m);
    sparks.push({ m, vx: (Math.random() - .5) * .3, vy: .7 + Math.random() * .8, vz: (Math.random() - .5) * .3, t: .9 + Math.random() * .7, steam: true });
  }
}
export function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.t -= dt;
    if (s.steam) { s.m.scale.multiplyScalar(1 + dt * .9); } else s.vy -= 9 * dt;
    s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
    if (!s.steam && s.m.position.y < .03) { s.m.position.y = .03; s.vy *= -.3; s.vx *= .5; s.vz *= .5; }
    s.m.material.opacity = s.steam ? Math.min(.55, s.t * .6) : Math.min(1, s.t * 3);
    if (s.t <= 0) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); }
  }
}

// ---------- ferreiro ----------
const CYC = .9, HITS = 5;               // ritmo das marteladas
const HIT_T = .5;
const RAISE = { A: -2.4, F: -.9, lean: -.14, head: -.25 };
const HIT = { A: -.45, F: -.7, lean: .04, head: .38 };
// Poses da mão livre (LA, LF = ombro e cotovelo; pitch/ty = inclinação e giro da pinça). Calculadas para a lâmina ficar sobre a bigorna, sobre o braseiro e dentro do barril.
const POSE = {
  hold:  { LA: -.05, LF: .1,  pitch: -.05, ty: -.65 },   // espada deitada na bigorna
  carry: { LA: -.55, LF: .1,  pitch: .85,  ty: 0 },      // carregando
  forge: { LA: -.4,  LF: .9,  pitch: -.6,  ty: 0 },      // sobre as brasas
  barUp: { LA: -1.45, LF: -.8, pitch: 2.5, ty: 0 },      // acima do barril
  barDn: { LA: -1.5, LF: -.75, pitch: 2.95, ty: 0 },     // lâmina dentro d'água
};
const mix = (a, b, e) => ({ LA: lerp(a.LA, b.LA, e), LF: lerp(a.LF, b.LF, e), pitch: lerp(a.pitch, b.pitch, e), ty: lerp(a.ty, b.ty, e) });
const H = POSE.hold;
const WALK = 1.5;                        // m/s

/** Prepara o ferreiro: marreta, pinça com a espada, espada na bigorna, forja e barril d'água */
export function initSmith(n, at, th) {
  const g = n.g, hm = new THREE.Group();
  const bx = (w, h, d, c, px, py, pz, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(px, py, pz); p.add(m); return m; };
  bx(.06, .62, .06, 0x6a4020, 0, -.5, 0, hm);
  bx(.2, .2, .36, 0x55585e, 0, -.86, 0, hm);
  bx(.22, .06, .38, 0x3a3c40, 0, -.86, 0, hm);
  g.arm.fa.add(hm);
  g.arm.fa.children.forEach(c => { if (c.geometry && c.geometry.parameters.height === .95) c.visible = false; });
  // caneca (para o descanso)
  const mug = bx(.13, .16, .13, 0x8a6a3a, 0, -.38, .1, g.arm.fa); mug.visible = false;
  // pinça: pivô na mão livre (inclina para baixo para mergulhar a espada)
  const tongs = new THREE.Group();
  tongs.position.set(0, -.34, 0);
  bx(.04, .04, .7, 0x4a4a52, -.03, 0, .34, tongs); bx(.04, .04, .7, 0x4a4a52, .03, 0, .34, tongs);
  g.armL.fa.add(tongs);
  const mkSword = () => {
    const sw = new THREE.Group();
    const blade = bx(.9, .035, .13, 0xff7a20, 0, 0, 0, sw), tip = bx(.14, .035, .09, 0xff7a20, .5, 0, 0, sw);
    bx(.06, .06, .3, 0x5a5a62, -.5, 0, 0, sw);   // guarda
    bx(.25, .05, .05, 0x6a4020, -.65, 0, 0, sw); // cabo
    sw.userData.hot = [blade, tip];
    return sw;
  };
  const anvilSword = mkSword();
  const [ax, az] = at(1.3, 2.6), [sx, sz] = at(1.1, 2.6);
  anvilSword.position.set(sx, .8, sz);
  anvilSword.rotation.y = th;
  scene.add(anvilSword);
  const handSword = mkSword();
  handSword.scale.set(.75, 1, 1);
  handSword.position.set(0, 0, 1.07);
  handSword.rotation.y = -Math.PI / 2;           // cabo na ponta da pinça, lâmina para a frente
  tongs.add(handSword);
  handSword.visible = false;
  const [fx, fz] = at(-1.3, 2.7);
  const fire = new THREE.Mesh(new THREE.BoxGeometry(.6, .1, .6), new THREE.MeshBasicMaterial({ color: 0xff6a20 }));
  fire.position.set(fx, .84, fz);
  scene.add(fire);
  const glowL = new THREE.PointLight(0xff7a20, 0, 5);
  scene.add(glowL);
  [hm, tongs, mug, anvilSword, handSword, fire].forEach(o => { if (o) o.userData.dyn = 1; }); // animados: ficam fora da fusão do cenário
  const [bx0, bz0] = at(2.45, 2.6);
  n.job = {
    at, th, hm, tongs, mug, anvilSword, handSword, fire, glowL, heat: 1, hit: -1, flash: 0, dip: 0,
    hx: ax, hz: az, bx: bx0, bz: bz0, fx, fz, home: at(.9, 3.45), forgeSpot: at(-.9, 4.2), barSpot: at(2.85, 4.0), wp: at(0, 3.3), door: at(0, 2.5),
    segs: [], i: 0, s: 0, away: false, nd: 0, st: 0,
  };
  planSession(n.job);
}

/** Sorteia uma jornada: 3 a 5 rodadas (martelar → enxugar → forja), depois mergulha a espada, entrega na loja e descansa */
function planSession(J) {
  const rounds = 3 + Math.floor(Math.random() * 3), q = [];
  const { home, forgeSpot: fo, barSpot: ba, wp, door } = J;
  // começa dentro de casa: pega uma lâmina FRIA, esquenta no braseiro e só então vai para a bigorna
  q.push(['dwait', 1.2], ['walk', 0, [door, wp, fo], 'carry', 'forge', true, true], ['forge', 2.4], ['walk', 0, [fo, home], 'forge', 'hold', true, true]);
  for (let r = 0; r < rounds; r++) {
    q.push(['ready', .6], ['strike', HITS * CYC], ['wipe', 1.1]);
    // esquenta: pega a espada, CAMINHA até o braseiro, aquece e volta andando
    if (r < rounds - 1) q.push(['take', .9], ['walk', 0, [home, fo], 'carry', 'forge', true, false], ['forge', 1.9], ['walk', 0, [fo, home], 'forge', 'hold', true, false]);
  }
  // fim do trabalho: caminha até o barril, mergulha a espada e a leva até a loja
  q.push(['take', .9], ['walk', 0, [home, ba], 'carry', 'barUp', true, false], ['qdip', 2.2], ['qlift', 1.1],
    ['walk', 0, [ba, wp, door], 'barUp', 'carry', true, false], ['dwait', 4 + Math.random() * 3]);
  if (Math.random() < .6) q.push(['drink', 3.6]);
  // a próxima jornada recomeça na casa (busca outra lâmina)
  J.segs = q; J.i = 0; J.s = 0; J.heat = 0; J.round = rounds;
}

const setHeat = (sw, h) => sw.userData.hot.forEach(m => m.material.color.setRGB(.3 + .7 * h, .3 + .3 * h * h, .32 - .25 * h));
const pathLen = pts => pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
const along = (pts, u) => {
  const L = pathLen(pts);
  let d = clamp01(u) * L;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l || i === pts.length - 1) { const k = l ? Math.min(1, d / l) : 1; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])]; }
    d -= l;
  }
  return [pts[0][0], pts[0][1], 0];
};

/** Atualiza o ferreiro. `face` = posição do jogador; `talking` = conversando com ele (pausa o trabalho) */
export function updateSmith(n, dt, now, face, talking) {
  const g = n.g, J = n.job;
  J.flash = Math.max(0, J.flash - dt * 5);
  J.dip = Math.max(0, J.dip - dt * 6);
  const yawTo = (x, z) => Math.atan2(x - g.position.x, z - g.position.z);
  const yawAnvil = J.th + Math.PI;

  const durOf = sg => sg[0] === 'walk' ? pathLen(sg[2]) / WALK : sg[1];
  let seg = J.segs[J.i];
  if (!seg) { planSession(J); seg = J.segs[0]; }
  if (!talking) J.s += dt;
  if (J.s >= durOf(seg)) { J.s = 0; J.i++; seg = J.segs[J.i]; if (!seg) { planSession(J); seg = J.segs[0]; } }
  const k2 = seg[0], dur = durOf(seg), s = J.s, u = clamp01(s / (dur || 1));

  let yaw = yawAnvil, A = 0, F = 0, lean = 0, headX = 0, headY = 0, pose = H, stand = J.home;
  let swordOn = 'hand', walk = 0, pos = null, hidden = false, hammer = true, mug = false;

  if (talking) {
    yaw = yawTo(face[0], face[1]);
    A = -.3; F = -.2; pos = [g.position.x, g.position.z];
    swordOn = J.away && !J.handHold ? 'none' : 'hand';
    pose = J.lastPose || H;
  } else switch (k2) {
    case 'ready': { A = -.1; headX = .4; headY = Math.sin(u * 3) * .15; J.heat = 1; break; }
    case 'strike': {
      const k = Math.floor(s / CYC), t = s - k * CYC;
      const rise = t < HIT_T ? ease(clamp01(t / HIT_T)) : 1 - clamp01((t - HIT_T - 0) / .1) ** 2;
      const rebound = t > HIT_T + .1 ? Math.sin(clamp01((t - HIT_T - .1) / .3) * Math.PI) * .1 : 0;
      A = lerp(HIT.A, RAISE.A, rise) - rebound; F = lerp(HIT.F, RAISE.F, rise); lean = lerp(HIT.lean, RAISE.lean, rise); headX = lerp(HIT.head, RAISE.head, rise);
      if (t >= HIT_T + .1 && J.hit !== k) { J.hit = k; J.flash = 1; J.dip = 1; J.heat = Math.max(.35, J.heat - .08); spark(J.hx, .95, J.hz, 9, 2.2); }
      headY = Math.sin(s * 2) * .05; pose = { ...H, LA: H.LA + J.dip * .05 };
      break;
    }
    case 'wipe': { const e = Math.sin(u * Math.PI); A = lerp(-.1, -2.2, e); F = lerp(0, -2.0, e); headX = -.35 * e; lean = -.1 * e; J.heat = Math.max(.25, J.heat - dt * .12); break; }
    case 'take': { pose = mix(H, POSE.carry, ease(u)); A = lerp(-.1, -.3, ease(u)); break; }
    case 'walk': {
      const [, , route, from, to, carry, hm] = seg;
      const [x, z, hd] = along(route, u);
      pos = [x, z]; walk = 1; hammer = hm; swordOn = carry ? 'hand' : 'none';
      yaw = u > .75 ? yawAnvil : hd;
      pose = mix(POSE[from], POSE[to], ease(u)); A = -.1; headX = .2;
      J.away = route[route.length - 1] === J.door || route[0] === J.door ? true : J.away;
      J.handHold = !!carry;
      break;
    }
    case 'forge': { stand = J.forgeSpot; pose = { ...POSE.forge, LA: POSE.forge.LA + Math.sin(u * 17) * .03 }; A = -.3; F = -.2; headX = .25; J.heat = Math.min(1, J.heat + dt * .5); break; }
    case 'qdip': {
      stand = J.barSpot; swordOn = 'hand'; headX = .3; A = -.3; F = -.2;
      const e = ease(clamp01(u / .25));
      pose = mix(POSE.barUp, POSE.barDn, e);
      if (u > .25) pose = { ...pose, pitch: pose.pitch + Math.sin(s * 14) * .03 };
      if (u > .22) {
        J.heat = Math.max(0, J.heat - dt * 1.4);
        J.st -= dt;
        if (J.st <= 0) { J.st = .07; steam(J.bx, .9, J.bz, 2); }
        if (!J.dipped) { J.dipped = true; steam(J.bx, .9, J.bz, 16); J.flash = .6; }
      }
      break;
    }
    case 'qlift': {
      stand = J.barSpot; J.dipped = false; headX = .3; A = -.3; F = -.2;
      pose = mix(POSE.barDn, POSE.barUp, ease(u));
      if (u < .5) { J.st -= dt; if (J.st <= 0) { J.st = .1; steam(J.bx, .95, J.bz, 1); } }
      break;
    }
    case 'dwait': { hidden = true; hammer = false; swordOn = 'none'; pos = J.door; J.away = true; break; }
    case 'drink': {
      pos = J.door; hammer = false; swordOn = 'none'; mug = true; yaw = yawTo(...J.home); const c = Math.sin(u * Math.PI * 3);
      const up = ease(clamp01(c * 1.4)); A = lerp(-.4, -2.0, up); F = lerp(-.4, -1.9, up); headX = -.3 * up; pose = POSE.carry; J.away = true;
      break;
    }
  }
  if (k2 === 'ready' || k2 === 'strike') { J.away = false; J.handHold = false; }
  J.lastPose = pose;

  // posição: andando/dentro da casa usa `pos`; senão vai para o posto da etapa
  const st = pos || stand;
  if (pos) { g.position.x = pos[0]; g.position.z = pos[1]; }
  else { g.position.x += (st[0] - g.position.x) * Math.min(1, dt * 6); g.position.z += (st[1] - g.position.z) * Math.min(1, dt * 6); }
  g.visible = !hidden;

  g.rotation.y += angDiff(g.rotation.y, yaw) * Math.min(1, dt * (walk ? 10 : 7));
  n.ph2 = (n.ph2 || 0) + dt * 7 * walk;
  const w = Math.sin(n.ph2) * .7 * walk;
  g.legL.rotation.x = walk ? w : -.05; g.legR.rotation.x = walk ? -w : .08;
  g.arm.rotation.x = A + (walk ? -w * .6 : 0); g.arm.fa.rotation.x = F;
  g.armL.rotation.x = pose.LA; g.armL.fa.rotation.x = pose.LF;
  J.tongs.rotation.x = pose.pitch; J.tongs.rotation.y = pose.ty;
  g.up.rotation.x = lean + J.dip * .05;
  g.up.position.y = .72 - J.dip * .03 + Math.sin(now / 1000 * 1.6) * .008;
  g.head.rotation.x = headX; g.head.rotation.y = headY;

  J.hm.visible = hammer && !mug; J.tongs.visible = hammer || swordOn === 'hand'; J.mug.visible = mug;
  J.anvilSword.visible = false; // a espada fica sempre presa na pinça
  J.handSword.visible = swordOn === 'hand';
  setHeat(J.anvilSword, 1);
  setHeat(J.handSword, Math.min(1, J.heat + J.flash * .5));
  const flick = .65 + Math.sin(now / 90) * .1 + Math.sin(now / 37) * .08;
  J.fire.material.color.setRGB(1, .35 + flick * .25, .1);
  const hot = swordOn === 'hand' && J.heat > .2;
  J.glowL.intensity = ((.6 + J.flash * 1.4) * flick + (hot ? .5 * J.heat : 0)) * (hidden ? 0 : 1);
  J.glowL.position.set(k2 === 'forge' ? J.fx : J.hx, 1.2, k2 === 'forge' ? J.fz : J.hz);
}
