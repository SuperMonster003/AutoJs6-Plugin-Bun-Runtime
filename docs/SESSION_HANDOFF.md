# 会话交接: M3 blocked-SIGSYS / pidfd_open

更新: 2026-09-13. **这是恢复检查点, 不是新运行时已验收的声明.**

用户要求继续 Roadmap, 同时在本轮结束前提供完整关键上下文. 本机完整交接记录保存在仓库外的 `E:/.codex-tmp/bun-signal-trace-20260913/SESSION_HANDOFF.local.md`, 包括设备序列号、SDK/JDK、WSL 路径、构建命令和日志. 本文件不提交本机 SDK 配置或构建产物. 新会话先读 AGENTS 和本文件, 再检查 Git、日志、Docker/ADB 实际状态.

## 需求与不可变边界

- 保持脚本开发工具自由度. 静态目录回退已选择有界只读 descriptor-relative 方案, 不增加 permissive 模式/依赖, 不限制普通文件 API.
- 对应源码与 APK 分离, 同一 Release 提供 SHA-256 manifest/SHA256SUMS, draft-first 技术自动验证. 用户允许实际发布, 不要求单独法律复核; 技术验收不得省略.
- 使用 noreply 作者邮箱 `30370009+SuperMonster003@users.noreply.github.com`. 本轮未改写历史、push 或发布.
- 官方 Bun 1.4.0 / `34cbb9a40b4bd1bd767d134a7065e66c2432a676`, variant `bun-1.4.0-android`, API 33+ 不变. ABI 仅 ARM64/baseline x86_64; 执行只读 nativeLibraryDir 中的 PIE, 不是 JNI.
- 生产服务、supervisor、共享 AAR、单源快照/no-install/无相对工程导入/无 AutoJs6 globals 或 Java bridge、输出及生命周期限制均不变. platform-versions 固定 1.7.4.
- Samsung 远程设备需用户预约. 不操作无关设备, 用毕只关闭自己启动的 AVD. 本轮未启动或关闭 AVD.
- 不自行委派子智能体. 尚未完成的工作必须明确标注, 不把历史成绩移给新 revision.

## 已完成并可复用

本轮初始 master HEAD 为 `fb9fbc6652ec434e4ec5e8674561461c9f33ccf5`, 工作区原本干净. 本轮诊断工具、归档及文档作为独立逻辑提交保存; 实验 native 构建改动另留工作区, 见下节.

诊断提交为 `0bc66d6` (`test(runtime): capture blocked async pidfd SIGSYS`), 作者/提交者均为 noreply. 该提交的独立 clean worktree 已通过全部 176 个 Node 测试、完整九补丁 `verifyExperiment` 和 Markdown --check; 并非将含十补丁草稿的当前工作区说成已全面通过. 临时验证 worktree 用后清理, 日志保存在本机交接目录. 未运行远程 CI, 未 push 或发布.

1. [动态诊断](compatibility/2026-09-13-m3-blocked-pidfd-diagnosis.json): 原九补丁 Bun 在 Sony G8441 / API 28 / native ARM64 / 4096 上, native/trap 两种冷 async fixture 各两轮, 四次 traced 失败直接记录 leader SIGSYS / SYS_SECCOMP / syscall 434 (pidfd_open), 然后 exit 159. 四个 plain 对照同样失败. Sony XQ-AT72 / API 31 的同样八次执行均通过原语义断言, 没有 pidfd SIGSYS. 两包卸载且 UID 进程为零.
2. 独立 test-only observer 不修改寄存器、掩码或信号交付; execve-only launcher 不预热 spawn/waiter. syscall 身份是动态证据, Rust 调用点来自源码审查, 不是捕获的栈. [初版 harness 失败](compatibility/2026-09-13-m3-signal-trace-harness-failure.json) 单独保留, 不计为 native 修复结果.
3. 诊断防篡改 Node 测试 14 项通过; 真实 Linux observer 的 handled/fatal SIGSYS 对照通过. 原 APK/release-helper 与新诊断组合 31 个 Node 测试通过.
4. 官方 Bun/supervisor 摘要及 ELF 验证通过. 生产四项标准 Gradle 任务使用 --rerun-tasks, 96 tasks 全执行成功, 包括 Debug APK 完整性/16 KiB ZIP 对齐. IDE build 成功, 原 SDK XML/Bundle.get/extractNativeLibs 警告保留. 这些不是新 native 的设备成绩.
5. 十语言 changelog 更新诊断进展; generator 写入及 --check、11 项 Python generator tests 通过.
6. 历史九补丁构建锁已另存 [原始构建证据](compatibility/2026-09-10-m2-scoped-open-runtime-evidence.json), 原 blocked-async passing/failure 与更早报告未改写.

