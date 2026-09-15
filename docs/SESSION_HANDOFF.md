# 当前阶段: v0.2.3 已公开发布 (含 M7 宿主信息快照), M6 端到端完成, 宿主侧 M7 (引擎 + 插件中心开关) 已在宿主仓库本地提交, 宿主暂不发版 (2026-09-16)

2026-09-15, 从 master 966cd1a 发布 v0.2.2 (P2 发布门禁). 本轮一个发布门禁设备批次 (三台 ARM64 真机 + 一台 x86_64 API 33 AVD), 没有 native 构建, 宿主仓库未触碰.

- 发布顺序: 先修 CI (ba5c8c3 用 `sudo prlimit` 提升 hosted runner 的描述符硬上限, e747643 让 startup CLOEXEC 装具编译失败时打印编译器诊断,
  966cd1a 用 `#ifndef` 兼容 glibc 2.34+ 在 `<unistd.h>` 定义的 `CLOSE_RANGE_CLOEXEC` 宏), 三个工作流全绿后把注释标签 `v0.2.2` 从 ba5c8c3 移到 966cd1a
  (当时尚无 Release, 只是移动未发布的标签). AGP 会把提交号写进 `META-INF/version-control-info.textproto`, 所以每移一次提交都要重建 APK 并重做验收;
  d4c790a 字节上的第一轮验收 (`.git/release-acceptance-v022-20260915/`) 作废, 不计入证据.
- 验收方式: `.git/release-probe-20260915/` 的纯 Java `Instrumentation` 通过 `.git/release-instrumentation-20260915.gradle` 初始化脚本编译为 release 变体
  androidTest APK (release 签名, 可对生产签名包做 instrument), 黑盒驱动生产 Binder 9 组 (安装后摘要, 权限/Wake, 发现/能力位/预热, JS/TS/Unicode/流式,
  五个示例, M6 归档往返与敌意归档拒绝, 监督器超时/输出上限回收与本地化摘要, 取消后恢复, 解绑重连). 装有 AutoJs6 的设备用私有权限名探针,
  AVD 用 `org.autojs.permission.PLUGIN` 探针; 构建脚本 `%TEMP%/release-build-20260915.sh` 三次 Gradle (release APK/单测/lint, 两种探针).
  驱动 `.git/release-v022-acceptance-20260915.mjs`, 最终记录在 `.git/release-acceptance-v022-20260915-final/`.
- 设备复位: Xiaomi 与 Sony 事先用 `E:/.wsl/release-assets/app-releases-v0.2.0-backup-20260915/` 的已发布 v0.2.0 APK 复位 (哈希核对), 覆盖升级到 v0.2.2 后保留;
  Redmi 与 AVD `bun-hard-limit-api33-20260912` (端口 5602, 用后关闭) 全新安装后已卸载插件与探针. 三台真机上的 AutoJs6 未被触碰.
- 资产: `node .git/release-v022-20260915.mjs assemble|verify|preflight|publish`, 目录 `E:/.wsl/release-assets/autojs6-plugin-bun-runtime-v0.2.2-966cd1a`,
  13 个资产, GitHub digest 全部一致, 匿名下载 notice/manifest/SHA256SUMS 核对通过; 发布后 CI `Published release integrity` (run 34960659908) 通过.
  ba5c8c3 与 d4c790a 的旧资产目录已删除.
- 文档: 发布报告 `docs/compatibility/2026-09-15-v0.2.2-release.json` 与同名 md 已登记进兼容矩阵 (adapter `release`); changelog 开启 v0.2.3 开发快照,
  `version.properties` 0.2.3 / build 8; ROADMAP P2 与 M1-B/M5 条目已更新.
- 宿主往返: 宿主仓库 master `7c31269cc` 树干净, `:app:assembleAppDebug --offline` 的 x86_64 debug APK (官方证书签名, SHA-256 `493804…`) 与已发布 v0.2.2 x86_64 插件装入 AVD `bun-hard-limit-api33-20260912`,
  用 `am start … RunIntentActivity` 跑 `/sdcard/AutoJs6/bun-roundtrip/{project,pkg,bare}`, 宿主 logcat `GlobalConsole` 证明归档路径生效 (裸文件对照按单源码失败);
  记录 `docs/compatibility/2026-09-15-m6-host-round-trip.json/.md` (index adapter, supplement), 原始 logcat/夹具/清理输出在本地 `.git/host-roundtrip-20260915/`. AVD 已卸载宿主与插件并关闭, 宿主仓库未改动.
  Git Bash 下 adb 的 `/sdcard/...` 参数会被 MSYS 转成 `C:/Program Files/Git/sdcard/...`: 需 `MSYS_NO_PATHCONV=1`, 本地路径改写成 `C:/...`, 并给 `adb shell` 加 `-n`.
- 16 KiB 签名验收 (发布后同日补充): 用户接入的 Samsung Remote Test Lab SM-A566B (`localhost:37478`, API 36, Android 16, 原生 arm64-v8a, PAGE_SIZE=16384) 上用同一驱动
  `.git/release-v022-acceptance-20260915.mjs` (已修补: 序列号含冒号时文件名转义) 对已发布的 arm64-v8a 资产文件全新安装, 两轮 9/9, 记录 `.git/release-acceptance-v022-20260915-samsung16k/`;
  发布报告 JSON/MD 追加第五个环境 (`supplements` 字段说明发布后补充), 矩阵登记摘要已刷新, ROADMAP M5 16 KiB 条目关闭. 远程 adb 偶发 `adb shell` 空输出, 断开重连后正常.
- ARM64 宿主往返: 同一宿主 arm64-v8a debug APK (`autojs6-v6.8.0-arm64-v8a.apk`, SHA-256 `19983404…`) 与已发布 v0.2.2 arm64-v8a 插件在 Samsung SM-A566B (全新安装, 结束后宿主与插件卸载)
  与 Redmi 22120RN86C (`install -r` 覆盖用户 5280 构建, 结束后用 `%TEMP%/redmi-autojs6-base.apk` 备份 `install -r` 还原, SHA-256 `340536cb…` 核对) 各跑四次, 结果与 x86_64 AVD 一致;
  记录 `docs/compatibility/2026-09-15-m6-host-round-trip-arm64.json/.md` (index adapter, supplement), 原始 logcat/检查/清理输出在本地 `.git/host-roundtrip-arm64-20260915/`.
  用户指示: 除 Sony XQ-DQ72 (`QV770340J7`) 外的物理设备允许覆盖/重装宿主; 宿主 master 已含 `7acfd5d8e` (控制台 `.ts` 标签修复), 本轮宿主构建早于该提交, 未覆盖.
- M7 第一项能力 (2026-09-16): 设计稿 `docs/design/m7-host-capability-bridge.md` (通用框架 + 只读宿主信息快照 v1). 宿主仓库 (master `d9b4033bd`, 未提交): `BunRuntimeContract` 新增 `HOST_INFO_*` / `KEY_HOST_INFO*` / `RESERVED_ENVIRONMENT_PREFIX`, `BunPluginCapabilityKeys.SUPPORTS_HOST_INFO`, `BunRuntimeContractTest` 4/4,
  新 `BunHostCapabilityGrants` (SharedPreferences `bun_host_capability_grants`, 键 `host_info`, 默认开启), `BunPluginScriptEngine.attachHostInfo` (能力位 + 授权时附加 `hostInfoVersion`/`hostInfo{packageName, versionDate, languageTag}`); AAR 重发 14073 bytes (`69674a0b…`) 并锁入本仓库.
  插件: `BunExecutionRequest.parseHostInfo`/`validateEnvironmentName` (保留 `AUTOJS6_`), `BunHostInfoSnapshot` (固定单行 JSON, RFC 8259 转义, <= 16 KiB), `BunRuntimeService.materializeHostInfo` (Binder UID -> 包名核对, `PackageManager` 解析版本, 写 `<workspace>/autojs6/host-info.json`, 环境变量 `AUTOJS6_HOST_INFO_FILE`, 终态 `hostInfoDelivered`),
  manifest `<queries>` 声明 `org.autojs.autojs6`, 能力位 `SUPPORTS_HOST_INFO`; 单测 45/45 (新增 8), lint 无新问题.
- M7 真机验证 (2026-09-16 00:44-00:54 +08:00): instrumentation (`-e requiredApiLevel <api> -e requiredPageSizeBytes <page>` 必填) 在 Redmi 22120RN86C (API 33) 与 Samsung SM-A566B (`localhost:37478`, API 36, 16 KiB) 各 OK (17 tests); 前两次尝试分别因误装 `.diagnostics` 后缀的旧 debug APK (需 `:app:assembleDebug`, `assembleDebugAndroidTest` 不重建应用 APK) 与 `process.cwd()` 符号链接差异 (改 realpath 比较) 重跑.
  宿主往返: 宿主 `:app:assembleAppDebug` arm64 debug APK (`6afee80a…`) `install -r` 覆盖 Redmi 用户宿主, 本地 `:app:assembleRelease` 插件 (`50eb3fa0…`), 夹具 `/sdcard/AutoJs6/bun-hostinfo/{project,bare}`; project/bare 读到核实后的快照, 撤销 (`am force-stop` 后 `run-as org.autojs.autojs6 sh < 本地脚本` 写 `shared_prefs/bun_host_capability_grants.xml`; 经 `adb shell` 传引号或 here-document 都不可行) 后 absent, 删除偏好文件后恢复.
  Samsung 第一个 Remote Test Lab 会话在宿主装入后断开; 用户重新上线后第二个会话 (01:37-01:40) 全新安装宿主+插件跑完同样四轮并卸载, 但实验室把三次启动重复投递 (`rtl.hb` 心跳后出现第二条 START), 其中一次并发启动被宿主 `BunBoundedBinderCallLane` 以 `BUSY` 拒绝 (宿主行为, 只作观察). Redmi 已卸载插件并用 `%TEMP%/redmi-autojs6-base.apk` 还原宿主 (`340536cb…` 核对). 记录 `docs/compatibility/2026-09-16-m7-host-info-snapshot.json/.md` (index adapter, supplement); 原始输出在本地 `.git/host-hostinfo-20260916/`.
- 宿主仓库提交 (2026-09-16, 无 remote, 未推送): `265adf810` (契约常量 + `BunHostCapabilityGrants` + `attachHostInfo` + changelog 十语言与生成 README), `5d4a23507` (插件中心插件级设置页的 "Bun 能力桥 / 宿主信息快照" 开关:
  `PluginSettingsFragment` 只对导出 `org.autojs.plugin.bun.RUNTIME` 服务的官方插件保留该分类, `ThemeColorSwitchPreference` `plugin_bun_host_info_grant` 设 `app:persistent="false"`, 读写 `BunHostCapabilityGrants`, 十一份 strings).
  用户决定: `host_info` 与未来各项能力的开关都放在插件自身的设置页; 宿主发版时间未定. 另一会话 (`autojs6-plugin-bun-runtime-06`) 只读评审了该提交, 无阻塞意见.
- v0.2.3 发布 (2026-09-16 02:18 +08:00, 用户指示可随时发布): 注释标签 `v0.2.3` 在 `d265c2a`, Release id 389367462, 13 个资产 GitHub digest 与本地一致, 匿名下载核对通过, `Published release integrity` (run 35006637084) 通过.
  五环境签名验收十组 (第 9 组为 M7 快照: 不带键无快照, 带键 16 字段核实, 冒充包名/未知版本/保留环境名均拒绝) 两轮全过: Sony (arm64) 与 Xiaomi (universal) 从已发布 v0.2.2 覆盖升级后保留, Redmi (arm64), AVD (x86_64) 与 Samsung SM-A566B (arm64, 16 KiB) 全新安装后卸载.
  记录 `docs/compatibility/2026-09-16-v0.2.3-release.json/.md` (adapter `release`). 过程: 90851a7 字节上的首轮五机在第 9 组失败, 原因是探针把自身 instrumentation 包名当宿主包名 (探针在插件进程 UID 内运行, `getPackagesForUid` 只含插件包, 插件按设计拒绝), 改探针提供 target 包名并断言自身包名被拒;
  随后发现发布说明生成器仍是 v0.2.2 措辞 (16 KiB 验收 "未重复", 无快照段落), 提交 d265c2a 后移标签 (当时无 Release), 重建 APK, 五环境在最终字节重跑. 90851a7 的验收与资产目录作为作废证据留在本地 (`*-90851a7-superseded*`).
  工具: `.git/release-v023-20260916.mjs`, `.git/release-v023-acceptance-20260916.mjs` (EXPECTED_GROUPS=10), `.git/release-probe-20260916/`, `.git/release-instrumentation-20260916.gradle`, `%TEMP%/release-build-20260916.sh`; v0.2.2 APK 备份 `E:/.wsl/release-assets/app-releases-v0.2.2-backup-20260916/` (assemble 要求 `app/releases` 恰好三个 APK).
  changelog 开启 v0.2.4 开发快照, `version.properties` 0.2.4 / build 9; ROADMAP P2/P3 与 M1/M5/M7 条目已更新.
- 下一步: 宿主发版由用户决定 (暂无计划); 发版后更新 README FAQ 与排错指南的 '等待宿主发布' 表述, 并在真实发布的宿主上各重跑一次 M6/M7 往返; M7 第二项能力 (若为动态调用) 先做接口评审 (Binder broker + 子进程通道, cancellation/backpressure/并发).

---
# 当前阶段: M6 契约落锁, 插件接入与宿主打包代码完成 (2026-09-15)

2026-09-15, 从 master c900ac1 继续. 本轮一个设备批次 (三台 ARM64 真机, 见下), 没有 native 构建.

- 宿主仓库 `D:/idea-projects/AutoJs6`: `plugin-api/bun-runtime-api` 新增归档请求键/终态键/上限常量与 `SUPPORTS_WORKSPACE_ARCHIVE`,
  `BunRuntimeContractTest` 3/3; `app/.../engine/BunPluginScriptEngine.kt` 改为按能力协商生成 payload, 新增 `BunPluginWorkspaceArchive.kt`
  打包含 `project.json`/`package.json` 的项目目录 (符号链接/特殊文件报错, O_NOFOLLOW + inode 复核). `compileAppDebugKotlin` 通过.
  宿主 changelog 与提交尚未进行: 另一任务在同一工作区活动 (其间曾出现并已解决的合并冲突), 提交时只能包含上述 5 个文件.
- 本仓库: `libs/bun-runtime-api.aar` 更新为宿主 build 5280 的新 release AAR (13810 bytes), lock 与 `verify-api-artifacts` 通过.
  `BunExecutionRequest` 解析归档字段 (`parseWorkspace` 纯函数), `BunRuntimeService.runScript` 按键接入展开器并映射错误码,
  `PluginInfo` 宣告能力位, 展开器结束时关闭 ZIP 流; instrumentation 新增 `workspaceArchiveProjectRoundTrip` 与 `runArchive`/`dispatch` 辅助.
  README FAQ, changelog (十语言), ROADMAP M6 条目, 设计稿, AGENTS 与排错指南已同步.
- 宿主 mainline 已升到 compileSdk 37 (fc4b7445e), 新 AAR 元数据要求编译 SDK 37; 插件 `version.properties` 的 `COMPILE_SDK_VERSION` 同步升到 37 (minSdk 33 / targetSdk 36 不变),
  单元测试 36/36, lint 与 `assembleDebugAndroidTest` 在 compileSdk 37 下通过.
