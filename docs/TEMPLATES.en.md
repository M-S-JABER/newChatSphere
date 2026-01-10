# Templates Guide

This document explains templates in ChatSphere and how to use them from Settings and inside the chat composer.

## What is a template?
A template is a WhatsApp Business API approved message. It is sent using a template name + language.
Templates appear in the **Template** panel in chat.

## Requirements
- Admin access to Settings.
- Meta/WhatsApp credentials:
  - `META_TOKEN`
  - `META_PHONE_NUMBER_ID`
  - Optional: `META_WABA_ID`
- The access token should include `whatsapp_business_management` to list templates.

## Add a template manually
Settings -> **Templates**:
1) Fill **Template name** (exact name from Meta).
2) Enter **Language** (e.g. `ar` or `en_US`).
3) **Body parameters**: number of variables in the template body (`{1}`, `{2}`, ...).
   - Leave blank to auto-detect when importing.
4) **Description** (optional).
5) Click **Add template**.

## Import templates from your WhatsApp account
Settings -> **Templates** -> **Templates on your WhatsApp account**:
1) Click **Refresh**.
2) You will see templates that exist in your Meta account but are not saved locally.
3) Click **Add template** next to a template to import it.

## Edit / delete templates
In **Saved templates**:
- **Edit** to update name/language/description/body params.
- **Delete** to remove the template from the system (does not remove it from Meta).

## Send a template inside chat
1) Open a conversation.
2) Click the **Template** button in the composer.
3) Select a template.
4) Enter parameters:
   - Single value: `Ahmed`
   - Multiple values: `["Ahmed","12345"]`
5) Click **Send template**.

## Parameter notes
- If the template expects parameters, the UI will warn you if they are missing.
- Use JSON array syntax for multiple values.

## Common issues
- **Templates list is empty**:
  - Confirm token permissions (`whatsapp_business_management`).
  - Ensure `META_PHONE_NUMBER_ID` is correct.
  - If it still fails, set `META_WABA_ID` in `.env` and restart the server.

## Example
Template `order_update` with language `ar` and 2 params:
- Body parameters: `2`
- Send params: `["Ahmed","#2031"]`
