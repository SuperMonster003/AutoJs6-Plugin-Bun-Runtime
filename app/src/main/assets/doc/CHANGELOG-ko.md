******

### 릴리스 기록

******

# v0.1.0

###### 2026/09/01

* `힌트` 첫 release는 하나의 source snapshot을 실행하며 AutoJs6 globals, Java bridge, multi-file project 또는 relative project import를 제공하지 않습니다
* `기능` 공식 Bun 1.4.0 Android executable을 독립 `bun` engine으로 사용해 JavaScript와 TypeScript를 실행하고 `"bun";` directive와 `bun run --no-install <source>`로 dependency 자동 install 방지
* `기능` Stdout과 stderr를 bounded oneway Binder callback chunk로만 stream하고 terminal result는 complete output stream 없이 status 및 diagnostic만 보고
* `기능` 격리된 `:bun_runtime` plugin process에서 explicit cancellation, default 60초 timeout, runtime information 및 prewarming 지원
* `기능` `arm64-v8a` 및 baseline `x86_64` 공식 64-bit Android payload와 single-ABI 및 `universal` package 제공
* `기능` Plugin discovery, 보호된 Wake activation, 완전한 PluginInfo metadata 및 10개 언어 user documentation 제공
* `개선` Versioned Binder contract와 ParcelFileDescriptor source transport를 사용하고 source limit 16 MiB 및 combined output limit 8 MiB 적용
* `개선` Android read-only native library directory에서 Bun을 시작하고 고정 release archive와 packaged binary의 size, SHA-256, ELF type, machine 및 alignment 검증
* `개선` 두 packaged executable의 PT_LOAD alignment가 최소 16 KB임을 검증하고 실제 16 KB Android runtime test가 완료되지 않았음을 명시
* `개선` Validated JSON source에서 README, plugin-center instruction 및 built-in changelog asset을 생성하고 build, Markdown 및 runtime artifact CI check 추가
* `개선` API 31 real device에서 Bun syscall 436 `close_range`가 app seccomp `SIGSYS`로 종료되어 Android 14 (API 34)를 요구. Sony API 33 device 한 대는 예상과 달리 통과했지만 portable evidence가 아니며 API 35의 JS 및 TS Binder round trip은 통과했고 lower version은 upstream fallback 대기
