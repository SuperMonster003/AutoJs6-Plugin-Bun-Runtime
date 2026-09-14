******

### 发行历史

******

# v0.2.2

###### 2026/09/12

* `新增` 新增多文件项目的插件侧工作区归档展开器 (M6): 有界 ZIP 快照经路径规范化, 拒绝穿越/绝对/反斜杠路径, 大小写与 Unicode 形式不敏感的重复检测, 文件/目录冲突检查, 条目数与字节上限, 入口文件校验和取消清理后, 原子展开到本次运行的私有工作区, 只创建普通文件和目录. 已发布的契约 v1 仍只执行单个源码; 归档请求键的提案见 docs/design/m6-workspace-archive.md
* `修复` 修复实验 watch 重载在 close_range 失败时泄漏描述符的问题: 在 exec 前使用既有有界 raw syscall fallback 为实际 FD 标记 CLOEXEC, 设置不完整时停止执行. 保留 stdio, 显式 IPC 和原信号生命周期. GCC/Clang 完整源码对照覆盖真实 exec, 高位 FD, 降低后的硬限制和注入失败; 新 native 构建与不变的 Android 套件分别记录. 历史失败, 官方产物及发布边界保持不变
* `修复` 修复 Bun 源码更新后历史实验 JSC 候选的校验: 绑定完整且不可变的构建归档, 新构建仍严格核对当前输入
* `修复` 修复实验 Android epoll 等待提前交付调用者已屏蔽的 pending 信号: 保留 caller mask, 并在调用点维持已有 epoll_pwait2 禁用. GCC/Clang 回归直接编译修复前后的完整等待函数; 全新 native 构建与原定义设备套件独立取证, 保留十一补丁失败档案及官方支持边界. 原定义套件在五个原生 4 KiB 环境各两轮通过: 应用探针 330/330, Binder 80/80. 两次 API 28 ART 启动失败单独归档, 第三次相同 APK 两轮通过; 新源码原固定套件的三星 ARM64 设备门禁已补齐; JSC rebase 已另行记录
* `修复` 历史十一补丁结果: 修复实验 Android spawn 提前交付 pending SIGSYS: 父线程保留调用者 mask, 仅子路径允许设置阶段的信号处理, 调用者屏蔽 SIGSYS 时使用既有子进程 cgroup 加入路径. GCC/Clang 主机回归覆盖完整生产函数及旧源码失败对照; 新源码构建和设备证据独立记录, 不转移历史验收或扩大官方支持. 设备复测确认 spawn 返回时信号保持, 但异步等待期间仍提前交付; 独立只读 epoll 寄存器/掩码证据定位下一处阻断, 完整 33 项门禁仍未通过
* `修复` 修复运行时启动检查的临时失败被永久缓存的问题: 失败完成后等待 30 秒, 在后续请求时重试, 并发请求共享同一次检查; 各检查输出流限制为 4 KiB. 保留本地化摘要, 增加 API, ABI, 阶段, 运行时身份, 退出码和重试诊断, 明确标注信号仅为推断; 原生字节及支持范围不变
* `修复` 修复实验版 Android 在屏蔽 SIGSYS 时首次异步 spawn 的 pidfd 探测崩溃, 通过既有 waiter 回退保留调用线程掩码及 pending 信号. 十补丁运行时在五个原生 4 KiB 环境通过原 31 项探针 (310/310) 和完整八项 Binder (80/80). 恢复构建完成证据时明确保留原退出码缺失, 单独归档首次 ART 启动失败. JSC rebase 及 Release 门禁仍开放, 官方字节不变
* `修复` 修复实验版原生 x86_64 16 KiB 的 JavaScriptCore 启动中止: 以显式大页/JIT/分配器配置重编 pinned WebKit 并重新链接 Bun, 在 4 KiB 和 16 KiB AVD 各两轮完整 Binder 通过 (32/32). 官方字节及其 4 KiB 防护保持不变, Release 验收另行进行
* `优化` 新增通过生产 Binder 服务执行的四个固定离线 TLS/IPv6 模式: TLS 1.2/1.3, 证书与主机名拒绝, 已验证 HTTPS, IPv6 TCP/UDP/HTTP. 绑定公开测试证书, 精确源码, APK 和两个包的 UID, 保持原套件计数与发布边界
* `优化` 新增通过生产 Binder 服务执行的四个固定离线 API 模式: 文件及目录监听, 实例级本地 DNS, 二进制 TCP 半关闭, HTTP 重定向/流读取/取消. 绑定精确源码, APK 和两个包的 UID, 保留失败记录, 原套件计数与发布边界保持不变
* `优化` 新增保留原七模式压力顺序, DFG 提前停止逻辑与断言的独立诊断. 在重新抛出失败前记录有界逐轮数据, 核对精确源码与两个包的 UID, 保持历史结果和兼容性计数不变
* `优化` 新增独立的完整采样栈与内联调用者诊断, 固定比较 PC 映射开关. 保留原热循环和门槛, 核验额外 profiler 选项的最终值, 每类保存首份完整栈并明确记录字节超限省略, 独立核对调用者身份和编译决定, 不增加兼容性通过数
* `优化` 新增有界 JSC 采样 PC 映射对照: 原样复用四段工作负载, 回读实际生效选项, 保留编译器内联决定, 真实执行层级及 exit 1. 第二轮反转对照顺序, 原夹具, 预算, 原生字节与支持范围不变
* `优化` 新增固定四段 JSC profiler 重启/清空诊断及明确不执行目标函数的 exit 1 对照. 保留阶段证人, 时间戳和原始 UID 清理证据, 不改变原压力/采样夹具或声称复现历史故障
* `优化` 新增独立有界 DFG 采样诊断, 记录逐次采样时间, 调用数, 栈帧分布和优化计数. 保留样本不足时的退出结果及精确源码/APK/UID 证据, 不改变原压力夹具, 预算, 运行时或兼容接受数
* `优化` 补充开发环境磁盘维护指南, 清理构建缓存与已退役模拟器时保留运行时来源, 测试产物和失败记录
* `优化` 单独锁定十三补丁大页 JSC 候选: 两次全新 Bun 清洁构建实际退出码均为 0, 完整成品一致且 21 项构建输入未漂移. 复用原独立 JSC 库及 ICU, 新 APK 与原 Binder/七模式压力回归独立绑定, 不转移历史成绩或扩大发布范围
* `优化` 为固定 watch/reload 诊断增加有界 SIGABRT 只读快照, 保留原信号交付及预算. 原生 ARM64 API 28/31 共 16 次 plain/traced 观察完成 32 次重载, 捕获 24 次普通 SIGSYS, 包和 UID 已清理; 未复现的原 API 28 中止原因仍开放, 不增加兼容通过数
* `优化` 新增固定 native/TRAP watch/reload 回归, 保留十二补丁原生字节和原33项. 四个 ARM64 / 4 KiB 真机环境中原项264/264通过, 新模式14/16失败, 32次重载暴露28次 FD继承泄漏; Sony 5.15原生对照通过, 强制TRAP失败. 保留三个源码绑定APK批次和早期校验器修正, 核对全部包及UID清理. native修复, 扩展兼容性和Release门禁仍开放
* `优化` 完成十二补丁 Samsung SM-F936U / API 32 / 原生 ARM64 / 4 KiB 回归: 两轮原探针 66/66, 完整 Binder 16/16. 与 API 36 批次复用同一组三个 APK, 40 个 pending 保持检查点和十二个 child 观测通过. 三个测试包卸载, 三个 UID 进程清零, 私有 ADB 关闭且无 AVD 操作. 原固定套件的两项三星设备门禁已补齐, baseline 七环境累计 462/462 探针和 112/112 Binder; 广泛 runtime, 压力和 Release 门禁仍开放
* `优化` 完成十二补丁原字节在 Samsung SM-A566B / API 36 / 原生 ARM64 / 硬件 16 KiB 的回归: 两轮原 33 项探针 66/66, 完整 Binder 16/16. 四个 pending 信号模式保留 40 个检查点和十二个 child 观测, 最后各向原 caller 交付一次. 复用同一 APK, 无 native 重建; 卸载后三个 UID 进程清零, 关闭本轮私有 ADB 且无 AVD 操作. baseline 六环境累计 396/396 探针与 96/96 Binder; ARM64 API 32, 广泛 runtime 和 Release 门禁仍开放
* `优化` 完成十二补丁大页 JSC 候选在 API 36 原生 x86_64 的 4 KiB/16 KiB 用户页回归: 同一 83 输入 APK 的原 Binder 通过 32/32, 固定压力模式通过 28/28. 初次低内存服务终止单独保留, 相同 APK 在不改设置或预算的完整重试中通过. 卸载后独立检查两个包 UID 均无进程, 区分 x86 页模拟, 三星 baseline 和 Release 门禁
* `优化` 单独锁定十二补丁大页 JSC 候选, 两次全新 Bun 清洁构建一致, 保留实际退出码并验证 21 项构建输入未漂移. 精确复用原独立 JSC 库和 ICU, 保留历史候选, 让隔离 Binder 工具使用新的源码锁. 原压力夹具, 语义校验器与预算不变, 设备和 Release 验收另行记录
* `优化` 新增固定 pending-SIGSYS spawn 探针与独立信号追踪: 原生 ARM64 API 28/31 的两个新模式各失败两次, 原 31 项全部通过; 八次追踪确认 SI_TKILL 提前交付. 归档失败, 源码/APK 绑定及清理记录, 不修改 native 字节或扩大兼容声明
* `优化` 运行错误摘要覆盖全部 10 种语言, 保留稳定错误码和有界技术详情; 激活, Android 要求, 超时与输出超限帮助直接取自同一组 Android 资源. 缓存的页大小拒绝按插件当前语言显示, 诊断截断保留完整 Unicode 字符
* `优化` 新增自动生成的兼容证据矩阵, 完整索引源报告并绑定历史归档摘要, 由 CI 检查同步漂移; 按运行时, 设备和套件保留结果及失败/初步诊断, 不增加设备验收或扩大正式支持范围
* `优化` 新十补丁大页 x86 候选在 API 36 的 4 KiB/16 KiB 用户空间页完成回归: 同一对 APK 绑定 77 项输入, 原 Binder 测试 32/32, 原固定压力模式 28/28 全部通过. 精确字节, 原始结果及清理另档保留, 不改写历史; x86 16 KiB 仍是 4 KiB 内核页上的 ABI 模拟, 不表示 Release 或性能验收
* `优化` 单独绑定十补丁大页 JSC 候选, 强制两份一致的 clean Bun 构建, 保留真实驱动退出码并精确复用原 JSC 输入. 隔离 Binder 工具改用绑定新源码的独立锁, 历史及官方字节保持不变; 设备与 Release 验收另行记录
* `优化` 新增中文排错指南, 提供最小脚本, 症状/原因/处理对照及有界问题报告指引, 并从十语言 README 链接, 不改变运行时能力
* `优化` 完成未改动十补丁运行时的三星回归: 原生 ARM64 API 32 / 4 KiB 与 API 36 / 16 KiB 使用完全相同的 APK, 各通过两轮原 31 项探针 (62/62) 和两轮完整八项 Binder (16/16). 七个原生环境累计探针 434/434, Binder 112/112. 精确绑定源码, APK 和清理证据, 未重编译 native 或操作 AVD; JSC rebase, 扩展运行时矩阵和 Release 门禁继续开放
* `优化` 新增独立 test-only SIGSYS 观察器: 原生 ARM64 API 28 四次失败直接定位 pidfd_open, 未追踪对照同样失败, API 31 对照通过. 绑定原始证据, 保留初版工具失败, 验证信号转发, 防篡改和清理; 此诊断不等于新运行时, Binder 或 Release 验收
* `优化` 新增两个固定 blocked-SIGSYS 异步 spawn 探针, 保持原 29 项定义和 native 字节不变: 四个原生 4 KiB 环境通过 248/248, 但 Sony API 28 的两个新模式各失败两次, exit 159 (整体 58/62). 四次失败独立严格归档, 兼容门禁保持未通过; 清理测试包, UID 进程和本轮 AVD, 不新增 Binder, 16 KiB 或 Release 验收结论
* `优化` 补齐 Samsung SM-A566B / API 36 上四种硬 FD 上限模式的原生 ARM64 16 KiB 验证: 同一 APK 和未改动的 29 项探针两轮通过 58/58, 含 8 次硬上限观测, 原生 close_range 与 forced-TRAP 回退均成功. 卸载后 UID 进程为零, 未操作 AVD; 七环境累计 406/406. 未重编 native, 未重跑 Binder, 不作为 Release 验收
* `优化` 确认 Samsung Galaxy Z Fold4 SM-F936U 实际为 API 32 / Android 12L, 原生 ARM64 / 4 KiB: 现有 Binder 两轮 16/16, 未改动的 29 项应用探针 58/58, 含全部 8 次硬上限验证. 精确绑定 APK/源码/原始证据, 卸载三个测试包并确认 UID 进程为零, 未操作 AVD. 原生字节不变; 新四模式的 ARM64 原生 16 KiB, 扩展矩阵与 Release 门禁仍开放
* `优化` 保留原 25 项定义和运行时字节, 新增四项 Android FD 硬上限探针: 五个原生 4 KiB 环境各两轮 29/29 (合计 290/290), 含 40 次硬上限验证. 软/硬上限降至 128 后启动 CLOEXEC 和两种 spawn API 均正确, 应用和 supervisor 上限不变. 绑定原始证据, 清理测试包和本轮 AVD; FD 70000, 新用例原生 16 KiB 与 Release 门禁仍开放
* `优化` 新增独立有界 JSC 压力验收: API 36 x86_64 的 4 KiB 与模拟 16 KiB 用户空间页各两轮通过七种离线模式 (28/28), 包含 LLInt/Baseline/DFG/FTL 实际采样, GC, Wasm 及 64 个 worker 正常退出. 同一 APK 的原有 Binder 套件另行通过 32/32. 单独记录 4 KiB 内核映射, 保留早期工具运行结果并清理本轮设备; 原生字节, 正式支持范围及 Release 门禁不变
* `优化` 补齐 API 29/32 原生 x86_64 / 4 KiB 验证: 各两轮新增 Binder 32/32 与未改动的应用探针 100/100, 完成现有 Binder 套件的 API 28-32 x86 版本覆盖. 新增拒绝原始报告/源码/清理记录不一致的归档工具; 保留历史证据, ARM64 API 32 和 Release 门禁仍开放, 仅关闭本轮启动的两台 AVD
* `优化` 新增独立包名的可选 test-only 实验插件, 复用生产服务及完整 8 项 Binder 套件验证锁定的九补丁 Bun: 九个原生环境各两轮全部通过 (144/144), 包含 ARM64 16 KiB; 保存 APK/源码绑定与清理证据, 不扩大稳定版支持范围
* `优化` 在不改变运行时字节和原 24 项探针的前提下, 新增内部 lchmod/fchmodat2 固定离线 CLI 探针: 含 ARM64 16 KiB 的六个原生环境各两轮 25/25, 合计 300/300. 验证权限修改, 重复链接, 不跟随符号链接, 被忽略的 EIO 及 SIGSYS 路径触达与有界线程回收; 保留早期夹具失败, 卸载测试包并关闭本轮 AVD. 完整实验 Binder 与 Release 门禁仍未完成
* `优化` 在 Samsung 原生 ARM64 / API 36 / 16 KiB 使用相同 APK 和未改动的 24 项套件验证九补丁实验 Bun: 两轮 48/48, 全部 48 项路径断言通过, 12 次越界请求均拒绝测试哨兵; 测试包卸载后 UID 进程为零, 未启动或关闭 AVD. 完整实验 Binder, Release 和 x86_64 16 KiB 门禁仍未完成
* `优化` 构建阶段校验 64 位原生库的 16 KB 页大小对齐, 检查 manifest 契约并输出 JSON 报告
* `依赖` 将在线 platform-versions 插件与仓库要求的 1.8.0 对齐, 保持 native-alignment 插件不变

