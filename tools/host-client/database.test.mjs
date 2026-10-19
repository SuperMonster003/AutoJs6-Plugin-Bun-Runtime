import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(granted=true) {
 const calls=[],jobs=new Map();let counter=0;
 const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
  if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:granted?['database.control']:[],limits:{}});
  const r=JSON.parse(init.body);calls.push(r);let value;
  if(r.action==='start'){const id=String(++counter);jobs.set(id,r);value={id};}
  else if(r.action==='cancel'){jobs.delete(r.id);value=true;}
  else {
   const job=jobs.get(r.id);jobs.delete(r.id);let result=null;
   if(job.method==='open')result={id:'db-'+r.id,name:job.args[0].name};
   if(job.method==='run')result={rowsAffected:2,insertId:2};
   if(job.method==='all')result=[{n:1}];
   if(job.method==='transaction')result=[null,{rowsAffected:1,insertId:1},null,[]];
   if(job.method==='close')result=true;
   value={done:true,value:result};
  }
  return Response.json({ok:true,capability:'database.control',result:{value}});
 }});return {host,calls};
}
test('database and callable sqlite expose the shared facade and forward open object options',async()=>{
 const {host,calls}=await fixture(),db=await host.database.open({name:'owned',timeoutMs:37});
 assert.equal(db.name,'owned');assert.equal(calls[0].timeoutMs,37);assert(Object.isFrozen(db));
 await host.sqlite({name:'alias',timeoutMs:41});assert.equal(calls.find(r=>r.args?.[0]?.name==='alias').timeoutMs,41);
 assert.equal(await db.exec('CREATE TABLE owned(id)'),undefined);assert.deepEqual(await db.run('INSERT INTO owned VALUES(1),(2)'),{rowsAffected:2,insertId:2});
 assert.equal(await db.get('SELECT * FROM owned'),null);assert(Object.isFrozen(await db.all('SELECT * FROM owned')));
 assert.deepEqual(await db.transaction([{type:'exec',sql:'DELETE FROM owned'},{type:'run',sql:'INSERT INTO owned VALUES(?)',params:[null]},{type:'get',sql:'SELECT * FROM owned'},{type:'all',sql:'SELECT * FROM owned'}]),[null,{rowsAffected:1,insertId:1},null,[]]);
 assert.equal(await db.close(),true);assert.equal(await db.close(),false);assert.throws(()=>db.get('SELECT 1'),/closed/);
});
test('database grant is independent and raw transport is not offered by file or storage wrappers',async()=>{
 const {host,calls}=await fixture(false);await assert.rejects(host.database.open('owned'),{code:'NOT_GRANTED'});assert.equal(calls.length,0);
});
test('database rejects malformed names, nonfinite parameters and unsupported callback transactions',async()=>{
 const {host,calls}=await fixture();for(const name of [{},{name:null},'',null,'../outside'])assert.throws(()=>host.database.open(name));
 assert.equal(calls.length,0);const db=await host.sqlite.open('owned');
 for(const value of [NaN,Infinity,{},1n])assert.throws(()=>db.run('SELECT ?',[value]),{code:'INVALID_REQUEST'});
 assert.throws(()=>db.transaction(()=>{}),{code:'INVALID_REQUEST'});assert.throws(()=>db.exec('ATTACH DATABASE "x" AS y'),{code:'NOT_GRANTED'});
 assert.throws(()=>db.transaction(Array(65).fill({type:'exec',sql:'SELECT 1'})),{code:'QUOTA_EXCEEDED'});
});
test('pre-aborted database object options never dispatch open',async()=>{
 const {host,calls}=await fixture(),controller=new AbortController();controller.abort(new Error('owned abort'));
 await assert.rejects(host.sqlite({name:'owned',signal:controller.signal}),/owned abort/);assert.equal(calls.length,0);
});
