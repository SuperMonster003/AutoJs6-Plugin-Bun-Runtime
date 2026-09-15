# M6: 工作区归档多文件项目的原生 ARM64 真机往返

设备执行时间: 2026-09-15 13:25:44-13:31 (Asia/Shanghai). G1, test-only.
三台原生 ARM64 / 4 KiB 真机 (Sony XQ-DQ72 API 33, Redmi 22120RN86C API 33,
Xiaomi 23046RP50C API 35) 使用官方 Bun `1.4.0+34cbb9a40` 与生产 service,
各完成两轮九项 Binder 套件, 合计 **54/54**; 六个 runner 实际退出码均为 0,
无失败, 跳过或重试. 套件比 M9 归档多一项 `workspaceArchiveProjectRoundTrip`:
相对 ESM import, JSON import, `import.meta.dir` 位于 `project` 工作目录, 运行后
工作区清理, 穿越 / 缺失入口 / 非 ZIP 三种拒绝, 以及随后的单源码恢复.
同批次的 M9 十语言资源与真实错误套件也各两轮通过, 未单独归档.

这是插件侧的接收与展开证据. 宿主 `BunPluginScriptEngine` 的项目打包只在宿主仓库
通过编译与单元测试, 没有随本批次运行; 用户手中已发布的 AutoJs6 仍只发送单文件.

## 实际设备身份

| 设备 | API | 内核 | 指纹 | UID |
|---|---|---|---|---|
| Sony XQ-DQ72 | 33 | `5.15.74-android13-8-04992-g623fe372881f-ab10534577` aarch64 | `Sony/XQ-DQ72_CN/XQ-DQ72:13/67.0.F.1.255/067000F001025500390267680:user/release-keys` | 10656 |
| Redmi 22120RN86C | 33 | `4.19.191-perf-g2f9faa927855` aarch64 | `Redmi/earth/earth:13/TP1A.220624.014/V14.0.4.0.TCVCNXM:user/release-keys` | 10542 |
| Xiaomi 23046RP50C | 35 | `5.10.209-android12-9-00019-g4ea09a298bb4-ab12292661` aarch64 | `Xiaomi/liuqin/liuqin:15/AQ3A.241006.001/OS2.0.9.0.VMYCNXM:user/release-keys` | 11044 |

三台均为 primary ABI `arm64-v8a`, `getconf PAGE_SIZE` 4096, shell smaps 内核映射 4096,
native bridge `0`. 安装前检查确认 `.diagnostics` 主包与 test 包都不存在; 三台设备上
用户已安装的生产插件 `io.github.supermonster003.autojs6.plugin.bun.runtime` 未被替换或触碰.

## 固定源码与 APK

一次受控 Gradle 构建 (2026-09-15T05:25:20Z 至 05:25:32Z, `--offline`) 绑定 88 项仓库输入,
单元测试 37/37, lint 与 `verifyDebugApkRuntimeIntegrity` 通过. 三台设备安装同一对 APK,
安装后 SHA-256 与本机字节一致; 两个 APK 使用同一签名证书 `31a681fcfffb3e42…`.

| APK | bytes | SHA-256 |
|---|---:|---|
| ARM64 Debug (`.diagnostics`) | 41233429 | `a960af0a523f717d…` (完整值见 JSON) |
| instrumentation | 2317396 | `71e9f98134a8905f…` |

ARM64 Bun payload 87914400 bytes, 与 `tools/bun-runtime/runtime.lock.json` 一致.
没有重建 native, 没有替换任何锁定字节.

## 两轮结果

| 设备 | 轮 | 九项 Binder | 生命周期 (CANCELLED x3 / TIMEOUT / OUTPUT_LIMIT, ms) | JUnit 耗时 |
|---|---|---|---|---|
| Sony XQ-DQ72 | 1 | 9/9 | 305, 302, 304 / 3305 / 809 | 10.9 s |
| Sony XQ-DQ72 | 2 | 9/9 | 307, 304, 306 / 3306 / 812 | 11.0 s |
| Redmi 22120RN86C | 1 | 9/9 | 417, 413, 413 / 3305 / 815 | 15.4 s |
| Redmi 22120RN86C | 2 | 9/9 | 421, 410, 413 / 3304 / 814 | 15.8 s |
| Xiaomi 23046RP50C | 1 | 9/9 | 328, 311, 418 / 3310 / 821 | 13.0 s |
| Xiaomi 23046RP50C | 2 | 9/9 | 335, 416, 315 / 3312 / 826 | 12.8 s |

十条生命周期记录中每条均 reaped=true, exit 137, workspaceRemoved=true, 均在 5000 ms 预算内.
每轮之间停止测试包进程. [归档 JSON](2026-09-15-m6-workspace-archive-binder.json)
绑定完整 report, 原始 instrumentation 输出, 安装/签名/清理事实与 88 项输入摘要.

## 首次尝试与修正

同日 13:22 的首个批次 (ARM64 主包 `479bb10c6b5ed30e…`, 同一 test APK) 在两台 API 33 设备上
两轮全部通过, 但在 Xiaomi API 35 的第一轮 `workspaceArchiveProjectRoundTrip` 失败:
敌意归档 (`../escape.js`) 返回了 `INVALID_REQUEST`, 诊断却不含 `INVALID_ENTRY_PATH`.
原因是 Android 14+ 对 targetSdk 34+ 应用启用的 ZIP 路径校验
(`dalvik.system.ZipPathValidator`) 在 `ZipInputStream.getNextEntry` 阶段就以 `ZipException`
拒绝该条目, 展开器把它归为 `CORRUPT_ARCHIVE`. API 33 设备没有该校验, 由展开器自身的
路径规则拒绝. 修正后展开器把校验器的拒绝 (消息前缀 `Invalid zip entry path`) 映射为
`INVALID_ENTRY_PATH`, 固定消息不回显条目名, 其余头部失败仍为 `CORRUPT_ARCHIVE`;
新增 JVM 单测 `platformPathValidatorRejectionsReportInvalidEntryPath`.
首个批次的三份 report 与原始输出保留在本机批次目录, 其清理均通过 (两包卸载, UID 零进程);
源码已变更, 按归档器规则不将其绑定为通过证据.

## 清理与边界

三台设备均卸载 `.diagnostics` 主包与 test 包, 六个 UID 最终零进程. 没有操作任何 AVD,
没有触碰用户的生产插件与宿主. 本批次不构成 Release 验收, 不扩大 Android 支持范围,
也不代表宿主打包路径的端到端验收; 后者待 AutoJs6 发布携带 `BunPluginWorkspaceArchive`
的版本后, 用真实项目目录再做一次宿主到插件的往返.
