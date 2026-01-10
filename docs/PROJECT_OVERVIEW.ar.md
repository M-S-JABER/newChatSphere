# نظرة شاملة على المشروع

هذا المستند يقدم ملخصًا شاملًا لمشروع ChatSphere: ما الذي يقدمه، كيف هو مُهيكل، وكيف يتم تشغيله. وهو مكمّل للتفاصيل الموجودة في ملفات `docs/`.

---

## ماذا يقدم ChatSphere؟
ChatSphere منصة مراسلة كاملة تشبه واتساب ويب، وتوفر:
- دردشة فورية للرسائل الواردة والصادرة
- معالجة الوسائط وتنزيلها وعرضها
- التمبلت والرسائل الجاهزة
- أدوات إدارة للحسابات والمستخدمين والتشخيص
- دعم Webhook و WebSocket

---

## التقنيات المستخدمة

**الواجهة الأمامية**
- React + Vite + Tailwind
- مكونات shadcn/ui
- TanStack Query لإدارة حالة الخادم

**الواجهة الخلفية**
- Node.js + Express
- خادم WebSocket للتحديثات الفورية
- Pino للسجلات

**قاعدة البيانات**
- PostgreSQL
- Drizzle ORM

**التكاملات**
- Meta WhatsApp Cloud API

---

## البنية العامة
- **العميل**: يعرض واجهة الدردشة وصفحات الإدارة والتشخيص.
- **الخادم**: REST API واستقبال Webhook وبث WebSocket.
- **قاعدة البيانات**: حفظ المستخدمين والمحادثات والرسائل والإعدادات.
- **مسار الوسائط**: تنزيل الوسائط من Meta وتقديم روابط موقعة.

راجع: docs/ARCHITECTURE.ar.md

---

## الميزات الأساسية
- قائمة محادثات مع أرشفة وتثبيت
- ردود مرتبطة (Reply-to)
- إرسال التمبلت والرسائل الجاهزة
- بطاقات وسائط ومعاينات وتنزيل
- إعدادات وتشخيص للمسؤول

راجع: docs/FEATURES.ar.md

---

## التدفقات الأساسية

### الرسائل الواردة
1. Meta ترسل webhook إلى `/webhook/meta`.
2. الخادم يتحقق من التوقيع ويحلل الحمولة.
3. الرسالة تُحفظ في قاعدة البيانات.
4. يبدأ مسار معالجة الوسائط (إن وُجدت).
5. يتم بث التحديث عبر WebSocket.

### الرسائل الصادرة
1. المستخدم يرسل رسالة من الواجهة.
2. العميل يستدعي `/api/message/send`.
3. الخادم يرسلها إلى Meta Cloud API.
4. الرسالة تُحفظ محليًا.
5. يتم بث الحالة عبر WebSocket.

---

## التمبلت والرسائل الجاهزة
- **التمبلت**: رسائل معتمدة من Meta باسم + لغة.
  - يمكن للمسؤول إضافتها يدويًا أو استيرادها من حساب Meta.
  - التمبلتات المحفوظة تظهر في لوحة الدردشة.
- **الرسائل الجاهزة**: ردود قابلة لإعادة الاستخدام يحددها المسؤول.

راجع: docs/TEMPLATES.md و docs/ADMIN_GUIDE.ar.md

---

## الوسائط
- الوسائط الواردة تُنزّل من Meta وتُخزن تحت `uploads/`.
- تُنشأ المصغرات للصور وملفات PDF.
- الروابط تُخدم عبر `/media/*` بروابط موقعة.

راجع: docs/MEDIA.ar.md و docs/media-pipeline.ar.md

---

## الويبهوك والتشخيص
- `/webhook/meta` للتحقق واستقبال الرسائل.
- واجهة التشخيص تساعد على التأكد من الإعدادات والأحداث الحديثة.

راجع: docs/WEBHOOK_DEBUGGING_GUIDE.md و docs/QUICK_START_DIAGNOSTICS.md

---

## أحداث WebSocket
الخادم يبث أحداثًا مثل:
- `message_incoming`
- `message_outgoing`
- `message_media_updated`
- `message_deleted`

راجع: docs/WEBSOCKET.ar.md

---

## نموذج البيانات (مختصر)
أهم الجداول:
- users
- whatsapp_instances
- conversations
- messages
- ready_messages
- webhook_events

راجع: docs/DATABASE.ar.md

---

## الإعدادات
الإعداد الأساسي في `.env`:
- قاعدة البيانات: `DATABASE_URL`
- الجلسات: `SESSION_SECRET`
- Meta: `META_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`
- الوسائط: `FILES_SIGNING_SECRET`, `MEDIA_*`

راجع: docs/ENVIRONMENT.ar.md

---

## التطوير المحلي

```bash
npm install
npm run db:push
npm run dev
```

إنشاء مستخدم مسؤول:
```bash
npm run seed:admin
```

راجع: docs/SETUP.ar.md و docs/run.md

---

## التشغيل
- راقب السجلات (`LOG_LEVEL`)
- خذ نسخًا احتياطية من Postgres و uploads
- نفّذ `npm run db:push` بعد تغييرات المخطط

راجع: docs/OPERATIONS.ar.md و docs/DEPLOYMENT.ar.md

---

## الأمان
- كوكيز الجلسة تكون httpOnly و secure في الإنتاج.
- روابط الوسائط الموقعة تمنع كشف روابط Meta الخام.

راجع: docs/SECURITY.ar.md

---

## الاختبارات
- اختبارات الوحدة: `npm run test`
- فحص الأنواع: `npm run check`

راجع: docs/TESTING.ar.md

---

## من أين تبدأ في الكود
- server/index.ts
- server/routes.ts
- client/src/pages/Home.tsx
- client/src/components/MessageThread.tsx
- shared/schema.ts

---

## استكشاف الأخطاء
عند فقدان الرسائل:
- تأكد من تحقق الويبهوك
- راجع سجلات الخادم
- تحقق من اتصال WebSocket
- تحقق من بيانات Meta

راجع: docs/WEBHOOK_DEBUGGING_GUIDE.md
