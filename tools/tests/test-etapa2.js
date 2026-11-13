/* Etapa 2 (elementos, infraestrutura opt-in): para cada um dos 9 elementos confere dano, chance, duração/expiração, acúmulo, limite, resistência, chefe e golpe sem elemento.
   Uso: node test-etapa2.js <porta> [classes] */
const lib = require('./lib');
const port = process.argv[2];
const classes = (process.argv[3] || 'guerreiro,cacador,mago,ladino,none').split(',');
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };
(async () => {
  const browser = await lib.launch();
  for (const k of classes) {
    console.log(k);
    const { ctx, page, errs } = await lib.open(browser, port, k, 1280, 720);
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, M = g.ELM, EL = g.ELEMENTS, res = { cat: g.EL_IDS.length, max: g.MAX_FX, el: {} };
      P.sit = P.sitT = 0; P.dead = false;
      const e = g.enemies.find(x => !x.dead), t0 = e.t;
      const wait = async (fn, ms) => { const t = performance.now(); while (performance.now() - t < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 100)); } return fn(); };
      const rnd = Math.random, with_ = (v, f) => { Math.random = () => v; try { return f(); } finally { Math.random = rnd; } };
      const reset = () => { M.clearStatus(e); e.res = undefined; e.resEq = undefined; e.resFx = undefined; e.t = t0; e.hp = e.max = 1e9; e.lv = P.lv; e.stone = 0; e.mk = 0; e.sn = 0; e.kx = e.kz = 0; e.bl = 0; e.tn = 0; e.slow = e.root = e.bn = e.ps = 0; e.wkd = 0; e.dmg = e.dmg0; };
      e.dmg0 = e.dmg; e.x = P.x + 10; e.z = P.z; e.hx = e.x; e.hz = e.z;   // perto do jogador: inimigo longe e sem perseguir não processa os timers dele (comportamento antigo)
      const dmgOf = (d, o, v = .5) => { e.hp = 1e9; const h0 = e.hp; with_(v, () => g.hit(e, d, o)); return h0 - e.hp; };
      const field = (k) => k === 'push' ? Math.hypot(e.kx, e.kz) : k === 'root' ? e.root : k === 'shock' ? e.sn : k === 'burn' ? e.bn : k === 'poison' ? e.ps : k === 'slow' ? e.slow : k === 'mark' ? e.mk : e.wk;
      reset(); P.crit = P.cls.crit;
      res.noEl = dmgOf(100, {}); res.hasSkh = !!P.skh;
      for (const id of g.EL_IDS) {
        const E = EL[id], o = {};
        reset(); o.base = dmgOf(100, {}); reset(); o.same = dmgOf(100, { el: id, elc: 0 });
        o.apply = {};
        for (const c of E.fx) { reset(); with_(.001, () => g.hit(e, 100, { el: id, elc: 1 })); o.apply[c.k] = c.k === 'push' ? field('push') > .5 : M.hasStatus(e, c.k); }
        reset(); with_(.5, () => g.hit(e, 100, { el: id, elc: 0 })); o.none = M.statusList(e).length === 0 && e.kx === 0 && e.kz === 0;
        reset(); e.res = { [id]: .5 }; o.half = dmgOf(100, { el: id, elc: 0 });
        reset(); e.res = { [id]: .5 }; with_(.6, () => g.hit(e, 100, { el: id, elc: 1 })); o.halfChance = M.statusList(e).length === 0 && field('push') < .5;   // .6 >= chance 1 x .5: não aplica
        reset(); e.res = { [id]: 1 }; o.full = dmgOf(100, { el: id, elc: 1 }); o.fullSt = M.statusList(e).length === 0 && e.kx === 0;
        reset(); e.res = { [id]: -1 }; o.weak = dmgOf(100, { el: id, elc: 0 });
        reset(); e.resEq = { [id]: .2 }; e.resFx = { [id]: .3 }; e.res = { [id]: .1 }; o.sum = +M.resistOf(e, id).toFixed(2);
        e.res = { [id]: 5 }; o.clamp = M.resistOf(e, id);
        reset(); P.crit = 1; let mx = 0; for (let i = 0; i < 40; i++) mx = Math.max(mx, dmgOf(100, { el: id, dot: 1, elc: 1 }, rnd())); o.dotMax = mx; o.dotSt = M.statusList(e).length === 0; P.crit = P.cls.crit;
        o.boss = {};
        for (const c of E.fx) {
          reset(); e.t = Object.assign({}, t0, { boss: true }); with_(.001, () => g.hit(e, 100, { el: id, elc: 1 })); const b = field(c.k);
          reset(); with_(.001, () => g.hit(e, 100, { el: id, elc: 1 })); const nm = field(c.k);
          o.boss[c.k] = { boss: +b.toFixed(2), comum: +nm.toFixed(2), cfgBoss: c.k === 'push' ? c.bossMult * c.pow * 6 : (c.durBoss != null ? c.durBoss : c.dur), cfgComum: c.k === 'push' ? c.pow * 6 : c.dur };
        }
        e.t = t0;
        o.stack = {};
        for (const c of E.fx) {
          if (c.k === 'push') continue;
          reset(); const ap = () => M.applyStatus(e, c, 100, 1, {});
          if (c.stack === 'acumula') { for (let i = 0; i < 8; i++) ap(); o.stack[c.k] = { acumula: e.pn, max: c.max }; }
          else if (c.stack === 'renova') { ap(); const f = { burn: 'bn', slow: 'slow', mark: 'mk', weaken: 'wk' }[c.k]; e[f] = .5; ap(); o.stack[c.k] = { renova: +e[f].toFixed(2), dur: c.dur }; }
          else { ap(); const f = { root: 'root', shock: 'sn' }[c.k]; e[f] = .1; const r2 = ap(); o.stack[c.k] = { ignora: r2 === false && +e[f].toFixed(2) === .1 }; }
        }
        reset(); e.bn = e.slow = e.ps = 9; e.pn = 1; e.psd = 1; e.bnd = 1; const c0 = E.fx.find(c => c.k !== 'push');
        if (c0) { const ok = M.applyStatus(e, c0, 100, 1, {}), inSet = ['burn', 'slow', 'poison'].includes(c0.k); o.limit = { k: c0.k, ok, expect: inSet ? c0.stack !== 'ignora' : false, now: M.statusList(e).length }; }
        res.el[id] = o;
      }
      res.expire = {};
      const cfgs = { burn: { k: 'burn', dur: 1.3, pow: .15 }, slow: { k: 'slow', dur: .4 }, root: { k: 'root', dur: .4 }, shock: { k: 'shock', dur: .4 }, poison: { k: 'poison', dur: 1.3, pow: .1, stack: 'acumula', max: 5 }, mark: { k: 'mark', dur: .4, pow: .1 }, weaken: { k: 'weaken', dur: .4, pow: .15 } };
      for (const kk in cfgs) {
        reset(); M.applyStatus(e, cfgs[kk], 400, 1, {});
        const on = M.hasStatus(e, kk), dmgNow = e.dmg, hp1 = e.hp;
        const off = await wait(() => !M.hasStatus(e, kk), 20000);
        res.expire[kk] = { on, off, hpLost: hp1 - e.hp, dmgDuring: dmgNow, dmgAfter: e.dmg, dmg0: e.dmg0 };
      }
      reset();
      return res;
    });
    const near = (a, b, t = 1.01) => Math.abs(a - b) <= t;
    chk('9 elementos no catálogo, limite de efeitos 3', R.cat === 9 && R.max === 3, [R.cat, R.max]);
    chk('golpe sem elemento = ' + R.noEl + (R.hasSkh ? ' (com classe)' : ' (100 exato sem classe)'), R.hasSkh ? R.noEl >= 1 : R.noEl === 100);
    for (const id of Object.keys(R.el)) {
      const o = R.el[id], tag = id + ': ';
      chk(tag + 'dano com resist. 0 = dano sem elemento', o.same === o.base, [o.same, o.base]);
      chk(tag + 'chance 1 aplica o status', Object.values(o.apply).every(Boolean), o.apply);
      chk(tag + 'chance 0 não aplica', o.none);
      chk(tag + 'resist. 0,5 reduz o dano à metade e a chance', near(o.half, o.base / 2) && o.halfChance, [o.half, o.halfChance]);
      chk(tag + 'resist. 1 zera dano e bloqueia status', o.full === 0 && o.fullSt, [o.full, o.fullSt]);
      chk(tag + 'fraqueza -1 dobra o dano; fontes somam 0,6; limite 1', near(o.weak, o.base * 2, 2) && o.sum === .6 && o.clamp === 1, [o.weak, o.sum, o.clamp]);
      chk(tag + 'DoT elemental sem crítico (<=115) e sem reaplicar', o.dotMax <= 115 && o.dotSt, [o.dotMax, o.dotSt]);
      chk(tag + 'chefe sofre o status, duração/empurrão conforme a config', Object.values(o.boss).every(b => b.boss > 0 && b.boss <= b.comum + .001 && near(b.boss, b.cfgBoss, .15) && near(b.comum, b.cfgComum, .15)), o.boss);
      chk(tag + 'acúmulo/renovação/ignora', Object.values(o.stack).every(s => s.acumula !== undefined ? s.acumula === s.max : s.renova !== undefined ? s.renova === s.dur : s.ignora === true), o.stack);
      if (o.limit) chk(tag + 'limite de efeitos simultâneos', o.limit.ok === o.limit.expect && o.limit.now <= 4, o.limit);
    }
    for (const kk of Object.keys(R.expire)) { const x = R.expire[kk]; chk('expira no jogo: ' + kk, x.on && x.off && (kk !== 'weaken' || (x.dmgDuring < x.dmg0 && x.dmgAfter === x.dmg0)) && ((kk !== 'burn' && kk !== 'poison') || x.hpLost > 0), x); }
    console.log('   errors: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'nenhum'));
    if (errs.length) bad++;
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
