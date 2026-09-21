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

插件的工作方式很简单: AutoJs6 把脚本内容发给插件, 插件在自己的独立进程中启动官方 Bun Android 可执行文件运行脚本, 并把输出和运行结果实时传回 AutoJs6 控制台. 这是货真价实的 Bun, 不是 Rhino 或 Node.js 的别名或模拟层. 在 Android 17 及以上, 在 AutoJs6 插件中心开启此插件前需允许访问附近的设备. 也可在此插件的设置页面中管理本地网络权限. 未获授权时插件保持关闭, 自动启动将静默跳过. 此权限属于插件自身, 与 AutoJs6 的授权相互独立.

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

Bun 运行在独立进程中, 是与 Rhino 完全不同的 JavaScript 引擎, 因此 AutoJs6 的全局函数不会出现在 Bun 脚本中. 让 Bun 脚本调用自动化能力需要宿主逐项显式开放的 bridge, 当前版本有意不提供自动化接口; 第一项只读能力 (宿主信息快照, 由环境变量 `AUTOJS6_HOST_INFO_FILE` 指向的 JSON 文件, 含宿主与插件版本等信息) 已在插件侧实现, 第二部分 (运行期调用: `ui.toast` 与 `device.info`, 脚本通过环境变量 `AUTOJS6_HOST_BRIDGE_SOCKET` 指向的 unix socket 用 `fetch(url, { unix })` 调用) 也已在插件侧实现; 两者都等 AutoJs6 宿主发布对应版本后可用, 每项能力可在 AutoJs6 插件中心的插件设置页单独关闭, 相关计划见路线图.

#### 可以使用 npm 包吗?

不能在设备上安装. 插件固定以 `--no-install` 方式运行, 不会下载任何依赖. 如果确实需要第三方库, 可以先在电脑上用 `bun build` 等工具把脚本和纯 JS 依赖打包成单个文件, 再放到设备上运行; 依赖 native addon 的包无法通过这种方式使用.

#### 可以 `import` 项目里的其他文件吗?

当前发布的 AutoJs6 还不能. 插件 0.2.2 起可以接收项目快照 (有界 ZIP 工作区归档) 并在本次运行的私有工作区展开, 项目内的相对路径导入可以解析. 前提是宿主打包项目目录并声明该能力; 宿主侧改动已准备但尚未发布. 在此之前仍只传输单文件快照, 单文件内部的 ESM 语法可正常使用.

#### 为什么至少需要 Android 13?

Bun 会调用 Linux 的 `close_range` 系统调用 (syscall 436), 而 Android 12L 及更早系统的应用 seccomp 允许清单不包含它, Bun 进程会直接被 `SIGSYS` 信号终止 (已在 API 31 真机复现). Android 13 起系统放行该调用, API 33 和 API 35 真机测试均已通过. 支持更低版本需要为 Bun 打补丁, 相关进展见路线图.

#### 脚本超时或输出超限会发生什么?

单次运行默认限时 60 seconds, 超时后 Bun 进程会被终止并在结果中标记超时. stdout 和 stderr 合并输出超过 8 MiB 时, 运行会以输出超限错误结束, 而不是静默截断. 遇到这两种情况, 请拆分任务或减少打印量.

#### 支持 16 KB page size 设备吗?

16 KB: ELF 与 APK 对齐检查通过. Samsung SM-A566B 真机 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 开发版 arm64-only APK 已在无翻译条件下两轮通过全部 8 项 Binder 测试. 此前 x86_64 AVD 上的 ARM64 结果仍仅属于翻译路径; 原生 x86_64 连最小脚本也会以 exit code 134 中止. 这是指定设备和开发版的证据, 不等于已发布 Release APK 验收或普遍支持 16 KB.

#### 应该安装哪个 APK?

绝大多数手机和平板使用 `arm64-v8a`. 模拟器或 x86_64 设备使用 baseline `x86_64`. 不确定时安装 `universal`, 它同时包含两种 ABI, 体积稍大但最稳妥.

#### 安装或运行出现问题时如何排查?

请查看[排错指南](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md), 从最小脚本开始, 按症状检查激活, Android/ABI/页大小, 超时, 输出超限与导入问题, 并按指南整理问题报告所需信息.

******

### 兼容性

******

- 引擎: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 系统: Android 13 (API 33) 或更高版本, 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位可执行文件. Android 9 到 12L (API 28 到 32) 暂不支持, 原因见上方常见问题. API 33 和 API 35 真机测试均已通过.
- 宿主: AutoJs6 build 5278 或更高版本, Bun runtime contract version 1.
- 单次运行上限: 源码最大 16 MiB, stdout 和 stderr 合并输出最大 8 MiB, 默认超时 60 seconds.
- 安装包: 单 ABI APK 体积更小, 较大的 `universal` APK 同时包含两个受支持的 ABI.
- 测试证据: [自动生成的兼容矩阵](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) 列出各份报告的设备, API, ABI, 页大小和测试结果. 官方, 实验, 翻译执行及失败记录各自保留验证范围, 不扩大已发布的支持范围.

******

### 权限和完整性

******

- 独立锁定的只读监督器负责超时, 取消和输出超限, 也能处理忽略 SIGTERM 的脚本. 它负责回收直接 Bun 子进程, 不是安全沙箱, 也不负责管理任意脱离运行的后代进程.
- 对外导出的激活 (Wake), 信息和运行组件均受 `org.autojs.permission.PLUGIN` 权限保护, AutoJs6 侧仍会执行常规的插件授权检查.
- 脚本快照存放在每次运行专用的私有目录中, Bun 可执行文件从 Android 只读 native library 目录启动, 不会复制到可写存储后再执行.
- 仓库 lock 文件同时记录官方 release archive 和打包进 APK 的 binary, 大小, SHA-256 或 ELF 属性一旦发生偏差, CI 会在构建前拒绝.
- 插件声明网络权限, 因为受信任的 Bun 脚本可能使用 `fetch` 等网络 API. 插件不是沙箱, 请只运行你信任的脚本.

