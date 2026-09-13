# M3-B: 启动检查诊断与失败重试生命周期

日期: 2026-09-13, Asia/Shanghai. 从干净 `4195101db5121026d9c04c4571e141c54c99bacb`
继续. 本轮修改生产 Kotlin 启动检查与内部测试, 复用官方和十补丁 native 成品,
没有 Bun/WebKit 构建, 没有更换任何 payload、supervisor、AAR、variant 或最低系统版本.
`distributionReady=false` 保持不变.

## 实现范围

原检查永久缓存所有失败, 且在进程退出后完整读取合并输出. 新实现区分结果:

- 成功以及缺失/哈希/版本/已知页大小不匹配缓存到服务重建.
- 临时启动、超时、输出超限、读取或非零退出失败, 在清理完成后冷却 30 秒.
  之后首次 info/prewarm/run 请求触发一次检查, 并发请求共享结果; 没有后台重试.
- 回收或输出读取未完成时禁止重试, 防止反复累积进程或读取线程.

检查继续先验证安装字节, 再按固定参数数组执行 `--version`、`--revision` 和
`--eval "void 0"`. stdout/stderr 分开持续读取, 每流最多保留 4096 bytes,
超限即请求终止; 每条命令 10 秒超时, 随后最多 2 秒等待监督器, 每个读取线程最多
500 ms join. 始终先请求监督器终止, 再关闭已完成的读取流; 对仍阻塞的 Java pipe
不在 Binder 线程同步 close, 由读取线程收尾且停用重试. 中断路径保留调用线程中断标志.

失败先返回插件当前语言的摘要, 再附 API、已验证 ABI、阶段、预期/已观察的 identity、
重试策略和固定检查的退出/清理事实及有界 stderr. 保留已成功检查的 version/revision,
终态文本仍受 16 KiB UTF-8 限制, 不拆开有效 Unicode 字符. 不发送 fingerprint、用户源码
或任意异常消息. 无 Process 返回的启动失败没有退出码, cleanup 标志表示没有新增句柄/读取线程.
`possibleSignal` 明确标为 `exit-convention-only`; 不能由 159 独自证明 SIGSYS 或 syscall.
没有增加 Bundle key、AIDL transaction 或重试开关.

源码入口: `BunRuntimeBinary.kt`、`BunRuntimeProbe.kt`、`BunRuntimeMessages.kt`.
[工具与重放说明](../../tools/diagnostics/PROBES.md) 定义构建、设备执行、归档及边界.

## 两个新源码绑定的 APK 批次

官方批次为 `.diagnostics` 隔离 Debug APK; 实验批次为既有 minSdk-28 `.api28binder`
test-only 模块. 都使用真实生产 service、签名权限、API AAR 和监督器. 构建 helper
固定 Gradle 参数, 保存实际 exit 0 与日志, 前后逐项比较输入, 并另存实测 APK.
官方批次绑定 87 项输入, 实验批次绑定 98 项输入.
各报告包含完整输入路径/字节数/SHA-256、APK hash、签名和 installed APK hash.
实验 APK 内嵌 receipt 也逐项核对, 不使用九补丁或 JSC 候选代替十补丁 baseline.

| 设备 | API / 原生 ABI / 页 | native 字节来源 | 原八项 Binder 两轮 | 新三项 probe 两轮 |
| --- | --- | --- | ---: | ---: |
| Redmi 22120RN86C | 33 / arm64-v8a / 4096 | 官方 `34cbb9a40` | 16/16 | 6/6 |
| Xiaomi 23046RP50C | 35 / arm64-v8a / 4096 | 官方 `34cbb9a40` | 16/16 | 6/6 |
| Sony G8441 | 28 / arm64-v8a / 4096 | 十补丁 `a9c76a599` | 16/16 | 6/6 |
| Sony XQ-AT72 | 31 / arm64-v8a / 4096 | 十补丁 `a9c76a599` | 16/16 | 6/6 |
| sdk_gphone64_x86_64 AVD | 33 / x86_64 / 4096 | 十补丁 `a9c76a599` | 16/16 | 6/6 |

官方 Binder [32/32](2026-09-13-m3-probe-lifecycle-official-binder.json) 与实验 Binder
[48/48](2026-09-13-m3-probe-lifecycle-experimental-binder.json) 分档. 原八个测试方法未改,
共 50 条原有生命周期观察. 这些是本轮服务/APK 回归, 不累加到历史十补丁 112/112.

新 probe [官方 12/12](2026-09-13-m3-probe-lifecycle-official.json) 与
[实验 18/18](2026-09-13-m3-probe-lifecycle-experimental.json) 每轮包括:

1. 内部 test-only 注入一次 IOException, 虚拟单调时钟控制 29,999/30,000 ms 边界;
   两组八个并发调用共享失败/恢复结果. 只启动一次失败尝试和随后 version/revision/smoke
   三条真实命令, 成功结果之后保持缓存. 这不是自然发生的设备启动故障或等待 30 秒的计时试验.
