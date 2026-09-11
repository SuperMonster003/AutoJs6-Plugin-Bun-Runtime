# M3: 目录回退修复的原生 ARM64 16 KiB 验证

证据日期: 2026-09-11. 等级: G2, 独立 test-only 应用进程. 不是完整实验插件 Binder、生产 v0.2.2 或 Release APK 验收.

## 结论

九补丁实验 Bun `1.4.0+7b9ac2668` 在 Samsung Remote Test Lab SM-A566B 上通过原 24 项套件两轮, 分别为 **24/24、24/24, 合计 48/48**. 使用与 [2026-09-10 五个原生 4 KiB 环境](2026-09-10-m3-scoped-open-fix.md) 完全相同的 ARM64 APK、运行时、夹具和验证器, 本轮连预期 revision 也没有改动, 未重建 Bun 或测试 APK.

这补齐了新目录回退字节及 24 项夹具的原生 ARM64 / 16 KiB 应用进程证据. 前次 240/240 与本次 48/48 是两个独立日期的测试, 合并为六个原生环境 / 12 轮 / 288 项通过, 不表示本轮重跑了其他五个环境. [完整机器可读报告](2026-09-11-m3-scoped-open-native-arm64-16k.json) 保留全部 48 项结果、源码/APK/runtime/监督器绑定、原始 instrumentation 摘要和清理记录.

| 设备事实 | 实测值 |
|---|---|
| 型号 | Samsung SM-A566B, 远程真机 |
| 系统 | Android 16 / API 36 |
| 原生 ABI / 内核架构 | arm64-v8a / aarch64 |
| 页大小 | 16384 bytes, shell 及两轮应用进程分别断言 |
| Native bridge | `ro.dalvik.vm.native.bridge=0`, 无 ARM 翻译桥 |
| 内核 | `6.6.77-android15-8-abA566BXXU6BYIF` |
| 执行域 | 普通应用 UID 10320, `untrusted_app`, seccomp=2 |

未启用页大小兼容覆盖、root、SELinux 放宽或系统策略变更. Bun 和监督器从 Android 安装的只读 `nativeLibraryDir` 执行, 两轮均核对可执行/不可写权限及安装后 APK、运行时和监督器的精确摘要.

## 本轮验证内容

- 全部 24 项固定探针各运行两次: 版本/revision、应用域、JS Unicode/stdout/stderr、TypeScript、spawn/spawnSync、文件、loopback fetch、SIGSYS、FD、syscall、目录路径、超时/输出上限/取消与终止后恢复.
- 目录夹具每轮在 native 和后置 TRAP 阶段各检查 12 种路径, 共 **48 项路径断言全部通过**. 普通文件与根内链接返回 `200/ok`; 相对、绝对和 magic-link 的 **12 次越界请求均为 `404/miss`**, 没有读取根外合成哨兵. 编码穿越、NUL、缺失文件和 FIFO 用例不被删去或放宽.
- 六种 syscall 的 **12 次 raw TRAP-to-ENOSYS 对照**通过. `copy_file_range` 与 `pidfd_open` 各两轮, 共 **4 次先 EIO 证明调用路径、再 TRAP 验证复制/等待回退的行为观测**通过. 每个夹具还检查后续缓存路径; 不能将这 4 次行为观测算成六种高层语义的完整验收.
- **4 次降低 `RLIMIT_NOFILE` 软限制用例**通过, 原始限制恢复、父描述符保留且两个非 Bun 子进程 API 均不继承测试哨兵. 这不新增 Android FD 70000、硬限制降低或 `CLOSE_RANGE_UNSHARE` 证据.
- **6 次忽略 SIGTERM 的强制生命周期用例**通过, 从终止请求到退出为 **302-304 ms**. exit 137 是预期的强制终止结果; 直接 Bun 子进程及监督器均被回收, 私有工作目录删除, 后续执行通过.

