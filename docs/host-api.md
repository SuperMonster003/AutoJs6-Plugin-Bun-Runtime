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
| `screen.metrics` | `host.coordinates` | 开启 | 实时屏幕坐标换算, 本执行的 Scale 基数 |
| `console.control` | `host.console` | 关闭 | 本执行控制台窗口, 外观及日志配置 |

这些组可以在 AutoJs6 插件中心的 Bun 设置页独立撤销. 拼音组还需要对应 Pinyin/Pinyin4j 插件安装并启用; 控制台显示还需要 Android 悬浮窗权限. 当前客户端没有无障碍、截图、OCR、UI 布局、Java、`rhino.run` 等能力, 也不是 Node Runtime 模块全集的别名.

所有客户端方法都返回 Promise, 应 `await` 成功或处理错误. 方法调用通过 `{method, args}` 发送, 成功值包含在 `{value: ...}` 中; `host.call` 可以直接发送能力请求, 仍受相同授权、白名单和参数规则约束, 不能借此打开任意 Node 宿主方法.

### 拼音

```js
console.log(await host.pinyin.simple("北京上海"));
console.log(await host.pinyin.convert("重庆", { style: "TONE", heteronym: true }));
console.log(await host.pinyin4j.of("北京上海", { separator: " ", tone: "WITHOUT_TONE" }));
console.log(await host.pinyin4j.readings("重庆"));
```

`pinyin` 提供 `convert`, `simple`, `compare`, `compact`, `fromCodePoint`, `fromPhrase`; `pinyin4j` 提供 `of`, `as`, `readings`. `compact` 与 `readings` 返回二维字符串数组. 字典外文字交给真实插件处理; 插件缺失或执行失败会返回错误, 不把原文当成成功转换.

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
