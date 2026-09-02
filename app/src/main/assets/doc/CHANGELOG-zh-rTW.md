******

### 發行記錄

******

# v0.2.0

###### 2026/09/01

* `提示` 本版本將最低系統要求從 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支援, 需等待補丁版 Bun runtime 通過可攜性驗證
* `優化` 降低最低系統要求: 繼續使用固定的官方 Bun 1.4.0 Android payload, 將支援下限從 Android 14 (API 34) 放寬至 Android 13 (API 33), 涵蓋更多裝置
* `優化` 查明低版本無法使用的根本原因: Android 13 起系統 seccomp 放行 Bun 呼叫的 raw `close_range` syscall, 而 API 31 實機失敗證明 API 28 到 32 需要修改 Bun 本身, 僅修改 manifest 無法解決
* `優化` 為未來支援 Android 9+ 打好基礎: 建立可精確重放的 Bun 原始碼補丁方案 (6 個補丁) 並鎖定建置輸入 (固定 NDK 與容器, 22 個 Android release 活躍相依性); 補丁版 runtime 尚未建置, 也不會進入目前安裝套件
* `優化` 加強安裝套件品質檢查: 每個 Debug 和 Release APK 均驗證 16 KB ZIP alignment, 精確 ABI 內容以及固定 Bun payload 的大小與 SHA-256, 並在 Android 13 測試裝置上核對已安裝的 payload 位元組
* `優化` 強化供應鏈: 鎖定 19 個 Bun source archive 與 17 個工具鏈下載檔的精確位元組, 盤點 181 個 Cargo 和 172 個 Bun registry integrity 條目, 新增拒絕覆寫的 materializer 和受 `buildReady` 閘門保護的雙 ABI 建置預檢
* `相依性` 新增 Kotlin Parcelize runtime, 確保 Release 版 R8 保留共用的 Parcelable contract class

# v0.1.0

###### 2026/09/01

* `提示` 首個版本: 每次執行一個獨立腳本檔案, 暫不提供 AutoJs6 內建函數, Java bridge, 多檔案專案和相對路徑匯入
* `新增` 新增獨立 `bun` 引擎: 在腳本第一行寫上 `"bun";` 即可用官方 Bun 1.4.0 Android executable 執行 JavaScript 和 TypeScript, 實際命令為 `bun run --no-install <source>`, 不會自動安裝相依套件
* `新增` 即時回傳執行輸出: stdout 和 stderr 透過有界 oneway Binder callback 分塊串流回傳, 最終結果只回報狀態和診斷資訊, 不攜帶完整輸出流
* `新增` 執行可控: 腳本在隔離的 `:bun_runtime` 插件行程中執行, 支援顯式取消, 60 秒預設逾時, runtime 資訊查詢和 prewarming
* `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位元 Android payload, 以及單 ABI 和 `universal` 安裝套件
* `新增` 提供完整插件體驗: 插件探索, 受權限保護的啟用 (Wake), 完整 PluginInfo metadata 和 10 種語言的使用者文件
* `優化` 採用版本化 Binder contract, 透過 ParcelFileDescriptor 傳輸原始碼, 原始碼上限 16 MiB, 合併輸出上限 8 MiB
* `優化` 從 Android 唯讀 native library 目錄啟動 Bun, 並校驗固定 release archive 和打包 binary 的大小, SHA-256 與 ELF 屬性
* `優化` 驗證兩個打包 executable 的 PT_LOAD alignment 均不低於 16 KB, 同時如實說明尚未完成真實 16 KB Android 環境測試
* `優化` 由經過校驗的 JSON 文案源產生 README, 插件中心說明和內建更新日誌, 並加入建置, Markdown 和 runtime artifact 的 CI 檢查
* `優化` 將最低版本暫定為 Android 14 (API 34): API 31 實機上 Bun 的 `close_range` syscall 被 seccomp 以 `SIGSYS` 終止, 一台 Sony API 33 裝置雖意外通過但不足以證明可攜性, API 35 實機 JS 和 TS Binder 往返測試已通過
