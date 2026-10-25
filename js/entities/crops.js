/* Biblioteca de plantas e legumes low poly (50+ culturas × 7 fases: semente, broto, muda, crescimento, floração, frutificação, colheita).
   Portada do "Legumes low poly" do Cristiano. Cada fase vira UMA malha fundida (cores por vértice) e é compartilhada entre as plantas da lavoura. */
const T = THREE, V3 = T.Vector3;
function hash(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s)}
function P(geo,o={}){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(o.fn)[x,y,z]=o.fn(x,y,z);
    if(o.j){const h=o.j;x+=(hash(x,y,z)-.5)*h;y+=(hash(y,z,x)-.5)*h;z+=(hash(z,x,y)-.5)*h}
    p.setXYZ(i,x,y,z)}
  const g=geo.toNonIndexed(),q=g.attributes.position,col=new Float32Array(q.count*3);
  const a=new T.Color(o.c1),b=new T.Color(o.c2??o.c1),y0=o.y0??-1,y1=o.y1??1;
  for(let i=0;i<q.count;i+=3){
    const f=.9+hash(i,3,7)*.2,cy=(q.getY(i)+q.getY(i+1)+q.getY(i+2))/3;
    const t=Math.min(1,Math.max(0,(cy-y0)/(y1-y0))),c=(o.cf?new T.Color(o.cf((q.getX(i)+q.getX(i+1)+q.getX(i+2))/3,cy,(q.getZ(i)+q.getZ(i+1)+q.getZ(i+2))/3)):a.clone().lerp(b,t)).multiplyScalar(f);
    for(let k=0;k<3;k++)col.set([c.r,c.g,c.b],(i+k)*3)}
  g.setAttribute('color',new T.BufferAttribute(col,3));g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:o.r??.7}));
  m.castShadow=true;return m}
const up=new V3(0,1,0);
function orient(o,dir,pos){o.quaternion.setFromUnitVectors(up,dir.clone().normalize());o.position.copy(pos);return o}
function leaf(c1,c2,len=.5,w=.14){const g=new T.Group(),m=P(new T.OctahedronGeometry(1,0),{c1,c2});m.scale.set(w,len,w*.3);m.position.y=len;g.add(m);return g}
function stem(c1,c2,r0,r1,len,seg=5,segs=1){return P(new T.CylinderGeometry(r1,r0,len,seg,segs),{c1,c2,y0:-len/2,y1:len/2,j:.01})}
const ang=(a)=>Math.atan2(a.z,a.x);

const V={
Cenoura(){const g=new T.Group();g.add(P(new T.CylinderGeometry(.5,.04,2.4,6,1),{c1:0xe05a14,c2:0xf59030,y0:-1.2,y1:1.2}));
  for(let i=0;i<3;i++){const a=i*2.1,l=P(new T.ConeGeometry(.2,1.1,5,1),{c1:0x2f9a34,c2:0x5ac844,y0:-.55,y1:.55});l.position.set(Math.cos(a)*.2,1.7,Math.sin(a)*.2);l.rotation.set(Math.sin(a)*.35,0,-Math.cos(a)*.35);g.add(l)}return g},
Tomate(){const g=new T.Group(),b=P(new T.IcosahedronGeometry(1,1),{c1:0xc42418,c2:0xe8402c,r:.5});b.scale.y=.85;g.add(b);
  for(let i=0;i<5;i++){const a=i/5*6.28;g.add(orient(leaf(0x2a8a2a,0x4aaa3a,.4,.17),new V3(Math.cos(a)*.9,.35,Math.sin(a)*.9),new V3(0,.8,0)))}
  const s=stem(0x3a8a2e,0x5aa040,.06,.05,.3,5);s.position.y=.95;g.add(s);return g},
Berinjela(){const g=new T.Group(),b=P(new T.SphereGeometry(.65,8,6),{c1:0x3a1458,c2:0x6a2e94,y0:-.65,y1:.65,r:.35});b.scale.set(1,1.75,1);g.add(b);
  const c=P(new T.ConeGeometry(.5,.45,6),{c1:0x2f8a2f,c2:0x4aa83a});c.rotation.x=Math.PI;c.position.y=1.0;g.add(c);
  const s=stem(0x3a8a2e,0x5aa040,.07,.09,.5,5);s.position.y=1.45;g.add(s);return g},
Brócolis(){const g=new T.Group(),s=stem(0x9ad070,0xb4e088,.3,.2,1.1,6);s.position.y=-.6;g.add(s);
  [[0,.55,0,.62],[.5,.25,.15,.42],[-.5,.25,-.15,.42],[.1,.25,.5,.4],[-.1,.25,-.5,.4]].forEach(p=>{const m=P(new T.IcosahedronGeometry(p[3],0),{c1:0x1f7a30,c2:0x45a040,y0:-.2,y1:1,j:.05});m.position.set(p[0],p[1],p[2]);g.add(m)});return g},
Batata(){const g=new T.Group(),b=P(new T.IcosahedronGeometry(.9,1),{c1:0xb2824a,c2:0xd0a468,y0:-.7,y1:.7,r:.9,j:.05});b.scale.set(1.3,.8,.95);g.add(b);
  [[.5,.5,.5],[-.5,.4,.6],[.1,.7,-.5]].forEach(q=>{const e=P(new T.OctahedronGeometry(.08,0),{c1:0x4a3018});e.position.set(q[0]*1.1,q[1]*.8,q[2]*.9);g.add(e)});return g},
Pimentão(){const g=new T.Group(),b=P(new T.SphereGeometry(1,8,6),{c1:0xc81e14,c2:0xec4026,r:.4,fn:(x,y,z)=>{const k=y<0?1+.3*y:1;return[x*.9*k,y*1.1,z*.9*k]}});g.add(b);
  const cap=P(new T.CylinderGeometry(.25,.34,.14,6),{c1:0x2a7a2a,c2:0x4a9a3a});cap.position.y=1.12;g.add(cap);
  const s=stem(0x3a8a2e,0x6aa840,.08,.12,.45,5);s.position.set(.04,1.35,0);s.rotation.z=-.2;g.add(s);return g},
Milho(){const g=new T.Group();g.add(P(new T.CylinderGeometry(.22,.4,2.1,8,1),{c1:0xe8b012,c2:0xf5d040,y0:-1,y1:1,r:.5}));
  const rows=6,ar=6,im=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({flatShading:true,roughness:.45}),rows*ar),o=new T.Object3D();let n=0;
  for(let j=0;j<rows;j++){const t=j/(rows-1),y=-.85+t*1.8,r=.4-.18*(y+1.05)/2.1+.04;for(let i=0;i<ar;i++){const a=(i+(j%2)*.5)/ar*6.28;o.position.set(Math.cos(a)*r,y,Math.sin(a)*r);o.rotation.set(0,Math.PI/2-a,0);o.scale.set(6.28*r/ar*.92,.19,.13);o.updateMatrix();im.setMatrixAt(n,o.matrix);im.setColorAt(n,new T.Color(0xf8cc2a).lerp(new T.Color(0xe8a81c),hash(i,j,9)*.6));n++}}
  im.castShadow=true;g.add(im);
  for(let i=0;i<3;i++){const h=P(new T.ConeGeometry(.55,1.7,4,1),{c1:0x4a9a32,c2:0x86c452,y0:-.85,y1:.85});h.scale.set(.3,1,1.3);h.position.set(.38,-.5,0);h.rotation.z=-.12;const w=new T.Group();w.rotation.y=i*2.1+.5;w.add(h);g.add(w)}
  const s=stem(0xc8d890,0xe0e8a8,.13,.17,.35,7);s.position.y=-1.3;g.add(s);return g},
Abóbora(){const g=new T.Group(),b=P(new T.SphereGeometry(1,12,8),{c1:0xd0600c,c2:0xf49220,r:.55,fn:(x,y,z)=>{const k=1+.1*Math.cos(6*Math.atan2(z,x));return[x*k,y*.8,z*k]}});g.add(b);
  const s=stem(0x6a7a2a,0x9a9a44,.1,.16,.5,5);s.position.set(.05,.85,0);s.rotation.z=-.2;g.add(s);return g},
