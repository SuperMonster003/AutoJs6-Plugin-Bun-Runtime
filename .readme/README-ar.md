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

يعمل plugin بطريقة بسيطة: يرسل AutoJs6 محتوى script إلى plugin, ويشغل plugin ملف Bun Android executable الرسمي في process معزولة خاصة به, ثم يعود الخرج مع النتيجة النهائية إلى console الخاصة بـ AutoJs6 في الوقت الفعلي. هذا Bun حقيقي, وليس alias أو طبقة محاكاة فوق Rhino أو Node.js. على Android 17 أو أحدث, اسمح بالأجهزة القريبة قبل تفعيل هذا الملحق في مركز ملحقات AutoJs6. يمكنك أيضا إدارة إذن الشبكة المحلية من صفحة إعدادات الملحق. دون الإذن يبقى الملحق معطلا ويتم تخطي التشغيل التلقائي بصمت. يخص الإذن هذا الملحق وهو مستقل عن إذن AutoJs6.

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

يعمل Bun في process منفصلة وهو محرك JavaScript مختلف تماما عن Rhino, لذلك لا تظهر AutoJs6 globals داخل Bun script. يتطلب السماح لـ Bun script باستدعاء قدرات الأتمتة host bridge يعرض كل قدرة بوضوح; ولا يقدم الإصدار الحالي عمدا أي واجهة أتمتة. القدرة الأولى للقراءة فقط (لقطة معلومات المضيف: ملف JSON يشير إليه متغير البيئة `AUTOJS6_HOST_INFO_FILE` ويحوي إصدار المضيف و plugin) منفذة في جانب plugin, وكذلك الجزء الثاني: استدعاءات وقت التشغيل (`ui.toast` و `device.info`) التي تجريها scripts عبر `fetch(url, { unix })` على unix socket الذي يحدده متغير البيئة `AUTOJS6_HOST_BRIDGE_SOCKET`. تصبح كلتاهما متاحتين عندما يصدر AutoJs6 إصدار المضيف المطابق, ويمكن إيقاف كل قدرة على حدة من صفحة إعدادات plugin داخل مركز plugins في AutoJs6. انظر خريطة الطريق للاطلاع على الخطط.

#### هل يمكنني استخدام حزم npm?

ليس بتثبيتها على الجهاز. يعمل plugin دائما بـ `--no-install` ولا ينزل dependency أبدا. إذا كانت مكتبة خارجية ضرورية فعلا, اجمع أولا script مع dependency الخاصة به من JS الخالص في ملف واحد على حاسوب, مثلا بـ `bun build`, ثم شغل هذا الملف على الجهاز; لا يمكن بهذه الطريقة استخدام الحزم التي تعتمد على native addon.

#### هل يمكن لـ script عمل `import` لملفات أخرى من المشروع?

ليس مع إصدار AutoJs6 المنشور حاليًا. منذ الإضافة 0.2.2 يقبل وقت التشغيل لقطة مشروع (أرشيف ZIP محدود لمساحة العمل) ويوسّعها داخل مساحة العمل الخاصة بكل تشغيل، لذا يتم حل الاستيرادات النسبية داخل المشروع. يجب أن يقوم المضيف بتغليف مجلد المشروع والإعلان عن هذه القدرة؛ وتغيير المضيف هذا جاهز لكنه لم يُنشر بعد. حتى ذلك الحين تُنقل لقطات الملف الواحد فقط، وتعمل صياغة ESM داخل الملف الواحد بشكل طبيعي.

#### لماذا Android 13 هو الحد الأدنى?

يستدعي Bun نداء النظام `close_range` في Linux (syscall 436), وهو غير مدرج في app seccomp allowlist على Android 12L وما قبله, لذلك يقتل process الخاصة بـ Bun بإشارة `SIGSYS` (تم إعادة إنتاجه على جهاز حقيقي API 31). يسمح Android 13 بهذا النداء, ونجحت اختبارات الأجهزة الحقيقية على API 33 و API 35. يتطلب دعم الإصدارات الأقدم عمل patch لـ Bun; انظر خريطة الطريق لمتابعة التقدم.

