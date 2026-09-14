# PC映射选项、内联日志与FTL采样: 固定源码补充

[本批动态报告](../compatibility/2026-09-14-m5-jsc-pcmap.md)在相同JS工作负载上改变
`alwaysGeneratePCToCodeOriginMap`, 同时记录最终选项和编译器内联决定.
本文件补充选项的实际生效链路与日志含义, 保留
[前一批14文件源码审阅](2026-09-14-jsc-restart-ftl-source-review.md)的历史边界.

固定Bun仍为`e8b1296169a8e6f20c81e926dba6448afb25cd11`, WebKit仍为
`0f966e81b78c84bb23213e391bc679c4ef83e56b`. 两个工作树干净, 18个完整源文件
逐字节匹配固定提交的Git对象, bytes/SHA-256/Git blob全部写入
[sourceReview补充](../compatibility/2026-09-14-m5-jsc-pcmap-checkpoints.json).
本批复用原14个文件并增加以下四个, 没有native编译.

| 仓库 | 文件 | 本次相关位置 |
|---|---|---|
| Bun | src/jsc/bindings/ZigGlobalObject.cpp | 287 JSCInitialize, 291禁用JSC环境选项, 300定制回调, 356起BUN_JSC选项 |
| WebKit | Source/JavaScriptCore/runtime/Options.cpp | 755-783 dump, 1075默认值, 1128定制, 1147-1156 finalize, 1260-1277覆盖记录, 1375-1408逐项输出 |
| WebKit | Source/JavaScriptCore/jit/JITCode.cpp | 49-63层级名称, 328 printInternal |
| WebKit | Source/WTF/wtf/SixCharacterHash.cpp | 55起六字符base62编码 |

## 最终选项的证据链

Bun入口禁用上游`JSC_*`环境读取, 在JSC选项定制回调中逐项处理`BUN_JSC_*`,
通过`Options::setOption`设置值并进行coherence检查. 该路径发生在VM建立前.
`Options::finalize`完成一致性处理后调用`executeDumpOptions`;
`dumpOptions=1`输出Modified JSC options, 仅列出被显式覆盖的选项.
`setOptionWithoutAlias`即使设置为默认false也记录wasOverridden,
因此关闭组的显式false有可验证输出, 不需把未出现的项推定为false.

本批八份stderr都包含三个且仅三个覆盖项: dumpOptions=1、
printEachDFGFTLInlineCall=true、alwaysGeneratePCToCodeOriginMap=false/true.
主机按固定格式、默认值和唯一性验证; 请求环境与这些实际输出单独保存.
由此确认所设JSC选项最终生效, 不是仅确认环境变量被写入请求.

前次已绑定的VM.cpp将alwaysGeneratePCToCodeOriginMap转为VM的映射请求;
FTLState/FTLCompile据该请求生成并保存PCToCodeOriginMap.
本批读取的是最终选项, 没有直接读取VM布尔成员、map指针、具体PC或findPC返回值.
关闭该选项也不等于直接证明所有其他可能影响映射的VM状态均为false.

## 内联决定与实际执行的区别

DFGByteCodeParser的inlineCall日志保留编译计划的jitType,
以及callee/caller的inferredNameWithHash; JITCode将该层级输出为DFG或FTL,
CodeBlock连接函数名称和hash, WTF编码保证hash是六个base62字符.
本批日志既有匿名内部函数, 也有
`jscPressureHotLoop#EoFuS3 -> invoke#DawGsb`的FTL内联决定.
校验器允许合法空名称, 限制行长/条数/名称长度, 不把未知行吞掉.

这个日志位于编译中的内联路径, 不是编译完成通知, 没有profile阶段时间戳.
4KiB第一轮关闭组和16KiB第二轮开启组都有目标进入invoke的FTL决定,
但四段profile没有采到FTL执行帧. 这些运行必须保留其观测结果,
不能由日志推出对应FTL机器代码已在观测窗口执行.

4KiB开启组另有三段实际FTL采样: 目标与invoke直方图分别同时记录94、36、25帧,
累计155. 固定源码表明目标的noFTL只限制其自身FTL编译资格,
内联资格由单独neverInline属性控制; 恢复内联语义帧时SamplingProfiler使用
机器code block的jitType. 这支持目标名称在FTL调用者中被恢复后呈现FTL的解释,
不能把这些帧改称DFG, 也不能把它们当作noFTL选项失效的单独证据.

## 仍缺少的直接观测

本批原JS资产保留函数/tier直方图、目标trace计数和三个DFG样本见证,
没有新增FTL原始栈、采样PC或机器code block身份字段.
关闭组两段invoke FTL共12帧与目标DFG混合存在, 完整目标缺席没有重现.
因此当前结果支持映射与名称恢复的关联及机器tier解释,
不能逐条配对关闭组的FTL栈来证明目标缺失原因, 或还原编译的完整内联图.

共同日志和映射选项会扰动编译、分配及时间; 两组FTL转换时机也不相同.
本批固定两轮/反转顺序用于有界对照, 不代表充分统计、稳定性或性能测量.
原压力2<3故障缺少逐次数据, 其根因门槛仍开放.
继续时需单独定义逐trace/CodeOrigin证据字段与固定上限,
保留当前报告和所有原fixture/validator/预算, 不追加到本批来替换未复现结果.
