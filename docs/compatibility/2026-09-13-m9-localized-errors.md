# M9: 运行错误与十语言诊断审计

2026-09-13 完成. 本轮修改插件服务的错误呈现, 使用原官方 Bun 和 supervisor,
没有重建 native、修复 Gradle 缓存、改共享 AAR、提升系统支持范围或验收 Release.

## 错误出现的位置

| 阶段 | 处理方与本次处理 |
|---|---|
| 未安装、未授权、未启用或尚未激活 | 发生在绑定前, 由 AutoJs6 插件中心/选择逻辑处理. 只读核对了宿主 10 语言中未授权、未启用、缺少插件三个资源. 插件 README 与说明新增来自 Android 资源的授权、启用及激活操作帮助 |
| Android 版本不满足要求 | 官方 APK 要求 Android 13 / API 33+, 系统安装门槛早于插件服务. 十语言资源及生成帮助明确说明 API 28-32 无法通过降低 manifest 要求取得兼容性; 没有捏造一个低版本服务返回结果 |
| 无效请求、源码超限、忙碌、不可用、启动失败、取消、超时、输出超限、非零退出、内部错误 | 10 个既有协议错误码均映射到本地化摘要. 错误码、Bundle 字段、布尔状态、输出传输、超时与取消行为保持原样 |
| 预热与页大小拒绝 | 预热缓存保存失败事实及页大小数值, 返回时使用当前插件语言. `getRuntimeInfo`、`prewarmRuntime`、`runScript` 的诊断均受 16 KiB UTF-8 上限约束 |
| 底层异常、参数细节与 Bun 输出 | 本地化摘要之后可保留技术诊断; 不按英文异常字符串猜测错误类型, 不翻译 Bun 的 stdout/stderr. 截断有效 Unicode 文本时不拆开代理对 |

新增 17 个运行错误/帮助资源, 覆盖十语言及默认英文文件. 默认 `values` 和 `values-en`
保持相同, key 排序且使用 ASCII 标点. 生成器同时检查必需 key、空值和格式占位符,
README 与插件中心说明直接读取同一组 `strings.xml`, 不维护第二套错误翻译.

语言来自 Android 对插件的配置, 不来自宿主请求. 当前契约没有跨应用 locale 协商.
宿主在选择之后的包状态变化、协议不匹配等低层校验仍可能包含英文技术信息;
本轮没有修改或运行宿主 APK, 不称为整个 AutoJs6 错误体系的本地化验收.
只读审计时宿主 HEAD 为 `cc13833766738879800720efc4673ac703138653`, 工作文件 UTF-8/LF 摘要:

| 文件 (AutoJs6 仓库内) | SHA-256 |
|---|---|
| `app/src/main/java/org/autojs/autojs/core/plugin/AidlPluginHost.kt` | `4a49919a2a405a79bcef7f6db832a375ad9b46cf5bd0901f57a25073c2c2f7ee` |
| `app/src/main/java/org/autojs/autojs/core/plugin/bun/BunRuntimePluginClient.kt` | `c35358c73beddde9223f5cef478482318074217ee377b5bc1a4c305ac3661047` |
| `app/src/main/java/org/autojs/autojs/engine/BunPluginScriptEngine.kt` | `b16d3b04277feedc2e39ca3376a6f8273f12d9a4f70167fae7f6fcc782446929` |

## APK 与设备证据

一次受控 Gradle 构建通过后保存独立 `.diagnostics` APK, 绑定 85 项仓库输入.
三台设备使用同一份 test APK; 两台 ARM64 使用同一个主 APK. 所有安装前检查确认目标包不存在,
真实签名权限未绕过, 安装后的 APK SHA-256 与本机接受字节一致. 官方 runtime/helper 的内容
和 ABI 集合通过锁及 APK 检查, ARM64 原套件还直接检查已安装的 nativeLibraryDir 字节.

| APK | bytes | SHA-256 |
|---|---:|---|
| ARM64 Debug | 40977693 | `626611ced7d9b6ac9cdcfda48bf18f5f45f0dd28a2ac03d6c0c4c95e4ab46d68` |
| x86_64 Debug | 42803791 | `7aabc173e1cf8d5941e46bdd8c2eb537576a6a4fdcdbda41316dce0b72391cf7` |
| instrumentation | 2290344 | `7e6bab1c71db2a6813b424bc501781c96b8812ff29005ed982699dcd43990335` |

