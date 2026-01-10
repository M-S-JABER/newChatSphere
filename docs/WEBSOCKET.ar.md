# أحداث WebSocket

مسار خادم WebSocket: `/ws`

الخادم يرسل رسائل JSON بالصيغة:
```json
{
  "event": "message_incoming",
  "data": {}
}
```

## الأحداث
- message_incoming
  - تم حفظ رسالة واردة جديدة في قاعدة البيانات.
- message_outgoing
  - تم إنشاء أو إرسال رسالة صادرة.
- message_media_updated
  - تحديث بيانات الوسائط بعد التنزيل أو المعالجة.
- message_deleted
  - تم حذف رسالة (إجراء مسؤول).

## سلوك العميل
العميل يستمع في `client/src/hooks/useWebSocket.ts` ويعيد تهيئة كاش الاستعلامات
لتحديث بيانات الواجهة.

## أحداث المكالمات
أحداث المكالمات حاليًا على مستوى العميل فقط. إذا قمت بدمج مكالمات الخادم
فكر في بث:
- call_incoming
- call_ended