## 仍在进行: 十补丁修复

**以下源码/锁/test/CI 改动尚未完成验收, 保留为未提交的工作区修改, 不要 reset 或误认为用户的无关代码.**

- native head `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`, tree `cb762d12f6959834517c79f01f4c538346990962`, 预期 revision `1.4.0+a9c76a599`.
- patch 10: `0010-fix-preserve-blocked-SIGSYS-during-optional-pidfd-probing.patch`, 3486 bytes, SHA-256 `bd6563e58f24383718fb4f77f8bde52c99a198289a3246afac654939d7058b0d`, stable patch ID `67ca6fb6b5714764a36b3bdb9b3e63fbc3a0b7bf`.
- 仅在 Android pidfd_open shim 中新增 19 行: 查询调用线程 mask, SIGSYS 被屏蔽则不探测 optional syscall, 返回 ENOSYS 选择既有 sticky waiter fallback. 不解除 mask, 不提前交付 pending 用户信号, 不改 Linux rustix 入口或前九补丁.
- 十补丁确定性重放与 28 个 source blob 检查通过. 精确提取生产函数的 10 个 Linux host 回归用例通过, 包括 pending/thread-local/error/real-pidfd/actual-TRAP 控制.
- 已更新 patch/source/Cargo/Bun commit 绑定和 source-only gate. `runtimeProduced=false`, `status=source-locked-awaiting-runtime-evidence` 是有意的保护状态. **默认 verifyExperiment 与全部当前-worktree CI 尚不能声称通过**, 不要绕过 runtime evidence gate.
- 两个独立 clean checkout 的 `--abi all` 锁定 Docker 构建已启动, 禁网/只读输入/禁用 ccache, 尚不能声称 exit 0、逐字节一致或新二进制验收. 日志为本机交接目录中的 `native-build-1b.log` 与 `native-build-2.log`; 恢复后先检查已有进程, 不启动第三份构建.
- 初次 build preflight 误选旧 Cargo cache 而失败, 未编译 native; 后改为完整 `cargo-build-std`. 初次日志保留.
- 当前 `runtime-evidence.json`、对应源码锁、probe revision 和大多数历史说明仍是九补丁, 只有确认双轮产物后才同步切换. 不能把旧 bytes 与新 source 绑定.

## 历史成绩与下一步

九补丁 head 为 `7b9ac266888abda7ee6ec0b8ac11a74236420030`, revision `1.4.0+7b9ac2668`. 原 29 项套件累计七原生环境 406/406, 完整 8 项 Binder 分批十二环境 192/192. 新 31 项套件在四个 4 KiB 环境通过 248/248, API 28 两轮 29/31 的四个失败仍是失败, 不能按 expected-failure 当验收. [历史说明](compatibility/2026-09-13-m3-blocked-async.md) 不改写.

恢复顺序:

1. 等现有两份构建完成; 检查 source clean、两个 ABI 各两轮 exit 0、bytes/ELF 完整审计. 另存新 evidence, 不覆盖 scoped-open 历史产物.
2. 同步实际 runtime evidence、固定 head/count/hash 验证器、对应源码绑定与 unit tests, 然后才恢复 runtimeProduced=true. 原 31 定义只改 revision, 不改 fixture/validator/预算.
3. 新 app-probe 首先运行 API 28 两轮 31 项, 再本地 ARM64 API 31/33/35 和 x86_64 API 33. 归档所有失败/成功, 不预热 waiter 或提前恢复 mask.
4. 运行 opt-in experimental-binder 的原完整 8 项套件, 复用真实权限与签名, 不卸载用户 AutoJs6 或绕过权限. 本轮尚未开始新 native 的 Binder.
5. 需要用户后续预约 Samsung ARM64 API 32 / 4 KiB 和 ARM64 API 36 / 16 KiB, 重新验证新 bytes. 现在不必提前消耗租期.
6. 更新 AGENTS/Roadmap/当前说明/十语言 changelog 源文件, generator 与完整相关 Node/Python/Gradle/IDE 验证后提交 native 修复. 本轮新诊断的 staged snapshot 与未提交 native gate 是两个状态, 不混淆.
7. 九补丁基础上的独立 x86 大页 JSC 候选已有清洁重建/Binder/压力证据, 但尚未 rebase 至十补丁. x86 AVD 的模拟 16 KiB 用户空间不等于 ARM64 硬件页, 也不是官方/Release 通用验收.

最后边界: **已定位问题并实现候选源码, 但新 native 构建、31 项设备回归、Binder、远程设备和 Release 尚未在本轮恢复点完成.**
