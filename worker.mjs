/* Chicken Fight · servidor da TV (Cloudflare Workers + Durable Objects)
   Worker : rotas /api/tv, /api/insc, /api/cancel, /api/minhas, /api/replay e /ws
   Canal  : a emissora. Uma só instância: grade de lutas com hora marcada (uma a cada 15 min), fila de
            inscrições, pareamento, apostas por jogador, luta sorteada aqui (sim.mjs), resultado e histórico.
            Roda por alarme e também se atualiza sozinha quando acorda (lutas vencidas são liquidadas na hora).
   Wallet : carteira por token (reservada; a TV ainda não usa) */
import { cleanStats, runFight, calcOdds } from './sim.mjs';

const SLOT_MS = 15 * 60000, AHEAD = 6, LOCK_MS = 120000, KEEP = 12, MAX_PEND = 4, MAX_HIST = 20, MAX_Q = 200;
const BET_MIN = 5, BET_MAX = 5000, MAX_OPEN = 12, MAX_BETS = 400, MAX_PB = 40;
/* favorito quase certo: a odd mínima paga mais do que a chance justifica, então não se aceita aposta nesse lado */
const BET_MIN_ODDS = 1.1;

/* mesmas lutas do site de inscrição; "opp" é o galo da casa quando ninguém mais se inscreve */
const EVENTS = {
  pinto:    { title: 'Copa Pinto de Ouro', fee: 10, prize: 12,  spots: 12, opp: { name: 'Trovão',    pal: 0, atk: 10.3, def: 4.8, spd: 6.3, luck: .08, hp: 94 } },
  terreiro: { title: 'Rinha do Terreiro',  fee: 20, prize: 40,  spots: 8, opp: { name: 'Capitão',   pal: 1, atk: 11.5, def: 5.5, spd: 7,   luck: .1,  hp: 100 } },
  cangaco:  { title: 'Desafio do Cangaço', fee: 40, prize: 95,  spots: 6, opp: { name: 'Relâmpago', pal: 4, atk: 12.3, def: 6.1, spd: 7.7, luck: .12, hp: 105 } },
  final:    { title: 'Final da Roça',      fee: 80, prize: 260, spots: 4, opp: { name: 'Sultão',    pal: 5, atk: 14.3, def: 7.4, spd: 8.8, luck: .14, hp: 114 } }
};
/* elenco das exibições (a TV nunca fica vazia) */
const HOUSE = [EVENTS.pinto.opp, EVENTS.terreiro.opp, EVENTS.cangaco.opp, EVENTS.final.opp,
  { name: 'Faísca',   pal: 2, atk: 11,   def: 5,   spd: 7.4, luck: .1, hp: 98 },
  { name: 'Valentão', pal: 3, atk: 11.8, def: 5.8, spd: 6.8, luck: .1, hp: 102 }];

const cors = () => ({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const clean = (s, n) => String(s || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, n);
const nickOf = s => clean(s, 14) || 'Anônimo';
const nameOf = s => clean(s, 16) || 'Galo';
const okToken = t => typeof t === 'string' && t.length >= 20 && t.length <= 80;
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
const hexColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff ? v : 0x888888;
const cleanPal = p => { p = p || {}; const o = {}; for (const k of ['body', 'dark', 'gold', 'wing', 't1', 't2', 't3', 'hud']) o[k] = hexColor(p[k]); if (p.thin) { o.thin = p.thin === 2 ? 2 : true; o.skin = hexColor(p.skin); } if (p.mustache) o.mustache = true; return o; };
const pub = s => ({ nick: s.nick, name: s.name, pal: s.pal, st: s.st, bot: !!s.bot });
const mkSeat = i => ({ own: i.own, nick: i.nick, name: i.name, pal: i.pal, pid: i.pid, st: i.st, insc: i.id });
const house = (o, avoid) => {
  const pal = o.pal === avoid ? [0, 1, 2, 3, 4, 5].find(p => p !== avoid && p !== o.pal) : o.pal;
  return { bot: 1, nick: 'Galo da casa', name: o.name, pal, pid: pal, st: cleanStats(o) };
};

const originOk = (req, env) => {
  const allowed = (env.ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean), o = req.headers.get('Origin');
  return !(allowed.length && o && !allowed.includes(o));
};

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
    const canal = () => env.CANAL.get(env.CANAL.idFromName('tv'));
    if (u.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('use websocket', { status: 426 });
      if (!originOk(req, env)) return new Response('origem não permitida', { status: 403 });
      return canal().fetch(req);
    }
    if (u.pathname.startsWith('/api/')) {
      if (req.method === 'POST' && !originOk(req, env)) return new Response(JSON.stringify({ ok: false, error: 'origem não permitida' }), { status: 403, headers: { 'content-type': 'application/json', ...cors() } });
      const r = await canal().fetch(req);
      return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json', ...cors() } });
    }
    if (env.ASSETS) return env.ASSETS.fetch(req); // o jogo (pasta public/)
    return new Response('Chicken Fight TV', { headers: cors() });
  }
};

