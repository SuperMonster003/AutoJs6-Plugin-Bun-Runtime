import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('  function __autojs6_storage_options('),end=source.indexOf('  function __autojs6_database_options(',start);
assert(start>=0&&end>start);
const generated=`// BEGIN GENERATED STORAGE
// Reproduced from Node's public storage/storages facade by tools/host-client/sync-storage.mjs.
function createStorage(dispatch) {
  let __autojs6_limited_storage_cache, __autojs6_limited_storages_cache;
  const __autojs6_call_autojs = (_,method,args,options) => dispatch('storage',method,args,options);
  const __autojs6_bridge_signal_from_options = options => options && options.signal;
  const __autojs6_bridge_timeout_ms = value => value;
  const __autojs6_bridge_error = (message,code,module,method) => Object.assign(new HostCallError('INVALID_REQUEST',message,'storage.control'),{method});
  const __autojs6_rhino_compat_unsupported = (api,message) => Object.assign(new HostCallError('NOT_SUPPORTED',message,'storage.control'),{api});
${source.slice(start,end).replaceAll('Node storage bridge','Bun storage bridge')}
  return {storage:__autojs6_limited_storage('storage'),storages:__autojs6_limited_storage('storages')};
}
// END GENERATED STORAGE`;
function update(file,begin,end,body,anchor) {
 const filename=resolve(root,file),text=readFileSync(filename,'utf8').replaceAll('\r\n','\n');
 const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>body):text.replace(anchor,body+'\n\n'+anchor);
 assert.notEqual(result.indexOf(begin),-1);
 if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from Node storage facade');
 else writeFileSync(filename,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED STORAGE','// END GENERATED STORAGE',generated,'export async function createHostClient');
const input=readFileSync(resolve(nodeRoot,'docs/nodejs/types/autojs6-node/storage.d.ts'),'utf8').replaceAll('\r\n','\n');
const first=input.indexOf('  namespace storage {'),last=input.indexOf('\n  }\n\n  const ',first);assert(first>=0&&last>first);
const types='// BEGIN GENERATED STORAGE TYPES\nexport type StorageJsonValue = null | boolean | number | string | StorageJsonValue[] | { [key: string]: StorageJsonValue };\n'+input.slice(first,last+4).replace('  namespace storage','export namespace RuntimeStorage').replaceAll('AutoJs6Node.JsonValue','StorageJsonValue').replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions')+'\n// END GENERATED STORAGE TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED STORAGE TYPES','// END GENERATED STORAGE TYPES',types,'export interface HostClient {');
console.log('Node/Bun storage adapters and declarations match');

const filesInput=readFileSync(resolve(nodeRoot,'docs/nodejs/types/autojs6-node/files.d.ts'),'utf8').replaceAll('\r\n','\n');
const fileStart=filesInput.indexOf('  namespace files {'),fileEnd=filesInput.indexOf('\n  }\n\n  const ',fileStart);assert(fileStart>=0&&fileEnd>fileStart);
let fileTypes=filesInput.slice(fileStart,fileEnd+4).replace('  namespace files','export namespace RuntimeFiles');
fileTypes=fileTypes.replace(/^(\s*)(path|read|write|append|exists|listDir|remove|copy|move|ensureDir|isFile|isDir)(\([^\n]+\)): ([^;]+);/gm,(_,space,name,args,type)=>space+name+args+': Promise<'+type+'>;');
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED FILE TYPES','// END GENERATED FILE TYPES','// BEGIN GENERATED FILE TYPES\n'+fileTypes+'\n// END GENERATED FILE TYPES','export interface HostClient {');