- 设备批次: 用 `tools/diagnostics/build-runtime-messages.mjs` (已加 `--offline`) 构建隔离 `.diagnostics` 批次, `run-runtime-messages.mjs` 在
  Sony XQ-DQ72 (API 33), Redmi 22120RN86C (API 33), Xiaomi 23046RP50C (API 35) 各跑两轮; 九项 Binder 54/54, 归档为
  `docs/compatibility/2026-09-15-m6-workspace-archive-binder.json` (kind `workspace-archive-binder`, archiver 新增 `workspace` scope) 与同名 md.
  首次尝试在 API 35 失败: Android 14+ ZIP 路径校验器先于展开器拒绝 `../` 条目, 已映射为 `INVALID_ENTRY_PATH` 并加 JVM 单测后重跑三台全过.
  用户设备上的生产插件与宿主未被触碰. 在 Git Bash 下需 `env -u NoDefaultCurrentDirectoryInExePath` 才能让构建脚本的 cmd 找到 `gradlew.bat`.
- 宿主仓库已提交 `d7cbd7124` (契约, 引擎, 打包, 十语言 changelog), 只含本会话文件; 另一任务的 `docs/dev/android-sdk-37-roadmap.md` 与 `tools/sdk37/*` 仍在其工作区.
- 下一步: (1) 宿主发布携带 `BunPluginWorkspaceArchive` 的版本后, 用真实项目目录做一次宿主到插件的往返并更新 README FAQ 与排错指南的 '尚未发布' 表述;
  (2) 回到 P2 覆盖升级验证与 v0.2.2 发布.

## 前一批路线调整

# 当前阶段: 2026-09-14 路线调整, M6 插件侧工作区归档展开器完成

2026-09-14, 从干净 master b1eb77e 继续. 本轮没有设备批次, 没有 native 构建, 没有新增兼容归档.

- `ROADMAP.md` 顶部的逐批次状态日志已原样迁移到 `roadmap-status-journal-2026-09-14.md`;
  ROADMAP 新增 "2026-09-14 路线调整" 一节: 新优先级 (P0 M6 插件侧 -> P1 M6 端到端 -> P2 覆盖升级与 v0.2.2 发布 -> P3 M7 最小能力桥),
  诊断预算规则与停放清单. 实验线 (M3/M4/M5) 冻结在十三补丁 baseline `1.4.0+e8b129616`, distributionReady=false 不变.
- HTTPS ALPN 重新分类为上游 Bun 1.4.0 `node:https` 限制 (官方 Bun 同样受影响), 不再作为 native 重建理由;
  原失败报告与断言保留, 排错指南新增规避方式.
- 新增 `app/src/main/.../BunWorkspaceArchive.kt` 与 `app/src/test/.../BunWorkspaceArchiveTest.kt`: 有界 ZIP 快照的校验与原子展开,
  规则见 `design/m6-workspace-archive.md`. 展开器尚未接入 `runScript`: 共享契约 `bun-runtime-api` 还没有归档请求键与能力位,
  宿主仓库 `D:/idea-projects/AutoJs6/plugin-api/bun-runtime-api` 待同一批更新, 本仓库 `libs/api-artifacts.lock.json` 随之同步.
- 下一步按顺序: (1) 宿主仓库落锁契约常量并重新发布 AAR; (2) 插件 `runScript` 按能力协商接入展开器;
  (3) 宿主 `BunPluginScriptEngine` 打包脚本目录; (4) API 33/35 原生 arm64 各一台真机往返. 不为停放项启动任何设备批次.

## 前一批 TLS/IPv6 诊断

# 当前阶段: M4 TLS/IPv6 首批诊断完成, HTTPS ALPN 门禁失败

2026-09-14, 从干净 master 22b35dd 继续. APK源码提交389c19b157c6e173b0287d679821a6e63f385c74,
失败归档工具提交b2f09d0bd14211f97b288dfda0fa406c096669ec. 最新本机交接:
`E:/.codex-tmp/runtime-tls-ipv6-20260914/SESSION_HANDOFF.local.md`.
先完整阅读该记录及下文历史. build-apks.py、run-devices.py和归档driver均已结束,
不得重启一次性driver或覆盖独占输出. 本批没有Bun/WebKit/ICU新构建、缓存恢复或APK重试.

- 新runtime-network独立四模式依次tls-transport、tls-rejection、https、ipv6,
  复用生产Binder/supervisor/AAR/权限. 固定12288bytes源码、8000ms工作、12000ms Binder、
  16384bytes输出和8192bytes成功行. 公开测试证书/叶密钥仅回环显式信任, 不修改系统信任.
- 单一105输入三APK均逐项绑定389c19b, 构建actual0,12s/80tasks12executed68upToDate.
  ARM41140290bytes SHA06c9f30fd0e239e0eada8c111ce75795a2dbaa4be79806a0c763b5bca11799fc;
  x8642962132bytes SHA2bfe2a6e99b4832b7397a33c19afe23983932f1affaea4cc6bbf91891263cb47;
  test2518257bytes SHA1e1c351366ae2a370f8b5474ddd33390382bb2e7fc604825e4d17b9e260b1a21.
  沿用十三补丁baseline e8b129616, 不是大页JSC candidate. 原四JS与Kotlin顺序/预算不变.
- ARM64 SonyAPI28/31、RedmiAPI33、XiaomiAPI35与owned x86API33, 全部应用/内核4096,
  各两轮: tls-transport和tls-rejection通过20个模式, 含20协议会话、20拒绝及10有效恢复.
  HTTPS十次在源75:60断言peer.alpn false != http/1.1, exit1/NON_ZERO_EXIT.
  原JUnit在HTTPS停止, IPv6未进入十次, 不计失败后未执行项为通过. 四模式整体未通过.
  Runner整体解析显示0/4, 独立失败归档器从原始流重新严格解析两个通过前缀, 不改原记录.
- 3份干净e8b129616源码Git blob和行片段已绑定: https.ts把ALPN存公开server属性,
  _http_server.ts构造private TLS对象没有ALPNProtocols/ALPNCallback, listen传它给Bun.serve.
  直接node:tls另有ALPN转发. 这是与设备现象一致的源码遗漏; 未做新原生修复/因果确认.
  本机真实HTTPS保留正确证书而移除ALPN协商的对照会失败; 不能据此放宽原HTTPS断言.
- 20成功workspace有删除断言, 失败HTTPS没有独立workspace见证. 五环境两包均卸载,
  十UID完整数字进程表为零; 精确UID见checkpoint. 唯一owned5584于07:15:11Z关闭.
  emulator5594/5598来自其他任务, 本批未操作; localhost37478offline未使用.
- Node47文件306/306, 其中本套件13项. IDE成功, 最后仅既有SDK XML警告.
  官方runtime/supervisor、生产Debug APK完整性与16KiB ZIP通过. 生产四Gradleactual0,
  11s/96tasks49executed47upToDate; JVM UP-TO-DATE,已有21结果不称重跑, lint0/44.
- [完整报告](compatibility/2026-09-14-m4-runtime-network.md)与failure/checkpoint JSON分别绑定.
  原125报告/注册项、217矩阵行、146保护文件和settings1.8.0不变; 新2份仅索引为127来源.
  原API40/40、baseline560/128、原JSC32/28和official API33+、distributionReady=false不变.
  最终生成器/Python、提交与干净状态收据见最新本机交接追加. 无push/Release.

下一步优先固定HTTPS ALPN最小修复与相应上游测试, 先查现有构建进程和磁盘预算,
再规划独立新构建/证据; 不重复本批追逐通过, 不删除断言/关闭证书校验, 不把IPv6算已运行.
这不是已确认修复, HTTPS响应/关闭与IPv6后续门禁还需真实新证据. 其余M4/M5历史未闭门禁
继续保留. 当前无需用户提供更多设备、资料、关键决定或手动操作, 已完成清理不重复执行.

## 前一批固定离线文件和网络 API

# 当前阶段: M4 固定离线 API 边界完成

2026-09-14, 从干净 master e71861d 继续, 源码/唯一测试 APK 批次提交为
956df1b01c869356c193bbf9596e84638dda1c65. 当前本机交接:
`E:/.codex-tmp/runtime-api-boundaries-20260914/SESSION_HANDOFF.local.md`.
先完整阅读该记录及下文历史. 本批 build-apks.py、run-devices.py、continue-devices.py
均已结束, 不得重复启动一次性 driver. 原生缓存没有恢复, 无 Bun/WebKit/ICU 新构建.

- 新独立 RuntimeApiInstrumentedTest 只在 opt-in 实验测试 APK 中, 复用真实生产 Binder
  服务/supervisor/共享 AAR/权限. 四个独立源码模式依次检查 files/watch、localhost 与
  实例级本地 UDP DNS、二进制 TCP 半关闭、HTTP redirect/stream/abort.
- 固定每份源12288bytes、工作8000ms、Binder12000ms、总输出16384bytes、成功行8192bytes.
  只用127.0.0.1动态端口, 无外网/依赖安装/全局Resolver设置. 失败保留受限stdout/stderr
  和实际终止字段, 严格校验源码、四模式顺序、语义摘要、事件/关闭及双UID清理.
- 单一99输入三APK逐项匹配956df1b. 构建actual0,14s/80tasks48executed32upToDate.
  ARM64 main41128239bytes SHA1d4a7cc441ea9213e73a8d50fafd0696b9407714ec85c3674a94e6f452eb83d8;
  x86 main42950081bytes SHAc1a328b369f4ddec452edccaf9677a0674e7d0a88c6d7ce67959c74acb9e241c;
  test2395845bytes SHA4c5d0d95614948da0a664fee8152b7f75739d9ee17c9050ac6e13c0649ce67b6.
  复用十三补丁baseline e8b129616双ABI, 不是17c7941a大页JSC candidate.
- Sony G8441 API28、XQ-AT72 API31、Redmi22120RN86C API33、Xiaomi23046RP50C API35
  和owned原生x86 API33, 均应用/内核4096, 各两轮4/4, 合计40/40.
  每份JS实际auxv/smaps与Java Os.sysconf一致;20TCP连接/30DNS查询/30HTTP请求通过.
- 初选Sony QV770340J7在get-state前已不在清单, 无安装/UID/round. 首driver停止,
  api-arm33原始失败完整保留; 明确修改设备选择后continue-devices使用在线Redmi完成同一
  API/ABI位置, 再执行原API35/x86计划. 没有重跑API28/31、运行期失败重试或改动预算.
- 40 workspace清理;五环境主/test UID分别10775/10776、15133/15134、10535/10536、
  11037/11038、10174/10175, 均从完整数字UID清单证明零进程, 两包每台卸载.
  仅owned bun-hard-limit-api33-20260912 /5584于06:30:31Z关闭. 无关API24/37后从清单
  消失但本批未操作, 不推断原因. 不操作手机/共享ADB;localhost37478offline未使用.
- Node46文件293/293;IDE成功且既有SDK XML/Bundle.get警告. 官方runtime/supervisor
  和生产Debug完整性/16KiBZIP通过. 生产四Gradleactual0,11s/96tasks49executed47upToDate;
  JVM任务UP-TO-DATE,已有21项结果不称本批重跑;Lint0errors/44warnings.
  最终五个生成器/Python检查和提交结果见本机追加记录.
- [完整报告](compatibility/2026-09-14-m4-runtime-api.md)与三份结果/checkpoint/preflight JSON
  独立绑定. 原122报告/注册项、217矩阵行、137保护文件及settings1.8.0不变, 新三份仅索引.
  Baseline560/128、原JSC32/28、官方API33+与distributionReady=false不变, 无push/Release.

M4四个有限API模式现有固定4KiB证据, 总体分层矩阵未完成. 下一轮可继续选择独立、离线、
可重放的TLS/IPv6或其余API边界, 先固定范围和预算再执行;不能将本批扩写为完整网络/
watch/CLI/16KiB/稳定或Release支持. 若继续M5, 必须保留原2<3门槛和已归档失败,
现有诊断未确立历史根因, 不追加旧批追逐通过/失败或未经规划恢复大体积原生缓存.
API28watchSIGABRT/cloneEAGAIN、broader syscall/FD/API/OEM、长期压力/性能和Release仍开放.
当前无需用户新增设备、资料、关键决定或手动操作; 两项已完成磁盘清理不重复执行.

## 前一批原压力控制流固定诊断

# 当前阶段: 原压力控制流固定诊断完成

2026-09-14, 从干净 master fd5203c 继续. 新工具和唯一 APK 源码提交为
f73510a31a30abfbc77cfe03e6791257a833cdfb. 当前本机交接:
`E:/.codex-tmp/jsc-pressure-flow-20260914/SESSION_HANDOFF.local.md`.
先完整阅读该记录及下文历史. 本批 build-apks.py / run-devices.py 已实际结束,
不得重复启动一次性 driver, 原生缓存没有恢复.

- 独立七模式 collection 保留原顺序; 六模式使用原资产/验证器, DFG 新 JS 只加七段
  可剥离观察, 去掉后恢复整个原压力源码. 原热函数、匿名回调、128预热、达到3个样本
  即停止、四次profile上限和全部断言不变. DFG 只请求原模式变量, 不加JSC选项.
  观察位于profile前后, 记录整个profile时间; 不声称纯回调时间、相同机器代码或无扰动.
- 原错误catch后重抛同一对象, finally输出事实. 新collection允许完整DFG断言exit1
  后继续剩余模式, 这与原JUnit失败停止不同, 不增加原套件成绩. Node直接运行实际新JS,
  构造profile验证2<3错误保留等六组控制; 本批Android未发生exit1, 不称真机失败重现.
- 原16KiB源/64KiB总输出/20s工作/25sBinder/300ms100000call/1000us和所有旧门槛不变.
  首个完整分类栈单份4096bytes/总24576bytes, 显式省略规则复用且独立验证.
- 单一94输入APK对匹配f73510a. Buildactual0,28s/80tasks12executed68upToDate.
  main42963239bytes SHA447decc9d17c6e445cf2960a0f5433d5a97a31e149eb016bd309b0f021e33ce8;
  test2580707bytes SHAe6adfbfd21c6c50b2ded0e88592c7089716349f94e953c398f5da98f082d0f7a.
  十三补丁JSC90609496bytes/17c7941a...f20e98a8复用, Bun/WebKit/ICU新构建均0.
- API36原生x86用户4096/16384各两轮,28模式进程正常退出, 无采集失败/重试.
  四个DFG均首profile后原断言成功: 样本18,10,82,93; 调用4426,5530,6256,7530
  (另含原128预热), 编译2,1,2,2. 四profile共392trace/2052帧, 8份首栈无省略.
  DFG目标203帧, DFG目标/调用者同栈分类202trace, 无目标或调用者FTL, 无整段目标归零.
  四份首DFG栈保留目标EoFuS3与invokeDawGsb; 三份other首栈无二者, 一份为Baseline.
  首栈不能代替该类全部栈. 此前32profile诊断的机器层级/内联结论不能转移到本批.
- 两包每台卸载, 完整数字UID清单分别证明10226/10227,10213/10214全0.
  仅本轮owned5580/5582于05:41:06Z/05:43:09Z关闭. 测试前已有API24/37未操作,
  结束仍在线; 共享ADB和手机未启停. localhost37478本批清单offline, 未依赖它.
  x86用户16384仍模拟于内核/MMU4096映射上, 不是ARM64硬件16KiB.
- Node45文件283/283, IDE成功且既有SDK XML警告, 官方runtime/supervisor及Debug完整性通过.
  生产四Gradleactual0,19s/96tasks49executed47upToDate; JVM任务UP-TO-DATE, 原21项结果保留.
  Lint0errors/44warnings. 最终五个文档/Python检查与证据提交结果见本机追加记录.
- [报告](compatibility/2026-09-14-m5-jsc-pressure-flow.md)及两份JSON严格绑定源/APK/raw/UID.
  原120报告/注册hash、217行、131保护文件与用户已有settings1.8.0不变, 新两份仅索引.
  Baseline560/128、原JSC32/28、官方API33+与distributionReady=false不变, 无push/Release.

