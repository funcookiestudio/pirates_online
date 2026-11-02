/* Inimigos: criação, IA (perseguir / preparar golpe / recuperar), animação e reaparecimento. */
import { steer, collide, navTarget } from '../systems/steer.js';
import { scene, cam } from '../core/engine.js';
import { state } from '../core/state.js';
import { enemies, respawns } from '../core/registry.js';
import { turnTo } from '../core/utils.js';
import { ENEMY_KINDS, KIND } from '../data/enemies.js';
import { P, hurtP } from './player.js';
import { enemyModel } from './character.js';
import { gait, gaitSpeed } from './gait.js';
import { hit } from '../systems/combat.js';
import { puff } from '../systems/effects.js';
import { petPos, petPerched, hurtPet } from '../pets/manager.js';
import { log } from '../ui/notify.js';
import { groundY, slideTo } from '../world/terrain.js';
import { enemyStats, ELITE, takenMult } from '../data/scaling.js';
import { animateEnemyBoar } from './wildlife-anim.js';
import { animateSerpent } from './serpent.js';
import { stoneTick, updateHead } from '../systems/medusa-head.js';
import { initMedusa, medusaThink, animateMedusa, updateMedusaFx } from './medusa.js';
import { initDragon, dragonThink, animateDragon, dragonClear } from './dragon.js';
import { initHydra, hydraThink, animateHydra, hydraClear } from './hydra.js';
import { initUndead, undeadThink, undeadPower, undeadHitFx } from './undead.js';

/** Tempo (s) até um inimigo morto reaparecer */
const RESPAWN_TIME = 43.8;
let CLK = 0;   // relógio das animações extras (s)

/* ---------- Criação ---------- */

/** Cria um inimigo do tipo `k` (índice de ENEMY_KINDS) na posição (x,z).
    `o` = { lv (nível; padrão = o do arquétipo), elite }: vida, dano e XP vêm do nível (scaling.js) */
export function spawn(k, x, z, pat, o = {}) {
  const t = ENEMY_KINDS[k], lv = o.lv || t.lv, elite = !!o.elite && !t.boss, st = enemyStats(t, lv, elite);
  const g = enemyModel(t);
  if (t.boss) g.scale.setScalar(t.sc || 1.7); else g.scale.setScalar((t.sc || 1) * (elite ? ELITE.scale : 1));
  g.position.set(x, groundY(x, z), z);
  scene.add(g);

  // barra de vida sobre a cabeça
  const hb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .12), new THREE.MeshBasicMaterial({ color: elite ? 0xe8b020 : 0xc0302c }));
  hb.position.y = t.hbY ? t.hbY / (t.sc || 1) : t.boss ? 4.2 : 2.6 + (t.sc ? (t.sc - 1) * 1.6 : 0);
  hb.visible = false;
  g.add(hb);

  // materiais com "emissive" (piscam quando atingidos)
  const ms = [];
  g.traverse(m => { if (m.material && m.material.emissive) ms.push(m.material); });

  const hp = st.hp;
  enemies.push({
    g, hb, t, k, ms, pat, A: g.userData.A,
    lv, elite, dmg: st.d, xpv: st.xp,   // nível e estatísticas desta instância
    hp, max: hp,
    x, z, hx: x, hz: z,           // posição e "casa" (ponto de origem)
    vx: 0, vz: 0, kx: 0, kz: 0,   // velocidade e empurrão
    st: 'chase', tm: 0, cd: 1,    // estado da IA, temporizador e recarga
    dead: 0, ag: false, wt: 0,    // morte, agressivo?, espera do passeio
    fl: 0, mk: 0, sn: 0, bl: 0, bt: 0, bd: 0, // flash, marca, atordoado, sangramento
    hs: 1, ar: -.4, af: -.3, ln: 0,           // barra suavizada e pose
    ph: Math.random() * 6, id: Math.floor(Math.random() * 2), // fase do passo e lado de flanco
    MD: g.userData.MD,            // Medusa: controle do modelo de 2 fases
    SN: g.userData.SN,            // serpente: animação do corpo
    DR: g.userData.DR,            // dragão / wiverno: animação do modelo (dragon-model.js)
    HM: g.userData.HM,            // hidra: animação do modelo (hydra-model.js)
  });
  if (t.medusa) initMedusa(enemies[enemies.length - 1]);
  if (t.dragon) initDragon(enemies[enemies.length - 1]);
  if (t.hydra) initHydra(enemies[enemies.length - 1]);
  if (t.undead) initUndead(enemies[enemies.length - 1]);
}

