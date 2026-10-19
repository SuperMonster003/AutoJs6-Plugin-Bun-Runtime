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

> تحتاج ملفات المشروع إلى مضيف يتفاوض على أرشيف مساحة العمل. عندها يمكن لبرامج project.json/package.json استخدام الاستيراد النسبي; وإلا يرسل ملف مصدر واحد فقط. لا يتم تثبيت الاعتماديات تلقائيا (--no-install).

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
- تحويلات OpenCC وواجهات الصور الشائعة عبر عميل المضيف, مع قراءة البكسلات والترميز والتحويل والبحث عن الألوان وتحرير الصور عند انتهاء التشغيل; يتطلب الوصول لملفات المضيف إذنا منفصلا معطلا افتراضيا.
- يدعم Bun التقاط الشاشة بإذن مستقل وموافقة Android والتنظيف عند الإلغاء أو انتهاء المهلة وإعادة الطلب.
- يحفظ Bun screenRecorder ملفات H.264 MP4 مع صوت AAC اختياري من الميكروفون أو التطبيقات أو مزيجهما ولقطات أثناء التسجيل, مع أذونات صوت مستقلة وتنظيف عند الإلغاء.
- واجهات Bun لإمكانية الوصول وعمليات التطبيقات والحافظة متوافقة مع Node.js مع أذونات مستقلة ودعم التطبيقات المحزمة.
- واجهات Bun للملفات والتخزين الدائم مع أذونات مستقلة وبيانات تخزين مشتركة مع Node.js.
- واجهات database/sqlite للمضيف في Bun وWorkers من Node.js مع استعلامات بمعاملات ومعاملات ذرية وتخزين دائم.
- أخذ عينات المستشعرات والاشتراك بها في Bun وWorkers من Node.js مع الإلغاء والتحرير التلقائي للمستمعين.
- Shell المضيف مع تدفق الإدخال والإخراج وتفويض Shizuku وتنظيف العمليات في Bun وNode.js وWorkers.

******

### القيود الحالية

******

- تحتاج ملفات المشروع إلى مضيف يتفاوض على أرشيف مساحة العمل. عندها يمكن لبرامج project.json/package.json استخدام الاستيراد النسبي; وإلا يرسل ملف مصدر واحد فقط. لا يتم تثبيت الاعتماديات تلقائيا (--no-install).
- لا تتم إضافة متغيرات Rhino العامة. استخدم SDK الصريح لواجهات المضيف الموثقة للنصوص والصور والتقاط الشاشة وUI/Compose وWebView والأتمتة. الواجهات غير المدرجة وكائنات Java العامة غير مدعومة.
- لا يوجد Java bridge: لا يستطيع Bun script الوصول مباشرة إلى Java class أو object في عملية AutoJs6.
- لا يوجد وعد بـ Bun toolchain كاملة: تقع `bunx` و executable المنتجة على الجهاز و runtime C compilation وأي native addon خارج النطاق المدعوم.
- ليس security sandbox: يعمل Bun script ككود موثوق في plugin process ويمكنه استخدام permission الممنوحة للـ plugin, لذلك شغل فقط script التي تثق بها.

******

### الأسئلة الشائعة

******

#### لماذا دوال AutoJs6 مثل `click()` و `toast()` غير متاحة في Bun script?

استورد `process.env.AUTOJS6_HOST_CLIENT_MODULE` وانتظر `createHostClient()`. يوفر المضيف build 5572 مع Bun Runtime 0.3.0 الواجهات `host.app` و`host.accessibility` و`host.clipboard`. فعّل الأذونات المستقلة في مركز الإضافات. تتطلب الإيماءات أيضا `accessibility.gesture`. تصرح المشاريع المحزمة بالأذونات نفسها. تبقى قواعد Android لخدمة إمكانية الوصول والوصول إلى الحافظة في المقدمة سارية. راجع [Host API](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/host-api.md). واجهات Bun للملفات والتخزين الدائم مع أذونات مستقلة وبيانات تخزين مشتركة مع Node.js. (`host.files`, `host.storage`, `host.storages`; `files.control`, `storage.control`.)

#### هل يمكنني استخدام حزم npm?

ليس بتثبيتها على الجهاز. يعمل plugin دائما بـ `--no-install` ولا ينزل dependency أبدا. إذا كانت مكتبة خارجية ضرورية فعلا, اجمع أولا script مع dependency الخاصة به من JS الخالص في ملف واحد على حاسوب, مثلا بـ `bun build`, ثم شغل هذا الملف على الجهاز; لا يمكن بهذه الطريقة استخدام الحزم التي تعتمد على native addon.

#### هل يمكن لـ script عمل `import` لملفات أخرى من المشروع?

تحتاج ملفات المشروع إلى مضيف يتفاوض على أرشيف مساحة العمل. عندها يمكن لبرامج project.json/package.json استخدام الاستيراد النسبي; وإلا يرسل ملف مصدر واحد فقط. لا يتم تثبيت الاعتماديات تلقائيا (--no-install).

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

#### v0.9.0

_2026/10/19_

- `ميزة` التحكم بالجهاز ومربعات الحوار في Bun وNode.js Workers مع السطوع والصوت والتنظيف المستقل للنوافذ

#### v0.8.0

_2026/10/19_

- `ميزة` أحداث وإشعارات المضيف في Bun وNode.js Workers مع تنظيف مستقل للاشتراكات والإشعارات

#### v0.7.0

_2026/10/19_

- `ميزة` Shell المضيف مع تدفق الإدخال والإخراج وتفويض Shizuku وتنظيف العمليات في Bun وNode.js وWorkers

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
