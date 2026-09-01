Bun Runtime は AutoJs6 が [Bun](https://bun.sh/) を独立した JavaScript と TypeScript エンジンとして選択できる Android プラグインです. ホストは file descriptor で 1 つの source snapshot を送り, プラグインは固定された公式 Bun Android executable を専用 runtime process で起動します. stdout, stderr, 完了, timeout, cancel event は Binder で戻ります. これは実際の Bun 実行であり, Rhino や Node.js の alias ではありません.

この release は隔離された plugin runtime process で `bun run --no-install <source>` を使って公式 Bun 1.4.0 Android executable を起動します. 1 つの JS または TS source snapshot を受け取り, 不足 dependency を自動 install せず, stdout, stderr, 最終 status を AutoJs6 へ stream します.

### クイックスタート

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

期待する出力は `Bun 1.4.0` で始まり, 次の行に `android` と表示されます.

### Version 0.1 の制限

- 1 つの source snapshot のみ: multi-file project transfer と relative project import はこの release では未実装です.
- AutoJs6 globals なし: Rhino globals, Android automation API, host object は Bun 内に現れません.
- Java bridge なし: Bun は AutoJs6 process の Java class や object に直接 access できません.
- 完全な toolchain は保証しません: `bunx`, 端末上で生成した executable, runtime C compilation, 任意の native addon は support scope 外です.
- Security sandbox ではありません: Bun script は plugin app UID の trusted code として動作し, plugin に付与された permission を利用できます.

Compatibility, security, package selection, version 0.1 の全 limitation は[プロジェクト README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) を確認してください.
