# M5: 十补丁大页 JSC 构建与双页大小回归

2026-09-13, Asia/Shanghai. 独立大页 JSC 候选已从九补丁移至十补丁
`1.4.0+a9c76a599`: 两次新 clean Bun 构建产生完全相同的 x86_64 ELF,
两次实际构建驱动退出码均为 0. 该新成品在 API 36 的 4 KiB 与 16 KiB x86
用户空间页环境分别通过原八项 Binder 两轮和原七模式压力两轮,
合计 **32/32 Binder、28/28 压力模式**. 设备套件没有失败或重试.

本批次实现与 APK 输入基于项目提交 `573812979506283492637aaea3375819c336e515`.
这组新候选结果独立于 baseline 十补丁的七环境 434/434 探针、112/112 Binder,
也不改写九补丁历史报告. 官方 payload、API 33+、生产服务、共享 AAR 和 supervisor 未改变.
`distributionReady=false`; 本报告不提供 Release 验收.

## 两次构建的来源与结果

- Bun head: `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`.
- Bun tree: `cb762d12f6959834517c79f01f4c538346990962`.
- WebKit: `0f966e81b78c84bb23213e391bc679c4ef83e56b`.
- 两个新且独立的 Bun checkout 无既有构建输出, 均从锁定源码开始, 构建后 head/tree/clean 不变.
- 使用原锁定容器、工具链和离线构建方案; 22 个源码输入、206 个 Cargo archives 与 125 个 npm archives 通过原预检.
- 两个完整 Bun 构建分别复用前次两个独立 WebKit 构建的 JSC/WTF/bmalloc 库与配置.
  库、配置和原上游 ICU 没有重新编译. **新 clean Bun 构建数为 2, 新 WebKit/ICU 构建数为 0.**
- `USE_64KB_PAGE_BLOCK=1`, JIT/DFG/FTL/Wasm JIT、采样器和 external mimalloc 配置保持精确一致.

| 构建 | 开始 (UTC) | 完成 (UTC) | 实际 driver exit | 完整 Bun |
|---|---|---|---:|---|
| run 1 | 01:19:31 | 01:48:20 | 0 | 90609488 bytes, 与 run 2 一致 |
| run 2 | 01:19:47 | 01:48:27 | 0 | 90609488 bytes, 与 run 1 一致 |

两个成品 SHA-256 均为
`a237dc8c13fbef6366a36769ea9a6d729fd24307b0df93bb051be8d997f8dcd5`.
ELF 为 x86_64 PIE, PT_LOAD 最小对齐至少 16384 bytes.
独立 [候选锁](../../tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-candidate.lock.json)
保留两个 driver/native receipt、完整日志与 Ninja 日志摘要、最终 link/map/strip 边,
并绑定旧候选、旧独立清洁构建证据、当前 baseline source 和原构建脚本.
记录器对本次实际日志中的 `link bun-profile` / `strip bun` 以及最终 Ninja 边做精确检查.

原 [九补丁 candidate.lock.json](../../tools/bun-runtime/experimental/webkit-x86_64-16k/candidate.lock.json)
仍保留最初 incremental 来源. 原 baseline 十补丁构建恢复记录里的缺失 driver exit 仍为 null;
本次真正取得的两个 exit 0 不用于改写那一批历史证据.

## APK 与源代码绑定

主 APK 与测试 APK 只构建一次, 在两个设备、两种套件的全部轮次复用.
APK 内嵌的 77 个输入逐项与提交 `5738129` 的 Git blob 核对, 文本统一 LF, AAR 按原字节核对.
内嵌 `binder-build.json` 为 42057 bytes, SHA-256
`c8c1d5faa0bd76ddfd314cb4e80f3c676f7019ddc958b08bed255b3c38f0e420`.
安装前 ZIP/ELF/ABI/摘要、16 KiB ZIP 对齐、签名、安装后的两个 APK 及 native payload 摘要均通过.

| 产物 | bytes | SHA-256 |
|---|---:|---|
| x86_64 test-only Debug 主 APK | 42848253 | `2c161a904f0f3e999a7070238e54563354126b77c748f3343be700132d2755fb` |
| androidTest APK | 2354641 | `d203bf8211f66fe2f332f6767b662fe92b331e07f3f9356488cf4b6021186483` |
| 原 x86_64 supervisor | 7304 | `4d44ab8a643f8e72e2964adf5a0d7fad0ced0e8aac86657e19eaf790763b4cd5` |

已在更新最终 changelog 前归档, 原 APK 与内嵌 receipt 另存本机.
后续文档打包产物不冒充本表中的已测试 APK.

## 两个设备环境

