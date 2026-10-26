/* Corpos "quadrados" (humanos com skins e esqueleto), importados das prévias "Skins – Personagens Quadrados (1720–1750)"
   e "Esqueleto Low Poly". Tudo é construído em unidades do modelo e reduzido por K, para que o quadril fique a .72 m do chão
   (a mesma altura do rig antigo): o resto do jogo (marcha, armas, montaria) continua valendo.
   Rig devolvido: legL/legR (.knee, .foot) · arm (braço da arma, -x, .fa) · armL (braço livre, +x, .fa) · up · head · eyeL/eyeR · feather · jaw */

export const K = .72 / 1.1;

const GOLD = 0xe0b84a, WHITE = 0xf4f0e6, WOOD = 0x6b4528;

/** Caixa chanfrada (quadrada, mas com relevo nas arestas) */
function bb(w, h, d, b, col) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, .001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col }));
}

/** Funde as malhas diretas de `grp` (menos as de `keep`) em uma só, com cor por vértice: poucas chamadas de desenho por personagem */
function fuse(grp, keep) {
  const meshes = grp.children.filter(c => c.isMesh && !keep.has(c));
  if (meshes.length < 2) return;
  const pos = [], nor = [], col = [];
  meshes.forEach(m => {
    m.updateMatrix();
    const geo = m.geometry.clone().applyMatrix4(m.matrix), n = geo.attributes.position.count, c = m.material.color;
    pos.push(...geo.attributes.position.array);
    nor.push(...geo.attributes.normal.array);
    for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b);
    geo.dispose();
    grp.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  });
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bg.parameters = {};
  grp.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true })));
  grp.children.unshift(grp.children.pop());
}

/* ---- skins ---- u/f: manga/antebraço (0 = pele) · st: meias/botas · hat: tri|straw|cap|band|kerch|hood|toque */
const PJC = 0xa88a58, PJD = 0x7a6238;
/** Roupa inicial: saco de batata rasgado (juta), sem chapéu, pés descalços */
export const PJM = { t: 0xddd2b4, u: 0xddd2b4, f: 0xddd2b4, pa: 0x76664a, cal: 1, bare: 1, st: 0, sh: 0x4a3524, belt: 0x4a3322, hc: 0x4a3524, hair: 0x4a2f20, ex: ['pM', 'ruff'] };   // camisa simples remendada, calça até a canela com remendos, gola com babados
export const PJF = { b: 0x6f7a68, fi: 0xe6dcc0, belt: 0x5a4430, sk: 0x7d8a76, hem: 0x68705e, u: 0xe6dcc0, f: 0, bare: 1, st: 0, sh: 0x5a4030, hc: 0x4a3524, hair: 0x8a3b2a, ex: ['pF'] };   // vestido de camponesa desbotado e remendado
export const SKM = {
  pirata: { t: 0x8a2433, fl: 0x8a2433, vest: 0xe9d9a8, belt: 0x2c4b78, u: 0x8a2433, f: 0x8a2433, cuff: GOLD, pa: 0xb59a6a, st: WHITE, sh: 0x1d1d22, buck: 1, hat: 'tri', hc: 0x1d1d22, hair: 0x4a2f20, ex: ['jabot', 'patch', 'mo'] },
  taberneiro: { t: 0xf1ead6, vest: 0x7a4a2b, belt: 0x3b2a1c, ap: WHITE, u: 0xf1ead6, f: 0, pa: 0x5b4a3a, st: 0xe9e2cc, sh: 0x3b2a1c, hat: 'cap', hc: WHITE, hair: 0x6b4a2f, mo: 0x6b4a2f, ex: ['towel'] },
  ferreiro: { t: 0x4a4a52, belt: 0x2a2018, ap: 0x6b4528, u: 0, f: 0, cuff: 0x3a2a1c, pa: 0x3b3b44, st: 0x2a2420, sh: 0x2a2420, hat: 'band', hc: 0xc23b3b, hair: 0x2b2018, bd: [0x2b2018, .32], ex: ['soot'] },
  fazendeiro: { t: 0xe8dcb8, belt: 0x5a3a28, u: 0xe8dcb8, f: 0xe8dcb8, pa: 0x6a5a3a, st: 0x8a6b3f, sh: 0x5a3a28, hat: 'straw', hc: 0xe3c26a, hair: 0x7a5a30, ex: ['susp', 'neck'] },
  alquimista: { t: 0x3b2a5c, fl: 0x3b2a5c, ap: 0x6b4528, belt: 0x5a3a28, u: 0x3b2a5c, f: 0x3b2a5c, cuff: GOLD, pa: 0x2a2438, st: 0x3a3347, sh: 0x1d1d22, hat: 'toque', hc: 0x2a1f3f, hair: 0x8a8070, bd: [0x9a9aa0, .45], ex: ['goggles', 'bag', 'bottles'] },
};
export const SKF = {
  pirata: { b: 0x24406b, lace: 1, fi: 0xe9d9a8, belt: 0x5a3a28, sk: 0x9c2f3b, hem: 0xe9d9a8, u: WHITE, ruf: 0xe9d9a8, f: 0, cuff: 0x5a3a28, st: WHITE, sh: 0x5a3a28, buck: 1, hat: 'kerch', hc: 0xc23b3b, hair: 0x8a3b2a, ex: ['earring'] },
  taberneiro: { b: 0x7a4a2b, lace: 1, fi: WHITE, sk: 0x9a4f2e, u: WHITE, f: 0, st: WHITE, sh: 0x3b2a1c, hat: 'cap', hc: WHITE, hair: 0x6b3a2a, ap: WHITE, bib: 1, ex: [] },
  ferreiro: { b: 0x4a4a52, belt: 0x2a2018, sk: 0x3b3b44, u: 0, f: 0, cuff: 0x3a2a1c, st: 0x2a2420, sh: 0x2a2420, hat: 'band', hc: 0xc23b3b, hair: 0x2b2018, ap: 0x6b4528, bib: 1, ex: ['soot'] },
  fazendeiro: { b: 0x4a7a9a, lace: 1, fi: WHITE, belt: 0x5a3a28, sk: 0x5f8a4a, u: WHITE, f: 0, st: WHITE, sh: 0x5a3a28, hat: 'straw', hc: 0xe3c26a, hair: 0x9a6a30, ap: 0xe8dcb8, ex: [] },
  alquimista: { b: 0x3b2a5c, fi: 0xe9d9a8, belt: 0x5a3a28, sk: 0x2f2447, u: 0x3b2a5c, ruf: 0xe9d9a8, f: 0, cuff: GOLD, st: 0x3a3347, sh: 0x1d1d22, hat: 'toque', hc: 0x2a1f3f, hair: 0x2f2a45, ap: 0x6b4528, bib: 1, ex: ['goggles', 'bag', 'bottles'] },
};

