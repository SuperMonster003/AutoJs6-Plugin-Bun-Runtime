import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

async function fixture(grants) {
  const jobs=new Map(),packets=[],calls=[],answers=new Map();let serial=0,closed=0;
  const emit=(id,type,value)=>{
    const bytes=Buffer.from(JSON.stringify({type,value}));
    for(let offset=0;offset<bytes.length;offset+=4093){const end=Math.min(bytes.length,offset+4093);packets.push({id,data:bytes.subarray(offset,end).toString('base64'),last:end===bytes.length});}
  };
  async function inner(method,args){
    if(method==='open')return {id:'flow'};
    if(method==='close'){closed++;return true;}
    if(method==='poll')return packets.splice(0,3).filter(p=>args[1].includes(p.id));
    if(method==='cancel')return true;
    if(method==='answer'){answers.get(args[2])?.(args[4]);return true;}
    assert.equal(method,'start');
    const [,id,name,values,options]=args;
    if(name==='findAny')emit(id,'resolve',{index:0,node:{text:'ready'},target:values[0][0]});
    else if(name==='smartClick'){
      const token=String(++serial);const reply=new Promise(resolve=>answers.set(token,resolve));
      emit(id,'callback',{token,callback:options.verify.__flowCallback,args:[]});
      void reply.then(verified=>emit(id,'resolve',{ok:true,method:'node',verified,target:{text:'ready'}}));
    }else if(name==='waitForToast'){emit(id,'ready',null);emit(id,'resolve',{type:'toast',packageName:'other',text:'\u4f60\u597d\ud83d\ude03'.repeat(10000)});}
    else throw Error(name);
    return true;
  }
  const host=await createHostClient({socket:'/flow-tools.sock',fetch:async(url,init)=>{
    const capability=url.split('/').at(-1);
    if(capability==='info')return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{maxConcurrentCalls:4,callTimeoutMillis:10000}});
    assert.equal(capability,'flow.control');const payload=JSON.parse(init.body);calls.push(payload);
    let value;
    if(payload.action==='start'){const id=String(++serial);jobs.set(id,await inner(payload.method,payload.args));value={id};}
    else if(payload.action==='poll'){value={done:true,value:jobs.get(payload.id)};jobs.delete(payload.id);}
    else value=true;
    return Response.json({ok:true,capability,result:{value}});
  }});
  return {host,calls,get closed(){return closed;}};
}
test('Bun Flow tools have a distinct default-off grant and a streamed method manifest',async()=>{
  assert.deepEqual(HOST_API_METHODS['flow.control'],['open','start','poll','cancel','answer','close']);
  const f=await fixture(['accessibility.control']);
  await assert.rejects(f.host.flow.smartClick('ready').toPromise(),e=>e.code==='NOT_GRANTED'&&e.capability==='flow.control');
  assert.equal(f.calls.length,0);assert.equal(await f.host.flow.of(5),5);await f.host.flow.dispose();
});
test('Bun automation transport allows reentrant Flow callbacks and large Unicode event packets',async()=>{
  const f=await fixture(['flow.control','accessibility.control','events.observe','events.toast']);
  try {
    const flow=f.host.flow;
    const result=await flow.smartClick('ready',{gestureFallback:false,verify:async()=>(await flow.findAny(['ready'])).node.text});
    assert.equal(result.verified,'ready');
    const event=flow.waitForToast('ready',3000);await event.ready;assert.equal((await event).text,'\u4f60\u597d\ud83d\ude03'.repeat(10000));
  }finally{await f.host.flow.dispose();}
  assert.equal(f.closed,1);
});

test('Four UI event readers leave capacity for the Flow call that can trigger their event',async()=>{
  let release,entered=0,active=0,maximum=0;
  const gate=new Promise(resolve=>release=resolve),jobs=new Map(),packets=[];let serial=0;
  const host=await createHostClient({socket:'/flow-fairness.sock',fetch:async(url,init)=>{
    const capability=url.split('/').at(-1);
    if(capability==='info')return Response.json({ok:true,bridgeVersion:1,capabilities:['ui.layout','flow.control','accessibility.control'],limits:{maxConcurrentCalls:4}});
    active++;maximum=Math.max(maximum,active);
    try {
      const p=JSON.parse(init.body);let value;
      if(capability==='ui.layout'){entered++;await gate;value=[];}
      else if(p.action==='start'){
        const id=String(++serial);let result=true;
        if(p.method==='open')result={id:'client'};
        if(p.method==='start')packets.push({id:p.args[1],data:Buffer.from(JSON.stringify({type:'resolve',value:null})).toString('base64'),last:true});
        if(p.method==='poll')result=packets.splice(0);
        jobs.set(id,result);value={id};
      }else {value={done:true,value:jobs.get(p.id)};jobs.delete(p.id);}
      return Response.json({ok:true,capability,result:{value}});
    } finally {active--;}
  }});
  const readers=Array.from({length:4},()=>host.call('ui.layout',{method:'viewEvents',args:[]}));
  try {
    await new Promise(resolve=>setTimeout(resolve,10));assert.equal(entered,3);
    const result=await Promise.race([host.flow.findAny(['ready']),new Promise((_,reject)=>setTimeout(()=>reject(Error('Flow starved behind UI readers')),1000))]);
    assert.equal(result,null);assert.equal(entered,3);assert(maximum<=4);
  }finally{release();await Promise.all(readers);await host.flow.dispose();}
});
