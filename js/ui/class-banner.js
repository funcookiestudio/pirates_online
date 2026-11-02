/* Fita vermelha com o brasão de cada classe (SVG inline), usada no card de informações da seleção de personagem. */
const SHAPE = {
  guerreiro: 'M10 0H110V190L60 160L10 190Z',
  cacador: 'M10 0H110V160L60 190L10 160Z',
  mago: 'M10 0H110V150Q110 190 60 190Q10 190 10 150Z',
  ladino: 'M10 0H110V165L85 190H35L10 165Z',
};
const ICON = {
  guerreiro: '<g stroke="url(#gd-K)" stroke-width="5" stroke-linecap="round" fill="none"><path d="M42 44L78 92M78 44L42 92"/><path d="M36 84l12 12M84 84L72 96" stroke-width="4"/></g><circle cx="60" cy="68" r="4" fill="url(#gd-K)"/>',
  cacador: '<g stroke="url(#gd-K)" stroke-width="4" stroke-linecap="round" fill="none"><path d="M46 42Q74 68 46 94"/><path d="M46 42L46 94" stroke-width="2"/><path d="M40 68H84"/><path d="M78 62l8 6-8 6"/></g>',
  mago: '<g fill="url(#gd-K)"><path d="M60 40l6 18 18 2-14 12 5 18-15-10-15 10 5-18-14-12 18-2z"/></g><path d="M36 88Q60 104 84 88" stroke="url(#gd-K)" stroke-width="3" fill="none"/>',
  ladino: '<g fill="url(#gd-K)"><path d="M60 38l7 40-7 8-7-8z"/><rect x="50" y="86" width="20" height="4" rx="2"/><rect x="57" y="90" width="6" height="12" rx="2"/></g>',
};

/** SVG da fita da classe `k` (chave de classes.js); '' se não houver classe */
export function bannerSvg(k) {
  if (!SHAPE[k]) return '';
  const i = ICON[k].replace(/-K/g, '-' + k);
  return '<svg viewBox="0 0 120 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'
    + '<linearGradient id="rd-' + k + '" x1="0" x2="1"><stop offset="0" stop-color="#a01616"/><stop offset=".3" stop-color="#e03535"/><stop offset=".5" stop-color="#ff6a60"/><stop offset=".72" stop-color="#d12a2a"/><stop offset="1" stop-color="#8e1212"/></linearGradient>'
    + '<linearGradient id="gd-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#e0b040"/><stop offset="1" stop-color="#9a6a18"/></linearGradient>'
    + '<linearGradient id="sd-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a14"/><stop offset="1" stop-color="#120a07"/></linearGradient></defs>'
    + '<path d="' + SHAPE[k] + '" fill="url(#rd-' + k + ')" stroke="#4a0808" stroke-width="2"/><path d="M18 8H102" stroke="#ffffff33" stroke-width="2"/>'
    + '<g transform="translate(0,16)"><path d="M60 24L100 36V74Q100 100 60 118Q20 100 20 74V36Z" fill="url(#sd-' + k + ')" stroke="url(#gd-' + k + ')" stroke-width="3"/><g transform="translate(0,6)">' + i + '</g></g></svg>';
}
