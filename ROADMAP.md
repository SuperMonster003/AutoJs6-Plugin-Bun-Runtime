# AutoJs6 Bun Runtime 插件 Roadmap

更新日期: 2026-09-02

本文档是 Bun Runtime 插件从首个单源码引擎版本演进到 Android 9+ 实验运行时、多文件项目执行和受控宿主能力桥的执行清单。每个条目只有在实现、文档和对应等级的验证证据同时满足后才可勾选；未勾选条目是规划意向，不代表当前版本能力或发布时间承诺。

## 状态与证据规则

- `[x]`: 已完成，且仓库中存在可复核证据，例如代码、测试、锁文件、生成产物或设备报告。
- `[ ]`: 尚未完成；括号中的 `插件` / `API` / `宿主` / `上游` / `构建` / `测试` / `设备` / `发布` 表示主要落点。
- “代码完成，待设备”只表示静态实现与自动化测试已完成，不得据此扩大 README 的正式兼容范围。
- 设备结论必须记录 Android API、ABI、设备或 AVD 类型、内核、页大小、Bun revision、测试范围和失败时的 signal/syscall；仅通过 `--version` 或一个 Hello World 不等于完整运行时兼容。
- 上游 PR 或 issue 只有在固定到具体提交、经过本项目审查并通过本项目矩阵后，才可成为发布依据；开放中的上游工作本身不算本项目已交付能力。

证据等级:

| 等级 | 含义 | 可支持的结论 |
|---|---|---|
| G0 静态 | 源码、Manifest、ELF、锁文件和文档检查 | 能构建或满足结构要求 |
| G1 自动化 | JVM、Python/Node、lint、APK 审计和 instrumentation CI | 可重复验证的实现行为 |
| G2 运行环境 | 真实 Android 设备或与目标一致的 AVD 端到端执行 | 对该 API/ABI/环境的运行证据 |
| G3 发布 | 签名、升级、安装、激活、摘要、许可证和回退路径全部验证 | 可写入正式兼容声明 |

## 已确认的技术决策

1. Bun 是独立脚本引擎，不是 Rhino 或 Node.js 的别名。宿主通过独立 `"bun";` 指令选择插件，运行时继续位于 `:bun_runtime` 进程。
2. 当前基线固定为官方 Bun `bun-v1.4.0` / commit `34cbb9a40b4bd1bd767d134a7065e66c2432a676`，官方 Android ELF 的构建目标是 API 28。
3. Android 13 / API 33 与 Android 9-12L / API 28-32 分开交付:
   - API 33 使用未经修改的官方 Bun 产物。AOSP T 已将 raw `close_range` 加入应用进程 seccomp allowlist；Android 14 / API 34 新增的是公开 bionic wrapper，不是 raw syscall 的首次放行。
   - API 28-32 使用固定源码和可审计补丁构建的实验运行时，使 seccomp `SIGSYS` 转换为可触发 Bun 现有 fallback 的 `ENOSYS`，或在 Android 路径直接使用等价的安全 fallback。
4. Android 9 / API 28 是当前现实下限。Android 8/8.1 / API 26-27 需要重新构建全部 native 依赖、消除 API 28 符号与 RELR 假设，并另行立项。
5. 发布 ABI 仍严格限定为 `arm64-v8a` 和 baseline `x86_64`；不得把降低 Android API 表述为支持 32 位设备。
6. 不通过跳过 `close_range`、伪造成功、修改 ELF 指令、普通 `LD_PRELOAD` 符号替换或 proot/ptrace 交付兼容性。文件描述符的 `CLOEXEC`/关闭语义必须被真实保留。
7. 当前产品边界仍为 `bun run --no-install <source>` 的受控单源码脚本引擎。`bun install`、`bunx`、native addon 和设备端生成可执行文件不随 Android 9+ 实验目标自动进入支持范围。
8. Bun executable 继续只从 Android 安装的只读 `nativeLibraryDir` 直接执行，不复制到 `filesDir`、`cacheDir` 或其他应用可写目录。

