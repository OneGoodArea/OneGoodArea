/**
 * Lightweight structured logger.
 * Wraps console.* with consistent prefixing and log levels.
 * In production (Vercel), console output is captured automatically.
 * In local runtime (OGA_LOCAL_RUNTIME_ENABLED=true), enables debug output and JSON formatting.
 */

import { getConfig } from "../../infrastructure/config";

type LogLevel = 'trace' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';

const LogLevelRank: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  verbose: 2,
  info: 3,
  warn: 4,
  error: 5,
};

function getLogLevel(): LogLevel {
  const config = getConfig();
  const logLevel = config.logLevel;
  // Validate against known levels
  if (logLevel && logLevel in LogLevelRank) {
    return logLevel as LogLevel;
  }
  // Fallback: use info, or debug if local runtime is enabled
  return config.localRuntimeEnabled ? 'debug' : 'info';
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getLogLevel();
  return LogLevelRank[level] >= LogLevelRank[configuredLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

interface LogContext {
  [key: string]: unknown;
}

function serializeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function normalizeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  if (context instanceof Error) {
    return { error: serializeError(context) };
  }

  const normalizedEntries = Object.entries(context).map(([key, value]) => {
    if (value instanceof Error) {
      return [key, serializeError(value)];
    }
    return [key, value];
  });

  return Object.fromEntries(normalizedEntries);
}

/* AR-308: mask URI passwords before any log line is emitted. Catches
   connection strings (postgres://user:pw@host, redis://...:pw@host,
   https://user:token@api) that leak when a driver's error message or
   stack trace inlines the full URI. Runs on the final JSON string so
   it covers message, stack, context, and any nested error chain in
   one pass. Anchored on `://user:`...`@` so plain user@host or
   user:port forms aren't touched. */
const URI_PASSWORD_PATTERN = /(\b\w+:\/\/[^:\s@"]+:)[^@\s"]+(@)/g;

export function redactSecrets(s: string): string {
  return s.replace(URI_PASSWORD_PATTERN, "$1***$2");
}

function formatStructured(level: LogLevel, message: string, context?: LogContext): string {
  const normalizedContext = normalizeContext(context);
  const correlationId = typeof normalizedContext?.correlationId === "string"
    ? normalizedContext.correlationId
    : undefined;

  const log = {
    service: 'OneGoodArea',
    level,
    timestamp: formatTimestamp(),
    ...(correlationId ? { correlationId } : {}),
    message,
    ...(normalizedContext && Object.keys(normalizedContext).length > 0 ? { context: normalizedContext } : {}),
  };
  return redactSecrets(JSON.stringify(log));
}

function normalizeArgs(args: unknown[]): { message: string; context?: LogContext } {
  const [first, second, ...rest] = args;
  if (typeof first === "string") {
    if (second && typeof second === "object" && !Array.isArray(second)) {
      return { message: first, context: second as LogContext };
    }
    if (rest.length > 0) {
      return { message: [first, second, ...rest].filter(Boolean).map(String).join(" ") };
    }
    return { message: first };
  }

  return { message: args.map((value) => String(value)).join(" ") };
}

export const logger = {
  trace(...args: unknown[]) {
    if (shouldLog('trace')) {
      const { message, context } = normalizeArgs(args);
      console.log(formatStructured('trace', message, context));
    }
  },
  debug(...args: unknown[]) {
    if (shouldLog('debug')) {
      const { message, context } = normalizeArgs(args);
      console.log(formatStructured('debug', message, context));
    }
  },
  verbose(...args: unknown[]) {
    if (shouldLog('verbose')) {
      const { message, context } = normalizeArgs(args);
      console.log(formatStructured('verbose', message, context));
    }
  },
  info(...args: unknown[]) {
    if (shouldLog('info')) {
      const { message, context } = normalizeArgs(args);
      console.log(formatStructured('info', message, context));
    }
  },
  warn(...args: unknown[]) {
    if (shouldLog('warn')) {
      const { message, context } = normalizeArgs(args);
      console.warn(formatStructured('warn', message, context));
    }
  },
  error(...args: unknown[]) {
    if (shouldLog('error')) {
      const { message, context } = normalizeArgs(args);
      console.error(formatStructured('error', message, context));
    }
  },
};
