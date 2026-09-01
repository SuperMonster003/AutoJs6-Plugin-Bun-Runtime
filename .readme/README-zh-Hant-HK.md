<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>在隔離的 Android 程序中使用獨立 Bun 引擎執行 JavaScript 和 TypeScript</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### 語言

******

目前 README.md 支援以下語言:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- 繁體中文 (香港) [zh-Hant-HK] # 目前
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### 簡介

******

Bun Runtime 是一個獨立 Android 插件, 讓 AutoJs6 可以選擇 [Bun](https://bun.sh/) 作為獨立的 JavaScript 和 TypeScript 引擎. 宿主透過檔案描述符傳送一個源碼快照, 插件在自己的 runtime 程序中啟動固定版本的官方 Bun Android executable, 並透過 Binder 傳回標準輸出, 標準錯誤, 完成狀態, timeout 和取消事件. 這是真正的 Bun 執行, 不是 Rhino 或 Node.js 的別名.

******

### 功能

******

- 獨立引擎: 執行官方 Bun 1.4.0 Android executable, 不會把程式碼轉交其他 AutoJs6 引擎.
- JavaScript 和 TypeScript: Bun 解析並執行單一 JS 或 TS 源碼快照, 包括 ESM syntax 和固定 Android build 內可用的 Bun API.
- 可觀察執行: stdout 和 stderr 以串流方式傳回宿主, 最終結果包括 exit status, duration, timeout, cancellation 和有界 diagnostic.
- 受控 runtime payload: `arm64-v8a` 和 `x86_64` release binary 由 tag, commit, size, SHA-256, ELF machine 和最低 PT_LOAD alignment 共同固定.
- 本地化交付: 插件 metadata, 插件中心說明, README 和 changelog 由一組經驗證的文案來源涵蓋 10 種語言.

******

### 安裝和使用

******

1. 在 Android 13 (API 33) 或更新版本使用 AutoJs6 build 5278 (6.8.0) 或更新版本.
2. 安裝與裝置 ABI 相符的 release APK. 大部分手機和平板選擇 `arm64-v8a`, 相容的模擬器或裝置選擇 `x86_64`, 不確定時選擇 `universal`.
3. 開啟 AutoJs6 插件中心並啟用 Bun Runtime. 如果新安裝插件仍然停止, 使用宿主顯示的 `啟動` 操作.
4. 在 JavaScript 或 TypeScript 檔案開頭加入獨立指令 `"bun";`, 然後如常從 AutoJs6 執行.

> 0.1 版每次請求使用 `bun run --no-install <source>` 執行一個不可變源碼快照, 因此不會自動安裝缺少的 dependency. 將現有 Rhino 或 Node.js project 移到 Bun 前請先閱讀以下限制.

******

### 快速開始

******

執行此檔案以確認宿主已選擇 Bun 並成功啟動 Android runtime:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

預期輸出以 `Bun 1.4.0` 開始, 下一行顯示 `android`.

Bun 直接處理 TypeScript, 因此不需要宿主端 TypeScript compilation:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### 相容性

******

- Runtime: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 平台: Android 13 (API 33) 或更新版本, 官方 64-bit payload 支援 `arm64-v8a` 和 baseline `x86_64`. API 31 真機上的 Bun syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 終止. AOSP Android 12 及更早版本的 app allowlist 不包含此 syscall, Android 13 (T, API 33) 已允許 raw syscall. Android 14 增加公開 bionic wrapper, 但 Bun 直接呼叫 raw syscall, 不需要 API 34 libc symbol. API 33 和 API 35 真機 runtime test 已通過. API 28 至 32 仍不受支援, 需要 patched Bun runtime 處理 seccomp trap 並通過可移植驗證.
- 宿主 contract: AutoJs6 build 5278 或更新版本, Bun runtime contract version 1.
- 請求上限: 源碼最多 16 MiB, stdout 和 stderr combined streaming budget 最多 8 MiB, 預設 timeout 為 60 seconds.
- 安裝套件: 單一 ABI APK 較小, 較大的 `universal` APK 同時包含兩個受支援 ABI.

******

### 0.1 版限制

******

- 只支援一個源碼快照: 此版本尚未實作多檔 project transfer 和相對 project import.
- 沒有 AutoJs6 globals: Rhino global, Android automation API 和宿主 object 不會出現在 Bun 內.
- 沒有 Java bridge: Bun 無法直接存取 AutoJs6 程序中的 Java class 或 object.
- 不保證完整 toolchain: `bunx`, 裝置端產生的 executable, runtime C compilation 和任意 native addon 不在支援範圍內.
- 不是 security sandbox: Bun script 以受信任程式碼身分在插件 app UID 下執行, 並可使用授予插件的 permission.

******

### 權限和完整性

******

- 匯出的 Wake, info 和 runtime component 由 `org.autojs.permission.PLUGIN` 保護. AutoJs6 仍會執行一般插件 authorization 檢查.
- 源碼快照暫存在每次執行專用的 private directory. Executable 從 Android read-only native library directory 啟動, 不會複製到 writable storage 後執行.
- Repository lock 同時記錄官方 release archive 和已封裝 binary. CI 在 build 前拒絕 size, SHA-256, ELF type, machine 或 alignment 漂移.
- 插件聲明網絡存取 permission, 因為受信任 Bun script 可能使用 `fetch` 等 network API. 插件不是 sandbox, 請只執行你信任的 script.

******

### 常見問題

******

#### 為何 Bun 內沒有 AutoJs6 globals?

Bun 是獨立程序和 JavaScript 引擎, 不是 Rhino compatibility layer. 未來的宿主 bridge 必須明確公開每項 automation capability, 0.1 版刻意不提供這種 bridge.

#### Script 可以 import 另一個本地 project file 嗎?

0.1 版不可以. Contract 只傳輸一個源碼快照, 尚未傳輸 project tree, 因此無法解析相對 project import. 單檔 ESM syntax 仍受支援.

#### 插件支援 16 KB page-size 裝置嗎?

兩個已封裝 ELF executable 的 PT_LOAD alignment 均至少為 16 KB. 尚未完成真正 16 KB Android runtime 測試, 因此此版本不聲稱已驗證 end-to-end 16 KB 支援.

#### 應該安裝哪個 APK?

大部分 Android 實體裝置使用 `arm64-v8a`. 相容模擬器或 x86_64 裝置使用 baseline `x86_64`. `universal` 同時包含兩者, 在 ABI 未知時最穩妥.

******

### 插件介面

******

以下穩定 identifier 和 limit 供 AutoJs6 宿主和插件開發者使用:

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

`BunRuntimeService` 透過 action `org.autojs.plugin.bun.RUNTIME` 和 category `bun` 被發現. 它透過 `ParcelFileDescriptor` 接收源碼, 從 request 接收 execution ID, 並在同步 `runScript` call 維持 active 期間執行 `bun run --no-install <source>`. Stdout 和 stderr 只會以有界 chunk 透過 oneway callback 傳送. 傳回的 terminal Bundle 和 `finished` event 只包含 status 和 diagnostic summary field, 不會攜帶完整 output stream, 令每次 Binder transaction 保持在 size limit 內. Service 支援明確 cancellation 和 runtime prewarming, 並在 `:bun_runtime` 執行.

16 KB 狀態: 已封裝的 `arm64-v8a` 和 `x86_64` ELF PT_LOAD segment 符合 16 KB alignment 要求. 尚未在真正 16 KB Android 裝置或模擬器執行, 因此目前只驗證 ELF alignment.

******

### 路線圖

******

路線圖區分目前行為和規劃中的 project snapshot, 狹窄 AutoJs6 capability bridge, 更廣泛 Android 驗證和日後 Bun upgrade. 未勾選項目代表計劃, 不代表目前已支援.

- [查看 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 發行記錄

******

#### v0.2.0

_2026/09/01_

- `提示` Android 13 (API 33) 現為正式最低目標; API 28 至 32 在 patched Bun runtime 通過可移植驗證前仍不受支援
- `優化` 保留固定的官方 Bun 1.4.0 Android payload, 將支援的 Android 下限由 Android 14 (API 34) 降至 Android 13 (API 33)
- `優化` 記錄 AOSP T seccomp 分界: Android 13 已允許 Bun 呼叫的 raw `close_range` syscall, API 31 失敗則表明 API 28 至 32 需要 Bun 兼容補丁, 只修改 manifest 無法兼容
- `優化` 使用可確定性重播的六個 Bun 源碼 backport patch, 固定的 NDK 與 container 輸入以及 22 個 Android release active dependency 的不可變 identity 為 Android 9+ 實驗作準備, 同時明確保持未 build runtime 不可用
- `優化` 驗證每個 Debug 和 Release APK 的 16 KB ZIP alignment, 準確 ABI 內容, 固定 Bun payload 大小與 SHA-256, 並驗證 Android 13 測試裝置上已安裝的 payload bytes
- `依賴` 加入 Release R8 保留共用 Parcelable contract class 所需的 Kotlin Parcelize runtime

#### v0.1.0

_2026/09/01_

- `提示` 首個版本每次執行一個源碼快照, 不提供 AutoJs6 globals, Java bridge, 多檔 project 或相對 project import
- `新增` 使用官方 Bun 1.4.0 Android executable 作為獨立 `bun` 引擎執行 JavaScript 和 TypeScript, 透過 `"bun";` 指令選擇, 並使用 `bun run --no-install <source>` 避免自動安裝 dependency
- `新增` 只透過有界 oneway Binder callback chunk 串流傳回 stdout 和 stderr, terminal result 只報告 status 和 diagnostic, 不攜帶完整 output stream
- `新增` 在隔離的 `:bun_runtime` 插件程序中支援 explicit cancellation, 60 秒 default timeout, runtime information 和 prewarming
- `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64-bit Android payload, 以及單一 ABI 和 `universal` 安裝套件
- `新增` 提供插件 discovery, 受保護的 Wake activation, 完整 PluginInfo metadata 和 10 種語言使用者文件
- `優化` 使用 versioned Binder contract, 透過 ParcelFileDescriptor 傳輸源碼, 源碼上限為 16 MiB, combined output 上限為 8 MiB
- `優化` 從 Android read-only native library directory 啟動 Bun, 並驗證固定 release archive 和 packaged binary 的 size, SHA-256, ELF type, machine 和 alignment
- `優化` 驗證兩個 packaged executable 的 PT_LOAD alignment 均至少為 16 KB, 同時明確記錄尚未完成真正 16 KB Android runtime 測試
- `優化` 從 validated JSON source 產生 README, 插件中心說明和 built-in changelog asset, 並加入 build, Markdown 和 runtime artifact CI 檢查
- `優化` 將最低版本設為 Android 14 (API 34), 因為 API 31 真機上的 Bun syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 終止. 一部 Sony API 33 裝置意外通過但不能證明可移植支援, API 35 真機 JS 和 TS Binder 往返已通過, 較低版本需等待上游 fallback

##### 更多發行記錄

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hant-HK.md)

******

### Build 和驗證

******

驗證或 Gradle packaging 前必須由 Git LFS materialize 兩個固定 runtime binary. 下方是標準本地檢查. Build 需要 JDK 17 或更新版本, Node.js 和 Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### 本地化和文件產生

******

編輯 JSON 和 Markdown template 後執行 `py .python/generate_markdown.py`. 不要手動編輯生成的 README, changelog 或 plugin-instruction file. `--check` 會在不寫入檔案的情況下驗證 language shape, version alignment, localized resource, orphan artifact 和 generated-file drift.

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

### 授權

******

插件程式碼採用 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). 隨附官方 Bun executable 包含 Bun 的 MIT licensed code, 以 LGPL-2 靜態連結的 JavaScriptCore 和 WebKit, 以及採用各自 license 的其他 third-party component. 請查看 [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 和固定版本 Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### 連結

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 官方網站: https://bun.sh/
- 固定 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三方聲明: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
