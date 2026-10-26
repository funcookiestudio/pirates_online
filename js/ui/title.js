/* Tela inicial "Tiny Pirates": cena 3D (heróis de frente atacando, inimigos de costas, aves voando) atrás do título HTML. */
import { VERSION } from '../core/version.js';
import { enemyModel } from '../entities/character.js';
import { buildHuman, SKM, SKF } from '../entities/human.js';
import { ENEMY_KINDS } from '../data/enemies.js';
import { mkParrot, mkRaven } from '../pets/models.js';
import { WEAPONS } from '../data/weapons.js';
import { cleanLook, resolveLook } from '../entities/look.js';

const CSS = `
#ttl{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(4vh + env(safe-area-inset-top,0px)) 0 calc(5vh + env(safe-area-inset-bottom,0px));overflow:hidden;font-family:'Cinzel','Trajan Pro','Palatino Linotype',Georgia,serif;color:#d8c9a8;
 background:linear-gradient(#04060c 0%,#0b1220 22%,#1a2230 36%,#3a2a28 40%,#120c0b 41%,#0d0807 62%,#050303 100%)}
#ttl canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#ttl canvas.em{pointer-events:none;mix-blend-mode:screen}
#ttl .moon{position:absolute;left:78%;top:19%;width:min(46vw,46vh);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#f2e4cc 0 17%,#c8705a66 26%,#7a1c1c33 42%,#0000 68%);animation:ttm 9s ease-in-out infinite}
@keyframes ttm{50%{opacity:.78;transform:translate(-50%,-50%) scale(1.04)}}
#ttl .sea{position:absolute;left:0;right:0;top:36%;height:6%;background:repeating-linear-gradient(90deg,#0000 0 38px,#6a7a9a14 38px 40px),linear-gradient(#26324a,#0a0e18);opacity:.8}
#ttl .ship{--sw:min(34vw,56vh);position:absolute;left:calc(25% - var(--sw) / 2);top:calc(39% - var(--sw) * .574);width:var(--sw);opacity:.85;filter:drop-shadow(0 0 8px #000);animation:ttb 7s ease-in-out infinite;transform-origin:50% 90%}
@keyframes ttb{50%{transform:rotate(1.4deg) translateY(2px)}}
#ttl .fog{position:absolute;left:-30%;width:160%;height:30%;pointer-events:none;background:radial-gradient(ellipse at 30% 50%,#9aa6bc2e,#0000 62%),radial-gradient(ellipse at 75% 40%,#9aa6bc22,#0000 60%);animation:ttf 38s linear infinite}
#ttl .fog.a{top:30%}#ttl .fog.b{top:58%;animation-duration:55s;animation-direction:reverse;opacity:.8}
@keyframes ttf{to{transform:translateX(22%)}}
#ttl .vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,#0000 28%,#000d 100%),linear-gradient(#0008,#0000 25%,#0000 70%,#000b)}
#ttl .storm{position:absolute;left:0;top:0;width:60%;height:46%;pointer-events:none;background:radial-gradient(ellipse at 6% 62%,#02030acc,#0000 62%),radial-gradient(ellipse at 22% 30%,#0a0e1ccc,#0000 58%),radial-gradient(ellipse at 38% 52%,#141b2e99,#0000 55%)}
#ttl .flash{position:absolute;left:0;top:14%;width:48%;height:30%;pointer-events:none;background:radial-gradient(ellipse at 14% 55%,#dfe8ff,#7f95c8 28%,#0000 66%);opacity:0;mix-blend-mode:screen;z-index:2}
#ttl .bolt{z-index:2;filter:drop-shadow(0 0 5px #9fb8ff);position:absolute;left:9%;top:17%;width:7%;height:22%;pointer-events:none;opacity:0}
#ttl .tt{position:absolute;left:0;right:0;top:calc(3.2vh + env(safe-area-inset-top,0px));pointer-events:none}
#ttl h1{position:relative;margin:0;text-align:center;font-family:'Cinzel Decorative','Cinzel',Georgia,serif;font-weight:900;line-height:.95;text-transform:uppercase;letter-spacing:.08em}
#ttl h1 .t1{display:block;font-size:clamp(16px,min(4.6vw,5.6vh),44px);letter-spacing:.6em;padding-left:.6em;color:#b83a30;text-shadow:0 0 14px #b0201855,0 2px 0 #1a0505}
#ttl h1 .t2{display:block;font-size:clamp(38px,min(11vw,14.5vh),116px);margin-top:.04em;background:linear-gradient(#fff6dc 8%,#e2c27a 40%,#8a6428 58%,#e8cf94 78%,#7a5a22);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #1a0d05) drop-shadow(0 0 22px #a0201855)}
#ttl h1 small{display:flex;align-items:center;justify-content:center;gap:.9em;font-family:'Cinzel',Georgia,serif;font-weight:600;font-size:clamp(11px,min(2.4vw,3vh),20px);letter-spacing:.7em;color:#c9b58a;margin-top:1.1em;padding-left:.7em;text-shadow:0 2px 6px #000}
#ttl h1 small::before,#ttl h1 small::after{content:'';width:min(16vw,150px);height:1px;background:linear-gradient(90deg,#0000,#c9a45c,#0000)}
#ttl .tag{margin:clamp(6px,1.4vh,14px) 0 0;text-align:center;font-family:'IM Fell English','Cinzel',Georgia,serif;font-style:italic;font-size:clamp(13px,min(2.6vw,3vh),20px);letter-spacing:.06em;color:#a89878;text-shadow:0 2px 6px #000}
#ttl button{pointer-events:auto;position:fixed;left:0;right:0;bottom:calc(5vh + env(safe-area-inset-bottom,0px));margin:0 auto;width:max-content;appearance:none;font:inherit;font-size:clamp(15px,3.4vw,22px);font-weight:700;letter-spacing:.42em;text-transform:uppercase;padding:.85em 3.4em .85em 3.8em;color:#e8d4a8;cursor:pointer;
 background:linear-gradient(#2e1714,#120808 60%,#1e0e0c);border:1px solid #8a6a3a;box-shadow:inset 0 0 0 3px #0008,inset 0 0 18px #7a1c1c66,0 0 24px #000c,0 0 30px #7a1c1c33;
 clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px);text-shadow:0 2px 4px #000;transition:color .25s,box-shadow .25s,filter .25s;animation:ttp 3.4s ease-in-out infinite}
#ttl button:hover{color:#fff;filter:brightness(1.25);box-shadow:inset 0 0 0 3px #0008,inset 0 0 26px #b0282866,0 0 34px #b0282855}
#ttl button:active{transform:translateY(2px)}
@keyframes ttp{50%{border-color:#c9a45c}}
#ttl .ver{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(6px + env(safe-area-inset-bottom,0px));font-size:11px;letter-spacing:.2em;color:#8a7c60;text-shadow:0 1px 2px #000}
@media (orientation:landscape) and (max-height:480px){#ttl{padding-top:2vh;padding-bottom:3vh}#ttl .tag{display:none}#ttl h1 small{margin-top:.5em}#ttl button{bottom:calc(3vh + env(safe-area-inset-bottom,0px));padding:.5em 2.4em;font-size:clamp(13px,5vh,20px)}}
`;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);


