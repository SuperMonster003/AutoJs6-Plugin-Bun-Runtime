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
| `ui.toast` | `host.toast(text, isLong?, isForcible?)`, `host.toast.dismissAll()`, `host.global.toastLog` 等 | 开启 | 短消息通知, 参数同 Rhino, 不限条数 (AutoJs6 api-coverage Q172 (a)) |
| `device.info` | `host.device.info()`, `host.device` 的同步 Build 字段 | 开启 | Build 品牌/型号/系统版本/ABI, 不含标识符 |
| `text.pinyin` | `host.pinyin` | 开启 | 宿主 Pinyin 插件, 无小字典回退 |
| `text.pinyin4j` | `host.pinyin4j` | 开启 | 宿主 Pinyin4j 插件, 含多音字读音矩阵 |
| `text.opencc` | `host.opencc` | 开启 | 宿主 3-Hanzi CC 插件, 完整 32 类转换及复合转换计划 |
| `image.process` | `host.images` 的内存方法 | 开启 | 图像解码, 编码, 像素, 变换, 搜索和回收 |
| `image.files` | `host.images.readImage/saveImage` | 关闭 | 读取或写入宿主可访问的图片文件 |
| `screen.capture` | `host.images.requestScreenCapture/captureScreen/stopScreenCapture` | 关闭 | 请求 Android 同意, 取得屏幕帧和停止会话 |
| `screen.metrics` | `host.coordinates` | 开启 | 实时屏幕坐标换算, 本执行的 Scale 基数 |
| `console.control` | `host.console` | 关闭 | 本执行控制台窗口, 外观及日志配置 |
| `floaty.control` | `host.floaty` | 关闭 | 悬浮窗及其视图, 查询或申请悬浮窗权限 (2026-10-30, P4.3) |
| `floaty.raw` / `floaty.touch` | `host.floaty.rawWindow` / `RawWindow.setTouchable` | 关闭 | 原始悬浮窗 / 触摸穿透, 另需 `floaty.control` |
| `terminal.control` | `host.terminal` | 关闭 | 终端插件会话与命令, 不被 shell 授权隐含 |
| `theme.control` | `host.colors.theme` | 关闭 | 读取和修改 AutoJs6 主题色, 激活色库 (2026-10-30, P4.5) |
| `gallery.control` | `host.gallery` | 关闭 | 3-Maple Image 插件的选择器, 查看器, 编辑器与转换 (P4.5) |
| `batchrename.control` | `host.files.batchRename` | 关闭 | Batch Rename 插件的批量重命名, 撤销, 历史与预设 (P4.5) |

这些组可以在 AutoJs6 插件中心的 Bun 设置页独立撤销, 对下一次执行生效. 拼音和 OpenCC 还需要对应插件安装并启用; 控制台显示需要 Android 悬浮窗权限. 图像的 OpenCV 运算需要宿主可用的 OpenCV 实现. 屏幕截图开关只允许申请权限, 仍需 Android 的录屏授权. 无障碍, OCR, UI 布局, Java 等其他能力见下文各节; 客户端没有 `rhino.run`.

宿主操作方法返回 Promise, 应等待结果或处理错误; `hasCapability` 和 `images.getSize` 同步读取本地信息. 方法调用通过 `{method, args}` 发送, 成功值包含在 `{value: ...}` 中. `host.call` 可以直接发送能力请求, 仍受相同授权, 方法范围和参数规则约束.

### 拼音

```js
console.log(await host.pinyin.simple("北京上海"));
console.log(await host.pinyin.convert("重庆", { style: "TONE", heteronym: true }));
console.log(await host.pinyin4j.of("北京上海", { separator: " ", tone: "WITHOUT_TONE" }));
console.log(await host.pinyin4j.readings("重庆"));
```

`pinyin` 提供 `convert`, `simple`, `compare`, `compact`, `fromCodePoint`, `fromPhrase`; `pinyin4j` 提供 `of`, `as`, `readings`. `compact` 与 `readings` 返回二维字符串数组. 字典外文字交给真实插件处理; 插件缺失或执行失败会返回错误, 不把原文当成成功转换.

`host.pinyin` 还带有同步常量 `STYLE_NORMAL` (0), `STYLE_TONE` (1), `STYLE_TONE2` (2), `STYLE_INITIALS` (3), `STYLE_FIRST_LETTER` (4), `STYLE_TO3NE` (5), `MODE_NORMAL` (0), `MODE_SURNAME` (1), `MODE_PLACENAME` / `MODE_PLACE_NAME` (2), 取值与 Node 运行时的 pinyin 模块相同 (两者经同一个宿主拼音桥转换), 不需要授权即可读取.

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

窗口方法是真实宿主调用, 不再以返回自身的空操作表示成功. `show/hide/expand/collapse/reset/clear/launch` 与标题、尺寸、位置、文字/背景颜色、触摸和退出配置可用, 完整签名见 `ConsoleApi`. 原生 Bun `console` 不被替换; stdout/stderr 同时转发到本执行控制台和宿主全局日志. `setGlobalLogConfig/resetGlobalLogConfig` 修改宿主的全局日志配置, 不限于本执行, 应谨慎使用并恢复.

Rhino 的其余窗口控制 (2026-10-30, AutoJs6 api-coverage P4.3, 宿主路由见 P3.3): `isShowing()` 返回 boolean; `resetBackgroundAlpha / resetContentBackgroundAlpha / resetTitleBackgroundAlpha`; `setAvoidStatusBar / setColorful / setInputVisible / setTimeVisible / setTouchThrough` (省略参数为 true); `setGravity` (数值或重力名); `setTimeFormat`; `configure(options?)` 一次应用 Rhino `console.build(options)` 的选项并显示窗口, 键同 Rhino 构建器的字段 (size, position, title, contentTextColors 等), 未知键在应用任何选项前拒绝; 宿主没有悬浮窗权限时选项已应用, 显示一步 reject NOT_GRANTED.

控制台输入 (D-7, Q165 (a)): `rawInput(...data)` 有参数时先以 log 级别打印提示, 再显示控制台与输入框, 用户提交一行后 resolve 该行文本; 与 stdin 及 Rhino `console.rawInput` 共用宿主的输入队列, 先到先得. 单次宿主调用最长 10 s, 客户端因此经 `rawInput` / `rawInputPoll` 路由排队后每次最多等 1 s 轮询 (console.control 不计入调用上限), 同时最多 4 个请求等待. 执行结束或控制台被重置时 reject, code 为 ERR_AUTOJS6_BRIDGE_CANCELLED; 控制台未显示且宿主没有悬浮窗权限时立即 reject NOT_GRANTED (Rhino 会一直等待). `input(...data)` 读行同 rawInput, 再在全局作用域间接 eval, resolve 求值结果. 声明见 `ConsoleInputApi`.

Rhino 的输出函数 (2026-10-30, AutoJs6 api-coverage P4.3, D-10): `host.console.log / print / verbose / info / warn / error / assert / time / timeEnd / trace / printAllStackTrace`, 以及 Rhino 的全局名称 `err` (同 error), `openConsole / showConsole` (同 show), `clearConsole` (同 clear), `launchConsole` (同 launch), 声明见 `ConsoleOutputApi`.

- 有 console.control 时, 宿主按 Rhino 的级别写入本执行控制台: log / print 为 debug, verbose / info / warn / error 同名, assert 为 assert. 同一轮事件循环的输出合成一次 `println` 调用按调用顺序发出; console.control 调用不计入每次执行 1024 次的调用上限, 输出文本另有每次执行 8 MiB 的上限.
- 没有 console.control (默认关闭) 时不报错 (Q171 (a)): 文本写到 Bun 的 stdout, warn / error / assert 写到 stderr, 宿主按 INFO / ERROR 两级显示. 宿主调用失败或文本超出上限时同样回落.
- 输出函数同步返回 undefined (assert 返回 host.console), 文本在本轮事件循环之后发出, 与 Bun 原生 `console` 是两条通道, 两者交错时顺序不保证; 紧接着 `process.exit()` 可能丢失尚未发出的行.
- 格式与 Rhino 一致: 参数经 `util.format` 拼接; `assert(value, message?)` 在 value (或函数 value 的返回值) 为假时以 assert 级别打印 message (默认 "java.lang.AssertionError") 并抛出 name 为 AssertionError 的错误; `time(label?)` / `timeEnd(label?)` 打印 "label: <毫秒>ms", 没有对应 time 的标签为 NaN, 标签按线程独立; `trace(message?, level?)` 打印消息与调用处堆栈, level 为 "verbose" / "debug" / "info" / "warn" / "error" (不分大小写) 或 2 到 6, 默认 debug; `printAllStackTrace(error)` 以 error 级别打印 Error 的 stack 或消息文本.

Rhino 的 toast 族 (2026-10-30, AutoJs6 api-coverage P4.3): 声明见 `HostToast` 与 `ToastGlobals`.

- `host.toast(text, isLong?, isForcible?)` 接受 Rhino 的参数形式: 布尔值, 数字 (按真假), "long" / "short" / "forcible" 及首字母 (不分大小写); 原有的 `host.toast(text, "short" | "long")` 写法不变. text 经 String 转换, 去掉首尾空白后为 1 到 1024 字节, 不能含换行以外的控制字符. forcible 时先关闭本执行此前显示的 toast. 返回 `Promise<{shown}>`.
- `host.toast.dismissAll()` 关闭本执行显示过的 toast (Rhino 的 toast.dismissAll). 每次执行不再限 4 条 (Q172 (a)), 一个应用排队的 toast 数量由 Android 限制, 超出的由系统丢弃.
- `host.global.toastLog / toastVerbose / toastInfo / toastWarn / toastError` 及小写别名: 先显示 toast, 再以对应级别经 `host.console` 打印第一个参数 (toastLog 可不带参数, 其余至少 1 个, 最多 3 个), 返回 toast 的 Promise. `host.global.isUiThread()` 恒为 false. `host.global.install()` 同时安装这些名称.

## 错误与上限

`HostCallError` 包含 `code`, `capability`, `status`. 未授权调用在客户端以 `NOT_GRANTED` 拒绝; socket 不可达返回 `HOST_UNAVAILABLE`; 桥版本不支持返回 `UNSUPPORTED_BRIDGE`; 无效响应返回 `INVALID_RESPONSE`. 宿主返回的参数、权限、插件不可用等失败保持为错误, 客户端不会自动重试或伪造成功值.

桥仍沿用每次执行最多 1024 次调用 (流式能力与 console.control 不计数)、4 路并发、请求 64 KiB、结果 256 KiB 和单次宿主 10 s 超时. 客户端为网络往返增加 15 s 上限. 请求在发送后被取消不等于宿主操作撤销; 不应自动重试有副作用的调用.

## 验证

