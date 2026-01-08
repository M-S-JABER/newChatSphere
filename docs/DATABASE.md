# Database Schema

The database schema is defined in `shared/schema.ts` and managed via Drizzle.

## Core Tables
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

## Relationships
- conversations 1 -> many messages
- messages can reply to messages (self reference)
- users -> many conversations (createdByUserId)
- users -> many messages (sentByUserId)
- conversation_pins links users to conversations

## Media JSON
`messages.media` stores media metadata as JSON.
See docs/media-pipeline.md for the fields used.

## Notes
- Call logs are stored in client localStorage and are not persisted in Postgres.
- Schema sync runs via `npm run db:push`.
