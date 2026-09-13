# M3/M5: 十二补丁运行时的 Samsung 原生 ARM64 16 KiB 回归

设备执行时间: 2026-09-13 19:01:30-19:03:42, Asia/Shanghai. G2, test-only.
Samsung SM-A566B / API 36 / 原生 ARM64 / 硬件 16 KiB 使用十二补丁
`1.4.0+06e518f73` 通过两轮原 33 项应用探针 **66/66** 和两轮完整八项 Binder
**16/16**. 两个 runner 实际退出码均为 0, 无测试失败, 跳过或重试.
三个测试 APK 和 native 成品均直接复用此前已验证的快照, 本轮没有重新构建它们.

## 实际设备身份

| 字段 | 实际结果 |
|---|---|
| model | Samsung SM-A566B |
| API | `36` |
| primary ABI / kernel machine | `arm64-v8a` / `aarch64` |
| application page size | `16384`, shell getconf 与两套应用内 sysconf 一致 |
| shell smaps | KernelPageSize 和 MMUPageSize 均为 `16384` bytes |
| native bridge | `0` |
| kernel | `6.6.77-android15-8-abA566BXXU6BYIF` |
| fingerprint | `samsung/a56xnaeea_16kb/a56x:16/BP2A.250605.031.A3/A566BXXU6BYIF_OXM6BYIF:user/release-keys` |

用户提供 RDB/ADB `localhost:49909`, 安装前重新读取型号, API, ABI, 页大小与 bridge.
探针运行于普通 UID 10320, `untrusted_app` 域和 seccomp=2, Bun 从只读
nativeLibraryDir 执行. [设备补充 JSON](2026-09-13-m3-pending-wait-native-arm64-api36-device-facts.json)
绑定原始 smaps 摘要. 这是 ARM64 硬件页证据; 十二补丁大页 JSC 的 x86 用户页模拟批次另计.

## 未改变的探针和 Binder 套件

[探针 JSON](2026-09-13-m3-pending-wait-native-arm64-api36-probes.json) 保留原 33 个定义,
30 个输入, 两轮原始 instrumentation 和原语义验证结果. 与此前五环境归档逐项比较,
完整 build, inputs, probes 均相同; 十五个 fixture/validator/Java 输入及原预算未改变.

- pending-async native/TRAP 各两轮, 共 **4/4** 个模式和 **12/12** 个 child 观测通过.
  每次十个检查点均为 pending=1, delivered=0, 合计 **40 个信号保持检查点**.
  等三个异步 child 退出后才恢复 mask, 之后恰好交付一次, delivery TID 均等于原 caller PID.
  未提前清空 pending, 未预热 waiter, 完整 caller mask 和子进程身份/FD/回收断言保持原样.
- blocked-async 原模式 **4/4**, child 观测 **12/12** 通过.
- hard-limit 四模式各两轮 **8/8**. FD 256 在 soft/hard `32768/32768` 降为
  `128/128` 后保留, 恢复硬上限返回 EPERM. 四次同 PID startup 标记 CLOEXEC,
  四次 spawn 检查两个非 Bun 子 API, 共八个 FD/limit 结果通过.
  本设备 native raw close_range 成功, 强制 TRAP 模式正确回退; Java 与 supervisor 上限不变.
- 原 soft-limit 用例 **4/4**, forcible lifecycle **6/6**, 请求终止至 supervisor 退出
  **301-304 ms**, 相关进程和目录清理通过.
- 原目录服务路径和 lchmod 离线 CLI 对照通过. raw openat2 在 filter 前已不可用,
  不计为首次高层 EIO/TRAP 触达, 也不据 raw 控制推断所有高层 syscall fallback 通过.

[Binder JSON](2026-09-13-m3-pending-wait-native-arm64-api36-binder.json) 使用真实生产 service,
精确 API AAR, 原八个方法, 实际签名权限和两轮进程重建, 共 **16/16**.
发现/元数据/预热, JS/TS 与样例, 流式输出, 无效请求, 超时, 取消, 输出限制和 Wake 契约通过.
十条生命周期记录均为 reaped=true, exit 137, workspaceRemoved=true:
六次 CANCELLED 307-317 ms, 两次 OUTPUT_LIMIT 813/814 ms, 两次 TIMEOUT 均 3304 ms.
这里是整个执行的 durationMillis, 与探针的纯终止耗时分开; 均在原 5000 ms 预算内.

## 固定源码和复用的 APK

native head 为 `06e518f73b4fccc6c3ffb17412ea166bf886bed0`, tree 为
`1eb8d5ea945001f018bdf14bd00c261d40b02573`. ARM64 Bun 87923328 bytes,
SHA-256 `86d1b4d0fd74591655bc55e55f90ec75c7d3a0aba2116200be419ae626ed53d6`.
supervisor 7440 bytes, SHA-256 `25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537`.
原[十二补丁双 ABI 构建证据](2026-09-13-m2-pending-wait-runtime-evidence.json)独立保留,
没有重复构建 Bun, WebKit 或 ICU, 也未替换任何锁定字节.

