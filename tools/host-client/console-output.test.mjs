import assert from "node:assert/strict";
import test from "node:test";
import { createHostClient } from "../../app/src/main/assets/autojs6/host-client.mjs";

// Rhino's console output (AutoJs6 api-coverage P4.3, D-10, Q171 (a)): host.console prints through console.control's println
// route at Rhino's levels, or writes to stdout / stderr without the grant.
const limits = { maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000 };
async function client(grants, invoke = () => ({ value: null })) {
  const calls = [];
  const host = await createHostClient({ socket: "/private/bridge.sock", fetch: async (url, init) => {
    const id = url.split("/").at(-1);
    if (id === "info") return Response.json({ ok: true, bridgeVersion: 1, capabilities: grants, limits });
    const body = JSON.parse(init.body);
    calls.push({ id, ...body });
    return Response.json({ ok: true, capability: id, result: await invoke(id, body) });
  } });
  return { host, calls };
}
const turn = () => new Promise(resolve => setTimeout(resolve, 20));
// Collects the plain text lines written to stdout / stderr while action runs; the test runner's own reports pass through.
async function capture(action) {
  const written = [];
  const [stdout, stderr] = [process.stdout.write, process.stderr.write];
  const collect = (stream, original) => function (text, ...rest) {
    if (typeof text === "string" && /^[ -~]*\n$/.test(text)) { written.push([stream, text]); return true; }
    return original.call(this, text, ...rest);
  };
  process.stdout.write = collect("out", stdout);
  process.stderr.write = collect("err", stderr);
  try { await action(); } finally { [process.stdout.write, process.stderr.write] = [stdout, stderr]; }
  return written;
}

test("with console.control the lines of one turn go in one println call at Rhino's levels", async () => {
  const { host, calls } = await client(["console.control"]);
  assert.equal(host.console.log("a %d", 1), undefined);
  host.console.print("b");
  host.console.verbose("c");
  host.console.info({ d: 1 });
  host.console.warn("e");
  host.console.error("f");
  host.console.err("g");
  await turn();
  assert.deepEqual(calls, [{ id: "console.control", method: "println", args: [[["log", "a 1"], ["log", "b"], ["verbose", "c"], ["info", "{ d: 1 }"],
    ["warn", "e"], ["error", "f"], ["error", "g"]]] }]);
  host.console.log("next");
  await turn();
  assert.equal(calls.length, 2);
});

test("assert prints at assert level and throws, time / timeEnd print the label with milliseconds", async () => {
  const { host, calls } = await client(["console.control"]);
  assert.equal(host.console.assert(true, "fine"), host.console);
  assert.equal(host.console.assert(() => 1), host.console);
  assert.throws(() => host.console.assert(0, "broken"), error => error.name === "AssertionError" && error.message === "broken");
  assert.throws(() => host.console.assert(() => ""), error => error.message === "java.lang.AssertionError");
  assert.throws(() => host.console.assert(false, 1), TypeError);
  host.console.time("t");
  host.console.timeEnd("t");
  host.console.timeEnd("t");
  host.console.time();
  host.console.timeEnd(null);
  assert.throws(() => host.console.time(1), TypeError);
  await turn();
  const lines = calls.flatMap(call => call.args[0]);
  assert.deepEqual(lines.slice(0, 2), [["assert", "broken"], ["assert", "java.lang.AssertionError"]]);
  assert.match(lines[2][1], /^t: \d+ms$/);
  assert.deepEqual(lines[3], ["log", "t: NaNms"]);
  assert.match(lines[4][1], /^default: \d+ms$/);
});

