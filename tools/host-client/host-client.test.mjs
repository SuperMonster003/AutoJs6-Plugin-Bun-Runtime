import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostClient, HostCallError, HOST_API_METHODS, OPENCC_CONVERSION_TYPES, SDK_VERSION } from "../../app/src/main/assets/autojs6/host-client.mjs";

const capabilities = ["ui.toast", "device.info", ...Object.keys(HOST_API_METHODS)];
const limits = { maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000 };
function transport(grants = capabilities, invoke = () => ({ value: null })) {
  const requests = [];
  return {
    requests,
    async fetch(url, init) {
      requests.push({ url, init });
      const id = url.split("/").at(-1);
      assert.equal(init.unix, "/private/bridge.sock");
      assert.ok(init.signal instanceof AbortSignal);
      if (id === "info") return Response.json({ ok: true, bridgeVersion: 1, capabilities: grants, limits });
      return Response.json({ ok: true, capability: id, result: invoke(id, JSON.parse(init.body)) });
    },
  };
}
async function client(fake) { return createHostClient({ socket: "/private/bridge.sock", fetch: fake.fetch }); }

test("screen consent polls without extending ordinary transport calls and deduplicates concurrent requests", async () => {
  let polls = 0;
  const image = {id:"capture",__autojs6ImageHandle:"capture",width:320,height:240};
  const fake = transport(capabilities, (id, {method,args}) => {
    assert.equal(id,"screen.capture");
    if (method === "requestScreenCapture") { assert.deepEqual(args,[{timeoutMs:120000}]); return {value:{requestId:"consent"}}; }
    if (method === "getRequestResult") { assert.deepEqual(args,["consent"]); return {value:{state:++polls === 1 ? "pending" : "granted"}}; }
    return {value:method === "captureScreen" ? image : true};
  });
  const host = await client(fake);
  const pending = host.images.requestScreenCapture({timeoutMs:120000});
  assert.equal(host.images.requestScreenCapture(),pending);
  assert.equal(await pending,true);
  assert.equal(polls,2);
  assert.deepEqual(await host.images.captureScreen(),image);
  assert.equal(await host.images.stopScreenCapture(),true);
  assert.equal(fake.requests.filter(r=>r.init.body?.includes('"method":"requestScreenCapture"')).length,1);
});

test("screen capture requires its own grant and rejects malformed or denied consent", async () => {
  const denied = await client(transport(["image.process"]));
  for (const method of ["requestScreenCapture","captureScreen","stopScreenCapture"]) await assert.rejects(denied.images[method](),{code:"NOT_GRANTED"});
  const fake = transport(capabilities, () => ({value:{requestId:"attempt"}}));
  const fetch = fake.fetch;
  fake.fetch = async (url,init) => init.body?.includes('"getRequestResult"')
    ? Response.json({ok:false,capability:"screen.capture",error:{code:"NOT_GRANTED",message:"User declined"}},{status:403}) : fetch(url,init);
  const host = await client(fake);
  await assert.rejects(host.images.requestScreenCapture(),{code:"NOT_GRANTED"});
  await assert.rejects(host.images.requestScreenCapture({timeoutMs:Infinity}),TypeError);
  await assert.rejects((await client(transport())).images.requestScreenCapture(),{code:"INVALID_RESPONSE"});
});

test("negotiates per-run grants and does not install Rhino globals", async () => {
  const fake = transport(["device.info"]);
  const before = Object.keys(globalThis);
  const host = await client(fake);
  assert.equal(host.sdkVersion, SDK_VERSION);
  assert.deepEqual(host.capabilities, ["device.info"]);
  assert.equal(host.hasCapability("text.pinyin"), false);
  await assert.rejects(host.pinyin.simple("北京上海"), { code: "NOT_GRANTED" });
  assert.equal(fake.requests.length, 1, "denied calls must not reach the transport");
  assert.deepEqual(Object.keys(globalThis), before);
  assert.ok(Object.isFrozen(host.capabilities));
});

test("sends full text, conversion options and dictionary-external characters to the host", async () => {
  const calls = [];
  const fake = transport(capabilities, (id, payload) => {
    calls.push({ id, ...payload });
    return { value: payload.method === "convert" ? [["běi"], ["jīng"]] : "bei jing shang hai" };
  });
  const host = await client(fake);
  assert.equal(await host.pinyin.simple("北京上海"), "bei jing shang hai");
  assert.deepEqual(await host.pinyin.convert("北京", { style: "TONE", heteronym: true }), [["běi"], ["jīng"]]);
  assert.deepEqual(calls, [
    { id: "text.pinyin", method: "simple", args: ["北京上海"] },
    { id: "text.pinyin", method: "convert", args: ["北京", { style: "TONE", heteronym: true }] },
  ]);
});

