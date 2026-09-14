# AutoJs6 Bun Runtime 插件 Roadmap

本轮恢复入口: [会话交接](docs/SESSION_HANDOFF.md). 历史十补丁 `1.4.0+a9c76a599` 的已有构建恢复取证及七环境原套件回归已完成: 双 ABI 各两份成品一致, 原驱动退出码缺失保留为 null. 五个本地 4 KiB 环境之后, Samsung SM-F936U API 32 / 原生 ARM64 / 4 KiB 和 SM-A566B API 36 / 原生 ARM64 / 16 KiB 也各过两轮 31 项与八项 Binder, 累计 434/434 探针、112/112 Binder. 两台三星同一 APK 批次、无失败/重试且已清理. [API 32 证据](docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md) 和 [原生 16 KiB 证据](docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md) 分别保留; 九补丁及原始 ART 失败历史不改写. 十补丁大页 JSC 已完成两次一致 clean Bun 构建 (actual exit 0), 新候选在 API 36 x86 4 KiB/16 KiB 用户空间页的原 Binder 32/32、原压力模式 28/28 均通过, 见 [独立报告](docs/compatibility/2026-09-13-m5-ten-patch-jsc.md). M9 排错指南也已完成; 扩展矩阵与 Release 门槛仍开放.

更新日期: 2026-09-14

最新[原压力控制流固定观察](docs/compatibility/2026-09-14-m5-jsc-pressure-flow.md)已完成:
一对94输入APK保留原七模式顺序, DFG早停/原断言和全部预算; 双页各两轮28模式正常退出.
四次DFG均在首profile后停止, 样本18/10/82/93, 共392trace与8份完整首栈, 无重试.
原2<3未复现, 历史根因/稳定性仍开放. 原120报告/217行不变, 两份新JSON仅索引.

此前[完整 trace/inliner 固定诊断](docs/compatibility/2026-09-14-m5-jsc-trace.md)已完成:
新工具、20 份源码绑定与同一 92 输入 APK 的双页大小两轮采集, 共 8 进程/32 profile,
65 份完整栈. 四份 FTL 见证明示目标语义帧属于同栈 invoke 机器帧, 与编译 hash 匹配.
关闭组一段 5030 次调用/64 trace 无目标帧, 开启组 90 个目标 FTL 与三次真实 exit1 保留.
该进展确立保存样本的机器帧身份, 原 2<3 历史根因和稳定性仍开放; 原 118 报告/217 行不变.

此前[固定PC映射关闭/开启对照](docs/compatibility/2026-09-14-m5-jsc-pcmap.md)已完成:
同一90输入APK复用原JS/native, 双页大小各两轮固定反转顺序, 收集8进程/32profile及
8份JSC最终选项. 开启组155个目标FTL帧及两次真实exit1按原DFG门槛保留;
关闭组12个调用者FTL帧与目标DFG混合, 未复现整段目标归零.
18文件源码与实际内联决定支持映射/机器tier解释, 缺少逐trace PC/map指针,
原2<3根因与稳定性仍开放. 原116报告/217矩阵行不变, 新两份仅索引.

此前独立[四段 profiler 诊断](docs/compatibility/2026-09-14-m5-jsc-restart.md)已完成:
双页大小各两轮固定双模式, 8次进程诊断/32次profile, 阶段与时间区间全部符合重启/清空预期,
四次目标缺席均完整保留实际exit1. 4KiB第二轮第四段目标仍调用9766次却没有目标帧,
同时出现125个调用者FTL帧; [固定源码补充](docs/diagnostics/2026-09-14-jsc-restart-ftl-source-review.md)
收敛到内联与PC映射的待验证条件, 尚未捕获实际内联/映射状态或确定历史2<3根因.
原夹具/预算/native不变, 诊断不增加原套件成绩. 两包/四UID原始清理记录与两owned AVD收尾已保存.

开发环境已完成一次有清单的磁盘维护: 退役四台历史专用 AVD, E 盘实际增加约11.55GiB;
23个Bun独立构建目录的缓存/目标文件在WSL内部释放约133.04GiB, 完整成品/符号/日志保留.
用户已完成VHDX离线压缩和旧Gradle备份删除; 压缩receipt实际exit0, VHDX缩小139881086976 bytes,
约130.27GiB. 这与WSL内部释放量分别记录, 没有待执行手动清理.
[维护指南](docs/storage-maintenance.md)与[当前交接](docs/SESSION_HANDOFF.md)记录保留范围和完成证据.
另完成[固定JSC采样源码审阅](docs/diagnostics/2026-09-14-jsc-sampling-source-review.md),
未新增设备成绩或关闭DFG/watch根因门禁.

十三补丁大页 JSC 已另行完成两次全新 clean Bun 构建, actual exit 0/0,
21 项输入未漂移, 两份完整成品 `17c7941a...20e98a8` 一致且 ELF 审计通过.
原 JSC 库/config 和 ICU 精确复用, 新 WebKit/ICU 构建为零. 同一85输入新APK
已在x86 API36双页大小各两轮通过原Binder32/32、原压力28/28; 初次16KiB压力采样不足失败另档, 同APK完整复测通过;
两包UID与两个自有AVD已清理. [完整报告](docs/compatibility/2026-09-14-m5-thirteen-patch-jsc.md). API28/API31 原生 ARM64 的固定 watch plain/traced
诊断也已完成: 16 次观察、32 次重载、24 次直接普通 SIGSYS, 包和 UID 清理通过.
未复现原 SIGABRT, 因而原始 EAGAIN 原因与稳定性仍开放, baseline 560/128 不增加.
[JSC 构建](docs/compatibility/2026-09-13-m5-thirteen-patch-jsc-builds.json),
[watch 诊断范围](docs/compatibility/2026-09-13-m3-watch-reload-trace.md).

十三补丁的两项三星固定套件门禁已补齐: SM-F936U 实际 API 32 / 原生 ARM64 / 4 KiB,
SM-A566B API 36 / 原生 ARM64 / 硬件 16 KiB, 均 bridge=0. 相同三个 APK 各过
两轮 35 项与原八项 Binder, 新增 140/140 和 32/32, 无失败/重试或构建.
八个原生环境现累计 560/560 probes、128/128 Binder; 新增 16 次实际 watch 重载
和 24 个镜像观测均通过. 两台设备的三包/三个 UID 与自有私有 ADB 已清理.
[三星完整报告](docs/compatibility/2026-09-13-m3-watch-reload-samsung.md).

当前第 13 补丁已修复 Linux reload 前忽略 CLOEXEC 失败的路径, 保留既有 stdio/IPC/信号语义.
完整源码 GCC/Clang 各 25 个模式和确定性重放通过, 两次全新双 ABI 构建实际 exit0且每ABI字节一致, 四份ELF审计通过.
原 35 项和 17 份 fixture/validator/Java 输入未变, 新 APK 的 32/83 输入匹配 `bf5cb72`.
六个原生 4 KiB 环境各两轮探针 420/420、完整 Binder 96/96; 48 次实际重载无哨兵继承,
72 个镜像的 PID/stdio/普通 SIGSYS 对照通过. 首次 API28 中止 69/70 独立保留,
中止前 clone EAGAIN 的根因未定, 仅一次同 APK 重试通过. 随后的三星门禁见上文;
随后大页 JSC 构建/双页大小回归及 watch 独立观察见上文; 原API28中止根因与更广稳定性仍开放.
见 [修复与验证](docs/compatibility/2026-09-13-m3-watch-reload-fix.md).

此前十二补丁 M3 watch/reload 阻断已完成复现与归档, 该历史 native 未修复. 原 33 项保留,
新增 native/TRAP 两模式形成 35 项套件. 四个 ARM64 / 4 KiB 真机环境各两轮,
原 33 项通过 264/264, 新模式 2/16 通过、14/16 失败, 全体 266/280.
32 次实际重载中有 28 次 FD256 泄漏; Sony API33 / kernel5.15 的原生控制通过,
同设备强制 TRAP 失败. 每次 SIGSYS/stdio 对照正常, 显式 CLOEXEC FD257 均关闭.
三个 APK 批次和先期校验器修正独立绑定, 四包/四 UID 已清理, 无 native build 或 AVD 操作.
优先补齐重载前 CLOEXEC 的后备处理及错误传播, 再做新源码构建和固定夹具回归.
见 [失败与源码定位](docs/compatibility/2026-09-13-m3-watch-reload.md). 既有 baseline
462/462 probes、112/112 Binder 及独立 JSC 结果不改写, distributionReady=false.

最新十二补丁三星 API 32 门禁也已完成: SM-F936U / native ARM64 / 4 KiB,
两轮原 33 项 66/66, 完整八项 Binder 16/16, 无测试失败或重试. 与上一台三星 API 36
使用完全相同的三个 APK, 四十个 pending 保持检查点与十二个 child 观测通过.
两台三星设备门禁补齐, baseline 七个原生环境累计 462/462 probes, 112/112 Binder.
三包/三个 UID 及本轮私有 ADB 清理完成, 无 AVD 操作.
见 [API 32 完整报告](docs/compatibility/2026-09-13-m3-pending-wait-native-arm64-api32.md).

最新三星十二补丁 baseline 回归已完成: SM-A566B / API 36 / native ARM64 / 硬件 16 KiB
两轮原 33 项通过 66/66, 完整八项 Binder 通过 16/16. 四个 pending 模式的 40 个保持
检查点和十二个 child 观测通过; 原 APK/native 直接复用, 无测试失败或重试.
三个包/三个 UID 与本轮私有 ADB server 已清理, 无 AVD 操作.
该批次当时累计六个原生环境 396/396 probes 和 96/96 Binder; 后续 API 32 及当前累计见上文.
见 [硬件 16 KiB 报告](docs/compatibility/2026-09-13-m3-pending-wait-native-arm64-api36.md).

最新十二补丁 JSC rebase 已完成两份新 Bun 一致构建, 实际 driver exit 0/0. 同一新 APK 的
83 输入绑定 `0210e82`, 在 x86 API 36 的 4 KiB/16 KiB 用户页各过两轮原八项 Binder 和
七模式压力, 分别 32/32 与 28/28. 初次 16 KiB lowmemorykiller 服务终止独立保留, 完整
同 APK 重试通过; 两个 UID 和本轮两个 AVD 清理完成. [完整结果](docs/compatibility/2026-09-13-m5-twelve-patch-jsc.md).
16 KiB x86 仍是 4 KiB 内核上的用户页 ABI 模拟. 十二补丁 baseline 三星 API 32 与 API 36 硬件页证据见上文, 各批次独立归档.

最新第 12 补丁 `06e518f73` 保留 Android epoll 等待期间的完整 caller mask/pending 信号,
并在调用点维持 Android 已有的 epoll_pwait2 禁用. GCC/Clang 各 45 个有界主机执行、完整重放和
28 source blobs 已通过. 两份全新双 ABI 构建均实际 exit 0, 每 ABI 两份成品一致且四份 ELF 审计通过.
新 33 项在五个原生 4 KiB 环境两轮通过 330/330, 完整八项 Binder 通过 80/80. API 28 两次 ART 启动失败独立保留, 第三次同 APK 两轮通过. 加上随后两台三星独立批次, 当前累计为 462/462 probes 和 112/112 Binder, 已补齐原套件的三星 API 32/原生硬件 16 KiB 门禁.
见 [wait 修复报告](docs/compatibility/2026-09-13-m3-pending-wait-fix.md) 与 [新构建证据](docs/compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json). runtimeProduced=true, distributionReady=false.

此前 M3 pending-SIGSYS 阻断已有第 11 补丁源码修复, 双 ABI 各两次独立构建一致且实际退出码均为 0; 完整 ELF 审计通过, 但 Sony API 28/31 各两轮仍为 31/33. 即时 spawn 已保留 pending, 后续 epoll wait 临时传入空 mask 导致早交付; 八次只读寄存器/掩码观测已确认, 见 [新阻断](docs/compatibility/2026-09-13-m3-pending-wait.md).
历史 head `946f082ab` 完整重放和 GCC/Clang 主机回归通过; 见 [此前修复报告](docs/compatibility/2026-09-13-m3-pending-mask-fix.md).
历史回归保留原 31 项, 新增 native/TRAP 两模式:
原生 ARM64 API 28/31 各两轮均为 31/33, 原 31 项合计 124/124, 新模式 0/8.
独立 plain/ptrace 对照捕获八次 SI_TKILL 在 spawn 父线程提前交付, 对应源码临时 mask
移除 SIGSYS 的路径. 这是受控 exit 1, 不是此前 pidfd SIGSYS 崩溃. [失败与诊断](docs/compatibility/2026-09-13-m3-pending-sigsys.md)
已独立归档; 该历史批次当时尚未验收新成品. 当前十二补丁结果独立见上文, distributionReady=false, 不转移旧成绩.
此前 [M3-B 启动检查/缓存重试](docs/compatibility/2026-09-13-m3-probe-lifecycle.md) 已完成并保持原验收范围.

这份路线图回答三个问题: 插件现在能做什么, 接下来要做什么, 以及每一项凭什么算 "做完了". 它同时写给想了解进展的用户和参与开发验证的维护者.

一句话概括方向: 插件从 "单个脚本文件的独立 Bun 引擎" (已完成) 出发, 依次走向 "Android 13 正式基线" (v0.2.0 已发布, 开发版已修复强制终止), "Android 9 至 12L 实验支持" (九补丁原 25 项探针已有六环境证据; 相同 29 项套件在七个原生环境累计通过 406/406, 含六个 4 KiB 环境及 Samsung ARM64 16 KiB, 四种硬 FD 上限模式均已有大页证据; 现有完整 8 项插件 Binder 分批累计十二原生环境 192/192, 含三星 ARM64 16 KiB, 已补齐 API 28-32 x86 版本覆盖), 以及更远的 "多文件项目执行" 与 "受控的 AutoJs6 能力桥" (未开始). 历史九补丁大页 JSC 候选已通过 x86_64 双页大小 Binder 32/32, 并新增有界七模式压力 28/28; x86 的 16 KiB 用户空间页为模拟模式, 与 ARM64 硬件页、官方发行线及最终 Release 验收分开.

历史阻断: 九补丁的 31 项套件曾在四个 4 KiB 环境通过 248/248, Sony API 28 两轮只有 29/31, 四次 exit 159. 后续独立观察器已直接捕获 pidfd_open (434) 的 SIGSYS; 十补丁的修复和新本地成绩见上文. 原失败和当时的源码假设说明保留于 [历史报告](docs/compatibility/2026-09-13-m3-blocked-async.md), 不把旧 406/406 转成新模式的成功证据.

## 当前状态速览

| 分类 | 内容 |
|---|---|
| 现在可用 | 在 Android 13+ (API 33+) 的 64 位设备上, 脚本首行写 `"bun";` 即可用官方 Bun 1.4.0 运行 JavaScript / TypeScript 单文件; 输出实时回传, 支持取消, 超时与预热 |
| 正在推进 | v0.2.0 发布后的升级与生命周期验证 (M1), patched Bun 的同 Release 对应源码实际发布 (M2), Android 9-12L syscall/FD 与现有套件之外的扩展 Binder/API 矩阵 (M3), 16 KB 页与发布完整性 (M5), 文档与开发者体验 (M9) |
| 尚未开始 | Android 9+ 稳定化 (M4), 多文件项目执行 (M6), AutoJs6 能力桥 (M7) |
| 当前缺口 | 十三补丁独立双 ABI 构建与八个原生环境的固定探针 560/560、原 Binder 128/128 已完成, 包含三星 ARM64 API 32 / 4 KiB 与 API 36 / 硬件 16 KiB. 十三补丁大页 JSC 构建重对齐、原 Binder 32/32 和压力 28/28 已独立完成; 首次 API 28 watch SIGABRT/clone EAGAIN 根因与稳定性、DFG 采样不足的条件仍开放. 其余 syscall/API/FD/OEM、跨 reload 的 blocked/pending 信号与 IPC、Android FD 70000/UNSHARE、长时压力和 paired APK/source Release 仍开放. 历史版本与独立 JSC 成绩按原批次保留 |

