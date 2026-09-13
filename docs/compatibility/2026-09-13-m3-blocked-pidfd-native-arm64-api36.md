# M3: 十补丁运行时的 Samsung 原生 ARM64 16 KiB 回归

设备执行时间: 2026-09-13 09:01-09:05, Asia/Shanghai. G2, test-only.
Samsung SM-A566B / API 36 / 原生 ARM64 / 16384-byte 页使用同一十补丁
`1.4.0+a9c76a599` 通过两轮原 31 项应用探针 **62/62** 和两轮完整八项 Binder
**16/16**. 本批没有失败、跳过或重试, native 和三个实际测试 APK 都与本日上午
[Fold4 API 32 批次](2026-09-13-m3-blocked-pidfd-native-arm64-api32.md)完全相同.

## 原生 16 KiB 身份

| 字段 | 实际结果 |
|---|---|
| model | Samsung SM-A566B |
| API / release | `36` / `16` |
| primary ABI / kernel machine | `arm64-v8a` / `aarch64` |
| page size | `16384`, shell getconf 与两套应用内 Os.sysconf 一致 |
| shell smaps | KernelPageSize 和 MMUPageSize 均为 16 kB |
| native bridge | `0` |
| kernel | `6.6.77-android15-8-abA566BXXU6BYIF` |
| fingerprint | `samsung/a56xnaeea_16kb/a56x:16/BP2A.250605.031.A3/A566BXXU6BYIF_OXM6BYIF:user/release-keys` |

用户切换了同一 RDB 端口 50781 的设备, ADB model/transport 和实际 API/page 字段均重新核对.
探针在普通 UID 10320、`untrusted_app` 域和 seccomp=2 中执行, ELF 来自只读 nativeLibraryDir.
这份记录是三星 ARM64 硬件页证据, 与同时在线的 x86 AVD 及其模拟 16 KiB 用户空间无关.
本轮没有启动、停止或测试任何 AVD.

## 未改变的探针与 Binder 套件

[探针 JSON](2026-09-13-m3-blocked-pidfd-native-arm64-api36-probes.json) 包含 31 个原定义、
28 个输入、两轮原始 instrumentation、原语义验证器输出及清理绑定. 没有放宽资源预算,
没有提前恢复 mask 或预热 waiter, 原 recovery-last 顺序保持不变.

- blocked-async native/TRAP 各两轮 **4/4**, 相关 child 观测 **12/12**.
  调用线程 TID/完整 mask、子进程 mask/UID/parentage、输出正向对照、FD 256 隔离和回收通过;
  三个异步子进程退出前 SIGSYS 保持屏蔽, 之后才显式恢复原 mask.
- hard-limit 四模式各两轮 **8/8**. 将 soft/hard 从 `32768/32768` 降到 `128/128`,
  FD 256 仍保留且不能恢复硬上限 (EPERM). 四个同 PID startup 标记 CLOEXEC;
  四个 spawn 观测检查两个非 Bun 子 API, 共八个 FD/limit 结果通过.
  本设备 native raw close_range 成功, 额外 TRAP 模式仍正确回退.
- 原 soft-limit 用例 **4/4**, forcible lifecycle **6/6**, 请求终止至 supervisor 退出
  **301-306 ms**, Java 与 supervisor 上限不变, 相关进程和目录已清理.
- 原 48 个目录路径断言通过, 包括 12 次拒绝根外哨兵读取; 原 lchmod 固定离线 CLI 对照通过.
  六项 raw syscall TRAP 控制共 12 次, copy_file_range/pidfd_open 的 EIO 控制语义共四次通过.
  raw openat2 在 filter 前已不可用, 不计为首次高层 EIO/TRAP 触达或六种完整高层 fallback 验收.

