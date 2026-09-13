本插件让 AutoJs6 使用官方 Bun 1.4.0 引擎运行 JavaScript 和 TypeScript: 在脚本第一行写上 `"bun";`, 文件就会交给隔离插件进程中的 Bun 执行 (实际命令为 `bun run --no-install <source>`), 输出和运行结果实时回传 AutoJs6. 每次只执行当前文件的一份快照, 不会自动安装 npm 依赖.

### 安装和使用

1. 准备环境: 在 Android 13 (API 33) 或更高版本系统上, 安装 AutoJs6 build 5278 (6.8.0) 或更高版本.
2. 安装插件: 从 [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) 下载并安装与设备匹配的 APK. 大多数手机和平板选择 `arm64-v8a`, 模拟器或 x86_64 设备选择 `x86_64`, 不确定时选择 `universal` (体积稍大, 两类设备均可用).
3. 启用插件: 打开 AutoJs6 的插件中心并启用 Bun Runtime. 如果新安装的插件显示为停止状态, 点击宿主提供的 `激活` 操作即可.
4. 运行脚本: 在 JavaScript 或 TypeScript 文件的第一行单独写上 `"bun";` (含引号和分号), 然后像平常一样在 AutoJs6 中运行这个文件.

### 快速开始

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

如果一切正常, 输出第一行为 `Bun 1.4.0`, 第二行为 `android`.

### 当前限制

- 只运行单个文件: 插件每次接收并执行一个源码快照, 不传输项目目录, 因此 `import './utils.js'` 这类相对路径导入无法解析. 单文件内部的 ESM 语法不受影响; 需要多个模块时, 可先在电脑上打包为单文件 (见常见问题).
- 没有 AutoJs6 内置函数: `click()`, `toast()` 等自动化 API 和 Rhino 全局对象在 Bun 脚本中不存在, Bun 脚本目前适合计算, 文本处理, 网络请求等不依赖宿主能力的任务.
- 没有 Java bridge: Bun 脚本无法直接访问 AutoJs6 进程中的 Java 类或对象.
- 不承诺完整的 Bun 工具链: `bunx`, 设备端生成可执行文件, 运行时 C 编译和任意 native addon 均不在支持范围内.
- 不是安全沙箱: Bun 脚本以受信任代码身份在插件进程中运行, 可以使用授予插件的权限, 请只运行你信任的脚本.

### 运行错误与排查

提示使用 Android 为插件设置的语言. 底层诊断详情和 Bun 输出可能仍为英文.

- 如果 Bun Runtime 未激活或未启用, 请在 AutoJs6 的插件中心授权并启用插件; 如果宿主显示激活操作, 请执行激活.
- 官方插件需要 Android 13 (API 33) 或更高版本. Android 9 至 12L 无法运行; 降低清单中的版本要求不会使运行时兼容.
- `TIMEOUT`: Bun 执行超时. 请缩短任务, 或在允许范围内调整执行超时时间.
- `OUTPUT_LIMIT`: Bun 输出超过设定的字节上限. 请减少 stdout 和 stderr 输出后重新运行脚本.
- `RUNTIME_UNAVAILABLE`: Bun Runtime 不可用. 请检查设备兼容性; 如插件文件不完整, 请重新安装插件.

关于兼容性, 权限, 安装包选择和全部当前限制, 请查看[项目 README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime).
