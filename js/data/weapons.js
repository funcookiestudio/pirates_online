/* Catálogo de armas e nomes de raridade/armadura.
   b = dano base · rng = alcance · cd = recarga · mul = multiplicador de dano
   arc = abertura do golpe (corpo a corpo) · gun = arma de fogo · sp = velocidade da bala
   hp = onde as mãos seguram a arma de fogo · ml = comprimento até a boca do cano
   reload = recarrega apoiando a arma no chão durante a recarga (cd) · big = arma grande: mira apoiada no ombro (sb = mão do gatilho → coronha, fs = mão do gatilho → mão da frente) */
import { wb, grp } from '../core/utils.js';
import { EXTRA } from './weapons-extra.js';

const ST = 0xd8dce0, BR = 0xb08a30, WD = 0x6a4020, LT = 0x3a2412, GN = 0x44464a;

/** Monta o modelo de uma arma de fogo: comprimento, espessura, coronha, boca larga, baioneta */
const gunBuilder = (len, bw, stock, muz, bay) => () => {
  const g = grp(
    wb(bw, len, bw, GN, 0, -len / 2 - .05, 0),
    wb(.08, .12, .1, 0x6a6a6a, 0, -.02, .05),
    wb(.03, .06, .07, ST, 0, 0, .11),
    wb(.08, stock, .1, WD, 0, stock / 2 - .02, -.07),
    wb(.09, .05, .11, BR, 0, stock - .02, -.08)
  );
  if (muz) g.add(wb(muz, .12, muz, 0x6a5a2a, 0, -len - .05, 0));
  if (bay) g.add(wb(.02, .28, .02, ST, 0, -len - .2, 0));
  (bay ? [.3, .65] : []).forEach(b => g.add(wb(bw + .02, .04, bw + .02, BR, 0, -b, 0)));
  return g;
};

export const WEAPONS = [
  {
    n: 'Cutelo Pirata', b: 2, rng: 2.2, cd: .5, mul: 1, arc: 1.8,
    build: () => grp(
      wb(.08, .28, .08, WD, 0, -.14, 0),
      wb(.05, .55, .22, ST, 0, -.55, 0),
      wb(.07, .55, .05, 0x9aa0a8, 0, -.55, -.11)
    ),
  },
  {
    n: 'Sabre do Corsário', b: 3, rng: 2.4, cd: .45, mul: 1.05, arc: 2,
    build: () => {
      const g = grp(
        wb(.07, .25, .07, LT, 0, -.12, 0),
        wb(.3, .05, .08, BR, 0, -.27, 0),
        wb(.05, .16, .05, BR, 0, -.2, .07)
      );
      for (let i = 0; i < 4; i++) g.add(wb(.05, .28, .07, ST, 0, -.42 - i * .27, i * i * .012));
      g.add(wb(.04, .12, .05, ST, 0, -1.4, .12));
      return g;
    },
  },
  {
    // chop = golpe de cima para baixo; guarda com o cabo para cima (a mão segura o cabo, o fio fica em -z)
    // imp = momento do impacto (s) depois de iniciar o golpe
    n: 'Machado de Abordagem', b: 4, rng: 2.2, cd: .85, mul: 1.7, arc: 2.6, chop: 1, imp: .2,
    build: () => grp(
      wb(.07, .95, .07, WD, 0, -.22, 0),          // cabo (a mão fica a ~1/4 da ponta de baixo)
      wb(.06, .32, .36, ST, 0, -.55, -.17),       // lâmina
      wb(.07, .2, .12, 0x555a60, 0, -.55, .1),    // costas do machado
      wb(.09, .06, .09, BR, 0, .13, 0)            // contra-peso na base
    ),
  },
  {
    n: 'Florete do Duelista', b: 2, rng: 2.9, cd: .3, mul: .7, arc: .7,
    build: () => grp(
      wb(.06, .2, .06, LT, 0, -.1, 0),
      wb(.24, .04, .24, BR, 0, -.22, 0),
      wb(.03, 1.15, .03, ST, 0, -.82, 0),
      wb(.07, .07, .07, BR, 0, .02, 0)
    ),
  },
  {
    n: 'Pistola de Sílex', b: 4, gun: 1, rng: 12, cd: .7, mul: 1.4, sp: 40, hp: [0, .31], ml: .6,
    build: gunBuilder(.5, .06, .16, 0, 0),
  },
  {
    n: 'Bacamarte', b: 6, gun: 1, rng: 8, cd: 1.3, mul: 2.4, sp: 30, splash: 1, hp: [.1, .38],
    big: 1, sb: .28, fs: .26, ml: .8,
    build: gunBuilder(.55, .08, .3, .2, 0),
  },
  {
    n: 'Mosquete com Baioneta', b: 7, gun: 1, rng: 16, cd: 5, mul: 2.2, sp: 55, hp: [.14, .4],
    reload: 1, big: 1, sb: .3, fs: .26, ml: 1.15,
    build: gunBuilder(1, .05, .32, 0, 1),
  },
  {
    // item de segunda mão: só com armas de 1 mão; acende o caminho e queima um pouco (bônus de ataque menor)
    n: 'Tocha', b: 1, torch: 1, rng: 0, cd: 1, mul: 0, arc: 0,
    build: () => {
      const g = grp(wb(.07, .62, .07, WD, 0, -.2, 0), wb(.11, .1, .11, LT, 0, .13, 0));
      const f = new THREE.Mesh(new THREE.ConeGeometry(.12, .34, 5), new THREE.MeshBasicMaterial({ color: 0xff9a28 }));
      f.position.y = .33; g.add(f);
      const c = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 5), new THREE.MeshBasicMaterial({ color: 0xffe070 }));
      c.position.y = .3; g.add(c);
      return g;
    },
  },
];

/* Armas extras (lâminas, duas mãos, contundentes e de arremesso): anexadas ao fim para não mudar os índices salvos.
   Duas mãos de corpo a corpo reutilizam `big` (mão 2 ocupada, tocha some, vai nas costas). */
EXTRA.forEach(w => { if (w.two) w.big = 1; WEAPONS.push(w); });
export const BASE_WEAPONS = WEAPONS.length - EXTRA.length;

/** Nomes das raridades (índice = qualidade 1..3) */
export const RN = ['', 'Comum', 'Mágico', 'Lendário'];

/** Nomes das armaduras (índice = qualidade - 1) */
export const AN = ['Colete de Couro', 'Casaco de Capitão', 'Armadura do Kraken'];
