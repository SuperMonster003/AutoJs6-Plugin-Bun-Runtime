******

### 發行記錄

******

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