| 实际测试 APK | bytes | SHA-256 |
|---|---:|---|
| 33 项 ARM64 probe | 35292869 | `350d70bb5f655a0e79a8abe060c7110fcb41c1ecbb26901897aed68fb3b0a1fe` |
| Binder ARM64 主包 | 41094595 | `f2591f13cdf0d7af9cc28e00bc09e3a43d3ab0f5f930941578b3bace08051a1c` |
| Binder androidTest | 2373108 | `1435ebfe888ce133df88ea39d230899298a0fb66fe7d9773956fe6e2b0c9b8a0` |

Probe APK 与此前五环境批次相同. Binder APK 是上一阶段已备妥的独立批次,
81 个编译输入逐项匹配 Git `dbd0fde638816bceb4ab759d6e0750aa51e34a55`.
runner 和严格 archiver 在该 detached worktree 执行, 未借当前主工作目录的 83 输入
JSC profile 放宽旧 APK 的 compiled-input 检查. 当前归档基点为 `d2dedb2`;
两个源码基点和 APK 批次在补充记录中明确区分.
签名, 单 ABI payload, 完整摘要与 ELF/ZIP 对齐通过既有验证器, 安装字节也已核对.

## 传输前置问题与清理

默认 ADB 5037 在安装前未能正常响应. 本轮另外启动私有 5039 server,
仅连接指定 RDB 设备并关闭 mDNS 自动连接, 未停止或修改已有 5037/5038 server.
私有 server 最初因不支持显式监听 hostname 而退出; 修正监听参数后连接一度为
unauthorized. 请求 USB 调试授权后, 实际 get-state 和设备身份检查成功才开始安装.
这些前置结果及原始摘要保留在补充 JSON, 不计为 Bun 或应用测试失败, 不推断用户具体操作.

三个包 `.api28probe`, `.api28binder`, `.api28binder.test` 均已卸载;
独立 postflight 确认无 pm path, 三个实际捕获的 UID **10320/10321/10322** 均为零进程.
probe 清理完成于 19:02:29, Binder 清理完成于 19:03:42; 已告知用户可以结束租用.
本轮没有启动, 停止或测试任何 AVD. 归档后核对私有 server PID/监听端口归属,
仅关闭本轮的 5039 server, 并确认其监听与 owned PID 都已消失.

## 当前累计与剩余范围

与[此前五个原生 4 KiB 环境](2026-09-13-m3-pending-wait-fix.md)分批合计,
十二补丁 baseline 原套件现为六个原生环境 **396/396 探针, 96/96 Binder**,
包含本台 ARM64 硬件 16 KiB. 两批 Binder 的源码/APK 绑定分别保留;
累计 pending-async 24 个模式和 72 个 child 观测通过.

这关闭十二补丁原 33 项和完整八项 Binder 的原生 ARM64 16 KiB 设备门禁.
十二补丁 ARM64 API 32 / 4 KiB 仍需新设备回归, 不转移九/十补丁成绩.
独立十二补丁大页 JSC 的 x86 Binder 32/32 和压力 28/28 不加入上述 baseline 总数.
其余 syscall/API/FD/OEM, FD 70000/UNSHARE, watch/reload, cgroup/clone3,
ARM64 压力, 长时性能以及最终签名 Release 门禁仍开放, `distributionReady=false`.
官方 API 33+ 下限和 payload 不变; 单源码, no-install, 无相对工程导入,
无 AutoJs6 globals 或 Java bridge, 有界 Binder 输出契约不变. 所有历史归档保持原样.

## 归档与仓库验证

新增三份 JSON 通过原严格 archiver 与独立源码/APK/设备清理核对后注册到兼容性矩阵.
矩阵现为 87 份报告和 187 条记录; 84 份既有报告及其注册条目逐一保持相同摘要.
21 项物理构建输入, 全部 native 锁, production service/AAR 与 fixture/validator/预算未漂移.

Node 234/234, Python 38/38, 十语言/36 生成产物和矩阵检查均通过;
官方 Bun 与 supervisor 的摘要和 ELF 验证通过. 更新文档后的四项 production Gradle
检查实际 exit 0, 用时 18s, 96 tasks (49 executed, 47 up-to-date), 三个 Debug APK
的 runtime/16 KiB ZIP 门禁通过. JVM 21 项由 Gradle 判定 up-to-date,
lint 为 0 error/44 warnings. IDE 工具直接构建成功, 无 timeout,
仅报告已有 Bundle.get 弃用警告. 这些仓库检查与上面的固定实验设备 APK 接受分开记录.