Cebola(){const g=new T.Group(),pts=[[0,-.85],[.55,-.7],[.85,-.1],[.7,.5],[.25,1.0],[0,1.45]].map(p=>new T.Vector2(p[0],p[1]));
  g.add(P(new T.LatheGeometry(pts,8),{c1:0xa8481a,c2:0xe0a458,y0:-.85,y1:1.2,r:.6}));
  for(let i=0;i<6;i++){const a=i/6*6.28,r=stem(0xe8dcc0,0xf4ead0,.015,.01,.3,3);orient(r,new V3(Math.cos(a)*.4,-1,Math.sin(a)*.4),new V3(Math.cos(a)*.1,-.95,Math.sin(a)*.1));g.add(r)}return g}
};
const ST=['Semente','Broto','Muda','Crescimento','Floração','Frutificação','Colheita'];
function recolor(o,c){const k=new T.Color(c);o.traverse(m=>{const a=m.geometry&&m.geometry.attributes.color;if(!a||m.isInstancedMesh)return;for(let i=0;i<a.count;i+=3){const f=.9+hash(i,4,m.id)*.2;for(let j=0;j<3;j++)a.setXYZ(i+j,k.r*f,k.g*f,k.b*f)}a.needsUpdate=true});return o}
function soil(clear,d){const g=new T.Group(),m=P(new T.CylinderGeometry(1.5,1.4,d,10),{c1:0x4a2f1a,c2:0x70492a,y0:-d,y1:0,j:.04});m.position.y=-d/2;if(clear){m.material.transparent=true;m.material.opacity=.32;m.material.depthWrite=false}m.castShadow=false;g.add(m);return g}
function seedBit(g){const m=P(new T.SphereGeometry(.35,7,4),{c1:0x4a2f1a,c2:0x6b4528,j:.03});m.scale.y=.35;g.add(m);const s=P(new T.OctahedronGeometry(.1,0),{c1:0xd8c090});s.scale.set(1,.6,.7);s.position.y=.12;g.add(s)}
function limb(c1,c2,r0,r1,a,b,seg=5){const l=a.distanceTo(b),s=stem(c1,c2,r0,r1,l,seg);return orient(s,b.clone().sub(a),a.clone().add(b).multiplyScalar(.5))}
function flower(c){const g=new T.Group();for(let i=0;i<5;i++){const a=i/5*6.28,p=P(new T.OctahedronGeometry(1,0),{c1:c});p.scale.set(.1,.02,.045);p.position.set(Math.cos(a)*.09,0,Math.sin(a)*.09);p.rotation.y=-a;g.add(p)}g.add(P(new T.IcosahedronGeometry(.04,0),{c1:0xe8b020}));return g}
function cots(g,H,c=0x4aa040){[-1,1].forEach(q=>g.add(orient(leaf(c,0x7ad060,.22,.07),new V3(q,.5,0),new V3(0,H,0))))}
const O=new V3(0,0,0);
function fp(o){return t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=o.h[t];g.add(limb(0x3a8a2e,0x6aa840,.07+.02*t,.055+.016*t,O,new V3(0,H,0),6));if(o.stake&&t>=3)g.add(limb(0xa8824a,0xc09a5e,.04,.035,new V3(-.3,0,-.2),new V3(-.3,H+.5,-.2),4));
  if(t==1){cots(g,H);return g}
  for(let i=0;i<o.nl[t];i++){const a=i*2.4,y=H*(.12+.88*i/o.nl[t]);g.add(orient(leaf(o.lc,o.lc2,o.ls*(.45+.55*Math.min(1,t/3)),o.lw),new V3(Math.cos(a)*.9,.35,Math.sin(a)*.9),new V3(0,y,0)))}
  if(t==4||t==5){const n=t==4?o.nf:o.nf>>1;for(let i=0;i<n;i++){const f=flower(o.fc),a=i*2.2;f.position.set(Math.cos(a)*.3,H*(.5+.12*(i%4)),Math.sin(a)*.3);g.add(f)}}
  if(t>=5)for(let i=0;i<o.nfr;i++){const a=i*2.3+.6,fr=V[o.fruit]();fr.scale.setScalar(o.fs*(t==5?.5:1));fr.position.set(Math.cos(a)*.5,H*(.38+.1*(i%4)),Math.sin(a)*.5);if(t==5||(o.mix&&i%3==0))recolor(fr,o.unripe);g.add(fr)}
  return g}}
function head(g,size,y){for(let k=0;k<7;k++){const off=k?new V3(hash(k,1,2)-.5,hash(k,2,3)*.5,hash(k,3,4)-.5).multiplyScalar(size*1.8):O,m=P(new T.IcosahedronGeometry(size*(k?.5+.3*hash(k,5,1):.8),1),{c1:0x1f6a2e,c2:0x58ad4c,y0:-.3,y1:.5,j:.07});m.position.set(off.x,y+size*.6+off.y,off.z);g.add(m)}}
const bp=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=[0,.15,.2,.55,.6,.6,.6][t];g.add(limb(0x84b85a,0xa4d078,.07,.05,O,new V3(0,H,0),6));if(t==1){cots(g,H);return g}
  const nl=[0,0,4,7,7,7,7][t],ls=[0,0,.3,.7,.75,.8,.8][t];
  for(let i=0;i<nl;i++){const a=i*2.4;g.add(orient(leaf(0x2f6a4a,0x6aa070,ls,.42),new V3(Math.cos(a)*.9,.55,Math.sin(a)*.9),new V3(0,H*(.2+.7*i/nl),0)))}
  if(t>=4)head(g,[0,0,0,0,.18,.4,.62][t],H);return g};
const mp=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  if(t==1){[-1,1].forEach(q=>g.add(orient(leaf(0x4aa040,0x7ad060,.3,.05),new V3(q*.3,1,0),O)));return g}
  const H=[0,.3,.7,2,3,3.1,3.1][t];g.add(limb(0x5aa040,0x8ac050,.1,.07,O,new V3(0,H,0),6));
  const nl=[0,0,4,8,10,10,10][t],ls=[0,0,.45,.85,.95,.95,.95][t];
  for(let i=0;i<nl;i++){const a=i*2.4;g.add(orient(leaf(0x3a8a30,0x6ab040,ls,.18),new V3(Math.cos(a)*.9,.5,Math.sin(a)*.9),new V3(0,H*(.15+.75*i/nl),0)))}
  if(t>=4)for(let k=0;k<8;k++){const a=k*.8,e=new V3(Math.cos(a)*.35,H+.5,Math.sin(a)*.35);g.add(limb(0xd8c070,0xe8d890,.02,.012,new V3(0,H,0),e,4));const p=P(new T.IcosahedronGeometry(.05,0),{c1:0xe8c850});p.position.copy(e);g.add(p)}
  if(t>=5)[[.22,.52,0,-.5],[-.2,.4,.1,.5]].forEach(q=>{const e=V.Milho();e.scale.setScalar(t==5?.42:.65);e.position.set(q[0],H*q[1],q[2]);e.rotation.z=q[3];if(t==5){e.traverse(o=>{if(o.isInstancedMesh)o.visible=false});recolor(e,0x9ac060)}g.add(e)});
  return g};
function root(sc){const m=P(new T.CylinderGeometry(.42,.03,2.4,8,10),{c1:0xd0501a,c2:0xf28a30,y0:-1.2,y1:1.2,j:.025,fn:(x,y,z)=>{const t=(y+1.2)/2.4,k=1+.05*Math.sin(y*13)+.1*(1-t)*Math.sin(y*5);return[x*k+.14*(1-t)*(1-t),y,z*k]}});m.scale.setScalar(sc);m.position.y=-1.2*sc;return m}
function greens(g,gs,n){const base=new V3(0,.02,0);for(let i=0;i<n;i++){const a=i/n*6.28,tl=.3+.3*hash(i,1,1),d=new V3(Math.sin(tl)*Math.cos(a),Math.cos(tl),Math.sin(tl)*Math.sin(a)),side=new V3(-Math.sin(a),0,Math.cos(a));g.add(limb(0x2f8a2f,0x4aa83a,.05,.025,base,base.clone().addScaledVector(d,1.2*gs)));for(let k=0;k<4;k++){const ld=d.clone().multiplyScalar(.8).addScaledVector(side,(k%2?1:-1)*.8);g.add(orient(leaf(0x2f8a2f,0x56b845,.3*gs,.16*gs+.03),ld,base.clone().addScaledVector(d,(.3+.22*k)*gs)))}}}
const cp=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  if(t==1){cots(g,.35);g.add(limb(0x3a8a2e,0x5aa040,.03,.02,O,new V3(0,.35,0)));g.add(root(.08));return g}
  g.add(root([0,0,.12,.55,.8,.95,1][t]));greens(g,[0,0,.35,.9,1,1,1][t],[0,0,3,5,5,5,5][t]);
  if(t>=4){const H=2.2,top=new V3(0,H,0),um=new T.Group();g.add(limb(0x4a8a3a,0x6aa84a,.04,.025,O,top,5));
    for(let k=0;k<10;k++){const a=k*.63+.2,e=new V3(Math.cos(a)*.38,H+.18,Math.sin(a)*.38);um.add(limb(0x6a9a4a,0x8ab860,.012,.008,top,e,3));const f=P(new T.IcosahedronGeometry(.1,0),{c1:0xf8f8f0});f.position.copy(e);um.add(f)}
    if(t==5)recolor(um,0xa88a50);if(t==6)recolor(um,0x6a4a28);g.add(um)}
  return g};
