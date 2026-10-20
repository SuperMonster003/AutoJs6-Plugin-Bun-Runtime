import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

function backend(granted = true) {
  const jobs = new Map(), events = [], calls = []; let sequence = 0, closed = false;
  return {calls, get closed() { return closed; }, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities: granted ? ['speech.control'] : [],
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    assert.equal(capability, 'speech.control'); const request = JSON.parse(init.body); calls.push(request);
    let value;
    if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start');
      let result;
      if (request.method === 'open') result = {id: 'client'};
      else if (request.method === 'close') { closed = true; result = true; }
      else if (request.method === 'poll') result = events.splice(0);
      else if (request.method === 'start') {
        const id = 'speech-' + ++sequence, name = request.args[1];
        const payload = name === 'models.install' ? {type: 'reject', value: {code: 'MODEL_LICENSE_NOT_ACCEPTED', message: 'license required'}} :
          {type: 'resolve', value: [{id: 'asr.test', installed: true}]};
        events.push({id, data: Buffer.from(JSON.stringify(payload)).toString('base64'), last: true}); result = {id, kind: 'operation'};
      } else throw Error(request.method);
      const id = 'transport-' + ++sequence; jobs.set(id, result); value = {id};
    }
    return Response.json({ok: true, capability, result: {value}});
  }};
}
test('Bun speech negotiates its independent grant and uses the asynchronous model routes', async () => {
  const fake = backend(), host = await createHostClient({socket: '/speech.sock', fetch: fake.fetch});
  assert(HOST_API_METHODS['speech.control'].includes('uploadChunk'));
  assert.deepEqual(await host.speech.models.list({installed: true}), [{id: 'asr.test', installed: true}]);
  await assert.rejects(host.speech.models.install('licensed', {acceptLicense: false}), error =>
    error instanceof host.speech.SpeechError && error.code === 'MODEL_LICENSE_NOT_ACCEPTED');
  await host.speech.close(); assert(fake.closed);
  assert(fake.calls.every(x => x.action === 'poll' || x.timeoutMs <= 10000));
});
test('Bun speech is unavailable without its grant even when no microphone is requested', async () => {
  const fake = backend(false), host = await createHostClient({socket: '/speech.sock', fetch: fake.fetch});
  await assert.rejects(host.speech.models.list(), {code: 'NOT_GRANTED'}); assert.equal(fake.calls.length, 0);
});
