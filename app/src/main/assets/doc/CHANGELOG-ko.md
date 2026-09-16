******

### 릴리스 기록

******

# v0.2.4

###### 2026/09/16

* `기능` M7 두 번째 부분: 런타임 동적 호출용 기능 브리지와 처음 두 개의 동적 기능 `ui.toast` / `device.info`. 호스트가 runScript 요청에 `hostCapabilityBridgeVersion = 1`, `hostCapabilityBroker` (IBinder), `hostCapabilities` (허용된 기능 ID)를 담으면 플러그인은 실행마다 비공개 캐시 디렉터리에 unix socket을 만들고 (환경 변수 `AUTOJS6_HOST_BRIDGE_SOCKET`), 스크립트는 `fetch(url, { unix })`로 `GET /v1/info`와 `POST /v1/<기능 ID>`를 보냅니다 (JSON 요청 <= 64 KiB, 결과 <= 256 KiB, 실행당 최대 1024회, 동시 4건, 호출당 10 s 시간 제한). 플러그인은 oneway AIDL `IBunHostCapabilityBroker`로 호스트에 중계하며 이 실행에 대한 호스트 UID의 콜백만 받아들입니다. 브리지 수준 오류 코드 (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500)는 JSON 응답에만 나타나고, runScript 종료 오류 코드 집합은 그대로이며 종료 Bundle에 `hostBridgeDelivered`와 `hostCalls`가 추가됩니다; 실행이 끝나면 socket과 진행 중인 호출을 닫습니다. 기능 키 `SUPPORTS_HOST_CAPABILITY_BRIDGE`, 공유 계약 AAR은 22437 bytes로 갱신; 브리지를 제공하지 않는 호스트의 동작은 완전히 동일
* `개선` Android 17 로컬 네트워크 권한 요청을 플러그인 센터의 활성화 흐름과 설정으로 통합하고 런처 권한 페이지 제거; 권한이 없으면 비활성 상태를 유지하고 자동 시작을 조용히 건너뜀
* `개선` 게시된 v0.2.3 APK/소스 자산 검증과 최종 게시 바이트에서 다섯 환경의 서명된 최종 APK 검증 근거 보관: Sony API 33 arm64 와 Xiaomi API 35 universal 은 게시된 v0.2.2 에서 덮어쓰기 업그레이드, Redmi API 33 arm64, x86_64 API 33 AVD 와 Samsung SM-A566B API 36 네이티브 arm64 16 KiB 기기는 새로 설치, 각각 force-stop 전후 10/10 그룹 통과 (열 번째 그룹은 호스트 정보 스냅샷); 게시된 태그는 다시 쓰지 않으며 Android/16 KB 호환 범위도 확장하지 않음
* `개선` Android 17 (SDK 37) 대응 및 플러그인별 로컬 네트워크 권한 설정과 복구 안내 제공

# v0.2.3

###### 2026/09/16

* `기능` M7 첫 번째 호스트 기능: 읽기 전용 호스트 정보 스냅샷. 호스트가 runScript 요청에 `hostInfoVersion = 1`과 `hostInfo` (패키지 이름, 선택적 versionDate와 languageTag)를 담아 보내면 플러그인은 그 패키지가 Binder 호출자 UID에 속하는지 확인하고, PackageManager로 호스트 버전을 직접 확인한 뒤, 호스트/플러그인/이번 실행의 사실을 16 KiB 이하의 JSON으로 실행 디렉터리의 `autojs6/host-info.json` (`project` 밖, 실행 디렉터리와 함께 삭제)에 쓰고 환경 변수 `AUTOJS6_HOST_INFO_FILE`로 스크립트에 알립니다; 종료 Bundle에 `hostInfoDelivered`가 추가됩니다. 기능 비트 `SUPPORTS_HOST_INFO`; 환경 변수 접두사 `AUTOJS6_`는 플러그인이 예약하며 호스트 요청에 포함되면 INVALID_REQUEST로 거부하고, 위장한 패키지 이름이나 알 수 없는 버전도 Bun 시작 전에 거부합니다. 공유 계약 AAR은 14073 bytes로 갱신; 스냅샷을 제공하지 않는 호스트의 동작은 그대로입니다
* `개선` 게시된 v0.2.2 APK/소스 자산 검증과 네 환경의 서명된 최종 APK 검증 근거 보관: Sony API 33 arm64 와 Xiaomi API 35 universal 은 게시된 v0.2.0 에서 덮어쓰기 업그레이드, Redmi API 33 arm64 와 x86_64 API 33 AVD 는 새로 설치하여 각각 force-stop 전후 9/9 그룹 통과. 게시된 태그를 다시 쓰거나 Android/16 KB 호환 범위를 확대하지 않음
* `개선` 호스트 master (7c31269cc) 에서 로컬 빌드한 AutoJs6 와 게시된 v0.2.2 x86_64 플러그인으로 API 33 AVD 에서 호스트-플러그인 실제 프로젝트 왕복 검증: 상대 import 와 JSON import 가 있는 project.json 프로젝트, package.json 의 TypeScript 프로젝트, 그리고 여전히 단일 파일로 실패하는 단독 파일 대조군. 호스트 자체 게시는 아직 진행되지 않음
* `개선` v0.2.2 릴리스 증거에 네이티브 arm64 16 KiB 하드웨어에서의 서명된 최종 APK 수락 검증을 보충: 게시된 arm64-v8a APK 를 Samsung SM-A566B (API 36, Remote Test Lab) 에 새로 설치하여 force-stop 전후 각 9/9 그룹 통과, 설치된 바이트를 릴리스 자산에 바인딩, 이후 제거. 기록은 이제 5개 환경을 포함
* `개선` 동일한 로컬 빌드 AutoJs6 호스트 (master 7c31269cc) 와 게시된 v0.2.2 arm64-v8a 플러그인으로 네이티브 ARM64 실기기 2대에서 호스트-플러그인 실제 프로젝트 왕복을 반복: Samsung SM-A566B (API 36, 16 KiB 페이지) 와 Redmi 22120RN86C (API 33) 에서 각각 project.json 프로젝트 2회, package.json 의 TypeScript 프로젝트 1회, 단독 파일 대조군을 실행하여 모두 예상대로 완료. 호스트 게시 여부는 여전히 사용자의 결정
* `개선` 두 개의 새 테스트 (스냅샷은 제공될 때만 전달되고 검증됨, 호스트 globals는 ReferenceError로 명확히 실패)를 포함한 instrumentation 스위트를 Redmi 22120RN86C (API 33)와 Samsung SM-A566B (API 36, 16 KiB 페이지)에서 실행해 각각 OK (17 tests); 로컬 빌드 AutoJs6 호스트 (master d9b4033bd + attachHostInfo)와 로컬 0.2.3 release 플러그인으로 두 기기 모두에서 호스트-플러그인 스냅샷 왕복을 완료: 단일 파일과 project.json 프로젝트 모두 검증된 호스트/플러그인/실행 사실을 읽고, 호스트 권한을 철회하면 스크립트가 absent를 받으며, 복원하면 다시 스냅샷을 받음. 호스트는 사용자의 원래 APK로 복원됨; 기록은 docs/compatibility/2026-09-16-m7-host-info-snapshot

