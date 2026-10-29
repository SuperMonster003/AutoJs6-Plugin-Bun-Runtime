import {AsyncLocalStorage} from 'node:async_hooks';
import * as shellStreams from "node:stream";
import {EventEmitter} from "node:events";
/** Explicit Bun client for AutoJs6's per-execution capability bridge. No globals are installed. */
import {posix as filePath} from 'node:path';
import {Buffer} from 'node:buffer';
import {readFileSync} from 'node:fs';
export const SDK_VERSION = 1;

export const OPENCC_CONVERSION_TYPES = Object.freeze([
  "hk2s", "hk2t", "jp2t", "s2hk", "s2t", "s2tw", "s2twp", "t2hk", "t2s", "t2tw", "t2jp", "tw2s", "tw2t", "tw2sp",
  "s2twi", "twi2s", "s2jp", "t2twi", "hk2tw", "hk2twi", "hk2jp", "tw2hk", "tw2twi", "tw2jp",
  "twi2t", "twi2hk", "twi2tw", "twi2jp", "jp2s", "jp2hk", "jp2tw", "jp2twi",
]);

// pinyin.STYLE_* / MODE_* as the shared pinyin bridge reads them (the Node pinyin module uses the same numbers).
const PINYIN_CONSTANTS = Object.freeze({
  STYLE_NORMAL: 0, STYLE_TONE: 1, STYLE_TONE2: 2, STYLE_INITIALS: 3, STYLE_FIRST_LETTER: 4, STYLE_TO3NE: 5,
  MODE_NORMAL: 0, MODE_SURNAME: 1, MODE_PLACENAME: 2, MODE_PLACE_NAME: 2,
});

export class HostCallError extends Error {
  constructor(code, message, capability = null, status = 0) {
    super(message);
    this.name = "HostCallError";
    this.code = code;
    this.capability = capability;
    this.status = status;
  }
}

/** This list describes callable wrappers, not grants or provider availability. */
export const HOST_API_METHODS = Object.freeze({
  "flow.control": Object.freeze(["open","start","poll","cancel","answer","close"]),
  "mail.control": Object.freeze(["open","start","poll","cancel","answer","close"]),
  "ai.control": Object.freeze(["open","start","poll","ack","cancel","close"]),
  "agent.control": Object.freeze(["open","start","poll","ack","cancel","release","close","context","result","hasAccess","requestAccess"]),
  "epub.control": Object.freeze(["open","start","poll","cancel","close"]),
  "speech.control": Object.freeze(["open","start","poll","cancel","uploadBegin","uploadChunk","uploadDiscard","close"]),
  "tts.control": Object.freeze(["open","invoke","drain","stopTask","close"]),
  "java.interop": Object.freeze(["type","callStatic","new","call","callInstance","getField","getStatic","setField","setStatic","release","dispose","getContext","newArray","arrayLength","getArrayItem","setArrayItem","toArray","instanceOf","getClassName","proxy","defineClass","loadDex","loadJar","drainCallbacks","completeCallback","closeCallbacks","callSuper","retain"]),
  "android.objects": Object.freeze(["createPaint","setPaintColor","getPaintInfo","measureText","createColorStateList","getColorForState","close","getThemeColor","getUriForFile","parseUri"]),
  "tasks.control": Object.freeze(["addTimedTask","addIntentTask","queryTimedTasks","queryIntentTasks","getTimedTask","getIntentTask","removeTimedTask","removeIntentTask","updateTask","sendLocalBroadcastSync"]),
  "device.control": Object.freeze(["info","isScreenOn","wakeUp","vibrate","isIgnoringBatteryOptimizations","openBatteryOptimizationSettings","setBrightness","setBrightnessMode","keepScreenOn","cancelKeepingAwake","closeScope"]),
  "device.audio": Object.freeze(["getAudioStreamVolume","getAudioStreamMaxVolume","setAudioStreamVolume"]),
  "dialogs.control": Object.freeze(["alert","confirm","input","rawInput","select","singleChoice","multiChoice","progressShow","progressUpdate","progressDismiss","cancelRequest","closeScope"]),
  "events.observe": Object.freeze(["observeNotification","observeToast","observeKey","observeBroadcasts","drainEvents","close"]),
  "notifications.post": Object.freeze(["notify","cancel","cancelAll","getPermissionStatus","openSettings"]),
  "shell.control": Object.freeze(["exec", "spawn", "open", "drain", "write", "closeInput", "kill", "close", "getAccess", "requestShizukuPermission"]),
  "sensors.control": Object.freeze(["getAvailableSensors", "once", "subscribe", "unsubscribe", "drainEvents"]),
  "database.control": Object.freeze(["open", "exec", "run", "get", "all", "transaction", "close"]),
  "files.control": Object.freeze(["path", "read", "write", "append", "exists", "listDir", "remove", "copy", "move", "ensureDir", "isFile", "isDir",
    "cwd", "create", "createIfNotExists", "createWithDirs", "readBytes", "writeBytes", "appendBytes", "rename", "renameWithoutExtension",
    "removeDir", "isEmptyDir", "readAssets", "getSimplifiedPath"]),
  "storage.control": Object.freeze(["get", "put", "remove", "clear", "keys", "contains"]),
  "mediainfo.control": Object.freeze(["read", "get", "countGet", "capabilities"]),
  "app.control": Object.freeze(["launchPackage", "launchApp", "openAppSetting", "startActivity", "getPackageName", "getAppName", "isInstalled", "viewFile", "editFile", "startService", "sendBroadcast", "getInstalledApps", "getPackageInfo"]),
  "accessibility.control": Object.freeze(["isEnabled", "ensureEnabled", "click", "back", "home", "recentApps", "findByText", "clickText", "findOne", "findAll", "flowProbe", "flowForeground", "longClick", "setText", "scrollForward", "scrollBackward", "swipe", "gesture"]),
  "clipboard.control": Object.freeze(["getText", "setText", "hasText"]),
  "text.pinyin": Object.freeze(["convert", "simple", "compare", "compact", "fromCodePoint", "fromPhrase"]),
  "text.pinyin4j": Object.freeze(["of", "as", "readings"]),
  "text.opencc": Object.freeze(["convert"]),
  "image.process": Object.freeze([
    "fromBase64", "toBase64", "pixel", "readPixels", "copy", "clip", "resize", "scale", "rotate", "flip",
    "grayscale", "threshold", "blur", "gaussianBlur", "medianBlur", "invert", "findImage", "matchTemplate",
    "findColor", "findMultiColors", "detectsColor", "findAllPointsForColor", "recycle",
    "initOpenCvIfNeeded", "isGrayscale", "inRange", "interval", "adaptiveThreshold", "bilateralFilter", "cvtColor", "findCircles", "concat", "detectMultiColors", "findPointsByColors", "countPointsByColor", "getMeanColor", "matToImage", "detectAndComputeFeatures", "matchFeatures", "quantize", "compress", "compressToBytes", "downsample", "psnr", "ssim", "mssim", "hist", "mse", "ncc", "isEqual", "getSimilarity",
  ]),
  "image.files": Object.freeze(["readImage", "saveImage", "imread", "load", "quantizeToFile", "recycle"]),
  "screen.capture": Object.freeze(["requestScreenCapture", "getRequestResult", "captureScreen", "stopScreenCapture", "getScreenCaptureOptions"]),
  "screen.record": Object.freeze(["start", "stop", "cancel", "getStatus"]),
  "screen.metrics": Object.freeze([
    "cX", "cY", "cXy", "cYx", "getInfo", "getScaleBaseX", "getScaleBaseY", "getScaleBases",
    "setScaleBaseX", "setScaleBaseY", "setScaleBases",
  ]),
  "console.control": Object.freeze([
    "show", "hide", "reset", "expand", "collapse", "launch", "clear", "setSize", "setPosition", "setTitle",
    "setTitleTextSize", "setTitleTextColor", "setTitleBackgroundColor", "setTitleBackgroundTint",
    "setTitleBackgroundAlpha", "setTitleIconsTint", "setContentTextSize", "setContentTextColor",
    "setContentTextColors", "setContentBackgroundColor", "setContentBackgroundTint", "setContentBackgroundAlpha",
    "setTextSize", "setTextColor", "setBackgroundColor", "setBackgroundTint", "setBackgroundAlpha",
    "setExitOnClose", "setTouchable", "setGlobalLogConfig", "resetGlobalLogConfig",
  ]),
});

  // Shared portable image adapters. Native work stays in the execution's host provider.
  function __autojs6_image_extensions(base, dispatch, decodeBytes) {
    const recycled = new Set();
    const id = value => value && (value.id || value.__autojs6ImageHandle || value.__autojs6MatHandle || value.__autojs6ImageFeaturesHandle);
    function options(value) {
      if (value === undefined || value === null) return {};
      if (typeof value !== "object" || Array.isArray(value)) throw new TypeError("Image options must be an object.");
      return { ...value };
    }
    function payload(value) {
      const { signal, timeoutMs, ...plain } = options(value);
      function check(item) {
        if (typeof item === "number" && !Number.isFinite(item)) throw new TypeError("Image arguments must be finite.");
        if (item && typeof item === "object") Object.values(item).forEach(check);
      }
      check(plain); return plain;
    }
    function text(value,label) {
      if(value===null||value===undefined)throw new TypeError(label+" must not be null or undefined.");
      const result=String(value);if(!result||result.includes("\u0000"))throw new TypeError(label+" must be non-empty and contain no NUL.");return result;
    }
    async function withInput(input, opts, action, acceptBytes = false) {
      let owned = false, image = input;
      if (typeof input === "string") { image = /^(https?|file):/i.test(input) ? await extra.load(input, opts) : await base.readImage(input, opts); owned = true; }
      else if (acceptBytes && (input instanceof ArrayBuffer || ArrayBuffer.isView(input) || Array.isArray(input))) { image = await base.fromBytes(input, opts); owned = true; }
      if (!id(image)) throw new TypeError("An active image handle or readable image source is required.");
      try { return await action(image); } finally { if (owned && image) await base.recycle(image); }
    }
    const one = (method, image, data = {}, opts = data) => withInput(image, opts, value => dispatch(method, [value, payload(data)], opts));
    const two = (method, a, b, data = {}) => withInput(a, data, first => withInput(b, data, second => dispatch(method, [first, second, payload(data)], data)));
    function region(value, width, height) {
      if (width === undefined || height === undefined) return null;
      let entries = value == null ? [] : Array.isArray(value) ? value : [value.x, value.y, value.width, value.height];
      const x = entries[0] ?? 0, y = entries[1] ?? 0, w = entries[2] ?? width - x, h = entries[3] ?? height - y;
      if (![x,y,w,h,width,height].every(Number.isInteger) || Math.min(x,y,w,h,width,height) < 0 || x+w > width || y+h > height) throw new TypeError("Image region must fit the image dimensions.");
      return Object.freeze({x,y,width:w,height:h});
    }
    function buildRegion(image, value) { const size=base.getSize(image); return region(value,size.width,size.height); }
    function regionOptions(image, x, y, width, height, threshold) {
      const r=buildRegion(image,[x,y,width,height]);
      return {region:[r.x,r.y,r.width,r.height],...(threshold===undefined?{}:{threshold})};
    }
    class ObjectFrame {
      constructor(topLeft,topRight,bottomLeft,bottomRight,matches=0,inliers=0,points=[]) {
        const point=p=>{if(!p||![p.x,p.y].every(Number.isFinite))throw new TypeError("Frame points must be finite.");return Object.freeze({x:p.x,y:p.y});};
        Object.assign(this,{topLeft:point(topLeft),topRight:point(topRight),bottomLeft:point(bottomLeft),bottomRight:point(bottomRight),matches,inliers,points:points.map(point)});
        const corners=[this.topLeft,this.topRight,this.bottomLeft,this.bottomRight],xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
        this.centerX=xs.reduce((a,b)=>a+b)/4;this.centerY=ys.reduce((a,b)=>a+b)/4;this.center=Object.freeze({x:this.centerX,y:this.centerY});
        this.width=Math.hypot(topRight.x-topLeft.x,topRight.y-topLeft.y);this.height=Math.hypot(bottomLeft.x-topLeft.x,bottomLeft.y-topLeft.y);
        this.angle=Math.atan2(topRight.y-topLeft.y,topRight.x-topLeft.x)*180/Math.PI;
        const x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys));this.bounds=Object.freeze({x,y,width:Math.ceil(Math.max(...xs))-x,height:Math.ceil(Math.max(...ys))-y});
        Object.freeze(this.points);Object.freeze(this);
      }
      summary(){return `center=(${this.centerX}, ${this.centerY}), width=${this.width}, height=${this.height}, angle=${this.angle}, matches=${this.matches}, inliers=${this.inliers}`;}
      toString(){return "[ObjectFrame] "+this.summary();}
    }
    function compression(formatOrOptions,qualityOrOptions) {
      const result=typeof formatOrOptions==="string"?{format:formatOrOptions}:options(formatOrOptions);
      if(qualityOrOptions&&typeof qualityOrOptions==="object") result.quantization=payload(qualityOrOptions);
      else if(qualityOrOptions!==undefined)result.quality=qualityOrOptions;
      result.format=result.format||"png";return result;
    }
    const extra={
      ObjectFrame,buildRegion,__buildRegion:region,
      initOpenCvIfNeeded:async opts=>{await dispatch("initOpenCvIfNeeded",[],opts);},
      load:(url,opts)=>Promise.resolve().then(()=>dispatch("load",[text(url,"Image URL")],opts)),
      imread:(path,opts)=>Promise.resolve().then(()=>dispatch("imread",[text(path,"Mat path")],opts)),
      matToImage:(mat,opts)=>dispatch("matToImage",[mat],opts),
      getScreenCaptureOptions:opts=>dispatch("getScreenCaptureOptions",[],opts),
      isGrayscale:(image,opts)=>one("isGrayscale",image,{},opts),
      inRange:(image,lower,upper,opts)=>one("inRange",image,{lower,upper},opts),
      interval:(image,color,threshold,opts)=>one("interval",image,{color,threshold},opts),
      adaptiveThreshold:(image,maxValue,adaptiveMethod,type,blockSize,C,opts)=>one("adaptiveThreshold",image,
        typeof maxValue==="object"?maxValue:{maxValue,adaptiveMethod,type,blockSize,C},typeof maxValue==="object"?maxValue:opts),
      bilateralFilter:(image,d,sigmaColor,sigmaSpace,borderType,opts)=>one("bilateralFilter",image,
        typeof d==="object"?d:{d,sigmaColor,sigmaSpace,borderType},typeof d==="object"?d:opts),
      cvtColor:(image,code,dstCn,opts)=>one("cvtColor",image,{code,dstCn:typeof dstCn==="object"?undefined:dstCn},typeof dstCn==="object"?dstCn:opts),
      findCircles:(image,opts)=>one("findCircles",image,opts),
      concat:(a,b,direction="right",opts)=>two("concat",a,b,{...options(opts),...(typeof direction==="object"?direction:{direction})}),
      detectMultiColors:(image,color,points,x,y,opts)=>withInput(image,opts,value=>dispatch("detectMultiColors",[value,color,points,x,y,payload(opts)],opts)),
      findPointsByColors:(image,color,points,opts)=>withInput(image,opts,value=>dispatch("findPointsByColors",[value,color,points,payload(opts)],opts)),
      countPointsByColor:(image,color,opts)=>withInput(image,opts,value=>dispatch("countPointsByColor",[value,color,payload(opts)],opts)),
      getMeanColor:(image,opts)=>one("getMeanColor",image,opts),
      detectAndComputeFeatures:(image,opts)=>one("detectAndComputeFeatures",image,opts),
      matchFeatures:async(a,b,opts)=>{
        const value=await two("matchFeatures",a,b,opts);
        return value?new ObjectFrame(value.topLeft,value.topRight,value.bottomLeft,value.bottomRight,value.matches,value.inliers,value.points):null;
      },
      quantize:async(image,opts)=>{
        const value=await one("quantize",image,opts),{base64,...result}=value;
        result.bytes=value.bytes===undefined?decodeBytes(base64):value.bytes;return Object.freeze(result);
      },
      quantizeToFile:(image,path,opts)=>withInput(image,opts,value=>dispatch("quantizeToFile",[value,text(path,"Quantization path"),payload(opts)],opts)),
      compress:(image,formatOrOptions,qualityOrOptions)=>{const opts=compression(formatOrOptions,qualityOrOptions);return one("compress",image,opts);},
      compressToBytes:async(image,formatOrOptions,qualityOrOptions)=>{const opts=compression(formatOrOptions,qualityOrOptions);const value=await one("compressToBytes",image,opts);return typeof value==="string"?decodeBytes(value):value;},
      downsample:(source,width,height,withAlpha=true,opts)=>withInput(source,opts,value=>dispatch("downsample",[value,{width,height,withAlpha}],opts),true),
      findColorInRegion:(image,color,x,y,width,height,threshold)=>withInput(image,{},value=>base.findColor(value,color,regionOptions(value,x,y,width,height,threshold))),
      findImageInRegion:(image,template,x,y,width,height,threshold)=>withInput(image,{},first=>withInput(template,{},second=>base.findImage(first,second,regionOptions(first,x,y,width,height,threshold)))),
      findPointByColorExactly:(image,color,opts)=>withInput(image,opts,value=>base.findColor(value,color,{...options(opts),threshold:0})),
      isRecycled:(...values)=>values.flat().every(value=>!!id(value)&&(recycled.has(id(value))||!!base.isRecycled?.(value))),
      recycle:async(...values)=>{
        let opts;if(values.length>1&&!Array.isArray(values.at(-1))&&!id(values.at(-1)))opts=values.pop();
        for(const value of values.flat()){if(!id(value))throw new TypeError("Recycle requires image, Mat or feature handles.");await base.recycle(value,opts);recycled.add(id(value));}
      },
      getWidth:image=>base.getSize(image).width,getHeight:image=>base.getSize(image).height,
      read:base.readImage,
      save:base.save||(async(image,path,formatOrOptions,quality)=>{await base.saveImage(image,path,formatOrOptions,quality);return true;}),
      findPointByColor:base.findColor,findPointByColors:base.findMultiColors,findPointByImage:base.findImage,
      findColorEquals:base.findColorEquals||((image,color,opts)=>extra.findPointByColorExactly(image,color,opts)),
      requestScreenCaptureAsync:base.requestScreenCapture,
    };
    extra.loadAsync=extra.load;extra.detectsMultiColors=extra.detectMultiColors;
    for(const name of ["psnr","ssim","mssim","hist","mse","ncc","getSimilarity"])extra[name]=async(a,b,opts)=>{
      const value=await two(name,a,b,opts);return typeof value==="string"?Number(value):value;
    };
    extra.isEqual=(a,b,opts)=>two("isEqual",a,b,opts);
    return extra;
  }

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function createFiles(dispatch, device = null) {
  const text = value => value == null ? '' : String(value);
  const encoding = value => value == null || value === '' ? 'utf8' : String(value);
  function path(value,required=false) {
    if(value==null) {
      if(required) throw new TypeError('File path must not be nullish');
      return null;
    }
    const valueText=String(value);
    if(!/^file:/i.test(valueText))return valueText;
    const url=new URL(valueText);
    if(url.hostname&&url.hostname!=='localhost')throw new TypeError('Android file URLs must be local');
    if(/%2f/i.test(url.pathname))throw new TypeError('File URL must not contain an encoded slash');
    return decodeURIComponent(url.pathname);
  }
  function required(value) {
    if(value==null)throw new TypeError('File name must not be nullish');
    return String(value);
  }
  const result={
    path:async value=>dispatch('path',[path(value)]),
    join:(...values)=>filePath.join(...values.map(text)),
    read:async(value,charset)=>{const data=await dispatch('read',[path(value)]);return value==null?'':Buffer.from(data,'base64').toString(encoding(charset));},
    write:async(value,data,charset)=>{await dispatch('write',[path(value,true),Buffer.from(text(data),encoding(charset)).toString('base64')]);},
    append:async(value,data,charset)=>{await dispatch('append',[path(value,true),Buffer.from(text(data),encoding(charset)).toString('base64')]);},
    listDir:async(value,filter)=>{
      if(value!=null&&filter!=null&&typeof filter!=='function')throw new TypeError('files.listDir filter must be a function');
      const names=await dispatch('listDir',[path(value)]);
      return typeof filter==='function'?names.filter(name=>filter(name)===true):names;
    },
    copy:async(from,to)=>dispatch('copy',[path(from,true),path(to,true)]),
    move:async(from,to)=>dispatch('move',[path(from,true),path(to,true)]),
    ensureDir:async value=>dispatch('ensureDir',[path(value,true)]),
    getName:value=>filePath.basename(required(value)),
    getExtension:value=>filePath.extname(required(value)).slice(1),
    open(){throw new HostCallError('NOT_SUPPORTED','Rhino file handles are unavailable; use Bun or node:fs file handles for runtime-local files','files.control');},
    toFile(){throw new HostCallError('NOT_SUPPORTED','Raw java.io.File objects are not exposed by Bun','files.control');},
  };
  for(const method of ['exists','remove','isFile','isDir'])result[method]=async value=>dispatch(method,[path(value)]);
  // The members of the Rhino files prototype (api-coverage P4.2b): host operations with the host's results; bytes are
  // Buffers here (Rhino: Java byte[]), any byte source is accepted (numbers keep their low 8 bits).
  const bytes = (value, method) => {
    if (value == null) throw new TypeError(`files.${method} bytes must not be nullish`);
    if (typeof value === 'string' || typeof value !== 'object' && typeof value !== 'function')
      throw new TypeError(`files.${method} bytes must be a byte array`);
    const view = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : value instanceof ArrayBuffer ? new Uint8Array(value) : Uint8Array.from(Array.from(value, item => Number(item) & 0xff));
    return Buffer.from(view).toString('base64');
  };
  Object.assign(result, {
    cwd: async () => dispatch('cwd', []),
    sdcardPath: device?.externalStoragePath ?? null,
    readBytes: async value => Buffer.from(await dispatch('readBytes', [path(value, true)]), 'base64'),
    writeBytes: async (value, data) => { await dispatch('writeBytes', [path(value, true), bytes(data, 'writeBytes')]); },
    appendBytes: async (value, data) => { await dispatch('appendBytes', [path(value, true), bytes(data, 'appendBytes')]); },
    rename: async (value, name) => dispatch('rename', [path(value, true), required(name)]),
    renameWithoutExtension: async (value, name) => dispatch('renameWithoutExtension', [path(value, true), required(name)]),
    readAssets: async (name, charset) => Buffer.from(await dispatch('readAssets', [required(name)]), 'base64').toString(encoding(charset)),
    getSimplifiedPath: async value => dispatch('getSimplifiedPath', [required(value)]),
  });
  for (const method of ['create', 'createIfNotExists', 'createWithDirs', 'removeDir', 'isEmptyDir']) result[method] = async value => dispatch(method, [path(value)]);
  return Object.freeze(result);
}

// Node's mediainfo module over mediainfo.control (api-coverage P4.2b): the same argument checks, query gates and frozen
// records; snapshot is Rhino's (the plugin snapshot in the asked or the plugin's default schema).
function createMediainfo(call) {
  const options = value => isObject(value) ? value : {};
  const invoke = (method, args, value, timeoutMs) => {
    const input = options(value);
    return call('mediainfo', method, args, {timeoutMs: input.timeoutMs ?? timeoutMs, signal: input.signal});
  };
  const freeze = value => {
    if (!value || typeof value !== 'object') return value === undefined ? null : value;
    if (Array.isArray(value)) return Object.freeze(value.map(freeze));
    return Object.freeze(Object.fromEntries(Object.keys(value).map(key => [key, freeze(value[key])])));
  };
  function target(value, method) {
    const text = value == null ? '' : String(value);
    if (!text || text.includes('\0')) throw new TypeError(`mediainfo.${method} path must be a non-empty file path without NUL bytes.`);
    return text;
  }
  function streamKind(value, method) {
    const text = value == null || value === '' ? 'general' : String(value).trim();
    if (!/^[A-Za-z]+$/.test(text)) throw new TypeError(`mediainfo.${method} stream kind must be a MediaInfo stream name.`);
    return text.toLowerCase();
  }
  async function read(path, opts) {
    const {signal, ...input} = options(opts);
    return freeze(await invoke('read', [target(path, 'read'), input], opts, 10000));
  }
  async function capabilities(opts) {
    return freeze(await invoke('capabilities', [], opts, 5000));
  }
  async function get(path, kind, parameter, opts) {
    const args = [target(path, 'get'), streamKind(kind, 'get'), parameter == null ? '' : String(parameter)];
    const input = options(opts);
    if (input.streamNumber !== undefined || input.infoKind !== undefined) {
      const streamNumber = input.streamNumber === undefined ? 0 : input.streamNumber;
      if (!Number.isInteger(streamNumber) || streamNumber < 0 || streamNumber > 2147483647)
        throw new TypeError('MediaInfo streamNumber must be a non-negative integer no greater than 2147483647.');
      if (input.infoKind !== undefined && typeof input.infoKind !== 'string') throw new TypeError('MediaInfo infoKind must be a string.');
      const infoKind = input.infoKind === undefined ? 'TEXT' : input.infoKind.trim().toUpperCase();
      if (!['NAME', 'TEXT', 'MEASURE', 'OPTIONS', 'NAME_TEXT', 'MEASURE_TEXT', 'INFO', 'HOWTO', 'DOMAIN'].includes(infoKind))
        throw new TypeError('Unsupported MediaInfo infoKind: ' + input.infoKind);
      args.push({streamNumber, infoKind});
      if (streamNumber !== 0 || infoKind !== 'TEXT') {
        const value = await capabilities(opts);
        if (!value || value.streamNumber !== true || !Array.isArray(value.infoKinds) || !value.infoKinds.includes(infoKind))
          throw new Error('MEDIAINFO_QUERY_UNSUPPORTED: host or plugin does not support the requested query options.');
      }
    }
    const value = await invoke('get', args, opts, 10000);
    return value == null ? '' : String(value);
  }
  async function countGet(path, kind, opts) {
    const args = [target(path, 'countGet'), streamKind(kind, 'countGet')];
    const value = await capabilities(opts);
    if (!value || value.streamCount !== true) throw new Error('MEDIAINFO_QUERY_UNSUPPORTED: host or plugin does not support stream counting.');
    return invoke('countGet', args, opts, 10000);
  }
  async function snapshot(path, opts) {
    const input = options(opts);
    if (input.schema != null && typeof input.schema !== 'string') throw new TypeError('MediaInfo snapshot schema must be a string.');
    const schema = input.schema || (await capabilities(opts))?.defaultSnapshotSchema || 'autojs6-plugin-mediainfo-snapshot-v1';
    return read(path, {...input, schema});
  }
  const facade = (path, opts) => read(path, opts);
  Object.defineProperties(facade, {
    read: {value: read, enumerable: true},
    snapshot: {value: snapshot, enumerable: true},
    get: {value: get, enumerable: true},
    countGet: {value: countGet, enumerable: true},
    capabilities: {value: capabilities, enumerable: true},
    SNAPSHOT_SCHEMA_V1: {value: 'autojs6-plugin-mediainfo-snapshot-v1', enumerable: true},
    SNAPSHOT_SCHEMA_V2: {value: 'autojs6-plugin-mediainfo-snapshot-v2', enumerable: true},
  });
  return Object.freeze(facade);
}

/**
 * Connect to the bridge and negotiate the grants for this execution. A capability grant does not
 * imply the corresponding Android permission or Pinyin provider is installed and enabled.
 */
  function __autojs6_create_ui(__autojs6_call_autojs, __autojs6_bridge_attach_events = () => null) {
    const writableViewProperties = ["text", "hint", "textSize", "textColor", "textStyle", "singleLine", "maxLines", "inputType",
      "checked", "enabled", "visible", "visibility", "alpha", "contentDescription", "clickable", "focusable",
      "width", "height", "padding", "margin", "backgroundColor", "gravity", "layoutGravity", "weight", "orientation",
      "min", "max", "progress", "indeterminate", "rating", "numStars", "stepSize", "isIndicator",
      "items", "selectedIndex", "checkedId", "textOn", "textOff", "value", "wrapSelectorWheel", "displayedValues",
      "cardCornerRadius", "cardElevation", "src", "scaleType", "adjustViewBounds",
      "url", "html", "javaScriptEnabled", "domStorageEnabled", "title", "subtitle",
      "navigationIcon", "navigationContentDescription", "menu", "drawerLockMode", "currentItem", "offscreenPageLimit"];
    const readonlyViewProperties = ["attached", "layoutWidth", "layoutHeight", "drawableWidth", "drawableHeight",
      "canGoBack", "canGoForward", "drawerOpenStart", "drawerOpenEnd", "pageCount"];
    const nativeViews = new Map();
    const webViewClientCallbacks = ["onPageStarted", "onPageFinished", "onLoadResource", "onPageCommitVisible", "doUpdateVisitedHistory", "onScaleChanged",
      "onReceivedError", "onReceivedHttpError", "onReceivedLoginRequest", "shouldOverrideUrlLoading", "shouldInterceptRequest", "shouldOverrideKeyEvent", "onUnhandledKeyEvent",
      "onFormResubmission", "onReceivedHttpAuthRequest", "onReceivedSslError", "onReceivedClientCertRequest", "onSafeBrowsingHit", "onRenderProcessGone"];
    const webChromeClientCallbacks = ["onProgressChanged", "onReceivedTitle", "onReceivedIcon", "onReceivedTouchIconUrl", "onConsoleMessage",
      "onJsAlert", "onJsConfirm", "onJsPrompt", "onJsBeforeUnload", "onPermissionRequest", "onPermissionRequestCanceled",
      "onGeolocationPermissionsShowPrompt", "onGeolocationPermissionsHidePrompt", "onShowFileChooser", "onCreateWindow", "onCloseWindow", "onRequestFocus", "onShowCustomView", "onHideCustomView", "getVisitedHistory"];
    let nativeContext;
    const nativeCall = (method, args) => __autojs6_call_autojs("ui", method, args, { permissions: ["ui"] });
    function wrapContext(value) {
      const result = { ...value };
      Object.defineProperties(result, {
        inflate: { value: layout => inflate(layout, result) },
        createView: { value: (type, props) => createView(type, props, result) }
      });
      return Object.freeze(result);
    }
    function context() { return nativeContext ||= nativeCall("context", []).then(wrapContext); }
    function viewToken(value) {
      if (!value || typeof value.__autojs6ViewHandle !== "string" || !value.__autojs6ViewHandle) throw new TypeError("An execution-owned native View handle is required");
      return value;
    }
    function wrapView(value) {
      if (value === null) return null;
      viewToken(value);
      if (nativeViews.has(value.__autojs6ViewHandle)) return nativeViews.get(value.__autojs6ViewHandle);
      // A caller may mutate the original structured-cloned token after wrapping it.
      value = Object.freeze({ ...value, id: value.__autojs6ViewHandle,
        ...(value.context ? { context: Object.freeze({ ...value.context }) } : {}) });
      const output = { ...value, context: value.context && wrapContext(value.context) };
      const listeners = new Map(); let closed = false, reading = false;
      const clients = Object.create(null), clientVersions = new Map(), webTasks = new Map(), earlyWebTasks = new Map();
      const clientInstance = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      let clientSerial = 0, startingWebTasks = 0;
      let subscriptionSerial = 0, subscription = null, subscriptionReady = null, legacyEvents = false;
      let writeTail = Promise.resolve(), sequence = 0;
      const writeErrors = [];
      const usable = () => { if (closed) throw new Error("Native View handle is closed"); };
      function write(patch, deferred = false) {
        usable();
        // Capture assignment values now, before a caller mutates an array/object again.
        const payload = __autojs6_ui_validate_json(patch, "viewUpdate", "patch", 0, [], 1024);
        const order = ++sequence;
        const result = writeTail.then(() => { usable(); return nativeCall("viewUpdate", [value, payload]); });
        writeTail = result.then(() => {}, error => { if (deferred) writeErrors.push({ order, error }); });
        return result;
      }
      async function flush() {
        const end = sequence, barrier = writeTail;
        await barrier;
        const errors = writeErrors.filter(item => item.order <= end);
        for (let index = writeErrors.length - 1; index >= 0; index--) if (writeErrors[index].order <= end) writeErrors.splice(index, 1);
        if (errors.length) throw errors[0].error;
      }
      async function read(name) {
        usable(); await flush(); usable();
        return nativeCall("viewGet", name === undefined ? [value] : [value, name]);
      }
      function command(name, args) {
        usable();
        const payload = __autojs6_ui_validate_json(args, "viewCommand", "args", 0, [], 1024);
        const barrier = flush();
        const result = writeTail.then(async () => { await barrier; usable(); return nativeCall("viewCommand", [value, name, payload]); });
        writeTail = result.then(() => {}, () => {});
        return result;
      }
      function directWebCommand(name, args) {
        usable();
        return nativeCall("viewCommand", [value, name, __autojs6_ui_validate_json(args, "viewCommand", "args", 0, [], 1024)]);
      }
      function evaluateJavascript(source, options = {}) { return webTask("beginWebEvaluation", [source, options], true); }
      function evaluateJavascriptAsync(source, options = {}) { return webTask("beginAsyncWebEvaluation", [source, options], true); }
      function subscribeEvents() {
        if (!subscriptionReady) {
          const id = clientInstance + ":" + ++subscriptionSerial;
          subscriptionReady = (legacyEvents ? Promise.resolve() : directWebCommand("subscribeViewEvents", [id]).then(() => { subscription = id; }).catch(error => {
            if (/subscribeViewEvents/.test(String(error.message)) && /unknown|unsupported/i.test(String(error.message))) legacyEvents = true;
            else throw error;
          }));
        }
        return subscriptionReady;
      }
      function configureWebClient(family, handlers, options = {}) {
        usable();
        const allowed = family === "client" ? webViewClientCallbacks : family === "chrome" ? webChromeClientCallbacks : ["onDownloadStart"];
        if (handlers !== null && (!handlers || typeof handlers !== "object" || Array.isArray(handlers))) throw new TypeError("A WebView client must be a callback object or null");
        const callbacks = { ...handlers };
        for (const [name, handler] of Object.entries(callbacks)) {
          if (!allowed.includes(name) || typeof handler !== "function") throw new TypeError("Unsupported WebView callback: " + name);
        }
        const next = { id: clientInstance + "-" + ++clientSerial, callbacks: Object.freeze(callbacks) };
        const config = __autojs6_ui_validate_json({ family, clientId: next.id, callbacks: Object.keys(callbacks), options }, "configureWebClient", "options", 0, []);
        const barrier = flush();
        const result = writeTail.then(async () => {
          await barrier; usable();
          const previous = clients[family]; clients[family] = next; clientVersions.set(next.id, next); poll();
          try { await subscribeEvents(); await nativeCall("viewCommand", [value, "configureWebClient", [config]]); if (previous) clientVersions.delete(previous.id); }
          catch (error) { clients[family] = previous; clientVersions.delete(next.id); throw error; }
        });
        writeTail = result.then(() => {}, () => {});
        return result;
      }
      function hasWebInterest() {
        return startingWebTasks > 0 || webTasks.size > 0 || [...clientVersions.values()].some(client => Object.keys(client.callbacks).length);
      }
      function settleWebTask(event) {
        const task = webTasks.get(event.taskId);
        if (task) { webTasks.delete(event.taskId); if (event.error) task.reject(new Error(event.error)); else task.resolve(event.value); }
        else if (startingWebTasks) earlyWebTasks.set(event.taskId, event);
      }
      async function webTask(name, args, ordered = false, submitted = () => {}) {
        usable(); startingWebTasks++; poll();
        try {
          await subscribeEvents();
          // Only submission occupies the UI command queue; user decisions do not hold a Bun RPC open.
          const task = await (ordered ? command(name, args) : directWebCommand(name, args)); submitted(); usable();
          return await new Promise((resolve, reject) => {
            webTasks.set(task.taskId, { resolve, reject });
            const early = earlyWebTasks.get(task.taskId);
            if (early) { earlyWebTasks.delete(task.taskId); settleWebTask(early); }
          });
        } finally { startingWebTasks--; if (!startingWebTasks) earlyWebTasks.clear(); }
      }
      // chooseFiles subscribes to View events before it submits, so an unscoped cancel waits for submissions in flight.
      const chooserSubmissions = new Set();
      function chooseFiles(options = {}) {
        let submitted;
        const submission = new Promise(resolve => { submitted = () => { chooserSubmissions.delete(submission); resolve(); }; });
        chooserSubmissions.add(submission);
        return webTask("chooseFiles", [options], false, submitted).finally(submitted);
      }
      async function webCallback(event) {
        const client = clientVersions.get(event.clientId);
        if (!client) return;
        const handler = client.callbacks[event.callback]; if (!handler) return;
        try {
          const result = await handler.call(output, Object.freeze(event.data));
          if (["shouldOverrideUrlLoading", "shouldInterceptRequest", "shouldOverrideKeyEvent", "onConsoleMessage", "onRenderProcessGone"].includes(event.callback) && result !== undefined) {
            throw new TypeError(event.callback + " is a notification; synchronous decisions use the client's native options");
          }
          if (event.requestId && !closed) await directWebCommand("replyWebRequest", [event.requestId, result === undefined ? null : result]);
        } catch (error) {
          if (event.requestId && !closed) await directWebCommand("replyWebRequest", [event.requestId, null]).catch(() => {});
          emit({ type: "webCallbackError", callback: event.callback, message: String(error && error.message || error) });
        }
      }
      const emit = event => {
        if (closed) return;
        if (event.type === "webCallback") { webCallback(event); return; }
        if (event.type === "webTaskResult") { settleWebTask(event); return; }
        if (event.type === "close") closed = true;
        for (const callback of [...listeners.get(event.type) || [], ...listeners.get("*") || []]) callback.call(output, Object.freeze(event));
        if (closed) {
          for (const task of webTasks.values()) task.reject(new Error("Native View handle is closed"));
          webTasks.clear(); earlyWebTasks.clear(); clientVersions.clear();
          for (const family of Object.keys(clients)) delete clients[family];
          listeners.clear(); nativeViews.delete(value.__autojs6ViewHandle);
        }
      };
      async function poll() {
        if (reading || closed) return; reading = true;
        try {
          await subscribeEvents();
          while (!closed && (hasWebInterest() || [...listeners.values()].some(list => list.length))) {
            for (const event of await nativeCall("viewEvents", subscription ? [value, subscription] : [value])) emit(event);
          }
        } catch (error) { emit({ type: "error", message: error.message }); emit({ type: "close" }); }
        finally {
          const previous = subscription; subscription = null; subscriptionReady = null; reading = false;
          if (previous) nativeCall("viewCommand", [value, "releaseViewEvents", [previous]]).catch(() => {});
          if (!closed && (hasWebInterest() || [...listeners.values()].some(list => list.length))) poll();
        }
      }
      function on(name, callback) {
        usable(); if (typeof callback !== "function") throw new TypeError("View event listener must be a function");
        listeners.set(name, [...listeners.get(name) || [], callback]); poll();
        return () => off(name, callback);
      }
      function off(name, callback) { listeners.set(name, (listeners.get(name) || []).filter(fn => fn !== callback && fn.listener !== callback)); }
      function once(name, callback) { const listener = event => { off(name, listener); callback.call(output, event); }; listener.listener = callback; return on(name, listener); }
      Object.defineProperties(output, {
        get: { value: read }, set: { value: patch => write(patch) }, flush: { value: flush },
        setWebViewClient: { value: (client, options) => configureWebClient("client", client, options) },
        setWebChromeClient: { value: (client, options) => configureWebClient("chrome", client, options) },
        setDownloadListener: { value: callback => configureWebClient("download", callback === null ? null : { onDownloadStart: callback }) },
        chooseFiles: { value: chooseFiles },
        cancelFileChooser: { value: async () => { await Promise.all(chooserSubmissions); await directWebCommand("cancelFileChooser", []); } },
        findView: { value: name => findView(value, name) },
        dispose: { value: async () => {
          if (closed) return;
          let failure; try { await flush(); } catch (error) { failure = error; }
          await nativeCall("disposeView", [value]); emit({ type: "close" });
          if (failure) throw failure;
        } },
        on: { value: on }, once: { value: once }, off: { value: off }
      });
      const commands = {
        loadUrl: url => command("loadUrl", [url]),
        loadHtml: (html, baseUrl = null) => command("loadHtml", [html, baseUrl]),
        evaluateJavascript,
        evaluateJavascriptAsync,
        stopMediaCapture: () => command("stopMediaCapture", []),
        enableDisplayCapture: options => command("enableDisplayCapture", [options]),
        disableDisplayCapture: id => command("disableDisplayCapture", [id === undefined ? null : id]),
        startBackgroundRecording: (options = {}) => webTask("startBackgroundRecording", [options], true),
        getBackgroundRecording: () => command("getBackgroundRecording", []),
        stopBackgroundRecording: () => webTask("stopBackgroundRecording", [], true),
        cancelBackgroundRecording: id => command("cancelBackgroundRecording", [id === undefined ? null : id]),
        goBack: () => command("goBack", []), goForward: () => command("goForward", []),
        reload: () => command("reload", []), stopLoading: () => command("stopLoading", []),
        openDrawer: (side = "start", animate = true) => command("openDrawer", [side, animate]),
        closeDrawer: (side = "start", animate = true) => command("closeDrawer", [side, animate]),
        setCurrentItem: (index, smoothScroll = true) => command("setCurrentItem", [index, smoothScroll]),
        showOverflowMenu: () => command("showOverflowMenu", []), hideOverflowMenu: () => command("hideOverflowMenu", []),
        exitFullscreen: () => command("exitFullscreen", []),
        download: options => command("download", [options]),
        getDownload: id => command("getDownload", [id]),
        cancelDownload: id => command("cancelDownload", [id]),
        readDownload: async (id, offset = 0, length = 32768) => {
          const result = await command("readDownload", [id, offset, length]);
          return Uint8Array.from(atob(result.base64), value => value.charCodeAt(0));
        },
        readDocument: async (uri, offset = 0, length = 32768) => {
          const result = await command("readDocument", [uri, offset, length]);
          return Uint8Array.from(atob(result.base64), value => value.charCodeAt(0));
        }
      };
      for (const [name, method] of Object.entries(commands)) Object.defineProperty(output, name, { value: method });
      for (const name of writableViewProperties) Object.defineProperty(output, name, {
        get: () => read(name), set: assigned => { write({ [name]: assigned }, true).catch(() => {}); }
      });
      for (const name of readonlyViewProperties) Object.defineProperty(output, name, { get: () => read(name) });
      Object.defineProperty(output, "xmlId", { get: () => read("id") });
      Object.freeze(output); nativeViews.set(value.__autojs6ViewHandle, output); return output;
    }
    async function inflate(layout, scope) {
      const args = [layout]; if (scope !== undefined) args.push(scope);
      return wrapView(await nativeCall("inflate", args));
    }
    function createView(type, props = {}, scope) { return inflate({ ...props, type: String(type).replace(/^android\.widget\./, "") }, scope); }
    async function findView(root, name) { return wrapView(await nativeCall("findView", [typeof root === "string" ? root : viewToken(root), name])); }

    let __autojs6_limited_ui_cache;
    const __autojs6_bridge_signal_from_options = options => options && options.signal;
    const __autojs6_bridge_error = (message, code, module, method) => Object.assign(new Error(message), { code, module, method });
  function __autojs6_ui_options(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function __autojs6_ui_timeout_from_options(options, fallbackMs) {
    return options && typeof options === "object" && options.timeoutMs !== undefined
      ? options.timeoutMs
      : fallbackMs;
  }
  function __autojs6_ui_bridge_options(options, fallbackMs) {
    return {
      timeoutMs: __autojs6_ui_timeout_from_options(options, fallbackMs),
      permissions: ["ui"],
      signal: __autojs6_bridge_signal_from_options(options)
    };
  }
  function __autojs6_ui_invalid_argument_error(methodName, message) {
    return __autojs6_bridge_error(
      message,
      "ERR_AUTOJS6_BRIDGE_INVALID_REQUEST",
      "ui",
      methodName
    );
  }
  function __autojs6_ui_closed_error(methodName) {
    return __autojs6_bridge_error(
      "AutoJs6 ui." + methodName + " requires an active UI handle.",
      "ERR_AUTOJS6_BRIDGE_INVALID_REQUEST",
      "ui",
      methodName
    );
  }
  function __autojs6_ui_validate_json(value, methodName, path, depth, seen, arrayLimit = 128) {
    if (depth > 16) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor is too deep at " + path + ".");
    }
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor contains a non-finite number at " + path + ".");
      }
      return value;
    }
    if (!value || typeof value !== "object") {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must be JSON-only at " + path + ".");
    }
    if (seen.indexOf(value) >= 0) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must not contain cycles.");
    }
    seen.push(value);
    if (Array.isArray(value)) {
      if (value.length > arrayLimit) {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor array is too large at " + path + ".");
      }
      const arrayResult = value.map(function(entry, index) {
        return __autojs6_ui_validate_json(entry, methodName, path + "[" + index + "]", depth + 1, seen, arrayLimit);
      });
      seen.pop();
      return arrayResult;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must use plain JSON objects at " + path + ".");
    }
    const keys = Object.keys(value);
    if (keys.length > 64) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor object is too large at " + path + ".");
    }
    const objectResult = Object.create(null);
    keys.forEach(function(key) {
      const entry = value[key];
      if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must be JSON-only at " + path + "." + key + ".");
      }
      objectResult[key] = __autojs6_ui_validate_json(entry, methodName, path + "." + key, depth + 1, seen, arrayLimit);
    });
    seen.pop();
    return objectResult;
  }
  function __autojs6_ui_descriptor(value, methodName) {
    const descriptor = __autojs6_ui_validate_json(value, methodName, "layout", 0, []);
    const text = JSON.stringify(descriptor);
    if (!text || text.length > 32768) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor exceeds 32768 characters.");
    }
    if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
      throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " requires a JSON object descriptor.");
    }
    return descriptor;
  }
  const __autojs6_ui_state_type = "autojs6.ui.state";
  const __autojs6_ui_binding_type = "autojs6.ui.binding";
  const __autojs6_ui_bindable_properties = Object.freeze({
    text: true,
    value: true,
    checked: true,
    enabled: true,
    progress: true,
    max: true,
    hint: true,
    contentDescription: true,
    selectedIndex: true
  });
  function __autojs6_ui_json_clone(value, methodName, path) {
    return __autojs6_ui_validate_json(value, methodName, path || "value", 0, []);
  }
  function __autojs6_ui_is_state(value) {
    return !!(value && typeof value === "object" && value.__autojs6UiState === __autojs6_ui_state_type);
  }
  function __autojs6_ui_is_binding(value) {
    return !!(value && typeof value === "object" && value.__autojs6UiBinding === __autojs6_ui_binding_type);
  }
  function __autojs6_ui_state(initialValue) {
    const initial = initialValue === undefined ? {} : __autojs6_ui_json_clone(initialValue, "state", "state");
    if (!initial || typeof initial !== "object" || Array.isArray(initial)) {
      throw __autojs6_ui_invalid_argument_error("state", "ui.state requires a JSON object initial value.");
    }
    const values = JSON.parse(JSON.stringify(initial));
    const listeners = [];
    let api = null;
    function cloneSnapshot() {
      return Object.freeze(JSON.parse(JSON.stringify(values)));
    }
    function notify(keys) {
      const event = Object.freeze({
        keys: Object.freeze(keys.slice()),
        snapshot: cloneSnapshot()
      });
      listeners.slice().forEach(function(listener) {
        listener(event);
      });
    }
    api = {
      get(key) {
        const name = key === undefined || key === null ? "" : String(key);
        if (!Object.prototype.hasOwnProperty.call(values, name)) {
          return undefined;
        }
        return __autojs6_ui_json_clone(values[name], "state", "state." + name);
      },
      set(key, value) {
        const name = key === undefined || key === null ? "" : String(key).trim();
        if (!name) {
          throw __autojs6_ui_invalid_argument_error("state", "ui.state.set requires a non-empty key.");
        }
        values[name] = __autojs6_ui_json_clone(value, "state", "state." + name);
        notify([name]);
        return api;
      },
      update(nextValues) {
        const descriptor = __autojs6_ui_json_clone(nextValues, "state", "state");
        if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
          throw __autojs6_ui_invalid_argument_error("state", "ui.state.update requires a JSON object.");
        }
        const keys = Object.keys(descriptor);
        keys.forEach(function(key) {
          values[key] = descriptor[key];
        });
        if (keys.length > 0) {
          notify(keys);
        }
        return api;
      },
      snapshot: cloneSnapshot,
      subscribe(callback) {
        if (typeof callback !== "function") {
          throw __autojs6_ui_invalid_argument_error("state", "ui.state.subscribe requires a callback.");
        }
        listeners.push(callback);
        return function unsubscribe() {
          const index = listeners.indexOf(callback);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        };
      }
    };
    Object.defineProperty(api, "__autojs6UiState", {
      value: __autojs6_ui_state_type
    });
    return Object.freeze(api);
  }
  function __autojs6_ui_bind(state, key) {
    if (!__autojs6_ui_is_state(state)) {
      throw __autojs6_ui_invalid_argument_error("bind", "ui.bind requires a ui.state object.");
    }
    const name = key === undefined || key === null ? "" : String(key).trim();
    if (!name) {
      throw __autojs6_ui_invalid_argument_error("bind", "ui.bind requires a non-empty state key.");
    }
    return Object.freeze({
      __autojs6UiBinding: __autojs6_ui_binding_type,
      state,
      key: name
    });
  }
  function __autojs6_ui_prepare_descriptor(value, methodName) {
    const bindings = [];
    function walk(entry, path, componentId, propertyName, depth, seen) {
      if (__autojs6_ui_is_binding(entry)) {
        if (!componentId || !propertyName || !__autojs6_ui_bindable_properties[propertyName]) {
          throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " binding at " + path + " requires a component id and bindable property.");
        }
        bindings.push({
          state: entry.state,
          key: entry.key,
          id: componentId,
          property: propertyName
        });
        return entry.state.get(entry.key);
      }
      if (entry === null || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
        return entry;
      }
      if (!entry || typeof entry !== "object") {
        return entry;
      }
      if (seen.indexOf(entry) >= 0) {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must not contain cycles.");
      }
      if (depth > 16) {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor is too deep at " + path + ".");
      }
      seen.push(entry);
      if (Array.isArray(entry)) {
        const arrayResult = entry.map(function(child, index) {
          return walk(child, path + "[" + index + "]", componentId, propertyName, depth + 1, seen);
        });
        seen.pop();
        return arrayResult;
      }
      const prototype = Object.getPrototypeOf(entry);
      if (prototype !== Object.prototype && prototype !== null) {
        throw __autojs6_ui_invalid_argument_error(methodName, "ui." + methodName + " descriptor must use plain JSON objects at " + path + ".");
      }
      const currentId = entry.id === undefined || entry.id === null ? componentId : String(entry.id);
      const objectResult = Object.create(null);
      Object.keys(entry).forEach(function(key) {
        objectResult[key] = walk(entry[key], path + "." + key, currentId, key, depth + 1, seen);
      });
      seen.pop();
      return objectResult;
    }
    return {
      descriptor: walk(value, "layout", "", "", 0, []),
      bindings
    };
  }
  function __autojs6_ui_handle_id(value) {
    if (typeof value === "string") {
      return value.trim();
    }
    if (value && typeof value === "object") {
      return String(value.id || value.handleId || value.__autojs6UiHandle || "").trim();
    }
    return "";
  }
  function __autojs6_ui_handle(result, moduleOptions, bindings) {
    const id = __autojs6_ui_handle_id(result);
    if (!id) {
      throw __autojs6_ui_invalid_argument_error("showLayout", "ui.showLayout provider returned an invalid UI handle.");
    }
    const listeners = Object.create(null);
    let closed = false;
    const stopEvents = __autojs6_bridge_attach_events(result, dispatchEvent, false);
    let terminalEventDispatching = false;
    let drainTimer = null;
    let draining = false;
    let drainGeneration = 0;
    let pendingBindingPatches = [];
    let bindingFlushScheduled = false;
    const bindingUnsubscribers = [];
    const defaultDrainIntervalMs = Math.max(10, Math.min(1000, Number(moduleOptions.drainIntervalMs) || 50));
    function listenerCount() {
      return Object.keys(listeners).reduce(function(total, key) {
        return total + listeners[key].length;
      }, 0);
    }
    function stopDrainIfIdle() {
      if (stopEvents) stopEvents.ref(listenerCount() > 0);
      if (listenerCount() === 0 && drainTimer !== null) {
        clearInterval(drainTimer);
        drainTimer = null;
      }
    }
    function terminate() {
      if (closed) {
        return false;
      }
      closed = true;
      if (stopEvents) stopEvents();
      terminalEventDispatching = false;
      drainGeneration += 1;
      draining = false;
      if (drainTimer !== null) {
        clearInterval(drainTimer);
        drainTimer = null;
      }
      bindingUnsubscribers.splice(0).forEach(function(unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          setTimeout(function() { throw error; }, 0);
        }
      });
      bindingFlushScheduled = false;
      pendingBindingPatches = [];
      Object.keys(listeners).forEach(function(eventName) {
        delete listeners[eventName];
      });
      return true;
    }
    function dispatchEvent(event) {
      if (closed || !event || typeof event !== "object") {
        return false;
      }
      const type = event.type === undefined || event.type === null ? "" : String(event.type);
      const terminal = type === "close";
      if (terminal) {
        terminalEventDispatching = true;
      }
      const targets = []
        .concat(listeners[type] || [])
        .concat(listeners["*"] || []);
      targets.forEach(function(callback) {
        try {
          callback(Object.freeze(Object.assign({}, event, { handleId: id })));
        } catch (error) {
          setTimeout(function() { throw error; }, 0);
        }
      });
      if (terminal) {
        terminate();
      }
      return terminal;
    }
    function drain(options) {
      if (closed || terminalEventDispatching || draining || listenerCount() === 0) {
        return;
      }
      draining = true;
      const generation = drainGeneration;
      const bridgeOptions = __autojs6_ui_options(options || moduleOptions);
      __autojs6_call_autojs(
        "ui",
        "drainEvents",
        [id, { maxEvents: 16 }],
        __autojs6_ui_bridge_options(bridgeOptions, 5000)
      ).then(function(events) {
        if (closed || generation !== drainGeneration) {
          return;
        }
        if (Array.isArray(events)) {
          for (const event of events) {
            if (dispatchEvent(event)) {
              break;
            }
          }
        }
      }, function() {
        return undefined;
      }).finally(function() {
        if (generation === drainGeneration) {
          draining = false;
        }
      });
    }
    function ensureDrain(options) {
      if (stopEvents) { stopEvents.ref(listenerCount() > 0); return; }
      if (closed || terminalEventDispatching || drainTimer !== null || listenerCount() === 0) {
        return;
      }
      const intervalMs = Math.max(10, Math.min(1000, Number((options && options.drainIntervalMs) || moduleOptions.drainIntervalMs) || defaultDrainIntervalMs));
      drainTimer = setInterval(function() { drain(options); }, intervalMs);
      drain(options);
    }
    function on(eventName, callback, options) {
      if (closed || terminalEventDispatching) {
        throw __autojs6_ui_closed_error("on");
      }
      const event = eventName === undefined || eventName === null ? "" : String(eventName).trim();
      if (!event || typeof callback !== "function") {
        throw __autojs6_ui_invalid_argument_error("on", "ui.handle.on requires an event name and callback.");
      }
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      ensureDrain(options);
      return function unsubscribe() {
        const bucket = listeners[event] || [];
        const index = bucket.indexOf(callback);
        if (index >= 0) {
          bucket.splice(index, 1);
        }
        stopDrainIfIdle();
      };
    }
    function once(event, callback, options) {
      const wrapped = value => { off(event, wrapped); callback(value); };
      wrapped.listener = callback;
      return on(event, wrapped, options);
    }
    function off(event, callback) {
      const bucket = listeners[event] || [];
      listeners[event] = bucket.filter(listener => listener !== callback && listener.listener !== callback);
      stopDrainIfIdle();
    }
    function update(patch, options) {
      if (closed || terminalEventDispatching) {
        return Promise.reject(__autojs6_ui_closed_error("update"));
      }
      let descriptor;
      try {
        descriptor = __autojs6_ui_descriptor(patch, "update");
      } catch (error) {
        return Promise.reject(error);
      }
      const bridgeOptions = __autojs6_ui_options(options || moduleOptions);
      return __autojs6_call_autojs(
        "ui",
        "update",
        [id, descriptor],
        __autojs6_ui_bridge_options(bridgeOptions, 10000)
      ).then(function() {
        return undefined;
      });
    }
    function batchUpdate(patches, options) {
      if (closed || terminalEventDispatching) {
        return Promise.reject(__autojs6_ui_closed_error("batchUpdate"));
      }
      if (!Array.isArray(patches)) {
        return Promise.reject(__autojs6_ui_invalid_argument_error("batchUpdate", "ui.handle.batchUpdate requires an array of patches."));
      }
      if (patches.length === 0) {
        return Promise.resolve(undefined);
      }
      if (patches.length > 64) {
        return Promise.reject(__autojs6_ui_invalid_argument_error("batchUpdate", "ui.handle.batchUpdate patch array exceeds 64 entries."));
      }
      let descriptors;
      try {
        descriptors = patches.map(function(patch) {
          return __autojs6_ui_descriptor(patch, "batchUpdate");
        });
      } catch (error) {
        return Promise.reject(error);
      }
      const bridgeOptions = __autojs6_ui_options(options || moduleOptions);
      return __autojs6_call_autojs(
        "ui",
        "batchUpdate",
        [id, descriptors],
        __autojs6_ui_bridge_options(bridgeOptions, 10000)
      ).then(function() {
        return undefined;
      });
    }
    function flushBindingPatches() {
      bindingFlushScheduled = false;
      if (closed || terminalEventDispatching || pendingBindingPatches.length === 0) {
        pendingBindingPatches = [];
        return;
      }
      const patches = pendingBindingPatches.slice();
      pendingBindingPatches = [];
      batchUpdate(patches, moduleOptions).catch(function() {
        return undefined;
      });
    }
    function enqueueBindingPatch(patch) {
      if (closed || terminalEventDispatching) {
        return;
      }
      pendingBindingPatches.push(patch);
      if (!bindingFlushScheduled) {
        bindingFlushScheduled = true;
        Promise.resolve().then(flushBindingPatches);
      }
    }
    (Array.isArray(bindings) ? bindings : []).forEach(function(binding) {
      const off = binding.state.subscribe(function(event) {
        if (!event || !Array.isArray(event.keys) || event.keys.indexOf(binding.key) < 0) {
          return;
        }
        const patch = Object.create(null);
        patch.id = binding.id;
        patch[binding.property] = binding.state.get(binding.key);
        enqueueBindingPatch(patch);
      });
      bindingUnsubscribers.push(off);
    });
    function close(options) {
      if (closed || terminalEventDispatching) {
        return Promise.resolve(undefined);
      }
      const bridgeOptions = __autojs6_ui_options(options || moduleOptions);
      terminate();
      return __autojs6_call_autojs(
        "ui",
        "close",
        [id],
        __autojs6_ui_bridge_options(bridgeOptions, 10000)
      ).then(function() {
        return undefined;
      });
    }
    return Object.freeze({
      id,
      ...(result.rootView ? { rootView: wrapView(result.rootView), findView: name => findView(id, name) } : {}),
      get closed() { return closed; },
      subscriptionId: result.subscriptionId,
      on,
      once,
      off,
      update,
      batchUpdate,
      close
    });
  }
  function __autojs6_limited_ui() {
    if (__autojs6_limited_ui_cache) {
      return __autojs6_limited_ui_cache;
    }
    function showLayout(layoutJson, options) {
      let prepared;
      let descriptor;
      try {
        if (typeof layoutJson === "string" || layoutJson && layoutJson.__autojs6ViewHandle) {
          prepared = { bindings: [] }; descriptor = layoutJson;
        } else {
          prepared = __autojs6_ui_prepare_descriptor(layoutJson, "showLayout");
          descriptor = __autojs6_ui_descriptor(prepared.descriptor, "showLayout");
        }
      } catch (error) {
        return Promise.reject(error);
      }
      const bridgeOptions = __autojs6_ui_options(options);
      return __autojs6_call_autojs(
        "ui",
        "showLayout",
        [descriptor],
        __autojs6_ui_bridge_options(bridgeOptions, 10000)
      ).then(function(result) {
        return __autojs6_ui_handle(result, bridgeOptions, prepared.bindings);
      });
    }
    __autojs6_limited_ui_cache = Object.freeze({
      showLayout, inflate, createView, context, view: wrapView, findView,
      state: __autojs6_ui_state,
      bind: __autojs6_ui_bind
    });
    return __autojs6_limited_ui_cache;
  }
    return __autojs6_limited_ui();
  }
  function __autojs6_create_compose(call) {
    const transport = call;
    call = async (module, method, args, options) => transport(module, method, JSON.parse(JSON.stringify(args, (_key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("Compose arguments must contain finite numbers");
      if (["function", "symbol", "bigint"].includes(typeof value)) throw new TypeError("Compose arguments must be JSON values");
      return value;
    })), options);
    const names = ["AndroidView", "AlertDialog", "Box", "Button", "Card", "Checkbox", "CircularProgressIndicator", "Column", "ElevatedButton", "FilledTonalButton", "HorizontalDivider", "Icon", "IconButton", "Image", "LazyColumn", "LazyRow", "LinearProgressIndicator", "OutlinedButton", "OutlinedTextField", "RadioButton", "Row", "Scaffold", "Slider", "Spacer", "Surface", "Switch", "Text", "TextButton", "TextField", "TopAppBar", "AssistChip", "Badge", "DatePicker", "DropdownMenu", "DropdownMenuItem", "FilterChip", "FloatingActionButton", "HorizontalPager", "InputChip", "LazyVerticalGrid", "ModalBottomSheet", "NavigationBar", "NavigationBarItem", "NavigationDrawer", "NavigationDrawerItem", "NavigationRail", "NavigationRailItem", "PullToRefresh", "SearchBar", "SegmentedButton", "SegmentedButtonItem", "Tab", "TabRow", "TimePicker", "Tooltip"];
    const modifierNames = ["padding", "size", "width", "height", "fillMaxWidth", "fillMaxHeight", "fillMaxSize", "weight", "align", "background", "border", "clip", "alpha", "clickable", "verticalScroll", "horizontalScroll", "offset", "aspectRatio", "testTag", "semantics"];
    const nodeTag = Symbol("compose.node"), modifierTag = Symbol("compose.modifier");
    const open = new Set();
    let nextNode = 1, nextCallback = 1, active = null, batchDepth = 0, revision = 0, defaultTheme;
    const dirty = new Set();
    const error = message => Object.assign(new Error(message), { code: "ERR_AUTOJS6_COMPOSE_INVALID_ARGUMENT" });
    const notify = session => { if (!session.closed) { dirty.add(session); if (!batchDepth) queueMicrotask(flushDirty); } };
    function flushDirty() { if (batchDepth) return; for (const session of dirty) { dirty.delete(session); session.schedule(); } }
    function children(values) {
      return values.flat(Infinity).filter(value => value !== null && value !== undefined && value !== false).map(value => {
        if (typeof value === "string") return createElement("Text", { text: value });
        if (!value || !value[nodeTag]) throw error("Compose children must be nodes or text");
        return value;
      });
    }
    function createElement(type, props, ...args) {
      if (!names.includes(type)) throw error("Unsupported Compose component: " + type);
      if (props && props[nodeTag] || typeof props === "string" || Array.isArray(props)) { args.unshift(props); props = {}; }
      props = { ...(props || {}) };
      const state = { nodeId: nextNode++, type, props, children: children(args.length ? args : [props.children]), owners: new Set(), listeners: new Map(), editSeq: 0 };
      delete props.children;
      const change = () => { revision++; for (const owner of state.owners) notify(owner); return node; };
      const command = async (type, value = {}) => {
        if (state.owners.size !== 1) throw error("A command requires one active Compose owner");
        const session = [...state.owners][0]; await session.flush();
        await call("compose", "command", [session.id, { nodeId: state.nodeId, type, ...value }]);
      };
      const node = {
        [nodeTag]: state,
        set(value) { Object.assign(props, value); return change(); },
        get(name) { return props[name]; },
        append(value) { state.children.push(...children([value])); return change(); },
        insert(index, value) { if (!Number.isInteger(index) || index < 0 || index > state.children.length) throw error("Invalid child index"); state.children.splice(index, 0, ...children([value])); return change(); },
        remove(value) { const index = typeof value === "number" ? value : state.children.indexOf(value); if (index < 0 || index >= state.children.length) throw error("Child not found"); state.children.splice(index, 1); return change(); },
        replace(value) { state.children = children([value]); return change(); },
        clear() { state.children = []; return change(); },
        slot(name, child) { props.slots = { ...props.slots, [name]: child }; return change(); },
        on(name, callback) { if (typeof callback !== "function") throw error("Callback must be a function"); const event = name.replace(/^on([A-Z])/, (_, c) => c.toLowerCase()); state.listeners.set(event, [...state.listeners.get(event) || [], callback]); return change(); },
        off(name, callback) { const event = name.replace(/^on([A-Z])/, (_, c) => c.toLowerCase()); state.listeners.set(event, callback ? (state.listeners.get(event) || []).filter(fn => fn !== callback) : []); return change(); },
        focus: () => command("focus"), blur: () => command("blur"),
        scrollTo: target => command("scrollTo", typeof target === "number" ? { index: target } : target),
        edit: value => command("edit", { ...value, editSeq: state.editSeq }),
        toString: () => "[Compose " + type + "]"
      };
      return Object.freeze(node);
    }
    function modifier(operations = []) {
      const result = { [modifierTag]: operations };
      for (const name of modifierNames) result[name] = (...args) => {
        if (operations.length >= 64) throw error("Too many modifier operations");
        return modifier([...operations, { name, args }]);
      };
      return Object.freeze(result);
    }
    function state(initial) {
      let value = initial; const readers = new Set();
      const source = { readers, version: 0 };
      return Object.freeze(Object.defineProperties({}, {
        value: { enumerable: true, get() { if (active) { readers.add(active); active.dependencies.add(source); for (const collector of active.readCollectors) collector.add(source); } return value; },
          set(next) { if (Object.is(value, next)) return; value = next; source.version++; revision++; for (const reader of readers) notify(reader); } }
      }));
    }
    function batch(fn) { if (typeof fn !== "function") throw error("batch requires a callback"); batchDepth++; try { return fn(); } finally { if (!--batchDepth) flushDirty(); } }
    function memo(build, deps, options = {}) {
      if (!active || !Array.isArray(deps) || deps.length > 256) throw error("memo requires an active render and at most 256 dependencies");
      const parent = active.memoPath;
      const index = active.memoIndices.get(parent) || 0; active.memoIndices.set(parent, index + 1);
      const key = parent + "/" + (options.key === undefined ? "index:" + index : "key:" + JSON.stringify(options.key));
      if (active.memoSeen.has(key) || active.memoSeen.size >= 5000) throw error("Duplicate or excessive memo keys");
      active.memoSeen.add(key);
      const old = active.memo.get(key);
      if (old && old.reads.every(([source, version]) => source.version === version) && deps.length === old.deps.length && deps.every((v, i) => Object.is(v, old.deps[i]))) {
        for (const [source] of old.reads) { source.readers.add(active); active.dependencies.add(source); for (const collector of active.readCollectors) collector.add(source); }
        return old.node;
      }
      const reads = new Set(); active.readCollectors.push(reads); active.memoPath = key;
      try { const node = build(); active.memo.set(key, { deps: deps.slice(), node, reads: [...reads].map(source => [source, source.version]) }); return node; }
      finally { active.readCollectors.pop(); active.memoPath = parent; }
    }
    function post(fn, delay = 0) {
      if (typeof fn !== "function" || !Number.isInteger(delay) || delay < 0 || delay > 2147483647) throw error("post requires a callback and a valid delay");
      return setTimeout(fn, delay);
    }
    async function mount(root, options = {}, mode = "mount", container) {
      if (active) throw error("Cannot mount while rendering");
      const session = { id: null, closed: false, root: null, dependencies: new Set(), nodes: new Set(), refs: new Set(), memo: new Map(), memoPath: "root", memoIndices: new Map(), memoSeen: new Set(), readCollectors: [],
        callbacks: new Map(), commands: new Map(), frames: new Map(), pendingEvents: [], generation: 0, listeners: new Map(), timers: new Set(), chain: Promise.resolve(), scheduled: false };
      function detach() {
        for (const dependency of session.dependencies) dependency.readers.delete(session);
        session.dependencies.clear();
        for (const node of session.nodes) node[nodeTag].owners.delete(session);
        session.nodes.clear(); for (const ref of session.refs) ref.current = null; session.refs.clear();
      }
      function finish() { if (session.closed) return; session.closed = true; open.delete(handle); dirty.delete(session); detach(); session.callbacks.clear(); session.commands.clear(); session.frames.clear(); session.pendingEvents=[]; session.memo.clear(); for (const timer of session.timers) clearTimeout(timer); session.timers.clear(); }
      function event(value) {
        if (session.closed) return;
        if (session.commands.has(value.callbackId)) {
          const callback = session.commands.get(value.callbackId); session.commands.delete(value.callbackId); callback(value); return;
        }
        if (value.generation > session.generation) { session.pendingEvents.push(value); return; }
        if (value.type === "frame") {
          for (const generation of session.frames.keys()) if (generation < value.generation) session.frames.delete(generation);
          return;
        }
        const callback = (session.frames.get(value.generation) || session.callbacks).get(value.callbackId);
        if (callback) { if (value.editSeq !== undefined) callback.node[nodeTag].editSeq = value.editSeq; callback.fn.call(callback.node, value); }
        for (const listener of [...session.listeners.get(value.type) || [], ...session.listeners.get("*") || []]) listener(value);
        if (value.type === "close") finish();
      }
      async function serialize() {
        for (const dependency of session.dependencies) dependency.readers.delete(session);
        session.dependencies.clear(); session.memoIndices.clear(); session.memoSeen.clear();
        let value;
        active = session; try { value = typeof root === "function" ? root() : root; } finally { active = null; }
        const callbacks = new Map(), nodes = new Set(), refs = new Map(), factories = [];
        function token(node, fn) { if (nextCallback >= 2147483647) throw error("Compose callback limit reached"); const id = nextCallback++; callbacks.set(id, { node, fn }); return id; }
        function walk(node, depth = 0) {
          if (!node || !node[nodeTag] || nodes.has(node) || depth > 64 || nodes.size >= 5000) throw error("Invalid, repeated or excessive Compose tree");
          nodes.add(node); const data = node[nodeTag];
          if ([...data.owners].some(owner => owner !== session)) throw error("Compose node belongs to another session");
          const props = {}, slots = {}, events = {};
          for (const [name, value] of Object.entries(data.props)) {
            if (name === "ref") { if (!value || typeof value !== "object") throw error("Invalid Compose ref"); refs.set(value, node); }
            else if (name === "slots") { for (const [key, child] of Object.entries(value || {})) { const list = children([child]); if (list.length > 1) throw error("A slot requires a single root"); if (list.length) slots[key] = walk(list[0], depth + 1); } }
            else if (data.type === "AndroidView" && name === "view" && typeof value === "function") {
              if (data.viewFactory !== value) { data.viewFactory = value; data.resolvedView = undefined; }
              factories.push((async () => {
                if (!data.resolvedView) {
                  const token = await call("ui", "context", []);
                  const scope = Object.freeze({ ...token, inflate: layout => call("ui", "inflate", [layout, token]),
                    createView: (type, props = {}) => call("ui", "inflate", [{ ...props, type: String(type).replace(/^android\.widget\./, "") }, token]) });
                  data.resolvedView = Promise.resolve(value(scope));
                }
                props.view = await data.resolvedView;
              })());
            }
            else if (name === "modifier" || name === "key") continue;
            else if (/^on[A-Z]/.test(name)) { if (typeof value !== "function") throw error("Event callback must be a function"); events[name] = token(node, value); }
            else if (value && value[nodeTag]) slots[name] = walk(value, depth + 1);
            else props[name] = value;
          }
          for (const [name, list] of data.listeners) if (list.length) {
            const key = "on" + name[0].toUpperCase() + name.slice(1), prior = data.props[key];
            delete events[key]; events[name] = token(node, function(e) { if (prior) prior.call(node, e); for (const fn of list) fn.call(node, e); });
          }
          const operations = data.props.modifier ? data.props.modifier[modifierTag] : [];
          if (!operations) throw error("Invalid modifier chain");
          return { nodeId: data.nodeId, type: data.type, ...(data.props.key === undefined ? {} : { key: String(data.props.key) }), props, slots, callbacks: events,
            modifier: operations.map(op => ({ name: op.name, args: op.args.map(value => typeof value === "function" ? token(node, value) : value) })),
            children: data.children.map(child => walk(child, depth + 1)) };
        }
        const descriptor = walk(value);
        await Promise.all(factories);
        for (const key of session.memo.keys()) if (!session.memoSeen.has(key)) session.memo.delete(key);
        return { descriptor, accept(generation) { for (const node of session.nodes) node[nodeTag].owners.delete(session); for (const ref of session.refs) ref.current = null;
          session.nodes = nodes; for (const node of nodes) node[nodeTag].owners.add(session);
          session.refs = new Set(refs.keys()); for (const [ref, node] of refs) ref.current = node;
          session.root = value; session.callbacks = callbacks;
          session.generation = generation === undefined ? session.generation + 1 : generation;
          session.frames.set(session.generation, callbacks);
          const pending = session.pendingEvents; session.pendingEvents = []; for (const value of pending) event(value); } };
      }
      session.schedule = () => {
        if (session.closed || session.scheduled) return;
        if (!session.id) { session.needsRender = true; return; }
        session.scheduled = true;
        session.chain = session.chain.catch(() => {}).then(async () => {
          session.scheduled = false; if (session.closed) return;
          const frame = await serialize(); const result = await call("compose", "render", [session.id, frame.descriptor]); if (!session.closed) frame.accept(result && result.generation);
        });
        session.chain.catch(failure => { event({ type: "error", message: failure.message }); });
      };
      session.flush = async () => { flushDirty(); await session.chain; };
      const handle = Object.freeze({
        get id() { return session.id; }, get root() { return session.root; }, get session() { return handle; }, isClosed: () => session.closed,
        update(fn) { if (session.closed) throw error("Compose session is closed"); const value = batch(fn); notify(session); return value; },
        flush: session.flush,
        render(value) { if (session.closed) return Promise.reject(error("Compose session is closed")); root = value; notify(session); return session.flush(); },
        setTheme: value => call("compose", "setTheme", [session.id, value]),
        async showSnackbar(message, options = {}) {
          if (session.closed) throw error("Compose session is closed");
          const callbackId = nextCallback++;
          session.commands.set(callbackId, value => { const fn = value.type === "action" ? options.onAction : options.onDismiss; if (fn) fn.call(handle); });
          try { await call("compose", "command", [session.id, { type: "snackbar", message, callbackId,
            ...(options.actionLabel === undefined ? {} : { actionLabel: options.actionLabel }), duration: options.duration || "short" }]); }
          catch (failure) { session.commands.delete(callbackId); throw failure; }
        },
        ...(mode === "floaty" ? {
          setPosition: async (x, y) => { await call("compose", "window", [session.id, { x, y }]); },
          setSize: async (width, height) => { await call("compose", "window", [session.id, { width, height }]); },
          requestFocus: async () => { await call("compose", "window", [session.id, { focusable: true }]); },
          disableFocus: async () => { await call("compose", "window", [session.id, { focusable: false }]); },
          setTouchable: async touchable => { await call("compose", "window", [session.id, { touchable }]); },
          getX: async () => (await call("compose", "window", [session.id, {}])).x,
          getY: async () => (await call("compose", "window", [session.id, {}])).y,
          getWidth: async () => (await call("compose", "window", [session.id, {}])).width,
          getHeight: async () => (await call("compose", "window", [session.id, {}])).height,
        } : {}),
        post(fn, delay) { const timer = post(() => { session.timers.delete(timer); if (!session.closed) fn(); }, delay); session.timers.add(timer); },
        on(name, fn) { if (typeof fn !== "function") throw error("Listener must be a function"); session.listeners.set(name, [...session.listeners.get(name) || [], fn]); return handle; },
        off(name, fn) { session.listeners.set(name, (session.listeners.get(name) || []).filter(value => value !== fn)); return handle; },
        async close() { if (session.closed) return; await call("compose", "close", [session.id]); event({ type: "close" }); }
      });
      try {
        const frame = await serialize();
        const arguments_ = [frame.descriptor, { ...(defaultTheme ? { theme: defaultTheme } : {}), ...options }];
        if (mode === "attach") arguments_.unshift(container);
        const result = await call("compose", mode, arguments_);
        session.id = result.id; frame.accept(result.generation); open.add(handle);
        if (session.needsRender) session.schedule();
        let shown = false;
        const deadline = Date.now() + 10000;
        while (!shown && !session.closed) {
          const events = await call("compose", "drainEvents", [session.id]);
          for (const value of events) { if (value.type === "error") throw error(value.message); if (value.type === "shown") shown = true; event(value); }
          if (Date.now() >= deadline) throw error("Compose window did not become visible");
        }
        if (!shown || session.closed) throw error("Compose window closed before becoming visible");
        (async () => { while (!session.closed) { const values = await call("compose", "drainEvents", [session.id]); for (const value of values) event(value); } })()
          .catch(failure => { if (!session.closed) { event({ type: "error", message: failure.message }); call("compose", "close", [session.id]).catch(() => {}); finish(); } });
        return handle;
      } catch (failure) { if (session.id) await call("compose", "close", [session.id]).catch(() => {}); finish(); throw failure; }
    }
    const api = (root, options) => mount(root, options);
    Object.assign(api, { createElement, modifier, state, ref: () => ({ current: null }), batch, memo, post,
      mount, attach: (container, root, options) => mount(root, options, "attach", container), dialog: (root, options) => mount(root, options, "dialog"), floaty: (root, options) => mount(root, options, "floaty"),
      isAvailable: () => call("compose", "isAvailable", []), version: () => call("compose", "version", []),
      theme(value) { if (arguments.length) defaultTheme = value; return defaultTheme; }
    });
    for (const type of names) api[type] = (...args) => createElement(type, ...args);
    Object.defineProperty(api, "sessions", { enumerable: true, get: () => Object.freeze([...open]) });
    return Object.freeze(api);
  }

// BEGIN GENERATED AUTOMATION
// Reproduced from Node's public adapters by tools/host-client/sync-automation.mjs.
function createAutomation(dispatch, hostInfo) {
  let __autojs6_limited_app_cache, __autojs6_limited_clipboard_cache, __autojs6_limited_accessibility_cache;
  const __autojs6_call_autojs = dispatch;
  const __autojs6_bridge_signal_from_options = options => options && options.signal;
  const __autojs6_host_app_info = () => hostInfo || {};
  const __autojs6_bridge_error = (message, code, module, method) => Object.assign(new HostCallError(
    message.includes('not available') ? 'NOT_SUPPORTED' : 'INVALID_REQUEST', message, module + '.control'), { method });
  function __autojs6_clipboard_options(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function __autojs6_clipboard_timeout_from_options(options, fallbackMs) {
    return options && typeof options === "object" && options.timeoutMs !== undefined
      ? options.timeoutMs
      : fallbackMs;
  }
  function __autojs6_clipboard_bridge_options(options, fallbackMs) {
    return {
      timeoutMs: __autojs6_clipboard_timeout_from_options(options, fallbackMs),
      permissions: ["clipboard"],
      signal: __autojs6_bridge_signal_from_options(options)
    };
  }
  function __autojs6_limited_clipboard() {
    if (__autojs6_limited_clipboard_cache) {
      return __autojs6_limited_clipboard_cache;
    }
    function getText(options) {
      const bridgeOptions = __autojs6_clipboard_options(options);
      return __autojs6_call_autojs(
        "clipboard",
        "getText",
        [],
        __autojs6_clipboard_bridge_options(bridgeOptions, 5000)
      ).then(function(result) {
        return result === undefined || result === null ? "" : String(result);
      });
    }
    function setText(text, options) {
      const bridgeOptions = __autojs6_clipboard_options(options);
      const value = text === undefined || text === null ? "" : String(text);
      return __autojs6_call_autojs(
        "clipboard",
        "setText",
        [value],
        __autojs6_clipboard_bridge_options(bridgeOptions, 5000)
      ).then(function() {
        return undefined;
      });
    }
    function hasText(options) {
      const bridgeOptions = __autojs6_clipboard_options(options);
      return __autojs6_call_autojs(
        "clipboard",
        "hasText",
        [],
        __autojs6_clipboard_bridge_options(bridgeOptions, 5000)
      ).then(function(result) {
        return result === true;
      });
    }
    __autojs6_limited_clipboard_cache = Object.freeze({
      getText,
      setText,
      hasText
    });
    return __autojs6_limited_clipboard_cache;
  }

  function __autojs6_app_timeout_from_options(options, fallbackMs) {
    return options && typeof options === "object" && options.timeoutMs !== undefined
      ? options.timeoutMs
      : fallbackMs;
  }
  function __autojs6_app_bridge_options(options, fallbackMs) {
    return {
      timeoutMs: __autojs6_app_timeout_from_options(options, fallbackMs),
      signal: __autojs6_bridge_signal_from_options(options)
    };
  }
  function __autojs6_app_invalid_argument_error(methodName, message) {
    return __autojs6_bridge_error(
      message,
      "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED",
      "app",
      methodName
    );
  }
  function __autojs6_app_non_empty_string(value) {
    return value === undefined || value === null ? "" : String(value);
  }
  function __autojs6_app_intent_plain_object(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }
  function __autojs6_app_intent_error(methodName, message) {
    throw __autojs6_app_invalid_argument_error(methodName, message);
  }
  function __autojs6_app_optional_intent_string(value, methodName, fieldName) {
    if (value === undefined || value === null) {
      return undefined;
    }
    const text = String(value);
    return text.length > 0 ? text : undefined;
  }
  function __autojs6_app_expand_android_constant(kind, value) {
    if (value === undefined || value === null) {
      return undefined;
    }
    const text = String(value).trim();
    if (!text) {
      return undefined;
    }
    if (text.indexOf(".") >= 0) {
      return text;
    }
    return "android.intent." + kind + "." + text.toUpperCase();
  }
  function __autojs6_app_normalize_action(value) {
    return __autojs6_app_expand_android_constant("action", value);
  }
  function __autojs6_app_normalize_category(value) {
    return __autojs6_app_expand_android_constant("category", value);
  }
  function __autojs6_app_has_uri_scheme(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(String(value || ""));
  }
  function __autojs6_app_parse_uri_descriptor(value, methodName) {
    if (value === undefined || value === null) {
      return null;
    }
    const text = String(value);
    const descriptor = {
      schema: "autojs6-node-app-uri-descriptor-v1",
      value: text
    };
    const schemeMatch = /^([a-z][a-z0-9+.-]*):(.*)$/i.exec(text);
    if (!schemeMatch) {
      if (text.length > 0) {
        descriptor.path = text;
      }
      return Object.freeze(descriptor);
    }
    descriptor.scheme = schemeMatch[1].toLowerCase();
    try {
      const parsed = new URL(text);
      const userInfo = parsed.username || parsed.password
        ? parsed.username + (parsed.password ? ":" + parsed.password : "")
        : "";
      const authority = (userInfo ? userInfo + "@" : "") + parsed.host;
      if (authority) descriptor.authority = authority;
      if (userInfo) descriptor.userInfo = userInfo;
      if (parsed.hostname) descriptor.host = parsed.hostname;
      if (parsed.port) descriptor.port = Number(parsed.port);
      if (parsed.pathname) descriptor.path = parsed.pathname;
      if (parsed.search) descriptor.query = parsed.search.slice(1);
      if (parsed.hash) descriptor.fragment = parsed.hash.slice(1);
    } catch (_) {
      const rest = schemeMatch[2] || "";
      if (rest) descriptor.path = rest;
    }
    return Object.freeze(descriptor);
  }
  function __autojs6_app_looks_like_web_url(value) {
    const text = String(value || "").trim();
    return /^(www\.)?[-a-z0-9]+(\.[a-z0-9-]+)+(\/|$|\?|#)/i.test(text);
  }
  function __autojs6_app_normalize_url(value, methodName, fieldName) {
    const text = __autojs6_app_optional_intent_string(value, methodName, fieldName);
    if (text === undefined) {
      return undefined;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return undefined;
    }
    if (__autojs6_app_has_uri_scheme(trimmed)) {
      return trimmed;
    }
    if (__autojs6_app_looks_like_web_url(trimmed)) {
      return "http://" + trimmed;
    }
    __autojs6_app_intent_error(methodName, "app." + methodName + " " + fieldName + " must include a URI scheme or a web host.");
  }
  function __autojs6_app_intent_categories(value, methodName, fieldName) {
    if (value === undefined || value === null) {
      return [];
    }
    const values = Array.isArray(value) ? value : [value];
    return values.map(function(entry) {
      if (entry === undefined || entry === null) {
        return "";
      }
      return __autojs6_app_normalize_category(entry) || "";
    }).filter(function(entry) {
      return entry.length > 0;
    });
  }
  function __autojs6_app_intent_flag(value, methodName, fieldName) {
    if (typeof value !== "number" || !Number.isFinite(value) || Math.floor(value) !== value) {
      __autojs6_app_intent_error(methodName, "app." + methodName + " intent " + fieldName + " must be an integer flag value.");
    }
    return value | 0;
  }
  function __autojs6_app_intent_flags(value, methodName) {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.reduce(function(flags, entry, index) {
        return flags | __autojs6_app_intent_flag(entry, methodName, "flags[" + index + "]");
      }, 0);
    }
    return __autojs6_app_intent_flag(value, methodName, "flags");
  }
  function __autojs6_app_intent_extra_value(value, methodName, key) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        __autojs6_app_intent_error(methodName, "app." + methodName + " extras." + key + " must be a finite number.");
      }
      return value;
    }
    if (Array.isArray(value)) {
      let elementType = "";
      return Object.freeze(value.map(function(entry, index) {
        const parsed = __autojs6_app_intent_extra_value(entry, methodName, key + "[" + index + "]");
        const parsedType = parsed === null ? "null" : typeof parsed;
        if (parsed === undefined || parsed === null || (parsed && typeof parsed === "object")) {
          __autojs6_app_intent_error(methodName, "app." + methodName + " extras." + key + " arrays may only contain string, number, or boolean primitives.");
        }
        if (!elementType) {
          elementType = parsedType;
        } else if (elementType !== parsedType) {
          __autojs6_app_intent_error(methodName, "app." + methodName + " extras." + key + " arrays must not mix primitive types.");
        }
        return parsed;
      }));
    }
    __autojs6_app_intent_error(methodName, "app." + methodName + " extras." + key + " must be a JSON primitive or primitive array.");
  }
  function __autojs6_app_intent_extras(value, methodName) {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!__autojs6_app_intent_plain_object(value)) {
      __autojs6_app_intent_error(methodName, "app." + methodName + " intent extras must be a JSON object.");
    }
    const extras = {};
    Object.keys(value).forEach(function(key) {
      const parsed = __autojs6_app_intent_extra_value(value[key], methodName, key);
      if (parsed !== undefined) {
        extras[key] = parsed;
      }
    });
    return Object.freeze(extras);
  }
  function __autojs6_app_reject_privileged_intent_options(options, methodName) {
    ["root", "shizuku", "dual", "user", "userId"].forEach(function(key) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        __autojs6_app_intent_error(
          methodName,
          "app." + methodName + " does not accept privileged Rhino intent option: " + key + ". Use a dedicated shell/root/Shizuku capability instead."
        );
      }
    });
  }
  function __autojs6_app_normalize_intent_descriptor(options, methodName) {
    if (!__autojs6_app_intent_plain_object(options)) {
      __autojs6_app_intent_error(methodName, "app." + methodName + " requires a JSON intent descriptor object.");
    }
    __autojs6_app_reject_privileged_intent_options(options, methodName);
    const descriptor = {};
    [
      "action",
      "data",
      "url",
      "type",
      "packageName",
      "package",
      "className",
      "component"
    ].forEach(function(key) {
      const value = key === "url"
        ? __autojs6_app_normalize_url(options[key], methodName, key)
        : __autojs6_app_optional_intent_string(options[key], methodName, key);
      if (value !== undefined) {
        if (key === "package") {
          descriptor.packageName = value;
        } else if (key === "url") {
          descriptor.data = value;
        } else if (key === "action") {
          descriptor.action = __autojs6_app_normalize_action(value);
        } else {
          descriptor[key] = value;
        }
      }
    });
    const categories = []
      .concat(__autojs6_app_intent_categories(options.category, methodName, "category"))
      .concat(__autojs6_app_intent_categories(options.categories, methodName, "categories"));
    if (categories.length > 0) {
      descriptor.categories = Object.freeze(Array.from(new Set(categories)));
    }
    const flags = __autojs6_app_intent_flags(options.flags, methodName);
    if (flags !== undefined) {
      descriptor.flags = flags;
    }
    const extras = __autojs6_app_intent_extras(options.extras, methodName);
    if (extras !== undefined) {
      descriptor.extras = extras;
    }
    if (!__autojs6_app_has_start_activity_target(descriptor)) {
      __autojs6_app_intent_error(
        methodName,
        "app." + methodName + " requires action, data, type, packageName, className, or component."
      );
    }
    return Object.freeze(descriptor);
  }
  function __autojs6_app_has_start_activity_target(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return false;
    }
    return Boolean(
      options.action ||
      options.data ||
      options.url ||
      options.type ||
      options.packageName ||
      options.package ||
      options.className ||
      options.component
    );
  }
  function __autojs6_app_open_url_descriptor(url, methodName) {
    return __autojs6_app_normalize_intent_descriptor({
      action: "VIEW",
      url: url,
      category: "BROWSABLE"
    }, methodName);
  }
  function __autojs6_app_email_values(value, methodName, fieldName) {
    if (value === undefined || value === null) {
      return [];
    }
    const values = Array.isArray(value) ? value : [value];
    return values.map(function(entry) {
      return String(entry === undefined || entry === null ? "" : entry).trim();
    }).filter(function(entry) {
      return entry.length > 0;
    }).map(function(entry) {
      if (/[\r\n]/.test(entry)) {
        __autojs6_app_intent_error(methodName, "app." + methodName + " " + fieldName + " must not contain line breaks.");
      }
      return entry;
    });
  }
  function __autojs6_app_email_request(value, methodName) {
    if (typeof value === "string" || Array.isArray(value)) {
      return { to: value };
    }
    if (!__autojs6_app_intent_plain_object(value)) {
      __autojs6_app_intent_error(methodName, "app." + methodName + " requires an email request object or recipient string.");
    }
    return value;
  }
  function __autojs6_app_email_descriptor(value, methodName) {
    const request = __autojs6_app_email_request(value, methodName);
    const to = __autojs6_app_email_values(request.to || request.email || request.address, methodName, "to");
    const cc = __autojs6_app_email_values(request.cc, methodName, "cc");
    const bcc = __autojs6_app_email_values(request.bcc, methodName, "bcc");
    const subject = request.subject === undefined || request.subject === null ? "" : String(request.subject);
    const body = request.text === undefined || request.text === null
      ? request.body === undefined || request.body === null ? "" : String(request.body)
      : String(request.text);
    const query = [];
    if (cc.length > 0) query.push("cc=" + encodeURIComponent(cc.join(",")));
    if (bcc.length > 0) query.push("bcc=" + encodeURIComponent(bcc.join(",")));
    if (subject) query.push("subject=" + encodeURIComponent(subject));
    if (body) query.push("body=" + encodeURIComponent(body));
    const data = "mailto:" + to.map(encodeURIComponent).join(",") + (query.length > 0 ? "?" + query.join("&") : "");
    const extras = {};
    if (to.length > 0) extras["android.intent.extra.EMAIL"] = Object.freeze(to.slice());
    if (cc.length > 0) extras["android.intent.extra.CC"] = Object.freeze(cc.slice());
    if (bcc.length > 0) extras["android.intent.extra.BCC"] = Object.freeze(bcc.slice());
    if (subject) extras["android.intent.extra.SUBJECT"] = subject;
    if (body) extras["android.intent.extra.TEXT"] = body;
    return __autojs6_app_normalize_intent_descriptor({
      action: "SENDTO",
      data: data,
      extras: extras
    }, methodName);
  }
  function __autojs6_app_uninstall_descriptor(packageName, methodName) {
    const target = __autojs6_app_non_empty_string(packageName).trim();
    if (!target) {
      __autojs6_app_intent_error(methodName, "app." + methodName + " requires a non-empty package name.");
    }
    return __autojs6_app_normalize_intent_descriptor({
      action: "DELETE",
      data: "package:" + target
    }, methodName);
  }
  function __autojs6_app_shell_quote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }
  function __autojs6_app_shell_array_value(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/,/g, "\\,");
  }
  function __autojs6_app_shell_join_array(values) {
    return values.map(__autojs6_app_shell_array_value).join(",");
  }
  function __autojs6_app_shell_number_type(value) {
    if (Number.isInteger(value)) {
      return value >= -2147483648 && value <= 2147483647 ? "i" : "l";
    }
    return "f";
  }
  function __autojs6_app_shell_number_array_type(values) {
    let allInt32 = true;
    let allInteger = true;
    values.forEach(function(value) {
      if (!Number.isInteger(value)) {
        allInt32 = false;
        allInteger = false;
      } else if (value < -2147483648 || value > 2147483647) {
        allInt32 = false;
      }
    });
    return allInt32 ? "ia" : allInteger ? "la" : "fa";
  }
  function __autojs6_app_shell_extra_option(value, methodName, key) {
    if (value === null) {
      return "esn";
    }
    if (typeof value === "string") {
      return "es";
    }
    if (typeof value === "boolean") {
      return "ez";
    }
    if (typeof value === "number") {
      return "e" + __autojs6_app_shell_number_type(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0 || typeof value[0] === "string") {
        return "esa";
      }
      if (typeof value[0] === "boolean") {
        return "eza";
      }
      if (typeof value[0] === "number") {
        return "e" + __autojs6_app_shell_number_array_type(value);
      }
    }
    __autojs6_app_intent_error(methodName, "app." + methodName + " extras." + key + " cannot be converted to shell intent arguments.");
  }
  function __autojs6_app_intent_to_shell(descriptor, methodName) {
    const parts = [];
    const component = descriptor.component ||
      (descriptor.packageName && descriptor.className ? descriptor.packageName + "/" + descriptor.className : "") ||
      (descriptor.className || "");
    if (component) {
      parts.push("-n", __autojs6_app_shell_quote(component));
    } else if (descriptor.packageName) {
      parts.push("-p", __autojs6_app_shell_quote(descriptor.packageName));
    }
    if (descriptor.extras) {
      Object.keys(descriptor.extras).forEach(function(key) {
        const value = descriptor.extras[key];
        const option = __autojs6_app_shell_extra_option(value, methodName, key);
        if (option === "esn") {
          parts.push("--" + option, __autojs6_app_shell_quote(key));
        } else if (Array.isArray(value)) {
          parts.push("--" + option, __autojs6_app_shell_quote(key), __autojs6_app_shell_quote(__autojs6_app_shell_join_array(value)));
        } else {
          const shellValue = typeof value === "string" ? __autojs6_app_shell_quote(value) : String(value);
          parts.push("--" + option, __autojs6_app_shell_quote(key), shellValue);
        }
      });
    }
    (descriptor.categories || []).forEach(function(category) {
      parts.push("-c", __autojs6_app_shell_quote(category));
    });
    if (descriptor.action) {
      parts.push("-a", __autojs6_app_shell_quote(descriptor.action));
    }
    if (descriptor.flags !== undefined) {
      parts.push("-f", String(descriptor.flags));
    }
    if (descriptor.type) {
      parts.push("-t", __autojs6_app_shell_quote(descriptor.type));
    }
    if (descriptor.data) {
      parts.push("-d", __autojs6_app_shell_quote(descriptor.data));
    }
    return parts.join(" ");
  }
  function __autojs6_app_raw_uri_unavailable_error(methodName) {
    return __autojs6_bridge_error(
      "app." + methodName + " is not available in the Bun engine yet; P13-23 keeps raw Android Uri and FileProvider handles out of Node. Use app.parseUri() for JSON-safe URI inspection or app.viewFile()/app.editFile() for scoped file activity routing.",
      "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED",
      "app",
      methodName
    );
  }
  function __autojs6_app_privileged_unavailable_error(methodName) {
    return __autojs6_bridge_error(
      "app." + methodName + " is not available in the Bun engine yet; P13-23 keeps root, Shizuku, and dual-user app helpers blocked until they are routed through explicit P13-24 shell/root/Shizuku capabilities.",
      "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED",
      "app",
      methodName
    );
  }
  function __autojs6_limited_app() {
    if (__autojs6_limited_app_cache) {
      return __autojs6_limited_app_cache;
    }
    const info = __autojs6_host_app_info();
    function intent(options) {
      return __autojs6_app_normalize_intent_descriptor(options, "intent");
    }
    function parseUri(uri) {
      return __autojs6_app_parse_uri_descriptor(uri, "parseUri");
    }
    function getUriForFile(path, options) {
      return __autojs6_call_autojs("android","getUriForFile",[String(path)],options);
    }
    function intentToShell(options) {
      return __autojs6_app_intent_to_shell(
        __autojs6_app_normalize_intent_descriptor(options, "intentToShell"),
        "intentToShell"
      );
    }
    function openUrl(url, options) {
      let descriptor;
      try {
        descriptor = __autojs6_app_open_url_descriptor(url, "openUrl");
      } catch (error) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "openUrl",
          error && error.message ? error.message : "app.openUrl requires a URI string."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "startActivity",
        [descriptor],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function sendEmail(request, options) {
      let descriptor;
      try {
        const emailRequest = (typeof request === "string" || Array.isArray(request)) && options && typeof options === "object"
          ? Object.assign({}, options, { to: request })
          : request;
        descriptor = __autojs6_app_email_descriptor(emailRequest, "sendEmail");
      } catch (error) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "sendEmail",
          error && error.message ? error.message : "app.sendEmail requires a JSON-safe email request."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "startActivity",
        [descriptor],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function uninstall(packageName, options) {
      let descriptor;
      try {
        descriptor = __autojs6_app_uninstall_descriptor(packageName, "uninstall");
      } catch (error) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "uninstall",
          error && error.message ? error.message : "app.uninstall requires a non-empty package name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "startActivity",
        [descriptor],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function getPackageName(appName, options) {
      const target = __autojs6_app_non_empty_string(appName).trim();
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "getPackageName",
          "app.getPackageName requires a non-empty app name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "getPackageName",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function getAppName(packageName, options) {
      const target = __autojs6_app_non_empty_string(packageName).trim();
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "getAppName",
          "app.getAppName requires a non-empty package name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "getAppName",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function isInstalled(packageName, options) {
      const target = __autojs6_app_non_empty_string(packageName).trim();
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "isInstalled",
          "app.isInstalled requires a non-empty package name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "isInstalled",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function viewFile(path, options) {
      const target = __autojs6_app_non_empty_string(path).trim();
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "viewFile",
          "app.viewFile requires a non-empty scoped file path."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "viewFile",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function editFile(path, options) {
      const target = __autojs6_app_non_empty_string(path).trim();
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "editFile",
          "app.editFile requires a non-empty scoped file path."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "editFile",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function launchPackage(packageName, options) {
      const target = __autojs6_app_non_empty_string(packageName);
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "launchPackage",
          "app.launchPackage requires a non-empty package name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "launchPackage",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function launchApp(name, options) {
      const target = __autojs6_app_non_empty_string(name);
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "launchApp",
          "app.launchApp requires a non-empty app name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "launchApp",
        [target],
        __autojs6_app_bridge_options(options, 10000)
      );
    }
    function openAppSetting(packageName, options) {
      let target = packageName;
      let bridgeOptions = options;
      if (target && typeof target === "object") {
        bridgeOptions = target;
        target = info.packageName;
      }
      target = __autojs6_app_non_empty_string(target || info.packageName);
      if (!target) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "openAppSetting",
          "app.openAppSetting requires a non-empty package name."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "openAppSetting",
        [target],
        __autojs6_app_bridge_options(bridgeOptions, 10000)
      );
    }
    function startActivity(options, callOptions) {
      let descriptor;
      try {
        descriptor = typeof options === "string"
          ? __autojs6_app_open_url_descriptor(options, "startActivity")
          : __autojs6_app_normalize_intent_descriptor(options, "startActivity");
      } catch (error) {
        return Promise.reject(__autojs6_app_invalid_argument_error(
          "startActivity",
          error && error.message ? error.message : "app.startActivity requires a JSON intent descriptor."
        ));
      }
      return __autojs6_call_autojs(
        "app",
        "startActivity",
        [descriptor],
        __autojs6_app_bridge_options(callOptions, 10000)
      );
    }
    function startDualActivity(options, callOptions) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("startDualActivity"));
    }
    function dispatchIntent(method, options, callOptions) {
      let descriptor;
      try { descriptor = __autojs6_app_normalize_intent_descriptor(typeof options === "string" ? {action: options} : options, method); }
      catch (error) { return Promise.reject(error); }
      return __autojs6_call_autojs("app", method, [descriptor], __autojs6_app_bridge_options(callOptions, 10000));
    }
    function sendBroadcast(options, callOptions) { return dispatchIntent("sendBroadcast", options, callOptions); }
    function startService(options, callOptions) { return dispatchIntent("startService", options, callOptions); }
    function getInstalledApps(options, callOptions) {
      return __autojs6_call_autojs("app", "getInstalledApps", [options || {}], __autojs6_app_bridge_options(callOptions, 10000));
    }
    function getPackageInfo(packageName, options) {
      return __autojs6_call_autojs("app", "getPackageInfo", [String(packageName || "")], __autojs6_app_bridge_options(options, 10000));
    }
    function openDualUrl(url, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("openDualUrl"));
    }
    function launchDualPackage(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("launchDualPackage"));
    }
    function launchDualApp(appName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("launchDualApp"));
    }
    function launchDualAppDetailsSettings(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("launchDualAppDetailsSettings"));
    }
    function isDualInstalled(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("isDualInstalled"));
    }
    function uninstallDual(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("uninstallDual"));
    }
    function kill(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("kill"));
    }
    function killDual(packageName, options) {
      return Promise.reject(__autojs6_app_privileged_unavailable_error("killDual"));
    }
    __autojs6_limited_app_cache = Object.freeze({
      packageName: info.packageName,
      versionName: info.versionName,
      versionCode: info.versionCode,
      intent,
      parseUri,
      getUriForFile,
      intentToShell,
      openUrl,
      openDualUrl,
      sendEmail,
      uninstall,
      uninstallDual,
      getPackageName,
      getAppName,
      isInstalled,
      isDualInstalled,
      viewFile,
      editFile,
      launch: launchPackage,
      launchDual: launchDualPackage,
      launchPackage,
      launchDualPackage,
      launchApp,
      launchDualApp,
      openAppSetting,
      openAppSettings: openAppSetting,
      launchSettings: openAppSetting,
      launchAppDetailsSettings: openAppSetting,
      openDualAppSetting: launchDualAppDetailsSettings,
      openDualAppSettings: launchDualAppDetailsSettings,
      launchDualSettings: launchDualAppDetailsSettings,
      launchDualAppDetailsSettings,
      startActivity,
      startDualActivity,
      sendBroadcast,
      startService,
      getInstalledApps,
      getPackageInfo,
      kill,
      killDual
    });
    return __autojs6_limited_app_cache;
  }

  function __autojs6_accessibility_timeout_from_options(options, fallbackMs) {
    return options && typeof options === "object" && options.timeoutMs !== undefined
      ? options.timeoutMs
      : fallbackMs;
  }
  function __autojs6_accessibility_bridge_options(options, fallbackMs) {
    return {
      timeoutMs: __autojs6_accessibility_timeout_from_options(options, fallbackMs),
      permissions: ["accessibility"],
      signal: __autojs6_bridge_signal_from_options(options)
    };
  }
  function __autojs6_accessibility_options(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function __autojs6_accessibility_invalid_argument_error(methodName, message) {
    return __autojs6_bridge_error(
      message,
      "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED",
      "accessibility",
      methodName
    );
  }
  function __autojs6_accessibility_finite_number(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }
  function __autojs6_accessibility_non_empty_string(value) {
    const text = value === undefined || value === null ? "" : String(value);
    return text;
  }
  function __autojs6_accessibility_text_input(value, methodName) {
    const text = value === undefined || value === null ? "" : String(value);
    if (text.indexOf("\u0000") !== -1) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " text must not contain NUL bytes."
      );
    }
    return text;
  }
  const __autojs6_accessibility_selector_type = "autojs6.accessibility.selector";
  const __autojs6_accessibility_selector_fields = Object.freeze([
    "text",
    "desc",
    "id",
    "className",
    "textContains",
    "descContains",
    "textMatches",
    "descMatches",
    "idMatches",
    "classNameMatches",
    "clickable",
    "enabled",
    "scrollable",
    "depth",
    "boundsInside",
    "boundsContains"
  ]);
  function __autojs6_accessibility_selector_text(value, methodName, fieldName) {
    const text = value === undefined || value === null ? "" : String(value);
    if (text.length === 0 || text.indexOf("\u0000") !== -1) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires non-empty selector " + fieldName + " without NUL bytes."
      );
    }
    return text;
  }
  function __autojs6_accessibility_selector_regex(value, methodName, fieldName) {
    let pattern = "";
    let flags = "";
    if (value instanceof RegExp) {
      pattern = value.source;
      flags = (value.ignoreCase ? "i" : "") + (value.multiline ? "m" : "") + (value.dotAll ? "s" : "");
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      pattern = value.pattern === undefined || value.pattern === null ? "" : String(value.pattern);
      const rawFlags = value.flags === undefined || value.flags === null ? "" : String(value.flags);
      for (let i = 0; i < rawFlags.length; i++) {
        const flag = rawFlags.charAt(i);
        if ((flag === "i" || flag === "m" || flag === "s") && flags.indexOf(flag) < 0) {
          flags += flag;
        }
      }
    } else {
      pattern = value === undefined || value === null ? "" : String(value);
    }
    if (pattern.length === 0 || pattern.indexOf("\u0000") !== -1) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires non-empty selector " + fieldName + " pattern without NUL bytes."
      );
    }
    return Object.freeze({ pattern, flags });
  }
  function __autojs6_accessibility_selector_boolean(value) {
    return value !== false;
  }
  function __autojs6_accessibility_selector_depth(value, methodName, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || Math.trunc(number) < 0) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires non-negative integer selector " + fieldName + "."
      );
    }
    return Math.trunc(number);
  }
  function __autojs6_accessibility_selector_bounds(value, methodName, fieldName) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const bounds = Object.freeze({
      left: __autojs6_accessibility_finite_number(input.left),
      top: __autojs6_accessibility_finite_number(input.top),
      right: __autojs6_accessibility_finite_number(input.right),
      bottom: __autojs6_accessibility_finite_number(input.bottom)
    });
    if (!Number.isFinite(bounds.left) || !Number.isFinite(bounds.top) ||
        !Number.isFinite(bounds.right) || !Number.isFinite(bounds.bottom) ||
        bounds.right < bounds.left || bounds.bottom < bounds.top) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires finite selector " + fieldName + " bounds."
      );
    }
    return bounds;
  }
  function __autojs6_accessibility_selector_value(fieldName, value, methodName) {
    if (fieldName === "textMatches" || fieldName === "descMatches" ||
        fieldName === "idMatches" || fieldName === "classNameMatches") {
      return __autojs6_accessibility_selector_regex(value, methodName, fieldName);
    }
    if (fieldName === "clickable" || fieldName === "enabled" || fieldName === "scrollable") {
      return __autojs6_accessibility_selector_boolean(value);
    }
    if (fieldName === "depth") {
      return __autojs6_accessibility_selector_depth(value, methodName, fieldName);
    }
    if (fieldName === "boundsInside" || fieldName === "boundsContains") {
      return __autojs6_accessibility_selector_bounds(value, methodName, fieldName);
    }
    return __autojs6_accessibility_selector_text(value, methodName, fieldName);
  }
  function __autojs6_accessibility_selector(fieldName, value, methodName) {
    const selector = {
      type: __autojs6_accessibility_selector_type,
      version: 1
    };
    selector[fieldName] = __autojs6_accessibility_selector_value(fieldName, value, methodName);
    return Object.freeze(selector);
  }
  function __autojs6_accessibility_bounds_input(args) {
    if (args.length === 1 && args[0] && typeof args[0] === "object" && !Array.isArray(args[0])) {
      return args[0];
    }
    return { left: args[0], top: args[1], right: args[2], bottom: args[3] };
  }
  function __autojs6_accessibility_is_selector_input(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    if (value.type === __autojs6_accessibility_selector_type || Number(value.version) === 1) {
      return true;
    }
    for (let i = 0; i < __autojs6_accessibility_selector_fields.length; i++) {
      if (value[__autojs6_accessibility_selector_fields[i]] !== undefined) {
        return true;
      }
    }
    return false;
  }
  function __autojs6_accessibility_selector_descriptor(value, methodName) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        value.type !== __autojs6_accessibility_selector_type ||
        Number(value.version) !== 1) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires a selector descriptor created by an accessibility selector builder."
      );
    }
    const descriptor = {
      type: __autojs6_accessibility_selector_type,
      version: 1
    };
    let fieldCount = 0;
    for (let i = 0; i < __autojs6_accessibility_selector_fields.length; i++) {
      const fieldName = __autojs6_accessibility_selector_fields[i];
      if (value[fieldName] !== undefined) {
        descriptor[fieldName] = __autojs6_accessibility_selector_value(fieldName, value[fieldName], methodName);
        fieldCount += 1;
      }
    }
    if (fieldCount === 0) {
      throw __autojs6_accessibility_invalid_argument_error(
        methodName,
        "accessibility." + methodName + " requires at least one selector field."
      );
    }
    return Object.freeze(descriptor);
  }
  function __autojs6_accessibility_number_property(object, name) {
    const number = object && object[name] !== undefined && object[name] !== null ? Number(object[name]) : 0;
    return Number.isFinite(number) ? number : 0;
  }
  function __autojs6_accessibility_normalize_bounds(value) {
    const input = value && typeof value === "object" ? value : {};
    return Object.freeze({
      left: __autojs6_accessibility_number_property(input, "left"),
      top: __autojs6_accessibility_number_property(input, "top"),
      right: __autojs6_accessibility_number_property(input, "right"),
      bottom: __autojs6_accessibility_number_property(input, "bottom")
    });
  }
  function __autojs6_accessibility_optional_string(value) {
    return value === undefined || value === null ? "" : String(value);
  }
  function __autojs6_accessibility_normalize_node(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    return Object.freeze({
      text: __autojs6_accessibility_optional_string(value.text),
      desc: __autojs6_accessibility_optional_string(value.desc),
      id: __autojs6_accessibility_optional_string(value.id),
      className: __autojs6_accessibility_optional_string(value.className),
      bounds: __autojs6_accessibility_normalize_bounds(value.bounds),
      clickable: value.clickable === true,
      enabled: value.enabled !== false
    });
  }
  function __autojs6_accessibility_normalize_nodes(value) {
    if (!Array.isArray(value)) {
      return Object.freeze([]);
    }
    const nodes = [];
    for (let i = 0; i < value.length; i++) {
      const node = __autojs6_accessibility_normalize_node(value[i]);
      if (node) {
        nodes.push(node);
      }
    }
    return Object.freeze(nodes);
  }
  function __autojs6_limited_accessibility() {
    if (__autojs6_limited_accessibility_cache) {
      return __autojs6_limited_accessibility_cache;
    }
    function isEnabled(options) {
      return __autojs6_call_autojs(
        "accessibility",
        "isEnabled",
        [],
        __autojs6_accessibility_bridge_options(__autojs6_accessibility_options(options), 5000)
      ).then(function(result) {
        return result === true;
      });
    }
    function ensureEnabled(options) {
      const bridgeOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "ensureEnabled",
        [{ prompt: bridgeOptions.prompt === true }],
        __autojs6_accessibility_bridge_options(bridgeOptions, 30000)
      ).then(function(result) {
        return result === true;
      });
    }
    function click(x, y, options) {
      if (__autojs6_accessibility_is_selector_input(x) &&
          (y === undefined || y === null || (typeof y === "object" && !Array.isArray(y)))) {
        let selector;
        try {
          selector = __autojs6_accessibility_selector_descriptor(x, "click");
        } catch (error) {
          return Promise.reject(error);
        }
        const findOptions = __autojs6_accessibility_options(y);
        return __autojs6_call_autojs(
          "accessibility",
          "click",
          [selector, findOptions],
          __autojs6_accessibility_bridge_options(findOptions, 10000)
        ).then(function(result) {
          return result === true;
        });
      }
      const targetX = __autojs6_accessibility_finite_number(x);
      const targetY = __autojs6_accessibility_finite_number(y);
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "click",
          "accessibility.click requires finite x and y coordinates."
        ));
      }
      return __autojs6_call_autojs(
        "accessibility",
        "click",
        [targetX, targetY],
        __autojs6_accessibility_bridge_options(__autojs6_accessibility_options(options), 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function simpleAction(methodName, options) {
      return __autojs6_call_autojs(
        "accessibility",
        methodName,
        [],
        __autojs6_accessibility_bridge_options(__autojs6_accessibility_options(options), 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function findByText(text, options) {
      const target = __autojs6_accessibility_non_empty_string(text);
      if (!target) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "findByText",
          "accessibility.findByText requires non-empty text."
        ));
      }
      const findOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "findByText",
        [target, findOptions],
        __autojs6_accessibility_bridge_options(findOptions, 10000)
      ).then(__autojs6_accessibility_normalize_node);
    }
    function findOne(selector, options) {
      let descriptor;
      try {
        descriptor = __autojs6_accessibility_selector_descriptor(selector, "findOne");
      } catch (error) {
        return Promise.reject(error);
      }
      const findOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "findOne",
        [descriptor, findOptions],
        __autojs6_accessibility_bridge_options(findOptions, 10000)
      ).then(__autojs6_accessibility_normalize_node);
    }
    function findAll(selector, options) {
      let descriptor;
      try {
        descriptor = __autojs6_accessibility_selector_descriptor(selector, "findAll");
      } catch (error) {
        return Promise.reject(error);
      }
      const findOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "findAll",
        [descriptor, findOptions],
        __autojs6_accessibility_bridge_options(findOptions, 10000)
      ).then(__autojs6_accessibility_normalize_nodes);
    }
    function selectorAction(methodName, selector, options) {
      let descriptor;
      try {
        descriptor = __autojs6_accessibility_selector_descriptor(selector, methodName);
      } catch (error) {
        return Promise.reject(error);
      }
      const actionOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        methodName,
        [descriptor, actionOptions],
        __autojs6_accessibility_bridge_options(actionOptions, 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function setText(selector, text, options) {
      let descriptor;
      let targetText;
      try {
        descriptor = __autojs6_accessibility_selector_descriptor(selector, "setText");
        targetText = __autojs6_accessibility_text_input(text, "setText");
      } catch (error) {
        return Promise.reject(error);
      }
      const actionOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "setText",
        [descriptor, targetText, actionOptions],
        __autojs6_accessibility_bridge_options(actionOptions, 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function clickText(text, options) {
      const target = __autojs6_accessibility_non_empty_string(text);
      if (!target) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "clickText",
          "accessibility.clickText requires non-empty text."
        ));
      }
      const findOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "clickText",
        [target, findOptions],
        __autojs6_accessibility_bridge_options(findOptions, 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function gestureBridgeOptions(options, fallbackMs) {
      // M3.2: coordinate gestures need the dedicated capability on top of
      // plain accessibility; the host rejects the call without it.
      return {
        timeoutMs: __autojs6_accessibility_timeout_from_options(options, fallbackMs),
        permissions: ["accessibility", "accessibility.gesture"],
        signal: __autojs6_bridge_signal_from_options(options)
      };
    }
    function swipe(x1, y1, x2, y2, durationMs, options) {
      const coordinates = [x1, y1, x2, y2].map(__autojs6_accessibility_finite_number);
      if (!coordinates.every(function(value) { return Number.isFinite(value) && value >= 0; })) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "swipe",
          "accessibility.swipe requires finite non-negative x1, y1, x2 and y2 coordinates."
        ));
      }
      const duration = durationMs === undefined || durationMs === null ? 300 : Number(durationMs);
      if (!Number.isFinite(duration) || duration <= 0) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "swipe",
          "accessibility.swipe requires a positive durationMs."
        ));
      }
      const bridgeOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "swipe",
        [coordinates[0], coordinates[1], coordinates[2], coordinates[3], duration],
        gestureBridgeOptions(bridgeOptions, duration + 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    function gesture(durationMs, points, options) {
      const duration = Number(durationMs);
      const path = Array.isArray(points) ? points.map(function(point) {
        if (!Array.isArray(point) || point.length < 2) return null;
        const x = __autojs6_accessibility_finite_number(point[0]);
        const y = __autojs6_accessibility_finite_number(point[1]);
        return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 ? [x, y] : null;
      }) : [];
      if (!Number.isFinite(duration) || duration <= 0 || path.length < 2 || path.some(function(point) { return point === null; })) {
        return Promise.reject(__autojs6_accessibility_invalid_argument_error(
          "gesture",
          "accessibility.gesture requires a positive durationMs and at least two [x, y] points with finite non-negative coordinates."
        ));
      }
      const bridgeOptions = __autojs6_accessibility_options(options);
      return __autojs6_call_autojs(
        "accessibility",
        "gesture",
        [duration, path],
        gestureBridgeOptions(bridgeOptions, duration + 10000)
      ).then(function(result) {
        return result === true;
      });
    }
    __autojs6_limited_accessibility_cache = Object.freeze({
      text: function(value) {
        return __autojs6_accessibility_selector("text", value, "text");
      },
      desc: function(value) {
        return __autojs6_accessibility_selector("desc", value, "desc");
      },
      id: function(value) {
        return __autojs6_accessibility_selector("id", value, "id");
      },
      className: function(value) {
        return __autojs6_accessibility_selector("className", value, "className");
      },
      textContains: function(value) {
        return __autojs6_accessibility_selector("textContains", value, "textContains");
      },
      descContains: function(value) {
        return __autojs6_accessibility_selector("descContains", value, "descContains");
      },
      textMatches: function(value) {
        return __autojs6_accessibility_selector("textMatches", value, "textMatches");
      },
      descMatches: function(value) {
        return __autojs6_accessibility_selector("descMatches", value, "descMatches");
      },
      idMatches: function(value) {
        return __autojs6_accessibility_selector("idMatches", value, "idMatches");
      },
      classNameMatches: function(value) {
        return __autojs6_accessibility_selector("classNameMatches", value, "classNameMatches");
      },
      clickable: function(value) {
        return __autojs6_accessibility_selector("clickable", value, "clickable");
      },
      enabled: function(value) {
        return __autojs6_accessibility_selector("enabled", value, "enabled");
      },
      scrollable: function(value) {
        return __autojs6_accessibility_selector("scrollable", value, "scrollable");
      },
      depth: function(value) {
        return __autojs6_accessibility_selector("depth", value, "depth");
      },
      boundsInside: function(left, top, right, bottom) {
        return __autojs6_accessibility_selector("boundsInside", __autojs6_accessibility_bounds_input(arguments), "boundsInside");
      },
      boundsContains: function(left, top, right, bottom) {
        return __autojs6_accessibility_selector("boundsContains", __autojs6_accessibility_bounds_input(arguments), "boundsContains");
      },
      isEnabled,
      ensureEnabled,
      click,
      back: function(options) {
        return simpleAction("back", options);
      },
      home: function(options) {
        return simpleAction("home", options);
      },
      recentApps: function(options) {
        return simpleAction("recentApps", options);
      },
      findByText,
      findOne,
      findAll,
      clickText,
      longClick: function(selector, options) {
        return selectorAction("longClick", selector, options);
      },
      setText,
      scrollForward: function(selector, options) {
        return selectorAction("scrollForward", selector, options);
      },
      scrollBackward: function(selector, options) {
        return selectorAction("scrollBackward", selector, options);
      },
      swipe,
      gesture
    });
    return __autojs6_limited_accessibility_cache;
  }

  const app = { ...__autojs6_limited_app() };
  for (const key of ['packageName','versionName','versionCode']) Object.defineProperty(app,key,{enumerable:true,get(){
    if (!hostInfo) throw new HostCallError('NOT_GRANTED','Host application identity requires app.control','app.control');
    return hostInfo[key];
  }});
  return {app:Object.freeze(app),accessibility:__autojs6_limited_accessibility(),clipboard:__autojs6_limited_clipboard()};
}
// END GENERATED AUTOMATION

// BEGIN GENERATED STORAGE
// Reproduced from Node's public storage/storages facade by tools/host-client/sync-storage.mjs.
function createStorage(dispatch) {
  let __autojs6_limited_storage_cache, __autojs6_limited_storages_cache;
  const __autojs6_call_autojs = (_,method,args,options) => dispatch('storage',method,args,options);
  const __autojs6_bridge_signal_from_options = options => options && options.signal;
  const __autojs6_bridge_timeout_ms = value => value;
  const __autojs6_bridge_error = (message,code,module,method) => Object.assign(new HostCallError('INVALID_REQUEST',message,'storage.control'),{method});
  const __autojs6_rhino_compat_unsupported = (api,message) => Object.assign(new HostCallError('NOT_SUPPORTED',message,'storage.control'),{api});
  function __autojs6_storage_options(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function __autojs6_storage_invalid_argument_error(moduleName, methodName, message) {
    return __autojs6_bridge_error(
      message,
      "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED",
      moduleName,
      methodName
    );
  }
  function __autojs6_storage_name(moduleName, methodName, value, label) {
    const text = value === undefined || value === null ? "" : String(value).trim();
    if (!text) {
      throw __autojs6_storage_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " requires a non-empty " + label + ".");
    }
    if (text.indexOf("\u0000") !== -1 || text.length > 128) {
      throw __autojs6_storage_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " received an invalid " + label + ".");
    }
    return text;
  }
  function __autojs6_storage_json_value(moduleName, methodName, value) {
    if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      throw __autojs6_storage_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " value must be JSON-serializable.");
    }
    let json = "";
    try {
      json = JSON.stringify(value);
    } catch (error) {
      throw __autojs6_storage_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " value must be JSON-serializable.");
    }
    if (json === undefined) {
      throw __autojs6_storage_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " value must be JSON-serializable.");
    }
    return value;
  }
  function __autojs6_storage_bridge_options(options, fallbackMs) {
    const input = __autojs6_storage_options(options);
    return {
      timeoutMs: __autojs6_bridge_timeout_ms(input.timeoutMs === undefined ? fallbackMs : input.timeoutMs),
      signal: __autojs6_bridge_signal_from_options(input),
      permissions: ["storage"]
    };
  }
  function __autojs6_limited_storage(moduleName) {
    if (moduleName === "storages" && __autojs6_limited_storages_cache) {
      return __autojs6_limited_storages_cache;
    }
    if (moduleName === "storage" && __autojs6_limited_storage_cache) {
      return __autojs6_limited_storage_cache;
    }
    function createStore(name) {
      const storeName = __autojs6_storage_name(moduleName, "create", name, "storage name");
      function call(methodName, args, options, fallbackMs) {
        return __autojs6_call_autojs(
          moduleName,
          methodName,
          [storeName].concat(args || []),
          __autojs6_storage_bridge_options(options, fallbackMs || 5000)
        );
      }
      function get(key, defaultValue, options) {
        const checkedKey = __autojs6_storage_name(moduleName, "get", key, "key");
        return call("get", [checkedKey], options, 5000).then(function(result) {
          if (result && typeof result === "object" && result.found === true) {
            return result.value;
          }
          return defaultValue;
        });
      }
      function put(key, value, options) {
        const checkedKey = __autojs6_storage_name(moduleName, "put", key, "key");
        const checkedValue = __autojs6_storage_json_value(moduleName, "put", value);
        return call("put", [checkedKey, checkedValue], options, 5000).then(function() {
          return undefined;
        });
      }
      function remove(key, options) {
        const checkedKey = __autojs6_storage_name(moduleName, "remove", key, "key");
        return call("remove", [checkedKey], options, 5000).then(function() {
          return undefined;
        });
      }
      function clear(options) {
        return call("clear", [], options, 5000).then(function() {
          return undefined;
        });
      }
      function keys(options) {
        return call("keys", [], options, 5000).then(function(result) {
          return Object.freeze(Array.isArray(result) ? result.map(String) : []);
        });
      }
      function contains(key, options) {
        const checkedKey = __autojs6_storage_name(moduleName, "contains", key, "key");
        return call("contains", [checkedKey], options, 5000).then(function(result) {
          return result === true;
        });
      }
      function selfRemove(options) {
        return removeStorage(storeName, options);
      }
      return Object.freeze({
        name: storeName,
        get,
        put,
        putSync: put,
        remove,
        removeSync: remove,
        clear,
        clearSync: clear,
        keys,
        contains,
        selfRemove,
        selfRemoveSync: selfRemove
      });
    }
    function create(name) {
      return createStore(name);
    }
    function open(name) {
      return createStore(name);
    }
    function removeStorage(name, options) {
      const storeName = __autojs6_storage_name(moduleName, "remove", name, "storage name");
      return createStore(storeName).clear(options);
    }
    function names() {
      throw __autojs6_rhino_compat_unsupported(
        "storages.names",
        "The controlled Bun storage bridge is scoped by package and working directory and does not expose storage namespace enumeration."
      );
    }
    function all() {
      throw __autojs6_rhino_compat_unsupported(
        "storages.all",
        "The controlled Bun storage bridge is scoped by package and working directory and does not expose storage namespace enumeration."
      );
    }
    const moduleValue = Object.freeze({
      create,
      open,
      remove: removeStorage,
      removeSync: removeStorage,
      names,
      all
    });
    if (moduleName === "storages") {
      __autojs6_limited_storages_cache = moduleValue;
    } else {
      __autojs6_limited_storage_cache = moduleValue;
    }
    return moduleValue;
  }

  return {storage:__autojs6_limited_storage('storage'),storages:__autojs6_limited_storage('storages')};
}
// END GENERATED STORAGE

// BEGIN GENERATED DATABASE
// Shared with Node main threads and Workers by tools/host-client/sync-database.mjs.
  function __autojs6_create_database(call, error, normalizeTimeout, signalFromOptions) {
    let __autojs6_limited_database_cache, __autojs6_limited_sqlite_cache;
    const __autojs6_call_autojs = call;
    const __autojs6_bridge_error = error || ((message, code, module, method) => Object.assign(new Error(message), {code, module, method}));
    const __autojs6_bridge_timeout_ms = normalizeTimeout || (value => {
      const number = Number(value == null ? 30000 : value);
      return !Number.isFinite(number) || number <= 0 ? 30000 : Math.max(1, Math.min(Math.floor(number), 2147483647));
    });
    const __autojs6_bridge_signal_from_options = signalFromOptions || (options => options && options.signal);
  function __autojs6_database_options(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function __autojs6_database_invalid_argument_error(moduleName, methodName, message, code) {
    return __autojs6_bridge_error(
      message,
      code || "ERR_AUTOJS6_BRIDGE_INVALID_REQUEST",
      moduleName,
      methodName
    );
  }
  function __autojs6_database_open_payload(moduleName, value) {
    let name = "";
    if (typeof value === "string" || typeof value === "number") {
      name = String(value).trim();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const selected = value.name === undefined || value.name === null ? value.path : value.name;
      name = selected == null ? "" : String(selected).trim();
    }
    if (!name || name.length > 64 || name.indexOf("\u0000") !== -1) {
      throw __autojs6_database_invalid_argument_error(moduleName, "open", moduleName + ".open requires a non-empty database name up to 64 characters.");
    }
    const normalized = name.replace(/\\/g, "/");
    if (
      normalized.charAt(0) === "/" ||
      normalized.indexOf("/") >= 0 ||
      normalized.indexOf(":") >= 0 ||
      normalized === "." ||
      normalized === ".." ||
      normalized.indexOf("..") >= 0 ||
      !/^[A-Za-z0-9_.-]+$/.test(normalized)
    ) {
      throw __autojs6_database_invalid_argument_error(
        moduleName,
        "open",
        moduleName + ".open only accepts scoped database names, not paths.",
        "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED"
      );
    }
    return { name: normalized };
  }
  function __autojs6_database_sql(moduleName, methodName, value) {
    const sql = String(value === undefined || value === null ? "" : value).trim();
    if (!sql || sql.length > 16384 || sql.indexOf("\u0000") !== -1) {
      throw __autojs6_database_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " requires non-empty SQL up to 16384 characters.");
    }
    if (/(^|[^A-Za-z0-9_])(load_extension|attach|detach)($|[^A-Za-z0-9_])/i.test(sql)) {
      throw __autojs6_database_invalid_argument_error(
        moduleName,
        methodName,
        moduleName + "." + methodName + " SQL is denied by policy.",
        "ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED"
      );
    }
    return sql;
  }
  function __autojs6_database_params(moduleName, methodName, value) {
    if (value === undefined || value === null) {
      return [];
    }
    if (!Array.isArray(value)) {
      throw __autojs6_database_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " parameters must be an array.");
    }
    if (value.length > 128) {
      throw __autojs6_database_invalid_argument_error(
        moduleName,
        methodName,
        moduleName + "." + methodName + " parameters exceeded 128 entries.",
        "ERR_AUTOJS6_BRIDGE_RESOURCE_LIMIT"
      );
    }
    return value.map(function(item) {
      if (
        item === null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        if (typeof item === "number" && !Number.isFinite(item)) {
          throw __autojs6_database_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " numeric parameters must be finite.");
        }
        return item;
      }
      throw __autojs6_database_invalid_argument_error(moduleName, methodName, moduleName + "." + methodName + " parameters must be JSON primitive values.");
    });
  }
  function __autojs6_database_bridge_options(options, fallbackMs) {
    const input = __autojs6_database_options(options);
    return {
      timeoutMs: __autojs6_bridge_timeout_ms(input.timeoutMs === undefined ? fallbackMs : input.timeoutMs),
      signal: __autojs6_bridge_signal_from_options(input),
      permissions: ["database"]
    };
  }
  function __autojs6_database_transaction_operations(moduleName, operations) {
    if (typeof operations === "function") {
      throw __autojs6_database_invalid_argument_error(moduleName, "transaction", moduleName + ".transaction callback form is not supported by the controlled bridge.");
    }
    if (!Array.isArray(operations)) {
      throw __autojs6_database_invalid_argument_error(moduleName, "transaction", moduleName + ".transaction requires an array of operations.");
    }
    if (operations.length > 64) {
      throw __autojs6_database_invalid_argument_error(
        moduleName,
        "transaction",
        moduleName + ".transaction exceeded 64 operations.",
        "ERR_AUTOJS6_BRIDGE_RESOURCE_LIMIT"
      );
    }
    return operations.map(function(operation) {
      if (!operation || typeof operation !== "object" || Array.isArray(operation)) {
        throw __autojs6_database_invalid_argument_error(moduleName, "transaction", moduleName + ".transaction operations must be objects.");
      }
      const type = String(operation.type || operation.method || "").trim().toLowerCase();
      if (["exec", "run", "get", "all"].indexOf(type) < 0) {
        throw __autojs6_database_invalid_argument_error(moduleName, "transaction", moduleName + ".transaction supports only exec, run, get, and all operations.");
      }
      return {
        type,
        sql: __autojs6_database_sql(moduleName, "transaction", operation.sql),
        params: __autojs6_database_params(moduleName, "transaction", operation.params)
      };
    });
  }
  function __autojs6_limited_database(moduleName) {
    if (moduleName === "sqlite" && __autojs6_limited_sqlite_cache) {
      return __autojs6_limited_sqlite_cache;
    }
    if (moduleName === "database" && __autojs6_limited_database_cache) {
      return __autojs6_limited_database_cache;
    }
    function createDatabaseHandle(openResult) {
      const handleId = openResult && typeof openResult.id === "string" ? openResult.id : "";
      const databaseName = openResult && typeof openResult.name === "string" ? openResult.name : "";
      if (!handleId) {
        throw __autojs6_database_invalid_argument_error(moduleName, "open", moduleName + ".open did not receive a database handle from the bridge.");
      }
      let closed = false;
      function ensureOpen(methodName) {
        if (closed) {
          throw __autojs6_database_invalid_argument_error(moduleName, methodName, moduleName + " database handle is closed.");
        }
      }
      function call(methodName, args, options, fallbackMs) {
        ensureOpen(methodName);
        return __autojs6_call_autojs(
          moduleName,
          methodName,
          [handleId].concat(args || []),
          __autojs6_database_bridge_options(options, fallbackMs || 10000)
        );
      }
      function exec(sql, params, options) {
        return call("exec", [__autojs6_database_sql(moduleName, "exec", sql), __autojs6_database_params(moduleName, "exec", params)], options, 10000).then(function() {
          return undefined;
        });
      }
      function run(sql, params, options) {
        return call("run", [__autojs6_database_sql(moduleName, "run", sql), __autojs6_database_params(moduleName, "run", params)], options, 10000);
      }
      function get(sql, params, options) {
        return call("get", [__autojs6_database_sql(moduleName, "get", sql), __autojs6_database_params(moduleName, "get", params)], options, 10000);
      }
      function all(sql, params, options) {
        return call("all", [__autojs6_database_sql(moduleName, "all", sql), __autojs6_database_params(moduleName, "all", params)], options, 10000).then(function(result) {
          return Object.freeze(Array.isArray(result) ? result.slice() : []);
        });
      }
      function transaction(operations, options) {
        return call("transaction", [__autojs6_database_transaction_operations(moduleName, operations)], options, 15000);
      }
      function close(options) {
        if (closed) {
          return Promise.resolve(false);
        }
        return __autojs6_call_autojs(
          moduleName,
          "close",
          [handleId],
          __autojs6_database_bridge_options(options, 5000)
        ).then(function(result) {
          closed = true;
          return result === true;
        });
      }
      return Object.freeze({
        id: handleId,
        name: databaseName,
        exec,
        run,
        get,
        all,
        transaction,
        close
      });
    }
    function open(nameOrOptions, options) {
      const payload = __autojs6_database_open_payload(moduleName, nameOrOptions);
      return __autojs6_call_autojs(
        moduleName,
        "open",
        [payload],
        __autojs6_database_bridge_options(options === undefined ? nameOrOptions : options, 10000)
      ).then(createDatabaseHandle);
    }
    const moduleValue = moduleName === "sqlite"
      ? (function() {
          const sqlite = function(nameOrOptions, options) {
            return open(nameOrOptions, options);
          };
          Object.defineProperty(sqlite, "open", {
            value: open,
            enumerable: true
          });
          return Object.freeze(sqlite);
        })()
      : Object.freeze({ open });
    if (moduleName === "sqlite") {
      __autojs6_limited_sqlite_cache = moduleValue;
    } else {
      __autojs6_limited_database_cache = moduleValue;
    }
    return moduleValue;
  }
    return Object.freeze({database:__autojs6_limited_database("database"), sqlite:__autojs6_limited_database("sqlite")});
  }
// END GENERATED DATABASE

// BEGIN GENERATED SENSORS
// Shared with Node main threads and Workers by tools/host-client/sync-sensors.mjs.
  function __autojs6_create_sensors(call, EventEmitter, attachEvents, createError) {
    const policy = Object.freeze({maxSubscriptions:4, minSamplingIntervalMs:20, defaultSamplingIntervalMs:250,
      maxSamplingIntervalMs:60000, defaultTimeoutMs:5000, drainIntervalMs:100, defaultMaxQueueSize:16, hardMaxQueueSize:64});
    const number = (value, fallback, min, max) => Number.isFinite(Number(value ?? fallback))
      ? Math.min(max, Math.max(min, Math.trunc(Number(value ?? fallback)))) : fallback;
    const error = (message, code = "ERR_AUTOJS6_BRIDGE_INVALID_REQUEST") => createError ? createError(message,code) : Object.assign(new Error(message), {code, module:"sensors"});
    const options = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
    function descriptor(type, input) {
      type = String(type ?? "").trim().toLowerCase();
      if (!["accelerometer", "gyroscope", "light"].includes(type)) throw error("Sensors support only accelerometer, gyroscope, and light.");
      return {type, samplingIntervalMs:number(input.samplingIntervalMs ?? input.intervalMs,250,20,60000),
        maxQueueSize:number(input.maxQueueSize,16,1,64), timeoutMs:number(input.timeoutMs,5000,100,60000)};
    }
    function callOptions(input, fallback = 5000) {
      const value = options(input), signal = value.signal;
      if (signal !== undefined && !(signal instanceof AbortSignal)) throw new TypeError("signal must be an AbortSignal");
      return {timeoutMs:number(value.timeoutMs,fallback,1,120000),signal,permissions:["sensors"]};
    }
    const eventValue = value => Object.freeze({type:String(value?.type || ""),timestamp:Number(value?.timestamp || 0),
      accuracy:Number(value?.accuracy || 0),values:Object.freeze(Array.isArray(value?.values) ? value.values.map(Number) : [])});
    async function getAvailableSensors(input) {
      const result = await call("sensors","getAvailableSensors",[],callOptions(input));
      return Object.freeze((Array.isArray(result) ? result : []).map(value => Object.freeze({...value})));
    }
    function subscribe(type, callback, input) {
      if (callback !== undefined && typeof callback !== "function") throw error("sensors.subscribe requires a callback function.");
      const opts = options(input), request = descriptor(type,opts), transport = callOptions(opts), signal = transport.signal;
      const emitter = new EventEmitter();
      if (callback) emitter.on("event",callback);
      let id = "", subscriptionId, closed = false, timer, drain, stopEvents, closePromise, closeEmitted = false;
      const report = value => { if (emitter.listenerCount("error")) emitter.emit("error",value); };
      const closedEvent = () => { if (!closeEmitted) { closeEmitted=true; emitter.emit("close"); } };
      const detach = () => { clearTimeout(timer); if (stopEvents) { stopEvents(); stopEvents=null; } signal?.removeEventListener("abort",abort); };
      const abort = () => { subscription.close().catch(report); };
      function processEvent(event) {
        if (closed || !event || typeof event !== "object") return;
        if (event.type === "close") { closed=true; detach(); closedEvent(); }
        else if (event.type === "event") emitter.emit("event",eventValue(event.event));
        else if (event.type === "error") report(event.error || event);
        else if (event.type === "accuracy") emitter.emit("accuracy",event);
      }
      function schedule() {
        if (closed) return;
        timer=setTimeout(() => {
          if (closed) return;
          drain=call("sensors","drainEvents",[{id}],callOptions()).then(events => {
            for (const event of Array.isArray(events) ? events : []) processEvent(event);
          });
          drain.then(() => { drain=null; schedule(); }, reason => {
            drain=null;
            if (!closed) subscription.close().then(() => report(reason),report);
          });
        },number(opts.drainIntervalMs,100,25,5000));
      }
      const subscription = Object.freeze({
        on(event,listener) { emitter.on(event,listener); return this; },
        once(event,listener) { emitter.once(event,listener); return this; },
        off(event,listener) { emitter.off(event,listener); return this; },
        get id() { return id; }, get subscriptionId() { return subscriptionId; },
        get type() { return request.type; }, get closed() { return closed; }, get ready() { return ready; },
        close(closeOptions) {
          if (closePromise) return closePromise;
          closed=true; detach();
          // Registration is allowed to finish so cancellation cannot lose its native handle.
          // Cleanup must not inherit an already-aborted signal from the subscription.
          closePromise=ready.catch(() => {}).then(async () => {
            await Promise.resolve(drain).catch(() => {});
            if (id) await call("sensors","unsubscribe",[{id}],{...callOptions(closeOptions),signal:undefined});
            closedEvent();
          });
          return closePromise;
        }
      });
      const ready=Promise.resolve().then(async () => {
        if (signal?.aborted) throw signal.reason;
        const record=await call("sensors","subscribe",[request],{...transport,signal:undefined,events:!!attachEvents});
        id=String(record?.id || ""); subscriptionId=record?.subscriptionId;
        if (!id) throw error("Sensor subscription did not return a handle.");
        if (signal?.aborted) throw signal.reason;
        if (!closed) {
          stopEvents=attachEvents?.(record,processEvent);
          if (!stopEvents) schedule();
        }
      }).catch(reason => {
        closed=true; detach();
        if (id) return call("sensors","unsubscribe",[{id}],callOptions()).catch(() => {}).then(() => { id=""; throw reason; });
        throw reason;
      });
      if (signal) signal.addEventListener("abort",abort,{once:true});
      return subscription;
    }
    async function once(type, input) {
      const opts=options(input), spec=descriptor(type,opts), transport=callOptions(opts);
      if (transport.signal?.aborted) throw transport.signal.reason;
      const sub=subscribe(type,undefined,{...opts,signal:undefined});
      let timeout, abort;
      try {
        return await new Promise((resolve,reject) => {
          abort=() => reject(transport.signal.reason);
          transport.signal?.addEventListener("abort",abort,{once:true});
          timeout=setTimeout(() => reject(error("Sensor sampling timed out.","ERR_AUTOJS6_BRIDGE_TIMEOUT")),spec.timeoutMs);
          sub.once("event",resolve).once("error",reject);
          sub.ready.catch(reject);
        });
      } finally {
        clearTimeout(timeout); transport.signal?.removeEventListener("abort",abort);
        await sub.close();
      }
    }
    return Object.freeze({policy,getAvailableSensors,once,subscribe});
  }
// END GENERATED SENSORS

// BEGIN GENERATED SHELL
// Shared with Node main threads and Workers by tools/host-client/sync-shell.mjs.
  function __autojs6_create_shell(call, EventEmitter, streams, BufferClass, missingCapabilities = () => [], createError) {
    const fail=(message,code="ERR_AUTOJS6_BRIDGE_INVALID_REQUEST") => createError ? createError(message,code,"shell") : Object.assign(new Error(message),{code,module:"shell"});
    const abortError=signal => Object.assign(new Error("Shell operation was aborted",{cause:signal?.reason}),{name:"AbortError",code:"ABORT_ERR"});
    let defaultTimeout=30000;
    function options(value){if(value==null)return {};if(typeof value!=="object"||Array.isArray(value))throw fail("Shell options must be an object");return value;}
    function duration(value,fallback){value=value??fallback;if(!Number.isInteger(value)||value<0||value>2147483647)throw fail("Shell timeout must be a nonnegative integer");return value;}
    const quote=value=>"'"+String(value).replace(/'/g,"'\"'\"'")+"'";
    function normalize(value,lifetime=0){
      const opts=options(value),result={root:opts.root===true,shizuku:opts.shizuku===true||opts.adb===true,pty:opts.pty===true,timeoutMs:duration(opts.timeoutMs,lifetime),env:{},cwd:opts.cwd??""};
      for(const key of ["root","shizuku","adb","pty"])if(opts[key]!==undefined&&typeof opts[key]!=="boolean")throw fail(key+" must be boolean");
      if(typeof result.cwd!=="string"||result.cwd.includes("\0"))throw fail("cwd must be a string without NUL");
      if(opts.env!==undefined){const env=options(opts.env);for(const [name,value] of Object.entries(env)){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)||typeof value!=="string"||value.includes("\0"))throw fail("env requires valid names and string values without NUL");result.env[name]=value;}}
      if(opts.signal!==undefined&&!(opts.signal instanceof AbortSignal))throw fail("signal must be an AbortSignal");
      return result;
    }
    function start(method,command,input){
      const opts=options(input),descriptor=normalize(opts),signal=opts.signal;
      if(method==="spawn"&&(typeof command!=="string"||!command.trim()||command.includes("\0")))throw fail("command must be a non-empty string without NUL");
      if(method==="open"&&opts.cmd!==undefined){if(typeof opts.cmd!=="string"||!opts.cmd.trim()||opts.cmd.includes("\0"))throw fail("cmd must be a non-empty string without NUL");descriptor.cmd=opts.cmd;}
      const permissions=["shell",...(descriptor.root?["shell.root"]:[]),...(descriptor.shizuku?["shell.shizuku"]:[])];
      const emitter=new EventEmitter(),claimed={},lineReaders={},lineFlushers={},pipes={},blocked={stdout:false,stderr:false};
      let id="",pid=-1,mode=descriptor.shizuku?(descriptor.root?"adb+root":"adb"):(descriptor.root?"root":"sh"),closed=false,killed=false,exitCode=null,timedOut=false,timer=null,polling=false,closePromise,aborted=false;
      let resolveExit,rejectExit;const exited=new Promise((resolve,reject)=>{resolveExit=resolve;rejectExit=reject;});exited.catch(()=>{});
      const report=error=>{if(emitter.listenerCount("error"))emitter.emit("error",error);};
      const invoke=(name,args,extra={})=>call("shell",name,args,{timeoutMs:5000,permissions:["shell"],...extra});
      function end(code,error){
        if(closed)return;closed=true;exitCode=code;clearTimeout(timer);signal?.removeEventListener("abort",onAbort);
        for(const [name,stream] of Object.entries(pipes)){if(!stream.readableEnded)stream.push(null);lineFlushers[name]?.();}
        stdin.destroy();if(error){rejectExit(error);report(error);}else resolveExit(code);
        emitter.emit("exit",code);emitter.emit("close",code);
      }
      function schedule(delay=0){
        if(closed||!id||timer!==null||polling||blocked.stdout||blocked.stderr)return;
        timer=setTimeout(async()=>{
          timer=null;if(closed)return;polling=true;
          try{
            const batch=await invoke("drain",[id]);
            for(const event of Array.isArray(batch)?batch:[]){
              if(closed)break;
              if(event.type==="stdout"||event.type==="stderr"){if(!pipes[event.type].push(BufferClass.from(event.data,"base64")))blocked[event.type]=true;}
              else if(event.type==="end"){pipes[event.stream]?.push(null);lineFlushers[event.stream]?.();}
              else if(event.type==="error")throw fail(event.message||"Shell stream failed","ERR_AUTOJS6_BRIDGE_PROVIDER_FAILED");
              else if(event.type==="exit"){timedOut=event.timedOut===true;end(Number(event.code),aborted?abortError(signal):undefined);}
            }
          }catch(error){if(!closed){await invoke("close",[id]).catch(()=>{});end(null,error);}}
          finally{polling=false;schedule(duration(opts.drainIntervalMs,25));}
        },delay);
      }
      for(const name of ["stdout","stderr"]){pipes[name]=new streams.Readable({read(){blocked[name]=false;schedule();}});pipes[name].on("error",report);}
      const stdin=new streams.Writable({
        write(chunk,encoding,callback){ready.then(async()=>{const data=BufferClass.isBuffer(chunk)?chunk:BufferClass.from(chunk,encoding);for(let i=0;i<data.length;i+=8192)await invoke("write",[id,data.subarray(i,i+8192).toString("base64")]);}).then(()=>callback(),callback);},
        final(callback){ready.then(()=>invoke("closeInput",[id])).then(()=>callback(),callback);}
      });stdin.on("error",error=>{report(error);emitter.close().catch(()=>{});});
      function claim(name,kind){if(claimed[name]&&claimed[name]!==kind)throw fail(name+" is already used through "+claimed[name]);claimed[name]=kind;return pipes[name];}
      function readLine(name){
        const stream=claim(name,"lines");let reader=lineReaders[name];
        if(!reader){stream.setEncoding("utf8");reader=lineReaders[name]={iterator:stream[Symbol.asyncIterator](),text:"",ended:false,tail:Promise.resolve()};}
        const result=reader.tail.then(async()=>{
          while(true){const newline=reader.text.indexOf("\n");if(newline>=0){const line=reader.text.slice(0,newline).replace(/\r$/,"");reader.text=reader.text.slice(newline+1);return line;}
            if(reader.ended){const text=reader.text;reader.text="";return text||null;}
            const next=await reader.iterator.next();if(next.done)reader.ended=true;else reader.text+=next.value;
          }
        });reader.tail=result.catch(()=>{});return result;
      }

      function lineEvents(event){
        const name=event==="output"?"stdout":event==="errorOutput"?"stderr":null;if(!name||claimed[name]==="events")return;
        const stream=claim(name,"events");let text="";stream.setEncoding("utf8");
        stream.on("data",chunk=>{text+=chunk;let n;while((n=text.indexOf("\n"))>=0){const line=text.slice(0,n).replace(/\r$/,"");text=text.slice(n+1);emitter.emit(event,line);}});
        lineFlushers[name]=()=>{if(text){const rest=text;text="";emitter.emit(event,rest);}};stream.on("end",lineFlushers[name]);
      }
      for(const method of ["on","addListener","once","prependListener","prependOnceListener"]){const original=emitter[method];emitter[method]=function(event,listener){lineEvents(event);return original.call(this,event,listener);};}
      Object.defineProperties(emitter,{
        id:{get:()=>id},pid:{get:()=>pid},command:{value:method==="open"?descriptor.cmd||"sh /proc/self/fd/0":command},mode:{get:()=>mode},closed:{get:()=>closed},killed:{get:()=>killed},exitCode:{get:()=>exitCode},timedOut:{get:()=>timedOut},
        ready:{get:()=>ready},exited:{value:exited},stdin:{value:stdin},stdout:{get:()=>claim("stdout","raw")},stderr:{get:()=>claim("stderr","raw")}
      });
      Object.assign(emitter,{
        readLine:()=>readLine("stdout"),readErrorLine:()=>readLine("stderr"),
        write(data){return new Promise((resolve,reject)=>stdin.write(data,error=>error?reject(error):resolve(emitter)));},
        writeLine(text){if(typeof text!=="string")return Promise.reject(fail("writeLine requires a string"));return emitter.write(text+"\n");},
        closeInput(){return new Promise((resolve,reject)=>{if(closed||stdin.writableFinished)return resolve(emitter);stdin.end(error=>error?reject(error):resolve(emitter));});},
        async waitFor(timeoutMs){if(timeoutMs===undefined)return exited;const millis=duration(timeoutMs,0);let timeout;try{return await Promise.race([exited,new Promise(resolve=>timeout=setTimeout(()=>resolve(null),millis))]);}finally{clearTimeout(timeout);}},
        async kill(){await ready;if(closed)return false;killed=true;const alive=await invoke("kill",[id]);schedule();return alive;},
        close(){if(closePromise)return closePromise;closePromise=ready.catch(()=>{}).then(async()=>{if(closed)return false;killed=true;try{const status=await invoke("close",[id]);end(Number(status?.code??-1),aborted?abortError(signal):undefined);return status?.wasAlive===true;}catch(error){end(null,error);throw error;}});return closePromise;}
      });
      function onAbort(){aborted=true;emitter.close().catch(()=>{});}
      const ready=Promise.resolve().then(async()=>{
        if(signal?.aborted)throw abortError(signal);
        const record=await invoke(method,method==="open"?[descriptor]:[command,descriptor],{permissions,timeoutMs:15000});
        id=String(record?.id||"");pid=Number(record?.pid??-1);mode=String(record?.mode||mode);
        if(!id)throw fail("Shell start returned no process handle");
        if(signal?.aborted){await invoke("close",[id]).catch(()=>{});throw abortError(signal);}
        schedule();
      }).catch(error=>{end(null,error);throw error;});ready.catch(()=>{});
      signal?.addEventListener("abort",onAbort,{once:true});
      return emitter;
    }
    function spawn(command,opts){return start("spawn",command,opts);}
    function open(opts){return start("open",null,opts);}
    async function exec(command,input){
      const opts=options(input),limit=opts.maxOutputBytes??1048576;if(!Number.isInteger(limit)||limit<1)throw fail("maxOutputBytes must be a positive integer");
      const child=spawn(command,{...opts,timeoutMs:duration(opts.timeoutMs,defaultTimeout)}),out=[],err=[];let bytes=0,truncated=false;
      const collect=target=>chunk=>{const keep=Math.min(chunk.length,Math.max(0,limit-bytes));if(keep)target.push(chunk.subarray(0,keep));bytes+=keep;if(keep<chunk.length)truncated=true;};
      child.stdout.on("data",collect(out));child.stderr.on("data",collect(err));
      try{await child.ready;await child.closeInput();const code=await child.waitFor();return Object.freeze({code,stdout:BufferClass.concat(out).toString("utf8"),stderr:BufferClass.concat(err).toString("utf8")+(child.timedOut?"\nAutoJs6 shell command timed out after "+duration(opts.timeoutMs,defaultTimeout)+"ms.":""),timedOut:child.timedOut,truncated});}
      finally{await child.close().catch(()=>{});}
    }
    function execRoot(command,opts){return exec(command,{...options(opts),root:true});}
    function execShizuku(command,opts){return exec(command,{...options(opts),shizuku:true});}
    function execFile(file,args=[],opts){if(typeof file!=="string"||!file||file.includes("\0")||!Array.isArray(args)||args.some(a=>typeof a!=="string"||a.includes("\0")))return Promise.reject(fail("execFile requires a path and string arguments without NUL"));return exec([file.includes("/")?file:"./"+file,...args].map(quote).join(" "),opts);}
    function checkAccess(input){const opts=options(input),required=["shell",...(opts.root?["shell.root"]:[]),...(opts.shizuku||opts.adb?["shell.shizuku"]:[])],missing=missingCapabilities(required);return Object.freeze({shell:!missing.includes("shell"),root:opts.root===true&&!missing.includes("shell.root"),shizuku:(opts.shizuku===true||opts.adb===true)&&!missing.includes("shell.shizuku"),missingCapabilities:Object.freeze(missing.slice())});}
    async function getAccess(opts){return Object.freeze(await call("shell","getAccess",[],{timeoutMs:5000,...options(opts),permissions:["shell"]}));}
    function setDefaultTimeout(ms){if(!Number.isFinite(ms)||ms<=0)throw fail("Default timeout must be positive");return defaultTimeout=duration(ms,defaultTimeout);}
    const requestShizukuPermission=opts=>call("shell","requestShizukuPermission",[],{timeoutMs:60000,...options(opts),permissions:["shell","shell.shizuku"]});
    const shell=Object.freeze({exec,execRoot,execShizuku,execFile,checkAccess,getAccess,setDefaultTimeout,spawn,open,requestShizukuPermission});
    const shizuku=Object.assign((command,opts)=>execShizuku(command,opts),{exec:execShizuku,spawn:(command,opts)=>spawn(command,{...options(opts),shizuku:true}),open:opts=>open({...options(opts),shizuku:true}),checkAccess:opts=>checkAccess({...options(opts),shizuku:true}),getAccess,requestPermission:requestShizukuPermission});
    return Object.freeze({shell,shizuku:Object.freeze(shizuku)});
  }

// END GENERATED SHELL

// BEGIN GENERATED EVENT FACADES
  function __autojs6_create_host_events(call, EventEmitter, attachEvents, createError) {
    const moduleEmitter = new EventEmitter(), subscriptions = new Map();
    const error = message => createError ? createError(message, "ERR_AUTOJS6_BRIDGE_INVALID_REQUEST", "events") : Object.assign(new TypeError(message), {code:"ERR_AUTOJS6_BRIDGE_INVALID_REQUEST"});
    const abortError = () => Object.assign(new Error("Event observation was aborted."), {name:"AbortError",code:"ABORT_ERR"});
    const options = value => {
      if (value === undefined) return {};
      if (!value || typeof value !== "object" || Array.isArray(value)) throw error("Event options must be an object.");
      if (value.signal !== undefined && (typeof value.signal?.addEventListener !== "function" || typeof value.signal?.removeEventListener !== "function")) throw error("signal must be an AbortSignal.");
      if (value.drainIntervalMs !== undefined && (!Number.isInteger(value.drainIntervalMs) || value.drainIntervalMs < 25 || value.drainIntervalMs > 60000)) throw error("drainIntervalMs must be an integer in 25..60000.");
      return value;
    };
    const required = method => ["events", ...({observeNotification:["events.notification"],observeToast:["events.toast"],observeKey:["events.key"]}[method] || [])];
    const invoke = (method,args,opts={}) => call("events",method,args,{timeoutMs:5000,...opts,permissions:required(method)});
    let closing = false, generation = 0;
    function observe(method, input) {
      let opts;
      try { opts=options(input); if(opts.signal?.aborted)throw abortError(); if(closing)throw error("Event observers are closing."); }
      catch(e){return Promise.reject(e);}
      if(subscriptions.has(method))return subscriptions.get(method).promise;
      const entry={promise:null,refresh:()=>{}}, current=generation;
      entry.promise=(async()=>{
        // Keep late replies deliverable, so abort/Worker shutdown can release the native observer.
        const record=await invoke(method,[],{...opts,signal:undefined,events:!!attachEvents});
        if(opts.signal?.aborted || current!==generation){await invoke("close",[record.id]).catch(()=>{});throw abortError();}
        const emitter=new EventEmitter(), buffered=[];
        let closed=false,timer=null,draining=null,stopEvents=null,closePromise=null,dropped=0;
        const kinds={broadcast:["screen_on","screen_off","battery_changed"],notification:["notification"],toast:["toast"],key:["key"]};
        const names=["event","error","close","overflow",...(kinds[record.source]||[])];
        const count=()=>emitter.eventNames().reduce((n,key)=>n+emitter.listenerCount(key),0)+names.reduce((n,key)=>n+moduleEmitter.listenerCount(key),0);
        const detach=()=>{if(timer!==null){clearTimeout(timer);timer=null;}if(stopEvents){stopEvents();stopEvents=null;}opts.signal?.removeEventListener("abort",onAbort);};
        function forget(){closed=true;detach();if(subscriptions.get(method)===entry)subscriptions.delete(method);}
        const emit=(target,name,value)=>{if(name!=="error"||target.listenerCount("error"))target.emit(name,value);};
        function publish(event){
          emit(emitter,"event",event);emit(moduleEmitter,"event",event);
          if(event.type!=="event"){emit(emitter,event.type,event);emit(moduleEmitter,event.type,event);}
        }
        function receive(raw){
          if(closed)return;
          const event=Object.freeze({...raw,source:raw.source||record.source});
          try {
            if(count())publish(event);
            else {if(buffered.length===128){buffered.shift();dropped++;}buffered.push(event);}
          } finally {
            if(event.type==="close")forget();else refresh();
          }
        }
        function flush(){
          if(!count())return;
          if(dropped){publish(Object.freeze({type:"overflow",source:record.source,time:Date.now(),dropped}));dropped=0;}
          while(buffered.length&&count())publish(buffered.shift());
          refresh();
        }
        function refresh(){
          if(closed)return;
          if(stopEvents)stopEvents.ref?.(count()>0);
          if(count()&&buffered.length)queueMicrotask(flush);
          if(!count()&&timer!==null){clearTimeout(timer);timer=null;}
          if(!stopEvents&&count()&&timer===null&&!draining)timer=setTimeout(poll,opts.drainIntervalMs??100);
        }
        function fail(e){
          if(closed)return;
          try {emit(emitter,"error",e);emit(moduleEmitter,"error",e);}
          finally {api.close().catch(()=>{});}
        }
        function poll(){
          timer=null;if(closed)return;
          draining=invoke("drainEvents",[record.id]);
          draining.then(events=>{for(const event of events)receive(event);}).catch(fail).finally(()=>{draining=null;refresh();});
        }
        function onAbort(){fail(abortError());}
        const api=Object.freeze({
          id:record.id,source:record.source,get closed(){return closed;},
          on(name,listener){emitter.on(name,listener);refresh();return api;},
          once(name,listener){emitter.once(name,listener);refresh();return api;},
          off(name,listener){emitter.off(name,listener);refresh();return api;},
          async drainEvents(callOptions){
            if(draining)await draining;
            const events=buffered.splice(0);
            if(dropped){events.unshift(Object.freeze({type:"overflow",source:record.source,time:Date.now(),dropped}));dropped=0;}
            if(!closed&&!stopEvents)for(const raw of await invoke("drainEvents",[record.id],options(callOptions))){
              const event=Object.freeze({...raw,source:raw.source||record.source});events.push(event);if(event.type==="close")forget();
            }
            return Object.freeze(events);
          },
          close(callOptions){
            if(closed)return Promise.resolve(false);
            if(closePromise)return closePromise;
            let control;try{control=options(callOptions);}catch(e){return Promise.reject(e);}
            forget();buffered.length=0;
            closePromise=invoke("close",[record.id],{...control,signal:undefined}).then(Boolean).finally(()=>publish(Object.freeze({type:"close",source:record.source,time:Date.now(),reason:"closed"})));
            return closePromise;
          }
        });
        entry.refresh=refresh;
        if(attachEvents)stopEvents=attachEvents(record,receive,false);
        opts.signal?.addEventListener("abort",onAbort,{once:true});
        if(opts.signal?.aborted){await api.close();throw abortError();}
        refresh();return api;
      })().catch(e=>{if(subscriptions.get(method)===entry)subscriptions.delete(method);throw e;});
      subscriptions.set(method,entry);return entry.promise;
    }
    function listen(name,listener,once){
      moduleEmitter[once?"once":"on"](name,listener);
      if(["screen_on","screen_off","battery_changed"].includes(name))observe("observeBroadcasts").catch(e=>{if(moduleEmitter.listenerCount("error"))moduleEmitter.emit("error",e);});
      for(const sub of subscriptions.values())sub.refresh();
      return api;
    }
    const api=Object.freeze({
      observeNotification:opts=>observe("observeNotification",opts),observeToast:opts=>observe("observeToast",opts),
      observeKey:opts=>observe("observeKey",opts),observeBroadcasts:opts=>observe("observeBroadcasts",opts),
      on:(name,listener)=>listen(name,listener,false),once:(name,listener)=>listen(name,listener,true),
      off(name,listener){moduleEmitter.off(name,listener);for(const sub of subscriptions.values())sub.refresh();return api;},
      async close(opts){
        options(opts);closing=true;generation++;
        try{
          const results=await Promise.allSettled([...subscriptions.values()].map(entry=>entry.promise.then(sub=>sub.close(opts))));
          const failed=results.find(row=>row.status==="rejected"&&row.reason?.code!=="ABORT_ERR");if(failed)throw failed.reason;
        }finally{moduleEmitter.removeAllListeners();closing=false;}
      }
    });
    return api;
  }
  function __autojs6_create_notifications(call, createError, scope="notifications-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)) {
    const error=message=>createError?createError(message,"ERR_AUTOJS6_BRIDGE_INVALID_REQUEST","notifications"):Object.assign(new TypeError(message),{code:"ERR_AUTOJS6_BRIDGE_INVALID_REQUEST"});
    const options=value=>{if(value===undefined)return {};if(!value||typeof value!=="object"||Array.isArray(value))throw error("Notification options must be an object.");if(value.signal!==undefined&&(typeof value.signal?.addEventListener!=="function"||typeof value.signal?.removeEventListener!=="function"))throw error("signal must be an AbortSignal.");return value;};
    const id=value=>{const n=Number(value);if(!Number.isInteger(n)||n<1||n>2147483647)throw error("Notification id must be an integer in 1..2147483647.");return n;};
    const invoke=(method,args,input)=>{const opts=options(input);return call("notifications",method,args,{timeoutMs:5000,...opts,permissions:method==="openSettings"?["notifications","notifications.settings"]:["notifications"]});};
    async function notify(input,callOptions){
      if(!input||typeof input!=="object"||Array.isArray(input))throw error("notify requires an options object.");
      const opts=options(callOptions),payload={};
      for(const key of ["id","title","text","channel","channelName","ongoing","priority"])if(input[key]!==undefined)payload[key]=key==="id"?id(input[key]):input[key];
      const abort=()=>Object.assign(new Error("Notification posting was aborted."),{name:"AbortError",code:"ABORT_ERR"});
      if(opts.signal?.aborted)throw abort();
      const result=Number(await invoke("notify",[payload,scope],{...opts,signal:undefined}));
      if(opts.signal?.aborted){await invoke("cancel",[result,scope]).catch(()=>{});throw abort();}
      return result;
    }
    async function openSettings(input){const opts=options(input);return Object.freeze({...await invoke("openSettings",[{dryRun:opts.dryRun===true}],opts)});}
    return Object.freeze({notify,
      async cancel(value,opts){await invoke("cancel",[id(value),scope],opts);},
      async cancelAll(opts){await invoke("cancelAll",[scope],opts);},
      async getPermissionStatus(opts){return Object.freeze({...await invoke("getPermissionStatus",[],opts)});},
      openSettings,openNotificationSettings:openSettings});
  }
// END GENERATED EVENT FACADES

// BEGIN GENERATED DEVICE DIALOG FACADES
  // Shared device and dialog facades for Node main threads, Workers and Bun.
  function __autojs6_create_device(call, snapshot = {}, scope = "device-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)) {
    const invoke = (method, args, options = {}, power = false) => call("device", method, args,
      { timeoutMs: 5000, ...options, permissions: power ? ["device", "device.power"] : ["device"] });
    const invalid = message => Object.assign(new TypeError(message), {code:"ERR_AUTOJS6_BRIDGE_INVALID_REQUEST"});
    const info = options => invoke("info", [], options);
    const control = async (method, value, options) => {
      if (!Number.isSafeInteger(value) || (method === "setBrightness" ? value < 0 || value > 255 : value !== 0 && value !== 1)) throw invalid("Invalid device." + method + " value.");
      await invoke(method, [value], options, true);
    };
    const api = {...snapshot, info, getInfo: info,
      setBrightness: (value, opts) => control("setBrightness", value, opts),
      setBrightnessMode: (value, opts) => control("setBrightnessMode", value, opts),
      async keepScreenOn(timeoutMs, options = {}) {
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw invalid("keepScreenOn requires a positive integer timeout.");
        const abort = () => Object.assign(new Error("Keeping the screen awake was aborted."), {name:"AbortError",code:"ABORT_ERR"});
        if (options.signal?.aborted) throw abort();
        await invoke("keepScreenOn", [timeoutMs, scope], {...options, signal:undefined}, true);
        if (options.signal?.aborted) { await api.cancelKeepingAwake(); throw abort(); }
      },
      async cancelKeepingAwake(options) { await invoke("cancelKeepingAwake", [scope], options, true); },
      async isScreenOn(options) { return await invoke("isScreenOn", [], options) === true; },
      async wakeUp(options) { await invoke("wakeUp", [], options); },
      async vibrate(value, options) {
        const duration = Number(value);
        if (!Number.isFinite(duration) || duration < 0) throw invalid("vibrate requires a non-negative finite duration.");
        await invoke("vibrate", [Math.min(10000, Math.trunc(duration))], options);
      },
      async isIgnoringBatteryOptimizations(options) { return await invoke("isIgnoringBatteryOptimizations", [], options, true) === true; },
      async openBatteryOptimizationSettings(options = {}) { return Object.freeze({...await invoke("openBatteryOptimizationSettings", [{dryRun:options.dryRun === true}], options, true)}); }
    };
    const fields = {getWidth:["screen","width"],getHeight:["screen","height"],getDensity:["screen","density"],getDensityDpi:["screen","densityDpi"],
      getBrightness:["screen","brightness"],getBrightnessMode:["screen","brightnessMode"],getBattery:["battery","percent"],isCharging:["battery","isCharging"],
      getTotalMem:["memory","totalMem"],getAvailMem:["memory","availMem"]};
    for (const key of ["sdkInt","release","model","brand","product","board","bootloader","hardware","fingerprint","buildId"]) fields["get"+key[0].toUpperCase()+key.slice(1)] = ["build",key];
    for (const [method,[section,key]] of Object.entries(fields)) api[method] = async options => {
      const value = (await info(options))?.[section];
      if (value?.[key] === undefined || value[key] === null) throw new Error("device."+method+": "+(value?.error || "device information unavailable"));
      return value[key];
    };
    for (const [name,stream] of [["Music","music"],["Notification","notification"],["Alarm","alarm"]]) {
      const audio = (method,args,options={}) => call("media",method,args,{timeoutMs:5000,...options,permissions:["media","media.audio"]});
      api["get"+name+"Volume"] = options => audio("getAudioStreamVolume",[stream],options).then(Number);
      api["get"+name+"MaxVolume"] = options => audio("getAudioStreamMaxVolume",[stream],options).then(Number);
      api["set"+name+"Volume"] = async (value,options) => {
        if (!Number.isSafeInteger(value) || value < 0) throw invalid("Volume must be a non-negative integer.");
        await audio("setAudioStreamVolume",[stream,value],options);
      };
    }
    return Object.freeze(api);
  }
  function __autojs6_create_dialogs(call, scope = "dialogs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)) {
    let sequence = 0;
    const text = value => value == null ? "" : String(value);
    const invoke = (method,args,options={},timeoutMs=30000) => call("dialogs",method,args,{timeoutMs,...options,permissions:["dialogs"]});
    const invalid = message => Object.assign(new TypeError(message),{code:"ERR_AUTOJS6_BRIDGE_INVALID_REQUEST"});
    const presentation = options => Object.fromEntries(["positive","negative","neutral"].filter(key => options?.[key] !== undefined).map(key => [key,text(options[key])]));
    async function show(method,args,options = {},descriptor) {
      const token = scope + ":" + (++sequence);
      const payload = {...(descriptor || presentation(options)),__scope:scope,__requestId:token};
      const cancel = () => invoke("cancelRequest",[token,scope],{},5000).catch(()=>{});
      // The native token also covers cancellation before the Activity is attached.
      try { return await invoke(method,[...args,payload],options,method === "progressShow" ? 10000 : 30000); }
      catch (error) { await cancel(); throw error; }
    }
    function message(method,title,value,options) {
      if (value && typeof value === "object" && !Array.isArray(value)) { options=value; value=""; }
      return show(method,[text(title),text(value)],options);
    }
    function choose(method,title,items,selected,options) {
      if (!Array.isArray(items)) return Promise.reject(invalid("Dialog choices must be an array."));
      if (method === "singleChoice" && (!Number.isInteger(selected) || selected < -1 || selected >= items.length)) return Promise.reject(invalid("Selected index is out of range."));
      if (method === "multiChoice" && (!Array.isArray(selected) || selected.some(index => !Number.isInteger(index) || index < 0 || index >= items.length))) return Promise.reject(invalid("Selected indices are out of range."));
      return show(method,[text(title),items.map(text),...(method === "select" ? [] : [selected])],options);
    }
    const progress = Object.freeze({
      async show(descriptor = {}, options) {
        let state = await show("progressShow",[],options,descriptor);
        const handle = {id:state.id,
          async update(patch,opts) { state = await progress.update(state.id,patch,opts); return state; },
          async dismiss(opts) { const result = await progress.dismiss(state.id,opts); state={...state,shown:false}; return result; }
        };
        for (const key of ["title","message","shown","max","value","indeterminate"]) Object.defineProperty(handle,key,{enumerable:true,get:()=>state[key]});
        return Object.freeze(handle);
      },
      async update(id,patch,options) { return Object.freeze({...await invoke("progressUpdate",[id,patch,scope],options,5000)}); },
      dismiss:(id,options) => invoke("progressDismiss",[id,scope],options,5000)
    });
    const input = (title,value,options) => message("input",title,value,options);
    return Object.freeze({
      async alert(title,value,options) { await message("alert",title,value,options); },
      async confirm(title,value,options) { return await message("confirm",title,value,options) === true; },
      input,prompt:input,rawInput:(title,value,options)=>message("rawInput",title,value,options),
      select:(title,items,options)=>choose("select",title,items,undefined,options),
      singleChoice:(title,items,selected=-1,options)=>choose("singleChoice",title,items,selected,options),
      multiChoice:(title,items,selected=[],options)=>choose("multiChoice",title,items,selected,options),progress
    });
  }
// END GENERATED DEVICE DIALOG FACADES

// BEGIN GENERATED ANDROID TASK FACADES
  // Shared native Android helpers, colors and calendar task facades.
  function __autojs6_create_android(call, toColor = value => Number(value)) {
    const invoke=(method,args,options={})=>call("android",method,args,{timeoutMs:5000,...options,permissions:["android.objects"]});
    const freeze=value=>{if(value&&typeof value==="object"){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
    const id=value=>typeof value==='string'?value:value?.id;
    async function create(method,payload,options={}) {
      const abort=()=>Object.assign(new Error('Android object creation was aborted.'),{name:'AbortError',code:'ABORT_ERR'});
      if(options.signal?.aborted)throw abort();
      let state=await invoke(method,[payload],{...options,signal:undefined}),closed=false;
      if(options.signal?.aborted){await invoke('close',[state.id]).catch(()=>{});throw abort();}
      state=freeze(state);const handle={};
      for(const key of Object.keys(state))Object.defineProperty(handle,key,{enumerable:true,get:()=>state[key]});
      const methods={toJSON:()=>state,async close(opts){if(closed)return false;const result=await invoke('close',[state.id],opts);closed=true;return result;}};
      if(method==='createPaint')Object.assign(methods,{
        async getInfo(opts){state=freeze(await invoke('getPaintInfo',[state.id],opts));return state;},
        async setColor(color,opts){await invoke('setPaintColor',[state.id,toColor(color)],opts);state=freeze({...state,color:toColor(color)});},
        measureText:(text,opts)=>invoke('measureText',[state.id,String(text)],opts)
      });else methods.getColorForState=(states=[],fallback=state.defaultColor,opts)=>invoke('getColorForState',[state.id,states,toColor(fallback)],opts);
      for(const [key,value] of Object.entries(methods))Object.defineProperty(handle,key,{value});
      return Object.freeze(handle);
    }
    const api={
      createPaint(options={},control){return create('createPaint',{...options,...(options.color===undefined?{}:{color:toColor(options.color)})},control);},
      createColorStateList(descriptor,control){
        if(!descriptor||!Array.isArray(descriptor.colors)||!Array.isArray(descriptor.states)||descriptor.colors.length!==descriptor.states.length||!descriptor.colors.length)throw new TypeError('Color states and colors must have equal non-zero lengths.');
        return create('createColorStateList',{states:descriptor.states,colors:descriptor.colors.map(toColor)},control);
      },
      async setPaintColor(paint,color,options){
        if(paint?.__autojs6AndroidObject!=='paint'||!id(paint))throw new TypeError('setPaintColor requires a Paint handle.');
        if(typeof paint.setColor==='function')await paint.setColor(color,options);else await invoke('setPaintColor',[id(paint),toColor(color)],options);
      },
      async getThemeColor(options){return freeze(await invoke('getThemeColor',[],options));},
      async getUriForFile(path,options){return freeze(await invoke('getUriForFile',[String(path)],options));},
      async parseUri(uri,options){return uri==null?null:freeze(await invoke('parseUri',[String(uri)],options));}
    };
    return Object.freeze(api);
  }
  function __autojs6_create_tasks(call) {
    const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
    const options=value=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Task options must be an object.');return value;};
    const payload=input=>{const {signal,timeoutMs,...value}=options(input);for(const key of ['time','date'])if(value[key] instanceof Date)value[key]=value[key].getTime();return value;};
    const invoke=(method,args,input={})=>call('tasks',method,args,{timeoutMs:5000,...input,permissions:['tasks']});
    const identity=value=>{
      const n=Number(value&&typeof value==='object'?value.id:value);
      if(!Number.isSafeInteger(n)||n<=0)throw new TypeError('Task id must be a positive integer.');return n;
    };
    async function add(method,input) {
      const opts=options(input),abort=()=>Object.assign(new Error('Task registration was aborted.'),{name:'AbortError',code:'ABORT_ERR'});
      if(opts.signal?.aborted)throw abort();
      const task=await invoke(method,[payload(opts)],{...opts,signal:undefined});
      if(opts.signal?.aborted){await invoke(task.kind==='intent'?'removeIntentTask':'removeTimedTask',[task.id]).catch(()=>{});throw abort();}
      return freeze(task);
    }
    const api={
      addTask:input=>input?.kind==='intent'||input?.action!==undefined?add('addIntentTask',input):add('addTimedTask',input),
      addTimedTask:input=>add('addTimedTask',input),addIntentTask:input=>add('addIntentTask',input),addBroadcastIntentTask:input=>add('addIntentTask',input),
      async queryTimedTasks(input={}){return freeze(await invoke('queryTimedTasks',[payload(input)],input));},
      async queryIntentTasks(input={}){return freeze(await invoke('queryIntentTasks',[payload(input)],input));},
      async queryTasks(input={}){return freeze([...(await api.queryTimedTasks(input)),...(await api.queryIntentTasks(input))]);},
      async getTimedTask(value,opts){return freeze(await invoke('getTimedTask',[identity(value)],opts));},
      async getIntentTask(value,opts){return freeze(await invoke('getIntentTask',[identity(value)],opts));},
      removeTimedTask:(value,opts)=>invoke('removeTimedTask',[identity(value)],opts),
      removeIntentTask:(value,opts)=>invoke('removeIntentTask',[identity(value)],opts),
      removeTask:(value,opts)=>value?.kind==='intent'?api.removeIntentTask(value,opts):api.removeTimedTask(value,opts),
      async updateTask(task,patch={}) {
        const input={...(task.options?{}:task),...patch,id:identity(task),kind:task.kind};delete input.options;
        return freeze(await invoke('updateTask',[payload(input)],patch));
      },
      sendLocalBroadcastSync:(action,opts)=>invoke('sendLocalBroadcastSync',[typeof action==='string'?action:payload(action)],opts),
      daysToTimeFlag(days){if(!Array.isArray(days)||days.some(day=>!Number.isInteger(day)||day<0||day>6))throw new TypeError('Days must be integers in 0..6.');return days.reduce((mask,day)=>mask|(1<<day),0);},
      timeFlagToDays(flag){if(!Number.isInteger(flag)||flag<0||flag>127)throw new TypeError('Weekday flag must be an integer in 0..127.');return Object.freeze([0,1,2,3,4,5,6].filter(day=>(flag&(1<<day))!==0));}
    };
    for(const mode of ['Daily','Weekly','Monthly','Yearly','Disposable','Countdown'])api['add'+mode+'Task']=input=>add('addTimedTask',{...options(input),repeatMode:mode.toLowerCase()});
    return Object.freeze(api);
  }
  function __autojs6_create_colors(android) {
    let __autojs6_limited_colors_cache;
    const __autojs6_invalid_arg_type=message=>new TypeError(message);
  const __autojs6_color_names = Object.freeze({
    black: 0xff000000,
    white: 0xffffffff,
    red: 0xffff0000,
    green: 0xff00ff00,
    blue: 0xff0000ff,
    yellow: 0xffffff00,
    cyan: 0xff00ffff,
    magenta: 0xffff00ff,
    transparent: 0x00000000,
    gray: 0xff808080,
    grey: 0xff808080
  });
  function __autojs6_color_byte(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw __autojs6_invalid_arg_type("colors." + name + " component must be a finite number.");
    }
    const scaled = number >= 0 && number <= 1 && !Number.isInteger(number)
      ? number * 255
      : number;
    return Math.max(0, Math.min(255, Math.round(scaled)));
  }
  function __autojs6_color_component(value, shift) {
    return (__autojs6_color_uint(value) >>> shift) & 0xff;
  }
  function __autojs6_color_int(value) {
    return (__autojs6_color_uint(value) | 0);
  }
  function __autojs6_color_uint(value) {
    if (typeof value === "number") {
      return value >>> 0;
    }
    if (typeof value === "bigint") {
      return Number(value & 0xffffffffn) >>> 0;
    }
    if (typeof value === "string") {
      const text = value.trim();
      const named = __autojs6_color_names[text.toLowerCase()];
      if (named !== undefined) {
        return named >>> 0;
      }
      const hex = text.charAt(0) === "#" ? text.slice(1) : text;
      if (/^[0-9a-f]{3}$/i.test(hex)) {
        const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        return __autojs6_color_argb_uint(255, r, g, b);
      }
      if (/^[0-9a-f]{4}$/i.test(hex)) {
        const a = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        const r = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        const g = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        const b = parseInt(hex.charAt(3) + hex.charAt(3), 16);
        return __autojs6_color_argb_uint(a, r, g, b);
      }
      if (/^[0-9a-f]{6}$/i.test(hex)) {
        return (0xff000000 | parseInt(hex, 16)) >>> 0;
      }
      if (/^[0-9a-f]{8}$/i.test(hex)) {
        return parseInt(hex, 16) >>> 0;
      }
    }
    if (value && typeof value === "object") {
      if (typeof value.color === "number") {
        return value.color >>> 0;
      }
      if (typeof value.colorPrimary === "number") {
        return value.colorPrimary >>> 0;
      }
      if ("a" in value || "r" in value || "g" in value || "b" in value) {
        return __autojs6_color_argb_uint(
          value.a === undefined ? 255 : value.a,
          value.r === undefined ? 0 : value.r,
          value.g === undefined ? 0 : value.g,
          value.b === undefined ? 0 : value.b
        );
      }
    }
    throw __autojs6_invalid_arg_type("colors value cannot be converted to an ARGB integer.");
  }
  function __autojs6_color_argb_uint(a, r, g, b) {
    return (
      (__autojs6_color_byte(a, "argb") << 24) |
      (__autojs6_color_byte(r, "argb") << 16) |
      (__autojs6_color_byte(g, "argb") << 8) |
      __autojs6_color_byte(b, "argb")
    ) >>> 0;
  }
  function __autojs6_color_hex_pair(value) {
    return value.toString(16).padStart(2, "0");
  }
  function __autojs6_color_to_full_hex(value) {
    const color = __autojs6_color_uint(value);
    return "#" +
      __autojs6_color_hex_pair((color >>> 24) & 0xff) +
      __autojs6_color_hex_pair((color >>> 16) & 0xff) +
      __autojs6_color_hex_pair((color >>> 8) & 0xff) +
      __autojs6_color_hex_pair(color & 0xff);
  }
  function __autojs6_color_to_hex(value, alphaOrLength) {
    const color = __autojs6_color_uint(value);
    const includeAlpha = alphaOrLength === true || Number(alphaOrLength) === 8;
    const body = __autojs6_color_hex_pair((color >>> 16) & 0xff) +
      __autojs6_color_hex_pair((color >>> 8) & 0xff) +
      __autojs6_color_hex_pair(color & 0xff);
    return includeAlpha ? "#" + __autojs6_color_hex_pair((color >>> 24) & 0xff) + body : "#" + body;
  }
  function __autojs6_color_set_component(value, shift, component) {
    const color = __autojs6_color_uint(value);
    const mask = ~(0xff << shift);
    return (((color & mask) | (__autojs6_color_byte(component, "setComponent") << shift)) >>> 0) | 0;
  }
  function __autojs6_color_remove_component(value, shift) {
    return __autojs6_color_set_component(value, shift, 0);
  }
  function __autojs6_color_round_alpha(value, keepTrailingZero) {
    const rounded = Math.round(value * 1000) / 1000;
    if (rounded === 1 && keepTrailingZero !== false) {
      return "1.0";
    }
    return String(rounded).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  function __autojs6_color_rgb_array(value) {
    return [
      __autojs6_color_component(value, 16),
      __autojs6_color_component(value, 8),
      __autojs6_color_component(value, 0)
    ];
  }
  function __autojs6_color_argb_array(value) {
    return [
      __autojs6_color_component(value, 24),
      __autojs6_color_component(value, 16),
      __autojs6_color_component(value, 8),
      __autojs6_color_component(value, 0)
    ];
  }
  function __autojs6_color_rgb_to_hsv(r, g, b) {
    const rn = __autojs6_color_byte(r, "hsv") / 255;
    const gn = __autojs6_color_byte(g, "hsv") / 255;
    const bn = __autojs6_color_byte(b, "hsv") / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
      if (max === rn) {
        hue = 60 * (((gn - bn) / delta) % 6);
      } else if (max === gn) {
        hue = 60 * (((bn - rn) / delta) + 2);
      } else {
        hue = 60 * (((rn - gn) / delta) + 4);
      }
    }
    if (hue < 0) hue += 360;
    const saturation = max === 0 ? 0 : delta / max;
    return [hue, saturation, max];
  }
  function __autojs6_color_hsv_to_rgb(h, s, v) {
    const hue = ((((Number(h) || 0) % 360) + 360) % 360) / 60;
    const saturation = Math.max(0, Math.min(1, Number(s) > 1 ? Number(s) / 100 : Number(s) || 0));
    const value = Math.max(0, Math.min(1, Number(v) > 1 ? Number(v) / 100 : Number(v) || 0));
    const c = value * saturation;
    const x = c * (1 - Math.abs((hue % 2) - 1));
    const m = value - c;
    let rgb;
    if (hue < 1) rgb = [c, x, 0];
    else if (hue < 2) rgb = [x, c, 0];
    else if (hue < 3) rgb = [0, c, x];
    else if (hue < 4) rgb = [0, x, c];
    else if (hue < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map(function(part) { return Math.round((part + m) * 255); });
  }
  function __autojs6_color_rgb_to_hsl(r, g, b) {
    const rn = __autojs6_color_byte(r, "hsl") / 255;
    const gn = __autojs6_color_byte(g, "hsl") / 255;
    const bn = __autojs6_color_byte(b, "hsl") / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    const lightness = (max + min) / 2;
    let hue = 0;
    let saturation = 0;
    if (delta !== 0) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1));
      if (max === rn) {
        hue = 60 * (((gn - bn) / delta) % 6);
      } else if (max === gn) {
        hue = 60 * (((bn - rn) / delta) + 2);
      } else {
        hue = 60 * (((rn - gn) / delta) + 4);
      }
    }
    if (hue < 0) hue += 360;
    return [hue, saturation, lightness];
  }
  function __autojs6_color_hsl_to_rgb(h, s, l) {
    const hue = ((((Number(h) || 0) % 360) + 360) % 360);
    const saturation = Math.max(0, Math.min(1, Number(s) > 1 ? Number(s) / 100 : Number(s) || 0));
    const lightness = Math.max(0, Math.min(1, Number(l) > 1 ? Number(l) / 100 : Number(l) || 0));
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - c / 2;
    let rgb;
    if (hue < 60) rgb = [c, x, 0];
    else if (hue < 120) rgb = [x, c, 0];
    else if (hue < 180) rgb = [0, c, x];
    else if (hue < 240) rgb = [0, x, c];
    else if (hue < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map(function(part) { return Math.round((part + m) * 255); });
  }
  function __autojs6_limited_colors() {
    if (__autojs6_limited_colors_cache) {
      return __autojs6_limited_colors_cache;
    }
    const colorsModule = {
      toInt: __autojs6_color_int,
      toHex: __autojs6_color_to_hex,
      toFullHex: __autojs6_color_to_full_hex,
      toString: __autojs6_color_to_hex,
      alpha: function(value, options) {
        const alpha = __autojs6_color_component(value, 24);
        return options && Number(options.max) === 1 ? alpha / 255 : alpha;
      },
      getAlpha: function(value, options) { return colorsModule.alpha(value, options); },
      alphaDouble: function(value) { return __autojs6_color_component(value, 24) / 255; },
      getAlphaDouble: function(value) { return colorsModule.alphaDouble(value); },
      setAlpha: function(value, alpha) { return __autojs6_color_set_component(value, 24, alpha); },
      setAlphaRelative: function(value, percentage) { return colorsModule.setAlpha(value, colorsModule.alpha(value) * Number(percentage)); },
      removeAlpha: function(value) { return __autojs6_color_remove_component(value, 24); },
      red: function(value, options) {
        const red = __autojs6_color_component(value, 16);
        return options && Number(options.max) === 1 ? red / 255 : red;
      },
      getRed: function(value, options) { return colorsModule.red(value, options); },
      redDouble: function(value) { return __autojs6_color_component(value, 16) / 255; },
      getRedDouble: function(value) { return colorsModule.redDouble(value); },
      setRed: function(value, red) { return __autojs6_color_set_component(value, 16, red); },
      setRedRelative: function(value, percentage) { return colorsModule.setRed(value, colorsModule.red(value) * Number(percentage)); },
      removeRed: function(value) { return __autojs6_color_remove_component(value, 16); },
      green: function(value, options) {
        const green = __autojs6_color_component(value, 8);
        return options && Number(options.max) === 1 ? green / 255 : green;
      },
      getGreen: function(value, options) { return colorsModule.green(value, options); },
      greenDouble: function(value) { return __autojs6_color_component(value, 8) / 255; },
      getGreenDouble: function(value) { return colorsModule.greenDouble(value); },
      setGreen: function(value, green) { return __autojs6_color_set_component(value, 8, green); },
      setGreenRelative: function(value, percentage) { return colorsModule.setGreen(value, colorsModule.green(value) * Number(percentage)); },
      removeGreen: function(value) { return __autojs6_color_remove_component(value, 8); },
      blue: function(value, options) {
        const blue = __autojs6_color_component(value, 0);
        return options && Number(options.max) === 1 ? blue / 255 : blue;
      },
      getBlue: function(value, options) { return colorsModule.blue(value, options); },
      blueDouble: function(value) { return __autojs6_color_component(value, 0) / 255; },
      getBlueDouble: function(value) { return colorsModule.blueDouble(value); },
      setBlue: function(value, blue) { return __autojs6_color_set_component(value, 0, blue); },
      setBlueRelative: function(value, percentage) { return colorsModule.setBlue(value, colorsModule.blue(value) * Number(percentage)); },
      removeBlue: function(value) { return __autojs6_color_remove_component(value, 0); },
      argb: function(a, r, g, b) { return __autojs6_color_argb_uint(a, r, g, b) | 0; },
      rgb: function(r, g, b) { return __autojs6_color_argb_uint(255, r, g, b) | 0; },
      rgba: function(r, g, b, a) { return __autojs6_color_argb_uint(a === undefined ? 255 : a, r, g, b) | 0; },
      hsv: function(h, s, v) {
        const rgb = __autojs6_color_hsv_to_rgb(h, s, v);
        return __autojs6_color_argb_uint(255, rgb[0], rgb[1], rgb[2]) | 0;
      },
      hsva: function(h, s, v, a) {
        const rgb = __autojs6_color_hsv_to_rgb(h, s, v);
        return __autojs6_color_argb_uint(a === undefined ? 255 : a, rgb[0], rgb[1], rgb[2]) | 0;
      },
      hsl: function(h, s, l) {
        const rgb = __autojs6_color_hsl_to_rgb(h, s, l);
        return __autojs6_color_argb_uint(255, rgb[0], rgb[1], rgb[2]) | 0;
      },
      hsla: function(h, s, l, a) {
        const rgb = __autojs6_color_hsl_to_rgb(h, s, l);
        return __autojs6_color_argb_uint(a === undefined ? 255 : a, rgb[0], rgb[1], rgb[2]) | 0;
      },
      toRgb: function(value) { return Object.freeze(__autojs6_color_rgb_array(value)); },
      toRgba: function(value) { return Object.freeze(__autojs6_color_rgb_array(value).concat([colorsModule.alphaDouble(value)])); },
      toArgb: function(value) { return Object.freeze(__autojs6_color_argb_array(value)); },
      toHsv: function(value) {
        const rgb = __autojs6_color_rgb_array(value);
        return Object.freeze(__autojs6_color_rgb_to_hsv(rgb[0], rgb[1], rgb[2]));
      },
      toHsva: function(value) { return Object.freeze(colorsModule.toHsv(value).concat([colorsModule.alphaDouble(value)])); },
      toHsl: function(value) {
        const rgb = __autojs6_color_rgb_array(value);
        return Object.freeze(__autojs6_color_rgb_to_hsl(rgb[0], rgb[1], rgb[2]));
      },
      toHsla: function(value) { return Object.freeze(colorsModule.toHsl(value).concat([colorsModule.alphaDouble(value)])); },
      toRgbString: function(value) { return "rgb(" + __autojs6_color_rgb_array(value).join(", ") + ")"; },
      toRgbaString: function(value, options) {
        return "rgba(" + __autojs6_color_rgb_array(value).join(", ") + ", " + __autojs6_color_round_alpha(colorsModule.alphaDouble(value), options && options.keepTrailingZeroForFullAlpha) + ")";
      },
      toArgbString: function(value, options) {
        const argb = __autojs6_color_argb_array(value);
        return "argb(" + __autojs6_color_round_alpha(argb[0] / 255, options && options.keepTrailingZeroForFullAlpha) + ", " + argb.slice(1).join(", ") + ")";
      },
      toHsvString: function(value) {
        const hsv = colorsModule.toHsv(value);
        return "hsv(" + Math.round(hsv[0] * 1000) / 1000 + ", " + Math.round(hsv[1] * 1000) / 1000 + ", " + Math.round(hsv[2] * 1000) / 1000 + ")";
      },
      toHsvaString: function(value) {
        const hsva = colorsModule.toHsva(value);
        return "hsva(" + Math.round(hsva[0] * 1000) / 1000 + ", " + Math.round(hsva[1] * 1000) / 1000 + ", " + Math.round(hsva[2] * 1000) / 1000 + ", " + __autojs6_color_round_alpha(hsva[3], true) + ")";
      },
      toHslString: function(value) {
        const hsl = colorsModule.toHsl(value);
        return "hsl(" + Math.round(hsl[0] * 1000) / 1000 + ", " + Math.round(hsl[1] * 1000) / 1000 + ", " + Math.round(hsl[2] * 1000) / 1000 + ")";
      },
      toHslaString: function(value) {
        const hsla = colorsModule.toHsla(value);
        return "hsla(" + Math.round(hsla[0] * 1000) / 1000 + ", " + Math.round(hsla[1] * 1000) / 1000 + ", " + Math.round(hsla[2] * 1000) / 1000 + ", " + __autojs6_color_round_alpha(hsla[3], true) + ")";
      },
      isEqual: function(left, right) { return __autojs6_color_uint(left) === __autojs6_color_uint(right); },
      isSimilar: function(left, right, threshold) {
        const max = threshold === undefined || threshold === null ? 4 : Number(threshold);
        return Math.abs(colorsModule.red(left) - colorsModule.red(right)) <= max &&
          Math.abs(colorsModule.green(left) - colorsModule.green(right)) <= max &&
          Math.abs(colorsModule.blue(left) - colorsModule.blue(right)) <= max &&
          Math.abs(colorsModule.alpha(left) - colorsModule.alpha(right)) <= max;
      },
      luminance: function(value) {
        const rgb = __autojs6_color_rgb_array(value).map(function(part) {
          const normalized = part / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      },
      build: function() { return colorsModule.argb.apply(colorsModule, arguments); },
      summary: function(value) {
        const color = __autojs6_color_int(value);
        return "Color { " + colorsModule.toHex(color) + " | " + colorsModule.toRgbaString(color) + " | int(" + color + ") }";
      },
      toColorStateList: function(...colors) {
        if(!colors.length)throw new TypeError("At least one color is required.");
        return android.createColorStateList({states:[[]],colors:[colorsModule.toInt(colors[0])]});
      },
      createColorStateList: (descriptor,options)=>android.createColorStateList(descriptor,options),
      createPaint: (options,control)=>android.createPaint(options,control),
      setPaintColor: (paint,color,options)=>android.setPaintColor(paint,color,options),
      getThemeColor: options=>android.getThemeColor(options)
    };
    Object.defineProperty(colorsModule, "all", { value: __autojs6_color_names, enumerable: true });
    Object.defineProperty(colorsModule, "themeColor", {
      enumerable: true,
      get: function() {
        const result=android.getThemeColor();result.catch(()=>{});return result;
      }
    });
    __autojs6_limited_colors_cache = Object.freeze(colorsModule);
    return __autojs6_limited_colors_cache;
  }
    return __autojs6_limited_colors();
  }
// END GENERATED ANDROID TASK FACADES

// BEGIN GENERATED JAVA FACADE
  // Shared Java object facade for Node, Bun and Worker transports.
  function __autojs6_create_java(call, policy = {}, enabled = true, AsyncContext) {
    const error = (message, code = "ERR_AUTOJS6_JAVA_METHOD_DENIED") => Object.assign(new TypeError(message), {code});
    const check = () => { if (!enabled) throw error("Java interop is disabled for this execution.", "ERR_AUTOJS6_JAVA_INTEROP_DISABLED"); };
    const name = (value, code = "ERR_AUTOJS6_JAVA_CLASS_DENIED") => {
      check(); const result = typeof value === "string" ? value.trim() : value && (value.__autojs6JavaClass || value.className || value.name);
      if (!result || typeof result !== "string") throw error("A non-empty Java class/member name is required.", code);
      return result;
    };
    const id = value => {
      check(); const result = typeof value === "string" ? value : value && (value.__autojs6JavaHandle || value.handle);
      if (!result || typeof result !== "string") throw error("A Java object handle is required.");
      return result;
    };
    const argument = (value, seen = new Set()) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "bigint") return {__autojs6JavaType:"long", value:String(value)};
      if (typeof value === "number") {
        if (!Number.isFinite(value)) return {__autojs6JavaType:"double", value:String(value)};
        if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw error("Unsafe Java integer; use bigint or java.cast('long', decimalString).");
        return value;
      }
      if (typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value !== "object") throw error("Java arguments accept primitives, arrays, typed values and Java handles.");
      if (value.__autojs6JavaHandle) return {__autojs6JavaHandle:id(value)};
      if (seen.has(value)) throw error("Cyclic Java argument array.");
      seen.add(value);
      try {
        if (Array.isArray(value) || ArrayBuffer.isView(value) && !(value instanceof DataView)) return Array.from(value, item => argument(item, seen));
        if (value.__autojs6JavaType) {
          const type = name(value.__autojs6JavaType);
          const raw = typeof value.value === "bigint" || typeof value.value === "number" && !Number.isFinite(value.value) ? String(value.value) : argument(value.value, seen);
          return {__autojs6JavaType:type, value:raw};
        }
      } finally { seen.delete(value); }
      throw error("Plain objects are not Java objects; construct a Bundle/Map or pass a Java handle.");
    };
    const context = AsyncContext ? new AsyncContext() : null;
    const client = "java-client-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
    const callbacks = new Map(), owners = new Map();let sequence=0,polling=false;
    const classFields = value => ({className:name(value),...(value && typeof value==='object' && value.loader ? {loader:value.loader}: {})});
    const control = (method,payload) => call("java",method,[payload],{timeoutMs:2000,permissions:["java_interop"]});
    const report = (entry,cause,event) => {try{if(entry?.options.onError)Promise.resolve(entry.options.onError(cause,event)).catch(error=>console.error(error));else console.error(cause);}catch(error){console.error(error);}};
    const dispatchCallback = async event => {
      const entry=callbacks.get(event.callback);if(!entry)return;
      const receiver=decode(event.receiver);
      try {
        const scope=Object.freeze({java:api,receiver,method:event.method,signature:event.signature,
          callSuper:(...values)=>invoke("callSuper",{handle:id(receiver),args:args(values),callbackInvocationId:event.id})});
        const result=await context.run(event.id,()=>entry.implementation[event.key].apply(scope,event.args.map(decode)));
        if(callbacks.get(event.callback)!==entry)return;
        await control("completeCallback",{client,id:event.id,value:argument(result)});
      } catch(cause) {
        if(callbacks.get(event.callback)!==entry)return;
        report(entry,cause,event);
        await control("completeCallback",{client,id:event.id,error:String(cause.stack||cause).slice(0,16000)}).catch(()=>{});
      }
    };
    const pump = async () => {
      if(polling)return;polling=true;
      try {
        while([...callbacks.values()].some(entry=>Object.keys(entry.implementation).length)) {
          try {
            const events=await control("drainCallbacks",{client,waitMs:500});
            for(const event of events||[])dispatchCallback(event).catch(error=>report(null,error,event));
          } catch(cause) {
            if(!callbacks.size)break;
            const entries=[...callbacks.entries()];callbacks.clear();
            for(const [callback,entry]of entries){await control("closeCallbacks",{client,callback}).catch(()=>{});report(entry,cause,null);}
          }
        }
      } finally {polling=false;}
    };
    const removeCallback=async callback=>{callbacks.delete(callback);await control("closeCallbacks",{client,callback}).catch(()=>{});};
    const createCallback=async(mode,definition,implementation,options={})=>{
      if(!context)throw error("Java callbacks require AsyncLocalStorage support in this runtime.");
      const methods=typeof implementation==='function'?{'*':implementation}:implementation;
      if(!methods || typeof methods!=='object' || Object.values(methods).some(value=>typeof value!=='function'))throw error("Java implementations must contain callback functions.");
      const callback=client+'-'+ ++sequence;callbacks.set(callback,{implementation:methods,options});pump();
      try{return await invoke(mode,{...definition,client,callback,methods:Object.keys(methods),callbackTimeoutMs:options.callbackTimeoutMs??5000},
        {timeoutMs:options.timeoutMs??120000,signal:options.signal});}
      catch(cause){await removeCallback(callback);throw cause;}
    };

    const args = value => {
      if (value == null) return [];
      if (!Array.isArray(value)) throw error("Java args must be an array.");
      return value.map(item => argument(item));
    };
    const releaseRaw = async value => {
      if (Array.isArray(value)) { for (const item of value) await releaseRaw(item); }
      else if (value && typeof value === "object" && value.__autojs6JavaHandle)
        await call("java", "release", [{handle:value.__autojs6JavaHandle}], {timeoutMs:5000,permissions:["java_interop"]});
    };
    const invoke = async (method, payload, options = {}) => {
      check(); if (options.signal?.aborted) throw error("Java call aborted.", "ABORT_ERR");
      if (options.thread !== undefined && !["default","main"].includes(options.thread)) throw error("Java thread must be default or main.");
      if (options.parameterTypes !== undefined) {
        if (!Array.isArray(options.parameterTypes)) throw error("parameterTypes must be an array of class names.");
        payload.parameterTypes = options.parameterTypes.map(value=>name(value));
      }
      if (options.thread !== undefined) payload.thread = options.thread;
      const callbackInvocationId=context?.getStore();if(callbackInvocationId && !payload.callbackInvocationId)payload.callbackInvocationId=callbackInvocationId;
      // Keep the transport reply after JS cancellation so newly returned references can be released.
      const pending = Promise.resolve(call("java", method, [payload], {timeoutMs:5000,...options,signal:undefined,permissions:["java_interop"]}));
      return new Promise((resolve,reject)=>{
        let aborted=false;
        const abort=()=>{aborted=true;reject(error("Java call aborted.","ABORT_ERR"));};
        options.signal?.addEventListener("abort",abort,{once:true});
        if(options.signal?.aborted)abort();
        pending.then(value=>{
          options.signal?.removeEventListener("abort",abort);
          if(aborted){releaseRaw(value).catch(()=>{});return;}
          try{resolve(decode(value));}catch(cause){reject(cause);}
        },cause=>{options.signal?.removeEventListener("abort",abort);if(!aborted)reject(cause);});
      });
    };
    const decode = value => {
      if (!value || typeof value !== "object") return value;
      if (value.__autojs6JavaLong !== undefined) return BigInt(value.__autojs6JavaLong);
      if (value.__autojs6JavaNumber !== undefined) return Number(value.__autojs6JavaNumber);
      if (Array.isArray(value)) return Object.freeze(value.map(decode));
      if (!value.__autojs6JavaHandle) return Object.freeze(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)])));
      const target = {...value, ...(value.value ? {value:decode(value.value)} : {})};
      if(value.__autojs6JavaCallbackOwner)owners.set(value.__autojs6JavaHandle,value.__autojs6JavaCallbackOwner);
      if(value.__autojs6JavaClass){target.className=value.__autojs6JavaClass;target.name=value.__autojs6JavaClass;}
      const generated=value.__autojs6JavaClass ? descriptor(value.__autojs6JavaClass) : null;
      // Methods are non-enumerable so handles can be cloned through MessagePort.
      Object.defineProperties(target, Object.fromEntries(Object.entries({
        ...(generated ? Object.fromEntries(Object.getOwnPropertyNames(generated).map(key=>[key,generated[key]]).filter(([,v])=>typeof v==='function')):{}),
        ...(value.__autojs6JavaLoader ? {type:name=>descriptor(name,value.__autojs6JavaHandle),findClass:name=>descriptor(name,value.__autojs6JavaHandle)}:{}),
        retain:options=>api.retain(target,options),
        call:(method,values,options)=>api.call(target,method,values,options),
        callInstance:(method,values,options)=>api.call(target,method,values,options),
        getField:(field,options)=>api.getField(target,field,options),
        setField:(field,value,options)=>api.setField(target,field,value,options),
        getClassName:options=>api.getClassName(target,options),
        instanceOf:(type,options)=>api.instanceOf(target,type,options),
        arrayLength:options=>api.arrayLength(target,options),
        getArrayItem:(index,options)=>api.getArrayItem(target,index,options),
        setArrayItem:(index,value,options)=>api.setArrayItem(target,index,value,options),
        toArray:options=>api.toArray(target,options),
        release:options=>api.release(target,options),
        dispose:options=>api.release(target,options),
        toJSON:()=>value
      }).map(([key,fn])=>[key,{value:fn}])));
      return Object.freeze(target);
    };
    const descriptor = (value,loader) => {
      const className=name(value),target={className,name:className,...(loader?{loader}:{})};
      Object.defineProperties(target,Object.fromEntries(Object.entries({
        callStatic:(method,values,options)=>api.callStatic(target,method,values,options),
        new:(values,options)=>api.new(target,values,options),create:(values,options)=>api.new(target,values,options),
        getStatic:(field,options)=>api.getStatic(target,field,options),setStatic:(field,value,options)=>api.setStatic(target,field,value,options),
        describe:options=>api.describe(target,options)
      }).map(([key,fn])=>[key,{value:fn}])));
      return Object.freeze(target);
    };
    const api = {
      policy:Object.freeze({enabled,limitsEnforcedBy:"host_provider",published:!!policy,allowedClasses:[],deniedClassPrefixes:[],classes:{},...policy}),
      findClass:descriptor,type:descriptor,
      cast:(type,value)=>Object.freeze({__autojs6JavaType:name(type),value}),
      callStatic:async(type,method,values,options)=>invoke("callStatic",{...classFields(type),method:name(method,"ERR_AUTOJS6_JAVA_METHOD_DENIED"),args:args(values)},options),
      new:async(type,values,options)=>invoke("new",{...classFields(type),args:args(values)},options),
      call:async(target,method,values,options)=>invoke("call",{handle:id(target),method:name(method,"ERR_AUTOJS6_JAVA_METHOD_DENIED"),args:args(values)},options),
      getField:async(target,field,options)=>invoke("getField",{handle:id(target),field:name(field,"ERR_AUTOJS6_JAVA_METHOD_DENIED")},options),
      setField:async(target,field,value,options)=>invoke("setField",{handle:id(target),field:name(field,"ERR_AUTOJS6_JAVA_METHOD_DENIED"),value:argument(value)},options),
      getStatic:async(type,field,options)=>invoke("getStatic",{...classFields(type),field:name(field,"ERR_AUTOJS6_JAVA_METHOD_DENIED")},options),
      setStatic:async(type,field,value,options)=>invoke("setStatic",{...classFields(type),field:name(field,"ERR_AUTOJS6_JAVA_METHOD_DENIED"),value:argument(value)},options),
      describe:async(type,options)=>invoke("type",{...classFields(type)},options),
      getContext:options=>invoke("getContext",{},options),
      newArray:async(type,value,options)=>invoke("newArray",{...classFields(type),value:argument(value)},options),
      arrayLength:async(target,options)=>invoke("arrayLength",{handle:id(target)},options),
      getArrayItem:async(target,index,options)=>invoke("getArrayItem",{handle:id(target),index},options),
      setArrayItem:async(target,index,value,options)=>invoke("setArrayItem",{handle:id(target),index,value:argument(value)},options),
      toArray:async(target,options)=>invoke("toArray",{handle:id(target)},options),
      getClassName:async(target,options)=>invoke("getClassName",{handle:id(target)},options),
      instanceOf:async(target,type,options)=>invoke("instanceOf",{handle:id(target),...classFields(type)},options),
      retain:async(target,options)=>invoke("retain",{handle:id(target)},options),
      release:async(target,options)=>{const handle=id(target),callback=owners.get(handle);const result=await invoke("release",{handle},options);if(callback){owners.delete(handle);await removeCallback(callback);}return result;},
      proxy:async(interfaces,implementation,options)=>createCallback("proxy",{interfaces:(Array.isArray(interfaces)?interfaces:[interfaces]).map(value=>name(value))},implementation,options),
      defineClass:async(definition,options)=>{if(!definition||typeof definition!=="object")throw error("A class definition is required.");return createCallback("defineClass",{name:definition.name,extends:name(definition.extends||"java.lang.Object"),interfaces:(definition.interfaces||[]).map(value=>name(value)),...(definition.extends?.loader?{loader:definition.extends.loader}:{})},definition.methods||{},options);},
      loadDex:async(paths,options)=>invoke("loadDex",{paths:(Array.isArray(paths)?paths:[paths]).map(value=>String(value))},{timeoutMs:120000,...options}),
      loadJar:async(paths,options)=>invoke("loadJar",{paths:(Array.isArray(paths)?paths:[paths]).map(value=>String(value))},{timeoutMs:120000,...options}),
      closeCallbacks:async()=>{for(const callback of [...callbacks.keys()])await removeCallback(callback);},
      wrap:(fn,interfaceName="java.lang.Runnable",options)=>api.proxy(interfaceName,fn,options)
    };
    api.create=api.new;api.callInstance=api.call;api.dispose=api.release;
    return Object.freeze(api);
  }
// END GENERATED JAVA FACADE

// BEGIN GENERATED TTS FACADE
  // Shared TTS facade. Node, Workers and Bun use the same task and event semantics.
  function __autojs6_create_tts(call) {
    let opening = null, generation = 0, pumping = false;
    const tasks = new Map(), listeners = new Map();
    const error = (message, code = "ABORTED") => Object.assign(new Error(message), {code: "ERR_AUTOJS6_TTS_" + code});
    const raw = (method, args, options = {}) => call("tts", method, args, {timeoutMs: 60000, ...options, permissions: ["tts"]});
    function emit(map, name, value) {
      for (const entry of [...(map.get(name) || [])]) {
        if (entry.once) map.set(name, (map.get(name) || []).filter(x => x !== entry));
        try { entry.listener(value); } catch (failure) { setTimeout(() => { throw failure; }, 0); }
      }
    }
    function emitter(target, map) {
      target.on = (name, listener) => { if (typeof listener !== "function") throw new TypeError("TTS listener must be a function"); map.set(name, [...(map.get(name) || []), {listener}]); return target; };
      target.once = (name, listener) => { if (typeof listener !== "function") throw new TypeError("TTS listener must be a function"); map.set(name, [...(map.get(name) || []), {listener, once: true}]); return target; };
      target.off = (name, listener) => { map.set(name, (map.get(name) || []).filter(x => x.listener !== listener)); return target; };
      target.removeAllListeners = name => { name === undefined ? map.clear() : map.delete(name); return target; };
      return target;
    }
    async function session() {
      if (!opening) {
        const epoch = generation;
        const pending = raw("open", []).then(async value => {
          if (epoch !== generation) { await raw("close", [value.id]); throw error("TTS client closed during initialization"); }
          return value.id;
        });
        opening = pending;
        pending.catch(() => { if (opening === pending) opening = null; });
      }
      return opening;
    }
    async function invoke(method, args, options) {
      const epoch = generation, id = await session();
      const value = await raw("invoke", [id, method, args], options);
      if (epoch !== generation) throw error("TTS client has closed");
      return value;
    }
    function settle(record, failure, value) {
      if (record.done) return;
      record.done = true; tasks.delete(record.handle.id); record.removeAbort?.();
      failure ? record.reject(failure) : record.resolve(value);
    }
    async function pump() {
      if (pumping || !tasks.size) return;
      pumping = true; const epoch = generation;
      try {
        const id = await session();
        while (tasks.size && epoch === generation) {
          const events = await raw("drain", [id, [...tasks.keys()]], {timeoutMs: 5000});
          if (epoch !== generation) break;
          for (const event of events) {
            const record = tasks.get(event.id); if (!record) continue;
            record.state = event.state;
            let value = event.value;
            if (event.event === "audio") value = {...value, data: Buffer.from(value.data, "base64")};
            const failure = ["error", "stop", "cancelled"].includes(event.event) ? Object.assign(error(value.message || "TTS interrupted", value.code || "ABORTED"), value, {code: "ERR_AUTOJS6_TTS_" + (value.code || "ABORTED")}) : null;
            if (event.terminal) settle(record, failure, value);
            if (event.event === "cancelled") emit(record.listeners, "stop", value.info);
            emit(record.listeners, event.event, failure && event.event === "error" ? failure : value?.info ?? value);
            emit(listeners, event.event, {id: event.id, value: event.event === "error" ? failure : value?.info ?? value});
          }
          if (!events.length) await new Promise(resolve => setTimeout(resolve, 25));
        }
      } catch (failure) {
        if (epoch === generation) {
          for (const record of [...tasks.values()]) { record.state = "error"; emit(record.listeners, "error", failure); settle(record, failure); }
          const old = opening; opening = null; generation++;
          if (old) old.then(id => raw("close", [id])).catch(() => {});
        }
      } finally { pumping = false; if (tasks.size) setTimeout(pump, 0); }
    }
    async function start(method, args, options = {}) {
      if (options.signal?.aborted) throw error("TTS operation was aborted");
      const epoch = generation, id = await session();
      const value = await raw("invoke", [id, method, args], {...options, signal: undefined});
      if (epoch !== generation) { await raw("close", [id]).catch(() => {}); throw error("TTS client has closed"); }
      const record = {state: value.state, done: false, listeners: new Map()};
      const result = new Promise((resolve, reject) => { record.resolve = resolve; record.reject = reject; });
      result.catch(() => {});
      const handle = emitter({id: value.id, operation: value.operation, text: value.text, result,
        get state() { return record.state; }, get isDone() { return record.done; },
        async stop() { if (!record.done) await raw("stopTask", [id, value.id]); return handle; },
        async cancel() { return handle.stop(); }
      }, record.listeners);
      record.handle = handle; tasks.set(value.id, record);
      if (options.signal) {
        const aborted = () => handle.stop().catch(failure => settle(record, failure));
        options.signal.addEventListener("abort", aborted, {once: true});
        record.removeAbort = () => options.signal.removeEventListener("abort", aborted);
        if (options.signal.aborted) aborted();
      }
      setTimeout(pump, 0);
      return handle;
    }
    const object = value => {
      if (value == null) return {};
      if (typeof value !== "object" || Array.isArray(value)) throw new TypeError("TTS options must be an object");
      JSON.stringify(value, (key, item) => {
        if (typeof item === "number" && !Number.isFinite(item) || typeof item === "function" || typeof item === "symbol" || typeof item === "bigint") throw new TypeError("TTS options require finite JSON values");
        return item;
      });
      return value;
    };
    function engine(value) {
      if (value === undefined) return [];
      if (value === null || typeof value === "string") return [value];
      const options = object(value);
      if (Object.keys(options).some(key => key !== "engine")) throw new TypeError("Unknown TTS engine query option");
      return options.engine === undefined ? [] : engine(options.engine);
    }
    const api = async (text, options, callOptions) => api.speak(text, options, callOptions);
    Object.assign(api, {
      maxInputLength: 3999, maxSynthesisFileSize: 536870912, QUEUE_FLUSH: "flush", QUEUE_ADD: "add",
      getMaxInputLength: () => 3999,
      utterance: (text, options, callOptions) => start("utterance", [text, object(options)], callOptions),
      enqueueUtterance: (text, options, callOptions) => start("enqueueUtterance", [text, object(options)], callOptions),
      synthesis: (text, path, options, callOptions) => start("synthesis", [text, path, object(options)], callOptions),
      silenceTask: (duration, options, callOptions) => {
        if (!Number.isSafeInteger(duration) || duration < 0) return Promise.reject(new TypeError("TTS silence duration must be a non-negative integer"));
        return start("silenceTask", [duration, object(options)], callOptions);
      },
      speak: async (text, options, callOptions) => (await api.utterance(text, options, callOptions)).result,
      enqueue: async (text, options, callOptions) => (await api.enqueueUtterance(text, options, callOptions)).result,
      synthesize: async (text, path, options, callOptions) => (await api.synthesis(text, path, options, callOptions)).result,
      silence: async (duration, options, callOptions) => (await api.silenceTask(duration, options, callOptions)).result,
      voices: (value, callOptions) => {
        const input = value === undefined ? {} : value === null || typeof value === "string" ? {engine: value} : object(value);
        if (Object.keys(input).some(key => !["engine", "locale", "language", "lang", "offlineOnly", "offline", "installedOnly", "installed"].includes(key))) return Promise.reject(new TypeError("Unknown TTS voice filter"));
        const filter = {...input};
        filter.locale = input.locale ?? input.language ?? input.lang;
        filter.offlineOnly = input.offlineOnly ?? input.offline;
        filter.installedOnly = input.installedOnly ?? input.installed;
        for (const key of ["language", "lang", "offline", "installed"]) delete filter[key];
        return invoke("voices", [filter], callOptions);
      },
      configure: (options, callOptions) => invoke("configure", [object(options)], callOptions),
      async close() {
        generation++;
        const old = opening; opening = null;
        for (const record of [...tasks.values()]) { record.state = "cancelled"; settle(record, error("TTS client closed")); }
        listeners.clear();
        return old ? old.then(id => raw("close", [id]), () => false) : false;
      }
    });
    for (const method of ["ready", "engines", "languages", "installData"]) api[method] = (value, options) => invoke(method, engine(value), options);
    for (const method of ["status", "defaults", "stop", "reset", "isSpeaking", "isBusy", "openSettings"]) api[method] = options => invoke(method, [], options);
    for (const method of ["isLanguageAvailable", "languageAvailability"]) api[method] = (locale, value, options) => invoke(method, [locale, ...engine(value)], options);
    for (const [alias, original] of Object.entries({speakTask: "utterance", enqueueTask: "enqueueUtterance", synthesizeToFile: "synthesize", synthesizeTask: "synthesis", synthesisTask: "synthesis", stopAll: "stop", config: "defaults"})) api[alias] = api[original];
    return Object.freeze(emitter(api, listeners));
  }
  // End shared TTS facade.
// END GENERATED TTS FACADE

// BEGIN GENERATED SPEECH FACADE
  // Shared speech facade. All runtimes keep their sessions and callbacks on their own JS thread.
  function __autojs6_create_speech(call) {
    let opening = null, generation = 0, pumping = false;
    const records = new Map();
    function SpeechError(message = "", code = "INTERNAL") {
      const failure = new Error(String(message));
      Object.setPrototypeOf(failure, SpeechError.prototype);
      failure.name = "SpeechError"; failure.code = code == null ? "INTERNAL" : String(code);
      return failure;
    }
    SpeechError.prototype = Object.create(Error.prototype, {
      constructor: {value: SpeechError, writable: true, configurable: true},
      toString: {value() { return "SpeechError [" + this.code + "]: " + this.message; }, configurable: true}
    });
    const failure = value => value instanceof SpeechError ? value :
      SpeechError(value?.message || String(value), String(value?.code || "INTERNAL").replace(/^ERR_AUTOJS6_SPEECH_/, ""));
    const aborted = () => SpeechError("Speech operation cancelled", "SESSION_CANCELLED");
    const raw = (method, args) => Promise.resolve().then(() =>
      call("speech", method, args, {timeoutMs: 10000, permissions: ["speech"]})).catch(error => { throw failure(error); });
    function check(signal, epoch = generation, deadline = Infinity) {
      if (signal?.aborted) throw aborted();
      if (epoch !== generation) throw SpeechError("Speech client closed", "SESSION_CLOSED");
      if (Date.now() >= deadline) throw SpeechError("Speech operation timed out", "TIMEOUT");
    }
    function json(value, progress = false) {
      if (value == null) return {};
      if (typeof value !== "object" || Array.isArray(value)) throw SpeechError("Options must be an object", "INVALID_OPTIONS");
      const copy = {...value};
      if (progress && "onProgress" in copy) {
        if (copy.onProgress != null && typeof copy.onProgress !== "function") throw SpeechError("onProgress must be a function", "INVALID_OPTIONS");
        delete copy.onProgress;
      }
      JSON.stringify(copy, (_, entry) => {
        if (typeof entry === "number" && !Number.isFinite(entry) || ["function", "symbol", "bigint"].includes(typeof entry))
          throw SpeechError("Options must contain finite JSON values", "INVALID_OPTIONS");
        return entry;
      });
      return copy;
    }
    async function client() {
      if (!opening) {
        const epoch = generation;
        const pending = raw("open", []).then(async value => {
          if (epoch !== generation) { await raw("close", [value.id]); check(null, epoch); }
          return value.id;
        });
        opening = pending;
        pending.catch(() => { if (opening === pending) opening = null; });
      }
      return opening;
    }
    function emit(record, name, value) {
      for (const entry of [...(record.listeners.get(name) || [])]) {
        if (entry.once) record.listeners.set(name, record.listeners.get(name).filter(x => x !== entry));
        try { entry.listener(value); } catch (error) { setTimeout(() => { throw error; }, 0); }
      }
    }
    function emitter(handle, record) {
      for (const method of ["on", "once"]) handle[method] = (name, listener) => {
        if (typeof listener !== "function") throw new TypeError("Speech listener must be a function");
        record.listeners.set(name, [...(record.listeners.get(name) || []), {listener, once: method === "once"}]); return handle;
      };
      handle.off = handle.removeListener = (name, listener) => {
        record.listeners.set(name, (record.listeners.get(name) || []).filter(x => x.listener !== listener)); return handle;
      };
      handle.removeAllListeners = name => { name === undefined ? record.listeners.clear() : record.listeners.delete(name); return handle; };
      return handle;
    }
    function forget(record) {
      records.delete(record.key); record.cleanup?.(); record.fragments = [];
    }
    function settle(record, error, value) {
      forget(record);
      error ? record.reject(error) : record.resolve(value);
    }
    function joined(parts) {
      return parts.map(x => x.trim()).filter(Boolean).reduce((a, b) => a + (/[a-zA-Z0-9]$/.test(a) && /^[a-zA-Z0-9]/.test(b) ? " " : "") + b, "");
    }
    function deliverSession(record, event) {
      if (record.state === "ended") return;
      let value = event.value || {};
      if (event.type === "ready") { record.id = value.sessionId; record.modelId = value.modelId; record.state = "active"; }
      if (event.type === "final") record.finals.push(value.text || "");
      if (event.type === "error") value = failure(value);
      if (event.type === "end") {
        record.state = "ended"; record.reason = value.reason;
        record.text = typeof value.text === "string" ? value.text : joined(record.finals);
        if (record.round < 0) {
          for (const round of record.rounds.values()) deliverSession(round, {type: "end", value: {reason: value.reason}});
          record.rounds.clear(); forget(record);
        }
        if (record.kind !== "wake") value = {...value, text: record.text};
      }
      emit(record, event.type, event.type === "endpoint" ? undefined : value);
    }
    function route(record, event) {
      if (record.kind === "operation") {
        if (event.type === "progress") {
          try { record.progress?.(...event.value); } catch (error) { setTimeout(() => { throw error; }, 0); }
        } else if (event.type === "resolve") settle(record, record.cancelError, event.value);
        else if (event.type === "reject") settle(record, record.cancelError || failure(event.value));
        return;
      }
      if (record.kind === "wake" && event.type === "wake") {
        const index = event.round ?? record.hits;
        record.hits++;
        let round;
        if (record.thenListen) {
          round = record.rounds.get(index);
          if (!round) { round = newSession({...record.descriptor, kind: "listen", source: "mic"}, record.options, index); record.rounds.set(index, round); }
        }
        emit(record, "wake", {...event.value, ...(round ? {listen: round.handle} : {})});
        if (round) {
          round.announced = true;
          for (const buffered of round.buffered.splice(0)) deliverSession(round, buffered);
          if (round.state === "ended") record.rounds.delete(index);
        }
      } else if (record.kind === "wake" && event.round != null) {
        let round = record.rounds.get(event.round);
        if (!round) { round = newSession({...record.descriptor, kind: "listen", source: "mic"}, record.options, event.round); record.rounds.set(event.round, round); }
        if (round.announced) {
          deliverSession(round, event);
          if (round.state === "ended") record.rounds.delete(event.round);
        } else round.buffered.push(event);
      } else deliverSession(record, event);
    }
    async function pump() {
      if (pumping || !records.size) return;
      pumping = true; const epoch = generation;
      try {
        const id = await client();
        while (epoch === generation && records.size) {
          const batch = await raw("poll", [id, [...records.keys()]]);
          if (epoch !== generation) break;
          for (const part of batch) {
            const record = records.get(part.id); if (!record) continue;
            record.fragments.push(Buffer.from(part.data, "base64"));
            if (part.last) {
              const event = JSON.parse(Buffer.concat(record.fragments).toString("utf8")); record.fragments = [];
              route(record, event);
            }
          }
          if (!batch.length) await new Promise(resolve => setTimeout(resolve, 25));
        }
      } catch (error) {
        if (epoch === generation) {
          for (const record of [...records.values()]) {
            if (record.kind === "operation") settle(record, failure(error));
            else { deliverSession(record, {type: "error", value: error}); deliverSession(record, {type: "end", value: {reason: "error"}}); }
          }
          const old = opening; opening = null; generation++;
          old?.then(id => raw("close", [id])).catch(() => {});
        }
      } finally { pumping = false; if (records.size) setTimeout(pump, 0); }
    }
    function attachCancellation(record, id, options, deadline) {
      const cancel = error => {
        record.cancelError ||= error;
        return raw("cancel", [id, record.key]).catch(error => {
        if (!records.has(record.key)) return;
        if (record.kind === "operation") settle(record, error);
        else { deliverSession(record, {type: "error", value: error}); deliverSession(record, {type: "end", value: {reason: "error"}}); }
        });
      };
      const onAbort = () => cancel(aborted());
      options.signal?.addEventListener("abort", onAbort, {once: true});
      const timer = deadline === Infinity ? null : setTimeout(() => cancel(SpeechError("Speech operation timed out", "TIMEOUT")), Math.max(0, deadline - Date.now()));
      record.cleanup = () => { options.signal?.removeEventListener("abort", onAbort); if (timer != null) clearTimeout(timer); };
      if (options.signal?.aborted) onAbort();
    }
    function callDeadline(options, startedAt) {
      if (options.signal !== undefined && (!options.signal || typeof options.signal.addEventListener !== "function" || typeof options.signal.removeEventListener !== "function"))
        throw SpeechError("signal must be an AbortSignal", "INVALID_OPTIONS");
      if (options.timeoutMs != null && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 2147483647))
        throw SpeechError("timeoutMs must be an integer in 1..2147483647", "INVALID_OPTIONS");
      return options.timeoutMs == null ? Infinity : startedAt + options.timeoutMs;
    }
    async function start(method, args, options = {}, progress, prepared, startedAt = Date.now()) {
      const deadline = callDeadline(options, startedAt);
      const epoch = generation; check(options.signal, epoch);
      const id = await client(); check(options.signal, epoch, deadline);
      const descriptor = await raw("start", [id, method, args]);
      if (epoch !== generation) { await raw("close", [id]).catch(() => {}); check(null, epoch); }
      let record, result;
      if (descriptor.kind === "operation") {
        record = {key: descriptor.id, kind: "operation", progress, fragments: []};
        result = new Promise((resolve, reject) => { record.resolve = resolve; record.reject = reject; });
      } else {
        record = newSession(descriptor, options);
        record.thenListen = prepared?.thenListen;
        result = record.handle;
      }
      records.set(record.key, record); attachCancellation(record, id, options, deadline);
      setTimeout(pump, 0); return result;
    }
    function pcm(value, max = 200 * 1024 * 1024 - 44) {
      let bytes;
      if (value instanceof ArrayBuffer) bytes = Buffer.from(value);
      else if (ArrayBuffer.isView(value)) bytes = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      else throw SpeechError("PCM must be an ArrayBuffer or a typed array view", "INVALID_OPTIONS");
      if (bytes.length % 2) throw SpeechError("PCM16 must have an even byte count", "INVALID_OPTIONS");
      if (bytes.length > max) throw SpeechError("PCM exceeds the speech protocol limit", "LIMIT_EXCEEDED");
      return Buffer.from(bytes);
    }
    async function upload(bytes, options, deadline = Infinity) {
      const epoch = generation; check(options?.signal, epoch);
      const id = await client(); check(options?.signal, epoch);
      const value = await raw("uploadBegin", [id, bytes.length]);
      try {
        for (let offset = 0; offset < bytes.length; offset += 12 * 1024) {
          check(options?.signal, epoch, deadline);
          await raw("uploadChunk", [id, value.id, offset, bytes.subarray(offset, offset + 12 * 1024).toString("base64")]);
        }
        check(options?.signal, epoch, deadline);
        return {id: value.id, dispose: () => raw("uploadDiscard", [id, value.id]).catch(() => {})};
      } catch (error) { await raw("uploadDiscard", [id, value.id]).catch(() => {}); throw error; }
    }
    async function audio(method, source, options, callOptions) {
      const startedAt = Date.now(), deadline = callDeadline(callOptions || {}, startedAt);
      const parsed = json(options);
      if (typeof source === "string") return start(method, [source, parsed], callOptions);
      const transfer = await upload(pcm(source), callOptions, deadline);
      try { return await start(method, [{upload: transfer.id}, parsed], callOptions, undefined, undefined, startedAt); }
      finally { await transfer.dispose(); }
    }
    function newSession(descriptor, options, round = -1) {
      const epoch = generation;
      const record = {key: descriptor.id, descriptor, options, kind: descriptor.kind, round, state: "pending", id: null, modelId: null,
        reason: null, text: null, finals: [], fragments: [], listeners: new Map(), rounds: new Map(), hits: 0, buffered: [], announced: round < 0};
      let commands = Promise.resolve(), stopping = false;
      const enqueue = action => { const result = commands.then(action); commands = result.catch(() => {}); return result; };
      const control = method => {
        stopping = true;
        return enqueue(async () => {
          check(null, epoch);
          if (record.state !== "ended") await start(method, [record.key, null, round]);
          return handle;
        });
      };
      const handle = emitter({
        get id() { return record.id; }, get modelId() { return record.modelId; },
        startedAt: descriptor.startedAt, get state() { return record.state; },
        get reason() { return record.reason; }, get isEnded() { return record.state === "ended"; },
        isActive: () => record.state !== "ended",
        stop: () => control("session.stop"),
        toString: () => (record.kind === "wake" ? "SpeechWakeSession" : "SpeechSession") + " { state: " + record.state + " }"
      }, record);
      if (record.kind === "wake") handle.keywords = [...descriptor.keywords];
      else Object.assign(handle, {
        source: descriptor.source, round, result: () => record.text ?? joined(record.finals),
        cancel: () => control("session.cancel"),
        feed(value) {
          if (stopping || record.state === "ended") return Promise.reject(SpeechError("Session has ended or is stopping", "SESSION_CLOSED"));
          if (descriptor.source !== "external") return Promise.reject(SpeechError("feed requires an external session", "INVALID_OPTIONS"));
          const bytes = pcm(value, 1024 * 1024);
          return enqueue(async () => {
            check(null, epoch);
            if (record.state === "ended") throw SpeechError("Session has ended", "SESSION_CLOSED");
            const transfer = await upload(bytes, {});
            try { await start("session.feed", [record.key, transfer.id]); return handle; }
            finally { await transfer.dispose(); }
          });
        }
      });
      record.handle = Object.freeze(handle); return record;
    }
    const api = {
      SpeechError,
      isAvailable: options => start("isAvailable", [], options),
      capabilities: options => start("capabilities", [], options),
      recognize: (source, options, callOptions) => audio("recognize", source, options, callOptions),
      recognizeAsync: (source, options, callOptions) => audio("recognizeAsync", source, options, callOptions),
      detectVoice: (source, options, callOptions) => audio("detectVoice", source, options, callOptions),
      listen: (options, callOptions) => start("listen", [json(options)], callOptions),
      wake: (keywords, options, callOptions) => { const parsed = json(options); return start("wake", [keywords, parsed], callOptions, null, parsed); },
      synthesize: (text, path, options, callOptions) => start("synthesize", [text, path, json(options)], callOptions),
      synthesizeAsync: (text, path, options, callOptions) => start("synthesizeAsync", [text, path, json(options)], callOptions),
      speak: (text, options, callOptions) => start("speak", [text, json(options)], callOptions),
      models: Object.freeze({
        list: (filter, callOptions) => start("models.list", [json(filter)], callOptions),
        install: (id, options, callOptions) => start("models.install", [id, json(options, true)], callOptions, options?.onProgress),
        installAsync: (id, options, callOptions) => start("models.installAsync", [id, json(options, true)], callOptions, options?.onProgress),
        importFile: (path, options, callOptions) => start("models.importFile", [path, json(options, true)], callOptions, options?.onProgress),
        remove: (id, options) => start("models.remove", [id], options),
        setDefault: (kind, id, options) => start("models.setDefault", [kind, id], options),
        getDefault: (kind, options) => start("models.getDefault", [kind], options),
        refreshCatalog: options => start("models.refreshCatalog", [], options)
      }),
      async close() {
        generation++;
        const old = opening; opening = null;
        for (const record of [...records.values()]) {
          if (record.kind === "operation") settle(record, SpeechError("Speech client closed", "SESSION_CLOSED"));
          else deliverSession(record, {type: "end", value: {reason: "script-exit"}});
        }
        return old ? old.then(id => raw("close", [id]), () => false) : false;
      }
    };
    return Object.freeze(api);
  }
  // End shared speech facade.
// END GENERATED SPEECH FACADE

// BEGIN GENERATED EPUB FACADE
  // Shared EPUB facade. Operations and reader callbacks stay on the owning JS thread.
  function __autojs6_create_epub(call) {
    let opening = null, generation = 0, pumping = false;
    const records = new Map(), pending = new Set();
    function EpubError(message = "", code = "INTERNAL") {
      const error = new Error(String(message));
      Object.setPrototypeOf(error, EpubError.prototype);
      error.name = "EpubError"; error.code = String(code ?? "INTERNAL");
      return error;
    }
    EpubError.prototype = Object.create(Error.prototype, {
      constructor: {value: EpubError, writable: true, configurable: true},
      toString: {value() { return "EpubError [" + this.code + "]: " + this.message; }, configurable: true}
    });
    const failure = error => error instanceof EpubError ? error :
      EpubError(error?.message || String(error), String(error?.code || "INTERNAL").replace(/^ERR_AUTOJS6_EPUB_/, ""));
    const raw = (method, args) => Promise.resolve().then(() =>
      call("epub", method, args, {timeoutMs: 10000, permissions: ["epub"]})).catch(error => { throw failure(error); });
    const closedError = () => EpubError("EPUB client or handle is closed", "SESSION_CLOSED");
    function validate(args) {
      try {
        JSON.stringify(args, (_, value) => {
          if (typeof value === "number" && !Number.isFinite(value) ||
              ["function", "symbol", "bigint"].includes(typeof value))
            throw EpubError("EPUB arguments must contain finite JSON values", "INVALID_ARGUMENT");
          return value;
        });
      } catch (error) { throw error instanceof EpubError ? error : EpubError(error.message, "INVALID_ARGUMENT"); }
    }
    async function client() {
      if (!opening) {
        const epoch = generation;
        const value = raw("open", []).then(async descriptor => {
          if (epoch !== generation) { await raw("close", [descriptor.id]); throw closedError(); }
          return descriptor.id;
        });
        opening = value;
        value.catch(() => { if (opening === value) opening = null; });
      }
      return opening;
    }
    function forget(record) {
      if (record.key) records.delete(record.key);
      pending.delete(record); record.cleanup?.(); record.fragments = [];
    }
    function settle(record, error, value) {
      if (record.settled) return;
      record.settled = true;
      forget(record);
      error ? record.reject(error) : record.resolve(value);
    }
    function emit(record, name, value) {
      const listeners = [...(record.listeners.get(name) || [])];
      if (!listeners.length) {
        const values = record.buffered.get(name) || [];
        // Preserve startup/terminal events for listeners installed after awaiting read().
        if (values.length < 32) values.push(value);
        record.buffered.set(name, values);
      }
      for (const entry of listeners) {
        if (entry.once) record.listeners.set(name, record.listeners.get(name).filter(x => x !== entry));
        try { entry.listener(value); } catch (error) { setTimeout(() => { throw error; }, 0); }
      }
    }
    function readerEvent(record, event) {
      if (record.state === "closed") return;
      if (event.type === "open") { record.state = "open"; record.title = event.title ?? null; }
      if ("locator" in event) record.locator = event.locator;
      record.progress = event.totalProgression ?? event.locator?.locations?.totalProgression ?? record.progress;
      if ("href" in event) record.href = event.href;
      if ("positions" in event) record.positions = event.positions;
      if (event.type === "progress") {
        record.chapterTitle = event.chapterTitle ?? null;
        event = {...event, totalProgression: record.progress < 0 ? null : record.progress};
      }
      if (event.type === "close") {
        record.state = "closed"; record.reason = event.reason || "host"; forget(record);
      }
      const {type, ...payload} = event;
      emit(record, type, type === "error" ? failure(payload) : payload);
    }
    function makeReader(record, descriptor) {
      record.kind = "reader"; record.state = "pending"; record.reason = null;
      record.locator = null; record.progress = -1; record.title = null;
      record.chapterTitle = null; record.href = null; record.positions = 0;
      record.listeners = new Map(); record.buffered = new Map();
      const handle = {path: descriptor.path};
      for (const key of ["state", "reason", "locator", "progress", "title", "chapterTitle", "href", "positions"])
        Object.defineProperty(handle, key, {enumerable: true, get: () => record[key]});
      Object.defineProperties(handle, {
        isOpen: {enumerable: true, get: () => record.state === "open"},
        isClosed: {enumerable: true, get: () => record.state === "closed"}
      });
      for (const method of ["on", "once"]) handle[method] = (name, listener) => {
        if (typeof listener !== "function") throw new TypeError("EPUB listener must be a function");
        record.listeners.set(name, [...(record.listeners.get(name) || []), {listener, once: method === "once"}]);
        if (record.buffered.has(name)) queueMicrotask(() => {
          const values = record.buffered.get(name) || []; record.buffered.delete(name);
          for (const value of values) emit(record, name, value);
        });
        return handle;
      };
      handle.addListener = handle.on;
      handle.off = handle.removeListener = (name, listener) => {
        record.listeners.set(name, (record.listeners.get(name) || []).filter(x => x.listener !== listener)); return handle;
      };
      handle.removeAllListeners = name => {
        name === undefined ? record.listeners.clear() : record.listeners.delete(name); return handle;
      };
      handle.listenerCount = name => (record.listeners.get(name) || []).length;
      for (const method of ["goTo", "next", "prev", "nextChapter", "prevChapter", "setPreferences", "bookmarks"]) {
        const hasValue = method === "goTo" || method === "setPreferences";
        handle[method] = (value, options) => {
          if (record.state === "closed" || record.epoch !== generation) return Promise.reject(closedError());
          return run("reader." + method, [descriptor.id, ...(hasValue ? [value] : [])],
            hasValue ? options : value).then(result => method === "bookmarks" ? result : handle);
        };
      }
      handle.close = (options, callOptions) => {
        if (record.state === "closed") return Promise.resolve(handle);
        return run("reader.close", [descriptor.id, options], callOptions).then(() => handle);
      };
      record.handle = handle;
      for (const event of record.early.splice(0)) readerEvent(record, event);
      return handle;
    }
    function makeBook(descriptor, epoch) {
      let closed = false;
      const book = {};
      for (const key of ["path", "metadata", "toc", "readingOrder", "positions"])
        Object.defineProperty(book, key, {enumerable: true, value: descriptor[key]});
      Object.defineProperty(book, "isClosed", {enumerable: true, get: () => closed || epoch !== generation});
      const operation = (name, args, options) => book.isClosed ? Promise.reject(closedError()) :
        run("book." + name, [descriptor.id, ...args], options).then(value =>
          name === "cover" && value && typeof value.base64 === "string" ? Buffer.from(value.base64, "base64") : value);
      book.text = (target, options, callOptions) => operation("text", [target, options], callOptions);
      book.textAll = (options, callOptions) => operation("textAll", [options], callOptions);
      book.cover = (path, options, callOptions) => operation("cover", [path, options], callOptions);
      book.resource = (href, path, options, callOptions) => operation("resource", [href, path, options], callOptions);
      book.search = (query, options, callOptions) => operation("search", [query, options], callOptions);
      book.annotations = options => operation("annotations", [], options);
      book.close = async options => {
        if (book.isClosed) return;
        closed = true;
        try { await run("book.close", [descriptor.id], options); }
        catch (error) { closed = epoch !== generation; throw error; }
      };
      for (const name of ["text", "textAll", "cover", "resource", "search", "annotations"]) book[name + "Async"] = book[name];
      return book;
    }
    function deliver(record, message) {
      if (message.type === "event") {
        if (record.kind === "reader") readerEvent(record, message.value);
        else record.early.push(message.value);
      } else if (message.type === "reject") settle(record, failure(message.value));
      else if (message.type === "resolve") {
        if (record.method === "read") {
          const handle = makeReader(record, message.value);
          record.settled = true; pending.delete(record); record.clearTimeout?.(); record.resolve(handle);
        } else settle(record, null, record.method === "openBook" ? makeBook(message.value, record.epoch) : message.value);
      }
    }
    async function pump() {
      if (pumping || !records.size) return;
      pumping = true; const epoch = generation;
      try {
        const id = await client();
        while (epoch === generation && records.size) {
          const parts = await raw("poll", [id, [...records.keys()]]);
          if (epoch !== generation) break;
          for (const part of parts) {
            const record = records.get(part.id); if (!record) continue;
            record.fragments.push(Buffer.from(part.data, "base64"));
            if (part.last) {
              const value = JSON.parse(Buffer.concat(record.fragments).toString("utf8"));
              record.fragments = []; deliver(record, value);
            }
          }
          if (!parts.length) await new Promise(resolve => setTimeout(resolve, 25));
        }
      } catch (error) {
        if (epoch === generation) {
          for (const record of [...records.values()]) {
            if (record.kind === "reader") { readerEvent(record, {type: "error", code: failure(error).code, message: failure(error).message}); readerEvent(record, {type: "close", reason: "error"}); }
            else settle(record, failure(error));
          }
          const old = opening; opening = null; generation++;
          old?.then(id => raw("close", [id])).catch(() => {});
        }
      } finally { pumping = false; if (records.size) setTimeout(pump, 0); }
    }
    function run(method, args, options = {}) {
      return new Promise((resolve, reject) => {
        let timer;
        const record = {method, resolve, reject, key: null, client: null, epoch: generation,
          kind: "operation", fragments: [], early: [], settled: false};
        const cancel = error => {
          record.cancelError ||= error;
          if (record.key) raw("cancel", [record.client, record.key]).catch(() => {});
          if (record.kind === "reader") readerEvent(record, {type: "close", reason: "cancelled"});
          else settle(record, record.cancelError);
        };
        try {
          validate(args);
          if (!options || typeof options !== "object" || Array.isArray(options)) throw EpubError("Call options must be an object", "INVALID_ARGUMENT");
          const timeout = options.timeoutMs ?? 60000, signal = options.signal;
          if (!Number.isFinite(timeout) || timeout <= 0) throw EpubError("timeoutMs must be positive and finite", "INVALID_ARGUMENT");
          if (signal != null && (typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function"))
            throw EpubError("signal must be an AbortSignal", "INVALID_ARGUMENT");
          const abort = () => cancel(EpubError("EPUB operation cancelled", "CANCELLED"));
          record.clearTimeout = () => clearTimeout(timer);
          record.cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
          pending.add(record);
          const deadline = Date.now() + timeout;
          const watchDeadline = () => {
            const remaining = deadline - Date.now();
            if (remaining <= 0) cancel(EpubError("EPUB operation timed out", "TIMEOUT"));
            else timer = setTimeout(watchDeadline, Math.min(remaining, 2147483647));
          };
          signal?.addEventListener("abort", abort, {once: true});
          if (signal?.aborted) { abort(); return; }
          watchDeadline();
          if (record.cancelError) return;
          (async () => {
            record.client = await client();
            if (record.cancelError || record.epoch !== generation) throw record.cancelError || closedError();
            const value = await raw("start", [record.client, method, args]);
            record.key = value.id;
            if (record.cancelError || record.epoch !== generation) {
              await raw("cancel", [record.client, record.key]).catch(() => {});
              throw record.cancelError || closedError();
            }
            records.set(record.key, record); pump();
          })().catch(error => settle(record, failure(error)));
        } catch (error) { settle(record, failure(error)); }
      });
    }
    const api = {
      EpubError,
      isAvailable: options => run("isAvailable", [], options),
      open: (source, options) => run("openBook", [source], options),
      read: (source, options, callOptions) => run("read", [source, options], callOptions),
      async close() {
        generation++;
        const old = opening; opening = null;
        for (const record of new Set([...pending, ...records.values()])) {
          if (record.kind === "reader") readerEvent(record, {type: "close", reason: "host"});
          else settle(record, closedError());
        }
        if (old) await old.then(id => raw("close", [id]), () => {});
      }
    };
    const withBook = async (source, method, args, options) => {
      const book = await api.open(source, options);
      try { return await book[method](...args, options); } finally { await book.close(); }
    };
    for (const name of ["metadata", "toc", "readingOrder"])
      api[name] = async (source, options) => {
        const book = await api.open(source, options);
        try { return book[name]; } finally { await book.close(); }
      };
    api.text = (source, target, options, callOptions) => withBook(source, "text", [target, options], callOptions);
    api.cover = (source, outputPath, options, callOptions) => withBook(source, "cover", [outputPath, options], callOptions);
    api.search = (source, query, options, callOptions) => withBook(source, "search", [query, options], callOptions);
    api.annotations = (source, options) => withBook(source, "annotations", [], options);
    for (const name of ["isAvailable", "open", "metadata", "toc", "readingOrder", "text", "cover", "search", "annotations", "read"])
      api[name + "Async"] = api[name];
    return api;
  }
  // End shared EPUB facade.
// END GENERATED EPUB FACADE

// BEGIN GENERATED MAIL FACADE
  // Shared mail facade. Protocol callbacks run on the owning JavaScript thread.
  function __autojs6_create_mail(call) {
    let opening = null, generation = 0, pumping = false, defaultClient = null;
    const records = new Map(), pending = new Set(), accounts = new Map(), accountHandles = new WeakMap();
    function MailError(message = "", code = "INTERNAL", details = null, retryable = false) {
      const error = new Error(message == null ? "" : String(message));
      Object.setPrototypeOf(error, MailError.prototype);
      error.name = "MailError"; error.code = String(code ?? "INTERNAL");
      error.details = details; error.retryable = !!retryable;
      return error;
    }
    MailError.prototype = Object.create(Error.prototype, {
      constructor: {value: MailError, writable: true, configurable: true},
      toString: {value() { return this.name + " [" + this.code + "]: " + this.message; }, configurable: true}
    });
    function failure(error) {
      if (error instanceof MailError) return error;
      let details = error?.details ?? null;
      if (typeof details === "string") { try { details = JSON.parse(details); } catch (_) {} }
      return MailError(error?.message || String(error), String(error?.code || "INTERNAL").replace(/^ERR_AUTOJS6_MAIL_/, ""),
        details, error?.retryable);
    }
    const raw = (method, args) => Promise.resolve().then(() =>
      call("mail", method, args, {timeoutMs: 10000, permissions: ["mail"]})).catch(error => { throw failure(error); });
    const closedError = () => MailError("Mail client or handle is closed", "SESSION_CLOSED");
    function validate(args) {
      try {
        JSON.stringify(args, (_, value) => {
          if (typeof value === "number" && !Number.isFinite(value) ||
              ["function", "symbol", "bigint"].includes(typeof value))
            throw MailError("Mail arguments must contain finite JSON values", "INVALID_ARGUMENT");
          return value;
        });
      } catch (error) { throw error instanceof MailError ? error : MailError("Mail arguments must be JSON-compatible", "INVALID_ARGUMENT"); }
    }
    async function owner() {
      if (!opening) {
        const epoch = generation;
        const value = raw("open", []).then(async descriptor => {
          if (epoch !== generation) { await raw("close", [descriptor.id]); throw closedError(); }
          return descriptor.id;
        });
        opening = value;
        value.catch(() => { if (opening === value) opening = null; });
      }
      return opening;
    }
    function forget(record) {
      if (record.key) records.delete(record.key);
      pending.delete(record); record.cleanup?.(); record.fragments = [];
    }
    function settle(record, error, value) {
      if (record.settled) return;
      record.settled = true; forget(record);
      error ? record.reject(error) : record.resolve(value);
    }
    function emit(record, name, value) {
      const listeners = [...(record.listeners.get(name) || [])];
      if (!listeners.length) {
        const values = record.buffered.get(name) || [];
        if (values.length < 32) values.push(value);
        record.buffered.set(name, values);
      }
      for (const entry of listeners) {
        if (entry.once) record.listeners.set(name, record.listeners.get(name).filter(x => x !== entry));
        try { if (name === "message") entry.listener(value, record.handle); else entry.listener(value); } catch (error) { setTimeout(() => { throw error; }, 0); }
      }
    }
    function watchEvent(record, event) {
      if (record.state === "closed") return;
      const name = event.name;
      let value = event.value;
      if (name === "mode") record.mode = value;
      if (name === "close") {
        record.state = "closed"; record.reason = value || "closed"; forget(record);
      }
      if (name === "error") value = failure(value);
      if (name === "message") value = message(value, record.account);
      emit(record, name, value);
    }
    function makeWatch(record, descriptor) {
      record.kind = "watch"; record.state = descriptor.isClosed ? "closed" : "active";
      record.reason = descriptor.reason ?? null; record.mode = descriptor.mode ?? null;
      record.watchGeneration = descriptor.generation || 0;
      record.listeners = new Map(); record.buffered = new Map();
      const handle = {folder: descriptor.folder};
      for (const key of ["state", "reason", "mode"])
        Object.defineProperty(handle, key, {enumerable: true, get: () => record[key]});
      Object.defineProperties(handle, {
        generation: {enumerable: true, get: () => record.watchGeneration},
        isActive: {enumerable: true, get: () => record.state === "active"},
        isClosed: {enumerable: true, get: () => record.state === "closed"}
      });
      for (const method of ["on", "once"]) handle[method] = (name, listener) => {
        if (typeof listener !== "function") throw new TypeError("Mail listener must be a function");
        record.listeners.set(name, [...(record.listeners.get(name) || []), {listener, once: method === "once"}]);
        if (record.buffered.has(name)) queueMicrotask(() => {
          const values = record.buffered.get(name) || []; record.buffered.delete(name);
          for (const value of values) emit(record, name, value);
        });
        return handle;
      };
      handle.addListener = handle.on;
      handle.off = handle.removeListener = (name, listener) => {
        record.listeners.set(name, (record.listeners.get(name) || []).filter(x => x.listener !== listener)); return handle;
      };
      handle.removeAllListeners = name => {
        name === undefined ? record.listeners.clear() : record.listeners.delete(name); return handle;
      };
      handle.listenerCount = name => (record.listeners.get(name) || []).length;
      handle.stop = async options => {
        if (record.state !== "closed") {
          await run("watch.stop", [descriptor.id], options);
          watchEvent(record, {name: "close", value: "stopped"});
        }
        return handle;
      };
      record.handle = handle;
      for (const packet of record.early.splice(0)) deliver(record, packet);
      if (record.state === "closed") forget(record);
      return handle;
    }
    function bind(object, key, value) {
      Object.defineProperty(object, key, {value, enumerable: false, configurable: true});
    }
    function message(value, client) {
      if (!value || typeof value !== "object") throw MailError("Mail provider returned no message object", "INTERNAL");
      for (const key of ["date", "receivedDate"]) if (typeof value[key] === "number") value[key] = new Date(value[key]);
      const address = item => {
        if (item && typeof item === "object") bind(item, "toString", () =>
          item.name?.trim() ? item.name.trim() + " <" + item.address + ">" : String(item.address ?? ""));
      };
      for (const key of ["from", "sender"]) address(value[key]);
      for (const key of ["to", "cc", "bcc", "replyTo"]) for (const item of value[key] || []) address(item);
      for (const key of ["attachments", "bodyParts"]) for (const attachment of value[key] || []) {
        if (!("uid" in attachment)) attachment.uid = value.uid;
        if (!("folder" in attachment)) attachment.folder = value.folder;
        const download = (target, options, callOptions) => client.download(attachment, target, options, callOptions);
        bind(attachment, "download", download); bind(attachment, "downloadAsync", download);
      }
      const load = (options, callOptions) => client.get(value, options, callOptions);
      bind(value, "load", load); bind(value, "loadAsync", load);
      return value;
    }
    const messageTargets = new Set(["get", "fetchBody", "raw", "setFlags", "markRead", "markUnread", "flag", "unflag", "move", "copy", "delete"]);
    function messageReference(value) {
      return value && typeof value === "object" && !Array.isArray(value) ? {uid: value.uid, folder: value.folder} : value;
    }
    const arities = {
      test: 0, send: 2, folders: 1, folderStatus: 1, createFolder: 1, deleteFolder: 1, renameFolder: 2,
      fetch: 1, search: 2, get: 2, fetchBody: 2, download: 3, raw: 3, setFlags: 4,
      markRead: 2, markUnread: 2, flag: 2, unflag: 2, move: 3, copy: 3, delete: 2, expunge: 1, append: 3
    };
    function makeAccount(descriptor, epoch, tokenProvider) {
      const record = {key: descriptor.id, epoch, closed: false, connected: !!descriptor.isConnected,
        fragments: [], tokenProvider};
      const client = {};
      Object.defineProperties(client, {
        account: {enumerable: true, value: descriptor.account},
        isConnected: {enumerable: true, get: () => !record.closed && epoch === generation && record.connected},
        isClosed: {enumerable: true, get: () => record.closed || epoch !== generation}
      });
      for (const [name, count] of Object.entries(arities)) {
        client[name] = (...input) => {
          if (client.isClosed) return Promise.reject(closedError());
          const args = Array.from({length: count}, (_, i) => input[i]);
          if (messageTargets.has(name)) args[0] = Array.isArray(args[0]) ? args[0].map(messageReference) : messageReference(args[0]);
          const callOptions = input[count];
          let onProgress;
          if (name === "download" || name === "raw") {
            const options = args[2];
            if (options && typeof options === "object") {
              onProgress = options.onProgress;
              if (onProgress != null && typeof onProgress !== "function")
                return Promise.reject(MailError("onProgress must be a function", "INVALID_ARGUMENT"));
              args[2] = {...options}; delete args[2].onProgress;
            }
          }
          return run("client." + name, [descriptor.id, ...args], callOptions, {account: client, onProgress}).then(value => {
            if (name === "get" || name === "fetchBody") return message(value, client);
            if (name === "fetch") return (value || []).map(item => message(item, client));
            if (name === "search") {
              const list = (value?.messages || []).map(item => message(item, client));
              bind(list, "fallback", value?.fallback ?? "server"); return list;
            }
            return value;
          });
        };
        client[name + "Async"] = client[name];
      }
      client.folder = path => {
        if (client.isClosed) throw closedError();
        if (typeof path !== "string" || !path.trim()) throw MailError("Folder path must be a nonempty string", "INVALID_ARGUMENT");
        path = path.trim();
        const folder = {path, name: path.substring(path.lastIndexOf("/") + 1)};
        for (const [name, op] of [["status", "folderStatus"], ["create", "createFolder"], ["delete", "deleteFolder"], ["rename", "renameFolder"]]) {
          folder[name] = (...args) => client[op](path, ...args);
          folder[name + "Async"] = folder[name];
        }
        bind(folder, "toString", () => path);
        return folder;
      };
      client.watch = (folder, options, callOptions) => {
        if (client.isClosed) return Promise.reject(closedError());
        if (folder && typeof folder === "object") { callOptions = options; options = folder; folder = undefined; }
        return run("client.watch", [descriptor.id, folder, options], callOptions, {account: client});
      };
      client.close = async options => {
        if (client.isClosed) return;
        await run("client.close", [descriptor.id], options);
        record.closed = true; record.connected = false; accounts.delete(descriptor.id);
        if (defaultClient === client) defaultClient = null;
        for (const watch of [...records.values()])
          if (watch.kind === "watch" && watch.account === client) watchEvent(watch, {name: "close", value: "closed"});
      };
      bind(client, "toString", () => "MailClient { " + (client.account.alias ? "alias=" + client.account.alias :
        "address=" + (client.account.address ?? "")) + " }");
      record.handle = client; accounts.set(descriptor.id, record); accountHandles.set(client, record);
      return client;
    }
    async function answerToken(record, requestId) {
      const epoch = generation;
      try {
        const token = await record.tokenProvider?.();
        if (epoch !== generation || record.closed || record.cancelError) return;
        if (typeof token !== "string" || !token.trim()) throw MailError("Token provider must return a nonempty string", "AUTH_FAILED");
        await raw("answer", [await owner(), requestId, token, true]);
      } catch (_) {
        if (epoch === generation && !record.closed && !record.cancelError) await raw("answer", [await owner(), requestId, "", false]).catch(() => {});
      }
    }
    function deliver(record, packet) {
      if (packet.type === "token") { void answerToken(record, packet.value.id); return; }
      if (packet.type === "debug") {
        if (Array.isArray(packet.value)) for (const line of packet.value) globalThis.console?.debug(String(line));
        return;
      }
      if (packet.type === "progress") {
        try { record.onProgress?.(packet.value.transferred, packet.value.total ?? null); }
        catch (error) { setTimeout(() => { throw error; }, 0); }
        return;
      }
      if (packet.type === "event" || packet.type === "state") {
        if (record.kind === "watch") {
          if (packet.type === "event") watchEvent(record, packet.value);
          else record.watchGeneration = packet.value.generation ?? record.watchGeneration;
        } else record.early.push(packet);
      } else if (packet.type === "reject") settle(record, failure(packet.value));
      else if (packet.type === "resolve") {
        if (record.method === "client.watch") {
          const handle = makeWatch(record, packet.value);
          record.settled = true; pending.delete(record); record.clearTimeout?.(); record.resolve(handle);
        } else settle(record, null, record.method === "connect" ?
          makeAccount(packet.value, record.epoch, record.tokenProvider) : packet.value);
      }
    }
    async function pump() {
      if (pumping || !records.size) return;
      pumping = true; const epoch = generation;
      try {
        const id = await owner();
        while (epoch === generation && records.size) {
          const parts = await raw("poll", [id, [...new Set([...records.keys(), ...accounts.keys()])]]);
          if (epoch !== generation) break;
          for (const part of parts) {
            const record = records.get(part.id) || accounts.get(part.id); if (!record) continue;
            record.fragments.push(Buffer.from(part.data, "base64"));
            if (!part.last) continue;
            const value = JSON.parse(Buffer.concat(record.fragments).toString("utf8"));
            record.fragments = [];
            if (accounts.get(part.id) === record) {
              if (value.type === "token") void answerToken(record, value.value.id);
              if (value.type === "state") {
                record.connected = !!value.value.isConnected;
                record.closed = !!value.value.isClosed;
              }
            } else deliver(record, value);
          }
          if (!parts.length) await new Promise(resolve => setTimeout(resolve, 25));
        }
      } catch (error) {
        if (epoch === generation) {
          for (const record of [...records.values()]) {
            if (record.kind === "watch") {
              watchEvent(record, {name: "error", value: failure(error)});
              watchEvent(record, {name: "close", value: "error"});
            } else settle(record, failure(error));
          }
          for (const account of accounts.values()) account.closed = true;
          accounts.clear(); defaultClient = null;
          const old = opening; opening = null; generation++;
          old?.then(id => raw("close", [id])).catch(() => {});
        }
      } finally { pumping = false; if (records.size) setTimeout(pump, 0); }
    }
    function run(method, args, options = {}, meta = {}) {
      return new Promise((resolve, reject) => {
        let timer;
        const record = {method, resolve, reject, key: null, owner: null, epoch: generation,
          kind: "operation", fragments: [], early: [], settled: false, ...meta};
        const cancel = error => {
          record.cancelError ||= error;
          if (record.key) raw("cancel", [record.owner, record.key]).catch(() => {});
          if (record.kind === "watch") {
            watchEvent(record, {name: "close", value: "cancelled"});
          } else settle(record, record.cancelError);
        };
        try {
          validate(args);
          if (!options || typeof options !== "object" || Array.isArray(options))
            throw MailError("Call options must be an object", "INVALID_ARGUMENT");
          const timeout = options.timeoutMs ?? 60000, signal = options.signal;
          if (!Number.isFinite(timeout) || timeout <= 0) throw MailError("timeoutMs must be positive and finite", "INVALID_ARGUMENT");
          if (signal != null && (typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function"))
            throw MailError("signal must be an AbortSignal", "INVALID_ARGUMENT");
          const abort = () => cancel(MailError("Mail operation cancelled", "CANCELLED"));
          record.clearTimeout = () => clearTimeout(timer);
          record.cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
          pending.add(record);
          const deadline = Date.now() + timeout;
          const watchDeadline = () => {
            const remaining = deadline - Date.now();
            if (remaining <= 0) cancel(MailError("Mail operation timed out", "TIMEOUT"));
            else timer = setTimeout(watchDeadline, Math.min(remaining, 2147483647));
          };
          signal?.addEventListener("abort", abort, {once: true});
          if (signal?.aborted) { abort(); return; }
          watchDeadline();
          if (record.cancelError) return;
          (async () => {
            record.owner = await owner();
            if (record.cancelError || record.epoch !== generation) throw record.cancelError || closedError();
            const value = await raw("start", [record.owner, method, args]);
            record.key = value.id;
            if (record.cancelError || record.epoch !== generation) {
              await raw("cancel", [record.owner, record.key]).catch(() => {});
              throw record.cancelError || closedError();
            }
            records.set(record.key, record); pump();
          })().catch(error => settle(record, failure(error)));
        } catch (error) { settle(record, failure(error)); }
      });
    }
    const api = {
      MailError,
      connect(options, callOptions) {
        let tokenProvider;
        if (options && typeof options === "object") {
          tokenProvider = options.tokenProvider;
          if (tokenProvider != null && typeof tokenProvider !== "function")
            return Promise.reject(MailError("tokenProvider must be a function", "INVALID_ARGUMENT"));
          options = {...options}; delete options.tokenProvider;
        }
        return run("connect", [options, !!tokenProvider], callOptions, {tokenProvider});
      },
      async setDefault(value, options) {
        let client = value;
        if (!accountHandles.has(client)) client = await api.connect(value, options);
        const record = accountHandles.get(client);
        if (!record || record.epoch !== generation || client.isClosed) throw closedError();
        defaultClient = client;
        return client;
      },
      async close(options) { await defaultClient?.close(options); },
      async dispose() {
        generation++;
        const old = opening; opening = null;
        for (const record of new Set([...pending, ...records.values()])) {
          if (record.kind === "watch") watchEvent(record, {name: "close", value: "script-exit"});
          else settle(record, closedError());
        }
        for (const record of accounts.values()) record.closed = true;
        accounts.clear(); defaultClient = null;
        if (old) await old.then(id => raw("close", [id]), () => {});
      }
    };
    api.connectAsync = api.connect;
    Object.defineProperty(api, "default", {enumerable: true, get: () => defaultClient});
    api.providers = {
      list: options => run("providers.list", [], options),
      get: (id, options) => run("providers.get", [id], options),
      resolve: (address, options) => run("providers.resolve", [address], options)
    };
    api.accounts = {
      list: options => run("accounts.list", [], options),
      has: async (alias, options) => typeof alias === "string" && !!alias.trim() &&
        (await api.accounts.list(options)).some(account => account.alias === alias.trim())
    };
    for (const name of [...Object.keys(arities), "folder", "watch"]) {
      api[name] = (...args) => {
        if (!defaultClient) {
          const error = MailError("No default mail account: call mail.setDefault first", "NO_DEFAULT_ACCOUNT");
          if (name === "folder") throw error;
          return Promise.reject(error);
        }
        return defaultClient[name](...args);
      };
      if (name in arities) api[name + "Async"] = api[name];
    }
    return api;
  }
  // End shared mail facade.
// END GENERATED MAIL FACADE

// BEGIN GENERATED FLOW FACADE
  // Shared flow core. Callbacks and timers belong to the importing JavaScript runtime.
  function __autojs6_create_flow(call, logger = globalThis.console, AsyncContext) {
    const records = new WeakMap(), pending = new Set();
    const creationContext = AsyncContext ? new AsyncContext() : null;
    const clock = () => globalThis.performance?.now?.() ?? Date.now();
    let defaults = {timeout: 10000, interval: 200, stableFor: 100, recoverService: false, trace: false, strictActions: true, humanize: false};
    let creating = null;
    function FlowError(code, step, selector = null, elapsed = 0, attempts = 0, reason = null) {
      const error = new Error(code + ' in flow.' + step + (reason ? ' (' + reason + ')' : ''));
      Object.setPrototypeOf(error, FlowError.prototype);
      Object.assign(error, {name: 'FlowError', code, step, selector, elapsed, attempts, reason});
      return error;
    }
    FlowError.prototype = Object.create(Error.prototype, {constructor: {value: FlowError}});
    const number = (value, name, infinite = false) => {
      if (typeof value !== 'number' || value < 0 || !(Number.isFinite(value) || infinite && value === Infinity))
        throw new TypeError(name + ' must be a non-negative ' + (infinite ? 'number' : 'finite number'));
      return value;
    };
    const integer = (value, name, infinite = false) => {
      number(value, name, infinite);
      if (value !== Infinity && !Number.isSafeInteger(value)) throw new TypeError(name + ' must be a safe integer');
      return value;
    };
    const object = (value, keys) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Options must be an object');
      for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError('Unsupported flow option: ' + key);
      return value;
    };
    const fn = value => { if (typeof value !== 'function') throw new TypeError('A callback is required'); return value; };
    const thenable = value => value != null && typeof value.then === 'function';
    const failure = (r, code, reason = null, attempts = 0) => FlowError(code, r.step, r.selector ?? null, clock() - r.started, attempts, reason);
    function trace(r, event) {
      if (r.tracing) try { logger?.log?.('[flow] ' + r.step + ' ' + event + ' ' + Math.round(clock() - r.started) + ' ms'); } catch (_) {}
    }
    function settle(r, ok, value) {
      if (r.state !== 'pending') return;
      r.state = ok ? 'fulfilled' : value?.code === 'CANCELLED' ? 'cancelled' : 'rejected';
      if (ok) r.value = value; else r.error = value;
      pending.delete(r);
      for (const cleanup of r.cleanups) cleanup();
      r.cleanups.clear();
      trace(r, r.state);
      (ok ? r.resolve : r.reject)(value);
    }
    function stop(r, error, upward = true) {
      if (r.state !== 'pending') return false;
      r.controller.abort(error);
      settle(r, false, error);
      for (const owned of r.owned) stop(owned, failure(owned, 'CANCELLED'));
      r.owned.clear();
      if (upward && r.parent?.state === 'pending' && [...r.parent.children].every(child => child.state === 'cancelled'))
        stop(r.parent, failure(r.parent, 'CANCELLED'));
      return true;
    }
    function checkpoint(r) {
      if (r.controller.signal.aborted) throw r.controller.signal.reason;
      if (clock() >= r.deadline) throw failure(r, 'TIMEOUT', 'chain');
    }
    function waitPromise(r, value) {
      if (value === r.handle) return Promise.reject(new TypeError('A Flow cannot resolve to itself'));
      const adopted = records.get(value);
      if (adopted) {
        for (let parent = adopted; parent; parent = parent.parent)
          if (parent === r) return Promise.reject(new TypeError('Cyclic Flow adoption'));
        value = adopted.promise;
      }
      const source = Promise.resolve(value);
      source.catch(() => {});
      try { checkpoint(r); } catch (error) { return Promise.reject(error); }
      return new Promise((resolve, reject) => {
        const signal = r.controller.signal;
        const abort = () => { cleanup(); reject(signal.reason); };
        const cleanup = () => { signal.removeEventListener('abort', abort); r.cleanups.delete(cleanup); };
        r.cleanups.add(cleanup); signal.addEventListener('abort', abort, {once: true});
        source.then(result => { cleanup(); resolve(result); }, error => { cleanup(); reject(error); });
      });
    }
    function pause(r, ms) {
      checkpoint(r);
      return waitPromise(r, new Promise(resolve => {
        const started = clock(); let timer;
        const cleanup = () => clearTimeout(timer);
        const tick = () => {
          const left = ms - (clock() - started);
          if (left <= 0) { r.cleanups.delete(cleanup); resolve(); }
          else timer = setTimeout(tick, Math.min(left, 2147483647));
        };
        r.cleanups.add(cleanup); timer = setTimeout(tick, Math.min(ms, 2147483647));
      }));
    }
    async function bounded(r, duration, error, work) {
      const local = {...r, controller: new AbortController(), cleanups: new Set()};
      const existing = new Set(r.owned);
      const start = clock(); let timer;
      const abort = () => local.controller.abort(r.controller.signal.reason);
      r.controller.signal.addEventListener('abort', abort, {once: true});
      if (r.controller.signal.aborted) abort();
      const expire = () => {
        const left = duration - (clock() - start);
        if (left <= 0) local.controller.abort(error());
        else timer = setTimeout(expire, Math.min(left, 2147483647));
      };
      if (Number.isFinite(duration)) timer = setTimeout(expire, Math.min(duration, 2147483647));
      try { return await waitPromise(local, work(local)); }
      catch (error) {
        if (local.controller.signal.aborted) for (const child of r.owned)
          if (!existing.has(child)) stop(child, failure(child, 'CANCELLED'));
        throw error;
      }
      finally {
        clearTimeout(timer); r.controller.signal.removeEventListener('abort', abort);
        for (const cleanup of local.cleanups) cleanup(); local.cleanups.clear();
      }
    }
    async function invoke(r, callback, args) {
      checkpoint(r);
      const run = () => {
        const previous = creating;
        try { creating = r; return callback(...args); } finally { creating = previous; }
      };
      const result = creationContext ? creationContext.run(r, run) : run();
      return waitPromise(r, result);
    }
    function make(step, parent, execute, acceptsError = false, rerunnable = true) {
      const handle = Object.create(Flow.prototype), controller = new AbortController();
      const r = {handle, step, parent, execute, acceptsError, rerunnable, controller, state: 'pending', value: undefined,
        error: undefined, started: clock(), deadline: Infinity, scope: {}, cleanups: new Set(), children: new Set(), owned: new Set(), tracing: defaults.trace};
      r.promise = new Promise((resolve, reject) => { r.resolve = resolve; r.reject = reject; });
      // Flow rejections may be observed later through state/error, retry, catch or toPromise.
      r.promise.catch(() => {});
      records.set(handle, r); pending.add(r); parent?.children.add(r);
      const owner = creationContext?.getStore() ?? creating;
      if (owner) {
        owner.owned.add(r);
        const release = () => owner.owned.delete(r); r.promise.then(release, release);
        if (owner.controller.signal.aborted || own(owner.handle).state !== 'pending') stop(r, failure(r, 'CANCELLED'));
      }
      async function start() {
        if (r.state !== 'pending') return;
        r.started = clock(); r.deadline = parent?.deadline ?? Infinity; r.scope = {...parent?.scope};
        const input = parent ? {ok: parent.state === 'fulfilled', value: parent.state === 'fulfilled' ? parent.value : parent.error} : {ok: true, value: undefined};
        r.input = input;
        if (!input.ok && !acceptsError) { settle(r, false, input.value); return; }
        // Recovery handlers must still observe a timeout or cancellation from their parent.
        if (acceptsError && !input.ok) r.deadline = Infinity;
        trace(r, 'start');
        try {
          checkpoint(r);
          const value = await bounded(r, r.deadline - clock(), () => failure(r, 'TIMEOUT', 'chain'), local => execute(local, input));
          settle(r, true, value);
        } catch (error) {
          settle(r, false, error);
          for (const child of r.owned) stop(child, failure(child, 'CANCELLED'));
          r.owned.clear();
        }
      }
      if (parent) parent.promise.then(start, start); else queueMicrotask(start);
      return handle;
    }
    function Flow(value) {
      if (records.has(value)) return value;
      return make(thenable(value) ? 'promise' : 'of', null, r => waitPromise(r, value), false, false);
    }
    const own = handle => { const r = records.get(handle); if (!r) throw new TypeError('Invalid Flow receiver'); return r; };
    Object.defineProperties(Flow.prototype, Object.fromEntries(['state', 'step', 'value', 'error'].map(key => [key, {get() { return own(this)[key]; }}])));
    function method(name, callback) { Object.defineProperty(Flow.prototype, name, {value: callback}); }
    method('then', function(onOk, onError) {
      if (onOk != null) fn(onOk); if (onError != null) fn(onError);
      return make('then', own(this), async (r, input) => {
        const callback = input.ok ? onOk : onError;
        if (callback) return invoke(r, callback, [input.value]);
        if (!input.ok) throw input.value;
        return input.value;
      }, true);
    });
    method('catch', function(callback) { fn(callback); return this.then(undefined, callback); });
    method('else', Flow.prototype.catch);
    method('finally', function(callback) {
      fn(callback); return make('finally', own(this), async (r, input) => {
        await invoke(r, callback, []); if (!input.ok) throw input.value; return input.value;
      }, true);
    });
    for (const name of ['map', 'run', 'filter', 'peek']) method(name, function(callback) {
      fn(callback); return make(name, own(this), async (r, input) => {
        const result = await invoke(r, callback, [input.value]);
        if (name === 'filter' && !result) throw failure(r, 'INVALID_TARGET', 'filtered out');
        return name === 'filter' || name === 'peek' ? input.value : result;
      });
    });
    method('toPromise', function() { return own(this).promise; });
    method('cancel', function() { const r = own(this); return stop(r, failure(r, 'CANCELLED')); });
    method('toString', function() { const r = own(this); return 'Flow(' + r.step + ', ' + r.state + ')'; });
    method('timeout', function(ms) {
      number(ms, 'timeout'); return make('timeout', own(this), (r, input) => {
        own(r.handle).deadline = Math.min(r.deadline, clock() + ms); return input.value;
      }, false, false);
    });
    const scopeKeys = ['root', 'compass', 'resultType'];
    const isNode = value => value && typeof value === 'object' && Number.isInteger(value.windowId) &&
      Number.isInteger(value.indexInParent) && value.bounds && typeof value.packageName === 'string';
    function scopeOptions(value) {
      const scope = {};
      if (value.root != null) { if (!isNode(value.root)) throw new TypeError('Flow scope root must be a node snapshot'); scope.root = capture(value.root); }
      if (value.compass != null) { if (typeof value.compass !== 'string') throw new TypeError('Flow compass must be a string'); scope.compass = value.compass; }
      if (value.resultType != null) {
        if (typeof value.resultType !== 'string' && !Array.isArray(value.resultType)) throw new TypeError('Flow resultType must be a string or an array');
        scope.resultType = capture(value.resultType);
      }
      return scope;
    }
    method('scope', function(value) {
      const update = scopeOptions(object(value, scopeKeys));
      return make('scope', own(this), (r, input) => { own(r.handle).scope = {...r.scope, ...update}; return input.value; }, false, false);
    });
    method('retry', function(times = 1, delay = 0) {
      integer(times, 'times'); number(delay, 'delay'); const target = own(this);
      return make('retry', target, async (r, input) => {
        if (input.ok) return input.value;
        let error = input.value;
        own(r.handle).deadline = target.deadline;
        if (error?.code !== 'CANCELLED' && target.rerunnable) for (let i = 0; i < times; i++) {
          try { return await bounded(r, Math.max(0, target.deadline - clock()), () => failure(r, 'TIMEOUT', 'chain'), async local => {
            local.deadline = target.deadline; await pause(local, delay); return target.execute(local, target.input);
          }); }
          catch (next) { error = next; if (error?.code === 'CANCELLED') break; }
        }
        throw error;
      }, true, false);
    });
    function sleep(parent, min, max = min) {
      number(min, 'min'); number(max, 'max'); if (max < min) throw new RangeError('max must be at least min');
      return make('sleep', parent, async (r, input) => { await pause(r, min + Math.random() * (max - min)); return input.value; });
    }
    method('sleep', function(min, max) { return sleep(own(this), min, max); });
    method('delay', Flow.prototype.sleep);
    function options(args, extra = []) {
      const remaining = [...args];
      let value = {};
      if (remaining[0] != null && typeof remaining[0] === 'object') {
        value = object(remaining.shift(), ['timeout', 'interval', 'times', 'stableFor', 'compare', 'snapshot', 'missing', 'recoverService', ...scopeKeys, ...extra]);
      } else {
        for (const key of ['timeout', 'interval']) if (remaining.length && typeof remaining[0] !== 'function') {
          const item = remaining.shift(); if (item != null) value[key] = item;
        }
      }
      const callbacks = remaining;
      if (callbacks.length > 2) throw new TypeError('At most two wait callbacks are accepted');
      for (const callback of callbacks) if (callback != null) fn(callback);
      const p = {...defaults, times: Infinity, compare: 'fingerprint', missing: 'reset', ...value};
      number(p.timeout, 'timeout', true); number(p.interval, 'interval'); number(p.stableFor, 'stableFor'); integer(p.times, 'times', true);
      if (p.times < 1) throw new RangeError('times must be positive');
      if (p.snapshot != null) { fn(p.snapshot); if (value.compare != null) throw new TypeError('snapshot and compare are mutually exclusive'); }
      if (!['fingerprint', 'bounds', 'content'].includes(p.compare) && typeof p.compare !== 'function') throw new TypeError('Invalid stability comparator');
      if (!['reset', 'fail'].includes(p.missing)) throw new TypeError('Invalid missing policy');
      if (typeof p.recoverService !== 'boolean') throw new TypeError('recoverService must be a boolean');
      return {p: {...p, ...scopeOptions(value)}, callbacks};
    }
    function condition(value, name, scope = {}) {
      if (name === 'waitForActivity' || name === 'waitForPackage') {
        if (typeof value !== 'string' || !value) throw new TypeError('Expected a non-empty component name');
        return {description: value, async probe(r) {
          const component = await query(r, 'flowForeground', []);
          return {found: component[name === 'waitForActivity' ? 'activityName' : 'packageName'] === value, value: true};
        }};
      }
      if (typeof value === 'function') return {description: 'function', async probe(r) {
        const result = await invoke(r, value, []);
        return {found: result != null && result !== false && !(typeof result === 'number' && Number.isNaN(result)), value: result};
      }};
      if (thenable(value)) {
        // A settled Promise is found even if it fulfilled with false or undefined.
        const result = records.get(value)?.promise ?? Promise.resolve(value); result.catch(() => {});
        return {description: 'promise', async probe(r) { return {found: true, value: await waitPromise(r, result)}; }};
      }
      let selector;
      if (typeof value === 'string') selector = {content: value};
      else if (value instanceof RegExp) selector = {contentMatches: {pattern: value.source, flags: value.flags}};
      else if (value && typeof value === 'object' && !Array.isArray(value)) selector = JSON.parse(JSON.stringify(value,(_,v)=>v instanceof RegExp?{pattern:v.source,flags:v.flags}:v));
      else throw new TypeError('Expected a predicate, Promise, selector descriptor, string or RegExp');
      return {description: JSON.stringify(selector), async probe(r) {
        const effective = isNode(selector) ? {} : {...r.scope, ...scope};
        const args = Object.keys(effective).length || isNode(selector) ? [selector, effective] : [selector];
        const result = await query(r, 'flowProbe', args); return {found: result !== null, value: result};
      }};
    }
    async function query(r, method, args) {
      const result = await waitPromise(r, call('accessibility', method, args, {permissions: ['accessibility'], timeoutMs: 10000, signal: r.controller.signal}));
      if (typeof result?.available !== 'boolean') throw new TypeError('Unsupported host: Flow queries require the matching AutoJs6 host');
      if (!result.available) throw failure(r, 'A11Y_UNAVAILABLE');
      if (result.error) throw Object.assign(FlowError(result.error.code, r.step), result.error);
      return result.value;
    }
    function snapshot(value, seen = new Set()) {
      if (value === null || typeof value !== 'object') return value;
      if (seen.has(value)) throw new TypeError('Flow stability snapshots must be acyclic');
      seen.add(value); const result = Array.isArray(value) ? value.map(item => snapshot(item, seen)) :
        Object.fromEntries(Object.keys(value).sort().map(key => [key, snapshot(value[key], seen)]));
      seen.delete(value); return result;
    }
    const equal = (a, b) => Object.is(a, b) || a != null && b != null && typeof a === 'object' && typeof b === 'object' &&
      Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
    async function polling(r, cond, p, kind) {
      const start = clock(), stable = ['waitForStable', 'waitForVisible', 'waitForHidden'].includes(kind);
      const deadline = Math.min(r.deadline, p.timeout === Infinity ? Infinity : start + p.timeout);
      let attempts = 0, since = null, previous, seen = false, outage = null, lastFound = false;
      r.selector = cond.description;
      const timedOut = () => outage ?? failure(r, 'TIMEOUT', deadline === r.deadline ? 'chain' : stable ? lastFound ? 'unstable' : 'missing' : null, attempts);
      return bounded(r, Math.max(0, deadline - clock()), timedOut, async local => {
        r = local;
        while (true) {
          checkpoint(r); attempts++;
          let sample;
          try { sample = await cond.probe(r); outage = null; }
          catch (error) { if (!p.recoverService || error?.code !== 'A11Y_UNAVAILABLE') throw error; outage = error; since = null; }
          checkpoint(r);
          if (sample) {
            const visible = sample.found && sample.value?.visibleToUser !== false;
            const found = kind === 'waitForHidden' ? !visible : kind === 'waitForVisible' ? visible : kind === 'waitWhile' ? !sample.found : sample.found;
            lastFound = found;
            if (!stable && found) return kind === 'waitWhile' ? true : sample.value;
            if (stable && found) {
              const value = kind === 'waitForHidden' ? true : sample.value;
              const projected = p.snapshot ? await invoke(r, p.snapshot, [value]) : p.compare === 'bounds' ? value?.bounds : p.compare === 'content' ? [value?.text, value?.desc] : value;
              const key = snapshot(projected);
              const same = since !== null && (typeof p.compare === 'function' ? await invoke(r, p.compare, [previous, key]) : equal(previous, key));
              if (!same) since = clock();
              seen = true; previous = key;
              if (clock() - since >= p.stableFor) return value;
            } else if (stable) {
              if (seen && p.missing === 'fail') throw failure(r, 'INVALID_TARGET', kind === 'waitForHidden' ? 'reappeared' : 'missing', attempts);
              since = null;
            }
          }
          if (attempts >= p.times || clock() >= deadline || p.timeout === 0) throw timedOut();
          await pause(r, Math.min(p.interval, Math.max(0, deadline - clock())));
        }
      });
    }
    function wait(parent, name, value, args) {
      const {p, callbacks} = options(args), cond = condition(value, name, scopeOptions(p));
      let handle = make(name, parent, async r => {
        const found = await polling(r, cond, p, name);
        if (name === 'within') {
          if (!isNode(found)) throw failure(r, 'INVALID_TARGET', 'within requires a node snapshot');
          own(r.handle).scope = {...r.scope, root: capture(found)};
        }
        return found;
      });
      if (callbacks.length) handle = handle.then(...callbacks);
      return handle;
    }
    const flow = (value, ...args) => wait(null, 'wait', value, args);
    const waits = ['wait', 'waitUntil', 'waitWhile', 'waitForStable', 'waitForVisible', 'waitForHidden', 'waitForActivity', 'waitForPackage'];
    for (const name of waits) {
      flow[name] = (value, ...args) => wait(null, name, value, args);
      method(name, function(value, ...args) { return wait(own(this), name, value, args); });
    }
    flow.waitAsync = flow.wait; flow.waitForGone = flow.waitForHidden;
    method('waitForGone', Flow.prototype.waitForHidden);
    method('within', function(value, ...args) { return wait(own(this), 'within', value, args); });
    function whenPresent(parent, value, callback, opts = {}) {
      fn(callback); const {p} = options([object(opts, ['timeout', 'interval', 'times', 'recoverService', ...scopeKeys])]); condition(value, 'wait');
      return make('whenPresent', parent, async (r, input) => {
        let found;
        // Optional absence is a recoverable result, so its local deadline must not settle the chain.
        const child = wait(null, 'wait', value, [{timeout: p.timeout, interval: p.interval, times: p.times, recoverService: p.recoverService, ...r.scope, ...scopeOptions(p)}]); const childRecord = own(child); r.owned.add(childRecord);
        try { found = await waitPromise(r, child); }
        catch (error) { if (error?.code === 'TIMEOUT' && error.reason !== 'chain') return input.value; throw error; }
        finally { r.owned.delete(childRecord); if (childRecord.state === 'pending') child.cancel(); }
        await invoke(r, callback, [found]); return input.value;
      });
    }
    flow.whenPresent = (value, callback, opts) => whenPresent(null, value, callback, opts);
    method('whenPresent', function(value, callback, opts) { return whenPresent(own(this), value, callback, opts); });
    function repeatUntil(parent, action, value, opts = {}) {
      fn(action); object(opts, ['timeout', 'interval', 'maxAttempts', 'retryOn', ...scopeKeys]);
      const timeout = number(opts.timeout ?? defaults.timeout, 'timeout'), interval = number(opts.interval ?? defaults.interval, 'interval');
      const max = integer(opts.maxAttempts ?? 0, 'maxAttempts'); if (opts.retryOn != null) fn(opts.retryOn);
      const cond = condition(value, 'wait', scopeOptions(opts));
      return make('repeatUntil', parent, async outer => {
        const start = clock(); let attempts = 0;
        return bounded(outer, timeout, () => failure(outer, 'TIMEOUT', 'timeout', attempts), async r => {
        while (true) {
          const sample = await cond.probe(r);
          if (sample.found) return sample.value;
          if (timeout === 0 || max > 0 && attempts >= max) throw failure(r, 'TIMEOUT', timeout === 0 ? 'timeout' : 'attempts', attempts);
          checkpoint(r); attempts++;
          try { await invoke(r, action, [attempts]); }
          catch (error) {
            if (error?.code === 'CANCELLED' || !opts.retryOn) throw error;
            const retry = await invoke(r, opts.retryOn, [error, attempts]);
            if (typeof retry !== 'boolean') throw new TypeError('retryOn must return a boolean');
            if (!retry) throw error;
          }
          const after = await cond.probe(r); if (after.found) return after.value;
          if (max > 0 && attempts >= max) throw failure(r, 'TIMEOUT', 'attempts', attempts);
          await pause(r, interval);
        }
        });
      });
    }
    flow.repeatUntil = (action, value, opts) => repeatUntil(null, action, value, opts);
    method('repeatUntil', function(action, value, opts) { return repeatUntil(own(this), action, value, opts); });
    Object.assign(flow, {Flow, FlowError, of: value => Flow(value), run: callback => { fn(callback); return make('run', null, r => invoke(r, callback, [])); },
      sleep: (min, max) => sleep(null, min, max),
      cancelAll() { const list = [...pending]; for (const r of list) stop(r, failure(r, 'CANCELLED')); return list.length; },
      defaults(value) {
        if (value != null) {
          object(value, Object.keys(defaults)); const next = {...defaults, ...value};
          number(next.timeout, 'timeout', true); number(next.interval, 'interval'); number(next.stableFor, 'stableFor');
          if (typeof next.trace !== 'boolean' || typeof next.recoverService !== 'boolean') throw new TypeError('trace and recoverService must be boolean');
          if(typeof next.strictActions!=='boolean')throw new TypeError('strictActions must be boolean');
          next.humanize=validateHumanize(next.humanize);
          defaults = next;
        }
        return capture(defaults);
      },
      trace(value) { if (value !== undefined) { if (typeof value !== 'boolean') throw new TypeError('trace must be boolean'); defaults = {...defaults, trace: value}; } return defaults.trace; }
    });
    flow.delay = flow.sleep;
    for (const kind of ['all', 'race', 'any']) flow[kind] = (...values) => {
      const sources = values.length === 1 && Array.isArray(values[0]) ? [...values[0]] : values;
      const policy = {timeout: defaults.timeout, interval: defaults.interval, recoverService: defaults.recoverService};
      return make(kind, null, async r => {
        if (!sources.length && kind !== 'all') throw failure(r, 'INVALID_TARGET', 'no sources');
        const created = [];
        const promises = sources.map(value => {
          if (thenable(value)) return records.get(value)?.promise ?? Promise.resolve(value);
          const child = flow.wait(value, policy), childRecord = own(child); created.push(childRecord); r.owned.add(childRecord); return childRecord.promise;
        });
        try {
          if (kind !== 'any') return await waitPromise(r, Promise[kind](promises));
          return await waitPromise(r, new Promise((resolve, reject) => {
            let left = promises.length; promises.forEach(promise => promise.then(resolve, error => { if (--left === 0) reject(error); }));
          }));
        } finally { for (const child of created) { stop(child, failure(child, 'CANCELLED')); r.owned.delete(child); } }
      });
    };
    // Native tools share one owned client. The poll pump never waits for a JS callback.
    let clientPromise, disposed = false, pumping = false, serial = 0;
    const nativeTasks = new Map();
    const idPrefix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    const uid = () => idPrefix + '-' + (++serial);
    const extraPermissions = (name, args, opts) => {
      const caps = new Set(['accessibility']);
      if (['smartClick', 'clickIfExists', 'clickAny'].includes(name) && opts.gestureFallback !== false ||
          ['smartClickBounds', 'clickBoundsIfExists', 'clickBoundsAny'].includes(name) ||
          ['toggle', 'dismissPopups'].includes(name) && opts.click?.gestureFallback !== false ||
          ['scrollUntil', 'collectList'].includes(name) && opts.method?.toLowerCase() === 'gesture') caps.add('accessibility.gesture');
      if (name === 'launchAndWait') { caps.add('app.query'); caps.add('app.launch'); }
      if (name === 'backToApp') caps.add('app.query');
      if (eventNames.includes(name)) caps.add('events');
      if (name === 'waitForToast') caps.add('events.toast');
      if (name === 'waitForNotification') caps.add('events.notification');
      if (name === 'nodeAction') {
        if (args[1] === 'clickBounds') caps.add('accessibility.gesture');
        if (['copy', 'cut', 'paste'].includes(args[1]) || args[1] === 'performAction' && [16384, 32768, 65536].includes(args[2][0])) caps.add('clipboard');
      }
      if (name === 'globalAction') {
        if (gestureNames.includes(args[0])) caps.add('accessibility.gesture');
        else if (!['back', 'home', 'recents'].includes(args[0])) caps.add('keys');
      }
      return [...caps];
    };
    const rpc = (method, args, permissions = ['accessibility']) => call('flow', method, args, {permissions, timeoutMs: 10000});
    function client() {
      if (disposed) return Promise.reject(new Error('Flow facade is disposed'));
      if (!clientPromise) clientPromise = rpc('open', []).then(async value => {
        if (typeof value?.id !== 'string') throw new TypeError('Unsupported host: Flow tools require the matching AutoJs6 host');
        if (disposed) { await rpc('close', [value.id]); throw new Error('Flow facade is disposed'); }
        return value.id;
      }).catch(error => { clientPromise = undefined; throw error; });
      return clientPromise;
    }
    function encode(value, task, seen = new Set()) {
      if (typeof value === 'function') { const id = uid(); task.callbacks.set(id, value); return {__flowCallback: id}; }
      if (typeof value === 'number' && !Number.isFinite(value)) return {__flowNumber: String(value)};
      if (value == null) return null;
      if (value instanceof RegExp) {
        if (/[^ims]/.test(value.flags)) throw new TypeError('Flow patterns support only i/m/s flags');
        return {pattern: value.source, flags: value.flags};
      }
      if (thenable(value)) throw new TypeError('Tool arguments accept callbacks that return Promises, not Promise objects');
      if (typeof value !== 'object') {
        if (!['string', 'number', 'boolean'].includes(typeof value)) throw new TypeError('Unsupported Flow value');
        return value;
      }
      if (seen.has(value)) throw new TypeError('Flow arguments must be acyclic');
      seen.add(value);
      let result;
      if (Number.isInteger(value.windowId) && Number.isInteger(value.indexInParent) && value.bounds && typeof value.packageName === 'string') result = {__flowNode: {...value}};
      else result = Array.isArray(value) ? value.map(v => encode(v, task, seen)) : Object.fromEntries(Object.keys(value).map(k => [k, encode(value[k], task, seen)]));
      seen.delete(value); return result;
    }
    function decode(value, task) {
      if (value == null || typeof value !== 'object') return value;
      if (value.__flowNumber) return Number(value.__flowNumber);
      if (value.__flowCallback) return task.callbacks.get(value.__flowCallback);
      if (value.__flowNode) return value.__flowNode;
      return Array.isArray(value) ? value.map(v => decode(v, task)) : Object.fromEntries(Object.entries(value).map(([k,v]) => [k, decode(v, task)]));
    }
    function finishNative(task, ok, value) {
      if (!nativeTasks.delete(task.id)) return;
      task.r.controller.signal.removeEventListener('abort', task.abort);
      task.r.cleanups.delete(task.abort);
      if (!ok) task.ready?.reject(value);
      (ok ? task.resolve : task.reject)(value);
      task.parts.length = 0;
    }
    async function pump() {
      if (pumping) return;
      pumping = true;
      try {
        while (nativeTasks.size && !disposed) {
          const id = await client();
          const packets = await rpc('poll', [id, [...nativeTasks.keys()].slice(0, 64)]);
          if (!Array.isArray(packets)) throw new TypeError('Invalid Flow poll response');
          for (const packet of packets) {
            const task = nativeTasks.get(packet.id); if (!task) continue;
            task.parts.push(Buffer.from(packet.data, 'base64'));
            if (!packet.last) continue;
            const message = JSON.parse(Buffer.concat(task.parts).toString('utf8')); task.parts.length = 0;
            if (message.type === 'ready') { task.ready?.resolve(); continue; }
            if (message.type === 'callback') {
              const {token, callback, args} = message.value;
              Promise.resolve().then(async () => {
                try {
                  const result = await invoke(task.r, fn(task.callbacks.get(callback)), decode(args, task));
                  if (nativeTasks.has(task.id)) await rpc('answer', [id, task.id, token, true, encode(result, task)]);
                } catch (error) {
                  task.errors.set(token, error);
                  if (nativeTasks.has(task.id)) await rpc('answer', [id, task.id, token, false, null]);
                }
              }).catch(error => { if (nativeTasks.has(task.id)) { finishNative(task, false, error); rpc('cancel',[id,task.id]).catch(()=>{}); } });
              continue;
            }
            if (message.type === 'resolve') finishNative(task, true, decode(message.value, task));
            else if (message.type === 'reject') {
              const v = message.value;
              const error = task.errors.has(v.callbackError) ? task.errors.get(v.callbackError) : Object.assign(v.name === 'FlowError' ? FlowError(v.code, v.step) : new Error(v.message), v);
              finishNative(task, false, error);
            } else throw new TypeError('Invalid Flow packet');
          }
          if (nativeTasks.size) await new Promise(resolve => setTimeout(resolve, packets.length ? 0 : 10));
        }
      } catch (error) {
        for (const task of [...nativeTasks.values()]) { finishNative(task, false, error); clientPromise?.then(id=>rpc('cancel',[id,task.id])).catch(()=>{}); }
      } finally { pumping = false; if (nativeTasks.size && !disposed) void pump(); }
    }
    async function native(r, name, args, opts, budget, ready) {
      checkpoint(r);
      if (disposed) throw new Error('Flow facade is disposed');
      if (nativeTasks.size >= 64) throw new RangeError('At most 64 Flow tools may be pending');
      const task = {id: uid(), r, parts: [], callbacks: new Map(), errors: new Map(), ready};
      const encodedArgs = encode(args, task), encodedOptions = encode(opts, task);
      const permissions = extraPermissions(name, args, opts);
      const result = new Promise((resolve,reject) => { task.resolve=resolve;task.reject=reject; });
      result.catch(()=>{});
      task.abort = () => {
        if (!nativeTasks.has(task.id)) return;
        finishNative(task, false, r.controller.signal.reason ?? failure(r, 'CANCELLED'));
        if(task.sent)clientPromise?.then(id=>rpc('cancel',[id,task.id])).catch(()=>{});
      };
      nativeTasks.set(task.id, task); r.cleanups.add(task.abort);
      r.controller.signal.addEventListener('abort', task.abort, {once:true});
      if (r.controller.signal.aborted) task.abort();
      void (async () => {
        try {
          const id = await client();
          if (!nativeTasks.has(task.id)) return;
          // Cancellation knows this ID even if the start reply is late.
          task.sent = true;
          const started = rpc('start', [id, task.id, name, encodedArgs, encodedOptions, encode(Math.min(budget, Math.max(0,r.deadline-clock())),task)], permissions);
          void pump();
          await started;
        } catch (error) { finishNative(task,false,error); if(task.sent)clientPromise?.then(id=>rpc('cancel',[id,task.id])).catch(()=>{}); }
      })();
      return waitPromise(r,result);
    }
    const capture = (value, seen = new Set()) => {
      if (value == null || typeof value !== 'object' || value instanceof RegExp) return value;
      if (seen.has(value)) throw new TypeError('Flow options must be acyclic'); seen.add(value);
      const result = Array.isArray(value) ? value.map(v=>capture(v,seen)) : Object.fromEntries(Object.entries(value).map(([k,v])=>[k,capture(v,seen)]));
      seen.delete(value);return result;
    };
    function callbacks(args) {
      if (args.length>2) throw new TypeError('At most two callbacks are accepted');
      args.forEach(v=>{if(v!=null)fn(v);}); return args;
    }
    const eventNames = ['waitForIdle','waitForEvent','waitForToast','waitForNotification'];
    const toolCounts = {smartClick:1,smartClickBounds:1,clickIfExists:1,clickBoundsIfExists:1,clickAny:1,clickBoundsAny:1,findAny:1,
      scrollUntil:1,typeInto:2,dismissPopups:1,collectList:2,launchAndWait:1,backUntil:1,backToApp:1,toggle:2};
    const inputTools = new Set(['smartClick','smartClickBounds','typeInto','collectList','toggle']);
    function tool(parent,name,values) {
      const all=[...values], count=toolCounts[name]-(parent&&inputTools.has(name)?1:0);
      if(all.length<count)throw new TypeError('Missing '+name+' arguments');
      const args=capture(all.splice(0,count)); let opts={};
      if(all.length && typeof all[0]!=='function') {
        const value=all.shift();
        if(typeof value==='number') {
          if(['clickIfExists','clickBoundsIfExists','clickAny','clickBoundsAny','findAny','dismissPopups','launchAndWait'].includes(name))opts={timeout:value};
          else if(['backUntil','backToApp'].includes(name))opts={maxTimes:value};
          else throw new TypeError(name+' requires an options object');
        } else if(value!=null) {if(typeof value!=='object'||Array.isArray(value))throw new TypeError('Expected tool options');opts=capture(value);}
      }
      const cb=callbacks(all), fallback=defaults.timeout, humanize=capture(defaults.humanize);
      if(!['launchAndWait','backUntil','backToApp'].includes(name))opts={timeout:fallback,interval:defaults.interval,humanize,...opts};
      if(opts.humanize===true)opts.humanize=humanize;
      if(opts.click?.humanize===true)opts.click.humanize=humanize;
      const budget=number(opts.timeout??fallback,'timeout',true)||fallback||10000;
      let handle=make(name,parent,async(r,input)=>{
        const actual=parent&&inputTools.has(name)?[input.value,...args]:args;
        let plan=name==='scrollUntil'&&parent&&opts.container==null?{...opts,container:input.value}:opts;
        if (name !== 'launchAndWait' && plan.root == null && r.scope.root != null) plan = {...plan, root:r.scope.root};
        const value=await bounded(r,budget,()=>failure(r,'TIMEOUT','operation'),local=>native(local,name,actual,plan,budget));
        return name==='dismissPopups'&&parent?input.value:value;
      });
      if(cb.length)handle=handle.then(...cb);return handle;
    }
    for(const name of Object.keys(toolCounts)) {
      flow[name]=(...args)=>tool(null,name,args);
      method(name,function(...args){return tool(own(this),name,args);});
    }
    const nodeActions={click:[0,0],longClick:[0,0],clickBounds:[0,2],setText:[1,1],appendText:[1,1],clear:[0,0],paste:[0,0],copy:[0,0],cut:[0,0],select:[0,0],focus:[0,0],clearFocus:[0,0],scrollForward:[0,0],scrollBackward:[0,0],scrollUp:[0,0],scrollDown:[0,0],scrollLeft:[0,0],scrollRight:[0,0],expand:[0,0],collapse:[0,0],dismiss:[0,0],show:[0,0],contextClick:[0,0],imeEnter:[0,0],performAction:[1,2]};
    const gestureNames = ['press','swipe','gesture','gestures'];
    const gestureArity = {press:[1,3], swipe:[2,5], gesture:[2,Infinity], gestures:[1,Infinity]};
    function action(parent,name,all,strict=defaults.strictActions,humanize=capture(defaults.humanize),global=false) {
      const rest=[...all], cb=[];
      while(rest.length&&typeof rest[rest.length-1]==='function')cb.unshift(rest.pop()); callbacks(cb);
      const args=capture(rest), range=global?(gestureArity[name]??[0,0]):nodeActions[name];
      if(args.length<range[0]||args.length>range[1])throw new TypeError('Wrong number of arguments for '+name);
      const budget=defaults.timeout||10000;
      let handle=make(name,parent,async(r,input)=>{
        const result=await bounded(r,budget,()=>failure(r,'TIMEOUT','operation'),local=>native(local,global?'globalAction':'nodeAction',global?[name,args]:[input.value,name,args],{strict,humanize},budget));
        return global?input.value:result;
      });
      if(cb.length)handle=handle.then(...cb);return handle;
    }
    for(const name of Object.keys(nodeActions))method(name,function(...args){return action(own(this),name,args);});
    for(const name of ['back','home','recents','notifications','quickSettings','powerDialog','splitScreen','lockScreen','takeScreenshot','dismissNotificationShade',...gestureNames])
      method(name,function(...args){return action(own(this),name,args,defaults.strictActions,capture(defaults.humanize),true);});
    for(const name of ['click','clickBounds','longClick'])method(name+'After',function(min,max){return action(own(sleep(own(this),min,max)),name,[]);});
    const clickWaits={waitThenClick:['wait','click'],waitThenClickBounds:['wait','clickBounds'],waitThenLongClick:['wait','longClick'],
      waitForStableThenClick:['waitForStable','click'],waitForStableThenClickBounds:['waitForStable','clickBounds'],
      clickWhenStableAfter:['waitForStable','click',true],clickBoundsWhenStableAfter:['waitForStable','clickBounds',true]};
    function clickWait(parent,name,value,all) {
      const [kind,act,after]=clickWaits[name];let params=[...all], delay;
      if(after&&typeof params[0]!=='object') {
        let n=0;while(n<params.length&&typeof params[n]!=='function')n++;
        if(n<3||n>4)throw new TypeError(name+' requires timeout, interval, delayMin and optional delayMax');
        delay=params.splice(2,n-2);
      }
      const {p,callbacks:cb}=options(params,['strict','delay']);
      const strict=p.strict??defaults.strictActions;if(typeof strict!=='boolean')throw new TypeError('strict must be boolean');
      let pair;
      if(after) {
        delay=delay??p.delay;if(delay===undefined)throw new TypeError('delay is required');pair=Array.isArray(delay)?delay:[delay];
        if(pair.length<1||pair.length>2)throw new TypeError('Invalid delay');
        number(pair[0],'delayMin');number(pair[1]??pair[0],'delayMax');
        if((pair[1]??pair[0])<pair[0])throw new RangeError('delayMax must be at least delayMin');
      }
      const cond=condition(value,kind,scopeOptions(p));let handle=make(name,parent,r=>polling(r,cond,p,kind));
      if(after)handle=sleep(own(handle),...pair);
      handle=action(own(handle),act,[],strict,capture(defaults.humanize));if(cb.length)handle=handle.then(...cb);return handle;
    }
    for(const name of Object.keys(clickWaits)){flow[name]=(value,...args)=>clickWait(null,name,value,args);method(name,function(value,...args){return clickWait(own(this),name,value,args);});}
    for(const [alias,name] of Object.entries({clickWait:'waitThenClick',clickBoundsWait:'waitThenClickBounds',clickWhenStable:'waitForStableThenClick',clickBoundsWhenStable:'waitForStableThenClickBounds'})){
      flow[alias]=flow[name];method(alias,Flow.prototype[name]);
    }
    function eventWait(parent,name,all) {
      const args=[...all];let opts={};
      if(name==='waitForIdle'){
        if(args[0]!=null&&typeof args[0]==='object')opts={...object(args.shift(),['quietFor','timeout','eventTypes'])};
        else {if(args.length&&typeof args[0]!=='function')opts.quietFor=args.shift();if(args.length&&typeof args[0]!=='function')opts.timeout=args.shift();}
      }else{
        if(name==='waitForEvent')opts.eventTypes=args.shift()??'*';
        const maximum=name==='waitForEvent'?2:2;
        if(args.length>maximum)throw new TypeError('Too many event wait arguments');
        for(const item of args.splice(0)) {
          if(item==null)continue;
          if(typeof item==='number'){if(opts.timeout!==undefined)throw new TypeError('Duplicate timeout');opts.timeout=item;}
          else {if(opts.filter!==undefined)throw new TypeError('Duplicate filter');opts.filter=item;}
        }
      }
      opts=capture({...opts,timeout:opts.timeout??defaults.timeout});
      const budget=number(opts.timeout,'timeout',true), cb=callbacks(args);
      let resolve,reject;const ready=new Promise((a,b)=>{resolve=a;reject=b;});ready.catch(()=>{});
      const readiness={resolve,reject};
      let handle=make(name,parent,async(r,input)=>{
        const value=await bounded(r,budget,()=>failure(r,'TIMEOUT','operation'),local=>native(local,name,[],opts,budget,readiness));
        return parent&&name==='waitForIdle'?input.value:value;
      });
      own(handle).promise.catch(reject);if(cb.length)handle=handle.then(...cb);
      Object.defineProperty(handle,'ready',{value:ready});return handle;
    }
    for(const name of eventNames){flow[name]=(...args)=>eventWait(null,name,args);method(name,function(...args){return eventWait(own(this),name,args);});}
    flow.dispose=async()=>{
      if(disposed)return;disposed=true;flow.cancelAll();
      const existing=clientPromise;if(existing){const id=await existing.catch(()=>null);if(id)await rpc('close',[id]);}
    };
    function validateHumanize(value) {
      if(value===false||value==null)return false;
      object(value,['offset','delay']);
      for(const key of ['offset','delay'])if(value[key]!=null){
        const pair=Array.isArray(value[key])?value[key]:[value[key],value[key]];
        if(pair.length!==2)throw new TypeError('humanize.'+key+' requires two numbers');
        pair.forEach(v=>{integer(v,'humanize.'+key);if(v>2147483646)throw new RangeError('humanize value too large');});
        if(key==='delay'&&pair[1]<pair[0])throw new RangeError('humanize delay maximum must follow minimum');
      }
      return capture(value);
    }
    Object.defineProperties(flow, {pending: {get: () => pending.size}, workers: {get: () => nativeTasks.size}});
    return Object.freeze(flow);
  }
  // End shared flow core.
// END GENERATED FLOW FACADE

// BEGIN GENERATED AI FACADE
  // Shared AI facade. Provider calls and events belong to their originating JS runtime.
  function __autojs6_create_ai(call) {
    let opening = null, generation = 0, pumping = false;
    const records = new Map(), pending = new Set(), sessions = new Set();
    class AiError extends Error {
      constructor(message = '', code = 'INTERNAL_FAILURE') {
        super(String(message)); this.name = 'AiError'; this.code = code; this.route = 'plugin';
      }
    }
    const failure = value => value instanceof AiError ? value : new AiError(value?.message || String(value),
      String(value?.code || 'INTERNAL_FAILURE').replace(/^ERR_AUTOJS6_AI_/, ''));
    const closedError = () => new AiError('AI client or session is closed', 'SESSION_CLOSED');
    const raw = (method, args) => Promise.resolve().then(() => call('ai', method, args,
      {timeoutMs: 10000, permissions: ['ai']})).catch(error => { throw failure(error); });
    const deferred = () => {
      let resolve, reject;
      const promise = new Promise((a, b) => { resolve = a; reject = b; });
      promise.catch(() => {});
      return {promise, resolve, reject};
    };
    function json(value) {
      try {
        return JSON.parse(JSON.stringify(value, (_, item) => {
          if (typeof item === 'number' && !Number.isFinite(item) || ['function', 'symbol', 'bigint'].includes(typeof item))
            throw new TypeError('AI arguments must contain finite JSON values');
          return item;
        }));
      } catch (error) { throw new AiError(error.message, 'INVALID_REQUEST'); }
    }
    async function client() {
      if (!opening) {
        const epoch = generation;
        const promise = raw('open', []).then(async value => {
          if (epoch !== generation) { await raw('close', [value.id]); throw closedError(); }
          return value.id;
        });
        opening = promise;
        promise.catch(() => { if (opening === promise) opening = null; });
      }
      return opening;
    }
    function forget(record) {
      pending.delete(record); if (record.id) records.delete(record.id);
      record.cleanup?.(); record.fragments = [];
    }
    function emit(record, name, ...args) {
      if (!record.listeners) return;
      for (const entry of [...(record.listeners.get(name) || [])]) {
        if (entry.once) record.listeners.set(name, (record.listeners.get(name) || []).filter(item => item !== entry));
        entry.listener(...args);
      }
    }
    function settle(record, error, value, cancelled = false) {
      if (record.settled) return;
      record.settled = true; forget(record);
      let listenerFailed = false;
      if (record.stream) {
        record.state = cancelled ? 'cancelled' : error ? 'error' : 'done';
        error ? record.ready.reject(error) : record.ready.resolve(record.stream);
        try { emit(record, cancelled ? 'cancelled' : error ? 'error' : 'done', ...(cancelled ? [] : [error || value])); }
        catch (listenerError) { error = listenerError; listenerFailed = true; record.state = 'error'; }
      }
      if (record.owner && record.id && !cancelled) {
        if (listenerFailed && record.session) record.session.closed = true;
        raw(listenerFailed ? 'cancel' : 'ack', [record.owner, record.id]).catch(() => {});
      }
      error ? record.result.reject(error) : record.result.resolve(value);
    }
    function cancel(record, error = new AiError('AI operation cancelled', 'CANCELLED')) {
      if (record.settled) return;
      if (record.session && record.owner) record.session.closed = true;
      settle(record, error, undefined, true);
      if (record.owner && record.id) raw('cancel', [record.owner, record.id]).catch(() => {});
    }
    function makeStream(record) {
      record.listeners = new Map(); record.ready = deferred(); record.state = 'created';
      const stream = {};
      Object.defineProperties(stream, {
        state: {enumerable: true, get: () => record.state},
        isDone: {enumerable: true, get: () => record.settled},
        ready: {enumerable: true, value: record.ready.promise},
        result: {enumerable: true, value: record.result.promise}
      });
      for (const method of ['on', 'once']) stream[method] = (name, listener) => {
        if (typeof listener !== 'function') throw new TypeError('AI listener must be a function');
        record.listeners.set(name, [...(record.listeners.get(name) || []), {listener, once: method === 'once'}]);
        return stream;
      };
      stream.addListener = stream.on;
      stream.off = stream.removeListener = (name, listener) => {
        record.listeners.set(name, (record.listeners.get(name) || []).filter(item => item.listener !== listener)); return stream;
      };
      stream.removeAllListeners = name => { name === undefined ? record.listeners.clear() : record.listeners.delete(name); return stream; };
      stream.listenerCount = name => (record.listeners.get(name) || []).length;
      stream.cancel = () => { cancel(record); return stream; };
      record.stream = stream;
      return stream;
    }
    function makeSession(value, epoch) {
      const record = {closed: false}; sessions.add(record);
      const session = {};
      for (const name of ['provider', 'model', 'target', 'profile', 'backend'])
        Object.defineProperty(session, name, {enumerable: true, value: value[name] ?? null});
      Object.defineProperties(session, {
        isClosed: {enumerable: true, get: () => record.closed || epoch !== generation},
        state: {enumerable: true, get: () => session.isClosed ? 'closed' : 'ready'}
      });
      for (const name of ['ask', 'chat', 'stream']) session[name] = (prompt, options) => {
        const result = run('session.' + name, [value.id, prompt], options, name === 'stream', record,
          session.isClosed ? closedError() : null);
        return result;
      };
      session.close = async () => {
        if (session.isClosed) return;
        record.closed = true; sessions.delete(record);
        await run('session.close', [value.id]);
      };
      return Object.freeze(session);
    }
    function accept(record, event) {
      if (record.settled) return;
      if (event.type === 'sessionClosed') { if (record.session) record.session.closed = true; return; }
      if (event.type === 'reject') { settle(record, failure(event.value)); return; }
      if (event.type === 'resolve') {
        settle(record, null, record.method === 'session' ? makeSession(event.value, record.epoch) : event.value); return;
      }
      if (!record.stream) return;
      if (event.type === 'open') { record.state = 'open'; record.ready.resolve(record.stream); emit(record, 'open', event.value); }
      else if (event.type === 'chunk') {
        record.state = 'open'; emit(record, 'chunk', event.value);
        if (!record.settled) emit(record, 'delta', event.value.text, event.value);
      } else if (event.type === 'usage') emit(record, 'usage', event.value);
    }
    async function pump() {
      if (pumping) return;
      pumping = true;
      try {
        while (records.size) {
          const grouped = new Map();
          for (const record of records.values()) grouped.set(record.owner, [...(grouped.get(record.owner) || []), record.id]);
          for (const [owner, ids] of grouped) {
            let packets;
            try { packets = await raw('poll', [owner, ids]); }
            catch (error) { for (const id of ids) { const record = records.get(id); if (record) cancel(record, error); } continue; }
            for (const packet of packets) {
              const record = records.get(packet.id); if (!record || record.owner !== owner) continue;
              try {
                record.fragments.push(Buffer.from(packet.data, 'base64'));
                if (packet.last) {
                  const event = JSON.parse(Buffer.concat(record.fragments).toString('utf8')); record.fragments = [];
                  accept(record, event);
                }
              } catch (error) { cancel(record, failure(error)); }
            }
          }
          if (records.size) await new Promise(resolve => setTimeout(resolve, 40));
        }
      } finally { pumping = false; if (records.size) pump(); }
    }
    function run(method, args, options, streaming = false, session = null, initialError = null) {
      const record = {method, epoch: generation, result: deferred(), fragments: [], settled: false, session};
      const result = streaming ? makeStream(record) : record.result.promise;
      pending.add(record);
      try {
        if (initialError) throw initialError;
        const input = json(args);
        options ??= {};
        if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('AI call options must be an object');
        const {signal, timeoutMs} = options;
        if (signal != null && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function'))
          throw new TypeError('AI signal must be an AbortSignal');
        if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647))
          throw new TypeError('AI timeoutMs must be positive and at most 2147483647');
        const abort = () => cancel(record);
        const timer = timeoutMs == null ? null : setTimeout(() => cancel(record, new AiError('AI operation timed out', 'TIMEOUT')), timeoutMs);
        record.cleanup = () => { if (timer != null) clearTimeout(timer); signal?.removeEventListener('abort', abort); };
        signal?.addEventListener('abort', abort, {once: true});
        if (signal?.aborted) { cancel(record); return result; }
        Promise.resolve().then(async () => {
          if (record.settled) return;
          const owner = await client(); record.owner = owner;
          if (record.settled || record.epoch !== generation) { cancel(record, closedError()); return; }
          const value = await raw('start', [owner, method, input]); record.id = value.id;
          if (record.settled || record.epoch !== generation) {
            await raw('cancel', [owner, value.id]); cancel(record, closedError()); return;
          }
          records.set(value.id, record); pump();
        }).catch(error => settle(record, failure(error)));
      } catch (error) { settle(record, failure(error)); }
      return result;
    }
    function createAgent() {
      let opening = null, ownerId = null, epoch = 0, pumping = false, timer = null;
      const tasks = new Map(), runs = new Map(), byRun = new Map(), pending = new Set(), accessRequests = new Set();
      const events = new Set(['state', 'progress', 'step', 'input', 'confirmation', 'done', 'error']);
      class AgentError extends Error {
        constructor(message, code = 'INVALID_REQUEST', hint) {
          super(String(message)); this.name = 'AgentError'; this.code = code;
          if (hint != null) this.hint = String(hint);
        }
      }
      const fail = value => value instanceof AgentError ? value : new AgentError(value?.message || String(value),
        String(value?.code || 'INTERNAL_FAILURE').replace(/^ERR_AUTOJS6_AGENT_/, ''), value?.hint);
      const stopped = () => new AgentError('Agent client is closed', 'SESSION_CLOSED');
      const raw = (method, args) => Promise.resolve().then(() => call('aiAgent', method, args,
        {timeoutMs: method === 'requestAccess' ? 120000 : 10000, permissions: ['ai.agent']})).catch(error => {
          const failure = fail(error);
          if (ownerId !== null && args[0] === ownerId && ['PERMISSION_DENIED','SESSION_CLOSED','HOST_UNAVAILABLE','LINK_DETACHED'].includes(failure.code)) {
            opening = null; ownerId = null;
          }
          throw failure;
        });
      const clone = value => {
        try { return JSON.parse(JSON.stringify(value, (_, item) => {
          if (item === undefined || ['function', 'symbol', 'bigint'].includes(typeof item) || typeof item === 'number' && !Number.isFinite(item))
            throw new TypeError('Agent values must be finite JSON');
          return item;
        })); } catch (error) { throw new AgentError(error.message); }
      };
      const object = value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AgentError('Agent options must be an object');
        return clone(value);
      };
      function options(value = {}) {
        const result = object(value);
        const allowed = ['preset', 'target', 'tools', 'budget', 'confirm', 'interaction', 'detached', 'context', 'parameters', 'memory', 'scriptRoots', 'locale', 'plan'];
        if (Object.keys(result).some(key => !allowed.includes(key))) throw new AgentError('Unknown Agent option');
        return result;
      }
      async function client() {
        if (!opening) {
          const generation = epoch;
          const promise = raw('open', []).then(async value => {
            if (generation !== epoch) { await raw('close', [value.id]); throw stopped(); }
            ownerId = value.id;
            return value.id;
          });
          opening = promise;
          promise.catch(() => { if (opening === promise) opening = null; });
        }
        return opening;
      }
      function referenced() { return tasks.size || [...runs.values()].some(run => !run.detached || run.observed || run.waiters); }
      function updateTimer() { if (timer) referenced() ? timer.ref?.() : timer.unref?.(); }
      function emit(run, name, value) {
        for (const entry of [...(run.listeners.get(name) || [])]) {
          if (entry.once) run.listeners.set(name, (run.listeners.get(name) || []).filter(item => item !== entry));
          entry.listener(clone(value));
        }
      }
      function finishRun(run, error, result) {
        if (run.done) return;
        run.done = true; runs.delete(run.handle); run.fragments = [];
        if (byRun.get(run.id) === run) byRun.delete(run.id);
        if (error) { run.error = fail(error); run.state = 'failed'; }
        else run.state = result.status;
        try { emit(run, error ? 'error' : 'done', error ? {name: run.error.name, message: run.error.message, code: run.error.code,
          ...(run.error.hint ? {hint: run.error.hint} : {})} : result); }
        catch (listenerError) { error = fail(listenerError); }
        finally {
          run.listeners.clear(); error ? run.completion.reject(fail(error)) : run.completion.resolve(result);
          if (!run.released) raw('release', [run.owner, run.handle, !!error]).catch(() => {});
        }
      }
      function makeRun(value, owner) {
        const previous = byRun.get(value.id);
        if (previous && !previous.done && previous.owner === owner) {
          raw('release', [owner, value.handle, false]).catch(() => {});
          return previous.public;
        }
        const run = {...value, owner, fragments: [], listeners: new Map(), completion: deferred(), done: false, error: null, observed: false, waiters: 0};
        const handle = {};
        for (const key of ['id', 'goal', 'startedAt', 'detached']) Object.defineProperty(handle, key, {enumerable: true, value: value[key]});
        Object.defineProperties(handle, {
          state: {enumerable: true, get: () => run.state}, error: {enumerable: true, get: () => run.error},
          result: {enumerable: true, get: () => { run.observed = true; updateTimer(); return run.completion.promise; }}
        });
        for (const method of ['on', 'once', 'off']) handle[method] = (name, listener) => {
          if (!events.has(name) || typeof listener !== 'function') throw new AgentError('Agent event and listener are required');
          if (method === 'off') run.listeners.set(name, (run.listeners.get(name) || []).filter(entry => entry.listener !== listener));
          else if (!run.done) run.listeners.set(name, [...(run.listeners.get(name) || []), {listener, once: method === 'once'}]);
          return handle;
        };
        handle.respond = (id, answer, callOptions) => query('run.respond', [run.handle, id, answer], callOptions);
        handle.confirm = (id, allowed, scope = 'once', callOptions) => query('run.confirm', [run.handle, id, allowed, scope], callOptions);
        handle.cancel = async (reason = 'script-request', callOptions) => {
          if (!run.done) await query('run.cancel', [run.handle, reason], callOptions);
          return handle;
        };
        handle.join = async timeoutMs => {
          if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000))
            throw new AgentError('Agent join timeout must be an integer from 1 to 3600000');
          run.waiters++; updateTimer(); let timeout;
          try { return await (timeoutMs === undefined ? run.completion.promise : Promise.race([run.completion.promise,
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new AgentError('Agent join timed out; task is still running', 'JOIN_TIMEOUT')), timeoutMs); })])); }
          finally { if (timeout) clearTimeout(timeout); run.waiters--; updateTimer(); }
        };
        runs.set(run.handle, run); byRun.set(run.id, run);
        run.public = Object.freeze(handle);
        return run.public;
      }
      function settleTask(task, error, value) {
        if (task.done) return;
        task.done = true; pending.delete(task); if (task.id) tasks.delete(task.id);
        task.cleanup?.(); task.fragments = [];
        if (!error && (task.method === 'run' || task.method === 'get') && value != null) value = makeRun(value, task.owner);
        error ? task.result.reject(fail(error)) : task.result.resolve(value);
        if (task.owner && task.id && !task.cancelled) raw('ack', [task.owner, task.id]).catch(() => {});
      }
      function cancelTask(task, error) {
        if (task.done) return;
        task.cancelled = true; settleTask(task, error);
        if (task.owner && task.id) raw('cancel', [task.owner, task.id]).catch(() => {});
      }
      function receive(run, event) {
        if (event.type === 'reject') { finishRun(run, event.value); return; }
        if (event.type !== 'event') throw new AgentError('Invalid Agent event');
        const value = {...event.value}, type = value.type;
        delete value.type; delete value.sequence; delete value.runId;
        if (type === 'handle_error') { finishRun(run, value.error); return; }
        if (type === 'done') { finishRun(run, null, value); return; }
        if (type === 'state') run.state = value.to;
        if (type === 'input' || type === 'confirmation') value.readOnly = run.interaction !== 'script';
        emit(run, type, value);
      }
      async function pump() {
        if (pumping) return;
        pumping = true;
        try {
          while (tasks.size || runs.size) {
            const groups = new Map();
            for (const [id, record] of [...tasks, ...runs]) groups.set(record.owner, [...(groups.get(record.owner) || []), id]);
            for (const [owner, ids] of groups) {
              try {
                const packets = await raw('poll', [owner, ids]);
                for (const packet of packets) {
                  const task = tasks.get(packet.id), run = runs.get(packet.id), record = task || run;
                  if (!record || record.owner !== owner) continue;
                  record.fragments.push(Buffer.from(packet.data, 'base64'));
                  if (!packet.last) continue;
                  const event = JSON.parse(Buffer.concat(record.fragments).toString('utf8')); record.fragments = [];
                  if (task) settleTask(task, event.type === 'reject' ? event.value : null, event.value);
                  else try { receive(run, event); } catch (error) {
                    finishRun(run, error);
                  }
                }
              } catch (error) {
                for (const id of ids) { if (tasks.has(id)) cancelTask(tasks.get(id), error); if (runs.has(id)) finishRun(runs.get(id), error); }
              }
            }
            if (tasks.size || runs.size) await new Promise(resolve => { timer = setTimeout(() => { timer = null; resolve(); }, 40); updateTimer(); });
          }
        } finally { pumping = false; if (tasks.size || runs.size) pump(); }
      }
      function query(method, args, callOptions = {}) {
        const task = {method, epoch, result: deferred(), fragments: [], done: false}; pending.add(task);
        try {
          const input = clone(args);
          if (!callOptions || typeof callOptions !== 'object' || Array.isArray(callOptions)) throw new AgentError('Agent call options must be an object');
          const {signal, timeoutMs} = callOptions;
          if (signal != null && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw new AgentError('Expected AbortSignal');
          if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)) throw new AgentError('Invalid Agent timeout');
          const abort = () => cancelTask(task, new AgentError('Agent call cancelled', 'CANCELLED'));
          const timeout = timeoutMs == null ? null : setTimeout(() => cancelTask(task, new AgentError('Agent call timed out', 'TIMEOUT')), timeoutMs);
          task.cleanup = () => { if (timeout != null) clearTimeout(timeout); signal?.removeEventListener('abort', abort); };
          signal?.addEventListener('abort', abort, {once: true});
          if (signal?.aborted) abort();
          Promise.resolve().then(async () => {
            if (task.done) return;
            task.owner = await client();
            if (task.done || task.epoch !== epoch) { cancelTask(task, stopped()); return; }
            const response = await raw('start', [task.owner, method, input]); task.id = response.id;
            if (task.done || task.epoch !== epoch) { await raw('cancel', [task.owner, task.id]); cancelTask(task, stopped()); return; }
            tasks.set(task.id, task); pump(); updateTimer();
          }).catch(error => settleTask(task, error));
        } catch (error) { settleTask(task, error); }
        return task.result.promise;
      }
      const agent = {
        AgentError,
        run: (goal, value = {}, callOptions) => query('run', [goal, {}, options(value)], callOptions),
        create: value => {
          if (value === undefined) throw new AgentError('Assistant options are required');
          const base = options(value), assistant = {run: (goal, overrides = {}, callOptions) => query('run', [goal, base, options(overrides)], callOptions)};
          Object.defineProperty(assistant, 'options', {enumerable: true, get: () => clone(base)});
          return Object.freeze(assistant);
        },
        get: (id, callOptions) => {
          const previous = byRun.get(id);
          return previous && !previous.done && previous.owner === ownerId
            ? query('status', [], callOptions).then(() => previous.public) : query('get', [id], callOptions);
        },
        list: (filter = {}, callOptions) => query('list', [object(filter)], callOptions),
        catalog: (queryText = null, callOptions) => query('catalog', [queryText], callOptions),
        presets: callOptions => query('presets', [], callOptions),
        status: callOptions => query('status', [], callOptions),
        context: () => raw('context', []),
        result: value => raw('result', [clone(value)]),
        hasAccess: () => raw('hasAccess', []),
        requestAccess: async () => {
          const generation = epoch;
          const granted = await agent.hasAccess();
          if (generation !== epoch) throw stopped();
          if (granted) return true;
          const previous = opening; opening = null; ownerId = null;
          if (previous) await previous.then(owner => raw('close', [owner]).catch(() => false), () => false);
          if (generation !== epoch) throw stopped();
          const id = 'access-' + Date.now() + '-' + Math.random(); accessRequests.add(id);
          try { return await raw('requestAccess', [id]); }
          finally { accessRequests.delete(id); await raw('close', [id]).catch(() => {}); }
        },
        close: async () => {
          const previous = opening; opening = null; ownerId = null; epoch++;
          for (const task of [...pending]) cancelTask(task, stopped());
          for (const run of [...runs.values()]) { run.released = true; finishRun(run, stopped()); }
          await Promise.all([...accessRequests].map(id => raw('close', [id]).catch(() => false))); accessRequests.clear();
          return previous ? previous.then(owner => raw('close', [owner]), () => false) : false;
        }
      };
      return Object.freeze(agent);
    }

    const agent = createAgent();
    const ai = (input, options, callOptions) => run('ask', [input, options], callOptions);
    Object.assign(ai, {AiError, agent, ask: ai,
      chat: (input, options, callOptions) => run('chat', [input, options], callOptions),
      stream: (input, options, callOptions) => run('stream', [input, options], callOptions, true),
      session: (options, callOptions) => run('session', [options], callOptions),
      catalog: (options, callOptions) => run('catalog', [options], callOptions),
      hasAccess: options => run('hasAccess', [], options),
      requestAccess: options => run('requestAccess', [], options),
      close: async () => {
        await agent.close();
        const previous = opening; opening = null; generation++;
        for (const record of [...pending]) cancel(record, closedError());
        for (const record of sessions) record.closed = true;
        sessions.clear();
        return previous ? previous.then(owner => raw('close', [owner]), () => false) : false;
      }
    });
    return Object.freeze(ai);
  }
  // End shared AI facade.
// END GENERATED AI FACADE

// BEGIN GENERATED AXIOS
// axios 1.1.2 (MIT, Copyright (c) 2014-present Matt Zabriskie & Collaborators), the browser build AutoJs6 Rhino scripts load
// from the host's assets/modules/axios/axios.min.js; reproduced by tools/host-client/sync-axios.mjs (do not edit here).
function __autojs6_bun_axios_library(window, XMLHttpRequest) {
const module = { exports: {} }, exports = module.exports;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
!function (e, t) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).axios = t();
}(void 0, function () {
  "use strict";

  function e(t) {
    return e = "function" == typeof Symbol && "symbol" == _typeof(Symbol.iterator) ? function (e) {
      return _typeof(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : _typeof(e);
    }, e(t);
  }
  function t(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }
  function n(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];
      r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }
  function r(e, t, r) {
    return t && n(e.prototype, t), r && n(e, r), Object.defineProperty(e, "prototype", {
      writable: !1
    }), e;
  }
  function o(e, t) {
    return function () {
      return e.apply(t, arguments);
    };
  }
  var i,
    s = Object.prototype.toString,
    a = Object.getPrototypeOf,
    u = (i = Object.create(null), function (e) {
      var t = s.call(e);
      return i[t] || (i[t] = t.slice(8, -1).toLowerCase());
    }),
    c = function c(e) {
      return e = e.toLowerCase(), function (t) {
        return u(t) === e;
      };
    },
    f = function f(t) {
      return function (n) {
        return e(n) === t;
      };
    },
    l = Array.isArray,
    d = f("undefined");
  var h = c("ArrayBuffer");
  var p = f("string"),
    m = f("function"),
    v = f("number"),
    y = function y(t) {
      return null !== t && "object" === e(t);
    },
    b = function b(e) {
      if ("object" !== u(e)) return !1;
      var t = a(e);
      return !(null !== t && t !== Object.prototype && null !== Object.getPrototypeOf(t) || Symbol.toStringTag in e || Symbol.iterator in e);
    },
    g = c("Date"),
    E = c("File"),
    w = c("Blob"),
    O = c("FileList"),
    R = c("URLSearchParams");
  function S(t, n) {
    var r,
      o,
      i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
      s = i.allOwnKeys,
      a = void 0 !== s && s;
    if (null != t) if ("object" !== e(t) && (t = [t]), l(t)) for (r = 0, o = t.length; r < o; r++) n.call(null, t[r], r, t);else {
      var u,
        c = a ? Object.getOwnPropertyNames(t) : Object.keys(t),
        f = c.length;
      for (r = 0; r < f; r++) u = c[r], n.call(null, t[u], u, t);
    }
  }
  var A,
    j = (A = "undefined" != typeof Uint8Array && a(Uint8Array), function (e) {
      return A && e instanceof A;
    }),
    T = c("HTMLFormElement"),
    x = function (e) {
      var t = Object.prototype.hasOwnProperty;
      return function (e, n) {
        return t.call(e, n);
      };
    }(),
    C = c("RegExp"),
    N = function N(e, t) {
      var n = Object.getOwnPropertyDescriptors(e),
        r = {};
      S(n, function (n, o) {
        !1 !== t(n, o, e) && (r[o] = n);
      }), Object.defineProperties(e, r);
    },
    P = {
      isArray: l,
      isArrayBuffer: h,
      isBuffer: function isBuffer(e) {
        return null !== e && !d(e) && null !== e.constructor && !d(e.constructor) && m(e.constructor.isBuffer) && e.constructor.isBuffer(e);
      },
      isFormData: function isFormData(e) {
        var t = "[object FormData]";
        return e && ("function" == typeof FormData && e instanceof FormData || s.call(e) === t || m(e.toString) && e.toString() === t);
      },
      isArrayBufferView: function isArrayBufferView(e) {
        return "undefined" != typeof ArrayBuffer && ArrayBuffer.isView ? ArrayBuffer.isView(e) : e && e.buffer && h(e.buffer);
      },
      isString: p,
      isNumber: v,
      isBoolean: function isBoolean(e) {
        return !0 === e || !1 === e;
      },
      isObject: y,
      isPlainObject: b,
      isUndefined: d,
      isDate: g,
      isFile: E,
      isBlob: w,
      isRegExp: C,
      isFunction: m,
      isStream: function isStream(e) {
        return y(e) && m(e.pipe);
      },
      isURLSearchParams: R,
      isTypedArray: j,
      isFileList: O,
      forEach: S,
      merge: function e() {
        for (var t = {}, n = function n(_n, r) {
            b(t[r]) && b(_n) ? t[r] = e(t[r], _n) : b(_n) ? t[r] = e({}, _n) : l(_n) ? t[r] = _n.slice() : t[r] = _n;
          }, r = 0, o = arguments.length; r < o; r++) arguments[r] && S(arguments[r], n);
        return t;
      },
      extend: function extend(e, t, n) {
        var r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {},
          i = r.allOwnKeys;
        return S(t, function (t, r) {
          n && m(t) ? e[r] = o(t, n) : e[r] = t;
        }, {
          allOwnKeys: i
        }), e;
      },
      trim: function trim(e) {
        return e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
      },
      stripBOM: function stripBOM(e) {
        return 65279 === e.charCodeAt(0) && (e = e.slice(1)), e;
      },
      inherits: function inherits(e, t, n, r) {
        e.prototype = Object.create(t.prototype, r), e.prototype.constructor = e, Object.defineProperty(e, "super", {
          value: t.prototype
        }), n && Object.assign(e.prototype, n);
      },
      toFlatObject: function toFlatObject(e, t, n, r) {
        var o,
          i,
          s,
          u = {};
        if (t = t || {}, null == e) return t;
        do {
          for (i = (o = Object.getOwnPropertyNames(e)).length; i-- > 0;) s = o[i], r && !r(s, e, t) || u[s] || (t[s] = e[s], u[s] = !0);
          e = !1 !== n && a(e);
        } while (e && (!n || n(e, t)) && e !== Object.prototype);
        return t;
      },
      kindOf: u,
      kindOfTest: c,
      endsWith: function endsWith(e, t, n) {
        e = String(e), (void 0 === n || n > e.length) && (n = e.length), n -= t.length;
        var r = e.indexOf(t, n);
        return -1 !== r && r === n;
      },
      toArray: function toArray(e) {
        if (!e) return null;
        if (l(e)) return e;
        var t = e.length;
        if (!v(t)) return null;
        for (var n = new Array(t); t-- > 0;) n[t] = e[t];
        return n;
      },
      forEachEntry: function forEachEntry(e, t) {
        for (var n, r = (e && e[Symbol.iterator]).call(e); (n = r.next()) && !n.done;) {
          var o = n.value;
          t.call(e, o[0], o[1]);
        }
      },
      matchAll: function matchAll(e, t) {
        for (var n, r = []; null !== (n = e.exec(t));) r.push(n);
        return r;
      },
      isHTMLForm: T,
      hasOwnProperty: x,
      hasOwnProp: x,
      reduceDescriptors: N,
      freezeMethods: function freezeMethods(e) {
        N(e, function (t, n) {
          var r = e[n];
          m(r) && (t.enumerable = !1, "writable" in t ? t.writable = !1 : t.set || (t.set = function () {
            throw Error("Can not read-only method '" + n + "'");
          }));
        });
      },
      toObjectSet: function toObjectSet(e, t) {
        var n = {},
          r = function r(e) {
            e.forEach(function (e) {
              n[e] = !0;
            });
          };
        return l(e) ? r(e) : r(String(e).split(t)), n;
      },
      toCamelCase: function toCamelCase(e) {
        return e.toLowerCase().replace(/[_-\s]([a-z\d])(\w*)/g, function (e, t, n) {
          return t.toUpperCase() + n;
        });
      },
      noop: function noop() {},
      toFiniteNumber: function toFiniteNumber(e, t) {
        return e = +e, Number.isFinite(e) ? e : t;
      }
    };
  function _(e, t, n, r, o) {
    Error.call(this), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack, this.message = e, this.name = "AxiosError", t && (this.code = t), n && (this.config = n), r && (this.request = r), o && (this.response = o);
  }
  P.inherits(_, Error, {
    toJSON: function toJSON() {
      return {
        message: this.message,
        name: this.name,
        description: this.description,
        number: this.number,
        fileName: this.fileName,
        lineNumber: this.lineNumber,
        columnNumber: this.columnNumber,
        stack: this.stack,
        config: this.config,
        code: this.code,
        status: this.response && this.response.status ? this.response.status : null
      };
    }
  });
  var B = _.prototype,
    D = {};
  ["ERR_BAD_OPTION_VALUE", "ERR_BAD_OPTION", "ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK", "ERR_FR_TOO_MANY_REDIRECTS", "ERR_DEPRECATED", "ERR_BAD_RESPONSE", "ERR_BAD_REQUEST", "ERR_CANCELED", "ERR_NOT_SUPPORT", "ERR_INVALID_URL"].forEach(function (e) {
    D[e] = {
      value: e
    };
  }), Object.defineProperties(_, D), Object.defineProperty(B, "isAxiosError", {
    value: !0
  }), _.from = function (e, t, n, r, o, i) {
    var s = Object.create(B);
    return P.toFlatObject(e, s, function (e) {
      return e !== Error.prototype;
    }, function (e) {
      return "isAxiosError" !== e;
    }), _.call(s, e.message, t, n, r, o), s.cause = e, s.name = e.name, i && Object.assign(s, i), s;
  };
  var F = "object" == ("undefined" == typeof self ? "undefined" : e(self)) ? self.FormData : window.FormData;
  function U(e) {
    return P.isPlainObject(e) || P.isArray(e);
  }
  function k(e) {
    return P.endsWith(e, "[]") ? e.slice(0, -2) : e;
  }
  function L(e, t, n) {
    return e ? e.concat(t).map(function (e, t) {
      return e = k(e), !n && t ? "[" + e + "]" : e;
    }).join(n ? "." : "") : t;
  }
  var q = P.toFlatObject(P, {}, null, function (e) {
    return /^is[A-Z]/.test(e);
  });
  function z(t, n, r) {
    if (!P.isObject(t)) throw new TypeError("target must be an object");
    n = n || new (F || FormData)();
    var o,
      i = (r = P.toFlatObject(r, {
        metaTokens: !0,
        dots: !1,
        indexes: !1
      }, !1, function (e, t) {
        return !P.isUndefined(t[e]);
      })).metaTokens,
      s = r.visitor || l,
      a = r.dots,
      u = r.indexes,
      c = (r.Blob || "undefined" != typeof Blob && Blob) && (o = n) && P.isFunction(o.append) && "FormData" === o[Symbol.toStringTag] && o[Symbol.iterator];
    if (!P.isFunction(s)) throw new TypeError("visitor must be a function");
    function f(e) {
      if (null === e) return "";
      if (P.isDate(e)) return e.toISOString();
      if (!c && P.isBlob(e)) throw new _("Blob is not supported. Use a Buffer instead.");
      return P.isArrayBuffer(e) || P.isTypedArray(e) ? c && "function" == typeof Blob ? new Blob([e]) : Buffer.from(e) : e;
    }
    function l(t, r, o) {
      var s = t;
      if (t && !o && "object" === e(t)) if (P.endsWith(r, "{}")) r = i ? r : r.slice(0, -2), t = JSON.stringify(t);else if (P.isArray(t) && function (e) {
        return P.isArray(e) && !e.some(U);
      }(t) || P.isFileList(t) || P.endsWith(r, "[]") && (s = P.toArray(t))) return r = k(r), s.forEach(function (e, t) {
        !P.isUndefined(e) && n.append(!0 === u ? L([r], t, a) : null === u ? r : r + "[]", f(e));
      }), !1;
      return !!U(t) || (n.append(L(o, r, a), f(t)), !1);
    }
    var d = [],
      h = Object.assign(q, {
        defaultVisitor: l,
        convertValue: f,
        isVisitable: U
      });
    if (!P.isObject(t)) throw new TypeError("data must be an object");
    return function e(t, r) {
      if (!P.isUndefined(t)) {
        if (-1 !== d.indexOf(t)) throw Error("Circular reference detected in " + r.join("."));
        d.push(t), P.forEach(t, function (t, o) {
          !0 === (!P.isUndefined(t) && s.call(n, t, P.isString(o) ? o.trim() : o, r, h)) && e(t, r ? r.concat(o) : [o]);
        }), d.pop();
      }
    }(t), n;
  }
  function I(e) {
    var t = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\0"
    };
    return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g, function (e) {
      return t[e];
    });
  }
  function M(e, t) {
    this._pairs = [], e && z(e, this, t);
  }
  var J = M.prototype;
  function H(e) {
    return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
  }
  function V(e, t, n) {
    if (!t) return e;
    var r = e.indexOf("#");
    -1 !== r && (e = e.slice(0, r));
    var o = n && n.encode || H,
      i = P.isURLSearchParams(t) ? t.toString() : new M(t, n).toString(o);
    return i && (e += (-1 === e.indexOf("?") ? "?" : "&") + i), e;
  }
  J.append = function (e, t) {
    this._pairs.push([e, t]);
  }, J.toString = function (e) {
    var t = e ? function (t) {
      return e.call(this, t, I);
    } : I;
    return this._pairs.map(function (e) {
      return t(e[0]) + "=" + t(e[1]);
    }, "").join("&");
  };
  var W,
    K = function () {
      function e() {
        t(this, e), this.handlers = [];
      }
      return r(e, [{
        key: "use",
        value: function value(e, t, n) {
          return this.handlers.push({
            fulfilled: e,
            rejected: t,
            synchronous: !!n && n.synchronous,
            runWhen: n ? n.runWhen : null
          }), this.handlers.length - 1;
        }
      }, {
        key: "eject",
        value: function value(e) {
          this.handlers[e] && (this.handlers[e] = null);
        }
      }, {
        key: "clear",
        value: function value() {
          this.handlers && (this.handlers = []);
        }
      }, {
        key: "forEach",
        value: function value(e) {
          P.forEach(this.handlers, function (t) {
            null !== t && e(t);
          });
        }
      }]), e;
    }(),
    X = {
      silentJSONParsing: !0,
      forcedJSONParsing: !0,
      clarifyTimeoutError: !1
    },
    $ = "undefined" != typeof URLSearchParams ? URLSearchParams : M,
    Q = FormData,
    G = ("undefined" == typeof navigator || "ReactNative" !== (W = navigator.product) && "NativeScript" !== W && "NS" !== W) && "undefined" != typeof window && "undefined" != typeof document,
    Y = {
      isBrowser: !0,
      classes: {
        URLSearchParams: $,
        FormData: Q,
        Blob: Blob
      },
      isStandardBrowserEnv: G,
      protocols: ["http", "https", "file", "blob", "url", "data"]
    };
  function Z(e) {
    function t(e, n, r, o) {
      var i = e[o++],
        s = Number.isFinite(+i),
        a = o >= e.length;
      return i = !i && P.isArray(r) ? r.length : i, a ? (P.hasOwnProp(r, i) ? r[i] = [r[i], n] : r[i] = n, !s) : (r[i] && P.isObject(r[i]) || (r[i] = []), t(e, n, r[i], o) && P.isArray(r[i]) && (r[i] = function (e) {
        var t,
          n,
          r = {},
          o = Object.keys(e),
          i = o.length;
        for (t = 0; t < i; t++) r[n = o[t]] = e[n];
        return r;
      }(r[i])), !s);
    }
    if (P.isFormData(e) && P.isFunction(e.entries)) {
      var n = {};
      return P.forEachEntry(e, function (e, r) {
        t(function (e) {
          return P.matchAll(/\w+|\[(\w*)]/g, e).map(function (e) {
            return "[]" === e[0] ? "" : e[1] || e[0];
          });
        }(e), r, n, 0);
      }), n;
    }
    return null;
  }
  var ee = Y.isStandardBrowserEnv ? {
    write: function write(e, t, n, r, o, i) {
      var s = [];
      s.push(e + "=" + encodeURIComponent(t)), P.isNumber(n) && s.push("expires=" + new Date(n).toGMTString()), P.isString(r) && s.push("path=" + r), P.isString(o) && s.push("domain=" + o), !0 === i && s.push("secure"), document.cookie = s.join("; ");
    },
    read: function read(e) {
      var t = document.cookie.match(new RegExp("(^|;\\s*)(" + e + ")=([^;]*)"));
      return t ? decodeURIComponent(t[3]) : null;
    },
    remove: function remove(e) {
      this.write(e, "", Date.now() - 864e5);
    }
  } : {
    write: function write() {},
    read: function read() {
      return null;
    },
    remove: function remove() {}
  };
  function te(e, t) {
    return e && !/^([a-z][a-z\d+\-.]*:)?\/\//i.test(t) ? function (e, t) {
      return t ? e.replace(/\/+$/, "") + "/" + t.replace(/^\/+/, "") : e;
    }(e, t) : t;
  }
  var ne = Y.isStandardBrowserEnv ? function () {
    var e,
      t = /(msie|trident)/i.test(navigator.userAgent),
      n = document.createElement("a");
    function r(e) {
      var r = e;
      return t && (n.setAttribute("href", r), r = n.href), n.setAttribute("href", r), {
        href: n.href,
        protocol: n.protocol ? n.protocol.replace(/:$/, "") : "",
        host: n.host,
        search: n.search ? n.search.replace(/^\?/, "") : "",
        hash: n.hash ? n.hash.replace(/^#/, "") : "",
        hostname: n.hostname,
        port: n.port,
        pathname: "/" === n.pathname.charAt(0) ? n.pathname : "/" + n.pathname
      };
    }
    return e = r(window.location.href), function (t) {
      var n = P.isString(t) ? r(t) : t;
      return n.protocol === e.protocol && n.host === e.host;
    };
  }() : function () {
    return !0;
  };
  function re(e, t, n) {
    _.call(this, null == e ? "canceled" : e, _.ERR_CANCELED, t, n), this.name = "CanceledError";
  }
  P.inherits(re, _, {
    __CANCEL__: !0
  });
  var oe = P.toObjectSet(["age", "authorization", "content-length", "content-type", "etag", "expires", "from", "host", "if-modified-since", "if-unmodified-since", "last-modified", "location", "max-forwards", "proxy-authorization", "referer", "retry-after", "user-agent"]),
    ie = Symbol("internals"),
    se = Symbol("defaults");
  function ae(e) {
    return e && String(e).trim().toLowerCase();
  }
  function ue(e) {
    return !1 === e || null == e ? e : String(e);
  }
  function ce(e, t, n, r) {
    return P.isFunction(r) ? r.call(this, t, n) : P.isString(t) ? P.isString(r) ? -1 !== t.indexOf(r) : P.isRegExp(r) ? r.test(t) : void 0 : void 0;
  }
  function fe(e, t) {
    t = t.toLowerCase();
    for (var n, r = Object.keys(e), o = r.length; o-- > 0;) if (t === (n = r[o]).toLowerCase()) return n;
    return null;
  }
  function le(e, t) {
    e && this.set(e), this[se] = t || null;
  }
  function de(e, t) {
    var n = 0,
      r = function (e, t) {
        e = e || 10;
        var n,
          r = new Array(e),
          o = new Array(e),
          i = 0,
          s = 0;
        return t = void 0 !== t ? t : 1e3, function (a) {
          var u = Date.now(),
            c = o[s];
          n || (n = u), r[i] = a, o[i] = u;
          for (var f = s, l = 0; f !== i;) l += r[f++], f %= e;
          if ((i = (i + 1) % e) === s && (s = (s + 1) % e), !(u - n < t)) {
            var d = c && u - c;
            return d ? Math.round(1e3 * l / d) : void 0;
          }
        };
      }(50, 250);
    return function (o) {
      var i = o.loaded,
        s = o.lengthComputable ? o.total : void 0,
        a = i - n,
        u = r(a);
      n = i;
      var c = {
        loaded: i,
        total: s,
        progress: s ? i / s : void 0,
        bytes: a,
        rate: u || void 0,
        estimated: u && s && i <= s ? (s - i) / u : void 0
      };
      c[t ? "download" : "upload"] = !0, e(c);
    };
  }
  function he(e) {
    return new Promise(function (t, n) {
      var r,
        o = e.data,
        i = le.from(e.headers).normalize(),
        s = e.responseType;
      function a() {
        e.cancelToken && e.cancelToken.unsubscribe(r), e.signal && e.signal.removeEventListener("abort", r);
      }
      P.isFormData(o) && Y.isStandardBrowserEnv && i.setContentType(!1);
      var u = new XMLHttpRequest();
      if (e.auth) {
        var c = e.auth.username || "",
          f = e.auth.password ? unescape(encodeURIComponent(e.auth.password)) : "";
        i.set("Authorization", "Basic " + btoa(c + ":" + f));
      }
      var l = te(e.baseURL, e.url);
      function d() {
        if (u) {
          var r = le.from("getAllResponseHeaders" in u && u.getAllResponseHeaders());
          !function (e, t, n) {
            var r = n.config.validateStatus;
            n.status && r && !r(n.status) ? t(new _("Request failed with status code " + n.status, [_.ERR_BAD_REQUEST, _.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4], n.config, n.request, n)) : e(n);
          }(function (e) {
            t(e), a();
          }, function (e) {
            n(e), a();
          }, {
            data: s && "text" !== s && "json" !== s ? u.response : u.responseText,
            status: u.status,
            statusText: u.statusText,
            headers: r,
            config: e,
            request: u
          }), u = null;
        }
      }
      if (u.open(e.method.toUpperCase(), V(l, e.params, e.paramsSerializer), !0), u.timeout = e.timeout, "onloadend" in u ? u.onloadend = d : u.onreadystatechange = function () {
        u && 4 === u.readyState && (0 !== u.status || u.responseURL && 0 === u.responseURL.indexOf("file:")) && setTimeout(d);
      }, u.onabort = function () {
        u && (n(new _("Request aborted", _.ECONNABORTED, e, u)), u = null);
      }, u.onerror = function () {
        n(new _("Network Error", _.ERR_NETWORK, e, u)), u = null;
      }, u.ontimeout = function () {
        var t = e.timeout ? "timeout of " + e.timeout + "ms exceeded" : "timeout exceeded",
          r = e.transitional || X;
        e.timeoutErrorMessage && (t = e.timeoutErrorMessage), n(new _(t, r.clarifyTimeoutError ? _.ETIMEDOUT : _.ECONNABORTED, e, u)), u = null;
      }, Y.isStandardBrowserEnv) {
        var h = (e.withCredentials || ne(l)) && e.xsrfCookieName && ee.read(e.xsrfCookieName);
        h && i.set(e.xsrfHeaderName, h);
      }
      void 0 === o && i.setContentType(null), "setRequestHeader" in u && P.forEach(i.toJSON(), function (e, t) {
        u.setRequestHeader(t, e);
      }), P.isUndefined(e.withCredentials) || (u.withCredentials = !!e.withCredentials), s && "json" !== s && (u.responseType = e.responseType), "function" == typeof e.onDownloadProgress && u.addEventListener("progress", de(e.onDownloadProgress, !0)), "function" == typeof e.onUploadProgress && u.upload && u.upload.addEventListener("progress", de(e.onUploadProgress)), (e.cancelToken || e.signal) && (r = function r(t) {
        u && (n(!t || t.type ? new re(null, e, u) : t), u.abort(), u = null);
      }, e.cancelToken && e.cancelToken.subscribe(r), e.signal && (e.signal.aborted ? r() : e.signal.addEventListener("abort", r)));
      var p,
        m = (p = /^([-+\w]{1,25})(:?\/\/|:)/.exec(l)) && p[1] || "";
      m && -1 === Y.protocols.indexOf(m) ? n(new _("Unsupported protocol " + m + ":", _.ERR_BAD_REQUEST, e)) : u.send(o || null);
    });
  }
  Object.assign(le.prototype, {
    set: function set(e, t, n) {
      var r = this;
      function o(e, t, n) {
        var o = ae(t);
        if (!o) throw new Error("header name must be a non-empty string");
        var i = fe(r, o);
        (!i || !0 === n || !1 !== r[i] && !1 !== n) && (e = P.isArray(e) ? e.map(ue) : ue(e), r[i || t] = e);
      }
      return P.isPlainObject(e) ? P.forEach(e, function (e, n) {
        o(e, n, t);
      }) : o(t, e, n), this;
    },
    get: function get(e, t) {
      if (e = ae(e)) {
        var n = fe(this, e);
        if (n) {
          var r = this[n];
          if (!t) return r;
          if (!0 === t) return function (e) {
            for (var t, n = Object.create(null), r = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g; t = r.exec(e);) n[t[1]] = t[2];
            return n;
          }(r);
          if (P.isFunction(t)) return t.call(this, r, n);
          if (P.isRegExp(t)) return t.exec(r);
          throw new TypeError("parser must be boolean|regexp|function");
        }
      }
    },
    has: function has(e, t) {
      if (e = ae(e)) {
        var n = fe(this, e);
        return !(!n || t && !ce(0, this[n], n, t));
      }
      return !1;
    },
    "delete": function _delete(e, t) {
      var n = this,
        r = !1;
      function o(e) {
        if (e = ae(e)) {
          var o = fe(n, e);
          !o || t && !ce(0, n[o], o, t) || (delete n[o], r = !0);
        }
      }
      return P.isArray(e) ? e.forEach(o) : o(e), r;
    },
    clear: function clear() {
      return Object.keys(this).forEach(this["delete"].bind(this));
    },
    normalize: function normalize(e) {
      var t = this,
        n = {};
      return P.forEach(this, function (r, o) {
        var i = fe(n, o);
        if (i) return t[i] = ue(r), void delete t[o];
        var s = e ? function (e) {
          return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, function (e, t, n) {
            return t.toUpperCase() + n;
          });
        }(o) : String(o).trim();
        s !== o && delete t[o], t[s] = ue(r), n[s] = !0;
      }), this;
    },
    toJSON: function toJSON() {
      var e = Object.create(null);
      return P.forEach(Object.assign({}, this[se] || null, this), function (t, n) {
        null != t && !1 !== t && (e[n] = P.isArray(t) ? t.join(", ") : t);
      }), e;
    }
  }), Object.assign(le, {
    from: function from(e) {
      return P.isString(e) ? new this((i = {}, (t = e) && t.split("\n").forEach(function (e) {
        o = e.indexOf(":"), n = e.substring(0, o).trim().toLowerCase(), r = e.substring(o + 1).trim(), !n || i[n] && oe[n] || ("set-cookie" === n ? i[n] ? i[n].push(r) : i[n] = [r] : i[n] = i[n] ? i[n] + ", " + r : r);
      }), i)) : e instanceof this ? e : new this(e);
      var t, n, r, o, i;
    },
    accessor: function accessor(e) {
      var t = (this[ie] = this[ie] = {
          accessors: {}
        }).accessors,
        n = this.prototype;
      function r(e) {
        var r = ae(e);
        t[r] || (!function (e, t) {
          var n = P.toCamelCase(" " + t);
          ["get", "set", "has"].forEach(function (r) {
            Object.defineProperty(e, r + n, {
              value: function value(e, n, o) {
                return this[r].call(this, t, e, n, o);
              },
              configurable: !0
            });
          });
        }(n, e), t[r] = !0);
      }
      return P.isArray(e) ? e.forEach(r) : r(e), this;
    }
  }), le.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent"]), P.freezeMethods(le.prototype), P.freezeMethods(le);
  var pe = {
      http: he,
      xhr: he
    },
    me = function me(e) {
      if (P.isString(e)) {
        var t = pe[e];
        if (!e) throw Error(P.hasOwnProp(e) ? "Adapter '".concat(e, "' is not available in the build") : "Can not resolve adapter '".concat(e, "'"));
        return t;
      }
      if (!P.isFunction(e)) throw new TypeError("adapter is not a function");
      return e;
    },
    ve = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
  var ye,
    be = {
      transitional: X,
      adapter: ("undefined" != typeof XMLHttpRequest ? ye = me("xhr") : "undefined" != typeof process && "process" === P.kindOf(process) && (ye = me("http")), ye),
      transformRequest: [function (e, t) {
        var n,
          r = t.getContentType() || "",
          o = r.indexOf("application/json") > -1,
          i = P.isObject(e);
        if (i && P.isHTMLForm(e) && (e = new FormData(e)), P.isFormData(e)) return o && o ? JSON.stringify(Z(e)) : e;
        if (P.isArrayBuffer(e) || P.isBuffer(e) || P.isStream(e) || P.isFile(e) || P.isBlob(e)) return e;
        if (P.isArrayBufferView(e)) return e.buffer;
        if (P.isURLSearchParams(e)) return t.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
        if (i) {
          if (r.indexOf("application/x-www-form-urlencoded") > -1) return function (e, t) {
            return z(e, new Y.classes.URLSearchParams(), Object.assign({
              visitor: function visitor(e, t, n, r) {
                return Y.isNode && P.isBuffer(e) ? (this.append(t, e.toString("base64")), !1) : r.defaultVisitor.apply(this, arguments);
              }
            }, t));
          }(e, this.formSerializer).toString();
          if ((n = P.isFileList(e)) || r.indexOf("multipart/form-data") > -1) {
            var s = this.env && this.env.FormData;
            return z(n ? {
              "files[]": e
            } : e, s && new s(), this.formSerializer);
          }
        }
        return i || o ? (t.setContentType("application/json", !1), function (e, t, n) {
          if (P.isString(e)) try {
            return (t || JSON.parse)(e), P.trim(e);
          } catch (e) {
            if ("SyntaxError" !== e.name) throw e;
          }
          return (n || JSON.stringify)(e);
        }(e)) : e;
      }],
      transformResponse: [function (e) {
        var t = this.transitional || be.transitional,
          n = t && t.forcedJSONParsing,
          r = "json" === this.responseType;
        if (e && P.isString(e) && (n && !this.responseType || r)) {
          var o = !(t && t.silentJSONParsing) && r;
          try {
            return JSON.parse(e);
          } catch (e) {
            if (o) {
              if ("SyntaxError" === e.name) throw _.from(e, _.ERR_BAD_RESPONSE, this, null, this.response);
              throw e;
            }
          }
        }
        return e;
      }],
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
        FormData: Y.classes.FormData,
        Blob: Y.classes.Blob
      },
      validateStatus: function validateStatus(e) {
        return e >= 200 && e < 300;
      },
      headers: {
        common: {
          Accept: "application/json, text/plain, */*"
        }
      }
    };
  function ge(e, t) {
    var n = this || be,
      r = t || n,
      o = le.from(r.headers),
      i = r.data;
    return P.forEach(e, function (e) {
      i = e.call(n, i, o.normalize(), t ? t.status : void 0);
    }), o.normalize(), i;
  }
  function Ee(e) {
    return !(!e || !e.__CANCEL__);
  }
  function we(e) {
    if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted) throw new re();
  }
  function Oe(e) {
    return we(e), e.headers = le.from(e.headers), e.data = ge.call(e, e.transformRequest), (e.adapter || be.adapter)(e).then(function (t) {
      return we(e), t.data = ge.call(e, e.transformResponse, t), t.headers = le.from(t.headers), t;
    }, function (t) {
      return Ee(t) || (we(e), t && t.response && (t.response.data = ge.call(e, e.transformResponse, t.response), t.response.headers = le.from(t.response.headers))), Promise.reject(t);
    });
  }
  function Re(e, t) {
    t = t || {};
    var n = {};
    function r(e, t) {
      return P.isPlainObject(e) && P.isPlainObject(t) ? P.merge(e, t) : P.isPlainObject(t) ? P.merge({}, t) : P.isArray(t) ? t.slice() : t;
    }
    function o(n) {
      return P.isUndefined(t[n]) ? P.isUndefined(e[n]) ? void 0 : r(void 0, e[n]) : r(e[n], t[n]);
    }
    function i(e) {
      if (!P.isUndefined(t[e])) return r(void 0, t[e]);
    }
    function s(n) {
      return P.isUndefined(t[n]) ? P.isUndefined(e[n]) ? void 0 : r(void 0, e[n]) : r(void 0, t[n]);
    }
    function a(n) {
      return n in t ? r(e[n], t[n]) : n in e ? r(void 0, e[n]) : void 0;
    }
    var u = {
      url: i,
      method: i,
      data: i,
      baseURL: s,
      transformRequest: s,
      transformResponse: s,
      paramsSerializer: s,
      timeout: s,
      timeoutMessage: s,
      withCredentials: s,
      adapter: s,
      responseType: s,
      xsrfCookieName: s,
      xsrfHeaderName: s,
      onUploadProgress: s,
      onDownloadProgress: s,
      decompress: s,
      maxContentLength: s,
      maxBodyLength: s,
      beforeRedirect: s,
      transport: s,
      httpAgent: s,
      httpsAgent: s,
      cancelToken: s,
      socketPath: s,
      responseEncoding: s,
      validateStatus: a
    };
    return P.forEach(Object.keys(e).concat(Object.keys(t)), function (e) {
      var t = u[e] || o,
        r = t(e);
      P.isUndefined(r) && t !== a || (n[e] = r);
    }), n;
  }
  P.forEach(["delete", "get", "head"], function (e) {
    be.headers[e] = {};
  }), P.forEach(["post", "put", "patch"], function (e) {
    be.headers[e] = P.merge(ve);
  });
  var Se = "1.1.2",
    Ae = {};
  ["object", "boolean", "number", "function", "string", "symbol"].forEach(function (t, n) {
    Ae[t] = function (r) {
      return e(r) === t || "a" + (n < 1 ? "n " : " ") + t;
    };
  });
  var je = {};
  Ae.transitional = function (e, t, n) {
    function r(e, t) {
      return "[Axios v1.1.2] Transitional option '" + e + "'" + t + (n ? ". " + n : "");
    }
    return function (n, o, i) {
      if (!1 === e) throw new _(r(o, " has been removed" + (t ? " in " + t : "")), _.ERR_DEPRECATED);
      return t && !je[o] && (je[o] = !0, console.warn(r(o, " has been deprecated since v" + t + " and will be removed in the near future"))), !e || e(n, o, i);
    };
  };
  var Te = {
      assertOptions: function assertOptions(t, n, r) {
        if ("object" !== e(t)) throw new _("options must be an object", _.ERR_BAD_OPTION_VALUE);
        for (var o = Object.keys(t), i = o.length; i-- > 0;) {
          var s = o[i],
            a = n[s];
          if (a) {
            var u = t[s],
              c = void 0 === u || a(u, s, t);
            if (!0 !== c) throw new _("option " + s + " must be " + c, _.ERR_BAD_OPTION_VALUE);
          } else if (!0 !== r) throw new _("Unknown option " + s, _.ERR_BAD_OPTION);
        }
      },
      validators: Ae
    },
    xe = Te.validators,
    Ce = function () {
      function e(n) {
        t(this, e), this.defaults = n, this.interceptors = {
          request: new K(),
          response: new K()
        };
      }
      return r(e, [{
        key: "request",
        value: function value(e, t) {
          "string" == typeof e ? (t = t || {}).url = e : t = e || {};
          var n = (t = Re(this.defaults, t)).transitional;
          void 0 !== n && Te.assertOptions(n, {
            silentJSONParsing: xe.transitional(xe["boolean"]),
            forcedJSONParsing: xe.transitional(xe["boolean"]),
            clarifyTimeoutError: xe.transitional(xe["boolean"])
          }, !1), t.method = (t.method || this.defaults.method || "get").toLowerCase();
          var r = t.headers && P.merge(t.headers.common, t.headers[t.method]);
          r && P.forEach(["delete", "get", "head", "post", "put", "patch", "common"], function (e) {
            delete t.headers[e];
          }), t.headers = new le(t.headers, r);
          var o = [],
            i = !0;
          this.interceptors.request.forEach(function (e) {
            "function" == typeof e.runWhen && !1 === e.runWhen(t) || (i = i && e.synchronous, o.unshift(e.fulfilled, e.rejected));
          });
          var s,
            a = [];
          this.interceptors.response.forEach(function (e) {
            a.push(e.fulfilled, e.rejected);
          });
          var u,
            c = 0;
          if (!i) {
            var f = [Oe.bind(this), void 0];
            for (f.unshift.apply(f, o), f.push.apply(f, a), u = f.length, s = Promise.resolve(t); c < u;) s = s.then(f[c++], f[c++]);
            return s;
          }
          u = o.length;
          var l = t;
          for (c = 0; c < u;) {
            var d = o[c++],
              h = o[c++];
            try {
              l = d(l);
            } catch (e) {
              h.call(this, e);
              break;
            }
          }
          try {
            s = Oe.call(this, l);
          } catch (e) {
            return Promise.reject(e);
          }
          for (c = 0, u = a.length; c < u;) s = s.then(a[c++], a[c++]);
          return s;
        }
      }, {
        key: "getUri",
        value: function value(e) {
          return V(te((e = Re(this.defaults, e)).baseURL, e.url), e.params, e.paramsSerializer);
        }
      }]), e;
    }();
  P.forEach(["delete", "get", "head", "options"], function (e) {
    Ce.prototype[e] = function (t, n) {
      return this.request(Re(n || {}, {
        method: e,
        url: t,
        data: (n || {}).data
      }));
    };
  }), P.forEach(["post", "put", "patch"], function (e) {
    function t(t) {
      return function (n, r, o) {
        return this.request(Re(o || {}, {
          method: e,
          headers: t ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url: n,
          data: r
        }));
      };
    }
    Ce.prototype[e] = t(), Ce.prototype[e + "Form"] = t(!0);
  });
  var Ne = function () {
    function e(n) {
      if (t(this, e), "function" != typeof n) throw new TypeError("executor must be a function.");
      var r;
      this.promise = new Promise(function (e) {
        r = e;
      });
      var o = this;
      this.promise.then(function (e) {
        if (o._listeners) {
          for (var t = o._listeners.length; t-- > 0;) o._listeners[t](e);
          o._listeners = null;
        }
      }), this.promise.then = function (e) {
        var t,
          n = new Promise(function (e) {
            o.subscribe(e), t = e;
          }).then(e);
        return n.cancel = function () {
          o.unsubscribe(t);
        }, n;
      }, n(function (e, t, n) {
        o.reason || (o.reason = new re(e, t, n), r(o.reason));
      });
    }
    return r(e, [{
      key: "throwIfRequested",
      value: function value() {
        if (this.reason) throw this.reason;
      }
    }, {
      key: "subscribe",
      value: function value(e) {
        this.reason ? e(this.reason) : this._listeners ? this._listeners.push(e) : this._listeners = [e];
      }
    }, {
      key: "unsubscribe",
      value: function value(e) {
        if (this._listeners) {
          var t = this._listeners.indexOf(e);
          -1 !== t && this._listeners.splice(t, 1);
        }
      }
    }], [{
      key: "source",
      value: function value() {
        var t;
        return {
          token: new e(function (e) {
            t = e;
          }),
          cancel: t
        };
      }
    }]), e;
  }();
  var Pe = function e(t) {
    var n = new Ce(t),
      r = o(Ce.prototype.request, n);
    return P.extend(r, Ce.prototype, n, {
      allOwnKeys: !0
    }), P.extend(r, n, null, {
      allOwnKeys: !0
    }), r.create = function (n) {
      return e(Re(t, n));
    }, r;
  }(be);
  return Pe.Axios = Ce, Pe.CanceledError = re, Pe.CancelToken = Ne, Pe.isCancel = Ee, Pe.VERSION = Se, Pe.toFormData = z, Pe.AxiosError = _, Pe.Cancel = Pe.CanceledError, Pe.all = function (e) {
    return Promise.all(e);
  }, Pe.spread = function (e) {
    return function (t) {
      return e.apply(null, t);
    };
  }, Pe.isAxiosError = function (e) {
    return P.isObject(e) && !0 === e.isAxiosError;
  }, Pe.formToJSON = function (e) {
    return Z(P.isHTMLForm(e) ? new FormData(e) : e);
  }, Pe;
});
return module.exports;
}
// END GENERATED AXIOS

// The XMLHttpRequest the embedded axios runs on: Rhino's comes from the host's axios browser-libs (OkHttp), this one from
// fetch. It covers what axios' XHR adapter uses: open / setRequestHeader / send / abort, timeout, responseType (text,
// json, arraybuffer, blob), the response headers and the readystatechange / load / loadend / error / timeout / abort events
// (on* handlers run before the listeners, as in Rhino). Bodies of GET / HEAD / OPTIONS requests are dropped, except that a
// FormData body adds its string fields to the query, as Rhino's does.
function __autojs6_bun_xhr_class(fetcher = (...args) => globalThis.fetch(...args)) {
  const DATA_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
  return class XMLHttpRequest extends EventTarget {
    #method = "GET"; #url = null; #headers = new Headers(); #controller = null; #responseHeaders = null;
    constructor() {
      super();
      Object.assign(this, {responseType: "text", timeout: 0, withCredentials: false, upload: new EventTarget(),
        readyState: 0, status: 0, statusText: "", response: null, responseText: "", responseXML: null, responseURL: "",
        onreadystatechange: null, onload: null, onloadend: null, onerror: null, onabort: null, ontimeout: null});
    }
    get [Symbol.toStringTag]() { return "XMLHttpRequest"; }
    open(method, url) {
      this.#method = String(method).toUpperCase();
      this.#url = new URL(String(url));
      this.#headers = new Headers();
      this.#readyState(1);
    }
    setRequestHeader(name, value) { this.#headers.append(String(name), String(value)); }
    getResponseHeader(name) { return this.#responseHeaders?.get(String(name)) ?? null; }
    getAllResponseHeaders() {
      const headers = this.#responseHeaders;
      if (!headers) return null;
      const lines = [];
      for (const [name, value] of headers) if (name !== "set-cookie") lines.push(name + ": " + value);
      for (const value of headers.getSetCookie?.() ?? []) lines.push("set-cookie: " + value);
      return lines.join("\r\n");
    }
    overrideMimeType() {}
    abort() { this.#controller?.abort(); }
    send(body = null) {
      if (this.readyState !== 1 || this.#controller) throw new Error("XMLHttpRequest is not open");
      const controller = this.#controller = new AbortController(), url = new URL(this.#url), headers = this.#headers;
      const init = {method: this.#method, headers, redirect: "follow", signal: controller.signal};
      if (DATA_METHODS.includes(this.#method)) {
        if (body != null && typeof body === "object" && !(body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams
          || body instanceof ArrayBuffer || ArrayBuffer.isView(body) || typeof body.getReader === "function")) {
          if (!headers.has("content-type")) headers.set("content-type", "application/json");
          body = JSON.stringify(body);
        }
        // Outside a browser axios keeps its urlencoded default for FormData; the multipart body brings its own type
        // (Rhino's OkHttp body replaces the header the same way).
        if (body instanceof FormData) headers.delete("content-type");
        if (body != null) init.body = body;
      } else if (body instanceof FormData) {
        for (const [name, value] of body) if (typeof value === "string") url.searchParams.append(name, value);
      }
      let timedOut = false;
      const timer = this.timeout > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, this.timeout) : null;
      const finish = (...events) => { this.#readyState(4); for (const type of events) this.#emit(type); };
      (async () => {
        try {
          const response = await fetcher(url.href, init);
          Object.assign(this, {status: response.status, statusText: response.statusText, responseURL: response.url || url.href});
          this.#responseHeaders = response.headers;
          this.#readyState(2);
          this.#readyState(3);
          const type = String(this.responseType || "text").toLowerCase();
          if (type === "arraybuffer") this.response = await response.arrayBuffer();
          else if (type === "blob") this.response = await response.blob();
          else this.response = this.responseText = await response.text();
          clearTimeout(timer);
          finish("load", "loadend");
        } catch (error) {
          clearTimeout(timer);
          this.statusText = timedOut ? "timeout" : String(error?.message ?? error);
          if (timedOut) finish("timeout", "error", "loadend");
          else if (controller.signal.aborted) finish("abort", "loadend");
          else finish("error", "loadend");
        }
      })();
    }
    #readyState(value) { this.readyState = value; this.#emit("readystatechange"); }
    #emit(type) {
      const event = new Event(type), handler = this["on" + type];
      if (typeof handler === "function") handler.call(this, event);
      this.dispatchEvent(event);
    }
  };
}

// The global axios of Rhino scripts (api-coverage Q64 (b)): the host's axios 1.1.2 over the fetch-based XMLHttpRequest.
// axios.browser carries the browser objects axios runs on, as in Rhino. Rhino's axios.utils (java.io.File and thread pool
// helpers) and its replaced axios.defaults ({transformRequest: []}) are not reproduced: axios.defaults is the real one.
function __autojs6_bun_create_axios() {
  const XMLHttpRequest = __autojs6_bun_xhr_class(), window = {};
  const axios = __autojs6_bun_axios_library(window, XMLHttpRequest);
  return Object.assign(axios, {browser: Object.freeze({window, FormData, Blob, XMLHttpRequest, EventTarget, Event,
    setTimeout: (callback, delay) => setTimeout(callback, delay || 0)})});
}

// BEGIN GENERATED JS TOOLS
  // Shared JS tools core.
  // util, species, the global data functions, s13n, cvt / fmt bytes and jsox of AutoJs6 Rhino scripts for the Node main
  // thread, Node Workers and the Bun runtime (which syncs this section), ported from the host modules of the same names
  // and compared with Rhino on a device (AutoJs6 api-coverage P3.2a, tools/nodejs/api/js-tools). Self-contained: Workers
  // and Bun receive its source. host: { device: { sdkInt, density, densityDpi, scaledDensity }, java() (the Java facade,
  // asked for on first use), log(text), warn(text), axios() (optional, main thread) }.
  function __autojs6_create_js_tools(host) {
    function __autojs6_js_tools_jsox() {
      const BUILT_IN_EXTENSIONS = ["Mathx", "Numberx", "Arrayx"];
      const STATIC = 1;
      const PROTOTYPE = 2;
      const GLOBAL = 4;
      const BUILT_IN_ONLY = 8;
      const MIN_SAFE_INTEGER = -9007199254740991;
      const MAX_SAFE_INTEGER = 9007199254740991;
      // Kotlin Char.isWhitespace (String.trim): Java whitespace plus every space separator, no U+FEFF.
      const KOTLIN_SPACE = "[\\t-\\r\\x1c-\\x20\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]";
      const KOTLIN_TRIM = new RegExp(`^${KOTLIN_SPACE}+|${KOTLIN_SPACE}+$`, "g");
      const DECIMAL = /^\s*([+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))/;
      const PERCENT = /^([+-]?\d+(?:\.\d+)?)(%*)$/;
      const OPERATORS = new Map([
        ["<", (a, b) => a < b],
        ["<=", (a, b) => a <= b],
        [">", (a, b) => a > b],
        [">=", (a, b) => a >= b],
        ["=", (a, b) => a === b],
        ["==", (a, b) => a === b],
        ["!=", (a, b) => a !== b],
        ["<>", (a, b) => a !== b],
      ]);
      const random = Math.random;
      const sortArray = Array.prototype.sort;
      const objectToString = Object.prototype.toString;

      const isNullish = v => v === null || v === undefined;
      // A Rhino BigInt is a java.lang.Number, so the host's "is Number" checks accept it.
      const isNumber = v => typeof v === "number" || typeof v === "bigint";
      const toNumber = v => typeof v === "bigint" ? Number(v) : +v;
      const str = v => `${v}`;
      const kotlinTrim = s => s.replace(KOTLIN_TRIM, "");
      const tagOf = v => objectToString.call(v).slice(8, -1);
      const compareDouble = (a, b) => a < b ? -1 : a > b ? 1 : Object.is(a, b) ? 0 : Object.is(a, -0) ? -1 : 1;
      // Kotlin pow on ART is bionic's pow (C99 Annex F): pow(1, y) and pow(-1, +-Infinity) are 1, where Math.pow gives NaN.
      const pow = (x, y) => x === 1 || (x === -1 && (y === Infinity || y === -Infinity)) ? 1 : Math.pow(x, y);
      const own = (arr, i) => Object.hasOwn(arr, i) ? arr[i] : undefined;
      const elements = arr => Array.from({length: arr.length}, (_, i) => own(arr, i));
      const dropTrailingUndefined = args => {
        let n = args.length;
        while (n > 0 && args[n - 1] === undefined) n--;
        return args.slice(0, n);
      };

      function flattenInto(value, out) {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) if (Object.hasOwn(value, i)) flattenInto(value[i], out);
        } else {
          out.push(value);
        }
        return out;
      }

      const flatten = values => values.reduce((out, value) => flattenInto(value, out), []);

      function describe(v) {
        if (v === null) return "null";
        switch (typeof v) {
          case "number":
          case "bigint":
            return "number";
          case "object":
            return Array.isArray(v) ? "Array" : tagOf(v);
          default:
            return typeof v;
        }
      }

      const failure = (fn, cause) => `Failed to call method "${fn}": [ ${cause} ]`;
      const typeError = (fn, cause) => new TypeError(failure(fn, cause));
      const rangeError = (fn, cause) => new RangeError(failure(fn, cause));
      const argumentType = (fn, param, expected, value) => typeError(fn, `Argument "${param}" must be of type ${expected}, got ${describe(value)}`);
      const argumentCannotBe = (param, actual) => `Argument "${param}" cannot be ${actual}`;

      function arityError(fn, min, max) {
        const args = n => n === 1 ? "argument" : "arguments";
        if (max < 0) return typeError(fn, `Method only accepts no less than ${min} ${args(min)}`);
        if (min === max) return typeError(fn, `Method only accepts ${min} ${args(min)}`);
        return typeError(fn, `Method only accepts a number of arguments in the range [${min}..${max}]`);
      }

      // Argument conversions of ScriptArgs.

      function double(v, fn, param) {
        if (isNumber(v)) return Number(v);
        if (typeof v === "string") {
          const d = +v;
          if (d === d || kotlinTrim(v) === "NaN") return d;
        }
        throw argumentType(fn, param, "number", v);
      }

      function bool(v, fn, param) {
        if (typeof v === "boolean") return v;
        throw argumentType(fn, param, "boolean", v);
      }

      function list(v, fn, param) {
        if (Array.isArray(v)) return elements(v);
        throw argumentType(fn, param, "Array", v);
      }

      function array(v, fn, param) {
        if (Array.isArray(v)) return v;
        throw argumentType(fn, param, "Array", v);
      }

      function callable(v, fn, param) {
        if (typeof v === "function") return v;
        throw argumentType(fn, param, "function", v);
      }

      // Number.prototype.toFixed as a number (JsoxValues.toFixed, Rhino's DecimalFormatter: exact, half up).
      function toFixed(x, fraction) {
        const digits = Math.trunc(+fraction) || 0;
        if (digits < 0 || digits > 100) throw new RangeError(`Precision ${str(fraction)} out of range.`);
        return Number.isFinite(x) ? +x.toFixed(digits) : x;
      }

      // The global parseFloat (JsoxValues.parseFloat), independent of the global the Number extension replaces.
      function parseDecimal(s) {
        const match = DECIMAL.exec(s);
        return match ? +match[1] : NaN;
      }

      const digitOf = c => c >= 48 && c <= 57 ? c - 48 : c >= 97 && c <= 122 ? c - 87 : c >= 65 && c <= 90 ? c - 55 : 36;

      // JsoxValues.parseInt: other radixes than 10 are converted exactly, as BigInteger.toDouble.
      function parseInteger(s, radix) {
        let i = /^\s*/.exec(s)[0].length;
        const negative = s[i] === "-";
        if (s[i] === "+" || s[i] === "-") i++;
        let r = radix;
        let stripPrefix = true;
        if (r !== 0) {
          if (r < 2 || r > 36) return NaN;
          if (r !== 16) stripPrefix = false;
        } else {
          r = 10;
        }
        if (stripPrefix && i + 1 < s.length && s[i] === "0" && (s[i + 1] === "x" || s[i + 1] === "X")) {
          i += 2;
          r = 16;
        }
        const begin = i;
        while (i < s.length && digitOf(s.charCodeAt(i)) < r) i++;
        if (i === begin) return NaN;
        const digits = s.slice(begin, i);
        let value;
        if (r === 10) {
          value = +digits;
        } else {
          let big = 0n;
          for (let k = 0; k < digits.length; k++) big = big * BigInt(r) + BigInt(digitOf(digits.charCodeAt(k)));
          value = Number(big);
        }
        return negative ? -value : value;
      }

      // Mathx

      const numbersOf = values => flatten(values).map(toNumber);
      const hasNaN = values => values.some(Number.isNaN);

      function total(values) {
        let sum = 0;
        for (const x of values) sum += x;
        return sum;
      }

      const meanOf = values => total(values) / values.length;

      function squaredDeviations(values, mean) {
        let sum = 0;
        for (const x of values) {
          const d = x - mean;
          sum += d * d;
        }
        return sum;
      }

      const varianceOf = values => values.length === 0 || hasNaN(values) ? NaN : squaredDeviations(values, meanOf(values)) / values.length;

      function median(values) {
        if (values.length === 0 || hasNaN(values)) return NaN;
        const sorted = [...values].sort(compareDouble);
        const half = Math.trunc(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
      }

      function cv(values) {
        if (values.length < 2 || hasNaN(values)) return NaN;
        const mean = total(values) / values.length;
        return Math.sqrt(squaredDeviations(values, mean) / (values.length - 1)) / mean;
      }

      function mode(values) {
        if (values.length === 0 || hasNaN(values)) return NaN;
        // Kotlin Double keys: -0 and 0 are counted apart.
        const frequencies = new Map();
        for (const x of values) {
          const key = Object.is(x, -0) ? "-0" : x;
          const entry = frequencies.get(key);
          if (entry) entry[1]++;
          else frequencies.set(key, [x, 1]);
        }
        let most = 0;
        for (const [, count] of frequencies.values()) most = Math.max(most, count);
        for (const [x, count] of frequencies.values()) if (count === most) return x;
      }

      const maxOf = values => values.reduce((acc, x) => Math.max(acc, x), -Infinity);
      const minOf = values => values.reduce((acc, x) => Math.min(acc, x), Infinity);

      // Trailing undefined arguments are omitted; when every argument but the last is an array and the last is a number,
      // it is the count of fraction digits.
      function statistic(args, compute) {
        const values = dropTrailingUndefined(args);
        if (values.length >= 2) {
          const last = values[values.length - 1];
          const head = values.slice(0, -1);
          if (!isNullish(last) && !Array.isArray(last) && head.every(Array.isArray)) {
            const fraction = toNumber(last);
            if (fraction === fraction) return toFixed(compute(numbersOf(head)), fraction);
          }
        }
        return compute(numbersOf(values));
      }

      function rangeOf(fn, range) {
        const values = flatten(dropTrailingUndefined(range));
        if (values.length === 0) return null;
        if (values.length === 1) {
          const x = isNullish(values[0]) ? NaN : toNumber(values[0]);
          if (x !== x) throw argumentType(fn, "range", "number", range.length === 1 ? range[0] : values[0]);
          return x > 0 ? [0, x] : [x, 0];
        }
        let min = NaN;
        let max = NaN;
        for (const v of values) {
          const d = toNumber(v);
          if (d !== d) continue;
          if (min !== min) {
            min = d;
            max = d;
          } else {
            min = Math.min(min, d);
            max = Math.max(max, d);
          }
        }
        if (min !== min) throw rangeError(fn, `Argument "range" contains no valid number`);
        return [min, max];
      }

      function randomIntIn(fn, low, high) {
        const min = Math.ceil(low);
        const max = Math.floor(high);
        if (min > max) throw rangeError(fn, `No integer lies within the range [${low}, ${high}]`);
        return Math.floor(random() * (max - min + 1)) + min;
      }

      function randomInt(fn, range) {
        const bounds = rangeOf(fn, range);
        return bounds ? randomIntIn(fn, bounds[0], bounds[1]) : randomIntIn(fn, MIN_SAFE_INTEGER, MAX_SAFE_INTEGER);
      }

      function randomFloat(fn, range) {
        const bounds = rangeOf(fn, range);
        return bounds ? random() * (bounds[1] - bounds[0]) + bounds[0] : random();
      }

      function coordinates(x, y) {
        const nx = isNullish(x) ? NaN : toNumber(x);
        const ny = isNullish(y) ? NaN : toNumber(y);
        return nx !== nx || ny !== ny ? null : [nx, ny];
      }

      function pointOf(o, param) {
        let point = null;
        if (Array.isArray(o)) {
          if (o.length !== 2) throw typeError("Mathx.dist", `Argument "${param}" must have a length of 2, got ${o.length}`);
          point = coordinates(own(o, 0), own(o, 1));
        } else if (o !== null && typeof o === "object" && tagOf(o) === "Object") {
          point = coordinates(o.x, o.y);
        }
        if (!point) throw argumentType("Mathx.dist", param, "point ([x, y], { x, y }, Point or Rect)", o);
        return point;
      }

      function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
      }

      function dist(args) {
        const points = dropTrailingUndefined([args[0], args[1], args[2]]);
        switch (points.length) {
          case 0:
            return NaN;
          case 1:
            throw argumentType("Mathx.dist", "pointA", "android.graphics.Rect", points[0]);
          case 2:
            return distance(pointOf(points[0], "pointA"), pointOf(points[1], "pointB"));
          default:
            return toFixed(distance(pointOf(points[0], "pointA"), pointOf(points[1], "pointB")), points[2]);
        }
      }

      function logMn(base, antilogarithm, fraction) {
        let digits = 13;
        if (!isNullish(fraction)) {
          digits = toNumber(fraction);
          if (digits !== digits) throw argumentType("Mathx.logMn", "fraction", "number", fraction);
        }
        return toFixed(Math.log(antilogarithm) / Math.log(base), digits);
      }

      // f(base, logarithm with 13 fraction digits); a base or antilogarithm that is NaN is a RangeError.
      function logarithm(fn, args, f) {
        const base = double(args[0], fn, "base");
        const antilogarithm = double(args[1], fn, "antilogarithm");
        if (base !== base) throw rangeError(fn, argumentCannotBe("base", "NaN"));
        if (antilogarithm !== antilogarithm) throw rangeError(fn, argumentCannotBe("antilogarithm", "NaN"));
        return f(base, logMn(base, antilogarithm, null));
      }

      // Java Math.round gives a long, so never -0.
      const round = x => Number.isFinite(x) ? Math.round(x) + 0 : x;

      // Arrayx

      const sameZero = (a, b) => a === b || (a !== a && b !== b);

      function distinctValues(values) {
        const seen = new Set();
        return values.filter(v => !seen.has(v) && seen.add(v));
      }

      // ">" / "<", then the string forms (ArrayxModule.compare).
      function compare(a, b) {
        if (a > b) return 1;
        if (a < b) return -1;
        if (Object.is(a, b)) return 0;
        const sa = str(a);
        const sb = str(b);
        return sa > sb ? 1 : sa < sb ? -1 : 0;
      }

      function comparator(selector, descending) {
        return (a, b) => {
          if (selector) {
            a = selector.call(undefined, a);
            b = selector.call(undefined, b);
          }
          return descending ? compare(b, a) : compare(a, b);
        };
      }

      function sort(arr, cmp) {
        sortArray.call(arr, cmp);
        return arr;
      }

      function union(args, fn) {
        const values = list(args[0], fn, "arr");
        for (const other of args.slice(1)) {
          if (Array.isArray(other)) values.push(...elements(other));
          else values.push(other);
        }
        return distinctValues(values);
      }

      function intersect(args, fn) {
        const arr = list(args[0], fn, "arr");
        const others = args.slice(1);
        if (arr.length === 0 || others.length === 0) return [];
        return distinctValues(arr).filter(candidate => others.every(other => (
          Array.isArray(other) ? elements(other).some(e => sameZero(candidate, e)) : candidate === other
        )));
      }

      function differ(args, fn) {
        const arr = list(args[0], fn, "arr");
        const other = list(args[1], fn, "other");
        const inArr = new Set(arr);
        const inOther = new Set(other);
        return distinctValues([...distinctValues(arr).filter(x => !inOther.has(x)), ...distinctValues(other).filter(x => !inArr.has(x))]);
      }

      function sortedBy(args, fn, descending) {
        const copy = list(args[0], fn, "arr");
        const selector = callable(args[1], fn, "selector");
        return copy.length < 2 ? copy : sort(copy, comparator(selector, descending));
      }

      function sortBy(args, fn, descending) {
        const arr = array(args[0], fn, "arr");
        const selector = callable(args[1], fn, "selector");
        return arr.length < 2 ? arr : sort(arr, comparator(selector, descending));
      }

      // Numberx

      function parsePercent(percentage) {
        if (isNullish(percentage)) return NaN;
        if (isNumber(percentage)) return Number(percentage);
        const match = PERCENT.exec(str(percentage).replace(/\s/g, ""));
        return match ? +match[1] / pow(100, match[2].length) : NaN;
      }

      function parseRatio(ratio) {
        if (isNullish(ratio)) return NaN;
        const parts = kotlinTrim(str(ratio)).split(":").map(kotlinTrim);
        return parts.length < 2 ? NaN : parseDecimal(parts[0]) / parseDecimal(parts[1]);
      }

      function parseAny(o) {
        if (isNullish(o)) return NaN;
        if (isNumber(o)) return Number(o);
        const text = kotlinTrim(str(o));
        if (text.includes(":")) return parseRatio(text);
        if (text.includes("%")) return parsePercent(text);
        return +text;
      }

      function parseFloatRadix(string, radix) {
        if (string === null) return NaN;
        let text = str(string);
        if (isNullish(radix)) return parseDecimal(text);
        let r = numberLike("Numberx.parseFloat", "radix", radix, true);
        if (!Number.isFinite(r)) r = 10;
        const parts = text.split(".");
        let fractionLength = 0;
        if (parts.length > 1) {
          text = parts.join("");
          fractionLength = parts[1].length;
        }
        return parseInteger(text, Math.round(r)) / pow(r, fractionLength);
      }

      function numberLike(fn, param, value, allowNaN) {
        if (isNullish(value)) throw typeError(fn, argumentCannotBe(param, describe(value)));
        if (typeof value === "number" && value !== value) {
          if (!allowNaN) throw rangeError(fn, argumentCannotBe(param, "NaN"));
          return NaN;
        }
        const x = parseAny(value);
        if (x !== x) throw argumentType(fn, param, "number", value);
        return x;
      }

      function check(values) {
        switch (values.length) {
          case 0:
            return false;
          case 1:
            return isNumber(values[0]);
          case 2:
            return isNumber(values[0]) && isNumber(values[1]) && Number(values[0]) === Number(values[1]);
        }
        for (let i = 1; i < values.length; i += 2) {
          const operator = typeof values[i] === "string" ? OPERATORS.get(values[i]) : undefined;
          if (!operator) {
            throw argumentType("Numberx.check", `numOrOpr[${i}]`, `comparison operator (${[...OPERATORS.keys()].join(", ")})`, values[i]);
          }
          const a = numberLike("Numberx.check", `numOrOpr[${i - 1}]`, values[i - 1], false);
          const b = numberLike("Numberx.check", `numOrOpr[${i + 1}]`, i + 1 < values.length ? values[i + 1] : null, false);
          if (!operator(a, b)) return false;
        }
        return true;
      }

      const bounds = values => flatten(values)
        .map(v => isNumber(v) ? Number(v) : typeof v === "string" ? parseAny(v) : toNumber(v))
        .filter(x => x === x)
        .sort(compareDouble);

      function clamp(args, fn) {
        const x = numberLike(fn, "num", args[0], false);
        const b = bounds(args.slice(1));
        if (b.length === 0) return x;
        const min = b[0];
        const max = b[b.length - 1];
        return x < min ? min : x > max ? max : x;
      }

      function clampTo(args, n, fn) {
        const range = list(args[1], fn, "range");
        const x = numberLike(fn, "num", args[0], false);
        const b = bounds(range);
        if (b.length === 0) return x;
        const min = b[0];
        const max = b[b.length - 1];
        const cycle = n > 2 ? args[2] : null;
        const t = isNullish(cycle) ? max - min : numberLike(fn, "cycle", cycle, false);
        if (!(t > 0)) throw rangeError(fn, `Argument "cycle" must be a positive number, got ${t}`);
        if (x < min) return x + Math.ceil((min - x) / t) * t;
        if (x > max) return x - Math.ceil((x - max) / t) * t;
        return x;
      }

      function pad(fn, num, targetLength, filler, start) {
        const length = toNumber(targetLength);
        if (!Number.isFinite(length)) throw argumentType(fn, "targetLength", "number", targetLength);
        const padString = isNullish(filler) ? "0" : isNumber(filler) ? str(Number(filler)) : str(filler);
        const text = str(parseAny(num));
        const target = length <= 0 ? 0 : Math.trunc(Math.min(length, 2147483647));
        if (text.length >= target || padString.length === 0) return text;
        const missing = target - text.length;
        const padding = padString.repeat(Math.trunc(missing / padString.length)) + padString.slice(0, missing % padString.length);
        return start ? padding + text : text + padding;
      }

      function ensureNumbersLike(args, n, fn) {
        const values = list(args[0], fn, "values");
        const allowNaN = n > 1 && bool(args[1], fn, "allowNaN");
        const containsNaN = n > 2 && bool(args[2], fn, "containsNaN");
        const result = [];
        values.forEach((value, index) => {
          const x = numberLike(fn, `values[${index}]`, value, allowNaN);
          if (x === x || containsNaN) result.push(x);
        });
        return result;
      }

      // Members in declaration order: [name, min, max (-1: no limit), body(args, n, function name), built-in flags]; the
      // data properties (Numberx.ICU) are static members of the built-in as well.
      const MODULES = {
        Mathx: {
          builtIn: "Math",
          data: [],
          functions: [
            ["randInt", 0, -1, (a, n, fn) => randomInt(fn, a), STATIC],
            ["randomInt", 0, -1, (a, n, fn) => randomInt(fn, a), STATIC],
            ["randFloat", 0, -1, (a, n, fn) => randomFloat(fn, a), STATIC],
            ["randomFloat", 0, -1, (a, n, fn) => randomFloat(fn, a), STATIC],
            ["random", 0, -1, (a, n, fn) => randomFloat(fn, a), STATIC],
            ["sum", 0, -1, a => statistic(a, values => values.length === 0 ? NaN : total(values)), STATIC],
            ["mean", 0, -1, a => statistic(a, meanOf), STATIC],
            ["avg", 0, -1, a => statistic(a, meanOf), STATIC],
            ["median", 0, -1, a => statistic(a, median), STATIC],
            ["var", 0, -1, a => statistic(a, varianceOf), STATIC],
            ["std", 0, -1, a => statistic(a, values => Math.sqrt(varianceOf(values))), STATIC],
            ["cv", 0, -1, a => statistic(a, cv), STATIC],
            ["mode", 0, -1, a => statistic(a, mode), STATIC],
            ["dist", 0, 3, dist, STATIC],
            ["logMn", 2, 3, (a, n, fn) => logMn(double(a[0], fn, "base"), double(a[1], fn, "antilogarithm"), n > 2 ? a[2] : null), STATIC],
            ["floorLog", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => Math.floor(x)), STATIC],
            ["ceilLog", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => Math.ceil(x)), STATIC],
            ["roundLog", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => round(x)), STATIC],
            ["floorPow", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => pow(base, Math.floor(x))), STATIC],
            ["ceilPow", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => pow(base, Math.ceil(x))), STATIC],
            ["roundPow", 2, 2, (a, n, fn) => logarithm(fn, a, (base, x) => pow(base, round(x))), STATIC],
            ["max", 0, -1, a => statistic(a, maxOf), 0],
            ["maxi", 0, -1, a => statistic(a, maxOf), STATIC | BUILT_IN_ONLY],
            ["min", 0, -1, a => statistic(a, minOf), 0],
            ["mini", 0, -1, a => statistic(a, minOf), STATIC | BUILT_IN_ONLY],
          ],
        },
        Numberx: {
          builtIn: "Number",
          data: [["ICU", 996]],
          functions: [
            ["ensureNumber", 0, -1, (a, n, fn) => {
              for (const o of a) if (!isNumber(o)) throw argumentType(fn, "o", "number", o);
            }, STATIC],
            ["ensureNumberLike", 1, 2, (a, n, fn) => numberLike(fn, "value", a[0], n > 1 && bool(a[1], fn, "allowNaN")), STATIC],
            ["ensureNumbersLike", 1, 3, ensureNumbersLike, STATIC],
            ["check", 0, -1, check, STATIC],
            ["clamp", 1, -1, (a, n, fn) => clamp(a, fn), PROTOTYPE],
            ["clampTo", 2, 3, clampTo, PROTOTYPE],
            ["toFixedNum", 1, 2, (a, n) => toFixed(parseAny(a[0]), n > 1 ? a[1] : 0), PROTOTYPE],
            ["padStart", 2, 3, (a, n, fn) => pad(fn, a[0], a[1], n > 2 ? a[2] : null, true), PROTOTYPE],
            ["padEnd", 2, 3, (a, n, fn) => pad(fn, a[0], a[1], n > 2 ? a[2] : null, false), PROTOTYPE],
            ["parseFloat", 1, 2, (a, n) => parseFloatRadix(a[0], n > 1 ? a[1] : null), STATIC | GLOBAL],
            ["parsePercent", 1, 1, a => parsePercent(a[0]), STATIC],
            ["parseRatio", 1, 1, a => parseRatio(a[0]), STATIC],
            ["parseAny", 1, 1, a => parseAny(a[0]), STATIC],
          ],
        },
        Arrayx: {
          builtIn: "Array",
          data: [],
          functions: [
            ["ensureArray", 0, -1, (a, n, fn) => {
              for (const o of a) if (!Array.isArray(o)) throw argumentType(fn, "o", "Array", o);
            }, STATIC],
            ["distinct", 1, 1, (a, n, fn) => distinctValues(list(a[0], fn, "arr")), PROTOTYPE],
            ["distinctBy", 2, 2, (a, n, fn) => {
              const arr = list(a[0], fn, "arr");
              const selector = callable(a[1], fn, "selector");
              const keys = new Set();
              return arr.filter(element => {
                const key = selector.call(undefined, element);
                return !keys.has(key) && keys.add(key);
              });
            }, PROTOTYPE],
            ["union", 1, -1, (a, n, fn) => union(a, fn), PROTOTYPE],
            ["intersect", 1, -1, (a, n, fn) => intersect(a, fn), PROTOTYPE],
            ["subtract", 2, 2, (a, n, fn) => {
              const arr = list(a[0], fn, "arr");
              const other = new Set(list(a[1], fn, "other"));
              return distinctValues(arr).filter(x => !other.has(x));
            }, PROTOTYPE],
            ["differ", 2, 2, (a, n, fn) => differ(a, fn), PROTOTYPE],
            ["sortBy", 2, 2, (a, n, fn) => sortBy(a, fn, false), PROTOTYPE],
            ["sortByDescending", 2, 2, (a, n, fn) => sortBy(a, fn, true), PROTOTYPE],
            ["sortDescending", 1, 1, (a, n, fn) => sort(array(a[0], fn, "arr"), comparator(null, true)), PROTOTYPE],
            ["sorted", 1, 1, (a, n, fn) => sort(list(a[0], fn, "arr"), comparator(null, false)), PROTOTYPE],
            ["sortedDescending", 1, 1, (a, n, fn) => sort(list(a[0], fn, "arr"), comparator(null, true)), PROTOTYPE],
            ["sortedBy", 2, 2, (a, n, fn) => sortedBy(a, fn, false), PROTOTYPE],
            ["sortedByDescending", 2, 2, (a, n, fn) => sortedBy(a, fn, true), PROTOTYPE],
            ["shuffle", 1, 1, (a, n, fn) => sort(array(a[0], fn, "arr"), () => random() < 0.5 ? 1 : -1), PROTOTYPE],
          ],
        },
      };

      // Script module layer: trailing undefined arguments beyond the required ones count as omitted (ScriptArgs.count).
      function invoker(fn, min, max, body) {
        return args => {
          let n = args.length;
          while (n > min && args[n - 1] === undefined) n--;
          if (n < min || (max >= 0 && n > max)) throw arityError(fn, min, max);
          return body(args, n, fn);
        };
      }

      const named = (f, name, length) => Object.defineProperties(f, {name: {value: name}, length: {value: length}});
      const scriptFunction = (name, length, invoke) => named((...args) => invoke(args), name, length);
      // The primitive value of a Number, String or Boolean receiver, as ScriptBuiltInExtender.receiverOf.
      function receiverOf(o) {
        if (o === null || typeof o !== "object") return o;
        switch (tagOf(o)) {
          case "Number":
            return Number(o);
          case "String":
            return String(o);
          case "Boolean":
            return Boolean(o);
          default:
            return o;
        }
      }

      // As the host: a "prototype" object whose "constructor" is the function, both DONTENUM (so still configurable).
      function prototypeFunction(name, length, invoke) {
        const f = named({
          [name](...args) {
            return invoke([receiverOf(this), ...args]);
          },
        }[name], name, length);
        const hidden = value => ({value, writable: true, enumerable: false, configurable: true});
        return Object.defineProperty(f, "prototype", hidden(Object.defineProperty({}, "constructor", hidden(f))));
      }
      // ScriptAttributes.PERMANENT: writable and enumerable, not configurable.
      const define = (target, name, value) => Object.defineProperty(target, name, {value, writable: true, enumerable: true, configurable: false});

      function moduleObject(moduleName) {
        const spec = MODULES[moduleName];
        const obj = {};
        for (const [name, value] of spec.data) define(obj, name, value);
        for (const [name, min, max, body, flags] of spec.functions) {
          if (!(flags & BUILT_IN_ONLY)) define(obj, name, scriptFunction(name, min, invoker(`${moduleName}.${name}`, min, max, body)));
        }
        return obj;
      }

      // ScriptBuiltInExtender.extend: data properties, then static, prototype and global functions, each a new function.
      function extendBuiltIn(moduleName) {
        const spec = MODULES[moduleName];
        const target = globalThis[spec.builtIn];
        for (const [name, value] of spec.data) define(target, name, value);
        const functions = spec.functions.map(([name, min, max, body, flags]) => ({name, min, flags, invoke: invoker(`${moduleName}.${name}`, min, max, body)}));
        for (const f of functions) if (f.flags & STATIC) define(target, f.name, scriptFunction(f.name, f.min, f.invoke));
        for (const f of functions) if (f.flags & PROTOTYPE) define(target.prototype, f.name, prototypeFunction(f.name, Math.max(0, f.min - 1), f.invoke));
        for (const f of functions) if (f.flags & GLOBAL) define(globalThis, f.name, scriptFunction(f.name, f.min, f.invoke));
      }

      function extendAll() {
        for (const name of BUILT_IN_EXTENSIONS) extendBuiltIn(name);
      }

      // Names, arrays or nested arrays; "Math" or "mathx" alike. Names before an unknown one are already applied.
      function extendNamed(fn, modules) {
        const names = [...new Set(flatten(modules).map(str))];
        if (names.length === 0) return extendAll();
        for (const name of names) {
          const suffixed = `${name.endsWith("x") ? name.slice(0, -1) : name}x`;
          const module = suffixed.charAt(0).toUpperCase() + suffixed.slice(1);
          if (!BUILT_IN_EXTENSIONS.includes(module)) {
            throw rangeError(fn, `Unknown built-in object extension "${name}", expected one of ${BUILT_IN_EXTENSIONS.join(", ")}`);
          }
          extendBuiltIn(module);
        }
      }

      const jsox = scriptFunction("jsox", 0, invoker("jsox", 0, -1, (a, n, fn) => extendNamed(fn, a)));
      define(jsox, "extend", scriptFunction("extend", 0, invoker("jsox.extend", 0, -1, (a, n, fn) => extendNamed(fn, a))));
      define(jsox, "extendAll", scriptFunction("extendAll", 0, invoker("jsox.extendAll", 0, 0, extendAll)));

      return {Mathx: moduleObject("Mathx"), Arrayx: moduleObject("Arrayx"), Numberx: moduleObject("Numberx"), jsox};
    }
    function __autojs6_js_tools_bytes() {
      const UNITS = "KMGTPEZYRQ";
      const AUTO = "AUTO";
      const IEC = 1024n;
      const SI = 1000n;
      const MAX_SAFE = 9007199254740991n;
      const LONG_MAX = (1n << 63n) - 1n;
      const LONG_MIN = -(1n << 63n);

      // Android's ICU regex: \d is \p{Nd}, \s is [\t\n\f\r\p{Z}]
      const SOURCE_TEXT = /^([0-9]+(?:\.[0-9]+)?)[\t\n\f\r\p{Z}]*([A-Za-z]*)$/u;
      const TIME_TEXT_SPACES = /[\t\n\f\r\p{Z}]+(?!\p{Nd})|(^|\P{Nd})[\t\n\f\r\p{Z}]+/gu;
      const TIME_UNITS = [
        [/^NANO(?:SECONDS?|S)?$/iu, 1n],
        [/^MICRO(?:SECONDS?|S)?$/iu, 1000n],
        [/^(?:MILLI(?:SECONDS?|S)?|MS)$/iu, 1000000n],
        [/^(?:S(?:ECONDS?)?|SECS?)$/iu, 1000000000n],
        [/^(?:M(?:INUTES?)?|MINS?)$/iu, 60000000000n],
        [/^(?:H(?:OURS?)?|HRS?)$/iu, 3600000000000n],
        [/^D(?:AYS?)?$/iu, 86400000000000n],
      ];
      // ColorTable (Android, Css, Web, Material; the first class defining a name wins), names without underscores
      const COLOR_TABLE = `
        aqua 00ffff black 000000 blue 0000ff cyan 00ffff darkgray 444444 darkgrey 444444 dkgray 444444 fuchsia ff00ff
        gray 888888 green 00ff00 grey 888888 lightgray cccccc lightgrey cccccc lime 00ff00 ltgray cccccc magenta ff00ff
        maroon 800000 navy 000080 olive 808000 purple 800080 red ff0000 silver c0c0c0 teal 008080 transparent 00000000
        white ffffff yellow ffff00 aliceblue f0f8ff antiquewhite faebd7 aquamarine 7fffd4 azure f0ffff beige f5f5dc
        bisque ffe4c4 blanchedalmond ffebcd blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0
        chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c
        darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgreen 006400 darkkhaki bdb76b darkmagenta 8b008b
        darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f
        darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3
        deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222
        floralwhite fffaf0 forestgreen 228b22 gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520
        greenyellow adff2f honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c
        lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080
        lightcyan e0ffff lightgoldenrodyellow fafad2 lightgreen 90ee90 lightpink ffb6c1 lightsalmon ffa07a
        lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de
        lightyellow ffffe0 limegreen 32cd32 linen faf0e6 mediumaquamarine 66cdaa mediumblue 0000cd
        mediumlavendermagenta dda0dd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371
        mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585
        midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead oldlace fdf5e6
        olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98
        paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 patriarch 800080 peachpuff ffdab9 peru cd853f
        pink ffc0cb powderblue b0e0e6 rebeccapurple 663399 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513
        salmon fa8072 sandbrown f4a460 seashell fff5ee seagreen 2e8b57 sienna a0522d skyblue 87ceeb slateblue 6a5acd
        slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c thistle d8bfd8
        tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 whitesmoke f5f5f5 yellowgreen 9acd32
        alizarincrimson e32636 amber ffbf00 amethyst 9966cc applegreen 8ce600 apricot e69966 aquablue 66ffe6
        babyblue 89cff0 babypink ffd9e6 brightgreen 66ff00 bronze cd7f32 burgundy 800020 burntorange cc5500 camel a16b47
        camellia e63995 canaryyellow ffef00 cardinalred 990036 carmine e6005c celadon ace1af cerise de3163
        ceruleanblue 2a52be champagneyellow ffff99 chromeyellow e6b800 clematis cca3cc cobaltblue 0047ab
        cobaltgreen 66ff59 coconutbrown 4d1f00 coffee 4d3900 coralpink ff80bf cream fffdd0 cyanblue 0dbf8c
        darkmineralblue 24367d darkpowderblue 003399 emerald 50c878 flamingo e68ab8 foliagegreen 73b839
        freshleaves 99ff4d golden ffd700 grassgreen 99e64d grayishpurple 8674a1 heliotrope df73ff honeyorange ffb366
        horizonblue b8ddc8 internationalkleinblue 002fa7 irongray 625b57 ivygreen 36bf36 jasmine e6c35c
        lapislazuli 26619c lavenderblue ccccff lavendermagenta ee82ee lavendermist e6e6fa lightkhaki f0e68c
        lightlime ccff00 lightviolet b09db9 lilac c8a2c8 magentarose ff0da6 malachite 22c32e mallow d94dff
        marigold ff9900 marineblue 00477d mauve e0b0ff mimosa e6d933 mineralblue 004d99 mineralviolet a39dae mint 16982b
        moonyellow ffff4d mossgreen 697723 mustard cccc4d navyblue 000080 ocher cc7722 oldrose c08081 operamauve b784a7
        paillilac e6cfe6 paleblue d1edf2 paledenim 5e86c1 paleochre ccb38c pansy 7400a1 peach ffe5b4 peachpearl fbbea1
        peacockblue 00808c peacockgreen 00a15c pearlpink ffb3e6 periwinkle ccccff persimmon ff4d40 plum 8e4585
        prussianblue 003153 rose ff007f rosepink ff66cc ruby cc0080 salmonpink ff8099 salviablue 4d80e6 sandbeige e6c3c3
        sapphire 082567 saxeblue 4798b3 scarlet ff2400 sepia 704214 shellpink ffb3bf spinelred ff73b3 strongblue 006374
        strongred e60000 sunorange ff7300 tangerine f28500 tangerineyellow ffcc00 tropicalorange ff8033
        turquoiseblue 00ffef turquoisegreen 4de680 ultramarine 0033ff vermilion e34234 verylightmalachitegreen 73e68c
        viridian 127436 wedgwoodblue 5686bf wisteria c9a0dc amber100 ffecb3 amber200 ffe082 amber300 ffd54f
        amber400 ffca28 amber50 fff8e1 amber500 ffc107 amber600 ffb300 amber700 ffa000 amber800 ff8f00 amber900 ff6f00
        ambera100 ffe57f ambera200 ffd740 ambera400 ffc400 ambera700 ffab00 black1000 000000 blue100 bbdefb
        blue200 90caf9 blue300 64b5f6 blue400 42a5f5 blue50 e3f2fd blue500 2196f3 blue600 1e88e5 blue700 1976d2
        blue800 1565c0 blue900 0d47a1 bluea100 82b1ff bluea200 448aff bluea400 2979ff bluea700 2962ff bluegray 607d8b
        bluegray100 cfd8dc bluegray200 b0bbc5 bluegray300 90a4ae bluegray400 78909c bluegray50 eceff1 bluegray500 607d8b
        bluegray600 546e7a bluegray700 455a64 bluegray800 37474f bluegray900 263238 bluegrey 607d8b bluegrey100 cfd8dc
        bluegrey200 b0bbc5 bluegrey300 90a4ae bluegrey400 78909c bluegrey50 eceff1 bluegrey500 607d8b bluegrey600 546e7a
        bluegrey700 455a64 bluegrey800 37474f bluegrey900 263238 brown100 d7ccc8 brown200 bcaaa4 brown300 a1887f
        brown400 8d6e63 brown50 efebe9 brown500 795548 brown600 6d4c41 brown700 5d4037 brown800 4e342e brown900 3e2723
        cyan100 b2ebf2 cyan200 80deea cyan300 4dd0e1 cyan400 26c6da cyan50 e0f7fa cyan500 00bcd4 cyan600 00acc1
        cyan700 0097a7 cyan800 00838f cyan900 006064 cyana100 84ffff cyana200 18ffff cyana400 00e5ff cyana700 00b8d4
        deeporange ff5722 deeporange100 ffccbc deeporange200 ffab91 deeporange300 ff8a65 deeporange400 ff7043
        deeporange50 fbe9a7 deeporange500 ff5722 deeporange600 f4511e deeporange700 e64a19 deeporange800 d84315
        deeporange900 bf360c deeporangea100 ff9e80 deeporangea200 ff6e40 deeporangea400 ff3d00 deeporangea700 dd2600
        deeppurple 673ab7 deeppurple100 d1c4e9 deeppurple200 b39ddb deeppurple300 9575cd deeppurple400 7e57c2
        deeppurple50 ede7f6 deeppurple500 673ab7 deeppurple600 5e35b1 deeppurple700 512da8 deeppurple800 4527a0
        deeppurple900 311b92 deeppurplea100 b388ff deeppurplea200 7c4dff deeppurplea400 651fff deeppurplea700 6200ea
        gray100 f5f5f5 gray200 eeeeee gray300 e0e0e0 gray400 bdbdbd gray50 fafafa gray500 9e9e9e gray600 757575
        gray700 616161 gray800 424242 gray900 212121 green100 c8e6c9 green200 a5d6a7 green300 81c784 green400 66bb6a
        green50 e8f5e9 green500 4caf50 green600 43a047 green700 388e3c green800 2e7d32 green900 1b5e20 greena100 b9f6ca
        greena200 69f0ae greena400 00e676 greena700 00c853 grey100 f5f5f5 grey200 eeeeee grey300 e0e0e0 grey400 bdbdbd
        grey50 fafafa grey500 9e9e9e grey600 757575 grey700 616161 grey800 424242 grey900 212121 indigo100 c5cae9
        indigo200 9fa8da indigo300 7986cb indigo400 5c6bc0 indigo50 e8eaf6 indigo500 3f51b5 indigo600 3949ab
        indigo700 303f9f indigo800 283593 indigo900 1a237e indigoa100 8c9eff indigoa200 536dfe indigoa400 3d5afe
        indigoa700 304ffe lightblue100 b3e5fc lightblue200 81d4fa lightblue300 4fc3f7 lightblue400 29b6fc
        lightblue50 e1f5fe lightblue500 03a9f4 lightblue600 039be5 lightblue700 0288d1 lightblue800 0277bd
        lightblue900 01579b lightbluea100 80d8ff lightbluea200 40c4ff lightbluea400 00b0ff lightbluea700 0091ea
        lightgreen100 dcedc8 lightgreen200 c5e1a5 lightgreen300 aed581 lightgreen400 9ccc65 lightgreen50 f1f8e9
        lightgreen500 8bc34a lightgreen600 7cb342 lightgreen700 689f38 lightgreen800 558b2f lightgreen900 33691e
        lightgreena100 ccff90 lightgreena200 b2ff59 lightgreena400 76ff03 lightgreena700 64dd17 lime100 f0f4c3
        lime200 e6ee9c lime300 dce775 lime400 d4e157 lime50 f9fbe7 lime500 cddc39 lime600 c0ca33 lime700 a4b42b
        lime800 9e9d24 lime900 827717 limea100 f4ff81 limea200 eeff41 limea400 c6ff00 limea700 aeea00 orange100 ffe0b2
        orange200 ffcc80 orange300 ffb74d orange400 ffa726 orange50 fff3e0 orange500 ff9800 orange600 fb8c00
        orange700 f57c00 orange800 ef6c00 orange900 e65100 orangea100 ffd180 orangea200 ffab40 orangea400 ff9100
        orangea700 ff6d00 pink100 f8bbd0 pink200 f48fb1 pink300 f06292 pink400 ec407a pink50 fce4ec pink500 e91e63
        pink600 d81b60 pink700 c2185b pink800 ad1457 pink900 880e4f pinka100 ff80ab pinka200 ff4081 pinka400 f50057
        pinka700 c51162 purple100 e1bee7 purple200 ce93d8 purple300 ba68c8 purple400 ab47bc purple50 f3e5f5
        purple500 9c27b0 purple600 8e24aa purple700 7b1fa2 purple800 6a1b9a purple900 4a148c purplea100 ea80fc
        purplea200 e040fb purplea400 d500f9 purplea700 aa00ff red100 ffcdd2 red200 ef9a9a red300 e57373 red400 ef5350
        red50 ffebee red500 f44336 red600 e53935 red700 d32f2f red800 c62828 red900 b71c1c reda100 ff8a80 reda200 ff5252
        reda400 ff1744 reda700 d50000 teal100 b2dfdb teal200 80cbc4 teal300 4db6ac teal400 26a69a teal50 e0f2f1
        teal500 009688 teal600 00897b teal700 00796b teal800 00695c teal900 004d40 teala100 a7ffeb teala200 64ffda
        teala400 1de9b6 teala700 00bfa5 white1000 ffffff yellow100 fff9c4 yellow200 fff590 yellow300 fff176
        yellow400 ffee58 yellow50 fffde7 yellow500 ffeb3b yellow600 fdd835 yellow700 fbc02d yellow800 f9a825
        yellow900 f57f17 yellowa100 ffff82 yellowa200 ffff00 yellowa400 ffea00 yellowa700 ffd600
      `;
      let colorNames = null;

      const nullish = (value) => value === undefined || value === null;
      const describe = (value) => {
        if (value === null) return "null";
        if (Array.isArray(value)) return "Array";
        if (typeof value === "object") return Object.prototype.toString.call(value).slice(8, -1);
        return typeof value === "bigint" ? "number" : typeof value;
      };
      const failed = (fn, cause) => `Failed to call method "${fn}": [ ${cause} ]`;
      const typeError = (fn, cause) => new TypeError(failed(fn, cause));
      const rangeError = (fn, cause) => new RangeError(failed(fn, cause));
      const cannotBe = (param, actual) => `Argument "${param}" cannot be ${actual}`;
      const mustBe = (param, expected, value) => `Argument "${param}" must be of type ${expected}, got ${describe(value)}`;
      const plural = (n) => `${n} argument${n === 1 ? "" : "s"}`;
      const arityText = (min, max) => max < 0 ? `Method only accepts no less than ${plural(min)}`
        : min === max ? `Method only accepts ${plural(min)}` : `Method only accepts a number of arguments in the range [${min}..${max}]`;
      // ScriptArgs.count: trailing undefined arguments beyond the required ones count as omitted
      const arity = (fn, args, min, max) => {
        let n = args.length;
        while (n > min && args[n - 1] === undefined) n--;
        if (n < min || (max >= 0 && n > max)) throw typeError(fn, arityText(min, max));
      };
      // Kotlin String.trim (Char.isWhitespace)
      const trim = (text) => text.replace(/^[\t-\r\x1c-\x1f\p{Z}]+|[\t-\r\x1c-\x1f\p{Z}]+$/gu, "");
      const textOf = (value, fallback) => nullish(value) ? fallback : `${value}`;
      // Kotlin Double.toLong
      const toLong = (d) => Number.isNaN(d) ? 0n : d >= 2 ** 63 ? LONG_MAX : d <= -(2 ** 63) ? LONG_MIN : BigInt(Math.trunc(d));

      // The decimal value of Java's Double.toString(d) (the FloatingDecimal.dtoa of OpenJDK 8 - 18 in Android's libcore),
      // which BigDecimal.valueOf(d) reads: [digits, exponent] for digits * 10^exponent, d > 0. It differs from the shortest
      // Number#toString for many doubles, e.g. 2^60 is 1152921504606846980.
      const javaDecimal = (d) => {
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, d);
        const raw = view.getBigUint64(0);
        let fract = raw & 0xfffffffffffffn;
        let binExp = Number((raw >> 52n) & 0x7ffn);
        let nSignificantBits = 53;
        if (binExp === 0) {
          const leadingZeros = 64 - fract.toString(2).length;
          fract <<= BigInt(leadingZeros - 11);
          binExp = 12 - leadingZeros;
          nSignificantBits = 64 - leadingZeros;
        } else {
          fract |= 1n << 52n;
        }
        binExp -= 1023;
        const binary = fract.toString(2);
        const tailZeros = binary.length - 1 - binary.lastIndexOf("1");
        const nFractBits = 53 - tailZeros;
        const nTinyBits = Math.max(0, nFractBits - binExp - 1);
        if (nTinyBits === 0 && binExp <= 62) {
          const insignificant = binExp > nSignificantBits ? [0, 0, 0, 0, 1, 1, 1, 2, 2][binExp - nSignificantBits - 1] : 0;
          let value = binExp >= 52 ? fract << BigInt(binExp - 52) : fract >> BigInt(52 - binExp);
          if (insignificant > 0) {
            const unit = 10n ** BigInt(insignificant);
            value = value / unit + (value % unit >= unit / 2n ? 1n : 0n);
          }
          return [value, insignificant];
        }
        const d2 = 1 + Number(fract & 0xfffffffffffffn) / 2 ** 52;
        let decExp = Math.floor((d2 - 1.5) * 0.289529654 + 0.176091259 + binExp * 0.301029995663981) | 0;
        const B5 = Math.max(0, -decExp);
        const S5 = Math.max(0, decExp);
        let B2 = B5 + nTinyBits + binExp - (nFractBits - 1);
        let S2 = S5 + nTinyBits;
        let M2 = B5 + nTinyBits + binExp - nSignificantBits;
        const common = Math.min(B2, S2);
        B2 -= common;
        S2 -= common;
        M2 -= common;
        if (nFractBits === 1) M2 -= 1;
        if (M2 < 0) {
          B2 -= M2;
          S2 -= M2;
          M2 = 0;
        }
        const bits5 = (i) => i === 0 ? 0 : i < 27 ? (5n ** BigInt(i)).toString(2).length : i * 3;
        const Bbits = nFractBits + B2 + bits5(B5);
        const tenSbits = S2 + 1 + bits5(S5 + 1);
        // dtoa iterates in int or long arithmetic (overflow included, b + m > tens) when the estimates fit, else in
        // FDBigInteger (b + m >= tens)
        const width = Bbits < 32 && tenSbits < 32 ? 32 : Bbits < 64 && tenSbits < 64 ? 64 : 0;
        const w = width ? (x) => BigInt.asIntN(width, x) : (x) => x;
        const isHigh = (b, m, tens) => width ? w(b + m) > tens : b + m >= tens;
        let b = w(w((fract >> BigInt(tailZeros)) * 5n ** BigInt(B5)) << BigInt(B2));
        const s = w(5n ** BigInt(S5) << BigInt(S2));
        let m = w(5n ** BigInt(B5) << BigInt(M2));
        const tens = w(s * 10n);
        let q = b / s;
        b = w(10n * (b % s));
        m = w(m * 10n);
        let low = b < m;
        let high = isHigh(b, m, tens);
        let digits = "";
        if (q === 0n && !high) decExp--;
        else digits += q;
        if (decExp < -3 || decExp >= 8) low = high = false;
        while (!low && !high) {
          q = b / s;
          b = w(10n * (b % s));
          m = w(m * 10n);
          if (m > 0n) {
            low = b < m;
            high = isHigh(b, m, tens);
          } else {
            low = high = true;
          }
          digits += q;
        }
        let value = BigInt(digits);
        const tie = w(w(b << 1n) - tens);
        if (high && (!low || tie > 0n || (tie === 0n && value % 2n === 1n))) value += 1n;
        return [value, decExp + 1 - digits.length];
      };
      // A BigDecimal as { u, s }: u * 10^-s
      const decimalOf = (d) => {
        if (d === 0) return { u: 0n, s: 0 };
        const [digits, exponent] = javaDecimal(d);
        return exponent >= 0 ? { u: digits * 10n ** BigInt(exponent), s: 0 } : { u: digits, s: -exponent };
      };
      const pow10 = (n) => 10n ** BigInt(n);
      // a / b rounded HALF_UP, a >= 0, b > 0
      const divide = (a, b) => (a % b) * 2n >= b ? a / b + 1n : a / b;
      const plainString = (q, scale) => {
        if (scale === 0) return `${q}`;
        const digits = `${q}`.padStart(scale + 1, "0");
        return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
      };

      // ByteUnits
      const normalize = (unit, strict) => {
        const trimmed = trim(unit);
        if (strict) return trimmed;
        const upper = trimmed.toUpperCase();
        return upper.endsWith("IB") ? `${upper.slice(0, -2)}B` : upper;
      };
      // { core, iec, index } of an upper-case unit: index -1 for no prefix, null for an unknown one (a prefix is one letter)
      const unitOf = (upper, strict) => {
        const coreRaw = upper.endsWith("B") ? upper.slice(0, -1) : upper;
        const iec = strict && coreRaw.endsWith("I");
        const core = iec ? coreRaw.slice(0, -1) : coreRaw;
        const index = core === "" ? -1 : core.length === 1 && UNITS.includes(core) ? UNITS.indexOf(core) : null;
        return { core, iec, index };
      };
      const numberOption = (fn, param, value, fallback) => {
        if (nullish(value)) return fallback;
        let d;
        if (typeof value === "number") d = value;
        else if (typeof value === "bigint") d = Number(value);
        else if (typeof value === "string") {
          d = +value;
          if (Number.isNaN(d) && trim(value) !== "NaN") throw typeError(fn, mustBe(param, "number", value));
        } else throw typeError(fn, mustBe(param, "number", value));
        if (!Number.isFinite(d)) throw rangeError(fn, cannotBe(param, `${d}`));
        return d;
      };
      const sourceOf = (r) => {
        const source = r.source;
        if (nullish(source)) throw typeError(r.fn, mustBe("source", "number / string", source));
        let value;
        let parsedUnit = "";
        if (typeof source === "number") {
          value = source;
          if (!Number.isFinite(value) || value < 0) throw rangeError(r.fn, cannotBe("source", `${value}`));
        } else {
          const text = trim(`${source}`);
          const match = SOURCE_TEXT.exec(text);
          value = match ? +match[1] : NaN;
          // a digit run beyond the double range fails in BigDecimal.valueOf on the host
          if (!Number.isFinite(value)) throw rangeError(r.fn, cannotBe("source", `"${text}"`));
          parsedUnit = match[2];
        }
        const incoming = normalize(textOf(r.fromUnit, ""), r.strict);
        const parsed = normalize(parsedUnit, r.strict);
        if (incoming !== "" && parsed !== "" && incoming !== parsed) throw rangeError(r.fn, cannotBe("fromUnit", `"${textOf(r.fromUnit, "")}"`));
        return [value, (incoming || parsed || "B").toUpperCase()];
      };
      const targetUnit = (res) => {
        const unit = unitOf(res.toUnit.toUpperCase(), res.strict);
        if (unit.index === null) throw rangeError(res.fn, cannotBe("toUnit", `"${res.toUnitText}"`));
        return unit;
      };
      const resolve = (r) => {
        const [value, fromUnit] = sourceOf(r);
        const toUnitText = textOf(r.toUnit, AUTO);
        const toUnit = normalize(toUnitText, r.strict) || AUTO;
        const fractionDigits = numberOption(r.fn, "fractionDigits", r.fractionDigits, 2);
        if (fractionDigits !== Math.floor(fractionDigits) || fractionDigits > 2147483647) {
          throw rangeError(r.fn, `Argument "fractionDigits" must be a 32-bit integer, got ${fractionDigits}`);
        }
        if (fractionDigits < 0) throw rangeError(r.fn, cannotBe("fractionDigits", `${fractionDigits}`));
        if (!nullish(r.autoCarryThreshold) && toUnit.toUpperCase() !== AUTO) {
          throw typeError(r.fn, cannotBe("autoCarryThreshold", describe(r.autoCarryThreshold)));
        }
        let threshold = { u: IEC, s: 0 };
        if (!nullish(r.autoCarryThreshold)) {
          const d = numberOption(r.fn, "autoCarryThreshold", r.autoCarryThreshold, 0);
          if (d <= 0) throw rangeError(r.fn, `Argument "autoCarryThreshold" must be a positive number, got ${d}`);
          threshold = decimalOf(d);
        }
        const from = unitOf(fromUnit, r.strict);
        const base = !r.strict || from.iec ? IEC : SI;
        if (from.index === null) throw rangeError(r.fn, cannotBe("fromUnit", `"${textOf(r.fromUnit, fromUnit)}"`));
        const bytes = decimalOf(value);
        const res = {
          fn: r.fn,
          strict: r.strict,
          u: from.index < 0 ? bytes.u : bytes.u * base ** BigInt(from.index + 1),
          s: bytes.s,
          base,
          toUnit: toUnit.toUpperCase() === AUTO ? AUTO : toUnit,
          toUnitText,
          fractionDigits: fractionDigits + 0,
          threshold,
        };
        if (res.toUnit !== AUTO) targetUnit(res);
        return res;
      };
      // Strict AUTO keeps the base of the source unit (SI for B), loose mode always uses 1024
      const autoBase = (res) => res.strict ? res.base : IEC;
      // The exponent of the AUTO unit, carried one step early when the value reaches the threshold
      const autoExponent = (res, base) => {
        if (res.u === 0n) return 0;
        const scale = pow10(res.s);
        let exponent = 0;
        while (exponent < UNITS.length && res.u >= base ** BigInt(exponent + 1) * scale) exponent++;
        if (exponent >= 1 && exponent < UNITS.length) {
          const current = divide(res.u * pow10(6), base ** BigInt(exponent) * scale);
          if (current * pow10(res.threshold.s) >= res.threshold.u * pow10(6)) exponent++;
        }
        return exponent;
      };
      // The converted value as an unscaled integer of scale fractionDigits
      const quotient = (res) => {
        let divisor = 1n;
        if (res.toUnit === AUTO) {
          const base = autoBase(res);
          divisor = base ** BigInt(autoExponent(res, base));
        } else {
          const unit = targetUnit(res);
          if (unit.index >= 0) divisor = (!res.strict || unit.iec ? IEC : SI) ** BigInt(unit.index + 1);
        }
        return divide(res.u * pow10(res.fractionDigits), divisor * pow10(res.s));
      };
      // A number, or a bigint for an integer beyond the safe integer range (as ByteUnits.number)
      const toNumber = (r) => {
        const res = resolve(r);
        const q = quotient(res);
        const scale = pow10(res.fractionDigits);
        return q <= MAX_SAFE * scale || q % scale !== 0n ? Number(plainString(q, res.fractionDigits)) : q / scale;
      };
      const toText = (r) => {
        const res = resolve(r);
        if (r.strict && !nullish(r.useIecIdentifier)) throw typeError(r.fn, cannotBe("useIecIdentifier", describe(r.useIecIdentifier)));
        const useIec = !nullish(r.useIecIdentifier) && Boolean(r.useIecIdentifier);
        const space = nullish(r.useSpace) || r.useSpace ? " " : "";
        let text = plainString(quotient(res), res.fractionDigits);
        if (!nullish(r.trimTrailingZero) && r.trimTrailingZero) text = text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
        let core;
        let iec;
        if (res.toUnit === AUTO) {
          const base = autoBase(res);
          const exponent = autoExponent(res, base);
          core = exponent > 0 ? UNITS[exponent - 1] : "";
          iec = r.strict ? base === IEC : useIec;
        } else {
          const unit = targetUnit(res);
          core = unit.core;
          iec = r.strict ? unit.iec : useIec;
        }
        return `${text}${space}${core === "" ? "B" : iec ? `${core}iB` : `${core}B`}`;
      };
      // The overloads (source, toUnit | options | fractionDigits | useIecIdentifier), (source, toUnit, options | ...),
      // (source, fromUnit, toUnit) and (source, fromUnit, toUnit, options | ...), decided by the type of the last argument
      const request = (fn, args, mode) => {
        arity(fn, args, 1, -1);
        let n = args.length - 1;
        while (n > 0 && args[n] === undefined) n--;
        const size = n + 1;
        if (size > 4) throw typeError(fn, arityText(1, 4));
        const r = { fn, source: args[0], strict: mode === "strict" };
        if (n === 0) return r;
        const last = args[n];
        const kind = typeof last;
        if ((kind === "object" && last !== null) || kind === "symbol") {
          const option = (name) => nullish(last[name]) ? undefined : last[name];
          r.fromUnit = option("fromUnit") ?? (size === 4 ? args[1] : undefined);
          r.toUnit = option("toUnit") ?? (size >= 3 ? args[size - 2] : undefined);
          r.fractionDigits = option("fractionDigits");
          r.autoCarryThreshold = option("autoCarryThreshold");
          const strict = option("strict");
          if (mode === "default") r.strict = strict !== undefined && Boolean(strict);
          else if (strict !== undefined) throw typeError(fn, cannotBe("options.strict", describe(strict)));
          r.useIecIdentifier = option("useIecIdentifier");
          r.useSpace = option("useSpace");
          r.trimTrailingZero = option("trimTrailingZero");
          return r;
        }
        const key = kind === "string" ? "toUnit" : kind === "boolean" ? "useIecIdentifier" : kind === "number" || kind === "bigint" ? "fractionDigits" : null;
        if (key === null || (key === "toUnit" && size === 4)) {
          throw typeError(fn, mustBe("options", size === 4 || key !== null ? "number / boolean / Object" : "string / number / boolean / Object", last));
        }
        r[key] = last;
        if (key === "toUnit") {
          if (size === 3) r.fromUnit = args[1];
        } else if (size === 3) {
          r.toUnit = args[1];
        } else if (size === 4) {
          r.fromUnit = args[1];
          r.toUnit = args[2];
        }
        return r;
      };
      const bytesModule = (name, convert) => {
        const make = (fn, mode) => (...args) => convert(request(fn, args, mode));
        const bytes = make(name, "default");
        Object.defineProperties(bytes, {
          UNITS: { value: UNITS, enumerable: true },
          AUTO: { value: AUTO, enumerable: true },
          IEC_DIV: { value: 1024, enumerable: true },
          SI_DIV: { value: 1000, enumerable: true },
          strict: { value: make(`${name}.strict`, "strict"), enumerable: true },
          loose: { value: make(`${name}.loose`, "loose"), enumerable: true },
        });
        return Object.freeze(bytes);
      };

      // s13n.time
      const timeUnit = (unit, param) => {
        if (nullish(unit)) return 1000000n;
        const entry = typeof unit === "string" ? TIME_UNITS.find(([pattern]) => pattern.test(unit)) : undefined;
        if (entry === undefined) throw typeError("s13n.time", mustBe(param, "TimeUnit / string", unit));
        return entry[1];
      };
      // TimeUnit.toNanos, saturated
      const toNanos = (scale, duration) => {
        const max = LONG_MAX / scale;
        return duration > max ? LONG_MAX : duration < -max ? LONG_MIN : duration * scale;
      };
      const isPlainObject = (value) => value !== null && typeof value === "object" && Object.prototype.toString.call(value) === "[object Object]";
      const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const daysInMonth = (year, month) => month === 2 ? (isLeapYear(year) ? 29 : 28) : month >= 8 ? 31 - (month & 1) : 30 + (month & 1);
      // Rhino NativeDate.date_parseString("y/m/d h:m:s") in local time: its non-ISO parser, reduced to these separators
      const localTime = (parts) => {
        let year = -1;
        let mon = -1;
        let mday = -1;
        let hour = -1;
        let min = -1;
        let sec = -1;
        const separators = ["/", "/", " ", ":", ":", ""];
        for (let k = 0; k < 6; k++) {
          if (/[^0-9]/.test(parts[k])) return NaN;
          let n = 0;
          for (const digit of parts[k]) n = (n * 10 + (digit.charCodeAt(0) - 48)) | 0;
          const c = separators[k];
          const prevc = separators[k - 1];
          if (n >= 70 || (prevc === "/" && mon >= 0 && mday >= 0 && year < 0)) {
            if (year >= 0 || c === ":") return NaN;
            year = n < 100 ? n + 1900 : n;
          } else if (c === ":") {
            if (hour < 0) hour = n;
            else if (min < 0) min = n;
            else return NaN;
          } else if (c === "/") {
            if (mon < 0) mon = n - 1;
            else if (mday < 0) mday = n;
            else return NaN;
          } else if (hour >= 0 && min < 0) {
            min = n;
          } else if (min >= 0 && sec < 0) {
            sec = n;
          } else if (mday < 0) {
            mday = n;
          } else {
            return NaN;
          }
        }
        if (year < 0 || mon < 0 || mon > 11 || mday < 1 || mday > daysInMonth(year, mon + 1)) return NaN;
        if (hour < 0) hour = 0;
        else if (hour > 24 || (hour === 24 && (min > 0 || sec > 0))) return NaN;
        if (min < 0) min = 0;
        else if (min > 59) return NaN;
        if (sec < 0) sec = 0;
        else if (sec > 59) return NaN;
        const date = new Date(year, mon, mday, hour, min, sec);
        if (year >= 0 && year < 100) date.setFullYear(year, mon, mday);
        return date.getTime();
      };
      const time = (source, fromUnit, toUnit) => {
        if (typeof source === "number" && Number.isNaN(source)) return NaN;
        if (source instanceof Date) return time(source.getTime(), fromUnit, toUnit);
        let niceSource = source;
        if (typeof source === "string") {
          const text = source.replace(TIME_TEXT_SPACES, "$1");
          const parts = text.match(/\p{Nd}+/gu) ?? [];
          if (parts.length === 0 || parts.length > 6) return NaN;
          if (parts.length === 6) return time(localTime(parts), fromUnit, toUnit);
          niceSource = text;
        }
        if (isPlainObject(fromUnit)) return time(niceSource, fromUnit.fromUnit, fromUnit.toUnit);
        const number = nullish(niceSource) ? NaN : +niceSource;
        if (Number.isNaN(number)) throw typeError("s13n.time", mustBe("source", "number / string / Date", source));
        const from = timeUnit(fromUnit, "fromUnit");
        const to = timeUnit(toUnit, "toUnit");
        return Number(toNanos(from, toLong(number))) / Number(to);
      };

      // s13n.color: ColorUtils.toInt of a ColorHex (#RGB, #RRGGBB, #AARRGGBB), a decimal ColorInt text or a color name
      const colorOf = (text) => {
        let hex = text;
        if (hex.startsWith("#")) {
          if (hex.length === 4) hex = hex.replace(/(#)(\w)(\w)(\w)/, "$1$2$2$3$3$4$4");
        } else if (/^[+-]?[0-9]+$/.test(hex)) {
          const value = BigInt(hex);
          return value < LONG_MIN || value > LONG_MAX ? undefined : Number(BigInt.asIntN(32, value));
        } else {
          if (colorNames === null) {
            const words = COLOR_TABLE.trim().split(/\s+/);
            colorNames = new Map();
            for (let i = 0; i < words.length; i += 2) {
              const value = Number.parseInt(words[i + 1], 16);
              colorNames.set(words[i].toUpperCase(), (words[i + 1].length === 6 ? value + 0xff000000 : value) | 0);
            }
          }
          return colorNames.get(hex.replace(/-/g, "_").toUpperCase().replace(/_/g, ""));
        }
        if (!/^#(?:[0-9A-F]{6}|[0-9A-F]{8})$/i.test(hex)) return undefined;
        const value = Number.parseInt(hex.slice(1), 16);
        return (hex.length === 7 ? value + 0xff000000 : value) | 0;
      };

      const s13n = {
        bytes(...args) {
          arity("s13n.bytes", args, 1, 2);
          const fromUnit = args[1];
          if (!nullish(fromUnit) && typeof fromUnit !== "string") throw typeError("s13n.bytes", mustBe("fromUnit", "string", fromUnit));
          return toNumber({ fn: "s13n.bytes", source: args[0], fromUnit, toUnit: "B", fractionDigits: 0, strict: false });
        },
        time(...args) {
          arity("s13n.time", args, 1, 3);
          return time(args[0], args[1], args[2]);
        },
        color(...args) {
          arity("s13n.color", args, 1, 1);
          const o = args[0];
          if (typeof o === "number") return Number(BigInt.asIntN(32, toLong(o)));
          if (typeof o === "bigint") return Number(BigInt.asIntN(32, o));
          if (typeof o === "string") {
            const color = colorOf(o);
            if (color === undefined) throw rangeError("s13n.color", cannotBe("o", `"${o}"`));
            return color;
          }
          throw typeError("s13n.color", mustBe("o", "ColorHex / ColorInt / ColorName / Color / ThemeColor", o));
        },
      };

      return {
        cvt: { bytes: bytesModule("cvt.bytes", toNumber) },
        fmt: { bytes: bytesModule("fmt.bytes", toText) },
        s13n,
      };
    }
    // util.java, s13n.point / s13n.throwable and the Morse code vibration run the host's own classes through the Java
    // facade (java_interop), so they return Promises like the facade; arguments are checked as UtilJavaModule /
    // S13nModule / UtilMorseCodeModule check them. Shared with the Bun runtime (api-coverage P4.2a).
    function __autojs6_js_tools_java(host) {
      const PRIMITIVES = { string: "java.lang.String", int: "int", long: "long", double: "double", char: "char", byte: "byte",
        float: "float", short: "short", boolean: "boolean" };
      const isHandle = value => value !== null && typeof value === "object" && typeof value.__autojs6JavaHandle === "string";
      const isClass = value => value !== null && typeof value === "object" && !isHandle(value) &&
        typeof value.className === "string" && typeof value.callStatic === "function";
      const isNullish = value => value === undefined || value === null;
      const isPlainObject = value => value !== null && typeof value === "object" && !isHandle(value) && !isClass(value) &&
        Object.prototype.toString.call(value) === "[object Object]";
      function javaKind(value) {
        if (isHandle(value)) return String(value.className).startsWith("[") ? "array" : "object";
        return isClass(value) ? "class" : null;
      }
      function describe(value) {
        if (value === null) return "null";
        if (Array.isArray(value)) return "Array";
        if (isHandle(value) || isClass(value)) return value.className;
        return typeof value;
      }
      const fail = (name, cause, Type = TypeError) => new Type("Failed to call method \"" + name + "\": [ " + cause + " ]");
      const typeError = (name, param, expected, value) =>
        fail(name, "Argument \"" + param + "\" must be of type " + expected + ", got " + describe(value));
      // ScriptArgs.count: trailing undefined arguments beyond the required ones count as omitted.
      function arity(name, args, min, max = min) {
        let n = args.length;
        while (n > min && args[n - 1] === undefined) n--;
        if (n >= min && n <= max) return n;
        const range = max === Infinity ? "no less than " + min : min === max ? String(min) : "[" + min + ".." + max + "]";
        throw new TypeError("Failed to call method \"" + name + "\": [ Method only accepts " + range + " argument(s) ]");
      }
      // Kotlin Double.toInt(): truncation, NaN as 0, saturated to 32 bits.
      const toInt = value => Number.isNaN(value) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(value)));
      const typeName = type => typeof type === "string" ? PRIMITIVES[type] || type : isClass(type) ? type.className : String(type);
      // A java.lang.Class handle; a zero-length array of the type yields it through the facade's own class lookup (primitives included).
      async function classHandle(type) {
        if (isHandle(type)) return type;
        const java = host.java();
        const array = await java.newArray(typeName(type), 0);
        try {
          return await (await array.call("getClass")).call("getComponentType");
        } finally {
          await java.release(array).catch(() => {});
        }
      }
      // The facade returns a Java array result (toArray) as a script array of values and handles.
      const elements = async array => Array.from(isHandle(array) ? await array.toArray() : array);
      // A Java array of the type with the dimensions, as a handle (the facade would return the result of
      // java.lang.reflect.Array.newInstance as nested script arrays); the rows are filled like Array.newInstance does.
      async function newArray(type, dims) {
        const java = host.java();
        const array = await java.newArray(type + "[]".repeat(dims.length - 1), dims[0]);
        for (let i = 0; dims.length > 1 && i < dims[0]; i++) {
          const row = await newArray(type, dims.slice(1));
          await java.setArrayItem(array, i, row);
          await java.release(row).catch(() => {});
        }
        return array;
      }
      const utilJava = {
        async instanceof(...args) {
          const name = "util.java.instanceof";
          arity(name, args, 2);
          const [obj, clazz] = args;
          if (isNullish(obj)) throw fail(name, "Argument \"obj\" cannot be " + (obj === null ? "null" : "undefined"));
          if (isNullish(clazz)) return false;
          const java = host.java();
          if (isHandle(obj)) return java.instanceOf(obj, isHandle(clazz) ? await clazz.call("getName") : typeName(clazz));
          // Script objects and functions are no Java instances in Node (Rhino's NativeObject is a java.util.Map).
          if (typeof obj === "object" || typeof obj === "function" || typeof obj === "symbol") return false;
          return (await classHandle(clazz)).call("isInstance", [obj], { parameterTypes: ["java.lang.Object"] });
        },
        async array(...args) {
          const name = "util.java.array";
          arity(name, args, 2, Infinity);
          const dims = args.slice(1).map(value => toInt(Number(value)));
          return newArray(isHandle(args[0]) ? String(await args[0].call("getName")) : typeName(args[0]), dims);
        },
        async toJsArray(...args) {
          const name = "util.java.toJsArray";
          arity(name, args, 1, 2);
          const [list, nullListToEmptyArray] = args;
          if (isNullish(list)) return !isNullish(nullListToEmptyArray) && Boolean(nullListToEmptyArray) ? [] : null;
          // A script array is a java.util.List in Rhino.
          if (Array.isArray(list)) return list.slice();
          const java = host.java();
          if (!isHandle(list) || !await java.instanceOf(list, "java.lang.Iterable")) throw typeError(name, "list", "java.lang.Iterable", list);
          if (await java.instanceOf(list, "java.util.Collection")) return elements(await list.call("toArray", [], { parameterTypes: [] }));
          const stream = await java.callStatic("java.util.stream.StreamSupport", "stream", [await list.call("spliterator"), false]);
          return elements(await stream.call("toArray", [], { parameterTypes: [] }));
        },
        async objectToMap(...args) {
          const name = "util.java.objectToMap";
          arity(name, args, 1);
          const [o] = args;
          if (isNullish(o)) return null;
          if (!isPlainObject(o)) throw typeError(name, "o", "Object", o);
          const map = await host.java().new("java.util.HashMap", []);
          for (const key of Object.keys(o)) await map.call("put", [key, o[key]], { parameterTypes: ["java.lang.Object", "java.lang.Object"] });
          return map;
        },
        async mapToObject(...args) {
          const name = "util.java.mapToObject";
          arity(name, args, 1);
          const [map] = args;
          if (isNullish(map)) return null;
          // A script object is a java.util.Map in Rhino.
          if (isPlainObject(map)) return Object.assign({}, map);
          if (!isHandle(map) || !await host.java().instanceOf(map, "java.util.Map")) throw typeError(name, "map", "java.util.Map", map);
          // One snapshot of the entries keeps keys and values paired.
          const result = {};
          for (const entry of await elements(await (await map.call("entrySet")).call("toArray", [], { parameterTypes: [] }))) {
            result[String(await entry.call("getKey"))] = await entry.call("getValue");
            await host.java().release(entry).catch(() => {});
          }
          return result;
        }
      };
      utilJava.instanceOf = utilJava.instanceof;
      // A coordinate truncated toward zero, as S13nModule.coordinate.
      function coordinate(value, param) {
        const number = isNullish(value) ? NaN : Number(value);
        if (Number.isNaN(number)) throw typeError("s13n.point", param, "number", value);
        if (!Number.isFinite(number) || number < -2147483648 || number > 2147483647) {
          throw fail("s13n.point", "Argument \"" + param + "\" must be a 32-bit integer, got " + number, RangeError);
        }
        return Math.trunc(number);
      }
      async function point(...args) {
        const name = "s13n.point";
        arity(name, args, 1, 2);
        const [source, y] = args;
        let x, other;
        if (isHandle(source)) {
          if (source.className === "android.graphics.Point") return source;
          if (source.className !== "org.opencv.core.Point") throw typeError(name, "source", "Point / number[] / { x, y } / number", source);
          x = toInt(Number(await source.getField("x")));
          other = toInt(Number(await source.getField("y")));
        } else if (Array.isArray(source)) {
          x = coordinate(source[0], "source[0]");
          other = coordinate(source[1], "source[1]");
        } else if (typeof source === "number" || typeof source === "bigint") {
          x = coordinate(source, "source");
          const second = isNullish(y) ? NaN : Number(y);
          other = Number.isNaN(second) ? x : coordinate(second, "y");
        } else if (isPlainObject(source)) {
          x = coordinate(source.x, "source.x");
          other = coordinate(source.y, "source.y");
        } else {
          throw typeError(name, "source", "Point / number[] / { x, y } / number", source);
        }
        return host.java().new("android.graphics.Point", [x, other], { parameterTypes: ["int", "int"] });
      }
      async function throwable(...args) {
        const name = "s13n.throwable";
        arity(name, args, 1);
        const [o] = args;
        const java = host.java();
        if (isHandle(o) && await java.instanceOf(o, "java.lang.Throwable")) return o;
        if (typeof o === "string") return java.new("java.lang.Exception", [o], { parameterTypes: ["java.lang.String"] });
        if (o instanceof Error) return java.new("java.lang.Exception", [isNullish(o.message) ? "" : String(o.message)], { parameterTypes: ["java.lang.String"] });
        throw typeError(name, "o", "Throwable / string / Error", o);
      }
      // The timings (start delay first) vibrate through the host's Device.doVibrate, as util.morseCode.vibrate does in Rhino.
      async function vibrate(timings) {
        await host.java().callStatic("org.autojs.autojs.runtime.api.Device", "doVibrate", [timings], { parameterTypes: ["long[]"] });
      }
      return { utilJava, point, throwable, vibrate, javaKind };
    }
    function __autojs6_js_tools_util(host) {
      const failedToCall = (fn, cause) => `Failed to call method "${fn}": [ ${cause} ]`;
      const argumentType = (param, expected, actual) => `Argument "${param}" must be of type ${expected}, got ${actual}`;
      const plural = (n, text) => `${text} ${n} argument${n === 1 ? "" : "s"}`;
      const arity = (min, max) => {
        if (max < 0) return plural(min, "Method only accepts no less than");
        if (min === max) return plural(min, "Method only accepts");
        return `Method only accepts a number of arguments in the range [${min}..${max}]`;
      };

      const isNullish = v => v === null || v === undefined;
      const isNonNullObject = v => typeof v === "object" && v !== null;
      const isReference = v => isNonNullObject(v) || typeof v === "function";
      // Rhino ScriptRuntime.toString / toNumber: a symbol (and for toNumber a bigint) is a TypeError.
      const toStr = v => `${v}`;
      const toNum = v => +v;

      // Rhino class names of script objects, from internal slots where a brand check exists (Object.prototype.toString
      // alone follows Symbol.toStringTag, which Object.create(Map.prototype) also inherits).
      const objectToString = Object.prototype.toString;
      const getter = (proto, key) => Object.getOwnPropertyDescriptor(proto, key).get;
      const regExpPrototype = RegExp.prototype;
      const typedArrayName = getter(Object.getPrototypeOf(Int8Array.prototype), Symbol.toStringTag);
      const branded = f => o => {
        try {
          f.call(o);
          return true;
        } catch {
          return false;
        }
      };
      const tagged = () => true;
      const BRANDS = new Map([
        ["Error", o => Error.isError(o)],
        ["Date", branded(Date.prototype.getTime)],
        ["RegExp", branded(getter(RegExp.prototype, "source"))],
        ["Boolean", branded(Boolean.prototype.valueOf)],
        ["Number", branded(Number.prototype.valueOf)],
        ["String", branded(String.prototype.valueOf)],
        ["Symbol", branded(Symbol.prototype.valueOf)],
        ["BigInt", branded(BigInt.prototype.valueOf)],
        ["Map", branded(getter(Map.prototype, "size"))],
        ["Set", branded(getter(Set.prototype, "size"))],
        ["WeakMap", branded(WeakMap.prototype.has)],
        ["WeakSet", branded(WeakSet.prototype.has)],
        ["ArrayBuffer", branded(getter(ArrayBuffer.prototype, "byteLength"))],
        ["DataView", branded(getter(DataView.prototype, "buffer"))],
        ["Arguments", tagged],
        ["Promise", tagged],
        ["Generator", tagged],
        ["Array Iterator", tagged],
        ["Map Iterator", tagged],
        ["Set Iterator", tagged],
        ["String Iterator", tagged],
      ]);
      const JAVA_SPECIES = {object: "JavaObject", array: "JavaArray", class: "JavaClass", package: "JavaPackage"};
      const javaKind = o => (isReference(o) ? host.javaKind(o) : null);
      const classNameOf = o => {
        if (Array.isArray(o)) return "Array";
        if (o === Math) return "Math";
        if (o === JSON) return "JSON";
        if (o === globalThis) return "global";
        if (o === regExpPrototype) return "RegExp";
        const typed = typedArrayName.call(o);
        if (typed !== undefined) return typed;
        const tag = objectToString.call(o).slice(8, -1);
        const brand = BRANDS.get(tag);
        return brand && brand(o) ? tag : "Object";
      };
      const speciesOf = o => {
        switch (typeof o) {
          case "undefined":
            return "Undefined";
          case "boolean":
            return "Boolean";
          case "string":
            return "String";
          case "bigint":
            return "BigInt";
          case "number":
            return "Number";
          case "symbol":
            return "Symbol";
        }
        if (o === null) return "Null";
        const java = host.javaKind(o);
        if (java) return JAVA_SPECIES[java];
        return typeof o === "function" ? "Function" : classNameOf(o);
      };

      // ScriptArgs.describe: a bigint is a Java Number there.
      const describe = v => {
        if (v === null) return "null";
        const type = typeof v;
        if (type === "bigint") return "number";
        if (type !== "object") return type;
        const species = speciesOf(v);
        return species === "Symbol" ? "symbol" : species;
      };
      const quote = v => {
        if (typeof v === "string") return `"${v}"`;
        return typeof v === "number" ? String(v) : describe(v);
      };
      const typeError = (fn, param, expected, value) => new TypeError(failedToCall(fn, argumentType(param, expected, describe(value))));
      const cannotBe = (fn, param, value) => new TypeError(failedToCall(fn, `Argument "${param}" cannot be ${describe(value)}`));

      // Script functions: named after the member, length = the required parameter count (the host binding's length).
      const named = (display, length, f) => Object.defineProperties(f, {
        name: {value: display.slice(display.lastIndexOf(".") + 1)},
        length: {value: length},
      });
      // The generated bindings count trailing undefined arguments beyond the required ones as omitted (ScriptArgs.count);
      // omitted parameters are not passed on, so their host defaults apply.
      const fixed = (display, min, max, body) => named(display, min, (...args) => {
        let n = args.length;
        while (n > min && args[n - 1] === undefined) n--;
        if (n < min || n > max) throw new TypeError(failedToCall(display, arity(min, max)));
        return body(...(n < args.length ? args.slice(0, n) : args));
      });
      const predicate = (display, test) => fixed(display, 1, 1, test);
      const string = (fn, param, value) => {
        if (typeof value !== "string") throw typeError(fn, param, "string", value);
        return value;
      };
      const number = (fn, param, value) => {
        if (typeof value === "number") return value;
        if (typeof value === "bigint") return Number(value);
        if (typeof value === "string") {
          const n = +value;
          if (!Number.isNaN(n) || value.trim() === "NaN") return n;
        }
        throw typeError(fn, param, "number", value);
      };

      // util type predicates
      const isInteger = v => (typeof v === "bigint" ? Number.isFinite(Number(v)) : Number.isInteger(v));
      const isEmptyObject = v => {
        if (!isNonNullObject(v) || javaKind(v)) return false;
        // A Rhino array is empty when it has no elements, whatever its other properties.
        return Array.isArray(v) ? v.length === 0 : Reflect.ownKeys(v).length === 0;
      };
      const isError = v => isNonNullObject(v) && (speciesOf(v) === "Error" || Error.prototype.isPrototypeOf(v));

      const extend = (d, b) => {
        const fn = "util.extend";
        if (!isReference(d)) throw typeError(fn, "d", "function", d);
        if (b === undefined) throw new TypeError(failedToCall(fn, "Cannot convert undefined to an object"));
        const base = b === null ? null : Object(b);
        Object.setPrototypeOf(d, base);
        let prototype = Object.create(null);
        if (base !== null) {
          const inherited = base.prototype;
          prototype = Object.create(isReference(inherited) ? inherited : null);
          Object.defineProperty(prototype, "constructor", {value: d, writable: false, enumerable: false, configurable: false});
        }
        const current = d.prototype;
        if (current === null || (current === undefined && !("prototype" in d))) d.prototype = prototype;
        else if (isReference(current)) Object.setPrototypeOf(current, prototype);
        else throw typeError(fn, "d.prototype", "object", current);
      };

      const assignFunctions = (src, target, funcNames) => {
        const fn = "util.__assignFunctions__";
        if (!isReference(src)) throw typeError(fn, "src", "object", src);
        if (!isReference(target)) throw typeError(fn, "target", "object", target);
        if (!Array.isArray(funcNames)) throw typeError(fn, "funcNames", "Array", funcNames);
        for (let i = 0; i < funcNames.length; i++) {
          const name = toStr(funcNames[i]);
          const func = src[name];
          if (typeof func !== "function") throw typeError(fn, `src.${name}`, "function", name in src ? func : null);
          target[name] = func.bind(src);
        }
      };

      // util.inspect: the host's Inspector (UtilInspectModule.kt), the legacy Node format of the obsolete module.
      const COLORS = [["bold", 1, 22], ["italic", 3, 23], ["underline", 4, 24], ["inverse", 7, 27], ["white", 37, 39], ["gray", 90, 39],
        ["grey", 90, 39], ["black", 30, 39], ["blue", 34, 39], ["cyan", 36, 39], ["green", 32, 39], ["magenta", 35, 39], ["red", 31, 39],
        ["yellow", 33, 39]];
      const STYLES = [["regexp", "red"], ["date", "magenta"], ["special", "cyan"], ["number", "yellow"], ["boolean", "yellow"],
        ["string", "green"], ["undefined", "gray"], ["null", "bold"]];
      const COLOR_CODES = new Map(COLORS.map(([name, start, end]) => [name, [start, end]]));
      const STYLE_COLORS = new Map(STYLES);
      const ESC = String.fromCharCode(27);
      const SGR = /\x1b\[\d+?m/g;
      const DIGITS = /^\d+$/;
      const IDENTIFIER = /^"[a-zA-Z_]\w*"$/;
      const QUOTE_ENDS = /^"|"$/g;
      const INT_MAX = 2147483647;
      const INSPECT_DEFAULTS = Object.freeze({
        showHidden: false, depth: 2, colors: false, customInspect: false, maxArrayItems: 10000, maxObjectKeys: 10000, maxStringLength: 100000,
      });
      const clampInt = x => (x >= INT_MAX ? INT_MAX : x <= -INT_MAX - 1 ? -INT_MAX - 1 : Math.trunc(x));
      const builtInToString = [Object.prototype.toString, Array.prototype.toString, Function.prototype.toString];
      const errorToString = Error.prototype.toString;
      const regExpToString = RegExp.prototype.toString;
      const dateToString = Date.prototype.toString;
      const dateToUTCString = Date.prototype.toUTCString;
      const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
      // Single-quoted as the obsolete module: JSON escapes, ' escaped and " kept.
      const quoteText = text => JSON.stringify(text).slice(1, -1).replaceAll("'", "\\'").replaceAll("\\\"", "\"");

      // Inspector.of: positional values first, then an options object (a plain object) overriding them.
      const inspectOptions = (showHiddenOrOptions, depth, colors) => {
        const fn = "util.inspect";
        const options = {...INSPECT_DEFAULTS};
        if (!isNullish(depth)) {
          if (typeof depth !== "number" && typeof depth !== "bigint") throw typeError(fn, "depth", "number", depth);
          options.depth = Number(depth);
        }
        if (!isNullish(colors)) {
          if (typeof colors !== "boolean") throw typeError(fn, "colors", "boolean", colors);
          options.colors = colors;
        }
        const v = showHiddenOrOptions;
        if (typeof v === "boolean") {
          options.showHidden = v;
        } else if (!isNullish(v)) {
          if (speciesOf(v) !== "Object") throw typeError(fn, "showHiddenOrOptions", "boolean | Object", v);
          const option = key => (isNullish(v[key]) ? null : v[key]);
          const numberOption = key => {
            const x = option(key);
            if (x === null) return null;
            const n = toNum(x);
            if (Number.isNaN(n)) throw typeError(fn, `options.${key}`, "number", x);
            return n;
          };
          if (option("showHidden") !== null) options.showHidden = Boolean(v.showHidden);
          // Node semantics: null (and Infinity) means no limit, undefined the default.
          if ("depth" in v) {
            if (v.depth === null) options.depth = null;
            else if (v.depth !== undefined) options.depth = numberOption("depth");
          }
          if (option("colors") !== null) options.colors = Boolean(v.colors);
          if (option("customInspect") !== null) options.customInspect = Boolean(v.customInspect);
          for (const key of ["maxArrayItems", "maxObjectKeys", "maxStringLength"]) {
            const n = numberOption(key);
            if (n !== null) options[key] = clampInt(n);
          }
        }
        if (options.depth === Infinity) options.depth = null;
        return options;
      };

      // One formatting pass of util.inspect, also used by util.format.
      const inspector = ({showHidden, depth, colors, customInspect, maxArrayItems, maxObjectKeys, maxStringLength}) => {
        const seen = new Set();
        const stylize = (text, style) => {
          const codes = colors ? COLOR_CODES.get(STYLE_COLORS.get(style)) : undefined;
          return codes ? `${ESC}[${codes[0]}m${text}${ESC}[${codes[1]}m` : text;
        };
        const errorName = value => `[${toStr(errorToString.call(value))}]`;
        const regExpName = value => toStr(regExpToString.call(value));
        const functionName = value => {
          const name = value.name;
          const text = isNullish(name) ? "" : toStr(name);
          return text === "" ? "[Function]" : `[Function ${text}()]`;
        };
        const formatPrimitive = value => {
          switch (typeof value) {
            case "undefined":
              return stylize("undefined", "undefined");
            case "string": {
              const quoted = `'${quoteText(value)}'`;
              if (maxStringLength > 0 && quoted.length > maxStringLength) {
                const cut = quoted.slice(0, maxStringLength);
                return stylize(`${cut}... (${quoted.length - cut.length} more chars)`, "string");
              }
              return stylize(quoted, "string");
            }
            // A Rhino BigInt is a java.math.BigInteger, printed as a number.
            case "number":
            case "bigint":
              return stylize(String(value), "number");
            case "boolean":
              return stylize(String(value), "boolean");
          }
          return null;
        };
        // The first own toString up the prototype chain of a plain object, unless it is the standard one.
        const customToString = value => {
          let owner = value;
          while (owner !== null && !hasOwn(owner, "toString")) owner = Object.getPrototypeOf(owner);
          if (owner === null) return null;
          const f = owner.toString;
          if (typeof f !== "function" || builtInToString.includes(f)) return null;
          return toStr(f.call(value));
        };
        const isUtilInspect = f => f.name === "inspect" && hasOwn(f, "colors") && hasOwn(f, "styles");
        const isPrototypeObject = value => {
          const ctor = value.constructor;
          return isReference(ctor) && ctor.prototype === value;
        };
        const formatProperty = (value, recurseTimes, visible, key, array, typed) => {
          // Rhino keeps typed array elements out of the property slots: they have no descriptor.
          const desc = typed && DIGITS.test(key) ? undefined : Object.getOwnPropertyDescriptor(value, key);
          if (desc === undefined) return null;
          const hasGetter = typeof desc.get === "function";
          const hasSetter = typeof desc.set === "function";
          let str = null;
          if (hasGetter && hasSetter) str = stylize("[Getter/Setter]", "special");
          else if (hasGetter) str = stylize("[Getter]", "special");
          else if (hasSetter) str = stylize("[Setter]", "special");
          const enumerable = visible !== null ? visible.has(key) : Boolean(desc.enumerable);
          let name = enumerable ? null : `[${key}]`;
          if (str === null) {
            const v = desc.value;
            if (isReference(v) && seen.has(v)) {
              str = stylize("[Circular]", "special");
            } else {
              str = formatValue(v, recurseTimes === null ? null : recurseTimes - 1);
              if (str.includes("\n")) {
                str = array
                  ? str.split("\n").map(line => "  " + line).join("\n").slice(2)
                  : "\n" + str.split("\n").map(line => "   " + line).join("\n");
              }
            }
          }
          if (name === null) {
            if (array && DIGITS.test(key)) return str;
            const json = JSON.stringify(key);
            name = IDENTIFIER.test(json)
              ? stylize(json.slice(1, -1), "name")
              : stylize(json.replaceAll("'", "\\'").replaceAll("\\\"", "\"").replace(QUOTE_ENDS, "'"), "string");
          }
          return `${name}: ${str}`;
        };
        // Up to maxArrayItems elements; a longer array shows its first 100 (at most) and last 20, then other keys.
        const formatArray = (value, recurseTimes, keys) => {
          const output = [];
          const len = Math.min(value.length, INT_MAX);
          const max = maxArrayItems > 0 ? maxArrayItems : INT_MAX;
          const head = len <= max ? len : Math.min(max, 100);
          const tail = len <= max ? 0 : Math.max(Math.min(20, max - head), 0);
          const element = i => (hasOwn(value, i) ? formatProperty(value, recurseTimes, null, String(i), true, false) ?? "" : "");
          for (let i = 0; i < head; i++) output.push(element(i));
          if (len > head + tail) output.push(stylize(`... ${len - head - tail} more items ...`, "special"));
          for (let i = Math.max(head, len - tail); i < len; i++) output.push(element(i));
          for (const key of keys) {
            const property = DIGITS.test(key) ? null : formatProperty(value, recurseTimes, null, key, true, false);
            if (property !== null) output.push(property);
          }
          return output;
        };
        const reduceToSingleString = (output, base, braces) => {
          const length = output.reduce((sum, item) => sum + item.replace(SGR, "").length + 1, 0);
          if (length > 60) return `${braces[0]}${base === "" ? "" : base + "\n "} ${output.join(",\n  ")} ${braces[1]}`;
          return `${braces[0]}${base} ${output.join(", ")} ${braces[1]}`;
        };
        const formatValue = (value, recurseTimes) => {
          if (value === globalThis) return "[object global]";
          if (isReference(value)) {
            let readable;
            try {
              readable = value.toStringReadable;
            } catch {
              readable = undefined;
            }
            if (typeof readable === "function") return formatValue(toStr(readable.call(value)), recurseTimes);
          }
          // The value's own inspect(recurseTimes, context) when customInspect is on; util.inspect itself and prototype
          // objects are left out. A string result is used as it is.
          if (customInspect && isNonNullObject(value)) {
            const f = value.inspect;
            if (typeof f === "function" && !isUtilInspect(f) && !isPrototypeObject(value)) {
              const result = f.call(value, recurseTimes, {showHidden, depth, colors, customInspect});
              return typeof result === "string" ? result : formatValue(result, recurseTimes);
            }
          }
          const primitive = formatPrimitive(value);
          if (primitive !== null) return primitive;
          if (value === null) return stylize("null", "null");
          // A symbol: Rhino's ToString is a TypeError.
          if (!isReference(value)) return toStr(value);

          const species = speciesOf(value);
          if (species === "Object") {
            const custom = customToString(value);
            if (custom !== null) return custom;
          }
          const callable = typeof value === "function";
          const array = species === "Array";
          const typed = !array && typedArrayName.call(value) !== undefined;
          const keys = showHidden ? Object.getOwnPropertyNames(value) : Object.keys(value);
          const visible = array || !showHidden ? null : new Set(Object.keys(value));
          const isError = species === "Error" || Error.prototype.isPrototypeOf(value);
          if (isError && keys.some(key => key === "message" || key === "description")) return errorName(value);
          if (keys.length === 0) {
            if (callable) return stylize(functionName(value), "special");
            if (species === "RegExp") return stylize(regExpName(value), "regexp");
            if (species === "Date") return stylize(toStr(dateToString.call(value)), "date");
            if (species === "Error") return errorName(value);
          }

          let base = "";
          if (callable) base = " " + functionName(value);
          else if (species === "RegExp") base = " " + regExpName(value);
          else if (species === "Date") base = " " + toStr(dateToUTCString.call(value));
          else if (species === "Error") base = " " + errorName(value);
          const braces = array ? ["[", "]"] : ["{", "}"];
          if (keys.length === 0 && (!array || value.length === 0)) return braces[0] + base + braces[1];
          if (recurseTimes !== null && recurseTimes < 0) {
            return species === "RegExp" ? stylize(regExpName(value), "regexp") : stylize("[Object]", "special");
          }

          seen.add(value);
          let output;
          if (array) {
            output = formatArray(value, recurseTimes, keys);
          } else {
            try {
              output = [];
              for (const key of keys.slice(0, maxObjectKeys > 0 ? maxObjectKeys : INT_MAX)) {
                const property = formatProperty(value, recurseTimes, visible, key, false, typed);
                if (property !== null) output.push(property);
              }
            } catch {
              seen.delete(value);
              try {
                return toStr(value);
              } catch {
                return toStr(Object.prototype.toString.call(value));
              }
            }
          }
          seen.delete(value);
          return reduceToSingleString(output, base, braces);
        };
        return value => formatValue(value, depth);
      };
      const inspectDefault = value => inspector(INSPECT_DEFAULTS)(value);
      const inspect = fixed("util.inspect", 0, 4, (value, showHiddenOrOptions, depth, colors) =>
        inspector(inspectOptions(showHiddenOrOptions, depth, colors))(value));
      Object.defineProperties(inspect, {
        colors: {get: () => Object.fromEntries(COLORS.map(([name, start, end]) => [name, [start, end]])), enumerable: true},
        styles: {get: () => Object.fromEntries(STYLES), enumerable: true},
      });

      const json = v => {
        try {
          return String(JSON.stringify(v));
        } catch {
          return "[Circular]";
        }
      };
      // Rhino semantics: %s is ToString (objects give "[object Object]"), %d ToNumber, %j JSON; a first argument that is no
      // string makes every argument inspected.
      const format = (...args) => {
        if (args.length === 0) return "";
        const fmt = args[0];
        if (typeof fmt !== "string") return args.map(inspectDefault).join(" ");
        let index = 1;
        let out = "";
        for (let i = 0; i < fmt.length; i++) {
          const ch = fmt[i];
          if (ch !== "%" || i + 1 >= fmt.length) {
            out += ch;
            continue;
          }
          const spec = fmt[++i];
          if (spec === "%") {
            out += "%";
          } else if ((spec === "s" || spec === "d" || spec === "j") && index < args.length) {
            const arg = args[index++];
            out += spec === "s" ? toStr(arg) : spec === "d" ? String(toNum(arg)) : json(arg);
          } else {
            out += "%" + spec;
          }
        }
        while (index < args.length) {
          const x = args[index++];
          out += " " + (isNonNullObject(x) ? inspectDefault(x) : toStr(x));
        }
        return out;
      };

      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const pad2 = n => String(n).padStart(2, "0");
      const NOT_FOR_AUTOJS6 = "This method is not designed for AutoJs6.";
      const log = (...args) => {
        const now = new Date();
        const timestamp = `${pad2(now.getDate())} ${MONTHS[now.getMonth()]} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
        host.log(`${timestamp} - ${format(...args)}`);
      };

      const surround = (text, start, end) => {
        const started = text.startsWith(start) ? text : start + text;
        return started.endsWith(end) ? started : started + end;
      };
      const checkString = (fn, src, pattern, objects) => {
        let source;
        if (typeof pattern === "string") source = surround(pattern, "^", "$");
        else if (speciesOf(pattern) === "RegExp") source = toStr(pattern.source);
        else throw typeError(fn, "pattern", "string | RegExp", pattern);
        let text;
        if (isNullish(src)) {
          throw cannotBe(fn, "src", src);
        } else if (!isReference(src)) {
          text = toStr(src);
        } else if (objects) {
          const toString = src.toString;
          if (typeof toString !== "function") throw typeError(fn, "src.toString", "function", "toString" in src ? toString : null);
          text = toStr(toString.call(src));
        } else {
          throw typeError(fn, "src", "string | number | boolean | bigint", src);
        }
        let regExp;
        try {
          regExp = new RegExp(source, "i");
        } catch {
          // Rhino's regular expressions accept patterns V8 rejects ("^[$"), which then match nothing.
          return false;
        }
        return regExp.test(text.trim());
      };

      const TYPES = ["object", "string", "undefined", "symbol", "bigint", "number", "function", "boolean"];
      const TYPE_UNION = TYPES.map(t => `'${t}'`).join(" | ");
      const ensureType = (o, type) => {
        const fn = "util.ensureType";
        const name = string(fn, "type", type).toLowerCase();
        if (!TYPES.includes(name)) throw new RangeError(failedToCall(fn, argumentType("type", TYPE_UNION, quote(type))));
        if (typeof o !== name) throw typeError(fn, "o", name, o);
      };
      const ensureEach = (fn, type) => named(fn, 0, (...values) => {
        values.forEach((v, i) => {
          if (typeof v !== type) throw typeError(fn, `values[${i}]`, type, v);
        });
      });

      const toRegular = f => {
        if (typeof f !== "function") throw typeError("util.toRegular", "f", "function", f);
        if (isNonNullObject(f.prototype)) return f;
        // Like the host's BaseFunction: callable and constructible, calls f with a null this, no prototype object.
        const regular = function (...args) {
          return Reflect.apply(f, null, args);
        };
        regular.prototype = undefined;
        Object.defineProperty(regular, "name", {value: ""});
        Object.defineProperty(regular, "toString", {
          value: function toString() {
            const target = this === regular ? f : this;
            return toStr(isReference(target) ? target.toString() : target);
          },
          writable: false,
          enumerable: false,
          configurable: false,
        });
        return regular;
      };
      const obsoleted = name => named(`util.${name}`, 0, () => {
        const e = new Error(`Function "${name}" can no longer be used as it has been obsoleted`);
        e.name = "ObsoletedRhinoFunctionException";
        throw e;
      });

      // DisplayUtils: TypedValue float math, sp linear. pxToDp divides by densityDpi / 160 below API 34 and by density
      // (TypedValue.deriveDimension) from API 34.
      const f32 = Math.fround;
      const scaled = (display, param, factorOf, multiply) => fixed(display, 1, 1, v => {
        const value = f32(number(display, param, v));
        const factor = factorOf(host.device);
        return f32(multiply ? value * factor : value / factor);
      });
      const dpFactor = device => f32(device.density);
      const spFactor = device => f32(device.scaledDensity);
      const pxPerDp = device => (device.sdkInt >= 34 ? f32(device.density) : f32(f32(device.densityDpi) / 160));

      // morseCode: a dot is 1 unit, a dash 3, the gap within a character 1, between characters 3, between words 7.
      const DOT = "\u00B7";
      const MORSE = new Map(Object.entries({
        A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
        M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
        Y: "-.--", Z: "--..", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..",
        9: "----.", 0: "-----", ".": ".-.-.-", ":": "---...", ",": "--..--", ";": "-.-.-.", "?": "..--..", "=": "-...-",
        "'": ".----.", "/": "-..-.", "!": "-.-.--", "-": "-....-", _: "..--.-", "\"": ".-..-.", "(": "-.--.", ")": "-.--.-",
        $: "...-..-", "&": ".-...", "@": ".--.-.", "+": ".-.-.",
      }).map(([key, marks]) => [key, marks.replaceAll(".", DOT)]));
      const MORSE_SOURCE = "text of A-Z, 0-9 and . : , ; ? = ' / ! - _ \" ( ) $ & @ +";
      // Java's \s, which the host splits words with.
      const MORSE_WORDS = /[ \t\n\v\f\r]+/;
      const morseOf = (fn, source, timeSpan) => {
        const text = source === null ? "" : toStr(source);
        let span = 100;
        if (!isNullish(timeSpan)) {
          const x = toNum(timeSpan);
          if (Number.isNaN(x)) throw new RangeError(failedToCall(fn, argumentType("timeSpan", "number", quote(timeSpan))));
          span = Math.max(100, Number.isFinite(x) ? Math.min(Math.max(Math.round(x), -2147483648), 2147483647) : 2147483647);
        }
        let code = "";
        const pattern = [];
        const words = text.split(MORSE_WORDS);
        words.forEach((word, i) => {
          for (let j = 0; j < word.length; j++) {
            const upper = word[j].toUpperCase();
            const marks = MORSE.get(upper);
            if (marks === undefined) throw new RangeError(failedToCall(fn, argumentType("source", MORSE_SOURCE, quote(upper))));
            for (let k = 0; k < marks.length; k++) {
              pattern.push((marks[k] === "-" ? 3 : 1) * span);
              if (k !== marks.length - 1) pattern.push(span);
            }
            code += marks;
            if (j !== word.length - 1) {
              pattern.push(3 * span);
              code += "   ";
            }
          }
          if (i !== words.length - 1) {
            pattern.push(7 * span);
            code += "       ";
          }
        });
        return {code, pattern};
      };
      const vibrateMorse = (morse, delay) => {
        if (morse.pattern.length === 0) return undefined;
        const d = isNullish(delay) ? 0 : toNum(delay);
        return host.vibrate([Number.isNaN(d) ? 0 : Math.max(0, Math.trunc(d)), ...morse.pattern]);
      };
      const describeMorse = morse => ["MorseCode {", `  code: '${morse.code}',`, `  pattern: [${morse.pattern.join(", ")}],`, "}"].join("\n");
      const morseMethod = (name, max, body) => named(name, 0, (...args) => {
        if (args.length > max) throw new TypeError(failedToCall(`MorseCode.${name}`, arity(0, max)));
        return body(...args);
      });
      const morseResult = morse => {
        const result = {};
        const permanent = value => ({value, writable: true, enumerable: true, configurable: false});
        Object.defineProperties(result, {
          toString: permanent(morseMethod("toString", 0, () => describeMorse(morse))),
          getPattern: permanent(morseMethod("getPattern", 0, () => morse.pattern.slice())),
          getCode: permanent(morseMethod("getCode", 0, () => morse.code)),
          vibrate: permanent(morseMethod("vibrate", 1, delay => vibrateMorse(morse, delay))),
          toStringReadable: {value: morseMethod("toStringReadable", 0, () => describeMorse(morse))},
          pattern: {get: () => morse.pattern.slice(), enumerable: true},
          code: {get: () => morse.code, enumerable: true},
        });
        return result;
      };
      const morseCode = fixed("util.morseCode", 1, 2, (source, timeSpan) => morseResult(morseOf("util.morseCode", source, timeSpan)));
      Object.assign(morseCode, {
        getPattern: fixed("util.morseCode.getPattern", 1, 2, (source, timeSpan) => morseOf("util.morseCode.getPattern", source, timeSpan).pattern),
        getCode: fixed("util.morseCode.getCode", 1, 2, (source, timeSpan) => morseOf("util.morseCode.getCode", source, timeSpan).code),
        vibrate: fixed("util.morseCode.vibrate", 1, 2, (source, delay) => vibrateMorse(morseOf("util.morseCode.vibrate", source, null), delay)),
      });

      // versionCodes: [versionCode, releaseName, internalCodename, platformVersion, apiLevel, releaseDate], newest first.
      const VERSION_CODES = [
        ["CINNAMON_BUN", "Android 17", "Cinnamon Bun", "17", "37", "June 16, 2026"],
        ["BAKLAVA", "Android 16", "Baklava", "16", "36", "June 10, 2025"],
        ["VANILLA_ICE_CREAM", "Android 15", "Vanilla Ice Cream", "15", "35", "September 3, 2024"],
        ["UPSIDE_DOWN_CAKE", "Android 14", "Upside Down Cake", "14", "34", "October 4, 2023"],
        ["TIRAMISU", "Android 13", "Tiramisu", "13", "33", "August 15, 2022"],
        ["S_V2", "Android 12L", "Snow Cone v2", "12.1", "32", "March 7, 2022"],
        ["S", "Android 12", "Snow Cone", "12", "31", "October 4, 2021"],
        ["R", "Android 11", "Red Velvet Cake", "11", "30", "September 8, 2020"],
        ["Q", "Android 10", "Quince Tart", "10", "29", "September 3, 2019"],
        ["P", "Android Pie", "Pistachio Ice Cream", "9", "28", "August 6, 2018"],
        ["O_MR1", "Android Oreo", "Oatmeal Cookie", "8.1", "27", "December 5, 2017"],
        ["O", "Android Oreo", "Oatmeal Cookie", "8.0", "26", "August 21, 2017"],
        ["N_MR1", "Android Nougat", "New York Cheesecake", "7.1-7.1.2", "25", "October 4, 2016"],
        ["N", "Android Nougat", "New York Cheesecake", "7.0", "24", "August 22, 2016"],
        ["M", "Android Marshmallow", "Macadamia Nut Cookie", "6.0-6.0.1", "23", "September 29, 2015"],
        ["LOLLIPOP_MR1", "Android Lollipop", "Lemon Meringue Pie", "5.1-5.1.1", "22", "March 2, 2015"],
        ["LOLLIPOP", "Android Lollipop", "Lemon Meringue Pie", "5.0-5.0.2", "21", "November 4, 2014"],
        ["KITKAT_WATCH", "Android KitKat", "Key Lime Pie", "4.4W-4.4W.2", "20", "June 25, 2014"],
        ["KITKAT", "Android KitKat", "Key Lime Pie", "4.4-4.4.4", "19", "October 31, 2013"],
        ["JELLY_BEAN_MR2", "Android Jelly Bean", "Jelly Bean", "4.3-4.3.1", "18", "July 24, 2013"],
        ["JELLY_BEAN_MR1", "Android Jelly Bean", "Jelly Bean", "4.2-4.2.2", "17", "November 13, 2012"],
        ["JELLY_BEAN", "Android Jelly Bean", "Jelly Bean", "4.1-4.1.2", "16", "July 9, 2012"],
        ["ICE_CREAM_SANDWICH_MR1", "Android Ice Cream Sandwich", "Ice Cream Sandwich", "4.0.3-4.0.4", "15", "December 16, 2011"],
        ["ICE_CREAM_SANDWICH", "Android Ice Cream Sandwich", "Ice Cream Sandwich", "4.0-4.0.2", "14", "October 18, 2011"],
        ["HONEYCOMB_MR2", "Android Honeycomb", "Honeycomb", "3.2-3.2.6", "13", "July 15, 2011"],
        ["HONEYCOMB_MR1", "Android Honeycomb", "Honeycomb", "3.1", "12", "May 10, 2011"],
        ["HONEYCOMB", "Android Honeycomb", "Honeycomb", "3.0", "11", "February 22, 2011"],
        ["GINGERBREAD_MR1", "Android Gingerbread", "Gingerbread", "2.3.3-2.3.7", "10", "February 9, 2011"],
        ["GINGERBREAD", "Android Gingerbread", "Gingerbread", "2.3-2.3.2", "9", "December 6, 2010"],
        ["FROYO", "Android Froyo", "Froyo", "2.2-2.2.3", "8", "May 20, 2010"],
        ["ECLAIR_MR1", "Android Eclair", "Eclair", "2.1", "7", "January 11, 2010"],
        ["ECLAIR_0_1", "Android Eclair", "Eclair", "2.0.1", "6", "December 3, 2009"],
        ["ECLAIR", "Android Eclair", "Eclair", "2.0", "5", "October 27, 2009"],
        ["DONUT", "Android Donut", "Donut", "1.6", "4", "September 15, 2009"],
        ["CUPCAKE", "Android Cupcake", "Cupcake", "1.5", "3", "April 27, 2009"],
        ["BASE_1_1", "Android 1.1", "Petit Four", "1.1", "2", "February 9, 2009"],
        ["BASE", "Android 1.0", "", "1.0", "1", "September 23, 2008"],
      ].map(([versionCode, releaseName, internalCodename, platformVersion, apiLevel, releaseDate]) =>
        ({versionCode, releaseName, internalCodename, platformVersion, apiLevel, releaseDate}));
      // Local midnight of the release date, as the host's Calendar.
      const timestampOf = info => {
        const [, month, day, year] = /^(\w{3})\w* (\d\d?), (\d+)$/.exec(info.releaseDate);
        return new Date(+year, MONTHS.indexOf(month), +day).getTime();
      };
      const versionInfo = info => {
        const o = {};
        const readonly = value => ({value, writable: false, enumerable: true, configurable: false});
        Object.defineProperties(o, {
          versionCode: readonly(info.versionCode),
          apiLevel: readonly(+info.apiLevel),
          releaseName: readonly(info.releaseName),
          platformVersion: readonly(info.platformVersion),
          internalCodename: readonly(info.internalCodename),
          releaseDate: readonly(info.releaseDate),
          releaseTimestamp: readonly(timestampOf(info)),
          valueOf: {
            value: function valueOf() {
              return isReference(this) ? this.apiLevel : null;
            },
          },
        });
        return o;
      };
      const queryText = query => {
        if (query === null) return null;
        if (typeof query === "string") return query;
        if (typeof query === "number" || typeof query === "bigint") return String(Number(query));
        if (speciesOf(query) === "Date") return String(Date.prototype.getTime.call(query));
        throw typeError("util.versionCodes.search", "query", "string | number | Date", query);
      };
      const versionMatches = (info, text) =>
        info.apiLevel === text || info.versionCode === text ||
        info.releaseName === text || info.releaseName.split(/\s+/).includes(text) ||
        info.internalCodename === text || info.internalCodename.split(/\s+/).includes(text) ||
        String(timestampOf(info)) === text || info.releaseDate === text ||
        info.platformVersion === text || info.platformVersion.split(/\D+/)[0] === text;
      const summary = isInDetail => {
        const detail = !isNullish(isInDetail) && Boolean(isInDetail);
        return VERSION_CODES.map(info => (detail
          ? [info.versionCode, info.apiLevel, info.releaseName, info.platformVersion, info.internalCodename, info.releaseDate, timestampOf(info)].join(", ")
          : `${info.versionCode}: ${info.apiLevel} / ${info.releaseName} / ${info.platformVersion}`)).join("\n");
      };
      const versionCodes = Object.create(Object.create(Object.prototype, Object.fromEntries(VERSION_CODES.map(info =>
        [info.versionCode, {get: () => versionInfo(info), enumerable: true}]))));
      Object.assign(versionCodes, {
        toString: fixed("util.versionCodes.toString", 0, 1, isInDetail => summary(isInDetail)),
        search: fixed("util.versionCodes.search", 1, 1, query => {
          const text = queryText(query);
          const found = text === null ? undefined : VERSION_CODES.find(info => versionMatches(info, text));
          return found === undefined ? null : versionInfo(found);
        }),
        searchAll: fixed("util.versionCodes.searchAll", 1, 1, query => {
          const text = queryText(query);
          return text === null ? [] : VERSION_CODES.filter(info => versionMatches(info, text)).map(versionInfo);
        }),
        summary: fixed("util.versionCodes.summary", 0, 1, isInDetail => summary(isInDetail)),
      });

      const version = Object.defineProperty({}, "sdkInt", {get: () => host.device.sdkInt, enumerable: true});

      const util = {
        isArray: predicate("util.isArray", o => Array.isArray(o)),
        isBoolean: predicate("util.isBoolean", o => typeof o === "boolean"),
        isNull: predicate("util.isNull", o => o === null),
        isNullOrUndefined: predicate("util.isNullOrUndefined", isNullish),
        isNumber: predicate("util.isNumber", o => typeof o === "number"),
        isString: predicate("util.isString", o => typeof o === "string"),
        isSymbol: predicate("util.isSymbol", o => typeof o === "symbol"),
        isUndefined: predicate("util.isUndefined", o => o === undefined),
        isRegExp: predicate("util.isRegExp", o => speciesOf(o) === "RegExp"),
        isObject: predicate("util.isObject", isNonNullObject),
        isDate: predicate("util.isDate", o => speciesOf(o) === "Date"),
        isError: predicate("util.isError", isError),
        isFunction: predicate("util.isFunction", o => typeof o === "function"),
        isBigInt: predicate("util.isBigInt", o => typeof o === "bigint"),
        isJavaObject: predicate("util.isJavaObject", o => javaKind(o) === "object"),
        isJavaArray: predicate("util.isJavaArray", o => javaKind(o) === "array"),
        isInteger: predicate("util.isInteger", isInteger),
        isPrimitive: predicate("util.isPrimitive", o => !isReference(o)),
        isReference: predicate("util.isReference", isReference),
        isEmptyObject: predicate("util.isEmptyObject", isEmptyObject),
        extend: fixed("util.extend", 2, 2, extend),
        format: named("util.format", 0, format),
        deprecate: named("util.deprecate", 0, () => {
          host.warn(NOT_FOR_AUTOJS6);
        }),
        debuglog: named("util.debuglog", 0, () => {
          host.warn(NOT_FOR_AUTOJS6);
        }),
        log: named("util.log", 0, log),
        checkStringParam: fixed("util.checkStringParam", 2, 2, (src, pattern) => checkString("util.checkStringParam", src, pattern, true)),
        checkStringArgument: fixed("util.checkStringArgument", 2, 2, (src, pattern) => checkString("util.checkStringArgument", src, pattern, false)),
        assureStringStartsWith: fixed("util.assureStringStartsWith", 2, 2, (s, start) => {
          const text = string("util.assureStringStartsWith", "s", s);
          const prefix = string("util.assureStringStartsWith", "start", start);
          return text.startsWith(prefix) ? text : prefix + text;
        }),
        assureStringEndsWith: fixed("util.assureStringEndsWith", 2, 2, (s, end) => {
          const text = string("util.assureStringEndsWith", "s", s);
          const suffix = string("util.assureStringEndsWith", "end", end);
          return text.endsWith(suffix) ? text : text + suffix;
        }),
        assureStringSurroundsWith: fixed("util.assureStringSurroundsWith", 2, 3, (s, start, end) => {
          const fn = "util.assureStringSurroundsWith";
          const text = string(fn, "s", s);
          const prefix = string(fn, "start", start);
          return surround(text, prefix, isNullish(end) ? prefix : string(fn, "end", end));
        }),
        ensureType: fixed("util.ensureType", 2, 2, ensureType),
        ensureStringType: ensureEach("util.ensureStringType", "string"),
        ensureNumberType: ensureEach("util.ensureNumberType", "number"),
        ensureUndefinedType: ensureEach("util.ensureUndefinedType", "undefined"),
        ensureBooleanType: ensureEach("util.ensureBooleanType", "boolean"),
        ensureSymbolType: ensureEach("util.ensureSymbolType", "symbol"),
        ensureBigIntType: ensureEach("util.ensureBigIntType", "bigint"),
        ensureObjectType: ensureEach("util.ensureObjectType", "object"),
        ensureFunctionType: ensureEach("util.ensureFunctionType", "function"),
        ensureNonNullObjectType: named("util.ensureNonNullObjectType", 0, (...values) => {
          values.forEach((v, i) => {
            if (v === null) throw cannotBe("util.ensureNonNullObjectType", `values[${i}]`, v);
            if (typeof v !== "object") throw typeError("util.ensureNonNullObjectType", `values[${i}]`, "object", v);
          });
        }),
        ensureArrayType: named("util.ensureArrayType", 0, (...values) => {
          values.forEach((v, i) => {
            if (!Array.isArray(v)) throw typeError("util.ensureArrayType", `values[${i}]`, "Array", v);
          });
        }),
        toRegular: fixed("util.toRegular", 1, 1, toRegular),
        toRegularAndCall: obsoleted("toRegularAndCall"),
        toRegularAndApply: obsoleted("toRegularAndApply"),
        dpToPx: scaled("util.dpToPx", "dp", dpFactor, true),
        spToPx: scaled("util.spToPx", "sp", spFactor, true),
        pxToDp: scaled("util.pxToDp", "px", pxPerDp, false),
        pxToSp: scaled("util.pxToSp", "px", spFactor, false),
        java: host.utilJava,
        version,
        versionCodes,
        inspect,
        morseCode,
      };
      util.ensureBigintType = util.ensureBigIntType;
      Object.defineProperty(util, "__assignFunctions__", {
        value: fixed("util.__assignFunctions__", 3, 3, assignFunctions),
        writable: false,
        enumerable: false,
        configurable: false,
      });

      const SPECIES = ["Array", "ArrayBuffer", "BigInt", "Boolean", "Continuation", "DataView", "Date", "Error", "Float32Array",
        "Float64Array", "Function", "HTMLDocument", "Int16Array", "Int32Array", "Int8Array", "JavaObject", "JavaClass", "JavaPackage",
        "Map", "Namespace", "Null", "Number", "Object", "QName", "RegExp", "Set", "String", "Uint16Array", "Uint32Array", "Uint8Array",
        "Uint8ClampedArray", "Undefined", "WeakMap", "WeakSet", "Window", "XML", "XMLList"];
      const species = predicate("species", speciesOf);
      SPECIES.forEach(name => {
        species["is" + name] = predicate(`species.is${name}`, o => speciesOf(o) === name);
      });

      const global = {
        random: fixed("random", 0, 2, (...range) => {
          if (range.length === 0) return Math.random();
          if (range.length === 1) return NaN;
          const lower = toNum(range[0]);
          const upper = toNum(range[1]);
          return Math.floor(Math.random() * (upper - lower + 1)) + lower;
        }),
        isInteger: predicate("isInteger", isInteger),
        isPrimitive: predicate("isPrimitive", o => !isReference(o)),
        isObject: species.isObject,
        isReference: predicate("isReference", isReference),
        isBigInt: predicate("isBigInt", o => typeof o === "bigint"),
        isEmptyObject: predicate("isEmptyObject", isEmptyObject),
        isObjectSpecies: predicate("isObjectSpecies", isNonNullObject),
      };

      return {util, species, global};
    }
    const { Mathx, Arrayx, Numberx, jsox } = __autojs6_js_tools_jsox();
    // The earlier Node jsox also carried the three modules; kept and not enumerable, so its exports stay the host's.
    for (const [key, value] of [["mathx", Mathx], ["Mathx", Mathx], ["arrayx", Arrayx], ["Arrayx", Arrayx], ["numberx", Numberx], ["Numberx", Numberx]]) {
      Object.defineProperty(jsox, key, { value, configurable: true });
    }
    const bytes = __autojs6_js_tools_bytes();
    const java = __autojs6_js_tools_java(host);
    const { util, species, global } = __autojs6_js_tools_util({ device: host.device, log: host.log, warn: host.warn, vibrate: java.vibrate,
      utilJava: Object.freeze(java.utilJava), javaKind: java.javaKind });
    global.randomInt = Mathx.randomInt;
    global.randomFloat = Mathx.randomFloat;
    if (host.axios) Object.defineProperty(global, "axios", { get: host.axios, enumerable: true });
    return Object.freeze({
      util: Object.freeze(util), species: Object.freeze(species), global: Object.freeze(global),
      s13n: Object.freeze({ ...bytes.s13n, point: java.point, throwable: java.throwable }),
      formatter: bytes.fmt, converter: bytes.cvt, jsox, "jsox.mathx": Mathx, "jsox.arrayx": Arrayx, "jsox.numberx": Numberx
    });
  }
  // End shared JS tools core.
// END GENERATED JS TOOLS

// The display metrics and SDK level the plugin writes next to this module (util.dpToPx / spToPx / pxToDp / pxToSp,
// util.version.sdkInt), read as the Node runtime reads its device-info module; the same fallback outside the plugin.
function __autojs6_bun_device_info() {
  const number = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  let parsed = null;
  try { parsed = JSON.parse(readFileSync(new URL("./device-info.json", import.meta.url), "utf8")); } catch {}
  const info = {sdkInt: 0, density: 1, densityDpi: 0};
  if (parsed && typeof parsed === "object") {
    info.sdkInt = Math.max(0, Math.trunc(number(parsed.sdkInt, 0)));
    info.density = Math.max(0, number(parsed.density, 1));
    info.densityDpi = Math.max(0, Math.trunc(number(parsed.densityDpi, 0)));
  }
  info.scaledDensity = Math.max(0, number(parsed?.scaledDensity, info.density));
  if (typeof parsed?.externalStoragePath === "string") info.externalStoragePath = parsed.externalStoragePath;
  return Object.freeze(info);
}

export async function createHostClient(options = {}) {
  const socket = options.socket ?? globalThis.process?.env?.AUTOJS6_HOST_BRIDGE_SOCKET;
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof socket !== "string" || socket.length === 0) {
    throw new HostCallError("HOST_UNAVAILABLE", "This run did not receive an AutoJs6 host bridge");
  }
  if (typeof fetcher !== "function") throw new TypeError("A Bun-compatible fetch implementation is required");

  let inFlight = 0, eventReads = 0;
  const waiting = [];
  function scheduleNext() {
    while (inFlight < 4) {
      // UI long polls must leave a slot for the action/callback that can produce their event.
      const index = waiting.findIndex(item => !item.eventRead || eventReads < 3);
      if (index < 0) return;
      const item = waiting.splice(index, 1)[0];
      inFlight++; if (item.eventRead) eventReads++;
      Promise.resolve().then(item.action).then(item.resolve, item.reject).finally(() => {
        inFlight--; if (item.eventRead) eventReads--; scheduleNext();
      });
    }
  }
  function scheduled(action, eventRead = false) {
    return new Promise((resolve, reject) => { waiting.push({action, eventRead, resolve, reject}); scheduleNext(); });
  }

  async function request(path, capability, payload) {
    const init = { unix: socket };
    if (payload !== undefined) {
      init.method = "POST";
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload, (_key, value) => {
        if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("Host arguments must contain finite numbers");
        if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
          throw new TypeError("Host arguments must be JSON values");
        }
        return value;
      });
    }
    const eventRead = ['ui.layout','ui.compose'].includes(capability) &&
      (['viewEvents','drainEvents'].includes(payload?.method) || payload?.method === 'windowCommand' && payload.args?.[1] === 'drainEvents');
    return scheduled(async () => {
    init.signal = AbortSignal.timeout(15_000);
    let response;
    try {
      response = await fetcher(`http://autojs6/v1/${path}`, init);
    } catch (error) {
      throw new HostCallError(error?.name === "TimeoutError" ? "TIMEOUT" : "HOST_UNAVAILABLE", "Unable to reach the AutoJs6 host bridge", capability);
    }
    let reply;
    try { reply = await response.json(); } catch {
      throw new HostCallError("INVALID_RESPONSE", "The AutoJs6 host bridge returned invalid JSON", capability, response.status);
    }
    if (!isObject(reply) || typeof reply.ok !== "boolean") {
      throw new HostCallError("INVALID_RESPONSE", "The AutoJs6 host bridge returned an invalid envelope", capability, response.status);
    }
    if (!response.ok || !reply.ok) {
      throw new HostCallError(reply.error?.code ?? "INVALID_RESPONSE", reply.error?.message ?? "Host call failed", capability, response.status);
    }
    if (capability !== null && (reply.capability !== capability || !isObject(reply.result))) {
      throw new HostCallError("INVALID_RESPONSE", "The AutoJs6 host bridge returned a mismatched result", capability, response.status);
    }
    return capability === null ? reply : reply.result;
    }, eventRead);
  }

  const info = await request("info", null);
  if (info.bridgeVersion !== 1 || !Array.isArray(info.capabilities)
      || !info.capabilities.every(id => typeof id === "string") || !isObject(info.limits)) {
    throw new HostCallError("UNSUPPORTED_BRIDGE", "Unsupported AutoJs6 capability bridge info");
  }
  const capabilities = Object.freeze([...info.capabilities]);
  const grants = new Set(capabilities);
  const limits = Object.freeze({ ...info.limits });

  async function call(capability, payload = {}) {
    if (typeof capability !== "string" || !grants.has(capability)) {
      throw new HostCallError("NOT_GRANTED", `Capability is not granted for this execution: ${capability}`, capability);
    }
    if (!isObject(payload)) throw new TypeError("Host call payload must be an object");
    return request(capability, capability, payload);
  }

  // Long gestures/activation wait through short polls, preserving the fixed per-RPC limit.
  let activeAutomation=0;
  const automationWaiting=[];
  async function automationCall(...args) {
    if(args[0]==='java' && ['drainCallbacks','completeCallback','closeCallbacks'].includes(args[1]))
      return (await call('java.interop',{action:'callback',method:args[1],args:args[2]})).value;
    if(activeAutomation>=4)await new Promise(resolve=>automationWaiting.push(resolve));else activeAutomation++;
    try{return await performAutomationCall(...args);}
    finally{const next=automationWaiting.shift();if(next)next();else activeAutomation--;}
  }
  async function performAutomationCall(module, method, args, options = {}) {
    const capability = module === 'aiAgent' ? 'agent.control' : module === 'java' ? 'java.interop' : module === 'android' ? 'android.objects' : module === 'media' ? 'device.audio' : module === 'events' ? 'events.observe' : module === 'notifications' ? 'notifications.post' : module + '.control', timeoutMs = options.timeoutMs ?? 10000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new TypeError('Automation timeoutMs must be in 1..120000');
    if (module === 'device' && options.permissions?.includes('device.power') && !grants.has('device.power')) throw new HostCallError('NOT_GRANTED','Device power control requires device.power',capability);
    const signal = options.signal;
    if (signal !== undefined && !(signal instanceof AbortSignal)) throw new TypeError('signal must be an AbortSignal');
    if (signal?.aborted) throw signal.reason;
    if (module === 'accessibility' && ['swipe','gesture'].includes(method) && !grants.has('accessibility.gesture'))
      throw new HostCallError('NOT_GRANTED','Gestures require accessibility.gesture',capability);
    const id = (await call(capability, { action:'start', method, args, timeoutMs })).value?.id;
    if (typeof id !== 'string') throw new HostCallError('INVALID_RESPONSE','Missing automation task id',capability);
    let done = false;
    try {
      const deadline=Date.now()+timeoutMs+1000;
      while (true) {
        if (signal?.aborted) throw signal.reason;
        if (Date.now() > deadline) throw new HostCallError('TIMEOUT','Automation task timed out',capability);
        const result=(await call(capability,{action:'poll',id})).value;
        if (typeof result?.done !== 'boolean') throw new HostCallError('INVALID_RESPONSE','Invalid automation result',capability);
        if (result.done) {
          done=true;
          if (capability === 'agent.control' && result.error) throw new HostCallError(result.error.code, result.error.message, capability);
          return result.value;
        }
      }
    } finally { if(!done) await call(capability,{action:'cancel',id}).catch(()=>{}); }
  }
  const appInfo = grants.has('app.control') ? (await call('app.control',{action:'identity'})).value : null;
  if (appInfo !== null && (!isObject(appInfo) || typeof appInfo.packageName !== 'string' || typeof appInfo.versionName !== 'string' || !Number.isInteger(appInfo.versionCode)))
    throw new HostCallError('INVALID_RESPONSE','Invalid host application identity','app.control');
  const automation = createAutomation(automationCall, appInfo);
  let colors;
  const android = __autojs6_create_android(automationCall,value=>colors.toInt(value));
  colors = __autojs6_create_colors(android);
  const tasks = __autojs6_create_tasks(automationCall);
  const storage = createStorage(automationCall);
  const shellModules = __autojs6_create_shell(automationCall,EventEmitter,shellStreams,Buffer,
    required=>required.filter(name=>!grants.has(name==='shell'?'shell.control':name)),
    (message,code)=>new HostCallError(code==='ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED'?'NOT_GRANTED':'INVALID_REQUEST',message,'shell.control'));
  const events = __autojs6_create_host_events(automationCall,EventEmitter,undefined,
    (message)=>new HostCallError("INVALID_REQUEST",message,"events.observe"));
  const notifications = __autojs6_create_notifications(automationCall,
    (message)=>new HostCallError("INVALID_REQUEST",message,"notifications.post"));
  const sensors = __autojs6_create_sensors(automationCall, EventEmitter, undefined,
    (message,code)=>new HostCallError(code === "ERR_AUTOJS6_BRIDGE_TIMEOUT" ? "TIMEOUT" : "INVALID_REQUEST",message,"sensors.control"));
  const database = __autojs6_create_database((_,method,args,options)=>automationCall('database',method,args,options),
    (message,code,module,method)=>Object.assign(new HostCallError(
      code==='ERR_AUTOJS6_BRIDGE_PERMISSION_DENIED'?'NOT_GRANTED':code==='ERR_AUTOJS6_BRIDGE_RESOURCE_LIMIT'?'QUOTA_EXCEEDED':'INVALID_REQUEST',message,'database.control'),{method}),value=>value);
  const files = createFiles(async(method,args)=>(await call('files.control',{method,args})).value, __autojs6_bun_device_info());

  function group(capability) {
    return Object.freeze(Object.fromEntries(HOST_API_METHODS[capability].map(method => [method, async (...args) => {
      if (capability === "screen.metrics" && ["cX", "cY", "cXy", "cYx"].includes(method)
          && args.length > 0 && args[0] === undefined) {
        // An explicitly supplied undefined coordinate must not become [] (dimension query) or
        // JSON null (zero). Undefined optional base/mode slots still retain their normal defaults.
        throw new TypeError(`${method} requires a defined coordinate when an argument is supplied`);
      }
      // Omitting an optional trailing argument preserves the host overload/default; JSON null would not.
      while (args.length && args[args.length - 1] === undefined) args.pop();
      const result = await call(capability, { method, args });
      if (!Object.hasOwn(result, "value")) throw new HostCallError("INVALID_RESPONSE", "Host method result has no value", capability);
      if (capability === "console.control" || (capability === "screen.metrics" && method.startsWith("setScale"))) return undefined;
      return result.value;
    }])));
  }

  const convertText = group("text.opencc").convert;
  const opencc = async (text, type) => {
    if (text === null || text === undefined) throw new TypeError("OpenCC text must not be null or undefined");
    return convertText(String(text), String(type));
  };
  Object.assign(opencc, { convert: opencc });
  for (const type of OPENCC_CONVERSION_TYPES) opencc[type] = text => opencc(text, type);
  Object.freeze(opencc);

  const imageProcess = group("image.process");
  const imageFiles = group("image.files");
  const screenCapture = group("screen.capture");
  let capturePending = null;
  function requestScreenCapture(options = {}) {
    if (capturePending) return capturePending;
    let operation;
    operation = (async () => {
      if (!isObject(options)) throw new TypeError("Screen capture options must be an object");
      const timeout = options.timeoutMs ?? 120_000;
      if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) throw new TypeError("Consent timeoutMs must be an integer in 1..120000");
      const started = await screenCapture.requestScreenCapture(options);
      if (typeof started?.requestId !== "string") throw new HostCallError("INVALID_RESPONSE", "Missing consent request id", "screen.capture");
      const deadline = Date.now() + timeout + 5_000;
      while (Date.now() < deadline) {
        const result = await screenCapture.getRequestResult(started.requestId);
        if (result?.state === "granted") return true;
        if (result?.state !== "pending") throw new HostCallError("INVALID_RESPONSE", "Invalid consent state", "screen.capture");
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new HostCallError("TIMEOUT", "Screen capture consent timed out", "screen.capture");
    })().finally(() => { if (capturePending === operation) capturePending = null; });
    capturePending = operation;
    return operation;
  }
  const imageArgument = image => {
    const id = image?.__autojs6ImageHandle ?? image?.id;
    if (typeof id !== "string" || !id) throw new TypeError("An execution-owned image handle is required");
    return { id, __autojs6ImageHandle: id };
  };
  const imageResult = value => {
    const id = imageArgument(value).id;
    if (!Number.isInteger(value.width) || value.width < 1 || !Number.isInteger(value.height) || value.height < 1) {
      throw new HostCallError("INVALID_RESPONSE", "Host image dimensions are invalid");
    }
    return Object.freeze({ id, __autojs6ImageHandle: id, width: value.width, height: value.height });
  };
  const imageOptions = value => {
    if (value === undefined || value === null) return {};
    if (!isObject(value)) throw new TypeError("Image options must be an object");
    return { ...value };
  };
  const number = (value, label) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);
    return value;
  };
  const encodingOptions = (value, quality) => {
    const options = typeof value === "string" ? { format: value } : imageOptions(value);
    if (quality !== undefined) options.quality = quality;
    const format = options.format ?? "png";
    if (!["png", "jpg", "jpeg", "webp"].includes(format)) throw new TypeError("Bun image encoding must be png, jpg, jpeg or webp");
    return { ...options, format };
  };
  const bytesOf = value => {
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return Uint8Array.from(value);
    throw new TypeError("Encoded image bytes must be an ArrayBuffer, byte view or byte array");
  };
  const encodeBytes = bytes => {
    const parts = [];
    for (let start = 0; start < bytes.length; start += 8192) parts.push(String.fromCharCode(...bytes.subarray(start, start + 8192)));
    return btoa(parts.join(""));
  };
  const transform = async (method, image, options) => imageResult(await imageProcess[method](imageArgument(image), options));
  const images = {
    requestScreenCapture,
    captureScreen: async () => imageResult(await screenCapture.captureScreen()),
    stopScreenCapture: async () => {
      const stopped = await screenCapture.stopScreenCapture();
      capturePending = null;
      return stopped;
    },
    fromBase64: async value => {
      if (typeof value !== "string") throw new TypeError("Encoded image base64 must be a string");
      return imageResult(await imageProcess.fromBase64(value));
    },
    fromBytes: async value => images.fromBase64(encodeBytes(bytesOf(value))),
    readImage: async path => imageResult(await imageFiles.readImage(path)),
    saveImage: async (image, path, formatOrOptions, quality) => { await imageFiles.saveImage(imageArgument(image), path, encodingOptions(formatOrOptions, quality)); },
    toBase64: async (image, formatOrOptions, quality) => imageProcess.toBase64(imageArgument(image), encodingOptions(formatOrOptions, quality)),
    toBytes: async (image, formatOrOptions, quality) => {
      const encoded = await images.toBase64(image, formatOrOptions, quality);
      return Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    },
    pixel: async (image, x, y) => imageProcess.pixel(imageArgument(image), number(x, "x"), number(y, "y")),
    readPixels: async (image, options) => imageProcess.readPixels(imageArgument(image), imageOptions(options)),
    getSize: image => ({ width: imageResult(image).width, height: image.height }),
    copy: async image => imageResult(await imageProcess.copy(imageArgument(image))),
    clip: async (image, x, y, width, height) => transform("clip", image, {
      x: number(x, "x"), y: number(y, "y"), width: number(width, "width"), height: number(height, "height"),
    }),
    resize: async (image, width, height, options) => transform("resize", image, { ...imageOptions(options), width: number(width, "width"), height: number(height, "height") }),
    scale: async (image, fx, fyOrOptions, options) => transform("scale", image, {
      ...imageOptions(isObject(fyOrOptions) ? fyOrOptions : options), fx: number(fx, "fx"),
      ...(fyOrOptions === undefined || isObject(fyOrOptions) ? {} : { fy: number(fyOrOptions, "fy") }),
    }),
    rotate: async (image, degrees, centerXOrOptions, centerY) => transform("rotate", image, {
      ...imageOptions(isObject(centerXOrOptions) ? centerXOrOptions : undefined), degrees: number(degrees, "degrees"),
      ...(centerXOrOptions === undefined || isObject(centerXOrOptions) ? {} : { centerX: number(centerXOrOptions, "centerX") }),
      ...(centerY === undefined ? {} : { centerY: number(centerY, "centerY") }),
    }),
    flip: async (image, direction = "horizontal", vertical) => transform("flip", image, typeof direction === "boolean"
      ? { direction: direction ? (vertical ? "both" : "horizontal") : (vertical ? "vertical" : "none") }
      : typeof direction === "string" ? { direction } : imageOptions(direction)),
    grayscale: async image => transform("grayscale", image),
    threshold: async (image, options) => transform("threshold", image, imageOptions(options)),
    blur: async (image, size) => transform("blur", image, { size }),
    gaussianBlur: async (image, size, sigmaXOrOptions, sigmaY) => transform("gaussianBlur", image, {
      ...imageOptions(isObject(sigmaXOrOptions) ? sigmaXOrOptions : undefined), size,
      ...(sigmaXOrOptions === undefined || isObject(sigmaXOrOptions) ? {} : { sigmaX: number(sigmaXOrOptions, "sigmaX") }),
      ...(sigmaY === undefined ? {} : { sigmaY: number(sigmaY, "sigmaY") }),
    }),
    medianBlur: async (image, size) => transform("medianBlur", image, { size: number(size, "size") }),
    invert: async image => transform("invert", image),
    findImage: async (image, template, options) => imageProcess.findImage(imageArgument(image), imageArgument(template), imageOptions(options)),
    matchTemplate: async (image, template, options) => imageProcess.matchTemplate(imageArgument(image), imageArgument(template), imageOptions(options)),
    findColor: async (image, color, options) => imageProcess.findColor(imageArgument(image), color, imageOptions(options)),
    findMultiColors: async (image, color, points, options) => imageProcess.findMultiColors(imageArgument(image), color, points, imageOptions(options)),
    detectsColor: async (image, color, x, y, thresholdOrOptions) => imageProcess.detectsColor(imageArgument(image), color,
      number(x, "x"), number(y, "y"), typeof thresholdOrOptions === "number" ? { threshold: thresholdOrOptions } : imageOptions(thresholdOrOptions)),
    findAllPointsForColor: async (image, color, options) => imageProcess.findAllPointsForColor(imageArgument(image), color, imageOptions(options)),
    recycle: async image => { await (grants.has("image.process") ? imageProcess : imageFiles).recycle(imageArgument(image)); },
  };
  images.detectColor = images.detectsColor;
  images.findPointsByColor = images.findAllPointsForColor;
  const baseImages = { ...images };
  Object.assign(images, __autojs6_image_extensions(baseImages, async (method, args) => {
    const target = HOST_API_METHODS["image.files"].includes(method) ? imageFiles : method === "getScreenCaptureOptions" ? screenCapture : imageProcess;
    const value = await target[method](...args);
    if (value && value.__autojs6ImageHandle) return imageResult(value);
    if (value && (value.__autojs6MatHandle || value.__autojs6ImageFeaturesHandle)) return Object.freeze(value);
    return value;
  }, encoded => Uint8Array.from(atob(encoded), character => character.charCodeAt(0))));
  Object.freeze(images);

  const java = __autojs6_create_java(automationCall,{access:"public"},true,AsyncLocalStorage);
  // Local, as Rhino computes them; the Java-handle entries (util.java, s13n.point / throwable, morse vibration) use java.
  // global.axios is the embedded axios, created on first use.
  let axios = null;
  const jsTools = __autojs6_create_js_tools({device: __autojs6_bun_device_info(), java: () => java,
    log: text => globalThis.console.log(text), warn: text => globalThis.console.warn(text),
    axios: () => axios ??= __autojs6_bun_create_axios()});

  return Object.freeze({
    sdkVersion: SDK_VERSION,
    ...automation,
    flow: __autojs6_create_flow(automationCall,undefined,AsyncLocalStorage),
    mail: __autojs6_create_mail(automationCall),
    ai: __autojs6_create_ai(automationCall),
    epub: __autojs6_create_epub(automationCall),
    speech: __autojs6_create_speech(automationCall),
    tts: __autojs6_create_tts(automationCall),
    java,
    util: jsTools.util,
    species: jsTools.species,
    global: jsTools.global,
    s13n: jsTools.s13n,
    cvt: jsTools.converter,
    fmt: jsTools.formatter,
    jsox: jsTools.jsox,
    android,
    colors,
    tasks,
    ...storage,
    ...database,
    sensors,
    ...shellModules,
    events,
    notifications,
    files,
    mediainfo: createMediainfo(automationCall),
    bridgeVersion: info.bridgeVersion,
    capabilities,
    limits,
    hasCapability: capability => grants.has(capability),
    call,
    ui: __autojs6_create_ui(async (module, method, args) => (await call("ui.layout", { method, args })).value),
    compose: __autojs6_create_compose(async (module, method, args) => (await call(module === "ui" ? "ui.layout" : "ui.compose", { method, args })).value),
    toast: (text, duration) => call("ui.toast", { text, ...(duration === undefined ? {} : { duration }) }),
    device: Object.freeze({ ...__autojs6_create_device(automationCall), info: () => call("device.info") }),
    dialogs: __autojs6_create_dialogs(automationCall),
    pinyin: Object.freeze({...group("text.pinyin"), ...PINYIN_CONSTANTS}),
    pinyin4j: group("text.pinyin4j"),
    opencc,
    images,
    screenRecorder: group("screen.record"),
    coordinates: group("screen.metrics"),
    console: group("console.control"),
  });
}
