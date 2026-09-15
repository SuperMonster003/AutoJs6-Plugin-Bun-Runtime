# M7: 宿主信息快照的真机验证 (instrumentation 双机 + Redmi/Samsung 宿主往返, 含授权撤销)

设备执行时间: 2026-09-16 00:44-00:45 (instrumentation, Asia/Shanghai), 00:48-00:54 (Redmi 宿主往返与清理) 与 01:37-01:40 (Samsung 宿主往返与清理, 第二个 Remote Test Lab 会话). G2, 补充性集成证据, 不计为设备验收组, 也不是宿主或插件发布. 契约与实现约定见 [M7 设计稿](../design/m7-host-capability-bridge.md).

插件: 本仓库 master b18f50a 加本次提交的 M7 工作树 (0.2.3 / 8); instrumentation 用 debug arm64-v8a APK (SHA-256 `9cabb8de…`) 与 androidTest APK (SHA-256 `9eefbfb2…`), 宿主往返用同一树的本地 release arm64-v8a APK (SHA-256 `50eb3fa0…`, 非发布资产). 运行时 Bun `1.4.0+34cbb9a40` 与监督器字节自 v0.2.2 起未变 (`installedNativeRuntimeMatchesTheLockedPayload` 双机通过).
宿主: AutoJs6 仓库 master `d9b4033bd` 加 M7 改动 (运行后本地提交为 `265adf810`) (契约常量与能力位, `BunHostCapabilityGrants`, `BunPluginScriptEngine.attachHostInfo`) 的 arm64-v8a debug APK (SHA-256 `6afee80a…`, 签名证书 `31a681fc…`). 宿主只发送包名, `versionDate` 与 `languageTag`; 插件核对 Binder 调用方 UID 后自行解析宿主版本.
共享契约: `libs/bun-runtime-api.aar` 14073 bytes (SHA-256 `69674a0b…`), `HOST_INFO_VERSION = 1`, 能力位 `SUPPORTS_HOST_INFO`, 环境变量 `AUTOJS6_HOST_INFO_FILE`, 保留前缀 `AUTOJS6_`, 终态键 `hostInfoDelivered`; 不新增错误码, 事务或协议版本.

## instrumentation (两台原生 ARM64 真机)

| 设备 | API / 页 | 内核 | 接入 | 结果 | 用时 | 说明 |
|---|---|---|---|---|---|---|
| Redmi 22120RN86C | 33 / 4096 | `4.19.191-perf-g2f9faa927855` | USB | OK (17 tests), 0 失败 | 35.3 s | 1 项既有 locale 假设跳过 (`cachedPageSizeRefusalFollowsLocaleInPrewarmInfoAndRun`, 与 M7 无关) |
| Samsung SM-A566B | 36 / 16384 | `6.6.77-android15-8-abA566BXXU6BYIF` | Remote Test Lab | OK (17 tests), 0 失败 | 28.8 s | 同上 |

新增用例 `hostInfoSnapshotIsDeliveredOnlyWhenOffered`: 未提供快照键时无 `AUTOJS6_HOST_INFO_FILE` 且无终态键; 单源码与归档两条路径读到经 `PackageManager` 核实的宿主包名/版本, 去空白的 advisory `versionDate`, `languageTag`, 插件版本与运行时版本/修订, `executionId`, `sourceName`, `workspaceArchive`; 文件位于 `<workspace>/autojs6/host-info.json`, 单源码时在 cwd 内, 归档时在 `project` 之外 (realpath 比较); 冒用包名, 未知版本, 保留 `AUTOJS6_` 变量三种请求以 `INVALID_REQUEST` 关闭且不启动 Bun; 之后单源码恢复. `hostGlobalsAreAbsentAndFailLoudly`: `toast`/`click`/`java`/`importClass`/`auto` 均为 `undefined`, 调用 `toast()` 以 `ReferenceError` 退出 (`NON_ZERO_EXIT`).

