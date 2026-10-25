/* Tela inicial "Tiny Pirates": cena 3D (heróis de frente atacando, inimigos de costas, aves voando) atrás do título HTML. */
import { VERSION } from '../core/version.js';
import { playerModel, enemyModel } from '../entities/character.js';
import { ENEMY_KINDS } from '../data/enemies.js';
import { mkParrot, mkRaven } from '../pets/models.js';
import { WEAPONS } from '../data/weapons.js';
import { cleanLook } from '../entities/look.js';

const CSS = `
#ttl{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(4vh + env(safe-area-inset-top,0px)) 0 calc(5vh + env(safe-area-inset-bottom,0px));overflow:hidden;color:#f3e6c4;font-family:Cinzel,'Trajan Pro','Palatino Linotype',Georgia,serif;user-select:none;-webkit-user-select:none;
 background:linear-gradient(#16304f 0%,#3f7a9c 30%,#e8c47a 37%,#f4dca0 38%,#2f6a8a 39%,#2f6a8a 42%,#e0c07c 42.4%,#c9a15c 62%,#8f6a34 100%)}
#ttl canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#ttl .sun{position:absolute;left:50%;top:24%;width:min(40vw,40vh);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#fff3c0,#f6b84a 52%,#f6b84a00 72%);opacity:.85}
#ttl .vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,#0000 45%,#0009 100%)}
#ttl h1{position:relative;margin:0;text-align:center;line-height:.92;font-size:clamp(46px,min(15vw,19vh),150px);letter-spacing:.05em;text-transform:uppercase;color:#ffe9a8;text-shadow:0 3px 0 #8a3a14,0 6px 0 #4a1c0a,0 14px 26px #000b;-webkit-text-stroke:2px #5a2410;pointer-events:none}
#ttl h1 small{display:block;font-size:.3em;letter-spacing:.55em;color:#fff;-webkit-text-stroke:1px #1b3a5c;text-shadow:0 2px 0 #1b3a5c,0 4px 10px #000a;margin-top:.25em;padding-left:.55em}
#ttl button{position:relative;appearance:none;font:inherit;font-size:clamp(20px,4.5vw,30px);font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#fff;padding:.7em 2.4em;border:2px solid #e8e0d0;border-radius:4px;cursor:pointer;background:linear-gradient(#b82020,#6a0c0c);box-shadow:0 0 0 2px #000,0 6px 0 #3a0606,0 10px 24px #000a;touch-action:manipulation;animation:ttp 1.6s ease-in-out infinite}
#ttl button:active{transform:translateY(4px);box-shadow:0 0 0 2px #000,0 2px 0 #3a0606}
@keyframes ttp{50%{filter:brightness(1.25)}}
#ttl .ver{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(6px + env(safe-area-inset-bottom,0px));font-size:11px;letter-spacing:.15em;color:#fffc;text-shadow:0 1px 2px #000}
@media (orientation:landscape) and (max-height:480px){#ttl{padding-top:2vh;padding-bottom:3vh}#ttl h1{font-size:clamp(34px,16vh,90px)}#ttl button{padding:.45em 2em;font-size:clamp(16px,6vh,26px)}}
`;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

