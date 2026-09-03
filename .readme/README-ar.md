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

Bun Runtime هو plugin مستقل يضيف إلى AutoJs6 محرك script حديثا اختياريا: [Bun](https://bun.sh/). بعد تثبيت plugin وتفعيله, يكفي وضع `"bun";` في السطر الأول من ملف JavaScript أو TypeScript ليتم تسليم هذا الملف إلى محرك Bun 1.4.0 حقيقي بدلا من محرك Rhino المدمج, فتصبح صياغة JavaScript الحديثة و TypeScript و Bun API المدمجة مثل `fetch` قابلة للاستخدام مباشرة على أجهزة Android.

يعمل plugin بطريقة بسيطة: يرسل AutoJs6 محتوى script إلى plugin, ويشغل plugin ملف Bun Android executable الرسمي في process معزولة خاصة به, ثم يعود الخرج مع النتيجة النهائية إلى console الخاصة بـ AutoJs6 في الوقت الفعلي. هذا Bun حقيقي, وليس alias أو طبقة محاكاة فوق Rhino أو Node.js.

******

### التثبيت والاستخدام

******

1. جهز البيئة: ثبت AutoJs6 build 5278 (6.8.0) أو أحدث على Android 13 (API 33) أو أحدث.
2. ثبت plugin: نزل وثبت APK المطابق للجهاز من [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). اختر `arm64-v8a` لمعظم الهواتف والأجهزة اللوحية, و `x86_64` للمحاكيات أو أجهزة x86_64, أو `universal` عند عدم التأكد (أكبر قليلا ويعمل على كليهما).
3. فعل plugin: افتح plugin center في AutoJs6 وفعل Bun Runtime. إذا ظهر plugin المثبت حديثا متوقفا, اضغط إجراء `تنشيط` الذي يعرضه المضيف.
4. شغل script: ضع `"bun";` وحده في السطر الأول من ملف JavaScript أو TypeScript (مع علامتي الاقتباس والفاصلة المنقوطة), ثم شغل الملف من AutoJs6 كالمعتاد.

> ينفذ كل تشغيل snapshot واحدة من الملف الحالي (الأمر الفعلي هو `bun run --no-install <source>`); لا يثبت plugin أبدا npm dependency تلقائيا ولا يقرأ ملفات أخرى في المشروع. اقرأ القيود الحالية أدناه قبل نقل مشروع Rhino أو Node.js موجود إلى Bun.

******

### بدء سريع

******

احفظ المحتوى التالي كملف script وشغله للتأكد من أن محرك Bun تولى التنفيذ:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

إذا سار كل شيء جيدا, يكون أول سطر في الخرج `Bun 1.4.0` والسطر الثاني `android`.

تعمل ملفات TypeScript مباشرة أيضا, دون compile مسبق أو إعداد إضافي:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

توجد في [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples) أمثلة إضافية مشروحة وجاهزة للنسخ والتشغيل لطلبات الشبكة, وقراءة الملفات وكتابتها داخل مساحة العمل الخاصة, وstdout/stderr, وأنواع TypeScript. تلتزم كل الأمثلة بحدود المصدر الواحد الحالية و`--no-install`.

******

### الميزات

******

- محرك Bun حقيقي: يتم تنفيذ script مباشرة بواسطة Bun 1.4.0 Android executable الرسمي, دون transpilation ودون تمرير إلى محركات AutoJs6 الأخرى.
- TypeScript جاهز فورا: تعمل ملفات TS مباشرة دون خطوة compile أو إعداد إضافي, وتعمل صياغة JavaScript الحديثة و ESM syntax داخل الملف الواحد و Bun API المتاحة في Android build المثبتة.
- تنفيذ شفاف: يعود خرج مثل `console.log` إلى console الخاصة بـ AutoJs6 في الوقت الفعلي, وتبلغ النتيجة النهائية عن exit status والمدة وما إذا كان التشغيل انتهى بـ timeout أو تم إلغاؤه.
- مستقر وقابل للتحكم: يعمل كل script في plugin process معزولة, ويمكن إلغاؤه في أي وقت, ويتم إنهاؤه تلقائيا عند timeout, لذلك لا يسقط script معطوب AutoJs6 معه أبدا.
- مصدر محرك قابل للتحقق: يطابق Bun executable المضمن الإصدار الرسمي byte مقابل byte, ويتم فرض tag و commit والحجم و SHA-256 وخصائص ELF أثناء build و CI.
- تسليم محلي كامل: تغطي plugin metadata وتعليمات plugin center و README و changelog عشر لغات, وكلها مولدة من مجموعة مصادر واحدة تم التحقق منها.

******

### القيود الحالية

******

- ملف واحد لكل تشغيل: يستقبل plugin وينفذ source snapshot واحدة دون مجلد المشروع, لذلك لا يمكن حل relative import مثل `import './utils.js'`. لا تتأثر ESM syntax داخل الملف الواحد; عند الحاجة إلى عدة module, اجمعها أولا في ملف واحد على حاسوب (انظر الأسئلة الشائعة).
- لا توجد دوال AutoJs6 مدمجة: automation API مثل `click()` و `toast()` و Rhino globals غير موجودة داخل Bun script, لذلك تناسب Bun script حاليا المهام التي لا تعتمد على قدرات المضيف, مثل الحساب ومعالجة النصوص وطلبات الشبكة.
- لا يوجد Java bridge: لا يستطيع Bun script الوصول مباشرة إلى Java class أو object في عملية AutoJs6.
- لا يوجد وعد بـ Bun toolchain كاملة: تقع `bunx` و executable المنتجة على الجهاز و runtime C compilation وأي native addon خارج النطاق المدعوم.
- ليس security sandbox: يعمل Bun script ككود موثوق في plugin process ويمكنه استخدام permission الممنوحة للـ plugin, لذلك شغل فقط script التي تثق بها.

******

### الأسئلة الشائعة

******

#### لماذا دوال AutoJs6 مثل `click()` و `toast()` غير متاحة في Bun script?

يعمل Bun في process منفصلة وهو محرك JavaScript مختلف تماما عن Rhino, لذلك لا تظهر AutoJs6 globals داخل Bun script. يتطلب السماح لـ Bun script باستدعاء قدرات الأتمتة host bridge يعرض كل قدرة بوضوح; لا يقدم الإصدار الحالي هذا bridge عمدا حتى الآن. انظر خريطة الطريق للاطلاع على الخطط.

#### هل يمكنني استخدام حزم npm?

ليس بتثبيتها على الجهاز. يعمل plugin دائما بـ `--no-install` ولا ينزل dependency أبدا. إذا كانت مكتبة خارجية ضرورية فعلا, اجمع أولا script مع dependency الخاصة به من JS الخالص في ملف واحد على حاسوب, مثلا بـ `bun build`, ثم شغل هذا الملف على الجهاز; لا يمكن بهذه الطريقة استخدام الحزم التي تعتمد على native addon.

#### هل يمكن لـ script عمل `import` لملفات أخرى من المشروع?

ليس حاليا. ينقل plugin contract source snapshot واحدة دون مجلد المشروع, لذلك لا يمكن حل relative import. دعم المشاريع متعددة الملفات مدرج في خريطة الطريق, و ESM syntax داخل الملف الواحد تعمل بشكل طبيعي.

#### لماذا Android 13 هو الحد الأدنى?

يستدعي Bun نداء النظام `close_range` في Linux (syscall 436), وهو غير مدرج في app seccomp allowlist على Android 12L وما قبله, لذلك يقتل process الخاصة بـ Bun بإشارة `SIGSYS` (تم إعادة إنتاجه على جهاز حقيقي API 31). يسمح Android 13 بهذا النداء, ونجحت اختبارات الأجهزة الحقيقية على API 33 و API 35. يتطلب دعم الإصدارات الأقدم عمل patch لـ Bun; انظر خريطة الطريق لمتابعة التقدم.

#### ماذا يحدث عندما ينتهي وقت script أو يطبع أكثر من اللازم?

يحدد كل تشغيل افتراضيا بـ 60 seconds; عند timeout يتم إنهاء process الخاصة بـ Bun وتوسم النتيجة بأنها انتهت المهلة. عندما يتجاوز خرج stdout و stderr مجتمعين 8 MiB, ينتهي التشغيل بخطأ تجاوز حد الخرج بدلا من الاقتطاع الصامت. في كلتا الحالتين, قسم المهمة أو قلل كمية الخرج.

#### هل أجهزة page-size بحجم 16 KB مدعومة?

يجتاز كلا ELF executable المعبأين وجميع إدخالات APK بوابات 16 KB alignment. على AVD بحجم صفحات 16 KB يعمل بنظام Android 16 (API 36), اجتاز APK لـ `arm64-v8a` مجموعة Binder الكاملة عبر `libndk_translation`, لكن payload `x86_64` الأصلي يتوقف بالـ exit code 134 حتى مع script بسيطة; ولم يتم اختبار arm64 الأصلي بعد. هذه أدلة جزئية, لذلك لا يزال هذا الإصدار لا يدعي دعما عاما لـ 16 KB.

#### أي APK يجب أن أثبت?

تستخدم معظم الهواتف والأجهزة اللوحية `arm64-v8a`. استخدم baseline `x86_64` للمحاكيات أو أجهزة x86_64. عند عدم التأكد, ثبت `universal` الذي يتضمن كلا ABI; أكبر قليلا لكنه الخيار الأكثر أمانا.

******

### التوافق

******

- المحرك: Bun الرسمي 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- النظام: Android 13 (API 33) أو أحدث, مع executable رسمية 64-bit لـ `arm64-v8a` و baseline `x86_64`. لا يدعم بعد Android 9 حتى 12L (API 28 حتى 32); تشرح الأسئلة الشائعة أعلاه السبب. نجحت اختبارات الأجهزة الحقيقية على API 33 و API 35.
- المضيف: AutoJs6 build 5278 أو أحدث, مع Bun runtime contract version 1.
- حدود كل تشغيل: مصدر حتى 16 MiB, وخرج stdout و stderr مجتمعين حتى 8 MiB, و timeout افتراضي مقداره 60 seconds.
- الحزم: تبقي single-ABI APK التثبيت أصغر, بينما تتضمن `universal` APK الأكبر كلا ABI المدعومين.

******

### الأذونات والتكامل

******

- تتم حماية مكونات التنشيط (Wake) و info و runtime المصدرة بواسطة `org.autojs.permission.PLUGIN`, ويواصل AutoJs6 فحوص authorization المعتادة للـ plugin.
- توضع script snapshot في private directory خاصة بكل تشغيل, ويتم تشغيل Bun executable من read-only native library directory في Android بدلا من نسخها إلى writable storage.
- يسجل repository lock كلا من official release archive و binary المعبأة في APK; ترفض CI أي انحراف في الحجم أو SHA-256 أو خصائص ELF قبل build.
- يعلن plugin عن Internet permission لأن Bun script الموثوقة قد تستخدم network API مثل `fetch`. Plugin ليس sandbox; شغل فقط script التي تثق بها.

******

### واجهة plugin

******

هذا القسم موجه لمطوري مضيف AutoJs6 و plugin; يمكن للمستخدمين العاديين تخطيه. المعرفات والحدود الثابتة هي:

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

حالة 16 KB: يجتاز كلا ELF payload وإدخالاتهما في APK بوابات alignment. على AVD بحجم صفحات 16 KB يعمل بنظام Android 16 (API 36), اجتاز `arm64-v8a` اختبارات Binder الخمسة عبر `libndk_translation`, بينما يتوقف `x86_64` الأصلي بالـ exit code 134 مع script بسيطة; ويبقى arm64 الأصلي غير مختبر. لا يتم ادعاء دعم عام لـ 16 KB.

******

### خريطة الطريق

******

تجيب خريطة الطريق عن سؤالين: ما الذي يعمل الآن وما الذي يأتي لاحقا. تصف العناصر المحددة السلوك الفعلي للإصدار الحالي; أما العناصر غير المحددة (المشاريع متعددة الملفات و AutoJs6 capability bridge ودعم إصدارات Android أوسع وترقيات Bun وغيرها) فهي خطط, وليست وعدا بدعم حالي.

- [عرض ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### سجل الإصدارات

******

#### v0.2.0

_2026/09/01_

- `تلميح` يخفض هذا الإصدار الحد الأدنى لمتطلبات النظام من Android 14 إلى Android 13 (API 33); تبقى Android 9 حتى 12L (API 28 حتى 32) غير مدعومة حتى يجتاز Bun runtime المعدل بالـ patch اختبار قابلية النقل
- `إصلاح` تحديد ABI للـ runtime المثبتة من SHA-256 للـ payload المقفلة بدلا من ترتيب iteration في جدول ABI, وجعل prewarming ينفذ JavaScript smoke test مصغرة لرفض runtime غير القابلة للاستخدام قبل بدء scripts المستخدم
- `إصلاح` رفض runtime الرسمية x86_64 المعروفة بعدم التوافق قبل تشغيل process عندما يستخدم Android صفحات أكبر من 4 KiB, بعد حصر العطل في page-size ceiling بحجم 4 KiB داخل JavaScriptCore المقفلة, واستبدال Bun abort الحتمي بتشخيص محدود
- `تحسين` خفض الحد الأدنى لمتطلبات النظام: يستمر استخدام Bun 1.4.0 Android payload الرسمية المثبتة, مع تخفيف الحد الأدنى للدعم من Android 14 (API 34) إلى Android 13 (API 33) لتغطية أجهزة أكثر
- `تحسين` تحديد السبب الجذري لعدم العمل على الإصدارات الأقدم: بدءا من Android 13 يسمح seccomp النظام بالـ raw `close_range` syscall الذي يستدعيه Bun, بينما يثبت فشل جهاز حقيقي على API 31 أن API 28 حتى 32 تتطلب تعديل Bun نفسه, ولا يكفي تغيير manifest وحده
- `تحسين` تمهيد لدعم Android 9+ مستقبلا: إنشاء خطة patch لمصدر Bun قابلة لإعادة التطبيق بدقة (6 patch) وتثبيت مدخلات build (تثبيت NDK والحاوية, و 22 dependency نشطة من Android release); لم يتم build للـ runtime المعدل بعد ولن يدخل الحزم الحالية
- `تحسين` تعزيز فحوص جودة الحزم: يتحقق كل Debug و Release APK من 16 KB ZIP alignment والمحتوى الدقيق لكل ABI وحجم Bun payload المثبتة و SHA-256 الخاص بها, مع مطابقة بايتات payload المثبتة على جهاز اختبار Android 13
- `تحسين` تقوية سلسلة التوريد: تثبيت البايتات الدقيقة لـ 19 Bun source archive و 17 تنزيل toolchain, وجرد 181 إدخال integrity لـ Cargo و 172 لـ Bun registry, وإضافة materializer يرفض الكتابة فوق الملفات وفحص build مسبق لكلا ABI محمي ببوابة `buildReady`
- `تحسين` توسيع مكتبة الأمثلة الجاهزة للنسخ والتشغيل بإضافة أمثلة مشروحة لطلبات الشبكة, وقراءة الملفات وكتابتها في مساحة العمل الخاصة, وتدفق stdout/stderr, وأنواع TypeScript, مع بوابة توثيق تتحقق من توجيه `"bun";` في السطر الأول وحدود المصدر الواحد ومنع تثبيت الحزم
- `تحسين` التحقق من تنفيذ 16 KB على AVD بنظام Android 16 (API 36) مع فرض PAGE_SIZE=16384: يجتاز APK أحادي ABI لـ `arm64-v8a` جميع اختبارات Binder الخمسة عبر `libndk_translation`, بينما يتوقف payload `x86_64` الأصلي بالـ exit code 134 حتى مع script بسيطة; لذلك يبقى الدعم العام لـ 16 KB غير معلن
- `تحسين` إغلاق جزء Cargo من سلسلة توريد البناء التجريبي لنظام Android 9+: قفل جميع أرشيفات crates.io البالغ عددها 181 وماديتها (26,354,160 بايت), وإنشاء directory source موثّق بالمجاميع الاختبارية, وإثبات أن Cargo المثبّت يقرأ مساحة عمل Bun كاملة باستخدام `--locked --offline` و`CARGO_HOME` فارغ; ولا تزال إغلاقات سجل Bun وحزم المضيف مفتوحة
- `تبعية` إضافة Kotlin Parcelize runtime لكي يحتفظ R8 في Release بفئة Parcelable contract المشتركة

#### v0.1.0

_2026/09/01_

- `تلميح` الإصدار الأول: ينفذ كل تشغيل ملف script مستقلا واحدا; دوال AutoJs6 المدمجة و Java bridge والمشاريع متعددة الملفات و relative import غير متاحة بعد
- `ميزة` إضافة محرك `bun` مستقل: ضع `"bun";` في السطر الأول من script لتشغيل JavaScript و TypeScript بواسطة Bun 1.4.0 Android executable الرسمية; الأمر الفعلي هو `bun run --no-install <source>` ولا يتم تثبيت dependency تلقائيا أبدا
- `ميزة` إعادة خرج التشغيل في الوقت الفعلي: يتم بث stdout و stderr على شكل chunk محدودة عبر oneway Binder callback, وتبلغ النتيجة النهائية عن الحالة والتشخيص فقط دون حمل تدفق الخرج الكامل
- `ميزة` تشغيل قابل للتحكم: تعمل script في plugin process معزولة باسم `:bun_runtime` مع دعم الإلغاء الصريح و timeout افتراضي مدته 60 ثانية والاستعلام عن معلومات runtime و prewarming
- `ميزة` توفير Android payload رسمية 64-bit لـ `arm64-v8a` و baseline `x86_64`, مع حزم single-ABI و `universal`
- `ميزة` توفير تجربة plugin كاملة: اكتشاف plugin وتنشيط (Wake) محمي بالأذونات و PluginInfo metadata كاملة ووثائق مستخدم بعشر لغات
- `تحسين` اعتماد Binder contract مرقم الإصدارات ينقل المصدر عبر ParcelFileDescriptor, مع حد أقصى للمصدر 16 MiB وللخرج المجمع 8 MiB
- `تحسين` تشغيل Bun من native library directory للقراءة فقط في Android, والتحقق من حجم release archive المثبتة و binary المعبأة و SHA-256 وخصائص ELF
- `تحسين` التحقق من أن PT_LOAD alignment لكلا executable المعبأين لا يقل عن 16 KB, مع التوثيق الصادق بأن اختبار بيئة Android حقيقية بحجم 16 KB لم يكتمل بعد
- `تحسين` توليد README وتعليمات plugin center و changelog المدمج من مصادر JSON متحقق منها, مع إضافة فحوص CI للـ build و Markdown و runtime artifact
- `تحسين` تحديد الحد الأدنى مؤقتا عند Android 14 (API 34): على جهاز حقيقي API 31 ينهي seccomp نداء `close_range` الخاص بـ Bun بإشارة `SIGSYS`, واجتاز جهاز Sony واحد بـ API 33 الاختبار بشكل غير متوقع دون إثبات قابلية النقل, بينما نجحت اختبارات الذهاب والإياب عبر Binder لـ JS و TS على جهاز حقيقي API 35

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
