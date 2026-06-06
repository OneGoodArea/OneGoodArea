// @vitest-environment jsdom

/* AR-238: Component tests for <EmptyState>. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/app/design-v2/_shared/dashboard/empty-state";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

describe("<EmptyState> (AR-238)", () => {
  it("renders the title only when no other props provided", () => {
    render(<EmptyState title="No members yet" />);
    expect(screen.getByText("No members yet")).toBeInTheDocument();
  });

  it("renders body text when provided", () => {
    render(
      <EmptyState
        title="No portfolios yet"
        body="Create your first portfolio to start tracking signal changes."
      />,
    );
    expect(
      screen.getByText("Create your first portfolio to start tracking signal changes."),
    ).toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    render(
      <EmptyState
        title="No bundles yet"
        icon={<svg data-testid="icon" />}
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders the primary action as a link when href provided", () => {
    render(
      <EmptyState
        title="No members yet"
        action={{ label: "Invite member", href: "/dashboard/org/members/invite" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Invite member" });
    expect(link).toHaveAttribute("href", "/dashboard/org/members/invite");
  });

  it("renders the primary action as a button when onClick provided (no href)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No presets yet"
        action={{ label: "Create preset", onClick }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create preset" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders both primary and secondary actions", () => {
    render(
      <EmptyState
        title="No portfolios yet"
        action={{ label: "Create portfolio", href: "/dashboard/monitor/new" }}
        secondaryAction={{ label: "Read docs", href: "/docs/monitor" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Create portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read docs" })).toBeInTheDocument();
  });

  it("applies dark surface variant via data attribute", () => {
    const { container } = render(
      <EmptyState title="No data" surface="dark" />,
    );
    const root = container.querySelector(".oga-empty-state");
    expect(root).toHaveAttribute("data-surface", "dark");
  });

  it("does not render an actions container when neither action is provided", () => {
    const { container } = render(<EmptyState title="No data" />);
    expect(container.querySelector(".oga-empty-state__actions")).toBeNull();
  });

  it("fires the link onClick handler when an href action is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No members yet"
        action={{ label: "Invite member", href: "/invite", onClick }}
      />,
    );
    await user.click(screen.getByRole("link", { name: "Invite member" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
