# Roadmap 状态日志归档 (2026-09-01 至 2026-09-14)

本文件原样保存 2026-09-14 路线调整前 `ROADMAP.md` 顶部逐批次累积的状态段落. 只做迁移, 不改写任何结论, 数字或证据链接; 为了让链接在 `docs/` 目录下继续可用, 仅把 `docs/` 前缀改为相对本目录. 当前方向与里程碑条目见 [ROADMAP.md](../ROADMAP.md), 逐批次交接见 [SESSION_HANDOFF.md](SESSION_HANDOFF.md).

---

本轮恢复入口: [会话交接](SESSION_HANDOFF.md). 历史十补丁 `1.4.0+a9c76a599` 的已有构建恢复取证及七环境原套件回归已完成: 双 ABI 各两份成品一致, 原驱动退出码缺失保留为 null. 五个本地 4 KiB 环境之后, Samsung SM-F936U API 32 / 原生 ARM64 / 4 KiB 和 SM-A566B API 36 / 原生 ARM64 / 16 KiB 也各过两轮 31 项与八项 Binder, 累计 434/434 探针、112/112 Binder. 两台三星同一 APK 批次、无失败/重试且已清理. [API 32 证据](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md) 和 [原生 16 KiB 证据](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md) 分别保留; 九补丁及原始 ART 失败历史不改写. 十补丁大页 JSC 已完成两次一致 clean Bun 构建 (actual exit 0), 新候选在 API 36 x86 4 KiB/16 KiB 用户空间页的原 Binder 32/32、原压力模式 28/28 均通过, 见 [独立报告](compatibility/2026-09-13-m5-ten-patch-jsc.md). M9 排错指南也已完成; 扩展矩阵与 Release 门槛仍开放.

更新日期: 2026-09-14

最新 [TLS/IPv6 固定矩阵](compatibility/2026-09-14-m4-runtime-network.md) 已完成首批诊断:
五环境各两轮, 20个TLS前缀模式通过, HTTPS ALPN十次失败, IPv6十次未进入.
锁定源码显示HTTPS私有TLS配置未转发ALPN; 四模式整体未通过, 修复与新字节验证待完成.
同一105输入APK批次、完整失败、十个UID与唯一owned AVD清理均已归档, 无重试或原生重建.

此前[原压力控制流固定观察](compatibility/2026-09-14-m5-jsc-pressure-flow.md)已完成:
一对94输入APK保留原七模式顺序, DFG早停/原断言和全部预算; 双页各两轮28模式正常退出.
四次DFG均在首profile后停止, 样本18/10/82/93, 共392trace与8份完整首栈, 无重试.
原2<3未复现, 历史根因/稳定性仍开放. 原120报告/217行不变, 两份新JSON仅索引.

此前[完整 trace/inliner 固定诊断](compatibility/2026-09-14-m5-jsc-trace.md)已完成:
新工具、20 份源码绑定与同一 92 输入 APK 的双页大小两轮采集, 共 8 进程/32 profile,
65 份完整栈. 四份 FTL 见证明示目标语义帧属于同栈 invoke 机器帧, 与编译 hash 匹配.
关闭组一段 5030 次调用/64 trace 无目标帧, 开启组 90 个目标 FTL 与三次真实 exit1 保留.
该进展确立保存样本的机器帧身份, 原 2<3 历史根因和稳定性仍开放; 原 118 报告/217 行不变.

此前[固定PC映射关闭/开启对照](compatibility/2026-09-14-m5-jsc-pcmap.md)已完成:
同一90输入APK复用原JS/native, 双页大小各两轮固定反转顺序, 收集8进程/32profile及
8份JSC最终选项. 开启组155个目标FTL帧及两次真实exit1按原DFG门槛保留;
关闭组12个调用者FTL帧与目标DFG混合, 未复现整段目标归零.
18文件源码与实际内联决定支持映射/机器tier解释, 缺少逐trace PC/map指针,
原2<3根因与稳定性仍开放. 原116报告/217矩阵行不变, 新两份仅索引.