# v0.2.1

###### 2026/09/10

* `提示` 尚未发布的开发快照; 正式插件仍要求 Android 13 (API 33) 或更高版本
* `修复` 以锁定的 MIT FD 相对路径回退保留 openat2 不可用时的实验静态目录服务: 固定路径组件, 解析根内链接, 拒绝根外与魔术链接, 限定遍历并管理错误和 FD 所有权; 不改变普通 Bun.file/node:fs 访问, 官方运行时字节或 Android 13 最低要求
* `修复` 通过锁定的 MIT 补丁修复实验运行时 Linux spawn FD 回退: 使用固定栈缓冲区与原始 syscall 枚举实际描述符, 覆盖降低软/硬限制前已打开及超过旧 65536 上界的 FD, 隔离不完整时在 exec 前受控失败; 新增 vfork/exec, 错误, 符号与旧实现对照回归, 不改变官方 Bun payload 或 Android 13 下限
* `修复` 以锁定的 MIT 补丁修复实验 Bun 的启动 CLOEXEC 回退: 枚举实际打开的描述符而不限制 fd 编号, 保留 fd 0-3, 标记未完成则明确退出; 新增原生错误/边界测试, 分离构建输入验证与运行时验收, 不改动正式 runtime 或 Android 13 最低要求
* `修复` 修复正式插件在超时, 取消和输出超限时的进程回收: 使用摘要锁定的只读监督器, 将被忽略的 SIGTERM 升级为 SIGKILL, 等待直接 Bun 子进程退出并保留待排空的输出; Bun 1.4.0 和 Android 13 最低要求不变
* `修复` 通过原文件编译共享 SupervisedProcess 并打包锁定监督器, 修复 patched Bun 独立探针的终止路径; schema 2 构建收据绑定源码, 工具链和 helper 字节, 输出读取器保持到终止后再关闭
* `优化` 验证目录回退修复: 双 ABI 各两轮清洁构建逐字节一致, 五个原生 4 KiB 环境按原 24 项断言各两轮通过 (240/240), 原先失败的 60 项越界断言全部拒绝哨兵且普通目录服务保留. GCC/Clang 与 GCC ASan/UBSan 测试通过, 测试包及本轮 AVD 已清理. 旧失败记录不改写; 新版原生 ARM64 16 KiB, 完整 Binder 与 Release 门禁仍待完成
* `优化` 此前失败基线 (a260ef308): 不改实验运行时, 新增第 24 项 openat2 目录约束探针: 五个原生 4 KiB 环境各两轮 23/24. 原 230 项观测通过, 新增 10 次失败记录相对/绝对/魔术链接读取配置根外合成测试哨兵共 60 次. 不放宽断言, 如实归档失败门禁; 无崩溃, 挂起或测试 UID 进程残留, 本轮 AVD 已关闭. 原生修复仍未实施
* `优化` 修正 fchmodat2 源码审计: 内部 sys::lchmod 使用大写 SYS_FCHMODAT2, Android node:fs 的两个公开 lchmod 导出在十轮中均不存在. 未执行包可执行文件链接流程的内部回退或依赖安装; 保留历史报告, 实验分发继续阻断
* `优化` 不改实验运行时字节, 将 syscall 探针扩为 23 项: 五个原生 4 KiB 环境各两轮通过 (230/230), 包含 60 次 raw TRAP→ENOSYS 及 16 次 EIO 对照证明调用路径后的复制/等待回退; 明确排除四次 API 28 内核/策略门控观测的分支触达结论, 保留原有全部断言与历史证据, 清理测试包和本轮 AVD. 完整 syscall/Binder 与新夹具原生 16 KiB 验收仍未完成
* `优化` 在六个原生环境验证 spawn 修复: arm64 API 28/31/33/35 与 x86_64 API 33 (4 KiB), 以及三星 arm64 API 36 (16 KiB) 均以不放宽断言的 20 项探针完成两轮 20/20, 合计 240/240; 双 ABI 各两轮清洁构建一致, 36 次强制回收全部通过, 测试包已卸载且本轮 AVD 已关闭. 旧失败记录保留, 完整实验 Binder 与 Release 门禁仍待完成
* `优化` 在 Samsung Remote Test Lab SM-A566B (API 36) 完成原生 ARM64 16 KiB 执行验证: 官方 Bun 与锁定监督器组成的 v0.2.1 开发版 arm64-only APK 两轮通过全部 8 项 Binder 测试, 包含进程重启, 安装后摘要及 10 次强制生命周期回收; 归档源码/APK/日志绑定并卸载测试包, 最终 Release 与 x86_64 门禁仍单独保留
* `优化` 先前失败基线 (c240d6c68): 在同一原生 ARM64 16 KiB 真机记录未改动实验 runtime 的两轮 19/20: 原生 close_range, 启动标记和生命周期通过, 已知 forced-TRAP 降低 RLIMIT_NOFILE 后的 spawn fd 继承缺陷仍存在; 保留两次失败, 不声称完整实验 Binder 或运行时验收通过
* `优化` 先前失败基线 (c240d6c68): 新增降低 RLIMIT_NOFILE 的原生/TRAP 对照, 实验探针扩至 20 项: API 28/31/33/35 四台原生 arm64 真机各两轮 18/20, API 33 原生 x86_64 AVD 各两轮 19/20, 均为 4 KiB 页. 原有 180 次观测仍通过; 新增 18 次失败证明 soft limit 降至 128 后两种 spawn API 均继承 fd 256. 归档失败, 限制恢复及清理证据, 不修改 runtime 字节或声称缺陷已修复
* `优化` 补充 x64 Windows 的 ARM64 16 KiB 环境指南: VMware/WSL 本身不能提供原生 ARM64 Android, 区分全系统软件模拟与原生执行, 建议优先核实 Samsung 远程 16 KiB 真机及 RDB/ADB 的可用性和权限, 不据此声称新增设备验收通过
* `优化` 此前 18 项基线: 新增 5 项 FD/SIGSYS 专项探针并完成启动修复复测: API 28/31/33/35 四台原生 arm64 真机及 API 33 原生 x86_64 AVD 各两轮均为 18/18, 合计 180/180; 双 ABI 各两次清洁构建逐字节一致. 保留原 17/18 失败报告, 不改动正式 runtime 和 Android 13 最低要求; 完整实验 Binder 与原生 16 KB 验证仍待完成
* `优化` 将监督器源码, 固定 NDK 构建说明和各 ABI 摘要绑定到 schema 2 对应源码 manifest, 精确验证源码压缩包内的文件, 不改动已发布的 v0.2.0 资产
* `优化` 为可复现的 patched Bun 新增独立 test-only APK 构建器和显式设备运行工具, 校验源码/APK/runtime 精确摘要, 使用临时测试签名, 输出有界的机器可读报告
* `优化` API 28, 31, 33, 35 原生 arm64 真机各两轮通过全部 13 项应用进程探针; 24 次忽略 SIGTERM 的超时, 输出超限和就绪后取消均确认子进程及监督器退出, 工作目录删除. 保留原 10/12 失败报告, 不宣称完整实验 Binder 通过或扩大 Android 支持范围
* `优化` 归档已发布 v0.2.0 的 APK/对应源码资产验证与最终签名包设备验收证据, 不改写已发布标签, 不扩大 Android 或 16 KB 兼容声明
* `依赖` 将在线构建插件 autojs6-platform-versions 从 1.7.3 升级至 1.7.4, 并同步仓库规则中的版本要求

