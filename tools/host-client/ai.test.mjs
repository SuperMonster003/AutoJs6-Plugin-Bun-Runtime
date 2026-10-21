import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

function backend(granted = true) {
  const jobs = new Map(), events = [], calls = []; let sequence = 0;
  const send = (id, type, value) => events.push({id, data: Buffer.from(JSON.stringify({type, value})).toString('base64'), last: true});
  return {calls, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities: granted ? ['ai.control'] : [],
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    assert.equal(capability, 'ai.control'); const request = JSON.parse(init.body); calls.push(request);
    let value;
    if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start'); let result;
      if (request.method === 'open') result = {id: 'owner'};
      else if (request.method === 'close' || request.method === 'cancel' || request.method === 'ack') result = true;
      else if (request.method === 'poll') result = events.splice(0);
      else if (request.method === 'start') {
        const id = 'ai-' + ++sequence, name = request.args[1];
        if (name === 'session') send(id, 'resolve', {id, provider: 'fixture', model: 'local', target: 'local:fixture'});
        else if (name.endsWith('stream')) {
          send(id, 'open', {provider: 'fixture'}); send(id, 'chunk', {text: '\u96ea\ud83e\uddea', reasoning: ''});
          send(id, 'resolve', {text: '\u96ea\ud83e\uddea', usage: {outputTokens: 2}});
        } else if (name === 'catalog') send(id, 'resolve', {targets: [{id: 'local:fixture'}], defaultTarget: 'local:fixture'});
        else if (name.endsWith('ask')) send(id, 'resolve', 'answer');
        else send(id, 'resolve', true);
        result = {id};
      } else throw Error(request.method);
      const id = 'transport-' + ++sequence; jobs.set(id, result); value = {id};
    }
    return Response.json({ok: true, capability, result: {value}});
  }};
}

test('Bun AI negotiates an independent grant and supports sessions and stream events', async () => {
  const fake = backend(), host = await createHostClient({socket: '/ai.sock', fetch: fake.fetch});
  assert.deepEqual(HOST_API_METHODS['ai.control'], ['open', 'start', 'poll', 'ack', 'cancel', 'close']);
  assert.equal(await host.ai('question'), 'answer'); assert(await host.ai.hasAccess());
  assert.equal((await host.ai.catalog()).targets[0].id, 'local:fixture');
  const session = await host.ai.session(), stream = session.stream('question'); let delta = '';
  stream.on('delta', text => { delta += text; });
  assert.equal((await stream.result).text, delta); assert.equal(delta, '\u96ea\ud83e\uddea');
  await session.close(); assert(session.isClosed); await host.ai.close();
});

test('Bun AI rejects missing grants before submitting provider operations', async () => {
  const fake = backend(false), host = await createHostClient({socket: '/ai.sock', fetch: fake.fetch});
  await assert.rejects(host.ai.ask('question'), {code: 'NOT_GRANTED'});
  await assert.rejects(host.ai.requestAccess(), {code: 'NOT_GRANTED'});
  assert.equal(fake.calls.length, 0); await host.ai.close();
});
