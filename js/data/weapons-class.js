/* Armas das classes (anexadas ao FIM de WEAPONS: os índices salvos não mudam): espada longa, adagas gêmeas, arcos, bestas, cajados e rods.
   Convenção do modelo: empunhadura na origem, ponta para -y. Arco: os braços ficam no eixo x, a flecha sai para -y (a pose `bowPose` cuida do resto).
   Campos novos: bow/xbow = usa flechas/virotes (P.arrows / P.bolts) · magic = projétil mágico, gasta `mp` de mana e usa P.cls.magic
   · bk = guardada nas costas · lh = a mão da frente segura a arma (cajado) · col = cor do projétil mágico · cls = classe a que o auto-loot dá preferência
   · kb = multiplicador de empurrão do golpe. Armas com `lv` caem como loot; `shop` = vendida no ferreiro. */
import { wb, grp } from '../core/utils.js';

const ST = 0xd8dce0, BR = 0xb08a30, WD = 0x6a4020, LT = 0x3a2412, DK = 0x4a4438;
const T = THREE;
const bm = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: o !== undefined, opacity: o === undefined ? 1 : o });
const part = (g, m, x, y, z) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; };

/** Arco: braços (x) curvos em 3 segmentos, empunhadura no centro, corda e flecha encaixada (animadas por bowString) */
const bowBuilder = (half, wood, th) => () => {
  const g = grp(wb(.07, .22, .08, LT, 0, 0, 0));
  const tipX = half * .94, tipY = half * .22;
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
    const u = (i + .5) / 3, seg = wb(half / 3 + .02, th, th * 1.1, wood, s * half * u, half * .22 * u * u, 0);
    seg.rotation.z = s * -Math.atan2(2 * half * .22 * u, half) * .9;
    g.add(seg);
  }
  const mk = () => new T.Mesh(new T.BoxGeometry(.012, .012, 1), bm(0xe8dcc0));
  const s1 = mk(), s2 = mk(), ar = new T.Group();
  const shaft = part(new T.BoxGeometry(.02, 1, .02), bm(0xcaa66a), 0, 0, 0), tip = part(new T.ConeGeometry(.035, .1, 4).rotateX(Math.PI), bm(0xdde3e8), 0, -.5, 0);
  ar.add(shaft, tip);
  g.add(s1, s2, ar);
  g.userData.bow = { s1, s2, ar, shaft, tip, tx: tipX, ty: tipY };
  bowString(g, 0);
  return g;
};
/** Corda e flecha: `pull` 0 (solta) … 1 (esticada). A corda vai do ponto de encaixe (0, ny) às duas pontas; y positivo = para trás, para o arqueiro */
const Z = new T.Vector3(0, 0, 1), _d = new T.Vector3();
export function bowString(g, pull, arrow) {
  const b = g.userData.bow;
  if (!b) return;
  const ny = b.ty + .05 + pull * .34;
  [[b.s1, 1], [b.s2, -1]].forEach(([m, sgn]) => {
    const dx = sgn * b.tx, dy = b.ty - ny, l = Math.hypot(dx, dy) || .01;
    m.position.set(dx / 2, (b.ty + ny) / 2, 0);
    m.scale.set(1, 1, l);
    m.quaternion.setFromUnitVectors(Z, _d.set(dx / l, dy / l, 0));
  });
  const len = .75;   // flecha encaixada: da corda para a frente (-y)
  b.ar.visible = arrow !== false && pull > .02;
  b.ar.position.set(0, ny - len / 2 + .06, 0);
  b.shaft.scale.set(1, len, 1);
  b.tip.position.y = -len / 2 - .02;
}