function bl(g,p,r){const q=p.clone().add(new V3(0,.5,0));g.add(limb(0x4a8a2a,0x6aa83a,.025,.02,p,q));const d=P(new T.CylinderGeometry(r,r*.85,.03,7),{c1:0x2f7a2a,c2:0x5aa83a,j:.03});d.position.copy(q).add(new V3(0,.02,0));d.rotation.x=.18;g.add(d)}
const apf=o=>t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  if(t<3){const H=[0,.28,.5][t];g.add(limb(0x4a8a2a,0x6aa83a,.04,.03,O,new V3(0,H,0)));if(t==1)cots(g,H);else for(let i=0;i<3;i++){const a=i*2.1;bl(g,new V3(Math.cos(a)*.1,0,Math.sin(a)*.1),.2)}return g}
  const LL=[0,0,0,1.6,2.4,2.6,2.6][t],pts=[];for(let i=0;i<=8;i++)pts.push(new V3(-LL/2+LL*i/8,.06,.3*Math.sin(i*.8)));
  for(let i=0;i<8;i++)g.add(limb(0x4a8a2a,0x5a9a30,.05,.04,pts[i],pts[i+1],6));
  [1,3,5,7].forEach(i=>bl(g,pts[i].clone().add(new V3(0,0,i%4==1?.12:-.12)),t==3?.34:.5));
  if(t==4)[2,5,7].forEach(i=>{const f=P(new T.CylinderGeometry(.14,.04,.3,6),{c1:0xf0b020,c2:0xffd040,j:.02});f.position.copy(pts[i]).add(new V3(0,.3,.4));g.add(f)});
  if(t>=5)[3,6].forEach(i=>{const fr=V[o.fruit](),sc=t==5?o.f5:o.f6;fr.scale.setScalar(sc);fr.position.copy(pts[i]).add(new V3(0,.8*sc,.8));if(t==5)recolor(fr,o.unripe);g.add(fr)});
  return g};
const ap=apf({fruit:'Abóbora',f5:.22,f6:.4,unripe:0x5a8a3a});
const op=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  if(t==1){g.add(limb(0x3a9a3a,0x66bb44,.03,.02,O,new V3(0,.35,0)));g.add(limb(0x3a9a3a,0x66bb44,.02,.015,new V3(0,.35,0),new V3(.12,.5,0)));return g}
  const sc=[0,0,.1,.38,.55,.65,.8][t],b=V.Cebola();b.scale.setScalar(sc);b.position.y=sc*.8;g.add(b);
  const y0=sc*2.2,n=[0,0,3,5,6,6,6][t],LL=[0,0,.9,1.5,1.8,1.8,1.3][t];
  for(let i=0;i<n;i++){const a=i/n*6.28,p0=new V3(0,y0,0);let ls=[];
    if(t==6){const p1=p0.clone().add(new V3(Math.cos(a)*.1,.5,Math.sin(a)*.1));ls=[limb(0x6a9a3a,0xb8a040,.05,.045,p0,p1),limb(0xb8a040,0xc8b050,.045,.03,p1,p1.clone().add(new V3(Math.cos(a)*.7,-.3,Math.sin(a)*.7)))]}
    else ls=[limb(0x3a9a3a,0x66bb44,.055,.04,p0,p0.clone().add(new V3(Math.cos(a)*.2,1,Math.sin(a)*.2).normalize().multiplyScalar(LL)))];
    if(t==5&&i%2==0)ls.forEach(m=>recolor(m,0x9ab04a));ls.forEach(m=>g.add(m))}
  if(t==4||t==5){const top=new V3(0,y0+1.9,0);g.add(limb(0x5aa040,0x7ac060,.06,.04,new V3(0,y0,0),top,6));const um=new T.Group();
    for(let k=0;k<26;k++){const d=new V3(hash(k,1,2)-.5,hash(k,2,3)-.5,hash(k,3,4)-.5).normalize().multiplyScalar(.3),f=P(new T.IcosahedronGeometry(.055,0),{c1:0xf0f0ff});f.position.copy(top).add(d).add(new V3(0,.15,0));um.add(f)}
    if(t==5)recolor(um,0x30302a);g.add(um)}
  return g};
const pp=t=>{const g=new T.Group(),tb=(p,sc)=>{const m=V.Batata();m.scale.setScalar(sc);m.position.copy(p);m.rotation.y=p.x*3;g.add(m)};
  if(t==0){seedBit(g);tb(new V3(0,-.45,0),.22);return g}
  if(t==1){tb(new V3(0,-.5,0),.25);[[.1,0],[-.12,.05]].forEach((q,i)=>{const H=.3+.1*i;g.add(limb(0x8a9a5a,0x5aa040,.03,.02,new V3(q[0],-.35,q[1]),new V3(q[0],H,q[1])));g.add(orient(leaf(0x3a8a3a,0x6ab050,.1,.05),new V3(q[0],1,0),new V3(q[0],H,q[1])))});return g}
  const H=[0,0,.7,1.2,1.5,1.5,1.2][t],ns=[0,0,1,3,4,4,4][t],nl=[0,0,3,4,5,5,5][t],col=t==5?0x8a9a3a:t==6?0xb09040:0,sp=t==6?1.8:1,hh=t==6?.7:1;
  for(let s=0;s<ns;s++){const a=s/ns*6.28+.5,top=new V3(Math.cos(a)*.4*sp*(ns>1),H*hh,Math.sin(a)*.4*sp*(ns>1)),st=limb(0x3a8a2e,0x6aa840,.05,.035,O,top,5);if(col)recolor(st,col);g.add(st);
    for(let i=0;i<nl;i++){const f=(i+1)/nl,pos=top.clone().multiplyScalar(f),lf=leaf(0x2e7d2e,0x58b04a,.34,.14);orient(lf,new V3(Math.cos(a+i*1.9)*.9,.3,Math.sin(a+i*1.9)*.9),pos);if(col)recolor(lf,col);g.add(lf)}
    if(t==4||t==5){const fl=flower(0xf4f0ff);fl.position.copy(top).add(new V3(0,.12,0));g.add(fl)}}
  if(t>=3){const sz=[0,0,0,.1,.18,.34,.5][t];for(let i=0;i<(t==3?3:t==4?2:t==5?4:5);i++){const a=i*1.3+.4,p=new V3(Math.cos(a)*.55,-.4-.05*(i%2),Math.sin(a)*.55);g.add(limb(0xc8b090,0xc8b090,.015,.015,new V3(0,-.15,0),p,3));tb(p,sz)}}
  return g};
const PL={
Cenoura:{f:cp,s:.7,d:2.6,clear:1},
Tomate:{f:fp({h:[0,.3,.7,1.4,2,2.1,2.1],nl:[0,0,3,5,6,6,6],ls:.55,lw:.24,stake:1,lc:0x2e7d2e,lc2:0x58b04a,fc:0xf4d020,nf:6,fruit:'Tomate',fs:.22,unripe:0x6aaa3a,nfr:6,mix:1}),s:.9,d:.6},
Berinjela:{f:fp({h:[0,.3,.7,1.3,1.8,1.9,1.9],nl:[0,0,3,5,6,6,6],ls:.6,lw:.26,lc:0x3a7a3a,lc2:0x62a050,fc:0x9a6ad0,nf:5,fruit:'Berinjela',fs:.27,unripe:0x7a4a9a,nfr:4}),s:.85,d:.6},
Brócolis:{f:bp,s:1,d:.6},
Batata:{f:pp,s:1,d:1,clear:1},
Pimentão:{f:fp({h:[0,.25,.6,1.1,1.5,1.6,1.6],nl:[0,0,3,5,6,6,6],ls:.5,lw:.22,lc:0x2e7d2e,lc2:0x5ab04a,fc:0xffffff,nf:6,fruit:'Pimentão',fs:.23,unripe:0x4a9a3a,nfr:5,mix:1}),s:1,d:.6},
Milho:{f:mp,s:.55,d:.6},
Abóbora:{f:ap,s:.9,d:.5},
Cebola:{f:op,s:1,d:.9,clear:1}};

