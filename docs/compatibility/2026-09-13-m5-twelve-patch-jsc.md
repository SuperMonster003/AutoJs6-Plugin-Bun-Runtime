# M5: 十二补丁大页 JSC 候选

2026-09-13 (Asia/Shanghai). 本轮在 Bun `06e518f73b4fccc6c3ffb17412ea166bf886bed0`
上重新生成独立大页 JSC 候选, revision `1.4.0+06e518f73`, tree
`1eb8d5ea945001f018bdf14bd00c261d40b02573`. 官方 payload、API 33+ 产品边界和
十二补丁 baseline 的原生文件保持不变; `distributionReady=false`.

## 新源码与可复现构建

第 11/12 补丁的 parent/child mask 和 Android epoll caller mask/pending 修复沿用
已经锁定的源码, 没有新补丁或 JSC 配置变更. 使用两个全新独立 Bun checkout 完整离线构建,
两个实际 driver exit 都为 0, 两份完整 x86_64 成品逐字节一致:

| 字段 | 结果 |
| --- | --- |
| 字节数 | 90609496 |
| SHA-256 | `34edd4b99d74c7472febfcc3f1a1c6068bd57cd5714aab150b5b86dafa75b1ad` |
| ELF | x86_64 Android PIE, 完整两份 ELF 审计通过, PT_LOAD 至少 16384-byte 对齐 |
| 新 Bun 构建 | 2, 实际退出码 0/0 |
| 新 WebKit / ICU 构建 | 0 / 0 |
| 复用输入 | 两套此前独立构建的三个 JSC 库与生成 config, 原锁定上游 ICU |

仍固定 WebKit `0f966e81b78c84bb23213e391bc679c4ef83e56b`,
`USE_64KB_PAGE_BLOCK=1`, JIT/DFG/FTL/Wasm-JIT 与 external mimalloc 原设置.
每次完整预检 22 source、206 Cargo、125 npm 输入. 两次 clean head/tree、完整日志、
唯一最终 link/map/strip edges、原始 driver 摘要和实际 build interval 均已绑定.
新增 schema 2 候选同时绑定五个 JSC recipe 与十六个 API28 build inputs, 二十一项
在两轮构建期间均未漂移. 缺失/非零退出码、复用旧 bytes、重复目录/receipt、未完成
Ninja 边或输入漂移都会被拒绝. 不把 Ninja dry-run 退出码当作原构建退出码.

本机既有 `verify-experiment.mjs` 有 1479 个 CRLF 和两行 LF (1011/1012),
实际 84833 bytes, Git 规范文本为 83354 bytes. 最初直接比较两种摘要的 recorder
失败, 第二次仅支持统一换行也失败; 两次都在写候选锁之前结束. 原始失败日志保留.
最终记录显式保存精确换行映射, 从规范源码重建每一个原始字节并验证完整 SHA-256,
同时复核构建后的物理文件与原 driver 一致. 错误/重复行号、缺失映射、源内容和摘要
漂移均被拒绝. 原构建日志、退出码、源码与二进制没有改变或重跑.

[独立候选锁](../../tools/bun-runtime/experimental/webkit-x86_64-16k/twelve-patch-candidate.lock.json)
与 [独立构建归档](2026-09-13-m5-twelve-patch-jsc-builds.json) 保留上述证据.
原九补丁 incremental candidate、后续 clean-build 归档和十补丁 rebase 锁/成绩全部保持原样.

## APK 与设备门禁

当前 isolated `jsc16k` profile 只选择新的十二补丁候选, 要求它与 baseline source
完全一致; 编译输入 receipt 和安装前后 payload/signature 校验继续生效.
原八个 Binder 方法、原七种压力模式的 asset、Java instrumentation、语义 validator
和所有时间/输出预算保持不变, 已与十补丁接受归档逐项核对.

随后同一主/测试 APK 在干净项目提交 `0210e824ea1121980e7ffc09cc8b94888b9cf2f2`
生成, 实际 Gradle exit 0 (16 秒). 内嵌 83 个编译输入逐项匹配该提交; 所有接受轮次
复用完全相同的 APK, 安装前后的主/测试 APK 摘要、签名、完整 native payload 和对齐均通过.

| 环境 | 应用页大小 | shell 内核/MMU 页大小 | 原八项 Binder, 两轮 | 原七模式压力, 两轮 |
| --- | --- | --- | --- | --- |
| API 36, native x86_64, sdk_gphone64_x86_64 | 4096 | 4096 / 4096 | 16/16 | 14/14 |
| API 36, native x86_64, sdk_gphone16k_x86_64 | 16384 | 4096 / 4096 | 16/16, 完整重试 | 14/14 |
| 合计 | 分别绑定 | 不与 ARM64 硬件页混合 | 32/32 | 28/28 |

| 测试 APK | 字节数 | SHA-256 |
| --- | --- | --- |
| 主 APK | 42925769 | `db36cf246c715172cbce4df67fe36ecb93c8978963ccf10030a6624c03d4bb87` |
| instrumentation APK | 2387549 | `257ef159b2ea2ba300aa0eac2351dee5c4ba8b450a6f4827c39f13454bb34433` |