两次前置尝试: 第一次双机误装了早前诊断构建遗留的 debug APK (包名后缀 `.diagnostics`), runner 找不到目标包, 未运行任何用例, 重新 `:app:assembleDebug` 后重装; 第二次双机 16 项通过, 新用例仅在 cwd 包含关系一处失败, 原因是 Android 上 `process.cwd()` 与快照路径相差一个符号链接, 改为 realpath 比较 (与 M6 项目用例一致) 后重建 androidTest APK 并整套重跑, 表中为重跑结果.

## 宿主往返 (Redmi 22120RN86C API 33 与 Samsung SM-A566B API 36 / 16 KiB)

启动方式与 M6 往返相同: `am start -a android.intent.action.VIEW -d file://<entry> -t application/x-javascript -n org.autojs.autojs6/org.autojs.autojs.external.open.RunIntentActivity`, 观察宿主 logcat 的 `GlobalConsole` 镜像. 夹具 `/sdcard/AutoJs6/bun-hostinfo/{project,bare}/main.js` 字节相同 (SHA-256 `636498bc…`), `project/` 带 `project.json`; 脚本打印 `AUTOJS6_*` 变量名, 无快照时打印 absent 并以 0 退出, 否则解析快照并打印 host/plugin/execution 与 realpath 包含关系.

Redmi (宿主 `install -r` 覆盖用户自己的 6.8.0 构建):

| 运行 | 入口 | 授权 | 结果 |
|---|---|---|---|
| project 第 1 轮 | `project/main.js` (`project.json`) | 默认开启 | 通过, 0.171 s: 仅 `AUTOJS6_HOST_INFO_FILE`; host = `org.autojs.autojs6` 6.8.0 / 5280, versionDate `Sept 16, 2026`, languageTag `en`; plugin = 0.2.3 / 8, Bun 1.4.0 / `1.4.0+34cbb9a40` / arm64-v8a; execution `workspaceArchive=true`, `sourceName=main.js`; 文件在 `project` 之外, 487 bytes |
| bare | `bare/main.js` (无标记文件) | 默认开启 | 通过, 0.145 s: 同上但 `workspaceArchive=false`, 文件在 cwd 内, 488 bytes |
| bare (撤销) | `bare/main.js` | `host_info=false` (宿主 force-stop 后经 `run-as` 写入 `shared_prefs/bun_host_capability_grants.xml`) | 通过, 0.142 s: `AUTOJS6_*` 为空, 脚本报告快照 absent 并正常退出, 宿主无错误 |
| project 第 2 轮 | `project/main.js` | 删除偏好文件恢复默认 | 通过, 0.162 s, 输出与第 1 轮一致 (仅 executionId 不同) |

撤销轮在第三次尝试才生效: 前两次 (脚本内引号经 `adb shell run-as` 传递被破坏; here-document 在 `run-as` 下无法建立临时文件) 都没有写入偏好文件, 对应的启动仍收到快照, 在 `run.txt` 中保留为无效尝试, 不是宿主或插件的失败.
清理: 卸载插件, 用 `%%TEMP%%/redmi-autojs6-base.apk` 备份 `install -r` 还原宿主 (安装后 base.apk SHA-256 `340536cb…` 与备份一致, 5280), 偏好文件不存在, 删除 `/sdcard/AutoJs6/bun-hostinfo`, 无插件包与运行时进程; 首条还原命令因本地路径引号错误失败后重试成功, 两次均记录在 `cleanup.txt`.

Samsung (第一个 Remote Test Lab 会话在宿主装入后断开, 未跑任何启动; 用户重新上线设备后在第二个会话全新安装宿主 (appops 授予所有文件访问) 与插件, 结束后两者卸载, 无残留包/进程/夹具):