2. 内部替换一条固定测试命令产生版本不匹配, 模拟经过 3,000,000 ms 后仍不重试;
   新建 cache 后原 installed payload 检查成功. 没有改写安装文件或暴露生产注入入口.
3. 真实 installed Bun 的显式 exit 159、stdout/stderr 大输出、忽略 SIGTERM 的 1500 ms
   超时与后续恢复. 每次检查 reaped/drained, 超时得到 137, 完成时 probe 读取线程为零.
   显式 exit 159 仅验证推断标签, 不计作 seccomp SIGSYS 观察.

官方 ARM64 还复测十语言资源、六类实际错误和 finished 一致性:
[8/8 独立语言 JUnit、240 个错误/finished 观察](2026-09-13-m3-probe-lifecycle-messages.json).

## 两个失败尝试与各自重试

Sony API 28 首次批次第一轮 Binder 8/8、probe 3/3, 第二轮 Binder 在测试开始前
`Process crashed`. ActivityManager 将 PID 14374 / UID 10753 绑定到测试包,
原生日志为 TID 14382 `ADB-JDWP Connec` 的 SIGSEGV, 含 ART/DDM 启动帧.
[失败和 owned-process 摘要](2026-09-13-m3-probe-lifecycle-startup-failure.json) 单独保留,
不归因成 Bun pidfd SIGSYS, 不声称完整 ART 根因已定位. 相同 APK 和设置在新目录
重新运行两轮后通过, 没有代码、断言或预算变更.

官方 x86 API 36 / 16384-byte 用户页 AVD 的首次语言拒绝检查, 资源通过但在第八个
locale 后丢失 Binder 连接. `lowmemorykiller` 明确记录 PID 3808 / UID 10213 的
`:bun_runtime` 因 min watermark 被终止, 对应 DeadObjectException.
[首次失败](2026-09-13-m3-probe-lifecycle-page-refusal-failure.json) 保留原报告与精确进程日志.
相同 APK、AVD 设置和测试预算重新执行后, [两轮资源/拒绝 4/4](2026-09-13-m3-probe-lifecycle-page-refusal.json)
通过. 两次都没有执行被拒绝的 Bun. getconf/Os.sysconf 为 16384, shell smaps 为 4096,
仍是 x86 用户页 ABI 模拟, 不是原生 ARM64 硬件页或 x86 Bun 16 KiB 兼容验收.

拒绝回归复用官方批次原 APK, 没有重编或重新打包; 仅将相同输入事实重排成既有 message
runner 的 receipt 格式, 绑定原构建 receipt hash. 两个原始失败批次均不计入成功汇总.

## 清理与证据边界

六环境所有安装尝试 (含失败) 均卸载主/测试包, 分别捕获的两个 UID 进程最终为零.
只启动/关闭本轮 `bun-hard-limit-api33-20260912` / 5584 与
`bun-jsc-pressure-16k-20260912` / 5582 (本轮均以 2048 MiB 启动).
关闭前核对 AVD 名称, 最终 ADB 清单中两 serial 均消失. 预先在线 5554/5560 未操作.
没有使用三星或开启等待窗口, 没有 Gradle 缓存修复、native build、push 或 Release.

原 31-probe 应用套件没有重跑, 历史 434/434 和 112/112 及其源码/APK 绑定保持原样.
本轮也不是三星 API 32/原生 ARM64 16 KiB、JSC 压力、全 syscall/FD/OEM、性能或签名
Release 验收. 官方 API 33+、双 64 位 ABI、单源码/no-install/无 AutoJs6 globals/Java bridge
及发布门槛不变. 当前 UI 诊断改动不改变共享协议或 native 能力.

## 最终验证

新增 11 项 JVM 回归, 全部 JVM 21/21 通过; 全量 Node 193/193、Python 37/37 通过.
36 项 Markdown 产物生成及 --check、兼容矩阵 --check 通过. 矩阵登记 68 份 JSON,
160 条设备/尝试记录; 两次失败和执行前拒绝仅作诊断索引, 受控 probe 与 Binder 分开.
此前 60 份历史 JSON 不变.

官方隔离构建 14 秒、实验 APK 构建 24 秒, 均 exit 0; 生成最终文档后的四项生产 Gradle
检查 17 秒成功, 96 tasks (43 executed / 53 up-to-date). 官方 Bun/supervisor、APK
摘要及 16 KiB ELF/ZIP 门禁通过; lint 按实际 issue 节点为 0 errors / 44 warnings,
未增加此前本地化批次之外的警告. IDE build `isSuccess=true`, 仅既有 SDK XML 版本与
Bundle.get 弃用警告. 最终生产 APK 不替换本轮单独保存的实测 Debug 文件.
