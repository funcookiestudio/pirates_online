/* Regressão do Mago de ponta a ponta (Etapa 9): criar → evoluir com o Cajado → aprender o Rod → reserva e troca X → suporte → salvar/recarregar →
   auto-combate com cada arma → estresse (trocas e lançamentos aleatórios) sem vazamento nem erro. Uso: node test-mago.js <porta> */
const lib = require('./lib');
const port = process.argv[2];
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };

(async () => {
  const browser = await lib.launch();
  const { ctx, page, errs } = await lib.open(browser, port, 'mago', 1280, 720);
  console.log('Mago novo: início');
  const A = await page.evaluate(async () => {
    const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS; const M = await import('/js/systems/skills.js');
    return { lv: P.lv, hp: P.max, mp: P.mmax, wpn: g.eq.wpn && g.eq.wpn.n, gun: g.eq.gun && g.eq.gun.n, act: P.act, prof: JSON.parse(JSON.stringify(P.prof)), locks: [0, 1, 2].map(M.skillLock), trees: M.treeList(), rod: S.rod.rk.length, res: g.eq.res === undefined };
  });
  chk('Mago novo: 80/110, Cutelo + Cajado do Aprendiz na mão, proficiências Nv 1, Bola de Fogo livre, Nova/Tempestade bloqueadas, sem Rod aprendido, sem reserva', A.hp === 80 && A.mp === 110 && A.wpn === 'Cutelo Pirata' && A.gun === 'Cajado do Aprendiz' && A.act === 'gun' && A.prof.staff.lv === 1 && A.prof.rod.lv === 1 && A.locks[0] === null && A.locks[1] && A.locks[2] && A.rod === 0 && A.res, A);
  console.log('Evolução com o Cajado e o Rod');
  const B = await page.evaluate(async () => {
    const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, PR = g.PROF, r = {}; const M = await import('/js/systems/skills.js'), Sc = await import('/js/data/scaling.js');
    const wi = n => W.findIndex(w => w.n === n), mk = (n, il = 12) => ({ ty: 'wpn', q: 1, v: Math.round(W[wi(n)].b * (1 + (il - 1) * .2)), il, w: wi(n), n });
    const rnd = Math.random, pn = performance.now.bind(performance); let off = 0; performance.now = () => pn() + off; const w_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
    P.sit = P.sitT = 0; P.dead = false; g.state.petOff = true;
    const e = g.enemies.find(x => !x.dead);
    // mata inimigos do próprio nível com o Cajado até o nível 12 (relógio simulado: 6 s por abate)
    let n = 0; w_(.5, () => { while (P.lv < 12 && n < 3000) { off += 6000; const L = P.lv; e.lv = L; e.dead = 0; e.hp = e.max = 28 + 11 * L; e.xpv = Math.round(9 * Math.pow(L, 1.2)); e.stone = 0; e.mk = 0; e.pa = null; P.tgt = e; n++; g.hit(e, e.hp, {}); } });
    r.lv = P.lv; r.kills = n; r.prof = JSON.parse(JSON.stringify(P.prof)); r.locks = [0, 1, 2].map(M.skillLock); r.rodXp = P.prof.rod.xp + P.prof.rod.lv;
    // aprende suporte do Rod (precisa de proficiência de Rod: dá o primeiro ponto e usa a Cura para evoluir)
    r.pts0 = M.rodPoints(); r.learn = M.learnRod(0); r.slots = M.rodSlots();
    PR.devSet('rod', 12); for (let i = 1; i < 10; i++) M.learnRod(i); r.learned = S.rod.rk.filter(v => v > 0).length;
    // equipa o Rod como reserva e troca com X
    g.bag.push(mk('Rod de Gelo')); g.equip(g.bag.length - 1); r.res = g.eq.res && g.eq.res.n; g.switchWeapon(); r.afterX = { gun: g.eq.gun.n, res: g.eq.res.n, act: P.act };
    // Rod na mão: botões do Rod; suporte funciona; nada de dano nos inimigos
    off += 40000; P.hp = 40; P.mp = P.mmax; S.rcd = {}; const hp0 = e.hp = e.max = 1e9; const ok = g.SK.useSkill(0); r.cura = { ok, healed: P.hp > 40 }; g.SK.useSkill(1); g.SK.useSkill(2); r.enemyHp = e.hp === hp0;
    g.switchWeapon(); r.back = { gun: g.eq.gun.n, act: P.act }; S.cds = [0, 0, 0]; P.mp = P.mmax; e.x = P.x + 5; e.z = P.z; P.tgt = e; r.bola = g.SK.useSkill(0);
    performance.now = pn; return r;
  });
  chk('Cajado: de nível 1 a 12 matando inimigos do próprio nível (' + B.kills + ' abates), proficiência de Cajado = ' + B.prof.staff.lv + ' e Tempestade liberada', B.lv === 12 && B.prof.staff.lv >= 5 && B.locks.every(x => x === null), { kills: B.kills, prof: B.prof, locks: B.locks });
  chk('Rod só evolui por suporte/ataque do Rod: o Cajado não deu XP de Rod; 1º ponto do Rod aprende a Cura e ocupa o botão 1', B.rodXp === 1 && B.pts0 === 1 && B.learn && B.slots[0] === 0, [B.rodXp, B.pts0, B.slots]);
  chk('6 habilidades do Rod liberadas no nível 12 (as de nível geral maior ficam bloqueadas) e aprendidas; Rod de Gelo equipado vai para a reserva; X troca Cajado↔Rod; Cutelo fora', B.learned === 6 && B.res === 'Rod de Gelo' && B.afterX.gun === 'Rod de Gelo' && B.afterX.res === 'Cajado do Aprendiz' && B.afterX.act === 'gun', [B.learned, B.res, B.afterX]);
  chk('com o Rod: Cura Menor cura; suporte não fere inimigos; X de volta ao Cajado e Bola de Fogo funciona', B.cura.ok && B.cura.healed && B.enemyHp && B.back.gun === 'Cajado do Aprendiz' && B.bola === true, [B.cura, B.enemyHp, B.back, B.bola]);
  console.log('Salvar e recarregar');
  await page.evaluate(async () => { (await import('/js/systems/save.js')).saveGame(); });
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  const C = await page.evaluate(async () => { const g = window.__game, P = g.P, S = g.SK.S; return { lv: P.lv, gun: g.eq.gun.n, res: g.eq.res && g.eq.res.n, prof: P.prof, rk: S.rod.rk.filter(v => v > 0).length, slots: S.rod.slots.slice(), srk: S.rk.slice() }; });
  chk('recarregar: nível, Cajado/Rod (ativa e reserva), proficiências, ranks e botões do Rod preservados', C.lv === 12 && C.gun === 'Cajado do Aprendiz' && C.res === 'Rod de Gelo' && C.prof.staff.lv >= 5 && C.prof.rod.lv === 12 && C.rk === 6 && C.slots[0] === 0, C);
  console.log('Auto-combate (10 s reais por arma) e estresse');
  const D = await page.evaluate(async () => {
    const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, r = {}; const Au = await import('/js/systems/auto.js'), M = await import('/js/systems/skills.js');
    P.gold = 1e5; P.sit = P.sitT = 0; P.dead = false; P.mmax = 400; P.mp = 400; P.max = 400; P.hp = 400; g.state.petOff = true;
    const es = g.enemies.filter(x => !x.dead).slice(0, 4); es.forEach((e, i) => { e.x = P.x + 7 + i; e.z = P.z + i * 2; e.hp = e.max = 1e9; e.dmg = 5; e.ag = true; });
    const run = async (ms) => { const t = performance.now(), mpMin = { v: 1e9 }; while (performance.now() - t < ms) { mpMin.v = Math.min(mpMin.v, P.mp); await new Promise(r => setTimeout(r, 100)); } return mpMin.v; };
    if (!g.state.autoOn) Au.togAuto();
    r.autoOn = !!g.state.autoOn;
    r.rodMp = await run(10000); r.rodHp = P.hp; r.rodAct = W[P.wid].n;
    g.switchWeapon(); r.staffWeapon = W[P.wid].n; r.staffMp = await run(10000);
    if (g.state.autoOn) Au.togAuto();
    // estresse: 300 ações aleatórias
    const sc0 = g.scene.children.length; let c = 0; const acts = ['swap', 'cast0', 'cast1', 'cast2', 'melee', 'hp', 'mp'];
    for (let i = 0; i < 300; i++) { const a = acts[(Math.random() * acts.length) | 0]; if (a === 'swap') g.switchWeapon(); else if (a === 'melee') g.switchWeapon(true); else if (a === 'hp') P.hp = Math.max(30, P.hp - 100); else if (a === 'mp') P.mp = P.mmax; else { g.SK.useSkill(+a[4]); c++; } g.BUF.updateBuffs(.2); g.SK.update(.2); P.swap = null; }
    await new Promise(r => setTimeout(r, 8000));   // deixa os efeitos temporários (partículas, anéis) expirarem
    r.stress = { casts: c, buffs: g.BUF.buffList('p').length, scene: [sc0, g.scene.children.length], wpn: g.eq.wpn && g.eq.wpn.n, both: !!g.eq.gun && !!g.eq.res };
    return r;
  });
  chk('auto-combate ligado com Rod e depois Cajado (10 s cada): sem erro, mana nunca negativa, vida viva', D.autoOn && D.rodMp >= 0 && D.staffMp >= 0 && D.rodHp > 0, D);
  chk('estresse (300 trocas/lançamentos aleatórios): efeitos dentro do limite, sem vazamento de objetos de cena, armas íntegras', D.stress.buffs <= 6 && D.stress.scene[1] - D.stress.scene[0] < 150 && D.stress.both && D.stress.wpn === 'Cutelo Pirata', D.stress);
  chk('sem erros de console durante tudo', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
