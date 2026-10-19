# Bun 宿主 API 客户端

当前源码提供一个显式导入的轻量客户端, 与 Bun 自身的 API 和原生 `console` 分开使用. 客户端随插件打包, 无需下载 npm 包. 匹配的 AutoJs6 宿主必须实现并授权对应能力; 安装新版 Bun 插件本身不会让旧宿主获得新 API.

## 加载及协商

```js
"bun";

const sdkPath = process.env.AUTOJS6_HOST_CLIENT_MODULE;
if (!sdkPath) throw new Error("本次执行未提供宿主客户端, 请检查插件版本及宿主能力授权");
const { createHostClient } = await import(sdkPath);
const host = await createHostClient();
console.log(host.capabilities);
console.log(await host.device.info());
```

模块写在本次执行的 `autojs6/host-client.mjs`, 与执行工作区一同清理. 只有提供动态桥时才设置 `AUTOJS6_HOST_CLIENT_MODULE`. 单源码和项目归档使用相同入口; 不注入 `click`, `toast`, `pinyin`, `cX` 等 Rhino 全局, 不注册虚构的 Bun 内建模块. 客户端先调用 `GET /v1/info`, 仅向本次运行实际授权的能力发送请求. `host.hasCapability(id)` 表示宿主授权, 不保证 Android 权限或相应拼音插件可用. 撤销授权从下一次运行生效.

`host-client.d.mts` 与实际模块放在同一个资源目录, 可复制到开发项目并通过 `import type` 引用. Ace/AutoJs6 声明中的 `autojs6:bun-host` 是这个 SDK 的类型镜像, 仅作类型引用:

```ts
"bun";
const sdk: typeof import("autojs6:bun-host") = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE!);
const host = await sdk.createHostClient();
const text: string = await host.pinyin.simple("北京上海");
console.log(text);
```

运行时不要执行 `import ... from "autojs6:bun-host"`. 真实导入目标始终是环境变量提供的模块路径.

## 已提供的能力

| 授权 ID | 客户端 | 默认授权 | 行为 |
|---|---|---|---|
| `ui.toast` | `host.toast(text, duration?)` | 开启 | 现有短消息通知, 每次执行最多 4 条 |
| `device.info` | `host.device.info()` | 开启 | Build 品牌/型号/系统版本/ABI, 不含标识符 |
| `text.pinyin` | `host.pinyin` | 开启 | 宿主 Pinyin 插件, 无小字典回退 |
| `text.pinyin4j` | `host.pinyin4j` | 开启 | 宿主 Pinyin4j 插件, 含多音字读音矩阵 |
| `text.opencc` | `host.opencc` | 开启 | 宿主 3-Hanzi CC 插件, 完整 32 类转换及复合转换计划 |
| `image.process` | `host.images` 的内存方法 | 开启 | 图像解码, 编码, 像素, 变换, 搜索和回收 |
| `image.files` | `host.images.readImage/saveImage` | 关闭 | 读取或写入宿主可访问的图片文件 |
| `screen.capture` | `host.images.requestScreenCapture/captureScreen/stopScreenCapture` | 关闭 | 请求 Android 同意, 取得屏幕帧和停止会话 |
| `screen.metrics` | `host.coordinates` | 开启 | 实时屏幕坐标换算, 本执行的 Scale 基数 |
| `console.control` | `host.console` | 关闭 | 本执行控制台窗口, 外观及日志配置 |

这些组可以在 AutoJs6 插件中心的 Bun 设置页独立撤销, 对下一次执行生效. 拼音和 OpenCC 还需要对应插件安装并启用; 控制台显示需要 Android 悬浮窗权限. 图像的 OpenCV 运算需要宿主可用的 OpenCV 实现. 屏幕截图开关只允许申请权限, 仍需 Android 的录屏授权. 当前客户端没有无障碍, OCR, UI 布局, Java 或 `rhino.run` 等能力.

宿主操作方法返回 Promise, 应等待结果或处理错误; `hasCapability` 和 `images.getSize` 同步读取本地信息. 方法调用通过 `{method, args}` 发送, 成功值包含在 `{value: ...}` 中. `host.call` 可以直接发送能力请求, 仍受相同授权, 方法范围和参数规则约束.

### 拼音

```js
console.log(await host.pinyin.simple("北京上海"));
console.log(await host.pinyin.convert("重庆", { style: "TONE", heteronym: true }));
console.log(await host.pinyin4j.of("北京上海", { separator: " ", tone: "WITHOUT_TONE" }));
console.log(await host.pinyin4j.readings("重庆"));
```

`pinyin` 提供 `convert`, `simple`, `compare`, `compact`, `fromCodePoint`, `fromPhrase`; `pinyin4j` 提供 `of`, `as`, `readings`. `compact` 与 `readings` 返回二维字符串数组. 字典外文字交给真实插件处理; 插件缺失或执行失败会返回错误, 不把原文当成成功转换.

### OpenCC

```js
console.log(await host.opencc("简体中文", "s2t"));
console.log(await host.opencc.convert("简体中文", "S2TW"));
console.log(await host.opencc.s2twp("软件与鼠标"));
console.log(await host.opencc.jp2twi("漢字"));
```

`host.opencc` 是可调用函数, 同时提供 `convert` 和 32 个小写转换名方法. `OPENCC_CONVERSION_TYPES` 导出完整名称列表. 宿主使用与 Rhino 一致的 OpenCC 转换计划, 包括别名和多阶段转换. 返回值均为 `Promise<string>`, 不再使用不支持的占位函数. 空字符串可以转换; `null` 和 `undefined` 会被拒绝. 缺少 provider 或用户撤销授权时返回错误, 不原样返回输入伪装成转换成功.

### 图像和像素

```js
const image = await host.images.fromBytes(encodedPngBytes);
try {
  console.log(host.images.getSize(image));
  console.log(await host.images.pixel(image, 0, 0));
  console.log(await host.images.readPixels(image, { region: [0, 0, 2, 2] }));
  const copy = await host.images.rotate(image, 90, { filter: false });
  try { console.log(await host.images.toBase64(copy, "png")); }
  finally { await host.images.recycle(copy); }
} finally { await host.images.recycle(image); }
```

图像句柄是冻结值 `{id, __autojs6ImageHandle, width, height}`, 由本次执行的宿主图像 provider 所有. 句柄没有 Rhino `ImageWrapper` 的 Java 对象和实例方法. `copy`, `clip`, `resize`, `scale`, `rotate`, `flip`, `grayscale`, `threshold`, `blur`, `gaussianBlur`, `medianBlur`, `invert` 返回独立的新句柄, 不消耗输入图像. 显式 `recycle` 释放图像; 执行结束也会清理所有剩余句柄. 其他执行的句柄及已回收句柄不能用于图像操作, 默认每次执行最多保留 32 个宿主图像句柄.

`pixel` 返回有符号 ARGB32 整数. `readPixels` 返回 `{data: number[], width, height}`, `data` 按行排列同样的 ARGB32 值, 含 alpha, 不是 RGBA 字节. 支持 `findColor`, `findMultiColors`, `detectsColor`/`detectColor`, `findAllPointsForColor`/`findPointsByColor`, `findImage`, `matchTemplate`. 这些方法不意味着全部高级 OpenCV 特征匹配接口已覆盖.

`fromBase64` 解码编码图片, `fromBytes` 将 PNG/JPEG/WebP 等编码图片字节转为 base64 后调用同一入口. `toBase64` 默认 PNG, 可选 PNG/JPEG/WebP 和 quality; `toBytes` 将相同编码结果复制为 `Uint8Array`, 回收原图后字节仍有效. Bun 不支持 Node 的 PFD 上传或 `toBytes(..., "rgba")` 重载. JPEG 本身不保存透明度, 需要 alpha 时使用 PNG 或合适的 WebP 格式.

图像也受 64 KiB 请求和 256 KiB 结果的既有 JSON 限制, base64 字符串, 参数和封装字段共同占用额度. 不能把该额度当作可用原始像素或图片文件字节数. 大型图片使用 `readImage`/`saveImage` 的宿主文件路径, 分块像素读取使用 `region`. 该路径按宿主工作目录和 Android 文件权限解析, 内存处理授权不能代替 `image.files` 文件授权. 截图本身返回宿主持有的图像句柄.

完整可运行示例见 [`samples/opencc-images.bun.js`](../samples/opencc-images.bun.js), 使用包含透明度的 3x2 PNG 验证像素和编码往返, 并在 `finally` 中回收派生图像.

