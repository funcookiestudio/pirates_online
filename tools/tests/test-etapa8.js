/* Etapa 8 (interface final do Mago): espaço RESERVA no painel, aba Habilidades/Rod, indicador de efeitos e hotbar com o Rod, em 3 tamanhos de tela.
   Medição por caixas (sem imagens). Uso: node test-etapa8.js <porta> */
const lib = require('./lib');
const port = process.argv[2];
let bad = 0;
const chk = (name, ok, extra) => { if (!ok) bad++; console.log('   ' + (ok ? 'ok  ' : 'FALHA') + ' ' + name + (ok && extra === undefined ? '' : ' · ' + JSON.stringify(extra))); };
const SIZES = [[1280, 720], [390, 800], [780, 360]];

(async () => {
  const browser = await lib.launch();
  for (const [w, h] of SIZES) {
    console.log('Mago ' + w + 'x' + h);
    const { ctx, page, errs } = await lib.open(browser, port, 'mago', w, h);
    const R = await page.evaluate(async () => {
      const g = window.__game, P = g.P, S = g.SK.S, W = g.WEAPONS, r = {}; const Pan = await import('/js/ui/panel.js'), M = await import('/js/systems/skills.js');
      const wi = n => W.findIndex(w => w.n === n), mk = n => ({ ty: 'wpn', q: 1, v: W[wi(n)].b, il: 1, w: wi(n), n });
      const box = el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      const hit = (a, b) => a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
      const VW = innerWidth, VH = innerHeight, inside = b => b.x >= -1 && b.y >= -1 && b.r <= VW + 1 && b.b <= VH + 1;
      P.sit = P.sitT = 0; P.lv = 20; P.mmax = 500; P.mp = 500; g.PROF.devSet('staff', 20); g.PROF.devSet('rod', 14); g.state.petOff = true;
      g.eq.gun = mk('Cajado do Aprendiz'); g.eq.res = mk('Rod de Gelo'); g.setWeapon('gun'); P.act = 'gun'; g.bag.length = 0; g.bag.push(mk('Rod de Cristal'));
      for (let i = 0; i < 9; i++) if (M.rodHas(i)) M.learnRod(i);
      // painel Personagem: espaço RESERVA
      Pan.openTab('char'); await new Promise(r => setTimeout(r, 300));
      const hands = document.getElementById('eqRes').parentElement, slots = [...hands.querySelectorAll('.sl')].map(box);
      r.slots = { n: slots.length, label: !!document.querySelector('#eqRes .sl'), inside: slots.every(b => { const pn = box(document.getElementById("pnl")); return b.x >= pn.x - 1 && b.r <= pn.r + 1; }), overlap: slots.some((a, i) => slots.some((b, j) => i < j && hit(a, b))), title: document.querySelector('#eqRes .sl').title, name: (document.querySelector('#eqRes .sl').getAttribute('title') || '').length > 0 };
      document.querySelector('#eqRes .sl').click(); await new Promise(r => setTimeout(r, 150)); r.card = (document.getElementById('itm').textContent || '').includes('Rod') || (document.getElementById('itm').textContent || '').includes('Gelo');
      // equipar pelo clique da mochila vai para a RESERVA quando ela está vazia (desequipa a reserva e equipa outra)
      g.unequip('res'); await new Promise(r => setTimeout(r, 100)); r.emptyRes = !document.querySelector('#eqRes .sl.r1, #eqRes .sl.r2, #eqRes .sl.r3') && !!document.querySelector('#eqRes .sl');
      g.equip(g.bag.findIndex(b => b.n === 'Rod de Cristal')); await new Promise(r => setTimeout(r, 150)); r.refilled = !!document.querySelector('#eqRes .sl.r1, #eqRes .sl.r2, #eqRes .sl.r3');
      // aba Habilidades > Rod
      document.getElementById('tb-skills').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('#skp [data-tree="rod"]').click(); await new Promise(r => setTimeout(r, 200));
      const sk = document.getElementById('skp'); r.skp = { ow: sk.scrollWidth <= sk.clientWidth + 1, cards: sk.querySelectorAll('[data-rl]').length, slotsBtn: sk.querySelectorAll('[data-rs]').length };
      Pan.closePanel(); await new Promise(r => setTimeout(r, 150));
      // hotbar com o Rod + indicador de efeitos
      g.BUF.clearBuffs(); g.BUF.addBuff('p', 'shield', { dur: 30, amt: 120 }); g.BUF.addBuff('p', 'regen', { dur: 30, pow: .05 }); g.BUF.addBuff('p', 'atk', { dur: 30, pow: .2 }); g.BUF.addBuff('p', 'dr', { dur: 30, pow: .2 }); P.slow = 5;
      for (let i = 0; i < 6; i++) { g.SK.update(.1); } for (let i = 0; i < 50 && !(document.getElementById('rodfx') && document.getElementById('rodfx').style.display !== 'none'); i++) await new Promise(r => setTimeout(r, 100));
      const fx = document.getElementById('rodfx'); r.fx = fx && fx.style.display !== 'none' ? { txt: fx.textContent, b: box(fx) } : null;
      const skb = [...document.querySelectorAll('.skb')].map(box); r.skb = { n: skb.length, inside: skb.every(inside), overlap: skb.some((a, i) => skb.some((b, j) => i < j && hit(a, b))) };
      const ids = ['st', 'sk', 'gwl', 'gwr', 's1', 's2', 's3', 's4', 's5', 'sr', 'sa', 'pb', 'phpb', 'hpb'], hud = ids.map(id => document.getElementById(id)).filter(Boolean).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== 'none'; }).map(e => ({ id: e.id, b: box(e) }));
      r.fxOver = r.fx ? hud.filter(x => hit(r.fx.b, x.b)).map(x => x.id) : null; r.fxInside = r.fx ? inside(r.fx.b) : null;
      return r; });
    chk('painel: espaço RESERVA ao lado de FOGO, dentro da tela, sem sobrepor os outros espaços', R.slots.n === 4 && R.slots.label && R.slots.inside && !R.slots.overlap, R.slots);
    chk('painel: clicar na reserva abre o cartão do item; desequipar/equipar atualiza o espaço', R.card && R.emptyRes && R.refilled, [R.card, R.emptyRes, R.refilled]);
    chk('Habilidades > Rod: sem rolagem horizontal; habilidades com botões Aprender/Botão 1-3', R.skp.ow && R.skp.cards === 10 && R.skp.slotsBtn === 30, R.skp);
    chk('hotbar com o Rod: 3 botões dentro da tela e sem sobreposição', R.skb.n === 3 && R.skb.inside && !R.skb.overlap, R.skb);
    chk('indicador de efeitos (escudo, cura, +dano, −dano, lento): visível, dentro da tela e sem cobrir a HUD', !!R.fx && /Escudo/.test(R.fx.txt) && /Lento/.test(R.fx.txt) && R.fxInside && R.fxOver.length === 0, R.fx ? { txt: R.fx.txt.slice(0, 80), inside: R.fxInside, over: R.fxOver } : null);
    console.log('   errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'nenhum')); if (errs.length) bad++;
    await ctx.close();
  }
  for (const k of ['guerreiro', 'cacador', 'ladino', 'none']) {
    const { ctx, page } = await lib.open(browser, port, k, 1280, 720);
    const r = await page.evaluate(async () => { const Pan = await import('/js/ui/panel.js'); Pan.openTab('char'); await new Promise(r => setTimeout(r, 300)); return { res: !!document.getElementById('eqRes'), slots: document.querySelectorAll('.hands .sl').length, fx: !!document.getElementById('rodfx') }; });
    chk(k + ': painel sem espaço RESERVA (3 espaços) e sem indicador de efeitos', !r.res && r.slots === 3 && !r.fx, r);
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? 'RESULTADO: ' + bad + ' FALHA(S)' : 'RESULTADO: tudo ok');
  process.exit(bad ? 1 : 0);
})();