此前独立[四段 profiler 诊断](compatibility/2026-09-14-m5-jsc-restart.md)已完成:
双页大小各两轮固定双模式, 8次进程诊断/32次profile, 阶段与时间区间全部符合重启/清空预期,
四次目标缺席均完整保留实际exit1. 4KiB第二轮第四段目标仍调用9766次却没有目标帧,
同时出现125个调用者FTL帧; [固定源码补充](diagnostics/2026-09-14-jsc-restart-ftl-source-review.md)
收敛到内联与PC映射的待验证条件, 尚未捕获实际内联/映射状态或确定历史2<3根因.
原夹具/预算/native不变, 诊断不增加原套件成绩. 两包/四UID原始清理记录与两owned AVD收尾已保存.

开发环境已完成一次有清单的磁盘维护: 退役四台历史专用 AVD, E 盘实际增加约11.55GiB;
23个Bun独立构建目录的缓存/目标文件在WSL内部释放约133.04GiB, 完整成品/符号/日志保留.
用户已完成VHDX离线压缩和旧Gradle备份删除; 压缩receipt实际exit0, VHDX缩小139881086976 bytes,
约130.27GiB. 这与WSL内部释放量分别记录, 没有待执行手动清理.
[维护指南](storage-maintenance.md)与[当前交接](SESSION_HANDOFF.md)记录保留范围和完成证据.
另完成[固定JSC采样源码审阅](diagnostics/2026-09-14-jsc-sampling-source-review.md),
未新增设备成绩或关闭DFG/watch根因门禁.

十三补丁大页 JSC 已另行完成两次全新 clean Bun 构建, actual exit 0/0,
21 项输入未漂移, 两份完整成品 `17c7941a...20e98a8` 一致且 ELF 审计通过.
原 JSC 库/config 和 ICU 精确复用, 新 WebKit/ICU 构建为零. 同一85输入新APK
已在x86 API36双页大小各两轮通过原Binder32/32、原压力28/28; 初次16KiB压力采样不足失败另档, 同APK完整复测通过;
两包UID与两个自有AVD已清理. [完整报告](compatibility/2026-09-14-m5-thirteen-patch-jsc.md). API28/API31 原生 ARM64 的固定 watch plain/traced
诊断也已完成: 16 次观察、32 次重载、24 次直接普通 SIGSYS, 包和 UID 清理通过.
未复现原 SIGABRT, 因而原始 EAGAIN 原因与稳定性仍开放, baseline 560/128 不增加.
[JSC 构建](compatibility/2026-09-13-m5-thirteen-patch-jsc-builds.json),
[watch 诊断范围](compatibility/2026-09-13-m3-watch-reload-trace.md).

十三补丁的两项三星固定套件门禁已补齐: SM-F936U 实际 API 32 / 原生 ARM64 / 4 KiB,
SM-A566B API 36 / 原生 ARM64 / 硬件 16 KiB, 均 bridge=0. 相同三个 APK 各过
两轮 35 项与原八项 Binder, 新增 140/140 和 32/32, 无失败/重试或构建.
八个原生环境现累计 560/560 probes、128/128 Binder; 新增 16 次实际 watch 重载
和 24 个镜像观测均通过. 两台设备的三包/三个 UID 与自有私有 ADB 已清理.
[三星完整报告](compatibility/2026-09-13-m3-watch-reload-samsung.md).

