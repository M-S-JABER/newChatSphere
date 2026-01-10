# إعدادات البيئة

هذا المشروع يقرأ الإعدادات من ملف `.env` في الجذر.
يتم التحقق من المخطط في `validate-env.ts`.

## الأساسيات
- NODE_ENV: development | test | production
- PORT: منفذ HTTP (الافتراضي 5000)
- HOST: عنوان الربط (اختياري)
- LOG_LEVEL: fatal | error | warn | info | debug | trace | silent
- ENFORCE_HTTPS: true | false

## قاعدة البيانات
- DATABASE_URL: سلسلة اتصال Postgres

## المصادقة والجلسات
- SESSION_SECRET: مطلوب، على الأقل 16 حرفًا
- ADMIN_USERNAME: مستخدم مسؤول افتراضي (اختياري)
- ADMIN_PASSWORD: كلمة مرور مسؤول افتراضية (اختيارية)

## الوسائط والملفات
- FILES_SIGNING_SECRET: مطلوب عند REQUIRE_SIGNED_URL=true
- REQUIRE_SIGNED_URL: true | false
- MEDIA_STORAGE_ROOT: مجلد الرفع الأساسي (الافتراضي `uploads`)
- MEDIA_PUBLIC_BASE_URL: رابط عام لوسائط التحميل (اختياري)
- MEDIA_SIGNED_URL_TTL_SECONDS: مدة صلاحية الرابط الموقّع بالثواني
- MEDIA_MAX_ORIGINAL_BYTES: الحد الأقصى لحجم الوسائط عند التنزيل
- MEDIA_DOWNLOAD_MAX_ATTEMPTS: عدد محاولات إعادة التنزيل
- MEDIA_DOWNLOAD_RETRY_DELAY_MS: التأخير بين المحاولات
- MEDIA_THUMBNAIL_MAX_WIDTH: أقصى عرض للصورة المصغرة
- MEDIA_THUMBNAIL_MAX_HEIGHT: أقصى ارتفاع للصورة المصغرة

## Meta / WhatsApp
- META_TOKEN: رمز الوصول الخاص بـ Meta
- META_PHONE_NUMBER_ID: رقم هاتف WhatsApp Business
- META_VERIFY_TOKEN: رمز تحقق الـ webhook
- META_APP_SECRET: مفتاح التطبيق للتحقق من التوقيع
- META_GRAPH_VERSION: تجاوز نسخة Graph API

## الإعدادات الافتراضية للتمبلت
- META_TEMPLATE_NAME: اسم التمبلت الافتراضي
- META_TEMPLATE_LANGUAGE: لغة التمبلت الافتراضية
- META_TEMPLATE_COMPONENTS: JSON لمكونات التمبلت
- META_TEMPLATE_CATALOG: مصفوفة JSON لتعريفات التمبلت

## الروابط العامة
- PUBLIC_BASE_URL: قاعدة الروابط العامة
- MEDIA_PUBLIC_BASE_URL: قاعدة روابط الوسائط
- PUBLIC_APP_URL: قاعدة رابط الواجهة
- WEBHOOK_URL: اختياري، يستخدم لملاحظات الإعداد الخارجي

## العميل
- VITE_API_BASE_URL: قاعدة API للعميل، الافتراضي /api

## ملاحظات
- استخدم `.env.example` كنقطة بداية.
- في الإنتاج اضبط `NODE_ENV=production` ووفّر مفاتيح حقيقية.
