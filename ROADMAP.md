# AutoJs6 Bun Runtime 插件 Roadmap

更新日期: 2026-09-08

这份路线图回答三个问题: 插件现在能做什么, 接下来要做什么, 以及每一项凭什么算 "做完了". 它同时写给想了解进展的用户和参与开发验证的维护者.

一句话概括方向: 插件从 "单个脚本文件的独立 Bun 引擎" (已完成) 出发, 依次走向 "Android 13 正式基线" (v0.2.0 已发布, 升级验证待补), "Android 9 至 12L 实验支持" (独立应用进程探针已落地, 功能探针通过但强制终止门禁失败), 以及更远的 "多文件项目执行" 与 "受控的 AutoJs6 能力桥" (未开始).

## 当前状态速览

| 分类 | 内容 |
|---|---|
| 现在可用 | 在 Android 13+ (API 33+) 的 64 位设备上, 脚本首行写 `"bun";` 即可用官方 Bun 1.4.0 运行 JavaScript / TypeScript 单文件; 输出实时回传, 支持取消, 超时与预热 |
| 正在推进 | v0.2.0 发布后的升级与生命周期验证 (M1), patched Bun 的同 Release 对应源码实际发布 (M2), Android 9-12L 应用进程矩阵与强制终止修复 (M3), 16 KB 页与发布完整性 (M5), 文档与开发者体验 (M9) |
| 尚未开始 | Android 9+ 稳定化 (M4), 多文件项目执行 (M6), AutoJs6 能力桥 (M7) |
| 最大障碍 | patched runtime 已在 API 28/31/33/35 原生 arm64 应用进程通过 10 项功能探针, 但忽略 SIGTERM 的超时/输出超限进程不能被当前 Java 终止路径有界回收; 完整 Binder、API 29/30/32、x86_64 与 patched paired APK/source Release 仍待完成 |

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
| M2 patched Bun 可复现构建 | 构建与源码发布流程完成, patched 分发待验收 | 两轮双 ABI 清洁构建逐字节一致; 官方 v0.2.0 已通过 paired APK/source 发布验证, patched 线仍未发布 | 上游/构建/测试/发布 |
| M3 Android 9-12L 实验支持 | 进行中, 强制终止阻断 | 独立应用进程探针已有真机证据, 完整插件/Binder 与剩余设备矩阵仍待完成 | 插件/测试/设备/发布 |
| M4 Android 9+ 稳定化 | 等待 M3 | syscall, FD, 进程生命周期和 OEM 矩阵闭环后, 实验支持才能转正 | 测试/设备/发布 |
| M5 16 KB 页与发布完整性 | 进行中 | ELF, APK ZIP, 安装后 payload 和真实 16 KB 执行四层验证 | 构建/测试/设备/发布 |
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
- [ ] (插件/测试) 通过正式插件 Binder 重现并修复忽略 SIGTERM 的脚本终止路径; M3 独立探针已暴露同一 Java 方法的局限, 之前的合作式 timeout/cancellation 验收不覆盖该场景.

**M1 升阶门:** G0/G1 全绿; API 33 `x86_64` AOSP/Google APIs AVD 与至少一台 API 33 `arm64-v8a` 真机完成真实 Bun Binder 往返; API 35 回归无失败. 若某 OEM API 33 因不同 seccomp/SELinux 策略失败, 先记录并诊断, 不通过隐藏错误或伪造 probe 成功来扩大支持声明.

## M2: patched Bun 可复现构建

**目标:** 在动 Bun 源码之前, 先建立一条任何维护者都能审计, 重放和复现的 native 供应链.

**为什么:** M3 要给 Android 9-12 使用打过补丁的 Bun; 如果补丁和构建过程不可复现, 就无法证明发布的二进制确实来自声称的源码. 注意: M2 本身不承诺 Android 9-12 可用.

**已落地 (进展记录, 2026-09-03, G0/G1; 另有明确受限的 G2 shell-domain 证据):**

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

## M3: Android 9-12L / API 28-32 实验支持

**目标:** 用 M2 产出的 patched runtime, 让 Android 9 到 12L 的 64 位设备也能运行脚本.

**边界:** 所有兼容声明先标为实验性, 并继续限定 64 位 ABI 与 `run --no-install` 单源码能力.

