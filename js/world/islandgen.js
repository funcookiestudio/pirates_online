import { VILLAGE_R } from '../core/village-const.js';
import { planCore, planFields } from './layout.js';
/* Gerador procedural de ilhas low poly (puro: sem THREE nem DOM). Terraços, rios, lagos, pontes, estradas, biomas e vegetação por semente.
   Portado do sistema de ilhas do Cristiano. Célula da grade = 1 m. */
export const N=800,V=N+1,RD={half:2,sh:6,slope:.12};
export function rngf(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function mkNoise(r){const G=new Float32Array(4096);for(let i=0;i<4096;i++)G[i]=r();
 const v=(x,y)=>G[(y&63)*64+(x&63)],sm=t=>t*t*(3-2*t);
 const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi);return(v(xi,yi)*(1-fx)+v(xi+1,yi)*fx)*(1-fy)+(v(xi,yi+1)*(1-fx)+v(xi+1,yi+1)*fx)*fy};
 return(x,y)=>{let a=0,f=1,s=.5,t=0;for(let o=0;o<5;o++){a+=n(x*f,y*f)*s;t+=s;f*=2;s*=.5}return a/t}}
export const BIOMES=['Praia','Campina','Floresta','Pântano','Savana','Rochedo'];
const mkHeap=()=>{const hk=[],hv=[];return{n:()=>hk.length,top:()=>hk[0],
 push(c,v){let i=hk.length;hk.push(c);hv.push(v);while(i>0){const p=(i-1)>>1;if(hk[p]<=c)break;hk[i]=hk[p];hv[i]=hv[p];i=p}hk[i]=c;hv[i]=v},
 pop(){const v0=hv[0],c=hk.pop(),v=hv.pop(),n=hk.length;if(n){let i=0;for(;;){let l=2*i+1;if(l>=n)break;if(l+1<n&&hk[l+1]<hk[l])l++;if(hk[l]>=c)break;hk[i]=hk[l];hv[i]=hv[l];i=l}hk[i]=c;hv[i]=v}return v0}}};
