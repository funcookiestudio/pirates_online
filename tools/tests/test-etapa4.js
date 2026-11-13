/* Etapa 4 (proficiências Cajado/Rod, persistência e migração de saves).
   Uso: node test-etapa4.js <porta-atual> <porta-do-jogo-V552> [classes-do-bloco-de-XP]
   O jogo V552 (sem esta etapa) gera saves REAIS do formato antigo; o jogo atual os carrega e migra. */
const lib = require('./lib');
const port = process.argv[2], oldPort = process.argv[3] || '8772';
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };
const near = (a, b, t = .02) => Math.abs(a - b) <= t;

/** Abre o jogo de `p` com o personagem de classe k e (opcional) um save/backup pré-gravado (uma vez) */
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

const SNAP = `(async () => { const g = __game, P = g.P, S = g.SK.S; const nm = it => it && it.n;
  return { lv: P.lv, gold: P.gold, max: P.max, mmax: P.mmax, bag: g.bag.map(nm), gun: nm(g.eq.gun), wpn: nm(g.eq.wpn), off: nm(g.eq.off), arm: nm(g.eq.arm), rk: S.on ? S.rk.slice() : null, tl: S.on ? { ...S.tl } : null, prof: P.prof ? JSON.parse(JSON.stringify(P.prof)) : null }; })()`;

/** Monta o personagem no jogo ANTIGO, salva e devolve { str, snap } */
const SCENARIOS = [
  { id: 'mago nv1', k: 'mago', lv: 1 },
  { id: 'mago nv12 (ranks, talentos, Cajado de Carvalho)', k: 'mago', lv: 12, gold: 777, bag: ['Cajado do Aprendiz', 'Cutelo Pirata'], gun: 'Cajado de Carvalho', rk: [2, 1, 1, 0], tl: { '0:0': 1, '1:0': 1 } },
  { id: 'mago nv12 sem bloco skills', k: 'mago', lv: 12, gold: 50, gun: 'Cajado do Aprendiz', noSkills: true },
  { id: 'guerreiro nv5', k: 'guerreiro', lv: 5, gold: 120, bag: ['Adaga Afiada'], rk: [1, 0, 0, 0] },
  { id: 'cacador nv8', k: 'cacador', lv: 8, gold: 300, bag: ['Arco Longo'] },
  { id: 'ladino nv6', k: 'ladino', lv: 6, gold: 40 },
  { id: 'sem classe nv4', k: 'none', lv: 4, gold: 9, bag: ['Cutelo Pirata'] },
];