| 运行 | 入口 | 授权 | 结果 |
|---|---|---|---|
| project 第 1 轮 | `project/main.js` | 默认开启 | 通过, 0.179 s: 快照字段与 Redmi 逐字相同 (仅 executionId 不同), `workspaceArchive=true`, 文件在 `project` 之外 |
| bare | `bare/main.js` | 默认开启 | 通过, 0.139 s / 0.143 s: 该次启动被实验室重复投递, 两次执行 (bun-engine-1/2) 都读到同一快照, `workspaceArchive=false`, 文件在 cwd 内 |
| bare (撤销) | `bare/main.js` | `host_info=false` (同 Redmi 方式) | 通过, 0.141 s: 快照 absent, `AUTOJS6_*` 为空; 启动同样被重复投递, 第二个并发启动在刚启动的宿主进程上被宿主的 Binder 调用通道拒绝 (`Bun Binder call select failed: BUSY`), 存活的那次执行结果正确 |
| project 第 2 轮 | `project/main.js` | 删除偏好文件恢复默认 | 通过, 0.155 s, 两条 START 记录但只有一次执行, 输出与第 1 轮一致 |

重复投递的证据: 三次启动的 logcat 各有两条 `START u0 … RunIntentActivity` 记录或两个 executionId, 中间夹着实验室的 `rtl.hb` 心跳 activity; 前一天 M6 在同一设备的四次启动均为单次. `BUSY` 来自宿主 `BunBoundedBinderCallLane` 对并发 Bun 脚本启动的限制, 是宿主行为, 与插件和 M7 无关, 只作为观察记录.

## 控制台摘录 (Redmi, bare 与 bare 撤销; Samsung bare 撤销)

```text
00:48:47.733/V: Running [$sdcard/AutoJs6/bun-hostinfo/bare/main.js].
00:48:47.825/I: HOSTINFO reserved=AUTOJS6_HOST_INFO_FILE
00:48:47.863/I: HOSTINFO version=1
HOSTINFO host={"packageName":"org.autojs.autojs6","versionName":"6.8.0","versionCode":5280,"versionDate":"Sept 16, 2026","languageTag":"en"}
HOSTINFO plugin={"packageName":"io.github.supermonster003.autojs6.plugin.bun.runtime","versionName":"0.2.3","versionCode":8,"runtimeVersion":"1.4.0","runtimeRevision":"1.4.0+34cbb9a40","runtimeAbi":"arm64-v8a"}
HOSTINFO execution={"executionId":"bun-engine-1-fc357818-9989-4eff-951e-310f997aad7b","sourceName":"main.js","workspaceArchive":false}
HOSTINFO underCwd=true underProject=false leaf=true bytes=488
00:48:47.886/V: [$sdcard/AutoJs6/bun-hostinfo/bare/main.js] finished in 0.145 seconds.
--- grant revoked ---
00:52:59.410/V: Running [$sdcard/AutoJs6/bun-hostinfo/bare/main.js].
00:52:59.503/I: HOSTINFO reserved=none
00:52:59.510/I: HOSTINFO absent (host did not offer the snapshot)
00:52:59.567/V: [$sdcard/AutoJs6/bun-hostinfo/bare/main.js] finished in 0.142 seconds.
--- samsung, grant revoked (second concurrent start rejected by the host, surviving execution absent) ---
02:38:49.954/E: Bun Binder call select failed: BUSY
org.autojs.autojs.core.plugin.bun.BunBinderCallException: Bun Binder call select failed: BUSY
at org.autojs.autojs.core.plugin.bun.BunBoundedBinderCallLane.call(BunBoundedBinderCallLane.kt:57)
at org.autojs.autojs.core.plugin.bun.BunRuntimeBinderCallLane.call(BunBoundedBinderCallLane.kt:241)
at org.autojs.autojs.engine.BunPluginScriptEngine.runRpc(BunPluginScriptEngine.kt:294)
at org.autojs.autojs.engine.BunPluginScriptEngine.runRpc$default(BunPluginScriptEngine.kt:287)
at org.autojs.autojs.engine.BunPluginScriptEngine.init(BunPluginScriptEngine.kt:53)
at org.autojs.autojs.execution.RunnableScriptExecution.prepare(RunnableScriptExecution.java:80)
at org.autojs.autojs.execution.RunnableScriptExecution.execute(RunnableScriptExecution.java:53)
at org.autojs.autojs.execution.RunnableScriptExecution.execute(RunnableScriptExecution.java:48)
at org.autojs.autojs.execution.RunnableScriptExecution.run(RunnableScriptExecution.java:30)
at java.lang.Thread.run(Thread.java:1119)

02:38:50.438/V: Running [$sdcard/AutoJs6/bun-hostinfo/bare/main.js].
02:38:50.525/I: HOSTINFO reserved=none
02:38:50.533/I: HOSTINFO absent (host did not offer the snapshot)
02:38:50.583/V: [$sdcard/AutoJs6/bun-hostinfo/bare/main.js] finished in 0.141 seconds.
```