function scene3d(root, cv) {
  const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  ren.setClearColor(0, 0);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  sc.add(new THREE.HemisphereLight(0xfff0d0, 0x6a5030, .95));
  const dl = new THREE.DirectionalLight(0xffe2b0, .8); dl.position.set(-4, 6, 8); sc.add(dl);
  const mk = (f, a) => playerModel(f, cleanLook(f, a));
  const hm = mk(false, { hs: 2, hc: 2, sk: 2, ey: 3, bs: 3, bc: 2 }), hf = mk(true, { hs: 6, hc: 7, sk: 1, ey: 2, bs: 2, hc2: 0 });
  const pirate = enemyModel(ENEMY_KINDS[7]), skel = enemyModel(ENEMY_KINDS[5]);
  const raven = mkRaven(), parrot = mkParrot();
  // a menina empunha um mosquete (o modelo vai no antebraço da arma; a espada padrão some)
  hf.arm.fa.children.forEach(c => { if (c.userData.sword) c.visible = false; });
  const gun = WEAPONS[WEAPONS.findIndex(w => /Mosquete/.test(w.n))].build(); gun.position.set(0, -.32, 0); hf.arm.fa.add(gun);
  const all = [hm, hf, pirate, skel];
  const blob = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .32, depthWrite: false });
  const shadows = all.map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(.6, 20).rotateX(-Math.PI / 2), blob); sc.add(m); return m; });
  all.forEach(g => sc.add(g)); sc.add(raven, parrot);
  const box = new THREE.Box3(), h0 = all.map(g => { g.scale.setScalar(1); box.setFromObject(g); return box.max.y - box.min.y; });
  hm.rotation.y = .5; hf.rotation.y = -.5; pirate.rotation.y = Math.PI - .35; skel.rotation.y = Math.PI + .35;

  const DIST = 16;
  let W = 1, H = 1, hero = 1, ene = 1, hx = 1, ex = 1;
  /** posiciona `g` com os pés em (sx, sy) da tela (0..1) e altura `hs` (fração da altura da tela) */
  function place(i, g, sx, sy, hs, z) {
    const d = DIST - z, half = Math.tan(15 * Math.PI / 180) * d, aspect = W / H;
    const sH = hs * 2 * half / h0[i];
    g.scale.setScalar(sH); g.position.set((sx - .5) * 2 * half * aspect, (.5 - sy) * 2 * half, z);
    shadows[i].position.set(g.position.x, g.position.y + .02, z); shadows[i].scale.setScalar(sH * 1.1);
    return sH;
  }
  let bs = 1, birdY = 0;
  function layout() {
    W = innerWidth; H = innerHeight; const aspect = W / H;
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); ren.setSize(W, H, false);
    cam.aspect = aspect; cam.position.set(0, 0, DIST); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const portrait = aspect < 1;
    const hh = portrait ? Math.min(.36, .9 * aspect * .9) : .46;            // altura dos heróis (fração da tela)
    const hxs = portrait ? .27 : .24;                                         // distância ao centro (fração da largura)
    const eh = hh * .66, exs = portrait ? .3 : .27;
    bs = place(0, hm, .5 - hxs, .5, hh, 0); place(1, hf, .5 + hxs, .5, hh, 0);
    place(2, pirate, .5 - exs, .93, eh, 1.8); place(3, skel, .5 + exs, .93, eh, 1.8);
    hero = hh; birdY = hh;
    const ps = bs * .55; raven.scale.setScalar(ps); parrot.scale.setScalar(ps);
  }
  

  /** Poses fixas (sem animação): heróis inclinados para o inimigo da diagonal, inimigos de costas, inclinados para trás olhando o herói da diagonal oposta */
  function pose() {
    hm.rotation.y = .6; hf.rotation.y = -.6; pirate.rotation.y = Math.PI - .7; skel.rotation.y = Math.PI + .7;
    [hm, hf].forEach(g => {
      g.arm.rotation.set(-1.9, 0, 0); g.arm.fa.rotation.x = -.9; g.armL.rotation.set(-.6, 0, -.35);
      g.up.rotation.x = .22; g.legL.knee.rotation.x = .45; g.legR.knee.rotation.x = .3; g.legL.rotation.x = -.45; g.legR.rotation.x = .3;
    });
    // menina mirando o mosquete: braços à frente segurando a arma, cabeça inclinada, olho esquerdo fechado
    hf.arm.rotation.set(-1.4, 0, .12); hf.arm.fa.rotation.x = -.15; hf.armL.rotation.set(-1.55, 0, -.55); hf.armL.fa.rotation.x = -.2;
    hf.up.rotation.x = .08; hf.head.rotation.z = .16; hf.head.rotation.x = -.04; hf.eyeL.scale.y = .15;
    [[pirate, 1], [skel, -1]].forEach(([g, d]) => {
      g.arm.rotation.set(-.9, 0, 0); g.arm.fa.rotation.x = -.5; g.armL.rotation.set(-.3, 0, .3);
      g.up.rotation.x = -.14; g.legL.knee.rotation.x = .2; g.legR.knee.rotation.x = .2; if (g.head) g.head.rotation.y = d * .25;
    });
    const half = Math.tan(15 * Math.PI / 180) * DIST, y = hero * 2 * half * 1.14;
    raven.position.set(hm.position.x, hm.position.y + y, .4); raven.rotation.set(0, .5, -.12);
    parrot.position.set(hf.position.x, hf.position.y + y, .4); parrot.rotation.set(0, -.5, .12);
    [raven, parrot].forEach(g => { const f = .75; if (g.pw) g.pw.forEach(w => { w.sh.rotation.set(0, 0, -w.s * f); w.tip.rotation.set(0, 0, -w.s * f * .5); }); else if (g.wl) { g.wl.rotation.z = f; g.wr.rotation.z = -f; } });
  }
  function frame() { pose(); ren.render(sc, cam); }
  const redraw = () => { layout(); frame(); };
  redraw(); addEventListener('resize', redraw);
  return { frame, dispose() { removeEventListener('resize', redraw); sc.traverse(c => { if (c.geometry) c.geometry.dispose(); }); ren.dispose(); } };
}

/** Mostra a tela inicial; resolve quando o jogador toca em Jogar */
export function runTitle() {
  return new Promise(res => {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'ttl';
    root.innerHTML = `<div class="sun"></div><canvas></canvas><div class="vig"></div>
      <h1>Tiny<br>Pirates<small>RPG</small></h1>
      <button>Jogar</button><div class="ver">${VERSION}</div>`;
    document.body.appendChild(root);
    let S = null, raf = 0, done = false;
    try { S = scene3d(root, root.querySelector('canvas')); } catch (e) { console.warn('title 3d', e); root.querySelector('canvas').remove(); }
    const go = () => {
      if (done) return; done = true; removeEventListener('keydown', key, true);
      root.style.transition = 'opacity .3s'; root.style.opacity = 0;
      setTimeout(() => { if (S) S.dispose(); root.remove(); st.remove(); res(); }, 300);
    };
    const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    root.querySelector('button').onclick = go; addEventListener('keydown', key, true);
  });
}
