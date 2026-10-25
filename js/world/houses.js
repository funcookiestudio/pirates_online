/* Casas temáticas da vila: uma para cada ofício (ferreiro, taverna, cartógrafo, calafate, marujo, mercadora, pescador). */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { M } from '../core/utils.js';
import { xray } from './xray.js';
import { buildSmithHouse } from './smith-house.js';
import { buildTavernHouse } from './tavern-house.js';

const X = c => xray(M(c));

/** Constrói a casa `kind` em (x,z) olhando para o centro da vila. Devolve onde o morador fica (na frente da porta) */
export function buildHouse(kind, x, z, a) {
  if (kind === 'tavern') { const h = buildTavernHouse(x, z, a); return [h.front[0], h.front[1], h.th, h.at]; }
  if (kind === 'smith') { const h = buildSmithHouse(x, z, a); return [h.front[0], h.front[1], h.th, h.at, h.pts]; }
  const g = new THREE.Group(), th = Math.atan2(-Math.cos(a), -Math.sin(a));
  g.position.set(x, 0, z);
  g.rotation.y = th;
  const add = (m, px, py, pz) => { m.position.set(px, py, pz); g.add(m); return m; };
  const box = (w, h, d, c, px, py, pz, xr) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), xr ? X(c) : M(c)), px, py, pz);
  const cyl = (rt, rb, h, c, px, py, pz, seg = 10) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)), px, py, pz);
  // colisão em coordenadas locais
  const block = (lx, lz, r) => {
    const o = new THREE.Object3D();
    o.position.set(x + lx * Math.cos(th) + lz * Math.sin(th), 0, z - lx * Math.sin(th) + lz * Math.cos(th));
    o.r = r;
    props.push(o);
  };

  const S = {
    smith:   { wall: 0x77736c, roof: 0x3a3a42 },
    tavern:  { wall: 0xa6784a, roof: 0xa83a2a },
    cartog:  { wall: 0xd8cfb0, roof: 0x3a5a8a },
    caulk:   { wall: 0x8a6a44, roof: 0x5a4a30 },
    sailor:  { wall: 0x7ab0a8, roof: 0x6a4a2a },
    trader:  { wall: 0xd8c090, roof: 0x3a6a4a },
    fisher:  { wall: 0x9a8a6a, roof: 0xc8a850 },
  }[kind];

  // corpo, telhado, porta e janelas
  box(3.8, 2.6, 3.6, S.wall, 0, 1.3, 0, true);
  box(3.9, .12, 3.7, 0x4a3a28, 0, .06, 0);                 // soleira
  const roof = add(new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.8, 4), X(S.roof)), 0, 3.5, 0);
  roof.rotation.y = Math.PI / 4;
  box(.9, 1.7, .1, 0x4a2c14, 0, .85, 1.82);
  box(.6, .55, .1, 0x9ad0e8, -1.3, 1.5, 1.82);
  box(.6, .55, .1, 0x9ad0e8, 1.3, 1.5, 1.82);
  block(-1.3, 0, 1.45); block(0, 0, 1.55); block(1.3, 0, 1.45);
  g.children.forEach(m => { m.userData.shell = true; });

  if (kind === 'smith') {
    box(.9, 3.6, .9, 0x6a6a62, 1.2, 2.4, -1.0);                     // chaminé alta
    box(.7, .15, .7, 0xff7a20, 1.2, 4.25, -1.0);                    // brasa
    box(.9, .75, .9, 0x55524c, -1.3, .38, 2.7);                     // forja
    box(.7, .12, .7, 0xff6a20, -1.3, .8, 2.7);
    box(.5, .5, .4, 0x2a2a2e, 1.3, .25, 2.6); box(.8, .2, .34, 0x3a3a40, 1.3, .6, 2.6); // bigorna
    box(.06, 1.2, .06, 0x5a3a1a, 1.7, 1.9, 2.1); box(.5, .22, .22, 0x6a6a72, 1.7, 2.5, 2.1); // placa: martelo
    // barril aberto com água dentro (têmpera)
    add(new THREE.Mesh(new THREE.CylinderGeometry(.46, .42, .9, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0x6a4624, side: THREE.DoubleSide })), 2.45, .45, 2.6);
    cyl(.42, .42, .04, 0x2a1a0c, 2.45, .03, 2.6, 14);                 // fundo
    const water = add(new THREE.Mesh(new THREE.CircleGeometry(.41, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a8ac8 })), 2.45, .76, 2.6); // água
    water.userData.water = true;
    add(new THREE.Mesh(new THREE.RingGeometry(.4, .47, 14).rotateX(-Math.PI / 2), M(0x4a2e14)), 2.45, .905, 2.6); // borda
    [.2, .7].forEach(py => cyl(.475, .45, .06, 0x3a3a40, 2.45, py, 2.6));
    block(-1.3, 2.7, .6); block(1.3, 2.6, .55); block(2.45, 2.6, .55);
  } else if (kind === 'tavern') {
    box(.8, 3.2, .8, 0x6a6a62, -1.2, 2.2, -1.0);
    box(.06, 1.7, .06, 0x5a3a1a, 1.75, 1.9, 2.1); box(.9, .6, .08, 0x5a3a1a, 1.75, 2.45, 2.1); // placa
    box(.22, .3, .1, 0xf0c040, 1.75, 2.45, 2.16);
    cyl(.42, .42, .8, 0x7a4a24, -1.4, .4, 2.5); cyl(.42, .42, .8, 0x7a4a24, -.8, .4, 2.9); cyl(.38, .38, .7, 0x6a3a1a, -1.9, .35, 2.9);
    box(1.2, .1, .4, 0x5a3a1a, 1.2, .45, 2.9); box(.1, .45, .3, 0x5a3a1a, .7, .22, 2.9); box(.1, .45, .3, 0x5a3a1a, 1.7, .22, 2.9); // banco
    box(.18, .22, .18, 0xffd060, -.7, 1.9, 1.9); box(.18, .22, .18, 0xffd060, .7, 1.9, 1.9);
    block(-1.4, 2.5, .55); block(-.8, 2.9, .5);
  } else if (kind === 'cartog') {
    cyl(.28, .28, 1.4, 0x7a6a4a, 0, 4.6, 0, 8);                     // torre da luneta
    const ls = cyl(.1, .13, 1.2, 0xb08a30, .3, 5.5, 0, 8); ls.rotation.z = -.7;
    box(1.4, .1, .9, 0x6a4a2a, 1.3, .8, 2.7);                       // mesa de mapas
    box(.08, .8, .08, 0x5a3a1a, .75, .4, 2.35); box(.08, .8, .08, 0x5a3a1a, 1.85, .4, 2.35); box(.08, .8, .08, 0x5a3a1a, .75, .4, 3.05); box(.08, .8, .08, 0x5a3a1a, 1.85, .4, 3.05);
    box(1.0, .03, .65, 0xeadfb8, 1.15, .87, 2.7);                   // mapa
    add(new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), M(0x3a7ab0)), 1.8, 1.15, 2.7); // globo
    box(.9, .6, .06, 0xeadfb8, -1.5, 1.2, 2.0); box(.06, .5, .05, 0xb02020, -1.5, 1.25, 2.04); // mapa na parede
    block(1.3, 2.7, .85);
  } else if (kind === 'caulk') {
    const hull = box(2.5, .7, .95, 0x6a4a2a, -1.2, .4, 2.8); hull.rotation.y = .12;   // casco virado
    box(2.6, .1, .2, 0x4a3018, -1.2, .8, 2.8).rotation.y = .12;                       // quilha
    cyl(.35, .35, .7, 0x1a1a1a, 1.4, .35, 2.5); cyl(.35, .35, .7, 0x1a1a1a, 1.9, .35, 2.9);  // barris de breu
    box(1.0, .2, .12, 0x9a7a4a, 1.0, 1.4, 2.0); box(.1, .5, .06, 0x6a6a72, 1.4, 1.7, 2.05); // pranchas e ferramenta
    box(.8, .4, .5, 0x7a5a34, 0, .2, 3.0);                          // pilha de tábuas
    block(-1.2, 2.8, 1.2); block(1.4, 2.5, .5); block(1.9, 2.9, .45);
  } else if (kind === 'sailor') {
    const wheel = cyl(.5, .5, .08, 0x6a4020, 1.3, 1.9, 1.9, 12); wheel.rotation.x = Math.PI / 2;  // timão
    [0, 1, 2, 3].forEach(i => { const sp = box(.07, 1.1, .05, 0x4a2c14, 1.3, 1.9, 1.95); sp.rotation.z = i * Math.PI / 4; });
    box(.1, 1.3, .1, 0x5a5a62, -1.4, .7, 2.6); box(.8, .1, .1, 0x5a5a62, -1.4, 1.1, 2.6);         // âncora
    box(.1, .4, .1, 0x5a5a62, -1.8, .75, 2.6); box(.1, .4, .1, 0x5a5a62, -1.0, .75, 2.6);
    box(.6, .6, .6, 0x7a5a34, 0, .3, 3.0); box(.6, .3, .6, 0x8a6a40, .3, .75, 3.0);                // caixotes
    box(.7, .1, .7, 0xb02020, 0, 3.7, 0).visible = false;
    block(-1.4, 2.6, .5); block(0, 3.0, .6);
  } else if (kind === 'trader') {
    // barraca com toldo listrado
    [-1.5, -.5, .5, 1.5].forEach((px, i) => box(1, .1, 1.3, i % 2 ? 0xf0f0e0 : 0xc83a2a, px, 2.3, 2.9));
    box(.1, 2.3, .1, 0x5a3a1a, -2, 1.15, 3.5); box(.1, 2.3, .1, 0x5a3a1a, 2, 1.15, 3.5);
    box(3.6, .8, .6, 0x7a5a34, 0, .4, 3.4);                         // balcão
    box(.7, .45, .5, 0x6a4a24, -.9, 1.0, 3.4); box(.72, .1, .52, 0xd8b030, -.9, 1.25, 3.4); // baú
    box(.5, .5, .5, 0x8a6a40, .9, 1.05, 3.4); box(.4, .35, .4, 0x7a5a34, 1.3, 1.0, 3.4);
    cyl(.3, .3, .6, 0xc87a3a, 1.9, .3, 2.4);
    block(0, 3.4, 1.0); block(-1.3, 3.4, .8); block(1.3, 3.4, .8);
  } else if (kind === 'fisher') {
    // varal de peixe e rede
    box(.1, 1.8, .1, 0x5a3a1a, -1.8, .9, 2.8); box(.1, 1.8, .1, 0x5a3a1a, .2, .9, 2.8); box(2.1, .1, .1, 0x5a3a1a, -.8, 1.7, 2.8);
    [-1.5, -1.1, -.7, -.3].forEach(px => box(.12, .4, .05, 0xb8c0c8, px, 1.4, 2.8));
    box(.7, .5, .7, 0x6a4a24, 1.4, .25, 2.6); box(.5, .4, .5, 0x6a4a24, 1.9, .2, 3.0);   // covos
    cyl(.4, .4, .8, 0x7a4a24, 1.8, .4, 2.0);
    box(1.0, .05, .8, 0x4a7a8a, 1.4, .03, 3.4);                      // rede estendida
    block(-.8, 2.8, 1.0); block(1.4, 2.6, .5);
  }
  g.children.forEach(m => { if (m.position.y > 2.2 && m.position.z < 2) m.userData.shell = true; }); // casca da casa (paredes, telhado, chaminé): permite ocultar só a casa em testes
  scene.add(g);
  // at(lx,lz): ponto local da casa -> mundo
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  return [x + Math.sin(th) * 3.4, z + Math.cos(th) * 3.4, th, at];
}
