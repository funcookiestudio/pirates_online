/* IA especial dos mortos-vivos das ilhas de ruínas (modelos em undead-model.js; tipos em data/enemies.js).
   · Vampiro / Conde: Investida Sombria (agacha, avisa e salta em linha reta sobre o jogador) e o golpe cura o vampiro (t.drain);
     o Conde alterna golpe normal e Enxame de Morcegos (pancada em área: ele paira de braços abertos, a capa abre e o anel vermelho avisa)
     e abaixo de 50% de vida fica furioso: mais rápido, mais dano e investidas mais frequentes.
   · Múmia / Faraó: a maldição das bandagens deixa o alvo lento (t.slow, ver player-update.js); o Faraó faz a Tempestade de Areia (pancada em área)
     e abaixo de 50% de vida se enfurece (mais dano, golpes mais rápidos).
   · Zumbi, Bandido e Caveira usam a IA comum de enemies.js: undeadThink só cuida do que é especial e chama `base` para o resto. */
import { state } from '../core/state.js';
import { P, hurtP } from './player.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';
import { takenMult } from '../data/scaling.js';

const DASH_PREP = .55, DASH_T = 1.1;

/** Prepara a instância recém-criada (spawn): tipo próprio (nome/velocidade mudam no chefe furioso) e recargas */
export function initUndead(e) {
  e.t = Object.assign({}, e.t);
  e.UD = { dcd: 2 + Math.random() * 3, power: 0, rage: false, dashed: false, hit: false };
}

/** Efeitos de um golpe que acertou o jogador (cura do vampiro, lentidão da múmia) */
export function undeadHitFx(e, dm) {
  const T = e.t;
  if (T.drain && P.roll <= 0) { e.hp = Math.min(e.max, e.hp + dm * T.drain); puff(e.x, 1.6, e.z, 0xc01030, 4, 8); }
  if (T.slow && P.roll <= 0) { P.slow = Math.max(P.slow || 0, T.slow); puff(P.x, 1.2, P.z, 0xd8caa2, 3, 5); }
}

export function undeadThink(e, dt, c, base) {
  const S = e.UD, T = e.t;
  c.reach = T.reach || c.reach; c.dur = T.dur || c.dur;
  S.dcd -= dt;
  if (T.lord && !S.rage && e.hp < e.max * .5) {
    S.rage = true; T.s *= 1.15; e.dmg = Math.round(e.dmg * 1.12);
    if (T.undead === 'vampire') { T.n = 'Conde Vampiro Enfurecido'; log('🦇 O Conde Vampiro ruge e uma nuvem de morcegos o envolve!'); puff(e.x, 2.5, e.z, 0x8a1030, 12, 24); }
    else { T.n = 'Faraó Enfurecido'; log('🏺 O Faraó Múmia desperta sua fúria, a areia gira à sua volta!'); puff(e.x, 2.5, e.z, 0xe0c070, 12, 24); }
    state.SHK = Math.max(state.SHK, .6);
  }
  if (e.st === 'dash') {   // investida sombria
    const el = DASH_T - e.tm;
    if (el < DASH_PREP) { S.dir = c.aim; }
    else {
      if (!S.dashed) { S.dashed = true; S.hit = false; e.kx += Math.sin(S.dir) * 30; e.kz += Math.cos(S.dir) * 30; puff(e.x, 1.2, e.z, 0x3a2450, 6, 10); }
      if (!S.hit && !P.dead && Math.hypot(P.x - e.x, P.z - e.z) < 2.3) { S.hit = true; const dm = e.dmg * 1.05 * takenMult(e.lv - P.lv); hurtP(dm, c.aim, 5); undeadHitFx(e, dm); }
    }
    if (e.tm <= 0) { e.st = 'rec'; e.tm = .6; e.cd = 1.1; S.dashed = false; S.dcd = (S.rage ? 3.5 : 5.5) + Math.random() * 2.5; }
    return [0, 0];
  }
  if (e.st === 'chase' && e.ag && !P.dead && T.dash && S.dcd <= 0 && c.d > T.dash[0] && c.d < T.dash[1] && !e.sn) {
    e.st = 'dash'; e.tm = DASH_T; S.dir = c.aim; S.dashed = false;
    return [0, 0];
  }
  return base(e, dt, c);
}

/** Intensidade (0..1) do "poder" do Conde: paira de braços abertos durante a pancada em área; usada pelo modelo (fx) */
export function undeadPower(e, dt) {
  const S = e.UD, want = e.t.lord && e.t.undead === 'vampire' && e.st === 'wind' && e.slam ? 1 : 0;
  S.power += (want - S.power) * (1 - Math.exp(-dt * (want ? 7 : 4)));
}
