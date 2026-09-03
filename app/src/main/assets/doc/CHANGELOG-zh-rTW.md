******

### 發行記錄

******

# v0.2.0

###### 2026/09/01

* `提示` 本版本將最低系統要求從 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支援, 需等待補丁版 Bun runtime 通過可攜性驗證
* `修復` 不再按 ABI 表的遍歷順序猜測已安裝 runtime, 改用鎖定 payload 的 SHA-256 識別實際 ABI; prewarm 還會執行最小 JavaScript smoke test, 在使用者 script 啟動前拒絕無法執行的 runtime
* `修復` 當 Android 使用超過 4 KiB 的頁面時, 在啟動 process 前拒絕已知不相容的官方 x86_64 runtime; 已將故障收斂到 pinned JavaScriptCore 的 4 KiB page-size ceiling, 以有界診斷取代確定性的 Bun abort
* `優化` 降低最低系統要求: 繼續使用固定的官方 Bun 1.4.0 Android payload, 將支援下限從 Android 14 (API 34) 放寬至 Android 13 (API 33), 涵蓋更多裝置
* `優化` 查明低版本無法使用的根本原因: Android 13 起系統 seccomp 放行 Bun 呼叫的 raw `close_range` syscall, 而 API 31 實機失敗證明 API 28 到 32 需要修改 Bun 本身, 僅修改 manifest 無法解決
* `優化` 為未來支援 Android 9+ 打好基礎: 建立可精確重放的 Bun 原始碼補丁方案 (6 個補丁) 並鎖定建置輸入 (固定 NDK 與容器, 22 個 Android release 活躍相依性); 此工作建立獨立實驗線, 不會變更目前安裝套件中的官方 runtime
* `優化` 加強安裝套件品質檢查: 每個 Debug 和 Release APK 均驗證 16 KB ZIP alignment, 精確 ABI 內容以及固定 Bun payload 的大小與 SHA-256, 並在 Android 13 測試裝置上核對已安裝的 payload 位元組
* `優化` 強化供應鏈: 鎖定 19 個 Bun source archive 與 17 個工具鏈下載檔的精確位元組, 盤點 181 個 Cargo 和 172 個 Bun registry integrity 條目, 新增拒絕覆寫的 materializer 和受 `buildReady` 閘門保護的雙 ABI 建置預檢
* `優化` 擴充可複製執行的範例庫: 新增附有註解的網路 fetch, 私人工作目錄檔案讀寫, stdout/stderr 串流輸出和更完整的 TypeScript 型別範例; 文件門禁會檢查首行 `"bun";` 指令以及單一原始碼和禁止安裝依賴的邊界
* `優化` 在強制 PAGE_SIZE=16384 的 Android 16 (API 36) AVD 驗證 16 KB 執行: `arm64-v8a` 單 ABI APK 經 `libndk_translation` 完整通過 5 項 Binder instrumentation, 但原生 `x86_64` payload 連最小 script 也會以 exit code 134 中止, 因此仍不聲稱普遍支援 16 KB
* `優化` 完成 Android 9+ 實驗建置供應鏈的 Cargo 部分: 鎖定並實際物化全部 181 個 crates.io archive (26,354,160 bytes), 產生附逐檔 checksum 的 directory source, 並證明固定 Cargo 可在空的 `CARGO_HOME` 下以 `--locked --offline` 讀取完整 Bun workspace; 此結果僅涵蓋 Cargo 輸入, 本身不會完成其他建置輸入的閉包
* `優化` 完成該供應鏈的 Bun registry 部分: 將 172 個 lock reference 解析為 Linux x64 的 125 個唯一 npm archive (31,498,870 bytes), 僅從已鎖定 tarball 重建最小 cache, 並在停用網路且 cache 唯讀的固定 Ubuntu container 中通過全部三次 frozen install; `esbuild@0.21.5` 是唯一包含受信任 postinstall 的相依套件
* `優化` 完成 patched runtime 的可重現建置門禁但不隨套件散布: 將 155 個主機 `.deb` archive (422,223,096 bytes) 鎖定為可重複產生的 OCI image, 把 Cargo 閉包擴展至 206 個唯一 archive, 對兩個 64 位 ABI 各執行兩次停網全新建置並取得逐位元組相同結果, 再鎖定純 Node ELF 稽核; API 28 與 31 的直接 shell 探針已通過, APK 與應用程式處理程序門仍未完成
* `優化` 鎖定 patched runtime 的對應原始碼輸入但不聲稱發行獲准: 按位元組數與 SHA-256 固定 Bun base source, 以精確 tag, commit, tree 和 463,115-file inventory 驗證 WebKit/JSC, 隨套件加入五份相符授權文本, 並交叉核對 19 個 native, 206 個 Cargo 與 125 個 npm source archive; 實際發布原始碼集及發行級法律複核仍不可省略
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
