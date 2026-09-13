# 会话交接: 第十二补丁独立构建完成, 新设备门禁待运行

2026-09-13 (Asia/Shanghai). 从干净 master `86200f1` 继续.
完整阅读 `AGENTS.md`、本文件与 `E:/.codex-tmp/pending-wait-fix-20260913/SESSION_HANDOFF.local.md`.
本机 `AFTER_BUILDS.md` 的构建收集/晋升步骤已经完成, 不要重复执行或重启 native 构建.

- 新 head `06e518f73b4fccc6c3ffb17412ea166bf886bed0`, tree `1eb8d5ea945001f018bdf14bd00c261d40b02573`.
- Patch 12 只修改 epoll_kqueue.c: Android wait 使用 NULL mask, 调用点维持已有 epoll_pwait2 禁用.
  不清 pending、不临时放开 SIGSYS、不预热 waiter; 非 Android 策略和 timeout/EINTR 不变.
- GCC 13/Clang 21 各 45 次有界执行通过; 十二补丁完整重放、五补丁 prefix 等价和 28 blobs 通过.
- 全量 Node 229/229、Python 38/38、Markdown 10 语言/36 产物和 matrix 74 报告/168 行通过.
  production 四项 Gradle 验证实际 exit 0; IDE 工具 timeout 原样保留, 对应后台命令成功另记.
- **两份全新 native 构建已结束, 不重复启动.** 本机 driver-run-1/2.json 均为 actual exit 0;
  clean head/tree、16 配方、完整日志和最终 Ninja 边已核对. 两个 ABI 各两份成品一致, 四份 ELF 通过.
  新导出位于 WSL `pending-wait-evidence/run-{1,2}`, current runtime-evidence 和 source binding 已晋升.
  原上游 WebKit/JSC/ICU 复用, 没有新库构建. runtimeProduced=true/distributionReady=false.
- 新设备门禁仍待运行, 不转移旧源码通过或失败数. 本轮尚无 APK/设备操作或 owned AVD.
  完成源码/构建提交后运行本机 build-device-apks.py probe/binder, 然后 run-device.py.
  Sony API 28/31 优先, 全部 33 定义、15 源输入、完整 validator/预算和八项 Binder 保持原样.
- 三星当前无等待窗口; APK 就绪后按 SM-F936U API 32/4 KiB 与 SM-A566B API 36/native 16 KiB
  请求新 10 分钟 localhost:50781 接入, 同时继续本地独立工作. 所有事实仍需现场测量.
- 只读库存中其他任务的 emulator-5568 后来不再在线; 本轮未控制它, 不推断消失原因.
  本轮未 push、Release、委派 agent、读取签名秘密或修复缓存.

[修复报告](compatibility/2026-09-13-m3-pending-wait-fix.md) 与
[新构建证据](compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json). 后续设备状态须更新本节和本机记录.

## 此前完成的十一补丁构建与 wait 阻断

# 会话交接: 十一补丁独立构建完成, 新 epoll wait 阻断已复现并动态定位

更新: 2026-09-13 (Asia/Shanghai). 从干净 `86b18b5` 继续.
完整阅读 `AGENTS.md`、本文件及 `E:/.codex-tmp/pending-mask-20260913/SESSION_HANDOFF.local.md`.
本机 `PROMOTION_NEXT.md` 是原先待办, 以本记录与追加状态为准.
[spawn 修复/构建报告](compatibility/2026-09-13-m3-pending-mask-fix.md) 与
[构建证据](compatibility/2026-09-13-m2-pending-mask-runtime-evidence.json) 已提交于 `b984684`.
**新 33 项 Android 门禁仍失败**, 见 [wait 阶段报告](compatibility/2026-09-13-m3-pending-wait.md)、
[失败归档](compatibility/2026-09-13-m3-pending-wait-failure.json) 与
[独立动态诊断](compatibility/2026-09-13-m3-pending-wait-diagnosis.json).

- 新 11 补丁 head `946f082ab8ede2b7cbd6ba9fddb90463a94f0330`, tree `73476190d9341d338a96c8a9793db947ea415d15`.
  Android 父线程追加阻塞并保留 pending SIGSYS, 仅子路径安装 setup mask;
  blocked caller 的 cgroup 使用已有 child join, 不设置 clone3 全局不可用状态.
- 完整重放/28 原 blob 通过; GCC 13 与 Clang 21 各过 14 新源码场景和两个旧失败对照.
  新编译告警排除只适配上游 `{ 0 }`, 不改行为断言. 历史 pending 失败/trace 归档保持原样.
- **两次独立 native 构建已结束, 不要重复启动.** WSL `pending-mask-run-1` / `pending-mask-run-2`
  各构建双 ABI, 两个实际 driver exit 均为 0, 每 ABI 两份成品一致. 完整日志、16 配方、
  clean head/tree 与最终 Ninja edges 已核对; 新 schema-3 收集和四份 ELF 审计均实际 exit 0.
  原十补丁 schema-2 的退出码缺失继续保持 null, 不与本次记录混用.
