이 플러그인은 AutoJs6가 공식 Bun 1.4.0 엔진으로 JavaScript와 TypeScript를 실행하게 합니다. 스크립트 첫 줄에 `"bun";`를 넣으면 그 파일은 격리된 플러그인 프로세스의 Bun이 실행하고 (실제 명령은 `bun run --no-install <source>`), 출력과 최종 결과가 AutoJs6로 실시간 전달됩니다. 각 실행은 현재 파일의 snapshot 하나를 실행하며 npm dependency를 자동으로 설치하지 않습니다.

### 설치 및 사용

1. 환경 준비: Android 13 (API 33) 이상에서 AutoJs6 build 5278 (6.8.0) 이상을 설치합니다.
2. 플러그인 설치: [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases)에서 기기에 맞는 APK를 내려받아 설치합니다. 대부분의 휴대전화와 태블릿은 `arm64-v8a`, emulator 또는 x86_64 기기는 `x86_64`, 확실하지 않으면 `universal`을 선택합니다 (조금 더 크지만 둘 다에서 동작합니다).
3. 플러그인 활성화: AutoJs6 plugin center를 열고 Bun Runtime을 활성화합니다. 새로 설치한 플러그인이 중지 상태로 표시되면 호스트가 보여주는 `활성화` action을 누릅니다.
4. 스크립트 실행: JavaScript 또는 TypeScript 파일의 첫 줄에 `"bun";`만 단독으로 넣고 (따옴표와 세미콜론 포함), 평소처럼 AutoJs6에서 그 파일을 실행합니다.

### 빠른 시작

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

모든 것이 정상이면 출력 첫 줄은 `Bun 1.4.0`, 둘째 줄은 `android`입니다.

### 현재 제한

- 실행당 파일 하나: 플러그인은 프로젝트 디렉터리 없이 source snapshot 하나만 받아 실행하므로 `import './utils.js'` 같은 상대 경로 import를 해석할 수 없습니다. 단일 파일 내부의 ESM 문법은 영향을 받지 않습니다. 여러 module이 필요하면 먼저 컴퓨터에서 한 파일로 번들하세요 (FAQ 참고).
- AutoJs6 내장 함수 없음: `click()`, `toast()` 같은 automation API와 Rhino globals는 Bun 스크립트 안에 존재하지 않으므로, Bun 스크립트는 현재 계산, 텍스트 처리, 네트워크 요청처럼 호스트 기능에 의존하지 않는 작업에 적합합니다.
- Java bridge 없음: Bun 스크립트는 AutoJs6 프로세스의 Java class나 object에 직접 접근할 수 없습니다.
- 전체 Bun toolchain 보장 없음: `bunx`, 기기에서의 executable 생성, runtime C compilation, 임의 native addon은 지원 범위 밖입니다.
- Security sandbox 아님: Bun 스크립트는 플러그인 프로세스에서 신뢰된 코드로 실행되며 플러그인에 부여된 permission을 사용할 수 있으므로, 신뢰하는 스크립트만 실행하세요.

### 실행 오류 및 문제 해결

메시지는 플러그인의 Android 언어 설정을 따릅니다. 저수준 진단 세부 정보와 Bun 출력은 영어로 표시될 수 있습니다.

- Bun Runtime이 활성화되거나 사용 설정되지 않았다면 AutoJs6의 플러그인 센터에서 플러그인을 승인하고 사용 설정하세요. 호스트에 활성화 작업이 표시되면 실행하세요.
- 공식 플러그인은 Android 13 (API 33) 이상이 필요합니다. Android 9부터 12L까지는 실행할 수 없습니다. 매니페스트 요구 사항을 낮춰도 런타임이 호환되지는 않습니다.
- `TIMEOUT`: Bun 실행 시간이 초과되었습니다. 작업을 줄이거나 허용된 범위 내에서 실행 제한 시간을 조정하세요.
- `OUTPUT_LIMIT`: Bun 출력이 설정된 바이트 제한을 초과했습니다. stdout과 stderr 출력을 줄인 후 스크립트를 다시 실행하세요.
- `RUNTIME_UNAVAILABLE`: Bun Runtime을 사용할 수 없습니다. 기기 호환성을 확인하고 파일이 불완전하면 플러그인을 다시 설치하세요.

호환성, 권한, 패키지 선택, 현재 제한의 전체 목록은 [project README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime)를 확인하세요.
