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

`runtimeProduced=true`, 新源码设备门禁待运行. 不变的 35 项和完整八项
Binder 每环境两轮, 源码/APK/raw/清理绑定将单独归档.

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
