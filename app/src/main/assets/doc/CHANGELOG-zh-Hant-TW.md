******

### 發行記錄

******

# v0.2.1

###### 2026/09/10

* `提示` 尚未發布的開發快照; 正式外掛程式仍要求 Android 13 (API 33) 或更新版本
* `修復` 以鎖定的 MIT 補丁修正實驗 Bun 的啟動 CLOEXEC 備援路徑: 列舉實際開啟的描述元而不限制 fd 編號, 保留 fd 0-3, 標記未完成則明確結束; 新增原生錯誤/邊界測試, 分離建置輸入驗證與執行階段驗收, 不更動正式 runtime 或 Android 13 最低需求
* `修復` 修正正式外掛在逾時, 取消和輸出超限時的處理程序回收: 使用摘要鎖定的唯讀監督器, 將被忽略的 SIGTERM 升級為 SIGKILL, 等待直接 Bun 子處理程序結束並保留待排空的輸出; Bun 1.4.0 和 Android 13 最低需求不變
* `修復` 從原始檔編譯共用 SupervisedProcess 並封裝鎖定監督器, 修正 patched Bun 獨立探針的終止路徑; schema 2 建置紀錄綁定原始碼, 工具鏈與 helper 位元組, 輸出讀取器保持至終止後才關閉
* `優化` 新增 5 項 FD/SIGSYS 專項探針並完成啟動修正複測: API 28/31/33/35 四台原生 arm64 實體裝置及 API 33 原生 x86_64 AVD 各兩輪均為 18/18, 合計 180/180; 雙 ABI 各兩次乾淨建置逐位元組一致. 保留原 17/18 失敗報告, 不更動正式 runtime 和 Android 13 最低需求; 完整實驗 Binder 與原生 16 KB 驗證仍待完成
* `優化` 將監督器原始碼, 固定 NDK 建置說明和各 ABI 摘要綁定至 schema 2 對應原始碼 manifest, 精確驗證原始碼壓縮檔內的檔案, 不改動已發布的 v0.2.0 資產
* `優化` 為可重現的 patched Bun 新增獨立 test-only APK 建置器及明確指定裝置的執行工具, 核對原始碼/APK/runtime 精確摘要, 使用暫時測試簽章, 輸出有界的機器可讀報告
* `優化` API 28, 31, 33, 35 原生 arm64 實體裝置各兩輪通過全部 13 項應用程式處理程序探針; 24 次忽略 SIGTERM 的逾時, 輸出超限與就緒後取消均確認子處理程序及監督器結束, 工作目錄刪除. 保留原 10/12 失敗報告, 不宣稱完整實驗 Binder 通過或擴大 Android 支援範圍
* `優化` 封存已發布 v0.2.0 的 APK/對應原始碼資產驗證及最終簽署套件裝置驗收證據, 不改寫已發布標籤, 不擴大 Android 或 16 KB 相容性聲明
* `相依性` 將線上建置外掛程式 autojs6-platform-versions 從 1.7.3 升級至 1.7.4, 並同步儲存庫規則中的版本要求

# v0.2.0

###### 2026/09/08

* `提示` 本版本將最低系統要求從 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支援, 需等待補丁版 Bun runtime 通過可攜性驗證
* `修復` 強化 Release 資產驗證: 將 WebKit 封存檔的大小和 SHA-256 直接與鎖定值比較, 並相容 apksigner 的不同憑證輸出格式
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
* `優化` 實作可驗證的對應原始碼 Release assets: 原始碼與 APK 分開但置於同一 Release, 封裝精確 Bun/WebKit/JSC, 19 個 native, 206 個 Cargo, 125 個 npm source archive 以及 patch, build/relink 說明與公開授權聲明; 大型檔案按 1.9 GB 分片, 用 machine-readable manifest 和 SHA256SUMS 綁定 APK/runtime/source 位元組, 僅在 GitHub SHA-256 全部相符後公開 draft; 此結果表示自動化技術驗證, 不聲稱法律核准
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
