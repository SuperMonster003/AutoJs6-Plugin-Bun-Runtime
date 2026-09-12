# M3: 九补丁实验运行时的真实插件 Binder 验证

证据日期: 2026-09-12. G2, 独立 test-only 插件, 非生产 v0.2.2 或 Release 验收.

九补丁 `1.4.0+7b9ac2668` 已通过现有完整 8 项插件 Binder 套件. 九个原生环境各两轮, **144/144**. 这次运行的是真实 `BunRuntimeService`, 并非只运行原 25 项独立应用进程探针, 也不需要用户手动操作 Binder. [完整机器报告](2026-09-12-m3-experimental-binder.json) 保存每轮原始 instrumentation, APK 摘要, 内嵌构建来源绑定和清理结果.

| 环境 | API | 原生 ABI | 页大小 | 两轮结果 |
|---|---:|---|---:|---|
| Sony G8441 | 28 | arm64-v8a | 4096 | 8/8 + 8/8 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 8/8 + 8/8 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 8/8 + 8/8 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 8/8 + 8/8 |
| Samsung RTL SM-A566B | 36 | arm64-v8a | 16384 | 8/8 + 8/8 |
| bun-binder-api28-x64, AOSP | 28 | x86_64 | 4096 | 8/8 + 8/8 |
| bun-binder-api30-x64, Google Play | 30 | x86_64 | 4096 | 8/8 + 8/8 |
| AVD_API_31_Play | 31 | x86_64 | 4096 | 8/8 + 8/8 |
| AVD_API_36.1 | 36 | x86_64 | 4096 | 8/8 + 8/8 |

三星为 kernel `aarch64`, native bridge=`0`. x86 AVD 的 ARM translator 可用性不是 x86 ELF 使用翻译的证据; 报告同时约束 primary ABI, kernel 架构和实际 payload 摘要. API 与页大小在每项测试前硬断言, 每轮前 force-stop 并重新启动进程. API 28 shell 的 `getconf` 缺失保留为环境事实, 使用 `/proc/self/smaps` 和测试进程内 `Os.sysconf` 验证.

## 实现与范围

新 [opt-in 模块](../../tools/bun-runtime/experimental/api28/binder/README.md) 的包名以 `.api28binder` 结尾, `minSdk=28`, `testOnly=true`, 没有 Release variant. 复用生产 Java/Kotlin, manifest, 资源, 两个锁定 API AAR 和原 8 项 instrumentation 方法; 仅将版本/revision/variant/minApi/页上限的期望值改为构建常量. 正式构建有单元测试保证这些常量仍等于共享 API 的官方身份、API 33 和 x86 4096-byte 上限.

八项覆盖安装后 native 摘要, discovery/action/category/Wake/权限元数据, `getInfo`, prewarm, JS/TS 与样例, stdout/stderr, 非法请求, 超时, 取消和输出限制. 忽略 SIGTERM 的强制回收及其他取消路径每轮输出五条成功诊断, 共 90 条; 报告的整次执行耗时为 305-3339 ms, **不是**从发送终止请求开始的纯回收延迟. 每轮后、卸载后 application UID 进程数均为 0.

实际执行仍通过锁定 supervisor, 从只读 `nativeLibraryDir` 启动 PIE, 参数仍为单源码 `bun run --no-install`. 未加入相对项目导入、AutoJs6 globals 或 Java bridge, 未修改真实签名权限检查. 不把独立进程称为安全沙箱.

## 失败诊断与来源边界

早期 harness 运行遇到 manifest 格式差异、`pm` 同时返回主包/测试包、旧 UID 解析器的固定包名、API 28 无 `getconf`, 以及把 stream-only 生命周期消息当成测试完成消息的问题. 修正的是工具解析, 原有测试断言没有放宽. 另有缺少真实 signature permission 的 Binder `SecurityException`; 改用已有匹配签名配置后完整重跑, 没有跳过权限检查. API 28 旧 AVD 安装测试包时出现 `INSTALL_FAILED_DUPLICATE_PERMISSION`, 保留其已有 AutoJs6, 另建干净 AVD 完成最终测试. [失败诊断归档](2026-09-12-binder-preliminary-diagnostics.json) 保留输入摘要、原始轮次与当时的错误; 缺失 UID 观测写作 null, 不推断为 0. 原失败不计入上表, 不重写成通过.

所有成功报告绑定其实际测试 APK 内嵌的源输入列表, 而不是事后给工作树补一个摘要. 后续增强了 builder/runner 的 API AAR 前置检查、签名与 installed-test-APK 摘要检查、输入覆盖和 lint 生成资源依赖; 这些新检查及随后生成的文档不倒推为上述历史 APK 已执行. 最终工具在 Sony API 28 与 Xiaomi API 35 ARM64 / 4 KiB 各重跑两轮 8/8, [补充回归报告](2026-09-12-m3-binder-tooling-regression.json) 记录新的 32/32、签名与两个 installed APK 摘要; 不重复累加为新增环境. 原 9 补丁双 ABI ELF 字节、构建证据、25 项探针和全部 2026-09-10/11 历史报告保持不变.

本轮启动的六个不同 AVD (原有 API 36 4 KiB/16 KiB、原有 API 28、原有 API 31、两个新建 API 28/30) 均已关闭, 最后 ADB 设备列表只剩原有四台物理设备. 两个新建 AVD 的配置保留, 未删除或重置旧 AVD/AutoJs6. 三星测试结束时测试包已卸载、UID 进程归零, 之后不再使用其预约. 原生构建容器已结束, 不留后台测试任务.

API 29/32 x86 镜像下载发生 SDK 下载器错误, 不计为执行证据; API 32 ARM64 真机也尚缺. 已通过的是现有 8 项插件 Binder 套件, 不是全部 syscall/SIGSYS/FD 边界, watch/reload, Android 高 FD/hard-limit, 全 Bun CLI 或完整 OEM 矩阵. 正式插件仍只支持 Android 13+, `distributionReady=false`. [x86_64 16 KiB 的新 JSC 候选](2026-09-12-m5-x86-16k-jsc.md) 是独立证据, 不替换此处原九补丁 x86 字节.
