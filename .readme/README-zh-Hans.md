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

Bun Runtime 是 AutoJs6 的独立插件, 为 AutoJs6 增加一个可选的现代脚本引擎: [Bun](https://bun.sh/). 安装并启用后, 只要在 JavaScript 或 TypeScript 文件的第一行写上 `"bun";`, 这个文件就会交给真正的 Bun 1.4.0 引擎执行, 而不再使用 AutoJs6 内置的 Rhino 引擎. 现代 JavaScript 语法, TypeScript 以及 `fetch` 等 Bun 内置 API 因此可以直接在 Android 设备上使用.

插件的工作方式很简单: AutoJs6 把脚本内容发给插件, 插件在自己的独立进程中启动官方 Bun Android 可执行文件运行脚本, 并把输出和运行结果实时传回 AutoJs6 控制台. 这是货真价实的 Bun, 不是 Rhino 或 Node.js 的别名或模拟层.

******

### 安装和使用

******

1. 准备环境: 在 Android 13 (API 33) 或更高版本系统上, 安装 AutoJs6 build 5278 (6.8.0) 或更高版本.
2. 安装插件: 从 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) 下载并安装与设备匹配的 APK. 大多数手机和平板选择 `arm64-v8a`, 模拟器或 x86_64 设备选择 `x86_64`, 不确定时选择 `universal` (体积稍大, 两类设备均可用).
3. 启用插件: 打开 AutoJs6 的插件中心并启用 Bun Runtime. 如果新安装的插件显示为停止状态, 点击宿主提供的 `激活` 操作即可.
4. 运行脚本: 在 JavaScript 或 TypeScript 文件的第一行单独写上 `"bun";` (含引号和分号), 然后像平常一样在 AutoJs6 中运行这个文件.

> 每次运行只执行当前文件的一份快照 (实际命令为 `bun run --no-install <source>`), 插件不会自动安装 npm 依赖, 也不会读取项目中的其他文件. 把现有 Rhino 或 Node.js 项目迁移到 Bun 之前, 请先阅读下方的当前限制.

******

### 快速开始

******

把下面的内容保存为脚本文件并运行, 即可确认 Bun 引擎已接管执行:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

如果一切正常, 输出第一行为 `Bun 1.4.0`, 第二行为 `android`.

TypeScript 文件同样可以直接运行, 无需预先编译或额外配置:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

更多带注释, 可直接复制运行的示例见 [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples), 涵盖网络请求, 私有工作目录文件读写, stdout/stderr 和 TypeScript 类型. 所有示例均遵守当前单源码与 `--no-install` 边界.

******

### 功能

******

- 真正的 Bun 引擎: 脚本由官方 Bun 1.4.0 Android 可执行文件直接执行, 不做转译, 也不转交给 AutoJs6 的其他引擎.
- TypeScript 开箱即用: TS 文件无需编译和额外配置即可直接运行, 现代 JavaScript 语法, 单文件内的 ESM 语法以及固定 Android 构建中提供的 Bun API 均可使用.
- 运行过程一目了然: `console.log` 等输出实时回传 AutoJs6 控制台, 运行结束后报告退出状态, 耗时以及是否超时或被取消.
- 稳定且可控: 每个脚本在隔离的插件进程中运行, 可随时取消, 超时自动终止, 即使脚本异常也不影响 AutoJs6 自身.
- 引擎来源可验证: 内置 Bun 可执行文件与官方发布逐字节对应, tag, commit, 大小, SHA-256 和 ELF 属性在构建和 CI 中强制校验.
- 完整的多语言交付: 插件资料, 插件中心说明, README 和更新日志覆盖 10 种语言, 全部由同一套经过校验的文案源自动生成.

******

### 当前限制

******

- 只运行单个文件: 插件每次接收并执行一个源码快照, 不传输项目目录, 因此 `import './utils.js'` 这类相对路径导入无法解析. 单文件内部的 ESM 语法不受影响; 需要多个模块时, 可先在电脑上打包为单文件 (见常见问题).
- 没有 AutoJs6 内置函数: `click()`, `toast()` 等自动化 API 和 Rhino 全局对象在 Bun 脚本中不存在, Bun 脚本目前适合计算, 文本处理, 网络请求等不依赖宿主能力的任务.
- 没有 Java bridge: Bun 脚本无法直接访问 AutoJs6 进程中的 Java 类或对象.
- 不承诺完整的 Bun 工具链: `bunx`, 设备端生成可执行文件, 运行时 C 编译和任意 native addon 均不在支持范围内.
- 不是安全沙箱: Bun 脚本以受信任代码身份在插件进程中运行, 可以使用授予插件的权限, 请只运行你信任的脚本.

******

### 常见问题

******

#### 为什么在 Bun 脚本里用不了 `click()`, `toast()` 这些 AutoJs6 函数?

Bun 运行在独立进程中, 是与 Rhino 完全不同的 JavaScript 引擎, 因此 AutoJs6 的全局函数不会出现在 Bun 脚本中. 让 Bun 脚本调用自动化能力需要宿主逐项显式开放的 bridge, 当前版本有意暂不提供, 相关计划见路线图.

