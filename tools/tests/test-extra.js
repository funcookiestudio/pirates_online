/* Flechas no chão, compra automática de flechas, volta ao arco, bônus de vida/mana dos talentos (P.tmaxBonus), teclas em Ajustes e tabela TUNE.
   Uso: node test-extra.js <porta> [classes] */
const lib = require('./lib');
const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
(async () => {
  const browser = await lib.launch();
  for (const k of classes) {
    const { ctx, page, errs } = await lib.open(browser, port, k, 1280, 720);
    const out = await page.evaluate(async k => {
      const g = window.__game, P = g.P, SK = g.SK, S = SK.S, res = {};
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const step = s => { for (let t = 0; t < s; t += .033) SK.update(.033); };
      P.sit = P.sitT = 0; P.lv = 10; if (window.__game.PROF && window.__game.PROF.devSet) window.__game.PROF.devSet('staff', 20);
      if (k === 'none') { res.settingsRow = !!document.getElementById('sk-keys'); return res; }
      const M = await import('/js/systems/skills.js'), D = await import('/js/data/skills.js');
      // tabela única: mudar TUNE muda o comportamento
      if (k === 'guerreiro') { const old = D.TUNE.guerreiro.grito.dur; D.TUNE.guerreiro.grito.dur = 3; S.cds = [0, 0, 0]; P.mp = P.mmax = 100; SK.useSkill(1); res.tuneGrito = +S.gt.toFixed(1); D.TUNE.guerreiro.grito.dur = old; }
      // teclas em Ajustes
      res.keysRow = document.querySelectorAll('#sk-keys button').length;
      document.querySelectorAll('#sk-keys button')[0].click();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', bubbles: true }));
      res.keysAfter = [...document.querySelectorAll('#sk-keys button')].map(b => b.textContent);
      res.k1small = document.querySelector('#k1 small').textContent;
      M.captureKey(0, () => {}); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', bubbles: true }));
      // bônus de talentos guardado à parte
      if (k === 'guerreiro') {
        M.learnTalent(0, 0); res.tb = { ...P.tmaxBonus }; P.max += 400;   // "save editado": max mudou por fora
        const m0 = P.max; M.respec(); res.afterRespec = { max: P.max, removed: m0 - P.max, tb: { ...P.tmaxBonus } };
      }
      // flechas no chão e aljava
      if (k === 'cacador') {
        const e0 = g.enemies.filter(e => !e.dead)[0]; e0.hp = e0.max = 1e7; e0.dmg = 0; e0.ag = false;
        P.x = P.tx = e0.x - 5; P.z = P.tz = e0.z; P.tgt = e0; P.aimv = 1; P.arrows = 30;
        const n0 = g.loot.length; let shots = 0;
        for (let i = 0; i < 12; i++) { P.cd = 0; g.attack(e0.x - P.x, e0.z - P.z); shots++; await wait(500); if (g.loot.some(l => l.ty === 'quiver')) break; }
        res.shots = shots; res.arrowsAfter = P.arrows; res.quiverOnGround = g.loot.filter(l => l.ty === 'quiver').length;
        const q = g.loot.find(l => l.ty === 'quiver');
        if (q) { P.tgt = null; P.x = P.tx = q.m.position.x; P.z = P.tz = q.m.position.z; const a1 = P.arrows; await wait(800); res.picked = P.arrows - a1; }
        P.arrows = 99; const q2 = g.loot.find(l => l.ty === 'quiver'); res.blockedAt99 = true;
        // compra automática: aljava baixa -> o auto vai ao ferreiro
        const R = await import('/js/systems/refill.js'), st = g.state;
        P.tgt = null; P.x = P.tx = 0; P.z = P.tz = 8; g.enemies.forEach(e => { e.dead = 1; }); st.autoCfg.refill = true; P.gold = 500; P.arrows = 3; P.pot = 5; P.bmb = 3; P.potR = 0; P.bmbR = 0;
        g.npcList.forEach(n => { n.g.visible = true; });   // à noite os NPCs ficam escondidos
        res.dbg = { cfg: [st.autoCfg.refill, st.autoCfg.arrowMin, st.autoCfg.arrowTarget, st.autoCfg.reserve], gun: g.eq.gun && g.eq.gun.n, gold: P.gold, arrows: P.arrows, tidy: (await import('/js/systems/town.js')).TIDY.on, alive: g.enemies.filter(e => !e.dead).length, smith: !!(await import('/js/entities/npc.js')).npcByShop('smith') };
        res.refillTrip = R.refillStep(); res.tripKind = st.trip;
        { const n = (await import('/js/entities/npc.js')).npcByShop('smith'), a0 = P.arrows, g0 = P.gold; P.x = P.tx = n.g.position.x + 1; P.z = P.tz = n.g.position.z + 1; for (let i = 0; i < 80 && P.arrows === a0; i++) { R.refillStep(); await wait(100); } res.bought = { arrows: P.arrows - a0, gold: g0 - P.gold }; }
        P.arrows = 40; st.trip = null; res.refillWhenFull = R.refillStep();
        // volta ao arco depois de comprar
        const W = await import('/js/systems/swap.js');
        P.arrows = 0; P.swap = null; P.act = 'gun'; P.cd = 0;
        await wait(100); W.autoWeapon(10); for (let i = 0; i < 40 && (P.swap || P.act === 'gun'); i++) await wait(250); res.switchedToMelee = P.act === 'wpn';
        P.arrows = 30; await wait(2700); W.autoWeapon(10); for (let i = 0; i < 40 && (P.swap || P.act === 'wpn'); i++) await wait(250); res.backToBow = P.act === 'gun';
      }
      return res;
    }, k);
    console.log('===', k, JSON.stringify(out));
    console.log('   errors:', errs.length ? errs.slice(0, 6) : 'nenhum');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
