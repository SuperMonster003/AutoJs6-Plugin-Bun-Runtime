# 会话交接: M9 兼容矩阵生成器完成

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
