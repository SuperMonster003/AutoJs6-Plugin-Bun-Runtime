# M3: 内部 lchmod / fchmodat2 的离线 CLI 语义验证

证据日期: 2026-09-11. 等级: G2, 独立 test-only 应用进程. 不是完整实验插件 Binder, 完整包管理器, 生产 v0.2.2 或 Release APK 验收.

## 结论

九补丁实验 Bun `1.4.0+7b9ac2668` 的内部 `sys::lchmod` / `fchmodat2` 路径, 现已通过固定离线 `bun link` 夹具的权限与调用路径验证. 原 24 项定义及夹具字节完全不变, 套件只新增第 25 项 `lchmod-bin-link`. 六个原生环境各运行两轮, **每轮 25/25, 合计 300/300**. 新增探针每轮包含七个 CLI 对照, 共 **84 次观测**. [完整机器可读报告](2026-09-11-m3-lchmod-bin-link.json) 保留最终全部结果, 构建 receipt, 精确摘要, 来源审计, 早期候选诊断和清理记录.

| 环境 | API | 原生 ABI | 页大小 | 第一轮 | 第二轮 |
|---|---:|---|---:|---:|---:|
| Sony G8441 真机 | 28 | arm64-v8a | 4096 bytes | 25/25 | 25/25 |
| Sony XQ-AT72 真机 | 31 | arm64-v8a | 4096 bytes | 25/25 | 25/25 |
| Redmi 22120RN86C 真机 | 33 | arm64-v8a | 4096 bytes | 25/25 | 25/25 |
| Xiaomi 23046RP50C 真机 | 35 | arm64-v8a | 4096 bytes | 25/25 | 25/25 |
| AVD_API_33, sdk_gphone64_x86_64 | 33 | x86_64 | 4096 bytes | 25/25 | 25/25 |
| Samsung RTL SM-A566B 真机 | 36 | arm64-v8a | 16384 bytes | 25/25 | 25/25 |

三星设备的 native bridge 为 `0`, 内核为 `6.6.77-android15-8-abA566BXXU6BYIF`; 本轮新增的 25 项夹具在原生 ARM64 / 16 KiB 上有独立的 **50/50** 证据, 不借用旧 24 项的 48/48. 所有环境均为普通应用 UID, `untrusted_app`, seccomp=2; 两轮分别在应用中硬断言原生架构和页大小, 三星与 AVD 又在 shell 中独立复核. API 28 shell 没有 `getconf`, 其页大小依据是两轮应用内观测, 不伪称该 shell 检查成功.

## 为什么不能只检查退出码

固定源码的调用链是 `link_command.rs` 的 bare-link 分支, 经 `bin::Linker::link(true)` / `create_symlink` / `chmod_on_ok`, 调用 `sys::lchmod`. 后者直接调用 syscall 452 (`SYS_FCHMODAT2`), 在 `ENOSYS` 后退回 libc `fchmodat(..., AT_SYMLINK_NOFOLLOW)`. 但 `chmod_on_ok` 使用 `let _ = sys::lchmod(...)`, **主动忽略该错误**. 因而 CLI 退出 0 不能证明权限修改成功, 更不能证明错误已对用户传播.

