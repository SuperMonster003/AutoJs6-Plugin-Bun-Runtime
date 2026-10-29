import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHostClient} from '../../app/src/main/assets/autojs6/host-client.mjs';
// The global axios of the Bun client (api-coverage Q64 (b)): the host's axios 1.1.2 over a fetch-based XMLHttpRequest.
async function client(){
  return createHostClient({socket:'fixture',fetch:async()=>Response.json({ok:true,bridgeVersion:1,capabilities:[],limits:{}})});
}
async function server(){
  const http=createServer((request,response)=>{
    const chunks=[];request.on('data',chunk=>chunks.push(chunk));
    request.on('end',()=>{
      const url=new URL(request.url,'http://localhost'),body=Buffer.concat(chunks);
      if(url.pathname==='/slow')return setTimeout(()=>response.end('late'),2000);
      if(url.pathname==='/missing'){response.writeHead(404,{'content-type':'application/json'});return response.end('{"error":"missing"}');}
      if(url.pathname==='/redirect'){response.writeHead(302,{location:'/echo?redirected=1'});return response.end();}
      if(url.pathname==='/bytes'){response.writeHead(200,{'content-type':'application/octet-stream'});return response.end(Buffer.from([0,1,2,255]));}
      response.writeHead(200,{'content-type':'application/json','x-reply':'yes','set-cookie':['a=1','b=2']});
      response.end(JSON.stringify({method:request.method,path:url.pathname,query:Object.fromEntries(url.searchParams),
        headers:{type:request.headers['content-type']??null,custom:request.headers['x-custom']??null,auth:request.headers.authorization??null},body:body.toString()}));
    });
  });
  await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
  return {base:`http://127.0.0.1:${http.address().port}`,close:()=>new Promise(resolve=>{http.closeAllConnections();http.close(resolve);})};
}

test('Bun global axios is the host axios library, created once on first use',async()=>{
  const host=await client(),axios=host.global.axios;
  assert.deepEqual([typeof axios,typeof axios.get,typeof axios.post,typeof axios.create],['function','function','function','function']);
  assert.equal(axios.VERSION,'1.1.2');assert.equal(host.global.axios,axios);
  for(const name of ['Axios','CanceledError','CancelToken','isCancel','toFormData','AxiosError','Cancel','all','spread','isAxiosError','formToJSON'])assert(name in axios,name);
  assert.equal(typeof axios.browser.XMLHttpRequest,'function');assert.equal(Object.prototype.toString.call(new axios.browser.XMLHttpRequest()),'[object XMLHttpRequest]');
  assert.equal(typeof axios.defaults.headers.common,'object');
});

test('Bun axios requests go through fetch with axios semantics',async()=>{
  const {base,close}=await server(),axios=(await client()).global.axios;
  try{
    const got=await axios.get(base+'/echo',{params:{a:1,b:'x y'},headers:{'X-Custom':'c'},auth:{username:'u',password:'p'}});
    assert.equal(got.status,200);assert.equal(got.headers['x-reply'],'yes');// axios 1.1.2 joins repeated set-cookie values into one string (Rhino gives the same).
    assert.equal(got.headers['set-cookie'],'a=1,b=2');
    assert.deepEqual([got.data.method,got.data.path,got.data.query,got.data.headers.custom,got.data.headers.auth],['GET','/echo',{a:'1',b:'x y'},'c','Basic '+btoa('u:p')]);
    const posted=await axios.post(base+'/echo',{n:1});
    assert.deepEqual([posted.data.method,posted.data.headers.type,JSON.parse(posted.data.body)],['POST','application/json',{n:1}]);
    const text=await axios.put(base+'/echo','plain',{headers:{'Content-Type':'text/plain'}});
    assert.deepEqual([text.data.method,text.data.headers.type,text.data.body],['PUT','text/plain','plain']);
    const form=new FormData();form.append('f','v');
    const multipart=await axios.post(base+'/echo',form);
    assert.match(multipart.data.headers.type,/^multipart\/form-data; boundary=/);assert.match(multipart.data.body,/name="f"\r\n\r\nv/);
    const instance=axios.create({baseURL:base,headers:{'X-Custom':'instance'}});
    instance.interceptors.request.use(config=>{config.params={...config.params,i:'1'};return config;});
    const created=await instance.get('/echo');
    assert.deepEqual([created.data.query,created.data.headers.custom],[{i:'1'},'instance']);
    const redirected=await axios.get(base+'/redirect');
    assert.deepEqual([redirected.data.path,redirected.data.query],['/echo',{redirected:'1'}]);
    const bytes=await axios.get(base+'/bytes',{responseType:'arraybuffer'});
    assert(bytes.data instanceof ArrayBuffer);assert.deepEqual([...new Uint8Array(bytes.data)],[0,1,2,255]);
    const blob=await axios.get(base+'/bytes',{responseType:'blob'});
    assert(blob.data instanceof Blob);assert.equal(blob.data.size,4);
    const raw=await axios.get(base+'/echo',{responseType:'text',transformResponse:[data=>data]});
    assert.equal(typeof raw.data,'string');
  }finally{await close();}
});

test('Bun axios rejects with AxiosError and CanceledError as in Rhino',async()=>{
  const {base,close}=await server(),axios=(await client()).global.axios;
  try{
    const missing=await axios.get(base+'/missing').catch(error=>error);
    assert(axios.isAxiosError(missing));assert.deepEqual([missing.code,missing.response.status,missing.response.data],['ERR_BAD_REQUEST',404,{error:'missing'}]);
    assert.equal(missing.message,'Request failed with status code 404');
    const timeout=await axios.get(base+'/slow',{timeout:100}).catch(error=>error);
    assert.deepEqual([timeout.code,timeout.message],['ECONNABORTED','timeout of 100ms exceeded']);
    const controller=new AbortController(),pending=axios.get(base+'/slow',{signal:controller.signal});controller.abort();
    const canceled=await pending.catch(error=>error);
    assert(axios.isCancel(canceled));assert.equal(canceled.code,'ERR_CANCELED');
    const source=axios.CancelToken.source(),tokened=axios.get(base+'/slow',{cancelToken:source.token});source.cancel('stop');
    const tokenError=await tokened.catch(error=>error);assert(axios.isCancel(tokenError));assert.equal(tokenError.message,'stop');
    const network=await axios.get('http://127.0.0.1:1/').catch(error=>error);
    assert.deepEqual([network.code,network.message],['ERR_NETWORK','Network Error']);
    const relative=await axios.get('/relative').catch(error=>error);
    assert(relative instanceof TypeError);
  }finally{await close();}
});
