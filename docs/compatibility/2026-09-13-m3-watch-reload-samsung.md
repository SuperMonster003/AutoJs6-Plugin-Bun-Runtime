# M3 十三补丁 Samsung 原生 ARM64 补充回归

2026-09-13, 从项目提交 `2d23e46` 继续. 两台三星设备依次连接到用户提供的
`localhost:37478`, 每次重新检查机型、实际 API、原生 ABI、页大小与 bridge.
本轮补齐十三补丁的 API 32 / ARM64 / 4 KiB 和 API 36 / ARM64 / 硬件 16 KiB
固定套件门禁. 两台设备都没有测试失败、跳过或重试.

运行时仍为 `1.4.0+e8b129616`, native head
`e8b1296169a8e6f20c81e926dba6448afb25cd11`, ARM64 完整 SHA-256
`c8f2513f3bea1a37d5c34c1f84722b0b4563363cc121f7a0f4eee8aa15427160`.
直接复用[六环境本地批次](2026-09-13-m3-watch-reload-fix.md)的三个 APK;
没有重新构建 Bun、WebKit、ICU、监督器或 APK, 没有修改定义、夹具、校验器或预算.

| 设备 | 实际 API | 原生 ABI / machine | 应用页 / 内核与 MMU 映射页 | bridge | 固定 35 项两轮 | 完整八项 Binder 两轮 |
|---|---:|---|---|---:|---:|---:|
| Samsung SM-A566B | 36 | arm64-v8a / aarch64 | 16384 / 16384 字节 | 0 | 70/70 | 16/16 |
| Samsung SM-F936U | 32 | arm64-v8a / aarch64 | 4096 / 4096 字节 | 0 | 70/70 | 16/16 |

API 36 内核为 `6.6.77-android15-8-abA566BXXU6BYIF`; API 32 内核为
`5.10.81-android12-9-25063374-abF936USQS4AVII`. 完整 fingerprint 及只读
shell smaps 保存在各自 device-facts 中. 应用探针和 Binder 另外独立检查
应用页大小; shell 映射原始物理字节摘要与解析前的 UTF-8/LF 摘要分别保留.
这是原生 ARM64 的硬件页证据, 不引用 x86 用户页模拟或 ARM 翻译路径.

三个 APK 的精确字节与本地批次相同. 探针 32 个输入和 Binder 83 个输入
仍逐项匹配 `bf5cb72`, 当前工具在每台设备安装前再次核验编译输入、完整
payload、签名和权限. Binder 使用实际生产服务、同一 AAR 和原八个测试方法.

| APK | bytes | SHA-256 |
|---|---:|---|
| ARM64 probe | 35301211 | `ca99d69a68491404db92d3baa8fbc1ed352bf0ee76d394c1efd4e4c75d9e970a` |
| ARM64 Binder main | 41110967 | `a89d6a117b6c0b125892d8c41cfda058437294186f142e610107f862abafe16f` |
| Binder test | 2373072 | `7302f3e4c47868d9d391d66758c706c6532b1da0302f479c300864892e5bfd2a` |

每台设备的四个 watch 模式产生八次实际重载和十二个镜像观测. 所有重载
镜像均未继承 FD 256/257, 同 PID、同 UID、标准输出通道和每镜像一次普通
SIGSYS 交付保持. API 36 原生 raw close_range 六次成功, 强制 TRAP 六次
返回 ENOSYS; API 32 原生控制与强制 TRAP 均返回 ENOSYS, 正确进入既有回退.
四个 watched child 每设备均由原句柄回收, 没有超时、输出溢出或工作目录残留.

每台另外保留四个 blocked 模式/十二个 child 观测、四个 pending 模式/
十二个 child 观测、八个 hard-limit 观测/八个 spawn API 检查、四个 soft-limit
和六个强制生命周期观测. 强制回收耗时 API 36 为 302-307 ms, API 32 为
301-303 ms. 每台 Binder 的十条生命周期记录与应用探针分开计数.

API 36 的 probe/main/test UID 分别为 10320/10321/10322; API 32 分别为
10328/10329/10330. 每个 UID 都在安装期间独立捕获, 卸载后分别确认包不存在
且 UID 进程数为零. 每台的自有私有 ADB 5039 都在清理后关闭, 实际 stop
退出码为 0, 随后只读确认原 PID 与监听端口消失. 未启动或停止任何 AVD,
未重启或终止共享 ADB/RDB. 两台设备均已告知用户可以结束连接.

新证据按设备和套件分别归档:

- API 36: [探针](2026-09-13-m3-watch-reload-native-arm64-api36-probes.json),
  [Binder](2026-09-13-m3-watch-reload-native-arm64-api36-binder.json),
  [设备与清理](2026-09-13-m3-watch-reload-native-arm64-api36-device-facts.json).
- API 32: [探针](2026-09-13-m3-watch-reload-native-arm64-api32-probes.json),
  [Binder](2026-09-13-m3-watch-reload-native-arm64-api32-binder.json),
  [设备与清理](2026-09-13-m3-watch-reload-native-arm64-api32-device-facts.json).

同一十三补丁及对应 ABI 的同批 APK/输入现有八个原生环境的探针 560/560、Binder
128/128, 分别来自此前六个 4 KiB 环境和本轮两个三星环境. Watch 合计为
32 个模式、64 次实际重载、96 个镜像观测. API 36 先归档时的七环境
490/490 与 112/112 保持其时间点含义, API 32 的后续归档再绑定最终八环境.
设备补充报告不额外新增执行次数, 历史版本和独立 JSC 候选均不计入这些数字.

[首次 API 28 中止](2026-09-13-m3-watch-reload-api28-abort-failure.json)保持失败且
不计入接受批次. 两台三星通过不解决它的 clone EAGAIN/abort 调用链与稳定性问题.
十三补丁大页 x86 JSC 重对齐、其余 syscall/API/FD/OEM、blocked/pending 跨
reload、真实 Android IPC、FD 70000/UNSHARE、长时压力/性能和签名 Release
仍需各自证据. 官方 payload、生产服务、AAR 与 API 33 下限未变,
`distributionReady=false`; 不声明一般端到端 16 KiB 支持.