/* ---------- Atualização por frame ---------- */

/** Inimigo morto: cai no chão deslizando pelo empurrão */
function animateDeath(e, dt) {
  e.dead += dt;
  if (e.ring) { scene.remove(e.ring); e.ring = null; }
  if (e.DS) dragonClear(e);
  if (e.HY) hydraClear(e);
  const u = Math.min(1, e.dead * 2.5), f = Math.exp(-dt * 6);
  e.x += e.kx * dt;
  e.z += e.kz * dt;
  e.kx *= f;
  e.kz *= f;
  if (e.SN) { e.g.rotation.z = 2.9 * (1 - Math.pow(1 - u, 3)); e.g.position.set(e.x, groundY(e.x, e.z) + .3 * Math.sin(u * Math.PI), e.z); return; }   // serpente: vira de barriga para cima
  if (e.A || e.DR || e.HM) { e.g.rotation.z = 1.45 * (1 - Math.pow(1 - u, 3)); e.g.position.set(e.x, groundY(e.x, e.z) - .05 * u, e.z); return; }   // quadrúpede tomba de lado
  e.g.rotation.x = 1.55 * (1 - Math.pow(1 - u, 3));
  e.g.position.set(e.x, groundY(e.x, e.z) - .12 * u, e.z);
}

/**
 * IA: decide a direção desejada (wx,wz) e cuida dos estados
 *  chase = perseguir/atacar · wind = preparando golpe · rec = recuperando · stag = cambaleando
 * `c` = contexto do frame: dx, dz, d (distância ao jogador), aim (ângulo), reach, dur, bo (é boss?)
 */
function think(e, dt, c) {
  const { dx, dz, d, aim, reach, dur, bo } = c, T = e.t;
  let wx = 0, wz = 0;

  if (e.st === 'chase') {
    const hx = e.hx - e.x, hz = e.hz - e.z, hd = Math.hypot(hx, hz);
    if (!e.ag && d < (bo ? 14 : 11)) e.ag = true;       // viu o jogador
    if (e.ag && !(e.tn > 0) && (d > 26 || hd > 38)) e.ag = false;      // desistiu (provocado pelo Grito de Guerra: não desiste)

    if (!e.ag) {
      // volta para casa regenerando, depois passeia perto dela
      e.hp = Math.min(e.max, e.hp + e.max * .1 * dt);
      if (e.pat) {
        // patrulha em volta da fogueira do posto
        const P2 = e.pat, ca = Math.atan2(e.z - P2.cz, e.x - P2.cx);
        const ta = ca + P2.dir * .7, tx = P2.cx + Math.cos(ta) * P2.r, tz = P2.cz + Math.sin(ta) * P2.r;
        const px = tx - e.x, pz = tz - e.z, pd = Math.hypot(px, pz) || 1;
        wx = px / pd * T.s * .42; wz = pz / pd * T.s * .42;
      } else if (hd > 1.5) {
        wx = hx / hd * T.s * .6;
        wz = hz / hd * T.s * .6;
      } else {
        e.wt -= dt;
        if (e.wt <= 0) {
          e.wt = 2 + Math.random() * 3;
          e.wx = e.hx + (Math.random() - .5) * 5;
          e.wz = e.hz + (Math.random() - .5) * 5;
        }
        const wx2 = (e.wx || e.hx) - e.x, wz2 = (e.wz || e.hz) - e.z, q = Math.hypot(wx2, wz2);
        if (q > .5) {
          wx = wx2 / q * T.s * .3;
          wz = wz2 / q * T.s * .3;
        }
      }
    } else if (d > reach * .8) {
      // persegue (fantasmas flanqueiam de lado)
      let ax = dx / d, az = dz / d;
      if (e.k === KIND.GHOST && d < 7) {
        const q = (e.id ? 1 : -1) * .55;
        ax -= dz / d * q;
        az += dx / d * q;
      }
      const sp = T.s * (d > 5 ? 1 : .8);
      wx = ax * sp;
      wz = az * sp;
    }

    // começa o golpe
    if (e.ag && d <= reach && e.cd <= 0) {
      e.atkd = true;   // já tentou te atacar (Golpe Furtivo do Ladino só vale antes disso)
      e.st = 'wind';
      e.tm = dur;
      e.slam = bo && (!e.MD || e.MD.st.phase === 2) && ((e.n = (e.n || 0) + 1) % 2 === 0); // o boss alterna golpe normal e pancada em área
      if (e.slam) {
        e.ring = new THREE.Mesh(
          new THREE.RingGeometry(4.3, 4.6, 24).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: .55 })
        );
        e.ring.position.set(e.x, groundY(e.x, e.z) + .12, e.z);
        scene.add(e.ring);
      }
    }
  } else if (e.st === 'wind') {
    if (e.tm <= 0) {
      // o golpe acerta
      e.st = 'rec';
      e.tm = bo ? .7 : .5;
      e.cd = bo ? 1.2 : .8;
      e.kx += Math.sin(aim) * 3;
      e.kz += Math.cos(aim) * 3;
      const dm = e.dmg * takenMult(e.lv - P.lv);

      const pp = petPos();
      if (!petPerched() && pp.y < 2 && Math.hypot(pp.x - e.x, pp.z - e.z) <= (e.slam ? 4.6 : reach + .5)) {
        hurtPet(dm * (e.slam ? .8 : .5));
      }

      if (e.slam) {
        if (e.ring) { scene.remove(e.ring); e.ring = null; }
        puff(e.x, .4, e.z, T.undead === 'vampire' ? 0xa01030 : T.undead === 'mummy' ? 0xe0c070 : 0xff6a2a, 9, 18);
        state.SHK = Math.max(state.SHK, .7);
        if (d < 4.6) { hurtP(dm * 1.3, aim, 9); if (e.UD) undeadHitFx(e, dm * 1.3); }
      } else if (d <= reach + .7) {
        hurtP(dm, aim, 4);
        if (e.UD) undeadHitFx(e, dm);
      }
    }
  } else if (e.st === 'rec' && e.tm <= 0) {
    e.st = 'chase';
  } else if (e.st === 'stag' && e.tm <= 0) {
    e.st = 'chase';
  }

  return [wx, wz];
}

