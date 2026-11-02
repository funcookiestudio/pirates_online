/* O jogador: dados, marcador de destino, dano recebido e subida de nível. */
import { xpToNext } from '../data/scaling.js';
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { person, hideSword, playerModel } from './character.js';
import { activeChar } from '../core/chars.js';
import { classOf } from '../data/classes.js';
import { puff } from '../systems/effects.js';
import { log, banner } from '../ui/notify.js';
import { emit } from '../core/events.js';

/**
 * P guarda tudo do jogador:
 *  g = modelo 3D · x,z = posição · vx,vz = velocidade · hp/max = vida · mp/mmax = mana
 *  lv/xp/nxt = nível · dmg = dano · tx,tz = destino do clique · tgt = alvo atual
 *  cd = recarga do ataque · cds = recargas [giro, bomba] · sw = animação do golpe
 *  gold/pot = ouro e poções · wid = índice da arma equipada · dr = redução de dano
 */
const CL = classOf(activeChar());   // classe do personagem ativo (bônus em classes.js)
export const P = {
  g: playerModel(!!(activeChar() && activeChar().f), activeChar() && activeChar().a),
  x: 0, z: 5, hp: CL.hp, max: CL.hp, mp: CL.mp, mmax: CL.mp, lv: 1, xp: 0, nxt: 60, dmg: CL.dmg, cls: CL, crit: CL.crit,
  tx: 0, tz: 5, tgt: null, cd: 0, sw: 0, sp: CL.sp, gold: 0, couro: 0, penas: 0, peixe: 0, osso: 0, pot: 3, bmb: 3, potR: 0, bmbR: 0, arrows: 0, bolts: 0, dead: false,   // potR/bmbR: reserva no cinto
  
  walk: 0, wid: 0, cds: [0, 0], vx: 0, vz: 0, ph: 0,
  // animação e combo
  aa: -.4, af: -.3, lean: 0, dr: CL.dr, cb: 0, cbt: 0, imp: 0, ay: 0,
  // esquiva: roll = tempo restante da rolada · rcd = recarga · rdx,rdz = direção
  roll: 0, rcd: 0, rdx: 0, rdz: 0,
  // sentar: sit = progresso (0 em pé … 1 sentado) · sitT = objetivo (0 ou 1) · sitF = levantar rápido
  sit: 0, sitT: 0, sitF: false,
  // mira (armas de fogo): 0 = arma baixa … 1 = mirando (cabeça inclinada, olho esquerdo fechado)
  aimv: 0,
  // recarga: cdMax = duração da recarga atual (s) · rls = velocidade de recarga (1 = normal; skills futuras aumentam)
  cdMax: 1, rls: 1,
  // armas: duas equipadas (wpn = corpo a corpo, gun = de fogo); act = a que está na mão
  // models = os modelos 3D · hand = modelo na mão · hl = pose da arma relativa à mão (pos + rotação)
  // swap = troca em andamento · wb = bônus de dano da arma ativa já somado em dmg
  act: 'wpn', models: { wpn: null, gun: null }, wids: { wpn: 0, gun: null }, hand: null,
  hl: { p: new THREE.Vector3(0, -.32, 0), q: new THREE.Quaternion() },
  swap: null, wb: 0,
};
hideSword(P.g);   // só aparece a arma equipada no inventário (sem a espada padrão do modelo)
scene.add(P.g);
P.g.rotation.order = 'YXZ';

/** Anel que marca o ponto clicado no chão */
export const mark = new THREE.Mesh(
  new THREE.RingGeometry(.4, .6, 8).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xe0a458 })
);
mark.position.y = .05;
scene.add(mark);

/** Jogador recebe dano `d` vindo do ângulo `a`, com empurrão `kn` */
export function hurtP(d, a, kn) {
  if (P.dead || P.roll > 0 || P.diveUnder) return; // invulnerável durante a rolada e debaixo d'água
  d *= 1 - (P.dr || 0);
  if (P.skh) { d = P.skh.hurt(d); if (d <= 0) return; }   // habilidades de classe: invulnerável, Muralha, escudo (skills.js)
  if (P.sitT) { P.sitT = 0; P.sitF = true; } // levou dano sentado: levanta às pressas
  P.hp -= d;
  if (kn && !P.noKb) { P.vx += Math.sin(a) * kn; P.vz += Math.cos(a) * kn; }
  state.SHK = Math.max(state.SHK, .15);
  puff(P.x, 1.3, P.z, 0xc02020, 3, 3);
  if (P.hp <= 0) {
    P.dead = true;
    emit('player:died');
  }
}

/** Sobe de nível enquanto houver XP suficiente */
export function levelUp() {
  while (P.xp >= P.nxt) {
    P.xp -= P.nxt;
    P.lv++;
    P.nxt = xpToNext(P.lv);
    P.max += P.cls.g[0];
    P.mmax += P.cls.g[1];
    P.dmg += P.cls.g[2];
    P.hp = P.max;
    P.mp = P.mmax;
    log('Nível ' + P.lv + '!');
    banner('NÍVEL ' + P.lv);
    puff(P.x, 1, P.z, 0xffe060, 6, 16);
    if (P.skh) P.skh.lvl(P.lv);   // aviso de habilidade nova (níveis 6 e 12)
  }
}
