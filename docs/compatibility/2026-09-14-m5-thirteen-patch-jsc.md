# M5 十三补丁大页 JSC: 新构建与双页大小回归

2026-09-13 至 14 (Asia/Shanghai; 原始 UTC 时间分别保留). 本轮将独立大页 JSC
候选对齐到十三补丁 Bun `e8b1296169a8e6f20c81e926dba6448afb25cd11`, 完成两次
全新 clean Bun 构建, 并在原生 x86_64 API36 的 4KiB/16KiB 用户页各跑两轮原
八项 Binder 和七模式压力. 新候选单独通过 **32/32 Binder、28/28 pressure**,
Binder无失败/重试. 初次16KiB压力第二轮DFG仅2个样本, 低于原3个门槛; 整批失败
单独保留, 同一APK完整两轮复测通过, 未修改设置/源码/预算. baseline与旧JSC计数不变.

两份独立干净 checkout 的原始 driver 实际退出码均为0, 完整成品都是90609496 bytes,
SHA-256 `17c7941a32669e0cf2d6915bf94d8cee8421c3df605eddcf2b493687f20e98a8`.
21项构建输入、clean head/tree、最终 link/map/strip 边、原始完整日志和收据一致性
均核对; 两份完整 ELF 审计通过. 复用原两套独立 JSC 库/config 与原上游 ICU,
新 WebKit/ICU 构建数为0. 不复用十二补丁 Bun 成品, 不改写其来源或原始失败.
[独立构建归档](2026-09-13-m5-thirteen-patch-jsc-builds.json)与
[新候选锁](../../tools/bun-runtime/experimental/webkit-x86_64-16k/thirteen-patch-candidate.lock.json).

新 main/test APK 使用现有生产服务、精确 AAR、真实权限与原八个测试方法.
85项完整输入逐项匹配源码/构建提交 `ba5418e87ec3bcc3259b336e00ef1d2112a3bde2`;
同一 APK 对在四次接受的 suite 运行与初始失败尝试中原样使用. Gradle实际exit0, ELF/ZIP对齐、签名、
安装后main/test APK和Bun/监督器摘要均校验. 文件分别为:

| APK | Bytes | SHA-256 |
|---|---:|---|
| main x86_64 Debug | 42944605 | `e7d4317baf124c90dd246cb471e4fcf735d17c3a65aaa93f05bc87d057ad9ef8` |
| AndroidTest | 2387553 | `b56653582a826dad4e13c3f5c4232b5c41accec7139fd29ba321d3d90226f9b8` |

| 运行 | 用户页 bytes | 两轮结果 | 独立捕获的main/test UID | 卸载后UID进程 |
|---|---:|---|---|---|
| binder-4k | 4096 | 16/16 tests | 10226/10227 | 0 / 0 |
| pressure-4k | 4096 | 14/14 modes | 10228/10229 | 0 / 0 |
| binder-16k | 16384 | 16/16 tests | 10213/10214 | 0 / 0 |
| pressure-16k-retry | 16384 | 14/14 modes | 10217/10218 | 0 / 0 |

两轮间停止并重建进程, 每次suite结束后移除两个测试包并独立检查两个UID.
Binder另包含20条有界生命周期记录. 只有本轮启动的两个AVD被关闭, 停止前核对
准确名称, 停止后确认serial消失; 原默认ADB和五台已有ARM64设备保持运行.
[Binder原始归档](2026-09-14-m5-thirteen-patch-jsc-binder.json),
[压力原始归档](2026-09-14-m5-thirteen-patch-jsc-pressure.json),
[来源、驱动、smaps与清理检查点](2026-09-14-m5-thirteen-patch-jsc-checkpoints.json).

初始压力失败的第一轮7/7通过, 第二轮保留LLInt/Baseline两个有效观测后DFG退出1,
其余四模式未执行. 原runner将失败JUnit轮保留为0/7, 不把两个局部观测拼入接受轮.
不存在采样门槛调整、增加单轮预算或重跑部分模式; 只进行一次同APK完整两轮复测.
[原失败归档](2026-09-14-m5-thirteen-patch-jsc-pressure-sampling-failure.json)保持原样.
不能从复测通过推出采样稳定性或排除更广JSC问题.

压力asset、Java、语义校验器和预算与旧候选完全相同. 16个JIT模式观测保留48个
实际LLInt/Baseline/DFG/FTL目标帧及独立算术对照; GC、Wasm执行/增长与64个worker
正常退出通过. disabled-DFG的1000000仍是sentinel. 这组固定、有限压力测试不代表
完整JIT/Wasm路径、长时稳定性或性能验收, 也不是ARM64压力结果.

每次Bun的ELF AT_PAGESZ、Android sysconf及shell getconf一致; 两个AVD的smaps
KernelPageSize/MMUPageSize均为4096. x86的16384-byte用户ABI属于模拟页大小,
不能替代Samsung真实ARM64 16KiB内核/硬件证据. 被校验的x86 ELF不通过ARM翻译桥执行.

完整Node **254/254**、Python **38/38**、十语言Markdown与兼容矩阵检查通过.
生产四项Gradle实际exit0, JVM21项为UP-TO-DATE, 不声称重新执行; lint0错误/44个
既有警告. IDE直接构建成功, 仅既有SDK XML和Bundle.get警告. 官方Bun与监督器字节
校验通过. 原105份历史JSON/registry和210矩阵行逐项保留, 当前矩阵112源/217行.

另一路[watch诊断](2026-09-13-m3-watch-reload-trace.md)保留16次未复现观察及Linux
fatal control; 其37项输入现在也逐项绑定到`ba5418e`. 原API28 SIGABRT/clone EAGAIN
原因仍未解决. 本候选与诊断均不增加十三补丁baseline的560/560 probes、128/128
Binder; 更广syscall/API/FD/OEM、跨reload的blocked/pending/IPC、FD70000/UNSHARE、
长时压力和最终签名APK/对应源码Release仍开放. 官方Android13支持、baseline锁、
所有历史候选和`distributionReady=false`不变.