test("keeps matrix and null results, without the old toy dictionary or string-only compact", async () => {
  const fake = transport(capabilities, (_id, payload) => ({ value: payload.method === "fromCodePoint" ? null : [["zhāo", "yáng"], ["cháo", "yáng"]] }));
  const host = await client(fake);
  assert.equal(await host.pinyin.fromCodePoint(0x1f642), null);
  assert.deepEqual(await host.pinyin.compact([["zhāo", "cháo"], ["yáng"]]), [["zhāo", "yáng"], ["cháo", "yáng"]]);
  assert.deepEqual(await host.pinyin4j.readings("朝阳", { romanization: "HANYU_PINYIN" }), [["zhāo", "yáng"], ["cháo", "yáng"]]);
});

test("OpenCC callable, convert and all 32 aliases reach the real conversion route", async () => {
  const calls = [];
  const host = await client(transport(capabilities, (id, payload) => {
    calls.push({ id, ...payload });
    return { value: "漢語轉換" };
  }));
  assert.equal(await host.opencc("汉语转换", "s2t"), "漢語轉換");
  assert.equal(await host.opencc.convert(123, "S2T"), "漢語轉換");
  assert.equal(new Set(OPENCC_CONVERSION_TYPES).size, 32);
  for (const type of OPENCC_CONVERSION_TYPES) assert.equal(await host.opencc[type]("汉语转换"), "漢語轉換");
  assert.deepEqual(calls.slice(0, 2), [
    { id: "text.opencc", method: "convert", args: ["汉语转换", "s2t"] },
    { id: "text.opencc", method: "convert", args: ["123", "S2T"] },
  ]);
  assert.deepEqual(calls.slice(2).map(call => call.args[1]), [...OPENCC_CONVERSION_TYPES]);
  assert.ok(calls.every(call => call.id === "text.opencc" && call.method === "convert"));
  await assert.rejects(host.opencc(null, "s2t"), TypeError);
  await assert.rejects(host.opencc.s2t(undefined), TypeError);
  const deniedTransport = transport(["device.info"]);
  const denied = await client(deniedTransport);
  await assert.rejects(denied.opencc.s2t("汉字"), { code: "NOT_GRANTED" });
  assert.equal(deniedTransport.requests.length, 1);
});

test("image codecs preserve bytes and offsets while file access uses its own grant", async () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAFklEQVR4nGP4z8DwHwgbGCDgPxiAGAB5qQp3ze/uggAAAABJRU5ErkJggg==";
  const encoded = Uint8Array.from(atob(png), value => value.charCodeAt(0));
  const calls = [];
  let next = 0;
  const fake = transport(capabilities, (id, payload) => {
    calls.push({ id, ...payload });
    if (["fromBase64", "readImage", "copy"].includes(payload.method)) return { value: { id: `image-${++next}`, width: 3, height: 2 } };
    if (payload.method === "toBase64") return { value: png };
    if (payload.method === "pixel") return { value: -65536 };
    if (payload.method === "readPixels") return { value: { data: [-65536, -2147418368, 0, -16776961, -1, -16777216], width: 3, height: 2 } };
    return { value: true };
  });
  const host = await client(fake);
  const image = await host.images.fromBase64(png);
  assert.ok(Object.isFrozen(image));
  const padded = Uint8Array.from([99, ...encoded, 88]);
  const decoded = await host.images.fromBytes(padded.subarray(1, -1));
  assert.equal(calls[1].args[0], png, "byte views must not include bytes outside their offset/length");
  const copiedBytes = await host.images.toBytes(decoded, "png");
  assert.ok(copiedBytes instanceof Uint8Array);
  assert.deepEqual(copiedBytes, encoded);
  assert.equal(await host.images.pixel(image, 0, 0), -65536);
  assert.deepEqual((await host.images.readPixels(image)).data, [-65536, -2147418368, 0, -16776961, -1, -16777216]);
  await host.images.saveImage(image, "pattern.png", { format: "png" });
  await host.images.readImage("pattern.png");
  assert.deepEqual(calls.filter(call => ["readImage", "saveImage"].includes(call.method)).map(call => call.id), ["image.files", "image.files"]);
  await host.images.recycle(image);
  assert.deepEqual(copiedBytes, encoded, "encoded byte copies outlive the host bitmap");
  const before = fake.requests.length;
  await assert.rejects(host.images.toBytes(decoded, "rgba"), TypeError);
  await assert.rejects(host.images.fromBytes([256]), TypeError);
  await assert.rejects(host.images.pixel(decoded, undefined, 0), TypeError);
  assert.equal(fake.requests.length, before);
  const limited = await client(transport(["image.process"]));
  await assert.rejects(limited.images.readImage("private.png"), { code: "NOT_GRANTED" });
  await assert.rejects(limited.images.saveImage(decoded, "private.png"), { code: "NOT_GRANTED" });
});

