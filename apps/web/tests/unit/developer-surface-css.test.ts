// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* AR-604: the 56.4 "hide sidebar branding" rule was scoped to any
   [class*="sidebar"] ancestor. Scalar's app-root wrapper also carries a
   "sidebar" substring as a layout-mode flag ("references-sidebar"), which
   made the rule's descendant [class*="footer"] selector match the whole
   app — including the legitimate `request-card-footer` that holds the
   "Test Request" button on every operation, hiding Try-It everywhere.
   This locks the fix in: scoping to the real `aside` element Scalar
   actually renders the nav as. */

const CSS_PATH = path.join(__dirname, "../../src/modules/developer-surface/developer-surface.css");

beforeAll(() => {
  const css = fs.readFileSync(CSS_PATH, "utf-8");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Replicates the real DOM shape confirmed live: the app-root wrapper
  // carries "references-sidebar" as a layout-mode flag; the actual nav is
  // a separate <aside> with "t-doc__sidebar"; the Test Request button
  // lives in an unrelated `request-card-footer` elsewhere in the app.
  document.body.innerHTML = `
    <div class="developer-surface__scalar">
      <div class="scalar-app scalar-api-reference references-layout references-sidebar">
        <aside class="border-r bg-sidebar-b-1 t-doc__sidebar">
          <div id="real-sidebar-footer" class="some-footer-branding-thing">Powered by Scalar</div>
        </aside>
        <main>
          <div id="request-card-footer" class="scalar-card-content scalar-card-footer request-card-footer bg-b-3">
            <button id="try-it-btn" class="show-api-client-button">Test Request</button>
          </div>
        </main>
      </div>
    </div>
  `;
});

describe("developer-surface.css — sidebar branding scope (AR-604)", () => {
  it("still hides branding/footer/logo elements inside the real nav <aside>", () => {
    expect(getComputedStyle(document.getElementById("real-sidebar-footer")!).display).toBe("none");
  });

  it("no longer hides the Test Request button's request-card-footer container", () => {
    expect(getComputedStyle(document.getElementById("request-card-footer")!).display).not.toBe("none");
  });

  it("no longer hides the Test Request button itself", () => {
    expect(getComputedStyle(document.getElementById("try-it-btn")!).display).not.toBe("none");
  });
});