/** Besta: coronha e trilho (-y), arco curto no meio e virote no trilho */
const xbowBuilder = (len, span, wood, bolt) => () => {
  const g = grp(
    wb(.06, len, .08, WD, 0, -len / 2 + .1, 0),
    wb(.07, .2, .1, LT, 0, .1, -.03),
    wb(span, .045, .05, wood, 0, -len * .62, 0),
    wb(.02, len * .8, .02, 0xcaa66a, 0, -len * .42, .05),
    wb(span * .5, .012, .012, 0xe8dcc0, 0, -len * .52, .05),
    wb(.015, .015, len * .5, 0x8a8a8a, 0, -len * .46 + 0, .06)
  );
  [1, -1].forEach(s => { const e = wb(.05, .08, .05, DK, s * span / 2, -len * .62 + .02, 0); g.add(e); });
  const bl = part(new T.BoxGeometry(.02, len * .55, .02), bm(0xcaa66a), 0, -len * .38, .05), bt = part(new T.ConeGeometry(.03, .09, 4).rotateX(Math.PI), bm(0xdde3e8), 0, -len * .38 - len * .55 / 2 - .04, .05);
  g.add(bl, bt);
  g.userData.bolt = [bl, bt];
  return g;
};

/** Cajado/rod: haste + ponta com orbe brilhante (g.userData.orb pulsa ao conjurar) */
const staffBuilder = (len, wood, col, head) => () => {
  const g = grp(wb(.055, len, .055, wood, 0, -len / 2 + .3, 0), wb(.075, .1, .075, BR, 0, .02, 0));
  const orb = part(new T.SphereGeometry(.11, 8, 6), bm(col), 0, -len + .3 - .1, 0);
  const halo = part(new T.SphereGeometry(.17, 8, 6), bm(col, .3), 0, -len + .3 - .1, 0);
  g.add(orb, halo);
  const cage = head || 0;
  for (let i = 0; i < cage; i++) { const a = i / cage * 6.283; g.add(wb(.03, .2, .03, BR, Math.sin(a) * .1, -len + .3 - .02, Math.cos(a) * .1)); }
  g.userData.orb = orb; g.userData.halo = halo;
  return g;
};
const rodBuilder = (len, col, flame) => () => {
  const g = grp(wb(.045, len, .045, 0x3a3240, 0, -len / 2 + .12, 0), wb(.07, .12, .07, BR, 0, .02, 0), wb(.065, .05, .065, BR, 0, -len + .2, 0));
  const orb = flame ? part(new T.ConeGeometry(.1, .3, 5).rotateX(Math.PI), bm(col), 0, -len + .18 - .15, 0) : part(new T.OctahedronGeometry(.11, 0), bm(col), 0, -len + .1 - .05, 0);
  const halo = part(new T.SphereGeometry(.16, 8, 6), bm(col, .28), 0, orb.position.y, 0);
  g.add(orb, halo);
  g.userData.orb = orb; g.userData.halo = halo;
  return g;
};

/** Escudo: vai na mão livre (eq.off); o braço o leva. `sdr` = redução de dano extra ao equipar */
const shieldBuilder = (w, h, col, rim) => () => grp(
  wb(w, h, .05, col, 0, -.12, 0), wb(w + .06, .05, .07, rim, 0, -.12 + h / 2, 0), wb(w + .06, .05, .07, rim, 0, -.12 - h / 2, 0),
  wb(.05, h + .05, .07, rim, w / 2, -.12, 0), wb(.05, h + .05, .07, rim, -w / 2, -.12, 0), wb(.12, .12, .09, rim, 0, -.12, .03)
);

