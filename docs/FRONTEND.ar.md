# دليل الواجهة الأمامية

الواجهة الأمامية موجودة في `client/` ومبنية بـ React و Vite و Tailwind.
تستخدم shadcn/ui (Radix) للمكونات الأساسية و TanStack Query لإدارة حالة الخادم.

## الصفحات الرئيسية
- Home: قائمة الدردشات، مسار الرسائل، لوحة المعلومات، واجهة المكالمات.
- Settings: إعداد حساب واتساب، إعداد الويبهوك، الرسائل الجاهزة.
- Statistics: لوحة مؤشرات للمسؤول.
- UserManagement: إدارة المستخدمين (CRUD) للمسؤول.
- CallLogs: عرض سجلات المكالمات للمسؤول.
- AuthPage: واجهة تسجيل الدخول.

## الحالة وجلب البيانات
- طلبات API تتم عبر `client/src/lib/queryClient.ts`.
- بيانات الخادم تستخدم TanStack Query مع إعادة تهيئة الكاش عند أحداث WebSocket.
- Hook الخاص بـ WebSocket في `client/src/hooks/useWebSocket.ts`.

## المكونات الرئيسية
- ConversationList: القائمة، البحث، التثبيت، الأرشفة.
- MessageThread: الرسائل، الرد، الحذف، التمرير.
- ChatComposer: الإدخال، المرفقات، التمبلت، الرسائل الجاهزة.
- ConversationInfoDrawer: الملف الشخصي وقوائم الوسائط.
- CallOverlay: نافذة تجربة المكالمات.

## التوجيه
المسارات معرفة في `client/src/App.tsx` باستخدام Wouter.

## التنسيق
- Tailwind CSS مع توكنات الثيم في `tailwind.config.ts`.
- المكونات الأساسية في `client/src/components/ui`.

## ملفات البداية المقترحة
- client/src/pages/Home.tsx
- client/src/components/MessageThread.tsx
- client/src/components/chat/ChatComposer.tsx
- client/src/components/chat/ConversationInfoDrawer.tsx
