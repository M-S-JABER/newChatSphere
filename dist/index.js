var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// validate-env.ts
import { z } from "zod";
var booleanFromEnv, logLevels, EnvSchema, parsed, env;
var init_validate_env = __esm({
  "validate-env.ts"() {
    "use strict";
    booleanFromEnv = z.union([z.boolean(), z.string()]).optional().transform((value, ctx) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      if (value == null) {
        return false;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected boolean-like value (true/false)."
      });
      return z.NEVER;
    });
    logLevels = [
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent"
    ];
    EnvSchema = z.object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
      SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters long"),
      PORT: z.coerce.number().int().min(1).max(65535).default(5e3),
      HOST: z.string().optional(),
      LOG_LEVEL: z.enum(logLevels).default("info"),
      LOG_FOCUS: z.enum(["essential", "all"]).default("essential"),
      LOG_PRETTY: booleanFromEnv,
      ENFORCE_HTTPS: booleanFromEnv,
      MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
      PUBLIC_BASE_URL: z.string().url().optional(),
      PUBLIC_APP_URL: z.string().url().optional(),
      META_TOKEN: z.string().optional(),
      META_PHONE_NUMBER_ID: z.string().optional(),
      META_VERIFY_TOKEN: z.string().optional(),
      META_APP_SECRET: z.string().optional(),
      META_GRAPH_VERSION: z.string().optional(),
      FILES_SIGNING_SECRET: z.string().min(16, "FILES_SIGNING_SECRET must be at least 16 characters").optional(),
      REQUIRE_SIGNED_URL: booleanFromEnv,
      MEDIA_STORAGE_ROOT: z.string().optional(),
      MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().optional(),
      MEDIA_MAX_ORIGINAL_BYTES: z.coerce.number().int().positive().optional(),
      MEDIA_DOWNLOAD_MAX_ATTEMPTS: z.coerce.number().int().min(1).optional(),
      MEDIA_DOWNLOAD_RETRY_DELAY_MS: z.coerce.number().int().min(0).optional(),
      MEDIA_THUMBNAIL_MAX_WIDTH: z.coerce.number().int().min(32).optional(),
      MEDIA_THUMBNAIL_MAX_HEIGHT: z.coerce.number().int().min(32).optional(),
      ADMIN_USERNAME: z.string().optional(),
      ADMIN_PASSWORD: z.string().optional()
    }).superRefine((data, ctx) => {
      if (data.REQUIRE_SIGNED_URL && !data.FILES_SIGNING_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["FILES_SIGNING_SECRET"],
          message: "FILES_SIGNING_SECRET is required when REQUIRE_SIGNED_URL is true"
        });
      }
    });
    parsed = EnvSchema.safeParse({
      ...process.env
    });
    if (!parsed.success) {
      const formatted = parsed.error.flatten();
      const details = Object.entries(formatted.fieldErrors).map(([key, messages2]) => `${key}: ${messages2?.join(", ")}`).join("\n  ");
      console.error(
        "Invalid environment configuration. Please review the following issues:\n  %s",
        details
      );
      throw new Error("Invalid environment variables. See logs for more details.");
    }
    env = parsed.data;
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  ensureSchema: () => ensureSchema,
  pool: () => pool
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key varchar PRIMARY KEY,
        value json,
        updated_at timestamptz DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        url text NOT NULL,
        verify_token text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id varchar REFERENCES webhooks(id) ON DELETE SET NULL,
        headers json,
        query json,
        body json,
        response json,
        created_at timestamptz DEFAULT now()
      );
    `);
    await client.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS sent_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS reply_to_message_id varchar REFERENCES messages(id) ON DELETE SET NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_reply_to
      ON messages (conversation_id, reply_to_message_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_direction
      ON messages (direction);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_message_id
      ON messages (provider_message_id)
      WHERE provider_message_id IS NOT NULL;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_pins (
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id varchar NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        pinned_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, conversation_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_pins_user_pinned_at
      ON conversation_pins (user_id, pinned_at DESC);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ready_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        body text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ready_messages_active_updated_at
      ON ready_messages (is_active, updated_at DESC);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day date NOT NULL,
        active_seconds integer NOT NULL DEFAULT 0,
        last_seen_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        PRIMARY KEY (user_id, day)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_day
      ON user_activity (day);
    `);
    await client.query(`
      UPDATE messages
      SET direction = CASE 
        WHEN direction = 'in' THEN 'inbound'
        WHEN direction = 'out' THEN 'outbound'
        ELSE direction
      END
      WHERE direction IN ('in', 'out');
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_validate_env();
    pool = new Pool({ connectionString: env.DATABASE_URL });
    db = drizzle(pool);
  }
});

// server/index.ts
init_validate_env();
import express2 from "express";
import { mkdirSync as mkdirSync2 } from "fs";
import { join } from "path";

// server/routes.ts
import { promises as fs2 } from "fs";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path4 from "path";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean, primaryKey, integer, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z as z2 } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var whatsappInstances = pgTable("whatsapp_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumberId: text("phone_number_id").notNull(),
  accessToken: text("access_token").notNull(),
  webhookVerifyToken: text("webhook_verify_token"),
  appSecret: text("app_secret"),
  webhookBehavior: text("webhook_behavior").notNull().default(sql`'auto'`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name"),
  metadata: json("metadata"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, {
    onDelete: "set null"
  }),
  archived: boolean("archived").notNull().default(false),
  lastAt: timestamp("last_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  body: text("body"),
  media: json("media").$type(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("received"),
  raw: json("raw"),
  replyToMessageId: varchar("reply_to_message_id").references(() => messages.id, {
    onDelete: "set null"
  }),
  sentByUserId: varchar("sent_by_user_id").references(() => users.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var readyMessages = pgTable("ready_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  creator: one(users, {
    fields: [conversations.createdByUserId],
    references: [users.id]
  })
}));
var messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  replyToMessage: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id]
  }),
  sender: one(users, {
    fields: [messages.sentByUserId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
}).extend({
  username: z2.string().min(3).max(50),
  password: z2.string().min(6),
  role: z2.enum(["admin", "user"]).optional()
});
var insertWhatsappInstanceSchema = createInsertSchema(whatsappInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z2.string().min(1).max(100),
  phoneNumberId: z2.string().min(1),
  accessToken: z2.string().min(1),
  webhookVerifyToken: z2.string().optional(),
  appSecret: z2.string().optional(),
  webhookBehavior: z2.enum(["auto", "accept", "reject"]).optional(),
  isActive: z2.boolean().optional()
});
var insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  createdByUserId: z2.string().uuid().optional().nullable()
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
}).extend({
  replyToMessageId: z2.string().uuid().optional().nullable(),
  sentByUserId: z2.string().uuid().optional().nullable()
});
var webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  verifyToken: text("verify_token"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").references(() => webhooks.id, { onDelete: "set null" }),
  headers: json("headers").$type(),
  query: json("query").$type(),
  body: json("body").$type(),
  response: json("response").$type(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: json("value").$type(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var webhooksRelations = relations(webhooks, ({ many }) => ({
  events: many(webhookEvents)
}));
var webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookEvents.webhookId],
    references: [webhooks.id]
  })
}));
var conversationPins = pgTable(
  "conversation_pins",
  {
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.conversationId] })
  })
);
var conversationPinsRelations = relations(conversationPins, ({ one }) => ({
  user: one(users, {
    fields: [conversationPins.userId],
    references: [users.id]
  }),
  conversation: one(conversations, {
    fields: [conversationPins.conversationId],
    references: [conversations.id]
  })
}));
var userActivity = pgTable(
  "user_activity",
  {
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    activeSeconds: integer("active_seconds").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.day] })
  })
);
var session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull()
});
var insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z2.string().min(1).max(100),
  url: z2.string().min(1),
  verifyToken: z2.string().optional(),
  isActive: z2.boolean().optional()
});

// server/storage.ts
init_db();
init_db();
import { eq, desc, sql as sql2, and, inArray, aliasedTable, or } from "drizzle-orm";
import session2 from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session2);
var normalizePhone = (phone) => phone.replace(/\D/g, "");
var toSenderLabel = (direction) => {
  return direction === "inbound" ? "Customer" : "Agent";
};
var normalizeMetadata = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
};
var ACTIVITY_MAX_IDLE_MS = Number(process.env.ACTIVITY_MAX_IDLE_MS ?? 5 * 60 * 1e3);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  async getConversations(page = 1, pageSize = 20, archived = false) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 0;
    const offset = safePageSize > 0 ? (safePage - 1) * safePageSize : 0;
    const listQuery = db.select().from(conversations).where(eq(conversations.archived, archived)).orderBy(desc(conversations.lastAt), desc(conversations.createdAt));
    const listPromise = safePageSize > 0 ? listQuery.limit(safePageSize).offset(offset) : listQuery;
    const [items, totalResult] = await Promise.all([
      listPromise,
      db.select({ count: sql2`count(*)::int` }).from(conversations).where(eq(conversations.archived, archived))
    ]);
    return {
      items,
      total: totalResult[0]?.count || 0
    };
  }
  async getConversationByPhone(phone) {
    const rawPhone = phone?.trim() ?? "";
    if (!rawPhone) return void 0;
    const normalized = normalizePhone(rawPhone);
    const whereClause = normalized.length > 0 ? or(
      eq(conversations.phone, rawPhone),
      // Match stored numbers with different formatting (e.g. +, spaces).
      sql2`regexp_replace(${conversations.phone}, '\\D', '', 'g') = ${normalized}`
    ) : eq(conversations.phone, rawPhone);
    const [conversation] = await db.select().from(conversations).where(whereClause);
    return conversation;
  }
  async getConversationById(id) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }
  async createConversation(insertConversation) {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }
  async updateConversationLastAt(id) {
    await db.update(conversations).set({ lastAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id));
  }
  async incrementConversationUnread(id, amount = 1) {
    if (!amount || amount <= 0) return;
    const [conversation] = await db.select({ metadata: conversations.metadata }).from(conversations).where(eq(conversations.id, id)).limit(1);
    if (!conversation) return;
    const metadata = normalizeMetadata(conversation.metadata);
    const current = typeof metadata.unreadCount === "number" ? metadata.unreadCount : 0;
    const next = { ...metadata, unreadCount: current + amount };
    await db.update(conversations).set({ metadata: next, updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id));
  }
  async clearConversationUnread(id) {
    const [conversation] = await db.select({ metadata: conversations.metadata }).from(conversations).where(eq(conversations.id, id)).limit(1);
    if (!conversation) return;
    const metadata = normalizeMetadata(conversation.metadata);
    if (metadata.unreadCount === 0 && "unreadCount" in metadata) return;
    const next = { ...metadata, unreadCount: 0 };
    await db.update(conversations).set({ metadata: next, updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id));
  }
  async toggleConversationArchive(id, archived) {
    const [conversation] = await db.update(conversations).set({ archived, updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id)).returning();
    return conversation;
  }
  async getMessages(conversationId, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [itemsRaw, totalRaw] = await Promise.all([
      db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(pageSize).offset(offset),
      db.select({ count: sql2`count(*)::int` }).from(messages).where(eq(messages.conversationId, conversationId))
    ]);
    const items = [...itemsRaw].reverse();
    const totalResult = totalRaw;
    const replyIds = items.map((message) => message.replyToMessageId).filter((value) => Boolean(value));
    const replyMap = /* @__PURE__ */ new Map();
    let replyMessages = [];
    if (replyIds.length > 0) {
      replyMessages = await db.select({
        id: messages.id,
        content: messages.body,
        direction: messages.direction,
        createdAt: messages.createdAt,
        sentByUserId: messages.sentByUserId
      }).from(messages).where(inArray(messages.id, replyIds)).execute();
    }
    const senderIds = /* @__PURE__ */ new Set();
    items.forEach((message) => {
      if (message.sentByUserId) {
        senderIds.add(message.sentByUserId);
      }
    });
    replyMessages.forEach((reply) => {
      if (reply.sentByUserId) {
        senderIds.add(reply.sentByUserId);
      }
    });
    const senderMap = /* @__PURE__ */ new Map();
    if (senderIds.size > 0) {
      const senderRows = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, Array.from(senderIds)));
      senderRows.forEach((row) => senderMap.set(row.id, row.username));
    }
    replyMessages.forEach((reply) => {
      const normalizedDirection = reply.direction === "outbound" ? "outbound" : "inbound";
      const senderName = reply.sentByUserId ? senderMap.get(reply.sentByUserId) ?? null : null;
      replyMap.set(reply.id, {
        id: reply.id,
        content: reply.content,
        direction: normalizedDirection,
        senderLabel: senderName ?? toSenderLabel(normalizedDirection),
        createdAt: reply.createdAt
      });
    });
    const itemsWithReplies = items.map(
      (message) => {
        const normalizedDirection = message.direction === "outbound" ? "outbound" : "inbound";
        const senderName = message.sentByUserId ? senderMap.get(message.sentByUserId) ?? null : null;
        return {
          ...message,
          direction: normalizedDirection,
          senderName,
          replyTo: message.replyToMessageId ? replyMap.get(message.replyToMessageId) ?? null : null
        };
      }
    );
    return {
      items: itemsWithReplies,
      total: totalResult[0]?.count || 0
    };
  }
  async createMessage(insertMessage) {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }
  async getMessageById(id) {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
  async getMessageByProviderMessageId(providerMessageId) {
    const [message] = await db.select().from(messages).where(eq(messages.providerMessageId, providerMessageId)).limit(1);
    return message;
  }
  async updateMessageStatus(id, status) {
    const [updated] = await db.update(messages).set({ status }).where(eq(messages.id, id)).returning();
    return updated;
  }
  async updateMessageMedia(id, media) {
    const [updated] = await db.update(messages).set({ media }).where(eq(messages.id, id)).returning();
    return updated;
  }
  async getMessageWithReplyById(id) {
    const message = await this.getMessageById(id);
    if (!message) return void 0;
    const normalizedMessageDirection = message.direction === "outbound" ? "outbound" : "inbound";
    const senderIds = /* @__PURE__ */ new Set();
    if (message.sentByUserId) {
      senderIds.add(message.sentByUserId);
    }
    if (!message.replyToMessageId) {
      let senderName2 = null;
      if (message.sentByUserId) {
        const [sender] = await db.select({ username: users.username }).from(users).where(eq(users.id, message.sentByUserId)).limit(1);
        senderName2 = sender?.username ?? null;
      }
      return { ...message, direction: normalizedMessageDirection, senderName: senderName2, replyTo: null };
    }
    const [reply] = await db.select({
      id: messages.id,
      content: messages.body,
      direction: messages.direction,
      createdAt: messages.createdAt,
      sentByUserId: messages.sentByUserId
    }).from(messages).where(eq(messages.id, message.replyToMessageId));
    if (reply?.sentByUserId) {
      senderIds.add(reply.sentByUserId);
    }
    const senderMap = /* @__PURE__ */ new Map();
    if (senderIds.size > 0) {
      const senderRows = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, Array.from(senderIds)));
      senderRows.forEach((row) => senderMap.set(row.id, row.username));
    }
    const senderName = message.sentByUserId ? senderMap.get(message.sentByUserId) ?? null : null;
    if (!reply) {
      return { ...message, direction: normalizedMessageDirection, senderName, replyTo: null };
    }
    const normalizedReplyDirection = reply.direction === "outbound" ? "outbound" : "inbound";
    const replySenderName = reply.sentByUserId ? senderMap.get(reply.sentByUserId) ?? null : null;
    return {
      ...message,
      direction: normalizedMessageDirection,
      senderName,
      replyTo: {
        id: reply.id,
        content: reply.content,
        direction: normalizedReplyDirection,
        senderLabel: replySenderName ?? toSenderLabel(normalizedReplyDirection),
        createdAt: reply.createdAt
      }
    };
  }
  async deleteMessage(id) {
    const [deleted] = await db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id, conversationId: messages.conversationId });
    return deleted ?? null;
  }
  async deleteConversation(id) {
    await db.delete(conversations).where(eq(conversations.id, id));
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(users.createdAt);
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async getReadyMessages(activeOnly = true) {
    let query = db.select().from(readyMessages);
    if (activeOnly) {
      query = query.where(eq(readyMessages.isActive, true));
    }
    return await query.orderBy(desc(readyMessages.updatedAt), desc(readyMessages.createdAt));
  }
  async createReadyMessage(data) {
    const [message] = await db.insert(readyMessages).values({
      name: data.name,
      body: data.body,
      createdByUserId: data.createdByUserId ?? null,
      isActive: data.isActive ?? true,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return message;
  }
  async updateReadyMessage(id, updates) {
    const [message] = await db.update(readyMessages).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(readyMessages.id, id)).returning();
    return message;
  }
  async deleteReadyMessage(id) {
    await db.delete(readyMessages).where(eq(readyMessages.id, id));
  }
  async recordUserActivity(userId, now = /* @__PURE__ */ new Date()) {
    const dayKey = now.toISOString().slice(0, 10);
    const [existing] = await db.select({
      activeSeconds: userActivity.activeSeconds,
      lastSeenAt: userActivity.lastSeenAt
    }).from(userActivity).where(and(eq(userActivity.userId, userId), eq(userActivity.day, dayKey))).limit(1);
    if (!existing) {
      await db.insert(userActivity).values({
        userId,
        day: dayKey,
        activeSeconds: 0,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now
      });
      return;
    }
    let incrementSeconds = 0;
    if (existing.lastSeenAt) {
      const lastSeenAt = new Date(existing.lastSeenAt);
      const deltaMs = now.getTime() - lastSeenAt.getTime();
      if (deltaMs > 0 && deltaMs <= ACTIVITY_MAX_IDLE_MS) {
        incrementSeconds = Math.floor(deltaMs / 1e3);
      }
    }
    await db.update(userActivity).set({
      activeSeconds: existing.activeSeconds + incrementSeconds,
      lastSeenAt: now,
      updatedAt: now
    }).where(and(eq(userActivity.userId, userId), eq(userActivity.day, dayKey)));
  }
  async getStatistics() {
    const [totalConversations] = await db.select({ count: sql2`count(*)::int` }).from(conversations);
    const [totalMessages] = await db.select({ count: sql2`count(*)::int` }).from(messages);
    const [incomingCount] = await db.select({ count: sql2`count(*)::int` }).from(messages).where(eq(messages.direction, "inbound"));
    const [outgoingCount] = await db.select({ count: sql2`count(*)::int` }).from(messages).where(eq(messages.direction, "outbound"));
    const topConversations = await db.select({
      phone: conversations.phone,
      displayName: conversations.displayName,
      messageCount: sql2`count(${messages.id})::int`
    }).from(conversations).leftJoin(messages, eq(messages.conversationId, conversations.id)).groupBy(conversations.id, conversations.phone, conversations.displayName).orderBy(desc(sql2`count(${messages.id})`)).limit(5);
    const messagesByDay = await db.select({
      date: sql2`DATE(${messages.createdAt})`,
      incoming: sql2`count(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)::int`,
      outgoing: sql2`count(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)::int`
    }).from(messages).where(sql2`${messages.createdAt} >= NOW() - INTERVAL '7 days'`).groupBy(sql2`DATE(${messages.createdAt})`).orderBy(sql2`DATE(${messages.createdAt})`);
    const recentActivity = await db.select({
      id: messages.id,
      direction: messages.direction,
      body: messages.body,
      createdAt: messages.createdAt,
      phone: conversations.phone,
      displayName: conversations.displayName
    }).from(messages).leftJoin(conversations, eq(messages.conversationId, conversations.id)).orderBy(desc(messages.createdAt)).limit(10);
    const usersList = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt
    }).from(users);
    const messagesByUser = await db.select({
      userId: messages.sentByUserId,
      totalMessages: sql2`count(${messages.id})::int`,
      mediaMessages: sql2`count(CASE WHEN ${messages.media} IS NOT NULL THEN 1 END)::int`,
      repliesSent: sql2`count(CASE WHEN ${messages.replyToMessageId} IS NOT NULL THEN 1 END)::int`,
      templatesSent: sql2`count(CASE WHEN (${messages.raw} -> 'template') IS NOT NULL OR ${messages.body} ILIKE 'Template:%' THEN 1 END)::int`,
      conversationsTouched: sql2`count(DISTINCT ${messages.conversationId})::int`,
      lastSentAt: sql2`max(${messages.createdAt})`
    }).from(messages).where(sql2`${messages.sentByUserId} IS NOT NULL`).groupBy(messages.sentByUserId);
    const conversationsByUser = await db.select({
      userId: conversations.createdByUserId,
      totalConversations: sql2`count(${conversations.id})::int`,
      lastCreatedAt: sql2`max(${conversations.createdAt})`
    }).from(conversations).where(sql2`${conversations.createdByUserId} IS NOT NULL`).groupBy(conversations.createdByUserId);
    const replyTarget = aliasedTable(messages, "reply_target");
    const responseTimesByUser = await db.select({
      userId: messages.sentByUserId,
      avgResponseSeconds: sql2`avg(extract(epoch from (${messages.createdAt} - ${replyTarget.createdAt})))`,
      responseCount: sql2`count(${messages.id})::int`
    }).from(messages).innerJoin(replyTarget, eq(messages.replyToMessageId, replyTarget.id)).where(
      and(
        sql2`${messages.sentByUserId} IS NOT NULL`,
        eq(messages.direction, "outbound"),
        eq(replyTarget.direction, "inbound")
      )
    ).groupBy(messages.sentByUserId);
    const activityByUser = await db.select({
      userId: userActivity.userId,
      activeSeconds: sql2`sum(${userActivity.activeSeconds})::int`
    }).from(userActivity).where(sql2`${userActivity.day} >= CURRENT_DATE - 6`).groupBy(userActivity.userId);
    const toDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        return value;
      }
      const date2 = new Date(String(value));
      return Number.isNaN(date2.getTime()) ? null : date2;
    };
    const messageStatsMap = /* @__PURE__ */ new Map();
    for (const stat of messagesByUser) {
      if (!stat.userId) continue;
      messageStatsMap.set(stat.userId, {
        totalMessages: stat.totalMessages,
        mediaMessages: stat.mediaMessages,
        repliesSent: stat.repliesSent,
        templatesSent: stat.templatesSent,
        conversationsTouched: stat.conversationsTouched,
        lastSentAt: toDate(stat.lastSentAt)
      });
    }
    const responseTimeMap = /* @__PURE__ */ new Map();
    for (const stat of responseTimesByUser) {
      if (!stat.userId) continue;
      responseTimeMap.set(stat.userId, {
        avgResponseSeconds: stat.avgResponseSeconds ? Number(stat.avgResponseSeconds) : null,
        responseCount: stat.responseCount
      });
    }
    const activityTimeMap = /* @__PURE__ */ new Map();
    for (const stat of activityByUser) {
      if (!stat.userId) continue;
      activityTimeMap.set(stat.userId, stat.activeSeconds ?? 0);
    }
    const conversationStatsMap = /* @__PURE__ */ new Map();
    for (const stat of conversationsByUser) {
      if (!stat.userId) continue;
      conversationStatsMap.set(stat.userId, {
        totalConversations: stat.totalConversations,
        lastCreatedAt: toDate(stat.lastCreatedAt)
      });
    }
    const totalOutgoingMessages = outgoingCount?.count || 0;
    const userStats = usersList.map((user) => {
      const messageInfo = messageStatsMap.get(user.id);
      const conversationInfo = conversationStatsMap.get(user.id);
      const responseInfo = responseTimeMap.get(user.id);
      const activeSeconds = activityTimeMap.get(user.id) ?? 0;
      const messagesSent = messageInfo?.totalMessages ?? 0;
      const mediaSent = messageInfo?.mediaMessages ?? 0;
      const repliesSent = messageInfo?.repliesSent ?? 0;
      const templatesSent = messageInfo?.templatesSent ?? 0;
      const newMessagesSent = Math.max(messagesSent - repliesSent, 0);
      const conversationsCreated = conversationInfo?.totalConversations ?? 0;
      const contactsEngaged = messageInfo?.conversationsTouched ?? 0;
      const avgResponseSeconds = responseInfo?.avgResponseSeconds ?? null;
      const responseCount = responseInfo?.responseCount ?? 0;
      const candidateDates = [
        messageInfo?.lastSentAt ?? null,
        conversationInfo?.lastCreatedAt ?? null
      ].filter((value) => value instanceof Date);
      const lastActive = candidateDates.length > 0 ? new Date(Math.max(...candidateDates.map((date2) => date2.getTime()))) : null;
      const engagementRate = totalOutgoingMessages > 0 ? Math.round(messagesSent / totalOutgoingMessages * 1e3) / 10 : 0;
      const activityScore = messagesSent + conversationsCreated;
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        messagesSent,
        mediaSent,
        repliesSent,
        newMessagesSent,
        templatesSent,
        conversationsCreated,
        contactsEngaged,
        avgResponseSeconds,
        responseCount,
        activeSeconds,
        lastActiveAt: lastActive ? lastActive.toISOString() : null,
        engagementRate,
        activityScore
      };
    }).sort((a, b) => {
      if (b.activityScore !== a.activityScore) {
        return b.activityScore - a.activityScore;
      }
      return b.messagesSent - a.messagesSent;
    });
    return {
      totals: {
        conversations: totalConversations?.count || 0,
        messages: totalMessages?.count || 0,
        incoming: incomingCount?.count || 0,
        outgoing: outgoingCount?.count || 0,
        users: usersList.length
      },
      topConversations,
      messagesByDay,
      recentActivity,
      userStats
    };
  }
  // Webhooks
  async createWebhook(data) {
    const [hook] = await db.insert(webhooks).values({
      name: data.name,
      url: data.url,
      verifyToken: data.verifyToken || null,
      isActive: data.isActive ?? true,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return hook;
  }
  async deleteWebhook(id) {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }
  async getAllWebhooks() {
    return await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }
  async updateWebhook(id, updates) {
    const [hook] = await db.update(webhooks).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(webhooks.id, id)).returning();
    return hook;
  }
  // Webhook events
  async logWebhookEvent(event) {
    const [row] = await db.insert(webhookEvents).values({
      webhookId: event.webhookId || null,
      headers: event.headers || {},
      query: event.query || {},
      body: event.body || null,
      response: event.response || null
    }).returning();
    return row;
  }
  async getWebhookEvents(limit = 200, filters) {
    let query = db.select().from(webhookEvents);
    if (filters?.webhookId) {
      query = query.where(eq(webhookEvents.webhookId, filters.webhookId));
    }
    return await query.orderBy(desc(webhookEvents.createdAt)).limit(limit);
  }
  async deleteWebhookEvents() {
    await db.delete(webhookEvents);
  }
  async deleteWebhookEventById(id) {
    await db.delete(webhookEvents).where(eq(webhookEvents.id, id));
  }
  // Admin: update basic entities safely (users, instances, webhooks)
  async adminUpdateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates }).where(eq(users.id, id)).returning();
    return user;
  }
  async adminUpdateWebhook(id, updates) {
    const [hook] = await db.update(webhooks).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(webhooks.id, id)).returning();
    return hook;
  }
  async getDefaultWhatsappInstance() {
    const stored = await this.getAppSetting("defaultWhatsappInstance");
    if (stored) {
      return {
        id: stored.id || "default",
        name: stored.name || "Default WhatsApp Instance",
        phoneNumberId: stored.phoneNumberId || "",
        accessToken: stored.accessToken || "",
        webhookVerifyToken: stored.webhookVerifyToken ?? null,
        appSecret: stored.appSecret ?? null,
        webhookBehavior: stored.webhookBehavior || "auto",
        isActive: typeof stored.isActive === "boolean" ? stored.isActive : true,
        updatedAt: stored.updatedAt,
        source: "custom"
      };
    }
    if (process.env.META_TOKEN || process.env.META_PHONE_NUMBER_ID) {
      return {
        id: "default",
        name: "Default WhatsApp Instance",
        phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
        accessToken: process.env.META_TOKEN || "",
        webhookVerifyToken: process.env.META_VERIFY_TOKEN || null,
        appSecret: process.env.META_APP_SECRET || null,
        webhookBehavior: "auto",
        isActive: true,
        source: "env"
      };
    }
    return null;
  }
  async setDefaultWhatsappInstance(config) {
    const payload = {
      ...config,
      id: "default",
      name: config.name || "Default WhatsApp Instance",
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      webhookVerifyToken: config.webhookVerifyToken ?? null,
      appSecret: config.appSecret ?? null,
      webhookBehavior: config.webhookBehavior || "auto",
      isActive: typeof config.isActive === "boolean" ? config.isActive : true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "custom"
    };
    await this.setAppSetting("defaultWhatsappInstance", payload);
  }
  async clearDefaultWhatsappInstance() {
    await db.delete(appSettings).where(eq(appSettings.key, "defaultWhatsappInstance"));
  }
  async getPinnedConversationsForUser(userId) {
    const rows = await db.select({
      conversationId: conversationPins.conversationId,
      pinnedAt: conversationPins.pinnedAt
    }).from(conversationPins).where(eq(conversationPins.userId, userId)).orderBy(desc(conversationPins.pinnedAt));
    return rows.map((row) => ({
      conversationId: row.conversationId,
      pinnedAt: row.pinnedAt ?? /* @__PURE__ */ new Date(0)
    }));
  }
  async pinConversation(userId, conversationId) {
    await db.insert(conversationPins).values({ userId, conversationId }).onConflictDoUpdate({
      target: [conversationPins.userId, conversationPins.conversationId],
      set: {
        pinnedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async unpinConversation(userId, conversationId) {
    await db.delete(conversationPins).where(
      and(
        eq(conversationPins.userId, userId),
        eq(conversationPins.conversationId, conversationId)
      )
    );
  }
  async isConversationPinned(userId, conversationId) {
    const result = await db.select({ count: sql2`count(*)::int` }).from(conversationPins).where(
      and(
        eq(conversationPins.userId, userId),
        eq(conversationPins.conversationId, conversationId)
      )
    ).limit(1);
    return (result[0]?.count ?? 0) > 0;
  }
  async countPinnedConversations(userId) {
    const result = await db.select({ count: sql2`count(*)::int` }).from(conversationPins).where(eq(conversationPins.userId, userId)).limit(1);
    return result[0]?.count ?? 0;
  }
  sanitizeWebhookPath(path7) {
    const fallback = "/webhook/meta";
    if (typeof path7 !== "string" || path7.trim().length === 0) {
      return fallback;
    }
    let normalized = path7.trim();
    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }
    normalized = normalized.replace(/\/{2,}/g, "/");
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.replace(/\/+$/, "");
    }
    if (!normalized.startsWith("/webhook")) {
      normalized = `/webhook${normalized === "/" ? "" : normalized}`;
    }
    return normalized || fallback;
  }
  defaultMetaWebhookSettings() {
    return {
      path: "/webhook/meta",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async getMetaWebhookSettings() {
    const stored = await this.getAppSetting("metaWebhookSettings");
    const defaults = this.defaultMetaWebhookSettings();
    if (!stored || typeof stored.path !== "string") {
      return defaults;
    }
    return {
      path: this.sanitizeWebhookPath(stored.path),
      updatedAt: stored.updatedAt || defaults.updatedAt
    };
  }
  async setMetaWebhookSettings(settings) {
    const payload = {
      path: this.sanitizeWebhookPath(settings.path),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.setAppSetting("metaWebhookSettings", payload);
  }
  // App settings (simple key/value JSON store)
  async getAppSetting(key) {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row ? row.value : null;
  }
  async setAppSetting(key, value) {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (existing.length > 0) {
      await db.update(appSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value, updatedAt: /* @__PURE__ */ new Date() });
    }
  }
};
var storage = new DatabaseStorage();

// server/providers/meta.ts
import crypto from "crypto";
import path from "path";

// server/logger.ts
init_validate_env();
import { randomUUID } from "crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import signale from "signale";
var isProduction = env.NODE_ENV === "production";
var hasPrettyEnv = Object.prototype.hasOwnProperty.call(process.env, "LOG_PRETTY");
var shouldPrettyPrint = hasPrettyEnv ? env.LOG_PRETTY : !isProduction;
var logFocus = env.LOG_FOCUS ?? "essential";
var ESSENTIAL_EVENTS = /* @__PURE__ */ new Set([
  "message_incoming",
  "message_outgoing",
  "message_outgoing_failed",
  "auth_login",
  "auth_login_failed",
  "auth_logout",
  "server_started"
]);
var formatMultiline = (lines) => lines.length > 1 ? `${lines[0]}
  ${lines.slice(1).join("\n  ")}` : lines[0];
var getStringValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};
var getPreview = (value, maxLength = 160) => {
  const text2 = getStringValue(value);
  if (!text2) return "";
  if (text2.length <= maxLength) return text2;
  return `${text2.slice(0, Math.max(0, maxLength - 3))}...`;
};
var appendErrorLines = (lines, log) => {
  const error = log.err ?? log.error;
  if (!error) return;
  const errorMessage = typeof error === "string" ? error : typeof error.message === "string" ? error.message : "";
  const errorCode = typeof error === "object" && error && typeof error.code === "string" ? String(error.code) : "";
  const errorParts = [errorMessage, errorCode ? `code=${errorCode}` : ""].filter(Boolean);
  if (errorParts.length > 0) {
    lines.push(`error: ${errorParts.join(" | ")}`);
  }
};
var formatEssentialEvent = (log) => {
  const event = getStringValue(log.event);
  if (!event) return null;
  const titles = {
    message_incoming: "\u{1F4E5} Incoming message",
    message_outgoing: "\u{1F4E4} Outgoing message",
    message_outgoing_failed: "\u274C Message failed",
    auth_login: "\u{1F510} Login",
    auth_login_failed: "\u{1F6AB} Login failed",
    auth_logout: "\u{1F513} Logout",
    server_started: "\u{1F680} Server started"
  };
  const title = titles[event];
  if (!title) return null;
  const lines = [title];
  if (event === "message_incoming") {
    const from = getStringValue(log.from || log.phone);
    const conversationId = getStringValue(log.conversationId);
    const messageId = getStringValue(log.messageId);
    const textPreview = getPreview(log.textPreview ?? log.body);
    if (from) lines.push(`from: ${from}`);
    if (conversationId) lines.push(`conversation: ${conversationId}`);
    if (messageId) lines.push(`message: ${messageId}`);
    if (textPreview) lines.push(`text: ${textPreview}`);
    if (typeof log.hasMedia === "boolean") {
      lines.push(`media: ${log.hasMedia ? "yes" : "no"}`);
    }
  }
  if (event === "message_outgoing" || event === "message_outgoing_failed") {
    const to = getStringValue(log.to || log.phone);
    const conversationId = getStringValue(log.conversationId);
    const messageId = getStringValue(log.messageId);
    const status = getStringValue(log.status);
    const messageType = getStringValue(log.messageType);
    const templateName = getStringValue(log.templateName);
    const textPreview = getPreview(log.textPreview ?? log.body);
    if (to) lines.push(`to: ${to}`);
    if (conversationId) lines.push(`conversation: ${conversationId}`);
    if (messageId) lines.push(`message: ${messageId}`);
    if (status) lines.push(`status: ${status}`);
    if (messageType) lines.push(`type: ${messageType}`);
    if (templateName) lines.push(`template: ${templateName}`);
    if (textPreview) lines.push(`text: ${textPreview}`);
    if (typeof log.hasMedia === "boolean") {
      lines.push(`media: ${log.hasMedia ? "yes" : "no"}`);
    }
  }
  if (event === "auth_login" || event === "auth_logout" || event === "auth_login_failed") {
    const username = getStringValue(log.username);
    const userId = getStringValue(log.userId);
    const role = getStringValue(log.role);
    const ip = getStringValue(log.ip);
    if (username) lines.push(`user: ${username}`);
    if (userId) lines.push(`id: ${userId}`);
    if (role) lines.push(`role: ${role}`);
    if (ip) lines.push(`ip: ${ip}`);
  }
  if (event === "server_started") {
    const host = getStringValue(log.host);
    const port = getStringValue(log.port);
    if (host) lines.push(`host: ${host}`);
    if (port) lines.push(`port: ${port}`);
  }
  appendErrorLines(lines, log);
  return formatMultiline(lines);
};
var formatPrettyMessage = (log, messageKey) => {
  const essential = formatEssentialEvent(log);
  if (essential) {
    return essential;
  }
  const message = typeof log[messageKey] === "string" ? log[messageKey] : "";
  const event = typeof log.event === "string" ? log.event : "";
  const service = typeof log.service === "string" ? log.service : "";
  const lines = [];
  if (event) {
    lines.push(`event: ${event}`);
  } else if (log.req || log.res) {
    lines.push("event: http_request");
  }
  if (message && message !== event) {
    lines.push(`message: ${message}`);
  }
  if (lines.length === 0 && service) {
    lines.push(`service: ${service}`);
  }
  if (lines.length === 0) {
    lines.push("event: log");
  }
  const path7 = typeof log.path === "string" ? log.path : "";
  if (path7) {
    lines.push(`path: ${path7}`);
  }
  const req = log.req;
  const res = log.res;
  if (req?.method || req?.url) {
    const method = req.method ?? "N/A";
    const url = req.url ?? "";
    const ip = req.ip ? ` from ${req.ip}` : "";
    lines.push(`request: ${method} ${url}${ip}`.trim());
  }
  if (res?.statusCode) {
    lines.push(`response: ${res.statusCode}`);
  }
  const metrics = [];
  const duration = typeof log.durationMs === "number" ? log.durationMs : log.responseTime;
  if (typeof duration === "number") {
    metrics.push(`duration=${Math.round(duration)}ms`);
  }
  if (typeof log.messageCount === "number") {
    metrics.push(`messages=${log.messageCount}`);
  }
  if (typeof log.statusCount === "number") {
    metrics.push(`statuses=${log.statusCount}`);
  }
  if (metrics.length > 0) {
    lines.push(`metrics: ${metrics.join(" | ")}`);
  }
  appendErrorLines(lines, log);
  return formatMultiline(lines);
};
var resolveSignaleLevel = (level) => {
  if (typeof level === "string" && level.trim()) {
    const normalized = level.trim().toLowerCase();
    if (["debug", "info", "warn", "error"].includes(normalized)) return normalized;
    if (normalized === "fatal") return "error";
    if (normalized === "trace") return "debug";
    return "info";
  }
  if (typeof level === "number") {
    if (level >= 50) return "error";
    if (level >= 40) return "warn";
    if (level >= 30) return "info";
    return "debug";
  }
  return "info";
};
var writeToSignale = (level, message) => {
  const target = typeof signale[level] === "function" ? signale[level] : typeof signale.info === "function" ? signale.info : signale.log;
  target.call(signale, message);
};
var signaleStream = {
  write(chunk) {
    const raw = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const line = raw.trim();
    if (!line) return;
    try {
      const parsed2 = JSON.parse(line);
      const level = resolveSignaleLevel(parsed2.level);
      const message = formatPrettyMessage(parsed2, "msg");
      writeToSignale(level, message);
    } catch {
      writeToSignale("info", line);
    }
  }
};
if (shouldPrettyPrint && typeof signale.config === "function") {
  signale.config({ displayTimestamp: true, displayDate: false });
}
var loggerDestination = shouldPrettyPrint ? signaleStream : pino.destination(1);
var logger = pino(
  {
    level: env.LOG_LEVEL,
    base: { service: "chatsphere" },
    timestamp: pino.stdTimeFunctions.isoTime,
    hooks: {
      logMethod(args, method, level) {
        if (logFocus === "all") {
          return method.apply(this, args);
        }
        const record = args.length > 0 && args[0] && typeof args[0] === "object" ? args[0] : {};
        const numericLevel = typeof level === "number" ? level : Number(level);
        if (Number.isFinite(numericLevel) && numericLevel >= 40) {
          return method.apply(this, args);
        }
        const event = getStringValue(record.event);
        if (event && ESSENTIAL_EVENTS.has(event)) {
          return method.apply(this, args);
        }
        return void 0;
      }
    },
    ...isProduction ? {} : {
      formatters: {
        level(label) {
          return { level: label };
        }
      }
    }
  },
  loggerDestination
);
var serializeRequest = (req) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  ip: req.headers?.["x-forwarded-for"] ?? req.remoteAddress
});
var serializeResponse = (res) => ({
  statusCode: res.statusCode
});
var httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (req.url === "/health") return "silent";
    if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
    if (res.statusCode >= 500 || err) return "error";
    return "info";
  },
  serializers: {
    req: serializeRequest,
    res: serializeResponse
  },
  genReqId: (req, res) => {
    const headerRequestId = req.headers["x-request-id"] || req.headers["x-correlation-id"] || req.headers["x-amzn-trace-id"];
    if (typeof headerRequestId === "string" && headerRequestId.length > 0) {
      res.setHeader("x-request-id", headerRequestId);
      return headerRequestId;
    }
    const id = randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customProps: (req) => ({
    requestPath: req.url
  })
});

// server/providers/meta.ts
var MetaProvider = class {
  token;
  phoneNumberId;
  verifyToken;
  appSecret;
  graphVersion;
  constructor(token, phoneNumberId, verifyToken, appSecret, graphVersion) {
    this.token = token || process.env.META_TOKEN || "";
    this.phoneNumberId = phoneNumberId || process.env.META_PHONE_NUMBER_ID || "";
    this.verifyToken = verifyToken || process.env.META_VERIFY_TOKEN || "";
    this.appSecret = appSecret || process.env.META_APP_SECRET || "";
    this.graphVersion = graphVersion || process.env.META_GRAPH_VERSION || "v19.0";
    if (!this.token || !this.phoneNumberId) {
      logger.warn("Meta credentials not configured. Sending messages will fail.");
    }
  }
  async postMessage(messagePayload) {
    const response = await fetch(
      `https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messagePayload)
      }
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta API error: ${error}`);
    }
    const data = await response.json();
    return { id: data.messages?.[0]?.id, status: "sent" };
  }
  applyReplyContext(messagePayload, options) {
    const replyTo = options?.replyToMessageId;
    if (replyTo) {
      messagePayload.context = { message_id: replyTo };
    }
  }
  async send(to, body, mediaUrl, options) {
    if (!this.token || !this.phoneNumberId) {
      throw new Error("Meta credentials not configured. Please set META_TOKEN and META_PHONE_NUMBER_ID environment variables.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const messagePayload = {
      messaging_product: "whatsapp",
      to: cleanPhone
    };
    this.applyReplyContext(messagePayload, options);
    if (mediaUrl) {
      const normalizedUrl = mediaUrl.split("?")[0].split("#")[0];
      const extension = path.extname(normalizedUrl || "").toLowerCase();
      const asImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const asVideo = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
      const asAudio = [".mp3", ".mpeg", ".ogg", ".wav", ".aac"];
      const asDocument = [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".csv"
      ];
      const filename = path.basename(normalizedUrl || "attachment");
      if (asImage.includes(extension)) {
        messagePayload.type = "image";
        messagePayload.image = { link: mediaUrl };
        if (body) {
          messagePayload.image.caption = body;
        }
      } else if (asVideo.includes(extension)) {
        messagePayload.type = "video";
        messagePayload.video = { link: mediaUrl };
        if (body) {
          messagePayload.video.caption = body;
        }
      } else if (asAudio.includes(extension)) {
        messagePayload.type = "audio";
        messagePayload.audio = { link: mediaUrl };
      } else if (asDocument.includes(extension) || extension.length === 0) {
        messagePayload.type = "document";
        messagePayload.document = { link: mediaUrl, filename };
        if (body) {
          messagePayload.document.caption = body;
        }
      } else {
        messagePayload.type = "document";
        messagePayload.document = { link: mediaUrl, filename };
        if (body) {
          messagePayload.document.caption = body;
        }
      }
    } else if (body) {
      messagePayload.type = "text";
      messagePayload.text = { body };
    }
    return await this.postMessage(messagePayload);
  }
  async sendTemplate(to, template, options) {
    if (!this.token || !this.phoneNumberId) {
      throw new Error("Meta credentials not configured. Please set META_TOKEN and META_PHONE_NUMBER_ID environment variables.");
    }
    if (!template?.name) {
      throw new Error("Template name is required.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const templateLanguage = template.language;
    const language = typeof templateLanguage === "string" ? { code: templateLanguage.trim() } : templateLanguage && typeof templateLanguage === "object" && typeof templateLanguage.code === "string" ? { ...templateLanguage, code: templateLanguage.code.trim() } : { code: "en_US" };
    const messagePayload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        ...template,
        language
      }
    };
    this.applyReplyContext(messagePayload, options);
    return await this.postMessage(messagePayload);
  }
  verifyWebhook(request) {
    const mode = request.query?.["hub.mode"];
    const token = request.query?.["hub.verify_token"];
    return mode === "subscribe" && token === this.verifyToken;
  }
  verifyWebhookSignature(request, rawBody) {
    const signature = request.headers?.["x-hub-signature-256"];
    if (!signature) {
      logger.warn("Missing X-Hub-Signature-256 header");
      return !this.appSecret;
    }
    if (!this.appSecret) {
      return true;
    }
    try {
      const expectedSignature = crypto.createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
      const signatureHash = signature.replace("sha256=", "");
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error({ err: error }, "Meta signature verification error");
      return false;
    }
  }
  parseIncoming(payload) {
    const events = [];
    if (!payload?.entry) {
      logger.warn(
        {
          payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : []
        },
        "meta_webhook_payload_missing_entry"
      );
      return events;
    }
    for (const entry of payload.entry) {
      if (!entry?.changes) {
        logger.debug({ entryId: entry?.id }, "meta_webhook_entry_missing_changes");
        continue;
      }
      for (const change of entry.changes) {
        const messages2 = change?.value?.messages;
        if (!Array.isArray(messages2)) {
          logger.debug({ entryId: entry?.id }, "meta_webhook_change_missing_messages");
          continue;
        }
        for (const msg of messages2) {
          const timestampSeconds = Number(msg.timestamp);
          const timestampIso = Number.isFinite(timestampSeconds) ? new Date(timestampSeconds * 1e3).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
          const event = {
            from: msg.from,
            raw: msg,
            providerMessageId: msg.id,
            replyToProviderMessageId: msg.context?.id,
            timestamp: timestampIso
          };
          if (msg.type === "text") {
            event.body = msg.text?.body;
          } else if (msg.type === "image") {
            event.media = this.buildMediaDescriptor("image", msg.image);
            event.body = msg.image?.caption ?? msg.caption;
          } else if (msg.type === "document") {
            event.media = this.buildMediaDescriptor("document", msg.document);
            event.body = msg.document?.caption ?? msg.caption;
          } else if (msg.type === "video") {
            event.media = this.buildMediaDescriptor("video", msg.video);
            event.body = msg.video?.caption ?? msg.caption;
          } else if (msg.type === "audio") {
            event.media = this.buildMediaDescriptor("audio", msg.audio);
          } else if (msg.type === "sticker") {
            event.media = this.buildMediaDescriptor("image", msg.sticker);
            event.body = msg.sticker?.emoji ? `Sticker ${msg.sticker.emoji}` : "Sticker";
          } else if (msg.type === "location") {
            const lat = Number(msg.location?.latitude);
            const lng = Number(msg.location?.longitude);
            const lines = [];
            if (msg.location?.name) lines.push(msg.location.name);
            if (msg.location?.address) lines.push(msg.location.address);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              lines.push(`https://maps.google.com/?q=${lat},${lng}`);
            }
            event.body = lines.length ? lines.join("\n") : "Shared a location";
          } else if (msg.type === "contacts") {
            const contacts = Array.isArray(msg.contacts) ? msg.contacts : [];
            const names = contacts.map((contact) => contact?.name?.formatted_name || contact?.name?.first_name).filter(Boolean);
            event.body = names.length ? `Contact: ${names.join(", ")}` : "Shared a contact";
          } else if (msg.type === "interactive") {
            const interactive = msg.interactive;
            if (interactive?.type === "button_reply") {
              event.body = interactive?.button_reply?.title ?? interactive?.button_reply?.id ?? "Button reply";
            } else if (interactive?.type === "list_reply") {
              event.body = interactive?.list_reply?.title ?? interactive?.list_reply?.id ?? "List reply";
            } else if (interactive?.type === "nfm_reply") {
              event.body = interactive?.nfm_reply?.body ?? "Flow reply";
            } else {
              event.body = interactive?.type ? `Interactive: ${interactive.type}` : "Interactive message";
            }
          } else if (msg.type === "button") {
            event.body = msg.button?.text ?? "Button response";
          } else if (msg.type === "reaction") {
            event.body = msg.reaction?.emoji ? `Reaction ${msg.reaction.emoji}` : "Reaction";
          } else if (msg.type === "order") {
            event.body = "Order received";
          } else if (msg.type === "system") {
            event.body = msg.system?.body ?? "System message";
          } else {
            logger.debug({ type: msg.type }, "meta_webhook_unknown_message_type");
          }
          if (!event.body) {
            event.body = msg.text?.body ?? msg.caption ?? msg.body ?? msg.title ?? msg.name ?? void 0;
          }
          if (!event.body && !event.media && msg.type) {
            event.body = `Unsupported message type: ${msg.type}`;
          }
          events.push(event);
        }
      }
    }
    logger.debug({ eventCount: events.length }, "meta_webhook_events_parsed");
    return events;
  }
  getAccessToken() {
    return this.token;
  }
  getGraphVersion() {
    return this.graphVersion;
  }
  async fetchMediaMetadata(mediaId) {
    if (!this.token) {
      throw new Error("Meta access token is not configured");
    }
    const response = await fetch(
      `https://graph.facebook.com/${this.graphVersion}/${mediaId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch media metadata (${response.status}): ${body}`);
    }
    return await response.json();
  }
  async downloadMedia(url) {
    if (!this.token) {
      throw new Error("Meta access token is not configured");
    }
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to download media (${response.status}): ${body}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type");
    return { buffer: Buffer.from(arrayBuffer), contentType };
  }
  buildMediaDescriptor(type, payload) {
    if (!payload) return void 0;
    const descriptor = {
      provider: "meta",
      type,
      mediaId: payload?.id ?? payload?.media_id ?? void 0,
      url: payload?.link ?? void 0,
      mimeType: payload?.mime_type ?? payload?.mimetype ?? void 0,
      filename: payload?.filename ?? void 0,
      sha256: payload?.sha256 ?? void 0,
      sizeBytes: payload?.file_size ?? payload?.filesize ?? void 0,
      width: payload?.width ?? void 0,
      height: payload?.height ?? void 0,
      durationSeconds: payload?.duration ?? void 0,
      pageCount: payload?.page_count ?? void 0,
      previewUrl: payload?.preview_url ?? void 0,
      thumbnailUrl: payload?.thumbnail_url ?? void 0,
      metadata: payload
    };
    return descriptor;
  }
};

