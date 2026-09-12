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

16 KB: ELF と APK の配置チェックは成功しています. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384) では, 公式 Bun を使う v0.2.1 開発版 arm64 専用 APK が変換なしで Binder 全 8 テストに 2 回とも成功しました. 以前の x86_64 AVD 上の ARM64 結果は変換経由の証拠のままです; ネイティブ x86_64 は最小スクリプトでも終了コード 134 で中止します. これは当該端末と開発版に限る証拠であり, 公開済み Release APK の検証や一般的な 16 KB 対応を意味しません.

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

- 個別に固定された読み取り専用の監督プロセスが, SIGTERM を無視するスクリプトも含めてタイムアウト, キャンセル, 出力上限を処理します. 対象は直接の Bun 子プロセスであり, セキュリティサンドボックスや任意の切り離された子孫プロセスの管理機構ではありません.
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

16 KB: ELF と APK の配置チェックは成功しています. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384) では, 公式 Bun を使う v0.2.1 開発版 arm64 専用 APK が変換なしで Binder 全 8 テストに 2 回とも成功しました. 以前の x86_64 AVD 上の ARM64 結果は変換経由の証拠のままです; ネイティブ x86_64 は最小スクリプトでも終了コード 134 で中止します. これは当該端末と開発版に限る証拠であり, 公開済み Release APK の検証や一般的な 16 KB 対応を意味しません.

******

### ロードマップ

******

Roadmap は 2 つの質問に答えます. いま何が使えるか, 次に何をするか. チェック済み項目は現在のバージョンの実際の動作を表します. 未チェック項目 (複数ファイルプロジェクト, AutoJs6 capability bridge, より広い Android バージョン対応, Bun upgrade など) は計画であり, 現在の対応を意味しません.

