# M3: 保留目录服务的 openat2 回退修复

证据日期: 2026-09-10. 范围: G1 原生辅助代码与可复现构建, G2 独立 test-only 应用进程. 不是完整实验插件 Binder 或 Release APK 验收.

## 结论

按用户选择的原方案二实现有界、只读的 FD 相对目录解析, 保留普通静态目录服务和根内链接, 不整体关闭目录路由, 不新增宽松模式或第三方依赖. 一般 `Bun.file` / `node:fs` 文件访问不变, 也不把可信脚本包装成文件系统安全沙箱.

实验 Bun revision 为 `1.4.0+7b9ac2668`, 九补丁 head 为 `7b9ac266888abda7ee6ec0b8ac11a74236420030`, tree 为 `05f05ce5787a20f2af4d642fb0ada38f68674187`. 第 9 个项目自有 MIT 补丁仅修改原生头文件、C bridge 和 Rust 的不可用 syscall 回退调用.

原 24 项探针只更新预期 revision, 源码、验证器、超时、输出上限和 HTTP 路径断言不变. 五个原生 4 KiB 环境各两轮均通过 24/24, 共 **240/240**. 其中 240 项路径断言全部通过: 原先 60 次根外合成哨兵读取现在全部被拒绝, 普通文件及根内链接仍返回预期内容. 全量原始结果、源码/APK/runtime/日志摘要和清理记录见 [机器可读报告](2026-09-10-m3-scoped-open-fix.json).

| 环境 | API | 原生 ABI | 页大小 | 两轮结果 |
|---|---:|---|---:|---|
| Sony G8441 | 28 | arm64-v8a | 4096 | 24/24, 24/24 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 24/24, 24/24 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 24/24, 24/24 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 24/24, 24/24 |
| AVD_API_33 | 33 | x86_64 | 4096 | 24/24, 24/24 |

## 实现与维护边界

- 保留原 `openat2` 快速路径和不可用判定, 只替换原先不受目录约束的 plain `openat` 回退.
- 用自有 `O_PATH | O_NOFOLLOW | O_CLOEXEC` FD 固定每个组件, 从固定的符号链接 FD 读取目标. 相对链接从保存的父目录解析, 绝对链接重定位至保存的根, `..` 只操作保存的目录栈并在根处截断.
- 保守拒绝 procfs 链接, 包含 magic links. 检测保存目录的父级变化, 发现移出时返回受控 `EAGAIN`.
- 最终通过仍由本次调用持有的 FD 重新打开, 不再次按可被替换的原路径打开; 核对 inode/device/type. 所有临时 FD 按所有权关闭, 保留主要 errno, 不重试 `close(EINTR)`.
- 仅用于只读 DirectoryRoute, 不模拟通用 `openat2` 全部 flags/errno. 路径小于 4096 bytes, 组件最多 255 bytes, 40 次链接展开, 8192 步, 最多 2049 个目录 FD, 每次 syscall 最多重试 8 次 EINTR. 特殊文件在激活前受控拒绝.

完整实现说明与复测入口见 [scoped-open README](../../tools/bun-runtime/experimental/api28/scoped-open/README.md). 有限并发测试不等于内核级全竞态证明; 返回的已打开文件仍可被重命名或修改. 特权挂载操作、恶意同进程 FD 表篡改和任意文件系统实现不在本次证明范围内.

## 自动化与构建证据

- 从锁定补丁提取完整头文件和实际 C bridge 编译, 同时检查 Rust 回退调用、errno 和 FD 所有权衔接. GCC 13 与 Clang 21 各通过四组 / 20 场景: 普通与 UTF-8 路径、根内/绝对/越界链接、根截断、40/41 链接、FIFO、flags/mode、确定性文件/链接替换、父目录移动、3000 次并发链接替换、错误与 EINTR 上限、FD 清理和旧实现哨兵阳性对照. 原生 Linux `openat2` 对照必须实际通过, 不允许跳过.
- 同一测试在 GCC ASan/UBSan、泄漏检测及遇错停止开启时通过. 锁定镜像缺少 Clang ASan archives 的尝试未执行测试, 不算通过; GCC 使用镜像已有运行库, 未新增依赖或修改镜像.
- LLVM 21.1.5 + NDK r27c 的 API 28 ARM64 / x86_64 对象检查通过, 无 allocator/lock 导入. 两个实际链接产物均包含新 bridge/resolver. 对象检查不替代 Android 执行.
- 九补丁确定性重放通过, 原五补丁 prefix 的全部上游路径对照及 28 项源定义 blob 检查保留. 两个独立 clean checkout 以相同锁定镜像、禁网、只读输入、关闭 ccache 和规范路径完成双 ABI 构建, 四次构建均 exit 0, 同 ABI 字节一致.
- 123 项 Node、11 项 Markdown/Python、7 项 JVM 测试通过. 旧 startup/spawn/supervisor 原生回归分别通过 3/4/8 项, 监督器容器测试使用 `--init` 回收孤儿进程. IDE 构建、Lint、三种 Debug APK 与 16 KiB ZIP 对齐检查通过.

| ABI | bytes | SHA-256 |
|---|---:|---|
| arm64-v8a | 87923320 | `22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7` |
| x86_64 | 90449736 | `83df7d535e4deab9484941a9e8cabc46be3ab6462ccc43c86b76f55325459130` |

见 [当前构建锁](../../tools/bun-runtime/experimental/api28/runtime-evidence.json) 和 [九补丁对应源码绑定](../../tools/bun-runtime/experimental/api28/distribution-source.lock.json). 实验二进制及临时签名测试 APK 均位于仓库外, 未替换官方 payload.

## 没有扩大的结论

本轮六 syscall 的 60 次 raw TRAP-to-ENOSYS 对照仍通过; copy/wait 有 16 次 EIO 控制下的行为观测, 另四次 API 28 内核/策略受限观测不计高层触达. 所有目录用例在添加测试过滤器前已经观察到 raw `openat2=ENOSYS`, 因此新结果证明这些设备上的不可用回退行为, 不声称高层首次 EIO/TRAP 路径触达. `fchmodat2` 的内部 `sys::lchmod` / CLI 回退仍未运行, 不能用 Android 公开 lchmod 导出不存在替代验收.

20 次降低软 FD 限制测试仍通过; 30 次强制生命周期回收为 300-306 ms. 全部测试包卸载后 UID 进程为零, 所有私有测试工作目录已清理. 本轮 AVD 已验证身份后关闭, launcher/QEMU 均退出, 未清空 AVD 数据或保存快照. 本轮启动前没有其他 AVD.

[旧八补丁的 23/24 失败记录](2026-09-10-m3-openat2-confinement.json) 及此前更窄的成功套件保持不变; [旧构建证据](2026-09-10-m2-spawn-runtime-evidence.json) 按原字节另存. 新补丁没有原生 ARM64 16 KiB 证据, 需另约三星设备复测. API 29/30/32、其余 syscall/FD/线程边界、完整实验 Binder、原生 x86_64 16 KiB 阻断及成对 APK/source Release 仍分开跟踪. `distributionReady` 为 false; 官方 Bun、Android 13 最低要求、签名和已发布 v0.2.0 均未改变. 所有验证是技术验证, 不作法律意见或批准.