## 如何阅读这份路线图

勾选规则很严格, 请按下面的约定理解每个条目:

- `[x]` 表示已完成, 且仓库中存在可复核证据 (代码, 测试, 锁文件, 生成产物或设备报告), 条目末尾通常标注完成日期和证据等级.
- `[ ]` 表示尚未完成. 它是规划意向, 不代表当前版本能力, 也不是发布时间承诺.
- 括号中的标签 (`插件` / `API` / `宿主` / `上游` / `构建` / `测试` / `设备` / `发布`) 表示这件事的主要落点.
- "代码完成, 待设备" 只表示静态实现与自动化测试已完成, 不得据此扩大 README 的正式兼容范围.
- 设备结论必须记录 Android API, ABI, 设备或 AVD 类型, 内核, 页大小, Bun revision, 测试范围和失败时的 signal/syscall; 仅通过 `--version` 或一个 Hello World 不等于完整运行时兼容.
- 上游 PR 或 issue 只有在固定到具体提交, 经过本项目审查并通过本项目测试矩阵后, 才可成为发布依据; 开放中的上游工作本身不算本项目已交付能力.

每个条目按四级证据衡量 "完成" 的成色:

| 等级 | 通俗含义 | 验证手段 | 可支持的结论 |
|---|---|---|---|
| G0 静态 | 代码和文件看起来是对的 | 源码, Manifest, ELF, 锁文件和文档检查 | 能构建或满足结构要求 |
| G1 自动化 | 机器反复跑都是对的 | JVM, Python/Node, lint, APK 审计和 instrumentation CI | 可重复验证的实现行为 |
| G2 运行环境 | 真机或模拟器上真的能跑 | 真实 Android 设备或与目标一致的 AVD 端到端执行 | 对该 API/ABI/环境的运行证据 |
| G3 发布 | 用户拿到手也没有问题 | 签名, 升级, 安装, 激活, 摘要, 许可证和回退路径全部验证 | 可写入正式兼容声明 |

## 已确认的技术决策

这些决定解释了 "路线图为什么长这样"; 修改任何一条都需要重新评估整个计划:

1. **Bun 是独立引擎.** 不是 Rhino 或 Node.js 的别名. 宿主通过独立 `"bun";` 指令选择插件, 运行时始终位于 `:bun_runtime` 独立进程.
2. **版本严格固定.** 当前基线为官方 Bun `bun-v1.4.0` (commit `34cbb9a40b4bd1bd767d134a7065e66c2432a676`), 其官方 Android ELF 的构建目标是 API 28.
3. **Android 13+ 与 Android 9-12L 分两条线交付.**
   - API 33+: 使用未经修改的官方 Bun 产物. 依据是 AOSP T (Android 13) 已将 raw `close_range` 加入应用进程 seccomp allowlist; Android 14 / API 34 新增的只是公开 bionic wrapper, 不是这个 raw syscall 的首次放行.
   - API 28-32: 官方 Bun 会被系统 seccomp 终止 (`SIGSYS`), 必须使用固定源码和可审计补丁构建的实验运行时 -- 补丁使 seccomp `SIGSYS` 转换为可触发 Bun 现有 fallback 的 `ENOSYS`, 或在 Android 路径直接使用等价的安全 fallback.
4. **Android 9 (API 28) 是现实下限.** Android 8/8.1 (API 26-27) 需要重新构建全部 native 依赖, 消除 API 28 符号与 RELR 假设, 若要做必须另行立项.
5. **只发布 64 位.** 发布 ABI 严格限定为 `arm64-v8a` 和 baseline `x86_64`; 不得把降低 Android API 表述为支持 32 位设备.
6. **不做假兼容.** 不通过跳过 `close_range`, 伪造成功, 修改 ELF 指令, 普通 `LD_PRELOAD` 符号替换或 proot/ptrace 交付兼容性. 文件描述符的 `CLOEXEC`/关闭语义必须被真实保留.
7. **产品边界是受控单源码引擎.** 当前只承诺 `bun run --no-install <source>`; `bun install`, `bunx`, native addon 和设备端生成可执行文件不随 Android 9+ 实验目标自动进入支持范围.
8. **只从只读目录执行.** Bun executable 继续只从 Android 安装的只读 `nativeLibraryDir` 直接执行, 不复制到 `filesDir`, `cacheDir` 或其他应用可写目录.

主要上游依据:

