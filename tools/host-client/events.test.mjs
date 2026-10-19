import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(capabilities=['events.observe','notifications.post']){
  const calls=[],jobs=new Map(),live=new Map(),posted=new Map();let next=0;
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
    const request=JSON.parse(init.body);calls.push({url,request});let value;
    if(request.action==='start'){const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else{
      const job=jobs.get(request.id);jobs.delete(request.id);let result=null;
      if(job.method.startsWith('observe')){const id='observer-'+ ++next;live.set(id,[{type:'battery_changed',source:'broadcast',time:1,level:50}]);result={id,source:'broadcast'};}
      if(job.method==='drainEvents')result=live.get(job.args[0]).splice(0,32);
      if(job.method==='close')result=live.delete(job.args[0]);
      if(job.method==='notify'){result=job.args[0].id;posted.set(job.args[1]+':'+result,job.args[0]);}
      if(job.method==='cancel')posted.delete(job.args[1]+':'+job.args[0]);
      if(job.method==='cancelAll')for(const key of posted.keys())if(key.startsWith(job.args[0]+':'))posted.delete(key);
      if(job.method==='openSettings')result={dryRun:job.args[0].dryRun,opened:false};
      value={done:true,value:result};
    }
    return Response.json({ok:true,capability:url.split('/').at(-1),result:{value}});
  }});
  return {host,calls,live,posted};
}
test('Bun events use start/poll transport and retain typed event fields',async()=>{
  const f=await fixture(),sub=await f.host.events.observeBroadcasts();
  const events=await sub.drainEvents();assert.equal(events[0].level,50);assert(Object.isFrozen(events[0]));assert.equal(await sub.close(),true);assert.equal(f.live.size,0);
  assert.equal(HOST_API_METHODS['events.observe'].length,6);assert(f.calls.every(c=>c.url.endsWith('/events.observe')));
});
test('Bun notification calls carry one stable scope and preserve the settings alias',async()=>{
  const f=await fixture();await f.host.notifications.notify({id:22,title:'owned'});assert.equal(f.posted.size,1);await f.host.notifications.cancelAll();assert.equal(f.posted.size,0);
  assert.deepEqual(await f.host.notifications.openNotificationSettings({dryRun:true}),{opened:false,dryRun:true});
  assert.equal(HOST_API_METHODS['notifications.post'].length,5);assert(f.calls.every(c=>c.url.endsWith('/notifications.post')));
});
test('Bun missing grants reject both facades without sending a host request',async()=>{
  const f=await fixture([]);await assert.rejects(f.host.events.observeBroadcasts(),{code:'NOT_GRANTED'});await assert.rejects(f.host.notifications.notify({title:'owned'}),{code:'NOT_GRANTED'});assert.equal(f.calls.length,0);
  await assert.rejects(f.host.events.observeBroadcasts({drainIntervalMs:1}),{code:'INVALID_REQUEST'});
});
test('Bun event AbortSignal closes an active observer',async()=>{
  const f=await fixture(),controller=new AbortController(),sub=await f.host.events.observeBroadcasts({signal:controller.signal});
  const closed=new Promise(resolve=>sub.once('close',resolve));controller.abort();await closed;assert(sub.closed);assert.equal(f.live.size,0);
});
