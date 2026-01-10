# Project Overview (Comprehensive)

This document provides a consolidated overview of the ChatSphere project: what it does, how it is structured, and how to operate it. It complements the detailed docs in `docs/`.

---

## What ChatSphere Does
ChatSphere is a full-stack WhatsApp Web-style messaging platform with:
- Real-time chat for inbound and outbound messages
- Media ingestion, processing, and delivery
- Template messaging and ready messages
- Admin tools for instances, users, and diagnostics
- Webhook and WebSocket support

---

## Tech Stack

**Frontend**
- React + Vite + Tailwind
- shadcn/ui components
- TanStack Query for server state

**Backend**
- Node.js + Express
- WebSocket server for realtime updates
- Pino for logging

**Database**
- PostgreSQL
- Drizzle ORM

**Integrations**
- Meta WhatsApp Cloud API

---

## High-Level Architecture
- **Client**: renders chat UI, admin pages, and diagnostics.
- **Server**: REST API, webhook receiver, WebSocket broadcaster.
- **Database**: persists users, conversations, messages, and settings.
- **Media pipeline**: downloads media from Meta and serves signed URLs.

See: docs/ARCHITECTURE.md

---

## Key Features
- Conversation list with archive + pin
- Message threading (reply-to)
- Template sending and ready messages
- Media preview cards and downloads
- Admin settings and diagnostics

See: docs/FEATURES.md

---

## Core Flows

### Inbound Messages
1. Meta sends webhook to `/webhook/meta`.
2. Server verifies signature and parses payload.
3. Message is stored in the DB.
4. Media ingestion starts (if applicable).
5. WebSocket broadcasts to connected clients.

### Outbound Messages
1. User sends message via UI.
2. Client calls `/api/message/send`.
3. Server sends to Meta Cloud API.
4. Message is stored locally.
5. WebSocket broadcasts status.

---

## Templates & Ready Messages
- **Templates**: Meta-approved messages with name + language.
  - Admins can add templates manually or import from the Meta account.
  - Stored templates appear in the chat composer.
- **Ready messages**: reusable replies configured by admins.

See: docs/TEMPLATES.en.md and docs/ADMIN_GUIDE.md

---

## Media Handling
- Inbound media is fetched from Meta and saved under `uploads/`.
- Thumbnails are generated for images and PDFs.
- Media URLs are served via signed `/media/*` endpoints.

See: docs/MEDIA.md and docs/media-pipeline.md

---

## Webhooks and Diagnostics
- `/webhook/meta` handles verification + inbound messages.
- Diagnostics UI helps validate configuration and recent events.

See: docs/WEBHOOK_DEBUGGING_GUIDE.en.md and docs/QUICK_START_DIAGNOSTICS.en.md

---

## WebSocket Events
The server broadcasts events like:
- `message_incoming`
- `message_outgoing`
- `message_media_updated`
- `message_deleted`

See: docs/WEBSOCKET.md

---

## Data Model (Highlights)
Key tables:
- users
- whatsapp_instances
- conversations
- messages
- ready_messages
- webhook_events

See: docs/DATABASE.md

---

## Configuration
Primary config lives in `.env`:
- Database: `DATABASE_URL`
- Session: `SESSION_SECRET`
- Meta: `META_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`
- Media: `FILES_SIGNING_SECRET`, `MEDIA_*`

See: docs/ENVIRONMENT.md

---

## Local Development

```bash
npm install
npm run db:push
npm run dev
```

Create an admin user:
```bash
npm run seed:admin
```

See: docs/SETUP.md and docs/run.en.md

---

## Operations
- Monitor logs (`LOG_LEVEL`)
- Back up Postgres and uploads
- Run `npm run db:push` after schema changes

See: docs/OPERATIONS.md and docs/DEPLOYMENT.md

---

## Security Notes
- Session cookies are httpOnly and secure in production.
- Signed media URLs prevent raw Meta URL exposure.

See: docs/SECURITY.md

---

## Testing
- Unit tests: `npm run test`
- Type checks: `npm run check`

See: docs/TESTING.md

---

## Where to Start in the Code
- server/index.ts
- server/routes.ts
- client/src/pages/Home.tsx
- client/src/components/MessageThread.tsx
- shared/schema.ts

---

## Troubleshooting
If messages are missing:
- Confirm webhook verification
- Check server logs
- Verify WebSocket connectivity
- Validate Meta credentials

See: docs/WEBHOOK_DEBUGGING_GUIDE.en.md
