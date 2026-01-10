import { randomUUID } from "crypto";
import pino from "pino";
import pinoPretty from "pino-pretty";
import pinoHttp from "pino-http";
import { env } from "../validate-env";

const isProduction = env.NODE_ENV === "production";
const hasPrettyEnv = Object.prototype.hasOwnProperty.call(process.env, "LOG_PRETTY");
const shouldPrettyPrint = hasPrettyEnv ? env.LOG_PRETTY : !isProduction;

type LogRecord = Record<string, any>;

const formatPrettyMessage = (log: LogRecord, messageKey: string) => {
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

  const error = (log.err as LogRecord | string | undefined) ?? (log.error as LogRecord | string | undefined);
  if (error) {
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
  }

  return lines.length > 1 ? `${lines[0]}\n  ${lines.slice(1).join("\n  ")}` : lines[0];
};

const prettyStream = shouldPrettyPrint
  ? pinoPretty({
      colorize: true,
      translateTime: "SYS:HH:MM:ss",
      ignore:
        "pid,hostname,req,res,requestPath,service,event,path,durationMs,responseTime,messageCount,statusCount,err,error",
      singleLine: false,
      levelFirst: true,
      hideObject: true,
      messageFormat: formatPrettyMessage as any,
    })
  : undefined;

const loggerDestination = prettyStream ?? pino.destination(1);

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: { service: "chatsphere" },
    timestamp: pino.stdTimeFunctions.isoTime,
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
