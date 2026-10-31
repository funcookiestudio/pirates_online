/* Veículos puxados a cavalo (modelos): carroça (1 cavalo) e carruagem (2 cavalos, boleia e 2 passageiros).
   Usa o cavalo do jogo (mkHorse) com arreio por cima e os mesmos blocos arredondados fundidos (bb/fuse de horse.js).
   Referencial de cada parte: +z = frente, origem no eixo das rodas, no chão.
     carroça:   body (eixo único) — o cavalo vai preso nos varais, LEAD m à frente do eixo
     carruagem: body (eixo traseiro) + fore (eixo dianteiro que esterça, lança e parelha de cavalos)
   Retorna { root, body, fore?, horses[], wheels[{w,R,fore}], lamps[], seat, exit, pass[], reins[] }. */
import { mkHorse, bb, fuse } from './horse.js';
import { person } from './character.js';

export const PAINTS = [['vinho', 0x8a2433], ['azul', 0x2c4b78], ['verde', 0x2f5a3a], ['preto', 0x26262c]];
const WD = [0xa5733c, 0x956531, 0xb07f46, 0x7a4f28], IR = 0x3a3a40, LT = 0x5a3a28, BR = 0xd0a030, RD = 0x8a2433, DK = 0x4a3322;
const bx = (w, h, d, c, x, y, z, p, b) => { const m = bb(w, h, d, b === undefined ? .03 : b, c); m.position.set(x, y, z); p.add(m); return m; };
const mix = (a, b, t) => { let o = 0; for (let s = 16; s >= 0; s -= 8) { const x = (a >> s) & 255, y = (b >> s) & 255; o |= Math.round(x + (y - x) * t) << s; } return o; };

function barrel(g, x, z, y0, c) {
  const y = y0 + .4;
  bx(.6, .8, .6, c, x, y, z, g, .1); bx(.6, .8, .6, c - 0x080808, x, y, z, g, .1).rotation.y = .785;
  [.12, .4, .68].forEach(h => { bx(.64, .05, .64, IR, x, y0 + h, z, g, .06); bx(.64, .05, .64, IR, x, y0 + h, z, g, .06).rotation.y = .785; });
  bx(.5, .03, .5, 0x6a4422, x, y0 + .81, z, g, .01);
}
/** Roda de raios (raio R); s = lado (-1/1) para o cubo de latão ficar para fora */
function wheel(s, R) {
  const w = new THREE.Group(), N = 12;
  for (let i = 0; i < N; i++) {
    const a = i * 6.2832 / N + .26, c = Math.cos(a), n = Math.sin(a);
    bx(.2, .14, .46, WD[i % 3], 0, .84 * c, .84 * n, w, .03).rotation.x = a;
    bx(.23, .05, .5, IR, 0, .93 * c, .93 * n, w, .015).rotation.x = a;
    bx(.09, .62, .09, WD[3], 0, .49 * c, .49 * n, w, .02).rotation.x = a;
  }
  bx(.34, .34, .34, WD[3], 0, 0, 0, w, .05); bx(.34, .34, .34, WD[3], 0, 0, 0, w, .05).rotation.x = .785;
  [-.13, .13].forEach(x => bx(.05, .4, .4, IR, x, 0, 0, w, .1));
  bx(.1, .2, .2, BR, s * .2, 0, 0, w, .04);
  fuse(w);
  const p = new THREE.Group(); w.scale.setScalar(R / .955); p.add(w);   // p = posição; w gira
  return { p, w, R };
}
/** Lanterna pendurada (vidro aceso) */
function lamp(g, x, y, z, dy = 0) {
  const p = new THREE.Group(); p.position.set(x, y, z); g.add(p);
  bx(.02, .16 + dy, .02, IR, 0, -.08 - dy / 2, 0, p, .005);
  const gp = bb(.16, .22, .16, .02, 0xffc860); gp.material = new THREE.MeshBasicMaterial({ color: 0xffc860 }); gp.position.y = -.38 - dy; p.add(gp);
  bx(.22, .04, .22, IR, 0, -.24 - dy, 0, p, .01); bx(.22, .04, .22, IR, 0, -.52 - dy, 0, p, .01); bx(.14, .06, .14, IR, 0, -.2 - dy, 0, p, .01);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(.025, .28, .025, IR, a * .09, -.38 - dy, b * .09, p, .005));
  return p;
}
/** Arreio por cima do cavalo do jogo: coalheira, cilha, retranca, bridão e antolhos.
    inner = 0 → nos varais da carroça (laços dos dois lados) · ±1 → lado de dentro da parelha (tirante para a lança) */
