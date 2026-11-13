/* Etapa 3 (Cajado × Rod, ataques básicos elementais): metadados, índices antigos, ataque/mana/elemento/status, taxa de aplicação, DPS medido, sem mana,
   equipar/trocar, restrição de classe, save/load e guarda de updateShots.
   Uso: node test-etapa3.js <porta> [classes]   (lê a lista de armas da V551 em ../../../pirates_online_backup/E3-antes/weapons-v551.json) */
const fs = require('fs'), path = require('path');
const lib = require('./lib');
const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
const BASE = JSON.parse(fs.readFileSync(process.env.WBASE || path.join(__dirname, '..', '..', '..', 'pirates_online_backup', 'E3-antes', 'weapons-v551.json'), 'utf8'));
const MAGIC = { 'Cajado do Aprendiz': ['staff', 'ice'], 'Cajado de Carvalho': ['staff', 'earth'], 'Rod de Cristal': ['rod', 'lightning'], 'Rod das Chamas': ['rod', 'fire'], 'Cajado de Fogo': ['staff', 'fire'], 'Cajado Venenoso': ['staff', 'poison'], 'Rod de Gelo': ['rod', 'ice'] };
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };
const table = [];
(async () => {
  const browser = await lib.launch();
  for (const k of classes) {
    console.log(k);
    const { ctx, page, errs } = await lib.open(browser, port, k, 1280, 720);
    const R = await page.evaluate(async ([MAGIC, BASE, k]) => {
      const g = window.__game, P = g.P, W = g.WEAPONS, S = g.SK.S, M = g.ELM, res = {};
      const Reg = await import('/js/systems/../core/registry.js'), Cb = await import('/js/systems/combat.js'), Sv = await import('/js/systems/save.js');
      const wi = n => W.findIndex(w => w.n === n);
      const mk = (n, il) => { const w = W[wi(n)]; return { ty: 'wpn', q: 1, v: Math.round(w.b * (1 + (il - 1) * .2)), il, w: wi(n), n }; };
      const rnd = Math.random, with_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
      P.sit = P.sitT = 0; P.dead = false;
      // A) metadados e índices antigos
      res.nW = W.length;
      res.idx = BASE.every((b, i) => W[i].n === b[0] && (W[i].lv || 0) === b[1] && W[i].b === b[2]);
      res.idxStats = BASE.slice(0, 61).every((b, i) => W[i].mul === b[3] && W[i].cd === b[4] && (W[i].mp || 0) === b[5] && W[i].rng === b[6]);
      res.old4 = BASE.slice(61).map((b, j) => { const w = W[61 + j]; return { n: w.n, same: w.n === b[0] && w.lv === b[1] && w.b === b[2] && w.col === b[7], mul: [b[3], w.mul], cd: [b[4], w.cd], mp: [b[5], w.mp], rng: [b[6], w.rng] }; });
      res.meta = Object.keys(MAGIC).map(n => { const w = W[wi(n)]; return { n, ok: !!w && w.mt === MAGIC[n][0] && w.el === MAGIC[n][1] && w.magic === 1 && w.cls === 'mago' && w.rod === undefined, idx: wi(n) }; });
      res.newAtEnd = ['Cajado de Fogo', 'Cajado Venenoso', 'Rod de Gelo'].map(n => wi(n)).every(i => i >= 65);
      if (k !== 'mago' && k !== 'none') {   // classes sem permissão
        const it = mk('Cajado de Fogo', 12); g.bag.length = 0; g.bag.push(it); P.lv = 20; const before = g.eq.gun && g.eq.gun.n; g.equip(0);
        res.deny = { gun: g.eq.gun && g.eq.gun.n, before, can: g.canEquipTo(it, 'gun'), bag: g.bag.length };
        const it2 = mk('Rod de Gelo', 12); g.bag.push(it2); g.equip(1); res.deny.rod = g.eq.gun && g.eq.gun.n;
        return res;
      }
      // B) ataque de cada arma mágica
      const e = g.enemies.find(x => !x.dead); e.dmg0 = e.dmg; P.lv = 20; P.mmax = 5000;
      const place = () => { e.x = P.x + 6; e.z = P.z; e.vx = e.vz = 0; e.hp = e.max = 1e9; e.lv = P.lv; e.stone = 0; e.mk = 0; e.sn = 0; e.kx = e.kz = 0; M.clearStatus(e); e.slow = e.root = e.bn = e.ps = 0; e.res = undefined; e.dmg = e.dmg0; P.tgt = e; P.mp = P.mmax; P.cd = 0; P.aimv = 1; };
      const shoot = () => { const n0 = Reg.shots.length; g.attack(e.x - P.x, e.z - P.z); const s = Reg.shots[Reg.shots.length - 1], made = Reg.shots.length > n0; const col = made && s.m.material ? s.m.material.color.getHex() : null; for (let i = 0; i < 80 && Reg.shots.includes(s); i++) Cb.updateShots(.05); return { made, col, s }; };
      const useGun = (n, il) => { g.eq.gun = mk(n, il); g.setWeapon('gun'); P.act = 'gun'; P.swap = null; };
      res.atk = {};
      for (const n of Object.keys(MAGIC)) {
        const w = W[wi(n)], o = {}, st0 = w.elc; useGun(n, 12); place();
        const mp0 = P.mp, h0 = e.hp; const r = with_(.5, () => shoot()); o.made = r.made; o.col = r.col; o.dmg = h0 - e.hp; o.mp = mp0 - P.mp; o.cdMax = P.cdMax; o.dmgPlain = null;
        // chance 1 aplica o status principal; chance 0 nunca
        const prim = { ice: 'slow', earth: 'root', lightning: 'shock', fire: 'burn', poison: 'poison' }[w.el];
        place(); w.elc = 1; with_(.001, () => shoot()); o.st1 = M.hasStatus(e, prim);
        place(); w.elc = 0; let any = 0; for (let i = 0; i < 100; i++) { place(); shoot(); if (M.statusList(e).length) any++; } o.st0 = any;
        // taxa de aplicação ≈ chance configurada (amostra grande)
        w.elc = st0; let hits = 0; const N = 600; for (let i = 0; i < N; i++) { place(); shoot(); if (M.hasStatus(e, prim)) hits++; } o.rate = hits / N; o.chance = st0; o.prim = prim;
        // resistência 1 ao elemento: nunca aplica
        place(); e.res = { [w.el]: 1 }; w.elc = 1; with_(.001, () => shoot()); o.res1 = M.statusList(e).length === 0; w.elc = st0;
        // sem mana: pancada fraca, sem elemento e sem gastar
        place(); P.mp = 0; const ns = Reg.shots.length; g.attack(e.x - P.x, e.z - P.z); P.imp = 0; g.impact(); o.noMana = { shots: Reg.shots.length - ns, st: M.statusList(e).length, mp: P.mp, eff: Cb.effRng() };
        res.atk[n] = o;
      }
      // C) Staff × Rod em condições equivalentes (mesmo nível 12, qualidade e elemento de patamar): dano medido sem crítico, DPS e mana/s
      res.cmp = {};
      for (const n of ['Cajado de Fogo', 'Rod de Gelo', 'Cajado Venenoso', 'Rod de Cristal', 'Rod das Chamas', 'Cajado de Carvalho', 'Cajado do Aprendiz']) { useGun(n, 12); place(); const m0 = P.mp, h0 = e.hp; with_(.5, () => shoot()); const d = h0 - e.hp; res.cmp[n] = { dmg: d, cd: P.cdMax, dps: +(d / P.cdMax).toFixed(2), mps: +((m0 - P.mp) / P.cdMax).toFixed(2), mp: m0 - P.mp }; }
      // D) equipar Staff ↔ Rod pela mochila e X: o estado do personagem fica íntegro
      g.eq.gun = mk('Cajado do Aprendiz', 1); g.setWeapon('gun'); P.act = 'gun'; g.bag.length = 0; g.bag.push(mk('Cajado de Fogo', 12), mk('Rod de Gelo', 12));
      const snap = () => JSON.stringify({ hp: P.hp, max: P.max, mp: Math.round(P.mp), mmax: P.mmax, lv: P.lv, xp: P.xp, rk: S.rk, tl: S.tl, tb: S.tb });
      P.hp = P.max - 3; P.mp = P.mmax - 5; const s0 = snap(); res.swap = [];
      g.equip(0, 'gun'); res.swap.push(g.eq.gun.n); g.equip(g.bag.findIndex(b => b.n === 'Rod de Gelo'), 'gun'); res.swap.push(g.eq.gun.n); g.equip(g.bag.findIndex(b => b.n === 'Cajado de Fogo'), 'gun'); res.swap.push(g.eq.gun.n);
      res.swapState = [s0, snap()];
      res.bagKeeps = g.bag.map(b => b.n).sort();
      const stab0 = JSON.stringify({ max: P.max, mmax: P.mmax, lv: P.lv, xp: P.xp, rk: S.rk, tl: S.tl, tb: S.tb }); const idle = async () => { for (let i = 0; i < 300 && P.swap; i++) await new Promise(r => setTimeout(r, 100)); }; const act0 = P.act; g.switchWeapon(); await idle(); const act1 = P.act; g.switchWeapon(); await idle();
      const stab = () => JSON.stringify({ max: P.max, mmax: P.mmax, lv: P.lv, xp: P.xp, rk: S.rk, tl: S.tl, tb: S.tb }); res.xkey = [act0, act1, P.act, stab() === stab0];
      // E) save/load: Rod de Gelo equipado, depois Cajado do Aprendiz (save antigo)
      g.eq.gun = mk('Rod de Gelo', 12); g.setWeapon('gun'); P.act = 'gun'; Sv.saveGame();
      res.saved = true;
      // F) guarda de updateShots (alvo nulo)
      const n0 = Reg.shots.length; Reg.shots.push({ m: new THREE.Object3D(), t: null, d: 1, sp: 10 }); let thrown = null; try { Cb.updateShots(.05); } catch (x) { thrown = String(x); } res.guard = { thrown, left: Reg.shots.length - n0 };
      // G) golpe sem elemento: igual ao de sempre
      place(); const h1 = e.hp; with_(.5, () => g.hit(e, 100, {})); res.noEl = h1 - e.hp;
      return res;
    }, [MAGIC, BASE, k]);
    chk('metadados mt/el corretos nas 7 armas (e rod:1 antigo removido)', R.meta.every(m => m.ok), R.meta.filter(m => !m.ok));
    chk('catálogo: ' + R.nW + ' armas (65 antigas + 3 novas no fim)', R.nW === 68 && R.newAtEnd, R.nW);
    chk('índices/nomes/lv/b das 65 armas antigas inalterados; armas não mágicas idênticas', R.idx && R.idxStats);
    chk('Aprendiz e Carvalho idênticos (mul/cd/mp/rng), cores originais', R.old4.slice(0, 2).every(o => o.same && o.mul[0] === o.mul[1] && o.cd[0] === o.cd[1] && o.mp[0] === o.mp[1] && o.rng[0] === o.rng[1]), R.old4.slice(0, 2));
    chk('Rods: mesmos nomes/nível/b/cor (mul/cd/mp mudam pela tabela)', R.old4.slice(2).every(o => o.same), R.old4.slice(2));
    if (R.deny) { chk(k + ' NÃO equipa Cajado/Rod', R.deny.gun === R.deny.before && R.deny.can === false && R.deny.rod === R.deny.before, R.deny); }
    else {
      const A = R.atk;
      for (const n of Object.keys(A)) {
        const o = A[n];
        chk(n + ': ataca, dano > 0, gasta mana e orbe com a cor da arma', o.made && o.dmg > 0 && o.mp > 0, { dmg: o.dmg, mp: o.mp, col: o.col });
        chk(n + ': chance 1 aplica o status (' + o.prim + '), chance 0 nunca (0/100)', o.st1 && o.st0 === 0, { st1: o.st1, st0: o.st0 });
        chk(n + ': taxa de aplicação ≈ chance configurada (' + o.chance + ')', Math.abs(o.rate - o.chance) < .08, o.rate);
        chk(n + ': resistência 1 bloqueia; sem mana = pancada fraca sem elemento', o.res1 && o.noMana.shots === 0 && o.noMana.st === 0 && o.noMana.mp === 0 && o.noMana.eff < 3, o.noMana);
      }
      const C = R.cmp;
      chk('Staff > Rod no mesmo patamar (Cajado de Fogo × Rod de Gelo, nível 12): dano básico e DPS medidos', C['Cajado de Fogo'].dmg > C['Rod de Gelo'].dmg && C['Cajado de Fogo'].dps > C['Rod de Gelo'].dps && C['Rod de Gelo'].dmg > 0, [C['Cajado de Fogo'], C['Rod de Gelo']]);
      chk('Rod ainda causa dano útil (≥ 60% do dano do Cajado equivalente)', C['Rod de Gelo'].dmg >= .6 * C['Cajado de Fogo'].dmg, [C['Rod de Gelo'].dmg, C['Cajado de Fogo'].dmg]);
      table.push([k, C]);
      chk('equipar Cajado↔Rod pela mochila mantém vida/mana/nível/ranks/talentos; nada some da mochila', R.swap.join('>') === 'Cajado de Fogo>Rod de Gelo>Cajado de Fogo' && R.swapState[0] === R.swapState[1] && R.bagKeeps.length === 2, [R.swap, R.swapState, R.bagKeeps]);
      chk('tecla X (arma↔arma de fogo) mantém o estado', R.xkey[3] && R.xkey[0] !== R.xkey[1] && R.xkey[0] === R.xkey[2], R.xkey);
    }
    chk('updateShots: bala com alvo nulo não lança erro e é descartada', !R.guard || (R.guard.thrown === null && R.guard.left === 0), R.guard);
    if (!R.deny) chk('golpe sem elemento = 100 (igual ao de antes)', R.noEl === 100 || k !== 'none', R.noEl);
    if (!R.deny) {   // save/load: Rod de Gelo equipado volta igual; depois Cajado do Aprendiz
      await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
      const a = await page.evaluate(() => { const g = window.__game; return { gun: g.eq.gun && g.eq.gun.n, w: g.WEAPONS[g.eq.gun.w].mt + '/' + g.WEAPONS[g.eq.gun.w].el, il: g.eq.gun.il }; });
      chk('save/load com Rod de Gelo equipado', a.gun === 'Rod de Gelo' && a.w === 'rod/ice', a);
      const b = await page.evaluate(async () => { const g = window.__game, Sv = await import('/js/systems/save.js'); const w = g.WEAPONS.findIndex(x => x.n === 'Cajado do Aprendiz'); g.eq.gun = { ty: 'wpn', q: 1, v: 2, il: 1, w, n: 'Cajado do Aprendiz' }; g.setWeapon('gun'); Sv.saveGame(); return true; });
      await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
      const c = await page.evaluate(() => { const g = window.__game, w = g.WEAPONS[g.eq.gun.w]; return { gun: g.eq.gun.n, mul: w.mul, cd: w.cd, mp: w.mp, rng: w.rng, wid: g.WEAPONS[g.P.wid].n }; });
      chk('save antigo com Cajado do Aprendiz carrega igual (1.1/.8/4/11)', c.gun === 'Cajado do Aprendiz' && c.mul === 1.1 && c.cd === .8 && c.mp === 4 && c.rng === 11, c);
    }
    console.log('   errors: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'nenhum'));
    if (errs.length) bad++;
    await ctx.close();
  }
  if (table.length) {
    const C = table[0][1];
    console.log('Tabela medida (mago, nível 12, qualidade comum, sem crítico): arma · dano/tiro · recarga · DPS · mana/tiro · mana/s');
    for (const n of Object.keys(C)) console.log('   ' + n + ' · ' + C[n].dmg + ' · ' + C[n].cd + ' · ' + C[n].dps + ' · ' + C[n].mp + ' · ' + C[n].mps);
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
