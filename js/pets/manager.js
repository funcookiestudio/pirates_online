/* Gerenciador de companheiros: troca de pet, liga/desliga ataque, vida do pet e atualização por frame. */
import { state } from '../core/state.js';
import { emit } from '../core/events.js';
import { PETLIST } from '../data/pets.js';
import { P } from '../entities/player.js';
import { puff } from '../systems/effects.js';
import { log } from '../ui/notify.js';
import { refreshPetButton } from '../ui/hotbar.js';
import { PST, PV, pmax } from './stats.js';
import { inCombat, petFighting } from './common.js';
import { PAR, FLY_MODELS, flyerUpd, activateFlyer, dropCarried, hideFlyers } from './flyer.js';
import { MON, monkeyUpd, resetMonkey, dropMonkeyCarried } from './monkey.js';
import { DOG, dogUpd, resetDog } from './dog.js';

const isDog = id => id === 'dog' || id === 'rat';   // cachorro e rato compartilham o comportamento terrestre

/** Posição 3D do companheiro ativo */
export function petPos() {
  const id = state.pet.id;
  return id === 'monkey' ? MON.g.position : isDog(id) ? DOG.g.position : PAR.g.position;
}

/** O companheiro está pousado/sentado no ombro (seguro de ataques)? */
export function petPerched() {
  const id = state.pet.id;
  return id === 'monkey' ? MON.s === 'perch' : isDog(id) ? false : PAR.s === 'perch';
}

/** Companheiro recebe dano; ao chegar a 0 de vida desmaia por 20 s */
export function hurtPet(d) {
  const s = PST[state.pet.id];
  if (s.dn > 0 || P.dead) return;
  s.hp -= d;
  const p = petPos();
  puff(p.x, 1.2, p.z, 0xc02020, 3, 3);
  if (s.hp <= 0) {
    s.hp = 0;
    s.dn = 20;
    log('💤 ' + state.pet.ic + ' ' + state.pet.n + ' desmaiou! Volta em 20s');
  }
}

/** Tecla R: alterna entre "só acompanha/coleta" e "ataca também" */
export function togglePet() {
  state.petAttack = !state.petAttack;
  refreshPetButton();
  const pet = state.pet, dog = isDog(pet.id);
  log(pet.ic + ' ' + pet.n + (state.petAttack
    ? ': ataca' + (dog ? '' : ' e coleta (só coleta fora de combate)')
    : (dog ? ': só acompanha' : ': somente coleta')));
}

export const HAPPY_TIME = 1.8;

/** Animação feliz ao ser equipado: pula, balança de alegria e solta corações (por cima da animação normal) */
function happyFx(dt, g) {
  if (state.petHappy <= 0) return;
  const k = state.petHappy / HAPPY_TIME, env = Math.min(1, k * 2.5), t = (1 - k) * HAPPY_TIME;
  g.position.y += Math.abs(Math.sin(t * 7)) * .5 * env;
  g.rotation.z = Math.sin(t * 16) * .22 * env;
  state.petHappy -= dt;
  state.hh = (state.hh || 0) - dt;
  if (state.hh <= 0) {
    state.hh = .3;
    const w = g.getWorldPosition(new THREE.Vector3());
    puff(w.x, w.y + .7, w.z, 0xff6090, 2, 5);
  }
  if (state.petHappy <= 0) g.rotation.z = 0;
}

/** Troca o companheiro ativo */
export function setPet(id) {
  const n = PETLIST.find(p => p.id === id);
  if (!n || n === state.pet) return;

  // quem estava carregando loot entrega antes de sair
  dropCarried();
  dropMonkeyCarried();
  hideFlyers();
  MON.g.visible = false;
  DOG.g.visible = false;

  state.pet = n;
  if (FLY_MODELS[id]) activateFlyer(id);
  else if (id === 'monkey') resetMonkey();
  else resetDog(id);

  puff(P.x, 1.8, P.z, 0xffe060, 4, 10);
  state.petHappy = HAPPY_TIME;
  refreshPetButton();
  log(n.ic + ' ' + n.n + (isDog(id) ? ' agora acompanha você' : ' agora está com você'));
  emit('pets:changed');
}

/** Vida do pet, redução de dano para o jogador e o comportamento do pet ativo */
export function updatePets(dt, now) {
  const id = state.pet.id, s = PST[id], m = pmax(id);

  if (s.dn > 0) {
    s.dn -= dt;
    if (s.dn <= 0) {
      s.hp = m * .5;
      log(state.pet.ic + ' ' + state.pet.n + ' voltou à luta');
    }
  } else if (s.hp < m) {
    s.hp = Math.min(m, s.hp + m * (inCombat() ? .005 : .03) * dt);
  }

  P.dr = petFighting() ? Math.min(.5, PV('guard')) : 0;

  if (id === 'parrot' || id === 'raven') flyerUpd(dt, now);
  else if (id === 'monkey') monkeyUpd(dt, now);
  else dogUpd(dt, now);

  happyFx(dt, id === 'monkey' ? MON.g : isDog(id) ? DOG.g : PAR.g);
}
