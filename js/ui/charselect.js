/* Tela de seleção de personagem (estilo Diablo IV): lista de vagas à esquerda, o personagem em 3D ao centro, detalhes à direita
   e "Iniciar jogo" embaixo. Funciona em retrato e paisagem (celular): no retrato o personagem fica em cima e a lista embaixo.
   Roda ANTES do jogo carregar (boot.js): só usa THREE (global), core/chars.js e o corpo humano (human.js, sem dependências). */
import { chars, activeChar, createChar, deleteChar, setActive, summary, MAX_CHARS } from '../core/chars.js';
import { playerModel } from '../entities/character.js';
import { SKINS, SKIN_NAMES, HAIRC, HAIRC_NAMES, EYES, EYE_NAMES, LIPS, LIP_NAMES, HAIR_NAMES, BEARD_NAMES, defaultLook, randomLook } from '../entities/look.js';

const CSS = `
#cs{position:fixed;inset:0;z-index:50;background:radial-gradient(ellipse at 50% 38%,#4a2e1c 0%,#24150d 48%,#0b0705 100%);color:#e8d9b8;font-family:Cinzel,'Trajan Pro','Palatino Linotype',Georgia,serif;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
#cs *{box-sizing:border-box}
#cs canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
#cs .vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 45%,#000a 100%)}
#cs .pn{position:absolute;background:linear-gradient(#1b1210ee,#120b09f2);border:1px solid #6b4a2a;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #2e1d12,0 8px 30px #000c;border-radius:4px}
#cs .pn::before{content:"";position:absolute;left:-1px;right:-1px;top:-1px;height:6px;border-radius:4px 4px 0 0;background:linear-gradient(90deg,#5a0f0f,#a21c1c,#5a0f0f);opacity:.9}
#cs h2{margin:0;font-size:13px;letter-spacing:.2em;text-align:center;color:#b9a47c;font-weight:600;text-transform:uppercase}
#cs .L{left:max(14px,env(safe-area-inset-left,0px));top:max(14px,env(safe-area-inset-top,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));width:min(320px,34vw);display:flex;flex-direction:column;gap:10px;padding:16px 12px 12px}
#cs .R{right:max(14px,env(safe-area-inset-right,0px));top:max(14px,env(safe-area-inset-top,0px));width:min(290px,30vw);padding:20px 16px 16px;display:flex;flex-direction:column;gap:10px;align-items:stretch}
#cs .btn{appearance:none;border:1px solid #000;border-radius:3px;font:inherit;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f3e6c8;cursor:pointer;padding:12px 10px;font-size:13px;background:linear-gradient(#a82222,#6e1111);box-shadow:inset 0 0 0 1px #d4503a88,0 2px 6px #000a;touch-action:manipulation}
#cs .btn:active{filter:brightness(.85)}
#cs .btn.dim{background:linear-gradient(#3b2a22,#241812);box-shadow:inset 0 0 0 1px #6b4a2a88;color:#cdb98f}
#cs .btn[disabled]{opacity:.4;pointer-events:none}
#cs .list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0;flex:1;padding-right:2px;-webkit-overflow-scrolling:touch}
#cs .slot{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #4a3220;border-radius:3px;background:#1a110d;cursor:pointer;min-height:58px;flex:none}
#cs .slot.on{border-color:#e8e0d0;box-shadow:0 0 0 1px #a21c1c,inset 0 0 20px #a21c1c66;background:linear-gradient(90deg,#7a1414,#4a0c0c)}
#cs .slot.empty{opacity:.45;border-style:dashed;justify-content:center;font-size:12px;letter-spacing:.15em;color:#9a8660}
#cs .av{width:42px;height:42px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:22px;font-weight:700;border:2px solid #6b4a2a;background:radial-gradient(#3a2a20,#150d09)}
#cs .av.f{color:#e88aa0}#cs .av.m{color:#8ab8e8}
#cs .nm{font-size:16px;font-weight:700;color:#f0e4c8;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cs .sb{font-size:12px;color:#b9a47c;margin-top:2px}
#cs .lv{margin-left:auto;font-size:20px;font-weight:700;color:#f0e4c8;min-width:34px;text-align:right;flex:none}
#cs .lv small{display:block;font-size:9px;letter-spacing:.15em;color:#b9a47c;font-weight:600}
#cs .info{display:flex;flex-direction:column;gap:6px;text-align:center}
#cs .info .big{font-size:22px;font-weight:700;color:#f0e4c8;overflow:hidden;text-overflow:ellipsis}
#cs .info .row{display:flex;justify-content:space-between;font-size:13px;border-top:1px solid #3a2718;padding-top:6px;color:#b9a47c}
#cs .info .row b{color:#f0e4c8}
#cs .bar{position:absolute;left:0;right:0;bottom:0;padding:12px max(14px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px));display:flex;justify-content:center;align-items:center;gap:14px;background:linear-gradient(transparent,#000d 55%)}
#cs .bar .btn{min-width:min(280px,60vw);font-size:16px;padding:15px 18px}
#cs .hint{font-size:12px;letter-spacing:.1em;color:#9a8660;text-align:center}
#cs .modal{position:absolute;inset:0;background:#000b;display:none;align-items:center;justify-content:center;padding:14px}
#cs .modal.on{display:flex}
#cs .dlg{position:relative;width:min(440px,100%);max-height:100%;overflow:auto;padding:24px 18px 18px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(#1b1210,#120b09);border:1px solid #6b4a2a;border-radius:4px;box-shadow:0 0 0 1px #000,0 12px 40px #000}
#cs.ed .L,#cs.ed .R,#cs.ed .bar{display:none}
#cs .modal{background:transparent;pointer-events:none}
#cs .modal .dlg{pointer-events:auto}
#cs .modal .dlg{max-height:100%}
#cs .ap{display:flex;flex-direction:column;gap:9px}
#cs .ar{display:flex;align-items:center;gap:8px}
#cs .ar label{flex:0 0 74px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a89878}
#cs .ar .st{flex:1;display:flex;align-items:center;gap:6px}
#cs .ar .st button{appearance:none;font:inherit;width:36px;height:34px;background:#1a110d;color:#e8e0d0;border:1px solid #4a3220;border-radius:3px;cursor:pointer;touch-action:manipulation}
#cs .ar .st span{flex:1;text-align:center;font-size:13px;color:#e8e0d0}
#cs .sw{flex:1;display:flex;flex-wrap:wrap;gap:5px}
#cs .sw b{width:26px;height:26px;border-radius:50%;border:2px solid #3a2a1c;cursor:pointer;touch-action:manipulation}
#cs .sw b.on{border-color:#fff;box-shadow:0 0 0 1px #000}
@media (orientation:portrait),(max-width:700px){#cs .modal{align-items:flex-end;padding:0}#cs .modal .dlg{width:100%;max-height:42%;border-radius:10px 10px 0 0;padding:12px 12px calc(10px + env(safe-area-inset-bottom,0px));gap:8px}#cs .modal .dlg h2{display:none}#cs .modal .gen button{padding:6px;font-size:12px}#cs .modal .gen button i{display:inline;font-size:16px;margin-right:6px}#cs .modal .ap{gap:5px}#cs .modal .ar label{flex-basis:62px;font-size:10px}#cs .modal .sw b{width:22px;height:22px}#cs .modal .ar .st button{height:28px;width:32px}#cs .modal input{font-size:15px;padding:6px 10px}#cs .modal .btn{padding:9px}}
@media (orientation:landscape) and (min-width:701px){#cs .modal{justify-content:flex-start}#cs .modal .dlg{max-height:100%}}
#cs .gen{display:flex;gap:10px}
#cs .gen button{flex:1;appearance:none;font:inherit;color:#cdb98f;background:#1a110d;border:2px solid #4a3220;border-radius:4px;padding:12px 6px;cursor:pointer;font-size:14px;letter-spacing:.1em;text-transform:uppercase;touch-action:manipulation}
#cs .gen button i{display:block;font-style:normal;font-size:30px;line-height:1.1}
#cs .gen button.on{border-color:#e8e0d0;background:linear-gradient(#7a1414,#4a0c0c);color:#fff}
#cs label{font-size:12px;letter-spacing:.15em;color:#b9a47c;text-transform:uppercase}
#cs .nrow{display:flex;gap:8px}
#cs input{flex:1;min-width:0;font:inherit;font-size:18px;padding:10px 12px;color:#f0e4c8;background:#0c0705;border:1px solid #6b4a2a;border-radius:3px;outline:none}
#cs input:focus{border-color:#d4a850}
#cs .dice{width:48px;flex:none;padding:0;font-size:22px}
#cs .err{min-height:16px;color:#e85a4a;font-size:12px;text-align:center}
#cs .load{position:absolute;inset:0;background:#0b0705;display:none;flex-direction:column;gap:14px;align-items:center;justify-content:center;font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#b9a47c}
#cs .load.on{display:flex}
#cs .load i{width:38px;height:38px;border:3px solid #3a2718;border-top-color:#c23b2b;border-radius:50%;animation:csr 1s linear infinite}
@keyframes csr{to{transform:rotate(360deg)}}
/* retrato: personagem em cima, lista embaixo (rolável), detalhes numa faixa fina */
@media (orientation:portrait),(max-width:700px){
 #cs .L{left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));top:auto;width:auto;bottom:calc(80px + env(safe-area-inset-bottom,0px));height:min(40vh,300px);padding:14px 10px 10px}
 #cs .R{left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));top:max(10px,env(safe-area-inset-top,0px));width:auto;flex-direction:row;align-items:center;padding:14px 12px 10px;gap:10px}
 #cs .R h2{display:none}
 #cs .R .info{flex:1;min-width:0;text-align:left}
 #cs .R .info .big{font-size:18px}
 #cs .R .info .row{display:none}
 #cs .R .info .row.k{display:flex;border:0;padding:0}
 #cs .R .btn{padding:8px 10px;font-size:11px}
 #cs .bar .btn{min-width:min(320px,86vw)}
}
@media (orientation:landscape) and (max-height:480px){
 #cs .L{top:max(8px,env(safe-area-inset-top,0px));bottom:calc(66px + env(safe-area-inset-bottom,0px));width:min(300px,36vw);padding:12px 10px 8px}
 #cs .R{top:max(8px,env(safe-area-inset-top,0px));width:min(250px,28vw);padding:14px 12px 12px}
 #cs .slot{min-height:50px;padding:6px}#cs .av{width:36px;height:36px;font-size:19px}
 #cs .bar{padding-top:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}#cs .bar .btn{padding:11px 16px;font-size:14px}
 #cs .info .big{font-size:18px}
}
`;