- 新导出在 WSL `pending-mask-evidence/run-{1,2}`; current runtime-evidence 和对应源码绑定已晋升,
  runtimeProduced=true / distributionReady=false. 原上游 WebKit/JSC/ICU 复用, 没有新库构建.
- 15 个 fixture/validator/Java 源码、完整 probe-common 校验器和原 33 定义按旧归档保护;
  仅 expected revision 改为 `1.4.0+946f082ab`. 同一新 ARM64 probe APK 在 Sony API 28/31
  各两轮 31/33: 原 31 项 124/124, pending 模式 0/8. 即时 spawn 保留信号, await 后提前交付.
  `[[1,0],[1,0],[1,0],[0,1]]` 与历史十补丁 `[[1,0],[1,0],[0,0]]` 不同, 原始失败分别保留.
- 新 observer 在自己拥有的 signal-stop tracee 只读 GETREGSET, 仅 epoll wait 上下文读一个 mask word;
  原样转交 SIGSYS, 不改寄存器、mask 或 syscall. 两台各两轮 native/TRAP plain/traced, 八次只读观察
  全部捕获 child close_range 之后的主线程 SI_TKILL, ARM64 x8=22, x4 指向实际零 mask.
  `packages/bun-usockets/src/eventing/epoll_kqueue.c:126` 给两种 wait API 传入空 mask 与此吻合.
  未采集调用栈/PC, 不算 epoll_pwait2 首次可达性或兼容通过.
- 两套新 probe APK、Binder 主/测试 APK 已构建; 因首个应用门禁失败, Binder 未运行,
  其余设备不增加本轮通过数. Probe UID 10759/15124、trace UID 10760/15125 全部卸载清零.
  仅启动/关闭 owned API 33 AVD `bun-hard-limit-api33-20260912` / 5584, 未在其运行套件.
  最终其 serial 消失; 未控制其他 AVD, 不推断无关库存变化原因.
- 三星窗口约 15:52:40-16:02:40 local, 多次轮询 localhost:50781 始终 offline/不可用;
  没有三星安装/测试, 当前无待用设备. 旧 434/434、112/112 和 JSC 均保持原范围.
- 十语言 changelog 与生成产物已更新. 标准生产 Gradle 四项检查实际 exit 0 (8m13s, 96 tasks);
  单元测试任务沿用已有 21 项, lint 0 errors/44 warnings, 三个 Debug APK 字节/16 KiB ZIP 对齐通过.
  IDE build 调用一次, 工具 60 秒超时保留; 精确匹配的 Gradle command 随后成功
  (2m3s, 6 tasks up-to-date), 原始工具返回值保持不变.
- 最新完整 Node 228/228、Python 38/38、生成器/矩阵检查通过. 矩阵为 73 份/168 行,
  新两条失败行与两条诊断行没有增加完整套件通过. 观察器 Linux plain/traced 五场景通过;
  首次 WSL 本机因缺 cc 未能编译, 改用已存在的固定工具镜像完成, 未安装/修复环境.
  新生成文档后生产 Gradle 同四任务再次实际 exit 0 (28s, 96 tasks), JVM 21 项仍为 up-to-date.
- **下一步**: 修复 Android wait 的 caller mask 生命周期并审查 blocked SIGSYS 下可选新 wait syscall.
  不能只改 fallback 参数而遗漏原始 epoll_pwait2 的可选探测风险; 做固定源码主机对照后再全新双构建,
  保留本轮十一补丁 source/build/failure 全部记录. 第 12 补丁尚未创建, 没有新 native 构建运行.
  不提前清 pending、不预热 waiter、不放宽原 33 项断言. 未 push、Release、委派 agent 或修复缓存.

## 此前: M3 pending SIGSYS 新阻断已复现并完成动态诊断

更新: 2026-09-13 (Asia/Shanghai). 从干净 `57679d1` 继续, 本轮完成两个固定 pending
探针及独立观察器诊断. **兼容门禁失败, runtime 尚未修复.** 继续前读完整 `AGENTS.md`、
本文件及 `E:/.codex-tmp/pending-sigsys-20260913/SESSION_HANDOFF.local.md`.
[完整报告](compatibility/2026-09-13-m3-pending-sigsys.md)、
[失败](compatibility/2026-09-13-m3-pending-sigsys-failure.json) 与
[诊断](compatibility/2026-09-13-m3-pending-sigsys-diagnosis.json) 分开保存.

- 33-probe 套件保留原 31 定义、六个旧 fixture、五个独立 validator 及 FD validator 函数.
  新增 native/TRAP pending 模式, 只给两个新 asset 12 KiB cap; 原预算/recovery-last 不变.
