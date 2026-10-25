/* Primeira missão: "O Rato da Taverna". Estágios (state.quest.st):
   0 ir ao Mural de Missões · 1 falar com a Madame Rum · 2 pegar o rato na taverna · 3 voltar à Rum · 4 concluída (rato vira o primeiro companheiro) */
import { state } from '../core/state.js';
import { P } from '../entities/player.js';
import { scene } from '../core/engine.js';
import { log, lootText } from '../ui/notify.js';
import { puff } from './effects.js';
import { groundY } from '../world/terrain.js';
import { DOORS } from '../world/doors.js';
import { houseAt } from '../world/floors.js';
import { freeSpots, planInterior } from '../world/interior-nav.js';
import { setPet } from '../pets/manager.js';
import { saveGame } from './save.js';

export const RAT_GOLD = 40;
const st = () => state.quest.st;
const set = n => { state.quest.st = n; saveGame(); };

/** Texto do objetivo atual (painel superior) ou null se não há missão ativa */
export function questHud() {
  return ['📜 Vá até o Mural de Missões, na vila', '🐀 Fale com a Madame Rum, na taverna', '🐀 Pegue o rato dentro da taverna', '🐀 Volte e fale com a Madame Rum'][st()] || null;
}

/** Fala inicial do NPC/cartaz (substitui a fala aleatória) ou null */
export function questSay(cur) {
  if (cur.board && st() === 0) return 'SERVIÇO: Alguém anda comendo a despensa da taverna. Paga-se em moedas e com um favor da casa. Falar com Madame Rum.';
  if (cur.shop === 'tavern') {
    if (st() === 0) return 'Ai, marujo... Se procura serviço, dê uma olhada no Mural de Missões, na praça. Tem cartaz novo lá!';
    if (st() === 1) return 'Que bom que veio, meu bem! Tenho um problema: um rato gordo, esperto como capitão, anda roendo o queijo, o pão, o peixe seco e até as rolhas dos barris. Já tentei vassoura, ratoeira e reza. Pega ele pra mim?';
    if (st() === 2) return 'O danado ainda anda por aqui! Ouvi os guinchos agora há pouco. Ele corre feito diabo e foge de gente — encoste nele para pegar.';
    if (st() === 3) return 'Ora, pegou o bichinho! Que figura... Olhe só, ele até gosta de você. Fique com ele e com estas moedas pelo trabalho!';
  }
  return null;
}

/** Botões extras do diálogo: [[texto, ação(say, rebuild)]] */
export function questButtons(cur) {
  const out = [];
  if (cur.board && st() === 0) out.push(['✅ Aceitar missão: O Rato da Taverna', (say, rebuild) => { set(1); log('📜 Missão aceita: O Rato da Taverna'); say('Missão aceita! Vá até a taverna e fale com a Madame Rum.'); rebuild(); }]);
  if (cur.shop === 'tavern' && st() === 1) out.push(['🐀 Aceito pegar o rato', (say, rebuild) => { set(2); spawnRat(); log('🐀 Pegue o rato dentro da taverna!'); say('Isso! Ele se esconde atrás dos barris e das mesas. Seja rápido e não deixe escapar!'); rebuild(); }]);
  if (cur.shop === 'tavern' && st() === 3) out.push(['🎁 Receber recompensa e o rato', (say, rebuild) => {
    P.gold += RAT_GOLD; lootText('+' + RAT_GOLD + ' ouro');
    state.owned.rat = true; set(4); setPet('rat'); saveGame();
    log('🐀 Missão concluída! O Rato agora é seu companheiro'); say('Cuide bem dele, marujo! Agora a despensa está salva.'); rebuild();
  }]);
  return out;
}

// ───────────────────────── o rato ─────────────────────────
const RAT = { g: null, h: null, spots: [], path: [], wait: 0, flee: 0, ph: 0 };

function buildRat() {
  const g = new THREE.Group(), M = c => new THREE.MeshLambertMaterial({ color: c });
  const part = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  part(new THREE.SphereGeometry(.2, 8, 6), 0x7a6a5c, 0, .2, 0, 1, .8, 1.5);                        // corpo
  part(new THREE.SphereGeometry(.13, 8, 6), 0x85766a, 0, .24, .33, 1, .9, 1.2);                    // cabeça
  part(new THREE.ConeGeometry(.07, .18, 6).rotateX(Math.PI / 2), 0xd8a8a0, 0, .22, .5);            // focinho
  part(new THREE.SphereGeometry(.05, 6, 4), 0x111111, -.06, .3, .42); part(new THREE.SphereGeometry(.05, 6, 4), 0x111111, .06, .3, .42);   // olhos
  part(new THREE.SphereGeometry(.07, 6, 4), 0xd8a8a0, -.1, .38, .28, 1, 1, .3); part(new THREE.SphereGeometry(.07, 6, 4), 0xd8a8a0, .1, .38, .28, 1, 1, .3);   // orelhas
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.015, .03, .55, 5).translate(0, -.27, 0), M(0xd8a8a0)); tail.position.set(0, .2, -.28); tail.rotation.x = -1.2; g.add(tail); g.userData.tail = tail;
  g.scale.setScalar(1.3);
  scene.add(g);
  return g;
}

