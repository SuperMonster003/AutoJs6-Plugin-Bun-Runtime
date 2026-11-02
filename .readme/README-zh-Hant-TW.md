<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>在隔離的 Android 行程中使用獨立 Bun 引擎執行 JavaScript 和 TypeScript</p>

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
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- 繁體中文 (台灣) [zh-Hant-TW] # 目前

******

### 簡介

******

Bun Runtime 是 AutoJs6 的獨立插件, 為 AutoJs6 增加一個可選的現代腳本引擎: [Bun](https://bun.sh/). 安裝並啟用後, 只要在 JavaScript 或 TypeScript 檔案的第一行寫上 `"bun";`, 這個檔案就會交給真正的 Bun 1.4.0 引擎執行, 而不再使用 AutoJs6 內建的 Rhino 引擎. 現代 JavaScript 語法, TypeScript 以及 `fetch` 等 Bun 內建 API 因此可以直接在 Android 裝置上使用.

插件的運作方式很簡單: AutoJs6 把腳本內容傳送給插件, 插件在自己的獨立行程中啟動官方 Bun Android executable 執行腳本, 並把輸出和執行結果即時傳回 AutoJs6 主控台. 這是名副其實的 Bun, 不是 Rhino 或 Node.js 的別名或模擬層. 在 Android 17 以上, 在 AutoJs6 外掛程式中心啟用此外掛程式前須允許存取附近的裝置. 也可在此外掛程式的設定頁面管理區域網路權限. 未獲授權時外掛程式保持關閉, 自動啟動將靜默略過. 此權限屬於外掛程式本身, 與 AutoJs6 的授權相互獨立.

******

### 安裝和使用

******

1. 準備環境: 在 Android 13 (API 33) 或更新版本系統上, 安裝 AutoJs6 build 5278 (6.8.0) 或更新版本.
2. 安裝插件: 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) 下載並安裝與裝置相符的 APK. 大多數手機和平板選擇 `arm64-v8a`, 模擬器或 x86_64 裝置選擇 `x86_64`, 不確定時選擇 `universal` (體積稍大, 兩類裝置均可用).
3. 啟用插件: 開啟 AutoJs6 的插件中心並啟用 Bun Runtime. 如果新安裝的插件顯示為停止狀態, 點按宿主提供的 `啟用` 操作即可.
4. 執行腳本: 在 JavaScript 或 TypeScript 檔案的第一行單獨寫上 `"bun";` (含引號和分號), 然後照常在 AutoJs6 中執行這個檔案.

> 專案檔案需要宿主協商工作區封存: 此時 project.json/package.json 目錄內的腳本可以使用相對匯入, 否則僅傳輸單一原始碼快照. 不自動安裝相依套件 (--no-install).

******

### 快速開始

******

把下面的內容儲存為腳本檔案並執行, 即可確認 Bun 引擎已接管執行:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

如果一切正常, 輸出第一行為 `Bun 1.4.0`, 第二行為 `android`.

TypeScript 檔案同樣可以直接執行, 無需預先編譯或額外設定:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

更多附有註解, 可直接複製執行的範例見 [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples), 涵蓋網路請求, 私人工作目錄檔案讀寫, stdout/stderr 和 TypeScript 型別. 所有範例均遵守目前的單一原始碼與 `--no-install` 邊界.

******

### 功能

******

