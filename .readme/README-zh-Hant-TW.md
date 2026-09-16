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

> 每次執行只會執行目前檔案的一份快照 (實際命令為 `bun run --no-install <source>`), 插件不會自動安裝 npm dependency, 也不會讀取專案中的其他檔案. 把現有 Rhino 或 Node.js 專案遷移到 Bun 之前, 請先閱讀下方的目前限制.

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

******

### 目前限制

******

- 只執行單一檔案: 插件每次接收並執行一個原始碼快照, 不傳輸專案目錄, 因此 `import './utils.js'` 這類相對路徑 import 無法解析. 單檔內部的 ESM 語法不受影響; 需要多個模組時, 可先在電腦上打包為單一檔案 (見常見問題).
- 沒有 AutoJs6 內建函式: `click()`, `toast()` 等自動化 API 和 Rhino 全域物件在 Bun 腳本中不存在, Bun 腳本目前適合計算, 文字處理, 網路請求等不依賴宿主能力的任務.
- 沒有 Java bridge: Bun 腳本無法直接存取 AutoJs6 行程中的 Java class 或 object.
- 不保證完整的 Bun toolchain: `bunx`, 裝置端產生 executable, runtime C compilation 和任意 native addon 均不在支援範圍內.
- 不是 security sandbox: Bun 腳本以受信任程式碼身分在插件行程中執行, 可以使用授予插件的 permission, 請只執行你信任的腳本.

******

### 常見問題

******

#### 為什麼在 Bun 腳本裡用不了 `click()`, `toast()` 這些 AutoJs6 函式?

Bun 執行在獨立行程中, 是與 Rhino 完全不同的 JavaScript 引擎, 因此 AutoJs6 的全域函式不會出現在 Bun 腳本中. 讓 Bun 腳本呼叫自動化能力需要宿主逐項明確開放的 bridge, 目前版本刻意不提供自動化介面; 第一項唯讀能力 (宿主資訊快照, 由環境變數 `AUTOJS6_HOST_INFO_FILE` 指向的 JSON 檔案, 含宿主與插件版本等資訊) 已在插件側實作, 第二部分 (執行期呼叫: `ui.toast` 與 `device.info`, 指令碼透過環境變數 `AUTOJS6_HOST_BRIDGE_SOCKET` 指向的 unix socket 用 `fetch(url, { unix })` 呼叫) 也已在插件側實作; 兩者都待 AutoJs6 宿主發布對應版本後可用, 每項能力可在 AutoJs6 插件中心的插件設定頁單獨關閉, 相關計畫見路線圖.

#### 可以使用 npm 套件嗎?

不能在裝置上安裝. 插件固定以 `--no-install` 方式執行, 不會下載任何 dependency. 如果確實需要第三方程式庫, 可以先在電腦上用 `bun build` 等工具把腳本和純 JS dependency 打包成單一檔案, 再放到裝置上執行; 依賴 native addon 的套件無法透過這種方式使用.

#### 可以 `import` 專案裡的其他檔案嗎?

目前發佈的 AutoJs6 還不能. 外掛 0.2.2 起可以接收專案快照 (有界 ZIP 工作區封存) 並在本次執行的私有工作區展開, 專案內的相對路徑匯入可以解析. 前提是宿主打包專案目錄並宣告該能力; 宿主側改動已準備但尚未發佈. 在此之前仍只傳輸單檔案快照, 單檔案內部的 ESM 語法可正常使用.

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

#### v0.2.4

_2026/09/16_