/** Baú do tesouro aberto (unidade ≈ 1 de largura) com moedas e joias dentro e ao redor */
function mkChest() {
  const g = new THREE.Group(), M = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000 });
  const wood = M(0x6a3a1c), dark = M(0x2a160a), gold = M(0xf2c030, 0x6a4a00), band = M(0xc8962a, 0x2a1a00);
  const box = (w, h, d, m, x, y, z, par) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (par || g).add(o); return o; };
  box(1.2, .5, .72, wood, 0, .25, 0);                                                      // corpo
  [-.46, 0, .46].forEach(x => box(.1, .52, .76, band, x, .25, 0));                         // cintas de metal
  box(1.1, .02, .62, dark, 0, .5, 0);                                                      // interior
  box(.16, .2, .05, band, 0, .42, .38); box(.07, .08, .06, M(0x2a1a00), 0, .4, .41);       // fechadura
  const lid = new THREE.Group(); lid.position.set(0, .5, -.36); g.add(lid);                // tampa aberta para trás
  box(1.2, .1, .72, wood, 0, .05, .36, lid); const top = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, 1.2, 14, 1, false, 0, Math.PI), wood);
  top.rotation.set(0, 0, Math.PI / 2); top.rotation.order = 'ZYX'; top.position.set(0, .1, .36); lid.add(top);
  [-.46, 0, .46].forEach(x => box(.1, .1, .76, band, x, .07, .36, lid));
  lid.rotation.x = -1.95;
  // pilha de ouro dentro
  const pile = new THREE.Mesh(new THREE.SphereGeometry(.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold); pile.scale.set(1.05, .55, .6); pile.position.y = .5; g.add(pile);
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const coinG = new THREE.CylinderGeometry(.075, .075, .02, 10);
  const coin = (x, y, z, tilt) => { const c = new THREE.Mesh(coinG, rnd() < .3 ? band : gold); c.position.set(x, y, z); c.rotation.set(tilt * (rnd() - .5) * 2, rnd() * 3, tilt * (rnd() - .5) * 2); g.add(c); return c; };
  for (let i = 0; i < 26; i++) coin((rnd() - .5) * .95, .6 + rnd() * .12, (rnd() - .5) * .45, .9);   // moedas sobre a pilha
  const gems = [0xe02848, 0x2a6ae0, 0x28c070, 0xa040e0, 0xf0f0ff, 0xf08020].map(c => M(c, c & 0x7f7f7f));
  const gemG = new THREE.OctahedronGeometry(.075), gem = (x, y, z, k) => { const m = new THREE.Mesh(gemG, gems[k % 6]); m.position.set(x, y, z); m.scale.set(1, 1.3, 1); m.rotation.y = rnd() * 3; g.add(m); };
  for (let i = 0; i < 9; i++) gem((rnd() - .5) * .85, .66 + rnd() * .1, (rnd() - .5) * .38, i);          // joias dentro
  // ao redor: moedas espalhadas, pilhas e joias
  for (let i = 0; i < 24; i++) { const a = rnd() * 6.28, d = .75 + rnd() * .55; coin(Math.cos(a) * d * 1.1, .015 + (rnd() < .2 ? .02 : 0), Math.abs(Math.sin(a)) * d * .7 + .3, .05).scale.setScalar(.78); }
  [[-.85, .45], [.9, .55], [.55, .85]].forEach(([x, z]) => { for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(coinG, k % 3 ? gold : band); c.scale.setScalar(.78); c.position.set(x, .012 + k * .017, z); c.rotation.y = rnd() * 3; g.add(c); } });
  // no chão só moedas (as joias ficam dentro do baú)
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,224,120,.9)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, .9, -.5); g.add(glow);
  return g;
}