(async () => {
  const browser = await lib.launch();
  // ===== 1) XP de proficiência (jogo atual, Mago novo) =====
  console.log('XP de proficiência (mago)');
  {
    const { ctx, page, errs } = await openSeeded(browser, port, 'mago');
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, W = g.WEAPONS, PR = g.PROF, C = PR.PROF, res = {};
      const Sc = await import('/js/data/scaling.js'), Rs = await import('/js/systems/reset.js'), Cb = await import('/js/systems/combat.js'), Reg = await import('/js/core/registry.js');
      const wi = n => W.findIndex(w => w.n === n), mk = (n, il = 1) => ({ ty: 'wpn', q: 1, v: Math.round(W[wi(n)].b * (1 + (il - 1) * .2)), il, w: wi(n), n });
      const rnd = Math.random, with_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
      P.sit = P.sitT = 0; P.dead = false; P.lv = 10; P.mmax = 5000; P.mp = 5000;
      const tot = c => { const p = P.prof[c]; let t = p.xp; for (let l = 1; l < p.lv; l++) t += C.xpNext(l); return t; };
      const e = g.enemies.find(x => !x.dead); e.dmg0 = e.dmg;
      const place = (lvOff = 0, hp = 1e9) => { e.x = P.x + 6; e.z = P.z; e.hp = hp; e.max = Math.max(hp, 1e9); e.lv = P.lv + lvOff; e.stone = 0; e.mk = 0; e.sn = 0; e.kx = e.kz = 0; e.slow = e.root = e.bn = e.ps = e.bl = 0; e.dead = 0; P.tgt = e; P.cd = 0; P.aimv = 1; };
      const gun = n => { g.eq.gun = mk(n, 5); g.setWeapon('gun'); P.act = 'gun'; P.swap = null; };
      const melee = () => { g.eq.wpn = mk('Cutelo Pirata'); g.setWeapon('wpn'); P.act = 'wpn'; P.swap = null; };
      const meas = (o, d = 100, lvOff = 0, hp = 1e9) => { PR.resetProf(); place(lvOff, hp); const h0 = e.hp, s0 = tot('staff'), r0 = tot('rod'); with_(.5, () => g.hit(e, d, o)); return { eff: h0 - Math.max(e.hp, 0) > 0 ? Math.min(h0, h0 - e.hp) : 0, ds: +(tot('staff') - s0).toFixed(3), dr: +(tot('rod') - r0).toFixed(3) }; };
      res.cfg = { perDmg: C.staff.perDmg, kb: C.staff.killBase, kl: C.staff.killPerLv, cap: C.staff.capWin, rodCap: C.rod.capWin, rodTg: C.rod.capTarget, basico: C.ROD_XP_basico, max: C.max };
      res.start = JSON.parse(JSON.stringify(P.prof));
      gun('Cajado do Aprendiz');
      res.staffHit = meas({}); res.staffHit.exp = +(res.staffHit.eff * C.staff.perDmg).toFixed(3);
      const lvE = P.lv; res.excess = meas({}, 500, 0, 10); res.excess.exp = +(10 * C.staff.perDmg + C.staff.killBase + C.staff.killPerLv * lvE).toFixed(3); P.lv = lvE; P.xp = 0;
      res.trivial = meas({}, 100, -10); res.low = meas({}, 100, -5); res.low.exp = +(res.low.eff * C.staff.perDmg * Sc.xpMult(-5)).toFixed(3);
      res.pet = meas({ pet: 1 }); res.dotStaff = meas({ dot: 1 }, 20);
      gun('Rod de Gelo'); res.rodHit = meas({}); res.dotRod = meas({ dot: 1 }, 20);
      melee(); res.melee = meas({});
      // tiro do Rod com o interruptor ligado/desligado (caminho real: attack + updateShots)
      gun('Rod de Gelo'); P.mp = P.mmax;
      const shootRod = () => { PR.resetProf(); place(); P.mp = P.mmax; const s0 = tot('staff'), r0 = tot('rod'); with_(.5, () => { g.attack(e.x - P.x, e.z - P.z); const s = Reg.shots[Reg.shots.length - 1]; for (let i = 0; i < 80 && Reg.shots.includes(s); i++) Cb.updateShots(.05); }); return { ds: +(tot('staff') - s0).toFixed(3), dr: +(tot('rod') - r0).toFixed(3) }; };
      res.shotOff = shootRod(); C.ROD_XP_basico = .02; res.shotOn = shootRod(); C.ROD_XP_basico = 0;
      // teto anti-abuso do Cajado
      gun('Cajado do Aprendiz'); PR.resetProf(); place(); const t0 = tot('staff'); with_(.5, () => { for (let i = 0; i < 300; i++) { e.hp = 1e9; g.hit(e, 2000, {}); } }); res.capStaff = +(tot('staff') - t0).toFixed(2);
      // API do Rod
      PR.resetProf(); const a = PR.profRodSupport, T = 1000;
      res.api = { zero: a('heal', 0, 'x', T), neg: a('heal', -5, 'x', T), nan: a('heal', NaN, 'x', T), tipo: a('poção', 50, 'x', T), noStaff: tot('staff') };
      res.api.heal = a('heal', 30, 'a', T); res.api.afterHeal = { rod: tot('rod'), staff: tot('staff') };
      let ga = 0; for (let i = 0; i < 20; i++) ga += a('heal', 100, 'a', T + 1); res.api.targetA = ga + res.api.heal;
      let gb = 0; for (let i = 0; i < 20; i++) gb += a('shield', 100, 'b', T + 1); res.api.winTotal = res.api.targetA + gb; res.api.later = a('heal', 30, 'a', T + 30);
      res.api.rodTotal = tot('rod'); res.api.staffAfter = tot('staff');
      // níveis e limites
      PR.addXp('staff', 1e7); res.max = { lv: P.prof.staff.lv, xp: P.prof.staff.xp, more: PR.addXp('staff', 100), st: PR.profState('staff') };
      PR.resetProf(); PR.addXp('staff', 60); res.lvUp = { lv: P.prof.staff.lv, xp: P.prof.staff.xp };
      // requisitos híbridos (nível geral E proficiência)
      P.lv = 10; P.prof.staff.lv = 2;
      res.req = [PR.canUse({ lv: 5, prof: 3 }, 'staff'), PR.canUse({ lv: 12, prof: 1 }, 'staff'), PR.canUse({ lv: 5, prof: 2 }, 'staff'), PR.canUse({ lv: 5 }, 'staff'), PR.canUse({ lv: 5, prof: 1 }, 'rod'), PR.canUse({ lv: 11, prof: 0 }, 'staff')];
      res.reqState = PR.unlockState({ lv: 12, prof: 3 }, 'staff');
      // troca Cajado ↔ Rod não zera nem mistura XP
      PR.resetProf(); gun('Cajado do Aprendiz'); place(); with_(.5, () => g.hit(e, 300, {})); const sx = P.prof.staff.xp, sl = P.prof.staff.lv;
      g.bag.length = 0; g.bag.push(mk('Rod de Gelo', 12)); P.lv = 20; g.equip(0, 'gun'); place(); with_(.5, () => g.hit(e, 300, {}));
      res.swap = { staff: [sx, sl, P.prof.staff.xp, P.prof.staff.lv], rod: [P.prof.rod.xp, P.prof.rod.lv], gun: g.eq.gun.n };
      // painel: duas linhas somente-leitura
      document.querySelector('#panel, body'); const stt = document.getElementById('stt'); const Pan = await import('/js/ui/panel.js'); Pan.renderStats(); res.ui = [...stt.querySelectorAll('.prof-i')].map(x => x.textContent);
      // reset do personagem
      PR.addXp('staff', 500); PR.addXp('rod', 100); const before = JSON.stringify(P.prof); Rs.resetPlayer(); res.reset = { before, after: JSON.stringify(P.prof) };
      // persistência: grava um estado conhecido
      P.prof.staff.lv = 4; P.prof.staff.xp = 33.5; P.prof.rod.lv = 2; P.prof.rod.xp = 7; (await import('/js/systems/save.js')).saveGame(); res.saved = JSON.parse(localStorage.getItem('pirata-arpg:save:v1:t1') || localStorage.getItem(Object.keys(localStorage).find(k => /save/.test(k) && !/pre-sv2/.test(k)))).prof;
      return res;
    });
    const S = R;
    chk('começa com Cajado Nv1 e Rod Nv1, xp 0', JSON.stringify(S.start) === JSON.stringify({ staff: { xp: 0, lv: 1 }, rod: { xp: 0, lv: 1 } }), S.start);
    chk('Cajado: XP = dano efetivo × taxa; Rod 0', near(S.staffHit.ds, S.staffHit.exp) && S.staffHit.ds > 0 && S.staffHit.dr === 0, S.staffHit);
    chk('Cajado: excesso acima da vida do alvo não rende (vida 10, golpe 500) + bônus de abate', near(S.excess.ds, S.excess.exp, .05) && S.excess.ds < 500 * S.cfg.perDmg, S.excess);
    chk('inimigo trivial (10 níveis abaixo) rende 0; 5 abaixo rende pouco (×0,25)', S.trivial.ds === 0 && near(S.low.ds, S.low.exp), [S.trivial, S.low]);
    chk('companheiro (o.pet) não rende XP', S.pet.ds === 0 && S.pet.dr === 0, S.pet);
    chk('DoT com Cajado ativo conta para o Cajado; com Rod ativo não conta para ninguém', S.dotStaff.ds > 0 && S.dotStaff.dr === 0 && S.dotRod.ds === 0 && S.dotRod.dr === 0, [S.dotStaff, S.dotRod]);
    chk('Rod ativo: dano não rende XP de Cajado nem de Rod (padrão)', S.rodHit.ds === 0 && S.rodHit.dr === 0 && S.shotOff.ds === 0 && S.shotOff.dr === 0, [S.rodHit, S.shotOff]);
    chk('interruptor ROD_XP.basico ligado: tiro do Rod rende só XP de Rod', S.shotOn.dr > 0 && S.shotOn.ds === 0, S.shotOn);
    chk('arma corpo a corpo ativa: nenhum XP', S.melee.ds === 0 && S.melee.dr === 0, S.melee);
    chk('teto anti-abuso do Cajado (≤ ' + S.cfg.cap + ' por janela)', S.capStaff <= S.cfg.cap + .01 && S.capStaff > 0, S.capStaff);
    chk('API Rod: 0 sem benefício (0, negativo, NaN, tipo inexistente) e nada de XP de Cajado', S.api.zero === 0 && S.api.neg === 0 && S.api.nan === 0 && S.api.tipo === 0 && S.api.noStaff === 0, S.api);
    chk('API Rod: benefício real rende XP só de Rod', near(S.api.heal, 4.5) && S.api.afterHeal.rod > 0 && S.api.afterHeal.staff === 0, S.api.afterHeal);
    chk('API Rod: teto por alvo (' + S.cfg.rodTg + ') e por janela (' + S.cfg.rodCap + '); renova depois da janela', S.api.targetA <= S.cfg.rodTg + .01 && S.api.winTotal <= S.cfg.rodCap + .01 && S.api.later > 0 && S.api.staffAfter === 0, [S.api.targetA, S.api.winTotal, S.api.later]);
    chk('nível máximo ' + S.cfg.max + ': xp 0 e nada mais acumula; subir de nível com 60 xp', S.max.lv === S.cfg.max && S.max.xp === 0 && S.max.more === 0 && S.max.st.max && S.lvUp.lv === 2 && S.lvUp.xp === 0, [S.max, S.lvUp]);
    chk('requisitos híbridos exigem nível geral E proficiência (lv10/prof2)', JSON.stringify(S.req) === JSON.stringify([false, false, true, true, true, false]) && !S.reqState.ok && !S.reqState.lv.ok && !S.reqState.prof.ok, [S.req, S.reqState]);
    chk('trocar Cajado→Rod não zera nem mistura XP', S.swap.staff[0] === S.swap.staff[2] && S.swap.staff[1] === S.swap.staff[3] && S.swap.rod[0] === 0 && S.swap.rod[1] === 1 && S.swap.gun === 'Rod de Gelo', S.swap);
    chk('painel mostra as duas linhas de proficiência', S.ui.length === 2 && /Cajado: Nv \d+/.test(S.ui[0]) && /Rod: Nv \d+/.test(S.ui[1]), S.ui);
    chk('reset do personagem devolve a proficiência ao inicial', S.reset.after === JSON.stringify({ staff: { xp: 0, lv: 1 }, rod: { xp: 0, lv: 1 } }) && S.reset.before !== S.reset.after, S.reset);
    chk('save grava prof versionado (sv 1)', S.saved && S.saved.sv === 1 && S.saved.staff.lv === 4 && S.saved.staff.xp === 33.5 && S.saved.rod.lv === 2, S.saved);
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const after = await page.evaluate(() => JSON.parse(JSON.stringify(__game.P.prof)));
    chk('salvar → recarregar mantém xp/nível de Cajado e Rod', JSON.stringify(after) === JSON.stringify({ staff: { xp: 33.5, lv: 4 }, rod: { xp: 7, lv: 2 } }), after);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  // ===== 2) Saves antigos =====
  console.log('Migração de saves antigos (gerados pelo jogo V552, carregados pelo atual)');
  for (const sc of SCENARIOS) {
    const old = await openSeeded(browser, oldPort, sc.k);
    const O = await old.page.evaluate(async ([sc, SNAP]) => {
      const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, C = await import('/js/core/chars.js'), Sv = await import('/js/systems/save.js'), Sc = await import('/js/data/scaling.js');
      const mk = n => { const i = W.findIndex(w => w.n === n); return { ty: 'wpn', q: 1, v: W[i].b, il: 1, w: i, n }; };
      P.lv = sc.lv; P.nxt = Sc.xpToNext(P.lv); P.xp = 0; if (sc.lv > 1) { P.max += 10 * (sc.lv - 1); P.mmax += 5 * (sc.lv - 1); } if (sc.gold != null) P.gold = sc.gold;
      g.bag.length = 0; (sc.bag || []).forEach(n => g.bag.push(mk(n)));
      if (sc.gun) { g.eq.gun = mk(sc.gun); g.setWeapon('gun'); }
      if (S.on && sc.rk) { S.rk = sc.rk.slice(); S.tl = { ...(sc.tl || {}) }; }
      Sv.saveGame();
      const key = C.saveKey('t1'); let str = localStorage.getItem(key);
      if (sc.noSkills) { const o = JSON.parse(str); o.skills = null; str = JSON.stringify(o); }
      return { key, str, snap: await eval(SNAP) };
    }, [sc, SNAP]);
    await old.ctx.close();
    console.log(' ' + sc.id);
    const o = JSON.parse(O.str);
    chk('save antigo real: v:1, sem sv e sem prof', o.v === 1 && o.sv === undefined && o.prof === undefined);
    const bk = O.key + ':pre-sv2';
    const nw = await openSeeded(browser, port, sc.k, { [O.key]: O.str });
    const N = await nw.page.evaluate(async ([SNAP, key, bk]) => {
      const r = { snap: await eval(SNAP), backup: localStorage.getItem(bk) };
      const Sv = await import('/js/systems/save.js'); const raw = JSON.parse(localStorage.getItem(key));
      const m1 = Sv.migrateSave(raw, __game.P.cls && (JSON.parse(localStorage.getItem('pirata-arpg:chars:v1')).list[0].k)), m2 = Sv.migrateSave(m1, JSON.parse(localStorage.getItem('pirata-arpg:chars:v1')).list[0].k);
      r.idem = JSON.stringify(m1) === JSON.stringify(m2); r.mig = m1;
      Sv.saveGame(); r.after = localStorage.getItem(key); r.backup2 = localStorage.getItem(bk);
      return r;
    }, [SNAP, O.key, bk]);
    const a = O.snap, b = N.snap;
    chk('preservado: nível, ouro, vida/mana máx., mochila, equipamento, ranks e talentos', ['lv', 'gold', 'max', 'mmax', 'gun', 'wpn', 'off', 'arm'].every(f => a[f] === b[f]) && JSON.stringify(a.bag) === JSON.stringify(b.bag) && JSON.stringify(a.rk) === JSON.stringify(b.rk) && JSON.stringify(a.tl) === JSON.stringify(b.tl), { a: [a.lv, a.gold, a.bag, a.gun, a.rk], b: [b.lv, b.gold, b.bag, b.gun, b.rk] });
    chk('cópia original guardada em ' + 'pre-sv2 (idêntica ao save antigo)', N.backup === O.str && N.backup2 === O.str);
    chk('migrar duas vezes = idêntico', N.idem);
    const after = JSON.parse(N.after);
    if (sc.k === 'mago') {
      chk('Mago: prof inicial coerente (Cajado = nível geral ' + sc.lv + ', Rod 1, xp 0)', JSON.stringify(b.prof) === JSON.stringify({ staff: { xp: 0, lv: sc.lv }, rod: { xp: 0, lv: 1 } }), b.prof);
      chk('Mago: salvo de novo tem sv 2 e bloco prof', after.sv === 2 && after.prof && after.prof.sv === 1 && after.prof.staff.lv === sc.lv, after.prof);
    } else {
      const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.t; delete c.sv; delete c.seed; delete c.pos; delete c.bond; if (c.player) delete c.player.dmg; if (c.skills) delete c.skills.sv; return c; }, A = strip(o), B = strip(after), diff = Object.keys({ ...A, ...B }).filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
      chk('sem proficiência: P.prof ausente e nenhum campo prof no save', b.prof === null && after.prof === undefined);
      chk('save idêntico ao anterior (campo a campo, exceto t, sv, skills.sv e, por serem sorteados/relógio a cada abertura: seed, pos, bond; player.dmg = bug antigo do Ladino, ver relatório)', diff.length === 0, diff.map(k => [k, JSON.stringify(A[k]).slice(0, 80), JSON.stringify(B[k]).slice(0, 80)]));
    }
    console.log('   errors: ' + (nw.errs.length ? nw.errs.slice(0, 3).join(' | ') : 'nenhum')); if (nw.errs.length) bad++;
    // recarrega o save novo: tudo igual, sem criar outra cópia pre-sv2 (já é sv 2)
    await nw.ctx.close();
    const again = await openSeeded(browser, port, sc.k, { [O.key]: N.after });
    const G = await again.page.evaluate(async ([SNAP, bk]) => ({ snap: await eval(SNAP), bk: localStorage.getItem(bk) }), [SNAP, bk]);
    chk('salvo → recarregado (sv 2): idêntico, sem nova cópia pre-sv2', JSON.stringify(G.snap) === JSON.stringify(b) && G.bk === null, G.bk && 'copia criada');
    await again.ctx.close();
    if (sc.id.startsWith('mago nv12 (')) {
      // bloco prof corrompido/inválido: ignorado e reinicializado sem tocar no resto
      for (const [nome, bad_] of [['texto', 'lixo'], ['campos inválidos', { sv: 1, staff: { xp: 'a', lv: -5 }, rod: null }], ['nível fora do limite', { sv: 1, staff: { xp: 0, lv: 999 }, rod: { xp: 0, lv: 1 } }], ['xp além do nível', { sv: 1, staff: { xp: 99999, lv: 2 }, rod: { xp: 0, lv: 1 } }]]) {
        const s2 = { ...after, prof: bad_ };
        const c = await openSeeded(browser, port, 'mago', { [O.key]: JSON.stringify(s2) });
        const Cn = await c.page.evaluate(SNAP);
        chk('prof corrompido (' + nome + '): resto intacto, prof reinicializado', Cn.lv === b.lv && Cn.gold === b.gold && JSON.stringify(Cn.bag) === JSON.stringify(b.bag) && JSON.stringify(Cn.rk) === JSON.stringify(b.rk) && JSON.stringify(Cn.prof) === JSON.stringify({ staff: { xp: 0, lv: sc.lv }, rod: { xp: 0, lv: 1 } }) && c.errs.length === 0, [Cn.prof, c.errs.slice(0, 1)]);
        await c.ctx.close();
      }
      // cópia anterior nunca é sobrescrita
      const c = await openSeeded(browser, port, 'mago', { [O.key]: O.str, [bk]: 'ORIGINAL-ANTERIOR' });
      const kept = await c.page.evaluate(bk => localStorage.getItem(bk), bk);
      chk('cópia pre-sv2 anterior não é sobrescrita', kept === 'ORIGINAL-ANTERIOR', kept);
      await c.ctx.close();
    }
  }
  // ===== 3) Outras classes: sem prof =====
  console.log('Classes sem proficiência');
  for (const k of ['guerreiro', 'cacador', 'ladino', 'none']) {
    const { ctx, page, errs } = await openSeeded(browser, port, k);
    const r = await page.evaluate(() => ({ prof: __game.P.prof === undefined, h: __game.P.profh === undefined, ui: document.querySelectorAll('.prof-i').length }));
    chk(k + ': sem P.prof, sem gancho e sem linhas no painel', r.prof && r.h && r.ui === 0, r);
    const x = await page.evaluate(async () => { const g = __game, P = g.P, e = g.enemies.find(z => !z.dead); e.hp = e.max = 1e9; P.tgt = e; g.hit(e, 100, {}); return P.prof === undefined; });
    chk(k + ': golpe não cria proficiência', x);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
