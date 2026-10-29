import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(grants=['files.control','storage.control']) {
 const requests=[],stores=new Map(),files=new Map(),jobs=new Map();let next=0;
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  const capability=url.split('/').at(-1);
  if(capability==='info')return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{}});
  const r=JSON.parse(init.body);requests.push({capability,...r});let value;
  if(capability==='files.control') {
   const [p,data]=r.args;
   if(r.method==='write')files.set(p,data);
   else if(r.method==='append')files.set(p,Buffer.concat([Buffer.from(files.get(p)||'','base64'),Buffer.from(data,'base64')]).toString('base64'));
   else if(r.method==='read')value=files.get(p)||'';
   else if(r.method==='listDir')value=p==null?[]:['a.txt','b.bin'];
   else value=true;
  } else if(r.action==='start') { const id=String(++next);jobs.set(id,r);value={id}; }
  else if(r.action==='cancel') { jobs.delete(r.id);value=true; }
  else {
   const {method,args:[name,key,data]}=jobs.get(r.id);jobs.delete(r.id);
   const store=stores.get(name)||new Map();stores.set(name,store);let result;
   if(method==='get')result=store.has(key)?{found:true,value:store.get(key)}:{found:false};
   if(method==='put')store.set(key,data);
   if(method==='remove')store.delete(key);
   if(method==='clear')store.clear();
   if(method==='keys')result=[...store.keys()].sort();
   if(method==='contains')result=store.has(key);
   value={done:true,value:result??null};
  }
  return Response.json({ok:true,capability,result:{value:value??null}});
 }});
 return {host,requests,stores,files};
}
test('files preserve encodings, Unicode, nullish text and void writes over encoded host bytes',async()=>{
 const {host:{files}}=await fixture();
 for(const encoding of ['utf8','utf16le','latin1','ascii','hex','base64','base64url']) {
  const input=encoding==='hex'?'00ff4142':encoding.startsWith('base64')?'AP9BQg==':'Hello \u4e2d\u6587\ud83d\ude00';
  assert.equal(await files.write('owned',input,encoding),undefined);
  assert.equal(await files.read('owned',encoding),Buffer.from(input,encoding).toString(encoding));
 }
 await files.write('owned',null);await files.append('owned',123);assert.equal(await files.read('owned'),'123');
 assert.equal(await files.read(null,'invalid'), '');
 await assert.rejects(files.write(null,'x'),TypeError);await assert.rejects(files.write('owned','x','invalid'),TypeError);
});
test('files keep strict directory filters, Rhino path helpers and Java handle entries',async()=>{
 const {host:{files},requests}=await fixture();
 assert.deepEqual(await files.listDir('owned',name=>name.endsWith('.txt')),['a.txt']);
 assert.deepEqual(await files.listDir('owned',()=>1),[]);
 assert.deepEqual(await files.listDir(null,42),[]);await assert.rejects(files.listDir('owned',42),TypeError);
 // The path helpers are the shared JS tools core's (Rhino's PFiles: join does not normalize the children).
 assert.equal(files.join('/a','/b','../c/'),'/a/b/../c');assert.equal(files.getName('/a/b.txt/'),'b.txt');
 assert.equal(files.getExtension('.hidden'),'');assert.equal(files.getExtension('a.tar.gz'),'gz');
 await files.path('file:///tmp/owned%20file');assert.equal(requests.at(-1).args[0],'/tmp/owned file');
 // open / toFile return Java handles through the Java facade (java.interop, not granted here) after the arity check.
 await assert.rejects(files.open(),TypeError);await assert.rejects(files.toFile('x'),{code:'NOT_GRANTED'});
});
test('storage preserves missing versus JSON null, defaults, aliases, keys and asynchronous Sync methods',async()=>{
 const {host}=await fixture();const store=host.storage.create(' owned '),alias=host.storages.open('owned');
 assert.equal(store.name,'owned');assert.equal(await store.get('missing'),undefined);assert.equal(await store.get('missing',false),false);
 for(const [key,value] of Object.entries({nil:null,no:false,zero:0,text:'\u4e2d\u6587',nested:{items:[1,null,true]}}))await store.putSync(key,value);
 assert.equal(await alias.get('nil','fallback'),null);assert.equal(await alias.get('no',true),false);
 const keys=await store.keys();assert(Object.isFrozen(keys));assert.deepEqual(keys,['nested','nil','no','text','zero']);
 assert.equal(store.putSync,store.put);assert.equal(store.removeSync,store.remove);assert.equal(store.clearSync,store.clear);
 assert.equal(store.selfRemoveSync,store.selfRemove);assert.equal(await store.contains('zero'),true);
 await store.removeSync('zero');assert.equal(await store.contains('zero'),false);
 await store.selfRemoveSync();assert.deepEqual(await alias.keys(),[]);
 await alias.put('a',1);await host.storages.removeSync('owned');assert.deepEqual(await store.keys(),[]);
 // names / all list the non-empty stores the runtime registered (Q79 (a)).
 assert.deepEqual(await host.storage.names(),[]);assert.deepEqual(await host.storages.all(),[]);
 await alias.put('a',1);assert.deepEqual(await host.storages.names(),['owned']);assert.equal((await host.storages.all())[0].name,'owned');
});
test('storage rejects invalid names and nonserializable values before dispatch and honors pre-abort',async()=>{
 const {host,requests}=await fixture(),store=host.storage.open('owned');
 for(const name of ['', '\u0000', 'x'.repeat(129)])assert.throws(()=>host.storage.create(name),{code:'INVALID_REQUEST'});
 const cycle={};cycle.self=cycle;
 for(const value of [undefined,()=>{},Symbol('owned'),1n,cycle])assert.throws(()=>store.put('key',value),{code:'INVALID_REQUEST'});
 const controller=new AbortController();controller.abort(new Error('owned cancel'));await assert.rejects(store.get('key',null,{signal:controller.signal}),/owned cancel/);
 assert.equal(requests.length,0);
});
test('files and storage grants remain independent and local filename helpers require neither',async()=>{
 for(const grants of [[],['files.control'],['storage.control']]) {
  const {host,requests}=await fixture(grants);
  if(!grants.includes('files.control'))await assert.rejects(host.files.read('x'),{code:'NOT_GRANTED'});
  if(!grants.includes('storage.control'))await assert.rejects(host.storage.open('owned').get('key'),{code:'NOT_GRANTED'});
  assert.equal(host.files.join('a','b'),'a/b');assert.equal(requests.length,0);
 }
});
test('files prototype members of Rhino reach the host with encoded bytes and keep host results',async()=>{
 const {host:{files},requests}=await fixture();
 assert.equal(await files.writeBytes('b.bin',new Uint8Array([0,255,65])),undefined);
 assert.equal(requests.at(-1).args[1],Buffer.from([0,255,65]).toString('base64'));
 await files.appendBytes('b.bin',[-1,256,66]);
 assert.equal(requests.at(-1).args[1],Buffer.from([255,0,66]).toString('base64'));
 await files.writeBytes('c.bin',new Uint16Array([0x4241]).buffer);
 assert.equal(requests.at(-1).args[1],Buffer.from([0x41,0x42]).toString('base64'));
 await assert.rejects(files.writeBytes('b.bin',null),TypeError);
 await assert.rejects(files.writeBytes('b.bin','text'),TypeError);
 await assert.rejects(files.readBytes(null),TypeError);
 await assert.rejects(files.rename('x',null),TypeError);
 for(const method of ['create','createIfNotExists','createWithDirs','removeDir','isEmptyDir'])assert.equal(await files[method]('p'),true);
 assert.equal(await files.rename('x','y'),true);assert.deepEqual(requests.at(-1).args,['x','y']);
 assert.equal(await files.renameWithoutExtension('x.txt','y'),true);
 await files.cwd();assert.deepEqual([requests.at(-1).method,requests.at(-1).args],['cwd',[]]);
 // Without device-info.json, the path the Node runtime derives from the user id.
 assert.equal(files.sdcardPath,'/storage/emulated/0');assert.equal(files.getSdcardPath(),files.sdcardPath);
 assert(requests.every(request=>request.capability==='files.control'));
});
