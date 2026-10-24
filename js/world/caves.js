/* Cavernas nas encostas: boca de pedra cravada na montanha. Ao chegar na entrada, o jogo pergunta se o jogador quer entrar
   e mostra o nível e as informações da dungeon (geradas por js/dungeon/dungeongen.js — determinístico por ilha + caverna). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M as M0, $ } from '../core/utils.js';
import { xray } from './xray.js';
import { CAVES, SEED, groundY } from './terrain.js';
import { P } from '../entities/player.js';
import { state } from '../core/state.js';
import { log } from '../ui/notify.js';
import { pois } from './pois.js';
import { generateDungeon, THEMES, hash } from '../dungeon/dungeongen.js';
import { tierOf, tierBonus } from '../data/scaling.js';
import { enterDungeon } from '../dungeon/dungeon-scene.js';

const M = c => xray(M0(c));
const NAMES = {
  cripta: ['Cripta Esquecida', 'Cripta dos Afogados', 'Catacumbas do Corvo', 'Cripta do Capitão Cego'],
  ruinas: ['Ruínas Submersas', 'Ruínas do Farol Velho', 'Fortaleza em Ruínas', 'Ruínas do Contrabando'],
  caverna: ['Caverna dos Ecos', 'Gruta da Maré Negra', 'Caverna do Kraken', 'Gruta dos Esqueletos'],
};
const TYPE = { cripta: 'Cripta · salas e corredores', ruinas: 'Ruínas · salas desgastadas e passagens abertas', caverna: 'Caverna natural · túneis tortuosos' };
export const DUNGEONS = [];       // { id, name, theme, seed, lv, x, z, ... }
let prompting = null, cooldown = 0;

const bx = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };

export function buildCaves() {
  const tb = tierBonus(tierOf(SEED));
  CAVES.forEach((c, i) => {
    const hs = hash(SEED + ':' + i), theme = THEMES[hs % 3], name = NAMES[theme][(hs >> 3) % 4];
    const lv = tb + 3 + Math.round((c.d - 34) / 10);           // nível pela ilha (tier) e pela distância da vila
    const D = { id: i, name, theme, seed: SEED + ':' + i, lv, x: c.x, z: c.z, dx: c.dx, dz: c.dz, info: null };
    DUNGEONS.push(D);
    pois.push({ n: name, x: c.x, z: c.z, c: '#a070ff', ic: '🕳' });

    // boca: moldura de pedra (pilares + viga) cravada na encosta, abertura escura e rochas em volta; olha para baixo da encosta
    const g = new THREE.Group(), y = groundY(c.x, c.z);
    g.position.set(c.x, y - .15, c.z);
    g.rotation.y = Math.atan2(c.dx, c.dz);
    bx(g, .7, 3.2, .8, 0x5a5560, -1.25, 1.5, 0); bx(g, .7, 3.2, .8, 0x5a5560, 1.25, 1.5, 0);
    bx(g, 3.6, .7, 1, 0x4a4650, 0, 3.2, 0); bx(g, 3.9, .3, 1.2, 0x3e3a44, 0, 3.7, 0);
    bx(g, 1.9, 2.9, .3, 0x050408, 0, 1.4, -.25);                      // boca escura
    for (const s of [-1, 1]) bx(g, .35, .18, .35, 0xffa030, s * 1.25, 3.5, .45).material = new THREE.MeshBasicMaterial({ color: 0xffa030 });   // brasas nos pilares
    const rg = new THREE.IcosahedronGeometry(.6, 0);
    [[-2.1, .4, -.4, 1.1], [2.2, .5, -.3, 1.2], [-1.6, 2.2, -1, .9], [1.7, 2.4, -1, .8], [0, 4.0, -.9, 1.1]].forEach(([rx, ry, rz, sc]) => {
      const m = new THREE.Mesh(rg, M(0x6a6560)); m.position.set(rx, ry, rz); m.scale.setScalar(sc); m.rotation.set(rx, ry, rz); g.add(m);
    });
    scene.add(g);
    // colisão: pilares e o paredão atrás da boca (a entrada é só um gatilho à frente)
    const ca = Math.cos(g.rotation.y), sa = Math.sin(g.rotation.y);
    for (const s of [-1.25, 1.25]) props.push({ position: { x: c.x + s * ca, z: c.z - s * sa, y: 0 }, r: .5 });
    props.push({ position: { x: c.x - c.dx * 1.2, z: c.z - c.dz * 1.2, y: 0 }, r: 1.2 });
    D.fx = c.x + c.dx * 2.2; D.fz = c.z + c.dz * 2.2;                 // ponto de gatilho, à frente da boca
  });
}

const colorFor = df => df >= 5 ? '#ff4040' : df >= 3 ? '#ff9030' : df >= -2 ? '#f0e050' : df >= -4 ? '#60d060' : '#a0a0a0';
const perigo = df => df >= 5 ? '☠ Mortal para o seu nível' : df >= 3 ? 'Muito perigosa' : df >= -2 ? 'Desafio equilibrado' : df >= -4 ? 'Fácil' : 'Trivial';

function info(D) {
  if (D.info) return D.info;
  const g = generateDungeon(D.seed, D.theme, { rooms: 9 + Math.min(8, Math.round(D.lv / 4)) });
  return (D.info = g);
}

function show(D) {
  const g = info(D), df = D.lv - P.lv;
  $('cvn').textContent = D.name;
  $('cvl').innerHTML = 'Nível recomendado: <b style="color:' + colorFor(df) + '">Nv ' + D.lv + '</b> <small>(chefe Nv ' + (D.lv + 4) + ')</small>';
  const size = D.theme === 'caverna' ? 'Caverna ampla · ' + g.floor + ' m²' : g.rooms.length + ' salas · ' + g.floor + ' m²';
  $('cvi').innerHTML = [
    '🏛 ' + TYPE[D.theme],
    '📐 ' + size,
    '🧭 Rota até o chefe: ' + g.path + ' passos' + (g.loops ? ' · ' + g.loops + ' atalhos' : ''),
    g.nooks.length ? '💰 ' + g.nooks.length + ' câmaras secretas com tesouro' : '💰 Tesouro espalhado pelo caminho',
    '👑 Chefe no fim do caminho · baú do chefe',
    '⚠ ' + perigo(df) + ' (você: Nv ' + P.lv + ')',
  ].map(t => '<div>' + t + '</div>').join('');
  $('cvp').style.display = 'block';
  prompting = D;
}

export function closeCavePrompt() { $('cvp').style.display = 'none'; prompting = null; }
export const cavePromptOpen = () => !!prompting;

export function initCaves() {
  $('cvx').onclick = $('cvno').onclick = () => { closeCavePrompt(); cooldown = 1; };
  $('cvgo').onclick = () => {
    const D = prompting;
    closeCavePrompt();
    if (D) enterDungeon(D, info(D));
  };
}

let want = null;
/** Clique na boca da caverna: anda até a entrada e, ao chegar, mostra o card. Devolve true se o clique foi na caverna */
export function clickCave(x, z) {
  want = null;
  const D = DUNGEONS.find(d => Math.hypot(x - d.x, z - d.z) < 3.2);
  if (!D) return false;
  if (prompting === D) return true;
  closeCavePrompt();
  want = D; P.tgt = null; P.tx = D.fx; P.tz = D.fz;
  return true;
}

/** Mostra o card quando o jogador (que clicou na entrada) chega nela; fecha ao se afastar */
export function updateCaves() {
  if (!DUNGEONS.length || P.dead) return;
  if (want && Math.hypot(P.x - want.fx, P.z - want.fz) < 2.4) { const D = want; want = null; P.tx = P.x; P.tz = P.z; show(D); return; }
  if (prompting && Math.hypot(P.x - prompting.fx, P.z - prompting.fz) > 6) closeCavePrompt();
}
