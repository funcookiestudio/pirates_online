/* Ponto de entrada: monta o mundo, liga os sistemas e roda o loop do jogo. */
import { WEAPONS } from './data/weapons.js';
import * as terrainDbg from './world/terrain.js';
import { scene, cam, ren } from './core/engine.js';
import { state } from './core/state.js';
import { buildWorld } from './world/world.js';
import { buildVillage } from './world/village.js';
import { buildCastle } from './world/castle.js';
import { RUINS_ISLE } from './core/isle.js';
import { buildRuinsCamp } from './world/ruins-isle.js';
import { initDialog } from './ui/dialog.js';
import { updateNpcs, npcList, talkTo } from './entities/npc.js';
import { updatePerf, DIAG } from './systems/perf.js';
import { updateSettings, initSettings, CFG, PICKDBG } from './systems/settings.js';
import { DOORS, doorDbg } from './world/doors.js';
import { updateLod } from './systems/lod.js';
import { updateEnemyLabels } from './ui/enemy-labels.js';
import { updateVision, canSee, VIS } from './systems/vision.js';
import { pathTo } from './systems/steer.js';
import { mergeStatics } from './world/merge.js';
import { initUpdater } from './ui/updater.js';
import { buildOutposts, updateOutposts } from './world/outposts.js';
import { buildPois, updatePois } from './world/pois.js';
import { updateEnemies, updateRespawns } from './entities/enemies.js';
import * as ELM from './systems/elements.js';
import * as PROFS from './systems/prof.js';
import { ELEMENTS, EL_IDS, MAX_FX, RES } from './data/elements.js';
import { updateLoot } from './entities/loot.js';
import { setWeapon, equip, unequip, canEquipTo, eq, bag, chest } from './systems/inventory.js';
import { switchWeapon } from './systems/swap.js';
import { updatePlayer } from './systems/player-update.js';
import { updateBombs, updateShots, hit, attack, impact, effRng } from './systems/combat.js';
import { updateParticles } from './systems/effects.js';
import { updateCamera } from './systems/camera.js';
import { separate } from './systems/separation.js';
import { updateXray } from './world/xray.js';
import { initInput } from './systems/input.js';
import * as FLOORS from './world/floors.js';
import { updateRoyals } from './entities/royals.js';
import { updateFarmFx } from './world/farm-granja.js';
import { updateAlchemist } from './world/alchemist-house.js';
import { buildWildlife, updateWildlife, WILD } from './entities/wildlife.js';
import { PET, petWalk } from './systems/pet.js';
import { HL } from './world/house-lights.js';
import { refreshProps } from './world/floors.js';
import { updateDayNight } from './world/daynight.js';
import { initBackground } from './systems/background.js';
import { loadGame, initSave, savedPos, safeSpot } from './systems/save.js';
import { MOUNT, initMount, toggleMount, giveHorse } from './systems/mount.js';
import { VEH, initVehicles, giveVehicle, setUse } from './systems/vehicle.js';
import { CLOCK } from './core/clock.js';
import { dodge } from './systems/dodge.js';
import { buildFarmSite } from './entities/farm-site.js';
import { buildFarm, updateFarm, FARM } from './entities/farm.js';
import { buildBugs, updateBugs } from './entities/farm-extra.js';
import { updatePets, setPet, unequipPet } from './pets/manager.js';
import { updateQuest, ratDbg } from './systems/quest.js';
import { updateQuests } from './systems/quests.js';
import { DOG } from './pets/dog.js';
import { updateBond, BOND } from './systems/bond.js';
import { refreshPetButton, initHotbarFit } from './ui/hotbar.js';
import { initPanel } from './ui/panel.js';
import { initWorldMap } from './ui/worldmap.js';
import { initMobileHud } from './ui/mobilehud.js';
import { dungeonGimmicks, dungeonStats, updateDungeon, inDungeon, leaveDungeon } from './dungeon/dungeon-scene.js';
import { initCaves, clickCave, DUNGEONS } from './world/caves.js';
import { updateStatusBars, updateOverlays } from './ui/hud.js';
import { initSkills, updateSkills, SK, migrateStart, markStart } from './systems/skills.js';
import { log } from './ui/notify.js';
import './systems/death.js';
import { initFullscreen, initPwa } from './ui/fullscreen.js';
import { VILLAGE_SEAT, POST_DATA } from './data/posts.js';
import { P, hurtP } from './entities/player.js';
import { START } from './data/classes.js';
import { activeChar } from './core/chars.js';
import * as NAV from './world/interior-nav.js';
import { enemies, props, loot } from './core/registry.js';

