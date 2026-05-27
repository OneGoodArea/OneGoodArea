import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next app now lives under apps/web (monorepo). Point the Next ESLint
  // plugin at it so its page/link rules resolve correctly from the repo root.
  { settings: { next: { rootDir: "apps/web/" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
    // Dev/ops tooling (seed/stripe/cron scripts). Not part of the app build and
    // never linted before the apps/web relocation; keep it out of lint scope.
    "apps/web/scripts/**",
  ]),
]);

export default eslintConfig;
