/* Pendências (Etapa 6b): XP de Rod pelo ataque básico, bug de dano do Ladino ao recarregar, texturas da prévia, requisitos de proficiência do Cajado.
   Uso: node test-pend.js <porta-atual> <porta-V555>   (V555 = jogo antes da correção, para provar o bug antigo) */
const fs = require('fs'), path = require('path');
const lib = require('./lib');
const port = process.argv[2], pold = process.argv[3] || '8775';
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };

(async () => {
  const browser = await lib.launch();
  console.log('XP de Rod pelo ataque básico');
  {
    const { ctx, page, errs } = await lib.open(browser, port, 'mago', 1280, 720);
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, PR = g.PROF, W = g.WEAPONS, C = PR.PROF, r = {};
      const Cb = await import('/js/systems/combat.js'), Reg = await import('/js/core/registry.js'), Sc = await import('/js/data/scaling.js');
      const wi = n => W.findIndex(w => w.n === n), mk = (n) => ({ ty: 'wpn', q: 1, v: W[wi(n)].b, il: 1, w: wi(n), n });
      const rnd = Math.random, pn = performance.now.bind(performance); let off = 0; performance.now = () => pn() + off;
      const w_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
      P.sit = P.sitT = 0; P.dead = false; P.lv = 10; P.mmax = 5000; P.mp = 5000;
      const tot = c => { const p = P.prof[c]; let t = p.xp; for (let l = 1; l < p.lv; l++) t += C.xpNext(l); return t; };
      const e = g.enemies.find(x => !x.dead);
      const place = (lvOff = 0) => { e.x = P.x + 6; e.z = P.z; e.hp = e.max = 1e9; e.lv = P.lv + lvOff; e.stone = 0; e.dead = 0; e.slow = e.root = e.bn = e.ps = 0; P.tgt = e; P.cd = 0; P.aimv = 1; };
      const shot = (gun, lvOff = 0) => { off += 30000; PR.resetProf(); g.eq.gun = mk(gun); g.setWeapon('gun'); P.act = 'gun'; place(lvOff); P.mp = P.mmax; const s0 = tot('staff'), r0 = tot('rod'), h0 = e.hp;
        w_(.5, () => { g.attack(e.x - P.x, e.z - P.z); const s = Reg.shots[Reg.shots.length - 1]; for (let i = 0; i < 80 && Reg.shots.includes(s); i++) Cb.updateShots(.05); });
        return { eff: h0 - e.hp, ds: +(tot('staff') - s0).toFixed(3), dr: +(tot('rod') - r0).toFixed(3) }; };
      r.rate = C.ROD_XP_basico;
      r.rod = shot('Rod de Gelo'); r.rodExp = +(r.rod.eff * C.ROD_XP_basico).toFixed(3);
      r.low = shot('Rod de Gelo', -5); r.lowExp = +(r.low.eff * C.ROD_XP_basico * Sc.xpMult(-5)).toFixed(3);
      r.trivial = shot('Rod de Gelo', -10);
      r.staff = shot('Cajado do Aprendiz');
      // habilidades/golpe comum não rendem (só o tiro com elemento); corpo a corpo não rende
      off += 30000; PR.resetProf(); g.eq.gun = mk('Rod de Gelo'); g.setWeapon('gun'); P.act = 'gun'; place(); const a0 = tot('rod'); w_(.5, () => g.hit(e, 100, {})); r.plain = tot('rod') - a0;
      g.eq.wpn = mk('Cutelo Pirata'); g.setWeapon('wpn'); P.act = 'wpn'; place(); const m0 = tot('rod'); w_(.5, () => g.hit(e, 100, { el: 'ice' })); r.melee = tot('rod') - m0;
      // teto por janela (mesmo do suporte)
      g.eq.gun = mk('Rod de Gelo'); g.setWeapon('gun'); P.act = 'gun'; off += 30000; PR.resetProf(); place(); const c0 = tot('rod'); w_(.5, () => { for (let i = 0; i < 400; i++) { e.hp = 1e9; g.hit(e, 5000, { el: 'ice', elc: 0 }); } }); r.cap = +(tot('rod') - c0).toFixed(2); r.capCfg = C.rod.capWin;
      performance.now = pn; return r;
    });
    chk('padrão ROD_XP_basico = 0,02 (pequeno)', R.rate === .02, R.rate);
    chk('tiro do Rod rende XP só de Rod, ≈ dano efetivo × 0,02', R.rod.dr > 0 && R.rod.ds === 0 && Math.abs(R.rod.dr - R.rodExp) < .02, [R.rod, R.rodExp]);
    chk('inimigo 5 níveis abaixo rende só 25%; 10 abaixo (trivial) rende 0', Math.abs(R.low.dr - R.lowExp) < .02 && R.low.dr > 0 && R.trivial.dr === 0, [R.low, R.lowExp, R.trivial]);
    chk('Cajado continua só XP de Cajado (0 de Rod)', R.staff.ds > 0 && R.staff.dr === 0, R.staff);
    chk('golpe sem elemento e corpo a corpo não rendem XP de Rod', R.plain === 0 && R.melee === 0, [R.plain, R.melee]);
    chk('teto anti-abuso do Rod (≤ ' + R.capCfg + ' por janela) mesmo com golpes gigantes', R.cap <= R.capCfg + .01, R.cap);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  console.log('Dano do Ladino ao recarregar');
  for (const [nome, p, esperaFixo] of [['V555 (antes)', pold, false], ['atual', port, true]]) {
    const { ctx, page, errs } = await lib.open(browser, p, 'ladino', 1280, 720);
    const d = [];
    d.push(await page.evaluate(async () => { const Sv = await import('/js/systems/save.js'); Sv.saveGame(); return __game.P.dmg; }));
    for (let i = 0; i < 3; i++) {
      await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1200);
      d.push(await page.evaluate(async () => { const Sv = await import('/js/systems/save.js'); Sv.saveGame(); return __game.P.dmg; }));
    }
    chk(nome + ': dano ao recarregar 3×: ' + d.join(' → ') + (esperaFixo ? ' (estável)' : ' (cresce: bug antigo)'), esperaFixo ? d.every(x => x === d[0]) : d[3] > d[0], d);
    await ctx.close();
  }
  for (const k of ['guerreiro', 'cacador', 'mago', 'none']) {
    const { ctx, page } = await lib.open(browser, port, k, 1280, 720);
    const d = [await page.evaluate(async () => { const Sv = await import('/js/systems/save.js'); Sv.saveGame(); return __game.P.dmg; })];
    for (let i = 0; i < 2; i++) { await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1200); d.push(await page.evaluate(async () => { const Sv = await import('/js/systems/save.js'); Sv.saveGame(); return __game.P.dmg; })); }
    chk(k + ': dano estável ao recarregar (' + d.join(' → ') + ')', d.every(x => x === d[0]), d);
    await ctx.close();
  }
  console.log('Prévia: texturas');
  {
    const tex = ['bark.jpg', 'bark-dead.jpg', 'rock.jpg'], dir = path.join(__dirname, '..', '..', 'preview', 'icons', 'tex');
    chk('preview/icons/tex tem as 3 texturas após o build', tex.every(f => fs.existsSync(path.join(dir, f))), tex.map(f => fs.existsSync(path.join(dir, f))));
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: lib.three() })); await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
    await ctx.addInitScript(() => { localStorage.setItem('pirata-mapver', '800-2'); localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [{ id: 't1', name: 'T', f: false, t: Date.now(), k: 'mago' }], active: 't1' })); });
    const p = await ctx.newPage(), n404 = []; p.on('response', r => { if (r.status() === 404) n404.push(r.url().replace('http://localhost:' + port + '/', '')); });
    await p.goto('http://localhost:' + port + '/preview/preview.html#dev'); await p.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await p.waitForTimeout(2500);
    chk('prévia em /preview/: nenhum 404 de textura', !n404.some(u => /tex\//.test(u)), n404);
    await ctx.close();
  }
  console.log('Requisitos do Cajado (STAFF_PROF)');
  {
    const { ctx, page } = await lib.open(browser, port, 'mago', 1280, 720);
    const D = await page.evaluate(async () => (await import('/js/data/skills.js')).STAFF_PROF);
    chk('STAFF_PROF = [1,3,5] (medido na Etapa 5: prof 3 no nível 6 e 5 no 12, com 35%/25% de folga)', JSON.stringify(D) === '[1,3,5]', D);
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
