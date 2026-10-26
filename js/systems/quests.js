/* Missões de NPCs (motor genérico). Cada missão tem etapas (coletar, matar, chefe, arremessar); o estado fica em state.quests[id]:
   { s: 'on' | 'ready' | 'done', i: etapa, n: progresso, t: segundos ativa, a: segundos com o AUTO ligado }.
   Balanceamento: XP = % do xpToNext(nível mínimo) · ouro = múltiplo de goldAt(nível mínimo) (ver TIER).
   Auto ganha menos: XP e ouro caem até 40% conforme a fração do tempo com o auto ligado; com menos de 10% de auto (modo manual) há +25%.
   (A "Mão Firme" e a "Lebre" etc. entram aqui com novas definições em QUESTS.) */
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { P, levelUp } from '../entities/player.js';
import { enemies } from '../core/registry.js';
import { scene } from '../core/engine.js';
import { WEAPONS } from '../data/weapons.js';
import { xpToNext, goldAt, rollQuality } from '../data/scaling.js';
import { addItem, beltAdd } from './inventory.js';
import { spawn } from '../entities/enemies.js';
import { KIND } from '../data/enemies.js';
import { POST_DATA } from '../data/posts.js';
import { npcByShop } from '../entities/npc.js';
import { freePoint } from './steer.js';
import { log, lootText } from '../ui/notify.js';
import { saveGame } from './save.js';
import { WILD } from '../entities/wildlife.js';
import { isNight } from '../world/daynight.js';
import { hourNow } from '../core/clock.js';
import { pickWeapon } from '../entities/loot.js';
import { walkable, groundY, SEA } from '../world/terrain.js';
import { VILLAGE_R } from '../core/village-const.js';
import { person } from '../entities/character.js';
import { gait, gaitSpeed } from '../entities/gait.js';
import { npcList } from '../entities/npc.js';
import { pois } from '../world/pois.js';
import { slideTo } from '../world/terrain.js';

/** [fração do XP do nível, múltiplo do ouro] por tamanho da missão */
export const TIER = { curta: [.15, 8], media: [.25, 15], longa: [.4, 30], epica: [.6, 60] };
const wi = name => WEAPONS.findIndex(w => w.n === name);
const give = (name, ct) => { const i = wi(name); if (i >= 0) addItem({ ty: 'wpn', q: 1, wi: i, ct, il: P.lv }); };

/** Pontos das coletas (calculados de novo a cada vez: mesmos lugares ao recarregar). `i` = índice do item */
const around = (post, k, r0 = 6) => { const a = k * 1.57 + .5, r = r0 + (k % 2) * 3; return freePoint(post.x + Math.cos(a) * r, post.z + Math.sin(a) * r, .8); };
/** Ponto em terra firme a ~`r` m do centro, procurando a partir do ângulo `a0` */
const landPoint = (r, a0) => {
  for (let k = 0; k < 24; k++) for (const rr of [r, r - 10, r + 10]) {
    const a = a0 + k * .26, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (walkable(x, z) && groundY(x, z) > SEA + 1.5 && walkable(x + 3, z) && walkable(x - 3, z) && walkable(x, z + 3) && walkable(x, z - 3)) return { x, z };
  }
  return { x: 0, z: 8 };
};
const herbSpots = () => {   // clareiras onde os cervos pastam (uma por manada), das mais próximas da vila para as mais distantes
  const herds = new Map(); WILD.deer.forEach(a => { if (!herds.has(a.herd)) herds.set(a.herd, [a.hx, a.hz]); });
  return [...herds.values()].sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1])).slice(0, 3).map(([x, z]) => freePoint(x + 3, z + 2, .8));
};

