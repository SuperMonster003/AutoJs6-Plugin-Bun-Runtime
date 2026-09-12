# M3: 硬 FD 上限的原生 ARM64 16 KiB 验证

证据日期: 2026-09-12 (UTC), G2. 独立 test-only 应用探针, 非插件 Binder 或 Release APK 验收.

## 结论和环境

Samsung Remote Test Lab **SM-A566B** 对完全相同的 ARM64 测试 APK 和原 29 项套件运行两轮, 均为 **29/29**, 合计 **58/58**. 新四种硬 FD 上限模式的 **8/8** 全部通过, 补齐它们此前缺少的原生 ARM64 16 KiB 设备证据. 不是仅复用旧 25 项通过记录, 也没有改变测试定义、夹具、校验器或资源预算. 完整原始 instrumentation、构建收据、安装后摘要与清理结果见[机器报告](2026-09-12-m3-hard-nofile-native-arm64-16k.json).

| 实测字段 | 结果 |
|---|---|
| 型号 / API | Samsung SM-A566B / 36 |
| primary ABI / kernel machine | `arm64-v8a` / `aarch64` |
| 应用 Os.sysconf / shell getconf 页大小 | `16384` / `16384` bytes |
| postflight shell smaps KernelPageSize | 全部 `16 kB` |
| native bridge | `0` |
| 内核 | `6.6.77-android15-8-abA566BXXU6BYIF` |
| fingerprint | `samsung/a56xnaeea_16kb/a56x:16/BP2A.250605.031.A3/A566BXXU6BYIF_OXM6BYIF:user/release-keys` |

运行始于 `2026-09-12T15:54:22.518Z`. 用户提供的远程通道仍为 `localhost:30008`, 但机型已从前次 Fold4 变为 SM-A566B; 以本轮实际属性和应用硬断言确定环境, 不复用通道名称推断设备. 普通 UID **10320**, SELinux `untrusted_app`, seccomp=2. ARM64 ELF 在实际 ARM64 硬件上执行, 内核页大小也为 16 KiB, 不属于 x86 模拟用户空间页或 ARM 翻译证据.

## 硬上限与原用例结果

四个固定模式均先打开非 CLOEXEC 的 FD 256, 再把 soft/hard 从 `32768/32768` 同时降为 `128/128`, 保持 FD 256 仍打开且核对哨兵 inode/device. 恢复原硬上限的尝试均以 EPERM 失败, 不能用可恢复的软上限用例代替.

- 四次同 PID/UID 启动观测确认 FD 256 保留且被标记 CLOEXEC. 四次 spawn 探针分别检查 `Bun.spawnSync` 和异步 `Bun.spawn` 的非 Bun 子进程, 共八次 API 观测, 哨兵均不被继承, 子进程 limits 均为 `128/128`.
- 与前次 Fold4 的 ENOSYS 对照不同, 本机八次原始 `close_range(fd, fd, CLOSE_RANGE_CLOEXEC)` 均成功. 夹具随后清除该标记再执行语义验证; TRAP 模式额外验证固定 ABI/BPF 和 ENOSYS 回退, 不把预先成功设置的标记当作启动回退成功.
- Java instrumentation 和 supervisor 的上限在八次观测前后均保持 `32768/32768`. 降低只发生在本轮拥有的一次性 Bun 子进程内, 未修改系统或其他应用上限. 新模式耗时 **91-265 ms**, 每项合计输出 **519-846 bytes**, 无预算放宽.
- 原有四次降低软上限并恢复的用例通过. 六次强制生命周期用例从终止请求到 supervisor 退出为 **301-302 ms**, child/supervisor 均回收, 私有目录删除.

原 25 项子集完整通过 **50/50**, 包括 12 次 raw syscall 对照、四次 EIO 控制的复制/等待探针、48 项目录路径断言 (含 12 次拒绝越界哨兵) 和 14 次固定内部 lchmod CLI 对照. raw openat2 在过滤器前仍不可用, 不声称首次高层 EIO/TRAP 触达; lchmod 的 KILL_THREAD 对照先观察 leader `Z/31`, 再回收剩余线程, 不把单独 SIGKILL 计作路径触达. 未运行完整包管理器或新增依赖安装.

