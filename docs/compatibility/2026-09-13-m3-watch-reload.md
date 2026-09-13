# M3: 十二补丁 watch/reload 的 FD 泄漏门禁

2026-09-13, Asia/Shanghai. 从项目 `9485aa1` 继续, 在已完成的原 33 项三星门禁
基础上增加两个固定 watch/reload 模式. **新 35 项门禁失败, native 尚未修复.**
四个原生 ARM64 / 4 KiB 真机环境各两轮, 原 33 项通过 264/264, 新 watch 模式
2/16 通过, 14/16 失败, 全部观测为 266/280. 三个 APK 批次分别绑定源码并独立归档.
这些诊断结果不增加此前七环境原套件的 462/462 probes 或 112/112 Binder 接受总数.

## 设备结果

| 设备 | API / 内核 | 原生 raw CLOEXEC | 原生 watch 两轮 | TRAP watch 两轮 | 原 33 项两轮 |
| --- | --- | --- | --- | --- | --- |
| Sony G8441 | 28 / 4.4.148 | ENOSYS | 0/2 | 0/2 | 66/66 |
| Redmi 22120RN86C | 33 / 4.19.191 | ENOSYS | 0/2 | 0/2 | 66/66 |
| Xiaomi 23046RP50C | 35 / 5.10.209 | EINVAL | 0/2 | 0/2 | 66/66 |
| Sony XQ-DQ72 | 33 / 5.15.74 | 成功 | 2/2 | 0/2 | 66/66 |

以上均实测 `arm64-v8a/aarch64`, PAGE_SIZE=4096, 普通应用 UID,
`untrusted_app` SELinux 域和 seccomp=2. 原生模式的表格数据来自每个镜像内的 raw
调用观测, 不只根据 Android API 或内核版本推测. 强制 TRAP 模式的 raw 控制均为 ENOSYS.
新夹具没有 x86_64 或原生 ARM64 16 KiB 设备证据.

- [初始 API 28/Redmi API 33 失败](2026-09-13-m3-watch-reload-initial-failure.json).
- [API 35 EINVAL 失败](2026-09-13-m3-watch-reload-einval-failure.json).
- [Sony API 33 原生成功与 TRAP 失败对照](2026-09-13-m3-watch-reload-native-control.json).
- [源码、APK 构建、设备与清理绑定](2026-09-13-m3-watch-reload-checkpoints.json).

## 固定夹具与失败含义

`watch-reload-native` 和 `watch-reload-trap` 插在最终 recovery 项之前. 原 33 项
定义、已有 14 个 fixture/validator/shared-process 输入和所有原预算保持不变.
Java 只增加两个固定 asset 和记录绑定; 回归检查移除这些新增片段后, 原 Java 字节
仍与历史输入摘要完全一致. 生产 service、API AAR 和 supervisor 均不变.

每个模式通过已安装的只读 Bun executable 启动一个自有 `bun run --watch --no-install`
子进程. 只写本次私有目录内的固定脚本、代次文件和 sentinel. 父进程等到每个镜像
的完整记录后才触发下一次文件变更, 共要求初始镜像和两次实际重载, 顺序为 0/1/2,
并核对自有 child handle 的同一 PID、应用 UID 和标准输出/错误的同一 pipe/socketpair.

每个镜像都准备两个 inode 身份明确的 FD: 256 不带 CLOEXEC, 257 显式带 CLOEXEC.
初始镜像中两者都不存在. FD 257 在所有后续镜像中均关闭; 失败模式中的 FD 256
却仍指向同一 sentinel, 且 flags 变为 CLOEXEC. 该泄漏先记录为失败, 然后清理这个
已观测 FD, 避免下一代累积描述符. 记录没有把这次清理当作关闭语义通过.

16 个模式合计观察 32 次重载、48 个镜像. 14 个失败模式产生 **28 次 FD 泄漏**;
Sony 5.15 原生成功对照的四次重载均无泄漏. 每个镜像还分别验证普通 SIGSYS 的一次
JS 投递、相同主线程 TID, 以及移除 listener 后的 marker 行为. 48 次普通信号投递
全部符合预期, TRAP 未被误当作普通用户信号. 这些信号对照不抵消 FD 门禁失败.

过滤器仅在父夹具线程中安装, 再由新 Bun 子进程继承; 不修改系统或其他进程策略.
它只对 ABI、close_range 和固定无效 prctl marker 做受控匹配. 策略在 Bun 子进程
启动前已存在, 因而不声称观测了 watch 路径中首次进入 handler 的 syscall trace.
本次未阻塞或排队 SIGSYS, 不涉及跨 exec 的 pending/mask 等价性结论.

新 asset 仍限制为 12 KiB, 每个模式总预算 15 s, watched child 内部限时 6 s,
双流合计最多读取 8 KiB, 最终语义记录最多 2048 bytes. 超时、溢出、缺少代次、PID
变化或 SIGKILL 后仍有 child 都不能通过. 终止仅调用自有 Bun child handle 并等待回收.

## 源码定位与原生字节

原生源码始终为十二补丁 `06e518f73b4fccc6c3ffb17412ea166bf886bed0`,
tree `1eb8d5ea945001f018bdf14bd00c261d40b02573`, revision `1.4.0+06e518f73`.
本轮未修改原生源码, 未启动 native build. 所有测试 APK 复用此前两个独立 clean build
的逐字节一致成品并重新核对完整 ELF、摘要及只读安装 payload:

