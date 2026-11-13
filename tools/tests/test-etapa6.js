/* Etapa 6 (habilidades de suporte do Rod), uma categoria por vez: 1 cura instantânea · 2 cura contínua · 3 escudos · 4 buffs · 5 debuffs sem dano · 6 purificação · 7 suporte em área,
   mais: zero dano em inimigos, Rod/Cajado, troca de arma, botões e persistência, migração de saves V554, auto-combate, outras classes.
   Uso: node test-etapa6.js <porta-atual> <porta-V554> */
const lib = require('./lib');
const port = process.argv[2], p554 = process.argv[3] || '8774';
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };
const near = (a, b, t = 1.01) => Math.abs(a - b) <= t;

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

/** Ferramentas no navegador (window.T): Mago com o Rod na mão, nível/proficiência altos, todas as habilidades do Rod aprendidas */
const SETUP = async () => {
  const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, BUF = g.BUF, PR = g.PROF;
  const M = await import('/js/systems/skills.js'), D = await import('/js/data/skills.js'), E = await import('/js/entities/player.js'), PS = await import('/js/pets/stats.js'), PM = await import('/js/pets/manager.js');
  const wi = n => W.findIndex(w => w.n === n), mk = (n, il = 1) => ({ ty: 'wpn', q: 1, v: Math.round(W[wi(n)].b * (1 + (il - 1) * .2)), il, w: wi(n), n });
  const pn = performance.now.bind(performance), rnd = Math.random, T = { off: 0, g, P, S, BUF, PR, M, D, E, PS, PM };
  performance.now = () => pn() + T.off;   // relógio simulado: cada T.reset() avança 30 s (a janela anti-abuso de XP é por tempo)
  T.with_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
  T.idx = id => D.ROD_TREE.findIndex(n => n.id === id);
  T.step = (s, dt = .05) => { for (let t = 0; t < s; t += dt) { BUF.updateBuffs(dt); g.ELM.updateElements(dt); g.SK.update(dt); } };
  T.gun = n => { g.eq.gun = mk(n, 12); g.setWeapon('gun'); P.act = 'gun'; P.swap = null; };
  T.melee = () => { g.eq.wpn = mk('Cutelo Pirata'); g.setWeapon('wpn'); P.act = 'wpn'; P.swap = null; };
  T.petAt = d => BUF.setPetPos(() => ({ x: P.x + d, z: P.z }));
  T.pet = (hp, dn = 0) => { g.state.petOff = false; const s = PS.PST[g.state.pet.id]; s.dn = dn; s.hp = hp; return s; };
  T.petMax = () => PS.pmax(g.state.pet.id);
  T.enemy = () => { const e = g.enemies.find(x => !x.dead); e.dmg0 = e.dmg0 || e.dmg; return e; };
  T.reset = () => { T.off += 30000; BUF.clearBuffs(); S.cds = [0, 0, 0]; S.rcd = {}; S.rcdm = {}; P.mp = P.mmax; P.hp = P.max; P.slow = 0; P.stone = 0; P.haste = 0; P.dead = false; P.sit = P.sitT = 0; P.roll = 0; P.swap = null; };
  T.cast = id => { const i = T.idx(id); if (S.rod.slots[0] !== i) M.setRodSlot(0, i); S.rcd = {}; P.mp = P.mmax; const m0 = P.mp, ok = g.SK.useSkill(0); return { ok, mp: m0 - P.mp, cd: S.rcd[i] || 0 }; };
  T.xp = () => ({ rod: P.prof.rod.xp + (P.prof.rod.lv - 1) * 1e4, staff: P.prof.staff.xp + (P.prof.staff.lv - 1) * 1e4 });
  T.hurt = d => { const h0 = P.hp; E.hurtP(d, 0, 0); return h0 - P.hp; };
  P.sit = P.sitT = 0; P.dead = false; P.lv = 20; P.max = 1000; P.hp = 1000; P.mmax = 5000; P.mp = 5000; P.dr = 0; P.shieldDr = 0;
  PR.devSet('staff', 20); PR.devSet('rod', 14); T.gun('Rod de Gelo');
  for (let i = 0; i < D.ROD_TREE.length; i++) if (M.rodHas(i)) { M.learnRod(i); }
  T.petAt(3); T.pet(T.petMax());
  window.T = T;
  return { rk: S.rod.rk.slice(), slots: S.rod.slots.slice(), points: M.rodPoints() };
};