const ov=(c1,c2,rx,ry,rz,o={})=>{const m=P(new T.SphereGeometry(1,o.sg||8,o.rg||6),{c1,c2,y0:-1,y1:1,r:o.r,fn:o.fn,cf:o.cf,j:o.j});m.scale.set(rx,ry,rz);return m};
const cy=(c1,c2,rt,rb,h,sg=6,o={})=>P(new T.CylinderGeometry(rt,rb,h,sg,o.hs||1),{c1,c2,y0:-h/2,y1:h/2,fn:o.fn});
const cn=(c1,c2,r,h,sg=6,o={})=>P(new T.ConeGeometry(r,h,sg,o.hs||1),{c1,c2,y0:-h/2,y1:h/2,fn:o.fn});
const at=(m,x,y,z)=>{m.position.set(x,y,z);return m};
const G=(...a)=>{const g=new T.Group();a.forEach(x=>g.add(x));return g};
const rb=(c1,c2,rx,ry,rz,n,amp,o={})=>ov(c1,c2,rx,ry,rz,{...o,fn:(x,y,z)=>{const k=1+amp*Math.cos(n*Math.atan2(z,x));return[x*k,y,z*k]}});
function rose(c1,c2,n,len,w,sp,up,y0=0,rings=1){const g=new T.Group();for(let r=0;r<rings;r++)for(let i=0;i<n;i++){const a=i/n*6.28+r*.5,k=1-r*.35;g.add(orient(leaf(c1,c2,len*k,w*k),new V3(Math.cos(a)*sp*k,up+r*.8,Math.sin(a)*sp*k),new V3(0,y0,0)))}return g}
function rootM(c1,c2,rx,ry,tl,tc,lc1,lc2,sc,nl,ll){const g=new T.Group();g.add(at(ov(c1,c2,rx,ry,rx),0,-ry,0));
  if(tl){const t=cn(tc,tc,rx*.2,tl,5);t.rotation.x=Math.PI;t.position.y=-2*ry-tl/2+ry*.3;g.add(t)}
  for(let i=0;i<nl;i++){const a=i/nl*6.28,e=new V3(Math.cos(a)*.35,1,Math.sin(a)*.35).normalize().multiplyScalar(ll*.55);g.add(limb(sc,sc,.045,.03,O,e,4));g.add(orient(leaf(lc1,lc2,ll*.55,ll*.24),new V3(Math.cos(a)*.5,1,Math.sin(a)*.5),e))}return g}
function earM(k){const g=new T.Group(),c=0xd0b040;
  if(k=='o'){for(let i=0;i<7;i++){const a=i*.9,e=new V3(Math.cos(a)*.22,.3+.07*(i%3),Math.sin(a)*.22);g.add(limb(c,c,.012,.01,O,e,3));g.add(at(ov(c,c,.05,.12,.05,{sg:5,rg:3}),e.x,e.y-.08,e.z))}return g}
  for(let i=0;i<9;i++){const x=(i%2-.5)*.08;g.add(at(ov(c,c,.075,.12,.055,{sg:5,rg:3}),x,.06+i*.07,0));const aw=k=='b'?.55:k=='w'?.2:0;if(aw)g.add(limb(c,c,.01,.005,new V3(x,.1+i*.07,0),new V3(x*2.5,.1+i*.07+aw,0),3))}
  if(k=='r')g.rotation.z=1.1;return g}
