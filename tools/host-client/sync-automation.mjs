import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const source=readFileSync(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'),'utf8').replaceAll('\r\n','\n');
function section(first,last){const start=source.indexOf('  function '+first+'('),end=source.indexOf('  function '+last+'(',start);assert(start>=0&&end>start);return source.slice(start,end);}
// The app facade is Node's shared factory (api-coverage P3.1a); clipboard and accessibility stay top-level sections.
const appStart=source.indexOf('  function __autojs6_create_app('),appEnd=source.indexOf('\n  function __autojs6_limited_app() {\n    return __autojs6_limited_app_cache',appStart);
assert(appStart>=0&&appEnd>appStart,'Node shared app factory');
// A grant the client finds missing (createHostClient's declaredCall) is NOT_GRANTED with missingCapabilities; it rejects
// as Node's undeclared capability does (api-coverage Q90), while host denials keep Rhino's failed command results.
const kept='error.code === "ERR_AUTOJS6_BRIDGE_CAPABILITY_NOT_DECLARED" || error.name === "AbortError"';
const appFactory=source.slice(appStart,appEnd+1);assert.equal(appFactory.split(kept).length,2,'Node app kept-error predicate');
const body=[section('__autojs6_clipboard_options','__autojs6_device_options'),
  appFactory.replace(kept,'error.code === "ERR_AUTOJS6_BRIDGE_CAPABILITY_NOT_DECLARED" || error.code === "NOT_GRANTED" && Array.isArray(error.missingCapabilities) || error.name === "AbortError"'),
  section('__autojs6_accessibility_timeout_from_options','__autojs6_number_property')].join('\n').replaceAll('Node.js engine','Bun engine')
  .replace('__autojs6_limited_android().getUriForFile(path,options)', '__autojs6_call_autojs("android","getUriForFile",[String(path)],options)');
const generated=`// BEGIN GENERATED AUTOMATION
// Reproduced from Node's public adapters by tools/host-client/sync-automation.mjs. The app factory takes the shell and
// android modules as getters (the client builds them later) and a function mapping Node capability names to missing grants.
function createAutomation(dispatch, hostInfo, shell, missing, android) {
  let __autojs6_limited_clipboard_cache, __autojs6_limited_accessibility_cache;
  const __autojs6_call_autojs = dispatch;
  const __autojs6_bridge_signal_from_options = options => options && options.signal;
  const __autojs6_host_app_info = () => hostInfo || {};
  const __autojs6_bridge_error = (message, code, module, method) => Object.assign(new HostCallError(
    code === 'ERR_AUTOJS6_BRIDGE_CAPABILITY_NOT_DECLARED' ? 'NOT_GRANTED' : message.includes('not available') ? 'NOT_SUPPORTED' : 'INVALID_REQUEST',
    message, module + '.control'), { method });
${body}
  const app = { ...__autojs6_create_app(__autojs6_call_autojs, __autojs6_host_app_info, __autojs6_bridge_error, __autojs6_bridge_signal_from_options, android, shell, missing) };
  for (const key of ['packageName','versionName','versionCode']) Object.defineProperty(app,key,{enumerable:true,get(){
    if (!hostInfo) throw new HostCallError('NOT_GRANTED','Host application identity requires app.control','app.control');
    return hostInfo[key];
  }});
  return {app:Object.freeze(app),accessibility:__autojs6_limited_accessibility(),clipboard:__autojs6_limited_clipboard()};
}
// END GENERATED AUTOMATION`;
const path=resolve(root,'app/src/main/assets/autojs6/host-client.mjs');
let text=readFileSync(path,'utf8').replaceAll('\r\n','\n');
if(text.includes('// BEGIN GENERATED AUTOMATION'))text=text.replace(/\/\/ BEGIN GENERATED AUTOMATION[\s\S]*?\/\/ END GENERATED AUTOMATION/,()=>generated);
else text=text.replace('export async function createHostClient',generated+'\n\nexport async function createHostClient');
if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n'),text,'Bun automation adapters differ from Node sources');
else writeFileSync(path,text);
const ids=new Set(body.match(/__autojs6_[\w]+/g));
const defined=new Set([...body.matchAll(/(?:function|const|let|var)\s+(__autojs6_\w+)/g)].map(m=>m[1]));
for(const name of ['__autojs6_call_autojs','__autojs6_bridge_signal_from_options','__autojs6_host_app_info','__autojs6_bridge_error','__autojs6_limited_clipboard_cache','__autojs6_limited_accessibility_cache',
  '__autojs6_limited_android','__autojs6_app_shell','__autojs6_app_missing_capabilities'])defined.add(name);
assert.deepEqual([...ids].filter(id=>!defined.has(id)),[],'Unbound Node adapter dependencies');
console.log('Node/Bun app, accessibility and clipboard adapters match');

let declarations='// BEGIN GENERATED AUTOMATION TYPES\nexport interface AutomationCallOptions { readonly timeoutMs?: number; readonly signal?: AbortSignal }\nexport interface AutomationBounds { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }\n';
for(const [name,namespace] of [['app','RuntimeApp'],['accessibility','RuntimeAccessibility'],['clipboard','RuntimeClipboard']]) {
 const input=readFileSync(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${name}.d.ts`),'utf8').replaceAll('\r\n','\n');
 const start=input.indexOf(`  namespace ${name} {`),end=input.indexOf('\n  }\n\n  const ',start);assert(start>=0&&end>start);
 declarations+=input.slice(start,end+4).replace(`  namespace ${name}`,`export namespace ${namespace}`).replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions').replaceAll('AutoJs6Node.Bounds','AutomationBounds').replaceAll('AutoJs6Node.JsonPrimitive','null | boolean | number | string').replaceAll('import("autojs6:android").','RuntimeAndroid.')+'\n';
}
declarations+='// END GENERATED AUTOMATION TYPES';
const typesPath=resolve(root,'app/src/main/assets/autojs6/host-client.d.mts');
let types=readFileSync(typesPath,'utf8').replaceAll('\r\n','\n');
if(types.includes('// BEGIN GENERATED AUTOMATION TYPES'))types=types.replace(/\/\/ BEGIN GENERATED AUTOMATION TYPES[\s\S]*?\/\/ END GENERATED AUTOMATION TYPES/,()=>declarations);
else types=types.replace('export interface HostClient {',declarations+'\n\nexport interface HostClient {');
if(process.argv.includes('--check'))assert.equal(readFileSync(typesPath,'utf8').replaceAll('\r\n','\n'),types,'Bun automation declarations differ from Node sources');
else writeFileSync(typesPath,types);
