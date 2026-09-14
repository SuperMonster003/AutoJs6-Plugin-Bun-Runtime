# M5: 原压力控制流的固定观察

2026-09-14, 在 API 36 原生 x86_64 的 4096 / 16384 用户页环境各完成两轮七模式诊断, 共 28 个 Bun 模式进程. 四次 DFG 都在第一次 profile 后满足原来的三个目标样本门槛并正常退出; 本批没有重现历史 2 < 3 失败. 原始失败和原套件成绩保留不变, 本诊断增加的兼容性通过数为 0.

完整数据在[原始输出与严格验证归档](2026-09-14-m5-jsc-pressure-flow-diagnostics.json), 构建、来源、检查与双 UID 清理在[补充记录](2026-09-14-m5-jsc-pressure-flow-checkpoints.json). [工具说明](../../tools/bun-runtime/experimental/webkit-x86_64-16k/flow/README.md)记录固定范围和命令.

## 控制流与范围

保留原 `jit-off, baseline, dfg, ftl, gc, wasm, workers` 顺序. 六个模式直接使用原压力资产和原验证器. 仅 DFG 使用新增资产, 去掉七段标记观察代码后逐字节恢复整个原 JS, 包括热函数、BigInt 参考算术、128 次预热、匿名 profile 回调、达到三个样本即停止和四次 profile 上限. DFG 请求环境只有 `AUTOJS6_JSC_PRESSURE_MODE=dfg`, 未新增 JSC 调优、日志或额外 profiler-data 选项. 其他模式的请求环境与原测试一致; 本批没有最终 JSC 选项 dump, 不把请求环境说成一次新的最终选项验证.

观察代码在 profile 调用前后运行, 不插入原回调内部. 每次记录调用数、整个 profile 调用耗时、目标和调用者各层级帧数、目标 trace 数、原样本累计值以及有界首栈. 16 KiB 源文件、64 KiB 合计输出、20 秒工作、25 秒 Binder 超时、每次 300 ms / 100000 次调用和 1000 us 采样间隔均保持原限额. 整个 profile 耗时包含调用及采样处理, 不能当作纯回调耗时或性能指标.

原断言仍执行. 新外层 catch 保存错误事实并重新抛出同一个错误, finally 输出诊断. 完整记录的 DFG 断言退出 1 可以收集后再继续剩余模式; 原 JUnit 会在失败处停止, 因此新收集程序与原套件必须分开. 缺少最终事实、未知失败、超时或修改门槛均不能通过收集验证. 六项 Node 控制直接运行新增 JS 的实际代码, 用构造 profiler 验证首轮停止、四轮 2 < 3 失败的重新抛出、原编译计数/FTL 断言和数据篡改拒绝. 这些主机控制不是 Android 失败重现; 本批 Android 没有退出 1 的观察.

完整首栈沿用上一批选择器和主机原始帧解析器: 每类只考虑第一条, 单份最多 4096 bytes, 所有首栈最多 24576 bytes, 超限明确标记且不能改选后续样本. 新代码及观察开销仍可能影响编译和时序; 保留原控制流不等于机器代码或运行条件完全相同.

## 本批观察

两台 AVD 的执行 ELF 都是锁定的 x86_64. 应用 AT_PAGESZ、Android sysconf 和 shell getconf 分别核验用户页; 两环境 shell KernelPageSize / MMUPageSize 均为 4096. 16384 用户页是 x86 ABI 模拟, 不能作为 ARM64 硬件 16 KiB 结果.

| 用户页 | 轮次 | 实际 profile 数 | profile 内目标调用数 | 整个 profile 耗时 (ms) | trace 数 | 目标 DFG 帧 | 目标 FTL 帧 | 编译计数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4096 | 1 | 1 | 4426 | 308.647 | 99 | 18 | 0 | 2 |
| 4096 | 2 | 1 | 5530 | 309.096 | 111 | 10 | 0 | 1 |
| 16384 | 1 | 1 | 6256 | 307.329 | 85 | 82 | 0 | 2 |
| 16384 | 2 | 1 | 7530 | 307.300 | 97 | 93 | 0 | 2 |

四次 DFG 都通过原样本、编译数、无目标 FTL 断言, 并通过原主机压力验证器, 包括三个不同时间戳的实际目标样本. 总调用数另含原 128 次预热. 其余六模式共完成 24 次原资产验证; 其中 workers 模式共记录 64 次正常 worker 退出. 不重跑八项 Binder 套件, 不将这批 28 次诊断并入原压力 28/28.

