******

### سجل الإصدارات

******

# v0.2.0

###### 2026/09/01

* `تلميح` يخفض هذا الإصدار الحد الأدنى لمتطلبات النظام من Android 14 إلى Android 13 (API 33); تبقى Android 9 حتى 12L (API 28 حتى 32) غير مدعومة حتى يجتاز Bun runtime المعدل بالـ patch اختبار قابلية النقل
* `تحسين` خفض الحد الأدنى لمتطلبات النظام: يستمر استخدام Bun 1.4.0 Android payload الرسمية المثبتة, مع تخفيف الحد الأدنى للدعم من Android 14 (API 34) إلى Android 13 (API 33) لتغطية أجهزة أكثر
* `تحسين` تحديد السبب الجذري لعدم العمل على الإصدارات الأقدم: بدءا من Android 13 يسمح seccomp النظام بالـ raw `close_range` syscall الذي يستدعيه Bun, بينما يثبت فشل جهاز حقيقي على API 31 أن API 28 حتى 32 تتطلب تعديل Bun نفسه, ولا يكفي تغيير manifest وحده
* `تحسين` تمهيد لدعم Android 9+ مستقبلا: إنشاء خطة patch لمصدر Bun قابلة لإعادة التطبيق بدقة (6 patch) وتثبيت مدخلات build (تثبيت NDK والحاوية, و 22 dependency نشطة من Android release); لم يتم build للـ runtime المعدل بعد ولن يدخل الحزم الحالية
* `تحسين` تعزيز فحوص جودة الحزم: يتحقق كل Debug و Release APK من 16 KB ZIP alignment والمحتوى الدقيق لكل ABI وحجم Bun payload المثبتة و SHA-256 الخاص بها, مع مطابقة بايتات payload المثبتة على جهاز اختبار Android 13
* `تحسين` تقوية سلسلة التوريد: تثبيت البايتات الدقيقة لـ 19 Bun source archive و 17 تنزيل toolchain, وجرد 181 إدخال integrity لـ Cargo و 172 لـ Bun registry, وإضافة materializer يرفض الكتابة فوق الملفات وفحص build مسبق لكلا ABI محمي ببوابة `buildReady`
* `تبعية` إضافة Kotlin Parcelize runtime لكي يحتفظ R8 في Release بفئة Parcelable contract المشتركة

# v0.1.0

###### 2026/09/01

* `تلميح` الإصدار الأول: ينفذ كل تشغيل ملف script مستقلا واحدا; دوال AutoJs6 المدمجة و Java bridge والمشاريع متعددة الملفات و relative import غير متاحة بعد
* `ميزة` إضافة محرك `bun` مستقل: ضع `"bun";` في السطر الأول من script لتشغيل JavaScript و TypeScript بواسطة Bun 1.4.0 Android executable الرسمية; الأمر الفعلي هو `bun run --no-install <source>` ولا يتم تثبيت dependency تلقائيا أبدا
* `ميزة` إعادة خرج التشغيل في الوقت الفعلي: يتم بث stdout و stderr على شكل chunk محدودة عبر oneway Binder callback, وتبلغ النتيجة النهائية عن الحالة والتشخيص فقط دون حمل تدفق الخرج الكامل
* `ميزة` تشغيل قابل للتحكم: تعمل script في plugin process معزولة باسم `:bun_runtime` مع دعم الإلغاء الصريح و timeout افتراضي مدته 60 ثانية والاستعلام عن معلومات runtime و prewarming
* `ميزة` توفير Android payload رسمية 64-bit لـ `arm64-v8a` و baseline `x86_64`, مع حزم single-ABI و `universal`
* `ميزة` توفير تجربة plugin كاملة: اكتشاف plugin وتنشيط (Wake) محمي بالأذونات و PluginInfo metadata كاملة ووثائق مستخدم بعشر لغات
* `تحسين` اعتماد Binder contract مرقم الإصدارات ينقل المصدر عبر ParcelFileDescriptor, مع حد أقصى للمصدر 16 MiB وللخرج المجمع 8 MiB
* `تحسين` تشغيل Bun من native library directory للقراءة فقط في Android, والتحقق من حجم release archive المثبتة و binary المعبأة و SHA-256 وخصائص ELF
* `تحسين` التحقق من أن PT_LOAD alignment لكلا executable المعبأين لا يقل عن 16 KB, مع التوثيق الصادق بأن اختبار بيئة Android حقيقية بحجم 16 KB لم يكتمل بعد
* `تحسين` توليد README وتعليمات plugin center و changelog المدمج من مصادر JSON متحقق منها, مع إضافة فحوص CI للـ build و Markdown و runtime artifact
* `تحسين` تحديد الحد الأدنى مؤقتا عند Android 14 (API 34): على جهاز حقيقي API 31 ينهي seccomp نداء `close_range` الخاص بـ Bun بإشارة `SIGSYS`, واجتاز جهاز Sony واحد بـ API 33 الاختبار بشكل غير متوقع دون إثبات قابلية النقل, بينما نجحت اختبارات الذهاب والإياب عبر Binder لـ JS و TS على جهاز حقيقي API 35
