/* Casa do ferreiro (c. 1740): paredes de reboco com enxaimel, telhado de duas águas, forja lateral coberta, bigorna, tina de têmpera e interior mobiliado.
   Portada do modelo do Cristiano; a animação do ferreiro (npc-work.js) usa os pontos devolvidos em `pts`. */
import { scene } from '../core/engine.js';
import { props } from '../core/registry.js';
import { xray } from './xray.js';
import { bakeGroup } from './merge.js';
import { registerFloors, refreshProps } from './floors.js';
import { addDoor } from './doors.js';
import { addBed } from './beds.js';

export const SMITH_SC = 1.28;

export function buildSmithHouse(x, z, a) {
  const th = Math.atan2(-Math.cos(a), -Math.sin(a));
  const root = new THREE.Group();
  root.position.set(x, 0, z); root.rotation.y = th;
  const S = new THREE.Group(); S.scale.setScalar(SMITH_SC); root.add(S);
  const DR = [];
const PL=0xe0d3b4,STONE=0x7b786f,STONE2=0x66635c,TM=0x4a3320,DOOR=0x6b4a2b,DOOR2=0x5c3f24,IRON=0x2b2b30,WOOD=0x8a6238,WOOD2=0x6e4d2c,SH=0x3f5a47;
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
 const p=new THREE.Group();p.position.set(c-w/2,0,2.98);p.rotation.y=0;g.add(p);DR.push({p,g,openRot:1.05,c,f:3,w,lvl:0,id:'smith-front'});
 for(let i=0;i<5;i++)B(w/5-.012,h-.06+Math.random()*.04,.07,w/5*(i+.5),h/2,0,i%2?DOOR:DOOR2,p);
 B(w,.12,.09,w/2,.45,.01,IRON,p);B(w,.12,.09,w/2,h-.45,.01,IRON,p);B(w,.06,.09,w/2,h/2,.01,TM,p);
 B(.2,.09,.1,.1,.45,.02,IRON,p);B(.2,.09,.1,.1,h-.45,.02,IRON,p);
 const r=new THREE.Mesh(new THREE.TorusGeometry(.07,.016,4,8),M(IRON));r.position.set(w-.15,1.0,.07);p.add(r);

}
XR=true;wall('x',3,-4,4,[{c:-1.4,w:1.2,y0:0,y1:2.2},{c:1.8,w:1.3,y0:1,y1:2.1}],front);
door(-1.4,1.2,2.2,front);win('x',3,1.8,1.3,1,2.1,front);
wall('x',-3,-4,4,[{c:-.6,w:1.1,y0:1,y1:2.1}],wB);win('x',-3,-.6,1.1,1,2.1,wB);
wall('z',-4,-3,3,[{c:-.6,w:1.2,y0:1,y1:2.1}],wL);win('z',-4,-.6,1.2,1,2.1,wL);
// parede direita (lado da forja): pedra, sem janela
{const sc2=[0x7b786f,0x6a675f,0x8a867b,0x73706a,0x5f5c56];
 W('z',4,0,H/2,6,H,T,0x4a4640,wR);
 for(let r=0;r<10;r++){let z=-3;while(z<3-.01){const l=Math.min(.55+Math.random()*.45,3-z);B(T+.06,.28,l-.03,4,.14+r*.3,z+l/2,sc2[(Math.random()*5)|0],wR);z+=l}}
 W('z',4,0,H-.09,6.2,.18,T+.12,TM,wR)}
