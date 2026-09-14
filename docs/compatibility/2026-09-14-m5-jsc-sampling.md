# M5: 独立 DFG 逐次采样诊断

2026-09-14, 新增独立有界诊断并完成 API 36 原生 x86_64 双用户页大小各两轮观测.
四次都在第一次 profile 内满足原三样本门槛, 没有复现历史 `DFG=2, compiles=3` 失败.
这完成了逐次采样取证工具和首批动态观测, **没有确定原失败根因或证明稳定性**.

[源码/APK/原始输出/清理 JSON](2026-09-14-m5-jsc-sampling-diagnostics.json) 与
[构建和设备收尾补充](2026-09-14-m5-jsc-sampling-checkpoints.json) 单独保留.
原 [十三补丁压力失败](2026-09-14-m5-thirteen-patch-jsc-pressure-sampling-failure.json)、
[同 APK 完整复测](2026-09-14-m5-thirteen-patch-jsc-pressure.json) 和所有历史报告不变.

## 独立工具与边界

源码提交 `8af825b85a0f67da97dde7c294422e90cab86683`. 新诊断资产与 instrumentation
只加入 opt-in JSC 测试源集, 通过真实生产 Binder 服务、相同 AAR 和锁定 supervisor 执行.
原七模式资产、Java 测试、语义 validator 和资源预算逐字节不变; 原八项 Binder 方法不变.

诊断保留原目标热函数、独立 BigInt 算术对照、128 次预热、`noFTL` 和优化请求.
profile 间隔仍为1000微秒, 每次回调仍以300毫秒/100000调用为上限, 最多四次,
DFG 帧达到三个即停止. 源码最多16 KiB, 输出64 KiB, 测量工作阶段小于20秒,
Binder超时25秒. 没有新增等待、`noInline`、优化阈值或其他 JIT 环境设置.

新增字段包括每次 callback/profile 时间、实际调用数、采样前后编译和重优化计数,
总 trace/frame 数、不同时间戳数量、目标与全部函数的层级统计、目标栈深度,
最多16个函数/category分布项及溢出帧数, 最多三个目标证人. 分布统计在 profile 返回后进行.
新增观测代码与独立程序结构仍可能扰动优化/调度; 本记录不能代替未改动原套件的复现.

先输出完整诊断, 再按原 count/compile/no-FTL/不同时间戳规则选择 exit0 或 exit1.
若样本不足, 完整收集仍可成功, 但必须保留 `originalGatePassed=false`、exit1和失败终态;
超时、异常、输出错误和清理失败不能通过收集校验. 本次四轮实际都是exit0;
低样本exit1保留能力只有严格正/反向构造测试, 不冒充本次设备已触达该分支.

## 固定字节与构建

没有重建 Bun、WebKit 或 ICU. 复用十三补丁 `e8b1296169a8e6f20c81e926dba6448afb25cd11`
大页 JSC 的90609496-byte完整成品,
SHA-256 `17c7941a32669e0cf2d6915bf94d8cee8421c3df605eddcf2b493687f20e98a8`.
旧候选和 baseline/官方锁不变, 已清理的编译缓存没有被补回.

新主/test APK只构建一批, Gradle实际exit0, 27秒, 80任务/12执行/68 up-to-date.
87个 canonical 输入逐项匹配 `8af825b`; 两个环境复用相同APK. 安装前后完整APK摘要,
运行时和监督器payload、签名和16 KiB ZIP/ELF对齐均通过.

| APK | bytes | SHA-256 |
|---|---:|---|
| JSC实验主APK | 42955988 | `dee88d927b154d4fe176420d50153cc3f9a4c81891873f6ef8723c699019569a` |
| androidTest APK | 2502975 | `08465432d5be940e83ff1651ca7ae99048be043609d98799cdd4417a3798909f` |

## 实际观测

每轮先停止实验包并确认执行UID无进程, 再以新服务/新Bun进程运行一个DFG诊断.
表中调用数只计采样回调, 不含128次预热. 每轮均只执行一次profile, 没有重试.

