يتيح هذا plugin لـ AutoJs6 تشغيل JavaScript و TypeScript بمحرك Bun 1.4.0 الرسمي: ضع `"bun";` في السطر الأول من script, فيتم تنفيذ الملف بواسطة Bun في plugin process معزولة (الأمر الفعلي هو `bun run --no-install <source>`), مع بث الخرج والنتيجة النهائية إلى AutoJs6. ينفذ كل تشغيل snapshot واحدة من الملف الحالي ولا يثبت npm dependency تلقائيا أبدا.

### التثبيت والاستخدام

1. جهز البيئة: ثبت AutoJs6 build 5278 (6.8.0) أو أحدث على Android 13 (API 33) أو أحدث.
2. ثبت plugin: نزل وثبت APK المطابق للجهاز من [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). اختر `arm64-v8a` لمعظم الهواتف والأجهزة اللوحية, و `x86_64` للمحاكيات أو أجهزة x86_64, أو `universal` عند عدم التأكد (أكبر قليلا ويعمل على كليهما).
3. فعل plugin: افتح plugin center في AutoJs6 وفعل Bun Runtime. إذا ظهر plugin المثبت حديثا متوقفا, اضغط إجراء `تنشيط` الذي يعرضه المضيف.
4. شغل script: ضع `"bun";` وحده في السطر الأول من ملف JavaScript أو TypeScript (مع علامتي الاقتباس والفاصلة المنقوطة), ثم شغل الملف من AutoJs6 كالمعتاد.

### بدء سريع

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

إذا سار كل شيء جيدا, يكون أول سطر في الخرج `Bun 1.4.0` والسطر الثاني `android`.

### القيود الحالية

- ملف واحد لكل تشغيل: يستقبل plugin وينفذ source snapshot واحدة دون مجلد المشروع, لذلك لا يمكن حل relative import مثل `import './utils.js'`. لا تتأثر ESM syntax داخل الملف الواحد; عند الحاجة إلى عدة module, اجمعها أولا في ملف واحد على حاسوب (انظر الأسئلة الشائعة).
- لا توجد دوال AutoJs6 مدمجة: automation API مثل `click()` و `toast()` و Rhino globals غير موجودة داخل Bun script, لذلك تناسب Bun script حاليا المهام التي لا تعتمد على قدرات المضيف, مثل الحساب ومعالجة النصوص وطلبات الشبكة.
- لا يوجد Java bridge: لا يستطيع Bun script الوصول مباشرة إلى Java class أو object في عملية AutoJs6.
- لا يوجد وعد بـ Bun toolchain كاملة: تقع `bunx` و executable المنتجة على الجهاز و runtime C compilation وأي native addon خارج النطاق المدعوم.
- ليس security sandbox: يعمل Bun script ككود موثوق في plugin process ويمكنه استخدام permission الممنوحة للـ plugin, لذلك شغل فقط script التي تثق بها.

### أخطاء التشغيل واستكشاف الأخطاء

تستخدم الرسائل إعداد لغة Android للإضافة. قد تبقى تفاصيل التشخيص منخفضة المستوى ومخرجات Bun باللغة الإنجليزية.

- إذا لم يكن Bun Runtime مفعلا, افتح مركز الإضافات في AutoJs6 وامنح الإضافة الإذن ومكنها, واستخدم إجراء التنشيط إذا عرضه المضيف.
- تتطلب الإضافة الرسمية Android 13 (API 33) أو أحدث. لا يمكن تشغيلها على Android 9 إلى 12L; خفض المتطلب في ملف البيان لا يجعل بيئة التشغيل متوافقة.
- `TIMEOUT`: انتهت مهلة تشغيل Bun. اختصر المهمة أو عدل مهلة التشغيل ضمن الحد المسموح.
- `OUTPUT_LIMIT`: تجاوزت مخرجات Bun حد البايتات المحدد. قلل مخرجات stdout وstderr, ثم شغل السكربت مجددا.
- `RUNTIME_UNAVAILABLE`: Bun Runtime غير متاح. تحقق من توافق الجهاز وأعد تثبيت الإضافة إذا كانت ملفاتها غير مكتملة.

راجع [README الخاص بالمشروع](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) لمعرفة التوافق والأذونات واختيار الحزمة والقائمة الكاملة للقيود الحالية.