const QUESTS = [
  { id: 'barris', giver: 'Zé Carrancudo', title: 'Barris do Zé', lv: 2, tier: 'media',
    say: { ask: 'Hmpf... sumiram três barris do meu melhor rum! Vi uns contrabandistas rondando o cais. Recupere os barris no posto deles e eu te pago um trago... e uns trocados.', on: 'Os barris? Ainda não, marujo. Procure perto do Posto dos Contrabandistas — procure o brilho dourado.', ready: 'Meus barris! Ahh, o cheiro do rum... Tome, você merece.' },
    stages: [{ k: 'collect', n: 4, model: 'barrel', msg: '🛢 Barril recuperado', spot: i => POST_DATA[1] && around(POST_DATA[1], i), hud: q => '🛢 Recupere os barris do Zé (' + q.n + '/4) — perto do Posto dos Contrabandistas' }],
    reward: { pot: 3 }, rewardTxt: '3 poções' },
  { id: 'javalis', giver: 'Seu Zé', title: 'Javalis na Horta', lv: 3, tier: 'curta',
    say: { ask: 'Aqueles javalis estão destruindo minha horta! Mate três deles na mata. E cuidado com o Presa-Torta, um elite que anda com eles...', on: 'A horta ainda sofre! Mate os javalis da mata e depois dê um jeito no Presa-Torta, o elite.', ready: 'Acabou com o Presa-Torta! Minha horta agradece. Leve o couro dele, é seu.' },
    stages: [
      { k: 'kill', n: 3, hud: q => '🐗 Mate javalis na mata (' + q.n + '/3)' },
      { k: 'boss', n: 1, hud: () => '⭐ Derrote o Presa-Torta, o javali elite, perto da granja' }],
    reward: { couro: 5 }, rewardTxt: '5 couros' },
  { id: 'ervas', giver: 'Ysolde Folha-Prata', title: 'Febre das Ervas', lv: 4, tier: 'media',
    say: { ask: 'A febre do mar anda forte na vila, e me faltam folhas-de-lua: só brotam à noite, nas clareiras onde os cervos pastam. Traga três e eu preparo o remédio. Cuidado para não assustar os bichos!', on: 'Folhas-de-lua só brotam à noite, nas clareiras dos cervos. Aproxime-se devagar!', ready: 'Perfeitas, ainda com orvalho! Deixe que eu preparo... Leve estas poções, e a receita fica comigo.' },
    stages: [{ k: 'collect', n: 3, model: 'herb', night: true, msg: '🌿 Folha-de-lua colhida', spot: i => herbSpots()[i], hud: q => '🌿 Colha folhas-de-lua (' + q.n + '/3) — só à noite, nas clareiras dos cervos' + (isNight(hourNow()) ? '' : ' (espere anoitecer)') }],
    reward: { pot: 5 }, rewardTxt: '5 poções' },
  { id: 'mapa', giver: 'Pé-de-Pau Polly', title: 'O Mapa Rasgado', lv: 4, tier: 'longa',
    say: { ask: 'Yo-ho-ho! Achei um velho mapa rasgado em três pedaços, e cada um foi parar num acampamento diferente! Recupere os fragmentos (Náufragos, Cova dos Esqueletos e Bivaque Fantasma) e o tesouro é nosso!', on: 'Os pedaços estão nos acampamentos: Náufragos, Cova dos Esqueletos e Bivaque Fantasma. Depois, siga o X do mapa e cave!', ready: 'Cavou o baú! Que tesouro! Fique com a parte do leão, marujo. Eu fico com as histórias.' },
    stages: [
      { k: 'collect', n: 3, model: 'scroll', msg: '📜 Fragmento do mapa', spot: i => POST_DATA[[0, 2, 3][i]] && around(POST_DATA[[0, 2, 3][i]], 1, 5), hud: q => '📜 Recupere os fragmentos do mapa (' + q.n + '/3) nos acampamentos' },
      { k: 'collect', n: 1, model: 'dig', msg: '⛏ Você cavou o tesouro!', spot: () => POST_DATA[0] && freePoint(POST_DATA[0].x - 24, POST_DATA[0].z + 16, 1), hud: () => '❌ Siga o X do mapa e cave o tesouro, perto do Acampamento dos Náufragos' }],
    reward: { torch: 1, magic: 1 }, rewardTxt: 'uma arma Mágica e uma tocha' },
  { id: 'estrelas', giver: 'Velho Astrolábio', title: 'Estrelas Apagadas', lv: 7, tier: 'media',
    say: { ask: 'Tracei as constelações destas águas por quarenta anos, mas as Sombras das Ondas apagam as marcas nos três círculos de pedra ao redor da vila. À noite, fique dentro de cada círculo até eu refazer o mapa do céu. Elas virão atrás de você!', on: 'Os círculos de pedra ficam ao redor da vila. Só à noite, e não saia deles enquanto as Sombras atacam!', ready: 'O céu está desenhado de novo! Veja, o norte nunca esteve tão claro. Leve estas bombas, vão lhe servir.' },
    stages: [0, 1, 2].map(i => ({ k: 'hold', n: 25, r: 4.5, night: true, model: 'ring', waves: { kind: KIND.SOMBRA, count: 2, every: 9 }, spot: () => landPoint(VILLAGE_R + 50, i * 2.1 + .4),
      hud: q => '⭐ Círculo ' + (i + 1) + '/3: fique dentro por ' + Math.max(0, Math.ceil(25 - q.n)) + 's e defenda-se das Sombras' + (isNight(hourNow()) ? '' : ' (espere anoitecer)') })),
    reward: { bmb: 3 }, rewardTxt: '3 bombas' },
  { id: 'mare', giver: 'Pé-de-Pau Polly', title: 'Maré Subindo', lv: 9, tier: 'media',
    say: { ask: 'O sino do meu velho navio ficou na Praia dos Naufragados! Só que a maré sobe depressa por lá. Pegue o sino e volte para a vila antes de a maré cobrir o caminho. Se não der tempo, terá de buscar de novo!', on: 'O sino está na Praia dos Naufragados. Depois de pegá-lo, volte à vila antes de a maré cobrir o caminho!', ready: 'O sino! Ouça só... soa igualzinho a quando o Kraken me levou a perna. Fique com isto, marujo.' },
    stages: [
      { k: 'collect', n: 1, model: 'bell', msg: '🔔 Sino recuperado! A maré está subindo...', spot: i => POST_DATA[6] && around(POST_DATA[6], 2, 6), hud: () => '🔔 Pegue o sino do navio na Praia dos Naufragados' },
      { k: 'goto', r: 7, limit: 150, back: 0, model: 'ring', spot: () => ({ x: 0, z: 10 }), hud: q => '🌊 A maré sobe! Volte à praça da vila em ' + Math.max(0, Math.ceil(q.tl || 0)) + 's' }],
    reward: { magic: 1 }, rewardTxt: 'uma arma Mágica' },
  { id: 'calafate', giver: 'Mestre Breu', title: 'Escolta do Calafate', lv: 5, tier: 'media',
    say: { ask: 'Meu alcatrão acabou e o casco do barco do porto está vazando! Mas os mortos rondam o caminho... Me escolte até o porto, sem deixar que me matem, e ajude-me a consertar o casco enquanto os malditos atacam!', on: 'Eu sigo você até o porto. Fique perto de mim e não deixe os mortos me alcançarem!', ready: 'Casco selado, alcatrão firme! Ahoy! Aqui estão os machados que forjei com as sobras. Use bem!' },
    stages: [
      { k: 'escort', r: 5, model: 'ring', waves: { kind: KIND.GRUMETE, count: 2, every: 20 }, spot: () => pois[0] ? { x: pois[0].x, z: pois[0].z } : { x: 0, z: 30 },
        hud: q => '🔨 Leve o Mestre Breu até o porto (' + escortInfo() + ')' },
      { k: 'hold', n: 20, r: 5, model: 'ring', waves: { kind: KIND.CONTRA, count: 2, every: 8 }, spot: () => pois[0] ? { x: pois[0].x, z: pois[0].z } : { x: 0, z: 30 },
        hud: q => '🔨 Defenda o Breu enquanto ele conserta o casco (' + Math.max(0, Math.ceil(20 - q.n)) + 's) — ' + escortInfo() }],
    reward: { machado: 10 }, rewardTxt: '10 machados de arremesso' },
  { id: 'arsenal', giver: 'Capitã Sal', title: 'Mão Firme', lv: 5, tier: 'curta',
    say: { ask: 'Arremesso é arte de quem não perde a calma, marujo. Pegue estas facas e acerte dez inimigos com elas. Equipe-as no espaço de arma de longa distância e use o botão de ataque. Elas acabam, mas as que não quebram ficam no chão.', on: 'Ainda faltam acertos! Equipe a faca de arremesso no espaço de longa distância e atire nos inimigos.', ready: 'Mão firme, olho vivo! Aqui, mais facas e uns trocados pelo treino.' },
    stages: [{ k: 'throw', n: 10, hud: q => '🎯 Acerte inimigos com armas de arremesso (' + q.n + '/10)' }],
    onStart: () => give('Faca de arremesso', 15), reward: { faca: 10 }, rewardTxt: '10 facas de arremesso' },
];
const QMAP = Object.fromEntries(QUESTS.map(d => [d.id, d]));
const Q = () => state.quests || (state.quests = {});
const stageOf = (d, q) => d.stages[q.i];

