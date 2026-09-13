# M3: 十一补丁保留 spawn 阶段 pending 信号, 异步等待仍提前交付

2026-09-13. 本轮恢复中断会话, 完成 [第 11 补丁](2026-09-13-m3-pending-mask-fix.md) 的
两次独立双 ABI 构建与四份 ELF 审计后, 以项目 `b984684` 制作新测试 APK.
**33 项应用门禁仍未通过.** 构建可复现与完整异步语义分别记录, 不因前者通过而接受后者.
官方 API 33+、生产 payload/service/AAR、历史证据与 `distributionReady=false` 均不变.

## 同一固定探针, 失败位置后移

新 Bun revision `1.4.0+946f082ab`, ARM64 SHA-256
`5ea6914e5fd2bf16cd2ee4e87036df2cabf47804983cf3ce9942da602c0cc0e7`.
新 ARM64 probe APK SHA-256
`c2bd3edad1271ead61516659348c04de8961f2ae95f354eef8de30ba06a1c83e`, 绑定 30 个输入.
原 33 定义仅改 expected revision, 15 个已有 fixture/validator/Java 输入及完整 probe-common 字节未改.

| 原生环境 | 页大小 | 两轮原 31 项 | 两个 pending 模式 | 完整套件 |
| --- | ---: | ---: | ---: | ---: |
| Sony G8441, API 28, ARM64 | 4096 | 62/62 | 0/4 | 62/66 |
| Sony XQ-AT72, API 31, ARM64 | 4096 | 62/62 | 0/4 | 62/66 |

四轮共 124/132, 两个新模式共 0/8. 每次都是受控 exit 1, 无超时、崩溃或缺失语义记录.
旧十补丁在 spawn 返回时记录 `[[1,0],[1,0],[0,0]]`; 第一列表示 SIGSYS pending 位,
第二列表示 JS listener 已交付数. 十一补丁变为 `[[1,0],[1,0],[1,0],[0,1]]`:
第一次 spawn 立即返回时仍 pending, 在等待该子进程的输出/退出之后才消失并已交付给 JS.
仍在同一主线程, 返回用户代码后屏蔽 mask 恢复为原先 blocked 状态.

[新失败归档](2026-09-13-m3-pending-wait-failure.json) 完整保留失败计数、原始 instrumentation、
APK/native/source 绑定及清理. 新验证器精确限定此十一补丁 APK receipt 和等待阶段失败形状;
旧十补丁失败验证器和 JSON 保持原样, 两种失败不能互换, 也不能进入成功归档.

## 独立只读动态诊断

观察器新增 `PTRACE_GETREGSET` 以及仅在 epoll wait 寄存器上下文下的一字长 `PTRACE_PEEKDATA`.
ARM64 读取 x8 syscall 寄存器与 x4 mask 指针; 原生 Linux x86_64 主机对照读取 orig_rax/r8.
只在观察器自己拥有且已停下的子进程读取, 不进行 syscall stepping, 不修改寄存器、mask 或返回值,
继续将包括致命信号在内的 SIGSYS 原样转交. 原 12 秒、256 event、32 signal、输出及 supervisor 预算不变.

NDK 29 的两次小型 observer 编译产物完全一致, 不是 Bun/JSC 重建. 新 trace APK SHA-256
`3b5c6fbae2d7b3384a059f538712ae61eba383cf812568832af7fee47af8b2cd`, 绑定 35 个输入.
两台 Sony 各两轮 native/TRAP plain/traced, 共八次普通执行和八次追踪执行, 全部复现同一受控失败.
八个追踪记录逐项满足:

- SIGSYS 来自 `SI_TKILL=-6`, sender PID/UID 与 spawning main thread 精确匹配.
- 子进程的 `close_range` syscall 436 TRAP 发生在主线程 user signal 之前.
- user signal stop 时 x8 为 ARM64 `epoll_pwait` 的 22, x4 非零, 指向的实际 8 字节 mask 为全零.
- 普通执行与追踪执行的语义失败、退出码一致; final observer 记录、子进程回收和 UID 清理完整.

[独立诊断归档](2026-09-13-m3-pending-wait-diagnosis.json) 绑定原始输出和上述寄存器/内存读取.
完整十一补丁源码 `packages/bun-usockets/src/eventing/epoll_kqueue.c:126` 的 `bun_epoll_pwait2`
调用 `sigemptyset`, 并在高版本原始 wait 和旧 `epoll_pwait` 两条路径都传入这个空 mask.
这解释了等待期间暂时解除屏蔽、返回时 mask 看似未变而 pending 已被交付的现象.
本次没有采集 PC/调用栈, 也没有动态验收 `epoll_pwait2` 的首次高层可达性; 后者的可选 syscall
在调用者屏蔽 SIGSYS 时是否安全, 需要在后续修复中一并审查, 不能仅更换 fallback 的参数.

## 清理与后续

Probe UID 10759/15124、trace UID 10760/15125 均卸载后清零. 两套运行器均清理精确私有目录,
没有动用生产安装包. 新 Binder APK 已成功构建并通过 16 KiB ZIP gate, 但此阻断之后尚未运行 Binder,
因此本轮没有新 Binder 或三星兼容通过数. 旧 434/434、112/112 和 JSC 成绩保持各自来源.

Linux observer 对照新增真实 pending-user-signal/epoll 情形, 与原 handled/fatal seccomp 和
handled/fatal user signal 四个场景一起通过, plain/traced 结果一致. 这是观察器行为验证,
不是对 Bun 的等待修复验收. 下一步修复 Android wait 的 caller mask 生命周期、审查可选新 wait syscall,
再做固定主机对照、全新双 ABI 独立构建和原 33 项回归. 不改变 fixture、提前清 pending、预热缓存或放宽断言.

本轮专用 API 33 AVD `bun-hard-limit-api33-20260912` / 5584 在核对精确名称与归属后关闭,
其 serial 已消失; 未在其运行套件, 未控制其他 AVD 或推断无关库存变化. 三星 10 分钟窗口内
localhost:50781 一直不可用/offline, 没有三星安装或新证据.

最终 Node 228/228、Python 38/38、十语言/36 生成产物和兼容矩阵检查通过; 新矩阵为 73 份/168 行,
保持失败与诊断范围. 文档更新后的生产 Gradle 同四任务再次 BUILD SUCCESSFUL (28s, 96 tasks),
JVM 单元任务沿用已有 21 项. 初次在 WSL 本机运行 observer host 检查因没有 cc 而未编译,
随后使用已有固定工具镜像通过五个 plain/traced 对照; 没有修复缓存或安装编译器.
