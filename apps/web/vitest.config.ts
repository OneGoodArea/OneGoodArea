import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    /* Plan 006: tests live in tests/unit/, production strictly in src/.
       AR-230: include .test.tsx for RTL component tests. */
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    /* AR-230: vitest 4 removed environmentMatchGlobs. Each .test.tsx
       file declares its environment via `// @vitest-environment jsdom`
       at the top. Pure-logic .test.ts files use the default node env. */
    globals: true,
    setupFiles: ["./tests/setup-rtl.ts"],
    /* Plan 007 phase 0: emit junit + json into repo-root .artifacts/
       (gitignored). Coverage HTML also routed there. */
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "../../.artifacts/test-reports/web/junit.xml",
      json: "../../.artifacts/test-reports/web/results.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportOnFailure: true,
      reportsDirectory: "../../.artifacts/test-reports/coverage/web",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "tests/**",
        "src/**/*.d.ts",
        "src/app/**",
        "node_modules/**"
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