## 字节绑定、归档与清理

项目基线为 `0a280c44edd2606eb1d2cf6e2b957b29944c905b`. 直接复用先前[五环境硬上限验证](2026-09-12-m3-hard-nofile.md)和[Fold4 API 32 验证](2026-09-12-m3-native-arm64-api32.md)的 APK, 没有重建该探针 APK 或重新编译 Bun、JSC、supervisor:

| 实际执行产物 | bytes | SHA-256 |
|---|---:|---|
| ARM64 test-only APK | 35280277 | `f90be0b531c510aaa983bd4cc8781a7c10d5bba616c7b1d8ff0d66c14ac6c60d` |
| 九补丁 Bun `1.4.0+7b9ac2668` | 87923320 | `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` |
| 锁定 supervisor | 7440 | `25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537` |

运行器复核完整 26 项 canonical 输入收据、临时 v2 测试签名、manifest、单 ABI 内容、ELF/ZIP 对齐、安装后 APK/payload 摘要及只读执行路径. 现有归档器重验两轮原始文本与 JSON、所有语义结果及清理记录. 三批 29 项报告的构建收据和定义完全相同, 以完整环境身份去重后累计 **七个原生环境 406/406**, 含六个 4 KiB 环境和本轮 ARM64 16 KiB 环境; 硬上限 56/56、软上限 28 次、强制回收 42 次. 未按新 UID、时间或远程端口重复计算同一环境.

本轮每次 force-stop 后及最终卸载后 UID 进程均为零. 独立 postflight 再确认 `io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe` 无包路径, UID 10320 无进程, bridge=0 且内核页大小为 16384. 未安装实验 Binder 或生产插件, 没有启动、关闭或重置 AVD, 其他设备未操作. 远程测试完成后已告知用户可以结束预约; 未代替用户操作预约账户. 本轮设备测试没有失败、skip 或重试替换报告.

## 本地验证

156 项 Node 测试、11 项 Python 文档测试、8 项 JVM 测试全部通过. 官方 Bun、锁定 supervisor、实验输入/静态运行时证据和共享 API AAR 校验通过. 新归档的 26 个 canonical 输入逐项与上述 Git 基线核对, 三批共 406 项结果均重新通过现有语义校验器, 源码/APK/定义一致且环境未重复.

十种语言的当前 changelog 已同步, 36 个 Markdown 产物通过生成和一致性检查. 生产 `:app:testDebugUnitTest`, `:app:verifyDebugApkRuntimeIntegrity`, `:app:assembleDebugAndroidTest`, `:app:lintDebug` 以 `--rerun-tasks` 执行, 96 个任务全部执行成功, 三个 Debug APK 的 payload 摘要和 ELF/ZIP 16 KiB 对齐通过. IDE 构建成功, SDK XML 版本、extractNativeLibs 和 Bundle.get 警告保留. 此处生产 Debug APK 的本地构建不同于上表复用的 test-only 探针 APK, 没有新增它们的设备或 Release 验收, 也不宣称远程 CI 或新的 native 清洁构建已执行.

## 剩余范围

四模式的原生 ARM64 16 KiB 缺口已关闭, 但这是 **FD 256 高于降低后硬上限 128** 的有界验证, 不是 Android FD 70000、超过旧 65536 扫描上界、CLOSE_RANGE_UNSHARE、watch/reload、阻塞异步 SIGSYS 或全线程/错误边界验收. 更广 syscall/API/OEM、长时压力/性能及最终签名 APK/source 发布继续单独推进.

本轮未重跑 Binder, 历史 baseline 的十二环境 192/192 不增加. 所有历史成功/失败报告、原生锁、官方 payload 和已发布资产不变; 官方仍为 Android 13 / API 33+, 实验 `distributionReady=false`. 单源码 `--no-install`、无相对项目导入、无 AutoJs6 globals、无 Java bridge、Binder 有界流式输出和可信代码而非安全沙箱的契约不变. 不将本次 test-only APK 的通过归给未接受的 Release 文件或全部端到端 16 KiB 支持.
