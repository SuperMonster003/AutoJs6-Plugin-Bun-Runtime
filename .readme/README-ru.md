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

Bun Runtime является отдельным плагином, который добавляет в AutoJs6 необязательный современный движок скриптов: [Bun](https://bun.sh/). После установки и включения плагина достаточно поместить `"bun";` в первую строку файла JavaScript или TypeScript, и этот файл выполнит настоящий движок Bun 1.4.0 вместо встроенного Rhino, поэтому современный синтаксис JavaScript, TypeScript и встроенные API Bun, такие как `fetch`, становятся доступными прямо на устройствах Android.

Плагин работает просто: AutoJs6 передает содержимое скрипта плагину, плагин запускает официальный Android executable Bun в собственном изолированном процессе, а вывод и итоговый результат возвращаются в консоль AutoJs6 в реальном времени. Это настоящий Bun, а не псевдоним или слой эмуляции поверх Rhino или Node.js.

******

### Установка и использование

******

1. Подготовьте окружение: установите AutoJs6 build 5278 (6.8.0) или новее на Android 13 (API 33) или новее.
2. Установите плагин: скачайте и установите подходящий устройству APK со страницы [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Для большинства телефонов и планшетов выберите `arm64-v8a`, для эмуляторов или устройств x86_64 выберите `x86_64`, а при сомнении выберите `universal` (немного больше, работает на обоих).
3. Включите плагин: откройте центр плагинов AutoJs6 и включите Bun Runtime. Если только что установленный плагин показан остановленным, нажмите действие `Активировать`, показанное хостом.
4. Запустите скрипт: поместите `"bun";` отдельной первой строкой файла JavaScript или TypeScript (включая кавычки и точку с запятой), затем запустите файл из AutoJs6 обычным способом.

> Каждый запуск выполняет один снимок текущего файла (фактическая команда `bun run --no-install <source>`); плагин никогда не устанавливает npm-зависимости автоматически и не читает другие файлы проекта. Перед переносом существующего проекта Rhino или Node.js в Bun ознакомьтесь с текущими ограничениями ниже.

******

### Быстрый старт

******

Сохраните следующее содержимое как файл скрипта и запустите его, чтобы убедиться, что выполнение взял на себя движок Bun:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Если все работает, первая строка вывода будет `Bun 1.4.0`, а вторая строка будет `android`.

Файлы TypeScript также выполняются напрямую, без предварительной компиляции и дополнительной настройки:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### Возможности

******

- Настоящий движок Bun: скрипты выполняет напрямую официальный Android executable Bun 1.4.0, без транспиляции и без передачи другим движкам AutoJs6.
- TypeScript сразу из коробки: файлы TS выполняются напрямую без этапа компиляции и дополнительной настройки, работают современный синтаксис JavaScript, синтаксис ESM внутри одного файла и API Bun, доступные в закрепленной Android-сборке.
- Прозрачное выполнение: вывод, например `console.log`, возвращается в консоль AutoJs6 в реальном времени, а итоговый результат сообщает статус выхода, длительность и то, был ли запуск прерван по timeout или отменен.
- Стабильность и контроль: каждый скрипт выполняется в изолированном процессе плагина, может быть отменен в любой момент и автоматически завершается по timeout, поэтому сбойный скрипт никогда не увлекает за собой AutoJs6.
- Проверяемое происхождение движка: встроенный executable Bun байт в байт соответствует официальному выпуску, а его tag, commit, размер, SHA-256 и свойства ELF проверяются при сборке и в CI.
- Полная локализация: метаданные плагина, инструкции центра плагинов, README и changelog охватывают 10 языков и генерируются из одного проверенного набора источников.

******

### Текущие ограничения

******

- Один файл на запуск: плагин получает и выполняет один снимок исходного кода без каталога проекта, поэтому относительные импорты вроде `import './utils.js'` разрешить нельзя. Синтаксис ESM внутри одного файла не затронут; когда нужно несколько модулей, сначала соберите их в один файл на компьютере (см. частые вопросы).
- Нет встроенных функций AutoJs6: automation API вроде `click()` и `toast()` и globals Rhino не существуют внутри Bun-скриптов, поэтому Bun-скрипты пока подходят для задач, не зависящих от хоста: вычислений, обработки текста, сетевых запросов.
- Нет моста Java: Bun-скрипты не могут напрямую обращаться к Java-классам или объектам процесса AutoJs6.
- Нет обещания полного toolchain Bun: `bunx`, создание executable на устройстве, runtime C compilation и произвольные native addon не входят в поддерживаемую область.
- Не security sandbox: Bun-скрипт выполняется как доверенный код в процессе плагина и может использовать выданные плагину разрешения, поэтому запускайте только скрипты, которым доверяете.

******

### Частые вопросы

******

#### Почему функции AutoJs6, такие как `click()` и `toast()`, недоступны в Bun-скриптах?

Bun работает в отдельном процессе и является совершенно другим движком JavaScript, чем Rhino, поэтому globals AutoJs6 не появляются внутри Bun-скриптов. Чтобы Bun-скрипты могли вызывать возможности автоматизации, нужен мост хоста, явно предоставляющий каждую возможность; текущая версия намеренно пока не содержит такого моста. Планы описаны в плане развития.

#### Можно ли использовать пакеты npm?

Не путем установки на устройстве. Плагин всегда работает с `--no-install` и никогда не скачивает зависимости. Если сторонняя библиотека действительно нужна, сначала соберите скрипт и его чистые JS-зависимости в один файл на компьютере, например с помощью `bun build`, затем запустите этот файл на устройстве; пакеты, зависящие от native addon, так использовать нельзя.

#### Может ли скрипт импортировать другие файлы проекта через `import`?

Пока нет. Контракт плагина передает один снимок исходного кода без каталога проекта, поэтому относительные импорты разрешить нельзя. Поддержка многофайловых проектов есть в плане развития, а синтаксис ESM внутри одного файла работает нормально.

#### Почему минимум Android 13?

Bun вызывает системный вызов Linux `close_range` (syscall 436), которого нет в seccomp allowlist приложений на Android 12L и старее, поэтому процесс Bun завершается сигналом `SIGSYS` (воспроизведено на реальном устройстве с API 31). Android 13 разрешает этот вызов, и тесты на реальных устройствах с API 33 и API 35 прошли. Для поддержки более старых версий нужно патчить Bun; прогресс описан в плане развития.

#### Что происходит при timeout скрипта или слишком большом выводе?

Запуск по умолчанию ограничен 60 seconds; при timeout процесс Bun завершается, а результат помечается как прерванный по времени. Когда суммарный вывод stdout и stderr превышает 8 MiB, запуск завершается ошибкой лимита вывода, а не тихим усечением. В обоих случаях разделите задачу или уменьшите объем вывода.

#### Поддерживаются ли устройства со страницами 16 KB?

Оба упакованных ELF executable имеют выравнивание PT_LOAD не менее 16 KB, но сквозной тест в реальной среде Android с 16 KB еще не завершен, поэтому этот выпуск не заявляет проверенную поддержку 16 KB.

#### Какой APK следует установить?

Большинство телефонов и планшетов используют `arm64-v8a`. Для эмуляторов или устройств x86_64 используйте baseline `x86_64`. При сомнении установите `universal`: он содержит оба ABI, немного больше, но это самый надежный выбор.

******

### Совместимость

******

- Движок: официальный Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Система: Android 13 (API 33) или новее, официальные 64-bit executable для `arm64-v8a` и baseline `x86_64`. Android 9 по 12L (API 28 по 32) пока не поддерживаются; причина объяснена в частых вопросах выше. Тесты на реальных устройствах с API 33 и API 35 прошли.
- Хост: AutoJs6 build 5278 или новее, версия контракта Bun runtime 1.
- Лимиты одного запуска: исходный код до 16 MiB, суммарный вывод stdout и stderr до 8 MiB, timeout по умолчанию 60 seconds.
- Пакеты: APK для одного ABI меньше при установке, а более крупный APK `universal` содержит оба поддерживаемых ABI.

******

### Разрешения и целостность

******

- Экспортированные компоненты активации (Wake), info и runtime защищены `org.autojs.permission.PLUGIN`, и AutoJs6 по-прежнему выполняет обычные проверки авторизации плагинов.
- Снимок скрипта размещается в приватном каталоге для каждого запуска, а executable Bun стартует из read-only native library directory Android и не копируется в доступное для записи хранилище.
- Repository lock фиксирует и официальные release archive, и binary, упакованные в APK; CI до сборки отклоняет любое расхождение размера, SHA-256 или свойств ELF.
- Плагин объявляет доступ в Интернет, поскольку доверенные Bun-скрипты могут использовать сетевые API, например `fetch`. Плагин не является sandbox; запускайте только скрипты, которым доверяете.

******

### Интерфейс плагина

******

Этот раздел предназначен для разработчиков хоста AutoJs6 и плагинов; обычные пользователи могут его пропустить. Стабильные идентификаторы и лимиты таковы:

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

План развития отвечает на два вопроса: что работает сейчас и что будет дальше. Отмеченные пункты описывают фактическое поведение текущей версии; неотмеченные пункты (многофайловые проекты, мост возможностей AutoJs6, более широкая поддержка версий Android, обновления Bun и другое) являются планами, а не обещанием текущей поддержки.

- [Открыть ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### История выпусков

******

#### v0.2.0

_2026/09/01_

- `Подсказка` Этот выпуск снижает минимальное системное требование с Android 14 до Android 13 (API 33); Android 9 по 12L (API 28 по 32) остаются неподдерживаемыми, пока пропатченный Bun runtime не пройдет проверку переносимости
- `Улучшение` Снизить минимальное системное требование: сохранить закрепленный официальный Android payload Bun 1.4.0 и смягчить нижнюю границу поддержки с Android 14 (API 34) до Android 13 (API 33), охватив больше устройств
- `Улучшение` Найти корневую причину неработоспособности на старых версиях: начиная с Android 13 системный seccomp разрешает вызываемый Bun raw syscall `close_range`, а сбой на реальном устройстве API 31 доказывает, что для API 28 по 32 нужно патчить сам Bun и одними изменениями manifest это не решить
- `Улучшение` Заложить основу будущей поддержки Android 9+: создать точно воспроизводимую серию патчей исходного кода Bun (6 патчей) и зафиксировать входные данные сборки (закрепленные NDK и контейнер, 22 активные зависимости Android release); пропатченный runtime еще не собран и не входит в текущие пакеты
- `Улучшение` Усилить проверки качества пакетов: каждый Debug и Release APK проверяется на 16 KB ZIP alignment, точное содержимое ABI, размер и SHA-256 закрепленного payload Bun, а установленные байты payload сверяются на тестовом устройстве Android 13
- `Улучшение` Укрепить цепочку поставок: зафиксировать точные байты 19 архивов исходного кода Bun и 17 загрузок toolchain, учесть 181 запись целостности Cargo и 172 записи реестра Bun, а также добавить отклоняющий перезапись materializer и предпроверку сборки двух ABI под защитой шлюза `buildReady`
- `Зависимость` Добавить Kotlin Parcelize runtime, чтобы R8 в Release сохранял общий класс контракта Parcelable

#### v0.1.0

_2026/09/01_

- `Подсказка` Первый выпуск: каждый запуск выполняет один отдельный файл скрипта; встроенные функции AutoJs6, мост Java, многофайловые проекты и относительные импорты пока недоступны
- `Функция` Добавить отдельный движок `bun`: поместите `"bun";` в первую строку скрипта, чтобы выполнять JavaScript и TypeScript официальным Android executable Bun 1.4.0; фактическая команда `bun run --no-install <source>`, зависимости никогда не устанавливаются автоматически
- `Функция` Возвращать вывод запуска в реальном времени: stdout и stderr передаются ограниченными порциями через oneway Binder callback, а итоговый результат сообщает только статус и диагностику без полного потока вывода
- `Функция` Держать запуск под контролем: скрипты выполняются в изолированном процессе плагина `:bun_runtime` с явной отменой, timeout по умолчанию 60 секунд, запросом информации runtime и prewarming
- `Функция` Предоставить официальные 64-bit Android payload для `arm64-v8a` и baseline `x86_64`, а также пакеты для одного ABI и `universal`
- `Функция` Обеспечить полный опыт плагина: обнаружение плагина, защищенную разрешением активацию (Wake), полные метаданные PluginInfo и документацию пользователя на 10 языках
- `Улучшение` Принять версионированный Binder contract с передачей исходного кода через ParcelFileDescriptor, лимитом исходного кода 16 MiB и лимитом суммарного вывода 8 MiB
- `Улучшение` Запускать Bun из read-only native library directory Android и проверять размер, SHA-256 и свойства ELF закрепленных release archive и упакованных binary
- `Улучшение` Проверить, что PT_LOAD alignment обоих упакованных executable составляет не менее 16 KB, и честно задокументировать, что тестирование в реальной 16 KB среде Android еще не завершено
- `Улучшение` Генерировать README, инструкции центра плагинов и встроенный changelog из проверенных источников JSON, добавив CI-проверки сборки, Markdown и артефактов runtime
- `Улучшение` Установить предварительный минимум Android 14 (API 34): на реальном устройстве API 31 syscall `close_range` Bun завершается seccomp сигналом `SIGSYS`, одно устройство Sony с API 33 неожиданно прошло тест, но это не доказывает переносимость, а JS- и TS-тесты полного цикла через Binder на реальном устройстве API 35 пройдены

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
