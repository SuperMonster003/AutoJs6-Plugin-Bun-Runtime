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

Bun は独立プロセスで動く, Rhino とはまったく別の JavaScript エンジンであるため, AutoJs6 の globals は Bun スクリプト内に現れません. Automation 機能を Bun から呼ぶには各機能を明示的に公開する host bridge が必要で, 現在のバージョンは意図的に automation 用のインターフェースを提供していません. 最初の読み取り専用機能 (ホスト情報スナップショット: 環境変数 `AUTOJS6_HOST_INFO_FILE` が指す, ホストとプラグインのバージョンなどを含む JSON ファイル) はプラグイン側で実装済みで, 第二部分 (実行時呼び出し: `ui.toast` と `device.info`, スクリプトは環境変数 `AUTOJS6_HOST_BRIDGE_SOCKET` が指す unix socket に対して `fetch(url, { unix })` で呼び出します) もプラグイン側で実装済みです. どちらも対応する AutoJs6 ホストがリリースされると使えるようになり, 各機能は AutoJs6 プラグインセンターのプラグイン設定ページで個別に無効化できます. 計画は roadmap を参照してください.

#### npm パッケージは使えますか?

端末上でのインストールはできません. プラグインは常に `--no-install` で実行し, dependency をダウンロードしません. サードパーティライブラリが必要な場合は, まず PC 上で `bun build` などを使ってスクリプトと pure-JS dependency を 1 ファイルにバンドルし, そのファイルを端末で実行してください. Native addon に依存するパッケージはこの方法では使えません.

#### プロジェクト内の他のファイルを `import` できますか?

現在公開されている AutoJs6 ではまだできません. プラグイン 0.2.2 以降, ランタイムはプロジェクトスナップショット (上限付き ZIP ワークスペースアーカイブ) を受け取り, 実行ごとの私有ワークスペースに展開するため, プロジェクト内の相対インポートは解決されます. ただしホストがプロジェクトディレクトリを梱包して能力を宣言する必要があり, そのホスト側の変更は準備済みですが未公開です. それまでは単一ファイルのスナップショットのみ転送され, 単一ファイル内の ESM 構文は通常どおり動作します.

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

#### v0.2.5

_2026/09/20_

- `ヒント` 正式プラグインの要件は引き続き Android 13 (API 33) 以降
- `修正` 共有ビルドプラグイン 1.8.3 により, AGP 9.1 での SDK XML v4 解析警告と, JVM 単体テストの組み立て時に APK ネイティブライブラリのアラインメント検証が誤って実行される問題
- `改善` 公開済み v0.2.4 の APK/対応ソース資産の検証と, 最終リリースバイト上での 4 環境の署名済み最終 APK 受け入れを保存: Sony API 33 arm64 と Xiaomi API 35 universal は公開済み v0.2.3 からのその場上書き更新, Redmi API 33 arm64 と x86_64 API 33 AVD は新規インストールで, force-stop 前後とも 11/11 グループ (第 11 グループはプロセス内 broker による動的能力ブリッジ); 今回 16 KiB デバイスは利用できず, ランタイムのペイロードは v0.2.2 から不変; 公開済みタグは書き換えず, Android/16 KB の互換範囲は拡大しない

#### v0.2.4

_2026/09/16_

- `機能` M7 第二部分: 実行時の動的呼び出し用機能ブリッジと最初の 2 つの動的機能 `ui.toast` / `device.info`. ホストが runScript リクエストに `hostCapabilityBridgeVersion = 1`, `hostCapabilityBroker` (IBinder), `hostCapabilities` (許可された機能 ID) を含めると, プラグインは実行ごとに私有キャッシュディレクトリへ unix socket を作成し (環境変数 `AUTOJS6_HOST_BRIDGE_SOCKET`), スクリプトは `fetch(url, { unix })` で `GET /v1/info` と `POST /v1/<機能 ID>` を送ります (JSON リクエスト <= 64 KiB, 結果 <= 256 KiB, 1 回の実行につき最大 1024 回, 同時 4 件, 1 回 10 s のタイムアウト). プラグインは oneway AIDL `IBunHostCapabilityBroker` でホストへ中継し, この実行に対するホスト UID からのコールバックだけを受け付けます. ブリッジレベルのエラーコード (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500) は JSON 応答にのみ現れ, runScript の終端エラーコード集合は不変で, 終端 Bundle に `hostBridgeDelivered` と `hostCalls` が加わります; 実行終了時に socket と未完了の呼び出しを閉じます. 機能キー `SUPPORTS_HOST_CAPABILITY_BRIDGE`, 共有契約 AAR は 22437 bytes に更新; ブリッジを提供しないホストの挙動は完全に不変
- `改善` Android 17 のローカルネットワーク認可をプラグインセンターの有効化操作と設定に統一し, ランチャーの認可ページを削除; 未許可時は無効のまま自動起動を通知せずにスキップ
- `改善` 公開済み v0.2.3 の APK/ソース資産検証と最終公開バイトでの 5 環境の署名済み最終 APK 受け入れ結果を記録: Sony API 33 arm64 と Xiaomi API 35 universal は公開済み v0.2.2 からの上書き更新, Redmi API 33 arm64, x86_64 API 33 AVD と Samsung SM-A566B API 36 ネイティブ arm64 16 KiB 実機は新規インストールで, いずれも force-stop 前後で 10/10 グループ (第 10 グループはホスト情報スナップショット); 公開済みタグは書き換えず, Android/16 KB 互換範囲も拡大しない
- `改善` Android 17 (SDK 37) に対応し, プラグイン独立のローカルネットワーク権限設定と復旧案内を提供