// ---- Contratos de dungeon (Mural): condição extra numa dungeon, repetível; paga ao derrotar o chefe cumprindo a condição ----
export const CONTRACTS = {
  nopot: { n: 'Sem poções', ic: '🧪', hint: 'derrote o chefe da dungeon sem usar nenhuma poção' },
  trap: { n: 'Sem espinhos', ic: '⚠', hint: 'derrote o chefe sem pisar em nenhuma armadilha' },
  speed: { n: 'Relâmpago', ic: '⏱', hint: 'derrote o chefe em até 8 minutos', limit: 480 },
};
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
/** Texto do contrato para o painel ('' se não há) */
export function contractHud() {
  const c = state.contract; if (!c) return '';
  const d = CONTRACTS[c.c], r = c.run;
  if (!d) return '';
  if (!r) return d.ic + ' Contrato ' + d.n + ': entre numa dungeon';
  return d.ic + ' Contrato ' + d.n + (r.fail ? ': ✖ ' + r.fail : ': ✔' + (d.limit ? ' ' + fmt(Math.max(0, d.limit - r.t)) : ''));
}
const failC = why => { const r = state.contract && state.contract.run; if (r && !r.fail) { r.fail = why; log('✖ Contrato falhou: ' + why); } };
on('dungeon:enter', () => { const c = state.contract; if (c && !c.run) { c.run = { lv: state.dunNow.lv, t: 0, a: 0, fail: '' }; log('📜 Contrato valendo: ' + CONTRACTS[c.c].hint); } });
on('potion:used', () => { if (state.contract && state.contract.c === 'nopot') failC('você usou uma poção'); });
on('trap:hit', () => { if (state.contract && state.contract.c === 'trap') failC('você pisou numa armadilha'); });
on('dungeon:leave', () => { const c = state.contract; if (c && c.run) { state.contract = null; log('📜 Contrato cancelado: você saiu da dungeon sem concluí-la'); saveGame(); } });
on('dungeon:clear', () => {
  const c = state.contract; if (!c || !c.run) return;
  const r = c.run, share = r.t > 0 ? Math.min(1, r.a / r.t) : 0, lv = r.lv;
  state.contract = null;
  if (r.fail) { log('📜 Contrato não pago: ' + r.fail); saveGame(); return; }
  const mult = Math.max(.6, 1 - .4 * share) * (share < .1 ? 1.25 : 1), xp = Math.round(xpToNext(lv) * .3 * mult), gold = Math.round(goldAt(lv) * 12 * mult);
  P.xp += xp; P.gold += gold; levelUp();
  if (share < .1 && Math.random() < .35) addItem({ ty: 'wpn', q: 2, wi: pickWeapon(lv + 2, 2), il: lv + 2 });
  log('🏆 Contrato cumprido (' + CONTRACTS[c.c].n + '): +' + xp + ' XP · +' + gold + ' ouro' + (share >= .1 ? ' (auto ' + Math.round(share * 100) + '% do tempo: −' + Math.round((1 - mult) * 100) + '%)' : ' (modo manual: +25%)'));
  saveGame();
});

