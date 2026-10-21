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

仕組みはシンプルです. AutoJs6 がスクリプト内容をプラグインへ送り, プラグインは専用の独立プロセスで公式 Bun Android executable を起動してスクリプトを実行し, 出力と実行結果をリアルタイムで AutoJs6 コンソールへ返します. これは正真正銘の Bun であり, Rhino や Node.js の alias やエミュレーション層ではありません. Android 17 以降では, AutoJs6 プラグインセンターで有効にする前に, このプラグインに付近のデバイスへのアクセスを許可してください. プラグインの設定ページでもローカルネットワーク権限を管理できます. 未許可の場合は無効のままとなり, 自動起動は通知せずにスキップされます. この権限はプラグインに属し, AutoJs6 の権限とは独立しています.

******

### インストールと使用方法

******

1. 環境を準備: Android 13 (API 33) 以降の端末に AutoJs6 build 5278 (6.8.0) 以降をインストールします.
2. プラグインをインストール: [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases) から端末に合う APK をダウンロードしてインストールします. 多くのスマートフォンとタブレットは `arm64-v8a`, emulator や x86_64 端末は `x86_64`, 不明な場合は `universal` (少し大きいが両対応) を選びます.
3. プラグインを有効化: AutoJs6 の plugin center を開いて Bun Runtime を有効にします. インストール直後に停止中と表示される場合は, ホストに表示される `有効化` action を使用します.
4. スクリプトを実行: JavaScript または TypeScript ファイルの 1 行目に `"bun";` を単独で書き (引用符とセミコロンを含む), あとは通常どおり AutoJs6 から実行します.

> プロジェクトファイルにはワークスペースアーカイブを交渉するホストが必要です. 対応時は project.json/package.json 以下のスクリプトで相対インポートを使えます. それ以外は単一ソースのスナップショットのみ転送されます. 依存関係は自動インストールされません (--no-install).

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
- ホストクライアントで OpenCC 変換と一般的な画像 API を提供, ピクセル取得, エンコード, 変換, 色検索と実行ごとの画像解放に対応; ホスト画像ファイルへのアクセスは個別許可で初期状態では無効.
- Bun が個別許可による画面キャプチャ, Android の同意, タイムアウト/キャンセル時の解放と再申請に対応.
- Bun screenRecorder が H.264 MP4 録画, マイク/アプリ再生/ミックスの AAC 音声と録画中の画面取得に対応し, 個別の音声許可とキャンセル時の削除を提供.
- Bun のユーザー補助, アプリ操作, クリップボード API を Node.js の対応インターフェースに合わせ, 個別の許可とパッケージ化アプリに対応.
- Bun ファイルと永続ストレージ API. 個別のホストファイル権限と Node.js ストレージの共有に対応.
- Node.js Worker と Bun の database/sqlite API. パラメーター付きクエリ, トランザクション, 永続化に対応.
- Bun と Node.js Worker のセンサー取得と購読 API, キャンセルとリスナーの自動解放.
- Bun, Node.js と Worker のホスト Shell API, ストリーム入出力, Shizuku 許可とプロセス解放.

******

### 現在の制限

******

- プロジェクトファイルにはワークスペースアーカイブを交渉するホストが必要です. 対応時は project.json/package.json 以下のスクリプトで相対インポートを使えます. それ以外は単一ソースのスナップショットのみ転送されます. 依存関係は自動インストールされません (--no-install).
- Rhino のグローバルは注入されません. 文書化されたテキスト, 画像, 画面キャプチャ, UI/Compose, WebView, 自動化のホスト API は明示的な SDK から利用します. 未記載の API と任意の Java オブジェクトは対象外です.
- Java bridge なし: Bun スクリプトは AutoJs6 プロセスの Java class や object に直接 access できません.
- 完全な Bun toolchain は保証しません: `bunx`, 端末上での executable 生成, runtime C compilation, 任意の native addon は support 対象外です.
- Security sandbox ではありません: Bun スクリプトはプラグインプロセス内で trusted code として動作し, プラグインに付与された permission を利用できます. 信頼できるスクリプトだけを実行してください.

******

### FAQ

******

#### Bun スクリプトで `click()` や `toast()` などの AutoJs6 関数が使えないのはなぜですか?

