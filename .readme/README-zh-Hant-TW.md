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

#### v0.2.5

_2026/09/16_

- `提示` 尚未發布的開發快照; 正式外掛程式仍要求 Android 13 (API 33) 或更新版本
- `優化` 歸檔已發布 v0.2.4 的 APK/對應原始碼資產驗證與四個環境在最終發布位元組上的最終簽名包驗收: Sony API 33 arm64 與 Xiaomi API 35 universal 從已發布 v0.2.3 原地覆蓋升級, Redmi API 33 arm64 與 x86_64 API 33 AVD 全新安裝, force-stop 前後各 11/11 組 (第十一組為處理程序內 broker 的動態能力橋); 本次沒有 16 KiB 裝置在線, 執行階段載荷自 v0.2.2 起未變; 已發布標籤不重寫, Android/16 KB 相容範圍不擴大

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
