Bun Runtime 是一個獨立 Android 插件, 讓 AutoJs6 可以選擇 [Bun](https://bun.sh/) 作為獨立的 JavaScript 和 TypeScript 引擎. 宿主透過檔案描述符傳送一個源碼快照, 插件在自己的 runtime 程序中啟動固定版本的官方 Bun Android executable, 並透過 Binder 傳回標準輸出, 標準錯誤, 完成狀態, timeout 和取消事件. 這是真正的 Bun 執行, 不是 Rhino 或 Node.js 的別名.

此版本在隔離的插件 runtime 程序中使用 `bun run --no-install <source>` 啟動官方 Bun 1.4.0 Android executable. 它接收一個 JS 或 TS 源碼快照, 不會自動安裝缺少的 dependency, 並將 stdout, stderr 和最終狀態串流傳回 AutoJs6.

### 快速開始

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

預期輸出以 `Bun 1.4.0` 開始, 下一行顯示 `android`.

### 0.1 版限制

- 只支援一個源碼快照: 此版本尚未實作多檔 project transfer 和相對 project import.
- 沒有 AutoJs6 globals: Rhino global, Android automation API 和宿主 object 不會出現在 Bun 內.
- 沒有 Java bridge: Bun 無法直接存取 AutoJs6 程序中的 Java class 或 object.
- 不保證完整 toolchain: `bunx`, 裝置端產生的 executable, runtime C compilation 和任意 native addon 不在支援範圍內.
- 不是 security sandbox: Bun script 以受信任程式碼身分在插件 app UID 下執行, 並可使用授予插件的 permission.

請查看[專案 README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime), 了解相容性, 安全, 安裝套件選擇和完整的 0.1 版限制.
