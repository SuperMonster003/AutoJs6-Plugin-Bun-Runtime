******

### 發行記錄

******

# v0.2.2

###### 2026/09/15

* `新增` 新增透過工作區歸檔執行多檔案專案 (M6): 共享契約增加 workspaceArchiveVersion, workspaceEntryPoint, workspaceMaxEntries 與 workspaceMaxBytes 請求鍵及 SUPPORTS_WORKSPACE_ARCHIVE 能力位, runScript 把有界 ZIP 快照原子展開到本次執行的私有工作區後, 以專案目錄為工作目錄執行入口檔案. 規則: 只接受相對路徑, 拒絕穿越/絕對/反斜線/冒號/控制字元路徑, 大小寫與 Unicode 形式不敏感的重複偵測, 檔案/目錄衝突檢查, 最多 16384 條目, 解壓後 64 MiB 且單檔案 16 MiB, 入口檔案校驗與取消清理; 只建立普通檔案和目錄, 不帶該鍵的宿主繼續走不變的單一原始碼路徑. 需要宿主打包專案目錄; AutoJs6 引擎側改動已同步準備, 尚未發佈
* `修復` Release 校驗器改為以相對的壓縮檔名稱讀取專案原始碼壓縮檔成員, 使監督器原始碼精確核對在 Windows 的 GNU tar 下同樣可用; CI 與已發佈資產不變
* `修復` 修復實驗 watch 重載在 close_range 失敗時洩漏描述符的問題: 在 exec 前使用既有有界 raw syscall fallback 為實際 FD 標記 CLOEXEC, 設定不完整時停止執行. 保留 stdio, 明確 IPC 和原訊號生命週期. GCC/Clang 完整原始碼對照涵蓋真實 exec, 高位 FD, 降低後的硬限制和注入失敗; 新 native 建構與不變的 Android 測試套件分別記錄. 歷史失敗, 官方產物及發佈界限維持不變
* `修復` 修正 Bun 原始碼更新後歷史實驗 JSC 候選的驗證: 綁定完整且不可變的建置封存, 新建置仍嚴格核對目前輸入
* `修復` 修復實驗 Android epoll 等待提前交付呼叫者已屏蔽的 pending 訊號: 保留 caller mask, 並在呼叫點維持已有 epoll_pwait2 停用. GCC/Clang 回歸直接編譯修復前後的完整等待函式; 全新 native 建置與原定義裝置套件獨立取證, 保留十一補丁失敗檔案及官方支援範圍. 原定義套件在五個原生 4 KiB 環境各兩輪通過: 應用程式探針 330/330, Binder 80/80. 兩次 API 28 ART 啟動失敗獨立封存, 第三次相同 APK 兩輪通過; 新原始碼原固定測試的 Samsung ARM64 裝置門檻已補齊; JSC rebase 已另行記錄
* `修復` 歷史十一補丁結果: 修復實驗 Android spawn 提前交付 pending SIGSYS: 父執行緒保留呼叫者 mask, 僅子路徑允許設定階段的訊號處理, 呼叫者屏蔽 SIGSYS 時使用既有子行程 cgroup 加入路徑. GCC/Clang 主機回歸涵蓋完整生產函式及舊源碼失敗對照; 新源碼建置與裝置證據獨立記錄, 不轉移歷史驗收或擴大官方支援. 裝置複測確認 spawn 返回時訊號保持, 但非同步等待期間仍提前交付; 獨立唯讀 epoll 暫存器/遮罩證據定位下一處阻斷, 完整 33 項門檻仍未通過
* `修復` 修正執行環境啟動檢查的暫時失敗被永久快取的問題: 失敗完成後等候 30 秒, 在後續請求時重試, 並行請求共用同一次檢查; 各檢查輸出串流限制為 4 KiB. 保留本地化摘要, 加入 API, ABI, 階段, 執行環境身分, 結束碼和重試診斷, 明確標示訊號僅為推斷; 原生位元組及支援範圍不變
* `修復` 修復實驗版 Android 在屏蔽 SIGSYS 時首次非同步 spawn 的 pidfd 探測崩潰, 透過既有 waiter 回退保留呼叫執行緒遮罩及 pending 訊號. 十補丁執行階段在五個原生 4 KiB 環境通過原 31 項探針 (310/310) 和完整八項 Binder (80/80). 恢復建置完成證據時明確保留原退出碼缺失, 獨立封存首次 ART 啟動失敗. JSC rebase 及 Release 門檻仍未完成, 官方位元組不變
* `修復` 修復實驗版原生 x86_64 16 KiB 的 JavaScriptCore 啟動中止: 以明確大頁/JIT/分配器設定重新編譯 pinned WebKit 並重新連結 Bun, 在 4 KiB 和 16 KiB AVD 各兩輪完整 Binder 通過 (32/32). 官方位元組及其 4 KiB 防護保持不變, Release 驗收另行進行
* `優化` 新增透過生產 Binder 服務執行的四個固定離線 TLS/IPv6 模式: TLS 1.2/1.3, 憑證與主機名稱拒絕, 已驗證 HTTPS, IPv6 TCP/UDP/HTTP. 綁定公開測試憑證, 精確原始碼, APK 和兩個套件的 UID, 維持原套件計數與發佈邊界
* `優化` 新增透過生產 Binder 服務執行的四個固定離線 API 模式: 檔案及目錄監聽, 執行個體級本機 DNS, 二進位 TCP 半關閉, HTTP 重新導向/串流讀取/取消. 綁定精確原始碼, APK 和兩個套件的 UID, 保留失敗記錄, 原套件計數與發佈邊界維持不變
* `優化` 新增保留原七模式壓力順序, DFG 提前停止邏輯與斷言的獨立診斷. 在重新拋出失敗前記錄有界逐輪資料, 核對精確原始碼與兩個套件的 UID, 保持歷史結果和相容性計數不變
* `優化` 新增獨立的完整採樣堆疊與內聯呼叫者診斷, 固定比較 PC 映射開關. 保留原熱迴圈和門檻, 核驗額外 profiler 選項的最終值, 每類儲存首份完整堆疊並明確記錄位元組超限省略, 獨立核對呼叫者身分和編譯決定, 不增加相容性通過數
* `優化` 新增有界 JSC 採樣 PC 映射對照: 原樣重用四段工作負載, 回讀實際生效選項, 保留編譯器內聯決定, 真實執行層級及 exit 1. 第二輪反轉對照順序, 原測試, 預算, 原生位元組與支援範圍不變
* `優化` 新增固定四段 JSC profiler 重啟/清空診斷及明確不執行目標函數的 exit 1 對照. 保留階段證據, 時間戳記和原始 UID 清理記錄, 不改變原壓力/採樣測試或聲稱重現歷史故障
* `優化` 新增獨立有界 DFG 採樣診斷, 記錄逐次採樣時間, 呼叫數, 堆疊框架分佈和最佳化計數. 保留樣本不足時的結束結果及精確原始碼/APK/UID 證據, 不改變原壓力測試, 預算, 執行環境或相容接受數
* `優化` 補充開發環境磁碟維護指南, 清理建置快取與已退役模擬器時保留執行環境來源, 測試產物及失敗紀錄
* `優化` 獨立鎖定十三補丁大頁 JSC 候選: 兩次全新 Bun 乾淨構建實際退出碼均為 0, 完整成品一致且 21 項構建輸入未漂移. 重用原獨立 JSC 庫及 ICU, 新 APK 與原 Binder/七模式壓力回歸獨立綁定, 不轉移歷史成績或擴大發佈範圍
* `優化` 為固定 watch/reload 診斷加入有界 SIGABRT 唯讀快照, 保留原訊號交付及預算. 原生 ARM64 API 28/31 共 16 次 plain/traced 觀察完成 32 次重載, 捕獲 24 次普通 SIGSYS, 套件和 UID 已清理; 未重現的原 API 28 中止原因仍待查明, 不增加兼容通過數
* `優化` 新增固定 native/TRAP watch/reload 回歸, 保留十二補丁原生位元組和原33項. 四個 ARM64 / 4 KiB 真機環境中原項264/264通過, 新模式14/16失敗, 32次重新載入暴露28次 FD繼承洩漏; Sony 5.15原生對照通過, 強制TRAP失敗. 保留三個原始碼綁定APK批次和早期驗證器修正, 核對全部套件及UID清理. native修復, 擴展相容性和Release門檻仍未完成
* `優化` 完成十二補丁 Samsung SM-F936U / API 32 / 原生 ARM64 / 4 KiB 回歸: 兩輪原探針 66/66, 完整 Binder 16/16. 與 API 36 批次重用相同三個 APK, 40 個 pending 保持檢查點及十二個 child 觀測通過. 三個測試套件解除安裝, 三個 UID 行程清零, 專用 ADB 關閉且無 AVD 操作. 原固定測試的兩項 Samsung 裝置門檻已補齊, baseline 七環境累計 462/462 探針及 112/112 Binder; 廣泛 runtime, 壓力及 Release 門檻仍未完成
* `優化` 完成十二補丁原位元組在 Samsung SM-A566B / API 36 / 原生 ARM64 / 硬件 16 KiB 的回歸: 兩輪原 33 項探針 66/66, 完整 Binder 16/16. 四個 pending 訊號模式保留 40 個檢查點及十二個 child 觀測, 最後各向原 caller 交付一次. 重用相同 APK, 無 native 重建; 解除安裝後三個 UID 行程清零, 關閉本輪專用 ADB 且無 AVD 操作. baseline 六環境累計 396/396 探針及 96/96 Binder; ARM64 API 32, 廣泛 runtime 及 Release 門檻仍未完成
* `優化` 完成十二補丁大頁 JSC 候選在 API 36 原生 x86_64 的 4 KiB/16 KiB 使用者頁回歸: 同一 83 輸入 APK 的原 Binder 通過 32/32, 固定壓力模式通過 28/28. 初次低記憶體服務終止獨立封存, 相同 APK 在不改設定或預算的完整重試中通過. 解除安裝後獨立檢查兩個套件 UID 均無程序, 區分 x86 頁模擬, Samsung baseline 和 Release 門檻
* `優化` 獨立鎖定十二補丁大頁 JSC 候選, 兩次全新 Bun 清潔建置一致, 保留實際退出碼並驗證 21 項建置輸入未漂移. 精確重用原獨立 JSC 程式庫和 ICU, 保留歷史候選, 讓隔離 Binder 工具使用新的原始碼鎖. 原壓力測試, 語義驗證器與預算不變, 裝置和 Release 驗收另行記錄
* `優化` 新增固定 pending-SIGSYS spawn 探針與獨立訊號追蹤: 原生 ARM64 API 28/31 的兩個新模式各失敗兩次, 原 31 項全部通過; 八次追蹤確認 SI_TKILL 提前交付. 歸檔失敗, 原始碼/APK 綁定及清理記錄, 不修改 native 位元組或擴大兼容聲明
* `優化` 執行錯誤摘要涵蓋全部 10 種語言, 保留固定錯誤代碼及有界技術詳情; 啟動, Android 要求, 逾時及輸出超限說明直接取自同一組 Android 資源. 快取的分頁大小拒絕按外掛目前語言顯示, 診斷截斷保留完整 Unicode 字元
* `優化` 新增自動產生的兼容證據矩陣, 完整索引來源報告並綁定歷史封存摘要, 由 CI 檢查同步差異; 按執行環境, 裝置和測試套件保留結果及失敗/初步診斷, 不增加裝置驗收或擴大正式支援範圍
* `優化` 新十補丁大頁 x86 候選在 API 36 的 4 KiB/16 KiB 使用者空間頁完成回歸: 同一對 APK 綁定 77 項輸入, 原 Binder 測試 32/32, 原固定壓力模式 28/28 全部通過. 精確位元組, 原始結果及清理另檔保留, 不改寫歷史; x86 16 KiB 仍是 4 KiB 核心頁上的 ABI 模擬, 不表示 Release 或效能驗收
* `優化` 獨立綁定十補丁大頁 JSC 候選, 強制兩份一致的 clean Bun 建置, 保留真實驅動退出碼並精確重用原 JSC 輸入. 隔離 Binder 工具改用綁定新原始碼的獨立鎖, 歷史及官方位元組保持不變; 裝置與 Release 驗收另行記錄
* `優化` 新增簡體中文排錯指南, 提供最小指令碼, 症狀/原因/處理對照及有界問題回報指引, 並從十語言 README 連結, 不改變執行階段能力
* `優化` 完成未改動十補丁執行階段的三星回歸: 原生 ARM64 API 32 / 4 KiB 與 API 36 / 16 KiB 使用完全相同的 APK, 各通過兩輪原 31 項探針 (62/62) 和兩輪完整八項 Binder (16/16). 七個原生環境累計探針 434/434, Binder 112/112. 精確綁定原始碼, APK 和清理證據, 未重新編譯 native 或操作 AVD; JSC rebase, 擴展執行階段矩陣和 Release 門檻繼續開放
* `優化` 新增獨立 test-only SIGSYS 觀察器: 原生 ARM64 API 28 四次失敗直接定位 pidfd_open, 未追蹤對照同樣失敗, API 31 對照通過. 綁定原始證據, 保留初版工具失敗, 驗證訊號轉發, 防竄改和清理; 此診斷不等於新執行階段, Binder 或 Release 驗收
* `優化` 新增兩個固定 blocked-SIGSYS 非同步 spawn 探針, 保持原 29 項定義和 native 位元組不變: 四個原生 4 KiB 環境通過 248/248, 但 Sony API 28 的兩個新模式各失敗兩次, exit 159 (整體 58/62). 四次失敗獨立嚴格歸檔, 相容性門檻維持未通過; 清理測試套件, UID 程序和本輪 AVD, 不新增 Binder, 16 KiB 或 Release 驗收結論
* `優化` 補齊 Samsung SM-A566B / API 36 上四種硬 FD 上限模式的原生 ARM64 16 KiB 驗證: 同一 APK 和未改動的 29 項探針兩輪通過 58/58, 含 8 次硬上限觀測, 原生 close_range 與 forced-TRAP 回退均成功. 解除安裝後 UID 處理程序為零, 未操作 AVD; 七環境累計 406/406. 未重編 native, 未重跑 Binder, 不作為 Release 驗收
* `優化` 確認 Samsung Galaxy Z Fold4 SM-F936U 實際為 API 32 / Android 12L, 原生 ARM64 / 4 KiB: 現有 Binder 兩輪 16/16, 未改動的 29 項應用程式探針 58/58, 含全部 8 次硬上限驗證. 精確綁定 APK/原始碼/原始證據, 解除安裝三個測試套件並確認 UID 處理程序為零, 未操作 AVD. 原生位元組不變; 新四模式的 ARM64 原生 16 KiB, 擴展矩陣與 Release 門檻仍未完成
* `優化` 保留原 25 項定義和執行階段位元組, 新增四項 Android FD 硬上限探針: 五個原生 4 KiB 環境各兩輪 29/29 (合計 290/290), 含 40 次硬上限驗證. 軟/硬上限降至 128 後啟動 CLOEXEC 和兩種 spawn API 均正確, 應用程式和 supervisor 上限不變. 綁定原始證據, 清理測試套件和本輪 AVD; FD 70000, 新用例原生 16 KiB 與 Release 門檻仍未完成
* `優化` 新增獨立有界 JSC 壓力驗收: API 36 x86_64 的 4 KiB 與模擬 16 KiB 用戶空間頁各兩輪通過七種離線模式 (28/28), 包含 LLInt/Baseline/DFG/FTL 實際採樣, GC, Wasm 及 64 個 worker 正常退出. 同一 APK 的原有 Binder 套件另行通過 32/32. 單獨記錄 4 KiB 核心映射, 保留早期工具執行結果並清理本輪裝置; 原生位元組, 正式支援範圍及 Release 門檻不變
* `優化` 補齊 API 29/32 原生 x86_64 / 4 KiB 驗證: 各兩輪新增 Binder 32/32 與未改動的應用程式探針 100/100, 完成現有 Binder 套件的 API 28-32 x86 版本覆蓋. 新增拒絕原始報告/原始碼/清理紀錄不一致的歸檔工具; 保留歷史證據, ARM64 API 32 和 Release 門檻仍未完成, 僅關閉本輪啟動的兩台 AVD
* `優化` 新增獨立套件名稱的可選 test-only 實驗插件, 重用生產服務及完整 8 項 Binder 套件驗證鎖定的九補丁 Bun: 九個原生環境各兩輪全部通過 (144/144), 包含 ARM64 16 KiB; 保存 APK/原始碼綁定與清理證據, 不擴大穩定版支援範圍
* `優化` 在不改變執行階段位元組和原 24 項探針的前提下, 新增內部 lchmod/fchmodat2 固定離線 CLI 探針: 含 ARM64 16 KiB 的六個原生環境各兩輪 25/25, 合計 300/300. 驗證權限修改, 重複連結, 不跟隨符號連結, 被忽略的 EIO 及 SIGSYS 路徑觸達與有界執行緒回收; 保留早期夾具失敗, 解除安裝測試套件並關閉本輪 AVD. 完整實驗 Binder 與 Release 閘門仍未完成
* `優化` 在 Samsung 原生 ARM64 / API 36 / 16 KiB 使用相同 APK 和未改動的 24 項套件驗證九補丁實驗 Bun: 兩輪 48/48, 全部 48 項路徑斷言通過, 12 次越界請求均拒絕測試哨兵; 測試套件解除安裝後 UID 程序為零, 未啟動或關閉 AVD. 完整實驗 Binder, Release 和 x86_64 16 KiB 閘門仍未完成
* `優化` 建置階段校驗 64 位原生程式庫的 16 KB 頁面大小對齊, 檢查 manifest 契約並輸出 JSON 報告
* `依賴` 將線上 platform-versions 插件與儲存庫要求的 1.8.0 對齊, 保持 native-alignment 插件不變
* `依賴` 將 compileSdk 提升到 37, 以便使用 AutoJs6 宿主 build 5280 的共享 bun-runtime-api AAR (其 AAR 元資料要求編譯 SDK 37); minSdk 33 與 targetSdk 36 不變

