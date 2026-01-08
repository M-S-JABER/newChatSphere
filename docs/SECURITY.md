# Security Notes

## Authentication
- Session-based auth with Passport and express-session.
- Passwords are stored with scrypt; legacy bcrypt hashes are supported.
- Session cookies are httpOnly and secure in production.

## Authorization
- Admin-only endpoints use requireAdmin middleware.
- UI gates admin sections based on user role.

## Webhook Verification
- Meta webhook signature verification uses META_APP_SECRET when set.
- Verification tokens are enforced via META_VERIFY_TOKEN or instance settings.

## Signed Media URLs
- Media URLs are signed to avoid exposing raw Meta URLs.
- FILES_SIGNING_SECRET is required when REQUIRE_SIGNED_URL is true.

## Data Protection
- Avoid storing access tokens in logs.
- Limit access to the uploads folder in production.
