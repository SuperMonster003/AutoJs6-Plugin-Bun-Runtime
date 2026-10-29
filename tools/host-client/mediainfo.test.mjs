import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';

const CAPABILITIES = {schema: 'autojs6-node-mediainfo-capabilities-v1', snapshotSchemas: ['autojs6-plugin-mediainfo-snapshot-v1', 'autojs6-plugin-mediainfo-snapshot-v2'],
  defaultSnapshotSchema: 'autojs6-plugin-mediainfo-snapshot-v2', streamCount: true, streamNumber: true, infoKinds: ['TEXT', 'NAME']};

async function client(capabilities = CAPABILITIES) {
  const jobs = new Map(), calls = []; let next = 0;
  const host = await createHostClient({socket: 'fixture', fetch: async (url, init) => {
    if (url.endsWith('/info')) return Response.json({ok: true, bridgeVersion: 1, capabilities: ['mediainfo.control'], limits: {}});
    const request = JSON.parse(init.body);
    assert(url.endsWith('/v1/mediainfo.control'));
    let value;
    if (request.action === 'start') {
      calls.push(request); const id = String(++next), [path, second] = request.args;
      const result = request.method === 'capabilities' ? capabilities
        : request.method === 'read' ? {schema: second.schema ?? 'autojs6-node-mediainfo-snapshot-v1', path, sections: {General: [{Format: 'MPEG-4'}]}}
        : request.method === 'get' ? 42 : request.method === 'countGet' ? 2 : null;
      jobs.set(id, result); value = {id};
    } else { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    return Response.json({ok: true, capability: 'mediainfo.control', result: {value}});
  }});
  return {host, calls};
}

test('Bun mediainfo follows Node: frozen records, query gates and Rhino snapshot schemas', async () => {
  const {host, calls} = await client();
  const info = host.mediainfo;
  assert.deepEqual(Object.keys(info), ['read', 'snapshot', 'get', 'countGet', 'capabilities', 'SNAPSHOT_SCHEMA_V1', 'SNAPSHOT_SCHEMA_V2']);
  assert.equal(info.SNAPSHOT_SCHEMA_V2, 'autojs6-plugin-mediainfo-snapshot-v2');
  const record = await info('/sdcard/a.mp4', {includeInform: false, signal: new AbortController().signal});
  assert(Object.isFrozen(record) && Object.isFrozen(record.sections.General[0]));
  assert.equal(record.schema, 'autojs6-node-mediainfo-snapshot-v1');
  assert.deepEqual(calls.at(-1).args, ['/sdcard/a.mp4', {includeInform: false}]);
  // Rhino's snapshot: the plugin's default schema unless one is asked for.
  assert.equal((await info.snapshot('/sdcard/a.mp4')).schema, 'autojs6-plugin-mediainfo-snapshot-v2');
  assert.deepEqual(calls.slice(-2).map(call => call.method), ['capabilities', 'read']);
  assert.equal((await info.snapshot('/sdcard/a.mp4', {schema: info.SNAPSHOT_SCHEMA_V1})).schema, 'autojs6-plugin-mediainfo-snapshot-v1');
  assert.equal(calls.at(-1).method, 'read');
  // get returns text; a non-default query checks the advertised capabilities first.
  assert.equal(await info.get('/sdcard/a.mp4', 'Video', 'Width'), '42');
  assert.deepEqual(calls.at(-1).args, ['/sdcard/a.mp4', 'video', 'Width']);
  assert.equal(await info.get('/sdcard/a.mp4', 'audio', 'Format', {streamNumber: 1, infoKind: 'name'}), '42');
  assert.deepEqual(calls.at(-1).args, ['/sdcard/a.mp4', 'audio', 'Format', {streamNumber: 1, infoKind: 'NAME'}]);
  await assert.rejects(info.get('/sdcard/a.mp4', 'audio', 'Format', {infoKind: 'HOWTO'}), /MEDIAINFO_QUERY_UNSUPPORTED/);
  assert.equal(await info.countGet('/sdcard/a.mp4', 'audio'), 2);
  // Argument checks reject before any host call.
  const before = calls.length;
  await assert.rejects(info.read(''), TypeError);
  await assert.rejects(info.get('/a', 'not a kind'), TypeError);
  await assert.rejects(info.get('/a', 'video', 'Width', {streamNumber: -1}), TypeError);
  await assert.rejects(info.snapshot('/a', {schema: 2}), TypeError);
  assert.equal(calls.length, before);
});

test('Bun mediainfo needs stream counting from the plugin and its own grant', async () => {
  const {host} = await client({...CAPABILITIES, streamCount: false});
  await assert.rejects(host.mediainfo.countGet('/a', 'audio'), /MEDIAINFO_QUERY_UNSUPPORTED/);
  const denied = await createHostClient({socket: 'fixture', fetch: async () => Response.json({ok: true, bridgeVersion: 1, capabilities: ['device.info'], limits: {}})});
  await assert.rejects(denied.mediainfo.read('/a'), {code: 'NOT_GRANTED'});
});
