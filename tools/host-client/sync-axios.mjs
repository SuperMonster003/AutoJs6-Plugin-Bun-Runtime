import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// The axios library of AutoJs6 Rhino scripts (host assets/modules/axios/axios.min.js, axios 1.1.2 browser build), embedded
// for the global axios of the Bun client (api-coverage Q64 (b)). Rhino hands it its OkHttp XMLHttpRequest through
// browser-libs; the Bun client hands it a fetch-based one (host-client.mjs, __autojs6_bun_xhr_class).
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const hostRoot=process.argv.includes('--host-root')?resolve(process.argv[process.argv.indexOf('--host-root')+1]):resolve(root,'../AutoJs6');
const lines=readFileSync(resolve(hostRoot,'app/src/main/assets/modules/axios/axios.min.js'),'utf8').replaceAll('\r\n','\n').replace(/\n+$/,'').split('\n');
// "use strict"; (function(){ let {window, ...} = require('modules/axios/browser-libs/index.js') ... })()
assert.equal(lines[0],'"use strict";');
assert.equal(lines[1],'(function(){');
assert.match(lines[2],/^let \{window,FormData,Blob,Object,XMLHttpRequest,setTimeout\} = require\('modules\/axios\/browser-libs\/index\.js'\)$/);
assert.equal(lines.at(-1),'})()');
const body=lines.slice(3,-1).join('\n');
assert.match(body,/Pe\.VERSION = Se/);
assert(!/\brequire\(/.test(body),'axios.min.js requires another module');
const generated=`// BEGIN GENERATED AXIOS
// axios 1.1.2 (MIT, Copyright (c) 2014-present Matt Zabriskie & Collaborators), the browser build AutoJs6 Rhino scripts load
// from the host's assets/modules/axios/axios.min.js; reproduced by tools/host-client/sync-axios.mjs (do not edit here).
function __autojs6_bun_axios_library(window, XMLHttpRequest) {
const module = { exports: {} }, exports = module.exports;
${body}
return module.exports;
}
// END GENERATED AXIOS`;
const file=resolve(root,'app/src/main/assets/autojs6/host-client.mjs'),text=readFileSync(file,'utf8').replaceAll('\r\n','\n');
const anchor='// BEGIN GENERATED JS TOOLS';
const result=text.includes('// BEGIN GENERATED AXIOS')?text.replace(/\/\/ BEGIN GENERATED AXIOS[\s\S]*?\/\/ END GENERATED AXIOS/,()=>generated):text.replace(anchor,()=>generated+'\n\n'+anchor);
assert(result.includes('// END GENERATED AXIOS'));
if(process.argv.includes('--check'))assert.equal(result,text,'host-client.mjs differs from the host axios module');
else if(result!==text)writeFileSync(file,result);
console.log('Bun axios matches the host axios module');
