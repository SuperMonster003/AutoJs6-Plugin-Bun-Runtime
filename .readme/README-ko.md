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

플러그인의 동작 방식은 단순합니다. AutoJs6가 스크립트 내용을 플러그인에 보내면, 플러그인은 격리된 자체 프로세스에서 공식 Bun Android executable을 시작하고, 출력과 최종 결과를 실시간으로 AutoJs6 콘솔에 돌려보냅니다. 이는 진짜 Bun이며 Rhino나 Node.js 위의 alias 또는 에뮬레이션 레이어가 아닙니다. Android 17 이상에서는 AutoJs6 플러그인 센터에서 이 플러그인을 켜기 전에 주변 기기 권한을 허용하세요. 이 플러그인의 설정 페이지에서도 로컬 네트워크 권한을 관리할 수 있습니다. 권한이 없으면 플러그인이 꺼진 상태로 유지되고 자동 시작은 알림 없이 건너뜁니다. 이 권한은 플러그인에 속하며 AutoJs6 권한과 별개입니다.

******

### 설치 및 사용

******

1. 환경 준비: Android 13 (API 33) 이상에서 AutoJs6 build 5278 (6.8.0) 이상을 설치합니다.
2. 플러그인 설치: [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases)에서 기기에 맞는 APK를 내려받아 설치합니다. 대부분의 휴대전화와 태블릿은 `arm64-v8a`, emulator 또는 x86_64 기기는 `x86_64`, 확실하지 않으면 `universal`을 선택합니다 (조금 더 크지만 둘 다에서 동작합니다).
3. 플러그인 활성화: AutoJs6 plugin center를 열고 Bun Runtime을 활성화합니다. 새로 설치한 플러그인이 중지 상태로 표시되면 호스트가 보여주는 `활성화` action을 누릅니다.
4. 스크립트 실행: JavaScript 또는 TypeScript 파일의 첫 줄에 `"bun";`만 단독으로 넣고 (따옴표와 세미콜론 포함), 평소처럼 AutoJs6에서 그 파일을 실행합니다.

> 프로젝트 파일은 작업 공간 아카이브를 협상하는 호스트가 필요합니다. 지원 시 project.json/package.json 아래 스크립트에서 상대 가져오기를 사용할 수 있으며, 그렇지 않으면 단일 소스 스냅샷만 전송합니다. 의존성을 자동 설치하지 않습니다 (--no-install).

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
- 호스트 클라이언트의 OpenCC 변환 및 일반 이미지 API, 픽셀 읽기, 인코딩, 변환, 색상 검색과 실행별 이미지 핸들 정리 지원; 호스트 이미지 파일 접근은 별도 권한이며 기본적으로 꺼짐.
- Bun에서 별도 허용이 필요한 화면 캡처, Android 승인, 시간 초과/취소 정리 및 재요청 지원.
- Bun screenRecorder에서 H.264 MP4 녹화, 선택적 마이크/앱 재생/혼합 AAC 오디오 및 녹화 중 화면 캡처 지원, 별도 오디오 허용과 취소 정리 포함.
- Bun 접근성, 앱 작업 및 클립보드 API를 Node.js 인터페이스에 맞추고 개별 권한과 패키징 앱 지원.
- Bun 파일 및 영구 저장소 API, 별도의 호스트 파일 권한과 Node.js 저장소 공유 지원.

******

### 현재 제한

******

- 프로젝트 파일은 작업 공간 아카이브를 협상하는 호스트가 필요합니다. 지원 시 project.json/package.json 아래 스크립트에서 상대 가져오기를 사용할 수 있으며, 그렇지 않으면 단일 소스 스냅샷만 전송합니다. 의존성을 자동 설치하지 않습니다 (--no-install).
- Rhino 전역 객체는 주입되지 않습니다. 문서화된 텍스트, 이미지, 화면 캡처, UI/Compose, WebView 및 자동화 호스트 API는 명시적 SDK로 사용합니다. 나열되지 않은 API와 임의의 Java 객체는 지원하지 않습니다.
- Java bridge 없음: Bun 스크립트는 AutoJs6 프로세스의 Java class나 object에 직접 접근할 수 없습니다.
- 전체 Bun toolchain 보장 없음: `bunx`, 기기에서의 executable 생성, runtime C compilation, 임의 native addon은 지원 범위 밖입니다.
- Security sandbox 아님: Bun 스크립트는 플러그인 프로세스에서 신뢰된 코드로 실행되며 플러그인에 부여된 permission을 사용할 수 있으므로, 신뢰하는 스크립트만 실행하세요.

******

### FAQ

******

#### 왜 Bun 스크립트에서 `click()`, `toast()` 같은 AutoJs6 함수를 사용할 수 없나요?