/** Soma separação entre inimigos e integra velocidade + empurrão */
function move(e, wx, wz, dt) {
  if (Math.hypot(wx, wz) > .1 && e.ag && e.st === 'chase' && !P.dead) {
    const sp = Math.hypot(wx, wz), m = e.sm || (e.sm = { side: 0 }), [nx, nz] = navTarget(m, e.x, e.z, P.x, P.z, (e.t.cr || (e.t.boss ? 1.1 : .6))), nd = Math.hypot(nx - e.x, nz - e.z) || 1;
    wx = (nx - e.x) / nd * sp; wz = (nz - e.z) / nd * sp;
  }
  if (Math.hypot(wx, wz) > .1 && !e.dead) [wx, wz] = steer(e.x, e.z, wx, wz, (e.t.cr || (e.t.boss ? 1.1 : .6)), e.sm || (e.sm = { side: 0 }), 12);
  enemies.forEach(o => {
    if (o !== e && !o.dead) {
      const sx = e.x - o.x, sz = e.z - o.z, sd = Math.hypot(sx, sz);
      if (sd < 1.1 && sd > .001) {
        wx += sx / sd * (1.1 - sd) * 3;
        wz += sz / sd * (1.1 - sd) * 3;
      }
    }
  });
  const ka = 1 - Math.exp(-dt * 7), kk = Math.exp(-dt * 7);
  e.vx += (wx - e.vx) * ka;
  e.vz += (wz - e.vz) * ka;
  [e.x, e.z] = slideTo(e.x, e.z, e.x + (e.vx + e.kx) * dt, e.z + (e.vz + e.kz) * dt);
  e.kx *= kk;
  e.kz *= kk;
  collide(e, (e.t.cr || (e.t.boss ? 1.1 : .6)));
}

