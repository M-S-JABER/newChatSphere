# Deployment

## Build
```bash
npm run build
```

## Run
```bash
npm run start
```

## Environment
- Set NODE_ENV=production.
- Provide DATABASE_URL and SESSION_SECRET.
- Configure Meta credentials for webhooks and message sending.

## Ports
- Default HTTP port is 5000.
- WebSocket is served on the same port at /ws.

## Reverse Proxy
If you use a proxy (Nginx, Caddy, Cloudflare), make sure:
- WebSocket upgrade headers are forwarded.
- HTTPS is terminated properly.
- ENFORCE_HTTPS is enabled if required.

## Docker
The repo includes Dockerfile and docker-compose.yml.
Use them to build and run the server in a containerized environment.
