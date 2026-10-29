import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
// The shared JS tools cases (synced from the Node runtime by sync-js-tools.mjs) against the Rhino values of a device.
const {cases,encode,thrown}=createRequire(import.meta.url)('./js-tools/cases.js');
const expected=JSON.parse(readFileSync(new URL('./js-tools/rhino-expected.json',import.meta.url),'utf8')).cases;
// Expressions reaching the Java facade, and values that depend on the device (display metrics, SDK level).
const JAVA=/\bjava\.|util\.java\.|s13n\.(point|throwable)\(|\.vibrate\(/,DEVICE=/^util\.((dp|sp|px)To\w+|version)\./;
// The library getters of the Rhino global object are not in the Bun client yet (api-coverage Q61 / Q64).
const LIBRARIES=/^global\.(axios|dayjs|pangu|cheerio|i18n)\./;
async function fixture(grants=[],answer=()=>null){
  const calls=[];
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:grants,limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});
    const value=request.action==='start'?{id:String(calls.length),method:request.method,payload:request.args?.[0]}:request.action==='poll'?{done:true,value:answer(calls.find(x=>x.request.action==='start'&&String(calls.indexOf(x)+1)===request.id)?.request)}:true;
    return Response.json({ok:true,capability,result:{value}});
  }});
  return {host,calls};
}
const env=host=>({util:host.util,species:host.species,G:host.global,Mathx:host.jsox.mathx,Arrayx:host.jsox.arrayx,Numberx:host.jsox.numberx,
  jsox:host.jsox,cvt:host.cvt,fmt:host.fmt,s13n:host.s13n,java:host.java});
function same(a,b){
  if(a&&typeof a==='object'&&!Array.isArray(a)&&'list' in a&&Array.isArray(b))a=a.list;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>same(x,b[i]));
  if(a&&b&&typeof a==='object'&&typeof b==='object'){const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&same(a[k],b[k]));}
  return a===b;
}
const errorName=name=>name.startsWith('JavaException ')?name.slice('JavaException '.length):name;
async function run(scope,source){
  const names=Object.keys(scope);
  try{let value=new Function(...names,'return ('+source+');')(...names.map(name=>scope[name]));if(value&&typeof value.then==='function')value=await value;return {ok:encode(value,()=>null)};}
  catch(e){return {th:e&&e.code==='NOT_GRANTED'?{name:'NOT_GRANTED',message:String(e.message)}:thrown(e)};}
}

test('Bun JS tools give the Rhino results of the shared cases without any grant',async()=>{
  const {host,calls}=await fixture(),scope=env(host),failures=[];let compared=0,denied=0;
  for(const [id,rhino,runtime] of cases){
    const source=runtime===undefined?rhino:runtime;
    if(source===null||DEVICE.test(id)||LIBRARIES.test(id))continue;
    const want=expected[id],actual=await run(scope,source);assert(want,id+' has no Rhino value');
    const java=JAVA.test(source);java?denied++:compared++;
    // Without java.interop a case reaching the Java facade rejects with NOT_GRANTED; one answered before that
    // (argument errors, nullish shortcuts) is compared with Rhino.
    if(java&&actual.th?.name==='NOT_GRANTED')continue;
    const ok='th' in want?'th' in actual&&errorName(want.th.name)===errorName(actual.th.name):'ok' in actual&&same(want.ok,actual.ok);
    if(!ok)failures.push(id+': expected '+JSON.stringify(want).slice(0,120)+', got '+JSON.stringify(actual).slice(0,160));
  }
  assert.deepEqual(failures,[]);assert(compared>400&&denied>20,`${compared} compared, ${denied} Java cases`);
  assert(calls.every(x=>x.capability!=='java.interop'));
});

test('Bun JS tools reach the host Java facade only through java.interop',async()=>{
  const f=await fixture(['java.interop'],request=>request?.method==='newArray'?{__autojs6JavaHandle:'array',className:'[I'}:request?.method==='new'?{__autojs6JavaHandle:'point',className:'android.graphics.Point'}:null);
  const array=await f.host.util.java.array('int',3);assert.equal(array.className,'[I');
  assert.deepEqual(f.calls.find(x=>x.request.method==='newArray').request.args[0],{className:'int',value:3});
  const point=await f.host.s13n.point([3.7,-2.2]);assert.equal(point.className,'android.graphics.Point');
  const created=f.calls.find(x=>x.request.method==='new').request.args[0];
  assert.deepEqual([created.className,created.args,created.parameterTypes],['android.graphics.Point',[3,-2],['int','int']]);
  assert(f.calls.every(x=>x.capability==='java.interop'));
});

test('Bun JS tools read the display metrics the plugin writes next to the client',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'aj6-bun-js-tools-'));
  try{
    copyFileSync(new URL('../../app/src/main/assets/autojs6/host-client.mjs',import.meta.url),join(directory,'host-client.mjs'));
    writeFileSync(join(directory,'device-info.json'),'{"sdkInt":35,"density":2.5,"densityDpi":400,"scaledDensity":2.5}');
    const module=await import(pathToFileURL(join(directory,'host-client.mjs')).href);
    const host=await module.createHostClient({socket:'fixture',fetch:async()=>Response.json({ok:true,bridgeVersion:1,capabilities:[],limits:{}})});
    assert.deepEqual([host.util.version.sdkInt,host.util.dpToPx(10),host.util.pxToDp(100),host.util.spToPx('2.5')],[35,25,40,6.25]);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('Bun pinyin constants are the numbers of the shared pinyin bridge',async()=>{
  const {host}=await fixture(['text.pinyin']);
  assert.deepEqual([host.pinyin.STYLE_NORMAL,host.pinyin.STYLE_TONE,host.pinyin.STYLE_TONE2,host.pinyin.STYLE_INITIALS,host.pinyin.STYLE_FIRST_LETTER,
    host.pinyin.STYLE_TO3NE,host.pinyin.MODE_NORMAL,host.pinyin.MODE_SURNAME,host.pinyin.MODE_PLACENAME,host.pinyin.MODE_PLACE_NAME],[0,1,2,3,4,5,0,1,2,2]);
});
