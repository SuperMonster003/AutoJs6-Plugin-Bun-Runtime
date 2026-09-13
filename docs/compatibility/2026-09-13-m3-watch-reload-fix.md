# M3 watch/reload 描述符修复

2026-09-13, 从 `5d92ade` 的已归档失败继续. 第 13 补丁修复 Linux
`on_before_reload_process_posix` 忽略 `close_range(CLOEXEC)` 失败的问题.
新 native head 为 `e8b1296169a8e6f20c81e926dba6448afb25cd11`, tree 为
`7d715cd177328d44b12b6346bcf0e07e835b3578`, revision `1.4.0+e8b129616`.
本文的新源码和设备记录与[十二补丁失败](2026-09-13-m3-watch-reload.md)分别保存.

## 实现与范围

原生 `close_range(3, UINT_MAX, CLOSE_RANGE_CLOEXEC)` 成功时继续原快路径.
失败时使用第 8 补丁已有的 `bun_spawn_fd_fallback(3, INT_MAX, true)`:
固定 4 KiB 栈缓冲和 raw getdents/fcntl 枚举实际 FD, 不依赖当前软/硬限制,
也不使用原来的 65536 扫描上界. 该分支只标记 CLOEXEC, 不关闭其他线程
正在使用的描述符; 只关闭本次打开的枚举目录. 原 helper、预算和 spawn 调用点未改.

枚举或标记失败时, 输出有界 errno 诊断并以 exit 1 停止, 不再进入 exec.
这也发生在 IPC 例外恢复和信号处理之前. 标准描述符 0-2 和显式
`NODE_CHANNEL_FD` 的原保留规则不变, 后面的完整 IPC/信号段逐字节保护.
FreeBSD 的原调用和 Darwin 路径不变. 未调用分配内存的 startup helper,
未增加依赖, 未改生产服务、共享 AAR、官方 Bun 或产品 API 33 下限.

这不是对共享 FD 表的原子隔离. 并发创建/复用 FD、`CLOSE_RANGE_UNSHARE`,
blocked/pending 信号跨 exec, 真实 Android IPC 消息跨 watch reload,
Android FD 70000 与大页运行仍需各自证据. Linux 主机的高位 FD 或模拟
平台条件不能替代 Android/OEM、FreeBSD 或 Darwin 设备执行.

## 固定源码与主机对照

[补丁锁](../../tools/bun-runtime/experimental/api28/patches/series.lock.json)
完整重放 13 个补丁, head/tree 一致; 原 5 补丁上游等价前缀和 28 个
source-definition blobs 均通过. 补丁完整 context 对应前后两个源文件
Git blob, host 测试校验摘要和行数后提取完整生产函数, 没有复制另一份实现.

[主机测试](../../tools/bun-runtime/experimental/api28/reload-fd/README.md)
在锁定、禁网、只读输入的 GCC 13 和 Clang 21 容器中各完成 25 个模式:

- 12 个 Linux 成功模式使用真实 FD、信号和 exec, 包括 FD 70000 高于
  降至 128 的 soft/hard limit, 恢复 EPERM, 显式 CLOEXEC, IPC 3/256/70000,
  非法 IPC 参数和另一线程发起重载. 原生 close_range 控制必须真实成功.
- 3 个旧源码负对照在 ENOSYS/EINVAL/EIO 控制下必须失败同一 FD 标记断言.
- 6 个注入失败检查精确 exit/诊断、仅自有目录清理、有限 EINTR 重试,
  信号 disposition/mask 尚未改变且已有 FD 保留.
- 4 个原/新 FreeBSD/Darwin 预处理策略对照在 Linux 编译运行, 不作为这些
  操作系统的设备证据.

首次 GCC 编译因旧 host 头文件缺少 SYS_close_range 定义而未执行任何测试,
原日志保留. 仅测试 harness 补充固定 syscall 436 后, 两个最终 compiler
driver 均 actual exit 0. 共享 helper 的原有详细错误/预算测试保持独立.

新 Node 门禁保护整套 35 项定义和 17 份 fixture/validator/Java/shared-process
输入, 只允许 expected revision 随新源码更新. 原 watch 失败归档及其固定
历史 receipt/definition hashes 保持原样, 不改变 sentinel 或放宽输出验证.

## 构建与设备门禁

两次全新独立双 ABI 构建均已完成, 两个实际 driver exit 为 0, 每 ABI
两份完整成品逐字节相同. [schema-3 原生构建证据](2026-09-13-m2-watch-reload-runtime-evidence.json)绑定 clean head/tree,
16 个未变 recipe、完整原始日志、最终 link/map/strip 边和四份 ELF 审计.
collector 和完整 ELF verifier 的实际退出码均为 0. 原锁定上游 JSC/ICU 复用,
没有新 WebKit/ICU 构建, 不把历史设备成绩转给新源码.

- Run 1: 2026-09-13T13:06:47Z 至 2026-09-13T13:32:41Z, actual exit 0.
- Run 2: 2026-09-13T13:32:45Z 至 2026-09-13T13:58:20Z, actual exit 0.

| ABI | bytes | 两次一致 SHA-256 |
|---|---:|---|
| arm64-v8a | 87923328 | `c8f2513f3bea1a37d5c34c1f84722b0b4563363cc121f7a0f4eee8aa15427160` |
| x86_64 | 90449752 | `cb3104fbd41fb55ac301a177756b41fa57065e2cf18fa836bafb2b13cf4043ac` |

`runtimeProduced=true`. 新 APK 在六个原生 4 KiB 环境完成不变的 35 项探针和
完整八项 Binder, 每套件每环境两轮. [探针归档](2026-09-13-m3-watch-reload-probes.json)
为 420/420, [Binder 归档](2026-09-13-m3-watch-reload-binder.json)为 96/96.
探针的 32 个输入和 Binder 的 83 个输入全部逐字节匹配项目提交 `bf5cb72`;
同 ABI 设备复用完全相同的 APK, 生产服务、AAR、签名与权限检查均保留.

