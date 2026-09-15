# M6 设计稿: 工作区归档 (workspace archive) 契约与接入

状态: 已落锁并接入, 2026-09-15 (提案于 2026-09-14). 共享契约常量, 插件 `runScript` 接入与宿主 `BunPluginScriptEngine` 打包均已实现并通过编译/单元测试; 真机往返已完成 (2026-09-15, x86_64 AVD 与 ARM64 API 33 / API 36 真机), 宿主发布由用户决定. 下文第 3-5 节即为实际实现的约定.

## 1. 目标与边界

- 一次运行传入一个项目快照而不是一个文件, 让相对 ESM import, JSON/asset 导入和多文件 TypeScript 项目可用.
- 仍然是受控快照: 宿主决定打包哪个目录, 插件只在本次运行独有的私有 workspace 内展开, 永远不访问宿主文件系统, 也不回传任何写入.
- 不引入 `bun install`. 快照里若包含 `node_modules`, 它只是普通文件的一部分, 同样受条目数与字节上限约束; native addon 不因此变得可用.
- AIDL 事务顺序与方法签名不变: 仍是 `runScript(Bundle request, ParcelFileDescriptor source, IBunRuntimeCallback callback)`. 只新增 Bundle 键与能力位.
- 旧宿主看不到能力位, 继续发送单源码请求; 新宿主只有在插件宣告能力后才发送归档.

## 2. 生态先例

| 插件 | 契约 | 说明 |
|---|---|---|
| Node.js Runtime | `NodeJsRuntimeContract.KEY_WORKSPACE_ARCHIVE_*`, 能力 `scopedWorkspaceArchiveTransport` | ZIP 流经 PFD 传入, 另有输出 PFD 回传快照; 硬上限 65536 文件 / 256 MiB |
| Python Runtime | `supportsWorkspaceArchive` 能力位, 请求携带 `workspaceArchive` 载荷引用 | 同为 "工作区归档" 语义 |

本提案沿用 "workspace archive" 命名与 ZIP 格式, 但保持 Bun 的单向语义: 只传入, 不回传. Bun 脚本对 workspace 的写入随本次 job 目录一起删除, 与现有单源码行为一致.

## 3. 共享契约新增 (AutoJs6 `plugin-api/bun-runtime-api`)

`BunRuntimeContract` 新增, 全部为向后兼容的附加常量:

| 常量 | 值 | 类型/语义 |
|---|---|---|
| `WORKSPACE_ARCHIVE_VERSION` | `1` | 当前归档格式版本 |
| `KEY_WORKSPACE_ARCHIVE_VERSION` | `"workspaceArchiveVersion"` | 请求 int. 缺席 = 单源码 v1; 存在则必须等于 `WORKSPACE_ARCHIVE_VERSION` |
| `KEY_WORKSPACE_ENTRY_POINT` | `"workspaceEntryPoint"` | 请求 String, 归档内入口文件的相对路径 |
| `KEY_WORKSPACE_MAX_ENTRIES` | `"workspaceMaxEntries"` | 请求 int, 可选, 宿主只能收紧 |
| `KEY_WORKSPACE_MAX_BYTES` | `"workspaceMaxBytes"` | 请求 long, 可选, 按解压后字节计, 宿主只能收紧 |
| `MAX_WORKSPACE_ENTRIES` | `16384` | 插件硬上限 |
| `MAX_WORKSPACE_BYTES` | `64 MiB` | 插件硬上限 (解压后); 单个文件仍受 `MAX_SOURCE_BYTES` 16 MiB |
| `KEY_WORKSPACE_FILE_COUNT` / `KEY_WORKSPACE_BYTES` | `"workspaceFileCount"` / `"workspaceBytes"` | 终态 Bundle 可选诊断, 不携带路径 |

`BunPluginCapabilityKeys` 新增:

| 常量 | 值 |
|---|---|
| `SUPPORTS_WORKSPACE_ARCHIVE` | `"org.autojs.plugin.bun.SUPPORTS_WORKSPACE_ARCHIVE"` (boolean) |

保持不变: `PROTOCOL_VERSION = 1`, `EXECUTION_MODEL = "isolated-process-single-source"` (现有宿主做精确比较, 改值会让旧宿主拒绝新插件), `SOURCE_TRANSPORT = "parcel-file-descriptor"`. 错误码不新增: 归档规则失败映射到 `INVALID_REQUEST`, 超限映射到 `SOURCE_TOO_LARGE`, 取消映射到 `CANCELLED`; `errorMessage` 以 `BunWorkspaceArchive` 的固定错误码开头, 不回显路径.

同一批更新: AAR 重新发布到新的宿主 build, 本仓库 `libs/api-artifacts.lock.json` 与 `REQUIRES_HOST_VERSION` 同步; 插件侧不复制任何常量.

## 4. 插件侧接入 (`BunRuntimeService.runScript`)

