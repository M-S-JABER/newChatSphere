# Operations Guide

## Logging
- HTTP logs are written via pino.
- Set LOG_LEVEL to control verbosity.

## Backups
- Back up Postgres regularly (pg_dump or managed backups).
- Back up uploads if you store media locally.

## Storage
- uploads/ can grow quickly; monitor disk usage.
- Consider external storage if media volume is large.

## Updates
- Run database sync with `npm run db:push`.
- Rebuild and restart the server after code changes.

## Monitoring
- Track API response times and error logs.
- Monitor webhook delivery success in the diagnostics UI.
