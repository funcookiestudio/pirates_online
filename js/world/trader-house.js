/* Casa-loja da Capitã Sal, mercadora (c. 1720–1750): reboco ocre com enxaimel, venezianas vermelhas, toldo listrado sobre a janela-balcão, prateleiras, balança, caixotes, barris e sacas. */
import { scene } from '../core/engine.js';
import { regLight } from './house-lights.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps, HOUSES } from './floors.js';
import { addDoor } from './doors.js';
import { shellRects } from './imap.js';

export const TRADER_SC = 1.28;

export function buildTraderHouse(x, z, a) {
  regLight(1, x, z);
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  const root = new THREE.Group();
  root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); S.scale.setScalar(TRADER_SC); root.add(S);
  const DR = [];
const PL=0xe8cf9f,STONE=0x7b786f,STONE2=0x66635c,TM=0x4a3320,DOOR=0x6b4a2b,DOOR2=0x5c3f24,IRON=0x2b2b30,WOOD=0x8a6238,WOOD2=0x6e4d2c,SH=0x7a2e22;
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
 tr(W(ax,f,c,y,w,h,.03,0xbfe0f1,g),.4);
 for(const k of[-1,1]){W(ax,f,c+k*(w/2+.04),y,.1,h,T+.1,TM,g);
  const uc=c+k*(w/2+w/4+.16);W(ax,f+s*.2,uc,y,w/2,h,.06,SH,g);
  W(ax,f+s*.24,uc,y+h*.3,w/2,.07,.04,TM,g);W(ax,f+s*.24,uc,y-h*.3,w/2,.07,.04,TM,g);
  for(let i=-2;i<=2;i++)W(ax,f+s*.235,uc+i*w/10,y,.02,h-.1,.02,0x2c4234,g)}
}
function door(c,w,h,g){
 W('x',3,c-w/2-.09,h/2,.18,h+.1,T+.14,TM,g);W('x',3,c+w/2+.09,h/2,.18,h+.1,T+.14,TM,g);W('x',3,c,h+.1,w+.5,.22,T+.14,TM,g);
 const p=new THREE.Group();p.position.set(c-w/2,0,2.98);p.rotation.y=0;g.add(p);DR.push({p,g,openRot:1.05,c,f:3,w,lvl:0,id:'trader-front'});
 for(let i=0;i<5;i++)B(w/5-.012,h-.06+Math.random()*.04,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);
 B(w,.12,.09,w/2,.45,.01,IRON,p);B(w,.12,.09,w/2,h-.45,.01,IRON,p);B(w,.06,.09,w/2,h/2,.01,TM,p);
 B(.2,.09,.1,.1,.45,.02,IRON,p);B(.2,.09,.1,.1,h-.45,.02,IRON,p);
 const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.016,4,8),M(IRON));r.position.set(w-.15,1.0,.07);p.add(r);

}
XR=true;wall('x',3,-4,4,[{c:-1.4,w:1.2,y0:0,y1:2.2},{c:1.8,w:1.5,y0:1,y1:2.1}],front);
door(-1.4,1.2,2.2,front);win('x',3,1.8,1.5,1,2.1,front);
wall('x',-3,-4,4,[{c:-.6,w:1.1,y0:1,y1:2.1}],wB);win('x',-3,-.6,1.1,1,2.1,wB);
wall('z',-4,-3,3,[{c:-.6,w:1.2,y0:1,y1:2.1}],wL);win('z',-4,-.6,1.2,1,2.1,wL);
wall('z',4,-3,3,[{c:.6,w:1.2,y0:1,y1:2.1}],wR);win('z',4,.6,1.2,1,2.1,wR);
B(1.9,.2,.9,-1.4,.12,3.55,STONE);B(1.4,.12,.5,-1.4,.06,4.2,STONE2);
// telhado
const L=Math.hypot(3.6,2.2),A=Math.atan2(2.2,3.6),RT=H+2.2,sc=[0x8a3a2a,0x9a4632,0x7a3224,0xa4503a];
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
// toldo listrado sobre a janela-balcão
for(let i=0;i<6;i++){const m=B(.5,.06,1.0,1.8-1.25+i*.5,2.62,3.55,i%2?0xf0e6cc:0xb83a2a);m.rotation.x=.38}
B(.08,1.2,.08,.6,2.1,3.95,TM);B(.08,1.2,.08,3.0,2.1,3.95,TM);
// sinal: balança de mercador pendurada
B(.1,.1,1,-2.5,2.7,3.55,IRON);{const g=new THREE.Group();g.position.set(-2.5,2.25,3.95);S.add(g);B(.9,.04,.05,0,.35,0,IRON,g);B(.04,.7,.05,0,0,0,IRON,g);
 for(const x of[-.4,.4]){B(.01,.35,.01,x,.15,0,0x999999,g);C(.17,.12,.05,8,x,-.05,0,0xb08a30,g)}}
