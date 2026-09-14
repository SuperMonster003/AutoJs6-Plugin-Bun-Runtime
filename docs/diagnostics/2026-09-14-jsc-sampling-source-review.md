# 十三补丁 JSC 采样不足: 固定源码审阅

本次是源码和已有失败记录的只读审阅, 没有新 Android 运行或 JSC 修复.
十三补丁候选的 [原失败批次](../compatibility/2026-09-14-m5-thirteen-patch-jsc-pressure-sampling-failure.json)
仍然失败: 初次 x86 API 36 / 16 KiB 用户页压力第二轮 DFG 只有两个目标样本,
低于原门槛三个, `compiles=3`, 受控退出码为 1.
[同 APK 完整复测通过](../compatibility/2026-09-14-m5-thirteen-patch-jsc.md)
不能证明采样稳定或解释该失败.

## 审阅来源

本机文件已逐字节核对对应 Git blob. Bun 源码固定于
`e8b1296169a8e6f20c81e926dba6448afb25cd11`, WebKit 固定于
`0f966e81b78c84bb23213e391bc679c4ef83e56b`, 与
[十三补丁候选锁](../../tools/bun-runtime/experimental/webkit-x86_64-16k/thirteen-patch-candidate.lock.json)
一致. 以下 SHA-256 绑定完整源文件, 不仅是审阅的行.

| 源文件 | bytes | Git blob | SHA-256 |
|---|---:|---|---|
| Bun `src/jsc/modules/BunJSCModule.h` | 40554 | `4b89e7a19c749fcfbdf7038ef603557e204cb936` | `0bcf149c473d136ce431dd648e57b40b3d3834c3c798e3828abda6263d177c5e` |
| WebKit `Source/JavaScriptCore/runtime/SamplingProfiler.cpp` | 53816 | `8a87e02f21fc358ce47c8e93f193541c5c120c11` | `e6f118d269ad441bbe91f5f34caae523292fa9610f5b341039079bf4c63e93eb` |
| WebKit `Source/JavaScriptCore/runtime/TestRunnerUtils.cpp` | 5130 | `02e807c735cd4997241e9de683654f2ad1793758` | `46c999ff6bfe93eb6cf205d7bf28d514ba1ccd2ac83e621d4eb2f9bdb9b16546` |

## 源码能够确认什么

1. `BunJSCModule.h:702-708` 将 `profile` 第二个参数按微秒转换.
   原 [固定夹具](../../tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/assets/jsc-pressure.mjs)
   的 `1000` 因而是 1 毫秒采样间隔. 这不是 1000 毫秒, 也不是要求获得 1000 个样本.
   调度、栈采集和目标命中仍不保证每毫秒产生一个有效目标样本.
2. `BunJSCModule.h:722-730,754-755` 先形成返回的栈 JSON, 然后 pause/clear;
   下次调用再次 notice/start. 此处明确没有调用会永久关闭 profiler 的 shutdown.
   因此不能只凭后续调用样本少, 就归因于源码中已经避免的“一次性 shutdown”行为.
   本次没有采集失败时 profiler 线程的运行状态.
3. `SamplingProfiler.cpp:614-623` 通过 `walkUpInlineStack` 生成内联语义帧,
   使用机器 code block 的 JIT 类型. `1107-1125` 将名称和 category 写入 JSON.
   额外 `inliner` 字段的采集条件不等于普通内联帧展开的条件.
   原夹具会遍历每条 trace 的所有 frame; 不能未经观测就断言“函数一旦内联必然漏计”.
   具体 PC 的 code-origin 恢复、unknown frame 或名称变化仍需动态证据.
4. `TestRunnerUtils.cpp:63-79` 返回 baseline code block 的 DFG 编译计数;
   优化 JIT 被禁用时返回 `1000000` sentinel. 原失败的 `3` 不属于该 sentinel,
   但计数本身不报告当时执行的 tier、OSR 状态或采样期间的目标驻留时间.
   `optimizeNextInvocation` 调用也不能代替实际目标帧证据.

上述结论只约束解释, 没有定位根因. 当前没有证据把失败确定归因于内存压力、
采样线程饥饿、内联、deoptimization 或页大小; 不根据事后的 MemAvailable 反推失败时资源.

## 现有记录的缺口及下一次独立诊断

原夹具最多四次 profile, 每次回调按 300 毫秒截止时间和 100000 次调用上限运行, 最终要求
至少三个目标样本. 抛出“样本不足”断言时, 累计 tier 数量和编译计数会进入 stderr,
但完整结果行尚未输出. 因而原失败没有逐次 profile 的调用数、耗时、总 trace 数、
unknown/其他函数分布和目标帧证人. 无法从累计 `DFG=2` 恢复这些缺失数据.

后续用独立诊断资产保留这些字段, 不修改原七模式夹具、Java 测试、语义 validator、
JIT 选项或预算. 每次 profile 记录调用数增量和回调耗时、总 trace/frame 数、
有界函数/category 分布、目标帧证人, 以及采样前后的编译/重优化计数.
诊断输出有独立上限, 按原始实际字段记录, 缺失值用 null;
保留未复现、失败、超限和工具失败, 不用新增等待、`noInline` 或放宽门槛使旧失败通过.

动态结果需要重新绑定诊断源码、APK、实际页 ABI、每轮运行和 UID 清理;
诊断通过不增加原 Binder/pressure/baseline 的接受数. 当前两个 JSC AVD 和原 APK
均保留, 可以继续上述工作, 没有为了本次源码审阅启动新的设备或构建.