- 真正的 Bun 引擎: 腳本由官方 Bun 1.4.0 Android executable 直接執行, 不做轉譯, 也不會轉交 AutoJs6 的其他引擎.
- TypeScript 開箱即用: TS 檔案無需編譯和額外設定即可直接執行, 現代 JavaScript 語法, 單檔內的 ESM 語法以及固定 Android build 提供的 Bun API 均可使用.
- 執行過程一目了然: `console.log` 等輸出即時傳回 AutoJs6 主控台, 執行結束後報告 exit status, 耗時以及是否 timeout 或被取消.
- 穩定且可控: 每個腳本在隔離的插件行程中執行, 可隨時取消, timeout 時自動終止, 即使腳本異常也不影響 AutoJs6 本身.
- 引擎來源可驗證: 內建 Bun executable 與官方 release 逐位元組對應, tag, commit, size, SHA-256 和 ELF 屬性在 build 和 CI 中強制驗證.
- 完整的多語言交付: 插件 metadata, 插件中心說明, README 和更新日誌涵蓋 10 種語言, 全部由同一組經驗證的文案來源自動產生.
- 宿主用戶端支援完整 OpenCC 轉換及常用影像 API, 包含像素讀取, 編解碼, 變換, 找色與依執行回收的影像控制代碼; 宿主圖片檔案存取採用獨立授權且預設關閉.
- Bun 支援獨立授權的螢幕擷取, Android 錄製權限申請, 逾時/取消清理和重新申請.
- Bun screenRecorder 支援 H.264 MP4 螢幕錄製, 可選麥克風/應用程式播放/混合 AAC 音軌及錄製期間擷取畫面, 包含獨立音訊授權和取消清理.
- Bun 無障礙, 應用程式操作與剪貼簿 API 對齊 Node.js 對應介面, 支援獨立授權和打包應用程式.
- Bun 檔案與持久化儲存 API, 支援獨立授權的宿主檔案讀寫及 Node.js 儲存互通.
- Node.js Worker 與 Bun 的 database/sqlite API, 支援參數化查詢, 交易和資料庫持久化.
- Bun 與 Node.js Worker 的感測器取樣及訂閱 API, 支援取消和監聽器自動釋放.
- Bun, Node.js 及 Worker 的宿主 Shell API, 支援串流輸入輸出, Shizuku 授權與程序清理.

******

### 目前限制

******

- 專案檔案需要宿主協商工作區封存: 此時 project.json/package.json 目錄內的腳本可以使用相對匯入, 否則僅傳輸單一原始碼快照. 不自動安裝相依套件 (--no-install).
- 不注入 Rhino 全域物件. 已記錄的文字, 圖像, 截圖/錄影, UI/Compose, WebView 和自動化宿主 API 透過顯式 SDK 使用. 未列出的 API 和任意 Java 物件仍不支援.
- 沒有 Java bridge: Bun 腳本無法直接存取 AutoJs6 行程中的 Java class 或 object.
- 不保證完整的 Bun toolchain: `bunx`, 裝置端產生 executable, runtime C compilation 和任意 native addon 均不在支援範圍內.
- 不是 security sandbox: Bun 腳本以受信任程式碼身分在插件行程中執行, 可以使用授予插件的 permission, 請只執行你信任的腳本.

******

### 常見問題

******

#### 為什麼在 Bun 腳本裡用不了 `click()`, `toast()` 這些 AutoJs6 函式?

顯式匯入 `process.env.AUTOJS6_HOST_CLIENT_MODULE`, 並等待 `createHostClient()`. 配套宿主 build 5572 和 Bun Runtime 0.3.0 提供 `host.app`, `host.accessibility`, `host.clipboard`. 在外掛程式中心開啟各自獨立授權, 手勢還需 `accessibility.gesture`. 打包專案宣告相同授權. Android 無障礙服務授權和剪貼簿前景存取限制仍適用. 完整介面及限制參閱 [宿主 API](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/host-api.md). Bun 檔案與持久化儲存 API, 支援獨立授權的宿主檔案讀寫及 Node.js 儲存互通. (`host.files`, `host.storage`, `host.storages`; `files.control`, `storage.control`.)

#### 可以使用 npm 套件嗎?

不能在裝置上安裝. 插件固定以 `--no-install` 方式執行, 不會下載任何 dependency. 如果確實需要第三方程式庫, 可以先在電腦上用 `bun build` 等工具把腳本和純 JS dependency 打包成單一檔案, 再放到裝置上執行; 依賴 native addon 的套件無法透過這種方式使用.

#### 可以 `import` 專案裡的其他檔案嗎?

專案檔案需要宿主協商工作區封存: 此時 project.json/package.json 目錄內的腳本可以使用相對匯入, 否則僅傳輸單一原始碼快照. 不自動安裝相依套件 (--no-install).

