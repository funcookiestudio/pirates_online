/* Planejamento do mapa (módulo puro, sem THREE): onde ficam porto, vila, castelo, fazendas, acampamentos e dungeons.
   Roda DENTRO do gerador de ilhas (islandgen.js), em duas etapas:
     1) planCore  — logo depois do relevo bruto e ANTES de rios/lagos/estradas: porto → vila colada ao porto → castelo no alto → fazendas.
     2) planFields — depois de calculado o custo de caminhada desde a vila: acampamentos e dungeons por faixa de perigo (custo de caminho,
        não distância em linha reta), do mais fácil (perto da vila) ao mais difícil (ponto mais distante).
   Tudo em células da grade do gerador (1 célula = 1 m). */

const hashN = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Distância em m entre duas células */
export const cdist = (V, a, b) => Math.hypot(a % V - b % V, ((a / V) | 0) - ((b / V) | 0));

export function planCore(c) {
  const { N, V, H, lab, mainL, sl, wd, coastOf, cells } = c;
  const NV = V * V, ix = k => k % V, iz = k => (k / V) | 0, at = (x, z) => Math.round(z) * V + Math.round(x);
  const inside = (x, z, m = 8) => x >= m && z >= m && x < N - m && z < N - m;
  const land = (x, z) => inside(x, z, 3) && lab[at(x, z)] === mainL && H[at(x, z)] > .7;
  /** Quanto o terreno em volta (disco R) foge do plano do centro; 99 = tem água/mar/rio no disco */
  const dev = (x, z, R) => {
    if (!inside(x, z, R + 3) || !land(x, z)) return 99;
    const h0 = H[at(x, z)];
    let m = 0;
    for (let a = 0; a < 12; a++) for (const f of [.5, 1]) {
      const px = x + Math.cos(a / 12 * 6.2832) * R * f, pz = z + Math.sin(a / 12 * 6.2832) * R * f;
      if (!land(px, pz) || wd[at(px, pz)]) return 99;
      m = Math.max(m, Math.abs(H[at(px, pz)] - h0));
    }
    return m;
  };
  // 1) candidatos a porto: costa baixa e plana (a doca sai em direção cardinal, para o mar)
  const cand = [];
  for (const k of cells) {
    if (H[k] < .7 || H[k] > 1.6 || sl(k) > .25 || hashN(k, 7) > .12) continue;
    const d = coastOf(k); if (d) cand.push([k, d]);
  }
  let best = null;
  for (const [k, d] of cand) {
    const px = ix(k), pz = iz(k), DV = 72;
    const vx = px - d[0] * DV, vz = pz - d[1] * DV;                       // vila: terra adentro, no eixo da doca
    const dv = dev(vx, vz, 32);
    if (dv > 1.4) continue;
    // fundo de terra atrás da vila (cabe castelo, fazendas e acampamentos) e mar na frente do cais
    let depth = 0; for (let t = 0; t <= 300; t += 20) if (land(px - d[0] * t, pz - d[1] * t)) depth++;
    if (depth < 12) continue;
    let sea = 0; for (let t = 8; t <= 40; t += 8) if (inside(px + d[0] * t, pz + d[1] * t, 2) && H[at(px + d[0] * t, pz + d[1] * t)] < -.1) sea++;
    if (sea < 4) continue;
    // castelo: o ponto mais alto da ilha (picos suavizados), 90–260 m da vila e longe do cais; o gerador cria a mesa de penhascos em volta
    let cs = null;
    for (let cz = 80; cz < N - 80; cz += 8) for (let cx = 80; cx < N - 80; cx += 8) {
      const dvl = Math.hypot(cx - vx, cz - vz); if (dvl < 90 || dvl > 260 || Math.hypot(cx - px, cz - pz) < 90) continue;
      let ok = true, hs = 0;
      for (let a = 0; a < 12 && ok; a++) { const qx = cx + Math.cos(a / 12 * 6.2832) * 62, qz = cz + Math.sin(a / 12 * 6.2832) * 62; if (!land(qx, qz) || wd[at(qx, qz)]) ok = false; }
      if (!ok || !land(cx, cz)) continue;
      for (let a = -8; a <= 8; a += 4) for (let b = -8; b <= 8; b += 4) hs += H[at(cx + a, cz + b)];
      const hh = hs / 25, sc = hh + hashN(cx, cz) * .3;
      if (hh < H[at(vx, vz)] + 1.5) continue;
      if (!cs || sc > cs.sc) cs = { x: cx, z: cz, sc, ang: Math.atan2(cz - vz, cx - vx) };
    }
    if (!cs) continue;
    const score = (1.4 - dv) * 3 + cs.sc * .5 + depth * .15 + hashN(k, 3);
    if (!best || score > best.score) best = { k, d, vx, vz, cs, score };
  }
  if (!best) return null;
  const port = best.k, vil = at(best.vx, best.vz), cs = best.cs;
  // castelo olha para a vila
  const castle = { x: cs.x, z: cs.z, th: Math.atan2(best.vx - cs.x, best.vz - cs.z) };
  // 2) fazendas: terreno plano e bom entre 95 e 230 m da vila, bem espaçadas, fora do castelo e do cais
  const farms = [], taken = [[best.vx, best.vz, 60], [castle.x, castle.z, 85], [ix(port), iz(port), 70]];
  const spots = [];
  for (let z = 20; z < N - 20; z += 6) for (let x = 20; x < N - 20; x += 6) {
    const dv = Math.hypot(x - best.vx, z - best.vz);
    if (dv < 95 || dv > 240) continue;
    const dd = dev(x, z, 20);
    if (dd > 1.1 || H[at(x, z)] < 1 || H[at(x, z)] > 7) continue;
    spots.push([x, z, dv, dd]);
  }
  for (let n = 0; n < 3; n++) {
    let bs = null, bv = -1e9;
    for (const [x, z, dv, dd] of spots) {
      if (taken.some(([tx, tz, r]) => Math.hypot(tx - x, tz - z) < r)) continue;
      let m = 1e9; for (const f of farms) m = Math.min(m, Math.hypot(f.x - x, f.z - z));
      const v = -dd * 8 - dv * .06 + Math.min(m, 160) * .12 + hashN(x, z) * 2;
      if (v > bv) { bv = v; bs = [x, z]; }
    }
    if (!bs) break;
    farms.push({ x: bs[0], z: bs[1] });
    taken.push([bs[0], bs[1], 70]);
  }
  return { port, dock: best.d, vil, castle, farms };
}

