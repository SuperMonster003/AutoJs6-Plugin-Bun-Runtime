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

Bun Runtime 是 AutoJs6 的獨立插件, 為 AutoJs6 增加一個可選的現代腳本引擎: [Bun](https://bun.sh/). 安裝並啟用後, 只要在 JavaScript 或 TypeScript 檔案的第一行寫上 `"bun";`, 這個檔案就會交給真正的 Bun 1.4.0 引擎執行, 而不再使用 AutoJs6 內置的 Rhino 引擎. 現代 JavaScript 語法, TypeScript 以及 `fetch` 等 Bun 內置 API 因此可以直接在 Android 裝置上使用.

插件的運作方式很簡單: AutoJs6 把腳本內容傳送給插件, 插件在自己的獨立程序中啟動官方 Bun Android executable 執行腳本, 並把輸出和執行結果即時傳回 AutoJs6 控制台. 這是名副其實的 Bun, 不是 Rhino 或 Node.js 的別名或模擬層.

******

### 安裝和使用

******

1. 準備環境: 在 Android 13 (API 33) 或更新版本系統上, 安裝 AutoJs6 build 5278 (6.8.0) 或更新版本.
2. 安裝插件: 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) 下載並安裝與裝置相符的 APK. 大部分手機和平板選擇 `arm64-v8a`, 模擬器或 x86_64 裝置選擇 `x86_64`, 不確定時選擇 `universal` (體積稍大, 兩類裝置均可用).
3. 啟用插件: 開啟 AutoJs6 的插件中心並啟用 Bun Runtime. 如果新安裝的插件顯示為停止狀態, 點按宿主提供的 `啟動` 操作即可.
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

更多附有註解, 可直接複製執行的範例見 [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples), 涵蓋網絡請求, 私人工作目錄檔案讀寫, stdout/stderr 和 TypeScript 類型. 所有範例均遵守目前的單一源碼與 `--no-install` 邊界.

******

### 功能

******

- 真正的 Bun 引擎: 腳本由官方 Bun 1.4.0 Android executable 直接執行, 不做轉譯, 也不會轉交 AutoJs6 的其他引擎.
- TypeScript 開箱即用: TS 檔案無需編譯和額外設定即可直接執行, 現代 JavaScript 語法, 單檔內的 ESM 語法以及固定 Android build 提供的 Bun API 均可使用.
- 執行過程一目了然: `console.log` 等輸出即時傳回 AutoJs6 控制台, 執行結束後報告 exit status, 耗時以及是否 timeout 或被取消.
- 穩定且可控: 每個腳本在隔離的插件程序中執行, 可隨時取消, timeout 時自動終止, 即使腳本異常也不影響 AutoJs6 本身.
- 引擎來源可驗證: 內置 Bun executable 與官方 release 逐 byte 對應, tag, commit, size, SHA-256 和 ELF 屬性在 build 和 CI 中強制驗證.
- 完整的多語言交付: 插件 metadata, 插件中心說明, README 和更新日誌涵蓋 10 種語言, 全部由同一組經驗證的文案來源自動產生.

******

### 目前限制

******

- 只執行單一檔案: 插件每次接收並執行一個源碼快照, 不傳輸專案目錄, 因此 `import './utils.js'` 這類相對路徑 import 無法解析. 單檔內部的 ESM 語法不受影響; 需要多個模組時, 可先在電腦上打包為單一檔案 (見常見問題).
- 沒有 AutoJs6 內置函數: `click()`, `toast()` 等自動化 API 和 Rhino 全域物件在 Bun 腳本中不存在, Bun 腳本目前適合計算, 文字處理, 網絡請求等不依賴宿主能力的任務.
- 沒有 Java bridge: Bun 腳本無法直接存取 AutoJs6 程序中的 Java class 或 object.
- 不保證完整的 Bun toolchain: `bunx`, 裝置端產生 executable, runtime C compilation 和任意 native addon 均不在支援範圍內.
- 不是 security sandbox: Bun 腳本以受信任程式碼身分在插件程序中執行, 可以使用授予插件的 permission, 請只執行你信任的腳本.

******

### 常見問題

******

#### 為甚麼在 Bun 腳本裏用不了 `click()`, `toast()` 這些 AutoJs6 函數?

