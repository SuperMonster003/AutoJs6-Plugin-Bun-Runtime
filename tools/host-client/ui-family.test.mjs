import assert from "node:assert/strict";
import test from "node:test";
import { createHostClient } from "../../app/src/main/assets/autojs6/host-client.mjs";

// Rhino's UI family (AutoJs6 api-coverage P4.3): the shared UI facade's floaty, web, terminal and console.build over the Bun
// grants floaty.control / floaty.raw / floaty.touch (Q173 (a)), terminal.control (Q3 (a)), console.control and ui.layout
// (Q174 (a)), with web.newWebSocket on Bun's own WebSocket.
const limits = { maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000 };
const FAMILY = ["floaty.control", "floaty.raw", "floaty.touch", "terminal.control", "console.control", "ui.layout", "clipboard.control"];
async function client(grants = FAMILY, answer = () => null) {
  const calls = [];
  const host = await createHostClient({ socket: "/private/bridge.sock", fetch: async (url, init) => {
    const id = url.split("/").at(-1);
    if (id === "info") return Response.json({ ok: true, bridgeVersion: 1, capabilities: grants, limits });
    const body = JSON.parse(init.body);
    calls.push({ id, ...body });
    // Long-wait tasks (terminal, clipboard) start, then answer the first poll.
    if (body.action === "start") return Response.json({ ok: true, capability: id, result: { value: { id: "task-" + body.method } } });
    if (body.action === "poll") return Response.json({ ok: true, capability: id, result: { value: answer(id, body) ?? { done: true, value: null } } });
    return Response.json({ ok: true, capability: id, result: { value: answer(id, body) } });
  } });
  return { host, calls };
}

test("the family's modules, console.build and the web globals are present", async () => {
  const { host } = await client();
  for (const name of ["window", "rawWindow", "closeAll", "hasPermission", "checkPermission", "requestPermission", "ensurePermission", "getClip"])
    assert.equal(typeof host.floaty[name], "function", name);
  for (const name of ["newWebSocket", "newInjectableWebView", "newInjectableWebClient"]) assert.equal(typeof host.web[name], "function", name);
  assert.equal(typeof host.web.ByteString.encodeUtf8, "function");
  for (const name of ["open", "sessions", "session", "close", "closeAll", "show", "state", "isAvailable", "exec", "env", "execAsync"])
    assert.equal(typeof host.terminal[name], "function", name);
  assert.equal(typeof host.terminal.npm.run, "function");
  assert.equal(typeof host.console.build, "function");
  assert.equal(host.global.newWebSocket, host.web.newWebSocket);
  assert.equal(host.global.ComposeError, host.compose.ComposeError);
  const target = {};
  const names = host.global.install(target);
  for (const name of ["newWebSocket", "newInjectableWebView", "newInjectableWebClient", "ComposeError", "toastLog", "isUiThread"]) assert(names.includes(name), name);
  assert.equal(target.isUiThread(), false);
  assert.equal(host.web.ByteString.encodeUtf8("hi").hex(), "6869");
});

test("floaty windows ride floaty.control; raw windows and setTouchable need their own grants before the host", async () => {
  const { host, calls } = await client(["floaty.control"]);
  await assert.rejects(host.floaty.rawWindow("<frame/>"), error => error.code === "NOT_GRANTED" && error.missingCapabilities.join() === "floaty.raw");
  await assert.rejects(host.floaty.getClip(), error => error.code === "NOT_GRANTED" && error.missingCapabilities.join() === "clipboard.control");
  assert.deepEqual(calls, []);
  assert.equal(await host.floaty.closeAll(), 0);
  assert.equal(await host.floaty.hasPermission(), false);
  assert.deepEqual(calls.map(({ id, method }) => [id, method]), [["floaty.control", "floatyCloseAll"], ["floaty.control", "hasPermission"]]);
  const { host: denied, calls: none } = await client([]);
  await assert.rejects(denied.floaty.window("<frame/>"), error => error.code === "NOT_GRANTED" && error.missingCapabilities.join() === "floaty.control");
  await assert.rejects(denied.terminal.state(), error => error.code === "NOT_GRANTED" && error.missingCapabilities.join() === "terminal.control");
  assert.deepEqual(none, []);
});

test("a floaty window's views go through floaty.control when ui.layout is off", async () => {
  const { host, calls } = await client(["floaty.control", "floaty.touch"], (id, body) => body.method === "floatyRawWindow" || body.method === "floatyWindow"
    ? { id: "floaty-1", rootView: { __autojs6ViewHandle: "v1", id: "v1", type: "FrameLayout" } } : null);
  await assert.rejects(host.floaty.rawWindow("<frame/>"), error => error.missingCapabilities?.join() === "floaty.raw");
  const window = await host.floaty.window("<frame id='box'/>");
  assert.equal(window.id, "floaty-1");
  await window.setPosition(10, 20);
  assert(calls.every(call => call.id === "floaty.control"), JSON.stringify(calls.map(call => [call.id, call.method])));
  assert(calls.some(call => call.method === "floatyControl" && call.args[1] === "setPosition"));
  await window.close();
  assert.equal(calls.at(-1).method, "close");
  assert(calls.every(call => call.id === "floaty.control"));
});

test("terminal calls are long-wait tasks of terminal.control and their failures are TerminalError", async () => {
  const { host, calls } = await client(FAMILY, (id, body) => body.id === "task-state" ? { done: true, value: "available" }
    : body.id === "task-open" ? { done: true, error: { code: "PLUGIN_UNAVAILABLE", message: "install 3-Shell Terminal" } } : null);
  assert.equal(await host.terminal.state(), "available");
  const start = calls.find(call => call.action === "start");
  assert.deepEqual([start.id, start.method, start.args], ["terminal.control", "state", []]);
  await assert.rejects(host.terminal.open(), error => error.name === "TerminalError" && error.code === "PLUGIN_UNAVAILABLE");
  const open = calls.filter(call => call.action === "start").at(-1);
  assert.equal(open.timeoutMs, 60000);
});

test("console.build records the options and show applies them with console.control configure", async () => {
  const { host, calls } = await client();
  const configurator = host.console.build({ title: "logs" }).setSize(400, 600);
  assert.equal(configurator.title, "logs");
  await configurator.show();
  const configure = calls.find(call => call.method === "configure");
  assert.equal(configure.id, "console.control");
  assert.equal(configure.args[0].title, "logs");
});