/** Acampamentos e dungeons por faixa de perigo. `D` = custo de caminhada desde a vila (Float32Array); `keep(k)` diz se a célula serve */
export function planFields(c, core) {
  const { N, V, H, sl, wd, wk, rv, D, lab, mainL } = c;
  const ix = k => k % V, iz = k => (k / V) | 0, at = (x, z) => Math.round(z) * V + Math.round(x);
  const ok = (x, z, m = 4) => x >= m && z >= m && x < N - m && z < N - m;
  const structs = [[ix(core.vil), iz(core.vil), 70], [ix(core.port), iz(core.port), 55], [core.castle.x, core.castle.z, 75], ...core.farms.map(f => [f.x, f.z, 55])];
  let dmax = 0;
  for (let k = 0; k < V * V; k++) if (D[k] < 1e8 && lab[k] === mainL && H[k] > .8) dmax = Math.max(dmax, D[k]);
  const flat = (x, z, R) => {
    if (!ok(x, z, R + 4)) return false;
    const h0 = H[at(x, z)];
    for (let a = 0; a < 8; a++) { const k = at(x + Math.cos(a / 8 * 6.2832) * R, z + Math.sin(a / 8 * 6.2832) * R); if (H[k] < .9 || wd[k] || wk[k] || rv[k] || Math.abs(H[k] - h0) > .8 || lab[k] !== mainL) return false; }
    return true;
  };
  const camps = [], dungeons = [];
  const free = (x, z, r) => !structs.some(([sx, sz, sr]) => Math.hypot(sx - x, sz - z) < sr) && !camps.some(q => Math.hypot(q.x - x, q.z - z) < r) && !dungeons.some(q => Math.hypot(q.x - x, q.z - z) < r * .6);
  // acampamentos: 8 faixas igualmente espaçadas em custo de caminho (0.16 → 1.0)
  const NC = 8;
  for (let i = 0; i < NC; i++) {
    const t = .16 + .84 * i / (NC - 1);
    let bk = null, bs = -1e9;
    for (const [tol, sep, fl] of [[.05, 85, 7], [.07, 70, 6], [.1, 55, 5], [.15, 45, 4]]) {   // relaxa só se a ilha não comportar
      for (let z = 12; z < N - 12; z += 4) for (let x = 12; x < N - 12; x += 4) {
        const k = at(x, z);
        if (!(D[k] < 1e8) || H[k] < .9 || sl(k) > .16 || wd[k] || wk[k] || rv[k] || lab[k] !== mainL) continue;
        const tt = D[k] / dmax;
        if (Math.abs(tt - t) > tol) continue;
        if (!free(x, z, sep) || !flat(x, z, fl)) continue;
        let m = 1e9; for (const q of camps) m = Math.min(m, Math.hypot(q.x - x, q.z - z));
        const s = Math.min(m, 220) - Math.abs(tt - t) * 400 + hashN(x, z) * 10;
        if (s > bs) { bs = s; bk = [x, z, tt]; }
      }
      if (bk) break;
    }
    if (bk) camps.push({ x: bk[0], z: bk[1], t: bk[2], tier: i });
  }
  camps.sort((a, b) => a.t - b.t); camps.forEach((q, i) => { q.tier = i; });
  camps.sort((a, b) => a.t - b.t); camps.forEach((q, i) => { q.tier = i; });
  // dungeons: bocas em encostas (pedra que sobe atrás, terreno firme à frente), uma por faixa
  const tD = [.28, .46, .62, .78, .94];
  for (const t of tD) {
    let bd = null, bs = -1e9;
    for (const [tol, sep, lo, hi, hmin] of [[.06, 85, .26, .6, 2.4], [.09, 65, .2, .7, 2], [.14, 50, .16, .9, 1.6], [.2, 40, .12, 1.2, 1.2]]) {
      for (let z = 12; z < N - 12; z += 3) for (let x = 12; x < N - 12; x += 3) {
        const k = at(x, z);
        if (!(D[k] < 1e8) || H[k] < hmin || wd[k] || wk[k] || rv[k] || lab[k] !== mainL) continue;
        const tt = D[k] / dmax; if (Math.abs(tt - t) > tol) continue;
        const gx = (H[k + 1] - H[k - 1]) / 2, gz = (H[k + V] - H[k - V]) / 2, s0 = Math.hypot(gx, gz);
        if (s0 < lo || s0 > hi) continue;
        const dx = -gx / s0, dz = -gz / s0, fx = x + dx * 3, fz = z + dz * 3;
        if (!ok(fx, fz, 6)) continue;
        const f = at(fx, fz);
        if (H[f] < .9 || wd[f] || wk[f] || sl(f) > .3 || H[at(x - dx * 3, z - dz * 3)] < H[k] + .3) continue;
        if (!free(x, z, sep)) continue;
        let m = 1e9; for (const q of dungeons) m = Math.min(m, Math.hypot(q.x - x, q.z - z));
        const s = Math.min(m, 220) - Math.abs(tt - t) * 400 + hashN(x, z) * 10;
        if (s > bs) { bs = s; bd = { x, z, dx, dz, t: tt }; }
      }
      if (bd) break;
    }
    if (bd) dungeons.push(bd);
  }
  return { camps, dungeons, dmax };
}