B(1.9,.2,.9,-1.4,.12,3.55,STONE);B(1.4,.12,.5,-1.4,.06,4.2,STONE2);
// telhado
const L=Math.hypot(3.6,2.2),A=Math.atan2(2.2,3.6),RT=H+2.2,sc=[0x5a4636,0x6b5644,0x4f3d2f,0x74604a];
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
// forja (lateral de fora, junto à parede direita)
const FG=new THREE.Group();FG.rotation.y=Math.PI/2;FG.position.set(7.25,0,1.5);S.add(FG);DEF=FG;
B(4.8,.05,3,1.3,.03,-1.55,STONE2);
B(2.2,.9,1.4,2.2,.55,-2.25,STONE);B(2.4,.1,1.6,2.2,1.03,-2.2,STONE2);B(1.3,.1,.9,2.2,1.1,-2.2,0x201510);
const hood=C(.45,1.1,1.2,4,2.2,2.6,-2.5,STONE2);hood.rotation.y=Math.PI/4;
B(.9,2.4,.9,2.2,3.6,-2.5,STONE);B(1.1,.15,1.1,2.2,4.85,-2.5,STONE2);
const coals=[],fl=[];
for(let i=0;i<7;i++)coals.push(B(.22,.1,.2,1.8+i*.12+Math.random()*.1,1.2,-2.3+(Math.random()-.5)*.5,0x8a2a08,FG,0xff4a10));
for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.11,.45,4),M(0xff8a1a,0xff6a00));f.position.set(1.85+i*.2,1.45,-2.25+(i%2)*.15);FG.add(f);fl.push(f)}

// fole fixo
B(.55,.05,.9,.55,.85,-2.4,WOOD2);const bl=B(.55,.05,.9,.55,1.2,-2.4,WOOD);bl.rotation.x=.18;B(.5,.35,.8,.55,1.02,-2.4,0x5c3a22);
const nz=C(.04,.07,.9,5,1.0,1.0,-2.3,IRON);nz.rotation.z=Math.PI/2;B(.05,.5,.05,.55,1.4,-1.95,TM);
// bigorna
C(.4,.46,.5,8,0,.35,-.4,0x6b4a2b);B(.5,.12,.3,0,.66,-.4,IRON);B(.26,.2,.2,0,.82,-.4,IRON);B(.72,.14,.3,0,.99,-.4,0x3a3a40);
const hn=new THREE.Mesh(new THREE.ConeGeometry(.14,.45,4),M(0x3a3a40));hn.rotation.z=-Math.PI/2;hn.position.set(.55,.99,-.4);FG.add(hn);B(.15,.1,.2,-.4,.95,-.4,0x3a3a40);
B(.06,.4,.05,-.15,1.08,-.4,DOOR).rotation.z=1.4;B(.18,.1,.1,-.3,1.11,-.4,IRON);
// tina de têmpera
for(const z of[-.24,.24])B(1.1,1.1,.06,1.3,.65,-1.3+z,WOOD2);for(const x of[-.52,.52])B(.06,1.1,.5,1.3+x,.65,-1.3,WOOD2);B(1.1,.04,.5,1.3,.13,-1.3,WOOD2);
tr(B(1.0,.03,.4,1.3,1.1,-1.3,0x3a7fa8),.7);
// cobertura da forja
for(const x of[-.6,1.3,3.2])B(.4,.3,.45,x,3.3,-2.85,STONE,FG);
const cn=new THREE.Group();cn.position.set(1.3,3.65,-1.6);cn.rotation.x=.107;FG.add(cn);
for(let i=0;i<8;i++)B(.6,.08,2.9,-2.1+i*.6,0,0,i%2?0x5a4636:0x6b5644,cn);
DEF=S;
// ferramentas
B(2.2,.12,.1,-2.7,1.9,-2.8,TM);
for(const x of[-3.5,-3.1,-2.7]){B(.06,.5,.05,x,1.6,-2.76,DOOR);B(.2,.1,.1,x,1.78,-2.76,IRON)}
for(const x of[-2.2,-1.9]){const t=B(.04,.6,.03,x,1.58,-2.77,IRON);t.rotation.z=x<-2?.1:-.1}
for(const x of[-3.4,-3,-2.6]){const h=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,4,8,Math.PI*1.6),M(IRON));h.rotation.z=-.3*Math.PI;h.position.set(x,2.45,-2.8);S.add(h)}
// bancada
B(2.2,.1,.7,-2.7,.95,-2.35,WOOD);for(const x of[-3.7,-1.7])for(const z of[-2.6,-2.1])B(.1,.9,.1,x,.5,z,WOOD2);
B(.22,.28,.16,-3.5,1.13,-2.3,IRON);B(.8,.04,.04,-2.4,1.02,-2.3,IRON);
const hs=new THREE.Mesh(new THREE.TorusGeometry(.1,.025,4,8,Math.PI*1.6),M(IRON));hs.rotation.x=Math.PI/2;hs.position.set(-2.9,1.03,-2.2);S.add(hs);
// prateleira
B(.3,.06,1.8,-3.7,1.7,1.5,WOOD2);B(.3,.06,1.8,-3.7,2.3,1.5,WOOD2);
[1,1.4,1.8].forEach((z,i)=>{C(.1,.13,.2,6,-3.7,1.83,z,i%2?0xa0623a:0x8a5030);C(.08,.1,.18,6,-3.7,2.42,z,i%2?0x8a5030:0xa0623a)});
// carvão, mesa, lanterna, feno
B(1,.5,.8,3.0,.35,-.7,WOOD2,FG);for(let i=0;i<8;i++)B(.2,.12,.2,2.75+Math.random()*.5,.64,-.9+Math.random()*.4,0x18181a,FG);
B(1.1,.08,.8,3.1,.9,2,WOOD);for(const x of[2.65,3.55])for(const z of[1.7,2.3])B(.08,.85,.08,x,.45,z,WOOD2);
C(.06,.06,.15,6,3,1.02,2,0xe8dcb0);C(.17,.17,.08,6,2.5,.4,1.1,WOOD2);C(.04,.04,.4,5,2.5,.2,1.1,WOOD2);
B(.02,.5,.02,0,2.65,0,IRON);B(.2,.3,.2,0,2.25,0,0xffd890,S,0xffb040);B(.28,.05,.28,0,2.43,0,IRON);

