import assert from "node:assert/strict";
import test from "node:test";
import { createHostClient } from "../../app/src/main/assets/autojs6/host-client.mjs";

// Rhino's toast family (AutoJs6 api-coverage P4.3, Q172 (a)): toast with Rhino's isLong / isForcible forms, toast.dismissAll,
// and the global toastLog / toastVerbose / toastInfo / toastWarn / toastError (and lower-case aliases) on host.global.
const limits = { maxRequestBytes: 65536, maxResultBytes: 262144, maxCallsPerExecution: 1024, maxConcurrentCalls: 4, callTimeoutMillis: 10000 };
async function client(grants = ["ui.toast", "console.control"]) {
  const calls = [];
  const host = await createHostClient({ socket: "/private/bridge.sock", fetch: async (url, init) => {
    const id = url.split("/").at(-1);
    if (id === "info") return Response.json({ ok: true, bridgeVersion: 1, capabilities: grants, limits });
    const body = JSON.parse(init.body);
    calls.push({ id, ...body });
    return Response.json({ ok: true, capability: id, result: id === "ui.toast" ? (body.dismissAll ? { dismissed: true } : { shown: true }) : { value: null } });
  } });
  return { host, calls };
}
const turn = () => new Promise(resolve => setTimeout(resolve, 20));

test("toast takes Rhino's isLong / isForcible forms and keeps the original payload for text alone", async () => {
  const { host, calls } = await client();
  assert.deepEqual(await host.toast("plain"), { shown: true });
  await host.toast(12, true);
  await host.toast("a", "L");
  await host.toast("b", "short");
  await host.toast("c", "f");
  await host.toast("d", false, "long");
  await host.toast("e", 0, 1);
  await host.toast(undefined, null, null);
  assert.deepEqual(calls.map(({ id, ...body }) => body), [{ text: "plain" }, { text: "12", duration: "long" }, { text: "a", duration: "long" },
    { text: "b" }, { text: "c", forcible: true }, { text: "d", duration: "long" }, { text: "e", forcible: true }, { text: "undefined" }]);
  assert.throws(() => host.toast("x", "loud"), TypeError);
  assert.throws(() => host.toast("x", false, "never"), TypeError);
});

test("toast.dismissAll sends the dismissAll request and resolves undefined", async () => {
  const { host, calls } = await client();
  assert.equal(await host.toast.dismissAll(), undefined);
  assert.deepEqual(calls, [{ id: "ui.toast", dismissAll: true }]);
});

test("the toast globals show the toast, then print the first argument at their console level", async () => {
  const { host, calls } = await client();
  const global = host.global;
  assert.deepEqual(await global.toastLog("l", true), { shown: true });
  await global.toastVerbose("v");
  await global.toastInfo("i", false, true);
  await global.toastWarn("w");
  await global.toastError("e");
  await global.toastlog();
  await turn();
  assert.deepEqual(calls.filter(call => call.id === "ui.toast").map(call => call.text), ["l", "v", "i", "w", "e", "undefined"]);
  assert.deepEqual(calls.filter(call => call.id === "console.control").flatMap(call => call.args[0]),
    [["log", "l"], ["verbose", "v"], ["info", "i"], ["warn", "w"], ["error", "e"], ["log", ""]]);
  for (const name of ["toastLog", "toastVerbose", "toastInfo", "toastWarn", "toastError"]) assert.equal(global[name.toLowerCase()], global[name]);
  assert.throws(() => global.toastInfo(), TypeError);
  assert.throws(() => global.toastLog(1, 2, 3, 4), TypeError);
  assert.equal(global.isUiThread(), false);
});

test("host.global.install puts the toast globals on the target without replacing its own names", async () => {
  const { host } = await client();
  const target = { toastWarn: "mine" };
  const names = host.global.install(target);
  assert.ok(names.includes("toastLog") && names.includes("toasterror") && names.includes("isUiThread") && !names.includes("toastWarn"));
  assert.equal(target.toastLog, host.global.toastLog);
  assert.equal(target.toastWarn, "mine");
  assert.equal(Object.keys(target).includes("toastLog"), false);
  target.toastLog = 1;
  assert.equal(target.toastLog, 1);
});
