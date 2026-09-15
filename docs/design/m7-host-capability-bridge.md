# M7 设计稿: AutoJs6 能力桥框架与第一项只读能力 (宿主信息快照)

状态: v1 已落锁, 接入并通过真机验证, 2026-09-16 (用户于 2026-09-15 决定宿主暂不发版并同意 M7 提前开始). 第 2 节是适用于每项宿主能力的通用框架; 第 3-5 节是第一项能力 "宿主信息快照" 的实际实现约定: 共享契约常量已落锁并重发 AAR, 插件 `runScript` 已接入, 宿主 `BunPluginScriptEngine` 按能力协商与授权开关提供快照. 真机端到端与宿主发版见第 7 节.

## 1. 目标与边界

- 目标: 让 Bun 脚本以窄接口, 显式授权, 可版本协商, 可单独撤销的方式获得宿主能力. 绝不把 Java object graph, Rhino globals 或 Android automation internals 直接暴露给 Bun.
- v1 只做一项低风险的只读能力: 宿主信息快照 (`hostInfo`). 它是静态的, 一次运行一份, 随运行目录删除; 不引入 Bun 子进程到插件进程的任何回传通道 (子进程 stdin 仍为 `/dev/null`, stdout/stderr 仍只单向转发).
- AIDL 事务顺序与方法签名不变, `PROTOCOL_VERSION = 1`, `EXECUTION_MODEL`, `SOURCE_TRANSPORT` 与错误码集合不变; 只新增 Bundle 键, 常量与能力位, 与 M6 的附加式演进一致.
- 快照不是安全边界. 脚本以插件 UID 运行 (AGENTS: Bun 子进程是生命周期隔离, 不是沙箱); 快照只提供信息, 不授予任何操作.

## 2. 通用框架 (每项宿主能力都遵守)

| 维度 | 规则 |
|---|---|
| 协商 | 插件在 `PluginInfo.capabilities` 宣告 `SUPPORTS_<CAP>`; 宿主只在读到该位后才在 `runScript` 请求里附加 `<cap>Version` 与 `<cap>` Bundle. 旧宿主看不到能力位, 旧插件忽略未知键, 互不感知 |
| 授权与撤销 | 宿主侧每项能力一个独立开关 (`BunHostCapabilityGrants`), 默认值按能力风险决定 (只读信息默认开启); 撤销即不再附加请求键, 插件无需感知. 插件侧的签名权限 `org.autojs.permission.PLUGIN`, `PluginTrustManager` 与 `PluginEnableStore` 照旧对每次调用生效 |
| 版本 | 每项能力独立的整型版本 `<CAP>_VERSION`; 插件只接受已知版本, 未知版本以 `INVALID_REQUEST` 关闭, 键只增不改 |
| 可信来源 | 宿主自述的字段一律视为 advisory; 能核实的事实由插件自行解析 (Binder 调用方 UID -> 包名 -> `PackageManager` 版本), 不信任请求里的宿主版本 |
| 大小与错误 | 每项能力定义自己的字节上限; 失败映射到现有错误码 (`INVALID_REQUEST` / `INTERNAL`), 不新增本地化错误码; 诊断不回显路径 |
| 资源归属 | 能力产物放在本次运行私有 workspace 内, `project` 之外, 随运行目录一起删除; 脚本无法把它当作项目文件导入 |
| 命名空间 | 环境变量 `AUTOJS6_*` 归插件所有 (`RESERVED_ENVIRONMENT_PREFIX`); 宿主请求携带即拒绝, 因此脚本读到的 `AUTOJS6_*` 一定来自插件 |
| 动态调用 (未来) | 若某项能力需要脚本运行期调用宿主, 需要新增 Binder broker (仿宿主仓库 Lua/MCP 契约的 `I*HostCapabilityBroker`, 事务追加在第 5 个之后) 与子进程通道 (unix socket 或经 supervisor 转发的继承 fd), 届时再定义 cancellation, backpressure, 并发上限, 请求大小与超时. v1 不做 |

## 3. 共享契约新增 (AutoJs6 `plugin-api/bun-runtime-api`)

`BunRuntimeContract` 新增, 全部为向后兼容的附加常量:

| 常量 | 值 | 类型/语义 |
|---|---|---|
| `HOST_INFO_VERSION` | `1` | 当前快照格式版本 |
| `MAX_HOST_INFO_BYTES` | `16 KiB` | 渲染后 JSON 文件上限 (<= `MAX_TERMINAL_MESSAGE_BYTES`) |
| `MAX_HOST_INFO_VALUE_BYTES` | `256` | 包名与每个 advisory 字符串的上限 |
| `HOST_INFO_ENVIRONMENT_VARIABLE` | `"AUTOJS6_HOST_INFO_FILE"` | Bun 进程内快照文件的绝对路径 |
| `RESERVED_ENVIRONMENT_PREFIX` | `"AUTOJS6_"` | 插件保留的环境变量前缀 |
| `KEY_HOST_INFO_VERSION` | `"hostInfoVersion"` | 请求 int. 缺席 = 无快照; 存在则必须等于 `HOST_INFO_VERSION` |
| `KEY_HOST_INFO` | `"hostInfo"` | 请求 Bundle, 键见下 |
| `HOST_INFO_KEY_PACKAGE_NAME` | `"packageName"` | 必填, 插件核对 Binder 调用方 UID 拥有该包 |
| `HOST_INFO_KEY_VERSION_DATE` | `"versionDate"` | 可选 advisory, <= 256 字节, 无控制字符 |
| `HOST_INFO_KEY_LANGUAGE_TAG` | `"languageTag"` | 可选 advisory, BCP-47 子集 `[A-Za-z0-9]{1,8}(-[A-Za-z0-9]{1,8})*` |
| `KEY_HOST_INFO_DELIVERED` | `"hostInfoDelivered"` | 终态 boolean, 仅在请求携带快照键时出现 |

`BunPluginCapabilityKeys` 新增:

| 常量 | 值 |
|---|---|
| `SUPPORTS_HOST_INFO` | `"org.autojs.plugin.bun.SUPPORTS_HOST_INFO"` (boolean) |

保持不变: `PROTOCOL_VERSION = 1`, `EXECUTION_MODEL`, `SOURCE_TRANSPORT`, `REQUIRES_HOST_VERSION = 5278` (旧宿主只是不发送新键), 错误码不新增: 快照规则失败映射到 `INVALID_REQUEST`, 写入失败映射到 `INTERNAL`.

同一批更新: 宿主仓库 `BunRuntimeContractTest` 新增 `hostInfoSnapshotKeysAreAdditiveAndBounded` (4/4); release AAR 重发 (14073 bytes, SHA-256 `69674a0b…`), 本仓库 `libs/api-artifacts.lock.json` 同步并通过 `verify-api-artifacts`; 插件侧不复制任何常量.

## 4. 插件侧接入 (`BunRuntimeService.runScript`)

```text
parse(request):
  environment 名: POSIX 标识符, 且不得以 AUTOJS6_ 开头            # validateEnvironmentName
  if request has hostInfoVersion:
      parseHostInfo(version == 1, packageName 形如 a.b[.c], advisory <= 256 字节且无控制字符)
gate -> probe -> createWorkspace -> prepareExecution (单源码或归档, 现状不变)
  if request.hostInfo:
      callerPackages = PackageManager.getPackagesForUid(Binder.getCallingUid())
      require(packageName in callerPackages)                          # 否则 INVALID_REQUEST
      host = PackageManager.getPackageInfo(packageName)               # versionName / longVersionCode
      json = BunHostInfoSnapshot.render(host, plugin(BuildConfig + 运行时 ABI), execution)
      write <workspace>/autojs6/host-info.json                        # project 之外
      env AUTOJS6_HOST_INFO_FILE = 该文件绝对路径
execute(...)                                                          # 其余逐字节保持现状
terminal: hostInfoDelivered = true (仅当请求携带快照键)
finally: 删除本次 workspace (含 autojs6/)                              # 现状不变
```

快照 JSON 布局固定, 单行, 所有字符串按 RFC 8259 转义 (控制字符, DEL, U+2028/U+2029 转为 `\uXXXX`):

```json
{"hostInfoVersion":1,
 "host":{"packageName":"org.autojs.autojs6","versionName":"6.8.0","versionCode":5280,"versionDate":"Sep 15, 2026","languageTag":"zh-Hans-CN"},
 "plugin":{"packageName":"io.github.supermonster003.autojs6.plugin.bun.runtime","versionName":"0.2.3","versionCode":8,"runtimeVersion":"1.4.0","runtimeRevision":"1.4.0+34cbb9a40","runtimeAbi":"arm64-v8a"},
 "execution":{"executionId":"bun-engine-0-…","sourceName":"main.ts","workspaceArchive":true}}
```

脚本侧用法 (宿主未提供快照时变量不存在, 脚本应自行判断):