四次 profile 共 392 条 trace / 2052 帧, 保存 8 份完整首栈, 无省略. 目标 DFG 汇总 203 帧, 含 DFG 目标和 DFG invoke 的分类 trace 为 202 条, 两者计数单位不同. 四份此类首栈分别包含 `jscPressureHotLoop#EoFuS3:DFG:<nil>` 与 `invoke#DawGsb:DFG:bc#89`. 每个 profile 均只有 `dfg-pair` 和 `other` 两类, 没有目标或调用者 FTL 帧, 没有完整 profile 的目标帧归零.

三个 `other` 首栈只有 profile / tierPressure / module 帧, 另一个首栈包含 Baseline 目标与调用者. 首栈仅代表该类的首个样本, 不能把同类所有其他 trace 推断成相同栈. 本批没有导出原始机器 PC、映射指针或编译图, 也没有新的 FTL 内联日志. 新样本数和页大小之间的差异不构成因果或性能结论.

## 来源、清理与验证

唯一一对新测试 APK 绑定源码提交 `f73510a31a30abfbc77cfe03e6791257a833cdfb` 的 94 项输入. 构建实际退出码 0, 28 秒, 80 tasks / 12 executed / 68 up-to-date. 安装后 main/test APK 摘要、相同签名、包含的 Bun 与监督器字节均独立验证.

| 产物 | bytes | SHA-256 |
| --- | --- | --- |
| main APK | 42963239 | `447decc9d17c6e445cf2960a0f5433d5a97a31e149eb016bd309b0f021e33ce8` |
| test APK | 2580707 | `e6adfbfd21c6c50b2ded0e88592c7089716349f94e953c398f5da98f082d0f7a` |
| 保留的十三补丁 JSC runtime | 90609496 | `17c7941a32669e0cf2d6915bf94d8cee8421c3df605eddcf2b493687f20e98a8` |

Bun 源码仍为 `e8b1296169a8e6f20c81e926dba6448afb25cd11`, 未重建 Bun / WebKit / ICU, 未恢复清理过的原生构建缓存. 本机 `E:/.codex-tmp/jsc-pressure-flow-20260914/` 保留独立 APK 快照、实际 driver 退出码、逐轮原始输出和清理记录.

每台设备的两包均卸载. 完整数字 UID 进程清单分别确认 4 KiB 的 10226 / 10227 和 16 KiB 的 10213 / 10214 均为 0. 仅关闭本轮启动且再次核对名字的 `bun-jsc-pressure-4k-20260912` / `bun-jsc-pressure-16k-20260912`, 分别于 05:41:06Z / 05:43:09Z 确认结束. 设备运行前已有的 API 24 / 37 AVD 保持运行且未操作; 手机与共享 ADB server 未启停. localhost:37478 在本批设备清单中为 offline, 本范围不依赖它.

验证结果:

- 全量 Node: 45 文件 / 283 项通过, 无失败或跳过. 新增 6 项已接入 CI.
- 生产四项 Gradle 检查实际退出 0, 19 秒, 96 tasks / 49 executed / 47 up-to-date. JVM 任务为 UP-TO-DATE, 已有 21 项成功结果保留, 不声称本轮重执行.
- 官方 runtime / supervisor 与三个 Debug APK 的 runtime / ELF / 16 KiB ZIP 检查通过. Lint 为 0 errors / 44 既有 warnings; IDE `isSuccess=true`, 仅既有 SDK XML 警告.
- 十语言 changelog 与生成产物同步. 最终 Markdown / 矩阵生成和 `--check`, Python 38 项测试通过; 两份新 JSON 仅登记索引, 原 120 份报告/注册项和 217 条矩阵行保持原样. 131 份受保护源码/夹具/native 文件及用户已有 platform-versions 1.8.0 设置不变.

本轮完成 M5 的原控制流观察工具与固定设备采集, 并同步 M9 来源索引. 四次首轮停止的当前结果无法补回原失败当时缺失的逐轮数据; [历史失败及原套件复测](2026-09-14-m5-thirteen-patch-jsc.md)继续单独保留. 原 2 < 3 根因、稳定性、长期压力/性能和 Release 门槛仍开放. Baseline 560/560 探针、128/128 Binder 和原 JSC 32/32 Binder、28/28 压力计数均不增加, 官方 API 33+ 与 `distributionReady=false` 不变.