// server/debug-webhook.ts
var WebhookDebugger = class {
  static async debugWebhookFlow(instanceId, payload, headers, query) {
    const debugInfo = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      instanceId,
      payload: JSON.stringify(payload, null, 2),
      headers: JSON.stringify(headers, null, 2),
      query: JSON.stringify(query, null, 2),
      analysis: {}
    };
    try {
      const instanceConfig = await storage.getDefaultWhatsappInstance();
      const provider = new MetaProvider(
        instanceConfig?.accessToken,
        instanceConfig?.phoneNumberId,
        instanceConfig?.webhookVerifyToken ?? void 0,
        instanceConfig?.appSecret ?? void 0
      );
      debugInfo.analysis.instanceData = {
        id: instanceConfig?.id ?? "default",
        name: instanceConfig?.name ?? "Default WhatsApp Instance",
        isActive: instanceConfig?.isActive ?? true,
        hasAppSecret: !!(instanceConfig?.appSecret || process.env.META_APP_SECRET),
        hasVerifyToken: !!(instanceConfig?.webhookVerifyToken || process.env.META_VERIFY_TOKEN),
        webhookBehavior: instanceConfig?.webhookBehavior ?? "auto",
        phoneNumberId: instanceConfig?.phoneNumberId ?? process.env.META_PHONE_NUMBER_ID ?? "",
        source: instanceConfig?.source ?? (process.env.META_TOKEN || process.env.META_PHONE_NUMBER_ID ? "env" : "custom")
      };
      debugInfo.analysis.payloadStructure = {
        hasEntry: !!payload.entry,
        entryCount: payload.entry ? payload.entry.length : 0,
        entries: payload.entry ? payload.entry.map((entry) => ({
          hasChanges: !!entry.changes,
          changesCount: entry.changes ? entry.changes.length : 0,
          changes: entry.changes ? entry.changes.map((change) => ({
            hasValue: !!change.value,
            hasMessages: !!change.value?.messages,
            messagesCount: change.value?.messages ? change.value.messages.length : 0,
            messages: change.value?.messages ? change.value.messages.map((msg) => ({
              from: msg.from,
              type: msg.type,
              hasText: !!msg.text,
              hasImage: !!msg.image,
              textBody: msg.text?.body,
              imageCaption: msg.image?.caption
            })) : []
          })) : []
        })) : []
      };
      const events = provider.parseIncoming(payload);
      debugInfo.analysis.parsedEvents = {
        count: events.length,
        events: events.map((event) => ({
          from: event.from,
          hasBody: !!event.body,
          body: event.body,
          hasMedia: !!event.media,
          media: event.media,
          hasRaw: !!event.raw
        }))
      };
      if (instanceConfig?.appSecret || process.env.META_APP_SECRET) {
        const rawBody = JSON.stringify(payload);
        const signatureValid = provider.verifyWebhookSignature({ headers }, rawBody);
        debugInfo.analysis.signatureVerification = {
          hasAppSecret: true,
          signatureValid,
          signatureHeader: headers["x-hub-signature-256"]
        };
      } else {
        debugInfo.analysis.signatureVerification = {
          hasAppSecret: false,
          signatureValid: true
        };
      }
      debugInfo.analysis.webhookBehavior = "auto";
    } catch (error) {
      debugInfo.analysis.error = error.message;
      debugInfo.analysis.stack = error.stack;
    }
    return debugInfo;
  }
  static async logWebhookDebug(instanceId, payload, headers, query) {
    const debugInfo = await this.debugWebhookFlow(instanceId, payload, headers, query);
    await storage.logWebhookEvent({
      headers,
      query,
      body: payload,
      response: {
        status: 200,
        body: "debug_logged",
        debugInfo
      }
    });
    logger.debug({ event: "webhook_debug", debugInfo }, "Webhook debug info");
    return debugInfo;
  }
};

