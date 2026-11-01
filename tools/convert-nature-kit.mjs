// Converte modelos OBJ do Stylized Nature MegaKit (Quaternius, CC0) em js/world/nature-kit-data.js:
// triângulos soltos com cor sólida por face (sem texturas). Uso: node tools/convert-nature-kit.mjs "<pasta OBJ>"
import fs from 'fs';
const dir = process.argv[2];
const COL = { Rocks: 0x72746a, PathRocks: 0x8d8a7e, Flowers: 0xf0709a, Leaves: 0x5aa83c };
const list = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Pebble_Round_1', 'Pebble_Round_3', 'Pebble_Square_2', 'Pebble_Square_5', 'Mushroom_Common', 'Mushroom_Laetiporus', 'Flower_3_Single', 'Flower_3_Group', 'Flower_4_Single'];
const out = {};
for (const n of list) {
  const v = [], tris = []; let mtl = 'Rocks', ymax = -1e9, ymin = 1e9;
  for (const l of fs.readFileSync(`${dir}/${n}.obj`, 'utf8').split('\n')) {
    const t = l.trim().split(/\s+/);
    if (t[0] === 'v') { v.push(t.slice(1, 4).map(Number)); ymax = Math.max(ymax, +t[2]); ymin = Math.min(ymin, +t[2]); }
    else if (t[0] === 'usemtl') mtl = t[1];
    else if (t[0] === 'f') {
      const ix = t.slice(1).map(s => +s.split('/')[0] - 1);
      for (let k = 1; k < ix.length - 1; k++) tris.push([ix[0], ix[k], ix[k + 1], mtl]);
    }
  }
  const pos = [], col = [];
  for (const [a, b, c, m] of tris) {
    let color = COL[m];
    if (m === 'Mushrooms') { const y = (v[a][1] + v[b][1] + v[c][1]) / 3; color = (y - ymin) / (ymax - ymin) > .45 ? (n === 'Mushroom_Laetiporus' ? 0xf0b030 : 0xe0922f) : 0xe8dcc0; }
    for (const i of [a, b, c]) pos.push(...v[i].map(x => +x.toFixed(3)));
    col.push(color);
  }
  out[n] = { p: pos, c: col };
}
fs.writeFileSync('js/world/nature-kit-data.js', '/* Gerado por tools/convert-nature-kit.mjs — Stylized Nature MegaKit, Quaternius, CC0. p: posições (3 triângulos-vértices por face), c: cor por face. */\nexport const KIT = ' + JSON.stringify(out) + ';\n');
