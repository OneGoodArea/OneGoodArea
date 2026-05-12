import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseBoolean,
  parseEnum,
  parseString,
  type RuntimeConfig,
  type RuntimeLogLevel,
  type RuntimeServiceMode,
  validateRuntimeConfig,
} from "./validation";
import { getRuntimeDebugConfig } from "../debug/config";

const DEFAULTS = {
  localRuntimeEnabled: false,
  serviceMode: "development" as RuntimeServiceMode,
  logLevel: "info" as RuntimeLogLevel,
  databaseUrl: "",
  postcodesApiBaseUrl: "https://api.postcodes.io",
  aiProvider: "anthropic",
  emailProvider: "resend",
};

const ENV_FILES = [".env.local.test", ".env.local.test.secrets"];

let cachedRuntimeConfig: RuntimeConfig | null = null;

async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const contents = await readFile(filePath, "utf8");
    const values: Record<string, string> = {};

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    }

    return values;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function loadLayeredEnv(): Promise<Record<string, string>> {
  const root = process.cwd();
  const layered: Record<string, string> = {};

  for (const fileName of ENV_FILES) {
    const fileValues = await parseEnvFile(path.join(root, fileName));
    Object.assign(layered, fileValues);
  }

  Object.assign(layered, process.env as Record<string, string>);
  return layered;
}

export async function resolveRuntimeConfig(): Promise<RuntimeConfig> {
  const env = await loadLayeredEnv();

  const config: RuntimeConfig = {
    localRuntimeEnabled: parseBoolean(env.OGA_LOCAL_RUNTIME_ENABLED, DEFAULTS.localRuntimeEnabled),
    serviceMode: parseEnum(env.OGA_SERVICE_MODE, ["local-test", "development", "production"], DEFAULTS.serviceMode),
    logLevel: parseEnum(env.OGA_LOG_LEVEL, ["trace", "debug", "verbose", "info", "warn", "error"], DEFAULTS.logLevel),
    databaseUrl: parseString(env.DATABASE_URL, DEFAULTS.databaseUrl),
    postcodesApiBaseUrl: parseString(env.POSTCODES_API_BASE_URL, DEFAULTS.postcodesApiBaseUrl),
    aiProvider: parseString(env.OGA_AI_PROVIDER, DEFAULTS.aiProvider),
    emailProvider: parseString(env.OGA_EMAIL_PROVIDER, DEFAULTS.emailProvider),
    envFiles: ENV_FILES.map((fileName) => path.join(process.cwd(), fileName)).filter(Boolean),
  };

  validateRuntimeConfig(config);
  return config;
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (!cachedRuntimeConfig) {
    cachedRuntimeConfig = await resolveRuntimeConfig();
  }

  return cachedRuntimeConfig;
}

export function resetRuntimeConfigForTests(): void {
  cachedRuntimeConfig = null;
}

export async function getRuntimeDiagnostics() {
  const config = await getRuntimeConfig();

  return {
    localRuntimeEnabled: config.localRuntimeEnabled,
    serviceMode: config.serviceMode,
    logLevel: config.logLevel,
    aiProvider: config.aiProvider,
    emailProvider: config.emailProvider,
    hasDatabaseUrl: Boolean(config.databaseUrl),
    postcodesApiBaseUrl: config.postcodesApiBaseUrl,
    envFiles: config.envFiles,
    debug: getRuntimeDebugConfig(),
  };
}