`process.env.AUTOJS6_HOST_CLIENT_MODULE` をインポートし, `createHostClient()` を待機してください. ホスト build 5572 と Bun Runtime 0.3.0 は `host.app`, `host.accessibility`, `host.clipboard` を提供します. プラグインセンターで個別に許可し, ジェスチャーには `accessibility.gesture` も許可してください. パッケージ化プロジェクトでも同じ許可を宣言します. Android のユーザー補助とクリップボードのフォアグラウンド制限は引き続き適用されます. 詳細は [Host API](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/host-api.md). Bun ファイルと永続ストレージ API. 個別のホストファイル権限と Node.js ストレージの共有に対応. (`host.files`, `host.storage`, `host.storages`; `files.control`, `storage.control`.)

#### npm パッケージは使えますか?

端末上でのインストールはできません. プラグインは常に `--no-install` で実行し, dependency をダウンロードしません. サードパーティライブラリが必要な場合は, まず PC 上で `bun build` などを使ってスクリプトと pure-JS dependency を 1 ファイルにバンドルし, そのファイルを端末で実行してください. Native addon に依存するパッケージはこの方法では使えません.

#### プロジェクト内の他のファイルを `import` できますか?

プロジェクトファイルにはワークスペースアーカイブを交渉するホストが必要です. 対応時は project.json/package.json 以下のスクリプトで相対インポートを使えます. それ以外は単一ソースのスナップショットのみ転送されます. 依存関係は自動インストールされません (--no-install).

#### 最低要件が Android 13 なのはなぜですか?

Bun は Linux の `close_range` system call (syscall 436) を呼び出しますが, Android 12L 以前の app seccomp allowlist はこれを含まないため, Bun プロセスは `SIGSYS` で強制終了します (API 31 実機で再現済み). Android 13 からはこの呼び出しが許可され, API 33 と API 35 の実機テストは成功しています. より古いバージョンの対応には Bun へのパッチが必要で, 進捗は roadmap を参照してください.

#### スクリプトが timeout したり出力が多すぎるとどうなりますか?

1 回の実行は default で 60 seconds に制限され, timeout すると Bun プロセスは終了し, 結果に timeout として記録されます. stdout と stderr の合計出力が 8 MiB を超えると, 実行は silent な切り捨てではなく出力上限 error で終了します. どちらの場合もタスクを分割するか出力量を減らしてください.

#### 16 KB page-size 端末に対応していますか?

16 KB: ELF と APK の配置チェックは成功しています. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384) では, 公式 Bun を使う v0.2.1 開発版 arm64 専用 APK が変換なしで Binder 全 8 テストに 2 回とも成功しました. 以前の x86_64 AVD 上の ARM64 結果は変換経由の証拠のままです; ネイティブ x86_64 は最小スクリプトでも終了コード 134 で中止します. これは当該端末と開発版に限る証拠であり, 公開済み Release APK の検証や一般的な 16 KB 対応を意味しません.

#### どの APK をインストールすればよいですか?

多くのスマートフォンとタブレットは `arm64-v8a` を使います. Emulator や x86_64 端末は baseline `x86_64` を使ってください. 不明な場合は両方の ABI を含む `universal` をインストールします. 少し大きいですが最も確実な選択です.

#### インストールや実行の問題はどこで調べられますか?

[トラブルシューティングガイド (中国語)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md) に最小スクリプト, 有効化, Android/ABI/ページサイズ, タイムアウト, 出力制限, インポートの確認手順と問題報告に必要な情報をまとめています.

******

### 互換性

******

- エンジン: 公式 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- システム: Android 13 (API 33) 以降. `arm64-v8a` と baseline `x86_64` の公式 64-bit executable を提供します. Android 9 から 12L (API 28 から 32) は未対応で, 理由は上の FAQ を参照してください. API 33 と API 35 の実機テストは成功しています.
- ホスト: AutoJs6 build 5278 以降と Bun runtime contract version 1.
- 実行ごとの上限: source は 16 MiB まで, stdout と stderr の合計出力は 8 MiB まで, default timeout は 60 seconds です.
- パッケージ: single-ABI APK はサイズが小さく, 大きめの `universal` APK は対応する 2 つの ABI を含みます.
- テストの証拠: [自動生成の互換性マトリクス (中国語)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) に, 記録済みの各テストスイートの端末, API, ABI, ページサイズと結果を掲載しています. 公式版, 実験版, 翻訳実行, 失敗した実行はそれぞれの検証範囲を維持し, 公開済みのサポート範囲を拡大しません.

******

### 権限と整合性

******

