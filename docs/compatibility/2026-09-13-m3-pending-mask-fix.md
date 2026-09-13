# M3: 保留 Android spawn 调用者的 pending SIGSYS

2026-09-13. 本轮从项目 `86b18b5` 继续处理
[十补丁失败与动态诊断](2026-09-13-m3-pending-sigsys.md).
新源码已完成修复、主机回归、双 ABI 独立构建及完整 ELF 审计; 尚无新 Android 验收结论.
官方 API 33+、生产 Bun/supervisor 字节、服务/API 契约和 `distributionReady=false` 不变.

## 源码修复

第 11 个补丁只修改 `src/jsc/bindings/bun-spawn.cpp`, 接在原十补丁后:

- commit: `946f082ab8ede2b7cbd6ba9fddb90463a94f0330`
- tree: `73476190d9341d338a96c8a9793db947ea415d15`
- revision: `1.4.0+946f082ab`
- patch SHA-256: `ea109e6022fba7c9cfd53ee00f078e30294e91b5289e0b7ebab3bfc049560384`
- stable patch ID: `96d13633e0bc409659116384543f72bbdbb04364`

Android 父线程通过 `SIG_BLOCK` 添加临时阻塞项, 原先已阻塞的 SIGSYS 保持阻塞.
vfork 子路径不继承父线程 pending 信号, 仅它在设置阶段安装允许 SIGSYS 的 mask,
让既有 seccomp handler 处理受控 syscall trap; exec 前恢复子进程应继承的 mask.
新增三处 mask 调用检查错误并沿既有失败路径返回, 父线程末尾原有恢复调用未改.

若 Android 调用者阻塞 SIGSYS, 可选 cgroup 请求直接走已有的子进程加入路径,
避开父线程 clone3 探测. 此次跳过不设置全局 `clone3Unavailable`, 后续未阻塞调用仍可探测.
没有提前解除父线程阻塞、清除 pending 信号、预热 waiter、修改 Linux rustix 或增加依赖.

完整 11 补丁重放得到精确 head/tree, 原五补丁前缀仍与上游一致, 28 个原构建定义 blob 不变.
初始新提交的 committer 与既有确定性重放规则不同, 在启动构建前已修正; 源码 tree 不变.

## 主机回归

[测试及边界](../../tools/bun-runtime/experimental/api28/pending-mask/README.md) 从完整上下文补丁
提取修复前/后的整个生产 C++ 文件, 检查补丁字节、行数和 Git blob, 编译真实 spawn 函数.
GCC 13 和 Clang 21 各通过 14 个候选场景和两个旧源码失败对照:

- pending/native/TRAP、blocked/unblocked 调用、重复 spawn 和另一个活动线程.
- 完整 parent/child mask、pending 状态、仅在显式恢复后一次信号交付、exec 后 signal disposition.
- close_range/clone3 受控 TRAP、cgroup 子路径及错误、跳过 clone3 不污染后续探测状态.
- 三处新增 mask 调用和 exec 的固定错误传播、成功才发布 PID、失败子进程回收及 FD 正负对照.

两个旧源码对照在回收子进程后必须失败于同一 pending 保持断言, 不能把它们统计为兼容通过.
首次 GCC/Clang 编译分别遇到上游既有 `{ 0 }` 初始化形式的告警; 仅排除这两种初始化告警,
其他告警继续作为错误, 源码和行为断言未因这些编译失败改变. 原始日志在本机保留.

这是有限 Linux host 验证. cgroup fixture 使用普通 `cgroup.procs` 文件, 只证明分支与写入/错误处理;
它不代表 Android cgroup controller 或 clone3 创建成功. mask 错误为明确注入条件, 不是自然 bionic 故障.

## 构建与设备门禁

两套全新独立 checkout 按固定离线流程顺序构建 ARM64 和 x86_64, 两次实际 driver exit 均为 0.
第一套构建于 04:43:06-06:48:22 UTC, 第二套于 06:48:44-07:41:02 UTC 完成.
完整日志、16 项构建配方、前后 clean head/tree、四份成品和最终 Ninja edges 已逐项核对,
两次构建的每个 ABI 完全一致. [独立 schema-3 构建证据](2026-09-13-m2-pending-mask-runtime-evidence.json)
绑定实际退出码, 不复用历史只读完成检查. 四份 ELF 均通过 API 28/NDK r27c、PIE、依赖、符号、
Android RELR、非可执行栈与至少 16 KiB PT_LOAD 对齐等完整审计.

| ABI | 字节数 | SHA-256 |
| --- | ---: | --- |
| arm64-v8a | 87,923,328 | `5ea6914e5fd2bf16cd2ee4e87036df2cabf47804983cf3ce9942da602c0cc0e7` |
| x86_64 | 90,449,752 | `9c6a97d37ffa15ce7e99f909e7fcc5099d24b689ad17db1e403fe6b2bfd39c2f` |

本轮复用精确锁定的上游 WebKit/JSC/ICU, 没有重新构建这些库. `runtimeProduced=true`,
`distributionReady=false`; 原十补丁构建档案保持原样. 初次晋升后离线检查发现 blocker 校验器
仍固定期待未构建状态, 已改为与 runtimeProduced 同步; 完整 runtime 门禁仍要求当前双构建证据.
新源码尚未通过 Android 33-probe 或完整八项 Binder, 原历史 434/434、112/112 和 JSC 候选成绩均不转移.

历史 pending 失败解析器现在固定绑定原归档摘要、原 APK receipt 和 revision; 旧 JSON 未修改.
实时 runner 的当前输入校验不变, 历史失败也不能被重新归档成当前源码运行记录.
其余 syscall/API/FD/OEM、watch/reload、真实 cgroup、三星新源码复测、JSC 再次迁移与 Release 门禁仍开放.

## 仓库回归

完整 Node 222/222、Python 38/38、十语言/36 产物生成检查、兼容矩阵检查通过.
矩阵新增一份构建索引至 71 份, 设备行仍为 164, 没有由 driver 记录增加设备通过数.
首次完整 Node 检查保留四个迁移失败: revision 对照、build blocker 状态、缺失证据模拟状态及旧 JSC
归档仍读取 current baseline. 逐项同步测试状态/固定历史来源后, 最终完整检查全过;
原压力语义校验器、fixture 和当前 Binder 源码一致性检查不变, 十一补丁来源不能混入旧 JSC 候选.

官方 Bun/supervisor 字节校验通过. 标准生产 Gradle 四项检查实际 exit 0 (8m13s, 96 tasks),
JVM 单元任务沿用已有 21 项缓存; lint 0 errors/44 warnings, 三个 Debug APK 的完整性与 16 KiB ZIP
对齐通过. IDE build 调用一次, 工具返回 60 秒超时; 精确匹配的 Gradle command 随后 BUILD SUCCESSFUL
(2m3s, 6 tasks up-to-date), 两种事实及原始证据均保留, 不将工具超时改写为成功.
