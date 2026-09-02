******

### 릴리스 기록

******

# v0.2.0

###### 2026/09/01

* `힌트` 이번 버전은 최소 시스템 요구 사항을 Android 14에서 Android 13 (API 33)으로 낮췄습니다. Android 9부터 12L (API 28부터 32)은 patch된 Bun runtime이 이식성 검증을 통과할 때까지 계속 지원되지 않습니다
* `개선` 최소 시스템 요구 사항 인하: 고정된 공식 Bun 1.4.0 Android payload를 그대로 사용하면서 지원 하한을 Android 14 (API 34)에서 Android 13 (API 33)으로 완화하여 더 많은 기기를 지원
* `개선` 구버전에서 동작하지 않는 근본 원인 규명: Android 13부터 시스템 seccomp가 Bun이 호출하는 raw `close_range` syscall을 허용하며, API 31 실제 기기 실패는 API 28부터 32까지는 Bun 자체 수정이 필요하고 manifest 변경만으로는 해결할 수 없음을 증명
* `개선` 향후 Android 9+ 지원을 위한 기반 마련: 정확히 재현 가능한 Bun 소스 patch 방식 (patch 6개)을 수립하고 빌드 입력을 고정 (NDK와 컨테이너 고정, Android release 활성 의존성 22개); patch된 runtime은 아직 빌드되지 않았으며 현재 패키지에 포함되지 않음
* `개선` 패키지 품질 검사 강화: 모든 Debug 및 Release APK에서 16 KB ZIP alignment, 정확한 ABI 내용, 고정 Bun payload의 크기와 SHA-256을 검증하고 Android 13 테스트 기기에서 설치된 payload 바이트를 대조
* `개선` 공급망 강화: Bun source archive 19개와 toolchain 다운로드 17개의 정확한 바이트를 고정하고, Cargo 181개와 Bun registry integrity 항목 172개를 목록화하며, 덮어쓰기를 거부하는 materializer와 `buildReady` 게이트로 보호되는 듀얼 ABI 빌드 preflight를 추가
* `의존성` Release R8이 공유 Parcelable contract class를 유지하도록 Kotlin Parcelize runtime 추가

# v0.1.0

###### 2026/09/01

* `힌트` 첫 릴리스: 각 실행은 독립 스크립트 파일 하나를 실행하며, AutoJs6 내장 함수, Java bridge, 다중 파일 프로젝트, 상대 경로 import는 아직 제공되지 않습니다
* `기능` 독립 `bun` 엔진 추가: 스크립트 첫 줄에 `"bun";`만 단독으로 쓰면 공식 Bun 1.4.0 Android executable로 JavaScript와 TypeScript를 실행. 실제 명령은 `bun run --no-install <source>`이며 의존성을 자동으로 설치하지 않음
* `기능` 실행 출력을 실시간으로 반환: stdout과 stderr는 유계 oneway Binder callback으로 청크 단위 스트리밍되고, 최종 결과는 상태와 진단 정보만 보고하며 전체 출력 스트림을 담지 않음
* `기능` 실행 제어 가능: 스크립트는 격리된 `:bun_runtime` 플러그인 프로세스에서 실행되며 명시적 취소, 60초 기본 timeout, runtime 정보 조회, prewarming을 지원
* `기능` `arm64-v8a`와 baseline `x86_64` 공식 64-bit Android payload 및 단일 ABI와 `universal` 패키지 제공
* `기능` 완전한 플러그인 경험 제공: 플러그인 검색, 권한으로 보호되는 활성화 (Wake), 완전한 PluginInfo metadata, 10개 언어 사용자 문서
* `개선` 버전 관리되는 Binder contract를 채택하여 ParcelFileDescriptor로 소스를 전송. 소스 상한 16 MiB, 합산 출력 상한 8 MiB
* `개선` Android의 읽기 전용 native library 디렉터리에서 Bun을 시작하고, 고정 release archive와 패키징된 binary의 크기, SHA-256, ELF 속성을 검증
* `개선` 패키징된 두 executable의 PT_LOAD alignment가 모두 16 KB 이상임을 검증하면서, 실제 16 KB Android 환경 테스트는 아직 완료되지 않았음을 명확히 기록
* `개선` 검증된 JSON 소스에서 README, plugin center 안내, 내장 changelog를 생성하고 빌드, Markdown, runtime artifact CI 검사를 추가
* `개선` 최소 버전을 잠정적으로 Android 14 (API 34)로 설정: API 31 실제 기기에서 Bun의 `close_range` syscall이 seccomp에 의해 `SIGSYS`로 종료되었고, Sony API 33 기기 한 대는 예상외로 통과했지만 이식성을 증명하기에 부족하며, API 35 실제 기기 JS 및 TS Binder 왕복 테스트는 통과
