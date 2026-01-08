# Frontend Guide

The frontend lives under `client/` and is built with React, Vite, and Tailwind.
It uses shadcn/ui (Radix) for primitives and TanStack Query for server state.

## Key Pages
- Home: chat list, message thread, info drawer, calling UI.
- Settings: instance configuration, webhook setup, ready messages.
- Statistics: admin metrics dashboard.
- UserManagement: admin user CRUD.
- CallLogs: admin call log view.
- AuthPage: login UI.

## State and Data Fetching
- API requests are handled via `client/src/lib/queryClient.ts`.
- Server data uses TanStack Query with cache invalidation on WebSocket events.
- WebSocket hook is in `client/src/hooks/useWebSocket.ts`.

## Main Components
- ConversationList: list, search, pin, archive.
- MessageThread: messages, reply, delete, scroll handling.
- ChatComposer: input, attachments, templates, ready messages.
- ConversationInfoDrawer: profile and media panels.
- CallOverlay: call UX modal.

## Routing
Routes are defined in `client/src/App.tsx` via Wouter.

## Styling
- Tailwind CSS with theme tokens in `tailwind.config.ts`.
- UI primitives are in `client/src/components/ui`.

## Files to Start With
- client/src/pages/Home.tsx
- client/src/components/MessageThread.tsx
- client/src/components/chat/ChatComposer.tsx
- client/src/components/chat/ConversationInfoDrawer.tsx
