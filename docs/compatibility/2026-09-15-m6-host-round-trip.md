# M6: 宿主到插件的真实项目往返 (本地宿主构建 + 已发布 v0.2.2 插件)

设备执行时间: 2026-09-15 21:55-21:58 (Asia/Shanghai), 清理 22:00. G2, 补充性集成证据, 不计为设备验收组, 也不是宿主发布.

宿主: AutoJs6 仓库 master `7c31269cc` (树干净, 含 `BunPluginWorkspaceArchive` 打包, 引擎提交 `635f69e8b`), `:app:assembleAppDebug --offline` 的 x86_64 debug APK,
官方证书签名 (`31a681fc…`), SHA-256 `493804914eb3…`, 安装后 base.apk 一致; 插件信任状态 OFFICIAL, 插件中心默认启用; `MANAGE_EXTERNAL_STORAGE` 通过 appops 授予.
插件: 已发布 v0.2.2 x86_64 资产 `autojs6-plugin-bun-runtime-v0.2.2-x86_64-7ae3bba9.apk` (SHA-256 `34d5fafc7fa7…`), 官方 Bun `1.4.0+34cbb9a40` x86_64 + 锁定监督器.
设备: AVD `bun-hard-limit-api33-20260912`, Google sdk_gphone64_x86_64, API 33, 原生 x86_64, 4096 页, 内核 `5.15.119-android13-8-00034-gd34029c8258b-ab10871489`.
启动方式: `adb shell am start -a android.intent.action.VIEW -d file://<entry> -t application/x-javascript -n org.autojs.autojs6/org.autojs.autojs.external.open.RunIntentActivity`, 观察宿主进程 logcat 的 `GlobalConsole` 镜像.

## 四次运行

| 运行 | 入口 | 预期路径 | 结果 |
|---|---|---|---|
| project 第 1 轮 | `project/main.js` (`project.json`) | 工作区归档 | 通过, 0.227 s: `import.meta.dir` 与 cwd 均为插件私有 `bun-executions/<run>/project`, 相对 ESM import 与 JSON import 解析, 归档 6 个条目 |
| bare 对照 | `bare/main.js` (与 project/main.js 字节相同, 无标记文件) | 单源码 | 按预期失败, 0.167 s: `Cannot find module './lib/util.js'`, 来源为单源码快照 `bun-executions/<run>/main.js`, 宿主报 `NON_ZERO_EXIT` |
| pkg | `pkg/main.ts` (`package.json`) | 工作区归档 | 通过, 0.132 s: TypeScript 入口 `project/main.ts`, `./src/math.ts` 与 `package.json` 导入解析, total=10 |
| project 第 2 轮 | 同第 1 轮 | 工作区归档 | 通过, 0.573 s, 输出与第 1 轮一致 (仅运行目录不同) |

首次运行绑定插件并启动 `:bun_runtime` 进程, 后三次复用连接. 四次运行后以 `adb root` 检查: 插件 `cache/bun-executions` 为空, 宿主 `cache/bun-source-snapshots` 为空, 没有 `bun-project-*` 临时归档.
清理: force-stop 后无运行时进程, 删除 `/sdcard/AutoJs6/bun-roundtrip`, 卸载插件与宿主后无残留包/UID 进程/数据目录, AVD 关闭.

## 控制台摘录 (project 第 1 轮)

```text
21:55:29.044/V: Running [$sdcard/AutoJs6/bun-roundtrip/project/main.js].
21:55:29.247/I: ROUNDTRIP dir=/data/data/io.github.supermonster003.autojs6.plugin.bun.runtime/cache/bun-executions/bun-engine-0-79afc674-87f8-4dec-8912-6c8cf951d4eb-639194275000/project
21:55:29.249/I: ROUNDTRIP cwd=/data/data/io.github.supermonster003.autojs6.plugin.bun.runtime/cache/bun-executions/bun-engine-0-79afc674-87f8-4dec-8912-6c8cf951d4eb-639194275000/project
21:55:29.251/I: ROUNDTRIP greet=hello, workspace
21:55:29.253/I: ROUNDTRIP files=data,data/config.json,lib,lib/util.js,main.js,project.json
21:55:29.256/I: ROUNDTRIP bun=1.4.0 platform=android arch=x64
21:55:29.312/V: [$sdcard/AutoJs6/bun-roundtrip/project/main.js] finished in 0.227 seconds.
```

## 观察

- The host console labels a TypeScript entry launched by intent as [main.js] (the TypeScriptStringSource compilation name) while the plugin received and ran main.ts: import.meta.path ends with project/main.ts. Cosmetic host label, not a routing defect.
- The first run bound the plugin and started the :bun_runtime process; the three later runs reused the bound service without a new process start.
- Bun reports process.arch x64 for the x86_64 payload on this AVD; the packaged ELF is the locked official x86_64 runtime.

## 边界

- The host is a local debug build of AutoJs6 master 7c31269cc signed with the official certificate, not a released AutoJs6; released hosts still send single files, so users cannot run multi-file projects until the host ships.
- x86_64 API 33 AVD only. The attached ARM64 devices carry the user's production AutoJs6 and were not replaced; an ARM64 host round trip needs a device or a host release the user chooses.
- Four runs in one host process; not a soak, concurrency or cancellation test of the host packing path.
- The bare-file failure is the intended single-source behavior and is recorded as a control, not as a defect.

原始 logcat, 夹具与清理输出保留在本地 `.git/host-roundtrip-20260915/` (不入库); 机器可读记录见同名 JSON.