```powershell
node --test tools/host-client/host-client.test.mjs
node --test tools/host-client/js-tools.test.mjs
node tools/host-client/sync-js-tools.mjs --check
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

Bun Runtime 0.3.0 and host 5572 expose `host.app`, `host.accessibility` and `host.clipboard`. Their public adapters and declarations are reproducibly copied from the Node counterparts; the host dispatches only 13 public app operations (19 since api-coverage P4.1a), 16 accessibility operations and three clipboard operations. Local Intent/URI helpers, selector builders and aliases stay synchronous. Android operations return Promises. `app.control`, `accessibility.control`, `accessibility.gesture` and `clipboard.control` are independent, default-off grants; packaged projects declare them in `bun.hostCapabilities`. Gestures require both accessibility grants. Android accessibility and clipboard foreground rules still apply to the host or packaged app.

Calls support timeoutMs (1..120000) and AbortSignal. Short polls preserve the 10-second per-RPC bound for long gestures/activation; four operations may be outstanding and the SDK queues further operations. Cancellation stops waiting but cannot undo an Android action already dispatched. Polls count toward the original execution quota. Raw Java nodes and internal Agent diagnostics are not exposed; root/Shizuku and dual-app actions run through the shell grants (see "Rhino 的应用与 shell 成员" below, api-coverage P4.1a). Coordinate click retains the current Node provider rejection; use an explicitly granted single-point gesture. Native Bun payloads and the frozen compatibility matrix are unchanged. Validation: host docs/dev/bun-automation-2026-10-19.md.


## Rhino 的 UI 族 (2026-10-30, api-coverage P4.3)

`host.ui` 的内容视图与窗口成员, `host.floaty`, `host.web`, `host.terminal`, `host.console.build` 与 Node.js Runtime 是同一份代码: Node 的 `tools/nodejs/api/sync-ui-compose.js` 把共享的 `portable-ui-compose.js` 写进 host-client.mjs, `tools/host-client/sync-ui-family.mjs` 从 Node 的声明生成 RuntimeUi / RuntimeCompose / RuntimeFloaty / RuntimeWeb / RuntimeTerminal / RuntimeConsole. 行为与差异见 Node 的 HOST-API "UI 族的 Rhino 对照"; Bun 的授权如下 (未授权时以 `NOT_GRANTED` 拒绝, `missingCapabilities` 列出缺少的 Bun 授权, 不发往宿主):

| 成员 | Bun 授权 | 宿主路由 (Node 能力) |
|---|---|---|
| ui.layout / layoutFile / setContentView / finish / root / findById / findByStringId / emitter, 窗口成员 (statusBarColor 等) 与栏高 | `ui.layout` | ui showLayout (contentView) / windowControl / barHeight (`ui`) |
| floaty.window / closeAll, 悬浮窗的 setPosition / setSize / requestFocus / disableFocus / setAdjustEnabled / x / y / width / height / close 及其视图 | `floaty.control` | ui floatyWindow / floatyControl / floatyCloseAll 与视图路由 (`ui`, `ui.overlay`) |
| floaty.rawWindow | `floaty.control` + `floaty.raw` | ui floatyRawWindow (`floaty.raw`) |
| RawWindow.setTouchable | `floaty.control` + `floaty.touch` | ui floatyControl setTouchable (`floaty.touch`) |
| floaty.hasPermission / checkPermission / requestPermission / ensurePermission | `floaty.control` | ui.overlay hasPermission / openPermissionSettings (`ui.overlay.permission`) |
| floaty.getClip | `clipboard.control` | clipboard getText |
| web.newInjectableWebView / newInjectableWebClient | `ui.layout` | ui inflate 与 WebView 路由 (Q174 (a)) |
| web.newWebSocket, web.ByteString | 无 | Bun 自带的 WebSocket (Q174 (a)), 不经宿主 |
| terminal 的全部方法, TerminalSession 的方法, terminal.npm.run | `terminal.control` | terminal (`terminal`, 不被 `shell` / `shell.root` 隐含) |
| console.build(...).show() | `console.control` | console configure |

- 新增的四项授权默认关闭, 在插件中心独立启用, 打包项目在 `bun.hostCapabilities` 中声明: `terminal.control` (Q3 (a)), `floaty.control`, `floaty.raw`, `floaty.touch` (Q173 (a), 后两项不被 `floaty.control` 隐含, 单独开启也没有作用).
- `ui.layout` 关闭而 `floaty.control` 开启时, 悬浮窗视图的读写与事件经 `floaty.control` 发往宿主; Activity 内容窗口的路由 (showLayout / windowControl / barHeight) 只属 `ui.layout`.
- 终端调用经宿主的长任务路由 (start / poll, 每次轮询最多约 1 s), exec (wait) / waitFor / npm.run 每次调用最多等 905 s: Rhino 的默认 10 min 不变, 更长的 timeout 或 0 (不限) 在 905 s 时以 TIMEOUT 结束. 宿主的终端错误保留插件的代码 (PLUGIN_UNAVAILABLE, SESSION_NOT_FOUND, TIMEOUT 等), 由共享门面转为 TerminalError.
- web.newWebSocket 用 Bun 的 WebSocket 连接 (options 的 headers / protocols / timeoutMs), 事件名同 Rhino (open / message / text / bytes / closing / closed / failure); 不需要授权, 连接受插件进程的网络条件约束.
- `host.global` 增加 `newWebSocket / newInjectableWebView / newInjectableWebClient / ComposeError` (`UiFamilyGlobals`), `host.global.install()` 同时安装; isUiThread 与 toast 全局见上节.
- 主线程与 Worker 相同: 每个线程各自 `createHostClient()`; 内容窗口每个执行只有一个, 悬浮窗随执行结束关闭, 终端会话属终端插件, 不随执行结束关闭 (同 Rhino).

## Rhino 的自动化族 (2026-10-30, api-coverage P4.4)

`host.automator`, `host.auto`, `host.threads`, `host.continuation`, `host.timers`, `host.yolo`, `host.selector` 与 `host.keys` 采用 Node.js Runtime 的同一工厂 (`tools/host-client/sync-automation-family.mjs` 从 Node 源码复制 `__autojs6_create_automation` 及其声明, `--check` 核对一致), 成员与 Node 的 `autojs6:automator` / `autojs6:auto` / `autojs6:threads` / `autojs6:continuation` / `autojs6:timers` / `autojs6:yolo` / `autojs6:selector` 相同. `host.ocr`, `host.barcode`, `host.qrcode` 是 Bun 自有的同形实现, ocr 的 Rhino 层 (mode / tap, detect, summary, ocr.mlkit / paddle / rapid) 用同一工厂. `host.events` 另有 Rhino 的 events 成员 (发射器方法, emitSticky, emitter, getTimer, broadcast, onKeyDown / onKeyUp 等按键名监听, setKeyInterceptionEnabled, observeTouch / onTouch, onNotification / onToast), `host.global` 另有 sleep / wait.

授权 (未授权时调用即以 `NOT_GRANTED` 拒绝, `missingCapabilities` 列出缺少的 Bun 授权, 不发往宿主):

| 成员 | Bun 授权 | 宿主路由 (Node 能力) |
|---|---|---|
| automator 的点击 / 滚动 / 输入 / 全局动作 / 输入法切换, auto 的服务状态 / 窗口 / 根节点 / 模式 / 标志, auto.waitFor / automator.waitForService, auto.dump / explain (Q185 (a)) | `accessibility.control` | automator / auto / accessibility (`accessibility`; back / home / recents 以外的全局动作另需 `keys`) |
| automator.press / swipe / gesture / gestures / gestureAsync / gesturesAsync | `accessibility.control` + `accessibility.gesture` | automator press / gestures (`accessibility.gesture`) |
| auto.start / stop / enable / disable / launchSettings / clearCache | `accessibility.control` + `accessibility.service` | auto (`accessibility.service`) |
| automator.captureScreen (无障碍截图, Android 11+) | `accessibility.control` + `screen.capture` | accessibility captureScreenImage (`screen_capture`, `image`) |
| auto.registerEvent(s) / stateListener | `events.observe` + `accessibility.control` | events observeAccessibility / observeAccessibilityState (`accessibility`) |
| events.observeTouch / onTouch | `events.observe` + `events.touch` | events observeTouch (`events.touch`) |
| events.setKeyInterceptionEnabled | `events.observe` + `events.key` + `events.key.intercept` | events interceptKeys (`events.key.intercept`) |
| events.broadcast | `events.observe` | events observeScriptBroadcasts / sendScriptBroadcast (`events`) |
| ocr 的全部方法 | `ocr.control` | ocr (`ocr`, `image`) |
| barcode / qrcode 的全部方法 | `barcode.control` | barcode (`barcode`, `image`) |
| yolo.load, YoloDetector.detect / close | `yolo.control` | yolo (`yolo`, `image`) |

新增的六项授权默认关闭, 在插件中心独立启用, 打包项目在 `bun.hostCapabilities` 中声明: `accessibility.service`, `events.touch`, `events.key.intercept` (Q182 (a), 不被 `accessibility.control` / `events.observe` / `events.key` 隐含), `ocr.control`, `barcode.control` (qrcode 共用), `yolo.control` (Q181 (a)). automator / auto 复用无障碍授权 (Q183 (a)).

- 坐标随 `host.global.setScreenMetrics` 缩放, 同 Rhino 的 ScreenMetrics.
- Rhino 的阻塞调用在这里返回 Promise. auto.waitFor(timeout?) 与 automator.waitForService 先请求启用服务 (不打开设置页), 再每 200 ms 查询一次, 超时同 Rhino 结束整个执行 (Q179 (b), 与 exit() 相同, Worker 中的规则也相同, Promise 不再落定). auto 的 service / services / windows / root / rootInActiveWindow / windowRoots / state / stats 是 getter, 每次读取返回新的 Promise.
- threads.start(fn) 在本线程的下一轮事件循环异步执行 fn (Q175 (a)), 返回句柄 (interrupt / join / isAlive / waitFor); threads.pool 为本地任务池. threads.atomic / lock 存放在 SharedArrayBuffer 中, 可经 postMessage 交给 Worker (Q176 (a)), lock 不可重入. threads.disposable() 即 VolatileDispose, blockedGet 返回 Promise. continuation.enabled 为 false (同未开启 continuation 特性的 Rhino 引擎, Q179 (b)), create() 返回可恢复的延续. timers.keepAlive 同 Rhino 返回数字 id (Q179 (b), 可交给 clearTimeout / clearInterval), loop() 只警告一次, setIntervalExt 同 Rhino; Rhino 的 timers.setTimeout 等即全局 setTimeout 等 (D-9). 这些成员在本地运行, 不需要授权.
- selector 的 pickup / detect / existsOne / existsAll 与选择器形式的全局 wait 用 flow 的单次探测, 读节点走 `accessibility.control` (不需要 `flow.control`, 宿主 b23220775 按真机结果更正矩阵); 函数形式的 wait 在本地轮询.
- `host.global` 含本族的 Rhino 全局 (`AutomationGlobals`: click / longClick / press / swipe / gesture* / scrollUp / scrollDown / input / setText / back / home / recents / notifications / quickSettings / powerDialog / splitScreen / retry / sync / keepAlive / loop / pickup / detect / existsOne / existsAll) 与系统族的 sleep / wait (wait.async 即 flow.waitAsync); `host.global.install()` 把它们一并装到 globalThis (Q184 (a)), 每个 Worker 需各自调用.
- ocr / barcode 的图像是本执行的 images 句柄; barcode / qrcode 也接受文件路径 (需 `image.files`) 与 `{type: "capture", requireExistingPermission: true}` (需 `screen.capture`), 读取或截取的图像在调用结束时回收. ocr.recognizeText 返回一个字符串 (各行以换行连接, Rhino 返回行数组). ocr.mode / tap 选择引擎 (auto / mlkit / paddle / rapid), ocr.mlkit / paddle / rapid 固定引擎. 每个 ocr 结果带冻结的 `extras` 对象, 转换规则与 Rhino 的 OcrResult.extras 相同 (`quad` 随 region 偏移), 例外是 NaN 与无穷大转为 null; 引擎未提供或宿主早于 6.8.0 时为空对象. ocr 选项 `useOpenCL`, `cpuThreadNum`, `useSlim`, `useCls`, `detLongSize`, `detLimitSideLen`, `scoreThreshold`, `maxSideLen`, `boxScoreThresh`, `mergeLine` 的含义与缺省值同 Rhino, 按实际选中的引擎解析 (AutoJs6 6.8.0 起; 例如 Paddle OCR 的 `useSlim` 缺省为 true, Rapid OCR 没有此选项). `mergeLine` 只对 Paddle OCR 生效, 合并规则与 Rhino 相同 (`extras` 只保留各片段相同的键, 多片段合并后没有 `quad`), ocr.recognizeText 同 Rhino 不合并. yolo.load(modelDir, {component}) 返回 YoloDetector 句柄, 失败时 error.code 为 Rhino 的 `YOLO_*` 码.
- 主线程与 Worker 相同: 每个线程各自 `createHostClient()`, 事件订阅, 线程任务与 ocr 模式按线程独立.

## Bun 文件与存储

Bun Runtime 0.4.0 和配套宿主 build 5579 提供 `host.files`, `host.storage`, `host.storages`. 两个独立授权 `files.control` 和 `storage.control` 默认关闭, 在插件中心分别开启; 打包项目在 `bun.hostCapabilities` 中显式声明. 授权不替代 Android 对执行应用的文件权限.

### host.files

对应 Rhino 的 `files`. 路径字符串与大小格式化辅助方法 `join`, `getName`, `getExtension`, `getNameWithoutExtension`, `getHumanReadableSize`, `formatSizeWithUnit` 与 `getSdcardPath` 来自客户端内的共享 JS 核心 (与 Node.js 运行时相同, 路径规范化按 java.io.File, 结果同 Rhino; api-coverage P4.2b), 同步执行, 不需要授权. 下列方法访问宿主或打包应用的文件并返回 Promise, 调用时使用 `await`:

| 方法 | 参数 | Promise 的结果 |
| --- | --- | --- |
| path | path?: string 或 null | 绝对路径, 空值返回 null |
| nonNullPath | path: string | 同 path, 结果为 null 时抛出 TypeError |
| read | path?: string 或 null, encoding?: string | 文件文本, 空路径返回空字符串 |
| write / append | path: string, text: unknown, encoding?: string | void |
| exists / isFile / isDir | path?: string 或 null | boolean, 空路径返回 false |
| listDir | path?: string 或 null, filter?: (name: string) => boolean | string[], 目录不存在或路径为空时返回空数组 |
| remove | path?: string 或 null | boolean, 路径不存在时返回 false |
| copy / move | source: string, destination: string | boolean |
| ensureDir | path: string | boolean |

Rhino `files` 对象的原型成员 (api-coverage P4.2b) 同样经 `files.control` 由宿主执行, 结果与 Rhino 相同, 只是返回 Promise:

| 方法 | 参数 | Promise 的结果 |
| --- | --- | --- |
| cwd | - | 宿主的脚本工作目录 (相对路径的基准) |
| create | path?: string 或 null | boolean; 以斜杠结尾时创建目录, 否则创建空文件 (已存在也为 true), 不创建父目录 |
| createIfNotExists / createWithDirs | path?: string 或 null | boolean; 先创建父目录, 文件已存在时为 false |
| readBytes | path: string | Buffer (Rhino 为 Java byte[]) |
| writeBytes / appendBytes | path: string, bytes | void; bytes 可为 Buffer, TypedArray, ArrayBuffer 或数值数组 (取低 8 位); appendBytes 在文件不存在时创建它 |
| rename / renameWithoutExtension | path: string, newName: string | boolean; renameWithoutExtension 保留原扩展名 |
| removeDir | path?: string 或 null | boolean, 递归删除 |
| isEmptyDir | path?: string 或 null | boolean |
| readAssets | name: string, charset?: string | 宿主应用 assets 中该文件的文本; charset 与 Rhino 一样是 Java 字符集名 (ISO-8859-1, US-ASCII 等, 忽略大小写与字母数字以外的字符), 也接受 Buffer 编码名 |
| getSimplifiedPath | path: string | 外部存储前缀简化后的路径 (同 Rhino) |

`files.sdcardPath` 是同步属性: 执行开始时插件写入 device-info.json 的外部存储路径 (Android 用户的共享存储, 与宿主相同), 不需要授权. readBytes 与 read 共用单次读取上限, writeBytes / appendBytes 与 write 共用请求上限.

默认编码为 utf8, 支持 utf16le, latin1, ascii, hex, base64, base64url 及运行时 Buffer 接受的编码别名. text 为 null/undefined 时写入空字符串, 其他值按 String 转换. listDir 的 filter 在 Bun 中同步执行, 仅返回 true 时保留文件名. 未保证目录列表顺序.

相对路径按宿主的脚本工作目录解析, 缺省为执行应用的 filesDir; 绝对路径和本地 file: URL 仍由 Android 判定访问权限. 这与 Bun 自身 `process.cwd()` 指向的临时工作区不同. 不返回项目归档写回承诺; `Bun.file` 和 `node:fs` 仍在 Bun 插件进程中执行. 保存持久文件时可使用 host.files 或已经授权且可访问的持久路径.

ensureDir 的路径以斜杠结尾时创建该目录, 否则只创建文件的父目录. write/append 不自动创建父目录; copy 会创建目标父目录, move 不会. remove 只移除文件或空目录, 非空目录会拒绝. 文件不存在, 路径无权访问及不支持的跨文件系统移动均保留失败结果, 不伪装成功. `open` (即 `host.global.open`) 与 `toFile` 是共享核心的 Rhino 实现: 经 Java 门面在宿主进程中创建 Rhino 的文件句柄或 `java.io.File` 句柄, 需要默认关闭的 `java.interop` 授权, 返回 Promise, 句柄由调用方用 `host.java.release` 释放. 它们与 `host.zip` 的相对路径按宿主的脚本工作目录 (脚本源目录) 解析: 客户端在其中任一方法首次调用前向宿主取得该目录 (每次执行只取一次), 不需要授权 (`execution.control` 的 cwd, 宿主 6.8.0 起; api-coverage Q120 (b)). 更早的宿主没有这个方法时改用 `files.cwd()` (需 `files.control`), 两者都不可用时按 Bun 工作目录 `process.cwd()` 解析, 宿主进程通常无权访问这个临时工作区, 应改用绝对路径 (例如以 `files.sdcardPath` 开头).

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

`Sync` 后缀沿用 Node.js 的历史别名, 仍须 await. 模块级 names(options?) / all(options?) 与 Node.js 相同 (api-coverage Q79): 列出本包与本工作目录下由 Node.js / Bun 脚本写入过且非空的存储 (同一作用域的登记存储 `__autojs6_storage_names__` 记录名称), all 返回对应的存储对象; 存储对象的 size(options?) 返回键数的 Promise (Rhino 为属性). 名称和键去除首尾空白后最多 128 字符, 不得为空或含 NUL; value 不接受 undefined, 函数, Symbol, BigInt 或循环对象. JSON 序列化规则与 Node.js 一致.

存储按执行应用包名和宿主脚本工作目录分组. 同一应用及目录的 Node.js/Bun 脚本可以共享数据; 更换目录或打包包名后属于不同存储. 后端沿用 Node.js 的名称规则: 字母转小写, 非字母数字及 ._- 字符替换为 _, 并取前 64 字符. 因此不同原始名称可能指向同一个存储; 不要依赖大小写或第 65 个字符区分名称. 此 API 不等同于 Rhino 全局 storages.

options 支持 timeoutMs (1..120000 毫秒) 和 AbortSignal. 默认单次存储操作超时为 5000 毫秒. 取消等待不能撤销已经提交的写入. 存储后端单值最多 64 KiB JSON, 每个存储最多 256 KiB; Bun 的单次请求还需包含参数封装, 因此实际可写值小于 64 KiB. 原有 1024 次桥接调用额度及并发限制继续适用.

```js
let store = host.storages.create('settings');
await store.putSync('enabled', true);
console.log(await host.storage.open('settings').get('enabled', false));
```

## host.mediainfo

`host.mediainfo` 是 Node.js `mediainfo` 模块 (经 MediaInfo 插件读取媒体文件元数据), 需要默认关闭的独立授权 `mediainfo.control` (插件中心 "Bun 媒体元数据"; 打包项目在 `bun.hostCapabilities` 中声明), 并且设备上安装并启用了 MediaInfo 插件. 路径由宿主打开, 相对路径按宿主的脚本工作目录解析, Android 文件权限照常适用.

- `mediainfo(path, options?)` / `read(path, options?)`: 不带 schema 时返回 Node 的快照 (`autojs6-node-mediainfo-snapshot-v1`, 含 path), 带 schema 时返回插件该版本的快照; options 还有 includeInform / includeSections.
- `snapshot(path, options?)`: Rhino 的 snapshot, 返回插件快照, 未给 schema 时用插件的默认版本 (`capabilities().defaultSnapshotSchema`).
- `get(path, streamKind, parameter?, options?)`: 返回字符串; options.streamNumber / infoKind 不是默认值 (0 / TEXT) 时先核对插件的 capabilities, 不支持时拒绝 MEDIAINFO_QUERY_UNSUPPORTED.
- `countGet(path, streamKind, options?)`: 返回该类流的数量, 插件不支持计数时拒绝 MEDIAINFO_QUERY_UNSUPPORTED.
- `capabilities(options?)`: 插件支持的快照版本, 计数与查询选项.
- `SNAPSHOT_SCHEMA_V1` / `SNAPSHOT_SCHEMA_V2`: 插件快照版本名, 同 Rhino.

方法都返回 Promise, 记录被深度冻结; options 支持 timeoutMs 与 AbortSignal (read / get / countGet 缺省 10000 毫秒, capabilities 5000 毫秒). 路径为空或含 NUL, 流类型不是字母名称时在调用宿主前抛出 TypeError.

```js
let info = await host.mediainfo.snapshot('/sdcard/Music/a.mp3');
console.log(info.schema, await host.mediainfo.get('/sdcard/Music/a.mp3', 'audio', 'Format'));
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

