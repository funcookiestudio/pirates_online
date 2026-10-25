/* Taberna do Javali Dourado (c. 1740): térreo de pedra com balcão, lareira, mesas e escada; andar de cima de enxaimel com quartos.
   Portada do modelo do Cristiano. Casa da Madame Rum. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';

export const TAVERN_SC = 1.15;

export function buildTavernHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  const root = new THREE.Group();
  root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); S.scale.setScalar(TAVERN_SC); root.add(S);
  let XR = false;
  const MC = {};
  function M(c, e) { const k = c + '_' + (e || 0) + (XR ? 'x' : ''); if (MC[k]) return MC[k]; const m = new THREE.MeshLambertMaterial({ color: c, emissive: e || 0 }); return MC[k] = XR ? xray(m) : m; }
const PL=0xe6d9b6,STONE=0x7b786f,STONE2=0x66635c,TM=0x4a3320,DOOR=0x6b4a2b,DOOR2=0x5c3f24,IRON=0x2b2b30,WOOD=0x8a6238,WOOD2=0x6e4d2c,SH=0x7a2e2e;
function B(w,h,d,x,y,z,c,p,e){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,e));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(p||S).add(m);return m}
function C(rt,rb,h,n,x,y,z,c,p,e){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),M(c,e));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(p||S).add(m);return m}
function W(ax,f,u,y,l,h,t,c,g){return ax=='x'?B(l,h,t,u,y,f,c,g):B(t,h,l,f,y,u,c,g)}
function tr(m,o){m.material=m.material.clone();m.material.transparent=true;m.material.opacity=o;return m}
const front=new THREE.Group(),walls=new THREE.Group(),up=new THREE.Group(),roof=new THREE.Group();S.add(front,walls,up,roof);
const T=.3,sc2=[0x7b786f,0x6a675f,0x8a867b,0x73706a,0x5f5c56];
B(10.8,.4,7.8,0,-.1,0,STONE2);B(9.7,.1,6.7,0,.06,0,0x5a4430);
for(let i=0;i<10;i++)B(.96,.03,6.7,-4.5+i,.115,0,i%2?0x6b5238:0x7a5e40);
function wall(ax,f,a0,a1,ops,g,yb,h,stone){
 ops.sort((a,b)=>a.c-b.c);let cur=a0,k=0;
 const seg=(u0,u1,y0,y1)=>{const l=u1-u0,hh=y1-y0;if(l<.02||hh<.02)return;
  if(stone){W(ax,f,(u0+u1)/2,(y0+y1)/2,l,hh,T-.06,0x4a4640,g);
   for(let y=y0;y<y1-.01;y+=.4){const bh=Math.min(.38,y1-y-.02);let u=u0;while(u<u1-.01){const bl=Math.min(.7+Math.random()*.6,u1-u);W(ax,f,u+bl/2,y+bh/2+.01,bl-.03,bh,T+.06,sc2[(Math.random()*5)|0],g);u+=bl}}}
  else{W(ax,f,(u0+u1)/2,(y0+y1)/2,l,hh,T,PL,g);
   if(y0===yb&&y1===yb+h&&l>1.2){const dh=h-.5,len=Math.hypot(l,dh),s=(k++%2)?1:-1,m=W(ax,f,(u0+u1)/2,yb+.35+dh/2,len,.12,T+.1,TM,g);
    if(ax=='x')m.rotation.z=s*Math.atan2(dh,l);else m.rotation.x=-s*Math.atan2(dh,l)}}};
 for(const o of ops){const l0=o.c-o.w/2,l1=o.c+o.w/2;seg(cur,l0,yb,yb+h);seg(l0,l1,o.y1,yb+h);seg(l0,l1,yb,o.y0);
  if(!stone){W(ax,f,l0,yb+h/2,.16,h,T+.1,TM,g);W(ax,f,l1,yb+h/2,.16,h,T+.1,TM,g)}cur=l1}
 seg(cur,a1,yb,yb+h);
 W(ax,f,(a0+a1)/2,yb+h-.1,a1-a0,.2,T+.14,TM,g);if(!stone)W(ax,f,(a0+a1)/2,yb+.1,a1-a0,.2,T+.12,TM,g);
 W(ax,f,a0,yb+h/2,.26,h,T+.18,TM,g);W(ax,f,a1,yb+h/2,.26,h,T+.18,TM,g);
}
function win(ax,f,c,w,y0,y1,g){const h=y1-y0,y=(y0+y1)/2,s=Math.sign(f);
 W(ax,f,c,y1+.07,w+.3,.14,T+.14,TM,g);W(ax,f,c,y0-.05,w+.4,.1,T+.28,STONE,g);
 W(ax,f,c,y,w,.06,T+.06,TM,g);W(ax,f,c,y,.06,h,T+.06,TM,g);
 tr(W(ax,f,c,y,w,h,.03,0xbfe0f0,g),.4);
 for(const k of[-1,1]){W(ax,f,c+k*(w/2+.04),y,.1,h,T+.1,TM,g);
  const uc=c+k*(w/2+w/4+.16);W(ax,f+s*.2,uc,y,w/2,h,.06,SH,g);
  W(ax,f+s*.24,uc,y+h*.3,w/2,.07,.04,TM,g);W(ax,f+s*.24,uc,y-h*.3,w/2,.07,.04,TM,g);
  for(let i=-2;i<=2;i++)W(ax,f+s*.235,uc+i*w/10,y,.02,h-.1,.02,0x5a2222,g)}
}
function door(f,c,w,h,g,ang){const s=Math.sign(f);
 W('x',f,c-w/2-.09,h/2,.18,h+.1,T+.14,TM,g);W('x',f,c+w/2+.09,h/2,.18,h+.1,T+.14,TM,g);W('x',f,c,h+.1,w+.5,.22,T+.14,TM,g);
 const p=new THREE.Group();p.position.set(c-w/2,0,f-s*.02);p.rotation.y=s*ang;g.add(p);
 for(let i=0;i<5;i++)B(w/5-.012,h-.06+Math.random()*.04,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);
 B(w,.12,.09,w/2,.45,.01,IRON,p);B(w,.12,.09,w/2,h-.45,.01,IRON,p);B(w,.06,.09,w/2,h/2,.01,TM,p);
 const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.016,4,8),M(IRON));r.position.set(w-.15,1.0,.07);p.add(r);
}
XR=true;
// paredes do térreo (pedra) e do andar de cima (enxaimel)
wall('x',3.5,-5,5,[{c:0,w:1.4,y0:.12,y1:2.3},{c:-3.2,w:1.2,y0:1,y1:2.1},{c:3.4,w:1.2,y0:1,y1:2.1}],front,.12,2.9,true);
door(3.5,0,1.4,2.3,front,1.0);win('x',3.5,-3.2,1.2,1,2.1,front);win('x',3.5,3.4,1.2,1,2.1,front);
wall('x',-3.5,-5,5,[{c:1.5,w:1.2,y0:1,y1:2.1},{c:3.8,w:1.2,y0:.12,y1:2.2}],walls,.12,2.9,true);win('x',-3.5,1.5,1.2,1,2.1,walls);door(-3.5,3.8,1.2,2.2,walls,.5);
wall('z',-5,-3.5,3.5,[{c:-2.2,w:1.2,y0:1,y1:2.1}],walls,.12,2.9,true);win('z',-5,-2.2,1.2,1,2.1,walls);
wall('z',5,-3.5,3.5,[{c:1.5,w:1.2,y0:1,y1:2.1}],walls,.12,2.9,true);win('z',5,1.5,1.2,1,2.1,walls);
const uf=new THREE.Group();front.add(uf);
wall('x',3.9,-5,5,[{c:-3,w:1.1,y0:3.8,y1:4.8},{c:0,w:1.1,y0:3.8,y1:4.8},{c:3,w:1.1,y0:3.8,y1:4.8}],uf,3.15,2.45,false);
for(const c of[-3,0,3])win('x',3.9,c,1.1,3.8,4.8,uf);
wall('x',-3.9,-5,5,[{c:-3,w:1.1,y0:3.8,y1:4.8},{c:0,w:1.1,y0:3.8,y1:4.8},{c:3,w:1.1,y0:3.8,y1:4.8}],up,3.15,2.45,false);
for(const c of[-3,0,3])win('x',-3.9,c,1.1,3.8,4.8,up);
wall('z',-5,-3.9,3.9,[{c:0,w:1.1,y0:3.8,y1:4.8}],up,3.15,2.45,false);win('z',-5,0,1.1,3.8,4.8,up);
wall('z',5,-3.9,3.9,[{c:0,w:1.1,y0:3.8,y1:4.8}],up,3.15,2.45,false);win('z',5,0,1.1,3.8,4.8,up);
// piso do andar de cima, com abertura da escada
B(9,.2,7.8,.55,3.05,0,WOOD2,up);B(1.2,.2,3,-4.5,3.05,-2.4,WOOD2,up);B(1.2,.2,1.2,-4.5,3.05,3.3,WOOD2,up);
for(let x=-4.5;x<=4.6;x+=1.5)B(.22,.26,8.1,x,2.9,0,TM,up);
for(let x=-4.5;x<=4.5;x+=1.5)B(.2,.25,.8,x,2.9,3.6,TM,up);
for(let i=0;i<10;i++)B(.9,.3*(i+1),.3,-4.55,.125+.15*(i+1),2.55-i*.3,i%2?WOOD:WOOD2);
B(.06,.9,3.6,-3.95,3.6,.9,TM,up);for(const z of[-.9,.9,2.7])B(.1,1,.1,-3.95,3.65,z,TM,up);
// telhado
const L=Math.hypot(4.4,2.4),A=Math.atan2(2.4,4.4),RT=5.6+2.4,sc=[0x6a3e2e,0x7a4a38,0x5a3326,0x84523c];
for(const s of[1,-1]){const g=new THREE.Group();g.position.set(0,RT,0);g.rotation.x=s*A;roof.add(g);
 B(11.2,.12,L,0,-.12,s*L/2,0x3a281a,g);for(const x of[-4.5,-3,-1.5,0,1.5,3,4.5])B(.15,.15,L,x,-.24,s*L/2,TM,g);
 const l=L/10;for(let i=0;i<10;i++)for(let j=0;j<11;j++)B(.98,.09,l*1.3,-5+j,.02*((i+j)%2),s*(i+.5)*l,sc[(Math.random()*4)|0],g)}
B(11.4,.16,.55,0,RT+.07,0,0x2e2118,roof);B(11,.2,.2,0,RT-.1,0,TM,roof);
for(const x of[-4.5,-3,-1.5,0,1.5,3,4.5])B(.18,.18,7.8,x,5.5,0,TM,roof);
for(const x0 of[4.85,-5.15]){const sh=new THREE.Shape();sh.moveTo(-3.9,0);sh.lineTo(3.9,0);sh.lineTo(0,2.4);
 const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:T,bevelEnabled:false}),M(PL));m.rotation.y=Math.PI/2;m.position.set(x0,5.6,0);m.castShadow=true;roof.add(m);
 B(T+.1,2.4,.14,x0+T/2,6.8,0,TM,roof);B(T+.1,.14,7.8,x0+T/2,5.65,0,TM,roof)}
// lucarna
{const d=new THREE.Group();d.position.set(0,6.1,2.1);roof.add(d);B(1.6,1.3,1.2,0,.3,-.2,PL,d);B(1.9,.15,1.9,0,1.05,0,0x5a3326,d).rotation.x=0;
 for(const s of[-1,1]){const r=B(1.1,.1,1.6,s*.55,1.05+.25,0,0x6a3e2e,d);r.rotation.z=-s*.5}win('x',.4,0,.8,.1,1,d)}
XR=false;
// lareira (parede direita) e chaminé externa
B(.7,2.1,.4,4.5,1.15,-2.0,STONE);B(.7,2.1,.4,4.5,1.15,-.4,STONE);B(.7,.45,1.6,4.5,2.25,-1.2,STONE);B(.85,.1,1.9,4.45,2.55,-1.2,TM);
B(.04,2.0,.8,4.82,1.1,-1.2,0x1b1512);B(1,.1,1.8,4.4,.18,-1.2,STONE2);B(1.8,.02,1.8,3.4,.14,-1.2,0x8a3b2e);
B(.9,8.5,1.2,5.6,4.35,-1.2,STONE);B(1.1,.15,1.4,5.6,8.7,-1.2,STONE2);
const coals=[],fl=[];
for(let i=0;i<5;i++)coals.push(B(.2,.1,.2,4.55,.28,-1.6+i*.2,0x8a2a08,S,0xff4a10));
for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,4),M(0xff8a1a,0xff6a00));f.position.set(4.55,.6,-1.5+i*.3);S.add(f);fl.push(f)}

// balcão, barris, prateleiras
B(3.6,1.05,.7,-2.6,.65,-1.5,WOOD2);B(3.8,.1,.9,-2.6,1.2,-1.5,WOOD);B(.7,1.05,2.2,-4.35,.65,-2.55,WOOD2);B(.9,.1,2.4,-4.35,1.2,-2.55,WOOD);
for(let i=0;i<4;i++)B(.04,.9,.02,-4.1+i*.9,.65,-1.14,TM);
for(const x of[-3.7,-2.6,-1.5]){const c=C(.45,.45,.9,10,x,.6,-2.75,WOOD);c.rotation.x=Math.PI/2;for(const dz of[-.2,.2]){const q=C(.46,.46,.06,10,x,.6,-2.75+dz,IRON);q.rotation.x=Math.PI/2}
 const t=C(.03,.03,.18,5,x,.5,-2.25,0xc9a85a);t.rotation.x=Math.PI/2}
B(3.4,.06,.35,-2.6,1.9,-3.3,WOOD2);B(3.4,.06,.35,-2.6,2.5,-3.3,WOOD2);
for(let i=0;i<8;i++){C(.05,.05,.3,6,-4+i*.4,2.08,-3.3,[0x2e6b3a,0x6b2a2a,0x3a4a7a][i%3]);C(.06,.05,.1,6,-3.9+i*.4,2.58,-3.3,0xb8b0a0)}
for(let i=0;i<5;i++)C(.07,.06,.12,6,-3.6+i*.7,1.31,-1.5,0xb8b0a0);
for(let i=0;i<5;i++)C(.22,.2,.45,6,-4.1+i*.8,.35,-.7,WOOD2);
// mesas e bancos
function tbl(x,z,w,d){B(w,.08,d,x,.85,z,WOOD);for(const a of[-1,1])for(const b of[-1,1])B(.1,.8,.1,x+a*(w/2-.1),.45,z+b*(d/2-.1),WOOD2);
 C(.06,.05,.1,6,x-.2,.94,z,0xb8b0a0);C(.03,.03,.14,6,x+.2,.95,z,0xe8dcb0);B(.3,.08,.14,x,.93,z+.2,0xd2a45a)}
function bnc(x,z,w){B(w,.08,.35,x,.5,z,WOOD);for(const a of[-1,1])B(.08,.4,.3,x+a*(w/2-.1),.3,z,WOOD2)}
tbl(.9,.4,2,.9);bnc(.9,-.3,2);bnc(.9,1.1,2);tbl(2.6,2.2,1.8,.9);bnc(2.6,1.55,1.8);bnc(2.6,2.85,1.8);tbl(-2.3,1.6,1.4,.9);bnc(-2.3,.95,1.4);bnc(-2.3,2.25,1.4);
B(2,.02,1.4,-2.3,.14,1.6,0x2a4a5a);
// lustre de roda de carroça
{const ch=new THREE.Mesh(new THREE.TorusGeometry(.6,.05,4,12),M(TM));ch.rotation.x=Math.PI/2;ch.position.set(0,2.45,.4);S.add(ch);
 for(const a of[0,1,2,3,4,5]){const x=Math.cos(a*1.047)*.6,z=Math.sin(a*1.047)*.6;C(.03,.03,.14,6,x,2.55,.4+z,0xe8dcb0);const f=new THREE.Mesh(new THREE.ConeGeometry(.03,.08,4),M(0xffc040,0xffa020));f.position.set(x,2.66,.4+z);S.add(f)}
 B(.02,.4,.02,0,2.7,.4,IRON);}
for(const q of[[-3,2],[3,-.5],[-1.5,-1],[0,2.5]]){B(.01,.25,.01,q[0],2.7,q[1],0x999999);C(.1,0,.4,5,q[0],2.45,q[1],0x6a8f3a);C(.08,0,.3,5,q[0]+.15,2.5,q[1],0xb8a040)}
XR=true;
// andar de cima: camas, partições, mesa
for(const bx of[-4.2,-1.07,2.5]){const z0=-2.75;
 B(1.2,.15,2.2,bx,3.6,z0,WOOD2,up);B(1.1,.2,2.1,bx,3.78,z0,0xd6c394,up);B(1.1,.1,1.4,bx,3.93,z0+.35,[0x7a2e2e,0x2e4a7a,0x3a6b3a][bx<-3?0:bx<0?1:2],up);B(.8,.12,.4,bx,3.95,z0-.8,0xf0ead8,up);
 B(1.3,1.1,.1,bx,4.0,-3.8,WOOD2,up);B(1.2,.5,.08,bx,3.65,-1.62,WOOD2,up);const cx=bx+(bx<-1?1.05:bx>1?1.0:1.15);B(.8,.45,.5,cx,3.38,-3.3,WOOD2,up);B(.82,.1,.52,cx,3.66,-3.3,WOOD,up);
 for(const a of[-.5,.5])for(const b of[-1,1])B(.08,.45,.08,bx+a,3.375,z0+b,WOOD2,up);
 }
// divisórias entre os quartos, parede do corredor e portas
for(const x of[-1.8,1.8]){B(.15,2.45,2.55,x,4.375,-2.475,PL,up);for(const z of[-3.7,-1.25])B(.2,2.45,.2,x,4.375,z,TM,up);B(.2,.2,2.55,x,5.5,-2.475,TM,up);B(.2,.2,2.55,x,3.25,-2.475,TM,up)}
wall('x',-1.2,-5,5,[{c:-3,w:1,y0:3.15,y1:5.2},{c:0,w:1,y0:3.15,y1:5.2},{c:3.4,w:1,y0:3.15,y1:5.2}],up,3.15,2.45,false);
const d2=c=>{const w=1,h=2.05,yb=3.15;W('x',-1.2,c-w/2-.09,yb+h/2,.16,h+.1,T+.1,TM,up);W('x',-1.2,c+w/2+.09,yb+h/2,.16,h+.1,T+.1,TM,up);
 const p=new THREE.Group();p.position.set(c-w/2,yb,-1.18);p.rotation.y=-.9;up.add(p);
 for(let i=0;i<5;i++)B(w/5-.012,h-.06,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);B(w,.1,.09,w/2,.4,.01,IRON,p);B(w,.1,.09,w/2,h-.4,.01,IRON,p);
 B(.22,.22,.04,w/2,h-.3,.06,0xc9a85a,p);const r=new THREE.Mesh(new THREE.TorusGeometry(.06,.014,4,8),M(IRON));r.position.set(w-.15,1.0,.07);p.add(r)};
d2(-3);d2(0);d2(3.4);
// quartos da frente (da direita para a esquerda), com corredor entre eles e os quartos dos fundos
wall('x',.6,-1.8,5,[{c:3,w:1,y0:3.15,y1:5.2},{c:-.4,w:1,y0:3.15,y1:5.2}],up,3.15,2.45,false);
for(const c of[3,-.4]){const w=1,h=2.05,yb=3.15;W('x',.6,c-w/2-.09,yb+h/2,.16,h+.1,T+.1,TM,up);W('x',.6,c+w/2+.09,yb+h/2,.16,h+.1,T+.1,TM,up);
 const p=new THREE.Group();p.position.set(c-w/2,yb,.58);p.rotation.y=.9;up.add(p);
 for(let i=0;i<5;i++)B(w/5-.012,h-.06,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);B(w,.1,.09,w/2,.4,-.01,IRON,p);B(w,.1,.09,w/2,h-.4,-.01,IRON,p);
 B(.22,.22,.04,w/2,h-.3,-.06,0xc9a85a,p);const r=new THREE.Mesh(new THREE.TorusGeometry(.06,.014,4,8),M(IRON));r.position.set(w-.15,1.0,-.07);p.add(r)}
for(const x of[-1.8,1.8]){B(.15,2.45,3.15,x,4.375,2.175,PL,up);for(const z of[.7,3.65])B(.2,2.45,.2,x,4.375,z,TM,up);B(.2,.2,3.15,x,5.5,2.175,TM,up);B(.2,.2,3.15,x,3.25,2.175,TM,up)}
for(const bx of[2.5,-1.07]){const z0=2.65;
 B(1.2,.15,2.2,bx,3.6,z0,WOOD2,up);B(1.1,.2,2.1,bx,3.78,z0,0xd6c394,up);B(1.1,.1,1.4,bx,3.93,z0-.35,bx>0?0x8a6a2e:0x2e6b6b,up);B(.8,.12,.4,bx,3.95,z0+.8,0xf0ead8,up);
 B(1.3,1.1,.1,bx,4.0,3.7,WOOD2,up);B(1.2,.5,.08,bx,3.65,1.62,WOOD2,up);
 const cx=bx+1.05;B(.8,.45,.5,cx,3.38,3.3,WOOD2,up);B(.82,.1,.52,cx,3.66,3.3,WOOD,up);
 for(const a of[-.5,.5])for(const b of[-1,1])B(.08,.45,.08,bx+a,3.375,z0+b,WOOD2,up);
 }
B(1.6,.08,.8,-2.9,3.95,2.6,WOOD,up);for(const a of[-1,1])for(const b of[-1,1])B(.1,.8,.1,-2.9+a*.7,3.55,2.6+b*.3,WOOD2,up);
C(.03,.03,.14,6,-2.9,4.04,2.6,0xe8dcb0,up);
XR=false;
// placa pendurada e lanternas
const sg=new THREE.Group();sg.position.set(1.9,2.75,3.6);front.add(sg);
B(.1,.1,1.3,0,0,.65,IRON,sg);B(.04,.5,.04,-.3,-.25,1.1,IRON,sg);B(.04,.5,.04,.3,-.25,1.1,IRON,sg);
{const bd=new THREE.Group();bd.position.set(0,-.5,1.1);sg.add(bd);B(.9,.6,.06,0,-.3,0,DOOR,bd);B(.96,.06,.08,0,0,0,TM,bd);
 C(.15,.13,.3,8,0,-.3,.06,0xe8e0c8,bd);C(.16,.16,.08,8,0,-.12,.06,0xf0d060,bd);B(.1,.2,.05,.2,-.3,.06,0xe8e0c8,bd)}
for(const x of[-1.1,1.1]){B(.04,.4,.04,x,2.5,3.62,IRON,front);B(.2,.28,.2,x,2.28,3.7,0xffd890,front,0xffb040);}
// exterior: degrau, barris, mesa, cavalete, árvores
B(2.2,.2,.9,0,.12,4,STONE,front);B(1.6,.12,.6,0,.06,4.6,STONE2,front);
for(let i=0;i<8;i++)B(.8,.1,.55,((i*.7)%1.6)-.8,.03,5.2+i*.9,STONE2).rotation.y=i;
function brl(x,z,y){C(.4,.5,.4,10,x,y+.21,z,WOOD);C(.5,.4,.4,10,x,y+.6,z,WOOD);for(const h of[.1,.4,.72]){const q=C(.5,.5,.06,10,x,y+h,z,IRON);q.scale.set(1.02,1,1.02)}}
brl(4.6,4.5,0);brl(5.7,4.5,0);brl(5.15,4.5,.8);
tbl(-3.8,5.8,1.8,.9);bnc(-3.8,5.1,1.8);bnc(-3.8,6.5,1.8);
for(const z of[-.3,.3])B(.1,1,.1,-6.5,.5,5.5+z,WOOD2);B(.12,.1,1,-6.5,.95,5.5,WOOD2);
for(const z of[-.2,.2])B(.1,.7,.1,-6.8,.4,6.4+z*3,WOOD2);
  const K = TAVERN_SC;
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx * K, lz * K); o.position.set(wx, 0, wz); o.r = r * K; props.push(o); };
  // paredes (a da frente tem o vão da porta)
  [-5, -4.1, -3.2, -2.35].forEach(u => { block(u, 3.6, .45); block(-u, 3.6, .45); });
  block(-1.5, 3.6, .6); block(1.5, 3.6, .6);
  for (let u = -5; u <= 5.01; u += .9) block(u, -3.6, .45);
  for (let v = -2.8; v <= 2.81; v += .9) { block(-5, v, .45); block(5, v, .45); }
  // mobília
  [-4.2, -3.4, -2.6, -1.8, -1.0].forEach(u => block(u, -1.5, .5));
  block(-4.35, -2.0, .5); block(-4.35, -3.0, .5);
  [-2.8, -1.7, -.6, .5, 1.6, 2.7].forEach(v => block(-4.55, v, .4)); // escada
  [-2.2, -1.2, -.4].forEach(v => block(4.4, v, .5));                 // lareira
  const tb = (tx, tz, hw) => [-1, 1].forEach(s => [-.7, 0, .7].forEach(dz => block(tx + s * hw, tz + dz, .4)));
  tb(.9, .4, .5); tb(2.6, 2.2, .45); tb(-2.3, 1.6, .35); tb(-3.8, 5.8, .45);
  block(4.6, 4.5, .55); block(5.7, 4.5, .55);
  const pts = { keeper: [-.3, -1.6] };
  return { g: root, th, at, pts, front: at(-.3 * K, -1.6 * K) };
}