function scene3d(root, cv) {
  const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  ren.setClearColor(0, 0);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  sc.add(new THREE.HemisphereLight(0x8ea4cc, 0x2a1810, .62));   // luar frio
  const dl = new THREE.DirectionalLight(0xffa860, .22); dl.position.set(4, 3, 8); sc.add(dl);   // resto de luz das tochas
  const gl = new THREE.PointLight(0xffc860, 2.6, 15, 1.4); sc.add(gl);   // brilho do tesouro: ilumina os heróis pelo lado de dentro
  const rim = new THREE.DirectionalLight(0x7a98d8, .7); rim.position.set(-6, 5, -4); sc.add(rim);
  // heróis com roupa de pirata (melhor que a roupa inicial) e a aparência escolhida
  const mk = (f, a) => { const L = resolveLook(f, cleanLook(f, a)), base = f ? SKF.pirata : SKM.pirata; return buildHuman(f, Object.assign({}, base, { skin: L.skin, hair: L.hair, look: L, ex: f ? ['earring'] : [] })); };
  const hm = mk(false, { hs: 2, hc: 2, sk: 2, ey: 3, bs: 3, bc: 2 }), hf = mk(true, { hs: 6, hc: 7, sk: 1, ey: 2, bs: 2 });
  const pirate = enemyModel(ENEMY_KINDS[7]), skel = enemyModel(ENEMY_KINDS[5]);
  const raven = mkRaven(), parrot = mkParrot();
  // o menino segura o mosquete com as duas mãos; a menina, a espada erguida na direita e uma tocha na esquerda
  hm.arm.fa.children.forEach(c => { if (c.userData.sword) c.visible = false; });
  const gun = WEAPONS[WEAPONS.findIndex(w => /Mosquete/.test(w.n))].build(); gun.position.set(0, -.32, 0); hm.arm.fa.add(gun);
  const torch = WEAPONS[WEAPONS.findIndex(w => /Tocha/.test(w.n))].build(); torch.position.y = .12;
  const tg = new THREE.Group(); tg.position.set(0, -.32, 0); tg.add(torch); hf.armL.fa.add(tg);
  const tl = new THREE.PointLight(0xff8a30, 1.4, 9, 1.6); tl.position.set(0, .45, .1); tg.add(tl);   // luz da tocha (treme)
  const all = [hm, hf, pirate, skel];
  const blob = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .5, depthWrite: false });
  const shadows = all.map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(.6, 20).rotateX(-Math.PI / 2), blob); sc.add(m); return m; });
  const tre = mkChest(); sc.add(tre);
  all.forEach(g => sc.add(g)); sc.add(raven, parrot);
  const box = new THREE.Box3(), h0 = all.map(g => { g.scale.setScalar(1); box.setFromObject(g); return box.max.y - box.min.y; });
  hm.rotation.y = .5; hf.rotation.y = -.5; pirate.rotation.y = Math.PI - .35; skel.rotation.y = Math.PI + .35;

  // faíscas douradas subindo do baú
  const NS = 48, sp = new Float32Array(NS * 3), sph = Array.from({ length: NS }, () => [Math.random(), Math.random() * 6.28, .5 + Math.random()]);
  const spg = new THREE.BufferGeometry(); spg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(spg, new THREE.PointsMaterial({ color: 0xffd070, size: .13, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; sc.add(sparks);
  const DIST = 16;
  let W = 1, H = 1, hero = 1, ene = 1, hx = 1, ex = 1;
  /** posiciona `g` com os pés em (sx, sy) da tela (0..1) e altura `hs` (fração da altura da tela) */
  function place(i, g, sx, sy, hs, z, ref = i) {
    const d = DIST - z, half = Math.tan(15 * Math.PI / 180) * d, aspect = W / H;
    const sH = hs * 2 * half / h0[ref];
    g.scale.setScalar(sH); g.position.set((sx - .5) * 2 * half * aspect, (.5 - sy) * 2 * half, z);
    if (i > 1) shadows[i].visible = false;
    shadows[i].position.set(g.position.x, g.position.y + .02, z); shadows[i].scale.setScalar(sH * 1.1);
    return sH;
  }
  let bs = 1, birdY = 0, chestS = 1, T = 0, px = 0, py = 0, tx = 0, ty = 0;
  function layout() {
    W = innerWidth; H = innerHeight; const aspect = W / H;
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); ren.setSize(W, H, false);
    cam.aspect = aspect; cam.position.set(0, 0, DIST); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const portrait = aspect < 1;
    const hh = portrait ? Math.min(.26, .8 * aspect * .9) : .33;            // altura dos heróis (fração da tela)
    const fy = portrait ? .72 : .75;                                          // pés dos heróis (retrato: título no centro)
    const hxs = portrait ? .27 : .24;                                         // distância ao centro (fração da largura)
    const eh = hh * 2.1, exs = portrait ? .3 : .27;
    bs = place(0, hm, .5 - hxs, fy, hh, -3, 1); place(1, hf, .5 + hxs, fy, hh, -3);   // menino e menina com a mesma escala
    place(2, pirate, .5 - exs, 1.2, eh, 5); place(3, skel, .5 + exs, 1.2, eh, 5);
    { const z = -7, half = Math.tan(15 * Math.PI / 180) * (DIST - z), cs = .86 * Math.min(.34 * 2 * half * aspect / 1.2, hh * 2 * half * .95 / 1.0);
      tre.scale.setScalar(cs); tre.position.set(0, (.5 - fy - .005) * 2 * half, z); chestS = cs; gl.position.set(0, tre.position.y + cs * .9, z + 2.2); }
    hero = hh; birdY = hh;
    const ps = bs * .55; raven.scale.setScalar(ps); parrot.scale.setScalar(ps);
  }
  

  /** Poses fixas (sem animação): heróis inclinados para o inimigo da diagonal, inimigos de costas, inclinados para trás olhando o herói da diagonal oposta */
  function pose() {
    hm.rotation.y = .6; hf.rotation.y = -.6; pirate.rotation.y = Math.PI - .7; skel.rotation.y = Math.PI + .7;
    [hm, hf].forEach(g => { g.up.rotation.x = .12; g.legL.knee.rotation.x = .4; g.legR.knee.rotation.x = .3; g.legL.rotation.x = -.4; g.legR.rotation.x = .3; });
    // menino mirando o mosquete com as duas mãos
    hm.arm.rotation.set(-1.4, 0, .12); hm.arm.fa.rotation.x = -.15; hm.armL.rotation.set(-1.55, 0, -.55); hm.armL.fa.rotation.x = -.2;
    hm.head.rotation.z = .16; hm.head.rotation.x = -.04; hm.eyeL.scale.y = .15;
    // menina: espada erguida (direita) e tocha (esquerda, em pé)
    hf.arm.rotation.set(-2.6, 0, .1); hf.arm.fa.rotation.x = -.3; hf.armL.rotation.set(-.9, 0, -.4); hf.armL.fa.rotation.x = -.6;
    tg.rotation.set(-(hf.armL.rotation.x + hf.armL.fa.rotation.x), 0, .1);
    [[pirate, 1], [skel, -1]].forEach(([g, d]) => {
      g.arm.rotation.set(-.9, 0, 0); g.arm.fa.rotation.x = -.5; g.armL.rotation.set(-.3, 0, .3);
      g.up.rotation.x = -.14; g.legL.knee.rotation.x = .2; g.legR.knee.rotation.x = .2; if (g.head) g.head.rotation.y = d * .25;
    });
    const half = Math.tan(15 * Math.PI / 180) * (DIST + 3), y = hero * 2 * half * 1.14;
    raven.position.set(hm.position.x, hm.position.y + y, -2.6); raven.rotation.set(0, .5, -.12);
    parrot.position.set(hf.position.x, hf.position.y + y, -2.6); parrot.rotation.set(0, -.5, .12);
    [raven, parrot].forEach(g => { const f = .75; if (g.pw) g.pw.forEach(w => { w.sh.rotation.set(0, 0, -w.s * f); w.tip.rotation.set(0, 0, -w.s * f * .5); }); else if (g.wl) { g.wl.rotation.z = f; g.wr.rotation.z = -f; } });
  }
  /** movimento ocioso: respiração, tocha tremendo, aves em voo, faíscas, câmera lenta com parallax */
  function idle() {
    const w = Math.sin;
    [hm, hf].forEach((g, i) => { g.up.rotation.x += w(T * 1.5 + i * 1.7) * .014; g.head.rotation.x += w(T * 1.5 + i * 1.7 + .6) * .012; });
    hf.arm.rotation.z += w(T * 1.1) * .03; hf.armL.rotation.x += w(T * 1.3) * .035; hm.arm.rotation.x += w(T * .9) * .015;
    [pirate, skel].forEach((g, i) => { g.up.rotation.x += w(T * 1.2 + i * 2) * .018; });
    tl.intensity = 1.25 + w(T * 13) * .22 + w(T * 7.3 + 1) * .2 + w(T * 31) * .1;
    gl.intensity = 2.5 + w(T * 2.1) * .3 + w(T * 9) * .12;
    // aves: voo em círculo e batida de asas
    [[raven, 0], [parrot, 2]].forEach(([g, o]) => {
      g.position.x += w(T * .8 + o) * bs * .35; g.position.y += w(T * 1.7 + o) * bs * .12; g.rotation.z += Math.cos(T * .8 + o) * .15;
      const f = .35 + (w(T * 11 + o) * .5 + .5) * .75;
      if (g.pw) g.pw.forEach(q => { q.sh.rotation.set(0, 0, -q.s * f); q.tip.rotation.set(0, 0, -q.s * f * .5); }); else if (g.wl) { g.wl.rotation.z = f; g.wr.rotation.z = -f; }
    });
    for (let i = 0; i < NS; i++) { const [ph, a, v] = sph[i], k = (T * .12 * v + ph) % 1;
      sp[i * 3] = tre.position.x + Math.cos(a + T * .6) * chestS * (.15 + k * .5); sp[i * 3 + 1] = tre.position.y + chestS * (.5 + k * 2.4); sp[i * 3 + 2] = tre.position.z + w(a * 3 + T) * chestS * .3; }
    spg.attributes.position.needsUpdate = true; sparks.material.opacity = .55 + w(T * 3) * .25;
    // câmera: aproximação lenta e leve parallax; um pouco mais baixa, olhando os heróis de baixo
    px += (tx - px) * .04; py += (ty - py) * .04;
    const k = Math.min(1, T / 26), e = k * (2 - k);
    cam.position.set(px * .8, -.5 + py * .35, DIST - 2.2 * e); cam.lookAt(0, .25, 0);
  }
  function frame() { pose(); idle(); ren.render(sc, cam); }
  const mv = e => { tx = (e.clientX / innerWidth - .5) * 2; ty = -(e.clientY / innerHeight - .5) * 2; };
  addEventListener('pointermove', mv);
  const redraw = () => { layout(); frame(); };
  redraw(); addEventListener('resize', redraw);
  return { frame, tick(dt) { T += dt; frame(); }, dispose() { removeEventListener('resize', redraw); removeEventListener('pointermove', mv); sc.traverse(c => { if (c.geometry) c.geometry.dispose(); }); ren.dispose(); } };
}

/** Mostra a tela inicial; resolve quando o jogador toca em Jogar */
export function runTitle() {
  return new Promise(res => {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'ttl';
    if (!document.getElementById('ttl-fonts')) { const l = document.createElement('link'); l.id = 'ttl-fonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Cinzel+Decorative:wght@900&family=IM+Fell+English:ital@1&display=swap'; document.head.appendChild(l); }
    root.innerHTML = `<div class="moon"></div><div class="sea"></div><svg class="ship" viewBox="0 0 300 200" fill="#05070c"><path d="M20 140 Q60 170 150 172 Q240 170 285 130 L262 128 L250 110 L50 112 L36 126Z"/><rect x="146" y="14" width="3" height="120"/><rect x="82" y="34" width="3" height="100"/><rect x="214" y="44" width="3" height="90"/><path d="M104 22 L146 24 L144 84 Q124 94 104 84Z M60 44 L82 46 L80 92 Q70 98 60 92Z M174 30 L212 34 L210 92 Q192 102 174 94Z M222 52 L214 54 L216 96 Q232 98 240 90Z"/><path d="M149 14 L172 20 L149 26Z" fill="#2a0a0a"/><rect x="284" y="118" width="14" height="3" transform="rotate(-18 284 118)"/></svg><div class="fog a"></div><canvas></canvas><div class="fog b"></div><canvas class="em"></canvas><div class="storm"></div><div class="flash"></div><svg class="bolt" viewBox="0 0 40 120" fill="none" stroke="#f4f7ff" stroke-width="3.2" stroke-linejoin="round"><path d="M26 0 L14 38 L24 40 L8 80 L18 82 L4 120"/><path d="M16 52 L30 70" stroke-width="1.4"/></svg><div class="vig"></div>
      <div class="tt"><h1><span class="t1">Tiny</span><span class="t2">Pirates</span><small>RPG</small></h1><p class="tag">O mar não perdoa. O tesouro, menos ainda.</p><button>Jogar</button></div><div class="ver">${VERSION}</div>`;
    document.body.appendChild(root);
    let S = null, raf = 0, done = false;
    const ec = root.querySelector('canvas.em'), ex = ec.getContext('2d'), E = [];
    const eReset = (o, init) => { o.x = Math.random(); o.y = init ? Math.random() : 1.05; o.r = .6 + Math.random() * 1.8; o.v = .02 + Math.random() * .07; o.w = Math.random() * 6.28; o.a = .3 + Math.random() * .7; o.h = Math.random() < .25 ? 40 : 18 + Math.random() * 14; };
    for (let i = 0; i < 90; i++) { const o = {}; eReset(o, true); E.push(o); }
    // relâmpagos aleatórios (fosco e discreto) na tempestade ao fundo, à esquerda
    const fl = root.querySelector('.flash'), bo = root.querySelector('.bolt'); let lg = 0;
    const strike = () => {
      const x = 3 + Math.random() * 28, k = .7 + Math.random() * .6;
      bo.style.left = x + '%'; bo.style.top = (14 + Math.random() * 6) + '%'; bo.style.transform = 'scale(' + (Math.random() < .5 ? -k : k) + ',' + k + ')';
      fl.style.left = (x - 14) + '%';
      const n = 1 + Math.floor(Math.random() * 3), kf = [{ opacity: 0 }];
      for (let i = 0; i < n; i++) { kf.push({ opacity: .85 - i * .2 }, { opacity: .08 }); }
      kf.push({ opacity: 0 });
      const o = { duration: 280 + n * 170, easing: 'steps(1,end)' };
      fl.animate(kf.map(f => ({ opacity: f.opacity * .75 })), o); bo.animate(kf.map(f => ({ opacity: f.opacity * 1 })), o);
      lg = setTimeout(strike, 2500 + Math.random() * 9000);
    };
    lg = setTimeout(strike, 1800 + Math.random() * 2500);
    let lt = performance.now();
    const emb = now => {
      const dt = Math.min(.05, (now - lt) / 1000); lt = now;
      const W = ec.width = innerWidth, H = ec.height = innerHeight;
      ex.clearRect(0, 0, W, H);
      E.forEach(o => {
        o.y -= o.v * dt; o.w += dt * 1.6; o.x += Math.sin(o.w) * .02 * dt + .004 * dt; if (o.y < -.05 || o.x > 1.05) eReset(o, false);
        const fl = .6 + .4 * Math.sin(o.w * 5), al = o.a * fl * Math.min(1, Math.max(0, o.y * 1.6));
        ex.fillStyle = 'hsla(' + o.h + ',100%,60%,' + al + ')'; ex.shadowColor = 'hsla(' + o.h + ',100%,55%,.9)'; ex.shadowBlur = 8;
        ex.beginPath(); ex.arc(o.x * W, o.y * H, o.r, 0, 6.283); ex.fill();
      });
      if (S) S.tick(dt);
      raf = requestAnimationFrame(emb);
    };
    raf = requestAnimationFrame(emb);
    try { S = scene3d(root, root.querySelector('canvas')); } catch (e) { console.warn('title 3d', e); root.querySelector('canvas').remove(); }
    const go = () => {
      if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(lg); removeEventListener('keydown', key, true);
      root.style.transition = 'opacity .3s'; root.style.opacity = 0;
      setTimeout(() => { if (S) S.dispose(); root.remove(); st.remove(); res(); }, 300);
    };
    const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    root.querySelector('button').onclick = go; addEventListener('keydown', key, true);
  });
}