test("image transforms retain their arguments and never recycle the input implicitly", async () => {
  const calls = [];
  const source = { id: "source", __autojs6ImageHandle: "source", width: 3, height: 2 };
  const host = await client(transport(capabilities, (id, payload) => {
    calls.push({ id, ...payload });
    return { value: { id: `derived-${calls.length}`, width: 3, height: 2 } };
  }));
  await host.images.copy(source);
  await host.images.clip(source, 0, 0, 2, 1);
  await host.images.resize(source, 6, 4, { interpolation: "nearest" });
  await host.images.scale(source, 2, 3, { interpolation: "linear" });
  await host.images.rotate(source, 90, { filter: false });
  await host.images.flip(source, false, false);
  await host.images.grayscale(source);
  await host.images.threshold(source, { threshold: 100, maxValue: 200, type: "binary_inv" });
  await host.images.blur(source, [3, 5]);
  await host.images.gaussianBlur(source, 3, { sigmaX: 1.2, sigmaY: 0.8 });
  await host.images.medianBlur(source, 3);
  await host.images.invert(source);
  assert.deepEqual(calls.map(call => call.method), ["copy", "clip", "resize", "scale", "rotate", "flip", "grayscale", "threshold", "blur", "gaussianBlur", "medianBlur", "invert"]);
  assert.ok(calls.every(call => call.id === "image.process" && call.args[0].id === source.id));
  assert.deepEqual(calls[3].args[1], { interpolation: "linear", fx: 2, fy: 3 });
  assert.deepEqual(calls[4].args[1], { filter: false, degrees: 90 });
  assert.deepEqual(calls[5].args[1], { direction: "none" });
  assert.deepEqual(calls[9].args[1], { sigmaX: 1.2, sigmaY: 0.8, size: 3 });
  assert.deepEqual(host.images.getSize(source), { width: 3, height: 2 });
});

test("pixel searches retain signed ARGB values and public aliases use canonical routes", async () => {
  const calls = [];
  const image = { id: "sample" };
  const host = await client(transport(capabilities, (id, payload) => {
    calls.push({ id, ...payload });
    return { value: payload.method === "detectsColor" ? true : [] };
  }));
  assert.equal(await host.images.detectColor(image, -65536, 0, 0, 0), true);
  await host.images.findPointsByColor(image, -65536, { threshold: 0 });
  await host.images.findMultiColors(image, "#ff0000", [[1, 0, -1]], { threshold: 0 });
  await host.images.findImage(image, { id: "template" }, { threshold: 0.9 });
  await host.images.matchTemplate(image, { id: "template" }, { max: 2 });
  assert.deepEqual(calls.map(call => call.method), ["detectsColor", "findAllPointsForColor", "findMultiColors", "findImage", "matchTemplate"]);
  assert.equal(calls[0].args[1], -65536);
  assert.deepEqual(calls[0].args[4], { threshold: 0 });
});

test("coordinate calls retain overload positions, explicit ratio and large finite numbers", async () => {
  const calls = [];
  const fake = transport(capabilities, (_id, payload) => { calls.push(payload); return { value: 540 }; });
  const host = await client(fake);
  await host.coordinates.cX();
  await host.coordinates.cX(360, undefined, false);
  await host.coordinates.cXy(0.5, "16:9", "auto");
  await host.coordinates.cYx(1e100, 1280, false);
  assert.deepEqual(calls, [
    { method: "cX", args: [] },
    { method: "cX", args: [360, null, false] },
    { method: "cXy", args: [0.5, "16:9", "auto"] },
    { method: "cYx", args: [1e100, 1280, false] },
  ]);
});

test("rejects NaN and infinity before JSON can turn them into null", async () => {
  const fake = transport();
  const host = await client(fake);
  for (const number of [NaN, Infinity, -Infinity]) {
    await assert.rejects(host.coordinates.cX(number), TypeError);
    await assert.rejects(host.coordinates.cY(0.5, number), TypeError);
    await assert.rejects(host.coordinates.setScaleBases(720, number), TypeError);
  }
  assert.equal(fake.requests.length, 1);
});

test("distinguishes an omitted coordinate from explicit undefined and preserves optional defaults", async () => {
  const fake = transport(capabilities, () => ({ value: 540 }));
  const host = await client(fake);
  for (const name of ["cX", "cY", "cXy", "cYx"]) {
    await assert.rejects(host.coordinates[name](undefined), TypeError);
    await assert.rejects(host.coordinates[name](undefined, 720, false), TypeError);
  }
  assert.equal(fake.requests.length, 1, "invalid explicit coordinates must not reach the host");
  await host.coordinates.cX();
  await host.coordinates.cY();
  await host.coordinates.cX(0.5, undefined, undefined);
  await host.coordinates.cXy(0.5, undefined, true);
  assert.deepEqual(fake.requests.slice(1).map(request => JSON.parse(request.init.body)), [
    { method: "cX", args: [] }, { method: "cY", args: [] },
    { method: "cX", args: [0.5] }, { method: "cXy", args: [0.5, null, true] },
  ]);
});