function harness(H, inner) {
  const HB = H.HB, B = (w, h, d, c, x, y, z, p, b) => bx(w, h, d, c, x, y, z, p, b === undefined ? .02 : b);
  const parts = new THREE.Group(); HB.add(parts);
  const nk = new THREE.Group(); H.neck.add(nk);
  const hd = new THREE.Group(); H.head.add(hd);
  B(.96, .05, .12, LT, 0, .55, -.12, parts); B(.9, .06, .14, LT, 0, -.49, -.12, parts); B(.07, .04, .7, LT, 0, .48, -.85, parts); B(.9, .07, .07, LT, 0, -.05, -1.18, parts);
  [-1, 1].forEach(s => {
    B(.05, .62, .12, LT, s * .46, .22, -.12, parts); B(.1, .18, .08, BR, s * .12, .66, -.12, parts);
    B(.1, .24, .6, LT, s * .27, .1, 0, nk); B(.06, .55, .1, BR, s * .3, .38, 0, nk);
    B(.04, .46, .07, 0x1d1d22, s * .19, 0, .12, hd); B(.04, .18, .22, 0x111111, s * .22, .06, .3, hd, .02); B(.06, .08, .06, BR, s * .19, -.14, .62, hd, .01);
    if (!inner || s === inner) { B(.12, .18, .17, IR, s * .55, .03, -.12, parts); B(.04, .05, 1.0, LT, s * .5, .1, .38, parts); B(.05, .05, .9, LT, s * .5, -.02, -.72, parts); B(.14, .14, .14, BR, s * .57, .03, .85, parts); }
  });
  B(.54, .24, .1, LT, 0, .1, .29, nk); B(.54, .24, .1, LT, 0, .1, -.29, nk);
  B(.33, .07, .38, 0x1d1d22, 0, -.06, .6, hd); B(.42, .06, .06, 0x1d1d22, 0, .1, .16, hd); B(.12, .12, .12, 0xc23b3b, 0, .22, -.1, hd, .05);
  fuse(parts); fuse(nk); fuse(hd);
}
function reinSet(n, root) {
  return Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, 1), new THREE.MeshLambertMaterial({ color: 0x2a1d14 })); m.visible = false; root.add(m); return m; });
}

