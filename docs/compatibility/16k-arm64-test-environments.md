# x64 Windows 上的 ARM64 / 16 KiB 测试环境

核查及设备验证日期: 2026-09-10. 本文说明环境选择, 具体执行证据分别保存在下文链接的设备报告中.

## 已验证的远程路线

用户随后通过 RDB 提供了 Samsung Remote Test Lab 的 SM-A566B. 本机 x64 Windows 无需更换架构, 已通过 ADB 完成以下实测:

- Android 16 / API 36, `arm64-v8a`, `aarch64`, `PAGE_SIZE=16384`, native bridge 和 QEMU 标记均为 0.
- 正式 Bun + 锁定监督器的 v0.2.1 开发版 arm64-only Debug APK, 完整 Binder 套件两轮 8/8, 第二轮前重启插件进程. 安装后 payload 摘要与 10 次忽略 SIGTERM 的生命周期回收均通过. 见 [M5 原生 ARM64 报告](2026-09-10-m5-native-arm64-16k.json).
- 旧实验 runtime `1.4.0+c240d6c68` 两轮 19/20, 仅 forced-TRAP 降低软限制 spawn 用例失败. [原 M3 报告](2026-09-10-m3-native-arm64-16k.json) 保留不变. 随后的八补丁 `1.4.0+a260ef308` 在同一原生 16 KiB 真机上以不放宽断言的测试 APK 完成两轮 20/20, 见 [spawn 修复与复测报告](2026-09-10-m3-spawn-fd-fix.json). 这证明新的应用进程探针通过, 不等于完整实验 Binder 或最终 Release APK 验收.
- 上述各轮测试包均已卸载, 最终对应 UID 进程数均为 0. 账户登录、预约和 RDB 接入由用户完成; 没有操作其他应用、购买配额或代替用户结束预约.

因此这条路线已从资料候选变为本项目实际用过的原生 ARM64 16 KiB 执行环境. 该结果仍限于上述设备、版本和测试范围, 不等于已发布 Release APK 或所有 16 KiB ABI/设备通过.

## 结论

在当前 Intel/AMD x64 Windows 电脑上, **单独安装 VMware 或在现有 WSL2 中使用 Ubuntu, 都不能提供原生 ARM64 Android 16 KiB 执行环境**. 虚拟化不改变宿主 CPU 的指令集. WSL 仍然适合源码构建、Docker、静态校验和测试编排, 无需卸载或重装.

本机只读检查得到:

```text
wsl -d Ubuntu-24.04 -- uname -m       -> x86_64
wsl -d Ubuntu-24.04 -- getconf PAGE_SIZE -> 4096
```

缺少的是符合目标的 Android 执行端, 不要求开发用的 Windows 电脑也换成 ARM64. 远程 ARM64 Android 真机通过 ADB 接入本机, 也可以形成明确标注的设备证据.

## 各方案能提供什么

| 方案 | 对当前 x64 Windows 的作用 | 能否关闭本项目的原生 ARM64 16 KiB 缺口 |
|---|---|---|
| VMware Workstation + Ubuntu | 虚拟化 x86_64 Linux, 可做构建和编排 | 不能仅靠这一层实现 |
| 现有 WSL2 + Ubuntu 24.04 | 运行 x86_64 Linux/Docker, 已用于可复现构建 | 不能仅靠这一层实现 |
| ARM64 Docker 镜像 / QEMU user-mode | 可翻译 ARM64 用户态指令, 仍调用宿主 Linux 内核 | 不能代替完整 Android 环境 |
| QEMU full-system + ARM64 Android 16 KiB guest | 技术上可用软件模拟 ARM CPU、MMU 和完整客体系统 | 可研究为单独的模拟证据, 不是原生 ARM64 CPU 证据; 本机尚未部署或验证 |
| x86_64 16 KiB AVD / Cuttlefish | 提供 x86_64 Android 的 16 KiB 测试环境 | 不能把 ARM native-bridge 翻译结果计为原生 ARM64 |
| ARM64 宿主 + ARM64 Android 16 KiB AVD/Cuttlefish | 可运行匹配架构的 Android guest | 配置和实际 instrumentation 全部通过后可以; ARM64 Linux 本身还不是 Android |
| 本地或远程 ARM64 16 KiB Android 真机 | 直接运行 ARM64 Android APK 和 Bun | 页大小、安装后 payload 及完整测试通过后可以 |

### VMware 和 WSL 的限制

