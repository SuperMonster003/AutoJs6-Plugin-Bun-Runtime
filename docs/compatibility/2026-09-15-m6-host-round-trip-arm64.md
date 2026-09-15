# M6: 宿主到插件的真实项目往返 (ARM64 真机, 本地宿主构建 + 已发布 v0.2.2 arm64 插件)

设备执行时间: 2026-09-15 23:43-23:47 (Asia/Shanghai), 清理 23:45-23:50. G2, 补充性集成证据, 不计为设备验收组, 也不是宿主发布. 与 [x86_64 AVD 往返](2026-09-15-m6-host-round-trip.md) 使用同一宿主提交和字节相同的夹具.

宿主: AutoJs6 仓库 master `7c31269cc` 的 arm64-v8a debug APK (官方证书签名 `31a681fc…`, SHA-256 `199834042404…`, 16 KiB zipalign 通过), 两台设备安装后 base.apk 一致; 插件信任状态 OFFICIAL, 插件中心默认启用.
插件: 已发布 v0.2.2 arm64-v8a 资产 `autojs6-plugin-bun-runtime-v0.2.2-arm64-v8a-1ee51372.apk` (SHA-256 `3a7805a4f970…`), 官方 Bun 1.4.0 arm64 + 锁定监督器, 两台设备安装后 base.apk 与发布资产一致.
启动方式与 x86_64 往返相同: `am start -a android.intent.action.VIEW -d file://<entry> -t application/x-javascript -n org.autojs.autojs6/org.autojs.autojs.external.open.RunIntentActivity`, 观察宿主 logcat 的 `GlobalConsole` 镜像.

## 两台设备

| 设备 | API / 页 | 内核 | 接入 | 宿主安装 | 结束后 |
|---|---|---|---|---|---|
| Samsung SM-A566B | 36 / 16384 | `6.6.77-android15-8-abA566BXXU6BYIF` | Remote Test Lab | 全新安装 (之前无 AutoJs6) | 插件与宿主均卸载, 无残留包/进程/夹具 |
| Redmi 22120RN86C | 33 / 4096 | `4.19.191-perf-g2f9faa927855` | USB | `install -r` 覆盖用户自己的 6.8.0 (5280) 构建, 数据/UID/权限保留 (覆盖前备份并核对 SHA-256) | 插件卸载, 宿主还原为用户原 APK (SHA-256 `340536cb…` 与备份一致) |

## 每台设备四次运行

| 设备 | 运行 | 入口 | 预期路径 | 结果 |
|---|---|---|---|---|
| samsung SM-A566B | project 第 1 轮 | `project/main.js` (`project.json`) | 工作区归档 | 通过, 0.186 s: `import.meta.dir` 与 cwd 均为插件私有 `bun-executions/<run>/project`, 相对 ESM import 与 JSON import 解析, 归档 6 个条目, `arch=arm64` |
| samsung SM-A566B | bare 对照 | `bare/main.js` (与 project/main.js 字节相同, 无标记文件) | 单源码 | 按预期失败, 0.151 s: `Cannot find module './lib/util.js'`, 来源为单源码快照 `bun-executions/<run>/main.js`, 宿主报 `NON_ZERO_EXIT` |
| samsung SM-A566B | pkg | `pkg/main.ts` (`package.json`) | 工作区归档 | 通过, 0.144 s: TypeScript 入口 `project/main.ts`, `./src/math.ts` 与 `package.json` 导入解析, total=10 |
| samsung SM-A566B | project 第 2 轮 | 同第 1 轮 | 工作区归档 | 通过, 0.16 s, 输出与第 1 轮一致 (仅运行目录不同) |
| Xiaomi 22120RN86C | project 第 1 轮 | `project/main.js` (`project.json`) | 工作区归档 | 通过, 0.306 s: `import.meta.dir` 与 cwd 均为插件私有 `bun-executions/<run>/project`, 相对 ESM import 与 JSON import 解析, 归档 6 个条目, `arch=arm64` |
| Xiaomi 22120RN86C | bare 对照 | `bare/main.js` (与 project/main.js 字节相同, 无标记文件) | 单源码 | 按预期失败, 0.142 s: `Cannot find module './lib/util.js'`, 来源为单源码快照 `bun-executions/<run>/main.js`, 宿主报 `NON_ZERO_EXIT` |
| Xiaomi 22120RN86C | pkg | `pkg/main.ts` (`package.json`) | 工作区归档 | 通过, 0.133 s: TypeScript 入口 `project/main.ts`, `./src/math.ts` 与 `package.json` 导入解析, total=10 |
| Xiaomi 22120RN86C | project 第 2 轮 | 同第 1 轮 | 工作区归档 | 通过, 0.132 s, 输出与第 1 轮一致 (仅运行目录不同) |

