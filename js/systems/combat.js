/* Combate do jogador: golpes, balas, giro, bomba, poção e o cálculo de dano (hit). */
import { xpMult, dealtMult } from '../data/scaling.js';
import { scene } from '../core/engine.js';
import { state, aim } from '../core/state.js';
import { enemies, particles, bombs, shots } from '../core/registry.js';
import { M } from '../core/utils.js';
import { WEAPONS } from '../data/weapons.js';
import { P, levelUp } from '../entities/player.js';
import { aimOffset } from '../entities/player-weapon.js';
import { dropLoot } from '../entities/loot.js';
import { PV, petXp } from '../pets/stats.js';
import { puff } from './effects.js';
import { log, dmgNum } from '../ui/notify.js';

/* ---------- Dano ---------- */

/**
 * Aplica `d` de dano ao inimigo `e`.
 * Opções: cr (crítico forçado) · kn (empurrão) · ang (direção do empurrão)
 *         fin (golpe final do combo) · pet (veio do companheiro) · dot (dano contínuo)
 */
export function hit(e, d, o) {
  o = o || {};
  if (e.dead) return;
  e.ag = true;
  if (e.mk > 0) d *= 1 + e.mkv;
  if (o.pet && e.hp < e.max * .35) d *= 1 + PV('exec');
  d *= dealtMult(e.lv - P.lv);                      // inimigo muito acima do seu nível: seus golpes quase não fazem cócegas

  const cr = o.cr !== undefined ? o.cr : Math.random() < .15;
  d = Math.round(d * (.85 + Math.random() * .3) * (cr ? 2 : 1));
  e.hp -= d;

  if (!o.dot) {
    dmgNum(e, d, cr);
    puff(e.x, 1.3, e.z, 0xc02020, 3, 4);
    e.fl = .14;
    const k = o.kn || 0;
    if (k) {
      const a = o.ang !== undefined ? o.ang : Math.atan2(e.x - P.x, e.z - P.z);
      const m = e.t.boss ? .3 : 1;
      e.kx += Math.sin(a) * k * 6 * m;
      e.kz += Math.cos(a) * k * 6 * m;
      if (!e.t.boss && !e.sn && (e.st !== 'wind' || o.fin)) {
        e.st = 'stag';
        e.tm = .18 + k * .08;
      }
    }
    if (cr || o.fin) {
      state.HS = Math.max(state.HS, o.fin ? .07 : .05);
      state.SHK = Math.max(state.SHK, .2);
    }
  }

  if (e.hp <= 0) onKill(e);
}

/** Inimigo morreu: XP, XP do pet, loot e possível subida de nível */
function onKill(e) {
  e.dead = .01;
  // XP depende da diferença de nível: inimigos muito fracos quase não dão XP, mais fortes dão bônus
  const xp = Math.max(1, Math.round(e.xpv * xpMult(e.lv - P.lv)));
  P.xp += xp;
  if (e.pa) petXp(e.pa, xp * .6);
  dropLoot(e);
  levelUp();
  if (e.t.boss) log(e.dun ? '👑 Chefe derrotado!' : 'O Capitão Maldito caiu! Ele voltará em 45s.');
  else if (e.elite) log('⭐ Elite derrotado! +' + xp + ' XP');
}

/* ---------- Habilidades ---------- */

/** Giro: acerta todos em volta (tecla Q) */
export function spin() {
  if (P.cds[0] > 0 || P.dead) return;
  P.cds[0] = 3;
  P.sw = 1;
  puff(P.x, 1, P.z, 0xaaddff, 8, 14);
  enemies.forEach(e => {
    const d = Math.hypot(e.x - P.x, e.z - P.z);
    if (d < 4) hit(e, P.dmg * 2, { kn: 1.2 });
  });
}

/** Lança uma bomba até o ponto apontado (tecla W) */
export function bomb() {
  if (P.cds[1] > 0 || P.dead || P.bmb <= 0) return;
  P.bmb--;
  P.cds[1] = 5;
  const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 6, 5), M(0x111111));
  m.position.set(P.x, 1.4, P.z);
  scene.add(m);
  const dx = aim.x - P.x, dz = aim.z - P.z;
  const d = Math.min(12, Math.hypot(dx, dz)) || 1, l = Math.hypot(dx, dz) || 1;
  bombs.push({ m, vx: dx / l * d * .9, vz: dz / l * d * .9, vy: 7, t: 1.1 });
}

/** Bebe uma poção de vida (tecla E) */
export function potion() {
  if (P.pot > 0 && !P.dead) {
    P.pot--;
    P.hp = Math.min(P.max, P.hp + 60);
    puff(P.x, 1, P.z, 0xff6060, 4, 8);
  }
}