| 环境 | API / ABI | 用户空间页 | shell smaps 内核/MMU 页 | Binder 两轮 | 压力两轮 |
|---|---|---:|---:|---:|---:|
| sdk_gphone64_x86_64, emulator-5580 | 36 / native x86_64 | 4096 | 4096 / 4096 | 16/16 | 14/14 |
| sdk_gphone16k_x86_64, emulator-5582 | 36 / native x86_64 | 16384 | 4096 / 4096 | 16/16 | 14/14 |

4 KiB AVD kernel 为 `6.12.38-android16-5-gbb9513914902-ab13996879`,
16 KiB AVD 为 `6.6.66-android15-8-gd0c43a640eab-ab13812146`.
完整 fingerprint 与原始阶段记录见 [补充检查点](2026-09-13-m5-ten-patch-jsc-checkpoints.json).
两环境均可提供 ARM native bridge, 但本 APK 只包含已验证的 x86 ELF, 没有通过 ARM 翻译执行.

每个压力进程的 ELF AT_PAGESZ 与 Android sysconf、getconf 一致.
**这里的 x86 16 KiB 是用户空间页 ABI 模拟, 内核映射仍为 4 KiB, 不代表 ARM64 硬件 16 KiB.**
本轮未请求三星设备, 没有新增 ARM64 或 API 28-32 观测.

## 套件范围

原八项 Binder 方法、生产 service、真实签名权限及原七模式压力资产和语义校验器均未修改.
每套件、每环境各两轮, 轮间执行进程重启. 测试依旧通过只读 nativeLibraryDir 中的 PIE
和实际 supervisor 执行, 使用真实 Binder 接口、私有工作目录及有界输出.

- [Binder 原始归档](2026-09-13-m5-ten-patch-jsc-binder.json): 32/32,
  包含发现/激活元数据、预热、JS/TS、原示例、安装字节、错误请求、输出超限、超时和取消,
  并保留 20 条有界生命周期观测.
- [压力原始归档](2026-09-13-m5-ten-patch-jsc-pressure.json): 四个 JUnit 运行,
  每个七种模式, 共 28/28. LLInt/Baseline/DFG/FTL 各有真实采样帧和独立算术校验,
  共 16 个层级观测及 48 个目标帧; GC/Wasm/worker 模式也通过.
- 128 个 Wasm modules、8388608 次检查过的调用、252 次 memory grow 与 64 个 worker 正常退出.
  禁用 DFG 时的 1000000 值仍按 sentinel 处理, 不算真实编译次数.
- 16 KiB 资产上限、25 秒 Binder job、20 秒工作阶段、8 秒 worker deadline 和 64 KiB 输出预算均不变.
  本夹具是有限正确性检查, 不是性能、长时压力或所有 JIT/Wasm 路径验收.

## 清理与收尾记录

四次 runner 都卸载各自的主/测试包, 每轮和最终 execution UID 进程为 0.
在关闭 AVD 前又核对了四个 execution UID; 16 KiB 两次运行额外捕获了测试包 UID,
其进程也为 0. 4 KiB 测试包 UID 未单独捕获, 不扩张为这两个 UID 的独立检查.
仅对本轮启动的 `5580` / `5582` 发出关闭命令, 事先核对精确 AVD 名称, 关闭后两序列号消失.

额外收尾脚本在上述清理完成后, 因假定三个原有 AVD 始终在线而退出 1:
最终清单保留 `5554`, 原有 `5560` / `5562` 已不在 ADB 列表中.
未向这些原有 AVD 发出关闭或重启命令, 不推断清单变化的原因.
此库存断言、原脚本摘要和此前已落盘的包/进程快照均保留在补充检查点;
聚合记录从快照恢复, 没有重新运行设备套件或重启任何 AVD.

## 验证与仍开放的门槛

189 项 Node tests、官方 runtime/supervisor 字节验证、文档生成校验和 11 项 Python tests 通过.
最终文档生成后的生产 unit/APK integrity/androidTest assembly/lint 任务也通过
(33 秒, 96 tasks: 48 executed / 48 up-to-date); unit 任务复用已有 8 项成功结果.
IDE build 通过, 仅有既有 SDK XML 与 Bundle.get 弃用警告.
实验主/测试 APK 构建成功 (49 秒, 80 tasks).

本批次关闭十补丁大页 JSC 的双构建和这两套双页大小回归小节.
完整 syscall/API/FD/OEM、Android FD 70000/UNSHARE/watch/reload、扩展压力/性能及
签名 Release APK 与同 Release corresponding-source 发布门槛继续开放.
官方 x86 页大小防护与正式 Android 13 边界仍保留.
