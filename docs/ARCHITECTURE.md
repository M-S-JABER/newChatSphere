# Architecture Overview

ChatSphere is a full-stack WhatsApp Web style messaging platform.
It is split into three major layers: client, server, and database.

## Core Components
- Client: React + Vite + Tailwind UI that renders conversations, messages, and admin tools.
- Server: Express API + WebSocket for realtime updates and webhooks.
- Database: PostgreSQL, managed via Drizzle ORM.
- Provider: Meta WhatsApp Cloud API integration.
- Media: File ingestion, processing, and signed delivery.

## Request Flow
1. Browser makes API requests to `/api/*`.
2. Express routes validate input, read/write to storage.
3. Database changes are returned to the client.
4. Server broadcasts key updates via WebSocket to keep UI synced.

## Incoming Message Flow
1. Meta sends webhook to `/webhook/meta`.
2. Server verifies signature and parses events.
3. Messages are stored in the database.
4. Media entries are created as pending.
5. Server broadcasts `message_incoming` to WebSocket clients.

## Media Processing Flow
1. Webhook event includes media metadata.
2. Server downloads the media from Meta.
3. Files are stored under `uploads/`.
4. Thumbnails are generated (images and videos).
5. Database media metadata is updated.

For details see:
- docs/media-pipeline.md
- docs/media-operations.md

## Outgoing Message Flow
1. User sends a message via the UI.
2. Client calls `/api/message/send`.
3. Server forwards to Meta Cloud API.
4. The message is stored locally.
5. Server broadcasts `message_outgoing`.

## Realtime Updates
WebSocket connections listen to events like:
- message_incoming
- message_outgoing
- message_media_updated
- message_deleted

See docs/WEBSOCKET.md for payloads.

## Authentication
Sessions are cookie-based with Passport.
The admin role gates management endpoints and UI.

## Calling UI
The call UI is client-side only at this stage.
It does not initiate a real Meta call and is intended as a UX shell.
