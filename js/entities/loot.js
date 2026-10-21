/* Itens no chão: queda ao matar inimigos, coleta pelo jogador ou pelo companheiro. */
import { scene } from '../core/engine.js';
import { loot } from '../core/registry.js';
import { M } from '../core/utils.js';
import { WEAPONS } from '../data/weapons.js';
import { P } from './player.js';
import { addItem, bagFull, lootBlocked, POT_MAX } from '../systems/inventory.js';
import { lootText, log } from '../ui/notify.js';

/** Modelo de uma arma caída: arma deitada + anel e feixe de luz da raridade */
function dropModel(wi, q) {
  const g = new THREE.Group(), m = WEAPONS[wi].build();
  m.scale.setScalar(.75);
  m.rotation.z = Math.PI / 2;
  const c0 = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
  m.position.x -= c0.x;
  m.position.z -= c0.z;
  g.add(m);

  const c = [0, 0xcccccc, 0x4a90ff, 0xff9a20][q];
  const r = new THREE.Mesh(
    new THREE.RingGeometry(.55, .7, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: c })
  );
  r.position.y = -.34;
  g.add(r);

  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(.05, .05, 2.6, 5),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .3 })
  );
  b.position.y = 1;
  g.add(b);
  return g;
}

/** Cria o modelo de um item: ouro, poção, arma ou armadura */
function lootModel(ty, q, wi) {
  if (ty === 'wpn') return dropModel(wi, q);
  const geo = ty === 'gold' ? new THREE.CylinderGeometry(.25, .25, .08, 6)
    : ty === 'pot' ? new THREE.SphereGeometry(.22, 5, 4)
    : new THREE.BoxGeometry(.2, .7, .2);
  const color = ty === 'gold' ? 0xf0c030 : ty === 'pot' ? 0xc02020 : 0xb070ff;
  return new THREE.Mesh(geo, M(color));
}

/** Sorteia e solta os itens do inimigo morto `e` */
export function dropLoot(e) {
  const il = e.t.lv, boss = e.t.boss;
  // a maioria dos inimigos não deixa nada; o boss sempre solta vários itens
  const n = boss ? 4 : Math.random() < .5 ? 1 + (Math.random() < .12 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const ty = boss && i < 2 ? (i ? 'arm' : 'wpn') : r < .6 ? 'gold' : r < .8 ? 'pot' : r < .93 ? 'wpn' : 'arm';
    // qualidade: comum na maioria; raro/épico só com sorte (chances sobem um pouco com o nível do inimigo)
    const q = boss ? (Math.random() < .3 ? 3 : 2)
      : Math.random() < .004 + il * .0006 ? 3 : Math.random() < .03 + il * .006 ? 2 : 1;
    const wi = Math.floor(Math.random() * WEAPONS.length);
    const m = lootModel(ty, q, wi);
    m.position.set(e.x + (Math.random() - .5) * 2, .3, e.z + (Math.random() - .5) * 2);
    scene.add(m);
    loot.push({ m, ty, q, wi, il, life: 0 });
  }
}

/** Tempo (s) que um item fica no chão antes de sumir */
export const LOOT_LIFE = 60;

/** O jogador larga um item da mochila no chão; só ele volta a pegar, depois de se afastar */
export function dropItem(it, from) {
  const ty = it.ty, wi = it.w != null ? it.w : (from ? from.wi : 0);
  const m = lootModel(ty, it.q, wi);
  const a = Math.random() * 6.28;
  m.position.set(P.x + Math.cos(a) * 1.8, .3, P.z + Math.sin(a) * 1.8);
  scene.add(m);
  loot.push({ m, ty, q: it.q, wi, it: it.n ? it : null, life: 0, dropped: true, armed: false });
}

/** Aplica o efeito de um item coletado. `tag` (opcional) é o ícone do companheiro que coletou. */
export function applyLoot(l, tag) {
  const p = tag ? tag + ' ' : '';
  if (l.ty === 'gold') {
    const g = 2 + (l.il || 1) * 2;
    P.gold += g;
    lootText(p + '+' + g + ' ouro');
  } else if (l.ty === 'pot') {
    if (P.pot < POT_MAX) { P.pot++; lootText(p + '+ poção'); }
  } else if (bagFull()) {
    // chegou com a mochila cheia (ex.: o companheiro trazia na boca): solta no chão, sem ninguém pegar sozinho
    dropItem(l.it || { ty: l.ty, q: l.q, w: l.wi, v: 0, n: '' }, l);
    notifyFull();
  } else {
    addItem(l);
  }
}

let fullT = 0;
/** Aviso (no máximo a cada 3 s) de mochila cheia */
function notifyFull(pot) {
  const n = performance.now();
  if (n - fullT < 3000) return;
  fullT = n;
  lootText(pot ? '🧪 Poções no limite (5)' : '🎒 Mochila cheia!');
  if (pot) return;
}

/** Gira os itens no chão e deixa o jogador coletar os que estão perto */
export function updateLoot(dt, now) {
  for (let i = loot.length - 1; i >= 0; i--) {
    const l = loot[i];
    l.m.rotation.y += dt * 2;
    l.m.position.y = .4 + Math.sin(now / 300) * .1;
    l.life += dt;
    if (l.life > LOOT_LIFE) { scene.remove(l.m); loot.splice(i, 1); continue; }
    l.m.visible = l.life < LOOT_LIFE - 10 || Math.floor(l.life * 5) % 2 === 0; // pisca nos últimos 10 s
    const d = Math.hypot(P.x - l.m.position.x, P.z - l.m.position.z);
    if (l.dropped && !l.armed && d > 2.6) l.armed = true;
    if (d < 1.3 && lootBlocked(l)) { notifyFull(l.ty === 'pot'); continue; }
    if (d < 1.3 && (!l.dropped || l.armed)) {
      applyLoot(l);
      scene.remove(l.m);
      loot.splice(i, 1);
    }
  }
}
