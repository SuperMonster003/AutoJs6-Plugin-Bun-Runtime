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
test('Bun Flow queries pass through its normal granted automation transport', async () => {
  const {host, calls, jobs} = await client(['accessibility.control'], payload => {
    assert.equal(payload.method, 'flowProbe'); assert.deepEqual(payload.args, [{text:'ready'}]);
    return {available:true,value:{text:'ready',visibleToUser:true,bounds:{left:0,top:0,right:80,bottom:30}}};
  });
  assert.equal((await host.flow.waitForVisible({text:'ready'}, {stableFor:0})).text, 'ready');
  assert.equal(calls.length, 2); assert.equal(jobs.size, 0);
  assert(HOST_API_METHODS['accessibility.control'].includes('flowForeground'));
});
test('Bun service outages cannot become successful hidden waits', async () => {
  const {host} = await client(['accessibility.control'], () => ({available:false}));
  await assert.rejects(host.flow.waitForHidden('not visible').toPromise(), error => error.code === 'A11Y_UNAVAILABLE');
  const timed = host.flow.wait(() => new Promise(() => {}), {timeout:15});
  await assert.rejects(timed.toPromise(), error => error.code === 'TIMEOUT');
  assert.equal(host.flow.pending, 0);
});
