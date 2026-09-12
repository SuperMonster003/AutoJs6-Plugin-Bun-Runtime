# M3: blocked-SIGSYS 异步 spawn 覆盖及 API 28 失败

日期: 2026-09-13 (Asia/Shanghai; 原始运行时间为 2026-09-12 UTC), G1/G2. 独立 test-only 应用探针, 非新的插件 Binder 或 Release 验收.

## 结论

新信号边界门禁 **未通过**. 增加两个固定 blocked-SIGSYS 异步 `Bun.spawn` 模式后, 四个原生 4 KiB 环境各两轮 31/31, 合计 **248/248**. Sony G8441 / API 28 则连续两轮 **29/31**: 两个新模式均退出 159, 共四次失败, 没有输出语义记录. 原 29 项在五个环境的两轮仍全部通过 **290/290**. 不把原有通过、其他设备通过或清理通过视为新门禁通过, 不将失败标成 skip 或 expected-failure acceptance.

| 设备 | API | 原生 ABI | 应用页大小 | 第一轮 | 第二轮 | 新两模式 |
|---|---:|---|---:|---:|---:|---|
| Sony G8441 | 28 | arm64-v8a | 4096 | 29/31 | 29/31 | 0/4, exit 159 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 31/31 | 31/31 | 4/4 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 31/31 | 31/31 | 4/4 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 31/31 | 31/31 | 4/4 |
| Google sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 | 31/31 | 31/31 | 4/4 |

全部实际应用进程均为普通 UID、`untrusted_app` SELinux 域、seccomp=2; 硬断言 API、primary ABI、kernel machine 与 `Os.sysconf` 页大小. ARM64 不是翻译执行, x86_64 不是 16 KiB 模拟环境. 完整 fingerprint、kernel、安装后摘要、构建收据及原始 instrumentation 分别见[四环境通过归档](2026-09-13-m3-blocked-async-passing.json)和[API 28 失败归档](2026-09-13-m3-blocked-async-api28-failure.json).

## 新测试为什么必要

旧 `fd-spawn-blocked-sigsys` 先屏蔽 SIGSYS, 验证 `spawnSync` 的 caller/child mask, **恢复 mask 之后**才运行异步 `spawn`. 固定补丁 2 的上游回归也只调用 `spawnSync`. 因此这些历史结果没有覆盖异步调用线程保持 SIGSYS 阻塞的情况.

新独立 `async-signal-probes.mjs` 有 `native` 和 `trap` 两个绑定模式, 不改旧 29 个定义、夹具或断言. 原 29 项紧凑 JSON 的 SHA-256 保持 `3c1d33410d09c6ca15ba01f01cc43734275511b5078713cf7723c37ea1faee3f`, 新单元测试锁定此子集. 每个新模式在新 Bun 进程中运行, 没有先调用 spawn 来预热等待路径.

1. 打开私有哨兵, 用 fcntl 分配 `[256,512)` 内的非 CLOEXEC FD. 在未屏蔽 SIGSYS 时做原始 `close_range(fd,fd,CLOEXEC)` 对照, 核对仍打开及标记, 随后清除 CLOEXEC, 不让预先设置的标记代替测试结果.
2. TRAP 模式额外安装与既有硬上限夹具相同的 ABI 检查过滤器, 只针对 syscall 436 和固定 prctl marker. 核对独立 BPF 摘要及 ENOSYS. 过滤器只作用于调用线程及其后代, 不同步已有线程, 不额外针对 pidfd_open, 不移除 Android 策略.
3. 保存调用线程原始 mask, 仅加上 SIGSYS 位. 顺序启动三个短生命周期、非 Bun 的异步 toybox 子进程, 分别检查 stdout FD 可见、哨兵 FD 不可见和 `/proc/self/status`. 无 shell、任意命令或依赖安装.
4. 启动前、`Bun.spawn` 返回后及等待流/退出后均核对同一 TID 和精确 mask. 状态子进程核对 PID、PPID、四个 UID 值、seccomp=2 和继承的完整 SigBlk. 每个 child 的退出已通过句柄等待, 对应 `/proc/PID` 必须消失. FD 和 mask 是不同子进程的观测, 不声称一个程序同时验证了两者.
5. 三个子进程退出后才恢复原始 mask, 再检查 TID、哨兵 inode/device 和非 CLOEXEC 标记, TRAP 模式再做 marker. 不在 SIGSYS 被屏蔽时主动调用用于验证过滤器的 raw TRAP syscall.

