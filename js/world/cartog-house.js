/* Casa do cartógrafo (c. 1720–1750): reboco claro com enxaimel, venezianas azuis, telhado de ardósia com cúpula de observação, mesa de cartas, globo, esfera armilar, estantes e cama. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps } from './floors.js';
import { addDoor } from './doors.js';
import { addBed } from './beds.js';

export const CARTOG_SC = 1.28;

export function buildCartogHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  const root = new THREE.Group();
  root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); S.scale.setScalar(CARTOG_SC); root.add(S);
  const DR = [];
const PL=0xe0d3b4,STONE=0x7b786f,STONE2=0x66635c,TM=0x4a3320,DOOR=0x6b4a2b,DOOR2=0x5c3f24,IRON=0x2b2b30,WOOD=0x8a6238,WOOD2=0x6e4d2c,SH=0x2f4a6a;
let DEF=S;let XR=false;function M(c,e){const m=new THREE.MeshLambertMaterial({color:c,emissive:e||0});return XR?xray(m):m}
function B(w,h,d,x,y,z,c,p,e){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,e));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(p||DEF).add(m);return m}
function C(rt,rb,h,n,x,y,z,c,p,e){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),M(c,e));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(p||DEF).add(m);return m}
function W(ax,f,u,y,l,h,t,c,g){return ax=='x'?B(l,h,t,u,y,f,c,g):B(t,h,l,f,y,u,c,g)}
function tr(m,o){m.material.transparent=true;m.material.opacity=o;return m}
// luzes

// terreno

// estrutura
const H=3,T=.3,front=new THREE.Group(),roof=new THREE.Group(),walls=new THREE.Group();S.add(front,roof,walls);const wB=new THREE.Group(),wL=new THREE.Group(),wR=new THREE.Group();walls.add(wB,wL,wR);
B(8.6,.4,6.6,0,-.1,0,STONE2);B(7.7,.1,5.7,0,.06,0,0x5a4430);
for(let i=0;i<8;i++)B(.94,.03,5.7,-3.5+i,.115,0,i%2?0x6b5238:0x7a5e40);
function wall(ax,f,a0,a1,ops,g){
 ops.sort((a,b)=>a.c-b.c);let cur=a0,k=0;
 const seg=(u0,u1,y0,y1)=>{const l=u1-u0,h=y1-y0;if(l<.02||h<.02)return;const u=(u0+u1)/2,y=(y0+y1)/2;
  W(ax,f,u,y,l,h,T,PL,g);
  if(y0<.6){const t=Math.min(y1,.6);W(ax,f,u,(y0+t)/2,l,t-y0,T+.14,STONE,g)}
  if(y0===0&&y1===H&&l>1.2){const hh=H-.8,len=Math.hypot(l,hh),s=(k++%2)?1:-1,m=W(ax,f,u,.7+hh/2,len,.12,T+.1,TM,g);
   if(ax=='x')m.rotation.z=s*Math.atan2(hh,l);else m.rotation.x=-s*Math.atan2(hh,l)}};
 for(const o of ops){const l0=o.c-o.w/2,l1=o.c+o.w/2;seg(cur,l0,0,H);seg(l0,l1,0,o.y0);seg(l0,l1,o.y1,H);
  W(ax,f,l0,H/2,.16,H,T+.1,TM,g);W(ax,f,l1,H/2,.16,H,T+.1,TM,g);cur=l1}
 seg(cur,a1,0,H);
 W(ax,f,(a0+a1)/2,H-.09,a1-a0,.18,T+.12,TM,g);W(ax,f,a0,H/2,.24,H,T+.16,TM,g);W(ax,f,a1,H/2,.24,H,T+.16,TM,g);
}
function win(ax,f,c,w,y0,y1,g){const h=y1-y0,y=(y0+y1)/2,s=Math.sign(f);
 W(ax,f,c,y1+.07,w+.3,.14,T+.14,TM,g);W(ax,f,c,y0-.05,w+.4,.1,T+.28,STONE,g);
 W(ax,f,c,y,w,.06,T+.06,TM,g);W(ax,f,c,y,.06,h,T+.06,TM,g);
 tr(W(ax,f,c,y,w,h,.03,0xbfe0f0,g),.4);
 for(const k of[-1,1]){W(ax,f,c+k*(w/2+.04),y,.1,h,T+.1,TM,g);
  const uc=c+k*(w/2+w/4+.16);W(ax,f+s*.2,uc,y,w/2,h,.06,SH,g);
  W(ax,f+s*.24,uc,y+h*.3,w/2,.07,.04,TM,g);W(ax,f+s*.24,uc,y-h*.3,w/2,.07,.04,TM,g);
  for(let i=-2;i<=2;i++)W(ax,f+s*.235,uc+i*w/10,y,.02,h-.1,.02,0x2c4234,g)}
}
function door(c,w,h,g){
 W('x',3,c-w/2-.09,h/2,.18,h+.1,T+.14,TM,g);W('x',3,c+w/2+.09,h/2,.18,h+.1,T+.14,TM,g);W('x',3,c,h+.1,w+.5,.22,T+.14,TM,g);
 const p=new THREE.Group();p.position.set(c-w/2,0,2.98);p.rotation.y=0;g.add(p);DR.push({p,g,openRot:1.05,c,f:3,w,lvl:0,id:'cartog-front'});
 for(let i=0;i<5;i++)B(w/5-.012,h-.06+Math.random()*.04,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);
 B(w,.12,.09,w/2,.45,.01,IRON,p);B(w,.12,.09,w/2,h-.45,.01,IRON,p);B(w,.06,.09,w/2,h/2,.01,TM,p);
 B(.2,.09,.1,.1,.45,.02,IRON,p);B(.2,.09,.1,.1,h-.45,.02,IRON,p);
 const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.016,4,8),M(IRON));r.position.set(w-.15,1.0,.07);p.add(r);

}
XR=true;wall('x',3,-4,4,[{c:-1.4,w:1.2,y0:0,y1:2.2},{c:1.8,w:1.3,y0:1,y1:2.1}],front);
door(-1.4,1.2,2.2,front);win('x',3,1.8,1.3,1,2.1,front);
wall('x',-3,-4,4,[{c:-.6,w:1.1,y0:1,y1:2.1}],wB);win('x',-3,-.6,1.1,1,2.1,wB);
wall('z',-4,-3,3,[{c:-.6,w:1.2,y0:1,y1:2.1}],wL);win('z',-4,-.6,1.2,1,2.1,wL);
wall('z',4,-3,3,[{c:.6,w:1.2,y0:1,y1:2.1}],wR);win('z',4,.6,1.2,1,2.1,wR);
B(1.9,.2,.9,-1.4,.12,3.55,STONE);B(1.4,.12,.5,-1.4,.06,4.2,STONE2);
// telhado
const L=Math.hypot(3.6,2.2),A=Math.atan2(2.2,3.6),RT=H+2.2,sc=[0x3b4a5c,0x46576b,0x34424f,0x52647a];
for(const s of[1,-1]){const g=new THREE.Group();g.position.set(0,RT,0);g.rotation.x=s*A;roof.add(g);
 B(9,.12,L,0,-.12,s*L/2,0x3a281a,g);
 for(const x of[-3.5,-1.75,0,1.75,3.5])B(.15,.15,L,x,-.24,s*L/2,TM,g);
 const l=L/9;for(let i=0;i<9;i++)for(let j=0;j<9;j++)B(.98,.09,l*1.3,-4+j,.02*((i+j)%2),s*(i+.5)*l,sc[(Math.random()*4)|0],g)}
B(9.2,.16,.55,0,RT+.07,0,0x2e2118,roof);B(9,.2,.2,0,RT-.1,0,TM,roof);
for(const x of[-3.5,-1.75,0,1.75,3.5])B(.18,.18,6.3,x,H-.1,0,TM,roof);
for(const x0 of[3.85,-4.15]){const sh=new THREE.Shape();sh.moveTo(-3,0);sh.lineTo(3,0);sh.lineTo(0,2.2);
 const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:T,bevelEnabled:false}),M(PL));m.rotation.y=Math.PI/2;m.position.set(x0,H,0);m.castShadow=true;roof.add(m);
 B(T+.1,2.2,.14,x0+T/2,H+1.1,0,TM,roof);B(T+.1,.14,6,x0+T/2,H+.05,0,TM,roof)}
XR=false;
// cúpula de observação no telhado (luneta de latão apontando para o céu)
{const cu=new THREE.Group();cu.position.set(-1.6,RT+.1,0);roof.add(cu);
 C(.8,.9,.9,8,0,.45,0,PL,cu);for(let i=0;i<8;i++){const a=i*Math.PI/4;B(.1,.9,.1,Math.cos(a)*.88,.45,Math.sin(a)*.88,TM,cu)}
 C(.1,.85,.7,8,0,1.25,0,0x3b4a5c,cu);C(.05,.05,.3,6,0,1.75,0,IRON,cu);
 const tb=C(.07,.1,1.2,8,.2,1.0,.1,0xb08a30,cu);tb.rotation.z=-.8;tb.rotation.x=.2;
 const wd=B(.5,.5,.06,.5,.55,.82,0x1a2230,cu);wd.rotation.y=.2;}
// sinal pendurado com rosa dos ventos e relógio de sol
B(.1,.1,1,-2.5,2.6,3.55,IRON);B(.7,.7,.05,-2.5,2.1,3.95,TM);B(.58,.58,.06,-2.5,2.1,3.95,0xe6dcb4);
C(.2,.2,.07,8,-2.5,2.1,3.97,0x2f4a6a).rotation.x=Math.PI/2;B(.05,.5,.08,-2.5,2.1,4.0,0xa83a2a);B(.5,.05,.08,-2.5,2.1,4.0,0x2b2b30);
{const sd=C(.35,.35,.04,10,1.8,2.7,3.22,0xd6c394);sd.rotation.x=Math.PI/2;B(.03,.16,.2,1.8,2.78,3.3,0xb08a30)}
XR=false;
// terraço: luneta de latão no tripé
{const g=new THREE.Group();g.position.set(2.6,0,4.3);g.rotation.y=-.5;S.add(g);
 for(const a of[0,2.1,4.2]){const l=B(.05,1.2,.05,Math.cos(a)*.2,.58,Math.sin(a)*.2,WOOD2,g);l.rotation.z=Math.cos(a)*.18;l.rotation.x=-Math.sin(a)*.18}
 const t=C(.07,.1,1.3,8,0,1.25,0,0xb08a30,g);t.rotation.x=Math.PI/2-.5;C(.09,.09,.08,8,0,1.55,.5,0x6b5230,g).rotation.x=Math.PI/2-.5}
B(1.2,.1,.8,3.4,.05,3.9,STONE2);
for(let i=0;i<3;i++)B(.7,.1,.5,-1.4+((i*.5)%2)*.3,.03,4.6+i*.9,STONE2).rotation.y=i;
// ── interior ──
// tapete, mesa grande de cartas náuticas com mapa, compasso, régua paralela e tinteiro
B(3.4,.02,2.4,.5,.13,-.1,0x2f4a6a);B(3.0,.025,2.0,.5,.135,-.1,0x44628a);B(2.4,.03,1.5,.5,.14,-.1,0xcdb67a);
B(2.4,.1,1.2,.8,.9,-.2,WOOD);for(const x of[-.3,1.9])for(const z of[-.7,.3])B(.12,.85,.12,x+.1,.47,z,WOOD2);B(2.0,.05,.06,.8,.35,-.2,WOOD2);
B(2.0,.02,1.0,.8,.96,-.2,0xeadfb8);B(1.5,.025,.7,.75,.97,-.2,0x9ab8a0);B(.5,.026,.35,1.1,.972,-.3,0xc9b48a);
for(const q of[[.3,-.35],[.9,-.1],[1.3,-.45],[.55,.05]])B(.1,.03,.1,q[0],.98,q[1],0x2f4a6a);
B(.04,.02,.9,.6,.99,-.2,0x8a6238);{const dv=B(.03,.02,.4,1.4,.99,.05,0xb08a30);dv.rotation.y=.5;const dv2=B(.03,.02,.4,1.43,.99,.04,0xb08a30);dv2.rotation.y=.9}
C(.05,.06,.12,6,1.7,1.02,-.55,0x1a1a1f);B(.02,.3,.02,1.74,1.15,-.55,0xe8e0c8).rotation.z=.4;
C(.03,.03,.14,6,0,1.03,.2,0xe8dcb0);C(.03,.03,.14,6,0,1.03,-.5,0xe8dcb0);
// cadeiras da mesa
const chair=(x,z,r)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=r;S.add(g);B(.46,.06,.46,0,.5,0,WOOD,g);for(const a of[-.19,.19])for(const b of[-.19,.19])B(.05,.4,.05,a,.3,b,WOOD2,g);B(.46,.55,.05,0,.82,-.21,WOOD2,g)};
chair(.6,.75,Math.PI);chair(1.3,.75,Math.PI);
// globo terrestre em pedestal
{const g=new THREE.Group();g.position.set(-2.9,0,-1.9);S.add(g);C(.28,.34,.08,8,0,.04,0,WOOD2,g);C(.05,.05,.8,6,0,.5,0,WOOD2,g);
 const gl=new THREE.Mesh(new THREE.SphereGeometry(.42,12,9),M(0x3a7ab0));gl.position.y=1.15;g.add(gl);
 for(const [r,c] of[[.1,0x7a9a4a],[.3,0x7a9a4a],[.5,0x7a9a4a]]){const m=new THREE.Mesh(new THREE.SphereGeometry(.2,6,5),M(c));m.position.set(Math.cos(r*9)*.3,1.15+Math.sin(r*7)*.2,Math.sin(r*9)*.3);g.add(m)}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.02,4,16),M(0xb08a30));ring.position.y=1.15;ring.rotation.y=.5;g.add(ring)}
// escrivaninha junto à parede dos fundos, com cadeira, penas, tinteiro, velas e mapa enrolado
B(1.9,.1,.8,-1.0,.92,-2.4,WOOD);for(const x of[-1.9,-.1])for(const z of[-2.7,-2.1])B(.1,.9,.1,x,.47,z,WOOD2);B(1.7,.4,.06,-1.0,.62,-2.1,WOOD2);
B(.6,.03,.45,-1.3,.985,-2.35,0xeadfb8);C(.05,.06,.12,6,-.7,1.05,-2.3,0x1a1a1f);B(.02,.35,.02,-.66,1.2,-2.3,0xe8e0c8).rotation.z=.3;
C(.03,.03,.16,6,-1.9+.1,1.06,-2.5,0xe8dcb0);{const cf=new THREE.Mesh(new THREE.ConeGeometry(.025,.07,4),M(0xffc040,0xffa020));cf.position.set(-1.8,1.17,-2.5);S.add(cf)}
{const sc2=C(.05,.05,.7,6,-.3,1.0,-2.5,0xd8c9a0);sc2.rotation.z=Math.PI/2}
chair(-1.0,-1.6,Math.PI);
// estante de livros e rolos de mapas na parede esquerda
B(.4,2.3,2.1,-3.65,1.2,.55,WOOD2);for(const y of[.45,.95,1.45,1.95])B(.42,.05,2.1,-3.65,y,.55,WOOD);
for(let r=0;r<4;r++)for(let i=0;i<7;i++)B(.28,.32+((i*7+r)%3)*.05,.14,-3.62,.65+r*.5,-.35+i*.28,[0x6a2a22,0x2f4a6a,0x4a5a32,0x8a6238,0x5a3326][(i+r*2)%5]);
for(let i=0;i<4;i++){const rl=C(.06,.06,.5,6,-3.5,2.65,-.2+i*.15,[0xd8c9a0,0xe6dcb4][i%2]);rl.rotation.x=Math.PI/2}
// cômoda de mapas (gavetas largas) à direita
B(.8,.95,1.6,3.5,.5,.6,WOOD2);B(.9,.08,1.7,3.5,1.0,.6,WOOD);for(let i=0;i<4;i++){B(.04,.18,1.4,3.08,.2+i*.22,.6,WOOD);B(.05,.04,.14,3.07,.2+i*.22,.6,IRON)}
B(.7,.02,1.2,3.5,1.04,.6,0xcdb67a);
// esfera armilar sobre banquinho, perto da porta
{const g=new THREE.Group();g.position.set(-3.0,0,2.1);S.add(g);for(const x of[-.2,.2])for(const z of[-.2,.2])B(.05,.55,.05,x,.28,z,WOOD2,g);B(.55,.05,.55,0,.57,0,WOOD,g);
 C(.04,.04,.3,6,0,.74,0,0xb08a30,g);for(const [rx,ry] of[[0,0],[Math.PI/2,0],[.6,1.1]]){const rg=new THREE.Mesh(new THREE.TorusGeometry(.26,.015,4,18),M(0xb08a30));rg.position.y=.95;rg.rotation.set(rx,ry,0);g.add(rg)}
 const bl=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),M(0x3a7ab0));bl.position.y=.95;g.add(bl)}
// quadrante de Hadley (oitante) e mapas emoldurados na parede dos fundos / direita
B(.6,.5,.05,1.8,1.9,-2.82,TM);B(.5,.4,.06,1.8,1.9,-2.81,0xdcd0a0);B(.38,.1,.07,1.8,1.9,-2.8,0x7a9a8a);
B(.7,.9,.05,3.0,1.8,-2.82,TM);B(.6,.8,.06,3.0,1.8,-2.81,0xe6dcb4);B(.4,.35,.07,3.0,1.85,-2.8,0x7aa0b8);B(.12,.12,.07,3.1,2.05,-2.8,0xa83a2a);
{const q=new THREE.Mesh(new THREE.CircleGeometry(.3,3,0,1.2),M(0xb08a30));q.position.set(.6,2.0,-2.78);S.add(q);const q2=new THREE.Mesh(new THREE.TorusGeometry(.3,.015,4,8,1.2),M(0x6b5230));q2.position.set(.6,2.0,-2.76);S.add(q2)}
B(.7,.9,.05,-3.94,1.8,-1.4,TM);B(.6,.8,.06,-3.93,1.8,-1.4,0xe6dcb4);
// cama no canto
{const ox=2.9,oz=-2.1;for(const x of[1.95,3.85])for(const z of[-2.6,-1.6])B(.12,.5,.12,x,.35,z,TM);
 B(2.0,.12,1.05,ox,.5,oz,WOOD2);B(1.95,.2,1.0,ox,.62,oz,0xd6c394);B(1.4,.1,1.02,ox+.2,.75,oz,0x2f4a6a);B(.4,.12,.7,2.25,.78,oz,0xf0ead8);B(.1,1.1,1.1,1.9,.85,oz,WOOD2)}
// barril de rolos de mapas e lanterna
C(.22,.26,.7,8,3.4,.4,2.2,WOOD);for(let i=0;i<5;i++){const rl=C(.045,.045,.9,6,3.3+(i%3)*.1,1.0,2.1+((i*1.3)%1)*.2,[0xd8c9a0,0xe6dcb4,0xc9b48a][i%3]);rl.rotation.z=.25-i*.1}
B(.02,.5,.02,0,2.65,0,IRON);B(.2,.3,.2,0,2.25,0,0xffd890,S,0xffb040);B(.28,.05,.28,0,2.43,0,IRON);
// luneta de bronze junto à janela da frente
{const g=new THREE.Group();g.position.set(1.8,0,2.2);S.add(g);for(const a of[0,2.1,4.2]){const l=B(.04,1.1,.04,Math.cos(a)*.18,.52,Math.sin(a)*.18,WOOD2,g);l.rotation.z=Math.cos(a)*.17;l.rotation.x=-Math.sin(a)*.17}
 const t=C(.06,.09,1.1,8,0,1.15,.1,0xb08a30,g);t.rotation.x=Math.PI/2-.15}
// ervas/âncoras penduradas: lampiões de teto
for(const q of[[-1.75,1.3],[1.75,-1.3],[-3.5,.5]]){B(.01,.25,.01,q[0],2.7,q[1],0x999999);B(.1,.14,.1,q[0],2.5,q[1],0xffd890,S,0xffb040)}

  const K = CARTOG_SC;
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; if (dr) o.dr = dr; props.push(o); };
  for (let u = -4; u <= 4.01; u += .9) { if (u < -2.45 || u > -.35) block(u * K, 3.1 * K, .45); block(u * K, -3.1 * K, .45); }
  for (let v = -2.2; v <= 2.21; v += .9) { block(-4 * K, v * K, .45); block(4 * K, v * K, .45); }
  // mobília (raios pequenos para o corredor da porta até a mesa continuar livre)
  [[.2, -.2, .55], [1.4, -.2, .55], [-1.5, -2.4, .5], [-.5, -2.4, .5], [-2.9, -1.9, .45], [-3.5, 0, .5], [-3.5, 1.1, .5], [3.4, .1, .5], [3.4, 1.1, .5],
   [2.4, -2.2, .55], [3.3, -2.2, .55], [-3.0, 2.1, .4], [3.4, 2.2, .4], [1.8, 2.3, .35]]
    .forEach(([fx, fz, r]) => block(fx * K, fz * K, r));
  const pts = { ay: Math.PI, door: [-1.4 * K, 3.4 * K], talkAt: at(-.8 * K, 1.8 * K), doorId: 'cartog-front' };
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(d => d.p)); bakeGroup(roof);
  DR.forEach(d => { const dd = addDoor(d, { x, z, th, K }); [-2.2, -1.5, -.8, -.1].forEach(lx => block(lx * K, 3.1 * K, .45, dd)); });
  // cama: o dorminhoco deita de costas, cabeça no travesseiro
  { const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, .7, 2.0), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(2.9, .8, -2.1); hit.rotation.y = Math.PI / 2; hit.userData.dyn = 1; S.add(hit);
    const bf = at(3.7 * K, -2.1 * K), ba = at(3.0 * K, -1.0 * K);
    addBed({ x: bf[0], z: bf[1], y: 0.8 * K + .18, ry: th + (Math.PI / 2), ax: ba[0], az: ba[1], hit }); }
  refreshProps();
  registerFloors({ x, z, th, K, hx: 4.2, hz: 3.2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: 3 }, { g: wB, nx: 0, nz: -1, D: 3 }, { g: wL, nx: -1, nz: 0, D: 4 }, { g: wR, nx: 1, nz: 0, D: 4 }], noStair: true });
  return { g: root, th, at, pts, front: at(.2 * K, 1.2 * K) };
}