#### 為什麼至少需要 Android 13?

Bun 會呼叫 Linux 的 `close_range` 系統呼叫 (syscall 436), 而 Android 12L 及更早系統的應用 seccomp 允許清單不包含它, Bun 行程會直接被 `SIGSYS` 訊號終止 (已在 API 31 實機重現). Android 13 起系統放行該呼叫, API 33 和 API 35 實機測試均已通過. 支援更低版本需要為 Bun 套用 patch, 相關進展見路線圖.

#### 腳本 timeout 或輸出超限會發生什麼?

單次執行預設限時 60 seconds, timeout 後 Bun 行程會被終止並在結果中標記 timeout. stdout 和 stderr 合併輸出超過 8 MiB 時, 執行會以輸出超限錯誤結束, 而不是靜默截斷. 遇到這兩種情況, 請拆分任務或減少輸出量.

#### 支援 16 KB page size 裝置嗎?

16 KB: ELF 與 APK 對齊檢查通過. Samsung SM-A566B 實體裝置 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 開發版 arm64-only APK 已在無轉譯條件下兩輪通過全部 8 項 Binder 測試. 先前 x86_64 AVD 上的 ARM64 結果仍僅屬轉譯路徑; 原生 x86_64 連最小指令碼也會以 exit code 134 中止. 這是指定裝置和開發版的證據, 不等於已發布 Release APK 驗收或普遍支援 16 KB.

#### 應該安裝哪個 APK?

絕大多數手機和平板使用 `arm64-v8a`. 模擬器或 x86_64 裝置使用 baseline `x86_64`. 不確定時安裝 `universal`, 它同時包含兩種 ABI, 體積稍大但最穩妥.

#### 安裝或執行出現問題時如何排查?

請參閱[疑難排解指南 (簡體中文)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md), 從最小指令碼開始, 依症狀檢查啟用, Android/ABI/頁面大小, 逾時, 輸出超限與匯入問題, 並整理問題回報所需資訊.

******

### 相容性

******

- 引擎: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 系統: Android 13 (API 33) 或更新版本, 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位元 executable. Android 9 到 12L (API 28 到 32) 暫不支援, 原因見上方常見問題. API 33 和 API 35 實機測試均已通過.
- 宿主: AutoJs6 build 5278 或更新版本, Bun runtime contract version 1.
- 單次執行上限: 原始碼最多 16 MiB, stdout 和 stderr 合併輸出最多 8 MiB, 預設 timeout 為 60 seconds.
- 安裝套件: 單一 ABI APK 體積較小, 較大的 `universal` APK 同時包含兩個受支援的 ABI.
- 測試證據: [自動產生的相容性矩陣](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) 列出各份報告的裝置, API, ABI, 分頁大小和測試結果. 官方, 實驗, 轉譯執行及失敗紀錄各自保留驗證範圍, 不擴大已發佈的支援範圍.

******

### 權限和完整性

******

- 獨立鎖定的唯讀監督器負責逾時, 取消和輸出超限, 也能處理忽略 SIGTERM 的指令碼. 它負責回收直接 Bun 子處理程序, 不是安全沙箱, 也不負責管理任意脫離執行的後代處理程序.
- 對外匯出的啟用 (Wake), info 和 runtime component 均受 `org.autojs.permission.PLUGIN` 保護, AutoJs6 側仍會執行一般的插件 authorization 檢查.
- 腳本快照存放在每次執行專用的 private directory 中, Bun executable 從 Android read-only native library directory 啟動, 不會複製到 writable storage 後再執行.
- Repository lock 同時記錄官方 release archive 和封裝進 APK 的 binary, size, SHA-256 或 ELF 屬性一旦出現偏差, CI 會在 build 前拒絕.
- 插件宣告網路 permission, 因為受信任的 Bun 腳本可能使用 `fetch` 等 network API. 插件不是 sandbox, 請只執行你信任的腳本.

******

### 執行錯誤與疑難排解

******

