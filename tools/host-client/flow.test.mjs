import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

async function client(grants, handler) {
  let next = 0; const jobs = new Map(), calls = [];
  const host = await createHostClient({socket: '/flow-fixture.sock', fetch: async (url, init) => {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities: grants,
      limits: {maxRequestBytes:65536,maxResultBytes:262144,maxCallsPerExecution:1024,maxConcurrentCalls:4,callTimeoutMillis:10000}});
    const payload = JSON.parse(init.body); calls.push(payload);
    assert.equal(capability, 'accessibility.control');
    if (payload.action === 'start') {
      const id = String(++next); jobs.set(id, await handler(payload));
      return Response.json({ok:true,capability,result:{value:{id}}});
    }
    assert.equal(payload.action, 'poll'); const value = jobs.get(payload.id); jobs.delete(payload.id);
    return Response.json({ok:true,capability,result:{value:{done:true,value}}});
  }});
  return {host, calls, jobs};
}
test('Bun Flow core is usable without any host grants, with explicit denial for selectors', async () => {
  const {host, calls} = await client([], () => { throw Error('No request expected'); });
  assert.equal(await host.flow.of(3).map(async n => n + 1), 4);
  assert.equal(await host.flow.wait(() => 0), 0);
  await assert.rejects(host.flow.wait('denied').toPromise(), error => error.code === 'NOT_GRANTED');
  assert.equal(calls.length, 0);
});
test('Bun Flow answers await and sync with Promises and sync(timeout) leaves the chain running (Q202)', async () => {
  const {host} = await client([], async () => ({}));
  const flow = host.flow, chain = flow.sleep(30).map(() => 'late');
  assert.equal(chain.await(), chain.toPromise()); assert.equal(chain.sync(), chain.toPromise());
  const error = await chain.sync(1).then(() => assert.fail('A timeout is expected'), failure => failure);
  assert.equal(error.code, 'TIMEOUT'); assert.equal(error.step, 'sync'); assert.equal(error.reason, 'sync');
  assert.equal(chain.state, 'pending'); assert.equal(await chain.sync(1000), 'late'); assert.equal(await chain.await(), 'late');
  assert.throws(() => chain.sync(-1), TypeError);
});
test('Bun Flow queries pass through its normal granted automation transport', async () => {
  const {host, calls, jobs} = await client(['accessibility.control'], payload => {
    assert.equal(payload.method, 'flowProbe'); assert.deepEqual(payload.args, [{text:'ready'}]);
    return {available:true,value:{text:'ready',visibleToUser:true,bounds:{left:0,top:0,right:80,bottom:30}}};
  });
  assert.equal((await host.flow.waitForVisible({text:'ready'}, {stableFor:0})).text, 'ready');
  assert.equal(calls.length, 2); assert.equal(jobs.size, 0);
  assert(HOST_API_METHODS['accessibility.control'].includes('flowForeground'));
});

test('Bun scoped queries need only accessibility and retain captured branch scope', async()=>{
  const root={windowId:1,indexInParent:0,packageName:'fixture',bounds:{left:0,top:0,right:100,bottom:100}};
  const seen=[],{host}=await client(['accessibility.control'],payload=>{
    seen.push(payload.args);return {available:true,value:payload.args[1]?.resultType==='text'?'scoped':root};
  });
  const base=host.flow.of(7),scoped=base.within('container').scope({resultType:'text'});
  assert.equal(await scoped.wait('child'),'scoped');assert.deepEqual(seen.at(-1)[1].root,root);
  assert.equal(seen.at(-1)[1].resultType,'text');await base.wait('outside');assert.equal(seen.at(-1).length,1);
});
test('Bun service outages cannot become successful hidden waits', async () => {
  const {host} = await client(['accessibility.control'], () => ({available:false}));
  await assert.rejects(host.flow.waitForHidden('not visible').toPromise(), error => error.code === 'A11Y_UNAVAILABLE');
  const timed = host.flow.wait(() => new Promise(() => {}), {timeout:15});
  await assert.rejects(timed.toPromise(), error => error.code === 'TIMEOUT');
  assert.equal(host.flow.pending, 0);
});
test('Bun preserves Flow ownership across asynchronous callback continuations', async () => {
  const {host} = await client([], () => { throw Error('No host query expected'); });
  const flow = host.flow; let late;
  try {
    const task = flow.run(async () => { await new Promise(resolve => setTimeout(resolve, 20)); late = flow.sleep(10000); return late; });
    await new Promise(resolve => setTimeout(resolve, 2)); task.cancel();
    await assert.rejects(task.toPromise(), error => error.code === 'CANCELLED');
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(late.state, 'cancelled'); assert.equal(flow.pending, 0);
  } finally { flow.cancelAll(); }
});
