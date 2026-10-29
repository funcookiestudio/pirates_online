globalThis.WebSocketRequestResponsePair = class {};
const { default: W, Canal } = await import('./worker.mjs');
const store = new Map(); let alarm=null;
const state = { storage:{get:async k=>store.get(k),put:async(k,v)=>{store.set(k,structuredClone(v))},delete:async k=>store.delete(k),setAlarm:async t=>{alarm=t},deleteAlarm:async()=>{alarm=null}},
  blockConcurrencyWhile:async f=>f(), setWebSocketAutoResponse(){}, getWebSockets:()=>[], acceptWebSocket(){} };
const c = new Canal(state,{});
const env = { CANAL:{ idFromName:()=>1, get:()=>c } };
let r = await W.fetch(new Request('https://x/api/tv'),env);
const j = await r.json();
console.log('status',r.status,'grade:',j.sched.length,'lutas; primeira',new Date(j.sched[0].t).toISOString(),'odds',j.sched[0].odds);
r = await W.fetch(new Request('https://x/api/insc',{method:'POST',body:JSON.stringify({token:'a'.repeat(24),ev:'pinto',owner:'Teste',galo:{name:'Zé',pal:0,hp:100,atk:11,def:5,spd:7,luck:.1}})}),env);
console.log('insc',JSON.stringify(await r.json()));
r = await W.fetch(new Request('https://x/api/tv'),env); const k=await r.json(); console.log('apos insc, fila:',k.total,'| lutas com evento:',k.sched.filter(s=>s.ev).length);
