import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';

test('Bun TTS negotiates its grant and completes an observable file through real SDK routing', async () => {
  const jobs = new Map(), calls = [], events = []; let next = 0;
  const host = await createHostClient({socket: 'fixture', fetch: async (url, init) => {
    if (url.endsWith('/info')) return Response.json({ok: true, bridgeVersion: 1, capabilities: ['tts.control'], limits: {}});
    const request = JSON.parse(init.body); calls.push(request); let value;
    if (request.action === 'start') {
      const id = String(++next); let result;
      if (request.method === 'open') result = {id: 'client'};
      else if (request.method === 'invoke') {
        const [owner, method, args] = request.args; assert.equal(owner, 'client');
        if (method === 'synthesis') {
          assert.equal(args[0], 'hello'); assert.equal(args[1], 'out.wav');
          result = {id: 'task', operation: 'file', text: 'hello', state: 'queued'};
          events.push({id: 'task', event: 'done', state: 'done', value: {path: 'out.wav', status: 'done'}, terminal: true});
        } else result = {state: 'ready', engine: 'test'};
      } else if (request.method === 'drain') result = events.splice(0);
      else if (request.method === 'close') result = true;
      else throw Error(request.method);
      jobs.set(id, result); value = {id};
    } else if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else throw Error(request.action);
    return Response.json({ok: true, capability: 'tts.control', result: {value}});
  }});
  assert.equal((await host.tts.ready()).engine, 'test');
  const task = await host.tts.synthesis('hello', 'out.wav', {volume: 0});
  assert.equal((await task.result).path, 'out.wav'); await host.tts.close();
  assert.equal(jobs.size, 0); assert(calls.some(request => request.method === 'close'));
});

test('Bun TTS stays unavailable without its independent capability', async () => {
  const host = await createHostClient({socket: 'fixture', fetch: async () => Response.json({ok: true, bridgeVersion: 1, capabilities: ['device.info'], limits: {}})});
  await assert.rejects(host.tts.ready(), {code: 'NOT_GRANTED'});
  await assert.rejects(host.tts.speak('hello', {volume: 0}), {code: 'NOT_GRANTED'});
  await host.tts.close();
});
