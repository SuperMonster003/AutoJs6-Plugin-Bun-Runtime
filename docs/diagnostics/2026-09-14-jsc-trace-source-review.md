# JSC 完整trace与inliner导出: 固定源码和动态见证

本补充配合 [本批固定诊断](../compatibility/2026-09-14-m5-jsc-trace.md),
核对额外 profiler 数据、完整 JSON 帧、CodeOrigin 的机器帧关联及位置编码.
固定 Bun 为 `e8b1296169a8e6f20c81e926dba6448afb25cd11`, WebKit 为
`0f966e81b78c84bb23213e391bc679c4ef83e56b`. 两个树均干净, 20 份完整源文件逐字节
匹配固定 Git 对象, bytes/SHA-256/blob 写入
[sourceReview](../compatibility/2026-09-14-m5-jsc-trace-checkpoints.json).
此前 [18 文件审阅](2026-09-14-jsc-pcmap-source-review.md)全部重验, 新增 BytecodeIndex.h/cpp.
本次未更改原生源码或重建 Bun/WebKit/ICU.

## 额外数据与导出位置

| 固定源码 | 相关位置 | 核实的作用 |
| --- | --- | --- |
| Source/JavaScriptCore/runtime/OptionsList.h | 475 | collectExtraSamplingProfilerData 默认 false |
| Source/JavaScriptCore/runtime/SamplingProfiler.cpp | 432 | 额外数据可添加一个 CCode 顶层帧 |
| 同上 | 502-508 | 由 bytecode offset 写入源位置和 BytecodeIndex, 同时保存 CodeBlock hash 和传入的 JIT tier |
| 同上 | 614-638 | 沿 inline stack 展开语义帧; 所有展开帧使用机器 code block 的 JIT tier; 额外数据开启时给内部帧设置 machineLocation |
| 同上 | 984-1019 | 将 hash/tier/bytecode 编为 location 字符串 |
| 同上 | 1102-1150 | 完整导出 frame 与可选 inliner 的名称、位置、层级等字段 |
| 同上 | 1155-1164 | trace 的 JSON 为 timestamp 与全部 frames |
| Source/JavaScriptCore/bytecode/BytecodeIndex.h | 54-60, 85-89 | 4 个 checkpoint, 低两位编码 checkpoint, 偏移占其余位 |
| Source/JavaScriptCore/bytecode/BytecodeIndex.cpp | 33-41 | 输出 bc#offset, 非零 checkpoint 再追加 cp#checkpoint |

`appendCodeOrigin` 沿内联栈输出内层语义函数直到外层机器函数.
启用 collectExtraSamplingProfilerData 时, 它取最后一帧的机器位置, 为同次展开的
前面各帧设置 `machineLocation`. 导出 `inliner` 时, 名称取对应机器 code block,
位置来自该机器位置, tier 仍为实际机器层级. 因此本批校验同栈较外层的帧是否与
inliner 的 name/location/category 相同, 不只按函数名或两个直方图计数推定关联.

location 形式为 `#<六字符hash>:<tier>:<BytecodeIndex或nil>`.
本批已关联的目标为 `#EoFuS3:FTL:bc#57` 或 `bc#69`, 外层为
`#DawGsb:FTL:bc#92`. 校验器保留合法 `<nil>` 与可选 cp#1-3, 拒绝 tier 不一致、
越界偏移、缺失字段、伪造顺序或没有相同机器帧的关联. 未知/宿主/CCode 帧原样保留,
不会把它们的特殊位置强行改成 JS CodeBlock. 原始 4294967295 源位置哨兵也不改写为有效位置.

本批增加的 extra-data 与原 PC-map/logging 选项都经最终 dump 核验.
在固定 Options.cpp/VM.cpp 中没有找到 extra-data 与 PC-map 强制开关耦合;
没有启用会另外设置 VM 映射请求的 `useSamplingProfiler`.
extra-data 自身可增加 CCode 帧, 新 JS 又在 profile 返回后处理完整 trace,
所以原始顶层帧、所有时间和汇总都保留, 不宣称这是无扰动观测.

## 本批证实与未证实的边界

开启组的四份首次完整 FTL 见证, 直接给出目标帧的 inliner 与 index 1 的 invoke
机器帧相同. 名称/hash 再与同进程的 FTL 编译器内联记录匹配. 这比此前仅有直方图
多了实际逐栈身份关系, 可说明这些目标 FTL 语义帧来自 invoke 的机器 code block.
结合已有源码中 noFTL 与 neverInline 分离的事实, 这些帧不要求目标自行完成独立 FTL 编译.

FTL 编译器日志仍仅为图解析时的内联决定, 不是完成/执行通知.
16384 第一轮开启组两条此类决定均未伴随 profile 中的 FTL 样本.
夹具对所有 trace 计数得到 90 条目标/机器关联; 主机实际取得并独立核验的是
四份完整 FTL 见证, 不能把汇总计数说成保存了 90 份原始栈.

关闭组保存三份目标缺席的调用者 FTL 栈. 第一轮第四段的全部 64 条 trace 无目标帧,
同段目标调用 5030 次. 首份调用者位置为 `<nil>`, 与条件 PC 映射路径一致,
但另一段的首份缺席栈为 `bc#127`. 所以缺席本身不证明该采样瞬间 PC 位于被内联目标内,
也不能把所有缺席栈概括为没有任何 bytecode 信息.

这些 JSON 字段已经由 JSC 处理过. 本批没有读取原始机器 PC、实际 PCToCodeOriginMap
指针、每次 findPC 的输入/返回值或完整编译图. 四条同栈关联为直接导出的身份见证,
关闭组全段缺席与映射的成因解释仍受这些边界限制.
旧压力 2<3 失败缺少当时逐轮数据, 新夹具/选项也会改变时序; 本批不能补造其原因或
稳定性结论. 若继续追踪, 应预先定义新的有限观测范围, 保留当前批次及所有旧失败,
不修改原 fixture/validator/门槛来取得通过.
