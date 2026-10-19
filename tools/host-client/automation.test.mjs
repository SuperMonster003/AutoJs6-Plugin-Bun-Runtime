import assert from 'node:assert/strict';
import test from 'node:test';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';
const all=['app.control','accessibility.control','accessibility.gesture','clipboard.control'];
async function fixture(grants=all,invoke=()=>null){
 const requests=[],jobs=new Map();let sequence=0;
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  const capability=url.split('/').at(-1);
  if(capability==='info')return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{callTimeoutMillis:10000}});
  const request=JSON.parse(init.body);requests.push({capability,...request});let value;
  if(request.action==='identity')value={packageName:'owned.host',versionName:'1.0',versionCode:7};
  else if(request.action==='start'){const id=String(++sequence);jobs.set(id,request);value={id};}
  else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
  else {const job=jobs.get(request.id);value={done:true,value:await invoke(capability,job)};jobs.delete(request.id);}
  return Response.json({ok:true,capability,result:{value}});
 }});
 return {host,requests,jobs};
}
test('app identity, aliases, URL/email/uninstall intents and nonprivileged operations use Node argument normalization',async()=>{
 const {host,requests}=await fixture(all,(_,r)=>r.method==='getInstalledApps'?[]:true);const app=host.app;
 assert.equal(app.packageName,'owned.host');assert.equal(app.versionCode,7);
 assert.equal(app.launch,app.launchPackage);assert.equal(app.openAppSettings,app.openAppSetting);
 const descriptor=app.intent({action:'VIEW',category:['DEFAULT','BROWSABLE'],flags:[1,2],extras:{text:'quoted " input',list:[1,2]}});
 assert.equal(descriptor.action,'android.intent.action.VIEW');assert.equal(descriptor.flags,3);
 assert.equal(app.parseUri('https://example.test/p?q=v#f').host,'example.test');assert(app.intentToShell(descriptor).includes('android.intent.action.VIEW'));
 await app.openUrl('https://example.test');await app.sendEmail({to:'fixture@example.invalid',subject:'Draft only'});await app.uninstall('owned.fixture');
 await app.startService({packageName:'owned.fixture',className:'FixtureService'});await app.sendBroadcast('owned.fixture.EVENT');await app.getInstalledApps({includeSystem:false});
 const starts=requests.filter(x=>x.action==='start');assert.equal(starts[0].args[0].action,'android.intent.action.VIEW');
 assert.equal(starts[1].args[0].action,'android.intent.action.SENDTO');assert.match(starts[2].args[0].data,/^package:owned.fixture$/);
 assert.equal(starts[3].method,'startService');assert.equal(starts[4].args[0].action,'owned.fixture.EVENT');
 assert.deepEqual(await app.getInstalledApps(),[]);
 for(const name of ['launchDual','uninstallDual','kill','startDualActivity'])await assert.rejects(app[name]('owned.fixture'),{code:'NOT_SUPPORTED'});
 await assert.rejects(app.getUriForFile('/private/file'),{code:'NOT_GRANTED'});
});
test('all 16 local selector builders preserve descriptor validation, regex flags and frozen snapshots',async()=>{
 const {host}=await fixture(all,()=>({text:'fixture',bounds:{left:1,top:2,right:3,bottom:4}}));const a=host.accessibility;
 const selector={...a.textMatches(/fixture/i),...a.clickable(),...a.boundsInside(0,0,100,200)};
 assert.equal(selector.textMatches.pattern,'fixture');assert.equal(selector.textMatches.flags,'i');
 const found=await a.findOne(selector);assert.equal(found.text,'fixture');assert(Object.isFrozen(found));assert(Object.isFrozen(found.bounds));
 assert.throws(()=>a.depth(-1));assert.throws(()=>a.text(''));await assert.rejects(a.click(NaN,1));
 await assert.rejects(a.setText({type:'invalid'},'text'));
 for(const field of ['text','desc','id','className','textContains','descContains','textMatches','descMatches','idMatches','classNameMatches','clickable','enabled','scrollable','depth','boundsInside','boundsContains'])assert.equal(typeof a[field],'function');
});
test('gesture grant is independent, ten-second gestures carry their full execution timeout',async()=>{
 const denied=await fixture(['accessibility.control']);await assert.rejects(denied.host.accessibility.swipe(1,2,3,4,10000),{code:'NOT_GRANTED'});assert.equal(denied.requests.length,0);
 const {host,requests}=await fixture(all,()=>true);assert.equal(await host.accessibility.gesture(10000,[[1,2],[3,4]]),true);
 const start=requests.find(x=>x.action==='start');assert(start.timeoutMs>10000);assert.equal(start.args[0],10000);
});
test('missing grants reject transport and identity while local descriptors stay usable',async()=>{
 const {host,requests}=await fixture([]);assert.equal(host.app.intent({action:'VIEW'}).action,'android.intent.action.VIEW');
 assert.throws(()=>host.app.packageName,{code:'NOT_GRANTED'});
 await assert.rejects(host.app.launchPackage('owned.fixture'),{code:'NOT_GRANTED'});await assert.rejects(host.accessibility.isEnabled(),{code:'NOT_GRANTED'});await assert.rejects(host.clipboard.getText(),{code:'NOT_GRANTED'});assert.equal(requests.length,0);
});
test('clipboard values, pre-abort and timeout validation do not dispatch unintended writes',async()=>{
 let clip='';const {host,requests}=await fixture(all,(cap,r)=>{assert.equal(cap,'clipboard.control');if(r.method==='setText'){clip=r.args[0];return null;}return r.method==='getText'?clip:clip.length>0;});
 await host.clipboard.setText('fixture \u4e2d\u6587');assert.equal(await host.clipboard.getText(),'fixture 中文');assert.equal(await host.clipboard.hasText(),true);
 const count=requests.length,controller=new AbortController();controller.abort(new Error('owned abort'));
 await assert.rejects(host.clipboard.setText('denied',{signal:controller.signal}),/owned abort/);await assert.rejects(host.clipboard.setText('denied',{timeoutMs:Infinity}));assert.equal(requests.length,count);
});
test('automation wire catalog excludes internal Node diagnostics and generic module dispatch',()=>{
 assert.equal(HOST_API_METHODS['app.control'].length,13);assert.equal(HOST_API_METHODS['accessibility.control'].length,16);assert.equal(HOST_API_METHODS['clipboard.control'].length,3);
 for(const name of ['dump','readScreenText','inspectNode','currentWindow','readDoc','pluginCapabilities'])assert(!Object.values(HOST_API_METHODS).flat().includes(name));
});
test('parallel automation operations queue at the four-task limit and release every task',async()=>{
 let peak=0;const fx=await fixture(all,async()=>{peak=Math.max(peak,fx.jobs.size);await new Promise(r=>setTimeout(r,10));return true;});
 assert.deepEqual(await Promise.all(Array.from({length:12},()=>fx.host.clipboard.hasText())),Array(12).fill(true));
 assert.equal(peak,4);assert.equal(fx.jobs.size,0);
});
test('abort after dispatch cancels its pending task without retrying the Android operation',async()=>{
 const controller=new AbortController(),calls=[];
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:['accessibility.control'],limits:{}});
  const body=JSON.parse(init.body);calls.push(body.action);
  const value=body.action==='start'?{id:'owned'}:body.action==='cancel'?true:{done:false};
  if(body.action==='poll')controller.abort(new Error('cancel owned wait'));
  return Response.json({ok:true,capability:'accessibility.control',result:{value}});
 }});
 await assert.rejects(host.accessibility.ensureEnabled({signal:controller.signal}),/cancel owned wait/);
 assert.deepEqual(calls,['start','poll','cancel']);
});
