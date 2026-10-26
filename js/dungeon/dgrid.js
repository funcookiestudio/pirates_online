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

/** Cabe um corpo de meia largura `r` aqui? (planejamento: o caminho passa com folga das quinas; a colisão usa .45) */
export const dWalkR = (x, z, r) => floor(x - r, z - r) && floor(x + r, z - r) && floor(x - r, z + r) && floor(x + r, z + r);
const PAD = .7;   // meia largura usada ao suavizar o caminho: .25 m de folga para não raspar nas quinas das paredes

/** Célula de piso mais perto da célula k (busca em anéis); -1 se não achar */
function nearFloor(k) {
  const { W, H, grid } = DG, cx = k % W, cz = (k / W) | 0;
  for (let r = 1; r < 6; r++) {
    let best = -1, bd = 1e9;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = cx + dx, z = cz + dz;
      if (x >= 0 && z >= 0 && x < W && z < H && grid[z * W + x] && dx * dx + dz * dz < bd) { bd = dx * dx + dz * dz; best = z * W + x; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** Caminho por células de (sx,sz) até (gx,gz): lista de [x,z] suavizada (nunca vazia), ou null se não há piso perto da partida.
    Destino em parede (porta trancada, coluna) ou fechado por paredes: vai até o piso alcançável mais perto dele (não manda reto pela parede).
    `bad` = pontos onde já travou: o caminho passa longe deles, se houver outro. */
export function dPath(sx, sz, gx, gz, bad) {
  if (!dIn(sx, sz)) return null;
  const { W, H, grid } = DG;
  let s = dCell(sx, sz);
  if (!grid[s]) { s = nearFloor(s); if (s < 0) return null; }
  const ge = dIn(gx, gz) && grid[dCell(gx, gz)] ? dCell(gx, gz) : -1;   // célula do destino, se for piso
  let avoid = null;
  if (bad && bad.length) {
    avoid = new Uint8Array(W * H);
    bad.forEach(([bx, bz]) => {
      const bi = Math.floor((bx - DG.ox) / DG.C), bj = Math.floor((bz - DG.oz) / DG.C);
      for (let j = bj - 1; j <= bj + 1; j++) for (let i = bi - 1; i <= bi + 1; i++) {
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const [cx, cz] = dCenter(j * W + i);
        if (Math.hypot(cx - bx, cz - bz) < 1.7) avoid[j * W + i] = 1;
      }
    });
    avoid[s] = 0;
  }
  const run = av => {
    const from = new Int32Array(W * H).fill(-2);
    from[s] = -1;
    const q = [s];
    for (let n = 0; n < q.length && (ge < 0 || from[ge] === -2); n++) {
      const c = q[n], cx = c % W, cz = (c / W) | 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= W || z >= H || !grid[z * W + x] || from[z * W + x] !== -2 || (av && av[z * W + x])) continue;
        if (dx && dz && (!grid[cz * W + x] || !grid[z * W + cx])) continue;   // sem cortar quina
        from[z * W + x] = c; q.push(z * W + x);
      }
    }
    return { from, q, exact: ge >= 0 && from[ge] !== -2 };
  };
  let r = run(avoid);
  if (avoid && ge >= 0 && !r.exact) r = run(null);   // o desvio fecharia o único caminho: vale o caminho direto
  let g = ge, end = [gx, gz];
  if (!r.exact) {   // sem caminho até o ponto: vai até o piso alcançável mais perto dele
    let bd = 1e18; g = s;
    for (const c of r.q) { const [cx, cz] = dCenter(c), d = (cx - gx) * (cx - gx) + (cz - gz) * (cz - gz); if (d < bd) { bd = d; g = c; } }
    end = dCenter(g);
  }
  const pts = [];
  for (let c = g; c !== s; c = r.from[c]) pts.push(dCenter(c));
  pts.reverse();
  if (pts.length) pts[pts.length - 1] = end; else pts.push(end);
  // suaviza: pula pontos quando a reta está livre, com folga (PAD) e amostras de 25 cm (antes: corpo exato a cada 50 cm, raspava nas quinas)
  const out = []; let cur = [sx, sz], i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    for (; j > i; j--) {
      const dx = pts[j][0] - cur[0], dz = pts[j][1] - cur[1], len = Math.hypot(dx, dz);
      let ok = true;
      for (let t = .25; t < len && ok; t += .25) ok = dWalkR(cur[0] + dx / len * t, cur[1] + dz / len * t, PAD);
      if (ok) break;
    }
    out.push(pts[j]); cur = pts[j]; i = j + 1;
  }
  return out;
}
