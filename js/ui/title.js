/* Tela inicial "Tiny Pirates": título + botão Jogar (aparece antes da seleção de personagem). */
import { VERSION } from '../core/version.js';

const CSS = `
#ttl{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(18px,5vh,44px);overflow:hidden;color:#f3e6c4;font-family:Cinzel,'Trajan Pro','Palatino Linotype',Georgia,serif;user-select:none;-webkit-user-select:none;
 background:linear-gradient(#1b3a5c 0%,#2f6a8a 46%,#e9c98a 46.4%,#caa05e 58%,#1a4a6a 58.4%,#0e2a44 100%)}
#ttl .sun{position:absolute;left:50%;top:30%;width:min(34vw,34vh);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(#fff3c0,#f6b84a 55%,#f6b84a00 72%);opacity:.9}
#ttl .sea{position:absolute;left:0;right:0;bottom:0;height:42%;background:repeating-linear-gradient(0deg,#ffffff10 0 2px,#0000 2px 26px);animation:ttw 6s linear infinite}
@keyframes ttw{to{background-position:0 52px}}
#ttl .ship{position:absolute;left:50%;top:44%;width:min(26vw,170px);transform:translateX(-50%);animation:ttb 4s ease-in-out infinite;filter:drop-shadow(0 4px 0 #0006)}
@keyframes ttb{50%{transform:translateX(-50%) translateY(6px) rotate(1.5deg)}}
#ttl h1{position:relative;margin:0;text-align:center;line-height:.95;font-size:clamp(44px,12vw,120px);letter-spacing:.06em;text-transform:uppercase;color:#ffe9a8;text-shadow:0 3px 0 #8a3a14,0 6px 0 #4a1c0a,0 12px 24px #000a;-webkit-text-stroke:2px #5a2410}
#ttl h1 small{display:block;font-size:.38em;letter-spacing:.5em;color:#fff;-webkit-text-stroke:1px #1b3a5c;text-shadow:0 2px 0 #1b3a5c;margin-top:.15em}
#ttl button{position:relative;appearance:none;font:inherit;font-size:clamp(20px,4.5vw,30px);font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#fff;padding:.7em 2.4em;border:2px solid #e8e0d0;border-radius:4px;cursor:pointer;background:linear-gradient(#b82020,#6a0c0c);box-shadow:0 0 0 2px #000,0 6px 0 #3a0606,0 10px 24px #000a;touch-action:manipulation;animation:ttp 1.6s ease-in-out infinite}
#ttl button:active{transform:translateY(4px);box-shadow:0 0 0 2px #000,0 2px 0 #3a0606}
@keyframes ttp{50%{filter:brightness(1.25)}}
#ttl .ver{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));font-size:11px;letter-spacing:.15em;color:#ffffffaa}
@media (orientation:landscape) and (max-height:480px){#ttl{gap:14px}#ttl h1{font-size:clamp(36px,13vh,80px)}#ttl button{padding:.5em 2em}}
`;

/** Mostra a tela inicial; resolve quando o jogador toca em Jogar */
export function runTitle() {
  return new Promise(res => {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'ttl';
    root.innerHTML = `<div class="sun"></div><div class="sea"></div>
      <svg class="ship" viewBox="0 0 100 90" aria-hidden="true"><rect x="47" y="8" width="4" height="56" fill="#4a2c18"/><path d="M51 12 L88 52 H51Z" fill="#f3e6c4" stroke="#8a6a3a" stroke-width="2"/><path d="M47 18 L16 52 H47Z" fill="#e8d8ac" stroke="#8a6a3a" stroke-width="2"/><path d="M8 58 H92 L80 80 H20Z" fill="#6a3a1c" stroke="#3a1c0a" stroke-width="3"/><rect x="12" y="62" width="76" height="4" fill="#c8923a"/><path d="M51 8 L66 13 L51 18Z" fill="#111"/></svg>
      <h1>Tiny<br>Pirates<small>RPG</small></h1>
      <button>Jogar</button><div class="ver">${VERSION}</div>`;
    document.body.appendChild(root);
    let done = false;
    const go = () => { if (done) return; done = true; removeEventListener('keydown', key, true); root.style.transition = 'opacity .3s'; root.style.opacity = 0; setTimeout(() => { root.remove(); st.remove(); res(); }, 300); };
    const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    root.querySelector('button').onclick = go; addEventListener('keydown', key, true);
  });
}
