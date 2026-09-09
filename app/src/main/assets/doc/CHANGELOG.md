******

### 发行历史

******

# v0.2.1

###### 2026/09/10

* `提示` 尚未发布的开发快照; 正式插件仍要求 Android 13 (API 33) 或更高版本
* `修复` 修复正式插件在超时, 取消和输出超限时的进程回收: 使用摘要锁定的只读监督器, 将被忽略的 SIGTERM 升级为 SIGKILL, 等待直接 Bun 子进程退出并保留待排空的输出; Bun 1.4.0 和 Android 13 最低要求不变
* `修复` 通过原文件编译共享 SupervisedProcess 并打包锁定监督器, 修复 patched Bun 独立探针的终止路径; schema 2 构建收据绑定源码, 工具链和 helper 字节, 输出读取器保持到终止后再关闭
* `优化` 新增 5 项 FD/SIGSYS 专项探针: API 28/31/33/35 四台原生 arm64 真机及 API 33 原生 x86_64 AVD 各两轮 17/18. 子进程 FD 隔离与信号验证通过, 但全部 10 轮均暴露启动阶段缺少 CLOEXEC 回退; 保留阻断记录, 不改动正式运行时字节及 Android 13 最低要求
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
