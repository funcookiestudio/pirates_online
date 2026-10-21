/* O jogador: dados, marcador de destino, dano recebido e subida de nível. */
import { scene } from '../core/engine.js';
import { state } from '../core/state.js';
import { person } from './character.js';
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
export const P = {
  g: person(0xe0b48a, 0x8b2e2e, 0x2e3a5a, 0x1a1a1a),
  x: 0, z: 5, hp: 100, max: 100, mp: 60, mmax: 60, lv: 1, xp: 0, nxt: 60, dmg: 12,
  tx: 0, tz: 5, tgt: null, cd: 0, sw: 0, sp: 5, gold: 0, pot: 3, bmb: 3, dead: false,
  walk: 0, wid: 0, cds: [0, 0], vx: 0, vz: 0, ph: 0,
  // animação e combo
  aa: -.4, af: -.3, lean: 0, dr: 0, cb: 0, cbt: 0, imp: 0, ay: 0,
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
  if (P.dead || P.roll > 0) return; // invulnerável durante a rolada
  d *= 1 - (P.dr || 0);
  if (P.sitT) { P.sitT = 0; P.sitF = true; } // levou dano sentado: levanta às pressas
  P.hp -= d;
  if (kn) { P.vx += Math.sin(a) * kn; P.vz += Math.cos(a) * kn; }
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
    P.nxt = Math.round(P.nxt * 1.4) + 30;
    P.max += 15;
    P.mmax += 8;
    P.dmg += 3;
    P.hp = P.max;
    P.mp = P.mmax;
    log('★ Nível ' + P.lv + '!');
    banner('NÍVEL ' + P.lv);
    puff(P.x, 1, P.z, 0xffe060, 6, 16);
  }
}
