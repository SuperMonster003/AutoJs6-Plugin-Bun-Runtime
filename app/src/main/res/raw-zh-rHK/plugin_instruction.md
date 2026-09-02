本插件讓 AutoJs6 使用官方 Bun 1.4.0 引擎執行 JavaScript 和 TypeScript: 在腳本第一行寫上 `"bun";`, 檔案就會交給隔離插件程序中的 Bun 執行 (實際命令為 `bun run --no-install <source>`), 輸出和執行結果即時傳回 AutoJs6. 每次只執行目前檔案的一份快照, 不會自動安裝 npm dependency.

### 安裝和使用

1. 準備環境: 在 Android 13 (API 33) 或更新版本系統上, 安裝 AutoJs6 build 5278 (6.8.0) 或更新版本.
2. 安裝插件: 從 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) 下載並安裝與裝置相符的 APK. 大部分手機和平板選擇 `arm64-v8a`, 模擬器或 x86_64 裝置選擇 `x86_64`, 不確定時選擇 `universal` (體積稍大, 兩類裝置均可用).
3. 啟用插件: 開啟 AutoJs6 的插件中心並啟用 Bun Runtime. 如果新安裝的插件顯示為停止狀態, 點按宿主提供的 `啟動` 操作即可.
4. 執行腳本: 在 JavaScript 或 TypeScript 檔案的第一行單獨寫上 `"bun";` (含引號和分號), 然後照常在 AutoJs6 中執行這個檔案.

### 快速開始

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

如果一切正常, 輸出第一行為 `Bun 1.4.0`, 第二行為 `android`.

### 目前限制

- 只執行單一檔案: 插件每次接收並執行一個源碼快照, 不傳輸專案目錄, 因此 `import './utils.js'` 這類相對路徑 import 無法解析. 單檔內部的 ESM 語法不受影響; 需要多個模組時, 可先在電腦上打包為單一檔案 (見常見問題).
- 沒有 AutoJs6 內置函數: `click()`, `toast()` 等自動化 API 和 Rhino 全域物件在 Bun 腳本中不存在, Bun 腳本目前適合計算, 文字處理, 網絡請求等不依賴宿主能力的任務.
- 沒有 Java bridge: Bun 腳本無法直接存取 AutoJs6 程序中的 Java class 或 object.
- 不保證完整的 Bun toolchain: `bunx`, 裝置端產生 executable, runtime C compilation 和任意 native addon 均不在支援範圍內.
- 不是 security sandbox: Bun 腳本以受信任程式碼身分在插件程序中執行, 可以使用授予插件的 permission, 請只執行你信任的腳本.

關於相容性, 權限, 安裝套件選擇和全部目前限制, 請查看[專案 README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime).