### Rhino 的应用与 shell 成员 (2026-10-29, api-coverage P4.1a)

host.app, host.shell 与 host.shizuku 和 Node.js 主线程及 Worker 共用同一份共享工厂 (Node `__autojs6_create_app` / `__autojs6_create_shell`, 由 sync-automation.mjs / sync-shell.mjs 原样同步), 成员与语义见 Node.js Runtime 的 HOST-API "应用与 shell 族的 Rhino 对照". Rhino 的同步成员在 Bun 中同样返回 Promise (Q93), 主线程与 Worker 相同.

- app: kill 与双开辅助 launchDual / launchDualPackage / launchDualApp / launchDualSettings / launchDualAppDetailsSettings / openDualAppSetting / openDualAppSettings / startDualActivity / openDualUrl / uninstallDual / isDualInstalled / killDual (D-4) 照 Rhino 运行 `am` / `cmd package`, 路线按 Shizuku, Root, 普通 shell 的顺序取第一个已授权且设备可用的; startActivity / startService / sendBroadcast 接受 root / shizuku / dual 选项; getInstalledPackages / getApkInfo / getAppByAlias 返回 JSON 快照, sendLocalBroadcastSync 在宿主进程同步投递本地广播. app.autojs 随 autojs 模块另行提供.
- shell: execCommand (结果 `{code, result, error, timedOut, truncated}`), getCommand, fromIntent (只收 JSON intent), setDefaultOptions, kill, isRootAvailable, currentPackage / currentActivity / currentComponent, 以及 Rhino 的全局按键与输入函数 Menu / Home / Back / Up / Down / Left / Right / OK / VolumeUp / VolumeDown / Power / Camera / KeyCode / Text / Input / Tap / Swipe / Screencap / SetScreenMetrics (Bun 没有全局对象, 作为 host.shell 的成员提供).
- shizuku: execCommand / getCommand / kill / currentPackage / currentActivity / currentComponent, isInstalled / hasService / isRunning / hasPermission / isOperational 与每次读取返回新 Promise 的 state 属性. getAccess 另报告 shizukuInstalled / shizukuHasService / shizukuOperational.
- ShellProcess: isAlive, getInputStream / getErrorStream (stdout / stderr 流), getOutputStream (stdin), toString, 以及 addListener / removeListener / listenerCount / prependListener / prependOnceListener.

授权: 共享工厂使用 Node 的能力名, Bun 按 shell -> shell.control, app 及其子能力 (app.query / app.activity / app.launch / app.settings) -> app.control 对应, shell.root / shell.shizuku 同名, 不新增授权 (Q89). 双开辅助与 app.kill 需要 app.control 与 shell.control, 另有 shell.shizuku 或 shell.root 时才走特权路线; shell.kill 与 shizuku.kill 解析包名还需 app.control; 全局按键需要 shell.control, 再加可用的 shell.shizuku 或 shell.root. 授权关闭时在访问宿主之前 reject HostCallError NOT_GRANTED, missingCapabilities 列出缺少的 Bun 授权名 (Q90); 授权已开但宿主拒绝时照 Rhino 处理: 进程无法启动 (例如没有 Root) 时 execCommand 返回退出码 1 且带 error 的失败结果, Shizuku 不可用 (未运行或未授权宿主) 时 shizuku.execCommand 与 adb 路线 reject, 全局按键与手势不报告结果. getInstalledPackages 按宿主分页取回全部包 (宿主 6.8.0, 带组件列表时不超过 Binder 事务大小). shell.checkAccess 的报告仍使用 shell / shell.root / shell.shizuku. app.control 的宿主路由新增 resolvePackage / getUserProfiles / getInstalledPackages / getApkInfo / getAppByAlias / sendLocalBroadcastSync (宿主 6.8.0).

Tap / Swipe 的坐标在 SetScreenMetrics 之后按插件写入 device-info.json 的显示尺寸 (DisplayMetrics widthPixels / heightPixels) 缩放; 没有该文件时不缩放. 真机结果见宿主 docs/dev/bun-app-shell-2026-10-29.md.

### Rhino 的系统信息与引擎族 (2026-10-30, api-coverage P4.1b)

host.autojs, host.installer, host.memory, host.settings, host.sysprops, host.powerManager, host.engines, host.plugins, host.dialogs.build, host.notifications 上 notice 的扩展成员 (config / isEnabled / ensureEnabled / launchSettings / getBuilder / builder / channel) 与 host.global 上的全局系统函数, 和 Node.js 主线程共用同一份共享工厂 (Node `__autojs6_create_system` 与主线程 engines, 由 sync-system.mjs 原样同步; notice 与 dialogs.build 随 sync-events.mjs / sync-device-dialogs.mjs 同步), 成员与语义见 Node.js Runtime 的 HOST-API "系统信息与引擎族". Rhino 的 workManager 就是 host.tasks 的同名函数. 访问宿主的成员返回 Promise, 主线程与 Worker 相同. autojs.getRootMode() 得到 Rhino 的 RootMode 对象 (key, description, name(), ordinal(), toString(), 每种模式一个冻结实例), setRootMode 接受它; notice.channel 省略 id 时与 Rhino 相同, 依次取 config 的 defaultChannelId, 脚本文件名 (例如 "main.js"), useScriptNameAsDefaultChannelId 为 false 时取 "script_channel" (Q135 (b)).

授权 (宿主 6.8.0, 均默认关闭, 打包项目在 `bun.hostCapabilities` 中声明; Q136 (a) / Q137 (a) / Q162 (a)):