- `新增` M7 第二部分: 執行期動態呼叫能力橋與前兩項動態能力 `ui.toast` / `device.info`. 宿主在 runScript 請求裡攜帶 `hostCapabilityBridgeVersion = 1`, `hostCapabilityBroker` (IBinder) 與 `hostCapabilities` (已授權能力 ID) 時, 插件為本次執行在私有快取目錄建立 unix socket (環境變數 `AUTOJS6_HOST_BRIDGE_SOCKET`), 指令碼用 `fetch(url, { unix })` 發 `GET /v1/info` 與 `POST /v1/<能力 ID>` (JSON 請求 <= 64 KiB, 結果 <= 256 KiB, 每次執行至多 1024 次, 4 路並行, 單次 10 s 逾時), 插件經 oneway AIDL `IBunHostCapabilityBroker` 中繼給宿主並只接受宿主 UID 對本次執行的回呼; 橋級錯誤碼 (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500) 只出現在 JSON 回應裡, runScript 終態錯誤碼集合不變, 終態新增 `hostBridgeDelivered` 與 `hostCalls`; 執行結束即關閉 socket 與在途呼叫. 能力位 `SUPPORTS_HOST_CAPABILITY_BRIDGE`, 共享契約 AAR 升級為 22437 bytes; 未提供橋的宿主行為完全不變
- `優化` Android 17 區域網路授權統一移至外掛程式中心啟用流程及外掛程式設定, 不再提供啟動器授權頁面; 未獲授權時保持關閉並靜默略過自動啟動
- `優化` 封存已發布 v0.2.3 的 APK/對應原始碼資產驗證及五個環境在最終發布位元組上的最終簽署套件驗收: Sony API 33 arm64 與 Xiaomi API 35 universal 從已發布 v0.2.2 原地覆蓋升級, Redmi API 33 arm64, x86_64 API 33 AVD 與 Samsung SM-A566B API 36 原生 arm64 16 KiB 實機全新安裝, force-stop 前後各 10/10 組 (第十組為宿主資訊快照); 已發布標籤不重寫, Android/16 KB 相容範圍不擴大
- `優化` 支援 Android 17 (SDK 37), 提供外掛獨立的本機網路權限控制及復原指引

#### v0.2.3

_2026/09/16_

- `新增` M7 第一項宿主能力: 唯讀的宿主資訊快照. 宿主在 runScript 請求裡攜帶 `hostInfoVersion = 1` 與 `hostInfo` (套件名稱, 可選的 versionDate 與 languageTag) 時, 插件核對套件名稱屬於 Binder 呼叫方 UID, 自行透過 PackageManager 解析宿主版本, 把宿主/插件/本次執行的事實寫成不超過 16 KiB 的 JSON 放到執行目錄的 `autojs6/host-info.json` (`project` 之外, 隨執行目錄刪除), 並透過環境變數 `AUTOJS6_HOST_INFO_FILE` 告知腳本; 終態新增 `hostInfoDelivered`. 能力位 `SUPPORTS_HOST_INFO`; 環境變數前綴 `AUTOJS6_` 歸插件保留, 宿主請求攜帶即以 INVALID_REQUEST 拒絕, 冒用套件名稱或未知版本同樣在啟動 Bun 之前拒絕. 共用契約 AAR 升級為 14073 bytes, 未提供快照的宿主行為完全不變
- `優化` 封存已發布 v0.2.2 的 APK/對應原始碼資產驗證及四個環境的最終簽署套件驗收: Sony API 33 arm64 與 Xiaomi API 35 universal 從已發布 v0.2.0 原地覆蓋升級, Redmi API 33 arm64 與 x86_64 API 33 AVD 全新安裝, 各在 force-stop 前後通過 9/9 組; 不改寫已發布標籤, 不擴大 Android 或 16 KB 相容性聲明
- `優化` 用從宿主 master (7c31269cc) 本地建置的 AutoJs6 與已發布的 v0.2.2 x86_64 外掛程式在 API 33 AVD 上驗證宿主到外掛程式的真實專案往返: 含相對匯入與 JSON 匯入的 project.json 專案, package.json 的 TypeScript 專案, 以及仍按單檔案失敗的裸檔案對照; 宿主自身的發布仍待進行
- `優化` 為 v0.2.2 發布證據補充原生 arm64 16 KiB 硬體上的簽章最終 APK 驗收: 已發布的 arm64-v8a APK 在 Samsung SM-A566B (API 36, Remote Test Lab) 全新安裝, force-stop 前後各通過 9/9 組, 安裝後位元組綁定到發布資產, 驗收後已解除安裝; 記錄現涵蓋五個環境
- `優化` 用同一本地建置的 AutoJs6 宿主 (master 7c31269cc) 與已發布的 v0.2.2 arm64-v8a 外掛程式在兩台原生 ARM64 實機上重複宿主到外掛程式的真實專案往返: Samsung SM-A566B (API 36, 16 KiB 頁) 與 Redmi 22120RN86C (API 33) 各執行 project.json 專案兩輪, package.json 的 TypeScript 專案一輪以及裸檔案對照, 結果均符合預期; 宿主是否發布仍由使用者決定
- `優化` 在 Redmi 22120RN86C (API 33) 與 Samsung SM-A566B (API 36, 16 KiB 頁) 上執行含兩項新用例 (快照僅在提供時交付並核實, 宿主全域以 ReferenceError 明確失敗) 的 instrumentation 套件, 各 OK (17 tests); 並用本機建置的 AutoJs6 宿主 (master d9b4033bd + attachHostInfo) 與本機 0.2.3 release 插件在 Redmi 與 Samsung 各完成宿主到插件的快照往返: 單一原始碼與 project.json 專案都讀到核實後的宿主/插件/執行事實, 撤銷宿主授權後腳本得到 absent, 恢復後再次得到快照, 宿主已還原為使用者原 APK; 記錄見 docs/compatibility/2026-09-16-m7-host-info-snapshot

