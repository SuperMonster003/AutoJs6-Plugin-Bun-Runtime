/** Explicit Bun client for AutoJs6's per-execution capability bridge. No globals are installed. */
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
      "cardCornerRadius", "cardElevation", "src", "scaleType", "adjustViewBounds"];
    const readonlyViewProperties = ["attached", "layoutWidth", "layoutHeight", "drawableWidth", "drawableHeight"];
    const nativeViews = new Map();
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
      const emit = event => {
        if (closed) return;
        if (event.type === "close") closed = true;
        for (const callback of [...listeners.get(event.type) || [], ...listeners.get("*") || []]) callback.call(output, Object.freeze(event));
        if (closed) { listeners.clear(); nativeViews.delete(value.__autojs6ViewHandle); }
      };
      async function poll() {
        if (reading || closed) return; reading = true;
        try {
          while (!closed && [...listeners.values()].some(list => list.length)) {
            for (const event of await nativeCall("viewEvents", [value])) emit(event);
          }
        } catch (error) { emit({ type: "error", message: error.message }); emit({ type: "close" }); }
        finally { reading = false; }
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
        findView: { value: name => findView(value, name) },
        dispose: { value: async () => {
          if (closed) return;
          let failure; try { await flush(); } catch (error) { failure = error; }
          await nativeCall("disposeView", [value]); emit({ type: "close" });
          if (failure) throw failure;
        } },
        on: { value: on }, once: { value: once }, off: { value: off }
      });
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
    bridgeVersion: info.bridgeVersion,
    capabilities,
    limits,
    hasCapability: capability => grants.has(capability),
    call,
    ui: __autojs6_create_ui(async (module, method, args) => (await call("ui.layout", { method, args })).value),
    compose: __autojs6_create_compose(async (module, method, args) => (await call(module === "ui" ? "ui.layout" : "ui.compose", { method, args })).value),
    toast: (text, duration) => call("ui.toast", { text, ...(duration === undefined ? {} : { duration }) }),
    device: Object.freeze({ info: () => call("device.info") }),
    pinyin: group("text.pinyin"),
    pinyin4j: group("text.pinyin4j"),
    opencc,
    images,
    screenRecorder: group("screen.record"),
    coordinates: group("screen.metrics"),
    console: group("console.control"),
  });
}
