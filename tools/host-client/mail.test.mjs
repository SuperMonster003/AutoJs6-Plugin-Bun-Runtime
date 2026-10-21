import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostClient, HOST_API_METHODS} from '../../app/src/main/assets/autojs6/host-client.mjs';

function backend(granted = true) {
  const jobs = new Map(), events = [], calls = [];
  let sequence = 0, closed = false;
  return {calls, get closed() { return closed; }, async fetch(url, init) {
    const capability = url.split('/').at(-1);
    if (capability === 'info') return Response.json({ok: true, bridgeVersion: 1,
      capabilities: granted ? ['mail.control'] : [],
      limits: {maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000}});
    assert.equal(capability, 'mail.control');
    const request = JSON.parse(init.body); calls.push(request);
    let value;
    if (request.action === 'poll') { value = {done: true, value: jobs.get(request.id)}; jobs.delete(request.id); }
    else {
      assert.equal(request.action, 'start');
      let result;
      if (request.method === 'open') result = {id: 'owner'};
      else if (request.method === 'close') { closed = true; result = true; }
      else if (request.method === 'poll') result = events.splice(0);
      else if (request.method === 'start') {
        const id = 'mail-' + ++sequence, name = request.args[1];
        const packet = name === 'connect' ? {type: 'resolve', value: {id, account: {address:'fixture@example.invalid'}, isConnected:true}} :
          name === 'client.fetch' ? {type:'resolve',value:[{uid:1,folder:'INBOX',subject:'fixture'}]} :
          name === 'client.search' ? {type:'reject',value:{code:'INVALID_ARGUMENT',message:'query required',retryable:false}} :
          {type:'resolve',value:true};
        events.push({id,data:Buffer.from(JSON.stringify(packet)).toString('base64'),last:true}); result={id};
      } else throw Error(request.method);
      const id='transport-'+ ++sequence; jobs.set(id,result); value={id};
    }
    return Response.json({ok:true,capability,result:{value}});
  }};
}

test('Bun mail negotiates its grant and keeps the default account inside its own facade', async () => {
  const fake=backend(), host=await createHostClient({socket:'/mail.sock',fetch:fake.fetch});
  assert.deepEqual(HOST_API_METHODS['mail.control'],['open','start','poll','cancel','answer','close']);
  const client=await host.mail.setDefault({address:'fixture@example.invalid',password:'synthetic'});
  assert.equal(client.account.password,undefined);
  const messages=await host.mail.fetch();
  assert.equal(messages[0].subject,'fixture'); assert.equal(typeof messages[0].load,'function');
  await assert.rejects(host.mail.search(null),error=>error instanceof host.mail.MailError && error.code==='INVALID_ARGUMENT');
  await host.mail.close(); assert.equal(host.mail.default,null);
  await host.mail.dispose(); assert(fake.closed);
});

test('Bun mail rejects ungranted access before submitting any operation', async () => {
  const fake=backend(false),host=await createHostClient({socket:'/mail.sock',fetch:fake.fetch});
  await assert.rejects(host.mail.connect({address:'fixture@example.invalid',password:'synthetic'}),{code:'NOT_GRANTED'});
  await assert.rejects(host.mail.providers.list(),{code:'NOT_GRANTED'});
  assert.equal(fake.calls.length,0); await host.mail.dispose();
});