### M3-A: seccomp 与 syscall fallback

- [x] (构建/测试/设备) 新增独立 test-only APK 工具 [app-probe](tools/bun-runtime/experimental/api28/app-probe/README.md), 不注册为 AutoJs6 插件、不使用正式签名或替换官方 payload. 输入两轮锁定 ELF, 输出双 ABI 单包, 核验真实 Manifest、APK 签名、16 KB ZIP 对齐及精确 payload. Sony G8441 API 28、Sony XQ-AT72 API 31、Redmi 22120RN86C API 33、Xiaomi 23046RP50C API 35 均在原生 arm64 / 4096-byte 页、普通应用 UID、untrusted_app、seccomp=2 下从只读 nativeLibraryDir 执行. (2026-09-08, G1/G2)
- [x] (设备) 上述四台真机各运行两轮: version/revision、子进程应用域、JS/TS/Unicode/stdout+stderr、spawn/spawnSync、文件 I/O、loopback fetch、普通用户 SIGSYS 与终止后新执行这 10 项通过. 每轮 12 项中强制终止的 2 项失败, 总体结果明确为 failed; force-stop 与探针卸载后已确认无探针 UID 残留进程. 完整证据见 [M3 应用进程报告](docs/compatibility/2026-09-08-m3-application-probe.json). (2026-09-08, G2, 不是完整 Binder 通过)
- [ ] (插件/测试, 下一优先项) 修复忽略 SIGTERM 时的真正强制终止: 四台设备的 timeout/output-limit 探针均在 destroy() -> destroyForcibly() -> 有界 wait 后仍未退出. 本地 API 28/31/35 SDK 源码显示 Process 的默认 destroyForcibly() 仍委托 destroy(), UNIXProcess 未覆盖该方法, 与观测一致. 必须建立可靠的进程身份与回收机制, 不能通过删除 SIGTERM handler、延长等待或放宽测试制造通过; 同时为正式插件补充 Binder 回归.

- [ ] (上游/插件) 在 Bun 第一次 raw syscall 前安全处理 Android `SECCOMP_RET_TRAP`, 仅将 `SYS_SECCOMP` trap 转换为 `-ENOSYS`, 让已有 fallback 执行; 普通用户发送的 `SIGSYS` 仍保持可预期语义.
- [ ] (测试) 为启动和 spawn child 的 `close_range` 验证真实 fallback, 并证明 `CLOSE_RANGE_CLOEXEC` 的文件描述符隔离语义没有被无操作替代.
- [ ] (测试) 分别强制 trap 或在目标设备覆盖 `pidfd_open`, `clone3`, `epoll_pwait2`, `copy_file_range`, `openat2` 和 `fchmodat2`, 结果必须是 fallback 成功或稳定受控错误, 不得 exit 159, hang 或泄漏 FD.
- [ ] (测试) 覆盖 blocked `SIGSYS` mask, `process.on("SIGSYS")`, watch/reload, spawn/spawnSync, timeout, cancellation, 强制终止和插件进程重建.

### M3-B: 插件诊断与实验分发

- [ ] (插件/API) 改善 runtime probe 诊断, 报告 API, ABI, probe 阶段, 退出码, 可能的 signal, runtime identity 和有界 stderr; 不把设备 fingerprint 或用户内容写入普通 Binder 错误.
- [ ] (插件) 明确失败缓存和重试生命周期, 使一次启动失败不会产生不可解释的永久不可用状态, 同时避免并发重复启动 probe.
- [ ] (测试) 构建 `minSdk=28` 实验 APK, 验证 Java/Kotlin API 28 路径, native payload 提取, 只读 `nativeLibraryDir` exec, SELinux 和应用 zygote seccomp 继承.
- [ ] (设备) API 28, 29, 30, 31, 32 各完成 `x86_64` AVD instrumentation; Android 12 与 12L 分开记录.
- [ ] (设备) 至少在 API 28, 31, 32 各一台 `arm64-v8a` 真机运行完整矩阵, 并覆盖 AOSP/Pixel 类与至少两种 OEM.
- [ ] (发布) 实验包, PluginInfo, README 和错误信息显式标明仅支持 64 位设备, 单源码 `--no-install`, 未承诺完整 Bun CLI; 提供恢复到 API 33 稳定包的清晰路径.

