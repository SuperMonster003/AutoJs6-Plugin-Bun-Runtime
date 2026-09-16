# M7: 动态能力桥的真机验证 (instrumentation 双环境 + Redmi 宿主往返, 含 ui.toast / device.info 逐项撤销)

设备执行时间: 2026-09-16 10:20-10:22 (instrumentation, Asia/Shanghai), 10:30-10:34 (Redmi 宿主往返) 与 10:36 (清理). G2, 补充性集成证据, 不计为设备验收组, 也不是宿主或插件发布. 契约与实现约定见 [M7 动态调用设计稿](../design/m7-host-capability-bridge-dynamic.md); 第一项能力 (宿主信息快照) 的记录见 [同日的快照记录](2026-09-16-m7-host-info-snapshot.md).

插件: 本仓库 master 5f39f3a 加随本记录一起提交的 M7 动态桥工作树 (0.2.4 / 104): `BunHostBridgeHttp` (有界 HTTP/1.1 解析与响应), `BunHostBridgeDispatcher` (路由, 授权, 限额, 并发与错误映射), `BunHostBrokerClient` (AIDL 代理, 回调 UID/executionId 核对, 超时与 linkToDeath), `BunHostBridgeServer` (每次执行独立的 `<cacheDir>/bun-bridge/<12 hex>.sock`, accept 线程与工作线程池, 关闭时唤醒并删除 socket), `BunExecutionRequest` 的桥键解析, `BunRuntimeService` 的启动/环境变量/终态键/收尾, 能力位 `SUPPORTS_HOST_CAPABILITY_BRIDGE`. instrumentation 用 debug x86_64 APK (SHA-256 `5f11780a…`) 与 debug arm64-v8a APK (SHA-256 `dae870dd…`, 证书 `31a681fc…`) 加 androidTest APK (SHA-256 `02d7175e…`); 宿主往返用同一枚 arm64-v8a debug APK. 运行时 Bun `1.4.0+34cbb9a40` 与监督器字节自 v0.2.2 起未变.
宿主: AutoJs6 仓库 master `d4e05a81d` 加 M7 动态桥改动 (运行后本地提交为 `2634cc184`): 契约常量/键/限额/错误码与两份 AIDL (`IBunHostCapabilityBroker` oneway `invoke(Bundle, IBunHostCapabilityCallback)`, `IBunHostCapabilityCallback` oneway `onResult(Bundle)`), `BunHostCapabilityBroker` (按执行绑定插件 UID 与 executionId; `ui.toast` 每次运行 4 条, `device.info` 只回 `Build` 字段), `BunPluginScriptEngine.createCapabilityBroker`, `BunHostCapabilityGrants` 新增 `ui_toast` / `device_info` (默认开启), 插件中心设置页两枚开关 (十一种语言). arm64-v8a debug APK (SHA-256 `a8a1e982…`, 签名证书 `31a681fc…`).
共享契约: `libs/bun-runtime-api.aar` 22437 bytes (SHA-256 `97005106…`), `HOST_CAPABILITY_BRIDGE_VERSION = 1`, 请求键 `hostCapabilityBridgeVersion` / `hostCapabilityBroker` / `hostCapabilities`, 能力 ID 形如 `[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+` (至少一个点, 至多 64 字节, 每次至多 64 项), 环境变量 `AUTOJS6_HOST_BRIDGE_SOCKET`, 终态键 `hostBridgeDelivered` / `hostCalls`; 限额 64 KiB 请求 / 256 KiB 结果 / 1024 次每执行 / 4 并发 / 10 s 超时; 桥错误码 INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS 与 QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500. 不新增 `runScript` 错误码, Binder 事务或协议版本. 与设计稿的一处偏差: 公开 SDK 没有 unix `SocketAddress`, 监听套接字改用 `android.net.LocalSocket` 绑定文件系统命名空间, accept/读写/shutdown/close 仍走 `android.system.Os` 的裸描述符.

## instrumentation (x86_64 API 33 AVD + Redmi ARM64 真机)

| 环境 | API / 页 | 内核 | 接入 | 结果 | 用时 |
|---|---|---|---|---|---|
| Google sdk_gphone64_x86_64 (emulator-5612) | 33 / 4096 | `5.15.119-android13-8-…` | 本地 adb | OK (1 test) | 12.2 s |
| Redmi 22120RN86C | 33 / 4096 | `4.19.191-perf-g2f9faa927855` | USB | OK (1 test) | 11.6 s |

