# M3: Android 应用子进程降低 FD 软/硬上限

证据日期: 2026-09-12. G1/G2, 独立 test-only 应用探针, 非生产或 Release APK 验收.

## 结论和实测环境

九补丁 Bun `1.4.0+7b9ac2668` 在五个原生 4 KiB 环境各两轮通过扩展后的 **29/29**, 合计 **290/290**. 原有 25 项定义、夹具字节和资源限制完全保留, 本轮只增加四个硬上限用例. 原子集通过 250/250, 新增用例通过 **40/40**. 完整原始 instrumentation、源码/APK 绑定和清理结果见[机器报告](2026-09-12-m3-hard-nofile.json).

| 设备 / AVD | API | ABI | 应用页大小 | 第一轮 / 第二轮 | 原生 raw CLOEXEC 对照 |
|---|---:|---|---:|---|---|
| Sony G8441 | 28 | arm64-v8a | 4096 | 29/29 / 29/29 | ENOSYS |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 29/29 / 29/29 | ENOSYS |
| Xiaomi / Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 29/29 / 29/29 | ENOSYS |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 29/29 / 29/29 | EINVAL |
| bun-hard-limit-api33-20260912 / sdk_gphone64_x86_64 | 33 | x86_64 | 4096 | 29/29 / 29/29 | 成功, 设置 CLOEXEC |

四台 ARM64 设备为物理设备, kernel machine 为 `aarch64`; x86 AVD 使用 Google APIs revision 17, kernel machine 为 `x86_64`, 实际安装和执行 x86_64 ELF, 不是 ARM 翻译. 内核版本依次为 `4.4.148-perf+`, `4.19.157-perf+`, `4.19.191-perf-g2f9faa927855`, `5.10.209-android12-9-00019-g4ea09a298bb4-ab12292661`, `5.15.119-android13-8-00034-gd34029c8258b-ab10871489`.

所有运行均要求普通 application UID、`untrusted_app` SELinux 域、seccomp=2 和应用内页大小为 4096. Sony API 28 不提供 shell `getconf`; 附加 postflight 首次因此退出, 没有将缺失命令算作页大小观测. 该设备页大小使用 instrumentation 的 `Os.sysconf` 硬断言, 其他四台另有 shell `getconf PAGE_SIZE=4096` 复核. 本轮没有 16 KiB 或 ARM64 API 32 设备证据.

## 四个新用例验证了什么

固定源文件 [hard-limit-probes.mjs](../../tools/bun-runtime/experimental/api28/app-probe/hard-limit-probes.mjs) 通过 `bun:ffi` 使用 libc, 不新增 native helper、依赖或 shell 命令. 每个用例启动独立、受 supervisor 管理的 Bun 进程, 不修改测试应用或系统的资源上限.

