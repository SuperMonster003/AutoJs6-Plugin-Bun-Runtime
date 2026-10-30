import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHostClient, HOST_API_METHODS} from "../../app/src/main/assets/autojs6/host-client.mjs";

// The system information and engines family (api-coverage P4.1b): grants, routes and the engine record of the client.
function transport(grants, answer = () => null) {
  const starts = [], requests = [];
  let next = 0;
  const tasks = new Map();
  return {starts, requests, async fetch(url, init) {
    const id = url.split("/").at(-1);
    if (id === "info") return Response.json({ok: true, bridgeVersion: 1, capabilities: grants, limits: {}});
    const body = JSON.parse(init.body);
    requests.push([id, body]);
    if (body.action === "identity") return Response.json({ok: true, capability: id, result: {value: {packageName: "org.autojs.autojs6", versionName: "6.8.0", versionCode: 5935}}});
    if (body.action === "start") {
      starts.push({capability: id, module: body.module, method: body.method, args: body.args, timeoutMs: body.timeoutMs});
      const task = "t" + ++next;
      tasks.set(task, answer(body.method, body.args, body.module));
      return Response.json({ok: true, capability: id, result: {value: {id: task}}});
    }
    if (body.action === "poll") return Response.json({ok: true, capability: id, result: {value: {done: true, value: tasks.get(body.id)}}});
    return Response.json({ok: true, capability: id, result: {value: true}});
  }};
}
const client = fake => createHostClient({socket: "/private/bridge.sock", fetch: fake.fetch});

test("the family's query grants have the host's routes and the client exposes Rhino's namespaces", async () => {
  assert.deepEqual(HOST_API_METHODS["engines.control"], ["myEngine", "all", "stopAll", "stopSelf", "execScript", "execScriptFile", "list", "stop", "execAutoFile", "stopAllAndToast"]);
  assert.deepEqual(HOST_API_METHODS["plugintools.control"], ["list", "invoke", "cancel"]);
  const fake = transport([]);
  const host = await client(fake);
  for (const name of ["autojs", "installer", "memory", "settings", "sysprops", "powerManager", "engines", "plugins"]) assert.equal(typeof host[name], "object", name);
  assert.equal(host.app.autojs, host.autojs);
  assert.equal(typeof host.dialogs.build, "function");
  for (const name of ["currentPackage", "currentActivity", "currentComponent", "waitForActivity", "waitForPackage", "exit", "stop", "isStopped",
    "isShuttingDown", "notStopped", "isRunning", "requiresApi", "requiresAutojsVersion", "setScreenMetrics", "getClip", "setClip"]) {
    assert.equal(typeof host.global[name], "function", name);
  }
  assert.equal(host.global.isAutoJs6, true);
  assert.equal(host.global.isStopped(), false);
  assert.deepEqual(fake.requests, [], "building the family must not call the host");
});

test("a call whose Bun grants are off rejects NOT_GRANTED with the missing grants before the host", async () => {
  const fake = transport(["autojs.control", "settings.control", "installer.control", "memory.control", "engines.control", "device.control", "notifications.post"]);
  const host = await client(fake);
  const before = fake.requests.length;
  for (const [call, missing] of [
    [() => host.autojs.setRootMode("root"), ["autojs.manage"]],
    [() => host.autojs.restart("@"), ["autojs.manage"]],
    [() => host.settings.setEnabled("key", true), ["settings.write"]],
    [() => host.settings.export(), ["files.control"]],
    [() => host.installer.install("a.apk"), ["installer.mutate"]],
    [() => host.memory.dumpHeap(), ["memory.dump"]],
    [() => host.engines.execScript("a", "1"), ["engines.exec"]],
    [() => host.powerManager.isIgnoringBatteryOptimizations(), ["device.power"]],
    [() => host.notifications.ensureEnabled(), ["notifications.settings"]],
    [() => host.plugins.tools.list(), ["plugintools.control"]],
    [() => host.sysprops.get("ro.build.type"), ["sysprops.control"]],
  ]) {
    await assert.rejects(call(), error => error.code === "NOT_GRANTED" && assert.deepEqual([...error.missingCapabilities], missing) === undefined);
  }
  assert.equal(fake.requests.length, before, "denied entries must not reach the host");
});