本批把观察范围恢复到原早停控制流, 但四次均成功, 未重现原2<3. 不能由新样本差异解释
页大小因果、追认历史根因或稳定性. 下一轮如继续M5, 应先固定要区分的条件与有限预算,
复用已保留APK和此独立观察框架; 不追加本批追逐失败/通过, 不降低门槛或抑制FTL,
不未经规划恢复大体积原生缓存. 也可继续不依赖该根因的Roadmap边界审计.
API28watchSIGABRT/cloneEAGAIN、broader syscall/FD/API/OEM、长期压力/性能和Release仍开放.
当前无需用户新增设备、资料、关键决定或手动操作; 已完成的两项磁盘清理不重复执行.

## 前一批完整 trace/inliner 诊断

2026-09-14, 从干净 master 5c9d8b8 继续, 工具与 APK 源码提交为
432e0e6e02bb1fae8309b76f707d9a701dbd146c. 当前本机交接:
`E:/.codex-tmp/jsc-trace-diagnostic-20260914/SESSION_HANDOFF.local.md`.
先完整阅读该记录及下文历史. 本批和原 PC-map/restart/sampling/native/磁盘的
一次性构建与设备 driver 均已结束, 不得重复启动. 原生构建缓存没有恢复.

- 新 JS 只增加三段标记观测代码, 去掉后逐字节恢复原 restart 资产.
  原热循环、回调、参考算术、门槛及 16 KiB 源、64 KiB 总输出、四段 300ms/100000call、
  20s 工作、25s 超时不变. 新观察在每次 profile 后处理, 不声称无扰动.
- 两组共同启用 extra sampling data 和原 dump/inline logging, 只有 PC map 开关不同,
  第一轮 off/on、第二轮 on/off. 每类只考虑首条完整 trace, 单份 4096 bytes、
  总计 24576 bytes, 超限明确省略且不改选后续栈. 8 份四项最终选项均被核验.
- 20 份固定 Bun/WebKit 完整文件匹配 Git 对象. 主机独立重解析完整帧的
  inliner 与同栈外层机器帧; 关联名称、hash、tier 和 bytecode, 不是原始 PC/map 指针.
  原 125 份受保护文件与 pre-existing settings 1.8.0 不变.
- 一批新主/test APK 的 92 项输入匹配 432e0e6. 实际构建 exit 0, 19s / 80 tasks,
  12 executed / 68 up-to-date. 本机 jsc-apks 保存独立快照与精确 hash.
  十三补丁 JSC 90609496 bytes / 17c7941a...f20e98a8 复用, Bun/WebKit/ICU 新构建均 0.
- API36 原生 x86 两种用户页各两轮: 8 进程、32 profile、2530 trace、65 份完整栈,
  无超限省略、采集失败或重试. 开启组 90 个目标 FTL 帧, 四份完整 FTL 栈明确链接
  jscPressureHotLoop#EoFuS3 -> invoke#DawGsb, 同时匹配编译器名称/hash.
  主机重验四份原始栈, 不能称另有 90 份独立导出的见证. 三次真实 exit1 保留.
- 关闭组 84 个调用者 FTL 帧均对应无目标的 trace, 保存三份首条完整栈.
  4KiB 第一轮第四段 5030 次目标调用、64 trace、目标所有层级/未知帧 0、
  invoke FTL 64; compiles/retries 前后为 3/2, 首份调用者位置为 <nil>.
  另有混合阶段的缺席首栈位置为 bc#127, 不能称所有缺席都没有 bytecode 信息.
  16KiB 第一轮开启组有 FTL 内联决定却无 FTL 采样, 不从编译日志推出已执行.
- 两包逐台卸载, 数字 UID 完整 ps 独立确认 10226/10227 与 10213/10214 均 0.
  仅本轮 owned AVD 5580/5582 在 04:53:00Z / 04:54:10Z 关闭.
  开始接手时的无关 API37/24 AVD 后来已不在进程清单, 未操作且不推断消失原因.
  手机与默认 ADB server 未启停; localhost37478 在测试期间自行恢复并显示 SM_F776B,
  未为本批使用它. x86 用户 16384 仍模拟在内核/MMU 4096 映射上.
- 全量 44 文件 Node 277/277, 无失败/跳过. 生产四项 Gradle actual0 / 45s / 96 tasks,
  49 executed / 47 up-to-date; JVM 任务 UP-TO-DATE, 保留已有 21 项通过结果,
  不声称本轮重新执行. 官方 runtime/supervisor、Debug APK 和 16 KiB ZIP 检查通过,
  lint0 errors/44 既有 warnings, IDE isSuccess=true 且两个既有警告.
  最终生成器/矩阵/Python 和证据提交结果见本机追加记录.
- [完整报告](compatibility/2026-09-14-m5-jsc-trace.md)、
  [固定源码补充](diagnostics/2026-09-14-jsc-trace-source-review.md)与两份独立 JSON 已归档.
  原 118 份报告和 217 矩阵行不变, 新两份仅索引. Baseline560/128、原JSC32/28
  不增加; 官方 API33+ 与 distributionReady=false 不变, 无 push/Release.

本批建立了所保存目标语义帧与 FTL 机器调用者的直接关系, 并复现一次整段目标缺席.
原压力 2<3 的历史根因和稳定性没有确立. 继续 M5 时应单独固定原低采样条件的
观察范围, 优先保留原门槛失败时的逐轮调用/trace/目标/调用者信息; 不追加本批挑选结果,
不以 noInline、屏蔽 FTL、扩大预算或调低门槛让旧测试通过. 若需要新增原生字段,
先确认现有成品与磁盘保留范围, 不能未经规划恢复大体积缓存或启动重复构建.
API28 watch SIGABRT/clone EAGAIN、broader syscall/FD/API/OEM、长期压力/性能和
Release 仍开放. 当前无需用户新增设备、资料、关键决定或手动操作; 两项磁盘清理不重复执行.

## 前一批PC映射固定对照

# 固定PC映射关闭/开启对照完成

2026-09-14, 从干净master dcb68bd继续, 工具/构建源码提交4cd6ba4.
接手时较原9255e8a仅多出用户已提交的settings.gradle.kts平台插件1.8.0更新;
保留该设置, 同步AGENTS与当前十语言changelog, 不改历史APK证据.
先读本文件与本机交接
`E:/.codex-tmp/jsc-pcmap-diagnostic-20260914/SESSION_HANDOFF.local.md`.
原restart/sampling/磁盘和native记录仍在下文, 不重跑已完成的一次性driver.

- 新测试Java/归档器复用原restart JS及语义validator, target模式固定四段,
  两组共同启用JSC最终选项dump/内联决定日志, 仅PC映射false/true不同.
  第一轮off/on、第二轮on/off, 每arm独立Bun进程; 原64KiB总输出/四段预算不变.
  原120个fixture/validator/native/锁/生产Java与AAR在设备前和归档时均逐字节不变.
- 一批新主/test APK的90输入逐项匹配4cd6ba4, actual0/43s/80tasks(76执行).
  原十三补丁JSC90609496bytes/SHA17c7941a...f20e98a8直接复用,
  Bun/WebKit/ICU重建均0, 没有补回已清理native缓存.
  APK快照在本机jsc-apks, 不用后续生产构建产物替代.
- API36原生x86双用户页大小各两轮, 收集8进程/32profile/8份最终选项,
  四次JUnit/两driver无失败、跳过或重试. 开启组4KiB有155目标FTL帧,
  两次真实exit1/NON_ZERO_EXIT完整保留, 原DFG门槛不放宽.
  关闭组4KiB两段有8/4调用者FTL帧, 仍有13/39目标DFG帧, 未复现整段归零.
- 18个固定Bun/WebKit完整源文件与Git blob匹配. 实际选项与内联决定已经捕获,
  但后者是编译过程信息, 没有阶段时间戳或完成保证. 16KiB第二轮开启组有目标FTL
  内联决定却没有FTL采样, 不能称为对应机器代码已执行.
  原JS只保留直方图和三个DFG样本见证, 无原始FTL栈/具体PC/map指针,
  故本批支持映射/机器tier解释, 不确定历史2<3根因或稳定性.
- 两包逐台卸载, 四UID10226/10227与10213/10214均0, 原始数字UID ps/空包清单重验.
  仅按精确名称关闭owned5580/5582; 开始时无关API37/5596进程已存在, 未对其发控制命令,
  五台手机与默认ADB也未操作. 两台x86内核/MMU页4096, 用户16384仍是模拟ABI.
- 全量43文件Node270/270, 生产四项Gradleactual0/56s/96tasks(92执行),
  JVM21项本次实际执行. 官方runtime/supervisor/Debug APK与16KiB ZIP检查通过,
  lint0errors/44既有warnings, IDE直接isSuccess=true且仅两个既有警告.
  初次新中文changelog标点被原生成器拒绝的exit1单独保留, 仅修新标点,
  未更改验证规则或影响设备. 最终文档/矩阵/Python及提交结果见本机追加记录.
- [完整报告](compatibility/2026-09-14-m5-jsc-pcmap.md)和
  [源码补充](diagnostics/2026-09-14-jsc-pcmap-source-review.md)绑定两份新JSON,
  只登记索引, 原116报告与217矩阵行不变. Baseline560/128、原JSC32/28不增加,
  官方API33+及distributionReady=false不变, 无push/Release.

下一步若继续M5, 应单独预定逐trace目标/调用者FTL与CodeOrigin见证及固定预算,
区分编译决定、实际执行与名称恢复, 保留这次未复现整段归零的完整批次.
不追加本批运行、不用noInline/屏蔽FTL/降低门槛使原压力通过.
历史2<3根因、API28watch SIGABRT、broader syscall/FD/API/OEM、长时压力/性能和Release仍开放.
当前无需新增设备、资料或手动操作, 用户已完成的磁盘两项清理不重复执行.

## 前一批固定四段诊断

# 会话交接: 固定四段 profiler 诊断与 FTL 源码收敛完成

2026-09-14, 从干净 master7081e91继续, 源码/构建提交e07058d. 本机交接为
`E:/.codex-tmp/jsc-restart-diagnostic-20260914/SESSION_HANDOFF.local.md`.
原构建/设备/磁盘与前一批sampling本机交接仍在下文, 完整历史及失败保留.

- M5新增独立四段命名profile与target-absent对照, 通过真实服务执行; 原pressure/sampling
  资产/Java/validator/预算、原八项Binder、35探针及production/native完全不变.
  新的6组Node含反向控制已纳入CI. 收集完成与target/restart/control语义分别记录.
- 只构建一批主/test APK, actual0/17s/80tasks(12执行), 89canonical输入逐项匹配e07058d.
  原十三补丁JSC90609496bytes/SHA17c7941a...f20e98a8直接复用; Bun/WebKit/ICU重建均0.
  不重复运行一次性build-apks.py或run-devices.py, 不补回已清理的native缓存.
- API36原生x86用户4KiB/16KiB各两轮固定双模式, 8次进程诊断/32次profile完整收集,
  八次阶段/时间序列均符合restart/clear预期; 四次正常模式累计target gate通过,
  四次target-absent明确目标调用0且有控制函数帧, 真实exit1/失败终态/完整输出均保存.
  没有APK/设备失败或重试; 受控缺席不等于自然低采样复现.
- 新关键现象: 4KiB第二轮第三段目标DFG118/invokeDFG118; 第四段仍有9766次算术检查调用,
  126trace, 目标全部层级/未知帧0, invokeFTL125, 当前phase4帧125. 两段compiles/retries均3/2,
  时间区间有序不重叠, 直方图无溢出. profiler在目标帧缺失时仍采到当前工作.
- 两个固定Git工作树干净, 14个完整Bun/WebKit源文件匹配pinned Git blob/SHA.
  noFTL不禁止内联; FTL PC映射受独立VM开关控制, ensureSamplingProfiler/profile不直接设置;
  恢复的内联帧使用机器tier. 本轮没有实测内联图/map开关/指针, 原失败也缺逐次数据,
  所以不能确定内联/映射根因或将新现象等同历史2<3. 额外选项对照尚未执行.
- 两包卸载, 四UID10226/10227和10213/10214均0, 原始数字UID ps与空包清单已保存并重验.
  仅关闭owned AVD5580/5582; 五台手机、默认ADB、无关API37/5594未操作.
  两台x86内核/MMU页4096, 用户16384仍为模拟ABI; 不作为ARM64硬件或页大小性能比较.
- 完整Node42文件265/265, 官方runtime/supervisor和生产四项Gradleactual0/12s通过,
  96tasks/12执行/84up-to-date, JVM21项复用既有成功结果. IDE直接isSuccess=true,
  仅两个既有SDK XML/Bundle.get警告. 初始5/6构造测试的root/数字UID不符另档,
  只修正模拟输入, 未放宽生产解析器. 最终文档/矩阵/Python和提交结果见本机追加记录.
- [新动态报告](compatibility/2026-09-14-m5-jsc-restart.md)与
  [FTL源码补充](diagnostics/2026-09-14-jsc-restart-ftl-source-review.md)单独绑定.
  原114报告/217矩阵行保持原样, 新两份仅索引. Baseline560/128、原JSC32/28不增加,
  官方API33+及distributionReady=false不变, 没有push/Release.

下一步: 对调用者FTL/目标帧消失做单因素、有固定上限的独立观测, 先证明选项实际生效,
优先取得内联决定或PC映射开启前后差异, 保留真实机器tier; 无FTL转换或未消失就记录未复现.
不能用noInline/屏蔽FTL/减门槛让原压力通过. 历史2<3根因与稳定性仍开放, 原API28watch
SIGABRT也未解释; broader syscall/FD/API/OEM、长时压力/性能和Release继续开放.
当前无需新增设备、资料或手动操作. 用户已完成磁盘两项清理, 不重复请求或执行.

## 前一批采样诊断交接

# 会话交接: 独立 DFG 采样诊断完成

2026-09-14, 从干净 master e01a939 继续, 诊断源码提交为8af825b.
先完整阅读AGENTS、本文件和 `E:/.codex-tmp/jsc-sampling-diagnostic-20260914/SESSION_HANDOFF.local.md`.
原构建/设备及清理交接仍在下文指向的本机目录, 所有旧失败保留.

- 用户确认两项手动清理成功. 最终压缩receipt actual0, VHDX从272895049728降至133013962752 bytes,
  缩小139881086976 bytes (约130.27 GiB). 旧Gradle备份精确目录不存在. 无待执行手动清理.
- M5新增独立DFG采样资产、真实Binder instrumentation、严格归档器及正/反向测试, 纳入CI.
  原七模式资产/Java/validator/预算、原八项Binder、35探针、生产service/AAR/native及全部锁不变.
  诊断输出先于exit0/1, 低样本exit1可完整记录; 本次设备未触达低样本分支, 该能力是构造测试证据.
- 只构建一批新JSC主/test APK, actual0/27s, 87输入逐项匹配8af825b. 原十三补丁JSC
  90609496 bytes / SHA17c7941a...f20e98a8直接复用. 没有Bun/WebKit/ICU重建或补回已清理的native缓存.
- API36原生x86两用户页大小各两轮, 4项诊断完整收集, 目标DFG样本9/16/103/91,
  全部首次profile达到原三样本门槛. 无失败/重试; 样本不足根因和稳定性仍未确定.
  callback约300ms, trace57/77/108/140; 16KiB中调用者invoke可有FTL帧, 目标仍无FTL.
  编译/重优化计数不是当前执行层证明. 镜像/内核不同, 不将调用数差异解释为页大小性能因果.