/* ---------- carteira (reservada) ---------- */
export class Wallet {
  constructor(state) { this.s = state.storage; }
  async fetch(req) {
    const b = await req.json().catch(() => ({}));
    let c = await this.s.get('c'); if (c == null) c = 100;
    if (b.op === 'add') {
      const a = Math.round(Number(b.amt) || 0);
      if (c + a < 0) return json({ ok: false, coins: c });
      c += a;
    } else if (c < 10) c = 30;
    await this.s.put('c', c);
    return json({ ok: true, coins: c });
  }
}

/* ---------- a emissora ----------
   S.sched : grade de lutas { id (= hora/15min), t (início, ms), ev, seats[2], odds, seed, nb (apostas), on (rolando) }
             sempre com AHEAD lutas à frente; as odds ficam fixas na criação e só mudam enquanto ninguém apostou
   S.q     : inscrições esperando vaga na grade (ordem de chegada)
   b:<luta>: apostas da luta [{ own, id }]      p:<dono>: apostas de cada jogador (só guardamos o hash do token)
   u:<dono>: histórico de inscrições de cada jogador
   A luta de cada horário é sorteada por semente; ninguém precisa estar conectado para valer a aposta. */
export class Canal {
  constructor(state, env) {
    this.st = state; this.env = env; this.lastPush = 0; this.memo = new Map();
    this.S = { sched: [], qn: 0, bn: 0, q: [], recent: [], rank: {} };
    state.blockConcurrencyWhile(async () => {
      const s = await state.storage.get('S');
      if (s) { this.S = { ...this.S, ...s }; for (const k of ['phase', 'cur', 'deadline', 'fid']) delete this.S[k]; }
    });
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  save() { return this.st.storage.put('S', this.S); }
  viewers(ex) { return this.st.getWebSockets().filter(w => w !== ex && w.readyState === 1).length; }
  sendTo(ws, o) { try { ws.send(JSON.stringify(o)); } catch (_) {} }
  running() { return this.S.sched.find(x => x.on) || null; }
  matters(c) { return (c.nb || 0) > 0 || c.seats.some(s => s.insc); }

  async fetch(req) {
    const u = new URL(req.url), p = u.pathname;
    if (p === '/ws') return this.connect(u);
    await this.tick();
    const r = await this.route(req, u, p);
    await this.arm();
    return r;
  }
  async route(req, u, p) {
    const post = req.method === 'POST';
    if (p === '/api/tv') return json(this.view());
    if (p === '/api/minhas') return this.mine(u.searchParams.get('token'));
    if (p === '/api/apostas') return this.bets(u.searchParams.get('token'));
    if (p === '/api/replay') return this.replay(Number(u.searchParams.get('id')));
    if (p === '/api/insc' && post) return this.insc(await req.json().catch(() => ({})));
    if (p === '/api/cancel' && post) return this.cancel(await req.json().catch(() => ({})));
    if (p === '/api/aposta' && post) return this.bet(await req.json().catch(() => ({})));
    return json({ error: 'rota' }, 404);
  }

  /* ----- o que o público vê ----- */
  top() { return Object.values(this.S.rank).sort((a, b) => b.w - a.w || a.l - b.l).slice(0, 5).map(({ nick, w, l }) => ({ nick, w, l })); }
  card(c) { return { id: c.id, t: c.t, ev: c.ev, title: c.ev ? EVENTS[c.ev].title : 'Exibição do Terreiro', odds: c.odds, seats: c.seats.map(pub), nb: c.nb || 0 }; }
  view() {
    const S = this.S, queue = {}, run = this.running();
    for (const k in EVENTS) queue[k] = 0;
    for (const i of S.q) queue[i.ev]++;
    return {
      now: Date.now(), live: run ? this.card(run) : null,
      sched: S.sched.filter(x => !x.on).sort((a, b) => a.t - b.t).map(c => this.card(c)),
      viewers: this.viewers(), total: S.q.length, queue,
      recent: S.recent.slice(0, 8).map(r => ({ id: r.id, title: r.title, a: r.seats[0].name, b: r.seats[1].name, w: r.win })),
      top: this.top()
    };
  }
  seatOf(ws) {
    const c = this.running(); if (!c) return -1;
    let a; try { a = ws.deserializeAttachment(); } catch (_) {}
    return a && a.own ? c.seats.findIndex(s => s.own === a.own) : -1;
  }
  runOf(c) {
    let m = this.memo.get(c.id);
    if (!m) { if (this.memo.size > 8) this.memo.clear(); m = runFight(c.seed, c.seats[0].st, c.seats[1].st); this.memo.set(c.id, m); }
    return m;
  }
  stMsg(ws) { return { t: 'st', ...this.view(), you: this.seatOf(ws) }; }
  fightMsg(ws, late) {
    const c = this.running(), run = this.runOf(c);
    return { t: 'fight', id: c.id, title: this.card(c).title, late: !!late, odds: c.odds, win: run.win, sc: run.sc, g: c.seats.map(pub), you: this.seatOf(ws) };
  }
  async push(force) {
    const now = Date.now();
    if (!force && now - this.lastPush < 3000) return;
    this.lastPush = now;
    for (const w of this.st.getWebSockets()) this.sendTo(w, this.stMsg(w));
  }

  /* ----- conexão da TV (WebSocket com hibernação) ----- */
  async connect(u) {
    const token = u.searchParams.get('token') || '';
    const own = okToken(token) ? await sha(token) : '';
    await this.tick();
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.st.acceptWebSocket(server);
    server.serializeAttachment({ own });
    this.sendTo(server, this.stMsg(server));
    if (this.running()) this.sendTo(server, this.fightMsg(server, true));
    await this.push();
    await this.arm();
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage() {}
  async webSocketClose(ws) { try { ws.close(); } catch (_) {} await this.push(); await this.arm(); }
  async webSocketError(ws) { await this.webSocketClose(ws); }

  /* ----- inscrições ----- */
  async userAdd(own, e) {
    const k = 'u:' + own, l = (await this.st.storage.get(k)) || [];
    l.push(e); if (l.length > MAX_HIST) l.splice(0, l.length - MAX_HIST);
    await this.st.storage.put(k, l);
  }
  async userPatch(own, id, patch) {
    const k = 'u:' + own, l = (await this.st.storage.get(k)) || [], e = l.find(x => x.id === id);
    if (e) { Object.assign(e, patch); await this.st.storage.put(k, l); }
  }
  onAir(id) { const c = this.running(); return !!(c && c.seats.some(s => s.insc === id)); }
  slotOf(id) { return this.S.sched.find(x => x.seats.some(s => s.insc === id)) || null; }
  async tag(c) { for (let i = 0; i < 2; i++) { const s = c.seats[i]; if (s.insc) await this.userPatch(s.own, s.insc, { fid: c.id, opp: c.seats[1 - i].name }); } }
  free(c) { return !c.on && !c.nb && c.t - Date.now() > LOCK_MS; }

  async insc(b) {
    const S = this.S, ev = EVENTS[b.ev];
    if (!okToken(b.token)) return json({ ok: false, error: 'Identificação inválida.' }, 400);
    if (!ev) return json({ ok: false, error: 'Luta desconhecida.' }, 400);
    const own = await sha(b.token);
    const pend = x => x.own === own && x.ev === b.ev;
    if (S.q.length >= MAX_Q || S.q.filter(i => i.ev === b.ev).length >= ev.spots) return json({ ok: false, error: 'Vagas esgotadas nesta luta. Tente na próxima rodada.' }, 409);
    if (S.q.some(pend) || S.sched.some(x => x.ev === b.ev && x.seats.some(s => s.own === own && s.insc))) return json({ ok: false, error: 'Você já está inscrito nesta luta.' }, 409);
    if (S.q.filter(i => i.own === own).length + S.sched.filter(x => x.seats.some(s => s.own === own && s.insc)).length >= MAX_PEND) return json({ ok: false, error: 'Você já tem inscrições demais na fila.' }, 409);
    const g = b.galo || {}, id = ++S.qn;
    const rec = { id, ev: b.ev, own, nick: nickOf(b.owner), name: nameOf(g.name), pal: cleanPal(g.pal), pid: Number.isInteger(g.pid) && g.pid >= 0 && g.pid <= 9 ? g.pid : -1, st: cleanStats(g), t: Date.now() };
    S.q.push(rec);
    await this.userAdd(own, { id, ev: b.ev, name: rec.name, fee: ev.fee, prize: ev.prize, st: 'ag', t: rec.t });
    await this.place(); await this.save(); await this.push(true);
    return json({ ok: true, id, fee: ev.fee, prize: ev.prize });
  }
  /* encaixa quem está na fila numa luta futura que ainda não recebeu apostas */
  async place() {
    const S = this.S;
    for (const r of [...S.q]) {
      let c = S.sched.find(x => this.free(x) && x.ev === r.ev && x.seats.some(z => z.bot) && x.seats.some(z => !z.bot && z.own !== r.own));
      if (c) c.seats[c.seats.findIndex(z => z.bot)] = mkSeat(r);
      else if ((c = S.sched.find(x => this.free(x) && !x.ev))) {
        c.ev = r.ev; const l = [mkSeat(r), house(EVENTS[r.ev].opp, r.pid)]; if (Math.random() < .5) l.reverse(); c.seats = l;
      }
      if (!c) continue;
      c.odds = calcOdds(c.seats[0].st, c.seats[1].st);
      S.q = S.q.filter(x => x !== r);
      await this.tag(c);
    }
  }
  async cancel(b) {
    const S = this.S, id = Number(b.id);
    if (!okToken(b.token)) return json({ ok: false, error: 'Identificação inválida.' }, 400);
    const own = await sha(b.token), i = S.q.findIndex(x => x.id === id && x.own === own);
    if (i >= 0) {
      const ev = S.q[i].ev; S.q.splice(i, 1); await this.save();
      await this.userPatch(own, id, { st: 'x' }); await this.push(true);
      return json({ ok: true, back: Math.floor(EVENTS[ev].fee / 2) });
    }
    const c = S.sched.find(x => x.seats.some(s => s.insc === id && s.own === own));
    if (!c) return json({ ok: false, error: 'Inscrição não encontrada.' }, 409);
    if (!this.free(c)) return json({ ok: false, error: 'Seu galo já foi escalado e não pode mais sair.' }, 409);
    const k = c.seats.findIndex(s => s.insc === id), other = c.seats[1 - k], ev = c.ev;
    let h; do { h = HOUSE[Math.floor(Math.random() * HOUSE.length)]; } while (h.name === other.name);
    c.seats[k] = house(h, other.pid); if (other.bot) c.ev = null;
    c.odds = calcOdds(c.seats[0].st, c.seats[1].st);
    await this.userPatch(own, id, { st: 'x' }); await this.tag(c); await this.save(); await this.push(true);
    return json({ ok: true, back: Math.floor(EVENTS[ev].fee / 2) });
  }
  async mine(token) {
    if (!okToken(token)) return json({ ok: false, error: 'token' }, 400);
    const own = await sha(token), l = (await this.st.storage.get('u:' + own)) || [];
    return json({ ok: true, list: l.map(e => ({ ...e, air: e.st === 'ag' && this.onAir(e.id), pos: e.st === 'ag' ? this.S.q.findIndex(x => x.id === e.id) + 1 : 0, when: e.st === 'ag' ? (this.slotOf(e.id) || {}).t || 0 : 0 })) });
  }
  replay(id) {
    const r = this.S.recent.find(x => x.id === id);
    if (!r) return json({ ok: false, error: 'Replay não está mais guardado.' }, 404);
    const run = runFight(r.seed, r.seats[0].st, r.seats[1].st);
    return json({ ok: true, id, win: run.win, sc: run.sc, g: r.seats, odds: calcOdds(r.seats[0].st, r.seats[1].st) });
  }

  /* ----- apostas ----- */
  async bet(b) {
    const S = this.S;
    if (!okToken(b.token)) return json({ ok: false, error: 'Identificação inválida.' }, 400);
    const c = S.sched.find(x => x.id === Number(b.fid)), side = b.side === 0 || b.side === 1 ? b.side : -1, stake = Math.floor(Number(b.stake));
    if (!c || c.on || c.t <= Date.now() + 1000) return json({ ok: false, error: 'As apostas desta luta já fecharam.' }, 409);
    if (side < 0 || !(stake >= BET_MIN && stake <= BET_MAX)) return json({ ok: false, error: 'Aposta inválida.' }, 400);
    if (c.odds[side] < BET_MIN_ODDS) return json({ ok: false, error: 'Esse galo é favorito demais: não há aposta nele nesta luta. Aposte no outro lado ou escolha outra luta.' }, 409);
    const own = await sha(b.token), k = 'p:' + own, l = (await this.st.storage.get(k)) || [];
    if (l.some(x => x.fid === c.id)) return json({ ok: false, error: 'Você já apostou nesta luta.' }, 409);
    if (l.filter(x => x.st === 'o').length >= MAX_OPEN) return json({ ok: false, error: 'Você já tem apostas demais em aberto.' }, 409);
    if ((c.nb || 0) >= MAX_BETS) return json({ ok: false, error: 'Esta luta já recebeu o máximo de apostas.' }, 409);
    const id = ++S.bn, bl = (await this.st.storage.get('b:' + c.id)) || [];
    bl.push({ own, id }); c.nb = bl.length;
    l.push({ id, fid: c.id, side, stake, odds: c.odds[side], st: 'o', a: c.seats[0].name, b: c.seats[1].name, t0: c.t });
    while (l.length > MAX_PB) { const j = l.findIndex(x => x.st !== 'o'); if (j < 0) break; l.splice(j, 1); }
    await this.st.storage.put('b:' + c.id, bl); await this.st.storage.put(k, l); await this.save(); await this.push(true);
    return json({ ok: true, id, odds: c.odds[side], t: c.t });
  }
  async bets(token) {
    if (!okToken(token)) return json({ ok: false, error: 'token' }, 400);
    return json({ ok: true, list: (await this.st.storage.get('p:' + await sha(token))) || [] });
  }

  /* ----- programação ----- */
  pairUp() {
    const S = this.S, q = S.q;
    let pr = null;
    outer: for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) if (q[i].ev === q[j].ev && q[i].own !== q[j].own) { pr = [q[i], q[j]]; break outer; }
    if (pr) { S.q = q.filter(x => x !== pr[0] && x !== pr[1]); return { ev: pr[0].ev, list: [mkSeat(pr[0]), mkSeat(pr[1])] }; }
    if (q.length) {
      const a = q.shift(), l = [mkSeat(a), house(EVENTS[a.ev].opp, a.pid)];
      if (Math.random() < .5) l.reverse();
      return { ev: a.ev, list: l };
    }
    const i = Math.floor(Math.random() * HOUSE.length); let j = Math.floor(Math.random() * (HOUSE.length - 1)); if (j >= i) j++;
    return { ev: null, list: [house(HOUSE[i]), house(HOUSE[j])] };
  }
  /* mantém AHEAD lutas à frente, sempre em horários cheios de 15 em 15 minutos */
  async fill() {
    const S = this.S, now = Date.now();
    let n = S.sched.filter(x => x.t > now).length; if (n >= AHEAD) return false;
    let t = S.sched.reduce((m, x) => Math.max(m, x.t), 0) + SLOT_MS;
    if (t <= now) t = Math.floor(now / SLOT_MS) * SLOT_MS + SLOT_MS;
    for (; n < AHEAD; n++, t += SLOT_MS) {
      const p = this.pairUp(), c = { id: t / SLOT_MS, t, ev: p.ev, seats: p.list, odds: calcOdds(p.list[0].st, p.list[1].st), seed: crypto.getRandomValues(new Uint32Array(1))[0], nb: 0 };
      S.sched.push(c); await this.tag(c);
    }
    return true;
  }
  async settle(c) {
    const S = this.S, win = this.runOf(c).win, was = this.matters(c) || c.on;
    for (let i = 0; i < 2; i++) {
      const s = c.seats[i]; if (!s.insc) continue;
      await this.userPatch(s.own, s.insc, { st: i === win ? 'v' : 'd' });
      const r = S.rank[s.own] || (S.rank[s.own] = { nick: s.nick, w: 0, l: 0 });
      r.nick = s.nick; if (i === win) r.w++; else r.l++;
    }
    const keys = Object.keys(S.rank);
    if (keys.length > 200) { keys.sort((a, b) => S.rank[b].w - S.rank[a].w); for (const k of keys.slice(100)) delete S.rank[k]; }
    const bl = (await this.st.storage.get('b:' + c.id)) || [], by = {};
    for (const x of bl) (by[x.own] || (by[x.own] = [])).push(x.id);
    for (const own in by) {
      const k = 'p:' + own, l = (await this.st.storage.get(k)) || [];
      for (const e of l) if (by[own].includes(e.id)) e.st = e.side === win ? 'v' : 'd';
      await this.st.storage.put(k, l);
    }
    if (bl.length) await this.st.storage.delete('b:' + c.id);
    if (was) {
      S.recent.unshift({ id: c.id, title: this.card(c).title, seed: c.seed, seats: c.seats.map(pub), win, t: c.t });
      if (S.recent.length > KEEP) S.recent.length = KEEP;
      for (const w of this.st.getWebSockets()) this.sendTo(w, { t: 'res', id: c.id, win });
    }
    S.sched = S.sched.filter(x => x.id !== c.id);
  }
  /* põe a grade em dia: começa a luta da hora, liquida as que já acabaram (mesmo que ninguém estivesse conectado) */
  async tick() {
    const S = this.S, now = Date.now(); let ch = false;
    S.sched.sort((a, b) => a.t - b.t);
    for (const c of [...S.sched]) {
      if (c.t > now) break;
      const end = c.t + (this.runOf(c).dur + 12) * 1000;
      if (now < end) {
        if (!c.on) { c.on = 1; ch = true; for (const w of this.st.getWebSockets()) this.sendTo(w, this.fightMsg(w, now - c.t > 4000)); }
        break;
      }
      await this.settle(c); ch = true;
    }
    await this.place();
    if (await this.fill()) ch = true;
    if (ch) { await this.save(); await this.push(true); }
  }
  /* o alarme só fica armado enquanto algo importa: luta rolando, aposta, inscrito ou plateia */
  async arm() {
    const S = this.S, now = Date.now(), run = this.running(); let at = 0;
    if (run) at = run.t + (this.runOf(run).dur + 12) * 1000;
    else {
      const v = this.viewers() > 0, nx = S.sched.filter(x => x.t > now && (v || this.matters(x))).sort((a, b) => a.t - b.t)[0];
      if (nx) at = nx.t;
    }
    if (at) await this.st.storage.setAlarm(Math.max(at, now + 300)); else await this.st.storage.deleteAlarm();
  }
  async alarm() { await this.tick(); await this.arm(); }
}