/** Texto do quadro de missões: todas as missões e o estado de cada uma */
export function boardText() {
  const lines = QUESTS.map(d => {
    const q = Q()[d.id], tag = q && q.s === 'done' ? '✔' : q ? '▶' : P.lv >= d.lv ? '📜' : '🔒';
    return tag + ' ' + d.title + ' (Nv ' + d.lv + ') — ' + d.giver + (q && q.s === 'done' ? ' · concluída' : q ? ' · em andamento' : P.lv >= d.lv ? '' : ' · requer Nv ' + d.lv);
  });
  return lines.join('\n') + '\n\n' + (state.contract ? contractHud() : '📜 Contrato de dungeon: nenhum ativo');
}

/** Pílulas de progresso do HUD: até 2 missões ativas */
export function questsHud() {
  const out = [];
  QUESTS.forEach(d => {
    const q = Q()[d.id];
    if (!q || q.s === 'done') return;
    const sh = q.t > 0 ? q.a / q.t : 0, pen = sh >= .1 ? '  ⚠ auto −' + Math.round(40 * sh) + '%' : '';   // quanto da recompensa o auto já custou
    out.push(q.s === 'ready' ? '📜 ' + d.title + ': volte a ' + d.giver : '📜 ' + d.title + ': ' + stageOf(d, q).hud(q) + pen);
  });
  if (state.contract && !state.contract.run) out.push(contractHud());
  return out.slice(0, 2).join('  ·  ') || null;
}

/** Fala do NPC dono de missão (substitui a fala aleatória) ou null */
export function questsSay(cur) {
  for (const d of QUESTS) {
    if (d.giver !== cur.name) continue;
    const q = Q()[d.id];
    if (q && q.s === 'done') continue;
    if (!q) return P.lv >= d.lv ? d.say.ask : 'Tenho um serviço para quem tiver coragem... volte quando for pelo menos Nv ' + d.lv + ', marujo.';
    return q.s === 'ready' ? d.say.ready : d.say.on;
  }
  return null;
}

