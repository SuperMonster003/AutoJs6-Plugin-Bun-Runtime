# M3 watch/reload 有界诊断观察

2026-09-13, 从项目 `7040456` 继续. 本轮给独立信号观察器增加 SIGABRT 只读快照,
并在 Sony G8441 / API 28 和 Sony XQ-AT72 / API 31 的原生 ARM64 / 4096-byte
页环境运行固定 watch native/TRAP plain/traced 对照. 原十三补丁 native、35 项定义、
watch 源码、语义校验器和预算保持不变. 没有重复执行整个 baseline 套件.

两环境各两轮, 共 8 次 plain 和 8 次 traced 观察全部完成两次真实重载、三个镜像:
32 次重载、48 个镜像的 FD/PID/stdio/普通 SIGSYS 断言通过. 8 次追踪直接观察到
24 个 SI_TKILL, sender PID/UID 与 watched 主线程匹配. API 28 的 raw 信号来自
close_range/pidfd_open/statx, TRAP 模式另有固定 prctl marker; API 31 则为
close_range 与 TRAP marker. 这只是 siginfo syscall 观察, 不外推完整高层 API 覆盖.
其余 close_range TID 来自观察器的 kernel-attached tracees, 没有捕获完整线程亲缘链.

同一个 APK 绑定 37 项 canonical 输入, 使用原两份已验证 ARM64 Bun 和锁定监督器.
新增观察器由固定 NDK 29.0.14206865 编译两次, 字节一致; ELF、签名、ZIP 与安装后
三份 payload 摘要均核对. 两台设备分别安装到 UID 10774 和 15132, 两轮间停止并
重建进程, 卸载后 UID 进程均为零. 默认 ADB 未重启, 没有 AVD 或三星设备操作.
[完整源/APK/raw/清理绑定](2026-09-13-m3-watch-reload-trace.json).

SIGABRT 停点最多采集两次, 只读寄存器、最多八个 frame-pointer 地址候选、映射、
线程/内存与进程数量限制事实. 读取失败、映射扫描上限及路径可能截断均明确记录.
不写寄存器/掩码, 不修改 syscall 结果或信号交付, 不把地址候选当完整调用栈.
原观察器 12 秒、256 事件、32 个 SIGSYS 预算及 fixture 的 6 秒/输出预算保持原样.
Linux x86_64 对照直接编译实际 C, 五种已有 SIGSYS plain/traced 情形和新 SIGABRT
plain/traced 情形均保留原结果并回收子进程; 新 fatal control 记录 exit 134、映射与资源.
最初测试因固定镜像 Python 3.8 不支持 `str.removeprefix` 失败, 改为保留前缀断言的
切片后通过. [独立工具与驱动检查点](2026-09-13-m3-watch-reload-trace-checkpoint.json).

本轮没有发生 Android SIGABRT, 因而没有新 Android 崩溃栈或失败时资源快照.
原 [69/70 中止](2026-09-13-m3-watch-reload-api28-abort-failure.json) 和 clone EAGAIN
保持原样; 不能确定具体调用链或资源上限, 也不将未复现等同于稳定性证明.
原始失败根因仍是待办, 这 16 次观察增加 **零** baseline 兼容通过数.
Baseline 仍为八环境 560/560 probes、128/128 Binder; JSC、扩展运行时与 Release
门禁分别保留, 官方 Android 13 支持、native 字节和 `distributionReady=false` 不变.
