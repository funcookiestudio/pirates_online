/* Relógio de sol e lua na borda do minimapa: o meio-dia fica em cima e a meia-noite embaixo; o sol e a lua giram em lados opostos. */
import { hourNow } from '../core/clock.js';

const SZ = 300, C = SZ / 2, R = 136;
let cv = null, g = null, last = -1;

// cor do trilho por hora (céu da madrugada ao pôr do sol)
const KEY = [[0, [26, 36, 90]], [5, [36, 48, 110]], [6.5, [232, 140, 80]], [8, [240, 205, 110]], [17, [240, 205, 110]], [19, [232, 110, 70]], [20.5, [40, 50, 110]], [24, [26, 36, 90]]];
function sky(h) {
  let i = 0; while (i < KEY.length - 2 && h >= KEY[i + 1][0]) i++;
  const [h0, a] = KEY[i], [h1, b] = KEY[i + 1], u = (h - h0) / (h1 - h0);
  return 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * u)).join(',') + ')';
}
const at = ph => [C + Math.sin(ph) * R, C - Math.cos(ph) * R];

function sun(x, y, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y);
  g.strokeStyle = '#ffcf40'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(t) * 13, Math.sin(t) * 13); g.lineTo(Math.cos(t) * 19, Math.sin(t) * 19); g.stroke(); }
  g.fillStyle = '#ffd84a'; g.strokeStyle = '#a8701a'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.stroke();
  g.restore();
}
function moon(x, y, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y);
  g.fillStyle = '#e8eeff'; g.strokeStyle = '#4a5a9a'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, 12, 0, 7); g.moveTo(5 + 8.2, -2); g.arc(5, -2, 8.2, 0, 7); g.fill('evenodd');
  g.beginPath(); g.arc(0, 0, 12, 0, 7); g.stroke();
  g.restore();
}

/** Atualiza o relógio (chamado todo quadro; só redesenha quando a hora muda um pouco) */
export function drawDayClock() {
  if (!cv) { cv = document.getElementById('clk'); if (!cv) return; g = cv.getContext('2d'); }
  const h = hourNow();
  if (Math.abs(h - last) < .03) return;
  last = h;
  g.clearRect(0, 0, SZ, SZ);
  // trilho em 96 fatias, na cor do céu daquela hora
  g.lineWidth = 9; g.lineCap = 'butt';
  for (let i = 0; i < 96; i++) {
    const hh = i / 4, p0 = (hh - 12) / 24 * Math.PI * 2 - Math.PI / 2, p1 = p0 + Math.PI * 2 / 96 + .01;
    g.strokeStyle = sky(hh + .125); g.beginPath(); g.arc(C, C, R, p0, p1); g.stroke();
  }
  g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.arc(C, C, R + 5, 0, 7); g.stroke(); g.beginPath(); g.arc(C, C, R - 5, 0, 7); g.stroke();
  // marcas das 6, 12, 18 e 24 h
  g.strokeStyle = '#2a1a0a'; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) { const ph = k * Math.PI / 2, [x0, y0] = [C + Math.sin(ph) * (R - 8), C - Math.cos(ph) * (R - 8)], [x1, y1] = [C + Math.sin(ph) * (R + 8), C - Math.cos(ph) * (R + 8)]; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  const ph = (h - 12) / 24 * Math.PI * 2, up = Math.cos(ph) > -.05;   // sol acima do horizonte?
  const [sx, sy] = at(ph), [mx, my] = at(ph + Math.PI);
  moon(mx, my, up ? .4 : 1); sun(sx, sy, up ? 1 : .4);
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  cv.title = 'Hora do dia: ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
