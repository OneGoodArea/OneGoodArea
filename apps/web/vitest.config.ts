import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    /* Plan 006: tests live in tests/unit/, production strictly in src/. */
    include: ["tests/unit/**/*.test.ts"],
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
      reportsDirectory: "../../.artifacts/coverage/web",
      include: ["src/**/*.ts"],
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
