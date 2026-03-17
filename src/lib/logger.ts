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
    console.log("[AreaIQ]", ...formatArgs(args));
  },
  warn(...args: unknown[]) {
    console.warn("[AreaIQ]", ...formatArgs(args));
  },
  error(...args: unknown[]) {
    console.error("[AreaIQ]", ...formatArgs(args));
  },
};