| API36环境 | 轮次 | 回调ms | 回调调用数 | 总trace | 目标DFG帧 | 目标Baseline帧 | 编译计数前/后 | 重优化计数前/后 |
|---|---:|---:|---:|---:|---:|---:|---|---|
| x86_64 / 用户4096 | 1 | 300.099 | 2634 | 57 | 9 | 0 | 1/2 | 0/2 |
| x86_64 / 用户4096 | 2 | 300.046 | 2980 | 77 | 16 | 0 | 1/1 | 0/1 |
| x86_64 / 用户16384 | 1 | 300.059 | 7748 | 108 | 103 | 1 | 1/2 | 0/2 |
| x86_64 / 用户16384 | 2 | 300.046 | 11672 | 140 | 91 | 1 | 1/2 | 0/2 |

四次总帧数分别288/389/643/790, 不同trace时间戳数等于各次总trace数,
全部目标帧位于栈顶, 十二个保留的DFG证人均为frameIndex0.
目标FTL和未知category帧均为0, 直方图没有溢出, 测量工作阶段312-327ms.
编译计数是辅助状态, 这里的目标执行层由实际采样帧给出.

4 KiB两轮的直方图分别含41/47个 `now` 帧. 16 KiB两轮分别含1/47个调用者 `invoke`
的FTL帧, 同时目标函数的FTL帧仍为0. `noFTL`只施加于目标函数,
不能把DFG模式解释为全进程关闭FTL. 全函数分布和目标匹配需要分别保留.

这些数据表明, 固定间隔/回调预算并不等于固定目标采样数; 不能从 `compiles=3`
反推出三个目标样本或持续处于DFG. 本轮没有证明计时调用、内联、重优化、内存压力或页大小
导致历史失败. 两台AVD的系统镜像和内核不同, 调用数差异不作为页大小性能对比.
MemAvailable仅保留本轮前后快照, 不回推原失败时的资源状态.

两个环境均以验证过的x86 ELF原生执行, 不使用可用的ARM翻译桥.
AT_PAGESZ、Android sysconf与getconf一致. 4 KiB镜像为内核6.12.38,
16 KiB用户ABI镜像为内核6.6.66; 两台Bun的KernelPageSize和shell的KernelPageSize/MMUPageSize均4096.
用户16384是x86模拟ABI, 不是ARM64硬件16 KiB或跨设备性能证据.

## 清理与下一步

两个实验包每台均卸载. 4 KiB主/test UID为10226/10227, 16 KiB为10213/10214,
四个UID最终进程数均0. 仅关闭本次启动的两个专用AVD5580/5582;
原有五台手机、默认ADB和其他任务的API37/5594未被操作.
UID归零为runner实际执行ps后的结构化计数, 本批没有另存完整原始ps列表;
不能把结构化结果描述为已保存的逐进程原始快照.

全部41个Node测试文件通过259/259, 包含新的采样正/反向校验及原压力/Binder验证器.
测试子进程实际exit0; 外层Python在随后向GBK控制台打印Unicode日志尾部时报错exit1,
成功测试receipt先已写入. 两种结果分开保留, 仅重新读取原日志确认, 没有重跑测试.
官方runtime/supervisor与APK/release校验通过. 生产四项Gradle实际exit0, 25秒,
96任务/48执行/48 up-to-date; 21项JVM使用已有成功结果.
IDE构建直接返回isSuccess=true、problems为空, 没有超时.

原112份兼容报告和217个矩阵行保持原样. 新诊断及清理补充仅作索引,
兼容接受数增加0; baseline仍560/560探针和128/128 Binder,
原JSC回归仍为单独32/32 Binder和28/28压力模式.

继续调查采样不足时, 使用单独命名、事先固定且有上限的观测批次,
保留每次失败和本轮字段, 不靠持续重试或减少样本门槛得出稳定性结论.
本轮只覆盖首次profile便达到门槛的路径, 尚无新设备上的多capture低样本分支证据.
若故障复现, 先比较总trace、目标占比、采样前后状态和完整生命周期, 再设计一个可检验的因素对照.
原API28 watch SIGABRT、其他syscall/FD/API/OEM、长时压力/性能和签名Release仍开放.
官方API33+、生产service/AAR/native与 `distributionReady=false` 不变.
