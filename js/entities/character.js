/* Corpo "de blocos" usado pelo jogador, NPCs e inimigos: humanos com skins e esqueleto (ver human.js). */
import { buildHuman, buildSkeleton, SKM, SKF, hideSword } from './human.js';
export { hideSword };

/**
 * Cria um humanoide.
 *  person(pele, camisa, calça, chapéu)           → pirata masculino (jogador); `camisa` pinta o casaco
 *  person(pele, camisa, calça, chapéu, spec)     → spec = { sk: 'pirata'|'taberneiro'|'ferreiro'|'fazendeiro'|'alquimista', f: feminino?, ov: {…} sobrescreve a skin }
 * Retorna um Group com: legL, legR (com .knee e .foot), arm (braço da arma, .fa), armL (braço livre, .fa),
 * up (tronco, pivô no quadril), head, eyeL, eyeR, feather.
 */
export function person(skin, shirt, pants, hat, spec) {
  if (spec) {
    const d = Object.assign({}, (spec.f ? SKF : SKM)[spec.sk || 'pirata'] || (spec.f ? SKM : SKF)[spec.sk], spec.ov || {});
    if (spec.ov && spec.ov.skin === undefined && skin !== undefined && spec.useSkin) d.skin = skin;
    return buildHuman(!!spec.f, d);
  }
  const d = Object.assign({}, SKM.pirata, { skin });
  if (shirt !== 0x8b2e2e) Object.assign(d, { t: shirt, fl: shirt, u: shirt, f: shirt });
  return buildHuman(false, d);
}

/** Corpo do jogador: pirata (masculino) ou pirata (feminino), com o mesmo esqueleto/rig */
export function playerModel(female) {
  return female ? person(0xe0b48a, 0, 0, 0, { sk: 'pirata', f: true, ov: { skin: 0xe0b48a } }) : person(0xe0b48a, 0x8b2e2e, 0x2e3a5a, 0x1a1a1a);
}

/** Inimigo do tipo `t` (ENEMY_KINDS): esqueletos usam o esqueleto; os demais, humanos pintados com as cores do tipo */
export function enemyModel(t) {
  const [sk, sh, pa, ht] = t.c;
  if (/Esqueleto/.test(t.n)) return buildSkeleton({ bone: sk, armor: /Guerreiro/.test(t.n) });
  const base = { skin: sk, t: sh, fl: undefined, u: sh, f: sh, pa, st: pa, sh: 0x1d1d22, hc: ht, hair: ht, belt: 0x2a2018, buck: 0, cuff: 0, vest: 0, ex: [] };
  const look = {
    'Pirata Fantasma': { hat: 'tri', fl: sh, ex: ['jabot'] },
    'Capitão Maldito': { hat: 'tri', fl: sh, vest: 0xe9d9a8, cuff: 0xe0b84a, buck: 1, ex: ['jabot', 'patch', 'mo'] },
    'Grumete Zumbi': { hat: 'cap', ex: ['neck'] },
    'Contrabandista': { hat: 'hood', ex: ['bag'] },
    'Sombra das Ondas': { hat: 'hood', ex: [] },
    'Corsário Amaldiçoado': { hat: 'tri', fl: sh, cuff: 0xe0b84a, ex: ['jabot', 'mo'] },
    'Brutamontes Naufragado': { hat: 'band', bd: [0x2b2018, .32], ex: ['soot'] },
  }[t.n] || { hat: 'band', ex: [] };
  return buildHuman(false, Object.assign(base, look));
}

/** Dobra os joelhos e o braço livre conforme a fase do passo (ph) e a intensidade (m) */
export function bend(g, ph, m) {
  const c = Math.cos(ph), w = Math.sin(ph);
  const ld = (q) => Math.max(0, Math.sin(q - .2)) * .16;   // joelho amortece o apoio
  g.legL.knee.rotation.x = (Math.max(0, -c) * .95 + .05) * m + ld(ph + 1.57) * m;
  g.legR.knee.rotation.x = (Math.max(0, c) * .95 + .05) * m + ld(ph - 1.57) * m;
  g.armL.fa.rotation.x = -.15 - m * (.2 + .5 * Math.max(0, w));
}
