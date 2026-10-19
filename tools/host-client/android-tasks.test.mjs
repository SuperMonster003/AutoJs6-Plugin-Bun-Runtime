import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
async function fixture(capabilities=['android.objects','tasks.control']){
  const calls=[],jobs=new Map();let next=0;
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});let value;
    if(request.action==='start'){const id=String(++next);jobs.set(id,request);value={id};}
    else if(request.action==='cancel'){jobs.delete(request.id);value=true;}
    else{
      const job=jobs.get(request.id);jobs.delete(request.id);let result=true;
      if(job.method==='createPaint')result={id:'paint',__autojs6AndroidObject:'paint',color:job.args[0].color};
      if(job.method==='addTimedTask')result={id:7,kind:'timed',options:job.args[0]};
      if(job.method==='addIntentTask')result={id:8,kind:'intent',options:job.args[0]};
      if(job.method==='queryTimedTasks'||job.method==='queryIntentTasks')result=[];
      if(job.method==='getUriForFile')result={value:'content://fixture/owned'};
      value={done:true,value:result};
    }
    return Response.json({ok:true,capability,result:{value}});
  }});return {host,calls};
}
test('Bun Android/color/task facades use the bounded native routes and preserve pure colors without a grant',async()=>{
  const f=await fixture(),paint=await f.host.colors.createPaint({color:'red'});assert.equal(paint.color,-65536);await paint.close();
  const task=await f.host.tasks.addWeeklyTask({path:'child.bun.js',time:'09:00',daysOfWeek:[1]});assert.equal(task.kind,'timed');assert.equal(task.options.repeatMode,'weekly');await f.host.tasks.removeTask(task);
  const intent=await f.host.tasks.addIntentTask({path:'child.bun.js',action:'owned'});assert.equal(intent.kind,'intent');await f.host.tasks.removeTask(intent);
  assert.equal((await f.host.app.getUriForFile('owned')).value,'content://fixture/owned');assert(f.calls.every(c=>['android.objects','tasks.control'].includes(c.capability)));
});
test('Bun native object and persistent task grants remain independent',async()=>{
  const f=await fixture([]);assert.equal(f.host.colors.toInt('#123456'),-15584170);assert.equal(f.host.tasks.daysToTimeFlag([1,3]),10);
  await assert.rejects(f.host.android.createPaint(),{code:'NOT_GRANTED'});await assert.rejects(f.host.tasks.addCountdownTask({path:'child',delayMs:1000}),{code:'NOT_GRANTED'});assert.equal(f.calls.length,0);
});
