// @vitest-environment jsdom

/* AR-233: Component tests for <Sidebar>.

   Covers the acceptance criteria from the Jira ticket:
   - Renders sections + items + active state
   - Sub-items (nested children) render under their parent
   - Top + bottom slots render their content
   - Mobile drawer behaviour: Escape closes; backdrop click closes;
     body scroll locks while open and unlocks on close
   - Active item exposes aria-current="page"
   - Badge slot renders when provided
   - onClose fires when a sidebar link is clicked (drawer auto-close
     on navigation)

   Mocks next/link so the tests can assert on the rendered anchors
   without needing a Next router. */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/app/design-v2/_shared/dashboard/sidebar";
import type { SidebarSection } from "@/app/design-v2/_shared/dashboard/sidebar";

/* next/link is a server component-aware shim in Next 16; for unit
   tests we replace it with a plain anchor so click/keyboard events
   land where RTL expects them. */
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const SECTIONS: SidebarSection[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", active: true },
      { label: "Reports", href: "/report" },
      { label: "Compare", href: "/compare", badge: 3 },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Settings",
        href: "/settings",
        children: [
          { label: "Profile", href: "/settings/profile" },
          { label: "Password", href: "/settings/password" },
        ],
      },
      { label: "Billing", href: "/dashboard/billing" },
    ],
  },
];

describe("<Sidebar> (AR-233)", () => {
  it("renders all sections with their group labels", () => {
    render(<Sidebar sections={SECTIONS} />);
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("renders every top-level item with its label as a link", () => {
    render(<Sidebar sections={SECTIONS} />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /Reports/ })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /Billing/ })).toHaveAttribute("href", "/dashboard/billing");
  });

  it("marks active items with aria-current=page", () => {
    render(<Sidebar sections={SECTIONS} />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Reports/ })).not.toHaveAttribute("aria-current");
  });

  it("renders nested children as a sub-list under their parent", () => {
    render(<Sidebar sections={SECTIONS} />);
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/settings/profile");
    expect(screen.getByRole("link", { name: /Password/ })).toHaveAttribute("href", "/settings/password");
  });

  it("renders the badge slot when provided", () => {
    render(<Sidebar sections={SECTIONS} />);
    /* The badge "3" should appear inside the Compare link */
    const compareLink = screen.getByRole("link", { name: /Compare/ });
    expect(compareLink).toHaveTextContent("3");
  });

  it("renders top and bottom slots", () => {
    render(
      <Sidebar
        sections={SECTIONS}
        top={<span data-testid="top-slot">WORDMARK</span>}
        bottom={<span data-testid="bottom-slot">USER CHIP</span>}
      />,
    );
    expect(screen.getByTestId("top-slot")).toHaveTextContent("WORDMARK");
    expect(screen.getByTestId("bottom-slot")).toHaveTextContent("USER CHIP");
  });

  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    render(<Sidebar sections={SECTIONS} open onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClose on Escape when closed", () => {
    const onClose = vi.fn();
    render(<Sidebar sections={SECTIONS} open={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the backdrop when open and calls onClose on backdrop click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Sidebar sections={SECTIONS} open onClose={onClose} />);

    const backdrop = container.querySelector(".oga-sidebar__backdrop");
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores on close", () => {
    const onClose = vi.fn();
    document.body.style.overflow = "auto";
    const { rerender } = render(<Sidebar sections={SECTIONS} open onClose={onClose} />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Sidebar sections={SECTIONS} open={false} onClose={onClose} />);
    expect(document.body.style.overflow).toBe("auto");
  });

  it("fires onClose when a sidebar link is clicked (drawer auto-dismiss)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Sidebar sections={SECTIONS} open onClose={onClose} />);

    await user.click(screen.getByRole("link", { name: /Reports/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it("uses the custom aria-label on the aside when provided", () => {
    render(<Sidebar sections={SECTIONS} aria-label="Workspace navigation" />);
    expect(screen.getByRole("complementary", { name: "Workspace navigation" })).toBeInTheDocument();
  });
});