#### ماذا يحدث عندما ينتهي وقت script أو يطبع أكثر من اللازم?

يحدد كل تشغيل افتراضيا بـ 60 seconds; عند timeout يتم إنهاء process الخاصة بـ Bun وتوسم النتيجة بأنها انتهت المهلة. عندما يتجاوز خرج stdout و stderr مجتمعين 8 MiB, ينتهي التشغيل بخطأ تجاوز حد الخرج بدلا من الاقتطاع الصامت. في كلتا الحالتين, قسم المهمة أو قلل كمية الخرج.

#### هل أجهزة page-size بحجم 16 KB مدعومة?

16 KB: تجتاز ملفات ELF وAPK اختبارات المحاذاة. على Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), اجتاز APK التطوير v0.2.1 المخصص لـ arm64 مع Bun الرسمي اختبارات Binder الثمانية مرتين دون ترجمة المعمارية. تظل نتيجة ARM64 السابقة على AVD بمعمارية x86_64 نتيجة عبر الترجمة فقط; ويتوقف x86_64 الأصلي حتى مع سكربت بسيط برمز الخروج 134. هذا دليل تطوير خاص بالجهاز, وليس اعتمادا لـ APK إصدار منشور أو دعما عاما لـ 16 KB.

#### أي APK يجب أن أثبت?

تستخدم معظم الهواتف والأجهزة اللوحية `arm64-v8a`. استخدم baseline `x86_64` للمحاكيات أو أجهزة x86_64. عند عدم التأكد, ثبت `universal` الذي يتضمن كلا ABI; أكبر قليلا لكنه الخيار الأكثر أمانا.

#### أين أجد المساعدة في تشخيص مشكلات التثبيت والتشغيل?

راجع [دليل استكشاف الأخطاء (بالصينية)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md) للحصول على برنامج نصي بسيط وفحوص التنشيط وAndroid وABI وحجم الصفحة والمهلة وحدود المخرجات والاستيراد, والمعلومات المطلوبة للإبلاغ عن مشكلة.

******

### التوافق

******

- المحرك: Bun الرسمي 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- النظام: Android 13 (API 33) أو أحدث, مع executable رسمية 64-bit لـ `arm64-v8a` و baseline `x86_64`. لا يدعم بعد Android 9 حتى 12L (API 28 حتى 32); تشرح الأسئلة الشائعة أعلاه السبب. نجحت اختبارات الأجهزة الحقيقية على API 33 و API 35.
- المضيف: AutoJs6 build 5278 أو أحدث, مع Bun runtime contract version 1.
- حدود كل تشغيل: مصدر حتى 16 MiB, وخرج stdout و stderr مجتمعين حتى 8 MiB, و timeout افتراضي مقداره 60 seconds.
- الحزم: تبقي single-ABI APK التثبيت أصغر, بينما تتضمن `universal` APK الأكبر كلا ABI المدعومين.
- أدلة الاختبار: تعرض [مصفوفة التوافق المولدة (بالصينية)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) الأجهزة ومستويات API ومعماريات ABI وأحجام الصفحات ونتائج كل مجموعة اختبارات مسجلة. تحتفظ الاختبارات الرسمية والتجريبية والمترجمة والفاشلة بنطاقها الخاص; ولا توسع هذه السجلات الدعم المعلن.

******

### الأذونات والتكامل

******

- يتولى مشرف منفصل مثبت للقراءة فقط المهلة والإلغاء وحدود الإخراج, حتى عندما يتجاهل البرنامج SIGTERM. ينتظر خروج عملية Bun المباشرة; وليس بيئة معزولة أو مديرا لكل العمليات التابعة المنفصلة.
- تتم حماية مكونات التنشيط (Wake) و info و runtime المصدرة بواسطة `org.autojs.permission.PLUGIN`, ويواصل AutoJs6 فحوص authorization المعتادة للـ plugin.
- توضع script snapshot في private directory خاصة بكل تشغيل, ويتم تشغيل Bun executable من read-only native library directory في Android بدلا من نسخها إلى writable storage.
- يسجل repository lock كلا من official release archive و binary المعبأة في APK; ترفض CI أي انحراف في الحجم أو SHA-256 أو خصائص ELF قبل build.
- يعلن plugin عن Internet permission لأن Bun script الموثوقة قد تستخدم network API مثل `fetch`. Plugin ليس sandbox; شغل فقط script التي تثق بها.