- 两个环境的主/test包均卸载, UID10226/10227和10213/10214均为0进程.
  这是runner实际ps检查后的结构化计数, 未另外保留完整原始ps快照. 仅关闭本轮AVD5580/5582;
  五台手机、默认ADB和无关API37/5594未操作. x86用户16KiB仍模拟于4KiB内核映射.
- 新[诊断报告](compatibility/2026-09-14-m5-jsc-sampling.md)、诊断JSON和收尾JSON另档.
  保留原112历史报告与217矩阵行, 新增两条仅索引记录; baseline560/128、原JSC32/28不增加.
  官方API33+及distributionReady=false不变, 无push/Release.
- 全部41个Node文件259/259通过, 原测试子进程actual0; 随后Python向GBK控制台打印Unicode
  日志尾部失败exit1单独保留. 已只读核对原receipt和日志, 不重跑/隐藏该显示失败.
  官方runtime/supervisor通过. 生产四任务actual0/25s/96tasks, 48执行/48up-to-date,
  JVM21项使用已有结果. IDE直接isSuccess=true且problems为空, 没有超时.
  文档/矩阵/Python最终检查与提交结果见本机交接追加记录.

下一步: 保持原DFG稳定性门槛开放, 仅做事先固定且有上限的独立观测, 不持续重试到通过.
若复现, 先对比trace、目标分布和优化状态再设计单因素对照. 新诊断可能扰动执行,
不能转移为原七模式通过. 原API28 watch SIGABRT也未复现; broader syscall/FD/API/OEM,
长时压力/性能和签名Release继续开放. 本轮不需要用户追加设备或手动操作.
本机所有构建/设备驱动已完成, 不重复运行一次性脚本; 新任务先检查现有进程和最新记录.

## 前一清理阶段与恢复历史

# 会话交接: 磁盘清理与固定 JSC 采样源码审阅

2026-09-14 后续更新: 用户执行旧手动脚本后 DiskPart 报 VHDX 文件被占用,
actual exit -2147024809, 大小/宿主空间增量均0. 原 `compact-20260914-082056.*`
及旧脚本 `compact-ubuntu-offline.initial.ps1` 保留, 不算压缩完成.
08:26后只读确认Ubuntu Stopped、无WSL VM进程、VHDX可独占读取; 未捕获原占用者.
本机脚本现有 `-CheckOnly`, 在DiskPart前轮询VM退出并连续三次确认文件独占打开,
释放探测句柄后才压缩. 实际只读preflight通过, 没有新DiskPart/提权/停止或WSL内命令.
用户后续保存并关闭WSL客户端, 在管理员PowerShell使用 `wsl --shutdown` 后再运行原路径
脚本; `--terminate` 只停止发行版, 旧脚本的停止状态检查不足以确认VHDX释放.
Gradle旧备份仍在原精确路径, 已明确告知用户, 没有重试上轮被拒绝的删除操作.
本次恢复细节见同一本机交接的追加记录; 下文“尚未执行”是前一清理阶段的历史状态.

2026-09-14, 从干净 master `50ddf2c` 继续. 用户授权继续 Roadmap 并清理不必要的
AVD/WSL 临时文件. 先完整阅读 `AGENTS.md`、本文件和
`E:/.codex-tmp/disk-cleanup-20260914/SESSION_HANDOFF.local.md`.
此前完整构建/设备交接仍在 `E:/.codex-tmp/jsc-thirteen-patch-20260913/`.

- 本轮没有 Bun/WebKit/ICU 重建或新设备回归, 不增加兼容接受数. 固定35探针、原七模式压力、
  Java/validator/预算、native锁/成品、生产service/AAR/API33和distributionReady=false不变.
  原112报告/registry与217矩阵行保持原样, baseline仍560/560 probes和128/128 Binder.
- 四台历史专用AVD已退役: bun-binder-api28-x64、bun-binder-api30-x64、
  bun-m3-api29-x64-20260912、bun-m3-api32-x64-20260912. 先备份配置并核对SDK镜像,
  再删除各自目录与.ini. 原文件逻辑51.25GiB, E盘实际增加约11.55GiB.
  当前bun-hard-limit-api33及两台JSC压力AVD、其他通用AVD与全部SDK镜像保留.
- 23个已完成的WSL独立Bun检出删除23个cache及114个obj/pch/rust-target目录,
  原占用142852907008 bytes (133.04GiB). 清理前后逐项核验350个顶层构建文件摘要;
  每轮bun/bun-profile/map/Ninja/config/receipt、Git源码、历史native-evidence导出、
  两套独立JSC库/config与原ICU、锁定工具链/输入/image、全部测试APK/raw均保留原路径.
  这些构建目录已不再具备原增量状态: 不重跑Ninja冒充历史no-work, 不为补缓存重复构建.
- WSL TRIM实际exit0, 内部已用约119.98GiB. 输出835.4GiB是discard范围,
  不是本次新释放量. VHDX仍272895049728 bytes, E盘未因TRIM继续增加.
  当前非管理员且WSL有IDE ijent连接; 未停止WSL或尝试提权. 已准备并检查语法的
  `compact-ubuntu-offline.ps1`需要用户保存/关闭WSL工作、停止Ubuntu-24.04后在管理员终端运行.
  脚本核对注册路径/停止状态并保存实际前后大小; 尚未执行, 不声称压缩已完成.
- 自动审批拒绝删除旧Gradle修复备份, 只返回blocked by policy. 该3982310648-byte
  caches-9.5.0-before-repair仍保留, 未通过其他工具重试. 原修复日志和当前缓存均不变.
  两次AVD前置工具拒绝均未删除文件: 无关API37活动进程、JSON时间类型比较已精确修正.
  首次root fstrim缺PATH执行失败, 后用已核对的/usr/sbin/fstrim完成, 两份结果分开保留.
- 本轮未启动/停止任何AVD/ADB/WSL/Docker. 期间其他任务启动API37/5592,
  精确识别后未干预. 五台ARM64设备在线, 当前不需要追加设备资料或继续租用三星.
- M5完成固定Bun/WebKit三个源文件的Git blob/完整SHA审阅, 确认profile微秒参数、
  pause/clear/start、内联帧展开和编译计数边界. 原失败缺少逐次trace/调用/时间/优化状态,
  下一步独立诊断需补这些字段. 没有动态复现或根因结论; watch SIGABRT和DFG稳定性仍开放.
- M9新增磁盘维护指南, 十语言当前changelog从源生成. Markdown/matrix检查、Python38/38、
  官方Bun/监督器完整性和APK/release Node17/17通过. 生产四任务actual0, 50s/96tasks,
  JVM21项UP-TO-DATE, lint0error/44既有warning; IDE直接isSuccess=true, 两个既有warning.
  最终审计533个原跟踪文件, 仅37项授权文档/生成产物有改动, 其余496项原样.
  提交与最终空间快照见本机交接; 不重跑清理脚本或此前一次性构建/设备驱动.

[磁盘维护范围与恢复规则](storage-maintenance.md),
[固定JSC采样源码审阅](diagnostics/2026-09-14-jsc-sampling-source-review.md).

## 此前十三补丁 JSC 与 watch 诊断检查点

# 会话交接: 十三补丁 JSC 回归与 watch 有界诊断完成

2026-09-13 至 14, 从干净 master `7040456` 继续, 源码/构建提交为 `ba5418e`.
先完整阅读 `AGENTS.md`、本文件与
`E:/.codex-tmp/jsc-thirteen-patch-20260913/SESSION_HANDOFF.local.md`.
用户要求单次推进更多有边界小节; 本轮完成 M5 新候选/双clean构建/双页大小Binder/压力,
以及 M3 有界SIGABRT观察器与固定watch未复现诊断. 不重复本轮builders/collector/APK/device脚本.

- 十三补丁源e8b129616/tree7d715cd1, 两个全新独立clean Bun构建actual exit0/0.
  两份完整90609496-byte成品SHA `17c7941a32669e0cf2d6915bf94d8cee8421c3df605eddcf2b493687f20e98a8`.
  21项输入未漂移, 两份完整ELF审计通过. 精确复用原两套独立JSC库/config与ICU;
  新WebKit/ICU构建0/0. 新13锁与9/10/12候选、baseline严格分开, 不再重建原成品.
- 一批新main/test APK的85输入逐项匹配`ba5418e`, 同一APK在API36原生x86_64
  4KiB/16KiB用户页各两轮原八项Binder通过32/32, 原七模式压力通过28/28.
  Binder无失败/重试. 初次16KiB压力第二轮只有2个DFG目标样本, 原门槛3个,
  compiles=3; 是固定断言exit1, 未捕获native崩溃或确定资源原因. 原整批失败独立保留,
  不拼接局部成功观测; 唯一同APK完整两轮复测通过, 原设置/JIT选项/预算未变.
  采样稳定性仍开放. 实际LLInt/Baseline/DFG/FTL、GC/Wasm与64个worker正常退出通过.
- ELF AT_PAGESZ/sysconf/getconf一致, 两台x86内核/MMU映射均4096.
  x86用户16KiB是模拟ABI, 不替代三星ARM64硬件证据. 所有成功/失败包和两个UID
  独立检查为空; 仅关闭本轮两个AVD(5580/5582), 默认ADB30928未重启/终止,
  五台原有本地ARM64设备仍在线. 没有Samsung或privateADB操作, 无待清理设备任务.
- 独立watch APK的37输入也精确匹配`ba5418e`, 原13baseline/native与固定夹具不变.
  Sony28/31各两轮native/TRAP plain/traced, 共16观察、32重载、48镜像、24普通SIGSYS.
  UID10774/15132已清理. 未复现原SIGABRT; 新fatal快照只有Linux对照验证,
  不声称有新Android崩溃栈或EAGAIN原因. 原69/70失败和一次原APK复测保持原样.
  Linux2个unittest方法含5种旧SIGSYS与新SIGABRT的plain/traced控制通过;
  Python3.8的初始removeprefix工具失败单独保留, 不作为Android失败.
- Node254/254、Python38/38、官方Bun/监督器字节、Markdown十语言和矩阵检查通过.
  生产四项Gradleactual0, JVM21项UP-TO-DATE不声称重跑; lint0error/44既有warning.
  IDE直接构建成功, 仅既有SDK XML和Bundle.get警告. 新APK Gradleactual0.
  原105历史JSON/registry与210矩阵行、原pressure/35probe定义和全部旧fixture保持不变.
- Baseline仍为八原生环境560/560probes、128/128Binder, 两项三星门禁已完成.
  新JSC与诊断不增加baseline计数. 下一步优先原API28 watch SIGABRT/clone EAGAIN
  的有界调用链/资源诊断及DFG采样稳定性, 然后更广syscall/API/FD/OEM、
  blocked/pending跨reload、IPC/并发FD、Android FD70000/UNSHARE、长时压力/Release.
  官方API33/service/AAR/native与distributionReady=false不变, 没有待用户回答的问题,
  当前无需追加设备或手动操作. 不重复请求已完成的三星固定套件.

[JSC构建/设备/压力与失败范围](compatibility/2026-09-14-m5-thirteen-patch-jsc.md),
[watch诊断与未解决边界](compatibility/2026-09-13-m3-watch-reload-trace.md).

## 此前三星完整检查点

# 会话交接: 十三补丁两项三星门禁完成

2026-09-13, 从干净 master `2d23e46` 继续. 先完整阅读 `AGENTS.md`, 本文件与
`E:/.codex-tmp/watch-reload-samsung-37478-20260913/SESSION_HANDOFF.local.md`,
以及其中的 `api32/SESSION_HANDOFF.local.md`. 更早的构建/本地回归记录仍在
`E:/.codex-tmp/watch-reload-fix-20260913/SESSION_HANDOFF.local.md`.

- 用户先后在同一 `localhost:37478` 提供两台设备, 每台都重新核对身份.
  SM-A566B 实际 API36 / 原生 ARM64 / 硬件16KiB / bridge0;
  SM-F936U 实际 API32 / 原生 ARM64 /4KiB /bridge0. 两台 shell 内核/MMU 页
  分别是16384/4096, 应用页另外硬断言. 设备/原始记录/物理及canonical smaps摘要分别绑定.
- 原样复用 `bf5cb72` 的32输入probe与83输入Binder三个APK, 当前输入仍匹配.
  Native仍为e8b1296169a8e6f20c81e926dba6448afb25cd11, ARM SHA c8f2513f...427160.
  无Bun/WebKit/ICU/监督器/Gradle/APK构建, 无定义/夹具/校验器/预算变化.
- 每台两轮固定35项70/70、完整八项Binder16/16, 无失败/跳过/重试.
  新增16次实际watch重载、24镜像, 哨兵FD均关闭, PID/stdio/普通SIGSYS保持.
  原blocked/pending、hard/soft limit和强制清理继续通过. 回收301-307ms.
  此前六环境加本轮两台, 同一十三补丁baseline八环境560/560 probes、128/128Binder.
  API36先归档的7环境490/112不改写, API32后续另绑定8环境结果.
- 三个测试包/UID逐台独立捕获并清理: API36为10320/10321/10322,
  API32为10328/10329/10330. 自有私有ADB5039前后PID14364/59528均已关闭,
  两次实际stop exit0, 只读确认PID/监听端口消失. 默认ADB/RDB未重启或终止;
  没有AVD操作, 无运行中设备任务或待清理进程. 已告知用户两台设备可以结束连接.
- 六份新JSON按API/套件/设备补充分开保存; 原99份JSON和206个矩阵行保持原样.
  [三星完整报告](compatibility/2026-09-13-m3-watch-reload-samsung.md)与各原始归档相互链接.
- 下一步是原API28watch SIGABRT/clone EAGAIN的独立有界诊断、十三补丁大页x86
  JSC重对齐与新设备/压力证据, 以及其余syscall/API/FD/OEM/IPC/跨reload信号/
  FD70000/UNSHARE/长时压力/Release. 本轮通过不解释或抹去原API28中止.
  两项三星固定套件门禁已完成, 不再重复请求同一轮设备. 当前没有待答设备问题.
  官方payload/service/AAR/API33与distributionReady=false保持不变.

## 此前六环境本地阶段

# 会话交接: 十三补丁本地回归完成, 三星与 watch 稳定性待继续

2026-09-13, 从干净 master `5d92ade` 继续, 源码/构建提交为 `bf5cb72`.
先完整阅读 `AGENTS.md`, 本文件与
`E:/.codex-tmp/watch-reload-fix-20260913/SESSION_HANDOFF.local.md`.
用户希望每次尽量推进多个有边界的小节; 本轮已完成 M3 修复/主机对照,
M2 双 ABI 独立构建, M3 六环境原套件回归与历史 JSC 校验修正.

- Native head `e8b1296169a8e6f20c81e926dba6448afb25cd11`, tree
  `7d715cd177328d44b12b6346bcf0e07e835b3578`. 两次独立双 ABI 构建均 actual exit 0,
  每 ABI 字节一致且四份 ELF 完整审计通过. collector/promotion/source-replay/
  corresponding-source 均完成. 不再启动原构建或一次性采集脚本.
- 35 定义、17 个 fixture/validator/Java 输入和预算未变, 只更新 expected revision.
  六个原生 4 KiB 环境 (Sony ARM64 API 28/31/33, Redmi ARM64 API 33,
  Xiaomi ARM64 API 35, x86_64 API 33 AVD) 各过两轮 35 probes 和完整八项 Binder,
  合计 420/420 与 96/96. 24 watch 模式、48 重载、72 镜像的 FD/PID/stdio/信号通过.
  探针 32 输入/Binder 83 输入逐项匹配 `bf5cb72`, 每 ABI 同 APK 复用.
