/* Mantém o jogo rodando com a aba/app em segundo plano: o navegador só congela uma página que "toca áudio".
   Aqui tocamos um som inaudível (oscilador de 1 Hz com ganho quase zero + <audio> em loop com amostras minúsculas),
   registramos uma sessão de mídia e pedimos wake lock. Começa no primeiro toque/clique (política de autoplay). */
let ctx = null, started = false, audioEl = null, lock = null;

/** WAV mono 8 kHz de 1 s com ruído mínimo (±1/32768 não pega: usamos ±2) em data URI */
function silentWav() {
  const n = 8000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, (i & 1) ? 2 : -2, true);
  let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}

async function wake() {
  try { if (navigator.wakeLock && !document.hidden) lock = await navigator.wakeLock.request('screen'); } catch (e) { /* sem wake lock */ }
}

function start() {
  if (started) return; started = true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 1; g.gain.value = .0008;           // inaudível, mas não é silêncio digital
      o.connect(g); g.connect(ctx.destination); o.start();
    }
  } catch (e) { /* sem WebAudio */ }
  try {
    audioEl = new Audio(silentWav()); audioEl.loop = true; audioEl.volume = .02; audioEl.setAttribute('playsinline', '');
    audioEl.play().catch(() => {});
  } catch (e) { /* sem <audio> */ }
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: 'Pirata ARPG', artist: 'Jogo em andamento' });
      navigator.mediaSession.playbackState = 'playing';
      ['pause', 'stop'].forEach(a => { try { navigator.mediaSession.setActionHandler(a, () => { if (audioEl) audioEl.play().catch(() => {}); }); } catch (e) { /* ação não suportada */ } });
    }
  } catch (e) { /* sem media session */ }
  wake();
}

export function initBackground(tick) {
  const kick = () => { start(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (audioEl && audioEl.paused) audioEl.play().catch(() => {}); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, kick, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) kick(); else wake();
  });
  // em segundo plano o navegador para o requestAnimationFrame: um temporizador assume o loop (a aba com áudio não é congelada)
  setInterval(() => { if (document.hidden) tick(performance.now()); }, 50);
}
