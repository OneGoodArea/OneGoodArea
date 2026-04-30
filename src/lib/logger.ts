/**
 * Lightweight structured logger.
 * Wraps console.* with consistent prefixing and log levels.
 * In production (Vercel), console output is captured automatically.
 */

function formatArgs(args: unknown[]): unknown[] {
  return args;
}

export const logger = {
  info(...args: unknown[]) {
    console.log("[OneGoodArea]", ...formatArgs(args));
  },
  warn(...args: unknown[]) {
    console.warn("[OneGoodArea]", ...formatArgs(args));
  },
  error(...args: unknown[]) {
    console.error("[OneGoodArea]", ...formatArgs(args));
  },
};