let last = 0;

function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}

/** Mede cada etapa da lógica (média móvel, ms) para o diagnóstico */
function S(name, fn) { const a = performance.now(); fn(); const d = performance.now() - a, v = DIAG.sec[name] || 0; DIAG.sec[name] = v + (d - v) * .1; }

function tick(now) {

  const rawDt = (now - (last || now)) / 1000;   // sem limite: o contador de FPS e a qualidade automática precisam enxergar fps abaixo de 20
  let dt = Math.min(.05, rawDt);
  last = now;
  const tJs = performance.now();
  const realDt = dt; // companheiros e balas não sofrem o "hit-stop"

  // hit-stop: câmera lenta curta em golpes fortes
  if (state.HS > 0) { state.HS -= dt; dt *= .12; }

  // 1) jogo
  updatePerf(rawDt);
  updateSettings(realDt);
  if (CFG.diag === 'draw') { const a = performance.now(); ren.render(scene, cam); DIAG.rend += ((performance.now() - a) - DIAG.rend) * .1; DIAG.js = 0; DIAG.calls = ren.info.render.calls; DIAG.tris = ren.info.render.triangles; return; }   // diagnóstico: só desenho
  S('updatePlayer', () => updatePlayer(dt));
  S('updateEnemies', () => updateEnemies(dt));
  S('updateSkills', () => updateSkills(realDt));
  S('updateElements', () => ELM.updateElements(realDt));
  S('updateLod', () => updateLod(realDt));
  S('updateDayNight', () => updateDayNight(inDungeon()));
  S('updateNpcs', () => updateNpcs(realDt, now));
  S('enemyLabels', () => updateEnemyLabels());
  S('updateFarm', () => updateFarm(realDt));
  S('updateBugs', () => updateBugs(realDt));
  S('updateRoyals', () => updateRoyals(realDt));
  S('updateFarmFx', () => updateFarmFx(realDt));
  S('updateAlchemist', () => updateAlchemist(realDt));
  S('updateWildlife', () => updateWildlife(realDt));
  S('separate', () => separate());
  S('updateLoot', () => updateLoot(dt, now));
  S('updateBombs', () => updateBombs(dt));
  S('updateParticles', () => updateParticles(dt));
  S('updateRespawns', () => updateRespawns(dt));
  S('updateOutposts', () => updateOutposts(now / 1000));
  S('updatePois', () => updatePois());
  S('updateDungeon', () => updateDungeon(dt, now));
  S('updateCamera', () => updateCamera(dt));

  // 2) interface e companheiros
  S('updateStatusBars', () => updateStatusBars());
  S('updateShots', () => updateShots(realDt));
  S('updatePets', () => updatePets(realDt, now));
  S('updateBond', () => updateBond(realDt));
  S('updateQuest', () => updateQuest(realDt));
  S('updateQuests', () => updateQuests(realDt));
  S('updateOverlays', () => updateOverlays(now));

  S('updateXray', () => updateXray());
  S('updateVision', () => updateVision(realDt, inDungeon()));
  const tR = performance.now();
  if (CFG.diag !== 'logic') ren.render(scene, cam);   // diagnóstico 'logic': só lógica, sem desenhar
  const tE = performance.now(), k = .1;
  DIAG.js += ((tR - tJs) - DIAG.js) * k; DIAG.rend += ((tE - tR) - DIAG.rend) * k;
  DIAG.calls = ren.info.render.calls; DIAG.tris = ren.info.render.triangles;
  if (CFG.fps && (++DIAG.n % 30) === 0) { const gl = ren.getContext(), a = performance.now(); gl.finish(); DIAG.gpu = performance.now() - a; }   // amostra: bloqueia até a GPU terminar
}