/* skins próprias por ofício */
Object.assign(SKM, {
  cartografo: { t: 0x2f5a6a, fl: 0x2f5a6a, vest: 0xe9d9a8, belt: 0x5a3a28, u: 0x2f5a6a, f: 0x2f5a6a, cuff: GOLD, pa: 0x3a3347, st: 0xd8d0b0, sh: 0x3b2a1c, hat: 'beret', hc: 0x8a2f3b, hair: 0xb0b0b0, bd: [0xb8b8b8, .5], ex: ['spec', 'scroll'] },
  calafate: { t: 0x6b5a3a, belt: 0x2a2018, ap: 0x4a3a28, u: 0x6b5a3a, f: 0x6b5a3a, pa: 0x3a3a44, st: 0x2a2420, sh: 0x2a2420, hat: 'wool', hc: 0x2a5a8a, hair: 0x6a6a6a, bd: [0x8a8a8a, .4], ex: ['soot', 'mallet'] },
  marujo: { t: 0xf1ead6, belt: 0x5a3a28, u: 0xf1ead6, f: 0xf1ead6, pa: 0x2a6a6a, st: 0x2a6a6a, sh: 0x3b2a1c, hat: 'kerch', hc: 0x2a7a4a, hair: 0x9a9a9a, mo: 0x9a9a9a, ex: ['stripes', 'parrot', 'peg'] },
  guarda: { t: 0x3a4a6a, fl: 0x3a4a6a, belt: 0x2a2018, u: 0x3a4a6a, f: 0x3a4a6a, cuff: 0x9aa0a8, pa: 0x2a2a30, st: 0xe9e2cc, sh: 0x1d1d22, hat: 'helm', hc: 0x9aa0a8, hair: 0x4a2f20, mo: 0x4a2f20, ex: ['armor'] },
  barqueiro: { t: 0xd8b020, u: 0xd8b020, f: 0xd8b020, belt: 0x3b2a1c, pa: 0x2a4a5a, st: 0x3b3b44, sh: 0x2a2420, hat: 'sou', hc: 0xd8b020, hair: 0xcfcfcf, bd: [0xcfcfcf, .5], ex: [] },
  granjeiro: { t: 0xe8dcb8, ap: 0x4a6a9a, u: 0xe8dcb8, f: 0xe8dcb8, belt: 0x5a3a28, pa: 0x4a6a9a, st: 0x8a6b3f, sh: 0x5a3a28, hat: 'cap', hc: 0x8a6b3f, hair: 0x7a5a30, ex: ['susp'] },
  cavalarico: { t: 0xe8dcb8, vest: 0x7a4a2b, belt: 0x3b2a1c, u: 0xe8dcb8, f: 0xe8dcb8, pa: 0x5a4a3a, st: 0x3b2a1c, sh: 0x3b2a1c, hat: 'brim', hc: 0x6a4a2a, hair: 0x5a3a28, ex: ['neck'] },
});
Object.assign(SKF, {
  mercadora: { b: 0x2a6a4a, lace: 1, fi: 0xe9d9a8, belt: 0xb08a30, sk: 0x4a2a2a, hem: GOLD, u: 0x2a6a4a, ruf: 0xe9d9a8, f: 0, cuff: GOLD, st: WHITE, sh: 0x3b2a1c, buck: 1, hat: 'tri', hc: 0x2a2a30, hair: 0x2a1f1a, ex: ['earring', 'purse'] },
  herbalista: { b: 0x2f4a3a, lace: 1, fi: 0xe6dfcc, belt: 0x4a2f1e, sk: 0x24382c, hem: 0x8a6a3a, u: 0xe6dfcc, ruf: 0xcfd8c0, f: 0x3a2a1c, cuff: 0x6b4a2a, st: 0x3a2a1c, sh: 0x2a1c14, hat: 'hood', hc: 0x2c4a3a, hair: 0xe9e7f0, ex: ['earring', 'bag', 'bottles', 'cloak', 'amulet', 'herbs'] },
  avicultora: { b: 0xb04a6a, lace: 1, fi: WHITE, belt: 0x5a3a28, sk: 0x7a3a5a, u: WHITE, f: 0, st: WHITE, sh: 0x5a3a28, hat: 'bonnet', hc: WHITE, hair: 0xd8a84a, ap: WHITE, bib: 1, ex: [] },
});
/* Realeza: rei (azul real, ouro, arminho, barba grisalha) e rainha (púrpura e ouro, colar de rubi, tiara) */
Object.assign(SKM, {
  rei: { t: 0x1f3f7a, fl: 0x1f3f7a, vest: 0xd9b24a, belt: 0x5a1a1a, u: 0x1f3f7a, f: 0x1f3f7a, cuff: GOLD, pa: 0xe8dcc0, st: WHITE, sh: 0x1d1d22, buck: 1, hat: 'crown', hc: GOLD, hair: 0xb9ab97, mo: 0xb9ab97, bd: [0xb9ab97, .5], ex: ['jabot', 'ermine', 'cape', 'sash', 'medal'] },
});
Object.assign(SKF, {
  rainha: { b: 0x5a2a7a, lace: 1, fi: WHITE, belt: GOLD, sk: 0x5a2a7a, hem: GOLD, u: 0x5a2a7a, ruf: WHITE, f: 0, cuff: GOLD, st: WHITE, sh: 0xd8b040, buck: 1, hat: 'tiara', hc: GOLD, hair: 0x2a1a14, ex: ['earring', 'necklace', 'ermine', 'cape'] },
});


