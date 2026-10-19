import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('  function __autojs6_create_database('),end=source.indexOf('  // Main-thread database facade;',start);assert(start>=0&&end>start);
const body='// BEGIN GENERATED DATABASE\n// Shared with Node main threads and Workers by tools/host-client/sync-database.mjs.\n'+source.slice(start,end)+'// END GENERATED DATABASE';
function update(file,begin,end,body,anchor) {
 const filename=resolve(root,file),text=readFileSync(filename,'utf8').replaceAll('\r\n','\n');
 const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>body):text.replace(anchor,body+'\n\n'+anchor);
 assert(result.includes(begin));
 if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from Node database facade');
 else writeFileSync(filename,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED DATABASE','// END GENERATED DATABASE',body,'export async function createHostClient');
let declarations='// BEGIN GENERATED DATABASE TYPES\n';
for(const [name,namespace] of [['database','RuntimeDatabase'],['sqlite','RuntimeSqlite']]) {
 const input=readFileSync(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${name}.d.ts`),'utf8').replaceAll('\r\n','\n');
 const first=input.indexOf(`  namespace ${name} {`),last=input.indexOf('\n  }\n\n  const ',first);assert(first>=0&&last>first);
 declarations+=input.slice(first,last+4).replace(`  namespace ${name}`,`export namespace ${namespace}`).replaceAll('AutoJs6Node.JsonValue','JsonValue').replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions').replaceAll('database.','RuntimeDatabase.')+'\n';
}
declarations+='// END GENERATED DATABASE TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED DATABASE TYPES','// END GENERATED DATABASE TYPES',declarations,'export interface HostClient {');
console.log('Node/Bun database/sqlite factory and declarations match');