function stalks(k,c,h){const g=new T.Group();for(let i=0;i<3;i++){const x=(i-1)*.22,z=(i%2-.5)*.2,top=new V3(x,h,z);g.add(limb(c,c,.03,.025,new V3(x,0,z),top,5));const e=earM(k);e.position.copy(top);recolor(e,c);g.add(e);g.add(orient(leaf(0x7aa840,c,.6,.07),new V3(x*2,1,z*2+.6),new V3(x,h*.3,z)))}return g}
function sfHead(st){const g=new T.Group(),pc=st==6?0xb08a30:0xf4c020,dc=st==4?0x5a8a30:st==5?0x6a4a28:0x3a2a1a;g.add(cy(dc,dc,.42,.42,.14,10));for(let i=0;i<16;i++){const a=i/16*6.28,p=P(new T.OctahedronGeometry(1,0),{c1:pc});p.scale.set(.3,.03,.12);p.position.set(Math.cos(a)*.62,0,Math.sin(a)*.62);p.rotation.y=-a;g.add(p)}return g}
Object.assign(V,{
Beterraba:()=>rootM(0x6a0c34,0xa02050,.75,.7,.5,0x6a0c34,0x3a8a3a,0x6ab050,0xb02040,5,1.1),
Rabanete:()=>rootM(0xd01838,0xea3c52,.6,.6,.5,0xf0f0f0,0x2f8a3a,0x5ab048,0x6a9a3a,5,.9),
Nabo:()=>rootM(0xf4f0f4,0xb070b8,.8,.75,.4,0xf0ecf0,0x2f8a3a,0x5ab048,0x6a9a3a,5,.9),
Mandioca:()=>G(at(cy(0x6a4a2a,0x8a6a40,.3,.1,2.2,6),0,-1.1,0),at(cy(0xf4ecd8,0xf4ecd8,.28,.28,.05,6),0,.03,0)),
'Batata-doce':()=>G(at(ov(0x9a3a4a,0xc86a78,.5,.95,.5),0,-.95,0)),
Inhame:()=>G(at(ov(0x7a5a3a,0x9a7a52,.7,.55,.6),0,-.55,0),at(ov(0x6a4a2a,0x8a6a42,.45,.4,.4),.5,-.4,.2)),
Alho:()=>{const g=G(at(rb(0xf4f0e0,0xffffff,.8,.7,.8,6,.07),0,-.7,0),at(cn(0xe8e0d0,0xf8f4e8,.2,.5,6),0,.15,0));for(let i=0;i<6;i++){const a=i*1.05;g.add(orient(cy(0xe8dcc0,0xf4ead0,.01,.015,.3,3),new V3(Math.cos(a)*.3,-1,Math.sin(a)*.3),new V3(Math.cos(a)*.12,-1.45,Math.sin(a)*.12)))}return g},
Gengibre:()=>G(at(ov(0xc8a468,0xe0c488,.9,.3,.35),0,-.3,0),at(ov(0xc8a468,0xe0c488,.4,.25,.3),.7,-.25,.2),at(ov(0xc8a468,0xe0c488,.4,.25,.3),-.7,-.25,-.1),at(ov(0xb89458,0xd8b878,.45,.22,.25),.2,-.5,-.3)),
Alface:()=>rose(0x4aa83a,0x9ad868,9,.9,.5,.8,.6,0,2),
Repolho:()=>G(at(rb(0x6aa84a,0xa4d070,1,.9,1,5,.1,{sg:10,rg:8}),0,.9,0),rose(0x3a8a3a,0x5ab048,4,1,.6,.8,.4,.1,1)),
Couve:()=>G(at(cy(0xa0c880,0xb8dc90,.1,.12,.9,5),0,.45,0),rose(0x1f6a36,0x3a9a4a,7,1.2,.45,.55,1.1,.9,1)),
Espinafre:()=>rose(0x1f6a30,0x3a9040,9,.6,.32,.9,.5,0,1),
Rúcula:()=>rose(0x3a8a3a,0x78bc58,10,.8,.16,.6,.9,0,1),
'Couve-flor':()=>{const g=rose(0x4a9a3a,0x7ac050,6,1,.32,.35,1.2,0,1);for(let k=0;k<7;k++){const m=P(new T.IcosahedronGeometry(k?.4:.5,1),{c1:0xf2eed8,c2:0xfffff2,y0:-.5,y1:.5,j:.05});m.position.set(k?Math.cos(k*1.05)*.4:0,.75+(k?0:.1),k?Math.sin(k*1.05)*.4:0);g.add(m)}return g},
Aipo:()=>{const g=new T.Group();for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.18*(1+.3*(i%2)),z=Math.sin(a)*.18*(1+.3*(i%2)),s=cy(0x9ac870,0xb4e088,.08,.1,1.9,6);s.position.set(x,.95,z);s.rotation.set(z*.4,0,-x*.4);g.add(s);g.add(orient(leaf(0x3a8a38,0x58aa48,.4,.2),new V3(x*2,1,z*2),new V3(x*1.4,1.9,z*1.4)))}return g},
'Alho-poró':()=>{const g=new T.Group();for(let i=0;i<4;i++){const a=i*1.6,x=Math.cos(a)*.13,z=Math.sin(a)*.13,s=cy(0xf4f4e8,0x2f8a40,.13,.11,2.2,6);s.position.set(x,1.1,z);g.add(s);g.add(orient(leaf(0x2f8a40,0x58aa58,.7,.13),new V3(x*3,1,z*3),new V3(x,2.2,z)))}return g},
Cebolinha:()=>{const g=new T.Group();for(let i=0;i<9;i++){const a=i*2.4,r=.04+.05*(i%3),s=cy(0xf4f4e8,0x2f9a40,.03,.045,2.2,5);s.position.set(Math.cos(a)*r,1.1,Math.sin(a)*r);s.rotation.set(Math.sin(a)*.08,0,-Math.cos(a)*.08);g.add(s)}return g},
Salsa:()=>rose(0x1f6a30,0x3a9a45,11,.55,.22,.8,.9,0,1),
Coentro:()=>rose(0x4aa040,0x86c864,9,.55,.27,.8,.9,0,1),
Pepino:()=>G(ov(0x1f6a28,0x4aa04a,.42,1.2,.42),at(cy(0x3a7a2e,0x3a7a2e,.07,.1,.2,5),0,1.25,0)),
Abobrinha:()=>G(ov(0x2a7a30,0x74b858,.5,1.1,.5),at(cy(0x3a8a2e,0x3a8a2e,.18,.14,.3,6),0,1.15,0)),
Chuchu:()=>G(ov(0x7ab050,0xb4e088,.8,.95,.8,{fn:(x,y,z)=>{const k=(1+.09*Math.cos(5*Math.atan2(z,x)))*(1-.3*Math.max(0,y));return[x*k,y,z*k]}}),at(cy(0x5a8a3a,0x5a8a3a,.06,.09,.2,5),0,1,0)),
Quiabo:()=>{const p=cn(0x3a8a30,0x6ab050,.3,1.7,5);p.rotation.x=Math.PI;return G(p,at(cy(0x3a7a2e,0x3a7a2e,.1,.2,.2,5),0,.9,0))},
Jiló:()=>G(ov(0x5a9a30,0xa0d060,.6,.55,.6),at(cy(0x3a8a2e,0x3a8a2e,.2,.3,.1,6),0,.55,0),at(cy(0x3a7a2e,0x3a7a2e,.05,.07,.25,5),0,.7,0)),
Vagem:()=>{const g=new T.Group();for(let i=0;i<3;i++){const p=P(new T.CylinderGeometry(.1,.08,2.2,5,6),{c1:0x3a8a30,c2:0x6ab048,y0:-1.1,y1:1.1,fn:(x,y,z)=>[x+.3*Math.sin((y+1.1)/2.2*3.14),y,z]});p.rotation.z=(i-1)*.35;p.position.set((i-1)*.1,0,(i-1)*.1);g.add(p)}return g},
Ervilha:()=>{const g=new T.Group();g.add(ov(0x4a9a3a,0x70c050,.28,1.3,.2));for(let i=0;i<5;i++)g.add(at(ov(0x7ac048,0xa8e070,.2,.2,.2,{sg:6,rg:4}),0,-.8+.4*i,.1));return g},
Feijão:()=>G(at(ov(0x8a2a22,0xc05a48,.7,.45,.5),0,.4,0),at(ov(0x8a2a22,0xc05a48,.7,.45,.5),.3,-.2,.3),at(ov(0x7a2218,0xb04a3a,.7,.45,.5),-.2,-.2,-.4)),
Pimenta:()=>{const p=cn(0xb81410,0xe83020,.32,1.7,6,{hs:4,fn:(x,y,z)=>[x+.25*y*y,y,z]});p.rotation.x=Math.PI;return G(p,at(ov(0x2f8a2f,0x4aa83a,.3,.18,.3),0,.85,0),at(cy(0x3a8a2e,0x3a8a2e,.05,.07,.3,5),0,1.05,0))},
Melancia:()=>G(ov(0x2a7a3a,0x5aaa4a,1.1,.9,.95,{sg:14,rg:10,cf:(x,y,z)=>Math.cos(8*Math.atan2(z,x))>.2?0x1c5a2c:0x6ab050}),at(cy(0x5a7a2a,0x5a7a2a,.05,.07,.25,5),0,.95,0)),
Melão:()=>G(ov(0xe0c880,0xf0dca0,1,.9,1,{sg:10,rg:8,cf:(x,y,z)=>hash(x*5,y*5,z*5)>.5?0xdcc070:0xc8a850}),at(cy(0x6a7a3a,0x6a7a3a,.05,.07,.25,5),0,.95,0)),
Soja:()=>{const g=new T.Group();g.add(limb(0x6a8a3a,0x6a8a3a,.04,.03,new V3(0,-.8,0),new V3(0,.8,0),4));for(let i=0;i<4;i++){const a=i*1.6,p=ov(0x8a9040,0xb8b868,.2,.65,.18);p.position.set(Math.cos(a)*.3,-.3+i*.25,Math.sin(a)*.3);p.rotation.z=-Math.cos(a)*.4;g.add(p)}return g},
Algodão:()=>{const g=new T.Group();[[0,.2,0],[.3,0,.1],[-.3,.05,-.1],[.1,.1,.3],[-.1,0,-.3]].forEach(q=>g.add(at(ov(0xf6f6f0,0xffffff,.32,.32,.32,{sg:6,rg:4}),q[0],q[1],q[2])));for(let i=0;i<4;i++){const a=i*1.57;g.add(orient(leaf(0x6a4a2a,0x8a6a3a,.5,.22),new V3(Math.cos(a),.7,Math.sin(a)),new V3(0,-.2,0)))}return g},
Café:()=>{const g=new T.Group();g.add(limb(0x6a4a2a,0x6a4a2a,.04,.03,new V3(0,-.2,0),new V3(0,1.4,0),4));for(let i=0;i<7;i++){const a=i*2.1;g.add(at(ov(0xc01820,0xe83a3a,.2,.24,.2,{sg:6,rg:4}),Math.cos(a)*.2,.1+i*.17,Math.sin(a)*.2))}g.add(orient(leaf(0x1f6a30,0x3a9a45,.5,.22),new V3(1,.5,0),new V3(0,1.1,0)),orient(leaf(0x1f6a30,0x3a9a45,.5,.22),new V3(-1,.5,0),new V3(0,.6,0)));return g},
Maçã:()=>G(ov(0xc81e1e,0xe84030,1,.9,1,{sg:10,rg:8,fn:(x,y,z)=>{const d=Math.hypot(x,z);return[x,y-(y>0?.25*Math.max(0,1-d*2):-.15*Math.max(0,1-d*2)*0),z]}}),at(cy(0x5a3a1a,0x5a3a1a,.04,.05,.35,4),0,.95,0),at(orient(leaf(0x2f8a2f,0x58aa40,.35,.15),new V3(1,.5,0),new V3(.05,.95,0)),0,0,0)),
Laranja:()=>G(ov(0xe87a12,0xf8a838,1,.95,1,{sg:10,rg:7}),at(cy(0x3a8a2e,0x3a8a2e,.14,.1,.1,6),0,.95,0)),
Limão:()=>G(ov(0xe0cc18,0xf8f060,.75,.95,.75),at(cn(0xe0cc18,0xf0e040,.14,.3,5),0,.98,0),at(orient(cn(0xe0cc18,0xf0e040,.14,.3,5),new V3(0,-1,0),new V3(0,-.98,0)),0,-.98,0)),
Banana:()=>{const g=new T.Group();g.add(at(cy(0x8a6a3a,0x8a6a3a,.1,.12,.3,5),0,.1,0));for(let i=0;i<5;i++){const f=cy(0xf0d030,0xf8e050,.13,.11,1.5,5,{hs:5,fn:(x,y,z)=>[x+.35*Math.pow((y+.75)/1.5,2),y,z]});f.position.set((i-2)*.2,-.5,(i%2-.5)*.1);f.rotation.z=(2-i)*.12;g.add(f)}return g},
Uva:()=>{const g=new T.Group();g.add(at(cy(0x6a5a3a,0x6a5a3a,.04,.05,.35,4),0,.1,0));for(let r=0;r<5;r++){const n=5-r;for(let i=0;i<n;i++){const a=i/n*6.28,rad=.084*(n-1)*(n>1?1:0);g.add(at(ov(0x4a1a6a,0x7a3a9a,.2,.2,.2,{sg:6,rg:4}),Math.cos(a)*rad,-.1-r*.3,Math.sin(a)*rad))}}g.add(orient(leaf(0x3a8a2e,0x6ab04a,.5,.35),new V3(1,.4,0),new V3(0,.25,0)));return g},
Morango:()=>{const g=new T.Group(),K=y=>1+.38*Math.min(0,y);g.add(ov(0xd01830,0xe84050,.55,.7,.55,{fn:(x,y,z)=>[x*K(y),y,z*K(y)]}));for(let i=0;i<10;i++){const d=new V3(hash(i,1,1)-.5,hash(i,2,2)*1.4-.8,hash(i,3,3)-.5).normalize(),k=K(d.y),s=P(new T.OctahedronGeometry(.04,0),{c1:0xf0d860});s.position.set(d.x*.55*k*1.02,d.y*.7,d.z*.55*k*1.02);g.add(s)}for(let i=0;i<6;i++){const a=i*1.05;g.add(orient(leaf(0x3a8a2e,0x58aa40,.28,.12),new V3(Math.cos(a)*.9,.3,Math.sin(a)*.9),new V3(0,.68,0)))}return g},
Abacaxi:()=>{const g=G(ov(0xc89020,0xf0c840,.7,.95,.7,{sg:10,rg:8,cf:(x,y,z)=>hash(Math.round(x*4),Math.round(y*4),Math.round(z*4))>.5?0xd8a428:0xf0c040}));for(let r=0;r<2;r++)for(let i=0;i<8;i++){const a=i/8*6.28+r*.4;g.add(orient(leaf(0x2f8a34,0x58aa48,.9-r*.3,.12),new V3(Math.cos(a)*(.5-r*.3),1,Math.sin(a)*(.5-r*.3)),new V3(0,.9,0)))}return g},
Cogumelo:()=>{const c=P(new T.SphereGeometry(1,10,6,0,6.283,0,1.5708),{c1:0x8a4a28,c2:0xc88a54,y0:0,y1:1});c.scale.set(.95,.6,.95);c.position.y=1;return G(at(cy(0xf0e8d8,0xfbf6ea,.2,.28,1,6),0,.5,0),c,at(cy(0xe8d8c0,0xe8d8c0,.9,.9,.04,10),0,1,0))},
Trigo:()=>stalks('w',0xd8a830,2.2),Arroz:()=>stalks('r',0xd8c060,1.8),Cevada:()=>stalks('b',0xd0b050,2),Aveia:()=>stalks('o',0xd8c878,2.2),
Girassol:()=>{const g=new T.Group();g.add(limb(0x4a8a30,0x6aa840,.09,.06,O,new V3(0,1.6,0),6));const h=sfHead(4);h.position.set(0,1.65,.1);h.rotation.x=1.3;g.add(h);g.add(orient(leaf(0x2f7a2a,0x58a040,.55,.32),new V3(1,.3,0),new V3(0,.6,0)),orient(leaf(0x2f7a2a,0x58a040,.55,.32),new V3(-1,.3,0),new V3(0,1,0)));return g},
'Cana-de-açúcar':()=>{const g=new T.Group();for(let i=0;i<3;i++){const x=(i-1)*.25,z=(i%2-.5)*.2;g.add(limb(0xa8b040,0xc0c858,.1,.09,new V3(x,0,z),new V3(x,2.4,z),6));for(let j=1;j<6;j++)g.add(at(cy(0x8a9a30,0x8a9a30,.12,.12,.05,6),x,j*.4,z));for(let j=0;j<5;j++){const b=j/5*6.28;g.add(orient(leaf(0x4aa040,0x7ac058,.8,.09),new V3(Math.cos(b)*.9,.9,Math.sin(b)*.9),new V3(x,2.4,z)))}}return g}
});

