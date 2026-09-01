<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>在隔离的 Android 进程中使用独立 Bun 引擎运行 JavaScript 和 TypeScript</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### 语言

******

当前 README.md 支持以下语言:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- 简体中文 [zh-Hans] # 当前
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### 简介

******

Bun Runtime 是一个独立 Android 插件, 让 AutoJs6 可以选择 [Bun](https://bun.sh/) 作为单独的 JavaScript 和 TypeScript 引擎. 宿主通过文件描述符发送一个源码快照, 插件在自己的运行时进程中启动固定版本的官方 Bun Android 可执行文件, 并通过 Binder 返回标准输出, 标准错误, 完成状态, 超时和取消事件. 这是真实的 Bun 执行, 不是 Rhino 或 Node.js 的别名.

******

### 功能

******

- 独立引擎: 运行官方 Bun 1.4.0 Android 可执行文件, 不把代码转交给其他 AutoJs6 引擎.
- JavaScript 和 TypeScript: Bun 解析并运行单个 JS 或 TS 源码快照, 包括 ESM 语法和固定 Android 构建中可用的 Bun API.
- 可观察执行: stdout 和 stderr 流式返回宿主, 最终结果包含退出状态, 耗时, 超时, 取消状态和有界诊断信息.
- 受控运行时载荷: `arm64-v8a` 和 `x86_64` 的发布二进制由 tag, commit, 大小, SHA-256, ELF machine 和最小 PT_LOAD 对齐共同固定.
- 本地化交付: 插件元数据, 插件中心说明, README 和 changelog 由一组经过校验的文案源覆盖 10 种语言.

******

### 安装和使用

******

1. 在 Android 14 (API 34) 或更高版本上使用 AutoJs6 build 5278 (6.8.0) 或更高版本.
2. 安装与设备 ABI 匹配的发布 APK. 大多数手机和平板选择 `arm64-v8a`, 兼容的模拟器或设备选择 `x86_64`, 不确定时选择 `universal`.
3. 打开 AutoJs6 插件中心并启用 Bun Runtime. 如果新安装插件仍处于停止状态, 使用宿主显示的 `激活` 操作.
4. 在 JavaScript 或 TypeScript 文件开头放置独立指令 `"bun";`, 然后像平常一样从 AutoJs6 运行.

> 0.1 版每个请求使用 `bun run --no-install <source>` 执行一个不可变源码快照, 因此绝不会自动安装缺失依赖. 将现有 Rhino 或 Node.js 项目迁移到 Bun 前请先阅读以下限制.

******

### 快速开始

******

运行此文件以确认宿主选择了 Bun 并成功启动 Android 运行时:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

预期输出以 `Bun 1.4.0` 开头, 下一行输出 `android`.

Bun 直接处理 TypeScript, 因此不需要宿主侧 TypeScript 编译:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### 兼容性

******

- 运行时: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 平台: Android 14 (API 34) 或更高版本, 官方 64 位 payload 支持 `arm64-v8a` 和 baseline `x86_64`. API 31 真机上的 Bun syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 终止. 标准 AOSP Android 13 app allowlist 仍缺少该 syscall, API 34 才加入. 一台 Sony API 33 设备意外通过, 但这种设备特定结果不能证明可移植支持. API 35 真机 JS 和 TS Binder 往返已通过. API 28 到 33 仍不在支持范围内, 需要等待上游 fallback 和可移植验证.
- 宿主契约: AutoJs6 build 5278 或更高版本, Bun runtime contract version 1.
- 请求边界: 源码最大 16 MiB, stdout 和 stderr 组合流式预算最大 8 MiB, 默认超时为 60 seconds.
- 安装包: 单 ABI APK 体积更小, 较大的 `universal` APK 同时包含两个受支持 ABI.

******

### 0.1 版限制

******

- 仅支持一个源码快照: 此版本未实现多文件项目传输和相对项目导入.
- 没有 AutoJs6 globals: Rhino 全局对象, Android 自动化 API 和宿主对象不会出现在 Bun 中.
- 没有 Java bridge: Bun 不能直接访问 AutoJs6 进程中的 Java 类或对象.
- 不承诺完整工具链: `bunx`, 设备端生成的可执行文件, runtime C compilation 和任意 native addon 不在支持范围内.
- 不是安全沙箱: Bun 脚本以受信任代码身份在插件 app UID 下运行, 并可使用授予插件的权限.

******

### 权限和完整性

******

- 导出的 Wake, info 和 runtime 组件由 `org.autojs.permission.PLUGIN` 保护. AutoJs6 仍会执行正常的插件授权检查.
- 源码快照暂存在每次运行独有的私有目录. 可执行文件从 Android 只读 native library directory 启动, 不会复制到可写存储后执行.
- 仓库 lock 同时记录官方 release archive 和已打包 binary. CI 会在构建前拒绝大小, SHA-256, ELF type, machine 或 alignment 漂移.
- 插件声明网络访问权限, 因为受信任的 Bun 脚本可能使用 `fetch` 等网络 API. 插件不是沙箱, 请只运行你信任的脚本.

******

### 常见问题

******

#### 为什么 Bun 中没有 AutoJs6 globals?

Bun 是单独的进程和 JavaScript 引擎, 不是 Rhino 兼容层. 未来的宿主桥接必须明确公开每项自动化能力, 0.1 版有意不提供这种桥接.

#### 脚本可以导入另一个本地项目文件吗?

0.1 版不可以. 契约只传输一个源码快照, 尚不传输项目目录树, 因此无法解析相对项目导入. 单文件 ESM 语法仍受支持.

#### 插件支持 16 KB page-size 设备吗?

两个已打包 ELF executable 的 PT_LOAD alignment 均至少为 16 KB. 尚未完成真实 16 KB Android runtime 测试, 因此此版本不声称已验证端到端 16 KB 支持.

#### 应该安装哪个 APK?

大多数 Android 实体设备使用 `arm64-v8a`. 兼容的模拟器或 x86_64 设备使用 baseline `x86_64`. `universal` 同时包含两者, 在 ABI 未知时最稳妥.

******

### 插件接口

******

以下稳定标识和限制面向 AutoJs6 宿主和插件开发者:

```text
application id: io.github.supermonster003.autojs6.plugin.bun.runtime
plugin id: bun-runtime
engine: bun
variant: bun-1.4.0-android
service action: org.autojs.plugin.bun.RUNTIME
service category: bun
aidl interface: org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
contract version: 1
aidl methods: getInfo(), getRuntimeInfo(), runScript(request, source, callback), cancelScript(executionId), prewarmRuntime()
minimum host build: 5278 (6.8.0)
source limit: 16 MiB
combined stdout/stderr streaming budget: 8 MiB
default timeout: 60 seconds
```

`BunRuntimeService` 通过 action `org.autojs.plugin.bun.RUNTIME` 和 category `bun` 被发现. 它通过 `ParcelFileDescriptor` 接收源码, 从请求中接收 execution ID, 并在同步 `runScript` 调用保持活动期间执行 `bun run --no-install <source>`. Stdout 和 stderr 仅作为有界分块通过 oneway callback 发送. 返回的 terminal Bundle 和 `finished` event 只包含状态和诊断摘要字段, 从不携带完整输出流, 从而让每次 Binder transaction 保持在大小限制以内. 服务支持显式取消和 runtime prewarming, 并运行在 `:bun_runtime`.

16 KB 状态: 已打包的 `arm64-v8a` 和 `x86_64` ELF PT_LOAD segment 满足 16 KB alignment 要求. 尚未在真实 16 KB Android 设备或模拟器上运行, 因此目前仅验证了 ELF alignment.

******

### 路线图

******

路线图会区分当前行为和计划中的项目快照, 狭窄 AutoJs6 capability bridge, 更广泛 Android 验证以及后续 Bun 升级. 未勾选项目代表计划, 不代表当前已支持.

- [查看 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 发行历史

******

#### v0.1.0

_2026/09/01_

- `提示` 首个版本每次运行一个源码快照, 不提供 AutoJs6 globals, Java bridge, 多文件项目或相对项目导入
- `新增` 使用官方 Bun 1.4.0 Android executable 作为独立 `bun` 引擎运行 JavaScript 和 TypeScript, 通过 `"bun";` 指令选择, 并使用 `bun run --no-install <source>` 避免自动安装依赖
- `新增` 仅通过有界 oneway Binder callback 分块流式返回 stdout 和 stderr, terminal result 只报告状态和诊断, 不携带完整输出流
- `新增` 在隔离的 `:bun_runtime` 插件进程中支持显式取消, 60 秒默认 timeout, runtime information 和 prewarming
- `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 Android payload, 以及单 ABI 和 `universal` 安装包
- `新增` 提供插件发现, 受保护的 Wake 激活, 完整 PluginInfo metadata 和 10 种语言用户文档
- `优化` 使用版本化 Binder contract, 通过 ParcelFileDescriptor 传输源码, 源码上限为 16 MiB, 组合输出上限为 8 MiB
- `优化` 从 Android 只读 native library directory 启动 Bun, 并验证固定 release archive 和 packaged binary 的大小, SHA-256, ELF type, machine 和 alignment
- `优化` 验证两个已打包 executable 的 PT_LOAD alignment 均至少为 16 KB, 同时明确记录尚未完成真实 16 KB Android runtime 测试
- `优化` 从经过校验的 JSON source 生成 README, 插件中心说明和内置 changelog asset, 并加入 build, Markdown 和 runtime artifact CI 检查
- `优化` 将最低版本设为 Android 14 (API 34), 因为 API 31 真机上的 Bun syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 终止. 一台 Sony API 33 设备意外通过但不能证明可移植支持, API 35 真机 JS 和 TS Binder 往返已通过, 更低版本需等待上游 fallback

##### 更多发行历史

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hans.md)

******

### 构建和验证

******

验证或 Gradle 打包前必须由 Git LFS 实体化两个固定运行时二进制. 下方是标准本地检查. 构建需要 JDK 17 或更高版本, Node.js 和 Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### 本地化和文档生成

******

编辑 JSON 和 Markdown 模板后运行 `py .python/generate_markdown.py`. 不要手工编辑生成的 README, changelog 或 plugin-instruction 文件. `--check` 会在不写入文件的情况下校验语言结构, 版本对齐, 本地化资源, 孤立产物和生成文件漂移.

```text
.readme/common.json
.readme/lang_*.json
.readme/template_readme.md
.readme/template_plugin_instruction.md
.changelog/lang_*.json
.changelog/template_changelog.md
.python/generate_markdown.py
app/src/main/assets/doc/CHANGELOG-*.md
app/src/main/res/values*/strings.xml
app/src/main/res/raw*/plugin_instruction.md
```

******

### 许可证

******

插件代码采用 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). 随附的官方 Bun executable 包含 Bun 的 MIT 许可代码, 以 LGPL-2 许可静态链接的 JavaScriptCore 和 WebKit, 以及使用各自许可证的其他第三方组件. 请查看 [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 和固定版本的 Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### 链接

******

- AutoJs6 项目: https://github.com/SuperMonster003/AutoJs6
- Bun 官方网站: https://bun.sh/
- 固定的 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三方声明: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
