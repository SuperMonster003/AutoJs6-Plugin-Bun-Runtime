# M4 固定离线文件与网络 API 边界

2026-09-14, 十三补丁 baseline `1.4.0+e8b129616` 在五个原生 4 KiB 环境中,
通过生产 Binder 服务执行四个新固定模式, 每环境两轮, 合计 **40/40**.
这是独立的有限 API 补充, 不增加原 35 项应用探针、八项 Binder 或 JSC 压力套件计数,
也不构成 Android 9+ 稳定支持或 Release 验收.

[完整逐轮 JSON](2026-09-14-m4-runtime-api.json)、
[源码/APK/验证与清理补充](2026-09-14-m4-runtime-api-checkpoints.json)、
[Sony API 33 安装前离线记录](2026-09-14-m4-runtime-api-preflight-failure.json)
分别保存成功观察、来源和未执行测试的预检失败.

## 固定范围

新增类 `RuntimeApiInstrumentedTest.fixedOfflineApiBoundaries` 只编译进 opt-in
实验测试 APK. 它复用真实生产服务、supervisor、共享 API AAR、签名及组件权限,
用四个独立源码快照依次执行文件、DNS、TCP 和 HTTP/fetch 模式. 原八项 Binder
测试方法和原 35 项应用探针定义没有修改或在本批重跑.

| 模式 | 通过所需的实际观察 | 本批数量 |
| --- | --- | ---: |
| files | Unicode 路径, `wx` 和 `COPYFILE_EXCL` 拒绝覆盖, rename 后旧路径 ENOENT, FileHandle 在偏移 7 读取 37 bytes, 正确目录事件及内容, watcher 关闭, 自建目录删除 | 10 |
| dns | 系统 IPv4 localhost lookup, 独立 Resolver 指向自建回环 UDP 服务, A/TXT 正确回复和 NXDOMAIN 对应 ENOTFOUND, socket 关闭 | 10 / 30 次 DNS 请求 |
| tcp | 每次 32768-byte 二进制请求分四次写入, 客户端半关闭后读到完整反转回复, 两端正常结束且无 close error | 10 / 20 次连接 |
| http-fetch | 本地 302 重定向, 通过 reader 重组精确 UTF-8 响应, 取消未完成的 body read 得到 AbortError, 服务端 response close 已发生 | 10 / 30 次 HTTP 请求 |

每份 JS 上限 12288 bytes, 工作期限 8000 ms, Binder 超时 12000 ms,
stdout/stderr 合计上限 16384 bytes, 单行成功记录上限 8192 bytes.
目录事件最多 64 个; HTTP reader 最多 512 次非空读取, 不要求 TCP/HTTP 分段次数
与写入次数相同. 服务只监听 OS 分配的 `127.0.0.1` 端口, DNS 只修改该 Resolver
实例. 测试不安装依赖或访问外部网络. HTTP 在已观察到取消关闭后清理其余自有 socket;
TCP 则先断言两次连接自然关闭, 再关闭监听服务.

四份实际 JS 的主机 Node 测试仅替换 Android 身份和 `/proc` 输入,
实际执行本地文件、watch、UDP Resolver、TCP 和 fetch, 并覆盖晚到的错误监听事件、
错误 TXT 数据、数据摘要/终止状态/源码漂移、伪造清理和 JUnit 顺序等拒绝控制.
这些主机检查验证夹具, 不作为 Android/Bun 运行证据.

## 设备与重复边界

| 设备 | API | 原生 ABI | 应用/内核页 | 两轮结果 | 卸载后两个 UID |
| --- | ---: | --- | --- | --- | --- |
| Sony G8441 | 28 | arm64-v8a | 4096 / 4096 | 4/4 + 4/4 | 10775 / 10776, 均 0 进程 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 / 4096 | 4/4 + 4/4 | 15133 / 15134, 均 0 进程 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 / 4096 | 4/4 + 4/4 | 10535 / 10536, 均 0 进程 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 / 4096 | 4/4 + 4/4 | 11037 / 11038, 均 0 进程 |
| sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 / 4096 | 4/4 + 4/4 | 10174 / 10175, 均 0 进程 |

每个脚本独立读取 ELF `AT_PAGESZ` 和自身 `smaps KernelPageSize`, 与 Java
`Os.sysconf` 的 4096 硬断言一致. ABI 同时由系统首 ABI、uname、JS arch 和锁定
APK ELF 核对. ARM64 native bridge 为 0/空值; x86 执行的是已验证的 x86 ELF.

