/* Etapa 7 (arma mágica reserva e troca livre Cajado ↔ Rod): equipar, tecla X, Shift+X, Cutelo fora da troca, auto-combate, save/migração aditiva, hotbar.
   Uso: node test-etapa7.js <porta-atual> <porta-V555> */
const lib = require('./lib');
const port = process.argv[2], p555 = process.argv[3] || '8775';
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };

async function openSeeded(browser, p, k, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route('**/three.min.js', r => r.fulfill({ contentType: 'text/javascript', body: lib.three() }));
  await ctx.route(/fonts\.g|googleapis|gstatic/, r => r.abort());
  await ctx.addInitScript(([k, seed]) => {
    if (localStorage.getItem('pirata-mapver') !== '800-2') {
      localStorage.setItem('pirata-mapver', '800-2');
      const c = { id: 't1', name: 'Teste', f: false, t: Date.now() }; if (k !== 'none') c.k = k;
      localStorage.setItem('pirata-arpg:chars:v1', JSON.stringify({ list: [c], active: 't1' }));
      if (seed) for (const key in seed) localStorage.setItem(key, seed[key]);
    }
  }, [k, seed || null]);
  const page = await ctx.newPage(), errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await page.goto('http://localhost:' + p + '/index.html#dev');
  await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errs };
}

