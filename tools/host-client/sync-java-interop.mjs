import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const read=file=>readFileSync(file,'utf8').replaceAll('\r\n','\n');
const source=read(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'));
const start=source.indexOf('  // Shared Java object facade'),end=source.indexOf('  // Main Java facade transport.',start);
assert(start>=0&&end>start);
function update(file,kind,body,anchor) {
  const path=resolve(root,file),text=read(path),begin=`// BEGIN GENERATED JAVA ${kind}`,end=`// END GENERATED JAVA ${kind}`;
  const block=begin+'\n'+body+end;
  const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>block):text.replace(anchor,block+'\n\n'+anchor);
  assert(result.includes(block));
  if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from Node Java facade');else writeFileSync(path,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','FACADE',source.slice(start,end),'export async function createHostClient');
const types=read(resolve(nodeRoot,'docs/nodejs/types/autojs6-node/java.d.ts'));
const a=types.indexOf('  namespace java {'),z=types.indexOf('\n  }',a);
assert(a>=0&&z>a);
update('app/src/main/assets/autojs6/host-client.d.mts','TYPES',types.slice(a,z+4).replace('  namespace java','export namespace RuntimeJava').replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions')+'\n','export interface HostClient {');
console.log('Node/Bun Java factories and types match');