# v0.2.0

###### 2026/09/08

* `提示` 本版本将最低系统要求从 Android 14 降至 Android 13 (API 33); Android 9 到 12L (API 28 到 32) 仍不受支持, 需等待补丁版 Bun runtime 通过可移植性验证
* `修复` 强化 Release 资产验证: 将 WebKit 归档的大小和 SHA-256 直接与锁定值比较, 并兼容 apksigner 的不同证书输出格式
* `修复` 不再按 ABI 表的遍历顺序猜测已安装 runtime, 改用锁定 payload 的 SHA-256 识别实际 ABI; prewarm 还会执行最小 JavaScript smoke test, 在用户脚本启动前拒绝无法执行的 runtime
* `修复` 当 Android 使用超过 4 KiB 的页面时, 在启动 process 前拒绝已知不兼容的官方 x86_64 runtime; 已将故障收敛到 pinned JavaScriptCore 的 4 KiB page-size ceiling, 以有界诊断取代确定性的 Bun abort
* `优化` 降低最低系统要求: 继续使用固定的官方 Bun 1.4.0 Android payload, 将支持下限从 Android 14 (API 34) 放宽至 Android 13 (API 33), 覆盖更多设备
* `优化` 查明低版本不可用的根本原因: Android 13 起系统 seccomp 放行 Bun 调用的 raw `close_range` syscall, 而 API 31 真机失败证明 API 28 到 32 需要修改 Bun 本身, 仅修改 manifest 无法解决
* `优化` 为未来支持 Android 9+ 打基础: 建立可精确重放的 Bun 源码补丁方案 (6 个补丁) 并锁定构建输入 (固定 NDK 与容器, 22 个 Android release 活跃依赖); 该工作建立独立实验线, 不改变当前安装包中的官方 runtime
* `优化` 加强安装包质量检查: 每个 Debug 和 Release APK 均验证 16 KB ZIP alignment, 精确 ABI 内容以及固定 Bun payload 的大小与 SHA-256, 并在 Android 13 测试设备上核对已安装的 payload 字节
* `优化` 加固供应链: 锁定 19 个 Bun source archive 与 17 个工具链下载件的精确字节, 盘点 181 个 Cargo 和 172 个 Bun registry integrity 条目, 新增拒绝覆盖的 materializer 和受 `buildReady` 闸门保护的双 ABI 构建预检
* `优化` 扩充可复制运行的示例库: 新增带注释的网络 fetch, 私有工作目录文件读写, stdout/stderr 流式输出和更完整的 TypeScript 类型示例; 文档门禁会检查首行 `"bun";` 指令以及单源码和禁止安装依赖的边界
* `优化` 在强制 PAGE_SIZE=16384 的 Android 16 (API 36) AVD 验证 16 KB 执行: `arm64-v8a` 单 ABI APK 经 `libndk_translation` 完整通过 5 项 Binder instrumentation, 但原生 `x86_64` payload 连最小脚本也会以 exit code 134 中止, 因此仍不声称普遍支持 16 KB
* `优化` 闭合 Android 9+ 实验构建供应链的 Cargo 部分: 锁定并真实物化全部 181 个 crates.io archive (26,354,160 bytes), 生成带逐文件 checksum 的 directory source, 并证明固定 Cargo 可在空 `CARGO_HOME` 下以 `--locked --offline` 读取完整 Bun workspace; 该结果仅覆盖 Cargo 输入, 本身不闭合其他构建输入
* `优化` 闭合该供应链的 Bun registry 部分: 将 172 个 lock 引用解析为 Linux x64 的 125 个唯一 npm archive (31,498,870 bytes), 仅从锁定 tarball 重建最小 cache, 并在禁用网络且 cache 只读的固定 Ubuntu container 中通过全部三次 frozen install; `esbuild@0.21.5` 是唯一含受信任 postinstall 的依赖
* `优化` 完成 patched runtime 的可复现构建门禁但不随包分发: 将 155 个主机 `.deb` archive (422,223,096 bytes) 锁定为可重复生成的 OCI image, 把 Cargo 闭包扩展到 206 个唯一 archive, 对两个 64 位 ABI 各执行两次禁网清洁构建并得到逐字节相同结果, 再锁定纯 Node ELF 审计; API 28 与 31 的直接 shell 探针已通过, APK 与应用进程门仍未完成
* `优化` 实现可验证的对应源码 Release assets: 源码与 APK 分离但置于同一 Release, 打包精确 Bun/WebKit/JSC, 19 个 native, 206 个 Cargo, 125 个 npm source archive 以及 patch, build/relink 说明与公开许可声明; 大文件按 1.9 GB 分片, 用 machine-readable manifest 和 SHA256SUMS 绑定 APK/runtime/source 字节, 仅在 GitHub SHA-256 全部匹配后公开 draft; 该结果表明自动化技术验证, 不声称法律获批
* `依赖` 新增 Kotlin Parcelize runtime, 确保 Release 版 R8 保留共享的 Parcelable contract class

