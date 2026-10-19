import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(grants=['java.interop']) {
  const calls=[],jobs=new Map();let next=0;
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});let value;
    if(request.action==='start'){const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else {const job=jobs.get(request.id);jobs.delete(request.id);value={done:true,value:job.method==='new'?{__autojs6JavaHandle:'owned',className:'android.os.Bundle'}:job.method==='call'?{__autojs6JavaLong:'9223372036854775807'}:true};}
    return Response.json({ok:true,capability,result:{value}});
  }});return {host,calls};
}
test('Bun Java object calls use the Java grant and preserve bigint and typed null',async()=>{
  const f=await fixture(),bundle=await f.host.java.new('android.os.Bundle');
  assert.equal(await bundle.call('getLong',['exact',9223372036854775807n]),9223372036854775807n);
  await bundle.setField('field',f.host.java.cast('java.lang.String',null),{thread:'main'});await bundle.release();
  assert(f.calls.every(x=>x.capability==='java.interop'));
  const call=f.calls.find(x=>x.request.method==='call').request;assert.deepEqual(call.args[0].args[1],{__autojs6JavaType:'long',value:'9223372036854775807'});
});
test('Bun Java grant is independent and absent by default',async()=>{
  const f=await fixture(['android.objects']);await assert.rejects(f.host.java.getContext(),{code:'NOT_GRANTED'});assert.equal(f.calls.length,0);
});