所有断言仍使用原超时、输出、路径和来源约束; 服务仅绑定 `127.0.0.1`, 仅访问夹具自己的文件与合成哨兵, 不读取用户数据.

## 来源与复核

| 对象 | bytes | SHA-256 |
|---|---:|---|
| 实验 ARM64 Bun | 87923320 | `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` |
| ARM64 监督器 | 7440 | `25b0b3788fcb4872060ff92cc3faa100aa517d2dcfb0ed499854f9f858e80537` |
| 临时签名的 ARM64 test-only APK | 35259407 | `70740d35f9bf6866d01a34e6388877b90a6ddb9c7cc6e331b7c9bd947ce0156f` |

实验源码 head 为 `7b9ac266888abda7ee6ec0b8ac11a74236420030`, tree 为 `05f05ce5787a20f2af4d642fb0ada38f68674187`. 原 [两轮双 ABI 清洁构建证据](../../tools/bun-runtime/experimental/api28/runtime-evidence.json) 保持不变; 本轮重新验证保存的四个产物, 同 ABI 字节一致且完整 ELF 审计通过, 不是再次完成四次构建.

项目基线为 `800a48f0902e6586253e9f7a03d6d006889bec02`. schema-2 构建 receipt 的全部输入与该提交的 UTF-8/LF 源码逐项一致, 也与前次五环境报告的 receipt 完全相同. 现有生产 v0.2.2 / 1.8.0 构建插件提交未修改独立探针输入; 本轮结果不归因给生产 v0.2.2 APK. 测试 APK 的实际签名、Manifest、ZIP 对齐与完整 payload 在安装前重验. 123 项 Node、11 项 Python、7 项 JVM 测试及官方运行时/监督器校验通过; 文档生成检查、三种 Debug APK 摘要和 16 KiB 对齐、AndroidTest 构建、Lint 与 IDE 构建通过. 生产 Debug 的构建校验不是设备执行验收; 已有弃用和 Manifest 警告未在本轮修改.

## 清理与保留的边界

远程端点最初显示在线但 shell 属性读取超时. 仅断开并重连该 ADB 端点后恢复, 未重启 ADB 服务或设备; 随后设备预检、两轮测试及最终清理全部通过. 每轮结束 force-stop 并验证测试 UID 进程为零, 第二轮从新应用进程开始. 测试包最终卸载, 独立 postflight 再次确认包不存在且 UID 进程数为 0. 原有两台 AVD 未被操作且测试后仍在线; 本轮没有启动或关闭 AVD, 也未关闭远程真机.

两轮 raw `openat2` 在测试过滤器前已经返回 `ENOSYS`, EIO 控制没有证明高层首次调用触达. 因此目录结果是这些环境的不可用回退证据, 不是首次高层 EIO/TRAP 的替代证明. Android 公开 `node:fs` 两个 lchmod 导出仍为 undefined; 内部 `sys::lchmod` / CLI 的 `fchmodat2` 回退尚未执行.

[旧八补丁 23/24 的目录失败](2026-09-10-m3-openat2-confinement.json)、[更早的 ARM64 16 KiB 19/20 失败](2026-09-10-m3-native-arm64-16k.json)、[较窄的 20 项成功](2026-09-10-m3-spawn-fd-fix.json) 和所有历史报告按原字节保留. 不把旧版本/较窄用例或官方 Binder 的结果重新归属给本次实验字节.

剩余门禁仍包括完整实验 Binder、其余 syscall/FD/线程边界、API 29/30/32、最终签名 APK 与同 Release 对应源码资产, 以及独立阻断的原生 x86_64 16 KiB. `distributionReady` 仍为 false. 官方 Bun payload、Android 13 最低支持要求、签名和已发布 v0.2.0 资产均未改变. 普通 `Bun.file` / `node:fs` 自由度不因本轮测试改变; 可信脚本不是安全沙箱, 有限 helper 竞态测试不是内核级全等价证明. 本报告只记录技术验证, 不作法律意见或批准.
