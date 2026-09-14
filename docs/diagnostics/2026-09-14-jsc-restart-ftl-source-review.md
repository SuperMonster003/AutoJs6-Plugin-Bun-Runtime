# 四段 JSC 采样与 FTL 帧恢复: 固定源码补充

[四段动态诊断](../compatibility/2026-09-14-m5-jsc-restart.md)的4KiB第二轮正常模式第四段
执行9766次已检查的目标调用, 保留126条trace, 目标函数帧为0, 调用者 `invoke` 的FTL帧为125.
当前阶段名称、时间区间及其余栈帧正常. 本文检查这条新线索对应的源码, 不宣布历史2<3根因.

## 来源绑定

Bun固定于 `e8b1296169a8e6f20c81e926dba6448afb25cd11`, WebKit固定于
`0f966e81b78c84bb23213e391bc679c4ef83e56b`, 对应未重建的十三补丁JSC候选.
两个本机Git工作树均干净, 以下14个完整文件逐字节匹配固定提交的 `git show`,
计算所得Git blob也匹配 `rev-parse <commit>:<path>`.
各文件bytes、完整SHA-256和Git blob保存在
[新补充JSON的sourceReview](../compatibility/2026-09-14-m5-jsc-restart-checkpoints.json).
旧[三文件源码审阅](2026-09-14-jsc-sampling-source-review.md)保持不变.

| 仓库 | 文件, WebKit路径前缀为Source/JavaScriptCore/ | 本次相关位置 |
|---|---|---|
| Bun | src/jsc/modules/BunJSCModule.h | 550-560 noFTL, 678-756 profile |
| WebKit | runtime/SamplingProfiler.cpp | 336-370 timer, 614-715帧恢复, 745-798启停/清理 |
| WebKit | runtime/VM.cpp | 502-509,527-528开关, 750-757 ensureSamplingProfiler |
| WebKit | runtime/VM.h | 1069-1070开关访问, 1292初始值 |
| WebKit | runtime/OptionsList.h | 482 alwaysGeneratePCToCodeOriginMap |
| WebKit | runtime/ScriptExecutable.h | 73-83独立优化和内联属性 |
| WebKit | dfg/DFGCapabilities.cpp | 46-49,77-114普通/闭包/构造内联候选 |
| WebKit | dfg/DFGByteCodeParser.cpp | 1799-1810能力检查, 1870附近inlineCall |
| WebKit | ftl/FTLCapabilities.cpp | 564-574整个图的FTL资格 |
| WebKit | ftl/FTLState.cpp | 71-76 B3映射请求 |
| WebKit | ftl/FTLCompile.cpp | 324-327映射物化 |
| WebKit | ftl/FTLJITCode.h | 76映射访问 |
| WebKit | ftl/FTLJITCode.cpp | 167-185 OSR/lazy slow-path查找 |
| WebKit | bytecode/CodeBlock.cpp | 3707-3729 findPC路径 |

## 能确认的源码关系

1. Bun每次 `profile` 调用ensure/notice/start, 报告后pause/clear. WebKit的startWithLock
   清除paused, 现有timer线程在pause期间保留循环. 本批四个唯一阶段与不重叠时间戳支持
   重新采集且不混入旧阶段的外部行为, 没有直接测量线程身份, 也不是所有VM生命周期证明.
2. Bun的 `noFTL`仅设置目标FunctionExecutable的 `neverFTLOptimize`.
   `ScriptExecutable`中 `neverInline`是另一属性, `isInliningCandidate`只检查后者.
   DFG内联候选路径对DFG/FTL调用者使用各自字节码成本阈值, 再检查 `isInliningCandidate`;
   整图FTL资格检查则检查该图所属的executable是否禁止FTL. 因此对目标施加noFTL
   不等于禁止目标进入FTL调用者的内联图. 本批没有保留实际内联图, 不能由候选资格推出实际内联.
3. VM的PC映射开关初始为false. `useSamplingProfiler`或
   `alwaysGeneratePCToCodeOriginMap`等显式路径可将它设为true, 后一个选项默认false.
   本文检查到的 `ensureSamplingProfiler`只创建profiler并请求entry-scope服务,
   没有设置该映射开关. Bun的 `profile`入口也没有直接设置它.
   Debugger等其他VM状态可能影响它; 本轮没有读取运行时开关, 不把源码默认值冒充实测false.
4. FTLState在VM请求映射或IR/source dump开启时要求B3生成PC到origin数据;
   FTLCompile仅在VM的映射开关为true时构造JSC的PCToCodeOriginMap.
   `CodeBlock::findPC`先查此映射, 再查属性inline-cache, 最后转至具体JITCode的查找.
   FTL的后者只遍历OSR退出代码和lazy slow-path, 找不到则返回nullopt.
   这说明缺少完整映射时普通FTL PC可能没有精确CodeOrigin, 不是“所有FTL PC都无法恢复”.
5. SamplingProfiler对优化的栈顶先用 `findPC(topPC)`. 找到origin后展开内联栈;
   没找到则保留startIndex0, 转入基于机器frame和callSiteIndex的路径.
   后者可能从call-site恢复origin, 也可能只追加机器code block. 因此“内联必然漏帧”仍不成立;
   精确PC映射缺失和call-site信息不足是可检验的条件, 不是本次已捕获的内部状态.
6. 成功恢复的内联语义帧使用 `machineCodeBlock->jitType()`. 若目标内联于FTL机器代码,
   即使目标自身禁止单独FTL编译, 恢复出的目标帧仍会标为FTL.
   所以开启PC映射即便补回名称, 也不必满足旧DFG模式“目标无FTL”的门槛.
   不能把任何目标名称样本都改计成DFG, 也不能用全函数DFG数代替目标DFG数.

## 观测、假设与下一步

已观察到的是同一进程中第三段的目标DFG118/invokeDFG118, 与第四段的目标0/invokeFTL125,
同时目标调用、当前阶段和profiler继续运行. 两段编译/重优化计数均为3/2,
直方图无溢出. 本批没有捕获具体机器PC、内联决定、map指针或findPC失败返回值.

由这些观测和源码作出的假设是: 调用者FTL转换后, 内联目标的源码帧恢复可能不足,
从而出现目标工作持续执行而目标名称消失. 它还不是确定原因, 也不能回填原2<3故障缺失的字段.
新诊断的回调结构不同于原压力程序; 时间采样只代表被观察到的栈, 不是全部指令追踪.

下一次对照需独立命名并预先固定次数/预算, 在相同native与业务夹具字节上只改变一个已验证
实际生效的观测选项, 并保留FTL/DFG的真实分类. 优先取得内联决定或比较PC映射开启前后的
目标帧恢复, 同时明确优化和观测扰动. 无FTL转换或目标未消失的运行应保留为未复现;
没有完成选项生效证明时不能声称完成单因素验证. 本轮没有执行这个额外对照,
没有修改native、旧压力/采样夹具、JIT选项或接受门槛.
