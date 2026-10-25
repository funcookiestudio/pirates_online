/* Ponto de entrada: monta o mundo, liga os sistemas e roda o loop do jogo. */
import { WEAPONS } from './data/weapons.js';
import * as terrainDbg from './world/terrain.js';
import { scene, cam, ren } from './core/engine.js';
import { state } from './core/state.js';
import { buildWorld } from './world/world.js';
import { buildVillage } from './world/village.js';
import { buildCastle } from './world/castle.js';
import { initDialog } from './ui/dialog.js';
import { updateNpcs, npcList } from './entities/npc.js';
import { updatePerf } from './systems/perf.js';
import { updateSettings, initSettings } from './systems/settings.js';
import { DOORS } from './world/doors.js';
import { updateLod } from './systems/lod.js';
import { updateVision, updateVisionOverlay, canSee, VIS } from './systems/vision.js';
import { pathTo } from './systems/steer.js';
import { mergeStatics } from './world/merge.js';
import { initUpdater } from './ui/updater.js';
import { buildOutposts, updateOutposts } from './world/outposts.js';
import { buildPois, updatePois } from './world/pois.js';
import { updateEnemies, updateRespawns } from './entities/enemies.js';
import { updateLoot } from './entities/loot.js';
import { setWeapon, equip, unequip, canEquipTo, eq, bag, chest } from './systems/inventory.js';
import { switchWeapon } from './systems/swap.js';
import { updatePlayer } from './systems/player-update.js';
import { updateBombs, updateShots, hit, attack, impact } from './systems/combat.js';
import { updateParticles } from './systems/effects.js';
import { updateCamera } from './systems/camera.js';
import { separate } from './systems/separation.js';
import { updateXray } from './world/xray.js';
import { initInput } from './systems/input.js';
import * as FLOORS from './world/floors.js';
import { updateRoyals } from './entities/royals.js';
import { updateFarmFx } from './world/farm-granja.js';
import { refreshProps } from './world/floors.js';
import { updateDayNight } from './world/daynight.js';
import { initBackground } from './systems/background.js';
import { loadGame, initSave, savedPos, safeSpot } from './systems/save.js';
import { MOUNT, initMount, toggleMount, giveHorse } from './systems/mount.js';
import { CLOCK } from './core/clock.js';
import { dodge } from './systems/dodge.js';
import { buildFarmSite } from './entities/farm-site.js';
import { buildFarm, updateFarm, FARM } from './entities/farm.js';
import { updatePets, setPet } from './pets/manager.js';
import { DOG } from './pets/dog.js';
import { refreshPetButton, initHotbarFit } from './ui/hotbar.js';
import { initPanel } from './ui/panel.js';
import { initWorldMap } from './ui/worldmap.js';
import { dungeonGimmicks, updateDungeon, inDungeon, leaveDungeon } from './dungeon/dungeon-scene.js';
import { initCaves, clickCave, DUNGEONS } from './world/caves.js';
import { updateStatusBars, updateOverlays } from './ui/hud.js';
import { log } from './ui/notify.js';
import './systems/death.js';
import { initFullscreen, initPwa } from './ui/fullscreen.js';
import { VILLAGE_SEAT, POST_DATA } from './data/posts.js';
import { P, hurtP } from './entities/player.js';
import * as NAV from './world/interior-nav.js';
import { enemies, props, loot } from './core/registry.js';

let last = 0;

function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}

function tick(now) {

  const rawDt = (now - (last || now)) / 1000;   // sem limite: o contador de FPS e a qualidade automática precisam enxergar fps abaixo de 20
  let dt = Math.min(.05, rawDt);
  last = now;
  const realDt = dt; // companheiros e balas não sofrem o "hit-stop"

  // hit-stop: câmera lenta curta em golpes fortes
  if (state.HS > 0) { state.HS -= dt; dt *= .12; }

  // 1) jogo
  updatePerf(rawDt);
  updateSettings(realDt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateLod(realDt);
  updateDayNight(inDungeon());
  updateNpcs(realDt, now);
  updateFarm(realDt);
  updateRoyals(realDt);
  updateFarmFx(realDt);
  separate();
  updateLoot(dt, now);
  updateBombs(dt);
  updateParticles(dt);
  updateRespawns(dt);
  updateOutposts(now / 1000);
  updatePois();
  updateDungeon(dt, now);
  updateCamera(dt);

  // 2) interface e companheiros
  updateStatusBars();
  updateShots(realDt);
  updatePets(realDt, now);
  updateOverlays(now);

  updateXray();
  updateVision(realDt, inDungeon());
  updateVisionOverlay(inDungeon());   // por último: esconde quem o jogador não enxerga (paredes, andares, casas fechadas)
  ren.render(scene, cam);
}

const worldBefore = new Set(scene.children);
buildWorld();
buildVillage();
buildCastle();
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
initHotbarFit();
const loaded = loadGame(); // antes de povoar a ilha: a vida dos inimigos depende do nível
buildOutposts();
buildPois();
buildFarmSite();   // fazenda de verdade (celeiro, casa, pasto, plantação)
// desempenho: funde o cenário estático (fora NPCs, inimigos e peças animadas)
const dyn = new Set([...npcList.map(n => n.g), ...enemies.map(e => e.g)]);
const mr = mergeStatics(worldBefore, dyn);
if (location.hash === '#dev') console.log('merge', mr);
buildFarm();
initMount(MOUNT.owned, MOUNT.coat);   // cavalo comprado espera junto ao portão leste   // animais de fazenda (enfeite) — criados depois da fusão para continuarem animáveis
// o jogo sempre começa na vila, com o personagem sentado descansando (clicar no mundo o levanta)
if (savedPos && safeSpot(savedPos.x, savedPos.z)) { P.x = P.tx = savedPos.x; P.z = P.tz = savedPos.z; P.sit = P.sitT = 0; if (savedPos.up) { P.up = true; refreshProps(); } }   // volta onde parou (vila, fazenda ou porto)
else { P.x = P.tx = VILLAGE_SEAT.x; P.z = P.tz = VILLAGE_SEAT.z; P.sit = P.sitT = 1; P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw; }
initSave();
initBackground(tick);   // segundo plano: som inaudível + temporizador mantêm o jogo vivo
log(loaded ? '💾 Progresso carregado' : '🦜 Polly coleta loot e ataca · troque de companheiro no inventário (I) · R liga/desliga o ataque');
// gancho de testes: abra a página com #dev para inspecionar o jogo pelo console (window.__game)
if (location.hash === '#dev') window.__game = { canSee, VIS, DOORS, nav: NAV, props, FLOORS, posts: POST_DATA, dodge, CLOCK, MOUNT, toggleMount, giveHorse, dungeonGimmicks, FARM, setPet, DOG, WEAPONS, attack, impact, equip, unequip, canEquipTo, inDungeon, leaveDungeon, clickCave, DUNGEONS, hit, pathTo, T: terrainDbg, ren, hurtP, scene, npcList, P, state, enemies, props, eq, bag, chest, loot, setWeapon, switchWeapon, cam };
requestAnimationFrame(frame);
