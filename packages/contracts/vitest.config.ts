import { defineConfig } from "vitest/config";

/* Plan 006 (test/prod separation): tests live in `tests/`, production in
   `src/`. The explicit config replaces Vitest's default `**` discovery so
   stray *.test.ts files in src/ (none today, but future-proofing) won't
   be silently picked up. */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
