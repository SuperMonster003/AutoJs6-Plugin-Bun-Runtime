import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// Rhino's UI family (AutoJs6 api-coverage P4.3): the declarations of Node's ui and compose modules (RuntimeUi / RuntimeCompose,
// with the content view and window members, ComposeNode's accessors and ComposeError of P3.3), autojs6:floaty / web /
// terminal and console.build's ConsoleConfigurator. The code itself is the shared portable-ui-compose.js, which Node's
// tools/nodejs/api/sync-ui-compose.js copies into host-client.mjs.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const read=file=>readFileSync(file,'utf8').replaceAll('\r\n','\n').replace(/^\uFEFF/,'');
const nodeTypes=name=>read(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${name}.d.ts`));
// The text from `first` to its closing brace at the same indentation.
function block(text,first,label){
  const start=text.indexOf(first);
  assert(start>=0,label);
  const indent=first.match(/^\s*/)[0],end=text.indexOf('\n'+indent+'}',start);
  assert(end>start,label);
  return text.slice(start,end+indent.length+2);
}
// Node's names in Bun: the bridge options and JSON values of the host client, its namespaces for the modules.
const types=text=>text.replaceAll('import("ui").','RuntimeUi.').replaceAll('import("autojs6:android").','RuntimeAndroid.')
  .replaceAll('AutoJs6Node.JsonValue','JsonValue');
const ui=types(block(nodeTypes('ui'),'  namespace ui {','Node ui namespace')).replace(/^  namespace ui \{\n/,
  'export namespace RuntimeUi {\n    export interface UiBridgeCallOptions { timeoutMs?: number; signal?: AbortSignal }\n')
  .replaceAll('AutoJs6Node.BridgeCallOptions','UiBridgeCallOptions').replace(/\n  \}$/,'\n}');
const compose=types(block(nodeTypes('compose'),'declare namespace RuntimeCompose {','Node RuntimeCompose namespace'))
  .replace('declare namespace RuntimeCompose','export namespace RuntimeCompose');
let family='// BEGIN GENERATED UI FAMILY TYPES\n';
for(const [file,name,namespace] of [['floaty','floaty','RuntimeFloaty'],['web','web','RuntimeWeb'],['terminal','terminal','RuntimeTerminal']]){
  const text=nodeTypes(file);
  assert(text.includes(`declare module "autojs6:${name}" {`),file);
  family+=types(block(text.slice(text.indexOf(`declare module "autojs6:${name}" {`)),`  namespace ${name} {`,file))
    .replace(`  namespace ${name} {`,`export namespace ${namespace} {`).replaceAll('AutoJs6Node.BridgeCallOptions','RuntimeUi.UiBridgeCallOptions')+'\n';
}
family+='export namespace RuntimeConsole {\n'+block(nodeTypes('console'),'  export interface ConsoleConfigurator {','ConsoleConfigurator')+'\n}\n';
family+='// END GENERATED UI FAMILY TYPES';
const translated=ui+compose+family;
assert(!/AutoJs6Node|import\("/.test(translated),'Untranslated Node names in the UI family types');
const file=resolve(root,'app/src/main/assets/autojs6/host-client.d.mts'),text=read(file);
let result=text.replace(block(text,'export namespace RuntimeUi {','Bun RuntimeUi'),()=>ui)
  .replace(block(text,'export namespace RuntimeCompose {','Bun RuntimeCompose'),()=>compose);
result=result.includes('// BEGIN GENERATED UI FAMILY TYPES')
  ?result.replace(/\/\/ BEGIN GENERATED UI FAMILY TYPES[\s\S]*?\/\/ END GENERATED UI FAMILY TYPES/,()=>family)
  :result.replace('export namespace RuntimeUi {',()=>family+'\n\nexport namespace RuntimeUi {');
if(process.argv.includes('--check'))assert.equal(result,text,'host-client.d.mts differs from the Node UI family declarations');
else writeFileSync(file,result);
console.log('Node/Bun UI family declarations match');