只有新源码资产获得 12 KiB 上限; 原 JSON 128 KiB、单探针 15 秒/16 KiB 输出和 2048-byte 语义行限制不变. 新异步子进程各 1500 ms、合计 stdout/stderr 8192 bytes, 并行排空, 超时/超限经持有的句柄终止. 没有更改系统设置、硬 FD 上限、正式插件或用户脚本. 信号 mask 的线程作用域及 exec 继承语义参见 [Linux signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html); 过滤器继承与 TRAP 语义参见 [seccomp(2)](https://man7.org/linux/man-pages/man2/seccomp.2.html).

## 观察与原因边界

四个通过环境的 16 个新探针共观察 **48 个**短生命周期异步子进程, 每个探针耗时 **132-302 ms**, 捕获输出 **798-1041 bytes**. 原始 caller mask 为 `0000000080000000`, 屏蔽后为 `00000000c0000000`, 所有 immediate/after/child/restored 值均满足精确比较, 没有把原先已有的信号位清零. API 31/33 ARM64 的 raw close_range 返回 ENOSYS, API 35 ARM64 返回 EINVAL, x86_64 API 33 成功; 强制 TRAP 两 ABI 均按固定政策验证 ENOSYS, 不宣称 native close_range 在所有设备可用.

API 28 的内核为 `4.4.148-perf+`, 应用 UID 10743. 四个失败探针耗时 **128-131 ms**, 退出 159, 捕获字节为 0; supervisor 已结束, 私有工作目录删除. `possibleSignalFromExitConvention=31` 来自 supervisor 的 `128 + signal` 约定. 此处 **没有直接捕获的 si_syscall**; 只读检查崩溃缓冲未得到与这四次运行对应的 tombstone. 无法把退出码单独当成某个 syscall 的动态栈证据.

固定源码 checkout `7b9ac266888abda7ee6ec0b8ac11a74236420030` 已确认无工作区修改. 审查发现:

- `src/jsc/bindings/bun-spawn.cpp` 的 `posix_spawn_bun` 在子进程 FD 清理时允许 SIGSYS, 接近 exec 时恢复 child mask, 父进程返回前也恢复原 mask. 此项已被九补丁的同步测试覆盖, 不能直接归咎于旧 child close_range 问题.
- `src/spawn_sys/spawn_process.rs` 的 `PosixSpawnResult::pifd_from_pid` 在 waiter 标志尚未设置时调用 `bun_sys::pidfd_open`; 只有得到 ENOSYS/EINVAL 等返回错误后才设置回退标志. `src/spawn_sys/lib.rs` 中该标志初始为 false.
- `src/sys/linux_syscall.rs` 的 Android 实现对有效 PID 直接调用 syscall 434. 因此父线程恢复被屏蔽的 mask 后首次探测 pidfd_open, 是优先调查的路径. 这是基于源码和设备差异的**假设**, 不是已确认的崩溃指令. 不提前预热缓存来规避新测试.

下一步需要隔离首次调用、确认实际 signal/syscall 和等待分支, 再决定具体修复. 若需要 native 修改, 必须增加独立补丁、重放源码、每 ABI 两轮清洁构建并复跑不放宽的 31 项及 Binder; 不能将现有二进制重新绑定到新源码. 这轮只实现回归测试、验证器和失败归档, **尚未修复 native 失败**.

## 产物与清理

项目基线 `ebd0c03`. 新 test-only APK 重新编译 Java 和固定测试资产, 临时 v2 签名证书 SHA-256 为 `5767bd263589daff869d839f1a3889d7ad32d9798493cdf11fde49e89b4d620e`. 构建收据绑定 28 个 canonical 源码输入; 复核原有两轮干净构建的 ELF, 本轮不重新构建 Bun/JSC/supervisor.

| 产物 | bytes | SHA-256 |
|---|---:|---|
| ARM64 test-only APK | 35284523 | `435bc90dc0457516a9786b4fb0ca4b2d0c70b30faad9e2116d9d25da966b3cab` |
| x86_64 test-only APK | 36681253 | `c673e68ce3aa3c7ffb02aced86277e5805a3e6a75ad56fdfa5cd84d0351a9c63` |
| ARM64 九补丁 Bun | 87923320 | `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` |
| x86_64 九补丁 Bun | 90449736 | `83df7d535e4deab9484941a9e8cabc46be3ab6462ccc43c86b76f55325459130` |

APK manifest、签名、准确的单 ABI 内容、ELF/ZIP 16 KiB 对齐、安装后 APK/Bun/supervisor 摘要和只读 nativeLibraryDir 执行均核验. 通过归档器仍拒绝任何失败. 新失败专用归档器要求完整原始两轮 code 0、四个原样 exit 159、原 29 项经现有校验器全过及完整清理; 它始终输出 `passed=false`, 不能把失败转入通过归档. 单元测试还验证归档过程不修改输入记录, 以及其他回归、源码漂移或未清理进程会被拒绝.

Sony API 28/31、Redmi API 33、Xiaomi API 35 和 x86 AVD 的测试 UID 分别为 **10743/15111/10520/11020/10174**. 每次两轮之间 force-stop 后及最终卸载后均为零 UID 进程. 全部测试包已卸载, 仅关闭本轮启动的 `bun-hard-limit-api33-20260912` / emulator-5560. 预先运行的 API 27 / emulator-5554 保持在线, Sony XQ-DQ72 未操作. 三星远程通道当前离线, 未续租或操作用户预约账户.

## 本地门禁与未覆盖项

162 项 Node 测试、11 项 Python 测试、8 项 JVM 测试通过; 十语言/36 个 Markdown 生成一致性通过. 新译文最初因全角标点被校验器拒绝, 已修正文案并重跑通过, 未改校验规则. 生产单元测试、三类 Debug APK native 完整性/16 KiB 对齐、AndroidTest APK 构建及 lint 以 `--rerun-tasks` 执行成功 (96 个任务), 文档生成后再次完成增量构建检查. IDE 构建成功; 已有 SDK XML、extractNativeLibs 和 Bundle.get 警告未在本轮扩大处理. CI 已接入新增反例测试, 但本轮没有远程 CI 或公开发布记录.

旧 29 项七环境 406/406、现有 8 项 Binder 十二环境 192/192 及之前所有失败原样保留. 本轮没有新 Binder、API 32 ARM64、原生 ARM64 16 KiB 或最终签名 Release 验收, 也没有测试所有 blocked syscalls、全线程、FD 70000/UNSHARE、watch/reload、完整包管理器和长时性能. 四个本地环境的新模式成功不能填补这些缺口.

官方最低版本仍为 Android 13 / API 33, 实验 `distributionReady=false`. 官方 payload、x86 大页候选及生产能力不变; 保持单源码 `--no-install`、无相对项目导入、无 AutoJs6 globals/Java bridge、Binder 有界流式输出及可信脚本而非安全沙箱的契约. 当前不需要用户手动验收或立即预约三星; 待失败定位/修复及本地复测后, 再预约 API 32 ARM64 和原生 ARM64 16 KiB 验证新增边界.
