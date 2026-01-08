# Project Structure

This is a summary of the repository layout and the main responsibilities.

```
ChatSpherepPRO/
  client/                 Frontend (React + Vite)
    src/
      components/         UI components
      hooks/              Client hooks
      lib/                Client utilities
      pages/              Top-level routes
      types/              Frontend types
  server/                 Backend (Express + WebSocket)
    auth.ts               Session and login endpoints
    db.ts                 Database bootstrap
    health.ts             Health endpoints
    index.ts              Server entry point
    logger.ts             Logging
    routes.ts             Main API routes + webhooks
    storage.ts            Database access layer
    providers/            Integrations (Meta provider)
    scripts/              Admin seed, DB scripts
  shared/                 Shared schema and types
    schema.ts             Drizzle tables + types
  docs/                   Documentation
  uploads/                Media storage (local)
  scripts/                Project scripts
  .env.example            Example environment config
  package.json            Scripts and dependencies
```

If you need to understand behavior or flows, start with:
- server/index.ts
- server/routes.ts
- client/src/pages
- client/src/components
- shared/schema.ts