const NAMES = { m: ['Jack Corvo', 'Barão Maré', 'Tomás Sal', 'Diego Âncora', 'Bento Ferrugem', 'Caio Tormenta', 'Rui Vela', 'Davi Naufrago'], f: ['Mary Vela', 'Isabela Tormenta', 'Anne Corsária', 'Luna Maré', 'Dona Pérola', 'Clara Âncora', 'Sofia Brisa', 'Bia Corsária'] };
const pick = a => a[Math.floor(Math.random() * a.length)];

export function runCharSelect() {
  // modo de desenvolvimento/testes (#dev): pula a seleção
  if (location.hash === '#dev') return Promise.resolve();
  return new Promise(resolve => {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&display=swap'; document.head.appendChild(fl);
    const root = document.createElement('div'); root.id = 'cs';
    root.innerHTML = `
      <canvas></canvas><div class="vig"></div>
      <div class="pn L"><h2 data-k="slots"></h2><button class="btn" data-k="new">Criar novo personagem</button><div class="list" data-k="list"></div></div>
      <div class="pn R"><h2>Ilha dos Piratas</h2><div class="info" data-k="info"></div><button class="btn dim" data-k="del">Excluir personagem</button></div>
      <div class="bar"><button class="btn" data-k="go">Iniciar jogo</button></div>
      <div class="modal" data-k="modal"><div class="dlg pn" style="position:relative">
        <h2>Novo personagem</h2>
        <div class="gen"><button data-g="m" class="on"><i>♂</i>Masculino</button><button data-g="f"><i>♀</i>Feminino</button></div>
        <div class="ap" data-k="ap"></div>
        <div><label>Nome</label><div class="nrow"><input data-k="name" maxlength="14" autocomplete="off" spellcheck="false"><button class="btn dim dice" data-k="dice" title="Nome aleatório">🎲</button></div></div>
        <div class="err" data-k="err"></div>
        <button class="btn" data-k="ok">Criar personagem</button><button class="btn dim" data-k="cancel">Cancelar</button>
      </div></div>
      <div class="load" data-k="load"><i></i>Carregando o mundo…</div>`;
    document.body.appendChild(root);
    const $ = k => root.querySelector('[data-k="' + k + '"]');
    const cv = root.querySelector('canvas');

    // ───── cena 3D: pedestal, luz de fogueira, brasas e o personagem girando devagar ─────
    const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    ren.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffe6c8, 0x2a1a10, .75));
    const key = new THREE.DirectionalLight(0xffc888, .9); key.position.set(-3, 5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6a8ac8, .6); rim.position.set(4, 3, -4); scene.add(rim);
    const fire = new THREE.PointLight(0xff7a30, 1.2, 9); fire.position.set(1.8, .8, 1.6); scene.add(fire);
    const cam = new THREE.PerspectiveCamera(28, 1, .1, 60);
    cam.position.set(0, 1.55, 7.4); cam.lookAt(0, 1.0, 0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, .18, 28), new THREE.MeshLambertMaterial({ color: 0x4a4038 }));
    base.position.y = -.09; scene.add(base);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.0, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xa82a1a, transparent: true, opacity: .8 }));
    ring.position.y = .005; scene.add(ring);
    const pivot = new THREE.Group(); scene.add(pivot);
    // brasas subindo
    const N = 70, ep = new Float32Array(N * 3), ev = new Float32Array(N);
    for (let i = 0; i < N; i++) { ep[i * 3] = (Math.random() - .5) * 7; ep[i * 3 + 1] = Math.random() * 5; ep[i * 3 + 2] = (Math.random() - .5) * 5; ev[i] = .15 + Math.random() * .35; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa050, size: .05, transparent: true, opacity: .85, depthWrite: false })));

    let model = null, modelKey = '', yaw = .35, drag = null, spin = 0, raf = 0, dead = false;
    function show(female, look, force) {
      const k = (female ? 'f' : 'm') + JSON.stringify(look || 0);
      if (k === modelKey && !force) return; modelKey = k;
      if (model) { pivot.remove(model); model.traverse(c => { if (c.geometry) c.geometry.dispose(); }); }
      model = playerModel(female, look || defaultLook(female));
      pivot.add(model);
    }
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = e.clientX; cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', e => { if (drag !== null) { yaw += (e.clientX - drag) * .012; drag = e.clientX; } });
    const endDrag = () => { drag = null; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

    function resize() {
      const w = innerWidth, h = innerHeight, portrait = h > w || w <= 700;
      ren.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); ren.setSize(w, h, false);
      cam.aspect = w / h;
      // retrato: o personagem sobe (a lista ocupa a parte de baixo); paisagem: fica ao centro, entre os painéis
      cam.fov = portrait ? 32 : 28;
      cam.position.set(0, portrait ? 1.6 : 1.5, portrait ? 8.4 : 7.4);
      cam.lookAt(0, portrait ? .55 : 1.0, 0);
      cam.zoom = 1; cam.clearViewOffset();
      if (root.classList.contains('ed')) {   // editando: o painel ocupa parte da tela; o personagem vai para a área livre
        if (portrait) { const dh = h * .42; cam.zoom = .66; cam.setViewOffset(w, h, 0, dh * .5, w, h); }
        else { const dw = Math.min(440, w * .5); cam.zoom = .9; cam.setViewOffset(w, h, -dw * .5, 0, w, h); }
      }
      cam.updateProjectionMatrix();
    }
    addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
    resize();
    let t0 = performance.now();
    (function frame(now) {
      if (dead) return; raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      if (drag === null) spin += .0035;
      pivot.rotation.y = yaw + Math.sin(spin) * .6;
      if (model) { model.position.y = 0; const br = Math.sin(t * 1.6); if (model.up) model.up.rotation.x = br * .012; if (model.head) model.head.rotation.x = Math.sin(t * .8) * .03; if (model.arm) model.arm.rotation.x = br * .02; }
      fire.intensity = 1.1 + Math.sin(t * 9) * .15 + Math.sin(t * 13.7) * .1;
      const p = eg.attributes.position.array;
      for (let i = 0; i < N; i++) { p[i * 3 + 1] += ev[i] * .016; p[i * 3] += Math.sin(t + i) * .0015; if (p[i * 3 + 1] > 5) p[i * 3 + 1] = 0; }
      eg.attributes.position.needsUpdate = true;
      ren.render(scene, cam);
    })(t0);

    // ───── interface ─────
    let sel = (activeChar() || chars()[0] || {}).id || null, gender = 'm', armed = 0;
    const fmt = t => t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
    function render() {
      const list = chars();
      if (!list.find(c => c.id === sel)) sel = list[0] ? list[0].id : null;
      $('slots').textContent = list.length + '/' + MAX_CHARS + ' vagas usadas';
      $('new').disabled = list.length >= MAX_CHARS;
      const L = $('list'); L.innerHTML = '';
      list.forEach(c => {
        const s = summary(c.id), d = document.createElement('div'); d.className = 'slot' + (c.id === sel ? ' on' : '');
        d.innerHTML = `<div class="av ${c.f ? 'f' : 'm'}">${c.f ? '♀' : '♂'}</div><div style="min-width:0"><div class="nm"></div><div class="sb">${c.f ? 'Pirata' : 'Pirata'} · ${fmt(s.saved || c.t)}</div></div><div class="lv"><small>NÍVEL</small>${s.lv}</div>`;
        d.querySelector('.nm').textContent = c.name;
        d.onclick = () => { sel = c.id; armed = 0; render(); };
        d.ondblclick = start;
        L.appendChild(d);
      });
      for (let i = list.length; i < MAX_CHARS; i++) { const e = document.createElement('div'); e.className = 'slot empty'; e.textContent = 'Vaga livre'; e.onclick = openCreate; L.appendChild(e); }
      const c = list.find(q => q.id === sel);
      if (c) show(c.f, c.a);
      const s = c ? summary(c.id) : null;
      $('info').innerHTML = c ? `<div class="big"></div><div class="row k"><span>Nível</span><b>${s.lv}</b></div><div class="row"><span>Ouro</span><b>${s.gold}</b></div><div class="row"><span>Gênero</span><b>${c.f ? 'Feminino' : 'Masculino'}</b></div><div class="row"><span>Último jogo</span><b>${fmt(s.saved)}</b></div>` : '<div class="big">Nenhum personagem</div><div class="hint">Crie o seu primeiro pirata</div>';
      if (c) $('info').querySelector('.big').textContent = c.name;
      $('del').style.visibility = c ? 'visible' : 'hidden';
      $('del').textContent = armed ? 'Toque de novo para excluir' : 'Excluir personagem';
      $('go').disabled = !c;
    }
    $('del').onclick = () => {
      if (!sel) return;
      if (!armed) { armed = 1; render(); setTimeout(() => { if (armed) { armed = 0; render(); } }, 4000); return; }
      armed = 0; deleteChar(sel); sel = null; render();
      if (!chars().length) openCreate();
    };

    let look = defaultLook(false);
    const swatch = (key, cols, names) => '<div class="sw">' + cols.map((c, i) => '<b data-sw="' + key + '" data-i="' + i + '" title="' + names[i] + '" style="background:#' + c.toString(16).padStart(6, '0') + '"></b>').join('') + '</div>';
    const arrow = (key, label) => '<div class="ar"><label>' + label + '</label><div class="st"><button data-st="' + key + '" data-d="-1">◀</button><span data-nm="' + key + '"></span><button data-st="' + key + '" data-d="1">▶</button></div></div>';
    function buildAp() {
      const f = gender === 'f';
      $('ap').innerHTML = arrow('hs', 'Cabelo') + '<div class="ar"><label>Cor</label>' + swatch('hc', HAIRC, HAIRC_NAMES) + '</div>'
        + (f ? arrow('bs', 'Batom') : arrow('bs', 'Barba') + '<div class="ar"><label>Cor barba</label>' + swatch('bc', HAIRC, HAIRC_NAMES) + '</div>')
        + '<div class="ar"><label>Pele</label>' + swatch('sk', SKINS, SKIN_NAMES) + '</div><div class="ar"><label>Olhos</label>' + swatch('ey', EYES, EYE_NAMES) + '</div>'
        + '<div class="ar"><label></label><button class="btn dim" data-k="rnd" style="padding:8px">🎲 Aparência aleatória</button></div>';
      $('rnd').onclick = () => { look = randomLook(gender === 'f'); refreshAp(); };
      $('ap').querySelectorAll('[data-st]').forEach(b => { b.onclick = () => { const k = b.dataset.st, n = k === 'hs' ? 10 : (f ? LIPS.length : 10); look[k] = (look[k] + +b.dataset.d + n) % n; refreshAp(); }; });
      $('ap').querySelectorAll('[data-sw]').forEach(b => { b.onclick = () => { look[b.dataset.sw] = +b.dataset.i; refreshAp(); }; });
    }
    function refreshAp() {
      const f = gender === 'f';
      $('ap').querySelector('[data-nm="hs"]').textContent = HAIR_NAMES[f ? 'f' : 'm'][look.hs];
      $('ap').querySelector('[data-nm="bs"]').textContent = f ? LIP_NAMES[look.bs] : BEARD_NAMES[look.bs];
      $('ap').querySelectorAll('[data-sw]').forEach(b => b.classList.toggle('on', look[b.dataset.sw] === +b.dataset.i));
      show(f, look);
    }
    function setGender(g) { gender = g; root.querySelectorAll('.gen button').forEach(b => b.classList.toggle('on', b.dataset.g === g)); look = defaultLook(g === 'f'); buildAp(); refreshAp(); }
    root.querySelectorAll('.gen button').forEach(b => { b.onclick = () => setGender(b.dataset.g); });
    $('dice').onclick = () => { $('name').value = pick(NAMES[gender]); };
    function openCreate() { if (chars().length >= MAX_CHARS) return; $('err').textContent = ''; $('modal').classList.add('on'); root.classList.add('ed'); resize(); setGender('m'); $('name').value = pick(NAMES.m); $('cancel').style.display = chars().length ? '' : 'none'; }
    $('new').onclick = openCreate;
    $('cancel').onclick = () => { $('modal').classList.remove('on'); root.classList.remove('ed'); resize(); render(); };
    $('ok').onclick = () => {
      const nm = $('name').value.trim();
      if (nm.length < 2) { $('err').textContent = 'O nome precisa ter pelo menos 2 letras.'; return; }
      const c = createChar(nm, gender === 'f', look);
      if (!c) { $('err').textContent = 'Não há vagas livres.'; return; }
      sel = c.id; $('modal').classList.remove('on'); root.classList.remove('ed'); resize(); render();
    };
    $('name').onkeydown = e => { if (e.key === 'Enter') $('ok').click(); e.stopPropagation(); };

    function start() {
      if (!sel || $('modal').classList.contains('on')) return;
      setActive(sel);
      dead = true; cancelAnimationFrame(raf);
      $('load').classList.add('on');
      setTimeout(() => {   // deixa a mensagem de "carregando" pintar antes do jogo bloquear a tela, e libera o contexto 3D da seleção
        removeEventListener('resize', resize);
        try { ren.dispose(); ren.forceContextLoss(); } catch (e) { /* ok */ }
        cv.remove();
        window.__csDone = () => { root.remove(); st.remove(); };
        resolve();
      }, 60);
    }
    $('go').onclick = start;
    addEventListener('keydown', e => {
      if (!document.getElementById('cs') || dead) return;
      if ($('modal').classList.contains('on')) return;
      const list = chars(), i = list.findIndex(c => c.id === sel);
      if (e.key === 'Enter') start();
      else if (e.key === 'ArrowDown' && i < list.length - 1) { sel = list[i + 1].id; render(); }
      else if (e.key === 'ArrowUp' && i > 0) { sel = list[i - 1].id; render(); }
    });
    render();
    if (!chars().length) openCreate();
  });
}
/** Remove a tela (depois de o jogo carregar) */
export function hideCharSelect() { if (window.__csDone) window.__csDone(); }
