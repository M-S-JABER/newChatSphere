# مخطط قاعدة البيانات

مخطط قاعدة البيانات معرّف في `shared/schema.ts` ويتم إدارته عبر Drizzle.

## الجداول الأساسية
- users
  - id, username, password, role, createdAt
- whatsapp_instances
  - id, name, phoneNumberId, accessToken, webhookVerifyToken, appSecret, webhookBehavior, isActive
- conversations
  - id, phone, displayName, metadata, createdByUserId, archived, lastAt
- messages
  - id, conversationId, direction, body, media, providerMessageId, status, raw
  - replyToMessageId, sentByUserId, createdAt
- ready_messages
  - id, name, body, isActive, createdByUserId
- webhooks
  - id, name, url, verifyToken, isActive
- webhook_events
  - id, webhookId, headers, query, body, response
- conversation_pins
  - userId, conversationId, pinnedAt
- user_activity
  - userId, day, activeSeconds, lastSeenAt
- session
  - sid, sess, expire

## العلاقات
- conversations 1 -> many messages
- messages يمكن أن ترد على messages (مرجع ذاتي)
- users -> many conversations (createdByUserId)
- users -> many messages (sentByUserId)
- conversation_pins تربط المستخدمين بالمحادثات

## JSON الوسائط
الحقل `messages.media` يحفظ بيانات الوسائط بصيغة JSON.
راجع docs/media-pipeline.md للحقول المستخدمة.

## ملاحظات
- سجلات المكالمات محفوظة في localStorage بالعميل وغير مخزنة في Postgres.
- تزامن المخطط يتم عبر `npm run db:push`.