/** Botões do diálogo: aceitar / receber recompensa */
export function questsButtons(cur) {
  const out = [];
  if (cur.board) {
    out.push(['📋 Ver quadro de missões', say => say(boardText())]);
    if (state.contract) out.push(['❌ Cancelar o contrato atual (' + CONTRACTS[state.contract.c].n + ')', (say, rebuild) => { state.contract = null; saveGame(); say('Contrato cancelado.'); rebuild(); }]);
    else Object.entries(CONTRACTS).forEach(([k, c]) => out.push([c.ic + ' Contrato de dungeon: ' + c.n, (say, rebuild) => { state.contract = { c: k, run: null }; saveGame(); say('Contrato aceito: ' + c.hint + '. Vale para a PRÓXIMA dungeon em que você entrar e se repete quantas vezes quiser. Paga 30% do XP do nível da dungeon e 12× o ouro dos inimigos, e o auto ganha menos. Sair da dungeon sem concluir cancela o contrato.'); rebuild(); }]));
  }
  QUESTS.forEach(d => {
    if (d.giver !== cur.name) return;
    const q = Q()[d.id];
    if (q && q.s === 'done') return;
    if (!q && P.lv >= d.lv) out.push(['📜 Aceitar missão: ' + d.title + ' (Nv ' + d.lv + ')', (say, rebuild) => { start(d); say(d.say.on); rebuild(); }]);
    else if (!q) out.push(['🔒 ' + d.title + ' — requer Nv ' + d.lv, () => {}]);
    else if (q.s === 'ready') out.push(['🎁 Receber recompensa: ' + d.title, (say, rebuild) => { finish(d); say('Foi um prazer fazer negócio, marujo!'); rebuild(); }]);
  });
  return out;
}

function start(d) {
  Q()[d.id] = { s: 'on', i: 0, n: 0, t: 0, a: 0 };
  log('📜 Missão aceita: ' + d.title);
  if (d.onStart) d.onStart();
  saveGame();
}

function advance(d, q) {
  q.n = 0; q.wv = 0; q.i++;
  if (q.i >= d.stages.length) { q.s = 'ready'; log('✅ ' + d.title + ': volte a ' + d.giver + ' para receber a recompensa'); }
  else { const nx = stageOf(d, q); q.tl = nx.limit || null; log('📜 ' + d.title + ': ' + nx.hud(q)); }
  saveGame();
}

function finish(d) {
  const q = Q()[d.id], [pc, gm] = TIER[d.tier], share = q.t > 0 ? Math.min(1, q.a / q.t) : 0;
  const mult = Math.max(.6, 1 - .4 * share) * (share < .1 ? 1.25 : 1);   // auto ganha menos · manual ganha bônus de mestria
  const xp = Math.round(xpToNext(d.lv) * pc * mult), gold = Math.round(goldAt(d.lv) * gm * mult);
  P.xp += xp; P.gold += gold; levelUp();
  const r = d.reward || {};
  if (r.pot) beltAdd('pot', r.pot);
  if (r.couro) P.couro += r.couro;
  if (r.bmb) beltAdd('bmb', r.bmb);
  if (r.machado) give('Machado de arremesso', r.machado);
  if (r.faca) give('Faca de arremesso', r.faca);
  if (r.torch) addItem({ ty: 'wpn', q: 1, wi: wi('Tocha'), il: 1 });
  if (r.magic) addItem({ ty: 'wpn', q: 2, wi: pickWeapon(d.lv + 2, 2), il: d.lv + 2 });
  if (share < .1 && Math.random() < .35) addItem({ ty: 'wpn', q: 2, wi: Math.max(0, wi('Faca de arremesso')), il: d.lv, ct: 5 });   // mestria: chance de extra
  q.s = 'done';
  log('🏆 Missão concluída: ' + d.title + ' · +' + xp + ' XP · +' + gold + ' ouro' + (d.rewardTxt ? ' · ' + d.rewardTxt : '') + (share >= .1 ? ' (auto ' + Math.round(share * 100) + '% do tempo: −' + Math.round((1 - mult) * 100) + '%)' : ' (modo manual: +25%)'));
  lootText('🏆 ' + d.title);
  saveGame();
}

/** Missões ativas cuja etapa atual é do tipo `k` */
const active = k => QUESTS.map(d => [d, Q()[d.id]]).filter(([d, q]) => q && q.s === 'on' && stageOf(d, q).k === k);
const bump = (d, q) => { q.n++; if (q.n >= stageOf(d, q).n) advance(d, q); else saveGame(); };