```ts
"bun";
const path = process.env.AUTOJS6_HOST_INFO_FILE;
const info = path ? await Bun.file(path).json() : null;
console.log(info?.host.versionName ?? "no host info");
```

## 5. 宿主侧接入 (AutoJs6 `BunPluginScriptEngine`)

- 能力检查: `capabilities.getBoolean(SUPPORTS_HOST_INFO)`; 为 false 时不附加任何新键.
- 授权开关: `BunHostCapabilityGrants.isHostInfoGranted(context)` (SharedPreferences `bun_host_capability_grants`, 键 `host_info`, 默认 true); 关闭即撤销, 下一次运行起生效. 插件中心的开关 UI 待做.
- 请求内容: `packageName` = 宿主包名, `versionDate` = `BuildConfig.VERSION_DATE`, `languageTag` = `Language.getPrefLanguage().getLocalCompatibleLanguageTag()`. 宿主不发送 versionName/versionCode, 由插件自行解析.
- 单源码与归档两条路径都附加快照键, 行为一致.

## 6. 安全与资源

- 身份: 包名必须属于 Binder 调用方 UID; 版本由 `PackageManager` 解析. 冒用包名的请求以 `INVALID_REQUEST` 关闭, 不启动 Bun.
- 可见性: 插件 manifest 声明 `<queries><package android:name="org.autojs.autojs6" /></queries>`; 绑定关系本身也授予对调用方包的可见性. 不可见的包名同样拒绝.
- 大小: 单值 <= 256 字节, 文件 <= 16 KiB, 只写一次; 位于 `cacheDir/bun-executions/<job>/autojs6/`, 与 `project`, `tmp`, `bun-install-cache` 并列, 随运行目录删除.
- 内容: 只含包名, 版本, advisory 日期/语言, 插件与运行时版本, 本次运行标识; 不含宿主文件路径, 设备标识, 账号或任何可操作的句柄.
- 命名空间: 宿主请求中的 `AUTOJS6_*` 环境变量被拒绝, 脚本读到的路径一定由插件写入.
- 不声称沙箱: 同一 UID 内的脚本本就能读取自己 workspace 的一切; 快照不改变这一点.

## 7. 验收

- [x] 宿主仓库 `BunRuntimeContractTest` 4/4 (含新增快照键测试), release AAR 重发并锁入本仓库. (2026-09-16)
- [x] JVM 单元测试 `BunHostInfoRequestTest` (版本, 包名规则, advisory 上限与控制字符, 语言标签, 保留环境变量前缀) 与 `BunHostInfoSnapshotTest` (固定布局, 缺省字段, JSON 转义, 文件上限). (2026-09-16)
- [x] instrumentation `hostInfoSnapshotIsDeliveredOnlyWhenOffered` (未提供时无变量与终态键; 单源码与归档两条路径读到核实后的宿主/插件/运行事实, 文件在 workspace 内 `project` 外; 冒用包名, 未知版本, 保留变量三种请求关闭; 之后单源码恢复) 与 `hostGlobalsAreAbsentAndFailLoudly` (`toast` 等全局以 `ReferenceError` 明确失败) 在真机通过. (2026-09-16: Redmi 22120RN86C API 33 与 Samsung SM-A566B API 36 / 16 KiB 各 OK (17 tests); 路径包含关系改为 realpath 比较后通过, 见 `docs/compatibility/2026-09-16-m7-host-info-snapshot.md`)
- [x] 宿主端到端: 本地宿主构建 (含 `attachHostInfo`) 经 `RunIntentActivity` 运行读取快照的脚本, 记入 `docs/compatibility`. (2026-09-16: Redmi API 33 上单源码与 project.json 项目各读到核实后的快照, 经宿主偏好文件撤销授权后脚本得到 absent, 恢复后再次得到; Samsung 因 Remote Test Lab 会话断开未跑宿主往返)
- [ ] 宿主插件中心的能力开关 UI 与宿主发版 (宿主仓库, 用户决定).

## 8. 明确不做 (v1)

- 不做运行期动态调用, 不开 Bun 子进程到插件的通道, 不改 supervisor.
- 不暴露宿主文件路径, 设备标识, 账号, 剪贴板, 无障碍或任何自动化接口.
- 不把快照写入 `project`, 不通过 stdout/stderr 或参数传递.
- 不新增错误码, 不改现有五个精确比较字段, 不提升 `REQUIRES_HOST_VERSION`.
- 不安装 preload/shim: 未实现的 Rhino/Node globals 继续以 `ReferenceError` 明确报错, 不静默改引擎或回退.