(async () => {
  const browser = await lib.launch();
  console.log('Mago: equipar, trocar com X, Shift+X, auto-combate');
  {
    const { ctx, page, errs } = await openSeeded(browser, port, 'mago');
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, r = {}; const Sw = await import('/js/systems/swap.js'), Inv = await import('/js/systems/inventory.js');
      const wi = n => W.findIndex(w => w.n === n), mk = (n, il = 12) => ({ ty: 'wpn', q: 1, v: Math.round(W[wi(n)].b * (1 + (il - 1) * .2)), il, w: wi(n), n });
      const idle = async () => { for (let i = 0; i < 300 && P.swap; i++) await new Promise(r => setTimeout(r, 100)); };
      P.sit = P.sitT = 0; P.dead = false; P.lv = 20; P.mmax = 500; P.mp = 500; P.max = 300; P.hp = 300; g.state.petOff = true;
      g.bag.length = 0; g.eq.res = undefined; delete g.eq.res; g.eq.off = null; g.eq.gun = mk('Cajado do Aprendiz', 1); g.eq.wpn = mk('Cutelo Pirata', 1); g.setWeapon('gun'); P.act = 'gun';
      // equipar
      g.bag.push(mk('Rod de Gelo'), mk('Rod de Cristal'), mk('Cajado de Fogo'));
      const it0 = g.bag[0]; r.can = [g.canEquipTo(it0, 'res'), g.canEquipTo(it0, 'off'), g.canEquipTo(it0, 'gun')]; r.pick = Inv.pickSlot(it0, false);
      g.equip(0); r.afterFirst = { gun: g.eq.gun.n, res: g.eq.res && g.eq.res.n, off: g.eq.off && g.eq.off.n };
      const idx = g.bag.findIndex(b => b.n === 'Rod de Cristal'); g.equip(idx); r.afterSecond = { gun: g.eq.gun.n, res: g.eq.res && g.eq.res.n, bag: g.bag.map(b => b.n).sort() };
      // volta ao estado Cajado (ativo) + Rod (reserva)
      g.eq.gun = mk('Cajado do Aprendiz'); g.eq.res = mk('Rod de Gelo'); g.setWeapon('gun'); P.act = 'gun'; P.swap = null; g.bag.length = 0;
      // X: troca na hora, sem custo e sem recarga; estado íntegro
      S.rk = [2, 1, 1, 0]; S.tl = { '0:0': 1 }; S.cds = [1.5, 0, 0]; S.rcd = { 0: 2 }; P.cd = .3; const before = JSON.stringify({ hp: P.hp, mp: P.mp, mmax: P.mmax, rk: S.rk, tl: S.tl, cds: S.cds, rcd: S.rcd, cd: P.cd, lv: P.lv });
      g.BUF.clearBuffs(); g.BUF.addBuff('p', 'atk', { dur: 30, pow: .2 }); const d0 = P.dmg;
      g.switchWeapon(); r.x1 = { gun: g.eq.gun.n, res: g.eq.res.n, wid: W[P.wid].n, wids: W[P.wids.gun].n, swapping: !!P.swap, act: P.act, same: JSON.stringify({ hp: P.hp, mp: P.mp, mmax: P.mmax, rk: S.rk, tl: S.tl, cds: S.cds, rcd: S.rcd, cd: P.cd, lv: P.lv }) === before, buff: g.BUF.buffList('p').length, dmg: P.dmg, exp: d0 - mk('Cajado do Aprendiz').v + mk('Rod de Gelo').v };
      const seq = []; for (let i = 0; i < 20; i++) { g.switchWeapon(); seq.push(P.act); } r.many = { act: seq.every(a => a === 'gun'), wpn: g.eq.wpn.n, gun: g.eq.gun.n, dmg: P.dmg, d1: r.x1.dmg, nm: g.eq.gun.n + '/' + g.eq.res.n };
      // botões: com o Rod os botões são do Rod; com o Cajado, do Cajado; ícone da hotbar
      g.eq.gun = mk('Rod de Gelo'); g.eq.res = mk('Cajado do Aprendiz'); g.setWeapon('gun'); P.act = 'gun'; for (let i = 0; i < 4; i++) g.SK.update(.1); await new Promise(r => setTimeout(r, 400)); r.iconRod = !!document.querySelector('#s1i .emj svg'); r.rodMode = g.SK.S.on && Inv.reserveClass() && document.querySelectorAll('.skb').length;
      g.switchWeapon(); for (let i = 0; i < 4; i++) g.SK.update(.1); await new Promise(r => setTimeout(r, 400)); r.iconStaff = !!document.querySelector('#s1i .emj svg'); r.s1title = document.getElementById('s1').title;
      // Shift+X: arma corpo a corpo (a troca de sempre); X na melee volta a sacar a mágica sem mexer na reserva
      const g0 = g.eq.gun.n, r0 = g.eq.res.n; g.switchWeapon(true); await idle(); r.melee = { act: P.act, gun: g.eq.gun.n === g0, res: g.eq.res.n === r0 };
      g.switchWeapon(); await idle(); r.back = { act: P.act, gun: g.eq.gun.n === g0, res: g.eq.res.n === r0 };
      // auto-combate: só a troca para a melee (nunca Cajado↔Rod)
      P.act = 'gun'; g.setWeapon('gun'); P.swap = null; const sw = await import('/js/systems/swap.js'); sw.autoWeapon(2); r.auto = { swapping: !!P.swap, gun: g.eq.gun.n === g0, res: g.eq.res.n === r0 }; await idle();
      // sem reserva: X é a troca de sempre (melee ↔ arma de fogo)
      delete g.eq.res; g.setWeapon('gun'); P.act = 'gun'; P.swap = null; g.switchWeapon(); r.noRes = { swapping: !!P.swap }; await idle(); r.noResAct = P.act;
      // desequipar a reserva a devolve à mochila
      g.eq.res = mk('Rod de Gelo'); const bl = g.bag.length; r.unequip = [Inv.unequip('res'), g.bag.length === bl + 1, g.eq.res === undefined, 'res' in g.eq];
      // sacar a reserva quando a mão mágica está vazia
      g.eq.res = mk('Rod de Gelo'); g.eq.gun = null; g.setWeapon('wpn'); P.act = 'wpn'; P.swap = null; g.switchWeapon(); r.draw = { gun: g.eq.gun && g.eq.gun.n, res: g.eq.res === undefined };
      return r; });
    chk('equipar: arma mágica do Mago nunca vai para a mão 2; a 2ª fica de reserva (eq.res); a 3ª substitui a ativa e a antiga volta à mochila', R.can[0] === true && R.can[1] === false && R.pick === 'res' && R.afterFirst.res === 'Rod de Gelo' && R.afterFirst.off === null && R.afterFirst.gun === 'Cajado do Aprendiz' && R.afterSecond.gun === 'Rod de Cristal' && R.afterSecond.res === 'Rod de Gelo' && R.afterSecond.bag.includes('Cajado do Aprendiz'), [R.can, R.pick, R.afterFirst, R.afterSecond]);
    chk('X: Cajado ↔ Rod na hora (sem animação), sem custo de mana nem recarga; hp/mana/ranks/talentos/recargas/buffs iguais; ataque acompanha a arma', R.x1.gun === 'Rod de Gelo' && R.x1.res === 'Cajado do Aprendiz' && R.x1.wid === 'Rod de Gelo' && R.x1.wids === 'Rod de Gelo' && !R.x1.swapping && R.x1.act === 'gun' && R.x1.same && R.x1.buff === 1 && R.x1.dmg === R.x1.exp, R.x1);
    chk('20 trocas: nunca vai para o Cutelo (fica fora da troca), dano sem deriva (par = ímpar)', R.many.act && R.many.wpn === 'Cutelo Pirata' && R.many.dmg === R.many.d1 && R.many.gun === 'Rod de Gelo', R.many);
    chk('ícone da hotbar (✨ Rod / 🔮 Cajado, convertidos em traço pelo deemoji) presente e a dica mostra X e Shift+X', R.iconRod && R.iconStaff && /Cajado ↔ Rod/.test(R.s1title), [R.iconRod, R.iconStaff, R.s1title]);
    chk('Shift+X: arma corpo a corpo (animação de sempre); X na melee saca a mágica sem alterar ativa/reserva', R.melee.act === 'wpn' && R.melee.gun && R.melee.res && R.back.act === 'gun' && R.back.gun && R.back.res, [R.melee, R.back]);
    chk('auto-combate: troca para a melee de perto, nunca Cajado ↔ Rod', R.auto.swapping && R.auto.gun && R.auto.res, R.auto);
    chk('sem reserva: X é a troca de sempre com a arma corpo a corpo', R.noRes.swapping && R.noResAct === 'wpn', [R.noRes, R.noResAct]);
    chk('desequipar a reserva a devolve à mochila (e a chave some); sem arma mágica na mão, X saca a reserva', R.unequip[0] === true && R.unequip[1] && R.unequip[2] && R.unequip[3] === false && R.draw.gun === 'Rod de Gelo' && R.draw.res, [R.unequip, R.draw]);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  console.log('Save/load da reserva e outras classes');
  {
    const { ctx, page } = await openSeeded(browser, port, 'mago');
    await page.evaluate(async () => { const g = window.__game, W = g.WEAPONS, wi = n => W.findIndex(w => w.n === n); const mk = n => ({ ty: 'wpn', q: 1, v: W[wi(n)].b, il: 1, w: wi(n), n }); g.eq.gun = mk('Cajado do Aprendiz'); g.eq.res = mk('Rod de Gelo'); g.setWeapon('gun'); g.P.act = 'gun'; (await import('/js/systems/save.js')).saveGame(); });
    const key = await page.evaluate(async () => (await import('/js/core/chars.js')).saveKey('t1')), str = await page.evaluate(k => localStorage.getItem(k), key);
    chk('save grava eq.res', JSON.parse(str).eq.res && JSON.parse(str).eq.res.n === 'Rod de Gelo');
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const a = await page.evaluate(() => ({ gun: __game.eq.gun.n, res: __game.eq.res && __game.eq.res.n, act: __game.P.act, wid: __game.WEAPONS[__game.P.wid].n }));
    chk('recarregar: ativa e reserva iguais', a.gun === 'Cajado do Aprendiz' && a.res === 'Rod de Gelo' && a.act === 'gun' && a.wid === 'Cajado do Aprendiz', a);
    await ctx.close();
    const o = JSON.parse(str);
    // reserva inválida (não mágica) → vai para a mochila, nada é apagado
    const bad_ = { ...o, eq: { ...o.eq, res: o.eq.wpn } };
    const c = await openSeeded(browser, port, 'mago', { [key]: JSON.stringify(bad_) });
    const r = await c.page.evaluate(() => ({ res: __game.eq.res === undefined, bag: __game.bag.map(b => b.n) }));
    chk('reserva inválida: não vira reserva, vai para a mochila (nada apagado)', r.res && r.bag.includes('Cutelo Pirata'), r);
    chk('  sem erros', c.errs.length === 0, c.errs.slice(0, 2)); await c.ctx.close();
    // save de origem V555 (sem eq.res): carrega e regrava sem campo novo
    const old = await openSeeded(browser, p555, 'mago');
    const O = await old.page.evaluate(async () => { const g = window.__game; g.P.lv = 5; (await import('/js/systems/save.js')).saveGame(); const C = await import('/js/core/chars.js'); return { key: C.saveKey('t1'), str: localStorage.getItem(C.saveKey('t1')) }; });
    await old.ctx.close();
    const n = await openSeeded(browser, port, 'mago', { [O.key]: O.str });
    const N = await n.page.evaluate(async () => { const g = window.__game; (await import('/js/systems/save.js')).saveGame(); const C = await import('/js/core/chars.js'); return { lv: g.P.lv, res: g.eq.res === undefined, raw: JSON.parse(localStorage.getItem(C.saveKey('t1'))) }; });
    chk('save V555 (sem reserva) carrega igual e regrava SEM campo res (migração aditiva)', N.lv === 5 && N.res && !('res' in N.raw.eq), { lv: N.lv, eqKeys: Object.keys(N.raw.eq) });
    chk('  sem erros', n.errs.length === 0, n.errs.slice(0, 2)); await n.ctx.close();
    for (const k of ['guerreiro', 'cacador', 'ladino', 'none']) {
      const { ctx: c2, page: p2 } = await openSeeded(browser, port, k);
      const q = await p2.evaluate(async () => { const g = window.__game; const W = g.WEAPONS, wi = n => W.findIndex(w => w.n === n); g.bag.push({ ty: 'wpn', q: 1, v: 5, il: 1, w: wi('Cajado do Aprendiz'), n: 'Cajado do Aprendiz' }); g.P.lv = 20; g.equip(g.bag.length - 1, 'res'); (await import('/js/systems/save.js')).saveGame(); const C = await import('/js/core/chars.js'); const raw = JSON.parse(localStorage.getItem(C.saveKey('t1'))); g.switchWeapon(); return { res: g.eq.res === undefined, key: 'res' in raw.eq, ic: document.getElementById('s1i').textContent }; });
      chk(k + ': sem reserva, eq sem a chave res, X como sempre' + (k === 'none' ? ' (sem classe pode ter Cajado, mas não reserva)' : ''), q.res && !q.key, q);
      await c2.close();
    }
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
