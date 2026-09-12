******

### リリース履歴

******

# v0.2.2

###### 2026/09/12

* `修正` 固定 WebKit を明示的な大ページ, JIT, アロケータ設定で再構築し Bun を再リンクして, 実験版ネイティブ x86_64 16 KiB の JavaScriptCore 起動中止を修正. 4 KiB と 16 KiB の AVD で全 Binder テストが各 2 回成功 (32/32). 公式バイナリと 4 KiB ガードは変更せず, Release 検証は別途必要
* `改善` API 36 x86_64 に独立した有界 JSC 負荷検証を追加: 4 KiB とエミュレートされた 16 KiB ユーザー空間ページで, オフラインの 7 モードが各 2 回成功 (28/28). LLInt/Baseline/DFG/FTL の実サンプル, GC, Wasm, 64 worker の正常終了を確認. 同一 APK で未変更の Binder スイートも成功 (32/32). カーネルの 4 KiB マッピングを別途記録し, 初期結果を保存して本検証用デバイスを後処理. ネイティブバイト列, 安定版の対応範囲, Release 条件は変更なし
* `改善` API 29 と 32 のネイティブ x86_64 / 4 KiB 検証を完了: 各環境 2 回で Binder 32/32 と未変更のアプリプローブ 100/100 が追加で成功し, API 28-32 の x86 Binder バージョン網羅を完了. 生レポート, ソース, クリーンアップの不一致を拒否するアーカイブ処理を追加; 過去の証拠を保持し, ARM64 API 32 と Release は未完了のまま, 今回起動した 2 台の AVD のみ終了
* `改善` 本番サービスと既存の全 8 項目 Binder テストを再利用する, 独立パッケージの任意 test-only プラグインを追加. 固定された 9 パッチ版 Bun で ARM64 16 KiB を含む 9 つのネイティブ環境が各 2 回成功 (144/144). APK/ソースの対応とクリーンアップ証拠を保存し, 安定版の対応範囲は拡大しない
* `改善` ランタイムのバイト列と既存の 24 項目を変更せず, 内部 lchmod/fchmodat2 用の固定オフライン CLI テストを追加: ARM64 16 KiB を含む 6 つのネイティブ環境で 25 項目が各 2 回成功 (300/300). 権限変更, 再リンク, no-follow, 無視される EIO, SIGSYS による到達確認と制限付きスレッド回収を検証. 初期のテスト実装失敗を保存し, テストパッケージを削除して本作業の AVD を終了. 完全な実験版 Binder と Release の検証は未完了
* `改善` 9 パッチの実験版 Bun を Samsung のネイティブ ARM64 / API 36 / 16 KiB で, 同一 APK と変更のない 24 項目のスイートを用いて検証: 2 回で 48/48, 48 件のパス検証に成功し, 12 件のルート外要求でテスト用センチネルを拒否. テストパッケージを削除し UID プロセス残留なし, AVD の起動や終了なし. 実験版の完全な Binder, Release, x86_64 16 KiB の検証は未完了
* `改善` 64 ビットのネイティブライブラリの 16 KB ページアラインメントをビルド時に検証, manifest 契約の検査と JSON レポートに対応
* `依存関係` オンラインの platform-versions プラグインをリポジトリ指定の 1.7.4 に合わせ, native-alignment は変更しない

# v0.2.1

###### 2026/09/10

