import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(granted=true) {
 const calls=[],jobs=new Map(),live=new Set();let n=0;
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:granted?['sensors.control']:[],limits:{}});
  const r=JSON.parse(init.body);calls.push(r);let value;
  if(r.action==='start'){const id=String(++n);jobs.set(id,r);value={id};}
  else if(r.action==='cancel'){jobs.delete(r.id);value=true;}
  else {
   const job=jobs.get(r.id);jobs.delete(r.id);let result=null;
   if(job.method==='getAvailableSensors')result=[{type:'light',name:'fixture'}];
   if(job.method==='subscribe'){result={id:'sensor-'+r.id,type:job.args[0].type};live.add(result.id);}
   if(job.method==='unsubscribe')live.delete(job.args[0].id);
   if(job.method==='drainEvents')result=[{type:'event',event:{type:'light',values:[42]}}];
   value={done:true,value:result};
  }
  return Response.json({ok:true,capability:'sensors.control',result:{value}});
 }});return {host,calls,live};
}
test('Bun sensors negotiate five host routes and sample/subscribe/close',async()=>{
 const {host,calls,live}=await fixture();assert.equal(HOST_API_METHODS['sensors.control'].length,5);
 assert(Object.isFrozen(await host.sensors.getAvailableSensors()));assert.deepEqual((await host.sensors.once('light',{drainIntervalMs:25})).values,[42]);assert.equal(live.size,0);
 const sub=host.sensors.subscribe('light',undefined,{drainIntervalMs:25});await sub.ready;
 assert.deepEqual((await new Promise(r=>sub.once('event',r))).values,[42]);await sub.close();assert.equal(live.size,0);assert(calls.every(r=>r.action!=='start'||r.method!=='once'));
});
test('Bun sensors deny missing grants and pre-aborted inputs without transport calls',async()=>{
 const {host,calls}=await fixture(false);await assert.rejects(host.sensors.getAvailableSensors(),{code:'NOT_GRANTED'});await assert.rejects(host.sensors.once('light'),{code:'NOT_GRANTED'});
 const c=new AbortController();c.abort();await assert.rejects(host.sensors.once('light',{signal:c.signal}),{name:'AbortError'});await assert.rejects(host.sensors.once('pressure'),{code:'INVALID_REQUEST'});assert.equal(calls.length,0);
});
test('Bun subscription AbortSignal closes active native handle',async()=>{
 const {host,live}=await fixture(),c=new AbortController(),sub=host.sensors.subscribe('light',undefined,{signal:c.signal});await sub.ready;const closed=new Promise(r=>sub.once('close',r));c.abort();await closed;assert(sub.closed);assert.equal(live.size,0);
});
