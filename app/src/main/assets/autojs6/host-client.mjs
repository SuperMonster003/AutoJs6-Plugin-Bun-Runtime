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
export async function createHostClient(options = {}) {
  const socket = options.socket ?? globalThis.process?.env?.AUTOJS6_HOST_BRIDGE_SOCKET;
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof socket !== "string" || socket.length === 0) {
    throw new HostCallError("HOST_UNAVAILABLE", "This run did not receive an AutoJs6 host bridge");
  }
  if (typeof fetcher !== "function") throw new TypeError("A Bun-compatible fetch implementation is required");

  async function request(path, capability, payload) {
    const init = { unix: socket, signal: AbortSignal.timeout(15_000) };
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