- [ROADMAP.md を表示](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### リリース履歴

******

#### v0.2.2

_2026/09/12_

- `修正` 固定 WebKit を明示的な大ページ, JIT, アロケータ設定で再構築し Bun を再リンクして, 実験版ネイティブ x86_64 16 KiB の JavaScriptCore 起動中止を修正. 4 KiB と 16 KiB の AVD で全 Binder テストが各 2 回成功 (32/32). 公式バイナリと 4 KiB ガードは変更せず, Release 検証は別途必要
- `改善` SIGSYS をブロックした非同期 spawn の固定プローブを 2 件追加し, 元の 29 件の定義と native バイト列を維持. 4 つのネイティブ 4 KiB 環境で 248/248 が成功した一方, Sony API 28 では新しい両モードが各 2 回 exit 159 で失敗 (全体 58/62). 4 件の失敗を別途厳密に保存し, 互換性ゲートは未通過のまま維持. テストパッケージ, UID プロセス, 今回の AVD を削除または終了し, Binder, 16 KiB, Release の新たな受け入れとはしない
- `改善` Samsung SM-A566B / API 36 で FD ハード上限の 4 モードをネイティブ ARM64 16 KiB 上で検証完了. 同一 APK と変更のない 29 項目を 2 回実行し 58/58, ハード上限 8 ケースでネイティブ close_range と強制 TRAP 後のフォールバックが成功. アンインストール後の UID プロセスがゼロであることを確認し, AVD は未操作. 7 環境の合計は 406/406. ネイティブ再ビルド, Binder 再実行, Release 検証は行わない
- `改善` Samsung Galaxy Z Fold4 SM-F936U の実 API 32 / Android 12L, ネイティブ ARM64, 4 KiB ページを検証. 既存 Binder スイートは 2 回で 16/16, 変更のない 29 項目のアプリプローブは 58/58, ハード上限 8 ケースを含めすべて成功. APK, ソース, 生の証拠を正確に紐付け, テスト用 3 パッケージを削除し UID プロセスがゼロであることを確認. AVD は操作せず, ネイティブのバイト列は不変. 新しいハード上限ケースのネイティブ ARM64 16 KiB, 拡張マトリクスと Release 検証は未完了
- `改善` 既存 25 項目とランタイムのバイト列を維持し, Android の FD ハード上限用の固定プローブを 4 項目追加. 5 つのネイティブ 4 KiB 環境で各 2 回 29/29 (計 290/290), ハード上限検証 40 件が成功. ソフト/ハード上限を 128 に下げた後の起動時 CLOEXEC と両 spawn API を検証し, アプリと supervisor の上限は維持. 生の証拠を紐付け, テストパッケージをアンインストールして今回の AVD を終了. FD 70000, 新項目のネイティブ 16 KiB と Release 検証は未完了
- `改善` API 36 x86_64 に独立した有界 JSC 負荷検証を追加: 4 KiB とエミュレートされた 16 KiB ユーザー空間ページで, オフラインの 7 モードが各 2 回成功 (28/28). LLInt/Baseline/DFG/FTL の実サンプル, GC, Wasm, 64 worker の正常終了を確認. 同一 APK で未変更の Binder スイートも成功 (32/32). カーネルの 4 KiB マッピングを別途記録し, 初期結果を保存して本検証用デバイスを後処理. ネイティブバイト列, 安定版の対応範囲, Release 条件は変更なし
- `改善` API 29 と 32 のネイティブ x86_64 / 4 KiB 検証を完了: 各環境 2 回で Binder 32/32 と未変更のアプリプローブ 100/100 が追加で成功し, API 28-32 の x86 Binder バージョン網羅を完了. 生レポート, ソース, クリーンアップの不一致を拒否するアーカイブ処理を追加; 過去の証拠を保持し, ARM64 API 32 と Release は未完了のまま, 今回起動した 2 台の AVD のみ終了
- `改善` 本番サービスと既存の全 8 項目 Binder テストを再利用する, 独立パッケージの任意 test-only プラグインを追加. 固定された 9 パッチ版 Bun で ARM64 16 KiB を含む 9 つのネイティブ環境が各 2 回成功 (144/144). APK/ソースの対応とクリーンアップ証拠を保存し, 安定版の対応範囲は拡大しない
- `改善` ランタイムのバイト列と既存の 24 項目を変更せず, 内部 lchmod/fchmodat2 用の固定オフライン CLI テストを追加: ARM64 16 KiB を含む 6 つのネイティブ環境で 25 項目が各 2 回成功 (300/300). 権限変更, 再リンク, no-follow, 無視される EIO, SIGSYS による到達確認と制限付きスレッド回収を検証. 初期のテスト実装失敗を保存し, テストパッケージを削除して本作業の AVD を終了. 完全な実験版 Binder と Release の検証は未完了
- `改善` 9 パッチの実験版 Bun を Samsung のネイティブ ARM64 / API 36 / 16 KiB で, 同一 APK と変更のない 24 項目のスイートを用いて検証: 2 回で 48/48, 48 件のパス検証に成功し, 12 件のルート外要求でテスト用センチネルを拒否. テストパッケージを削除し UID プロセス残留なし, AVD の起動や終了なし. 実験版の完全な Binder, Release, x86_64 16 KiB の検証は未完了
- `改善` 64 ビットのネイティブライブラリの 16 KB ページアラインメントをビルド時に検証, manifest 契約の検査と JSON レポートに対応
- `依存関係` オンラインの platform-versions プラグインをリポジトリ指定の 1.7.4 に合わせ, native-alignment は変更しない

#### v0.2.1

_2026/09/10_

- `ヒント` 未公開の開発スナップショット. 正式プラグインの要件は引き続き Android 13 (API 33) 以降
- `修正` 固定した MIT の FD 相対フォールバックで, openat2 が使えない環境でも実験版の静的ディレクトリ配信を維持: パス要素を固定し, ルート内リンクを解決, ルート外リンクとマジックリンクを拒否し, 探索/エラー/FD 所有を制限; 通常の Bun.file/node:fs アクセス, 公式ランタイムのバイト列, Android 13 の最低要件は変更なし
- `修正` 固定された MIT パッチで実験ランタイムの Linux spawn FD フォールバックを修正: 固定スタックバッファと生の syscall で実際の記述子を列挙し, 引き下げ後のソフト/ハード制限や旧上限 65536 を超える FD に対応, 分離が不完全なら exec 前に制御されたエラーを返す; vfork/exec, エラー, シンボル, 旧実装との比較回帰を追加し, 公式 Bun ペイロードと Android 13 の下限は変更しない
- `修正` 固定した MIT パッチで実験版 Bun の起動時 CLOEXEC フォールバックを修正: fd 番号に上限を設けず開いている記述子を列挙し, fd 0-3 を保持して, マーク処理を完了できなければ終了; ネイティブのエラー/境界テストを追加し, ビルド入力の検証と runtime の受け入れを分離. 公式 runtime と Android 13 の最低要件は変更なし
- `修正` 公式プラグインのタイムアウト, キャンセル, 出力上限時の後処理を, 固定された読み取り専用の監督プロセスで修正: 無視された SIGTERM を SIGKILL にエスカレートし, 直接の Bun 子プロセスの終了を待って残りの出力を回収; Bun 1.4.0 と Android 13 の最低要件は変更なし
- `修正` 共有 SupervisedProcess を元のソースからコンパイルし, 固定された監督プロセスを同梱して patched Bun 独立プローブの終了処理を修正; schema 2 のビルド記録でソース, ツールチェーン, 監督プロセスのバイト列を結び付け, 終了まで出力の読み取りを維持
- `改善` ABI ごとに同一バイトのクリーンビルド 2 回と, ネイティブ 4 KiB の 5 環境で変更のない 24 項目を各 2 回検証し 240/240 成功: 以前失敗したルート外アクセスの 60 断言はすべて拒否となり, 通常配信も動作. GCC/Clang と GCC ASan/UBSan が成功し, テストパッケージと起動した AVD を清掃. 過去の失敗は保持し, 新版のネイティブ ARM64 16 KiB, 完全な Binder, Release 検証は未完了
- `改善` 以前の失敗ベースライン (a260ef308): 実験用ランタイムを変更せず openat2 のディレクトリ制約を調べる 24 番目のプローブを追加: 4 KiB のネイティブ 5 環境で各 2 回 23/24. 元の 230 観測は成功するが, 新たな 10 件の失敗で相対/絶対/マジックリンク経由の設定ルート外テストデータ読み取りを 60 回記録. アサーションを緩和せず失敗を保存. クラッシュ, ハング, テスト UID の残存プロセスはなく, 起動した AVD は終了済み. ネイティブ修正は未実施
- `改善` fchmodat2 のソース監査を訂正: 内部 sys::lchmod は大文字の SYS_FCHMODAT2 を使用する一方, Android の node:fs の公開 lchmod エクスポート 2 つは全 10 回で存在しない. パッケージ実行ファイルのリンク処理にある内部フォールバックや依存関係のインストールは未実行. 過去の報告を保持し, 配布は引き続きブロック
- `改善` 実験用ランタイムのバイト列を変更せず syscall スイートを 23 項目に拡張: 4 KiB のネイティブ 5 環境で各 2 回成功 (230/230). raw TRAP→ENOSYS を 60 回, EIO 対照付きコピー/待機フォールバックを 16 回検証. カーネル/ポリシーに制限される API 28 の 4 件は分岐到達の証拠から明示的に除外し, 従来の全アサーションと履歴を保持, テストパッケージと起動した AVD を後処理. syscall/Binder の完全検証と新しいネイティブ 16 KiB 検証は未完了
- `改善` spawn 修正を 6 つのネイティブ環境で検証: 同じ 20 項目が arm64 API 28/31/33/35 と x86_64 API 33 (4 KiB), Samsung arm64 API 36 (16 KiB) で各 2 回成功し, 合計 240/240. 両 ABI は 2 回のクリーンビルドで再現し, 強制終了 36 ケースも成功. テストパッケージを削除し, この作業で起動した AVD を終了. 過去の失敗記録を保持し, 実験版 Binder 全体と Release の検証は引き続き未完了
- `改善` Samsung Remote Test Lab SM-A566B (API 36) でネイティブ ARM64 16 KiB 実行を検証: 公式 Bun と固定した supervisor を使う v0.2.1 開発版 arm64 専用 APK が Binder 全 8 テストに 2 回とも成功. プロセス再起動, インストール済みファイルのハッシュ, 強制終了 10 ケースを含む. ソース/APK/ログの対応を記録してテストパッケージを削除し, Release と x86_64 の検証は別に維持
- `改善` 以前の失敗ベースライン (c240d6c68): 同じネイティブ ARM64 16 KiB 端末で未変更の実験用 runtime を 2 回とも 19/20 と記録: ネイティブ close_range, 起動時のフラグ設定, ライフサイクルは成功するが, TRAP 強制と RLIMIT_NOFILE 低下時の既知の spawn fd 継承不具合は残る. 2 件の失敗を保持し, 完全な実験用 Binder や runtime の検証完了は表明しない
- `改善` 以前の失敗ベースライン (c240d6c68): RLIMIT_NOFILE を下げる対照テストを追加し, 実験用プローブを 20 項目に拡張: API 28/31/33/35 のネイティブ arm64 実機 4 台は各 2 回 18/20, API 33 ネイティブ x86_64 AVD は各 2 回 19/20, すべて 4 KiB ページ. 既存の 180 観測は引き続き成功; 新たな 18 件の失敗で, soft limit を 128 に下げると両 spawn API が fd 256 を子に継承することを確認. 失敗, 制限の復元と後始末を記録し, runtime のバイト変更や修正完了の主張は行わない
- `改善` x64 Windows 向けに ARM64 16 KiB テスト環境を説明: VMware や WSL 単独ではネイティブ ARM64 Android を提供できない. 全システムのソフトウェアエミュレーションを区別し, Samsung のリモート 16 KiB 実機と RDB/ADB を候補に提示. 実際の空き状況と権限の確認が必要で, 新たな実機検証済みとはしない
- `改善` 以前の 18 項目の結果: FD/SIGSYS プローブを 5 項目追加し, 起動修正を検証: API 28/31/33/35 のネイティブ arm64 実機 4 台と API 33 ネイティブ x86_64 AVD が各 2 回とも 18/18, 合計 180/180 に成功; 両 ABI は各 2 回のクリーンビルドでバイト単位で一致. 旧 17/18 失敗レポートを保持し, 公式 runtime と Android 13 の最低要件は変更なし. 完全な実験版 Binder とネイティブ 16 KB 実行は未検証
- `改善` corresponding-source manifest の schema 2 で監督プロセスのソース, 固定 NDK のビルド手順, ABI ごとのハッシュを結び付け, ソースアーカイブ内のファイルを厳密に検証; v0.2.0 の公開アセットは変更なし
- `改善` 再現可能な patched Bun 用に独立したテスト専用 APK ビルダーと端末明示型ランナーを追加. ソース/APK/runtime の厳密な検証, 一時テスト署名, サイズ制限付き機械可読レポートに対応
- `改善` API 28, 31, 33, 35 のネイティブ arm64 端末でアプリプロセスの全 13 項目が 2 回とも成功; SIGTERM を無視するタイムアウト, 出力上限, 準備完了後のキャンセル計 24 回で子プロセスと監督プロセスの終了および作業領域の削除を確認. 元の 10/12 失敗レポートは保持し, 実験版 Binder 全体の成功や Android 対応範囲の拡大は主張しない
- `改善` 公開済み v0.2.0 の APK/ソース資産検証と署名済み端末受け入れ結果を記録. 公開タグを書き換えず, Android/16 KB 互換性の範囲も拡大しない
- `依存関係` オンラインのビルドプラグイン autojs6-platform-versions を 1.7.3 から 1.7.4 に更新し, リポジトリのバージョン要件も同期

#### v0.2.0

_2026/09/08_

- `ヒント` 本バージョンは最低システム要件を Android 14 から Android 13 (API 33) に引き下げました. Android 9 から 12L (API 28 から 32) は引き続き未対応で, patch 版 Bun runtime が移植性検証を通過するまでお待ちください
- `修正` Release アセット検証を強化: WebKit アーカイブのサイズと SHA-256 をロック値と直接照合し, apksigner の出力形式の違いに対応
- `修正` インストール済み runtime の ABI を ABI table の iteration 順ではなく locked payload の SHA-256 から識別し, prewarming で最小 JavaScript smoke test を実行して使用不能な runtime を user script 開始前に拒否
- `修正` Android が 4 KiB を超える page を使用する場合, pinned JavaScriptCore の 4 KiB page-size ceiling に原因を特定した既知の非互換な公式 x86_64 runtime を process 起動前に拒否し, 決定的な Bun abort を有界診断に置換
- `改善` 最低システム要件の引き下げ: 固定された公式 Bun 1.4.0 Android payload をそのまま使用し, サポート下限を Android 14 (API 34) から Android 13 (API 33) に緩和してより多くのデバイスをカバー
- `改善` 旧バージョンで動作しない根本原因を特定: Android 13 以降はシステムの seccomp が Bun の呼び出す raw `close_range` syscall を許可する一方, API 31 実機での失敗により API 28 から 32 は Bun 本体の修正が必要で, manifest の変更だけでは解決できないことが判明
- `改善` 将来の Android 9+ 対応への基盤づくり: 正確に再現可能な Bun ソース patch 方式 (6 個の patch) を確立し, ビルド入力を固定 (NDK とコンテナーを固定, 22 個の Android release アクティブ依存関係); これは独立した experimental line を確立するもので, 現行パッケージの official runtime は変更しません
- `改善` パッケージ品質チェックの強化: すべての Debug および Release APK で 16 KB ZIP alignment, 正確な ABI 内容, 固定 Bun payload のサイズと SHA-256 を検証し, Android 13 テスト端末でインストール済み payload のバイトを照合
- `改善` サプライチェーンの強化: 19 個の Bun source archive と 17 個の toolchain ダウンロードの正確なバイトを固定し, 181 個の Cargo と 172 個の Bun registry integrity エントリーを棚卸しし, 上書きを拒否する materializer と `buildReady` ゲートで保護されたデュアル ABI ビルド preflight を追加
- `改善` コピーして実行できるサンプル集を拡充: ネットワーク fetch, プライベートワークスペースのファイル入出力, stdout/stderr ストリーミング, より実用的な TypeScript 型のコメント付きサンプルを追加し, 先頭行の `"bun";` ディレクティブと単一ソースおよびインストール禁止の境界を文書ゲートで検証
- `改善` PAGE_SIZE=16384 を強制した Android 16 (API 36) AVD で 16 KB execution を検証: `arm64-v8a` single-ABI APK は `libndk_translation` 経由で Binder instrumentation 全 5 件に成功しましたが, native `x86_64` payload は最小 script でも exit code 134 で abort するため, 一般的な 16 KB 対応は表明しません
- `改善` Android 9+ experimental build の Cargo supply chain を閉じる: crates.io archive 全 181 件 (26,354,160 bytes) を lock して実体化し, file checksum 付き directory source を生成; 固定 Cargo が空の `CARGO_HOME` で Bun workspace 全体を `--locked --offline` で読み込めることを確認しました. この結果は Cargo input のみを対象とし, 他の build input を単独で閉じるものではありません
- `改善` 同 supply chain の Bun registry 部分を閉じる: 172 件の lock reference を Linux x64 用の一意な npm archive 125 件 (31,498,870 bytes) に解決し, 固定 tarball だけから最小 cache を再構築; network 無効かつ cache 読み取り専用の固定 Ubuntu container で 3 回の frozen install をすべて通過しました. 信頼される postinstall を持つ依存は `esbuild@0.21.5` だけです
- `改善` patched runtime を配布せずに再現可能 build gate を完了: host の `.deb` archive 155 件 (422,223,096 bytes) を再現可能な OCI image として固定し, Cargo closure を一意な archive 206 件へ拡張; 2 つの 64-bit ABI を network 無効の clean 環境で各 2 回 build して byte-for-byte 一致を確認し, pure Node ELF audit も固定しました. API 28/31 の直接 shell probe は成功しましたが, APK と application process の gate は未完了です
- `改善` 検証可能な対応 source の Release assets を実装: source を APK から分離して同じ Release に置き, 正確な Bun/WebKit/JSC, native 19 件, Cargo 206 件, npm 125 件の source archive, patch, build/relink 手順, 公開 license notice を梱包; 大容量 asset は 1.9 GB で分割し, machine-readable manifest と SHA256SUMS で APK/runtime/source の bytes を結合し, GitHub SHA-256 がすべて一致した後だけ draft を公開します; これは自動技術検証の記録であり, 法的承認の主張ではありません
- `依存関係` Release 版 R8 が共有 Parcelable contract class を保持するよう Kotlin Parcelize runtime を追加

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
