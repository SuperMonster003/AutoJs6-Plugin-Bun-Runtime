# M3: 保留 blocked SIGSYS 的 pidfd 回退与十补丁回归

日期: 2026-09-13 (Asia/Shanghai). 新实验 revision 为 `1.4.0+a9c76a599`.
官方 Bun、supervisor、API 33 产品下限和 `distributionReady=false` 不变.

## 修复与源码边界

[此前独立诊断](2026-09-13-m3-blocked-pidfd-diagnosis.json) 已在 Sony G8441 /
API 28 / 原生 ARM64 / 4 KiB 四次直接捕获主线程 `pidfd_open` (434) 的
`SIGSYS / SYS_SECCOMP`, 未追踪对照同样 exit 159. 本轮没有重新运行该诊断.

项目自有 MIT 补丁 10 仅在 Android `pidfd_open` shim 增加 19 行:
查询调用线程的 signal mask; 如果 SIGSYS 被屏蔽, 不发起可选的 pidfd syscall,
返回 ENOSYS, 让现有调用方选择 waiter thread. 保留调用者的 mask 和 pending
信号, 不预热 waiter, 不提前解除屏蔽, 不改变 Linux rustix 路径或前九个补丁.
该 waiter 选择具有现有的进程级 sticky 行为; 即使系统支持 pidfd,
首次 blocked-mask 探测也会选 waiter. 这不是任意 blocked raw syscall 的通用修复.

- head: `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`
- tree: `cb762d12f6959834517c79f01f4c538346990962`
- patch SHA-256: `bd6563e58f24383718fb4f77f8bde52c99a198289a3246afac654939d7058b0d`
- 十补丁确定性重放、五补丁 upstream prefix 全路径等价和 28 个源码定义 blob 检查通过.
- 精确提取生产函数的十个 Linux host 用例通过, 包括 pending/thread-local/error、
  real-pidfd 和 actual-TRAP 控制. 它们组成一个 Python unittest 的十个 subtest,
  不替代 Android 设备证据. 首次在普通 WSL 中重跑时缺少 `cc`, 未运行任何用例;
  随后在原 digest-locked、禁网容器中全部通过. 两份日志均保留.

## 恢复已有构建, 没有重新编译

恢复时两个原 Docker 容器和工具 session 均已不存在, Windows 捕获日志停在编译中途.
两个原独立 clean checkout 已包含全部四个成品, 且源码 head/tree 正确、Git clean.
各 `.ninja_log` 保留成功的最终 link、linker-map 和 strip 边.

**原构建驱动退出码未保留下来.** 新 runtime evidence schema 2 将
`bothRunsExitCode` 明确记为 `null`, 不把恢复检查冒充原构建的 exit 0.
在同一锁定容器中, 额外将 Bun checkout 只读挂载, 对两个 ABI、两个目录分别运行
`ninja -n`: 四次均为 `no work to do`, exit 0, 没有编译或修改产物.
验证器要求四项 run/ABI、源码、输出摘要和最终 Ninja 边全部匹配, 拒绝缺项、重复、
待构建任务、失败状态和伪造原退出码. 十补丁来源与九补丁历史证据严格分开.

| ABI | 两份成品大小 | 两份成品共同 SHA-256 |
|---|---:|---|
| arm64-v8a | 87,923,328 bytes | `96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f` |
| x86_64 | 90,449,744 bytes | `c37f8b09ed8d4551709627292ef7770832c2568f70dcb22fe75341780e05fcde` |

四个文件逐字节配对一致, 全部通过完整 ELF64/PIE、linker64、API 28/NDK r27c
note、公开库/符号版本、RELR、非可执行栈、无 W+X segment、符号表指纹、build-id
及至少 16384-byte PT_LOAD alignment 审计. 新产物另存仓库外, 不覆盖旧证据或官方 payload.
精确 Bun base source archive、WebKit tag/commit/tree、463,115 个文件及许可证也已复核.
见 [完整构建证据](2026-09-13-m2-blocked-pidfd-runtime-evidence.json).

## 同一新运行时的设备回归

原 31 项定义只改预期 revision, 所有旧 fixture、语义 validator、Java instrumentation
和资源预算保持不变. 单元测试同时核对历史完整 31 项定义及 13 个受保护源码输入.
两份独立 native 成品重新绑定到双 ABI test-only probe APK.
Sony API 28 先通过两轮后, 才继续另外四个环境.

| 环境 | API | 原生 ABI | 页大小 | 31 项探针, 两轮 | 八项 Binder, 两轮 |
|---|---:|---|---:|---:|---:|
| Sony G8441 | 28 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 62/62 | 16/16 |
| sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 | 62/62 | 16/16 |
| 合计 | | | | **310/310** | **80/80** |

探针包括 20 次 blocked async / 60 个子进程语义观测、40 次 hard-limit 观测
(20 startup、20 spawn、40 spawn API 检查)、20 次原 soft-limit 及 30 次强制生命周期
观测 (301-307 ms). 同一调用线程、完整 mask、子进程 mask/UID、sentinel FD 隔离和
恢复时机均受原 validator 约束. 原 29 项、目录约束和 lchmod 控制也全部通过.
raw openat2 在这些环境的测试 filter 之前已不可用, 不扩大为首次高层 EIO/TRAP 接受.
见 [源码/APK/raw/cleanup 绑定的探针归档](2026-09-13-m3-blocked-pidfd-fix.json).

Binder 使用原真实生产 service、精确共享 API AAR 和原完整八个测试方法, 含 JS/TS、
输出、取消、超时、重复绑定、重启及五种生命周期诊断, 总计 50 条生命周期记录.
实际权限、签名和 read-only nativeLibraryDir 路径不变.
见 [独立 Binder 归档](2026-09-13-m3-blocked-pidfd-binder.json).

Sony API 28 的首次 Binder 尝试先过 8/8, 第二轮在测试开始前进程崩溃,
整批不计入上述通过数. 同时刻的 owned-process crash 记录为 Android ART 的
ADB-JDWP 连接线程 SIGSEGV, 栈顶 `MterpShouldSwitchInterpreters`, 随后为 DDMS 帧;
这不是捕获的 Bun `pidfd_open` SIGSYS. 未改 APK、runtime、测试或设备设置,
另开目录重跑相同 APK 两轮后通过 16/16.
[首次失败与崩溃记录](2026-09-13-m3-blocked-pidfd-binder-startup-failure.json) 独立保留.

所有测试包卸载后 UID 进程均为零, 仅关闭本轮启动的 API 33 AVD.
原有/无关设备没有被停止或重置; 未卸载用户 AutoJs6.

## 尚未覆盖

本报告没有十补丁的 Samsung ARM64 API 32 / 4 KiB 或原生 ARM64 API 36 / 16 KiB
结果, 已通知用户预约. 九补丁的远程 29 项/Binder 成绩不转移给新 bytes.
现有九补丁大页 JSC 候选及其历史 clean-build/Binder/pressure 记录不变;
新 Binder 构建与 runner 会拒绝将该候选标为十补丁, 需要单独 rebase 和验证.
本报告的 x86_64 是 4 KiB 环境, 不提供 x86 16 KiB 或 ARM64 硬件大页证据.

完整 syscall/API/FD/OEM 矩阵、Android FD 70000、UNSHARE、watch/reload、
任意 blocked syscall、多线程与长时压力、最终签名 Release 和 paired APK/source
发布仍开放. 生产产品依然仅声明官方 Android 13+、单源码、no-install、无相对工程导入、
无 AutoJs6 globals/Java bridge 和有界 Binder 输出. 此报告只接受列出的实验测试范围.