// ---- eventos do jogo ----
on('enemy:killed', () => {
  const e = state.lastKill;
  if (!e) return;
  active('kill').forEach(([d, q]) => { if (e.t.n === 'Javali' && !e.qid) bump(d, q); });
  active('boss').forEach(([d, q]) => { if (e.qid === d.id) bump(d, q); });
});
on('shot:thrown-hit', () => { active('throw').forEach(([d, q]) => bump(d, q)); });

// ---- itens no mundo (coletas): barris, fragmentos, ervas, tesouro ----
const PK = [];   // { m, x, z, id, si, night }
function pickMesh(kind, radius = 4) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c }), add = (geo, c, y) => { const m = new THREE.Mesh(geo, L(c)); m.position.y = y; g.add(m); return m; };
  let col = 0xffd040;
  if (kind === 'barrel') { add(new THREE.CylinderGeometry(.42, .36, .8, 10), 0x8a5a2a, .4); [.2, .6].forEach(y => add(new THREE.CylinderGeometry(.43, .43, .06, 10), 0x3a2a1a, y)); }
  else if (kind === 'scroll') { const r = add(new THREE.CylinderGeometry(.12, .12, .6, 8), 0xe8d8a0, .45); r.rotation.z = 1.2; add(new THREE.CylinderGeometry(.13, .13, .08, 8), 0x8a5a2a, .45).rotation.z = 1.2; col = 0xffe080; }
  else if (kind === 'herb') { for (let k = 0; k < 5; k++) { const l = add(new THREE.ConeGeometry(.07, .5, 5), k % 2 ? 0x60d890 : 0x40b870, .25); l.position.x = Math.cos(k * 1.26) * .15; l.position.z = Math.sin(k * 1.26) * .15; l.rotation.z = Math.cos(k * 1.26) * .3; l.rotation.x = Math.sin(k * 1.26) * .3; } col = 0x80ffc0; }
  else if (kind === 'bell') { add(new THREE.ConeGeometry(.28, .45, 10), 0xd8a830, .4); add(new THREE.SphereGeometry(.07, 6, 5), 0x6a4a1a, .15); col = 0xffd060; }
  else if (kind === 'ring') { const t = new THREE.Mesh(new THREE.TorusGeometry(radius, .12, 6, 40), new THREE.MeshBasicMaterial({ color: 0xa0c8ff, transparent: true, opacity: .75 })); t.rotation.x = Math.PI / 2; t.position.y = .15; g.add(t); col = 0xa0c8ff; }
  else { const m = add(new THREE.SphereGeometry(.6, 8, 5, 0, 6.28, 0, 1.5), 0x6a4a2a, 0); m.scale.y = .45; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = .78; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = -.78; col = 0xff8060; }   // monte de terra com um X vermelho
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 7, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .35, depthWrite: false })); beam.position.y = 3.6; g.add(beam);   // facho: dá para ver de longe
  return g;
}
function clearPk(keep) { for (let i = PK.length - 1; i >= 0; i--) if (!keep || !keep(PK[i])) { scene.remove(PK[i].m); PK.splice(i, 1); } }
function updateCollects(dt, list) {
  const cur = list.filter(([d, q]) => ['collect', 'goto', 'hold', 'escort'].includes(stageOf(d, q).k));
  clearPk(p => cur.some(([d, q]) => d.id === p.id && q.i === p.si));   // some o que não é da etapa atual
  cur.forEach(([d, q]) => {
    const st = stageOf(d, q);
    if (!PK.some(p => p.id === d.id && p.si === q.i)) {   // cria os que faltam
      const area = st.k !== 'collect';
      for (let k = area ? 0 : q.n; k < (area ? 1 : st.n); k++) {
        const pt = st.spot(k); if (!pt) break;
        const m = pickMesh(st.model, st.r); m.position.set(pt.x, 0, pt.z); scene.add(m); PK.push({ m, x: pt.x, z: pt.z, id: d.id, si: q.i, night: !!st.night, msg: st.msg, area });
      }
    }
  });
  const night = isNight(hourNow());
  for (let i = PK.length - 1; i >= 0; i--) {
    const p = PK[i], hid = p.night && !night;
    p.m.visible = !hid; p.m.rotation.y += dt;
    if (!p.area && !hid && Math.hypot(P.x - p.x, P.z - p.z) < 1.8) {
      const e = cur.find(([d, q]) => d.id === p.id && q.i === p.si);
      scene.remove(p.m); PK.splice(i, 1); lootText(p.msg);
      if (e) bump(e[0], e[1]);
    }
  }
}

