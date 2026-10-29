import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// The shared JS tools core (util, species, global data functions, s13n, cvt / fmt, jsox) of the Node runtime, its
// declarations and the Rhino comparison cases (api-coverage P3.2a / P4.2a).
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nodeRoot=process.argv.includes('--node-root')?resolve(process.argv[process.argv.indexOf('--node-root')+1]):resolve(root,'../AutoJs6-Plugin-NodeJs-Runtime');
const check=process.argv.includes('--check');
const read=path=>readFileSync(path,'utf8').replaceAll('\r\n','\n');
const source=read(resolve(nodeRoot,'app/src/main/cpp/node_bridge_sources.cpp'));
const first='  // Shared JS tools core.\n',last='  // End shared JS tools core.\n';
const start=source.indexOf(first),end=source.indexOf(last,start);assert(start>=0&&end>start);
function write(file,text){
  const path=resolve(root,file);let old=null;try{old=read(path);}catch{}
  if(check)assert.equal(old,text,file+' differs from the Node JS tools source');else if(old!==text){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text);}
}
function update(file,begin,finish,body,anchor){
  const text=read(resolve(root,file));
  const result=text.includes(begin)?text.replace(new RegExp(begin+'[\\s\\S]*?'+finish),()=>body):text.replace(anchor,()=>body+'\n\n'+anchor);
  assert(result.includes(begin));write(file,result);
}
update('app/src/main/assets/autojs6/host-client.mjs','// BEGIN GENERATED JS TOOLS','// END GENERATED JS TOOLS',
  '// BEGIN GENERATED JS TOOLS\n'+source.slice(start,end+last.length)+'// END GENERATED JS TOOLS','export async function createHostClient');
let types='// BEGIN GENERATED JS TOOLS TYPES\n';
for(const [file,module,name,exported] of [['util','autojs6:util','util','RuntimeUtil'],['species','species','species','RuntimeSpecies'],
  ['global','autojs6:global','global','RuntimeGlobal'],['s13n','s13n','s13n','RuntimeS13n'],['converter','converter','converter','RuntimeConverter'],
  ['formatter','formatter','formatter','RuntimeFormatter'],['jsox','jsox','jsox','RuntimeJsox']]){
  const text=read(resolve(nodeRoot,`docs/nodejs/types/autojs6-node/${file}.d.ts`));
  const declared=text.indexOf(`declare module "${module}" {\n  namespace ${name} {`),from=text.indexOf(`  namespace ${name} {`,declared),to=text.indexOf('\n  }\n',from);
  assert(declared>=0&&to>from,file);
  let body=text.slice(from,to+4).replace(`  namespace ${name}`,`export namespace ${exported}`).replaceAll('import("java").','RuntimeJava.');
  // Bun has no axios module: its global.axios is the embedded host axios library (RuntimeAxios, api-coverage Q64 (b)).
  if(name==='global'){const axios=/\n( *)\/\*\*[^\n]*\*\/\n *readonly axios: typeof import\("axios"\);/;assert.match(body,axios);
    body=body.replace(axios,(_,space)=>`\n${space}/** The axios 1.1.2 library of AutoJs6 Rhino scripts, embedded in the client and running on fetch. */\n${space}readonly axios: RuntimeAxios.AxiosStatic;`);}
  assert(!body.includes('import('),file+' declarations reference another Node module');
  types+=body+'\n';
}
types+='// END GENERATED JS TOOLS TYPES';
update('app/src/main/assets/autojs6/host-client.d.mts','// BEGIN GENERATED JS TOOLS TYPES','// END GENERATED JS TOOLS TYPES',types,'export interface HostClient {');
for(const file of ['cases.js','rhino-expected.json'])write(`tools/host-client/js-tools/${file}`,read(resolve(nodeRoot,`tools/nodejs/api/js-tools/${file}`)));
console.log('Node/Bun JS tools core, declarations and Rhino comparison cases match');
