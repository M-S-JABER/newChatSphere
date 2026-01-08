# Environment Configuration

This project reads configuration from the root `.env` file.
The schema is validated in `validate-env.ts`.

## Core
- NODE_ENV: development | test | production
- PORT: HTTP port (default 5000)
- HOST: bind host (optional)
- LOG_LEVEL: fatal | error | warn | info | debug | trace | silent
- ENFORCE_HTTPS: true | false

## Database
- DATABASE_URL: Postgres connection string

## Auth and Sessions
- SESSION_SECRET: required, at least 16 chars
- ADMIN_USERNAME: optional default admin user
- ADMIN_PASSWORD: optional default admin password

## Media and Files
- FILES_SIGNING_SECRET: required when REQUIRE_SIGNED_URL=true
- REQUIRE_SIGNED_URL: true | false
- MEDIA_STORAGE_ROOT: base folder for uploads (default `uploads`)
- MEDIA_PUBLIC_BASE_URL: optional public base for media links
- MEDIA_SIGNED_URL_TTL_SECONDS: signed URL TTL in seconds
- MEDIA_MAX_ORIGINAL_BYTES: max media size for downloads
- MEDIA_DOWNLOAD_MAX_ATTEMPTS: max download retries
- MEDIA_DOWNLOAD_RETRY_DELAY_MS: delay between retries
- MEDIA_THUMBNAIL_MAX_WIDTH: thumbnail max width
- MEDIA_THUMBNAIL_MAX_HEIGHT: thumbnail max height

## Meta / WhatsApp
- META_TOKEN: Meta access token
- META_PHONE_NUMBER_ID: WhatsApp Business phone number id
- META_VERIFY_TOKEN: webhook verify token
- META_APP_SECRET: app secret for signature validation
- META_GRAPH_VERSION: Graph API version override

## Template Defaults
- META_TEMPLATE_NAME: default template name
- META_TEMPLATE_LANGUAGE: default template language
- META_TEMPLATE_COMPONENTS: JSON for template components
- META_TEMPLATE_CATALOG: JSON array of template definitions

## Public URLs
- PUBLIC_BASE_URL: public base for links
- MEDIA_PUBLIC_BASE_URL: public base for media URLs
- PUBLIC_APP_URL: public base for UI
- WEBHOOK_URL: optional, used for external configuration notes

## Client
- VITE_API_BASE_URL: API base for the client, defaults to /api

## Notes
- Use `.env.example` as a starting point.
- In production, set `NODE_ENV=production` and provide real secrets.
