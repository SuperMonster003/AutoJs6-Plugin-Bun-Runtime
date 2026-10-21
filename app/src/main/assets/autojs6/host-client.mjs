import {AsyncLocalStorage} from 'node:async_hooks';
import * as shellStreams from "node:stream";
import {EventEmitter} from "node:events";
/** Explicit Bun client for AutoJs6's per-execution capability bridge. No globals are installed. */
import {posix as filePath} from 'node:path';
import {Buffer} from 'node:buffer';
export const SDK_VERSION = 1;

export const OPENCC_CONVERSION_TYPES = Object.freeze([
  "hk2s", "hk2t", "jp2t", "s2hk", "s2t", "s2tw", "s2twp", "t2hk", "t2s", "t2tw", "t2jp", "tw2s", "tw2t", "tw2sp",
  "s2twi", "twi2s", "s2jp", "t2twi", "hk2tw", "hk2twi", "hk2jp", "tw2hk", "tw2twi", "tw2jp",
  "twi2t", "twi2hk", "twi2tw", "twi2jp", "jp2s", "jp2hk", "jp2tw", "jp2twi",
]);

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
  "mail.control": Object.freeze(["open","start","poll","cancel","answer","close"]),
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
  "files.control": Object.freeze(["path", "read", "write", "append", "exists", "listDir", "remove", "copy", "move", "ensureDir", "isFile", "isDir"]),
  "storage.control": Object.freeze(["get", "put", "remove", "clear", "keys", "contains"]),
  "app.control": Object.freeze(["launchPackage", "launchApp", "openAppSetting", "startActivity", "getPackageName", "getAppName", "isInstalled", "viewFile", "editFile", "startService", "sendBroadcast", "getInstalledApps", "getPackageInfo"]),
  "accessibility.control": Object.freeze(["isEnabled", "ensureEnabled", "click", "back", "home", "recentApps", "findByText", "clickText", "findOne", "findAll", "longClick", "setText", "scrollForward", "scrollBackward", "swipe", "gesture"]),
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

function createFiles(dispatch) {
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
  return Object.freeze(result);
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
      async function webTask(name, args, ordered = false) {
        usable(); startingWebTasks++; poll();
        try {
          await subscribeEvents();
          // Only submission occupies the UI command queue; user decisions do not hold a Bun RPC open.
          const task = await (ordered ? command(name, args) : directWebCommand(name, args)); usable();
          return await new Promise((resolve, reject) => {
            webTasks.set(task.taskId, { resolve, reject });
            const early = earlyWebTasks.get(task.taskId);
            if (early) { earlyWebTasks.delete(task.taskId); settleWebTask(early); }
          });
        } finally { startingWebTasks--; if (!startingWebTasks) earlyWebTasks.clear(); }
      }
      function chooseFiles(options = {}) { return webTask("chooseFiles", [options]); }
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
        cancelFileChooser: { value: async () => { await directWebCommand("cancelFileChooser", []); } },
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

export async function createHostClient(options = {}) {
  const socket = options.socket ?? globalThis.process?.env?.AUTOJS6_HOST_BRIDGE_SOCKET;
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof socket !== "string" || socket.length === 0) {
    throw new HostCallError("HOST_UNAVAILABLE", "This run did not receive an AutoJs6 host bridge");
  }
  if (typeof fetcher !== "function") throw new TypeError("A Bun-compatible fetch implementation is required");

  let inFlight = 0;
  const waiting = [];
  async function scheduled(action) {
    if (inFlight >= 4) await new Promise(resolve => waiting.push(resolve)); else inFlight++;
    try { return await action(); }
    finally { const next = waiting.shift(); if (next) next(); else inFlight--; }
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
    });
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
    const capability = module === 'java' ? 'java.interop' : module === 'android' ? 'android.objects' : module === 'media' ? 'device.audio' : module === 'events' ? 'events.observe' : module === 'notifications' ? 'notifications.post' : module + '.control', timeoutMs = options.timeoutMs ?? 10000;
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
        if (result.done) { done=true; return result.value; }
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
  const files = createFiles(async(method,args)=>(await call('files.control',{method,args})).value);

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

  return Object.freeze({
    sdkVersion: SDK_VERSION,
    ...automation,
    mail: __autojs6_create_mail(automationCall),
    epub: __autojs6_create_epub(automationCall),
    speech: __autojs6_create_speech(automationCall),
    tts: __autojs6_create_tts(automationCall),
    java: __autojs6_create_java(automationCall,{access:"public"},true,AsyncLocalStorage),
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
    pinyin: group("text.pinyin"),
    pinyin4j: group("text.pinyin4j"),
    opencc,
    images,
    screenRecorder: group("screen.record"),
    coordinates: group("screen.metrics"),
    console: group("console.control"),
  });
}
