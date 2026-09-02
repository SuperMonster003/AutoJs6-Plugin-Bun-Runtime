******

### 發行記錄

******

# v0.2.0

###### 2026/09/01

* `提示` Android 13 (API 33) 現為正式最低目標; API 28 至 32 在 patched Bun runtime 通過可移植驗證前仍不受支援
* `優化` 保留固定的官方 Bun 1.4.0 Android payload, 將支援的 Android 下限由 Android 14 (API 34) 降至 Android 13 (API 33)
* `優化` 記錄 AOSP T seccomp 分界: Android 13 已允許 Bun 呼叫的 raw `close_range` syscall, API 31 失敗則表明 API 28 至 32 需要 Bun 兼容補丁, 只修改 manifest 無法兼容
* `優化` 使用可確定性重播的六個 Bun 源碼 backport patch, 固定的 NDK 與 container 輸入以及 22 個 Android release active dependency 的不可變 identity 為 Android 9+ 實驗作準備, 同時明確保持未 build runtime 不可用
* `優化` 驗證每個 Debug 和 Release APK 的 16 KB ZIP alignment, 準確 ABI 內容, 固定 Bun payload 大小與 SHA-256, 並驗證 Android 13 測試裝置上已安裝的 payload bytes
* `優化` 鎖定 19 個 Bun source archive 與 17 個不可變 direct toolchain download 的準確 bytes, 盤點 181 個 Cargo 及 172 個 Bun registry integrity entry, 並加入拒絕覆寫的 materializer 與受 `buildReady` gate 保護的雙 ABI build preflight
* `依賴` 加入 Release R8 保留共用 Parcelable contract class 所需的 Kotlin Parcelize runtime

# v0.1.0

###### 2026/09/01

* `提示` 首個版本每次執行一個源碼快照, 不提供 AutoJs6 globals, Java bridge, 多檔 project 或相對 project import
* `新增` 使用官方 Bun 1.4.0 Android executable 作為獨立 `bun` 引擎執行 JavaScript 和 TypeScript, 透過 `"bun";` 指令選擇, 並使用 `bun run --no-install <source>` 避免自動安裝 dependency
* `新增` 只透過有界 oneway Binder callback chunk 串流傳回 stdout 和 stderr, terminal result 只報告 status 和 diagnostic, 不攜帶完整 output stream
* `新增` 在隔離的 `:bun_runtime` 插件程序中支援 explicit cancellation, 60 秒 default timeout, runtime information 和 prewarming
* `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64-bit Android payload, 以及單一 ABI 和 `universal` 安裝套件
* `新增` 提供插件 discovery, 受保護的 Wake activation, 完整 PluginInfo metadata 和 10 種語言使用者文件
* `優化` 使用 versioned Binder contract, 透過 ParcelFileDescriptor 傳輸源碼, 源碼上限為 16 MiB, combined output 上限為 8 MiB
* `優化` 從 Android read-only native library directory 啟動 Bun, 並驗證固定 release archive 和 packaged binary 的 size, SHA-256, ELF type, machine 和 alignment
* `優化` 驗證兩個 packaged executable 的 PT_LOAD alignment 均至少為 16 KB, 同時明確記錄尚未完成真正 16 KB Android runtime 測試
* `優化` 從 validated JSON source 產生 README, 插件中心說明和 built-in changelog asset, 並加入 build, Markdown 和 runtime artifact CI 檢查
* `優化` 將最低版本設為 Android 14 (API 34), 因為 API 31 真機上的 Bun syscall 436 `close_range` 被 app seccomp 以 `SIGSYS` 終止. 一部 Sony API 33 裝置意外通過但不能證明可移植支援, API 35 真機 JS 和 TS Binder 往返已通過, 較低版本需等待上游 fallback
