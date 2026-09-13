# M3: 挂起 SIGSYS 在 spawn 期间提前交付

日期: 2026-09-13, Asia/Shanghai. 从干净 `57679d12d6bc80445221486803699944b696926b`
继续. 本轮完成新的固定回归和独立动态诊断, **发现一个尚未修复的兼容阻断**.
十补丁 native、官方 runtime、supervisor、生产 service 与 API AAR 均未修改;
官方最低 API 33 和 `distributionReady=false` 不变. 未启动 Bun/WebKit 构建.

## 新回归与结果

原 31 项定义、六份旧 fixture、五份独立语义 validator 保持逐字节一致;
原 FD validator 函数另有固定摘要保护. 新增 native/TRAP 两个
`sigsys-pending-async-*` 模式, recovery 仍位于最后. Java 仅增加这两个固定 asset 和
结果字段的绑定, 原时间/输出/清理逻辑未改. 新 asset 单独限 12 KiB,
每例仍限 15 秒/16 KiB 输出, 语义记录不超过 2048 bytes.

新模式先保存调用线程的完整 mask, 安装 JavaScript SIGSYS listener, 阻塞 SIGSYS,
再用 `tgkill(pid, tid, SIGSYS)` 向同一线程排入一次普通用户信号. `sigpending` 必须确认
挂起位确实存在; `process.kill` 可能选择别的未阻塞线程, 不能替代这个控制.
预期在三个异步非 Bun 子进程运行期间保持挂起且不交付 JavaScript, 回收后恢复 mask,
恰好交付一次, 检查 child 不继承 pending 信号并验证移除 listener 后的 TRAP 行为.
FD 正负对照、应用 UID、parentage、调用 TID 和完整 mask 检查同时保留.

| 原生设备 | API / ABI / 页 | 两轮完整套件 | 新 pending 模式 |
| --- | --- | --- | --- |
| Sony G8441 | 28 / arm64-v8a / 4096 | 31/33, 31/33 | native/TRAP 各失败两次 |
| Sony XQ-AT72 | 31 / arm64-v8a / 4096 | 31/33, 31/33 | native/TRAP 各失败两次 |

同一 ARM64 APK, 完整源码/字节/签名/安装摘要与清理见
[失败归档](2026-09-13-m3-pending-sigsys-failure.json). 原 31 项通过 **124/124**,
新增模式 **0/8**, 整体 **124/132**, 门禁未通过. 八次都是 exit 1 的受控语义失败,
不是 exit 159、超时或进程级 SIGSYS 崩溃. 原生命周期检查仍全部通过.

每次都在第一条 `Bun.spawn` 返回后失败: 排入信号后及调用前均记录 `[pending=1, JS=0]`,
返回时变成 `[pending=0, JS=0]`; 同线程和完整 mask 的前置检查已通过.
因此不能把最终 mask 恢复误认为整个 spawn 期间一直保持阻塞.
API 31 的原 mask 还包含其他信号位, 归档按实际值验证 `blocked=before|SIGSYS`,
没有假定所有调用者初始 mask 都为零. 后续三个子进程完成、恢复及单次 JS 交付的成功
断言尚未到达, 不计为通过.

## 独立信号观察

现有 test-only ptrace 工具在原 `blocked-async` 之外新增 `pending-async` fixture profile;
CLI 必须显式指定 `--fixture-set`. 每个 profile 只接受两个固定 asset,
不接收任意源码或额外命令.
观察器现在按 `siginfo` 类型区分 `SYS_SECCOMP` 与普通用户信号; 后者保存 sender PID/UID,
不把 union 的其他字段误标为 syscall/architecture. 它继续只使用 PTRACE_CONT/GETSIGINFO,
原样转发信号, 不写寄存器、mask 或返回值, 保留 12 秒/256 events/32 signals 与 EXITKILL.

两台设备各两轮, 每轮 native/TRAP 各一组 plain/traced 对照:
**8 次未追踪、8 次追踪均复现受控失败**. 每个追踪恰好捕获一次
`TRACE_USER_SIGSYS`, `signo=31`, `si_code=-6` (SI_TKILL), sender PID/UID 与
原调用进程一致, receiving TID 是原 main thread. 该事件先于新子进程的 close_range TRAP.
这直接证明普通用户信号提前进入原生信号处理路径; 不声称 JavaScript callback 已执行.
见 [动态诊断归档](2026-09-13-m3-pending-sigsys-diagnosis.json).

精确十补丁源码 `src/jsc/bindings/bun-spawn.cpp:253` 在父线程中执行:

```cpp
sigfillset(&blockall);
#if OS(LINUX)
sigdelset(&blockall, SIGSYS);
#endif
sigprocmask(SIG_SETMASK, &blockall, &oldmask);
```

随后才进入 vfork/clone3, 最后再恢复 oldmask. 文件 Git blob 为
`8a24df2f4f3d8e09934815aca31ac74c51919d71`, SHA-256 为
`f681ff77d780385a4afa01f609a73f9b6772ebe459bb7d7a01d1cd1becbc7942`;
本机检查 head=`a9c76a599...`, 工作树干净. 这给出与动态观测吻合的源码解释:
临时 SIG_SETMASK 会让已挂起 SIGSYS 提前交付. ptrace 本轮没有记录 rt_sigprocmask
的参数或调用栈, 不将源码解释写成捕获了该 syscall 的记录.

第 10 补丁只约束可选 pidfd shim; 该 shim 的 pending/mask 单元证据及历史套件继续
保持各自范围, 不能扩大为完整 spawn 期间的 pending 保持. 本轮未调整 mask、预热 waiter
或放宽新断言. 下一步应修复父线程与 vfork 子路径各自的 mask 生命周期, 同时审查父线程
可选 clone3/cgroup 探测, 再为新源码取得独立构建和原套件/新门禁证据.

## 绑定、清理和边界

- 33-probe 构建绑定 30 项输入; 双 ABI 均核对两份原十补丁 native 字节、ELF、ZIP 和签名.
  仅 ARM64 APK 在本轮执行, 不给未运行的 x86 APK 分配通过数.
- 独立观察 APK 绑定 35 项输入. 小型 observer 使用固定 NDK 29.0.14206865 两次编译,
  字节一致; 这不是 Bun/WebKit 重编译. 两台设备使用同一观察 APK, 入口仍经生产 supervisor
  和同 PID execve launcher, 没有通过 Bun.spawn 预热目标.
- 两台设备的 probe 和 trace 包均卸载, 每个安装 UID 的进程均清零, 全部私有目录清理.
  本轮只启动并关闭 `bun-hard-limit-api33-20260912` / 5584; 新阻断出现后未在它上面跑套件.
  关闭前核对精确名称, 最终 serial 消失已记录. 其他 AVD 未收到本轮控制命令;
  初末库存变化原样留在本机记录, 不推断无关 serial 离线原因.
- 历史 434/434 probes、112/112 Binder、JSC、三星与上一轮 M3-B 服务回归保持原样.
  本轮没有新 Binder、三星 API 32/原生 16 KiB、x86 运行、watch/reload、全 syscall/OEM
  或 Release 验收. 更广支持声明保持不变, 两份新 JSON 都属于失败/诊断范围.

两个 archiver 独立重验原始输出、未修改的原 31 项语义、固定失败位置、SI_TKILL 的
发送/接收身份、事件顺序和清理. 失败不能进入成功 archiver; 旧 31 项失败归档器明确拒绝
33 项结果, 防止复用旧计数. 原 68 份 JSON 不改写.

验证命令、最终测试计数和本机目录见 [会话交接](../SESSION_HANDOFF.md).