提示使用 Android 為外掛程式設定的語言. 底層診斷詳細資訊和 Bun 輸出可能仍為英文.

- 如果 Bun Runtime 尚未啟動或啟用, 請在 AutoJs6 的外掛程式中心授權並啟用外掛程式; 如果主程式顯示啟動操作, 請執行啟動.
- 官方外掛程式需要 Android 13 (API 33) 或更新版本. Android 9 至 12L 無法執行; 降低資訊清單中的版本要求不會使執行階段相容.
- `TIMEOUT`: Bun 執行逾時. 請縮短工作, 或在允許範圍內調整執行逾時時間.
- `OUTPUT_LIMIT`: Bun 輸出超過設定的位元組上限. 請減少 stdout 和 stderr 輸出後重新執行指令碼.
- `RUNTIME_UNAVAILABLE`: Bun Runtime 無法使用. 請檢查裝置相容性; 如外掛程式檔案不完整, 請重新安裝外掛程式.

******

### 插件介面

******

本節面向 AutoJs6 宿主和插件開發者, 一般使用者可以跳過. 以下為穩定 identifier 和上限:

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

`BunRuntimeService` 透過 action `org.autojs.plugin.bun.RUNTIME` 和 category `bun` 被發現. 它透過 `ParcelFileDescriptor` 接收原始碼, 從 request 接收 execution ID, 並在同步 `runScript` call 保持 active 期間執行 `bun run --no-install <source>`. Stdout 和 stderr 只會以有界 chunk 透過 oneway callback 傳送. 傳回的 terminal Bundle 和 `finished` event 只包含 status 和 diagnostic summary field, 不會攜帶完整 output stream, 讓每次 Binder transaction 保持在 size limit 內. Service 支援明確 cancellation 和 runtime prewarming, 並在 `:bun_runtime` 執行.

16 KB: ELF 與 APK 對齊檢查通過. Samsung SM-A566B 實體裝置 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 開發版 arm64-only APK 已在無轉譯條件下兩輪通過全部 8 項 Binder 測試. 先前 x86_64 AVD 上的 ARM64 結果仍僅屬轉譯路徑; 原生 x86_64 連最小指令碼也會以 exit code 134 中止. 這是指定裝置和開發版的證據, 不等於已發布 Release APK 驗收或普遍支援 16 KB.

******

### 路線圖

******

路線圖回答兩個問題: 現在能用什麼, 接下來做什麼. 已勾選條目描述目前版本的實際行為; 未勾選條目 (多檔專案, AutoJs6 能力 bridge, 更廣泛的 Android 版本支援, Bun upgrade 等) 是計畫, 不代表目前已支援.