(async () => {
  const browser = await lib.launch();
  const { ctx, page, errs } = await openSeeded(browser, port, 'mago');
  const S0 = await page.evaluate(SETUP);
  chk('preparo: 9 habilidades aprendidas (rank 1), 3 botões = 1ªs aprendidas, sobram pontos', S0.rk.filter(v => v > 0).length === 10 && JSON.stringify(S0.slots) === '[0,1,2]' && S0.points === 4, S0);
  const ev = fn => page.evaluate(fn);

  // ---------- 1) cura instantânea ----------
  console.log('Categoria 1 · Cura instantânea (Cura Menor)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF } = T; const r = {};
      T.reset(); const pw = (P.cls.support || 1) * 1.12; P.hp = 500; const x0 = T.xp(); const c = T.cast('cura'); r.hp = P.hp - 500; r.exp = .25 * P.max * pw; r.c = c; r.xp = [T.xp().rod - x0.rod, T.xp().staff - x0.staff]; r.cost = M.rodCost(T.idx('cura'));
      T.reset(); const x1 = T.xp(); const c2 = T.cast('cura'); r.full = { c: c2, hp: P.hp, xp: T.xp().rod - x1.rod };
      T.reset(); P.hp = 1000; T.pet(10); const p0 = T.pet(10).hp; T.petAt(3); const c3 = T.cast('cura'); r.pet = { c: c3, gain: T.pet(0).hp };
      T.reset(); P.hp = 1000; const ps = T.pet(10); T.petAt(3); T.cast('cura'); r.petGain = ps.hp - 10; r.petExp = .25 * T.petMax() * pw;
      T.reset(); P.hp = 1000; const ps2 = T.pet(10); T.petAt(40); const c4 = T.cast('cura'); r.far = { ok: c4.ok, hp: ps2.hp };
      T.reset(); P.hp = 1000; const ps3 = T.pet(10, 5); T.petAt(3); const c5 = T.cast('cura'); r.down = { ok: c5.ok, hp: ps3.hp, dn: ps3.dn };
      T.reset(); P.hp = 600; const ps4 = T.pet(T.petMax() * .2); T.petAt(3); T.cast('cura'); r.lowest = { p: P.hp, pet: ps4.hp > T.petMax() * .2 + 1 };
      T.pet(T.petMax()); T.petAt(3);
      // rank e talentos
      const i = T.idx('cura'); S.rod.rk[i] = 2; S.TT.cdr = .1; S.TT.mpc = .1; T.reset(); P.hp = 100; const c6 = T.cast('cura'); r.rank = { c: c6, cost: M.rodCost(i), cd: M.rodCd(i), expCost: Math.max(1, Math.ceil(14 * (1 - .04 * 2 - .1))), expCd: Math.max(.5, 6 * (1 - .06 * 2 - .1)), heal: P.hp - 100, expHeal: Math.min(900, .25 * P.max * 1.3 * (1 + .12 * 2)) };
      S.rod.rk[i] = 1; S.TT.cdr = 0; S.TT.mpc = 0;
      T.reset(); P.hp = 100; T.cast('cura'); const again = g_use(); function g_use() { const m = P.mp; const ok = T.g.SK.useSkill(0); return { ok, spent: m - P.mp }; } r.cooldown = again;
      T.reset(); P.mp = 3; P.hp = 100; const m0 = P.mp; r.nomana = { ok: T.g.SK.useSkill(0), mp: P.mp - m0, hp: P.hp };
      return r; });
    chk('cura: heal = 25% da vida máx × poder do Mago; gasta custo; recarga; XP só de Rod (0,15/HP) e 0 de Cajado', near(R.hp, R.exp) && R.c.ok && R.c.mp === R.cost && near(R.c.cd, 6 * .94, .05) && near(R.xp[0], Math.min(R.hp * .15, 20), .2) && R.xp[1] === 0, R);
    chk('vida cheia: não lança, não gasta mana, sem recarga e SEM XP', R.full.c.ok === false && R.full.c.mp === 0 && R.full.c.cd === 0 && R.full.xp === 0, R.full);
    chk('alvo companheiro: cura o companheiro quando é quem precisa; respeita alcance (40 > 14) e desmaiado', near(R.petGain, R.petExp, 1.5) && R.far.ok === false && R.far.hp === 10 && R.down.ok === false && R.down.hp === 10, [R.petGain, R.petExp, R.far, R.down]);
    chk('escolhe quem tem MENOS vida (fração): companheiro a 20% × você a 60%', R.lowest.pet && R.lowest.p === 600, R.lowest);
    chk('rank 2 + talentos cdr/mpc 10%: custo, recarga e cura efetivos conferem', R.rank.cost === R.rank.expCost && near(R.rank.cd, R.rank.expCd, .01) && R.rank.c.mp === R.rank.expCost && near(R.rank.c.cd, R.rank.expCd, .01) && near(R.rank.heal, R.rank.expHeal, 1.5), R.rank);
    chk('em recarga não lança; sem mana não lança (nem cura, nem gasta)', R.cooldown.ok === false && R.cooldown.spent === 0 && R.nomana.ok === false && R.nomana.mp === 0 && R.nomana.hp === 100, [R.cooldown, R.nomana]);
  }
  // ---------- 2) cura contínua ----------
  console.log('Categoria 2 · Cura contínua (Prece Restauradora)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF } = T; const r = {}; const i = T.idx('regen');
      T.reset(); P.hp = 100; const ps = T.pet(10); T.petAt(3); const x0 = T.xp(); const c = T.cast('regen'); r.c = c; r.list = [BUF.buffList('p').map(b => b.id), BUF.buffList('pet').map(b => b.id)];
      T.step(4); r.gain4 = P.hp - 100; r.exp4 = .06 * 1.3 * 1.12 * P.max * 4; r.petGain = ps.hp - 10; r.xp = T.xp().rod - x0.rod; r.stf = T.xp().staff - x0.staff;
      T.step(5); r.expired = BUF.buffList('p').length === 0 && BUF.buffList('pet').length === 0; const h = P.hp; T.step(2); r.noMore = P.hp === h;
      // renovação: recasto durante o efeito não duplica a taxa
      T.reset(); P.hp = 100; T.cast('regen'); T.step(2); T.cast('regen'); r.renew = { n: BUF.buffList('p').length, t: BUF.buffList('p')[0].t };
      T.reset(); P.hp = 100; T.cast('regen'); T.step(8.1); r.total = P.hp - 100; r.expTotal = .06 * 1.3 * 1.12 * P.max * 8;
      // vida cheia durante os ticks: nenhum XP
      T.reset(); T.cast('regen'); const x1 = T.xp(); T.step(8.1); r.fullXp = T.xp().rod - x1.rod;
      // limite de efeitos por alvo
      T.reset(); r.limit = ['regen', 'shield', 'atk', 'dr', 'spd'].map(id => BUF.addBuff('p', id, { dur: 5, pow: .1, amt: 10 })); r.limit.push(BUF.addBuff('p', 'xx1', { dur: 5, pow: .1 })); r.limit.push(BUF.addBuff('p', 'xx2', { dur: 5, pow: .1 })); r.limitN = BUF.buffList('p').length;
      T.reset(); return r; });
    chk('aplica em você e no companheiro; ticks curam (≈ 6%/s × poder); XP de Rod só pela vida curada; 0 de Cajado', R.c.ok && JSON.stringify(R.list) === '[["regen"],["regen"]]' && near(R.gain4, R.exp4, 40) && R.petGain > 0 && R.xp > 0 && R.stf === 0, R);
    chk('expira ao fim da duração e para de curar', R.expired && R.noMore);
    chk('recasto renova a duração sem duplicar o efeito; total em 8 s ≈ esperado', R.renew.n === 1 && R.renew.t > 7.5 && near(R.total, R.expTotal, 60), [R.renew, R.total, R.expTotal]);
    chk('vida cheia durante os ticks: nenhum XP', R.fullXp === 0, R.fullXp);
    chk('limite de efeitos simultâneos por alvo (6)', R.limitN === 6 && R.limit.slice(0, 6).every(Boolean) && R.limit[6] === false, [R.limit, R.limitN]);
  }
  // ---------- 3) escudos ----------
  console.log('Categoria 3 · Escudos (Barreira Arcana)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF } = T; const r = {};
      T.reset(); const ps = T.pet(T.petMax()); T.petAt(3); const x0 = T.xp(); const c = T.cast('escudo'); const sh = BUF.buffList('p')[0]; r.c = c; r.amt = sh.amt; r.exp = .25 * P.max * 1.3 * 1.12; r.pet = BUF.buffList('pet').map(b => b.id);
      r.noDmgXp = T.xp().rod - x0.rod;
      const lost1 = T.hurt(100); r.small = { lost: lost1, left: BUF.buffList('p')[0].amt, xp: +(T.xp().rod - x0.rod).toFixed(2), exp: 100 * .12 };
      const left = BUF.buffList('p')[0].amt; const lost2 = T.hurt(left + 50); r.over = { lost: lost2, gone: BUF.buffList('p').length === 0, xp: +(T.xp().rod - x0.rod).toFixed(2), expXp: (100 + left) * .12 };
      T.reset(); T.cast('escudo'); const y0 = T.xp(); T.step(11); r.expired = BUF.buffList('p').length === 0; r.expXp = T.xp().rod - y0.rod;   // escudo que não absorveu: 0 XP
      // companheiro
      T.reset(); const p2 = T.pet(T.petMax()); T.petAt(3); T.cast('escudo'); const hp0 = p2.hp; T.E.constructor; const { hurtPet } = T.PM; hurtPet(10); r.petAbs = { hp: hp0 - p2.hp, left: BUF.buffList('pet')[0] && BUF.buffList('pet')[0].amt };
      // sem escudo: dano normal
      T.reset(); r.plain = T.hurt(100);
      // escudo + Véu: redução antes, absorção depois
      T.reset(); T.cast('escudo'); T.cast('def'); const h = T.hurt(100); r.both = { lost: h, shieldLeft: BUF.buffList('p').find(b => b.id === 'shield').amt, expAbs: 100 * (1 - .2 * 1.3 * 1.12) };
      T.reset(); return r; });
    chk('escudo = 25% da vida máx × poder; em você e no companheiro; sem dano → nenhum XP', R.c.ok && near(R.amt, R.exp, 1) && JSON.stringify(R.pet) === '["shield"]' && R.noDmgXp === 0, R);
    chk('absorve de verdade: dano pequeno = 0 de vida perdida; XP só pelo absorvido (0,12/ponto)', R.small.lost === 0 && near(R.small.left, R.amt - 100, .5) && near(R.small.xp, R.small.exp, .3), R.small);
    chk('dano maior que o escudo: o excesso passa; escudo some; XP só pelo que absorveu', near(R.over.lost, 50, .5) && R.over.gone && R.over.xp >= R.small.xp && R.over.xp <= 20.01, R.over);
    chk('escudo que expira sem absorver: 0 XP', R.expired && R.expXp === 0, [R.expired, R.expXp]);
    chk('companheiro: escudo absorve o dano do pet; sem escudo dano normal', R.petAbs.hp === 0 && R.plain === 100, [R.petAbs, R.plain]);
    chk('escudo + Véu: Véu reduz antes, escudo absorve o restante', near(R.both.lost, 0, .01) && near(1000 * 0 + R.both.shieldLeft, 1000 * .25 * 1.3 * 1.12 - R.both.expAbs, 1.5), R.both);
  }
  // ---------- 4) buffs ----------
  console.log('Categoria 4 · Buffs de ataque, defesa e velocidade');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g } = T; const r = {}; const e = T.enemy();
      const dmg = () => { e.hp = e.max = 1e9; e.lv = P.lv; e.stone = 0; e.mk = 0; e.dead = 0; const h = e.hp; T.with_(.5, () => g.hit(e, 100, {})); return h - e.hp; };
      // ataque
      T.reset(); r.base = dmg(); const x0 = T.xp(); const c = T.cast('atk'); r.noHitXp = T.xp().rod - x0.rod; r.atk = dmg(); r.atkExp = Math.round(100 * (1 + .2 * 1.3 * 1.12)); r.xpAtk = T.xp().rod - x0.rod; const x1 = T.xp(); for (let i = 0; i < 20; i++) dmg(); r.spam = T.xp().rod - x1.rod;
      T.step(11); r.atkGone = BUF.buffList('p').length === 0 && dmg() === r.base;
      // defesa
      T.reset(); r.dmgBase = T.hurt(100); T.reset(); T.petAt(3); const ps = T.pet(T.petMax()); T.cast('def'); const x2 = T.xp(); r.dr = T.hurt(100); r.drExp = 100 * (1 - .2 * 1.3 * 1.12); r.xpDr = T.xp().rod - x2.rod; r.drPet = BUF.buffList('pet').map(b => b.id);
      const hp0 = ps.hp; T.PM.hurtPet(40); r.petDr = hp0 - ps.hp; r.petDrExp = 40 * (1 - .2 * 1.3 * 1.12);
      T.reset(); T.petAt(3); T.cast('def'); T.step(11); r.drGone = BUF.buffList('p').length === 0 && T.hurt(100) === 100;
      // velocidade
      T.reset(); const c3 = T.cast('vel'); T.step(.1); r.spd = { ok: c3.ok, k: P.hasteK, h: P.haste > 0 }; T.step(1); r.spdAfter = P.haste > 0; T.step(9); r.spdGone = BUF.buffList('p').length === 0; T.step(1); r.spdOff = !(P.haste > 0);
      // limites de intensidade
      T.reset(); BUF.addBuff('p', 'dr', { dur: 5, pow: 5 }); BUF.addBuff('p', 'spd', { dur: 5, pow: 5 }); BUF.addBuff('p', 'atk', { dur: 5, pow: 9 }); r.caps = [BUF.buffPow('p', 'dr'), BUF.buffPow('p', 'spd'), BUF.buffPow('p', 'atk')];
      // renovação sem acúmulo
      T.reset(); T.cast('atk'); T.step(3); T.cast('atk'); r.renew = [BUF.buffList('p').length, +BUF.buffList('p')[0].pow.toFixed(3), +(.2 * 1.3 * 1.12).toFixed(3)];
      T.reset(); return r; });
    chk('ataque: +20%×poder no dano medido; sem golpe → 0 XP; com golpe → XP de buff; spam limitado; expira e volta ao normal', R.base === 100 && R.atk === R.atkExp && R.noHitXp === 0 && R.xpAtk > 0 && R.spam <= 20.01 && R.atkGone, R);
    chk('defesa: −20%×poder no dano recebido (medido) em você e no companheiro; XP só quando reduziu dano; expira', near(R.dr, R.drExp, .5) && R.dmgBase === 100 && R.xpDr > 0 && R.drPet.includes('dr') && near(R.petDr, R.petDrExp, 1.5) && R.drGone, R);
    chk('velocidade: P.haste/hasteK = 1+30%×poder enquanto dura e some ao fim', R.spd.ok && near(R.spd.k, 1 + .3 * 1.3 * 1.12, .001) && R.spdAfter && R.spdGone && R.spdOff, R.spd);
    chk('limites de intensidade (defesa ≤ 60%, velocidade ≤ 60%, ataque ≤ 100%) e renovação sem acúmulo', R.caps[0] === .6 && R.caps[1] === .6 && R.caps[2] === 1 && R.renew[0] === 1 && R.renew[1] === R.renew[2], [R.caps, R.renew]);
  }
  // ---------- 4b) proteção (Égide) ----------
  console.log('Categoria 4b · Proteção (Égide Arcana)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g } = T; const r = {};
      T.reset(); const x0 = T.xp(); const c = T.cast('protecao'); r.c = c; P.slow = 3; T.step(.2); r.slow = P.slow; r.kb = P.noKb === true; r.xp = T.xp().rod - x0.rod;
      T.step(9); r.gone = BUF.buffList('p').length === 0 && P.noKb === false;
      P.slow = 3; T.step(.2); r.slowAfter = P.slow > 0;
      T.reset(); const x1 = T.xp(); T.cast('protecao'); T.step(8.5); r.idleXp = T.xp().rod - x1.rod;
      const hp = P.hp; T.reset(); T.cast('protecao'); const lost = T.hurt(100); r.dmg = lost;
      T.reset(); return r; });
    chk('Égide: impede lentidão e empurrão por 8 s, expira, XP só quando impediu algo, e NÃO reduz dano', R.c.ok && R.slow === 0 && R.kb && R.xp > 0 && R.gone && R.slowAfter && R.idleXp === 0 && R.dmg === 100, R);
  }
  // ---------- 5) debuffs sem dano ----------
  console.log('Categoria 5 · Debuffs sem dano (Névoa Sombria)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g } = T; const r = {};
      const es = g.enemies.filter(x => !x.dead).slice(0, 3); es.forEach(e => { e.dmg0 = e.dmg0 || e.dmg; });
      const [a, b, c] = es; const set = (e, d) => { e.x = P.x + d; e.z = P.z; e.hp = e.max = 1e9; e.dead = 0; e.stone = 0; g.ELM.clearStatus(e); e.slow = e.root = e.bn = e.ps = e.bl = e.mk = 0; e.dmg = e.dmg0; e.t = Object.assign({}, e.t0 || e.t); if (!e.t0) e.t0 = e.t; };
      T.reset(); set(a, 3); set(b, 5); set(c, 12); const hp = es.map(e => e.hp); const x0 = T.xp(); const cs = T.cast('debuff'); r.c = cs;
      r.a = { slow: a.slow, wk: a.wk, dmg: a.dmg, d0: a.dmg0 }; r.b = { slow: b.slow, wk: b.wk }; r.out = { slow: c.slow || 0, wk: c.wk || 0, dmg: c.dmg === c.dmg0 };
      r.noDmg = es.every((e, i) => e.hp === hp[i]) && es.every(e => !(e.bn > 0) && !(e.ps > 0) && !(e.bl > 0) && !(e.mk > 0)); r.xp = [T.xp().rod - x0.rod, T.xp().staff - x0.staff];
      T.step(4); r.hpAfter = es.every((e, i) => e.hp === hp[i]); r.exp1 = a.slow > 0 || a.slow <= 0; T.step(3); r.expired = !(a.slow > 0) && !(a.wk > 0) && a.dmg === a.dmg0;
      // repetir sem novos afetados não rende
      T.reset(); set(a, 3); T.cast('debuff'); const y0 = T.xp(); T.cast('debuff'); r.repeatXp = T.xp().rod - y0.rod;
      // chefe: também sofre (regras existentes de e.t.boss)
      T.reset(); set(a, 3); a.t.boss = true; T.cast('debuff'); r.boss = { slow: a.slow > 0, wk: a.wk > 0, hp: a.hp === 1e9 }; a.t.boss = false;
      // sem inimigos no alcance: não gasta
      T.reset(); es.forEach(e => set(e, 30)); const nc = T.cast('debuff'); r.none = nc;
      es.forEach(e => { e.x = P.x + 40; e.dmg = e.dmg0; g.ELM.clearStatus(e); });
      T.reset(); return r; });
    chk('em raio 6: lentidão + enfraquecer (−25%×poder do dano do inimigo); fora do raio nada; ZERO dano/queimar/veneno/marca', R.c.ok && R.a.slow > 3 && R.a.wk > 5 && R.a.dmg < R.a.d0 && R.b.slow > 0 && R.out.slow === 0 && R.out.dmg && R.noDmg && R.hpAfter, R);
    chk('XP de Rod só pelos inimigos realmente afetados (2 × 2/inimigo); 0 de Cajado', near(R.xp[0], 4, .6) && R.xp[1] === 0, R.xp);
    chk('expira (devolve o dano do inimigo); repetir sem novos afetados rende 0; chefe sofre; sem inimigos = não lança nem gasta', R.expired && R.repeatXp === 0 && R.boss.slow && R.boss.wk && R.boss.hp && R.none.ok === false && R.none.mp === 0, [R.expired, R.repeatXp, R.boss, R.none]);
  }
  // ---------- 6) purificação ----------
  console.log('Categoria 6 · Purificação');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g } = T; const r = {};
      T.reset(); P.slow = 3; const x0 = T.xp(); const c = T.cast('purifica'); r.c = c; r.after = [P.slow, P.stone]; r.xp = [T.xp().rod - x0.rod, T.xp().staff - x0.staff]; T.reset(); P.stone = 5; r.stone = T.cast('purifica'); P.stone = 0;
      T.reset(); const x1 = T.xp(); const n = T.cast('purifica'); r.none = { ok: n.ok, mp: n.mp, cd: n.cd, xp: T.xp().rod - x1.rod };
      T.reset(); P.slow = 2; const c2 = T.cast('purifica'); r.onlySlow = [c2.ok, P.slow];
      return r; });
    chk('remove a lentidão do jogador; XP de suporte só pelo que removeu (1 efeito × 2); 0 de Cajado; petrificado não lança nada (regra existente: a pedra bloqueia todas as habilidades)', R.c.ok && R.after[0] === 0 && near(R.xp[0], 2, .6) && R.xp[1] === 0 && R.stone.ok === false, R);
    chk('sem nada a purificar: não lança, não gasta mana nem recarga, 0 XP; só lentidão também funciona', R.none.ok === false && R.none.mp === 0 && R.none.cd === 0 && R.none.xp === 0 && R.onlySlow[0] === true && R.onlySlow[1] === 0, [R.none, R.onlySlow]);
  }
  // ---------- 7) suporte em área ----------
  console.log('Categoria 7 · Suporte em área (Santuário)');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g } = T; const r = {};
      T.reset(); P.hp = 100; const ps = T.pet(10); T.petAt(5); const c = T.cast('area'); r.c = c; r.list = [BUF.buffList('p').map(b => b.id).sort(), BUF.buffList('pet').map(b => b.id).sort()];
      T.step(4); r.gain = P.hp - 100; r.exp = .04 * 1.3 * 1.12 * P.max * 4; r.pet = ps.hp - 10; r.dr = T.hurt(100); r.drExp = 100 * (1 - .15 * 1.3 * 1.12);
      T.step(5); r.expired = BUF.buffList('p').length === 0 && BUF.buffList('pet').length === 0;
      T.reset(); P.hp = 100; const ps2 = T.pet(10); T.petAt(12); T.cast('area'); r.far = { pet: BUF.buffList('pet').length, p: BUF.buffList('p').length };
      return r; });
    chk('área (raio 8): cura contínua + redução de dano em você e no companheiro dentro do raio; fora do raio só você', R.c.ok && JSON.stringify(R.list) === '[["dr","regen"],["dr","regen"]]' && near(R.gain, R.exp, 40) && R.pet > 0 && near(R.dr, R.drExp, .6) && R.expired && R.far.pet === 0 && R.far.p === 2, R);
  }
  // ---------- transversais ----------
  console.log('Transversais');
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g, D } = T; const r = {}; const es = g.enemies.filter(x => !x.dead).slice(0, 3); es.forEach(e => { e.dmg0 = e.dmg0 || e.dmg; e.x = P.x + 4; e.z = P.z; e.hp = e.max = 1e9; });
      // nenhuma habilidade do Rod causa dano: todas, depois de 3 s
      T.reset(); P.hp = 300; P.slow = 2; T.pet(10); T.petAt(3); const hp = es.map(e => e.hp), st0 = T.xp().staff;
      for (let i = 0; i < D.ROD_TREE.length; i++) if (M.rodHas(i)) { M.setRodSlot(0, i); S.rcd = {}; P.mp = P.mmax; g.SK.useSkill(0); T.step(.5); }
      T.step(3); r.zero = es.every((e, i) => e.hp === hp[i]); r.staffXp = T.xp().staff - st0;
      // com Cajado/corpo a corpo: os botões são do Cajado; Rod não usa suporte
      T.reset(); es.forEach(e => { e.x = P.x + 5; }); T.gun('Cajado do Aprendiz'); M.setRodSlot(0, T.idx('cura')); P.hp = 100; S.cds = [0, 0, 0]; P.mp = P.mmax; g.P.tgt = es[0]; const u = g.SK.useSkill(0); r.cajado = { rodBlocked: M.rodBlocked(), ok: u, healed: P.hp > 100, rodRcd: Object.keys(S.rcd).length };
      T.melee(); P.hp = 100; S.cds = [0, 0, 0]; P.mp = P.mmax; r.melee = { rodBlocked: M.rodBlocked(), healed: (g.SK.useSkill(1), P.hp > 100) };
      // trocar de arma com efeitos ativos: nada duplica, nada some; recargas continuam
      T.gun('Rod de Gelo'); T.reset(); T.cast('escudo'); T.cast('regen'); T.cast('atk'); const before = JSON.stringify(BUF.buffList('p').map(b => b.id).sort()), rc = { ...S.rcd };
      for (let i = 0; i < 6; i++) { i % 2 ? T.gun('Rod de Gelo') : T.gun('Cajado do Aprendiz'); T.step(.2); }
      T.gun('Rod de Gelo'); r.swap = { same: JSON.stringify(BUF.buffList('p').map(b => b.id).sort()) === before, n: BUF.buffList('p').length, rcdKeep: Object.keys(rc).every(k => S.rcd[k] > 0 && S.rcd[k] <= rc[k]) };
      // botões do hotbar com o Rod: mostram as habilidades do Rod; voltam ao Cajado
      T.reset(); M.setRodSlot(0, T.idx('cura')); M.setRodSlot(1, T.idx('escudo')); M.setRodSlot(2, T.idx('atk')); T.step(.2);
      r.btnRod = [...document.querySelectorAll('.skb')].map(b => b.querySelector('em').textContent); r.expRod = [0, 1, 2].map(i => String(M.rodCost(T.idx(['cura', 'escudo', 'atk'][i]))));
      T.gun('Cajado do Aprendiz'); T.step(.2); r.btnStaff = [...document.querySelectorAll('.skb')].map(b => b.querySelector('em').textContent); r.expStaff = ['14', '22', '45'];
      T.gun('Rod de Gelo'); T.step(.2);
      // requisitos híbridos e pontos
      P.lv = 1; PR_(1); r.lock = M.rodLock(T.idx('escudo')); r.learnLocked = M.learnRod(T.idx('escudo')); P.lv = 20; PR_(20);
      function PR_(l) { T.PR.devSet('rod', l); }
      // pontos e botões
      M.respec('rod'); r.afterRespec = { rk: S.rod.rk.length, slots: S.rod.slots.slice(), pts: M.rodPoints() };
      M.learnRod(T.idx('area')); M.learnRod(T.idx('cura')); M.learnRod(T.idx('vel')); M.learnRod(T.idx('atk')); r.order = S.rod.slots.slice(); r.expOrder = [T.idx('area'), T.idx('cura'), T.idx('vel')];
      M.setRodSlot(0, T.idx('atk')); r.swapSlots = S.rod.slots.slice(); r.unlearned = M.setRodSlot(1, T.idx('debuff'));
      Object.assign(r, { ptsLeft: M.rodPoints() });
      return r; });
    chk('NENHUMA habilidade do Rod causa dano: hp de todos os inimigos inalterado após lançar as 9 + 3,5 s; 0 XP de Cajado', R.zero && R.staffXp === 0, R);
    chk('Cajado/corpo a corpo na mão: botões são do Cajado (Bola de Fogo funciona), suporte do Rod não usável', R.cajado.rodBlocked === false && R.cajado.ok === true && R.cajado.healed === false && R.cajado.rodRcd === 0 && R.melee.rodBlocked === false, [R.cajado, R.melee]);
    chk('trocar de arma 6× com efeitos ativos: nada duplica nem some; recargas do Rod continuam correndo', R.swap.same && R.swap.n === 3 && R.swap.rcdKeep, R.swap);
    chk('botões 1/2/3 viram as habilidades do Rod com o Rod e voltam ao Cajado (custo no botão)', JSON.stringify(R.btnRod) === JSON.stringify(R.expRod) && JSON.stringify(R.btnStaff) === JSON.stringify(R.expStaff), [R.btnRod, R.expRod, R.btnStaff]);
    chk('requisito híbrido: bloqueada por nível E proficiência com motivo; não aprende bloqueada', R.lock === 'Nv geral 6 · Proficiência Rod 3' && R.learnLocked === false, [R.lock, R.learnLocked]);
    chk('botões por ordem de aprendizado, trocar de botão sem duplicar, não aceita não aprendida; pontos = prof − gastos', JSON.stringify(R.order) === JSON.stringify(R.expOrder) && R.swapSlots[0] === 4 && R.swapSlots.filter(v => v === 4).length === 1 && R.unlearned === false && R.afterRespec.rk === 0 && JSON.stringify(R.afterRespec.slots) === '[-1,-1,-1]' && R.afterRespec.pts === 20 && R.ptsLeft === 16, R);
  }
  // ---------- persistência ----------
  console.log('Persistência (botões e ranks) e migração');
  {
    await page.evaluate(() => { const { T } = window; T.reset(); T.M.respec('rod'); ['area', 'cura', 'escudo', 'atk'].forEach(id => T.M.learnRod(T.idx(id))); T.M.learnRod(T.idx('cura')); T.M.setRodSlot(0, T.idx('atk')); });
    const sv = await page.evaluate(async () => { const { T } = window; (await import('/js/systems/save.js')).saveGame(); const C = await import('/js/core/chars.js'); return { rk: T.S.rod.rk.slice(), slots: T.S.rod.slots.slice(), raw: JSON.parse(localStorage.getItem(C.saveKey('t1'))).skills }; });
    chk('save: skills.sv 2 com rod { rk, slots }', sv.raw.sv === 2 && JSON.stringify(sv.raw.rod.rk) === JSON.stringify(sv.rk) && JSON.stringify(sv.raw.rod.slots) === JSON.stringify(sv.slots), sv.raw.rod);
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const a = await page.evaluate(() => { const S = window.__game.SK.S; return { rk: S.rod.rk.slice(), slots: S.rod.slots.slice() }; });
    chk('salvar → recarregar: ranks e botões do Rod iguais', JSON.stringify(a) === JSON.stringify({ rk: sv.rk, slots: sv.slots }), [a, sv]);
    const key = await page.evaluate(async () => (await import('/js/core/chars.js')).saveKey('t1'));
    const str = await page.evaluate(k => localStorage.getItem(k), key), o = JSON.parse(str);
    // blocos inválidos: botões repetidos / apontando para não aprendida / ranks em categoria sem habilidade → reinicializa só o Rod, sem tocar no resto
    for (const [nome, rod] of [['botões duplicados', { rk: o.skills.rod.rk, slots: [0, 0, 2] }], ['botão para não aprendida', { rk: o.skills.rod.rk, slots: [1, -1, -1] }], ['rank fora do limite', { rk: [9] }], ['lixo', 'x']]) {
      const c = await openSeeded(browser, port, 'mago', { [key]: JSON.stringify({ ...o, skills: { ...o.skills, rod } }) });
      const r = await c.page.evaluate(() => { const g = window.__game, S = g.SK.S; return { rk: S.rod.rk.slice(), slots: S.rod.slots.slice(), lv: g.P.lv, ranks: S.rk.slice() }; });
      chk('bloco rod inválido (' + nome + '): reinicializa sem erro e sem tocar nos ranks do Cajado/nível', c.errs.length === 0 && r.lv === o.player.lv && JSON.stringify(r.ranks) === JSON.stringify(o.skills.rk) && r.slots.every(v => v === -1 || r.rk[v] > 0) && new Set(r.slots.filter(v => v >= 0)).size === r.slots.filter(v => v >= 0).length, r);
      await c.ctx.close();
    }
    // migração de saves REAIS da V554 (Mago com e sem ranks de Rod; sem slots)
    const old = await openSeeded(browser, p554, 'mago');
    const O = await old.page.evaluate(async () => { const g = window.__game, S = g.SK.S, P = g.P, Sv = await import('/js/systems/save.js'), C = await import('/js/core/chars.js'), Sc = await import('/js/data/scaling.js');
      P.lv = 12; P.nxt = Sc.xpToNext(12); P.xp = 0; P.max += 110; P.mmax += 55; P.gold = 321; S.rk = [2, 1, 1, 0]; S.tl = { '0:0': 1 }; Sv.saveGame(); return { key: C.saveKey('t1'), str: localStorage.getItem(C.saveKey('t1')) }; });
    await old.ctx.close();
    const oo = JSON.parse(O.str);
    chk('save de origem V554: skills.sv 2, rod {rk:[]} sem botões', oo.skills.sv === 2 && JSON.stringify(oo.skills.rod) === '{"rk":[]}', oo.skills.rod);
    for (const [nome, rod] of [['sem ranks de Rod', undefined], ['com ranks de Rod (cura e escudo)', { rk: [1, 0, 2] }]]) {
      const str2 = JSON.stringify(rod ? { ...oo, skills: { ...oo.skills, rod } } : oo);
      const c = await openSeeded(browser, port, 'mago', { [O.key]: str2 });
      const r = await c.page.evaluate(async () => { const g = window.__game, S = g.SK.S, P = g.P, M = await import('/js/systems/skills.js'); return { lv: P.lv, gold: P.gold, ranks: S.rk.slice(), tl: { ...S.tl }, rk: S.rod.rk.slice(), slots: S.rod.slots.slice(), free: M.skillPoints(), pts: M.rodPoints(), prof: JSON.parse(JSON.stringify(P.prof)) }; });
      chk('migração V554 → V555 (' + nome + '): nível, ouro, ranks do Cajado, talentos, pontos livres preservados', r.lv === 12 && r.gold === 321 && JSON.stringify(r.ranks) === '[2,1,1,0]' && r.tl['0:0'] === 1 && r.free === 7, r);
      chk('  Rod: ' + (rod ? 'ranks preservados e botões derivados [0,2,-1]' : 'vazio, botões vazios') + '; pontos do Rod = proficiência − gastos', rod ? JSON.stringify(r.rk) === '[1,0,2]' && JSON.stringify(r.slots) === '[0,2,-1]' && r.pts === Math.max(0, r.prof.rod.lv - 3) : r.rk.length === 0 && JSON.stringify(r.slots) === '[-1,-1,-1]' && r.pts === r.prof.rod.lv, r);
      chk('  sem erros no console', c.errs.length === 0, c.errs.slice(0, 2));
      await c.ctx.close();
    }
  }
  // ---------- auto-combate ----------
  console.log('Auto-combate com o Rod');
  await page.evaluate(SETUP);
  {
    const R = await ev(() => { const { T } = window; const { P, S, M, BUF, g, D } = T; const r = {}; const e = T.enemy();
      T.reset(); T.M.respec('rod'); ['cura', 'escudo', 'atk'].forEach(id => M.learnRod(T.idx(id))); T.gun('Rod de Gelo');
      const near = () => { e.x = P.x + 8; e.z = P.z; e.hp = e.max = 1e9; e.dead = 0; e.stone = 0; g.P.tgt = e; };
      near(); P.hp = 300; P.mp = P.mmax; const mp0 = P.mp; for (let i = 0; i < 80; i++) { g.SK.auto(); T.step(.05); }
      r.low = { healed: P.hp > 300, casts: Object.keys(S.rcd).length };
      T.reset(); near(); P.hp = P.max; P.mp = P.mmax; for (let i = 0; i < 60; i++) { g.SK.auto(); T.step(.05); } r.buff = { atk: BUF.buffList('p').some(b => b.id === 'atk') };
      // reserva de mana: sem mana suficiente (custo + 30%) não lança
      T.reset(); near(); P.hp = 100; P.mp = P.mmax * .3 + 5; const m1 = P.mp; for (let i = 0; i < 30; i++) g.SK.auto(); r.reserve = { mp: P.mp === m1, hp: P.hp === 100 };
      // Cajado na mão: o auto usa só habilidades do Cajado (nunca do Rod)
      T.reset(); near(); P.hp = 100; T.gun('Cajado do Aprendiz'); P.mp = P.mmax; for (let i = 0; i < 30; i++) { g.SK.auto(); T.step(.05); } r.cajado = { healed: P.hp > 100, rcd: Object.keys(S.rcd).length };
      T.gun('Rod de Gelo'); T.reset(); return r; });
    chk('Rod na mão e vida baixa: o auto cura/escudo (sem loop de falha); vida cheia: buff de ataque no início da luta', R.low.healed && R.low.casts >= 1 && R.buff.atk, R);
    chk('reserva de mana respeitada (não lança sem custo + 30%); Cajado na mão: o auto não usa o Rod', R.reserve.mp && R.reserve.hp && R.cajado.healed === false && R.cajado.rcd === 0, [R.reserve, R.cajado]);
  }
  chk('sem erros de console durante tudo', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
