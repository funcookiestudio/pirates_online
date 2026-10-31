/* Serpente: inimigo das dungeons da Medusa, feita como as cobras do cabelo dela (blocos chanfrados alternando 2 cores, cabeça com olhos amarelos e língua).
   Rasteja em S pelo chão (a onda avança com a distância andada), ergue o pescoço ao preparar o bote e dá o bote para a frente.
   makeSerpent() devolve o Group com userData.SN = { update(dt, I) }; a frente é +z. */
const mx = Math.max, mn = Math.min, lp = (a, b, u) => a + (b - a) * u;
const sm = (a, b, x) => { const k = mn(1, mx(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const PALS = [[0x4f7a45, 0x8cae5a], [0x3a5e38, 0x6f9a50], [0x8aa85a, 0xb8c57a], [0x2f4a30, 0x4f7a45]];
const N = 18, L = 2.9, LAM = 1.25;
const _Z = new THREE.Vector3(0, 0, 1), _d = new THREE.Vector3(), _a = new THREE.Vector3();

export function makeSerpent() {
  const g = new THREE.Group(), pal = PALS[(Math.random() * PALS.length) | 0], mats = new Map();
  const mat = c => { let m = mats.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); } return m; };
  const bb = (w, h, d, b, c) => {
    const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
    s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: mx(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    return new THREE.Mesh(geo, mat(c));
  };
  const tw = u => lp(.34, .07, Math.pow(u, .9));
  const segs = [];
  for (let i = 0; i < N; i++) { const w = tw((i + .5) / N), m = bb(w, w * .85, 1, mn(.04, w * .2), pal[i % 2]); g.add(m); segs.push(m); }
  const hd = new THREE.Group(); g.add(hd);
  const hw = .42, hb = bb(hw, hw * .7, hw * 1.5, hw * .14, pal[0]); hb.position.z = hw * .5; hd.add(hb);
  [-1, 1].forEach(s => { const e = bb(hw * .2, hw * .2, hw * .2, .004, 0xf2c230); e.position.set(s * hw * .37, hw * .2, hw * .6); hd.add(e); });
  const tg = bb(hw * .1, hw * .04, hw * .55, .002, 0xb02838); tg.position.set(0, -hw * .12, hw * 1.25); hd.add(tg);
  const pts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const S = { ph: Math.random() * 3, t: Math.random() * 10, mv: 0, rise: .2, fw: 0 };

  /** I = { dist (m andados no quadro), mv 0..1, rise 0..1 (pescoço erguido), fw (bote: avanço da cabeça, m) } */
  const update = (dt, I) => {
    const k = 1 - Math.exp(-dt * (I.fast ? 22 : 8));
    S.t += dt; S.ph += I.dist || 0;
    S.mv += ((I.mv || 0) - S.mv) * (1 - Math.exp(-dt * 6));
    S.rise += ((I.rise == null ? .2 : I.rise) - S.rise) * k;
    S.fw += ((I.fw || 0) - S.fw) * k;
    for (let i = 0; i <= N; i++) {
      const u = i / N, z = S.fw * (1 - sm(0, .35, u)) - u * L;
      const amp = (.12 + .2 * S.mv) * sm(.08, .4, u) + .05 * (1 - S.mv) * u;
      const x = amp * Math.sin(6.2832 * (u * L - S.ph) / LAM + (1 - S.mv) * S.t * 1.3);
      const neck = mx(0, 1 - u / .3);
      pts[i].set(x, tw(u) * .45 + S.rise * 1.1 * neck * neck, z);
    }
    for (let i = 0; i < N; i++) {
      _d.subVectors(pts[i], pts[i + 1]);
      const len = _d.length() || 1e-4; _d.divideScalar(len);
      segs[i].position.copy(pts[i]).add(pts[i + 1]).multiplyScalar(.5);
      segs[i].quaternion.setFromUnitVectors(_Z, _d);
      segs[i].scale.z = len * 1.18;
    }
    _a.subVectors(pts[0], pts[1]).normalize(); _a.y = mn(_a.y, .25); _a.normalize();
    hd.position.copy(pts[0]); hd.quaternion.setFromUnitVectors(_Z, _a);
    tg.scale.z = .3 + 1.3 * mx(0, Math.sin(S.t * 7));
  };
  update(0, {});
  g.userData.SN = { update };
  return g;
}

/** Animação por quadro (chamada por enemies.js no lugar da de humanoide) */
export function animateSerpent(e, c, dt, groundY, turnTo, P) {
  const { aim, dur } = c, st = e.st;
  if (st === 'wind' || (e.ag && !P.dead && st === 'chase')) turnTo(e.g, aim, st === 'wind' ? 6 : 8, dt);
  else if (st === 'chase' && Math.hypot(e.vx, e.vz) > .3) turnTo(e.g, Math.atan2(e.vx, e.vz), 5, dt);
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  const sp = Math.hypot(e.vx, e.vz), I = { dist: sp * dt / e.g.scale.x, mv: mn(1, sp / 2), rise: e.ag ? .35 : .15 };
  if (st === 'wind') { const u = 1 - mx(0, e.tm) / dur; I.rise = .35 + .55 * u; I.fw = -.45 * u; }   // ergue o pescoço e recua: vai dar o bote
  else if (st === 'rec') { I.rise = .2; I.fw = .8; I.fast = true; }                                  // bote
  else if (st === 'stag') { I.rise = .05; I.fw = -.2; }
  e.SN.update(dt, I);
}
