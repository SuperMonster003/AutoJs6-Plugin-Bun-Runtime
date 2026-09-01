Bun Runtime은 AutoJs6가 [Bun](https://bun.sh/)을 별도의 JavaScript 및 TypeScript 엔진으로 선택할 수 있게 하는 독립 Android 플러그인입니다. 호스트는 file descriptor로 하나의 source snapshot을 보내고, 플러그인은 고정된 공식 Bun Android executable을 전용 runtime process에서 시작합니다. stdout, stderr, 완료, timeout, cancel event는 Binder로 돌아옵니다. 이는 실제 Bun 실행이며 Rhino 또는 Node.js의 alias가 아닙니다.

이 release는 격리된 plugin runtime process에서 `bun run --no-install <source>`로 공식 Bun 1.4.0 Android executable을 시작합니다. 하나의 JS 또는 TS source snapshot을 받고 누락 dependency를 자동 install하지 않으며 stdout, stderr 및 최종 status를 AutoJs6로 stream합니다.

### 빠른 시작

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

예상 출력은 `Bun 1.4.0`으로 시작하고 다음 줄에 `android`를 표시합니다.

### Version 0.1 제한

- 하나의 source snapshot만 지원: 이 release에서는 multi-file project transfer와 relative project import를 구현하지 않았습니다.
- AutoJs6 globals 없음: Rhino globals, Android automation API 및 host object는 Bun 안에 나타나지 않습니다.
- Java bridge 없음: Bun은 AutoJs6 process의 Java class 또는 object에 직접 접근할 수 없습니다.
- 전체 toolchain 보장 없음: `bunx`, 기기에서 생성한 executable, runtime C compilation 및 임의 native addon은 지원 범위 밖입니다.
- Security sandbox가 아님: Bun script는 plugin app UID의 trusted code로 실행되며 plugin에 부여된 permission을 사용할 수 있습니다.

Compatibility, security, package selection 및 version 0.1의 전체 limitation은 [project README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime)를 확인하세요.