# v0.2.1

###### 2026/09/10

* `提示` 尚未發佈的開發快照; 正式外掛程式仍要求 Android 13 (API 33) 或更高版本
* `修復` 以鎖定的 MIT FD 相對路徑回退保留 openat2 不可用時的實驗靜態目錄服務: 固定路徑組件, 解析根內連結, 拒絕根外與魔術連結, 限定遍歷並管理錯誤和 FD 擁有權; 不改變一般 Bun.file/node:fs 存取, 官方執行階段位元組或 Android 13 最低要求
* `修復` 透過鎖定的 MIT 補丁修復實驗執行階段 Linux spawn FD 回退: 使用固定堆疊緩衝區與原始 syscall 列舉實際描述符, 涵蓋降低軟/硬限制前已開啟及超過舊 65536 上界的 FD, 隔離不完整時在 exec 前受控失敗; 新增 vfork/exec, 錯誤, 符號與舊實作對照回歸, 不改變官方 Bun payload 或 Android 13 下限
* `修復` 以鎖定的 MIT 補丁修復實驗 Bun 的啟動 CLOEXEC 回退: 列舉實際開啟的描述符而不限制 fd 編號, 保留 fd 0-3, 標記未完成則明確結束; 新增原生錯誤/邊界測試, 分離建構輸入驗證與執行階段驗收, 不改動正式 runtime 或 Android 13 最低要求
* `修復` 修復正式外掛在逾時, 取消和輸出超限時的程序回收: 使用摘要鎖定的唯讀監督器, 將被忽略的 SIGTERM 升級為 SIGKILL, 等待直接 Bun 子程序結束並保留待排空的輸出; Bun 1.4.0 和 Android 13 最低要求不變
* `修復` 從原檔案編譯共用 SupervisedProcess 並封裝鎖定監督器, 修復 patched Bun 獨立探針的終止路徑; schema 2 建構記錄綁定原始碼, 工具鏈和 helper 位元組, 輸出讀取器保持至終止後才關閉
* `優化` 驗證目錄回退修復: 雙 ABI 各兩輪清潔建置逐位元組一致, 五個原生 4 KiB 環境按原 24 項斷言各兩輪通過 (240/240), 原先失敗的 60 項越界斷言全部拒絕哨兵且一般目錄服務保留. GCC/Clang 與 GCC ASan/UBSan 測試通過, 測試套件及本輪 AVD 已清理. 舊失敗記錄不改寫; 新版原生 ARM64 16 KiB, 完整 Binder 與 Release 門檻仍待完成
* `優化` 此前失敗基線 (a260ef308): 不改實驗執行階段, 新增第 24 項 openat2 目錄約束探針: 五個原生 4 KiB 環境各兩輪 23/24. 原 230 項觀測通過, 新增 10 次失敗記錄相對/絕對/魔術連結讀取設定根外合成測試哨兵共 60 次. 不放寬斷言, 如實歸檔失敗門檻; 無崩潰, 停滯或測試 UID 程序殘留, 本輪 AVD 已關閉. 原生修復仍未實施
* `優化` 修正 fchmodat2 原始碼審計: 內部 sys::lchmod 使用大寫 SYS_FCHMODAT2, Android node:fs 的兩個公開 lchmod 匯出在十輪中均不存在. 未執行套件可執行檔連結流程的內部回退或依賴安裝; 保留歷史報告, 實驗分發繼續阻斷
* `優化` 不改實驗執行階段位元組, 將 syscall 探針擴為 23 項: 五個原生 4 KiB 環境各兩輪通過 (230/230), 包含 60 次 raw TRAP→ENOSYS 及 16 次 EIO 對照證明呼叫路徑後的複製/等待回退; 明確排除四次 API 28 核心/政策門控觀測的分支觸達結論, 保留原有全部斷言與歷史證據, 清理測試套件和本輪 AVD. 完整 syscall/Binder 與新夾具原生 16 KiB 驗收仍未完成
* `優化` 在六個原生環境驗證 spawn 修復: arm64 API 28/31/33/35 與 x86_64 API 33 (4 KiB), 以及三星 arm64 API 36 (16 KiB) 均以不放寬斷言的 20 項探針完成兩輪 20/20, 合計 240/240; 雙 ABI 各兩輪乾淨建構一致, 36 次強制回收全部通過, 測試套件已移除且本輪 AVD 已關閉. 舊失敗記錄保留, 完整實驗 Binder 與 Release 門檻仍待完成
* `優化` 在 Samsung Remote Test Lab SM-A566B (API 36) 完成原生 ARM64 16 KiB 執行驗證: 官方 Bun 與鎖定監督器組成的 v0.2.1 開發版 arm64-only APK 兩輪通過全部 8 項 Binder 測試, 包含程序重啟, 安裝後摘要及 10 次強制生命週期回收; 歸檔原始碼/APK/記錄綁定並解除安裝測試套件, 最終 Release 與 x86_64 門檻仍獨立保留
* `優化` 先前失敗基線 (c240d6c68): 在同一原生 ARM64 16 KiB 實體裝置記錄未改動實驗 runtime 的兩輪 19/20: 原生 close_range, 啟動標記和生命週期通過, 已知 forced-TRAP 降低 RLIMIT_NOFILE 後的 spawn fd 繼承缺陷仍存在; 保留兩次失敗, 不聲稱完整實驗 Binder 或 runtime 驗收通過
* `優化` 先前失敗基線 (c240d6c68): 新增降低 RLIMIT_NOFILE 的原生/TRAP 對照, 實驗探針擴至 20 項: API 28/31/33/35 四台原生 arm64 實體裝置各兩輪 18/20, API 33 原生 x86_64 AVD 各兩輪 19/20, 均為 4 KiB 頁. 原有 180 次觀測仍通過; 新增 18 次失敗證明 soft limit 降至 128 後兩種 spawn API 均繼承 fd 256. 歸檔失敗, 限制恢復及清理證據, 不修改 runtime 位元組或聲稱缺陷已修復
* `優化` 補充 x64 Windows 的 ARM64 16 KiB 環境指南: VMware/WSL 本身不能提供原生 ARM64 Android, 區分全系統軟件模擬與原生執行, 建議優先核實 Samsung 遠端 16 KiB 實體裝置及 RDB/ADB 的可用性和權限, 不據此聲稱新增裝置驗收通過
* `優化` 此前 18 項基線: 新增 5 項 FD/SIGSYS 專項探針並完成啟動修復複測: API 28/31/33/35 四台原生 arm64 實體裝置及 API 33 原生 x86_64 AVD 各兩輪均為 18/18, 合計 180/180; 雙 ABI 各兩次清潔建構逐位元組一致. 保留原 17/18 失敗報告, 不改動正式 runtime 和 Android 13 最低要求; 完整實驗 Binder 與原生 16 KB 驗證仍待完成
* `優化` 將監督器原始碼, 固定 NDK 建置說明和各 ABI 摘要綁定至 schema 2 對應原始碼 manifest, 精確驗證原始碼壓縮檔內的檔案, 不改動已發佈的 v0.2.0 資產
* `優化` 為可重現的 patched Bun 新增獨立 test-only APK 建構器及明確指定裝置的執行工具, 核對原始碼/APK/runtime 精確摘要, 使用臨時測試簽署, 輸出有界的機器可讀報告
* `優化` API 28, 31, 33, 35 原生 arm64 實體裝置各兩輪通過全部 13 項應用程式處理程序探針; 24 次忽略 SIGTERM 的逾時, 輸出超限及就緒後取消均確認子程序與監督器結束, 工作目錄刪除. 保留原 10/12 失敗報告, 不宣稱完整實驗 Binder 通過或擴大 Android 支援範圍
* `優化` 歸檔已發佈 v0.2.0 的 APK/對應原始碼資產驗證及最終簽署套件裝置驗收證據, 不改寫已發佈標籤, 不擴大 Android 或 16 KB 相容聲明
* `依賴` 將線上建構外掛程式 autojs6-platform-versions 從 1.7.3 升級至 1.7.4, 並同步儲存庫規則中的版本要求

