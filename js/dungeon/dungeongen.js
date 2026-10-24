/* Gerador procedural de dungeons (grade 64×64), portado de "Dungeon low poly v2".
   Puro: sem Three.js nem globais — só devolve a grade e as estatísticas. Determinístico por (semente, tema).
   Temas: 'cripta' (salas retas + corredores), 'ruinas' (cripta erodida), 'caverna' (autômato celular).
   grid: 0 parede · 1 piso · 2 corredor/beco. Conexo garantido; início e saída = par mais distante pelo caminho. */

export const DW = 64, DH = 64;
export const THEMES = ['cripta', 'ruinas', 'caverna'];

export const rngf = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const W = DW, H = DH;

function bfs(grid, s) {
  const d = new Int32Array(W * H).fill(-1);
  d[s] = 0;
  const q = [s];
  for (let n = 0; n < q.length; n++) {
    const c = q[n];
    for (const k of [1, -1, W, -W]) { const i = c + k; if (grid[i] && d[i] < 0) { d[i] = d[c] + 1; q.push(i); } }
  }
  return { d, q };
}

/** opts.rooms = número de salas desejado (cripta/ruínas); padrão 11–16 */
export function generateDungeon(seed, theme, opts = {}) {
  const r = rngf(hash(seed + theme)), ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  let grid = new Uint8Array(W * H);
  const rooms = [], nooks = [];
  let s0, e0, loops = 0;
  const set = (x, y, v) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && !grid[y * W + x]) grid[y * W + x] = v; };
  // túnel: reto em L (wind=0) ou sinuoso (wind=1), largura 2*hw+1
  const tun = (ax, ay, bx, by, hw, wind, v) => {
    let x = ax, y = ay, hz = r() < .5, n = 0;
    while ((x !== bx || y !== by) && n++ < 600) {
      const dx = bx - x, dy = by - y;
      let h = wind ? r() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)) : hz ? dx !== 0 : dy === 0;
      if (h && !dx) h = false;
      if (!h && !dy) h = true;
      h ? x += Math.sign(dx) : y += Math.sign(dy);
      for (let q = -hw; q <= hw; q++) for (let p = -hw; p <= hw; p++) set(x + p, y + q, v);
    }
  };

  if (theme === 'caverna') {
    const fp = .43 + r() * .05;
    let g = new Uint8Array(W * H);
    for (let j = 3; j < H - 3; j++) for (let i = 3; i < W - 3; i++) g[j * W + i] = r() < fp ? 1 : 0;
    for (let s = 0; s < 5; s++) {
      const n = new Uint8Array(W * H);
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
        let c = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) c += g[(j + b) * W + i + a];
        n[j * W + i] = c >= 5 ? 1 : 0;
      }
      g = n;
    }
    const dl = new Uint8Array(W * H);
    for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
      let c = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) c |= g[(j + b) * W + i + a];
      dl[j * W + i] = c;
    }
    grid = dl;
    const seen = new Uint8Array(W * H), cs = [];
    for (let k = 0; k < W * H; k++) if (grid[k] && !seen[k]) {
      const q = [k];
      seen[k] = 1;
      for (let n = 0; n < q.length; n++) for (const o of [1, -1, W, -W]) { const i = q[n] + o; if (grid[i] && !seen[i]) { seen[i] = 1; q.push(i); } }
      cs.push(q);
    }
    cs.sort((a, b) => b.length - a.length);
    const keep = cs.filter((c, i) => i === 0 || c.length >= 40);
    grid = new Uint8Array(W * H);
    keep.forEach(c => c.forEach(k => grid[k] = 1));
    // liga cada caverna isolada à mais próxima com um túnel sinuoso
    for (let i = 1; i < keep.length; i++) {
      const a = keep[i][keep[i].length >> 1];
      let bd = 1e9, bk = 0;
      for (let m = 0; m < i; m++) for (let n = 0; n < keep[m].length; n += 5) {
        const k = keep[m][n], d = (k % W - a % W) ** 2 + ((k / W | 0) - (a / W | 0)) ** 2;
        if (d < bd) { bd = d; bk = k; }
      }
      tun(a % W, a / W | 0, bk % W, bk / W | 0, 1, 1, 1);
    }
    s0 = bfs(grid, keep[0][0]).q.pop();
    e0 = bfs(grid, s0).q.pop();
  } else {
    const goal = opts.rooms || ri(11, 16);
    for (let t = 0; t < 500 && rooms.length < goal; t++) {
      const big = rooms.length === 2 || r() < .1, w = big ? ri(13, 17) : ri(6, 12), h = big ? ri(11, 15) : ri(6, 12), x = ri(3, W - w - 4), y = ri(3, H - h - 4);
      if (rooms.some(o => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y)) continue;
      const sh = big ? 4 : ri(0, 6), c = Math.min(w, h) / 3 | 0;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), sh, big, deg: 0 });
      // formas: 0 retângulo+braseiro, 1 elipse+altar, 2 cruz, 3 pilares, 4 octógono/grande salão, 5 em L, 6 orgânica
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let ok = true;
        const a = (i - (w - 1) / 2) / (w / 2), b = (j - (h - 1) / 2) / (h / 2), d = Math.min(i, j, w - 1 - i, h - 1 - j), mid = i === w >> 1 && j === h >> 1;
        if (sh === 1) ok = a * a + b * b <= 1;
        else if (sh === 2) { const tw = w / 3 | 0, th = h / 3 | 0; ok = (i >= tw && i < w - tw) || (j >= th && j < h - th); }
        else if (sh === 3) ok = !(i % 3 === 2 && j % 3 === 2 && d > 1 && !mid);
        else if (sh === 4) ok = i + j >= c && w - 1 - i + j >= c && i + h - 1 - j >= c && w - 1 - i + h - 1 - j >= c && !(big && i % 4 === 2 && j % 4 === 2 && d > 1 && !mid);
        else if (sh === 5) ok = !(i >= Math.ceil(w * .55) && j < h >> 1);
        else if (sh === 6) ok = d >= 2 || r() < .5;
        if (ok) grid[(y + j) * W + x + i] = 1;
      }
    }
    const n = rooms.length, dist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy), inT = [0], ed = new Set();
    const link = (a, b) => {
      const A = rooms[a], B = rooms[b], hw = r() < .5 ? 0 : 1;
      A.deg++; B.deg++;
      if (r() < .4) {
        const mx = Math.max(4, Math.min(W - 5, ((A.cx + B.cx) >> 1) + ri(-9, 9))), my = Math.max(4, Math.min(H - 5, ((A.cy + B.cy) >> 1) + ri(-9, 9)));
        tun(A.cx, A.cy, mx, my, hw, 1, 2); tun(mx, my, B.cx, B.cy, hw, 1, 2);
      } else tun(A.cx, A.cy, B.cx, B.cy, hw, 0, 2);
    };
    // árvore geradora mínima (Prim) com pesos ruidosos
    while (inT.length < n) {
      let bd = 1e9, ba = 0, bb = 0;
      for (const a of inT) for (let b = 0; b < n; b++) if (!inT.includes(b)) { const d = dist(rooms[a], rooms[b]) * (.8 + r() * .4); if (d < bd) { bd = d; ba = a; bb = b; } }
      inT.push(bb); ed.add(ba + '-' + bb); link(ba, bb);
    }
    // ciclos: atalhos entre salas vizinhas
    for (let a = 0; a < n; a++) {
      if (r() > .4) continue;
      let bd = 1e9, bb = -1;
      for (let b = 0; b < n; b++) if (b !== a && !ed.has(a + '-' + b) && !ed.has(b + '-' + a)) { const d = dist(rooms[a], rooms[b]); if (d < bd) { bd = d; bb = b; } }
      if (bb >= 0 && bd < 32) { ed.add(a + '-' + bb); link(a, bb); loops++; }
    }
    // becos sem saída com câmara no fim
    const nk = ri(2, 4);
    for (let k = 0; k < nk; k++) {
      const A = rooms[ri(0, n - 1)], ang = r() * 6.28, L = ri(8, 14), tx = Math.round(Math.max(5, Math.min(W - 6, A.cx + Math.cos(ang) * L))), ty = Math.round(Math.max(5, Math.min(H - 6, A.cy + Math.sin(ang) * L)));
      tun(A.cx, A.cy, tx, ty, 0, 1, 2);
      for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) set(tx + p, ty + q, 2);
      nooks.push({ x: tx, y: ty });
    }
    // início e saída = par de salas mais distantes pelo caminho
    const rc = o => o.cy * W + o.cx, far = d => rooms.reduce((a, b) => d[rc(b)] > d[rc(a)] ? b : a);
    const sA = far(bfs(grid, rc(rooms[0])).d), eA = far(bfs(grid, rc(sA)).d);
    sA.start = 1; eA.end = 1; s0 = rc(sA); e0 = rc(eA);
    rooms.forEach(o => { o.role = o.start ? 'inicio' : o.end ? 'saida' : o.big ? 'salao' : o.deg === 1 ? 'beco' : 'sala'; });
  }
  if (theme === 'ruinas') {
    const g2 = grid.slice();
    for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
      const k = j * W + i;
      let n = 0;
      for (const o of [1, -1, W, -W]) n += grid[k + o] ? 1 : 0;
      if (grid[k] === 1 && n < 4 && r() < .3) g2[k] = 0;
      else if (!grid[k] && n >= 2 && r() < .35) g2[k] = 1;
    }
    rooms.forEach(o => g2[o.cy * W + o.cx] = 1);
    // a erosão não pode isolar a saída (nem deixar pouco mapa): se isolar, mantém a cripta intacta
    const d2 = bfs(g2, s0).d;
    let n2 = 0, n1 = 0;
    for (let k = 0; k < W * H; k++) { if (g2[k] && d2[k] >= 0) n2++; if (grid[k]) n1++; }
    if (d2[e0] >= 0 && n2 > n1 * .6) grid = g2;
  }
  const reach = bfs(grid, s0).d;
  let floor = 0;
  for (let k = 0; k < W * H; k++) { if (grid[k] && reach[k] < 0) grid[k] = 0; if (grid[k]) floor++; }
  return { W, H, theme, seed: String(seed), grid, rooms, nooks, loops, s0, e0, path: reach[e0], floor };
}
