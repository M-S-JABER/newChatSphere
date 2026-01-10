# 🔍 Webhook Message Delivery Debugging Guide - ChatSphere

## 📋 Common Problems and Fixes

### 1) 🚨 Core Issues

#### a) **No messages received at all**
**Possible causes:**
- Webhook not configured correctly in Meta
- Instance disabled
- Incorrect webhook behavior settings
- Signature verification failure

**Diagnostics steps:**
1. Open `/diagnostics` in the app.
2. Select the target instance.
3. Check **Instance Status**.
4. Ensure all indicators are green.

#### b) **Messages arrive but do not show in the app**
**Possible causes:**
- WebSocket disconnect or blocked
- Client cache not refreshing
- Message stored in DB but UI not refetched

**Diagnostics steps:**
1. Check WebSocket connection in the browser console.
2. Verify `message_incoming` events in server logs.
3. Refresh the conversation list and re-open the thread.

---

## 🛠 Diagnostic Tools Available

#### a) **Main diagnostics page** (`/diagnostics`)
- Shows instance status, recent events, and webhook health.

#### b) **Diagnostic endpoints**
- `/api/webhook/status/{instanceId}`
- `/api/test-message`
- `/webhook/debug/{instanceId}`

---

## 📊 Log Analysis

#### a) **Server logs**
Look for:
- `meta_webhook_received`
- `meta_webhook_signature_valid`
- `meta_webhook_events_parsed`
- `message_incoming`

#### b) **Meta provider logs**
Errors in `server/providers/meta.ts` usually indicate:
- Invalid token
- Wrong phone number id
- Graph API permission issues

---

## 🛠 Fix Steps

#### a) **Fix webhook verification**
1. Ensure `META_APP_SECRET` is set (or instance app secret in Settings).
2. Confirm the webhook verify token matches Meta settings.
3. Retry webhook verification from Meta.

#### b) **Fix message parsing**
1. Check raw webhook payloads in diagnostics.
2. Confirm the payload structure matches Meta examples.
3. Use `/webhook/debug` to replay a known-good payload.

#### c) **Fix database insertion**
1. Verify database connectivity.
2. Run `npm run db:push` to sync schema.
3. Check for errors in `storage.createMessage`.

---

## 🔍 Advanced Diagnostics

#### a) **WebSocket checks**
- Verify `/ws` connection is open.
- Ensure no proxy is blocking upgrade headers.
- Confirm client is receiving events.

#### b) **Network requests**
- Inspect `/api/conversations` and `/api/conversations/:id/messages` responses.
- Ensure API responses include new messages.

#### c) **Database queries**
- Confirm messages exist in `messages` table.
- Ensure `conversationId` matches the chat you opened.

---

## 🚨 Common Error Messages

- **"Instance not found"**
  - Instance missing or inactive in Settings.

- **"Invalid signature"**
  - Wrong or missing app secret.

- **"No events parsed from payload"**
  - Payload structure invalid or empty.

- **"WebSocket connection failed"**
  - Proxy or network issue, or client not connected.

---

## 📝 Diagnostic Checklist

### Quick checklist
- [ ] Instance is active
- [ ] Webhook URL is correct
- [ ] Verify token is correct
- [ ] App secret is correct (if used)
- [ ] Database is reachable
- [ ] WebSocket is connected
- [ ] No errors in the console

### Useful diagnostic info
```bash
# System info
node --version
npm --version

# Environment (do not share secrets in public)
echo $DATABASE_URL
echo $SESSION_SECRET
echo $META_TOKEN
echo $META_PHONE_NUMBER_ID
echo $META_VERIFY_TOKEN
echo $META_APP_SECRET

# Server status
curl http://127.0.0.1:8080/health
```

---

## 🆘 Requesting Help

When asking for support, include:

1. **System info**
   - Node.js version
   - OS details
   - Environment variables (without sensitive values)

2. **Issue details**
   - Description of the issue
   - Steps to reproduce
   - Error messages

3. **Diagnostics**
   - `/diagnostics` output
   - Server logs
   - Webhook test results

4. **Instance details**
   - Instance ID
   - Instance status
   - Webhook configuration

---

## 🎯 Summary

The diagnostics system includes:
1. Detailed logging across message processing stages
2. Frontend diagnostics tools
3. Server-side diagnostic endpoints
4. System-wide status checks
5. Test utilities for messages and webhooks

Use these tools to isolate and resolve webhook delivery issues quickly and reliably.