现有流程只在 "写入源码" 一步分叉:

```text
parse(request) -> gate -> probe -> createWorkspace(executionId)
  if request has workspaceArchiveVersion:
      validateSourceDescriptor(descriptor, MAX_WORKSPACE_BYTES)
      expanded = BunWorkspaceArchive.expand(
          AutoCloseInputStream(descriptor), workspace, entryPoint,
          BunWorkspaceLimits.clamped(maxEntries, maxBytes)) { handle.cancelled.get() }
      execute(request, expanded.entryFile, workingDirectory = expanded.root, ...)
  else:
      copySource(descriptor, workspace/<safeFileName>)      # 逐字节保持现状
      execute(request, sourceFile, workingDirectory = workspace, ...)
finally: 删除本次 workspace (含 project 与 staging)         # 现状不变
```

- `TMPDIR` 与 `BUN_INSTALL_CACHE_DIR` 仍位于 workspace 根下, 在 `project` 之外, 脚本无法把它们当作项目文件导入.
- 展开期间每个块检查取消标记; 取消后 staging 被删除, 终态为 `CANCELLED`, 与现有取消语义一致.
- 展开器抛出的 `BunWorkspaceArchiveException` 是 `IllegalArgumentException` 子类, 现有 `catch` 已能映射到 `INVALID_REQUEST`; 接入时再细分 `SOURCE_TOO_LARGE` 与 `CANCELLED`.

## 5. 宿主侧接入 (AutoJs6 `BunPluginScriptEngine`)

- 能力检查: `capabilities.getBoolean(SUPPORTS_WORKSPACE_ARCHIVE)`; 为 false 时保持现有单源码路径.
- 何时打包: 源为 `JavaScriptFileSource` 且父目录可读时, 以父目录为项目根 (建议: 若向上能找到最近的 `project.json`, 以其所在目录为根). 字符串源码与加密源码继续走单源码.
- 打包规则与插件一致: 只收普通文件与目录, 跳过符号链接与特殊文件, 名称使用 UTF-8 与 `/` 分隔的相对路径; 超过上限直接报错, 不静默截断.
- 入口 = 脚本相对项目根的路径, 写入 `KEY_WORKSPACE_ENTRY_POINT`.
- 快照 ZIP 写入宿主私有目录, 打开为只读 PFD 后立即 unlink, 与现有单源码 snapshot 相同.

## 6. 安全与资源

- 解压炸弹: 上限按解压后字节逐块计数, 超限即停止并删除 staging; 条目数与单文件大小另有上限.
- 路径: 拒绝绝对路径, `.`/`..` 段, 空段, 反斜杠, 冒号, 控制字符; 深度 <= 32, 段 <= 255 字节, 路径 <= 1024 字节; 展开前再用 canonical path 确认在 staging 内.
- 重复与冲突: 大小写与 Unicode NFC 不敏感的重复检测 (Windows/macOS 宿主目录可能存在这类同名), 文件与目录路径冲突检测.
- 属性: 忽略 ZIP 的 unix mode, symlink 标志与时间戳, 只创建普通文件与目录, 使用进程默认权限.
- 位置: `cacheDir/bun-executions/<job>/project`, 与现有 workspace 清理规则相同.

## 7. 验收

- [x] JVM 单元测试 `BunWorkspaceArchiveTest`: 嵌套导入布局与 Unicode 路径, 显式目录, 各类非法路径, 重复与冲突, 上限与钳制, 入口校验, 空/非 ZIP/截断输入, 取消清理, 已有状态拒绝覆盖.
- [x] 契约常量落锁后的 `BunRuntimeContractTest` (宿主仓库, 3/3) 与插件 `BunWorkspaceRequestTest` (`parseWorkspace` 纯函数) 单元测试. (2026-09-15)
- [x] instrumentation: 相对 ESM import, JSON 导入, `import.meta.dir` 指向 `project`, 穿越/缺失入口/非 ZIP 拒绝, 展开后清理, 后续单源码恢复; 三台 ARM64 真机 (API 33/33/35) 各两轮通过, 见 `docs/compatibility/2026-09-15-m6-workspace-archive.md`. (2026-09-15)
- [x] API 33 与 API 35 原生 arm64 真机各完成一次多文件项目往返, 记入 `docs/compatibility`. (2026-09-15: 本地宿主构建的往返在 API 33 (Redmi) 与 API 36 / 16 KiB (Samsung) 真机完成, 见 `2026-09-15-m6-host-round-trip-arm64.md`; API 35 (Xiaomi) 只做了插件侧 Binder 往返)

## 8. 明确不做

- 不回传 workspace 快照, 不做增量同步.
- 不支持 symlink, 硬链接或设备文件.
- 不执行 `bun install`, 不联网补依赖.
- 不接受任意 shell command 或宿主指定的绝对工作目录.