export const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
export function build(seed,type){
 const r=rngf(hash(seed+type)),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),nz=mkNoise(r),nw=mkNoise(r),ox=r()*40,oy=r()*40,sc=100/N;
 const rot=r()*6.28,cr=Math.cos(rot),sr=Math.sin(rot),ringR=.5+r()*.15,elong=.28+r()*.14,bR=.5+r()*.15,bl=[];
 if(type==='arquipelago'){const k=ri(4,6);for(let i=0;i<k;i++){const a=r()*6.28,d=r()*.55;bl.push([Math.cos(a)*d,Math.sin(a)*d,.22+r()*.28+(i?0:.25)])}}
 const ht={redonda:1,crescente:.85,atol:.45,alongada:.9,arquipelago:.8}[type]||1,NV=V*V,H=new Float32Array(NV);
 const TS=3,HS=2.2,KS=13*N/100;
 // 1) máscara de forma + ruído => "u" (altura bruta) => TERRAÇOS: platôs planos + rampas suaves
 for(let j=0;j<V;j++)for(let i=0;i<V;i++){
  const ex=i/N*2-1,ey=j/N*2-1,x=ex+(nw(i*.05*sc+ox,j*.05*sc)-.5)*.45,y=ey+(nw(i*.05*sc,j*.05*sc+oy)-.5)*.45;let m;
  if(type==='crescente'){const a=1-Math.hypot(x,y)/.9,b=1-Math.hypot(x-.62*cr,y-.62*sr)/bR;m=Math.min(a,.3-b*.8)}
  else if(type==='atol')m=1-Math.abs(Math.hypot(x,y)-ringR)/.26;
  else if(type==='alongada'){const xr=x*cr+y*sr,yr=-x*sr+y*cr+Math.sin(xr*3)*.12;m=1-Math.hypot(xr/.95,yr/elong)}
  else if(type==='arquipelago'){m=-1;for(const b of bl)m=Math.max(m,1-Math.hypot(x-b[0],y-b[1])/b[2])}
  else m=1-Math.hypot(x,y)/.85;
  m-=Math.max(0,Math.max(Math.abs(ex),Math.abs(ey))-.78)*4;
  const e=nz(i*.135*sc+ox,j*.135*sc+oy),v=m*1.15+(e-.5)*.75;
  if(v>.12){const u0=(v-.12)*9*ht*(.7+e*.6),u=u0>8?8+(u0-8)*.4:u0,t=u/TS,f=Math.floor(t);
   const terr=HS*(f+ss(.35,.75,t-f)),smo=HS*t*.88,ridge=1-Math.abs(2*nw(i*.028*sc+ox*2,j*.028*sc+oy*2)-1),hill=nz(i*.05*sc+oy*3,j*.05*sc+ox*3)-.5;
   H[j*V+i]=.9*ss(0,1.15,u)+terr*.22+smo*.78+hill*2.4*ss(.6,4,u)+ridge*ridge*1.5*ss(2.5,7,u)+(nw(i*.06*sc+oy,j*.06*sc+ox)-.5)*.5*ss(0,1,u)}
  else{const dv=v-.12;H[j*V+i]=Math.max(dv>-.07?dv*KS*.3:-.07*KS*.3+(dv+.07)*KS*1.25,-6)}}
 // 2) componentes de terra: a maior é a "ilha principal"
 const lab=new Int32Array(NV),sizes=[0];let nl=0,land=0;
 for(let k=0;k<NV;k++)if(H[k]>.3){land++;if(!lab[k]){nl++;let c=0;const q=[k];lab[k]=nl;for(let n=0;n<q.length;n++){c++;for(const o of[1,-1,V,-V]){const t=q[n]+o;if(t>=0&&t<NV&&!lab[t]&&H[t]>.3){lab[t]=nl;q.push(t)}}}sizes[nl]=c}}
 if(!nl)return build(seed+'x',type);
 let mainL=1;for(let l=1;l<=nl;l++)if(sizes[l]>sizes[mainL])mainL=l;
 const sl=k=>Math.max(Math.abs(H[k+1]-H[k]),Math.abs(H[k-1]-H[k]),Math.abs(H[k+V]-H[k]),Math.abs(H[k-V]-H[k]));
 const cells=[];for(let k=V+1;k<NV-V-1;k++)if(lab[k]===mainL)cells.push(k);
 // proximidade da água (dilatação separável, raio 4): estradas evitam beirar o mar
 let wd=new Uint8Array(NV);for(let k=0;k<NV;k++)wd[k]=H[k]<=.3?1:0;
 for(const[st,lim]of[[1,V],[V,NV]]){const o=new Uint8Array(NV);for(let k=0;k<NV;k++)if(wd[k])for(let d=-4;d<=4;d++){const t=k+d*st;if(t>=0&&t<NV&&(st===V||((t/V|0)===(k/V|0))))o[t]=1}wd=o}
 const dirs=[[1,1,0],[-1,-1,0],[V,0,1],[-V,0,-1]];
 const coastOf=k=>{for(const[o,x,z]of dirs)for(const d of[4,6]){const t=k+o*d;if(t>=0&&t<NV&&H[t]<-.1)return[x,z]}return null};
 let coast=cells.filter(k=>H[k]>.7&&H[k]<1.5&&sl(k)<.25&&coastOf(k));
 if(!coast.length)coast=cells.filter(k=>H[k]>.5&&coastOf(k));
 const pc=coast.length?coast:cells;let port=pc[ri(0,pc.length-1)];
 const core=planCore({N,V,H,lab,mainL,sl,wd,coastOf,cells});if(!core)return build(seed+'x',type);port=core.port;
 const vil=core.vil;
 // 2b) MESA DO CASTELO: platô no pico, penhascos em volta e uma única rampa voltada para a vila
 const MR=38,cwx=core.castle.x,cwz=core.castle.z,cra=Math.atan2(Math.cos(core.castle.th),Math.sin(core.castle.th)),cb=new Uint8Array(NV);
 {const sstep=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
  let hc=-9;for(let j=-MR;j<=MR;j+=3)for(let i=-MR;i<=MR;i+=3)if(i*i+j*j<=MR*MR)hc=Math.max(hc,H[Math.round(cwz+j)*V+Math.round(cwx+i)]);
  const hr=H[Math.round(cwz+Math.cos(cra+0)*0+Math.sin(cra)*(MR+30))*V+Math.round(cwx+Math.cos(cra)*(MR+30))],wR=Math.min(46,Math.max(16,(hc-hr)/.2)),RO=MR+wR+3;
  const H1=H.slice();
  for(let j=Math.max(2,Math.floor(cwz-RO));j<=Math.min(N-2,Math.ceil(cwz+RO));j++)for(let i=Math.max(2,Math.floor(cwx-RO));i<=Math.min(N-2,Math.ceil(cwx+RO));i++){
   const d=Math.hypot(i-cwx,j-cwz),k=j*V+i;if(d>RO||lab[k]!==mainL)continue;
   let ad=Math.abs(Math.atan2(j-cwz,i-cwx)-cra);ad=Math.min(ad,6.2832-ad);const rw=d<MR?1:1-sstep(.14,.26,ad);
   if(d<=MR){H[k]=hc;continue}
   const w=5+(wR-5)*rw,t=sstep(MR,MR+w,d),tgt=H1[k]*rw+Math.min(H1[k],hc-4.5)*(1-rw);
   H[k]=Math.max(.9,hc*(1-t)+tgt*t);
   if(rw<.02&&d<MR+w+2)cb[k]=1}
  for(let j=Math.max(2,Math.floor(cwz-RO));j<=Math.min(N-2,Math.ceil(cwz+RO));j++)for(let i=Math.max(2,Math.floor(cwx-RO));i<=Math.min(N-2,Math.ceil(cwx+RO));i++){const d=Math.hypot(i-cwx,j-cwz);if(d>=MR-1&&d<=RO&&!cb[j*V+i]){let ad=Math.abs(Math.atan2(j-cwz,i-cwx)-cra);ad=Math.min(ad,6.2832-ad);if(ad>.26)cb[j*V+i]=1}}}
 // 3b) RIOS e LAGOS: superfície de água nivelada (W) + leito escavado; roads atravessam por pontes
 const H0=H.slice(),rn=new Float32Array(NV);for(let k=0;k<NV;k++)rn[k]=r()*.4;
 const bil=(x,y)=>{const i=Math.min(N-1,Math.max(0,Math.floor(x))),j=Math.min(N-1,Math.max(0,Math.floor(y))),fx=x-i,fy=y-j,a=H0[j*V+i],b=H0[j*V+i+1],c=H0[(j+1)*V+i],d=H0[(j+1)*V+i+1];return(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy};
 const avg=(x,y,s)=>{let t=0,n=0;for(let a=-s;a<=s;a++)for(let b=-s;b<=s;b++){t+=bil(x+a,y+b);n++}return t/n};
 const sm=(a,w,p)=>{let c=a;for(let q=0;q<p;q++){const n=c.length,o=new Array(n);for(let i=0;i<n;i++){const ww=Math.min(w,i,n-1-i);let s=0;for(let t=-ww;t<=ww;t++)s+=c[i+t];o[i]=s/(2*ww+1)}c=o}return c};

 const NB=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
 const W=new Float32Array(NV).fill(-99),rv=new Uint8Array(NV),lk=new Uint8Array(NV),pen=new Float32Array(NV),BANK=3.5;
 for(const[px,pz,pr]of[[port%V,(port/V)|0,24],[vil%V,(vil/V)|0,52],[core.castle.x,core.castle.z,MR+34],...core.farms.map(f=>[f.x,f.z,26])]){for(let j=Math.max(1,Math.floor(pz-pr));j<=Math.min(N-1,Math.ceil(pz+pr));j++)for(let i=Math.max(1,Math.floor(px-pr));i<=Math.min(N-1,Math.ceil(px+pr));i++)if(Math.hypot(i-px,j-pz)<=pr)pen[j*V+i]=1}
 const FD=new Float32Array(NV).fill(1e9),FP=new Int32Array(NV).fill(-1),fh=mkHeap();
 for(const k of cells)if(H[k]<1.6&&[1,-1,V,-V].some(o=>H[k+o]<=.3)){FD[k]=0;fh.push(0,k)}
 while(fh.n()){const c0=fh.top(),k=fh.pop();if(c0>FD[k])continue;const ci=k%V,cj=(k/V)|0;
  for(const[a,b,ds]of NB){const ni=ci+a,nj=cj+b;if(ni<2||nj<2||ni>=N-1||nj>=N-1)continue;const t=nj*V+ni;if(lab[t]!==mainL||H[t]<.45)continue;
   const c=FD[k]+ds*(1+rn[t]*.8)+Math.max(0,H[k]-H[t])*10+pen[t]*30;if(c<FD[t]){FD[t]=c;FP[t]=k;fh.push(c,t)}}}
 const carveRiver=(cp,hit)=>{
  const xs=sm(cp.map(k=>k%V),5,3),zs=sm(cp.map(k=>(k/V)|0),5,3),n=xs.length,hs=sm(xs.map((x,i)=>bil(x,zs[i])),8,3);
  {const ph=r()*6.28,lam=26+r()*22,am=1.6+r()*1.8,ox0=xs.slice(),oz0=zs.slice();
   for(let i=2;i<n-2;i++){const tx=ox0[i+1]-ox0[i-1],tz=oz0[i+1]-oz0[i-1],tl=Math.hypot(tx,tz)||1,f=ss(0,14,i)*(1-ss(n-18,n-2,i)),o=Math.sin(i/lam*6.283+ph)*am*f;xs[i]=ox0[i]-tz/tl*o;zs[i]=oz0[i]+tx/tl*o}}
  let Wp=new Array(n),cur=1e9;for(let i=0;i<n;i++){cur=Math.min(cur,hs[i]-.28);Wp[i]=Math.max(.05,cur)}
  if(hit>=0&&W[hit]>-90){const L=Math.min(24,n-1),d=W[hit]-Wp[n-1];for(let i=n-L;i<n;i++)Wp[i]+=d*ss(0,1,(i-(n-L))/L)}
  Wp=sm(Wp,6,2);const hwf=s=>1.5+1.7*s/(n-1),bd=new Float32Array(NV).fill(1e9),bW=new Float32Array(NV),bh=new Float32Array(NV),Rm=3.2+BANK;
  for(let s=0;s<n-1;s++){const ax=xs[s],az=zs[s],bx=xs[s+1],bz=zs[s+1],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1e-6;
   const i0=Math.max(1,Math.floor(Math.min(ax,bx)-Rm)),i1=Math.min(N-1,Math.ceil(Math.max(ax,bx)+Rm)),j0=Math.max(1,Math.floor(Math.min(az,bz)-Rm)),j1=Math.min(N-1,Math.ceil(Math.max(az,bz)+Rm));
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=Math.min(1,Math.max(0,((i-ax)*dx+(j-az)*dz)/L2)),d=Math.hypot(i-(ax+dx*t),j-(az+dz*t)),k=j*V+i;if(d<bd[k]){bd[k]=d;bW[k]=Wp[s]+(Wp[s+1]-Wp[s])*t;bh[k]=hwf(s)+t*(hwf(s+1)-hwf(s))}}}
  const marks=[];
  for(let k=0;k<NV;k++){const d=bd[k];if(d>=1e8)continue;const hw=bh[k],R=hw+BANK;if(d>=R||rv[k]||H0[k]<-.3)continue;
   const Wv=bW[k],top=Math.max(H0[k],Wv+.45);
   H[k]=d<=hw?Math.min(H[k],Wv-1.0*(1-(d/hw)*(d/hw))):Wv+(top-Wv)*ss(hw,R,d);
   if(d<=hw+1.2)marks.push(k,Wv)}
  for(let q=0;q<marks.length;q+=2){W[marks[q]]=marks[q+1];rv[marks[q]]=1}
  return{n:'Rio',pts:xs.map((x,i)=>[+(x-N/2).toFixed(2),+(zs[i]-N/2).toFixed(2),+Wp[i].toFixed(2)]),w:+(hwf(n-1)*2).toFixed(1)}};
 const nR=ri(3,5),srcs=[],srcCand=(lo,dm)=>cells.filter(k=>H[k]>lo&&FD[k]<1e8&&FD[k]>dm&&!pen[k]),rivers=[];
 let cand=srcCand(2.9,70);if(cand.length<30)cand=srcCand(1.5,40);if(cand.length<30)cand=srcCand(.9,25);
 for(let tr=0;tr<300&&rivers.length<nR&&cand.length;tr++){const s0=cand[ri(0,cand.length-1)],sx=s0%V,sz=(s0/V)|0;
  if(srcs.some(q=>Math.hypot(q[0]-sx,q[1]-sz)<55))continue;
  const cp=[];let k=s0,hit=-1;for(let g=0;g<3000&&k>=0;g++){cp.push(k);if(FD[k]===0)break;const nx=FP[k];if(nx<0)break;if(rv[nx]){hit=nx;cp.push(nx);break}k=nx}
  if(cp.length<30)continue;srcs.push([sx,sz]);rivers.push(carveRiver(cp,hit))}
 const lakes=[],nL=ri(3,5),cand2=cells.filter(k=>H[k]>.85&&sl(k)<.07&&!wd[k]&&!pen[k]&&!rv[k]);
 for(let tr=0;tr<500&&lakes.length<nL&&cand2.length;tr++){
  const c=cand2[ri(0,cand2.length-1)],cx0=c%V,cz0=(c/V)|0,R0=ri(5,10),h0=H0[c];
  if(lakes.some(l=>Math.hypot(l.ix-cx0,l.iz-cz0)<45))continue;
  let ok=true;for(let a=0;a<16&&ok;a++){const an=a/16*6.283,rr2=R0*1.6+5,x=Math.round(cx0+Math.cos(an)*rr2),z=Math.round(cz0+Math.sin(an)*rr2);
   if(x<2||z<2||x>N-2||z>N-2){ok=false;break}const kk=z*V+x;if(Math.abs(H0[kk]-h0)>.45||rv[kk]||pen[kk]||lk[kk])ok=false}
  if(!ok)continue;
  const li=lakes.length,Rt=R0*1.5+4;
  for(let j=Math.max(1,Math.floor(cz0-Rt));j<=Math.min(N-1,Math.ceil(cz0+Rt));j++)for(let i=Math.max(1,Math.floor(cx0-Rt));i<=Math.min(N-1,Math.ceil(cx0+Rt));i++){
   const dx=i-cx0,dz=j-cz0,d=Math.hypot(dx,dz),th=Math.atan2(dz,dx),Rth=R0*(.6+.9*nz(Math.cos(th)*1.6+20+li*5,Math.sin(th)*1.6+20));
   if(d>=Rth+3.5)continue;const k=j*V+i,bk=ss(Rth+3.5,Rth-1,d)*(.3+1.4*ss(Rth,Rth*.35,d));
   H[k]=Math.min(H[k],h0-bk);if(d<=Rth+1){W[k]=h0-.3;lk[k]=1}}
  lakes.push({ix:cx0,iz:cz0,x:cx0-N/2,z:cz0-N/2,r:R0,y:+(h0-.3).toFixed(2)})}
 const wk=new Uint8Array(NV);for(let k=0;k<NV;k++)if(W[k]>-90&&W[k]-H[k]>.2)wk[k]=lk[k]?2:1;
 // distância à água (umidade) por BFS
 const dw=new Uint8Array(NV).fill(255);{const q=[];for(let k=0;k<NV;k++)if(wk[k]){dw[k]=0;q.push(k)}for(let n=0;n<q.length;n++){const c=q[n];if(dw[c]>=18)continue;for(const o of[1,-1,V,-V]){const t=c+o;if(t>=0&&t<NV&&dw[t]===255){dw[t]=dw[c]+1;q.push(t)}}}}
 // 4) ESTRADAS: Dijkstra que foge de declives (e de água; rios só com ponte) -> perfil suave e limitado
 // portões da vila: ângulos 0/90/180/270 (x=cos a, z=sin a), a ~25 m do centro; as estradas nascem NELES, não da muralha
 const vx0=vil%V,vz0=(vil/V)|0,gateCells=[];
 for(let q=0;q<4;q++){const an=q*Math.PI/2;let g0=-1;
  for(const d of[VILLAGE_R+4,VILLAGE_R+6,VILLAGE_R+9,VILLAGE_R+12]){const i=vx0+Math.round(Math.cos(an)*d),j=vz0+Math.round(Math.sin(an)*d);if(i<2||j<2||i>=N-1||j>=N-1)continue;const k=j*V+i;if(lab[k]===mainL&&H[k]>.5){g0=k;break}}
  if(g0>=0)gateCells.push(g0)}
 if(!gateCells.length)gateCells.push(vil);
 const isSrc=new Set(gateCells);
 const dij=srcs=>{const D=new Float32Array(NV).fill(1e9),par=new Int32Array(NV).fill(-1),hp=mkHeap();
  for(const src of srcs){D[src]=0;hp.push(0,src)}
  while(hp.n()){const c0=hp.top(),k=hp.pop();if(c0>D[k])continue;const ci=k%V,cj=(k/V)|0;
   for(const[a,b,ds]of NB){const ni=ci+a,nj=cj+b;if(ni<1||nj<1||ni>=N||nj>=N)continue;const t=nj*V+ni;if(lab[t]!==mainL||wk[t]===2||cb[t]||(H[t]<.5&&!wk[t]))continue;
    const dh=Math.abs(H0[t]-H0[k]),c=D[k]+ds*(1+rn[t]+(wd[t]?6:0)+(wk[t]?14:0))+dh*6+Math.max(0,dh/ds-.2)*60;
    if(c<D[t]){D[t]=c;par[t]=k;hp.push(c,t)}}}
  par.D=D;return par};
 const par=dij(gateCells),rc=k=>k===vil||isSrc.has(k)||par[k]>=0,rcl=cells.filter(rc);
 // destinos sempre alcançáveis pela malha de estradas (evita retas atravessando a ilha)
 if(!rc(port))return build(seed+'x',type);
 const FL=planFields({N,V,H,sl,wd,wk,rv,D:par.D,lab,mainL},core);
 const pathTo=dst=>{const a=[];let k=dst;for(;k!==-1&&k!==vil&&!isSrc.has(k);k=par[k])a.push(k);
  if(k!==-1&&k!==vil){a.push(k);const gx=k%V,gz=(k/V)|0,L=Math.max(Math.abs(gx-vx0),Math.abs(gz-vz0));for(let i=1;i<L;i++)a.push(Math.round(gz+(vz0-gz)*i/L)*V+Math.round(gx+(vx0-gx)*i/L))}
  a.push(vil);return a.reverse()};
 const vx=vil%V,vz=(vil/V)|0,hv0=avg(vx,vz,3),roads=[];
 const mkRoad=(name,dst,pr1)=>{
  const cp=pathTo(dst);let m=0,pre=null;
  for(const q of roads){if(q.noM)continue;let t=0;while(t+1<q.cp.length&&t+1<cp.length&&q.cp[t+1]===cp[t+1])t++;if(t>m){m=t;pre=q}}
  const sub=cp.slice(m);let xs=sub.map(k=>k%V),zs=sub.map(k=>(k/V)|0),h0=hv0;
  if(pre){xs[0]=pre.xs[m];zs[0]=pre.zs[m];h0=pre.hs[m]}
  xs=sm(xs,6,3);zs=sm(zs,6,3);const n=xs.length,seg=[0];for(let i=1;i<n;i++)seg.push(Math.hypot(xs[i]-xs[i-1],zs[i]-zs[i-1])||1e-3);
  let hs=sm(xs.map((x,i)=>bil(x,zs[i])),14,3);const h1=avg(xs[n-1],zs[n-1],2),Lb=Math.max(1,Math.min(n-1,40));
  for(let i=0;i<n;i++)hs[i]+=(h0-hs[0])*(1-ss(0,1,i/Lb))+(h1-hs[n-1])*(1-ss(0,1,(n-1-i)/Lb));
  const pin=new Uint8Array(n),pr0=pre?0:9;pin[0]=pin[n-1]=1;
  for(let i=0;i<n;i++){if(Math.hypot(xs[i]-xs[0],zs[i]-zs[0])<=pr0){pin[i]=1;hs[i]=h0}if(Math.hypot(xs[i]-xs[n-1],zs[i]-zs[n-1])<=pr1){pin[i]=1;hs[i]=h1}}
  if(pre){for(let i=1;i<n;i++){let bd=1e9,bq=0;for(let q=0;q<pre.xs.length;q++){const d=Math.hypot(xs[i]-pre.xs[q],zs[i]-pre.zs[q]);if(d<bd){bd=d;bq=q}}if(bd>=2*RD.half+3)break;pin[i]=1;hs[i]=pre.hs[bq]}}
  for(let it=0;it<600;it++){let ch=0;for(let i=1;i<n;i++){const d=hs[i]-hs[i-1],s=RD.slope*seg[i],ad=Math.abs(d);if(ad>s+1e-4){const wl=pin[i-1]?0:1,wr=pin[i]?0:1,sw=wl+wr;if(!sw)continue;const e=(ad-s)*Math.sign(d);hs[i-1]+=e*wl/sw;hs[i]-=e*wr/sw;ch=1}}if(!ch)break}
  hs=sm(hs,5,2);
  const pl=pre?m:0,full={name,cp,xs:pre?pre.xs.slice(0,m).concat(xs):xs,zs:pre?pre.zs.slice(0,m).concat(zs):zs,hs:pre?pre.hs.slice(0,m).concat(hs):hs,sub:{xs,zs,hs}};
  roads.push(full);return full};
 // rede de estradas: tronco (porto e castelo), ramais (fazendas) e trilhas (acampamentos e dungeons), todas pelo caminho de menor esforço; trechos comuns se fundem
 const RS=[],near4=(x,z)=>{x=Math.round(x);z=Math.round(z);let b=-1,bd=1e9;for(let a=-8;a<=8;a++)for(let c=-8;c<=8;c++){const k=(z+c)*V+x+a;if(k>0&&k<NV&&par[k]>=0&&H[k]>.8&&!wk[k]&&Math.hypot(a,c)<bd){bd=Math.hypot(a,c);b=k}}return b>=0?b:rcl.reduce((q,k)=>Math.hypot(k%V-x,(k/V|0)-z)<Math.hypot(q%V-x,(q/V|0)-z)?k:q)};
 const addRoad=(name,x,z,half,pr1,kind)=>{const dst=near4(x,z);if(dst===vil)return null;const R=mkRoad(name,dst,pr1);R.half=half;R.pr=pr1;R.kind=kind;RS.push(R);return R};
 const rP=addRoad('Porto',port%V,(port/V)|0,3.2,3,'tronco');
 const rC=addRoad('Castelo',core.castle.x+Math.sin(core.castle.th)*29.5,core.castle.z+Math.cos(core.castle.th)*29.5,3.2,5,'tronco');if(rC)rC.noM=1;
 core.farms.forEach((f,i)=>{const R=addRoad('Fazenda '+(i+1),f.x,f.z,2.2,4,'ramal');if(R)f.k=R.cp[R.cp.length-1]});
 FL.camps.forEach((q,i)=>addRoad('Acampamento '+(i+1),q.x,q.z,1.5,3.2,'trilha'));
 FL.dungeons.forEach((q,i)=>addRoad('Dungeon '+(i+1),q.x+q.dx*4,q.z+q.dz*4,1.5,3,'trilha'));
 const pm=new Uint8Array(NV);
 const carve=(xs,zs,hs,half,sh,mk)=>{const R=half+sh,n=xs.length,bd=new Float32Array(NV).fill(1e9),bh=new Float32Array(NV);
  for(let s=0;s<Math.max(1,n-1);s++){const e=Math.min(s+1,n-1),ax=xs[s],az=zs[s],bx=xs[e],bz=zs[e],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz;
   const i0=Math.max(1,Math.floor(Math.min(ax,bx)-R)),i1=Math.min(N-1,Math.ceil(Math.max(ax,bx)+R)),j0=Math.max(1,Math.floor(Math.min(az,bz)-R)),j1=Math.min(N-1,Math.ceil(Math.max(az,bz)+R));
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=L2>0?Math.min(1,Math.max(0,((i-ax)*dx+(j-az)*dz)/L2)):0,d=Math.hypot(i-(ax+dx*t),j-(az+dz*t)),k=j*V+i;if(d<bd[k]){bd[k]=d;bh[k]=hs[s]+(hs[e]-hs[s])*t}}}
  for(let k=0;k<NV;k++)if(bd[k]<R&&!wk[k]){const lf=ss(-.3,.3,H0[k]),w=(1-ss(half,R,bd[k]))*lf;H[k]=H[k]*(1-w)+bh[k]*w;
   if(bd[k]<=half&&lf>.5){if(mk===1)pm[k]=1;else if(!pm[k])pm[k]=2}else if(bd[k]<=half+1.5&&lf>.5&&!pm[k])pm[k]=2}};
 const end=(R)=>{const n=R.sub.xs.length-1;return[R.sub.xs[n],R.sub.zs[n],R.sub.hs[n]]};
 carve([vx],[vz],[hv0],9,5,2);
 for(const R of RS){const[ex,ez,eh]=end(R);carve([ex],[ez],[eh],R.pr,4,2)}
 for(const R of RS)carve(R.sub.xs,R.sub.zs,R.sub.hs,R.half||RD.half,RD.sh,1);
 // 4b) PONTES onde a estrada cruza rio (convés nivelado acima da água) + convés caminhável
 const deck=new Float32Array(NV).fill(-99),bridges=[];
 for(const R of RS){const{xs,zs,hs}=R.sub,n=xs.length,wet=xs.map((x,i)=>wk[Math.round(zs[i])*V+Math.round(x)]===1);
  let i=0;while(i<n){if(!wet[i]){i++;continue}let a=i,b=i;
   for(;;){let g=b+1;while(g<n&&!wet[g]&&g-b<=3)g++;if(g<n&&wet[g])b=g;else break}
   const s0=Math.max(0,a-3),s1=Math.min(n-1,b+3);
   for(let q=s0;q<s1;q++){const mx=(xs[q]+xs[q+1])/2,mz=(zs[q]+zs[q+1])/2,dx=xs[q+1]-xs[q],dz=zs[q+1]-zs[q],L=Math.hypot(dx,dz)||1e-3,kk=Math.round(mz)*V+Math.round(mx),y=Math.max((hs[q]+hs[q+1])/2,(W[kk]>-90?W[kk]:0)+.55);
    bridges.push([+(mx-N/2).toFixed(2),+(mz-N/2).toFixed(2),+y.toFixed(2),Math.atan2(-dz,dx),L]);
    for(let j=Math.round(mz)-3;j<=Math.round(mz)+3;j++)for(let ii=Math.round(mx)-3;ii<=Math.round(mx)+3;ii++)if(ii>0&&j>0&&ii<N&&j<N&&Math.hypot(ii-mx,j-mz)<=RD.half+.3){const k=j*V+ii;deck[k]=Math.max(deck[k],y)}}
   i=b+1}}
 // 4c) BIOMAS: umidade (ruído + proximidade da água) x altitude
 const nm=mkNoise(r),mo=new Float32Array(NV),bio=new Uint8Array(NV),bc=[0,0,0,0,0,0];
 for(let j=0;j<V;j++)for(let i=0;i<V;i++){const k=j*V+i;let m=(nm(i*.07*sc+ox,j*.07*sc+oy)-.5)*1.8+.5;if(dw[k]<18)m+=.3*(1-dw[k]/18);mo[k]=Math.min(1,Math.max(0,m))}
 for(let k=0;k<NV;k++){const h=H[k];let b;
  if(h<.85||wd[k])b=0;else if(h>6.2)b=5;else if(mo[k]>.66&&h<1.6)b=3;else if(mo[k]>.52)b=2;else if(mo[k]<.36)b=4;else b=1;bio[k]=b;if(h>.3)bc[b]++}
 const cx=k=>k%V-N/2,cz=k=>(k/V|0)-N/2;
 const sd=coastOf(port)||[0,1],dx=sd[0],dz=sd[1];
 const pois=[['Porto',port,'#4ad0e8'],['Vila',vil,'#f0a040']].map(([n,k,c])=>({n,k,x:cx(k),z:cz(k),y:H[k],c}));
 // 5) vegetação por bioma (fora de estradas, praças e água)
 const veg={palms:[],pines:[],rocks:[],bushes:[]},near=(x,z)=>pois.some(p=>(p.x-x)**2+(p.z-z)**2<64);
 const DEN=[[.012,0,.004,.002],[0,.004,.02,.002],[0,.07,.035,.003],[0,.006,.06,.0008],[.014,.002,.03,.006],[0,.012,.004,.05]],BCOL=[0x6aa050,0x5fa04a,0x2f7a3a,0x4a5a30,0x9a9a45,0x6a7a5a];
 for(let k=V+1;k<NV-V-1;k++){if(H[k]<=.35||pm[k]||W[k]>-90)continue;const x=cx(k)+r()-.5,z=cz(k)+r()-.5,h=H[k],p=r();if(near(x,z))continue;
  const b=bio[k],d=DEN[b],f=nw((k%V)*.24*sc+ox,(k/V|0)*.24*sc+oy),cm=f>.52?2.4:.45,c0=d[0]*cm,c1=c0+d[1]*cm,c2=c1+d[2]*cm,c3=c2+d[3];
  if(p<c0){if(veg.palms.length<4000)veg.palms.push([x,z,.8+r()*.5,(r()-.5)*.3,r()*6])}
  else if(p<c1){if(veg.pines.length<7000)veg.pines.push([x,z,.7+r()*.6,0,r()*6])}
  else if(p<c2){if(veg.bushes.length<7000)veg.bushes.push([x,z,.5+r()*.5,0,r()*6,BCOL[b]])}
  else if(p<c3||(sl(k)>.18&&p>.97)){if(veg.rocks.length<2500)veg.rocks.push([x,z,.5+r()*.9,0,r()*6])}}
 // 6) malha de navegação: bloqueia mar, água funda e paredões (convés das pontes é liberado)
 const nav=new Uint8Array(NV);for(let k=V+1;k<NV-V-1;k++)if(cb[k]||H[k]<-.1||(W[k]>-90&&W[k]-H[k]>.35)||sl(k)>.7)nav[k]=1;
 for(let k=0;k<NV;k++)if(deck[k]>-90)nav[k]=0;
 const out=R=>({n:R.name,kind:R.kind,half:R.half,pts:R.xs.map((x,i)=>[+(x-N/2).toFixed(2),+(R.zs[i]-N/2).toFixed(2),+R.hs[i].toFixed(2)])});
 return{H,pm,W,wk,mo,bio,nav,deck,bridges,pois,veg,seed,type,land:land/NV,port:{dx,dz},layout:{dock:{dx:core.dock[0],dz:core.dock[1]},castle:{x:core.castle.x-N/2,z:core.castle.z-N/2,th:core.castle.th},farms:core.farms.map(f=>({x:f.x-N/2,z:f.z-N/2,k:f.k})),camps:FL.camps.map(q=>({x:q.x-N/2,z:q.z-N/2,t:q.t,tier:q.tier})),dungeons:FL.dungeons.map(q=>({x:q.x-N/2,z:q.z-N/2,dx:q.dx,dz:q.dz,t:q.t})),dmax:FL.dmax},roads:RS.map(out),rivers,lakes,biomeShare:bc.map(v=>v/Math.max(1,land)),roadHalf:RD.half}}