******

### أخطاء التشغيل واستكشاف الأخطاء

******

تستخدم الرسائل إعداد لغة Android للإضافة. قد تبقى تفاصيل التشخيص منخفضة المستوى ومخرجات Bun باللغة الإنجليزية.

- إذا لم يكن Bun Runtime مفعلا, افتح مركز الإضافات في AutoJs6 وامنح الإضافة الإذن ومكنها, واستخدم إجراء التنشيط إذا عرضه المضيف.
- تتطلب الإضافة الرسمية Android 13 (API 33) أو أحدث. لا يمكن تشغيلها على Android 9 إلى 12L; خفض المتطلب في ملف البيان لا يجعل بيئة التشغيل متوافقة.
- `TIMEOUT`: انتهت مهلة تشغيل Bun. اختصر المهمة أو عدل مهلة التشغيل ضمن الحد المسموح.
- `OUTPUT_LIMIT`: تجاوزت مخرجات Bun حد البايتات المحدد. قلل مخرجات stdout وstderr, ثم شغل السكربت مجددا.
- `RUNTIME_UNAVAILABLE`: Bun Runtime غير متاح. تحقق من توافق الجهاز وأعد تثبيت الإضافة إذا كانت ملفاتها غير مكتملة.

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

16 KB: تجتاز ملفات ELF وAPK اختبارات المحاذاة. على Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), اجتاز APK التطوير v0.2.1 المخصص لـ arm64 مع Bun الرسمي اختبارات Binder الثمانية مرتين دون ترجمة المعمارية. تظل نتيجة ARM64 السابقة على AVD بمعمارية x86_64 نتيجة عبر الترجمة فقط; ويتوقف x86_64 الأصلي حتى مع سكربت بسيط برمز الخروج 134. هذا دليل تطوير خاص بالجهاز, وليس اعتمادا لـ APK إصدار منشور أو دعما عاما لـ 16 KB.

******

### خريطة الطريق

******

تجيب خريطة الطريق عن سؤالين: ما الذي يعمل الآن وما الذي يأتي لاحقا. تصف العناصر المحددة السلوك الفعلي للإصدار الحالي; أما العناصر غير المحددة (المشاريع متعددة الملفات و AutoJs6 capability bridge ودعم إصدارات Android أوسع وترقيات Bun وغيرها) فهي خطط, وليست وعدا بدعم حالي.