| Bun 授权 | 用途 | 对应 Node 能力 |
|---|---|---|
| autojs.control | autojs 的查询: Root 模式, 显示语言, 屏幕方向, 主题色, 资源 ID (R), 特殊权限 | autojs |
| autojs.manage | autojs.setRootMode / restart / exit (另需 autojs.control) | autojs.control |
| settings.control / settings.write | settings 的查询与导出 / setEnabled; export 写文件还需 files.control | settings / settings.write |
| sysprops.control | sysprops | sysprops |
| memory.control / memory.dump | memory 的 snapshot / collect / retained / dumpHeap | memory / memory.dump |
| installer.control / installer.mutate | installer 的查询 / install, uninstall, setDefault, session, authorizer.request | installer / installer.mutate |
| engines.control / engines.exec | engines 的列表与停止 / execScript, execScriptFile, execAutoFile | engines / engines:exec |
| plugintools.control | plugins.tools, 与 Rhino 相同也列出并调用用户授权 (USER_GRANTED) 的第三方插件的工具; 工具要截屏或读写路径时还需 screen.capture / files.control | plugin_tools (隐含 plugin_tools.user_granted) |

powerManager 使用已有的 device.control 与 device.power, notice 的扩展成员使用 notifications.post (ensureEnabled / launchSettings 另需 notifications.settings), notice.builder 与 notify(builder) 经 host.java (java.interop). 当前包名 / Activity (current* 与 waitFor*) 的 auto 模式依次尝试 shell.shizuku, shell.root 与 accessibility.control, 都不可用时得到空字符串. 授权关闭时在访问宿主之前 reject HostCallError NOT_GRANTED, missingCapabilities 列出缺少的 Bun 授权名 (Q90). installer 的安装类操作与插件工具调用最长等待 15 分钟 5 秒 (等待用户确认或工具完成), 其他调用 120 秒.

与 Node.js 的差异 (Bun 特有, 见宿主 ROADMAP 附录 C Q138 - Q140, Q161):

- autojs 的版本字段 (versionName / versionCode / versionDate / packageName) 读取插件写入的宿主信息快照 (`AUTOJS6_HOST_INFO_FILE`, 宿主的 host_info 授权, 默认开启); 开启 engines.control 时客户端创建时向宿主取一次本次执行的记录, engines.myEngine() 带 cwd / spawnDepth, autojs.name 与 versionDate 取宿主记录. 只有快照时 myEngine().cwd 为空, autojs.restart / exit 的 "@" 只给出脚本名.
- 全局系统函数 (current*, waitFor*, exit / stop 与状态函数, requires*, setScreenMetrics, getClip / setClip, WIDTH / HEIGHT, isAutoJs6) 与 R 默认只在 host.global / host.autojs 上 (Bun 插件不注入 AutoJs6 全局); 调用 `host.global.install()` 后装到 globalThis, 与 Rhino 的全局写法相同 (访问器, 赋值即替换, 已有的同名属性不覆盖, 返回装上的名称), 只对调用它的线程生效, Worker 各自调用; 也可传入其他目标对象. install 不可枚举, 不计入 host.global 的成员 (Q161 (a)).
- exit / stop 结束整个执行 (Q139 (b)): 主线程结束进程; Worker 经宿主的 execution.control 请求结束本次执行, 宿主收到后 Worker 自行结束, exit(error) 的错误使执行以该错误失败 (与主线程 exit(error) 的退出码 1 相同). execution.control 不是授权, 宿主 6.8.0 的每个能力桥都带它, 只能结束本次执行; 没有它的旧宿主上 Worker 只结束自身. 宿主停止 Bun 执行时直接结束进程, isStopped 只反映本线程调用过的 exit / stop.
- memory.watch 不提供 (not-portable: runtime-native, 与 Node 相同的 D-22; 对应写法是 FinalizationRegistry 与 bun:jsc 的 heapStats).



## Bun 与 Node.js Worker 事件和通知

宿主 build 5584, Node.js Runtime 1.19.0 和 Bun Runtime 0.8.0 提供共同的事件与通知封装. Bun 使用 `host.events` 和 `host.notifications`; Node.js 主线程及 CommonJS/ESM/嵌套 Worker 使用 `autojs6:events` 和 `notifications` / `autojs6:notifications`. Node 原生 `events` 和 `node:events` 继续提供 EventEmitter, 不会被宿主事件模块替换.

### 授权与系统条件

| 操作 | Bun 授权 | Node.js 声明 | Android 条件 |
| --- | --- | --- | --- |
| 屏幕/电量监听 | events.observe | events | 系统广播 |
| 通知监听 | events.observe + events.notification | events + events.notification | 当前应用已获得通知使用权, 且通知监听服务已连接 |
| Toast 监听 | events.observe + events.toast | events + events.toast | 当前应用的无障碍服务已连接; 仅观察其他应用的 Toast |
| 按键监听 | events.observe + events.key | events + events.key | 当前应用的无障碍服务已连接; 不拦截按键 |
| 按键拦截 (setKeyInterceptionEnabled) | events.observe + events.key + events.key.intercept | events + events.key + events.key.intercept | 当前应用的无障碍服务已连接 |
| 触摸监听 (observeTouch / onTouch) | events.observe + events.touch | events + events.touch | Root 或 Shizuku |
| 无障碍事件与服务状态 (auto.registerEvent / stateListener) | events.observe + accessibility.control | accessibility | 当前应用的无障碍服务已连接 |
| 跨脚本广播 (events.broadcast) | events.observe | events | 无 |
| 发送/取消通知 | notifications.post | notifications | Android 通知已启用; Android 13+ 需要 POST_NOTIFICATIONS |
| 打开通知设置 | notifications.post + notifications.settings | notifications + notifications.settings | 系统存在通知设置入口 |

六项 Bun 授权默认关闭, 在插件中心独立启用, 打包应用在 bun.hostCapabilities 中声明. events.touch 与 events.key.intercept (2026-10-30, api-coverage P4.4, Q182 (a)) 同样默认关闭, 不被 events.observe / events.key 隐含. Node.js 项目在 node.permissions 中声明. 通知发送权限与通知使用权不同, 任何一项都不隐式授予另一项. 打包配置会根据通知发送能力补入 POST_NOTIFICATIONS, 仍需实际系统授权. getPermissionStatus 查询的是发送通知的状态, 不代表已获通知读取权限.

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


## 设备控制与对话框

宿主 build 5585, Node.js Runtime 1.20.0 和 Bun Runtime 0.9.0 提供共同的异步设备控制和对话框接口. Node 主线程及 CommonJS/ESM/嵌套 Worker 可导入 `device` / `autojs6:device` 和 `dialogs` / `autojs6:dialogs`; Bun 使用 `host.device` 和 `host.dialogs`.

### 授权与设备信息

| 能力 | Node 声明 | Bun 独立授权 |
|---|---|---|
| 实时信息, 唤醒, 振动 | `device` | `device.control` |
| 亮度, 保持亮屏, 电池优化设置 | `device` + `device.power` | `device.control` + `device.power` |
| 媒体/通知/闹钟音量 | `media` + `media.audio` | `device.audio` |
| 输入/选择/进度对话框 | `dialogs` | `dialogs.control` |

Bun 的上述四项授权默认关闭, `device.info` 保留原有独立授权和格式. 打包项目在 `bun.hostCapabilities` 或 `node.permissions` 中声明能力. 构建器补入 WAKE_LOCK, VIBRATE, WRITE_SETTINGS 和 MODIFY_AUDIO_SETTINGS 对应清单项; 修改系统亮度仍需 Android 单独允许应用修改系统设置, 不会因项目声明自动获准.

`device.getInfo(options?)` 返回完整实时快照, 包含 build, screen, battery, memory, screenOn, locale, timeZone, uptimeMs 和 now. Node 的 `device.info()` 是其别名. Bun 的 `host.device.info()` 继续返回原有 Build 简要信息, 完整快照使用 `host.device.getInfo()`. Node 的同步 width/height/density/densityDpi 和 Build 属性是执行启动快照, Worker 继承它. Bun 的同步 Build 字段见下文 "Rhino 的设备 / 传感器 / 媒体族"; 宽高与密度仍使用异步 getter.

实时 getter 均返回 Promise:

- 数值: getWidth, getHeight, getDensity, getDensityDpi, getBrightness, getBrightnessMode, getBattery, getSdkInt, getTotalMem, getAvailMem.
- 字符串: getRelease, getModel, getBrand, getProduct, getBoard, getBootloader, getHardware, getFingerprint, getBuildId.
- 布尔: isCharging, isScreenOn, isIgnoringBatteryOptimizations.

缺失的设备信息会拒绝 Promise, 不返回伪造的有效值. 内存单位为字节; 宽高为像素. 屏幕方向应读取实时信息, 不用 Node 的启动快照推断.

### 设备控制方法

| 签名 | 返回值与行为 |
|---|---|
| setBrightness(value, options?) | Promise<void>; 整数 0..255, 写入系统亮度设置 |
| setBrightnessMode(mode, options?) | Promise<void>; 0 为手动, 1 为自动 |
| keepScreenOn(timeoutMs, options?) | Promise<void>; 正整数毫秒, 替换当前客户端的定时亮屏锁 |
| cancelKeepingAwake(options?) | Promise<void>; 释放当前客户端的亮屏锁 |
| wakeUp(options?) | Promise<void>; 请求唤醒屏幕 |
| vibrate(durationMs, options?) | Promise<void>; 非负有限时长, 向下取整并限制为最多 10000 ms |
| getMusicVolume / getNotificationVolume / getAlarmVolume(options?) | Promise<number>; 当前音量 |
| getMusicMaxVolume / getNotificationMaxVolume / getAlarmMaxVolume(options?) | Promise<number>; 最大音量 |
| setMusicVolume / setNotificationVolume / setAlarmVolume(value, options?) | Promise<void>; 非负整数, Android 决定允许范围与勿扰模式限制 |
| openBatteryOptimizationSettings(options?) | Promise<object>; options.dryRun=true 仅检查, 不打开设置页 |

控制方法支持 timeoutMs 和 signal. 一般调用默认超时 5000 ms. 亮屏锁属于创建它的客户端; Worker 退出只释放自己的锁, 执行结束释放该执行的全部锁. Android 的用户设置, 电源策略和权限仍有最终决定权. 音量控制本身不播放测试音.

### 输入与选择对话框

| 签名 | 返回值 | 取消结果 |
|---|---|---|
| alert(title, message?, options?) | Promise<void> | undefined |
| confirm(title, message?, options?) | Promise<boolean> | false |
| input / prompt / rawInput(title, prefill?, options?) | Promise<string \| null> | null |
| select(title, items, options?) | Promise<number> | -1 |
| singleChoice(title, items, selected=-1, options?) | Promise<number> | -1 |
| multiChoice(title, items, selected=[], options?) | Promise<readonly number[]> | [] |

input, prompt 和 rawInput 都返回文本, 不执行输入的 JavaScript. message/prefill 可以省略, 直接传 options. items 接受 string/number/boolean 数组, 索引从 0 开始. multiChoice 成功返回按索引排序的选中项. options 的 positive/negative/neutral 自定义按钮文本; neutral 的结果与取消相同. select 使用列表项直接完成选择.

对话框依附宿主或打包应用的独立 Activity, 不依赖 Rhino UI 线程. 普通交互默认等待 30000 ms, timeoutMs 可调整, Bun 最大为 120000 ms. 用户取消返回上表值; 超时或 AbortSignal 取消拒绝 Promise 并关闭窗口. Worker/执行退出也会清理仍在等待或尚未附着 Activity 的窗口. Android 仍限制后台启动 Activity.

### 进度对话框

`dialogs.progress.show(descriptor?, options?)` 返回 Promise<ProgressHandle>, 默认等待创建完成的预算为 10000 ms. descriptor 支持 title, message, max (默认 100), value (默认 0) 和 indeterminate (默认 false); max 必须大于 0, value 必须在 0..max 范围内.

句柄包含 id, shown, title, message, max, value 和 indeterminate, 并提供 update(patch, options?) 和 dismiss(options?). update 返回新的只读状态, 句柄的属性也随成功更新变化; dismiss 返回是否关闭了仍存在的窗口. 对应模块方法为 progress.update(id, patch, options?) 和 progress.dismiss(id, options?), 默认超时 5000 ms. 同一客户端创建的句柄可由这些方法操作. 创建完成后不会受 show 的超时预算影响, 需要显式关闭或由 Worker/执行退出清理.

```js
"nodejs";
let device = require("autojs6:device");
let dialogs = require("autojs6:dialogs");
async function main() {
    let progress = await dialogs.progress.show({ title: "设备信息", max: 1 });
    try {
        let info = await device.getInfo();
        await progress.update({ value: 1, message: info.build.model });
    } finally {
        await progress.dismiss();
    }
}
main().catch(console.error);
```

### Rhino 的设备 / 传感器 / 媒体族 (2026-10-30, api-coverage P4.1c)

`host.device`, `host.sensors` 与 `host.media` 采用 Node.js Runtime 的同一套实现 (`sync-device-dialogs.mjs` / `sync-sensors.mjs` 从 Node 源码复制设备与传感器工厂, media 为 Bun 自有的同形实现), 成员形态与 Node 的 `autojs6:device` / `autojs6:sensors` / `autojs6:media` 相同.

启动快照 (同步成员): 插件在本次执行开始时把以下值写进客户端旁的 `device-info.json` (`BunDeviceProfile`, 与 Node 插件的 NodeDeviceProfile 相同), 只在 `device.info` 授权 (默认开启) 打开时提供 (Q151 (a) / Q154 (a)):