// server/services/media-pipeline.ts
import { promises as fs } from "fs";
import sharp from "sharp";

// server/services/media-storage.ts
import crypto3 from "crypto";
import { mkdirSync } from "fs";
import path2 from "path";

// server/lib/signedUrl.ts
import crypto2 from "crypto";
var SIGNING_SECRET = process.env.FILES_SIGNING_SECRET;
var REQUIRE_SIGNED_URL = (() => {
  const explicit = process.env.REQUIRE_SIGNED_URL;
  if (explicit != null) {
    return String(explicit).toLowerCase() === "true";
  }
  return Boolean(SIGNING_SECRET);
})();
function assertSigningSecret() {
  if (REQUIRE_SIGNED_URL && !SIGNING_SECRET) {
    throw new Error("FILES_SIGNING_SECRET must be set when REQUIRE_SIGNED_URL=true");
  }
}
function isSignedUrlRequired() {
  return REQUIRE_SIGNED_URL;
}
function createSignature(path7, expiresAt) {
  if (!SIGNING_SECRET) {
    throw new Error("FILES_SIGNING_SECRET is required to generate signatures");
  }
  const hmac = crypto2.createHmac("sha256", SIGNING_SECRET);
  hmac.update(path7);
  hmac.update(":");
  hmac.update(String(expiresAt));
  return hmac.digest("hex");
}
function verifySignedUrl(req) {
  if (!REQUIRE_SIGNED_URL) {
    return { valid: true };
  }
  const { signature, expires } = req.query;
  if (typeof signature !== "string" || typeof expires !== "string") {
    return { valid: false, status: 401, message: "Missing signature parameters." };
  }
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt)) {
    return { valid: false, status: 400, message: "Invalid expiration parameter." };
  }
  if (expiresAt * 1e3 < Date.now()) {
    return { valid: false, status: 401, message: "Signed URL has expired." };
  }
  if (!SIGNING_SECRET) {
    return { valid: false, status: 500, message: "Signing secret not configured." };
  }
  const normalizedPath = req.path;
  const expectedSignature = createSignature(normalizedPath, expiresAt);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (providedBuffer.length !== expectedBuffer.length || !crypto2.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { valid: false, status: 403, message: "Invalid signed URL signature." };
  }
  return { valid: true };
}
function buildSignedPath(path7, ttlSeconds) {
  const expiresAt = Math.floor(Date.now() / 1e3) + ttlSeconds;
  const url = new URL(path7, "https://placeholder.local");
  const canonicalPath = url.pathname;
  const signature = createSignature(canonicalPath, expiresAt);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", signature);
  return url.pathname + url.search;
}