#### v0.2.3

_2026/09/16_

- `機能` M7 最初のホスト機能: 読み取り専用のホスト情報スナップショット. ホストが runScript リクエストに `hostInfoVersion = 1` と `hostInfo` (パッケージ名, 任意の versionDate と languageTag) を載せると, プラグインはそのパッケージが Binder 呼び出し元 UID のものか確認し, PackageManager でホストのバージョンを自ら解決し, ホスト/プラグイン/今回の実行の事実を 16 KiB 以下の JSON として実行ディレクトリの `autojs6/host-info.json` (`project` の外, 実行ディレクトリと共に削除) に書き, 環境変数 `AUTOJS6_HOST_INFO_FILE` でスクリプトに知らせます; 終了 Bundle に `hostInfoDelivered` が加わります. 能力ビット `SUPPORTS_HOST_INFO`; 環境変数の接頭辞 `AUTOJS6_` はプラグイン予約で, ホストのリクエストが含むと INVALID_REQUEST で拒否し, 偽装したパッケージ名や未知のバージョンも Bun 起動前に拒否します. 共有契約 AAR は 14073 bytes に更新; スナップショットを提供しないホストの挙動は従来と同じです
- `改善` 公開済み v0.2.2 の APK/ソース資産検証と 4 環境での署名済み最終 APK 受け入れ結果を記録: Sony API 33 arm64 と Xiaomi API 35 universal は公開済み v0.2.0 からの上書き更新, Redmi API 33 arm64 と x86_64 API 33 AVD は新規インストールで, いずれも force-stop 前後に 9/9 グループ通過. 公開タグを書き換えず, Android/16 KB 互換性の範囲も拡大しない
- `改善` ホスト master (7c31269cc) からローカルビルドした AutoJs6 と公開済み v0.2.2 x86_64 プラグインで, API 33 AVD 上のホストからプラグインへの実プロジェクト往復を検証: 相対 import と JSON import を含む project.json プロジェクト, package.json の TypeScript プロジェクト, および単一ファイルとして引き続き失敗する素のファイル対照. ホスト自体の公開は未実施
- `改善` v0.2.2 のリリース証跡に, ネイティブ arm64 16 KiB ハードウェア上での署名済み最終 APK 受け入れを補足: 公開済み arm64-v8a APK を Samsung SM-A566B (API 36, Remote Test Lab) に新規インストールし, force-stop 前後で各 9/9 グループに合格, インストール後のバイトをリリース資産に紐付け, その後アンインストール. 記録は 5 環境をカバー
- `改善` 同じローカルビルドの AutoJs6 ホスト (master 7c31269cc) と公開済み v0.2.2 arm64-v8a プラグインで, ネイティブ ARM64 実機 2 台でホストからプラグインへの実プロジェクト往復を再実施: Samsung SM-A566B (API 36, 16 KiB ページ) と Redmi 22120RN86C (API 33) でそれぞれ project.json プロジェクトを 2 回, package.json の TypeScript プロジェクトを 1 回, 素のファイル対照を実行し, すべて期待どおりの結果. ホストの公開はユーザーの判断のまま
- `改善` 新しい 2 つのテスト (スナップショットは提供時のみ配布し検証する, ホストの globals は ReferenceError で明確に失敗する) を含む instrumentation スイートを Redmi 22120RN86C (API 33) と Samsung SM-A566B (API 36, 16 KiB ページ) で実行し各 OK (17 tests); さらにローカルビルドの AutoJs6 ホスト (master d9b4033bd + attachHostInfo) とローカルの 0.2.3 release プラグインで両デバイス上のホストからプラグインへのスナップショット往復を完了: 単一ファイルと project.json プロジェクトの両方が検証済みのホスト/プラグイン/実行の事実を読み取り, ホストの許可を取り消すとスクリプトは absent を受け取り, 復元すると再びスナップショットを受け取る. ホストはユーザーの元の APK に復元済み; 記録は docs/compatibility/2026-09-16-m7-host-info-snapshot

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
