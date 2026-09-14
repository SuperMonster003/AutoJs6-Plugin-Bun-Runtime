# M4 固定 TLS/IPv6 套件与 HTTPS ALPN 阻塞

2026-09-14, 十三补丁 baseline `1.4.0+e8b129616` 经真实生产 Binder 服务运行
四个新固定模式, 在五个原生 4 KiB 环境各执行两轮. **四模式门禁未通过**:
20 个 TLS 前缀模式通过, 10 个 HTTPS 模式在 ALPN 断言失败, 10 个后续 IPv6 模式未进入.
所有固定轮次完整保留, 没有重试、改动夹具或放宽断言.

[原始失败与逐轮分类](2026-09-14-m4-runtime-network-failure.json)保存完整 instrumentation,
[源码/APK/检查和清理补充](2026-09-14-m4-runtime-network-checkpoints.json)绑定构建、源码审阅与 UID.
这两份均明确 `compatibilityAcceptance=false`、`distributionReady=false`.

## 固定模式及结果

`RuntimeNetworkInstrumentedTest.fixedTlsAndIpv6Boundaries` 只在 opt-in 实验测试 APK 中,
复用生产服务、supervisor、共享 API AAR、签名及权限. 每次仍只发送一个不可变源码快照.

| 顺序 | 模式 | 固定要求 | 十轮结果 |
| --- | --- | --- | --- |
| 1 | tls-transport | TLS 1.2 和 1.3 各一连接, 显式 CA/主机名校验, 精确证书, SNI/ALPN, 4096-byte 二进制往返与正常关闭 | 10 次通过, 20 个协议会话 |
| 2 | tls-rejection | 错误 CA 和主机名在 secureConnect 前被拒绝, 无应用数据, 随后有效连接成功 | 10 次通过, 20 次拒绝和 10 次有效恢复 |
| 3 | https | 验证身份的本地 HTTPS, TLS 1.2, HTTP/1.1 ALPN, 精确 UTF-8 响应和关闭 | 10 次失败, 实际 ALPN 为 false |
| 4 | ipv6 | 字面量 ::1 的 TCP/UDP/HTTP, 精确数据、IPv6 对端和 socket 清理 | 前置 HTTPS 失败后未进入, 无 Android 观察 |

CA 拒绝只接受两个预先固定的 issuer-validation 错误码, 主机名拒绝必须为
`ERR_TLS_CERT_ALTNAME_INVALID`; timeout、reset 或跳过校验不能代替拒绝.
所有成功 TLS 记录都通过独立语义解析, 正确证书 SHA-256 为
`7b034ddbc1312df570defa395e580eb9cccff357ecdc95cfdef807d4813808ae`.

每份源码上限 12288 bytes, 工作期限 8000 ms, Binder 超时 12000 ms,
总输出上限 16384 bytes, 成功 JSON 行上限 8192 bytes. TLS/HTTPS 只绑定
127.0.0.1 动态端口, IPv6 夹具规定 ::1 动态端口; 不访问外网、安装依赖或修改系统信任库.
证书与叶密钥是有明确标记的公开测试材料, 无真实身份或外部授权, 根签名密钥未保留.
主机校验器检查证书链、私钥匹配、主机名、2000-2100 固定有效期及三份源码的嵌入字节.

## 设备与原始失败

所有环境均为原生 ABI、应用/内核 4096-byte 页. 每个成功 JS 的 auxv 和 smaps
与 Java sysconf 一致; 已安装 APK、实际 ELF 和设备 ABI 另行核验.

| 设备 | API | ABI | 两轮结果 | 卸载后两个 UID |
| --- | ---: | --- | --- | --- |
| G8441 | 28 | arm64-v8a | TLS 前两模式各通过两轮, HTTPS 两轮失败, IPv6 未进入 | 10777 / 10778, 均 0 进程 |
| XQ-AT72 | 31 | arm64-v8a | TLS 前两模式各通过两轮, HTTPS 两轮失败, IPv6 未进入 | 15135 / 15136, 均 0 进程 |
| 22120RN86C | 33 | arm64-v8a | TLS 前两模式各通过两轮, HTTPS 两轮失败, IPv6 未进入 | 10537 / 10538, 均 0 进程 |
| 23046RP50C | 35 | arm64-v8a | TLS 前两模式各通过两轮, HTTPS 两轮失败, IPv6 未进入 | 11039 / 11040, 均 0 进程 |
| sdk_gphone64_x86_64 | 33 | x86_64 | TLS 前两模式各通过两轮, HTTPS 两轮失败, IPv6 未进入 | 10174 / 10175, 均 0 进程 |

