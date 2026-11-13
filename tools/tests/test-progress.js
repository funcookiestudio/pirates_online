const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
const sizes = (process.argv[4] ? [process.argv[4].split('x').map(Number)] : [[1280, 720], [390, 800], [780, 360]]);
(async () => {
  const browser = await require('./lib').launch();
  for (const k of classes) for (const [w, h] of sizes) {
    const full = w === 1280;   // a bateria de lógica roda só no desktop; os outros tamanhos medem os painéis
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 });
    await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: require('./lib').three() }));
    await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
    await ctx.addInitScript(([k]) => { if (localStorage.getItem('pirata-mapver') !== '800-2') { localStorage.setItem('pirata-mapver', '800-2'); const c = { id: 't1', name: 'Teste', f: false, t: Date.now() }; if (k !== 'none') c.k = k; localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [c], active: 't1' })); } }, [k]);
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
    await page.goto('http://localhost:' + port + '/index.html#dev');
    await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
    await page.waitForTimeout(2000);
    const out = await page.evaluate(async ([full]) => {
      const g = window.__game, P = g.P, SK = g.SK, S = SK.S, res = {};
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const step = s => { for (let t = 0; t < s; t += .033) SK.update(.033); };
      const rectOf = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
      const panelCheck = async tab => {
        document.getElementById('tb-' + tab) || window.__game.openTab;
        const evt = new KeyboardEvent('keydown', { code: 'KeyI', bubbles: true }); if (document.getElementById('pnl').style.display !== 'block') window.dispatchEvent(evt);
        await wait(300);
        document.getElementById('tb-' + tab).click(); await wait(300);
        const pnl = document.getElementById('pnl'), pg = document.getElementById(tab === 'skills' ? 'skp' : 'tlp');
        const r = rectOf(pnl), out = [];
        pg.querySelectorAll('button, .sdet, .sgrid, .ttree').forEach(b => { const q = rectOf(b); if (q[2] - q[0] > 0 && (q[0] < r[0] - 2 || q[2] > r[2] + 2 || q[0] < -1 || q[2] > innerWidth + 1)) out.push(b.id || b.className); });
        return { panel: r, vis: pnl.style.display, outside: out.slice(0, 5), text: pg.innerText.replace(/\s+/g, ' ').slice(0, 110) };
      };
      res.on = SK.on;
      P.lv = 10; P.sit = P.sitT = 0; if (window.__game.PROF && window.__game.PROF.devSet) window.__game.PROF.devSet('staff', 20);
      res.skillsPanel = await panelCheck('skills');
      res.talPanel = await panelCheck('tal');
      if (!SK.on || !full) return res;
      // pontos e ranks
      const pts0 = (await import('/js/systems/skills.js')).skillPoints();
      const M = await import('/js/systems/skills.js');
      res.points = { skill: M.skillPoints(), talent: M.talentPoints() };
      const c0 = M.effCost(0), d0 = M.effCd(0);
      M.learnSkill(0); M.learnSkill(0); M.learnSkill(0); const ok4 = M.learnSkill(0);
      res.rank = { r: M.rankOf(0), maxStops: !ok4, cost: [c0, M.effCost(0)], cd: [d0, +M.effCd(0).toFixed(2)], points: M.skillPoints() };
      // talentos: nó 0 do ramo 0 (guerreiro = vida)
      const mx0 = P.max, mm0 = P.mmax;
      const ranks = [];
      for (let b = 0; b < 3; b++) { const okT = M.learnTalent(b, 0); ranks.push(okT); }
      res.talents = { learned: ranks, dmax: P.max - mx0, dmmax: P.mmax - mm0, req: M.learnTalent(0, 3), pointsLeft: M.talentPoints() };
      // salvar e recarregar
      window.dispatchEvent(new Event('pagehide'));
      const sv = JSON.parse(localStorage.getItem('pirata-arpg:save:v1:t1'));
      res.saved = sv && sv.skills;
      res.maxSaved = sv && sv.player.max;
      // efeito dos ranks no dano (skill 0 com rank 3 > rank 0): compara dealt
      res.shield = { dr: P.shieldDr, off: g.eq.off && g.eq.off.n, offM: !!P.offM, wpn: g.eq.wpn && g.eq.wpn.n };
      const hp = P.hp; P.hp = P.max = 100000; P.inv = 0; const h0 = P.hp; g.hurtP(1000, 0, 0); res.hurt1000 = Math.round(h0 - P.hp);
      // auto
      const e0 = g.enemies.filter(e => !e.dead)[0]; e0.hp = e0.max = 1e7; e0.dmg = 0;
      P.x = P.tx = e0.x - 5; P.z = P.tz = e0.z; P.tgt = e0; P.mp = P.mmax; S.cds = [0, 0, 0];
      SK.auto(); res.autoUsed = S.cds.map(c => +c.toFixed(1));
      // atkd em chefe
      e0.st = 'wind'; step(.05); res.atkd = e0.atkd === true; e0.st = 'chase';
      // limpeza por dungeon
      S.cds = [0, 0, 0]; P.mp = P.mmax; if (S.k === 'cacador') { SK.useSkill(1); }
      res.trapsBefore = S.traps.length; S.dun = true; step(.05); res.trapsAfterDungeon = S.traps.length; S.dun = false;
      // tecla remapeada
      const M2 = M; let keyOk = null;
      M.captureKey(1, () => {});
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true }));
      res.keys = M.skillKeys();
      S.cds = [0, 0, 0]; P.mp = P.mmax; P.tgt = e0; const c1 = S.cds[1];
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true })); step(.01);
      res.keyZcast = S.cds[1] > 0;
      M.captureKey(1, () => {}); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
      // migração: save antigo
      g.eq.wpn = { ty: 'wpn', q: 1, v: 2, il: 1, w: 0, n: 'Cutelo Pirata' }; g.eq.gun = g.eq.off = null; g.bag.length = 0; S.mig = 0; P.arrows = 0;
      SK.migrate(); res.migrated = { wpn: g.eq.wpn && g.eq.wpn.n, gun: g.eq.gun && g.eq.gun.n, off: g.eq.off && g.eq.off.n, arrows: P.arrows };
      return res;
    }, [full]);
    console.log('===', k, w + 'x' + h, JSON.stringify(out));
    if (full && k !== 'none') {
      await page.reload();
      await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
      await page.waitForTimeout(1500);
      const after = await page.evaluate(async () => { const M = await import('/js/systems/skills.js'); const g = window.__game; const r0 = { rk: g.SK.S.rk.slice(), tl: Object.keys(g.SK.S.tl).length, max: g.P.max, mig: g.SK.S.mig }; g.P.lv = Math.max(g.P.lv, 10); const before = g.P.max; M.respec(); r0.afterRespec = { pts: [M.skillPoints(), M.talentPoints()], dmax: before - g.P.max }; return r0; });
      console.log('   depois do reload:', JSON.stringify(after));
    }
    console.log('   errors:', errs.length ? errs.slice(0, 6) : 'nenhum');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