# v0.2.2

###### 2026/09/15

* `기능` 워크스페이스 아카이브를 통한 다중 파일 프로젝트 실행 추가 (M6): 공유 계약에 workspaceArchiveVersion, workspaceEntryPoint, workspaceMaxEntries, workspaceMaxBytes 요청 키와 SUPPORTS_WORKSPACE_ARCHIVE 기능을 추가하고, runScript는 크기가 제한된 ZIP 스냅샷을 실행별 비공개 워크스페이스에 원자적으로 확장한 뒤 프로젝트 디렉터리를 작업 디렉터리로 하여 진입점 파일을 실행. 규칙: 상대 경로만 허용, 상위 디렉터리/절대/백슬래시/콜론/제어 문자 경로 거부, 대소문자 및 Unicode 정규화 형식에 무관한 중복 감지, 파일/디렉터리 충돌 검사, 최대 16384 항목, 압축 해제 후 64 MiB 및 파일당 16 MiB, 진입점 검증과 취소 시 정리; 일반 파일과 디렉터리만 생성하며 키가 없는 호스트는 기존 단일 소스 경로를 그대로 사용. 프로젝트 디렉터리를 묶는 호스트가 필요; AutoJs6 엔진 측 변경은 함께 준비되었으나 아직 공개되지 않음
* `수정` Release 검증 도구가 상대 아카이브 이름으로 프로젝트 소스 아카이브의 파일을 읽도록 수정하여 감독 프로세스 소스의 정확한 검증이 Windows의 GNU tar에서도 동작; CI와 공개 자산은 변경하지 않음
* `수정` 실험용 watch 재로드에서 close_range 실패 시 설명자가 누출되는 문제 수정: 기존의 제한된 raw syscall 대체 경로로 exec 전에 실제 FD에 CLOEXEC를 설정하고 설정이 불완전하면 중단. stdio, 명시적 IPC 및 기존 신호 수명 주기를 유지. GCC/Clang 전체 소스 대조 테스트로 실제 exec, 높은 번호 FD, 낮춘 하드 제한 및 주입 오류를 검증. 새 native 빌드와 변경 없는 Android 테스트는 별도로 기록하며 과거 실패, 공식 산출물 및 배포 범위는 유지
* `수정` Bun 소스 갱신 후 과거 실험용 JSC 후보 검증을 수정: 변경할 수 없는 전체 빌드 기록에 연결하고 새 빌드에는 현재 입력의 엄격한 검증을 유지
* `수정` 실험 Android epoll 대기 중 차단된 pending 신호가 조기에 전달되는 문제 수정: 호출자 mask를 유지하고 기존 epoll_pwait2 제외 정책을 호출 지점에도 적용. GCC/Clang 회귀는 수정 전후 대기 함수 전체를 컴파일하여 검증. 새로운 native 빌드와 변경 없는 기기 테스트는 별도로 기록하며 11개 패치 버전의 실패 기록과 공식 지원 범위 유지. 변경하지 않은 테스트를 5개 네이티브 4 KiB 환경에서 각각 두 번 실행하여 앱 프로브 330/330 및 Binder 80/80 통과. API 28 ART 시작 실패 두 건은 별도 보관하며, 동일 APK의 세 번째 시도에서는 두 라운드 모두 통과. 새 소스의 Samsung ARM64 고정 테스트 검증은 완료이며 JSC rebase는 별도 기록
* `수정` 이전 11개 패치 버전 결과: 실험 Android spawn이 pending SIGSYS를 너무 일찍 전달하는 문제 수정: 부모에서 호출자 mask를 유지하고 설정 단계의 신호 처리는 자식에서만 허용. 호출자가 SIGSYS를 차단하면 기존 자식 cgroup 참여 경로 사용. GCC/Clang 호스트 회귀로 실제 함수 전체와 이전 소스의 실패 대조군을 검증하며, 새 소스의 빌드 및 기기 증거는 과거 검증 결과 및 공식 지원 범위와 별도로 기록. 기기 후속 검사에서 spawn 직후 신호 보존은 확인했지만 비동기 대기 중에는 여전히 조기 전달됩니다. epoll 레지스터와 마스크를 읽기만 하는 독립 증거로 다음 차단 원인을 확인했으며 전체 33개 프로브 게이트는 아직 실패 상태입니다
* `수정` 런타임 준비 확인이 일시적으로 실패하면 30초 대기 후 다음 요청에서 재시도하고, 동시 요청은 확인 결과를 공유하도록 수정. 각 확인 출력 스트림을 4 KiB로 제한하고 번역된 요약에 API, ABI, 단계, 런타임 식별 정보, 종료 코드 및 재시도 정책을 추가. 신호가 추정값임을 명시하며 네이티브 바이너리와 지원 범위는 유지
* `수정` 실험용 Android에서 SIGSYS가 차단된 상태로 첫 비동기 spawn을 실행할 때 발생하는 pidfd 탐색 충돌을 수정하고 기존 waiter 대체 경로로 호출 스레드 마스크와 대기 중인 신호를 보존. 10개 패치 런타임이 네이티브 4 KiB 환경 5개에서 기존 31개 프로브 (310/310) 및 전체 8개 Binder 테스트 (80/80)를 통과. 원래 종료 코드가 유실되었음을 명시하여 빌드 완료 증거를 복구하고 최초 ART 시작 실패는 별도 보관. 새 바이너리의 JSC rebase 및 Release 검증은 미완료이며 공식 바이너리는 유지
* `수정` 명시적 큰 페이지, JIT 및 할당자 설정으로 고정 WebKit을 다시 빌드하고 Bun을 다시 링크하여 실험용 네이티브 x86_64 16 KiB의 JavaScriptCore 시작 중단 수정. 4 KiB 및 16 KiB AVD에서 전체 Binder 테스트가 각각 두 번 통과 (32/32). 공식 바이너리와 4 KiB 보호 조건은 유지하며 Release 검증은 별도
* `개선` 운영 Binder 서비스를 통한 고정 오프라인 TLS/IPv6 모드 4개 추가: TLS 1.2/1.3, 인증서 및 호스트 이름 거부, 검증된 HTTPS, IPv6 TCP/UDP/HTTP. 공개 테스트 인증서, 정확한 소스, APK 및 두 패키지 UID를 연결하고 기존 테스트 수와 배포 범위를 유지
* `개선` 운영 Binder 서비스를 통한 고정 오프라인 API 모드 4개 추가: 파일 및 디렉터리 감시, 인스턴스별 로컬 DNS, 바이너리 TCP 반쪽 닫기, HTTP 리디렉션/스트림 읽기/취소. 정확한 소스, APK 및 두 패키지 UID를 연결하고 실패 기록과 기존 테스트 수 및 배포 범위를 유지
* `개선` 기존 7개 부하 모드 순서, DFG 조기 종료와 단언을 보존하는 별도 진단 추가. 실패를 다시 던지기 전에 제한된 프로파일별 데이터를 기록하고 정확한 소스와 두 패키지 UID를 검증. 기존 결과와 호환성 집계 유지
* `개선` 고정된 PC 매핑 조건에서 전체 샘플 스택과 인라인 호출자를 확인하는 별도의 제한된 진단 추가. 기존 핫 루프와 판정 기준을 유지하고 profiler 추가 정보 옵션의 최종값을 검증. 분류별 첫 전체 스택과 바이트 제한에 따른 생략을 기록하고 호출자 식별 정보와 컴파일러 결정을 독립적으로 확인하며 호환성 통과 수는 늘리지 않음
* `개선` JSC 샘플링에 실행 위치 매핑의 제한된 비교 추가. 기존 4단계 작업을 그대로 사용하고 확정된 설정, 인라인 결정, 실제 실행 계층과 종료 코드 1을 보존. 두 번째 라운드의 순서를 반대로 하며 기존 테스트, 제한, 네이티브 바이너리와 지원 범위 유지
* `개선` JSC 프로파일러 재시작과 데이터 초기화를 확인하는 고정 4단계 진단 및 대상 함수를 실행하지 않는 명시적 exit 1 대조를 추가. 단계별 증거, 타임스탬프 및 원본 UID 정리 기록을 보존하며 기존 부하/샘플링 테스트를 변경하거나 과거 장애 재현으로 주장하지 않음
* `개선` 독립적인 제한형 DFG 샘플링 진단을 추가하여 캡처별 시간, 호출 수, 프레임 분포 및 최적화 카운터를 기록. 샘플 부족 시 종료 결과와 정확한 소스/APK/UID 증거를 보존하며 기존 부하 테스트, 한도, 런타임 및 호환성 집계는 유지
* `개선` 빌드 캐시와 사용이 끝난 에뮬레이터의 디스크 공간을 정리하면서 런타임 출처, 테스트 산출물, 실패 기록을 보존하는 개발자 가이드 추가
* `개선` 13개 패치의 대형 페이지 JSC 후보를 별도로 고정: 새 Bun 클린 빌드 두 번의 실제 종료 코드는 모두 0이며 전체 결과물이 동일하고 빌드 입력 21개도 유지. 기존 독립 JSC 라이브러리와 ICU를 재사용하고 새 APK 및 기존 Binder/7개 압력 모드 회귀를 별도로 연결하여 과거 승인 결과나 배포 범위를 확대하지 않음
* `개선` 고정 watch/reload 진단에 제한된 읽기 전용 SIGABRT 스냅샷을 추가하고 신호 전달과 예산을 유지. 네이티브 ARM64 API 28/31의 추적 유무 관측 총 16회에서 재로드 32회와 일반 SIGSYS 24회를 확인하고 패키지와 UID를 정리. 재현되지 않은 기존 API 28 중단 원인은 미해결이며 호환성 통과 수에 추가하지 않음
* `개선` 12개 패치 런타임과 기존33개 검사를 유지하면서 native/TRAP 고정 watch/reload 회귀를 추가. ARM64 / 4 KiB 실기기4환경에서 기존 검사는264/264 통과했으나 새 모드는14/16 실패하여32회 재로드 중28건의 FD 상속 누수를 확인. Sony 5.15 기본 경로는 통과하고 강제TRAP은 실패. 소스가 연결된 APK3배치와 초기 검증기 수정 기록을 보존하고 패키지 및 UID 정리를 확인. 네이티브 수정, 확장 호환성 및Release 검증은 계속 진행 필요
* `개선` 12개 패치 버전의 Samsung API 32 회귀를 SM-F936U / 네이티브 ARM64 / 4 KiB에서 완료: 변경 없는 프로브를 두 번 실행하여 66/66, 전체 Binder 테스트 16/16 통과. API 36 배치의 APK 3개를 그대로 재사용하며 pending 신호 체크포인트 40개와 자식 프로세스 관측 12건도 통과. 모든 테스트 패키지를 제거하고 3개 UID의 잔여 프로세스가 없음을 확인한 뒤 AVD 조작 없이 전용 ADB server 종료. 고정 테스트의 Samsung 두 환경 검증 완료; baseline 7개 환경 누적 462/462 프로브와 112/112 Binder. 광범위한 런타임, 부하 및 Release 검증은 미완료
* `개선` 변경 없는 12개 패치 런타임을 Samsung SM-A566B / API 36 / 네이티브 ARM64 / 하드웨어 16 KiB 페이지에서 검증: 기존 33개 프로브를 두 번 실행하여 66/66, 전체 Binder 테스트 16/16 통과. pending 신호 4개 모드에서 40개 체크포인트와 자식 프로세스 관측 12건을 보존한 뒤 각 caller에게 한 번만 전달. native 재빌드 없이 동일 APK를 재사용하고 제거 후 3개 UID의 잔여 프로세스가 없음을 확인. AVD 조작 없이 전용 ADB server 종료. baseline 6개 환경 누적 396/396 프로브와 96/96 Binder; ARM64 API 32, 광범위한 런타임 및 Release 검증은 미완료
* `개선` 12개 패치의 대형 페이지 JSC 후보를 네이티브 x86_64 API 36의 4 KiB 및 16 KiB 사용자 페이지에서 검증. 83개 입력에 연결된 동일 APK 쌍으로 기존 Binder 32/32 및 고정 부하 모드 28/28 통과. 초기 메모리 부족에 따른 서비스 종료는 별도 보관하며 설정이나 한도를 바꾸지 않은 동일 APK의 전체 재시도 통과. 정리 후 두 패키지 UID의 프로세스가 없음을 확인하고 x86 페이지 에뮬레이션, Samsung baseline 및 Release 검증 범위를 구분
* `개선` 12개 패치 대형 페이지 JSC 후보를 별도로 고정하고 새 Bun 클린 빌드 두 회의 일치, 실제 종료 코드와 빌드 입력 21개의 불변성을 검증. 기존 독립 JSC 라이브러리와 ICU를 그대로 재사용하고 과거 후보를 보존하며 격리 Binder 도구를 새 소스 잠금에 연결. 기존 부하 테스트, 의미 검증과 제한은 유지하고 기기 및 Release 검증은 별도로 기록
* `개선` 대기 중인 SIGSYS를 포함한 고정 spawn 검사와 독립 신호 추적 추가. 네이티브 ARM64 API 28/31에서 새 두 모드가 각각 두 번 실패하지만 기존 31개 항목은 모두 통과하며, 8회 추적으로 SI_TKILL의 조기 전달을 확인. native 바이너리나 호환성 범위를 변경하지 않고 실패, 소스/APK 연결 및 정리 기록을 보관
* `개선` 실행 오류 요약을 10개 언어로 제공하고 고정 오류 코드와 제한된 기술 진단을 유지. 활성화, Android 요구 사항, 시간 초과 및 출력 제한 안내를 동일한 Android 리소스에서 생성. 캐시된 페이지 크기 거부를 현재 언어로 표시하고 진단을 자를 때 Unicode 문자를 온전히 보존
* `개선` 전체 소스 목록, 아카이브 해시 및 CI 변경 검사를 포함한 자동 생성 호환성 근거 매트릭스 추가; 실패와 초기 진단을 포함해 런타임, 기기, 테스트 묶음별 결과를 보존하며, 새로운 기기 검증이나 공식 지원 범위 확대는 포함하지 않음
* `개선` 새 10개 패치 대형 페이지 x86 후보를 API 36의 4 KiB 및 16 KiB 사용자 공간 페이지에서 검증. 77개 입력에 연결된 동일 APK 쌍으로 변경 없는 Binder 테스트 32/32와 고정 부하 모드 28/28 통과. 정확한 바이트, 원본 결과 및 정리를 과거 증거와 별도로 보관. x86 16 KiB ABI는 4 KiB 커널 페이지 위에서 에뮬레이션되며 Release 또는 성능 검증을 의미하지 않음
* `개선` 10개 패치 대형 페이지 JSC 후보를 별도 잠금에 연결하고, 동일한 두 번의 클린 Bun 빌드, 실제 종료 코드 보존, 재사용 JSC 입력의 정확한 일치를 요구. 격리된 Binder 도구는 새 소스 결합 잠금을 사용하며 과거 및 공식 바이너리는 유지. 기기 및 Release 검증은 별도로 진행
* `개선` 최소 스크립트, 증상/원인/조치 점검 및 필요한 문제 보고 정보를 담은 중국어 문제 해결 가이드를 추가하고 README 10개 언어에서 연결. 런타임 기능은 변경하지 않음
* `개선` 변경 없는 10개 패치 런타임의 Samsung 회귀 검증 완료: 네이티브 ARM64 API 32 / 4 KiB 및 API 36 / 16 KiB에서 동일한 APK로 각각 31개 프로브 두 차례 (62/62)와 전체 8개 Binder 테스트 두 차례 (16/16)를 통과. 네이티브 환경 7개의 누적 결과는 프로브 434/434 및 Binder 112/112. 네이티브 재빌드나 AVD 조작 없이 정확한 소스, APK 및 정리 증거를 연결. JSC rebase, 확장 런타임 매트릭스 및 Release 검증은 계속 진행
* `개선` 독립 test-only SIGSYS 관찰 도구 추가: 네이티브 ARM64 API 28의 실패 4건에서 pidfd_open을 직접 확인하고, 추적 없는 대조군도 동일하게 실패하며 API 31 대조군은 통과. 원본 증거 연결, 초기 도구 실패 보존, 신호 전달, 변조 거부 및 정리 검증; 새 런타임, Binder 또는 Release 승인 결과는 아님
* `개선` SIGSYS 를 차단한 비동기 spawn 고정 프로브 2 개를 추가하고 기존 29 개 정의와 native 바이트를 유지. 네 가지 네이티브 4 KiB 환경에서 248/248 통과했으나 Sony API 28 에서는 두 새 모드가 각각 두 번 exit 159 로 실패 (전체 58/62). 네 번의 실패를 별도로 엄격히 보관하고 호환성 게이트를 미통과 상태로 유지. 테스트 패키지, UID 프로세스 및 이번 AVD 를 정리했으며 새 Binder, 16 KiB 또는 Release 수락을 의미하지 않음
* `개선` Samsung SM-A566B / API 36에서 FD 하드 한도 4개 모드의 네이티브 ARM64 16 KiB 검증 완료. 동일 APK와 변경 없는 29개 프로브를 두 차례 실행해 58/58 통과, 하드 한도 8개 사례에서 네이티브 close_range와 강제 TRAP 후 폴백 성공. 제거 후 UID 프로세스 0개를 확인하고 AVD는 조작하지 않음. 7개 환경 누적 406/406. 네이티브 재빌드, Binder 재실행 및 Release 검증은 수행하지 않음
* `개선` Samsung Galaxy Z Fold4 SM-F936U에서 실제 API 32 / Android 12L, 네이티브 ARM64 및 4 KiB 페이지 검증. 기존 Binder 스위트 두 라운드 16/16, 변경 없는 29개 앱 프로브 58/58 통과, 하드 한도 사례 8개 모두 포함. APK, 소스, 원시 증거를 정확히 연결하고 테스트 패키지 3개를 삭제한 뒤 UID 프로세스가 0개임을 확인. AVD는 조작하지 않았으며 네이티브 바이트는 변경 없음. 새 하드 한도 사례의 네이티브 ARM64 16 KiB, 확장 매트릭스 및 Release 검증은 미완료
* `개선` 기존 25개 정의와 런타임 바이트를 유지하고 Android FD 하드 제한용 고정 프로브 4개 추가. 네이티브 4 KiB 환경 5개에서 각각 두 차례 29/29 (총 290/290), 하드 제한 검증 40건 통과. 소프트/하드 제한을 128로 낮춘 후 시작 시 CLOEXEC와 두 spawn API를 검증하고 앱 및 supervisor 제한은 유지. 원시 증거를 연결하고 테스트 패키지와 이번 AVD를 정리. FD 70000, 새 항목의 네이티브 16 KiB 및 Release 검증은 미완료
* `개선` API 36 x86_64에 독립적인 제한형 JSC 부하 검증 추가: 4 KiB 및 에뮬레이션된 16 KiB 사용자 공간 페이지에서 7개 오프라인 모드를 각각 두 번 통과 (28/28). 실제 LLInt/Baseline/DFG/FTL 샘플, GC, Wasm 및 worker 64개의 정상 종료를 확인. 동일 APK로 기존 Binder 테스트도 통과 (32/32). 4 KiB 커널 매핑을 별도로 기록하고 초기 결과를 보존하며 이번 검증용 기기를 정리. 네이티브 바이트, 안정 지원 범위 및 Release 조건은 변경 없음
* `개선` API 29 및 32의 네이티브 x86_64 / 4 KiB 검증 완료: 환경별 2회 실행으로 Binder 32/32와 변경 없는 앱 프로브 100/100이 추가 통과하여 API 28-32의 x86 Binder 버전 검증을 완료. 원본 보고서, 소스 및 정리 기록의 불일치를 거부하는 보관 도구 추가; 이전 증거를 유지하고 ARM64 API 32 및 Release 검증은 미완료로 두며 이번에 시작한 AVD 2대만 종료
* `개선` 프로덕션 서비스와 기존 전체 8개 Binder 테스트를 재사용하는 별도 패키지의 선택적 test-only 플러그인 추가. 고정된 9패치 Bun으로 ARM64 16 KiB를 포함한 9개 네이티브 환경에서 각각 두 번 통과 (144/144). APK/소스 연결과 정리 증거를 보존하며 안정 지원 범위는 확대하지 않음
* `개선` 런타임 바이트와 기존 24개 탐침을 변경하지 않고 내부 lchmod/fchmodat2용 고정 오프라인 CLI 탐침 추가: ARM64 16 KiB를 포함한 6개 네이티브 환경에서 25개 항목을 각각 두 번 통과 (300/300). 권한 변경, 반복 링크, no-follow, 무시된 EIO 및 제한된 스레드 정리를 통한 SIGSYS 경로 도달을 검증. 초기 테스트 구현 실패를 보존하고 테스트 패키지를 제거한 뒤 이번 작업의 AVD를 종료. 전체 실험용 Binder와 Release 검증은 미완료
* `개선` 9개 패치 실험용 Bun을 Samsung 네이티브 ARM64 / API 36 / 16 KiB에서 동일 APK와 변경 없는 24개 프로브로 검증: 두 차례 48/48 통과, 경로 검증 48개 통과 및 루트 이탈 요청 12개에서 테스트 센티널 거부; 테스트 패키지를 제거하고 UID 프로세스 잔류 없음, AVD 시작이나 종료 없음. 전체 실험용 Binder, Release 및 x86_64 16 KiB 검증은 미완료
* `개선` 64비트 네이티브 라이브러리의 16 KB 페이지 정렬을 빌드 시 검증, manifest 계약 검사 및 JSON 보고서 지원
* `의존성` 온라인 platform-versions 플러그인을 저장소에 고정된 1.8.0로 맞추고 native-alignment는 변경하지 않음
* `의존성` AutoJs6 호스트 build 5280의 공유 bun-runtime-api AAR (AAR 메타데이터가 컴파일 SDK 37을 요구)을 사용할 수 있도록 compileSdk를 37로 올림; minSdk 33과 targetSdk 36은 변경 없음