每轮 HTTPS 都在 `runtime-network-https.mjs.js:75:60` 抛出同一断言:
`peer.alpn` 实际为 `false`, 预期为 `http/1.1`, Bun exit 1 / `NON_ZERO_EXIT`.
原 Kotlin 测试在此失败, JUnit 保留一个失败结果. Runner 的整体成功解析未返回部分数组,
所以其进度显示 0/4; 独立失败归档器再从完整原始流严格验证两个 TLS 成功记录.
不得把这个显示值解释为 TLS 均未执行, 也不得把前缀结果计为四模式门禁通过.

原始四份 JS、Kotlin 顺序、所有预算及成功条件从 APK 源码提交之后保持不变.
五次 runner 实际 exit 均为 1; 外层 driver 完成清理后也因固定批次含失败而 exit 1.
没有设备替换、安装前失败、异常退出重试或第二批 APK.

## 锁定源码的定位

只读检查干净 `e8b1296169a8e6f20c81e926dba6448afb25cd11` checkout, 绑定三个
Git blob 的完整 SHA-256 与行号片段, 原始内容保存在 checkpoint 的 `sourceReview`:

- `src/js/node/https.ts:499-526`: `createServer` 把 ALPNProtocols 转换并存到公开 server 对象.
- `src/js/node/_http_server.ts:350-380`: 构造私有 TLS 配置时逐项传递 key/cert/CA、版本等,
  没有 ALPNProtocols 或 ALPNCallback. 同文件的 listen 使用该私有对象并传给 Bun.serve.
- `src/js/node/tls.ts:1497-1509`: 直接 TLS 服务有独立的 ALPN 转发路径,
  与本批直接 TLS 模式能够成功协商的观察一致.

这明确指出 HTTPS 配置转发中的遗漏, 与十次设备失败相符. 本机真实 HTTPS 对照中,
保留有效证书但让服务端不提供 ALPN 时, 同一夹具也准确拒绝. **尚无修复后原生构建的
因果确认**, 不能据此宣称 HTTPS 已修复或推断后续响应/关闭检查一定通过.

后续应保留本批完整失败, 固定最小配置转发修复及原上游回归测试, 先核对现有构建进程
和磁盘预算, 再决定独立干净构建范围. 新源/新字节必须有自己的来源和设备证据;
原 HTTPS ALPN 断言、TLS 身份校验和 IPv6 要求继续保留.

## 来源、清理与项目验证

唯一 APK 批次绑定 105 个输入到 `389c19b157c6e173b0287d679821a6e63f385c74`.
后加失败分类工具的提交为 `b2f09d0bd14211f97b288dfda0fa406c096669ec`, 105 输入逐项不变.
实验 APK 构建 actual exit 0, 12 s / 80 tasks, 12 executed / 68 up-to-date.

| APK | bytes | SHA-256 |
| --- | ---: | --- |
| ARM64 main | 41140290 | 06c9f30fd0e239e0eada8c111ce75795a2dbaa4be79806a0c763b5bca11799fc |
| x86_64 main | 42962132 | 2bfe2a6e99b4832b7397a33c19afe23983932f1affaea4cc6bbf91891263cb47 |
| androidTest | 2518257 | 1e1c351366ae2a370f8b5474ddd33390382bb2e7fc604825e4d17b9e260b1a21 |

Bun/WebKit/ICU 均未重建, 复用 baseline ARM64 `c8f2513f...15427160` 与 x86
`cb3104fb...cf4043ac`. 官方 payload、supervisor、原八项 Binder、35 应用探针、
前四模式 runtime-api 与所有 JSC 夹具保持原字节.

20 个成功 TLS workspace 有直接删除断言; 失败 HTTPS 没有独立 workspace 见证,
不把它加入该数量. 每个环境的两个测试包均卸载, 完整数字 UID 进程清单证明十个 UID
各为零进程. 唯一 owned `bun-hard-limit-api33-20260912` / emulator-5584 于
07:15:11Z 关闭. 其他 emulator-5594/5598 未操作, localhost:37478 offline 未使用.

最终 Node 47 文件 **306/306** 通过, 包含真实四模式主机网络测试和 13 项本套件校验;
主机结果不作为 Android/Bun 通过证据. IDE 构建成功, 最后一次仅既有 SDK XML 警告.
官方 runtime/supervisor 校验通过. 生产 Debug 四个 Gradle gate actual exit 0,
11 s / 96 tasks, 49 executed / 47 up-to-date; 包含 APK 字节和 16 KiB ZIP 对齐验证.
JVM 任务为 UP-TO-DATE, 既有 21 项全通过结果不称本轮重跑; lint 为 0 errors / 44 warnings.

原 125 份历史报告、125 注册项、217 矩阵行和 146 个保护文件保持不变,
新增两份 JSON 只增加索引, 共 127 来源. 旧 API 40/40、baseline 560/560 探针及
128/128 Binder、原 JSC 32/32 与 28/28 不增加. HTTPS、IPv6、更多 API/FD/OEM、
原生 16 KiB、长期压力/性能、Android 9+ 稳定化及 Release 门禁保持开放.