for(let i=0;i<3;i++)B(.7,.3,.5,-3.2,.25+i*.3,2.3-i*.05,0xd4b04a);
B(.6,.4,.5,-3.2,.2,1.6,0xc9b48a);
// interior: cama, baú, guarda-roupa, mesa, cadeiras e detalhes
{const ox=2.7,oz=-2.25;
 for(const x of[1.65,3.75])for(const z of[-2.8,-1.7])B(.12,.55,.12,x,.4,z,TM);
 B(2.2,.1,.07,ox,.44,-1.7,WOOD2);B(2.2,.1,.07,ox,.44,-2.8,WOOD2);B(.07,.1,1.1,1.65,.44,oz,WOOD2);
 B(2.1,.2,1.05,ox,.52,oz,0xd6c394);B(1.5,.1,1.08,2.4,.67,oz,0x7a2e2e);B(1.5,.02,.22,2.4,.73,oz,0xd6b86a);
 B(.4,.12,.75,3.45,.69,oz,0xf0ead8);B(.1,1.15,1.25,3.8,.85,oz,WOOD2);B(.14,.1,1.35,3.8,1.45,oz,TM);B(.08,.6,1.2,1.62,.7,oz,WOOD2);
 // baú no pé da cama
 B(.8,.45,.55,1.0,.35,-2.5,WOOD2);B(.82,.1,.57,1.0,.63,-2.5,WOOD);B(.06,.55,.58,.75,.38,-2.5,IRON);B(.06,.55,.58,1.25,.38,-2.5,IRON);B(.08,.12,.03,1.0,.52,-2.21,IRON);
 // quadro
 B(.7,.9,.05,1.0,1.9,-2.82,TM);B(.6,.8,.06,1.0,1.9,-2.81,0x8aa47a);B(.35,.28,.07,1.0,1.75,-2.8,0x5d7a9a);B(.12,.12,.07,1.12,2.1,-2.8,0xe8c35a);
 // guarda-roupa
 B(.6,2.1,1.2,3.55,1.15,-.95,WOOD2);B(.7,.12,1.3,3.55,2.25,-.95,TM);B(.04,1.9,.03,3.24,1.15,-.95,TM);
 B(.02,1.5,.45,3.245,1.15,-.72,DOOR2);B(.02,1.5,.45,3.245,1.15,-1.18,DOOR2);B(.05,.12,.04,3.22,1.05,-1.05,IRON);B(.05,.12,.04,3.22,1.05,-.85,IRON);
 // banco com vela ao lado da cama
 C(.2,.18,.4,6,2.7,.33,-1.35,WOOD2);C(.03,.03,.14,6,2.7,.6,-1.35,0xe8dcb0);
 const cf=new THREE.Mesh(new THREE.ConeGeometry(.025,.07,4),M(0xffc040,0xffa020));cf.position.set(2.7,.7,-1.35);S.add(cf);
 
 // tapete e mesa central
 B(3,.02,2.2,-.2,.13,.15,0x5a2a22);B(2.7,.025,1.9,-.2,.135,.15,0x8a3b2e);B(2.2,.03,1.4,-.2,.14,.15,0xb89a58);
 B(1.8,.08,.9,-.2,.84,.15,WOOD);for(const x of[-.95,.55])for(const z of[-.23,.53])B(.1,.8,.1,x,.44,z,WOOD2);B(1.6,.05,.05,-.2,.35,.15,WOOD2);
 for(const p of[[-.7,-.05],[.3,-.05],[-.7,.4],[.3,.4]])C(.14,.11,.02,8,p[0],.89,p[1],0xcfcfd4);
 C(.05,.05,.1,6,-.2,.93,-.15,0x8a5030);C(.07,.09,.22,6,-.2,1.0,.45,0xa0623a);B(.3,.09,.14,-.2,.92,.12,0xd2a45a);C(.03,.03,.14,6,.5,.95,.15,0xe8dcb0);
 const chair=(x,z,r)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=r;S.add(g);B(.46,.06,.46,0,.5,0,WOOD,g);for(const a of[-.19,.19])for(const b of[-.19,.19])B(.05,.4,.05,a,.3,b,WOOD2,g);B(.46,.55,.05,0,.82,-.21,WOOD2,g);B(.38,.05,.05,0,.9,-.21,TM,g)};
 chair(-.2,-.75,0);chair(-.2,1.05,Math.PI);chair(-1.4,.15,Math.PI/2);chair(1.0,.15,-Math.PI/2);
 // mesa lateral: jarro e prato
 C(.07,.09,.22,6,3.35,1.05,1.85,0xa0623a);C(.15,.12,.02,8,2.85,.96,2.2,0xcfcfd4);
 // vassoura
 {const g=new THREE.Group();g.position.set(3.7,0,2.7);g.rotation.z=.08;S.add(g);B(.04,1.5,.04,0,.85,0,WOOD2,g);C(.07,.14,.35,6,0,.28,0,0xc9a85a,g)}
 // barril interno
 C(.38,.45,.4,10,-3.4,.33,.9,WOOD);C(.45,.38,.4,10,-3.4,.7,.9,WOOD);for(const y of[.25,.5,.78]){const q=C(.46,.46,.05,10,-3.4,y,.9,IRON);q.scale.set(1.02,1,1.02)}
 // ervas penduradas nas vigas
 for(const q of[[-1.75,1.3],[1.75,-1.3],[-3.5,.5],[1.75,1.5],[-1.75,-1.5]]){B(.01,.25,.01,q[0],2.7,q[1],0x999999);C(.1,0,.4,5,q[0],2.45,q[1],0x6a8f3a);C(.08,0,.3,5,q[0]+.15,2.5,q[1],0xb8a040)}
}
// lado de fora: barril com água
const bx=-3.2,bz=4.1;C(.4,.5,.42,10,bx,.21,bz,WOOD);C(.5,.4,.42,10,bx,.6,bz,WOOD);
for(const y of[.1,.4,.72]){const q=C(.5,.5,.06,10,bx,y,bz,IRON);q.scale.set(1.02,1,1.02)}
const rim=new THREE.Mesh(new THREE.TorusGeometry(.4,.045,4,10),M(WOOD2));rim.rotation.x=Math.PI/2;rim.position.set(bx,.82,bz);S.add(rim);
const wt=C(.37,.37,.03,10,bx,.8,bz,0x3a8fc0);tr(wt,.85);wt.material.emissive=new THREE.Color(0x0a2a40);
C(.2,.15,.25,7,bx+.9,.12,bz+.3,WOOD);
// lenha, toco com machado, cerca, pedras
for(let r=0;r<3;r++)for(let i=0;i<4-r;i++){const l=C(.15,.15,1.4,6,4.65+r*.0,.15+r*.26,-2+i*.33+r*.16,0x7a5430);l.rotation.x=Math.PI/2;l.position.x=-4.7}
C(.3,.35,.5,7,3.2,.25,4.6,0x7a5a38);B(.06,.6,.05,3.3,.7,4.6,DOOR).rotation.z=.5;B(.2,.14,.06,3.45,.9,4.6,IRON);