/** Espada padrão na mão (some quando o jogo põe outra arma; ver hideSword) */
function addSword(fa) {
  const b = bb(.07, .95, .05, .015, 0xd8dce0), c = bb(.32, .06, .09, .02, 0xb08a30);
  b.position.y = -.85; c.position.y = -.41;
  b.userData.sword = c.userData.sword = true;
  fa.add(b, c);
  return [b, c];
}
export function hideSword(g) { g.arm.fa.children.forEach(c => { if (c.userData.sword) c.visible = false; }); }

/**
 * Humano. F = feminino · d = skin (ver SKM/SKF; aceita `skin` com a cor da pele).
 */
export function buildHuman(F, d) {
  const SKIN = d.skin !== undefined ? d.skin : (F ? 0xf5c9a6 : 0xf2c29b), ex = d.ex || [];
  const root = new THREE.Group();
  let FL = d.rags ? 1 : 0;   // roupa de saco: arestas sem brilho do chanfro
  const B = (w, h, dd, b, c) => bb(w * K, h * K, dd * K, (FL ? b * .2 : b) * K, c);
  const put = (m, x, y, z, p) => { m.position.set(x * K, y * K, z * K); (p || root).add(m); return m; };
  const at = (o, x, y, z) => { o.position.set(x * K, y * K, z * K); return o; };
  const keep = new Set();

  function leg(x) {
    const hip = at(new THREE.Group(), x, 1.1, 0); root.add(hip);
    const tw = F ? .44 : .5, sw = F ? .4 : .44, td = F ? .5 : .55, sd = F ? .46 : .48, fw = F ? .52 : .56;
    const LEGC = d.bare ? SKIN : d.st;   // perna de fora (sem meia)
    put(B(tw, .5, td, .09, F ? LEGC : d.pa), 0, -.2, 0, hip);
    const knee = at(new THREE.Group(), 0, -.45, 0); hip.add(knee);
    const pg = d.ex && d.ex.includes('peg') && x > 0;   // perna de pau
    put(B(pg ? .26 : sw, .42, pg ? .28 : sd, .08, pg ? WOOD : LEGC), 0, -.2, 0, knee);
    if (d.cal && !F) { put(B(sw + .06, .26, sd + .06, .05, d.pa), 0, -.12, 0, knee); put(B(sw + .08, .05, sd + .08, .02, 0x5a4c34), 0, -.26, 0, knee); }   // barra da calça (meia-canela)
    if (ex.includes('pM')) {   // remendos da calça
      put(B(.26, .22, .04, .015, x < 0 ? 0x8a6a4a : 0x6a7a86), x < 0 ? .04 : -.03, -.18, td / 2 + .01, hip);
      if (x > 0) put(B(.2, .2, .04, .015, 0x9a7a5a), .03, -.1, sd / 2 + .04, knee);
    }
    const ank = at(new THREE.Group(), 0, -.42, 0); knee.add(ank);
    put(B(pg ? .3 : fw, .3, pg ? .34 : .8, .08, pg ? WOOD : d.sh), 0, -.08, pg ? 0 : .1, ank);
    put(B(fw + .02, .12, .3, .04, 0x2a1d14), 0, -.17, -.18, ank);
    if (d.buck) put(B(.18, .12, .05, .02, GOLD), 0, .02, .5, ank);
    hip.knee = knee; hip.foot = ank;
    return hip;
  }
  const legL = leg(F ? -.26 : -.28), legR = leg(F ? .26 : .28);

  // tronco
  if (F) {
    put(B(1.1, .55, .78, .13, d.b), 0, 1.95, 0); put(B(.86, .5, .66, .11, d.b), 0, 1.5, 0);
    if (d.lace) { put(B(.14, .45, .04, .02, GOLD), 0, 1.95, .4); put(B(.14, .4, .04, .02, GOLD), 0, 1.5, .34); }
    if (d.fi) put(B(.9, .16, .7, .05, d.fi), 0, 2.2, 0);
    if (d.belt) { put(B(.9, .12, .7, .04, d.belt), 0, 1.3, 0); put(B(.22, .16, .06, .03, GOLD), 0, 1.3, .38); }
    put(B(1.22, .42, .88, .12, d.sk), 0, 1.05, 0);
    if (d.hem) put(B(1.3, .1, .94, .04, d.hem), 0, .88, 0);
    if (d.ap) {
      put(B(.8, .62, .06, .03, d.ap), 0, 1.1, .46);
      if (d.bib) { put(B(.5, .5, .05, .02, d.ap), 0, 1.82, .4); [-.2, .2].forEach(x => put(B(.07, .4, .04, .02, d.ap), x, 2.2, .36)); }
    }
  } else {
    put(B(1.26, 1.1, .84, .14, d.t), 0, 1.65, 0);
    if (d.fl) put(B(1.34, .5, .92, .1, d.fl), 0, 1.0, 0);
    if (d.vest) {
      put(B(d.fl ? .52 : 1.0, .95, .06, .03, d.vest), 0, 1.65, .44);
      if (d.fl) [1.95, 1.7, 1.45].forEach(y => put(B(.1, .1, .04, .02, GOLD), .34, y, .45));
    }
    if (d.belt) { put(B(1.32, .2, .9, .06, d.belt), 0, 1.2, 0); put(B(.22, .2, .06, .03, GOLD), 0, 1.2, .47); }
    if (d.ap) { put(B(.95, 1.2, .06, .03, d.ap), 0, 1.4, .47); [-.3, .3].forEach(x => put(B(.1, .5, .04, .02, d.ap), x, 2.1, .43)); }
    if (ex.includes('jabot')) put(B(.55, .36, .12, .05, WHITE), 0, 2.05, .44);
    if (ex.includes('susp')) [-.3, .3].forEach(x => put(B(.1, .9, .04, .02, 0x5a3a28), x, 1.65, .44));
  }
  if (ex.includes('cape')) {
    put(B(F ? 1.3 : 1.5, F ? 1.9 : 2.0, .12, .05, F ? 0x7a1c4a : 0x8a1c24), 0, F ? 1.35 : 1.3, -.56);
    put(B(F ? 1.34 : 1.54, .22, .16, .05, 0xf4f0e6), 0, F ? .45 : .3, -.56);
    [-.45, 0, .45].forEach(x => put(B(.1, .1, .18, .02, 0x15151a), x, F ? .45 : .3, -.56));
  }
  if (ex.includes('cloak')) {     // capa de viagem verde-musgo com bainha de couro e broche de prata
    put(B(1.34, 2.0, .12, .05, 0x2c4a3a), 0, 1.3, -.57);
    put(B(1.38, .2, .16, .05, 0x1f3328), 0, .35, -.57);
    put(B(1.36, .12, .9, .08, 0x2c4a3a), 0, 2.2, 0);
    put(B(.14, .14, .06, .03, 0xcfd6dc), .3, 2.18, .46);
  }
  if (ex.includes('amulet')) { put(B(.4, .06, .06, .02, 0x3a2a1c), 0, 2.02, .44); put(B(.22, .26, .07, .03, 0xcfd6dc), 0, 1.84, .46); put(B(.1, .1, .08, .03, 0x6fe08a), 0, 1.84, .5); }
  if (ex.includes('herbs')) { [-.55, -.45, -.35].forEach((x, i) => put(B(.07, .46, .05, .02, [0x4f8a3c, 0x6fa84a, 0x3f7a30][i]), x * 1.15, 1.0 - i * .02, .52).rotation.z = .3 - i * .25); put(B(.2, .06, .08, .02, 0x8a6a3a), -.62, 1.22, .52); put(B(.1, .12, .08, .03, 0xb060ff), -.8, 1.12, .5); }
  if (ex.includes('ermine')) {
    put(B(F ? 1.2 : 1.5, .3, F ? .9 : 1.0, .1, 0xf4f0e6), 0, F ? 2.28 : 2.3, 0);
    [-.5, -.2, .2, .5].forEach(x => put(B(.08, .14, .06, .02, 0x15151a), x * (F ? .9 : 1.1), F ? 2.25 : 2.3, F ? .46 : .52));
    put(B(.2, .2, .08, .04, GOLD), 0, F ? 2.2 : 2.22, F ? .48 : .54);
  }
  if (ex.includes('sash') && !F) { const sh = put(B(.2, 1.5, .05, .02, 0xb02020), -.1, 1.65, .46); sh.rotation.z = -.55; }
  if (ex.includes('medal') && !F) { put(B(.24, .24, .06, .03, GOLD), .38, 1.28, .5); put(B(.12, .12, .07, .03, 0x2a5ac2), .38, 1.28, .52); }
  if (ex.includes('necklace') && F) { put(B(.8, .1, .06, .03, GOLD), 0, 2.12, .4); put(B(.64, .1, .06, .03, GOLD), 0, 1.98, .42); put(B(.16, .2, .08, .03, 0xc0203a), 0, 1.84, .44); }
  if (ex.includes('stripes') && !F) [1.3, 1.55, 1.8, 2.05].forEach(y => put(B(1.3, .08, .88, .03, 0x2a4a8a), 0, y, 0));
  if (ex.includes('armor') && !F) {
    put(B(1.36, .9, .92, .12, 0x9aa0a8), 0, 1.7, 0);
    [-.85, .85].forEach(x => put(B(.55, .36, .62, .1, 0x8a9098), x, 2.22, 0));
    put(B(.5, 1.0, .06, .03, 0xb02020), 0, 1.3, .5);
  }
  if (ex.includes('scroll')) { const c = put(B(.2, 1.1, .2, .06, 0xcdb98a), .35, 1.7, -.58); c.rotation.z = .45; put(B(.24, .1, .24, .04, 0x8a2f3b), .09, 2.15, -.58).rotation.z = .45; }
  if (ex.includes('mallet')) { put(B(.12, .6, .12, .03, WOOD), .8, 1.0, .12); put(B(.3, .2, .24, .05, 0x55585e), .8, 1.38, .12); }
  if (ex.includes('purse')) { put(B(.32, .3, .2, .06, 0x7a5230), .72, 1.12, .32); put(B(.1, .08, .04, .02, GOLD), .72, 1.2, .43); }
  if (ex.includes('parrot')) {
    put(B(.3, .42, .3, .08, 0xc23b3b), 1.0, 2.5, -.05); put(B(.24, .24, .24, .07, 0xc23b3b), 1.0, 2.82, .02);
    put(B(.1, .3, .34, .03, 0x2a5ac2), 1.16, 2.5, -.12); put(B(.08, .1, .14, .02, GOLD), 1.0, 2.8, .18); put(B(.06, .06, .04, .02, 0x111111), 1.1, 2.88, .12);
  }
  if (ex.includes('neck')) put(B(.7, .18, .5, .05, 0xb23a3a), 0, 2.22, .02);
  if (ex.includes('towel')) put(B(.5, .1, .4, .04, WHITE), .62, 2.28, 0);
  if (ex.includes('bag')) { put(B(.7, .5, .25, .08, 0x7a5230), 0, 1.4, -.55); put(B(.5, .12, .28, .04, 0x5a3a28), 0, 1.62, -.55); put(B(.16, .2, .1, .04, 0x6fa84a), .2, 1.7, -.6); }
  if (ex.includes('bottles')) { put(B(.12, .2, .12, .03, 0x6fa84a), -.34, 1.18, .46); put(B(.12, .2, .12, .03, 0xc23b3b), .34, 1.18, .46); }

  if (ex.includes('pM')) {   // camisa simples com remendos
    put(B(.34, .3, .04, .015, 0x8a7a5a), -.34, 1.8, .44); put(B(.28, .22, .04, .015, 0x6a7a86), .3, 1.4, .44); put(B(.3, .26, .04, .015, 0x9a7a5a), .4, 1.9, -.43);
  }
  if (ex.includes('ruff')) {   // gola larga com babados
    put(B(1.0, .14, .72, .05, 0xf0ead8), 0, 2.24, 0);
    [-.4, -.2, 0, .2, .4].forEach((x, i) => put(B(.19, .16, .1, .03, 0xf0ead8), x, 2.2 + (i % 2) * .04, .38));
    [-.5, .5].forEach(x => put(B(.1, .15, .5, .03, 0xe6dfc8), x, 2.2, 0));
    put(B(.5, .1, .1, .03, 0xe6dfc8), 0, 2.07, .45); put(B(.34, .09, .1, .03, 0xf0ead8), 0, 1.97, .45);   // babado em cascata no peito
  }
  if (ex.includes('pF')) {   // remendos desbotados do vestido
    put(B(.3, .24, .04, .015, 0x9a7a5a), -.3, 1.02, .45); put(B(.26, .26, .04, .015, 0x6e7f94), .32, .92, .45);
    put(B(.04, .22, .28, .015, 0xa8827a), .62, 1.08, .08); put(B(.22, .22, .04, .015, 0xb5a77a), .2, 1.56, .34);
  }
  // braços
  function arm(x) {
    const sh = at(new THREE.Group(), x, F ? 2.1 : 2.05, 0); root.add(sh);
    const elb = at(new THREE.Group(), 0, -.42, 0); sh.add(elb);
    if (F) {
      put(B(.42, .5, .46, .09, d.u || SKIN), 0, -.2, 0, sh);
      if (ex.includes('pF')) put(B(.04, .2, .24, .015, 0x8a8a6a), Math.sign(x) * .23, -.22, 0, sh);
      if (d.ruf) put(B(.48, .12, .52, .04, d.ruf), 0, -.02, 0, elb);
      put(B(.34, .32, .38, .07, d.f || SKIN), 0, -.18, 0, elb);
      if (d.cuff) put(B(.38, .08, .42, .03, d.cuff), 0, -.32, 0, elb);
      put(B(.34, .3, .38, .07, SKIN), 0, -.46, 0, elb);
    } else {
      put(B(.44, .5, .48, .09, d.u || SKIN), 0, -.2, 0, sh);
      put(B(.4, .32, .44, .08, d.f || SKIN), 0, -.14, 0, elb);
      if (ex.includes('pM')) put(B(.3, .18, .04, .015, 0x8a7a5a), 0, -.1, -.23, elb);
      if (d.cuff) put(B(.5, .16, .54, .05, d.cuff), 0, -.32, 0, elb);
      if (ex.includes('jabot')) put(B(.42, .08, .46, .03, WHITE), 0, -.42, 0, elb);
      put(B(.38, .3, .42, .08, SKIN), 0, -.52, 0, elb);
    }
    sh.fa = elb;
    return sh;
  }
  const armR = arm(F ? -.74 : -.82), armL = arm(F ? .74 : .82);   // armR = braço da arma (-x) · armL = braço livre (+x)
  addSword(armR.fa).forEach(m => keep.add(m));

  FL = 0;
  if (false) {   // remendos, rasgos e franjas de juta
    const SK = SKIN, DK = 0x5a4626;
    const yc = F ? 1.95 : 1.65, zc = F ? .4 : .43, yl = F ? 1.05 : 1.0, zl = F ? .45 : .47;
    put(B(.3, .26, .04, .02, SK), -.3, yc + .1, zc);      // rasgo no peito (pele aparece)
    put(B(.26, .22, .04, .02, DK), .32, yc - .2, zc);     // remendo escuro
    put(B(.36, .08, .04, .02, DK), -.1, yc - .05, zc + .01); put(B(.08, .3, .04, .02, DK), .15, yc + .15, zc + .01);
    put(B(.3, .3, .04, .02, SK), .25, yl, zl);            // rasgo na saia/calça
    put(B(.24, .2, .04, .02, DK), -.3, yl - .1, zl);
    for (let k = -3; k <= 3; k++) put(B(.14, .12 + ((k * 7) & 3) * .05, .5, .02, k % 2 ? DK : PJC), k * .19, yl - .42, 0);   // barra esfiapada
    put(B(.5, .06, .06, .02, DK), 0, yc + .45, zc - .02);  // gola de corda
  }
  // cabeça
  const head = at(new THREE.Group(), 0, 2.2, 0); root.add(head);
  put(F ? B(1.12, 1.02, 1.02, .2, SKIN) : B(1.15, 1.05, 1.05, .2, SKIN), 0, .55, 0, head);
  const H = d.hair, hat = d.hat, hc = d.hc;
  let feather = null;
  if (hat === 'tri') {
    put(B(1.7, .12, 1.6, .05, hc), 0, 1.12, 0, head); put(B(1.1, .42, 1.0, .1, hc), 0, 1.35, 0, head); put(B(.56, .34, .2, .06, hc), 0, 1.3, .82, head);
    put(B(.3, .34, .56, .06, hc), -.8, 1.28, -.2, head); put(B(.3, .34, .56, .06, hc), .8, 1.28, -.2, head); put(B(1.74, .05, 1.64, .02, GOLD), 0, 1.19, 0, head);
    feather = at(new THREE.Group(), .55, 1.5, .15); head.add(feather);   // pivô na base: a mola do chapéu balança a pena
    put(B(.1, .36, .1, .03, WHITE), 0, .12, 0, feather).rotation.z = -.4;
  }
  if (hat === 'crown') {
    put(B(1.2, .2, 1.2, .06, 0xf4f0e6), 0, .93, 0, head); put(B(1.0, .3, 1.0, .1, 0x8a1c24), 0, 1.16, 0, head);
    put(B(1.18, .2, 1.18, .05, GOLD), 0, 1.0, 0, head);
    for (const [x, z] of [[-.46, .46], [.46, .46], [-.46, -.46], [.46, -.46], [0, .52], [0, -.52], [-.52, 0], [.52, 0]]) put(B(.16, .34, .16, .04, GOLD), x, 1.26, z, head);
    put(B(.16, .16, .08, .03, 0xc0203a), 0, 1.02, .6, head); put(B(.12, .12, .08, .03, 0x2a5ac2), -.36, 1.02, .6, head); put(B(.12, .12, .08, .03, 0x2a9a5a), .36, 1.02, .6, head);
    put(B(.12, .12, .12, .03, 0xc0203a), 0, 1.48, 0, head);
  }
  if (hat === 'tiara') {
    put(B(1.16, .16, 1.1, .05, GOLD), 0, .98, 0, head);
    put(B(.16, .42, .1, .03, GOLD), 0, 1.24, .54, head); put(B(.14, .3, .1, .03, GOLD), -.3, 1.2, .5, head); put(B(.14, .3, .1, .03, GOLD), .3, 1.2, .5, head);
    put(B(.14, .14, .08, .03, 0x2a5ac2), 0, 1.42, .56, head); put(B(.12, .12, .08, .03, 0xc0203a), 0, .98, .58, head);
    put(B(1.18, .1, .2, .03, GOLD), 0, 1.06, -.46, head);
  }
  if (hat === 'straw') { put(B(1.9, .08, 1.9, .04, hc), 0, 1.1, 0, head); put(B(1.0, .4, 1.0, .1, hc), 0, 1.3, 0, head); put(B(1.04, .1, 1.04, .03, 0xb23a3a), 0, 1.15, 0, head); }
  if (hat === 'cap') { put(B(1.2, .3, 1.1, .12, hc), 0, 1.02, -.02, head); put(B(1.26, .1, 1.16, .04, hc), 0, .86, -.02, head); }
  if (hat === 'toque') { put(B(1.22, .2, 1.12, .08, hc), 0, 1.0, 0, head); put(B(1.0, .5, .95, .12, hc), 0, 1.3, 0, head); put(B(1.24, .06, 1.14, .03, GOLD), 0, 1.1, 0, head); }
  if (hat === 'band') { put(B(1.2, .34, 1.1, .12, H), 0, 1.0, -.02, head); put(B(1.18, .1, 1.08, .03, hc), 0, .82, 0, head); }
  if (hat === 'kerch') { put(B(1.22, .34, 1.12, .12, hc), 0, 1.0, -.02, head); put(B(.3, .26, .26, .07, hc), 0, .95, -.62, head); put(B(.14, .4, .12, .04, hc), .12, .7, -.7, head); }
  if (hat === 'hood') {
    put(B(1.3, .3, 1.25, .15, hc), 0, 1.05, -.02, head); put(B(1.3, 1.1, .5, .15, hc), 0, .55, -.58, head);
    put(B(.2, .9, .9, .08, hc), -.68, .55, -.05, head); put(B(.2, .9, .9, .08, hc), .68, .55, -.05, head);
  }
  if (hat === 'beret') { put(B(1.25, .18, 1.15, .1, hc), 0, 1.04, -.02, head); put(B(.95, .1, .95, .05, hc), .1, 1.16, 0, head); put(B(.1, .1, .1, .03, hc), .1, 1.24, 0, head); }
  if (hat === 'wool') { put(B(1.2, .45, 1.1, .14, hc), 0, 1.1, -.02, head); put(B(1.24, .14, 1.14, .05, 0xd8d0b0), 0, .9, -.02, head); put(B(.22, .22, .22, .06, 0xd8d0b0), 0, 1.4, 0, head); }
  if (hat === 'helm') {
    put(B(1.25, .55, 1.2, .15, 0x9aa0a8), 0, 1.05, -.02, head); put(B(1.3, .1, 1.25, .04, 0x7a8088), 0, .82, -.02, head);
    put(B(.12, .5, .08, .03, 0x8a9098), 0, .58, .6, head); put(B(.14, .4, .9, .05, 0xb02020), 0, 1.45, 0, head);
  }
  if (hat === 'sou') { put(B(1.5, .1, 1.5, .05, hc), 0, .98, -.1, head); put(B(1.1, .4, 1.0, .1, hc), 0, 1.2, 0, head); put(B(1.3, .5, .12, .05, hc), 0, .72, -.8, head); }
  if (hat === 'bonnet') { put(B(1.25, .55, 1.2, .15, hc), 0, .95, -.12, head); put(B(1.3, .12, .2, .04, WHITE), 0, .9, .5, head); put(B(.12, .3, .12, .04, 0xe8c040), .3, 1.4, .1, head).rotation.z = -.3; }
  if (hat === 'brim') { put(B(1.8, .08, 1.7, .04, hc), 0, 1.05, 0, head); put(B(1.0, .45, 1.0, .1, hc), 0, 1.3, 0, head); put(B(1.04, .1, 1.04, .03, 0x3a2a1c), 0, 1.12, 0, head); }
  if (hat === 'nightcap') {
    put(B(1.22, .3, 1.12, .12, hc), 0, 1.0, -.02, head); put(B(.9, .3, .8, .1, hc), -.1, 1.28, -.2, head);
    put(B(.5, .3, .5, .1, hc), -.35, 1.3, -.6, head); put(B(.4, .4, .4, .1, hc), -.45, .95, -.95, head); put(B(.24, .24, .24, .08, 0xf4f0e6), -.45, .66, -1.0, head);
    put(B(1.26, .08, 1.16, .03, 0xd8d0b0), 0, .86, -.02, head);
  }
  const LK = d.look;
  let eyeL, eyeR, whL, hlL;
  if (LK) {
    LK.hairBlocks.forEach(([w, h, dd, b, x, y, z, c]) => put(B(w, h, dd, b, c), x, y, z, head));
    LK.beardBlocks.forEach(([w, h, dd, b, x, y, z, c]) => put(B(w, h, dd, b, c), x, y, z, head));
    const ec = LK.eye, ez = F ? .53 : .55, ey = F ? .56 : .58;
    put(B(.24, .08, .05, .02, LK.brow), -.28, ey + .2, ez, head); put(B(.24, .08, .05, .02, LK.brow), .28, ey + .2, ez, head);
    put(B(.24, .24, .05, .02, 0xf4f4f0), -.28, ey, ez - .01, head); whL = put(B(.24, .24, .05, .02, 0xf4f4f0), .28, ey, ez - .01, head);
    eyeR = put(B(.14, .22, .06, .03, ec), -.28, ey, ez + .02, head); eyeL = put(B(.14, .22, .06, .03, ec), .28, ey, ez + .02, head);
    put(B(.05, .07, .04, .02, 0xffffff), -.25, ey + .05, ez + .06, head); hlL = put(B(.05, .07, .04, .02, 0xffffff), .31, ey + .05, ez + .06, head);
    if (F) { put(B(.18, .07, .04, .02, 0xf08a9c), -.4, .36, .53, head); put(B(.18, .07, .04, .02, 0xf08a9c), .4, .36, .53, head); put(B(.28, .07, .06, .03, LK.lip), 0, .26, .53, head); put(B(.14, .12, .1, .04, SKIN), 0, .42, .54, head); }
    else { put(B(.34, .08, .06, .03, LK.lip), 0, .26, .55, head); put(B(.16, .14, .1, .04, SKIN), 0, .42, .56, head); put(B(.14, .3, .14, .04, SKIN), -.62, .55, 0, head); put(B(.14, .3, .14, .04, SKIN), .62, .55, 0, head); }
  } else if (F) {
    put(B(1.14, .22, .2, .06, H), 0, .84, .5, head); put(B(1.2, 1.1, .4, .12, H), 0, .3, -.5, head);
    put(B(.2, .85, .9, .08, H), -.6, .4, -.05, head); put(B(.2, .85, .9, .08, H), .6, .4, -.05, head);
    if (ex.includes('earring')) put(B(.07, .14, .07, .02, GOLD), -.64, .2, .2, head);
    eyeR = put(B(.2, .28, .06, .03, 0x1b1b1b), -.27, .56, .53, head); eyeL = put(B(.2, .28, .06, .03, 0x1b1b1b), .27, .56, .53, head);
    put(B(.07, .09, .04, .02, 0xffffff), -.24, .62, .57, head); put(B(.07, .09, .04, .02, 0xffffff), .3, .62, .57, head);
    put(B(.18, .07, .04, .02, 0xf08a9c), -.4, .36, .53, head); put(B(.18, .07, .04, .02, 0xf08a9c), .4, .36, .53, head);
    put(B(.28, .07, .06, .03, 0xc7405e), 0, .26, .53, head); put(B(.14, .12, .1, .04, 0xe8aa88), 0, .42, .54, head);
  } else {
    put(B(.2, .45, .9, .06, H), -.6, .72, -.05, head); put(B(.2, .45, .9, .06, H), .6, .72, -.05, head);
    put(B(1.1, .6, .3, .08, H), 0, .6, -.5, head);
    if (hat === 'tri') { put(B(.3, .7, .3, .08, H), 0, .35, -.6, head); put(B(.34, .1, .34, .03, hc), 0, .62, -.6, head); }
    eyeR = put(B(.2, .26, .06, .03, 0x1b1b1b), -.28, .58, .55, head); eyeL = put(B(.2, .26, .06, .03, 0x1b1b1b), .28, .58, .55, head);
    if (ex.includes('patch')) { put(B(.3, .34, .06, .03, 0x111111), -.28, .58, .57, head); put(B(1.18, .06, 1.08, .02, 0x111111), 0, .78, 0, head); }
    if (d.mo || ex.includes('mo')) put(B(.4, .07, .06, .02, d.mo || H), 0, .35, .56, head);
    put(B(.34, .08, .06, .03, 0xa04a3a), 0, .26, .55, head); put(B(.16, .14, .1, .04, 0xe5a883), 0, .42, .56, head);
    if (d.bd) put(B(.82, d.bd[1], .14, .05, d.bd[0]), 0, .26 - d.bd[1] / 2 + .06, .5, head);
    put(B(.14, .3, .14, .04, SKIN), -.62, .55, 0, head); put(B(.14, .3, .14, .04, SKIN), .62, .55, 0, head);
  }
  if (ex.includes('spec')) { put(B(.9, .07, .06, .02, GOLD), 0, .74, .58, head); [-.28, .28].forEach(x => put(B(.05, .3, .05, .02, GOLD), x * 1.55, .6, .55, head)); }
  if (ex.includes('goggles')) { put(B(1.16, .07, 1.06, .02, 0x5a3a28), 0, .84, 0, head); [-.25, .25].forEach(x => put(B(.3, .16, .06, .03, 0xcfae5a), x, .84, .55, head)); }
  if (ex.includes('soot')) { put(B(.24, .1, .04, .02, 0x3a3a3a), .3, .42, .53, head); put(B(.2, .08, .04, .02, 0x3a3a3a), -.32, .7, .53, head); }

  const r = rig(root, legL, legR, armR, armL, head, eyeL, eyeR, feather, keep, null); r.whL = whL; r.hlL = hlL; return r;
}

