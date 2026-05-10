/**
 * Lightweight structured logger.
 * Wraps console.* with consistent prefixing and log levels.
 * In production (Vercel), console output is captured automatically.
 * In local runtime (OGA_LOCAL_RUNTIME_ENABLED=true), enables debug output and JSON formatting.
 */

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

function formatTimestamp(): string {
  return new Date().toISOString();
}

interface LogContext {
  [key: string]: unknown;
}

function formatStructured(level: LogLevel, message: string, context?: LogContext): string {
  const log = {
    service: 'OneGoodArea',
    level,
    timestamp: formatTimestamp(),
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
  return JSON.stringify(log);
}

export const logger = {
  trace(message: string, context?: LogContext) {
    if (shouldLog('trace')) {
      console.log(formatStructured('trace', message, context));
    }
  },
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.log(formatStructured('debug', message, context));
    }
  },
  verbose(message: string, context?: LogContext) {
    if (shouldLog('verbose')) {
      console.log(formatStructured('verbose', message, context));
    }
  },
  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.log(formatStructured('info', message, context));
    }
  },
  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatStructured('warn', message, context));
    }
  },
  error(message: string, context?: LogContext) {
    if (shouldLog('error')) {
      console.error(formatStructured('error', message, context));
    }
  },
};
