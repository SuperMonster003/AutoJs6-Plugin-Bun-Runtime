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

Bun Runtime은 AutoJs6가 [Bun](https://bun.sh/)을 별도의 JavaScript 및 TypeScript 엔진으로 선택할 수 있게 하는 독립 Android 플러그인입니다. 호스트는 file descriptor로 하나의 source snapshot을 보내고, 플러그인은 고정된 공식 Bun Android executable을 전용 runtime process에서 시작합니다. stdout, stderr, 완료, timeout, cancel event는 Binder로 돌아옵니다. 이는 실제 Bun 실행이며 Rhino 또는 Node.js의 alias가 아닙니다.

******

### 기능

******

- 독립 엔진: 코드를 다른 AutoJs6 엔진으로 전달하지 않고 공식 Bun 1.4.0 Android executable을 실행합니다.
- JavaScript 및 TypeScript: 고정 Android build에서 제공하는 ESM syntax와 Bun API를 포함해 하나의 JS 또는 TS source snapshot을 Bun이 분석하고 실행합니다.
- 관찰 가능한 실행: stdout과 stderr를 호스트로 stream하며 최종 결과는 exit status, duration, timeout, cancel 및 제한된 diagnostic을 보고합니다.
- 통제된 runtime payload: `arm64-v8a` 및 `x86_64` binary는 tag, commit, size, SHA-256, ELF machine 및 최소 PT_LOAD alignment로 고정됩니다.
- 현지화 제공: plugin metadata, plugin center instruction, README 및 changelog를 하나의 검증된 source set에서 10개 언어로 제공합니다.

******

### 설치 및 사용

******

1. Android 13 (API 33) 이상에서 AutoJs6 build 5278 (6.8.0) 이상을 사용합니다.
2. 기기 ABI와 일치하는 release APK를 설치합니다. 대부분의 휴대전화와 태블릿은 `arm64-v8a`, 호환 emulator 또는 device는 `x86_64`, 확실하지 않으면 `universal`을 선택합니다.
3. AutoJs6 plugin center를 열고 Bun Runtime을 활성화합니다. 새로 설치한 플러그인이 중지 상태이면 호스트가 표시하는 `활성화` action을 사용합니다.
4. JavaScript 또는 TypeScript file의 시작에 독립 directive `"bun";`를 넣고 AutoJs6에서 평소와 같이 실행합니다.

> Version 0.1은 request마다 `bun run --no-install <source>`로 하나의 immutable source snapshot을 실행하며 누락 dependency를 자동 install하지 않습니다. 기존 Rhino 또는 Node.js project를 Bun으로 옮기기 전에 아래 제한을 확인하세요.

******

### 빠른 시작

******

이 file을 실행하여 호스트가 Bun을 선택하고 Android runtime이 시작되었는지 확인합니다:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

예상 출력은 `Bun 1.4.0`으로 시작하고 다음 줄에 `android`를 표시합니다.

Bun이 TypeScript를 직접 처리하므로 호스트 측 TypeScript compilation은 필요하지 않습니다:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### 호환성

******

- Runtime: 공식 Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Platform: Android 13 (API 33) 이상. 공식 64-bit payload는 `arm64-v8a` 및 baseline `x86_64`를 지원합니다. API 31 real device에서는 Bun syscall 436 `close_range`가 app seccomp `SIGSYS`로 실패했습니다. AOSP Android 12 이하 app allowlist에는 이 syscall이 없지만 Android 13 (T, API 33)은 raw syscall을 허용합니다. Android 14는 public bionic wrapper를 추가하지만 Bun은 raw syscall을 호출하므로 API 34 libc symbol이 필요하지 않습니다. API 33 및 API 35 real runtime test는 통과했습니다. API 28부터 32는 patched Bun runtime이 seccomp trap을 처리하고 portable validation을 통과할 때까지 지원되지 않습니다.
- Host contract: AutoJs6 build 5278 이상 및 Bun runtime contract version 1.
- Request limit: source는 최대 16 MiB, stdout 및 stderr combined streaming budget은 최대 8 MiB, default timeout은 60 seconds입니다.
- Package: single-ABI APK는 더 작고 큰 `universal` APK에는 지원하는 두 ABI가 모두 포함됩니다.

******

### Version 0.1 제한

******

- 하나의 source snapshot만 지원: 이 release에서는 multi-file project transfer와 relative project import를 구현하지 않았습니다.
- AutoJs6 globals 없음: Rhino globals, Android automation API 및 host object는 Bun 안에 나타나지 않습니다.
- Java bridge 없음: Bun은 AutoJs6 process의 Java class 또는 object에 직접 접근할 수 없습니다.
- 전체 toolchain 보장 없음: `bunx`, 기기에서 생성한 executable, runtime C compilation 및 임의 native addon은 지원 범위 밖입니다.
- Security sandbox가 아님: Bun script는 plugin app UID의 trusted code로 실행되며 plugin에 부여된 permission을 사용할 수 있습니다.

******

### 권한 및 무결성

******

- Export된 Wake, info 및 runtime component는 `org.autojs.permission.PLUGIN`으로 보호됩니다. AutoJs6는 일반 plugin authorization check도 계속 수행합니다.
- Source snapshot은 실행별 private directory에 배치됩니다. Executable은 Android의 read-only native library directory에서 시작되며 writable storage로 복사해 실행하지 않습니다.
- Repository lock은 공식 release archive와 packaged binary를 모두 기록합니다. CI는 build 전에 size, SHA-256, ELF type, machine 또는 alignment drift를 거부합니다.
- Trusted Bun script가 `fetch` 같은 network API를 사용할 수 있도록 plugin은 Internet permission을 선언합니다. Plugin은 sandbox가 아니므로 신뢰하는 script만 실행하세요.

******

### FAQ

******

#### Bun에 AutoJs6 globals가 없는 이유는 무엇인가요?

Bun은 별도 process와 JavaScript engine이며 Rhino compatibility layer가 아닙니다. 향후 host bridge는 각 automation capability를 명시적으로 노출해야 하며 version 0.1은 의도적으로 bridge를 제공하지 않습니다.

#### Script에서 다른 local project file을 import할 수 있나요?

Version 0.1에서는 불가능합니다. Contract는 하나의 source snapshot만 전송하고 project tree는 아직 전송하지 않으므로 relative project import를 해결할 수 없습니다. Single-file ESM syntax는 지원합니다.

#### 16 KB page-size device를 지원하나요?

Packaged ELF executable 두 개의 PT_LOAD alignment는 모두 최소 16 KB입니다. 실제 16 KB Android runtime test는 아직 완료하지 않았으므로 end-to-end 지원이 검증되었다고 주장하지 않습니다.

#### 어떤 APK를 설치해야 하나요?

대부분의 실제 Android device는 `arm64-v8a`를 사용합니다. 호환 emulator 또는 x86_64 device는 baseline `x86_64`를 사용하세요. `universal`은 둘 다 포함하므로 ABI를 모를 때 안전한 선택입니다.

******

### 플러그인 인터페이스

******

다음 stable identifier와 limit는 AutoJs6 host 및 plugin developer를 위한 정보입니다:

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

16 KB status: packaged `arm64-v8a` 및 `x86_64` ELF의 PT_LOAD segment는 16 KB alignment requirement를 충족합니다. 실제 16 KB Android device 또는 emulator에서 아직 실행하지 않았으므로 ELF alignment만 검증되었습니다.

******

### 로드맵

******

Roadmap은 현재 동작과 planned project snapshot, 제한된 AutoJs6 capability bridge, 더 넓은 Android validation 및 향후 Bun upgrade를 구분합니다. 선택되지 않은 항목은 계획이며 현재 지원을 의미하지 않습니다.

- [ROADMAP.md 보기](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### 릴리스 기록

******

#### v0.2.0

_2026/09/01_

- `힌트` Android 13 (API 33)이 이제 공식 minimum target이며 API 28부터 32는 patched Bun runtime이 portable validation을 통과할 때까지 지원되지 않습니다
- `개선` 고정된 공식 Bun 1.4.0 Android payload를 유지하면서 지원 Android 하한을 Android 14 (API 34)에서 Android 13 (API 33)으로 변경
- `개선` AOSP T seccomp 경계를 문서화: Android 13은 Bun의 raw `close_range` syscall을 허용하며 API 31 실패를 통해 API 28부터 32에는 manifest-only change가 아닌 Bun compatibility patch가 필요함을 확인

#### v0.1.0

_2026/09/01_

- `힌트` 첫 release는 하나의 source snapshot을 실행하며 AutoJs6 globals, Java bridge, multi-file project 또는 relative project import를 제공하지 않습니다
- `기능` 공식 Bun 1.4.0 Android executable을 독립 `bun` engine으로 사용해 JavaScript와 TypeScript를 실행하고 `"bun";` directive와 `bun run --no-install <source>`로 dependency 자동 install 방지
- `기능` Stdout과 stderr를 bounded oneway Binder callback chunk로만 stream하고 terminal result는 complete output stream 없이 status 및 diagnostic만 보고
- `기능` 격리된 `:bun_runtime` plugin process에서 explicit cancellation, default 60초 timeout, runtime information 및 prewarming 지원
- `기능` `arm64-v8a` 및 baseline `x86_64` 공식 64-bit Android payload와 single-ABI 및 `universal` package 제공
- `기능` Plugin discovery, 보호된 Wake activation, 완전한 PluginInfo metadata 및 10개 언어 user documentation 제공
- `개선` Versioned Binder contract와 ParcelFileDescriptor source transport를 사용하고 source limit 16 MiB 및 combined output limit 8 MiB 적용
- `개선` Android read-only native library directory에서 Bun을 시작하고 고정 release archive와 packaged binary의 size, SHA-256, ELF type, machine 및 alignment 검증
- `개선` 두 packaged executable의 PT_LOAD alignment가 최소 16 KB임을 검증하고 실제 16 KB Android runtime test가 완료되지 않았음을 명시
- `개선` Validated JSON source에서 README, plugin-center instruction 및 built-in changelog asset을 생성하고 build, Markdown 및 runtime artifact CI check 추가
- `개선` API 31 real device에서 Bun syscall 436 `close_range`가 app seccomp `SIGSYS`로 종료되어 Android 14 (API 34)를 요구. Sony API 33 device 한 대는 예상과 달리 통과했지만 portable evidence가 아니며 API 35의 JS 및 TS Binder round trip은 통과했고 lower version은 upstream fallback 대기

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
