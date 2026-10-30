// Rhino's device / sensors / media family in the Bun host client (AutoJs6 api-coverage P4.1c).
import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const BUILD={buildId:'TKQ1.221114.001 test-keys',buildDisplay:'TKQ1.221114.001 test-keys',product:'sunstone',board:'sunstone',brand:'Redmi',
  manufacturer:'Xiaomi',device:'sunstone',model:'22120RN86C',bootloader:'unknown',hardware:'qcom',fingerprint:'Redmi/sunstone/sunstone:13/TKQ1/V14:user/release-keys',
  incremental:'V14.0.3',release:'13',baseOS:'',securityPatch:'2023-05-01',codename:'REL'};

// BunDeviceProfile's part of device-info.json (Q154 (a)).
const PROFILE={width:1080,height:2400,pageSize:16384,marketName:'Redmi Note 12 Turbo',manufacturers:{isXiaomi:true,isHtc:false},
  brands:{isRedmi:true},roms:{isMiui:true,isFlyme:false},sensors:{light:{name:'TSL2540',vendor:'ams',type:5,maximumRange:10000},accelerometer:{name:'ACC',type:1}}};

// A client copied next to a device-info.json as the plugin writes it. Without a reply function the fixture host answers every
// request as /info; with one, automation jobs finish at once with reply(method, args, capability) and calls records them.
async function client(capabilities,deviceInfo={sdkInt:33,density:2.75,densityDpi:440,scaledDensity:2.75,build:BUILD},reply){
  const directory=mkdtempSync(join(tmpdir(),'aj6-bun-device-media-'));
  copyFileSync(new URL('../../app/src/main/assets/autojs6/host-client.mjs',import.meta.url),join(directory,'host-client.mjs'));
  writeFileSync(join(directory,'device-info.json'),JSON.stringify(deviceInfo));
  const calls=[],jobs=new Map();let next=0;
  const fetch=async(url,init)=>{
    if(!reply||url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);let value;
    if(request.action==='start'){calls.push({capability,method:request.method,args:request.args});const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else{const job=jobs.get(request.id);jobs.delete(request.id);value={done:true,value:reply(job.method,job.args,capability)};}
    return Response.json({ok:true,capability,result:{value}});
  };
  try{
    const module=await import(pathToFileURL(join(directory,'host-client.mjs')).href);
    const host=await module.createHostClient({socket:'fixture',fetch});
    return reply?Object.assign(Object.create(host),{calls}):host;
  }finally{rmSync(directory,{recursive:true,force:true});}
}

test('Bun device Build fields are Rhino\'s synchronous strings of device-info.json with device.info',async()=>{
  const host=await client(['device.info']);
  assert.equal(host.device.sdkInt,33);
  for(const [key,value] of Object.entries(BUILD))assert.equal(host.device[key],value,key);
  // The async getters of the info route stay as they were.
  assert.equal(typeof host.device.getBoard,'function');
});

test('Bun device Build fields are absent without device.info',async()=>{
  const host=await client(['device.control']);
  for(const key of ['sdkInt',...Object.keys(BUILD)])assert.equal(host.device[key],undefined,key);
  assert.equal(typeof host.device.getModel,'function');
});

test('Bun device Build fields ignore what is not a string',async()=>{
  const host=await client(['device.info'],{sdkInt:35,density:2,densityDpi:320,scaledDensity:2,build:{brand:'Redmi',model:7,board:null}});
  assert.deepEqual([host.device.brand,host.device.model,host.device.board,host.device.sdkInt],['Redmi',undefined,undefined,35]);
});

// The fixture host answers every request as /info, so a call that reached it would fail with INVALID_RESPONSE instead.
test('Bun device and sensors calls whose grants are off reject NOT_GRANTED with the missing Bun grants',async()=>{
  const host=await client(['device.info','device.control']);
  for(const [call,missing] of [
    [()=>host.device.keepScreenOn(1000),['device.power']],
    [()=>host.device.getMusicVolume(),['device.audio']],
    [()=>host.sensors.getAvailableSensors(),['sensors.control']],
  ])await assert.rejects(call(),error=>error.code==='NOT_GRANTED'&&JSON.stringify(error.missingCapabilities)===JSON.stringify(missing));
});

const WITH_PROFILE={sdkInt:33,density:2.75,densityDpi:440,scaledDensity:2.75,build:BUILD,...PROFILE};
const notGranted=missing=>error=>error.code==='NOT_GRANTED'&&JSON.stringify(error.missingCapabilities)===JSON.stringify(missing);

test('Bun device snapshot members follow Rhino with device.info and the getters ask the host per read (Q154 (a))',async()=>{
  const host=await client(['device.info','device.control'],WITH_PROFILE,method=>({getRotation:1,isBackgroundStartGranted:true})[method]??null);
  assert.deepEqual([host.device.width,host.device.height,host.device.density,host.device.pageSize],[1080,2400,440,16384]);
  assert.equal(host.device.getMarketName(),'Redmi Note 12 Turbo');
  assert.equal(host.device.digest(),'Redmi (Xiaomi) / sunstone (22120RN86C) / 13 (33)');
  assert.deepEqual([host.device.isManufacturer(' XIAOMI '),host.device.isManufacturer('oppo')],[true,false]);
  assert.deepEqual([host.device.manufacturers.isXiaomi(),host.device.manufacturers.isOppo(),host.device.brands.isRedmi(),host.device.roms.isMiui()],[true,false,true,true]);
  // Copying the module kept the getters: nothing reached the host until they are read.
  assert.equal(typeof Object.getOwnPropertyDescriptor(host.device,'rotation').get,'function');
  assert.equal(host.calls.length,0);
  assert.equal(await host.device.rotation,1);
  assert.equal(await host.device.roms.isBackgroundStartGranted(),true);
  assert.deepEqual(host.calls.map(call=>[call.capability,call.method]),[['device.control','getRotation'],['device.control','isBackgroundStartGranted']]);
});

test('Bun device snapshot members are absent without device.info, roms keeps isBackgroundStartGranted',async()=>{
  const host=await client(['device.control'],WITH_PROFILE,()=>false);
  for(const key of ['sdkInt','width','height','density','densityDpi','pageSize','digest','getMarketName','isManufacturer','manufacturers','brands'])assert(!(key in host.device),key);
  assert.deepEqual(Object.keys(host.device.roms),['isBackgroundStartGranted']);
  assert.equal(await host.device.roms.isBackgroundStartGranted(),false);
});

test('Bun hardware identifiers need device.identifiers (Q153 (a))',async()=>{
  const denied=await client(['device.info','device.control'],undefined,()=>'id');
  for(const call of [()=>denied.device.getIMEI(),()=>denied.device.imei,()=>denied.device.getAndroidId()])await assert.rejects(call(),notGranted(['device.identifiers']));
  assert.equal(denied.calls.length,0);
  const granted=await client(['device.info','device.control','device.identifiers'],undefined,()=>'id');
  assert.equal(await granted.device.getAndroidId(true),'id');
  assert.deepEqual(granted.calls,[{capability:'device.control',method:'getAndroidId',args:[true]}]);
});

test('Bun sensors answer getSensor and register from the snapshot sensor list that comes with device.info (Q147 (a) / Q154 (a))',async()=>{
  const host=await client(['device.info','sensors.control'],WITH_PROFILE);
  assert.equal(host.sensors.getSensor('LIGHT').name,'TSL2540');
  assert.equal(host.sensors.getSensor('pressure'),null);
  assert.equal(host.sensors.register('pressure'),null);
  assert.deepEqual({...host.sensors.delay},{normal:3,ui:2,game:1,fastest:0});
  assert.equal((await client(['sensors.control'],WITH_PROFILE)).sensors.getSensor('light'),null);
  // Without sensors.control register is NOT_GRANTED before any subscription (Q90), and before the sensor list, which is empty
  // without device.info.
  const denied=await client(['device.info'],WITH_PROFILE);
  assert.throws(()=>denied.sensors.register('light'),notGranted(['sensors.control']));
  assert.throws(()=>denied.sensors.register('pressure'),notGranted(['sensors.control']));
  const blind=await client([],WITH_PROFILE);
  assert.throws(()=>blind.sensors.register('light'),notGranted(['sensors.control']));
});

test('Bun media plays through media.control and scans through media.library (Q149 (a) / Q152 (a))',async()=>{
  const denied=await client(['device.info'],undefined,()=>null);
  await assert.rejects(denied.media.playMusic('/sdcard/a.mp3'),notGranted(['media.control']));
  await assert.rejects(denied.media.scanFile('/sdcard/a.mp3'),notGranted(['media.library']));
  assert.equal(denied.calls.length,0);
  const host=await client(['media.control','media.library'],undefined,method=>({
    play:{id:'media-playback-1',path:'/sdcard/a.mp3',looping:true,volume:0.5,active:true,playing:true},
    getPlaybackStatus:{id:null,active:false},stop:{id:'media-playback-1',active:false},scanFile:{scanned:true,uri:'content://media/1'}})[method]);
  const session=await host.media.playMusic('/sdcard/a.mp3',0.5,true);
  assert.deepEqual([session.id,session.path,session.looping,session.volume],['media-playback-1','/sdcard/a.mp3',true,0.5]);
  await session.stop();
  assert.deepEqual([await host.media.isMusicPlaying(),await host.media.getMusicDuration(),await host.media.getMusicCurrentPosition()],[false,0,-1]);
  assert.equal(await host.media.stopMusic(),undefined);
  assert.equal(await host.media.scanFile('/sdcard/a.mp3'),true);
  await assert.rejects(host.media.playMusic(''),{code:'ERR_AUTOJS6_BRIDGE_INVALID_REQUEST'});
  await assert.rejects(host.media.playMusic('/sdcard/a.mp3',2),TypeError);
  assert.deepEqual(host.calls.map(call=>[call.capability,call.method,call.args]),[
    ['media.control','play',['/sdcard/a.mp3',{volume:0.5,looping:true}]],['media.control','stop',[{id:'media-playback-1'}]],
    ['media.control','getPlaybackStatus',[]],['media.control','getPlaybackStatus',[]],['media.control','getPlaybackStatus',[]],
    ['media.control','stop',[]],['media.library','scanFile',['/sdcard/a.mp3',{}]]]);
});