每台设备的首次运行绑定插件并启动 `:bun_runtime` 进程, 后三次复用连接. 运行后 (未 root) 用 `run-as` 检查宿主 `cache/bun-source-snapshots` 为空且无 `bun-project-*` 临时归档; 插件 `bun-executions` 目录在零售设备上不可读, 插件侧清理由同设备的 Binder 验收 (`workspaceRemoved=true`) 覆盖.
清理: force-stop 后无运行时进程, 删除 `/sdcard/AutoJs6/bun-roundtrip`; Samsung 卸载插件与宿主后无残留包/UID 进程; Redmi 卸载插件并把宿主还原为用户原 APK.

## 控制台摘录 (Samsung, project 第 1 轮)

```text
00:43:57.385/V: Running [$sdcard/AutoJs6/bun-roundtrip/project/main.js].
00:43:57.584/I: ROUNDTRIP dir=/data/data/io.github.supermonster003.autojs6.plugin.bun.runtime/cache/bun-executions/bun-engine-0-400ce7a8-97da-4e99-8f9d-c6ecb908e6d0-870455655897967/project
00:43:57.590/I: ROUNDTRIP cwd=/data/data/io.github.supermonster003.autojs6.plugin.bun.runtime/cache/bun-executions/bun-engine-0-400ce7a8-97da-4e99-8f9d-c6ecb908e6d0-870455655897967/project
ROUNDTRIP greet=hello, workspace
ROUNDTRIP files=data,data/config.json,lib,lib/util.js,main.js,project.json
ROUNDTRIP bun=1.4.0 platform=android arch=arm64
00:43:57.609/V: [$sdcard/AutoJs6/bun-roundtrip/project/main.js] finished in 0.186 seconds.
```

## 观察

- Both devices reproduce the x86_64 AVD result in behaviour: import.meta.dir and cwd land in the plugin-private bun-executions/<run>/project, relative ESM and JSON imports resolve, the archive lists the same six entries, and Bun reports platform=android arch=arm64.
- The bare-file control fails closed on both devices with Cannot find module from the single-source snapshot and the host surfaces NON_ZERO_EXIT; the first launch on each device binds the plugin and starts the :bun_runtime process, the three later launches reuse the bound service.
- The host console still labels the intent-launched TypeScript entry as [main.js] because this host build (7c31269cc) predates the host-side fix 7acfd5d8e; the plugin received and ran project/main.ts.
- 16 KiB pages (Samsung) and 4 KiB pages (Redmi) behave identically for the archive path; run times are 0.13-0.31 s per launch.

## 边界

- The host is a local debug build of AutoJs6 master 7c31269cc signed with the official certificate, not a released AutoJs6; released hosts still send single files, so users cannot run multi-file projects until the host ships (the user has deferred the host release).
- Neither device is rooted: the plugin's bun-executions directory could not be listed after the runs; only the host snapshot directory (run-as) and the same-device Binder acceptance evidence cover cleanup.
- Four launches per device in one host process; not a soak, concurrency or cancellation test of the host packing path.
- The bare-file failure is the intended single-source behaviour and is recorded as a control, not as a defect.
- The Samsung session is a time-limited Remote Test Lab device; the Redmi carries the user's production AutoJs6 and was restored after the runs.

原始 logcat, 检查与清理输出保留在本地 `.git/host-roundtrip-arm64-20260915/` (不入库); 夹具与 x86_64 往返相同; 机器可读记录见同名 JSON.