// server/services/media-storage.ts
var configuredRoot = process.env.MEDIA_STORAGE_ROOT;
var MEDIA_ROOT = configuredRoot ? path2.isAbsolute(configuredRoot) ? configuredRoot : path2.join(process.cwd(), configuredRoot) : path2.join(process.cwd(), "uploads");
var MEDIA_ROUTE_PREFIX = "/media";
var DEFAULT_SIGNED_URL_TTL_SECONDS = Number(
  process.env.MEDIA_SIGNED_URL_TTL_SECONDS ?? process.env.MEDIA_SIGNED_URL_TTL ?? 900
);
var ensuredDirectories = /* @__PURE__ */ new Set();
var REQUIRED_DIRECTORIES = [
  "",
  "incoming",
  path2.join("incoming", "original"),
  path2.join("incoming", "thumbnails"),
  path2.join("incoming", "previews"),
  "outbound",
  path2.join("outbound", "original"),
  path2.join("outbound", "thumbnails"),
  "cache"
];
function ensureDirectory(relativePath) {
  const absolutePath = path2.join(MEDIA_ROOT, relativePath);
  if (ensuredDirectories.has(absolutePath)) {
    return;
  }
  mkdirSync(absolutePath, { recursive: true });
  ensuredDirectories.add(absolutePath);
}
function ensureMediaDirectories() {
  REQUIRED_DIRECTORIES.forEach((relativeDir) => {
    ensureDirectory(relativeDir);
  });
}
function resolveAbsoluteMediaPath(relativePath) {
  const normalizedRelative = relativePath.replace(/^\/+/, "");
  const absolutePath = path2.resolve(MEDIA_ROOT, normalizedRelative);
  if (!absolutePath.startsWith(path2.resolve(MEDIA_ROOT))) {
    throw new Error("Attempted to resolve media path outside of root");
  }
  return absolutePath;
}
function toRelativeMediaPath(parts) {
  return parts.join("/").split("/").filter(Boolean).join("/");
}
function toUrlPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${MEDIA_ROUTE_PREFIX}/${normalized}`;
}
function buildSignedMediaPath(relativePath, ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS) {
  const normalizedRelative = relativePath.replace(/^\/+/, "");
  const unsignedPath = toUrlPath(normalizedRelative);
  if (!isSignedUrlRequired()) {
    return unsignedPath;
  }
  return buildSignedPath(unsignedPath, ttlSeconds);
}
function sanitizeFileName(filename, fallbackBase) {
  const base = filename?.split("/").pop() ?? fallbackBase;
  const normalized = base.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^\./, "").toLowerCase();
  return normalized || `${fallbackBase}-${crypto3.randomUUID()}`;
}
function buildMediaFileName(options) {
  const extension = (options.extension ?? options.originalFileName?.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExtension = extension ? `.${extension}` : "";
  const prefix = options.prefix ?? "media";
  if (options.originalFileName) {
    const sanitized = sanitizeFileName(options.originalFileName, prefix);
    if (safeExtension && !sanitized.endsWith(safeExtension)) {
      return `${sanitized.replace(/\.[^.]+$/, "")}${safeExtension}`;
    }
    return sanitized;
  }
  if (options.mediaId) {
    return `${prefix}-${options.mediaId}${safeExtension}`;
  }
  return `${prefix}-${Date.now()}-${crypto3.randomUUID()}${safeExtension}`;
}
function extractRelativeMediaPath(inputUrl) {
  if (!inputUrl) return null;
  try {
    const parsed2 = new URL(inputUrl, "https://placeholder.local");
    const pathname = parsed2.pathname ?? "";
    if (!pathname.startsWith(MEDIA_ROUTE_PREFIX)) {
      return null;
    }
    return pathname.substring(MEDIA_ROUTE_PREFIX.length).replace(/^\/+/, "");
  } catch {
    if (inputUrl.startsWith(MEDIA_ROUTE_PREFIX)) {
      return inputUrl.substring(MEDIA_ROUTE_PREFIX.length).replace(/^\/+/, "");
    }
    return null;
  }
}

// server/lib/mime.ts
var DEFAULT_MIME = "application/octet-stream";
var MIME_MAP = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed"
};
var EXTENSION_MAP = {};
Object.entries(MIME_MAP).forEach(([ext, mime]) => {
  EXTENSION_MAP[normalizeMimeType(mime) ?? mime] = ext;
});
function normalizeExtension(input) {
  const normalized = input.trim().toLowerCase();
  return normalized.includes(".") ? normalized.substring(normalized.lastIndexOf(".") + 1) : normalized;
}
function normalizeMimeType(mime) {
  if (!mime) {
    return null;
  }
  const normalized = mime.trim().toLowerCase();
  return normalized || null;
}
function getMimeType(filenameOrExt) {
  const normalizedExt = normalizeExtension(filenameOrExt);
  return MIME_MAP[normalizedExt] ?? DEFAULT_MIME;
}
function getMimeTypeFromExtension(filenameOrExt) {
  if (!filenameOrExt) return null;
  const normalizedExt = normalizeExtension(filenameOrExt);
  return MIME_MAP[normalizedExt] ?? null;
}
function getExtensionFromMime(mime) {
  const normalizedMime = normalizeMimeType(mime);
  if (!normalizedMime) return null;
  if (EXTENSION_MAP[normalizedMime]) {
    return EXTENSION_MAP[normalizedMime];
  }
  const entry = Object.entries(MIME_MAP).find(
    ([, value]) => normalizeMimeType(value) === normalizedMime
  );
  return entry?.[0] ?? null;
}

// server/services/media-pipeline.ts
var MAX_DOWNLOAD_ATTEMPTS = Number(process.env.MEDIA_DOWNLOAD_MAX_ATTEMPTS ?? 3);
var RETRY_DELAY_MS = Number(process.env.MEDIA_DOWNLOAD_RETRY_DELAY_MS ?? 750);
var MAX_ORIGINAL_BYTES = Number(process.env.MEDIA_MAX_ORIGINAL_BYTES ?? 25 * 1024 * 1024);
var THUMB_MAX_WIDTH = Number(process.env.MEDIA_THUMBNAIL_MAX_WIDTH ?? 512);
var THUMB_MAX_HEIGHT = Number(process.env.MEDIA_THUMBNAIL_MAX_HEIGHT ?? 512);
var MEDIA_TYPES_WITH_THUMBNAILS = /* @__PURE__ */ new Set(["image", "video", "document"]);
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ingestWhatsappMedia({
  messageId,
  conversationId,
  descriptor,
  provider,
  onStatusChange
}) {
  ensureMediaDirectories();
  const message = await storage.getMessageById(messageId);
  if (!message) {
    logger.warn(
      { messageId, conversationId },
      "ingestWhatsappMedia: message no longer exists, aborting."
    );
    return;
  }
  const existingMedia = message.media ?? null;
  const workingMedia = mergeMedia(existingMedia, descriptor);
  await persistAndNotify(messageId, workingMedia, onStatusChange);
  try {
    const metadata = await fetchMediaMetadataWithRetry(provider, descriptor.mediaId, workingMedia);
    const effectiveMimeType = normalizeMimeType(descriptor.mimeType) ?? normalizeMimeType(metadata?.mime_type) ?? workingMedia.mimeType ?? "application/octet-stream";
    const declaredSize = descriptor.sizeBytes ?? metadata?.file_size ?? existingMedia?.sizeBytes;
    if (declaredSize && declaredSize > MAX_ORIGINAL_BYTES) {
      throw new Error(
        `Media exceeds configured size limit (${declaredSize} bytes > ${MAX_ORIGINAL_BYTES})`
      );
    }
    const downloadResult = await downloadMediaWithRetry(provider, metadata?.url ?? descriptor.url);
    const buffer = downloadResult.buffer;
    if (!buffer?.length) {
      throw new Error("Downloaded media is empty.");
    }
    if (buffer.length > MAX_ORIGINAL_BYTES) {
      throw new Error(
        `Downloaded media exceeds configured size limit (${buffer.length} bytes > ${MAX_ORIGINAL_BYTES})`
      );
    }
    const extension = workingMedia.extension ?? getExtensionFromMime(effectiveMimeType) ?? getExtensionFromMime(downloadResult.contentType) ?? getExtensionFromMime(metadata?.mime_type) ?? guessExtensionFromFileName(descriptor.filename) ?? "bin";
    const sanitizedFileName = buildMediaFileName({
      mediaId: descriptor.mediaId ?? metadata?.id ?? message.providerMessageId ?? messageId,
      originalFileName: descriptor.filename ?? metadata?.name ?? existingMedia?.filename ?? null,
      extension,
      prefix: descriptor.type ?? workingMedia.type ?? "media"
    });
    const relativeOriginalPath = toRelativeMediaPath([
      "incoming",
      "original",
      sanitizedFileName
    ]);
    const absoluteOriginalPath = resolveAbsoluteMediaPath(relativeOriginalPath);
    await fs.writeFile(absoluteOriginalPath, buffer);
    let thumbnailRelativePath = null;
    let previewRelativePath = null;
    let measuredWidth = workingMedia.width ?? null;
    let measuredHeight = workingMedia.height ?? null;
    let pageCount = workingMedia.pageCount ?? null;
    if (MEDIA_TYPES_WITH_THUMBNAILS.has(workingMedia.type)) {
      const thumbInfo = await generateThumbnail({
        buffer,
        type: workingMedia.type,
        mimeType: effectiveMimeType,
        baseFileName: sanitizedFileName
      });
      if (thumbInfo) {
        thumbnailRelativePath = thumbInfo.thumbnailRelativePath;
        previewRelativePath = thumbInfo.previewRelativePath;
        measuredWidth = thumbInfo.width ?? measuredWidth;
        measuredHeight = thumbInfo.height ?? measuredHeight;
        pageCount = thumbInfo.pageCount ?? pageCount;
      }
    }
    const finalMedia = {
      ...workingMedia,
      status: "ready",
      mimeType: effectiveMimeType,
      filename: sanitizedFileName,
      extension,
      sizeBytes: buffer.length,
      checksum: metadata?.sha256 ?? workingMedia.checksum ?? null,
      width: measuredWidth,
      height: measuredHeight,
      pageCount,
      storage: {
        ...workingMedia.storage ?? {},
        originalPath: relativeOriginalPath,
        thumbnailPath: thumbnailRelativePath,
        previewPath: previewRelativePath
      },
      url: toUrlPath(relativeOriginalPath),
      thumbnailUrl: thumbnailRelativePath ? toUrlPath(thumbnailRelativePath) : workingMedia.thumbnailUrl ?? null,
      previewUrl: previewRelativePath ? toUrlPath(previewRelativePath) : workingMedia.previewUrl ?? null,
      downloadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      thumbnailGeneratedAt: thumbnailRelativePath ? (/* @__PURE__ */ new Date()).toISOString() : workingMedia.thumbnailGeneratedAt ?? null,
      downloadError: null,
      metadata: {
        ...workingMedia.metadata ?? {},
        whatsapp: {
          ...workingMedia.metadata?.whatsapp ?? {},
          ...descriptor.metadata
        },
        provider: metadata
      }
    };
    await persistAndNotify(messageId, finalMedia, onStatusChange);
  } catch (error) {
    const failedMedia = {
      ...workingMedia,
      status: "failed",
      downloadError: error?.message ?? "Unknown media ingestion error."
    };
    logger.error(
      {
        err: error,
        conversationId,
        messageId,
        mediaId: descriptor.mediaId,
        providerMessageId: message.providerMessageId,
        mimeType: descriptor.mimeType
      },
      "Failed to ingest WhatsApp media."
    );
    await persistAndNotify(messageId, failedMedia, onStatusChange);
  }
}
async function generateThumbnail({
  buffer,
  mimeType,
  type,
  baseFileName
}) {
  if (!buffer.length) return null;
  const extension = getExtensionFromMime(mimeType) ?? guessExtensionFromFileName(baseFileName);
  if (type === "image" || type === "document" && extension === "pdf") {
    const sharpInstance = type === "document" && extension === "pdf" ? sharp(buffer, { density: 160, pages: 1 }) : sharp(buffer);
    const basicMeta = await sharpInstance.metadata();
    const resized = await sharpInstance.clone().rotate().resize({
      width: THUMB_MAX_WIDTH,
      height: THUMB_MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true
    }).toFormat("webp", { quality: 80 });
    const thumbBuffer = await resized.toBuffer();
    const thumbName = buildMediaFileName({
      originalFileName: `${baseFileName}-thumb.webp`,
      prefix: "thumb",
      extension: "webp"
    });
    const relativeThumbPath = toRelativeMediaPath(["incoming", "thumbnails", thumbName]);
    const absoluteThumbPath = resolveAbsoluteMediaPath(relativeThumbPath);
    await fs.writeFile(absoluteThumbPath, thumbBuffer);
    return {
      thumbnailRelativePath: relativeThumbPath,
      previewRelativePath: relativeThumbPath,
      width: basicMeta.width ?? null,
      height: basicMeta.height ?? null,
      pageCount: type === "document" ? 1 : null
    };
  }
  return null;
}
async function fetchMediaMetadataWithRetry(provider, mediaId, workingMedia) {
  if (!mediaId) {
    return null;
  }
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const metadata = await provider.fetchMediaMetadata(mediaId);
      return metadata;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        {
          mediaId,
          attempt,
          maxAttempts: MAX_DOWNLOAD_ATTEMPTS,
          error: lastError.message,
          providerMediaId: workingMedia.providerMediaId
        },
        "Failed to fetch media metadata, will retry if attempts remain."
      );
      if (attempt < MAX_DOWNLOAD_ATTEMPTS) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  return null;
}
async function downloadMediaWithRetry(provider, downloadUrl) {
  if (!downloadUrl) {
    throw new Error("No media download URL available.");
  }
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      return await provider.downloadMedia(downloadUrl);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        {
          attempt,
          maxAttempts: MAX_DOWNLOAD_ATTEMPTS,
          error: lastError.message
        },
        "Failed to download media content, will retry if attempts remain."
      );
      if (attempt < MAX_DOWNLOAD_ATTEMPTS) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Media download failed.");
}
async function persistAndNotify(messageId, media, onStatusChange) {
  await storage.updateMessageMedia(messageId, media);
  if (onStatusChange) {
    const updated = await storage.getMessageById(messageId);
    await onStatusChange(updated);
  }
}
function mergeMedia(existing, descriptor) {
  return {
    origin: existing?.origin ?? "whatsapp",
    type: descriptor.type ?? existing?.type ?? "unknown",
    status: "processing",
    provider: descriptor.provider ?? existing?.provider ?? "meta",
    providerMediaId: descriptor.mediaId ?? existing?.providerMediaId ?? null,
    mimeType: normalizeMimeType(descriptor.mimeType) ?? existing?.mimeType ?? null,
    filename: existing?.filename ?? descriptor.filename ?? null,
    extension: existing?.extension ?? null,
    sizeBytes: descriptor.sizeBytes ?? existing?.sizeBytes ?? null,
    checksum: descriptor.sha256 ?? existing?.checksum ?? null,
    width: descriptor.width ?? existing?.width ?? null,
    height: descriptor.height ?? existing?.height ?? null,
    durationSeconds: descriptor.durationSeconds ?? existing?.durationSeconds ?? null,
    pageCount: descriptor.pageCount ?? existing?.pageCount ?? null,
    url: existing?.url ?? null,
    thumbnailUrl: existing?.thumbnailUrl ?? null,
    previewUrl: existing?.previewUrl ?? null,
    placeholderUrl: existing?.placeholderUrl ?? null,
    storage: existing?.storage ?? null,
    downloadAttempts: (existing?.downloadAttempts ?? 0) + 1,
    downloadError: null,
    downloadedAt: existing?.downloadedAt ?? null,
    thumbnailGeneratedAt: existing?.thumbnailGeneratedAt ?? null,
    metadata: {
      ...existing?.metadata ?? {},
      whatsapp: descriptor.metadata ?? existing?.metadata?.whatsapp ?? null
    }
  };
}
function guessExtensionFromFileName(filename) {
  if (!filename) return null;
  const normalized = filename.split(".").pop();
  if (!normalized) return null;
  return normalized.trim().toLowerCase() || null;
}
function buildSignedMediaUrlsForMessage(message, ttlSeconds) {
  if (!message.media) {
    return message;
  }
  const media = message.media;
  const signedMedia = {
    ...media
  };
  if (media.storage?.originalPath) {
    signedMedia.url = buildSignedMediaPath(media.storage.originalPath, ttlSeconds);
  } else if (media.url) {
    const normalized = media.url.replace(/^\/+/, "");
    signedMedia.url = buildSignedMediaPath(normalized, ttlSeconds);
  }
  if (media.storage?.thumbnailPath) {
    signedMedia.thumbnailUrl = buildSignedMediaPath(media.storage.thumbnailPath, ttlSeconds);
  } else if (media.thumbnailUrl) {
    const normalized = media.thumbnailUrl.replace(/^\/+/, "");
    signedMedia.thumbnailUrl = buildSignedMediaPath(normalized, ttlSeconds);
  }
  if (media.storage?.previewPath) {
    signedMedia.previewUrl = buildSignedMediaPath(media.storage.previewPath, ttlSeconds);
  } else if (media.previewUrl) {
    const normalized = media.previewUrl.replace(/^\/+/, "");
    signedMedia.previewUrl = buildSignedMediaPath(normalized, ttlSeconds);
  }
  return {
    ...message,
    media: signedMedia
  };
}

// server/services/uploads.ts
import multer from "multer";
import path3 from "path";
var MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024;
var ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/vnd.rar"
]);
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".json",
  ".zip",
  ".rar",
  ".7z"
]);
var storage2 = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureMediaDirectories();
      const targetDir = resolveAbsoluteMediaPath(path3.join("outbound", "original"));
      cb(null, targetDir);
    } catch (error) {
      cb(error, "");
    }
  },
  filename: (_req, file, cb) => {
    const uniqueName = buildMediaFileName({
      originalFileName: `${Date.now()}-${file.originalname}`,
      prefix: "upload"
    });
    cb(null, uniqueName);
  }
});
var isAllowedMime = (mime) => {
  if (!mime) return false;
  const normalized = mime.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(normalized)) {
    return true;
  }
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};
var isAllowedExtension = (filename) => {
  if (!filename) return false;
  const ext = path3.extname(filename).toLowerCase();
  if (!ext) return false;
  return ALLOWED_EXTENSIONS.has(ext);
};
var upload = multer({
  storage: storage2,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedMime(file.mimetype) || isAllowedExtension(file.originalname)) {
      cb(null, true);
      return;
    }
    const error = new Error("Unsupported file type.");
    error.status = 400;
    cb(error);
  }
});

// server/routes.ts
var MAX_PINNED_CONVERSATIONS = 10;
function resolvePublicMediaUrl(req, mediaPath) {
  if (!mediaPath) {
    return mediaPath;
  }
  if (/^https?:\/\//i.test(mediaPath)) {
    return mediaPath;
  }
  const configuredBase = process.env.MEDIA_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  if (configuredBase) {
    const base = configuredBase.replace(/\/+$/, "");
    const path8 = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
    return `${base}${path8}`;
  }
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  if (!host) {
    return mediaPath;
  }
  const forwardedProto = req.get("x-forwarded-proto");
  let protocol = forwardedProto ? forwardedProto.split(",")[0]?.trim() : void 0;
  if (!protocol) {
    protocol = req.protocol;
  }
  if (!protocol) {
    protocol = "http";
  }
  protocol = protocol.replace(/:$/, "").toLowerCase();
  const path7 = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
  return `${protocol}://${host}${path7}`;
}
var getExtensionFromFilename = (filename) => {
  if (!filename) return null;
  const normalized = filename.split(".").pop();
  return normalized ? normalized.toLowerCase() : null;
};
function createPendingMediaDescriptor(descriptor) {
  if (!descriptor) {
    return null;
  }
  const inferredExtension = getExtensionFromMime(descriptor.mimeType) ?? getExtensionFromFilename(descriptor.filename) ?? null;
  return {
    origin: "whatsapp",
    type: descriptor.type ?? "unknown",
    status: "pending",
    provider: descriptor.provider ?? "meta",
    providerMediaId: descriptor.mediaId ?? null,
    mimeType: normalizeMimeType(descriptor.mimeType) ?? null,
    filename: descriptor.filename ?? null,
    extension: inferredExtension,
    sizeBytes: descriptor.sizeBytes ?? null,
    checksum: descriptor.sha256 ?? null,
    width: descriptor.width ?? null,
    height: descriptor.height ?? null,
    durationSeconds: descriptor.durationSeconds ?? null,
    pageCount: descriptor.pageCount ?? null,
    url: null,
    thumbnailUrl: null,
    previewUrl: null,
    placeholderUrl: null,
    storage: null,
    downloadAttempts: 0,
    downloadError: null,
    downloadedAt: null,
    thumbnailGeneratedAt: null,
    metadata: descriptor.metadata ? { whatsapp: descriptor.metadata } : null
  };
}
function extensionToMediaType(extension) {
  if (!extension) return "unknown";
  const ext = extension.replace(/^\./, "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg"].includes(ext)) {
    return "image";
  }
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "m4a", "ogg", "aac"].includes(ext)) {
    return "audio";
  }
  if ([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "zip",
    "rar",
    "7z"
  ].includes(ext)) {
    return "document";
  }
  return "unknown";
}
var normalizeMessageStatus = (status) => {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};
var summarizeText = (value, maxLength = 160) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3))}...`;
};
var shouldUpdateMessageStatus = (current, next) => {
  const currentNormalized = normalizeMessageStatus(current);
  const nextNormalized = normalizeMessageStatus(next);
  if (!nextNormalized) return false;
  if (!currentNormalized) return true;
  if (currentNormalized === nextNormalized) return false;
  if (currentNormalized === "failed") return false;
  if (nextNormalized === "read") return true;
  if (nextNormalized === "delivered") return currentNormalized !== "read";
  if (nextNormalized === "sent") return !["delivered", "read"].includes(currentNormalized);
  if (nextNormalized === "queued") return !["sent", "delivered", "read"].includes(currentNormalized);
  if (nextNormalized === "failed") return !["delivered", "read"].includes(currentNormalized);
  return true;
};
var parseMetaStatusUpdates = (payload) => {
  const updates = [];
  if (!payload?.entry) return updates;
  for (const entry of payload.entry) {
    if (!entry?.changes) continue;
    for (const change of entry.changes) {
      const statuses = change?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const status of statuses) {
        const rawId = (typeof status?.id === "string" && status.id.trim().length > 0 ? status.id : null) ?? (typeof status?.message_id === "string" && status.message_id.trim().length > 0 ? status.message_id : null) ?? (typeof status?.messageId === "string" && status.messageId.trim().length > 0 ? status.messageId : null);
        const providerMessageId = rawId ? rawId.trim() : null;
        const normalizedStatus = normalizeMessageStatus(status?.status);
        if (!providerMessageId || !normalizedStatus) continue;
        const timestampSeconds = Number(status?.timestamp);
        const timestamp2 = Number.isFinite(timestampSeconds) ? new Date(timestampSeconds * 1e3).toISOString() : void 0;
        updates.push({
          providerMessageId,
          status: normalizedStatus,
          timestamp: timestamp2,
          recipientId: typeof status?.recipient_id === "string" ? status.recipient_id : void 0,
          raw: status
        });
      }
    }
  }
  return updates;
};
var DEFAULT_TEMPLATE_LANGUAGE = "en_US";
var parseTemplateComponents = (input) => {
  if (!input) return void 0;
  if (Array.isArray(input)) {
    return input.filter(
      (component) => component && typeof component === "object"
    );
  }
  if (typeof input === "string") {
    try {
      const parsed2 = JSON.parse(input);
      if (Array.isArray(parsed2)) {
        return parsed2.filter(
          (component) => component && typeof component === "object"
        );
      }
    } catch {
      return void 0;
    }
  }
  return void 0;
};
var normalizeTemplateComponentType = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};
var countTemplatePlaceholders = (text2) => {
  let maxIndex = 0;
  const regex = /\{\{\s*(\d+)\s*\}\}/g;
  let match = null;
  while ((match = regex.exec(text2)) !== null) {
    const index = Number(match[1]);
    if (Number.isFinite(index) && index > maxIndex) {
      maxIndex = index;
    }
  }
  return maxIndex;
};
var normalizeTemplateButtonType = (value) => {
  const normalized = normalizeTemplateComponentType(value);
  if (!normalized) return null;
  return normalized.replace(/\s+/g, "_");
};
var sanitizeTemplateComponentsForSend = (components) => {
  if (!components || components.length === 0) return void 0;
  const sanitized = components.map((component) => {
    if (!component || typeof component !== "object") return null;
    const type = normalizeTemplateComponentType(component.type);
    if (!type) return null;
    const parameters = Array.isArray(component.parameters) ? component.parameters : null;
    if (!parameters || parameters.length === 0) {
      return null;
    }
    const next = {
      type,
      parameters
    };
    if (typeof component.sub_type === "string") {
      next.sub_type = component.sub_type;
    }
    if (component.index !== void 0) {
      next.index = String(component.index);
    }
    return next;
  }).filter((component) => Boolean(component));
  return sanitized.length > 0 ? sanitized : void 0;
};
var buildTemplateComponentsFromDefinition = (rawComponents, bodyParams, buttonParams) => {
  if (!rawComponents || rawComponents.length === 0) {
    return { components: applyBodyParamsToComponents(void 0, bodyParams) };
  }
  const definitionComponents = rawComponents;
  const sendComponents = [];
  let headerParamCount = 0;
  let bodyParamCount = 0;
  let hasCallPermissionRequest = false;
  let requiredUrlButtonParams = 0;
  let hasUnsupportedUrlPlaceholders = false;
  definitionComponents.forEach((component) => {
    const type = normalizeTemplateComponentType(component?.type);
    if (type === "header" && typeof component?.text === "string") {
      headerParamCount = countTemplatePlaceholders(component.text);
    }
    if (type === "body" && typeof component?.text === "string") {
      bodyParamCount = countTemplatePlaceholders(component.text);
    }
    if (type === "call_permission_request" || type === "call_permission") {
      hasCallPermissionRequest = true;
    }
    if (type !== "buttons") return;
    const buttons = Array.isArray(component?.buttons) ? component.buttons : [];
    buttons.forEach((button) => {
      const buttonType = normalizeTemplateButtonType(button?.type);
      if (buttonType !== "url") return;
      const url = typeof button?.url === "string" ? button.url : "";
      const placeholderCount = countTemplatePlaceholders(url);
      if (placeholderCount > 1) {
        hasUnsupportedUrlPlaceholders = true;
        return;
      }
      if (placeholderCount > 0) {
        requiredUrlButtonParams += 1;
      }
    });
  });
  if (hasUnsupportedUrlPlaceholders) {
    return { error: "Template URL buttons support only one parameter." };
  }
  if (headerParamCount > 0) {
    return { error: "Template header parameters are not supported yet." };
  }
  if (bodyParamCount > 0) {
    if (!bodyParams || bodyParams.length < bodyParamCount) {
      return {
        error: `Template requires ${bodyParamCount} body parameter${bodyParamCount === 1 ? "" : "s"}.`
      };
    }
    sendComponents.push({
      type: "body",
      parameters: buildBodyParameters(bodyParams)
    });
  }
  if (hasCallPermissionRequest) {
    sendComponents.push({
      type: "call_permission_request"
    });
  }
  if (requiredUrlButtonParams > 0) {
    if (!buttonParams || buttonParams.length < requiredUrlButtonParams) {
      return {
        error: `Template requires ${requiredUrlButtonParams} URL button parameter${requiredUrlButtonParams === 1 ? "" : "s"}.`
      };
    }
  }
  let urlParamIndex = 0;
  definitionComponents.forEach((component) => {
    const type = normalizeTemplateComponentType(component?.type);
    if (type !== "buttons") return;
    const buttons = Array.isArray(component?.buttons) ? component.buttons : [];
    buttons.forEach((button, index) => {
      const buttonType = normalizeTemplateButtonType(button?.type);
      if (!buttonType) return;
      if (buttonType === "quick_reply") {
        const payload = typeof button?.payload === "string" && button.payload.trim().length > 0 ? button.payload.trim() : typeof button?.text === "string" && button.text.trim().length > 0 ? button.text.trim() : `button_${index + 1}`;
        sendComponents.push({
          type: "button",
          sub_type: "quick_reply",
          index: String(index),
          parameters: [{ type: "payload", payload }]
        });
        return;
      }
      if (buttonType === "url") {
        const url = typeof button?.url === "string" ? button.url : "";
        if (countTemplatePlaceholders(url) > 0) {
          const paramValue = buttonParams?.[urlParamIndex];
          if (!paramValue) {
            return;
          }
          sendComponents.push({
            type: "button",
            sub_type: "url",
            index: String(index),
            parameters: [{ type: "text", text: paramValue }]
          });
          urlParamIndex += 1;
        }
      }
    });
  });
  return {
    components: sendComponents.length > 0 ? sendComponents : void 0
  };
};
var parseTemplateParamsValue = (value) => {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => String(item)).filter((item) => item.trim().length > 0);
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed2 = JSON.parse(trimmed);
      if (Array.isArray(parsed2)) {
        const normalized = parsed2.map((item) => String(item)).filter((item) => item.trim().length > 0);
        return normalized.length > 0 ? normalized : null;
      }
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
};
var resolveTemplateParams = (templateParams, body) => {
  const fromParams = parseTemplateParamsValue(templateParams);
  if (fromParams && fromParams.length > 0) {
    return fromParams;
  }
  return parseTemplateParamsValue(body);
};
var resolveTemplateButtonParams = (templateButtonParams) => {
  const parsed2 = parseTemplateParamsValue(templateButtonParams);
  return parsed2 && parsed2.length > 0 ? parsed2 : null;
};
var buildBodyParameters = (params) => params.map((text2) => ({ type: "text", text: text2 }));
var applyBodyParamsToComponents = (components, bodyParams) => {
  if (!bodyParams || bodyParams.length === 0) return components;
  const bodyComponent = { type: "body", parameters: buildBodyParameters(bodyParams) };
  if (!components || components.length === 0) return [bodyComponent];
  const next = components.map((component) => ({ ...component }));
  const bodyIndex = next.findIndex((component) => component.type === "body");
  if (bodyIndex === -1) {
    return [...next, bodyComponent];
  }
  next[bodyIndex] = {
    ...next[bodyIndex],
    parameters: buildBodyParameters(bodyParams)
  };
  return next;
};
var resolveTemplateMessage = (templateInput, bodyParams, buttonParams) => {
  const template = typeof templateInput === "string" ? { name: templateInput } : templateInput;
  const name = typeof template?.name === "string" && template.name.trim() ? template.name.trim() : process.env.META_TEMPLATE_NAME?.trim();
  if (!name) return { message: null };
  const templateLanguage = template?.language;
  const languageCode = typeof templateLanguage === "string" ? templateLanguage.trim() : templateLanguage && typeof templateLanguage === "object" && typeof templateLanguage.code === "string" ? templateLanguage.code.trim() : process.env.META_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE;
  const componentsFromRequest = parseTemplateComponents(template?.components);
  const componentsFromEnv = parseTemplateComponents(process.env.META_TEMPLATE_COMPONENTS);
  const rawComponents = componentsFromRequest ?? componentsFromEnv;
  const isSendPayload = Array.isArray(rawComponents) && rawComponents.some(
    (component) => Array.isArray(component?.parameters) || component?.sub_type
  );
  const { components, error } = isSendPayload ? {
    components: applyBodyParamsToComponents(
      sanitizeTemplateComponentsForSend(rawComponents) ?? void 0,
      bodyParams ?? null
    )
  } : buildTemplateComponentsFromDefinition(rawComponents, bodyParams ?? null, buttonParams ?? null);
  if (error) {
    return { message: null, error };
  }
  const language = templateLanguage && typeof templateLanguage === "object" ? { ...templateLanguage, code: languageCode } : { code: languageCode };
  return {
    message: {
      name,
      language,
      components
    }
  };
};
var countBodyParams = (components) => {
  if (!components) return 0;
  const bodyComponent = components.find((component) => {
    const type = normalizeTemplateComponentType(component?.type);
    return type === "body";
  });
  if (!bodyComponent) return 0;
  const params = bodyComponent?.parameters;
  if (Array.isArray(params)) {
    return params.length;
  }
  if (typeof bodyComponent.text === "string") {
    return countTemplatePlaceholders(bodyComponent.text);
  }
  return 0;
};
var normalizeTemplateLanguage = (value) => {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
};
var normalizeTemplateBodyParams = (value, components) => {
  const computed = countBodyParams(components);
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const floored = Math.floor(value);
    if (floored === 0 && computed > 0) {
      return computed;
    }
    return floored;
  }
  return computed;
};
var buildTemplateId = (name, language) => {
  const normalizedLanguage = language?.trim().toLowerCase() || "default";
  return `${name}::${normalizedLanguage}`;
};
var normalizeTemplateCatalogItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const record = item;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;
  const language = normalizeTemplateLanguage(record.language);
  const description = typeof record.description === "string" ? record.description.trim() : void 0;
  const category = typeof record.category === "string" ? record.category.trim() : void 0;
  const components = parseTemplateComponents(record.components) ?? void 0;
  const bodyParams = normalizeTemplateBodyParams(record.bodyParams, components);
  const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : buildTemplateId(name, language);
  return {
    id,
    name,
    language,
    description,
    category,
    components,
    bodyParams
  };
};
var loadTemplateCatalog = () => {
  const items = [];
  const raw = process.env.META_TEMPLATE_CATALOG;
  if (raw) {
    try {
      const parsed2 = JSON.parse(raw);
      if (Array.isArray(parsed2)) {
        parsed2.map((item) => normalizeTemplateCatalogItem(item)).filter((item) => Boolean(item)).forEach((item) => items.push(item));
      }
    } catch {
    }
  }
  if (items.length === 0) {
    const fallbackName = process.env.META_TEMPLATE_NAME?.trim();
    if (fallbackName) {
      const components = parseTemplateComponents(process.env.META_TEMPLATE_COMPONENTS);
      items.push({
        name: fallbackName,
        language: process.env.META_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE,
        components,
        bodyParams: countBodyParams(components)
      });
    }
  }
  return items;
};
var TEMPLATE_CATALOG_SETTING_KEY = "templateCatalog";
var getStoredTemplateCatalog = async () => {
  const stored = await storage.getAppSetting(TEMPLATE_CATALOG_SETTING_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.map((item) => normalizeTemplateCatalogItem(item)).filter((item) => Boolean(item));
};
var setStoredTemplateCatalog = async (items) => {
  await storage.setAppSetting(TEMPLATE_CATALOG_SETTING_KEY, items);
};
async function createMetaProvider() {
  const instance = await storage.getDefaultWhatsappInstance();
  if (instance) {
    if (instance.isActive === false) {
      throw new Error("Default WhatsApp instance is disabled.");
    }
    if (!instance.accessToken || !instance.phoneNumberId) {
      throw new Error("Default WhatsApp instance is missing required credentials.");
    }
    const provider2 = new MetaProvider(
      instance.accessToken,
      instance.phoneNumberId,
      instance.webhookVerifyToken ?? void 0,
      instance.appSecret ?? void 0,
      void 0
    );
    return { provider: provider2, instance };
  }
  const provider = new MetaProvider(
    process.env.META_TOKEN,
    process.env.META_PHONE_NUMBER_ID,
    process.env.META_VERIFY_TOKEN,
    process.env.META_APP_SECRET,
    process.env.META_GRAPH_VERSION
  );
  return { provider, instance: null };
}
var resolveMetaWabaIdFromAccounts = async (provider, phoneNumberId) => {
  const token = provider.getAccessToken();
  if (!token) {
    throw new Error("Meta access token is not configured.");
  }
  const normalizedPhoneNumberId = phoneNumberId.trim();
  const graphVersion = provider.getGraphVersion();
  const headers = { Authorization: `Bearer ${token}` };
  let nextUrl = `https://graph.facebook.com/${graphVersion}/me/whatsapp_business_accounts?fields=id,name&limit=50`;
  let pageCount = 0;
  const accounts = [];
  while (nextUrl && pageCount < 5) {
    const response = await fetch(nextUrl, { method: "GET", headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to list WhatsApp accounts (${response.status}): ${body}`);
    }
    const payload = await response.json();
    if (Array.isArray(payload?.data)) {
      payload.data.map((entry) => typeof entry?.id === "string" ? { id: entry.id } : null).filter((entry) => Boolean(entry)).forEach((entry) => accounts.push(entry));
    }
    nextUrl = typeof payload?.paging?.next === "string" ? payload.paging.next : null;
    pageCount += 1;
  }
  for (const account of accounts) {
    let phoneUrl = `https://graph.facebook.com/${graphVersion}/${account.id}/phone_numbers?fields=id&limit=50`;
    let phonePageCount = 0;
    while (phoneUrl && phonePageCount < 5) {
      const response = await fetch(phoneUrl, { method: "GET", headers });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to list phone numbers (${response.status}): ${body}`);
      }
      const payload = await response.json();
      const matches = Array.isArray(payload?.data) ? payload.data.some((entry) => String(entry?.id) === normalizedPhoneNumberId) : false;
      if (matches) {
        return account.id;
      }
      phoneUrl = typeof payload?.paging?.next === "string" ? payload.paging.next : null;
      phonePageCount += 1;
    }
  }
  return null;
};
var resolveMetaWabaId = async (provider, phoneNumberId) => {
  const override = process.env.META_WABA_ID?.trim();
  if (override) {
    return override;
  }
  const token = provider.getAccessToken();
  if (!token) {
    throw new Error("Meta access token is not configured.");
  }
  let directError = null;
  try {
    const response = await fetch(
      `https://graph.facebook.com/${provider.getGraphVersion()}/${phoneNumberId}?fields=whatsapp_business_account`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      const wabaId = data?.whatsapp_business_account?.id ?? data?.whatsapp_business_account_id ?? data?.waba_id;
      if (wabaId && typeof wabaId === "string") {
        return wabaId;
      }
    } else {
      directError = await response.text();
    }
  } catch (error) {
    directError = error?.message ?? String(error);
  }
  const fallbackId = await resolveMetaWabaIdFromAccounts(provider, phoneNumberId);
  if (fallbackId) {
    return fallbackId;
  }
  if (directError) {
    throw new Error(`Failed to resolve WABA ID: ${directError}`);
  }
  throw new Error("Unable to resolve WhatsApp Business Account ID. Set META_WABA_ID to override.");
};
var normalizeRemoteTemplateItem = (item) => {
  const normalized = normalizeTemplateCatalogItem(item);
  if (!normalized) return null;
  const status = typeof item?.status === "string" ? item.status.trim() : void 0;
  return { ...normalized, status };
};
var fetchMetaTemplates = async (provider, wabaId) => {
  const token = provider.getAccessToken();
  if (!token) {
    throw new Error("Meta access token is not configured.");
  }
  const items = [];
  let nextUrl = `https://graph.facebook.com/${provider.getGraphVersion()}/${wabaId}/message_templates?fields=name,language,category,components,status`;
  let pageCount = 0;
  while (nextUrl && pageCount < 5) {
    const response = await fetch(nextUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch templates (${response.status}): ${body}`);
    }
    const payload = await response.json();
    if (Array.isArray(payload?.data)) {
      payload.data.map((entry) => normalizeRemoteTemplateItem(entry)).filter((entry) => Boolean(entry)).forEach((entry) => items.push(entry));
    }
    nextUrl = typeof payload?.paging?.next === "string" ? payload.paging.next : null;
    pageCount += 1;
  }
  return items;
};
var wsClients = /* @__PURE__ */ new Set();
function broadcastMessage(event, data) {
  const message = JSON.stringify({ event, data });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
function toInstanceResponse(instance) {
  if (!instance) {
    return null;
  }
  return {
    id: instance.id,
    name: instance.name,
    phoneNumberId: instance.phoneNumberId,
    webhookBehavior: instance.webhookBehavior ?? "auto",
    isActive: instance.isActive ?? true,
    source: instance.source ?? "custom",
    updatedAt: instance.updatedAt ?? null,
    accessTokenConfigured: !!instance.accessToken,
    webhookVerifyTokenConfigured: !!instance.webhookVerifyToken,
    appSecretConfigured: !!instance.appSecret,
    hasAppSecret: !!instance.appSecret,
    hasVerifyToken: !!instance.webhookVerifyToken
  };
}
async function registerRoutes(app2, requireAdmin2) {
  ensureMediaDirectories();
  const normalizeWebhookPath = (inputPath) => {
    const fallback = "/webhook/meta";
    if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
      return fallback;
    }
    let normalized = inputPath.trim();
    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }
    normalized = normalized.replace(/\/{2,}/g, "/");
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.replace(/\/+$/, "");
    }
    if (!normalized.startsWith("/webhook")) {
      normalized = `/webhook${normalized === "/" ? "" : normalized}`;
    }
    return normalized || fallback;
  };
  const normalizeForComparison = (value) => {
    if (!value) return "/";
    let normalized = value.startsWith("/") ? value : `/${value}`;
    normalized = normalized.replace(/\/{2,}/g, "/");
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.replace(/\/+$/, "");
    }
    return normalized || "/";
  };
  const metaWebhookSettings = await storage.getMetaWebhookSettings();
  let metaWebhookPath = normalizeWebhookPath(metaWebhookSettings.path);
  const pathsMatchMetaWebhook = (pathToCheck) => normalizeForComparison(pathToCheck) === normalizeForComparison(metaWebhookPath);
  const updateMetaWebhookPath = (nextPath) => {
    metaWebhookPath = normalizeWebhookPath(nextPath);
  };
  app2.get("/api/admin/api-controls", requireAdmin2, async (req, res) => {
    const v = await storage.getAppSetting("apiControls");
    res.json(v || { testWebhookEnabled: true });
  });
  app2.post("/api/admin/api-controls", requireAdmin2, async (req, res) => {
    const { testWebhookEnabled } = req.body;
    const current = await storage.getAppSetting("apiControls") || { testWebhookEnabled: true };
    if (typeof testWebhookEnabled === "boolean") current.testWebhookEnabled = testWebhookEnabled;
    await storage.setAppSetting("apiControls", current);
    res.json(current);
  });
  app2.get("/api/admin/webhook-config", requireAdmin2, async (_req, res) => {
    try {
      const config = await storage.getMetaWebhookSettings();
      res.json({ config });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/webhook-config", requireAdmin2, async (req, res) => {
    try {
      const requestedPath = typeof req.body?.path === "string" ? req.body.path : "";
      if (!requestedPath.trim()) {
        return res.status(400).json({ error: "Path is required." });
      }
      const sanitizedPath = normalizeWebhookPath(requestedPath);
      await storage.setMetaWebhookSettings({ path: sanitizedPath });
      updateMetaWebhookPath(sanitizedPath);
      const updated = await storage.getMetaWebhookSettings();
      res.json({ config: updated });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/admin/whatsapp/default-instance", requireAdmin2, async (_req, res) => {
    try {
      const instance = await storage.getDefaultWhatsappInstance();
      res.json({ instance: toInstanceResponse(instance) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/admin/whatsapp/default-instance", requireAdmin2, async (req, res) => {
    try {
      const current = await storage.getDefaultWhatsappInstance();
      const {
        name,
        phoneNumberId,
        accessToken,
        webhookVerifyToken,
        appSecret,
        webhookBehavior,
        isActive
      } = req.body;
      const trimmedName = typeof name === "string" ? name.trim() : void 0;
      const trimmedPhoneNumberId = typeof phoneNumberId === "string" ? phoneNumberId.trim() : void 0;
      const trimmedAccessToken = typeof accessToken === "string" ? accessToken.trim() : void 0;
      const resolvedName = (trimmedName && trimmedName.length > 0 ? trimmedName : current?.name) || "Default WhatsApp Instance";
      const resolvedPhoneNumberId = (trimmedPhoneNumberId && trimmedPhoneNumberId.length > 0 ? trimmedPhoneNumberId : current?.phoneNumberId) || "";
      if (!resolvedPhoneNumberId) {
        return res.status(400).json({ error: "Phone Number ID is required." });
      }
      if (trimmedAccessToken === "") {
        return res.status(400).json({ error: "Access token cannot be empty." });
      }
      const resolvedAccessToken = trimmedAccessToken && trimmedAccessToken.length > 0 ? trimmedAccessToken : current?.accessToken || "";
      if (!resolvedAccessToken) {
        return res.status(400).json({ error: "Access token is required." });
      }
      let resolvedVerifyToken = current?.webhookVerifyToken ?? null;
      if (webhookVerifyToken !== void 0) {
        if (webhookVerifyToken === null) {
          resolvedVerifyToken = null;
        } else if (typeof webhookVerifyToken === "string") {
          const trimmed = webhookVerifyToken.trim();
          resolvedVerifyToken = trimmed.length > 0 ? trimmed : null;
        }
      }
      let resolvedAppSecret = current?.appSecret ?? null;
      if (appSecret !== void 0) {
        if (appSecret === null) {
          resolvedAppSecret = null;
        } else if (typeof appSecret === "string") {
          const trimmed = appSecret.trim();
          resolvedAppSecret = trimmed.length > 0 ? trimmed : null;
        }
      }
      const allowedBehaviors = ["auto", "accept", "reject"];
      const resolvedBehavior = typeof webhookBehavior === "string" && allowedBehaviors.includes(webhookBehavior) ? webhookBehavior : current?.webhookBehavior || "auto";
      const resolvedIsActive = typeof isActive === "boolean" ? isActive : current?.isActive ?? true;
      await storage.setDefaultWhatsappInstance({
        id: "default",
        name: resolvedName,
        phoneNumberId: resolvedPhoneNumberId,
        accessToken: resolvedAccessToken,
        webhookVerifyToken: resolvedVerifyToken,
        appSecret: resolvedAppSecret,
        webhookBehavior: resolvedBehavior,
        isActive: resolvedIsActive
      });
      const updated = await storage.getDefaultWhatsappInstance();
      res.json({ instance: toInstanceResponse(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to update default WhatsApp instance");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/webhooks/clear", requireAdmin2, async (_req, res) => {
    await storage.deleteWebhookEvents();
    res.json({ ok: true });
  });
  app2.get("/api/webhooks/events", requireAdmin2, async (req, res) => {
    const { webhookId } = req.query;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : void 0;
    const items = await storage.getWebhookEvents(
      limit && Number.isFinite(limit) ? limit : void 0,
      typeof webhookId === "string" && webhookId.trim().length > 0 ? { webhookId: webhookId.trim() } : void 0
    );
    res.json({ items });
  });
  app2.delete("/api/webhooks/events/:id", requireAdmin2, async (req, res) => {
    const { id } = req.params;
    await storage.deleteWebhookEventById(id);
    res.json({ ok: true });
  });
  app2.delete("/api/webhooks/events", requireAdmin2, async (req, res) => {
    await storage.deleteWebhookEvents();
    res.json({ ok: true });
  });
  app2.get("/api/admin/users", requireAdmin2, async (_req, res) => {
    const items = await storage.getAllUsers();
    res.json(items.map(({ password, ...u }) => u));
  });
  app2.get("/api/admin/webhooks", requireAdmin2, async (req, res) => {
    const hooks = await storage.getAllWebhooks();
    res.json(hooks);
  });
  app2.get("/api/admin/ready-messages", requireAdmin2, async (_req, res) => {
    try {
      const items = await storage.getReadyMessages(false);
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/ready-messages", requireAdmin2, async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
      const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : true;
      if (!name) {
        return res.status(400).json({ error: "Name is required." });
      }
      if (!body) {
        return res.status(400).json({ error: "Message body is required." });
      }
      const item = await storage.createReadyMessage({
        name,
        body,
        isActive,
        createdByUserId: req.user?.id ?? null
      });
      res.status(201).json({ item });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/admin/ready-messages/:id", requireAdmin2, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = {};
      if (typeof req.body?.name === "string") {
        const trimmedName = req.body.name.trim();
        if (!trimmedName) {
          return res.status(400).json({ error: "Name cannot be empty." });
        }
        updates.name = trimmedName;
      }
      if (typeof req.body?.body === "string") {
        const trimmedBody = req.body.body.trim();
        if (!trimmedBody) {
          return res.status(400).json({ error: "Message body cannot be empty." });
        }
        updates.body = trimmedBody;
      }
      if (typeof req.body?.isActive === "boolean") {
        updates.isActive = req.body.isActive;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No updates provided." });
      }
      const item = await storage.updateReadyMessage(id, updates);
      if (!item) {
        return res.status(404).json({ error: "Ready message not found." });
      }
      res.json({ item });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/ready-messages/:id", requireAdmin2, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReadyMessage(id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/templates", requireAdmin2, async (_req, res) => {
    try {
      const items = await getStoredTemplateCatalog();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/admin/templates/remote", requireAdmin2, async (_req, res) => {
    try {
      const { provider, instance } = await createMetaProvider();
      const phoneNumberId = instance?.phoneNumberId ?? process.env.META_PHONE_NUMBER_ID;
      if (!phoneNumberId) {
        return res.status(400).json({ error: "Phone Number ID is required." });
      }
      const wabaId = await resolveMetaWabaId(provider, phoneNumberId);
      const remoteItems = await fetchMetaTemplates(provider, wabaId);
      const storedItems = await getStoredTemplateCatalog();
      const storedIds = new Set(
        storedItems.map((item) => item.id ?? buildTemplateId(item.name, item.language))
      );
      const items = remoteItems.filter((item) => {
        const id = item.id ?? buildTemplateId(item.name, item.language);
        return !storedIds.has(id);
      });
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/admin/templates", requireAdmin2, async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        return res.status(400).json({ error: "Template name is required." });
      }
      const language = normalizeTemplateLanguage(req.body?.language);
      const description = typeof req.body?.description === "string" ? req.body.description.trim() : void 0;
      const category = typeof req.body?.category === "string" ? req.body.category.trim() : void 0;
      const components = parseTemplateComponents(req.body?.components);
      const bodyParams = req.body?.bodyParams;
      const normalized = normalizeTemplateCatalogItem({
        name,
        language,
        description,
        category,
        components,
        bodyParams
      });
      if (!normalized) {
        return res.status(400).json({ error: "Invalid template payload." });
      }
      const items = await getStoredTemplateCatalog();
      const exists = items.some((item) => item.id === normalized.id);
      if (exists) {
        return res.status(400).json({ error: "Template already exists." });
      }
      const next = [...items, normalized];
      await setStoredTemplateCatalog(next);
      res.status(201).json({ item: normalized });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/admin/templates/:id", requireAdmin2, async (req, res) => {
    try {
      const { id } = req.params;
      const items = await getStoredTemplateCatalog();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Template not found." });
      }
      const current = items[index];
      const updates = {};
      if (typeof req.body?.name === "string") {
        const trimmed = req.body.name.trim();
        if (!trimmed) {
          return res.status(400).json({ error: "Template name cannot be empty." });
        }
        updates.name = trimmed;
      }
      if (req.body?.language !== void 0) {
        const normalizedLanguage = normalizeTemplateLanguage(req.body.language);
        updates.language = normalizedLanguage;
      }
      if (typeof req.body?.description === "string") {
        updates.description = req.body.description.trim() || void 0;
      }
      if (typeof req.body?.category === "string") {
        updates.category = req.body.category.trim() || void 0;
      }
      if (req.body?.components !== void 0) {
        updates.components = parseTemplateComponents(req.body.components) ?? void 0;
      }
      if (req.body?.bodyParams !== void 0) {
        updates.bodyParams = req.body.bodyParams;
      }
      const merged = {
        ...current,
        ...updates
      };
      const normalized = normalizeTemplateCatalogItem(merged);
      if (!normalized) {
        return res.status(400).json({ error: "Invalid template updates." });
      }
      const nextId = normalized.id ?? buildTemplateId(normalized.name, normalized.language);
      if (nextId !== id && items.some((item) => item.id === nextId)) {
        return res.status(400).json({ error: "Template with this name and language already exists." });
      }
      const next = [...items];
      next[index] = { ...normalized, id: nextId };
      await setStoredTemplateCatalog(next);
      res.json({ item: next[index] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/admin/templates/:id", requireAdmin2, async (req, res) => {
    try {
      const { id } = req.params;
      const items = await getStoredTemplateCatalog();
      const next = items.filter((item) => item.id !== id);
      if (next.length === items.length) {
        return res.status(404).json({ error: "Template not found." });
      }
      await setStoredTemplateCatalog(next);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/admin/users/:id", requireAdmin2, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const user = await storage.adminUpdateUser(id, updates);
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  app2.patch("/api/admin/webhooks/:id", requireAdmin2, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const hook = await storage.adminUpdateWebhook(id, updates);
    res.json(hook);
  });
  app2.get("/media/*", async (req, res) => {
    const validation = verifySignedUrl(req);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.message });
    }
    const relativePath = req.params[0];
    if (!relativePath) {
      return res.status(404).json({ error: "Not found" });
    }
    try {
      const absolutePath = resolveAbsoluteMediaPath(relativePath);
      await fs2.access(absolutePath);
      const extension = path4.extname(absolutePath).replace(/^\./, "");
      const mime = getMimeTypeFromExtension(extension) ?? getMimeType(extension);
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("Content-Type", mime ?? "application/octet-stream");
      res.setHeader("Content-Disposition", "inline");
      res.sendFile(absolutePath, (error) => {
        if (error) {
          if (!res.headersSent) {
            const status = error?.code === "ENOENT" ? 404 : 500;
            res.status(status).end();
          }
        }
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return res.status(404).json({ error: "Not found" });
      }
      logger.error({ err: error, relativePath }, "Failed to serve media file");
      return res.status(500).json({ error: "Failed to serve media" });
    }
  });
  app2.get("/api/conversations/pins", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const pins = await storage.getPinnedConversationsForUser(req.user.id);
      res.json({ pins });
    } catch (error) {
      logger.error({ err: error }, "failed to get pinned conversations");
      res.status(500).json({ error: error?.message ?? "Failed to load pinned conversations" });
    }
  });
  app2.post("/api/conversations/:id/pin", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const conversationId = req.params.id;
      if (!conversationId) {
        return res.status(400).json({ error: "Conversation id is required." });
      }
      const bodyPinned = req.body?.pinned;
      if (typeof bodyPinned !== "boolean") {
        return res.status(400).json({ error: "pinned must be a boolean." });
      }
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found." });
      }
      const userId = req.user.id;
      if (bodyPinned) {
        const alreadyPinned = await storage.isConversationPinned(userId, conversationId);
        if (!alreadyPinned) {
          const currentCount = await storage.countPinnedConversations(userId);
          if (currentCount >= MAX_PINNED_CONVERSATIONS) {
            return res.status(400).json({ error: "You can only pin up to 10 chats." });
          }
        }
        await storage.pinConversation(userId, conversationId);
      } else {
        await storage.unpinConversation(userId, conversationId);
      }
      const pins = await storage.getPinnedConversationsForUser(userId);
      res.json({ pinned: bodyPinned, pins });
    } catch (error) {
      logger.error({ err: error }, "failed to toggle pin state");
      res.status(500).json({ error: error?.message ?? "Failed to update pin state" });
    }
  });
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const relativePath = toRelativeMediaPath([
        "outbound",
        "original",
        req.file.filename
      ]);
      const unsignedPath = toUrlPath(relativePath);
      const signedPath = buildSignedMediaPath(relativePath);
      const publicUrl = resolvePublicMediaUrl(req, signedPath);
      let expiresAt;
      try {
        const signedUrl = new URL(signedPath, "https://placeholder.local");
        const expires = signedUrl.searchParams.get("expires");
        if (expires) {
          expiresAt = Number(expires);
        }
      } catch {
        expiresAt = void 0;
      }
      res.json({
        url: signedPath,
        publicUrl,
        relativePath,
        unsignedUrl: unsignedPath,
        expiresAt
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/conversations", async (req, res) => {
    try {
      const rawPage = typeof req.query.page === "string" ? req.query.page : "";
      const rawPageSize = typeof req.query.page_size === "string" ? req.query.page_size : "";
      const page = Number.isFinite(Number(rawPage)) ? parseInt(rawPage, 10) : 1;
      const pageSize = rawPageSize === "all" ? 0 : Number.isFinite(Number(rawPageSize)) ? parseInt(rawPageSize, 10) : 20;
      const archived = req.query.archived === "true";
      const result = await storage.getConversations(page, pageSize, archived);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/conversations/:id/archive", async (req, res) => {
    try {
      const { id } = req.params;
      const { archived } = req.body;
      if (typeof archived !== "boolean") {
        return res.status(400).json({ error: "archived must be a boolean" });
      }
      const conversation = await storage.toggleConversationArchive(id, archived);
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.page_size) || 50;
      const result = await storage.getMessages(id, page, pageSize);
      await storage.clearConversationUnread(id);
      const signedItems = result.items.map((item) => buildSignedMediaUrlsForMessage(item));
      res.json({ ...result, items: signedItems });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/conversations/:id", requireAdmin2, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Conversation id is required" });
      }
      await storage.deleteConversation(id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    try {
      const { phone, displayName } = req.body;
      const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
      if (!trimmedPhone) {
        return res.status(400).json({ error: "Phone number is required." });
      }
      let conversation = await storage.getConversationByPhone(trimmedPhone);
      let created = false;
      let unarchived = false;
      if (!conversation) {
        conversation = await storage.createConversation({
          phone: trimmedPhone,
          displayName: typeof displayName === "string" ? displayName.trim() || null : null,
          createdByUserId: req.user?.id ?? null
        });
        created = true;
      } else if (conversation.archived) {
        conversation = await storage.toggleConversationArchive(conversation.id, false);
        unarchived = true;
      }
      res.json({ conversation, created, unarchived });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/webhooks", requireAdmin2, async (req, res) => {
    const hooks = await storage.getAllWebhooks();
    res.json(hooks);
  });
  app2.post("/api/webhooks", requireAdmin2, async (req, res) => {
    const { name, url, verifyToken, isActive } = req.body;
    const hook = await storage.createWebhook({ name, url, verifyToken, isActive });
    res.json(hook);
  });
  app2.put("/api/webhooks/:id", requireAdmin2, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const hook = await storage.updateWebhook(id, updates);
    res.json(hook);
  });
  app2.delete("/api/webhooks/:id", requireAdmin2, async (req, res) => {
    const { id } = req.params;
    await storage.deleteWebhook(id);
    res.json({ ok: true });
  });
  app2.post("/api/activity/ping", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).send("Not authenticated");
    }
    try {
      await storage.recordUserActivity(req.user.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/statistics", async (req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/templates", async (_req, res) => {
    try {
      const stored = await getStoredTemplateCatalog();
      const items = stored.length > 0 ? stored : loadTemplateCatalog();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/ready-messages", async (_req, res) => {
    try {
      const items = await storage.getReadyMessages(true);
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/message/send", async (req, res) => {
    try {
      const {
        to,
        body,
        media_url,
        conversationId,
        replyToMessageId,
        messageType,
        template,
        templateParams,
        templateButtonParams
      } = req.body;
      if (!conversationId && !to) {
        return res.status(400).json({ error: "conversationId or to is required." });
      }
      const wantsTemplate = messageType === "template" || Boolean(template);
      if (!wantsTemplate && !body && !media_url) {
        return res.status(400).json({ error: "body or media_url is required." });
      }
      if (wantsTemplate && media_url) {
        return res.status(400).json({ error: "template messages do not support media_url." });
      }
      let conversation = null;
      if (conversationId) {
        conversation = await storage.getConversationById(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found." });
        }
      }
      if (!conversation) {
        if (!to) {
          return res.status(400).json({ error: "Recipient phone number is required." });
        }
        conversation = await storage.getConversationByPhone(to);
        if (!conversation) {
          conversation = await storage.createConversation({
            phone: to,
            createdByUserId: req.user?.id ?? null
          });
        }
      }
      const recipientPhone = conversation.phone;
      const resolvedTemplateParams = wantsTemplate ? resolveTemplateParams(templateParams, body ?? null) : null;
      const resolvedTemplateButtonParams = wantsTemplate ? resolveTemplateButtonParams(templateButtonParams) : null;
      const templateResolution = wantsTemplate ? resolveTemplateMessage(template, resolvedTemplateParams, resolvedTemplateButtonParams) : { message: null };
      const templateMessage = templateResolution.message;
      if (wantsTemplate && templateResolution.error) {
        return res.status(400).json({ error: templateResolution.error });
      }
      if (wantsTemplate && !templateMessage) {
        return res.status(400).json({
          error: "Template name is required. Set META_TEMPLATE_NAME or pass template.name in the request."
        });
      }
      let replyTarget = null;
      let replyToProviderMessageId = null;
      if (replyToMessageId) {
        const messageTarget = await storage.getMessageById(replyToMessageId);
        if (!messageTarget) {
          return res.status(400).json({ error: "Reply target not found." });
        }
        if (messageTarget.conversationId !== conversation.id) {
          return res.status(400).json({ error: "Reply target belongs to a different conversation." });
        }
        replyTarget = messageTarget;
        replyToProviderMessageId = messageTarget.providerMessageId ?? null;
      }
      logger.debug(
        {
          event: "message_send_attempt",
          conversationId: conversation.id,
          replyToMessageId: replyToMessageId ?? null,
          hasMedia: Boolean(media_url),
          messageType: wantsTemplate ? "template" : "text"
        },
        "Message send attempt"
      );
      const relativeMediaPath = media_url ? extractRelativeMediaPath(media_url) : null;
      const inferredFilename = relativeMediaPath ? path4.basename(relativeMediaPath) : media_url ? path4.basename(media_url.split("?")[0].split("#")[0]) : null;
      const extension = getExtensionFromFilename(inferredFilename);
      const outboundMediaType = extensionToMediaType(extension);
      const inferredMime = (extension ? getMimeTypeFromExtension(extension) : null) ?? (extension ? getMimeType(extension) : null);
      const outboundMedia = media_url ? {
        origin: "upload",
        type: outboundMediaType,
        status: "ready",
        provider: "local",
        providerMediaId: null,
        mimeType: inferredMime,
        filename: inferredFilename,
        extension,
        sizeBytes: null,
        checksum: null,
        width: null,
        height: null,
        durationSeconds: null,
        pageCount: null,
        url: relativeMediaPath ? toUrlPath(relativeMediaPath) : media_url.split("?")[0],
        thumbnailUrl: null,
        previewUrl: null,
        placeholderUrl: null,
        storage: relativeMediaPath ? {
          originalPath: relativeMediaPath,
          thumbnailPath: null,
          previewPath: null
        } : null,
        downloadAttempts: 0,
        downloadError: null,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        thumbnailGeneratedAt: null,
        metadata: {
          origin: "upload"
        }
      } : null;
      const { provider } = await createMetaProvider();
      let providerMessageId = null;
      let status = "sent";
      let providerErrorMessage = null;
      const providerMediaPath = relativeMediaPath ? buildSignedMediaPath(relativeMediaPath) : media_url ?? void 0;
      const storedBody = wantsTemplate ? body && body.trim().length > 0 ? body.trim() : resolvedTemplateParams && resolvedTemplateParams.length > 0 ? `Template: ${templateMessage?.name ?? "unknown"} (${resolvedTemplateParams.join(", ")})` : `Template: ${templateMessage?.name ?? "unknown"}` : body || null;
      const providerOptions = replyToProviderMessageId ? { replyToMessageId: replyToProviderMessageId } : void 0;
      try {
        if (wantsTemplate && templateMessage) {
          const providerResp = await provider.sendTemplate(recipientPhone, templateMessage, providerOptions);
          providerMessageId = providerResp.id || null;
        } else {
          const providerMediaUrl = providerMediaPath ? resolvePublicMediaUrl(req, providerMediaPath) : void 0;
          const providerResp = await provider.send(
            recipientPhone,
            body ?? void 0,
            providerMediaUrl,
            providerOptions
          );
          providerMessageId = providerResp.id || null;
        }
      } catch (providerError) {
        providerErrorMessage = providerError?.message ?? "Failed to send via provider.";
        logger.debug(
          { event: "message_provider_failed", error: providerErrorMessage },
          "Failed to send via provider, saving locally"
        );
        status = "failed";
      }
      const message = await storage.createMessage({
        conversationId: conversation.id,
        direction: "outbound",
        body: storedBody,
        media: outboundMedia,
        providerMessageId,
        status,
        raw: wantsTemplate ? {
          template: templateMessage,
          params: resolvedTemplateParams,
          buttonParams: resolvedTemplateButtonParams
        } : void 0,
        replyToMessageId: replyToMessageId ?? null,
        sentByUserId: req.user?.id ?? null
      });
      const outgoingLogPayload = {
        event: status === "failed" ? "message_outgoing_failed" : "message_outgoing",
        conversationId: conversation.id,
        messageId: message.id,
        to: recipientPhone,
        status,
        messageType: wantsTemplate ? "template" : "text",
        templateName: wantsTemplate ? templateMessage?.name : void 0,
        textPreview: wantsTemplate ? void 0 : summarizeText(body ?? null),
        hasMedia: Boolean(media_url),
        error: providerErrorMessage ?? void 0
      };
      if (status === "failed") {
        logger.warn(outgoingLogPayload, "Message failed");
      } else {
        logger.info(outgoingLogPayload, "Message sent");
      }
      await storage.updateConversationLastAt(conversation.id);
      const messageWithReply = await storage.getMessageWithReplyById(message.id);
      const payload = buildSignedMediaUrlsForMessage(messageWithReply ?? message);
      res.json({ ok: true, message: payload });
      broadcastMessage("message_outgoing", payload);
      logger.debug(
        {
          event: "message_sent_reply",
          messageId: message.id,
          conversationId: conversation.id,
          replyToMessageId: replyToMessageId ?? null,
          validReply: Boolean(replyTarget)
        },
        "Message reply info"
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/messages/:id", requireAdmin2, async (_req, res) => {
    res.status(403).json({ error: "Message deletion is disabled." });
  });
  const handleMetaWebhookVerification = async (req, res) => {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = req.query["hub.verify_token"];
    const isVerificationAttempt = typeof mode === "string" && mode.toLowerCase() === "subscribe" && typeof challenge === "string";
    if (!isVerificationAttempt) {
      return res.status(200).send(
        "Meta webhook endpoint is online. To verify, Meta will call this URL with hub.mode=subscribe, hub.verify_token, and hub.challenge query parameters."
      );
    }
    try {
      const { provider, instance } = await createMetaProvider();
      const expectedToken = instance?.webhookVerifyToken ?? process.env.META_VERIFY_TOKEN ?? "";
      if (!expectedToken) {
        logger.warn("Webhook verification attempted but no verify token is configured.");
        await storage.logWebhookEvent({
          headers: req.headers,
          query: req.query,
          body: null,
          response: { status: 500, body: "Missing verify token configuration" }
        });
        return res.status(500).send(
          "Verify token is not configured. Set META_VERIFY_TOKEN or update the Default WhatsApp Instance."
        );
      }
      if (verifyToken !== expectedToken) {
        logger.warn(
          `Webhook verification failed: provided token "${verifyToken}" does not match configured token.`
        );
        await storage.logWebhookEvent({
          headers: req.headers,
          query: req.query,
          body: null,
          response: { status: 403, body: "Forbidden" }
        });
        return res.status(403).send("Forbidden");
      }
      await storage.logWebhookEvent({
        headers: req.headers,
        query: req.query,
        body: null,
        response: { status: 200, body: String(challenge) }
      });
      res.status(200).send(challenge);
    } catch (error) {
      logger.error({ err: error }, "Webhook verification error");
      await storage.logWebhookEvent({
        headers: req.headers,
        query: req.query,
        body: null,
        response: { status: 500, body: error.message }
      });
      res.status(500).send("Error");
    }
  };
  const handleMetaWebhookEvent = async (req, res) => {
    const startTime = Date.now();
    logger.debug(
      { event: "meta_webhook_received", path: req.path },
      "Meta webhook received"
    );
    try {
      const { provider, instance } = await createMetaProvider();
      const hasAppSecret = !!(instance?.appSecret || process.env.META_APP_SECRET);
      if (hasAppSecret) {
        logger.debug(
          { event: "meta_webhook_signature_check" },
          "Verifying webhook signature"
        );
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signatureValid = provider.verifyWebhookSignature(req, rawBody);
        if (!signatureValid) {
          logger.warn(
            { event: "meta_webhook_signature_invalid" },
            "Invalid webhook signature"
          );
          await storage.logWebhookEvent({
            headers: req.headers,
            query: req.query,
            body: req.body,
            response: { status: 401, body: "Invalid signature" }
          });
          return res.status(401).send("Invalid signature");
        }
        logger.debug(
          { event: "meta_webhook_signature_valid" },
          "Webhook signature verified"
        );
      } else {
        logger.debug(
          { event: "meta_webhook_signature_skipped" },
          "No app secret configured, skipping signature verification"
        );
      }
      const events = provider.parseIncoming(req.body);
      const statusUpdates = parseMetaStatusUpdates(req.body);
      if (events.length === 0 && statusUpdates.length === 0) {
        logger.debug(
          { event: "meta_webhook_no_events" },
          "No message events in payload"
        );
        await storage.logWebhookEvent({
          headers: req.headers,
          query: req.query,
          body: req.body,
          response: { status: 200, body: "ok - no events" }
        });
        return res.status(200).send("ok - no events");
      }
      let processedCount = 0;
      let statusUpdatedCount = 0;
      for (const update of statusUpdates) {
        const message = await storage.getMessageByProviderMessageId(update.providerMessageId);
        if (!message || message.direction !== "outbound") {
          continue;
        }
        if (!shouldUpdateMessageStatus(message.status, update.status)) {
          continue;
        }
        const updated = await storage.updateMessageStatus(message.id, update.status);
        if (!updated) continue;
        statusUpdatedCount += 1;
        broadcastMessage("message_status", {
          id: updated.id,
          conversationId: updated.conversationId,
          status: updated.status,
          providerMessageId: updated.providerMessageId
        });
      }
      for (const event of events) {
        if (event.providerMessageId) {
          const existing = await storage.getMessageByProviderMessageId(event.providerMessageId);
          if (existing) {
            logger.info(
              {
                providerMessageId: event.providerMessageId,
                existingMessageId: existing.id,
                conversationId: existing.conversationId
              },
              "Skipping duplicate webhook message"
            );
            continue;
          }
        }
        let conversation = await storage.getConversationByPhone(event.from);
        if (!conversation) {
          conversation = await storage.createConversation({
            phone: event.from
          });
        }
        if (conversation.archived) {
          conversation = await storage.toggleConversationArchive(conversation.id, false);
        }
        const pendingMedia = createPendingMediaDescriptor(event.media);
        let replyToId = null;
        if (event.replyToProviderMessageId) {
          const replyTarget = await storage.getMessageByProviderMessageId(event.replyToProviderMessageId);
          if (replyTarget && replyTarget.conversationId === conversation.id) {
            replyToId = replyTarget.id;
          }
        }
        const message = await storage.createMessage({
          conversationId: conversation.id,
          direction: "inbound",
          body: event.body ?? null,
          media: pendingMedia,
          providerMessageId: event.providerMessageId ?? null,
          status: "received",
          raw: event.raw,
          replyToMessageId: replyToId
        });
        processedCount += 1;
        logger.info(
          {
            event: "message_incoming",
            conversationId: conversation.id,
            messageId: message.id,
            from: event.from,
            textPreview: summarizeText(event.body ?? null),
            hasMedia: Boolean(event.media),
            providerMessageId: event.providerMessageId ?? void 0
          },
          "Incoming message"
        );
        await storage.logWebhookEvent({
          headers: req.headers,
          query: req.query,
          body: event.raw || event,
          response: { status: 200, body: "ok", messageId: message.id }
        });
        await storage.updateConversationLastAt(conversation.id);
        await storage.incrementConversationUnread(conversation.id);
        const signedMessage = buildSignedMediaUrlsForMessage(message);
        broadcastMessage("message_incoming", signedMessage);
        if (event.media) {
          ingestWhatsappMedia({
            messageId: message.id,
            conversationId: conversation.id,
            descriptor: event.media,
            provider,
            onStatusChange: async (updated) => {
              if (!updated) return;
              const signed = buildSignedMediaUrlsForMessage(updated);
              broadcastMessage("message_media_updated", signed);
            }
          }).catch((error) => {
            logger.error(
              {
                err: error,
                conversationId: conversation.id,
                messageId: message.id,
                providerMessageId: event.providerMessageId
              },
              "Error ingesting WhatsApp media"
            );
          });
        }
      }
      const duration = Date.now() - startTime;
      logger.info(
        {
          event: "meta_webhook_processed",
          messageCount: processedCount,
          statusCount: statusUpdatedCount,
          durationMs: duration
        },
        "Meta webhook processed"
      );
      res.status(200).send("ok");
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { err: error, event: "meta_webhook_error", durationMs: duration },
        "Meta webhook error"
      );
      await storage.logWebhookEvent({
        headers: req.headers,
        query: req.query,
        body: req.body,
        response: {
          status: 500,
          body: error.message,
          error: error.stack
        }
      });
      res.status(500).json({ error: error.message });
    }
  };
  app2.use(async (req, res, next) => {
    if (!pathsMatchMetaWebhook(req.path)) {
      return next();
    }
    if (req.method === "GET") {
      return handleMetaWebhookVerification(req, res);
    }
    if (req.method === "POST") {
      return handleMetaWebhookEvent(req, res);
    }
    return res.status(405).json({ error: "Method Not Allowed" });
  });
  app2.post("/webhook/debug", async (req, res) => {
    try {
      logger.debug({ event: "debug_webhook_called" }, "Debug webhook called");
      const debugInfo = await WebhookDebugger.debugWebhookFlow(
        "default",
        req.body,
        req.headers,
        req.query
      );
      res.json({
        success: true,
        debugInfo,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      logger.error({ err: error, event: "debug_webhook_error" }, "Debug webhook error");
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  app2.get("/api/webhook/status", requireAdmin2, async (req, res) => {
    try {
      const recentEvents = await storage.getWebhookEvents(10);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const webhookUrl = `${baseUrl}/webhook/meta`;
      const instance = await storage.getDefaultWhatsappInstance();
      const instanceResponse = toInstanceResponse(instance);
      const isConfigured = !!(instance?.accessToken && instance?.phoneNumberId);
      const hasWebhookSecret = !!instance?.appSecret;
      const hasVerifyToken = !!instance?.webhookVerifyToken;
      const isActive = instance?.isActive ?? true;
      const webhookBehavior = instance?.webhookBehavior ?? "auto";
      res.json({
        instance: instanceResponse ? {
          ...instanceResponse,
          webhookUrl
        } : {
          id: "default",
          name: "Default WhatsApp Instance",
          isActive: false,
          webhookBehavior: "auto",
          hasAppSecret: false,
          hasVerifyToken: false,
          webhookUrl,
          accessTokenConfigured: false,
          webhookVerifyTokenConfigured: false,
          appSecretConfigured: false,
          source: "env",
          updatedAt: null,
          phoneNumberId: ""
        },
        recentEvents: recentEvents.map((event) => ({
          id: event.id,
          createdAt: event.createdAt,
          headers: event.headers,
          query: event.query,
          body: event.body,
          response: event.response
        })),
        status: {
          isConfigured,
          hasWebhookSecret,
          hasVerifyToken,
          isActive,
          webhookBehavior
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Webhook status error");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/test-message", requireAdmin2, async (req, res) => {
    try {
      const { to, body } = req.body;
      if (!to || !body) {
        return res.status(400).json({ error: "to and body are required" });
      }
      const { provider, instance } = await createMetaProvider();
      logger.info({ event: "test_message_send", to }, "Sending test message");
      const result = await provider.send(to, body);
      res.json({
        success: true,
        message: "Test message sent successfully",
        result,
        instance: instance ? {
          id: instance.id,
          name: instance.name,
          phoneNumberId: instance.phoneNumberId,
          source: instance.source
        } : {
          id: "default",
          name: "Default WhatsApp Instance"
        }
      });
    } catch (error) {
      logger.error({ err: error, event: "test_message_error" }, "Test message error");
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.post("/webhook/test", async (req, res) => {
    try {
      const apiControls = await storage.getAppSetting("apiControls") || { testWebhookEnabled: true };
      if (!apiControls.testWebhookEnabled) {
        return res.status(403).json({ error: "Test webhooks are disabled" });
      }
      const { from, body: textBody, media } = req.body;
      if (!from) {
        return res.status(400).json({ error: "'from' (phone) is required" });
      }
      let conversation = await storage.getConversationByPhone(from);
      if (!conversation) {
        conversation = await storage.createConversation({
          phone: from
        });
      }
      if (conversation.archived) {
        conversation = await storage.toggleConversationArchive(conversation.id, false);
      }
      const message = await storage.createMessage({
        conversationId: conversation.id,
        direction: "inbound",
        body: textBody || null,
        media: media || null,
        status: "received",
        raw: req.body,
        replyToMessageId: null
      });
      await storage.updateConversationLastAt(conversation.id);
      await storage.incrementConversationUnread(conversation.id);
      await storage.logWebhookEvent({
        headers: req.headers,
        query: req.query,
        body: req.body,
        response: { status: 200, body: "ok" }
      });
      broadcastMessage("message_incoming", message);
      res.json({ ok: true, message });
    } catch (error) {
      logger.error({ err: error }, "Test webhook error");
      res.status(500).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    logger.debug({ event: "ws_connected" }, "WebSocket client connected");
    wsClients.add(ws);
    ws.on("close", () => {
      logger.debug({ event: "ws_disconnected" }, "WebSocket client disconnected");
      wsClients.delete(ws);
    });
    ws.on("error", (error) => {
      logger.error({ err: error, event: "ws_error" }, "WebSocket error");
      wsClients.delete(ws);
    });
  });
  return httpServer;
}

// server/auth.ts
init_validate_env();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (stored && stored.startsWith("$2")) {
    try {
      const ok = await bcrypt.compare(supplied, stored);
      return ok;
    } catch (err) {
      return false;
    }
  }
  const [hashed, salt] = stored.split(".");
  if (!salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
var resolveRequestIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.ip || req.connection?.remoteAddress || void 0;
};
function setupAuth(app2) {
  const sessionSettings = {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
  const requireAdmin2 = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    if (req.user.role !== "admin") {
      return res.status(403).send("Forbidden: Admin access required");
    }
    next();
  };
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) {
        logger.warn(
          {
            event: "auth_login_failed",
            username: typeof req.body?.username === "string" ? req.body.username : void 0,
            ip: resolveRequestIp(req)
          },
          "Login failed"
        );
        return res.status(401).send("Invalid username or password");
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        logger.info(
          {
            event: "auth_login",
            userId: user.id,
            username: user.username,
            role: user.role,
            ip: resolveRequestIp(req)
          },
          "Login successful"
        );
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    const currentUser = req.user;
    const ip = resolveRequestIp(req);
    req.logout((err) => {
      if (err) return next(err);
      if (currentUser) {
        logger.info(
          {
            event: "auth_logout",
            userId: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
            ip
          },
          "Logout"
        );
      }
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  app2.post("/api/admin/users", requireAdmin2, async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }
      if (username.length < 3 || username.length > 50) {
        return res.status(400).send("Username must be between 3 and 50 characters");
      }
      if (password.length < 6) {
        return res.status(400).send("Password must be at least 6 characters");
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }
      const userRole = role === "admin" ? "admin" : "user";
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        role: userRole
      });
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/users", requireAdmin2, async (req, res, next) => {
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutPasswords = users2.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/admin/users/:id", requireAdmin2, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { username, role, password } = req.body;
      if (!username) {
        return res.status(400).send("Username is required");
      }
      if (username.length < 3 || username.length > 50) {
        return res.status(400).send("Username must be between 3 and 50 characters");
      }
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).send("User not found");
      }
      const userWithSameUsername = await storage.getUserByUsername(username);
      if (userWithSameUsername && userWithSameUsername.id !== id) {
        return res.status(400).send("Username already exists");
      }
      const userRole = role === "admin" ? "admin" : "user";
      let hashedPassword;
      if (password !== void 0) {
        if (typeof password !== "string" || password.length < 6) {
          return res.status(400).send("Password must be at least 6 characters");
        }
        hashedPassword = await hashPassword(password);
      }
      const updatedUser = await storage.updateUser(id, {
        username,
        role: userRole,
        ...hashedPassword ? { password: hashedPassword } : {}
      });
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/admin/users/:id", requireAdmin2, async (req, res, next) => {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).send("Cannot delete your own account");
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      await storage.deleteUser(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
  return { requireAdmin: requireAdmin2 };
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path6 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path5 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path5.resolve(import.meta.dirname, "client", "src"),
      "@shared": path5.resolve(import.meta.dirname, "shared"),
      "@assets": path5.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path5.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path5.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  },
  // @ts-expect-error Vitest configuration is not part of Vite type declarations
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts", "./src/test/setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx",
      "../server/**/*.test.ts",
      "../server/**/*.spec.ts"
    ]
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path6.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path6.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path6.resolve(distPath, "index.html"));
  });
}

// server/health.ts
init_db();
async function getHealthStatus(dbPool = pool) {
  const startedAt = Date.now();
  const uptimeSeconds = Math.floor(process.uptime());
  let client = null;
  try {
    client = await dbPool.connect();
    const result = await client.query("select version()");
    const dbVersion = result.rows?.[0]?.version ?? null;
    return {
      status: "ok",
      uptimeSeconds,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      db: {
        status: "ok",
        version: dbVersion,
        latencyMs: Date.now() - startedAt
      }
    };
  } catch (error) {
    logger.error({ err: error }, "health check failed");
    return {
      status: "error",
      uptimeSeconds,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      db: {
        status: "error",
        message: error?.message ?? "Unknown error"
      }
    };
  } finally {
    client?.release();
  }
}
function registerHealthRoute(app2, path7 = "/health", checker = getHealthStatus) {
  app2.get(path7, async (_req, res) => {
    const result = await checker();
    res.status(result.status === "ok" ? 200 : 500).json(result);
  });
}

// server/index.ts
try {
  mkdirSync2(join(process.cwd(), "uploads"), { recursive: true });
} catch {
}
var app = express2();
process.env.NODE_ENV = env.NODE_ENV;
app.set("env", env.NODE_ENV);
app.set("trust proxy", true);
app.use(httpLogger);
assertSigningSecret();
var enforceHttps = env.ENFORCE_HTTPS ?? false;
if (enforceHttps) {
  app.use((req, res, next) => {
    const forwardedProto = req.get("x-forwarded-proto");
    const primaryProto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
    const isHttps = req.secure || primaryProto === "https";
    const upgradeHeader = req.get("upgrade");
    if (isHttps || upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      return next();
    }
    const host = req.get("host");
    if (!host) return next();
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}
app.use(
  express2.json({
    verify: (req, _res, buf) => {
      if (req.path.startsWith("/webhook/")) {
        req.rawBody = buf.toString("utf8");
      }
    }
  })
);
app.use(
  express2.urlencoded({
    extended: false,
    verify: (req, _res, buf) => {
      if (req.path.startsWith("/webhook/")) {
        req.rawBody = buf.toString("utf8");
      }
    }
  })
);
registerHealthRoute(app);
var { requireAdmin } = setupAuth(app);
app.use((req, res, next) => {
  const start = Date.now();
  const path7 = req.path;
  let capturedJsonResponse;
  const shouldIncludePreview = typeof logger.isLevelEnabled === "function" ? logger.isLevelEnabled("debug") : env.LOG_LEVEL === "debug" || env.LOG_LEVEL === "trace";
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };
  res.on("finish", () => {
    if (path7.startsWith("/api")) {
      logger.info(
        {
          event: "api_request_completed",
          method: req.method,
          path: path7,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
          responsePreview: shouldIncludePreview && capturedJsonResponse ? JSON.stringify(capturedJsonResponse).slice(0, 200) : void 0
        },
        "API request completed"
      );
    }
  });
  next();
});
(async () => {
  const { ensureSchema: ensureSchema2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  await ensureSchema2();
  const server = await registerRoutes(app, requireAdmin);
  app.use((err, _req, res, _next) => {
    if (err.name === "MulterError") {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: "Unexpected file field." });
      }
      return res.status(400).json({ error: err.message });
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    logger.error(err);
  });
  if (env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = env.PORT;
  const host = env.HOST ?? (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0");
  const listenOptions = process.platform === "win32" ? { port, host } : { port, host, reusePort: true };
  server.listen(listenOptions, () => {
    logger.info(
      { event: "server_started", port, host },
      `Serving on http://${host}:${port}`
    );
  });
})();
