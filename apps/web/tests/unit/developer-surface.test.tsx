// @vitest-environment jsdom

/* AR-559: Lock the Scalar layout/showSidebar config so this regression
   (sidebar disappearing when layout flips back to "classic") fails CI. */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DeveloperSurface } from "@/modules/developer-surface";

let capturedConfig: Record<string, unknown> | undefined;

vi.mock("@scalar/api-reference-react", () => ({
  ApiReferenceReact: (props: { configuration: Record<string, unknown> }) => {
    capturedConfig = props.configuration;
    return null;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("<DeveloperSurface> Scalar config (AR-555 + AR-560)", () => {
  it("uses modern layout with the sidebar enabled", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.layout).toBe("modern");
    expect(capturedConfig?.showSidebar).not.toBe(false);
  });

  it("enables Try It button for interactive API testing (AR-563)", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.hideTestRequestButton).toBe(false);
  });

  it("disables external CTAs for security lockdown", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.hideClientButton).toBe(true);
    expect(capturedConfig?.showDeveloperTools).toBe("never");
    expect(capturedConfig?.telemetry).toBe(false);
    expect(capturedConfig?.persistAuth).toBe(false);
    expect(capturedConfig?.isEditable).toBe(false);
    expect(capturedConfig?.documentDownloadType).toBe("none");
  });

  it("disables search, download, models, dark mode toggles", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.hideSearch).toBe(true);
    expect(capturedConfig?.hideDownloadButton).toBe(true);
    expect(capturedConfig?.hideModels).toBe(true);
    expect(capturedConfig?.hideDarkModeToggle).toBe(true);
  });
});
