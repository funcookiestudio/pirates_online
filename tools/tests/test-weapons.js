const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
(async () => {
  const browser = await require('./lib').launch();
  for (const k of classes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: require('./lib').three() }));
    await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
    await ctx.addInitScript(([k]) => { if (localStorage.getItem('pirata-mapver') !== '800-2') { localStorage.setItem('pirata-mapver', '800-2'); const c = { id: 't1', name: 'Teste', f: false, t: Date.now() }; if (k !== 'none') c.k = k; localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [c], active: 't1' })); } }, [k]);
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
    await page.goto('http://localhost:' + port + '/index.html#dev');
    await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
    await page.waitForTimeout(2000);
    const out = await page.evaluate(async () => {
      const g = window.__game, P = g.P, W = g.WEAPONS, res = {};
      const wait = ms => new Promise(r => setTimeout(r, ms));
      res.start = { wpn: g.eq.wpn && g.eq.wpn.n, gun: g.eq.gun && g.eq.gun.n, act: P.act, handVisible: !!(P.hand && P.hand.visible), arrows: P.arrows, hand: W[P.wid].n };
      res.nW = W.length;
      // posiciona perto de um inimigo (fora da vila)
      const e0 = g.enemies.filter(e => !e.dead)[0]; e0.hp = e0.max = 1e7; e0.dmg = 0; e0.ag = false;
      P.sit = P.sitT = 0; P.x = P.tx = e0.x - (W[P.wid].gun ? 5 : 2); P.z = P.tz = e0.z; P.tgt = e0; P.mp = P.mmax = 100; P.lv = 10;
      const dx = () => [e0.x - P.x, e0.z - P.z];
      const hpBefore = e0.hp, a0 = P.arrows, mp0 = P.mp;
      const ws = W[P.wid];
      if (ws.gun) { P.aimv = 1; g.attack(...dx()); } else { g.attack(...dx()); P.imp = 0; g.impact(); }
      await wait(g.WEAPONS[P.wid].gun ? 4000 : 500);
      res.attack = { weapon: ws.n, dmg: Math.round(hpBefore - e0.hp), arrowsSpent: a0 - P.arrows, manaSpent: Math.round(mp0 - P.mp) };
      // sem munição
      if (ws.bow) { P.arrows = 0; P.cd = 0; const b = P.cd; g.attack(...dx()); res.noArrows = { cd: P.cd, shots: 0 }; P.arrows = 5; }
      if (ws.magic) { P.mp = 0; P.cd = 0; res.noMana = { effRng: g.effRng ? g.effRng() : null }; }
      // percorre todas as armas novas na mão (poses sem erro)
      const poses = [];
      for (let i = W.length - 10; i < W.length; i++) {
        const w = W[i], it = { ty: 'wpn', q: 1, v: w.b, il: 1, w: i, n: w.n };
        if (w.gun) { g.eq.gun = it; if (w.bow) P.arrows = 30; if (w.xbow) P.bolts = 30; P.mp = 100; g.setWeapon('gun'); } else { g.eq.wpn = it; g.setWeapon('wpn'); }
        P.aimv = 1; P.tgt = e0;
        await wait(350);
        P.cd = 0; if (w.gun) g.attack(...dx()); else { g.attack(...dx()); }
        await wait(350);
        poses.push(w.n + ':' + (P.hand ? P.hand.children.length : 0));
      }
      res.poses = poses;
      // save / load
      P.arrows = 17; P.bolts = 9; g.eq.gun = { ty: 'wpn', q: 1, v: 3, il: 1, w: W.findIndex(w => w.n === 'Arco Longo'), n: 'Arco Longo' };
      window.dispatchEvent(new Event('pagehide'));
      res.saved = JSON.parse(localStorage.getItem('pirata-arpg:save:v1:t1') || 'null');
      res.saved = res.saved && { arrows: res.saved.player.arrows, bolts: res.saved.player.bolts, gun: res.saved.eq.gun && res.saved.eq.gun.n };
      return res;
    });
    // recarrega e confere
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => { const g = window.__game; return { arrows: g.P.arrows, bolts: g.P.bolts, gun: g.eq.gun && g.eq.gun.n, wpn: g.eq.wpn && g.eq.wpn.n }; });
    console.log('===', k, JSON.stringify(out));
    console.log('   depois do reload:', JSON.stringify(after));
    console.log('   errors:', errs.length ? errs.slice(0, 6) : 'nenhum');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
