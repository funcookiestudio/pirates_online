/* "Ir até": leva o personagem ao NPC da missão (cartaz, aceitar, entregar) ou ao objetivo, e fecha os painéis. */
import { P } from '../entities/player.js';
import { state } from '../core/state.js';
import { npcList, talkTo } from '../entities/npc.js';
import { questSpot, questGiver, boardData } from '../systems/quests.js';
import { freePoint } from '../systems/steer.js';
import { standUp } from '../systems/rest.js';
import { groundY } from '../world/terrain.js';
import { closePanel } from './panel.js';
import { log } from './notify.js';

const npcNamed = name => npcList.find(n => n.info && n.info.name === name);
export const GO = { close: null };   // quem abre o painel do Mural registra aqui como fechá-lo

function toNpc(name) {
  const n = npcNamed(name);
  if (!n) { log('🧭 ' + name + ' não está por perto agora'); return false; }
  return go(() => talkTo(n), 'Indo até ' + name + '...');
}
function go(fn, msg) {
  if (P.dead) return false;
  if (P.sit > 0 || P.sitT) standUp();
  state.autoHold = 6; P.tgt = null;
  closePanel(); if (GO.close) GO.close();
  fn(); log(msg); return true;
}
/** Botão "Ir até" de um cartão de missão. Devolve true se o personagem saiu andando. */
export function goQuest(q) {
  if (q.state === 'on') {
    const sp = questSpot(q.id);
    if (sp && sp.remo) return toNpc('Capitão Remo');
    if (sp) {
      const f = sp.region ? freePoint(sp.x, sp.z, .7) : { x: sp.x, z: sp.z };
      return go(() => { P.tx = f.x; P.tz = f.z; }, 'Indo até o objetivo de ' + q.title + '...');
    }
    log('O objetivo de ' + q.title + ' fica dentro de dungeons');
    return false;
  }
  return toNpc(questGiver(q.id) || q.giver);
}
export const goLabel = q => q.state === 'on' ? (questSpot(q.id) && questSpot(q.id).remo ? 'Ir até o Capitão Remo' : 'Ir até o objetivo') : q.state === 'ready' ? 'Ir entregar a ' + q.giver : 'Ir até ' + q.giver;