function tavern() { const d = DOORS.find(q => q.id === 'tavern-front'); return d && d.h; }

/** Cria o rato num ponto livre da taverna, longe do jogador */
export function spawnRat() {
  const h = tavern(); if (!h) return;
  RAT.h = h; RAT.spots = freeSpots(h, 0);
  if (!RAT.spots.length) return;
  if (!RAT.g) RAT.g = buildRat();
  const far = RAT.spots.slice().sort((a, b) => Math.hypot(b[0] - P.x, b[1] - P.z) - Math.hypot(a[0] - P.x, a[1] - P.z))[0];
  RAT.g.position.set(far[0], groundY(far[0], far[1]) + .26, far[1]); RAT.path = []; RAT.wait = .5;
}

function capture() {
  const p = RAT.g.position;
  puff(p.x, .5, p.z, 0xd8c8b8, 3, 8);
  RAT.g.visible = false;
  set(3); log('🐀 Você pegou o rato! Volte e fale com a Madame Rum'); lootText('🐀 Rato capturado!');
}

/** Atualiza o rato (a cada quadro): foge do jogador pelos vãos livres da taverna; encostar nele o captura */
export function updateQuest(dt) {
  if (st() !== 2) { if (RAT.g) RAT.g.visible = false; return; }
  if (!RAT.g || !RAT.h) { spawnRat(); if (!RAT.g) return; }
  const g = RAT.g, h = RAT.h, hp = houseAt(P.x, P.z, .3), inside = !P.up && !!hp && hp.x === h.x && hp.z === h.z;   // (a casa dos colisores e a da lista são objetos diferentes: compara pela posição)
  g.visible = inside;
  if (!inside) return;
  const p = g.position, d = Math.hypot(P.x - p.x, P.z - p.z);
  if (d < .85) { capture(); return; }
  RAT.ph += dt * 14;
  if (RAT.wait > 0) { RAT.wait -= dt; if (d < 3.6) RAT.wait = 0; }
  else {
    if (!RAT.path.length || RAT.flee <= 0) {   // escolhe um esconderijo: longe do jogador e a poucos metros do rato
      RAT.flee = 1.2;
      let best = null, bs = -1e9;
      for (let k = 0; k < 14; k++) {
        const sp = RAT.spots[(Math.random() * RAT.spots.length) | 0], dr = Math.hypot(sp[0] - p.x, sp[1] - p.z), dp = Math.hypot(sp[0] - P.x, sp[1] - P.z);
        if (dr < 1.5 || dr > 7) continue;
        const sc = dp - dr * .25 + Math.random();
        if (sc > bs) { bs = sc; best = sp; }
      }
      const pl = best && planInterior(p.x, p.z, best[0], best[1], 0);
      RAT.path = pl && pl.pts.length ? pl.pts.slice() : [];
      if (!RAT.path.length) RAT.wait = .6;
    }
    RAT.flee -= dt;
    const q = RAT.path[0];
    if (q) {
      const dx = q[0] - p.x, dz = q[1] - p.z, l = Math.hypot(dx, dz) || 1, v = (d < 3 ? 3.0 : 2.2) * dt;
      p.x += dx / l * Math.min(v, l); p.z += dz / l * Math.min(v, l);
      g.rotation.y += (Math.atan2(dx, dz) - g.rotation.y + (Math.abs(Math.atan2(dx, dz) - g.rotation.y) > Math.PI ? 6.283 * Math.sign(g.rotation.y - Math.atan2(dx, dz)) : 0)) * Math.min(1, dt * 12);
      if (l < .15) { RAT.path.shift(); if (!RAT.path.length) RAT.wait = d < 4 ? .2 : 1.2; }
    }
  }
  p.y = groundY(p.x, p.z) + .26 + Math.abs(Math.sin(RAT.ph)) * (RAT.wait > 0 ? 0 : .05);
  if (g.userData.tail) g.userData.tail.rotation.z = Math.sin(RAT.ph * .6) * .5;
}
/** (testes) posição do rato */
export const ratDbg = () => RAT.g && RAT.g.visible ? [RAT.g.position.x, RAT.g.position.z] : null;