/** Voo e explosão das bombas */
export function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.vy -= 20 * dt;
    b.m.position.x += b.vx * dt;
    b.m.position.z += b.vz * dt;
    b.m.position.y += b.vy * dt;
    b.t -= dt;
    if (b.m.position.y < .25) {
      b.m.position.y = .25;
      b.vy *= -.3;
      b.vx *= .6;
      b.vz *= .6;
    }
    if (b.t <= 0) {
      const x = b.m.position.x, z = b.m.position.z;
      puff(x, .5, z, 0xff9a2a, 8, 16);
      puff(x, .5, z, 0x333333, 5, 8);
      enemies.forEach(e => {
        const d = Math.hypot(e.x - x, e.z - z);
        if (d < 5) hit(e, P.dmg * 3 * (1 - d / 7), { kn: 1.6, ang: Math.atan2(e.x - x, e.z - z) });
      });
      scene.remove(b.m);
      bombs.splice(i, 1);
    }
  }
}

/* ---------- Ataque básico ---------- */

/** Inicia um ataque em direção (dx,dz): corpo a corpo agenda o impacto; arma de fogo dispara a bala */
export function attack(dx, dz) {
  const W = WEAPONS[P.wid], t = P.tgt;
  P.cdMax = W.reload ? W.cd / (P.rls || 1) : W.cd; // armas com recarga animada respeitam a velocidade de recarga
  P.cd = P.cdMax;
  P.sw = 1;
  P.cb = P.cbt > 0 ? (P.cb + 1) % 3 : 0;
  P.cbt = 1.2;
  P.ay = Math.atan2(dx, dz);

  if (!W.gun) {
    P.imp = W.imp || .15; // o impacto acontece no meio da animação (0,15 s por padrão)
    P.vx += Math.sin(P.ay) * 2.2;
    P.vz += Math.cos(P.ay) * 2.2;
    return;
  }

  const d = Math.hypot(dx, dz);
  P.g.rotation.y = P.ay + aimOffset(d); // o corpo já está na posição de mira
  P.g.updateMatrixWorld(true);
  const mp = P.hand.localToWorld(new THREE.Vector3(0, -(W.ml || 1), 0)); // boca do cano
  const mx = mp.x, mz = mp.z, my = mp.y;
  puff(mx, my, mz, 0xffd070, 4, 6);
  puff(mx, my, mz, 0x999999, 2, 4);
  const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffe070 }));
  m.position.set(mx, my, mz);
  scene.add(m);
  shots.push({ m, t, d: P.dmg * W.mul, sp: W.sp, sl: W.splash });
}

/** Momento do golpe corpo a corpo: acerta quem está no arco à frente */
export function impact() {
  const W = WEAPONS[P.wid], a = P.ay, fin = P.cb === 2, arc = W.arc || 1.6, rg = W.rng + .7;
  enemies.forEach(e => {
    if (e.dead) return;
    const dx = e.x - P.x, dz = e.z - P.z;
    if (Math.hypot(dx, dz) > rg) return;
    let da = Math.atan2(dx, dz) - a;
    da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
    if (e !== P.tgt && da > arc / 2) return;
    hit(e, P.dmg * W.mul * (fin ? 1.4 : 1) * (e === P.tgt ? 1 : .7), { kn: fin ? 1.6 : .8, fin, ang: a });
  });

  // arco visual do golpe
  const m = new THREE.Mesh(
    new THREE.RingGeometry(rg * .55, rg, 16, 1, Math.PI / 2 - arc / 2, arc).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: fin ? 0xffd070 : 0xddeeff, transparent: true, opacity: .5, side: THREE.DoubleSide })
  );
  m.position.set(P.x, .15, P.z);
  m.rotation.y = a + Math.PI;
  scene.add(m);
  particles.push({ m, v: new THREE.Vector3(), t: .4 });
}

/** Voo das balas em direção ao alvo */
export function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i], p = s.m.position;
    let done = s.t.dead > 0;
    if (!done) {
      const dx = s.t.x - p.x, dy = 1.3 - p.y, dz = s.t.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d < .8) {
        hit(s.t, s.d, { kn: .6 });
        if (s.sl) {
          enemies.forEach(o => {
            if (o !== s.t && !o.dead && Math.hypot(o.x - s.t.x, o.z - s.t.z) < 2.2) hit(o, s.d * .6);
          });
        }
        done = true;
      } else {
        const k = Math.min(d, s.sp * dt) / d;
        p.x += dx * k;
        p.y += dy * k;
        p.z += dz * k;
      }
    }
    if (done) {
      scene.remove(s.m);
      shots.splice(i, 1);
    }
  }
}