新增用例 `hostCapabilityBridgeRoundTrip` 在测试进程内实现假宿主 broker (`IBunHostCapabilityBroker.Stub`: `device.info` 回固定文档, `ui.toast` 回显文本并限 4 条, `test.silent` 永不应答), 覆盖: 不带桥键时无 `AUTOJS6_HOST_BRIDGE_SOCKET` 且无终态键; `GET /v1/info` 逐字回授权 ID 与契约限额; `device.info` 200, `ui.toast` 四次 200 第五次 429 `QUOTA_EXCEEDED`; 未授权 ID 403, 无点 ID 400, 对能力用 GET 405, 数组体 400, 65536 字节体 413, 未知路径 404, `POST /v1/info` 405; 四个悬挂调用加第五个: 第五个立即 429 `TOO_MANY_REQUESTS`, 四个在 10 s 后 504 `TIMEOUT`; 终态 `hostBridgeDelivered=true`, `hostCalls=10`, broker 收到的 callId 为 `<executionId>#<n>`; 运行后 socket 文件与 `bun-bridge` 目录消失, 共享测试进程里不再有 `AutoJs6-Bun-bridge-accept` 线程; 未知桥版本 / 缺 broker / 无点 ID / 空列表 / 保留环境变量名五种请求以 `INVALID_REQUEST` 关闭且不启动 Bun, 之后普通路径恢复.

两次前置尝试: 第一次 AVD 运行每条桥应答都吻合, 只有 info 断言失败, 原因是脚本用 `JSON.stringify` 打印带 undefined 字段的对象; 改为直接打印 `/v1/info` 原文并断言完整文档, 重建 androidTest APK 后重跑, 表中为重跑结果. 另一台 x86_64 API 37 / 16 KiB 模拟器 (emulator-5566, sdk_gphone16k_x86_64) 跑不起该用例, 既有的 `BunRuntimeProbeInstrumentedTest` 在它上面以同样方式失败, 即插件运行时在该镜像上完全不可用, 与本次改动无关, 按诊断预算规则未追查.

## 宿主往返 (Redmi 22120RN86C API 33)

启动方式与 M6/M7 快照往返相同: `am start -a android.intent.action.VIEW -d file://<entry> -t application/x-javascript -n org.autojs.autojs6/org.autojs.autojs.external.open.RunIntentActivity`, 观察宿主 logcat 的 `GlobalConsole` 镜像与 `NotificationService` 的 toast 记录. 夹具 `/sdcard/AutoJs6/bun-bridge/{project,bare}/main.js` 字节相同 (1597 bytes, SHA-256 `f8b760fd…`), `project/` 带 `project.json` (140 bytes); 脚本打印 `AUTOJS6_*` 变量名, 无桥时打印 absent 并以 0 退出, 否则依次 `fetch(url, { unix })`: `GET /v1/info`, `POST /v1/device.info`, 五次 `POST /v1/ui.toast` (第一条 `duration: "long"`), 空白 toast 文本, 非法 duration, 带多余字段的 device.info, 未授权的 `net.http`, 逐条打印状态码与结果或错误码/消息.

宿主 `install -r` 覆盖用户自己的 6.8.0 (5280) 构建, 应用数据与 UID 保留; 插件 `install -r -t` 装入 debug arm64-v8a APK.

