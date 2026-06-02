import { defineConfig } from "vitest/config";

/* Plan 006 (test/prod separation): tests live in `tests/`, production in
   `src/`. The explicit config replaces Vitest's default `**` discovery so
   stray *.test.ts files in src/ (none today, but future-proofing) won't
   be silently picked up. */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    /* Plan 007 phase 0: emit junit + json into repo-root .artifacts/
       (gitignored). Repo-root is 2 levels up from packages/contracts/. */
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "../../.artifacts/test-reports/contracts/junit.xml",
      json: "../../.artifacts/test-reports/contracts/results.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportOnFailure: true,
      reportsDirectory: "../../.artifacts/test-reports/coverage/contracts",
      include: ["src/**/*.ts"],
      exclude: [
        "tests/**",
        "src/**/*.d.ts",
        "node_modules/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