test("console controls are real asynchronous calls and native console stays unchanged", async () => {
  const nativeConsole = globalThis.console;
  const calls = [];
  const host = await client(transport(capabilities, (id, payload) => { calls.push({ id, ...payload }); return { value: null }; }));
  assert.equal(await host.console.show(), undefined);
  await host.console.setTitle("Bun 测试");
  await host.console.setContentTextColors("#ffffff", 0xff000000);
  await host.console.hide();
  assert.equal(globalThis.console, nativeConsole);
  assert.deepEqual(calls.map(call => [call.id, call.method]), [
    ["console.control", "show"], ["console.control", "setTitle"], ["console.control", "setContentTextColors"], ["console.control", "hide"],
  ]);
});

test("preserves bridge failures, without retries or fabricated successful values", async () => {
  const fake = transport();
  const fetch = fake.fetch;
  fake.fetch = async (url, init) => url.endsWith("/info") ? fetch(url, init) : Response.json({
    ok: false, capability: "text.pinyin", error: { code: "HOST_UNAVAILABLE", message: "Pinyin provider is disabled" },
  }, { status: 503 });
  const host = await client(fake);
  await assert.rejects(host.pinyin.simple("北京"), error => error instanceof HostCallError
    && error.code === "HOST_UNAVAILABLE" && error.status === 503 && error.capability === "text.pinyin");
});

test("rejects absent bridges, unsupported negotiations and malformed responses", async () => {
  await assert.rejects(createHostClient({ socket: "" }), { code: "HOST_UNAVAILABLE" });
  await assert.rejects(createHostClient({ socket: "s", fetch: async () => Response.json({ ok: true, bridgeVersion: 2, capabilities, limits }) }), { code: "UNSUPPORTED_BRIDGE" });
  await assert.rejects(createHostClient({ socket: "s", fetch: async () => new Response("not JSON") }), { code: "INVALID_RESPONSE" });
  const host = await client(transport(capabilities, () => ({})));
  await assert.rejects(host.coordinates.getInfo(), { code: "INVALID_RESPONSE" });
});

test("old toast and device calls keep the original payload and result contract", async () => {
  const fake = transport(capabilities, (id, body) => id === "ui.toast" ? { shown: true } : { model: "device", ...body });
  const host = await client(fake);
  assert.deepEqual(await host.toast("Bun"), { shown: true });
  assert.equal(await host.device.info().then(value => value.model), "device");
  assert.deepEqual(JSON.parse(fake.requests[1].init.body), { text: "Bun" });
});

test("every delivered method has a declaration and a callable wrapper", async () => {
  const declaration = readFileSync(new URL("../../app/src/main/assets/autojs6/host-client.d.mts", import.meta.url), "utf8");
  const mapping = { "text.pinyin": ["pinyin", "PinyinApi"], "text.pinyin4j": ["pinyin4j", "Pinyin4jApi"], "screen.metrics": ["coordinates", "CoordinateApi"], "console.control": ["console", "ConsoleApi"] };
  const host = await client(transport());
  for (const [capability, [key, interfaceName]] of Object.entries(mapping)) {
    const body = declaration.split(`export interface ${interfaceName} {`)[1].split("\n}")[0];
    const declared = [...new Set([...body.matchAll(/^\s+(\w+)\(/gm)].map(match => match[1]))].sort();
    assert.deepEqual(declared, [...HOST_API_METHODS[capability]].sort(), `${key} declarations and delivered wrappers differ`);
    for (const name of HOST_API_METHODS[capability]) {
      assert.match(body, new RegExp(`\\b${name}\\(`), `${key}.${name} declaration missing`);
      assert.equal(typeof host[key][name], "function", `${key}.${name} wrapper missing`);
    }
  }
  const imageBody = declaration.split("export interface ImagesApi {")[1].split("\n}")[0];
  const imageMethods = [...new Set([...imageBody.matchAll(/^\s+(\w+)\(/gm)].map(match => match[1]))].sort();
  assert.deepEqual(Object.keys(host.images).sort(), imageMethods);
  for (const method of [...HOST_API_METHODS["image.process"], ...HOST_API_METHODS["image.files"]]) assert.equal(typeof host.images[method], "function");
  assert.deepEqual(Object.keys(host.opencc).sort(), ["convert", ...OPENCC_CONVERSION_TYPES].sort());
});
