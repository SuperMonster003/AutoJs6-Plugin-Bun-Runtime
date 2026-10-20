import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

function backend(granted = true) {
  const jobs = new Map(), events = [], calls = []; let sequence = 0, closed = false;
  return {calls, get closed() { return closed; }, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities: granted ? ['epub.control'] : [],
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    assert.equal(capability, 'epub.control'); const request = JSON.parse(init.body); calls.push(request);
    let value;
    if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start');
      let result;
      if (request.method === 'open') result = {id: 'client'};
      else if (request.method === 'close') { closed = true; result = true; }
      else if (request.method === 'poll') result = events.splice(0);
      else if (request.method === 'start') {
        const id = 'epub-' + ++sequence, name = request.args[1];
        const payload = name === 'openBook' ? {type: 'resolve', value: {id, path: '/book.epub', metadata: {title: 'A book'}, toc: [], readingOrder: [], positions: 1}} :
          name === 'book.search' ? {type: 'reject', value: {code: 'INVALID_ARGUMENT', message: 'empty query'}} :
          {type: 'resolve', value: true};
        events.push({id, data: Buffer.from(JSON.stringify(payload)).toString('base64'), last: true}); result = {id};
      } else throw Error(request.method);
      const id = 'transport-' + ++sequence; jobs.set(id, result); value = {id};
    }
    return Response.json({ok: true, capability, result: {value}});
  }};
}
test('Bun EPUB negotiates its independent grant and exposes Promise book operations', async () => {
  const fake = backend(), host = await createHostClient({socket: '/epub.sock', fetch: fake.fetch});
  assert.deepEqual(HOST_API_METHODS['epub.control'], ['open', 'start', 'poll', 'cancel', 'close']);
  assert.equal((await host.epub.metadata('book.epub')).title, 'A book');
  await assert.rejects(host.epub.search('book.epub', ''), error => error instanceof host.epub.EpubError && error.code === 'INVALID_ARGUMENT');
  await host.epub.close(); assert(fake.closed);
  assert(fake.calls.every(x => x.action === 'poll' || x.timeoutMs <= 10000));
});
test('Bun EPUB access is rejected without its own grant', async () => {
  const fake = backend(false), host = await createHostClient({socket: '/epub.sock', fetch: fake.fetch});
  await assert.rejects(host.epub.open('book.epub'), {code: 'NOT_GRANTED'});
  assert.equal(fake.calls.length, 0); await host.epub.close();
});
