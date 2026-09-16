# M7 设计稿 (第二部分): 运行期动态调用能力桥与前两项动态能力 (`ui.toast`, `device.info`)

状态: 已实现并验收, 2026-09-16 (用户决定: 第二项能力同时做 toast 与 device.info; 开关放在插件自身的设置页). 实现: 插件 `BunHostBridgeHttp` / `BunHostBridgeDispatcher` / `BunHostBrokerClient` / `BunHostBridgeServer`, 宿主 `BunHostCapabilityBroker`; 与本稿的唯一偏差是监听 socket 经 `android.net.LocalSocket` 绑定 (公开 SDK 没有 unix `SocketAddress`), 其余 (accept/读写/关闭) 在原始描述符上用 `Os` 完成. 本稿是 [第一部分](m7-host-capability-bridge.md) 第 2 节 "动态调用 (未来)" 一行的展开, 定义 Bun 脚本在运行期调用宿主的完整链路: 脚本 -> 插件 (unix socket 上的 HTTP/1.1) -> 宿主 (Binder 代理, oneway + 回调) -> 能力实现. 第一部分的通用框架 (协商, 授权, 版本, 可信来源, 大小, 资源归属, 命名空间) 全部继续适用.

## 1. 目标与边界

- 目标: 让脚本在运行期以窄接口调用宿主能力, 每项能力独立协商, 独立授权, 独立撤销, 独立限额; 插件只做有界的中继, 不解释能力语义.
- 首批两项动态能力: `ui.toast` (宿主弹出 Toast) 与 `device.info` (只读设备信息). 它们分别代表 "有副作用的 UI 调用" 与 "只读查询" 两类, 足以把通道, 配额, 超时, 并发与撤销全部走一遍.
- AIDL `IBunRuntimePlugin` 的五个事务与签名不变; 宿主的代理对象随 `runScript` 请求 Bundle 传入 (`putBinder`), 因此不需要在插件服务上追加事务: 旧插件忽略未知键, 旧宿主不发送. `PROTOCOL_VERSION`, `EXECUTION_MODEL`, `SOURCE_TRANSPORT` 与 `runScript` 终态错误码集合不变.
- 不是安全边界: 脚本以插件 UID 运行, socket 只对同一 UID 可达; 宿主端按调用方 UID 与执行 ID 钉住每个代理, 代理只在本次执行存活.

## 2. 方案选型

| 决策 | 选择 | 理由与放弃的替代方案 |
|---|---|---|
| 脚本到插件的通道 | 本次运行私有的 **unix domain socket (文件系统命名空间)**, 上面跑 **HTTP/1.1** | Bun 1.4.0 原生支持 `fetch(url, { unix })`, `Bun.connect({ unix })`, 脚本零依赖, 不装 preload/shim (第一部分第 8 节). 放弃 loopback TCP: 设备上任何 UID 都能连 127.0.0.1 端口, 需要令牌且受 Android 17 本地网络策略牵连. 放弃抽象命名空间 socket: 不受文件权限保护. 放弃继承 fd: 需改 supervisor, 且 Bun 对继承 fd 建 socket 无稳定 API |
| socket 位置 | `<cacheDir>/bun-bridge/<12 hex>.sock`, 目录 0700 | `sun_path` 上限 108 字节; 放在 `<workspace>/autojs6/` 下会超限 (执行 ID 最长 128). 目录仍在插件私有数据区, 随本次执行创建与删除; 这是资源归属规则唯一的例外, 快照文件等数据产物仍在 workspace 内 |
| 插件到宿主 | 新 AIDL `IBunHostCapabilityBroker` (oneway `invoke(request, callback)`) + `IBunHostCapabilityCallback` (oneway `onResult(result)`) | 与宿主仓库 Lua 代理 (`ILuaHostCapabilityBroker.invoke`) 同型. oneway 让插件永不阻塞在远端事务里, 超时与取消都是本地等待; 同步 `Bundle invoke()` 在宿主卡死时会占住插件的中继线程 |
| 代理传递 | `runScript` 请求键 `hostCapabilityBridgeVersion`, `hostCapabilityBroker` (IBinder), `hostCapabilities` (已授权能力 ID 列表) | 代理天然按执行作用域; 无需新事务; 撤销 = 不发送 (与 `hostInfo` 一致). 放弃 `getBrokerInfo()` 同步事务: 授权列表随请求给出即可 |
| 能力负载 | 请求与结果都是 **JSON 字符串** (`hostCallRequestJson` / `hostCallResultJson`), 插件只检查大小与 UTF-8 | 插件不解释能力语义, 新增能力只改宿主 (实现 + 授权列表), 插件无需发版 |
| 调用语义 | 每次 HTTP 请求 = 一次代理调用, 至多 4 路并发, 每次执行至多 1024 次, 单次 10 s 超时 | 与宿主 MCP 代理 (4 并发) 与 Lua 代理 (1024 次/执行) 对齐; 超限即刻失败 (429), 不排队, 与插件 `BUSY` 的 fail-fast 一致 |
| 默认授权 | `ui.toast` 与 `device.info` 默认开启, 用户可在插件设置页单独关闭 | 第一部分规则 "默认值按能力风险决定": toast 有每次执行 4 条 / 1024 字节配额 (沿用 Lua), 设备信息只读且不含标识符 |