/** Carroça: um cavalo nos varais, barris e sacos na carga, lanterna no poste */
export function buildCart(coat = 0) {
  const root = new THREE.Group(), body = new THREE.Group(); body.rotation.order = 'YXZ'; root.add(body);
  const g = new THREE.Group(), F = new THREE.Group(); g.add(F); body.add(g);
  const wheels = [-1, 1].map(s => { const W = wheel(s, .955); W.p.position.set(s * 1.12, .955, 0); g.add(W.p); return W; });
  bx(2.7, .14, .14, DK, 0, .955, 0, g, .02);
  [-1, 1].forEach(s => {
    const sh = bx(.1, .1, 5.9, 0xb58a52, s * .58, 1.295, 1.9, F, .03); sh.rotation.x = -.0424;
    bx(.13, .13, .14, IR, s * .58, 1.42, 4.9, F, .03); bx(.14, .16, .1, IR, s * .58, 1.2, .9, F, .02);
  });
  [-.75, -.45, -.15, .15, .45, .75].forEach((x, i) => bx(.29, .07, 3.0, WD[i % 4], x, 1.265, 0, F, .02));
  [-1, 0, 1].forEach(z => bx(1.9, .12, .14, DK, 0, 1.17, z, F, .02));
  [-.72, .72].forEach(x => { bx(.12, .12, 3.1, DK, x, 1.17, 0, F, .02); bx(.2, .2, .34, DK, x, 1.07, 0, F, .02); });
  [-1, 1].forEach(s => {
    const x = s * .9;
    bx(.06, .3, 3.1, WD[0], x, 1.46, 0, F, .02); bx(.07, .04, 3.12, RD, x, 1.62, 0, F, .01);
    bx(.06, .26, 1.5, WD[1], x, 1.78, -.78, F, .02); bx(.07, .04, 1.52, RD, x, 1.92, -.78, F, .01);
    [-1.45, -.78, -.1].forEach(z => { bx(.09, .8, .1, DK, x, 1.7, z, F, .02); bx(.11, .05, .12, BR, x, 2.12, z, F, .01); });
    bx(.09, .5, .1, DK, x, 1.55, 1.0, F, .02);
    [-1.2, -.5, .4, 1.2].forEach(z => bx(.08, .05, .05, BR, x + s * .03, 1.46, z, F, .01));
    bx(.08, .34, .04, IR, x, 1.46, -.05, F, .01);
  });
  bx(1.86, .3, .06, WD[2], 0, 1.46, -1.55, F, .02); bx(1.86, .26, .06, WD[1], 0, 1.78, -1.55, F, .02); bx(1.88, .04, .08, RD, 0, 1.62, -1.55, F, .01);
  [-.5, .5].forEach(x => bx(.08, .6, .08, IR, x, 1.6, -1.6, F, .01));
  bx(1.8, .5, .07, WD[0], 0, 1.55, 1.5, F, .02); bx(1.84, .07, .12, RD, 0, 1.82, 1.5, F, .02);
  [-.8, .8].forEach(x => bx(.08, .55, .1, DK, x, 1.57, 1.5, F, .02));
  bx(1.5, .015, .8, 0x6a2a2a, 0, 1.31, 1.05, F, .005);
  bx(1.3, .08, .5, WD[2], 0, 1.46, .55, F, .02); bx(1.1, .08, .42, RD, 0, 1.54, .55, F, .04);   // banco do cocheiro
  [-.55, .55].forEach(x => bx(.1, .2, .5, DK, x, 1.4, .55, F, .02));
  bx(1.2, .5, .07, WD[1], 0, 1.85, .12, F, .02); [-.58, .58].forEach(x => bx(.08, .7, .08, DK, x, 1.65, .12, F, .02));
  barrel(F, -.42, -.95, 1.3, 0x8a5a2a); barrel(F, .42, -1.05, 1.3, 0x7a4f28);   // carga
  bx(.56, .56, .56, 0x9a7040, -.45, 1.58, -.28, F, .04); [1.43, 1.73].forEach(y => bx(.58, .07, .58, 0x7a5430, -.45, y, -.28, F, .02));
  bx(.56, .34, .78, 0xcdb98a, .38, 1.47, -.3, F, .12); bx(.5, .3, .7, 0xc2ae80, .36, 1.78, -.3, F, .11).rotation.y = .12;
  bx(.18, .08, .18, 0x8a7a58, .38, 1.68, .1, F, .03);
  bx(1.3, .04, .04, 0x8a6a40, 0, 1.97, -1.0, F, .01);
  bx(.06, 1.2, .06, IR, -.85, 1.9, .55, F, .01); bx(.3, .05, .05, IR, -.97, 2.5, .55, F, .01);   // poste da lanterna
  fuse(F); fuse(g);
  const lan = lamp(g, -1.1, 2.48, .55, .04);
  const H = mkHorse(coat, 0); harness(H, 0); H.position.z = 3.9; body.add(H);
  return {
    kind: 'cart', root, body, horses: [H], wheels, lamps: [lan], pass: [],
    seat: new THREE.Vector3(0, 1.0, .43), exit: new THREE.Vector3(1.6, 0, .4), reins: reinSet(4, root),
  };
}