- Build 字段 `sdkInt`, `release`, `model`, `brand`, `product`, `board`, `bootloader`, `hardware`, `fingerprint`, `buildId`, `buildDisplay`, `manufacturer`, `device`, `incremental`, `baseOS`, `securityPatch`, `codename` (android.os.Build 与 Build.VERSION 的值; `buildId` 同 Rhino 取 Build.DISPLAY).
- `width` / `height` (整屏短边 / 长边像素), `density` (同 Rhino 为 dpi), `densityDpi`, `pageSize` (原生页大小).
- `digest()`, `getMarketName()`, `isManufacturer(name)`, `manufacturers.isXxx()` / `brands.isXxx()` / `roms.isXxx()` (判断规则同宿主 Device / RomUtils, 读系统属性).
- 传感器列表: `sensors.getSensor(name)` 与 `sensors.register(name)` 据此判断设备有无该传感器.

`device.info` 关闭时这些成员不存在, `roms` 只剩 `isBackgroundStartGranted()` (宿主路由), `getSensor` 返回 null, `register` 在有 `sensors.control` 时返回 null (没有时先以 `NOT_GRANTED` 抛出); 异步的 `getBrand()` / `getWidth()` 等仍走 `device.control`. 单独导入 `host-client.mjs` 而旁边没有该文件时只有 `sdkInt` (0) 与 0 尺寸.

异步成员与授权 (未授权时调用即以 `NOT_GRANTED` 拒绝, `missingCapabilities` 列出缺少的 Bun 授权, 不发往宿主):

| 成员 | Bun 授权 | 宿主路由 (Node 能力) |
|---|---|---|
| summary, getOrientation, getRotation, isScreenOff / Portrait / Landscape, isPowerSourceAC / USB / Wireless / Dock, getIpAddress, getIpv6Address, getGatewayAddress, isActiveNetworkMetered, isConnectedOrConnecting, isWifiAvailable, isPointerLocationEnabled / Disabled, has / ensureReadPhoneStatePermission, roms.isBackgroundStartGranted, wakeUpIfNeeded, cancelVibration, `rotation` / `orientation` getter | `device.control` | device (`device`) |
| keepAwake, keepScreenDim, setPointerLocation, setPointerLocationEnabled / Disabled, togglePointerLocation | `device.control` + `device.power` | device (`device` + `device.power`) |
| getIMEI, getSerial, getAndroidId, getMacAddress, getSharedDeviceId, `imei` / `serial` getter | `device.control` + `device.identifiers` | device (`device` + `device.identifiers`) |
| sensors.register 后的订阅, getAvailableSensors, once, subscribe | `sensors.control` | sensors (`sensors`) |
| media.playMusic, pauseMusic, resumeMusic, stopMusic, musicSeekTo, isMusicPlaying, getMusicDuration, getMusicCurrentPosition, play / pause / resume / stop / seekTo / getPlaybackStatus | `media.control` | media (`media` + `media.playback`) |
| media.scanFile | `media.library` | media_store scanFile (`media` + `media.library`) |

`device.identifiers` (Q153 (a), 插件中心 "Bun 设备标识符"), `media.control` 与 `media.library` (Q152 (a), "Bun 音乐播放" / "Bun 媒体库扫描") 默认关闭, 打包项目在 `bun.hostCapabilities` 中声明; `device.identifiers` 不随 `device.control` 隐含.

- `rotation`, `orientation`, `imei`, `serial` 是 getter, 每次读取都向宿主查询并返回新的 Promise.
- `sensors` 是 Rhino 事件发射器 (`on` / `once` / `emit` / `emitSticky` / `getTimer` 等). `sensors.register(name, delay = sensors.delay.normal)` 同步返回 SensorEventEmitter (设备无该传感器时返回 null), 样本以 `change` (event, ...values) 与 `accuracy_change` (accuracy) 事件送达, `unregister()` / `sensors.unregisterAll()` 结束订阅; 订阅失败时发 `error` 事件, 没有监听时打印警告. `sensors.control` 关闭时 `register` 先于传感器列表检查授权, 抛 `NOT_GRANTED` (同 Node 74f6dfa8).
- `media.playMusic(path, volume, looping)` 返回播放会话 (`id`, `path`, `status()`, `pause()`, `stop()` 等), `scanFile(path)` 返回宿主是否已扫描该文件, 其余 Rhino 名称返回 Rhino 的结果 (无活动会话时时长 0, 位置 -1). 播放器属于本次执行, 执行结束 (含 Worker 结束整个执行) 时宿主停止播放并释放. 相对路径按宿主的脚本工作目录解析.

## Android 对象辅助接口与日历任务

宿主 build 5586, Node.js Runtime 1.21.0 和 Bun Runtime 0.10.0 提供以下接口. Node 主线程及 CommonJS/ESM/嵌套 Worker 可导入 `android` / `autojs6:android`, `colors` / `autojs6:colors` 和 `tasks` / `autojs6:tasks`. Bun 使用 `host.android`, `host.colors` 和 `host.tasks`.

### 授权与对象生命周期

| 能力 | Node 声明 | Bun 授权 |
|---|---|---|
| Paint, ColorStateList, 主题色, 原生 URI | android.objects | android.objects |
| 持久日历任务与 IntentTask | tasks | tasks.control |
| 将颜色状态用于原生 View | ui | ui.layout |

Bun 的 android.objects 与 tasks.control 默认关闭. colors 的纯数值转换, tasks.daysToTimeFlag 和 tasks.timeFlagToDays 在本地执行, 无需这些授权. Node 和 Bun 的 colors 共享当前 Node 颜色转换实现.

Paint 和 ColorStateList 由宿主持有, 脚本通过异步句柄访问. 句柄属于创建它的执行; Worker 退出释放自己的对象, 执行结束释放剩余对象. 句柄不能跨执行使用. ColorStateList 还提供只读 states/colors 快照, 可直接作为原生 TextView 的 textColor. 快照中的值可以序列化, 操作方法仍需原执行中的有效句柄.

### Paint 与颜色状态

| 签名 | 返回值与行为 |
|---|---|
| android.createPaint(options?, control?) | Promise<PaintHandle>; options 支持 color, antiAlias (默认 true), strokeWidth (默认 0), textSize (默认 16) 和 style |
| paint.getInfo(control?) | Promise<PaintInfo>; 当前颜色, 抗锯齿, 线宽, 文字大小和样式 |
| paint.setColor(color, control?) | Promise<void>; 更新原生 Paint, 也更新句柄颜色快照 |
| paint.measureText(text, control?) | Promise<number>; 使用原生 Paint 测量文字宽度, 单位 px |
| paint.close(control?) | Promise<boolean>; 释放对象, 再次关闭返回 false |
| android.createColorStateList(descriptor, control?) | Promise<ColorStateListHandle>; descriptor.states 与 descriptor.colors 必须非空且长度一致 |
| stateList.getColorForState(states?, fallback?, control?) | Promise<number>; 使用 Android 颜色状态匹配, fallback 默认为 defaultColor |
| stateList.close(control?) | Promise<boolean>; 释放对象 |

Paint 的线宽和文字大小使用 px, 必须有限且非负; style 为 fill, stroke 或 fill_and_stroke. control 支持 timeoutMs 和 signal, 默认超时 5000 ms. 取消尚未确认的创建请求会释放后来返回的对象.

颜色状态支持 Android 属性整数, 或 enabled, pressed, focused, checked, selected, activated, window_focused 名称. 名称前加 `!` 表示不具备该状态; 空数组表示默认分支. Android 按 states 的顺序选择首个匹配分支, 应将默认分支放在最后. 句柄包含 defaultColor 和 stateful.

`host.colors` 是 Rhino 的 colors (见 "纯 JS 工具"); 其中 createPaint, createColorStateList 与 getThemeColor 保留为上述辅助接口 (不可枚举), setPaintColor 也接受这里的 Paint 句柄. toColorStateList 与 Rhino 相同, 经 Java 门面 (`java.interop`) 返回 ColorStateList 句柄; 多状态颜色使用 createColorStateList 明确提供 states.

```js
"nodejs";
let colors = require("autojs6:colors");
let ui = require("ui");
async function main() {
    let stateList = await colors.createColorStateList({
        states: [["!enabled"], []],
        colors: ["#888888", "#1565C0"]
    });
    let text = await ui.createView("Text", { text: "颜色状态", textColor: stateList });
    let window = await ui.showLayout(text);
    try {
        await text.set({ enabled: false });
    } finally {
        await window.close();
        await text.dispose();
        await stateList.close();
    }
}
main().catch(console.error);
```

### 主题色与 URI

android.getThemeColor(control?) 和 colors.getThemeColor(control?) 返回 Promise<ThemeColor>, 包含 colorPrimary, colorPrimaryDark 和 colorAccent. colors.themeColor 与 Rhino 相同, 是宿主 ThemeColor 对象的句柄, 经 Java 门面 (`java.interop`) 取得, 因此是需要 await 的异步属性.

android.parseUri(value, control?) 返回原生 Android URI 的只读快照, 包含 value, scheme, authority, host, port, path, query 和 fragment; 缺失的字符串字段为 null, 缺失端口为 -1. null/undefined 输入返回 null.

android.getUriForFile(path, control?) 和 app.getUriForFile(path, control?) 返回 Promise<UriSnapshot>, 由当前应用的 FileProvider 为已存在路径生成 content URI. 相对路径以当前宿主执行目录解析. URI 本身不会授予其他应用读取权; 用 Intent 分享时仍需相应 URI 授权标志. app.parseUri 保留原有同步描述符接口.

### 持久日历任务

tasks 使用宿主任务页面相同的数据库和调度器, 创建结果为只读 JSON 快照. 已确认的任务在 Worker/脚本退出后保留, 需使用删除接口移除. 被取消且尚未确认的注册请求会清理其创建结果. 目标脚本在新的执行中运行, 使用目标项目的运行时及权限配置. 同一宿主进程的 Bun 调用在各自预算内排队, 等待可取消; 等待超时不会把尚未派发的调用标记为不确定执行.

| 创建方法 | 主要参数 |
|---|---|
| addTimedTask(options) | path/scriptPath/entry 与 repeatMode |
| addDailyTask(options) | path 与 time |
| addWeeklyTask(options) | path, time 与 daysOfWeek |
| addMonthlyTask(options) | path, time 与 dayOfMonth (1..31) |
| addYearlyTask(options) | path, time, monthOfYear (1..12) 与 dayOfMonth |
| addDisposableTask(options) | path 与 date |
| addCountdownTask(options) | path 与正整数 delayMs |

这些方法返回 Promise<TimedTask>. path 可以是已有脚本文件或声明了 project.json 的项目目录; 相对路径以宿主执行目录解析. repeatMode 支持 disposable/once, daily, weekly, monthly, yearly, countdown, 或对应数值 0..5. addTask(options) 根据 action/kind 选择 IntentTask, 否则创建日历任务.

time 接受本地 HH:mm[:ss[.SSS]], Date 或时间戳. date 接受 Date, 时间戳或日期时间字符串; 带时区偏移的字符串保留其实际时刻, 无偏移字符串按设备本地时间解析. daysOfWeek 中 0/7 表示周日, 1..6 表示周一至周六, 也支持英文星期名称及缩写.

日历重复按本地日期计算. 月末不存在的日期沿用宿主规则取当月末日; 非闰年的 2 月 29 日取 2 月末日. 夏令时缺失时刻向前跨过缺口, 重复时刻采用较早的一次. endMode 支持 forever, count 或 until_date; count 配合正整数 times, until_date 配合 YYYY-MM-DD 格式的 untilDate. delay, interval 和 loopTimes 沿用脚本执行配置, 默认分别为 0, 0, 1.