Bun 執行在獨立程序中, 是與 Rhino 完全不同的 JavaScript 引擎, 因此 AutoJs6 的全域函數不會出現在 Bun 腳本中. 讓 Bun 腳本呼叫自動化能力需要宿主逐項明確開放的 bridge, 目前版本刻意暫不提供, 相關計劃見路線圖.

#### 可以使用 npm 套件嗎?

不能在裝置上安裝. 插件固定以 `--no-install` 方式執行, 不會下載任何 dependency. 如果確實需要第三方程式庫, 可以先在電腦上用 `bun build` 等工具把腳本和純 JS dependency 打包成單一檔案, 再放到裝置上執行; 依賴 native addon 的套件無法透過這種方式使用.

#### 可以 `import` 專案裏的其他檔案嗎?

目前不可以. 插件契約只傳輸一個源碼快照, 不傳輸專案目錄, 相對路徑 import 因此無法解析. 多檔專案支援已列入路線圖, 單檔內部的 ESM 語法可正常使用.

#### 為甚麼至少需要 Android 13?

Bun 會呼叫 Linux 的 `close_range` 系統呼叫 (syscall 436), 而 Android 12L 及更早系統的應用 seccomp 允許清單不包含它, Bun 程序會直接被 `SIGSYS` 訊號終止 (已在 API 31 真機重現). Android 13 起系統放行該呼叫, API 33 和 API 35 真機測試均已通過. 支援更低版本需要為 Bun 套用 patch, 相關進展見路線圖.

#### 腳本 timeout 或輸出超限會發生甚麼?

單次執行預設限時 60 seconds, timeout 後 Bun 程序會被終止並在結果中標記 timeout. stdout 和 stderr 合併輸出超過 8 MiB 時, 執行會以輸出超限錯誤結束, 而不是靜默截斷. 遇到這兩種情況, 請拆分任務或減少輸出量.

#### 支援 16 KB page size 裝置嗎?

16 KB: ELF 與 APK 對齊檢查通過. Samsung SM-A566B 實體裝置 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 開發版 arm64-only APK 已在無翻譯條件下兩輪通過全部 8 項 Binder 測試. 此前 x86_64 AVD 上的 ARM64 結果仍僅屬翻譯路徑; 原生 x86_64 連最小指令碼也會以 exit code 134 中止. 這是指定裝置和開發版的證據, 不等於已發佈 Release APK 驗收或普遍支援 16 KB.

#### 應該安裝哪個 APK?

絕大多數手機和平板使用 `arm64-v8a`. 模擬器或 x86_64 裝置使用 baseline `x86_64`. 不確定時安裝 `universal`, 它同時包含兩種 ABI, 體積稍大但最穩妥.

******

### 相容性

******

- 引擎: 官方 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 系統: Android 13 (API 33) 或更新版本, 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 executable. Android 9 至 12L (API 28 至 32) 暫不支援, 原因見上方常見問題. API 33 和 API 35 真機測試均已通過.
- 宿主: AutoJs6 build 5278 或更新版本, Bun runtime contract version 1.
- 單次執行上限: 源碼最多 16 MiB, stdout 和 stderr 合併輸出最多 8 MiB, 預設 timeout 為 60 seconds.
- 安裝套件: 單一 ABI APK 體積較小, 較大的 `universal` APK 同時包含兩個受支援的 ABI.

******

### 權限和完整性

******

- 獨立鎖定的唯讀監督器負責逾時, 取消和輸出超限, 也能處理忽略 SIGTERM 的腳本. 它負責回收直接 Bun 子程序, 不是安全沙箱, 也不負責管理任意脫離執行的後代程序.
- 對外匯出的啟動 (Wake), info 和 runtime component 均受 `org.autojs.permission.PLUGIN` 保護, AutoJs6 側仍會執行一般的插件 authorization 檢查.
- 腳本快照存放在每次執行專用的 private directory 中, Bun executable 從 Android read-only native library directory 啟動, 不會複製到 writable storage 後再執行.
- Repository lock 同時記錄官方 release archive 和封裝進 APK 的 binary, size, SHA-256 或 ELF 屬性一旦出現偏差, CI 會在 build 前拒絕.
- 插件聲明網絡 permission, 因為受信任的 Bun 腳本可能使用 `fetch` 等 network API. 插件不是 sandbox, 請只執行你信任的腳本.