#### v0.2.2

_2026/09/15_

- `新增` 新增透過工作區封存執行多檔案專案 (M6): 共享契約增加 workspaceArchiveVersion, workspaceEntryPoint, workspaceMaxEntries 與 workspaceMaxBytes 請求鍵及 SUPPORTS_WORKSPACE_ARCHIVE 能力位, runScript 把有界 ZIP 快照原子展開到本次執行的私有工作區後, 以專案目錄為工作目錄執行進入點檔案. 規則: 只接受相對路徑, 拒絕穿越/絕對/反斜線/冒號/控制字元路徑, 大小寫與 Unicode 形式不敏感的重複偵測, 檔案/目錄衝突檢查, 最多 16384 項目, 解壓後 64 MiB 且單檔案 16 MiB, 進入點檔案檢驗與取消清理; 只建立一般檔案和目錄, 不帶該鍵的宿主繼續走不變的單一原始碼路徑. 需要宿主打包專案目錄; AutoJs6 引擎側改動已同步準備, 尚未發佈
- `修復` Release 校驗器改為以相對的壓縮檔名稱讀取專案原始碼壓縮檔成員, 使監督器原始碼精確核對在 Windows 的 GNU tar 下同樣可用; CI 與已發布資產不變
- `修復` 修復實驗 watch 重新載入在 close_range 失敗時洩漏描述符的問題: 在 exec 前使用既有有界 raw syscall fallback 為實際 FD 標記 CLOEXEC, 設定不完整時停止執行. 保留 stdio, 明確 IPC 和原訊號生命週期. GCC/Clang 完整原始碼對照涵蓋真實 exec, 高位 FD, 降低後的硬限制和注入失敗; 新 native 建置與不變的 Android 測試套件分別記錄. 歷史失敗, 官方產物及發佈界限維持不變
- `修復` 修正 Bun 原始碼更新後歷史實驗 JSC 候選的驗證: 綁定完整且不可變的建置封存, 新建置仍嚴格核對目前輸入
- `修復` 修復實驗 Android epoll 等待提前交付呼叫者已封鎖的 pending 訊號: 保留 caller mask, 並在呼叫點維持既有 epoll_pwait2 停用. GCC/Clang 回歸直接編譯修復前後的完整等待函式; 全新 native 建置與原定義裝置套件獨立取證, 保留十一補丁失敗檔案及官方支援範圍. 原定義套件在五個原生 4 KiB 環境各兩輪通過: 應用程式探針 330/330, Binder 80/80. 兩次 API 28 ART 啟動失敗獨立封存, 第三次相同 APK 兩輪通過; 新原始碼原固定測試的 Samsung ARM64 裝置門檻已補齊; JSC rebase 已另行記錄
- `修復` 歷史十一補丁結果: 修復實驗 Android spawn 提前交付 pending SIGSYS: 父執行緒保留呼叫者 mask, 僅子路徑允許設定階段的訊號處理, 呼叫者封鎖 SIGSYS 時使用既有子程序 cgroup 加入路徑. GCC/Clang 主機回歸涵蓋完整正式函式及舊原始碼失敗對照; 新原始碼建置與裝置證據獨立記錄, 不轉移歷史驗收或擴大官方支援. 裝置複測確認 spawn 返回時訊號保持, 但非同步等待期間仍提前交付; 獨立唯讀 epoll 暫存器/遮罩證據定位下一處阻斷, 完整 33 項門檻仍未通過
- `修復` 修正執行環境啟動檢查的暫時失敗被永久快取的問題: 失敗完成後等待 30 秒, 在後續請求時重試, 並行請求共用同一次檢查; 各檢查輸出串流限制為 4 KiB. 保留本地化摘要, 加入 API, ABI, 階段, 執行環境身分, 結束碼和重試診斷, 明確標示訊號僅為推斷; 原生位元組及支援範圍不變
- `修復` 修復實驗版 Android 在封鎖 SIGSYS 時首次非同步 spawn 的 pidfd 探測當機, 透過既有 waiter 備援路徑保留呼叫執行緒遮罩及 pending 訊號. 十修補執行階段在五個原生 4 KiB 環境通過原 31 項探針 (310/310) 和完整八項 Binder (80/80). 恢復建置完成證據時明確保留原退出碼缺失, 獨立封存首次 ART 啟動失敗. JSC rebase 及 Release 門檻仍未完成, 官方位元組不變
- `修復` 修復實驗版原生 x86_64 16 KiB 的 JavaScriptCore 啟動中止: 以明確大頁/JIT/配置器設定重新編譯 pinned WebKit 並重新連結 Bun, 在 4 KiB 和 16 KiB AVD 各兩輪完整 Binder 通過 (32/32). 官方位元組及其 4 KiB 防護保持不變, Release 驗收另行進行
- `優化` 新增透過正式 Binder 服務執行的四個固定離線 TLS/IPv6 模式: TLS 1.2/1.3, 憑證與主機名稱拒絕, 已驗證 HTTPS, IPv6 TCP/UDP/HTTP. 綁定公開測試憑證, 精確原始碼, APK 和兩個套件的 UID, 維持原測試套件計數與發佈邊界
- `優化` 新增透過正式 Binder 服務執行的四個固定離線 API 模式: 檔案及目錄監聽, 執行個體級本機 DNS, 二進位 TCP 半關閉, HTTP 重新導向/串流讀取/取消. 綁定精確原始碼, APK 和兩個套件的 UID, 保留失敗記錄, 原測試套件計數與發佈邊界維持不變
- `優化` 新增保留原七模式壓力順序, DFG 提前停止邏輯與斷言的獨立診斷. 在重新拋出失敗前記錄有界逐輪資料, 核對精確原始碼與兩個套件的 UID, 保持歷史結果和相容性計數不變
- `優化` 新增獨立的完整取樣堆疊與行內呼叫端診斷, 固定比較 PC 映射開關. 保留原熱迴圈和門檻, 核驗額外 profiler 選項的最終值, 每類儲存首份完整堆疊並明確記錄位元組超限省略, 獨立核對呼叫端身分和編譯決定, 不增加相容性通過數
- `優化` 新增有界 JSC 採樣 PC 映射對照: 原樣重用四段工作負載, 讀回實際生效選項, 保留編譯器內聯決定, 真實執行層級及 exit 1. 第二輪反轉對照順序, 原測試, 預算, 原生位元組與支援範圍不變
- `優化` 新增固定四段 JSC profiler 重新啟動/清空診斷及明確不執行目標函式的 exit 1 對照. 保留階段證據, 時間戳記和原始 UID 清理記錄, 不改變原壓力/取樣測試或聲稱重現歷史故障
- `優化` 新增獨立有界 DFG 取樣診斷, 記錄逐次取樣時間, 呼叫數, 堆疊框架分布和最佳化計數. 保留樣本不足時的結束結果及精確原始碼/APK/UID 證據, 不改變原壓力測試, 預算, 執行環境或相容接受數
- `優化` 補充開發環境磁碟維護指南, 清理建置快取與已退役模擬器時保留執行環境來源, 測試產物和失敗紀錄
- `優化` 獨立鎖定十三修補大頁 JSC 候選: 兩次全新 Bun 乾淨建置實際結束碼均為 0, 完整產物一致且 21 項建置輸入未漂移. 重用原獨立 JSC 程式庫及 ICU, 新 APK 與原 Binder/七模式壓力迴歸獨立綁定, 不轉移歷史成績或擴大發行範圍
- `優化` 為固定 watch/reload 診斷加入有界 SIGABRT 唯讀快照, 保留原訊號傳遞及預算. 原生 ARM64 API 28/31 共 16 次 plain/traced 觀察完成 32 次重新載入, 擷取 24 次一般 SIGSYS, 套件和 UID 已清理; 未重現的原 API 28 中止原因仍待查明, 不增加相容通過數
- `優化` 新增固定 native/TRAP watch/reload 回歸, 保留十二補丁原生位元組和原33項. 四個 ARM64 / 4 KiB 實機環境中原項264/264通過, 新模式14/16失敗, 32次重新載入暴露28次 FD繼承洩漏; Sony 5.15原生對照通過, 強制TRAP失敗. 保留三個原始碼綁定APK批次和早期驗證器修正, 核對全部套件及UID清理. native修復, 擴展相容性和Release門檻仍未完成
- `優化` 完成十二補丁 Samsung SM-F936U / API 32 / 原生 ARM64 / 4 KiB 回歸: 兩輪原探針 66/66, 完整 Binder 16/16. 與 API 36 批次重用相同三個 APK, 40 個 pending 保持檢查點與十二個 child 觀測通過. 三個測試套件解除安裝, 三個 UID 處理程序清零, 專用 ADB 關閉且無 AVD 操作. 原固定測試的兩項 Samsung 裝置門檻已補齊, baseline 七環境累計 462/462 探針與 112/112 Binder; 廣泛 runtime, 壓力與 Release 門檻仍未完成
- `優化` 完成十二補丁原位元組在 Samsung SM-A566B / API 36 / 原生 ARM64 / 硬體 16 KiB 的回歸: 兩輪原 33 項探針 66/66, 完整 Binder 16/16. 四個 pending 訊號模式保留 40 個檢查點及十二個 child 觀測, 最後各向原 caller 交付一次. 重用相同 APK, 無 native 重建; 解除安裝後三個 UID 處理程序清零, 關閉本輪專用 ADB 且無 AVD 操作. baseline 六環境累計 396/396 探針與 96/96 Binder; ARM64 API 32, 廣泛 runtime 與 Release 門檻仍未完成
- `優化` 完成十二補丁大頁 JSC 候選在 API 36 原生 x86_64 的 4 KiB/16 KiB 使用者頁回歸: 同一 83 輸入 APK 的原 Binder 通過 32/32, 固定壓力模式通過 28/28. 初次低記憶體服務終止獨立封存, 相同 APK 在不改設定或預算的完整重試中通過. 解除安裝後獨立檢查兩個套件 UID 均無程序, 區分 x86 頁模擬, Samsung baseline 與 Release 門檻
- `優化` 獨立鎖定十二補丁大頁 JSC 候選, 兩次全新 Bun 乾淨建置一致, 保留實際結束碼並驗證 21 項建置輸入未漂移. 精確重用原獨立 JSC 程式庫和 ICU, 保留歷史候選, 讓隔離 Binder 工具使用新的原始碼鎖. 原壓力測試, 語意驗證器與預算不變, 裝置和 Release 驗收另行記錄
- `優化` 新增固定 pending-SIGSYS spawn 探針與獨立訊號追蹤: 原生 ARM64 API 28/31 的兩個新模式各失敗兩次, 原 31 項全部通過; 八次追蹤確認 SI_TKILL 提前遞送. 封存失敗, 原始碼/APK 綁定及清理記錄, 不修改 native 位元組或擴大相容聲明
- `優化` 執行錯誤摘要涵蓋全部 10 種語言, 保留固定錯誤代碼及有界技術詳細資訊; 啟動, Android 要求, 逾時及輸出超限說明直接取自同一組 Android 資源. 快取的分頁大小拒絕依外掛程式目前語言顯示, 診斷截斷保留完整 Unicode 字元
- `優化` 新增自動產生的相容性證據矩陣, 完整索引來源報告並綁定歷史封存摘要, 由 CI 檢查同步差異; 依執行環境, 裝置和測試套件保留結果及失敗/初步診斷, 不增加裝置驗收或擴大正式支援範圍
- `優化` 新十修補大頁 x86 候選在 API 36 的 4 KiB/16 KiB 使用者空間頁完成迴歸: 同一對 APK 綁定 77 項輸入, 原 Binder 測試 32/32, 原固定壓力模式 28/28 全部通過. 精確位元組, 原始結果及清理另檔保留, 不改寫歷史; x86 16 KiB 仍是 4 KiB 核心頁上的 ABI 模擬, 不表示 Release 或效能驗收
- `優化` 獨立綁定十修補大頁 JSC 候選, 要求兩份一致的 clean Bun 建置, 保留真實驅動退出碼並精確重用原 JSC 輸入. 隔離 Binder 工具改用綁定新原始碼的獨立鎖, 歷史及官方位元組保持不變; 裝置與 Release 驗收另行記錄
- `優化` 新增簡體中文疑難排解指南, 提供最小指令碼, 症狀/原因/處理對照及有界問題回報指引, 並從十語言 README 連結, 不改變執行階段能力
- `優化` 完成未改動十修補執行階段的三星迴歸: 原生 ARM64 API 32 / 4 KiB 與 API 36 / 16 KiB 使用完全相同的 APK, 各通過兩輪原 31 項探針 (62/62) 和兩輪完整八項 Binder (16/16). 七個原生環境累計探針 434/434, Binder 112/112. 精確繫結原始碼, APK 和清理證據, 未重新編譯 native 或操作 AVD; JSC rebase, 擴充執行階段矩陣和 Release 門檻繼續開放
- `優化` 新增獨立 test-only SIGSYS 觀察器: 原生 ARM64 API 28 四次失敗直接定位 pidfd_open, 未追蹤對照同樣失敗, API 31 對照通過. 綁定原始證據, 保留初版工具失敗, 驗證訊號轉送, 防竄改和清理; 此診斷不等於新執行階段, Binder 或 Release 驗收
- `優化` 新增兩個固定 blocked-SIGSYS 非同步 spawn 探針, 保持原 29 項定義和 native 位元組不變: 四個原生 4 KiB 環境通過 248/248, 但 Sony API 28 的兩個新模式各失敗兩次, exit 159 (整體 58/62). 四次失敗獨立嚴格封存, 相容性門檻維持未通過; 清理測試套件, UID 行程和本輪 AVD, 不新增 Binder, 16 KiB 或 Release 驗收結論
- `優化` 補齊 Samsung SM-A566B / API 36 上四種硬 FD 上限模式的原生 ARM64 16 KiB 驗證: 同一 APK 和未變動的 29 項探針兩輪通過 58/58, 含 8 次硬上限觀測, 原生 close_range 與 forced-TRAP 回退均成功. 解除安裝後 UID 行程為零, 未操作 AVD; 七環境累計 406/406. 未重編 native, 未重跑 Binder, 不作為 Release 驗收
- `優化` 確認 Samsung Galaxy Z Fold4 SM-F936U 實際為 API 32 / Android 12L, 原生 ARM64 / 4 KiB: 現有 Binder 兩輪 16/16, 未變動的 29 項應用程式探針 58/58, 含全部 8 次硬上限驗證. 精確綁定 APK/原始碼/原始證據, 解除安裝三個測試套件並確認 UID 行程為零, 未操作 AVD. 原生位元組不變; 新四模式的 ARM64 原生 16 KiB, 擴充矩陣與 Release 門檻仍未完成
- `優化` 保留原 25 項定義和執行階段位元組, 新增四項 Android FD 硬上限探針: 五個原生 4 KiB 環境各兩輪 29/29 (合計 290/290), 含 40 次硬上限驗證. 軟/硬上限降至 128 後啟動 CLOEXEC 和兩種 spawn API 均正確, 應用程式和 supervisor 上限不變. 綁定原始證據, 清理測試套件和本輪 AVD; FD 70000, 新案例原生 16 KiB 與 Release 門檻仍未完成
- `優化` 新增獨立有界 JSC 壓力驗收: API 36 x86_64 的 4 KiB 與模擬 16 KiB 使用者空間頁各兩輪通過七種離線模式 (28/28), 包含 LLInt/Baseline/DFG/FTL 實際取樣, GC, Wasm 及 64 個 worker 正常結束. 同一 APK 的原有 Binder 套件另行通過 32/32. 單獨記錄 4 KiB 核心映射, 保留早期工具執行結果並清理本輪裝置; 原生位元組, 正式支援範圍及 Release 門檻不變
- `優化` 補齊 API 29/32 原生 x86_64 / 4 KiB 驗證: 各兩輪新增 Binder 32/32 與未改動的應用程式探針 100/100, 完成現有 Binder 套件的 API 28-32 x86 版本涵蓋. 新增拒絕原始報告/原始碼/清理紀錄不一致的封存工具; 保留歷史證據, ARM64 API 32 和 Release 門檻仍未完成, 僅關閉本輪啟動的兩台 AVD
- `優化` 新增獨立套件名稱的可選 test-only 實驗外掛, 重用正式服務及完整 8 項 Binder 測試套件驗證鎖定的九補丁 Bun: 九個原生環境各兩輪全部通過 (144/144), 包含 ARM64 16 KiB; 保存 APK/原始碼繫結與清理證據, 不擴大穩定版支援範圍
- `優化` 在不改變執行階段位元組和原 24 項探針的前提下, 新增內部 lchmod/fchmodat2 固定離線 CLI 探針: 含 ARM64 16 KiB 的六個原生環境各兩輪 25/25, 合計 300/300. 驗證權限修改, 重複連結, 不跟隨符號連結, 被忽略的 EIO 及 SIGSYS 路徑觸達與有界執行緒回收; 保留早期夾具失敗, 解除安裝測試套件並關閉本輪 AVD. 完整實驗 Binder 與 Release 閘門仍未完成
- `優化` 在 Samsung 原生 ARM64 / API 36 / 16 KiB 使用相同 APK 和未改動的 24 項套件驗證九補丁實驗 Bun: 兩輪 48/48, 全部 48 項路徑斷言通過, 12 次越界請求均拒絕測試哨兵; 測試套件解除安裝後 UID 處理程序為零, 未啟動或關閉 AVD. 完整實驗 Binder, Release 和 x86_64 16 KiB 門檻仍未完成
- `優化` 建置階段校驗 64 位原生函式庫的 16 KB 頁面大小對齊, 檢查 manifest 契約並輸出 JSON 報告
- `相依性` 將線上 platform-versions 外掛與儲存庫要求的 1.8.0 對齊, 保持 native-alignment 外掛不變
- `相依性` 將 compileSdk 提升到 37, 以便使用 AutoJs6 宿主 build 5280 的共享 bun-runtime-api AAR (其 AAR 中繼資料要求編譯 SDK 37); minSdk 33 與 targetSdk 36 不變

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