const rp=o=>t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const ly=o.stem||0,yy=ly*[0,0,.4,.8,1,1,1][t],pr=[0,0,0,.35,.6,.85,1][t];
  if(o.stem)g.add(limb(0x7a5a38,0x9a7a50,.07,.05,O,new V3(0,Math.max(yy,.15),0),5));
  if(t==1){cots(g,.25);return g}
  if(o.root){const m=V[o.root]();m.scale.setScalar(o.rs*[0,0,.15,.45,.7,.85,1][t]);m.position.y=.05;g.add(m)}
  const k=[0,0,.4,.75,1,1,1][t];
  for(let i=0;i<o.n;i++){const a=i*2.4+(i%2)*.3;g.add(orient(leaf(o.lc,o.lc2,o.ls*k,o.lw),new V3(Math.cos(a)*o.sp,o.up+(i%3)*.15,Math.sin(a)*o.sp),new V3(0,yy,0)))}
  if(o.head&&t>=3){const h=V[o.head]();h.scale.setScalar(o.hs*pr);h.position.y=yy+o.hy*pr;if(t==4&&o.h4)recolor(h,o.h4);if(t==5&&o.unripe)recolor(h,o.unripe);g.add(h)}
  if(o.bolt&&(t==4||t==5)){const base=new V3(0,yy,0),top=new V3(0,yy+1.6,0);g.add(limb(0x5aa040,0x7ac060,.05,.035,base,top,5));const um=new T.Group();for(let q=0;q<7;q++){const a=q*.9,e=top.clone().add(new V3(Math.cos(a)*.25,.12,Math.sin(a)*.25));um.add(limb(0x6a9a4a,0x8ab860,.015,.01,top,e,3));const f=flower(o.fl||0xf4e060);f.position.copy(e);um.add(f)}if(t==5)recolor(um,0x9a7a3a);g.add(um)}
  if(o.berry&&t>=4)for(let i=0;i<o.nb;i++){const a=i*2.1+.4,p=new V3(Math.cos(a)*.5,.15,Math.sin(a)*.5);if(t==4){const f=flower(0xffffff);f.position.copy(p).add(new V3(0,.1,0));g.add(f)}else{const b=V[o.berry]();b.scale.setScalar(o.bs*(t==5?.5:1));b.position.copy(p);if(t==5)recolor(b,o.unripe);g.add(b)}}
  return g};
const bn=o=>t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const n=[0,2,4,7,9,10,10][t],k=[0,.25,.5,.85,1,1,1][t],H=o.h*k;
  for(let i=0;i<n;i++){const a=i*2.4,r=(.04+.1*(i%3))*o.sp,x=Math.cos(a)*r,z=Math.sin(a)*r,s=stem(o.c1,o.c2,o.r,o.r*.8,H,6);s.position.set(x,H/2,z);s.rotation.set(Math.sin(a)*.12,0,-Math.cos(a)*.12);g.add(s);
    if(o.lf)g.add(orient(leaf(o.lc,o.lc2,o.ll*k,o.lw),new V3(Math.cos(a)*.5,1,Math.sin(a)*.5),new V3(x,H,z)))}
  if(o.fl&&(t==4||t==5)){const top=new V3(0,H+.3,0);g.add(limb(0x3a8a38,0x5aa048,.02,.015,new V3(0,H*.4,0),top,4));g.add(at(P(new T.IcosahedronGeometry(.16,1),{c1:t==4?0xb070d0:0x5a4a30,j:.05}),0,top.y+.1,0))}
  return g};
const cr=o=>t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const N=Math.round([0,2,4,8,12,12,12][t]*(o.nm||1)),H=o.h*[0,.2,.4,.75,1,1,1][t],sc=[0,0x5aa840,0x5aa840,0x5aa840,0x6ab048,0xa8b848,0xd0b448][t],ec=[0,0,0,0,0x7ab848,0xb4b048,o.ec||0xd8a830][t];
  for(let i=0;i<N;i++){const a=i*2.4,r=.1+.55*Math.sqrt(hash(i,1,1)),x=Math.cos(a)*r,z=Math.sin(a)*r,hh=H*(.85+.3*hash(i,2,2)),top=new V3(x,hh,z),st=limb(sc,sc,o.th*1.2,o.th,new V3(x,0,z),top,5);recolor(st,sc);g.add(st);
    if(t>=2){const lf=leaf(0x4aa040,0x6ac050,o.ll,.07);orient(lf,new V3(Math.cos(a)*.7,1,Math.sin(a)*.7),new V3(x,hh*.35,z));if(t>=5)recolor(lf,sc);g.add(lf)}
    if(o.cane){if(t>=3)for(let j=0;j<5;j++){const b=j/5*6.28;g.add(orient(leaf(0x4aa040,0x7ac058,.8,.09),new V3(Math.cos(b)*.9,.9,Math.sin(b)*.9),top))}}
    else if(t>=4){const e=earM(o.k);e.position.copy(top);recolor(e,ec);g.add(e)}}
  return g};
const sf=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=[0,.3,.6,1.6,2.4,2.5,2.5][t];g.add(limb(0x4a8a30,0x6aa840,.09,.06,O,new V3(0,H,0),6));if(t==1){cots(g,H);return g}
  for(let i=0;i<[0,0,4,7,8,8,8][t];i++){const a=i*2.4;g.add(orient(leaf(0x2f7a2a,0x58a040,.4+.15*Math.min(t,3),.3),new V3(Math.cos(a)*.9,.25,Math.sin(a)*.9),new V3(0,H*(.1+.75*i/8),0)))}
  if(t>=4){const h=sfHead(t);h.position.set(0,H+.05,.15);h.rotation.x=[0,0,0,0,1.3,2,2.3][t];g.add(h)}return g};
const tr=o=>t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=[0,.35,.9,1.5,1.8,1.9,2][t];g.add(limb(0x5a3e22,0x7a5a34,t<3?.07:.14,t<3?.04:.09,O,new V3(0,H,0),6));if(t==1){cots(g,H);return g}
  const c=[0,0,.35,.75,.95,1,1][t]*o.cr,cyy=H+.3*c;
  [[0,0,0,1],[.6,-.1,0,.65],[-.6,-.1,0,.65],[0,-.1,.6,.65],[0,-.1,-.6,.65],[0,.5,0,.6]].forEach(q=>g.add(at(P(new T.IcosahedronGeometry(c*q[3],1),{c1:o.c1,c2:o.c2,y0:-c,y1:c,j:.08}),q[0]*c,cyy+q[1]*c,q[2]*c)));
  const sp=i=>{const a=i*2.4;return new V3(Math.cos(a),-.1+.8*hash(i,3,3),Math.sin(a)).normalize().multiplyScalar(c*1.1).add(new V3(0,cyy,0))};
  if(t==4)for(let i=0;i<16;i++){const f=P(new T.OctahedronGeometry(.06,0),{c1:o.fl});f.position.copy(sp(i+9));g.add(f)}
  if(t>=5)for(let i=0;i<o.nfr;i++){const f=V[o.fruit]();f.scale.setScalar(o.fs*(t==5?.5:1));f.position.copy(sp(i));if(t==5)recolor(f,o.unripe);g.add(f)}
  return g};