* `ヒント` 未公開の開発スナップショット. 正式プラグインの要件は引き続き Android 13 (API 33) 以降
* `修正` 固定した MIT の FD 相対フォールバックで, openat2 が使えない環境でも実験版の静的ディレクトリ配信を維持: パス要素を固定し, ルート内リンクを解決, ルート外リンクとマジックリンクを拒否し, 探索/エラー/FD 所有を制限; 通常の Bun.file/node:fs アクセス, 公式ランタイムのバイト列, Android 13 の最低要件は変更なし
* `修正` 固定された MIT パッチで実験ランタイムの Linux spawn FD フォールバックを修正: 固定スタックバッファと生の syscall で実際の記述子を列挙し, 引き下げ後のソフト/ハード制限や旧上限 65536 を超える FD に対応, 分離が不完全なら exec 前に制御されたエラーを返す; vfork/exec, エラー, シンボル, 旧実装との比較回帰を追加し, 公式 Bun ペイロードと Android 13 の下限は変更しない
* `修正` 固定した MIT パッチで実験版 Bun の起動時 CLOEXEC フォールバックを修正: fd 番号に上限を設けず開いている記述子を列挙し, fd 0-3 を保持して, マーク処理を完了できなければ終了; ネイティブのエラー/境界テストを追加し, ビルド入力の検証と runtime の受け入れを分離. 公式 runtime と Android 13 の最低要件は変更なし
* `修正` 公式プラグインのタイムアウト, キャンセル, 出力上限時の後処理を, 固定された読み取り専用の監督プロセスで修正: 無視された SIGTERM を SIGKILL にエスカレートし, 直接の Bun 子プロセスの終了を待って残りの出力を回収; Bun 1.4.0 と Android 13 の最低要件は変更なし
* `修正` 共有 SupervisedProcess を元のソースからコンパイルし, 固定された監督プロセスを同梱して patched Bun 独立プローブの終了処理を修正; schema 2 のビルド記録でソース, ツールチェーン, 監督プロセスのバイト列を結び付け, 終了まで出力の読み取りを維持
* `改善` ABI ごとに同一バイトのクリーンビルド 2 回と, ネイティブ 4 KiB の 5 環境で変更のない 24 項目を各 2 回検証し 240/240 成功: 以前失敗したルート外アクセスの 60 断言はすべて拒否となり, 通常配信も動作. GCC/Clang と GCC ASan/UBSan が成功し, テストパッケージと起動した AVD を清掃. 過去の失敗は保持し, 新版のネイティブ ARM64 16 KiB, 完全な Binder, Release 検証は未完了
* `改善` 以前の失敗ベースライン (a260ef308): 実験用ランタイムを変更せず openat2 のディレクトリ制約を調べる 24 番目のプローブを追加: 4 KiB のネイティブ 5 環境で各 2 回 23/24. 元の 230 観測は成功するが, 新たな 10 件の失敗で相対/絶対/マジックリンク経由の設定ルート外テストデータ読み取りを 60 回記録. アサーションを緩和せず失敗を保存. クラッシュ, ハング, テスト UID の残存プロセスはなく, 起動した AVD は終了済み. ネイティブ修正は未実施
* `改善` fchmodat2 のソース監査を訂正: 内部 sys::lchmod は大文字の SYS_FCHMODAT2 を使用する一方, Android の node:fs の公開 lchmod エクスポート 2 つは全 10 回で存在しない. パッケージ実行ファイルのリンク処理にある内部フォールバックや依存関係のインストールは未実行. 過去の報告を保持し, 配布は引き続きブロック
* `改善` 実験用ランタイムのバイト列を変更せず syscall スイートを 23 項目に拡張: 4 KiB のネイティブ 5 環境で各 2 回成功 (230/230). raw TRAP→ENOSYS を 60 回, EIO 対照付きコピー/待機フォールバックを 16 回検証. カーネル/ポリシーに制限される API 28 の 4 件は分岐到達の証拠から明示的に除外し, 従来の全アサーションと履歴を保持, テストパッケージと起動した AVD を後処理. syscall/Binder の完全検証と新しいネイティブ 16 KiB 検証は未完了
* `改善` spawn 修正を 6 つのネイティブ環境で検証: 同じ 20 項目が arm64 API 28/31/33/35 と x86_64 API 33 (4 KiB), Samsung arm64 API 36 (16 KiB) で各 2 回成功し, 合計 240/240. 両 ABI は 2 回のクリーンビルドで再現し, 強制終了 36 ケースも成功. テストパッケージを削除し, この作業で起動した AVD を終了. 過去の失敗記録を保持し, 実験版 Binder 全体と Release の検証は引き続き未完了
* `改善` Samsung Remote Test Lab SM-A566B (API 36) でネイティブ ARM64 16 KiB 実行を検証: 公式 Bun と固定した supervisor を使う v0.2.1 開発版 arm64 専用 APK が Binder 全 8 テストに 2 回とも成功. プロセス再起動, インストール済みファイルのハッシュ, 強制終了 10 ケースを含む. ソース/APK/ログの対応を記録してテストパッケージを削除し, Release と x86_64 の検証は別に維持
* `改善` 以前の失敗ベースライン (c240d6c68): 同じネイティブ ARM64 16 KiB 端末で未変更の実験用 runtime を 2 回とも 19/20 と記録: ネイティブ close_range, 起動時のフラグ設定, ライフサイクルは成功するが, TRAP 強制と RLIMIT_NOFILE 低下時の既知の spawn fd 継承不具合は残る. 2 件の失敗を保持し, 完全な実験用 Binder や runtime の検証完了は表明しない
* `改善` 以前の失敗ベースライン (c240d6c68): RLIMIT_NOFILE を下げる対照テストを追加し, 実験用プローブを 20 項目に拡張: API 28/31/33/35 のネイティブ arm64 実機 4 台は各 2 回 18/20, API 33 ネイティブ x86_64 AVD は各 2 回 19/20, すべて 4 KiB ページ. 既存の 180 観測は引き続き成功; 新たな 18 件の失敗で, soft limit を 128 に下げると両 spawn API が fd 256 を子に継承することを確認. 失敗, 制限の復元と後始末を記録し, runtime のバイト変更や修正完了の主張は行わない
* `改善` x64 Windows 向けに ARM64 16 KiB テスト環境を説明: VMware や WSL 単独ではネイティブ ARM64 Android を提供できない. 全システムのソフトウェアエミュレーションを区別し, Samsung のリモート 16 KiB 実機と RDB/ADB を候補に提示. 実際の空き状況と権限の確認が必要で, 新たな実機検証済みとはしない
* `改善` 以前の 18 項目の結果: FD/SIGSYS プローブを 5 項目追加し, 起動修正を検証: API 28/31/33/35 のネイティブ arm64 実機 4 台と API 33 ネイティブ x86_64 AVD が各 2 回とも 18/18, 合計 180/180 に成功; 両 ABI は各 2 回のクリーンビルドでバイト単位で一致. 旧 17/18 失敗レポートを保持し, 公式 runtime と Android 13 の最低要件は変更なし. 完全な実験版 Binder とネイティブ 16 KB 実行は未検証
* `改善` corresponding-source manifest の schema 2 で監督プロセスのソース, 固定 NDK のビルド手順, ABI ごとのハッシュを結び付け, ソースアーカイブ内のファイルを厳密に検証; v0.2.0 の公開アセットは変更なし
* `改善` 再現可能な patched Bun 用に独立したテスト専用 APK ビルダーと端末明示型ランナーを追加. ソース/APK/runtime の厳密な検証, 一時テスト署名, サイズ制限付き機械可読レポートに対応
* `改善` API 28, 31, 33, 35 のネイティブ arm64 端末でアプリプロセスの全 13 項目が 2 回とも成功; SIGTERM を無視するタイムアウト, 出力上限, 準備完了後のキャンセル計 24 回で子プロセスと監督プロセスの終了および作業領域の削除を確認. 元の 10/12 失敗レポートは保持し, 実験版 Binder 全体の成功や Android 対応範囲の拡大は主張しない
* `改善` 公開済み v0.2.0 の APK/ソース資産検証と署名済み端末受け入れ結果を記録. 公開タグを書き換えず, Android/16 KB 互換性の範囲も拡大しない
* `依存関係` オンラインのビルドプラグイン autojs6-platform-versions を 1.7.3 から 1.7.4 に更新し, リポジトリのバージョン要件も同期