// ---- escolta: NPC que segue o jogador e perde vida quando inimigos chegam perto dele ----
const ESC = { g: null, hp: 0, max: 1, bar: null };
const escortInfo = () => ESC.g ? 'vida do Breu ' + Math.round(100 * ESC.hp / ESC.max) + '%' + (Math.hypot(P.x - ESC.g.position.x, P.z - ESC.g.position.z) > 14 ? ' — ele ficou para trás!' : '') : 'procurando o Breu';
function clearEscort() { if (ESC.g) { scene.remove(ESC.g); ESC.g = null; } }
function ensureEscort(d, st) {
  if (ESC.g) return;
  const src = npcList.find(n => n.info && n.info.name === 'Mestre Breu'), sx = src ? src.g.position.x : P.x + 2, sz = src ? src.g.position.z : P.z + 2;
  const g = person(undefined, 0, 0, 0, { sk: 'calafate', f: false, ov: {} });
  const p = freePoint(sx + 2, sz + 2, .6); g.position.set(p.x, groundY(p.x, p.z), p.z); g.scale.setScalar(1.05); scene.add(g);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x40d070, depthTest: false })); bar.scale.set(1.2, .14, 1); bar.position.y = 2.5; bar.renderOrder = 999; g.add(bar);
  Object.assign(ESC, { g, bar, max: 120 + 20 * d.lv, hp: 120 + 20 * d.lv, ex: p.x, ez: p.z, v: 0 });
}
function updateEscort(dt, list) {
  const eq = list.find(([d, q]) => { const k = stageOf(d, q).k; return d.id === 'calafate' && (k === 'escort' || k === 'hold'); });
  if (!eq) { clearEscort(); return; }
  const [d, q] = eq, st = stageOf(d, q);
  ensureEscort(d, st);
  const g = ESC.g, pk = PK.find(p => p.id === d.id && p.si === q.i);
  let x = g.position.x, z = g.position.z;
  // segue o jogador (parado no círculo durante o conserto)
  const tx = st.k === 'hold' && pk ? pk.x : P.x, tz = st.k === 'hold' && pk ? pk.z : P.z, dist = Math.hypot(tx - x, tz - z);
  const want = st.k === 'hold' ? (dist > 1.5 ? 3 : 0) : dist > 14 ? 4.2 : dist > 3 ? 3.3 : 0;
  ESC.v += (want - ESC.v) * (1 - Math.exp(-dt * 6));
  if (ESC.v > .05) { const ang = Math.atan2(tx - x, tz - z); [x, z] = slideTo(x, z, x + Math.sin(ang) * ESC.v * dt, z + Math.cos(ang) * ESC.v * dt); g.rotation.y = ang; }
  g.position.set(x, groundY(x, z), z);
  gait(g, dt, gaitSpeed(ESC.v), { sword: false });
  // inimigos colados no Breu o machucam
  enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 2.4) ESC.hp -= e.dmg * .25 * dt; });
  ESC.bar.scale.x = Math.max(.02, 1.2 * ESC.hp / ESC.max);
  if (ESC.hp <= 0) {   // Breu caiu: recomeça a escolta
    log('💀 O Mestre Breu caiu! Fale com ele de novo para recomeçar a escolta.');
    q.i = 0; q.n = 0; q.wv = 0; clearEscort(); clearPk(); saveGame(); return;
  }
  if (st.k === 'escort' && pk) {   // chegou ao porto?
    if (Math.hypot(x - pk.x, z - pk.z) < st.r) advance(d, q);
    else if ((q.wv = (q.wv || 0) - dt) <= 0) {
      q.wv = st.waves.every;
      for (let i = 0; i < st.waves.count; i++) {
        const a = Math.random() * 6.28, p = freePoint(x + Math.cos(a) * 14, z + Math.sin(a) * 14, .8);
        spawn(st.waves.kind, p.x, p.z, undefined, { lv: d.lv }); enemies[enemies.length - 1].ag = true;
      }
      log('⚔ Inimigos atacam a escolta!');
    }
  }
}

let bossOut = false, T = 0;
function ensureBoss(d) {
  if (bossOut && enemies.some(e => e.qid === d.id && !e.dead)) return;
  const n = npcByShop('farm-granja');
  const bx = n ? n.g.position.x : P.x, bz = n ? n.g.position.z : P.z;
  if (!n || Math.hypot(P.x - bx, P.z - bz) > 120) return;   // só cria quando o jogador está por perto
  const p = freePoint(bx + 16, bz + 6, 1);
  spawn(KIND.JAVALI, p.x, p.z, undefined, { lv: Math.max(3, P.lv), elite: true });
  enemies[enemies.length - 1].qid = d.id; bossOut = true;
  log('⭐ O Presa-Torta apareceu perto da granja!');
}

