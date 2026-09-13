# M3: 十补丁运行时在 Samsung Fold4 / API 32 的回归

设备执行时间: 2026-09-13 08:55-08:59, Asia/Shanghai. G2, test-only.
实验 Bun `1.4.0+a9c76a599` 在 Samsung SM-F936U 上通过两轮原 31 项应用探针
**62/62** 和两轮原完整八项插件 Binder 套件 **16/16**. 本批没有失败、跳过或重试.
这是十补丁新 bytes 的实际结果, 不转移九补丁的历史验收.

## 设备与执行域

| 字段 | 实际结果 |
|---|---|
| model | Samsung Galaxy Z Fold4 SM-F936U |
| API / release 字符串 | `32` / `12` |
| primary ABI / kernel machine | `arm64-v8a` / `aarch64` |
| page size | `4096`, shell getconf 与应用 Os.sysconf 一致 |
| native bridge | `0` |
| kernel | `5.10.81-android12-9-25063374-abF936USQS4AVII` |
| fingerprint | `samsung/q4qsqw/q4q:12/SP2A.220305.013/F936USQS4AVII:user/release-keys` |

用户预约的 RDB 端口为 50781. 网站/系统的 Android 12 显示字符串不能代替 API 硬断言;
两套 runner 和 instrumentation 都验证实际 API 32 与页大小. shell 自身 smaps 也观察到
KernelPageSize/MMUPageSize 均为 4 kB. 没有 ARM 翻译、系统升级、root 或页大小修改.
应用探针在普通 UID 10328、`untrusted_app` 域和 seccomp=2 下执行, 并非 adb shell 直接执行 Bun.

## 原套件的回归结果

[应用探针 JSON](2026-09-13-m3-blocked-pidfd-native-arm64-api32-probes.json) 绑定
两个原始 instrumentation 文本、31 项定义、28 个源码输入、APK/payload 与清理记录.
原 fixture、语义 validator、输出/时间/FD 预算及 recovery-last 顺序保持不变.

- blocked-SIGSYS 异步 native/TRAP 两模式各两轮, **4/4** 个语义记录和 **12/12** 个
  child 观测通过. 同一 caller TID 的完整 blocked mask 在三个子进程退出前保持不变,
  子进程 mask/UID/parentage、正向输出、FD 256 隔离和退出回收均通过; 之后才恢复原 mask.
- 四个 hard-limit 模式各两轮, **8/8**. FD 256 高于降低后的 soft/hard `128/128`,
  恢复硬上限得到 EPERM; 四次同 PID startup 保留并标记 CLOEXEC, 四次 spawn 中两个
  非 Bun 子 API 共八项哨兵隔离检查通过. Java/supervisor 上限保持 `32768/32768`.
  本设备 native raw close_range 在测试 filter 前已返回 ENOSYS, 不声称内核原生支持该调用.
- 原 soft-only 用例 **4/4**, 强制生命周期用例 **6/6**; 从请求终止到 supervisor 退出
  **301-302 ms**, 私有目录和 child/supervisor 均回收.
- 六项 raw syscall TRAP 控制共 12 次, copy_file_range/pidfd_open 的 EIO 控制语义共四次通过.
  这不是六种调用的全部高层语义验收. raw openat2 在 filter 前已不可用, 不据此声称首次高层触达.
- 原目录约束的 48 项路径断言通过, 包含 12 次拒绝根外哨兵读取; 内部 lchmod 的固定离线 CLI
  对照和其余原 29 项也全部通过. 不扩大为普通文件 API 限制、公开 node:fs lchmod 或完整包管理器验收.

[Binder JSON](2026-09-13-m3-blocked-pidfd-native-arm64-api32-binder.json) 单独记录
真实生产 service、精确共享 API AAR、原完整八个方法和实际权限/签名下的 **16/16**.
每轮之间 force-stop 并重建进程, 包括 JS/TS、样例、发现/元数据/预热、流式输出、
无效请求、超时、取消、输出限制和 Wake 契约. 十条生命周期诊断均为 reaped=true、
exit 137、workspaceRemoved=true: 六次 CANCELLED 为 308-313 ms, 两次 OUTPUT_LIMIT
为 812/815 ms, 两次 TIMEOUT 为 3303/3304 ms. 这些是整个执行的 durationMillis,
不是上文的纯终止耗时, 均满足既有 5000 ms 上限.

## 字节、源码与 APK 输入批次

native head 为 `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`,
ARM64 Bun 87923328 bytes, SHA-256
`96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f`.
supervisor 7440 bytes, SHA-256
`25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537`.
本轮复用已有两个独立 native 成品, 没有重新编译 Bun/WebKit 或新增 clean-build 证据.
原驱动退出码缺失和只读恢复检查仍按[原构建记录](2026-09-13-m2-blocked-pidfd-runtime-evidence.json)保留.

| 实际测试 APK | bytes | SHA-256 |
|---|---:|---|
| 原 31 项 ARM64 probe | 35284523 | `d10a3b2db85e1fe59bfb367df29332f5c972c43c2b740e9060bc79b4a1caec3f` |
| Binder ARM64 主包 | 79090487 | `8e80a900f78856dcbbf277b712054c6196cecb25a64f25b7a4edaf9910ec6cda` |
| Binder androidTest | 2403209 | `5d44a9ccac498765497a6d3333fb5300ba99e8895f080b5fa4cc92e5ff55469a` |

probe APK 与此前五环境报告完全相同. Binder 主包重新打包以绑定项目提交
`df186ec54c2843c3eaa4847b7940accf520b8722` 的 75 个输入; 实际 service 和八个测试方法不变.
打包 49 秒, 80 tasks / 6 executed / 74 up-to-date, 双 ABI native 及 16 KiB ELF 对齐核验通过.
安装前签名、单 ABI 内容和 ZIP 对齐通过, 安装后的主/测试 APK 摘要分别匹配.
新的输入批次与此前本地 Binder 批次分开记录, 后续文档生成的 APK 不能替代上表 bytes.

## 清理与累计范围

三个 test-only 包 `.api28probe`、`.api28binder`、`.api28binder.test` 均卸载,
独立 postflight 确认都没有 pm path. 两个实际执行 UID 10328/10329 均无残留进程;
androidTest 包的独立安装 UID 没有另行捕获, 不声称对第三个 UID 单独取证.
[独立设备观测补充](2026-09-13-m3-blocked-pidfd-samsung-device-facts.json) 保留当时页大小与
postflight 的结构化记录原文及摘要, 并绑定两台设备的四份套件归档.
没有启动或关闭 AVD, 预先在线的 emulator-5554 和其他物理设备未受测试操作影响.
清理后已通知用户可以结束本台租用并切换下一台设备.

与此前[五环境十补丁报告](2026-09-13-m3-blocked-pidfd-fix.md)分批合计,
同一 native revision 的原 31 项套件在六个原生 4 KiB 环境通过 **372/372**,
完整八项 Binder 通过 **96/96**, Binder 的 APK 输入批次分别绑定.
本报告补齐十补丁 API 32 ARM64 的这两套现有测试, 不提供其原生 ARM64 16 KiB、
x86 16 KiB、大页 JSC rebase、完整 syscall/API/FD/OEM、长时压力或 Release 验收.

官方 API 33+ 产品下限、官方 Bun/supervisor、native 锁和 `distributionReady=false` 不变.
单源码/no-install/无相对工程导入/无 AutoJs6 globals 或 Java bridge/有界 Binder 输出和
只读 nativeLibraryDir 中执行 PIE 的契约不变. 所有历史成功与失败报告保持原样.
