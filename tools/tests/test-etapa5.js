/* Etapa 5 (árvores independentes Cajado/Rod): desbloqueio híbrido, Rod ativo bloqueia habilidades do Cajado, pools, Redefinir por árvore,
   migração de saves de habilidades (V553 e V552 reais), outras classes idênticas, painel.
   Uso: node test-etapa5.js <porta-atual> <porta-V553> <porta-V552> */
const lib = require('./lib');
const port = process.argv[2], p553 = process.argv[3] || '8773', p552 = process.argv[4] || '8772';
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
const SNAP = `(async () => { const g = __game, P = g.P, S = g.SK.S, M = await import('/js/systems/skills.js'); const nm = it => it && it.n;
  return { lv: P.lv, gold: P.gold, max: P.max, mmax: P.mmax, bag: g.bag.map(nm), gun: nm(g.eq.gun), rk: S.on ? S.rk.slice() : null, tl: S.on ? { ...S.tl } : null, tb: S.on ? { ...S.tb } : null, free: S.on ? M.skillPoints() : null, tfree: S.on ? M.talentPoints() : null, rod: S.on && S.rod ? S.rod.rk.slice() : undefined, prof: P.prof ? JSON.parse(JSON.stringify(P.prof)) : null }; })()`;

(async () => {
  const browser = await lib.launch();
  // ===== A) Mago novo (código atual): requisitos híbridos, Rod ativo, pools, Redefinir, troca de armas =====
  console.log('Mago novo (código atual)');
  {
    const { ctx, page, errs } = await openSeeded(browser, port, 'mago');
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, S = g.SK.S, PR = g.PROF, W = g.WEAPONS, res = {};
      const M = await import('/js/systems/skills.js'), D = await import('/js/data/skills.js'), Sc = await import('/js/data/scaling.js'), Cb = await import('/js/systems/combat.js'), Pan = await import('/js/ui/panel.js'), Rs = await import('/js/systems/reset.js');
      const wi = n => W.findIndex(w => w.n === n), mk = (n, il = 1) => ({ ty: 'wpn', q: 1, v: Math.round(W[wi(n)].b * (1 + (il - 1) * .2)), il, w: wi(n), n });
      const rnd = Math.random, with_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
      P.sit = P.sitT = 0; P.dead = false; P.mmax = 400; P.mp = 400;
      const setGun = n => { g.eq.gun = mk(n, 5); g.setWeapon('gun'); P.act = 'gun'; P.swap = null; };
      const setMelee = () => { g.eq.wpn = mk('Cutelo Pirata'); g.setWeapon('wpn'); P.act = 'wpn'; P.swap = null; };
      const step = s => { for (let t = 0; t < s; t += .033) g.SK.update(.033); };
      const e = g.enemies.find(x => !x.dead);
      const place = () => { e.x = P.x + 6; e.z = P.z; e.hp = e.max = 1e9; e.lv = P.lv; e.stone = 0; e.dead = 0; P.tgt = e; };
      res.trees = M.treeList(); res.reqs = D.STAFF_REQ; res.rodNodes = D.ROD_TREE.map(n => n.n);
      res.start = { lv: P.lv, prof: JSON.parse(JSON.stringify(P.prof)), locks: [0, 1, 2].map(M.skillLock) };
      // os 4 casos de cada habilidade bloqueada: só nível, só proficiência, ambos, nenhum
      const cases = {};
      for (const i of [1, 2]) {
        const r = D.STAFF_REQ[i], c = {};
        P.lv = r.lv - 1; PR.devSet('staff', r.prof - 1); c.nenhum = M.skillLock(i);
        P.lv = r.lv; PR.devSet('staff', r.prof - 1); c.soNivel = M.skillLock(i);
        P.lv = r.lv - 1; PR.devSet('staff', r.prof); c.soProf = M.skillLock(i);
        P.lv = r.lv; PR.devSet('staff', r.prof); c.ambos = M.skillLock(i);
        cases[i] = c;
      }
      res.cases = cases;
      // uso real: bloqueada não gasta mana nem recarga; liberada gasta
      P.lv = 6; PR.devSet('staff', 2); setGun('Cajado do Aprendiz'); place(); S.cds = [0, 0, 0]; P.mp = 400;
      const u1 = g.SK.useSkill(1); res.blockedUse = { ok: u1, mp: P.mp, cds: S.cds.slice() };
      PR.devSet('staff', 3); P.mp = 400; const u2 = g.SK.useSkill(1); res.unlockedUse = { ok: u2, spent: 400 - P.mp, cd: S.cds[1] > 0 };
      step(2);
      // Rod ativo: bloqueia as 3 (sem mana, sem recarga); Cajado e corpo a corpo permitem
      P.lv = 20; PR.devSet('staff', 20); S.cds = [0, 0, 0]; P.mp = 400; step(.1);
      g.bag.length = 0; g.bag.push(mk('Rod de Gelo', 12)); g.eq.gun = mk('Cajado do Aprendiz', 5); g.setWeapon('gun'); P.act = 'gun'; g.equip(0, 'gun');
      res.gun = g.eq.gun.n; res.act = P.act;
      const rr = []; for (let i = 0; i < 3; i++) { place(); S.cds = [0, 0, 0]; P.mp = 400; const m0 = P.mp, ok = g.SK.useSkill(i); rr.push({ ok, mp: m0 - P.mp, cd: S.cds[i] }); }
      res.rodUse = rr; step(.2); res.btn = [...document.querySelectorAll('.skb')].map(b => ({ cls: b.className, op: b.style.opacity })); res.blocked = M.rodBlocked();
      const au = (() => { place(); S.cds = [0, 0, 0]; P.mp = 400; for (let i = 0; i < 60; i++) g.SK.auto(); return { mp: P.mp, cds: S.cds.slice() }; })(); res.auto = au;
      setMelee(); res.meleeBlocked = M.rodBlocked(); place(); S.cds = [0, 0, 0]; P.mp = 400; { const ok = g.SK.useSkill(0); res.meleeUse = ok; }
      setGun('Cajado do Aprendiz'); place(); S.cds = [0, 0, 0]; P.mp = 400; { const ok = g.SK.useSkill(0); res.staffUse = ok; }
      // troca Cajado↔Rod várias vezes: ranks, talentos e estado íntegros
      step(3); S.rk = [2, 1, 1, 0]; S.tl = { '0:0': 1, '1:0': 1 }; const sc0 = g.scene.children.length, snap0 = JSON.stringify({ rk: S.rk, tl: S.tl, tb: S.tb, max: P.max, mmax: P.mmax });
      for (let i = 0; i < 8; i++) { setGun(i % 2 ? 'Cajado do Aprendiz' : 'Rod de Gelo'); step(.2); }
      res.swapKeep = { same: JSON.stringify({ rk: S.rk, tl: S.tl, tb: S.tb, max: P.max, mmax: P.mmax }) === snap0, orbs: S.orbs.length, balls: S.balls.length, storm: !!S.storm, shield: S.shield, scene: [sc0, g.scene.children.length] };
      // pools: Cajado = fórmula antiga; Rod separado, por proficiência
      P.lv = 12; S.rk = [2, 1, 1, 0]; PR.devSet('rod', 1); res.pool0 = { staff: M.skillPoints(), exp: D.PTS.skill(12) - 4, rod: M.rodPoints() };
      PR.devSet('rod', 5); res.pool1 = { staff: M.skillPoints(), rod: M.rodPoints(), exp: D.ROD_PTS(5) }; res.learn = [M.learnSkill(0), M.rodTree().length];
      // Redefinir por árvore
      S.rk = [2, 1, 1, 0]; S.tl = { '0:0': 1, '1:0': 1 }; S.tb.hp = 10; P.max += 10;
      const m0 = P.max; M.respec('rod'); res.rsRod = { rk: S.rk.slice(), tl: { ...S.tl }, rod: S.rod.rk.slice() };
      M.respec('staff'); res.rsStaff = { rk: S.rk.slice(), tl: { ...S.tl }, tb: { ...S.tb }, maxSame: P.max === m0 };
      S.rk = [1, 1, 0, 0]; M.respec(); res.rsAll = { rk: S.rk.slice(), tl: { ...S.tl } };
      // painel: Cajado | Rod
      Pan.openTab('char'); document.getElementById('tb-skills').click(); await new Promise(r => setTimeout(r, 200));
      const sk = document.getElementById('skp'); res.uiStaff = { tabs: [...sk.querySelectorAll('[data-tree]')].map(b => b.textContent), prof: /Proficiência Cajado: Nv/.test(sk.textContent), pts: /Pontos de habilidade do Cajado/.test(sk.textContent) };
      sk.querySelector('[data-tree="rod"]').click(); await new Promise(r => setTimeout(r, 100));
      const t = sk.textContent; res.uiRod = { soon: (t.match(/Em breve · Etapa 6/g) || []).length, prof: /Proficiência Rod: Nv/.test(t), pts: /Pontos do Rod/.test(t), learn: !!sk.querySelector('#skup'), cats: ['Cura instantânea', 'Cura contínua', 'Escudos', 'Proteção', 'Buffs de ataque', 'Buffs de defesa', 'Buffs de velocidade', 'Debuffs sem dano', 'Purificação', 'Suporte em área'].every(c => t.includes(c)), req: /Nv geral \d+ · Proficiência Rod \d+/.test(t) };
      sk.querySelector('[data-tree="staff"]').click(); await new Promise(r => setTimeout(r, 100));
      // bloqueio mostra o motivo
      P.lv = 6; PR.devSet('staff', 1); document.querySelector('#skp [data-tree="staff"]').click(); await new Promise(r => setTimeout(r, 100)); document.querySelector('#skp [data-sk="c1"]').click(); await new Promise(r => setTimeout(r, 100)); res.uiReason = /requer Proficiência Cajado 3/.test(document.getElementById('skp').textContent);
      // reset do personagem limpa também a árvore do Rod
      Rs.resetPlayer(); res.reset = { rk: S.rk.slice(), rod: S.rod.rk.slice() };
      // salvar → recarregar
      P.lv = 12; S.rk = [2, 1, 1, 0]; S.tl = { '0:0': 1 }; PR.devSet('staff', 12); (await import('/js/systems/save.js')).saveGame();
      return res;
    });
    chk('Mago: duas árvores [staff, rod]; requisitos de Cajado = nível 1/6/12 + prof 1/3/5', JSON.stringify(R.trees) === '["staff","rod"]' && JSON.stringify(R.reqs) === JSON.stringify([{ lv: 1, prof: 1 }, { lv: 6, prof: 3 }, { lv: 12, prof: 5 }]), R.reqs);
    chk('Mago novo: Bola de Fogo usável desde o início; Nova e Tempestade bloqueadas por nível E proficiência (motivo correto)', R.start.locks[0] === null && R.start.locks[1] === 'Nv geral 6 · Proficiência Cajado 3' && R.start.locks[2] === 'Nv geral 12 · Proficiência Cajado 5', R.start);
    chk('4 casos (Nova): nenhum / só nível / só proficiência / ambos', R.cases[1].nenhum === 'Nv geral 6 · Proficiência Cajado 3' && R.cases[1].soNivel === 'Proficiência Cajado 3' && R.cases[1].soProf === 'Nv geral 6' && R.cases[1].ambos === null, R.cases[1]);
    chk('4 casos (Tempestade): nenhum / só nível / só proficiência / ambos', R.cases[2].nenhum === 'Nv geral 12 · Proficiência Cajado 5' && R.cases[2].soNivel === 'Proficiência Cajado 5' && R.cases[2].soProf === 'Nv geral 12' && R.cases[2].ambos === null, R.cases[2]);
    chk('uso: bloqueada não gasta mana nem recarga; liberada (ambos) gasta e recarrega', R.blockedUse.ok === false && R.blockedUse.mp === 400 && R.blockedUse.cds.every(c => c === 0) && R.unlockedUse.ok === true && R.unlockedUse.spent > 0 && R.unlockedUse.cd, [R.blockedUse, R.unlockedUse]);
    chk('Rod ativo (equipado no slot de arma de fogo e em uso): as 3 habilidades do Cajado bloqueadas, sem mana nem recarga', R.gun === 'Rod de Gelo' && R.act === 'gun' && R.blocked && R.rodUse.every(u => u.ok === false && u.mp === 0 && u.cd === 0), [R.gun, R.act, R.rodUse]);
    chk('Rod ativo: botões da hotbar esmaecidos; auto-combate não tenta usar (sem mana/recarga gastos)', R.btn.every(b => /wo/.test(b.cls) && b.op === '0.4') && R.auto.mp === 400 && R.auto.cds.every(c => c === 0), [R.btn, R.auto]);
    chk('corpo a corpo ativo e Cajado ativo: habilidades funcionam como hoje', R.meleeBlocked === false && R.meleeUse === true && R.staffUse === true, [R.meleeBlocked, R.meleeUse, R.staffUse]);
    chk('trocar Cajado↔Rod 8× mantém ranks, talentos, vida/mana e não duplica orbes/efeitos/objetos de cena', R.swapKeep.same && R.swapKeep.orbs === 3 && R.swapKeep.balls === 0 && !R.swapKeep.storm && R.swapKeep.scene[1] <= R.swapKeep.scene[0], R.swapKeep);
    chk('pool do Cajado = fórmula antiga (PTS.skill − gastos); pool do Rod separado (prof 1 → 0, prof 5 → 4); nada aprendível', R.pool0.staff === R.pool0.exp && R.pool0.rod === 0 && R.pool1.staff === R.pool0.staff && R.pool1.rod === R.pool1.exp && R.pool1.rod === 4 && R.learn[1] === 10, R.pool1);
    chk('Redefinir Rod não afeta Cajado nem talentos; Redefinir Cajado só zera os ranks (talentos/vida/mana intactos); Redefinir geral = como antes', JSON.stringify(R.rsRod.rk) === '[2,1,1,0]' && Object.keys(R.rsRod.tl).length === 2 && JSON.stringify(R.rsStaff.rk) === '[0,0,0,0]' && Object.keys(R.rsStaff.tl).length === 2 && R.rsStaff.tb.hp === 10 && R.rsStaff.maxSame && JSON.stringify(R.rsAll.rk) === '[0,0,0,0]' && Object.keys(R.rsAll.tl).length === 0, [R.rsRod, R.rsStaff, R.rsAll]);
    chk('painel do Mago: sub-abas Cajado | Rod, proficiência e pontos de cada uma', JSON.stringify(R.uiStaff.tabs) === '["Cajado","Rod"]' && R.uiStaff.prof && R.uiStaff.pts, R.uiStaff);
    chk('aba Rod: 10 categorias "Em breve · Etapa 6", requisitos, sem botão de melhorar', R.uiRod.soon === 10 && R.uiRod.cats && R.uiRod.req && R.uiRod.prof && R.uiRod.pts && !R.uiRod.learn, R.uiRod);
    chk('painel mostra o motivo do bloqueio ("requer Proficiência Cajado 3")', R.uiReason);
    chk('reset do personagem zera ranks do Cajado e do Rod', JSON.stringify(R.reset.rk) === '[0,0,0,0]' && R.reset.rod.length === 0, R.reset);
    await page.reload(); await page.waitForFunction(() => window.__game && window.__game.P, null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const b = await page.evaluate(SNAP), raw = await page.evaluate(async () => { const C = await import('/js/core/chars.js'); return JSON.parse(localStorage.getItem(C.saveKey('t1'))).skills; });
    chk('salvar → recarregar: ranks do Cajado, talentos e Rod vazio; bloco skills sv 2', JSON.stringify(b.rk) === '[2,1,1,0]' && b.tl['0:0'] === 1 && b.rod.length === 0 && raw.sv === 2 && JSON.stringify(raw.rod) === '{"rk":[]}', [b, raw]);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  // ===== B) estimativa medida: quando um Mago novo atinge a proficiência exigida =====
  console.log('Estimativa medida (Mago novo, Cajado ativo, só inimigos do próprio nível, golpe que mata)');
  {
    const { ctx, page, errs } = await openSeeded(browser, port, 'mago');
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, PR = g.PROF, W = g.WEAPONS, out = {}; const D = await import('/js/data/skills.js');
      const wi = n => W.findIndex(w => w.n === n), rnd = Math.random;
      P.sit = P.sitT = 0; g.eq.gun = { ty: 'wpn', q: 1, v: 2, il: 1, w: wi('Cajado do Aprendiz'), n: 'Cajado do Aprendiz' }; g.setWeapon('gun'); P.act = 'gun';
      const e = g.enemies.find(x => !x.dead); let n = 0, seen = {}, T = 1e6; const pn = performance.now.bind(performance);
      Math.random = () => .5; performance.now = () => T;   // relógio simulado: 6 s por abate (o teto anti-abuso de data/prof.js é por janela de tempo)
      try {
        while (P.lv < 13 && n < 5000) {
          const L = P.lv; e.lv = L; e.dead = 0; e.hp = e.max = 28 + 11 * L; e.xpv = Math.round(9 * Math.pow(L, 1.2)); e.stone = 0; e.mk = 0; e.pa = null; P.tgt = e; n++; T += 6000;
          g.hit(e, e.hp, {});
          if (!seen[P.lv]) seen[P.lv] = { prof: P.prof.staff.lv, xp: Math.round(P.prof.staff.xp), kills: n };
        }
      } finally { Math.random = rnd; performance.now = pn; }
      out.seen = seen; out.reqs = D.STAFF_REQ; return out;
    });
    const s6 = R.seen[6], s12 = R.seen[12];
    console.log('   medido: ao chegar ao nível geral 6 → proficiência ' + (s6 && s6.prof) + ' (' + (s6 && s6.kills) + ' abates); ao chegar ao 12 → proficiência ' + (s12 && s12.prof) + ' (' + (s12 && s12.kills) + ' abates)');
    chk('proficiência de Cajado ≈ exigida quando o nível geral libera (tolerância 1 nível): nv6 ≥ 2 e nv12 ≥ 4, e nunca muito acima', s6 && s12 && s6.prof >= R.reqs[1].prof - 1 && s6.prof <= R.reqs[1].prof + 1 && s12.prof >= R.reqs[2].prof - 1 && s12.prof <= R.reqs[2].prof + 1, R.seen);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  // ===== C) Saves reais (V553 e V552) =====
  console.log('Migração de habilidades (saves REAIS gerados pelo V553 e pelo V552, carregados pelo atual)');
  const SC = [
    { id: 'V553 mago nv12 (ranks [2,1,1,0], talentos, Cajado)', p: p553, k: 'mago', lv: 12, gold: 777, gun: 'Cajado de Carvalho', rk: [2, 1, 1, 0], tl: { '0:0': 1, '1:0': 1 } },
    { id: 'V553 mago nv1', p: p553, k: 'mago', lv: 1 },
    { id: 'V552 mago nv12 (save antigo, sem sv)', p: p552, k: 'mago', lv: 12, gold: 50, gun: 'Cajado do Aprendiz', rk: [1, 0, 2, 1], tl: { '2:0': 1 } },
    { id: 'V553 guerreiro nv5', p: p553, k: 'guerreiro', lv: 5, rk: [1, 0, 0, 0] },
    { id: 'V553 caçador nv8', p: p553, k: 'cacador', lv: 8, rk: [1, 1, 0, 0] },
    { id: 'V553 ladino nv6', p: p553, k: 'ladino', lv: 6, rk: [0, 1, 0, 0] },
    { id: 'V553 sem classe nv4', p: p553, k: 'none', lv: 4 },
  ];
  for (const sc of SC) {
    const old = await openSeeded(browser, sc.p, sc.k);
    const O = await old.page.evaluate(async ([sc, SNAP]) => {
      const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, C = await import('/js/core/chars.js'), Sv = await import('/js/systems/save.js'), Sc = await import('/js/data/scaling.js');
      P.lv = sc.lv; P.nxt = Sc.xpToNext(P.lv); P.xp = 0; if (sc.lv > 1) { P.max += 10 * (sc.lv - 1); P.mmax += 5 * (sc.lv - 1); } if (sc.gold != null) P.gold = sc.gold;
      if (sc.gun) { const i = W.findIndex(w => w.n === sc.gun); g.eq.gun = { ty: 'wpn', q: 1, v: W[i].b, il: 1, w: i, n: sc.gun }; g.setWeapon('gun'); }
      if (S.on && sc.rk) { S.rk = sc.rk.slice(); S.tl = { ...(sc.tl || {}) }; }
      Sv.saveGame();
      const key = C.saveKey('t1'); return { key, str: localStorage.getItem(key), snap: await eval(SNAP) };
    }, [sc, SNAP]);
    await old.ctx.close();
    console.log(' ' + sc.id);
    const o = JSON.parse(O.str);
    chk('save de origem: ' + (sc.p === p553 ? 'V553 (sv 2, skills.sv 1)' : 'V552/antigo (v:1, sem sv)'), sc.p === p553 ? (o.sv === 2 && (!o.skills || o.skills.sv === 1)) : (o.sv === undefined), { sv: o.sv, skills: o.skills && o.skills.sv });
    const nw = await openSeeded(browser, port, sc.k, { [O.key]: O.str });
    const N = await nw.page.evaluate(async ([SNAP, key]) => {
      const k = JSON.parse(localStorage.getItem('pirata-arpg:chars:v1')).list[0].k, r = { snap: await eval(SNAP), b1: localStorage.getItem(key + ':pre-sv2'), b2: localStorage.getItem(key + ':pre-sk2') };
      const Sv = await import('/js/systems/save.js'), M = await import('/js/systems/skills.js'); const raw = JSON.parse(localStorage.getItem(key));
      const m1 = Sv.migrateSave(raw, k), m2 = Sv.migrateSave(m1, k); r.idem = JSON.stringify(m1) === JSON.stringify(m2);
      r.locks = __game.SK.S.on ? [0, 1, 2].map(M.skillLock) : null;
      Sv.saveGame(); r.after = localStorage.getItem(key); return r;
    }, [SNAP, O.key]);
    const a = O.snap, b = N.snap, after = JSON.parse(N.after);
    chk('preservado: nível, ouro, mochila, equipamento, ranks, talentos, bônus de vida/mana, pontos livres', ['lv', 'gold', 'max', 'mmax', 'gun', 'free', 'tfree'].every(f => a[f] === b[f]) && JSON.stringify(a.bag) === JSON.stringify(b.bag) && JSON.stringify(a.rk) === JSON.stringify(b.rk) && JSON.stringify(a.tl) === JSON.stringify(b.tl) && JSON.stringify(a.tb) === JSON.stringify(b.tb), { a: [a.lv, a.rk, a.free], b: [b.lv, b.rk, b.free] });
    chk('migrar duas vezes = idêntico', N.idem);
    if (sc.k === 'mago') {
      chk('Mago: ranks do Cajado = ranks antigos; Rod vazio; pontos livres do Cajado iguais', JSON.stringify(b.rk) === JSON.stringify(a.rk) && b.rod.length === 0 && a.free === b.free, [a.rk, b.rk, b.rod, a.free, b.free]);
      chk('Mago: nada que ele usava ficou bloqueado (3 habilidades liberadas conforme o nível)', JSON.stringify(N.locks) === JSON.stringify(sc.lv >= 12 ? [null, null, null] : [null, 'Nv geral 6 · Proficiência Cajado 3', 'Nv geral 12 · Proficiência Cajado 5']) || sc.lv === 1, N.locks);
      chk('salvo de novo: skills.sv 2 com rk (Cajado) e rod {rk:[]}, talentos e tb iguais ao original', after.skills.sv === 2 && JSON.stringify(after.skills.rk) === JSON.stringify(o.skills.rk) && JSON.stringify(after.skills.tl) === JSON.stringify(o.skills.tl) && JSON.stringify(after.skills.tb) === JSON.stringify(o.skills.tb) && JSON.stringify(after.skills.rod) === '{"rk":[]}', after.skills);
      chk('cópia de segurança: save sem sv → pre-sv2; save V553 → pre-sk2 (idênticas ao original)', sc.p === p552 ? N.b1 === O.str : N.b2 === O.str, { b1: !!N.b1, b2: !!N.b2 });
      // bloco skills corrompido: o resto do save não é tocado
      if (sc.id.startsWith('V553 mago nv12')) {
        for (const [nome, sk] of [['rod inválido', { ...o.skills, rod: 'lixo' }], ['rod com ranks fora do limite', { ...o.skills, rod: { rk: [9, 'a', -1] } }], ['sv inválido', { ...o.skills, sv: 'x' }]]) {
          const c = await openSeeded(browser, port, 'mago', { [O.key]: JSON.stringify({ ...o, skills: sk }) });
          const Cn = await c.page.evaluate(SNAP);
          chk('bloco skills corrompido (' + nome + '): ranks do Cajado e resto intactos, Rod vazio, sem erro', JSON.stringify(Cn.rk) === JSON.stringify(a.rk) && Cn.lv === a.lv && Cn.gold === a.gold && Cn.rod.length === 0 && c.errs.length === 0, [Cn.rk, Cn.rod, c.errs.slice(0, 1)]);
          await c.ctx.close();
        }
        const c = await openSeeded(browser, port, 'mago', { [O.key]: O.str, [O.key + ':pre-sk2']: 'ORIGINAL-ANTERIOR' });
        chk('cópia pre-sk2 anterior não é sobrescrita', await c.page.evaluate(k => localStorage.getItem(k), O.key + ':pre-sk2') === 'ORIGINAL-ANTERIOR');
        await c.ctx.close();
      }
    } else {
      chk('bloco skills salvo = bloco original', JSON.stringify(after.skills) === JSON.stringify(o.skills), { a: o.skills, b: after.skills });
      chk('sem pre-sk2 nem campo prof', N.b2 === null && after.prof === undefined);
    }
    console.log('   errors: ' + (nw.errs.length ? nw.errs.slice(0, 3).join(' | ') : 'nenhum')); if (nw.errs.length) bad++;
    await nw.ctx.close();
  }
  // ===== D) Painel das outras classes idêntico ao do V553 =====
  console.log('Painel de habilidades das outras classes (idêntico ao V553)');
  for (const k of ['guerreiro', 'cacador', 'ladino', 'none']) {
    const grab = async p => { const c = await openSeeded(browser, p, k); const h = await c.page.evaluate(async () => { const Pan = await import('/js/ui/panel.js'); Pan.openTab('char'); document.getElementById('tb-skills').click(); await new Promise(r => setTimeout(r, 300)); return { html: document.getElementById('skp').innerHTML, tabs: document.querySelectorAll('#skp [data-tree]').length }; }); await c.ctx.close(); return h; };
    const A = await grab(p553), B = await grab(port);
    chk(k + ': HTML do painel de habilidades idêntico e sem sub-abas', A.html === B.html && B.tabs === 0, A.html === B.html ? null : 'diferente');
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
