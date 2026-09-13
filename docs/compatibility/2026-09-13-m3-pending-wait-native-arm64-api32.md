# M3: 十二补丁运行时的 Samsung 原生 ARM64 API 32 回归

设备执行时间: 2026-09-13 19:28:40-19:31:00, Asia/Shanghai. G2, test-only.
Samsung Galaxy Z Fold4 SM-F936U / API 32 / 原生 ARM64 / 4 KiB 使用十二补丁
`1.4.0+06e518f73` 通过两轮原 33 项应用探针 **66/66** 和两轮完整八项 Binder
**16/16**. 两个 runner 实际退出码均为 0, 无测试失败, 跳过或重试.
与此前[Samsung API 36 硬件 16 KiB 批次](2026-09-13-m3-pending-wait-native-arm64-api36.md)
复用完全相同的三个测试 APK 和原生字节, 没有为本次设备测试重新构建它们.

## 实际设备身份

| 字段 | 实际结果 |
|---|---|
| model | Samsung SM-F936U |
| API | `32`, 对应 Android 12L |
| primary ABI / kernel machine | `arm64-v8a` / `aarch64` |
| application page size | `4096`, shell getconf 与两套应用内 sysconf 一致 |
| shell smaps | KernelPageSize 和 MMUPageSize 均为 `4096` bytes |
| native bridge | `0` |
| kernel | `5.10.81-android12-9-25063374-abF936USQS4AVII` |
| fingerprint | `samsung/q4qsqw/q4q:12/SP2A.220305.013/F936USQS4AVII:user/release-keys` |

用户确认新设备已连接, 既有 RDB 仍监听 `localhost:49909`. 安装前重新读取全部身份字段,
不依据远程界面的 Android 12 展示标签推断 API. 探针在普通应用 UID 10328 执行,
Bun 位于只读 nativeLibraryDir. [设备补充 JSON](2026-09-13-m3-pending-wait-native-arm64-api32-device-facts.json)
绑定页大小原始观测, APK/source 和清理记录. 本轮无 AVD 操作.

## 保持原定义的两套回归

[探针 JSON](2026-09-13-m3-pending-wait-native-arm64-api32-probes.json)保留原 33 个定义,
30 个输入及两轮 instrumentation 和语义验证结果. 完整 build, inputs, probes 与先前
五环境及三星 API 36 批次相同; 十五个 fixture/validator/Java 输入和资源预算均不变.

- pending-async native/TRAP 两模式各两轮, **4/4** 个模式和 **12/12** 个 child 观测通过.
  每次十个检查点均保持 pending=1, delivered=0, 合计 **40 个保持检查点**.
  三个 child 全部退出后才恢复 mask, 随后恰好投递一次, delivery TID 等于原 caller PID.
  caller mask, 子进程身份/FD/回收断言均保持原样, 未提前清空 pending 或预热 waiter.
- 原 blocked-async 模式 **4/4**, child 观测 **12/12** 通过.
- hard-limit 四模式各两轮 **8/8**: FD 256 在 soft/hard 从 `32768/32768` 降为
  `128/128` 后保留, 恢复硬上限返回 EPERM. 四次同 PID startup 标记 CLOEXEC;
  四次 spawn 检查两个非 Bun 子 API, 共八个 FD/limit 结果通过. Java/supervisor 上限不变.
- 原 soft-limit 用例 **4/4**, forcible lifecycle **6/6**, 请求终止至 supervisor 退出
  **301-302 ms**, 相关进程与目录清理通过.
- 原目录服务, 离线 lchmod CLI 和 raw syscall 控制保持通过. raw openat2 在 filter 前
  已返回 ENOSYS, 不计为首次高层 EIO/TRAP 触达, 不推断所有高层 fallback 均已验收.

[Binder JSON](2026-09-13-m3-pending-wait-native-arm64-api32-binder.json) 使用真实生产 service,
精确 API AAR, 原八个方法及实际签名权限, 两轮完整 **16/16**.
发现/元数据/预热, JS/TS 与样例, 流式输出, 无效请求, 超时, 取消, 输出限制,
重复绑定/进程重建和 Wake 契约通过.
十条生命周期记录均为 reaped=true, exit 137, workspaceRemoved=true:
六次 CANCELLED 306-318 ms, 两次 OUTPUT_LIMIT 808/818 ms, 两次 TIMEOUT 3304/3305 ms.
这些是整个执行的 durationMillis, 与探针的纯终止耗时分开, 均在原 5000 ms 预算内.

## 与 API 36 完全相同的源码和 APK

native head `06e518f73b4fccc6c3ffb17412ea166bf886bed0`, tree
`1eb8d5ea945001f018bdf14bd00c261d40b02573`; ARM64 Bun 87923328 bytes,
SHA-256 `86d1b4d0fd74591655bc55e55f90ec75c7d3a0aba2116200be419ae626ed53d6`.
supervisor 7440 bytes, SHA-256 `25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537`.
原[双 ABI 构建证据](2026-09-13-m2-pending-wait-runtime-evidence.json)保持原样.