## 观察

- The snapshot carries the host identity resolved by the plugin (org.autojs.autojs6 6.8.0 / 5280 from PackageManager after the Binder UID check) plus the host's advisory versionDate and languageTag; the plugin facts (0.2.3 / 8, Bun 1.4.0+34cbb9a40, arm64-v8a) and the execution facts (executionId, sourceName, workspaceArchive) match the launch mode.
- AUTOJS6_HOST_INFO_FILE is the only AUTOJS6_ variable the script sees; the file sits at <workspace>/autojs6/host-info.json, inside cwd for the single-source path and outside the project directory for the archive path (realpath comparison).
- Revoking the host grant (host_info=false in bun_host_capability_grants) removes the request keys: the plugin sets no variable and the script reports the snapshot as absent without any error; deleting the preference restores the default and the next launch receives the snapshot again.
- Instrumentation on API 33 / 4 KiB and API 36 / 16 KiB behaves identically, including the three hostile requests that fail closed with INVALID_REQUEST before Bun starts.
- Run times are 0.14-0.18 s per launch on both devices, the same range as the M6 archive round trip; API 36 / 16 KiB (Samsung) and API 33 / 4 KiB (Redmi) produce byte-identical snapshot fields apart from the executionId.
- The Samsung Remote Test Lab session delivered three of the four launches twice (a second RunIntentActivity START after an rtl.hb heartbeat activity; the M6 session on the same device a day earlier had no duplicates). The duplicates ran as a second identical execution, except once on the freshly started host process where the host's bounded Binder call lane rejected the second engine init with 'Bun Binder call select failed: BUSY'. That is host-side behaviour for concurrent Bun script starts and is recorded here as an observation, not as a plugin or M7 defect.

## 边界

- The host is a local debug build of AutoJs6 master d9b4033bd with the M7 engine change (committed locally as 265adf810 after the runs), signed with the official certificate; no released AutoJs6 sends the snapshot yet, and the plugin capability ships only with the next plugin release.
- The grant toggle was exercised through the host preference file (run-as on a debuggable host build); the plugin-center switch UI does not exist yet.
- The revocation round was reached on the third attempt; the two earlier attempts left the grant on and are recorded as no-ops in run.txt.
- Four launches in one host process per grant state; not a soak, concurrency or cancellation test of the host attachment path.
- Neither device is rooted: the plugin's bun-executions directory could not be listed after the runs; workspace removal is covered by the instrumentation and the same-device Binder acceptance evidence.
- No new error code, AIDL transaction or protocol version; the certificate digests are read from the local APKs with apksigner where available (null means the tool could not be run for that APK).
- The Samsung host round trip ran in a second Remote Test Lab session after the first session dropped; its duplicate launches come from the lab environment and were not reproduced on the Redmi.

原始 instrumentation 输出, logcat, `run.txt` 与 `cleanup.txt` 保留在本地 `.git/host-hostinfo-20260916/` (不入库); 机器可读记录见同名 JSON.
