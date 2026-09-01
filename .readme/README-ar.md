<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>يشغل JavaScript و TypeScript باستخدام محرك Bun المستقل داخل عملية Android معزولة</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### اللغات

******

يدعم ملف README.md الحالي اللغات التالية:

- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-en.md)
- العربية [ar] # الحالي
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### مقدمة

******

Bun Runtime هو plugin مستقل لنظام Android يتيح لـ AutoJs6 اختيار [Bun](https://bun.sh/) كمحرك منفصل لـ JavaScript و TypeScript. يرسل المضيف snapshot واحدة من المصدر عبر file descriptor, ويشغل plugin ملف Bun Android executable الرسمي والمثبت داخل runtime process خاصة به, ثم يعيد stdout و stderr وحالة الاكتمال و timeout و cancellation عبر Binder. هذا تشغيل حقيقي لـ Bun وليس alias لـ Rhino أو Node.js.

******

### الميزات

******

- محرك مستقل: يشغل Bun 1.4.0 Android executable الرسمي بدلا من تمرير الكود إلى محرك آخر في AutoJs6.
- JavaScript و TypeScript: يحلل Bun وينفذ snapshot واحدة من JS أو TS, بما في ذلك ESM syntax و Bun API المتاحة في Android build المثبتة.
- تنفيذ قابل للمراقبة: يتم بث stdout و stderr إلى المضيف, وتبلغ النتيجة النهائية عن exit status والمدة و timeout و cancellation و diagnostic محدودة.
- Runtime محكومة: يتم تثبيت binary الخاصة بـ `arm64-v8a` و `x86_64` بواسطة tag و commit والحجم و SHA-256 و ELF machine والحد الأدنى من PT_LOAD alignment.
- تسليم محلي: تغطي plugin metadata وتعليمات plugin center و README و changelog عشر لغات من مجموعة مصادر واحدة تم التحقق منها.

******

### التثبيت والاستخدام

******

1. استخدم AutoJs6 build 5278 (6.8.0) أو أحدث على Android 13 (API 33) أو أحدث.
2. ثبت release APK المطابق لـ ABI الجهاز. اختر `arm64-v8a` لمعظم الهواتف والأجهزة اللوحية, و `x86_64` لمحاكي أو جهاز متوافق, أو `universal` عند عدم التأكد.
3. افتح plugin center في AutoJs6 وفعل Bun Runtime. إذا بقي plugin المثبت حديثا متوقفا, استخدم إجراء `تنشيط` الذي يعرضه المضيف.
4. ضع التوجيه المستقل `"bun";` في بداية ملف JavaScript أو TypeScript, ثم شغله بالطريقة المعتادة من AutoJs6.

> ينفذ الإصدار 0.1 snapshot واحدة غير قابلة للتغيير لكل طلب باستخدام `bun run --no-install <source>`, لذلك لا يثبت dependency مفقودة تلقائيا. اقرأ القيود أدناه قبل نقل مشروع Rhino أو Node.js موجود إلى Bun.

******

### بدء سريع

******

شغل هذا الملف للتأكد من أن المضيف اختار Bun وأن Android runtime بدأت:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

يبدأ الخرج المتوقع بـ `Bun 1.4.0` ثم يطبع `android`.

يعالج Bun TypeScript مباشرة, لذلك لا يلزم TypeScript compilation في جانب المضيف:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### التوافق

******

- Runtime: Bun الرسمي 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- المنصة: Android 13 (API 33) أو أحدث, مع payload رسمية 64-bit لـ `arm64-v8a` و baseline `x86_64`. فشل real-device run على API 31 بسبب app seccomp `SIGSYS` عند Bun syscall 436 `close_range`. لا تتضمن AOSP Android 12 والإصدارات الأقدم هذا syscall في app allowlist, بينما يسمح Android 13 (T, API 33) بالـ raw syscall. يضيف Android 14 public bionic wrapper, لكن Bun يستدعي raw syscall ولا يحتاج إلى API 34 libc symbol. نجحت runtime tests حقيقية على API 33 و API 35. تبقى API 28 إلى 32 غير مدعومة حتى يعالج patched Bun runtime seccomp traps ويجتاز portable validation.
- عقد المضيف: AutoJs6 build 5278 أو أحدث و Bun runtime contract version 1.
- الحدود: مصدر حتى 16 MiB, و combined streaming budget لـ stdout و stderr حتى 8 MiB, و default timeout مقداره 60 seconds.
- الحزم: تكون single-ABI APK أصغر, بينما تتضمن `universal` APK الأكبر كلا ABI المدعومين.

******

### قيود الإصدار 0.1

******

- Snapshot واحدة فقط: لا ينفذ هذا الإصدار نقل مشروع متعدد الملفات أو relative project import.
- لا توجد AutoJs6 globals: لا تظهر Rhino globals أو Android automation API أو host object داخل Bun.
- لا يوجد Java bridge: لا يستطيع Bun الوصول مباشرة إلى Java class أو object داخل عملية AutoJs6.
- لا يوجد وعد بـ toolchain كاملة: تقع `bunx` و executable المنتجة على الجهاز و runtime C compilation وأي native addon خارج النطاق المدعوم.
- ليس security sandbox: يعمل Bun script ككود موثوق تحت plugin app UID ويمكنه استخدام permission الممنوحة إلى plugin.

******

### الأذونات والتكامل

******

- تتم حماية مكونات Wake و info و runtime المصدرة بواسطة `org.autojs.permission.PLUGIN`; ويواصل AutoJs6 فحوص authorization المعتادة للـ plugin.
- توضع source snapshot في private directory خاصة بكل تشغيل. يتم تشغيل executable من read-only native library directory في Android ولا تنسخ إلى writable storage للتنفيذ.
- يسجل repository lock كلا من official release archive و packaged binary. ترفض CI أي اختلاف في الحجم أو SHA-256 أو ELF type أو machine أو alignment قبل build.
- يعلن plugin عن Internet permission لأن Bun script الموثوقة قد تستخدم network API مثل `fetch`. Plugin ليس sandbox, لذلك شغل فقط script التي تثق بها.

******

### الأسئلة الشائعة

******

#### لماذا لا توجد AutoJs6 globals داخل Bun?

Bun هو process ومحرك JavaScript منفصل, وليس Rhino compatibility layer. يجب أن يعرض host bridge مستقبلي كل automation capability بوضوح, ولا يقدم الإصدار 0.1 هذا bridge عمدا.

#### هل يمكن لـ script استيراد ملف local project آخر?

ليس في الإصدار 0.1. ينقل contract source snapshot واحدة فقط ولا ينقل project tree حتى الآن, لذلك لا يمكن حل relative project import. تظل single-file ESM syntax مدعومة.

#### هل يدعم plugin أجهزة page-size بحجم 16 KB?

تبلغ PT_LOAD alignment في كلا ELF executable المضمنين 16 KB على الأقل. لم يكتمل اختبار Android runtime حقيقي بحجم 16 KB, لذلك لا يدعي هذا الإصدار دعما end-to-end تم التحقق منه.

#### أي APK يجب أن أثبت?

تستخدم معظم أجهزة Android الفعلية `arm64-v8a`. استخدم baseline `x86_64` للمحاكيات أو أجهزة x86_64 المتوافقة. تتضمن `universal` كليهما وهي الخيار الآمن عند عدم معرفة ABI.

******

### واجهة plugin

******

هذه المعرفات والحدود الثابتة مخصصة لمطوري host في AutoJs6 و plugin:

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

يتم اكتشاف `BunRuntimeService` عبر action `org.autojs.plugin.bun.RUNTIME` و category `bun`. يستقبل المصدر عبر `ParcelFileDescriptor` و execution ID ضمن الطلب, ثم ينفذ `bun run --no-install <source>` مع بقاء استدعاء `runScript` المتزامن نشطا. يتم إرسال stdout و stderr فقط كـ bounded chunk عبر oneway callback. يحتوي terminal Bundle المعاد و event باسم `finished` على status و diagnostic summary field فقط ولا يحمل complete output stream, مما يبقي كل Binder transaction دون size limit. تدعم service cancellation صريحة و runtime prewarming وتعمل في `:bun_runtime`.

حالة 16 KB: تستوفي PT_LOAD segment في ELF المضمنة لـ `arm64-v8a` و `x86_64` متطلبات 16 KB alignment. لم يتم التشغيل بعد على جهاز أو محاكي Android حقيقي بحجم 16 KB, لذلك تم التحقق من ELF alignment فقط.

******

### خريطة الطريق

******

تفصل خريطة الطريق السلوك الحالي عن project snapshot المخططة و AutoJs6 capability bridge محدود والتحقق الأوسع على Android وترقيات Bun المستقبلية. العناصر غير المحددة خطط وليست دعوى دعم حالي.

- [عرض ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### سجل الإصدارات

******

#### v0.2.0

_2026/09/01_

- `تلميح` أصبح Android 13 (API 33) هو minimum target الرسمي; تبقى API 28 إلى 32 غير مدعومة حتى يجتاز patched Bun runtime اختبار portable validation
- `تحسين` خفض الحد الأدنى المدعوم من Android 14 (API 34) إلى Android 13 (API 33) مع الاحتفاظ بالـ official Bun 1.4.0 Android payload المثبتة
- `تحسين` توثيق حد AOSP T seccomp: يسمح Android 13 بالـ raw `close_range` syscall الذي يستدعيه Bun, بينما يوضح فشل API 31 أن API 28 إلى 32 تحتاج Bun compatibility patch بدلا من manifest-only change

#### v0.1.0

_2026/09/01_

- `تلميح` يشغل الإصدار الأول source snapshot واحدة ولا يعرض AutoJs6 globals أو Java bridge أو multi-file project أو relative project import
- `ميزة` تشغيل JavaScript و TypeScript باستخدام Bun 1.4.0 Android executable الرسمية كمحرك `bun` مستقل يختار بواسطة `"bun";` ويستخدم `bun run --no-install <source>` دون تثبيت dependency تلقائيا
- `ميزة` بث stdout و stderr فقط كـ bounded oneway Binder callback chunk, بينما يبلغ terminal result عن status و diagnostic دون حمل complete output stream
- `ميزة` دعم explicit cancellation و default timeout مدته 60 ثانية و runtime information و prewarming في plugin process المعزولة `:bun_runtime`
- `ميزة` توفير official 64-bit Android payload لـ `arm64-v8a` و baseline `x86_64` مع single-ABI package و `universal` package
- `ميزة` توفير plugin discovery و Wake activation محمية و PluginInfo metadata كاملة و user documentation بعشر لغات
- `تحسين` استخدام versioned Binder contract مع ParcelFileDescriptor source transport وحد source مقداره 16 MiB وحد combined output مقداره 8 MiB
- `تحسين` تشغيل Bun من Android read-only native library directory والتحقق من size و SHA-256 و ELF type و machine و alignment لكل official release archive و packaged binary
- `تحسين` التحقق من PT_LOAD alignment لا يقل عن 16 KB لكلا packaged executable مع تسجيل واضح لعدم اكتمال اختبار Android runtime حقيقي بحجم 16 KB
- `تحسين` توليد README وتعليمات plugin center و built-in changelog asset من validated JSON source مع فحوص CI للـ build و Markdown و runtime artifact
- `تحسين` طلب Android 14 (API 34) بعد app seccomp `SIGSYS` على API 31 عند Bun syscall 436 `close_range`; نجح جهاز Sony API 33 واحد بشكل غير متوقع لكنه ليس portable evidence, بينما نجحت JS و TS Binder round trip على API 35 وتنتظر الإصدارات الأقدم upstream fallback

##### لمزيد من سجل الإصدارات

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ar.md)

******

### Build والتحقق

******

يجب أن يقوم Git LFS بتحويل runtime binary المثبتتين إلى ملفات فعلية قبل التحقق أو Gradle packaging. تظهر فحوص local القياسية أدناه. يلزم JDK 17 أو أحدث و Node.js و Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### الترجمة وتوليد المستندات

******

عدل JSON و Markdown template ثم شغل `py .python/generate_markdown.py`. لا تعدل README أو changelog أو plugin-instruction file المولدة يدويا. يتحقق `--check` من language shape و version alignment و localized resource و orphan artifact و generated-file drift دون كتابة ملفات.

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

### الترخيص

******

كود plugin مرخص بموجب [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). تتضمن Bun executable الرسمية كود Bun المرخص بـ MIT و JavaScriptCore و WebKit المرتبطين statically بموجب LGPL-2 ومكونات أخرى بتراخيصها الخاصة. راجع [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) و [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) المثبت لـ Bun.

******

### روابط

******

- مشروع AutoJs6: https://github.com/SuperMonster003/AutoJs6
- موقع Bun الرسمي: https://bun.sh/
- إصدار Bun المثبت: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- إشعارات الأطراف الخارجية: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
