# مرجع واجهة API

العنوان الأساسي: `/api`

المصادقة تعتمد على الجلسات باستخدام الكوكيز.

## المصادقة
- POST /api/login
  - الجسم: { username, password }
  - الاستجابة: بيانات المستخدم بدون كلمة المرور
- POST /api/logout
- GET /api/user

## المحادثات
- GET /api/conversations?archived=true|false
- POST /api/conversations
  - الجسم: { phone }
- PATCH /api/conversations/:id/archive
  - الجسم: { archived: boolean }
- DELETE /api/conversations/:id (للمسؤول)
- GET /api/conversations/:id/messages

## الرسائل
- POST /api/message/send
  - الجسم: { to, body?, media_url?, conversationId, replyToMessageId?, messageType?, template?, templateParams? }
- DELETE /api/messages/:id (للمسؤول)

## التثبيت (Pins)
- GET /api/conversations/pins
- POST /api/conversations/:id/pin
  - الجسم: { pinned: boolean }

## الوسائط
- POST /api/upload (multipart form-data file)
- GET /media/*

## التمبلت والرسائل الجاهزة
- GET /api/templates
- GET /api/ready-messages
- GET /api/admin/ready-messages (للمسؤول)
- POST /api/admin/ready-messages (للمسؤول)
- PATCH /api/admin/ready-messages/:id (للمسؤول)
- DELETE /api/admin/ready-messages/:id (للمسؤول)

## الويبهوك والتشخيص (للمسؤول)
- GET /api/webhook/status
- POST /api/test-message
- POST /api/webhooks/clear
- GET /api/webhooks/events
- DELETE /api/webhooks/events/:id
- DELETE /api/webhooks/events
- GET /api/admin/webhooks
- PATCH /api/admin/webhooks/:id
- GET /api/admin/webhook-config
- GET /api/admin/api-controls
- POST /api/admin/api-controls
- GET /api/admin/whatsapp/default-instance

## نقاط نهاية الويبهوك (Meta)
- GET /webhook/meta (التحقق)
- POST /webhook/meta (الرسائل الواردة)
- POST /webhook/debug
- POST /webhook/test

## مستخدمو الإدارة
- POST /api/admin/users (للمسؤول)
- GET /api/admin/users (للمسؤول)
- PUT /api/admin/users/:id (للمسؤول)
- PATCH /api/admin/users/:id (للمسؤول)
- DELETE /api/admin/users/:id (للمسؤول)

## النشاط والإحصائيات
- POST /api/activity/ping
- GET /api/statistics

## ملاحظات
- بعض نقاط الإدارة تظهر في server/auth.ts و server/routes.ts معًا.
- واجهة PUT لإدارة المستخدمين هي المستخدمة حاليًا في الواجهة.
