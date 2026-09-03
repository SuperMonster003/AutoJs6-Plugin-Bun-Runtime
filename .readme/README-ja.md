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

Bun Runtime は, AutoJs6 に新しい選択肢となるモダンなスクリプトエンジン [Bun](https://bun.sh/) を追加する独立プラグインです. インストールして有効化した後, JavaScript または TypeScript ファイルの 1 行目に `"bun";` と書くだけで, そのファイルは内蔵の Rhino エンジンではなく本物の Bun 1.4.0 エンジンで実行されます. モダンな JavaScript 構文, TypeScript, `fetch` などの Bun 内蔵 API を Android 端末上で直接利用できます.

仕組みはシンプルです. AutoJs6 がスクリプト内容をプラグインへ送り, プラグインは専用の独立プロセスで公式 Bun Android executable を起動してスクリプトを実行し, 出力と実行結果をリアルタイムで AutoJs6 コンソールへ返します. これは正真正銘の Bun であり, Rhino や Node.js の alias やエミュレーション層ではありません.

******

### インストールと使用方法

******

1. 環境を準備: Android 13 (API 33) 以降の端末に AutoJs6 build 5278 (6.8.0) 以降をインストールします.
2. プラグインをインストール: [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) から端末に合う APK をダウンロードしてインストールします. 多くのスマートフォンとタブレットは `arm64-v8a`, emulator や x86_64 端末は `x86_64`, 不明な場合は `universal` (少し大きいが両対応) を選びます.
3. プラグインを有効化: AutoJs6 の plugin center を開いて Bun Runtime を有効にします. インストール直後に停止中と表示される場合は, ホストに表示される `有効化` action を使用します.
4. スクリプトを実行: JavaScript または TypeScript ファイルの 1 行目に `"bun";` を単独で書き (引用符とセミコロンを含む), あとは通常どおり AutoJs6 から実行します.

> 各実行は現在のファイルの snapshot を 1 つだけ実行します (実際のコマンドは `bun run --no-install <source>`). プラグインは npm dependency を自動インストールせず, プロジェクト内の他のファイルも読み込みません. 既存の Rhino または Node.js プロジェクトを Bun へ移行する前に, 下の現在の制限をお読みください.

******

### クイックスタート

******

次の内容をスクリプトファイルとして保存して実行すると, Bun エンジンが実行を引き継いだことを確認できます:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

正常に動作していれば, 出力の 1 行目は `Bun 1.4.0`, 2 行目は `android` です.

TypeScript ファイルも事前コンパイルや追加設定なしでそのまま実行できます:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

ネットワークリクエスト, プライベートワークスペースでのファイル入出力, stdout/stderr, TypeScript の型を扱うコメント付きのコピー実行可能な例は [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples) にあります. すべての例は現在の単一ソースと `--no-install` の境界内で動作します.

******

### 機能

******

- 本物の Bun エンジン: スクリプトは公式 Bun 1.4.0 Android executable が直接実行します. トランスパイルは行わず, 他の AutoJs6 エンジンへ転送することもありません.
- TypeScript がすぐ使える: TS ファイルはコンパイルや追加設定なしでそのまま実行できます. モダンな JavaScript 構文, 単一ファイル内の ESM 構文, 固定 Android build で利用できる Bun API も使えます.
- 実行状況がわかりやすい: `console.log` などの出力はリアルタイムで AutoJs6 コンソールへ届き, 終了時には exit status, 所要時間, timeout や cancel の有無が報告されます.
- 安定して制御できる: 各スクリプトは隔離されたプラグインプロセスで動作し, いつでも cancel でき, timeout で自動終了します. スクリプトが異常でも AutoJs6 本体には影響しません.
- エンジンの出所を検証可能: 同梱の Bun executable は公式 release とバイト単位で一致し, tag, commit, size, SHA-256, ELF 属性が build と CI で強制検証されます.
- 完全なローカライズ: plugin metadata, plugin center の説明, README, changelog を 10 言語で提供し, すべて検証済みの 1 つの文案 source から生成します.

******

### 現在の制限

******

- 実行は 1 ファイルのみ: プラグインは source snapshot を 1 つだけ受け取って実行し, プロジェクトディレクトリは転送しないため, `import './utils.js'` のような相対 import は解決できません. 単一ファイル内の ESM 構文は影響を受けません. 複数モジュールが必要な場合は, まず PC 上で 1 ファイルにバンドルしてください (FAQ 参照).
- AutoJs6 内蔵関数なし: `click()` や `toast()` などの automation API と Rhino globals は Bun スクリプト内に存在しません. 現在の Bun スクリプトは計算, テキスト処理, ネットワークリクエストなど, ホスト機能に依存しないタスクに向いています.
- Java bridge なし: Bun スクリプトは AutoJs6 プロセスの Java class や object に直接 access できません.
- 完全な Bun toolchain は保証しません: `bunx`, 端末上での executable 生成, runtime C compilation, 任意の native addon は support 対象外です.
- Security sandbox ではありません: Bun スクリプトはプラグインプロセス内で trusted code として動作し, プラグインに付与された permission を利用できます. 信頼できるスクリプトだけを実行してください.

******

### FAQ

******

#### Bun スクリプトで `click()` や `toast()` などの AutoJs6 関数が使えないのはなぜですか?

Bun は独立プロセスで動く, Rhino とはまったく別の JavaScript エンジンであるため, AutoJs6 の globals は Bun スクリプト内に現れません. Automation 機能を Bun から呼ぶには各機能を明示的に公開する host bridge が必要で, 現在のバージョンは意図的にまだ提供していません. 計画は roadmap を参照してください.

#### npm パッケージは使えますか?

端末上でのインストールはできません. プラグインは常に `--no-install` で実行し, dependency をダウンロードしません. サードパーティライブラリが必要な場合は, まず PC 上で `bun build` などを使ってスクリプトと pure-JS dependency を 1 ファイルにバンドルし, そのファイルを端末で実行してください. Native addon に依存するパッケージはこの方法では使えません.

#### プロジェクト内の他のファイルを `import` できますか?

現在はできません. Plugin contract は source snapshot を 1 つだけ転送し, プロジェクトディレクトリは転送しないため, 相対 import は解決できません. 複数ファイルプロジェクトの対応は roadmap にあり, 単一ファイル内の ESM 構文は通常どおり使えます.

#### 最低要件が Android 13 なのはなぜですか?

Bun は Linux の `close_range` system call (syscall 436) を呼び出しますが, Android 12L 以前の app seccomp allowlist はこれを含まないため, Bun プロセスは `SIGSYS` で強制終了します (API 31 実機で再現済み). Android 13 からはこの呼び出しが許可され, API 33 と API 35 の実機テストは成功しています. より古いバージョンの対応には Bun へのパッチが必要で, 進捗は roadmap を参照してください.

#### スクリプトが timeout したり出力が多すぎるとどうなりますか?

1 回の実行は default で 60 seconds に制限され, timeout すると Bun プロセスは終了し, 結果に timeout として記録されます. stdout と stderr の合計出力が 8 MiB を超えると, 実行は silent な切り捨てではなく出力上限 error で終了します. どちらの場合もタスクを分割するか出力量を減らしてください.

#### 16 KB page-size 端末に対応していますか?

Packaged された 2 つの ELF executable とすべての APK entry は 16 KB alignment gate を通過しています. Android 16 (API 36) の 16 KB AVD では, `arm64-v8a` APK が `libndk_translation` 経由で Binder suite 全 5 件に成功しましたが, native `x86_64` payload は最小 script でも exit code 134 で abort し, native arm64 は未検証です. これは部分的な証拠であるため, この release は一般的な 16 KB 対応をまだ表明しません.

#### どの APK をインストールすればよいですか?

多くのスマートフォンとタブレットは `arm64-v8a` を使います. Emulator や x86_64 端末は baseline `x86_64` を使ってください. 不明な場合は両方の ABI を含む `universal` をインストールします. 少し大きいですが最も確実な選択です.

******

### 互換性

******

- エンジン: 公式 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- システム: Android 13 (API 33) 以降. `arm64-v8a` と baseline `x86_64` の公式 64-bit executable を提供します. Android 9 から 12L (API 28 から 32) は未対応で, 理由は上の FAQ を参照してください. API 33 と API 35 の実機テストは成功しています.
- ホスト: AutoJs6 build 5278 以降と Bun runtime contract version 1.
- 実行ごとの上限: source は 16 MiB まで, stdout と stderr の合計出力は 8 MiB まで, default timeout は 60 seconds です.
- パッケージ: single-ABI APK はサイズが小さく, 大きめの `universal` APK は対応する 2 つの ABI を含みます.

******

### 権限と整合性

******

- Export された有効化 (Wake), info, runtime component は `org.autojs.permission.PLUGIN` で保護され, AutoJs6 側でも通常の plugin authorization check が行われます.
- スクリプト snapshot は実行ごとの private directory に置かれ, Bun executable は Android の read-only native library directory から起動されます. Writable storage へ copy してから実行することはありません.
- Repository lock は公式 release archive と APK に同梱する binary の両方を記録します. Size, SHA-256, ELF 属性に差異があれば CI が build 前に拒否します.
- Trusted Bun スクリプトが `fetch` などの network API を使えるよう, プラグインは Internet permission を宣言します. プラグインは sandbox ではないため, 信頼できるスクリプトだけを実行してください.

******

### プラグインインターフェース

******

このセクションは AutoJs6 host と plugin developer 向けです. 一般ユーザーは読み飛ばして構いません. 安定した identifier と limit は次のとおりです:

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

16 KB status: 2 つの ELF payload と APK entry は alignment gate を通過しています. Android 16 (API 36) の 16 KB AVD では `arm64-v8a` が `libndk_translation` 経由で Binder test 全 5 件に成功しましたが, native `x86_64` は最小 script でも exit code 134 で abort し, native arm64 は未検証です. 一般的な 16 KB 対応は表明しません.

******

### ロードマップ

******

Roadmap は 2 つの質問に答えます. いま何が使えるか, 次に何をするか. チェック済み項目は現在のバージョンの実際の動作を表します. 未チェック項目 (複数ファイルプロジェクト, AutoJs6 capability bridge, より広い Android バージョン対応, Bun upgrade など) は計画であり, 現在の対応を意味しません.

- [ROADMAP.md を表示](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### リリース履歴

******

#### v0.2.0

_2026/09/01_

- `ヒント` 本バージョンは最低システム要件を Android 14 から Android 13 (API 33) に引き下げました. Android 9 から 12L (API 28 から 32) は引き続き未対応で, patch 版 Bun runtime が移植性検証を通過するまでお待ちください
- `修正` インストール済み runtime の ABI を ABI table の iteration 順ではなく locked payload の SHA-256 から識別し, prewarming で最小 JavaScript smoke test を実行して使用不能な runtime を user script 開始前に拒否
- `修正` Android が 4 KiB を超える page を使用する場合, pinned JavaScriptCore の 4 KiB page-size ceiling に原因を特定した既知の非互換な公式 x86_64 runtime を process 起動前に拒否し, 決定的な Bun abort を有界診断に置換
- `改善` 最低システム要件の引き下げ: 固定された公式 Bun 1.4.0 Android payload をそのまま使用し, サポート下限を Android 14 (API 34) から Android 13 (API 33) に緩和してより多くのデバイスをカバー
- `改善` 旧バージョンで動作しない根本原因を特定: Android 13 以降はシステムの seccomp が Bun の呼び出す raw `close_range` syscall を許可する一方, API 31 実機での失敗により API 28 から 32 は Bun 本体の修正が必要で, manifest の変更だけでは解決できないことが判明
- `改善` 将来の Android 9+ 対応への基盤づくり: 正確に再現可能な Bun ソース patch 方式 (6 個の patch) を確立し, ビルド入力を固定 (NDK とコンテナーを固定, 22 個の Android release アクティブ依存関係); patch 版 runtime は未ビルドで, 現行パッケージには含まれません
- `改善` パッケージ品質チェックの強化: すべての Debug および Release APK で 16 KB ZIP alignment, 正確な ABI 内容, 固定 Bun payload のサイズと SHA-256 を検証し, Android 13 テスト端末でインストール済み payload のバイトを照合
- `改善` サプライチェーンの強化: 19 個の Bun source archive と 17 個の toolchain ダウンロードの正確なバイトを固定し, 181 個の Cargo と 172 個の Bun registry integrity エントリーを棚卸しし, 上書きを拒否する materializer と `buildReady` ゲートで保護されたデュアル ABI ビルド preflight を追加
- `改善` コピーして実行できるサンプル集を拡充: ネットワーク fetch, プライベートワークスペースのファイル入出力, stdout/stderr ストリーミング, より実用的な TypeScript 型のコメント付きサンプルを追加し, 先頭行の `"bun";` ディレクティブと単一ソースおよびインストール禁止の境界を文書ゲートで検証
- `改善` PAGE_SIZE=16384 を強制した Android 16 (API 36) AVD で 16 KB execution を検証: `arm64-v8a` single-ABI APK は `libndk_translation` 経由で Binder instrumentation 全 5 件に成功しましたが, native `x86_64` payload は最小 script でも exit code 134 で abort するため, 一般的な 16 KB 対応は表明しません
- `改善` Android 9+ experimental build の Cargo supply chain を閉じる: crates.io archive 全 181 件 (26,354,160 bytes) を lock して実体化し, file checksum 付き directory source を生成; 固定 Cargo が空の `CARGO_HOME` で Bun workspace 全体を `--locked --offline` で読み込めることを確認しました. Bun registry と host package の closure は引き続き未完了です
- `依存関係` Release 版 R8 が共有 Parcelable contract class を保持するよう Kotlin Parcelize runtime を追加

#### v0.1.0

_2026/09/01_

- `ヒント` 初回リリース: 各実行は独立したスクリプトファイル 1 つを実行します. AutoJs6 の内蔵関数, Java bridge, 複数ファイルのプロジェクト, 相対パス import はまだ利用できません
- `機能` 独立した `bun` エンジンを追加: スクリプトの 1 行目に `"bun";` と書くだけで公式 Bun 1.4.0 Android executable により JavaScript と TypeScript を実行. 実際のコマンドは `bun run --no-install <source>` で, 依存関係の自動インストールは行いません
- `機能` 実行出力をリアルタイムで返送: stdout と stderr は有界の oneway Binder callback によりチャンク単位でストリーミングされ, 最終結果は状態と診断情報のみを報告し, 完全な出力ストリームは含みません
- `機能` 実行を制御可能に: スクリプトは隔離された `:bun_runtime` プラグインプロセスで実行され, 明示的なキャンセル, 60 秒のデフォルト timeout, runtime 情報の照会, prewarming に対応
- `機能` `arm64-v8a` と baseline `x86_64` の公式 64-bit Android payload, および単一 ABI と `universal` パッケージを提供
- `機能` 完全なプラグイン体験を提供: プラグイン検出, 権限で保護されたアクティベーション (Wake), 完全な PluginInfo metadata, 10 言語のユーザードキュメント
- `改善` バージョン管理された Binder contract を採用し, ParcelFileDescriptor でソースを転送. ソース上限 16 MiB, 合計出力上限 8 MiB
- `改善` Android の読み取り専用 native library ディレクトリーから Bun を起動し, 固定 release archive とパッケージ済み binary のサイズ, SHA-256, ELF 属性を検証
- `改善` パッケージされた 2 つの executable の PT_LOAD alignment がいずれも 16 KB 以上であることを検証しつつ, 実際の 16 KB Android 環境でのテストが未完了であることを正直に記載
- `改善` 検証済み JSON ソースから README, プラグインセンター説明, 内蔵 changelog を生成し, ビルド, Markdown, runtime artifact の CI チェックを追加
- `改善` 最低バージョンを暫定的に Android 14 (API 34) に設定: API 31 実機では Bun の `close_range` syscall が seccomp により `SIGSYS` で強制終了され, Sony 製 API 33 端末 1 台は予想外に通過したものの移植性の証明には不十分で, API 35 実機での JS と TS の Binder 往復テストは通過

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
