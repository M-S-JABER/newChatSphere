# الإعداد والتطوير المحلي

هذا المستند يشرح كيفية تثبيت المشروع وتشغيله محليًا.

## المتطلبات
- Node.js 18 أو أحدث
- PostgreSQL 13 أو أحدث
- Git

## تثبيت الاعتمادات
```bash
npm install
```

## إنشاء قاعدة البيانات
أنشئ قاعدة بيانات ومستخدمًا في Postgres ثم نفّذ تزامن المخطط:
```bash
createdb chatsphere
npm run db:push
```

## إعداد البيئة
انسخ ملف البيئة النموذجي واملأ القيم:
```bash
cp .env.example .env
```
راجع docs/ENVIRONMENT.md للتفاصيل.

## إنشاء أول مسؤول
```bash
npm run seed:admin
```

## تشغيل التطبيق في وضع التطوير
```bash
npm run dev
```
المنفذ الافتراضي للخادم هو 5000.

## فحص الأنواع والاختبارات
```bash
npm run check
npm run test
```

## البناء والتشغيل في الإنتاج
```bash
npm run build
npm run start
```

## التشخيص
إذا كنت بحاجة لتصحيح الويبهوك والتكامل راجع:
- docs/QUICK_START_DIAGNOSTICS.md
- docs/WEBHOOK_DEBUGGING_GUIDE.md