## 3. 共享契约新增 (AutoJs6 `plugin-api/bun-runtime-api`)

`BunRuntimeContract` 新增 (全部附加式):

| 常量 | 值 | 语义 |
|---|---|---|
| `HOST_CAPABILITY_BRIDGE_VERSION` | `1` | 动态桥协议版本 (HTTP 接口 + 代理 Bundle 布局) |
| `HOST_BRIDGE_ENVIRONMENT_VARIABLE` | `"AUTOJS6_HOST_BRIDGE_SOCKET"` | Bun 进程内 socket 文件的绝对路径 |
| `MAX_HOST_CAPABILITY_COUNT` | `64` | 一次请求里的授权能力数上限 |
| `MAX_HOST_CAPABILITY_ID_BYTES` | `64` | 能力 ID 长度上限; 形如 `[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+` (至少一个点, 因此不会与 `/v1/info` 冲突) |
| `MAX_HOST_CALL_REQUEST_BYTES` | `64 KiB` | 单次调用请求 JSON 上限 (HTTP body 与代理请求相同) |
| `MAX_HOST_CALL_RESULT_BYTES` | `256 KiB` | 单次调用结果 JSON 上限 (远低于 Binder 1 MiB 事务缓冲) |
| `MAX_HOST_CALLS_PER_EXECUTION` | `1024` | 每次执行的调用总数上限 (含失败的调用) |
| `MAX_CONCURRENT_HOST_CALLS` | `4` | 同时在途的调用数上限 |
| `HOST_CALL_TIMEOUT_MILLIS` | `10_000` | 单次调用从发出到收到回调的上限 |
| `KEY_HOST_CAPABILITY_BRIDGE_VERSION` | `"hostCapabilityBridgeVersion"` | 请求 int; 缺席 = 不提供动态桥; 存在则必须等于 1 |
| `KEY_HOST_CAPABILITY_BROKER` | `"hostCapabilityBroker"` | 请求 IBinder (`putBinder`), 实现 `IBunHostCapabilityBroker` |
| `KEY_HOST_CAPABILITIES` | `"hostCapabilities"` | 请求 `ArrayList<String>`, 已授权的能力 ID, 1..64 项, 无重复 |
| `KEY_HOST_CALL_ID` | `"hostCallId"` | 代理请求/结果 string, 本次执行内唯一 |
| `KEY_HOST_CAPABILITY` | `"hostCapability"` | 代理请求 string, 能力 ID |
| `KEY_HOST_CALL_REQUEST_JSON` | `"hostCallRequestJson"` | 代理请求 string, JSON 对象 |
| `KEY_HOST_CALL_RESULT_JSON` | `"hostCallResultJson"` | 代理结果 string, JSON 对象 (仅成功时) |
| `KEY_HOST_BRIDGE_DELIVERED` | `"hostBridgeDelivered"` | 终态 boolean, 仅在请求携带桥键时出现 |
| `KEY_HOST_CALLS` | `"hostCalls"` | 终态 int, 本次执行中继的调用数, 仅在请求携带桥键时出现 |
| `HOST_CAPABILITY_UI_TOAST` | `"ui.toast"` | 能力 ID |
| `HOST_CAPABILITY_DEVICE_INFO` | `"device.info"` | 能力 ID |
| `HOST_CALL_ERROR_INVALID_REQUEST` … | 见第 5 节 | 桥级错误码 (JSON 与代理结果 `errorCode` 共用), 不是 `runScript` 终态错误码 |