任务快照包含 id (数字), kind="timed", path, repeatMode, millis, timeFlag, nextTime, scheduled, finishedTimes, sourceKind, projectRoot 和 options. nextTime 是计划时刻, 实际启动受 Android 调度与运行时可用性影响. 构建器为 tasks 能力声明补入 RECEIVE_BOOT_COMPLETED, WAKE_LOCK 和 SCHEDULE_EXACT_ALARM; 特殊闹钟访问仍由 Android 决定. 宿主继续使用已有的 Alarm/WorkManager/JobScheduler 选择与降级规则. [Android 闹钟调度说明](https://developer.android.com/develop/background-work/services/alarms).

### IntentTask 与任务管理

addIntentTask(options) / addBroadcastIntentTask(options) 返回 Promise<IntentTask>. options 包含 path 与 action, 可选 category, dataType (MIME), local/isLocal. 默认接收外部广播; startup 动作默认 local=true. 本地和外部广播分别注册, category 和 MIME 条件参与匹配. 更新或删除后, 相应接收器按剩余任务重新注册.

IntentTask 快照包含 id, kind="intent", path, action, category, dataType, local, options 和 lastIntent. 本批 API 创建的任务在收到广播后保存最近一次 Intent 快照, 包括 action, data, type, categories, flags, extras 和 receivedAt. 更新时 category/dataType 设为 null 可以清除条件. 自定义广播接收依赖应用进程中的动态注册; 应用强停后需重新打开以恢复注册.

| 管理方法 | 返回值 |
|---|---|
| queryTimedTasks(options?) | Promise<readonly TimedTask[]>; 可按 path/scriptPath 和 repeatMode 筛选 |
| queryIntentTasks(options?) | Promise<readonly IntentTask[]>; 可按 path/scriptPath 和 action 筛选 |
| queryTasks(options?) | Promise<readonly Task[]>; 两类任务快照 |
| getTimedTask(id, control?) / getIntentTask(id, control?) | Promise<Task \| null>; 可传对应快照或数字 ID |
| updateTask(task, patch?) | Promise<Task \| null>; 根据快照 kind 更新并重新调度/注册 |
| removeTimedTask(id, control?) / removeIntentTask(id, control?) | Promise<boolean> |
| removeTask(task, control?) | Promise<boolean>; 推荐传含 kind 的快照, 数字或数字字符串按 timed 处理 |
| daysToTimeFlag(days) / timeFlagToDays(flag) | 本地同步转换; days 为 0..6, flag 为 0..127 |

tasks.sendLocalBroadcastSync(actionOrIntent, control?) 返回 Promise<boolean>, 表示本地事件提交结果, 不等待目标脚本运行完成. Intent 描述符可提供 action, category/categories, type, data 和 JSON 基础类型 extras. 本地事件不重播给新注册的接收器, 使用现有 64 项缓冲.

Node 的 autojs6:compat.tasks.addDisposableTask 保留旧 WorkManager 路径与字符串 ID, queryTasks 保留该旧作业查询. 新 tasks 模块返回本地任务数据库的数字 ID. compat 的 get/remove 根据 ID 类型兼容旧字符串作业, 日历和 Intent 方法转入新接口. 同时声明 tasks/work_manager 时, 无筛选的 compat.tasks.queryTimedTasks 包含两类结果. 新代码建议直接导入 autojs6:tasks.

## Java/Android 对象互操作

**`Async`**

Node.js 主线程和 CJS/ESM/嵌套 Worker 使用 `require('java')` 或 `import java from 'autojs6:java'`. Bun 使用 `host.java`. Node 项目声明 `java_interop`, Bun 使用默认关闭的独立 `java.interop` 开关, 打包项目在 `bun.hostCapabilities` 中声明该能力. `android.objects` 的画笔等辅助接口授权保持独立.

配套宿主提供已加载应用及 Android/Java 类的公开成员访问, 不再使用旧版本的九类白名单. `java.policy.access` 为 `public`; 空的 allowedClasses 不表示所有类被禁用. `describe` 查询当前设备实际可用的类和成员. 调用在宿主应用进程中运行, 不是 Node/Bun 插件进程; 打包后则在生成应用自己的进程中运行. Java 能力允许调用其公开 Android 接口, 不以其他窄接口开关再次过滤, 但系统权限, UID, SELinux 和 Android 隐藏 API 规则仍生效. 显式调用 Java 反射 API 同样遵守平台的反射规则.

| 方法 | 返回值及含义 |
| --- | --- |
| `type(className)` / `findClass(className)` | 本地同步 ClassDescriptor; 使用完整类名, 内部类用 `$` |
| `describe(classOrName, options?)` | `Promise<ClassSpec>`; 方法名, 字段名及构造/方法签名 |
| `new(classOrName, args?, options?)` / `create(...)` | `Promise<ObjectHandle>`; 调用公开构造器 |
| `callStatic(classOrName, method, args?, options?)` | `Promise<unknown>`; 静态方法 |
| `call(target, method, args?, options?)` / `callInstance(...)` | `Promise<unknown>`; 实例方法 |
| `getField(target, field, options?)` / `setField(target, field, value, options?)` | 异步读取/写入公开实例字段; 写入返回 boolean |
| `getStatic(classOrName, field, options?)` / `setStatic(classOrName, field, value, options?)` | 异步读取/写入公开静态字段; final 字段不可直接写入 |
| `getContext(options?)` | `Promise<ObjectHandle>`; 当前执行应用的 application Context, 不是 Activity |
| `getClassName(target, options?)` / `instanceOf(target, classOrName, options?)` | `Promise<string>` / `Promise<boolean>` |
| `newArray(componentType, lengthOrValues, options?)` | `Promise<ObjectHandle>`; 创建可修改的 Java 数组, 支持基础类型, 对象和嵌套数组 |
| `arrayLength(target, options?)` / `getArrayItem(target, index, options?)` | `Promise<number>` / `Promise<unknown>` |
| `setArrayItem(target, index, value, options?)` / `toArray(target, options?)` | `Promise<boolean>` / `Promise<readonly unknown[]>` |
| `cast(type, value)` | 本地同步 TypedValue, 用于选择重载, typed null 或精确数值 |
| `release(target, options?)` / `dispose(target, options?)` | `Promise<boolean>`; 释放该句柄引用, 再次释放返回 false |

ClassDescriptor 带 callStatic/new/create/getStatic/setStatic/describe 方法. ObjectHandle 带 call/callInstance/getField/setField/getClassName/instanceOf/arrayLength/getArrayItem/setArrayItem/toArray/release/dispose 方法, 无需重复传 target. 对象方法不可枚举, `toJSON()` 返回可克隆的句柄描述符. Worker 间传递后使用 `java.call(snapshot, ...)` 等模块方法; 克隆不会转移所有权或延长创建者生命周期.

参数接受 null/undefined, string, boolean, number, bigint, Java 句柄, 数组, TypedArray 和 cast 结果. 普通 JS 对象与函数不自动变为 Java Map 或回调. 可先构造 Bundle/HashMap 再逐项写入. 数组参数按声明的数组类型转换; Java 可变参数使用一个明确的数组参数, 不自动把尾随参数打包. 方法返回的数组是 JS 快照; 使用 newArray 创建并持有 Java 数组可观察原地修改.

默认按实际值匹配重载, 无法唯一确定时拒绝, 不依赖反射返回顺序. `options.parameterTypes` 指定准确的 JVM 参数类型名, 如 `['long', 'java.lang.String', 'byte[]']`; `java.cast('java.lang.String', null)` 区分可空引用重载. 非整数不会截断为 int. JS 不安全整数拒绝, 应传 bigint 或 `java.cast('long', '9223372036854775807')`. 返回的 long 在安全整数范围内是 number, 超出范围是 bigint. NaN/Infinity 使用可传输标记往返后恢复为 JS number. 这些标记由封装处理, 不需用户手写.

`options.thread` 为 `default` 或 `main`; 默认沿用桥接执行线程, Android View 等要求主 Looper 的操作应传 `main`. 每次调用单独指定. `timeoutMs` 默认 5000, `signal` 可取消等待, 但已进入 Java 的操作不承诺回滚或强制中断. Java 异常保留原因类名和消息; Node 使用 Java 桥接错误码, Bun 使用其既有 HostCallError 传输错误码.

```js
"nodejs";
let java = require('autojs6:java');

(async () => {
    let context = await java.getContext();
    let array = await java.newArray('int', [4, 1, 3]);
    let view;
    try {
        console.log(await context.call('getPackageName'));
        await java.callStatic('java.util.Arrays', 'sort', [array]);
        console.log(await array.toArray()); // [1, 3, 4].
        view = await java.new('android.widget.TextView', [context], { thread: 'main' });
        await view.call('setText', ['Hello'], { thread: 'main' });
        console.log(String(await java.getStatic('java.lang.Long', 'MAX_VALUE')));
    } finally {
        if (view) await view.release();
        await array.release();
        await context.release();
    }
})();
```

Bun 中把入口替换为 `const { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE); const java = (await createHostClient()).java;`. 文档示例只创建未附加的 TextView; 将 View 显示在窗口中仍需对应 UI 操作和系统条件.

对象句柄属于一次执行; Node Worker 创建的句柄在该 Worker 退出时释放, 父线程句柄保持有效. 取消后的迟到对象结果也会释放. release 只释放桥引用, 不自动调用未知 Java 对象的 close/recycle, 文件流等资源应先显式关闭. Context 句柄不能代替运行时权限申请. Java 回调/子类生成和 loadDex/loadJar 入口见下一节; Rhino 式同步包全局仍未实现. Bun 继续受 1024 次调用, 4 个并行请求和 JSON 大小上限约束; 本次没有修改原生 Bun 二进制或其兼容范围.

## Java 回调, 子类与代码加载

**`Async`**

配套宿主 build 5592, Node Runtime 1.23.0 与 Bun Runtime 0.12.0 增加下列接口. Node 主线程和 CJS/ESM/嵌套 Worker 使用 `java` / `autojs6:java`, Bun 使用 `host.java`. 继续使用 Node 的 `java_interop` 与 Bun 默认关闭的 `java.interop` 授权. `$autojs.java` 也提供 proxy/defineClass/loadDex/loadJar/wrap 等入口.

| 方法 | 返回值及用途 |
| --- | --- |
| `proxy(interfaces, implementation, options?)` | `Promise<ObjectHandle>`; 创建实现公开接口的生成代理对象 |
| `wrap(callback, interfaceName?, options?)` | `Promise<ObjectHandle>`; 默认实现 java.lang.Runnable, 也可指定其他单抽象方法接口 |
| `defineClass(definition, options?)` | `Promise<GeneratedClass>`; 生成真实 Java 子类 |
| `loadJar(paths, options?)` | `Promise<ClassLoaderHandle>`; 用宿主现有本地编译器把 JAR 中的 Java class 转成 DEX 并加载 |
| `loadDex(paths, options?)` | `Promise<ClassLoaderHandle>`; 加载标准 DEX 或含 classes.dex 的 ZIP/JAR/APK 代码容器 |
| `retain(handle, options?)` / `handle.retain(options?)` | `Promise<ObjectHandle>`; 为临时回调参数保留独立引用 |
| `closeCallbacks()` | `Promise<void>`; 关闭当前 java 对象建立的回调注册并停止轮询 |

### 接口代理与返回值

interfaces 接受完整类名, ClassDescriptor 或它们的数组. implementation 可为方法名到函数的对象; 单抽象方法接口可直接传函数. 代理通过生成类实现接口, 并非 java.lang.reflect.Proxy 实例. 没有覆盖的接口默认方法由 Java 执行. 默认方法有冲突时应明确提供覆盖.

```js
"nodejs";
let java = require('autojs6:java');

(async () => {
    let runnable = await java.wrap(async function () {
        console.log(await this.java.callStatic('java.lang.Math', 'max', [3, 9]));
    });
    try {
        await runnable.call('run');
    } finally {
        await runnable.release();
    }
})();
```

回调函数可返回普通值或 Promise. Java 等待它完成, 并按 Java 方法的返回类型转换结果. 转换规则包括精确 long/bigint, null 与 Java 对象句柄; 返回值不匹配时报告错误. methods 的键可用简单方法名覆盖同名重载, 或用 `compare(java.lang.Object,java.lang.Object)` 等完整参数签名选择一个重载. 所有抽象方法必须实现, static/final/private 方法不可覆盖.

普通 function 和对象方法中的 this 是 CallbackContext:

| 成员 | 含义 |
| --- | --- |
| `this.java` | 注册该回调的 java 封装 |
| `this.receiver` | 正在执行方法的代理/子类对象的临时句柄 |
| `this.method` / `this.signature` | 当前方法名与参数签名 |
| `this.callSuper(...args)` | 调用当前覆盖方法的具体父类实现, 返回 Promise |

箭头函数保持普通 JavaScript 的词法 this 规则. JavaScript 回调在注册它的 Node/Bun/Worker 中执行. 通过同一个 java 封装或回调对象句柄发起的 Java 调用会自动重入等待中的 Java 线程, 包括 Android 主线程. 有依赖的调用应依次 await; 不等待就返回的异步操作不保证在回调结束前完成. 通过其他客户端或 UI 模块发起的调用不属于这条 Java 重入通道.

对象参数和 receiver 是临时句柄, 回调结束后自动释放. 数组参数也是临时 Java 数组句柄, 可用 toArray 读取副本, 或用 setArrayItem 修改原始数组. 如需在回调结束后继续使用参数, 先 `await java.retain(value)`, 用完再 release. 回调返回 Java 对象时, 完成回传会先保存原生引用, 再释放临时句柄.

### 子类与构造器

definition 支持 name, extends, interfaces 和 methods. name 省略时生成唯一名称; extends 默认 java.lang.Object, 必须是公开且非 final 的类. 可调用父类的 public/protected 构造器, 覆盖 public/protected 实例方法. 参数按普通 Java 重载规则处理; `ClassDescriptor.new(args, options)` 的参数不包含内部回调分发器.

```js
let Generated = await java.defineClass({
    extends: 'java.lang.Object',
    methods: {
        toString: async function () {
            return '[JavaScript] ' + await this.callSuper();
        },
    },
});
let object = await Generated.new();
try {
    console.log(await object.call('toString'));
} finally {
    await object.release();
    await Generated.release();
}
```

父类构造器调用被覆盖的方法时, 回调已经可用. 需要 Android 主线程的构造或方法调用, 使用 `Generated.new(args, { thread: 'main' })` 或对应 call 选项. callSuper 仅适用于有具体父类实现的方法; 抽象方法和接口默认方法不提供这个快捷入口. 生成类可使用 ClassDescriptor 的构造, 静态访问与 describe 方法, 也带 release/dispose 和可克隆的句柄信息.

### JAR/DEX 与类加载范围

paths 接受一个路径或路径数组. 它们是宿主执行应用可读取的文件路径, 相对路径以宿主执行目录为基准, 不是运行时插件私有目录. 相互依赖的文件应在同一次调用中传入. loadJar/loadDex 与代理/子类创建的 timeoutMs 默认 120000; 回调本身的等待预算是另一项 callbackTimeoutMs.

```js
let loader = await java.loadJar(['lib/base.jar', 'lib/helper.jar']);
try {
    let Helper = loader.type('example.Helper');
    let helper = await Helper.new();
    try {
        console.log(await helper.call('toString'));
    } finally {
        await helper.release();
    }
} finally {
    await loader.release();
}
```

ClassLoaderHandle 提供 paths 和 type/findClass. paths 是私有只读代码副本的位置. 未指定加载器的 java.type/describe/new 也能查找本次执行已经加载的类. 加载器采用 parent-first 规则; 已加载同名类不会被后来文件热替换. release 释放加载器句柄, 不承诺 JVM 卸载类. 代码目录在执行退出且在途操作结束后清理, 不修改源文件. 不同执行不共享这些类定义.

加载过程遵循 Android 14 起的动态代码只读要求, 在打开目标文件后, 写入内容前将其设为只读. 参阅 [Android 动态代码加载要求](https://developer.android.com/about/versions/14/behavior-changes-14). JAR 必须与 Android 及宿主现有 D8/dx 编译器兼容; 本批未扩大旧 Android 的 Java 字节码兼容范围. 此入口仅加载代码, 不部署 APK/AAR 资源或 JNI 库.

### 错误与生命周期

CallbackOptions 提供 timeoutMs, signal, callbackTimeoutMs 和 onError. callbackTimeoutMs 默认 5000 ms, 范围 1..120000. 处理函数及完成回传中的错误交给 onError; 缺省写入控制台. 主动 Java 调用会拒绝其 Promise. Android 自行触发的回调在失败时记录日志, 并以基本类型默认值或 null 返回, 避免把 JavaScript 异常直接抛出到 Android 事件线程.

代理 release 会关闭该代理的回调. 生成类 release 会关闭其所有实例共用的回调定义. Worker 退出会关闭属于该 Worker 的回调并解除 Java 等待, 保留父线程的注册. retain 仅保留对象引用, 不转移回调所有权. 已关闭的残留原生监听器不会再执行 JavaScript; 使用后仍应从 Android 对象上解绑监听器. 已经开始执行的 JavaScript 函数或 Java 方法不承诺被强制中断.

回调注册存续期间会保持事件接收, 应及时 release 或 closeCallbacks. Bun 继续使用原有每次执行 1024 次调用和 4 个并发请求等预算; 轮询与每次返回值回传都会消耗预算, 不适用于无限期或高频逐帧回调. 普通并发 Java 调用遵守对象自身的线程安全规则.

对象快照的 value.string 使用对象标识, 避免序列化时隐式执行用户的 toString 并再次触发回调. 需要文字内容时明确 `await object.call('toString')`. 本批仍不注入 Rhino 的同步 Java 包全局, 不自动把任意函数实参转换为 Java 回调.

Bun 打包应用隐藏启动页和日志页时, 与 Node 一样使用现有的 12 秒启动可见性窗口, 避免运行时尚在初始化就关闭启动 Activity. 实际脚本 UI 出现后由其窗口保持前台状态; 该启动窗口不承诺长期后台驻留.


## Runtime TTS

Host 5603, Node 1.24.0 and Bun 0.13.0 add the explicit tts/autojs6:tts module and host.tts. The shared Android TTS actor supports engine/voice/language queries, speech, silence, atomic file synthesis and observable task events, with isolated Worker clients and execution cleanup. Await task creation, then await task.result; audio events contain Uint8Array. Bun requires the independent default-off tts.control grant and retains its transport budgets. Node projects declare tts. No microphone permission or model installation is implied. See Documentation api/runtimeApis.md and host docs/dev/runtime-tts-2026-10-20.md for the contract and validation.


## Speech recognition and model management

The speech facade is available through `require("autojs6:speech")` in Node main threads and CJS/ESM/nested Workers, and through `host.speech` in Bun. It provides WAV/PCM recognition, VAD, microphone and wake sessions, model listing/install/import/default/removal/catalog refresh, and plugin synthesis. All host calls return Promises; callbacks stay on the originating JS thread. Node declares `speech`; Bun explicitly grants `speech.control`, including in packaged projects. The speech plugin owns the microphone permission and installed models.

PCM views preserve offsets and are transferred in chunks. Speech operations use short requests with cancellable event polling; Bun speech calls do not consume the ordinary 1024-call budget, while request/result, grant and concurrency bounds remain. `speech.close()` cancels owned work; Worker exit releases its own client, including a late creation reply. No global speech object or automatic model/license installation is added.

See the [runtime reference](https://docs.autojs6.com/#/runtimeApis) for signatures, event types, limits and model license options. Regression commands: `node tools/host-client/sync-speech.mjs --check` in Bun, and `node --test tools/nodejs/api/test-speech.js tools/nodejs/api/test-worker-speech.js` in Node.

Independently signed applications need the build 5621 Runtime Kit and the separate packaged entry of 3-Macaw Speech 1.1.0/build 69 or later. The builder requests org.autojs.plugin.speech.permission.RUNTIME for speech access. Microphone/wake calls also require the application's own declared and granted RECORD_AUDIO permission; WAV/PCM and model operations do not. Applications share the plugin model store and defaults. The original host signature entry stays protected.
## EPUB books and reader sessions (2026-10-21)

The explicit SDK exposes `host.epub` under the independent, default-off `epub.control` grant. The shared Node/Bun/Worker factory supplies all 20 registered EPUB root names, asynchronous book operations and reader sessions. Metadata is available when `open()` resolves. Text and encoded cover bytes are fragmented across bounded responses; `cover(path)` and `resource(href,path)` export files through the host's Android identity.

Reader events retain the EPUB script field names, including `totalProgression`, `chapterTitle`, and flattened bookmark/highlight changes. Control methods return Promises. Operations default to a 60000 ms deadline and support AbortSignal cancellation; late handles are closed. Client/execution cleanup owns only its books and reader sessions. Session close leaves the reader visible unless `finish:true` is supplied.

`epub.control` polling and fragments are exempt from the ordinary 1024-call execution quota, like `speech.control`. Grant, payload, concurrency and per-RPC deadline checks remain active. Native Bun executables, the runtime lock and the Android/ABI compatibility matrix are unchanged.

Packaged applications declare `epub.control` and use the paired Runtime Kit. Builder derives `org.autojs.plugin.epub.permission.RUNTIME`; 3-Folio EPUB 2.1.0 provides the separate packaged service and reader alias while preserving the original host entry. The provider checks the creating UID on returned handles. Reader preferences, progress, bookmarks and annotations remain shared plugin state.

See Documentation `api/runtimeApis.md` for complete signatures. `node tools/host-client/sync-epub.mjs --check` verifies the shared implementation and declarations; `node --test tools/host-client/epub.test.mjs` exercises SDK negotiation and denied grants.


## Theme color, gallery and batch rename (2026-10-30, AutoJs6 api-coverage P4.5)

Three independent, default-off grants, one per host bridge module, each listed in the plugin settings of the host (Q195 (a)):

| Grant | Client member | Needs |
| --- | --- | --- |
| `theme.control` | `host.colors.theme` (get, set, reset, libraries, activate, deactivate, next, state, current) | nothing else |
| `gallery.control` | `host.gallery` (pick, view, edit, convert, isAvailable, their Async forms, GalleryError) | 3-Maple Image 3.4.0 or later |
| `batchrename.control` | `host.files.batchRename` (callable; plan, preview, apply, undo, history, presets, importPresets, deleteHistory, clearHistory, isAvailable, the six Async forms, BatchRenameError) | Batch Rename 1.0.0 or later |

They are the shared Node facades: `colors.theme` of the JS tools core and the plugin family factory, so argument rules, error types and codes are those of Rhino and of Node, and every member returns a Promise. A call without its grant rejects with `NOT_GRANTED` and the capability. `gallery.control` and `batchrename.control` polling is exempt from the ordinary 1024-call execution quota, like `epub.control`, because a viewer stays open and pickers wait for the user. Size, grant, concurrency and per-RPC deadline checks remain active; a gallery or batch rename client that was opened late for an abandoned call is closed.

`speech` adds `diarize`, `detectLanguage`, `tag` with their Async forms and `speech.speaker` under `speech.control` (3-Macaw Speech 1.3.0 or later).

See Documentation `api/runtimeApis.md` for signatures. `node tools/host-client/sync-plugin-family.mjs --check` verifies the shared implementation and declarations; `node --test tools/host-client/plugin-family.test.mjs` runs the client regressions.

## Mail accounts, messages and watches (2026-10-21)

Node 1.27.0 exposes `mail` / `autojs6:mail` and explicit `$autojs.mail` in the main thread, with the same facade in CommonJS, ESM and nested Workers. Bun 0.16.0 exposes `host.mail` under the independent, default-off `mail.control` grant. The 57 registered root names cover default-account forwarding, provider presets and saved-account queries. Network operations return Promises; Async names are aliases and `folder()` is a local helper. Clients also support folder/message/attachment helpers and observable watches.

Each client owns its account and watches. `mail.close()` closes the default account; `mail.dispose()` releases all accounts and watches belonging to that facade. Worker exit releases only its own resources. Message dates are Date objects, attachments can download to files with progress, and watch callbacks run on the originating JS thread. Token providers may return Promises, including the one refresh after an authentication failure. Operations default to a 60000 ms deadline and accept AbortSignal cancellation; the deadline includes token callbacks and late results are cleaned up.

The bridge reuses the host mail argument checks, streaming downloads and watch recovery. Bun mail polling and response fragments are exempt from the ordinary 1024-call execution quota; permissions, payload sizes, concurrency and per-request deadlines still apply. The Node bridge is rebuilt with this facade; Node/Bun engine versions and the Bun compatibility matrix are unchanged.

Independently signed apps need 3-Stamp Mail 2.1.0 and the matching Runtime Kit. Builder derives `org.autojs.plugin.mail.permission.RUNTIME`. This separate entry accepts only credentials supplied by the calling app and pins session/watch handles to its UID. Saved account aliases, account enumeration and background watches remain restricted to the original signature-protected host entry. Account credentials are never bundled automatically.

See [Runtime APIs](https://docs.autojs6.com/#/runtimeApis) for the shared contract. Node regressions are `node --test tools/nodejs/api/test-mail.js tools/nodejs/api/test-worker-mail.js`; Bun checks are `node tools/host-client/sync-mail.mjs --check` and `node --test tools/host-client/mail.test.mjs`. Physical and packaged-app acceptance is recorded separately in the host audit.


## 2026-10-21 Flow core

Node 1.28.0 and Bun 0.17.0 share asynchronous Flow chains, predicate/selector/stability waits, Promise combinators, branch cancellation and single-step retry across main threads and CJS/ESM/nested Workers. Node uses flow/autojs6:flow and explicit $autojs.flow; Bun uses host.flow. Host UI snapshots and foreground waits require accessibility or the existing default-off accessibility.control grant and the calling application's bound Android service. Local callbacks need no host grant. Bun retains its 1024-call budget; native payloads and compatibility are unchanged. This core-only checkpoint preceded the tools/event batch below; synchronous Rhino terminals remain separate work; within/scope is supplied by the later scope batch. See Documentation api/runtimeApis.md and host docs/dev/runtime-flow-core-2026-10-21.md for semantics and acceptance.

## 2026-10-21 Flow tools and event waits

Node 1.29.0 and Bun 0.18.0 extend the shared Flow facade to all 52 registered root names, including advanced click/scroll/input/collection tools and idle/accessibility/toast/notification waits. Node main threads and CommonJS/ESM/nested Workers share the same implementation. Bun native tools require the independent default-off flow.control grant plus the applicable accessibility, gesture, app, clipboard and event grants. Only flow.control streaming is exempt from the ordinary 1024-call budget; existing accessibility polling keeps that budget.

Node snapshots are relocated and checked before actions. EventFlow.ready confirms real subscription installation. Async tool/filter callbacks run on their owning JS thread, may reenter tools, preserve original errors and participate in cancellation/deadlines. Results use UTF-8 chunks; Worker exit and late open replies close only owned clients. workers counts pending native operations; dispose() cancels pending work and closes the facade's native client. This historical tools checkpoint preceded the scope/gesture batch below. Synchronous Rhino terminals and arbitrary Java UiObject methods remain outside this contract. See Documentation api/runtimeApis.md for signatures, defaults and limits. Device and actual packaged acceptance is recorded separately in the host batch report.

## 2026-10-21 Flow scopes and gestures

Node 1.30.0 and Bun 0.19.0 add Flow instance within/scope, inherited root/compass/resultType, branch-local overrides, and press/swipe/gesture/gestures overloads. Search roots are relocated snapshots; stale roots reject instead of widening the search. Result aliases use the core picker table, compass uses the core parser, and projections return data or navigation snapshots rather than Java objects. Node arrays can perform actions on every element. Global gestures retain their input and validate gesture permission before dispatch; cancellation cannot undo strokes already accepted by Android. Scope reads retain the accessibility query grant; gesture actions also use flow.control in Bun. See Documentation api/runtimeApis.md for overloads and type inference. Native Node/Bun payloads and compatibility matrices are unchanged. Physical/package acceptance will be recorded in host docs/dev/runtime-flow-scope-2026-10-21.md.

## 2026-10-31 Flow await and sync

Node 2.1.0 and Bun 0.22.0 add the Rhino terminals await() and sync(timeout?) to the Flow handle, on main threads and in Workers (Q202). Neither blocks the script thread: both answer with the Promise of the settlement, so scripts write `await chain.sync()`. sync(timeout) rejects with a TIMEOUT FlowError (step and reason `sync`, elapsed the timeout) while the chain keeps running, as in Rhino; no timeout, null and Infinity wait without a limit. await() and sync() are the Promise of toPromise(), and a timed sync() left unobserved is not an unhandled rejection. Rhino's limits on the UI thread and the flow worker thread do not apply here.

## AI provider core

`host.ai` provides callable ask, chat, stream, catalog and persistent sessions under the separate default-off `ai.control` grant. Its factory and declarations are synchronized from Node, including events, cancellation, UTF-8 result fragments, stream ready/result and explicit close. AI polling is excluded from the ordinary cumulative bridge-call budget; permission, byte, concurrency and per-request limits still apply. No Bun native payload or compatibility matrix changes.

Packaged apps declare `ai.control`, then call `host.ai.hasAccess()` / `requestAccess()` for explicit application consent in 3-Stone AI. The normal AI_RUNTIME entry permission alone grants no model access; the plugin settings can revoke consent and cancel active requests. The user authorizes use of 3-Stone AI local models and configured online accounts; paid quota may be consumed. Node/Bun do not inject Rhino AI globals. Agent task controls use the separate grant below.

## AI Agent task controls

Bun 0.21.0 adds `host.ai.agent` with the independent, default-off `agent.control` grant on AutoJs6 build 5850 or newer. `ai.control` does not grant task control. The shared Node/Bun factory supplies run/create/get/list/catalog/presets/status/context/result, typed AgentRun events, async respond/confirm/cancel/join and explicit hasAccess/requestAccess/close helpers. run/get return Promise handles; create snapshots its options locally. join is asynchronous and its timeout leaves the task running. Native validation preserves preset/global restrictions and prevents assistant overrides from widening budgets, tools or script roots.

Packaged applications delegate these tasks to the installed official AutoJs6 host, which owns the existing 3-Stove Agent model/device brokers. The AGENT_RUNTIME entry permission is derived from agent.control, and explicit per-application consent is requested in AutoJs6. Identity-bound grants and run ownership survive ordinary app restarts, while another application's tasks remain inaccessible. Plugin Center settings can revoke access and stop ordinary or detached tasks. Direct host.ai inference retains its separate 3-Stone AI authorization.

Context and result reporting belong to the current registered script; outside it they return null/false. Client exit cancels owned non-detached tasks and releases borrowed observers. A pending submission cancelled before its reply is acknowledged also cancels a late detached admission. Long Agent polling is exempt from the ordinary cumulative bridge-call budget while existing byte, concurrency and per-call limits remain. Native Bun bytes and compatibility claims do not change. See Documentation `api/ai.md` and the host Agent batch report for signatures, validation and restoration.

## 纯 JS 工具: util, species, global, s13n, cvt, fmt, jsox

`host.util`, `host.species`, `host.global`, `host.s13n`, `host.cvt`, `host.fmt` 与 `host.jsox` 对应 Rhino 的同名模块: `cvt` / `fmt` 即 `converter` / `formatter`, `host.jsox.mathx` / `arrayx` / `numberx` 即 `Mathx` / `Arrayx` / `Numberx`, `host.global` 收录 Rhino 全局对象上的数据函数 `random`, `randomInt`, `randomFloat`, `isInteger`, `isPrimitive`, `isObject`, `isReference`, `isBigInt`, `isEmptyObject`, `isObjectSpecies`. 它们在客户端本地执行, 与 Rhino 一样同步返回, 不经过宿主桥, 不占每次执行 1024 次调用的预算, 不需要授权, 也不注入为 Bun 全局变量.

```js
console.log(host.util.isList([1, 2]), host.species([]), host.global.randomInt(1, 6));
console.log(host.jsox.mathx.sum(1, 2), host.cvt.bytes(1024, "KB"), host.fmt.bytes(2048));
host.jsox.extend("Mathx"); // 与 Rhino 相同, 把 Mathx 的方法装到本执行的内建 Math 上
```

实现与 Node.js 运行时共用: `tools/host-client/sync-js-tools.mjs` 把 Node 插件 `node_bridge_sources.cpp` 的 "Shared JS tools core" 及其声明同步进 `host-client.mjs` / `host-client.d.mts` 的 GENERATED JS TOOLS 段 (不要手改这两段, 改 Node 的源后重新同步; `--check` 只核对). 共享用例 `tools/host-client/js-tools/cases.js` (523 例) 与真机 Rhino 的结果 `rhino-expected.json` 逐项对照; 宿主仓库的 `tools/api-coverage/device_bun_js_tools.py` 在真机上对 Bun 主线程与 Worker 跑同一组用例.

- 需要 Java 对象的成员经 `host.java` 调用宿主, 受默认关闭的 `java.interop` 授权约束并返回 Promise (Rhino 中是同步调用): `util.java.array` / `instanceof` / `instanceOf` / `toJsArray` / `objectToMap` / `mapToObject`, `s13n.point`, `s13n.throwable`, `util.morseCode.vibrate` 与 `util.morseCode(...).vibrate()`. 未授权时以 `NOT_GRANTED` 拒绝; 参数检查在调用宿主之前完成, 抛出的错误与 Rhino 相同.
- `util.dpToPx` / `spToPx` / `pxToDp` / `pxToSp` 与 `util.version.sdkInt` 读取插件在本次执行开始时写在客户端旁边的 `device-info.json` (DisplayMetrics 的 `density` / `densityDpi` / `scaledDensity` 与 SDK 级别), 按宿主 DisplayUtils 的方式换算; 执行期间改动显示大小或字体缩放不会刷新. sp 按 `scaledDensity` 线性换算, Android 14 起系统字体放大时与宿主的非线性曲线不同 (api-coverage Q60). 单独导入 `host-client.mjs` 而旁边没有该文件时 (例如桌面测试), 按 density 1, SDK 0 计算.
- `host.jsox.extend` / `extendAll` 与 Rhino 一样修改本执行 (主线程或各 Worker) 的内建对象 (api-coverage Q59).
- 与 Rhino 的已知差异同 Node 运行时 (api-coverage Q62): `util.inspect` / `format` 遇到 Java 句柄时按普通对象打印, `species.isJavaPackage` 恒为 false, `util.toRegularAndCall` / `toRegularAndApply` 抛出的错误 name 为 `ObsoletedRhinoFunctionException` (Rhino 包装为 `JavaException`).
- `host.global.axios` 是 Rhino 脚本所用的 axios 1.1.2 (`assets/modules/axios/axios.min.js` 的浏览器构建, MIT; 宿主 67ef4c1a5 起由 Bundled Libraries 插件提供, 之前随宿主发布), 内嵌在客户端里, 首次读取时创建 (api-coverage Q64). Rhino 给它的 XMLHttpRequest 走宿主 OkHttp, Bun 给它的 XMLHttpRequest 走 Bun 自身的 `fetch`, 所以请求在插件进程内发出, 不经宿主桥, 不需要授权, 也不占调用预算; 拦截器, `create`, `CancelToken` / `AbortSignal` 取消, `timeout`, `auth`, `params`, `responseType` (text / json / arraybuffer / blob) 与错误对象 (`AxiosError` 的 `ERR_BAD_REQUEST` / `ERR_NETWORK` / `ECONNABORTED`) 与 Rhino 相同. 与 Rhino 的差异: `axios.defaults` 是真实的默认配置 (Rhino 中被替换为只含 `transformRequest: []` 的对象), 不提供 Rhino 专有的 `axios.utils` (java.io.File 与线程池辅助); `axios.browser` 提供 Bun 的 `FormData` / `Blob` / `EventTarget` / `Event` 与上述 XMLHttpRequest; GET / HEAD / OPTIONS 的请求体被丢弃 (FormData 的字符串字段并入查询串, 同 Rhino), 字符串请求体保留 axios 设置的 Content-Type (Rhino 的 OkHttp 会把默认的 urlencoded 改成 text/plain), `arraybuffer` 返回 ArrayBuffer (Rhino 返回文本). 重复的 `set-cookie` 响应头与 Rhino 一样被 axios 1.1.2 合并为一个字符串.
- `host.global` 上的 `dayjs`, `pangu`, `cheerio`, `i18n` 是 Rhino 全局对象上的同名库 (api-coverage Q61 / Q64): 与宿主相同的构建 (dayjs, pangu.js 10.1.0, cheerio 单文件构建, banana-i18n) 随插件 APK 发布, 插件在执行开始时把它们复制到客户端旁边的 `libraries` 目录, 客户端在首次读取时编译. 宿主 67ef4c1a5 起 Rhino 脚本的这些库 (与 axios) 来自 Bundled Libraries 插件, 未安装时 Rhino 中读取它们会抛出引导错误; Bun 客户端内嵌它们, 不依赖该插件. i18n 读取 Bun 工作目录 (`process.cwd()`) 中的 `./i18n` (或 `./assets/i18n`) JSON. `host.global.open` 即 `host.files.open`, `host.global.Color` 即 Rhino 的 Color.
- 尚未提供: Rhino 专有的 `util.unwrapJavaObject`.

### colors / Color, zip, mime 与计时 recorder (api-coverage P4.2b)

`host.colors`, `host.global.Color`, `host.zip`, `host.mime` 与 `host.recorder` 是 Node.js 运行时共享 JS 核心的同名模块 (Node 提交 b92e7a99, 由 `tools/host-client/sync-js-tools.mjs` 同步), 首次读取时创建, 在客户端本地执行, 与 Rhino 的参数个数, 转换与错误相同 (Java 异常是以简单类名为 name 的 Error).

- colors / Color: 75 个模块函数, 四张颜色表 (android / css / web / material), parseColor / RGBToHSV / colorToHSV / HSVToColor. 需要 Java 对象的成员 (toColorStateList, setPaintColor 传入 Java Paint, extract, themeColor, 以及传入 float[] 句柄的 toHsv / toHsva / toHsl) 经 `host.java` 调用宿主, 需要 `java.interop` 授权并返回 Promise. colors.theme 尚无入口 (api-coverage Q80).
- zip: zip4j 经 Java 门面在宿主进程执行 (`java.interop`), 文件由宿主打开. 模块函数与 Zip 的成员都返回 Promise, 参数错误也以 reject 报告 (Rhino 同步抛出); 相对路径的解析见 host.files 的 open / toFile. 单次 zip4j 调用最长 120 秒: Bun 的宿主调用上限是 120000 毫秒, 客户端把更长的 Java 调用超时 (Node 运行时对 zip4j 不设上限) 按 120000 毫秒计.
- mime: `mime(mimeString)` 与 getMediaType / parseMediaType / fromFile / fromFileOr / fromFileOrWildcard / getType / getSubtype; fromFile 按扩展名查 Android MimeTypeMap 的表 (按 `util.version.sdkInt` 选择 Android 10 - 14 或 15 起的表), 不读取文件.
- recorder: 计时的 recorder(key?, ts?) 与 save / load / isLessThan / isGreaterThan / has / remove / clear 同步执行, 记录按客户端保存. Bun 不提供 Node.js 的音频录制成员 getStatus / start / stop.
- 尚未提供: files.batchRename (api-coverage Q82), gallery (Q81).

工作线程用 `await import(process.env.AUTOJS6_HOST_CLIENT_MODULE)` 取得各自的客户端, 这些工具在 Worker 中的行为相同. 客户端只在宿主提供动态桥时出现 (至少开启一项 Bun 授权, 默认开启 8 项); 撤销全部授权后, 这些本地工具也随客户端一起不可用.