#### 可以使用 npm 包吗?

不能在设备上安装. 插件固定以 `--no-install` 方式运行, 不会下载任何依赖. 如果确实需要第三方库, 可以先在电脑上用 `bun build` 等工具把脚本和纯 JS 依赖打包成单个文件, 再放到设备上运行; 依赖 native addon 的包无法通过这种方式使用.

#### 可以 `import` 项目里的其他文件吗?

当前不可以. 插件契约只传输一个源码快照, 不传输项目目录, 相对路径导入因此无法解析. 多文件项目支持已列入路线图, 单文件内部的 ESM 语法可正常使用.

#### 为什么至少需要 Android 13?

Bun 会调用 Linux 的 `close_range` 系统调用 (syscall 436), 而 Android 12L 及更早系统的应用 seccomp 允许清单不包含它, Bun 进程会直接被 `SIGSYS` 信号终止 (已在 API 31 真机复现). Android 13 起系统放行该调用, API 33 和 API 35 真机测试均已通过. 支持更低版本需要为 Bun 打补丁, 相关进展见路线图.

#### 脚本超时或输出超限会发生什么?

单次运行默认限时 60 seconds, 超时后 Bun 进程会被终止并在结果中标记超时. stdout 和 stderr 合并输出超过 8 MiB 时, 运行会以输出超限错误结束, 而不是静默截断. 遇到这两种情况, 请拆分任务或减少打印量.

#### 支持 16 KB page size 设备吗?

两个内置 ELF 可执行文件与所有 APK entry 均通过 16 KB alignment 门禁. 在 Android 16 (API 36) 16 KB AVD 上, `arm64-v8a` APK 经 `libndk_translation` 完整通过 5 项 Binder 测试, 但原生 `x86_64` payload 连最小脚本也会以 exit code 134 中止; 原生 arm64 尚未验证. 这只是部分证据, 因此当前版本仍不声称普遍支持 16 KB.

#### 应该安装哪个 APK?

绝大多数手机和平板使用 `arm64-v8a`. 模拟器或 x86_64 设备使用 baseline `x86_64`. 不确定时安装 `universal`, 它同时包含两种 ABI, 体积稍大但最稳妥.

******

### 兼容性

******

- 引擎: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 系统: Android 13 (API 33) 或更高版本, 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位可执行文件. Android 9 到 12L (API 28 到 32) 暂不支持, 原因见上方常见问题. API 33 和 API 35 真机测试均已通过.
- 宿主: AutoJs6 build 5278 或更高版本, Bun runtime contract version 1.
- 单次运行上限: 源码最大 16 MiB, stdout 和 stderr 合并输出最大 8 MiB, 默认超时 60 seconds.
- 安装包: 单 ABI APK 体积更小, 较大的 `universal` APK 同时包含两个受支持的 ABI.

******

### 权限和完整性

******

- 对外导出的激活 (Wake), 信息和运行组件均受 `org.autojs.permission.PLUGIN` 权限保护, AutoJs6 侧仍会执行常规的插件授权检查.
- 脚本快照存放在每次运行专用的私有目录中, Bun 可执行文件从 Android 只读 native library 目录启动, 不会复制到可写存储后再执行.
- 仓库 lock 文件同时记录官方 release archive 和打包进 APK 的 binary, 大小, SHA-256 或 ELF 属性一旦发生偏差, CI 会在构建前拒绝.
- 插件声明网络权限, 因为受信任的 Bun 脚本可能使用 `fetch` 等网络 API. 插件不是沙箱, 请只运行你信任的脚本.

******

### 插件接口

******

本节面向 AutoJs6 宿主和插件开发者, 普通用户可以跳过. 以下为稳定标识和上限:

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

16 KB 状态: 两种 ELF payload 及其 APK entry 均通过 alignment 门禁. 在 Android 16 (API 36) 16 KB AVD 上, `arm64-v8a` 经 `libndk_translation` 完整通过 5 项 Binder 测试, 但原生 `x86_64` 连最小脚本也会以 exit code 134 中止; 原生 arm64 尚未验证. 当前不声称普遍支持 16 KB.

******

### 路线图

******

路线图回答两个问题: 现在能用什么, 接下来做什么. 已勾选条目描述当前版本的实际行为; 未勾选条目 (多文件项目, AutoJs6 能力 bridge, 更广泛的 Android 版本支持, Bun 升级等) 是计划, 不代表当前已支持.

