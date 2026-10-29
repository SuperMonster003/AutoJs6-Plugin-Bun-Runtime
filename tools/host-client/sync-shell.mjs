import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('  function __autojs6_create_shell('),end=source.indexOf('  // Main-thread shell facade;',start);assert(start>=0&&end>start);
// A grant the client finds missing (createHostClient's declaredCall) is NOT_GRANTED with missingCapabilities; the Rhino
// command functions reject on it as on Node's undeclared capability (api-coverage Q90), host denials stay failed results.
const capability='const capabilityError=error=>error&&error.code==="ERR_AUTOJS6_BRIDGE_CAPABILITY_NOT_DECLARED";';
const factory=source.slice(start,end);assert.equal(factory.split(capability).length,2,'Node shell capability-error predicate');
const body='// BEGIN GENERATED SHELL\n// Shared with Node main threads and Workers by tools/host-client/sync-shell.mjs.\n'+factory.replace(capability,
  'const capabilityError=error=>error&&(error.code==="ERR_AUTOJS6_BRIDGE_CAPABILITY_NOT_DECLARED"||error.code==="NOT_GRANTED"&&Array.isArray(error.missingCapabilities));')+'// END GENERATED SHELL';
function update(file,begin,end,body,anchor) {
 const filename=resolve(root,file),text=readFileSync(filename,'utf8').replaceAll('\r\n','\n');
 const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>body):text.replace(anchor,body+'\n\n'+anchor);
 assert(result.includes(begin));
 if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from Node shell facade');
 else writeFileSync(filename,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED SHELL','// END GENERATED SHELL',body,'export async function createHostClient');
let declarations='// BEGIN GENERATED SHELL TYPES\n';
for(const [name,namespace] of [['shell','RuntimeShell']]) {
 const input=readFileSync(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${name}.d.ts`),'utf8').replaceAll('\r\n','\n');
 const first=input.indexOf(`  namespace ${name} {`),last=input.indexOf('\n  }\n\n  const ',first);assert(first>=0&&last>first);
 declarations+=input.slice(first,last+4).replace(`  namespace ${name}`,`export namespace ${namespace}`).replaceAll('AutoJs6Node.JsonValue','JsonValue').replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions').replaceAll('shell.','RuntimeShell.').replaceAll('import("app").','RuntimeApp.')+'\n';
}
declarations+='// END GENERATED SHELL TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED SHELL TYPES','// END GENERATED SHELL TYPES',declarations,'export interface HostClient {');
console.log('Node/Bun shell factory and declarations match');
