# API Reference

Base URL: `/api`

Authentication is session-based with cookies.

## Auth
- POST /api/login
  - Body: { username, password }
  - Response: user without password
- POST /api/logout
- GET /api/user

## Conversations
- GET /api/conversations?archived=true|false
- POST /api/conversations
  - Body: { phone }
- PATCH /api/conversations/:id/archive
  - Body: { archived: boolean }
- DELETE /api/conversations/:id (admin)
- GET /api/conversations/:id/messages

## Messages
- POST /api/message/send
  - Body: { to, body?, media_url?, conversationId, replyToMessageId?, messageType?, template?, templateParams? }
- DELETE /api/messages/:id (admin)

## Pins
- GET /api/conversations/pins
- POST /api/conversations/:id/pin
  - Body: { pinned: boolean }

## Media
- POST /api/upload (multipart form-data file)
- GET /media/*

## Templates and Ready Messages
- GET /api/templates
- GET /api/ready-messages
- GET /api/admin/ready-messages (admin)
- POST /api/admin/ready-messages (admin)
- PATCH /api/admin/ready-messages/:id (admin)
- DELETE /api/admin/ready-messages/:id (admin)

## Webhooks and Diagnostics (admin)
- GET /api/webhook/status
- POST /api/test-message
- POST /api/webhooks/clear
- GET /api/webhooks/events
- DELETE /api/webhooks/events/:id
- DELETE /api/webhooks/events
- GET /api/admin/webhooks
- PATCH /api/admin/webhooks/:id
- GET /api/admin/webhook-config
- GET /api/admin/api-controls
- POST /api/admin/api-controls
- GET /api/admin/whatsapp/default-instance

## Webhook Endpoints (Meta)
- GET /webhook/meta (verification)
- POST /webhook/meta (incoming messages)
- POST /webhook/debug
- POST /webhook/test

## Admin Users
- POST /api/admin/users (admin)
- GET /api/admin/users (admin)
- PUT /api/admin/users/:id (admin)
- PATCH /api/admin/users/:id (admin)
- DELETE /api/admin/users/:id (admin)

## Activity and Statistics
- POST /api/activity/ping
- GET /api/statistics

## Notes
- Some admin endpoints appear in both server/auth.ts and server/routes.ts.
- The PUT admin users endpoint is used by the current UI.
