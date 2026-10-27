/* Sem emojis coloridos: todo emoji que aparecer na interface vira um ícone em traço (os mesmos dos painéis) ou some.
   Funciona sobre o DOM inteiro (texto e dicas), inclusive o que o jogo escreve depois, e também serve ao mapa-múndi (canvas). */
import { ICON, svg } from './icons.js';

const G = {
  gear: '⚙🖥🎮🕹', target: '🤖🎯', sword: '⚔🗡', whirl: '🌀', bomb: '💣', dash: '💨🤸🏃', potion: '🧪🍵🧴', boots: '🐴',
  paw: '🦜🐾🐶🐱🐕🐒🐦🐀🐇🐺🦌🐗🐂🐄🐖🐔🪽🪶', close: '✕✖❌🚫', cave: '🕳', map: '🗺🧭', swap: '🔁🔄♻↩', star: '⭐★📈📊🏷',
  hand: '✋🤚', search: '🔍', eye: '👁', plank: '🧱', burst: '🎲✨⚠💥', coin: '💰🪙', gun: '🔫', shield: '🛡', fire: '🔥',
  bag: '🛒🎒📦🧺', ship: '⛵', person: '👤', check: '✔✅', pin: '📌📍', lock: '🔒', unlock: '🔓', home: '🏘🏠🛏', tent: '⛺', anchor: '⚓',
  castle: '🏰🏛🗼', scroll: '📜📋📖', skull: '☠💀', gift: '🎁', trash: '🗑', key: '🔑🗝', trophy: '🏆', crown: '👑', gem: '💎🔮',
  flag: '🏴', camera: '📷', door: '🚪', leaf: '🌿🌻', heart: '❤🩸', chest: '🗄',
};
const KEY = {};
for (const k in G) for (const ch of G[k]) KEY[ch] = k;
/** nome do ícone para um emoji (ou undefined) */
export const iconKey = e => KEY[String(e).replace(/️/g, '').trim()];

/** qualquer emoji/pictograma (e o seletor de variação que vem junto) */
const RE = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{23F1}\u{2764}\u{21BA}\u{21A9}\u{2694}\u{2699}\u{26A0}\u{2705}\u{274C}\u{2605}\u{267B}\u{2692}\u{2693}\u{26F5}\u{26FA}\u{2640}\u{2642}]\u{FE0F}?\u{200D}?)+/gu;
const TEST = new RegExp(RE.source, 'u');
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE', 'OPTION', 'CANVAS', 'SVG']);

function conv(str) {
  const out = [];
  let last = 0, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(str))) {
    out.push({ t: str.slice(last, m.index) });
    const k = iconKey([...m[0]][0]);
    if (k) out.push({ k });
    last = m.index + m[0].length;
  }
  out.push({ t: str.slice(last) });
  return out;
}

function fixText(n) {
  const v = n.nodeValue;
  if (!TEST.test(v)) return;
  const p = n.parentNode;
  if (!p || SKIP.has((p.nodeName || '').toUpperCase())) { if (p) n.nodeValue = v.replace(RE, '').replace(/\s{2,}/g, ' '); return; }
  const parts = conv(v);
  const frag = document.createDocumentFragment();
  let any = false;
  parts.forEach(x => {
    if (x.k) { any = true; const s = document.createElement('span'); s.className = 'emj'; s.innerHTML = svg(x.k, ''); frag.append(s); }
    else if (x.t) frag.append(document.createTextNode(x.t));
  });
  // sobrou só um emoji sem ícone num elemento vazio: põe uma estrela para o espaço não ficar sem nada
  const only = !any && !parts.some(x => x.t && x.t.trim()) && !(p.textContent.replace(v, '').trim()) && !p.children.length;
  if (only) { const s = document.createElement('span'); s.className = 'emj'; s.innerHTML = svg('star', ''); frag.append(s); }
  p.replaceChild(frag, n);
}

const ATTR = ['title', 'placeholder', 'aria-label'];
function fixAttrs(el) {
  for (const a of ATTR) { const v = el.getAttribute && el.getAttribute(a); if (v && TEST.test(v)) el.setAttribute(a, v.replace(RE, '').replace(/\s{2,}/g, ' ').trim()); }
}

function scan(root) {
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1) return;
  if (SKIP.has(root.nodeName.toUpperCase())) return;
  fixAttrs(root);
  if (!TEST.test(root.textContent) && !root.querySelector('[title],[placeholder],[aria-label]')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const list = [];
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { if (TEST.test(n.nodeValue)) list.push(n); }
    else fixAttrs(n);
  }
  list.forEach(fixText);
}

/** Limpa a página e fica de olho no que o jogo escrever depois */
export function initDeemoji() {
  scan(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixAttrs(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
}

/** Imagem do ícone (para desenhar em canvas), em branco por padrão */
const IMG = {};
export function iconImg(k, color = '#fff') {
  const key = k + color;
  if (!IMG[key]) {
    const im = new Image();
    im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ICON[k] || ICON.star) + '</svg>');
    IMG[key] = im;
  }
  return IMG[key];
}
