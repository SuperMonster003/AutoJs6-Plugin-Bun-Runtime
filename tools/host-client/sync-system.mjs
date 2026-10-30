import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// The system information and engines family (api-coverage P4.1b): Node's shared __autojs6_create_system factory and its
// main-thread engines, with their declarations. createHostClient supplies the call (Node capability names in
// options.permissions), the host object of the factory and the engine record of this execution.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
function section(first,last){const start=source.indexOf('  function '+first+'('),end=source.indexOf('  function '+last+'(',start);assert(start>=0&&end>start,first);return source.slice(start,end);}
const body=[section('__autojs6_create_system','__autojs6_create_app'),
  section('__autojs6_engine_timeout_from_options','__autojs6_engine_info_fallback_cwd'),
  section('__autojs6_engine_invalid_argument_error','__autojs6_dialogs_timeout_from_options')].join('')
  .replaceAll(' by AutoJs6 Safe Node Profile.',' to one level by AutoJs6.').replace('value.invocationId || "node-" + Date.now()','value.invocationId || "bun-" + Date.now()');
const generated=`// BEGIN GENERATED SYSTEM
// Reproduced from Node's system information family and main-thread engines by tools/host-client/sync-system.mjs
// (api-coverage P4.1b). engineInfo is the record of this execution that engines.myEngine returns.
function createSystemFamily(call, host, engineInfo, bridgeError) {
  let __autojs6_limited_engines_cache = null;
  const __autojs6_call_autojs = call;
  const __autojs6_bridge_signal_from_options = options => options && options.signal;
  const __autojs6_bridge_error = bridgeError;
  const __autojs6_current_engine_info = engineInfo;
${body}
  return { ...__autojs6_create_system(__autojs6_call_autojs, host), engines: __autojs6_limited_engines() };
}
// END GENERATED SYSTEM`;
const ids=new Set(body.match(/__autojs6_[\w]+/g));
const defined=new Set([...body.matchAll(/(?:function|const|let|var)\s+(__autojs6_\w+)/g)].map(m=>m[1]));
for(const name of ['__autojs6_limited_engines_cache','__autojs6_call_autojs','__autojs6_bridge_signal_from_options','__autojs6_bridge_error','__autojs6_current_engine_info'])defined.add(name);
assert.deepEqual([...ids].filter(id=>!defined.has(id)),[],'Unbound Node system dependencies');
function update(file,begin,end,body,anchor){
  const path=resolve(root,file),text=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>body):text.replace(anchor,body+'\n\n'+anchor);
  assert(result.includes(begin));
  if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from the Node system information family');else writeFileSync(path,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED SYSTEM','// END GENERATED SYSTEM',generated,'export async function createHostClient');

const types=text=>text.replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions').replaceAll('AutoJs6Node.JsonObject','{ readonly [key: string]: JsonValue }')
  .replaceAll('AutoJs6Node.JsonValue','JsonValue').replace('(capability plugin_tools; the tools of','(grant plugintools.control; the tools of')
  .replace('when the script also declares plugin_tools.user_granted','when plugintools.usergranted is on too');
const declaration=file=>readFileSync(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${file}.d.ts`),'utf8').replaceAll('\r\n','\n').replace(/^﻿/,'');
let declarations='// BEGIN GENERATED SYSTEM TYPES\n';
for(const [file,name,namespace] of [['autojs','autojs','RuntimeAutojs'],['installer','installer','RuntimeInstaller'],['memory','memory','RuntimeMemory'],
  ['settings','settings','RuntimeSettings'],['sysprops','sysprops','RuntimeSysprops'],['power_manager','powerManager','RuntimePowerManager'],
  ['system','system','RuntimeSystem'],['engines','engines','RuntimeEngines']]){
  const input=declaration(file);
  const first=input.indexOf(`  namespace ${name} {`),last=input.indexOf('\n  }\n\n  const ',first);assert(first>=0&&last>first,file);
  declarations+=types(input.slice(first,last+4).replace(`  namespace ${name}`,`export namespace ${namespace}`))+'\n';
}
// plugins: Node's tool types and Rhino's members of PluginsModule (the Node plugin manager members are Node's own).
const plugins=declaration('plugins');
const block=name=>{const first=plugins.indexOf(`    export interface ${name} `),last=plugins.indexOf('\n    }\n',first);assert(first>=0&&last>first,name);return plugins.slice(first,last+7);};
const membersFirst=plugins.indexOf('      /** Rhino\'s plugins.extend*'),membersLast=plugins.indexOf('      readonly tools: PluginToolsModule;\n',membersFirst);
assert(membersFirst>=0&&membersLast>membersFirst,'Rhino members of PluginsModule');
declarations+=types('export namespace RuntimePlugins {\n'+block('PluginToolCallOptions')+'\n'+block('PluginToolsModule')+'\n'+
  '    /** Rhino\'s plugins: extend* and tools (Bun grants plugintools.control and plugintools.usergranted for tools). */\n'+
  '    export interface PluginsModule {\n'+plugins.slice(membersFirst,membersLast)+'      readonly tools: PluginToolsModule;\n    }\n  }\n');
declarations+='// END GENERATED SYSTEM TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED SYSTEM TYPES','// END GENERATED SYSTEM TYPES',declarations,'export interface HostClient {');
console.log('Node/Bun system information family and declarations match');
