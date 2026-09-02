<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>Запускает JavaScript и TypeScript в независимом движке Bun в изолированном процессе Android</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Языки

******

Текущий README.md доступен на следующих языках:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- Русский [ru] # текущий
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### Введение

******

Bun Runtime является отдельным Android-плагином, который позволяет AutoJs6 выбирать [Bun](https://bun.sh/) в качестве самостоятельного движка JavaScript и TypeScript. Хост передает один снимок исходного кода через файловый дескриптор, плагин запускает закрепленный официальный Android executable Bun в собственном runtime-процессе, а stdout, stderr, завершение, timeout и отмена возвращаются через Binder. Это настоящее выполнение Bun, а не псевдоним Rhino или Node.js.

******

### Возможности

******

- Независимый движок: запускает официальный Android executable Bun 1.4.0 вместо передачи кода другому движку AutoJs6.
- JavaScript и TypeScript: Bun разбирает и выполняет один снимок JS или TS, включая синтаксис ESM и API Bun, доступные в закрепленной Android-сборке.
- Наблюдаемое выполнение: stdout и stderr передаются хосту потоком, а итог содержит статус выхода, длительность, timeout, отмену и ограниченную диагностику.
- Контролируемый runtime: бинарные файлы `arm64-v8a` и `x86_64` закреплены по tag, commit, размеру, SHA-256, машине ELF и минимальному выравниванию PT_LOAD.
- Локализация: метаданные, инструкции центра плагинов, README и changelog доступны на 10 языках из одного проверяемого набора источников.

******

### Установка и использование

******

1. Используйте AutoJs6 build 5278 (6.8.0) или новее на Android 13 (API 33) или новее.
2. Установите release APK, соответствующий ABI устройства. Для большинства телефонов и планшетов выберите `arm64-v8a`, для совместимого эмулятора или устройства выберите `x86_64`, а при сомнении выберите `universal`.
3. Откройте центр плагинов AutoJs6 и включите Bun Runtime. Если новый плагин остается остановленным, используйте действие `Активировать`, показанное хостом.
4. Поместите отдельную директиву `"bun";` в начало файла JavaScript или TypeScript и запустите его из AutoJs6 обычным способом.

> Версия 0.1 выполняет один неизменяемый снимок на запрос командой `bun run --no-install <source>` и никогда не устанавливает отсутствующие зависимости автоматически. Перед переносом существующего проекта Rhino или Node.js в Bun ознакомьтесь с ограничениями.

******

### Быстрый старт

******

Запустите этот файл, чтобы убедиться, что хост выбрал Bun и Android runtime стартовал:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Ожидаемый вывод начинается с `Bun 1.4.0`, затем печатается `android`.

Bun обрабатывает TypeScript напрямую, поэтому компиляция TypeScript на стороне хоста не требуется:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### Совместимость

******

- Runtime: официальный Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Платформа: Android 13 (API 33) или новее, официальные 64-bit payload для `arm64-v8a` и baseline `x86_64`. Реальный запуск на API 31 завершился `SIGSYS` app seccomp на syscall 436 `close_range` Bun. Списки разрешений приложений AOSP Android 12 и более ранних версий не содержат этот syscall, а Android 13 (T, API 33) разрешает raw syscall. Android 14 добавляет публичный wrapper bionic, но Bun вызывает raw syscall и не требует этот символ libc API 34. Реальные runtime tests на API 33 и API 35 прошли. API 28 по 32 остаются неподдерживаемыми, пока patched Bun runtime не обработает traps seccomp и не пройдет переносимую проверку.
- Контракт хоста: AutoJs6 build 5278 или новее и Bun runtime contract version 1.
- Лимиты: исходный код до 16 MiB, общий бюджет потоков stdout и stderr до 8 MiB, timeout по умолчанию 60 seconds.
- Пакеты: APK для одного ABI меньше, а более крупный APK `universal` содержит оба поддерживаемых ABI.

******

### Ограничения версии 0.1

******

- Только один снимок исходного кода: передача многофайловых проектов и относительные импорты проекта в этой версии не реализованы.
- Нет globals AutoJs6: globals Rhino, Android automation API и объекты хоста не появляются внутри Bun.
- Нет моста Java: Bun не может напрямую обращаться к Java-классам или объектам процесса AutoJs6.
- Нет обещания полного toolchain: `bunx`, созданные на устройстве executable, runtime C compilation и произвольные native addon не входят в поддерживаемую область.
- Не является security sandbox: Bun script выполняется как доверенный код с UID приложения плагина и может использовать выданные плагину разрешения.

******

### Разрешения и целостность

******

- Экспортированные компоненты Wake, info и runtime защищены `org.autojs.permission.PLUGIN`; AutoJs6 также выполняет обычные проверки авторизации плагинов.
- Снимок исходного кода размещается в отдельном приватном каталоге запуска. Executable стартует из read-only native library directory Android и не копируется в доступное для записи хранилище.
- Repository lock фиксирует официальные release archive и упакованные binary. CI до сборки отклоняет расхождения размера, SHA-256, типа ELF, машины или выравнивания.
- Плагин объявляет доступ в Интернет, поскольку доверенные Bun script могут использовать сетевые API, например `fetch`. Плагин не является sandbox, поэтому запускайте только доверенные script.

******

### Частые вопросы

******

#### Почему в Bun отсутствуют globals AutoJs6?

Bun является отдельным процессом и движком JavaScript, а не слоем совместимости Rhino. Будущий мост должен явно предоставлять каждую возможность автоматизации; версия 0.1 намеренно не содержит такого моста.

#### Может ли script импортировать другой локальный файл проекта?

Не в версии 0.1. Контракт передает один снимок исходного кода и пока не передает дерево проекта, поэтому относительные импорты разрешить нельзя. Синтаксис ESM внутри одного файла поддерживается.

#### Поддерживаются ли устройства с размером страницы 16 KB?

Сегменты PT_LOAD обоих упакованных ELF executable выровнены как минимум на 16 KB. Реальный тест Android runtime с 16 KB еще не выполнен, поэтому версия не заявляет проверенную сквозную поддержку.

#### Какой APK следует установить?

Большинство физических Android-устройств используют `arm64-v8a`. Для совместимых эмуляторов или устройств x86_64 используйте baseline `x86_64`. Пакет `universal` содержит оба варианта и безопасен, если ABI неизвестен.

******

### Интерфейс плагина

******

Эти стабильные идентификаторы и лимиты предназначены для разработчиков хоста AutoJs6 и плагина:

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

`BunRuntimeService` обнаруживается по action `org.autojs.plugin.bun.RUNTIME` и category `bun`. Он получает исходный код через `ParcelFileDescriptor` и execution ID в запросе, затем выполняет `bun run --no-install <source>`, пока синхронный вызов `runScript` остается активным. Stdout и stderr отправляются только ограниченными фрагментами через oneway callback. Возвращаемый terminal Bundle и событие `finished` содержат только статус и краткую диагностику, но не полные потоки вывода, поэтому каждая транзакция Binder остается ниже лимита размера. Service поддерживает явную отмену и предварительный прогрев и работает в `:bun_runtime`.

Статус 16 KB: сегменты PT_LOAD упакованных ELF `arm64-v8a` и `x86_64` соответствуют требованию выравнивания 16 KB. Запуск на реальном Android-устройстве или эмуляторе с 16 KB еще не выполнялся, поэтому проверено только выравнивание ELF.

******

### План развития

******

План отделяет текущее поведение от запланированных снимков проектов, узкого моста возможностей AutoJs6, более широкой проверки Android и будущих обновлений Bun. Неотмеченные пункты являются планами, а не текущими возможностями.

- [Открыть ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### История выпусков

******

#### v0.2.0

_2026/09/01_

- `Подсказка` Android 13 (API 33) теперь является официальной минимальной целью; API 28 по 32 остаются неподдерживаемыми, пока patched Bun runtime не пройдет переносимую проверку
- `Улучшение` Снизить поддерживаемую версию Android с Android 14 (API 34) до Android 13 (API 33), сохранив закрепленные официальные Android payload Bun 1.4.0
- `Улучшение` Задокументировать границу seccomp AOSP T: Android 13 разрешает raw syscall `close_range` Bun, а сбой на API 31 показывает, что API 28 по 32 требуют патч совместимости Bun, а не только изменение manifest
- `Улучшение` Подготовить эксперимент Android 9+ с детерминированным backport исходников Bun из шести патчей, закрепленными входами NDK и контейнера и неизменяемыми идентификаторами 22 активных зависимостей Android release, явно сохранив несобранный runtime недоступным
- `Улучшение` Проверять каждый Debug и Release APK на ZIP alignment 16 KB, точный состав ABI, закрепленные размеры и SHA-256 payload Bun, а также проверять установленные байты payload на тестовом устройстве Android 13
- `Улучшение` Закрепить точные байты 19 архивов исходников Bun и 17 неизменяемых прямых загрузок toolchain, учесть 181 запись целостности Cargo и 172 записи Bun registry, а также добавить materializer без перезаписи и двух-ABI preflight сборки с блокировкой `buildReady`
- `Зависимость` Добавить Kotlin Parcelize runtime, необходимый Release R8 для сохранения общих классов контракта Parcelable

#### v0.1.0

_2026/09/01_

- `Подсказка` Первый выпуск выполняет один снимок исходного кода и не предоставляет globals AutoJs6, мост Java, многофайловые проекты или относительные импорты проекта
- `Функция` Запускать JavaScript и TypeScript официальным Android executable Bun 1.4.0 как независимым движком `bun`, выбираемым `"bun";`, с командой `bun run --no-install <source>` без автоматической установки зависимостей
- `Функция` Передавать stdout и stderr только ограниченными фрагментами через oneway callback Binder, а в terminal result сообщать статус и диагностику без полных потоков вывода
- `Функция` Поддерживать явную отмену, timeout по умолчанию 60 секунд, сведения runtime и предварительный прогрев в изолированном процессе `:bun_runtime`
- `Функция` Поставлять официальные 64-bit Android payload для `arm64-v8a` и baseline `x86_64`, а также пакеты single-ABI и `universal`
- `Функция` Предоставить обнаружение плагина, защищенную Wake-активацию, полные метаданные PluginInfo и пользовательскую документацию на 10 языках
- `Улучшение` Использовать версионируемый контракт Binder с передачей исходного кода через ParcelFileDescriptor, лимитом источника 16 MiB и объединенного вывода 8 MiB
- `Улучшение` Запускать Bun из read-only native library directory Android и проверять размер, SHA-256, тип ELF, машину и выравнивание официальных архивов и упакованных бинарных файлов
- `Улучшение` Проверять выравнивание PT_LOAD не менее 16 KB для обоих исполняемых файлов и явно отмечать, что реальный тест Android runtime 16 KB еще не выполнен
- `Улучшение` Генерировать README, инструкции центра плагинов и встроенный changelog из проверяемых JSON, с CI-проверками build, Markdown и runtime artifact
- `Улучшение` Требовать Android 14 (API 34) после `SIGSYS` app seccomp на API 31 при syscall 436 `close_range` Bun; один Sony API 33 неожиданно прошел, но не является переносимым доказательством, а Binder-вызовы JS и TS на API 35 прошли и старые версии ожидают upstream fallback

##### Дополнительная история выпусков

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ru.md)

******

### Сборка и проверка

******

Git LFS должен материализовать оба закрепленных runtime binary перед проверкой или упаковкой Gradle. Стандартные локальные проверки приведены ниже. Требуются JDK 17 или новее, Node.js и Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### Локализация и генерация документов

******

Изменяйте JSON и шаблоны Markdown, затем запускайте `py .python/generate_markdown.py`. Не редактируйте созданные README, changelog или plugin-instruction вручную. `--check` без записи проверяет форму языков, версию, локализованные ресурсы, лишние артефакты и расхождения генерации.

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

### Лицензия

******

Код плагина распространяется по [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). Официальный executable Bun содержит код Bun под MIT, статически связанные JavaScriptCore и WebKit под LGPL-2, а также другие компоненты под собственными лицензиями. См. [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) и закрепленный [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) Bun.

******

### Ссылки

******

- Проект AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Официальный сайт Bun: https://bun.sh/
- Закрепленный выпуск Bun: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Уведомления третьих сторон: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