`process.env.AUTOJS6_HOST_CLIENT_MODULE`을 가져오고 `createHostClient()`를 기다립니다. 호스트 build 5572와 Bun Runtime 0.3.0은 `host.app`, `host.accessibility`, `host.clipboard`를 제공합니다. 플러그인 센터에서 개별 권한을 켜고 제스처에는 `accessibility.gesture`도 허용합니다. 패키징 프로젝트도 같은 권한을 선언합니다. Android 접근성 승인과 클립보드 포그라운드 제한은 계속 적용됩니다. 전체 인터페이스와 제한은 [Host API](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/host-api.md)를 참고하세요. Bun 파일 및 영구 저장소 API, 별도의 호스트 파일 권한과 Node.js 저장소 공유 지원. (`host.files`, `host.storage`, `host.storages`; `files.control`, `storage.control`.)

#### npm 패키지를 사용할 수 있나요?

기기에서 설치하는 방식으로는 불가능합니다. 플러그인은 항상 `--no-install`로 실행되며 dependency를 내려받지 않습니다. 서드 파티 라이브러리가 꼭 필요하면 먼저 컴퓨터에서 `bun build` 등으로 스크립트와 순수 JS dependency를 한 파일로 번들한 뒤 그 파일을 기기에서 실행하세요. native addon에 의존하는 패키지는 이 방식으로 사용할 수 없습니다.

#### 스크립트가 프로젝트의 다른 파일을 `import`할 수 있나요?

프로젝트 파일은 작업 공간 아카이브를 협상하는 호스트가 필요합니다. 지원 시 project.json/package.json 아래 스크립트에서 상대 가져오기를 사용할 수 있으며, 그렇지 않으면 단일 소스 스냅샷만 전송합니다. 의존성을 자동 설치하지 않습니다 (--no-install).

#### 왜 최소 버전이 Android 13인가요?

Bun은 Linux의 `close_range` system call (syscall 436)을 호출하는데, Android 12L 이하의 앱 seccomp allowlist에는 이 호출이 없어 Bun 프로세스가 `SIGSYS`로 종료됩니다 (API 31 실제 기기에서 재현됨). Android 13은 이 호출을 허용하며, API 33 및 API 35 실제 기기 테스트는 통과했습니다. 더 낮은 버전을 지원하려면 Bun 자체에 patch가 필요합니다. 진행 상황은 roadmap을 참고하세요.

#### 스크립트가 timeout되거나 출력이 너무 많으면 어떻게 되나요?

실행은 기본적으로 60 seconds으로 제한됩니다. timeout 시 Bun 프로세스가 종료되고 결과에 timeout으로 표시됩니다. stdout과 stderr 합산 출력이 8 MiB를 초과하면 실행은 조용히 잘리는 대신 출력 한도 오류로 끝납니다. 두 경우 모두 작업을 나누거나 출력량을 줄이세요.

#### 16 KB page-size 기기를 지원하나요?

16 KB: ELF와 APK 정렬 검사를 통과합니다. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384)에서 공식 Bun을 사용하는 v0.2.1 개발용 arm64 전용 APK가 변환 없이 Binder 테스트 8개를 두 차례 모두 통과했습니다. 이전 x86_64 AVD의 ARM64 결과는 여전히 변환 실행 증거이며, 네이티브 x86_64는 최소 스크립트에서도 종료 코드 134로 중단됩니다. 이는 해당 기기와 개발 빌드에 한정된 증거로, 게시된 Release APK 검증이나 일반적인 16 KB 지원을 뜻하지 않습니다.

#### 어떤 APK를 설치해야 하나요?

대부분의 휴대전화와 태블릿은 `arm64-v8a`를 사용합니다. emulator나 x86_64 기기는 baseline `x86_64`를 사용하세요. 확실하지 않으면 두 ABI를 모두 포함하는 `universal`을 설치하세요. 조금 더 크지만 가장 안전한 선택입니다.

#### 설치 및 실행 문제는 어디에서 확인하나요?

[문제 해결 가이드 (중국어)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md)에서 최소 스크립트, 활성화, Android/ABI/페이지 크기, 시간 초과, 출력 제한, 가져오기 점검 방법과 문제 보고에 필요한 정보를 확인하세요.

******

### 호환성

******

- 엔진: 공식 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- 시스템: Android 13 (API 33) 이상이며, `arm64-v8a`와 baseline `x86_64`용 공식 64-bit executable을 제공합니다. Android 9부터 12L (API 28부터 32)은 아직 지원되지 않으며, 이유는 위의 FAQ에서 설명합니다. API 33 및 API 35 실제 기기 테스트는 통과했습니다.
- 호스트: AutoJs6 build 5278 이상, Bun runtime contract version 1.
- 실행별 한도: source 최대 16 MiB, stdout과 stderr 합산 출력 최대 8 MiB, 기본 timeout 60 seconds.
- 패키지: single-ABI APK는 설치 용량이 더 작고, 더 큰 `universal` APK에는 지원되는 두 ABI가 모두 포함됩니다.
- 테스트 근거: [자동 생성 호환성 매트릭스 (중국어)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md)에서 기록된 각 테스트 묶음의 기기, API, ABI, 페이지 크기와 결과를 확인할 수 있습니다. 공식, 실험, 번역 실행 및 실패 기록은 각자의 검증 범위를 유지하며, 공개된 지원 범위를 넓히지 않습니다.

******

### 권한 및 무결성

******

