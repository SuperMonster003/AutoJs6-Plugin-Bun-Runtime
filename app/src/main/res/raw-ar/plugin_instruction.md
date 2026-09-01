Bun Runtime هو plugin مستقل لنظام Android يتيح لـ AutoJs6 اختيار [Bun](https://bun.sh/) كمحرك منفصل لـ JavaScript و TypeScript. يرسل المضيف snapshot واحدة من المصدر عبر file descriptor, ويشغل plugin ملف Bun Android executable الرسمي والمثبت داخل runtime process خاصة به, ثم يعيد stdout و stderr وحالة الاكتمال و timeout و cancellation عبر Binder. هذا تشغيل حقيقي لـ Bun وليس alias لـ Rhino أو Node.js.

يشغل هذا الإصدار Bun 1.4.0 Android executable الرسمية في plugin runtime process معزولة باستخدام `bun run --no-install <source>`. يستقبل JS أو TS source snapshot واحدة, ولا يثبت dependency مفقودة تلقائيا, ويبث stdout و stderr والحالة النهائية إلى AutoJs6.

### بدء سريع

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

يبدأ الخرج المتوقع بـ `Bun 1.4.0` ثم يطبع `android`.

### قيود الإصدار 0.1

- Snapshot واحدة فقط: لا ينفذ هذا الإصدار نقل مشروع متعدد الملفات أو relative project import.
- لا توجد AutoJs6 globals: لا تظهر Rhino globals أو Android automation API أو host object داخل Bun.
- لا يوجد Java bridge: لا يستطيع Bun الوصول مباشرة إلى Java class أو object داخل عملية AutoJs6.
- لا يوجد وعد بـ toolchain كاملة: تقع `bunx` و executable المنتجة على الجهاز و runtime C compilation وأي native addon خارج النطاق المدعوم.
- ليس security sandbox: يعمل Bun script ككود موثوق تحت plugin app UID ويمكنه استخدام permission الممنوحة إلى plugin.

راجع [README الخاص بالمشروع](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) لمعرفة التوافق والأمان واختيار الحزمة وجميع قيود الإصدار 0.1.
