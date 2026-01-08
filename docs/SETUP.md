# Setup and Local Development

This document describes how to install and run the project locally.

## Prerequisites
- Node.js 18 or newer
- PostgreSQL 13 or newer
- Git

## Install Dependencies
```bash
npm install
```

## Create the Database
Create a database and user in Postgres, then run the schema sync:
```bash
createdb chatsphere
npm run db:push
```

## Configure Environment
Copy the example environment file and fill in values:
```bash
cp .env.example .env
```
See docs/ENVIRONMENT.md for details.

## Seed the First Admin
```bash
npm run seed:admin
```

## Run the App in Development
```bash
npm run dev
```
The default server port is 5000.

## Run Type Checks and Tests
```bash
npm run check
npm run test
```

## Build and Run in Production
```bash
npm run build
npm run start
```

## Diagnostics
If you need to debug webhooks and integration, review:
- docs/QUICK_START_DIAGNOSTICS.md
- docs/WEBHOOK_DEBUGGING_GUIDE.md
