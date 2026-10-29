// Bun wiring of the shared Rhino app / shell / shizuku members (api-coverage P4.1a): Node capability names map to Bun
// grants (shell -> shell.control, app.* -> app.control), a grant that is off rejects NOT_GRANTED with the missing grants
// before the host (Q90), host denials stay failed command results, and the D-4 helpers run "am" through the shell
// routes over the automation transport. The command parsing itself is Node's tools/nodejs/api/test-app-shell-rhino.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient,HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

const ALL=['app.control','shell.control','shell.root','shell.shizuku'];
const DUMP='ACTIVITY MANAGER ACTIVITIES (dumpsys activity activities)\n  Display #0\n    mResumedActivity: ActivityRecord{1a2b u0 com.example/.MainActivity t12}\n';
async function fixture({grants=ALL,access={},respond=()=>({}),users=[10],denySpawn=false}={}){
 const requests=[],jobs=new Map(),live=new Map();let n=0;
 const state={shell:true,rootAvailable:false,shizukuRunning:true,shizukuGranted:true,shizuku:true,shizukuInstalled:true,shizukuHasService:true,shizukuOperational:true,uid:10123,missingCapabilities:[],...access};
 function answer(capability,job){
  const [first,second]=job.args||[];
  if(capability==='app.control'){
   if(job.method==='resolvePackage')return first==='owned'?{packageName:'owned.fixture',via:'package',launchIntent:{packageName:'owned.fixture',className:'owned.fixture.Main',action:'android.intent.action.MAIN'}}:null;
   if(job.method==='getUserProfiles')return {current:0,others:users};
   if(job.method==='getApkInfo')return {packageName:'owned.fixture',versionName:'1.0',versionCode:3};
   return null;
  }
  if(job.method==='getAccess')return state;
  if(job.method==='spawn'){
   if(denySpawn)return {error:{code:'NOT_GRANTED',message:'Shizuku must be running and must authorize this application'}};
   const id='p'+ ++n,out=respond(first,second)||{},queue=[];
   if(out.stdout)queue.push({type:'stdout',data:Buffer.from(out.stdout).toString('base64')});
   if(out.stderr)queue.push({type:'stderr',data:Buffer.from(out.stderr).toString('base64')});
   queue.push({type:'exit',code:out.code??0,timedOut:false});live.set(id,queue);
   return {id,pid:n,mode:second?.shizuku?'adb':second?.root?'root':'sh'};
  }
  if(job.method==='drain'){const queue=live.get(first)||[];live.delete(first);return queue;}
  if(job.method==='close'){live.delete(first);return {wasAlive:false,code:0};}
  return null;
 }
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  const capability=url.split('/').at(-1);
  if(capability==='info')return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{}});
  const request=JSON.parse(init.body);requests.push({capability,...request});let value;
  if(request.action==='identity')value={packageName:'org.autojs.autojs6',versionName:'6.8.0',versionCode:5935};
  else if(request.action==='start'){const id=String(jobs.size+requests.length);jobs.set(id,request);value={id};}
  else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
  else {
   const result=answer(capability,jobs.get(request.id));jobs.delete(request.id);
   if(result?.error)return Response.json({ok:false,capability,error:result.error},{status:403});
   value={done:true,value:result};
  }
  return Response.json({ok:true,capability,result:{value}});
 }});
 const spawned=()=>requests.filter(r=>r.action==='start'&&r.method==='spawn').map(r=>({command:r.args[0],root:r.args[1].root,shizuku:r.args[1].shizuku}));
 return {host,requests,spawned};
}
const missing=grants=>error=>{assert.equal(error.code,'NOT_GRANTED');assert.deepEqual([...error.missingCapabilities],grants);return true;};

