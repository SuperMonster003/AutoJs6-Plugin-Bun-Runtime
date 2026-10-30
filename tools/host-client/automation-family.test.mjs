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

test('automator and auto reach accessibility.control as second modules, with the gesture and service grants on top',async()=>{
  const host=await client(['accessibility.control','screen.capture'],(method,args)=>method==='captureScreenImage'?{id:'img-1',__autojs6ImageHandle:'img-1',width:2,height:3}:true);
  assert.equal(await host.automator.click(10,20),true);
  assert.deepEqual(host.calls.at(-1),{capability:'accessibility.control',module:'automator',method:'tap',args:[10,20,'click']});
  assert.equal(await host.global.notifications(),true);
  assert.deepEqual(host.calls.at(-1),{capability:'accessibility.control',module:'automator',method:'globalAction',args:['notifications']});
  assert.equal((await host.automator.captureScreen()).id,'img-1');
  assert.deepEqual(host.calls.at(-1),{capability:'accessibility.control',module:undefined,method:'captureScreenImage',args:[]});
  await host.auto.dump();
  assert.equal(host.calls.at(-1).method,'dump');
  const count=host.calls.length;
  for(const [call,missing] of [[()=>host.automator.press(1,2),'accessibility.gesture'],[()=>host.global.swipe(0,0,9,9,100),'accessibility.gesture'],
    [()=>host.auto.start(),'accessibility.service'],[()=>host.auto.disable(),'accessibility.service'],[()=>host.auto.launchSettings(),'accessibility.service']]){
    await assert.rejects(call(),error=>error.code==='NOT_GRANTED'&&error.missingCapabilities.includes(missing));
  }
  assert.equal(host.calls.length,count,'Denied calls must not reach the host');
  const bare=await client([],()=>true);
  await assert.rejects(bare.automator.captureScreen(),error=>error.code==='NOT_GRANTED'&&error.missingCapabilities.join()==='accessibility.control,screen.capture');
  await assert.rejects(bare.auto.isRunning(),error=>error.code==='NOT_GRANTED');
  assert.deepEqual(bare.calls,[]);
});

test('touches and key interception need their own grants beside events.observe',async()=>{
  const host=await client(['events.observe','events.key','accessibility.control'],()=>({id:'observer-1',source:'touch'}));
  await assert.rejects(host.events.observeTouch(),error=>error.code==='NOT_GRANTED'&&error.missingCapabilities.join()==='events.touch');
  await assert.rejects(host.events.setKeyInterceptionEnabled(true),error=>error.code==='NOT_GRANTED'&&error.missingCapabilities.join()==='events.key.intercept');
  assert.deepEqual(host.calls,[]);
  assert.equal(typeof host.events.emitter().emitSticky,'function');
  assert.equal(typeof host.events.broadcast.emit,'function');
});

test('ocr, barcode, qrcode and yolo use their grants with images handles of this execution',async()=>{
  const image={id:'img-7',__autojs6ImageHandle:'img-7',width:4,height:4};
  const host=await client(['ocr.control','barcode.control','yolo.control'],(method,args,capability)=>{
    if(capability==='ocr.control')return [{text:'A',confidence:0.9,bounds:{left:0,top:0,right:2,bottom:1},extras:{quad:[0,0,2,0,2,1,0,1],nested:{items:[1]},executionProvider:'cpu'}},{text:'B'}];
    if(capability==='barcode.control')return method==='recognizeText'?'qr-text':{format:'QR_CODE',rawValue:'qr-text'};
    return method==='load'?{id:'yolo-1',component:'p/c'}:method==='detect'?[{classId:1,label:'cat',confidence:0.8,bounds:{left:0,top:0,right:1,bottom:1}}]:true;
  });
  assert.equal(await host.ocr.recognizeText(image),'A\nB');
  assert.deepEqual(host.calls.at(-1),{capability:'ocr.control',module:undefined,method:'recognizeText',args:[{__autojs6ImageHandle:'img-7',id:'img-7'},{}]});
  await host.ocr.mlkit.detect(image,{region:[0,0,2,2]});
  assert.deepEqual(host.calls.at(-1).args[1],{region:[0,0,2,2],engine:'mlkit-ocr'});
  assert.equal(host.calls.at(-1).method,'detectTextBounds');
  const [withExtras,withoutExtras]=await host.ocr.detect(image);
  assert.deepEqual(withExtras.extras,{quad:[0,0,2,0,2,1,0,1],nested:{items:[1]},executionProvider:'cpu'});
  assert(Object.isFrozen(withExtras.extras)&&Object.isFrozen(withExtras.extras.quad)&&Object.isFrozen(withExtras.extras.nested.items));
  assert.deepEqual(withoutExtras.extras,{});
  host.ocr.tap('paddle');assert.equal(host.ocr.mode,'paddle');
  await host.ocr.recognize(image);assert.equal(host.calls.at(-1).args[1].engine,'paddle-ocr');
  assert.equal(await host.qrcode.recognizeText(image),'qr-text');
  assert.deepEqual(host.calls.at(-1),{capability:'barcode.control',module:undefined,method:'recognizeText',args:[{__autojs6ImageHandle:'img-7',id:'img-7'},{qrOnly:true,formats:['QR_CODE']}]});
  assert(Object.isFrozen(await host.barcode.detect(image,{formats:['qrcode','ean-13']})));
  assert.deepEqual(host.calls.at(-1).args[1],{formats:['QR_CODE','EAN_13']});
  const detector=await host.yolo.load('/sdcard/model',{component:'p/c'});
  assert.equal((await detector.detect(image))[0].label,'cat');
  assert.deepEqual(host.calls.at(-1),{capability:'yolo.control',module:undefined,method:'detect',args:['yolo-1','img-7',{}]});
  assert.equal(await detector.close(),true);assert.equal(await detector.close(),false);
  const bare=await client([],()=>true);
  await assert.rejects(bare.ocr.detect(image),error=>error.missingCapabilities?.join()==='ocr.control');
  await assert.rejects(bare.qrcode.detect(image),error=>error.missingCapabilities?.join()==='barcode.control');
  await assert.rejects(bare.yolo.load('/m',{component:'p/c'}),error=>error.missingCapabilities?.join()==='yolo.control');
  assert.deepEqual(bare.calls,[]);
});

test('threads, continuation, timers and the family globals are local and host.global.install puts them on a target',async()=>{
  const host=await client([]);
  const counter=host.threads.atomic(5);assert.equal(counter.incrementAndGet(),6);
  const lock=host.threads.lock();await lock.lock();assert.equal(lock.isLocked(),true);lock.unlock();
  const box=host.threads.disposable();setTimeout(()=>box.setAndNotify('v'),5);assert.equal(await box.blockedGet(1000),'v');
  assert.equal(host.continuation.enabled,false);
  const timer=host.timers.keepAlive(50);assert.equal(typeof timer,'number');clearTimeout(timer);
  const target={};const names=host.global.install(target);
  for(const name of ['click','press','swipe','sleep','wait','keepAlive','sync','pickup','existsAll','toastLog'])assert(names.includes(name),name);
  assert.equal(target.click,host.automator.click);assert.equal(target.keepAlive,host.timers.keepAlive);
  assert.equal(Object.keys(target).length,0,'Installed globals are not enumerable');
  const started=Date.now();await target.sleep(20,30);assert(Date.now()-started>=15);
});