/** Esqueleto. `bone` = cor dos ossos · `eye` = cor do brilho dos olhos */
export function buildSkeleton(o = {}) {
  const BONE = o.bone || 0xe8e2cf, DARK = 0x2a2620, TEETH = 0xfffdf2;
  const root = new THREE.Group();
  const B = (w, h, dd, b, c) => bb(w * K, h * K, dd * K, b * K, c);
  const put = (m, x, y, z, p) => { m.position.set(x * K, y * K, z * K); (p || root).add(m); return m; };
  const at = (g, x, y, z) => { g.position.set(x * K, y * K, z * K); return g; };
  const keep = new Set();

  function leg(x) {
    const hip = at(new THREE.Group(), x, 1.1, 0); root.add(hip);
    put(B(.24, .5, .26, .07, BONE), 0, -.2, 0, hip);
    const knee = at(new THREE.Group(), 0, -.45, 0); hip.add(knee);
    put(B(.32, .2, .32, .07, BONE), 0, 0, .02, knee);
    put(B(.2, .42, .22, .06, BONE), 0, -.2, 0, knee);
    const ank = at(new THREE.Group(), 0, -.42, 0); knee.add(ank);
    put(B(.3, .2, .62, .06, BONE), 0, -.13, .12, ank);
    put(B(.28, .1, .2, .03, BONE), 0, -.19, .46, ank);
    hip.knee = knee; hip.foot = ank;
    return hip;
  }
  const legL = leg(-.22), legR = leg(.22);

  put(B(.95, .34, .55, .1, BONE), 0, 1.18, 0);
  put(B(.2, .22, .06, .02, DARK), 0, 1.14, .29);
  put(B(.18, 1.0, .18, .05, BONE), 0, 1.7, -.12);
  put(B(.8, .9, .5, .05, DARK), 0, 1.9, 0);
  [[1.55, .9], [1.77, 1.0], [1.99, 1.0], [2.2, .86]].forEach(([y, w]) => put(B(w, .13, .62, .05, BONE), 0, y, 0));
  put(B(.14, .85, .1, .03, BONE), 0, 1.9, .34);
  put(B(1.1, .12, .2, .04, BONE), 0, 2.34, .05);

  function arm(x) {
    const sh = at(new THREE.Group(), x, 2.08, 0); root.add(sh);
    put(B(.3, .3, .3, .08, BONE), 0, 0, 0, sh);
    put(B(.2, .5, .22, .06, BONE), 0, -.2, 0, sh);
    const elb = at(new THREE.Group(), 0, -.42, 0); sh.add(elb);
    put(B(.26, .2, .26, .07, BONE), 0, 0, 0, elb);
    put(B(.18, .34, .2, .05, BONE), 0, -.17, 0, elb);
    put(B(.28, .2, .16, .05, BONE), 0, -.42, 0, elb);
    put(B(.22, .18, .1, .03, BONE), 0, -.58, 0, elb);
    sh.fa = elb;
    return sh;
  }
  if (o.armor) { put(B(1.0, .75, .62, .1, 0x7a8088), 0, 1.95, 0); [-.78, .78].forEach(x => put(B(.4, .3, .4, .08, 0x8a9098), x, 2.3, 0)); }
  const armR = arm(-.72), armL = arm(.72);
  addSword(armR.fa).forEach(m => keep.add(m));

  const head = at(new THREE.Group(), 0, 2.2, 0); root.add(head);
  put(B(.18, .3, .18, .05, BONE), 0, 0, -.05, head);
  if (o.armor) { put(B(1.12, .5, 1.05, .14, 0x8a9098), 0, 1.0, 0, head); put(B(.12, .4, .8, .05, 0xb02020), 0, 1.38, 0, head); }
  put(B(1.0, .85, .95, .2, BONE), 0, .6, 0, head);
  put(B(.28, .3, .08, .04, DARK), -.25, .65, .46, head);
  put(B(.28, .3, .08, .04, DARK), .25, .65, .46, head);
  const eyeR = put(B(.1, .1, .04, .02, o.eye || 0xff5a3a), -.25, .65, .5, head), eyeL = put(B(.1, .1, .04, .02, o.eye || 0xff5a3a), .25, .65, .5, head);
  put(B(.12, .18, .06, .03, DARK), 0, .44, .48, head);
  [-.24, -.16, -.08, 0, .08, .16, .24].forEach(x => put(B(.07, .05, .06, .02, TEETH), x, .15, .45, head));
  [-1, 1].forEach(s => { [.36, .26, .16].forEach(z => put(B(.07, .05, .06, .02, TEETH), s * .32, .15, z, head)); });
  put(B(.62, .04, .55, .02, DARK), 0, .16, .2, head);
  const jaw = at(new THREE.Group(), 0, .3, -.08); head.add(jaw);
  [-1, 1].forEach(s => {
    put(B(.12, .43, .16, .04, BONE), s * .4, -.16, 0, jaw);
    put(B(.16, .1, .16, .04, BONE), s * .42, .04, 0, jaw);
    put(B(.18, .14, .18, .05, BONE), s * .4, -.36, 0, jaw);
    put(B(.14, .14, .64, .05, BONE), s * .36, -.305, .3, jaw);
    [.12, .22, .32, .42].forEach(z => put(B(.08, .06, .07, .02, TEETH), s * .3, -.205, z, jaw));
  });
  put(B(.8, .16, .16, .05, BONE), 0, -.305, .6, jaw);
  put(B(.3, .1, .1, .03, BONE), 0, -.37, .68, jaw);
  [-.2, -.1, 0, .1, .2].forEach(x => put(B(.08, .06, .07, .02, TEETH), x, -.205, .56, jaw));

  return rig(root, legL, legR, armR, armL, head, eyeL, eyeR, null, keep, jaw);
}

/** Agrupa tudo acima do quadril em `up` e expõe as juntas com os nomes que o resto do jogo espera */
function rig(root, legL, legR, armR, armL, head, eyeL, eyeR, feather, keep, jaw) {
  const up = new THREE.Group();
  up.position.set(0, 1.1 * K, 0);
  up.userData.off = new THREE.Vector3(0, .72, 0);
  root.add(up);
  root.updateMatrixWorld(true);
  root.children.slice().forEach(o => { if (o !== up && o !== legL && o !== legR) up.attach(o); });
  root.legL = legL; root.legR = legR;
  root.arm = armR; root.armL = armL;
  root.up = up; root.head = head;
  root.eyeL = eyeL; root.eyeR = eyeR;
  root.feather = feather; root.jaw = jaw;
  [eyeL, eyeR].forEach(m => keep.add(m));
  root.traverse(n => { if (n.isGroup && n !== root) fuse(n, keep); });
  return root;
}