| 运行 | 入口 | 授权 | 结果 |
|---|---|---|---|
| project | `project/main.js` (`project.json`) | 默认开启 | 通过, 0.323 s: `AUTOJS6_HOST_BRIDGE_SOCKET` 与 `AUTOJS6_HOST_INFO_FILE`; info 列出 `ui.toast`, `device.info` 与契约限额; device 回 `Redmi` / `Xiaomi` / `22120RN86C` / `earth` / 33 / `13` / `arm64-v8a,armeabi-v7a,armeabi`; toast1-4 `{"shown":true}`, toast5 429 `QUOTA_EXCEEDED`; badToast / badDuration / badDevice 400 `INVALID_REQUEST`; denied 403 `NOT_GRANTED`; `NotificationService` 记录到带脚本文本的 `TextToastRecord` (duration 1 后 0) |
| bare | `bare/main.js` (无标记文件) | 默认开启 | 通过, 0.251 s: 应答与 project 逐字相同; 连发第二轮时 Android 的包级 toast 限流拦下部分 toast (`Package has already queued 5 toasts` / `above allowed toast quota`), 属系统行为, 宿主已入队并应答 `{"shown":true}` |
| bare (撤销 ui.toast) | `bare/main.js` | `ui_toast=false` (宿主 force-stop 后经 `run-as` 写入 `shared_prefs/bun_host_capability_grants.xml`) | 通过, 0.268 s: info 只列 `device.info`; device 照常 200; toast1-5 / badToast / badDuration 全部 403 `NOT_GRANTED` (插件在转发前拒绝, 宿主未收到任何 toast 调用); badDevice 仍 400; denied 403 |
| bare (全部撤销) | `bare/main.js` | `ui_toast=false`, `device_info=false` | 通过, 0.170 s: 仅 `AUTOJS6_HOST_INFO_FILE`, 脚本报告桥 absent 并正常退出 (`host_info` 开关未动, 快照仍送达) |
| project 第 2 轮 | `project/main.js` | 删除偏好文件恢复默认 | 通过, 0.292 s, 输出与第 1 轮一致 (仅 executionId 不同) |

两次前置尝试: 第一轮驱动脚本对整个脚本关闭了 MSYS 路径转换, adb 读不到本地 APK 与夹具路径, 什么都没装没推, 五次启动只产生宿主自己的 "文件不存在" toast; 改为 `D:/` 形式路径后重跑. 第二轮的安装, 推送与两次默认授权启动即上表前两行, 但三步授权切换用 `adb shell -n` 喂 `run-as`, stdin 被丢弃, 偏好文件没有写入, 对应三次启动 (10:31:46 / 10:31:55 / 10:32:05) 仍是双授权, 在 `run.txt` 中保留为无效尝试; 切换半程以带 stdin 的 `driver2.sh` 重跑 (10:33), 上表后三行取自该轮.
残留检查: 运行后经 `run-as` 查看 debuggable 插件的 `cache/`, 只有空的 `bun-executions`, 没有 `bun-bridge` 目录.
清理 (10:36): 偏好文件确认不存在; 卸载插件 (androidTest 包返回 `DELETE_FAILED_INTERNAL_ERROR`, 之后 `pm list packages` 无任何 `plugin.bun.runtime` 包); 用 `%TEMP%/redmi-autojs6-base.apk` 备份 `install -r` 还原宿主 (安装后 base.apk SHA-256 `340536cb…` 与备份一致, 6.8.0); 删除 `/sdcard/AutoJs6/bun-bridge`; 无运行时进程.

## 控制台摘录 (Redmi, project 第 1 轮; bare 撤销 ui.toast; bare 全部撤销)