export const CLASS_WEAPONS = [
  {   // Guerreiro: espada longa, golpe de cima para baixo com empurrão
    n: 'Espada Longa de Ferro', b: 3, rng: 2.5, cd: .6, mul: 1.3, arc: 2, chop: 1, imp: .2, kb: 1.4, lv: 1, cls: 'guerreiro',
    build: () => grp(
      wb(.07, .3, .07, LT, 0, -.15, 0), wb(.1, .07, .1, BR, 0, .03, 0), wb(.36, .05, .1, BR, 0, -.31, 0),
      wb(.05, 1.15, .09, ST, 0, -.93, 0), wb(.02, 1.1, .11, 0xf0f4f8, 0, -.93, 0), wb(.05, .08, .08, ST, 0, -1.54, 0)
    ),
  },
  {   // Ladino: duas adagas rápidas (um só modelo, uma em cada lado da mão)
    n: 'Adagas Gêmeas', b: 2, rng: 1.9, cd: .28, mul: .65, arc: 1.3, crit: .2, bleed: .3, lv: 1, cls: 'ladino',
    build: () => {
      const dag = x => {
        const d = grp(wb(.05, .16, .05, LT, 0, -.08, 0), wb(.14, .03, .06, BR, 0, -.17, 0), wb(.035, .42, .08, ST, 0, -.4, 0), wb(.02, .4, .09, 0xf0f4f8, 0, -.4, 0));
        d.position.x = x; d.rotation.z = -x * 1.6; return d;
      };
      return grp(dag(.07), dag(-.07));
    },
  },
  {   // Ladino: adaga simples, uma na mão principal e outra na mão livre
    n: 'Adaga Afiada', b: 2, rng: 1.8, cd: .28, mul: .65, arc: 1.2, crit: .2, bleed: .3, lv: 1, shop: 1, cls: 'ladino',
    build: () => grp(wb(.05, .16, .05, LT, 0, -.08, 0), wb(.14, .03, .06, BR, 0, -.17, 0), wb(.035, .42, .08, ST, 0, -.4, 0), wb(.02, .4, .09, 0xf0f4f8, 0, -.4, 0)),
  },
  { n: 'Escudo de Madeira', b: 1, shield: 1, sdr: .08, rng: 0, cd: 1, mul: 0, arc: 0, lv: 1, shop: 1, cls: 'guerreiro', build: shieldBuilder(.46, .56, 0x7a4a26, 0xb08a30) },
  { n: 'Arco Curto', b: 3, gun: 1, bow: 1, bk: 1, rng: 14, cd: .65, mul: 1.15, sp: 40, hp: [0, .31], ml: .3, lv: 1, shop: 1, cls: 'cacador', build: bowBuilder(.55, WD, .045) },
  { n: 'Arco Longo', b: 5, gun: 1, bow: 1, bk: 1, rng: 18, cd: 1, mul: 1.7, sp: 50, hp: [0, .31], ml: .3, lv: 8, shop: 1, cls: 'cacador', build: bowBuilder(.8, 0x8a5a2a, .055) },
  { n: 'Besta Leve', b: 4, gun: 1, xbow: 1, rng: 13, cd: 1.1, mul: 1.6, sp: 48, hp: [0, .31], ml: .3, lv: 6, shop: 1, cls: 'cacador', build: xbowBuilder(.62, .46, WD, 0) },
  { n: 'Besta Pesada', b: 7, gun: 1, xbow: 1, rng: 15, cd: 1.8, mul: 2.4, sp: 56, hp: [0, .31], ml: .3, lv: 14, shop: 1, cls: 'cacador', build: xbowBuilder(.78, .64, 0x4a2c18, 0) },
  { n: 'Cajado do Aprendiz', b: 2, gun: 1, magic: 1, mp: 4, bk: 1, lh: 1, rng: 11, cd: .8, mul: 1.1, sp: 30, col: 0x6ab8ff, hp: [0, .31], ml: 1.25, lv: 1, shop: 1, cls: 'mago', build: staffBuilder(1.5, WD, 0x6ab8ff, 0) },
  { n: 'Cajado de Carvalho', b: 5, gun: 1, magic: 1, mp: 6, bk: 1, lh: 1, rng: 12, cd: .85, mul: 1.6, sp: 32, col: 0x9be85a, hp: [0, .31], ml: 1.35, lv: 8, shop: 1, cls: 'mago', build: staffBuilder(1.6, 0x5a3a1a, 0x9be85a, 4) },
  { n: 'Rod de Cristal', b: 4, gun: 1, magic: 1, rod: 1, mp: 4, rng: 11, cd: .55, mul: 1.2, sp: 38, col: 0xc890ff, hp: [0, .31], ml: .6, lv: 10, shop: 1, cls: 'mago', build: rodBuilder(.7, 0xc890ff, 0) },
  { n: 'Rod das Chamas', b: 8, gun: 1, magic: 1, rod: 1, mp: 7, rng: 11, cd: .6, mul: 1.9, sp: 34, splash: 1, col: 0xff7a20, hp: [0, .31], ml: .6, lv: 16, shop: 1, cls: 'mago', build: rodBuilder(.7, 0xff7a20, 1) },
];