| 设备 | API / ABI / 页大小 | 两轮结果 |
|---|---|---|
| Sony XQ-DQ72 | 33 / native arm64-v8a / 4096 | 原八项 Binder 16/16; 独立语言 JUnit 4/4, 含 120 个真实错误/回调观察 |
| Xiaomi 23046RP50C | 35 / native arm64-v8a / 4096 | 原八项 Binder 16/16; 独立语言 JUnit 4/4, 含 120 个真实错误/回调观察 |
| sdk_gphone16k_x86_64 AVD | 36 / x86_64 / 16384 用户页 ABI, 4096 内核映射 | 资源及拒绝 JUnit 4/4; 20 个 locale 观察均确认缓存预热、信息与执行请求拒绝消息一致, Bun 未执行 |

原八项测试方法保持不变, 两个 ARM64 环境合计 32/32. 新增语言套件单独计数:
三个环境共 12/12 JUnit; 每个环境两轮各解析十语言的 17 个资源、10 个错误码和编译后的帮助.
ARM64 的六类实际错误是无效请求、超时、输出超限、非零退出、派发前取消及源码超限,
共 240 个终态/finished 一致性观察. 忙碌、内部错误和启动失败的翻译经过资源/映射检查,
没有通过故意破坏安装文件伪造这些实际运行失败. 泛化不可用诊断的预算与 Unicode 边界
通过构造失败对象及 JVM 测试验证; 不称为真实文件损坏恢复测试.

每轮间停止测试包进程, 语言测试在 finally 恢复原 app locale. 三个环境均卸载两个测试包,
六个 UID 最终均为零进程. 只启动并关闭本轮的 `bun-jsc-pressure-16k-20260912` /
`emulator-5582`; 原有 `emulator-5554` 未操作. 先前短暂在线的其他 AVD 离线不是本轮操作.
没有使用三星或开启三星等待窗口.

独立 JSON 归档保留原始 JUnit 文本、源码/APK/安装绑定及清理:

- [原八项 Binder](2026-09-13-m9-localized-errors-binder.json)
- [ARM64 十语言错误回归](2026-09-13-m9-localized-errors.json)
- [x86 页大小拒绝](2026-09-13-m9-localized-page-refusal.json)

拒绝记录在矩阵中仅作诊断索引, 不作为原生 Bun 运行成功. 官方 x86 16 KiB 阻断、实验
syscall/API/FD/OEM 矩阵、长时压力和 Release 门槛继续开放; 十补丁/JSC 历史报告原样保留.

## 复核与限制

两组 JVM Unicode 边界测试、原生产单元测试、Python 文档/矩阵测试和 Node 回归通过.
最终 JVM 10/10、Python 37/37、Node 191/191. 生产包的四项标准 Gradle 任务另行通过
(15 秒, 96 tasks, 61 executed/35 up-to-date); 设备成绩仍只归于上述隔离 APK.
隔离构建四项标准 Gradle 任务成功 (15 秒, 96 tasks, 64 executed/32 up-to-date),
三种 APK 的 runtime/supervisor 字节与 16 KiB ZIP 对齐通过; IDE 编译通过, 仅原 SDK XML 与
Bundle.get 警告. 首次构建仅因 PowerShell 未引用点前缀属性而在配置阶段停止,
修改调用参数后完成, 没有 native 编译失败或设备测试失败.

Lint 按实际 issue 节点计为 0 errors / 44 warnings. 本次资源改动对应的五条是: 两个英文页大小资源的
`PluralsCandidate` (实际值为至少 4096 的页大小), 两个由 Python 生成器消费的帮助资源
`UnusedResources`, 以及俄文版本范围的 `TypographyDashes` (仓库要求 ASCII 标点).
没有全局关闭这些检查; 生成器必需 key/占位符检查与真实十语言资源回归继续覆盖它们.

初始批次的外部输入 receipt 在受控构建后保存, 测试前后核对输入未变. 后续提供的
[受控构建与设备工具](../../tools/diagnostics/README.md) 增加构建前后 snapshot,
它是在接受 APK 建好后实现的, 不追溯声称该 helper 已运行. 工具不替代签名 Release 的
对应源码与发布验证, 也不证明每个 OEM 设置界面都暴露插件语言选项.