******

### 运行错误与排查

******

提示使用 Android 为插件设置的语言. 底层诊断详情和 Bun 输出可能仍为英文.

- 如果 Bun Runtime 未激活或未启用, 请在 AutoJs6 的插件中心授权并启用插件; 如果宿主显示激活操作, 请执行激活.
- 官方插件需要 Android 13 (API 33) 或更高版本. Android 9 至 12L 无法运行; 降低清单中的版本要求不会使运行时兼容.
- `TIMEOUT`: Bun 执行超时. 请缩短任务, 或在允许范围内调整执行超时时间.
- `OUTPUT_LIMIT`: Bun 输出超过设定的字节上限. 请减少 stdout 和 stderr 输出后重新运行脚本.
- `RUNTIME_UNAVAILABLE`: Bun Runtime 不可用. 请检查设备兼容性; 如插件文件不完整, 请重新安装插件.

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

16 KB: ELF 与 APK 对齐检查通过. Samsung SM-A566B 真机 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 开发版 arm64-only APK 已在无翻译条件下两轮通过全部 8 项 Binder 测试. 此前 x86_64 AVD 上的 ARM64 结果仍仅属于翻译路径; 原生 x86_64 连最小脚本也会以 exit code 134 中止. 这是指定设备和开发版的证据, 不等于已发布 Release APK 验收或普遍支持 16 KB.

******

### 路线图

******

路线图回答两个问题: 现在能用什么, 接下来做什么. 已勾选条目描述当前版本的实际行为; 未勾选条目 (多文件项目, AutoJs6 能力 bridge, 更广泛的 Android 版本支持, Bun 升级等) 是计划, 不代表当前已支持.

- [查看 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 发行历史

******

#### v0.2.5

_2026/09/20_

- `提示` 正式插件仍要求 Android 13 (API 33) 或更高版本
- `修复` AGP 9.1 构建时的 SDK XML v4 解析警告, 以及 JVM 单元测试误触发 APK 原生库对齐检查的问题 (共享构建插件 1.8.3)
- `优化` 补充 v0.2.4 在 Android 13/15 上的全新安装, 覆盖升级及动态宿主能力验证记录 (本轮未验证 16 KiB 设备, 运行时自 v0.2.2 起未变)

#### v0.2.4

_2026/09/16_

- `新增` 动态宿主能力桥, 支持经授权调用 ui.toast/device.info, 每次运行最多 1024 次调用及 4 路并发, 请求/结果上限为 64/256 KiB, 单次超时 10 s (需要配套宿主, 通过 AUTOJS6_HOST_BRIDGE_SOCKET 访问)
- `优化` Android 17 本地网络授权移至插件中心启用流程及插件设置, 移除启动器授权页面 (未授权时保持关闭并跳过自动启动)
- `优化` 补充 v0.2.3 在 Android 13/15/16 上的安装, 升级及宿主信息快照验证记录, 包含 ARM64 16 KiB 真机 (不扩大正式兼容范围)
- `优化` 适配 Android 17 (SDK 37), 提供插件独立的本地网络权限控制及恢复引导

#### v0.2.3

_2026/09/16_

- `新增` 只读宿主信息快照, 脚本可通过 AUTOJS6_HOST_INFO_FILE 读取经核实的宿主, 插件及运行信息 (需要宿主授权, AUTOJS6_ 前缀保留给插件使用)
- `优化` 补充 v0.2.2 在 Android 13/15 上的全新安装及覆盖升级验证记录 (不扩大正式兼容范围)
- `优化` 补充 x86_64 Android 13 环境的多文件项目示例及宿主联调记录, 包含相对导入, JSON 导入及 TypeScript (配套宿主当时尚未发布)
- `优化` 补充 v0.2.2 在 Samsung SM-A566B (Android 16, ARM64 16 KiB) 上的发行安装包验证记录
- `优化` 补充 ARM64 Android 13 及 Android 16 16 KiB 真机的多文件项目联调记录 (使用本地构建的宿主)
- `优化` 补充宿主信息快照及授权撤销的真机验证记录, 覆盖单文件和多文件项目 (参阅 docs/compatibility/2026-09-16-m7-host-info-snapshot)

##### 更多发行历史

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hans.md)

******

### 构建和验证

******

验证或 Gradle 打包前必须由 Git LFS 实体化两个固定运行时二进制. 下方是标准本地检查. 构建需要 JDK 17 或更高版本, Node.js 和 Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

插件代码采用 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). 随附的官方 Bun executable 包含 Bun 的 MIT 许可代码, 以 LGPL-2 许可静态链接的 JavaScriptCore 和 WebKit, 以及使用各自许可证的其他第三方组件. 适用的 Release 会公开 license/relinking notice, 并将匹配的对应源码作为与 APK 分离但位于同一 Release 的 assets 发布, 同时提供由自动化技术检查验证的 machine-readable manifest 和 SHA256SUMS. 请查看 [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 和固定版本的 Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### 链接

******

- AutoJs6 项目: https://github.com/SuperMonster003/AutoJs6
- Bun 官方网站: https://bun.sh/
- 固定的 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三方声明: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