`readPixels` 单次最多返回 16,384 个像素, `findAllPointsForColor` 最多返回 4,096 个匹配点, 超限会拒绝而非截断. 后者匹配不透明像素, 使用 RGB 各通道阈值并返回图像自身坐标. `detectsColor` 默认使用 diff 算法, 另可指定 rgb/rgb+/hs/h/equal/oklab. 编解码, 像素读取, 复制, 裁剪, 旋转, 翻转及 detectsColor 不依赖 OpenCV; 缩放, 滤镜和图像搜索需要可用的 OpenCV 插件.

### 屏幕截图

```js
await host.images.requestScreenCapture({ timeoutMs: 45000 });
try {
  const frame = await host.images.captureScreen();
  try { console.log(host.images.getSize(frame)); }
  finally { await host.images.recycle(frame); }
} finally { await host.images.stopScreenCapture(); }
```

`requestScreenCapture` 支持 `orientation` (auto/portrait/landscape), 同时指定的 width/height, `requireExistingPermission` 和 timeoutMs (1-120000, 默认 120000). 指定尺寸保持固定, 自动方向则跟随显示变化. 申请成功返回 true, 系统拒绝或超时会拒绝 Promise. 并发申请共用当前客户端的一个 Promise. `captureScreen()` 必须使用本次执行已授权的 MediaProjection, 不改用其他截图来源. `stopScreenCapture()` 停止会话或取消待处理授权, 返回是否曾持有会话/请求; 执行结束也会清理.

等待 Android 同意使用每次最多 1 秒的状态查询, 不扩大普通宿主调用的 10 秒上限. 整体脚本超时仍优先, Bun 默认执行限时为 60 秒, 可通过执行配置的 bun.timeoutMillis 调整. 停止或系统撤销后重新申请需要新的 Android 同意. 屏幕视频使用 `host.screenRecorder`, 另需默认关闭的 `screen.record` 文件输出授权.

### 屏幕视频录制

`host.screenRecorder` 将已授权的屏幕录制为 H.264/MP4 视频, 默认无声. 需要同时启用 `screen.capture` 和 `screen.record` (均默认关闭), 并先完成 `host.images.requestScreenCapture()`. `screen.record` 允许宿主输出 MP4 文件, 不替代系统授权, 也不依赖图像文件的 `image.files` 开关.

| 方法 | 返回值 | 行为 |
| --- | --- | --- |
| `start(path, options?)` | `Promise<ScreenRecordingActive>` | 开始录制, 路径必须以 `.mp4` 结尾, 已存在的目标文件会被拒绝 |
| `getStatus()` | `Promise<ScreenRecordingStatus>` | `state` 为 idle, recording 或 failed; 活动状态包含 id, path, width, height, frameRate, bitRate, elapsedMs, audio, audioSource 和 error |
| `stop()` | `Promise<ScreenRecordingResult \| null>` | 正常收尾并输出文件; 当前未录制时返回 null |
| `cancel()` | `Promise<boolean>` | 丢弃未完成视频, 保持截图会话; 当前未录制时返回 false |

`options.width` 和 `options.height` 必须同时指定, 为 2..8192 内的偶数; 省略时使用截图会话尺寸. `frameRate` 为 1..120 的整数, 默认 30; `bitRate` 为正整数, 单位 bit/s, 默认 8000000. 尺寸, 帧率和码率还必须受到当前 Android H.264 编码器支持. 不支持的配置拒绝 Promise, 不自动降级. 音频通过 audio 选项单独启用.

`options.audio` 选择音频来源, 默认 `"none"`, 也可用 false 表示不录音:

| audio | 音频 | 额外能力授权 |
| --- | --- | --- |
| `"none"` / false | 无音轨 | 无 |
| `"microphone"` | 麦克风 | screen.record.microphone |
| `"playback"` | 允许捕获的应用播放声音 | screen.record.playback |
| `"mixed"` | 麦克风和应用播放声音, 每路 0.5 增益混合 | 上述两项 |

两个音频开关默认关闭, 修改对下一次执行生效. 所有有声模式都需要宿主的 Android `RECORD_AUDIO` 运行时权限, 包括只捕获应用播放声音的模式. 缺少权限会明确拒绝, 不偷偷降级为无声录制; 可在 Android 的 AutoJs6 应用权限设置中授权. 麦克风模式还使用带停止按钮的麦克风前台服务; Android 14+ 的使用中权限规则要求从允许的前台状态启动, 不能用插件能力开关绕过后台限制. 通知中的停止按钮会取消使用该服务的录制并丢弃未完成视频.

