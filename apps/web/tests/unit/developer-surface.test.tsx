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

describe("<DeveloperSurface> Scalar config (AR-555)", () => {
  it("uses modern layout with the sidebar enabled", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.layout).toBe("modern");
    expect(capturedConfig?.showSidebar).not.toBe(false);
  });
});
