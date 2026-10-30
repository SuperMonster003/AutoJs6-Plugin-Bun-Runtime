// Rhino's automation family in the Bun host client (AutoJs6 api-coverage P4.4): keys, automator / auto, ocr / barcode /
// qrcode / yolo, threads / timers / continuation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// A client copied to a temporary directory. Without a reply function the fixture host answers every request as /info;
// with one, automation jobs finish at once with reply(method, args, capability) and calls records them.
async function client(capabilities,reply){
  const directory=mkdtempSync(join(tmpdir(),'aj6-bun-automation-family-'));
  copyFileSync(new URL('../../app/src/main/assets/autojs6/host-client.mjs',import.meta.url),join(directory,'host-client.mjs'));
  const calls=[],jobs=new Map();let next=0;
  const fetch=async(url,init)=>{
    if(!reply||url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);let value;
    if(request.action==='start'){calls.push({capability,module:request.module,method:request.method,args:request.args});const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else{const job=jobs.get(request.id);jobs.delete(request.id);value={done:true,value:reply(job.method,job.args,capability,job.module)};}
    return Response.json({ok:true,capability,result:{value}});
  };
  try{
    const module=await import(pathToFileURL(join(directory,'host-client.mjs')).href);
    const host=await module.createHostClient({socket:'fixture',fetch});
    return reply?Object.assign(Object.create(host),{calls}):host;
  }finally{rmSync(directory,{recursive:true,force:true});}
}

test('Bun keys are Rhino\'s KeyEvent codes under its twelve names, without grants',async()=>{
  const host=await client([]);
  assert.deepEqual({...host.keys},{home:3,HOME:3,menu:82,MENU:82,back:4,BACK:4,
    volumeUp:24,volume_up:24,VOLUME_UP:24,volumeDown:25,volume_down:25,VOLUME_DOWN:25});
  assert(Object.isFrozen(host.keys));
});
