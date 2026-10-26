/* Narrador: lê em voz alta as falas dos NPCs e das missões com a síntese de voz do navegador (Web Speech API).
   Opções (ligar, volume, velocidade, voz) ficam nos Ajustes ▸ Jogo e são guardadas no navegador. Começa desligado. */
const KEY = 'pirata-narrador';
const CFG = { on: false, vol: 1, rate: 1, voiceF: '', voiceM: '' };
try { Object.assign(CFG, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem armazenamento: usa o padrão */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(CFG)); } catch (e) { /* ignora */ } };
const ok = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Tira emojis e símbolos que a voz leria em voz alta ("cartão de visita", "espadas cruzadas"...) */
const clean = t => String(t).replace(/[\u{1F000}-\u{1FFFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const ptVoices = () => (ok() ? speechSynthesis.getVoices() : []).filter(v => /^pt/i.test(v.lang));

export function stopSpeech() { if (ok()) try { speechSynthesis.cancel(); } catch (e) { /* ignora */ } }
/* Gênero das vozes: o navegador não informa, então vem pelo nome da voz (Maria, Luciana... · Daniel, Felipe...). Sem pista, assume feminina (as vozes pt-BR do Google/Android são). */
const FEM = /maria|francisca|luciana|fernanda|vit[oó]ria|camila|raquel|helena|joana|google|female|feminin|mulher/i;
const MAS = /daniel|ant[oô]nio|antonio|felipe|ricardo|jorge|paulo|thiago|male|masculin|homem/i;
const genderOf = v => MAS.test(v.name) && !/female/i.test(v.name) ? 'm' : 'f';
/** NPCs mulheres (os outros são homens; bichos e objetos falam sem gênero) */
const WOMEN = ['Capitã Sal', 'Madame Rum', 'Ysolde Folha-Prata', 'Dona Marta'];
const NEUTRAL = ['Gato', 'Cachorro', 'Gatinho', 'Gato preto', 'Cachorro da fazenda', 'Mural de Missões', 'Baú do Porto', 'Teste'];
const genderNpc = who => !who || NEUTRAL.includes(who) ? '' : WOMEN.includes(who) ? 'f' : 'm';
function pickVoice(g) {
  const vs = ptVoices(), want = g === 'm' ? CFG.voiceM : CFG.voiceF, byName = vs.find(x => x.name === want);
  if (byName) return byName;
  const sameG = vs.filter(v => genderOf(v) === g);
  return sameG.find(x => /BR/i.test(x.lang)) || sameG[0] || vs.find(x => /BR/i.test(x.lang)) || vs[0];
}

/** Fala `text`. `who` (nome do NPC) escolhe voz feminina ou masculina e varia o tom. `force` fala mesmo com o narrador desligado (botão 🔊). */
export function speak(text, who = '', force = false) {
  if (!ok() || (!CFG.on && !force)) return;
  const t = clean(text); if (!t) return;
  stopSpeech();
  const u = new SpeechSynthesisUtterance(t), g = genderNpc(who), v = pickVoice(g || 'f');
  u.lang = 'pt-BR'; u.volume = CFG.vol; u.rate = CFG.rate;
  const vary = who ? (hash(who) % 15 - 7) / 100 : 0;   // ±0,07 só para NPCs do mesmo gênero não soarem iguais
  // só há uma voz do gênero errado para o NPC? sobe ou desce o tom para disfarçar (mulher ≈ 1,3 · homem ≈ 0,75)
  const mism = v && g && genderOf(v) !== g;
  u.pitch = Math.max(.5, Math.min(2, (mism ? (g === 'f' ? 1.3 : .75) : 1) + vary));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

/** Cria a seção "🔊 Narração" dentro dos Ajustes ▸ Jogo */
export function initNarrator() {
  const host = document.getElementById('at-jg');
  if (!host || document.getElementById('nr-on')) return;
  const box = document.createElement('div'); box.className = 'acs';
  box.innerHTML = '<h4>🔊 Narração <small>(lê as falas dos NPCs e das missões)</small></h4>'
    + (ok() ? '' : '<small>Este navegador não tem síntese de voz.</small>')
    + '<label><input type="checkbox" id="nr-on"> Ligar o narrador</label>'
    + '<div class="acr"><span>Voz feminina <small>(Capitã Sal, Madame Rum, Ysolde, Dona Marta)</small></span><select id="nr-voiceF"></select></div>'
    + '<div class="acr"><span>Voz masculina <small>(os demais NPCs)</small></span><select id="nr-voiceM"></select></div>'
    + '<div class="acr"><span>Volume</span><input type="range" id="nr-vol" min="0" max="1" step="0.05"></div>'
    + '<div class="acr"><span>Velocidade</span><input type="range" id="nr-rate" min="0.6" max="1.6" step="0.05"></div>'
    + '<div class="acr"><button id="nr-testF" class="ahb">▶ Testar feminina</button><button id="nr-test" class="ahb">▶ Testar masculina</button><button id="nr-stop" class="ahb">■ Parar</button></div>';
  host.insertBefore(box, host.firstChild);
  const $ = id => document.getElementById(id), selF = $('nr-voiceF'), selM = $('nr-voiceM');
  const fill = () => {
    const vs = ptVoices();
    const opts = '<option value="">Automática</option>' + vs.map(v => '<option value="' + v.name.replace(/"/g, '&quot;') + '">' + v.name + ' (' + v.lang + ')</option>').join('');
    selF.innerHTML = opts; selM.innerHTML = opts; selF.value = CFG.voiceF; selM.value = CFG.voiceM;
  };
  fill(); if (ok()) speechSynthesis.onvoiceschanged = fill;   // as vozes chegam depois em alguns navegadores
  $('nr-on').checked = CFG.on; $('nr-vol').value = CFG.vol; $('nr-rate').value = CFG.rate;
  $('nr-on').onchange = e => { CFG.on = e.target.checked; save(); if (!CFG.on) stopSpeech(); };
  selF.onchange = () => { CFG.voiceF = selF.value; save(); };
  selM.onchange = () => { CFG.voiceM = selM.value; save(); };
  $('nr-vol').oninput = e => { CFG.vol = +e.target.value; save(); };
  $('nr-rate').oninput = e => { CFG.rate = +e.target.value; save(); };
  $('nr-test').onclick = () => speak('Ahoy, marujo! Esta é a voz masculina do narrador de Tiny Pirates.', 'Mestre Breu', true);
  $('nr-testF').onclick = () => speak('Ahoy, marujo! Esta é a voz feminina do narrador de Tiny Pirates.', 'Capitã Sal', true);
  $('nr-stop').onclick = stopSpeech;
}