- 初始 Sony28 probe-sony28 失败 69/70, 子 PID 9283 在两个正常镜像后 SIGABRT,
  logcat 有 clone EAGAIN, 无对应崩溃栈. 不将其归因于 ART/JDWP 或确定的资源上限.
  一次同 APK probe-sony28-r2 通过 70/70; 原尝试单独归档, 不计入接受数.
  下一步需有界捕获稳定性/资源失败根因, 不改旧夹具或预算来消除失败.
- 每设备三包/三个 UID, 加首次失败 UID, 均独立观察并确认零进程.
  唯一自有 emulator-5584 / bun-hard-limit-api33-20260912 已关闭.
  未操作此前 API37 AVD 或 ADB5053; 不推断其清单缺席原因. 默认 ADB/RDB 未动.
- APK 就绪后已询问三星 SM-A566B API36 / 原生 ARM64 / 硬件16KiB,
  其次 SM-F936U 实际API32 / ARM64 /4KiB, 约10分钟窗口. 无新回复;
  49909 TCP 可连但一次私有 ADB 接入失败, 没有设备身份或安装.
  自有私有ADB5039/PID59268已独立确认消失. 不重复 kill-server.
  后续重新确认可用窗口, 直接复用本机 probe-apks/binder-apks 快照;
  若当前构建输入已变, 使用 `bf5cb72` 的隔离检出核验, 不放宽 current-input 检查.
- 新源码两项三星门禁、十三补丁 JSC 候选重对齐/新回归、watch 中止诊断与
  其余 syscall/API/FD/OEM/压力/Release 仍开放. 十二补丁 JSC 的原候选及成绩保持原样.
  历史 loader 现在绑定完整旧归档, 新构建/候选源码匹配仍严格.
- Node 最终247/247 (首次243/245失败保留), Python38/38, 两个生成器检查通过.
  两次生产四任务均 actual0, JVM为UP-TO-DATE的既有21项结果,
  lint0错误/44既有警告; 最终IDE直接构建成功, 仅两个既有warning.
  十语言已同步, 官方payload/service/AAR/API33及distributionReady=false不变.
  原94历史JSON、registry与193个矩阵行逐项保持原样.

[修复与完整设备范围](compatibility/2026-09-13-m3-watch-reload-fix.md),
[独立构建](compatibility/2026-09-13-m2-watch-reload-runtime-evidence.json),
[探针](compatibility/2026-09-13-m3-watch-reload-probes.json),
[Binder](compatibility/2026-09-13-m3-watch-reload-binder.json),
[首次中止](compatibility/2026-09-13-m3-watch-reload-api28-abort-failure.json),
[独立检查点](compatibility/2026-09-13-m3-watch-reload-checkpoint.json).

## 此前已完成的故障归档

# 会话交接: watch/reload FD 泄漏已复现并归档, native 修复待开始

2026-09-13 (Asia/Shanghai), 从干净 master `9485aa1` 继续. 先完整阅读 `AGENTS.md`,
本文件和 `E:/.codex-tmp/watch-reload-20260913/SESSION_HANDOFF.local.md`.
本轮设备阶段已结束, 不重跑任何已完成 builder、device driver、collector 或 wx 归档脚本.

- 新固定 watch native/TRAP 两模式扩到35项, 原33定义、旧fixture和预算保留. Java只新增
  asset/record绑定, 删除这部分后与旧Java逐字节相同. 新源码输入32项, native仍为十二补丁06e518f73.
- 四个 native ARM64/4096 真机各两轮: SonyG8441 API28、Redmi22120RN86C API33、
  Xiaomi23046RP50C API35均33/35; SonyXQ-DQ72 API33/kernel5.15两轮34/35.
  该Sony原生raw CLOEXEC成功且watch通过, 同设备TRAP失败. 另两种native控制为ENOSYS/EINVAL.
- 原33项264/264, 新模式2/16通过、14/16失败, 全体266/280. 32次真实重载/48镜像中
  28次FD256仍指向同一sentinel并被startup补CLOEXEC, 显式CLOEXEC的FD257正常消失.
  相同PID/stdio、48次普通SIGSYS投递及16个自有watched child回收均正常. 这是未修复门禁.
- clean原生head/tree和三份完整source blob已只读绑定. reload前直接忽略bun_close_range失败,
  startup只会给已继承FD补标记. 无reload syscall trace, 无blocked/pending跨exec、IPC或FD70000结论.
- 三个APK批次均32输入且31项完全一致; 只有host watch validator先补实际socketpair, 再补
  原生EINVAL失败形态. 原fixture/Java/35定义/预算相同; 两个先期validator完整文本与原摘要保留.
  每批独立构建双ABI APK并验完整payload/签名/ZIP, 实际build exit0. x86只构建验证, 未设备执行.
  native build为零, 官方/实验/JSC payload及锁不变. 不将新诊断加入旧462/462和112/112.
- 四个runner实际exit1, 都是预期记录的FD语义失败, 清理通过. 包和UID10768/10531/11033/10654
  全部为空. 24个旧forcible case301-308ms. 无AVD/privateADB操作, 其他任务的AVD_API_37不干预.
- 下一步优先修复reload前FD fallback及错误传播, 保留stdio/IPC和既有信号语义, 再做独立native
  构建与原固定夹具新源码回归. 不提前关闭sentinel、不用startup补标记替代exec前关闭、不改失败为通过.
  新watch的x86/ARM64硬件16KiB、blocked/pending、IPC/并发FD、FD70000/UNSHARE、其余压力/Release仍开放.
  当前不需要继续租用三星; 后续native修复后再安排新的设备门禁. distributionReady=false.
- 最终 Node243/243, Python38/38, Markdown10语言/36产物和matrix94报告/193行通过.
  生产四项Gradle实际exit0, 14s, 96tasks (48executed/48up-to-date); JVM21项up-to-date,
  三个DebugAPK的runtime/16KiB ZIP门禁通过, lint0error/44warnings. IDE直接成功, 无timeout,
  仅SDK XML版本和既有Bundle.get弃用两个warning. 历史90报告/registry和原生/生产输入不变.

[完整报告](compatibility/2026-09-13-m3-watch-reload.md),
[初始失败](compatibility/2026-09-13-m3-watch-reload-initial-failure.json),
[EINVAL失败](compatibility/2026-09-13-m3-watch-reload-einval-failure.json),
[同设备native/TRAP对照](compatibility/2026-09-13-m3-watch-reload-native-control.json),
[源码/APK/清理绑定](compatibility/2026-09-13-m3-watch-reload-checkpoints.json).

## 此前三星门禁完成记录

# 会话交接: 十二补丁三星 API 32 完成, 两项三星原套件门禁补齐

2026-09-13 (Asia/Shanghai). 本轮从干净 master `0fba050` 继续, 用户确认设备已接入,
原 RDB 仍监听 `localhost:49909`. 先完整阅读 `AGENTS.md`, 本文件与
`E:/.codex-tmp/jsc-twelve-patch-20260913/samsung-api32-49909/SESSION_HANDOFF.local.md`.
设备阶段已结束; 不重跑任何 native/APK/device driver, collector 或一次性文档脚本.

- SM-F936U 实测 API32, native arm64-v8a/aarch64, PAGE_SIZE=4096, bridge=0,
  shell KernelPageSize/MMUPageSize 也均为 4096. native head `06e518f73`, 原生字节未变.
- 19:28:40-19:31:00 完成两轮原 33 项 66/66 和两轮完整八项 Binder 16/16,
  两个 runner actual exit 0, 无测试失败/跳过/重试. 四个 pending 模式保留四十个检查点,
  十二个 child 观测通过, 最后各在原 caller 投递一次. 八个 hard-limit/八个 spawn API,
  四个 soft-limit 与六个 forcible lifecycle (301-302 ms) 通过; 原定义和预算不变.
- 与前一台三星 API36 使用完全相同的三个 APK, 本次设备实验 native/APK 构建为零.
  Probe 30 输入/33 定义与此前五环境相同; Binder 81 输入逐项匹配 `dbd0fde`, 原
  detached `baseline-checkout` 运行和归档. 主目录 JSC 83 输入校验没有用于放宽旧 APK.
- 三个包卸载, UID10328/10329/10330 均为零进程, 已通知用户可以结束租用.
  本轮无 AVD 操作, 原 5037 server 未改. 私有 5039/PID54560 已关闭且只读核对监听/PID 消失.
  最初路径替换未匹配在独占日志创建时拒绝, 未覆盖旧输出; 初始 unauthorized 后实际身份通过.
  关闭 helper 的无匹配端口查询 exit1 和首次补充 collector 拒绝保留; 原关闭命令 receipt
  未持久化, 保持 null, 不编造时间/退出码. 后续只读确认 actual0, 未再发出停止命令.
- 新 Probe/Binder 与 device-facts JSON 分别归档. API32/36 两台三星同 APK 合计
  132/132 probes 和 32/32 Binder; baseline 七原生环境总计 462/462 与 112/112,
  累计 pending 模式28个/child84个. 十二补丁原套件两项三星设备门禁至此补齐.
  独立 JSC 32/32 Binder 和 28/28 pressure 另计; 所有九/十/十一及先前十二补丁历史保持原样.
- 当前没有 native/APK/device driver 待续, 没有为原套件继续占用三星设备的需要.
  下一步继续 M3 未覆盖的 syscall/API/FD/OEM, watch/reload, cgroup/clone3,
  FD70000/UNSHARE 及 ARM64/长时压力/性能等明确有限范围; 发布前 paired APK/source
  与签名 Release 验收仍单独开放. 不将本次原套件成绩扩展到这些范围或 Android9 稳定支持.
  官方 API33+, payload/service/AAR/锁, fixture/validator/budget 和 distributionReady=false 不变.
- 最终 Node 234/234, Python 38/38, Markdown 10 语言/36 产物与 matrix 90 报告/189 行通过.
  官方 Bun/supervisor 摘要和 ELF 验证通过; production 四项 Gradle actual exit0,
  24s, 96 tasks (49 executed/47 up-to-date), 三个 Debug APK 的 runtime/16 KiB ZIP 检查通过.
  JVM 21 项由 Gradle 判定 up-to-date, lint 0 error/44 warnings. IDE 工具直接成功,
  无 timeout, 报告 SDK XML 版本差异和既有 Bundle.get 弃用两个 warning, 未改环境.
  87 份历史归档/索引, 21 物理构建输入, 81 Binder Git 输入及原 probe/native/production
  均经独立 final-audit.json 核对; 新归档没有私钥或本机 SDK 路径.

[完整报告](compatibility/2026-09-13-m3-pending-wait-native-arm64-api32.md),
[Probe](compatibility/2026-09-13-m3-pending-wait-native-arm64-api32-probes.json),
[Binder](compatibility/2026-09-13-m3-pending-wait-native-arm64-api32-binder.json),
[设备/源码/APK/清理补充](compatibility/2026-09-13-m3-pending-wait-native-arm64-api32-device-facts.json).

## 此前 API 36 完成时的记录

# 会话交接: 十二补丁三星 ARM64 硬件 16 KiB 完成, API 32 待接入

2026-09-13 (Asia/Shanghai). 本轮从干净 master `d2dedb2` 继续, 用户提供 `localhost:49909`.
先完整阅读 `AGENTS.md`, 本文件与
`E:/.codex-tmp/jsc-twelve-patch-20260913/samsung-49909/SESSION_HANDOFF.local.md`.
三星设备阶段已完成, 不要重跑 native/APK/device driver, archiver 或一次性文档脚本.

- SM-A566B 实测 API36, native arm64-v8a/aarch64, PAGE_SIZE=16384, bridge=0;
  shell smaps 的 KernelPageSize/MMUPageSize 也均为 16384. 十二补丁 head `06e518f73`,
  ARM64 Bun 87923328 bytes / SHA-256 `86d1b4d0fd74591655bc55e55f90ec75c7d3a0aba2116200be419ae626ed53d6`.
- 19:01:30-19:03:42 完成原 33 项两轮 66/66 和完整八项 Binder 两轮 16/16,
  两个 runner actual exit 0, 无测试失败/跳过/重试. 四个 pending 模式的四十个保持
  检查点和十二个 child 观测通过, 最后各在原 caller 交付一次; 原 blocked/FD/预算不变.
  hard-limit 八次, spawn API 八次, soft-limit 四次, forcible 六次 (301-304 ms).
- 三星回归使用的实验 native/APK 构建为零. 复用此前 30 输入/33 定义 probe APK,
  Binder 使用上一阶段 `samsung-ready-baseline-apks` 的现成 81 输入批次,
  三个实际 APK 摘要见报告. 从 detached `baseline-checkout` (`dbd0fde`) 执行原 runner
  与 archiver; 81 输入逐一匹配 Git. 主目录的 83 输入 JSC profile 未用于放宽旧 APK 门禁.
- 三个包已卸载, UID10320/10321/10322 均已独立核对零进程, 已通知用户可以结束租用.
  无 AVD 操作. 默认 ADB5037 前置异常及私有 server 初次监听参数/授权状态保留;
  有效的 owned5039/PID51752 在全部清理后关闭, 监听与 PID 均消失. 5037/5038 未操作.
- 新源码 baseline 六环境累计 396/396 probes 和 96/96 Binder. 独立十二补丁 JSC
  32/32 Binder 和 28/28 pressure 另计, 九/十/十一补丁及先前五环境历史不改写.
  新源码 ARM64 API32/4KiB 待设备接入; 已向用户询问 SM-F936U, 不把无回复当作接入.
  后续使用现成匹配 APK/runner, 新端口核对实际设备事实, 另建 API32 结果和传输 ownership,
  不重用本次已完成的 wx 输出或已关闭的私有 server 状态.
- 当前没有 native/APK/device driver 待续. 其余 syscall/API/FD/OEM, watch/reload,
  cgroup/clone3, FD70000/UNSHARE, ARM64/长时压力和 Release 仍开放;
  官方 API33+, production service/AAR, payload/锁, fixture/validator/budget,
  所有历史归档及 distributionReady=false 不变.
- 最终 Node 234/234, Python 38/38, Markdown 10 语言/36 产物, matrix 87 报告/187 行通过;
  官方 Bun/supervisor 的摘要和 ELF 门禁通过. 更新文档后的 production 四项 Gradle
  actual exit 0 (18s, 96 tasks, 49 executed/47 up-to-date), 三个 Debug APK 的 runtime
  与 16 KiB ZIP 检查通过. JVM 21 项由 Gradle 判定 up-to-date; lint 0 error/44 warnings.
  IDE 工具本次直接 isSuccess=true, 无 timeout, 一个既有 Bundle.get 弃用警告.
  84 个历史归档及索引条目, 21 个物理构建输入, 全部 native 锁, production/AAR 和
  fixture/validator/预算未漂移. 新 JSON 未含私钥或本机 SDK 路径; 本机 final-audit.json 保留核对结果.

[完整报告](compatibility/2026-09-13-m3-pending-wait-native-arm64-api36.md),
[Probe](compatibility/2026-09-13-m3-pending-wait-native-arm64-api36-probes.json),
[Binder](compatibility/2026-09-13-m3-pending-wait-native-arm64-api36-binder.json),
[设备/源码/APK/清理补充](compatibility/2026-09-13-m3-pending-wait-native-arm64-api36-device-facts.json).

## 此前 JSC 完成与三星尚未接入时的记录

# 会话交接: 十二补丁 JSC 双页大小回归完成, 三星 baseline 新源码待接入

2026-09-13 (Asia/Shanghai). 本轮从干净 `dbd0fde` 继续, 源码/构建提交为 `0210e82`.
先完整阅读 `AGENTS.md`、本文件及 `E:/.codex-tmp/jsc-twelve-patch-20260913/SESSION_HANDOFF.local.md`.
以下均已完成, 不要重跑 native/APK driver、collector、归档或一次性文档脚本.