- 별도로 고정된 읽기 전용 감독 프로세스가 SIGTERM을 무시하는 스크립트의 시간 초과, 취소 및 출력 한도도 처리합니다. 직접 생성한 Bun 자식을 회수하며, 보안 샌드박스나 임의의 분리된 하위 프로세스 관리자는 아닙니다.
- Export된 활성화 (Wake), info, runtime component는 `org.autojs.permission.PLUGIN`으로 보호되며, AutoJs6는 일반적인 plugin authorization check도 계속 수행합니다.
- 스크립트 snapshot은 실행별 private directory에 저장되고, Bun executable은 쓰기 가능한 저장소로 복사되는 대신 Android의 read-only native library directory에서 시작됩니다.
- Repository lock은 공식 release archive와 APK에 패키징된 binary를 모두 기록하며, CI는 build 전에 크기, SHA-256, ELF 속성의 어떤 변동도 거부합니다.
- 신뢰된 Bun 스크립트가 `fetch` 같은 network API를 사용할 수 있으므로 플러그인은 Internet permission을 선언합니다. 플러그인은 sandbox가 아니므로 신뢰하는 스크립트만 실행하세요.

******

### 실행 오류 및 문제 해결

******

메시지는 플러그인의 Android 언어 설정을 따릅니다. 저수준 진단 세부 정보와 Bun 출력은 영어로 표시될 수 있습니다.

- Bun Runtime이 활성화되거나 사용 설정되지 않았다면 AutoJs6의 플러그인 센터에서 플러그인을 승인하고 사용 설정하세요. 호스트에 활성화 작업이 표시되면 실행하세요.
- 공식 플러그인은 Android 13 (API 33) 이상이 필요합니다. Android 9부터 12L까지는 실행할 수 없습니다. 매니페스트 요구 사항을 낮춰도 런타임이 호환되지는 않습니다.
- `TIMEOUT`: Bun 실행 시간이 초과되었습니다. 작업을 줄이거나 허용된 범위 내에서 실행 제한 시간을 조정하세요.
- `OUTPUT_LIMIT`: Bun 출력이 설정된 바이트 제한을 초과했습니다. stdout과 stderr 출력을 줄인 후 스크립트를 다시 실행하세요.
- `RUNTIME_UNAVAILABLE`: Bun Runtime을 사용할 수 없습니다. 기기 호환성을 확인하고 파일이 불완전하면 플러그인을 다시 설치하세요.

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

16 KB: ELF와 APK 정렬 검사를 통과합니다. Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384)에서 공식 Bun을 사용하는 v0.2.1 개발용 arm64 전용 APK가 변환 없이 Binder 테스트 8개를 두 차례 모두 통과했습니다. 이전 x86_64 AVD의 ARM64 결과는 여전히 변환 실행 증거이며, 네이티브 x86_64는 최소 스크립트에서도 종료 코드 134로 중단됩니다. 이는 해당 기기와 개발 빌드에 한정된 증거로, 게시된 Release APK 검증이나 일반적인 16 KB 지원을 뜻하지 않습니다.

******

### 로드맵

******

Roadmap은 두 가지 질문에 답합니다: 지금 무엇이 동작하고 다음에 무엇이 오는지. 체크된 항목은 현재 버전의 실제 동작을 설명하며, 체크되지 않은 항목 (다중 파일 프로젝트, AutoJs6 capability bridge, 더 넓은 Android 버전 지원, Bun upgrade 등)은 계획일 뿐 현재 지원을 약속하지 않습니다.

- [ROADMAP.md 보기](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 릴리스 기록

******

#### v0.4.0

_2026/10/19_

- `기능` Bun 파일 및 영구 저장소 API, 별도의 호스트 파일 권한과 Node.js 저장소 공유 지원

#### v0.3.0

_2026/10/19_

- `기능` Bun 접근성, 앱 작업 및 클립보드 API를 Node.js 인터페이스에 맞추고 개별 권한과 패키징 앱 지원

#### v0.2.14

_2026/10/18_

- `기능` Node.js/Bun WebView 화면 공유 어댑터, 포그라운드 서비스 녹음 및 네이티브 백그라운드 카메라 녹화, Node Worker 지원

##### 더 많은 릴리스 기록

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ko.md)

******

### Build 및 검증

******

Verification 또는 Gradle packaging 전에 Git LFS가 고정된 runtime binary 두 개를 materialize해야 합니다. 표준 local check는 아래와 같습니다. JDK 17 이상, Node.js 및 Android SDK 36이 필요합니다.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

Plugin code는 [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE)을 사용합니다. Bundled official Bun executable에는 MIT licensed Bun code, LGPL-2로 statically linked된 JavaScriptCore와 WebKit, 그리고 자체 license를 사용하는 다른 third-party component가 포함됩니다. 해당 Release는 공개 license/relinking notice와 일치하는 대응 source assets를 APK와 분리하되 같은 Release에 두고, 자동화 기술 검사로 검증된 machine-readable manifest와 SHA256SUMS를 제공합니다. [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) 및 pinned Bun [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md)를 확인하세요.

******

### 링크

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun 공식 사이트: https://bun.sh/
- 고정 Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- 서드 파티 고지: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