- Sony G8441 API 28 与 Sony XQ-AT72 API 31 (原生 ARM64 / 4096) 使用同一 APK,
  各两轮 31/33. 原 31 项 124/124, 新模式 0/8; 每次都是第一次 spawn 返回后 pending
  位消失, mask 检查通过但 JS 尚未收到信号. 受控 exit 1, 不是 SIGSYS 崩溃或超时.
- 独立 observer 新增 fixed `pending-async` profile, 区分 SYS_SECCOMP 与 SI_TKILL 的
  siginfo union 字段. 两设备各两轮 native/TRAP plain/traced, 共 16 次复现;
  八次追踪均捕获主线程 SI_TKILL, sender PID/UID 精确匹配且先于 child close_range.
  不改变寄存器、mask、syscall 结果或信号交付. 没有抓取 rt_sigprocmask 参数或调用栈.
- 精确十补丁 `bun-spawn.cpp:253` 在父线程 vfork 前临时从 mask 移除 SIGSYS,
  与早交付吻合. Patch 10 的 pidfd shim 保证不能扩大为整个 spawn 的 pending 保持.
  下一步先修复父/子 mask 生命周期, 同时审查 parent clone3/cgroup; 新源码单独构建和验收.
  不预热 pidfd、不提前清 pending、不放宽新失败断言或覆盖原报告.
- Probe APK 绑定 30 输入, observer APK 绑定 35 输入; 两次固定 NDK 编译仅构建小 observer,
  不是 Bun/WebKit. 全部 native/source locks、生产 service/AAR、官方 API 33+、distributionReady=false 不变.
- 两台 probe UID 10757/15122、trace UID 10758/15123 均卸载清零; 私有目录全部清理.
  仅启动/关闭 owned AVD 5584, 未在其运行套件. 精确名称与 serial 消失记录已保存;
  其他 AVD 无控制命令, 不推断初末无关库存变化原因. 无三星窗口、push 或 Release.
- 新 archiver 仅接收精确失败与动态证据. 旧 31 项失败工具拒绝扩展套件, 防止复用旧计数.
  原 68 份 JSON 保持不变, 新矩阵 70 份/164 条. 新回归不增加历史 434/434、112/112,
  没有新 Binder、x86 执行、三星/16 KiB、watch/reload 或 Release 通过结论.
- 最终 Node 204/204、Python 37/37, Markdown 与矩阵生成检查通过. 生产四项 Gradle
  2m 31s 成功 (48 executed / 48 up-to-date); JVM 原 21 项结果有效, 本轮任务为
  UP-TO-DATE, 不声称重新执行. lint 0 errors/44 warnings, 三种 Debug APK 摘要/16 KiB ZIP
  校验通过. observer Linux host 四模式/eight plain-traced executions 通过.
  IDE 补充 build 的 60 秒调用超时, 仅返回 SDK XML 版本警告; 原始返回留在本机,
  不将超时当成功, 也未修复缓存或重复启动 native 构建. 后续状态见本机交接.

## 此前: M3-B 启动检查诊断与重试生命周期完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `4195101` 继续, 完成 M3-B 的
runtime probe 诊断和失败缓存/重试两个小节. 继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/probe-lifecycle-20260913/SESSION_HANDOFF.local.md`.
[完整报告](compatibility/2026-09-13-m3-probe-lifecycle.md) 和
[构建/运行/归档工具](../tools/diagnostics/PROBES.md) 是新入口.

- 生产检查现在持续读取 stdout/stderr, 每流 4 KiB; 使用原监督器有界终止/回收.
  保留本地化摘要并补充 API/ABI/阶段/identity/退出与重试事实, signal 只按退出惯例推断.
  不增加协议 key、AAR 或 native 改动, 不收集普通 Binder fingerprint 或用户源码.
- 成功和固定完整性/版本/页大小失败缓存至服务重建; 已完成清理的临时失败在完成后
  冷却 30 秒, 后续请求触发一次重试, 并发共享检查. 无后台重试, 未回收/未排空则禁止重试.
- 两个独立 Debug APK 批次复用原官方/十补丁成品. ARM64 官方 API 33/35 与实验
  API 28/31, 加实验 x86 API 33 (均原生 4 KiB), 两轮原八项 Binder 共 80/80,
  新三项 probe 共 30/30. 注入故障与虚拟冷却时钟明确是测试条件, 不当作自然设备故障.
  官方两台另通过语言 JUnit 8/8, 含 240 个错误/finished 观察.
- 官方 x86 API 36 / 16384 用户页的资源/缓存拒绝两轮 4/4; shell 内核映射仍 4096,
  Bun 在执行前被拒绝. 用同一官方 APK 的 receipt 格式适配, 没有重编或重打包.
- 两次首次失败分别保留: API 28 第二轮测试开始前 owned ART/ADB-JDWP SIGSEGV;
  16 KiB AVD 第八个语言后 `lowmemorykiller` 杀服务导致 DeadObjectException.
  两者原 APK/断言/设置/预算均不变, 新目录重试通过, 原失败不计入成功数.
- 所有安装尝试的两个包/UID 都清理. 仅关闭本轮 5584 与 5582 两台 AVD,
  精确名称核对及最终 serial 消失已记录; 原有 5554/5560 未操作. 无三星窗口.
- JVM 21/21 (新增 11 项)、Node 193/193、Python 37/37, Markdown 与兼容矩阵检查通过;
  矩阵登记 68 份 JSON / 160 条记录, 原 60 份报告未改. 生产四项 Gradle 17 秒成功,
  lint 0 errors/44 warnings, IDE build 成功. 没有 native build、缓存修复、push 或 Release.

实测 APK 在本机 `official-apks`、`experimental-apks`、`refusal-apks`, 归档后才生成当前
changelog, 不要用后续生产输出替换它们或放宽旧输入检查. 原 31-probe 没有重跑,
历史十补丁 434/434、112/112 与 JSC/Samsung 结果不自动重验到本轮服务.
下一步可继续 M3 syscall/FD/线程/watch 边界、M8 上游只读审阅等未完成小节.
更广矩阵/压力/签名 Release 仍开放. 官方 API 33+ 与 distributionReady=false 不变;
如需三星, 仍按下方 10 分钟/50781 约定, 不自行委派 agent.

## 此前: M9 运行错误与十语言诊断审计完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `b1d2606` 继续,
完成 M9 最后一项错误/诊断文案审计. 继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/runtime-messages-20260913/SESSION_HANDOFF.local.md`.
实现与证据见 [审计报告](compatibility/2026-09-13-m9-localized-errors.md) 和
[复核工具](../tools/diagnostics/README.md).

