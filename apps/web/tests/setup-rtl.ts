/* AR-230: Vitest setup file for React Testing Library tests (.test.tsx).
   Wires up @testing-library/jest-dom matchers (toBeInTheDocument,
   toHaveAttribute, toHaveClass, etc.) and registers RTL's automatic
   cleanup between tests so DOM state doesn't leak across cases.

   Loaded only for tests matching the tsx environmentMatchGlobs entry
   in apps/web/vitest.config.ts. Pure-logic .test.ts tests stay on the
   node env and skip this setup. */

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
