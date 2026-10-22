import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

function backend(capabilities, error = null) {
  const jobs = new Map(), events = [], calls = []; let sequence = 0;
  const send = (id, type, value) => events.push({id, data: Buffer.from(JSON.stringify({type, value})).toString('base64'), last: true});
  return {calls, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities,
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    assert.equal(capability, 'agent.control'); const request = JSON.parse(init.body); calls.push(request);
    let value;
    if (request.action === 'poll') { value = error ? {done: true, error} : {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start'); let result;
      if (request.method === 'open') result = {id: 'owner'};
      else if (['hasAccess', 'close', 'cancel', 'ack', 'release', 'result'].includes(request.method)) result = true;
      else if (request.method === 'context') result = null;
      else if (request.method === 'poll') {
        const wanted = new Set(request.args[1]); result = [];
        for (let i = 0; i < events.length;) { if (wanted.has(events[i].id)) result.push(...events.splice(i, 1)); else i++; }
      } else if (request.method === 'start') {
        const id = 'agent-' + ++sequence, method = request.args[1];
        if (method === 'run') {
          const handle = 'handle-' + sequence;
          send(id, 'resolve', {handle, id: 'run', goal: request.args[2][0], state: 'queued', startedAt: 1, detached: false, interaction: 'script'});
          send(handle, 'event', {type: 'progress', message: '\u96ea\ud83e\uddea', step: 1});
          send(handle, 'event', {type: 'done', id: 'run', status: 'completed', summary: '\u96ea\ud83e\uddea'});
        } else if (method === 'status') send(id, 'resolve', {state: 'attached', queuedCount: 0});
        else send(id, 'resolve', []);
        result = {id};
      } else throw Error(request.method);
      const id = 'transport-' + ++sequence; jobs.set(id, result); value = {id};
    }
    return Response.json({ok: true, capability, result: {value}});
  }};
}

test('Bun Agent uses its independent grant and streams run events through the short-call transport', async () => {
  const fake = backend(['agent.control']), host = await createHostClient({socket: '/agent.sock', fetch: fake.fetch});
  assert(HOST_API_METHODS['agent.control'].includes('requestAccess'));
  const run = await host.ai.agent.run('finish'); let progress = '';
  run.on('progress', event => { progress += event.message; });
  assert.equal((await run.join()).summary, '\u96ea\ud83e\uddea'); assert.equal(progress, '\u96ea\ud83e\uddea');
  assert.equal((await host.ai.agent.status()).state, 'attached'); assert(await host.ai.agent.hasAccess());
  assert.equal(await host.ai.agent.context(), null); assert(await host.ai.agent.result({ok: true}));
  await host.ai.close();
});

test('Bun core AI authorization never implies the Agent task grant', async () => {
  const fake = backend(['ai.control']), host = await createHostClient({socket: '/agent.sock', fetch: fake.fetch});
  await assert.rejects(host.ai.agent.run('never'), {code: 'NOT_GRANTED'});
  await assert.rejects(host.ai.agent.requestAccess(), {code: 'NOT_GRANTED'});
  assert.equal(fake.calls.length, 0); await host.ai.close();
});

test('Bun Agent preserves delegated application permission failures through the automation transport', async () => {
  const fake = backend(['agent.control'], {code: 'ERR_AUTOJS6_AGENT_PERMISSION_DENIED', message: 'Request application access'});
  const host = await createHostClient({socket: '/agent.sock', fetch: fake.fetch});
  await assert.rejects(host.ai.agent.run('never'), {code: 'PERMISSION_DENIED', message: 'Request application access'});
  await host.ai.close();
});
