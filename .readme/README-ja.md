<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>独立した Android プロセスで Bun エンジンを使って JavaScript と TypeScript を実行します</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### 言語

******

現在の README.md は次の言語に対応しています:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- 日本語 [ja] # 現在
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### 概要

******

Bun Runtime は AutoJs6 が [Bun](https://bun.sh/) を独立した JavaScript と TypeScript エンジンとして選択できる Android プラグインです. ホストは file descriptor で 1 つの source snapshot を送り, プラグインは固定された公式 Bun Android executable を専用 runtime process で起動します. stdout, stderr, 完了, timeout, cancel event は Binder で戻ります. これは実際の Bun 実行であり, Rhino や Node.js の alias ではありません.

******

### 機能

******

- 独立エンジン: コードを別の AutoJs6 エンジンへ転送せず, 公式 Bun 1.4.0 Android executable を実行します.
- JavaScript と TypeScript: 固定 Android build で利用できる ESM syntax と Bun API を含む 1 つの JS または TS source snapshot を Bun が解析して実行します.
- 観測可能な実行: stdout と stderr をホストへ stream し, 最終結果には exit status, duration, timeout, cancel と上限付き diagnostic が含まれます.
- 管理された runtime payload: `arm64-v8a` と `x86_64` の binary は tag, commit, size, SHA-256, ELF machine, 最小 PT_LOAD alignment で固定されています.
- ローカライズ: plugin metadata, plugin center instruction, README, changelog を 1 つの検証済み source set から 10 言語で提供します.

******

### インストールと使用方法

******

1. Android 13 (API 33) 以降で AutoJs6 build 5278 (6.8.0) 以降を使用します.
2. 端末 ABI に一致する release APK をインストールします. 多くのスマートフォンとタブレットでは `arm64-v8a`, 対応 emulator または device では `x86_64`, 不明な場合は `universal` を選びます.
3. AutoJs6 plugin center を開いて Bun Runtime を有効にします. 新規インストール後も停止中の場合はホストに表示される `有効化` action を使用します.
4. JavaScript または TypeScript file の先頭に独立 directive `"bun";` を置き, AutoJs6 から通常どおり実行します.

> Version 0.1 は request ごとに `bun run --no-install <source>` で 1 つの immutable source snapshot を実行し, 不足 dependency を自動 install しません. 既存の Rhino または Node.js project を Bun へ移行する前に制限を確認してください.

******

### クイックスタート

******

この file を実行してホストが Bun を選択し Android runtime が起動したことを確認します:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

期待する出力は `Bun 1.4.0` で始まり, 次の行に `android` と表示されます.

Bun が TypeScript を直接処理するため, ホスト側の TypeScript compilation は不要です:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### 互換性

******

- Runtime: 公式 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Platform: Android 13 (API 33) 以降. 公式 64-bit payload は `arm64-v8a` と baseline `x86_64` に対応します. API 31 real device では Bun syscall 436 `close_range` が app seccomp `SIGSYS` で失敗しました. AOSP Android 12 以前の app allowlist はこの syscall を含みませんが, Android 13 (T, API 33) は raw syscall を allowlist します. Android 14 は public bionic wrapper を追加しますが, Bun は raw syscall を呼び出すため API 34 libc symbol は不要です. API 33 と API 35 の real runtime test は成功しました. API 28 から 32 は patched Bun runtime が seccomp trap を処理し portable validation を通過するまで未対応です.
- Host contract: AutoJs6 build 5278 以降と Bun runtime contract version 1.
- Request limit: source は 16 MiB まで, stdout と stderr の combined streaming budget は 8 MiB まで, default timeout は 60 seconds です.
- Package: single-ABI APK は小さく, 大きい `universal` APK は対応する 2 つの ABI を含みます.

******

### Version 0.1 の制限

******

- 1 つの source snapshot のみ: multi-file project transfer と relative project import はこの release では未実装です.
- AutoJs6 globals なし: Rhino globals, Android automation API, host object は Bun 内に現れません.
- Java bridge なし: Bun は AutoJs6 process の Java class や object に直接 access できません.
- 完全な toolchain は保証しません: `bunx`, 端末上で生成した executable, runtime C compilation, 任意の native addon は support scope 外です.
- Security sandbox ではありません: Bun script は plugin app UID の trusted code として動作し, plugin に付与された permission を利用できます.

******

### 権限と整合性

******

- Export された Wake, info, runtime component は `org.autojs.permission.PLUGIN` で保護されます. AutoJs6 は通常の plugin authorization check も行います.
- Source snapshot は実行ごとの private directory に配置されます. Executable は Android の read-only native library directory から起動され, writable storage へ copy して実行しません.
- Repository lock は公式 release archive と packaged binary の両方を記録します. CI は build 前に size, SHA-256, ELF type, machine, alignment の drift を拒否します.
- Trusted Bun script が `fetch` などの network API を使用できるよう plugin は Internet permission を宣言します. Plugin は sandbox ではないため, 信頼できる script だけを実行してください.

******

### FAQ

******

#### Bun に AutoJs6 globals がないのはなぜですか?

Bun は独立 process と JavaScript engine であり, Rhino compatibility layer ではありません. 将来の host bridge は各 automation capability を明示的に公開する必要があり, version 0.1 は意図的に bridge を提供しません.

#### Script から別の local project file を import できますか?

Version 0.1 ではできません. Contract は 1 つの source snapshot だけを転送し project tree はまだ転送しないため, relative project import を解決できません. Single-file ESM syntax は利用できます.

#### 16 KB page-size device に対応していますか?

Packaged ELF executable の PT_LOAD alignment は両方とも 16 KB 以上です. 実際の 16 KB Android runtime test はまだ完了していないため, end-to-end support が検証済みとは表明しません.

#### どの APK をインストールすればよいですか?

多くの実機 Android device は `arm64-v8a` です. 対応 emulator または x86_64 device では baseline `x86_64` を使います. `universal` は両方を含み, ABI が不明な場合の安全な選択です.

******

### プラグインインターフェース

******

以下の stable identifier と limit は AutoJs6 host と plugin developer 向けです:

```text
application id: io.github.supermonster003.autojs6.plugin.bun.runtime
plugin id: bun-runtime
engine: bun
variant: bun-1.4.0-android
service action: org.autojs.plugin.bun.RUNTIME
service category: bun
aidl interface: org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
contract version: 1
aidl methods: getInfo(), getRuntimeInfo(), runScript(request, source, callback), cancelScript(executionId), prewarmRuntime()
minimum host build: 5278 (6.8.0)
source limit: 16 MiB
combined stdout/stderr streaming budget: 8 MiB
default timeout: 60 seconds
```

`BunRuntimeService` は action `org.autojs.plugin.bun.RUNTIME` と category `bun` で発見されます. `ParcelFileDescriptor` で source を, request で execution ID を受け取り, synchronous `runScript` call が active の間に `bun run --no-install <source>` を実行します. Stdout と stderr は oneway callback で bounded chunk としてのみ送信します. Returned terminal Bundle と `finished` event は status と diagnostic summary field だけを含み, complete output stream を含まないため, 各 Binder transaction は size limit 以下に保たれます. Service は explicit cancel と runtime prewarming に対応し, `:bun_runtime` で動作します.

16 KB status: packaged `arm64-v8a` と `x86_64` ELF の PT_LOAD segment は 16 KB alignment requirement を満たします. 実際の 16 KB Android device または emulator ではまだ実行していないため, ELF alignment だけが検証済みです.

******

### ロードマップ

******

Roadmap は現在の動作と, planned project snapshot, narrow AutoJs6 capability bridge, より広い Android validation, 将来の Bun upgrade を区別します. 未チェック項目は計画であり, 現在の support を示しません.

- [ROADMAP.md を表示](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### リリース履歴

******

#### v0.2.0

_2026/09/01_

- `ヒント` Android 13 (API 33) を正式な minimum target とし, API 28 から 32 は patched Bun runtime が portable validation を通過するまで未対応
- `改善` 固定済みの公式 Bun 1.4.0 Android payload を維持したまま, 対応する Android の下限を Android 14 (API 34) から Android 13 (API 33) に変更
- `改善` AOSP T seccomp 境界を明文化: Android 13 は Bun の raw `close_range` syscall を allowlist し, API 31 の失敗から API 28 から 32 には manifest-only change ではなく Bun compatibility patch が必要と確認

#### v0.1.0

_2026/09/01_

- `ヒント` 最初の release は 1 つの source snapshot を実行し, AutoJs6 globals, Java bridge, multi-file project, relative project import は提供しません
- `機能` 公式 Bun 1.4.0 Android executable を独立した `bun` engine として JavaScript と TypeScript を実行し, `"bun";` directive と `bun run --no-install <source>` で選択して dependency の自動 install を回避
- `機能` Stdout と stderr を bounded oneway Binder callback chunk としてのみ stream し, terminal result は complete output stream を含まず status と diagnostic だけを報告
- `機能` 隔離された `:bun_runtime` plugin process で explicit cancellation, default 60 秒 timeout, runtime information, prewarming に対応
- `機能` `arm64-v8a` と baseline `x86_64` の公式 64-bit Android payload, single-ABI package, `universal` package を提供
- `機能` Plugin discovery, 保護された Wake activation, 完全な PluginInfo metadata, 10 言語の user documentation を提供
- `改善` Versioned Binder contract と ParcelFileDescriptor source transport を使用し, source limit 16 MiB, combined output limit 8 MiB を設定
- `改善` Android read-only native library directory から Bun を起動し, 固定 release archive と packaged binary の size, SHA-256, ELF type, machine, alignment を検証
- `改善` 両 packaged executable の PT_LOAD alignment が 16 KB 以上であることを検証し, 実際の 16 KB Android runtime test が未完了であることを明記
- `改善` Validated JSON source から README, plugin-center instruction, built-in changelog asset を生成し, build, Markdown, runtime artifact の CI check を追加
- `改善` API 31 real device で Bun syscall 436 `close_range` が app seccomp `SIGSYS` となったため Android 14 (API 34) を必須化. Sony API 33 device 1 台は予想外に成功したものの portable evidence ではなく, API 35 の JS と TS Binder round trip は成功し, lower version は upstream fallback 待ち

##### その他のリリース履歴

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ja.md)

******

### Build と検証

******

Verification または Gradle packaging の前に Git LFS で 2 つの pinned runtime binary を materialize する必要があります. 標準 local check は以下のとおりです. JDK 17 以降, Node.js, Android SDK 36 が必要です.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### ローカライズと文書生成

******

JSON と Markdown template を編集してから `py .python/generate_markdown.py` を実行します. 生成済み README, changelog, plugin-instruction file は直接編集しないでください. `--check` は file を書き込まずに language shape, version alignment, localized resource, orphan artifact, generated-file drift を検証します.

```text
.readme/common.json
.readme/lang_*.json
.readme/template_readme.md
.readme/template_plugin_instruction.md
.changelog/lang_*.json
.changelog/template_changelog.md
.python/generate_markdown.py
app/src/main/assets/doc/CHANGELOG-*.md
app/src/main/res/values*/strings.xml
app/src/main/res/raw*/plugin_instruction.md
```

******

### ライセンス

******

Plugin code は [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE) です. Bundled official Bun executable は MIT licensed Bun code, LGPL-2 で statically linked された JavaScriptCore と WebKit, および個別 license の third-party component を含みます. [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) と pinned Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) を確認してください.

******

### リンク

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 公式サイト: https://bun.sh/
- 固定 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三者通知: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