/** Rotação, passos, pose do golpe e barra de vida */
function animate(e, c, dt) {
  const { aim, dur } = c, T = e.t;

  if (e.st === 'wind' || (e.ag && !P.dead && e.st === 'chase')) turnTo(e.g, aim, e.st === 'wind' ? 5 : 9, dt);
  else if (e.st === 'chase' && Math.hypot(e.vx, e.vz) > .3) turnTo(e.g, Math.atan2(e.vx, e.vz), 6, dt);

  const mv = Math.min(1, Math.hypot(e.vx, e.vz) / T.s);
  if (e.DR) {   // dragão e wiverno: modelo e animação próprios (dragon.js)
    animateDragon(e, c, dt);
    e.hs += (e.hp / e.max - e.hs) * (1 - Math.exp(-dt * 10));
    e.hb.scale.x = Math.max(.01, e.hs); e.hb.quaternion.copy(cam.quaternion); e.hb.parent.updateMatrixWorld();
    return;
  }
  if (e.HM) {   // hidra: modelo e animação próprios (hydra.js)
    animateHydra(e, c, dt);
    e.hs += (e.hp / e.max - e.hs) * (1 - Math.exp(-dt * 10));
    e.hb.scale.x = Math.max(.01, e.hs); e.hb.quaternion.copy(cam.quaternion); e.hb.parent.updateMatrixWorld();
    return;
  }
  if (e.MD || e.SN) {   // Medusa e serpente: modelo e animação próprios (medusa.js, serpent.js)
    if (e.MD) animateMedusa(e, c, dt); else animateSerpent(e, c, dt, groundY, turnTo, P);
    e.hs += (e.hp / e.max - e.hs) * (1 - Math.exp(-dt * 10));
    e.hb.scale.x = Math.max(.01, e.hs); e.hb.quaternion.copy(cam.quaternion); e.hb.parent.updateMatrixWorld();
    return;
  }
  if (e.A) {   // javali: pose de quadrúpede, sem braços
    animateEnemyBoar(e, c, dt, groundY);
    e.hs += (e.hp / e.max - e.hs) * (1 - Math.exp(-dt * 10));
    e.hb.scale.x = Math.max(.01, e.hs); e.hb.quaternion.copy(cam.quaternion); e.hb.parent.updateMatrixWorld();
    return;
  }

  let ta = -.4, tf = -.3, tl = mv * .08;
  if (e.st === 'wind') {
    const u = 1 - Math.max(0, e.tm) / dur;
    ta = -.4 - u * 2.2;
    tf = -.3 - u * .8;
    tl = -.2 * u;
  } else if (e.st === 'rec') { ta = .1; tf = -.1; tl = .25; }
  else if (e.st === 'dash') { const u = Math.max(0, 1 - e.tm / 1.1); ta = -.9; tf = -.8; tl = u < .5 ? -.15 : .45; }   // investida: agacha e lança o corpo
  else if (e.st === 'stag') { ta = .5; tl = -.3; }

  const ak = 1 - Math.exp(-dt * (e.st === 'rec' ? 26 : 11));
  e.ar += (ta - e.ar) * ak;
  e.af += (tf - e.af) * ak;
  e.ln += (tl - e.ln) * (1 - Math.exp(-dt * 12));
  e.g.arm.rotation.x = e.ar;
  e.g.arm.fa.rotation.x = e.af;
  e.g.rotation.x = e.ln;
  e.g.position.set(e.x, groundY(e.x, e.z), e.z);
  e.g.up.rotation.set(0, 0, 0);
  gait(e.g, dt, gaitSpeed(Math.hypot(e.vx, e.vz)), { twist: e.st === 'wind' || e.st === 'rec' ? 0 : 1, sword: false });
  if (e.g.userData.fx) { CLK += dt; if (e.UD) undeadPower(e, dt); e.g.userData.fx(e, dt, mv, CLK); }   // peças extras dos mortos-vivos (undead-model.js)

  e.hs += (e.hp / e.max - e.hs) * (1 - Math.exp(-dt * 10));
  e.hb.scale.x = Math.max(.01, e.hs);
  e.hb.quaternion.copy(cam.quaternion);
  e.hb.parent.updateMatrixWorld();
}

