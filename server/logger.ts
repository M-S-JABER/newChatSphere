import { randomUUID } from "crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import signale from "signale";
import { env } from "../validate-env";

const isProduction = env.NODE_ENV === "production";
const hasPrettyEnv = Object.prototype.hasOwnProperty.call(process.env, "LOG_PRETTY");
const shouldPrettyPrint = hasPrettyEnv ? env.LOG_PRETTY : !isProduction;
const logFocus = env.LOG_FOCUS ?? "essential";

type LogRecord = Record<string, any>;

const ESSENTIAL_EVENTS = new Set([
  "message_incoming",
  "message_outgoing",
  "message_outgoing_failed",
  "auth_login",
  "auth_login_failed",
  "auth_logout",
  "server_started",
]);

const formatMultiline = (lines: string[]) =>
  lines.length > 1 ? `${lines[0]}\n  ${lines.slice(1).join("\n  ")}` : lines[0];

const getStringValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const getPreview = (value: unknown, maxLength = 160): string => {
  const text = getStringValue(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const appendErrorLines = (lines: string[], log: LogRecord) => {
  const error = (log.err as LogRecord | string | undefined) ?? (log.error as LogRecord | string | undefined);
  if (!error) return;
  const errorMessage =
    typeof error === "string"
      ? error
      : typeof error.message === "string"
      ? error.message
      : "";
  const errorCode =
    typeof error === "object" && error && typeof (error as any).code === "string"
      ? String((error as any).code)
      : "";
  const errorParts = [errorMessage, errorCode ? `code=${errorCode}` : ""].filter(Boolean);
  if (errorParts.length > 0) {
    lines.push(`error: ${errorParts.join(" | ")}`);
  }
};

const formatEssentialEvent = (log: LogRecord): string | null => {
  const event = getStringValue(log.event);
  if (!event) return null;

  const titles: Record<string, string> = {
    message_incoming: "📥 Incoming message",
    message_outgoing: "📤 Outgoing message",
    message_outgoing_failed: "❌ Message failed",
    auth_login: "🔐 Login",
    auth_login_failed: "🚫 Login failed",
    auth_logout: "🔓 Logout",
    server_started: "🚀 Server started",
  };

  const title = titles[event];
  if (!title) return null;

  const lines: string[] = [title];

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

const formatPrettyMessage = (log: LogRecord, messageKey: string) => {
  const essential = formatEssentialEvent(log);
  if (essential) {
    return essential;
  }

  const message = typeof log[messageKey] === "string" ? log[messageKey] : "";
  const event = typeof log.event === "string" ? log.event : "";
  const service = typeof log.service === "string" ? log.service : "";
  const lines: string[] = [];

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

  const path = typeof log.path === "string" ? log.path : "";
  if (path) {
    lines.push(`path: ${path}`);
  }

  const req = log.req as LogRecord | undefined;
  const res = log.res as LogRecord | undefined;
  if (req?.method || req?.url) {
    const method = req.method ?? "N/A";
    const url = req.url ?? "";
    const ip = req.ip ? ` from ${req.ip}` : "";
    lines.push(`request: ${method} ${url}${ip}`.trim());
  }

  if (res?.statusCode) {
    lines.push(`response: ${res.statusCode}`);
  }

  const metrics: string[] = [];
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

const resolveSignaleLevel = (level: unknown): string => {
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

const writeToSignale = (level: string, message: string) => {
  const target =
    typeof (signale as any)[level] === "function"
      ? (signale as any)[level]
      : typeof (signale as any).info === "function"
      ? (signale as any).info
      : (signale as any).log;
  target.call(signale, message);
};

const signaleStream = {
  write(chunk: string | Buffer) {
    const raw = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const line = raw.trim();
    if (!line) return;

    try {
      const parsed = JSON.parse(line) as LogRecord;
      const level = resolveSignaleLevel(parsed.level);
      const message = formatPrettyMessage(parsed, "msg");
      writeToSignale(level, message);
    } catch {
      writeToSignale("info", line);
    }
  },
};

if (shouldPrettyPrint && typeof (signale as any).config === "function") {
  (signale as any).config({ displayTimestamp: true, displayDate: false });
}

const loggerDestination = shouldPrettyPrint ? (signaleStream as any) : pino.destination(1);

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: { service: "chatsphere" },
    timestamp: pino.stdTimeFunctions.isoTime,
    hooks: {
      logMethod(args, method, level) {
        if (logFocus === "all") {
          return method.apply(this, args as any);
        }
        const record =
          args.length > 0 && args[0] && typeof args[0] === "object" ? (args[0] as LogRecord) : {};
        const numericLevel = typeof level === "number" ? level : Number(level);
        if (Number.isFinite(numericLevel) && numericLevel >= 40) {
          return method.apply(this, args as any);
        }
        const event = getStringValue(record.event);
        if (event && ESSENTIAL_EVENTS.has(event)) {
          return method.apply(this, args as any);
        }
        return undefined;
      },
    },
    ...(isProduction
      ? {}
      : {
          formatters: {
            level(label) {
              return { level: label };
            },
          },
        }),
  },
  loggerDestination,
);

const serializeRequest = (req: any) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  ip:
    (req.headers?.["x-forwarded-for"] as string | undefined) ??
    req.remoteAddress,
});

const serializeResponse = (res: any) => ({
  statusCode: res.statusCode,
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (req.url === '/health') return 'silent'
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn'
    if (res.statusCode >= 500 || err) return 'error'
    return 'info'
  },
  serializers: {
    req: serializeRequest,
    res: serializeResponse,
  },
  genReqId: (req, res) => {
    const headerRequestId =
      req.headers["x-request-id"] ||
      req.headers["x-correlation-id"] ||
      req.headers["x-amzn-trace-id"];

    if (typeof headerRequestId === "string" && headerRequestId.length > 0) {
      res.setHeader("x-request-id", headerRequestId);
      return headerRequestId;
    }

    const id = randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customProps: (req) => ({
    requestPath: req.url,
  }),
});