- [查看 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 发行历史

******

#### v0.2.0

_2026/09/01_

- `提示` 本版本将最低系统要求从 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支持, 需等待补丁版 Bun runtime 通过可移植性验证
- `修复` 不再按 ABI 表的遍历顺序猜测已安装 runtime, 改用锁定 payload 的 SHA-256 识别实际 ABI; prewarm 还会执行最小 JavaScript smoke test, 在用户脚本启动前拒绝无法执行的 runtime
- `修复` 当 Android 使用超过 4 KiB 的页面时, 在启动 process 前拒绝已知不兼容的官方 x86_64 runtime; 已将故障收敛到 pinned JavaScriptCore 的 4 KiB page-size ceiling, 以有界诊断取代确定性的 Bun abort
- `优化` 降低最低系统要求: 继续使用固定的官方 Bun 1.4.0 Android payload, 将支持下限从 Android 14 (API 34) 放宽至 Android 13 (API 33), 覆盖更多设备
- `优化` 查明低版本不可用的根本原因: Android 13 起系统 seccomp 放行 Bun 调用的 raw `close_range` syscall, 而 API 31 真机失败证明 API 28 到 32 需要修改 Bun 本身, 仅修改 manifest 无法解决
- `优化` 为未来支持 Android 9+ 打基础: 建立可精确重放的 Bun 源码补丁方案 (6 个补丁) 并锁定构建输入 (固定 NDK 与容器, 22 个 Android release 活跃依赖); 补丁版 runtime 尚未构建, 也不会进入当前安装包
- `优化` 加强安装包质量检查: 每个 Debug 和 Release APK 均验证 16 KB ZIP alignment, 精确 ABI 内容以及固定 Bun payload 的大小与 SHA-256, 并在 Android 13 测试设备上核对已安装的 payload 字节
- `优化` 加固供应链: 锁定 19 个 Bun source archive 与 17 个工具链下载件的精确字节, 盘点 181 个 Cargo 和 172 个 Bun registry integrity 条目, 新增拒绝覆盖的 materializer 和受 `buildReady` 闸门保护的双 ABI 构建预检
- `优化` 扩充可复制运行的示例库: 新增带注释的网络 fetch, 私有工作目录文件读写, stdout/stderr 流式输出和更完整的 TypeScript 类型示例; 文档门禁会检查首行 `"bun";` 指令以及单源码和禁止安装依赖的边界
- `优化` 在强制 PAGE_SIZE=16384 的 Android 16 (API 36) AVD 验证 16 KB 执行: `arm64-v8a` 单 ABI APK 经 `libndk_translation` 完整通过 5 项 Binder instrumentation, 但原生 `x86_64` payload 连最小脚本也会以 exit code 134 中止, 因此仍不声称普遍支持 16 KB
- `优化` 闭合 Android 9+ 实验构建供应链的 Cargo 部分: 锁定并真实物化全部 181 个 crates.io archive (26,354,160 bytes), 生成带逐文件 checksum 的 directory source, 并证明固定 Cargo 可在空 `CARGO_HOME` 下以 `--locked --offline` 读取完整 Bun workspace; 主机 package 闭包仍未完成
- `优化` 闭合该供应链的 Bun registry 部分: 将 172 个 lock 引用解析为 Linux x64 的 125 个唯一 npm archive (31,498,870 bytes), 仅从锁定 tarball 重建最小 cache, 并在禁用网络且 cache 只读的固定 Ubuntu container 中通过全部三次 frozen install; `esbuild@0.21.5` 是唯一含受信任 postinstall 的依赖
- `依赖` 新增 Kotlin Parcelize runtime, 确保 Release 版 R8 保留共享的 Parcelable contract class

#### v0.1.0

_2026/09/01_

- `提示` 首个版本: 每次运行一个独立脚本文件, 暂不提供 AutoJs6 内置函数, Java bridge, 多文件项目和相对路径导入
- `新增` 新增独立 `bun` 引擎: 在脚本第一行写上 `"bun";` 即可用官方 Bun 1.4.0 Android executable 运行 JavaScript 和 TypeScript, 实际命令为 `bun run --no-install <source>`, 不会自动安装依赖
- `新增` 实时回传运行输出: stdout 和 stderr 通过有界 oneway Binder callback 分块流式返回, 最终结果只报告状态和诊断信息, 不携带完整输出流
- `新增` 运行可控: 脚本在隔离的 `:bun_runtime` 插件进程中执行, 支持显式取消, 60 秒默认超时, runtime 信息查询和 prewarming
- `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 Android payload, 以及单 ABI 和 `universal` 安装包
- `新增` 提供完整插件体验: 插件发现, 受权限保护的激活 (Wake), 完整 PluginInfo metadata 和 10 种语言的用户文档
- `优化` 采用版本化 Binder contract, 通过 ParcelFileDescriptor 传输源码, 源码上限 16 MiB, 合并输出上限 8 MiB
- `优化` 从 Android 只读 native library 目录启动 Bun, 并校验固定 release archive 和打包 binary 的大小, SHA-256 与 ELF 属性
- `优化` 验证两个打包 executable 的 PT_LOAD alignment 均不低于 16 KB, 同时如实说明尚未完成真实 16 KB Android 环境测试
- `优化` 由经过校验的 JSON 文案源生成 README, 插件中心说明和内置更新日志, 并加入构建, Markdown 和 runtime artifact 的 CI 检查
- `优化` 将最低版本暂定为 Android 14 (API 34): API 31 真机上 Bun 的 `close_range` syscall 被 seccomp 以 `SIGSYS` 终止, 一台 Sony API 33 设备虽意外通过但不足以证明可移植性, API 35 真机 JS 和 TS Binder 往返测试已通过

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
