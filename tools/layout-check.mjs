/* Medidor de sobreposição do bairro do porto (V549). Uso (Node 22+): node tools/layout-check.mjs [semente ...]
   Para cada semente gera a ilha e confere: casa×casa (folga ≥ 1,5 m), casa×muralha, casa×castelo, chão plano e andável sob os cantos. Sai com código 1 se achar problema. */
import * as Tn from '../js/world/terrain.js';
import * as R from '../js/world/reserve.js';
const seeds = process.argv.length > 2 ? process.argv.slice(2) : ['brisa', 'ilha1', 'corsario', 'faro', 'pedra', 'tempo', 'mar', 'coral', 'vento', 'norte'];
let fails = 0;
for (const sd of seeds) {
  R.ZONES.length = 0; Tn.initTerrain([], sd);
  const F = R.districtFootprints(), bad = [];
  for (let i = 0; i < F.length; i++) {
    const C = F[i].C;
    if (Math.min(...C.map(p => Math.hypot(...p))) < R.WALL_OUT + 1) bad.push('muralha ' + F[i].kind);
    for (let j = i + 1; j < F.length; j++) if (R.footGap(C, F[j].C) < 1.5) bad.push(F[i].kind + '×' + F[j].kind);
    for (const p of C) { const h = Tn.heightAt(p[0], p[1]); if (Math.abs(h) > 1.2 || !Tn.walkable(p[0], p[1])) { bad.push('chão ' + F[i].kind); break; } }
    if (R.CASTLE.ok && Math.hypot(C[0][0] - R.CASTLE.x, C[0][1] - R.CASTLE.z) < 30) bad.push('castelo ' + F[i].kind);
  }
  if (!R.DISTRICT.ok) bad.push('sem bairro');
  console.log(sd, 'casas', F.length, 'porto', R.DISTRICT.port, bad.length ? 'PROBLEMAS: ' + bad.join(', ') : 'ok');
  fails += bad.length;
}
process.exit(fails ? 1 : 0);