- 個別に固定された読み取り専用の監督プロセスが, SIGTERM を無視するスクリプトも含めてタイムアウト, キャンセル, 出力上限を処理します. 対象は直接の Bun 子プロセスであり, セキュリティサンドボックスや任意の切り離された子孫プロセスの管理機構ではありません.
- Export された有効化 (Wake), info, runtime component は `org.autojs.permission.PLUGIN` で保護され, AutoJs6 側でも通常の plugin authorization check が行われます.
- スクリプト snapshot は実行ごとの private directory に置かれ, Bun executable は Android の read-only native library directory から起動されます. Writable storage へ copy してから実行することはありません.
- Repository lock は公式 release archive と APK に同梱する binary の両方を記録します. Size, SHA-256, ELF 属性に差異があれば CI が build 前に拒否します.
- Trusted Bun スクリプトが `fetch` などの network API を使えるよう, プラグインは Internet permission を宣言します. プラグインは sandbox ではないため, 信頼できるスクリプトだけを実行してください.

******

### 実行エラーと対処方法

******

メッセージはプラグインの Android 言語設定に従います. 低レベルの診断の詳細や Bun の出力は英語のままの場合があります.

- Bun Runtime が起動または有効化されていない場合は, AutoJs6 のプラグインセンターでプラグインを承認して有効化し, ホストに起動操作が表示されていれば実行してください.
- 公式プラグインには Android 13 (API 33) 以降が必要です. Android 9 から 12L では実行できません. マニフェストの要件を下げてもランタイムの互換性は得られません.
- `TIMEOUT`: Bun の実行がタイムアウトしました. タスクを短くするか, 許容範囲内で実行の制限時間を調整してください.
- `OUTPUT_LIMIT`: Bun の出力が設定されたバイト数の上限を超えました. stdout と stderr の出力を減らして, スクリプトを再実行してください.
- `RUNTIME_UNAVAILABLE`: Bun Runtime を利用できません. デバイスの互換性を確認し, ファイルが不足している場合はプラグインを再インストールしてください.

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

16 KB: ELF と APK の配置チェックは成功しています. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384) では, 公式 Bun を使う v0.2.1 開発版 arm64 専用 APK が変換なしで Binder 全 8 テストに 2 回とも成功しました. 以前の x86_64 AVD 上の ARM64 結果は変換経由の証拠のままです; ネイティブ x86_64 は最小スクリプトでも終了コード 134 で中止します. これは当該端末と開発版に限る証拠であり, 公開済み Release APK の検証や一般的な 16 KB 対応を意味しません.

******

### ロードマップ

******

Roadmap は 2 つの質問に答えます. いま何が使えるか, 次に何をするか. チェック済み項目は現在のバージョンの実際の動作を表します. 未チェック項目 (複数ファイルプロジェクト, AutoJs6 capability bridge, より広い Android バージョン対応, Bun upgrade など) は計画であり, 現在の対応を意味しません.

- [ROADMAP.md を表示](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### リリース履歴

******

#### v0.20.0

_2026/10/22_

- `機能` Node.js, Bun と Worker の AI テキスト生成, ストリーミング, モデル一覧と永続セッション, キャンセルと 3-Stone AI によるパッケージアプリごとの許可に対応

#### v0.19.0

_2026/10/21_

- `機能` Node.js, Bun と Worker の Flow within/scope による検索範囲の継承, コンパス移動と結果の射影, および press/swipe/gesture/gestures のオーバーロード

#### v0.18.0

_2026/10/21_

- `機能` Node.js, Bun と Worker の Flow 高度なクリック, スクロール, 入力, リスト収集と実際のイベント待機, 監視準備完了, スナップショット検証とキャンセルに対応
- `修正` Bun の画面イベント待機が他のホスト呼び出しを妨げ, Flow の非同期検証がタイムアウトする問題

##### その他のリリース履歴

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ja.md)

******

### Build と検証

******

Verification または Gradle packaging の前に Git LFS で 2 つの pinned runtime binary を materialize する必要があります. 標準 local check は以下のとおりです. JDK 17 以降, Node.js, Android SDK 36 が必要です.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

Plugin code は [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE) です. Bundled official Bun executable は MIT licensed Bun code, LGPL-2 で statically linked された JavaScriptCore と WebKit, および個別 license の third-party component を含みます. 該当 Release では公開 license/relinking notice と一致する対応 source assets を APK とは分離して同じ Release に置き, 自動技術検証済みの machine-readable manifest と SHA256SUMS を提供します. [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) と pinned Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) を確認してください.

******

### リンク

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 公式サイト: https://bun.sh/
- 固定 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 第三者通知: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
