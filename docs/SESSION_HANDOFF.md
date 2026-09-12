# 会话交接: 十补丁 pidfd 修复, 本地回归已完成

更新: 2026-09-13 (Asia/Shanghai). 当前实验 revision 为 `1.4.0+a9c76a599`.
**已有 native 成品的构建完成证据已恢复, 五个本地环境通过; 三星远程回归仍待设备.**

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
- 三星需要用户预约; 已在本地回归完成后通知需要 ARM64 API 32 / 4 KiB 和 API 36 / 原生 16 KiB.
  用户随后要求重新下载 Gradle ZIP 以修复误删缓存, 尚未提供三星连接信息.

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

## 新 bytes 的设备结果

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
Binder APK 的测试快照保存在本机 `ten-patch-tested-binder-apks/`; 后续十语言文档生成改变了
编译输入绑定, 三星前需重新构建 opt-in **APK** 并另归档该输入批次, 不重新构建 native.

## 本轮验证与本机 Gradle 恢复

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

1. 本地验证和缓存恢复已完成. 先核对 Git 最新提交与本机最终记录;
   无须重跑已经通过的本地设备矩阵、native 构建或诊断.
2. 收到三星连接后核对实际 API/native ABI/bridge/page size. API 32 / 4 KiB 和 API 36 / 原生
   ARM64 16 KiB 各运行同一 31 项 probe 两轮、原完整八项 Binder 两轮; 保留原 fixtures/budgets,
   绑定当前 APK/source, 归档所有失败/成功并验证清理. 不复用九补丁成绩作十补丁验收.
3. 九补丁大页 JSC 候选仍是历史九补丁 source. 当前 Binder 构建/runner 会拒绝将其冒充十补丁;
   需要独立 rebase/build/regression, 不改写其初始 incremental origin 或历史 clean-build/pressure 报告.
4. 远程门槛完成后再推进其余 syscall/API/FD/OEM 与 Release 门槛. Android FD 70000、UNSHARE、
   watch/reload、任意 blocked syscall、长时压力、签名 Release 和 paired APK/source 发布均未闭合.
   本轮 x86 是 native 4 KiB, 不提供新 x86 16 KiB 或 ARM64 硬件大页证据.

此前九补丁诊断、失败和通过报告全部保持历史原样. 十补丁接受范围仅限本文件列出的新证据.