# v0.2.1

###### 2026/09/10

* `힌트` 아직 게시되지 않은 개발 스냅샷. 공식 플러그인은 계속 Android 13 (API 33) 이상이 필요함
* `수정` 고정된 MIT FD 상대 경로 폴백으로 openat2 없이 실험용 정적 디렉터리 제공 유지: 경로 구성 요소를 고정하고 루트 내부 링크를 해석하며 외부 및 매직 링크를 거부하고 탐색, 오류, FD 소유권을 제한; 일반 Bun.file/node:fs 접근, 공식 런타임 바이트와 Android 13 최소 요구 사항은 유지
* `수정` 고정된 MIT 패치로 실험 런타임의 Linux spawn FD 폴백 수정: 고정 스택 버퍼와 원시 syscall로 실제 디스크립터를 열거하고, 낮아진 소프트/하드 제한 및 기존 65536 상한을 넘는 FD를 처리하며, 격리가 불완전하면 exec 전에 제어된 오류 반환; vfork/exec, 오류, 심볼 및 기존 구현 대조 회귀 추가, 공식 Bun 페이로드와 Android 13 최소 요구 사항은 유지
* `수정` 고정된 MIT 패치로 실험용 Bun의 시작 시 CLOEXEC 대체 경로 수정: fd 번호 상한 없이 열린 디스크립터를 열거하고 fd 0-3을 보존하며 표시를 완료하지 못하면 종료; 네이티브 오류/경계 테스트를 추가하고 빌드 입력 검증과 런타임 검수를 분리. 공식 런타임과 Android 13 최소 요구 사항은 유지
* `수정` 고정된 읽기 전용 감독 프로세스로 공식 플러그인의 시간 초과, 취소 및 출력 한도 정리를 수정: 무시된 SIGTERM을 SIGKILL로 승격하고 직접 생성한 Bun 자식의 종료를 기다리며 남은 출력을 보존; Bun 1.4.0과 Android 13 최소 요구 사항은 유지
* `수정` 공유 SupervisedProcess를 원본 소스에서 컴파일하고 고정된 감독 프로세스를 포함하여 patched Bun 독립 프로브의 종료 처리 수정; schema 2 빌드 기록에 소스, 도구 체인 및 감독 프로세스 바이트를 연결하고 종료까지 출력 읽기 유지
* `개선` ABI별 두 클린 빌드의 바이트 일치와 네이티브 4 KiB 환경 5개에서 기존 24개 단언을 두 번 검증해 240/240 통과: 이전에 실패한 루트 이탈 단언 60개가 모두 테스트 데이터 접근을 거부하며 일반 제공도 작동. GCC/Clang 및 GCC ASan/UBSan 통과, 테스트 패키지와 실행한 AVD 정리. 기존 실패를 보존하며 새 네이티브 ARM64 16 KiB, 전체 Binder 및 Release 검증은 미완료
* `개선` 이전 실패 기준 (a260ef308): 실험용 런타임을 변경하지 않고 openat2 디렉터리 제약을 확인하는 24번째 프로브 추가: 네이티브 4 KiB 환경 5개에서 각각 두 차례 23/24. 기존 230개 관측은 통과하지만 새 실패 10건에서 상대/절대/매직 링크를 통한 설정 루트 밖의 합성 테스트 데이터 읽기를 60회 기록. 단언을 완화하지 않고 실패를 보존. 충돌, 멈춤, 테스트 UID의 잔여 프로세스는 없으며 이번에 실행한 AVD는 종료. 네이티브 수정은 아직 미적용
* `개선` fchmodat2 소스 감사 정정: 내부 sys::lchmod는 대문자 SYS_FCHMODAT2를 사용하며 Android node:fs의 공개 lchmod 내보내기 2개는 10회 모두 존재하지 않음. 패키지 실행 파일 링크 처리의 내부 폴백이나 의존성 설치는 실행하지 않았음. 과거 보고서를 보존하고 배포 차단을 유지
* `개선` 실험용 런타임 바이트를 변경하지 않고 syscall 테스트를 23개로 확장: 네이티브 4 KiB 환경 5개에서 각각 두 차례 통과 (230/230), raw TRAP→ENOSYS 관측 60회 및 EIO 대조를 갖춘 복사/대기 폴백 16회 포함. 커널/정책으로 제한된 API 28 사례 4개는 분기 도달 증거에서 명시적으로 제외하고 기존 단언과 과거 증거를 보존하며 테스트 패키지와 이번에 실행한 AVD를 정리. 전체 syscall/Binder 및 새 네이티브 16 KiB 검증은 미완료
* `개선` 6개 네이티브 환경에서 spawn 수정 검증: 동일한 20개 검사가 arm64 API 28/31/33/35 및 x86_64 API 33 (4 KiB), Samsung arm64 API 36 (16 KiB)에서 각각 두 번 통과하여 총 240/240. 두 ABI 모두 두 번의 클린 빌드로 재현되며 강제 종료 36개 사례도 통과. 테스트 패키지를 제거하고 이번 작업에서 시작한 AVD를 종료. 이전 실패 기록은 보존하며 실험용 Binder 전체 및 Release 검증은 아직 남아 있음
* `개선` Samsung Remote Test Lab SM-A566B (API 36)에서 네이티브 ARM64 16 KiB 실행 검증: 공식 Bun과 고정된 supervisor를 사용하는 v0.2.1 개발용 arm64 전용 APK가 프로세스 재시작, 설치된 파일 해시, 강제 종료 10건을 포함해 Binder 테스트 8개를 두 차례 모두 통과. 소스/APK/로그 연결을 보존하고 테스트 패키지를 제거하며 Release와 x86_64 검증은 별도로 유지
* `개선` 이전 실패 기준선 (c240d6c68): 같은 네이티브 ARM64 16 KiB 기기에서 변경하지 않은 실험용 런타임이 두 차례 19/20임을 기록: 네이티브 close_range, 시작 플래그 설정, 수명 주기 검사는 통과하지만 강제 TRAP과 RLIMIT_NOFILE 감소 시 기존 spawn fd 상속 결함이 남음. 두 실패를 보존하며 전체 실험용 Binder 또는 런타임 검증 완료로 간주하지 않음
* `개선` 이전 실패 기준선 (c240d6c68): RLIMIT_NOFILE을 낮추는 대조 테스트를 추가해 실험용 프로브를 20개로 확장: API 28/31/33/35 네이티브 arm64 실기기 4대는 각각 두 차례 18/20, API 33 네이티브 x86_64 AVD는 두 차례 19/20이며 모두 4 KiB 페이지 사용. 기존 180개 관측은 계속 통과하지만 새 실패 18건에서 soft limit을 128로 낮추면 두 spawn API 모두 fd 256을 자식에게 전달함을 확인. 실패와 제한 복원 및 정리 결과를 보존하며 런타임 바이트 변경이나 수정 완료를 주장하지 않음
* `개선` x64 Windows의 ARM64 16 KiB 테스트 환경 안내 추가: VMware와 WSL만으로는 네이티브 ARM64 Android를 제공할 수 없음. 전체 시스템 소프트웨어 에뮬레이션을 구분하고 Samsung 원격 16 KiB 실기기와 RDB/ADB를 후보로 제안하되, 실제 가용성과 권한 확인이 필요하며 새 기기 검증 완료로 간주하지 않음
* `개선` 이전 18개 프로브 결과: FD/SIGSYS 프로브 5개를 추가하고 시작 수정 검증: API 28/31/33/35 네이티브 arm64 실기기 4대와 API 33 네이티브 x86_64 AVD에서 각각 두 차례 18/18, 총 180/180 통과; 두 ABI 모두 두 번의 클린 빌드가 바이트 단위로 일치. 이전 17/18 실패 보고서를 보존하고 공식 런타임과 Android 13 최소 요구 사항은 유지; 전체 실험용 Binder와 네이티브 16 KB 실행 검증은 미완료
* `개선` corresponding-source manifest schema 2에 감독 프로세스 소스, 고정 NDK 빌드 지침 및 ABI별 해시를 연결하고 소스 아카이브의 정확한 파일을 검증; v0.2.0 공개 자산은 변경하지 않음
* `개선` 재현 가능한 patched Bun을 위한 독립 테스트 전용 APK 빌더와 명시적 기기 실행 도구 추가. 소스/APK/runtime의 정확한 검증, 임시 테스트 서명, 크기가 제한된 기계 판독 보고서 제공
* `개선` API 28, 31, 33, 35의 네이티브 arm64 기기에서 앱 프로세스 테스트 13개를 두 차례 모두 통과; SIGTERM을 무시하는 시간 초과, 출력 한도 및 준비 후 취소 24건에서 자식과 감독 프로세스의 종료 및 작업 디렉터리 정리 확인. 기존 10/12 실패 보고서를 보존하며 전체 실험용 Binder 통과나 Android 지원 범위 확대를 주장하지 않음
* `개선` 게시된 v0.2.0 APK/소스 자산 검증과 서명된 패키지의 기기 검증 근거 보관. 게시된 태그를 다시 쓰거나 Android/16 KB 호환 범위를 확대하지 않음
* `의존성` 온라인 빌드 플러그인 autojs6-platform-versions를 1.7.3에서 1.7.4로 업데이트하고 저장소의 버전 요구 사항 동기화