# v0.2.0

###### 2026/09/08

* `ヒント` 本バージョンは最低システム要件を Android 14 から Android 13 (API 33) に引き下げました. Android 9 から 12L (API 28 から 32) は引き続き未対応で, patch 版 Bun runtime が移植性検証を通過するまでお待ちください
* `修正` Release アセット検証を強化: WebKit アーカイブのサイズと SHA-256 をロック値と直接照合し, apksigner の出力形式の違いに対応
* `修正` インストール済み runtime の ABI を ABI table の iteration 順ではなく locked payload の SHA-256 から識別し, prewarming で最小 JavaScript smoke test を実行して使用不能な runtime を user script 開始前に拒否
* `修正` Android が 4 KiB を超える page を使用する場合, pinned JavaScriptCore の 4 KiB page-size ceiling に原因を特定した既知の非互換な公式 x86_64 runtime を process 起動前に拒否し, 決定的な Bun abort を有界診断に置換
* `改善` 最低システム要件の引き下げ: 固定された公式 Bun 1.4.0 Android payload をそのまま使用し, サポート下限を Android 14 (API 34) から Android 13 (API 33) に緩和してより多くのデバイスをカバー
* `改善` 旧バージョンで動作しない根本原因を特定: Android 13 以降はシステムの seccomp が Bun の呼び出す raw `close_range` syscall を許可する一方, API 31 実機での失敗により API 28 から 32 は Bun 本体の修正が必要で, manifest の変更だけでは解決できないことが判明
* `改善` 将来の Android 9+ 対応への基盤づくり: 正確に再現可能な Bun ソース patch 方式 (6 個の patch) を確立し, ビルド入力を固定 (NDK とコンテナーを固定, 22 個の Android release アクティブ依存関係); これは独立した experimental line を確立するもので, 現行パッケージの official runtime は変更しません
* `改善` パッケージ品質チェックの強化: すべての Debug および Release APK で 16 KB ZIP alignment, 正確な ABI 内容, 固定 Bun payload のサイズと SHA-256 を検証し, Android 13 テスト端末でインストール済み payload のバイトを照合
* `改善` サプライチェーンの強化: 19 個の Bun source archive と 17 個の toolchain ダウンロードの正確なバイトを固定し, 181 個の Cargo と 172 個の Bun registry integrity エントリーを棚卸しし, 上書きを拒否する materializer と `buildReady` ゲートで保護されたデュアル ABI ビルド preflight を追加
* `改善` コピーして実行できるサンプル集を拡充: ネットワーク fetch, プライベートワークスペースのファイル入出力, stdout/stderr ストリーミング, より実用的な TypeScript 型のコメント付きサンプルを追加し, 先頭行の `"bun";` ディレクティブと単一ソースおよびインストール禁止の境界を文書ゲートで検証
* `改善` PAGE_SIZE=16384 を強制した Android 16 (API 36) AVD で 16 KB execution を検証: `arm64-v8a` single-ABI APK は `libndk_translation` 経由で Binder instrumentation 全 5 件に成功しましたが, native `x86_64` payload は最小 script でも exit code 134 で abort するため, 一般的な 16 KB 対応は表明しません
* `改善` Android 9+ experimental build の Cargo supply chain を閉じる: crates.io archive 全 181 件 (26,354,160 bytes) を lock して実体化し, file checksum 付き directory source を生成; 固定 Cargo が空の `CARGO_HOME` で Bun workspace 全体を `--locked --offline` で読み込めることを確認しました. この結果は Cargo input のみを対象とし, 他の build input を単独で閉じるものではありません
* `改善` 同 supply chain の Bun registry 部分を閉じる: 172 件の lock reference を Linux x64 用の一意な npm archive 125 件 (31,498,870 bytes) に解決し, 固定 tarball だけから最小 cache を再構築; network 無効かつ cache 読み取り専用の固定 Ubuntu container で 3 回の frozen install をすべて通過しました. 信頼される postinstall を持つ依存は `esbuild@0.21.5` だけです
* `改善` patched runtime を配布せずに再現可能 build gate を完了: host の `.deb` archive 155 件 (422,223,096 bytes) を再現可能な OCI image として固定し, Cargo closure を一意な archive 206 件へ拡張; 2 つの 64-bit ABI を network 無効の clean 環境で各 2 回 build して byte-for-byte 一致を確認し, pure Node ELF audit も固定しました. API 28/31 の直接 shell probe は成功しましたが, APK と application process の gate は未完了です
* `改善` 検証可能な対応 source の Release assets を実装: source を APK から分離して同じ Release に置き, 正確な Bun/WebKit/JSC, native 19 件, Cargo 206 件, npm 125 件の source archive, patch, build/relink 手順, 公開 license notice を梱包; 大容量 asset は 1.9 GB で分割し, machine-readable manifest と SHA256SUMS で APK/runtime/source の bytes を結合し, GitHub SHA-256 がすべて一致した後だけ draft を公開します; これは自動技術検証の記録であり, 法的承認の主張ではありません
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