- 新增 17 个错误/帮助资源, 10 个稳定错误码使用十语言摘要. 预热缓存保留失败事实,
  在返回时使用插件当前 Android 语言; 诊断受 16 KiB UTF-8 限制, 不拆开有效 Unicode 字符.
  README/插件说明的激活、Android 13 要求、超时和输出超限帮助取自同一组 strings.xml.
  绑定前宿主错误与系统安装门槛没有改造成虚假的插件服务返回结果.
- 同一隔离 Debug APK 批次绑定 85 项输入, 官方 Bun/supervisor 原字节不变.
  Sony XQ-DQ72 API 33 与 Xiaomi 23046RP50C API 35 (native ARM64 / 4096) 各两轮:
  原八项 Binder 合计 32/32, 独立语言 JUnit 合计 8/8, 含 240 个真实错误/finished 观察.
- 本轮拥有的 x86 API 36 / 16384 用户页 ABI AVD 另通过两轮 4/4 资源/拒绝 JUnit,
  验证十语言下缓存的 prewarm/info/run 拒绝一致; 内核映射为 4096. Bun 在执行前被拒绝,
  不能把该记录算作官方 x86 16 KiB 运行成功. 三份 JSON 独立归档, 原历史报告不改.
- 三环境的两个测试包均卸载, 六个 UID 最终为零进程. 只启动并关闭本轮
  `bun-jsc-pressure-16k-20260912` / `emulator-5582`; 原有 `emulator-5554` 未操作.
  没有使用三星或开启等待窗口. 没有 native 构建、Gradle 缓存修复、push 或 Release.
- JVM 10/10、Python 37/37、Node 191/191、36 文件生成器及兼容矩阵 --check 通过.
  矩阵现登记 60 份 JSON / 148 条设备尝试; 拒绝报告仅诊断索引, 不增加执行通过数.
  隔离与标准生产四项 Gradle 检查均成功 (各 15 秒), IDE build 通过.
  Lint 按 issue 节点计为 0 errors/44 warnings; 本次五条分别是固定字节页大小的复数建议、Python 消费的
  帮助资源和按仓库要求使用 ASCII 连字符, 具体解释见审计报告.
- 接受 APK 已保存在本机 `apks/`, 不要用随后生产包的输出覆盖它们.
  新受控构建 helper 是接受 APK 构建后补充的, 仅语法检查; 初始批次使用受控 Gradle
  命令及构建后外部 receipt. 不追溯声称 helper 已运行, 不无理由重建或重跑设备.

M9 本轮选定的小节包含服务实现、十语言资源、生成器、设备回归和归档, 已完整完成.
下一步从 Roadmap 的实验 syscall/API/FD/OEM 边界、持续上游审阅或其他未完成项选择
明确范围继续. 十补丁/JSC 的既有构建和设备证据保持成立于其原 APK/源码批次;
本轮服务呈现更新没有自动重验实验线或签名 Release. 如需三星, 仍按 10 分钟/50781 约定.

## 此前: M9 兼容矩阵生成器完成

