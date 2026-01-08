# Backend Guide

The backend lives under `server/` and is an Express application.
It exposes REST endpoints, receives webhooks, and pushes realtime updates.

## Entry Point
- server/index.ts: sets up middleware, auth, routes, and static serving.

## Auth
- server/auth.ts: Passport local strategy with sessions.
- Endpoints: /api/login, /api/logout, /api/user.
- Admin-only routes use `requireAdmin`.

## Routes
- server/routes.ts: main API, webhooks, admin endpoints, and WebSocket server.
- Uploads use multer on `/api/upload`.
- Webhooks are under `/webhook/*`.

## Storage Layer
- server/storage.ts: database access for users, conversations, messages, webhooks, and stats.
- Drizzle ORM is used for queries.

## Provider Integration
- server/providers/meta.ts: parses Meta webhook payloads and builds media descriptors.

## Media Delivery
- /media/* serves signed or public media URLs.
- Signed URL logic lives in `server/lib/signedUrl`.

## Logging
- server/logger.ts for pino logger and HTTP logging.

## WebSocket
The WebSocket server is created in `server/routes.ts` on path `/ws`.
It broadcasts message events to connected clients.
