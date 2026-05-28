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
  },
});