******

### 插件介面

******

本節面向 AutoJs6 宿主和插件開發者, 一般用戶可以跳過. 以下為穩定 identifier 和上限:

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

16 KB: ELF 與 APK 對齊檢查通過. Samsung SM-A566B 實體裝置 (Android 16 / API 36, PAGE_SIZE=16384) 上, 使用官方 Bun 的 v0.2.1 開發版 arm64-only APK 已在無翻譯條件下兩輪通過全部 8 項 Binder 測試. 此前 x86_64 AVD 上的 ARM64 結果仍僅屬翻譯路徑; 原生 x86_64 連最小指令碼也會以 exit code 134 中止. 這是指定裝置和開發版的證據, 不等於已發佈 Release APK 驗收或普遍支援 16 KB.

******

### 路線圖

******

路線圖回答兩個問題: 現在能用甚麼, 接下來做甚麼. 已勾選條目描述目前版本的實際行為; 未勾選條目 (多檔專案, AutoJs6 能力 bridge, 更廣泛的 Android 版本支援, Bun upgrade 等) 是計劃, 不代表目前已支援.

- [查看 ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 發行記錄

******

#### v0.2.1

_2026/09/10_

- `提示` 尚未發佈的開發快照; 正式外掛程式仍要求 Android 13 (API 33) 或更高版本
- `修復` 透過鎖定的 MIT 補丁修復實驗執行階段 Linux spawn FD 回退: 使用固定堆疊緩衝區與原始 syscall 列舉實際描述符, 涵蓋降低軟/硬限制前已開啟及超過舊 65536 上界的 FD, 隔離不完整時在 exec 前受控失敗; 新增 vfork/exec, 錯誤, 符號與舊實作對照回歸, 不改變官方 Bun payload 或 Android 13 下限
- `修復` 以鎖定的 MIT 補丁修復實驗 Bun 的啟動 CLOEXEC 回退: 列舉實際開啟的描述符而不限制 fd 編號, 保留 fd 0-3, 標記未完成則明確結束; 新增原生錯誤/邊界測試, 分離建構輸入驗證與執行階段驗收, 不改動正式 runtime 或 Android 13 最低要求
- `修復` 修復正式外掛在逾時, 取消和輸出超限時的程序回收: 使用摘要鎖定的唯讀監督器, 將被忽略的 SIGTERM 升級為 SIGKILL, 等待直接 Bun 子程序結束並保留待排空的輸出; Bun 1.4.0 和 Android 13 最低要求不變
- `修復` 從原檔案編譯共用 SupervisedProcess 並封裝鎖定監督器, 修復 patched Bun 獨立探針的終止路徑; schema 2 建構記錄綁定原始碼, 工具鏈和 helper 位元組, 輸出讀取器保持至終止後才關閉
- `優化` 不改實驗執行階段, 新增第 24 項 openat2 目錄約束探針: 五個原生 4 KiB 環境各兩輪 23/24. 原 230 項觀測通過, 新增 10 次失敗記錄相對/絕對/魔術連結讀取設定根外合成測試哨兵共 60 次. 不放寬斷言, 如實歸檔失敗門檻; 無崩潰, 停滯或測試 UID 程序殘留, 本輪 AVD 已關閉. 原生修復仍未實施
- `優化` 修正 fchmodat2 原始碼審計: 內部 sys::lchmod 使用大寫 SYS_FCHMODAT2, Android node:fs 的兩個公開 lchmod 匯出在十輪中均不存在. 未執行套件可執行檔連結流程的內部回退或依賴安裝; 保留歷史報告, 實驗分發繼續阻斷
- `優化` 不改實驗執行階段位元組, 將 syscall 探針擴為 23 項: 五個原生 4 KiB 環境各兩輪通過 (230/230), 包含 60 次 raw TRAP→ENOSYS 及 16 次 EIO 對照證明呼叫路徑後的複製/等待回退; 明確排除四次 API 28 核心/政策門控觀測的分支觸達結論, 保留原有全部斷言與歷史證據, 清理測試套件和本輪 AVD. 完整 syscall/Binder 與新夾具原生 16 KiB 驗收仍未完成
- `優化` 在六個原生環境驗證 spawn 修復: arm64 API 28/31/33/35 與 x86_64 API 33 (4 KiB), 以及三星 arm64 API 36 (16 KiB) 均以不放寬斷言的 20 項探針完成兩輪 20/20, 合計 240/240; 雙 ABI 各兩輪乾淨建構一致, 36 次強制回收全部通過, 測試套件已移除且本輪 AVD 已關閉. 舊失敗記錄保留, 完整實驗 Binder 與 Release 門檻仍待完成
- `優化` 在 Samsung Remote Test Lab SM-A566B (API 36) 完成原生 ARM64 16 KiB 執行驗證: 官方 Bun 與鎖定監督器組成的 v0.2.1 開發版 arm64-only APK 兩輪通過全部 8 項 Binder 測試, 包含程序重啟, 安裝後摘要及 10 次強制生命週期回收; 歸檔原始碼/APK/記錄綁定並解除安裝測試套件, 最終 Release 與 x86_64 門檻仍獨立保留
- `優化` 先前失敗基線 (c240d6c68): 在同一原生 ARM64 16 KiB 實體裝置記錄未改動實驗 runtime 的兩輪 19/20: 原生 close_range, 啟動標記和生命週期通過, 已知 forced-TRAP 降低 RLIMIT_NOFILE 後的 spawn fd 繼承缺陷仍存在; 保留兩次失敗, 不聲稱完整實驗 Binder 或 runtime 驗收通過
- `優化` 先前失敗基線 (c240d6c68): 新增降低 RLIMIT_NOFILE 的原生/TRAP 對照, 實驗探針擴至 20 項: API 28/31/33/35 四台原生 arm64 實體裝置各兩輪 18/20, API 33 原生 x86_64 AVD 各兩輪 19/20, 均為 4 KiB 頁. 原有 180 次觀測仍通過; 新增 18 次失敗證明 soft limit 降至 128 後兩種 spawn API 均繼承 fd 256. 歸檔失敗, 限制恢復及清理證據, 不修改 runtime 位元組或聲稱缺陷已修復
- `優化` 補充 x64 Windows 的 ARM64 16 KiB 環境指南: VMware/WSL 本身不能提供原生 ARM64 Android, 區分全系統軟件模擬與原生執行, 建議優先核實 Samsung 遠端 16 KiB 實體裝置及 RDB/ADB 的可用性和權限, 不據此聲稱新增裝置驗收通過
- `優化` 此前 18 項基線: 新增 5 項 FD/SIGSYS 專項探針並完成啟動修復複測: API 28/31/33/35 四台原生 arm64 實體裝置及 API 33 原生 x86_64 AVD 各兩輪均為 18/18, 合計 180/180; 雙 ABI 各兩次清潔建構逐位元組一致. 保留原 17/18 失敗報告, 不改動正式 runtime 和 Android 13 最低要求; 完整實驗 Binder 與原生 16 KB 驗證仍待完成
- `優化` 將監督器原始碼, 固定 NDK 建置說明和各 ABI 摘要綁定至 schema 2 對應原始碼 manifest, 精確驗證原始碼壓縮檔內的檔案, 不改動已發佈的 v0.2.0 資產
- `優化` 為可重現的 patched Bun 新增獨立 test-only APK 建構器及明確指定裝置的執行工具, 核對原始碼/APK/runtime 精確摘要, 使用臨時測試簽署, 輸出有界的機器可讀報告
- `優化` API 28, 31, 33, 35 原生 arm64 實體裝置各兩輪通過全部 13 項應用程式處理程序探針; 24 次忽略 SIGTERM 的逾時, 輸出超限及就緒後取消均確認子程序與監督器結束, 工作目錄刪除. 保留原 10/12 失敗報告, 不宣稱完整實驗 Binder 通過或擴大 Android 支援範圍
- `優化` 歸檔已發佈 v0.2.0 的 APK/對應原始碼資產驗證及最終簽署套件裝置驗收證據, 不改寫已發佈標籤, 不擴大 Android 或 16 KB 相容聲明
- `依賴` 將線上建構外掛程式 autojs6-platform-versions 從 1.7.3 升級至 1.7.4, 並同步儲存庫規則中的版本要求

#### v0.2.0

_2026/09/08_

- `提示` 本版本將最低系統要求從 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支援, 需等待補丁版 Bun runtime 通過可移植性驗證
- `修復` 強化 Release 資產驗證: 將 WebKit 歸檔的大小和 SHA-256 直接與鎖定值比較, 並兼容 apksigner 的不同證書輸出格式
- `修復` 不再按 ABI 表的遍歷次序猜測已安裝 runtime, 改用鎖定 payload 的 SHA-256 識別實際 ABI; prewarm 還會執行最小 JavaScript smoke test, 在用戶 script 啟動前拒絕無法執行的 runtime
- `修復` 當 Android 使用超過 4 KiB 的頁面時, 在啟動 process 前拒絕已知不相容的官方 x86_64 runtime; 已將故障收斂到 pinned JavaScriptCore 的 4 KiB page-size ceiling, 以有界診斷取代確定性的 Bun abort
- `優化` 降低最低系統要求: 繼續使用固定的官方 Bun 1.4.0 Android payload, 將支援下限從 Android 14 (API 34) 放寬至 Android 13 (API 33), 覆蓋更多裝置
- `優化` 查明低版本無法使用的根本原因: Android 13 起系統 seccomp 放行 Bun 呼叫的 raw `close_range` syscall, 而 API 31 真機失敗證明 API 28 到 32 需要修改 Bun 本身, 僅修改 manifest 無法解決
- `優化` 為未來支援 Android 9+ 打好基礎: 建立可精確重放的 Bun 源碼補丁方案 (6 個補丁) 並鎖定構建輸入 (固定 NDK 與容器, 22 個 Android release 活躍依賴); 此工作建立獨立實驗線, 不會改動目前安裝套件內的官方 runtime
- `優化` 加強安裝套件品質檢查: 每個 Debug 和 Release APK 均驗證 16 KB ZIP alignment, 精確 ABI 內容以及固定 Bun payload 的大小與 SHA-256, 並在 Android 13 測試裝置上核對已安裝的 payload 位元組
- `優化` 加固供應鏈: 鎖定 19 個 Bun source archive 與 17 個工具鏈下載件的精確位元組, 盤點 181 個 Cargo 和 172 個 Bun registry integrity 條目, 新增拒絕覆寫的 materializer 和受 `buildReady` 閘門保護的雙 ABI 構建預檢
- `優化` 擴充可複製執行的範例庫: 新增附有註解的網絡 fetch, 私人工作目錄檔案讀寫, stdout/stderr 串流輸出和更完整的 TypeScript 類型範例; 文件門禁會檢查首行 `"bun";` 指令以及單一源碼和禁止安裝依賴的邊界
- `優化` 在強制 PAGE_SIZE=16384 的 Android 16 (API 36) AVD 驗證 16 KB 執行: `arm64-v8a` 單 ABI APK 經 `libndk_translation` 完整通過 5 項 Binder instrumentation, 但原生 `x86_64` payload 連最小 script 也會以 exit code 134 中止, 因此仍不聲稱普遍支援 16 KB
- `優化` 完成 Android 9+ 實驗構建供應鏈的 Cargo 部分: 鎖定並實際物化全部 181 個 crates.io archive (26,354,160 bytes), 產生附逐檔 checksum 的 directory source, 並證明固定 Cargo 可在空白 `CARGO_HOME` 下以 `--locked --offline` 讀取完整 Bun workspace; 此結果只涵蓋 Cargo 輸入, 本身不會完成其他構建輸入的閉包
- `優化` 完成該供應鏈的 Bun registry 部分: 將 172 個 lock reference 解析為 Linux x64 的 125 個唯一 npm archive (31,498,870 bytes), 僅從已鎖定 tarball 重建最小 cache, 並在停用網絡且 cache 唯讀的固定 Ubuntu container 中通過全部三次 frozen install; `esbuild@0.21.5` 是唯一包含受信任 postinstall 的依賴
- `優化` 完成 patched runtime 的可重現構建門禁但不隨套件分發: 將 155 個主機 `.deb` archive (422,223,096 bytes) 鎖定為可重複產生的 OCI image, 把 Cargo 閉包擴展至 206 個唯一 archive, 對兩個 64 位 ABI 各執行兩次停網清潔構建並取得逐字節相同結果, 再鎖定純 Node ELF 審計; API 28 與 31 的直接 shell 探針已通過, APK 與應用程式進程門仍未完成
- `優化` 實現可驗證的對應源碼 Release assets: 源碼與 APK 分開但置於同一 Release, 打包精確 Bun/WebKit/JSC, 19 個 native, 206 個 Cargo, 125 個 npm source archive 以及 patch, build/relink 說明與公開許可聲明; 大檔案按 1.9 GB 分片, 用 machine-readable manifest 和 SHA256SUMS 綁定 APK/runtime/source 字節, 僅在 GitHub SHA-256 全部匹配後公開 draft; 此結果表示自動化技術驗證, 不聲稱法律獲批
- `依賴` 新增 Kotlin Parcelize runtime, 確保 Release 版 R8 保留共用的 Parcelable contract class

#### v0.1.0

_2026/09/01_

- `提示` 首個版本: 每次執行一個獨立腳本檔案, 暫不提供 AutoJs6 內置函數, Java bridge, 多檔案專案和相對路徑導入
- `新增` 新增獨立 `bun` 引擎: 在腳本第一行寫上 `"bun";` 即可用官方 Bun 1.4.0 Android executable 執行 JavaScript 和 TypeScript, 實際命令為 `bun run --no-install <source>`, 不會自動安裝依賴
- `新增` 實時回傳執行輸出: stdout 和 stderr 通過有界 oneway Binder callback 分塊串流返回, 最終結果只報告狀態和診斷資訊, 不攜帶完整輸出流
- `新增` 執行可控: 腳本在隔離的 `:bun_runtime` 插件程序中執行, 支援顯式取消, 60 秒預設超時, runtime 資訊查詢和 prewarming
- `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 Android payload, 以及單 ABI 和 `universal` 安裝套件
- `新增` 提供完整插件體驗: 插件發現, 受權限保護的激活 (Wake), 完整 PluginInfo metadata 和 10 種語言的用戶文件
- `優化` 採用版本化 Binder contract, 通過 ParcelFileDescriptor 傳輸源碼, 源碼上限 16 MiB, 合併輸出上限 8 MiB
- `優化` 從 Android 唯讀 native library 目錄啟動 Bun, 並校驗固定 release archive 和打包 binary 的大小, SHA-256 與 ELF 屬性
- `優化` 驗證兩個打包 executable 的 PT_LOAD alignment 均不低於 16 KB, 同時如實說明尚未完成真實 16 KB Android 環境測試
- `優化` 由經過校驗的 JSON 文案源生成 README, 插件中心說明和內置更新日誌, 並加入構建, Markdown 和 runtime artifact 的 CI 檢查
- `優化` 將最低版本暫定為 Android 14 (API 34): API 31 真機上 Bun 的 `close_range` syscall 被 seccomp 以 `SIGSYS` 終止, 一台 Sony API 33 裝置雖意外通過但不足以證明可移植性, API 35 真機 JS 和 TS Binder 往返測試已通過

##### 更多發行記錄

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-zh-Hant-HK.md)

******

### Build 和驗證

******

驗證或 Gradle packaging 前必須由 Git LFS materialize 兩個固定 runtime binary. 下方是標準本地檢查. Build 需要 JDK 17 或更新版本, Node.js 和 Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

插件程式碼採用 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). 隨附官方 Bun executable 包含 Bun 的 MIT licensed code, 以 LGPL-2 靜態連結的 JavaScriptCore 和 WebKit, 以及採用各自 license 的其他 third-party component. 適用的 Release 會公開 license/relinking notice, 並把匹配的對應源碼作為與 APK 分開但位於同一 Release 的 assets 發佈, 同時提供由自動化技術檢查驗證的 machine-readable manifest 和 SHA256SUMS. 請查看 [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 和固定版本 Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### 連結

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 官方網站: https://bun.sh/
- 固定 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三方聲明: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