当前第 13 补丁已修复 Linux reload 前忽略 CLOEXEC 失败的路径, 保留既有 stdio/IPC/信号语义.
完整源码 GCC/Clang 各 25 个模式和确定性重放通过, 两次全新双 ABI 构建实际 exit0且每ABI字节一致, 四份ELF审计通过.
原 35 项和 17 份 fixture/validator/Java 输入未变, 新 APK 的 32/83 输入匹配 `bf5cb72`.
六个原生 4 KiB 环境各两轮探针 420/420、完整 Binder 96/96; 48 次实际重载无哨兵继承,
72 个镜像的 PID/stdio/普通 SIGSYS 对照通过. 首次 API28 中止 69/70 独立保留,
中止前 clone EAGAIN 的根因未定, 仅一次同 APK 重试通过. 随后的三星门禁见上文;
随后大页 JSC 构建/双页大小回归及 watch 独立观察见上文; 原API28中止根因与更广稳定性仍开放.
见 [修复与验证](compatibility/2026-09-13-m3-watch-reload-fix.md).

此前十二补丁 M3 watch/reload 阻断已完成复现与归档, 该历史 native 未修复. 原 33 项保留,
新增 native/TRAP 两模式形成 35 项套件. 四个 ARM64 / 4 KiB 真机环境各两轮,
原 33 项通过 264/264, 新模式 2/16 通过、14/16 失败, 全体 266/280.
32 次实际重载中有 28 次 FD256 泄漏; Sony API33 / kernel5.15 的原生控制通过,
同设备强制 TRAP 失败. 每次 SIGSYS/stdio 对照正常, 显式 CLOEXEC FD257 均关闭.
三个 APK 批次和先期校验器修正独立绑定, 四包/四 UID 已清理, 无 native build 或 AVD 操作.
优先补齐重载前 CLOEXEC 的后备处理及错误传播, 再做新源码构建和固定夹具回归.
见 [失败与源码定位](compatibility/2026-09-13-m3-watch-reload.md). 既有 baseline
462/462 probes、112/112 Binder 及独立 JSC 结果不改写, distributionReady=false.

最新十二补丁三星 API 32 门禁也已完成: SM-F936U / native ARM64 / 4 KiB,
两轮原 33 项 66/66, 完整八项 Binder 16/16, 无测试失败或重试. 与上一台三星 API 36
使用完全相同的三个 APK, 四十个 pending 保持检查点与十二个 child 观测通过.
两台三星设备门禁补齐, baseline 七个原生环境累计 462/462 probes, 112/112 Binder.
三包/三个 UID 及本轮私有 ADB 清理完成, 无 AVD 操作.
见 [API 32 完整报告](compatibility/2026-09-13-m3-pending-wait-native-arm64-api32.md).

最新三星十二补丁 baseline 回归已完成: SM-A566B / API 36 / native ARM64 / 硬件 16 KiB
两轮原 33 项通过 66/66, 完整八项 Binder 通过 16/16. 四个 pending 模式的 40 个保持
检查点和十二个 child 观测通过; 原 APK/native 直接复用, 无测试失败或重试.
三个包/三个 UID 与本轮私有 ADB server 已清理, 无 AVD 操作.
该批次当时累计六个原生环境 396/396 probes 和 96/96 Binder; 后续 API 32 及当前累计见上文.
见 [硬件 16 KiB 报告](compatibility/2026-09-13-m3-pending-wait-native-arm64-api36.md).

最新十二补丁 JSC rebase 已完成两份新 Bun 一致构建, 实际 driver exit 0/0. 同一新 APK 的
83 输入绑定 `0210e82`, 在 x86 API 36 的 4 KiB/16 KiB 用户页各过两轮原八项 Binder 和
七模式压力, 分别 32/32 与 28/28. 初次 16 KiB lowmemorykiller 服务终止独立保留, 完整
同 APK 重试通过; 两个 UID 和本轮两个 AVD 清理完成. [完整结果](compatibility/2026-09-13-m5-twelve-patch-jsc.md).
16 KiB x86 仍是 4 KiB 内核上的用户页 ABI 模拟. 十二补丁 baseline 三星 API 32 与 API 36 硬件页证据见上文, 各批次独立归档.