XR=false;
// diante da loja: caixotes, barris, sacas e carrinho de mão
const crate=(x,y,z,s,r)=>{const m=B(s,s,s,x,y,z,0x9a7444);m.rotation.y=r||0;B(s+.02,.05,s+.02,x,y+s*.3,z,WOOD2).rotation.y=r||0;B(s+.02,.05,s+.02,x,y-s*.3,z,WOOD2).rotation.y=r||0};
crate(3.0,.4,4.2,.8,.2);crate(3.5,.4,4.9,.7,-.3);crate(3.15,1.15,4.3,.65,.6);
{const bx=2.2,bz=5;C(.34,.42,.7,10,bx,.36,bz,WOOD);for(const y of[.15,.55]){const q=C(.43,.43,.05,10,bx,y,bz,IRON);q.scale.set(1.02,1,1.02)}}
for(const [x,z,r] of[[3.9,4.1,.3],[3.8,3.6,-.4]]){const sk=new THREE.Mesh(new THREE.SphereGeometry(.35,7,5),M(0xcdb88a));sk.scale.set(1,.8,.7);sk.position.set(x,.3,z);sk.rotation.y=r;S.add(sk)}
{const g=new THREE.Group();g.position.set(-3.3,0,4.7);g.rotation.y=.4;S.add(g);B(1.2,.1,.8,0,.65,0,WOOD,g);B(1.2,.3,.06,0,.82,.37,WOOD2,g);B(1.2,.3,.06,0,.82,-.37,WOOD2,g);
 const w=C(.4,.4,.08,12,0,.4,.5,WOOD2,g);w.rotation.x=Math.PI/2;const w2=C(.4,.4,.08,12,0,.4,-.5,WOOD2,g);w2.rotation.x=Math.PI/2;B(.06,.06,1.2,-.9,.9,0,WOOD2,g).rotation.y=Math.PI/2;
 for(let i=0;i<4;i++)B(.3,.2,.3,-.4+i*.28,.85,0,[0x9a7444,0xd4b04a,0xc9b48a,0x8a5030][i],g)}
// ── interior ──
B(3,.02,2.2,-1.2,.13,0,0x7a2e22);B(2.6,.025,1.8,-1.2,.135,0,0xa4503a);
// balcão comprido com tampo, balança, moedas, livro-caixa e tinteiro
B(3.6,1.0,.8,1.6,.55,-.5,WOOD2);B(3.8,.1,1.0,1.6,1.08,-.5,WOOD);B(3.6,.06,.1,1.6,.6,-.05,TM);
{const g=new THREE.Group();g.position.set(.7,1.13,-.5);S.add(g);B(.1,.05,.3,0,0,0,IRON,g);B(.04,.5,.04,0,.25,0,IRON,g);B(.7,.03,.04,0,.5,0,IRON,g);
 for(const x of[-.33,.33]){B(.01,.2,.01,x,.4,0,0x999999,g);C(.12,.09,.03,8,x,.28,0,0xb08a30,g)}C(.04,.04,.12,6,.33,.33,0,0xd4a830,g)}
for(let i=0;i<4;i++)C(.06,.06,.04+i*.03,8,2.1+i*.15,1.16+i*.02,-.6,0xd4a830);
B(.45,.04,.3,2.9,1.15,-.45,0xeadfb8);C(.03,.03,.1,6,3.15,1.18,-.6,0x1a1a1f);B(.25,.12,.2,1.5,1.19,-.45,0x5a3a1a);
// cofre-forte com cadeado atrás do balcão
B(.9,.6,.6,3.2,.35,-2.1,0x4a4a52);B(.92,.1,.62,3.2,.68,-2.1,IRON);B(.1,.14,.04,3.2,.45,-1.78,0xd4a830);B(.06,.65,.62,2.76,.35,-2.1,IRON);B(.06,.65,.62,3.64,.35,-2.1,IRON);
// prateleiras no fundo: potes, garrafas, rolos de tecido e especiarias
for(const y of[.9,1.5,2.1]){B(7.2,.06,.4,0,y,-2.78,WOOD2)}
for(let i=0;i<11;i++){const x=-3.3+i*.66;C(.1,.12,.3,7,x,1.07,-2.78,[0xa0623a,0x8a5030,0xc9b48a][i%3]);
 C(.05,.07,.35,6,x+.2,1.7,-2.78,[0x2f6a3a,0x6a2a2a,0x3a4a7a][i%3]);
 const b=C(.14,.14,.4,8,x,2.32,-2.78,[0xb83a2a,0x2f5a8a,0xd8c9a0,0x4a7a3a][i%4]);b.rotation.z=Math.PI/2}
