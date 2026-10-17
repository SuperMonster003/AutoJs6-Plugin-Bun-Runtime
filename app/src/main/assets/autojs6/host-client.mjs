/** Explicit Bun client for AutoJs6's per-execution capability bridge. No globals are installed. */
export const SDK_VERSION = 1;

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
      // Omitting an optional trailing argument preserves the host overload/default; JSON null would not.
      while (args.length && args[args.length - 1] === undefined) args.pop();
      const result = await call(capability, { method, args });
      if (!Object.hasOwn(result, "value")) throw new HostCallError("INVALID_RESPONSE", "Host method result has no value", capability);
      if (capability === "console.control" || (capability === "screen.metrics" && method.startsWith("setScale"))) return undefined;
      return result.value;
    }])));
  }

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
    coordinates: group("screen.metrics"),
    console: group("console.control"),
  });
}
