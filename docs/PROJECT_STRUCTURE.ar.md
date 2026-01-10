# هيكلة المشروع

هذا ملخص لبنية المستودع والمسؤوليات الرئيسية.

```
ChatSpherepPRO/
  client/                 الواجهة الأمامية (React + Vite)
    src/
      components/         مكونات الواجهة
      hooks/              Hooks للعميل
      lib/                أدوات مساعدة للعميل
      pages/              المسارات الرئيسية
      types/              أنواع الواجهة
  server/                 الواجهة الخلفية (Express + WebSocket)
    auth.ts               الجلسات وتسجيل الدخول
    db.ts                 تهيئة قاعدة البيانات
    health.ts             نقاط الصحة
    index.ts              نقطة تشغيل الخادم
    logger.ts             السجلات
    routes.ts             مسارات الـ API والويبهوك
    storage.ts            طبقة الوصول للبيانات
    providers/            التكاملات (مزود Meta)
    scripts/              سكربتات الإدارة وقاعدة البيانات
  shared/                 مخطط البيانات والأنواع المشتركة
    schema.ts             جداول Drizzle + الأنواع
  docs/                   التوثيق
  uploads/                تخزين الوسائط (محلي)
  scripts/                سكربتات المشروع
  .env.example            مثال إعداد البيئة
  package.json            السكربتات والاعتمادات
```

إذا كنت بحاجة لفهم السلوك أو التدفقات، ابدأ بـ:
- server/index.ts
- server/routes.ts
- client/src/pages
- client/src/components
- shared/schema.ts
