<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>격리된 Android 프로세스에서 독립 Bun 엔진으로 JavaScript와 TypeScript를 실행합니다</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### 언어

******

현재 README.md는 다음 언어를 지원합니다:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- 한국어 [ko] # 현재
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### 소개

******

Bun Runtime은 AutoJs6에 선택 가능한 현대적 스크립트 엔진을 추가하는 독립 플러그인입니다: [Bun](https://bun.sh/). 플러그인을 설치하고 활성화한 뒤 JavaScript 또는 TypeScript 파일의 첫 줄에 `"bun";`를 넣으면, 그 파일은 내장 Rhino 엔진 대신 진짜 Bun 1.4.0 엔진이 실행합니다. 현대 JavaScript 문법과 TypeScript, `fetch` 같은 Bun 내장 API를 Android 기기에서 바로 사용할 수 있습니다.

플러그인의 동작 방식은 단순합니다. AutoJs6가 스크립트 내용을 플러그인에 보내면, 플러그인은 격리된 자체 프로세스에서 공식 Bun Android executable을 시작하고, 출력과 최종 결과를 실시간으로 AutoJs6 콘솔에 돌려보냅니다. 이는 진짜 Bun이며 Rhino나 Node.js 위의 alias 또는 에뮬레이션 레이어가 아닙니다.

******

### 설치 및 사용

******

1. 환경 준비: Android 13 (API 33) 이상에서 AutoJs6 build 5278 (6.8.0) 이상을 설치합니다.
2. 플러그인 설치: [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases)에서 기기에 맞는 APK를 내려받아 설치합니다. 대부분의 휴대전화와 태블릿은 `arm64-v8a`, emulator 또는 x86_64 기기는 `x86_64`, 확실하지 않으면 `universal`을 선택합니다 (조금 더 크지만 둘 다에서 동작합니다).
3. 플러그인 활성화: AutoJs6 plugin center를 열고 Bun Runtime을 활성화합니다. 새로 설치한 플러그인이 중지 상태로 표시되면 호스트가 보여주는 `활성화` action을 누릅니다.
4. 스크립트 실행: JavaScript 또는 TypeScript 파일의 첫 줄에 `"bun";`만 단독으로 넣고 (따옴표와 세미콜론 포함), 평소처럼 AutoJs6에서 그 파일을 실행합니다.

> 각 실행은 현재 파일의 snapshot 하나를 실행합니다 (실제 명령은 `bun run --no-install <source>`). 플러그인은 npm dependency를 자동으로 설치하지 않으며 프로젝트의 다른 파일도 읽지 않습니다. 기존 Rhino 또는 Node.js 프로젝트를 Bun으로 옮기기 전에 아래의 현재 제한을 먼저 확인하세요.

******

### 빠른 시작

******

다음 내용을 스크립트 파일로 저장하고 실행하면 Bun 엔진이 실행을 넘겨받았는지 확인할 수 있습니다:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

모든 것이 정상이면 출력 첫 줄은 `Bun 1.4.0`, 둘째 줄은 `android`입니다.

TypeScript 파일도 사전 컴파일이나 추가 설정 없이 바로 실행됩니다:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

네트워크 요청, 비공개 작업 공간 파일 입출력, stdout/stderr, TypeScript 타입을 다루는 주석 포함 복사 실행 예제는 [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples)에서 볼 수 있습니다. 모든 예제는 현재의 단일 소스 및 `--no-install` 경계 안에서 동작합니다.

******

### 기능

******

- 진짜 Bun 엔진: 스크립트는 공식 Bun 1.4.0 Android executable이 직접 실행하며, transpile하거나 다른 AutoJs6 엔진으로 전달하지 않습니다.
- TypeScript 즉시 사용: TS 파일은 별도 컴파일 단계나 추가 설정 없이 바로 실행되고, 현대 JavaScript 문법, 단일 파일 내 ESM 문법, 고정된 Android build가 제공하는 Bun API가 모두 동작합니다.
- 투명한 실행: `console.log` 같은 출력이 실시간으로 AutoJs6 콘솔에 돌아오고, 최종 결과는 exit status, 소요 시간, timeout 또는 취소 여부를 보고합니다.
- 안정적이고 제어 가능: 각 스크립트는 격리된 플러그인 프로세스에서 실행되고 언제든 취소할 수 있으며 timeout 시 자동 종료되므로, 문제가 있는 스크립트가 AutoJs6를 함께 멈추게 하지 않습니다.
- 검증 가능한 엔진 출처: 번들된 Bun executable은 공식 release와 byte 단위로 일치하며, tag, commit, 크기, SHA-256, ELF 속성이 build와 CI에서 검증됩니다.
- 완전한 현지화 제공: plugin metadata, plugin center 안내, README, changelog가 10개 언어를 지원하며 모두 하나의 검증된 소스 집합에서 생성됩니다.

******

### 현재 제한

******

- 실행당 파일 하나: 플러그인은 프로젝트 디렉터리 없이 source snapshot 하나만 받아 실행하므로 `import './utils.js'` 같은 상대 경로 import를 해석할 수 없습니다. 단일 파일 내부의 ESM 문법은 영향을 받지 않습니다. 여러 module이 필요하면 먼저 컴퓨터에서 한 파일로 번들하세요 (FAQ 참고).
- AutoJs6 내장 함수 없음: `click()`, `toast()` 같은 automation API와 Rhino globals는 Bun 스크립트 안에 존재하지 않으므로, Bun 스크립트는 현재 계산, 텍스트 처리, 네트워크 요청처럼 호스트 기능에 의존하지 않는 작업에 적합합니다.
- Java bridge 없음: Bun 스크립트는 AutoJs6 프로세스의 Java class나 object에 직접 접근할 수 없습니다.
- 전체 Bun toolchain 보장 없음: `bunx`, 기기에서의 executable 생성, runtime C compilation, 임의 native addon은 지원 범위 밖입니다.
- Security sandbox 아님: Bun 스크립트는 플러그인 프로세스에서 신뢰된 코드로 실행되며 플러그인에 부여된 permission을 사용할 수 있으므로, 신뢰하는 스크립트만 실행하세요.

******

### FAQ

******

#### 왜 Bun 스크립트에서 `click()`, `toast()` 같은 AutoJs6 함수를 사용할 수 없나요?

Bun은 별도 프로세스에서 실행되며 Rhino와 완전히 다른 JavaScript 엔진이므로 AutoJs6 globals가 Bun 스크립트 안에 나타나지 않습니다. Bun 스크립트가 automation 기능을 호출하려면 각 기능을 명시적으로 노출하는 host bridge가 필요하며, 현재 버전은 의도적으로 아직 그런 bridge를 제공하지 않습니다. 계획은 roadmap을 참고하세요.

#### npm 패키지를 사용할 수 있나요?

기기에서 설치하는 방식으로는 불가능합니다. 플러그인은 항상 `--no-install`로 실행되며 dependency를 내려받지 않습니다. 서드 파티 라이브러리가 꼭 필요하면 먼저 컴퓨터에서 `bun build` 등으로 스크립트와 순수 JS dependency를 한 파일로 번들한 뒤 그 파일을 기기에서 실행하세요. native addon에 의존하는 패키지는 이 방식으로 사용할 수 없습니다.

#### 스크립트가 프로젝트의 다른 파일을 `import`할 수 있나요?

현재는 불가능합니다. 플러그인 contract는 프로젝트 디렉터리 없이 source snapshot 하나만 전송하므로 상대 경로 import를 해석할 수 없습니다. 다중 파일 프로젝트 지원은 roadmap에 있으며, 단일 파일 내부의 ESM 문법은 정상 동작합니다.

#### 왜 최소 버전이 Android 13인가요?

Bun은 Linux의 `close_range` system call (syscall 436)을 호출하는데, Android 12L 이하의 앱 seccomp allowlist에는 이 호출이 없어 Bun 프로세스가 `SIGSYS`로 종료됩니다 (API 31 실제 기기에서 재현됨). Android 13은 이 호출을 허용하며, API 33 및 API 35 실제 기기 테스트는 통과했습니다. 더 낮은 버전을 지원하려면 Bun 자체에 patch가 필요합니다. 진행 상황은 roadmap을 참고하세요.

#### 스크립트가 timeout되거나 출력이 너무 많으면 어떻게 되나요?

실행은 기본적으로 60 seconds으로 제한됩니다. timeout 시 Bun 프로세스가 종료되고 결과에 timeout으로 표시됩니다. stdout과 stderr 합산 출력이 8 MiB를 초과하면 실행은 조용히 잘리는 대신 출력 한도 오류로 끝납니다. 두 경우 모두 작업을 나누거나 출력량을 줄이세요.

#### 16 KB page-size 기기를 지원하나요?

패키징된 두 ELF executable과 모든 APK entry는 16 KB alignment gate를 통과합니다. Android 16 (API 36) 16 KB AVD에서 `arm64-v8a` APK는 `libndk_translation`을 통해 전체 Binder suite 5개를 통과했지만, native `x86_64` payload는 최소 script에서도 exit code 134로 중단되며 native arm64는 아직 검증하지 않았습니다. 이는 부분 증거이므로 이 release는 일반적인 16 KB 지원을 아직 주장하지 않습니다.

#### 어떤 APK를 설치해야 하나요?

대부분의 휴대전화와 태블릿은 `arm64-v8a`를 사용합니다. emulator나 x86_64 기기는 baseline `x86_64`를 사용하세요. 확실하지 않으면 두 ABI를 모두 포함하는 `universal`을 설치하세요. 조금 더 크지만 가장 안전한 선택입니다.

******

### 호환성

******

- 엔진: 공식 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 시스템: Android 13 (API 33) 이상이며, `arm64-v8a`와 baseline `x86_64`용 공식 64-bit executable을 제공합니다. Android 9부터 12L (API 28부터 32)은 아직 지원되지 않으며, 이유는 위의 FAQ에서 설명합니다. API 33 및 API 35 실제 기기 테스트는 통과했습니다.
- 호스트: AutoJs6 build 5278 이상, Bun runtime contract version 1.
- 실행별 한도: source 최대 16 MiB, stdout과 stderr 합산 출력 최대 8 MiB, 기본 timeout 60 seconds.
- 패키지: single-ABI APK는 설치 용량이 더 작고, 더 큰 `universal` APK에는 지원되는 두 ABI가 모두 포함됩니다.

******

### 권한 및 무결성

******

- Export된 활성화 (Wake), info, runtime component는 `org.autojs.permission.PLUGIN`으로 보호되며, AutoJs6는 일반적인 plugin authorization check도 계속 수행합니다.
- 스크립트 snapshot은 실행별 private directory에 저장되고, Bun executable은 쓰기 가능한 저장소로 복사되는 대신 Android의 read-only native library directory에서 시작됩니다.
- Repository lock은 공식 release archive와 APK에 패키징된 binary를 모두 기록하며, CI는 build 전에 크기, SHA-256, ELF 속성의 어떤 변동도 거부합니다.
- 신뢰된 Bun 스크립트가 `fetch` 같은 network API를 사용할 수 있으므로 플러그인은 Internet permission을 선언합니다. 플러그인은 sandbox가 아니므로 신뢰하는 스크립트만 실행하세요.

******

### 플러그인 인터페이스

******

이 절은 AutoJs6 호스트 및 플러그인 개발자를 위한 내용이며 일반 사용자는 건너뛰어도 됩니다. 안정적인 identifier와 한도는 다음과 같습니다:

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

`BunRuntimeService`는 action `org.autojs.plugin.bun.RUNTIME` 및 category `bun`로 검색됩니다. `ParcelFileDescriptor`로 source를 받고 request로 execution ID를 받은 뒤 synchronous `runScript` call이 active인 동안 `bun run --no-install <source>`를 실행합니다. Stdout과 stderr는 oneway callback을 통해 bounded chunk로만 전송합니다. Returned terminal Bundle과 `finished` event에는 status 및 diagnostic summary field만 포함되고 complete output stream은 포함되지 않으므로 각 Binder transaction이 size limit 아래로 유지됩니다. Service는 explicit cancel과 runtime prewarming을 지원하며 `:bun_runtime`에서 실행됩니다.

16 KB status: 두 ELF payload와 APK entry는 alignment gate를 통과합니다. Android 16 (API 36) 16 KB AVD에서 `arm64-v8a`는 `libndk_translation`을 통해 Binder test 5개를 모두 통과했지만, native `x86_64`는 최소 script에서도 exit code 134로 중단되며 native arm64는 아직 검증하지 않았습니다. 일반적인 16 KB 지원은 주장하지 않습니다.

******

### 로드맵

******

Roadmap은 두 가지 질문에 답합니다: 지금 무엇이 동작하고 다음에 무엇이 오는지. 체크된 항목은 현재 버전의 실제 동작을 설명하며, 체크되지 않은 항목 (다중 파일 프로젝트, AutoJs6 capability bridge, 더 넓은 Android 버전 지원, Bun upgrade 등)은 계획일 뿐 현재 지원을 약속하지 않습니다.

- [ROADMAP.md 보기](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 릴리스 기록

******

#### v0.2.0

_2026/09/01_

- `힌트` 이번 버전은 최소 시스템 요구 사항을 Android 14에서 Android 13 (API 33)으로 낮췄습니다. Android 9부터 12L (API 28부터 32)은 patch된 Bun runtime이 이식성 검증을 통과할 때까지 계속 지원되지 않습니다
- `수정` 설치된 runtime ABI를 ABI table iteration 순서가 아닌 locked payload SHA-256으로 식별하고, prewarming에서 최소 JavaScript smoke test를 실행해 사용할 수 없는 runtime을 user script 시작 전에 거부
- `수정` Android가 4 KiB보다 큰 page를 사용할 때 pinned JavaScriptCore의 4 KiB page-size ceiling으로 원인이 확인된 호환 불가 공식 x86_64 runtime을 process 시작 전에 거부하고, 결정적인 Bun abort를 제한된 진단으로 대체
- `개선` 최소 시스템 요구 사항 인하: 고정된 공식 Bun 1.4.0 Android payload를 그대로 사용하면서 지원 하한을 Android 14 (API 34)에서 Android 13 (API 33)으로 완화하여 더 많은 기기를 지원
- `개선` 구버전에서 동작하지 않는 근본 원인 규명: Android 13부터 시스템 seccomp가 Bun이 호출하는 raw `close_range` syscall을 허용하며, API 31 실제 기기 실패는 API 28부터 32까지는 Bun 자체 수정이 필요하고 manifest 변경만으로는 해결할 수 없음을 증명
- `개선` 향후 Android 9+ 지원을 위한 기반 마련: 정확히 재현 가능한 Bun 소스 patch 방식 (patch 6개)을 수립하고 빌드 입력을 고정 (NDK와 컨테이너 고정, Android release 활성 의존성 22개); 이 작업은 별도의 실험 라인을 만들며 현재 패키지의 공식 runtime을 변경하지 않음
- `개선` 패키지 품질 검사 강화: 모든 Debug 및 Release APK에서 16 KB ZIP alignment, 정확한 ABI 내용, 고정 Bun payload의 크기와 SHA-256을 검증하고 Android 13 테스트 기기에서 설치된 payload 바이트를 대조
- `개선` 공급망 강화: Bun source archive 19개와 toolchain 다운로드 17개의 정확한 바이트를 고정하고, Cargo 181개와 Bun registry integrity 항목 172개를 목록화하며, 덮어쓰기를 거부하는 materializer와 `buildReady` 게이트로 보호되는 듀얼 ABI 빌드 preflight를 추가
- `개선` 복사해 바로 실행할 수 있는 예제 모음 확장: 네트워크 fetch, 비공개 작업 공간 파일 입출력, stdout/stderr 스트리밍, 더 실용적인 TypeScript 타입 예제를 주석과 함께 추가하고, 첫 줄 `"bun";` 지시문과 단일 소스 및 설치 금지 경계를 문서 게이트로 검증
- `개선` PAGE_SIZE=16384를 강제한 Android 16 (API 36) AVD에서 16 KB execution 검증: `arm64-v8a` single-ABI APK는 `libndk_translation`을 통해 Binder instrumentation 5개를 모두 통과했지만, native `x86_64` payload는 최소 script에서도 exit code 134로 중단되므로 일반적인 16 KB 지원은 주장하지 않음
- `개선` Android 9+ 실험 빌드 공급망의 Cargo 부분 완결: crates.io archive 181개 (총 26,354,160 bytes)를 잠그고 실제로 내려받아 파일별 checksum이 있는 directory source를 생성했으며, 고정 Cargo가 빈 `CARGO_HOME`에서 전체 Bun workspace를 `--locked --offline`으로 읽는 것을 검증; 이 결과는 Cargo 입력만 다루며 나머지 빌드 입력을 단독으로 완결하지 않음
- `개선` 동일 공급망의 Bun registry 부분 완결: lock reference 172개를 Linux x64용 고유 npm archive 125개 (총 31,498,870 bytes)로 해석하고, 잠긴 tarball만으로 최소 cache를 재구성했으며, network가 차단되고 cache가 읽기 전용인 고정 Ubuntu container에서 세 번의 frozen install을 모두 통과; 신뢰되는 postinstall 의존성은 `esbuild@0.21.5` 하나뿐
- `개선` patched runtime을 배포하지 않은 채 재현 가능한 build gate 완결: host `.deb` archive 155개 (422,223,096 bytes)를 반복 생성 가능한 OCI image로 잠그고, Cargo closure를 고유 archive 206개로 확장했으며, 두 64-bit ABI를 network 차단 clean 환경에서 각각 두 번 build해 byte-for-byte 동일한 결과를 확인하고 pure Node ELF audit도 잠금; API 28과 31의 직접 shell probe는 통과했지만 APK와 application process gate는 아직 열려 있음
- `개선` release 승인을 주장하지 않고 patched runtime의 대응 source input 잠금: Bun base source의 bytes와 SHA-256, WebKit/JSC의 정확한 tag, commit, tree 및 463,115-file inventory를 검증하고, 일치하는 license text 5개를 포함했으며, native 19개, Cargo 206개, npm 125개의 source archive를 교차 확인; 실제 source 공개와 release별 법률 검토는 여전히 필요함
- `의존성` Release R8이 공유 Parcelable contract class를 유지하도록 Kotlin Parcelize runtime 추가

#### v0.1.0

_2026/09/01_

- `힌트` 첫 릴리스: 각 실행은 독립 스크립트 파일 하나를 실행하며, AutoJs6 내장 함수, Java bridge, 다중 파일 프로젝트, 상대 경로 import는 아직 제공되지 않습니다
- `기능` 독립 `bun` 엔진 추가: 스크립트 첫 줄에 `"bun";`만 단독으로 쓰면 공식 Bun 1.4.0 Android executable로 JavaScript와 TypeScript를 실행. 실제 명령은 `bun run --no-install <source>`이며 의존성을 자동으로 설치하지 않음
- `기능` 실행 출력을 실시간으로 반환: stdout과 stderr는 유계 oneway Binder callback으로 청크 단위 스트리밍되고, 최종 결과는 상태와 진단 정보만 보고하며 전체 출력 스트림을 담지 않음
- `기능` 실행 제어 가능: 스크립트는 격리된 `:bun_runtime` 플러그인 프로세스에서 실행되며 명시적 취소, 60초 기본 timeout, runtime 정보 조회, prewarming을 지원
- `기능` `arm64-v8a`와 baseline `x86_64` 공식 64-bit Android payload 및 단일 ABI와 `universal` 패키지 제공
- `기능` 완전한 플러그인 경험 제공: 플러그인 검색, 권한으로 보호되는 활성화 (Wake), 완전한 PluginInfo metadata, 10개 언어 사용자 문서
- `개선` 버전 관리되는 Binder contract를 채택하여 ParcelFileDescriptor로 소스를 전송. 소스 상한 16 MiB, 합산 출력 상한 8 MiB
- `개선` Android의 읽기 전용 native library 디렉터리에서 Bun을 시작하고, 고정 release archive와 패키징된 binary의 크기, SHA-256, ELF 속성을 검증
- `개선` 패키징된 두 executable의 PT_LOAD alignment가 모두 16 KB 이상임을 검증하면서, 실제 16 KB Android 환경 테스트는 아직 완료되지 않았음을 명확히 기록
- `개선` 검증된 JSON 소스에서 README, plugin center 안내, 내장 changelog를 생성하고 빌드, Markdown, runtime artifact CI 검사를 추가
- `개선` 최소 버전을 잠정적으로 Android 14 (API 34)로 설정: API 31 실제 기기에서 Bun의 `close_range` syscall이 seccomp에 의해 `SIGSYS`로 종료되었고, Sony API 33 기기 한 대는 예상외로 통과했지만 이식성을 증명하기에 부족하며, API 35 실제 기기 JS 및 TS Binder 왕복 테스트는 통과

##### 더 많은 릴리스 기록

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ko.md)

******

### Build 및 검증

******

Verification 또는 Gradle packaging 전에 Git LFS가 고정된 runtime binary 두 개를 materialize해야 합니다. 표준 local check는 아래와 같습니다. JDK 17 이상, Node.js 및 Android SDK 36이 필요합니다.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### 현지화 및 문서 생성

******

JSON 및 Markdown template를 수정한 뒤 `py .python/generate_markdown.py`를 실행합니다. 생성된 README, changelog 또는 plugin-instruction file을 직접 수정하지 마세요. `--check`는 file을 쓰지 않고 language shape, version alignment, localized resource, orphan artifact 및 generated-file drift를 검증합니다.

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

### 라이선스

******

Plugin code는 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE)을 사용합니다. Bundled official Bun executable에는 MIT licensed Bun code, LGPL-2로 statically linked된 JavaScriptCore와 WebKit, 그리고 자체 license를 사용하는 다른 third-party component가 포함됩니다. [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 및 pinned Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md)를 확인하세요.

******

### 링크

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 공식 사이트: https://bun.sh/
- 고정 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 서드 파티 고지: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
