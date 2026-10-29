import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
// The P3.2b Rhino comparison cases (synced from the Node runtime by sync-js-tools.mjs) of colors / Color, mime, the timing
// recorder and the global object against the Rhino values of a device (AutoJs6 api-coverage P4.2b). Cases that need the
// host (Java handles, Paint, images, the theme, storages, mediainfo files) run on a device (device_bun_js_tools.py of the
// host). Cases on which Rhino's interpreter itself fails only require Bun to throw.
const require=createRequire(import.meta.url);
const {encode,thrown}=require('./js-tools/cases.js');
const expected=JSON.parse(readFileSync(new URL('./files-data/rhino-expected.json',import.meta.url),'utf8')).cases;
const deviceOnly=(id,source)=>/\b(java|D)\b/.test(source)||/themeColor|toColorStateList|^extract\./i.test(id);
const GROUPS={colors:'cases-colors.js',mime:'cases-mime-recorder.js',data:'cases-data.js'};
const cases=Object.fromEntries(Object.entries(GROUPS).map(([group,file])=>[group,require('./files-data/'+file).cases
  .filter(c=>c[2]!==null&&!deviceOnly(c[0],c.length>2?c[2]:c[1])).map(c=>[group+'/'+c[0],c.length>2?c[2]:c[1]])]));
async function client(){
  return createHostClient({socket:'fixture',fetch:async url=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:[],limits:{}});
    throw new Error('no host call expected: '+url);
  }});
}
function same(a,b){
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>same(x,b[i]));
  if(a&&b&&typeof a==='object'&&typeof b==='object'){const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&same(a[k],b[k]));}
  return a===b;
}
const errorName=name=>name.startsWith('JavaException ')?name.slice('JavaException '.length):name;
async function run(list,scope){
  const names=Object.keys(scope),results={};
  for(const [id,source] of list){
    try{let value=new Function(...names,'return ('+source+');')(...names.map(name=>scope[name]));if(value&&typeof value.then==='function')value=await value;results[id]={ok:encode(value,()=>null)};}
    catch(e){results[id]={th:thrown(e)};}
  }
  return results;
}
function check(results){
  const failures={};let pass=0;
  for(const [id,actual] of Object.entries(results)){
    const want=expected[id];
    const ok=!want?false:want.rhinoCrash?'th' in actual:'th' in want?'th' in actual&&errorName(want.th.name)===errorName(actual.th.name):'ok' in actual&&same(want.ok,actual.ok);
    if(ok)pass++;else failures[id]='expected '+JSON.stringify(want).slice(0,120)+', got '+JSON.stringify(actual).slice(0,160);
  }
  assert.deepEqual(failures,{});
  return pass;
}

test('Bun colors / Color, mime and the recorder give the Rhino results without any grant',async()=>{
  const host=await client();
  const pass=check(Object.assign(await run(cases.colors,{colors:host.colors,Color:host.global.Color}),
    await run(cases.mime,{mime:host.mime,recorder:host.recorder})));
  assert(pass>700,'compared cases: '+pass);
});

test('Bun global open / Color and the mediainfo constants match Rhino',async()=>{
  const host=await client();
  const local=cases.data.filter(([id])=>/^data\/(global|mediainfo)\./.test(id));
  assert.equal(check(await run(local,{G:host.global,mediainfo:host.mediainfo})),local.length);
  assert(local.length>=5);
});

test('Bun Rhino global libraries compile from the files next to the client on first use',async()=>{
  const host=await client(),G=host.global;
  assert.equal(G.dayjs('2020-01-31').add(1,'month').format('YYYY-MM-DD'),'2020-02-29');
  // pangu.js 10.1.0, as in Rhino, has spaceText (spacingText was its 4.x name).
  assert.equal(G.pangu.spaceText('中文English中文123'),'中文 English 中文 123');
  assert.equal(G.cheerio.load('<ul><li class=a>x</li><li>y</li></ul>')('li.a').text(),'x');
  assert.equal(typeof G.i18n.setLocale,'function');
  assert.equal(G.dayjs,G.dayjs);
});

test('Bun zip, files.open and files.toFile first learn the host script directory, through files.control',async()=>{
  const calls=[];
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:['files.control'],limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});
    return Response.json({ok:true,capability,result:{value:request.method==='cwd'?'/sdcard/Scripts':null}});
  }});
  // Without java.interop the zip4j and java.io.File calls are refused after the directory is known.
  await assert.rejects(host.zip.open('a.zip'),error=>error.code==='NOT_GRANTED');
  await assert.rejects(host.files.toFile('a.txt'),error=>error.code==='NOT_GRANTED');
  await assert.rejects(host.global.open('a.txt'),error=>error.code==='NOT_GRANTED');
  assert.deepEqual(calls.map(x=>[x.capability,x.request.method]),[['files.control','cwd']]);
  assert.equal(host.global.open,host.files.open);
  assert.equal(typeof host.zip,'function');assert.equal(host.zip,host.zip);
});

test('Bun holds the zip4j work of the shared core to the 120 s host call limit and reads assets in Java charsets',async()=>{
  const calls=[];
  const host=await createHostClient({socket:'fixture',fetch:async(url,init)=>{
    if(url.endsWith('/info'))return Response.json({ok:true,bridgeVersion:1,capabilities:['files.control','java.interop'],limits:{}});
    const capability=url.split('/').at(-1),request=JSON.parse(init.body);calls.push({capability,request});
    if(capability==='files.control')return Response.json({ok:true,capability,result:{value:request.method==='cwd'?'/sdcard/Scripts':
      request.method==='readAssets'?Buffer.from([0x41,0xe9]).toString('base64'):null}});
    const start=calls.find(x=>x.request.action==='start'&&String(calls.indexOf(x))===request.id);
    const value=request.action==='start'?{id:String(calls.length-1)}:request.action==='poll'?{done:true,value:start?.request.method==='new'
      ?{__autojs6JavaHandle:'h'+request.id,className:'net.lingala.zip4j.ZipFile'}:null}:true;
    return Response.json({ok:true,capability,result:{value}});
  }});
  assert.deepEqual([await host.files.readAssets('a','ISO-8859-1'),await host.files.readAssets('a','latin1'),await host.files.readAssets('a','us ascii')],['A\u00e9','A\u00e9','Ai']);
  await host.zip.zipFile('/sdcard/a.txt','/sdcard/a.zip').catch(error=>assert.doesNotMatch(String(error.message),/timeoutMs/));
  const timeouts=calls.filter(x=>x.capability==='java.interop'&&x.request.action==='start').map(x=>x.request.timeoutMs);
  assert(timeouts.length>0&&timeouts.every(t=>t>=1&&t<=120000),JSON.stringify(timeouts));
  assert(timeouts.includes(120000),'the zip4j work asks the longest host call: '+JSON.stringify(timeouts));
});
