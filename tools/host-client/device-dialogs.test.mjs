import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(capabilities=['device.info','device.control','device.power','device.audio','dialogs.control']){
  const calls=[],jobs=new Map();let next=0,state;
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});let value;
    if(capability==='device.info')return Response.json({ok:true,capability,result:{model:'legacy'}});
    if(request.action==='start'){const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else{
      const job=jobs.get(request.id);jobs.delete(request.id);let result=null;
      if(job.method==='info')result={schema:'autojs6-bridge-device-info-v1',screen:{width:720},build:{model:'full'}};
      if(job.method==='getAudioStreamVolume')result=0;
      if(job.method==='confirm')result=true;
      if(job.method==='input')result='text';
      if(job.method==='progressShow')result=state={id:'progress',shown:true,max:10,value:0};
      if(job.method==='progressUpdate')result=state={...state,...job.args[1]};
      if(job.method==='progressDismiss')result=true;
      value={done:true,value:result};
    }
    return Response.json({ok:true,capability,result:{value}});
  }});
  return {host,calls};
}
test('Bun preserves legacy info and exposes the full snapshot, live getters and quiet volume control',async()=>{
  const f=await fixture();assert.deepEqual(await f.host.device.info(),{model:'legacy'});assert.equal((await f.host.device.getInfo()).build.model,'full');assert.equal(await f.host.device.getWidth(),720);
  await f.host.device.setMusicVolume(0);assert.equal(await f.host.device.getMusicVolume(),0);await f.host.device.keepScreenOn(1000);await f.host.device.cancelKeepingAwake();
  assert(f.calls.some(c=>c.capability==='device.audio'&&c.request.args?.[1]===0));assert.equal(HOST_API_METHODS['device.control'].length,41);
});
test('Bun device, power, audio and dialog grants are independent',async()=>{
  const f=await fixture(['device.info','device.control']);assert.equal(await f.host.device.getWidth(),720);
  await assert.rejects(f.host.device.keepScreenOn(1000),{code:'NOT_GRANTED'});await assert.rejects(f.host.device.getMusicVolume(),{code:'NOT_GRANTED'});await assert.rejects(f.host.dialogs.confirm('denied'),{code:'NOT_GRANTED'});
  assert(f.calls.every(c=>c.capability==='device.control'));
});
test('Bun input, confirmation, progress updates and dismissal share the Node object contract',async()=>{
  const f=await fixture();assert.equal(await f.host.dialogs.confirm('Confirm'),true);assert.equal(await f.host.dialogs.rawInput('Input'),null);assert.equal(await f.host.dialogs.prompt('Input',{positive:'Go'}),'text');
  const progress=await f.host.dialogs.progress.show({max:10});await progress.update({value:8});assert.equal(progress.value,8);assert.equal(await progress.dismiss(),true);assert.equal(progress.shown,false);
  assert.equal(HOST_API_METHODS['dialogs.control'].length,12);
});