- [檢視 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 發行記錄

******

#### v0.22.0

_2026/11/01_

- `新增` Bun.file 與 node:fs 可以讀寫共享儲存 (如 /sdcard): 外掛現在宣告 "所有檔案訪問許可權", 需要在系統設定裡開啟; 指令碼報出共享儲存的 EACCES / EPERM 時, AutoJs6 提示一次並可跳轉到該設定頁, 每次執行最多一次, 錯誤本身不變
- `新增` host 的 util, species, s13n, cvt, fmt, jsox, pinyin 及全域性資料函式與 AutoJs6 指令碼一致
- `新增` host 的 colors / Color, files, zip, mime, 計時記錄器, storages 和 mediainfo 與 AutoJs6 指令碼一致; 全域性 open, Color, axios, dayjs, pangu, cheerio 和 i18n
- `新增` host 的 app, shell, shizuku 模組與 ShellProcess 與 AutoJs6 指令碼一致, 結果以 Promise 返回
- `新增` host 的 autojs, installer, memory, settings, sysprops, powerManager, engines, plugins, dialogs.build 及 notifications 的擴充套件成員與 AutoJs6 指令碼一致, host.global.install() 把全域性系統函式與 R 裝到 globalThis
- `新增` host 的 device, sensors 和 media 與 AutoJs6 指令碼一致
- `新增` host 的 ui, floaty, web, compose, terminal, toast 和 console 與 AutoJs6 指令碼一致, 介面在 AutoJs6 中顯示; 需要新增的 terminal.control, floaty.control, floaty.raw 和 floaty.touch 授權
- `新增` host 的 automator, auto, keys, ocr, barcode, qrcode, yolo, threads, continuation, timers, selector 與 events 的按鍵, 觸控監聽與 AutoJs6 指令碼一致; 需要新增的 accessibility.service, events.touch, events.key.intercept, ocr.control, barcode.control 和 yolo.control 授權
- `新增` host 的 colors.theme, gallery (需要 3-Maple Image), files.batchRename (需要 Batch Rename), speech.speaker, speech.diarize, speech.detectLanguage 和 speech.tag; 需要新增的 theme.control, gallery.control 和 batchrename.control 授權, 預設關閉; 獨立簽名的打包應用呼叫不到 3-Maple Image 與 Batch Rename
- `新增` Flow 物件的 await() 和 sync(timeout), 兩者都返回 Promise, 寫作 await chain.sync(); 超過 timeout (毫秒) 時以 TIMEOUT 錯誤拒絕, 流程繼續執行, 與 AutoJs6 指令碼相同
- `修復` terminal 會話的 waitFor 之後緊跟 write 時, 回顯很快的輸出可能被 waitFor 錯過而超時的問題
- `修復` chooseFiles() 之後立即呼叫 web.cancelFileChooser() 時檔案選擇器可能沒有關閉的問題
- `修復` files.open, files.toFile 和 zip 的相對路徑沒有按指令碼所在目錄解析, 找不到指令碼旁邊的檔案的問題
- `修復` shell.exec 執行很快結束的命令時偶爾以 ERR_STREAM_DESTROYED 錯誤失敗的問題
- `修復` WIDTH / HEIGHT 與 setScreenMetrics 的縮放沒有使用完整螢幕尺寸的問題
- `優化` 一次請求可攜帶的宿主授權上限 64 -> 128
- `優化` ocr 的結果帶有隻讀的 extras 物件, 選項宣告補全 useOpenCL, mergeLine 等識別選項
- `優化` host.speech.models.list 的型別宣告補全 updateAvailable 和 latestVersionCode, 可據此判斷已安裝的模型有沒有新版本 (需要 3-Macaw Speech 1.4.0 或以上)

#### v0.21.0

_2026/10/22_

- `新增` Node.js/Bun/Worker 的 ai.agent 任務控制與事件, 註冊指令碼上下文和結果回傳, 以及封裝應用程式的獨立授權

#### v0.20.0

_2026/10/22_

- `新增` Node.js, Bun 與 Worker 的 AI 文字生成, 串流結果, 模型目錄及持續工作階段, 支援取消與 3-Stone AI 對打包應用程式的個別授權

##### 更多發行記錄

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hant-TW.md)

******

### Build 和驗證

******

驗證或 Gradle packaging 前必須由 Git LFS materialize 兩個固定 runtime binary. 下方是標準本機檢查. Build 需要 JDK 17 或更新版本, Node.js 和 Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### 本地化和文件產生

******

編輯 JSON 和 Markdown template 後執行 `py .python/generate_markdown.py`. 不要手動編輯產生的 README, changelog 或 plugin-instruction file. `--check` 會在不寫入檔案的情況下驗證 language shape, version alignment, localized resource, orphan artifact 和 generated-file drift.

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

插件程式碼採用 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). 隨附官方 Bun executable 包含 Bun 的 MIT licensed code, 以 LGPL-2 靜態連結的 JavaScriptCore 和 WebKit, 以及採用各自 license 的其他 third-party component. 適用的 Release 會公開 license/relinking notice, 並將相符的對應原始碼作為與 APK 分開但位於同一 Release 的 assets 發布, 同時提供由自動化技術檢查驗證的 machine-readable manifest 和 SHA256SUMS. 請查看 [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 和固定版本 Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### 連結

******

- AutoJs6 專案: https://github.com/SuperMonster003/AutoJs6
- Bun 官方網站: https://bun.sh/
- 固定 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三方聲明: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