代理结果复用现有键 `executionId`, `succeeded`, `errorCode`, `errorMessage`.

新 AIDL (与 `IBunRuntimeCallback` 同目录):

```text
oneway interface IBunHostCapabilityCallback { void onResult(in Bundle result); }
oneway interface IBunHostCapabilityBroker  { void invoke(in Bundle request, IBunHostCapabilityCallback callback); }
```

`BunPluginCapabilityKeys` 新增 `SUPPORTS_HOST_CAPABILITY_BRIDGE = "org.autojs.plugin.bun.SUPPORTS_HOST_CAPABILITY_BRIDGE"` (boolean). `REQUIRES_HOST_VERSION` 不提升: 旧宿主只是不发送新键.

## 4. 脚本侧接口 (插件在 socket 上提供的 HTTP/1.1)

宿主未提供动态桥时 `AUTOJS6_HOST_BRIDGE_SOCKET` 不存在, 脚本应自行判断.

| 方法与路径 | 请求 | 成功响应 (200) |
|---|---|---|
| `GET /v1/info` | 无 body | `{"ok":true,"bridgeVersion":1,"capabilities":["ui.toast","device.info"],"limits":{"maxRequestBytes":65536,"maxResultBytes":262144,"maxCallsPerExecution":1024,"maxConcurrentCalls":4,"callTimeoutMillis":10000}}` |
| `POST /v1/<capabilityId>` | body 为 JSON 对象 (可为 `{}`), `Content-Type` 不检查, 必须带 `Content-Length` | `{"ok":true,"capability":"<id>","result":{…}}` |

失败响应 body 一律为 `{"ok":false,"capability":"<id 或 null>","error":{"code":"<桥级错误码>","message":"<诊断文本>"}}`, HTTP 状态按错误码映射 (第 5 节). 响应带 `Connection: close`; 不支持 keep-alive, chunked 请求体, `Expect: 100-continue` 与其它路径 (404). 请求行 <= 1 KiB, 头部合计 <= 8 KiB, body <= 64 KiB; 读写各 5 s 空闲超时, 超时即关闭连接.

```ts
"bun";
const unix = process.env.AUTOJS6_HOST_BRIDGE_SOCKET;
if (!unix) throw new Error("the host did not offer the capability bridge");
const call = async (id: string, body: object = {}) => {
  const response = await fetch(`http://autojs6/v1/${id}`, { unix, method: "POST", body: JSON.stringify(body) });
  const reply = await response.json();
  if (!reply.ok) throw new Error(`${reply.error.code}: ${reply.error.message}`);
  return reply.result;
};
console.log(await call("device.info"));                 // {"brand":…,"model":…,"sdkInt":33,…}
await call("ui.toast", { text: "hello from Bun" });     // {"shown":true}
```

## 5. 桥级错误码与状态映射

| 错误码 | HTTP | 产生方 | 含义 |
|---|---|---|---|
| `INVALID_REQUEST` | 400 | 插件或宿主 | 请求行/头部/JSON 不合法, 能力 ID 形状不对, 参数不符合能力约定 |
| `NOT_GRANTED` | 403 | 插件 | 能力 ID 合法但不在本次执行的授权列表里 (插件不区分 "宿主不认识" 与 "用户未授权") |
| `UNKNOWN_CAPABILITY` | 404 | 宿主 | 授权列表里的 ID 宿主却没有实现 (防御性), 或 HTTP 路径不是 `/v1/…` |
| `PAYLOAD_TOO_LARGE` | 413 | 插件或宿主 | 请求超过 64 KiB 或结果超过 256 KiB |
| `TOO_MANY_REQUESTS` | 429 | 插件 | 已有 4 路在途调用, 或本次执行已达 1024 次 |
| `QUOTA_EXCEEDED` | 429 | 宿主 | 能力自身的配额用尽 (如 toast 每次执行 4 条) |
| `TIMEOUT` | 504 | 插件 | 10 s 内没有收到宿主回调 |
| `HOST_UNAVAILABLE` | 503 | 插件 | 宿主代理已死亡 (`binderDied`) 或本次执行已进入收尾 |
| `INTERNAL` | 500 | 插件或宿主 | 其它异常; 诊断不回显路径 |

## 6. 插件侧接入 (`BunRuntimeService.runScript`)

```text
parse(request):
  if request has hostCapabilityBridgeVersion:
      version == 1; broker = getBinder(hostCapabilityBroker) != null
      capabilities: 1..64 个 ID, 每个匹配 ID 形状且 <= 64 字节, 无重复      # 否则 INVALID_REQUEST
