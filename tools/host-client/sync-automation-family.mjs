import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// Rhino's automation family (AutoJs6 api-coverage P4.4): Node's shared __autojs6_create_automation factory (automator, auto,
// keys, threads, continuation, timers, yolo, selector, sleep / wait, the Rhino layer of ocr and the family's globals) and the
// declarations of autojs6:automator / auto / threads / continuation / timers / yolo / selector, ocr and barcode.
// createHostClient supplies the call (Node capability names in options.permissions) and the host object of the factory.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const read=file=>readFileSync(file,'utf8').replaceAll('\r\n','\n').replace(/^\uFEFF/,'');
const source=read(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'));
const start=source.indexOf("  // api-coverage P3.4: Rhino's automation family for Node main threads and Workers"),
  end=source.indexOf("\n  // api-coverage P3.4: the main thread's automation family.",start);
assert(start>=0&&end>start,'Node automation family factory');
const body=source.slice(start,end+1);
assert.deepEqual([...new Set(body.match(/__autojs6_\w+/g))],['__autojs6_create_automation'],'Unbound Node automation family dependencies');
const generated=`// BEGIN GENERATED AUTOMATION FAMILY
// Reproduced from Node's shared automation family by tools/host-client/sync-automation-family.mjs (api-coverage P4.4).
${body}// END GENERATED AUTOMATION FAMILY`;
function update(file,begin,end,block,anchor){
  const path=resolve(root,file),text=read(path);
  const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+end),()=>block):text.replace(anchor,block+'\n\n'+anchor);
  assert(result.includes(begin));
  if(process.argv.includes('--check'))assert.equal(result,text,file+' differs from the Node automation family');else writeFileSync(path,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED AUTOMATION FAMILY','// END GENERATED AUTOMATION FAMILY',generated,'// BEGIN GENERATED SYSTEM');

// Node's names in Bun: the bridge options, Bun's image handles, Flow's node snapshots and the namespaces below.
const NAMESPACES={'autojs6:automator':'RuntimeAutomator','autojs6:auto':'RuntimeAuto','autojs6:threads':'RuntimeThreads',
  'autojs6:continuation':'RuntimeContinuation','autojs6:timers':'RuntimeTimers','autojs6:yolo':'RuntimeYolo','autojs6:selector':'RuntimeSelector',
  ocr:'RuntimeOcr',barcode:'RuntimeBarcode'};
const types=text=>Object.entries(NAMESPACES).reduce((value,[module,name])=>value.replaceAll(`import("${module}").`,name+'.'),text)
  .replaceAll('AutoJs6Node.BridgeCallOptions','AutomationCallOptions').replaceAll('AutoJs6Node.AbortSignalLike','AbortSignal')
  .replaceAll('AutoJs6Node.ImageHandleLike','ImageHandleLike').replaceAll('AutoJs6Node.ImageHandle','ImageHandle')
  .replaceAll('AutoJs6Node.Bounds','RuntimeFlow.Bounds').replaceAll('AutoJs6Node.Point','RuntimeFlow.PointValue')
  .replaceAll('AutoJs6NodeTimers.TimerHandle','ReturnType<typeof setTimeout>').replaceAll('import("flow").','RuntimeFlow.')
  .replaceAll('import("accessibility").','RuntimeAccessibility.')
  // Bun's ImageHandleLike is a union, which an interface cannot extend.
  .replace(/export interface HandleImageInput extends ImageHandleLike \{\n\s*readonly type\?: "imageHandle";\n\s*\}/,'export type HandleImageInput = ImageHandleLike & { readonly type?: "imageHandle" };');
let declarations='// BEGIN GENERATED AUTOMATION FAMILY TYPES\n';
for(const [file,module,name] of [['automation','autojs6:automator','automator'],['automation','autojs6:auto','auto'],['automation','autojs6:threads','threads'],
  ['automation','autojs6:continuation','continuation'],['automation','autojs6:timers','timers'],['automation','autojs6:yolo','yolo'],
  ['automation','autojs6:selector','selector'],['ocr','ocr','ocr'],['barcode','barcode','barcode']]){
  const text=read(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${file}.d.ts`));
  const first=text.indexOf(`  namespace ${name} {`,text.indexOf(`declare module "${module}" {`)),last=text.indexOf('\n  }\n',first);
  assert(text.indexOf(`declare module "${module}" {`)>=0&&first>=0&&last>first,module);
  declarations+=types(text.slice(first,last+4).replace(`  namespace ${name}`,`export namespace ${NAMESPACES[module]}`))+'\n';
}
declarations+='// END GENERATED AUTOMATION FAMILY TYPES';
assert(!/AutoJs6Node|import\("/.test(declarations),'Untranslated Node names in the automation family types');
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED AUTOMATION FAMILY TYPES','// END GENERATED AUTOMATION FAMILY TYPES',declarations,'// BEGIN GENERATED SYSTEM TYPES');
console.log('Node/Bun automation family factory and declarations match');