[Binder JSON](2026-09-13-m3-blocked-pidfd-native-arm64-api36-binder.json) 使用真实生产
service、精确 API AAR、原八个方法、实际签名权限和两轮进程重建, 共 **16/16**.
JS/TS、样例、发现/元数据/预热、流式输出、无效请求、超时、取消、输出限制和 Wake 契约通过.
十条生命周期记录均 reaped=true、exit 137、workspaceRemoved=true:
六次 CANCELLED 308-323 ms, 两次 OUTPUT_LIMIT 822/823 ms, 两次 TIMEOUT 均 3306 ms.
这些是整个执行的 durationMillis, 不是纯终止耗时, 均在原 5000 ms 预算内.

## 同一源码和 APK 批次

项目基点为 `df186ec54c2843c3eaa4847b7940accf520b8722`, native head 为
`a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`. ARM64 Bun 87923328 bytes,
SHA-256 `96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f`.
supervisor 7440 bytes, SHA-256 `25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537`.

| 实际复用的 APK | bytes | SHA-256 |
|---|---:|---|
| 31 项 ARM64 probe | 35284523 | `d10a3b2db85e1fe59bfb367df29332f5c972c43c2b740e9060bc79b4a1caec3f` |
| Binder ARM64 主包 | 79090487 | `8e80a900f78856dcbbf277b712054c6196cecb25a64f25b7a4edaf9910ec6cda` |
| Binder androidTest | 2403209 | `5d44a9ccac498765497a6d3333fb5300ba99e8895f080b5fa4cc92e5ff55469a` |

Binder 主包在 API 32 之前打包一次, 75 个输入逐项与上面 Git 基点匹配,
service 和八个测试方法与此前五环境定义一致. API 36 没有再次打包;
两个设备的三个 APK 完全相同, probe APK 也与此前五环境批次相同.
签名、单 ABI 内容、ELF/ZIP 对齐和安装后的主/测试 APK 摘要检查通过.
本轮没有重新编译 Bun/WebKit, 原 schema-2 构建证据与其明确记载的退出码缺失保持原样.

## 清理、累计结果与剩余边界

`.api28probe`、`.api28binder`、`.api28binder.test` 三包均卸载;
独立 postflight 确认三个包无 pm path, 三个实际捕获的 UID **10320/10321/10322** 均为零进程.
两个执行 UID 来自 runner, androidTest 的 UID 在包仍安装时单独捕获.
[独立设备观测补充](2026-09-13-m3-blocked-pidfd-samsung-device-facts.json) 保留页大小、
安装 UID 和 postflight 的结构化记录原文及摘要, 并绑定四份套件归档.
原有 emulator-5554 和期间由其他工作接入的 emulator-5560 未受操作, 其他物理设备也未测试.
清理完成后已通知用户可以结束租用.

两台三星补充批次总计 **124/124 探针、32/32 Binder**, 包括八个 blocked-async 和
24 个 child 观测、16 个 hard-limit 和 16 个 spawn API 检查、八个 soft-limit、
12 个 forcible lifecycle (301-306 ms) 及 20 条 Binder lifecycle 记录.
与此前五个本地原生 4 KiB 环境分批合计, 十补丁原套件在七个原生环境通过
**434/434 探针、112/112 Binder**: 六个 4 KiB 环境和本台 ARM64 16 KiB 环境.
累计 28 个 blocked-async / 84 个 child 观测通过; Binder 各 APK 输入批次分别绑定.

至此十补丁的 API 32 ARM64 与原生 ARM64 16 KiB 原套件回归已补齐.
这不是官方 native x86_64 16 KiB、九补丁大页 JSC 候选的十补丁 rebase、
所有 blocked syscall/线程/FD/API/OEM、watch/reload、长时压力或最终签名 Release 验收.
官方 API 33+ 下限、payload、native 锁和 `distributionReady=false` 不变;
单源码/no-install/无相对工程导入/无 AutoJs6 globals 或 Java bridge/有界 Binder 输出契约不变.
所有历史失败和通过报告继续保留, 不将本次结果倒写到以前的源码或 APK.