for(let i=0;i<3;i++)B(.7,.1,.5,-1.4+((i*.5)%2)*.3,.03,4.6+i*.9,STONE2).rotation.y=i;
for(let i=0;i<5;i++){const a=i*1.3,r=C(.4,.5,.4,5,-6+Math.cos(a)*.6,.2,5+Math.sin(a)*.6,STONE)}

  const K = SMITH_SC, Pm = (mx, mz) => [mx * K, mz * K];
  scene.add(root);
  const at = (lx, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), z - lx * Math.sin(th) + lz * Math.cos(th)];
  const block = (lx, lz, r, dr) => { const o = new THREE.Object3D(); const [wx, wz] = at(lx, lz); o.position.set(wx, 0, wz); o.r = r; if (dr) o.dr = dr; props.push(o); };
  // paredes: a da frente tem um vão na porta (x = -1.4) para o jogador entrar
  for (let u = -4; u <= 4.01; u += .9) { if (u < -2.45 || u > -.35) block(u * K, 3.1 * K, .45); block(u * K, -3.1 * K, .45); }
  for (let v = -2.2; v <= 2.21; v += .9) { block(-4 * K, v * K, .45); block(4 * K, v * K, .45); }
  // mobília do interior
  [[2.2, -2.25, .6], [3.2, -2.25, .6], [3.55, -.95, .6], [-.8, .15, .5], [.4, .15, .5], [-3.3, -2.3, .45], [-2.1, -2.3, .45], [-3.4, .9, .45], [1, -2.5, .45]]
    .forEach(([fx, fz, r]) => block(fx * K, fz * K, r));
  const anvil = Pm(6.85, 1.5), furnace = Pm(5.0, -.7), tub = Pm(5.95, .2);
  block(furnace[0], furnace[1], .85); block(tub[0], tub[1], .5); block(anvil[0], anvil[1], .42);
  block(...Pm(5.0, -1.9), .6); block(...Pm(5.0, .9), .5);
  const pts = {
    ay: -Math.PI / 2,                                                  // o ferreiro fica a leste da bigorna, olhando para -x (a parede)
    anvil, bar: tub, fire: furnace, fireY: .92, anvilY: .8,
    home: Pm(8.12, 1.5), forgeSpot: Pm(7.1, -.7), barSpot: Pm(7.9, .2),
    door: Pm(-1.4, 3.4), wps: [Pm(5.8, 4.4), Pm(9.4, 3.2)],
    bed: [1.85 * K, -2.25 * K], bedY: .72 * K + .18,                  // pé da cama (onde o ferreiro deita à noite)
  };
  [wB, wL, wR].forEach(q => bakeGroup(q)); bakeGroup(front, DR.map(d => d.p)); bakeGroup(roof);
  DR.forEach(d => { const dd = addDoor(d, { x, z, th, K }); [-2.2, -1.5, -.8, -.1].forEach(lx => block(lx * K, 3.1 * K, .45, dd)); });
  // cama: o dorminhoco deita de costas, cabeça no travesseiro
  { const hit = new THREE.Mesh(new THREE.BoxGeometry(1.05, .7, 2.1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(2.7, .8, -2.25); hit.rotation.y = Math.PI / 2; hit.userData.dyn = 1; S.add(hit);
    const bf = at(1.85 * K, -2.25 * K), ba = at(2.4 * K, -1.1 * K);
    addBed({ x: bf[0], z: bf[1], y: 0.72 * K + .18, ry: th + (-Math.PI / 2), ax: ba[0], az: ba[1], hit }); }
  refreshProps();
  registerFloors({ x, z, th, K, hx: 4.2, hz: 3.2, roof, up: null, walls: [{ g: front, nx: 0, nz: 1, D: 3 }, { g: wB, nx: 0, nz: -1, D: 3 }, { g: wL, nx: -1, nz: 0, D: 4 }, { g: wR, nx: 1, nz: 0, D: 4 }], noStair: true });
  return { g: root, th, at, pts, front: at(-1.4 * K, 4.2 * K) };
}
