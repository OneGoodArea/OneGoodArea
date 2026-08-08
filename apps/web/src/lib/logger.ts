/**
 * Lightweight structured logger.
 * Wraps console.* with consistent prefixing and log levels.
 * In production (Vercel), console output is captured automatically.
 * In local runtime (OGA_LOCAL_RUNTIME_ENABLED=true), enables debug output and JSON formatting.
 */

import pc from "picocolors";

type LogLevel = 'trace' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';

const LogLevelRank: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  verbose: 2,
  info: 3,
  warn: 4,
  error: 5,
};

// Inline env parsing to avoid circular dependency on getRuntimeConfig()
function getLogLevel(): LogLevel {
  const envLogLevel = process.env.OGA_LOG_LEVEL;
  if (envLogLevel && envLogLevel in LogLevelRank) {
    return envLogLevel as LogLevel;
  }
  // Default to debug if local runtime enabled, otherwise info
  const isLocalRuntime = process.env.OGA_LOCAL_RUNTIME_ENABLED === 'true';
  return isLocalRuntime ? 'debug' : 'info';
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getLogLevel();
  return LogLevelRank[level] >= LogLevelRank[configuredLevel];
}

/* Whole-line ANSI color per level. picocolors auto-detects TTY support and
   honors NO_COLOR / FORCE_COLOR, so containers and CI stay plain unless
   FORCE_COLOR is set. */
const LEVEL_COLOR: Record<LogLevel, (s: string) => string> = {
  trace: pc.gray,
  debug: pc.cyan,
  verbose: pc.blue,
  info: pc.green,
  warn: pc.yellow,
  error: pc.red,
};

function colorize(level: LogLevel, line: string): string {
  return LEVEL_COLOR[level](line);
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
  return JSON.stringify(log);
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
      console.log(colorize('trace', formatStructured('trace', message, context)));
    }
  },
  debug(...args: unknown[]) {
    if (shouldLog('debug')) {
      const { message, context } = normalizeArgs(args);
      console.log(colorize('debug', formatStructured('debug', message, context)));
    }
  },
  verbose(...args: unknown[]) {
    if (shouldLog('verbose')) {
      const { message, context } = normalizeArgs(args);
      console.log(colorize('verbose', formatStructured('verbose', message, context)));
    }
  },
  info(...args: unknown[]) {
    if (shouldLog('info')) {
      const { message, context } = normalizeArgs(args);
      console.log(colorize('info', formatStructured('info', message, context)));
    }
  },
  warn(...args: unknown[]) {
    if (shouldLog('warn')) {
      const { message, context } = normalizeArgs(args);
      console.warn(colorize('warn', formatStructured('warn', message, context)));
    }
  },
  error(...args: unknown[]) {
    if (shouldLog('error')) {
      const { message, context } = normalizeArgs(args);
      console.error(colorize('error', formatStructured('error', message, context)));
    }
  },
};