# v0.1.0

###### 2026/09/01

* `提示` 首个版本: 每次运行一个独立脚本文件, 暂不提供 AutoJs6 内置函数, Java bridge, 多文件项目和相对路径导入
* `新增` 新增独立 `bun` 引擎: 在脚本第一行写上 `"bun";` 即可用官方 Bun 1.4.0 Android executable 运行 JavaScript 和 TypeScript, 实际命令为 `bun run --no-install <source>`, 不会自动安装依赖
* `新增` 实时回传运行输出: stdout 和 stderr 通过有界 oneway Binder callback 分块流式返回, 最终结果只报告状态和诊断信息, 不携带完整输出流
* `新增` 运行可控: 脚本在隔离的 `:bun_runtime` 插件进程中执行, 支持显式取消, 60 秒默认超时, runtime 信息查询和 prewarming
* `新增` 提供 `arm64-v8a` 和 baseline `x86_64` 官方 64 位 Android payload, 以及单 ABI 和 `universal` 安装包
* `新增` 提供完整插件体验: 插件发现, 受权限保护的激活 (Wake), 完整 PluginInfo metadata 和 10 种语言的用户文档
* `优化` 采用版本化 Binder contract, 通过 ParcelFileDescriptor 传输源码, 源码上限 16 MiB, 合并输出上限 8 MiB
* `优化` 从 Android 只读 native library 目录启动 Bun, 并校验固定 release archive 和打包 binary 的大小, SHA-256 与 ELF 属性
* `优化` 验证两个打包 executable 的 PT_LOAD alignment 均不低于 16 KB, 同时如实说明尚未完成真实 16 KB Android 环境测试
* `优化` 由经过校验的 JSON 文案源生成 README, 插件中心说明和内置更新日志, 并加入构建, Markdown 和 runtime artifact 的 CI 检查
* `优化` 将最低版本暂定为 Android 14 (API 34): API 31 真机上 Bun 的 `close_range` syscall 被 seccomp 以 `SIGSYS` 终止, 一台 Sony API 33 设备虽意外通过但不足以证明可移植性, API 35 真机 JS 和 TS Binder 往返测试已通过