**M3 升阶门:** API 28-32 每个版本至少有 G2 证据; 所有已知 syscall trap 路径无进程级 `SIGSYS`; API 33-35 无回归. 满足前只可发布 experimental/beta, 不得将 Android 9 写为稳定支持.

## M4: Android 9+ 稳定化

**目标:** 把 M3 的 "实验性" 变成可以写进 README 的正式支持 -- 前提是测试矩阵, 信号处理, 性能和发布验证全部闭环.

- [ ] (测试) 完成 API 28-35, `arm64-v8a`/`x86_64`, 4 KB/16 KB 页, AOSP 与主要 OEM 的分层矩阵, 并把运行报告以机器可读格式归档.
- [ ] (测试) 覆盖 JS, TS, ESM, Unicode, Promise, timer, Worker, 文件读写/复制/rename/watch, DNS, TCP, TLS, `fetch`, spawn, timeout, cancellation, output limit, 重复绑定和服务进程恢复.
- [ ] (测试) 对每次失败保存有界 logcat/tombstone 摘要和 `si_syscall`; 新增 syscall 必须先建立可重放回归测试, 再更新兼容结论.
- [ ] (安全) 审计 SIGSYS handler 与 Bun signal, crash, watch, vfork/exec, 线程 mask 的交互, 确认不会吞掉非 seccomp 信号或把其他安全策略错误改写为成功.
- [ ] (性能) 比较官方与 patched runtime 的冷启动, prewarm, 脚本延迟, 内存, spawn 和信号 fallback 成本; 性能报告与正确性门禁分离.
- [ ] (发布) 完成签名连续性, 覆盖升级, 全新安装, 禁用/启用, Wake, OEM 后台限制, 卸载清理和回退验证后, 再决定是否把主发行版最低版本正式降到 API 28.

**M4 升阶门:** Android 9+ 的支持声明由完整 G3 证据支撑; patched runtime 的来源, 补丁, 许可证和设备矩阵随每个发布版本可追溯, 且不存在必须靠二进制热补丁或特定 OEM 放宽策略才能运行的路径.

## M5: 16 KB page size 与发布完整性

**目标:** 保证发布的每个 APK 从 ELF 对齐到安装后字节都可验证, 并最终在真实 16 KB 页环境跑通. 背景: 新的 Android 设备可能使用 16 KB 内存页, `PT_LOAD` 对齐不足的可执行文件在这类设备上无法加载.

**已落地 (进展记录, 2026-09-02, G1/G2):**

- 新增统一 APK verifier 和 4 个 ZIP/payload 回归测试, 已接入 debug CI 与 release 收集任务.
- verifier 要求三类 APK 集合精确匹配, 执行 `zipalign -c -P 16 4`, 并对压缩后的 Bun entry 解压核对 ABI, 字节数, CRC32 与 runtime lock SHA-256; 本地 debug/release 各三份 APK 均已通过.
- instrumentation 增加了安装后 `nativeLibraryDir/libbun_exec.so` 的字节数与 SHA-256 断言; Sony XQ-DQ72 API 33 arm64 真机已通过更新后的 4/4 instrumentation, 证据见 `docs/compatibility/2026-09-02-m5-payload-integrity.json`.
- instrumentation 新增可选 `requiredPageSizeBytes` 硬断言; runtime ABI 改为由安装后 payload 的锁定 SHA-256 识别, prewarm 在版本与 revision 后执行最小 `--eval "void 0"` 探针, 避免把只能显示版本但无法执行脚本的 runtime 报告为 ready.
- Android 16 / API 36 x86_64 16 KB AVD 已完成双路径验证: `arm64-v8a` 单 ABI APK 经 `libndk_translation` 完整 5/5 Binder instrumentation 通过, 原生 `x86_64` 则连 `-e 42` 都稳定以 exit 134 中止; 关闭 regexp JIT, 全部 JIT 或 `--smol` 均无效. 双路径报告见 `docs/compatibility/2026-09-02-m5-16kb-execution.json`.
- 原生 x86_64 阻断已通过同一 payload 的 API 36 4 KB 对照, 插件 UID/root 对照和双 `strace` 收敛到 pinned WebKit `WTF::pageSize()` 的 4 KB 编译期 ceiling: 4 KB 环境继续创建 `JSJITCode`, 16 KB 环境则在首次 JIT mapping 前主动 abort. prewarm 现对该已知组合在启动 Bun 前返回有界诊断; 根因报告见 `docs/compatibility/2026-09-02-m5-x86-16kb-root-cause.json`.
- 已安装的 API 36 arm64 16 KB system image 与 AVD 配置完整, 但 Android Emulator 37.1.11 在当前 Intel x86_64 宿主明确拒绝启动 arm64 guest; AVD 保持原样, 原生 arm64 证据仍需 ARM64 宿主或真机.
- 2026-09-08 已补齐官方 v0.2.0 release 的 arm64-only/universal 安装后 APK 与原生 arm64 payload 摘要, 以及 13 个公开资产的完整性验证. 原生 arm64 16 KB 执行和原生 x86_64 large-page 修复仍未完成, 因此 M5 不扩大通用 16 KB 支持声明.

