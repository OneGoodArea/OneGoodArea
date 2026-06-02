import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

/* Plan 006 (test/prod separation): tests live in `tests/`, production in
   `src/`. The `@/` alias resolves to `src/` so test imports can use
   `from "@/modules/orgs"` regardless of test depth — avoids fragile
   multi-level relative paths like `from "../../../src/modules/orgs"`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    /* Plan 007 phase 0: emit junit + json reports into the repo-root
       .artifacts/ dir (gitignored). Default reporter stays for
       human-readable terminal output; junit + json are added for CI
       upload / regression-analysis tooling. */
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "../../.artifacts/test-reports/api/junit.xml",
      json: "../../.artifacts/test-reports/api/results.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportOnFailure: true,
      reportsDirectory: "../../.artifacts/test-reports/coverage/api",
      include: ["src/**/*.ts"],
      exclude: [
        "tests/**",
        "src/**/*.d.ts",
        "src/scripts/**",
        "src/infrastructure/db/migrate.ts",
        "node_modules/**",
      ],
      /* Baseline thresholds calibrated to actual coverage at Plan 013
         (lines 51.57, functions 55.64, branches 44.86, statements 50.42).
         Tighten incrementally per sprint — do not lower these. */
      thresholds: {
        lines: 49,
        functions: 53,
        branches: 42,
        statements: 48,
      },
    },
  },
});