test("the notice extras and powerManager name their Node module under their Bun grants; long installs and tools wait 15 min", async () => {
  const fake = transport(["notifications.post", "notifications.settings", "device.control", "device.power", "installer.control", "installer.mutate",
    "plugintools.control", "plugintools.usergranted"], method => method === "list" ? {tools: [{name: "t"}], providers: []} : method === "install" ? {value: {ok: true}} : true);
  const host = await client(fake);
  assert.equal(await host.notifications.isEnabled(), true);
  assert.equal(await host.powerManager.isIgnoringBatteryOptimizations("org.example"), true);
  await host.installer.install("a.apk");
  assert.deepEqual(await host.plugins.tools.list(), [{name: "t"}]);
  assert.deepEqual(fake.starts.map(start => [start.capability, start.module, start.method]), [
    ["notifications.post", "notice", "isEnabled"], ["device.control", "power_manager", "isIgnoringBatteryOptimizations"],
    ["installer.control", undefined, "install"], ["plugintools.control", undefined, "list"],
  ]);
  assert.equal(fake.starts[2].timeoutMs, 905000);
});

test("the engine record: the host's record with engines.control, else the host info snapshot", async () => {
  const directory = mkdtempSync(join(tmpdir(), "bun-system-"));
  const file = join(directory, "host-info.json");
  writeFileSync(file, JSON.stringify({hostInfoVersion: 1, host: {packageName: "org.autojs.autojs6", versionName: "6.8.0 Beta2", versionCode: 5935, versionDate: "Oct 30, 2026"},
    execution: {executionId: "bun-engine-1", sourceName: "main.js", workspaceArchive: false}}));
  const saved = process.env.AUTOJS6_HOST_INFO_FILE;
  process.env.AUTOJS6_HOST_INFO_FILE = file;
  try {
    const plain = await client(transport([]));
    assert.equal(plain.autojs.versionName, "6.8.0 Beta2");
    assert.equal(plain.autojs.versionCode, 5935);
    assert.equal(plain.autojs.versionDate, "Oct 30, 2026");
    assert.equal(plain.autojs.name, "AutoJs6");
    assert.equal(plain.autojs.version.isAtLeast("6.8.0", true), true);
    assert.equal(plain.autojs.version.isLowerThan("6.8.0"), true);
    assert.deepEqual({...plain.engines.myEngine()}, {id: "bun-engine-1", engineName: "bun", backend: "plugin", sourceName: "main.js", cwd: "", spawnDepth: 0,
      processName: "", pid: process.pid, packageName: "org.autojs.autojs6", versionName: "6.8.0 Beta2", versionCode: 5935, startedAt: 0});
    const record = {id: "bun-engine-1", engineName: "bun", sourceName: "main.js", cwd: "/sdcard/Scripts", spawnDepth: 1, pid: 42, appName: "AutoJs6",
      packageName: "org.autojs.autojs6", versionName: "6.8.0 Beta2", versionCode: 5935, versionDate: "Oct 30, 2026", startedAt: 7};
    const fake = transport(["engines.control", "engines.exec", "autojs.control", "autojs.manage"], method => method === "myEngine" ? record : null);
    const host = await client(fake);
    assert.deepEqual(fake.starts.map(start => [start.capability, start.method]), [["engines.control", "myEngine"]]);
    assert.equal(host.engines.myEngine().cwd, "/sdcard/Scripts");
    assert.equal(host.engines.myEngine().spawnDepth, 1);
    await assert.rejects(host.engines.execScript("a", "1"), /one level/);
    await host.autojs.restart("@");
    assert.deepEqual(fake.starts.at(-1).args, [["/sdcard/Scripts/main.js"]]);
  } finally {
    if (saved === undefined) delete process.env.AUTOJS6_HOST_INFO_FILE; else process.env.AUTOJS6_HOST_INFO_FILE = saved;
    rmSync(directory, {recursive: true, force: true});
  }
});
