/* Grade da dungeon ativa: colisão, chão e caminho (BFS). Sem dependências — o terreno e o A* consultam aqui.
   Célula (i,j) cobre x ∈ [ox + i·C, ox + (i+1)·C), z ∈ [oz + j·C, ...). grid[j·W + i] > 0 = piso. */
export const DG = { on: false, ox: 0, oz: 0, C: 2, W: 0, H: 0, grid: null };

export function setDun(d) { if (!d) { DG.on = false; DG.grid = null; DG.seen = null; return; } Object.assign(DG, d, { on: true, seen: new Uint8Array(d.W * d.H) }); }
/** Marca como explorado o que está a menos de r m de (x,z) */
export function dSee(x, z, r) {
  const i0 = Math.floor((x - r - DG.ox) / DG.C), i1 = Math.floor((x + r - DG.ox) / DG.C), j0 = Math.floor((z - r - DG.oz) / DG.C), j1 = Math.floor((z + r - DG.oz) / DG.C);
  for (let j = Math.max(0, j0); j <= Math.min(DG.H - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(DG.W - 1, i1); i++) if (Math.hypot(DG.ox + (i + .5) * DG.C - x, DG.oz + (j + .5) * DG.C - z) < r + 1) DG.seen[j * DG.W + i] = 1;
}
export const dIn = (x, z) => DG.on && x >= DG.ox && z >= DG.oz && x < DG.ox + DG.W * DG.C && z < DG.oz + DG.H * DG.C;
export const dCell = (x, z) => Math.floor((z - DG.oz) / DG.C) * DG.W + Math.floor((x - DG.ox) / DG.C);
export const dCenter = k => [DG.ox + ((k % DG.W) + .5) * DG.C, DG.oz + (((k / DG.W) | 0) + .5) * DG.C];
const floor = (x, z) => dIn(x, z) && DG.grid[dCell(x, z)] > 0;
/** Cabe o corpo aqui? (quatro cantos de 0,45 m dentro do piso) */
export const dWalk = (x, z) => floor(x - .45, z - .45) && floor(x + .45, z - .45) && floor(x - .45, z + .45) && floor(x + .45, z + .45);

/** Caminho por células de (sx,sz) até (gx,gz): lista de [x,z] suavizada, ou null */
export function dPath(sx, sz, gx, gz) {
  if (!dIn(sx, sz) || !dIn(gx, gz)) return null;
  const { W, H, grid } = DG, s = dCell(sx, sz), g = dCell(gx, gz);
  if (!grid[s] || !grid[g]) return null;
  const from = new Int32Array(W * H).fill(-2);
  from[s] = -1;
  const q = [s];
  for (let n = 0; n < q.length && from[g] === -2; n++) {
    const c = q[n], cx = c % W, cz = (c / W) | 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= W || z >= H || !grid[z * W + x] || from[z * W + x] !== -2) continue;
      if (dx && dz && (!grid[cz * W + x] || !grid[z * W + cx])) continue;   // sem cortar quina
      from[z * W + x] = c; q.push(z * W + x);
    }
  }
  if (from[g] === -2) return null;
  const pts = [];
  for (let c = g; c !== s; c = from[c]) pts.push(dCenter(c));
  pts.reverse(); pts[pts.length - 1] = [gx, gz];
  // suaviza: pula pontos quando a reta está livre
  const out = []; let cur = [sx, sz], i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    for (; j > i; j--) {
      const dx = pts[j][0] - cur[0], dz = pts[j][1] - cur[1], len = Math.hypot(dx, dz);
      let ok = true;
      for (let t = .5; t < len && ok; t += .5) ok = dWalk(cur[0] + dx / len * t, cur[1] + dz / len * t);
      if (ok) break;
    }
    out.push(pts[j]); cur = pts[j]; i = j + 1;
  }
  return out;
}