音轨采用 AAC-LC, 48 kHz, 单声道, 128 kbit/s. 播放捕获使用 Android AudioPlaybackCapture, 只包含同一用户配置下允许捕获的 MEDIA/GAME/UNKNOWN 用途音频. 来源应用禁止捕获时, 该来源保持静音; 系统麦克风隐私开关或音频共享规则也可能静音输入. `audio: true` 的结果字段表示文件存在音轨, 不表示一定有可听见的声音. 参阅 [Android 音视频捕获规则](https://developer.android.com/media/platform/av-capture) 与 [麦克风前台服务要求](https://developer.android.com/develop/background-work/services/fgs/service-types#microphone).

输出路径属于宿主, 相对路径按脚本工作目录解析, 仍受 Android 文件访问规则限制. 录制先写临时文件, `stop()` 成功后才生成目标文件. 结果包含 `id`, `path`, `size` (字节), `durationMs`, `width`, `height`, `mimeType: 'video/mp4'`, `videoCodec: 'h264'`, `audio` 和 `audioSource`. 有声录制还返回 `audioCodec: 'aac'`, `audioSampleRate: 48000` 和 `audioChannels: 1`; 无声时这三个字段为 null. 没有编码出有效视频帧时停止会失败, 不生成一个冒充成功的空视频.

每次执行只允许一个活动录制. 录制期间可以继续调用 `host.images.captureScreen()`, 截图和编码从同一投影帧输入取得数据, 不额外申请授权或暂停录制. 截图尺寸遵循 requestScreenCapture 的设置: 自动方向跟随当前屏幕, 固定尺寸保持指定值, 不被视频输出尺寸替换. 停止或取消录制后截图仍然可用, 也可复用同一授权开始下一段录像. 视频输出尺寸在一段录像内保持固定, 横竖屏变化由 Android 等比缩放居中显示, 可能出现留边. 需要交换宽高时应停止当前录像后以新尺寸开始下一段. `stopScreenCapture()`, 执行结束/取消和系统撤销授权会丢弃未完成文件, 因此保留视频需要显式等待 `stop()` 完成.

```js
"bun";
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
await host.images.requestScreenCapture();
try {
    await host.screenRecorder.start(`/sdcard/Movies/autojs6-${Date.now()}.mp4`, {
        width: 720, height: 1280, frameRate: 30, bitRate: 4000000,
        audio: 'playback', // 需要额外授权和 Android 录音权限.
    });
    let frame = await host.images.captureScreen();
    try { console.log(host.images.getSize(frame)); }
    finally { await host.images.recycle(frame); }
    await Bun.sleep(3000);
    let video = await host.screenRecorder.stop();
    console.log(video.path, video.durationMs, video.size);
} finally {
    await host.screenRecorder.cancel();
    await host.images.stopScreenCapture();
}
```

目标文件名应保持唯一. 较长录制须同时配置足够的 `bun.timeoutMillis`; 编码期间不占用一条长时间宿主调用, 开始和停止仍受普通调用超时约束. 音视频按同一单调时钟写入一个 MP4, 停止时无需重新合并整段文件. frameRate 是目标帧率; 高频大尺寸截图的像素读回会占用图形处理时间.

### 坐标

```js
const screen = await host.coordinates.getInfo(); // width, height, rotation, baseX, baseY
console.log(await host.coordinates.cX(), await host.coordinates.cY());
console.log(await host.coordinates.cX(360, 720, false));
console.log(await host.coordinates.cY(0.5, true));
console.log(await host.coordinates.cXy(0.5, "16:9"));
console.log(await host.coordinates.cYx(0.5, "16:9"));
await host.coordinates.setScaleBases(1080, 1920);
console.log(await host.coordinates.getScaleBases());
```

四个转换函数复用 Rhino 的 `CoordinateScale` 规则, 每次调用读取当前方向的屏幕尺寸, 不采用启动时尺寸快照. 默认基数为 X=720、Y=1280. `cX/cY` 无参数返回当前宽/高. `abs(value) < 1` 默认进入比例模式; 第二参数可使用 `true`, `false`, `"auto"` 简写, 也可用第三参数显式选择比例模式. `cXy/cYx` 的比例基数始终解释为宽/高, 可使用数字或 `"宽:高"`, 横屏也不反转这个定义.

`getScaleBaseX/Y`, `getScaleBases`, `setScaleBaseX/Y`, `setScaleBases` 管理本次执行的基数, 每个轴只能设置一次. 双轴设置先完整校验, 失败不消耗另一轴的赋值机会. `NaN`, 正负无穷以及显式传入的 `undefined` 坐标在客户端被拒绝, 不会经 JSON 变成 `null`, 也不会变成无参尺寸查询. `cX()`/`cY()` 的无参查询及可选 base/mode 的 `undefined` 默认值仍然有效. 连续异步调用之间设备仍可能旋转; 单次换算以其执行时的屏幕信息为准.

### 控制台

```js
if (host.hasCapability("console.control")) {
  await host.console.setTitle("Bun 运行日志");
  await host.console.setSize(640, 360);
  await host.console.show();
  console.log("这条 Bun 原生日志也会出现在本执行控制台中");
  await host.console.hide();
}
```

窗口方法是真实宿主调用, 不再以返回自身的空操作表示成功. `show/hide/expand/collapse/reset/clear/launch` 与标题、尺寸、位置、文字/背景颜色、触摸和退出配置可用, 完整签名见 `ConsoleApi`. 原生 Bun `console` 不被替换; stdout/stderr 同时转发到本执行控制台和宿主全局日志. `setGlobalLogConfig/resetGlobalLogConfig` 修改宿主的全局日志配置, 不限于本执行, 应谨慎使用并恢复. 控制接口不提供 Rhino 的同步 `input/rawInput` 或 builder 对象.

## 错误与上限

`HostCallError` 包含 `code`, `capability`, `status`. 未授权调用在客户端以 `NOT_GRANTED` 拒绝; socket 不可达返回 `HOST_UNAVAILABLE`; 桥版本不支持返回 `UNSUPPORTED_BRIDGE`; 无效响应返回 `INVALID_RESPONSE`. 宿主返回的参数、权限、插件不可用等失败保持为错误, 客户端不会自动重试或伪造成功值.

桥仍沿用每次执行最多 1024 次调用、4 路并发、请求 64 KiB、结果 256 KiB 和单次宿主 10 s 超时. 客户端为网络往返增加 15 s 上限. 请求在发送后被取消不等于宿主操作撤销; 不应自动重试有副作用的调用.

## 验证

```powershell
node --test tools/host-client/host-client.test.mjs
tsc --strict --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 tools/host-client/types.mts
```

单元测试检查实际客户端的请求、权限拒绝、JSON 数值、异步返回、错误传播以及方法/声明覆盖. Android `hostCapabilityBridgeRoundTrip` 还验证运行时 SDK 路径、真实 Bun 导入、协商、旧宿主能力及执行结束后的文件清理; 完整宿主的拼音、方向换算与窗口效果需要匹配宿主和真机验证.


Advanced image functions now cover all 81 registered host image names, plus readImage and ObjectFrame. Mat/features are opaque execution handles. File/URL access and match drawings require image.files; quantizeToFile additionally requires image.process. File-only handles can still be recycled. Quantized bytes remain subject to the existing Base64 JSON budgets; use descriptor-backed quantizeToFile for large output. See the coordinated host docs/dev/runtime-image-parity-2026-10-17.md and the SDK declarations for exact portable signatures.

## Portable UI and Compose (2026-10-18)

Node main and CJS/ESM/nested Workers expose `ui` and `compose`, including their
`autojs6:` imports. Both use the `ui` manifest capability. Bun exposes the same
local facades as `host.ui` and `host.compose` through separate, default-off
`ui.layout` and `ui.compose` grants. Compose uses the real enabled and authorized
3-Block Compose renderer, its 54 portable V1/V2 components and catalog validation.

UI has JSON layouts, state/bind, window update/batchUpdate/close and on/once/off.
Compose has component/modifier constructors, state/ref/batch/memo, theme, mount,
dialog, floaty, local node mutations and Promise-based window/command effects.
Mount waits for renderer attachment. Event callbacks receive a scalar data object
on the creating JS thread. Text edits preserve the native edit sequence. Ref values
are accepted-frame references, cleared on removal/close. Worker exit closes owned
windows, including late creation replies; other owners remain usable.

Arbitrary Java View/Context objects/property reflection and native overlay adjustment
chrome remain outside the portable contract. `version()` is asynchronous; `sessions`
is a snapshot. `Image.src` accepts execution-owned image handles or host drawable
names. Overlay options use physical pixels and require Android overlay permission.
Bun retains its request/result/concurrency/call limits; event polling counts as
host calls. See the host report `docs/dev/runtime-ui-compose-2026-10-18.md` for
the executed validation and remaining boundaries.

Sessions also expose `showSnackbar` with one action/dismiss callback. Floating
sessions have asynchronous position, size, focus and touch controls. Rotation
recreates native owners while retaining state, text and callback routing.

## Native View interop and packaged applications (2026-10-18)

Host build 5562, Node 1.8.0 and Bun 0.2.7 add ui.context/inflate/createView/findView/view,
native handle get/set/findView/dispose/on/once/off, AndroidView and compose.attach.
XML strings use the supported layout widgets plus a Compose container. Java objects,
arbitrary Android classes and Rhino E4X syntax are not transported. Context factories
run in JavaScript and return a native token asynchronously, not a Java Context.

View handles belong to the execution; only roots can be disposed. Children are aliases.
Compose borrows Views, rejects duplicate/parented/foreign/disposed handles and cycles,
and releases claims on close. Dispose borrowing sessions before their View roots.
Closing/disposal of a container closes its composition, even before it is displayed.
Rotation retains native identity and reconnects lifecycle owners. A successful attach
replaces the previous composition in that container; close it first to reuse its View.
Worker structuredClone transports the identity; ui.view restores local methods.
Only one thread may drain a View event queue. Worker exit closes its sessions but
delivered View handles remain execution-owned. Undelivered creations are disposed.

XML showLayout owns its inflated root. showLayout(handle) borrows the caller's root.
AndroidView factories cache by component identity; new component objects create new
Views, so use an existing handle or memo for stable identity. Factory context exposes
inflate/createView returning raw tokens, which ui.view may wrap. All effects are Promises.

Packaged apps use installed external runtime/Compose plugins and a matching APK Builder
Runtime Kit. Application versionCode 1 is independent from runtimeVersionCode 5562.
Node declares node.permissions:["ui"]. Bun declares bun.hostCapabilities explicitly,
e.g. ["ui.layout","ui.compose"], in project.json; omitted capabilities are not offered.
AndroidView factories and XML attachments need both Bun grants. Bundle host-client.mjs
with the Bun project and import it relatively. The packaged Bun entry uses a separate
normal-permission service; host-only services retain their signature permission, and
execution/cancellation keys include the calling UID. Runtime scripts remain trusted
code under the plugin UID. No native Bun payload or AIDL transaction changed.

## Common XML widgets and native properties (2026-10-18)

Host 5563 and the Node 1.9.0/Bun 0.2.8 clients add 12 native widgets: HorizontalScrollView,
Space, RelativeLayout, CardView, Spinner, SeekBar, RatingBar, RadioGroup, RadioButton,
ToggleButton, CheckedTextView and NumberPicker. XML aliases include hscroll/relative/card/
spinner/seekbar/ratingbar/radiogroup/radio/toggle/checkedtext/numberpicker; img and linear
also map to the existing renderer. Child width, height, margins and weight are retained.
Relative rules accept layout_ aliases and refer to unique sibling XML IDs.

Native View handles expose 46 typed property accessors. Reads return Promises; assignments
queue in order per local wrapper. Await a read or flush() to observe completion and deferred
errors. A reported error does not poison later writes. Values are copied at assignment.
dispose() drains writes and still attempts cleanup after an assignment failure. Non-JSON
values reject synchronously. set(patch) remains explicitly awaitable. Native validation
rejects unknown/read-only properties and unsupported widget/property combinations.

The six read-only accessors are attached, layoutWidth, layoutHeight, drawableWidth,
drawableHeight and xmlId. id/type/context remain synchronous identity metadata. Dimensions
write dp by default or explicit px; geometry/inset/card reads return pixels. textSize reads
sp. flush() confirms submission, not a completed Android layout/draw. Cross-thread callers
coordinate shared handles and event consumption. Image src accepts execution-owned image
handles (copied pixels), host/framework drawable resources or null, without implicit file/URL
access. Limits and widget-specific fields are documented in runtimeApis and the declarations.

Ace offers the async property signatures and XML tag/attribute completion inside typed
ui.inflate literal strings. This remains a finite native widget/property contract, not
arbitrary Java reflection or complete Rhino XML expression binding.
The host report docs/dev/runtime-xml-views-2026-10-18.md records actual device and packaged
application validation, including the matched 6.8.0+5563 Runtime Kit.

## WebView, Drawer, Toolbar and ViewPager (2026-10-18)

Host 6.8.0+5564 with Node.js Runtime 1.10.0 / Bun Runtime 0.2.9 adds four native
components through ui.inflate/createView and XML aliases webview/drawer/toolbar/viewpager.
The same handle wrappers run in Node main, CJS/ESM/nested Workers and Bun host.ui.
Native assignments and the 12 component commands share one ordered queue per wrapper.
The property surface now has 58 writable names and 11 read-only async accessors.

WebView supports loadUrl/loadHtml, evaluateJavascript (decoded JSON), goBack/goForward,
reload/stopLoading and native page/title/progress/error events. JavaScript and DOM storage
start disabled; set javaScriptEnabled before evaluation. Loading resolves on submission;
observe pageFinished for completion. Android permissions, network security and WebView
policies apply. There is no injected Java interface, implicit web permission grant or SSL
bypass. The next section documents the portable WebView client and file APIs.
Destroying an execution/root releases WebViews, including offscreen ViewPager pages.

Drawer accepts one content child and at most one start/end panel using layout_gravity;
openDrawer/closeDrawer accept side (start/end, default start) and animate (default true).
Toolbar exposes title/subtitle, navigationIcon/navigationContentDescription and a menu
array of unique id/title entries with optional icon, enabled, visible and showAsAction.
Navigation/menu clicks return JSON events. showOverflowMenu/hideOverflowMenu return
Android's boolean result; the Toolbar is not automatically an Activity ActionBar.

ViewPager owns the fixed child page list, exposes currentItem/offscreenPageLimit/pageCount
and setCurrentItem(index,smoothScroll=true). Indexes are checked. Native selection/scroll
events and lookup of offscreen descendants are supported. Managed XML/handle windows
retain Views and WebView DOM across Activity recreation. Shared handles remain owned by
the whole execution after the creating Worker exits; close borrowing sessions/windows
before disposing a root. Arbitrary Java reflection and Rhino expression binding remain
outside this contract. See runtimeApis and host docs/dev/runtime-view-components-2026-10-18.md.

## WebView downloads, file selection and clients (2026-10-18)

Host 6.8.0+5565, Node.js Runtime 1.11.0 and Bun Runtime 0.2.10 add the same
WebView facade in Node main, CJS/ESM/nested Workers and Bun host.ui. This adds
19 WebViewClient callbacks, 20 WebChromeClient callbacks and onDownloadStart.
setWebViewClient(client, options), setWebChromeClient(client, options) and
setDownloadListener(callback) accept null to remove the corresponding handlers.
Handlers receive typed JSON data; their this value is the local NativeViewHandle.
The declarations enumerate the supported callbacks and request/reply shapes.

Navigation, resource interception and key decisions must be synchronous in Android.
Submit navigationRules, resourceRules and blockedKeyCodes before loading a page.
Rules match url/urlPrefix, optionally method and mainFrame, in order; the first
match wins. A resource response supplies MIME/encoding/status/headers and body or
bodyBase64. shouldOverrideUrlLoading, shouldInterceptRequest and shouldOverrideKeyEvent
are notifications of the applied decision, not JavaScript return-value hooks.
consumeConsoleMessages is a native option; onConsoleMessage is also a notification.
The bridge never cancels navigation merely to replay loadUrl from an async callback.

Dialog, file, HTTP-auth, SSL, client-certificate, safe-browsing, permission,
geolocation, visited-history and popup requests support Promise-returning handlers.
Unknown, failed, expired and replaced requests cancel or deny by default. Handler
timeouts default to 15 seconds, or 120 seconds for onShowFileChooser; callbackTimeoutMs
accepts 100..2147483647 from host 5567. SSL proceeds only on an explicit 'proceed' reply. Android camera,
microphone and location permissions are still required for an allowed web request.
onCreateWindow may return a new, empty, execution-owned WebView or null; close its
borrowed window before disposing it. Fullscreen uses a private Activity, can be
disabled with fullscreen:false, and can be closed with exitFullscreen().

Without custom handlers, attached WebViews show native JavaScript dialogs and the
system document picker. chooseFiles({acceptTypes, multiple, initialUri}) returns
Promise<string[] | null>; cancelFileChooser() cancels the current selection.
Only readable content URIs from other providers are accepted. The SDK retains new
persistable read grants until View disposal and preserves pre-existing user grants.
Temporary grants from custom handlers keep their Android-defined lifetime.
Open/multiple selection is available from host 5565; camera/save/directory modes
are added by the next section. Arbitrary filesystem paths are not accepted.

setDownloadListener receives URL, agent, disposition, MIME, length and Android's
suggested filename. download(options) explicitly enqueues an HTTP(S) DownloadManager
job in public Downloads and returns {id,url,fileName}; no listener auto-downloads.
getDownload(id) returns its state or null. readDownload(id,offset=0,length=32768)
returns Uint8Array, up to 32768 bytes per read. cancelDownload removes the job/file.
Jobs survive WebView closure. Packaged projects must retain android.permission.INTERNET
in their Android permissions array for network pages/downloads; runtime-plugin
permissions do not replace the packaged app permission. Cookies are included only with includeCookies:true;
custom headers are optional. blob:/data: transfers are added by the next section.

evaluateJavascript(source,{timeoutMs}) now submits an asynchronous native task;
its result does not hold a Bun RPC open while a person answers a dialog. timeoutMs
defaults to 30000 and accepts 100..120000. Callback handlers can read the View or
open chooseFiles without blocking behind the pending evaluation. Android's JSON
result semantics remain unchanged; webpage Promises are not automatically awaited.
The Node project execution budget is independent: interactive project.json files
should explicitly set node.timeoutMs, e.g. 120000, alongside node.permissions:["ui"].
A WebView evaluation/callback timeout does not extend that project-wide budget.

Window/session closure cancels pending native UI requests. View disposal additionally
releases file grants. Worker exit clears only its own client registrations and tasks;
it cannot erase a newer client installed by another thread. A shared View still has
one event-queue reader, so transfer ownership of event consumption explicitly.
Callbacks returning raw Java objects/Bitmaps/Views, obsolete database/quota hooks and
arbitrary Java WebViewClient subclassing remain outside this portable contract.
Ace exposes typed callback names, event fields and Promise results under default
runtime settings. No JSOX prototype extension is required.

## WebView camera, SAF and page downloads (2026-10-18)

Host 6.8.0+5566, Node 1.12.0 and Bun 0.2.11 extend the same main/Worker WebView
facades. chooseFiles accepts mode open/multiple/directory/save or Android values
0/1/2/3. Save creates a new document with fileName; directory returns one tree URI.
writable defaults to true for directory/save and can be disabled for directory.
initialUri is a provider-dependent location hint. Android's restricted directory
rules remain in force. A page's native folder/save requests depend on its WebView
version; explicit chooseFiles uses SAF independently of the page API version.

captureEnabled prefers a full-size system camera image for image acceptTypes.
Host 5567 adds video/audio capture as described below. The image camera receives an output
content URI for a new temporary JPEG, not a thumbnail request. An app declaring
CAMERA must grant that permission; an undeclared delegated camera intent follows
Android's normal rules. Denial/cancellation returns null. The captured file stays
valid until its selected View and active transfers release it. It is not implicitly
published to the gallery. Only these registered capture URIs are admitted from the
app's private provider. Existing user document grants remain intact.

readDocument(uri,offset=0,length=32768) returns Promise<Uint8Array> for a readable
granted document or retained camera result. Reads return up to the requested count;
continue by the actual count until an empty result. Save/tree choices request the
needed read/write grants, which are reference counted with active transfers.

download now also accepts data:, same-page blob: and readable content: URLs.
HTTP(S) with the default destination continues to use DownloadManager. Other
sources, or destinationUri/directoryUri targets, use native staged transfers.
Blob bytes are pulled from the originating JavaScript-enabled WebView in at most
32 KiB chunks with backpressure and no addJavascriptInterface. data URLs preserve
percent-encoded binary bytes, literal plus signs and base64. Large inline data URLs
still obey the runtime request-size limit; use page blob URLs for large data.

destinationUri must be an empty writable document, normally obtained from save
mode. directoryUri creates a new child with fileName. They are mutually exclusive.
Existing contents are rejected and remain unchanged. cancelDownload removes a
running job and incomplete output; a completed explicitly selected SAF document
is user-owned and preserved. managed:false in the local job state describes this
behavior. Completed default Downloads output is managed and removed on cancellation.
SAF reads after View disposal still require a valid Android grant.

Download IDs are opaque: numeric IDs for DownloadManager, web: UUID strings for
native transfers. Pass the returned ID to getDownload/readDownload/cancelDownload.
Local failed states include error; reason remains numeric. Local/page/SAF timeoutMs
defaults to 120000 and accepts 100..2147483647. A source-page navigation/closure
cancels unfinished blob reads. Completed default downloads survive View disposal.
Local transfers do not resume after process termination; interrupted records are
reported as failed. The Node project execution budget is still independent.

Workers use the same APIs and structured-cloned IDs/bytes. Native transfers do not
depend on the creating JavaScript thread remaining alive, but unfinished blobs
still require their source page. A Worker-owned window closes on Worker exit.
Video/audio capture is described below. Arbitrary filesystem access and exhaustive
cloud-provider compatibility are not implied by these additions. See runtimeApis and the host
report docs/dev/runtime-webview-files-2026-10-18.md for accepted device evidence.

Bun projects can set bun.timeoutMs in project.json (default 60000 ms, clamped to 1..600000 ms). Explicit bun.timeoutMillis execution arguments take precedence. This also applies to packaged applications; a WebView wait or download timeout does not extend the whole execution budget.

## WebView video and audio capture (host 5567)

The paired Node 1.13.0/Bun 0.2.12 declarations extend chooseFiles for main-thread
and Worker callers. With captureEnabled:true, a single image/video/audio MIME
family selects its capture flow. captureKind:'image'|'video'|'audio' can select
one family explicitly for mixed or wildcard acceptTypes. Save/tree modes still
use SAF. Returned URI arrays/null and readDocument/download remain unchanged.

Video uses Android ACTION_VIDEO_CAPTURE with a private output URI. videoQuality
is 0 (low) or 1 (high); durationLimitSeconds (1..2147483) and sizeLimitBytes
(positive safe integer) are camera hints, not a promise that every camera honors
them. If a camera returns a separate readable content URI, its media is copied
into the temporary capture; the external application's original is not deleted.

Audio uses an explicit foreground recorder with Start, Stop, Use and Cancel
controls, and AAC in M4A (audio/mp4, 48 kHz mono). acceptTypes does not select a different audio codec. It does not depend on an installed
RECORD_SOUND intent handler. RECORD_AUDIO must be declared in a packaged project's
Android permissions and granted by the user. The microphone opens only after
Start; leaving the foreground stops recording, while rotation reattaches its UI.
Duration/size limits stop the audio recorder, allowing the user to confirm the
result; container/frame overhead can exceed the requested byte limit slightly.

chooseFiles.timeoutMs is 100..2147483647 ms, default 120000. For HTML file inputs,
WebChromeClientOptions.callbackTimeoutMs controls the chooser callback and default
picker wait; e.timeoutMs carries that value into this.chooseFiles(e). The callback
range now also reaches 2147483647. The overall Node/Bun execution deadline still
applies independently. Nothing records automatically or continues as a hidden
background audio service. Cancellation, navigation, window/Worker shutdown and
View disposal close the capture and release owned temporary files. Confirmed
files remain available while the View or a copying download holds them.


## Bun automation (2026-10-19)

Bun Runtime 0.3.0 and host 5572 expose `host.app`, `host.accessibility` and `host.clipboard`. Their public adapters and declarations are reproducibly copied from the Node counterparts; the host dispatches only 13 public app operations, 16 accessibility operations and three clipboard operations. Local Intent/URI helpers, selector builders and aliases stay synchronous. Android operations return Promises. `app.control`, `accessibility.control`, `accessibility.gesture` and `clipboard.control` are independent, default-off grants; packaged projects declare them in `bun.hostCapabilities`. Gestures require both accessibility grants. Android accessibility and clipboard foreground rules still apply to the host or packaged app.

Calls support timeoutMs (1..120000) and AbortSignal. Short polls preserve the 10-second per-RPC bound for long gestures/activation; four operations may be outstanding and the SDK queues further operations. Cancellation stops waiting but cannot undo an Android action already dispatched. Polls count toward the original execution quota. Raw Java nodes, internal Agent diagnostics, root/Shizuku and dual-app actions are not exposed. Coordinate click retains the current Node provider rejection; use an explicitly granted single-point gesture. Native Bun payloads and the frozen compatibility matrix are unchanged. Validation: host docs/dev/bun-automation-2026-10-19.md.


## Bun 文件与存储

Bun Runtime 0.4.0 和配套宿主 build 5579 提供 `host.files`, `host.storage`, `host.storages`. 两个独立授权 `files.control` 和 `storage.control` 默认关闭, 在插件中心分别开启; 打包项目在 `bun.hostCapabilities` 中显式声明. 授权不替代 Android 对执行应用的文件权限.

### host.files

对应 Node.js `files` 的 15 个可用方法. `join`, `getName`, `getExtension` 是同步的 POSIX 路径字符串辅助方法, 不需要授权. 其余方法访问宿主或打包应用的文件并返回 Promise, 调用时使用 `await`:

| 方法 | 参数 | Promise 的结果 |
| --- | --- | --- |
| path | path?: string 或 null | 绝对路径, 空值返回 null |
| read | path?: string 或 null, encoding?: string | 文件文本, 空路径返回空字符串 |
| write / append | path: string, text: unknown, encoding?: string | void |
| exists / isFile / isDir | path?: string 或 null | boolean, 空路径返回 false |
| listDir | path?: string 或 null, filter?: (name: string) => boolean | string[], 目录不存在或路径为空时返回空数组 |
| remove | path?: string 或 null | boolean, 路径不存在时返回 false |
| copy / move | source: string, destination: string | boolean |
| ensureDir | path: string | boolean |

默认编码为 utf8, 支持 utf16le, latin1, ascii, hex, base64, base64url 及运行时 Buffer 接受的编码别名. text 为 null/undefined 时写入空字符串, 其他值按 String 转换. listDir 的 filter 在 Bun 中同步执行, 仅返回 true 时保留文件名. 未保证目录列表顺序.

相对路径按宿主的脚本工作目录解析, 缺省为执行应用的 filesDir; 绝对路径和本地 file: URL 仍由 Android 判定访问权限. 这与 Bun 自身 `process.cwd()` 指向的临时工作区不同. 不返回项目归档写回承诺; `Bun.file` 和 `node:fs` 仍在 Bun 插件进程中执行. 保存持久文件时可使用 host.files 或已经授权且可访问的持久路径.

ensureDir 的路径以斜杠结尾时创建该目录, 否则只创建文件的父目录. write/append 不自动创建父目录; copy 会创建目标父目录, move 不会. remove 只移除文件或空目录, 非空目录会拒绝. 文件不存在, 路径无权访问及不支持的跨文件系统移动均保留失败结果, 不伪装成功. `open` 和 `toFile` 与 Node.js 一样不提供 Rhino 文件句柄或原始 Java 对象.

文件字节通过 base64 JSON 传输, 沿用 64 KiB 请求与 256 KiB 结果限制; 封装和编码共同占用额度. 当前单次读取最多 196512 字节, 单次写入的可用原始字节少于 48 KiB, 取决于路径和参数长度. 超限拒绝, 不截断; 过大的写请求在打开目标文件前被拒绝. 大型文件可使用 Bun/Node 原生文件 API 访问插件自身有权访问的路径. 该传输差异不意味着 Node.js files 具有相同大小上限.

```js
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
await host.files.ensureDir('output/settings.json');
await host.files.write('output/settings.json', JSON.stringify({ enabled: true }));
console.log(await host.files.read('output/settings.json'));
```

### host.storage / host.storages

两个入口采用 Node.js 的公开封装和同一持久化后端. `create(name)` / `open(name)` 同步返回存储对象; 对象的 name 是规范化前去除首尾空白的名称. 下述方法全部返回 Promise:

- get(key, defaultValue?, options?): 返回 JSON 值, 缺失键返回 defaultValue 或 undefined. 已存储的 null 不会被默认值替换.
- put(key, value, options?) / putSync(...): 写入 JSON 值, 返回 void.
- remove(key, options?) / removeSync(...): 删除键, 返回 void.
- clear(options?) / clearSync(...): 清空该存储, 返回 void.
- keys(options?): 返回冻结的, 按键名排序的字符串数组.
- contains(key, options?): 返回 boolean.
- selfRemove(options?) / selfRemoveSync(...): 清空当前存储, 返回 void.
- 模块级 remove(name, options?) / removeSync(...): 清空指定存储, 返回 void.

`Sync` 后缀沿用 Node.js 的历史别名, 仍须 await. names/all 不提供全局命名空间枚举, 调用时抛出 NOT_SUPPORTED. 名称和键去除首尾空白后最多 128 字符, 不得为空或含 NUL; value 不接受 undefined, 函数, Symbol, BigInt 或循环对象. JSON 序列化规则与 Node.js 一致.

存储按执行应用包名和宿主脚本工作目录分组. 同一应用及目录的 Node.js/Bun 脚本可以共享数据; 更换目录或打包包名后属于不同存储. 后端沿用 Node.js 的名称规则: 字母转小写, 非字母数字及 ._- 字符替换为 _, 并取前 64 字符. 因此不同原始名称可能指向同一个存储; 不要依赖大小写或第 65 个字符区分名称. 此 API 不等同于 Rhino 全局 storages.

options 支持 timeoutMs (1..120000 毫秒) 和 AbortSignal. 默认单次存储操作超时为 5000 毫秒. 取消等待不能撤销已经提交的写入. 存储后端单值最多 64 KiB JSON, 每个存储最多 256 KiB; Bun 的单次请求还需包含参数封装, 因此实际可写值小于 64 KiB. 原有 1024 次桥接调用额度及并发限制继续适用.

```js
let store = host.storages.create('settings');
await store.putSync('enabled', true);
console.log(await host.storage.open('settings').get('enabled', false));
```


## Bun 与 Node.js Worker 数据库

配套宿主 build 5580, Node.js Runtime 1.16.0 和 Bun Runtime 0.5.0 提供同一套异步宿主数据库封装. Node.js 主线程及 CJS/ESM/嵌套 Worker 使用 `database` / `sqlite` 或 `autojs6:database` / `autojs6:sqlite`; Bun 显式客户端使用 `host.database` / `host.sqlite`.

这些接口使用执行应用内的 Android SQLite. 它们不替代 Node.js 的原生 `node:sqlite` 或 Bun 原生 SQLite 模块, 也不返回 Java SQLiteDatabase/Cursor 对象. Node.js 保留原生 `node:sqlite` 的同步接口和文件语义. Bun 的 `database.control` 是默认关闭的独立授权, 可在插件中心启用, 打包时在 `bun.hostCapabilities` 中声明. Node.js 项目声明 `database` 权限.

### database.open(name, options?) / database.open(options) / sqlite(name, options?)

**`Async`**

- **name** { [string](dataTypes#string) } - 数据库名称, 1..64 字符, 只接受字母, 数字, 下划线, 短横线和单点, 不接受路径或连续两个点.
- **options.name** { [string](dataTypes#string) } - 对象重载中的名称.
- **[ options.timeoutMs = 10000 ]** { [number](dataTypes#number) } - 调用等待时限, 毫秒. Bun 接受 1..120000 的整数.
- **[ options.signal ]** { [AbortSignal](https://developer.mozilla.org/docs/Web/API/AbortSignal) } - 取消等待的信号.
- <ins>**returns**</ins> { [Promise](dataTypes#promise) } - 数据库句柄, 含只读 id/name 与下述方法.

sqlite 是可调用别名, 同时提供相同的 open 重载. 对象形式中的 timeoutMs/signal 会正确传递, 空对象或缺少名称会拒绝. 名称先去除首尾空白; 后端沿用 Node.js 的小写名称及 .db 后缀规则, 不要以大小写或省略 .db 区分数据库.

数据库按应用包名与宿主脚本工作目录区分. 相同应用/目录的 Node.js 和 Bun 可以共享数据; 打包应用的数据属于自己的包名和私有目录. 数据不随单次 Bun/Node 工作区快照删除.

### 数据库句柄

所有方法返回 Promise, 参数使用有序数组, 只接受有限 number, string, boolean 或 null. 查询与写入使用相同的原生类型绑定; boolean 为 SQLite INTEGER 0/1, null 保持 SQL NULL. 不接收 BigInt, 原始字节数组或命名参数对象.

| 方法 | 签名 | 结果 |
| --- | --- | --- |
| exec | exec(sql, params?, options?) | void |
| run | run(sql, params?, options?) | { rowsAffected: number 或 null, insertId: number 或 null } |
| get | get(sql, params?, options?) | 第一行对象, 无匹配时为 null |
| all | all(sql, params?, options?) | 冻结的行数组 |
| transaction | transaction(operations, options?) | 与操作顺序一致的结果数组 |
| close | close(options?) | 本次关闭为 true, 重复关闭为 false |

直接 INSERT/REPLACE 返回实际影响行数与插入 id; 忽略插入为 0/null. UPDATE/DELETE 返回影响行数和 null 插入 id; 其他命令的计数字段可为 null. SQL 前的注释不会破坏命令识别. 查询行中的 BLOB 表示为 `{ base64: string }`, SQL NULL 表示为 null. 返回值为数据快照, 不持有游标.

transaction 接受 `{ type: 'exec' | 'run' | 'get' | 'all', sql, params? }` 数组, 不接受回调. 任意操作失败会回滚整个事务. 结果中 exec 项为 null, 其他项沿用相应方法的结果. 默认等待时限为 15000 毫秒; exec/run/get/all 默认 10000 毫秒, close 默认 5000 毫秒.

```js
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
let db = await host.sqlite({ name: 'events', timeoutMs: 10000 });
try {
    await db.exec('CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, value TEXT)');
    let results = await db.transaction([
        { type: 'run', sql: 'INSERT INTO events(value) VALUES(?)', params: ['owned example'] },
        { type: 'get', sql: 'SELECT COUNT(*) AS total FROM events' },
    ]);
    console.log(results[1]);
} finally {
    await db.close();
}
```

Node.js Worker 的对应导入示例:

```js
import database from 'autojs6:database';
import sqlite from 'autojs6:sqlite';
let db = await database.open({ name: 'events' });
try {
    console.log(await db.get('SELECT COUNT(*) AS total FROM events'));
} finally {
    await db.close();
}
```

### 生命周期与边界

- 每次宿主执行最多同时打开 4 个数据库句柄. Worker 与父执行共享该额度; Worker 退出时关闭通过自身桥接打开的句柄, 包括退出后才返回的连接. 关闭不会影响其他 Worker 或父线程自己打开的连接.
- 执行结束时释放其数据库句柄. 手动 BEGIN 后未提交的事务在 SQLite 所属线程回滚后关闭, 避免遗留数据库锁. 普通调用仍应使用 finally/close; transaction 操作数组会自行提交或回滚.
- Bun 通过短轮询等待操作, 不延长单次桥接 RPC 的 10 秒上限. 取消或过期且未交付的 Bun open 结果会释放连接. Abort/timeout 不撤销已经完成的 SQL 写入, 不等于可抢占正在执行的任意 SQL.
- 名称/路径隔离与 SQL 限制沿用 Node.js 宿主桥: 不提供 ATTACH/DETACH/load_extension, 原始 Java 句柄或跨执行句柄操作. database.close 不能释放其他种类的资源.
- 单条 SQL 最多 16 KiB UTF-8, 最多 128 个参数, 一次事务最多 64 项, all 最多 200 行, 结果最多 256 KiB JSON. 超限拒绝而非截断. Bun 还受原有 64 KiB 请求/256 KiB 结果封装与 1024 次调用额度限制.


## Bun 与 Node.js Worker 传感器

宿主 build 5581, Node.js Runtime 1.17.0 和 Bun Runtime 0.6.0 共用传感器封装. Node.js 主线程及 CommonJS/ESM/嵌套 Worker 可使用 `sensors` 或 `autojs6:sensors`; Bun 使用显式客户端 `host.sensors`. Bun 插件中心的独立 `sensors.control` 授权默认关闭, 打包应用在 `bun.hostCapabilities` 中声明; Node.js 项目声明 `sensors` 权限.

| 接口 | 返回值与行为 |
| --- | --- |
| getAvailableSensors(options?) | Promise<readonly SensorInfo[]>, 仅列出设备实际提供的 accelerometer, gyroscope, light |
| once(type, options?) | Promise<SensorEvent>, 取得第一份样本后关闭临时订阅, 超时或取消也会清理 |
| subscribe(type, callback?, options?) | SensorSubscription, 立即返回, await ready 等待原生注册完成 |
| subscription.on/once/off(event, listener) | 订阅或移除 event, accuracy, close, error 监听器, 支持链式调用 |
| subscription.close(options?) | Promise<void>, 可重复调用, 关闭后不再向脚本发送样本 |
| policy | 冻结的采样间隔, 队列和订阅数量限制 |

getAvailableSensors 反映 Android 的传感器清单, 不保证厂商允许应用注册. Redmi 22120RN86C 的 camera_light_Sensor 会出现在清单中, 但厂商服务拒绝第三方应用注册, 此时采样会返回权限拒绝错误.

SensorInfo 包含 type/name, 以及设备提供的 vendor/version/resolution/power/minDelayUs/maxDelayUs. SensorEvent 包含 type/timestamp/accuracy 和冻结的数值数组 values. timestamp 沿用 Android SensorEvent 的纳秒时间基准, 不是 Unix 时间. accelerometer 为三个轴的加速度, 单位 m/s², 含重力; gyroscope 为三个轴的角速度, 单位 rad/s; light 的第一个值为照度, 单位 lx. 不对横竖屏自动旋转原生传感器坐标轴.

可选参数 samplingIntervalMs (别名 intervalMs) 默认 250 毫秒, 限制到 20..60000; maxQueueSize 默认 16, 限制到 1..64; drainIntervalMs 默认 100, 限制到 25..5000 毫秒. 这些采样间隔是给 Android 的请求提示, 硬件和系统可调整实际频率. 光线传感器可能仅在读数改变时继续出事件, 不应要求所有传感器都有固定帧率.

once 的 timeoutMs 默认 5000, 限制到 100..60000 毫秒. signal 可取消一次采样; subscribe 的 signal 在注册完成后仍有效, 触发时关闭订阅. 可读取订阅的 id/type/closed/ready, subscriptionId 仅在协商推送成功时存在. close 始终尝试清理, 不继承已取消的订阅信号. 订阅注册失败会拒绝 ready, 请处理该 Promise; 运行期轮询错误发送到已注册的 error 监听器并停止订阅.

```js
const { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
const host = await createHostClient();
const sensors = host.sensors;
console.log(await sensors.getAvailableSensors());
const sample = await sensors.once('accelerometer', { timeoutMs: 5000 });
console.log(sample.values);
const controller = new AbortController();
const sub = sensors.subscribe('accelerometer', event => console.log(event.values), {
    signal: controller.signal, samplingIntervalMs: 250, drainIntervalMs: 250,
});
sub.on('error', error => console.error(error));
try {
    await sub.ready;
    await new Promise(resolve => setTimeout(resolve, 1000));
} finally {
    await sub.close();
}
```

Worker 可将上述客户端初始化替换为 `import sensors from 'autojs6:sensors'`. 每个宿主执行最多同时有 4 个活动订阅, 包括 once 的临时订阅, 父线程和 Worker 共享额度. Worker 退出或被终止时释放其订阅, 包括退出后才返回的注册结果. 执行结束会释放该执行的所有传感器监听. 不支持的类型与缺失的硬件会明确失败, 不产生模拟样本.

Node.js 主线程保留协商后的事件推送; Worker 和 Bun 使用有界队列轮询. Bun 沿用每次执行最多 1024 次桥接调用, 4 个并行请求, 单次 RPC 10 秒, 64 KiB 请求和 256 KiB 响应限制. 每次轮询包含 start/poll 请求, 长时间或高频轮询会消耗额度; 不应把 Bun 的订阅视为无限时长数据通道. 应及时 close, 按业务需要调大 drainIntervalMs, 并处理额度或宿主退出错误. 本批没有开放任意 Android SensorManager/Java 对象, 也没有补齐 Rhino 的所有传感器类型.


## Bun 与 Node.js Worker 宿主 Shell

宿主 build 5583, Node.js Runtime 1.18.0 和 Bun Runtime 0.7.0 提供共同的异步宿主 Shell 封装. Node.js 主线程及 CommonJS/ESM/嵌套 Worker 使用 `shell` / `autojs6:shell` 与 `shizuku` / `autojs6:shizuku`. Bun 使用 `host.shell` 和 `host.shizuku`. Node 原生 child_process 与 Bun.spawn 仍按各自运行时的 UID 和文件系统工作; 这里的命令在宿主应用中执行.

Bun 插件中心的 shell.control, shell.root, shell.shizuku 为三个默认关闭的独立授权. 打包应用在 bun.hostCapabilities 中声明需要的授权. 普通命令需要 shell.control, Root/Shizuku 还需对应授权及设备许可. Node.js 项目相应声明 shell, shell.root, shell.shizuku. 声明 shell 不会隐式授予 Root/Shizuku. 打包时, shell.shizuku 会自动加入 Shizuku 的 Android API 权限声明; 每个应用仍需分别在 Shizuku 中授权.

### 执行与状态

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| exec(command, options?) | `Promise<ShellResult>` | 捕获 stdout/stderr, 非零退出码也返回结果 |
| execRoot(command, options?) | `Promise<ShellResult>` | 通过 su 执行, 可与 shizuku 组合 |
| execShizuku(command, options?) | `Promise<ShellResult>` | 通过已运行且已授权的 Shizuku 执行 |
| execFile(path, args?, options?) | `Promise<ShellResult>` | 对文件路径和每个参数分别引用, 支持宿主可访问的绝对路径; 无斜杠的相对文件名按 ./file 执行 |
| checkAccess(options?) | ShellAccessReport | 保留同步行为, 检查当前执行声明的授权, 不查询系统授权 |
| getAccess(options?) | `Promise<ShellAccessState>` | 查询宿主 UID, Root 可用性, Shizuku 运行/授权状态及缺少的声明 |
| requestShizukuPermission(options?) | `Promise<boolean>` | 显式触发当前应用的 Shizuku 授权, 默认等待 60000 毫秒, 不启动 Shizuku 服务 |
| setDefaultTimeout(ms) | number | 设置当前客户端的 exec 默认时限, 初始 30000 毫秒, 必须为正整数 |
| spawn(command, options?) | ShellProcess | 立即返回异步进程对象, await ready 等待创建 |
| open(options?) | ShellProcess | 创建读取 stdin 的持久进程, cmd 默认 sh /proc/self/fd/0 |

ShellResult 包含 code/stdout/stderr/timedOut/truncated. 超时返回 code=124 和 timedOut=true; AbortSignal 取消会拒绝 Promise, 错误名 AbortError, code 为 ABORT_ERR. maxOutputBytes 默认 1048576, 限制捕获的程序原始字节总数, 超出后继续排空输出并设置 truncated, 避免进程被管道堵塞. timeout 的诊断文字可以附加到 stderr. 启动失败或权限不足会拒绝 Promise, 不伪造成功结果.

checkAccess 的 root/shizuku 标志仅在请求检查相应项且声明满足时为 true. getAccess 提供 shell/rootAvailable/shizukuRunning/shizukuGranted/shizuku/uid/missingCapabilities; rootAvailable 表示 su 可用性, 不等于已获得 Root 授权. 这些报告中的能力名称使用 shell/shell.root/shell.shizuku, Bun 普通授权项对应 shell.control.

### 选项与工作目录

exec 接受 root/shizuku/adb/pty/cwd/env/timeoutMs/signal/maxOutputBytes. adb 是 shizuku 的别名. env 的值必须为不含 NUL 的字符串, 键为合法的环境变量名. 未指定 cwd 时, 普通命令使用宿主脚本工作目录, Shizuku 使用 / (Shizuku 身份通常无法进入宿主私有目录). 显式相对路径仍基于宿主脚本工作目录, 绝对路径由 Android 实际访问权限决定. 不再人为要求 cwd 或 execFile 路径留在工作目录内. Root 与 Shizuku 同时为 true 时, 在 Shizuku 进程中运行 su.

spawn/open 的 timeoutMs 默认 0, 表示不设置命令时限; signal 仍可取消, 执行结束时清理进程. drainIntervalMs 默认 25 毫秒; 没有输出时宿主一次轮询最多等待 250 毫秒. open 另接受 cmd 程序行. pty 启用伪终端, stderr 并入 stdout, 不提供 Java TermSession 对象. closeInput 在 PTY 上发送终端 EOF, 保留输出端; 若程序自行关闭规范输入模式, 应按其协议退出或调用 close 结束进程.

### ShellProcess

id/pid 在 ready 完成后有效, 之前分别为空字符串和 -1. command/mode 为命令和 sh/root/adb/adb+root 模式. closed/killed/exitCode/timedOut 反映客户端已接收的状态. exited 是进程退出码 Promise.

stdin/stdout/stderr 是实际的 node:stream 对象. 传输以分块二进制形式进行, 包含 NUL 或跨块 UTF-8 字节也不会被当作文本截断. stdout/stderr 支持 data/end/error 监听, setEncoding 和异步迭代; stdin 支持 write/end 及回压. 声明提供通用流接口, 更完整的 Node/Bun 原生流类型可配合相应运行时的类型库使用.

| 方法或事件 | 行为 |
| --- | --- |
| readLine() / readErrorLine() | `Promise<string 或 null>`, 异步读取一行, EOF 为 null |
| write(data) / writeLine(text) / closeInput() | `Promise<ShellProcess>`, 写入字节/文本或关闭 stdin |
| waitFor() | `Promise<number>`, 等待退出 |
| waitFor(timeoutMs) | `Promise<number 或 null>`, 到时未退出则为 null, 不结束进程 |
| kill() | `Promise<boolean>`, 结束进程树, 返回是否仍在运行; 继续读取输出以接收剩余数据 |
| close() | `Promise<boolean>`, 释放进程并丢弃尚未取出的宿主输出, 可重复调用 |
| on/once('output', listener) | 按行接收 stdout, 包含 EOF 前未换行的尾行 |
| on/once('errorOutput', listener) | 按行接收 stderr |
| on/once('exit' 或 'close', listener) | 接收退出码, 失败时可为 null |
| on/once('error', listener) | 接收桥接或流错误 |

同一输出流选择原始流, readLine 或 output/errorOutput 事件中的一种读取方式. 不混用读取方式. 持续产生输出的进程必须读取两路输出, 或在结束时调用 close; 宿主与客户端均使用回压, 不以无限缓冲换取表面上的持续执行. 不通过桥接返回 Java InputStream/OutputStream.

```js
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
let proc = host.shell.open({ cmd: 'cat' });
try {
    await proc.ready;
    await proc.writeLine('hello');
    console.log(await proc.readLine());
    await proc.closeInput();
    console.log(await proc.waitFor());
} finally {
    await proc.close();
}
```

Node.js Worker 对应导入示例:

```js
import shell from 'autojs6:shell';
import shizuku from 'autojs6:shizuku';
let access = await shell.getAccess();
if (access.shizukuRunning && !access.shizukuGranted) {
    await shizuku.requestPermission();
}
let result = await shizuku.exec('id -u');
console.log(result.stdout);
```

shizuku 同时可作为函数调用, 并提供 exec/spawn/open/checkAccess/getAccess/requestPermission. 它强制使用 Shizuku, 不会退回普通应用身份执行. Root/Shizuku 授权失败, 服务退出或连接失败应由调用者处理.

### 生命周期与传输边界

每次宿主执行沿用 maxShellCommands 限制 (默认 2, Node 配置可为 0..4), 主线程与 Workers 共享. Worker 退出时清理它创建的进程, 包括退出后才返回的创建结果, 保留父线程自己的进程. 宿主执行结束, 显式取消和关闭会终止进程及当时可见的子进程; 忽略 SIGTERM 的命令也会被结束. 进程可以因 Android 或 Shizuku 的实际权限与生命周期而失败.

写入以 8 KiB 原始字节分块, 给 Base64 与 JSON 转义预留空间. 宿主最多排队 32 个 4 KiB 数据块, 单次 drain 最多取 8 个事件, 队列满时暂停读取而不丢字节. Node/Bun 客户端用可读流的回压暂停轮询. 这些队列大小不等于 Java/JS 对象的实际内存开销.

Bun 继续使用原有每次执行最多 1024 次桥接调用, 4 个并行任务, 64 KiB 请求, 256 KiB 响应及单次 RPC 10 秒的限制. start/poll 均消耗调用额度, Shell 流不能视为无限时长通道. 额度耗尽时宿主释放该执行的 Shell 进程. 长时间或大量数据可按实际场景使用 Node 原生 child_process 或 Bun.spawn, 它们的运行身份与宿主 Shell 不同.


## Bun 与 Node.js Worker 事件和通知

宿主 build 5584, Node.js Runtime 1.19.0 和 Bun Runtime 0.8.0 提供共同的事件与通知封装. Bun 使用 `host.events` 和 `host.notifications`; Node.js 主线程及 CommonJS/ESM/嵌套 Worker 使用 `autojs6:events` 和 `notifications` / `autojs6:notifications`. Node 原生 `events` 和 `node:events` 继续提供 EventEmitter, 不会被宿主事件模块替换.

### 授权与系统条件

| 操作 | Bun 授权 | Node.js 声明 | Android 条件 |
| --- | --- | --- | --- |
| 屏幕/电量监听 | events.observe | events | 系统广播 |
| 通知监听 | events.observe + events.notification | events + events.notification | 当前应用已获得通知使用权, 且通知监听服务已连接 |
| Toast 监听 | events.observe + events.toast | events + events.toast | 当前应用的无障碍服务已连接; 仅观察其他应用的 Toast |
| 按键监听 | events.observe + events.key | events + events.key | 当前应用的无障碍服务已连接; 不拦截按键 |
| 发送/取消通知 | notifications.post | notifications | Android 通知已启用; Android 13+ 需要 POST_NOTIFICATIONS |
| 打开通知设置 | notifications.post + notifications.settings | notifications + notifications.settings | 系统存在通知设置入口 |

六项 Bun 授权默认关闭, 在插件中心独立启用, 打包应用在 bun.hostCapabilities 中声明. Node.js 项目在 node.permissions 中声明. 通知发送权限与通知使用权不同, 任何一项都不隐式授予另一项. 打包配置会根据通知发送能力补入 POST_NOTIFICATIONS, 仍需实际系统授权. getPermissionStatus 查询的是发送通知的状态, 不代表已获通知读取权限.

### 事件模块

observeNotification/observeToast/observeKey/observeBroadcasts 均返回 `Promise<Subscription>`. 同一客户端重复观察同一来源会返回原有订阅. 主线程, 不同 Worker 和不同 Bun 客户端分别持有订阅, 不互相占用或关闭. observeBroadcasts 包含 screen_on, screen_off 和 battery_changed, 不提供任意 Intent 广播注册.

通知监听服务已获得系统授权但尚未连接时, observeNotification 会请求重新绑定并在本次调用时限内等待, 最多 4 秒; 未授权时仍立即拒绝. 屏幕/电量订阅使用 Android 返回的真实粘性电量快照初始化, 不模拟电量数据.

选项继承 timeoutMs/signal, 另有 drainIntervalMs, 默认 100 毫秒, 范围 25..60000. timeoutMs 用于单次桥接调用; signal 的作用覆盖订阅存续期. 注册前已取消会拒绝 Promise; 注册期间取消会回收迟到的注册结果; 已注册订阅取消时释放 Android 监听器.

模块与订阅提供 on/once/off. 可监听 event 通用事件, 或 notification/toast/key/battery_changed/screen_on/screen_off/overflow/close/error. 订阅具有只读 id/source/closed 属性, drainEvents(options?) 返回只读事件数组, close(options?) 返回 `Promise<boolean>`. 模块 close(options?) 关闭本客户端全部订阅并移除模块监听器, 完成后可以再次订阅.

事件是 JSON 快照, 包含 type/time/source. 通知增加 id/key/packageName/tag/title/text/postTime; Toast 增加 packageName/text; 按键增加 key/keyCode/action/repeatCount/eventTime, action 为 down/up; 电量增加 level/scale/percent/isCharging. 不返回 Notification/AccessibilityEvent 等 Java 对象, 不提供通知点击或回复动作.

Node.js 主线程沿用事件推送. Bun 和 Worker 使用有界队列轮询, 每个宿主订阅最多保留 128 个事件, 每次最多取出 32 项; 溢出丢弃最旧项并产生带 dropped 数量的 overflow 事件. 客户端推送缓冲也最多保留 128 项. 有监听器时自动消费, 无监听器时可显式 drainEvents; 同一订阅应选择一种消费方式. 无障碍/通知服务断开会发出带 reason 的 close 事件. 轮询失败会释放订阅, 不持续重复失败请求.

```js
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
let subscription = await host.events.observeNotification();
subscription.on('notification', event => console.log(event.packageName, event.title));
subscription.on('error', error => console.error(error));
// 在业务结束时执行 await subscription.close().
```

### 通知模块

notify(options, callOptions?) 返回 `Promise<number>`, options 包含 id/title/text/channel/channelName/ongoing/priority. title 或 text 至少提供一个. id 为 1..2147483647 的整数, 省略时分配; priority 支持 min/low/default/high/max 或 -2..2. 通道的重要性由首次创建确定, 之后由 Android 的通道设置控制. 使用独立 low 通道可发送无声音的通知.

cancel(id, options?) 和 cancelAll(options?) 返回 `Promise<void>`, 仅取消当前客户端创建的通知. 不同执行或 Worker 即使使用相同数字 id 也不会互相覆盖. 同一客户端重复 id 会更新通知. Worker 退出, 宿主执行结束或取消期间迟到的发布结果均会清理, 不会删除父线程或其他执行的通知.

getPermissionStatus(options?) 返回 sdkInt/notificationsEnabled/postNotificationsPermissionRequired/postNotificationsPermissionGranted/canOpenSettings 及 schema. openSettings(options?) 与 openNotificationSettings(options?) 等价, 另外返回 opened/dryRun/action/reason; dryRun 为 true 时只检查入口, 不打开系统设置. 打开设置不等于获得授权.

```js
import notifications from 'autojs6:notifications';
let status = await notifications.getPermissionStatus();
if (status.notificationsEnabled && status.postNotificationsPermissionGranted) {
    let id = await notifications.notify({ title: '任务完成', channel: 'task-status-silent', priority: 'low' });
    // 在业务结束时执行 await notifications.cancel(id).
}
```

Bun 仍受每次执行 1024 次桥接调用, 四个并行任务, 64 KiB 请求, 256 KiB 响应和单次 RPC 10 秒的原有限制. start/poll 均计入额度, 不应视为无限时长事件通道. 额度耗尽会释放该执行的事件订阅和通知. 本批不提供任意 Android 广播, Rhino 全部 EventEmitter 扩展或任意原生通知操作.