// barris e sacas à esquerda; caixotes empilhados
for(const [x,z] of[[-3.3,-1.9],[-2.5,-2.3]]){C(.38,.45,.45,10,x,.35,z,WOOD);C(.45,.38,.45,10,x,.75,z,WOOD);for(const y of[.25,.55,.85]){const q=C(.46,.46,.05,10,x,y,z,IRON);q.scale.set(1.02,1,1.02)}}
for(const [x,z] of[[-3.4,.3],[-3.3,1.2]]){B(.7,.6,.7,x,.4,z,0x9a7444);B(.5,.5,.6,x,.95,z,0x8a6238)}
{const sk=new THREE.Mesh(new THREE.SphereGeometry(.38,7,5),M(0xcdb88a));sk.scale.set(1,.9,.75);sk.position.set(-2.6,.35,.4);S.add(sk)}
// cordas e ferragens penduradas na parede lateral, balança de pratos pequena e lampiões
for(let i=0;i<3;i++){const rp=new THREE.Mesh(new THREE.TorusGeometry(.22,.06,5,10),M(0xb89a5a));rp.position.set(-3.85,1.6+i*.0,-1.4+i*.5);rp.rotation.y=Math.PI/2;S.add(rp)}
for(const q of[[-1.75,1.3],[1.75,-1.3],[-3.5,.5]]){B(.01,.25,.01,q[0],2.7,q[1],0x999999);B(.1,.14,.1,q[0],2.5,q[1],0xffd890,S,0xffb040)}
B(.02,.5,.02,0,2.65,0,IRON);B(.2,.3,.2,0,2.25,0,0xffd890,S,0xffb040);B(.28,.05,.28,0,2.43,0,IRON);
for(let i=0;i<5;i++){B(.06,.5,.06,-.4+i*.25,2.4,2.0,[0xb83a2a,0xd4a830,0x4a7a3a][i%3])}   // fieiras de pimenta penduradas
// mapa das rotas comerciais na parede da direita
B(.05,.9,1.3,3.93,1.8,-.1,TM);B(.06,.8,1.2,3.92,1.8,-.1,0xe6dcb4);B(.07,.4,.7,3.9,1.8,-.1,0x7aa0b8);

  const K = TRADER_SC;
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; o.map = true; if (dr) o.dr = dr; props.push(o); };
  for (let u = -4; u <= 4.01; u += .9) { if (u < -2.45 || u > -.35) block(u * K, 3.1 * K, .45); block(u * K, -3.1 * K, .45); }
  for (let v = -2.2; v <= 2.21; v += .9) { block(-4 * K, v * K, .45); block(4 * K, v * K, .45); }
  // mobília: o balcão fecha o lado direito (a Capitã fica atrás); a esquerda fica livre
  const FURN = [[0, -.5, .55], [.9, -.5, .55], [1.8, -.5, .55], [2.7, -.5, .55], [3.4, -.5, .5], [3.2, -2.1, .5], [-3.3, -1.9, .45], [-2.5, -2.3, .45], [-3.4, .3, .5], [-3.3, 1.2, .5],
   [3.0, 4.2, .6], [3.6, 4.9, .5], [2.2, 5.0, .45], [-3.3, 4.7, .7]];
  FURN.forEach(([fx, fz, r]) => block(fx * K, fz * K, r));
  const pts = { ay: 0, door: [-1.4 * K, 3.4 * K], talkAt: at(1.4 * K, 1.0 * K), doorId: 'trader-front' };
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(d => d.p)); bakeGroup(roof);
  let FD; DR.forEach(d => { const dd = addDoor(d, { x, z, th, K }); FD = dd; [-2.2, -1.5, -.8, -.1].forEach(lx => block(lx * K, 3.1 * K, .45, dd)); });
  refreshProps();
  registerFloors({ x, z, th, K, hx: 4.2, hz: 3.2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: 3 }, { g: wB, nx: 0, nz: -1, D: 3 }, { g: wL, nx: -1, nz: 0, D: 4 }, { g: wR, nx: 1, nz: 0, D: 4 }], noStair: true });
  shellRects(HOUSES[HOUSES.length - 1], [-1.4,1.2], FD, FURN.slice(5), [[-.3,-1,3.5,0]]);
  return { g: root, th, at, pts, front: at(1.2 * K, -1.55 * K) };
}