最新第 12 补丁 `06e518f73` 保留 Android epoll 等待期间的完整 caller mask/pending 信号,
并在调用点维持 Android 已有的 epoll_pwait2 禁用. GCC/Clang 各 45 个有界主机执行、完整重放和
28 source blobs 已通过. 两份全新双 ABI 构建均实际 exit 0, 每 ABI 两份成品一致且四份 ELF 审计通过.
新 33 项在五个原生 4 KiB 环境两轮通过 330/330, 完整八项 Binder 通过 80/80. API 28 两次 ART 启动失败独立保留, 第三次同 APK 两轮通过. 加上随后两台三星独立批次, 当前累计为 462/462 probes 和 112/112 Binder, 已补齐原套件的三星 API 32/原生硬件 16 KiB 门禁.
见 [wait 修复报告](compatibility/2026-09-13-m3-pending-wait-fix.md) 与 [新构建证据](compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json). runtimeProduced=true, distributionReady=false.

此前 M3 pending-SIGSYS 阻断已有第 11 补丁源码修复, 双 ABI 各两次独立构建一致且实际退出码均为 0; 完整 ELF 审计通过, 但 Sony API 28/31 各两轮仍为 31/33. 即时 spawn 已保留 pending, 后续 epoll wait 临时传入空 mask 导致早交付; 八次只读寄存器/掩码观测已确认, 见 [新阻断](compatibility/2026-09-13-m3-pending-wait.md).
历史 head `946f082ab` 完整重放和 GCC/Clang 主机回归通过; 见 [此前修复报告](compatibility/2026-09-13-m3-pending-mask-fix.md).
历史回归保留原 31 项, 新增 native/TRAP 两模式:
原生 ARM64 API 28/31 各两轮均为 31/33, 原 31 项合计 124/124, 新模式 0/8.
独立 plain/ptrace 对照捕获八次 SI_TKILL 在 spawn 父线程提前交付, 对应源码临时 mask
移除 SIGSYS 的路径. 这是受控 exit 1, 不是此前 pidfd SIGSYS 崩溃. [失败与诊断](compatibility/2026-09-13-m3-pending-sigsys.md)
已独立归档; 该历史批次当时尚未验收新成品. 当前十二补丁结果独立见上文, distributionReady=false, 不转移旧成绩.
此前 [M3-B 启动检查/缓存重试](compatibility/2026-09-13-m3-probe-lifecycle.md) 已完成并保持原验收范围.

一句话概括方向: 插件从 "单个脚本文件的独立 Bun 引擎" (已完成) 出发, 依次走向 "Android 13 正式基线" (v0.2.0 已发布, 开发版已修复强制终止), "Android 9 至 12L 实验支持" (九补丁原 25 项探针已有六环境证据; 相同 29 项套件在七个原生环境累计通过 406/406, 含六个 4 KiB 环境及 Samsung ARM64 16 KiB, 四种硬 FD 上限模式均已有大页证据; 现有完整 8 项插件 Binder 分批累计十二原生环境 192/192, 含三星 ARM64 16 KiB, 已补齐 API 28-32 x86 版本覆盖), 以及更远的 "多文件项目执行" 与 "受控的 AutoJs6 能力桥" (未开始). 历史九补丁大页 JSC 候选已通过 x86_64 双页大小 Binder 32/32, 并新增有界七模式压力 28/28; x86 的 16 KiB 用户空间页为模拟模式, 与 ARM64 硬件页、官方发行线及最终 Release 验收分开.

历史阻断: 九补丁的 31 项套件曾在四个 4 KiB 环境通过 248/248, Sony API 28 两轮只有 29/31, 四次 exit 159. 后续独立观察器已直接捕获 pidfd_open (434) 的 SIGSYS; 十补丁的修复和新本地成绩见上文. 原失败和当时的源码假设说明保留于 [历史报告](compatibility/2026-09-13-m3-blocked-async.md), 不把旧 406/406 转成新模式的成功证据.