条目清单:

- [x] (构建) 当前两个官方 ELF 的所有 `PT_LOAD` segment 至少 16 KB 对齐.
- [x] (构建/发布) debug/release 三类 APK 均通过 `zipalign -c -P 16 4` 与包内摘要验证; 最终 v0.2.0 arm64-only/universal 的原生 arm64 安装后 `nativeLibraryDir` 摘要已通过真机验证, 见 [发布报告](docs/compatibility/2026-09-08-v0.2.0-release.json). (2026-09-08, G1/G2)
- [ ] (设备/发布) 补齐最终签名 x86_64 APK 的安装后摘要与完整原生执行验收, 不用 debug CI 代替最终签名产物测试.
- [x] (设备) 在 Android 16 / API 36 `google_apis_ps16k` AVD 硬断言 `PAGE_SIZE=16384`, 并以 `arm64-v8a` 单 ABI APK 经原生翻译桥完成 5/5 Bun Binder instrumentation. (2026-09-02, G2; 明确不等同于原生 arm64 证据)
- [ ] (设备/x86_64) pinned WebKit 的 x86_64 `CeilingOnPageSize=4 KB` 根因已收敛, 插件也会在 `PAGE_SIZE>4096` 时无崩溃拒绝; 仍须以显式且已审阅的 large-page/JIT/allocator 配置重建 WebKit 与 Bun, 并在 4 KB/16 KB 双环境重复完整 Binder instrumentation 后才能勾选.
- [ ] (设备/arm64) 在原生 arm64 16 KB 真机或 ARM64 宿主 AVD 上重复完整 instrumentation; 当前 Intel 宿主无法启动已安装的 arm64 guest, 不从 x86_64 AVD 的 `libndk_translation` 结果推断原生兼容.
- [ ] (测试) patched Bun 的两个 ABI 重复 ELF/ZIP/安装后 payload/真实执行四层门禁: 两轮 ELF 已逐字节复现; 独立 test-only 双 ABI APK 的 ZIP/payload 验证和 4 KB arm64 安装后摘要已完成, 但完整生命周期、x86_64 应用进程和原生 16 KB 执行仍未完成.
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
- [ ] (发布) 新增 `docs/troubleshooting.md` 排错指南: 按 "症状 -> 原因 -> 处理" 组织常见问题 (`"bun";` 指令未被识别, 插件未激活, 运行超时, 输出被截断, Android 版本过低导致的 `SIGSYS`, npm 依赖导入失败), 与 10 语言 README 的常见问题口径一致.
- [ ] (发布) 把 `docs/compatibility/*.json` 设备报告汇总为人类可读的兼容矩阵 (设备, API, ABI, 页大小, 测试范围, 结论), 并在新增设备报告时同步更新; 优先用脚本从 JSON 生成, 避免手工维护漂移.
- [ ] (插件/发布) 审计脚本运行失败时用户可见的错误与诊断文案, 确保关键失败场景 (未激活, 超时, 输出超限, 系统版本不支持) 在 10 种语言资源中都有可理解的提示, 并与 `strings.xml` 保持一致.

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