| ABI | bytes | SHA-256 |
| --- | ---: | --- |
| arm64-v8a | 87923328 | `86d1b4d0fd74591655bc55e55f90ec75c7d3a0aba2116200be419ae626ed53d6` |
| x86_64 | 90449752 | `f44f4197def111f8e753f88bc2b9b3b13d653e0a55e26851b32e1f45993628b8` |

只读源码检查在同一 clean head 上绑定了三个完整 source blob 和相关函数片段:

1. `src/jsc/bindings/c-bindings.cpp` 的 `on_before_reload_process_posix` 调用
   `bun_close_range(3, ~0U, CLOSE_RANGE_CLOEXEC)` 后忽略返回值, 未调用 FD fallback.
2. 同文件的 `bun_initialize_process` 在 raw CLOEXEC 失败后调用
   `bun_mark_inherited_fds_cloexec(4)`. 这能给已经泄漏到新镜像的 FD 补 flags,
   但无法追溯关闭已经发生的继承, 与实测 `[1,true,-1]` 结果相符.
3. `src/bun_core/util.rs` 的 `reload_process` 在上述准备后调用 `execve`.
   `src/jsc/hot_reloader.rs` 的完整 blob 也一并绑定.

源码与同设备 native/TRAP 对照共同定位到重载前缺少 CLOEXEC 后备处理. 本报告没有
捕获重载点的寄存器/si_syscall trace, 也没有提交或验收 native 修复.

## APK 批次与先期校验器修正

三个构建实际 driver exit 均为 0, 各输出 ARM64 和 x86_64 测试 APK; 只有 ARM64
APK 在本轮执行. 每批绑定 32 项输入, 其中 31 项在三批间完全一致. 原生二进制、
Android fixture、Java、35 项定义和预算完全相同. 仅 host watch 语义校验器有两次修正:

1. 初始校验器只接受 pipe, 而实际 Android Bun 使用 socketpair. 后续接受严格格式的
   pipe/socketpair, 同时仍要求跨重载的端点完全相同. 初始原生 FD 失败和其旧校验器文本保留.
2. 首版 FD 失败解析只允许 ENOSYS. API 35 原生控制实测 EINVAL, 因而补上这一精确失败
   形态. 旧解析器和该批次完整保留, 最终 Sony 正向对照使用再次绑定后的独立 APK.

| 批次 / 执行设备 | ARM64 APK SHA-256 |
| --- | --- |
| initial / Sony API 28, Redmi API 33 | `2cc6c292f08a2709b7e5bf6f780bfefdb0d1683ab64598b0e2b0ab101cead631` |
| control / Xiaomi API 35 | `db93193e3c44a00627ee91034fb127ecc3bbb056b774d4a67b85beb814be69bf` |
| positive / Sony API 33 | `93b5d43cb2ed0725c97743b715ec066b613b891d4f227fd26060397df8bd0dde` |

失败归档器锁定三个完整 receipt 摘要和 35 项定义摘要, 独立校验原始 instrumentation
文本、退出状态、全部旧语义和新 FD 失败形态. 初始两个校验器的完整规范化源码与原摘要
嵌入各自归档. 不放宽 live APK 输入检查, 不把失败报告改为通过, 不合并不同 APK 批次.
`projectBaseCommit=9485aa1` 表示本轮起点; 本轮新增夹具由精确 input receipt 绑定,
不声称这些新增源码已经存在于该起点提交中.

## 清理与后续范围

四个设备 runner 都实际返回 1, 原因均为保留的 watch 语义失败; 不是构建失败或清理失败.
所有测试包已卸载, UID10768/10531/11033/10654 均为零进程. 16 个自有 watched child
全部回收. 原 24 次 forcible lifecycle 在 301-308 ms 内完成, 其余原 33 项通过.
没有启动或停止 AVD, 没有启动私有 ADB server, 没有操作其他任务的模拟器或服务.

下一项优先工作是修复重载前 FD 标记的失败路径, 处理 setup 错误并保留明确的 stdio/IPC
语义, 然后做独立构建和相同固定夹具的新源码回归. 不能用新镜像启动后的补标记、提前
关闭测试 FD、跳过不支持的 raw 调用或放松检查来消除失败.

blocked/pending SIGSYS 跨 reload、IPC FD、并发 FD 竞争、FD70000、UNSHARE,
新夹具的 x86/ARM64 16 KiB, 更广 syscall/API/FD/OEM/pressure 和签名 Release 仍开放.
官方 API33+、生产执行契约、官方/实验/JSC locks 和 `distributionReady=false` 保持原样.

## 仓库验证

全量 Node 工具测试 243/243, Python 38/38 通过. Markdown 10 语言/36 产物和
兼容矩阵 94 报告/193 行检查通过. 原 90 份 JSON 及索引条目保持原样.
官方 Bun 和 supervisor 的摘要、ELF 与对齐验证通过.

生产 Gradle 的 `testDebugUnitTest`, `verifyDebugApkRuntimeIntegrity`,
`assembleDebugAndroidTest`, `lintDebug` 合并运行实际 exit 0, 14 s,
96 tasks (48 executed, 48 up-to-date). JVM 21 项结果由 Gradle 判定 up-to-date,
三个 Debug APK 的 runtime/16 KiB ZIP 门禁通过, lint 为 0 error / 44 warnings.
IDE 构建直接成功, 无 timeout, 保留 SDK XML 版本差异和既有 `Bundle.get` 弃用两个 warning.
上述工具与构建检查通过, 设备 watch/reload 门禁仍保留为失败.