压力四个 JUnit 轮次分别运行全部七模式, 含 LLInt/Baseline/DFG/FTL 实际目标函数采样与
独立算术校验, GC 保活/堆边界, Wasm 执行/内存增长和合计 64 个 worker 正常退出.
每次 ELF `AT_PAGESZ`、Android `sysconf` 和 `getconf` 一致; 两台 shell `smaps`
均明确记录 4096-byte KernelPageSize/MMUPageSize. disabled-DFG 的 1000000 仍是 sentinel.
这是原有限夹具的正确性/资源范围, 不覆盖全 JIT/Wasm 或长时性能.

[Binder 接受归档](2026-09-13-m5-twelve-patch-jsc-binder.json) 与
[压力接受归档](2026-09-13-m5-twelve-patch-jsc-pressure.json) 分开绑定原始记录.
四次接受 runner 均实际 exit 0, 共二十条原 Binder 生命周期诊断. 每次卸载后独立检查
主包与测试包两个 UID 都为零进程. 只启动/关闭本轮两个 AVD, 最后一个于 18:17:49
本地时间确认离线; 中途出现的其他任务 API 37 AVD 未被操作.

## 初次失败与独立重试

16 KiB 初次 Binder 的第一轮 JUnit 为 7/8, 首个 `prewarmRuntime` 抛出
`DeadObjectException`; 第二轮为 8/8. 整次运行 runner exit 1, 全部排除在上述接受数之外.
原始系统日志明确记录 lowmemorykiller 因内存低水位杀死同一测试 UID 10213 的服务
PID 4931 和 5079, Zygote 同时记录 SIGKILL. 卸载后 exit-info 无残留记录, 因而诊断依据
是已捕获的明确系统日志. 这不是 Bun/JSC 原生崩溃证据.

[初次失败归档](2026-09-13-m5-twelve-patch-jsc-binder-memory-failure.json) 保留完整
源码/APK/raw JUnit、owned PID/UID 系统日志摘录及两个 UID 的清理. 随后的独立完整两轮
重试在同一 AVD 使用相同 APK 通过 16/16; 没有改动内存配置、优先级、源码、夹具或预算.
失败记录与成功重试同时保留, 不将第一轮日志中的部分成功计入接受.

## 三星准备与剩余范围

十二补丁 baseline 三星回归 APK 已在独立干净 `dbd0fde` 工作目录生成并核验 81 个输入,
与本次 JSC 的 83 输入 APK 分开. 原 33 项应用探针 APK 的 30 输入和原生 bytes 验证后
直接复用. 最初隔离目录使用默认 Debug 签名的批次在安装前被拒绝; 下一次本机相对 key
路径错误的构建实际 exit 1. 修正忽略配置中的路径后新批次实际 exit 0, 三个 APK 均通过
宿主匹配签名/payload 检查; 临时配置副本已移除, 原私钥未复制或显示.

17:48:42-17:58:42 本地时间的 10 分钟接入窗口共 40 次只读轮询, 50781 始终 offline,
没有三星安装或测试. 后续仍需 SM-F936U API 32 / native ARM64 / 4 KiB 和
SM-A566B API 36 / native ARM64 / hardware 16 KiB, 各两轮原 33 项及八项 Binder.
准备状态、原 recorder 失败、APK receipt 和所有清理另见
[补充归档](2026-09-13-m5-twelve-patch-jsc-checkpoints.json), 不增加任何测试/构建计数.

x86 API 36 的 16 KiB 用户页 ABI 模拟与 4 KiB 内核映射需要分别记录, 不能当作 ARM64
硬件 16 KiB. 可用 ARM translator 不代表 x86 ELF 经过翻译. 本候选结果不增加 baseline
十二补丁的 330/330 应用探针或 80/80 Binder 历史五环境计数. 剩余 syscall/API/FD/OEM、
watch/reload、cgroup/clone3、FD70000/UNSHARE、长时压力/性能、全 JIT/Wasm 和签名
Release/对应源码门禁继续开放.

## 最终验证

全套 Node 234/234、Python 38/38、Markdown 十语言/36 产物和兼容矩阵
84 份报告/185 行均通过. production 四项 Gradle 检查实际 exit 0 (39 秒, 96 tasks,
12 executed / 84 up-to-date), 三个 Debug APK 的官方 runtime 字节和 16 KiB ZIP 对齐通过.
JVM 21 项既有成功结果由 Gradle 判定无需重跑; lint 为 0 错误、44 条既有警告.
IDE 接口 60 秒超时的原结果保留; 对应项目与 command ID 的两个后台构建均确认成功
(7 秒及 1 分 55 秒), 不把它改记为工具返回成功. 80 个既有 JSON/索引和二十一项物理
原生构建输入未变, 生产 source/AAR 与原 pressure fixture/validator/budget 未漂移.
