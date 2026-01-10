# دليل الواجهة الخلفية

الواجهة الخلفية موجودة في `server/` وهي تطبيق Express.
توفّر REST endpoints وتستقبل webhooks وترسل تحديثات فورية.

## نقطة البدء
- server/index.ts: إعداد الـ middleware والمصادقة والمسارات وخدمة الملفات الثابتة.

## المصادقة
- server/auth.ts: استراتيجية Passport المحلية مع الجلسات.
- المسارات: /api/login و /api/logout و /api/user.
- مسارات المسؤول تستخدم `requireAdmin`.

## المسارات
- server/routes.ts: الـ API الرئيسية والويبهوك ومسارات الإدارة وخادم WebSocket.
- الرفع باستخدام multer على `/api/upload`.
- الويبهوك تحت `/webhook/*`.

## طبقة التخزين
- server/storage.ts: الوصول لبيانات المستخدمين والمحادثات والرسائل والويبهوك والإحصائيات.
- يتم استخدام Drizzle ORM للاستعلامات.

## تكامل المزوّد
- server/providers/meta.ts: تحليل حمولة Webhook الخاصة بـ Meta وبناء واصفات الوسائط.

## تسليم الوسائط
- /media/* يخدم روابط الوسائط الموقّعة أو العامة.
- منطق التوقيع في `server/lib/signedUrl`.

## السجلات
- server/logger.ts لـ pino وتسجيل طلبات HTTP.

## WebSocket
خادم WebSocket يتم إنشاؤه في `server/routes.ts` على المسار `/ws`.
يبث أحداث الرسائل للعملاء المتصلين.