- 两个 `jsc-twelve-patch-run-{1,2}` 新 Bun 构建实际 exit 0/0, 完整成品均为 90609496 bytes,
  SHA-256 `34edd4b99d74c7472febfcc3f1a1c6068bd57cd5714aab150b5b86dafa75b1ad`.
  clean head/tree、21 输入、完整日志/最终边与两份 ELF 通过; 复用原两套独立 JSC 和 ICU,
  无新 WebKit/ICU 或 baseline Bun 构建. 新锁和 build-only 归档与九/十补丁历史分开.
  原始混合换行导致的两次 recorder 失败保留, 最终逐字节重建验证通过, 未改原 source/driver.
- 同一新主/测试 APK 绑定干净 `0210e82` 的 83 输入. API 36 native x86 的 4 KiB/16 KiB
  用户页各两轮原八项 Binder 通过 32/32, 原七模式压力通过 28/28. 固定 fixture/validator/
  Java/budget、production service/AAR 均不变. 两台内核/MMU 页都是 4 KiB; 不代表 ARM64 硬件页.
- 初次 16 KiB Binder 第一轮 7/8, 首次 prewarm DeadObjectException; 第二轮 8/8.
  明确 owned UID10213/PID4931、5079 的 lowmemorykiller 和 Zygote SIGKILL 记录已归档.
  整次失败不计接受. 同一 AVD、APK/源码/设置/预算完整重试两轮通过, 原失败完整保留.
- 四次接受 runner 实际 exit 0; 每次主/测试包卸载后两个 UID 都为零进程, 初次失败也清零.
  两个 owned AVD 5580/5582 已关闭, 最后一个在 18:17:49 本地时间确认离线. 中途出现的
  其他任务 API37/5572 未操作. `device-completed.json`、原 driver 和 recovery driver 分开保留.
- 三星准备在独立 detached `baseline-checkout` (`dbd0fde`) 完成, `samsung-ready-baseline-apks`
  的 81 输入、签名与完整 payload 通过. 原 33 项 probe APK 验证 30 输入后直接复用.
  两次签名准备问题保留; 临时签名配置已移除, 原 key 未复制/显示. 此批次不是 JSC 的 83 输入.
  17:48:42-17:58:42 的 50781 窗口 40 次均 offline, 无三星安装/测试, 当前无等待窗口.
  后续需 SM-F936U API32/native ARM64/4096 与 SM-A566B API36/native ARM64/16384,
  各两轮原 33 项和八项 Binder. 从匹配的 baseline-checkout 运行, 不放宽 compiled-input 校验.
- baseline 十二补丁保持五环境 330/330 probes 和 80/80 Binder. 新候选成绩另计; 原生文件、
  官方 API33+、所有历史 JSON/锁与 distributionReady=false 不变. 广泛 syscall/API/FD/OEM、
  watch/reload、cgroup/clone3、FD70000/UNSHARE、长时压力/性能与 Release 仍开放.
- 最终 Node 234/234、Python 38/38、Markdown 10 语言/36 产物与 matrix 84 报告/185 行通过.
  production 四项 Gradle 实际 exit 0 (39s, 96 tasks, 12 executed/84 up-to-date), 三个 Debug
  APK runtime/16 KiB ZIP 门禁通过; JVM 21 项原结果由 Gradle 判定 up-to-date, lint 0 error/44 warnings.
  IDE 工具 60 秒 timeout 原样保留, 精确匹配项目/command 的两个后台构建分别成功 (7s 与 1m55s).
  80 个既有归档/索引和 21 个物理构建输入均未变, 生产 source/AAR、原 pressure 源码与全部锁未漂移.
  当前没有 native/APK/device driver 待续; 三星 runner 仅准备, 尚未执行.

[完整结果](compatibility/2026-09-13-m5-twelve-patch-jsc.md),
[Binder](compatibility/2026-09-13-m5-twelve-patch-jsc-binder.json),
[压力](compatibility/2026-09-13-m5-twelve-patch-jsc-pressure.json),
[初次失败](compatibility/2026-09-13-m5-twelve-patch-jsc-binder-memory-failure.json),
[构建/APK/设备清理补充](compatibility/2026-09-13-m5-twelve-patch-jsc-checkpoints.json).

## 此前 native-only 阶段记录 (已完成后续设备门禁)

# 会话交接: 十二补丁 JSC 双构建完成, 新 APK 回归待执行

2026-09-13 (Asia/Shanghai), 从干净 master `dbd0fde` 继续. 先完整阅读本文件、
`AGENTS.md` 和 `E:/.codex-tmp/jsc-twelve-patch-20260913/SESSION_HANDOFF.local.md`.
两个 `jsc-twelve-patch-run-{1,2}` 驱动均已实际 exit 0, 第二轮结束于 10:00:56Z;
无需重跑 native driver 或任何已执行的 collector/promotion/文案脚本.
两份完整 x86 Bun 为 90609496 bytes / SHA-256
`34edd4b99d74c7472febfcc3f1a1c6068bd57cd5714aab150b5b86dafa75b1ad`, 完整两份 ELF 通过.
clean head/tree 和 21 个构建输入未漂移, 复用原两个独立 WebKit 库/config 和原 ICU;
没有新 WebKit/ICU 或 baseline Bun 构建. 新 `twelve-patch-candidate.lock.json` 和
[构建归档](compatibility/2026-09-13-m5-twelve-patch-jsc-builds.json) 与九/十补丁历史分开.
最初两次 recorder 因原始/规范换行比较而失败; 一个既有脚本为 1479 CRLF 加两行 LF.
现在显式绑定并逐字节重建完整换行分布, 不改写原 driver 摘要或 source, 原失败保留.
新工具/构建报告/十语言文案已生成, Node 234/234、Python 38/38、Markdown 10 语言/36 产物
和兼容矩阵 80 报告/180 行均通过.
下一步复查并提交源码/构建结果, 用新候选打包 JSC APK, 再运行两种页大小的原八项 Binder
与七模式压力各两轮. 原 pressure asset/Java/语义 validator/预算和生产 service/AAR 均不变.

三星 APK 已另在干净 `dbd0fde` 的本机 `baseline-checkout` 构建, 81 项源码输入和宿主兼容
签名/payload 验证通过; 33 项 probe APK 复用原字节并核对 30 输入. 两次签名准备问题保留,
修正本机路径后新批次通过, 无设备安装. 忽略的配置副本已移除, 原私钥未复制或显示.
17:48:42-17:58:42 本地时间的 10 分钟 50781 窗口 40 次轮询均 offline, 无三星新成绩.
现无等待窗口或 owned AVD. 后续三星测试应使用该独立工作目录的匹配 runner/APK,
不得借主工作目录后续新 JSC 输入放宽旧 APK 的 compiled-input 校验.

## 此前完成的十二补丁本地回归

# 会话交接: 十二补丁本地回归完成, 三星新源码与 JSC rebase 待继续

2026-09-13 (Asia/Shanghai). 源码/构建已提交于 `bb61b9c`, 本轮最初为干净 master `86200f1`.
完整阅读 `AGENTS.md`、本文件及 `E:/.codex-tmp/pending-wait-fix-20260913/SESSION_HANDOFF.local.md`.
本机 AFTER_BUILDS.md 是已执行的阶段计划; **不要重跑 native driver、collector、promotion、APK builder 或一次性文档脚本**.

- 当前 native head `06e518f73b4fccc6c3ffb17412ea166bf886bed0`, tree `1eb8d5ea945001f018bdf14bd00c261d40b02573`.
  第 12 补丁保留 Android epoll caller mask/pending, 调用点维持已有 epoll_pwait2 禁用.
  GCC 13/Clang 21 各 45 次对照、完整重放/28 blobs、两份双 ABI 构建及四份 ELF 均通过.
  两个实际 driver exit 0, 每 ABI 字节一致; WSL 导出 `pending-wait-evidence/run-{1,2}`.
- 同一新 probe APK 在 ARM64 API 28/31/33/35 和原生 x86_64 API 33 (均 4096 页) 各两轮 33/33,
  总计 330/330. API 33 真机为 Redmi 22120RN86C, 原计划 Sony QV770340J7 在安装前断线.
  二十次 pending async/六十 child 检查通过, 原 31 项保持, fixture/validator/预算均不变.
- 新源码完整八项 Binder 在同五环境两轮通过 80/80. Sony28、sony28retry 都首轮 8/8,
  第二轮测试前 ART/ADB-JDWP SIGSEGV; 两个失败归档独立保留且不计通过数.
  第三次 sony28retry2 两轮通过. 三次 APK、81 编译输入、native、签名完全一致, 未加 workaround.
- 测试 APK 在干净 `bb61b9c` 生成; probe 绑定 30 输入, Binder 81 输入. 已测字节/原始记录
  保存在本机 probe-apks、binder-apks 和设备目录. 后续文档构建不能替换这些被验收的快照.
  当前 changelog assets 已更新; 下次设备回归应保留原快照, 以当时提交重建 Binder APK 并另建批次,
  不放宽 compiled-input 校验. Probe 输入与 native 未变, 可先按既有 verifier 核验后复用原 probe APK.
  本机 snapshot helper 曾误要求 universal, 实验模块固定只有三个 APK; 错误另记, 没有重建.
- 所有测试包卸载, 执行 UID 进程清零 (含两次失败). 本轮只启动并关闭 API 33 AVD:
  bun-hard-limit-api33-20260912 / emulator-5584, launcher24912. native/APK/设备 driver 均已结束.
  预先其他任务 emulator-5568 和 Sony33 后来不在库存, 未主动控制, 不推断原因.
- 三星窗口 17:05-17:15 本地时间已结束, localhost:50781 多次只读检查 offline, 无三星安装/测试.
  下一次接入需新的具体型号/API/页大小窗口. 优先 SM-F936U API 32/ARM64/4 KiB 和
  SM-A566B API 36/ARM64/hardware 16 KiB 的相同 33 项/八项 Binder, 不转移十补丁结果.
- 后续独立任务是十二补丁大页 JSC rebase; 现有十补丁候选不能改标签或换字节冒充.
  syscall/FD/API/OEM、watch/reload、cgroup/clone3、FD70000/UNSHARE、压力/性能及 Release 仍开放.
  官方 API 33+、payload/service/AAR 和 distributionReady=false 不变; 本轮未 push 或发布.
- Node 229/229、Python 38/38、10 语言/36 生成产物及 production 四项 Gradle 验证通过;
  最终文档修改后复验 Node 229/229、Python 38/38、matrix 79 报告/180 行和 Markdown 10/36 均通过.
  production 四项 Gradle 再次实际 exit 0 (17s, 96 tasks). IDE 工具 timeout 原样保留, 对应后台命令成功另记.

[修复/完整结果](compatibility/2026-09-13-m3-pending-wait-fix.md),
[Probe](compatibility/2026-09-13-m3-pending-wait-probes.json),
[Binder](compatibility/2026-09-13-m3-pending-wait-binder.json),
[构建/设备清理补充](compatibility/2026-09-13-m3-pending-wait-checkpoint.json).

## 此前完成的十一补丁构建与 wait 阻断

# 会话交接: 十一补丁独立构建完成, 新 epoll wait 阻断已复现并动态定位

更新: 2026-09-13 (Asia/Shanghai). 从干净 `86b18b5` 继续.
完整阅读 `AGENTS.md`、本文件及 `E:/.codex-tmp/pending-mask-20260913/SESSION_HANDOFF.local.md`.
本机 `PROMOTION_NEXT.md` 是原先待办, 以本记录与追加状态为准.
[spawn 修复/构建报告](compatibility/2026-09-13-m3-pending-mask-fix.md) 与
[构建证据](compatibility/2026-09-13-m2-pending-mask-runtime-evidence.json) 已提交于 `b984684`.
**新 33 项 Android 门禁仍失败**, 见 [wait 阶段报告](compatibility/2026-09-13-m3-pending-wait.md)、
[失败归档](compatibility/2026-09-13-m3-pending-wait-failure.json) 与
[独立动态诊断](compatibility/2026-09-13-m3-pending-wait-diagnosis.json).

- 新 11 补丁 head `946f082ab8ede2b7cbd6ba9fddb90463a94f0330`, tree `73476190d9341d338a96c8a9793db947ea415d15`.
  Android 父线程追加阻塞并保留 pending SIGSYS, 仅子路径安装 setup mask;
  blocked caller 的 cgroup 使用已有 child join, 不设置 clone3 全局不可用状态.
- 完整重放/28 原 blob 通过; GCC 13 与 Clang 21 各过 14 新源码场景和两个旧失败对照.
  新编译告警排除只适配上游 `{ 0 }`, 不改行为断言. 历史 pending 失败/trace 归档保持原样.
- **两次独立 native 构建已结束, 不要重复启动.** WSL `pending-mask-run-1` / `pending-mask-run-2`
  各构建双 ABI, 两个实际 driver exit 均为 0, 每 ABI 两份成品一致. 完整日志、16 配方、
  clean head/tree 与最终 Ninja edges 已核对; 新 schema-3 收集和四份 ELF 审计均实际 exit 0.
  原十补丁 schema-2 的退出码缺失继续保持 null, 不与本次记录混用.
- 新导出在 WSL `pending-mask-evidence/run-{1,2}`; current runtime-evidence 和对应源码绑定已晋升,
  runtimeProduced=true / distributionReady=false. 原上游 WebKit/JSC/ICU 复用, 没有新库构建.
- 15 个 fixture/validator/Java 源码、完整 probe-common 校验器和原 33 定义按旧归档保护;
  仅 expected revision 改为 `1.4.0+946f082ab`. 同一新 ARM64 probe APK 在 Sony API 28/31
  各两轮 31/33: 原 31 项 124/124, pending 模式 0/8. 即时 spawn 保留信号, await 后提前交付.
  `[[1,0],[1,0],[1,0],[0,1]]` 与历史十补丁 `[[1,0],[1,0],[0,0]]` 不同, 原始失败分别保留.
- 新 observer 在自己拥有的 signal-stop tracee 只读 GETREGSET, 仅 epoll wait 上下文读一个 mask word;
  原样转交 SIGSYS, 不改寄存器、mask 或 syscall. 两台各两轮 native/TRAP plain/traced, 八次只读观察
  全部捕获 child close_range 之后的主线程 SI_TKILL, ARM64 x8=22, x4 指向实际零 mask.
  `packages/bun-usockets/src/eventing/epoll_kqueue.c:126` 给两种 wait API 传入空 mask 与此吻合.
  未采集调用栈/PC, 不算 epoll_pwait2 首次可达性或兼容通过.
- 两套新 probe APK、Binder 主/测试 APK 已构建; 因首个应用门禁失败, Binder 未运行,
  其余设备不增加本轮通过数. Probe UID 10759/15124、trace UID 10760/15125 全部卸载清零.
  仅启动/关闭 owned API 33 AVD `bun-hard-limit-api33-20260912` / 5584, 未在其运行套件.
  最终其 serial 消失; 未控制其他 AVD, 不推断无关库存变化原因.
- 三星窗口约 15:52:40-16:02:40 local, 多次轮询 localhost:50781 始终 offline/不可用;
  没有三星安装/测试, 当前无待用设备. 旧 434/434、112/112 和 JSC 均保持原范围.
- 十语言 changelog 与生成产物已更新. 标准生产 Gradle 四项检查实际 exit 0 (8m13s, 96 tasks);
  单元测试任务沿用已有 21 项, lint 0 errors/44 warnings, 三个 Debug APK 字节/16 KiB ZIP 对齐通过.
  IDE build 调用一次, 工具 60 秒超时保留; 精确匹配的 Gradle command 随后成功
  (2m3s, 6 tasks up-to-date), 原始工具返回值保持不变.
