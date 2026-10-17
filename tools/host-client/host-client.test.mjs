import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHostClient, HostCallError, HOST_API_METHODS, SDK_VERSION } from "../../app/src/main/assets/autojs6/host-client.mjs";

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
});