const bs=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=[0,.3,.7,1.6,2.1,2.2,2.2][t];g.add(limb(0xa8c870,0xc0dc88,.2,.14,O,new V3(0,H,0),8));if(t==1){cots(g,H);return g}
  const k=[0,0,.5,1,1.2,1.2,1.2][t];for(let i=0;i<[0,0,3,6,7,7,7][t];i++){const a=i*2.4;g.add(orient(leaf(0x3a9a30,0x6ac048,k,.45),new V3(Math.cos(a)*.9,.9,Math.sin(a)*.9),new V3(0,H,0)))}
  if(t>=4){g.add(limb(0x5a8a3a,0x5a8a3a,.04,.04,new V3(0,H,0),new V3(.3,H-.2,0),4));if(t==4){const b=ov(0x7a1a50,0xa02868,.2,.4,.2);b.position.set(.3,H-.5,0);b.rotation.z=.2;g.add(b)}else for(let i=0;i<3;i++){const h=V.Banana();h.scale.setScalar(.3*(t==5?.8:1));h.position.set(.3,H-.5-.3*i,0);if(t==5)recolor(h,0x6aaa3a);g.add(h)}}
  return g};
const mu=t=>{const g=new T.Group();if(t==0){for(let i=0;i<5;i++){const d=P(new T.IcosahedronGeometry(.03,0),{c1:0xf4f0e8});d.position.set((hash(i,1,1)-.5)*.5,.03,(hash(i,2,2)-.5)*.5);g.add(d)}return g}
  if(t==1){for(let i=0;i<7;i++){const a=i*.9;g.add(limb(0xf4f0e8,0xf4f0e8,.02,.012,O,new V3(Math.cos(a)*.35,.03,Math.sin(a)*.35),3))}return g}
  const S=[0,0,.22,.4,.7,.9,1][t],ps=[[0,0],[.5,.3],[-.4,.45]];
  ps.slice(0,t<4?1:3).forEach((p,i)=>{const m=V.Cogumelo();m.scale.setScalar(S*[1,.75,.6][i]);m.position.set(p[0],0,p[1]);g.add(m)});return g};
const gp=t=>{const g=new T.Group();if(t==0){seedBit(g);return g}
  const H=[0,.3,.6,2.2,2.3,2.3,2.3][t],B=0x8a6a3e;
  if(t>=3){[-1,1].forEach(x=>g.add(limb(B,B,.08,.07,new V3(x,0,0),new V3(x,2.4,0),5)));g.add(limb(B,B,.05,.05,new V3(-1,2.3,0),new V3(1,2.3,0),5));g.add(limb(B,B,.04,.04,new V3(-1,1.3,0),new V3(1,1.3,0),5))}
  const pts=[];for(let i=0;i<=6;i++)pts.push(new V3(.18*Math.sin(i*1.4),H*i/6,0));
  for(let i=0;i<6;i++)g.add(limb(0x6a5a30,0x6a7a38,.05,.045,pts[i],pts[i+1],5));
  if(t==1){cots(g,H);return g}
  for(let i=0;i<[0,0,2,7,9,9,9][t];i++){const a=i*2.4;g.add(orient(leaf(0x3a8a2e,0x6ab04a,.4,.32),new V3(Math.cos(a)*.9,.3,Math.sin(a)*.9),pts[Math.min(6,i%6+1)]))}
  if(t>=3)[-1,1].forEach(x=>{const e=new V3(x*.95,2.3,0),b=new V3(0,2.3,0);g.add(limb(0x4a7a30,0x6a9a3a,.03,.025,b,e,4));for(let i=0;i<3;i++)g.add(orient(leaf(0x3a8a2e,0x6ab04a,.4,.32),new V3(0,.6,(i%2?1:-1)*.8),b.clone().lerp(e,(i+1)/4)))});
  if(t==4)for(let i=0;i<4;i++){const f=new T.Group();for(let k=0;k<6;k++)f.add(at(P(new T.IcosahedronGeometry(.035,0),{c1:0xdde8a0}),(hash(k,i,1)-.5)*.2,-.05*k,(hash(k,i,2)-.5)*.1));f.position.set(-.7+i*.47,2.2,0);g.add(f)}
  if(t>=5)for(let i=0;i<4;i++){const b=V.Uva();b.scale.setScalar(t==5?.3:.5);b.position.set(-.7+i*.47,2.25,(i%2-.5)*.2);if(t==5)recolor(b,0x7ab04a);g.add(b)}
  return g};
