import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('  // Shared native Android helpers, colors and calendar task facades.'),end=source.indexOf('  // Main-thread native Android and calendar modules.',start);assert(start>=0&&end>start);
function update(file,begin,end,body,anchor){
  const path=resolve(root,file),text=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>body):text.replace(anchor,body+'\n\n'+anchor);
  assert(result.includes(begin));
  if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from Node Android/tasks source');else writeFileSync(path,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED ANDROID TASK FACADES','// END GENERATED ANDROID TASK FACADES',
  '// BEGIN GENERATED ANDROID TASK FACADES\n'+source.slice(start,end)+'// END GENERATED ANDROID TASK FACADES','export async function createHostClient');
let types='// BEGIN GENERATED ANDROID TASK TYPES\n';
for(const [name,exported] of [['android','RuntimeAndroid'],['tasks','RuntimeTasks'],['colors','RuntimeColors']]){
  const text=readFileSync(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${name}.d.ts`),'utf8').replaceAll('\r\n','\n');
  const first=text.indexOf(`  namespace ${name} {`),last=text.indexOf('\n  }',first);assert(first>=0&&last>first);
  types+=text.slice(first,last+4).replace(`  namespace ${name}`,`export namespace ${exported}`).replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions')
    .replaceAll('AutoJs6Node.JsonValue','JsonValue').replaceAll('import("colors").','RuntimeColors.').replaceAll('import("autojs6:android").','RuntimeAndroid.')+'\n';
}
types+='// END GENERATED ANDROID TASK TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED ANDROID TASK TYPES','// END GENERATED ANDROID TASK TYPES',types,'export interface HostClient {');
console.log('Node/Bun Android/colors/task factories and types match');