function updateEnemy(e, dt) {
  if (e.dead) { animateDeath(e, dt); return; }
  // longe do jogador (e já perdido no nevoeiro) e sem perseguir: não desenha nem processa
  if (!e.ag && Math.hypot(P.x - e.x, P.z - e.z) > 66) { e.g.visible = false; return; }
  e.g.visible = true;
  /* longe e sem perseguir: pensa/anda a ~8 vezes por segundo e nem anima (a pose já vira um único modelo congelado a partir de 15 m) */
  let farIdle = false;
  if (!e.ag) {
    const dd = Math.hypot(P.x - e.x, P.z - e.z);
    if (dd > 18) {
      e._q = (e._q === undefined ? Math.random() * .12 : e._q) + dt;
      if (e._q < .12) return;
      dt = e._q; e._q = 0; farIdle = true;
    }
  }

  const bo = e.t.boss;
  e.fl = Math.max(0, e.fl - dt);
  e.mk = Math.max(0, e.mk - dt);
  e.sn = Math.max(0, e.sn - dt);
  e.ms.forEach(m => m.emissive.setHex(e.fl > 0 ? 0x993322 : e.tint || 0));

  // sangramento (dano contínuo)
  if (e.bl > 0) {
    e.bl -= dt;
    e.bt -= dt;
    if (e.bt <= 0) {
      e.bt = .5;
      hit(e, e.bd, { dot: 1 });
      if (e.dead) return;
    }
  }

  if (stoneTick(e, dt)) { e.vx = e.vz = 0; e.g.position.set(e.x, groundY(e.x, e.z), e.z); return; }   // estátua: não age nem anima
  const dx = P.x - e.x, dz = P.z - e.z;
  const c = {
    dx, dz, bo,
    d: Math.hypot(dx, dz) || 1,
    aim: Math.atan2(dx, dz),
    reach: e.t.reach || (bo ? 3 : 1.9),
    dur: e.t.dur || (bo ? .9 : .45),
  };
  e.tm -= dt;
  e.cd -= dt;

  // atordoado durante o golpe: cancela
  if (e.sn > 0 && e.st === 'wind') {
    e.st = 'chase';
    e.cd = .4;
    if (e.ring) { scene.remove(e.ring); e.ring = null; }
  }

  let wx = 0, wz = 0;
  if (e.sn <= 0 && !P.dead) [wx, wz] = e.MD ? medusaThink(e, dt, c, think) : e.DS ? dragonThink(e, dt, c, think) : e.HY ? hydraThink(e, dt, c, think) : e.UD ? undeadThink(e, dt, c, think) : think(e, dt, c);
  if (e.root > 0) { wx = wz = 0; } else if (e.slow > 0) { wx *= .5; wz *= .5; }   // preso (armadilha) / lento (gelo): skills.js
  move(e, wx, wz, dt);
  if (!farIdle) animate(e, c, dt);
}

/** Atualiza todos os inimigos e remove os mortos (agendando o reaparecimento) */
export function updateEnemies(dt) {
  updateMedusaFx(dt);   // veneno da Medusa e fim da petrificação
  updateHead(dt);       // cabeça da Medusa: recarga e efeito do cone
  enemies.forEach(e => updateEnemy(e, dt));
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead > 1.2) {
      if (!enemies[i].dun) respawns.push({ k: enemies[i].k, x: enemies[i].hx, z: enemies[i].hz, t: RESPAWN_TIME, pat: enemies[i].pat, lv: enemies[i].lv, ep: enemies[i].elite ? 1 : 0 });
      scene.remove(enemies[i].g);
      enemies.splice(i, 1);
    }
  }
}

/** Contagem regressiva dos reaparecimentos (espera o jogador se afastar 9 m do local) */
export function updateRespawns(dt) {
  if (P.dead) return;
  for (let i = respawns.length - 1; i >= 0; i--) {
    const q = respawns[i];
    q.t -= dt;
    if (q.t <= 0) {
      if (Math.hypot(q.x - P.x, q.z - P.z) < 9) { q.t = 3; continue; }
      respawns.splice(i, 1);
      spawn(q.k, q.x, q.z, q.pat, { lv: q.lv, elite: q.ep ? Math.random() < .5 : Math.random() < .06 && !ENEMY_KINDS[q.k].boss });   // elite pode voltar comum e vice-versa
      if (q.k === KIND.BOSS) log('O Capitão Maldito ressurgiu!');
    }
  }
}