test("trace prints the message and the caller's stack at its level, printAllStackTrace the stack at error", async () => {
  const { host, calls } = await client(["console.control"]);
  (function caller() { host.console.trace("here"); })();
  host.console.trace("w", "WARN");
  host.console.trace("v", 2);
  assert.throws(() => host.console.trace("x", "loud"), RangeError);
  assert.throws(() => host.console.trace("x", "3"), RangeError);
  assert.throws(() => host.console.trace("x", 7), RangeError);
  assert.throws(() => host.console.trace("x", {}), TypeError);
  const error = new Error("boom");
  host.console.printAllStackTrace(error);
  host.console.printAllStackTrace("text");
  await turn();
  const lines = calls.flatMap(call => call.args[0]);
  assert.equal(lines[0][0], "log");
  assert.match(lines[0][1], /^here\n\s+at caller /);
  assert.deepEqual([lines[1][0], lines[2][0]], ["warn", "verbose"]);
  assert.deepEqual(lines.slice(3), [["error", error.stack], ["error", "text"]]);
});

test("without console.control (Q171 (a)) the text goes to stdout, or stderr for warn / error / assert", async () => {
  const { host, calls } = await client([]);
  const written = await capture(async () => {
    host.console.log("a");
    host.console.info("b");
    host.console.warn("c");
    host.console.error("d");
    assert.throws(() => host.console.assert(false, "e"));
    await turn();
  });
  assert.equal(calls.length, 0);
  assert.deepEqual(written, [["out", "a\n"], ["out", "b\n"], ["err", "c\n"], ["err", "d\n"], ["err", "e\n"]]);
  await assert.rejects(host.console.show(), error => error.code === "NOT_GRANTED");
});

test("a failed println call falls back to stdout / stderr; long turns split below the request limit", async () => {
  let reject = true;
  const { host, calls } = await client(["console.control"], () => {
    if (reject) throw new Error("host down");
    return { value: null };
  });
  const written = await capture(async () => {
    host.console.log("lost");
    host.console.error("too");
    await turn();
  });
  assert.deepEqual(written, [["out", "lost\n"], ["err", "too\n"]]);
  reject = false;
  calls.length = 0;
  for (let i = 0; i < 4; i++) host.console.log("x".repeat(20_000));
  await turn();
  assert.deepEqual(calls.map(call => call.args[0].length), [2, 2]);
});

test("Rhino's global console names are host.console members", async () => {
  const { host, calls } = await client(["console.control"]);
  await host.console.openConsole();
  await host.console.showConsole(true);
  await host.console.clearConsole();
  await host.console.launchConsole();
  assert.deepEqual(calls.map(call => [call.method, call.args]), [["show", []], ["show", [true]], ["clear", []], ["launch", []]]);
  assert.equal(host.console.err, host.console.error);
});

test("Rhino's other window controls are console.control routes; isShowing answers the host's value", async () => {
  const { host, calls } = await client(["console.control"], (id, body) => ({ value: body.method === "isShowing" ? true : null }));
  assert.equal(await host.console.isShowing(), true);
  assert.equal(await host.console.setGravity("center"), undefined);
  await host.console.setAvoidStatusBar();
  await host.console.configure({ title: "t", size: [400, 600], timeVisible: false });
  assert.deepEqual(calls.map(call => [call.method, call.args]), [["isShowing", []], ["setGravity", ["center"]], ["setAvoidStatusBar", []],
    ["configure", [{ title: "t", size: [400, 600], timeVisible: false }]]]);
});

test("rawInput prints the prompt first, then polls the host's line request; input evaluates the line", async () => {
  let polls = 0;
  const lines = ["6 * 7", null];
  const { host, calls } = await client(["console.control"], (id, body) => {
    if (body.method === "rawInput") return { value: `request-${calls.filter(call => call.method === "rawInput").length}` };
    if (body.method === "rawInputPoll") return { value: ++polls % 2 ? { done: false } : { done: true, text: lines.shift() } };
    return { value: null };
  });
  assert.equal(await host.console.input("value %d?", 1), 42);
  assert.deepEqual(calls.map(call => [call.method, call.args]), [["println", [[["log", "value 1?"]]]], ["rawInput", []],
    ["rawInputPoll", ["request-1"]], ["rawInputPoll", ["request-1"]]]);
  await assert.rejects(host.console.rawInput(), error => error.code === "ERR_AUTOJS6_BRIDGE_CANCELLED");
  assert.equal(calls.filter(call => call.method === "println").length, 1);
  await assert.rejects((await client([])).host.console.rawInput("x"), error => error.code === "NOT_GRANTED");
});
