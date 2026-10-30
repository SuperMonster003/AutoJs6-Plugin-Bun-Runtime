import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

const CLIENT = ['open', 'start', 'poll', 'cancel', 'close'];
function backend(grants) {
  const jobs = new Map(), events = [], calls = []; let sequence = 0;
  return {calls, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1, capabilities: grants,
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    const request = JSON.parse(init.body); calls.push({capability, ...request});
    let value;
    if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start');
      let result = {};
      if (capability === 'theme.control') result = request.method === 'get' ? -16711936 : request.method === 'state' ? {error: 'No such state'} : null;
      else if (request.method === 'open') result = {id: 'client'};
      else if (request.method === 'poll') result = events.splice(0);
      else if (request.method === 'start') {
        const id = 'operation-' + ++sequence, name = request.args[1];
        const payload = name === 'isAvailable' ? {type: 'resolve', value: true} : name === 'plan' ? {type: 'resolve', value: {id: 'plan', items: [{excluded: true}]}} :
          name === 'apply' ? {type: 'resolve', value: {batchId: 'batch'}} : {type: 'reject', value: {code: 'INVALID_ARGUMENT', message: 'refused'}};
        if (name === 'apply') events.push({id, data: Buffer.from(JSON.stringify({type: 'progress', value: [1, 1, {name: 'a'}]})).toString('base64'), last: true});
        events.push({id, data: Buffer.from(JSON.stringify(payload)).toString('base64'), last: true}); result = {id};
      } else assert.fail(request.method);
      const id = 'transport-' + ++sequence; jobs.set(id, result); value = {id};
    }
    return Response.json({ok: true, capability, result: {value}});
  }};
}
const client = grants => { const fake = backend(grants); return createHostClient({socket: '/family.sock', fetch: fake.fetch}).then(host => ({host, fake})); };

test('the plugin family negotiates its independent grants', () => {
  assert.deepEqual(HOST_API_METHODS['gallery.control'], CLIENT);
  assert.deepEqual(HOST_API_METHODS['batchrename.control'], CLIENT);
  assert.deepEqual(HOST_API_METHODS['theme.control'], ['get', 'set', 'reset', 'libraries', 'activate', 'deactivate', 'next', 'state', 'current']);
});

test('colors.theme runs under theme.control with the shared argument rules', async () => {
  const {host, fake} = await client(['theme.control']);
  assert.equal(await host.colors.theme.get(), -16711936);
  await host.colors.theme.set('#2196F3');
  assert.deepEqual(fake.calls.find(x => x.method === 'set').args, [0xff2196f3 | 0, null, null]);
  await assert.rejects(host.colors.theme.state('none'), error => error instanceof RangeError && error.message.includes('No such state'));
  await assert.rejects(host.colors.theme.activate(1.5), RangeError);
  assert(fake.calls.every(x => x.capability === 'theme.control'));
});

test('gallery and files.batchRename run over their clients', async () => {
  const {host, fake} = await client(['gallery.control', 'batchrename.control']);
  assert.equal(await host.gallery.isAvailableAsync(), true);
  await assert.rejects(host.gallery.pick({}), error => error instanceof host.gallery.GalleryError && error.code === 'INVALID_ARGUMENT' && error.message === 'refused');
  const progress = [];
  assert.deepEqual(await host.files.batchRename('a', {search: 'a', onProgress: (done, total) => progress.push([done, total])}), {batchId: 'batch'});
  assert.deepEqual(progress, [[1, 1]]);
  assert.equal(host.files.batchRename.BatchRenameError.name, 'BatchRenameError');
  assert(fake.calls.filter(x => x.method === 'start' && x.action === 'start').every(x => x.timeoutMs <= 10000));
  assert.deepEqual([...new Set(fake.calls.map(x => x.capability))].sort(), ['batchrename.control', 'gallery.control']);
});

test('each member is refused without its own grant', async () => {
  const {host} = await client(['device.info']);
  const refused = capability => error => error.code === 'NOT_GRANTED' && error.capability === capability;
  await assert.rejects(host.gallery.isAvailable(), refused('gallery.control'));
  await assert.rejects(host.files.batchRename.isAvailable(), refused('batchrename.control'));
  await assert.rejects(host.colors.theme.get(), refused('theme.control'));
});
