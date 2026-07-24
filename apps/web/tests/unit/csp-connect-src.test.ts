import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* AR-605: Scalar's "Try it" in /playground fetches directly from the
   browser to apps/api's live origin. The CSP connect-src directive
   restricts which origins the page's own JS may fetch() from at all —
   checked BEFORE the request is sent, independent of apps/api's CORS
   headers (AR-602). Without the API origin here, every Try-It request
   was blocked by the browser itself, confirmed via console:
   "Connecting to 'https://onegoodarea.onrender.com/...' violates ...
   connect-src ... The action has been blocked." */

const CONFIG_PATH = path.join(__dirname, "../../next.config.ts");

describe("next.config.ts — CSP connect-src (AR-605)", () => {
  it("allows the apps/api origin so Scalar Try-It can reach it", () => {
    const config = fs.readFileSync(CONFIG_PATH, "utf-8");
    const connectSrcLine = config.split("\n").find((line) => line.includes("connect-src"));
    expect(connectSrcLine).toBeDefined();
    expect(connectSrcLine).toContain("https://onegoodarea.onrender.com");
  });
});
