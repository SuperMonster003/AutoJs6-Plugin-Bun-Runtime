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

// A client copied next to a device-info.json as the plugin writes it.
async function client(capabilities,deviceInfo={sdkInt:33,density:2.75,densityDpi:440,scaledDensity:2.75,build:BUILD}){
  const directory=mkdtempSync(join(tmpdir(),'aj6-bun-device-media-'));
  copyFileSync(new URL('../../app/src/main/assets/autojs6/host-client.mjs',import.meta.url),join(directory,'host-client.mjs'));
  writeFileSync(join(directory,'device-info.json'),JSON.stringify(deviceInfo));
  try{
    const module=await import(pathToFileURL(join(directory,'host-client.mjs')).href);
    return await module.createHostClient({socket:'fixture',fetch:async()=>Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}})});
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
