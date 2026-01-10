# 📋 Detailed Local Setup Guide

This guide walks you through installing and running the project locally in detail.

---

## ✅ Prerequisites

Make sure you have the following installed:

1. **Node.js (version 18 or newer)**
   - Download: <https://nodejs.org/>
   - Verify:

     ```bash
     node --version
     npm --version
     ```
2. **PostgreSQL (database server)**
   - Download: <https://www.postgresql.org/download/>
   - Or run via Docker:

     ```bash
     docker run --name whatsapp-db -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=whatsapp -p 5432:5432 -d postgres
     ```
3. **Git**
   - Download: <https://git-scm.com/downloads>

---

## ✅ Step 1: Download the Project

### Option 1: From Replit (manual download)
1. Open the project on Replit.
2. Open **Files explorer**.
3. Click the three dots.
4. Choose **Download folder**.

### Option 2: Using Git
```bash
git clone [REPO_URL]
cd [PROJECT_FOLDER]
```

### Option 3: SSH from Replit
If you have an SSH key, you can use `rsync` or `scp` to copy the project.

---

## ✅ Step 2: Install Dependencies

```bash
npm install
```

This installs React, TypeScript, Express.js, Drizzle ORM, Passport.js, and WebSocket.

---

## ✅ Step 3: Create the Database

### a) Create a local database

```bash
psql -U postgres
CREATE DATABASE whatsapp_chat;
CREATE USER whatsapp_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_chat TO whatsapp_user;
\q
```

### b) Create `.env`

```bash
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/whatsapp_chat
SESSION_SECRET=your-very-long-random-secret-key
NODE_ENV=development
```

Generate a secret key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### c) Sync the schema

```bash
npm run db:push
```

This will create tables such as `users`, `whatsapp_instances`, `conversations`,
`messages`, and `sessions`.

---

## ✅ Step 4: Run the App

```bash
npm run dev
```

Open: <http://localhost:5000>

---

## ✅ Step 5: Create Admin User

### Option 1: Direct SQL

```sql
INSERT INTO users (id, username, password, role)
VALUES (gen_random_uuid(), 'admin', '$scrypt$N=16384,r=8,p=1$your_hashed_password_here', 'admin');
```

### Option 2: Node.js Script

```js
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pkg from 'pg';
const { Client } = pkg;
const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}
async function createAdmin() {
  const client = new Client({ connectionString: 'postgresql://postgres:yourpassword@localhost:5432/whatsapp_chat' });
  await client.connect();
  const hashedPassword = await hashPassword('password123');
  await client.query('INSERT INTO users (id, username, password, role) VALUES (gen_random_uuid(), $1, $2, $3)', ['admin', hashedPassword, 'admin']);
  console.log('Admin user created successfully!');
  await client.end();
}
createAdmin().catch(console.error);
```

---

## ✅ Step 6: Login

Open <http://localhost:5000/auth>  
Username: `admin`  
Password: `password123`

---

## ✅ Step 7: Meta Cloud API Setup

1. Open Settings.
2. Click **Create Instance**.
3. Enter values from Meta Developer Console:
   - **Instance Name**
   - **Phone Number ID**
   - **Access Token**
   - **Webhook Verify Token**
   - **App Secret** (optional)

---

## ✅ Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run dev server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run db:push` | Sync database schema |
| `npm run check` | TypeScript checks |

---

## ✅ Common Issues

- **Cannot find module** -> reinstall dependencies:

  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

- **Database connection failed** -> check `DATABASE_URL`.
- **Port 5000 already in use** -> kill the process:

  ```bash
  lsof -ti:5000 | xargs kill -9
  ```

- **Session secret not configured** -> set `SESSION_SECRET`.

---

## ✅ Project Structure (Simplified)

```
whatsapp-chat/
  client/
  server/
  shared/
  .env
  package.json
  vite.config.ts
```

---

## ✅ Notes

- Make sure you start PostgreSQL before running the server.
- Use `.env.example` to avoid missing environment variables.