gate -> probe -> createWorkspace -> prepareExecution -> materializeHostInfo (现状)
  if request.hostBridge:
      bridge = BunHostBridge.start(hostBridge, callingUid, executionId)
          socket: <cacheDir>/bun-bridge/<12 hex>.sock (目录 0700), Os.socket/bind/listen
          accept 线程 + 有界处理线程 (<= 8); 每连接读超时 5 s; 解析 HTTP; 分派:
            GET /v1/info               -> 授权列表与上限
            POST /v1/<id>              -> 形状检查 -> 授权检查 -> 总数/并发配额 -> 代理调用
          代理调用: callId = "<executionId>#<n>"; broker.invoke(Bundle{executionId, hostCallId, hostCapability, hostCallRequestJson}, callback)
                    等待 callback.onResult <= 10 s; onResult 校验 Binder 调用方 UID == 宿主 UID 且 callId 在途
          broker.linkToDeath -> 之后所有调用 HOST_UNAVAILABLE, 在途调用立即失败
      env AUTOJS6_HOST_BRIDGE_SOCKET = socket 路径
execute(...)                                                        # 其余逐字节保持现状
terminal: hostBridgeDelivered = true, hostCalls = n                  # 仅当请求携带桥键
finally: bridge.close()  (关闭监听与所有连接, 丢弃迟到回调, 删除 socket 目录) -> 删除 workspace (现状)
```

- 取消与收尾: 脚本退出, 超时, 取消或输出超限后 `bridge.close()` 先于 workspace 删除; 之后到达的 `onResult` 因 callId 不在途而被忽略; 宿主对已关闭执行的 `invoke` 由宿主侧代理拒绝.
- 背压: 第 5 路并发或第 1025 次调用立即得到 429, 不排队; 处理线程池满时 accept 线程直接回 429 并关闭连接.
- 脚本侧 `AbortSignal` 只是关闭连接; 已发出的代理调用继续到完成或超时, 结果被丢弃. 一次执行内的调用总数因此仍受 1024 上限约束.
- 插件只检查 JSON 大小与 UTF-8 合法性, 不解析能力负载; 能力语义与参数校验完全在宿主.

## 7. 宿主侧接入 (AutoJs6)

- `BunHostCapabilityGrants` 新增键 `ui_toast`, `device_info` (默认 true), 与 `host_info` 并列; 插件设置页 "Bun 能力桥" 分类新增两个开关 (十一份 strings).
- `BunPluginScriptEngine.execute`: 当 `capabilities[SUPPORTS_HOST_CAPABILITY_BRIDGE]` 且至少一项动态能力已授权时, 创建本次执行的 `BunHostCapabilityBroker` (钉住 `providerUid` 与 `executionId`), 在请求里放入版本, 代理与授权列表; 执行结束 (含异常) 后 `broker.close()`, 之后的 `invoke` 一律不回调.
- `BunHostCapabilityBroker.invoke` (oneway, 宿主 Binder 线程): 调用方 UID 必须等于插件 UID, `executionId` 必须匹配, 否则忽略; 请求 JSON <= 64 KiB; 按能力 ID 分派, 结果 JSON <= 256 KiB; 回调只发一次.
- `ui.toast`: 请求 `{"text": string, "duration"?: "short" | "long"}`; `text` 去首尾空白后 1..1024 UTF-8 字节, 不含除 `\n` 外的控制字符; 每次执行至多 4 条 (`QUOTA_EXCEEDED`); 在主线程 `Toast.makeText(...).show()`; 结果 `{"shown":true}`. 未知字段 -> `INVALID_REQUEST`.
- `device.info`: 请求必须是 `{}`; 结果 `{"brand","manufacturer","model","device","product","sdkInt","release","supportedAbis":[…]}`, 全部来自 `android.os.Build`, 不含序列号, IMEI, Android ID, 账号或网络标识.
- 宿主契约测试新增桥键/AIDL 描述符/错误码断言; release AAR 重发并锁入本仓库 `libs/api-artifacts.lock.json`.

## 8. 安全与资源

- 可达性: socket 文件位于插件私有 `cacheDir`, 目录 0700; 只有插件 UID (含 Bun 子进程) 能连接. 不设令牌: 同 UID 内本就无隔离可言.
- 身份: 插件回调按宿主 UID 校验; 宿主 `invoke` 按插件 UID 与执行 ID 校验; 双向都忽略不匹配的调用而不是抛错.
- 大小: 请求 64 KiB, 结果 256 KiB, 头部 8 KiB; 单次执行 1024 次, 4 路并发, 10 s 超时; 连接读写 5 s 空闲超时.
- 生命周期: 代理与 socket 都只在一次执行内存活; 宿主死亡 -> 在途调用 `HOST_UNAVAILABLE`, 脚本继续运行直到自行结束或超时 (回调路径已断, 输出不再到达宿主控制台, 与现状一致).
- 诊断不回显 socket 路径与宿主路径; 插件不记录脚本请求体.
- 不声称沙箱; `AUTOJS6_*` 前缀继续归插件.

## 9. 验收

- [x] 宿主仓库 `BunRuntimeContractTest` 覆盖桥常量, AIDL 描述符与错误码 (5/5); AAR 22437 bytes 重发并锁入本仓库.
- [x] JVM 单元测试: 请求解析 (版本, 代理, 列表形状/数量/重复), HTTP 解析 (请求行, 头部, `Content-Length`, 上限, chunked 拒绝), 响应渲染, 错误映射, 调用配额与并发计数 (`BunHostBridgeRequestTest` 3, `BunHostBridgeHttpTest` 4, `BunHostBridgeDispatcherTest` 7).
- [x] instrumentation (进程内伪造宿主代理, `hostCapabilityBridgeRoundTrip`): `GET /v1/info`; `device.info` 与 `ui.toast` 往返 (含宿主配额 429); 未授权 ID 403; 非法 ID 400; 错误方法 405; 非对象 body 400; 超大 body 413; 未知路径 404; 第 5 路并发 429; 不回调的代理 504; 终态 `hostBridgeDelivered`/`hostCalls`; 未携带桥键时无 `AUTOJS6_HOST_BRIDGE_SOCKET` 且无终态键; 收尾后 socket 文件与目录不存在, accept 线程退出; 五种敌意请求 INVALID_REQUEST. x86_64 API 33 AVD 与 Redmi API 33 通过; 方法名已同步到共享 Binder 清单. (代理调用方 UID 不匹配的回调无法在进程内伪造, 由单元测试外的代码审查覆盖)
- [x] 宿主端到端 (本地宿主构建, Redmi): 脚本经 `fetch({ unix })` 取到设备信息并弹出 toast (logcat `NotificationService` 记录了带脚本文本的 `TextToastRecord`); 关闭 `ui_toast` 后同一脚本得到 403 而 `device.info` 仍可用; 全部关闭后无 socket; 记入 `docs/compatibility/2026-09-16-m7-host-capability-bridge.md`.
- [x] 文档: ROADMAP M7 条目, AGENTS 规则, README FAQ 与排错指南 (十语言), changelog 十语言, SESSION_HANDOFF.

## 10. 明确不做 (本轮)

- 不做流式/长连接能力, 不做宿主到脚本的主动推送, 不做每能力的自定义超时 (统一 10 s).
- 不暴露无障碍, 点击/滑动, 剪贴板, 文件, 网络或任何自动化接口; 不暴露设备标识符.
- 不改 supervisor, 不改五个 AIDL 事务, 不新增 `runScript` 终态错误码, 不提升 `REQUIRES_HOST_VERSION`.
- 不提供 JS 客户端库; `fetch({ unix })` 即接口.
