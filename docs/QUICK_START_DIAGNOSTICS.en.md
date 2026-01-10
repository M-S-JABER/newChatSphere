# 🚀 Quick Start - Webhook Diagnostics

## ✅ Issue fixed!

The missing inbound messages problem has been addressed and a full diagnostics
tooling flow was added.

## 🧭 Open the Diagnostics Panel

### 1. Run the server
```bash
npm run dev
```

### 2. Open the app
- URL: `http://127.0.0.1:8080` (or your local host)
- Log in as **admin**

### 3. Open Webhook Diagnostics
- Go to Settings
- Click **"Webhook Diagnostics"**

## ✅ Diagnostics Checklist

### **Test 1: Instance status**
1. Select the instance from the dropdown.
2. Check the **"Status"** card.
3. Ensure all indicators are green.

### **Test 2: Send test message**
1. Open **"Test Message"**
2. Enter a phone number (e.g. `+1234567890`)
3. Enter a short text
4. Click **"Send Test Message"**

### **Test 3: Recent events**
1. Open **"Recent Events"**
2. Confirm webhook events appear
3. Verify the response status

### **Test 4: Debug webhook**
1. Open **"Debug Webhook"**
2. Paste this payload:

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "1234567890",
                "type": "text",
                "text": {
                  "body": "Hello World"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

3. Click **"Debug Payload"**

## ✅ What to Verify

### **1. Server console**
- Check logs in the terminal.
- Confirm that webhook processing steps appear.
- Ensure no errors are logged.

### **2. Webhook diagnostics**
- Instance status is valid.
- Test message succeeds.
- Webhook payloads are logged.
- Recent events show responses.

### **3. Helpful endpoints**
- `/api/webhook/status/{instanceId}` - instance webhook status
- `/api/test-message` - send a test message
- `/webhook/debug/{instanceId}` - debug a webhook payload

## ✅ Common Errors

### **Error: "Instance not found"**
- Make sure the instance exists in Settings.
- Ensure the instance is active.

### **Error: "Invalid signature"**
- Verify the app secret in Settings.
- Ensure the app secret matches Meta.

### **Error: "No events parsed"**
- Check the payload structure.
- Try the Debug Webhook tool.

### **Error: Messages not appearing**
- Verify WebSocket connectivity.
- Ensure client is subscribed to updates.

## ✅ Expected Log Sample

```
Webhook POST received for instance: abc123
Instance found: My WhatsApp (Active: true)
Verifying webhook signature...
Webhook signature verified
Parsing incoming events...
Parsed 1 events
Processing event from: +1234567890
Saving message to database...
Message saved with ID: msg_456
Broadcasting message to WebSocket clients...
Message broadcasted
Webhook processing completed in 45ms
```

## ✅ Next Steps

1. Verify logs in the terminal.
2. Re-run Webhook Diagnostics in the app.
3. Confirm Meta settings and tokens.
4. If needed, read `WEBHOOK_DEBUGGING_GUIDE.md`.

**If you still face issues, the diagnostics tooling will guide you to the exact root cause.**