# v0.2.0

###### 2026/09/08

* `힌트` 이번 버전은 최소 시스템 요구 사항을 Android 14에서 Android 13 (API 33)으로 낮췄습니다. Android 9부터 12L (API 28부터 32)은 patch된 Bun runtime이 이식성 검증을 통과할 때까지 계속 지원되지 않습니다
* `수정` Release 자산 검증 강화: WebKit 아카이브의 크기와 SHA-256을 잠긴 값과 직접 대조하고 apksigner 출력 형식 차이 지원
* `수정` 설치된 runtime ABI를 ABI table iteration 순서가 아닌 locked payload SHA-256으로 식별하고, prewarming에서 최소 JavaScript smoke test를 실행해 사용할 수 없는 runtime을 user script 시작 전에 거부
* `수정` Android가 4 KiB보다 큰 page를 사용할 때 pinned JavaScriptCore의 4 KiB page-size ceiling으로 원인이 확인된 호환 불가 공식 x86_64 runtime을 process 시작 전에 거부하고, 결정적인 Bun abort를 제한된 진단으로 대체
* `개선` 최소 시스템 요구 사항 인하: 고정된 공식 Bun 1.4.0 Android payload를 그대로 사용하면서 지원 하한을 Android 14 (API 34)에서 Android 13 (API 33)으로 완화하여 더 많은 기기를 지원
* `개선` 구버전에서 동작하지 않는 근본 원인 규명: Android 13부터 시스템 seccomp가 Bun이 호출하는 raw `close_range` syscall을 허용하며, API 31 실제 기기 실패는 API 28부터 32까지는 Bun 자체 수정이 필요하고 manifest 변경만으로는 해결할 수 없음을 증명
* `개선` 향후 Android 9+ 지원을 위한 기반 마련: 정확히 재현 가능한 Bun 소스 patch 방식 (patch 6개)을 수립하고 빌드 입력을 고정 (NDK와 컨테이너 고정, Android release 활성 의존성 22개); 이 작업은 별도의 실험 라인을 만들며 현재 패키지의 공식 runtime을 변경하지 않음
* `개선` 패키지 품질 검사 강화: 모든 Debug 및 Release APK에서 16 KB ZIP alignment, 정확한 ABI 내용, 고정 Bun payload의 크기와 SHA-256을 검증하고 Android 13 테스트 기기에서 설치된 payload 바이트를 대조
* `개선` 공급망 강화: Bun source archive 19개와 toolchain 다운로드 17개의 정확한 바이트를 고정하고, Cargo 181개와 Bun registry integrity 항목 172개를 목록화하며, 덮어쓰기를 거부하는 materializer와 `buildReady` 게이트로 보호되는 듀얼 ABI 빌드 preflight를 추가
* `개선` 복사해 바로 실행할 수 있는 예제 모음 확장: 네트워크 fetch, 비공개 작업 공간 파일 입출력, stdout/stderr 스트리밍, 더 실용적인 TypeScript 타입 예제를 주석과 함께 추가하고, 첫 줄 `"bun";` 지시문과 단일 소스 및 설치 금지 경계를 문서 게이트로 검증
* `개선` PAGE_SIZE=16384를 강제한 Android 16 (API 36) AVD에서 16 KB execution 검증: `arm64-v8a` single-ABI APK는 `libndk_translation`을 통해 Binder instrumentation 5개를 모두 통과했지만, native `x86_64` payload는 최소 script에서도 exit code 134로 중단되므로 일반적인 16 KB 지원은 주장하지 않음
* `개선` Android 9+ 실험 빌드 공급망의 Cargo 부분 완결: crates.io archive 181개 (총 26,354,160 bytes)를 잠그고 실제로 내려받아 파일별 checksum이 있는 directory source를 생성했으며, 고정 Cargo가 빈 `CARGO_HOME`에서 전체 Bun workspace를 `--locked --offline`으로 읽는 것을 검증; 이 결과는 Cargo 입력만 다루며 나머지 빌드 입력을 단독으로 완결하지 않음
* `개선` 동일 공급망의 Bun registry 부분 완결: lock reference 172개를 Linux x64용 고유 npm archive 125개 (총 31,498,870 bytes)로 해석하고, 잠긴 tarball만으로 최소 cache를 재구성했으며, network가 차단되고 cache가 읽기 전용인 고정 Ubuntu container에서 세 번의 frozen install을 모두 통과; 신뢰되는 postinstall 의존성은 `esbuild@0.21.5` 하나뿐
* `개선` patched runtime을 배포하지 않은 채 재현 가능한 build gate 완결: host `.deb` archive 155개 (422,223,096 bytes)를 반복 생성 가능한 OCI image로 잠그고, Cargo closure를 고유 archive 206개로 확장했으며, 두 64-bit ABI를 network 차단 clean 환경에서 각각 두 번 build해 byte-for-byte 동일한 결과를 확인하고 pure Node ELF audit도 잠금; API 28과 31의 직접 shell probe는 통과했지만 APK와 application process gate는 아직 열려 있음
* `개선` 검증 가능한 대응 source Release assets 구현: source를 APK와 분리하되 같은 Release에 두고, 정확한 Bun/WebKit/JSC, native 19개, Cargo 206개, npm 125개 source archive와 patch, build/relink 지침, 공개 license notice를 패키징; 대용량 asset은 1.9 GB로 분할하고 machine-readable manifest와 SHA256SUMS로 APK/runtime/source bytes를 결합하며, GitHub SHA-256이 모두 일치한 뒤에만 draft를 공개; 이는 자동화 기술 검증 기록이며 법적 승인을 주장하지 않음
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