test('app.control carries the Rhino package queries and local broadcasts of the Node app routes',()=>{
 assert.equal(HOST_API_METHODS['app.control'].length,19);
 for(const name of ['resolvePackage','getUserProfiles','getInstalledPackages','getApkInfo','getAppByAlias','sendLocalBroadcastSync'])assert(HOST_API_METHODS['app.control'].includes(name),name);
 assert.equal(HOST_API_METHODS['shell.control'].length,10);
});
test('D-4 helpers run am through a usable Shizuku for every other user and report Rhino results',async()=>{
 const {host,spawned}=await fixture({respond:command=>command.startsWith('cmd package list')?{stdout:'package:owned.fixture\n'}:{}});
 assert.equal(await host.app.kill('owned'),true);
 assert.equal(await host.app.launchDual('owned'),true);
 assert.equal(await host.app.isDualInstalled('owned'),true);
 assert.equal(await host.app.killDual('owned'),true);
 assert.equal(await host.app.kill('unknown'),false);
 const commands=spawned();
 assert.deepEqual(commands.map(c=>c.shizuku),[true,true,true,true]);
 assert.equal(commands[0].command,'am force-stop owned.fixture');
 assert.match(commands[1].command,/^am start .*--user 10/);
 assert.equal(commands[2].command,'cmd package list packages --user 10 owned.fixture');
 assert.deepEqual(await host.app.getApkInfo('/sdcard/owned.apk'),{packageName:'owned.fixture',versionName:'1.0',versionCode:3});
});
test('without the shell grants the D-4 helpers reject NOT_GRANTED before the host',async()=>{
 const {host,requests}=await fixture({grants:['app.control']});const before=requests.length;
 for(const name of ['kill','killDual','launchDual','isDualInstalled','uninstallDual','startDualActivity','openDualUrl'])
  await assert.rejects(host.app[name]('owned'),missing(['shell.control']),name);
 assert.equal(requests.length,before);
 const none=await fixture({grants:[]});
 await assert.rejects(none.host.app.getApkInfo('/sdcard/owned.apk'),missing(['app.control']));
 await assert.rejects(none.host.shell.execCommand('true'),missing(['shell.control']));
 await assert.rejects(none.host.shell.Home(),missing(['shell.control','shell.root']));
 await assert.rejects(none.host.shizuku.execCommand('true'),missing(['shell.control','shell.shizuku']));
 assert.equal(none.requests.length,0);
});
test('Rhino command results, root defaults and host denials as failed results',async()=>{
 const {host,spawned}=await fixture({respond:command=>command==='echo hi'?{stdout:'hi'}:{stderr:'Error type 3\n',code:0}});
 assert.deepEqual({...await host.shell.execCommand('echo hi')},{code:0,result:'hi\n',error:'',timedOut:false,truncated:false});
 assert.equal((await host.shell.execCommand('bad')).code,3);
 assert.equal(host.shell.getCommand('ls',true),'su\nls');
 assert.deepEqual(spawned().map(c=>c.command),['echo hi','bad']);
 // A process the host does not start is a failed result with code 1, as in Rhino; a Shizuku that cannot be used
 // rejects (Rhino's Shizuku shell throws) without being a grant error; a grant that is off rejects.
 const denied=await fixture({denySpawn:true});
 const result=await denied.host.shell.execCommand('id',true);
 assert.equal(result.code,1);assert.match(result.error,/Shizuku must be running/);
 await assert.rejects(denied.host.shizuku.execCommand('id'),error=>/Shizuku must be running/.test(error.message)&&!error.missingCapabilities);
 const partial=await fixture({grants:['shell.control']});
 await assert.rejects(partial.host.shell.execCommand('id',true),missing(['shell.root']));
 assert.equal(partial.requests.length,0);
});
test('foreground queries, key functions, SetScreenMetrics and fromIntent use the shared shell routes',async()=>{
 const {host,spawned}=await fixture({respond:command=>command==='dumpsys activity activities'?{stdout:DUMP}:{}});
 assert.equal(await host.shell.currentPackage(),'');
 assert.equal(await host.shizuku.currentComponent(),'com.example/com.example.MainActivity');
 assert.equal(await host.shizuku.currentPackage(),'com.example');
 await host.shell.Home();
 assert.deepEqual(spawned().at(-1),{command:'input keyevent 3',root:false,shizuku:true});
 await assert.rejects(host.shell.KeyCode('no-such-key'),RangeError);
 host.shell.SetScreenMetrics(540,1200);
 await host.shell.Tap(270,600);
 // No device-info.json outside the plugin: the display size is unknown and the coordinates stay unscaled.
 assert.deepEqual(spawned().at(-1),{command:'input tap 270 600',root:true,shizuku:false});
 assert.equal(host.shell.fromIntent({action:'VIEW',data:'https://example.test'}),host.app.intentToShell({action:'VIEW',data:'https://example.test'}));
 assert.deepEqual({...await host.shizuku.state},{isInstalled:true,hasService:true,isRunning:true,hasPermission:true,isOperational:true});
 assert.equal(await host.shizuku.hasPermission(),true);
 assert.equal(await host.shell.isRootAvailable(),false);
});
test('ShellProcess carries the Rhino stream getters, isAlive, toString and the EventEmitter aliases',async()=>{
 const {host}=await fixture({respond:()=>({stdout:'x'})});
 const process=host.shell.spawn('echo x');
 for(const name of ['isAlive','toString','getInputStream','getErrorStream','getOutputStream','addListener','removeListener','prependListener','prependOnceListener','listenerCount'])
  assert.equal(typeof process[name],'function',name);
 assert.equal(process.getInputStream(),process.stdout);assert.equal(process.getOutputStream(),process.stdin);
 await process.ready;await process.waitFor();await process.close();
 assert.equal(process.isAlive(),false);
});
