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

`host.screenRecorder` 将已授权的屏幕录制为无声 H.264/MP4 视频. 需要同时启用 `screen.capture` 和 `screen.record` (均默认关闭), 并先完成 `host.images.requestScreenCapture()`. `screen.record` 允许宿主输出 MP4 文件, 不替代系统授权, 也不依赖图像文件的 `image.files` 开关.

| 方法 | 返回值 | 行为 |
| --- | --- | --- |
| `start(path, options?)` | `Promise<ScreenRecordingActive>` | 开始录制, 路径必须以 `.mp4` 结尾, 已存在的目标文件会被拒绝 |
| `getStatus()` | `Promise<ScreenRecordingStatus>` | `state` 为 idle, recording 或 failed; 活动状态包含 id, path, width, height, frameRate, bitRate, elapsedMs 和 error |
| `stop()` | `Promise<ScreenRecordingResult \| null>` | 正常收尾并输出文件; 当前未录制时返回 null |
| `cancel()` | `Promise<boolean>` | 丢弃未完成视频并恢复截图; 当前未录制时返回 false |

`options.width` 和 `options.height` 必须同时指定, 为 2..8192 内的偶数; 省略时使用截图会话尺寸. `frameRate` 为 1..120 的整数, 默认 30; `bitRate` 为正整数, 单位 bit/s, 默认 8000000. 尺寸, 帧率和码率还必须受到当前 Android H.264 编码器支持. 不支持的配置拒绝 Promise, 不自动降级. 本接口不录制麦克风或系统音频, 不接受 audio 选项.

输出路径属于宿主, 相对路径按脚本工作目录解析, 仍受 Android 文件访问规则限制. 录制先写临时文件, `stop()` 成功后才生成目标文件. 结果包含 `id`, `path`, `size` (字节), `durationMs`, `width`, `height`, `mimeType: 'video/mp4'`, `videoCodec: 'h264'` 和 `audio: false`. 没有编码出有效视频帧时停止会失败, 不生成一个冒充成功的空视频.

每次执行只允许一个活动录制. 录制期间 `captureScreen()` 会拒绝, 停止或取消录制后恢复截图, 仍可复用同一授权开始下一段录像. 视频输出尺寸在一段录像内保持固定, 横竖屏变化由 Android 等比缩放居中显示, 可能出现留边. 需要交换宽高时应停止当前录像后以新尺寸开始下一段. `stopScreenCapture()`, 执行结束/取消和系统撤销授权会丢弃未完成文件, 因此保留视频需要显式等待 `stop()` 完成.

```js
"bun";
let { createHostClient } = await import(process.env.AUTOJS6_HOST_CLIENT_MODULE);
let host = await createHostClient();
await host.images.requestScreenCapture();
try {
    await host.screenRecorder.start('/sdcard/Movies/autojs6-demo.mp4', {
        width: 720, height: 1280, frameRate: 30, bitRate: 4000000,
    });
    await Bun.sleep(3000);
    let video = await host.screenRecorder.stop();
    console.log(video.path, video.durationMs, video.size);
} finally {
    await host.screenRecorder.cancel();
    await host.images.stopScreenCapture();
}
```

目标文件名应保持唯一. 较长录制须同时配置足够的 `bun.timeoutMillis`; 编码期间不占用一条长时间宿主调用, 开始和停止仍受普通调用超时约束.

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
