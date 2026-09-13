# M5: 十二补丁大页 JSC 候选

2026-09-13 (Asia/Shanghai). 本轮在 Bun `06e518f73b4fccc6c3ffb17412ea166bf886bed0`
上重新生成独立大页 JSC 候选, revision `1.4.0+06e518f73`, tree
`1eb8d5ea945001f018bdf14bd00c261d40b02573`. 官方 payload、API 33+ 产品边界和
十二补丁 baseline 的原生文件保持不变; `distributionReady=false`.

## 新源码与可复现构建

第 11/12 补丁的 parent/child mask 和 Android epoll caller mask/pending 修复沿用
已经锁定的源码, 没有新补丁或 JSC 配置变更. 使用两个全新独立 Bun checkout 完整离线构建,
两个实际 driver exit 都为 0, 两份完整 x86_64 成品逐字节一致:

| 字段 | 结果 |
| --- | --- |
| 字节数 | 90609496 |
| SHA-256 | `34edd4b99d74c7472febfcc3f1a1c6068bd57cd5714aab150b5b86dafa75b1ad` |
| ELF | x86_64 Android PIE, 完整两份 ELF 审计通过, PT_LOAD 至少 16384-byte 对齐 |
| 新 Bun 构建 | 2, 实际退出码 0/0 |
| 新 WebKit / ICU 构建 | 0 / 0 |
| 复用输入 | 两套此前独立构建的三个 JSC 库与生成 config, 原锁定上游 ICU |

仍固定 WebKit `0f966e81b78c84bb23213e391bc679c4ef83e56b`,
`USE_64KB_PAGE_BLOCK=1`, JIT/DFG/FTL/Wasm-JIT 与 external mimalloc 原设置.
每次完整预检 22 source、206 Cargo、125 npm 输入. 两次 clean head/tree、完整日志、
唯一最终 link/map/strip edges、原始 driver 摘要和实际 build interval 均已绑定.
新增 schema 2 候选同时绑定五个 JSC recipe 与十六个 API28 build inputs, 二十一项
在两轮构建期间均未漂移. 缺失/非零退出码、复用旧 bytes、重复目录/receipt、未完成
Ninja 边或输入漂移都会被拒绝. 不把 Ninja dry-run 退出码当作原构建退出码.

本机既有 `verify-experiment.mjs` 有 1479 个 CRLF 和两行 LF (1011/1012),
实际 84833 bytes, Git 规范文本为 83354 bytes. 最初直接比较两种摘要的 recorder
失败, 第二次仅支持统一换行也失败; 两次都在写候选锁之前结束. 原始失败日志保留.
最终记录显式保存精确换行映射, 从规范源码重建每一个原始字节并验证完整 SHA-256,
同时复核构建后的物理文件与原 driver 一致. 错误/重复行号、缺失映射、源内容和摘要
漂移均被拒绝. 原构建日志、退出码、源码与二进制没有改变或重跑.

[独立候选锁](../../tools/bun-runtime/experimental/webkit-x86_64-16k/twelve-patch-candidate.lock.json)
与 [独立构建归档](2026-09-13-m5-twelve-patch-jsc-builds.json) 保留上述证据.
原九补丁 incremental candidate、后续 clean-build 归档和十补丁 rebase 锁/成绩全部保持原样.

## APK 与设备门禁

当前 isolated `jsc16k` profile 只选择新的十二补丁候选, 要求它与 baseline source
完全一致; 编译输入 receipt 和安装前后 payload/signature 校验继续生效.
原八个 Binder 方法、原七种压力模式的 asset、Java instrumentation、语义 validator
和所有时间/输出预算保持不变, 已与十补丁接受归档逐项核对.
本构建阶段尚未增加设备通过数; 两种页大小的新 APK/设备结果将在后续独立归档.

x86 API 36 的 16 KiB 用户页 ABI 模拟与 4 KiB 内核映射需要分别记录, 不能当作 ARM64
硬件 16 KiB. 可用 ARM translator 不代表 x86 ELF 经过翻译. 本候选结果不增加 baseline
十二补丁的 330/330 应用探针或 80/80 Binder 历史五环境计数. 剩余 syscall/API/FD/OEM、
watch/reload、cgroup/clone3、FD70000/UNSHARE、长时压力/性能、全 JIT/Wasm 和签名
Release/对应源码门禁继续开放.
