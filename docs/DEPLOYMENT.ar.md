# النشر

## البناء
```bash
npm run build
```

## التشغيل
```bash
npm run start
```

## البيئة
- اضبط NODE_ENV=production.
- وفّر DATABASE_URL و SESSION_SECRET.
- جهّز بيانات Meta للويبهوك وإرسال الرسائل.

## المنافذ
- منفذ HTTP الافتراضي هو 5000.
- WebSocket يعمل على نفس المنفذ في /ws.

## البروكسي العكسي
إذا كنت تستخدم بروكسي (Nginx, Caddy, Cloudflare) تأكد من:
- تمرير رؤوس ترقية WebSocket.
- إنهاء HTTPS بشكل صحيح.
- تفعيل ENFORCE_HTTPS عند الحاجة.

## Docker
المستودع يحتوي على Dockerfile و docker-compose.yml.
يمكنك استخدامهما للبناء والتشغيل داخل بيئة حاويات.