更新: 2026-09-13 (Asia/Shanghai). 从干净 `7d5ac1e` 继续,
本轮完成独立兼容证据索引, 未改 native/runtime/service 或历史报告.
继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/compatibility-matrix-20260913/SESSION_HANDOFF.local.md`.
新生成器已登记 57 份源 JSON, 生成 144 条设备/尝试记录:
[人类矩阵](compatibility/MATRIX.md)、[机器索引](compatibility/matrix.generated.json)、
[维护说明](../tools/compatibility/README.md).

- 按运行时完整 hash/源码、设备 API/ABI/页大小和各轮计数保留结果. 官方、实验、shell、
  失败及初步诊断分别呈现; 构建和补充记录仅索引, 不增加设备通过数.
- 同一报告内核对 summary、各轮计数/套件/环境和 payload/APK 一致性, 不跨报告或套件求总和.
  缺失测量保留 null, 不把 x86 用户页 ABI 等同于内核页或 ARM64 硬件, 不以 ARM bridge 的存在推断翻译执行.
- `matrix-sources.json` 固定历史报告 UTF-8/LF SHA-256. 新报告需登记其结构/范围后重新生成;
  新增、缺失、历史修改或过期输出在 `--check` 中失败. Markdown CI 与 AGENTS 已加入检查.
- 十语言 README 兼容章节与 v0.2.2 changelog 已同步. 原 36 文件生成器契约不变,
  新矩阵另有两个生成产物. Python 35/35 (矩阵 24 + 原文档 11)、Node 189/189、
  官方 Bun/supervisor 完整性、标准四 Gradle 检查和 IDE build 通过.
  Gradle 25 秒/96 tasks, 48 executed/48 up-to-date; JVM 复用既有 8 项成功结果,
  lint 0 errors/40 既有 warnings, IDE 仅既有 SDK XML 与 Bundle.get 警告.
- 开始时确认此前两次 JSC/Bun native driver exit 0 和 WSL/Docker 无活动构建;
  本轮没有 native 构建、Gradle 缓存修复、设备运行或 AVD 操作, 不把索引更新称为新设备验收.
  旁侧 AutoJs6 仓库有用户构建, 未干预. 本轮命令均已结束, 无三星等待窗口, 无 push/Release.

下一节可选择 M9 用户错误/诊断文案审计; 该小节尚未开始. 本轮矩阵覆盖多种历史结构,
以完成其实现、负向回归和 CI 为边界. 现有实验 syscall/API/FD/OEM、长时压力/性能与 Release
门槛保持开放. 三星接入仍按下方 10 分钟/50781 约定, 不假定旧设备连接可复用.

下方为此前已完成的 JSC 与 baseline 工作, 保留各自证据边界和本机记录.

## 此前: 十补丁大页 JSC 回归与 M9 排错指南完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `6212011` 继续,
实现/构建证据已提交为 `573812979506283492637aaea3375819c336e515`.
本轮完成 M5 的十补丁 JSC rebase、双 clean Bun 构建、双页大小原 Binder 与压力回归,
以及 M9 排错指南/十语言 README 入口. 最终证据见
[完整说明](compatibility/2026-09-13-m5-ten-patch-jsc.md)、
[Binder](compatibility/2026-09-13-m5-ten-patch-jsc-binder.json)、
[压力](compatibility/2026-09-13-m5-ten-patch-jsc-pressure.json) 和
[补充检查点](compatibility/2026-09-13-m5-ten-patch-jsc-checkpoints.json).

继续前完整阅读 `AGENTS.md`、本文件及本轮本机记录
`E:/.codex-tmp/jsc-ten-patch-20260913/SESSION_HANDOFF.local.md`.
更早的 baseline/Samsung/诊断记录仍在
`E:/.codex-tmp/bun-signal-trace-20260913/SESSION_HANDOFF.local.md`.
先检查进程与日志, 不重复已完成的 native 构建、Gradle ZIP 修复或 SIGSYS 诊断.

## 本轮结果与精确范围

- 两个新 Bun checkout 固定十补丁 head `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`,
  tree `cb762d12f6959834517c79f01f4c538346990962`. 两个实际 driver exit 均为 0,
  complete x86_64 Bun 都是 90609488 bytes / SHA-256
  `a237dc8c13fbef6366a36769ea9a6d729fd24307b0df93bb051be8d997f8dcd5`.
- 精确复用原两个独立 WebKit 构建的三个 JSC 库/config 与上游 ICU, 新 WebKit/ICU 构建数为 0.
  [新独立候选锁](../tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-candidate.lock.json)
  绑定源、库、日志和最终 link/map/strip. 原九补丁 candidate.lock.json 与 baseline 锁未修改;
  原 baseline 构建缺失的退出码仍为 null, 不被本次两个 actual exit 0 取代.
- 新同一主/测试 APK 在 native x86_64 API 36 的 4 KiB/16 KiB 用户页各过两轮:
  原八项 Binder 32/32, 原七模式压力 28/28. 原 fixture、压力语义校验器与预算未改, 设备套件无失败/重试.
  APK 77 输入逐项匹配 `5738129`; 已测试 APK 与内嵌 receipt 保存在本机 `tested-apks` 子目录.
  归档发生在最终 changelog 生成之前, 后续文档 APK 不替代已测试的精确字节.
- x86 16 KiB 为用户空间页 ABI 模拟, 两台 shell smaps 内核/MMU 页仍为 4 KiB.
  verified x86 ELF 没有通过可用的 ARM bridge 执行. 本轮没有三星、ARM64 或 API 28-32 新观测.
- 四次 runner 的主/测试包卸载、所有 execution UID 清零; 16 KiB 两个测试 UID 另行捕获并清零,
  4 KiB 未单独捕获测试 UID. 仅关闭本轮 owned AVD 5580/5582, 事先核对精确名称.
  原有 5554 在最后仍在线; 5560/5562 已不在 ADB 列表中, 未对它们发出控制命令.
  一个额外收尾库存断言因此退出 1, 原失败/脚本摘要和已落盘清理快照独立保留;
  只恢复聚合 receipt, 没有重跑设备套件或重启 AVD. 不推断原有清单变化的原因.
- Node 189/189, 文档 generator/check 与 Python 11/11, 生产标准四 Gradle 检查及 IDE build 通过.
  生产 JVM 任务使用已有 8 项 UP-TO-DATE 结果, IDE 仅既有 SDK XML/Bundle.get 警告.
- [排错指南](troubleshooting.md) 及十语言 FAQ/当前 changelog 已同步. 无 push/Release.

## 下一轮与三星接入约定

这些有限套件不关闭完整 syscall/API/FD/OEM、FD70000/UNSHARE/watch/reload、长时压力/性能
或签名 APK/同 Release 对应源码门槛. baseline 十补丁仍是七环境 434/434 探针与 112/112 Binder;
新 JSC 32/32、28/28 分开计数. M9 的完整兼容矩阵生成器与用户错误文案审计仍未完成.
官方 API 33+、payload/supervisor/真实 service/AAR 和 `distributionReady=false` 均不变.

用户要求一次会话尽量推进多个有边界的小节. 如需三星, 在过程中明显说明具体型号/API/页大小,
给出 **10 分钟** 等待窗口, 期间定期轮询 `localhost:50781`.
本轮未发出三星请求, 当前无待答设备窗口; 不假定旧会话设备仍满足新的需求.
保持 noreply 提交身份, 不自行委派 agent.

下方为此前已完成的 baseline/Samsung 阶段, 保持各自来源和历史边界.

## 此前: 十补丁构建恢复与七环境原套件回归完成

更新: 2026-09-13 (Asia/Shanghai). 当前实验 revision 为 `1.4.0+a9c76a599`.
**已有 native 成品的构建完成证据已恢复; 五个本地与两台三星共七环境原套件回归通过.**

先完整阅读根 `AGENTS.md`、本文件和仓库外的
`E:/.codex-tmp/bun-signal-trace-20260913/SESSION_HANDOFF.local.md`.
本机记录包含 SDK/JDK、设备序列号、原构建/测试目录、精确命令和日志.
恢复时先检查 Git、实际进程与日志, 不重启 native 构建或重做已完成的 SIGSYS 诊断.

## 用户要求与边界

- 继续 Roadmap, 保留接手时已有的十补丁修改. 本次工作起点是 master 的
  `db12fb904c2a213cd80709ce990b5a7a7d956044`; 之前独立诊断提交 `0bc66d6` 保持不变.
- 官方 Bun `34cbb9a40b4bd1bd767d134a7065e66c2432a676`、产品 API 33+、官方 variant、
  payload、supervisor、生产 service 与共享 AAR 均不变. 实验 `distributionReady=false`.
- 仅 ARM64/baseline x86_64, 只读 nativeLibraryDir 中的 PIE; 单源码/no-install/无相对工程导入/
  无 AutoJs6 globals 或 Java bridge/有界输出与生命周期约束不变.
- 不自行委派子智能体. 使用 noreply 作者邮箱 `30370009+SuperMonster003@users.noreply.github.com`.
  本次没有改写历史、push 或发布. 对应源码与 APK 分离、同一 Release 的 draft-first 技术验证规则不变.
- 用户已依次提供 Samsung SM-F936U API 32 / 4 KiB 和 SM-A566B API 36 / 原生 ARM64 16 KiB.
  2026-09-13 08:55-09:05 的同批三个 APK 回归全部通过, 清理后已告知可结束租用.
  前一阶段用户要求的 Gradle ZIP 下载和缓存修复已完成, 不再重复处理.

## 新 native 与构建恢复

- 十补丁 head `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`,
  tree `cb762d12f6959834517c79f01f4c538346990962`.
- patch 10 仅在 Android pidfd_open shim 增加 19 行: 查询调用线程 mask;
  SIGSYS 被屏蔽时直接 ENOSYS, 走既有 sticky waiter fallback. 不改变 mask/pending,
  不预热 waiter, 不修改 Linux rustix 或前九补丁.
- 原两个 Docker 容器/工具 session 已结束且不可恢复; Windows 日志只捕获了部分编译过程.
  两个独立 clean checkout 的四个完整成品已存在, 头/tree 正确, Ninja 日志有最终 link/map/strip 边.
- **没有重新编译 Bun/WebKit. 原构建驱动退出码没有保留下来.** schema 2 明确记录
  `bothRunsExitCode=null`; 使用同一锁定容器、额外只读挂载 Bun checkout 的四次 `ninja -n`
  均为 `no work to do`, exit 0. 验证器绑定四个 run/ABI、源码/输出摘要、日志和最终边,
  不把 dry-run 退出码冒充原构建 exit 0.
- 每 ABI 两份产物逐字节一致, 完整 ELF 审计和至少 16384-byte PT_LOAD alignment 通过:

| ABI | bytes | SHA-256 |
|---|---:|---|
| arm64-v8a | 87923328 | `96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f` |
| x86_64 | 90449744 | `c37f8b09ed8d4551709627292ef7770832c2568f70dcb22fe75341780e05fcde` |

- 新产物另存原 WSL 根目录下的 `blocked-pidfd-evidence/run-1` 和 `run-2`,
  不覆盖历史九补丁或官方 payload. 当前 runtime evidence/锁/验证器/对应源码绑定已同步,
  `runtimeProduced=true`, `distributionReady=false`; 完整 `verifyExperiment` 通过.
- 十补丁确定性重放、upstream prefix 等价和 28 个 source blob 通过;
  精确 Bun archive 与完整 WebKit source closure 通过. 精确生产函数的十个 host subtest
  在锁定禁网容器中通过; 最初普通 WSL 缺少 cc 的失败日志保留, 当次没有执行测试.
- [独立构建证据](compatibility/2026-09-13-m2-blocked-pidfd-runtime-evidence.json)
  和 [本轮完整说明](compatibility/2026-09-13-m3-blocked-pidfd-fix.md) 可直接复用.

## 三星补充回归已完成

本轮从 master `df186ec54c2843c3eaa4847b7940accf520b8722` 的干净状态接续,
复用相同 ARM64 native/probe APK. 只在 API 32 之前重打包一次 Binder 主 APK,
75 个输入逐项匹配该提交; 两台三星使用相同主/test APK. 本轮没有重编译 Bun/WebKit.

| 设备 | 实际 API | native ABI | 页大小 | 原 31 项两轮 | 原八项 Binder 两轮 |
|---|---:|---|---:|---:|---:|
| Samsung SM-F936U | 32 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Samsung SM-A566B | 36 | arm64-v8a | 16384 | 62/62 | 16/16 |

两台 bridge=0, SM-A566B shell smaps 的 KernelPageSize/MMUPageSize 都是 16 kB.
无失败/重试, 八个 blocked-async / 24 个 child 观测、16 个 hard-limit / 16 个 spawn API 检查、
八个 soft-limit 和十二个 forcible lifecycle (301-306 ms) 通过, 另有二十条 Binder lifecycle.
三个包每台都卸载, 两个执行 UID 每台都归零; API 36 还单独捕获并核对 test UID,
API 32 没有第三个 UID 的独立记录. 没有操作 AVD, 期间接入的 emulator-5560 也不是本轮所有.

分别见 [API 32](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md) 和
[原生 ARM64 16 KiB](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md) 的说明与四份 JSON.
与下方本地历史分批累计, 七个 native 环境 **434/434 探针、112/112 Binder**,
其中六个 4 KiB 和一个 ARM64 16 KiB; 31 定义/fixture/validator/预算均未改变.
本机详细路径、同批 APK 快照和清理记录在 `samsung-20260913/` 下, 已更新本机交接.

## 本次三星阶段的归档与最终验证

- 四份新 probe/Binder JSON 通过原严格归档器和语义验证器. 原 31 定义与 probe APK
  逐项匹配此前五环境批次; Binder 的 75 个输入逐项匹配 Git 基点 `df186ec`, 八个方法不变.
  [设备观测补充](compatibility/2026-09-13-m3-blocked-pidfd-samsung-device-facts.json)
  另存页大小和独立 UID/卸载记录原文与摘要, 绑定四份套件归档; API 32 第三个 UID 缺口明确保留.
- 十语言 changelog 源已更新, 36 个 Markdown 产物按生成器同步; --check 和 11/11 Python tests 通过.
- 生成资源后的生产四项标准 Gradle 检查 BUILD SUCCESSFUL, 46 秒,
  96 tasks / 49 executed / 47 up-to-date. runtime/16 KiB ELF 与 ZIP gate、单元测试、
  AndroidTest 打包及 lint 通过; `testDebugUnitTest` 本次使用既有成功结果 (UP-TO-DATE).
- IDE 增量构建直接返回 `isSuccess=true`, 没有超时; 保留一个 SDK XML 版本读取 warning.
  日志和工具原响应保存在本机 `samsung-20260913/production-verification.log` 与 `ide-validation.json`.
  这些生产验证不替代上方实际设备测试的 APK 快照, 没有重复 native 构建或设备执行.

## 此前五个本地环境的独立批次

原 31 定义仅改预期 revision, fixture/Java instrumentation/语义 validator/资源预算均不变.
每个环境均运行两轮完整 31 项 probe 和两轮原完整八项 Binder:

| 设备 | API | native ABI | 页大小 | probe | Binder |
|---|---:|---|---:|---:|---:|
| Sony G8441 | 28 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 62/62 | 16/16 |
| sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 | 62/62 | 16/16 |
| 合计 | | | | **310/310** | **80/80** |

20 个 blocked-async / 60 个 child 观测、40 个 hard-limit / 40 个 spawn API 检查、
20 个原 soft-limit 和 30 个强制生命周期 (301-307 ms) 通过. Binder 有 50 条生命周期记录.
探针 [源码/APK/raw/cleanup 归档](compatibility/2026-09-13-m3-blocked-pidfd-fix.json)
与 [Binder 归档](compatibility/2026-09-13-m3-blocked-pidfd-binder.json) 分开.

API 28 首次 Binder 批次第一轮 8/8, 第二轮测试开始前 ART 的 ADB-JDWP 线程 SIGSEGV,
不计入上述成功数. [失败批次与 owned-process crash](compatibility/2026-09-13-m3-blocked-pidfd-binder-startup-failure.json)
独立保留; 相同 APK/设置在新目录重跑两轮后 16/16. 没有伪装为 pidfd SIGSYS 或修改测试绕过.

所有包卸载后 UID 进程为零. 仅关闭本轮启动的 API 33 AVD (原端口 5560);
原有/无关设备未干预, 用户 AutoJs6 未卸载. 已验证 probe APK 可原样复用.
该本地 Binder APK 快照保存在 `ten-patch-tested-binder-apks/`. 三星前已按需要重打包一次
opt-in APK, 其同批主/test/receipt 另存 `samsung-20260913/tested-binder-apks/`.
此后文档更新产生的 APK 不替代已接受批次, 不重新构建 native 或重跑已完成设备回归.

## 前一阶段验证与本机 Gradle 恢复

- 全部 Node tests **187/187**; Markdown generator 写入与 --check 通过,
  Python generator tests **11/11**. 当前 source/runtime/corresponding-source 验证通过.
- 官方 runtime/supervisor 验证通过. 生产标准四项 Gradle 任务
  `:app:testDebugUnitTest :app:verifyDebugApkRuntimeIntegrity :app:assembleDebugAndroidTest :app:lintDebug`
  在缓存修复前 BUILD SUCCESSFUL (96 tasks, 92 executed, 4 up-to-date).
- 用户报告 `E:/.gradle/caches/9.5.0` 部分内容误删. 已重新下载官方 Gradle 9.5.0 ZIP,
  140319124 bytes, SHA-256 `553c78f50dafcd54d65b9a444649057857469edf836431389695608536d6b746`;
  官方 checksum、ZIP CRC 和现有安装全部 683 个文件比对通过.
- IDE 先后遇到缺失的 instrumentation 分析与占用中的 foojay transform. 等其他项目构建成功、
  全部 9.5.0 daemon 空闲后停止它们, 将版本缓存移到本机 `gradle-cache-repair` 下保留备份并重新生成.
  修复后的生产四任务再次 BUILD SUCCESSFUL (4m 9s, 96 tasks / 92 executed / 4 up-to-date).
  IDE 工具等待 60 秒超时; 同一批实际 Gradle 构建随后分别在 2m 29s 和 2m 52s 成功结束,
  分别为 6 tasks 全部 up-to-date 和 40 tasks / 36 executed / 4 up-to-date.
  成功日志与原失败/超时结果在本机分别保存; 未再出现上述缓存错误.

## 恢复后的下一步

1. 十补丁已有构建取证、五个本地环境及两台三星的原套件回归均已完成, 不重做 native 构建或诊断.
   先核对 Git 最新提交和本机最终记录; 新文档 APK 不能替代已绑定的测试 bytes.
2. 独立大页 JSC 候选仍基于九补丁. 如继续该门槛, 需单独对齐十补丁并取得新的构建/设备证据;
   不能仅改候选锁或用历史 x86 16 KiB Binder/pressure 成绩验收新源码.
3. 扩展 syscall/API/FD/OEM、Android FD 70000、UNSHARE、watch/reload、其他线程/信号边界、
   长时压力与签名 Release / paired APK-source 发布继续开放. 当前声明仅覆盖原 31 项和八项 Binder.
4. 官方 native x86_64 16 KiB 门槛与独立 JSC 候选分开. 本次三星通过不代表一般端到端 16 KiB 支持,
   不改变官方 API 33+、payload 或 distributionReady=false.

所有九补丁及此前十补丁的失败/成功报告保持历史原样, 新设备结果另档.