主要上游依据:

- [Bun v1.4.0 Android API 28 构建配置](https://github.com/oven-sh/bun/blob/bun-v1.4.0/scripts/build/config.ts#L511-L516)
- [AOSP T allowlist `close_range` 提交](https://android.googlesource.com/platform/bionic/+/436980d31c99bdee3c794e26e662e885eba928d6)
- [Bun Android 12 `close_range` / `SIGSYS` issue #30766](https://github.com/oven-sh/bun/issues/30766)
- [Bun 通用 seccomp fallback PR #39775](https://github.com/oven-sh/bun/pull/39775)
- [Bun `openat2` / `fchmodat2` Android issue #39060](https://github.com/oven-sh/bun/issues/39060)

## 核查基线

截至 2026-09-01，仓库基线如下:

- [x] (上游/构建) 两个官方 Bun 1.4.0 Android release archive 和解压后的 ELF 已按大小与 SHA-256 固定在 `tools/bun-runtime/runtime.lock.json`。
- [x] (构建) `arm64-v8a` 和 `x86_64` payload 均为 Android PIE executable，动态依赖仅为公开系统库，并满足至少 16 KB 的 `PT_LOAD` alignment。
- [x] (设备) Android 15 / API 35 `arm64-v8a` 真机已通过 README JavaScript 与 TypeScript Binder 往返。
- [x] (设备) Android 13 / API 33 `arm64-v8a` 真机已有成功运行记录，与 AOSP T allowlist 结论一致；仍需补 AOSP/x86_64 与更多 OEM 证据后进入 G3。
- [x] (设备) Android 12 / API 31 `arm64-v8a` 真机已观察到 syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 终止，证明未修改官方 runtime 不能作为 API 28-32 的通用产物。
- [ ] (测试) 当前尚无完整 API 28-35、双 ABI、跨 OEM 运行矩阵，也尚未完成真实 16 KB 页环境的 Bun 执行。

## 总览

| 里程碑 | 状态 | 核心结果 | 主要落点 |
|---|---|---|---|
| M0 单源码独立引擎 | 已完成 | Bun 1.4.0、Binder 流式执行、双 64 位 ABI | 插件/API/宿主/构建 |
| M1 Android 13 正式基线 | 进行中 | 官方 Bun 保持不变，最低版本降至 API 33 | 插件/测试/设备/发布 |
| M2 patched Bun 可复现构建 | 进行中 | downstream 源码链与依赖 identity 已锁定，构建和产物尚未就绪 | 上游/构建/测试 |
| M3 Android 9-12 实验支持 | 等待 M2 | API 28-32 安装、探测、执行与诊断 | 插件/测试/设备/发布 |
| M4 Android 9+ 稳定化 | 等待 M3 | syscall、FD、进程生命周期和 OEM 矩阵闭环 | 测试/设备/发布 |
| M5 16 KB 与发布完整性 | 进行中 | ELF、ZIP、安装后 payload 和真实 16 KB 执行 | 构建/测试/设备/发布 |
| M6 多文件项目执行 | 未开始 | 受控项目快照、相对导入与 source map | API/插件/宿主 |
| M7 AutoJs6 能力桥 | 未开始 | 窄接口、权限感知、版本化的宿主能力 | API/插件/宿主 |
| M8 Bun 升级与可选 CLI | 持续项 | 上游监视、升级审计和独立 CLI 可行性 | 上游/构建/测试 |

推荐依赖顺序:

```text
M0 ──> M1 ──> M5
  └──> M2 ──> M3 ──> M4 ──> M5
  └────────────────> M6 ──> M7
M8 作为横切主线持续跟踪，但不得绕过任一里程碑的升阶门
```

## M0: 单源码独立引擎 (v0.1.0，已完成)

- [x] (宿主/插件) 将 `bun` 注册为由独立 `"bun";` 指令选择的 AutoJs6 脚本引擎，不回退到 Rhino 或 Node.js。
- [x] (插件) 在隔离的 `:bun_runtime` 插件进程中启动固定版本的官方 Bun Android executable。
- [x] (API/插件) 通过 `ParcelFileDescriptor` 传输一个不可变 JavaScript 或 TypeScript 源码快照，并以参数数组执行 `bun run --no-install <source>`。
- [x] (API/插件) 通过 oneway callback 有界分块传输 stdout/stderr；terminal Bundle 和 `finished` event 不携带完整输出流。
- [x] (插件) 提供 prewarm、runtime identity、60 秒默认 timeout、显式 cancellation、16 MiB 源码上限和 8 MiB 组合输出上限。
- [x] (构建) 打包 `arm64-v8a` 与 baseline `x86_64` 单 ABI APK 和 universal APK，并固定官方 archive/binary 的来源、大小、SHA-256、ELF machine 和 alignment。
- [x] (插件/发布) 提供受权限保护的 Wake、INFO、runtime 组件、PluginInfo、10 语言资源、生成文档和 CI 基线。

M0 验收条件: API 35 `arm64-v8a` 真机完成 JS/TS Binder 往返，仓库静态/单元/文档/构建门禁存在且首版能力边界已记录。(已满足)

## M1: Android 13 / API 33 正式基线

M1 只使用官方 Bun v1.4.0 release artifact，不引入 downstream native fork。目标是先以最低维护成本覆盖 Android 13，同时保持 API 34/35 无回归。

### M1-A: 事实与构建边界

- [x] (插件) 将 `MIN_SDK_VERSION` 从 34 调整为 33，并确认最终 debug、androidTest、单 ABI 和 universal APK manifest 均为 `minSdkVersion=33`。(2026-09-01，G0/G1)
- [x] (构建) 将 runtime lock 中“官方 ELF 链接目标 API 28”和“当前产品支持下限 API 33”拆成独立字段，避免再次混淆 native link target、seccomp allowlist 和插件支持策略。(2026-09-01，G0)
- [x] (构建/测试) 扩展 runtime verifier，检查 lock schema、支持下限、ELF Android platform note、PIE、machine、interpreter、系统库依赖和 `PT_LOAD` alignment。(2026-09-01，G1)
- [x] (发布) 修正 `AGENTS.md`、`THIRD_PARTY_NOTICES.md`、README 文案源和本 Roadmap 中关于 Android 13 `close_range` allowlist 的陈述，并在全部 10 语言生成产物中同步 Android 13 下限。(2026-09-01，G1)
- [x] (发布) 为 Android 13 支持建立新的 v0.2.0 changelog，不回写或篡改已经发布的 v0.1.0 历史记录。(2026-09-01，G1)

### M1-B: 自动化与设备验证

- [x] (测试) CI 新增 API 33 `x86_64` instrumentation，并在本地对应 AVD 完成 3/3 测试；覆盖 discovery、binding、metadata、prewarm、JS、TS、Unicode stdout/stderr、真实 `Bun.spawn`、私有目录文件 I/O、timeout、output limit、cancellation 和无效请求。(2026-09-01，G1/G2)
- [x] (测试) 保留 API 35 `x86_64` CI 回归，不以 API 33 job 替代当前平台测试；另在 API 35 arm64 真机完成相同 3/3 套件。(2026-09-01，G1/G2)
- [x] (设备) Sony XQ-DQ72 API 33 `arm64-v8a` 已重新安装 `minSdk=33` 的 v0.2.0 构建并完成完整 instrumentation；环境与范围见 `docs/compatibility/2026-09-01-m1.json`。(2026-09-01，G2)
- [ ] (设备) 补一台不同 OEM 或 Pixel/AOSP 类 API 33 arm64 环境；记录 fingerprint、kernel、page size 和完整测试范围。
- [ ] (发布) 验证从 v0.1.0 覆盖升级、全新安装、Wake 激活、插件发现和进程重启；仅在 G3 完成后把 Android 13 写为正式发布兼容范围。

M1 升阶门: G0/G1 全绿，API 33 `x86_64` AOSP/Google APIs AVD 与至少一台 API 33 `arm64-v8a` 真机完成真实 Bun Binder 往返，API 35 回归无失败。若某 OEM API 33 因不同 seccomp/SELinux 策略失败，先记录并诊断，不通过隐藏错误或伪造 probe 成功扩大支持声明。

## M2: patched Bun 可复现构建

M2 不直接承诺 Android 9-12 可用；它先建立可以审计、重放和替换上游补丁的 native 供应链。

进展记录 (2026-09-02，G0/G1): `tools/bun-runtime/experimental/api28` 已建立独立实验 identity；固定 Bun v1.4.0、PR #39775 的 5 个不可变提交和 22 个 Android-release 依赖 identity；6 个 downstream patch 可从 release commit 确定性重放，其中前 5 个 stable patch ID 与上游一致，第 6 个把可移动 Brotli tag 固定为完整 commit。受影响的兼容代码与固定 PR head 完全一致，Ubuntu base manifest、NDK r27c 下载件、Node headers 和双 ABI WebKit prebuilt 也已有摘要锁。离线 verifier 有 11 个回归测试，CI 会在临时 Bun checkout 中重放整条 patch chain，并核对 28 个 build/dependency definition blob、Brotli patch 前 blob 与无 submodule 事实。由于其余工具链/下载字节锁、双次构建、ELF 审计和设备证据仍为空，`buildReady`、`distributionReady` 与 `runtimeProduced` 均保持 `false`。

- [x] (上游) 固定 Bun stable tag、完整 commit、无 submodule 的 Git tree 证据、22 个 Android-release dependency revision，以及 PR #39775 的 5 个具体补丁提交；开放 PR 更新仍必须人工审阅差异。(2026-09-02，G0/G1)
- [x] (构建) 新增 6 个 versioned downstream patch，每个 patch 记录来源、目的、适用 commit、摘要、许可证影响和上游/本项目归属；清洁重放结果与确定性 commit/tree 均由 CI 验证。(2026-09-02，G1)
- [ ] (构建) 提供清洁环境可复现的 Android build 入口，固定 NDK r27c、Rust/LLVM/Bun 构建环境、API 28 target、CPU baseline 和双 ABI 参数。
- [ ] (构建) 将官方产物和 downstream 产物使用不同的 lock identity、variant 与摘要，防止把自建二进制误报为官方 release artifact。
- [ ] (测试) 对 patched runtime 增加静态门禁: ELF64、PIE、interpreter、Android platform note API 28、`DT_NEEDED` allowlist、bionic 符号版本、`PT_LOAD` alignment、导出/动态符号和 SHA-256。
- [ ] (测试) 对相同源码、工具链和补丁执行至少两次清洁构建并比较可解释差异；若尚未达到 byte-for-byte reproducible，必须固定全部非确定字段并记录差异来源。
- [ ] (发布) 同步 Bun/WebKit/JSC 及其他第三方许可证、源码提供义务、NOTICE 和构建说明；不得仅分发 patched binary 而缺少对应源码与补丁。

M2 升阶门: 任意维护者可在无开发机绝对路径和无未记录缓存的环境中，从固定上游输入生成两个 ABI 的同一受控产物；lock、补丁、工具链、许可证和最终哈希可互相追溯。

## M3: Android 9-12L / API 28-32 实验支持

M3 使用 M2 产出的 patched runtime。所有兼容声明先标为实验性，并继续限定 64 位 ABI 与 `run --no-install` 单源码能力。

### M3-A: seccomp 与 syscall fallback

- [ ] (上游/插件) 在 Bun 第一次 raw syscall 前安全处理 Android `SECCOMP_RET_TRAP`，仅将 `SYS_SECCOMP` trap 转换为 `-ENOSYS`，让已有 fallback 执行；普通用户发送的 `SIGSYS` 仍保持可预期语义。
- [ ] (测试) 为启动和 spawn child 的 `close_range` 验证真实 fallback，并证明 `CLOSE_RANGE_CLOEXEC` 的文件描述符隔离语义没有被无操作替代。
- [ ] (测试) 分别强制 trap 或在目标设备覆盖 `pidfd_open`、`clone3`、`epoll_pwait2`、`copy_file_range`、`openat2` 和 `fchmodat2`，结果必须是 fallback 成功或稳定受控错误，不得 exit 159、hang 或泄漏 FD。
- [ ] (测试) 覆盖 blocked `SIGSYS` mask、`process.on("SIGSYS")`、watch/reload、spawn/spawnSync、timeout、cancellation、强制终止和插件进程重建。

### M3-B: 插件诊断与实验分发

- [ ] (插件/API) 改善 runtime probe 诊断，报告 API、ABI、probe 阶段、退出码、可能的 signal、runtime identity 和有界 stderr；不把设备 fingerprint 或用户内容写入普通 Binder 错误。
- [ ] (插件) 明确失败缓存和重试生命周期，使一次启动失败不会产生不可解释的永久不可用状态，同时避免并发重复启动 probe。
- [ ] (测试) 构建 `minSdk=28` 实验 APK，验证 Java/Kotlin API 28 路径、native payload 提取、只读 `nativeLibraryDir` exec、SELinux 和应用 zygote seccomp 继承。
- [ ] (设备) API 28、29、30、31、32 各完成 `x86_64` AVD instrumentation；Android 12 与 12L 分开记录。
- [ ] (设备) 至少在 API 28、31、32 各一台 `arm64-v8a` 真机运行完整矩阵，并覆盖 AOSP/Pixel 类与至少两种 OEM。
- [ ] (发布) 实验包、PluginInfo、README 和错误信息显式标明仅支持 64 位设备、单源码 `--no-install`、未承诺完整 Bun CLI；提供恢复到 API 33 稳定包的清晰路径。

M3 升阶门: API 28-32 每个版本至少有 G2 证据，所有已知 syscall trap 路径无进程级 `SIGSYS`，API 33-35 无回归。满足前只可发布 experimental/beta，不得将 Android 9 写为稳定支持。

## M4: Android 9+ 稳定化

- [ ] (测试) 完成 API 28-35、`arm64-v8a`/`x86_64`、4 KB/16 KB 页、AOSP 与主要 OEM 的分层矩阵，并把运行报告以机器可读格式归档。
- [ ] (测试) 覆盖 JS、TS、ESM、Unicode、Promise、timer、Worker、文件读写/复制/rename/watch、DNS、TCP、TLS、`fetch`、spawn、timeout、cancellation、output limit、重复绑定和服务进程恢复。
- [ ] (测试) 对每次失败保存有界 logcat/tombstone 摘要和 `si_syscall`；新增 syscall 必须先建立可重放回归测试，再更新兼容结论。
- [ ] (安全) 审计 SIGSYS handler 与 Bun signal、crash、watch、vfork/exec、线程 mask 的交互，确认不会吞掉非 seccomp 信号或把其他安全策略错误改写为成功。
- [ ] (性能) 比较官方与 patched runtime 的冷启动、prewarm、脚本延迟、内存、spawn 和信号 fallback 成本；性能报告与正确性门禁分离。
- [ ] (发布) 完成签名连续性、覆盖升级、全新安装、禁用/启用、Wake、OEM 后台限制、卸载清理和回退验证后，再决定是否把主发行版最低版本正式降到 API 28。

M4 升阶门: Android 9+ 的支持声明由完整 G3 证据支撑；patched runtime 的来源、补丁、许可证和设备矩阵随每个发布版本可追溯，且不存在必须靠二进制热补丁或特定 OEM 放宽策略才能运行的路径。

## M5: 16 KB page size 与发布完整性

- [x] (构建) 当前两个官方 ELF 的所有 `PT_LOAD` segment 至少 16 KB 对齐。
- [ ] (构建/发布) 对 debug/release 的单 ABI 与 universal APK 执行 `zipalign -c -P 16 4`，并核对安装后 `nativeLibraryDir` 字节与 lock SHA-256 一致。
- [ ] (设备) 在真实 16 KB 页 Android 设备或 `google_apis_ps16k` 环境执行完整 Bun Binder instrumentation，并硬断言运行时 `PAGE_SIZE=16384`。
- [ ] (测试) patched Bun 的两个 ABI 重复 ELF/ZIP/安装后 payload/真实执行四层门禁，不从官方 payload 的静态结果推断自建产物兼容。
- [ ] (发布) `appendDigestToReleasedFiles` 验证签名、预期三类 APK、ABI payload、CRC32 与 SHA-256；Release notes 如实区分静态对齐和端到端执行状态。

进展记录 (2026-09-02，G1/G2): 已新增统一 APK verifier、4 个 ZIP/payload 回归测试，并接入 debug CI 与 release 收集任务；它要求三类 APK 集合精确匹配，执行 `zipalign -c -P 16 4`，并对压缩后的 Bun entry 解压核对 ABI、字节数、CRC32 与 runtime lock SHA-256。本地 debug/release 各三份 APK 均已通过。instrumentation 也已增加安装后 `nativeLibraryDir/libbun_exec.so` 的字节数与 SHA-256 断言，Sony XQ-DQ72 API 33 arm64 真机已通过更新后的 4/4 instrumentation；证据见 `docs/compatibility/2026-09-02-m5-payload-integrity.json`。release 安装后摘要和真实 16 KB 页执行仍未完成，因此复合条目保持未勾选。

M5 验收条件: 官方和 patched 发行线各自在宣称支持前完成 ELF、APK ZIP、安装后 payload 和真实 16 KB execution 四层验证。

## M6: 多文件项目执行

- [ ] (API) 定义有界、版本化的 project snapshot archive contract，包含路径规范化、条目数/总大小、symlink、重复路径、权限和 traversal 拒绝规则。
- [ ] (插件) 在每次运行独有的私有 workspace 中原子展开项目，支持相对 ESM import、JS/TS/JSON/asset 和 Unicode path。
- [ ] (API/插件/宿主) 定义 entry point、source map、arguments、受控 environment 和 working directory 语义，不接受任意 shell command。
- [ ] (插件) 为 process death、取消、超时和解压中断增加清理恢复，永远只删除本次 job 的精确目录。
- [ ] (测试) 覆盖 nested import、循环依赖、非法 archive、大小边界、同名大小写路径、损坏输入和进程重启。

M6 验收条件: 新旧 contract 通过 capability negotiation 共存；旧宿主继续使用单源码 v1，项目运行不会扩大到任意宿主文件系统访问。

## M7: AutoJs6 能力桥

- [ ] (API/宿主) 为每项宿主能力设计窄接口、权限模型、版本和能力协商，不把 Java object graph、Rhino globals 或 Android automation internals 直接暴露给 Bun。
- [ ] (API) 定义 Bun 到宿主调用的 cancellation、backpressure、并发、大小限制、错误码和资源所有权。
- [ ] (插件/宿主) 先实现一个低风险、只读、可独立撤销的最小能力，端到端验证后再增加其他自动化接口。
- [ ] (测试) 覆盖插件/宿主版本错配、权限拒绝、宿主进程死亡、Binder backpressure、超时和重连。
- [ ] (发布) 未实现的 Rhino/Node globals 始终明确报错，不静默改变引擎或回退到其他运行时。

M7 验收条件: 每项能力都可单独协商、授权、测试和撤销；Bun 子进程隔离不被宣传为安全沙箱。

## M8: Bun 升级与可选 CLI 能力

- [ ] (上游/构建) 定期只读检查稳定 Bun Android release、#30766、#39775、#39060 及后续替代实现；发现更新只生成审阅信息，不自动合并或发布。
- [ ] (构建) 每次升级同时核对 tag、完整 commit、archive/binary SHA-256、Android API target、NDK、WebKit/JSC revision、许可证、ELF 依赖与 syscall surface。
- [ ] (测试) 新版本先通过官方/patched runtime 差分和 API 28-35 矩阵，再更新插件 variant、共享 API 常量、README、changelog 和 lock。
- [ ] (API/产品) 只有在单源码引擎稳定后，才单独评估 `bun install`、`bunx`、package cache、网络、磁盘、可执行文件和 native addon 的权限与存储模型。
- [ ] (发布) 完整 Bun CLI 若实施，必须作为独立 capability/variant 发布，不得因为脚本引擎能执行 `fetch` 或 `spawn` 就默认宣称 CLI 兼容。

## 风险与回退

| 风险 | 早期信号 | 处理与回退 |
|---|---|---|
| OEM API 33 seccomp/SELinux 差异 | probe `SIGSYS`、`EACCES` 或无法从 `nativeLibraryDir` exec | 保留设备报告，暂缓该 OEM 正式声明；不得通过复制 executable 到可写目录绕过 |
| 新 Bun syscall 在延迟路径触发 | Worker、spawn、watch、network 或 install 首次 exit 159 | 固定 syscall 与负载回归；回到已验证 runtime，不扩大能力声明 |
| 全局 SIGSYS handler 干扰 Bun 信号语义 | 用户信号丢失、watch/reload 或 child 异常 | 关闭实验发行线，回退 API 33 官方 runtime；修复需重新通过信号专项矩阵 |
| FD fallback 不等价 | 子进程继承 Binder/PFD 或私有文件描述符 | 视为安全阻断；不得以性能或兼容为由发布 no-op fallback |
| 自建产物不可复现 | 相同输入得到无法解释的 ELF 差异 | 不更新 lock/二进制；固定工具链、时间戳和依赖后重建 |
| Android 8 需求扩大范围 | API 26/27 loader symbol 或 RELR 失败、32 位设备需求 | 另建里程碑和产物，不削弱 API 28+ 主线门禁 |

## 标准验证入口

静态、文档与构建基线:

```powershell
node tools/bun-runtime/verify-runtime.mjs
node tools/verify-api-artifacts.mjs
py .python/generate_markdown.py --check
py -B -m unittest discover -s .python -p "test_*.py"
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest
.\gradlew.bat :app:lintDebug
```

设备门禁必须通过显式 serial 或 CI AVD 运行，并把设备信息与结果写入报告；不得依赖当时恰好连接的第一台设备。Release 前另需运行签名产物收集、三种 APK 清点、ABI/ZIP/ELF/摘要验证以及安装/升级/Binder smoke test。

## 边界与非目标

- 不把 Bun 描述为 Rhino/Node.js 兼容层，也不为缺失的 AutoJs6 globals 提供隐式回退。
- 不把脚本子进程隔离描述为安全沙箱；脚本仍以插件 UID 和插件权限执行，只能运行受信任代码。
- 不承诺 32 位 ABI、任意 native addon、设备端 C/C++ 编译、从应用可写目录执行二进制或完整 Bun CLI。
- 不为追求更低 Android 版本降低来源锁定、许可证、FD 隔离、Binder 限额、取消/清理或发布签名门禁。
- Android 8/8.1 及更低版本不属于 M1-M4；如启动，必须以独立原生构建、独立兼容矩阵和明确的 64 位限制立项。

## 维护约定

- 完成条目时将 `[ ]` 改为 `[x]`，补充精确落点、验证日期和证据等级；只完成代码但缺设备证据时更新说明，不提前勾选发布条目。
- 兼容范围变化必须同步 `version.properties`、runtime lock、`AGENTS.md`、README 10 语言源、changelog 10 语言源、生成产物、CI 和第三方声明。
- 修改官方或 patched runtime 时，必须同步更新 variant、共享 API 常量、二进制哈希、来源/补丁/工具链记录和许可证。
- Roadmap 条目可细化或重排，但不得删除尚未解决的安全阻断、测试缺口或失败设备记录来制造“已完成”状态。