VMware 的官方架构说明要求 guest OS 与宿主机器架构兼容. 26H1 新增的 ARM 能力是连接和管理**远程 ARM ESXi 服务器**, 不表示 x64 本机获得 ARM CPU 模拟能力. 见 [VMware 架构说明](https://knowledge.broadcom.com/external/article/330613) 和 [26H1 发布说明](https://blogs.vmware.com/cloud-foundation/2026/05/14/announcing-vmware-workstation-and-fusion-26h1/).

WSL2 使用虚拟机中的 Linux 内核; 当前实例的架构已由上面的命令确认. 修改内存、swap 或嵌套虚拟化选项, 不会改变这个实例的 CPU 架构. 这是结合本机结果与 [Microsoft WSL2 架构说明](https://learn.microsoft.com/en-us/windows/wsl/compare-versions) 的判断, 不是安装 Ubuntu 失败.

Android Emulator 官方要求 VM 加速时 CPU 与 system image 架构匹配, 并将 VMware 等 VM 内的加速模拟器列为不支持的嵌套用法. 因此不建议为运行当前 ARM64 AVD 而重装虚拟机或关闭已用于构建的 WSL/Hyper-V. 见 [Android Emulator 加速要求](https://developer.android.com/studio/run/emulator-acceleration).

### QEMU 的可行性与证据边界

QEMU 的 TCG 支持跨架构模拟, full-system 模式能模拟 CPU、内存和设备并启动 guest OS. 因此 "x64 电脑在任何条件下都不能运行 ARM64 系统" 太绝对. 但这不是 VMware/WSL 自身提供的 ARM 虚拟化, 也不是把现成 AVD 换一个启动命令即可保证成功. 见 [QEMU TCG 架构支持](https://www.qemu.org/docs/master/about/emulation.html) 与 [system emulation 说明](https://www.qemu.org/docs/master/system/introduction.html).

具体到本项目, 还需要匹配虚拟板型的 Android 内核/系统镜像、16 KiB guest 页配置、正常的 bionic、zygote、Binder、SELinux 和应用 seccomp 环境. 单个 ARM64 Linux 程序跑通, 或仅把报告的页大小设置为 16384, 都不满足这些条件. 即使完整系统模拟成功, 也应记录 TCG 和宿主架构, 单列为软件模拟结果; 不能只凭 guest 的 `uname -m=aarch64` 就称为原生 CPU 验收. 本轮没有安装、启动或验证该路线.

AOSP 的现成 ARM64 Cuttlefish 16 KiB 指南明确要求 ARM64 Linux 宿主; 另有独立的 x86_64 指南. 见 [ARM64 路线](https://source.android.com/docs/core/architecture/16kb-page-size/getting-started-cf-arm64-pgagnostic) 和 [x86_64 路线](https://source.android.com/docs/core/architecture/16kb-page-size/getting-started-cf-x86-64-pgagnostic). 云端 ARM64 主机还需核实 KVM/虚拟化可用性, 不能仅凭实例名称判断.

## 优先建议: 先核实远程真机, 无需立即购买硬件

Android 官方测试指南列出了 Samsung Remote Test Lab 的 16 KiB 设备. Samsung 官方说明该环境使用实际设备, 并提供 Remote Debug Bridge (RDB) 将远程设备连接到开发电脑的 ADB. 上文已记录本项目在一台该类设备上的实际测试; 每次新预约仍需重新核实设备和权限. 见 [Android 16 KiB 测试环境](https://developer.android.com/guide/practices/page-sizes#test), [Samsung 16 KiB 真机说明](https://developer.samsung.com/remote-test-lab/blog/en/2025/07/07/optimize-your-applications-for-16-kb-page-size-compatibility-using-samsungs-remote-test-lab), [RDB 使用说明](https://developer.samsung.com/remote-test-lab/blog/en/2022/07/13/connect-to-devices-on-remote-test-lab-using-rdb-in-android-studio).

若采用该路线:

1. 用户在 [Samsung Remote Test Lab](https://developer.samsung.com/remotetestlab/devices/129/16kb-page-size) 自行登录, 查看 16 KiB 分类中的可用设备及当前配额/使用规则. 无需把账户密码发到会话中.
2. 预约明确标注 16 KiB 的 Android 设备, 按官方说明连接 RDB, 直到本机 `adb devices -l` 能看到它. 由用户处理账号和预约; 测试会占用已预约的设备时间, 安装的 APK 应仅包含获准上传的测试代码和资产.
3. 使用明确的 serial 检查以下事实, 不能只看网站标签:

   ```text
   adb -s <serial> shell getprop ro.product.cpu.abi
   adb -s <serial> shell uname -m
   adb -s <serial> shell getconf PAGE_SIZE
   ```

   预期分别为 `arm64-v8a`, `aarch64`, `16384`. 还要记录 API、内核及设备来源.

4. 核实该会话允许安装所需 APK、执行 `am instrument`、读取必要诊断并清理测试包. RDB 的存在不自动证明整套插件 instrumentation 都被测试平台允许.
5. 分别验证正式/实验产物: 签名、单 ABI APK、安装后 `nativeLibraryDir` 摘要、真实 JS/TS、流式输出、取消/超时/回收、重复绑定与重启. 脚本须在普通应用 UID 的 zygote/seccomp 域运行, 不能用 root/shell 下的 Bun 命令替代 Binder 结果.
6. 测试后卸载本轮安装的包、确认 UID 进程归零、断开并结束远程会话, 不保留用户数据或凭据.

如果远程配额、ADB 权限或设备不可用, 再考虑借用支持 16 KiB 模式的真机, 或使用能运行匹配 Android guest 的 ARM64 宿主. 当前继续推进 M3 的 4 KiB FD/syscall 和 Binder 工作并不依赖这一步.

## 不变的项目边界

正式插件最低要求仍为 Android 13 / API 33. 已有 x86_64 16 KiB AVD 的 ARM native-bridge 通过记录不升级为原生 ARM64 证据; 新的 Samsung 真机结果单独归档. 原生 x86_64 的 pinned JSC large-page 问题、最终 Release APK 的 16 KiB 验收以及实验 runtime 的完整 Binder/FD 门禁, 仍按 [Roadmap](../../ROADMAP.md) 分别跟踪.