1. 要求原始 soft/hard limit 至少为 512, 本轮实际均为 `32768/32768`. 将私有哨兵文件复制到不带 CLOEXEC 的 FD 256, 并记录 raw `close_range(fd, fd, CLOSE_RANGE_CLOEXEC)` 返回值; 随后清除 CLOEXEC 再测试. 夹具只允许 FD 在 `[256,512)` 内, 不会遍历打开数万文件.
2. 在同一 Bun 进程中把 soft 和 hard **同时降为 `128/128`**. 独立核对 `getrlimit` 与 `sysconf(_SC_OPEN_MAX)=128`, 并确认已打开的 FD 256 仍然存在. 试图恢复到原硬上限必须得到 `EPERM`, 不能把软上限降低或恢复成功混入本测试. 这是一次性子进程中的不可逆降低; 非特权进程的硬上限规则、fork 继承和 exec 保留语义见 [Linux getrlimit/setrlimit 文档](https://man7.org/linux/man-pages/man2/getrlimit.2.html).
3. `startup-native` / `startup-trap` 以相同 PID/UID `execve` 安装目录内的只读 Bun, 检查启动后 FD 256 **仍然打开且已设置 CLOEXEC**, 并用 inode/device 核对原哨兵, 不依赖 Android `/data/data` 路径别名. 总计 20 次启动观测通过. CLOEXEC 表示下次 exec 时关闭, 不等于当前立即关闭; 参见 [Linux close_range 文档](https://man7.org/linux/man-pages/man2/close_range.2.html).
4. `spawn-native` / `spawn-trap` 分别用 `Bun.spawnSync` 和异步 `Bun.spawn` 启动非 Bun 的 `/system/bin/toybox` 子进程. 每个 API 都检查 stdout FD 正向对照、FD 256 不存在、子进程 `/proc/self/limits` 为 `128/128`. Bun 父进程中的 FD 仍然打开且不带 CLOEXEC. 20 次 spawn 探针包含 **40 次 API 级哨兵隔离观测**, 全部通过.

TRAP 模式只给调用线程及继承它的子进程增加固定的 ABI 检查型 seccomp 过滤器: syscall 436 和一个无效 `prctl` 标记被 TRAP, 其他调用不受本过滤器影响. 标记从 EINVAL 变为 ENOSYS, raw close_range 也返回 ENOSYS; 精确 BPF 摘要由独立校验器检查, 单元测试解释全部 0-512 号调用及错误 ABI. 20 个 TRAP 模式用例均通过; 不对已有 sibling threads 应用 TSYNC, 不宣称被阻塞的异步 SIGSYS 或所有线程默认行为已覆盖.

`native` 指未增加测试过滤器, **不表示内核的 close_range 必然可用**. 前三台 ARM64 返回 ENOSYS, API 35 返回 EINVAL, 所以它们只能支持当前原生环境下回退后的语义结论. x86 AVD 原生调用成功, 强制 TRAP 后也正确处理高于当前硬上限的 FD. 本轮没有首次高层 openat2 EIO/TRAP 触达结论.

每个新用例同时读取 supervisor 的 `/proc/PPID/limits`; Java instrumentation 在执行前后独立读取自己的 `/proc/self/limits`. 全部保持 `32768/32768`, 并与 Bun 降低前的数值一致. Android 公开 SDK 未导出所需的 `StructRlimit`/`RLIMIT_NOFILE`, 初次编译即拒绝了该写法; 最终使用有界 proc 读取, 不依赖隐藏 API、反射或提权.

## 源码、APK 和运行时绑定

原 25 项定义按紧凑 JSON 序列化的 SHA-256 保持为 `2c905e8eed2e455c1ab5324410811d6847b9f5011fdc0946776ab9445f94a270`. 四个新增项位于最终 recovery 用例之前. `fd-probes.mjs`, `syscall-probes.mjs`, `openat2-probes.mjs`, `lchmod-probes.mjs` 均未改动; 旧报告原样保留.

新的硬上限源文件为 canonical UTF-8/LF 9927 bytes, SHA-256 `564e1262654509efcf8049899eaa0ac2faf1b1ed9aae9260bdb10f49f0b86342`. 构建器只接受四个固定 ID/mode/asset 组合, 为每种模式添加常量头部. 只有这些新源资产采用 12 KiB 上限; 原探针 JSON 的 128 KiB 上限、15 秒默认时限、16 KiB 合计输出、2048 字符语义记录及旧夹具的各自限制不变. 独立校验器拒绝缺少硬上限、错误 UID/父进程限制、错误 BPF、缺少启动/任一 spawn 对照、报告与原始 stdout 不一致及伪造 skip.

| 本轮 test-only APK | bytes | SHA-256 |
|---|---:|---|
| arm64-v8a | 35280277 | `f90be0b531c510aaa983bd4cc8781a7c10d5bba616c7b1d8ff0d66c14ac6c60d` |
| x86_64 | 36677007 | `5e52f3bcac19f69ba5b19aa04027104060f29677f03835b276283bec3d6593f8` |

两个 APK 使用同一次性 v2 测试证书, 不使用发布密钥. 它们的安装后摘要、单 ABI 内容、Bun/helper 的只读路径与原始字节全部通过独立校验. 构建器重新核对以前保存的每 ABI 两份清洁构建产物; **本轮没有重编 Bun/JSC 或声称新清洁构建**. ARM64 Bun 仍为 `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` (87923320 bytes), x86_64 为 `83df7d535e4deab9484941a9e8cabc46be3ab6462ccc43c86b76f55325459130` (90449736 bytes), 不是另行锁定的大页 JSC 候选.

## 回归、归档和清理

原 25 项子集完整通过, 包含 20 次软上限降低和恢复、30 次强制生命周期回收. 后者请求终止到 supervisor 退出为 **301-311 ms**, child/supervisor 均消失且私有目录删除. 新增四模式执行为 **129-1188 ms**, 每条合计输出为 **516-848 bytes**, 未放宽资源限制. 本轮设备套件没有失败、skip 或重试后替换原始报告.

归档工具重验当前源码 receipt、两轮原始文本与 JSON、所有语义结果、同一 APK build 和每轮/最终 UID 清理; 拒绝旧 25 项 APK 冒充新 29 项 APK, 也不将不同时间、UID 或路径计作新环境. 新四模式和六组新增单元测试已接入 CI, 不宣称远程 CI 已执行.

测试应用最终卸载, 额外独立 postflight 再核对五个 UID `10742/15110/10519/11019/10174` 均无进程、包路径不存在. 只关闭本轮新建并启动的 `emulator-5560` (`bun-hard-limit-api33-20260912`), 保留其配置/磁盘便于复测, 不删除镜像或重置设备. 原有 API 27 `emulator-5554` 未安装本轮测试包、未启动/停止/重置, 四台物理设备保持连接.

## 本地验证

156 项 Node 测试、11 项 Python 文档测试和 8 项 JVM 测试全部通过. 十种语言的 changelog 源数据已更新, 36 个 Markdown 产物通过生成和一致性检查. 新归档从保存的原始文本再次完整重放, 290/290、源码 receipt、BPF、APK 和清理绑定一致; 全部既有兼容性报告未修改.

官方 Bun、锁定 supervisor、九补丁来源与静态运行时证据以及共享 API AAR 均校验通过. 生产 `:app:testDebugUnitTest`, `:app:verifyDebugApkRuntimeIntegrity`, `:app:assembleDebugAndroidTest`, `:app:lintDebug` 以 `--rerun-tasks` 完整执行, 三种 Debug APK 的 ELF/ZIP 16 KiB 对齐和 payload 摘要均通过. 已有 extractNativeLibs 和 Bundle.get 弃用警告仍保留. 这些构建检查不是生产设备或 Release 验收, 也不表示重新运行 native 清洁构建或远程 CI.

## 剩余门禁

本轮完成的是 Android 普通应用子进程中 **FD 256 高于降低后的硬上限 128** 的启动和 spawn 验证. 不是 Android FD 70000 或高于旧 65536 扫描上界的证据; 也没有 `CLOSE_RANGE_UNSHARE`、watch/reload、阻塞异步 SIGSYS、完整线程/错误边界和所有 CLI/API 支持结论. 新四模式仍缺 ARM64 原生 16 KiB 与 API 32 设备观测; 历史 25 项在三星上的通过不能代替这些新增用例.

本轮没有运行插件 Binder instrumentation, 不改变此前八项套件的累计数字; 独立应用探针不等于全部 Binder/API 矩阵. 官方插件仍为 Android 13 / API 33+, 实验 `distributionReady=false`, 官方/实验/大页候选锁和已发布资产未改动. 单源码 `--no-install`、无相对项目导入、无 AutoJs6 globals、无 Java bridge、可信代码而非安全沙箱的边界不变. 最终签名 APK 验收和同 Release 对应源码发布仍单独推进.
