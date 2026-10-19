import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(capabilities=['shell.control','shell.shizuku']){
 const calls=[],jobs=new Map(),live=new Map();let n=0;
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
  const r=JSON.parse(init.body);calls.push(r);let value;
  if(r.action==='start'){const id=String(++n);jobs.set(id,r);value={id};}
  else if(r.action==='cancel'){jobs.delete(r.id);value=true;}
  else {
   const job=jobs.get(r.id);jobs.delete(r.id);let result=null;
   if(job.method==='spawn'||job.method==='open'){const id='process-'+ ++n;live.set(id,job.method==='spawn'?[{type:'stdout',data:Buffer.from('你好\0\n').toString('base64')},{type:'exit',code:0,timedOut:false}]:[]);result={id,pid:n,mode:job.args[1]?.shizuku?'adb':'sh'};}
   if(job.method==='drain'){result=live.get(job.args[0])?.splice(0,8)||[];if(result.some(e=>e.type==='exit'))live.delete(job.args[0]);}
   if(job.method==='write')live.get(job.args[0]).push({type:'stdout',data:job.args[1]});
   if(job.method==='closeInput')live.get(job.args[0])?.push({type:'exit',code:0,timedOut:false});
   if(job.method==='close'){result={wasAlive:live.delete(job.args[0]),code:137};}
   if(job.method==='requestShizukuPermission')result=true;
   value={done:true,value:result};
  }
  return Response.json({ok:true,capability:'shell.control',result:{value}});
 }});return {host,calls,live};
}
test('Bun shell captures UTF-8/binary transport and forwards Shizuku flags',async()=>{
 const {host,calls,live}=await fixture();assert.equal(HOST_API_METHODS['shell.control'].length,10);const result=await host.shizuku.exec('owned');assert.equal(result.stdout,'你好\0\n');assert.equal(result.code,0);assert.equal(live.size,0);
 assert(calls.find(c=>c.method==='spawn').args[1].shizuku);assert.equal(await host.shizuku.requestPermission(),true);
});
test('Bun shell opens interactive streams, writes stdin and closes at EOF',async()=>{
 const {host,live}=await fixture(),p=host.shell.open();await p.ready;await p.writeLine('owned');assert.equal(await p.readLine(),'owned');await p.closeInput();assert.equal(await p.readLine(),null);assert.equal(await p.waitFor(),0);assert.equal(live.size,0);
});
test('Bun shell grant report and missing grants remain independent',async()=>{
 const {host,calls}=await fixture([]);assert.equal(host.shell.checkAccess({root:true,shizuku:true}).shell,false);await assert.rejects(host.shell.exec('owned'),{code:'NOT_GRANTED'});assert.equal(calls.length,0);
 await assert.rejects(host.shell.exec('owned',{cwd:3}),{code:'INVALID_REQUEST'});
});
test('Bun shell closes an active process on abort',async()=>{
 const {host,live}=await fixture(),controller=new AbortController(),p=host.shell.open({signal:controller.signal});await p.ready;controller.abort();await assert.rejects(p.exited,{code:'ABORT_ERR'});assert.equal(live.size,0);
});
