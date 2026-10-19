import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
test('Bun callback control bypasses ordinary automation jobs and retains reentry context',async()=>{
  const calls=[],jobs=new Map(),events=[],pending=new Map();let registration,next=0;
  async function native(method,data) {
    if(method==='proxy'){registration=data;return {__autojs6JavaHandle:'proxy',className:'owned.Proxy',__autojs6JavaCallbackOwner:data.callback};}
    if(method==='drainCallbacks'){await new Promise(r=>setTimeout(r,5));return events.splice(0);}
    if(method==='call'){
      const id='callback-'+ ++next;const result=new Promise(resolve=>pending.set(id,resolve));
      events.push({id,callback:registration.callback,key:'*',method:'call',signature:'call()',receiver:{__autojs6JavaHandle:'borrowed',className:'owned.Proxy'},args:[]});return result;
    }
    if(method==='callStatic'){assert(data.callbackInvocationId);return 7;}
    if(method==='completeCallback'){pending.get(data.id)(data.value);pending.delete(data.id);return true;}
    if(method==='closeCallbacks'||method==='release')return true;
    throw Error(method);
  }
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:['java.interop'],limits:{}});
    const request=JSON.parse(init.body);calls.push(request);let value;
    if(request.action==='callback')value=await native(request.method,request.args[0]);
    else if(request.action==='start'){
      const id=String(++next),job={done:false};jobs.set(id,job);native(request.method,request.args[0]).then(value=>Object.assign(job,{done:true,value}));value={id};
    }else if(request.action==='poll'){
      await new Promise(r=>setTimeout(r,5));const job=jobs.get(request.id);value=job.done?{done:true,value:job.value}:{done:false};if(job.done)jobs.delete(request.id);
    }else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    return Response.json({ok:true,capability:'java.interop',result:{value}});
  }});
  const proxy=await host.java.proxy('java.util.concurrent.Callable',async function(){return await this.java.callStatic('java.lang.Math','max',[2,7]);});
  assert.equal(await proxy.call('call'),7);await proxy.release();await host.java.closeCallbacks();
  assert(calls.some(x=>x.action==='callback'&&x.method==='completeCallback'));assert(calls.every(x=>x.method!=='drainCallbacks'||x.action==='callback'));
});
test('Bun callback registration is denied without the Java grant',async()=>{
  const host=await createHostClient({socket:'fixture',fetch:async()=>Response.json({ok:true,bridgeVersion:1,capabilities:[],limits:{}})});
  await assert.rejects(host.java.proxy('java.lang.Runnable',()=>{}, {onError:()=>{}}),{code:'NOT_GRANTED'});await host.java.closeCallbacks();
});