- [Bun v1.4.0 Android API 28 构建配置](https://github.com/oven-sh/bun/blob/bun-v1.4.0/scripts/build/config.ts#L511-L516)
- [AOSP T allowlist `close_range` 提交](https://android.googlesource.com/platform/bionic/+/436980d31c99bdee3c794e26e662e885eba928d6)
- [Bun Android 12 `close_range` / `SIGSYS` issue #30766](https://github.com/oven-sh/bun/issues/30766)
- [Bun 通用 seccomp fallback PR #39775](https://github.com/oven-sh/bun/pull/39775)
- [Bun `openat2` / `fchmodat2` Android issue #39060](https://github.com/oven-sh/bun/issues/39060)

## 核查基线

截至 2026-09-01, 仓库已确认的事实:

- [x] (上游/构建) 两个官方 Bun 1.4.0 Android release archive 与解压后的 ELF, 已按大小和 SHA-256 固定在 `tools/bun-runtime/runtime.lock.json`.
- [x] (构建) `arm64-v8a` 和 `x86_64` payload 均为 Android PIE executable, 动态依赖仅为公开系统库, 并满足至少 16 KB 的 `PT_LOAD` alignment.
- [x] (设备) Android 15 / API 35 `arm64-v8a` 真机已通过 README JavaScript 与 TypeScript 的 Binder 往返测试.
- [x] (设备) Android 13 / API 33 `arm64-v8a` 真机已有成功运行记录, 与 AOSP T allowlist 结论一致; 仍需补充 AOSP/`x86_64` 与更多 OEM 证据后才能进入 G3.
- [x] (设备) Android 12 / API 31 `arm64-v8a` 真机已观察到 syscall 436 (`close_range`) 被应用 seccomp 以 `SIGSYS` 终止 -- 这证明未修改的官方 runtime 不能作为 API 28-32 的通用产物.
- [ ] (测试) 当前尚无完整的 API 28-35, 双 ABI, 跨 OEM 运行矩阵. API 36 的 16 KB AVD 已完成分 ABI 验证: `arm64-v8a` 经原生翻译桥 5/5 通过, 原生 `x86_64` 最小脚本 exit 134, 因此尚不能形成通用 16 KB 支持结论.

## 里程碑总览

| 里程碑 | 状态 | 一句话目标 | 主要落点 |
|---|---|---|---|
| M0 单源码独立引擎 | 已完成 (v0.1.0) | 用官方 Bun 1.4.0 运行单个 JS/TS 文件, 流式回传输出, 双 64 位 ABI | 插件/API/宿主/构建 |
| M1 Android 13 正式基线 | v0.2.0 已发布, 升级验证待补 | 官方 Bun 保持不变, 补齐升级与严格生命周期验证 | 插件/测试/设备/发布 |
| M2 patched Bun 可复现构建 | 十二补丁双 ABI 独立构建完成, 旧证据独立归档 | 两个全新 clean checkout 的双 ABI 成品一致, 两个实际 driver exit 0; 四份 ELF、源码与最终 Ninja 边已核对. 官方 v0.2.0 paired APK/source 已发布, patched 线仍未发布 | 上游/构建/测试/发布 |
| M3 Android 9-12L 实验支持 | 十二补丁七环境原 33 项与 Binder 通过, 两项三星门禁补齐 | 新源码 462/462 探针, 112/112 Binder; 十补丁七环境 434/434、112/112 保持历史范围, 不宣称 Android 9 稳定支持 | 上游/测试/设备 |
| M4 Android 9+ 稳定化 | 等待 M3 | syscall, FD, 进程生命周期和 OEM 矩阵闭环后, 实验支持才能转正 | 测试/设备/发布 |
| M5 16 KB 页与发布完整性 | 官方 ARM64 开发版已完成原生真机执行, 其余进行中 | Samsung API 36 / 16 KiB 原生 arm64 两轮 8/8 Binder; x86_64, 最终 Release APK 和实验完整验收仍分开跟踪 | 构建/测试/设备/发布 |
| M6 多文件项目执行 | 未开始 | 受控项目快照, 相对导入与 source map | API/插件/宿主 |
| M7 AutoJs6 能力桥 | 未开始 | 窄接口, 权限感知, 版本化的宿主能力 | API/插件/宿主 |
| M8 Bun 升级与可选 CLI | 持续项 | 上游监视, 升级审计和独立 CLI 可行性 | 上游/构建/测试 |
| M9 文档与开发者体验 | 进行中 | 通俗文档, 可运行示例, 排错指南与人类可读兼容矩阵 | 插件/发布 |

推荐依赖顺序:

```text
M0 ──> M1 ──> M5
  └──> M2 ──> M3 ──> M4 ──> M5
  └────────────────> M6 ──> M7
M8 与 M9 作为横切主线持续推进, 但不得绕过任一里程碑的升阶门
```

## M0: 单源码独立引擎 (v0.1.0, 已完成)

**做了什么:** 首个版本把官方 Bun 变成 AutoJs6 可选择的独立脚本引擎, 并划定了安全与容量边界.

- [x] (宿主/插件) 将 `bun` 注册为由独立 `"bun";` 指令选择的 AutoJs6 脚本引擎, 不回退到 Rhino 或 Node.js.
- [x] (插件) 在隔离的 `:bun_runtime` 插件进程中启动固定版本的官方 Bun Android executable.
- [x] (API/插件) 通过 `ParcelFileDescriptor` 传输一个不可变的 JavaScript 或 TypeScript 源码快照, 并以参数数组执行 `bun run --no-install <source>`.
- [x] (API/插件) 通过 oneway callback 有界分块传输 stdout/stderr; terminal Bundle 和 `finished` event 不携带完整输出流.
- [x] (插件) 提供 prewarm, runtime identity, 60 秒默认 timeout, 显式 cancellation, 16 MiB 源码上限和 8 MiB 组合输出上限.
- [x] (构建) 打包 `arm64-v8a` 与 baseline `x86_64` 单 ABI APK 和 universal APK, 并固定官方 archive/binary 的来源, 大小, SHA-256, ELF machine 和 alignment.
- [x] (插件/发布) 提供受权限保护的 Wake, INFO, runtime 组件, PluginInfo, 10 语言资源, 生成文档和 CI 基线.

**M0 验收条件 (已满足):** API 35 `arm64-v8a` 真机完成 JS/TS Binder 往返, 仓库静态/单元/文档/构建门禁存在, 且首版能力边界已记录.

## M1: Android 13 / API 33 正式基线

**目标:** 在不改动官方 Bun v1.4.0 release artifact, 不引入 downstream native fork 的前提下, 以最低维护成本把支持范围扩展到 Android 13, 同时保持 API 34/35 无回归.

**为什么先做它:** AOSP 源码证明 Android 13 已放行 `close_range`, 因此 API 33 不需要补丁 -- 这是唯一 "只调整边界与验证" 就能扩大的兼容范围.

### M1-A: 事实与构建边界 (已完成)

- [x] (插件) 将 `MIN_SDK_VERSION` 从 34 调整为 33, 并确认最终 debug, androidTest, 单 ABI 和 universal APK manifest 均为 `minSdkVersion=33`. (2026-09-01, G0/G1)
- [x] (构建) 将 runtime lock 中 "官方 ELF 链接目标 API 28" 和 "当前产品支持下限 API 33" 拆成独立字段, 避免再次混淆 native link target, seccomp allowlist 和插件支持策略. (2026-09-01, G0)
- [x] (构建/测试) 扩展 runtime verifier, 检查 lock schema, 支持下限, ELF Android platform note, PIE, machine, interpreter, 系统库依赖和 `PT_LOAD` alignment. (2026-09-01, G1)
- [x] (发布) 修正 `AGENTS.md`, `THIRD_PARTY_NOTICES.md`, README 文案源和本 Roadmap 中关于 Android 13 `close_range` allowlist 的陈述, 并在全部 10 语言生成产物中同步 Android 13 下限. (2026-09-01, G1)
- [x] (发布) 为 Android 13 支持建立新的 v0.2.0 changelog, 不回写或篡改已经发布的 v0.1.0 历史记录. (2026-09-01, G1)

### M1-B: 自动化与设备验证

- [x] (测试) CI 新增 API 33 `x86_64` instrumentation, 并在本地对应 AVD 完成 3/3 测试; 覆盖 discovery, binding, metadata, prewarm, JS, TS, Unicode stdout/stderr, 真实 `Bun.spawn`, 私有目录文件 I/O, timeout, output limit, cancellation 和无效请求. (2026-09-01, G1/G2)
- [x] (测试) 保留 API 35 `x86_64` CI 回归, 不以 API 33 job 替代当前平台测试; API 35 arm64 真机已在 2026-09-02 完成扩展后的 5/5 套件, 新增安装后 payload 摘要和仓库原始示例执行均通过, 证据见 `docs/compatibility/2026-09-02-m9-samples.json`. (2026-09-01/02, G1/G2)
- [x] (设备) Sony XQ-DQ72 API 33 `arm64-v8a` 已重新安装 `minSdk=33` 的 v0.2.0 构建并完成完整 instrumentation; 环境与范围见 `docs/compatibility/2026-09-01-m1.json`. (2026-09-01, G2)
- [x] (设备) Redmi 22120RN86C API 33 `arm64-v8a` 真机已作为第二 OEM 环境完成扩展后的 5/5 instrumentation; fingerprint, kernel, 4 KiB page size, 完整范围以及先前签名权限冲突的解决过程见 `docs/compatibility/2026-09-02-m9-samples.json`. (2026-09-02, G2)
- [x] (发布/设备) 官方 v0.2.0 已公开发布, 13 个 APK/source/notice/manifest/checksum 资产全部通过 GitHub SHA-256 对照及发布后 CI. 最终签名 APK 在 Redmi API 33 (arm64-only) 与 Xiaomi API 35 (universal) 各通过 8/8 黑盒验收及 force-stop 后 8/8 重跑, 包含安装后摘要、Wake、发现与 Binder 执行. 证据见 [v0.2.0 发布报告](docs/compatibility/2026-09-08-v0.2.0-release.json). (2026-09-08, G1/G2/发布资产 G3)
- [ ] (发布) 补齐从 v0.1.0 覆盖升级与独立的全新安装场景; 不把同一 v0.2.0 APK 的重装/重启验收等同于跨版本升级证明.
- [x] (插件/构建/测试) 通过正式 Binder 在 Xiaomi API 35 复现 3 秒超时返回后 Bun PID 仍存在、exitCode=-1. 新增约 7 KB/ABI 的独立只读监督器, 以私有控制管道、200 ms SIGTERM 宽限、SIGKILL 和唯一父进程 waitpid 回收替代 Java 的伪强制终止, 同时保留输出排空. API 33/35 原生 arm64 与 API 36 / 16 KiB arm64 翻译路径已通过扩展后的 8/8 套件, 覆盖处理器就绪后取消、超时、输出超限、PID 消失、工作目录删除与后续执行. Bun/API/minSdk 不变, 详见 [M1 监督器报告](docs/compatibility/2026-09-08-m1-supervised-termination.json). (2026-09-08, G1/G2, v0.2.1 开发版, 非新 Release)
- [x] (构建/发布工具) 监督器 C 源码、NDK 29.0.14206865 和双 ABI Git LFS 字节独立落锁, 两轮 Windows 干净构建一致; debug/release 三类 APK 校验完整 native entry 清单、helper/runtime 摘要与 16 KiB 对齐. 对应源码 manifest schema 2 绑定监督器并逐文件核对项目源码压缩包, 新版本不能降级 schema 绕过, v0.2.0 发布资产不变. (2026-09-08, G1; 本轮未发布)

**M1 升阶门:** G0/G1 全绿; API 33 `x86_64` AOSP/Google APIs AVD 与至少一台 API 33 `arm64-v8a` 真机完成真实 Bun Binder 往返; API 35 回归无失败. 若某 OEM API 33 因不同 seccomp/SELinux 策略失败, 先记录并诊断, 不通过隐藏错误或伪造 probe 成功来扩大支持声明.

## M2: patched Bun 可复现构建

- [x] (构建) 第 13 补丁在两份全新、独立的 Bun checkout 中分别完成双 ABI 构建, 两个实际 driver exit 为 0. 每 ABI 的两个完整成品逐字节一致, 16 份配方无漂移, clean head/tree、完整日志和最终 Ninja 边均绑定到 schema 3, 四份 ELF 审计通过. 精确复用原锁定 JSC/ICU, 不计作新的 WebKit/ICU 构建或设备验收. [独立证据](docs/compatibility/2026-09-13-m2-watch-reload-runtime-evidence.json). (2026-09-13, G1)

历史十一补丁: [独立 schema-3 构建证据](docs/compatibility/2026-09-13-m2-pending-mask-runtime-evidence.json) 记录两个全新 checkout 的双 ABI 一致输出、实际 driver exit 0、完整日志与四份 ELF 审计; 复用锁定上游 JSC/ICU, 不继承旧设备成绩.

历史十补丁: [2026-09-13 构建证据](docs/compatibility/2026-09-13-m2-blocked-pidfd-runtime-evidence.json) 保留两个原 clean checkout 的相同输出、四项只读完成检查及原驱动退出码缺失, 没有重编译或覆盖九补丁证据. 十补丁源码及对应源码绑定已同步.

**目标:** 在动 Bun 源码之前, 先建立一条任何维护者都能审计, 重放和复现的 native 供应链.

**为什么:** M3 要给 Android 9-12 使用打过补丁的 Bun; 如果补丁和构建过程不可复现, 就无法证明发布的二进制确实来自声称的源码. 注意: M2 本身不承诺 Android 9-12 可用.

**已落地 (进展记录, 2026-09-03, G0/G1; 另有明确受限的 G2 shell-domain 证据):**

以下为旧 `778ce669a` 六补丁版本的构建记录, 完整运行时证据已原样归档至 [2026-09-03 M2 记录](docs/compatibility/2026-09-03-m2-runtime-evidence.json). 后续七至九补丁历史与当前十补丁更新分别记录, 不将旧产物重新归因给新源码.

- `tools/bun-runtime/experimental/api28` 已建立独立实验 identity, 与官方产物线分开.
- 已固定 Bun v1.4.0, PR #39775 的 5 个不可变提交, 以及 22 个 Android-release 依赖 identity.
- 6 个 downstream patch 可从 release commit 确定性重放: 前 5 个 stable patch ID 与上游一致, 第 6 个把可移动的 Brotli tag 固定为完整 commit; 受影响的兼容代码与固定 PR head 完全一致.
- 19 个 Bun 实际使用的 GitHub source archive 已真实下载, 并按字节数, SHA-256, 单一顶层目录和 traversal 规则锁定.
- 17 个不可变直接下载件 (NDK, CMake, bootstrap Bun, Node, Ninja, rustup, 最小 Rust 闭包等) 共 1,024,309,832 bytes 已锁定.
- 六个 materializer (输入物化工具) 都要求显式输出目录, 拒绝覆盖有漂移的文件, 并支持离线复核; CI 会重新物化 19 个 native source archive, 5 个小型工具链 provenance 文件, 完整 Cargo archive/directory-source, Bun registry archive/cache 与 Bun base source archive. 体积更大的 155 个 host `.deb` 由独立 materializer, 离线 lock 验证和两轮 host-image 证据覆盖.
- 只读 build plan 和完整输入 preflight 已落地; 预检同时验证 22 个源码输入, 17 个直接工具链输入, 206 个 Cargo archive 及其逐文件 checksum, 125 个 Bun registry archive 与逐文件树摘要, NDK r27c 和精确工具版本; 所有 build-input blocker 关闭后 `buildReady=true`.
- Bun workspace 与固定 Rust 标准库两个 Cargo.lock 的 211 个引用已合并为 206 个唯一 crates.io archive (28,919,277 bytes), 按规范 URL, 精确字节数与 SHA-256 锁定; materializer 仅从 archive 安全重建 versioned directory source, 两个 lockfile 均由固定 Cargo 1.99.0-nightly 在空 `CARGO_HOME` 和 `--network none` 下以 `--locked --offline` 验证.
- 三个实际 `bun install --frozen-lockfile` 的 172 个外部引用已解析为 164 个唯一 identity; Linux x64 排除 39 个其他平台包后, 125 个 canonical npm tarball 共 31,498,870 bytes 已由 lock SHA-512, 项目 SHA-256, 字节数, archive root, 文件树摘要和 Bun cache path 联合锁定. 仅 `esbuild@0.21.5` 有受信任的 postinstall.
- 从上述 tarball 在保留权限位的 WSL2 ext4 文件系统中重建的无 alias 最小 cache 已只读挂载到锁定的 Ubuntu 20.04 容器; 在 `--network none` 下, 新 checkout 的三次原始 frozen install 分别报告 42/1/103 packages, 精确可执行权限与 lock/Git tree 不变, esbuild 0.21.5 探针通过.
- Ubuntu/PPA/apt.llvm.org 层已固定为 155 个 `.deb` archive (422,223,096 bytes); 离线安装结果的 243-package manifest 已锁定. 两次禁用 cache 的清洁镜像构建得到相同 manifest/config/rootfs diff IDs, 最终 Linux amd64 host image manifest 为 `sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa`.
- `run-locked-build.mjs` 固定本地 image ID, 禁止 pull/network, 使用只读 rootfs 与输入 mount, 丢弃 capabilities, 启用 `no-new-privileges`, 禁用 ccache, 固定 `/work/bun`, 且仅允许 clean patched checkout 写入. 两个独立 checkout 均完成双 ABI build.
- 两轮 ARM64 产物逐字节相同 (87,923,304 bytes, SHA-256 `37bb5553c999ba8bc981199dadc5e3cfd9a476a2d4ebb8565132db83728a2dc6`); 两轮 x86_64 也逐字节相同 (90,449,696 bytes, SHA-256 `b079388f098c8f40cb14be7a6d343cf8fcb56d3d6694885e1b301f2cf7f89036`). 自建 ELF 保持在仓库外, 未替换官方 payload.
- 纯 Node ELF auditor 对两种 ABI 锁定 ELF64/PIE/interpreter, Android API 28 + NDK r27c note, `DT_NEEDED`, Android RELR, bionic symbol version, 动态符号与 `.symtab` 指纹, non-exec stack, 无 W+X `PT_LOAD`, GNU build-id, 无 debug section 及最低 16 KB alignment; `runtime-evidence.json` 可用四个外部文件重验重复构建与完整静态事实.
- 正式 ARM64 自建产物在 Sony API 28 与 API 31 真机的 adb shell 域完成 version/revision/JS/TS/stdout+stderr 5/5 探针, 报告见 `docs/compatibility/2026-09-03-m2-patched-runtime-shell-smoke.json`; 该 G2 证据不覆盖应用 zygote seccomp, Binder, `nativeLibraryDir`, APK 或插件生命周期.
- Bun base source archive 已按 64,069,192 bytes 与 SHA-256 锁定; WebKit/JSC 以 immutable autobuild tag, commit, tree, 463,115-file inventory 和四份原始许可证锁定, 五份 Bun/WebKit 许可证文本进入 APK 文档资产. `distribution-source.lock.json` 将两种 runtime 摘要、6 个补丁、19 个 native source、206 个 Cargo 与 125 个 npm archive 串成可机器复核的对应源码输入链.
- 对应源码 Release 工具已实现: 三个签名 APK 与其内 runtime 摘要被绑定到六组独立源码资产; 源码集覆盖精确 Bun/WebKit/JSC、19 个 native dependency、Node.js headers、206 个 Cargo 与 125 个 npm archive; WebKit 大文件按每片不超过 1,900,000,000 bytes 确定性分片, 低于 GitHub 2 GiB 单资产上限; machine-readable manifest 与 `SHA256SUMS` 覆盖完整资产集; publisher 只向 draft 上传, 对照 GitHub 返回的 `sha256:` digest 拒绝缺失、多余或漂移文件, 全部一致后才公开. License/relinking notice 独立公示; 这些是自动化技术验证, 不声称法律结论.
- 13 个 Node test 文件的回归测试覆盖 source/toolchain/Cargo/Bun/host-package/分发源码闭包, host image, build plan, locked container, runtime evidence, ELF parser 与 Release 资产格式; `buildReady=true`, `runtimeProduced=true`, 但 matching patched APK/source Release 与应用进程门未完成, 因此 `distributionReady=false`.

条目清单:

- [x] (上游) 固定 Bun stable tag, 完整 commit, 无 submodule 的 Git tree 证据, 22 个 Android-release dependency revision, 以及 PR #39775 的 5 个具体补丁提交; 开放 PR 的更新仍必须人工审阅差异. (2026-09-02, G0/G1)
- [x] (构建) 新增 6 个 versioned downstream patch, 每个 patch 记录来源, 目的, 适用 commit, 摘要, 许可证影响和上游/本项目归属; 清洁重放结果与确定性 commit/tree 均由 CI 验证. (2026-09-02, G1)
- [x] (构建/测试) 锁定 19 个 GitHub source archive 和 17 个不可变直接工具链下载件, 提供安全, 可离线复核的 source/toolchain materializer, 并把在线重新物化纳入 CI; 滚动 rustup discovery URL 不进入可复现闭包. (2026-09-02, G0/G1)
- [x] (构建/测试) 新增默认只读的双 ABI build plan, 干净 patched checkout / 完整缓存 / NDK 预检和 `buildReady` 执行闸; 同时单独盘点 Cargo/Bun registry 输入, 未物化 archive 不得标成离线就绪. (2026-09-02, G1)
- [x] (构建/测试) 锁定并真实物化 Bun workspace 与 Rust 标准库 lockfile 合并后的 206 个唯一 crates.io archive (28,919,277 bytes), 安全生成带逐文件 checksum 的 directory source, 由固定 Cargo 在空 home 与禁网容器中完成 `--locked --offline` metadata 验证, 并纳入总预检与 CI. (2026-09-03, G1)
- [x] (构建/测试) 将 172 个 Bun registry 引用解析为 Linux x64 的 125 个唯一 npm archive (31,498,870 bytes), 在 WSL2 ext4 上安全重建保留精确权限位的最小 cache, 并在 digest-locked Ubuntu 20.04 的 `--network none`/只读 cache 下完成三次 frozen install, lock/Git tree 与 esbuild lifecycle 探针均通过; 已纳入总预检与 CI. (2026-09-03, G1)
- [x] (构建/测试) 固定 155 个 host `.deb` 与其安装 manifest, 两次清洁构建得到相同 OCI manifest/config/rootfs; 新增禁 pull/network, 只读 root/input, 固定路径且禁用 ccache 的容器 build 入口, 固定 NDK r27c, Rust/LLVM/Bun, API 28 target, CPU baseline 与双 ABI 参数. (2026-09-03, G1)
- [x] (构建) 官方产物继续由 `runtime.lock.json` 管理; downstream 使用独立的 `bun-1.4.0-android-api28-patched-experimental` identity, `runtime-evidence.json`, 文件名与摘要, 仓库和插件 payload 均不包含自建 ELF. (2026-09-03, G0/G1)
- [x] (测试) 对 patched runtime 增加纯 Node 静态门禁: ELF64, PIE, interpreter, Android API 28/NDK note, `DT_NEEDED` allowlist, Android RELR, bionic 符号版本, `PT_LOAD`/stack 权限与 alignment, build-id, 动态/静态符号表指纹和 SHA-256. (2026-09-03, G1)
- [x] (测试) 相同固定源码, 工具链, host image, 补丁与 canonical 容器路径完成两轮独立清洁双 ABI 构建; ARM64 和 x86_64 均 byte-for-byte reproducible, 四个外部产物由证据清单复验通过. (2026-09-03, G1)
- [x] (发布) 实现与 APK 分离但位于同一 Release 的对应源码资产格式与发布器: 公示 Bun/WebKit/JSC 许可证及 relinking 说明, 打包精确 Bun/WebKit、19 个 native、206 个 Cargo、125 个 npm source archive 及项目源码/补丁/构建说明, 大文件按每片不超过 1,900,000,000 bytes 确定性分片 (低于 GitHub 2 GiB 单资产上限), manifest 与 `SHA256SUMS` 同时绑定 APK、runtime 与源码; draft 中逐项核对 GitHub SHA-256 后才发布. 自动化结果只表述为技术验证, 项目流程不再以单独法律复核作为发布前置条件. (2026-09-03, G1; 实际 paired Release 待 M3 APK)

**当前升阶阻断:** 构建、复现、静态门禁、对应源码闭包与同 Release 自动发布/验证流程已完成; M2 只因尚无 M3 matching patched APK 可与源码资产共同实际发布而保持进行中, 不再等待单独法律复核. API 28/31 的直接 shell 探针只用于提前发现二进制级问题, 应用进程与 Binder 证据属于 M3, 不用于提前通过本升阶门.

**M2 升阶门:** 任意维护者可在无开发机绝对路径, 无未记录缓存的环境中, 从固定上游输入生成两个 ABI 的同一受控产物; lock, 补丁, 工具链, 许可证和最终哈希可互相追溯.

**M2 启动修复记录 (2026-09-10, G1):** 新增项目自有 MIT 启动补丁, 确定性 head 为 `c240d6c6895db4241dc324f260ee3ee4d0da9889`, tree 为 `e7740b5decafdfa2ec4a5804057190e31e3c4820`. 7 个补丁完整重放, 前 5 个兼容补丁的全部路径仍在其 prefix 与上游逐字节对照; 最终启动代码的差异明确属于第 7 个补丁. 双 ABI 各两次禁网清洁构建逐字节一致, ELF 审计与对应源码绑定已更新. 构建输入校验和运行时验收拆分, 默认验收仍拒绝缺失, 漂移或旧 revision 的证据. 详见 [七补丁运行时归档](docs/compatibility/2026-09-10-m2-startup-runtime-evidence.json) 与 [启动修复报告](docs/compatibility/2026-09-10-m3-startup-cloexec.json).

**M2 八补丁历史记录 (2026-09-10, G1):** 新增第 8 个项目自有 MIT spawn FD 补丁, 确定性 head 为 `a260ef3085eccca9076569b1fd5d32fbb3e8c87d`, tree 为 `8941ba13cd240647b059d1155d455c1d273a7e10`. 完整补丁重放及五补丁 prefix 的全部上游路径对照通过; 两个独立 clean checkout 均以锁定镜像、只读输入、禁网和禁用 ccache 完成双 ABI 构建, 四次 exit 0, 同 ABI 逐字节一致. ARM64 SHA-256 为 `186968ad26f1753675b3782cfa87c954530d47cd593e26b701e6d2ce02b4e333`, x86_64 为 `f27375423557dcb61c7d5e66b71de0beb8431f20f6393e78aba34ee23dfda8d3`; 完整 ELF 审计与八补丁对应源码绑定通过. 原六/七补丁证据保留, 默认验收均拒绝其冒充当前源码. 见 [八补丁历史锁](docs/compatibility/2026-09-10-m2-spawn-runtime-evidence.json) 与 [spawn 修复报告](docs/compatibility/2026-09-10-m3-spawn-fd-fix.json).

**M2 当前更新 (2026-09-10, G1):** 九补丁 `7b9ac266888abda7ee6ec0b8ac11a74236420030` / tree `05f05ce5787a20f2af4d642fb0ada38f68674187` 已通过两轮双 ABI 清洁构建、字节一致性及完整 ELF 审计, 对应源码锁同步绑定新产物. 原六/七/八补丁证据不改写. 见 [当前运行时锁](tools/bun-runtime/experimental/api28/runtime-evidence.json) 与 [目录回退修复报告](docs/compatibility/2026-09-10-m3-scoped-open-fix.md); 这不是 patched Release 或完整 Binder 验收.

## M3: Android 9-12L / API 28-32 实验支持

**目标:** 用 M2 产出的 patched runtime, 让 Android 9 到 12L 的 64 位设备也能运行脚本.

**边界:** 所有兼容声明先标为实验性, 并继续限定 64 位 ABI 与 `run --no-install` 单源码能力.

### M3-A: seccomp 与 syscall fallback

- [x] (设备/测试) 十三补丁同一 ARM64 APK 在 Samsung SM-F936U API 32 / 4 KiB 与 SM-A566B API 36 / 硬件 16 KiB 各过两轮固定 35 项与原八项 Binder, 新增 140/140 probes 和 32/32 Binder, 原定义/输入/预算不变. 八个 watch 模式产生 16 次重载、24 个镜像, FD/PID/stdio/普通信号及原 blocked/pending/hard/soft-limit/强制生命周期均通过. 六个包/UID 和两次自有私有 ADB 全部清理; 无重试、构建或 AVD 操作. [两项三星门禁](docs/compatibility/2026-09-13-m3-watch-reload-samsung.md). (2026-09-13, G2, 有限套件, 非稳定性/JSC/Release 通过)

- [x] (设备/测试) 第 13 补丁保持 35 项定义与全部既有 fixture/预算, 六个原生 4 KiB 环境各两轮通过 420/420 probes、96/96 原八项 Binder. 新 APK 输入匹配 `bf5cb72`; 24 watch 模式产生 48 次实际重载, 72 镜像均符合 FD/PID/stdio/普通信号断言. 原 hard/soft limit、blocked/pending 与强制生命周期仍通过, 回收 301-307 ms. 三包/三个 UID 每环境独立清理, 只关闭自有 AVD/私有 ADB. 初始 API28 69/70 中止另档, 只做一次同 APK 复测. [设备与边界](docs/compatibility/2026-09-13-m3-watch-reload-fix.md). (2026-09-13, G2, 有限套件, 非稳定性/三星/大页/Release 通过)
- [x] (诊断/工具) 独立观察器增加有界只读 SIGABRT 寄存器/地址候选/映射/资源快照, 保留原信号交付和预算; Linux 六种 plain/traced 信号对照通过. 原生 ARM64 API28/31 两轮固定 watch 对照完成16次观察、32次重载和24次直接普通SIGSYS, 包与UID清理通过. [独立诊断记录](docs/compatibility/2026-09-13-m3-watch-reload-trace.md)不增加baseline验收, 不解释未复现的原中止. (2026-09-13, G1/诊断)
- [ ] (诊断/测试) 用有界、独立诊断补齐 API 28 watch 中止调用链与 clone EAGAIN 的资源条件; 保留首次失败, 不以偶发复测成功代替稳定性证据或扩大现有预算. 新观察器已就绪, 固定 plain/traced 观察未复现中止, 尚无 Android fatal-stop 栈或失败时资源快照.
- [x] (源码/测试) 第 13 补丁修复 Linux reload 前忽略 `close_range(CLOEXEC)` 失败的问题, 复用未改动的 raw FD helper 标记分支, 不完整设置在 exec 前退出. 原 stdio、显式 IPC 和完整信号段不变. 精确源码 GCC 13/Clang 21 各 25 个模式通过, 包括真实 exec、高于 hard limit 的 FD、旧源码失败对照和有界错误; 共享 helper 原四组测试分别通过. 全套 35 项 Android 定义与 17 份输入防漂移门禁已补齐. [修复范围](docs/compatibility/2026-09-13-m3-watch-reload-fix.md). (2026-09-13, G1; 新源码构建/设备另计)
- [x] (测试) 新增两个有界 watch/reload 模式并完成四个 ARM64 / 4 KiB 真机环境的故障复现和同设备正向对照. 原 33 项 264/264; 新模式2/16, 14个失败模式产生28次 FD256 泄漏. 原生可用的 Sony5.15 模式两轮通过, 相同设备 TRAP 两轮失败. 原生字节、旧定义及预算不变, 所有包/UID已清理. 2026-09-13 G2 故障证据, [报告](docs/compatibility/2026-09-13-m3-watch-reload.md); 不代表门禁通过.
- [x] (上游/测试) 第 13 补丁修复 `on_before_reload_process_posix` 忽略 `close_range(CLOEXEC)` 失败的路径, 在 exec 前完成 FD 标记并传播不完整设置错误, 保留 stdio/IPC 和已有信号语义. 固定 35 项和原 33 项未放宽; 独立双 ABI 构建和六个原生 4 KiB 环境的固定套件回归已完成. [源码与新设备证据](docs/compatibility/2026-09-13-m3-watch-reload-fix.md). (2026-09-13, G1/G2; 首次中止的稳定性诊断、blocked/pending 跨 reload、并发 FD、FD 70000、UNSHARE 和大页另行验证)

- [x] (构建/测试/设备) 新增独立 test-only APK 工具 [app-probe](tools/bun-runtime/experimental/api28/app-probe/README.md), 不注册为 AutoJs6 插件、不使用正式签名或替换官方 payload. 输入两轮锁定 ELF, 输出双 ABI 单包, 核验真实 Manifest、APK 签名、16 KB ZIP 对齐及精确 payload. Sony G8441 API 28、Sony XQ-AT72 API 31、Redmi 22120RN86C API 33、Xiaomi 23046RP50C API 35 均在原生 arm64 / 4096-byte 页、普通应用 UID、untrusted_app、seccomp=2 下从只读 nativeLibraryDir 执行. (2026-09-08, G1/G2)
- [x] (设备) 上述四台真机各运行两轮: version/revision、子进程应用域、JS/TS/Unicode/stdout+stderr、spawn/spawnSync、文件 I/O、loopback fetch、普通用户 SIGSYS 与终止后新执行这 10 项通过. 每轮 12 项中强制终止的 2 项失败, 总体结果明确为 failed; force-stop 与探针卸载后已确认无探针 UID 残留进程. 完整证据见 [M3 应用进程报告](docs/compatibility/2026-09-08-m3-application-probe.json). (2026-09-08, G2, 不是完整 Binder 通过)
- [x] (插件/构建/测试/设备) 将 M1 锁定监督器和原文件编译的共享 `SupervisedProcess` 接入 patched app-probe, schema 2 收据绑定 Git-canonical 源码、固定 NDK、双 ABI helper/runtime 和测试 APK, 拒绝旧收据及缺失/漂移 native entries. 四台 API 28/31/33/35 原生 arm64 / 4096-byte 页设备各两轮 13/13 通过, 共 104 项; 24 次忽略 SIGTERM 的超时、输出超限和就绪后取消均核验实际父子关系、exit 137、双 PID 消失与工作目录删除, 终止请求至监督器退出为 301-307 ms. 未放宽原 1500 ms 超时及 2000 ms 回收上限, 每轮 force-stop 和最终卸载后对应 UID 进程数为 0. 新增 [M3 监督器复测报告](docs/compatibility/2026-09-09-m3-supervised-application-probe.json), 原始失败报告保留不变. (2026-09-09, G1/G2, 非完整 Binder, 未发布)
- [x] (测试/设备) 新增 5 个固定 FD/SIGSYS 源码夹具并绑定至构建收据, 独立探针扩为 18 项; 四台 API 28/31/33/35 arm64 真机和 API 33 原生 x86_64 AVD (均为 4096-byte 页) 各两轮 17/18. 共 40 项新 spawn/信号用例通过, 10 次启动 CLOEXEC 断言失败如实保留; 原有 30 次强制终止仍通过, 请求至退出 301-319 ms, 所有测试包卸载后 UID 进程数为 0. x86_64 原生调用成功设置标记且不立即关闭 FD, 加装 trap 后转为 ENOSYS; 同 PID re-exec 在双 ABI 均未补上启动标记. 见 [M3 FD 语义报告](docs/compatibility/2026-09-10-m3-fd-semantics.json). 本次启动的 AVD 已关闭, 未覆盖历史报告或运行时字节. (2026-09-10, G1/G2, 仅完成探针与阻断定位, 非全部语义通过)

- [ ] (上游/插件) 在 Bun 第一次 raw syscall 前安全处理 Android `SECCOMP_RET_TRAP`, 仅将 `SYS_SECCOMP` trap 转换为 `-ENOSYS`, 让已有 fallback 执行; 普通用户发送的 `SIGSYS` 仍保持可预期语义.
- [x] (上游/构建/测试/设备) 修复 pinned Bun 启动路径忽略 `bun_close_range(4, ~0U, CLOSE_RANGE_CLOEXEC)` 失败的问题: 第 7 个 MIT 补丁枚举实际打开的 FD, 保留 fd 0-3 并补上 CLOEXEC, 失败时明确退出; 目录项和 EINTR 重试有界, 不沿用 spawn 的 fd 编号上限. 原生 3 组 27 个场景通过, 包括创建 FD 70000 后降低 RLIMIT_NOFILE 到 1024 及真实 exec 验证. 双 ABI 各两轮清洁构建一致后, 四台 API 28/31/33/35 arm64 真机及 API 33 原生 x86_64 AVD 各两轮 18/18, 合计 180/180; 未改动原启动断言, 10 次均保留 sentinel 并观察到 CLOEXEC=true. 30 次强制终止仍在 301-305 ms 内回收, 测试包全部卸载且 UID 进程数归零, 本轮启动的 AVD 已关闭. 原 17/18 失败记录保持不变. 见 [M3 启动修复报告](docs/compatibility/2026-09-10-m3-startup-cloexec.json). (2026-09-10, G1/G2, 非完整 Binder, 未发布)
- [x] (测试/设备) 新增 native/TRAP 两个降低 `RLIMIT_NOFILE` 的对照, 独立探针扩为 20 项. 同一 `c240d6c68` 运行时在四台 API 28/31/33/35 arm64 真机各两轮 18/20, API 33 原生 x86_64 AVD 各两轮 19/20 (均为 4096-byte 页). 原有 180 项仍通过; 新增 20 次观测中 18 次发现 fd 256 在 soft limit 从 32768 降至 128 后被 `spawnSync` 和 `spawn` 的非 Bun 子进程继承, 共 36 次子 FD 泄漏观测. x86_64 原生调用对照通过, 强制 TRAP 后失败, 与 `bun-spawn.cpp` 按当前 `sysconf(_SC_OPEN_MAX)` 扫描的源码一致. 每次均恢复原 soft/hard limit, 30 次强制终止仍在 301-306 ms 内回收, 全部测试包卸载且 UID 进程数归零, 本轮 AVD 已关闭. 见 [M3 spawn 软限制报告](docs/compatibility/2026-09-10-m3-spawn-nofile.json). 复核现有双轮 ELF, 未重新构建或修改 runtime. (2026-09-10, G1/G2, 阻断已复现, 非兼容性通过)
- [x] (设备) 在 Samsung Remote Test Lab SM-A566B (API 36, 原生 arm64-v8a, PAGE_SIZE=16384, 无 native bridge) 对同一 `c240d6c68` 和原测试 APK 运行两轮 20 项, 均为 19/20. 原生 `close_range` 与降低软限制对照通过, 仅 forced-TRAP 后的 spawn fd 继承仍失败; 两轮各观察两个非 Bun 子进程继承 fd 256, 并完整恢复原限制. 6 次强制回收在 302-306 ms 内通过, 卸载后 UID 进程数为 0. 见 [M3 原生 ARM64 16 KiB 报告](docs/compatibility/2026-09-10-m3-native-arm64-16k.json). 这是原生 16 KiB 部分执行证据, 不以同设备正式 Binder 的 8/8 代替实验运行时验收. (2026-09-10, G2, 未改代码/字节, 未发布)
- [x] (上游/构建/测试/设备) 第 8 个 MIT 补丁以 4096-byte 栈缓冲和 raw `openat/getdents64/fcntl/close` 枚举 Linux spawn child 的实际 FD, 移除当前 RLIMIT 与 65536 编号上限依赖, 不分配内存、不取锁, 失败时在 exec 前经原错误路径退出. GCC 13 与 Clang 21 各通过 4 组 57 场景, 包括 fd 70000、降低 soft/hard、真实 vfork/exec、EINTR/目录项/条目预算、符号审计及原实现四项失败对照; 双 Android ABI 目标对象只引用 syscall/errno/栈保护符号. 双 ABI 各两轮清洁构建一致后, 四台 4 KiB arm64 真机、API 33 原生 x86_64 AVD、Samsung API 36 原生 ARM64 16 KiB 真机各两轮 20/20, 合计 240/240. 未放宽原断言, 24 次降低软限制用例均确认两个子 API 不继承 sentinel, 36 次强制回收为 301-329 ms. 所有测试包卸载、UID 进程归零, 本轮 AVD 已关闭, 原有 API 24 AVD 保持运行; 旧失败报告原样保留. 见 [M3 spawn 修复报告](docs/compatibility/2026-09-10-m3-spawn-fd-fix.json). (2026-09-10, G1/G2, 非完整 Binder, 未发布)
- [x] (测试/设备) 新增独立四模式硬 FD 上限夹具, 不修改原 25 项定义、源字节或预算. 九补丁 Bun 在四台 ARM64 API 28/31/33/35 真机和 API 33 原生 x86_64 AVD 各两轮 29/29 (共 290/290). 40 次均先保留 fd 256, 再把 soft/hard 从 32768/32768 降至 128/128, 恢复硬上限被 EPERM 拒绝; 20 次同 PID 启动保留哨兵并设置 CLOEXEC, 20 次 spawn 探针中的两种 API 均不继承它 (40 次子 FD 观测). Java 应用和 supervisor 上限均不变; 原 20 次软限制及 30 次强制回收仍通过 (301-311 ms). 源码/APK/原始结果绑定, 测试包卸载且 UID 清零, 仅关闭本轮新建的 AVD. 见 [硬上限报告](docs/compatibility/2026-09-12-m3-hard-nofile.md). (2026-09-12, G1/G2, 未重编 native, 非 Binder/Release)
- [x] (设备) Samsung SM-A566B (API 36, 原生 ARM64, PAGE_SIZE=16384, native bridge=0, kernel page=16 KiB) 复用上一批 ARM64 APK 和完整 29 项定义, 各两轮 29/29 (58/58). 八次硬上限观测均通过: fd 256 高于 soft/hard 128/128, 恢复硬上限得到 EPERM; 四次同 PID 启动设置 CLOEXEC, 四次 spawn 探针中的两种子 API 均不继承哨兵. 原生 close_range 成功且 forced-TRAP 回退正确, Java/supervisor 限制不变. 原四次软上限及六次强制回收 (301-302 ms) 通过, 测试包卸载且 UID 清零, 未操作 AVD. 见 [硬上限原生 ARM64 16 KiB 报告](docs/compatibility/2026-09-12-m3-hard-nofile-native-arm64-16k.md). (2026-09-12, G2, 无重编/Binder/Release)
- [ ] (测试) 完成启动和 spawn child 的其余 `close_range`/`CLOSE_RANGE_CLOEXEC` 语义门禁. Android 新证据覆盖 fd 256 高于降低后的 hard limit 128, 但仍未覆盖 FD 70000 或超过原 65536 扫描上界; Linux 主机高位 FD 测试不能替代设备证据. 新四模式已有 ARM64 API 32 / 4 KiB 与 API 36 / 原生 16 KiB 证据; UNSHARE、watch/reload、阻塞异步 SIGSYS 和其余线程/错误边界另行验证; 现有 8 项 Binder 的通过不等于扩展矩阵完成.
- [x] (测试/设备) 在不改运行时字节、不放宽原 20 项定义/断言的前提下新增三个固定 syscall 夹具和独立证据校验器. 四台 API 28/31/33/35 原生 arm64 真机及 API 33 原生 x86_64 AVD (均 4096-byte 页) 各两轮 23/23, 共 230/230; 六个 syscall 的 raw TRAP→ENOSYS 对照共 60 次通过, 复制与异步等待另有 16 次先 EIO 证明调用路径、再 TRAP 证明回退的验证通过. API 28 的两次复制因 kernel 4.4 门控、两次 pidfd 因既有更高优先级策略无法观察 EIO, 单独记录且不计为高层分支触达. 原有 30 次强制回收为 301-307 ms, 测试包卸载且 UID 进程归零, 本轮 AVD 已关闭, 未主动操作原有 AVD; API 24 仍在线, 原有 API 36 大页 AVD 在最终只读检查时已离线, 原因未确定. 见 [syscall 报告与语义边界](docs/compatibility/2026-09-10-m3-syscall-fallbacks.md) 及 [完整 JSON](docs/compatibility/2026-09-10-m3-syscall-fallbacks.json). (2026-09-10, G1/G2, 原始历史不变, 本轮无 16 KiB/完整 Binder/发布)
- [x] (上游/测试) 第 12 补丁保留 Android epoll caller mask, 维持已有可选 syscall 禁用, 完整源码 GCC/Clang 各 45 次有界对照及十二补丁重放/28 blobs 通过. [源码与主机范围](docs/compatibility/2026-09-13-m3-pending-wait-fix.md).
- [x] (构建) 第 12 补丁两份全新双 ABI 构建实际退出码均为 0, 每 ABI 成品一致, 四份 ELF、完整日志、16 配方和最终 Ninja 边通过. [独立证据](docs/compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json).
- [x] (设备) 第 12 补丁保持原定义的 33 项探针/八项 Binder 在五个原生 4 KiB 环境通过 330/330、80/80. 含二十次 pending async/六十 child 检查; 两次 API 28 ART 启动失败独立保留, 第三次同 APK 两轮通过. Sony API 33 前置检查断线后改用实测 Redmi; 全部包/执行 UID 清理, 只关闭 owned AVD. [新源码报告](docs/compatibility/2026-09-13-m3-pending-wait-fix.md). (2026-09-13, G1/G2)
- [x] (设备) 第 12 补丁 Samsung SM-A566B / API 36 / 原生 ARM64 / 硬件 16 KiB 两轮原 33 项 66/66, 完整八项 Binder 16/16. 40 个 pending 保持检查点和十二个 child 观测通过, 无测试失败或重试. 复用原 probe APK 与独立 `dbd0fde` 的 81 输入 Binder 批次, 未重建 native/APK; 三包/三个 UID 和本轮私有 ADB 已清理, 无 AVD 操作. 六环境累计 396/396 probes, 96/96 Binder. [独立报告](docs/compatibility/2026-09-13-m3-pending-wait-native-arm64-api36.md). (2026-09-13, G2)
- [x] (设备) 第 12 补丁 Samsung SM-F936U 实测 API 32 / native ARM64 / 4 KiB, 原 33 项和完整八项 Binder 各两轮通过 66/66, 16/16. 与 API 36 批次相同三个 APK, 四十个 pending 保持检查点及十二个 child 观测通过; 无测试失败/重试或 native/APK 重建. 三包/三个 UID 已清理, 私有 ADB 关闭后只读复核, 无 AVD 操作. 两项三星门禁补齐, baseline 七环境累计 462/462 probes, 112/112 Binder. [独立报告](docs/compatibility/2026-09-13-m3-pending-wait-native-arm64-api32.md). (2026-09-13, G2, 非 Release)
- [x] (测试/诊断) 新增两个固定 pending-SIGSYS 异步探针, 原 31 定义/旧 fixture/预算不变; native ARM64 API 28/31 各两轮 31/33, 原 31 项 124/124, 新模式 0/8. 同一线程 tgkill 排入的信号在第一次 spawn 返回时不再 pending, mask 检查仍通过且 JS 尚未交付. 独立两轮 native/TRAP plain/ptrace 共 16 次复现, 八次追踪直接捕获 SI_TKILL 及精确 sender/receiver, 对应父线程 vfork 前临时解除 SIGSYS 阻塞的源码路径. [失败和动态诊断](docs/compatibility/2026-09-13-m3-pending-sigsys.md) 分档, 仅完成回归/诊断, 未修复或验收新兼容能力. (2026-09-13, G1/G2, failed gate)
- [x] (上游/构建/测试, 固定本地套件已关闭历史阻断) 完成 posix_spawn_bun 与后续 wait 阶段 pending SIGSYS 修复的独立双 ABI 构建和本地设备门禁. 第 11 补丁双 ABI 独立构建、actual exit 0 与四份 ELF 审计已通过. 它分开处理 Android 父线程追加阻塞与 vfork 子路径 mask, blocked caller 的 cgroup 走已有 child join 且不污染全局 clone3 状态. GCC/Clang 各 14 场景与两个旧源码失败对照通过, 完整重放/28 blob 不变. Sony API 28/31 的原 31 项过 124/124, 新模式 0/8, 失败后移到 async wait. 已捕获八次 epoll_pwait/空 mask 只读上下文, 第 12 补丁完成 wait mask 修复、可选 syscall 审查和新独立构建, 原 33 项在五个原生 4 KiB 环境通过 330/330, 同源码原 Binder 80/80; 不预热 pidfd、不提前清空 pending、不放宽原断言. 十补丁字节和失败记录保持历史范围, 见 [修复进度](docs/compatibility/2026-09-13-m3-pending-mask-fix.md).
- [ ] (测试) 覆盖 blocked `SIGSYS` mask, `process.on("SIGSYS")`, watch/reload, spawn/spawnSync, timeout, cancellation, 强制终止和插件进程重建. 历史 FD 夹具只在同步路径阻塞 SIGSYS, 异步在恢复 mask 后执行. 独立两模式保持 SIGSYS 阻塞直到三个异步子进程均退出, 检查 caller TID/mask、child mask/UID/parentage、FD 正负对照及回收. 九补丁的 Sony API 28 四次 exit 159 失败仍独立保留; 十补丁已在七个原生环境通过 28/28 新观测和 84 个 child 检查, 包含三星 API 32/4 KiB 和 API 36/原生 ARM64 16 KiB. watch/reload、其他线程和现有八项套件之外的插件边界仍待覆盖.
- [x] (测试/设备) 固定套件扩为 31 项而保留原 29 项定义/源码/预算, 双 ABI APK 绑定 28 个 canonical 输入. ARM64 API 31/33/35 与 x86_64 API 33 各两轮 31/31 (248/248), 含 16 次 blocked async 和 48 个短生命周期子进程观测. Sony API 28 两轮 29/31, 新两项共四次 exit 159 且无语义记录; 原 29 项 58/58. 成功/失败分别归档, 失败专用归档器不接受隐藏的其他回归, 不进入通过归档. 五个包/UID 均清理, 本轮 AVD 关闭, 预先在线 API 27 AVD 未操作. 见 [报告](docs/compatibility/2026-09-13-m3-blocked-async.md)、[四环境通过 JSON](docs/compatibility/2026-09-13-m3-blocked-async-passing.json) 与 [API 28 失败 JSON](docs/compatibility/2026-09-13-m3-blocked-async-api28-failure.json). (2026-09-13 本地日期, G1/G2, 门禁失败, native/历史/Release 不变)
- [x] (源码/测试/设备) 独立观察器确认 API 28 pidfd_open SIGSYS 后, 补丁 10 通过只读 mask 查询选择既有 waiter. 十补丁重放、28 个 blob、十个精确源码 host 用例、已有双 ABI 成品恢复审计通过. 原 31 项只改 revision, 五个本地原生 4 KiB 环境两轮探针 310/310、Binder 80/80. 旧失败和首次 ART 启动失败单独保留; 包/UID/owned AVD 全部清理. 见 [报告](docs/compatibility/2026-09-13-m3-blocked-pidfd-fix.md). (2026-09-13, G1/G2)
- [x] (设备) 十补丁同一 native 和三个 APK 在 Samsung SM-F936U API 32 / 原生 ARM64 / 4 KiB、SM-A566B API 36 / 原生 ARM64 / 16 KiB 各过两轮原 31 项及完整八项 Binder, 新增 124/124、32/32, 累计七环境 434/434、112/112. 原定义/预算未改, 无失败或重试; 包/执行 UID 均清理, 无 AVD 操作. 见 [API 32](docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md) 与 [原生 16 KiB](docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md). (2026-09-13, G2)

- [x] (测试/设备) 在同一 `a260ef308` 字节上增加固定 openat2 目录约束夹具, 套件扩为 24 项; 新源码独立打包为 8 KiB 上限的 APK 资源, 保留原 23 项内容与原 128 KiB JSON/输出/超时门禁. 四台 API 28/31/33/35 原生 arm64 真机及 API 33 原生 x86_64 AVD (均 4096-byte 页) 各两轮 23/24: 原 230 项观测全部通过, 新增 10 项均失败. 12 种 HTTP 路径分别在 native 与后置 TRAP 阶段检查; 普通文件、内部链接、编码穿越拒绝及 FIFO 非阻塞通过, 相对/绝对/魔术链接共 60 次返回配置根外的私有测试哨兵. 不接触用户数据, 不把失败改作通过; 原 30 次强制回收为 301-316 ms, 全部测试包卸载后 UID 进程归零, 本轮 AVD 已关闭. 所有设备在测试过滤器前已观察到 raw openat2=ENOSYS, 不声称 EIO/首次高层 TRAP 触达. 见 [目录约束阻断报告](docs/compatibility/2026-09-10-m3-openat2-confinement.md) 及 [完整 JSON](docs/compatibility/2026-09-10-m3-openat2-confinement.json). (2026-09-10, G1/G2, 验收失败, 未改 native/未发布)
- [x] (源码审计) 修正上一轮大小写敏感搜索的局限: `fchmodat2` 以 `SYS_FCHMODAT2` 直接出现在 `sys::lchmod`, 由 install/bin 的 chmod_on_ok 调用, ENOSYS 后走 libc fchmodat 且调用者忽略错误. Android 内部 Node lchmod 另返回 EOPNOTSUPP, 十轮实测两个公开 node:fs 导出均为 undefined. 本轮未运行依赖安装, 不据此通过内部 CLI fallback; 旧报告保持原样, 新报告明确记录修正.
- [x] (产品决策) 用户选择原方案二: 保留普通目录路由, 为 openat2 不可用的环境实现有界只读 FD 相对路径回退, 不采用整体关闭目录服务或新增宽松开关. 一般 Bun.file/node:fs 能力不受本次修改限制, 不将可信脚本包装成安全沙箱. (2026-09-10)
- [x] (上游/构建/测试/设备) 第 9 个 MIT 目录约束补丁锁定至 `7b9ac266888abda7ee6ec0b8ac11a74236420030`, 通过完整源码重放与双 ABI 各两轮逐字节一致的清洁构建. GCC 13 / Clang 21 各四组 20 场景, GCC ASan/UBSan/泄漏检查及 API 28 双 ABI 对象审计通过. 原 24 项设备定义仅更新 revision: 四台 API 28/31/33/35 ARM64 真机与 API 33 x86_64 AVD (均原生 4 KiB) 各两轮 24/24, 共 240/240; 全部 240 路径断言通过, 原 60 次越界哨兵读取全部拒绝且普通目录服务保留. 30 次强制回收 300-306 ms, 测试包卸载后 UID 进程为零, 本轮 AVD 已关闭. 旧失败不改写, 不声称首次高层 EIO/TRAP 触达或内核级全竞态等价. 见 [目录回退修复报告](docs/compatibility/2026-09-10-m3-scoped-open-fix.md) 与 [完整证据](docs/compatibility/2026-09-10-m3-scoped-open-fix.json). (2026-09-10, G1/G2, 未发布)
- [x] (设备) Samsung SM-A566B (API 36, 原生 arm64-v8a, PAGE_SIZE=16384, native bridge=0) 对九补丁 `1.4.0+7b9ac2668` 运行完全相同的 ARM64 APK 和 24 项套件, 两轮 24/24, 共 48/48. 48 项路径断言全部通过, 12 次越界请求均拒绝哨兵, 普通文件/根内链接正常; 12 次 raw syscall 对照与 4 次 EIO 控制下的复制/等待行为通过. 4 次降低软 FD 限制、6 次强制回收 (302-304 ms) 通过, 包卸载后 UID 进程为零; 本轮未启动/关闭 AVD, 两台原有 AVD 保持在线. 原字节/夹具/验证器/限制不变, 复核旧四个构建产物而非重新构建. raw openat2 仍在过滤器前不可用, 不声称首次高层 EIO/TRAP、完整实验 Binder 或生产 v0.2.2/Release 验收. 见 [原生 ARM64 16 KiB 复测](docs/compatibility/2026-09-11-m3-scoped-open-native-arm64-16k.md) 与 [完整 JSON](docs/compatibility/2026-09-11-m3-scoped-open-native-arm64-16k.json). (2026-09-11, G2, 未发布)

- [x] (测试/设备) 原 24 项定义和运行时字节不变, 新增固定离线 lchmod/bin-link 探针与独立校验器. 四台 API 28/31/33/35 ARM64 真机, API 33 原生 x86_64 AVD (4 KiB), Samsung API 36 原生 ARM64 / 16 KiB 真机各两轮 25/25, 共 300/300. 七个 CLI 对照各运行 12 次 (84 次): 普通文件与重复链接恢复 0700, symlink referent 保持 0600, fallback EIO 被 CLI 忽略但权限不变, no-bin 与 syscall 452 的 SIGSYS 主线程状态共同证明路径触达. 旧内核使用 KILL_THREAD 后先观察 Z/31, 再经持有的子进程句柄回收剩余线程, 不把单独 SIGKILL 或超时算作成功. 新夹具源码上限 12 KiB, 原 24 项源码/时间/输出限制不变. 早期夹具失败独立保留; 所有测试包卸载, UID 进程归零, 本轮 AVD 关闭, 两台原有 AVD 未操作. 见 [lchmod 报告](docs/compatibility/2026-09-11-m3-lchmod-bin-link.md) 与 [完整 JSON](docs/compatibility/2026-09-11-m3-lchmod-bin-link.json). (2026-09-11, G1/G2, 非完整实验 Binder/CLI/Release)

### M3-B: 插件诊断与实验分发

- [x] (插件/测试/设备) 新增 opt-in `minSdk=28`、独立包名、`testOnly=true` 且禁用 Release variant 的实验插件模块, 复用真实生产服务和同一 8 项 Binder instrumentation. 原九补丁双 ABI 与 supervisor 不变, API 28/31/33/35 ARM64 真机、API 36 ARM64 16 KiB 三星真机及 API 28/30/31/36 native x86 4 KiB AVD 各两轮 8/8, 合计 144/144. 绑定 APK 内嵌源码 receipt、安装后摘要、90 条生命周期诊断和卸载后零 UID 进程; 权限签名或早期工具解析失败独立保留, 不绕过真实服务权限. 见 [实验 Binder 报告](docs/compatibility/2026-09-12-m3-experimental-binder.md). (2026-09-12, G1/G2, 现有完整套件, 非全部语义/OEM/Release)
- [x] (插件/测试) 完善 runtime probe 诊断: 保留十语言摘要并附 API、验证得到的 ABI、阶段、运行时身份、退出/清理事实和各流最多 4 KiB 的固定检查输出; 明确标记 possibleSignal 仅按退出惯例推断. 持续排空并有界终止, 不收集用户源码、任意异常消息或 fingerprint, 不增加 AIDL/Bundle 协议. 五个原生 4 KiB 环境的原八项 Binder 合计 80/80、新三项受控 probe 测试 30/30; 独立语言回归 8/8 和 x86 16 KiB 执行前拒绝 4/4. 两个失败尝试与同 APK 重试分别保留, 详见 [M3-B 报告](docs/compatibility/2026-09-13-m3-probe-lifecycle.md). (2026-09-13, G1/G2, 服务回归, 非 native/Release 扩围)
- [x] (插件/测试) 明确失败缓存: 成功/固定完整性/版本/页大小结果保持至服务重建; 已完成清理的临时失败冷却 30 秒后按需重试, 并发调用共享一次检查且无后台重试. 未回收或未排空时禁用重试. JVM 覆盖冷却起点、并发、中断、输出和失败清理; 五环境通过真实 payload 的受控注入/虚拟时钟回归, 不把注入故障视为自然设备故障. [实现与边界](tools/diagnostics/PROBES.md). (2026-09-13, G1/G2)
- [ ] (测试) 构建 `minSdk=28` 实验 APK, 验证 Java/Kotlin API 28 路径, native payload 提取, 只读 `nativeLibraryDir` exec, SELinux 和应用 zygote seccomp 继承.
- [x] (设备) API 28, 29, 30, 31, 32 各完成 `x86_64` AVD 的现有完整 8 项 Binder instrumentation, 每版本各两轮共 80/80. 原 API 28/30/31 证据不改写; 本轮补齐 API 29/32 native 4 KiB 的 32/32, 并以同一九补丁字节运行未改动的 25 项独立探针 100/100. 新增 20 条 Binder 生命周期诊断、8 次 FD 软限制降低和 12 次强制回收 (302-304 ms); API 29 pidfd 的两次 policy-gated 观测仍排除于 EIO 高层触达, 两版本 openat2 均在过滤器前不可用. 测试包与 UID 进程清理, 仅关闭本轮启动的两台新 AVD. Android 12 与 12L 分开, 不推断 ARM64 API 32 或其余 syscall/FD/CLI 通过. 见 [API 29/32 复测报告](docs/compatibility/2026-09-12-m3-api29-api32.md). (2026-09-12, G2, 非 Release)
- [x] (设备) Samsung Remote Test Lab Galaxy Z Fold4 SM-F936U 实测 SDK=32, 原生 arm64-v8a / aarch64, PAGE_SIZE=4096, native bridge=0; 系统显示 Android 12 不影响 API 32 / Android 12L 的判定. 九补丁字节和既有定义不变, 两轮现有 Binder 16/16, 原 29 项应用探针 58/58. 含 8 次硬上限观测、8 次 spawn API 检查、4 次软上限和 6 次强制回收 (301-302 ms), 另有 10 条 Binder 生命周期诊断. 绑定本轮重新构建的 Binder APK 与复用的探针 APK, 三个测试包卸载, 三个 UID 均清零; 未启动/关闭 AVD. 见 [原生 ARM64 API 32 报告](docs/compatibility/2026-09-12-m3-native-arm64-api32.md) 及独立 Binder/探针 JSON. (2026-09-12, G2, 非 16 KiB/完整矩阵/Release)
- [ ] (设备) 至少在 API 28, 31, 32 各一台 `arm64-v8a` 真机运行完整矩阵, 并覆盖 AOSP/Pixel 类与至少两种 OEM. 三个版本均已有现有 8 项 Binder 和固定应用探针证据, API 32 已由 Samsung Fold4 原生真机补齐; 此项仍等待扩展 syscall/API/FD 和 AOSP/Pixel/OEM 矩阵, 不以现有有限套件或 x86 AVD 代替.
- [ ] (发布) 实验包, PluginInfo, README 和错误信息显式标明仅支持 64 位设备, 单源码 `--no-install`, 未承诺完整 Bun CLI; 提供恢复到 API 33 稳定包的清晰路径.

**M3 升阶门:** API 28-32 每个版本至少有 G2 证据; 所有已知 syscall trap 路径无进程级 `SIGSYS`; API 33-35 无回归. 满足前只可发布 experimental/beta, 不得将 Android 9 写为稳定支持.

## M4: Android 9+ 稳定化

- [x] (测试/工具) 新增独立四模式离线 API Binder 套件: 文件/目录监听, 实例级本地 DNS, 二进制 TCP 半关闭和 HTTP redirect/stream/abort. 保留真实服务与共享 AAR, 固定 12 KiB 源/8 s 工作/12 s Binder/16 KiB 输出, 主机执行实际夹具并验证失败与 source/APK/双 UID 拒绝控制. [工具范围](tools/bun-runtime/experimental/api28/runtime-api/README.md). (2026-09-14, G0/G1)
- [x] (测试/设备) 十三补丁 baseline 复用, 单一 99 输入三 APK 批次在 ARM64 API 28/31/33/35 与 x86_64 API 33 的原生 4 KiB 环境各两轮, 四模式 40/40. 含 20 次 TCP 连接、30 次本地 DNS 查询及 30 次 HTTP 请求; 40 workspace、十个包 UID 及唯一 owned AVD 已清理. Sony API 33 安装前离线独立保留, 同 APK 改用 Redmi, 无运行期失败重试. [固定报告](docs/compatibility/2026-09-14-m4-runtime-api.md). 不增加原 560/128 或 JSC 32/28, TLS/IPv6/其余矩阵/Release 保持开放. (2026-09-14, G2/有限补充)

**目标:** 把 M3 的 "实验性" 变成可以写进 README 的正式支持 -- 前提是测试矩阵, 信号处理, 性能和发布验证全部闭环.

- [ ] (测试) 完成 API 28-35, `arm64-v8a`/`x86_64`, 4 KB/16 KB 页, AOSP 与主要 OEM 的分层矩阵, 并把运行报告以机器可读格式归档.
- [ ] (测试) 覆盖 JS, TS, ESM, Unicode, Promise, timer, Worker, 文件读写/复制/rename/watch, DNS, TCP, TLS, `fetch`, spawn, timeout, cancellation, output limit, 重复绑定和服务进程恢复.
- [ ] (测试) 对每次失败保存有界 logcat/tombstone 摘要和 `si_syscall`; 新增 syscall 必须先建立可重放回归测试, 再更新兼容结论.
- [ ] (安全) 审计 SIGSYS handler 与 Bun signal, crash, watch, vfork/exec, 线程 mask 的交互, 确认不会吞掉非 seccomp 信号或把其他安全策略错误改写为成功.
- [ ] (性能) 比较官方与 patched runtime 的冷启动, prewarm, 脚本延迟, 内存, spawn 和信号 fallback 成本; 性能报告与正确性门禁分离.
- [ ] (发布) 完成签名连续性, 覆盖升级, 全新安装, 禁用/启用, Wake, OEM 后台限制, 卸载清理和回退验证后, 再决定是否把主发行版最低版本正式降到 API 28.

**M4 升阶门:** Android 9+ 的支持声明由完整 G3 证据支撑; patched runtime 的来源, 补丁, 许可证和设备矩阵随每个发布版本可追溯, 且不存在必须靠二进制热补丁或特定 OEM 放宽策略才能运行的路径.

## M5: 16 KB page size 与发布完整性

- [x] (诊断/工具) 新增原七模式顺序下的独立DFG控制流观察, 七段标记代码剥离后恢复整个原压力JS. 保留原匿名回调/128预热/三样本早停/四profile与全部原断言, 错误记录后原样重抛, 每类完整首栈有字节限额. 六项实际JS主机控制与严格源/APK/raw/双UID验证纳入CI. [工具及范围](tools/bun-runtime/experimental/webkit-x86_64-16k/flow/README.md). (2026-09-14, G0/G1)
- [x] (诊断/设备) 同一94输入APK复用十三补丁JSC, API36原生x86双用户页各两轮完成28模式, 无失败/重试. 四DFG均首profile停止, 样本18/10/82/93, 392trace/8完整首栈无省略. 两包/四UID和两owned AVD已清理, 原2<3根因未定且不增加原压力或Release通过. [固定报告](docs/compatibility/2026-09-14-m5-jsc-pressure-flow.md). (2026-09-14, G2/诊断)

- [x] (设备/ARM64) 十三补丁 baseline 在 SM-A566B / API 36 / bridge=0 的实际 16384-byte 内核/MMU 页上, 同一 APK 的固定 35 项与完整八项 Binder 各两轮通过 70/70 和 16/16. 八次实际 watch 重载无哨兵继承, 十二个镜像的 PID/stdio/普通 SIGSYS 与原 FD/信号/生命周期均通过, 三包/三个 UID 已清理. [同一 M3/M5 三星批次](docs/compatibility/2026-09-13-m3-watch-reload-samsung.md), 不重复计数, 不作为 x86 大页 JSC、ARM64 压力或 Release 验收. (2026-09-13, G2)

- [x] (设备/ARM64) 十二补丁 baseline 在 SM-A566B / API 36 的实际 16384-byte 内核/MMU 页上, 原 33 项与八项 Binder 各两轮通过 66/66 和 16/16, bridge=0. 沿用既有 APK/native, pending 保持/一次投递和原 FD/生命周期断言通过, 三包/三个 UID 已清理. [同一 M3/M5 设备批次](docs/compatibility/2026-09-13-m3-pending-wait-native-arm64-api36.md), 不重复计数, 不代表 ARM64 压力或 Release 验收. (2026-09-13, G2)

本轮十二补丁 JSC 新构建完成: 两份全新 clean Bun 成品一致, 实际退出码 0/0, 21 项构建输入未漂移,
复用原两套独立 JSC 库/config 和 ICU. [单独源码/构建报告](docs/compatibility/2026-09-13-m5-twelve-patch-jsc.md)
与九/十补丁历史证据分开. 同一 83 输入新 APK 双页大小的原 Binder 32/32 和原压力模式 28/28 已独立通过; 初次低内存服务终止及完整同 APK 重试分开保留, 不转移 baseline 或历史成绩.

**目标:** 保证发布的每个 APK 从 ELF 对齐到安装后字节都可验证, 并最终在真实 16 KB 页环境跑通. 背景: 新的 Android 设备可能使用 16 KB 内存页, `PT_LOAD` 对齐不足的可执行文件在这类设备上无法加载.

**已落地 (进展记录, 2026-09-02, G1/G2):**

- 新增统一 APK verifier 和 4 个 ZIP/payload 回归测试, 已接入 debug CI 与 release 收集任务.
- verifier 要求三类 APK 集合精确匹配, 执行 `zipalign -c -P 16 4`, 并对压缩后的 Bun entry 解压核对 ABI, 字节数, CRC32 与 runtime lock SHA-256; 本地 debug/release 各三份 APK 均已通过.
- instrumentation 增加了安装后 `nativeLibraryDir/libbun_exec.so` 的字节数与 SHA-256 断言; Sony XQ-DQ72 API 33 arm64 真机已通过更新后的 4/4 instrumentation, 证据见 `docs/compatibility/2026-09-02-m5-payload-integrity.json`.
- instrumentation 新增可选 `requiredPageSizeBytes` 硬断言; runtime ABI 改为由安装后 payload 的锁定 SHA-256 识别, prewarm 在版本与 revision 后执行最小 `--eval "void 0"` 探针, 避免把只能显示版本但无法执行脚本的 runtime 报告为 ready.
- Android 16 / API 36 x86_64 16 KB AVD 已完成双路径验证: `arm64-v8a` 单 ABI APK 经 `libndk_translation` 完整 5/5 Binder instrumentation 通过, 原生 `x86_64` 则连 `-e 42` 都稳定以 exit 134 中止; 关闭 regexp JIT, 全部 JIT 或 `--smol` 均无效. 双路径报告见 `docs/compatibility/2026-09-02-m5-16kb-execution.json`.
- 原生 x86_64 阻断已通过同一 payload 的 API 36 4 KB 对照, 插件 UID/root 对照和双 `strace` 收敛到 pinned WebKit `WTF::pageSize()` 的 4 KB 编译期 ceiling: 4 KB 环境继续创建 `JSJITCode`, 16 KB 环境则在首次 JIT mapping 前主动 abort. prewarm 现对该已知组合在启动 Bun 前返回有界诊断; 根因报告见 `docs/compatibility/2026-09-02-m5-x86-16kb-root-cause.json`.
- 已安装的 API 36 arm64 16 KB system image 与 AVD 配置完整, 但 Android Emulator 37.1.11 在当前 Intel x86_64 宿主明确拒绝启动 arm64 guest; 本机 AVD 保持原样, 后续改用下述远程 ARM64 真机获得证据.
- 2026-09-08 已补齐官方 v0.2.0 release 的 arm64-only/universal 安装后 APK 与原生 arm64 payload 摘要, 以及 13 个公开资产的完整性验证. 该次发布记录不包含原生 arm64 16 KB 验收, 保持原样.
- 2026-09-10 通过用户接入的 Samsung Remote Test Lab SM-A566B, 首次完成官方 Bun + 监督器的 v0.2.1 开发版原生 arm64 / 16 KiB 完整 Binder 两轮 8/8. 同设备的旧实验运行时 `c240d6c68` 两轮 19/20 失败记录保留; 新八补丁 `a260ef308` 已另行通过不放宽断言的两轮 20/20, 见 [spawn 修复报告](docs/compatibility/2026-09-10-m3-spawn-fd-fix.json). x86_64 large-page、最终 Release APK 与实验完整 Binder 验收未完成, 因此不扩大通用 16 KB 支持声明.

条目清单:

- [x] (构建/x86_64) 十三补丁 `e8b129616` 两份独立 clean Bun 构建 actual exit 0/0, 21 输入和 clean head/tree 未漂移. 两份完整 90609496-byte 成品 `17c7941a...20e98a8` 一致且 ELF 审计通过; 复用原两套独立 JSC 库/config 与 ICU, 新 WebKit/ICU 构建为零. [独立构建归档](docs/compatibility/2026-09-13-m5-thirteen-patch-jsc-builds.json), 不转移历史设备成绩. (2026-09-13, G1)
- [x] (设备/x86_64) 十三补丁新候选在API36 x86 4KiB/16KiB用户页各两轮原八项Binder通过32/32, 无失败/重试. 同一APK的85输入匹配`ba5418e`, 签名/安装payload、20生命周期及两个UID清理均通过. [独立Binder归档](docs/compatibility/2026-09-14-m5-thirteen-patch-jsc-binder.json). (2026-09-14, G2, 非Release)
- [x] (测试/x86_64) 同一十三补丁APK在双页大小各两轮原七模式压力通过28/28, 初次16KiB第二轮DFG采样不足失败独立保留, 同APK完整两轮复测通过; fixture/validator/预算不变. 实际LLInt/Baseline/DFG/FTL、GC/Wasm、64个worker正常退出通过; 用户页ABI16KiB仍模拟于4KiB内核映射. 仅关闭本轮两AVD, [压力与清理报告](docs/compatibility/2026-09-14-m5-thirteen-patch-jsc.md)不计入baseline560/128或长时/全JIT/性能/Release. (2026-09-14, G1/G2)
- [ ] (诊断/测试) 查明固定 DFG 采样不足的条件与稳定性. 保留十三补丁 16KiB 第二轮 2<3 样本失败及同 APK 完整复测, 用独立有界观测检查目标采样和优化状态, 不放宽原三样本/四次采样及执行预算.
- [x] (诊断/源码) 逐字节绑定固定 Bun/WebKit 的 profiler 与测试辅助源码, 确认微秒间隔、pause/clear/start、内联帧展开和编译计数边界; 列出原失败缺少的逐次采样字段. [源码审阅](docs/diagnostics/2026-09-14-jsc-sampling-source-review.md)不代替动态根因、稳定性或新套件验收. (2026-09-14, G0)
- [x] (诊断/工具) 新增独立有界 DFG 取证资产、真实 Binder instrumentation 和严格归档器, 保留逐次时间/调用/trace/层级/优化计数与原门槛结果; 构造反向测试拒绝把样本不足exit1改成成功. 原七模式资产/Java/validator及预算不变, 新工具纳入CI. [工具说明](tools/bun-runtime/experimental/webkit-x86_64-16k/sampling/README.md). (2026-09-14, G1)
- [x] (诊断/设备) 同一87输入APK和原十三补丁JSC字节在API36原生x86双页大小各收集两轮DFG诊断, 目标样本9/16/103/91, 均首次profile达到原门槛. 保存全函数与目标层级差异、四UID归零和两owned AVD关闭记录; 未复现历史2<3, 不推断根因或稳定性, 不增加原套件接受数. [动态报告](docs/compatibility/2026-09-14-m5-jsc-sampling.md). (2026-09-14, G2, 非原压力/Release验收)
- [x] (诊断/工具/设备) 新增独立固定四段命名profile及target-absent对照, 同一89输入APK与原十三补丁JSC在双页大小各两轮收集8次进程诊断/32次profile. 全部阶段与时间区间符合重启/清空预期; 四次真实exit1连同失败终态、完整输出和原始双UID清理保留. [动态报告](docs/compatibility/2026-09-14-m5-jsc-restart.md)完成多capture与受控失败传输覆盖, 不等同自然低采样复现或原压力验收. (2026-09-14, G1/G2)
- [x] (诊断/源码) 绑定14个固定Bun/WebKit源文件, 核对noFTL/内联属性分离、条件PC映射、FTL findPC和机器tier归属. 与4KiB第二轮第四段9766次目标调用/126trace/0目标帧/125调用者FTL帧关联, [源码补充](docs/diagnostics/2026-09-14-jsc-restart-ftl-source-review.md)明确缺少实际内联图与映射状态. 原2<3根因门禁仍开放, 下一步预先固定单因素诊断且先证明选项生效. (2026-09-14, G0/诊断)
- [x] (诊断/工具/源码) 新独立PC映射off/on工具复用原四段JS及语义validator, 共同启用最终选项/编译器内联日志, 仅改变映射值并反转第二轮顺序. 五组正反向测试和CI完成; 18个固定源码文件绑定选项finalize、日志身份与机器tier路径. [源码补充](docs/diagnostics/2026-09-14-jsc-pcmap-source-review.md)区分选项实际生效、内联决定与已执行FTL, 不将选项回显称为map指针观测. (2026-09-14, G0/G1)
- [x] (诊断/设备) 同一90输入APK及原十三补丁JSC在双页大小各两轮收集8进程/32profile, 8份实际选项全部匹配. 开启组155目标FTL及两次真实exit1保留, 关闭组两段12调用者FTL与目标DFG混合; 16KiB有内联决定但未采到FTL执行. [完整报告](docs/compatibility/2026-09-14-m5-jsc-pcmap.md)保留未复现整段目标归零和历史2<3根因未定, 两包/四UID及两owned AVD已清理, 不增加原套件接受数. (2026-09-14, G2/诊断, 非原压力/Release验收)
- [x] (诊断/工具/源码) 新增独立完整 trace/inliner 观察, 原 JS 仅加三段可剥离代码, 热函数/回调/门槛与预算不变. 首条分类见证有单份/总字节上限及显式省略, 主机重验原始帧的外层机器关联并匹配编译 hash; 7 组反向测试纳入 CI, 20 份固定源码绑定 extra-data/CodeOrigin/位置编码. [源码补充](docs/diagnostics/2026-09-14-jsc-trace-source-review.md)区分导出的机器帧身份和原始 PC/map 指针. (2026-09-14, G0/G1)
- [x] (诊断/设备) 同一 92 输入 APK 与原十三补丁 JSC 在 API36 x86 双用户页各两轮收集 8 进程/32 profile/2530 trace, 保存 65 份完整栈, 无省略或重试. 四份 FTL 见证明示目标进入同栈 invoke 机器帧; 90 条夹具汇总与三次真实 exit1 保留. 关闭组一段 5030 次目标调用/64 trace 全无目标, 首栈调用者位置 nil, 其他混合段有 bc#127. [报告](docs/compatibility/2026-09-14-m5-jsc-trace.md)保留原 2<3 根因未定与观测扰动边界, 两包/四 UID 及两 owned AVD 已清理; 不增加原压力或 Release 通过. (2026-09-14, G2/诊断)
- [x] (构建/x86_64) 独立 rebase 到十二补丁 `06e518f73`, 两个全新 clean Bun 构建实际 exit 0/0, 21 输入和 source head/tree 均未漂移. 两份完整 90609496-byte 成品 `34edd4b9...a75b1ad` 一致且完整 ELF 审计通过. 精确复用两套独立 JSC 库/config 和原 ICU, 新 WebKit/ICU 构建 0/0. [构建归档](docs/compatibility/2026-09-13-m5-twelve-patch-jsc-builds.json) 保留原始换行摘要/精确映射及此前 recorder 失败, 不重新编译或改写旧证据. (2026-09-13, G1)
- [x] (设备/x86_64) 十二补丁候选在 API 36 的 4 KiB/16 KiB 用户页各两轮原八项 Binder 通过 32/32. 同一 APK 的 83 输入匹配 `0210e82`, 安装字节/签名/完整 payload、二十条生命周期和两个 UID 清理通过. 初次 16 KiB lowmemorykiller 导致预热 DeadObjectException 的整批失败独立归档; 同 APK 完整两轮重试通过, 无配置/源码/预算 workaround. [Binder 与失败范围](docs/compatibility/2026-09-13-m5-twelve-patch-jsc.md). (2026-09-13, G2, 非 Release)
- [x] (测试/x86_64) 同一十二补丁 APK 双页大小各两轮原七模式压力通过 28/28, 原 fixture/validator/预算不变. LLInt/Baseline/DFG/FTL 实际采样、GC/Wasm 和 64 个 worker 正常退出均通过; AT_PAGESZ/sysconf/getconf 一致, 两台内核/MMU 页均为 4 KiB. [压力归档](docs/compatibility/2026-09-13-m5-twelve-patch-jsc-pressure.json) 与 [清理补充](docs/compatibility/2026-09-13-m5-twelve-patch-jsc-checkpoints.json) 分开. 仅关闭本轮两个 AVD, 不计入 baseline 330/330 或 80/80, 不扩张为 ARM64 硬件页/压力、全 JIT/Wasm、长时性能或 Release. (2026-09-13, G1/G2)

- [x] (构建/x86_64) 将大页 JSC 候选独立 rebase 到十补丁 `a9c76a599`: 两个新 Bun checkout 完成完整离线构建, 两个 actual driver exit 均为 0, source head/tree/clean 与最终 link/map/strip 日志已绑定. 两份完整 Bun 均为 90609488 bytes / `a237dc8c...7f8dcd5`, ELF 至少 16 KiB 对齐; 精确复用两套已独立构建的 JSC 库/config 和原上游 ICU, 新 WebKit/ICU 构建数为 0. [独立候选锁](tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-candidate.lock.json) 与原九补丁锁及十补丁 baseline 证据分开, 不继承旧设备成绩; 新防漂移门禁纳入 189 项 Node tests. (2026-09-13, G1, 新设备/Release 另计)
- [x] (设备/x86_64) 十补丁大页 JSC 新成品 `a237dc8c...7f8dcd5` 在 API 36 native x86_64 的 4 KiB/16 KiB 用户空间页各通过两轮原完整八项 Binder, 合计 32/32. 同一主/测试 APK 的 77 输入逐项绑定提交 `5738129`, 安装前后签名/字节/对齐、20 条生命周期及执行 UID 清理通过; 仅关闭本轮两个 AVD. [原始 Binder 归档](docs/compatibility/2026-09-13-m5-ten-patch-jsc-binder.json) 与 baseline 十补丁 112/112 和九补丁成绩分开. (2026-09-13, G2, 非 Release)
- [x] (测试/x86_64) 同一新候选与同一 APK 在上述两种页大小各过两轮未改动的七模式 JSC 压力, 共 28/28, 包括 LLInt/Baseline/DFG/FTL 实际采样、GC/Wasm 和 64 个 worker 正常退出. 所有源资产、语义断言与时间/输出预算不变. AT_PAGESZ/sysconf/getconf 一致, 两台 shell smaps 都为 4 KiB, x86 16 KiB 仍是用户页 ABI 模拟. [压力归档](docs/compatibility/2026-09-13-m5-ten-patch-jsc-pressure.json) 与 [完整说明/收尾记录](docs/compatibility/2026-09-13-m5-ten-patch-jsc.md) 独立保留, 不扩张为长时压力、全 JIT/Wasm、ARM64 压力或性能验收. (2026-09-13, G1/G2, 非 Release)
- [x] (构建) 当前两个官方 ELF 的所有 `PT_LOAD` segment 至少 16 KB 对齐.
- [x] (构建/发布) debug/release 三类 APK 均通过 `zipalign -c -P 16 4` 与包内摘要验证; 最终 v0.2.0 arm64-only/universal 的原生 arm64 安装后 `nativeLibraryDir` 摘要已通过真机验证, 见 [发布报告](docs/compatibility/2026-09-08-v0.2.0-release.json). (2026-09-08, G1/G2)
- [ ] (设备/发布) 补齐最终签名 x86_64 APK 的安装后摘要与完整原生执行验收, 不用 debug CI 代替最终签名产物测试.
- [x] (设备) 在 Android 16 / API 36 `google_apis_ps16k` AVD 硬断言 `PAGE_SIZE=16384`, 并以 `arm64-v8a` 单 ABI APK 经原生翻译桥完成 5/5 Bun Binder instrumentation. (2026-09-02, G2; 明确不等同于原生 arm64 证据)
- [x] (实验/设备/x86_64) 在 pinned WebKit 显式启用 `USE_64KB_PAGE_BLOCK`, 保留 JIT/DFG/FTL/Wasm JIT 与 Bun 外部 mimalloc 配置, 重编 JSC/WTF/bmalloc 并重新链接九补丁 Bun. 新候选在 API 36 native x86 的 4 KiB/16 KiB AVD 各两轮完整 8 项 Binder 通过 (32/32), 启动中止消失, installed APK/payload 与清理通过. 原始候选锁保留 incremental 来源, 后续独立清洁重建另计; 不把编译启用各 JIT 层当作逐层性能验收. 官方 payload 和 >4096-byte 防护不变. 见 [JSC 修复候选报告](docs/compatibility/2026-09-12-m5-x86-16k-jsc.md). (2026-09-12, G1/G2, 非 Release)
- [x] (构建/x86_64) 在两个全新目录各构建一轮 WebKit/JSC, 并在两个全新九补丁 Bun checkout 各完成一轮完整离线 native/Rust 构建. 三个 JSC 库、config 与两个完整 Bun 的 SHA-256 均一致, Bun 均匹配已通过双页大小 Binder 的 `704cc156...3963e38` 候选. 原 incremental 来源锁不改写, [独立清洁构建 receipt](docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json) 单独绑定后续证据; 上游 ICU 复用而非重编. (2026-09-12, G1, 非 Release)
- [x] (设备/arm64) Samsung Remote Test Lab SM-A566B 真机 (Android 16 / API 36, 原生 arm64-v8a, kernel aarch64, PAGE_SIZE=16384, native bridge=0) 完成官方 Bun 1.4.0 + 锁定监督器的 v0.2.1 开发版 arm64-only Debug APK 完整 8 项 Binder 两轮验收. 每项测试前硬断言 API/页大小, 每轮前 force-stop 并重新启动, 安装后双 payload 摘要与可执行权限通过, PluginInfo 与单 ABI 包内容一致; 10 次忽略 SIGTERM 的取消/超时/输出超限均真实回收并删除工作目录. 两个测试包卸载后 UID 进程数为 0, 不从翻译桥推断原生执行. 见 [M5 原生 ARM64 报告](docs/compatibility/2026-09-10-m5-native-arm64-16k.json). (2026-09-10, G1/G2, 开发版, 非已发布 Release APK)
- [x] (测试/x86_64) 为不变的 `704cc156...3963e38` 大页 JSC 候选新增独立七模式有界压力套件, 通过实际插件 Binder 在 API 36 x86 4 KiB 与 16 KiB 用户空间页各跑两轮 (28/28). LLInt/Baseline/DFG/FTL 均有实际目标函数采样与独立算术对照, 另含 GC、Wasm 执行/增长和 64 个 worker 正常退出; 同一 APK 的原有 8 项 Binder 单独复测 32/32. ELF AT_PAGESZ/sysconf/getconf 一致, smaps 在两台 x86 AVD 都为 4 KiB, 明确 16 KiB 用户页为模拟模式而非 ARM64 硬件页. 早期工具失败完整保留, 测试包与 UID 进程清理完成, 仅关闭本轮两台 AVD. 见 [压力报告](docs/compatibility/2026-09-12-m5-x86-jsc-pressure.md); 不声称全 JIT/Wasm 路径、长时压力、性能或最终 Release 通过. (2026-09-12, G1/G2, 原字节与生产边界不变)
- [ ] (发布/arm64) 对最终拟发布的签名 APK 在原生 arm64 16 KiB 环境重复匹配范围的验收, 绑定该产物的安装后摘要及同 Release 源码资产; 不将开发版 Debug APK 通过归因给未测试的 Release 文件.
- [x] (环境/文档) 核查 x64 Windows 的 VMware/WSL 与 ARM64 16 KiB 路线, 形成 [环境选择指南](docs/compatibility/16k-arm64-test-environments.md). 本机 WSL 为 x86_64/4096-byte 页; 普通虚拟化不改变 CPU 架构, QEMU 全系统软件模拟另列证据. Samsung Remote Test Lab 官方提供 16 KiB 真机及 RDB/ADB; 最初的资料核查只确认候选路线, 不计为设备通过, 随后用户接入的 Samsung 真机已按上方独立条目归档实测结果. (2026-09-10, 环境资料核查; 设备 G2 见独立报告)
- [ ] (测试/发布) patched Bun 的两个 ABI 重复 ELF/ZIP/安装后 payload/真实执行四层门禁: 九补丁双 ABI 各两轮 ELF 已复现, 原独立 24/25 项应用探针及其失败历史保持原样. 现有完整 8 项实验插件 Binder 分批累计十二环境 192/192, 含 native ARM64 16 KiB 和新增 ARM64 API 32 / 4 KiB; 单独大页 JSC 候选已有双页大小 Binder 32/32、独立全量清洁构建一致性, 另有七模式压力 28/28 及同一 APK 的 Binder 32/32 复测. x86 16 KiB 是用户空间模拟页, 不替代 ARM64 硬件页. 原九补丁 x86 lock 不因此换字节, 官方 x86 页保护仍保留; 其余 syscall/FD/API、扩展长时压力/性能和最终签名 APK/source 发布仍未完成.
- [x] (发布) 官方 v0.2.0 三类 APK 已完成签名、ABI payload、CRC32 与 SHA-256 收集验证, 并由对应源码 manifest 和 GitHub digest 再次对照; Release notes 保留原生 16 KB 未完成的明确边界. (2026-09-08, G1/发布资产 G3)

**M5 验收条件:** 官方和 patched 发行线的每个拟支持 ABI, 各自在宣称支持前完成 ELF, APK ZIP, 安装后 payload 和原生 16 KB execution 四层验证; 翻译桥结果只作为单独标注的补充证据.

## M6: 多文件项目执行

**目标:** 从 "一次一个文件" 升级为 "一次一个项目": 脚本可以拆成多个文件并使用相对导入, 但项目内容仍以受控快照方式传入, 不开放任意宿主文件系统访问.

- [ ] (API) 定义有界, 版本化的 project snapshot archive contract, 包含路径规范化, 条目数/总大小, symlink, 重复路径, 权限和 traversal 拒绝规则.
- [ ] (插件) 在每次运行独有的私有 workspace 中原子展开项目, 支持相对 ESM import, JS/TS/JSON/asset 和 Unicode path.
- [ ] (API/插件/宿主) 定义 entry point, source map, arguments, 受控 environment 和 working directory 语义, 不接受任意 shell command.
- [ ] (插件) 为 process death, 取消, 超时和解压中断增加清理恢复, 永远只删除本次 job 的精确目录.
- [ ] (测试) 覆盖 nested import, 循环依赖, 非法 archive, 大小边界, 同名大小写路径, 损坏输入和进程重启.

**M6 验收条件:** 新旧 contract 通过 capability negotiation 共存; 旧宿主继续使用单源码 v1, 项目运行不会扩大到任意宿主文件系统访问.

## M7: AutoJs6 能力桥

**目标:** 让 Bun 脚本能够调用 AutoJs6 宿主的部分能力 -- 每项能力都要窄接口, 显式授权, 可版本协商, 可单独撤销; 绝不把宿主对象图整体暴露给脚本.

- [ ] (API/宿主) 为每项宿主能力设计窄接口, 权限模型, 版本和能力协商, 不把 Java object graph, Rhino globals 或 Android automation internals 直接暴露给 Bun.
- [ ] (API) 定义 Bun 到宿主调用的 cancellation, backpressure, 并发, 大小限制, 错误码和资源所有权.
- [ ] (插件/宿主) 先实现一个低风险, 只读, 可独立撤销的最小能力 (候选方向: 宿主版本与运行环境信息查询; 具体选型在接口设计评审后落锁), 端到端验证后再增加其他自动化接口.
- [ ] (测试) 覆盖插件/宿主版本错配, 权限拒绝, 宿主进程死亡, Binder backpressure, 超时和重连.
- [ ] (发布) 未实现的 Rhino/Node globals 始终明确报错, 不静默改变引擎或回退到其他运行时.

**M7 验收条件:** 每项能力都可单独协商, 授权, 测试和撤销; Bun 子进程隔离不被宣传为安全沙箱.

## M8: Bun 升级与可选 CLI 能力 (持续项)

**目标:** 持续跟踪上游 Bun 的新版本与相关修复, 让每次升级可审计, 可回退; 完整 Bun CLI (`bun install`, `bunx` 等) 只作为独立能力另行评估, 不随引擎自动扩大.

- [ ] (上游/构建) 定期只读检查稳定 Bun Android release, #30766, #39775, #39060 及后续替代实现; 发现更新只生成审阅信息, 不自动合并或发布.
- [ ] (构建) 每次升级同时核对 tag, 完整 commit, archive/binary SHA-256, Android API target, NDK, WebKit/JSC revision, 许可证, ELF 依赖与 syscall surface.
- [ ] (测试) 新版本先通过官方/patched runtime 差分和 API 28-35 矩阵, 再更新插件 variant, 共享 API 常量, README, changelog 和 lock.
- [ ] (API/产品) 只有在单源码引擎稳定后, 才单独评估 `bun install`, `bunx`, package cache, 网络, 磁盘, 可执行文件和 native addon 的权限与存储模型.
- [ ] (发布) 完整 Bun CLI 若实施, 必须作为独立 capability/variant 发布, 不得因为脚本引擎能执行 `fetch` 或 `spawn` 就默认宣称 CLI 兼容.

## M9: 文档与开发者体验 (持续项)

**目标:** 让用户不读源码也能明白插件能做什么, 怎么用, 出错了怎么办; 让贡献者能快速看懂验证体系.

**背景:** 用户反馈此前的 README 与 changelog 晦涩难懂. 本项目文档由 `.readme` 与 `.changelog` 的 JSON 文案源经 `.python/generate_markdown.py` 生成, 覆盖 10 种语言; 因此所有文案改进都必须落在源文件, 并通过生成器校验与单元测试.

- [x] (发布) 用平实语言重写 README 模板, 插件中心说明与 changelog 的全部 10 语言文案源, 重新生成 36 个文档产物并通过 `--check` 与 Python 单元测试; 术语, 数字与兼容声明和代码事实保持一致. (2026-09-02, G1)
- [x] (发布/测试) 扩充 `samples/` 示例库: 5 个带注释的示例覆盖引擎确认, `fetch` 网络请求, 私有工作目录文件读写, stdout/stderr 行为和 TypeScript 类型用法; 生成器门禁检查精确清单, 首行 `"bun";`, 注释, 相对导入和依赖安装命令, instrumentation 直接执行仓库中的原始示例资产并以设备本地 HTTP 端点验证 `fetch`, 10 语言 README 与 changelog 均已同步. Sony XQ-DQ72 API 33, Redmi 22120RN86C API 33 与 Xiaomi 23046RP50C API 35 arm64 真机均 5/5 通过, 证据见 `docs/compatibility/2026-09-02-m9-samples.json`. (2026-09-02, G1/G2)
- [x] (文档) 新增 [排错指南](docs/troubleshooting.md): 用最小脚本与 "症状 -> 原因 -> 处理" 表覆盖引擎识别、激活/权限、ABI/API/页大小、超时、输出超限、源码上限、npm/相对导入、AutoJs6 globals/Java bridge 及生命周期问题. 十语言 README FAQ 均有明确语言的入口, 与正式 API 33+ 和实验/Release 边界一致; generator 与 11 项 Python tests 通过. (2026-09-13, G0/G1)
- [x] (诊断/文档) 原压力控制流的两份新JSON仅加入索引, 保留原120报告hash/注册项和217矩阵行. 94输入APK、131保护文件、实际退出码与双UID原始清理绑定, 十语言更新记录同步. [新报告](docs/compatibility/2026-09-14-m5-jsc-pressure-flow.md)明确本批未重现历史低采样失败, 兼容性计数保持不变. (2026-09-14, G0/G1/G2)
- [x] (发布/测试) 新增 [自动生成的兼容证据矩阵](docs/compatibility/MATRIX.md) 与 [机器索引](docs/compatibility/matrix.generated.json): 完整登记 57 份历史 JSON, 生成 144 条设备/尝试记录, 按设备/API/执行 ABI/页大小/运行时摘要与各轮套件呈现结果. 官方、实验、shell、失败和初步诊断分别保留范围, 构建/补充记录不增加设备通过数; 不跨报告、APK、运行时或计数单位累加. 源文件 UTF-8/LF SHA-256、结构适配、轮次/摘要一致性和只读 `--check` 接入 Markdown CI, [维护说明](tools/compatibility/README.md) 与十语言 README/changelog 已同步. Python 专项负向/历史回归与标准构建验证通过; 历史报告及 native 字节未变, 没有新增设备验收. (2026-09-13, G0/G1)
- [x] (测试/文档) 为固定 25 项独立探针新增可重复归档工具, 对两轮原始 instrumentation 与 JSON、当前构建 receipt/源码、安装后 APK/runtime/helper 摘要及每轮/最终 UID 清理重新校验, 拒绝失败、混用 APK 与重复环境, 使用独占创建保留历史文件. 新增四组含负向变体的单元测试并接入 CI; 首次用于 API 29/32 的 100/100 报告. 这不是完整历史兼容矩阵生成器. (2026-09-12, G1/G2)
- [x] (插件/发布/测试) 完成 [运行错误与诊断审计](docs/compatibility/2026-09-13-m9-localized-errors.md): 17 个错误/帮助资源覆盖十语言, 10 个稳定错误码使用本地化摘要, 预热缓存保留事实并在返回时翻译, 16 KiB 诊断截断保留完整 Unicode 字符. 未激活/未启用与 Android 13 要求的帮助直接从同一组 `strings.xml` 生成到 README/插件说明, 明确绑定前宿主与系统安装门槛的归属. 两台 native ARM64 API 33/35 / 4 KiB 的原八项 Binder 两轮共 32/32; 独立语言回归含 240 个真实错误/finished 观察. x86 API 36 / 16 KiB 用户页 ABI 两轮确认十语言缓存拒绝, 不计作 Bun 执行成功. 三环境新增 JUnit 共 12/12, 包/六个 UID 与本轮 AVD 均清理. 原 native、AAR、历史报告和 Release 边界保持不变. (2026-09-13, G0/G1/G2)

- [x] (开发环境/文档) 完成有来源及摘要清单的旧 AVD 和 native 编译中间产物清理, 保留源码、各轮完整成品/符号/日志、JSC/ICU、工具链及原 APK/设备证据. [磁盘维护指南](docs/storage-maintenance.md)区分 WSL 内部空间、稀疏文件逻辑大小和宿主实际空间, 说明重建与离线压缩边界; 原历史报告保持不变. (2026-09-14, G0/G1)
- [x] (测试/文档) 独立重启诊断runner保存最终数字UID的完整ps与包清单, 归档器重新解析主/test两个UID; 实际四个UID均为0进程. [工具说明](tools/bun-runtime/experimental/webkit-x86_64-16k/restart/README.md)区分收集完成、门槛结果与受控缺席, 正/反向校验纳入CI; 两份新报告仅索引, 原114份报告和217矩阵行不变. (2026-09-14, G1/G2, 不改写旧清理证据范围)
- [x] (诊断/文档) PC映射固定对照的两份新JSON仅加入兼容索引, 原116份报告及217矩阵行原样保留. 90输入APK、18源码文件、实际构建退出码和双UID原始清理分别绑定; 用户已有平台插件1.8.0改动保留并同步当前十语言changelog. [新报告](docs/compatibility/2026-09-14-m5-jsc-pcmap.md)明确155个目标FTL帧不是DFG通过, 原套件/Release计数不变. (2026-09-14, G0/G1/G2)

**M9 验收条件:** 新用户只读 README 与示例即可完成首次运行; 常见失败在排错指南中有对应条目; 兼容矩阵与设备报告不脱节.

## 风险与回退

| 风险 | 早期信号 | 处理与回退 |
|---|---|---|
| OEM API 33 seccomp/SELinux 差异 | probe `SIGSYS`, `EACCES` 或无法从 `nativeLibraryDir` exec | 保留设备报告, 暂缓该 OEM 正式声明; 不得通过复制 executable 到可写目录绕过 |
| 16 KB 环境中 runtime 仅 metadata probe 成功 | `--version` / `--revision` 成功, 最小 JS probe 却 exit 134 | prewarm 必须执行最小 JS smoke probe; 按 ABI 归档失败, 不从 ELF/ZIP 对齐或翻译桥通过推断原生兼容 |
| 新 Bun syscall 在延迟路径触发 | Worker, spawn, watch, network 或 install 首次 exit 159 | 固定 syscall 与负载回归; 回到已验证 runtime, 不扩大能力声明 |
| 全局 SIGSYS handler 干扰 Bun 信号语义 | 用户信号丢失, watch/reload 或 child 异常 | 关闭实验发行线, 回退 API 33 官方 runtime; 修复需重新通过信号专项矩阵 |
| FD fallback 不等价 | 子进程继承 Binder/PFD 或私有文件描述符 | 视为安全阻断; 不得以性能或兼容为由发布 no-op fallback |
| 自建产物不可复现 | 相同输入得到无法解释的 ELF 差异 | 不更新 lock/二进制; 固定工具链, 时间戳和依赖后重建 |
| Android 8 需求扩大范围 | API 26/27 loader symbol 或 RELR 失败, 32 位设备需求 | 另建里程碑和产物, 不削弱 API 28+ 主线门禁 |

## 标准验证入口

静态, 文档与构建基线:

```powershell
node tools/bun-runtime/verify-runtime.mjs
node tools/bun-runtime/supervisor/verify-supervisor.mjs
node --test tools/bun-runtime/supervisor/supervisor-common.test.mjs
node tools/verify-api-artifacts.mjs
node tools/bun-runtime/experimental/api28/verify-experiment.mjs
node tools/bun-runtime/experimental/api28/build-experiment.mjs
node --test `
  tools/bun-runtime/experimental/api28/verify-experiment.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-bun-inputs.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-cargo-inputs.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-source-inputs.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-toolchain-inputs.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-host-package-inputs.test.mjs `
  tools/bun-runtime/experimental/api28/materialize-distribution-source.test.mjs `
  tools/bun-runtime/experimental/api28/build-host-image.test.mjs `
  tools/bun-runtime/experimental/api28/build-experiment.test.mjs `
  tools/bun-runtime/experimental/api28/run-locked-build.test.mjs `
  tools/bun-runtime/experimental/api28/verify-built-runtime.test.mjs `
  tools/bun-runtime/experimental/api28/verify-distribution-source.test.mjs
py .python/generate_markdown.py --check
py -B -m unittest discover -s .python -p "test_*.py"
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest
.\gradlew.bat :app:lintDebug
```

设备门禁必须通过显式 serial 或 CI AVD 运行, 并把设备信息与结果写入报告; 不得依赖当时恰好连接的第一台设备. Release 前另需运行签名产物收集, 三种 APK 清点, ABI/ZIP/ELF/摘要验证以及安装/升级/Binder smoke test.

## 边界与非目标

- 不把 Bun 描述为 Rhino/Node.js 兼容层, 也不为缺失的 AutoJs6 globals 提供隐式回退.
- 不把脚本子进程隔离描述为安全沙箱; 脚本仍以插件 UID 和插件权限执行, 只能运行受信任代码.
- 不承诺 32 位 ABI, 任意 native addon, 设备端 C/C++ 编译, 从应用可写目录执行二进制或完整 Bun CLI.
- 不为追求更低 Android 版本降低来源锁定, 许可证, FD 隔离, Binder 限额, 取消/清理或发布签名门禁.
- Android 8/8.1 及更低版本不属于 M1-M4; 如启动, 必须以独立原生构建, 独立兼容矩阵和明确的 64 位限制立项.

## 维护约定

- 完成条目时将 `[ ]` 改为 `[x]`, 补充精确落点, 验证日期和证据等级; 只完成代码但缺设备证据时更新说明, 不提前勾选发布条目.
- 兼容范围变化必须同步 `version.properties`, runtime lock, `AGENTS.md`, README 10 语言源, changelog 10 语言源, 生成产物, CI 和第三方声明.
- 修改官方或 patched runtime 时, 必须同步更新 variant, 共享 API 常量, 二进制哈希, 来源/补丁/工具链记录和许可证.
- Roadmap 条目可细化或重排, 但不得删除尚未解决的安全阻断, 测试缺口或失败设备记录来制造 "已完成" 状态.