# v0.2.0

###### 2026/09/08

* `提示` 本版本將最低系統要求從 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支援, 需等待補丁版 Bun runtime 通過可移植性驗證
* `修復` 強化 Release 資產驗證: 將 WebKit 歸檔的大小和 SHA-256 直接與鎖定值比較, 並兼容 apksigner 的不同證書輸出格式
* `修復` 不再按 ABI 表的遍歷次序猜測已安裝 runtime, 改用鎖定 payload 的 SHA-256 識別實際 ABI; prewarm 還會執行最小 JavaScript smoke test, 在用戶 script 啟動前拒絕無法執行的 runtime
* `修復` 當 Android 使用超過 4 KiB 的頁面時, 在啟動 process 前拒絕已知不相容的官方 x86_64 runtime; 已將故障收斂到 pinned JavaScriptCore 的 4 KiB page-size ceiling, 以有界診斷取代確定性的 Bun abort
* `優化` 降低最低系統要求: 繼續使用固定的官方 Bun 1.4.0 Android payload, 將支援下限從 Android 14 (API 34) 放寬至 Android 13 (API 33), 覆蓋更多裝置
* `優化` 查明低版本無法使用的根本原因: Android 13 起系統 seccomp 放行 Bun 呼叫的 raw `close_range` syscall, 而 API 31 真機失敗證明 API 28 到 32 需要修改 Bun 本身, 僅修改 manifest 無法解決
* `優化` 為未來支援 Android 9+ 打好基礎: 建立可精確重放的 Bun 源碼補丁方案 (6 個補丁) 並鎖定構建輸入 (固定 NDK 與容器, 22 個 Android release 活躍依賴); 此工作建立獨立實驗線, 不會改動目前安裝套件內的官方 runtime
* `優化` 加強安裝套件品質檢查: 每個 Debug 和 Release APK 均驗證 16 KB ZIP alignment, 精確 ABI 內容以及固定 Bun payload 的大小與 SHA-256, 並在 Android 13 測試裝置上核對已安裝的 payload 位元組
* `優化` 加固供應鏈: 鎖定 19 個 Bun source archive 與 17 個工具鏈下載件的精確位元組, 盤點 181 個 Cargo 和 172 個 Bun registry integrity 條目, 新增拒絕覆寫的 materializer 和受 `buildReady` 閘門保護的雙 ABI 構建預檢
* `優化` 擴充可複製執行的範例庫: 新增附有註解的網絡 fetch, 私人工作目錄檔案讀寫, stdout/stderr 串流輸出和更完整的 TypeScript 類型範例; 文件門禁會檢查首行 `"bun";` 指令以及單一源碼和禁止安裝依賴的邊界
* `優化` 在強制 PAGE_SIZE=16384 的 Android 16 (API 36) AVD 驗證 16 KB 執行: `arm64-v8a` 單 ABI APK 經 `libndk_translation` 完整通過 5 項 Binder instrumentation, 但原生 `x86_64` payload 連最小 script 也會以 exit code 134 中止, 因此仍不聲稱普遍支援 16 KB
* `優化` 完成 Android 9+ 實驗構建供應鏈的 Cargo 部分: 鎖定並實際物化全部 181 個 crates.io archive (26,354,160 bytes), 產生附逐檔 checksum 的 directory source, 並證明固定 Cargo 可在空白 `CARGO_HOME` 下以 `--locked --offline` 讀取完整 Bun workspace; 此結果只涵蓋 Cargo 輸入, 本身不會完成其他構建輸入的閉包
* `優化` 完成該供應鏈的 Bun registry 部分: 將 172 個 lock reference 解析為 Linux x64 的 125 個唯一 npm archive (31,498,870 bytes), 僅從已鎖定 tarball 重建最小 cache, 並在停用網絡且 cache 唯讀的固定 Ubuntu container 中通過全部三次 frozen install; `esbuild@0.21.5` 是唯一包含受信任 postinstall 的依賴
* `優化` 完成 patched runtime 的可重現構建門禁但不隨套件分發: 將 155 個主機 `.deb` archive (422,223,096 bytes) 鎖定為可重複產生的 OCI image, 把 Cargo 閉包擴展至 206 個唯一 archive, 對兩個 64 位 ABI 各執行兩次停網清潔構建並取得逐字節相同結果, 再鎖定純 Node ELF 審計; API 28 與 31 的直接 shell 探針已通過, APK 與應用程式進程門仍未完成
* `優化` 實現可驗證的對應源碼 Release assets: 源碼與 APK 分開但置於同一 Release, 打包精確 Bun/WebKit/JSC, 19 個 native, 206 個 Cargo, 125 個 npm source archive 以及 patch, build/relink 說明與公開許可聲明; 大檔案按 1.9 GB 分片, 用 machine-readable manifest 和 SHA256SUMS 綁定 APK/runtime/source 字節, 僅在 GitHub SHA-256 全部匹配後公開 draft; 此結果表示自動化技術驗證, 不聲稱法律獲批
* `依賴` 新增 Kotlin Parcelize runtime, 確保 Release 版 R8 保留共用的 Parcelable contract class

