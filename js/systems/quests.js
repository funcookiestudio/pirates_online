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

/** [fração do XP do nível, múltiplo do ouro] por tamanho da missão */
export const TIER = { curta: [.15, 8], media: [.25, 15], longa: [.4, 30], epica: [.6, 60] };
const wi = name => WEAPONS.findIndex(w => w.n === name);
const give = (name, ct) => { const i = wi(name); if (i >= 0) addItem({ ty: 'wpn', q: 1, wi: i, ct, il: P.lv }); };

/** Pontos das coletas (calculados de novo a cada vez: mesmos lugares ao recarregar). `i` = índice do item */
const around = (post, k, r0 = 6) => { const a = k * 1.57 + .5, r = r0 + (k % 2) * 3; return freePoint(post.x + Math.cos(a) * r, post.z + Math.sin(a) * r, .8); };
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
  { id: 'arsenal', giver: 'Capitã Sal', title: 'Mão Firme', lv: 5, tier: 'curta',
    say: { ask: 'Arremesso é arte de quem não perde a calma, marujo. Pegue estas facas e acerte dez inimigos com elas. Equipe-as no espaço de arma de longa distância e use o botão de ataque. Elas acabam, mas as que não quebram ficam no chão.', on: 'Ainda faltam acertos! Equipe a faca de arremesso no espaço de longa distância e atire nos inimigos.', ready: 'Mão firme, olho vivo! Aqui, mais facas e uns trocados pelo treino.' },
    stages: [{ k: 'throw', n: 10, hud: q => '🎯 Acerte inimigos com armas de arremesso (' + q.n + '/10)' }],
    onStart: () => give('Faca de arremesso', 15), reward: { faca: 10 }, rewardTxt: '10 facas de arremesso' },
];
const QMAP = Object.fromEntries(QUESTS.map(d => [d.id, d]));
const Q = () => state.quests || (state.quests = {});
const stageOf = (d, q) => d.stages[q.i];

/** Pílulas de progresso do HUD: até 2 missões ativas */
export function questsHud() {
  const out = [];
  QUESTS.forEach(d => {
    const q = Q()[d.id];
    if (!q || q.s === 'done') return;
    out.push(q.s === 'ready' ? '📜 ' + d.title + ': volte a ' + d.giver : '📜 ' + d.title + ': ' + stageOf(d, q).hud(q));
  });
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
  q.n = 0; q.i++;
  if (q.i >= d.stages.length) { q.s = 'ready'; log('✅ ' + d.title + ': volte a ' + d.giver + ' para receber a recompensa'); }
  else log('📜 ' + d.title + ': ' + stageOf(d, q).hud(q));
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
function pickMesh(kind) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c }), add = (geo, c, y) => { const m = new THREE.Mesh(geo, L(c)); m.position.y = y; g.add(m); return m; };
  let col = 0xffd040;
  if (kind === 'barrel') { add(new THREE.CylinderGeometry(.42, .36, .8, 10), 0x8a5a2a, .4); [.2, .6].forEach(y => add(new THREE.CylinderGeometry(.43, .43, .06, 10), 0x3a2a1a, y)); }
  else if (kind === 'scroll') { const r = add(new THREE.CylinderGeometry(.12, .12, .6, 8), 0xe8d8a0, .45); r.rotation.z = 1.2; add(new THREE.CylinderGeometry(.13, .13, .08, 8), 0x8a5a2a, .45).rotation.z = 1.2; col = 0xffe080; }
  else if (kind === 'herb') { for (let k = 0; k < 5; k++) { const l = add(new THREE.ConeGeometry(.07, .5, 5), k % 2 ? 0x60d890 : 0x40b870, .25); l.position.x = Math.cos(k * 1.26) * .15; l.position.z = Math.sin(k * 1.26) * .15; l.rotation.z = Math.cos(k * 1.26) * .3; l.rotation.x = Math.sin(k * 1.26) * .3; } col = 0x80ffc0; }
  else { const m = add(new THREE.SphereGeometry(.6, 8, 5, 0, 6.28, 0, 1.5), 0x6a4a2a, 0); m.scale.y = .45; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = .78; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = -.78; col = 0xff8060; }   // monte de terra com um X vermelho
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 7, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .35, depthWrite: false })); beam.position.y = 3.6; g.add(beam);   // facho: dá para ver de longe
  return g;
}
function clearPk(keep) { for (let i = PK.length - 1; i >= 0; i--) if (!keep || !keep(PK[i])) { scene.remove(PK[i].m); PK.splice(i, 1); } }
function updateCollects(dt, list) {
  const cur = list.filter(([d, q]) => stageOf(d, q).k === 'collect');
  clearPk(p => cur.some(([d, q]) => d.id === p.id && q.i === p.si));   // some o que não é da etapa atual
  cur.forEach(([d, q]) => {
    const st = stageOf(d, q);
    if (!PK.some(p => p.id === d.id && p.si === q.i)) {   // cria os que faltam
      for (let k = q.n; k < st.n; k++) {
        const pt = st.spot(k); if (!pt) break;
        const m = pickMesh(st.model); m.position.set(pt.x, 0, pt.z); scene.add(m); PK.push({ m, x: pt.x, z: pt.z, id: d.id, si: q.i, night: !!st.night, msg: st.msg });
      }
    }
  });
  const night = isNight(hourNow());
  for (let i = PK.length - 1; i >= 0; i--) {
    const p = PK[i], hid = p.night && !night;
    p.m.visible = !hid; p.m.rotation.y += dt;
    if (!hid && Math.hypot(P.x - p.x, P.z - p.z) < 1.8) {
      const e = cur.find(([d, q]) => d.id === p.id && q.i === p.si);
      scene.remove(p.m); PK.splice(i, 1); lootText(p.msg);
      if (e) bump(e[0], e[1]);
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

/** Todo quadro: contagem de tempo (para a penalidade do auto) e objetos das missões */
export function updateQuests(dt) {
  const list = QUESTS.map(d => [d, Q()[d.id]]).filter(([d, q]) => q && q.s === 'on');
  list.forEach(([d, q]) => { q.t += dt; if (state.autoOn) q.a += dt; });
  updateCollects(dt, list);
  if ((T -= dt) > 0) return;
  T = 1.5;
  const jq = list.find(([d, q]) => d.id === 'javalis' && stageOf(d, q).k === 'boss');
  if (jq) ensureBoss(jq[0]); else bossOut = false;
}