| 设备 | API | 原生 ABI | 页字节数 | 35 项两轮 | Binder 两轮 | watch 原生 close_range 控制 |
|---|---:|---|---:|---:|---:|---|
| Sony G8441 | 28 | arm64-v8a | 4096 | 70/70 | 16/16 | ENOSYS |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 70/70 | 16/16 | ENOSYS |
| Sony XQ-DQ72 | 33 | arm64-v8a | 4096 | 70/70 | 16/16 | 成功 |
| Xiaomi 22120RN86C | 33 | arm64-v8a | 4096 | 70/70 | 16/16 | ENOSYS |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 70/70 | 16/16 | EINVAL |
| Google sdk_gphone64_x86_64 | 33 | x86_64 | 4096 | 70/70 | 16/16 | 成功 |

通过批次的 24 个 watch 模式产生 48 次实际重载和 72 个镜像观测.
每次重载后的 FD 256/257 均已关闭, 没有把 startup 后增加 CLOEXEC 当作
exec 前关闭; 同 PID、同 UID、原 stdio 和每镜像一次普通 SIGSYS 交付保持.
原生 ENOSYS/EINVAL/成功对照分别记录, 强制 TRAP 全部返回 ENOSYS.
24 个受控 watched child 均由原句柄回收.

原套件的 24 个 blocked 模式与 72 个 child 观测、24 个 pending 模式与
72 个 child 观测继续通过. 48 个 hard-limit 模式及 48 个 spawn API 检查、
24 个 soft-limit 模式和 36 个强制生命周期检查通过, 回收耗时 301-307 ms.
Binder 另有 60 条生命周期记录, 与应用探针的数字分开.

每台设备的三个测试包均卸载; 接受批次的 18 个包/UID 绑定均独立捕获并
核验零进程. 本次启动的唯一 API 33 AVD 已关闭. 未操作此前 API 37 AVD
或它的私有 ADB, 不推断它们后来不在清单中的原因.

## 首次 API 28 中止与未闭合的稳定性边界

[首次尝试](2026-09-13-m3-watch-reload-api28-abort-failure.json)保留为 69/70:
第一轮 watch TRAP 子进程 PID 9283 在 generation 0/1 两个正常镜像之后
以 SIGABRT 结束, 缺少 generation 2. 同次第二轮为 35/35.
已输出的两个镜像均没有哨兵泄漏, 没有超时、输出溢出或清理失败.

只读 owned-PID logcat 在中止前记录 `pthread_create` 的 `clone` 返回 EAGAIN,
但没有可用的对应崩溃栈. 尚未确认具体 abort 调用链或线程创建失败的原因,
事后内存/线程快照不能证明当时的资源状态, 也不能归因于历史 ART/ADB-JDWP 崩溃.
保存该诊断后仅做一次完全相同 APK 的复测, 两轮 70/70 通过;
没有改 fixture、预算、设备配置或运行时. 首次尝试的 UID 也已清理且独立核验.
整个失败尝试不进入上述接受数, 后续有限通过不关闭 watch 稳定性或资源压力门禁.

## 仍需后续证据

本轮在 APK 就绪后询问三星 API 32 / ARM64 / 4 KiB 与 API 36 / 原生硬件
16 KiB 设备窗口. `localhost:49909` 接受 TCP, 但私有 ADB 连接失败,
未取得设备身份或安装 APK; 50781 的一次 TCP 检查也未连接.
本次私有 ADB 的确切 PID/端口已独立确认消失, 默认 ADB 与 RDB 未动.
开放端口和未答复的可用性询问不构成设备接入证据.

十三补丁的这两项三星门禁、独立大页 JSC 候选重对齐与新设备回归、
API 28 watch 中止诊断、其余 syscall/API/FD/OEM、blocked/pending 跨 reload、
Android IPC/FD 70000/UNSHARE、长时压力/性能和 Release 仍开放.
[检查点](2026-09-13-m3-watch-reload-checkpoint.json)绑定主机/构建/输入/清理与
本地验证, 不额外增加设备通过数.

十二补丁 baseline 的 462/462 probes、112/112 Binder 与独立 JSC 候选
成绩均只属于原批次. 不将它们转移到第 13 补丁; `distributionReady=false`.

## 历史候选校验的独立修正

原生构建和对应源码审计通过后, 首次全量 Node 检查为 243/245.
两项失败来自十二补丁 JSC 候选加载器仍读取当前 API 28 构建配方;
这些文件现已指向十三补丁, 不能用于重新解释旧候选的构建输入.

历史加载现要求候选与原构建归档的完整 SHA-256 一致, 并逐字段比较
全部记录, 包括原始物理输入摘要、换行映射、实际退出码和最终边.
原生身份、JSC/ICU 和共享构建输入仍经原结构检查. 新构建记录器仍
要求当前输入和物理字节精确匹配; Binder 准备阶段仍拒绝旧候选匹配
新 Bun 源码. 新增负对照验证重新标记源码、替换配方、删除退出码/最终边
均被拒绝. 原候选锁、历史报告、压力 fixture/语义校验器和预算均未变.
这是归档校验修正, 不构成十三补丁 JSC 重构建或大页设备验收.

最终 Node 247/247、Python 38/38、文档及矩阵生成检查通过. 两次生产
Gradle 检查均实际退出 0; JVM 任务为 UP-TO-DATE 的既有 21 项通过结果,
lint 为 0 错误/44 条既有警告. 最终 IDE 构建成功, 仅原有两条警告.
