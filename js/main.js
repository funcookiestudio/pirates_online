/* Ponto de entrada: monta o mundo, liga os sistemas e roda o loop do jogo. */
import * as terrainDbg from './world/terrain.js';
import { scene, cam, ren } from './core/engine.js';
import { state } from './core/state.js';
import { buildWorld } from './world/world.js';
import { buildVillage } from './world/village.js';
import { initDialog } from './ui/dialog.js';
import { updateNpcs, npcList } from './entities/npc.js';
import { updatePerf } from './systems/perf.js';
import { pathTo } from './systems/steer.js';
import { mergeStatics } from './world/merge.js';
import { buildOutposts, updateOutposts } from './world/outposts.js';
import { buildPois, updatePois } from './world/pois.js';
import { updateEnemies, updateRespawns } from './entities/enemies.js';
import { updateLoot } from './entities/loot.js';
import { setWeapon, equip, unequip, canEquipTo, eq, bag, chest } from './systems/inventory.js';
import { switchWeapon } from './systems/swap.js';
import { updatePlayer } from './systems/player-update.js';
import { updateBombs, updateShots, hit } from './systems/combat.js';
import { updateParticles } from './systems/effects.js';
import { updateCamera } from './systems/camera.js';
import { separate } from './systems/separation.js';
import { updateXray } from './world/xray.js';
import { initInput } from './systems/input.js';
import { loadGame, initSave } from './systems/save.js';
import { updatePets } from './pets/manager.js';
import { refreshPetButton, initHotbarFit } from './ui/hotbar.js';
import { initPanel } from './ui/panel.js';
import { initWorldMap } from './ui/worldmap.js';
import { updateDungeon, inDungeon, leaveDungeon } from './dungeon/dungeon-scene.js';
import { initCaves, clickCave, DUNGEONS } from './world/caves.js';
import { updateStatusBars, updateOverlays } from './ui/hud.js';
import { log } from './ui/notify.js';
import './systems/death.js';
import { initFullscreen, initPwa } from './ui/fullscreen.js';
import { VILLAGE_SEAT } from './data/posts.js';
import { P, hurtP } from './entities/player.js';
import { enemies, props, loot } from './core/registry.js';

let last = 0;

function frame(now) {
  requestAnimationFrame(frame);

  let dt = Math.min(.05, (now - (last || now)) / 1000);
  last = now;
  const realDt = dt; // companheiros e balas não sofrem o "hit-stop"

  // hit-stop: câmera lenta curta em golpes fortes
  if (state.HS > 0) { state.HS -= dt; dt *= .12; }

  // 1) jogo
  updatePerf(realDt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateNpcs(realDt, now);
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
  ren.render(scene, cam);
}

const worldBefore = new Set(scene.children);
buildWorld();
buildVillage();
initInput();
initWorldMap();
initCaves();
initFullscreen();
initPwa();
initPanel();
initDialog();
setWeapon();
refreshPetButton();
initHotbarFit();
const loaded = loadGame(); // antes de povoar a ilha: a vida dos inimigos depende do nível
buildOutposts();
buildPois();
// desempenho: funde o cenário estático (fora NPCs, inimigos e peças animadas)
const dyn = new Set([...npcList.map(n => n.g), ...enemies.map(e => e.g)]);
const mr = mergeStatics(worldBefore, dyn);
if (location.hash === '#dev') console.log('merge', mr);
// o jogo sempre começa na vila, com o personagem sentado descansando (clicar no mundo o levanta)
P.x = P.tx = VILLAGE_SEAT.x; P.z = P.tz = VILLAGE_SEAT.z; P.sit = P.sitT = 1; P.g.rotation.y = P.ay = VILLAGE_SEAT.yaw;
initSave();
log(loaded ? '💾 Progresso carregado' : '🦜 Polly coleta loot e ataca · troque de companheiro no inventário (I) · R liga/desliga o ataque');
// gancho de testes: abra a página com #dev para inspecionar o jogo pelo console (window.__game)
if (location.hash === '#dev') window.__game = { equip, unequip, canEquipTo, inDungeon, leaveDungeon, clickCave, DUNGEONS, hit, pathTo, T: terrainDbg, ren, hurtP, scene, npcList, P, state, enemies, props, eq, bag, chest, loot, setWeapon, switchWeapon, cam };
requestAnimationFrame(frame);
