# WebSocket Events

WebSocket server path: `/ws`

The server sends JSON messages in the format:
```json
{
  "event": "message_incoming",
  "data": {}
}
```

## Events
- message_incoming
  - New inbound message saved in the DB.
- message_outgoing
  - Outgoing message created or sent.
- message_media_updated
  - Media metadata updated after download or processing.
- message_deleted
  - A message was removed (admin action).

## Client Behavior
The client listens in `client/src/hooks/useWebSocket.ts` and invalidates
query caches to refresh UI data.

## Call Events
Call events are currently client-side only. If you implement server call
integration, consider emitting:
- call_incoming
- call_ended