# v0.1.0

###### 2026/09/01

* `提示` 首個版本: 每次執行一個獨立腳本檔案, 暫不提供 AutoJs6 內置函數, Java bridge, 多檔案專案和相對路徑導入
* `新增` 新增獨立 `bun` 引擎: 在腳本第一行寫上 `"bun";` 即可用官方 Bun 1.4.0 Android executable 執行 JavaScript 和 TypeScript, 實際命令為 `bun run --no-install <source>`, 不會自動安裝依賴
* `新增` 實時回傳執行輸出: stdout 和 stderr 通過有界 oneway Binder callback 分塊串流返回, 最終結果只報告狀態和診斷資訊, 不攜帶完整輸出流
* `新增` 執行可控: 腳本在隔離的 `:bun_runtime` 插件程序中執行, 支援顯式取消, 60 秒預設超時, runtime 資訊查詢和 prewarming
* `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 Android payload, 以及單 ABI 和 `universal` 安裝套件
* `新增` 提供完整插件體驗: 插件發現, 受權限保護的激活 (Wake), 完整 PluginInfo metadata 和 10 種語言的用戶文件
* `優化` 採用版本化 Binder contract, 通過 ParcelFileDescriptor 傳輸源碼, 源碼上限 16 MiB, 合併輸出上限 8 MiB
* `優化` 從 Android 唯讀 native library 目錄啟動 Bun, 並校驗固定 release archive 和打包 binary 的大小, SHA-256 與 ELF 屬性
* `優化` 驗證兩個打包 executable 的 PT_LOAD alignment 均不低於 16 KB, 同時如實說明尚未完成真實 16 KB Android 環境測試
* `優化` 由經過校驗的 JSON 文案源生成 README, 插件中心說明和內置更新日誌, 並加入構建, Markdown 和 runtime artifact 的 CI 檢查
* `優化` 將最低版本暫定為 Android 14 (API 34): API 31 真機上 Bun 的 `close_range` syscall 被 seccomp 以 `SIGSYS` 終止, 一台 Sony API 33 裝置雖意外通過但不足以證明可移植性, API 35 真機 JS 和 TS Binder 往返測試已通過
