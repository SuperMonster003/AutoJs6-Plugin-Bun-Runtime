******

### リリース履歴

******

# v0.2.0

###### 2026/09/01

* `ヒント` 本バージョンは最低システム要件を Android 14 から Android 13 (API 33) に引き下げました. Android 9 から 12L (API 28 から 32) は引き続き未対応で, patch 版 Bun runtime が移植性検証を通過するまでお待ちください
* `修正` インストール済み runtime の ABI を ABI table の iteration 順ではなく locked payload の SHA-256 から識別し, prewarming で最小 JavaScript smoke test を実行して使用不能な runtime を user script 開始前に拒否
* `修正` Android が 4 KiB を超える page を使用する場合, pinned JavaScriptCore の 4 KiB page-size ceiling に原因を特定した既知の非互換な公式 x86_64 runtime を process 起動前に拒否し, 決定的な Bun abort を有界診断に置換
* `改善` 最低システム要件の引き下げ: 固定された公式 Bun 1.4.0 Android payload をそのまま使用し, サポート下限を Android 14 (API 34) から Android 13 (API 33) に緩和してより多くのデバイスをカバー
* `改善` 旧バージョンで動作しない根本原因を特定: Android 13 以降はシステムの seccomp が Bun の呼び出す raw `close_range` syscall を許可する一方, API 31 実機での失敗により API 28 から 32 は Bun 本体の修正が必要で, manifest の変更だけでは解決できないことが判明
* `改善` 将来の Android 9+ 対応への基盤づくり: 正確に再現可能な Bun ソース patch 方式 (6 個の patch) を確立し, ビルド入力を固定 (NDK とコンテナーを固定, 22 個の Android release アクティブ依存関係); patch 版 runtime は未ビルドで, 現行パッケージには含まれません
* `改善` パッケージ品質チェックの強化: すべての Debug および Release APK で 16 KB ZIP alignment, 正確な ABI 内容, 固定 Bun payload のサイズと SHA-256 を検証し, Android 13 テスト端末でインストール済み payload のバイトを照合
* `改善` サプライチェーンの強化: 19 個の Bun source archive と 17 個の toolchain ダウンロードの正確なバイトを固定し, 181 個の Cargo と 172 個の Bun registry integrity エントリーを棚卸しし, 上書きを拒否する materializer と `buildReady` ゲートで保護されたデュアル ABI ビルド preflight を追加
* `改善` コピーして実行できるサンプル集を拡充: ネットワーク fetch, プライベートワークスペースのファイル入出力, stdout/stderr ストリーミング, より実用的な TypeScript 型のコメント付きサンプルを追加し, 先頭行の `"bun";` ディレクティブと単一ソースおよびインストール禁止の境界を文書ゲートで検証
* `改善` PAGE_SIZE=16384 を強制した Android 16 (API 36) AVD で 16 KB execution を検証: `arm64-v8a` single-ABI APK は `libndk_translation` 経由で Binder instrumentation 全 5 件に成功しましたが, native `x86_64` payload は最小 script でも exit code 134 で abort するため, 一般的な 16 KB 対応は表明しません
* `依存関係` Release 版 R8 が共有 Parcelable contract class を保持するよう Kotlin Parcelize runtime を追加

# v0.1.0

###### 2026/09/01

* `ヒント` 初回リリース: 各実行は独立したスクリプトファイル 1 つを実行します. AutoJs6 の内蔵関数, Java bridge, 複数ファイルのプロジェクト, 相対パス import はまだ利用できません
* `機能` 独立した `bun` エンジンを追加: スクリプトの 1 行目に `"bun";` と書くだけで公式 Bun 1.4.0 Android executable により JavaScript と TypeScript を実行. 実際のコマンドは `bun run --no-install <source>` で, 依存関係の自動インストールは行いません
* `機能` 実行出力をリアルタイムで返送: stdout と stderr は有界の oneway Binder callback によりチャンク単位でストリーミングされ, 最終結果は状態と診断情報のみを報告し, 完全な出力ストリームは含みません
* `機能` 実行を制御可能に: スクリプトは隔離された `:bun_runtime` プラグインプロセスで実行され, 明示的なキャンセル, 60 秒のデフォルト timeout, runtime 情報の照会, prewarming に対応
* `機能` `arm64-v8a` と baseline `x86_64` の公式 64-bit Android payload, および単一 ABI と `universal` パッケージを提供
* `機能` 完全なプラグイン体験を提供: プラグイン検出, 権限で保護されたアクティベーション (Wake), 完全な PluginInfo metadata, 10 言語のユーザードキュメント
* `改善` バージョン管理された Binder contract を採用し, ParcelFileDescriptor でソースを転送. ソース上限 16 MiB, 合計出力上限 8 MiB
* `改善` Android の読み取り専用 native library ディレクトリーから Bun を起動し, 固定 release archive とパッケージ済み binary のサイズ, SHA-256, ELF 属性を検証
* `改善` パッケージされた 2 つの executable の PT_LOAD alignment がいずれも 16 KB 以上であることを検証しつつ, 実際の 16 KB Android 環境でのテストが未完了であることを正直に記載
* `改善` 検証済み JSON ソースから README, プラグインセンター説明, 内蔵 changelog を生成し, ビルド, Markdown, runtime artifact の CI チェックを追加
* `改善` 最低バージョンを暫定的に Android 14 (API 34) に設定: API 31 実機では Bun の `close_range` syscall が seccomp により `SIGSYS` で強制終了され, Sony 製 API 33 端末 1 台は予想外に通過したものの移植性の証明には不十分で, API 35 実機での JS と TS の Binder 往復テストは通過
