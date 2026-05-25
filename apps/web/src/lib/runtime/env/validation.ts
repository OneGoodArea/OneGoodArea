export type RuntimeServiceMode = "local-test" | "development" | "production";
export type RuntimeLogLevel = "trace" | "debug" | "verbose" | "info" | "warn" | "error";

export interface RuntimeConfig {
  localRuntimeEnabled: boolean;
  serviceMode: RuntimeServiceMode;
  logLevel: RuntimeLogLevel;
  databaseUrl: string;
  postcodesApiBaseUrl: string;
  aiProvider: string;
  emailProvider: string;
  envFiles: string[];
}

const allowedServiceModes: RuntimeServiceMode[] = ["local-test", "development", "production"];
const allowedLogLevels: RuntimeLogLevel[] = ["trace", "debug", "verbose", "info", "warn", "error"];

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  return (allowed.includes(value as T) ? value : fallback) as T;
}

export function parseString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function validateRuntimeConfig(config: RuntimeConfig): void {
  if (!allowedServiceModes.includes(config.serviceMode)) {
    throw new Error(`Invalid runtime mode: ${config.serviceMode}`);
  }

  if (!allowedLogLevels.includes(config.logLevel)) {
    throw new Error(`Invalid log level: ${config.logLevel}`);
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!config.postcodesApiBaseUrl) {
    throw new Error("POSTCODES_API_BASE_URL is required");
  }
}