| 实际复用的 APK | bytes | SHA-256 |
|---|---:|---|
| 33 项 ARM64 probe | 35292869 | `350d70bb5f655a0e79a8abe060c7110fcb41c1ecbb26901897aed68fb3b0a1fe` |
| Binder ARM64 主包 | 41094595 | `f2591f13cdf0d7af9cc28e00bc09e3a43d3ab0f5f930941578b3bace08051a1c` |
| Binder androidTest | 2373108 | `1435ebfe888ce133df88ea39d230899298a0fb66fe7d9773956fe6e2b0c9b8a0` |

Binder 的 81 个编译输入逐项匹配 Git `dbd0fde638816bceb4ab759d6e0750aa51e34a55`.
其完整 build, 两个 APK, payload 和签名记录均与 API 36 批次相同.
runner/archiver 从该匹配 detached worktree 执行, 当前主目录的 JSC 83 输入 profile
未用于放宽旧 APK 校验. 本次归档项目基点为 `0fba050`, 与设备 APK 编译基点明确分开.
安装字节, 签名, ABI payload, 摘要及原 ELF/ZIP 对齐门禁通过, 未重建 Bun/WebKit/ICU.

## 前置记录与清理

首次本机启动 helper 的路径替换未匹配, 独占创建日志时因旧文件存在而在 server 启动前拒绝;
没有覆盖上一阶段任何输出. 新 helper 修正为独立目录, 连接初次显示 unauthorized.
请求 USB 调试授权后, 实际 get-state/身份检查成功才安装测试包.

两套测试分别于 19:29:39 和 19:31:00 完成独立 postflight.
三个包 `.api28probe`, `.api28binder`, `.api28binder.test` 全部卸载,
三个在安装期间分别捕获的 UID **10328/10329/10330** 均为零进程, 无 pm path.
已通知用户可以结束设备租用, 没有启动或停止任何 AVD.

关闭本轮私有 ADB 5039 时, 原 helper 在确认端口已不存在的查询中得到 PowerShell exit 1,
导致关闭记录尚未写回, 首次补充 collector 因此在写文件前拒绝. 后续只读查询确认监听和
owned PID 均消失; 未再次发出 kill-server, 未连接或操作设备. 原 helper 失败和缺失的
stop-command 退出码保留为独立记录/null, 不将恢复查询退出码当作原关闭命令退出码.
已有 5037 server 未受操作. 这些本机前置/记录问题不增加或扣除设备套件的通过数.

## 当前累计与剩余范围

两台三星使用同一组三个 APK, 合计 **132/132 探针, 32/32 Binder**;
包括八个 pending 模式, 80 个保持检查点, 24 个 child 观测,
16 个 hard-limit/16 个 spawn API 检查, 八个 soft-limit 和十二个 forcible lifecycle.
与[先前五个原生 4 KiB 环境](2026-09-13-m3-pending-wait-fix.md)分批合计,
十二补丁 baseline 现为 **七个原生环境, 462/462 探针, 112/112 Binder**:
ARM64 API 28/31/32/33/35 和 x86_64 API 33 的 4 KiB 环境, 加 ARM64 API 36 硬件 16 KiB.
累计 pending-async 28 个模式和 84 个 child 观测通过, 各 APK 编译批次分别绑定.

十二补丁原 33 项与完整八项 Binder 的三星 API 32/4 KiB 和 API 36/硬件 16 KiB
设备门禁至此补齐. 独立 JSC 候选的 x86 Binder 32/32 与压力 28/28 继续另计.
更广泛 syscall/API/FD/OEM, FD70000/UNSHARE, watch/reload, cgroup/clone3,
ARM64/长时压力及性能, 最终签名 Release 和对应源码发布门禁仍开放, `distributionReady=false`.
官方 API 33+ 下限和 payload 不变; 单源码, no-install, 无相对工程导入,
无 AutoJs6 globals/Java bridge, 有界 Binder 输出契约保持原样. 不改写任何历史接受或失败记录.

## 归档与仓库验证

新增三份 JSON 通过原严格 archiver 与独立源码/APK/设备清理核对后注册.
矩阵现为 90 份报告和 189 条记录; 87 份既有报告及注册条目逐一保持相同摘要.
21 项物理构建输入, 全部 native 锁, production service/AAR 和 fixture/validator/预算未漂移.

Node 234/234, Python 38/38, 十语言/36 生成产物和矩阵检查通过;
官方 Bun/supervisor 的摘要和 ELF 验证通过. 文档更新后的四项 production Gradle 检查
实际 exit0, 24s, 96 tasks (49 executed, 47 up-to-date), 三个 Debug APK 的 runtime/
16 KiB ZIP 门禁通过. JVM 21 项由 Gradle 判定 up-to-date, lint 0 error/44 warnings.
IDE 工具直接构建成功, 无 timeout, 报告 SDK XML 版本差异和既有 Bundle.get 弃用
两个 warning. 未修改 SDK/Gradle 环境; 这些仓库检查与固定实验设备 APK 接受分开记录.
