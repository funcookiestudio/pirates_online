const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
const sizes = [[1280, 720, false], [390, 800, true], [780, 360, true]];
(async () => {
  const browser = await require('./lib').launch();
  for (const k of classes) for (const [w, h, touch] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: require('./lib').three() }));
    await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
    await ctx.addInitScript(([k]) => { localStorage.setItem('pirata-mapver', '800-2'); const c = { id: 't1', name: 'Teste', f: false, t: Date.now() }; if (k !== 'none') c.k = k; localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [c], active: 't1' })); }, [k]);
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
    await page.goto('http://localhost:' + port + '/index.html#dev');
    await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    const out = await page.evaluate(async () => {
      const g = window.__game, P = g.P, SK = g.SK, res = {};
      const step = s => { for (let t = 0; t < s; t += .033) SK.update(.033); };
      P.sit = P.sitT = 0;
      if (SK.on) { P.lv = 12; P.mmax = 100; P.mp = 100; if (window.__game.PROF && window.__game.PROF.devSet) window.__game.PROF.devSet('staff', 20); }
      await new Promise(r => setTimeout(r, 600));
      const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const els = [...document.querySelectorAll('#sk > div, #lnch, #gwl, #gwr')].filter(vis);
      const R = els.map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, x: r.left, y: r.top, w: r.width, h: r.height }; });
      res.n = R.length; res.skBtns = R.filter(r => /^k\d/.test(r.id)).length;
      res.offscreen = R.filter(r => r.x < -1 || r.y < -1 || r.x + r.w > innerWidth + 1 || r.y + r.h > innerHeight + 1).map(r => r.id);
      const ov = [];
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
        const a = R[i], b = R[j];
        if (a.id === 'gwl' || b.id === 'gwl' || a.id === 'gwr' || b.id === 'gwr') { /* diamantes são losangos inclinados: usa só o centro */ }
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const shrink = (a.id[0] === 'g' || b.id[0] === 'g') ? 14 : 3;   // diamantes: caixa inclinada tem canto vazio
        if (ix > shrink && iy > shrink) ov.push(a.id + '×' + b.id + ' ' + Math.round(ix) + 'x' + Math.round(iy));
      }
      res.overlaps = ov;
      res.diamond = { cls: document.getElementById('gwr').className, txt: document.getElementById('mpt').textContent, h: document.getElementById('mp').style.height };
      if (SK.on) {
        P.mp = 50; await new Promise(r => setTimeout(r, 300));
        res.diamond50 = { txt: document.getElementById('mpt').textContent, h: document.getElementById('mp').style.height };
        P.mp = 100;
        res.oldBarGone = !document.getElementById('skl') && !document.getElementById('skm');
        const es = g.enemies.filter(e => !e.dead).slice(0, 3);
        es.forEach((e, i) => { e.x = P.x + 4 + i; e.z = P.z; e.hx = e.x; e.hz = e.z; e.hp = e.max = 1e6; e.ag = true; e.dmg = 0; });
        P.tgt = es[0];
        res.btnCls = [...document.querySelectorAll('#sk > .skb')].map(b => b.className);
        P.mp = 1; SK.useSkill(1); await new Promise(r => setTimeout(r, 100)); res.blink = document.getElementById('gwr').classList.contains('lowmp');
        P.mp = 100;
      }
      return res;
    });
    // clique e teclas (por entrada real)
    let inp = null;
    if (classes.includes(k) && k !== 'none') {
      await page.evaluate(() => { const g = window.__game, P = g.P; g.SK.S.cds = [0, 0, 0]; P.mp = 100; const e0 = g.enemies.filter(e => !e.dead)[0]; e0.hp = e0.max = 1e6; e0.dmg = 0; P.x = P.tx = e0.x - 3; P.z = P.tz = e0.z; P.tgt = g.enemies.filter(e => !e.dead)[0]; });
      const r0 = await page.evaluate(() => document.getElementById('k1').getBoundingClientRect().toJSON());
      if (touch) await page.touchscreen.tap(r0.x + r0.width / 2, r0.y + r0.height / 2); else await page.mouse.click(r0.x + r0.width / 2, r0.y + r0.height / 2);
      await page.waitForTimeout(150);
      const c1 = await page.evaluate(() => window.__game.SK.S.cds[0] > 0 || !!window.__game.SK.S.leap || !!window.__game.SK.S.cast || !!window.__game.SK.S.tp);
      const hit = await page.evaluate(() => { const b = document.getElementById('k1').getBoundingClientRect(); const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return e ? (e.id || e.className || e.tagName) + '|' + (e.closest('#k1') ? 'k1' : 'other') : null; });
      await page.evaluate(() => { const g = window.__game; for (let t = 0; t < 2; t += .033) g.SK.update(.033); g.SK.S.cds = [0, 0, 0]; g.P.mp = 100; });
      await page.keyboard.press('Digit2'); await page.waitForTimeout(150);
      const c2 = await page.evaluate(() => window.__game.SK.S.cds[1] > 0);
      await page.evaluate(() => { const g = window.__game; for (let t = 0; t < 2; t += .033) g.SK.update(.033); g.SK.S.cds = [0, 0, 0]; g.P.mp = 100; });
      await page.keyboard.press('Digit3'); await page.waitForTimeout(150);
      const c3 = await page.evaluate(() => window.__game.SK.S.cds[2] > 0);
      inp = { hit, click1: c1, key2: c2, key3: c3 };
    }
    console.log('===', k, w + 'x' + h, JSON.stringify(out), inp ? JSON.stringify(inp) : '');
    console.log('   errors:', errs.length ? errs.slice(0, 5) : 'nenhum');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