- 最新完整 Node 228/228、Python 38/38、生成器/矩阵检查通过. 矩阵为 73 份/168 行,
  新两条失败行与两条诊断行没有增加完整套件通过. 观察器 Linux plain/traced 五场景通过;
  首次 WSL 本机因缺 cc 未能编译, 改用已存在的固定工具镜像完成, 未安装/修复环境.
  新生成文档后生产 Gradle 同四任务再次实际 exit 0 (28s, 96 tasks), JVM 21 项仍为 up-to-date.
- **下一步**: 修复 Android wait 的 caller mask 生命周期并审查 blocked SIGSYS 下可选新 wait syscall.
  不能只改 fallback 参数而遗漏原始 epoll_pwait2 的可选探测风险; 做固定源码主机对照后再全新双构建,
  保留本轮十一补丁 source/build/failure 全部记录. 第 12 补丁尚未创建, 没有新 native 构建运行.
  不提前清 pending、不预热 waiter、不放宽原 33 项断言. 未 push、Release、委派 agent 或修复缓存.

## 此前: M3 pending SIGSYS 新阻断已复现并完成动态诊断

更新: 2026-09-13 (Asia/Shanghai). 从干净 `57679d1` 继续, 本轮完成两个固定 pending
探针及独立观察器诊断. **兼容门禁失败, runtime 尚未修复.** 继续前读完整 `AGENTS.md`、
本文件及 `E:/.codex-tmp/pending-sigsys-20260913/SESSION_HANDOFF.local.md`.
[完整报告](compatibility/2026-09-13-m3-pending-sigsys.md)、
[失败](compatibility/2026-09-13-m3-pending-sigsys-failure.json) 与
[诊断](compatibility/2026-09-13-m3-pending-sigsys-diagnosis.json) 分开保存.

- 33-probe 套件保留原 31 定义、六个旧 fixture、五个独立 validator 及 FD validator 函数.
  新增 native/TRAP pending 模式, 只给两个新 asset 12 KiB cap; 原预算/recovery-last 不变.
- Sony G8441 API 28 与 Sony XQ-AT72 API 31 (原生 ARM64 / 4096) 使用同一 APK,
  各两轮 31/33. 原 31 项 124/124, 新模式 0/8; 每次都是第一次 spawn 返回后 pending
  位消失, mask 检查通过但 JS 尚未收到信号. 受控 exit 1, 不是 SIGSYS 崩溃或超时.
- 独立 observer 新增 fixed `pending-async` profile, 区分 SYS_SECCOMP 与 SI_TKILL 的
  siginfo union 字段. 两设备各两轮 native/TRAP plain/traced, 共 16 次复现;
  八次追踪均捕获主线程 SI_TKILL, sender PID/UID 精确匹配且先于 child close_range.
  不改变寄存器、mask、syscall 结果或信号交付. 没有抓取 rt_sigprocmask 参数或调用栈.
- 精确十补丁 `bun-spawn.cpp:253` 在父线程 vfork 前临时从 mask 移除 SIGSYS,
  与早交付吻合. Patch 10 的 pidfd shim 保证不能扩大为整个 spawn 的 pending 保持.
  下一步先修复父/子 mask 生命周期, 同时审查 parent clone3/cgroup; 新源码单独构建和验收.
  不预热 pidfd、不提前清 pending、不放宽新失败断言或覆盖原报告.
- Probe APK 绑定 30 输入, observer APK 绑定 35 输入; 两次固定 NDK 编译仅构建小 observer,
  不是 Bun/WebKit. 全部 native/source locks、生产 service/AAR、官方 API 33+、distributionReady=false 不变.
- 两台 probe UID 10757/15122、trace UID 10758/15123 均卸载清零; 私有目录全部清理.
  仅启动/关闭 owned AVD 5584, 未在其运行套件. 精确名称与 serial 消失记录已保存;
  其他 AVD 无控制命令, 不推断初末无关库存变化原因. 无三星窗口、push 或 Release.
- 新 archiver 仅接收精确失败与动态证据. 旧 31 项失败工具拒绝扩展套件, 防止复用旧计数.
  原 68 份 JSON 保持不变, 新矩阵 70 份/164 条. 新回归不增加历史 434/434、112/112,
  没有新 Binder、x86 执行、三星/16 KiB、watch/reload 或 Release 通过结论.
- 最终 Node 204/204、Python 37/37, Markdown 与矩阵生成检查通过. 生产四项 Gradle
  2m 31s 成功 (48 executed / 48 up-to-date); JVM 原 21 项结果有效, 本轮任务为
  UP-TO-DATE, 不声称重新执行. lint 0 errors/44 warnings, 三种 Debug APK 摘要/16 KiB ZIP
  校验通过. observer Linux host 四模式/eight plain-traced executions 通过.
  IDE 补充 build 的 60 秒调用超时, 仅返回 SDK XML 版本警告; 原始返回留在本机,
  不将超时当成功, 也未修复缓存或重复启动 native 构建. 后续状态见本机交接.

## 此前: M3-B 启动检查诊断与重试生命周期完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `4195101` 继续, 完成 M3-B 的
runtime probe 诊断和失败缓存/重试两个小节. 继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/probe-lifecycle-20260913/SESSION_HANDOFF.local.md`.
[完整报告](compatibility/2026-09-13-m3-probe-lifecycle.md) 和
[构建/运行/归档工具](../tools/diagnostics/PROBES.md) 是新入口.

- 生产检查现在持续读取 stdout/stderr, 每流 4 KiB; 使用原监督器有界终止/回收.
  保留本地化摘要并补充 API/ABI/阶段/identity/退出与重试事实, signal 只按退出惯例推断.
  不增加协议 key、AAR 或 native 改动, 不收集普通 Binder fingerprint 或用户源码.
- 成功和固定完整性/版本/页大小失败缓存至服务重建; 已完成清理的临时失败在完成后
  冷却 30 秒, 后续请求触发一次重试, 并发共享检查. 无后台重试, 未回收/未排空则禁止重试.
- 两个独立 Debug APK 批次复用原官方/十补丁成品. ARM64 官方 API 33/35 与实验
  API 28/31, 加实验 x86 API 33 (均原生 4 KiB), 两轮原八项 Binder 共 80/80,
  新三项 probe 共 30/30. 注入故障与虚拟冷却时钟明确是测试条件, 不当作自然设备故障.
  官方两台另通过语言 JUnit 8/8, 含 240 个错误/finished 观察.
- 官方 x86 API 36 / 16384 用户页的资源/缓存拒绝两轮 4/4; shell 内核映射仍 4096,
  Bun 在执行前被拒绝. 用同一官方 APK 的 receipt 格式适配, 没有重编或重打包.
- 两次首次失败分别保留: API 28 第二轮测试开始前 owned ART/ADB-JDWP SIGSEGV;
  16 KiB AVD 第八个语言后 `lowmemorykiller` 杀服务导致 DeadObjectException.
  两者原 APK/断言/设置/预算均不变, 新目录重试通过, 原失败不计入成功数.
- 所有安装尝试的两个包/UID 都清理. 仅关闭本轮 5584 与 5582 两台 AVD,
  精确名称核对及最终 serial 消失已记录; 原有 5554/5560 未操作. 无三星窗口.
- JVM 21/21 (新增 11 项)、Node 193/193、Python 37/37, Markdown 与兼容矩阵检查通过;
  矩阵登记 68 份 JSON / 160 条记录, 原 60 份报告未改. 生产四项 Gradle 17 秒成功,
  lint 0 errors/44 warnings, IDE build 成功. 没有 native build、缓存修复、push 或 Release.

实测 APK 在本机 `official-apks`、`experimental-apks`、`refusal-apks`, 归档后才生成当前
changelog, 不要用后续生产输出替换它们或放宽旧输入检查. 原 31-probe 没有重跑,
历史十补丁 434/434、112/112 与 JSC/Samsung 结果不自动重验到本轮服务.
下一步可继续 M3 syscall/FD/线程/watch 边界、M8 上游只读审阅等未完成小节.
更广矩阵/压力/签名 Release 仍开放. 官方 API 33+ 与 distributionReady=false 不变;
如需三星, 仍按下方 10 分钟/50781 约定, 不自行委派 agent.

## 此前: M9 运行错误与十语言诊断审计完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `b1d2606` 继续,
完成 M9 最后一项错误/诊断文案审计. 继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/runtime-messages-20260913/SESSION_HANDOFF.local.md`.
实现与证据见 [审计报告](compatibility/2026-09-13-m9-localized-errors.md) 和
[复核工具](../tools/diagnostics/README.md).

- 新增 17 个错误/帮助资源, 10 个稳定错误码使用十语言摘要. 预热缓存保留失败事实,
  在返回时使用插件当前 Android 语言; 诊断受 16 KiB UTF-8 限制, 不拆开有效 Unicode 字符.
  README/插件说明的激活、Android 13 要求、超时和输出超限帮助取自同一组 strings.xml.
  绑定前宿主错误与系统安装门槛没有改造成虚假的插件服务返回结果.
- 同一隔离 Debug APK 批次绑定 85 项输入, 官方 Bun/supervisor 原字节不变.
  Sony XQ-DQ72 API 33 与 Xiaomi 23046RP50C API 35 (native ARM64 / 4096) 各两轮:
  原八项 Binder 合计 32/32, 独立语言 JUnit 合计 8/8, 含 240 个真实错误/finished 观察.
- 本轮拥有的 x86 API 36 / 16384 用户页 ABI AVD 另通过两轮 4/4 资源/拒绝 JUnit,
  验证十语言下缓存的 prewarm/info/run 拒绝一致; 内核映射为 4096. Bun 在执行前被拒绝,
  不能把该记录算作官方 x86 16 KiB 运行成功. 三份 JSON 独立归档, 原历史报告不改.
- 三环境的两个测试包均卸载, 六个 UID 最终为零进程. 只启动并关闭本轮
  `bun-jsc-pressure-16k-20260912` / `emulator-5582`; 原有 `emulator-5554` 未操作.
  没有使用三星或开启等待窗口. 没有 native 构建、Gradle 缓存修复、push 或 Release.
- JVM 10/10、Python 37/37、Node 191/191、36 文件生成器及兼容矩阵 --check 通过.
  矩阵现登记 60 份 JSON / 148 条设备尝试; 拒绝报告仅诊断索引, 不增加执行通过数.
  隔离与标准生产四项 Gradle 检查均成功 (各 15 秒), IDE build 通过.
  Lint 按 issue 节点计为 0 errors/44 warnings; 本次五条分别是固定字节页大小的复数建议、Python 消费的
  帮助资源和按仓库要求使用 ASCII 连字符, 具体解释见审计报告.
- 接受 APK 已保存在本机 `apks/`, 不要用随后生产包的输出覆盖它们.
  新受控构建 helper 是接受 APK 构建后补充的, 仅语法检查; 初始批次使用受控 Gradle
  命令及构建后外部 receipt. 不追溯声称 helper 已运行, 不无理由重建或重跑设备.

M9 本轮选定的小节包含服务实现、十语言资源、生成器、设备回归和归档, 已完整完成.
下一步从 Roadmap 的实验 syscall/API/FD/OEM 边界、持续上游审阅或其他未完成项选择
明确范围继续. 十补丁/JSC 的既有构建和设备证据保持成立于其原 APK/源码批次;
本轮服务呈现更新没有自动重验实验线或签名 Release. 如需三星, 仍按 10 分钟/50781 约定.

## 此前: M9 兼容矩阵生成器完成

更新: 2026-09-13 (Asia/Shanghai). 从干净 `7d5ac1e` 继续,
本轮完成独立兼容证据索引, 未改 native/runtime/service 或历史报告.
继续前完整阅读 `AGENTS.md`、本文件及
`E:/.codex-tmp/compatibility-matrix-20260913/SESSION_HANDOFF.local.md`.
新生成器已登记 57 份源 JSON, 生成 144 条设备/尝试记录:
[人类矩阵](compatibility/MATRIX.md)、[机器索引](compatibility/matrix.generated.json)、
[维护说明](../tools/compatibility/README.md).

- 按运行时完整 hash/源码、设备 API/ABI/页大小和各轮计数保留结果. 官方、实验、shell、
  失败及初步诊断分别呈现; 构建和补充记录仅索引, 不增加设备通过数.
- 同一报告内核对 summary、各轮计数/套件/环境和 payload/APK 一致性, 不跨报告或套件求总和.
  缺失测量保留 null, 不把 x86 用户页 ABI 等同于内核页或 ARM64 硬件, 不以 ARM bridge 的存在推断翻译执行.
- `matrix-sources.json` 固定历史报告 UTF-8/LF SHA-256. 新报告需登记其结构/范围后重新生成;
  新增、缺失、历史修改或过期输出在 `--check` 中失败. Markdown CI 与 AGENTS 已加入检查.
- 十语言 README 兼容章节与 v0.2.2 changelog 已同步. 原 36 文件生成器契约不变,
  新矩阵另有两个生成产物. Python 35/35 (矩阵 24 + 原文档 11)、Node 189/189、
  官方 Bun/supervisor 完整性、标准四 Gradle 检查和 IDE build 通过.
  Gradle 25 秒/96 tasks, 48 executed/48 up-to-date; JVM 复用既有 8 项成功结果,
  lint 0 errors/40 既有 warnings, IDE 仅既有 SDK XML 与 Bundle.get 警告.
- 开始时确认此前两次 JSC/Bun native driver exit 0 和 WSL/Docker 无活动构建;
  本轮没有 native 构建、Gradle 缓存修复、设备运行或 AVD 操作, 不把索引更新称为新设备验收.
  旁侧 AutoJs6 仓库有用户构建, 未干预. 本轮命令均已结束, 无三星等待窗口, 无 push/Release.

下一节可选择 M9 用户错误/诊断文案审计; 该小节尚未开始. 本轮矩阵覆盖多种历史结构,
以完成其实现、负向回归和 CI 为边界. 现有实验 syscall/API/FD/OEM、长时压力/性能与 Release
门槛保持开放. 三星接入仍按下方 10 分钟/50781 约定, 不假定旧设备连接可复用.

下方为此前已完成的 JSC 与 baseline 工作, 保留各自证据边界和本机记录.

## 此前: 十补丁大页 JSC 回归与 M9 排错指南完成

更新: 2026-09-13 (Asia/Shanghai). 本轮从干净 `6212011` 继续,
实现/构建证据已提交为 `573812979506283492637aaea3375819c336e515`.
本轮完成 M5 的十补丁 JSC rebase、双 clean Bun 构建、双页大小原 Binder 与压力回归,
以及 M9 排错指南/十语言 README 入口. 最终证据见
[完整说明](compatibility/2026-09-13-m5-ten-patch-jsc.md)、
[Binder](compatibility/2026-09-13-m5-ten-patch-jsc-binder.json)、
[压力](compatibility/2026-09-13-m5-ten-patch-jsc-pressure.json) 和
[补充检查点](compatibility/2026-09-13-m5-ten-patch-jsc-checkpoints.json).

继续前完整阅读 `AGENTS.md`、本文件及本轮本机记录
`E:/.codex-tmp/jsc-ten-patch-20260913/SESSION_HANDOFF.local.md`.
更早的 baseline/Samsung/诊断记录仍在
`E:/.codex-tmp/bun-signal-trace-20260913/SESSION_HANDOFF.local.md`.
先检查进程与日志, 不重复已完成的 native 构建、Gradle ZIP 修复或 SIGSYS 诊断.

## 本轮结果与精确范围

