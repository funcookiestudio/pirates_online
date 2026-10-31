/* Vínculo com os bichos da ilha (3 gatos e 2 cachorros): carinho e petiscos de tempos em tempos enchem 5 corações (0–100 pontos).
   Com 5 corações o bicho pode ser adotado e vira companheiro (um cachorro e um gato). Depois da adoção o mesmo medidor vira o HUMOR:
   cai um pouco a cada dia do jogo; acima de 60 dá bônus, abaixo de 20 o companheiro fica emburrado e não ataca (nunca foge).
   O tempo do vínculo é próprio (horas de jogo acumuladas e salvas), separado do relógio dos NPCs, que recomeça a cada sessão. */
import { state } from '../core/state.js';
import { DAY_SECONDS } from '../core/clock.js';
import { emit } from '../core/events.js';
import { PST } from '../pets/stats.js';
import { puff } from './effects.js';
import { log } from '../ui/notify.js';

/** Bichos que podem ser adotados (id = pelagem; o 2º de mesma pelagem ganha "2" no id) */
export const ANIMALS = {
  laranja: { kind: 'cat', n: 'Laranja', fav: 'peixe' },
  preto: { kind: 'cat', n: 'Fumaça', fav: 'peixe' },
  tuxedo: { kind: 'cat', n: 'Tuxedo', fav: 'peixe' },
  caramelo: { kind: 'dog', n: 'Caramelo', fav: 'osso' },
  pastor: { kind: 'dog', n: 'Pastor', fav: 'osso' },
};
export const info = id => ANIMALS[id] || ANIMALS[String(id).replace(/\d+$/, '')] || { kind: 'cat', n: 'Gato', fav: 'peixe' };
export const animalName = id => info(id).n + (/\d$/.test(id) ? ' II' : '');
export const coatOf = id => String(id).replace(/\d+$/, '');

/** Petiscos (contadores no jogador, como penas e couro) */
export const TREATS = { peixe: { n: 'Peixe seco', ic: '🐾' }, osso: { n: 'Osso com carne', ic: '🐾' } };   // (ícone de pata: a interface não usa emojis)

export const PET_MAX = 2;         // carinhos que contam por dia, por bicho
export const PET_GAIN = 6, PET_LONG = 2, PET_MIN_S = 3, PET_LONG_S = 8;   // +6 ao afagar 3 s · +2 extra se afagar 8 s
export const FEED_GAIN = 12, FEED_FAV = 18;
const FORGET_DAYS = 3, FORGET = 5;     // antes da adoção: depois de 3 dias sem visita perde 5 por dia (sem perder coração completo)
const MOOD_DECAY = 25;                // depois da adoção: humor cai 25 por dia do jogo
export const MOOD_GOOD = 60, MOOD_SULK = 20;
const STREAK_DAYS = 7;                // 7 dias seguidos com humor alto: +1 ponto de habilidade (uma vez)

export const BOND = {
  h: 0,                       // horas de jogo acumuladas (o "dia" do vínculo = h / 24)
  data: {},                   // id → { b, last, pd, pn, fd, st, bonus }
  adopt: { dog: null, cat: null },
  hint: false,                // já mostrou a explicação do sistema
};

export const bondDay = () => Math.floor(BOND.h / 24);
export function rec(id) {
  return BOND.data[id] || (BOND.data[id] = { b: 0, last: bondDay(), pd: -1, pn: 0, fd: -1, st: 0, bonus: false });
}
export const hearts = id => Math.min(5, Math.floor(rec(id).b / 20));
export const heartStr = id => '❤ ' + hearts(id) + '/5';   // (a interface troca emojis por ícones: ❤ vira o ícone de coração)
export const adopted = id => BOND.adopt.dog === id || BOND.adopt.cat === id;
/** Id do bicho adotado que está como companheiro `kind` ('dog' | 'cat') */
export const adoptedOf = kind => BOND.adopt[kind];

/** Estágio de confiança (0 desconfiado … 5 pronto para adotar) */
export const stage = id => hearts(id);
export const STAGES = ['Desconfiado', 'Curioso', 'Amigo', 'Companheiro de visita', 'Leal', 'Pronto para adotar'];

export const petsLeft = id => { const r = rec(id); return r.pd === bondDay() ? Math.max(0, PET_MAX - r.pn) : PET_MAX; };
export const fedToday = id => rec(id).fd === bondDay();

/** Humor do companheiro (só bichos adotados): state.petMood[kind] lido pelos bônus em stats.js e common.js */
function syncMood() {
  state.petMood = {};
  ['dog', 'cat'].forEach(k => { const id = BOND.adopt[k]; if (id) state.petMood[k] = rec(id).b; });
}

