/* Etapa 1 (correções estruturais): reset por classe, loja (nível e classe), restrição de arma mágica, DoT sem crítico, painel (crítico e DPS).
   Uso: node test-etapa1.js <porta> [classes] */
const lib = require('./lib');
const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (extra !== undefined ? ' · ' + JSON.stringify(extra) : '')); };
(async () => {
  const browser = await lib.launch();
  for (const k of classes) {
    console.log(k);
    const { ctx, page, errs } = await lib.open(browser, port, k, 1280, 720);
    const r = await page.evaluate(async k => {
      const g = window.__game, P = g.P, S = g.SK.S, res = {}, W = g.WEAPONS;
      const wi = n => W.findIndex(w => w.n === n);
      const mk = (n, il = 1) => ({ ty: 'wpn', q: 1, v: W[wi(n)].b, il, w: wi(n), n });
      const Rst = await import('/js/systems/reset.js'), Dlg = await import('/js/ui/dialog.js'), Pan = await import('/js/ui/panel.js'), NP = await import('/js/data/npcs.js');
      P.sit = P.sitT = 0;
      const snap = () => ({ max: P.max, mmax: P.mmax, dmg: P.dmg, wid: P.wid, act: P.act, w: g.eq.wpn && g.eq.wpn.n, gun: g.eq.gun && g.eq.gun.n, off: g.eq.off && g.eq.off.n, arrows: P.arrows });
      // 1) reset: volta aos valores iniciais da classe e da arma inicial (igual ao personagem novo)
      res.novo = snap();
      P.lv = 12; P.max += 90; P.mmax += 70; P.dmg += 30; P.gold = 500; P.crit = P.crit;
      S.tb.hp = 10; P.max += 10; S.tb.mp = 5; P.mmax += 5; g.eq.arm = { ty: 'arm', q: 1, v: 5, il: 1, w: 0, n: 'x' };
      Rst.resetPlayer();
      res.reset = snap(); res.resetLv = P.lv; res.resetTb = [S.tb.hp, S.tb.mp];
      // 2) loja do ferreiro
      const smith = NP.CITIZENS.find(c => c.shop === 'smith');
      const rows = () => [...document.querySelectorAll('#shl .shr')].map(r => ({ n: r.querySelector('span').childNodes[0].textContent, btn: r.querySelector('button').textContent, off: r.querySelector('button').disabled, el: r }));
      const openShop = () => { Dlg.openDialog(smith); [...document.querySelectorAll('#dlg button')].find(b => /mercadoria/.test(b.textContent)).click(); };
      P.gold = 1e6; P.lv = 1; g.bag.length = 0;
      openShop();
      const row = (n, q = 1) => rows().filter(x => x.n === n)[q - 1];
      res.shop1 = ['Arco Longo', 'Rod das Chamas', 'Cajado do Aprendiz', 'Cutelo Pirata'].map(n => { const x = row(n); return x && { n, btn: x.btn, off: x.off }; });
      const sw = row('Cutelo Pirata'); if (sw && !sw.off) sw.el.querySelector('button').click();
      res.boughtLv1 = g.bag.map(b => b.n);
      const forced = row('Arco Longo'); if (forced) { forced.el.querySelector('button').disabled = false; forced.el.querySelector('button').click(); }   // clique forçado num botão bloqueado
      res.forced = g.bag.map(b => b.n);
      P.lv = 16; g.bag.length = 0; Dlg.closeDialog(); openShop();
      res.shop16 = ['Arco Longo', 'Rod das Chamas'].map(n => { const x = row(n); return x && { n, btn: x.btn, off: x.off }; });
      const rf = row('Rod das Chamas'); if (rf && !rf.off) rf.el.querySelector('button').click();
      res.boughtRod = g.bag.map(b => b.n);
      Dlg.closeDialog();
      // 3) arma mágica por classe
      g.bag.length = 0; const it = mk('Rod de Cristal', 8); g.bag.push(it); P.lv = 20;
      const E = await import('/js/systems/inventory.js');
      res.pick = [E.pickSlot(it, false), E.pickSlot(it, true), g.canEquipTo(it, 'gun')];
      const before = g.eq.gun && g.eq.gun.n; g.equip(0);
      res.equipMagic = { before, after: g.eq.gun && g.eq.gun.n, off: g.eq.off && g.eq.off.n, bagLeft: g.bag.length };
      // 4) dano periódico sem crítico (e golpe normal ainda crita)
      const e = g.enemies.find(x => !x.dead); P.crit = 1; S.TT.crit = 0;
      const tryHits = o => { const ds = []; for (let i = 0; i < 80; i++) { e.hp = e.max = 1e9; e.lv = P.lv; e.mk = 0; e.stone = 0; const h0 = e.hp; g.hit(e, 100, { ...o }); ds.push(h0 - e.hp); } return { min: Math.min(...ds), max: Math.max(...ds) }; };
      res.dot = tryHits({ dot: 1 }); res.norm = tryHits({});
      P.crit = P.cls.crit;
      // 5) painel: crítico e DPS
      const stt = () => { Pan.renderStats(); return document.getElementById('stt').textContent; };
      const dpsExp = (Wp, m) => +(P.dmg * Wp.mul * m / ((Wp.reload ? Wp.cd / (P.rls || 1) : Wp.cd) || 1)).toFixed(1);
      res.cls = { crit: P.cls.crit, melee: P.cls.melee, ranged: P.cls.ranged, magic: P.cls.magic };
      res.panel = {};
      g.eq.wpn = mk('Cutelo Pirata'); g.eq.gun = null; P.act = 'wpn'; g.setWeapon('wpn'); S.TT.crit = 0;
      res.panel.melee = { txt: (stt().match(/DPS [\d.]+ · Crít\. \d+%/) || [])[0], exp: dpsExp(W[P.wid], P.cls.melee) };
      S.TT.crit = .1; res.panel.melee10 = (stt().match(/Crít\. \d+%/) || [])[0]; S.TT.crit = 0;
      if (g.eq.gun === null) { g.eq.gun = mk('Cajado do Aprendiz'); if (k !== 'mago' && k !== 'none') { /* só para medir o painel */ } P.mp = P.mmax; g.setWeapon('gun'); P.act = 'gun';
        res.panel.magic = { txt: (stt().match(/DPS [\d.]+/) || [])[0], exp: dpsExp(W[P.wid], P.cls.magic), wid: W[P.wid].n }; }
      g.eq.gun = mk('Arco Curto'); g.setWeapon('gun'); P.act = 'gun';
      res.panel.bow = { txt: (stt().match(/DPS [\d.]+/) || [])[0], exp: dpsExp(W[P.wid], P.cls.ranged), wid: W[P.wid].n };
      return res;
    }, k);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const C = r.cls;
    chk('reset = personagem novo (vida/mana/dano/armas)', same(r.reset, r.novo), { novo: r.novo, reset: r.reset });
    chk('reset: nível 1 e bônus de talentos zerados', r.resetLv === 1 && r.resetTb[0] === 0 && r.resetTb[1] === 0);
    if (k === 'mago') chk('Mago volta a 80/110 (dano 11 + arma)', r.reset.max === 80 && r.reset.mmax === 110, r.reset);
    chk('loja nv1: Arco Longo (nv8) e Rod das Chamas (nv16) bloqueados', r.shop1[0].off && /Exige nível 8/.test(r.shop1[0].btn) && r.shop1[1].off && /Exige nível 16/.test(r.shop1[1].btn), r.shop1);
    chk('loja nv1: arma nv1 compra normal', r.boughtLv1.includes('Cutelo Pirata'), r.boughtLv1);
    chk('loja: clique forçado em arma bloqueada não compra', !r.forced.includes('Arco Longo'), r.forced);
    if (k === 'mago' || k === 'none') chk('loja nv1 mago: Cajado do Aprendiz liberado', !r.shop1[2].off, r.shop1[2]);
    else chk('loja: cajado bloqueado para ' + k + ' ("Só Magos")', r.shop1[2].off && /Só Magos/.test(r.shop1[2].btn), r.shop1[2]);
    chk('loja nv16: Arco Longo liberado', !r.shop16[0].off, r.shop16[0]);
    if (k === 'mago' || k === 'none') chk('loja nv16 mago: Rod das Chamas compra', r.boughtRod.includes('Rod das Chamas'), r.boughtRod);
    else chk('loja nv16: Rod das Chamas bloqueado para ' + k, r.shop16[1].off && !r.boughtRod.includes('Rod das Chamas'), r.shop16[1]);
    if (k === 'mago' || k === 'none') chk('equipa Rod de Cristal', (r.equipMagic.after === 'Rod de Cristal' || r.equipMagic.off === 'Rod de Cristal') && r.equipMagic.bagLeft === 0, r);
    else chk('NÃO equipa Rod de Cristal (pickSlot/auto/canEquipTo/equip)', r.pick[0] === null && r.pick[1] === null && r.pick[2] === false && r.equipMagic.after === r.equipMagic.before && r.equipMagic.bagLeft === 1, { pick: r.pick, eq: r.equipMagic });
    chk('DoT nunca crita (≤ 115 de 100 base)', r.dot.max <= 115 && r.dot.min > 0, r.dot);
    chk('golpe normal ainda crita (P.crit = 1 → ≥ 170)', r.norm.min >= 170, r.norm);
    chk('painel: corpo a corpo DPS e crítico reais', r.panel.melee.txt === 'DPS ' + r.panel.melee.exp.toFixed(1) + ' · Crít. ' + Math.round(C.crit * 100) + '%', r.panel.melee);
    if (k !== 'none') chk('painel: talento de crítico (+10%) aparece', r.panel.melee10 === 'Crít. ' + Math.round((C.crit + .1) * 100) + '%', r.panel.melee10);
    if (r.panel.magic) chk('painel: cajado usa mult. mágico da classe', r.panel.magic.txt === 'DPS ' + r.panel.magic.exp.toFixed(1), r.panel.magic);
    chk('painel: arco usa mult. à distância', r.panel.bow.txt === 'DPS ' + r.panel.bow.exp.toFixed(1), r.panel.bow);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'nenhum'));
    if (errs.length) bad++;
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
