export interface RuntimeDebugConfig {
  composeFile: string;
  seedProfile: string;
  logLevel: string;
  serviceUrls: {
    app: string;
    postgres: string;
    neonProxy: string;
    mailhogUi: string;
  };
}

function normalizePort(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : fallback;
}

export function getRuntimeDebugConfig() {
  const appPort = normalizePort(process.env.OGA_APP_PORT, "3000");
  const postgresPort = normalizePort(process.env.OGA_POSTGRES_PORT, "55432");
  const neonProxyPort = normalizePort(process.env.OGA_NEON_PROXY_PORT, "55433");
  const mailhogUiPort = normalizePort(process.env.OGA_MAILHOG_UI_PORT, "8025");
  const logLevel = process.env.OGA_LOG_LEVEL?.trim() || "debug";

  const config: RuntimeDebugConfig = {
    composeFile: process.env.OGA_COMPOSE_FILE?.trim() || "compose/compose.yml",
    seedProfile: process.env.OGA_SEED_PROFILE?.trim() || "baseline",
    logLevel,
    serviceUrls: {
      app: `http://localhost:${appPort}`,
      postgres: `postgres://localhost:${postgresPort}`,
      neonProxy: `http://localhost:${neonProxyPort}`,
      mailhogUi: `http://localhost:${mailhogUiPort}`,
    },
  };

  return config;
}
