Bun Runtime 是一个独立 Android 插件, 让 AutoJs6 可以选择 [Bun](https://bun.sh/) 作为单独的 JavaScript 和 TypeScript 引擎. 宿主通过文件描述符发送一个源码快照, 插件在自己的运行时进程中启动固定版本的官方 Bun Android 可执行文件, 并通过 Binder 返回标准输出, 标准错误, 完成状态, 超时和取消事件. 这是真实的 Bun 执行, 不是 Rhino 或 Node.js 的别名.

此版本在隔离的插件运行时进程中使用 `bun run --no-install <source>` 启动官方 Bun 1.4.0 Android executable. 它接收一个 JS 或 TS 源码快照, 绝不会自动安装缺失依赖, 并将 stdout, stderr 和最终状态流式返回 AutoJs6.

### 快速开始

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

预期输出以 `Bun 1.4.0` 开头, 下一行输出 `android`.

### 0.1 版限制

- 仅支持一个源码快照: 此版本未实现多文件项目传输和相对项目导入.
- 没有 AutoJs6 globals: Rhino 全局对象, Android 自动化 API 和宿主对象不会出现在 Bun 中.
- 没有 Java bridge: Bun 不能直接访问 AutoJs6 进程中的 Java 类或对象.
- 不承诺完整工具链: `bunx`, 设备端生成的可执行文件, runtime C compilation 和任意 native addon 不在支持范围内.
- 不是安全沙箱: Bun 脚本以受信任代码身份在插件 app UID 下运行, 并可使用授予插件的权限.

请查看[项目 README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime), 了解兼容性, 安全, 安装包选择和完整的 0.1 版限制.