- [عرض ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### سجل الإصدارات

******

#### v0.2.5

_2026/09/16_

- `تلميح` لقطة تطوير لم تنشر بعد; لا يزال المكون الإضافي الرسمي يتطلب Android 13 (API 33) أو أحدث
- `تحسين` أرشفة التحقق من أصول APK/المصدر المنشورة للإصدار v0.2.4 وقبول APK النهائي الموقع في أربع بيئات على البايتات النهائية للإصدار: ترقيات في المكان من v0.2.3 المنشور على Sony API 33 arm64 و Xiaomi API 35 universal, وتثبيتات جديدة على Redmi API 33 arm64 و AVD x86_64 API 33, كل منها يجتاز 11/11 مجموعة قبل force-stop وبعده (المجموعة الحادية عشرة هي جسر القدرات الديناميكي مع broker داخل العملية); لم يتوفر جهاز 16 KiB هذه المرة وحمولات runtime لم تتغير منذ v0.2.2; لا تعاد كتابة الوسم المنشور ولا يتوسع نطاق توافق Android/16 KB

#### v0.2.4

_2026/09/16_

- `ميزة` الجزء الثاني من M7: جسر القدرات للاستدعاءات الديناميكية في وقت التشغيل وأول قدرتين ديناميكيتين `ui.toast` / `device.info`. عندما يضع المضيف `hostCapabilityBridgeVersion = 1` و `hostCapabilityBroker` (IBinder) و `hostCapabilities` (معرّفات القدرات الممنوحة) في طلب runScript, ينشئ plugin لكل تشغيل unix socket في دليل الذاكرة المؤقتة الخاص به (متغير البيئة `AUTOJS6_HOST_BRIDGE_SOCKET`); ترسل scripts عبر `fetch(url, { unix })` الطلبين `GET /v1/info` و `POST /v1/<معرّف القدرة>` (طلبات JSON حتى 64 KiB, نتائج حتى 256 KiB, بحد أقصى 1024 استدعاء لكل تشغيل, 4 متزامنة, 10 s لكل استدعاء), ويمررها plugin عبر AIDL oneway `IBunHostCapabilityBroker` ولا يقبل الردود إلا من UID المضيف لهذا التشغيل. رموز أخطاء الجسر (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500) تظهر فقط في ردود JSON; مجموعة رموز الأخطاء النهائية لـ runScript لم تتغير, ويضاف إلى Bundle النهائي `hostBridgeDelivered` و `hostCalls`; يغلق socket وكل استدعاء معلق عند انتهاء التشغيل. مفتاح القدرة `SUPPORTS_HOST_CAPABILITY_BRIDGE`, وترقية AAR العقد المشترك إلى 22437 bytes; سلوك المضيفين الذين لا يقدمون الجسر لا يتغير إطلاقا
- `تحسين` نقل إذن الشبكة المحلية على Android 17 إلى مسار التفعيل وإعدادات الملحق دون صفحة إذن في المشغل; يبقى الملحق معطلا دون الإذن ويتم تخطي التشغيل التلقائي بصمت
- `تحسين` أرشفة أدلة التحقق من ملفات APK والمصادر المنشورة مع v0.2.3 واختبارات قبول ملفات APK النهائية الموقعة في خمس بيئات على البايتات النهائية المنشورة: ترقية فوق v0.2.2 المنشورة على Sony API 33 arm64 و Xiaomi API 35 universal, وتثبيت جديد على Redmi API 33 arm64 و AVD x86_64 API 33 و Samsung SM-A566B API 36 بمعمارية arm64 أصلية وصفحات 16 KiB, وكل منها اجتاز 10/10 مجموعات قبل force-stop وبعده (المجموعة العاشرة هي لقطة معلومات المضيف); لا يعاد كتابة الوسم المنشور ولا يتوسع نطاق توافق Android/16 KB
- `تحسين` استهداف Android 17 (SDK 37) مع تحكم مستقل بإذن الشبكة المحلية للملحق وإرشادات استعادة الوصول

#### v0.2.3

_2026/09/16_

- `ميزة` أول قدرة مضيف في M7: لقطة معلومات المضيف للقراءة فقط. عندما يرسل المضيف `hostInfoVersion = 1` و `hostInfo` (اسم الحزمة, و versionDate و languageTag اختياريين) في طلب runScript, يتحقق plugin من أن الحزمة تخص UID المستدعي عبر Binder, ويحل إصدار المضيف بنفسه عبر PackageManager, ويكتب حقائق المضيف و plugin والتشغيل الحالي في JSON لا يتجاوز 16 KiB داخل `autojs6/host-info.json` في مجلد التشغيل (خارج `project`, يحذف مع التشغيل), ويخبر script بالمسار عبر متغير البيئة `AUTOJS6_HOST_INFO_FILE`; ويضاف `hostInfoDelivered` إلى Bundle النهائي. القدرة `SUPPORTS_HOST_INFO`; البادئة `AUTOJS6_` محجوزة لـ plugin (يرفض طلب المضيف الذي يحملها بـ INVALID_REQUEST), وترفض الحزمة المنتحلة أو الإصدار المجهول قبل تشغيل Bun. AAR العقد المشترك يصبح 14073 bytes; المضيفون الذين لا يقدمون اللقطة يعملون تماما كما في السابق
- `تحسين` أرشفة أدلة التحقق من ملفات APK والمصادر المنشورة مع v0.2.2 واختبارات قبول ملفات APK النهائية الموقعة في أربع بيئات: ترقية فوق v0.2.0 المنشورة على Sony API 33 arm64 و Xiaomi API 35 universal, وتثبيت جديد على Redmi API 33 arm64 وعلى AVD x86_64 API 33, كل منها 9/9 مجموعات قبل force-stop وبعده; دون تغيير الوسم المنشور أو توسيع توافق Android وصفحات 16 KB
- `تحسين` التحقق من الرحلة الفعلية للمشروع بين المضيف والمكون الإضافي باستخدام AutoJs6 مبني محليا من فرع master للمضيف (7c31269cc) مع المكون الإضافي v0.2.2 x86_64 المنشور على AVD بواجهة API 33: مشروع project.json مع استيرادات نسبية و JSON, ومشروع TypeScript مع package.json, وملف مفرد للمقارنة لا يزال يفشل بشكل مغلق; ولا يزال نشر المضيف نفسه معلقا
- `تحسين` استكمال أدلة إصدار v0.2.2 بقبول ملف APK النهائي الموقع على عتاد arm64 أصلي بصفحات 16 KiB: تم تثبيت ملف arm64-v8a المنشور تثبيتا جديدا على Samsung SM-A566B (API 36, Remote Test Lab), واجتاز 9/9 مجموعات قبل force-stop وبعده مع ربط البايتات المثبتة بأصل الإصدار, ثم أزيل بعد ذلك; يغطي السجل الآن خمس بيئات
- `تحسين` تكرار الرحلة الفعلية للمشروع بين المضيف والمكون الإضافي على جهازين ARM64 أصليين بنفس مضيف AutoJs6 المبني محليا (master 7c31269cc) والمكون الإضافي المنشور v0.2.2 arm64-v8a: شغل كل من Samsung SM-A566B (API 36, صفحات 16 KiB) و Redmi 22120RN86C (API 33) مشروع project.json مرتين, ومشروع TypeScript مع package.json مرة واحدة, والملف المفرد للمقارنة, وكلها بالنتيجة المتوقعة; ويبقى نشر المضيف قرار المستخدم
- `تحسين` تشغيل مجموعة instrumentation مع الاختبارين الجديدين (اللقطة تسلم وتتحقق فقط عند تقديمها, و globals المضيف تفشل بوضوح بـ ReferenceError) على Redmi 22120RN86C (API 33) و Samsung SM-A566B (API 36, صفحات 16 KiB) بنتيجة OK (17 tests) على كل منهما, وإكمال جولة ذهاب وعودة للقطة بين المضيف و plugin على الجهازين بمضيف AutoJs6 مبني محليا (master d9b4033bd مع attachHostInfo) و plugin release 0.2.3 المحلي: تشغيل الملف المفرد ومشروع project.json يقرأ حقائق المضيف و plugin والتشغيل المتحقق منها, ولا يرى script أي لقطة بعد إلغاء إذن المضيف ويستلمها مجددا بعد استعادته, وأعيد المضيف إلى APK الأصلي للمستخدم; مسجل في docs/compatibility/2026-09-16-m7-host-info-snapshot

##### لمزيد من سجل الإصدارات

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-ar.md)

******

### Build والتحقق

******

يجب أن يقوم Git LFS بتحويل runtime binary المثبتتين إلى ملفات فعلية قبل التحقق أو Gradle packaging. تظهر فحوص local القياسية أدناه. يلزم JDK 17 أو أحدث و Node.js و Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
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

كود plugin مرخص بموجب [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). تتضمن Bun executable الرسمية كود Bun المرخص بـ MIT و JavaScriptCore و WebKit المرتبطين statically بموجب LGPL-2 ومكونات أخرى بتراخيصها الخاصة. تنشر Releases المنطبقة إشعارا عاما للترخيص/relinking وassets المصدر المطابق منفصلة عن ملفات APK في Release نفسه, مع manifest قابل للقراءة آليا وSHA256SUMS تم التحقق منهما بفحوص تقنية آلية. راجع [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) و [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) المثبت لـ Bun.

******

### روابط

******

- مشروع AutoJs6: https://github.com/SuperMonster003/AutoJs6
- موقع Bun الرسمي: https://bun.sh/
- إصدار Bun المثبت: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- إشعارات الأطراف الخارجية: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