初选 Sony XQ-DQ72 / API 33 在 `adb get-state` 时已不在设备清单, 尚未进行包检查
或安装. 其原报告 `rounds=[]`, `cleanup=[]`, 无 UID, 原 driver exit 1 保留.
明确记录设备替换后, 改用已经在线的 Redmi 完成相同 API/ABI 位置. 没有重跑已完成的
API 28/31, 没有修改原生字节、源码、预算或 APK, 没有运行期失败重试.
Sony 的预检失败不是 Bun API 失败或一次通过观察.

五个执行 UID 与五个测试包 UID 均通过完整数字 UID 的最终 `ps` 独立核验;
十个包实例全部卸载, 40 个私有 execution workspace 均不存在.
唯一由本批启动的 AVD 为 `bun-hard-limit-api33-20260912` / `emulator-5584`,
关闭前再次核对名称, 在 06:30:31 UTC 确认离线. 未启动、停止或删除其他 AVD,
未重启共享 ADB 或操作手机连接. 接手时曾在线的无关 API 24/37 AVD 后来从清单消失,
本批没有操作它们, 不推断原因. `localhost:37478` 的离线连接未用于本批.

## 精确来源

工具与 APK 源码提交为 `956df1b01c869356c193bbf9596e84638dda1c65`.
构建前工作树干净, 99 项编译输入逐项匹配该提交的 Git 对象; 文本按 Git LF,
AAR 按原二进制核验. 一次 baseline Gradle driver 实际 exit 0, 14 秒,
80 tasks / 48 executed / 32 up-to-date. 安装后 APK 摘要与本机批次一致,
主/test 签名一致且 v2 验证通过, native entry 与 supervisor 按各 ABI 锁验证.

| APK | Bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 main | 41128239 | `1d4a7cc441ea9213e73a8d50fafd0696b9407714ec85c3674a94e6f452eb83d8` |
| x86_64 main | 42950081 | `c1a328b369f4ddec452edccaf9677a0674e7d0a88c6d7ce67959c74acb9e241c` |
| 共用 androidTest | 2395845 | `4c5d0d95614948da0a664fee8152b7f75739d9ee17c9050ac6e13c0649ce67b6` |

复用原十三补丁 baseline ARM64 `c8f2513f...15427160` 和 x86_64
`cb3104fb...f4043ac`, 无 Bun/WebKit/ICU 新构建, 未恢复已清理的原生缓存.
单独的大页 JSC candidate、官方 payload、生产服务实现、共享 AAR 和既有夹具保持不变.

## 验证和保留的开放项

- 全量 Node 46 文件, 293/293, 无失败或跳过, 新增 10 项夹具/严格归档检查已接入 CI.
- IDE 构建成功, 保留既有 SDK XML 与 `Bundle.get` 弃用警告.
- 官方 Bun 与 supervisor 锁验证通过, 生产 Debug APK 完整性及 16 KiB ZIP 检查通过.
- 生产四项 Gradle driver 实际 exit 0, 11 秒, 96 tasks / 49 executed / 47 up-to-date.
  JVM 任务为 UP-TO-DATE, 已有 21 项结果有效, 不称本轮重新执行; lint 0 errors / 44 warnings.
- 十语言变更记录由生成器同步. 旧 122 份报告、原注册项、217 矩阵行和 137 份受保护文件
  保持不变; 本批三份 JSON 仅作为补充/诊断索引, 不混入原套件成绩.
- Markdown/矩阵生成及各自 `--check` 全部通过, Python 38/38; 矩阵现索引 125 份来源,
  217 个历史设备行逐项保持原样, 99 项 APK 编译输入在最终生成后仍匹配源码提交.

本批不覆盖 TLS、IPv6、公共 DNS/网络、其余 Node/Bun API、native ARM64 16 KiB、
完整 watch/reload 信号生命周期、长期压力或性能. M4 分层矩阵仍未完成.
API 28 watch SIGABRT/clone EAGAIN 与原 JSC 压力 `2 < 3` 的历史问题仍开放,
不能由本批结果推断其根因或关闭它们. Baseline 仍为原探针 560/560、原 Binder
128/128; 原 JSC Binder 32/32、压力 28/28 不变. 官方最低 API 33 与
`distributionReady=false` 不变, 未发布或推送.

本机一次性构建、设备 driver、原始输出与后续验证记录位于
`E:/.codex-tmp/runtime-api-boundaries-20260914/SESSION_HANDOFF.local.md`.
后续应先读取该交接并核对活动进程, 不重复运行这些已完成的 driver.