function gain(id, n, at) {
  const r = rec(id), h0 = hearts(id);
  r.b = Math.min(100, r.b + n);
  r.last = bondDay();
  const h1 = hearts(id);
  if (at) for (let i = 0; i < 2 + (h1 > h0 ? 4 : 0); i++) puff(at.x, 1 + Math.random() * .4, at.z, 0xff6090, 2, 3);
  const nm = animalName(id);
  if (adopted(id)) log(nm + ': humor ' + Math.round(r.b) + '% · ' + heartStr(id));
  else if (h1 > h0) log(nm + ' confia mais em você: ' + heartStr(id) + ' · ' + STAGES[h1] + (h1 === 5 ? ' (pode adotar!)' : ''));
  else log(nm + ': ' + heartStr(id) + ' (' + Math.round(r.b) + '/100)');
  syncMood();
  emit('pets:changed');
}

/** Carinho terminado: `secs` = tempo com a mão na cabeça do bicho. Devolve o ganho (0 se não contou) */
export function petDone(id, secs, at) {
  if (!id || secs < PET_MIN_S) return 0;
  const r = rec(id), d = bondDay();
  if (r.pd !== d) { r.pd = d; r.pn = 0; }
  if (r.pn >= PET_MAX) { r.last = d; log(animalName(id) + ' adorou o carinho, mas hoje já ganhou o bastante'); return 0; }
  r.pn++;
  const n = PET_GAIN + (secs >= PET_LONG_S ? PET_LONG : 0);
  gain(id, n, at);
  return n;
}

/** Pode dar o petisco `t` agora? (motivo em texto quando não pode) */
export function canFeed(id, t, P) {
  if (fedToday(id)) return 'já comeu hoje';
  if (!P[t]) return 'sem ' + TREATS[t].n.toLowerCase();
  return '';
}
/** Petisco comido: +12 (ou +18 se for o preferido), uma vez por dia */
export function fedDone(id, t, at) {
  const r = rec(id);
  r.fd = bondDay();
  const fav = info(id).fav === t;
  gain(id, fav ? FEED_FAV : FEED_GAIN, at);
  if (fav) log(TREATS[t].ic + ' ' + animalName(id) + ' adorou! É o petisco preferido');
}

/** Adota o bicho `id`: vira o companheiro do tipo dele (o anterior do mesmo tipo volta para casa, com o vínculo guardado) */
export function adopt(id) {
  const k = info(id).kind, prev = BOND.adopt[k];
  BOND.adopt[k] = id;
  state.owned[k] = true;
  rec(id).st = 0;
  syncMood();
  return prev && prev !== id ? prev : null;
}

/** Virada de dia do vínculo: esquecimento (antes da adoção), queda de humor e sequência de dias felizes (depois) */
function rollover(day) {
  Object.keys(BOND.data).forEach(id => {
    const r = BOND.data[id];
    if (adopted(id)) {
      r.st = r.b >= 80 ? r.st + 1 : 0;
      if (r.st >= STREAK_DAYS && !r.bonus) {
        const k = info(id).kind;
        r.bonus = true;
        if (PST[k]) PST[k].pts++;
        log('🏆 ' + animalName(id) + ' e você são Melhores Amigos! (+1 ponto de habilidade)');
      }
      const was = r.b;
      r.b = Math.max(0, r.b - MOOD_DECAY);
      if (was >= MOOD_SULK && r.b < MOOD_SULK) log('😾 ' + animalName(id) + ' está emburrado: precisa de carinho e petisco');
    } else if (day - r.last > FORGET_DAYS && r.b > 0) {
      r.b = Math.max(Math.floor(r.b / 20) * 20, r.b - FORGET);
    }
  });
  syncMood();
  emit('pets:changed');
}

/** Avança o tempo do vínculo (chamado todo quadro) */
export function updateBond(dt) {
  const d0 = bondDay();
  BOND.h += dt * 24 / DAY_SECONDS;
  const d1 = bondDay();
  for (let d = d0 + 1; d <= d1; d++) rollover(d);
}

export function saveBond() {
  return { h: +BOND.h.toFixed(3), data: BOND.data, adopt: BOND.adopt, hint: BOND.hint };
}
export function loadBond(s) {
  if (!s || typeof s !== 'object') { syncMood(); return; }
  if (Number.isFinite(s.h)) BOND.h = s.h;
  if (s.data && typeof s.data === 'object') Object.keys(s.data).forEach(id => {
    const q = s.data[id]; if (!q || !Number.isFinite(q.b)) return;
    BOND.data[id] = { b: Math.max(0, Math.min(100, q.b)), last: q.last | 0, pd: Number.isFinite(q.pd) ? q.pd : -1, pn: q.pn | 0, fd: Number.isFinite(q.fd) ? q.fd : -1, st: q.st | 0, bonus: !!q.bonus };
  });
  if (s.adopt) ['dog', 'cat'].forEach(k => { if (typeof s.adopt[k] === 'string') BOND.adopt[k] = s.adopt[k]; });
  BOND.hint = !!s.hint;
  syncMood();
}
