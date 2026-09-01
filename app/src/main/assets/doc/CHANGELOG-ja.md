******

### リリース履歴

******

# v0.2.0

###### 2026/09/01

* `ヒント` Android 13 (API 33) を正式な minimum target とし, API 28 から 32 は patched Bun runtime が portable validation を通過するまで未対応
* `改善` 固定済みの公式 Bun 1.4.0 Android payload を維持したまま, 対応する Android の下限を Android 14 (API 34) から Android 13 (API 33) に変更
* `改善` AOSP T seccomp 境界を明文化: Android 13 は Bun の raw `close_range` syscall を allowlist し, API 31 の失敗から API 28 から 32 には manifest-only change ではなく Bun compatibility patch が必要と確認

# v0.1.0

###### 2026/09/01

* `ヒント` 最初の release は 1 つの source snapshot を実行し, AutoJs6 globals, Java bridge, multi-file project, relative project import は提供しません
* `機能` 公式 Bun 1.4.0 Android executable を独立した `bun` engine として JavaScript と TypeScript を実行し, `"bun";` directive と `bun run --no-install <source>` で選択して dependency の自動 install を回避
* `機能` Stdout と stderr を bounded oneway Binder callback chunk としてのみ stream し, terminal result は complete output stream を含まず status と diagnostic だけを報告
* `機能` 隔離された `:bun_runtime` plugin process で explicit cancellation, default 60 秒 timeout, runtime information, prewarming に対応
* `機能` `arm64-v8a` と baseline `x86_64` の公式 64-bit Android payload, single-ABI package, `universal` package を提供
* `機能` Plugin discovery, 保護された Wake activation, 完全な PluginInfo metadata, 10 言語の user documentation を提供
* `改善` Versioned Binder contract と ParcelFileDescriptor source transport を使用し, source limit 16 MiB, combined output limit 8 MiB を設定
* `改善` Android read-only native library directory から Bun を起動し, 固定 release archive と packaged binary の size, SHA-256, ELF type, machine, alignment を検証
* `改善` 両 packaged executable の PT_LOAD alignment が 16 KB 以上であることを検証し, 実際の 16 KB Android runtime test が未完了であることを明記
* `改善` Validated JSON source から README, plugin-center instruction, built-in changelog asset を生成し, build, Markdown, runtime artifact の CI check を追加
* `改善` API 31 real device で Bun syscall 436 `close_range` が app seccomp `SIGSYS` となったため Android 14 (API 34) を必須化. Sony API 33 device 1 台は予想外に成功したものの portable evidence ではなく, API 35 の JS と TS Binder round trip は成功し, lower version は upstream fallback 待ち