/** Etapas de área: 'goto' (chegar ao ponto) e 'hold' (ficar dentro do círculo por n segundos, com ondas de inimigos) */
function updateAreas(dt, list) {
  const night = isNight(hourNow());
  list.forEach(([d, q]) => {
    const st = stageOf(d, q);
    if (st.k !== 'goto' && st.k !== 'hold') return;
    const pk = PK.find(p => p.id === d.id && p.si === q.i); if (!pk) return;
    const hid = st.night && !night, r = st.r || 4, dist = Math.hypot(P.x - pk.x, P.z - pk.z);
    pk.m.visible = !hid;
    if (st.k === 'goto') { if (dist < r) advance(d, q); return; }
    if (hid) return;
    if (dist < r) {
      q.n += dt;
      if ((q.wv = (q.wv || 0) - dt) <= 0) {   // nova onda de inimigos ao redor do círculo
        q.wv = st.waves.every;
        for (let i = 0; i < st.waves.count; i++) {
          const a = Math.random() * 6.28, p = freePoint(pk.x + Math.cos(a) * (13 + Math.random() * 4), pk.z + Math.sin(a) * (13 + Math.random() * 4), .8);
          spawn(st.waves.kind, p.x, p.z, undefined, { lv: d.lv + (st.waves.add || 0) });
          enemies[enemies.length - 1].ag = true;
        }
        log('⚔ Uma onda de inimigos se aproxima!');
      }
      if (q.n >= st.n) advance(d, q);
    } else q.n = Math.max(0, q.n - dt * .5);   // saiu do círculo: o progresso vai se perdendo devagar
  });
}

/** Todo quadro: contagem de tempo (para a penalidade do auto) e objetos das missões */
export function updateQuests(dt) {
  const list = QUESTS.map(d => [d, Q()[d.id]]).filter(([d, q]) => q && q.s === 'on');
  list.forEach(([d, q]) => { q.t += dt; if (state.autoOn) q.a += dt; });
  const cr = state.contract && state.contract.run;
  if (cr) { cr.t += dt; if (state.autoOn) cr.a += dt; const lim = CONTRACTS[state.contract.c].limit; if (lim && cr.t > lim) failC('o tempo acabou'); }
  updateCollects(dt, list);
  updateAreas(dt, list);
  updateEscort(dt, list);
  list.forEach(([d, q]) => {   // limite de tempo da etapa (ex.: voltar antes da maré cobrir)
    const st = stageOf(d, q);
    if (st.limit && q.tl != null && (q.tl -= dt) <= 0) { q.i = st.back || 0; q.n = 0; q.tl = null; clearPk(); log('🌊 Tempo esgotado! ' + d.title + ': recomece pela etapa anterior'); saveGame(); }
  });
  if ((T -= dt) > 0) return;
  T = 1.5;
  const jq = list.find(([d, q]) => d.id === 'javalis' && stageOf(d, q).k === 'boss');
  if (jq) ensureBoss(jq[0]); else bossOut = false;
}

/** Regiões das missões ativas para o mapa: [{ x, z, r, t }] (círculo amarelo). Os pontos exatos recebem um deslocamento fixo: marca a REGIÃO, não o ponto. */
export function questMarks() {
  const out = [], jit = v => ((Math.abs(Math.round(v * 7)) % 11) - 5);
  QUESTS.forEach(d => {
    const q = Q()[d.id];
    if (!q || q.s !== 'on') return;
    const st = stageOf(d, q);
    if (st.k === 'collect' || st.k === 'goto' || st.k === 'hold' || st.k === 'escort') PK.filter(p => p.id === d.id && p.si === q.i).forEach(p => out.push({ x: p.x + jit(p.x), z: p.z + jit(p.z), r: 18, t: d.title }));
    else if (st.k === 'boss') {
      const e = enemies.find(z => z.qid === d.id && !z.dead);
      if (e) out.push({ x: e.x, z: e.z, r: 22, t: d.title });
      else { const n = npcByShop('farm-granja'); if (n) out.push({ x: n.g.position.x + 16, z: n.g.position.z + 6, r: 32, t: d.title }); }
    } else if (st.k === 'kill') {
      let b = null, bd = 1e9;
      enemies.forEach(z => { if (!z.dead && z.t.n === 'Javali' && !z.qid) { const dd = Math.hypot(z.x - P.x, z.z - P.z); if (dd < bd) { bd = dd; b = z; } } });
      if (b) out.push({ x: b.x, z: b.z, r: 26, t: d.title });
    }
  });
  return out;
}