- 两个新 Bun checkout 固定十补丁 head `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`,
  tree `cb762d12f6959834517c79f01f4c538346990962`. 两个实际 driver exit 均为 0,
  complete x86_64 Bun 都是 90609488 bytes / SHA-256
  `a237dc8c13fbef6366a36769ea9a6d729fd24307b0df93bb051be8d997f8dcd5`.
- 精确复用原两个独立 WebKit 构建的三个 JSC 库/config 与上游 ICU, 新 WebKit/ICU 构建数为 0.
  [新独立候选锁](../tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-candidate.lock.json)
  绑定源、库、日志和最终 link/map/strip. 原九补丁 candidate.lock.json 与 baseline 锁未修改;
  原 baseline 构建缺失的退出码仍为 null, 不被本次两个 actual exit 0 取代.
- 新同一主/测试 APK 在 native x86_64 API 36 的 4 KiB/16 KiB 用户页各过两轮:
  原八项 Binder 32/32, 原七模式压力 28/28. 原 fixture、压力语义校验器与预算未改, 设备套件无失败/重试.
  APK 77 输入逐项匹配 `5738129`; 已测试 APK 与内嵌 receipt 保存在本机 `tested-apks` 子目录.
  归档发生在最终 changelog 生成之前, 后续文档 APK 不替代已测试的精确字节.
- x86 16 KiB 为用户空间页 ABI 模拟, 两台 shell smaps 内核/MMU 页仍为 4 KiB.
  verified x86 ELF 没有通过可用的 ARM bridge 执行. 本轮没有三星、ARM64 或 API 28-32 新观测.
- 四次 runner 的主/测试包卸载、所有 execution UID 清零; 16 KiB 两个测试 UID 另行捕获并清零,
  4 KiB 未单独捕获测试 UID. 仅关闭本轮 owned AVD 5580/5582, 事先核对精确名称.
  原有 5554 在最后仍在线; 5560/5562 已不在 ADB 列表中, 未对它们发出控制命令.
  一个额外收尾库存断言因此退出 1, 原失败/脚本摘要和已落盘清理快照独立保留;
  只恢复聚合 receipt, 没有重跑设备套件或重启 AVD. 不推断原有清单变化的原因.
- Node 189/189, 文档 generator/check 与 Python 11/11, 生产标准四 Gradle 检查及 IDE build 通过.
  生产 JVM 任务使用已有 8 项 UP-TO-DATE 结果, IDE 仅既有 SDK XML/Bundle.get 警告.
- [排错指南](troubleshooting.md) 及十语言 FAQ/当前 changelog 已同步. 无 push/Release.

## 下一轮与三星接入约定

这些有限套件不关闭完整 syscall/API/FD/OEM、FD70000/UNSHARE/watch/reload、长时压力/性能
或签名 APK/同 Release 对应源码门槛. baseline 十补丁仍是七环境 434/434 探针与 112/112 Binder;
新 JSC 32/32、28/28 分开计数. M9 的完整兼容矩阵生成器与用户错误文案审计仍未完成.
官方 API 33+、payload/supervisor/真实 service/AAR 和 `distributionReady=false` 均不变.

用户要求一次会话尽量推进多个有边界的小节. 如需三星, 在过程中明显说明具体型号/API/页大小,
给出 **10 分钟** 等待窗口, 期间定期轮询 `localhost:50781`.
本轮未发出三星请求, 当前无待答设备窗口; 不假定旧会话设备仍满足新的需求.
保持 noreply 提交身份, 不自行委派 agent.

下方为此前已完成的 baseline/Samsung 阶段, 保持各自来源和历史边界.

## 此前: 十补丁构建恢复与七环境原套件回归完成

更新: 2026-09-13 (Asia/Shanghai). 当前实验 revision 为 `1.4.0+a9c76a599`.
**已有 native 成品的构建完成证据已恢复; 五个本地与两台三星共七环境原套件回归通过.**

先完整阅读根 `AGENTS.md`、本文件和仓库外的
`E:/.codex-tmp/bun-signal-trace-20260913/SESSION_HANDOFF.local.md`.
本机记录包含 SDK/JDK、设备序列号、原构建/测试目录、精确命令和日志.
恢复时先检查 Git、实际进程与日志, 不重启 native 构建或重做已完成的 SIGSYS 诊断.

## 用户要求与边界

- 继续 Roadmap, 保留接手时已有的十补丁修改. 本次工作起点是 master 的
  `db12fb904c2a213cd80709ce990b5a7a7d956044`; 之前独立诊断提交 `0bc66d6` 保持不变.
- 官方 Bun `34cbb9a40b4bd1bd767d134a7065e66c2432a676`、产品 API 33+、官方 variant、
  payload、supervisor、生产 service 与共享 AAR 均不变. 实验 `distributionReady=false`.
- 仅 ARM64/baseline x86_64, 只读 nativeLibraryDir 中的 PIE; 单源码/no-install/无相对工程导入/
  无 AutoJs6 globals 或 Java bridge/有界输出与生命周期约束不变.
- 不自行委派子智能体. 使用 noreply 作者邮箱 `30370009+SuperMonster003@users.noreply.github.com`.
  本次没有改写历史、push 或发布. 对应源码与 APK 分离、同一 Release 的 draft-first 技术验证规则不变.
- 用户已依次提供 Samsung SM-F936U API 32 / 4 KiB 和 SM-A566B API 36 / 原生 ARM64 16 KiB.
  2026-09-13 08:55-09:05 的同批三个 APK 回归全部通过, 清理后已告知可结束租用.
  前一阶段用户要求的 Gradle ZIP 下载和缓存修复已完成, 不再重复处理.

## 新 native 与构建恢复

- 十补丁 head `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`,
  tree `cb762d12f6959834517c79f01f4c538346990962`.
- patch 10 仅在 Android pidfd_open shim 增加 19 行: 查询调用线程 mask;
  SIGSYS 被屏蔽时直接 ENOSYS, 走既有 sticky waiter fallback. 不改变 mask/pending,
  不预热 waiter, 不修改 Linux rustix 或前九补丁.
- 原两个 Docker 容器/工具 session 已结束且不可恢复; Windows 日志只捕获了部分编译过程.
  两个独立 clean checkout 的四个完整成品已存在, 头/tree 正确, Ninja 日志有最终 link/map/strip 边.
- **没有重新编译 Bun/WebKit. 原构建驱动退出码没有保留下来.** schema 2 明确记录
  `bothRunsExitCode=null`; 使用同一锁定容器、额外只读挂载 Bun checkout 的四次 `ninja -n`
  均为 `no work to do`, exit 0. 验证器绑定四个 run/ABI、源码/输出摘要、日志和最终边,
  不把 dry-run 退出码冒充原构建 exit 0.
- 每 ABI 两份产物逐字节一致, 完整 ELF 审计和至少 16384-byte PT_LOAD alignment 通过:

| ABI | bytes | SHA-256 |
|---|---:|---|
| arm64-v8a | 87923328 | `96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f` |
| x86_64 | 90449744 | `c37f8b09ed8d4551709627292ef7770832c2568f70dcb22fe75341780e05fcde` |

- 新产物另存原 WSL 根目录下的 `blocked-pidfd-evidence/run-1` 和 `run-2`,
  不覆盖历史九补丁或官方 payload. 当前 runtime evidence/锁/验证器/对应源码绑定已同步,
  `runtimeProduced=true`, `distributionReady=false`; 完整 `verifyExperiment` 通过.
- 十补丁确定性重放、upstream prefix 等价和 28 个 source blob 通过;
  精确 Bun archive 与完整 WebKit source closure 通过. 精确生产函数的十个 host subtest
  在锁定禁网容器中通过; 最初普通 WSL 缺少 cc 的失败日志保留, 当次没有执行测试.
- [独立构建证据](compatibility/2026-09-13-m2-blocked-pidfd-runtime-evidence.json)
  和 [本轮完整说明](compatibility/2026-09-13-m3-blocked-pidfd-fix.md) 可直接复用.

## 三星补充回归已完成

本轮从 master `df186ec54c2843c3eaa4847b7940accf520b8722` 的干净状态接续,
复用相同 ARM64 native/probe APK. 只在 API 32 之前重打包一次 Binder 主 APK,
75 个输入逐项匹配该提交; 两台三星使用相同主/test APK. 本轮没有重编译 Bun/WebKit.

| 设备 | 实际 API | native ABI | 页大小 | 原 31 项两轮 | 原八项 Binder 两轮 |
|---|---:|---|---:|---:|---:|
| Samsung SM-F936U | 32 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Samsung SM-A566B | 36 | arm64-v8a | 16384 | 62/62 | 16/16 |

两台 bridge=0, SM-A566B shell smaps 的 KernelPageSize/MMUPageSize 都是 16 kB.
无失败/重试, 八个 blocked-async / 24 个 child 观测、16 个 hard-limit / 16 个 spawn API 检查、
八个 soft-limit 和十二个 forcible lifecycle (301-306 ms) 通过, 另有二十条 Binder lifecycle.
三个包每台都卸载, 两个执行 UID 每台都归零; API 36 还单独捕获并核对 test UID,
API 32 没有第三个 UID 的独立记录. 没有操作 AVD, 期间接入的 emulator-5560 也不是本轮所有.

分别见 [API 32](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md) 和
[原生 ARM64 16 KiB](compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md) 的说明与四份 JSON.
与下方本地历史分批累计, 七个 native 环境 **434/434 探针、112/112 Binder**,
其中六个 4 KiB 和一个 ARM64 16 KiB; 31 定义/fixture/validator/预算均未改变.
本机详细路径、同批 APK 快照和清理记录在 `samsung-20260913/` 下, 已更新本机交接.

## 本次三星阶段的归档与最终验证

- 四份新 probe/Binder JSON 通过原严格归档器和语义验证器. 原 31 定义与 probe APK
  逐项匹配此前五环境批次; Binder 的 75 个输入逐项匹配 Git 基点 `df186ec`, 八个方法不变.
  [设备观测补充](compatibility/2026-09-13-m3-blocked-pidfd-samsung-device-facts.json)
  另存页大小和独立 UID/卸载记录原文与摘要, 绑定四份套件归档; API 32 第三个 UID 缺口明确保留.
- 十语言 changelog 源已更新, 36 个 Markdown 产物按生成器同步; --check 和 11/11 Python tests 通过.
- 生成资源后的生产四项标准 Gradle 检查 BUILD SUCCESSFUL, 46 秒,
  96 tasks / 49 executed / 47 up-to-date. runtime/16 KiB ELF 与 ZIP gate、单元测试、
  AndroidTest 打包及 lint 通过; `testDebugUnitTest` 本次使用既有成功结果 (UP-TO-DATE).
- IDE 增量构建直接返回 `isSuccess=true`, 没有超时; 保留一个 SDK XML 版本读取 warning.
  日志和工具原响应保存在本机 `samsung-20260913/production-verification.log` 与 `ide-validation.json`.
  这些生产验证不替代上方实际设备测试的 APK 快照, 没有重复 native 构建或设备执行.

## 此前五个本地环境的独立批次

原 31 定义仅改预期 revision, fixture/Java instrumentation/语义 validator/资源预算均不变.
每个环境均运行两轮完整 31 项 probe 和两轮原完整八项 Binder:

| 设备 | API | native ABI | 页大小 | probe | Binder |
|---|---:|---|---:|---:|---:|
| Sony G8441 | 28 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 62/62 | 16/16 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 62/62 | 16/16 |
| sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 | 62/62 | 16/16 |
| 合计 | | | | **310/310** | **80/80** |

20 个 blocked-async / 60 个 child 观测、40 个 hard-limit / 40 个 spawn API 检查、
20 个原 soft-limit 和 30 个强制生命周期 (301-307 ms) 通过. Binder 有 50 条生命周期记录.
探针 [源码/APK/raw/cleanup 归档](compatibility/2026-09-13-m3-blocked-pidfd-fix.json)
与 [Binder 归档](compatibility/2026-09-13-m3-blocked-pidfd-binder.json) 分开.

API 28 首次 Binder 批次第一轮 8/8, 第二轮测试开始前 ART 的 ADB-JDWP 线程 SIGSEGV,
不计入上述成功数. [失败批次与 owned-process crash](compatibility/2026-09-13-m3-blocked-pidfd-binder-startup-failure.json)
独立保留; 相同 APK/设置在新目录重跑两轮后 16/16. 没有伪装为 pidfd SIGSYS 或修改测试绕过.

所有包卸载后 UID 进程为零. 仅关闭本轮启动的 API 33 AVD (原端口 5560);
原有/无关设备未干预, 用户 AutoJs6 未卸载. 已验证 probe APK 可原样复用.
该本地 Binder APK 快照保存在 `ten-patch-tested-binder-apks/`. 三星前已按需要重打包一次
opt-in APK, 其同批主/test/receipt 另存 `samsung-20260913/tested-binder-apks/`.
此后文档更新产生的 APK 不替代已接受批次, 不重新构建 native 或重跑已完成设备回归.

## 前一阶段验证与本机 Gradle 恢复

- 全部 Node tests **187/187**; Markdown generator 写入与 --check 通过,
  Python generator tests **11/11**. 当前 source/runtime/corresponding-source 验证通过.
- 官方 runtime/supervisor 验证通过. 生产标准四项 Gradle 任务
  `:app:testDebugUnitTest :app:verifyDebugApkRuntimeIntegrity :app:assembleDebugAndroidTest :app:lintDebug`
  在缓存修复前 BUILD SUCCESSFUL (96 tasks, 92 executed, 4 up-to-date).
- 用户报告 `E:/.gradle/caches/9.5.0` 部分内容误删. 已重新下载官方 Gradle 9.5.0 ZIP,
  140319124 bytes, SHA-256 `553c78f50dafcd54d65b9a444649057857469edf836431389695608536d6b746`;
  官方 checksum、ZIP CRC 和现有安装全部 683 个文件比对通过.
- IDE 先后遇到缺失的 instrumentation 分析与占用中的 foojay transform. 等其他项目构建成功、
  全部 9.5.0 daemon 空闲后停止它们, 将版本缓存移到本机 `gradle-cache-repair` 下保留备份并重新生成.
  修复后的生产四任务再次 BUILD SUCCESSFUL (4m 9s, 96 tasks / 92 executed / 4 up-to-date).
  IDE 工具等待 60 秒超时; 同一批实际 Gradle 构建随后分别在 2m 29s 和 2m 52s 成功结束,
  分别为 6 tasks 全部 up-to-date 和 40 tasks / 36 executed / 4 up-to-date.
  成功日志与原失败/超时结果在本机分别保存; 未再出现上述缓存错误.

## 恢复后的下一步

1. 十补丁已有构建取证、五个本地环境及两台三星的原套件回归均已完成, 不重做 native 构建或诊断.
   先核对 Git 最新提交和本机最终记录; 新文档 APK 不能替代已绑定的测试 bytes.
2. 独立大页 JSC 候选仍基于九补丁. 如继续该门槛, 需单独对齐十补丁并取得新的构建/设备证据;
   不能仅改候选锁或用历史 x86 16 KiB Binder/pressure 成绩验收新源码.
3. 扩展 syscall/API/FD/OEM、Android FD 70000、UNSHARE、watch/reload、其他线程/信号边界、
   长时压力与签名 Release / paired APK-source 发布继续开放. 当前声明仅覆盖原 31 项和八项 Binder.
4. 官方 native x86_64 16 KiB 门槛与独立 JSC 候选分开. 本次三星通过不代表一般端到端 16 KiB 支持,
   不改变官方 API 33+、payload 或 distributionReady=false.

所有九补丁及此前十补丁的失败/成功报告保持历史原样, 新设备结果另档.