测试执行的固定参数是 `bun link --ignore-scripts --config=<owned-file>`, 没有包参数. Bare `bun link` 的作用是注册本地包; 这与安装依赖或执行 bin 不同. 固定配置使用 `=` 形式, 避免这个版本把可选 `--config` 后的空格参数当成待链接依赖. [Bun bare-link 文档](https://bun.sh/docs/pm/cli/link)

AOSP Android 9 的 no-follow 路径通过 `O_PATH | O_NOFOLLOW` 打开对象后调用 `fchmod`; bionic 的后续处理区分普通文件和符号链接. 这解释了本夹具对 raw `fchmod` 的 0700 模式注入 EIO 后, CLI 仍退出 0, 但普通文件维持 0600 的负对照. 这是源码与实测相互印证的有限路径结论, 不是对所有 OEM libc 实现逐指令审计. [AOSP fchmodat](https://raw.githubusercontent.com/aosp-mirror/platform_bionic/android-9.0.0_r1/libc/bionic/fchmodat.cpp), [AOSP fchmod](https://raw.githubusercontent.com/aosp-mirror/platform_bionic/android-9.0.0_r1/libc/bionic/fchmod.cpp)

## 七个固定对照

每个 CLI 子进程先设置自己的过滤器, 写出带 PID 的 policy 记录, 再以同一 PID `execve` Android 安装的只读 Bun. 只使用夹具私有的 package, global, bin, cache 和 temp 路径, 环境变量采用固定白名单, umask 为 0077. IPv4 / IPv6 socket 创建均被拒绝且检查到 EPERM. 夹具不下载依赖, 不运行生命周期脚本, 不执行生成的 bin, 不改用户配置或系统策略.

| 对照 | 必须观察到的结果 | 两轮六环境合计 |
|---|---|---:|
| `no-bin` | 同一终止策略下无 bin 的本地注册成功, 不生成 bin 链接, 文件仍为 0600 | 12 |
| `kill` | 只有 syscall 452 被定向终止; 主线程确实因 SIGSYS 退出, 之后有界回收剩余线程, 文件仍为 0600 | 12 |
| `native` | 不额外 TRAP syscall 452, 普通文件由 0600 改为 0700 | 12 |
| `trap` | 新子进程先装 syscall 452 TRAP, 实际 CLI 回退仍将普通文件改为 0700 | 12 |
| `repeat` | 已有 bin 链接, 文件重置为 0600 后再启动新 CLI, 仍恢复为 0700 | 12 |
| `fallback-eio` | syscall 452 TRAP, libc 后备 raw fchmod 的 0700 调用被注入 EIO; CLI 退出 0, 文件仍为 0600 | 12 |
| `symlink` | bin 源为符号链接, no-follow 不改变 referent 的 0600 权限, 符号链接与目标内容不变 | 12 |

每次同时检查注册目标, bin 目标或正确缺失, manifest 与文件内容未变, 子 PID 与 policy 一致, 子进程已回收. `native` 不表示系统原本允许该 syscall; 原始 errno 单独记录. `repeat` 是新 CLI 进程对已有链接的测试, 不宣称同一进程的缓存 fallback 已覆盖. 最终独立校验器还核对 ABI, kernel, BPF 字节摘要, 所有有序行, 退出状态, 权限和原始 stdout 中的同一 JSON, 不能仅凭 `passed:true` 通过.

## 终止对照的旧内核修正

早期候选使用 `KILL_PROCESS`. API 28 / Linux `4.4.148-perf+` 上, `kill` 对照两次触发 1500 ms 超时保护; 当时原 24 项仍全部通过. Linux 4.4 对未知终止动作走当前线程的 `do_exit(SIGSYS)`, 与这个现象一致. 该记录归类为测试夹具的可移植性失败, 不据此判定 lchmod fallback 有缺陷. [Linux 4.4 seccomp 实现](https://raw.githubusercontent.com/torvalds/linux/v4.4/kernel/seccomp.c)

最终夹具在所有环境统一使用 `KILL_THREAD`, 不跳过 API 28 或降低断言. 父进程通过已创建子进程的精确 PID 读取 `/proc/PID/stat`, 先要求主线程为 `Z`, 原始退出状态为 31 (`SIGSYS`), 再通过持有的 Bun child handle 发送 SIGKILL, 回收剩余线程并等待退出. 这个状态字段来自内核的任务退出状态, 不从普通 stderr 文本推断 signal. [Linux 4.4 proc stat 实现](https://raw.githubusercontent.com/torvalds/linux/v4.4/fs/proc/array.c)

本次 12 个对照都观察到 `Z/31/3 threads`, 然后完成 group 清理. 报告行中的终态为 `SIGKILL`, 但其有效性依赖先观察到的 SIGSYS 主线程状态; **单独 SIGKILL, 超时, 输出超限或缺失主线程证据都会失败**. 这 12 个故意触发的负对照不是正常脚本崩溃, 也不是生产监督器扩展了任意后代清理能力.

保持每个 CLI 子进程 1500 ms 和 4096-byte 输出上限, 探针整体仍使用原有 15 秒 / 16 KiB 输出门禁, 单条语义 JSON 至多 2048 bytes. 新 lchmod 资源的固定源码上限单独设为 12 KiB; 原 openat2 的 8 KiB 资源和原 24 项所有边界均未放宽.

## 来源, 复测和早期诊断

实验 native head 为 `7b9ac266888abda7ee6ec0b8ac11a74236420030`, tree 为 `05f05ce5787a20f2af4d642fb0ada38f68674187`. 本轮没有添加第 10 个 native 补丁, 也没有再次完成 native 清洁构建; APK builder 重新核对保存的两组双 ABI 产物与原 [运行时构建证据](../../tools/bun-runtime/experimental/api28/runtime-evidence.json), 完成逐字节和 ELF 检查. Bun 与监督器继续从只读 `nativeLibraryDir` 执行, 不是 JNI 库.

| 最终候选对象 | bytes | SHA-256 |
|---|---:|---|
| 实验 ARM64 Bun | 87923320 | `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` |
| 实验 x86_64 Bun | 90449736 | `83df7d535e4deab9484941a9e8cabc46be3ab6462ccc43c86b76f55325459130` |
| ARM64 test-only APK | 35263573 | `158405de0377ab826747923b9141f9cc1c8921aab4f88ff2c67bb27c72a89fde` |
| x86_64 test-only APK | 36660303 | `1e5b100dad7c77b3a892413c9018971b1c9a7c26f937e16e4288446a32879513` |

项目基线为 `e769a1151d3c952ac76b277bece77d9f36514cf3`. 新 schema-2 receipt 绑定本轮修改的测试源码, 其余原 24 项定义与 fixture 源码按基线逐项复核. 每个设备安装前检查实际 APK 签名, Manifest, payload 和 ZIP 对齐, 安装后再次核对 APK, Bun 与监督器精确摘要. 临时签名 APK 保留在仓库外, 不是公开生产 APK.

机器报告将候选 1-8 的诊断放在 `preliminaryHarnessDiagnostics`, 全部标记为不计入最终验收. 包括 FFI `i64` 的 BigInt/Number 比较错误, `--config` 参数歧义, `spawnSync` 信号退出没有数字退出码导致的校验器误报, 以及 API 28 的旧终止控制超时. 候选 8 在另外五环境通过的结果同样不替代最终重跑. 最终候选 9 在六个环境完整重跑, 七个对照全部保留. 早期源输入/APK/报告摘要和失败探针输出均保留, 所有历史目录/FD 报告不改写.

除新增 lchmod 外, 本轮原 24 项共 288 次观测通过: 288 项目录路径断言, 72 次拒绝越界哨兵, 72 次 raw syscall TRAP 对照, 20 次 EIO-controlled 复制/等待观测, 24 次降低 FD 软限制, 36 次强制生命周期测试. 这 36 次正常生命周期测试的终止到退出耗时为 **301-311 ms**, 不把新增的 12 个定向终止对照混计进去. API 28 的四个复制/等待 kernel/policy-gated 观测仍单列排除, 不转为高层触达成功.

## 清理与仍未关闭的门禁

每轮 force-stop 后检查 UID 进程为 0, 再开始新应用进程的第二轮. 最后所有测试包卸载, 独立 postflight 再次验证六个环境包不存在且对应 UID 进程为 0. 本轮启动的 `AVD_API_33` 在卸载与清理后关闭; 两台预先在线的 AVD 保持在线且未操作. 没有重启 ADB server, 手机或三星远程设备.

130 项 Node, 11 项 Python, 7 项 JVM 测试通过; 文档生成/检查, 官方 Bun/监督器校验, 三种 Debug APK 的 runtime integrity / 16 KiB 对齐, AndroidTest 构建与 Lint 通过. 生产 Debug 构建检查不算生产设备执行验收. 没有运行远程 CI 或发布 Release.

此次只关闭固定内部 bare-link 路径的有限语义缺口. 完整实验 Binder, API 29/30/32 与剩余 ABI/OEM 矩阵, 其余 syscall/FD/线程边界, 最终签名 APK 与同 Release 对应源码仍待完成. raw openat2 的高层首次 EIO/TRAP 触达仍没有证明; native x86_64 16 KiB 仍独立阻断. Android 公开 node:fs lchmod 导出缺失的事实未改变, 也未增加完整 CLI 或自动安装依赖能力.

`distributionReady` 仍为 false. 官方 Bun payload, Android 13 最低要求, 用户选定的目录服务方案二, 普通 Bun.file/node:fs 自由度, 单源码/无相对项目导入/无 AutoJs6 globals/无 Java bridge 的合同及已发布 v0.2.0 资产均不变. 可信脚本并非安全沙箱. 本报告只陈述自动化技术验证, 不作法律意见或批准.