const worldBefore = new Set(scene.children);
buildWorld();
if (RUINS_ISLE) buildRuinsCamp(); else { buildVillage(); buildCastle(); }   // ilhas de ruínas: só um acampamento de chegada, sem vila nem castelo
initInput();
initWorldMap();
initCaves();
initFullscreen();
initPwa();
initPanel();
initDialog();
initSettings(); initUpdater();
setWeapon();
refreshPetButton();
initSkills();   // habilidades da classe (botões na barra, teclas 1-3); sem classe: nada. Antes do HUD móvel e do layout, que posicionam esses botões
initMobileHud();
initHotbarFit();
const loaded = loadGame();
if (!loaded) {   // personagem novo: só uma arma simples e 2 poções, sem pets nem outros itens
  const st = START[(activeChar() || {}).k], mk = n => { const w = WEAPONS.findIndex(x => x.n === n); return { ty: 'wpn', q: 1, v: WEAPONS[w].b, il: 1, w, n }; };   // arma inicial da classe (sem classe: Cutelo)
  eq.wpn = st ? (st.wpn ? mk(st.wpn) : null) : { ty: 'wpn', q: 1, v: WEAPONS[0].b, il: 1, w: 0, n: WEAPONS[0].n }; eq.gun = st && st.gun ? mk(st.gun) : null; eq.arm = null; eq.off = st && st.off ? mk(st.off) : null; bag.length = 0;
  P.arrows = (st && st.arrows) || 0; P.bolts = (st && st.bolts) || 0;
  P.pot = 2; P.bmb = 0; P.potR = P.bmbR = 0; P.gold = 0; setWeapon((st && st.act) || 'wpn'); unequipPet(true);
} // antes de povoar a ilha: a vida dos inimigos depende do nível
if (loaded) migrateStart(); else markStart();   // save antigo de personagem com classe: recebe a arma da classe uma vez
buildOutposts();
buildPois();
if (!RUINS_ISLE) buildFarmSite();   // fazenda de verdade (celeiro, casa, pasto, plantação)
// desempenho: funde o cenário estático (fora NPCs, inimigos e peças animadas)
const dyn = new Set([...npcList.map(n => n.g), ...enemies.map(e => e.g)]);
const mr = mergeStatics(worldBefore, dyn);
if (location.hash === '#dev') console.log('merge', mr);
if (!RUINS_ISLE) { buildFarm(); buildWildlife(); buildBugs(); }
   // cervos, javalis e gatos (criados depois da fusão para continuarem animáveis)
initMount(MOUNT.owned, MOUNT.coat);   // cavalo comprado espera junto ao portão leste
initVehicles();   // carroça/carruagem compradas também   // animais de fazenda (enfeite) — criados depois da fusão para continuarem animáveis
// o jogo sempre começa na vila, com o personagem sentado descansando (clicar no mundo o levanta)
if (savedPos && safeSpot(savedPos.x, savedPos.z)) { P.x = P.tx = savedPos.x; P.z = P.tz = savedPos.z; P.sit = P.sitT = 0; if (savedPos.up) { P.up = true; refreshProps(); } }   // volta onde parou (vila, fazenda ou porto)
else { P.x = P.tx = VILLAGE_SEAT.x; P.z = P.tz = VILLAGE_SEAT.z; P.sit = P.sitT = 1; P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw; }
initSave();
initBackground(tick);   // segundo plano: som inaudível + temporizador mantêm o jogo vivo
log(loaded ? 'Progresso carregado' : 'Polly coleta loot e ataca · troque de companheiro no inventário (I) · R liga/desliga o ataque');
// gancho de testes: abra a página com #dev para inspecionar o jogo pelo console (window.__game)
if (location.hash === '#dev') window.__game = { PROF: PROFS, ELM, ELEMENTS, EL_IDS, MAX_FX, RES, SK, attack, effRng, BOND, HL, PET, petWalk, WILD, ratDbg, doorDbg, talkTo, PICKDBG, canSee, VIS, DOORS, nav: NAV, props, FLOORS, posts: POST_DATA, dodge, CLOCK, MOUNT, toggleMount, giveHorse, VEH, giveVehicle, setUse, unequipPet, dungeonGimmicks, dungeonStats, FARM, setPet, DOG, WEAPONS, attack, impact, equip, unequip, canEquipTo, inDungeon, leaveDungeon, clickCave, DUNGEONS, hit, pathTo, T: terrainDbg, ren, hurtP, scene, npcList, P, state, enemies, props, eq, bag, chest, loot, setWeapon, switchWeapon, cam };
requestAnimationFrame(frame);