const fq={lc:0x2e7d2e,lc2:0x58b04a};
Object.assign(PL,{
Beterraba:{f:rp({root:'Beterraba',rs:.7,n:7,ls:.6,lw:.24,lc:0x2f8a3a,lc2:0x6ab050,sp:.55,up:1,bolt:1}),s:1,d:1.4,clear:1},
Rabanete:{f:rp({root:'Rabanete',rs:.8,n:6,ls:.55,lw:.26,lc:0x2f8a3a,lc2:0x5ab048,sp:.7,up:.8,bolt:1,fl:0xf8f0f8}),s:1,d:1.4,clear:1},
Nabo:{f:rp({root:'Nabo',rs:.75,n:6,ls:.6,lw:.26,lc:0x2f8a3a,lc2:0x5ab048,sp:.7,up:.8,bolt:1}),s:1,d:1.3,clear:1},
Mandioca:{f:rp({root:'Mandioca',rs:.6,stem:1,n:7,ls:.6,lw:.12,lc:0x3a8a38,lc2:0x6ab050,sp:.9,up:.3}),s:.85,d:1.4,clear:1},
'Batata-doce':{f:rp({root:'Batata-doce',rs:.6,n:9,ls:.5,lw:.36,lc:0x2f8a3a,lc2:0x58aa48,sp:1.2,up:.1}),s:1,d:1.2,clear:1},
Inhame:{f:rp({root:'Inhame',rs:.6,stem:.8,n:6,ls:.5,lw:.34,lc:0x2f8a3a,lc2:0x58aa48,sp:.9,up:.4}),s:1,d:1.1,clear:1},
Alho:{f:rp({root:'Alho',rs:.55,n:5,ls:1,lw:.1,lc:0x2f8a3a,lc2:0x5ab048,sp:.15,up:1.3}),s:1,d:.9,clear:1},
Gengibre:{f:rp({root:'Gengibre',rs:.7,n:6,ls:1.1,lw:.1,lc:0x3a8a38,lc2:0x6ab050,sp:.2,up:1.3}),s:1,d:.7,clear:1},
Alface:{f:rp({n:10,ls:.8,lw:.45,lc:0x4aa83a,lc2:0x9ad868,sp:.85,up:.5,bolt:1}),s:1,d:.4},
Repolho:{f:rp({head:'Repolho',hs:.6,hy:.55,n:5,ls:.7,lw:.45,lc:0x3a8a3a,lc2:0x5ab048,sp:.8,up:.5}),s:1,d:.4},
Couve:{f:rp({n:7,ls:1,lw:.4,lc:0x1f6a36,lc2:0x3a9a4a,sp:.5,up:1,stem:.5,bolt:1}),s:1,d:.4},
Espinafre:{f:rp({n:9,ls:.55,lw:.3,lc:0x1f6a30,lc2:0x3a9040,sp:.9,up:.5}),s:1,d:.4},
Rúcula:{f:rp({n:10,ls:.7,lw:.16,lc:0x3a8a3a,lc2:0x78bc58,sp:.6,up:.9,bolt:1,fl:0xf8f4e0}),s:1,d:.4},
'Couve-flor':{f:rp({head:'Couve-flor',hs:.6,hy:.4,n:6,ls:.9,lw:.3,lc:0x4a9a3a,lc2:0x7ac050,sp:.45,up:1.1}),s:1,d:.4},
Aipo:{f:bn({c1:0x9ac870,c2:0xb8e090,r:.1,h:1.7,sp:1,lf:1,lc:0x3a8a38,lc2:0x58aa48,ll:.4,lw:.22}),s:1,d:.4},
'Alho-poró':{f:bn({c1:0xf4f4e8,c2:0x2f8a40,r:.13,h:1.8,sp:1,lf:1,lc:0x2f8a40,lc2:0x58aa58,ll:.9,lw:.13}),s:1,d:.4},
Cebolinha:{f:bn({c1:0xf4f4e8,c2:0x2f9a40,r:.045,h:1.6,sp:1.3,fl:1}),s:1,d:.4},
Salsa:{f:rp({n:12,ls:.5,lw:.22,lc:0x1f6a30,lc2:0x3a9a45,sp:.8,up:.9}),s:1,d:.4},
Coentro:{f:rp({n:10,ls:.5,lw:.26,lc:0x4aa040,lc2:0x86c864,sp:.8,up:.9,bolt:1,fl:0xffffff}),s:1,d:.4},
Pepino:{f:fp({h:[0,.3,.7,1.4,1.9,2,2],nl:[0,0,3,5,6,6,6],ls:.55,lw:.3,...fq,fc:0xf4d020,nf:5,fruit:'Pepino',fs:.28,unripe:0x5aa84a,nfr:5,stake:1}),s:.9,d:.4},
Abobrinha:{f:fp({h:[0,.25,.5,.9,1.2,1.2,1.2],nl:[0,0,3,5,6,6,6],ls:.7,lw:.4,...fq,fc:0xf4c020,nf:4,fruit:'Abobrinha',fs:.3,unripe:0x6ab050,nfr:4}),s:1,d:.4},
Chuchu:{f:fp({h:[0,.3,.7,1.4,1.9,2,2],nl:[0,0,3,5,6,6,6],ls:.55,lw:.3,...fq,fc:0xe8f0c0,nf:5,fruit:'Chuchu',fs:.28,unripe:0x9ac870,nfr:5,stake:1}),s:.9,d:.4},
Quiabo:{f:fp({h:[0,.3,.8,1.6,2.2,2.3,2.3],nl:[0,0,3,5,6,6,6],ls:.6,lw:.3,...fq,fc:0xf8f0a0,nf:5,fruit:'Quiabo',fs:.3,unripe:0x5aaa3a,nfr:7}),s:.9,d:.4},
Jiló:{f:fp({h:[0,.3,.7,1.2,1.6,1.7,1.7],nl:[0,0,3,5,6,6,6],ls:.45,lw:.22,...fq,fc:0xffffff,nf:5,fruit:'Jiló',fs:.25,unripe:0x4a9a3a,nfr:6,mix:1}),s:1,d:.4},
Pimenta:{f:fp({h:[0,.25,.6,1,1.3,1.4,1.4],nl:[0,0,3,5,6,6,6],ls:.4,lw:.2,...fq,fc:0xffffff,nf:6,fruit:'Pimenta',fs:.25,unripe:0x4a9a3a,nfr:8,mix:1}),s:1,d:.4},
Melancia:{f:apf({fruit:'Melancia',f5:.2,f6:.34,unripe:0x3a7a3a}),s:.9,d:.4},
Melão:{f:apf({fruit:'Melão',f5:.18,f6:.3,unripe:0x8aaa5a}),s:.9,d:.4},
Vagem:{f:fp({h:[0,.3,.7,1.5,2,2.1,2.1],nl:[0,0,3,5,6,6,6],ls:.4,lw:.22,...fq,fc:0xe8d0f0,nf:5,fruit:'Vagem',fs:.35,unripe:0x5aaa3a,nfr:6,stake:1}),s:.9,d:.4},
Ervilha:{f:fp({h:[0,.3,.7,1.3,1.8,1.9,1.9],nl:[0,0,3,5,6,6,6],ls:.4,lw:.22,...fq,fc:0xffffff,nf:5,fruit:'Ervilha',fs:.3,unripe:0x5aaa3a,nfr:6,stake:1}),s:.95,d:.4},
Feijão:{f:fp({h:[0,.3,.6,1,1.3,1.4,1.4],nl:[0,0,3,5,6,6,6],ls:.45,lw:.25,...fq,fc:0xf0e0f8,nf:5,fruit:'Feijão',fs:.25,unripe:0x6aaa4a,nfr:6}),s:1,d:.4},
Soja:{f:fp({h:[0,.3,.6,1,1.2,1.3,1.3],nl:[0,0,3,5,6,6,6],ls:.4,lw:.22,...fq,fc:0xf0e8ff,nf:6,fruit:'Soja',fs:.3,unripe:0x7a9a3a,nfr:8}),s:1,d:.4},
Trigo:{f:cr({k:'w',h:1.9,th:.025,ll:.5,ec:0xd8a830,nm:.5}),s:1,d:.4},
Arroz:{f:cr({k:'r',h:1.5,th:.022,ll:.5,ec:0xd8c060}),s:1,d:.4},
Cevada:{f:cr({k:'b',h:1.7,th:.025,ll:.5,ec:0xd0b050,nm:.5}),s:1,d:.4},
Aveia:{f:cr({k:'o',h:1.9,th:.02,ll:.5,ec:0xd8c878}),s:1,d:.4},
Girassol:{f:sf,s:.8,d:.4},
'Cana-de-açúcar':{f:cr({cane:1,nm:.45,h:2.6,th:.09,ll:.5}),s:.65,d:.4},
Morango:{f:rp({n:7,ls:.45,lw:.3,lc:0x2f8a30,lc2:0x58aa40,sp:.9,up:.5,berry:'Morango',nb:5,bs:.2,unripe:0x8ac060}),s:1.1,d:.4},
Abacaxi:{f:rp({n:14,ls:.9,lw:.1,lc:0x2f8a34,lc2:0x58aa48,sp:.5,up:1.1,head:'Abacaxi',hs:.5,hy:.95,h4:0xc03a70,unripe:0x6aaa3a}),s:.9,d:.4},
Uva:{f:gp,s:.8,d:.4},
Maçã:{f:tr({fruit:'Maçã',fs:.3,c1:0x2f7a2a,c2:0x58a840,cr:.85,fl:0xffd0e0,nfr:7,unripe:0x6aa840}),s:.7,d:.4},
Laranja:{f:tr({fruit:'Laranja',fs:.3,c1:0x2a7a30,c2:0x58a840,cr:.85,fl:0xffffff,nfr:8,unripe:0x6aaa3a}),s:.7,d:.4},
Limão:{f:tr({fruit:'Limão',fs:.26,c1:0x2a7a30,c2:0x58a840,cr:.75,fl:0xffffff,nfr:8,unripe:0x5aaa3a}),s:.7,d:.4},
Banana:{f:bs,s:.65,d:.4},
Cogumelo:{f:mu,s:1,d:.4},
Algodão:{f:fp({h:[0,.3,.7,1.2,1.6,1.7,1.7],nl:[0,0,3,5,6,6,6],ls:.45,lw:.28,...fq,fc:0xfff0c0,nf:5,fruit:'Algodão',fs:.3,unripe:0x6aa040,nfr:7}),s:1,d:.4},
Café:{f:fp({h:[0,.3,.7,1.2,1.7,1.8,1.8],nl:[0,0,3,5,6,6,6],ls:.45,lw:.25,lc:0x1f6a30,lc2:0x3a9a45,fc:0xffffff,nf:6,fruit:'Café',fs:.35,unripe:0x4a9a3a,nfr:8,mix:1}),s:1,d:.4}
});

export const CROP_STAGES = ST;
export const hasCrop = n => !!PL[n];
const CACHE = {};
const _m = new T.Matrix4(), _v = new T.Vector3(), _c = new T.Color();
/** Geometria fundida (não indexada, com cor por vértice) da cultura `name` na fase `stage` (0‥6), já na escala `scale` */
export function cropGeo(name, stage, scale = 1) {
  const key = name + '|' + stage + '|' + scale;
  if (CACHE[key]) return CACHE[key];
  const p = PL[name], g = p.f(stage), pos = [], col = [];
  g.scale.setScalar(p.s * scale);
  g.updateMatrixWorld(true);
  const put = (geo, mat, inst) => {
    const ng = geo.index ? geo.toNonIndexed() : geo, pa = ng.attributes.position, ca = ng.attributes.color;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(mat);
      pos.push(_v.x, _v.y, _v.z);
      if (inst) col.push(inst.r, inst.g, inst.b); else if (ca) col.push(ca.getX(i), ca.getY(i), ca.getZ(i)); else col.push(.5, .5, .5);
    }
  };
  g.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _m); _m.premultiply(o.matrixWorld);
        if (o.instanceColor) _c.fromArray(o.instanceColor.array, i * 3); else _c.set(.9, .8, .2);
        put(o.geometry, _m.clone(), { r: _c.r, g: _c.g, b: _c.b });
      }
    } else put(o.geometry, o.matrixWorld, null);
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.userData.tris = pos.length / 9;
  return (CACHE[key] = geo);
}
export const CROP_MAT = new T.MeshLambertMaterial({ vertexColors: true });
/** fase (1‥6) conforme o crescimento 0.2‥1 da lavoura */
export const stageOf = gr => gr < .3 ? 1 : gr < .45 ? 2 : gr < .62 ? 3 : gr < .78 ? 4 : gr < .93 ? 5 : 6;