/** Carruagem: caixa pintada com janelas, boleia, bagagem; eixo dianteiro com lança e parelha de cavalos */
export function buildCoach(paint = 0, coats = [1, 1]) {
  const pc = PAINTS[paint % PAINTS.length][1], pl = mix(pc, 0xffffff, .14);
  const root = new THREE.Group(), body = new THREE.Group(), fore = new THREE.Group(); body.rotation.order = fore.rotation.order = 'YXZ'; root.add(body, fore);
  const g = new THREE.Group(), F = new THREE.Group(); g.add(F); g.position.z = 1; body.add(g);   // caixa: eixo traseiro do protótipo em z = -1
  const fg = new THREE.Group(); fg.position.z = -2.1; fore.add(fg);                                 // jogo dianteiro: eixo em z = 2,1
  const wheels = [-1, 1].map(s => { const W = wheel(s, .955); W.p.position.set(s * 1.12, .955, -1); g.add(W.p); return W; });
  [-1, 1].forEach(s => { const W = wheel(s, .7); W.p.position.set(s * 1.08, .7, 2.1); W.fore = true; fg.add(W.p); wheels.push(W); });
  bx(2.8, .14, .14, DK, 0, .955, -1, g, .02); bx(.14, .12, 3.2, DK, 0, .9, .55, g, .02);
  bx(2.4, .12, .12, DK, 0, .7, 2.1, fg, .02); bx(.5, .1, .5, DK, 0, .82, 2.1, fg, .02);
  bx(.12, .12, 4.3, 0xb58a52, 0, 1.29, 4.25, fg, .03).rotation.x = -.065;
  bx(.16, .16, .16, IR, 0, 1.43, 6.4, fg, .03); bx(.4, .1, .1, IR, 0, 1.43, 6.3, fg, .02);
  [-.78, .78].forEach(x => { bx(.14, .14, 4.3, DK, x, 1.12, .45, F, .02); bx(.2, .2, .34, DK, x, 1.03, -1, F, .02); bx(.2, .42, .34, DK, x, .92, 2.1, F, .02); });
  [-1.4, -.5, .5, 1.4].forEach(z => bx(2.0, .12, .14, DK, 0, 1.12, z, F, .02));
  [-.75, -.45, -.15, .15, .45, .75].forEach((x, i) => bx(.29, .07, 3.0, WD[i % 4], x, 1.215, 0, F, .02));
  bx(1.7, .015, 2.9, 0x6a2a2a, 0, 1.255, 0, F, .005);
  [-1, 1].forEach(s => {
    const x = s * .95;
    bx(.06, .85, 2.9, pc, x, 1.675, 0, F, .02);
    [-.95, 0, .95].forEach(z => { bx(.04, .6, .8, pl, x + s * .03, 1.69, z, F, .015); bx(.045, .02, .84, BR, x + s * .035, 2.0, z, F, .005); });
    bx(.08, .05, 2.96, BR, x, 2.1, 0, F, .01); bx(.07, .04, 2.94, BR, x, 1.28, 0, F, .01);
    [-1.45, -.5, .5, 1.45].forEach(z => bx(.1, 1.3, .1, DK, x, 2.75, z, F, .02));
    bx(.08, .12, 2.96, DK, x, 3.4, 0, F, .02); bx(.05, .04, .14, BR, x + s * .05, 1.95, .38, F, .01);
    bx(.05, .24, .24, BR, x + s * .045, 1.69, 0, F, .01); bx(.055, .16, .16, pc, x + s * .05, 1.69, 0, F, .01);
    bx(.3, .05, .5, IR, s * 1.05, .95, .2, F, .01);
    [-1.38, 1.38].forEach(z => bx(.03, .9, .16, RD, x - s * .05, 2.75, z, F, .01));
  });
  [-1, 1].forEach(s => {
    const z = s * 1.45;
    bx(1.9, .85, .06, pc, 0, 1.675, z, F, .02); bx(1.9, .05, .08, BR, 0, 2.1, z, F, .01);
    bx(.45, 1.3, .06, pc, -.725, 2.75, z, F, .02); bx(.45, 1.3, .06, pc, .725, 2.75, z, F, .02);
    bx(1.0, .35, .06, pc, 0, 2.275, z, F, .02); bx(1.0, .4, .06, pc, 0, 3.2, z, F, .02);
    bx(1.62, .75, .09, 0x7a2a3a, 0, 1.9, s * 1.37, F, .05); bx(1.7, .15, .55, DK, 0, 1.32, s * .95, F, .02); bx(1.62, .1, .5, 0x7a2a3a, 0, 1.44, s * .95, F, .05);
  });
  [[2.2, 3.3, 3.44], [2.0, 3.1, 3.52], [1.7, 2.8, 3.6]].forEach(([w, d, y]) => bx(w, .08, d, 0x2a2420, 0, y, 0, F, .04));
  bx(2.24, .03, 3.34, BR, 0, 3.4, 0, F, .01);
  // boleia
  bx(1.9, .53, .57, pc, 0, 1.515, 1.765, F, .02); bx(1.8, .08, .5, 0x7a2a3a, 0, 1.81, 1.78, F, .03);
  bx(1.9, .07, 1.0, WD[2], 0, 1.585, 2.55, F, .02); [-.85, .85].forEach(x => bx(.1, .4, .1, DK, x, 1.38, 2.5, F, .02));
  bx(1.9, .6, .07, pc, 0, 1.9, 3.02, F, .03); bx(1.94, .08, .14, BR, 0, 2.22, 3.02, F, .02);
  [-.9, .9].forEach(x => { bx(.06, .55, .06, IR, x, 2.5, 3.02, F, .01); bx(.06, .06, .2, IR, x, 2.78, 3.1, F, .01); });
  // bagagem
  bx(1.8, .07, .75, DK, 0, 1.22, -1.9, F, .02); bx(1.5, .65, .65, 0x6a3a22, 0, 1.6, -1.88, F, .06); bx(1.54, .08, .69, 0x5a3018, 0, 1.96, -1.88, F, .05);
  [-.4, .4].forEach(x => bx(.1, .67, .67, IR, x, 1.6, -1.88, F, .02)); bx(.12, .1, .05, BR, 0, 1.62, -2.22, F, .01);
  [-.95, .95].forEach(x => { bx(.05, .2, 3.0, DK, x, 3.74, 0, F, .01); [-1.4, 0, 1.4].forEach(z => bx(.05, .2, .05, DK, x, 3.72, z, F, .01)); });
  bx(1.2, .5, .8, 0x6a3a22, 0, 3.92, -.5, F, .06); [-.35, .35].forEach(x => bx(.1, .52, .82, IR, x, 3.92, -.5, F, .02)); bx(.12, .1, .05, BR, 0, 3.95, -.92, F, .01);
  barrel(F, 0, 1.05, 3.62, 0x8a5a2a); bx(.6, .4, .8, 0xcdb98a, .5, 3.88, .3, F, .12);
  fuse(F); fuse(g); fuse(fg);
  const lamps = [-1, 1].map(s => lamp(g, s * .9, 2.78, 3.18));
  const horses = [0, 1].map(i => { const H = mkHorse(coats[i] | 0, 0); harness(H, i ? -1 : 1); H.position.set(i ? .72 : -.72, 0, 5.45); fg.add(H); return H; });
  // passageiros (aparecem quando o jogador conduz): um de frente, outro de costas
  const pass = [[-.45, .95, -.95, 0, 0], [.45, .95, .95, Math.PI, 1]].map(([x, y, z, ry, f]) => {
    const p = person(undefined, 0, 0, 0, { sk: f ? 'taberneiro' : 'alquimista', f: !!f });
    p.position.set(x, y, z); p.rotation.y = ry; p.visible = false;
    p.legL.rotation.x = p.legR.rotation.x = -1.5; p.legL.knee.rotation.x = p.legR.knee.rotation.x = 1.5;
    p.arm.rotation.set(-.6, 0, .12); p.armL.rotation.set(-.6, 0, -.12); p.arm.fa.rotation.x = p.armL.fa.rotation.x = -.95;
    p.arm.fa.children.forEach(c => { if (c.userData.sword) c.visible = false; });
    g.add(p); return p;
  });
  return {
    kind: 'coach', root, body, fore, horses, wheels, lamps, pass,
    seat: new THREE.Vector3(-.5, 1.32, 2.82), exit: new THREE.Vector3(-1.9, 0, 2.6), reins: reinSet(8, root),
  };
}