```text
10:31:31.239/V: Running [$sdcard/AutoJs6/bun-bridge/project/main.js].
10:31:31.403/I: BRIDGE reserved=AUTOJS6_HOST_BRIDGE_SOCKET,AUTOJS6_HOST_INFO_FILE
10:31:31.410/I: BRIDGE info=200:{"ok":true,"bridgeVersion":1,"capabilities":["ui.toast","device.info"],"limits":{"maxRequestBytes":65536,"maxResultBytes":262144,"maxCallsPerExecution":1024,"maxConcurrentCalls":4,"callTimeoutMillis":10000}}
10:31:31.418/I: BRIDGE device=200:{"brand":"Redmi","manufacturer":"Xiaomi","model":"22120RN86C","device":"earth","product":"earth","sdkInt":33,"release":"13","supportedAbis":["arm64-v8a","armeabi-v7a","armeabi"]}
10:31:31.425/I: BRIDGE toast1=200:{"shown":true}
10:31:31.431/I: BRIDGE toast2=200:{"shown":true}
10:31:31.437/I: BRIDGE toast3=200:{"shown":true}
10:31:31.443/I: BRIDGE toast4=200:{"shown":true}
10:31:31.448/I: BRIDGE toast5=429:QUOTA_EXCEEDED ui.toast allows 4 calls per run
10:31:31.454/I: BRIDGE badToast=400:INVALID_REQUEST ui.toast text must be 1..1024 UTF-8 bytes
10:31:31.460/I: BRIDGE badDuration=400:INVALID_REQUEST ui.toast duration must be "short" or "long"
10:31:31.465/I: BRIDGE badDevice=400:INVALID_REQUEST device.info takes no fields
10:31:31.473/I: BRIDGE denied=403:NOT_GRANTED Capability is not granted for this execution
10:31:31.577/V: [$sdcard/AutoJs6/bun-bridge/project/main.js] finished in 0.323 seconds.
--- ui_toast revoked ---
10:33:18.048/V: Running [$sdcard/AutoJs6/bun-bridge/bare/main.js].
10:33:18.165/I: BRIDGE reserved=AUTOJS6_HOST_BRIDGE_SOCKET,AUTOJS6_HOST_INFO_FILE
10:33:18.173/I: BRIDGE info=200:{"ok":true,"bridgeVersion":1,"capabilities":["device.info"],"limits":{...}}
10:33:18.184/I: BRIDGE device=200:{"brand":"Redmi","manufacturer":"Xiaomi","model":"22120RN86C",...}
10:33:18.194/I: BRIDGE toast1=403:NOT_GRANTED Capability is not granted for this execution
10:33:18.226/I: BRIDGE badDevice=400:INVALID_REQUEST device.info takes no fields
10:33:18.331/V: [$sdcard/AutoJs6/bun-bridge/bare/main.js] finished in 0.268 seconds.
--- both revoked ---
10:33:26.820/V: Running [$sdcard/AutoJs6/bun-bridge/bare/main.js].
10:33:26.947/I: BRIDGE reserved=AUTOJS6_HOST_INFO_FILE
10:33:26.954/I: BRIDGE absent (host did not offer the bridge)
10:33:27.005/V: [$sdcard/AutoJs6/bun-bridge/bare/main.js] finished in 0.170 seconds.
--- NotificationService, second back-to-back launch ---
10:31:38.585 E NotificationService: Package has already queued 5 toasts. Not showing more. Package=org.autojs.autojs6
10:31:40.464 W NotificationService: Package org.autojs.autojs6 is above allowed toast quota, the following toast was blocked and discarded: TextToastRecord{…}
```

## 观察

- The whole chain (script fetch to plugin socket to Binder broker to host capability to callback to HTTP reply) adds no visible latency: launches finish in 0.17-0.32 s including twelve bridge calls, the same range as the M7 snapshot and M6 archive round trips.
- Grant revocation is per run and per capability: with ui_toast off the info document lists only device.info and every toast call is refused by the plugin with 403 before the host sees it; with both off the request carries no bridge keys, the script sees no AUTOJS6_HOST_BRIDGE_SOCKET, and the independent host info snapshot keeps arriving.
- The host enqueues the toasts on its main thread and answers {"shown":true}; Android's own per-package toast rate limit then decides how many of four back-to-back toasts are displayed, which is visible in NotificationService as 'above allowed toast quota' and is not a bridge failure.
- The plugin's bridge counters are consistent between the fake-broker instrumentation and the real host: hostCalls counts calls that held a relay slot (ten in the instrumentation script); fast rejections (403/400/413/405/404 and the fifth concurrent call) are not counted.
- The listener is bound through android.net.LocalSocket because the public SDK has no unix SocketAddress; accept, read, write, shutdown and close run on the raw descriptor through android.system.Os, and the accept thread is gone after every run (asserted in the shared test process).

## 边界

- The host is a local debug build of AutoJs6 master d4e05a81d with the bridge change (committed locally as 2634cc184 after the runs), signed with the official certificate; no released AutoJs6 offers the bridge yet, and the plugin capability ships only with the next plugin release.
- The grant toggles were exercised through the host preference file (run-as on a debuggable host build), not by tapping the two new plugin-center switches; the switches read and write the same keys.
- One instrumentation test on two environments (x86_64 API 33 AVD, ARM64 API 33 phone) and five host launches in one grant cycle on one phone; no 16 KiB device this time (the x86_64 API 37 / 16 KiB emulator cannot run the plugin at all), no soak, no host-death test on a device (host death is covered by linkToDeath in code and by the dispatcher unit tests), no concurrent-script test.
- A callback from the wrong UID or with a wrong execution ID cannot be produced with an in-process fake broker; those checks are covered by code review only.
- Neither device is rooted: the plugin's cache directory was inspected with run-as on the debuggable plugin build, not as root.
- No new error code, AIDL transaction or protocol version; the certificate digests come from apksigner on the local APKs.

原始 instrumentation 输出, logcat, `run.txt`, `run2.txt` 与 `cleanup.txt` 保留在本地 `.git/host-bridge-20260916/` (不入库); 机器可读记录见同名 JSON.
