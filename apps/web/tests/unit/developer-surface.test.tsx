// @vitest-environment jsdom

/* AR-559: Lock the Scalar layout/showSidebar config so this regression
   (sidebar disappearing when layout flips back to "classic") fails CI. */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { DeveloperSurface } from "@/modules/developer-surface";

let capturedConfig: Record<string, unknown> | undefined;
let mockSessionStatus: "authenticated" | "unauthenticated" | "loading" = "unauthenticated";

vi.mock("@scalar/api-reference-react", () => ({
  ApiReferenceReact: (props: { configuration: Record<string, unknown> }) => {
    capturedConfig = props.configuration;
    return null;
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: mockSessionStatus }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  mockSessionStatus = "unauthenticated";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ key: null }) });
});

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

describe("<DeveloperSurface> tier-aware auth (AR-598, Plan 059.6)", () => {
  it("leaves no security scheme preselected for an anonymous visitor", () => {
    mockSessionStatus = "unauthenticated";
    render(<DeveloperSurface />);
    expect(capturedConfig?.authentication).toEqual({ preferredSecurityScheme: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches a playground key for a logged-in visitor and preloads it", async () => {
    mockSessionStatus = "authenticated";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ key: "oga_freshkey", expires_at: "2026-07-23T23:59:59.999Z" }) });
    render(<DeveloperSurface />);

    expect(fetchMock).toHaveBeenCalledWith("/api/keys/playground", { method: "POST" });
    await waitFor(() => {
      expect(capturedConfig?.authentication).toEqual({
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: { bearerAuth: { token: "oga_freshkey" } },
      });
    });
  });

  it("selects bearerAuth without a token when the visitor already has their own key", async () => {
    mockSessionStatus = "authenticated";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ key: null, expires_at: null }) });
    render(<DeveloperSurface />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(capturedConfig?.authentication).toEqual({ preferredSecurityScheme: "bearerAuth" });
  });

  it("degrades gracefully (still selects bearerAuth) if the playground-key fetch fails", async () => {
    mockSessionStatus = "authenticated";
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<DeveloperSurface />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(capturedConfig?.authentication).toEqual({ preferredSecurityScheme: "bearerAuth" });
  });
});

describe("<DeveloperSurface> AR-606 — home icon removed", () => {
  it("does not render a home link in the header", () => {
    const { container } = render(<DeveloperSurface />);
    expect(container.querySelector(".developer-surface__home")).toBeNull();
    expect(container.querySelector("header a")).toBeNull();
  });
});
